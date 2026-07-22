/**
 * F4-WP2 scene asset requirements and readiness — deterministic
 * session-local fixture truth over the accepted F4-WP1 asset records.
 *
 * Every requirement below is a labelled local demo planning record, declared
 * by this bounded fixture only. Nothing here is derived from pasted script
 * text, AI, MCP, the story engine, files, providers, or services, and
 * nothing can create an image, file, layer, rig, review, approval, or any
 * other artifact. The scene filter of the Assets & Rigs workspace is the
 * scope authority: a selected scene yields scene-scoped truth, and `all`
 * yields an episode summary that always discloses its episode scope.
 *
 * Requirement dimensions:
 * - `Required`: the bounded fixture says the selected scene cannot meet its
 *   local planning intent without the record. Not a production dependency
 *   calculation.
 * - `Optional`: the record can enrich the selected scene but is not needed
 *   for the bounded planning intent.
 * - `Reusable`: independently derived when the same local planning record is
 *   referenced by more than one bounded demo scene. It does not replace the
 *   scene's Required/Optional necessity and does not claim a real artifact.
 *
 * Readiness states:
 * - `Missing`: no candidate/reference record sufficient for the next local
 *   planning step exists.
 * - `Candidate`: a labelled local candidate record exists but remains
 *   unreviewed and has no artifact.
 * - `Needs preparation`: the record identifies preparation work (layers,
 *   rig markers, references); no preparation service or output exists.
 * - `Needs review`: the local checklist has enough descriptive information
 *   for a later review, but no review or approval has occurred.
 * - `Ready`: the deterministic planning record satisfies this package's
 *   local checklist. Always shown next to `READY_LOCAL_RECORD_DISCLAIMER`;
 *   it never means an artifact, review, approval, rig, capability, or
 *   production readiness exists.
 */

import {
  ASSET_FIXTURES,
  SCOPE_ALL,
  type AssetCategoryId,
  type AssetFixture,
  type AssetScope,
} from "./asset-workspace";
import { OLLO_DEMO_SCENES } from "./demo-project";

/** Shown adjacent to every `Ready` label, without exception, so a ready
 * word can never be read as an artifact or production claim. */
export const READY_LOCAL_RECORD_DISCLAIMER =
  "Ready here means only that this local planning record satisfies this package's local checklist — it is not artifact, review, approval, rig, capability, or production readiness, and no file, image, layer, or rig exists.";

/** One honesty line carried by every requirement fixture: classifications
 * are deterministic fixture declarations, never automatic script analysis. */
export const REQUIREMENT_SOURCE_TRUTH =
  "Declared by the bounded local F4-WP2 fixture — not derived from script text, AI, or any service.";

/* ------------------------------------------------------------------ */
/* Vocabulary                                                          */
/* ------------------------------------------------------------------ */

export type RequirementNecessity = "required" | "optional";

export const REQUIREMENT_NECESSITY_LABELS: Record<
  RequirementNecessity,
  string
> = {
  required: "Required",
  optional: "Optional",
};

export const REQUIREMENT_NECESSITY_NOTES: Record<RequirementNecessity, string> =
  {
    required:
      "the bounded fixture says this scene cannot meet its local planning intent without the record",
    optional:
      "the record can enrich this scene but is not needed for the bounded planning intent",
  };

export type RequirementReadiness =
  | "missing"
  | "candidate"
  | "needs-preparation"
  | "needs-review"
  | "ready";

export const REQUIREMENT_READINESS_LABELS: Record<
  RequirementReadiness,
  string
> = {
  missing: "Missing",
  candidate: "Candidate",
  "needs-preparation": "Needs preparation",
  "needs-review": "Needs review",
  ready: "Ready",
};

/* ------------------------------------------------------------------ */
/* Requirement fixtures                                                */
/* ------------------------------------------------------------------ */

