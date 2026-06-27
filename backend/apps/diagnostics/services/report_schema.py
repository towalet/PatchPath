"""
Pydantic schema for the AI diagnosis report (see docs/AGENT_PLAN.md §12-§13).

Validation rules:
    - Required fields must be present
    - confidence_score in [0, 1) and never 1.0 (clamp ceiling: PATCHPATH_MAX_CONFIDENCE)
    - severity in {low, medium, high}
    - evidence must be non-empty unless the report is explicitly low confidence
    - evidence may only reference uploaded files (reject unknown references -> retry)

Expected JSON keys: root_cause, confidence_score, severity, detected_stack,
detected_cloud_provider, explanation, evidence[], recommended_fix,
commands_to_run[], verification_checklist[], missing_information[], possible_risks[]

TODO: define EvidenceItem + DiagnosisReportModel.
"""
from __future__ import annotations

# from pydantic import BaseModel, Field, field_validator  # noqa: ERA001
