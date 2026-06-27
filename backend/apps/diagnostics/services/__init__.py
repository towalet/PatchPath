"""
Diagnostics service layer.

The analysis pipeline runs in this order (see docs/AGENT_PLAN.md §12):

    file_parser  -> redaction -> rule_detector -> evidence_builder
                 -> report_generator (ai_client + report_schema)

Views stay thin and call into these modules. Each module is a scaffolded stub
to be implemented feature-by-feature.
"""
