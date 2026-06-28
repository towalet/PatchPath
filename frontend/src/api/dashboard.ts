/**
 * Dashboard API call. Endpoint: GET /dashboard/
 */
import type { DashboardSummary } from "../types/diagnostics";
import { apiRequest } from "./client";

export function fetchDashboard(): Promise<DashboardSummary> {
  return apiRequest<DashboardSummary>("/dashboard/", { method: "GET" });
}
