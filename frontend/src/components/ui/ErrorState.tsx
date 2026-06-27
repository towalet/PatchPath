import type { ReactNode } from "react";

interface ErrorStateProps {
  title?: string;
  message: string;
  action?: ReactNode;
}

/** Inline error surface for failed loads/actions. */
export function ErrorState({ title = "Something went wrong", message, action }: ErrorStateProps) {
  return (
    <div data-component="error-state" role="alert">
      <h2>{title}</h2>
      <p>{message}</p>
      {action}
    </div>
  );
}
