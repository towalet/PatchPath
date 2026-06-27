import type { UploadedFileMeta } from "../../types/diagnostics";

/** Lists uploaded files with type, size, and redaction count. Scaffold stub. */
export function UploadedFileList(_props: { files: UploadedFileMeta[] }) {
  return <ul data-component="uploaded-file-list">{/* TODO: render file rows */}</ul>;
}
