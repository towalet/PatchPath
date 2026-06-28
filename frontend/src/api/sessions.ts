/**
 * Debug session API calls.
 * Endpoints:
 *   GET/POST /projects/{projectId}/sessions/
 *   GET      /sessions/{id}/
 *   POST     /sessions/{id}/upload/
 *   POST     /sessions/{id}/analyze/
 */
import type { Paginated } from "../types/api";
import type {
  AnalyzeResult,
  DebugSession,
  DebugSessionSummary,
  UploadResult,
} from "../types/diagnostics";
import { apiRequest, unwrap } from "./client";

export function createSession(
  projectId: string,
  input: { error_summary?: string },
): Promise<DebugSessionSummary> {
  return apiRequest<DebugSessionSummary>(`/projects/${projectId}/sessions/`, {
    method: "POST",
    body: input,
  });
}

export async function listProjectSessions(projectId: string): Promise<DebugSessionSummary[]> {
  const page = await apiRequest<Paginated<DebugSessionSummary>>(
    `/projects/${projectId}/sessions/`,
    { method: "GET" },
  );
  return unwrap(page);
}

export function getSession(sessionId: string): Promise<DebugSession> {
  return apiRequest<DebugSession>(`/sessions/${sessionId}/`, { method: "GET" });
}

export function uploadEvidence(sessionId: string, form: FormData): Promise<UploadResult> {
  // A wholly-rejected batch returns 400 with the same {uploaded, errors} body,
  // so accept it instead of throwing and surface the per-file errors.
  return apiRequest<UploadResult>(`/sessions/${sessionId}/upload/`, {
    method: "POST",
    body: form,
    acceptStatuses: [400],
  });
}

export function analyzeSession(sessionId: string): Promise<AnalyzeResult> {
  return apiRequest<AnalyzeResult>(`/sessions/${sessionId}/analyze/`, { method: "POST" });
}
