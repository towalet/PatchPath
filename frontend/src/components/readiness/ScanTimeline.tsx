type StepState = "pending" | "active" | "done" | "error";

export type ScanPhase =
  | "idle"
  | "importing"
  | "building_tree"
  | "detecting_stack"
  | "checking_readiness"
  | "generating_report"
  | "done"
  | "failed";

interface ScanTimelineProps {
  phase: ScanPhase;
  sourceLabel?: string;
}

interface Step {
  title: string;
  desc: string;
  state: StepState;
}

function computeSteps(phase: ScanPhase, sourceLabel: string): Step[] {
  const order: ScanPhase[] = [
    "importing",
    "building_tree",
    "detecting_stack",
    "checking_readiness",
    "generating_report",
    "done",
  ];
  const activeIdx = phase === "failed" ? order.indexOf("generating_report") : order.indexOf(phase);

  const labels: { title: string; desc: (done: boolean, active: boolean) => string }[] = [
    {
      title: "Importing project",
      desc: (d) => (d ? `${sourceLabel} downloaded` : "Fetching source…"),
    },
    {
      title: "Building file tree",
      desc: (d) => (d ? "File tree ready" : "Discovering files…"),
    },
    {
      title: "Detecting stack",
      desc: (d) => (d ? "Framework identified" : "Inspecting config files…"),
    },
    {
      title: "Checking readiness",
      desc: (d) => (d ? "Checks complete" : "Running deployment checks…"),
    },
    {
      title: "Generating report",
      desc: (d) => (d ? "Report generated" : "Scoring + optional AI summary…"),
    },
    {
      title: "Result ready",
      desc: (d) => (d ? "View your readiness report below" : "Awaiting scan…"),
    },
  ];

  return labels.map((l, i) => {
    let state: StepState = "pending";
    if (phase === "failed") {
      state = i < activeIdx ? "done" : i === activeIdx ? "error" : "pending";
    } else if (activeIdx < 0) {
      state = "pending";
    } else if (i < activeIdx) {
      state = "done";
    } else if (i === activeIdx) {
      state = phase === "done" ? "done" : "active";
    }
    return { title: l.title, desc: l.desc(state === "done", state === "active"), state };
  });
}

export function ScanTimeline({ phase, sourceLabel = "Project" }: ScanTimelineProps) {
  const steps = computeSteps(phase, sourceLabel);

  return (
    <div className="timeline" role="list">
      {steps.map((step, i) => {
        return (
          <div
            className="timeline__step"
            data-state={step.state}
            role="listitem"
            key={i}
          >
            <span className="timeline__dot" aria-hidden="true">
              <i />
            </span>
            <div className="timeline__body">
              <div className="timeline__title">{step.title}</div>
              <div className="timeline__desc">{step.desc}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
