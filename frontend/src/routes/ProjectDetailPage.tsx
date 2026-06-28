import { Link, useParams } from "react-router-dom";

import { SessionRow } from "../components/diagnostics/rows";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { LoadingState } from "../components/ui/LoadingState";
import { getProject } from "../api/projects";
import { useFetch } from "../hooks/useFetch";

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const { data: project, loading, error, refetch } = useFetch(
    () => getProject(projectId!),
    [projectId],
  );

  return (
    <div data-route="project-detail">
      <p className="block__title" style={{ marginBottom: "var(--space-4)" }}>
        <Link to="/projects" style={{ color: "var(--color-text-faint)" }}>
          ← Projects
        </Link>
      </p>

      {loading ? <LoadingState label="Loading project…" /> : null}
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

      {project ? (
        <>
          <header className="page-head">
            <div>
              <span className="eyebrow">
                <span className="glyph glyph--on glyph--sm" />// PROJECT
              </span>
              <h1 className="page-head__title">{project.name}</h1>
              <p className="page-head__sub">
                {[project.stack, project.cloud_provider].filter(Boolean).join("  ·  ") ||
                  "No stack metadata"}
              </p>
            </div>
            <Link to={`/projects/${project.id}/new`} data-variant="primary" data-size="md">
              <span className="btn__dot" aria-hidden="true" />
              New analysis
            </Link>
          </header>

          <h2 className="block__title">
            <span className="glyph glyph--muted glyph--sm" />// SESSIONS
          </h2>

          {project.recent_sessions.length ? (
            <div className="rows">
              {project.recent_sessions.map((s) => (
                <SessionRow key={s.id} session={s} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No analyses yet"
              description="Upload deployment evidence and run your first diagnosis for this project."
              action={
                <Link to={`/projects/${project.id}/new`} data-variant="primary" data-size="md">
                  <span className="btn__dot" aria-hidden="true" />
                  Start an analysis
                </Link>
              }
            />
          )}
        </>
      ) : null}
    </div>
  );
}
