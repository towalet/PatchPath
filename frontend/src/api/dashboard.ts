/**
 * Dashboard API call. Endpoint: GET /dashboard/
 */
import type { DashboardSummary } from "../types/diagnostics";
import { apiRequest } from "./client";

const DASHBOARD_CACHE_TTL_MS = 15_000;

let dashboardCache: DashboardSummary | null = null;
let dashboardCacheTime = 0;
let dashboardRequest: Promise<DashboardSummary> | null = null;

export function getCachedDashboard(): DashboardSummary | null {
  if (!dashboardCache) return null;
  if (Date.now() - dashboardCacheTime > DASHBOARD_CACHE_TTL_MS) return null;
  return dashboardCache;
}

export function fetchDashboard(): Promise<DashboardSummary> {
  const cached = getCachedDashboard();
  if (cached) return Promise.resolve(cached);
  if (dashboardRequest) return dashboardRequest;

  dashboardRequest = apiRequest<DashboardSummary>("/dashboard/", { method: "GET" })
    .then((summary) => {
      dashboardCache = summary;
      dashboardCacheTime = Date.now();
      return summary;
    })
    .finally(() => {
      dashboardRequest = null;
    });

  return dashboardRequest;
}

export function prefetchDashboard(): void {
  void fetchDashboard().catch(() => {
    dashboardRequest = null;
  });
}
