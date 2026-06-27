import type { EvidenceItem } from "../../types/diagnostics";

/**
 * The "evidence trail" — connects log/config snippets to the diagnosis. The
 * signature UI element of the console (see AGENT_PLAN §6). Scaffold stub.
 */
export function EvidenceList(_props: { evidence: EvidenceItem[] }) {
  return <div data-component="evidence-list">{/* TODO: render evidence trail */}</div>;
}
