"""
DRF serializers for the diagnostics domain.

Planned serializers:
    - ProjectSerializer / ProjectCreateSerializer (with session_count, latest_session_at)
    - DebugSessionSerializer (nested files, detected issues, report summary)
    - UploadedFileSerializer (metadata only; never returns raw content blobs by default)
    - DetectedIssueSerializer
    - DiagnosisReportSerializer (full report document)
    - DashboardSerializer (aggregate counts + recent items)

TODO: implement once models land.
"""
from __future__ import annotations

# from rest_framework import serializers  # noqa: ERA001
