"""
Tests for readiness_report.run_readiness() — DB integration, AI optional.
"""

from __future__ import annotations

import pytest

from apps.diagnostics.models import ReadinessReport, SessionStatus
from apps.diagnostics.services import readiness_report as rr_svc
from apps.diagnostics.services.ai_client import AIResult
from apps.diagnostics.services.import_sources import RawEntry
from apps.diagnostics.services.project_normalizer import normalize, persist
from apps.diagnostics.tests.factories import ReadinessSessionFactory

pytestmark = pytest.mark.django_db


class FakeAIClient:
    def generate(self, system: str, user: str) -> AIResult:
        return AIResult(
            text='{"summary": "Good project.", "patch_suggestions": []}',
            model="test-model",
            prompt_tokens=10,
            completion_tokens=5,
        )


class RichAIClient:
    def generate(self, system: str, user: str) -> AIResult:
        payload = {
            "summary": "Nearly deployable.",
            "confidence_note": "Some files were truncated.",
            "action_plan": [
                {
                    "order": 1,
                    "title": "Add Procfile",
                    "detail": "For the platform",
                    "related_files": [],
                },
            ],
            "patch_suggestions": [
                {
                    "file": "Procfile",
                    "action": "create",
                    "title": "Create Procfile",
                    "reason": "No process file",
                    "severity": "high",
                    "current_snippet": None,
                    "proposed_change": "web: gunicorn app:app",
                    "effort": "low",
                }
            ],
            "ai_insights": [
                {
                    "title": "DEBUG may be on",
                    "detail": "Verify settings",
                    "file": None,
                    "severity": "medium",
                },
            ],
        }
        import json

        return AIResult(
            text=json.dumps(payload), model="test-model", prompt_tokens=20, completion_tokens=15
        )


class FailingAIClient:
    def generate(self, system: str, user: str) -> AIResult:
        from apps.diagnostics.services.ai_client import AIClientError

        raise AIClientError("Simulated AI failure")


def _build_session():
    session = ReadinessSessionFactory()
    entries = [
        RawEntry("README.md", b"# Hello"),
        RawEntry("Dockerfile", b"FROM python:3.12"),
    ]
    ps = normalize("github", "owner/repo", "https://github.com/owner/repo", entries)
    persist(session, ps)
    return session


# ---------------------------------------------------------------------------
# run_readiness()
# ---------------------------------------------------------------------------


def test_run_readiness_persists_report():
    session = _build_session()
    report = rr_svc.run_readiness(session, client=FakeAIClient())

    assert isinstance(report, ReadinessReport)
    assert 0 <= report.readiness_score <= 100
    session.refresh_from_db()
    assert session.status == SessionStatus.COMPLETED


def test_run_readiness_ai_used_with_key(settings):
    settings.PATCHPATH_AI["API_KEY"] = "fake-key"
    session = _build_session()
    report = rr_svc.run_readiness(session, client=FakeAIClient())

    assert report.ai_used is True
    assert report.summary == "Good project."


def test_run_readiness_persists_rich_ai_fields(settings):
    settings.PATCHPATH_AI["API_KEY"] = "fake-key"
    session = _build_session()
    report = rr_svc.run_readiness(session, client=RichAIClient())

    assert report.ai_used is True
    assert report.summary == "Nearly deployable."
    assert report.confidence_note == "Some files were truncated."
    assert report.action_plan_json[0]["title"] == "Add Procfile"
    assert report.ai_insights_json[0]["title"] == "DEBUG may be on"
    assert report.patch_suggestions_json[0]["action"] == "create"
    assert report.patch_suggestions_json[0]["proposed_change"] == "web: gunicorn app:app"


def test_run_readiness_ai_not_used_without_key(settings):
    settings.PATCHPATH_AI["API_KEY"] = ""
    session = _build_session()
    report = rr_svc.run_readiness(session, client=FakeAIClient())

    assert report.ai_used is False
    assert report.summary == ""


def test_run_readiness_ai_failure_degrades_gracefully(settings):
    settings.PATCHPATH_AI["API_KEY"] = "fake-key"
    session = _build_session()
    report = rr_svc.run_readiness(session, client=FailingAIClient())

    # Session still completes; AI fields are empty.
    assert report.ai_used is False
    assert report.summary == ""
    session.refresh_from_db()
    assert session.status == SessionStatus.COMPLETED


def test_run_readiness_idempotent():
    session = _build_session()
    r1 = rr_svc.run_readiness(session, client=FakeAIClient())
    r2 = rr_svc.run_readiness(session, client=FakeAIClient())
    # update_or_create — same PK.
    assert r1.pk == r2.pk
    assert ReadinessReport.objects.filter(debug_session=session).count() == 1
