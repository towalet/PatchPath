"""
generateDeploymentReport() — orchestrates the full readiness pipeline.

    1. mark session analyzing
    2. load ProjectSource from DB
    3. run deterministic analyzer (always succeeds)
    4. call optional AI summarizer (never raises, degrades gracefully)
    5. persist ReadinessReport (update_or_create for idempotency)
    6. mark session completed

AI failure does NOT fail the session — the report still renders with
ai_used=False and an empty summary/patch_suggestions.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime

from django.db import transaction

from ..models import DebugSession, ReadinessReport, SessionStatus
from .ai_client import AIClient
from .project_normalizer import load_from_session
from .readiness_ai import summarize
from .readiness_analyzer import analyze

logger = logging.getLogger("patchpath")


def run_readiness(
    session: DebugSession,
    *,
    client: AIClient | None = None,
) -> ReadinessReport:
    """Full readiness pipeline. Returns the persisted ReadinessReport."""
    # Mark analyzing.
    session.status = SessionStatus.ANALYZING
    session.analysis_started_at = datetime.now(tz=UTC)
    session.save(update_fields=["status", "analysis_started_at"])

    try:
        ps = load_from_session(session)
        analysis = analyze(ps)
        ai_result = summarize(ps, analysis, client=client)
        pi = session.project_import

        with transaction.atomic():
            report, _ = ReadinessReport.objects.update_or_create(
                debug_session=session,
                defaults={
                    "readiness_score": analysis["score"],
                    "severity": analysis["severity"],
                    "detected_stack": analysis["stacks"],
                    "source_type": pi.source_type,
                    "deployment_target": analysis["target"],
                    "blocking_issues_json": analysis["blocking"],
                    "warnings_json": analysis["warnings"],
                    "improvements_json": analysis["improvements"],
                    "passed_checks_json": analysis["passed"],
                    "recommendations_json": analysis["recommendations"],
                    "evidence_json": analysis["evidence"],
                    "summary": ai_result["summary"],
                    "patch_suggestions_json": ai_result["patch_suggestions"],
                    "action_plan_json": ai_result["action_plan"],
                    "ai_insights_json": ai_result["ai_insights"],
                    "confidence_note": ai_result["confidence_note"],
                    "ai_used": ai_result["ai_used"],
                    "model_name": ai_result["model_name"] or "",
                    "prompt_tokens": ai_result["prompt_tokens"],
                    "completion_tokens": ai_result["completion_tokens"],
                },
            )

        session.status = SessionStatus.COMPLETED
        session.analysis_completed_at = datetime.now(tz=UTC)
        session.save(update_fields=["status", "analysis_completed_at"])

        return report

    except Exception as exc:
        logger.exception("Readiness scan failed for session %s: %s", session.pk, exc)
        session.status = SessionStatus.FAILED
        session.failure_reason = str(exc)[:2000]
        session.save(update_fields=["status", "failure_reason"])
        raise
