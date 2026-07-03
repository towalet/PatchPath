/**
 * Diagnostics domain types — mirror of the backend serializers
 * (apps/diagnostics/serializers.py). Reads come in summary vs detail variants;
 * report arrays keep the backend's `_json` suffix.
 */

export type Severity = "low" | "medium" | "high";
export type SessionStatus = "pending" | "analyzing" | "completed" | "failed";
export type SessionKind = "diagnosis" | "readiness";

export interface Project {
  id: string;
  name: string;
  stack: string;
  cloud_provider: string;
  created_at: string;
  updated_at: string;
  session_count: number;
  latest_session_at: string | null;
}

export interface ProjectDetail extends Project {
  recent_sessions: DebugSessionSummary[];
}

export interface UploadedFileMeta {
  id: string;
  filename: string;
  file_type: string;
  size_bytes: number;
  line_count: number;
  redaction_count: number;
  uploaded_at: string;
}

export interface EvidenceItem {
  source: string;
  line_or_section: string;
  snippet?: string;
  reason: string;
}

export interface DetectedIssue {
  id: string;
  issue_type: string;
  severity: Severity;
  confidence_hint: number;
  matched_pattern: string;
  evidence: EvidenceItem[];
  created_at: string;
}

/** Lightweight report card used in lists, the dashboard, and session detail. */
export interface DiagnosisReportSummary {
  id: string;
  session_id: string;
  project_id: string;
  project_name: string;
  root_cause: string;
  confidence_score: number;
  severity: Severity;
  created_at: string;
}

/** The full report document returned by GET /reports/{id}/. */
export interface DiagnosisReport extends DiagnosisReportSummary {
  detected_stack: string[];
  detected_cloud_provider: string;
  explanation: string;
  evidence_json: EvidenceItem[];
  recommended_fix: string;
  commands_json: string[];
  verification_checklist_json: string[];
  missing_information_json: string[];
  possible_risks_json: string[];
  model_name: string;
  prompt_tokens: number | null;
  completion_tokens: number | null;
}

/** Session row for lists, history, and dashboard rails. */
export interface DebugSessionSummary {
  id: string;
  project_id: string;
  project_name: string;
  status: SessionStatus;
  error_summary: string;
  report_id: string | null;
  readiness_report_id: string | null;
  created_at: string;
  updated_at: string;
}

/** Full session view: files, detected issues, and a report summary. */
export interface DebugSession {
  id: string;
  project_id: string;
  project_name: string;
  kind: SessionKind;
  status: SessionStatus;
  error_summary: string;
  failure_reason: string;
  analysis_started_at: string | null;
  analysis_completed_at: string | null;
  created_at: string;
  updated_at: string;
  files: UploadedFileMeta[];
  detected_issues: DetectedIssue[];
  report: DiagnosisReportSummary | null;
  readiness_report_id: string | null;
}

export interface DashboardSummary {
  project_count: number;
  session_count: number;
  completed_session_count: number;
  failed_session_count: number;
  high_severity_count: number;
  recent_sessions: DebugSessionSummary[];
  recent_reports: DiagnosisReportSummary[];
}

/** POST /sessions/{id}/upload/ response: partial success with per-item errors. */
export interface UploadResult {
  uploaded: UploadedFileMeta[];
  errors: { filename: string; error: string }[];
}

/** POST /sessions/{id}/analyze/ response. */
export interface AnalyzeResult {
  session_id: string;
  status: SessionStatus;
  report_id: string | null;
  failure_reason?: string;
}
