import { Check, RotateCcw, X } from "lucide-react";
import {
  describeDirectorPatch,
  type DirectorPatch,
} from "@storystage/story-engine/director-alpha";

export function DirectorChangePreview({
  patch,
  onApply,
  onCancel,
}: {
  patch: DirectorPatch;
  onApply: () => void;
  onCancel: () => void;
}) {
  return (
    <section className="director-change-preview" aria-label="Proposed change">
      <header>
        <div>
          <small>Structured proposal</small>
          <strong>Here is what StoryStage will change</strong>
        </div>
        <button
          aria-label="Cancel proposed change"
          onClick={onCancel}
          type="button"
        >
          <X size={16} />
        </button>
      </header>
      <ul>
        {describeDirectorPatch(patch).map((change) => (
          <li key={change}>
            <Check size={15} /> {change}
          </li>
        ))}
        <li>
          <Check size={15} /> Re-solve timing and preserve the other beat
          programs
        </li>
      </ul>
      <button className="director-apply-change" onClick={onApply} type="button">
        <RotateCcw size={16} /> Apply and replay this beat
      </button>
    </section>
  );
}
