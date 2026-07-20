import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";
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

const tabElementId = (view: string, kind: DiagnosticTabKind) =>
  `rr-tab-${view}-${kind}`;
const PANEL_ID = "rr-stage-tabpanel";

export function DiagnosticStage({ view }: { view: RegistrationViewModel }) {
  const [activeTab, setActiveTab] = useState<DiagnosticTabKind>("original");
  const [zoom, setZoom] = useState<"fit" | "full">("fit");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const image = view.images.find((entry) => entry.kind === activeTab);

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const kinds = view.images.map((entry) => entry.kind);
    const currentIndex = kinds.indexOf(activeTab);
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % kinds.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + kinds.length) % kinds.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = kinds.length - 1;
    }
    if (nextIndex === null) return;
    event.preventDefault();
    const nextKind = kinds[nextIndex]!;
    setActiveTab(nextKind);
    tabRefs.current[nextIndex]?.focus();
  };

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
        {view.images.map((entry, index) => (
          <button
            aria-controls={PANEL_ID}
            aria-selected={entry.kind === activeTab}
            className={entry.kind === activeTab ? "is-active" : ""}
            id={tabElementId(view.view, entry.kind)}
            key={entry.kind}
            onClick={() => setActiveTab(entry.kind)}
            onKeyDown={onTabKeyDown}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            role="tab"
            tabIndex={entry.kind === activeTab ? 0 : -1}
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
        aria-labelledby={tabElementId(view.view, activeTab)}
        className="rr-stage-panel"
        id={PANEL_ID}
        role="tabpanel"
      >
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
        {image ? (
          <p className="rr-stage-binding">
            {image.url ? (
              <>
                <code className="rr-stage-binding-url">{image.url}</code>
                <code className="rr-stage-binding-hash">
                  sha256 {image.sha256}
                </code>
                <span>
                  {image.width}×{image.height}
                </span>
              </>
            ) : (
              <span>No image reference supplied for this tab.</span>
            )}
          </p>
        ) : null}
      </div>
    </section>
  );
}
