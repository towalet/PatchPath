import { useMemo, useState } from "react";

import { SessionRow } from "../components/diagnostics/rows";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { listProjects } from "../api/projects";
import { listProjectSessions } from "../api/sessions";
import { useFetch } from "../hooks/useFetch";
import type { DebugSessionSummary, SessionStatus } from "../types/diagnostics";

const STATUSES: (SessionStatus | "")[] = ["", "completed", "failed", "analyzing", "pending"];

export default function SessionHistoryPage() {
  const { data, error, refetch } = useFetch<DebugSessionSummary[]>(async () => {
    const projects = await listProjects();
    const lists = await Promise.all(projects.map((p) => listProjectSessions(p.id)));
    return lists
      .flat()
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }, []);

  const [projectFilter, setProjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<SessionStatus | "">("");

  const projects = useMemo(() => {
    const map = new Map<string, string>();
    (data ?? []).forEach((s) => map.set(s.project_id, s.project_name));
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [data]);

  const filtered = (data ?? []).filter(
    (s) =>
      (!projectFilter || s.project_id === projectFilter) &&
      (!statusFilter || s.status === statusFilter),
  );

  return (
    <div data-route="history">
      <header className="page-head">
        <div>
          <span className="eyebrow">
            <span className="glyph glyph--outline glyph--sm" />// HISTORY
          </span>
          <h1 className="page-head__title">Session history</h1>
          <p className="page-head__sub">Every diagnosis you've run, newest first.</p>
        </div>
      </header>

      {error ? (
        <ErrorState
          message={error.message}
          action={
            <button data-variant="secondary" data-size="sm" onClick={refetch}>
              Retry
            </button>
          }
        />
      ) : null}

      {data ? (
        <>
          <div className="toolbar">
            <select
              className="select"
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              aria-label="Filter by project"
            >
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              className="select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as SessionStatus | "")}
              aria-label="Filter by status"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s ? s.toUpperCase() : "All statuses"}
                </option>
              ))}
            </select>
          </div>

          {filtered.length ? (
            <div className="rows">
              {filtered.map((s) => (
                <SessionRow key={s.id} session={s} />
              ))}
            </div>
          ) : (
            <EmptyState
              title={data.length ? "No matching sessions" : "No sessions yet"}
              description={
                data.length
                  ? "Try a different project or status filter."
                  : "Run an analysis from a project to start building history."
              }
            />
          )}
        </>
      ) : null}
    </div>
  );
}
