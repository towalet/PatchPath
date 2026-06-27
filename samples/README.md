# Sample evidence files

Safe, synthetic deployment artifacts for demos and manual testing. They contain
**no real secrets** — any token-shaped strings are obvious placeholders so you can
also see redaction at work.

| File | Demonstrates |
| --- | --- |
| `render-django-database-url.log` | Django on Render crashing because `DATABASE_URL` is missing |
| `settings-snippet.py` | The config that reads `DATABASE_URL` (corroborating evidence) |
| `env.example.txt` | An `.env.example` showing the expected variable is undocumented/missing |
| `node-missing-dependency.log` | Node app failing with `Cannot find module` |

Use these in the demo flow described in [../docs/DEMO_SCRIPT.md](../docs/DEMO_SCRIPT.md).

> More fixtures (one per detector rule) live under
> `backend/apps/diagnostics/tests/fixtures/` for the test suite.
