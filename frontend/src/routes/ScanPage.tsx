import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { GithubImportForm } from "../components/readiness/GithubImportForm";
import { FolderPicker } from "../components/readiness/FolderPicker";
import { ScanTimeline, type ScanPhase } from "../components/readiness/ScanTimeline";
import { ZipDropzone } from "../components/readiness/ZipDropzone";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { createProject, listProjects } from "../api/projects";
import {
  createFolderImport,
  createGithubImport,
  createZipImport,
  runScan,
} from "../api/readiness";
import type { ApiError } from "../types/api";
import type { Project } from "../types/diagnostics";
import type { ImportResult } from "../types/readiness";

type SourceKind = "github" | "zip" | "folder";
type WorkflowStep = "source" | "project" | "scan";

interface SourceSelection {
  kind: SourceKind;
  label: string;
  projectName: string;
  repoUrl?: string;
  file?: File;
  files?: File[];
}

const SOURCE_OPTIONS: {
  kind: SourceKind;
  title: string;
  detail: string;
  meta: string;
}[] = [
  {
    kind: "github",
    title: "Paste GitHub URL",
    detail: "Best for public repos. PatchPath downloads the default branch.",
    meta: "No local upload",
  },
  {
    kind: "zip",
    title: "Upload ZIP",
    detail: "Best when the code is private or already exported.",
    meta: "Archive scan",
  },
  {
    kind: "folder",
    title: "Choose folder",
    detail: "Best for scanning a local project directly from your machine.",
    meta: "Local tree",
  },
];

function nameFromGithubUrl(repoUrl: string): string {
  try {
    const url = new URL(repoUrl);
    const parts = url.pathname.split("/").filter(Boolean);
    return cleanProjectName(parts[1] ?? parts[0] ?? "Imported project");
  } catch {
    return "Imported project";
  }
}

function nameFromFolder(files: File[]): string {
  const first = files[0] as File & { webkitRelativePath?: string };
  const rel = first?.webkitRelativePath || first?.name || "Imported project";
  return cleanProjectName(rel.split("/")[0] || "Imported project");
}

function cleanProjectName(value: string): string {
  const base = value.replace(/\.zip$/i, "").replace(/[-_]+/g, " ").trim();
  return base || "Imported project";
}

function errorMessage(error: unknown, fallback: string): string {
  return (error as ApiError)?.message || fallback;
}

async function getOrCreateProject(name: string): Promise<Project> {
  const trimmed = name.trim();
  const projects = await listProjects();
  const existing = projects.find((p) => p.name.toLowerCase() === trimmed.toLowerCase());
  if (existing) return existing;
  return createProject({ name: trimmed });
}

