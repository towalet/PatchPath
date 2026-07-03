"""
Unit tests for the code-aware readiness AI layer:
  - readiness_context.build_context / render_context (selection + budgets)
  - readiness_ai._build_prompt (full file list, fenced contents, retry note)
  - readiness_schema.ReadinessAIOutput (legacy + rich payloads)
  - readiness_ai._validate_and_cap (caps + create/modify citation rules)
  - readiness_ai.summarize (retry loop + graceful degradation)

None of these need the database or the network — the AI client is a fake.
"""

from __future__ import annotations

import json

import pytest

from apps.diagnostics.services import readiness_ai
from apps.diagnostics.services.ai_client import AIClientError, AIResult
from apps.diagnostics.services.import_sources import RawEntry
from apps.diagnostics.services.project_normalizer import normalize
from apps.diagnostics.services.readiness_analyzer import analyze
from apps.diagnostics.services.readiness_context import build_context, render_context
from apps.diagnostics.services.readiness_schema import ReadinessAIOutput


def _source(entries: list[tuple[str, bytes]]):
    raw = [RawEntry(path, data) for path, data in entries]
    return normalize("github", "owner/repo", "https://github.com/owner/repo", raw)


def _rich_payload(**overrides) -> dict:
    payload = {
        "summary": "The project is close to deployable but has gaps.",
        "confidence_note": "",
        "action_plan": [
            {"order": 1, "title": "Pin deps", "detail": "Add versions", "related_files": ["requirements.txt"]},
        ],
        "patch_suggestions": [
            {
                "file": "Dockerfile",
                "action": "modify",
                "title": "Add healthcheck",
                "reason": "No HEALTHCHECK present",
                "severity": "medium",
                "current_snippet": "FROM python:3.12",
                "proposed_change": "FROM python:3.12\nHEALTHCHECK CMD curl -f http://localhost/ || exit 1",
                "effort": "low",
            }
        ],
        "ai_insights": [
            {"title": "DEBUG likely on", "detail": "Check settings", "file": None, "severity": "high"},
        ],
    }
    payload.update(overrides)
    return payload


# ---------------------------------------------------------------------------
# Context builder
# ---------------------------------------------------------------------------


def test_build_context_prioritizes_tier0():
    ps = _source(
        [
            ("src/util.py", b"print('x')"),  # note: not important -> no content
            ("Dockerfile", b"FROM python:3.12"),
            ("package.json", b'{"name": "x"}'),
        ]
    )
    analysis = analyze(ps)
    ctx = build_context(ps, analysis)
    included = [cf.relpath for cf in ctx.included]
    # Dockerfile and package.json are tier-0; both present, Dockerfile first.
    assert included[0] == "Dockerfile"
    assert "package.json" in included


def test_build_context_lockfiles_are_paths_only():
    ps = _source(
        [
            ("package.json", b'{"name": "x"}'),
            ("package-lock.json", b'{"lockfileVersion": 3}'),
        ]
    )
    analysis = analyze(ps)
    ctx = build_context(ps, analysis)
    included = [cf.relpath for cf in ctx.included]
    assert "package.json" in included
    assert "package-lock.json" not in included
    assert "package-lock.json" in ctx.paths_only


def test_build_context_truncates_and_marks():
    big = b"x" * 5_000
    ps = _source([("Dockerfile", big)])
    analysis = analyze(ps)
    ctx = build_context(ps, analysis, per_file_budget=1_000, total_budget=10_000)
    cf = ctx.included[0]
    assert cf.truncated is True
    assert "[TRUNCATED:" in cf.content
    assert len(cf.content) < 5_000


def test_build_context_total_budget_overflow_to_paths_only():
    ps = _source(
        [
            ("Dockerfile", b"FROM python:3.12\n" * 40),
            ("package.json", b'{"name": "x"}\n' * 40),
        ]
    )
    analysis = analyze(ps)
    # Total budget only fits the first file.
    ctx = build_context(ps, analysis, per_file_budget=1_000, total_budget=300)
    assert len(ctx.included) == 1
    assert ctx.paths_only  # the second file spilled


def test_render_context_fences_files_and_lists_paths():
    ps = _source(
        [
            ("Dockerfile", b"FROM python:3.12"),
            ("package-lock.json", b"{}"),
        ]
    )
    analysis = analyze(ps)
    rendered = render_context(build_context(ps, analysis))
    assert "=== FILE: Dockerfile ===" in rendered
    assert "=== END FILE ===" in rendered
    assert "paths only" in rendered.lower()


# ---------------------------------------------------------------------------
# Prompt builder
# ---------------------------------------------------------------------------


def test_build_prompt_lists_full_files_checked():
    # More than the old 20-file cap to guard the regression.
    entries = [("README.md", b"# hi"), ("Dockerfile", b"FROM python:3.12")]
    entries += [(f"src/mod{i}.py", b"x") for i in range(30)]
    ps = _source(entries)
    analysis = analyze(ps)
    ctx = build_context(ps, analysis)
    prompt = readiness_ai._build_prompt(ps, analysis, ctx)
    assert f"Files checked ({len(ps.files_checked)})" in prompt
    for f in ps.files_checked:
        assert f in prompt


def test_build_prompt_includes_file_contents_and_retry_note():
    ps = _source([("Dockerfile", b"FROM python:3.12")])
    analysis = analyze(ps)
    ctx = build_context(ps, analysis)
    prompt = readiness_ai._build_prompt(ps, analysis, ctx, retry_note="bad json")
    assert "=== FILE: Dockerfile ===" in prompt
    assert "bad json" in prompt


# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------


