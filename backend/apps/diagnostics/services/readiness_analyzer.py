"""
analyzeProject() — deterministic deployment-readiness analysis.

Works entirely on a ProjectSource (file tree + file content). No API key
required. Returns a structured dict that is persisted into ReadinessReport.
"""

from __future__ import annotations

import json

from ..models import DebugSession, ReadinessReport, Severity
from .project_normalizer import ProjectSource, load_from_session
from .readiness_rules import CHECKS, STACK_SIGNATURES, TARGET_SIGNATURES, Check

# ---------------------------------------------------------------------------
# Stack detection
# ---------------------------------------------------------------------------


def detect_stack(ps: ProjectSource) -> list[str]:
    """Return a list of detected stacks, most specific first."""
    tree_set = set(ps.file_tree)
    content_map: dict[str, str] = {pf.relpath: pf.content for pf in ps.files}

    detected: list[str] = []
    for stack, sigs in STACK_SIGNATURES.items():
        for path_fragment, content_fragment in sigs:
            matched_path = _find_path(tree_set, path_fragment)
            if matched_path is None:
                continue
            if content_fragment:
                file_content = content_map.get(matched_path, "")
                if content_fragment.lower() not in file_content.lower():
                    continue
            detected.append(stack)
            break  # one match per stack

    # Deduplicate while preserving order.
    seen: set[str] = set()
    result: list[str] = []
    for s in detected:
        if s not in seen:
            seen.add(s)
            result.append(s)
    return result


def _find_path(tree_set: set[str], fragment: str) -> str | None:
    """Return the first tree path that contains ``fragment`` (case-insensitive)."""
    frag_lower = fragment.lower()
    for p in tree_set:
        if frag_lower in p.lower():
            return p
    return None


# ---------------------------------------------------------------------------
# Target detection
# ---------------------------------------------------------------------------


def detect_target(ps: ProjectSource, stacks: list[str]) -> str:
    tree_set = set(ps.file_tree)
    for file_fragment, target in TARGET_SIGNATURES:
        if _find_path(tree_set, file_fragment) is not None:
            return target
    return "unknown"


# ---------------------------------------------------------------------------
# Check evaluation
# ---------------------------------------------------------------------------


def _get_content(ps: ProjectSource, path_fragment: str) -> str:
    for pf in ps.files:
        if path_fragment.lower() in pf.relpath.lower():
            return pf.content
    return ""


def _file_exists(ps: ProjectSource, path_fragment: str) -> bool:
    lower = path_fragment.lower()
    return any(lower in p.lower() for p in ps.file_tree)


def _check_passes(check: Check, ps: ProjectSource, stacks: list[str]) -> tuple[bool, str]:
    """Return (passes, evidence_source_if_passed)."""
    tree_set = set(ps.file_tree)

    if check.id == "has_readme":
        match = _find_path(tree_set, "README")
        return (match is not None), (match or "")

    if check.id == "has_env_example":
        for candidate in (".env.example", ".env.sample", ".env.template"):
            if _find_path(tree_set, candidate):
                return True, candidate
        return False, ""

    if check.id == "has_dockerfile_or_target":
        platform_files = [
            "Dockerfile",
            "docker-compose",
            "vercel.json",
            "render.yaml",
            "railway.json",
            "railway.toml",
            "Procfile",
            "fly.toml",
            "netlify.toml",
            "app.json",
        ]
        for pf in platform_files:
            if _find_path(tree_set, pf):
                return True, pf
        return False, ""

    if check.id == "has_ci":
        for p in ps.file_tree:
            if ".github/workflows" in p and p.endswith((".yml", ".yaml")):
                return True, p
        return False, ""

    if check.id == "dockerfile_healthcheck":
        content = _get_content(ps, "Dockerfile")
        if not content:
            return True, ""  # no Dockerfile → Docker stack not confirmed; skip
        return ("HEALTHCHECK" in content), "Dockerfile"

    if check.id == "dockerfile_nonroot_user":
        content = _get_content(ps, "Dockerfile")
        if not content:
            return True, ""
        lines = content.splitlines()
        user_lines = [ln for ln in lines if ln.strip().startswith("USER ")]
        has_nonroot = any("root" not in ln.lower() for ln in user_lines)
        return (len(user_lines) > 0 and has_nonroot), "Dockerfile"

    if check.id == "compose_has_depends_on":
        content = _get_content(ps, "docker-compose")
        if not content or content.count("services:") == 0:
            return True, ""
        service_count = content.count("\n  ") // 3  # rough heuristic
        if "depends_on" in content or service_count <= 1:
            return True, "docker-compose.yml"
        return False, "docker-compose.yml"

    if check.id == "node_has_start_script":
        content = _get_content(ps, "package.json")
        if not content:
            return False, ""
        try:
            pkg = json.loads(content)
            scripts = pkg.get("scripts", {})
            return ("start" in scripts), "package.json"
        except (json.JSONDecodeError, AttributeError):
            return False, "package.json"

    if check.id == "node_has_build_script":
        content = _get_content(ps, "package.json")
        if not content:
            return False, ""
        try:
            pkg = json.loads(content)
            return ("build" in pkg.get("scripts", {})), "package.json"
        except (json.JSONDecodeError, AttributeError):
            return False, "package.json"

    if check.id == "node_engine_specified":
        content = _get_content(ps, "package.json")
        if not content:
            return False, ""
        try:
            pkg = json.loads(content)
            return ("engines" in pkg), "package.json"
        except (json.JSONDecodeError, AttributeError):
            return False, "package.json"

    if check.id == "python_has_requirements":
        for candidate in ("requirements.txt", "pyproject.toml", "Pipfile", "setup.py"):
            if _find_path(tree_set, candidate):
                return True, candidate
        return False, ""

    if check.id == "django_has_procfile_or_wsgi":
        if _find_path(tree_set, "Procfile"):
            return True, "Procfile"
        if _find_path(tree_set, "wsgi.py") or _find_path(tree_set, "asgi.py"):
            return True, "wsgi.py"
        return False, ""

    if check.id == "fastapi_has_procfile_or_main":
        if _find_path(tree_set, "Procfile"):
            return True, "Procfile"
        if _find_path(tree_set, "main.py") or _find_path(tree_set, "app.py"):
            return True, "main.py"
        return False, ""

    if check.id == "django_allowed_hosts":
        settings_content = _get_content(ps, "settings.py")
        if not settings_content:
            return True, ""  # no settings.py found — can't assess
        return ("ALLOWED_HOSTS" in settings_content), "settings.py"

    if check.id == "django_secret_key_env":
        settings_content = _get_content(ps, "settings.py")
        if not settings_content:
            return True, ""
        # Pass if SECRET_KEY is read from env (os.environ / os.getenv / env())
        has_env_read = any(
            kw in settings_content
            for kw in ("os.environ", "os.getenv", "environ.get", "env(", "SECRET_KEY_FROM")
        )
        # Fail if there's a hardcoded assignment (simple heuristic).
        has_hardcoded = "SECRET_KEY = '" in settings_content or 'SECRET_KEY = "' in settings_content
        if has_hardcoded and not has_env_read:
            return False, "settings.py"
        return True, "settings.py"

    return True, ""


