import { formatConfidence } from "../../utils/format";

/**
 * Confidence indicator with a small bar — PatchPath never displays 100%.
 * Paired with the numeric label so it is legible without color.
 */
export function ConfidenceBadge({ score }: { score: number }) {
  const width = Math.round(Math.min(score, 0.99) * 100);
  return (
    <span data-component="badge" data-tone="neutral" className="sev" title="Diagnosis confidence">
      <span className="lp-bar" style={{ width: 44 }} aria-hidden="true">
        <i style={{ width: `${width}%` }} />
      </span>
      CONF {formatConfidence(score)}
    </span>
  );
}
