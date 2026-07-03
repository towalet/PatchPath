"""
Three project importers — each returns a uniform list[RawEntry] so the
normalizer is source-agnostic.

    from_github  — download public repo zipball via stdlib urllib
    from_zip     — user-supplied .zip archive
    from_folder  — browser webkitdirectory multipart upload

Security:
    - ZIP extraction is done entirely in memory (io.BytesIO); nothing is
      written to disk.
    - Each member is validated BEFORE its bytes are read: symlinks rejected,
      path-traversal rejected, size caps applied.
    - GitHub fetch uses stdlib urllib only (no git binary, no subprocess).
    - All content flows through redaction before persistence (in the normalizer).
"""

from __future__ import annotations

import io
import posixpath
import re
import stat
import urllib.error
import urllib.request
import zipfile
from dataclasses import dataclass


class ImportError(Exception):
    """Raised on any recoverable import failure (caller converts to 400)."""


@dataclass
class RawEntry:
    """One file from an imported project, pre-normalization."""

    relpath: str
    data: bytes


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_GITHUB_RE = re.compile(
    r"^https?://github\.com/(?P<owner>[^/]+)/(?P<repo>[^/]+?)(?:\.git)?(?:/.*)?$",
    re.IGNORECASE,
)


def _parse_github_url(url: str) -> tuple[str, str]:
    """Return (owner, repo) or raise ImportError."""
    m = _GITHUB_RE.match(url.strip())
    if not m:
        raise ImportError(
            "Not a valid GitHub repository URL. " "Expected: https://github.com/{owner}/{repo}"
        )
    return m.group("owner"), m.group("repo")


def _safe_extract(
    raw_zip: bytes,
    *,
    max_total_bytes: int,
    max_entries: int,
    max_member_bytes: int,
    strip_prefix: str = "",
) -> list[RawEntry]:
    """Extract a ZIP archive from bytes, with full path-traversal + bomb guards.

    Returns RawEntry list (directories excluded). Members that exceed
    max_member_bytes are yielded with empty data (tree-only; normalizer handles).
    """
    try:
        zf = zipfile.ZipFile(io.BytesIO(raw_zip))
    except zipfile.BadZipFile as exc:
        raise ImportError(f"Invalid ZIP archive: {exc}") from exc

    entries: list[RawEntry] = []
    total_bytes = 0
    count = 0

    with zf:
        for info in zf.infolist():
            # Skip directory entries.
            if info.filename.endswith("/"):
                continue

            # Reject symlinks — they are the primary zip-slip vector.
            mode = (info.external_attr >> 16) & 0xFFFF
            if stat.S_ISLNK(mode):
                continue

            # Normalize separators and check for path traversal.
            name = info.filename.replace("\\", "/")
            norm = posixpath.normpath(name)
            if norm == ".." or norm.startswith("../") or posixpath.isabs(norm):
                raise ImportError(f"ZIP archive contains unsafe path: {info.filename!r}")
            # Reject Windows drive letters (e.g. "C:/foo").
            first_seg = norm.split("/")[0]
            if ":" in first_seg:
                raise ImportError(f"ZIP archive contains unsafe path: {info.filename!r}")

            # Strip the top-level prefix (e.g. codeload adds "repo-branch/").
            if strip_prefix and norm.startswith(strip_prefix + "/"):
                norm = norm[len(strip_prefix) + 1 :]
            if not norm:
                continue

            count += 1
            if count > max_entries:
                raise ImportError(
                    f"ZIP archive has more than {max_entries} files — refusing to extract."
                )

            total_bytes += info.file_size
            if total_bytes > max_total_bytes:
                raise ImportError(
                    f"ZIP archive uncompressed size exceeds the "
                    f"{max_total_bytes // (1024 * 1024)} MB limit."
                )

            if info.file_size > max_member_bytes:
                # Tree-only: include path but no content.
                entries.append(RawEntry(relpath=norm, data=b""))
            else:
                entries.append(RawEntry(relpath=norm, data=zf.read(info)))

    return entries


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def from_zip(
    filename: str,
    raw: bytes,
    *,
    max_total_bytes: int,
    max_entries: int,
    max_member_bytes: int,
) -> tuple[str, list[RawEntry]]:
    """Import a user-uploaded .zip file.

    Returns (source_name, entries).
    """
    lower = filename.lower()
    if not lower.endswith(".zip"):
        raise ImportError("Only .zip archives are supported.")

    entries = _safe_extract(
        raw,
        max_total_bytes=max_total_bytes,
        max_entries=max_entries,
        max_member_bytes=max_member_bytes,
    )
    source_name = filename.removesuffix(".zip").removesuffix(".ZIP")
    return source_name, entries


