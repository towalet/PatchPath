import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

/** Semantic <button> primitive. Styling hooks via data-variant. */
export function Button({ variant = "primary", loading, disabled, children, ...props }: ButtonProps) {
  return (
    <button data-variant={variant} disabled={disabled || loading} {...props}>
      {loading ? "…" : children}
    </button>
  );
}
