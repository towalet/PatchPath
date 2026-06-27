# Excerpt from config/settings/production.py — corroborating config evidence.
import os

import dj_database_url

# This line raises KeyError at startup when DATABASE_URL is not set in the
# Render service environment.
DATABASES = {
    "default": dj_database_url.parse(os.environ["DATABASE_URL"]),
}

ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "").split(",")
DEBUG = False
