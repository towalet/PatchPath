interface LoadingStateProps {
  label?: string;
  fullscreen?: boolean;
}

/** Accessible loading indicator with a pixel-line progress treatment. */
export function LoadingState({ label = "Loading...", fullscreen = false }: LoadingStateProps) {
  return (
    <div
      data-component="loading-state"
      data-layout={fullscreen ? "screen" : "inline"}
      role="status"
      aria-live="polite"
    >
      <span className="loading-state__label">{label}</span>
      <span className="loading-state__line" aria-hidden="true" />
    </div>
  );
}
