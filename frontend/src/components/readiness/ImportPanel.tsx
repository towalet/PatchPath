import { useState } from "react";
import { GithubImportForm } from "./GithubImportForm";
import { ZipDropzone } from "./ZipDropzone";
import { FolderPicker } from "./FolderPicker";

type Tab = "github" | "zip" | "folder";

interface ImportPanelProps {
  disabled?: boolean;
  onGithub: (repoUrl: string) => void;
  onZip: (file: File) => void;
  onFolder: (files: File[]) => void;
}

const TABS: { id: Tab; label: string; eyebrow: string }[] = [
  { id: "github", label: "GitHub Repo", eyebrow: "// GITHUB_URL" },
  { id: "zip", label: "Upload ZIP", eyebrow: "// ZIP_UPLOAD" },
  { id: "folder", label: "Upload Folder", eyebrow: "// FOLDER_UPLOAD" },
];

export function ImportPanel({ disabled, onGithub, onZip, onFolder }: ImportPanelProps) {
  const [active, setActive] = useState<Tab>("github");

  return (
    <div className="grid" style={{ gap: "var(--space-5)" }}>
      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="Import method"
        style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active === tab.id}
            data-variant={active === tab.id ? "primary" : "secondary"}
            data-size="sm"
            disabled={disabled}
            onClick={() => setActive(tab.id)}
            style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.02em" }}
          >
            <span
              className={`glyph glyph--sm ${active === tab.id ? "glyph--on" : "glyph--muted"}`}
              aria-hidden="true"
            />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active tab eyebrow */}
      <span className="eyebrow">
        <span className="glyph glyph--on glyph--sm" />
        {TABS.find((t) => t.id === active)?.eyebrow}
      </span>

      {/* Tab content */}
      {active === "github" && (
        <GithubImportForm onImport={onGithub} disabled={disabled} />
      )}
      {active === "zip" && (
        <ZipDropzone onFile={onZip} disabled={disabled} />
      )}
      {active === "folder" && (
        <FolderPicker onFiles={onFolder} disabled={disabled} />
      )}
    </div>
  );
}
