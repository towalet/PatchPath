import { useRef, useState } from "react";

// Directories filtered out before upload (mirrors backend ignore_rules.py).
const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  ".nuxt",
  ".svelte-kit",
  "dist",
  "build",
  "out",
  "target",
  "venv",
  ".venv",
  "env",
  "__pycache__",
  ".cache",
  ".turbo",
  "coverage",
  ".nyc_output",
  ".pytest_cache",
  ".mypy_cache",
  ".ruff_cache",
  "htmlcov",
]);

function shouldIgnore(relativePath: string): boolean {
  const parts = relativePath.split("/");
  return parts.some((part) => IGNORED_DIRS.has(part));
}

interface FolderPickerProps {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}

export function FolderPicker({ onFiles, disabled }: FolderPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [summary, setSummary] = useState<{ total: number; ignored: number } | null>(null);

  const handleChange = (fileList: FileList | null) => {
    if (!fileList) return;
    const all = Array.from(fileList);
    const kept = all.filter((f) => {
      const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
      return !shouldIgnore(rel);
    });
    setSummary({ total: all.length, ignored: all.length - kept.length });
    if (kept.length) onFiles(kept);
  };

  return (
    <div className="grid" style={{ gap: "var(--space-4)" }}>
      <p className="prose" style={{ margin: 0, color: "var(--color-text-muted)" }}>
        Select a project folder from your computer. Heavy directories like{" "}
        <span className="mono" style={{ fontSize: 12 }}>node_modules</span>,{" "}
        <span className="mono" style={{ fontSize: 12 }}>.git</span>, and{" "}
        <span className="mono" style={{ fontSize: 12 }}>dist</span> are filtered out
        automatically before upload.
      </p>

      <div
        className="dropzone"
        role="button"
        tabIndex={0}
        aria-disabled={disabled || undefined}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!disabled) inputRef.current?.click();
          }
        }}
      >
        <span className="glyph glyph--on glyph--lg" aria-hidden="true" />
        <strong style={{ color: "var(--color-text)" }}>Click to select a project folder</strong>
        <p className="dropzone__hint">
          Selects the whole directory tree. Heavy folders are excluded before upload.
        </p>
        <input
          ref={inputRef}
          type="file"
          // @ts-expect-error webkitdirectory not in standard types
          webkitdirectory=""
          directory=""
          multiple
          hidden
          disabled={disabled}
          onChange={(e) => {
            handleChange(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {summary ? (
        <p className="mono" style={{ fontSize: 12, color: "var(--color-text-muted)", margin: 0 }}>
          {summary.total} files found · {summary.ignored} ignored (heavy dirs) ·{" "}
          {summary.total - summary.ignored} queued for upload
        </p>
      ) : null}
    </div>
  );
}