def test_schema_accepts_minimal_legacy_payload():
    out = ReadinessAIOutput.model_validate({"summary": "ok", "patch_suggestions": []})
    assert out.summary == "ok"
    assert out.action_plan == []
    assert out.ai_insights == []


def test_schema_accepts_rich_payload():
    out = ReadinessAIOutput.model_validate(_rich_payload())
    assert out.patch_suggestions[0].action == "modify"
    assert out.action_plan[0].order == 1


def test_schema_rejects_empty_summary():
    with pytest.raises(Exception):
        ReadinessAIOutput.model_validate({"summary": "   "})


# ---------------------------------------------------------------------------
# _validate_and_cap
# ---------------------------------------------------------------------------


def test_cap_drops_modify_of_unknown_file():
    ps = _source([("Dockerfile", b"FROM python:3.12")])
    out = ReadinessAIOutput.model_validate(
        _rich_payload(
            patch_suggestions=[
                {"file": "nope.py", "action": "modify", "proposed_change": "x"},
            ]
        )
    )
    capped = readiness_ai._validate_and_cap(out, ps)
    assert capped["patch_suggestions"] == []


def test_cap_downgrades_create_of_existing_file():
    ps = _source([("Dockerfile", b"FROM python:3.12")])
    out = ReadinessAIOutput.model_validate(
        _rich_payload(
            patch_suggestions=[
                {"file": "Dockerfile", "action": "create", "proposed_change": "FROM x"},
            ]
        )
    )
    capped = readiness_ai._validate_and_cap(out, ps)
    assert capped["patch_suggestions"][0]["action"] == "modify"


def test_cap_keeps_create_of_new_file():
    ps = _source([("Dockerfile", b"FROM python:3.12")])
    out = ReadinessAIOutput.model_validate(
        _rich_payload(
            patch_suggestions=[
                {"file": "Procfile", "action": "create", "proposed_change": "web: gunicorn"},
            ]
        )
    )
    capped = readiness_ai._validate_and_cap(out, ps)
    assert capped["patch_suggestions"][0]["file"] == "Procfile"
    assert capped["patch_suggestions"][0]["action"] == "create"


def test_cap_limits_counts_and_snippet_length():
    ps = _source([("Dockerfile", b"FROM python:3.12")])
    many = [
        {"file": "Dockerfile", "action": "modify", "proposed_change": "y" * 9_000}
        for _ in range(10)
    ]
    out = ReadinessAIOutput.model_validate(_rich_payload(patch_suggestions=many))
    capped = readiness_ai._validate_and_cap(out, ps)
    assert len(capped["patch_suggestions"]) <= readiness_ai.MAX_PATCH_SUGGESTIONS
    assert len(capped["patch_suggestions"][0]["proposed_change"]) <= readiness_ai.MAX_SNIPPET_CHARS + 20


def test_cap_nulls_bogus_insight_file_but_keeps_insight():
    ps = _source([("Dockerfile", b"FROM python:3.12")])
    out = ReadinessAIOutput.model_validate(
        _rich_payload(
            ai_insights=[{"title": "x", "detail": "y", "file": "ghost.py", "severity": "low"}]
        )
    )
    capped = readiness_ai._validate_and_cap(out, ps)
    assert len(capped["ai_insights"]) == 1
    assert capped["ai_insights"][0]["file"] is None


def test_cap_strips_legacy_create_prefix():
    ps = _source([("Dockerfile", b"FROM python:3.12")])
    out = ReadinessAIOutput.model_validate(
        _rich_payload(
            patch_suggestions=[
                {"file": "CREATE:Procfile", "action": "create", "proposed_change": "web: x"},
            ]
        )
    )
    capped = readiness_ai._validate_and_cap(out, ps)
    assert capped["patch_suggestions"][0]["file"] == "Procfile"


# ---------------------------------------------------------------------------
# summarize() retry behaviour
# ---------------------------------------------------------------------------


class _FailOnceClient:
    def __init__(self):
        self.calls = 0

    def generate(self, system, user) -> AIResult:
        self.calls += 1
        if self.calls == 1:
            raise AIClientError("transient")
        return AIResult(text=json.dumps(_rich_payload()), model="m", prompt_tokens=1, completion_tokens=1)


class _AlwaysBadJsonClient:
    def __init__(self):
        self.calls = 0

    def generate(self, system, user) -> AIResult:
        self.calls += 1
        return AIResult(text="not json", model="m", prompt_tokens=1, completion_tokens=1)


def test_summarize_retries_then_succeeds(settings):
    settings.PATCHPATH_AI["API_KEY"] = "k"
    settings.PATCHPATH_AI["MAX_RETRIES"] = 1
    ps = _source([("Dockerfile", b"FROM python:3.12")])
    client = _FailOnceClient()
    result = readiness_ai.summarize(ps, analyze(ps), client=client)
    assert result["ai_used"] is True
    assert client.calls == 2
    assert result["patch_suggestions"]


def test_summarize_degrades_after_exhausting_retries(settings):
    settings.PATCHPATH_AI["API_KEY"] = "k"
    settings.PATCHPATH_AI["MAX_RETRIES"] = 1
    ps = _source([("Dockerfile", b"FROM python:3.12")])
    client = _AlwaysBadJsonClient()
    result = readiness_ai.summarize(ps, analyze(ps), client=client)
    assert result["ai_used"] is False
    assert client.calls == 2  # MAX_RETRIES + 1
    assert result["summary"] == ""


def test_summarize_no_key_returns_empty(settings):
    settings.PATCHPATH_AI["API_KEY"] = ""
    ps = _source([("Dockerfile", b"FROM python:3.12")])
    result = readiness_ai.summarize(ps, analyze(ps), client=_FailOnceClient())
    assert result["ai_used"] is False
