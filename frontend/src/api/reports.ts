/**
 * Reports API call. Endpoint: GET /reports/{id}/
 * Scaffold stub.
 */
import type { DiagnosisReport } from "../types/diagnostics";
// import { apiRequest } from "./client";

export async function getReport(_reportId: string): Promise<DiagnosisReport> {
  throw new Error("reports.getReport not implemented");
}
