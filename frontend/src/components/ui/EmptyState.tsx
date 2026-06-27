import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

/** Shown when a list/page has no data yet (e.g. no projects). */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div data-component="empty-state" role="status">
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {action}
    </div>
  );
}
