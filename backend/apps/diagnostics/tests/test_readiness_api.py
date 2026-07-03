"""
Integration tests for the three readiness API endpoints:
  POST /api/projects/{id}/imports/
  POST /api/sessions/{id}/scan/
  GET  /api/readiness-reports/{id}/
"""

from __future__ import annotations

import io
import zipfile

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status

from apps.diagnostics.models import DebugSession, ProjectImport, SessionKind, SessionStatus
from apps.diagnostics.services.ai_client import AIResult
from apps.diagnostics.tests.factories import (
    ProjectFactory,
    ReadinessReportFactory,
    ReadinessSessionFactory,
)

pytestmark = pytest.mark.django_db


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_zip(members: list[tuple[str, bytes]] | None = None) -> bytes:
    members = members or [("README.md", b"# Hello"), ("Dockerfile", b"FROM python:3.12")]
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        for name, data in members:
            zf.writestr(name, data)
    return buf.getvalue()


class FakeAIClient:
    def generate(self, system, user) -> AIResult:
        return AIResult(
            text='{"summary": "Looks good.", "patch_suggestions": []}',
            model="test",
            prompt_tokens=1,
            completion_tokens=1,
        )


class RichAIClient:
    def generate(self, system, user) -> AIResult:
        import json

        payload = {
            "summary": "Almost ready.",
            "confidence_note": "",
            "action_plan": [{"order": 1, "title": "Pin deps", "detail": "", "related_files": []}],
            "patch_suggestions": [
                {
                    "file": "Dockerfile",
                    "action": "modify",
                    "title": "Add healthcheck",
                    "reason": "None found",
                    "severity": "medium",
                    "current_snippet": "FROM python:3.12",
                    "proposed_change": "FROM python:3.12\nHEALTHCHECK CMD true",
                    "effort": "low",
                }
            ],
            "ai_insights": [{"title": "DEBUG?", "detail": "check", "file": None, "severity": "high"}],
        }
        return AIResult(text=json.dumps(payload), model="test", prompt_tokens=2, completion_tokens=2)


IMPORT_URL = "api:diagnostics:readiness-import"
SCAN_URL = "api:diagnostics:readiness-scan"
REPORT_URL = "api:diagnostics:readiness-report-detail"


# ---------------------------------------------------------------------------
# POST /imports/ — authentication & ownership
# ---------------------------------------------------------------------------


def test_import_requires_auth(api_client, db):
    project = ProjectFactory()
    url = reverse(IMPORT_URL, kwargs={"project_id": project.id})
    resp = api_client.post(url, {"source_type": "github", "repo_url": "https://github.com/a/b"})
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


def test_import_foreign_project_404(auth_client, other_user):
    other_project = ProjectFactory(user=other_user)
    url = reverse(IMPORT_URL, kwargs={"project_id": other_project.id})
    resp = auth_client.post(url, {"source_type": "github", "repo_url": "https://github.com/a/b"})
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_import_invalid_source_type(auth_client, user):
    project = ProjectFactory(user=user)
    url = reverse(IMPORT_URL, kwargs={"project_id": project.id})
    resp = auth_client.post(url, {"source_type": "ftp"})
    assert resp.status_code == status.HTTP_400_BAD_REQUEST


def test_import_github_missing_url(auth_client, user):
    project = ProjectFactory(user=user)
    url = reverse(IMPORT_URL, kwargs={"project_id": project.id})
    resp = auth_client.post(url, {"source_type": "github"})
    assert resp.status_code == status.HTTP_400_BAD_REQUEST


# ---------------------------------------------------------------------------
# POST /imports/ — ZIP import
# ---------------------------------------------------------------------------


def test_import_zip_creates_session_and_import(auth_client, user):
    project = ProjectFactory(user=user)
    url = reverse(IMPORT_URL, kwargs={"project_id": project.id})
    raw_zip = _make_zip()
    archive = SimpleUploadedFile("project.zip", raw_zip, content_type="application/zip")

    resp = auth_client.post(
        url,
        data={"source_type": "zip", "archive": archive},
        format="multipart",
    )
    assert resp.status_code == status.HTTP_201_CREATED, resp.json()
    data = resp.json()
    assert "session_id" in data
    assert "import" in data

    session = DebugSession.objects.get(pk=data["session_id"])
    assert session.kind == SessionKind.READINESS
    assert ProjectImport.objects.filter(debug_session=session).exists()


# ---------------------------------------------------------------------------
# POST /imports/ — folder import
# ---------------------------------------------------------------------------


