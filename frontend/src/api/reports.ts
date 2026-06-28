/**
 * Reports API call. Endpoint: GET /reports/{id}/
 */
import type { DiagnosisReport } from "../types/diagnostics";
import { apiRequest } from "./client";

export function getReport(reportId: string): Promise<DiagnosisReport> {
  return apiRequest<DiagnosisReport>(`/reports/${reportId}/`, { method: "GET" });
}
