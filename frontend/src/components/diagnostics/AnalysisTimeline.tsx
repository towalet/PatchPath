import type { SessionStatus } from "../../types/diagnostics";

/**
 * Shows the analysis as distinct steps: uploaded -> rules detected -> AI report.
 * Deterministic detection and AI diagnosis are presented separately. Scaffold stub.
 */
export function AnalysisTimeline(_props: { status: SessionStatus }) {
  return <ol data-component="analysis-timeline">{/* TODO: timeline steps */}</ol>;
}
