import { useState } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

interface GithubImportFormProps {
  onImport: (repoUrl: string) => void;
  disabled?: boolean;
}

function isValidGithubUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname === "github.com" && u.pathname.split("/").filter(Boolean).length >= 2;
  } catch {
    return false;
  }
}

export function GithubImportForm({ onImport, disabled }: GithubImportFormProps) {
  const [url, setUrl] = useState("");
  const [touched, setTouched] = useState(false);

  const valid = isValidGithubUrl(url.trim());
  const showError = touched && url.trim() !== "" && !valid;

  return (
    <div className="grid" style={{ gap: "var(--space-4)" }}>
      <p className="prose" style={{ margin: 0, color: "var(--color-text-muted)" }}>
        Enter a public GitHub repository URL. PatchPath downloads the default branch and
        analyzes its deployment configuration.
      </p>
      <Input
        label="Repository URL"
        name="repo_url"
        type="url"
        value={url}
        disabled={disabled}
        placeholder="https://github.com/owner/repo"
        onChange={(e) => setUrl(e.target.value)}
        onBlur={() => setTouched(true)}
        error={showError ? "Enter a valid github.com URL (e.g. https://github.com/owner/repo)" : undefined}
      />
      {!showError && (
        <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-faint)" }}>
          Public repositories only.
        </p>
      )}
      <div>
        <Button
          dot
          disabled={disabled || !valid}
          onClick={() => onImport(url.trim())}
        >
          Import repository
        </Button>
      </div>
    </div>
  );
}
