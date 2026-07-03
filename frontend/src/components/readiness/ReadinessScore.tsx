import { SeverityBadge } from "../diagnostics/SeverityBadge";

interface ReadinessScoreProps {
  score: number;
  severity: "high" | "medium" | "low";
}

function scoreColor(score: number): string {
  if (score >= 80) return "var(--color-text-strong)";
  if (score >= 50) return "var(--color-text-muted)";
  return "var(--color-text-faint)";
}

export function ReadinessScore({ score, severity }: ReadinessScoreProps) {
  return (
    <div
      style={{ display: "flex", alignItems: "baseline", gap: "var(--space-4)", flexWrap: "wrap" }}
    >
      <span
        className="mono"
        style={{
          fontSize: 64,
          fontWeight: 700,
          lineHeight: 1,
          color: scoreColor(score),
          letterSpacing: "-0.04em",
        }}
      >
        {score}
        <span style={{ fontSize: 28, fontWeight: 400, opacity: 0.5 }}>/100</span>
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        <span className="mono" style={{ fontSize: 11, color: "var(--color-text-faint)" }}>
          READINESS SCORE
        </span>
        <SeverityBadge severity={severity} />
      </div>
    </div>
  );
}
