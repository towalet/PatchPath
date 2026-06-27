/**
 * Projects API calls.
 * Endpoints: GET/POST /projects/, GET /projects/{id}/
 * Scaffold stub.
 */
import type { Project } from "../types/diagnostics";
// import { apiRequest } from "./client";

export async function listProjects(): Promise<Project[]> {
  throw new Error("projects.listProjects not implemented");
}

export async function getProject(_projectId: string): Promise<Project> {
  throw new Error("projects.getProject not implemented");
}

export async function createProject(_input: {
  name: string;
  stack?: string;
  cloud_provider?: string;
}): Promise<Project> {
  throw new Error("projects.createProject not implemented");
}
