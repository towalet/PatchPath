interface LoadingStateProps {
  label?: string;
}

/** Accessible loading indicator. */
export function LoadingState({ label = "Loading…" }: LoadingStateProps) {
  return (
    <div data-component="loading-state" role="status" aria-live="polite">
      {label}
    </div>
  );
}
