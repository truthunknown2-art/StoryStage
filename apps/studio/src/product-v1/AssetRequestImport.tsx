import { useEffect, useRef, useState } from "react";
import type { ResolvedSceneRequirement } from "./asset-requirements";
import {
  EXPECTED_STRUCTURE_TRUTH,
  MANUAL_WORKFLOW_TRUTH,
  REFERENCE_TRUTH,
  type RequestPack,
} from "./asset-request-pack";
import {
  DROP_INTENT_TRUTH,
  IMPORT_STATE_LABELS,
  PICKER_INTENT_TRUTH,
  SOURCE_FIELD_TRUTH,
  LICENSE_FIELD_TRUTH,
  acceptedDeclaredFormat,
  demoCandidatesFor,
  transitionImport,
  type ImportEvent,
  type ImportWorkflowState,
  type LocalCandidateRecord,
} from "./asset-import";

/**
 * F4-WP3 scene-scoped request-pack preview and deterministic candidate-import
 * flow. Every control performs a bounded local-state action or explains why
 * it is unavailable; nothing reads or writes real bytes, copies text, opens a
 * tool, generates, downloads, uploads, approves, or productionizes anything.
 * Focus enters the panel deliberately on open, invalid submission moves focus
 * to the readable error, and Escape/Cancel/close restore focus to the
 * invoking "Request image pack" control (handled by the parent).
 */
