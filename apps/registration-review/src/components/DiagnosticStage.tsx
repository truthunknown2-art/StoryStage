import { useState } from "react";
import type {
  DiagnosticTabKind,
  RegistrationViewModel,
} from "../presentation-model";

const TAB_LABELS: Record<DiagnosticTabKind, string> = {
  original: "Original",
  seams: "Seams",
  rest: "Rest",
  "minus-15": "−15°",
  zero: "0°",
  "plus-15": "+15°",
  "gap-orbit": "Gap/orbit",
  "z-order-near-far": "Near/far",
  masked: "Masked",
};

export function DiagnosticStage({ view }: { view: RegistrationViewModel }) {
  const [activeTab, setActiveTab] = useState<DiagnosticTabKind>("original");
  const [zoom, setZoom] = useState<"fit" | "full">("fit");
  const image = view.images.find((entry) => entry.kind === activeTab);

  return (
    <section aria-label="Diagnostic evidence" className="rr-stage">
      <header className="rr-stage-heading">
        <div>
          <small>{view.view}</small>
          <h2>Diagnostic evidence</h2>
        </div>
        <div
          aria-label="Stage zoom"
          className="rr-stage-zoom"
          role="group"
        >
          <button
            aria-pressed={zoom === "fit"}
            onClick={() => setZoom("fit")}
            type="button"
          >
            Fit
          </button>
          <button
            aria-pressed={zoom === "full"}
            onClick={() => setZoom("full")}
            type="button"
          >
            100%
          </button>
        </div>
      </header>
      <div
        aria-label="Diagnostic tabs"
        className="rr-stage-tabs"
        role="tablist"
      >
        {view.images.map((entry) => (
          <button
            aria-selected={entry.kind === activeTab}
            className={entry.kind === activeTab ? "is-active" : ""}
            key={entry.kind}
            onClick={() => setActiveTab(entry.kind)}
            role="tab"
            type="button"
          >
            {TAB_LABELS[entry.kind]}
            {entry.url === null ? (
              <em className="rr-tab-missing">unavailable</em>
            ) : null}
          </button>
        ))}
      </div>
      <div
        className={`rr-stage-canvas ${zoom === "full" ? "is-full-zoom" : ""}`}
      >
        {image?.url ? (
          /* Diagnostic image reference supplied by the host model. */
          /* eslint-disable-next-line @remotion/warn-native-media-tag */
          <img
            alt={`${TAB_LABELS[image.kind]} diagnostic evidence for the ${view.view} view`}
            src={image.url}
          />
        ) : (
          <div className="rr-stage-unavailable" role="status">
            <strong>Evidence unavailable</strong>
            <span>
              No host-supplied image exists for the {TAB_LABELS[activeTab]}{" "}
              tab of the {view.view} view.
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
