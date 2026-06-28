/** Possible risks of applying the fix — surfaced, never hidden. */
export function RisksList({ risks }: { risks: string[] }) {
  if (!risks.length) {
    return <p className="prose">No additional risks were noted.</p>;
  }
  return (
    <ul className="checklist">
      {risks.map((risk, i) => (
        <li key={i}>
          <span className="glyph glyph--dim" aria-hidden="true" />
          {risk}
        </li>
      ))}
    </ul>
  );
}
