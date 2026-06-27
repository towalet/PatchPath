import type { Severity } from "../../types/diagnostics";
import { severityColor, severityLabel } from "../../utils/severity";

/** Severity pill with text label (not color-only). Scaffold stub. */
export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span data-component="severity-badge" style={{ color: severityColor(severity) }}>
      {severityLabel(severity)}
    </span>
  );
}
