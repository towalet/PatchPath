import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Input } from "../components/ui/Input";
import { createProject, deleteProject, listProjects } from "../api/projects";
import { useFetch } from "../hooks/useFetch";
import type { ApiError } from "../types/api";
import { formatDate } from "../utils/format";

const PROVIDERS = ["", "Vercel", "Render", "Railway", "Fly.io", "AWS", "Heroku", "Docker", "Other"];

export default function ProjectsPage() {
  const { data: projects, error, refetch } = useFetch(listProjects, []);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [stack, setStack] = useState("");
  const [provider, setProvider] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<ApiError | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<ApiError | null>(null);

  const fieldError = (f: string) => formError?.fieldErrors?.[f]?.[0];

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await createProject({ name, stack, cloud_provider: provider });
      setName("");
      setStack("");
      setProvider("");
      setOpen(false);
      refetch();
    } catch (err) {
      setFormError(err as ApiError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestDelete = (projectId: string) => {
    setDeleteError(null);
    setConfirmingDeleteId(projectId);
  };

  const handleDeleteProject = async (projectId: string) => {
    setDeletingId(projectId);
    setDeleteError(null);
    try {
      await deleteProject(projectId);
      setConfirmingDeleteId(null);
      refetch();
    } catch (err) {
      setDeleteError(err as ApiError);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div data-route="projects">
      <header className="page-head">
        <div>
          <span className="eyebrow">
            <span className="glyph glyph--muted glyph--sm" />// PROJECTS
          </span>
          <h1 className="page-head__title">Projects</h1>
          <p className="page-head__sub">Group deployment failures by the app they belong to.</p>
        </div>
        <Button variant={open ? "ghost" : "primary"} dot={!open} onClick={() => setOpen((o) => !o)}>
          {open ? "Cancel" : "New project"}
        </Button>
      </header>

      {open ? (
        <div style={{ marginBottom: "var(--space-8)" }}>
          <Card title="// NEW_PROJECT">
            <form className="form" onSubmit={onSubmit} noValidate>
              {formError && !formError.fieldErrors ? (
                <p className="form__error" role="alert">
                  <span className="glyph glyph--on glyph--sm" aria-hidden="true" />
                  {formError.message}
                </p>
              ) : null}
              <Input
                label="Project name"
                name="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Django Render API"
                error={fieldError("name")}
              />
              <Input
                label="Stack"
                name="stack"
                value={stack}
                onChange={(e) => setStack(e.target.value)}
                placeholder="Django, PostgreSQL"
                error={fieldError("stack")}
              />
              <div data-component="input">
                <label htmlFor="provider">Cloud provider</label>
                <select
                  id="provider"
                  className="field-control"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                >
                  {PROVIDERS.map((p) => (
                    <option key={p} value={p}>
                      {p || "Select a provider…"}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" loading={submitting} dot>
                Create project
              </Button>
            </form>
          </Card>
        </div>
      ) : null}

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

      {deleteError ? (
        <p className="form__error" role="alert" style={{ marginBottom: "var(--space-5)" }}>
          <span className="glyph glyph--on glyph--sm" aria-hidden="true" />
          {deleteError.message}
        </p>
      ) : null}

      {projects && projects.length === 0 && !open ? (
        <EmptyState
          title="No projects yet"
          description="Create your first project to start diagnosing deployment failures."
          action={
            <Button dot onClick={() => setOpen(true)}>
              Create a project
            </Button>
          }
        />
      ) : null}

      {projects && projects.length > 0 ? (
        <div className="grid grid--cards">
          {projects.map((p) => (
            <article key={p.id} className="project-card">
              <Link to={`/projects/${p.id}`} className="record project-card__link">
                <div className="record__head">
                  <h2 className="record__title">{p.name}</h2>
                  <span className="glyph glyph--muted" aria-hidden="true" />
                </div>
                <div className="record__meta">
                  {p.stack ? (
                    <span>
                      <span className="glyph glyph--dim glyph--sm" />
                      {p.stack}
                    </span>
                  ) : null}
                  {p.cloud_provider ? (
                    <span>
                      <span className="glyph glyph--outline glyph--sm" />
                      {p.cloud_provider}
                    </span>
                  ) : null}
                </div>
                <div className="record__meta">
                  <span>
                    {p.session_count} session{p.session_count === 1 ? "" : "s"}
                  </span>
                  <span>last {formatDate(p.latest_session_at)}</span>
                </div>
              </Link>
              <div className="project-card__actions">
                {confirmingDeleteId === p.id ? (
                  <div className="delete-confirm" role="alert">
                    <p>
                      Delete <strong>{p.name}</strong> and every scan, report, session, and upload?
                    </p>
                    <div className="delete-confirm__actions">
                      <Button
                        variant="danger"
                        size="sm"
                        loading={deletingId === p.id}
                        onClick={() => handleDeleteProject(p.id)}
                      >
                        Delete forever
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={deletingId === p.id}
                        onClick={() => setConfirmingDeleteId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={!!deletingId}
                    onClick={() => handleRequestDelete(p.id)}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
