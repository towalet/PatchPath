import { Link, useParams } from "react-router-dom";

import { EvidenceList } from "../components/diagnostics/EvidenceList";
import { SeverityBadge } from "../components/diagnostics/SeverityBadge";
import { StatusBadge } from "../components/diagnostics/StatusBadge";
import { UploadedFileList } from "../components/diagnostics/UploadedFileList";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { LoadingState } from "../components/ui/LoadingState";
import { getSession } from "../api/sessions";
import { useFetch } from "../hooks/useFetch";
import { formatDate } from "../utils/format";

export default function SessionDetailPage() {
  const { sessionId } = useParams();
  const { data: session, loading, error, refetch } = useFetch(
    () => getSession(sessionId!),
    [sessionId],
  );

  if (loading) return <LoadingState label="Loading session..." />;

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

  if (!session) return null;

  const reportLink = session.report
    ? `/reports/${session.report.id}`
    : session.readiness_report_id
      ? `/readiness-reports/${session.readiness_report_id}`
      : null;

  return (
    <div data-route="session-detail" className="report">
      <p className="block__title" style={{ margin: 0 }}>
        <Link to={`/projects/${session.project_id}`} style={{ color: "var(--color-text-faint)" }}>
          &lt;- {session.project_name}
        </Link>
      </p>

      <header className="report__hero">
        <span className="eyebrow">
          <span className="glyph glyph--on glyph--sm" />// SESSION
        </span>
        <h1 className="report__rootcause">{session.error_summary || "Untitled session"}</h1>
        <div className="report__signals">
          <StatusBadge status={session.status} />
          <Badge tone="info">{session.kind === "readiness" ? "Readiness scan" : "Diagnosis"}</Badge>
          <Badge tone="neutral">{formatDate(session.created_at)}</Badge>
        </div>
        {session.failure_reason ? (
          <p className="prose" style={{ marginTop: "var(--space-5)" }}>
            {session.failure_reason}
          </p>
        ) : null}
      </header>

      {reportLink ? (
        <Card title="// RESULT">
          <Link to={reportLink} data-variant="primary" data-size="md">
            <span className="btn__dot" aria-hidden="true" />
            Open result
          </Link>
        </Card>
      ) : (
        <EmptyState
          title="No report yet"
          description={
            session.status === "failed"
              ? "This session stopped before a report was created."
              : "This session has not produced a report yet."
          }
        />
      )}

      {session.detected_issues.length ? (
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

      {session.files.length ? (
        <Card title="// EVIDENCE_FILES">
          <UploadedFileList files={session.files} />
        </Card>
      ) : null}
    </div>
  );
}
