/**
 * F4-WP3 deterministic session-local candidate-import workflow model.
 *
 * This module is a pure state machine over declared demo metadata. It never
 * reads or writes real bytes, files, drag/drop data-transfer content,
 * clipboards, filesystems, hosts, workers, providers, or persistence.
 * - Declared formats are local demo metadata, not media sniffing or decoding.
 * - Duplicate is a deterministic fixture identity collision, not a byte or
 *   hash comparison.
 * - Source and license are creator-entered local UI text; they do not prove
 *   provenance, ownership, permission, or legal sufficiency.
 * - Confirmation admits only a session-local descriptive candidate record to
 *   a bounded review list. It is not import, upload, generation, review,
 *   approval, preparation, rigging, readiness, or production promotion.
 *
 * Unknown or stale identities and invalid transitions fail closed into an
 * explicit `unavailable` state. Error and cancel paths never create a
 * candidate and never mutate the input review list or any other state.
 */

import type { RequestPack } from "./asset-request-pack";

/** Exact post-confirmation honesty sentence, shown verbatim after every
 * confirmed local candidate record. */
export const CONFIRMED_CANDIDATE_TRUTH =
  "Only a session-local descriptive candidate record now exists. No file was imported, uploaded, generated, reviewed, approved, prepared, rigged, or made ready, and no production-usable artifact exists.";

export const SOURCE_FIELD_TRUTH =
  "Creator-entered local UI text — it does not prove provenance, ownership, or that the source really provided this image.";

export const LICENSE_FIELD_TRUTH =
  "Creator-entered local UI text — it does not prove permission, license validity, or legal sufficiency.";

export const DROP_INTENT_TRUTH =
  "Drop intent recorded — this demo cannot read dropped bytes, files, or data-transfer content. Choose a declared demo candidate below to exercise the same review flow.";

export const PICKER_INTENT_TRUTH =
  "This demo has no file picker and cannot read file bytes. The declared demo candidates below stand in for files you would bring back from your own image tool.";

export const CANCELLED_TRUTH =
  "Import cancelled — no candidate was created, and the requirement, readiness, and counts are unchanged.";

/* ------------------------------------------------------------------ */
/* Declared demo candidates                                            */
/* ------------------------------------------------------------------ */

/** Declared candidate formats accepted by this bounded workflow. A declared
 * format is local demo metadata, never media sniffing or decoding. */
export const ACCEPTED_DECLARED_FORMATS = ["png", "jpg", "webp"] as const;

export const acceptedDeclaredFormat = (declaredFormat: string): boolean =>
  (ACCEPTED_DECLARED_FORMATS as readonly string[]).includes(
    declaredFormat.trim().toLowerCase(),
  );

export interface DemoCandidateFixture {
  id: string;
  name: string;
  declaredFormat: string;
  /** The request-pack reference this candidate claims association with. */
  referenceId: string;
  /** Expected views this candidate declares coverage for. */
  coveredViews: readonly string[];
}

/** The deterministic demo candidates standing in for files a creator would
 * bring back from their own image tool: one single-view candidate, one
 * full-coverage sheet, and one wrong-format record for the fail-closed path.
 * The same pack always yields the same candidates. */
export const demoCandidatesFor = (
  pack: RequestPack,
): readonly DemoCandidateFixture[] => {
  const referenceId = pack.references[0]?.id ?? `ref-${pack.requirementId}`;
  return [
    {
      id: `cand-${pack.requirementId}-front`,
      name: `${pack.plannedName} front view`,
      declaredFormat: "png",
      referenceId,
      coveredViews: pack.expectedViews.slice(0, 1),
    },
    {
      id: `cand-${pack.requirementId}-sheet`,
      name: `${pack.plannedName} view sheet`,
      declaredFormat: "png",
      referenceId,
      coveredViews: pack.expectedViews,
    },
    {
      id: `cand-${pack.requirementId}-notes`,
      name: `${pack.plannedName} notes export`,
      declaredFormat: "txt",
      referenceId,
      coveredViews: [],
    },
  ];
};

/* ------------------------------------------------------------------ */
/* Local candidate records (the bounded review list)                   */
/* ------------------------------------------------------------------ */

export interface LocalCandidateRecord {
  id: string;
  requirementId: string;
  sceneId: string;
  name: string;
  declaredFormat: string;
  /** Creator-entered text — not proof of provenance or permission. */
  source: string;
  license: string;
  referenceLabel: string;
  coveredViews: readonly string[];
  /** Always exactly CONFIRMED_CANDIDATE_TRUTH. */
  truth: string;
}

/* ------------------------------------------------------------------ */
/* Workflow states and events                                          */
/* ------------------------------------------------------------------ */

