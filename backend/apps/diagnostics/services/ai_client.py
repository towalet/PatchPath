"""
OpenAI-compatible AI client wrapper.

Thin boundary around the model call so the rest of the app (and tests) can mock a
single seam. Reads config from settings.PATCHPATH_AI.

Responsibilities:
    - Build system + user prompts (see docs/AGENT_PLAN.md §13)
    - Request structured JSON output
    - Return raw text + token usage; parsing/validation happens in report_generator
    - Raise a typed error on transport/timeout failures

TODO: implement generate(system_prompt, user_prompt) -> AIResult.
"""
from __future__ import annotations

# class AIClientError(Exception): ...
# class AIClient: ...
