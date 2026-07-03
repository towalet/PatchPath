"""
Declarative readiness checks — analogous to rule_definitions.py for diagnostics.

Each Check describes one deployment-readiness requirement. The analyzer walks
all CHECKS against a ProjectSource and accumulates score deductions + evidence.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Check:
    id: str
    category: str  # "blocking" | "warning" | "improvement"
    points: int  # score deducted when the check fails
    description: str
    recommendation: str
    # If non-empty, check only applies to these detected stacks.
    applies_to_stacks: tuple[str, ...] = field(default_factory=tuple)


# ---------------------------------------------------------------------------
# Stack detection fingerprints
# ---------------------------------------------------------------------------

# Maps a stack label to a list of (relpath_contains, content_contains) tuples.
# A match on ANY tuple in the list identifies the stack.
STACK_SIGNATURES: dict[str, list[tuple[str, str]]] = {
    "Next.js": [
        ("package.json", '"next"'),
        ("next.config.", ""),
    ],
    "React/Vite": [
        ("vite.config.", ""),
        ("package.json", '"vite"'),
        ("package.json", '"react"'),
    ],
    "Node/Express": [
        ("package.json", '"express"'),
        ("server.js", ""),
        ("app.js", "express"),
    ],
    "Django": [
        ("manage.py", "django"),
        ("wsgi.py", "django"),
        ("requirements.txt", "django"),
        ("pyproject.toml", "django"),
    ],
    "FastAPI": [
        ("requirements.txt", "fastapi"),
        ("pyproject.toml", "fastapi"),
        ("main.py", "fastapi"),
        ("app.py", "fastapi"),
    ],
    "Docker": [
        ("Dockerfile", ""),
        ("docker-compose.", ""),
    ],
}

# ---------------------------------------------------------------------------
# Deployment target fingerprints
# ---------------------------------------------------------------------------

TARGET_SIGNATURES: list[tuple[str, str]] = [
    ("vercel.json", "vercel"),
    ("render.yaml", "render"),
    ("railway.json", "railway"),
    ("railway.toml", "railway"),
    ("fly.toml", "fly"),
    ("netlify.toml", "netlify"),
    ("app.json", "heroku"),
    ("Procfile", "heroku"),
    ("Dockerfile", "docker"),
    ("docker-compose.yml", "docker"),
    ("docker-compose.yaml", "docker"),
]

# ---------------------------------------------------------------------------
# Check registry
# ---------------------------------------------------------------------------

CHECKS: tuple[Check, ...] = (
    # --- Universal blocking checks ---
    Check(
        id="has_readme",
        category="warning",
        points=5,
        description="No README.md found.",
        recommendation="Add a README.md with setup and deployment instructions.",
    ),
    Check(
        id="has_env_example",
        category="warning",
        points=10,
        description="No .env.example (or .env.sample / .env.template) found.",
        recommendation=(
            "Add a .env.example listing all required environment variables "
            "so deployers know what to configure."
        ),
    ),
    Check(
        id="has_dockerfile_or_target",
        category="blocking",
        points=25,
        description="No Dockerfile, docker-compose.yml, or platform config found.",
        recommendation=(
            "Add a Dockerfile or a platform config (vercel.json, render.yaml, "
            "railway.json, Procfile, fly.toml) so the deployment target is clear."
        ),
    ),
    Check(
        id="has_ci",
        category="improvement",
        points=10,
        description="No CI/CD workflow found in .github/workflows/.",
        recommendation=("Add a GitHub Actions workflow for automated testing and deployment."),
    ),
    # --- Docker checks ---
    Check(
        id="dockerfile_healthcheck",
        category="warning",
        points=10,
        description="Dockerfile has no HEALTHCHECK instruction.",
        recommendation=(
            "Add a HEALTHCHECK to your Dockerfile so the container platform "
            "can detect unhealthy containers and restart them."
        ),
        applies_to_stacks=("Docker",),
    ),
    Check(
        id="dockerfile_nonroot_user",
        category="warning",
        points=10,
        description="Dockerfile does not set a non-root USER.",
        recommendation=("Add USER <non-root> to your Dockerfile for improved security."),
        applies_to_stacks=("Docker",),
    ),
    Check(
        id="compose_has_depends_on",
        category="improvement",
        points=5,
        description="docker-compose.yml has multiple services but no depends_on.",
        recommendation=("Add depends_on to control service startup order."),
        applies_to_stacks=("Docker",),
    ),
    # --- Node/React/Next checks ---
    Check(
        id="node_has_start_script",
        category="blocking",
        points=20,
        description='package.json has no "start" script.',
        recommendation=(
            'Add a "start" script to package.json (e.g. "node server.js" or '
            '"next start") so the platform knows how to run your app.'
        ),
        applies_to_stacks=("Node/Express", "Next.js", "React/Vite"),
    ),
    Check(
        id="node_has_build_script",
        category="warning",
        points=10,
        description='package.json has no "build" script.',
        recommendation='Add a "build" script to package.json.',
        applies_to_stacks=("Next.js", "React/Vite"),
    ),
    Check(
        id="node_engine_specified",
        category="improvement",
        points=5,
        description='package.json does not specify an "engines" field.',
        recommendation=('Add an "engines" field to package.json to pin the Node.js version.'),
        applies_to_stacks=("Node/Express", "Next.js", "React/Vite"),
    ),
    # --- Python checks ---
    Check(
        id="python_has_requirements",
        category="blocking",
        points=20,
        description="No requirements.txt or pyproject.toml found.",
        recommendation=(
            "Add a requirements.txt (or pyproject.toml with dependencies) so "
            "the platform can install Python dependencies."
        ),
        applies_to_stacks=("Django", "FastAPI"),
    ),
    Check(
        id="django_has_procfile_or_wsgi",
        category="blocking",
        points=20,
        description="Django project has no Procfile and no WSGI/ASGI entry point configured.",
        recommendation=(
            "Add a Procfile with a web process (e.g. gunicorn myapp.wsgi) or "
            "ensure wsgi.py/asgi.py is present."
        ),
        applies_to_stacks=("Django",),
    ),
    Check(
        id="fastapi_has_procfile_or_main",
        category="blocking",
        points=20,
        description="FastAPI project has no Procfile and no main.py/app.py entry point.",
        recommendation=(
            "Add a Procfile (e.g. web: uvicorn main:app --host 0.0.0.0 --port $PORT) "
            "or ensure main.py/app.py exists."
        ),
        applies_to_stacks=("FastAPI",),
    ),
    Check(
        id="django_allowed_hosts",
        category="blocking",
        points=15,
        description="settings.py does not set ALLOWED_HOSTS (or uses DEBUG=True only).",
        recommendation=(
            "Set ALLOWED_HOSTS in your Django settings for production "
            "(e.g. via an environment variable)."
        ),
        applies_to_stacks=("Django",),
    ),
    Check(
        id="django_secret_key_env",
        category="blocking",
        points=15,
        description="Django SECRET_KEY appears to be hardcoded, not read from an environment variable.",
        recommendation=("Read SECRET_KEY from os.environ or a .env file in production settings."),
        applies_to_stacks=("Django",),
    ),
)
