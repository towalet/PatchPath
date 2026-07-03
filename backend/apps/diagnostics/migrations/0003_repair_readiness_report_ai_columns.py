# Generated manually to repair databases where 0002_readiness was applied before
# the richer AI report fields were added to that migration.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("diagnostics", "0002_readiness"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            ALTER TABLE diagnostics_readiness_report
                ADD COLUMN IF NOT EXISTS action_plan_json jsonb NOT NULL DEFAULT '[]'::jsonb,
                ADD COLUMN IF NOT EXISTS ai_insights_json jsonb NOT NULL DEFAULT '[]'::jsonb,
                ADD COLUMN IF NOT EXISTS confidence_note text NOT NULL DEFAULT '';
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
