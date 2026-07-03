import { apiRequest } from "./client";
import type { ImportResult, ReadinessReport, ScanResult } from "../types/readiness";

export function createGithubImport(projectId: string, repoUrl: string): Promise<ImportResult> {
  return apiRequest(`/projects/${projectId}/imports/`, {
    method: "POST",
    body: { source_type: "github", repo_url: repoUrl },
  });
}

export function createZipImport(projectId: string, file: File): Promise<ImportResult> {
  const form = new FormData();
  form.append("source_type", "zip");
  form.append("archive", file);
  return apiRequest(`/projects/${projectId}/imports/`, {
    method: "POST",
    body: form,
  });
}

export function createFolderImport(projectId: string, files: File[]): Promise<ImportResult> {
  const form = new FormData();
  form.append("source_type", "folder");
  for (const file of files) {
    // webkitRelativePath preserves directory structure; fall back to filename.
    const relPath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
    form.append("files", file, relPath);
  }
  return apiRequest(`/projects/${projectId}/imports/`, {
    method: "POST",
    body: form,
  });
}

export function runScan(sessionId: string): Promise<ScanResult> {
  return apiRequest(`/sessions/${sessionId}/scan/`, { method: "POST" });
}

export function getReadinessReport(reportId: string): Promise<ReadinessReport> {
  return apiRequest(`/readiness-reports/${reportId}/`);
}
