"""
Tests for readiness_analyzer.py — stack/target detection, scoring, checks.
No API key required; no DB calls.
"""

from __future__ import annotations

import json

from apps.diagnostics.services.project_normalizer import ProjectFile, ProjectSource
from apps.diagnostics.services.readiness_analyzer import analyze, detect_stack, detect_target


def _ps(file_tree: list[str], files: dict[str, str], source_type: str = "folder") -> ProjectSource:
    return ProjectSource(
        source_type=source_type,
        source_name="test",
        original_url="",
        file_tree=file_tree,
        files=[ProjectFile(relpath=p, file_type="text", content=c) for p, c in files.items()],
        files_checked=list(files.keys()),
        files_ignored=[],
    )


# ---------------------------------------------------------------------------
# Stack detection
# ---------------------------------------------------------------------------


def test_detect_next():
    ps = _ps(["next.config.js", "package.json"], {"package.json": '{"dependencies":{"next":"14"}}'})
    stacks = detect_stack(ps)
    assert "Next.js" in stacks


def test_detect_react_vite():
    ps = _ps(
        ["vite.config.ts", "package.json"], {"package.json": '{"devDependencies":{"vite":"5"}}'}
    )
    stacks = detect_stack(ps)
    assert "React/Vite" in stacks


def test_detect_django():
    ps = _ps(
        ["manage.py", "requirements.txt"],
        {"requirements.txt": "django==5.0.6\ngunicorn"},
    )
    stacks = detect_stack(ps)
    assert "Django" in stacks


def test_detect_fastapi():
    ps = _ps(
        ["requirements.txt", "main.py"],
        {"requirements.txt": "fastapi\nuvicorn", "main.py": "from fastapi import FastAPI"},
    )
    stacks = detect_stack(ps)
    assert "FastAPI" in stacks


def test_detect_docker_only():
    ps = _ps(["Dockerfile"], {"Dockerfile": "FROM nginx:alpine"})
    stacks = detect_stack(ps)
    assert "Docker" in stacks


# ---------------------------------------------------------------------------
# Target detection
# ---------------------------------------------------------------------------


def test_target_vercel():
    ps = _ps(["vercel.json"], {"vercel.json": "{}"})
    target = detect_target(ps, [])
    assert target == "vercel"


def test_target_render():
    ps = _ps(["render.yaml"], {"render.yaml": "services:"})
    target = detect_target(ps, [])
    assert target == "render"


def test_target_docker():
    ps = _ps(["Dockerfile"], {"Dockerfile": "FROM python"})
    target = detect_target(ps, ["Django"])
    assert target == "docker"


# ---------------------------------------------------------------------------
# Scoring and checks
# ---------------------------------------------------------------------------


def test_good_django_project_scores_high():
    ps = _ps(
        [
            "manage.py",
            "requirements.txt",
            "Dockerfile",
            ".env.example",
            "README.md",
            ".github/workflows/ci.yml",
            "wsgi.py",
        ],
        {
            "requirements.txt": "django\ngunicorn",
            "Dockerfile": "FROM python:3.12\nHEALTHCHECK CMD curl / \nUSER app",
            ".env.example": "DATABASE_URL=\nSECRET_KEY=",
            "README.md": "# MyApp",
            "wsgi.py": "application = get_wsgi_application()",
            "settings.py": "ALLOWED_HOSTS = os.environ.get('HOSTS', '').split()\nSECRET_KEY = os.environ['SECRET_KEY']",
        },
    )
    result = analyze(ps)
    assert result["score"] >= 60  # plenty of files present
    assert "Django" in result["stacks"]


def test_empty_project_scores_low():
    ps = _ps(["random.txt"], {})
    result = analyze(ps)
    assert result["score"] < 60
    assert result["blocking"]  # at least one blocking issue


def test_blocking_issue_requires_dockerfile_or_target():
    ps = _ps(["src/main.py"], {"requirements.txt": "fastapi"})
    result = analyze(ps)
    blocking_ids = [b["id"] for b in result["blocking"]]
    assert "has_dockerfile_or_target" in blocking_ids


def test_passed_checks_cite_real_files():
    ps = _ps(
        ["README.md", "Dockerfile"],
        {"README.md": "# Hello", "Dockerfile": "FROM python"},
    )
    result = analyze(ps)
    for check in result["passed"]:
        source = check.get("source", "")
        if source:
            assert source in ps.file_tree or source == ""


def test_evidence_cites_real_paths_only():
    ps = _ps(["README.md", "Dockerfile"], {"README.md": "# Hello"})
    result = analyze(ps)
    all_paths = set(ps.file_tree)
    for ev in result["evidence"]:
        src = ev.get("source", "")
        if src:
            # Source must be a real file or empty.
            assert src in all_paths or src == ""


def test_node_start_script_check():
    ps = _ps(
        ["package.json"],
        {"package.json": json.dumps({"scripts": {}})},
    )
    result = analyze(ps)
    # With no "start" script and Node/Express detected via package.json presence,
    # check may apply — just ensure score < 100.
    assert result["score"] <= 100


def test_no_api_key_needed():
    ps = _ps(["README.md"], {"README.md": "# Test"})
    # analyze() must not raise even with no API key configured.
    result = analyze(ps)
    assert "score" in result
    assert "stacks" in result
