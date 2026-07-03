"""
Tests for import_sources.py — zip-slip safety, limits, GitHub URL parsing.
GitHub network calls are always monkeypatched; we never hit the internet.
"""

from __future__ import annotations

import io
import zipfile

import pytest

from apps.diagnostics.services.import_sources import (
    ImportError,
    _parse_github_url,
    _safe_extract,
    from_folder,
    from_zip,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def make_zip(members: list[tuple[str, bytes]]) -> bytes:
    """Build an in-memory ZIP with the given (name, content) pairs."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for name, data in members:
            zf.writestr(name, data)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# GitHub URL parsing
# ---------------------------------------------------------------------------


def test_parse_github_url_valid():
    owner, repo = _parse_github_url("https://github.com/django/django")
    assert owner == "django"
    assert repo == "django"


def test_parse_github_url_strips_git():
    owner, repo = _parse_github_url("https://github.com/owner/repo.git")
    assert repo == "repo"


def test_parse_github_url_invalid():
    with pytest.raises(ImportError):
        _parse_github_url("https://gitlab.com/owner/repo")

    with pytest.raises(ImportError):
        _parse_github_url("not-a-url")

    with pytest.raises(ImportError):
        _parse_github_url("https://github.com/onlyone")


# ---------------------------------------------------------------------------
# ZIP extraction — zip-slip safety
# ---------------------------------------------------------------------------


def _limits():
    return dict(max_total_bytes=10_000_000, max_entries=1000, max_member_bytes=1_000_000)


def test_normal_zip_extracted():
    raw = make_zip([("README.md", b"hello"), ("src/main.py", b"print('hi')")])
    entries = _safe_extract(raw, **_limits())
    paths = [e.relpath for e in entries]
    assert "README.md" in paths
    assert "src/main.py" in paths


def test_zip_slip_dotdot_rejected():
    raw = make_zip([("../evil.py", b"evil")])
    with pytest.raises(ImportError, match="unsafe path"):
        _safe_extract(raw, **_limits())


def test_zip_absolute_path_rejected():
    raw = make_zip([("/etc/passwd", b"root")])
    with pytest.raises(ImportError, match="unsafe path"):
        _safe_extract(raw, **_limits())


def test_zip_windows_drive_rejected():
    raw = make_zip([("C:/windows/system32/evil.dll", b"evil")])
    with pytest.raises(ImportError, match="unsafe path"):
        _safe_extract(raw, **_limits())


def test_zip_count_cap():
    members = [(f"file{i}.txt", b"x") for i in range(5)]
    raw = make_zip(members)
    with pytest.raises(ImportError, match="more than 3 files"):
        _safe_extract(raw, max_total_bytes=10_000_000, max_entries=3, max_member_bytes=1_000_000)


def test_zip_size_cap():
    raw = make_zip([("big.txt", b"x" * 1000)])
    with pytest.raises(ImportError, match="exceeds"):
        _safe_extract(raw, max_total_bytes=500, max_entries=1000, max_member_bytes=1_000_000)


def test_zip_member_over_limit_is_tree_only():
    raw = make_zip([("big.txt", b"x" * 1000), ("small.txt", b"hi")])
    entries = _safe_extract(
        raw, max_total_bytes=10_000_000, max_entries=1000, max_member_bytes=100
    )
    big = next(e for e in entries if e.relpath == "big.txt")
    small = next(e for e in entries if e.relpath == "small.txt")
    assert big.data == b""     # tree-only
    assert small.data == b"hi"


def test_zip_strip_prefix():
    raw = make_zip([("repo-main/README.md", b"hello"), ("repo-main/src/app.py", b"x")])
    entries = _safe_extract(raw, **_limits(), strip_prefix="repo-main")
    paths = [e.relpath for e in entries]
    assert "README.md" in paths
    assert "src/app.py" in paths
    assert not any("repo-main" in p for p in paths)


# ---------------------------------------------------------------------------
# from_zip
# ---------------------------------------------------------------------------


def test_from_zip_requires_zip_extension():
    raw = make_zip([("README.md", b"hello")])
    with pytest.raises(ImportError, match="Only .zip"):
        from_zip("project.tar.gz", raw, **_limits())


def test_from_zip_returns_source_name():
    raw = make_zip([("README.md", b"hello")])
    source_name, entries = from_zip("myproject.zip", raw, **_limits())
    assert source_name == "myproject"
    assert any(e.relpath == "README.md" for e in entries)


# ---------------------------------------------------------------------------
# from_folder
# ---------------------------------------------------------------------------


def test_from_folder_empty_raises():
    with pytest.raises(ImportError):
        from_folder([], **_limits())


def test_from_folder_returns_entries():
    uploads = [
        ("project/README.md", b"hello"),
        ("project/src/main.py", b"x"),
    ]
    source_name, entries = from_folder(uploads, **_limits())
    assert source_name == "project"
    paths = [e.relpath for e in entries]
    assert "project/README.md" in paths
    assert "project/src/main.py" in paths


def test_from_folder_traversal_skipped():
    uploads = [("../evil.py", b"evil"), ("ok/file.txt", b"good")]
    _, entries = from_folder(uploads, **_limits())
    paths = [e.relpath for e in entries]
    assert not any("evil" in p for p in paths)
    assert any("file.txt" in p for p in paths)
