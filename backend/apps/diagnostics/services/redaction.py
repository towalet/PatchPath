"""
Secret redaction.

Runs BEFORE content is stored and BEFORE any AI call. Returns redacted text plus
a redaction count (see docs/AGENT_PLAN.md §9).

Redact: API keys, JWTs, database URLs, passwords, bearer tokens, private keys,
and generic .env values. Preserve variable names where useful, e.g.
    DATABASE_URL=postgres://...  ->  DATABASE_URL=[REDACTED_DATABASE_URL]

TODO: compile patterns once at import; implement redact(text) -> (text, count).
"""
from __future__ import annotations

# def redact(text: str) -> tuple[str, int]: ...
