/** Recommended fix narrative. Careful, non-hype language. */
export function FixSteps({ recommendedFix }: { recommendedFix: string }) {
  const paragraphs = recommendedFix
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (!paragraphs.length) {
    return <p className="prose">No fix recommendation was produced.</p>;
  }
  return (
    <div className="prose">
      {paragraphs.map((p, i) => (
        <p key={i} style={{ margin: i ? "12px 0 0" : 0 }}>
          {p}
        </p>
      ))}
    </div>
  );
}
