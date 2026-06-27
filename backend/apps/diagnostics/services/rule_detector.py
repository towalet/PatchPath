"""
Rule-based issue detector.

Consumes parsed (redacted) files + project metadata and produces DetectedIssue
payloads with evidence snippets (see docs/AGENT_PLAN.md §10).

Behavior:
    - Snippets include up to 2 lines of context before/after the match
    - Cap each snippet at 500 chars; cap each issue at 5 evidence items
    - De-duplicate near-identical evidence
    - Sort issues by severity, then confidence_hint
    - Weak/no evidence -> return [] (never fabricate issues)

TODO: implement detect(project_meta, files) -> list[DetectedIssuePayload].
"""
from __future__ import annotations

# def detect(project_meta: dict, files: list[dict]) -> list[dict]: ...
