import type { ActionPlanStep } from "../../types/readiness";

/** Ordered, prioritized pre-deployment steps from the AI reviewer. */
export function ActionPlan({ steps }: { steps: ActionPlanStep[] }) {
  if (!steps.length)
    return (
      <p className="mono" style={{ fontSize: 12, color: "var(--color-text-faint)", margin: 0 }}>
        None.
      </p>
    );

  return (
    <ol className="grid" style={{ gap: "var(--space-3)", margin: 0, padding: 0, listStyle: "none" }}>
      {steps.map((step, i) => (
        <li className="issue" key={step.order || i}>
          <div className="issue__head">
            <span className="issue__type mono" style={{ fontSize: 11 }}>
              STEP {step.order || i + 1}
            </span>
          </div>
          <p style={{ margin: "var(--space-2) 0 0", fontSize: 14, fontWeight: 600 }}>{step.title}</p>
          {step.detail ? (
            <p style={{ margin: "var(--space-1) 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>
              {step.detail}
            </p>
          ) : null}
          {step.related_files.length ? (
            <div style={{ marginTop: "var(--space-2)", display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
              {step.related_files.map((f) => (
                <span key={f} className="mono" style={{ fontSize: 11, color: "var(--color-text-faint)" }}>
                  {f}
                </span>
              ))}
            </div>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
