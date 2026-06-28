import type { EvidenceItem } from "../../types/diagnostics";

/**
 * The "evidence trail" — connects log/config snippets to the diagnosis. The
 * signature UI element of the console (see AGENT_PLAN §6).
 */
export function EvidenceList({ evidence }: { evidence: EvidenceItem[] }) {
  if (!evidence.length) {
    return <p className="prose">No evidence snippets were attached to this item.</p>;
  }
  return (
    <div className="evidence">
      {evidence.map((item, i) => (
        <article className="evidence__item" key={i}>
          <header className="evidence__head">
            <span className="glyph glyph--muted" aria-hidden="true" />
            <span>{item.source}</span>
            {item.line_or_section ? (
              <span className="evidence__loc">· {item.line_or_section}</span>
            ) : null}
          </header>
          {item.snippet ? <pre className="evidence__snippet">{item.snippet}</pre> : null}
          {item.reason ? <p className="evidence__reason">{item.reason}</p> : null}
        </article>
      ))}
    </div>
  );
}
