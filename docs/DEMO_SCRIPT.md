# PatchPath Recruiter Demo Script

**Scenario:** a Django app deployed to Render fails because `DATABASE_URL` is missing.

> Prerequisite: `make up` is running and `make seed` has loaded demo data
> (the `seed_demo` command is a scaffold stub today — see AGENT_PLAN §20).

## Walkthrough (~3 minutes)

1. **Open the landing page.** Frame the problem: production failures are noisy and
   deployment-specific; "works on my machine" hides environment gaps.
2. **Log in** as the demo user.
3. **Create a project** named `Django Render API` (stack: Django, PostgreSQL;
   provider: Render).
4. **Start a new analysis.**
5. **Upload evidence:** `render-django-database-url.log`, `.env.example`, and
   `settings-snippet.py` (from [`samples/`](../samples)).
6. **Explain the order of operations:** PatchPath runs deterministic rule
   detection *before* the AI step.
7. **Click Analyze.**
8. **On the report page, point out:**
   - the most-likely root cause, in careful language
   - a confidence score **below 100%**
   - the evidence trail linking log/config snippets to the conclusion
   - the missing-information section (visible uncertainty)
   - the recommended fix, commands, and verification checklist
9. **Return to history** and show the report is saved and revisitable.
10. **Close with the roadmap:** GitHub import, background jobs, shareable reports,
    and optional PR suggestions behind safety controls.

## Talking points (the "why this is good engineering" angle)

- Evidence-first design **reduces hallucination**: the model only ever sees
  redacted, extracted evidence — never raw unbounded logs.
- Output is **schema-validated** (Pydantic) and **confidence is capped** by
  evidence quality; the product never claims certainty.
- Secrets are **redacted before storage and before the model call**.
- Every report **must** include missing information and verification steps.