export function AssetRequestImport({
  item,
  pack,
  reviewList,
  onConfirmRecord,
  onClose,
}: {
  item: ResolvedSceneRequirement;
  pack: RequestPack;
  reviewList: readonly LocalCandidateRecord[];
  onConfirmRecord: (record: LocalCandidateRecord) => void;
  onClose: () => void;
}) {
  const [state, setState] = useState<ImportWorkflowState>({ kind: "idle" });
  const candidates = demoCandidatesFor(pack);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const sourceRef = useRef<HTMLInputElement | null>(null);
  const licenseRef = useRef<HTMLInputElement | null>(null);
  const alertRef = useRef<HTMLParagraphElement | null>(null);
  const noteRef = useRef<HTMLParagraphElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    headingRef.current?.focus();
    mountedRef.current = true;
  }, []);

  /* Invalid submission moves focus to the readable error, terminal states
   * move focus to their alert or notice, and any transition that unmounted
   * the previously focused control recovers focus into the panel so keyboard
   * flow (Escape, Tab) always continues from inside it. Focus that is
   * already inside the panel is never yanked. */
  useEffect(() => {
    if (!mountedRef.current) return;
    const panel = panelRef.current;
    if (!panel) return;
    /* Entering a missing-field state always lands focus on the field that
     * failed validation, even when the invoker control survived the
     * transition (the missing-source and missing-license branches share one
     * DOM subtree). */
    if (state.kind === "missing-source") {
      sourceRef.current?.focus();
      return;
    }
    if (state.kind === "missing-license") {
      licenseRef.current?.focus();
      return;
    }
    if (panel.contains(document.activeElement)) return;
    if (
      state.kind === "wrong-format" ||
      state.kind === "duplicate" ||
      state.kind === "unavailable"
    )
      alertRef.current?.focus();
    else if (state.kind === "cancelled" || state.kind === "confirmed")
      noteRef.current?.focus();
    else if (state.kind === "reviewing") sourceRef.current?.focus();
    else
      panel
        .querySelector<HTMLElement>(".pv1-request-import button")
        ?.focus();
  }, [state.kind]);

  const send = (event: ImportEvent) => {
    const next = transitionImport(state, event, {
      pack,
      candidates,
      reviewList,
    });
    if (next.kind === "confirmed" && state.kind !== "confirmed")
      onConfirmRecord(next.record);
    setState(next);
  };

  const candidateFor = (candidateId: string) =>
    candidates.find((candidate) => candidate.id === candidateId) ?? null;

  const reviewingCandidate =
    state.kind === "reviewing" ||
    state.kind === "confirming" ||
    state.kind === "missing-source" ||
    state.kind === "missing-license" ||
    state.kind === "wrong-format" ||
    state.kind === "duplicate"
      ? candidateFor(state.candidateId)
      : null;

  const sourceValue =
    state.kind === "reviewing" ||
    state.kind === "confirming" ||
    state.kind === "missing-source" ||
    state.kind === "missing-license" ||
    state.kind === "wrong-format" ||
    state.kind === "duplicate"
      ? state.source
      : "";
  const licenseValue =
    state.kind === "reviewing" ||
    state.kind === "confirming" ||
    state.kind === "missing-source" ||
    state.kind === "missing-license" ||
    state.kind === "wrong-format" ||
    state.kind === "duplicate"
      ? state.license
      : "";

  const coverageText = (coveredViews: readonly string[]) => {
    if (coveredViews.length === 0)
      return "Covers none of the expected views.";
    const missing = pack.expectedViews.filter(
      (view) => !coveredViews.includes(view),
    );
    if (missing.length === 0)
      return `Covers every expected view: ${coveredViews.join(", ")}.`;
    return `Covers: ${coveredViews.join(", ")}. Not covered: ${missing.join(", ")}.`;
  };

  const candidateSummary = (candidateId: string) => {
    const candidate = candidateFor(candidateId);
    if (!candidate) return null;
    return (
      <dl className="pv1-request-candidate-summary">
        <div>
          <dt>Proposed name</dt>
          <dd>{candidate.name}</dd>
        </div>
        <div>
          <dt>Declared format</dt>
          <dd>
            {candidate.declaredFormat} — declared demo metadata, not media
            sniffing or decoding
          </dd>
        </div>
        <div>
          <dt>Reference association</dt>
          <dd>
            {pack.references.find(
              (reference) => reference.id === candidate.referenceId,
            )?.label ?? candidate.referenceId}
          </dd>
        </div>
        <div>
          <dt>Expected-view coverage</dt>
          <dd>{coverageText(candidate.coveredViews)}</dd>
        </div>
      </dl>
    );
  };

  const editFields = (editable: boolean) => (
    <>
      <div className="pv1-request-field">
        <label htmlFor={`pv1-source-${pack.requirementId}`}>
          Source (required)
        </label>
        <input
          aria-describedby={`pv1-source-truth-${pack.requirementId}`}
          aria-invalid={state.kind === "missing-source" ? "true" : undefined}
          disabled={!editable}
          id={`pv1-source-${pack.requirementId}`}
          onChange={(event) =>
            send({ type: "edit-source", value: event.target.value })
          }
          placeholder="Where this candidate came from, in your own words"
          ref={sourceRef}
          type="text"
          value={sourceValue}
        />
        <small id={`pv1-source-truth-${pack.requirementId}`}>
          {SOURCE_FIELD_TRUTH}
        </small>
      </div>
      <div className="pv1-request-field">
        <label htmlFor={`pv1-license-${pack.requirementId}`}>
          License / rights (required)
        </label>
        <input
          aria-describedby={`pv1-license-truth-${pack.requirementId}`}
          aria-invalid={state.kind === "missing-license" ? "true" : undefined}
          disabled={!editable}
          id={`pv1-license-${pack.requirementId}`}
          onChange={(event) =>
            send({ type: "edit-license", value: event.target.value })
          }
          placeholder="The usage rights you believe you have, in your own words"
          ref={licenseRef}
          type="text"
          value={licenseValue}
        />
        <small id={`pv1-license-truth-${pack.requirementId}`}>
          {LICENSE_FIELD_TRUTH}
        </small>
      </div>
    </>
  );

  return (
    <section
      aria-label={`Request image pack for ${pack.plannedName} in ${pack.sceneLabel}`}
      className="pv1-request"
      data-testid="pv1-request"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        if (
          state.kind === "idle" ||
          state.kind === "cancelled" ||
          state.kind === "confirmed"
        )
          onClose();
        else send({ type: "cancel" });
      }}
      ref={panelRef}
    >
      <header className="pv1-request-head">
        <div>
          <small>Request image pack · scene-scoped</small>
          <h3 ref={headingRef} tabIndex={-1}>
            {pack.plannedName}
          </h3>
          <p className="pv1-request-context">
            {pack.sceneLabel} · {pack.categoryLabel} · Current blocker:{" "}
            {pack.blocker}
          </p>
        </div>
        <button
          aria-label={`Close request panel for ${pack.plannedName}`}
          className="pv1-secondary pv1-request-close"
          onClick={onClose}
          type="button"
        >
          Close
        </button>
      </header>

      <div className="pv1-request-pack">
        <h4>Request pack preview</h4>
        <p className="pv1-request-truth" role="note">
          {pack.truthNote}
        </p>
        <div className="pv1-request-field">
          <label htmlFor={`pv1-prompt-${pack.requirementId}`}>
            Request prompt (select and copy it yourself)
          </label>
          <textarea
            id={`pv1-prompt-${pack.requirementId}`}
            readOnly
            rows={4}
            value={pack.prompt}
          />
        </div>
        <div className="pv1-request-block">
          <h5>Reference attachments</h5>
          <ul>
            {pack.references.map((reference) => (
              <li key={reference.id}>
                <strong>{reference.label}</strong>
                <span>{reference.description}</span>
              </li>
            ))}
          </ul>
          <p className="pv1-request-truth" role="note">
            {REFERENCE_TRUTH}
          </p>
        </div>
        <div className="pv1-request-columns">
          <div className="pv1-request-block">
            <h5>Expected views</h5>
            <ul>
              {pack.expectedViews.map((view) => (
                <li key={view}>{view}</li>
              ))}
            </ul>
          </div>
          <div className="pv1-request-block">
            <h5>Expected layers</h5>
            <ul>
              {pack.expectedLayers.map((layer) => (
                <li key={layer}>{layer}</li>
              ))}
            </ul>
          </div>
        </div>
        <p className="pv1-request-truth" role="note">
          {EXPECTED_STRUCTURE_TRUTH}
        </p>
        <p className="pv1-request-use">
          <strong>Intended use:</strong> {pack.intendedUse}
        </p>
      </div>

      <div className="pv1-request-guidance">
        <h4>Manual workflow — outside StoryStage</h4>
        <ol>
          <li>
            Select and copy the prompt text above yourself. Nothing was copied
            to your clipboard — this demo has no clipboard access.
          </li>
          <li>
            Take it to an image tool you choose. This demo did not and cannot
            open any site or tool for you.
          </li>
          <li>
            Create the image there. Nothing is generated here, and no
            generation is ever running in the background.
          </li>
          <li>
            Come back with candidate files, then exercise the demo import flow
            below — it records descriptive metadata only and never reads file
            bytes.
          </li>
        </ol>
        <p className="pv1-request-truth" role="note">
          {MANUAL_WORKFLOW_TRUTH}
        </p>
      </div>

      <div className="pv1-request-import">
        <h4>Candidate import (demo records only)</h4>
        <p className="pv1-request-status">
          Import state: <strong>{IMPORT_STATE_LABELS[state.kind]}</strong>
        </p>

        {state.kind === "idle" ? (
          <div className="pv1-request-actions">
            <button
              className="pv1-secondary"
              onClick={() => send({ type: "begin-choose" })}
              type="button"
            >
              Choose a declared demo candidate
            </button>
            <button
              className="pv1-secondary"
              onClick={() => send({ type: "declare-drop-intent" })}
              type="button"
            >
              Declare drop intent
            </button>
            <p className="pv1-request-truth" role="note">
              No file picker, clipboard, or drag/drop byte access exists in
              this demo — only the declared demo candidates below can be
              reviewed.
            </p>
          </div>
        ) : null}

        {state.kind === "selection-pending" ? (
          <div className="pv1-request-actions">
            <p className="pv1-request-truth" role="note">
              {state.intent === "drop" ? DROP_INTENT_TRUTH : PICKER_INTENT_TRUTH}
            </p>
            <ul className="pv1-request-candidates">
              {candidates.map((candidate) => (
                <li key={candidate.id}>
                  <button
                    className="pv1-secondary pv1-request-candidate"
                    onClick={() =>
                      send({
                        type: "choose-candidate",
                        candidateId: candidate.id,
                      })
                    }
                    type="button"
                  >
                    <strong>{candidate.name}</strong>
                    <small>
                      Declared format: {candidate.declaredFormat} ·{" "}
                      {coverageText(candidate.coveredViews)}
                    </small>
                  </button>
                </li>
              ))}
            </ul>
            <button
              className="pv1-secondary"
              onClick={() => send({ type: "cancel" })}
              type="button"
            >
              Cancel import
            </button>
          </div>
        ) : null}

        {state.kind === "reviewing" && reviewingCandidate ? (
          <div className="pv1-request-actions">
            {candidateSummary(reviewingCandidate.id)}
            {editFields(true)}
            <div className="pv1-request-buttons">
              <button
                className="pv1-secondary"
                onClick={() => send({ type: "continue-to-confirmation" })}
                type="button"
              >
                Continue to confirmation
              </button>
              <button
                className="pv1-secondary"
                onClick={() => send({ type: "cancel" })}
                type="button"
              >
                Cancel import
              </button>
            </div>
          </div>
        ) : null}

        {state.kind === "missing-source" || state.kind === "missing-license" ? (
          <div className="pv1-request-actions">
            <p
              className="pv1-request-alert"
              ref={alertRef}
              role="alert"
              tabIndex={-1}
            >
              {state.reason}
            </p>
            {candidateSummary(state.candidateId)}
            {editFields(true)}
            <div className="pv1-request-buttons">
              <button
                className="pv1-secondary"
                onClick={() => send({ type: "continue-to-confirmation" })}
                type="button"
              >
                Continue to confirmation
              </button>
              <button
                className="pv1-secondary"
                onClick={() => send({ type: "cancel" })}
                type="button"
              >
                Cancel import
              </button>
            </div>
          </div>
        ) : null}

        {state.kind === "wrong-format" || state.kind === "duplicate" ? (
          <div className="pv1-request-actions">
            <p
              className="pv1-request-alert"
              ref={alertRef}
              role="alert"
              tabIndex={-1}
            >
              {state.reason}
            </p>
            {candidateSummary(state.candidateId)}
            <div className="pv1-request-buttons">
              <button
                className="pv1-secondary"
                onClick={() => send({ type: "start-over" })}
                type="button"
              >
                Start over
              </button>
              <button
                className="pv1-secondary"
                onClick={() => send({ type: "cancel" })}
                type="button"
              >
                Cancel import
              </button>
            </div>
          </div>
        ) : null}

        {state.kind === "unavailable" ? (
          <div className="pv1-request-actions">
            <p
              className="pv1-request-alert"
              ref={alertRef}
              role="alert"
              tabIndex={-1}
            >
              {state.reason}
            </p>
            <div className="pv1-request-buttons">
              <button
                className="pv1-secondary"
                onClick={() => send({ type: "start-over" })}
                type="button"
              >
                Start over
              </button>
              <button className="pv1-secondary" onClick={onClose} type="button">
                Close panel
              </button>
            </div>
          </div>
        ) : null}

        {state.kind === "cancelled" ? (
          <div className="pv1-request-actions">
            <p
              className="pv1-request-note"
              ref={noteRef}
              role="status"
              tabIndex={-1}
            >
              {state.truth}
            </p>
            <div className="pv1-request-buttons">
              <button
                className="pv1-secondary"
                onClick={() => send({ type: "start-over" })}
                type="button"
              >
                Start over
              </button>
              <button className="pv1-secondary" onClick={onClose} type="button">
                Close panel
              </button>
            </div>
          </div>
        ) : null}

        {state.kind === "confirming" && reviewingCandidate ? (
          <div className="pv1-request-actions">
            {candidateSummary(reviewingCandidate.id)}
            {editFields(false)}
            <p className="pv1-request-truth" role="note">
              Confirmation admits only a session-local descriptive candidate
              record to the review list below. It is not an import, upload,
              generation, review, approval, preparation, rig, readiness, or
              production promotion.
            </p>
            <div className="pv1-request-buttons">
              <button
                className="pv1-secondary"
                disabled={
                  !acceptedDeclaredFormat(
                    reviewingCandidate.declaredFormat,
                  ) ||
                  state.source.trim() === "" ||
                  state.license.trim() === ""
                }
                onClick={() => send({ type: "confirm" })}
                type="button"
              >
                Confirm local candidate record
              </button>
              <button
                className="pv1-secondary"
                onClick={() => send({ type: "edit-metadata" })}
                type="button"
              >
                Edit metadata
              </button>
              <button
                className="pv1-secondary"
                onClick={() => send({ type: "cancel" })}
                type="button"
              >
                Cancel import
              </button>
            </div>
          </div>
        ) : null}

        {state.kind === "confirmed" ? (
          <div className="pv1-request-actions">
            <p
              className="pv1-request-note"
              ref={noteRef}
              role="status"
              tabIndex={-1}
            >
              {state.record.truth}
            </p>
            <dl className="pv1-request-candidate-summary">
              <div>
                <dt>Local candidate record</dt>
                <dd>{state.record.name}</dd>
              </div>
              <div>
                <dt>Declared format</dt>
                <dd>{state.record.declaredFormat}</dd>
              </div>
              <div>
                <dt>Source (your words)</dt>
                <dd>{state.record.source}</dd>
              </div>
              <div>
                <dt>License / rights (your words)</dt>
                <dd>{state.record.license}</dd>
              </div>
            </dl>
            <button className="pv1-secondary" onClick={onClose} type="button">
              Close panel
            </button>
          </div>
        ) : null}
      </div>

      <div className="pv1-request-review">
        <h4>
          Local candidate records for this requirement ({reviewList.length})
        </h4>
        {reviewList.length === 0 ? (
          <p className="pv1-request-truth" role="note">
            None yet. Confirmation above admits only a session-local
            descriptive record here — never a file, and it changes no
            readiness or counts.
          </p>
        ) : (
          <ul>
            {reviewList.map((record) => (
              <li key={record.id}>
                <strong>{record.name}</strong>
                <small>
                  Declared format: {record.declaredFormat} · Source:{" "}
                  {record.source} · License: {record.license} ·{" "}
                  {coverageText(record.coveredViews)}
                </small>
                <span>{record.truth}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="pv1-request-scope" role="note">
        Requirement {item.entry.id} · {pack.sceneLabel} · {pack.categoryLabel}{" "}
        — this panel never retains candidates from another scene, category, or
        requirement scope.
      </p>
    </section>
  );
}