export type ImportWorkflowState =
  | { kind: "idle" }
  | { kind: "selection-pending"; intent: "choose" | "drop" }
  | { kind: "reviewing"; candidateId: string; source: string; license: string }
  | { kind: "confirming"; candidateId: string; source: string; license: string }
  | { kind: "cancelled"; truth: string }
  | {
      kind: "duplicate";
      candidateId: string;
      source: string;
      license: string;
      reason: string;
    }
  | {
      kind: "wrong-format";
      candidateId: string;
      source: string;
      license: string;
      reason: string;
    }
  | {
      kind: "missing-source";
      candidateId: string;
      source: string;
      license: string;
      reason: string;
    }
  | {
      kind: "missing-license";
      candidateId: string;
      source: string;
      license: string;
      reason: string;
    }
  | { kind: "unavailable"; reason: string }
  | { kind: "confirmed"; record: LocalCandidateRecord };

export const IMPORT_STATE_LABELS: Record<ImportWorkflowState["kind"], string> =
  {
    idle: "Idle",
    "selection-pending": "Selection or drop pending",
    reviewing: "Reviewing candidate metadata",
    confirming: "Awaiting explicit confirmation",
    cancelled: "Cancelled",
    duplicate: "Duplicate",
    "wrong-format": "Wrong format",
    "missing-source": "Missing source",
    "missing-license": "Missing license",
    unavailable: "Unavailable",
    confirmed: "Local candidate record confirmed",
  };

export type ImportEvent =
  | { type: "begin-choose" }
  | { type: "declare-drop-intent" }
  | { type: "choose-candidate"; candidateId: string }
  | { type: "edit-source"; value: string }
  | { type: "edit-license"; value: string }
  | { type: "continue-to-confirmation" }
  | { type: "edit-metadata" }
  | { type: "confirm" }
  | { type: "cancel" }
  | { type: "start-over" };

export interface ImportContext {
  pack: RequestPack;
  candidates: readonly DemoCandidateFixture[];
  /** Current bounded review list for this requirement. Read only — the
   * machine never mutates it. */
  reviewList: readonly LocalCandidateRecord[];
}

const invalid = (state: ImportWorkflowState, event: ImportEvent) =>
  ({
    kind: "unavailable",
    reason: `Invalid import transition: "${event.type}" is not available from the "${IMPORT_STATE_LABELS[state.kind]}" state. The workflow failed closed; no candidate was created and nothing changed.`,
  }) as const;

const duplicateReason =
  "A local candidate record with this exact demo identity already exists in this requirement's review list — a deterministic fixture identity collision, not a byte or hash comparison. No second record was created.";

/** One deterministic transition. The context is treated as read-only; the
 * result never carries side effects, and unknown or stale identities and
 * invalid transitions fail closed into the explicit unavailable state. */
