import type { TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
}

/** Labelled textarea sharing the Input styling + accessible error association. */
export function Textarea({ label, error, hint, id, ...props }: TextareaProps) {
  const fieldId = id ?? props.name;
  const errorId = error ? `${fieldId}-error` : undefined;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  return (
    <div data-component="input">
      <label htmlFor={fieldId}>{label}</label>
      <textarea
        id={fieldId}
        aria-invalid={!!error}
        aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}
        {...props}
      />
      {hint && !error ? (
        <p id={hintId} className="mono" style={{ margin: 0, fontSize: 12, color: "var(--color-text-faint)" }}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
