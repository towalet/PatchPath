"""
Diagnostics API views.

Thin views — business logic lives in apps.diagnostics.services. Planned endpoints
(see docs/AGENT_PLAN.md §8 "API Design"):

    GET  /api/dashboard/
    GET  /api/projects/                       POST /api/projects/
    GET  /api/projects/{id}/
    POST /api/projects/{project_id}/sessions/
    GET  /api/sessions/{id}/
    POST /api/sessions/{id}/upload/           (throttle scope: upload)
    POST /api/sessions/{id}/analyze/          (throttle scope: analyze)
    GET  /api/reports/{id}/

All endpoints require authentication and scope querysets by request.user.

TODO: implement viewsets/views once models + services land.
"""
from __future__ import annotations

# from rest_framework import viewsets  # noqa: ERA001
