"""Diagnostics URL routes, mounted under /api/ (see docs/AGENT_PLAN.md §8)."""

from __future__ import annotations

from django.urls import path

from .views import (
    DashboardView,
    ProjectDetailView,
    ProjectImportCreateView,
    ProjectListCreateView,
    ProjectSessionListCreateView,
    ReadinessReportDetailView,
    ReportDetailView,
    SessionAnalyzeView,
    SessionDetailView,
    SessionScanView,
    SessionUploadView,
)

app_name = "diagnostics"

urlpatterns = [
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
    path("projects/", ProjectListCreateView.as_view(), name="project-list"),
    path("projects/<uuid:project_id>/", ProjectDetailView.as_view(), name="project-detail"),
    path(
        "projects/<uuid:project_id>/sessions/",
        ProjectSessionListCreateView.as_view(),
        name="project-session-list",
    ),
    path("sessions/<uuid:session_id>/", SessionDetailView.as_view(), name="session-detail"),
    path(
        "sessions/<uuid:session_id>/upload/",
        SessionUploadView.as_view(),
        name="session-upload",
    ),
    path(
        "sessions/<uuid:session_id>/analyze/",
        SessionAnalyzeView.as_view(),
        name="session-analyze",
    ),
    path("reports/<uuid:report_id>/", ReportDetailView.as_view(), name="report-detail"),
    path(
        "projects/<uuid:project_id>/imports/",
        ProjectImportCreateView.as_view(),
        name="readiness-import",
    ),
    path(
        "sessions/<uuid:session_id>/scan/",
        SessionScanView.as_view(),
        name="readiness-scan",
    ),
    path(
        "readiness-reports/<uuid:report_id>/",
        ReadinessReportDetailView.as_view(),
        name="readiness-report-detail",
    ),
]
