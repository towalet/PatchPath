/** Post-fix verification checklist — confirm the deploy actually recovered. */
export function VerificationChecklist({ items }: { items: string[] }) {
  if (!items.length) {
    return <p className="prose">No verification steps were provided.</p>;
  }
  return (
    <ul className="checklist">
      {items.map((item, i) => (
        <li key={i}>
          <span className="glyph glyph--outline-bright" aria-hidden="true" />
          {item}
        </li>
      ))}
    </ul>
  );
}
