import { useEffect, useRef, useState } from "react";
import type { ResolvedSceneRequirement } from "./asset-requirements";
import { requirementSceneLabel } from "./asset-requirements";
import { assetCategoryLabel } from "./asset-workspace";
import { LICENSE_FIELD_TRUTH, SOURCE_FIELD_TRUTH } from "./asset-import";
import type { LocalCandidateRecord } from "./asset-import";
import {
  DECLARED_METADATA_TRUTH,
  FIXTURE_SOURCE_TRUTH,
  FUTURE_WORKFLOW_TRUTH,
  REVIEW_EXAMPLE_LABELS,
  REVIEW_READY_TRUTH,
  REVIEW_STATE_DISCLAIMER,
  REVIEW_STATE_LABELS,
  resolveReviewList,
  type ResolvedCharacterRigReview,
  type ResolvedLayeredSetReview,
  type ResolvedReview,
  type ReviewFixture,
} from "./asset-review";

/**
 * F4-WP4 scene-scoped layer-and-rig review panel. It displays the declared
 * local demo review fixtures for one requirement and derives Incomplete,
 * Needs correction, and Review-ready mechanically from the displayed facts.
 * Nothing here reads bytes, inspects pixels, slices artwork, calculates
 * pivots, generates masks, builds rigs, approves, promotes, or claims any
 * production state. Focus enters the labelled heading on open; Escape and
 * Close hand focus back to the invoking row control (handled by the parent);
 * switching to a fail-closed example moves focus to its readable alert;
 * switching examples never changes requirement counts/readiness.
 */
export function AssetReview({
  fixtures,
  item,
  onClose,
  sessionCandidates = [],
}: {
  fixtures: readonly ReviewFixture[];
  item: ResolvedSceneRequirement;
  onClose: () => void;
  sessionCandidates?: readonly LocalCandidateRecord[];
}) {
  const resolved = resolveReviewList(item, fixtures, sessionCandidates);
  const [selectedId, setSelectedId] = useState<string | null>(
    resolved[0]?.fixture.id ?? null,
  );

  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const alertRef = useRef<HTMLParagraphElement | null>(null);

  const active =
    resolved.find((entry) => entry.fixture.id === selectedId) ??
    resolved[0] ??
    null;
  const activeFixtureId = active?.fixture.id ?? null;
  const activeUnavailableReason = active?.unavailableReason ?? null;

  /* Opening moves focus into the labelled review heading; a fail-closed
   * unavailable review instead moves focus to its readable alert. Switching
   * to a fail-closed example also focuses that newly mounted alert. */
  const didFocusInitialTargetRef = useRef(false);
  useEffect(() => {
    if (!didFocusInitialTargetRef.current) {
      didFocusInitialTargetRef.current = true;
      if (activeFixtureId !== null && activeUnavailableReason !== null)
        alertRef.current?.focus();
      else headingRef.current?.focus();
      return;
    }
    if (activeFixtureId !== null && activeUnavailableReason !== null)
      alertRef.current?.focus();
  }, [activeFixtureId, activeUnavailableReason]);

  /* Fail-closed backstop: if the selected example identity is no longer
   * declared for this requirement, fall to the first declared example — a
   * stale review identity can never survive a scope or fixture change. */
  if (active !== null && active.fixture.id !== selectedId) {
    setSelectedId(active.fixture.id);
  }

  const sceneLabel = requirementSceneLabel(item.entry.sceneId);
  const categoryLabel = assetCategoryLabel(item.entry.category);
  const kindLabel =
    item.entry.category === "layered-sets" ? "Layered-set review" : "Layer & rig review";

  return (
    <section
      aria-label={`${kindLabel} for ${item.entry.plannedName} in ${sceneLabel}`}
      className="pv1-review"
      data-testid="pv1-review"
      id={`pv1-review-${item.entry.id}`}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        onClose();
      }}
    >
      <header className="pv1-review-head">
        <div>
          <small>{kindLabel} · scene-scoped</small>
          <h3 ref={headingRef} tabIndex={-1}>
            {item.entry.plannedName}
          </h3>
          <p className="pv1-review-context">
            {sceneLabel} · {categoryLabel} · Declared demo review fixtures —
            descriptive evidence only, no candidate file or derived artifact
            exists.
          </p>
        </div>
        <button
          aria-label={`Close review panel for ${item.entry.plannedName}`}
          className="pv1-secondary pv1-review-close"
          onClick={onClose}
          type="button"
        >
          Close
        </button>
      </header>

      {resolved.length > 1 ? (
        <div
          aria-label="Declared demo review examples"
          className="pv1-review-switch"
          role="group"
        >
          {resolved.map((entry) => (
            <button
              aria-current={
                active?.fixture.id === entry.fixture.id ? "true" : undefined
              }
              className={`pv1-secondary pv1-review-example ${active?.fixture.id === entry.fixture.id ? "is-selected" : ""}`}
              key={entry.fixture.id}
              onClick={() => setSelectedId(entry.fixture.id)}
              type="button"
            >
              {REVIEW_EXAMPLE_LABELS[entry.fixture.example]}
            </button>
          ))}
        </div>
      ) : null}

      {active === null ? (
        <p className="pv1-review-alert" role="alert" tabIndex={-1}>
          Unavailable — no declared demo review example exists for this
          requirement. This review fails closed as unavailable and is never
          counted or review-ready.
        </p>
      ) : active.unavailableReason !== null ? (
        <div className="pv1-review-actions">
          <p
            className="pv1-review-alert"
            ref={alertRef}
            role="alert"
            tabIndex={-1}
          >
            {active.unavailableReason}
          </p>
          <p className="pv1-review-truth" role="note">
            This review fails closed as unavailable: it shows no review state,
            enters no counts, and can never be review-ready.
          </p>
        </div>
      ) : (
        <ResolvedReviewBody review={active} />
      )}

      <p className="pv1-review-scope" role="note">
        Requirement {item.entry.id} · {sceneLabel} · {categoryLabel} — this
        panel never retains review state from another scene, category,
        requirement, or selected-record scope.
      </p>
    </section>
  );
}

