import { MessageSquareText, Sparkles } from "lucide-react";

export function DirectorCommandPanel({
  beatLabel,
  beatText,
  command,
  error,
  onCommandChange,
  onPreview,
}: {
  beatLabel: string;
  beatText: string;
  command: string;
  error: string | null;
  onCommandChange: (value: string) => void;
  onPreview: () => void;
}) {
  return (
    <section className="director-command-panel" aria-label="Direct this beat">
      <header>
        <span>
          <MessageSquareText size={18} />
        </span>
        <div>
          <small>Direct this beat · {beatLabel}</small>
          <strong>{beatText}</strong>
        </div>
      </header>
      <div className="director-command-row">
        <input
          aria-label="Direction for selected beat"
          onChange={(event) => onCommandChange(event.target.value)}
          placeholder="Try: Make the reaction 6 frames later"
          value={command}
        />
        <button disabled={!command.trim()} onClick={onPreview} type="button">
          <Sparkles size={16} /> Preview change
        </button>
      </div>
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}