export interface SceneRequirementFixture {
  id: string;
  /** The bounded demo scene this requirement is scoped to. */
  sceneId: string;
  /** The referenced F4-WP1 local record, or null when no record exists at
   * all (only valid together with `missing`). */
  assetId: string | null;
  /** Display name; matches the referenced record's name when one exists. */
  plannedName: string;
  category: AssetCategoryId;
  necessity: RequirementNecessity;
  readiness: RequirementReadiness;
  /** The exact readable reason this requirement is not ready. Null only
   * when `readiness` is `ready`. */
  blocker: string | null;
  /** The exact local-checklist explanation. Set only when `readiness` is
   * `ready`; always rendered next to READY_LOCAL_RECORD_DISCLAIMER. */
  readyExplanation: string | null;
  sourceTruth: string;
  /** The one next honest preparation action. Always visibly unavailable in
   * this package — the control is disabled and explains why. */
  nextPreparation: {
    action: string;
    unavailableReason: string;
  };
}

const READY_OLLO =
  "Local planning checklist complete for this scene: Ollo is named, described, and scoped in the bounded Ollo demo plan.";

const BLOCKER_CANDIDATE =
  "A labelled local candidate record exists, but it remains unreviewed and no artifact exists.";
const BLOCKER_MISSING_DOT =
  "Only a name is recorded — no candidate or reference record sufficient for the next local planning step exists.";
const BLOCKER_NEEDS_REVIEW =
  "The local checklist has enough descriptive information for a later review, but no review or approval has occurred.";
const BLOCKER_PREP_LAYERS =
  "The record identifies layer preparation (background, midground, and foreground planes), but no slicing service or layer output exists.";
const BLOCKER_PREP_REFERENCE =
  "The record identifies reference preparation for this prop, but no image service or reference output exists.";
const BLOCKER_PREP_RIG =
  "The record identifies rig-marker preparation for bounce, turn, and reach performances, but no rigging service or output exists.";

const PREP_REFERENCE = {
  action: "Attach reference art",
  unavailableReason:
    "Unavailable — image import and generation do not exist in this demo. A later F4 package adds them.",
} as const;

const PREP_LAYERS = {
  action: "Slice artwork into layers",
  unavailableReason:
    "Unavailable — there is no artwork to slice and no slicing capability in this demo. A later F4 package adds layer review.",
} as const;

const PREP_RIG = {
  action: "Register rig markers",
  unavailableReason:
    "Unavailable — rigging does not exist in this demo. A later F4 package adds rig review.",
} as const;

const PREP_CREATE_RECORD = {
  action: "Create local candidate record",
  unavailableReason:
    "Unavailable — asset creation, import, and generation do not exist in this demo. A later F4 package adds them.",
} as const;

/** One deterministic requirement entry for every (asset, scene) pairing of
 * the accepted F4-WP1 fixtures, plus one planned dressing with no record at
 * all. Fixture order is scene order, then category order within a scene. */
