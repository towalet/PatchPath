import { SeverityBadge } from "../diagnostics/SeverityBadge";
import type { AiInsight } from "../../types/readiness";

/**
 * Risks the AI spotted in the code that the deterministic checks did not flag.
 * Styled distinctly from rule-based findings so the two are never confused.
 */
export function AiInsightList({ insights }: { insights: AiInsight[] }) {
  if (!insights.length)
    return (
      <p className="mono" style={{ fontSize: 12, color: "var(--color-text-faint)", margin: 0 }}>
        None.
      </p>
    );

  return (
    <div className="grid" style={{ gap: "var(--space-3)" }}>
      {insights.map((insight, i) => (
        <div
          className="issue"
          key={i}
          style={{ borderLeft: "2px dashed var(--color-border)", paddingLeft: "var(--space-3)" }}
        >
          <div className="issue__head" style={{ flexWrap: "wrap", gap: "var(--space-2)" }}>
            <span className="mono issue__type" style={{ fontSize: 10, color: "var(--color-text-faint)" }}>
              // AI_DISCOVERED — beyond deterministic rules
            </span>
            <SeverityBadge severity={insight.severity} />
          </div>
          <p style={{ margin: "var(--space-2) 0 0", fontSize: 14, fontWeight: 600 }}>{insight.title}</p>
          {insight.detail ? (
            <p style={{ margin: "var(--space-1) 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>
              {insight.detail}
            </p>
          ) : null}
          {insight.file ? (
            <p className="mono" style={{ margin: "var(--space-2) 0 0", fontSize: 11, color: "var(--color-text-faint)" }}>
              {insight.file}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
