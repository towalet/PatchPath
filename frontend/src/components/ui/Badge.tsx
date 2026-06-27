import type { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  tone?: "neutral" | "info" | "warning" | "success" | "danger";
}

/** Small status pill. Tone is paired with text — never color-only. */
export function Badge({ children, tone = "neutral" }: BadgeProps) {
  return (
    <span data-component="badge" data-tone={tone}>
      {children}
    </span>
  );
}
