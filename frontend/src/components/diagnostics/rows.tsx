import { Link } from "react-router-dom";

import type { DebugSessionSummary, DiagnosisReportSummary } from "../../types/diagnostics";
import { formatDate } from "../../utils/format";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { SeverityBadge } from "./SeverityBadge";
import { StatusBadge } from "./StatusBadge";

/** A debug-session row linking to its report (or project when none exists). */
export function SessionRow({ session }: { session: DebugSessionSummary }) {
  const to = session.report_id
    ? `/reports/${session.report_id}`
    : `/projects/${session.project_id}`;
  return (
    <Link to={to} className="row">
      <div className="row__main">
        <span className="row__title">{session.error_summary || "Untitled session"}</span>
        <span className="row__sub">
          {session.project_name} · {formatDate(session.created_at)}
        </span>
      </div>
      <div className="row__aside">
        <StatusBadge status={session.status} />
      </div>
    </Link>
  );
}

/** A diagnosis-report row linking to the full report. */
export function ReportRow({ report }: { report: DiagnosisReportSummary }) {
  return (
    <Link to={`/reports/${report.id}`} className="row">
      <div className="row__main">
        <span className="row__title">{report.root_cause}</span>
        <span className="row__sub">
          {report.project_name} · {formatDate(report.created_at)}
        </span>
      </div>
      <div className="row__aside">
        <ConfidenceBadge score={report.confidence_score} />
        <SeverityBadge severity={report.severity} />
      </div>
    </Link>
  );
}
