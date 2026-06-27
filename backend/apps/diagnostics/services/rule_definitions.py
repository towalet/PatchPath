"""
Rule registry for the deterministic detector.

Rules are declared as dataclasses with compiled regexes (compiled once at import).
A rule can inspect file names, content, project stack, and cloud provider.

MVP rule set (see docs/AGENT_PLAN.md §10):
    missing_env_var, missing_database_url, port_binding_issue,
    missing_python_dependency, missing_node_dependency, npm_build_failure,
    cors_error, django_staticfiles_issue, postgres_connection_refused,
    docker_build_failed, wrong_start_command, collectstatic_failed,
    vercel_build_command_issue, render_railway_env_mismatch

TODO: define Rule dataclass + RULES registry.
"""
from __future__ import annotations

# @dataclass(frozen=True)
# class Rule: ...
#
# RULES: list[Rule] = []
