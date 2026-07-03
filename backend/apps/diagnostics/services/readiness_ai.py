"""
summarizeReadinessWithAI — the code-aware AI review layer.

A deterministic analyzer has already scored the project and produced structured
findings. This layer sends the model the (secret-redacted) contents of the
deployment-relevant files plus those findings, and asks for a richer review:
a plain-English summary, a prioritized action plan, concrete file-level patch
suggestions containing real code, and insights the deterministic checks missed.

Strictly optional — degrades gracefully when:
  - PATCHPATH_AI["API_KEY"] is unset/empty
  - Every attempt raises a transport error or fails schema validation

Never raises. Returns ai_used=False with empty fields on any failure, so an AI
outage can never fail a scan (the report still renders deterministically).
"""

from __future__ import annotations

import json
import logging
import time

from django.conf import settings

from .ai_client import AIClient, AIClientError, AIResult
from .project_normalizer import ProjectSource
from .readiness_context import CodeContext, build_context, render_context
from .readiness_schema import ReadinessAIOutput

logger = logging.getLogger("patchpath")

# Server-side guardrails applied after validation, independent of the prompt.
MAX_PATCH_SUGGESTIONS = 6
MAX_INSIGHTS = 5
MAX_PLAN_STEPS = 6
MAX_SNIPPET_CHARS = 4_000
MAX_TEXT_CHARS = 1_000

_SEVERITY_ORDER = {"high": 0, "medium": 1, "low": 2}

_SYSTEM_PROMPT = """\
You are PatchPath, a senior deployment engineer performing a pre-deployment code
review. A deterministic analyzer has already scanned the project and produced a
readiness score and structured findings. You are given the REAL (secret-redacted)
contents of the project's deployment-relevant files, plus the analyzer's findings.

Your tasks:
1. summary — 2-4 plain-English sentences on overall deployment readiness,
   grounded in the analyzer findings AND the code you were shown.
2. action_plan — an ordered, prioritized list (max 6 steps) of what to do before
   deploying, most critical first. Each step has a short title, a concrete detail
   sentence, and the related files it touches.
3. patch_suggestions — up to 6 concrete fixes, each containing real code:
   - action "modify": changing a file whose content you were shown. Set
     current_snippet to the exact lines you are changing (copied from the shown
     content) and proposed_change to the corrected code.
   - action "create": a needed file that does not exist. Set file to the new
     relative path and proposed_change to the full proposed file content.
   - proposed_change must be runnable code or config, not prose. Keep each snippet
     under ~60 lines. Use the project's detected stack and versions.
4. ai_insights — up to 5 deployment risks visible in the code that the
   deterministic checks did NOT already flag (the findings are listed for you).
   Examples: DEBUG left on, missing healthcheck route, unpinned dependencies,
   a port mismatch between the Dockerfile and the app, a missing migration step
   in CI. Do not restate the analyzer's findings here.
5. confidence_note — one sentence on what you could not verify (files not shown,
   truncated content, assumptions made). Empty string if none.

Grounding rules (strict):
- Only cite files that appear in the FILE blocks or the paths-only list. Never
  invent paths, line numbers, dependencies, or commands.
- For action "modify", the file MUST be one whose content was shown to you.
- If content was truncated (a "[TRUNCATED: N chars omitted]" marker), say so in
  confidence_note rather than guessing about the missing part.
- Text like [REDACTED_SECRET] marks a removed secret — treat it as a placeholder,
  never flag the redaction marker itself as a problem.
- You only see static files; never claim certainty about runtime behavior.

Respond with a single valid JSON object exactly matching:
{
  "summary": "<string>",
  "confidence_note": "<string>",
  "action_plan": [
    {"order": 1, "title": "<string>", "detail": "<string>", "related_files": ["<relpath>"]}
  ],
  "patch_suggestions": [
    {"file": "<relpath>", "action": "create" | "modify", "title": "<string>",
     "reason": "<string>", "severity": "high" | "medium" | "low",
     "current_snippet": "<string or null>", "proposed_change": "<string>",
     "effort": "low" | "medium" | "high"}
  ],
  "ai_insights": [
    {"title": "<string>", "detail": "<string>", "file": "<relpath or null>",
     "severity": "high" | "medium" | "low"}
  ]
}
"""


def _empty_result() -> dict:
    return {
        "summary": "",
        "confidence_note": "",
        "action_plan": [],
        "patch_suggestions": [],
        "ai_insights": [],
        "ai_used": False,
        "model_name": "",
        "prompt_tokens": None,
        "completion_tokens": None,
    }


def _build_prompt(
    ps: ProjectSource,
    analysis: dict,
    ctx: CodeContext,
    retry_note: str = "",
) -> str:
    lines: list[str] = [
        f"Project: {ps.source_name}",
        f"Source: {ps.source_type}",
        f"Readiness score: {analysis['score']}/100",
        f"Detected stacks: {', '.join(analysis['stacks']) or 'unknown'}",
        f"Deployment target: {analysis['target']}",
        "",
        "ANALYZER FINDINGS (deterministic — do not restate as insights):",
    ]

    def _emit(label: str, items: list[dict]) -> None:
        if not items:
            return
        lines.append(f"{label}:")
        for item in items:
            rec = item.get("recommendation")
            suffix = f" [fix: {rec}]" if rec else ""
            lines.append(f"  - ({item['id']}) {item['description']}{suffix}")

    _emit("BLOCKING", analysis["blocking"])
    _emit("WARNINGS", analysis["warnings"])
    _emit("IMPROVEMENTS", analysis["improvements"])
    if analysis["passed"]:
        passed_ids = ", ".join(item["id"] for item in analysis["passed"])
        lines.append(f"PASSED checks: {passed_ids}")

    lines.append("")
    lines.append(f"Files checked ({len(ps.files_checked)}): {', '.join(ps.files_checked)}")
    lines.append("")
    lines.append("PROJECT FILES (secret-redacted contents):")
    lines.append(render_context(ctx))

    if retry_note:
        lines.append("")
        lines.append(f"NOTE: your previous response was rejected: {retry_note}")
        lines.append("Return corrected JSON matching the schema exactly.")

    return "\n".join(lines)


