"""
buildReadinessContext — selects which file *contents* to show the AI reviewer.

The deterministic analyzer works on the whole ProjectSource, but the AI prompt has
a finite budget, so we cannot send every file. This module ranks the already-loaded
(secret-redacted) file contents into tiers, truncates large files head+tail, and
renders a fenced block the model can cite from precisely. Files whose content is
omitted are still listed (paths only) so the model knows they exist.

Pure functions over ProjectSource + the analyzer's result dict. No DB, no network.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field

from django.conf import settings

from .project_normalizer import ProjectSource

# Deployment-critical basenames, highest priority first. Content for these is
# included before anything else so the reviewer always sees how the app builds,
# runs, and deploys.
_TIER0_BASENAMES: tuple[str, ...] = (
    "Dockerfile",
    "docker-compose.yml",
    "docker-compose.yaml",
    "compose.yml",
    "compose.yaml",
    "package.json",
    "requirements.txt",
    "requirements-prod.txt",
    "requirements-dev.txt",
    "pyproject.toml",
    "Pipfile",
    "setup.py",
    "setup.cfg",
    "settings.py",
    "gunicorn.conf.py",
    "Procfile",
    "vercel.json",
    "render.yaml",
    "railway.json",
    "railway.toml",
    "fly.toml",
    "netlify.toml",
    "app.json",
    "wsgi.py",
    "asgi.py",
    "manage.py",
    "main.py",
    "app.py",
    "server.js",
    "index.js",
    "index.ts",
    "next.config.js",
    "next.config.mjs",
    "next.config.ts",
    "vite.config.js",
    "vite.config.ts",
    "vite.config.mjs",
    ".env.example",
    ".env.sample",
    ".env.template",
)

# Lock files are captured by the importer but are huge and near-zero prompt value.
# Never include their content; always list them paths-only.
_LOCKFILE_BASENAMES: frozenset[str] = frozenset(
    {"package-lock.json", "yarn.lock", "pnpm-lock.yaml", "Pipfile.lock", "poetry.lock"}
)

# README is low signal per byte — cap it hard regardless of the per-file budget.
_README_CAP = 1_500

_TRUNCATION_MARKER = "\n... [TRUNCATED: {n} chars omitted] ...\n"


@dataclass(frozen=True)
class ContextFile:
    relpath: str
    content: str
    truncated: bool


@dataclass
class CodeContext:
    included: list[ContextFile] = field(default_factory=list)
    paths_only: list[str] = field(default_factory=list)
    total_chars: int = 0


def _basename(relpath: str) -> str:
    return os.path.basename(relpath.replace("\\", "/"))


def _tier0_rank(relpath: str) -> int | None:
    """Return the priority index of a tier-0 file, or None if not tier-0."""
    name = _basename(relpath)
    for idx, candidate in enumerate(_TIER0_BASENAMES):
        if name == candidate:
            return idx
    norm = relpath.replace("\\", "/")
    if norm.startswith(".github/workflows/") and norm.endswith((".yml", ".yaml")):
        return len(_TIER0_BASENAMES)  # workflows: just after the named tier-0 files
    return None


def _failed_check_sources(analysis: dict) -> set[str]:
    """Files cited by failing checks / evidence — worth showing even if not tier-0."""
    sources: set[str] = set()
    for bucket in ("blocking", "warnings", "improvements"):
        for item in analysis.get(bucket, []):
            src = item.get("source")
            if src:
                sources.add(src)
    for ev in analysis.get("evidence", []):
        reason = ev.get("reason", "")
        src = ev.get("source")
        if src and reason.startswith("FAIL:"):
            sources.add(src)
    return sources


def _truncate(content: str, budget: int) -> tuple[str, bool]:
    """Keep head (~80%) + tail (~20%) with a marker when over budget."""
    if len(content) <= budget:
        return content, False
    head_len = int(budget * 0.8)
    tail_len = budget - head_len
    omitted = len(content) - budget
    head = content[:head_len]
    tail = content[-tail_len:] if tail_len > 0 else ""
    return head + _TRUNCATION_MARKER.format(n=omitted) + tail, True


def build_context(
    ps: ProjectSource,
    analysis: dict,
    *,
    per_file_budget: int | None = None,
    total_budget: int | None = None,
) -> CodeContext:
    """Rank ProjectSource file contents into a budgeted CodeContext.

    Tier 0: deployment-critical basenames (fixed order).
    Tier 1: files cited by failing checks/evidence.
    Tier 2: everything else with content, in original order.
    Lock files never get content; overflow files fall back to paths-only.
    """
    ai_cfg = settings.PATCHPATH_AI
    if per_file_budget is None:
        per_file_budget = ai_cfg.get("PER_FILE_CHAR_BUDGET", 8_000)
    if total_budget is None:
        total_budget = ai_cfg.get("CONTEXT_CHAR_BUDGET", 48_000)

    failed_sources = _failed_check_sources(analysis)

    def sort_key(pf) -> tuple[int, int, str]:
        rank = _tier0_rank(pf.relpath)
        if rank is not None:
            return (0, rank, pf.relpath)
        # Tier 1: cited by a failing check (match on fragment, like the analyzer).
        if any(src.lower() in pf.relpath.lower() for src in failed_sources):
            return (1, 0, pf.relpath)
        return (2, 0, pf.relpath)

    ordered = sorted(ps.files, key=sort_key)

    ctx = CodeContext()
    for pf in ordered:
        name = _basename(pf.relpath)
        if name in _LOCKFILE_BASENAMES:
            ctx.paths_only.append(pf.relpath)
            continue

        cap = (
            min(per_file_budget, _README_CAP)
            if name.lower().startswith("readme")
            else per_file_budget
        )
        remaining = total_budget - ctx.total_chars
        if remaining <= 0:
            ctx.paths_only.append(pf.relpath)
            continue

        budget = min(cap, remaining)
        content, truncated = _truncate(pf.content, budget)
        ctx.included.append(ContextFile(relpath=pf.relpath, content=content, truncated=truncated))
        ctx.total_chars += len(content)

    return ctx


def render_context(ctx: CodeContext) -> str:
    """Render the CodeContext as a fenced text block for the user prompt."""
    parts: list[str] = []
    for cf in ctx.included:
        parts.append(f"=== FILE: {cf.relpath} ===")
        parts.append(cf.content)
        parts.append("=== END FILE ===")
        parts.append("")
    if ctx.paths_only:
        parts.append("Files present but not shown (paths only): " + ", ".join(ctx.paths_only))
    return "\n".join(parts).strip()
