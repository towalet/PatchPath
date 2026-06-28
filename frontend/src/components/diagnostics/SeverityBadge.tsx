import { Badge } from "../ui/Badge";
import type { Severity } from "../../types/diagnostics";
import { severityGlyphClass, severityLabel, severityTone } from "../../utils/severity";

/** Severity chip: glyph + uppercase label + tone (never color-only). */
export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <Badge tone={severityTone(severity)}>
      <span className={severityGlyphClass(severity)} aria-hidden="true" />
      {severityLabel(severity)}
    </Badge>
  );
}
