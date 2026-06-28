import { Badge } from "../ui/Badge";
import type { SessionStatus } from "../../types/diagnostics";
import { statusGlyphClass, statusLabel, statusTone } from "../../utils/severity";

/** Session status chip: glyph + uppercase label + tone (never color-only). */
export function StatusBadge({ status }: { status: SessionStatus }) {
  return (
    <Badge tone={statusTone(status)}>
      <span className={statusGlyphClass(status)} aria-hidden="true" />
      {statusLabel(status)}
    </Badge>
  );
}