def test_import_folder_creates_session(auth_client, user):
    project = ProjectFactory(user=user)
    url = reverse(IMPORT_URL, kwargs={"project_id": project.id})

    from django.core.files.uploadedfile import SimpleUploadedFile

    files = [
        SimpleUploadedFile("project/README.md", b"# Hello", content_type="text/plain"),
        SimpleUploadedFile("project/Dockerfile", b"FROM python:3.12", content_type="text/plain"),
    ]
    resp = auth_client.post(
        url,
        data={"source_type": "folder", "files": files},
        format="multipart",
    )
    assert resp.status_code == status.HTTP_201_CREATED, resp.json()
    data = resp.json()
    assert "session_id" in data


# ---------------------------------------------------------------------------
# POST /sessions/{id}/scan/
# ---------------------------------------------------------------------------


def test_scan_without_import_returns_400(auth_client, user):
    session = ReadinessSessionFactory(project__user=user)
    url = reverse(SCAN_URL, kwargs={"session_id": session.id})
    resp = auth_client.post(url)
    assert resp.status_code == status.HTTP_400_BAD_REQUEST


def test_scan_foreign_session_404(auth_client, other_user):
    session = ReadinessSessionFactory(project__user=other_user)
    url = reverse(SCAN_URL, kwargs={"session_id": session.id})
    resp = auth_client.post(url)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_scan_with_import_returns_report_id(auth_client, user, monkeypatch, settings):
    settings.PATCHPATH_AI["API_KEY"] = ""
    project = ProjectFactory(user=user)

    # Use the import endpoint to create the session + ProjectImport.
    import_url = reverse(IMPORT_URL, kwargs={"project_id": project.id})
    raw_zip = _make_zip()
    archive = SimpleUploadedFile("project.zip", raw_zip, content_type="application/zip")
    import_resp = auth_client.post(
        import_url,
        data={"source_type": "zip", "archive": archive},
        format="multipart",
    )
    assert import_resp.status_code == status.HTTP_201_CREATED
    session_id = import_resp.json()["session_id"]

    scan_url = reverse(SCAN_URL, kwargs={"session_id": session_id})
    scan_resp = auth_client.post(scan_url)
    assert scan_resp.status_code == status.HTTP_200_OK, scan_resp.json()
    data = scan_resp.json()
    assert data["report_id"] is not None
    assert data["status"] == SessionStatus.COMPLETED


def test_scan_with_ai_returns_rich_report(auth_client, user, monkeypatch, settings):
    """AI-enabled scan surfaces the rich fields through the report endpoint."""
    settings.PATCHPATH_AI["API_KEY"] = "fake-key"
    monkeypatch.setattr(
        "apps.diagnostics.services.readiness_ai.AIClient", lambda *a, **k: RichAIClient()
    )
    project = ProjectFactory(user=user)

    import_url = reverse(IMPORT_URL, kwargs={"project_id": project.id})
    archive = SimpleUploadedFile("project.zip", _make_zip(), content_type="application/zip")
    import_resp = auth_client.post(
        import_url,
        data={"source_type": "zip", "archive": archive},
        format="multipart",
    )
    session_id = import_resp.json()["session_id"]

    scan_url = reverse(SCAN_URL, kwargs={"session_id": session_id})
    scan_resp = auth_client.post(scan_url)
    assert scan_resp.status_code == status.HTTP_200_OK, scan_resp.json()
    report_id = scan_resp.json()["report_id"]

    report_url = reverse(REPORT_URL, kwargs={"report_id": report_id})
    report = auth_client.get(report_url).json()
    assert report["ai_used"] is True
    assert report["summary"] == "Almost ready."
    assert report["action_plan_json"][0]["title"] == "Pin deps"
    assert report["ai_insights_json"][0]["title"] == "DEBUG?"
    assert report["patch_suggestions_json"][0]["proposed_change"].startswith("FROM python:3.12")


# ---------------------------------------------------------------------------
# GET /readiness-reports/{id}/
# ---------------------------------------------------------------------------


def test_get_readiness_report(auth_client, user):
    report = ReadinessReportFactory(debug_session__project__user=user)
    url = reverse(REPORT_URL, kwargs={"report_id": report.id})
    resp = auth_client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()
    assert "readiness_score" in data
    assert "blocking_issues_json" in data


def test_get_readiness_report_foreign_404(auth_client, other_user):
    report = ReadinessReportFactory(debug_session__project__user=other_user)
    url = reverse(REPORT_URL, kwargs={"report_id": report.id})
    resp = auth_client.get(url)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_get_readiness_report_unauth(api_client, user):
    report = ReadinessReportFactory(debug_session__project__user=user)
    url = reverse(REPORT_URL, kwargs={"report_id": report.id})
    resp = api_client.get(url)
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED
