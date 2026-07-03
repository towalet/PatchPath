import { Link, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";

import { SessionRow } from "../components/diagnostics/rows";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { LoadingState } from "../components/ui/LoadingState";
import { deleteProject, getProject } from "../api/projects";
import { useFetch } from "../hooks/useFetch";
import type { ApiError } from "../types/api";

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { data: project, loading, error, refetch } = useFetch(
    () => getProject(projectId!),
    [projectId],
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<ApiError | null>(null);

  const handleDeleteProject = async () => {
    if (!project) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteProject(project.id);
      navigate("/projects");
    } catch (err) {
      setDeleteError(err as ApiError);
      setDeleting(false);
    }
  };

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
            <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
              <Link to="/scan" data-variant="primary" data-size="md">
                <span className="btn__dot" aria-hidden="true" />
                Scan project
              </Link>
              <Link to={`/projects/${project.id}/new`} data-variant="secondary" data-size="md">
                Diagnose logs
              </Link>
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            </div>
          </header>

          {deleteError ? (
            <p className="form__error" role="alert" style={{ marginBottom: "var(--space-5)" }}>
              <span className="glyph glyph--on glyph--sm" aria-hidden="true" />
              {deleteError.message}
            </p>
          ) : null}

          {confirmDelete ? (
            <section className="delete-confirm delete-confirm--wide" role="alert">
              <div>
                <span className="eyebrow">
                  <span className="glyph glyph--on glyph--sm" />// DELETE_PROJECT
                </span>
                <p>
                  Delete <strong>{project.name}</strong> permanently? This removes the project,
                  sessions, uploaded files, detected issues, diagnosis reports, readiness scans,
                  and readiness reports from the database.
                </p>
              </div>
              <div className="delete-confirm__actions">
                <Button variant="danger" loading={deleting} onClick={handleDeleteProject}>
                  Delete forever
                </Button>
                <Button
                  variant="ghost"
                  disabled={deleting}
                  onClick={() => {
                    setConfirmDelete(false);
                    setDeleteError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </section>
          ) : null}

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
