import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { ReportRow, SessionRow } from "../components/diagnostics/rows";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { LoadingState } from "../components/ui/LoadingState";
import { fetchDashboard, getCachedDashboard } from "../api/dashboard";
import { useAuth } from "../hooks/useAuth";
import { useFetch } from "../hooks/useFetch";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Ease-out count from 0 to `target`, beginning after `delay` ms. */
function useCountUp(target: number, delay = 0, duration = 900) {
  const [display, setDisplay] = useState(() => (prefersReducedMotion() ? target : 0));
  const frame = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (prefersReducedMotion() || target <= 0) {
      setDisplay(target);
      return;
    }
    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplay(Math.round(target * eased));
        if (t < 1) frame.current = requestAnimationFrame(tick);
      };
      frame.current = requestAnimationFrame(tick);
    };
    setDisplay(0);
    timer.current = setTimeout(run, delay);
    return () => {
      clearTimeout(timer.current);
      cancelAnimationFrame(frame.current);
    };
  }, [target, delay, duration]);

  return display;
}

function Stat({
  label,
  value,
  glyph,
  index = 0,
}: {
  label: string;
  value: number;
  glyph: string;
  index?: number;
}) {
  // Count-up lands just after the tile's staggered boot-in (see app.css).
  const display = useCountUp(value, 160 + index * 70);
  return (
    <div className="stat dashboard-card">
      <span className="stat__label">
        <span className={glyph} aria-hidden="true" />
        {label}
      </span>
      <span className="stat__value">{display}</span>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const cachedDashboard = getCachedDashboard();
  const { data, loading, error, refetch } = useFetch(fetchDashboard, []);
  const dashboard = data ?? cachedDashboard;

  return (
    <div data-route="dashboard">
      <div className="dashboard-content">
        <header className="page-head dashboard-head">
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

        {loading && !dashboard ? <LoadingState label="Loading dashboard..." /> : null}
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

        {dashboard ? (
          <>
            <div className="grid grid--stats dashboard-stat-grid">
              <Stat
                label="Projects"
                value={dashboard.project_count}
                glyph="glyph glyph--on glyph--sm"
                index={0}
              />
              <Stat
                label="Sessions"
                value={dashboard.session_count}
                glyph="glyph glyph--muted glyph--sm"
                index={1}
              />
              <Stat
                label="Completed"
                value={dashboard.completed_session_count}
                glyph="glyph glyph--on glyph--sm"
                index={2}
              />
              <Stat
                label="Failed"
                value={dashboard.failed_session_count}
                glyph="glyph glyph--outline-bright glyph--sm"
                index={3}
              />
              <Stat
                label="High severity"
                value={dashboard.high_severity_count}
                glyph="glyph glyph--outline glyph--sm"
                index={4}
              />
            </div>

            {dashboard.project_count === 0 ? (
              <div className="dashboard-empty">
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
              <div className="grid grid--2 dashboard-panels">
                <section className="dashboard-panel">
                  <h2 className="block__title">
                    <span className="glyph glyph--muted glyph--sm" />// RECENT_SESSIONS
                  </h2>
                  {dashboard.recent_sessions.length ? (
                    <div className="rows">
                      {dashboard.recent_sessions.map((s) => (
                        <SessionRow key={s.id} session={s} />
                      ))}
                    </div>
                  ) : (
                    <p className="prose">No sessions yet.</p>
                  )}
                </section>

                <section className="dashboard-panel">
                  <h2 className="block__title">
                    <span className="glyph glyph--on glyph--sm" />// RECENT_DIAGNOSES
                  </h2>
                  {dashboard.recent_reports.length ? (
                    <div className="rows">
                      {dashboard.recent_reports.map((r) => (
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
    </div>
  );
}
