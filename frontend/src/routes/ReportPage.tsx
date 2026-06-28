import { Link, useParams } from "react-router-dom";

import { CommandList } from "../components/diagnostics/CommandList";
import { ConfidenceBadge } from "../components/diagnostics/ConfidenceBadge";
import { EvidenceList } from "../components/diagnostics/EvidenceList";
import { FixSteps } from "../components/diagnostics/FixSteps";
import { MissingInformation } from "../components/diagnostics/MissingInformation";
import { RisksList } from "../components/diagnostics/RisksList";
import { SeverityBadge } from "../components/diagnostics/SeverityBadge";
import { UploadedFileList } from "../components/diagnostics/UploadedFileList";
import { VerificationChecklist } from "../components/diagnostics/VerificationChecklist";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { ErrorState } from "../components/ui/ErrorState";
import { LoadingState } from "../components/ui/LoadingState";
import { getReport } from "../api/reports";
import { getSession } from "../api/sessions";
import { useFetch } from "../hooks/useFetch";
import { formatDate } from "../utils/format";

export default function ReportPage() {
  const { reportId } = useParams();

  const { data, loading, error, refetch } = useFetch(async () => {
    const report = await getReport(reportId!);
    const session = await getSession(report.session_id).catch(() => null);
    return { report, session };
  }, [reportId]);

  if (loading) return <LoadingState label="Loading report…" />;
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
  if (!data) return null;

  const { report, session } = data;

  return (
    <div data-route="report" className="report">
      <p className="block__title" style={{ margin: 0 }}>
        <Link to={`/projects/${report.project_id}`} style={{ color: "var(--color-text-faint)" }}>
          ← {report.project_name}
        </Link>
      </p>

      {/* Root cause + signals */}
      <header className="report__hero">
        <span className="eyebrow">
          <span className="glyph glyph--on glyph--sm" />// DIAGNOSIS · MOST LIKELY ROOT CAUSE
        </span>
        <h1 className="report__rootcause">{report.root_cause}</h1>
        <div className="report__signals">
          <SeverityBadge severity={report.severity} />
          <ConfidenceBadge score={report.confidence_score} />
          {report.detected_cloud_provider ? (
            <Badge tone="info">
              <span className="glyph glyph--outline glyph--sm" aria-hidden="true" />
              {report.detected_cloud_provider}
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
          Based on uploaded evidence · PatchPath never reports certainty.
        </p>
      </header>

      {report.explanation ? (
        <Card title="// EXPLANATION">
          <p className="prose" style={{ margin: 0 }}>
            {report.explanation}
          </p>
        </Card>
      ) : null}

      <Card title="// EVIDENCE_TRAIL">
        <EvidenceList evidence={report.evidence_json} />
      </Card>

      <Card title="// RECOMMENDED_FIX">
        <FixSteps recommendedFix={report.recommended_fix} />
      </Card>

      {report.commands_json.length ? (
        <Card title="// COMMANDS_TO_RUN">
          <CommandList commands={report.commands_json} />
        </Card>
      ) : null}

      <Card title="// VERIFICATION_CHECKLIST">
        <VerificationChecklist items={report.verification_checklist_json} />
      </Card>

      <Card title="// MISSING_INFORMATION">
        <MissingInformation items={report.missing_information_json} />
      </Card>

      {report.possible_risks_json.length ? (
        <Card title="// POSSIBLE_RISKS">
          <RisksList risks={report.possible_risks_json} />
        </Card>
      ) : null}

      {session && session.detected_issues.length > 0 ? (
        <Card title="// DETECTED_ISSUES">
          <div className="grid" style={{ gap: "var(--space-3)" }}>
            {session.detected_issues.map((issue) => (
              <div className="issue" key={issue.id}>
                <div className="issue__head">
                  <span className="issue__type">{issue.issue_type}</span>
                  <SeverityBadge severity={issue.severity} />
                </div>
                {issue.matched_pattern ? (
                  <p
                    className="mono"
                    style={{ margin: "8px 0 0", fontSize: 11, color: "var(--color-text-faint)" }}
                  >
                    matched: {issue.matched_pattern}
                  </p>
                ) : null}
                {issue.evidence.length ? (
                  <div style={{ marginTop: "var(--space-3)" }}>
                    <EvidenceList evidence={issue.evidence} />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {session && session.files.length > 0 ? (
        <Card title="// EVIDENCE_FILES">
          <UploadedFileList files={session.files} />
        </Card>
      ) : null}

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