export const SCENE_REQUIREMENTS: readonly SceneRequirementFixture[] = [
  /* Scene 1 · The Home Nook — partial: ready, preparation, review, missing */
  {
    id: "req-s1-ollo",
    sceneId: "scene-1",
    assetId: "char-ollo",
    plannedName: "Ollo",
    category: "characters",
    necessity: "required",
    readiness: "ready",
    blocker: null,
    readyExplanation: READY_OLLO,
    sourceTruth: REQUIREMENT_SOURCE_TRUTH,
    nextPreparation: PREP_REFERENCE,
  },
  {
    id: "req-s1-home-nook",
    sceneId: "scene-1",
    assetId: "set-home-nook",
    plannedName: "The Home Nook set",
    category: "layered-sets",
    necessity: "required",
    readiness: "needs-preparation",
    blocker: BLOCKER_PREP_LAYERS,
    readyExplanation: null,
    sourceTruth: REQUIREMENT_SOURCE_TRUTH,
    nextPreparation: PREP_LAYERS,
  },
  {
    id: "req-s1-little-wood",
    sceneId: "scene-1",
    assetId: "loc-little-wood",
    plannedName: "The Little Wood",
    category: "locations",
    necessity: "required",
    readiness: "needs-review",
    blocker: BLOCKER_NEEDS_REVIEW,
    readyExplanation: null,
    sourceTruth: REQUIREMENT_SOURCE_TRUTH,
    nextPreparation: PREP_REFERENCE,
  },
  {
    id: "req-s1-rig-ollo",
    sceneId: "scene-1",
    assetId: "rig-ollo",
    plannedName: "Ollo performance rig",
    category: "rigs",
    necessity: "required",
    readiness: "needs-preparation",
    blocker: BLOCKER_PREP_RIG,
    readyExplanation: null,
    sourceTruth: REQUIREMENT_SOURCE_TRUTH,
    nextPreparation: PREP_RIG,
  },
  {
    id: "req-s1-story-shelf",
    sceneId: "scene-1",
    assetId: null,
    plannedName: "Unfinished-stories shelf dressing",
    category: "props",
    necessity: "optional",
    readiness: "missing",
    blocker:
      "No candidate or reference record exists for this planned shelf dressing; the next local planning step would create one, and this demo cannot create records.",
    readyExplanation: null,
    sourceTruth: REQUIREMENT_SOURCE_TRUTH,
    nextPreparation: PREP_CREATE_RECORD,
  },
  /* Scene 2 · Forest Path — partial: ready, candidate, review, preparation */
  {
    id: "req-s2-ollo",
    sceneId: "scene-2",
    assetId: "char-ollo",
    plannedName: "Ollo",
    category: "characters",
    necessity: "required",
    readiness: "ready",
    blocker: null,
    readyExplanation: READY_OLLO,
    sourceTruth: REQUIREMENT_SOURCE_TRUTH,
    nextPreparation: PREP_REFERENCE,
  },
  {
    id: "req-s2-tix",
    sceneId: "scene-2",
    assetId: "char-tix",
    plannedName: "Tix",
    category: "characters",
    necessity: "required",
    readiness: "candidate",
    blocker: BLOCKER_CANDIDATE,
    readyExplanation: null,
    sourceTruth: REQUIREMENT_SOURCE_TRUTH,
    nextPreparation: PREP_REFERENCE,
  },
  {
    id: "req-s2-little-wood",
    sceneId: "scene-2",
    assetId: "loc-little-wood",
    plannedName: "The Little Wood",
    category: "locations",
    necessity: "required",
    readiness: "needs-review",
    blocker: BLOCKER_NEEDS_REVIEW,
    readyExplanation: null,
    sourceTruth: REQUIREMENT_SOURCE_TRUTH,
    nextPreparation: PREP_REFERENCE,
  },
  {
    id: "req-s2-rig-ollo",
    sceneId: "scene-2",
    assetId: "rig-ollo",
    plannedName: "Ollo performance rig",
    category: "rigs",
    necessity: "required",
    readiness: "needs-preparation",
    blocker: BLOCKER_PREP_RIG,
    readyExplanation: null,
    sourceTruth: REQUIREMENT_SOURCE_TRUTH,
    nextPreparation: PREP_RIG,
  },
  /* Scene 3 · Berry Patch — partial: all five readiness states visible */
  {
    id: "req-s3-ollo",
    sceneId: "scene-3",
    assetId: "char-ollo",
    plannedName: "Ollo",
    category: "characters",
    necessity: "required",
    readiness: "ready",
    blocker: null,
    readyExplanation: READY_OLLO,
    sourceTruth: REQUIREMENT_SOURCE_TRUTH,
    nextPreparation: PREP_REFERENCE,
  },
  {
    id: "req-s3-tix",
    sceneId: "scene-3",
    assetId: "char-tix",
    plannedName: "Tix",
    category: "characters",
    necessity: "optional",
    readiness: "candidate",
    blocker: BLOCKER_CANDIDATE,
    readyExplanation: null,
    sourceTruth: REQUIREMENT_SOURCE_TRUTH,
    nextPreparation: PREP_REFERENCE,
  },
  {
    id: "req-s3-dot",
    sceneId: "scene-3",
    assetId: "char-dot",
    plannedName: "Dot",
    category: "characters",
    necessity: "required",
    readiness: "missing",
    blocker: BLOCKER_MISSING_DOT,
    readyExplanation: null,
    sourceTruth: REQUIREMENT_SOURCE_TRUTH,
    nextPreparation: PREP_REFERENCE,
  },
  {
    id: "req-s3-berry-trail",
    sceneId: "scene-3",
    assetId: "prop-berry-trail",
    plannedName: "Dropped berry trail",
    category: "props",
    necessity: "required",
    readiness: "candidate",
    blocker: BLOCKER_CANDIDATE,
    readyExplanation: null,
    sourceTruth: REQUIREMENT_SOURCE_TRUTH,
    nextPreparation: PREP_REFERENCE,
  },
  {
    id: "req-s3-little-wood",
    sceneId: "scene-3",
    assetId: "loc-little-wood",
    plannedName: "The Little Wood",
    category: "locations",
    necessity: "required",
    readiness: "needs-review",
    blocker: BLOCKER_NEEDS_REVIEW,
    readyExplanation: null,
    sourceTruth: REQUIREMENT_SOURCE_TRUTH,
    nextPreparation: PREP_REFERENCE,
  },
  {
    id: "req-s3-rig-ollo",
    sceneId: "scene-3",
    assetId: "rig-ollo",
    plannedName: "Ollo performance rig",
    category: "rigs",
    necessity: "required",
    readiness: "needs-preparation",
    blocker: BLOCKER_PREP_RIG,
    readyExplanation: null,
    sourceTruth: REQUIREMENT_SOURCE_TRUTH,
    nextPreparation: PREP_RIG,
  },
  /* Scene 4 · Little Stream — blocked: nothing satisfies the local checklist */
  {
    id: "req-s4-ollo",
    sceneId: "scene-4",
    assetId: "char-ollo",
    plannedName: "Ollo",
    category: "characters",
    necessity: "required",
    readiness: "needs-review",
    blocker: BLOCKER_NEEDS_REVIEW,
    readyExplanation: null,
    sourceTruth: REQUIREMENT_SOURCE_TRUTH,
    nextPreparation: PREP_REFERENCE,
  },
  {
    id: "req-s4-tix",
    sceneId: "scene-4",
    assetId: "char-tix",
    plannedName: "Tix",
    category: "characters",
    necessity: "optional",
    readiness: "candidate",
    blocker: BLOCKER_CANDIDATE,
    readyExplanation: null,
    sourceTruth: REQUIREMENT_SOURCE_TRUTH,
    nextPreparation: PREP_REFERENCE,
  },
  {
    id: "req-s4-little-wood",
    sceneId: "scene-4",
    assetId: "loc-little-wood",
    plannedName: "The Little Wood",
    category: "locations",
    necessity: "required",
    readiness: "needs-review",
    blocker: BLOCKER_NEEDS_REVIEW,
    readyExplanation: null,
    sourceTruth: REQUIREMENT_SOURCE_TRUTH,
    nextPreparation: PREP_REFERENCE,
  },
  {
    id: "req-s4-rig-ollo",
    sceneId: "scene-4",
    assetId: "rig-ollo",
    plannedName: "Ollo performance rig",
    category: "rigs",
    necessity: "required",
    readiness: "needs-preparation",
    blocker: BLOCKER_PREP_RIG,
    readyExplanation: null,
    sourceTruth: REQUIREMENT_SOURCE_TRUTH,
    nextPreparation: PREP_RIG,
  },
  /* Scene 5 · Lantern Bridge — partial: preparation, candidate, reusable ready */
  {
    id: "req-s5-lantern-bridge",
    sceneId: "scene-5",
    assetId: "set-lantern-bridge",
    plannedName: "Lantern Bridge set",
    category: "layered-sets",
    necessity: "required",
    readiness: "needs-preparation",
    blocker: BLOCKER_PREP_LAYERS,
    readyExplanation: null,
    sourceTruth: REQUIREMENT_SOURCE_TRUTH,
    nextPreparation: PREP_LAYERS,
  },
  {
    id: "req-s5-storylight",
    sceneId: "scene-5",
    assetId: "prop-storylight",
    plannedName: "The Storylight lantern",
    category: "props",
    necessity: "required",
    readiness: "needs-preparation",
    blocker: BLOCKER_PREP_REFERENCE,
    readyExplanation: null,
    sourceTruth: REQUIREMENT_SOURCE_TRUTH,
    nextPreparation: PREP_REFERENCE,
  },
  {
    id: "req-s5-little-elsewhere",
    sceneId: "scene-5",
    assetId: "loc-little-elsewhere",
    plannedName: "The Little Elsewhere",
    category: "locations",
    necessity: "required",
    readiness: "candidate",
    blocker: BLOCKER_CANDIDATE,
    readyExplanation: null,
    sourceTruth: REQUIREMENT_SOURCE_TRUTH,
    nextPreparation: PREP_REFERENCE,
  },
  {
    id: "req-s5-ollo",
    sceneId: "scene-5",
    assetId: "char-ollo",
    plannedName: "Ollo",
    category: "characters",
    necessity: "required",
    readiness: "ready",
    blocker: null,
    readyExplanation: READY_OLLO,
    sourceTruth: REQUIREMENT_SOURCE_TRUTH,
    nextPreparation: PREP_REFERENCE,
  },
  {
    id: "req-s5-rig-ollo",
    sceneId: "scene-5",
    assetId: "rig-ollo",
    plannedName: "Ollo performance rig",
    category: "rigs",
    necessity: "required",
    readiness: "needs-preparation",
    blocker: BLOCKER_PREP_RIG,
    readyExplanation: null,
    sourceTruth: REQUIREMENT_SOURCE_TRUTH,
    nextPreparation: PREP_RIG,
  },
  /* Scene 6 · Folded Hills — partial */
  {
    id: "req-s6-little-elsewhere",
    sceneId: "scene-6",
    assetId: "loc-little-elsewhere",
    plannedName: "The Little Elsewhere",
    category: "locations",
    necessity: "required",
    readiness: "needs-review",
    blocker: BLOCKER_NEEDS_REVIEW,
    readyExplanation: null,
    sourceTruth: REQUIREMENT_SOURCE_TRUTH,
    nextPreparation: PREP_REFERENCE,
  },
  {
    id: "req-s6-storylight",
    sceneId: "scene-6",
    assetId: "prop-storylight",
    plannedName: "The Storylight lantern",
    category: "props",
    necessity: "required",
    readiness: "needs-preparation",
    blocker: BLOCKER_PREP_REFERENCE,
    readyExplanation: null,
    sourceTruth: REQUIREMENT_SOURCE_TRUTH,
    nextPreparation: PREP_REFERENCE,
  },
  {
    id: "req-s6-ollo",
    sceneId: "scene-6",
    assetId: "char-ollo",
    plannedName: "Ollo",
    category: "characters",
    necessity: "required",
    readiness: "ready",
    blocker: null,
    readyExplanation: READY_OLLO,
    sourceTruth: REQUIREMENT_SOURCE_TRUTH,
    nextPreparation: PREP_REFERENCE,
  },
  {
    id: "req-s6-rig-ollo",
    sceneId: "scene-6",
    assetId: "rig-ollo",
    plannedName: "Ollo performance rig",
    category: "rigs",
    necessity: "required",
    readiness: "needs-preparation",
    blocker: BLOCKER_PREP_RIG,
    readyExplanation: null,
    sourceTruth: REQUIREMENT_SOURCE_TRUTH,
    nextPreparation: PREP_RIG,
  },
  /* Scene 7 · Sunflower Field — partial with a missing supporting record */
  {
    id: "req-s7-dot",
    sceneId: "scene-7",
    assetId: "char-dot",
    plannedName: "Dot",
    category: "characters",
    necessity: "optional",
    readiness: "missing",
    blocker: BLOCKER_MISSING_DOT,
    readyExplanation: null,
    sourceTruth: REQUIREMENT_SOURCE_TRUTH,
    nextPreparation: PREP_REFERENCE,
  },
  {
    id: "req-s7-little-elsewhere",
    sceneId: "scene-7",
    assetId: "loc-little-elsewhere",
    plannedName: "The Little Elsewhere",
    category: "locations",
    necessity: "required",
    readiness: "needs-review",
    blocker: BLOCKER_NEEDS_REVIEW,
    readyExplanation: null,
    sourceTruth: REQUIREMENT_SOURCE_TRUTH,
    nextPreparation: PREP_REFERENCE,
  },
  {
    id: "req-s7-storylight",
    sceneId: "scene-7",
    assetId: "prop-storylight",
    plannedName: "The Storylight lantern",
    category: "props",
    necessity: "required",
    readiness: "needs-preparation",
    blocker: BLOCKER_PREP_REFERENCE,
    readyExplanation: null,
    sourceTruth: REQUIREMENT_SOURCE_TRUTH,
    nextPreparation: PREP_REFERENCE,
  },
  {
    id: "req-s7-ollo",
    sceneId: "scene-7",
    assetId: "char-ollo",
    plannedName: "Ollo",
    category: "characters",
    necessity: "required",
    readiness: "ready",
    blocker: null,
    readyExplanation: READY_OLLO,
    sourceTruth: REQUIREMENT_SOURCE_TRUTH,
    nextPreparation: PREP_REFERENCE,
  },
  {
    id: "req-s7-rig-ollo",
    sceneId: "scene-7",
    assetId: "rig-ollo",
    plannedName: "Ollo performance rig",
    category: "rigs",
    necessity: "required",
    readiness: "needs-preparation",
    blocker: BLOCKER_PREP_RIG,
    readyExplanation: null,
    sourceTruth: REQUIREMENT_SOURCE_TRUTH,
    nextPreparation: PREP_RIG,
  },
  /* Scene 8 · Back Home — partial */
  {
    id: "req-s8-home-nook",
    sceneId: "scene-8",
    assetId: "set-home-nook",
    plannedName: "The Home Nook set",
    category: "layered-sets",
    necessity: "required",
    readiness: "needs-preparation",
    blocker: BLOCKER_PREP_LAYERS,
    readyExplanation: null,
    sourceTruth: REQUIREMENT_SOURCE_TRUTH,
    nextPreparation: PREP_LAYERS,
  },
  {
    id: "req-s8-storylight",
    sceneId: "scene-8",
    assetId: "prop-storylight",
    plannedName: "The Storylight lantern",
    category: "props",
    necessity: "required",
    readiness: "needs-preparation",
    blocker: BLOCKER_PREP_REFERENCE,
    readyExplanation: null,
    sourceTruth: REQUIREMENT_SOURCE_TRUTH,
    nextPreparation: PREP_REFERENCE,
  },
  {
    id: "req-s8-ollo",
    sceneId: "scene-8",
    assetId: "char-ollo",
    plannedName: "Ollo",
    category: "characters",
    necessity: "required",
    readiness: "ready",
    blocker: null,
    readyExplanation: READY_OLLO,
    sourceTruth: REQUIREMENT_SOURCE_TRUTH,
    nextPreparation: PREP_REFERENCE,
  },
  {
    id: "req-s8-rig-ollo",
    sceneId: "scene-8",
    assetId: "rig-ollo",
    plannedName: "Ollo performance rig",
    category: "rigs",
    necessity: "required",
    readiness: "needs-preparation",
    blocker: BLOCKER_PREP_RIG,
    readyExplanation: null,
    sourceTruth: REQUIREMENT_SOURCE_TRUTH,
    nextPreparation: PREP_RIG,
  },
];

