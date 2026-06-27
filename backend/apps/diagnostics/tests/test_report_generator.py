"""Report generator tests with a mocked AI client.

Covers schema validation, retry-on-invalid-JSON, confidence guardrails, and the
failed-session path. Scaffold placeholder — see docs/AGENT_PLAN.md §12 + §17.
"""
import pytest

pytestmark = pytest.mark.django_db


@pytest.mark.skip(reason="scaffold: implement report generator tests (mock AI)")
def test_placeholder():
    ...
