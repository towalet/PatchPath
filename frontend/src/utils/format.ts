/** Small presentation helpers. Expand as the UI needs them. */

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Render a 0..1 confidence as a percentage; PatchPath never shows 100%. */
export function formatConfidence(score: number): string {
  return `${Math.round(Math.min(score, 0.99) * 100)}%`;
}
