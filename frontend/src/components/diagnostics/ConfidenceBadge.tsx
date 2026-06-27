import { formatConfidence } from "../../utils/format";

/** Confidence indicator — PatchPath never displays 100%. Scaffold stub. */
export function ConfidenceBadge({ score }: { score: number }) {
  return <span data-component="confidence-badge">{formatConfidence(score)} confidence</span>;
}
