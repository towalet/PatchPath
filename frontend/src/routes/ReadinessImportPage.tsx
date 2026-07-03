import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { ImportPanel } from "../components/readiness/ImportPanel";
import { ScanTimeline } from "../components/readiness/ScanTimeline";
import type { ScanPhase } from "../components/readiness/ScanTimeline";
import { Card } from "../components/ui/Card";
import {
  createFolderImport,
  createGithubImport,
  createZipImport,
  runScan,
} from "../api/readiness";
import type { ApiError } from "../types/api";

export default function ReadinessImportPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<ScanPhase>("idle");
  const [error, setError] = useState<string>("");
  const [sourceLabel, setSourceLabel] = useState("Project");

  const runImport = async (
    importFn: () => Promise<{ session_id: string; import: { source_name?: string } }>,
    label: string,
  ) => {
    setError("");
    setSourceLabel(label);
    setPhase("importing");

    let sessionId: string;
    try {
      const result = await importFn();
      sessionId = result.session_id;
      if (result.import?.source_name) setSourceLabel(result.import.source_name);
    } catch (e) {
      setError((e as ApiError).message ?? "Import failed.");
      setPhase("failed");
      return;
    }

    setPhase("building_tree");
    await tick();
    setPhase("detecting_stack");
    await tick();
    setPhase("checking_readiness");
    await tick();
    setPhase("generating_report");

    try {
      const scan = await runScan(sessionId);
      if (scan.report_id) {
        setPhase("done");
        navigate(`/readiness-reports/${scan.report_id}`);
      } else {
        setError(scan.failure_reason ?? "Scan did not produce a report.");
        setPhase("failed");
      }
    } catch (e) {
      setError((e as ApiError).message ?? "Scan failed.");
      setPhase("failed");
    }
  };

  const busy = phase !== "idle" && phase !== "failed";

  return (
    <div data-route="readiness-import">
      <p className="block__title" style={{ marginBottom: "var(--space-4)" }}>
        <Link to={`/projects/${projectId}`} style={{ color: "var(--color-text-faint)" }}>
          ← Back to project
        </Link>
      </p>

      <header className="page-head">
        <div>
          <span className="eyebrow">
            <span className="glyph glyph--on glyph--sm" />// READINESS_SCAN
          </span>
          <h1 className="page-head__title">Scan deployment readiness</h1>
          <p className="page-head__sub">
            Import a project via GitHub, ZIP, or folder upload. PatchPath analyzes
            your deployment config and scores readiness from 0–100.
          </p>
        </div>
      </header>

      <div className="grid" style={{ gap: "var(--space-6)" }}>
        <Card title="// IMPORT_SOURCE">
          <ImportPanel
            disabled={busy}
            onGithub={(url) =>
              runImport(() => createGithubImport(projectId!, url), url)
            }
            onZip={(file) =>
              runImport(() => createZipImport(projectId!, file), file.name)
            }
            onFolder={(files) =>
              runImport(
                () => createFolderImport(projectId!, files),
                files[0]
                  ? (files[0] as File & { webkitRelativePath?: string }).webkitRelativePath?.split("/")[0] ||
                      "folder"
                  : "folder",
              )
            }
          />
        </Card>

        {phase !== "idle" ? (
          <Card title="// SCAN_PROGRESS">
            <ScanTimeline phase={phase} sourceLabel={sourceLabel} />
            {error ? (
              <p className="form__error" role="alert" style={{ marginTop: "var(--space-5)" }}>
                <span className="glyph glyph--on glyph--sm" aria-hidden="true" />
                {error}
              </p>
            ) : null}
            {phase === "failed" ? (
              <div style={{ marginTop: "var(--space-4)" }}>
                <button
                  data-variant="secondary"
                  data-size="sm"
                  onClick={() => setPhase("idle")}
                >
                  Try again
                </button>
              </div>
            ) : null}
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function tick(ms = 300): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
