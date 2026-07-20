import type { KeyboardEvent } from "react";
import type {
  RegistrationViewId,
  RegistrationViewModel,
} from "../presentation-model";

const VIEW_LABELS: Record<RegistrationViewId, string> = {
  front: "Front",
  "profile-left": "Profile left",
  "profile-right": "Profile right",
};

export function ViewRail({
  onSelectView,
  selectedView,
  views,
}: {
  onSelectView: (view: RegistrationViewId) => void;
  selectedView: RegistrationViewId;
  views: RegistrationViewModel[];
}) {
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const currentIndex = views.findIndex((view) => view.view === selectedView);
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      const next = views[(currentIndex + 1) % views.length]!;
      onSelectView(next.view);
    }
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      const next = views[(currentIndex - 1 + views.length) % views.length]!;
      onSelectView(next.view);
    }
  };

  return (
    <nav
      aria-label="Registration views"
      className="rr-view-rail"
      onKeyDown={onKeyDown}
    >
      <header>
        <small>Gate 1 · v8</small>
        <strong>Views</strong>
      </header>
      {views.map((view) => (
        <button
          aria-label={`${VIEW_LABELS[view.view]} — ${view.counts.components} components, ${view.counts.joints} joints, ${view.counts.unresolved} unresolved, ${view.decision}`}
          aria-pressed={view.view === selectedView}
          className={view.view === selectedView ? "is-selected" : ""}
          key={view.view}
          onClick={() => onSelectView(view.view)}
          type="button"
        >
          <strong>{VIEW_LABELS[view.view]}</strong>
          <span>
            {view.counts.components} components · {view.counts.joints} joints
          </span>
          <span className="rr-view-status">
            <em className={view.counts.unresolved > 0 ? "is-blocked" : "is-ok"}>
              {view.counts.unresolved} unresolved
            </em>
            <small>{view.decision}</small>
          </span>
        </button>
      ))}
    </nav>
  );
}
