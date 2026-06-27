"""
Evidence bundle builder.

Converts uploaded files + detected issues into a compact, LLM-safe payload
(see docs/AGENT_PLAN.md §11).

Bundle fields:
    project_metadata, uploaded_file_summaries, detected_issues, top_evidence,
    unmatched_error_lines, known_missing_context

Rules:
    - Never send entire large logs; include only relevant snippets
    - Note when evidence is weak/incomplete
    - Add missing-file hints (e.g. "settings.py was not uploaded")
    - Stay under PATCHPATH_EVIDENCE_CHAR_BUDGET (default 12,000 chars)

TODO: implement build_bundle(...).
"""
from __future__ import annotations

# def build_bundle(project_meta, files, detected_issues, *, char_budget): ...
