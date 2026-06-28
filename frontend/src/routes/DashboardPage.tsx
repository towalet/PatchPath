import { Link } from "react-router-dom";

import { ReportRow, SessionRow } from "../components/diagnostics/rows";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { LoadingState } from "../components/ui/LoadingState";
import { fetchDashboard } from "../api/dashboard";
import { useAuth } from "../hooks/useAuth";
import { useFetch } from "../hooks/useFetch";

function Stat({ label, value, glyph }: { label: string; value: number; glyph: string }) {
  return (
    <div className="stat">
      <span className="stat__label">
        <span className={glyph} aria-hidden="true" />
        {label}
      </span>
      <span className="stat__value">{value}</span>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, loading, error, refetch } = useFetch(fetchDashboard, []);

  return (
    <div data-route="dashboard">
      <header className="page-head">
        <div>
          <span className="eyebrow">
            <span className="glyph glyph--on glyph--sm" />// OVERVIEW
          </span>
          <h1 className="page-head__title">Diagnostics console</h1>
          <p className="page-head__sub">{user?.name ? `Signed in as ${user.name}` : user?.email}</p>
        </div>
        <Link to="/projects" data-variant="secondary" data-size="md">
          Manage projects
        </Link>
      </header>

      {loading ? <LoadingState label="Loading dashboard…" /> : null}
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
          <div className="grid grid--stats">
            <Stat label="Projects" value={data.project_count} glyph="glyph glyph--on glyph--sm" />
            <Stat label="Sessions" value={data.session_count} glyph="glyph glyph--muted glyph--sm" />
            <Stat
              label="Completed"
              value={data.completed_session_count}
              glyph="glyph glyph--on glyph--sm"
            />
            <Stat
              label="Failed"
              value={data.failed_session_count}
              glyph="glyph glyph--outline-bright glyph--sm"
            />
            <Stat
              label="High severity"
              value={data.high_severity_count}
              glyph="glyph glyph--outline glyph--sm"
            />
          </div>

          {data.project_count === 0 ? (
            <div style={{ marginTop: "var(--space-8)" }}>
              <EmptyState
                title="No projects yet"
                description="Create a project to group deployment failures, then run your first diagnosis."
                action={
                  <Link to="/projects" data-variant="primary" data-size="md">
                    <span className="btn__dot" aria-hidden="true" />
                    Create your first project
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="grid grid--2" style={{ marginTop: "var(--space-8)" }}>
              <section>
                <h2 className="block__title">
                  <span className="glyph glyph--muted glyph--sm" />// RECENT_SESSIONS
                </h2>
                {data.recent_sessions.length ? (
                  <div className="rows">
                    {data.recent_sessions.map((s) => (
                      <SessionRow key={s.id} session={s} />
                    ))}
                  </div>
                ) : (
                  <p className="prose">No sessions yet.</p>
                )}
              </section>

              <section>
                <h2 className="block__title">
                  <span className="glyph glyph--on glyph--sm" />// RECENT_DIAGNOSES
                </h2>
                {data.recent_reports.length ? (
                  <div className="rows">
                    {data.recent_reports.map((r) => (
                      <ReportRow key={r.id} report={r} />
                    ))}
                  </div>
                ) : (
                  <p className="prose">No diagnoses yet.</p>
                )}
              </section>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
