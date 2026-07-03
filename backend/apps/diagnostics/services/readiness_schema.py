"""
Pydantic schema for the AI layer output only.

The AI never produces the readiness score or the structured deterministic checks
— those come from the analyzer. The AI reviews the (secret-redacted) code and adds
a plain-English summary, a prioritized action plan, concrete file-level patch
suggestions (with real code), and insights it can see that the deterministic
checks did not flag.

Every field beyond ``summary`` defaults to empty so that a minimal legacy payload
(``{"summary": "...", "patch_suggestions": []}``) still validates — server-side
capping/filtering happens in :mod:`readiness_ai`, not here.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, field_validator

Severity = Literal["high", "medium", "low"]
Effort = Literal["low", "medium", "high"]
PatchAction = Literal["create", "modify"]


class ActionPlanStep(BaseModel):
    order: int = 0
    title: str
    detail: str = ""
    related_files: list[str] = []


class PatchSuggestion(BaseModel):
    file: str
    action: PatchAction = "modify"
    title: str = ""
    reason: str = ""
    severity: Severity = "medium"
    current_snippet: str | None = None
    proposed_change: str = ""
    effort: Effort = "medium"


class AIInsight(BaseModel):
    title: str
    detail: str = ""
    file: str | None = None
    severity: Severity = "low"


class ReadinessAIOutput(BaseModel):
    summary: str
    confidence_note: str = ""
    action_plan: list[ActionPlanStep] = []
    patch_suggestions: list[PatchSuggestion] = []
    ai_insights: list[AIInsight] = []

    @field_validator("summary")
    @classmethod
    def summary_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("summary must not be empty")
        return v.strip()
