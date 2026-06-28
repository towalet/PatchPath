import { useState } from "react";

/**
 * Copyable list of commands to run, rendered in mono. Nothing is ever
 * auto-applied — these are for the user to review and run themselves.
 */
export function CommandList({ commands }: { commands: string[] }) {
  if (!commands.length) {
    return <p className="prose">No commands were suggested.</p>;
  }
  return (
    <div className="cmds">
      {commands.map((command, i) => (
        <CommandRow key={i} command={command} />
      ))}
    </div>
  );
}

function CommandRow({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="cmd">
      <span className="cmd__prompt" aria-hidden="true">
        $
      </span>
      <code>{command}</code>
      <button type="button" onClick={copy} aria-label={`Copy command: ${command}`}>
        {copied ? "COPIED" : "COPY"}
      </button>
    </div>
  );
}
