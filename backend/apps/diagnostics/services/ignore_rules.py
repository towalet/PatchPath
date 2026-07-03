"""
Single source of truth for which paths to ignore during project import and which
files are important enough to read content for (vs tree-only).
"""

from __future__ import annotations

import os

# Directories to skip entirely (no tree entry, no content).
IGNORED_DIRS: frozenset[str] = frozenset(
    {
        "node_modules",
        ".git",
        ".next",
        ".nuxt",
        ".svelte-kit",
        "dist",
        "build",
        "out",
        "target",
        "venv",
        ".venv",
        "env",
        ".env",
        "__pycache__",
        ".cache",
        ".turbo",
        "coverage",
        ".nyc_output",
        ".pytest_cache",
        ".mypy_cache",
        ".ruff_cache",
        "htmlcov",
        ".DS_Store",
    }
)

# Extensions we never read content for (binary or large generated assets).
BINARY_EXTS: frozenset[str] = frozenset(
    {
        ".png",
        ".jpg",
        ".jpeg",
        ".gif",
        ".webp",
        ".ico",
        ".svg",
        ".woff",
        ".woff2",
        ".ttf",
        ".eot",
        ".otf",
        ".mp4",
        ".mp3",
        ".wav",
        ".ogg",
        ".zip",
        ".gz",
        ".tar",
        ".tgz",
        ".bz2",
        ".xz",
        ".7z",
        ".exe",
        ".dll",
        ".so",
        ".dylib",
        ".bin",
        ".pyc",
        ".pyo",
        ".pyd",
        ".map",
        ".lock",  # yarn.lock etc are huge; handled below as special case
        ".pdf",
        ".doc",
        ".docx",
        ".xls",
        ".xlsx",
        ".db",
        ".sqlite",
        ".sqlite3",
    }
)

# Files/globs where we DO read content (checked against relpath basename).
# Everything else in the tree is path-only.
IMPORTANT_BASENAMES: frozenset[str] = frozenset(
    {
        "package.json",
        "package-lock.json",
        "yarn.lock",
        "pnpm-lock.yaml",
        "requirements.txt",
        "requirements-dev.txt",
        "requirements-prod.txt",
        "pyproject.toml",
        "Pipfile",
        "Pipfile.lock",
        "setup.py",
        "setup.cfg",
        "Dockerfile",
        "docker-compose.yml",
        "docker-compose.yaml",
        "compose.yml",
        "compose.yaml",
        ".env.example",
        ".env.sample",
        ".env.template",
        "README.md",
        "readme.md",
        "README.rst",
        "vercel.json",
        "render.yaml",
        "railway.json",
        "railway.toml",
        "Procfile",
        "app.json",
        "netlify.toml",
        "fly.toml",
        "next.config.js",
        "next.config.mjs",
        "next.config.ts",
        "vite.config.js",
        "vite.config.ts",
        "vite.config.mjs",
        "nuxt.config.ts",
        "nuxt.config.js",
        "svelte.config.js",
        "astro.config.mjs",
        "manage.py",
        "wsgi.py",
        "asgi.py",
        "settings.py",
        "gunicorn.conf.py",
        "main.py",
        "app.py",
        "server.js",
        "index.js",
        "index.ts",
        ".github",  # directory sentinel (handled via path prefix)
    }
)

# GitHub Actions workflows are always important.
_WORKFLOWS_PREFIX = ".github/workflows/"


def is_ignored_path(relpath: str) -> bool:
    """Return True if any path component is in IGNORED_DIRS."""
    parts = relpath.replace("\\", "/").split("/")
    return any(part in IGNORED_DIRS for part in parts[:-1])


def is_important(relpath: str) -> bool:
    """Return True if we should read this file's content."""
    norm = relpath.replace("\\", "/")
    basename = os.path.basename(norm)
    if norm.startswith(_WORKFLOWS_PREFIX) and norm.endswith((".yml", ".yaml")):
        return True
    return basename in IMPORTANT_BASENAMES


def is_text_candidate(relpath: str) -> bool:
    """Return True if the extension is not in BINARY_EXTS."""
    _, ext = os.path.splitext(relpath.lower())
    return ext not in BINARY_EXTS
