import type { SessionStatus } from "../../types/diagnostics";

/**
 * Shows the analysis as distinct steps: evidence -> rules detected -> AI report.
 * Deterministic detection and AI diagnosis are presented as separate stages so
 * the evidence-first pipeline is visible.
 */
type StepState = "pending" | "active" | "done";

interface AnalysisTimelineProps {
  status: SessionStatus;
  fileCount?: number;
  issueCount?: number;
  hasReport?: boolean;
}

export function AnalysisTimeline({
  status,
  fileCount = 0,
  issueCount = 0,
  hasReport = false,
}: AnalysisTimelineProps) {
  const analyzing = status === "analyzing";
  const finished = status === "completed" || status === "failed";

  const uploadState: StepState = fileCount > 0 || finished || analyzing ? "done" : "active";
  const detectState: StepState = finished ? "done" : analyzing ? "active" : "pending";
  const reportState: StepState =
    status === "completed" && hasReport
      ? "done"
      : status === "failed"
        ? "active"
        : analyzing
          ? "active"
          : "pending";

  const steps: { title: string; desc: string; state: StepState }[] = [
    {
      title: "Evidence collected",
      desc: fileCount > 0 ? `${fileCount} file${fileCount === 1 ? "" : "s"} redacted and stored` : "Awaiting uploads",
      state: uploadState,
    },
    {
      title: "Patterns detected",
      desc:
        detectState === "done"
          ? `${issueCount} deterministic issue${issueCount === 1 ? "" : "s"} matched`
          : "Rule detector runs before the AI",
      state: detectState,
    },
    {
      title: "Diagnosis generated",
      desc:
        status === "failed"
          ? "AI diagnosis unavailable — detected issues preserved"
          : status === "completed"
            ? "Schema-validated report saved"
            : "Evidence-only AI report",
      state: reportState,
    },
  ];

  return (
    <div className="timeline" role="list">
      {steps.map((step, i) => (
        <div className="timeline__step" data-state={step.state} role="listitem" key={i}>
          <span className="timeline__dot" aria-hidden="true">
            <i />
          </span>
          <div className="timeline__body">
            <div className="timeline__title">{step.title}</div>
            <div className="timeline__desc">{step.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
