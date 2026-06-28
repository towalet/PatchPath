import type { Severity, SessionStatus } from "../types/diagnostics";

type BadgeTone = "neutral" | "info" | "warning" | "success" | "danger";

/** Severity -> CSS variable. Always pair with a text label (no color-only UI). */
export function severityColor(severity: Severity): string {
  switch (severity) {
    case "high":
      return "var(--severity-high)";
    case "medium":
      return "var(--severity-medium)";
    default:
      return "var(--severity-low)";
  }
}

export function severityLabel(severity: Severity): string {
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}

/** Badge tone for a severity (monochrome — paired with label + glyph). */
export function severityTone(severity: Severity): BadgeTone {
  switch (severity) {
    case "high":
      return "danger";
    case "medium":
      return "warning";
    default:
      return "info";
  }
}

/** Distinct glyph per severity so it never reads by brightness alone. */
export function severityGlyphClass(severity: Severity): string {
  switch (severity) {
    case "high":
      return "glyph glyph--on";
    case "medium":
      return "glyph glyph--outline-bright";
    default:
      return "glyph glyph--outline";
  }
}

/** Sort order for displaying issues: high first. */
export const SEVERITY_RANK: Record<Severity, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function statusLabel(status: SessionStatus): string {
  return status.toUpperCase();
}

export function statusTone(status: SessionStatus): BadgeTone {
  switch (status) {
    case "completed":
      return "success";
    case "failed":
      return "danger";
    case "analyzing":
      return "warning";
    default:
      return "neutral";
  }
}

export function statusGlyphClass(status: SessionStatus): string {
  switch (status) {
    case "completed":
      return "glyph glyph--on";
    case "failed":
      return "glyph glyph--outline-bright";
    case "analyzing":
      return "glyph glyph--muted";
    default:
      return "glyph glyph--dim";
  }
}