function ResolvedReviewBody({ review }: { review: ResolvedReview }) {
  return (
    <div className="pv1-review-body">
      <p className="pv1-review-status">
        Review state:{" "}
        <strong className={`pv1-review-state is-${review.state}`}>
          {REVIEW_STATE_LABELS[review.state!]}
        </strong>
      </p>
      <p className="pv1-review-truth" role="note">
        {REVIEW_STATE_DISCLAIMER}
      </p>
      {review.state === "review-ready" ? (
        <p className="pv1-review-ready-truth" role="note">
          {REVIEW_READY_TRUTH}
        </p>
      ) : null}

      {review.state === "needs-correction" ? (
        <div className="pv1-review-block" data-testid="pv1-review-corrections">
          <h4>Contradictions to correct</h4>
          <ul>
            {review.contradictions.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {review.state === "incomplete" ? (
        <div className="pv1-review-block" data-testid="pv1-review-missing">
          <h4>Before this declaration could be review-ready</h4>
          <ul>
            {review.missing.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {review.kind === "character-rig" ? (
        <CharacterRigSections review={review} />
      ) : (
        <LayeredSetSections review={review} />
      )}

      <ChecklistSection review={review} />
      <CandidateSection review={review} />
      <FutureWorkflowSection />
    </div>
  );
}

function CharacterRigSections({
  review,
}: {
  review: ResolvedCharacterRigReview;
}) {
  return (
    <>
      <div className="pv1-review-block" data-testid="pv1-review-views">
        <h4>Turnaround views (required)</h4>
        <ul className="pv1-review-facts">
          {review.viewStatus.map((entry) => (
            <li key={entry.view}>
              <strong>{entry.view}</strong>
              <span
                className={`pv1-review-fact ${entry.declared ? "is-declared" : "is-missing"}`}
              >
                {entry.declared ? "Declared" : "Missing"}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="pv1-review-block" data-testid="pv1-review-parts">
        <h4>Part inventory (declared)</h4>
        {/* F4-WP5: the wide declared part table lives in a labelled,
         * keyboard-reachable contained horizontal scroller, so it can never
         * widen the document at compact viewports. The table itself carries
         * an accessible name; state text never relies on color alone. */}
        <div
          aria-label="Declared part inventory table — horizontally scrollable when wider than the panel"
          className="pv1-review-table-scroll"
          role="region"
          tabIndex={0}
        >
          <table
            aria-label="Declared part inventory (demo metadata)"
            className="pv1-review-table"
          >
            <thead>
              <tr>
                <th scope="col">Part ID</th>
                <th scope="col">Padded bounds (declared)</th>
                <th scope="col">Pivot (declared)</th>
                <th scope="col">Attachment intent</th>
              </tr>
            </thead>
            <tbody>
              {review.parts.map((part) => (
                <tr key={part.id}>
                  <th scope="row">
                    {part.id}
                    <small>{part.label}</small>
                  </th>
                  <td>
                    {part.bounds === null
                      ? "Not declared"
                      : `x ${part.bounds.x}, y ${part.bounds.y}, ${part.bounds.width} × ${part.bounds.height}, padding ${part.bounds.padding}`}
                  </td>
                  <td>
                    {part.pivot === null
                      ? "Not declared"
                      : `x ${part.pivot.x}, y ${part.pivot.y}`}
                  </td>
                  <td>
                    {part.attachment.parentPartId === null
                      ? "Root part"
                      : `Attached to ${part.attachment.parentPartId}`}
                    {" — "}
                    {part.attachment.intent}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {review.requiredPartStatus.some((entry) => !entry.declared) ? (
          <p className="pv1-review-note-inline" role="note">
            Required parts not declared:{" "}
            {review.requiredPartStatus
              .filter((entry) => !entry.declared)
              .map((entry) => entry.partId)
              .join(", ")}
            .
          </p>
        ) : null}
        <p className="pv1-review-truth" role="note">
          {DECLARED_METADATA_TRUTH}
        </p>
      </div>

      <div className="pv1-review-block" data-testid="pv1-review-masks">
        <h4>Mask declarations (required)</h4>
        {review.requiredMaskStatus.length === 0 && review.masks.length === 0 ? (
          <p className="pv1-review-note-inline" role="note">
            No masks are required by this declaration, and none are declared.
          </p>
        ) : (
          <ul className="pv1-review-facts">
            {review.requiredMaskStatus.map((entry) => (
              <li key={entry.maskId}>
                <strong>{entry.maskId}</strong>
                <span
                  className={`pv1-review-fact ${entry.declared ? "is-declared" : "is-missing"}`}
                >
                  {entry.declared ? "Declared" : "Missing"}
                </span>
              </li>
            ))}
            {review.masks.map((mask) => (
              <li key={`declared-${mask.id}`}>
                <strong>{mask.id}</strong>
                <span>
                  {mask.kind} mask applying to part {mask.appliesToPartId}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="pv1-review-block" data-testid="pv1-review-profiles">
        <h4>Supported profile coverage</h4>
        <ul className="pv1-review-facts">
          {review.profileStatus.map((entry) => (
            <li key={entry.profile}>
              <strong>{entry.profile}</strong>
              <span
                className={`pv1-review-fact ${entry.declared ? "is-declared" : "is-missing"}`}
              >
                {entry.declared ? "Declared" : "Not declared"}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="pv1-review-block" data-testid="pv1-review-expressions">
        <h4>Expressions and visemes (declared)</h4>
        <div className="pv1-review-columns">
          <div>
            <h5>Expressions</h5>
            {review.expressions.length === 0 ? (
              <p className="pv1-review-note-inline" role="note">
                No expressions declared.
              </p>
            ) : (
              <ul>
                {review.expressions.map((expression) => (
                  <li key={expression}>{expression}</li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h5>Visemes</h5>
            {review.visemes.length === 0 ? (
              <p className="pv1-review-note-inline" role="note">
                No visemes declared.
              </p>
            ) : (
              <ul>
                {review.visemes.map((viseme) => (
                  <li key={viseme}>{viseme}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function LayeredSetSections({ review }: { review: ResolvedLayeredSetReview }) {
  return (
    <>
      <div className="pv1-review-block" data-testid="pv1-review-planes">
        <h4>Plane declarations (explicit order)</h4>
        <ol className="pv1-review-planes">
          {review.orderedPlanes.map((plane) => (
            <li key={plane.id}>
              <strong>
                {plane.order}. {plane.plane}
              </strong>
              <span>
                {plane.id} — {plane.description}
              </span>
            </li>
          ))}
        </ol>
        <ul className="pv1-review-facts">
          {review.planeCoverage.map((entry) => (
            <li key={entry.plane}>
              <strong>{entry.plane}</strong>
              <span
                className={`pv1-review-fact ${entry.declared ? "is-declared" : "is-missing"}`}
              >
                {entry.declared ? "Declared" : "Missing"}
              </span>
            </li>
          ))}
        </ul>
        <p className="pv1-review-truth" role="note">
          {DECLARED_METADATA_TRUTH}
        </p>
      </div>

      <div className="pv1-review-block" data-testid="pv1-review-occluders">
        <h4>Foreground occluders (declared)</h4>
        {review.occluders.length === 0 ? (
          <p className="pv1-review-note-inline" role="note">
            No foreground occluders declared.
          </p>
        ) : (
          <ul className="pv1-review-facts">
            {review.occluders.map((occluder) => (
              <li key={occluder.id}>
                <strong>{occluder.id}</strong>
                <span>
                  On plane {occluder.planeId} — intended subject relationship:{" "}
                  {occluder.subjectRelationship}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function ChecklistSection({ review }: { review: ResolvedReview }) {
  const title =
    review.kind === "character-rig"
      ? "Motion-readiness checklist (declared)"
      : "Layered-set readiness checklist (declared)";
  return (
    <div className="pv1-review-block" data-testid="pv1-review-checklist">
      <h4>{title}</h4>
      <ul className="pv1-review-facts">
        {review.checklist.map((row) => (
          <li key={row.id}>
            <strong>{row.label}</strong>
            <span
              className={`pv1-review-fact ${row.pass ? "is-declared" : "is-missing"}`}
            >
              {row.pass ? "Pass" : "Blocked"}
            </span>
            {row.contradictory ? (
              <span className="pv1-review-contradiction">
                Declared as passing, but the declaration is incomplete —
                treated as blocked.
              </span>
            ) : null}
            {!row.pass && row.blockReason !== null ? (
              <span>{row.blockReason}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CandidateSection({ review }: { review: ResolvedReview }) {
  const candidate = review.candidate!;
  return (
    <div className="pv1-review-block" data-testid="pv1-review-candidate">
      <h4>Declared candidate and source/rights truth</h4>
      <dl className="pv1-review-candidate-summary">
        <div>
          <dt>Declared candidate identity</dt>
          <dd>
            {candidate.label} ({candidate.id})
          </dd>
        </div>
        <div>
          <dt>Declared format</dt>
          <dd>
            {candidate.declaredFormat} — declared demo metadata, not media
            sniffing or decoding
          </dd>
        </div>
        <div>
          <dt>Source ({candidate.provenance === "session-record" ? "your words" : "fixture-declared"})</dt>
          <dd>{candidate.source}</dd>
        </div>
        <div>
          <dt>
            License / rights (
            {candidate.provenance === "session-record" ? "your words" : "fixture-declared"})
          </dt>
          <dd>{candidate.license}</dd>
        </div>
      </dl>
      <p className="pv1-review-truth" role="note">
        {candidate.provenance === "session-record" ? (
          <>
            {SOURCE_FIELD_TRUTH} {LICENSE_FIELD_TRUTH}
          </>
        ) : (
          FIXTURE_SOURCE_TRUTH
        )}
      </p>
    </div>
  );
}

function FutureWorkflowSection() {
  return (
    <div className="pv1-review-block" data-testid="pv1-review-future">
      <h4>Later workflow (unavailable)</h4>
      <div className="pv1-review-future-row">
        {["Slice", "Generate mask", "Calculate pivot", "Build rig", "Approve"].map(
          (action) => (
            <button
              className="pv1-secondary"
              disabled
              key={action}
              type="button"
            >
              {action}
            </button>
          ),
        )}
      </div>
      <p className="pv1-review-truth" role="note">
        {FUTURE_WORKFLOW_TRUTH}
      </p>
    </div>
  );
}
