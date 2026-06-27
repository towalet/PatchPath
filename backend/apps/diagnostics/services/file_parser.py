"""
File parsing & upload validation.

Responsibilities (see docs/AGENT_PLAN.md §9 + §2):
    - Accept text-like files only; reject binary by extension AND content sniffing
    - Enforce per-file (1 MB) and per-session (5 MB) size limits
    - Sanitize filenames (strip user-provided paths)
    - Classify file_type from name/extension
    - Decode to text, count lines, compute sha256
    - Support pasted error text as a synthetic upload

Allowed: .log .txt .env.example .json .yaml .yml .toml .ini .cfg .conf
         .py .js .ts .tsx Dockerfile Procfile package.json requirements*.txt

TODO: implement parse/validate functions.
"""
from __future__ import annotations

# def parse_upload(...): ...
# def validate_file(...): ...
