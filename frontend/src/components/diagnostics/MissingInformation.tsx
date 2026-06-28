/**
 * Missing information — always present in every report so uncertainty stays
 * visible (see AGENT_PLAN §12).
 */
export function MissingInformation({ items }: { items: string[] }) {
  if (!items.length) {
    return <p className="prose">No information gaps were flagged.</p>;
  }
  return (
    <ul className="checklist">
      {items.map((item, i) => (
        <li key={i}>
          <span className="glyph glyph--outline" aria-hidden="true" />
          {item}
        </li>
      ))}
    </ul>
  );
}
