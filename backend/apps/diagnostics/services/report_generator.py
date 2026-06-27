"""
Report generation orchestrator (the analyze pipeline).

Ties the pipeline together inside a transaction so session status and report
persistence stay consistent (see docs/AGENT_PLAN.md §12):

    1. redact uploaded files
    2. run rule_detector -> persist DetectedIssue rows
    3. build evidence bundle
    4. call ai_client -> parse -> validate with report_schema
    5. apply confidence/evidence guardrails
    6. persist DiagnosisReport, mark session completed

Guardrails:
    - No issues + little evidence  -> max confidence 0.35
    - Clamp model confidence to PATCHPATH_MAX_CONFIDENCE (0.99); never 1.0
    - Unknown evidence references   -> reject + retry once
    - Always include >=1 missing-information item

Retry: on parse/validation failure, retry once with the validation errors.
On repeated failure, mark session failed (preserving files + detected issues).

TODO: implement run_analysis(session).
"""
from __future__ import annotations

# def run_analysis(session) -> "DiagnosisReport": ...