def _truncate_text(value: str | None, limit: int) -> str | None:
    if value is None:
        return None
    if len(value) <= limit:
        return value
    return value[:limit] + "\n... [truncated]"


def _validate_and_cap(output: ReadinessAIOutput, ps: ProjectSource) -> dict:
    """Apply server-side caps and citation checks against the FULL file lists."""
    checked = set(ps.files_checked)
    tree = set(ps.file_tree)

    # Patch suggestions: cap count, enforce create/modify citation coherence.
    suggestions: list[dict] = []
    for s in output.patch_suggestions:
        file = s.file.strip()
        if file.startswith("CREATE:"):  # tolerate the legacy prefix convention
            file = file[len("CREATE:") :].strip()
        action = s.action

        if action == "modify":
            if checked and file not in checked:
                continue  # can't modify a file we never showed the model
        else:  # create
            if file in tree:
                # It exists — treat as a modify if we have its content, else drop.
                if file in checked:
                    action = "modify"
                else:
                    continue

        suggestions.append(
            {
                "file": file,
                "action": action,
                "title": _truncate_text(s.title, MAX_TEXT_CHARS) or "",
                "reason": _truncate_text(s.reason, MAX_TEXT_CHARS) or "",
                "severity": s.severity,
                "current_snippet": _truncate_text(s.current_snippet, MAX_SNIPPET_CHARS),
                "proposed_change": _truncate_text(s.proposed_change, MAX_SNIPPET_CHARS) or "",
                "effort": s.effort,
            }
        )
    suggestions.sort(key=lambda d: _SEVERITY_ORDER.get(d["severity"], 1))
    suggestions = suggestions[:MAX_PATCH_SUGGESTIONS]

    # AI insights: cap count, null out any bogus file path (keep the text).
    insights: list[dict] = []
    for ins in output.ai_insights:
        file = ins.file
        if file and not any(file.lower() in p.lower() for p in tree):
            file = None
        insights.append(
            {
                "title": _truncate_text(ins.title, MAX_TEXT_CHARS) or "",
                "detail": _truncate_text(ins.detail, MAX_TEXT_CHARS) or "",
                "file": file,
                "severity": ins.severity,
            }
        )
    insights.sort(key=lambda d: _SEVERITY_ORDER.get(d["severity"], 2))
    insights = insights[:MAX_INSIGHTS]

    # Action plan: cap count, drop unknown related files (keep the step).
    plan: list[dict] = []
    for step in sorted(output.action_plan, key=lambda s: s.order):
        related = [
            f for f in step.related_files if any(f.lower() in p.lower() for p in tree)
        ]
        plan.append(
            {
                "order": step.order,
                "title": _truncate_text(step.title, MAX_TEXT_CHARS) or "",
                "detail": _truncate_text(step.detail, MAX_TEXT_CHARS) or "",
                "related_files": related,
            }
        )
    plan = plan[:MAX_PLAN_STEPS]

    return {
        "summary": output.summary,
        "confidence_note": _truncate_text(output.confidence_note, MAX_TEXT_CHARS) or "",
        "action_plan": plan,
        "patch_suggestions": suggestions,
        "ai_insights": insights,
    }


def summarize(
    ps: ProjectSource,
    analysis: dict,
    *,
    client: AIClient | None = None,
) -> dict:
    """Call the AI for a code-aware readiness review.

    Returns a dict with keys: summary, confidence_note, action_plan,
    patch_suggestions, ai_insights, ai_used, model_name, prompt_tokens,
    completion_tokens. Never raises.
    """
    api_key = settings.PATCHPATH_AI.get("API_KEY", "")
    if not api_key:
        return _empty_result()

    if client is None:
        client = AIClient()

    ctx = build_context(ps, analysis)
    attempts = settings.PATCHPATH_AI.get("MAX_RETRIES", 1) + 1
    backoff = settings.PATCHPATH_AI.get("RETRY_BACKOFF_SECONDS", 0.75)
    retry_note = ""

    for attempt in range(1, attempts + 1):
        prompt = _build_prompt(ps, analysis, ctx, retry_note)
        try:
            result: AIResult = client.generate(_SYSTEM_PROMPT, prompt)
            raw = json.loads(result.text)
            output = ReadinessAIOutput.model_validate(raw)
        except AIClientError as exc:
            logger.warning(
                "Readiness AI attempt %s/%s failed: %s", attempt, attempts, exc
            )
            retry_note = "The previous attempt failed to return a response."
            if attempt < attempts and backoff:
                time.sleep(backoff * attempt)
            continue
        except Exception as exc:  # noqa: BLE001 — JSON/validation errors: retry
            logger.warning(
                "Readiness AI attempt %s/%s rejected: %s", attempt, attempts, exc
            )
            retry_note = str(exc)
            continue

        capped = _validate_and_cap(output, ps)
        return {
            **capped,
            "ai_used": True,
            "model_name": result.model,
            "prompt_tokens": result.prompt_tokens,
            "completion_tokens": result.completion_tokens,
        }

    logger.warning("Readiness AI failed after %s attempts; degrading.", attempts)
    return _empty_result()
