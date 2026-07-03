import type { ReadinessCheck } from "../../types/readiness";

type Category = "blocking" | "warning" | "improvement" | "passed";

interface CheckListProps {
  items: ReadinessCheck[];
  category: Category;
}

const GLYPH_MAP: Record<Category, string> = {
  blocking: "glyph glyph--on glyph--sm",
  warning: "glyph glyph--muted glyph--sm",
  improvement: "glyph glyph--outline glyph--sm",
  passed: "glyph glyph--on glyph--sm",
};

const LABEL_MAP: Record<Category, string> = {
  blocking: "BLOCKING",
  warning: "WARNING",
  improvement: "IMPROVEMENT",
  passed: "PASS",
};

export function CheckList({ items, category }: CheckListProps) {
  if (!items.length)
    return (
      <p className="mono" style={{ fontSize: 12, color: "var(--color-text-faint)", margin: 0 }}>
        None.
      </p>
    );

  return (
    <div className="grid" style={{ gap: "var(--space-3)" }}>
      {items.map((item) => (
        <div className="issue" key={item.id}>
          <div className="issue__head">
            <span className={GLYPH_MAP[category]} aria-hidden="true" />
            <span className="issue__type mono" style={{ fontSize: 11 }}>
              {LABEL_MAP[category]}
            </span>
          </div>
          <p style={{ margin: "var(--space-2) 0 0", fontSize: 14 }}>{item.description}</p>
          {item.source ? (
            <p
              className="mono"
              style={{ margin: "var(--space-1) 0 0", fontSize: 11, color: "var(--color-text-faint)" }}
            >
              {item.source}
            </p>
          ) : null}
          {item.recommendation ? (
            <p
              style={{
                margin: "var(--space-2) 0 0",
                fontSize: 13,
                color: "var(--color-text-muted)",
                borderLeft: "2px solid var(--color-border)",
                paddingLeft: "var(--space-3)",
              }}
            >
              {item.recommendation}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
