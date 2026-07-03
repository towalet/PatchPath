"""
normalizeProjectSource — the single source-agnostic seam.

All three importers (from_github / from_zip / from_folder) produce
list[RawEntry]. normalize() walks them once, applies ignore_rules, redacts
secrets, and returns a ProjectSource. persist() writes ProjectImport +
UploadedFile rows. load_from_session() rebuilds a ProjectSource from the DB
for re-scan without re-importing.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

from django.conf import settings

from ..models import DebugSession, ProjectImport
from . import file_parser, redaction
from .file_intake import store_text
from .ignore_rules import is_ignored_path, is_important, is_text_candidate
from .import_sources import RawEntry


@dataclass
class ProjectFile:
    relpath: str
    file_type: str
    content: str  # redacted


@dataclass
class ProjectSource:
    source_type: str
    source_name: str
    original_url: str
    file_tree: list[str]
    files: list[ProjectFile]
    files_checked: list[str]
    files_ignored: list[str]


def normalize(
    source_type: str,
    source_name: str,
    original_url: str,
    entries: list[RawEntry],
    *,
    max_file_bytes: int | None = None,
    max_session_bytes: int | None = None,
) -> ProjectSource:
    """Convert raw importer output into a clean ProjectSource.

    - Ignored dirs and binary extensions are excluded from tree + content.
    - Only IMPORTANT_FILES get content read + redacted.
    - Everything else is tree-only (relpath recorded, no content).
    - Secrets are redacted before any content is returned.
    """
    if max_file_bytes is None:
        max_file_bytes = settings.PATCHPATH_IMPORT_FILE_BYTES
    if max_session_bytes is None:
        max_session_bytes = settings.PATCHPATH_MAX_IMPORT_BYTES

    file_tree: list[str] = []
    files: list[ProjectFile] = []
    files_checked: list[str] = []
    files_ignored: list[str] = []
    total_content_bytes = 0

    for entry in entries:
        relpath = entry.relpath.replace("\\", "/")

        # Drop ignored directories.
        if is_ignored_path(relpath):
            files_ignored.append(relpath)
            continue

        # Drop binary extensions.
        if not is_text_candidate(relpath):
            files_ignored.append(relpath)
            continue

        file_tree.append(relpath)

        if not is_important(relpath) or not entry.data:
            # Tree-only.
            continue

        # Classify + decode.
        basename = os.path.basename(relpath)
        file_type = file_parser.classify(basename) or "text"

        if file_parser.looks_binary(entry.data):
            continue

        try:
            text = file_parser.decode_text(entry.data, basename)
        except file_parser.FileValidationError:
            continue

        # Redact secrets before storing.
        redacted = redaction.redact(text)
        content = redacted.text
        size = len(content.encode("utf-8"))

        if total_content_bytes + size > max_session_bytes:
            continue

        total_content_bytes += size
        files_checked.append(relpath)
        files.append(ProjectFile(relpath=relpath, file_type=file_type, content=content))

    return ProjectSource(
        source_type=source_type,
        source_name=source_name,
        original_url=original_url,
        file_tree=file_tree,
        files=files,
        files_checked=files_checked,
        files_ignored=files_ignored,
    )


def persist(session: DebugSession, ps: ProjectSource) -> ProjectImport:
    """Write ProjectImport + UploadedFile rows for important files.

    Reuses the store_text helper so dedup + budget accounting work the same
    as the regular upload pipeline.
    """
    max_session = settings.PATCHPATH_MAX_SESSION_BYTES
    used = [0]
    seen: set[str] = set(session.files.values_list("content_sha256", flat=True))

    for pf in ps.files:
        store_text(
            session=session,
            relpath=pf.relpath,
            file_type=pf.file_type,
            redacted_text=pf.content,
            used=used,
            seen=seen,
            max_session=max_session,
        )

    pi = ProjectImport.objects.create(
        debug_session=session,
        source_type=ps.source_type,
        source_name=ps.source_name,
        original_url=ps.original_url,
        file_tree=ps.file_tree,
        files_checked=ps.files_checked,
        files_ignored=ps.files_ignored,
        total_files=len(ps.file_tree) + len(ps.files_ignored),
    )
    return pi


def load_from_session(session: DebugSession) -> ProjectSource:
    """Rebuild a ProjectSource from the database for analysis / re-scan."""
    pi: ProjectImport = session.project_import

    files = [
        ProjectFile(
            relpath=uf.filename,
            file_type=uf.file_type,
            content=uf.content,
        )
        for uf in session.files.all()
    ]

    return ProjectSource(
        source_type=pi.source_type,
        source_name=pi.source_name,
        original_url=pi.original_url,
        file_tree=pi.file_tree,
        files=files,
        files_checked=pi.files_checked,
        files_ignored=pi.files_ignored,
    )
