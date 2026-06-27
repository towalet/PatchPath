/**
 * Diagnostics domain types — mirror of the backend serializers.
 * See docs/AGENT_PLAN.md §7-§8. Filled in alongside the API.
 */

export type Severity = "low" | "medium" | "high";
export type SessionStatus = "pending" | "analyzing" | "completed" | "failed";

export interface Project {
  id: string;
  name: string;
  stack: string;
  cloud_provider: string;
  session_count: number;
  latest_session_at: string | null;
  created_at: string;
  updated_at: string;
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
}

export interface DiagnosisReport {
  id: string;
  root_cause: string;
  confidence_score: number;
  severity: Severity;
  detected_stack: string[];
  detected_cloud_provider: string;
  explanation: string;
  evidence: EvidenceItem[];
  recommended_fix: string;
  commands: string[];
  verification_checklist: string[];
  missing_information: string[];
  possible_risks: string[];
  created_at: string;
}

export interface DebugSession {
  id: string;
  status: SessionStatus;
  error_summary: string;
  failure_reason: string;
  files: UploadedFileMeta[];
  detected_issues: DetectedIssue[];
  report: DiagnosisReport | null;
  created_at: string;
}

export interface DashboardSummary {
  project_count: number;
  session_count: number;
  completed_session_count: number;
  failed_session_count: number;
  high_severity_count: number;
  recent_sessions: DebugSession[];
  recent_reports: DiagnosisReport[];
}
