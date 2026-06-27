import { useParams } from "react-router-dom";

/**
 * Report page — the centerpiece. Priority order (see AGENT_PLAN §14):
 * root cause, confidence + severity, evidence trail, recommended fix, commands,
 * verification checklist, missing information, possible risks, detected issues,
 * uploaded file summary. Scaffold stub.
 */
export default function ReportPage() {
  const { reportId } = useParams();
  return (
    <main data-route="report">
      <h1>Diagnosis report</h1>
      <p>ID: {reportId}</p>
      {/* TODO: full report composition */}
    </main>
  );
}
