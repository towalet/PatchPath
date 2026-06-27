"""
Diagnostics domain models.

Planned models (see docs/AGENT_PLAN.md §7 "Database Schema"):
    - Project          : a user's app/repo being diagnosed
    - DebugSession     : one analysis run against uploaded evidence
    - UploadedFile     : a redacted text artifact attached to a session
    - DetectedIssue    : a deterministic rule match with evidence snippets
    - DiagnosisReport  : the schema-validated AI root-cause report (1:1 session)

Conventions for this domain:
    - UUID primary keys for externally exposed records
    - TIMESTAMPTZ via DateTimeField (USE_TZ=True)
    - FK indexes + ownership scoping through Project.user

TODO: implement models, Meta indexes/constraints, and choices.
"""
from __future__ import annotations

# from django.db import models  # noqa: ERA001
