import { Badge } from "../ui/Badge";
import { SeverityBadge } from "../diagnostics/SeverityBadge";
import type { PatchSuggestion } from "../../types/readiness";

function CodeBlock({ label, code }: { label: string; code: string }) {
  return (
    <div style={{ marginTop: "var(--space-2)" }}>
      <span className="mono" style={{ fontSize: 10, color: "var(--color-text-faint)" }}>
        {label}
      </span>
      <pre
        className="mono"
        style={{
          margin: "var(--space-1) 0 0",
          padding: "var(--space-3)",
          fontSize: 12,
          background: "var(--color-surface-sunken, var(--color-bg))",
          border: "1px solid var(--color-border)",
          borderRadius: 4,
          overflowX: "auto",
          whiteSpace: "pre",
        }}
      >
        {code}
      </pre>
    </div>
  );
}

/** A single AI patch suggestion with concrete before/after code. */
export function PatchSuggestionCard({ suggestion }: { suggestion: PatchSuggestion }) {
  const action = suggestion.action ?? "modify";
  const proposed = suggestion.proposed_change ?? suggestion.change ?? "";

  return (
    <div className="issue">
      <div className="issue__head" style={{ flexWrap: "wrap", gap: "var(--space-2)" }}>
        <span className="mono issue__type" style={{ fontSize: 11 }}>
          {suggestion.file}
        </span>
        <Badge tone={action === "create" ? "success" : "info"}>
          {action === "create" ? "CREATE" : "MODIFY"}
        </Badge>
        {suggestion.severity ? <SeverityBadge severity={suggestion.severity} /> : null}
        {suggestion.effort ? <Badge tone="neutral">{`EFFORT ${suggestion.effort.toUpperCase()}`}</Badge> : null}
      </div>

      {suggestion.title ? (
        <p style={{ margin: "var(--space-2) 0 0", fontSize: 14, fontWeight: 600 }}>{suggestion.title}</p>
      ) : null}
      {suggestion.reason ? (
        <p style={{ margin: "var(--space-1) 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>
          {suggestion.reason}
        </p>
      ) : null}

      {suggestion.current_snippet ? <CodeBlock label="CURRENT" code={suggestion.current_snippet} /> : null}
      {proposed ? <CodeBlock label="PROPOSED" code={proposed} /> : null}
    </div>
  );
}
