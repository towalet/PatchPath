import { useRef, useState } from "react";

const MAX_ZIP_BYTES = 50 * 1024 * 1024; // 50 MB client-side guard

interface ZipDropzoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export function ZipDropzone({ onFile, disabled }: ZipDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [sizeError, setSizeError] = useState("");

  const handleFile = (file: File | null | undefined) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setSizeError("Only .zip files are accepted.");
      return;
    }
    if (file.size > MAX_ZIP_BYTES) {
      setSizeError(`File is too large (max ${MAX_ZIP_BYTES / (1024 * 1024)} MB).`);
      return;
    }
    setSizeError("");
    onFile(file);
  };

  return (
    <div className="grid" style={{ gap: "var(--space-4)" }}>
      <p className="prose" style={{ margin: 0, color: "var(--color-text-muted)" }}>
        Upload a .zip archive of your project. PatchPath extracts it safely in memory
        and analyzes the deployment configuration.
      </p>
      <div
        className="dropzone"
        data-drag={drag || undefined}
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
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (!disabled) handleFile(e.dataTransfer.files[0]);
        }}
      >
        <span className="glyph glyph--on glyph--lg" aria-hidden="true" />
        <strong style={{ color: "var(--color-text)" }}>Drop .zip archive here or click to browse</strong>
        <p className="dropzone__hint">
          One .zip file — max 50 MB. Secrets are redacted. Zip-slip protected.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".zip"
          hidden
          disabled={disabled}
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      {sizeError ? (
        <p className="form__error" role="alert">
          <span className="glyph glyph--on glyph--sm" aria-hidden="true" />
          {sizeError}
        </p>
      ) : null}
    </div>
  );
}
