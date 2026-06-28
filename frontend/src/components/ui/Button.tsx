import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Render the small leading "pixel" square (primary CTAs). */
  dot?: boolean;
}

/** Semantic <button> primitive. Styling hooks via data-variant / data-size. */
export function Button({
  variant = "primary",
  size = "md",
  loading,
  disabled,
  dot,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      data-variant={variant}
      data-size={size}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {dot && !loading ? <span className="btn__dot" aria-hidden="true" /> : null}
      {loading ? "…" : children}
    </button>
  );
}
