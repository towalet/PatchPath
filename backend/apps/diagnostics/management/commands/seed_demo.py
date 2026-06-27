"""
`python manage.py seed_demo`

Seeds a demo user, a sample project, and one fully-diagnosed debug session so the
recruiter demo (docs/DEMO_SCRIPT.md) works on a fresh database.

Scaffold placeholder.
TODO: implement once models + analyze pipeline land.
"""
from __future__ import annotations

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Seed demo data (user, project, diagnosed session)."

    def handle(self, *args, **options) -> None:
        self.stdout.write(
            self.style.WARNING("seed_demo is a scaffold stub — not yet implemented.")
        )
