"""
Tests for project_normalizer.py — ignore rules, redaction, budget, persist.
"""

from __future__ import annotations

import pytest

from apps.diagnostics.services.import_sources import RawEntry
from apps.diagnostics.services.project_normalizer import load_from_session, normalize, persist
from apps.diagnostics.tests.factories import ReadinessSessionFactory

pytestmark = pytest.mark.django_db


def _entries(pairs: list[tuple[str, str]]) -> list[RawEntry]:
    return [RawEntry(relpath=p, data=c.encode()) for p, c in pairs]


# ---------------------------------------------------------------------------
# normalize()
# ---------------------------------------------------------------------------


def test_ignored_dirs_dropped():
    entries = _entries(
        [
            ("node_modules/lodash/index.js", "module"),
            ("README.md", "# Hello"),
            (".git/HEAD", "ref: refs/heads/main"),
            ("src/main.py", "print('hi')"),
        ]
    )
    ps = normalize("folder", "myproject", "", entries)
    assert not any("node_modules" in p for p in ps.file_tree)
    assert not any(".git" in p for p in ps.file_tree)
    assert "README.md" in ps.file_tree


def test_binary_extensions_excluded():
    entries = _entries(
        [
            ("logo.png", b"\x89PNG".decode("latin-1")),
            ("README.md", "# Hello"),
        ]
    )
    ps = normalize("folder", "myproject", "", entries)
    assert "logo.png" not in ps.file_tree
    assert "README.md" in ps.file_tree


def test_important_files_get_content():
    entries = _entries(
        [
            ("package.json", '{"name":"app","scripts":{"start":"node server.js"}}'),
            ("Dockerfile", "FROM node:18"),
            ("src/utils.js", "// helper"),  # not important — tree-only
        ]
    )
    ps = normalize("folder", "myproject", "", entries)
    content_paths = [f.relpath for f in ps.files]
    assert "package.json" in content_paths
    assert "Dockerfile" in content_paths
    # src/utils.js is tree-only
    assert "src/utils.js" not in content_paths
    assert "src/utils.js" in ps.file_tree


def test_secrets_redacted():
    entries = _entries(
        [
            (".env.example", "DATABASE_URL=postgres://user:secret123@host/db"),
        ]
    )
    ps = normalize("folder", "myproject", "", entries)
    pf = next((f for f in ps.files if ".env.example" in f.relpath), None)
    assert pf is not None
    assert "secret123" not in pf.content
    assert "[REDACTED" in pf.content


def test_files_checked_and_ignored_populated():
    entries = _entries(
        [
            ("README.md", "# Hello"),
            (".git/config", "git stuff"),
            ("node_modules/x/y.js", "code"),
        ]
    )
    ps = normalize("folder", "myproject", "", entries)
    assert "README.md" in ps.files_checked
    assert any(".git" in p or "node_modules" in p for p in ps.files_ignored)


# ---------------------------------------------------------------------------
# persist() and load_from_session()
# ---------------------------------------------------------------------------


def test_persist_creates_project_import_and_files():
    session = ReadinessSessionFactory()
    entries = _entries(
        [
            ("README.md", "# Hello"),
            ("Dockerfile", "FROM python:3.12"),
        ]
    )
    ps = normalize("github", "owner/repo", "https://github.com/owner/repo", entries)
    pi = persist(session, ps)

    assert pi.source_name == "owner/repo"
    assert pi.source_type == "github"
    assert session.files.count() > 0


def test_load_from_session_roundtrip():
    session = ReadinessSessionFactory()
    entries = _entries(
        [
            ("Dockerfile", "FROM python:3.12 \nENV PORT=8000"),
        ]
    )
    ps_in = normalize("zip", "myapp", "", entries)
    persist(session, ps_in)

    ps_out = load_from_session(session)
    assert ps_out.source_name == "myapp"
    content_paths = [f.relpath for f in ps_out.files]
    assert "Dockerfile" in content_paths
