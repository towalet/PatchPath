/**
 * Debug session API calls.
 * Endpoints:
 *   POST /projects/{projectId}/sessions/
 *   GET  /sessions/{id}/
 *   POST /sessions/{id}/upload/
 *   POST /sessions/{id}/analyze/
 * Scaffold stub.
 */
import type { DebugSession } from "../types/diagnostics";
// import { apiRequest } from "./client";

export async function createSession(
  _projectId: string,
  _input: { error_summary?: string },
): Promise<DebugSession> {
  throw new Error("sessions.createSession not implemented");
}

export async function getSession(_sessionId: string): Promise<DebugSession> {
  throw new Error("sessions.getSession not implemented");
}

export async function uploadEvidence(_sessionId: string, _form: FormData): Promise<DebugSession> {
  throw new Error("sessions.uploadEvidence not implemented");
}

export async function analyzeSession(
  _sessionId: string,
): Promise<{ session_id: string; status: string; report_id: string | null }> {
  throw new Error("sessions.analyzeSession not implemented");
}
