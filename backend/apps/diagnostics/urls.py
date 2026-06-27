"""
Diagnostics URL routes, mounted under /api/.

TODO: register routers/paths for dashboard, projects, sessions, and reports.
The empty urlpatterns keeps config.urls importable while the app is scaffolded.
"""
from __future__ import annotations

from django.urls import path

app_name = "diagnostics"

urlpatterns: list[path] = [
    # path("dashboard/", DashboardView.as_view(), name="dashboard"),
    # path("projects/", ProjectListCreateView.as_view(), name="project-list"),
    # ...
]
