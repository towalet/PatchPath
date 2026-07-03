import { Link, useParams } from "react-router-dom";

import { CheckList } from "../components/readiness/CheckList";
import { ReadinessScore } from "../components/readiness/ReadinessScore";
import { ActionPlan } from "../components/readiness/ActionPlan";
import { AiInsightList } from "../components/readiness/AiInsightList";
import { PatchSuggestionCard } from "../components/readiness/PatchSuggestionCard";
import { EvidenceList } from "../components/diagnostics/EvidenceList";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { ErrorState } from "../components/ui/ErrorState";
import { getReadinessReport } from "../api/readiness";
import { useFetch } from "../hooks/useFetch";
import { formatDate } from "../utils/format";

const SOURCE_LABELS: Record<string, string> = {
  github: "GitHub",
  zip: "ZIP Upload",
  folder: "Folder Upload",
};

export default function ReadinessReportPage() {
  const { reportId } = useParams();
  const { data: report, error, refetch } = useFetch(
    () => getReadinessReport(reportId!),
    [reportId],
  );

  if (error)
    return (
      <ErrorState
        message={error.message}
        action={
          <button data-variant="secondary" data-size="sm" onClick={refetch}>
            Retry
          </button>
        }
      />
    );
  if (!report) return null;

  return (
    <div data-route="readiness-report" className="report">
      <p className="block__title" style={{ margin: 0 }}>
        <Link to={`/projects/${report.project_id}`} style={{ color: "var(--color-text-faint)" }}>
          ← {report.project_name}
        </Link>
      </p>

      {/* Hero */}
      <header className="report__hero">
        <span className="eyebrow">
          <span className="glyph glyph--on glyph--sm" />// READINESS · DEPLOYMENT SCAN
        </span>

        <ReadinessScore score={report.readiness_score} severity={report.severity} />

        <div className="report__signals" style={{ marginTop: "var(--space-4)" }}>
          <Badge tone="info">
            <span className="glyph glyph--outline glyph--sm" aria-hidden="true" />
            {SOURCE_LABELS[report.source_type] ?? report.source_type}
          </Badge>
          {report.deployment_target && report.deployment_target !== "unknown" ? (
            <Badge tone="info">
              <span className="glyph glyph--outline glyph--sm" aria-hidden="true" />
              {report.deployment_target}
            </Badge>
          ) : null}
          {report.detected_stack.map((tech) => (
            <Badge key={tech} tone="neutral">
              {tech}
            </Badge>
          ))}
        </div>

        <p
          className="mono"
          style={{ marginTop: "var(--space-5)", fontSize: 12, color: "var(--color-text-faint)" }}
        >
          Deterministic static analysis · {report.ai_used ? "AI summary included" : "No AI key — deterministic only"}.
          PatchPath never executes uploaded code.
        </p>
      </header>

      {/* Blocking issues */}
      <Card title="// BLOCKING_ISSUES">
        <CheckList items={report.blocking_issues_json} category="blocking" />
      </Card>

      {/* Warnings */}
      <Card title="// WARNINGS">
        <CheckList items={report.warnings_json} category="warning" />
      </Card>

      {/* Passed checks */}
      <Card title="// PASSED_CHECKS">
        <CheckList items={report.passed_checks_json} category="passed" />
      </Card>

      {/* Improvements */}
      {report.improvements_json.length ? (
        <Card title="// IMPROVEMENTS">
          <CheckList items={report.improvements_json} category="improvement" />
        </Card>
      ) : null}

      {/* Recommendations */}
      {report.recommendations_json.length ? (
        <Card title="// RECOMMENDATIONS">
          <div className="grid" style={{ gap: "var(--space-3)" }}>
            {report.recommendations_json.map((rec, i) => (
              <div
                key={i}
                style={{
                  borderLeft: "2px solid var(--color-border)",
                  paddingLeft: "var(--space-3)",
                  fontSize: 14,
                }}
              >
                {rec}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {/* Evidence trail */}
      {report.evidence_json.length ? (
        <Card title="// EVIDENCE_TRAIL">
          <EvidenceList evidence={report.evidence_json} />
        </Card>
      ) : null}

      {/* AI summary */}
      {report.ai_used && report.summary ? (
        <Card title="// AI_SUMMARY">
          <p className="prose" style={{ margin: 0 }}>
            {report.summary}
          </p>
          {report.confidence_note ? (
            <p
              className="mono"
              style={{
                margin: "var(--space-3) 0 0",
                fontSize: 11,
                color: "var(--color-text-faint)",
              }}
            >
              ⚠ {report.confidence_note}
            </p>
          ) : null}
        </Card>
      ) : null}

      {/* Action plan */}
      {report.ai_used && report.action_plan_json?.length ? (
        <Card title="// ACTION_PLAN">
          <ActionPlan steps={report.action_plan_json} />
        </Card>
      ) : null}

      {/* AI insights */}
      {report.ai_used && report.ai_insights_json?.length ? (
        <Card title="// AI_INSIGHTS">
          <AiInsightList insights={report.ai_insights_json} />
        </Card>
      ) : null}

      {/* Patch suggestions */}
      {report.ai_used && report.patch_suggestions_json.length ? (
        <Card title="// PATCH_SUGGESTIONS">
          <div className="grid" style={{ gap: "var(--space-4)" }}>
            {report.patch_suggestions_json.map((ps, i) => (
              <PatchSuggestionCard key={i} suggestion={ps} />
            ))}
          </div>
        </Card>
      ) : null}

      {/* Files checked */}
      <Card title="// FILES_CHECKED">
        {report.files_checked?.length ? (
          <div
            className="grid"
            style={{
              gap: "var(--space-1)",
              maxHeight: 240,
              overflowY: "auto",
            }}
          >
            {report.files_checked.map((f: string) => (
              <span key={f} className="mono" style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                {f}
              </span>
            ))}
          </div>
        ) : (
          <p className="mono" style={{ fontSize: 12, color: "var(--color-text-faint)", margin: 0 }}>
            None recorded.
          </p>
        )}
      </Card>

      <p className="lp-footer__note" style={{ textAlign: "center" }}>
        {report.model_name ? `MODEL ${report.model_name} · ` : ""}
        {report.prompt_tokens != null && report.completion_tokens != null
          ? `${report.prompt_tokens + report.completion_tokens} TOKENS · `
          : ""}
        {formatDate(report.created_at)}
      </p>
    </div>
  );
}