def from_folder(
    uploads: list[tuple[str, bytes]],
    *,
    max_total_bytes: int,
    max_entries: int,
    max_member_bytes: int,
) -> tuple[str, list[RawEntry]]:
    """Import a folder uploaded via <input webkitdirectory>.

    ``uploads`` is a list of (webkitRelativePath, file_bytes). The first path
    component is the folder name (used as source_name).

    Returns (source_name, entries).
    """
    if not uploads:
        raise ImportError("No files received in folder upload.")

    source_name = uploads[0][0].split("/")[0] if "/" in uploads[0][0] else "project"
    total_bytes = 0
    entries: list[RawEntry] = []

    for relpath, data in uploads:
        # Sanitize: reject traversal.
        norm = posixpath.normpath(relpath.replace("\\", "/"))
        if norm.startswith("../") or posixpath.isabs(norm):
            continue  # silently skip — client-side should have filtered these

        total_bytes += len(data)
        if total_bytes > max_total_bytes:
            raise ImportError(
                f"Folder upload exceeds the " f"{max_total_bytes // (1024 * 1024)} MB limit."
            )
        if len(entries) >= max_entries:
            raise ImportError(f"Folder has more than {max_entries} files — refusing to import.")

        trimmed = data if len(data) <= max_member_bytes else b""
        entries.append(RawEntry(relpath=norm, data=trimmed))

    return source_name, entries


def from_github(
    url: str,
    *,
    max_total_bytes: int,
    max_entries: int,
    max_member_bytes: int,
    timeout: int = 20,
) -> tuple[str, str, list[RawEntry]]:
    """Download a public GitHub repo's default-branch zipball.

    Returns (source_name, normalized_url, entries).
    No git binary, no subprocess — stdlib urllib only.
    """
    owner, repo = _parse_github_url(url)
    normalized_url = f"https://github.com/{owner}/{repo}"

    branch = _resolve_default_branch(owner, repo, timeout=timeout)

    zipball_url = f"https://codeload.github.com/{owner}/{repo}/zip/refs/heads/{branch}"
    raw = _download_bytes(zipball_url, max_bytes=max_total_bytes, timeout=timeout)

    # GitHub adds a top-level "owner-repo-{sha}/" prefix — stripped inside _safe_extract_github.
    entries = _safe_extract_github(
        raw,
        max_total_bytes=max_total_bytes,
        max_entries=max_entries,
        max_member_bytes=max_member_bytes,
        owner=owner,
        repo=repo,
    )
    source_name = f"{owner}/{repo}"
    return source_name, normalized_url, entries


def _resolve_default_branch(owner: str, repo: str, *, timeout: int) -> str:
    """Try main, then master. Falls back to the GitHub API."""
    for candidate in ("main", "master"):
        probe = f"https://codeload.github.com/{owner}/{repo}" f"/zip/refs/heads/{candidate}"
        try:
            req = urllib.request.Request(probe, method="HEAD")
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                if resp.status == 200:
                    return candidate
        except (urllib.error.HTTPError, urllib.error.URLError, OSError):
            continue

    # Fall back to the API (unauthenticated, rate-limited but fine for MVP).
    api_url = f"https://api.github.com/repos/{owner}/{repo}"
    try:
        req = urllib.request.Request(api_url, headers={"Accept": "application/vnd.github+json"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            import json

            data = json.loads(resp.read())
            return data.get("default_branch", "main")
    except Exception as exc:
        raise ImportError(
            f"Could not resolve the default branch for {owner}/{repo}. " "Is the repository public?"
        ) from exc


def _download_bytes(url: str, *, max_bytes: int, timeout: int) -> bytes:
    """Download URL with a cumulative size cap."""
    try:
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            buf = io.BytesIO()
            total = 0
            chunk_size = 65536
            while True:
                chunk = resp.read(chunk_size)
                if not chunk:
                    break
                total += len(chunk)
                if total > max_bytes:
                    raise ImportError(
                        f"Repository download exceeds the "
                        f"{max_bytes // (1024 * 1024)} MB limit."
                    )
                buf.write(chunk)
            return buf.getvalue()
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            raise ImportError("Repository not found. Make sure it exists and is public.") from exc
        raise ImportError(f"GitHub returned HTTP {exc.code}.") from exc
    except urllib.error.URLError as exc:
        raise ImportError(f"Network error fetching repository: {exc.reason}") from exc
    except TimeoutError as exc:
        raise ImportError("Timed out downloading the repository.") from exc


def _safe_extract_github(
    raw_zip: bytes,
    *,
    max_total_bytes: int,
    max_entries: int,
    max_member_bytes: int,
    owner: str,
    repo: str,
) -> list[RawEntry]:
    """Like _safe_extract but strips GitHub's top-level prefix automatically."""
    try:
        zf = zipfile.ZipFile(io.BytesIO(raw_zip))
    except zipfile.BadZipFile as exc:
        raise ImportError(f"Invalid ZIP from GitHub: {exc}") from exc

    # Detect the actual top-level prefix from the first real entry.
    prefix = ""
    with zf:
        for info in zf.infolist():
            if not info.filename.endswith("/"):
                parts = info.filename.replace("\\", "/").split("/")
                if len(parts) > 1:
                    prefix = parts[0]
                break

    return _safe_extract(
        raw_zip,
        max_total_bytes=max_total_bytes,
        max_entries=max_entries,
        max_member_bytes=max_member_bytes,
        strip_prefix=prefix,
    )
