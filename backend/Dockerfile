# ---------------------------------------------------------------------------
# PatchPath backend image (multi-stage).
#   - base:  shared python runtime + dependencies
#   - dev:   runserver with hot reload (used by docker-compose)
#   - prod:  gunicorn, non-root, collected static
# ---------------------------------------------------------------------------
FROM python:3.12-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# System deps: libpq for psycopg, curl for healthchecks.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# --- Development stage ------------------------------------------------------
FROM base AS dev
ENV DJANGO_SETTINGS_MODULE=config.settings.development
COPY . .
EXPOSE 8000
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

# --- Production stage -------------------------------------------------------
FROM base AS prod
ENV DJANGO_SETTINGS_MODULE=config.settings.production

# Run as an unprivileged user.
RUN groupadd --system app && useradd --system --gid app --no-create-home app

COPY . .

# Collect static assets at build time (WhiteNoise serves them).
RUN DJANGO_SECRET_KEY=build-only DJANGO_ALLOWED_HOSTS=localhost \
    OPENAI_API_KEY=build-only \
    python manage.py collectstatic --noinput

USER app
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS http://localhost:8000/api/health/ || exit 1

CMD ["gunicorn", "config.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "3", \
     "--timeout", "60", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
