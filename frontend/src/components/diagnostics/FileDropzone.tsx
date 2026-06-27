/**
 * Drag-and-drop / file-picker for evidence uploads. Shows accepted types and
 * size limits; surfaces per-file validation errors. Scaffold stub.
 */
interface FileDropzoneProps {
  onFiles?: (files: File[]) => void;
  disabled?: boolean;
}

export function FileDropzone(_props: FileDropzoneProps) {
  return <div data-component="file-dropzone">{/* TODO: dropzone UI */}</div>;
}
