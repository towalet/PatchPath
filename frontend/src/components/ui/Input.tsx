import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

/** Labelled text input with accessible error association. */
export function Input({ label, error, id, ...props }: InputProps) {
  const inputId = id ?? props.name;
  const errorId = error ? `${inputId}-error` : undefined;
  return (
    <div data-component="input">
      <label htmlFor={inputId}>{label}</label>
      <input id={inputId} aria-invalid={!!error} aria-describedby={errorId} {...props} />
      {error ? (
        <p id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
