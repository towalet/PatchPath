/**
 * Projects API calls.
 * Endpoints: GET/POST /projects/, GET /projects/{id}/
 */
import type { Paginated } from "../types/api";
import type { Project, ProjectDetail } from "../types/diagnostics";
import { apiRequest, unwrap } from "./client";

export async function listProjects(): Promise<Project[]> {
  const page = await apiRequest<Paginated<Project>>("/projects/", { method: "GET" });
  return unwrap(page);
}

export function getProject(projectId: string): Promise<ProjectDetail> {
  return apiRequest<ProjectDetail>(`/projects/${projectId}/`, { method: "GET" });
}

export function createProject(input: {
  name: string;
  stack?: string;
  cloud_provider?: string;
}): Promise<Project> {
  return apiRequest<Project>("/projects/", { method: "POST", body: input });
}
