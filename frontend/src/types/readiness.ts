export type SourceType = "github" | "zip" | "folder";

export interface ProjectImport {
  id: string;
  session_id: string;
  source_type: SourceType;
  source_name: string;
  original_url: string;
  detected_stack: string[];
  detected_target: string;
  files_checked: string[];
  files_ignored: string[];
  file_tree: string[];
  total_files: number;
  created_at: string;
}

export interface ReadinessCheck {
  id: string;
  description: string;
  source?: string;
  recommendation?: string;
}

export interface ReadinessEvidence {
  source: string;
  line_or_section: string;
  reason: string;
}

export type PatchAction = "create" | "modify";
export type Effort = "low" | "medium" | "high";
export type AiSeverity = "high" | "medium" | "low";

export interface PatchSuggestion {
  file: string;
  action?: PatchAction;
  title?: string;
  reason: string;
  severity?: AiSeverity;
  current_snippet?: string | null;
  proposed_change?: string;
  effort?: Effort;
  /** Legacy shape from pre-upgrade reports. */
  change?: string;
}

export interface ActionPlanStep {
  order: number;
  title: string;
  detail: string;
  related_files: string[];
}

export interface AiInsight {
  title: string;
  detail: string;
  file?: string | null;
  severity: AiSeverity;
}

export interface ReadinessReportSummary {
  id: string;
  session_id: string;
  project_id: string;
  project_name: string;
  readiness_score: number;
  severity: "high" | "medium" | "low";
  source_type: SourceType;
  deployment_target: string;
  ai_used: boolean;
  created_at: string;
}

export interface ReadinessReport extends ReadinessReportSummary {
  detected_stack: string[];
  blocking_issues_json: ReadinessCheck[];
  warnings_json: ReadinessCheck[];
  improvements_json: ReadinessCheck[];
  passed_checks_json: ReadinessCheck[];
  recommendations_json: string[];
  evidence_json: ReadinessEvidence[];
  summary: string;
  patch_suggestions_json: PatchSuggestion[];
  action_plan_json: ActionPlanStep[];
  ai_insights_json: AiInsight[];
  confidence_note: string;
  model_name: string;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  files_checked?: string[];
}

export interface ImportResult {
  session_id: string;
  import: ProjectImport;
}

export interface ScanResult {
  session_id: string;
  status: string;
  report_id: string | null;
  failure_reason?: string;
}