/* ------------------------------------------------------------------ */
/* Fail-closed resolution                                              */
/* ------------------------------------------------------------------ */

export interface ResolvedSceneRequirement {
  entry: SceneRequirementFixture;
  /** The referenced F4-WP1 record, or null for a planned need with no
   * record (only valid for `missing`). */
  asset: AssetFixture | null;
  /** Cross-scene reuse is independent from scene necessity. */
  reusable: boolean;
  /** Null when the entry is internally consistent and its reference is
   * known. Otherwise the exact reason this entry is unavailable; an
   * unavailable entry is shown explicitly and is never counted as ready. */
  unavailableReason: string | null;
}

/** Validate one requirement against the accepted asset records, failing
 * closed: unknown ids, stale scene/category references, ready claims without
 * a described record, reusable claims on a single-scene record, missing
 * without an absent-or-name-only record, and contradictory blocker/ready
 * fields all become explicit unavailable entries. */
export const resolveSceneRequirement = (
  entry: SceneRequirementFixture,
  assets: readonly AssetFixture[] = ASSET_FIXTURES,
): ResolvedSceneRequirement => {
  const unavailable = (reason: string): ResolvedSceneRequirement => ({
    entry,
    asset: null,
    reusable: false,
    unavailableReason: reason,
  });

  if (entry.readiness === "ready") {
    if (entry.readyExplanation === null || entry.blocker !== null)
      return unavailable(
        "Invalid fixture: a ready requirement needs an exact ready explanation and no blocker.",
      );
  } else if (entry.blocker === null || entry.readyExplanation !== null) {
    return unavailable(
      "Invalid fixture: a non-ready requirement needs an exact blocker and no ready explanation.",
    );
  }

  if (entry.assetId === null) {
    if (entry.readiness !== "missing")
      return unavailable(
        "Invalid fixture: a requirement without a local record can only be missing.",
      );
    return { entry, asset: null, reusable: false, unavailableReason: null };
  }

  const asset = assets.find((candidate) => candidate.id === entry.assetId);
  if (!asset)
    return unavailable(
      `Unknown local record reference: ${entry.assetId}. This entry cannot be counted or shown as ready.`,
    );
  if (asset.category !== entry.category)
    return unavailable(
      "Stale fixture reference: the record's category no longer matches this requirement.",
    );
  if (!asset.sceneIds.includes(entry.sceneId))
    return unavailable(
      "Stale fixture reference: the record is no longer scoped to this scene.",
    );
  if (entry.readiness === "ready" && asset.readiness !== "described")
    return unavailable(
      "Invalid fixture: a ready requirement needs a described local record.",
    );
  if (entry.readiness === "missing" && asset.readiness !== "record-only")
    return unavailable(
      "Invalid fixture: a missing requirement can only reference a name-only record.",
    );
  return {
    entry,
    asset,
    reusable: asset.sceneIds.length > 1,
    unavailableReason: null,
  };
};

