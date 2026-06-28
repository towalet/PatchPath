import { useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { AnalysisTimeline } from "../components/diagnostics/AnalysisTimeline";
import { FileDropzone } from "../components/diagnostics/FileDropzone";
import { SeverityBadge } from "../components/diagnostics/SeverityBadge";
import { UploadedFileList } from "../components/diagnostics/UploadedFileList";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Textarea } from "../components/ui/Textarea";
import { analyzeSession, createSession, getSession, uploadEvidence } from "../api/sessions";
import type { ApiError } from "../types/api";
import type { DebugSession, UploadResult, UploadedFileMeta } from "../types/diagnostics";

export default function NewAnalysisPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [errorSummary, setErrorSummary] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionPromise = useRef<Promise<string> | null>(null);

  const [uploaded, setUploaded] = useState<UploadedFileMeta[]>([]);
  const [uploadErrors, setUploadErrors] = useState<{ filename: string; error: string }[]>([]);
  const [pastedText, setPastedText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const [phase, setPhase] = useState<"idle" | "analyzing" | "failed">("idle");
  const [result, setResult] = useState<DebugSession | null>(null);
  const [failureReason, setFailureReason] = useState("");

  const ensureSession = (): Promise<string> => {
    if (sessionId) return Promise.resolve(sessionId);
    if (!sessionPromise.current) {
      sessionPromise.current = createSession(projectId!, { error_summary: errorSummary.trim() })
        .then((s) => {
          setSessionId(s.id);
          return s.id;
        })
        .catch((e) => {
          sessionPromise.current = null;
          throw e;
        });
    }
    return sessionPromise.current;
  };

  const mergeUpload = (res: UploadResult) => {
    setUploaded((prev) => {
      const ids = new Set(prev.map((f) => f.id));
      return [...prev, ...res.uploaded.filter((f) => !ids.has(f.id))];
    });
    setUploadErrors(res.errors);
  };

  const sendForm = async (build: (form: FormData) => void) => {
    setBusy(true);
    setError(null);
    try {
      const id = await ensureSession();
      const form = new FormData();
      build(form);
      mergeUpload(await uploadEvidence(id, form));
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setBusy(false);
    }
  };

  const onFiles = (files: File[]) =>
    sendForm((form) => files.forEach((f) => form.append("files", f)));

  const onPaste = async () => {
    if (!pastedText.trim()) return;
    await sendForm((form) => form.append("pasted_text", pastedText));
    setPastedText("");
  };

  const runAnalysis = async () => {
    if (!sessionId || uploaded.length === 0) return;
    setPhase("analyzing");
    setError(null);
    try {
      await analyzeSession(sessionId).catch(() => undefined); // truth comes from the refetch
      const fresh = await getSession(sessionId);
      setResult(fresh);
      if (fresh.status === "completed" && fresh.report?.id) {
        navigate(`/reports/${fresh.report.id}`);
        return;
      }
      setPhase("failed");
      setFailureReason(fresh.failure_reason || "Analysis did not complete.");
    } catch (e) {
      setError(e as ApiError);
      setPhase("failed");
      setFailureReason("Could not reach the analysis service.");
    }
  };

  const timelineStatus = phase === "analyzing" ? "analyzing" : phase === "failed" ? "failed" : "pending";

  return (
    <div data-route="new-analysis">
      <p className="block__title" style={{ marginBottom: "var(--space-4)" }}>
        <Link to={`/projects/${projectId}`} style={{ color: "var(--color-text-faint)" }}>
          ← Back to project
        </Link>
      </p>

      <header className="page-head">
        <div>
          <span className="eyebrow">
            <span className="glyph glyph--on glyph--sm" />// NEW_ANALYSIS
          </span>
          <h1 className="page-head__title">Run a diagnosis</h1>
          <p className="page-head__sub">
            Upload deployment evidence — rules extract proof before the AI diagnoses.
          </p>
        </div>
      </header>

      <div className="grid" style={{ gap: "var(--space-6)" }}>
        <Card title="// SESSION">
          <Textarea
            label="What's going wrong?"
            name="error_summary"
            rows={3}
            value={errorSummary}
            disabled={!!sessionId}
            onChange={(e) => setErrorSummary(e.target.value)}
            placeholder="Deployment fails during database startup on Render…"
            hint={
              sessionId
                ? "Saved with this session."
                : "Optional. Saved when you add the first piece of evidence."
            }
          />
        </Card>

        <Card title="// EVIDENCE">
          <FileDropzone onFiles={onFiles} disabled={busy} />

          {uploaded.length > 0 ? (
            <div style={{ marginTop: "var(--space-4)" }}>
              <UploadedFileList files={uploaded} />
            </div>
          ) : null}

          {uploadErrors.length > 0 ? (
            <ul className="upload-errors">
              {uploadErrors.map((e, i) => (
                <li key={i}>
                  <span className="glyph glyph--outline-bright glyph--sm" aria-hidden="true" />
                  <span>
                    <b>{e.filename}</b> — {e.error}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          <div style={{ marginTop: "var(--space-5)" }}>
            <Textarea
              label="…or paste an error"
              name="pasted_text"
              rows={4}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste a stack trace or platform error message…"
              className="field-control--mono"
            />
            <div style={{ marginTop: "var(--space-3)" }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={onPaste}
                disabled={busy || !pastedText.trim()}
              >
                Add pasted text
              </Button>
            </div>
          </div>

          {error ? (
            <p className="form__error" role="alert" style={{ marginTop: "var(--space-4)" }}>
              <span className="glyph glyph--on glyph--sm" aria-hidden="true" />
              {error.message}
            </p>
          ) : null}
        </Card>

        <Card title="// RUN">
          <AnalysisTimeline
            status={timelineStatus}
            fileCount={uploaded.length}
            issueCount={result?.detected_issues.length ?? 0}
            hasReport={!!result?.report}
          />

          {phase === "failed" ? (
            <div className="form__error" role="alert" style={{ marginTop: "var(--space-5)" }}>
              <span className="glyph glyph--on glyph--sm" aria-hidden="true" />
              <span>
                <b>Analysis failed.</b> {failureReason} Your uploads and any detected issues are
                preserved.
              </span>
            </div>
          ) : null}

          {phase === "failed" && result && result.detected_issues.length > 0 ? (
            <div style={{ marginTop: "var(--space-5)" }}>
              <h3 className="block__title">
                <span className="glyph glyph--muted glyph--sm" />// DETECTED_ISSUES
              </h3>
              <div className="grid" style={{ gap: "var(--space-2)" }}>
                {result.detected_issues.map((issue) => (
                  <div className="issue" key={issue.id}>
                    <div className="issue__head">
                      <span className="issue__type">{issue.issue_type}</span>
                      <SeverityBadge severity={issue.severity} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div
            style={{
              marginTop: "var(--space-6)",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-4)",
              flexWrap: "wrap",
            }}
          >
            <Button
              dot
              size="lg"
              loading={phase === "analyzing"}
              disabled={uploaded.length === 0 || phase === "analyzing"}
              onClick={runAnalysis}
            >
              {phase === "failed" ? "Re-run analysis" : "Run analysis"}
            </Button>
            {uploaded.length === 0 ? (
              <span className="mono" style={{ fontSize: 12, color: "var(--color-text-faint)" }}>
                Add at least one piece of evidence to analyze.
              </span>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