export const transitionImport = (
  state: ImportWorkflowState,
  event: ImportEvent,
  context: ImportContext,
): ImportWorkflowState => {
  /* Cancel is always safe: it returns to a stable cancelled notice without
   * creating a candidate or changing anything else. */
  if (event.type === "cancel") {
    if (state.kind === "idle" || state.kind === "cancelled") return state;
    return { kind: "cancelled", truth: CANCELLED_TRUTH };
  }
  /* Start over returns terminal and error states to a clean idle. */
  if (event.type === "start-over") {
    if (
      state.kind === "cancelled" ||
      state.kind === "duplicate" ||
      state.kind === "wrong-format" ||
      state.kind === "missing-source" ||
      state.kind === "missing-license" ||
      state.kind === "unavailable" ||
      state.kind === "confirmed"
    )
      return { kind: "idle" };
    return invalid(state, event);
  }

  switch (event.type) {
    case "begin-choose":
      if (state.kind !== "idle") return invalid(state, event);
      return { kind: "selection-pending", intent: "choose" };
    case "declare-drop-intent":
      if (state.kind !== "idle") return invalid(state, event);
      return { kind: "selection-pending", intent: "drop" };
    case "choose-candidate": {
      if (state.kind !== "selection-pending") return invalid(state, event);
      const candidate = context.candidates.find(
        (entry) => entry.id === event.candidateId,
      );
      if (!candidate)
        return {
          kind: "unavailable",
          reason: `Unknown candidate identity: ${event.candidateId}. The workflow failed closed; no candidate was created and nothing changed.`,
        };
      if (context.reviewList.some((record) => record.id === candidate.id))
        return {
          kind: "duplicate",
          candidateId: candidate.id,
          source: "",
          license: "",
          reason: duplicateReason,
        };
      return {
        kind: "reviewing",
        candidateId: candidate.id,
        source: "",
        license: "",
      };
    }
    case "edit-source":
      if (
        state.kind !== "reviewing" &&
        state.kind !== "missing-source" &&
        state.kind !== "missing-license"
      )
        return invalid(state, event);
      return { ...state, source: event.value };
    case "edit-license":
      if (
        state.kind !== "reviewing" &&
        state.kind !== "missing-source" &&
        state.kind !== "missing-license"
      )
        return invalid(state, event);
      return { ...state, license: event.value };
    case "continue-to-confirmation": {
      if (
        state.kind !== "reviewing" &&
        state.kind !== "missing-source" &&
        state.kind !== "missing-license"
      )
        return invalid(state, event);
      const candidate = context.candidates.find(
        (entry) => entry.id === state.candidateId,
      );
      if (!candidate)
        return {
          kind: "unavailable",
          reason: `Stale candidate identity: ${state.candidateId}. The workflow failed closed; no candidate was created and nothing changed.`,
        };
      if (!acceptedDeclaredFormat(candidate.declaredFormat))
        return {
          kind: "wrong-format",
          candidateId: candidate.id,
          source: state.source,
          license: state.license,
          reason: `Declared format "${candidate.declaredFormat}" is not one of the accepted declared formats (${ACCEPTED_DECLARED_FORMATS.join(", ")}) — declared local demo metadata, not media sniffing or decoding. No candidate was created.`,
        };
      if (state.source.trim() === "")
        return {
          kind: "missing-source",
          candidateId: candidate.id,
          source: state.source,
          license: state.license,
          reason:
            "Source is required before review — enter where this candidate came from in your own words. No candidate was created.",
        };
      if (state.license.trim() === "")
        return {
          kind: "missing-license",
          candidateId: candidate.id,
          source: state.source,
          license: state.license,
          reason:
            "License or rights are required before review — enter the usage rights you believe you have in your own words. No candidate was created.",
        };
      return {
        kind: "confirming",
        candidateId: candidate.id,
        source: state.source,
        license: state.license,
      };
    }
    case "edit-metadata":
      if (state.kind === "confirming")
        return {
          kind: "reviewing",
          candidateId: state.candidateId,
          source: state.source,
          license: state.license,
        };
      return invalid(state, event);
    case "confirm": {
      if (state.kind !== "confirming") return invalid(state, event);
      const candidate = context.candidates.find(
        (entry) => entry.id === state.candidateId,
      );
      if (!candidate)
        return {
          kind: "unavailable",
          reason: `Stale candidate identity at confirmation: ${state.candidateId}. The workflow failed closed; no candidate was created and nothing changed.`,
        };
      /* Fail closed on every truth check again at the boundary — the
       * confirmation control can never admit invalid metadata. */
      if (!acceptedDeclaredFormat(candidate.declaredFormat))
        return {
          kind: "wrong-format",
          candidateId: candidate.id,
          source: state.source,
          license: state.license,
          reason: `Declared format "${candidate.declaredFormat}" is not one of the accepted declared formats (${ACCEPTED_DECLARED_FORMATS.join(", ")}) — declared local demo metadata, not media sniffing or decoding. No candidate was created.`,
        };
      if (state.source.trim() === "")
        return {
          kind: "missing-source",
          candidateId: candidate.id,
          source: state.source,
          license: state.license,
          reason:
            "Source is required before review — enter where this candidate came from in your own words. No candidate was created.",
        };
      if (state.license.trim() === "")
        return {
          kind: "missing-license",
          candidateId: candidate.id,
          source: state.source,
          license: state.license,
          reason:
            "License or rights are required before review — enter the usage rights you believe you have in your own words. No candidate was created.",
        };
      if (context.reviewList.some((record) => record.id === candidate.id))
        return {
          kind: "duplicate",
          candidateId: candidate.id,
          source: state.source,
          license: state.license,
          reason: duplicateReason,
        };
      const reference = context.pack.references.find(
        (entry) => entry.id === candidate.referenceId,
      );
      if (!reference)
        return {
          kind: "unavailable",
          reason: `Stale reference identity at confirmation: ${candidate.referenceId}. The workflow failed closed; no candidate was created and nothing changed.`,
        };
      return {
        kind: "confirmed",
        record: {
          id: candidate.id,
          requirementId: context.pack.requirementId,
          sceneId: context.pack.sceneId,
          name: candidate.name,
          declaredFormat: candidate.declaredFormat,
          source: state.source.trim(),
          license: state.license.trim(),
          referenceLabel: reference.label,
          coveredViews: candidate.coveredViews,
          truth: CONFIRMED_CANDIDATE_TRUTH,
        },
      };
    }
    default:
      return invalid(state, event);
  }
};
