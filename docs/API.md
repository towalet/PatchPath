# PatchPath API Overview

Base URL: `/api`. All diagnostic endpoints require a `Bearer` JWT and are scoped
to the authenticated owner. Full request/response shapes live in
[AGENT_PLAN.md](AGENT_PLAN.md) §8.

| Method | Path | Auth | Status |
| --- | --- | --- | --- |
| GET | `/api/health/` | none | ✅ implemented |
| POST | `/api/auth/register/` | none | ✅ implemented |
| POST | `/api/auth/login/` | none | ✅ implemented |
| POST | `/api/auth/refresh/` | none | ✅ implemented |
| GET | `/api/auth/me/` | JWT | ✅ implemented |
| GET | `/api/dashboard/` | JWT | 🚧 scaffold |
| GET / POST | `/api/projects/` | JWT | 🚧 scaffold |
| GET | `/api/projects/{id}/` | JWT | 🚧 scaffold |
| POST | `/api/projects/{project_id}/sessions/` | JWT | 🚧 scaffold |
| GET | `/api/sessions/{id}/` | JWT | 🚧 scaffold |
| POST | `/api/sessions/{id}/upload/` | JWT | 🚧 scaffold |
| POST | `/api/sessions/{id}/analyze/` | JWT | 🚧 scaffold |
| GET | `/api/reports/{id}/` | JWT | 🚧 scaffold |

## Throttling scopes

Configured in `config/settings/base.py` (`DEFAULT_THROTTLE_RATES`):

- `auth` — 10/min (register, login, refresh)
- `upload` — 30/hour
- `analyze` — 20/hour
- plus DRF defaults `anon` (60/hour) and `user` (2000/day)

## Auth example

```bash
# Register
curl -X POST http://localhost:8000/api/auth/register/ \
  -H 'Content-Type: application/json' \
  -d '{"email":"dev@example.com","name":"Dev","password":"a-strong-password"}'

# Use the returned access token
curl http://localhost:8000/api/auth/me/ \
  -H 'Authorization: Bearer <access-token>'
```
