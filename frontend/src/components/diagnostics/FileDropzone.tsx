import { useRef, useState } from "react";

/**
 * Drag-and-drop / file-picker for evidence uploads. Shows accepted types and
 * size limits; per-file validation errors are surfaced by the caller after the
 * upload request returns.
 */
interface FileDropzoneProps {
  onFiles?: (files: File[]) => void;
  disabled?: boolean;
}

const ACCEPT =
  ".log,.txt,.env,.json,.yaml,.yml,.toml,.ini,.cfg,.conf,.py,.js,.ts,.tsx,.lock,.md,Dockerfile,Procfile,text/*";

export function FileDropzone({ onFiles, disabled }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const emit = (list: FileList | null) => {
    if (!list) return;
    const files = Array.from(list);
    if (files.length) onFiles?.(files);
  };

  const open = () => {
    if (!disabled) inputRef.current?.click();
  };

  return (
    <div
      className="dropzone"
      data-drag={drag || undefined}
      role="button"
      tabIndex={0}
      aria-disabled={disabled || undefined}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (!disabled) emit(e.dataTransfer.files);
      }}
    >
      <span className="glyph glyph--on glyph--lg" aria-hidden="true" />
      <strong style={{ color: "var(--color-text)" }}>Drop evidence here or click to browse</strong>
      <p className="dropzone__hint">
        Logs, configs, Dockerfiles, package files, .env.example, or pasted errors. Text only —
        up to 1&nbsp;MB each / 5&nbsp;MB per session. Secrets are redacted on upload.
      </p>
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        disabled={disabled}
        accept={ACCEPT}
        onChange={(e) => {
          emit(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
