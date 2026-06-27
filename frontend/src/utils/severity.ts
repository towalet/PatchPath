import type { Severity } from "../types/diagnostics";

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

/** Sort order for displaying issues: high first. */
export const SEVERITY_RANK: Record<Severity, number> = {
  high: 0,
  medium: 1,
  low: 2,
};