/* ------------------------------------------------------------------ */
/* Scope, counts, and labels                                           */
/* ------------------------------------------------------------------ */

/** Requirement entries visible for the current scope, resolved fail-closed.
 * A selected scene yields exactly its entries; `all` yields every fixture
 * entry as an episode summary that must disclose its episode scope. */
export const resolveScopeRequirements = (
  scope: AssetScope,
  requirements: readonly SceneRequirementFixture[] = SCENE_REQUIREMENTS,
  assets: readonly AssetFixture[] = ASSET_FIXTURES,
): readonly ResolvedSceneRequirement[] =>
  requirements
    .filter(
      (entry) => scope.sceneId === SCOPE_ALL || entry.sceneId === scope.sceneId,
    )
    .map((entry) => resolveSceneRequirement(entry, assets));

export interface RequirementCounts {
  total: number;
  required: number;
  optional: number;
  reusable: number;
  missing: number;
  candidate: number;
  needsPreparation: number;
  needsReview: number;
  ready: number;
  unavailable: number;
}

/** Mechanically derive the aggregate from the same resolved entries the
 * list shows. Unavailable entries are counted only as unavailable — never
 * as ready or as any class. */
export const countRequirements = (
  resolved: readonly ResolvedSceneRequirement[],
): RequirementCounts => {
  const counts: RequirementCounts = {
    total: resolved.length,
    required: 0,
    optional: 0,
    reusable: 0,
    missing: 0,
    candidate: 0,
    needsPreparation: 0,
    needsReview: 0,
    ready: 0,
    unavailable: 0,
  };
  for (const item of resolved) {
    if (item.unavailableReason !== null) {
      counts.unavailable += 1;
      continue;
    }
    counts[item.entry.necessity] += 1;
    if (item.reusable) counts.reusable += 1;
    switch (item.entry.readiness) {
      case "missing":
        counts.missing += 1;
        break;
      case "candidate":
        counts.candidate += 1;
        break;
      case "needs-preparation":
        counts.needsPreparation += 1;
        break;
      case "needs-review":
        counts.needsReview += 1;
        break;
      case "ready":
        counts.ready += 1;
        break;
    }
  }
  return counts;
};

/** Display label for one bounded demo scene: `Scene 3 · Berry Patch`. */
export const requirementSceneLabel = (sceneId: string): string => {
  const index = OLLO_DEMO_SCENES.findIndex((scene) => scene.id === sceneId);
  const scene = OLLO_DEMO_SCENES[index];
  return scene ? `Scene ${index + 1} · ${scene.title}` : sceneId;
};

/** The scope identity shown beside every aggregate and list, so an episode
 * summary can never masquerade as a selected-scene result. */
export const requirementScopeLabel = (scope: AssetScope): string =>
  scope.sceneId === SCOPE_ALL
    ? "Episode 1 · The Storylight in the Little Wood · All scenes"
    : requirementSceneLabel(scope.sceneId);

/** The single requirement entry for one asset in one scene, used to keep
 * the selected-asset detail synchronized with the requirement list. */
export const findSceneRequirement = (
  assetId: string,
  sceneId: string,
  requirements: readonly SceneRequirementFixture[] = SCENE_REQUIREMENTS,
): SceneRequirementFixture | undefined =>
  requirements.find(
    (entry) => entry.assetId === assetId && entry.sceneId === sceneId,
  );