# ---------------------------------------------------------------------------
# Main analyze() entry point
# ---------------------------------------------------------------------------


def analyze(ps: ProjectSource) -> dict:
    """Run all readiness checks and return a structured result dict.

    Pure function — no DB writes, no API calls.
    """
    stacks = detect_stack(ps)
    target = detect_target(ps, stacks)

    blocking: list[dict] = []
    warnings: list[dict] = []
    improvements: list[dict] = []
    passed: list[dict] = []
    evidence: list[dict] = []
    score = 100
    recommendations: list[str] = []

    for check in CHECKS:
        # Skip if check applies only to specific stacks and none matched.
        if check.applies_to_stacks and not any(s in stacks for s in check.applies_to_stacks):
            continue

        passes, source = _check_passes(check, ps, stacks)
        item = {"id": check.id, "description": check.description}
        if source:
            item["source"] = source

        if passes:
            passed.append(item)
            if source:
                evidence.append(
                    {
                        "source": source,
                        "line_or_section": check.id,
                        "reason": f"PASS: {check.description}",
                    }
                )
        else:
            score -= check.points
            recommendations.append(check.recommendation)
            fail_item = {**item, "recommendation": check.recommendation}
            if check.category == "blocking":
                blocking.append(fail_item)
            elif check.category == "warning":
                warnings.append(fail_item)
            else:
                improvements.append(fail_item)
            if ps.files_checked:
                evidence.append(
                    {
                        "source": source or ps.files_checked[0],
                        "line_or_section": check.id,
                        "reason": f"FAIL: {check.description}",
                    }
                )

    score = max(0, min(100, score))

    if blocking:
        severity = Severity.HIGH
    elif score < 50:
        severity = Severity.HIGH
    elif score < 80:
        severity = Severity.MEDIUM
    else:
        severity = Severity.LOW

    return {
        "stacks": stacks,
        "target": target,
        "score": score,
        "severity": severity,
        "blocking": blocking,
        "warnings": warnings,
        "improvements": improvements,
        "passed": passed,
        "recommendations": list(dict.fromkeys(recommendations)),
        "evidence": evidence,
    }


def run_for_session(session: DebugSession) -> ReadinessReport:
    """Convenience: load ProjectSource from DB and run analyze (no AI)."""
    ps = load_from_session(session)
    result = analyze(ps)
    pi = session.project_import
    report, _ = ReadinessReport.objects.update_or_create(
        debug_session=session,
        defaults={
            "readiness_score": result["score"],
            "severity": result["severity"],
            "detected_stack": result["stacks"],
            "source_type": pi.source_type,
            "deployment_target": result["target"],
            "blocking_issues_json": result["blocking"],
            "warnings_json": result["warnings"],
            "improvements_json": result["improvements"],
            "passed_checks_json": result["passed"],
            "recommendations_json": result["recommendations"],
            "evidence_json": result["evidence"],
        },
    )
    return report