export default function ScanPage() {
  const navigate = useNavigate();
  const [activeSource, setActiveSource] = useState<SourceKind>("github");
  const [source, setSource] = useState<SourceSelection | null>(null);
  const [projectName, setProjectName] = useState("");
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>("source");
  const [phase, setPhase] = useState<ScanPhase>("idle");
  const [error, setError] = useState("");
  const [createdProject, setCreatedProject] = useState<Project | null>(null);

  const busy = phase !== "idle" && phase !== "failed" && phase !== "done";
  const readyToScan = !!source && projectName.trim().length > 1 && !busy;
  const sourceMeta = useMemo(
    () => SOURCE_OPTIONS.find((option) => option.kind === activeSource),
    [activeSource],
  );

  const handleSourceSelected = (next: SourceSelection) => {
    setSource(next);
    setProjectName(next.projectName);
    setWorkflowStep("project");
    setPhase("idle");
    setError("");
    setCreatedProject(null);
  };

  const handleGithubSelected = (repoUrl: string) => {
    handleSourceSelected({
      kind: "github",
      label: repoUrl,
      repoUrl,
      projectName: nameFromGithubUrl(repoUrl),
    });
  };

  const handleZipSelected = (file: File) => {
    handleSourceSelected({
      kind: "zip",
      label: file.name,
      file,
      projectName: cleanProjectName(file.name),
    });
  };

  const handleFolderSelected = (files: File[]) => {
    handleSourceSelected({
      kind: "folder",
      label: nameFromFolder(files),
      files,
      projectName: nameFromFolder(files),
    });
  };

  const handleChangeSource = () => {
    setWorkflowStep("source");
    setPhase("idle");
    setError("");
  };

  const handleStartScan = async () => {
    if (!source || !readyToScan) return;
    setWorkflowStep("scan");
    setPhase("importing");
    setError("");

    try {
      const project = await getOrCreateProject(projectName);
      setCreatedProject(project);

      let imported: ImportResult;
      if (source.kind === "github" && source.repoUrl) {
        imported = await createGithubImport(project.id, source.repoUrl);
      } else if (source.kind === "zip" && source.file) {
        imported = await createZipImport(project.id, source.file);
      } else if (source.kind === "folder" && source.files) {
        imported = await createFolderImport(project.id, source.files);
      } else {
        throw new Error("Choose a code source before scanning.");
      }

      setPhase("building_tree");
      await tick();
      setPhase("detecting_stack");
      await tick();
      setPhase("checking_readiness");
      await tick();
      setPhase("generating_report");

      const scan = await runScan(imported.session_id);
      if (!scan.report_id) {
        throw new Error(scan.failure_reason || "The scan finished without a report.");
      }
      setPhase("done");
      navigate(`/readiness-reports/${scan.report_id}`);
    } catch (scanError) {
      setError(errorMessage(scanError, "Scan failed. Check the source and try again."));
      setPhase("failed");
    }
  };

  return (
    <div data-route="scan">
      <header className="page-head scan-head">
        <div>
          <span className="eyebrow">
            <span className="glyph glyph--on glyph--sm" />// NEW_SCAN
          </span>
          <h1 className="page-head__title">Scan a project</h1>
          <p className="page-head__sub">
            Choose code, confirm the project name, then get a deployment score and fixes.
          </p>
        </div>
      </header>

      <div className="scan-shell">
        <aside className="scan-rail" aria-label="Scan steps">
          <StepMarker index="1" label="Choose code" active={workflowStep === "source"} done={!!source} />
          <StepMarker
            index="2"
            label="Confirm project"
            active={workflowStep === "project"}
            done={workflowStep === "scan" || phase === "done"}
          />
          <StepMarker
            index="3"
            label="Run scan"
            active={workflowStep === "scan"}
            done={phase === "done"}
          />
          <StepMarker index="4" label="Review results" active={phase === "done"} done={phase === "done"} />
        </aside>

        <main className="scan-flow" aria-live="polite">
          <section className="scan-panel" data-active={workflowStep === "source" || undefined}>
            <div className="scan-panel__head">
              <div>
                <span className="eyebrow">
                  <span className="glyph glyph--on glyph--sm" />// STEP_1
                </span>
                <h2>What do you want to scan?</h2>
              </div>
              {source ? (
                <button data-variant="secondary" data-size="sm" onClick={handleChangeSource} disabled={busy}>
                  Change source
                </button>
              ) : null}
            </div>

            <div className="source-picker" role="tablist" aria-label="Code source">
              {SOURCE_OPTIONS.map((option) => (
                <button
                  key={option.kind}
                  role="tab"
                  aria-selected={activeSource === option.kind}
                  className="source-picker__option"
                  data-active={activeSource === option.kind || undefined}
                  disabled={busy}
                  onClick={() => setActiveSource(option.kind)}
                >
                  <span className="source-picker__meta">{option.meta}</span>
                  <strong>{option.title}</strong>
                  <span>{option.detail}</span>
                </button>
              ))}
            </div>

            <div className="source-stage">
              <span className="eyebrow">
                <span className="glyph glyph--muted glyph--sm" />
                {sourceMeta?.title}
              </span>
              {activeSource === "github" ? (
                <GithubImportForm
                  disabled={busy}
                  onImport={handleGithubSelected}
                  buttonLabel="Use this repository"
                />
              ) : null}
              {activeSource === "zip" ? (
                <ZipDropzone disabled={busy} onFile={handleZipSelected} />
              ) : null}
              {activeSource === "folder" ? (
                <FolderPicker disabled={busy} onFiles={handleFolderSelected} />
              ) : null}
            </div>
          </section>

          {source ? (
            <section className="scan-panel" data-active={workflowStep === "project" || undefined}>
              <div className="scan-panel__head">
                <div>
                  <span className="eyebrow">
                    <span className="glyph glyph--on glyph--sm" />// STEP_2
                  </span>
                  <h2>Confirm the project</h2>
                </div>
                <span className="scan-chip">{source.kind}</span>
              </div>
              <div className="scan-confirm">
                <Input
                  label="Project name"
                  name="scan_project_name"
                  value={projectName}
                  disabled={busy}
                  onChange={(event) => setProjectName(event.target.value)}
                  error={
                    projectName.trim() && projectName.trim().length < 2
                      ? "Use at least 2 characters."
                      : undefined
                  }
                />
                <div className="scan-source-summary">
                  <span className="eyebrow">
                    <span className="glyph glyph--muted glyph--sm" />// SOURCE
                  </span>
                  <strong>{source.label}</strong>
                  <p>
                    PatchPath will create this project if it does not exist, then scan the
                    selected code for deployment readiness.
                  </p>
                </div>
              </div>
              <div className="scan-actions">
                <Button dot loading={busy} disabled={!readyToScan} onClick={handleStartScan}>
                  Start scan
                </Button>
                <button data-variant="ghost" data-size="md" onClick={handleChangeSource} disabled={busy}>
                  Choose different code
                </button>
              </div>
            </section>
          ) : null}

          {workflowStep === "scan" || phase === "failed" ? (
            <section className="scan-panel" data-active>
              <div className="scan-panel__head">
                <div>
                  <span className="eyebrow">
                    <span className="glyph glyph--on glyph--sm" />// STEP_3
                  </span>
                  <h2>Scan progress</h2>
                </div>
                {createdProject ? (
                  <Link to={`/projects/${createdProject.id}`} className="scan-chip">
                    {createdProject.name}
                  </Link>
                ) : null}
              </div>
              <ScanTimeline phase={phase} sourceLabel={source?.label || projectName} />
              {error ? (
                <div className="scan-error" role="alert">
                  <strong>Scan stopped</strong>
                  <p>{error}</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setPhase("idle");
                      setWorkflowStep("project");
                    }}
                  >
                    Review and try again
                  </Button>
                </div>
              ) : null}
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}

function StepMarker({
  index,
  label,
  active,
  done,
}: {
  index: string;
  label: string;
  active?: boolean;
  done?: boolean;
}) {
  return (
    <div className="scan-rail__step" data-active={active || undefined} data-done={done || undefined}>
      <span>{done ? "ok" : index}</span>
      <strong>{label}</strong>
    </div>
  );
}

function tick(ms = 260): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
