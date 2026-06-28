import type { UploadedFileMeta } from "../../types/diagnostics";
import { formatBytes } from "../../utils/format";

/** Lists uploaded files with type, size, line count, and redaction count. */
export function UploadedFileList({ files }: { files: UploadedFileMeta[] }) {
  if (!files.length) return null;
  return (
    <div className="filelist">
      {files.map((f) => (
        <div className="filelist__item" key={f.id}>
          <span className="glyph glyph--muted" aria-hidden="true" />
          <span className="filelist__name">{f.filename}</span>
          <span className="filelist__meta">
            <span>{f.file_type || "text"}</span>
            <span>{f.line_count} lines</span>
            <span>{formatBytes(f.size_bytes)}</span>
            {f.redaction_count > 0 ? <span>{f.redaction_count} redacted</span> : null}
          </span>
        </div>
      ))}
    </div>
  );
}
