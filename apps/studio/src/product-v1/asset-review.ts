/**
 * F4-WP4 deterministic layer-and-rig review model — session-local declared
 * fixture truth over the accepted F4-WP2 requirement model and the F4-WP3
 * session-local candidate records.
 *
 * Every review record below is a labelled local demo fixture: declared
 * descriptive metadata only. No file, image, layer, rig, skeleton, mask, or
 * production-usable artifact exists anywhere in this package, and nothing
 * here reads bytes, inspects pixels, decodes media, slices artwork,
 * calculates pivots, generates masks, builds rigs, approves, promotes, or
 * productionizes anything. Declared bounds and pivots are fixture-declared
 * numbers, never measured or calculated values.
 *
 * The displayed review state is derived mechanically from the displayed
 * review facts: invalid or conflicting facts outrank completeness, and
 * `Review-ready` requires every category-required declaration plus zero
 * contradictions. `Review-ready` still means only "internally complete for a
 * later human/artifact review" — never approval, capability, or production
 * readiness.
 *
 * Unknown or mismatched identities fail closed as unavailable and never
 * enter counts or a review-ready result. Opening, switching, or closing a
 * review panel never mutates the F4-WP2 requirement readiness or counts.
 */

import type { ResolvedSceneRequirement } from "./asset-requirements";
import { requirementSceneLabel } from "./asset-requirements";
import type { LocalCandidateRecord } from "./asset-import";

/** Adjacent to every `Review-ready` label, without exception, so the state
 * can never be read as approval, capability, or production readiness. */
export const REVIEW_READY_TRUTH =
  "The declared local checklist is internally complete for review — no files were inspected, no layer or rig exists, and this is not approval, capability, or production readiness.";

/** Shown wherever review state vocabulary appears, so a state word can never
 * be read as an artifact claim. */
export const REVIEW_STATE_DISCLAIMER =
  "Review states describe only the declared local checklist of a labelled demo fixture — no file, image, layer, rig, or skeleton exists or was inspected.";

/** Shown beside declared bounds, pivots, masks, and plane declarations. */
export const DECLARED_METADATA_TRUTH =
  "Declared fixture metadata only — nothing here is measured, calculated, sliced, or rigged, and no image, skeleton, mask, or layer exists.";

/** Shown beside fixture-declared source/rights text. */
export const FIXTURE_SOURCE_TRUTH =
  "Source and rights text declared by the bounded local F4-WP4 review fixture — descriptive demo text only; no file exists and it proves nothing.";

/** Shown by the disabled later-workflow context controls. */
export const FUTURE_WORKFLOW_TRUTH =
  "Later workflow steps stay unavailable — no artifact, preparation service, approval workflow, or production path exists in this demo.";

/** Reason shown on the disabled review control of an eligible requirement
 * that has no declared demo review example. */
export const NO_REVIEW_EXAMPLE_REASON =
  "Unavailable — this requirement has no declared demo review example in the bounded F4-WP4 fixture.";

/* ------------------------------------------------------------------ */
/* Vocabulary                                                          */
/* ------------------------------------------------------------------ */

export type ReviewState = "incomplete" | "needs-correction" | "review-ready";

export const REVIEW_STATE_LABELS: Record<ReviewState, string> = {
  incomplete: "Incomplete",
  "needs-correction": "Needs correction",
  "review-ready": "Review-ready",
};

export type ReviewExampleId = ReviewState;

export const REVIEW_EXAMPLE_LABELS: Record<ReviewExampleId, string> = {
  incomplete: "Incomplete example",
  "needs-correction": "Needs correction example",
  "review-ready": "Review-ready example",
};

/** Required turnaround views per eligible category, matching the accepted
 * F4-WP3 request-instruction vocabulary so a review never invents views the
 * request did not ask for. */
export const CHARACTER_REQUIRED_VIEWS = [
  "Front view",
  "Three-quarter view",
  "Side view",
] as const;

export const RIG_REQUIRED_VIEWS = [
  "Neutral front pose",
  "Neutral side pose",
] as const;

/** The bounded demo's supported profile identities (its grammar and art
 * style). A declaration may only claim coverage for these. */
export const SUPPORTED_PROFILES = [
  "Kids Adventure",
  "Storybook Cutout",
] as const;

export const KNOWN_EXPRESSIONS = [
  "neutral",
  "happy",
  "sad",
  "surprised",
  "worried",
  "determined",
] as const;

export const KNOWN_VISEMES = [
  "rest",
  "ah",
  "ee",
  "oh",
  "oo",
  "mm",
] as const;

export const KNOWN_SET_PLANES = [
  "background",
  "midground",
  "foreground",
] as const;

export const KNOWN_MASK_KINDS = ["alpha", "matte"] as const;

/* ------------------------------------------------------------------ */
/* Declared fixture shapes                                             */
/* ------------------------------------------------------------------ */

export interface DeclaredPaddedBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  padding: number;
}

export interface DeclaredPivot {
  x: number;
  y: number;
}

export interface DeclaredPart {
  id: string;
  label: string;
  /** Declared padded bounds — fixture numbers, never measured. Null is a
   * missing declaration and fails closed. */
  bounds: DeclaredPaddedBounds | null;
  /** Declared pivot — a fixture-declared point inside the declared bounds.
   * Null is a missing declaration and fails closed. */
  pivot: DeclaredPivot | null;
  attachment: { parentPartId: string | null; intent: string };
  /** The declared mask this part relies on, or null. */
  maskId: string | null;
}

export interface DeclaredMask {
  id: string;
  kind: string;
  appliesToPartId: string;
}

export type ReviewChecklistId =
  | "turnaround-coverage"
  | "part-inventory"
  | "mask-coverage"
  | "profile-coverage"
  | "expression-inventory"
  | "viseme-inventory"
  | "plane-coverage"
  | "occluder-intent";

export const REVIEW_CHECKLIST_LABELS: Record<ReviewChecklistId, string> = {
  "turnaround-coverage": "All required turnaround views declared",
  "part-inventory":
    "Every required part is declared with bounds, pivot, and attachment intent",
  "mask-coverage": "Every required mask is declared",
  "profile-coverage": "Every supported profile is covered",
  "expression-inventory": "An expression inventory is declared",
  "viseme-inventory": "A viseme inventory is declared",
  "plane-coverage":
    "Background, midground, and foreground planes are all declared",
  "occluder-intent":
    "Foreground occluders and their subject relationships are declared",
};

const CHARACTER_RIG_CHECKLIST: readonly ReviewChecklistId[] = [
  "turnaround-coverage",
  "part-inventory",
  "mask-coverage",
  "profile-coverage",
  "expression-inventory",
  "viseme-inventory",
];

const LAYERED_SET_CHECKLIST: readonly ReviewChecklistId[] = [
  "plane-coverage",
  "occluder-intent",
];

export interface ReviewChecklistDeclaration {
  id: string;
  pass: boolean;
  /** The creator-readable reason this check is not passing. Null when
   * `pass` is true; required when `pass` is false. */
  blockReason: string | null;
}

export interface CharacterRigDeclaration {
  kind: "character-rig";
  turnaroundViews: readonly string[];
  requiredPartIds: readonly string[];
  parts: readonly DeclaredPart[];
  requiredMaskIds: readonly string[];
  /** Null is a missing mask declaration and fails closed when any mask is
   * required or referenced. An empty list is an honest incomplete
   * declaration. */
  masks: readonly DeclaredMask[] | null;
  supportedProfiles: readonly string[];
  expressions: readonly string[];
  visemes: readonly string[];
  checklist: readonly ReviewChecklistDeclaration[];
}

export interface DeclaredSetPlane {
  id: string;
  plane: string;
  order: number;
  description: string;
}

export interface DeclaredForegroundOccluder {
  id: string;
  planeId: string;
  /** The creator-declared intended subject relationship. */
  subjectRelationship: string;
}

export interface LayeredSetDeclaration {
  kind: "layered-set";
  planes: readonly DeclaredSetPlane[];
  occluders: readonly DeclaredForegroundOccluder[];
  checklist: readonly ReviewChecklistDeclaration[];
}

export type ReviewDeclaration = CharacterRigDeclaration | LayeredSetDeclaration;

export interface ReviewFixture {
  id: string;
  /** The exact F4-WP2 requirement this review record is bound to. */
  requirementId: string;
  /** Must equal the requirement's scene; a mismatch is a stale scene
   * association and fails closed. */
  sceneId: string;
  /** Which of the three labelled demo states this example declares. */
  example: ReviewExampleId;
  /** The declared candidate identity this review describes — either the
   * deterministic demo-candidate identity for the requirement or an existing
   * session-local candidate record id. Anything else fails closed. */
  candidateId: string;
  candidateLabel: string;
  declaredFormat: string;
  /** Fixture-declared source/rights text — descriptive only, not proof. */
  source: string;
  license: string;
  declaration: ReviewDeclaration;
}

/* ------------------------------------------------------------------ */
/* Bounded demo review fixtures                                        */
/* ------------------------------------------------------------------ */

const FIXTURE_SOURCE =
  "Declared by the bounded local F4-WP4 review fixture — no file exists.";
const FIXTURE_LICENSE =
  "Fixture-declared demo rights text — not proof of permission.";

const check = (
  id: ReviewChecklistId,
  pass: boolean,
  blockReason: string | null = null,
): ReviewChecklistDeclaration => ({ id, pass, blockReason });

const OLLO_READY_PARTS: readonly DeclaredPart[] = [
  {
    id: "body",
    label: "Body",
    bounds: { x: 0, y: 0, width: 240, height: 320, padding: 16 },
    pivot: { x: 120, y: 280 },
    attachment: {
      parentPartId: null,
      intent: "Carries the whole character",
    },
    maskId: null,
  },
  {
    id: "face",
    label: "Face",
    bounds: { x: 40, y: 24, width: 160, height: 120, padding: 8 },
    pivot: { x: 120, y: 84 },
    attachment: {
      parentPartId: "body",
      intent: "Tracks the body for turns and expression changes",
    },
    maskId: "mask-face-alpha",
  },
  {
    id: "arm-left",
    label: "Left arm",
    bounds: { x: 180, y: 120, width: 80, height: 140, padding: 8 },
    pivot: { x: 200, y: 140 },
    attachment: { parentPartId: "body", intent: "Reach performances" },
    maskId: null,
  },
  {
    id: "arm-right",
    label: "Right arm",
    bounds: { x: -20, y: 120, width: 80, height: 140, padding: 8 },
    pivot: { x: 0, y: 140 },
    attachment: { parentPartId: "body", intent: "Reach performances" },
    maskId: null,
  },
];

const RIG_READY_PARTS: readonly DeclaredPart[] = [
  {
    id: "body",
    label: "Body",
    bounds: { x: 0, y: 0, width: 240, height: 320, padding: 16 },
    pivot: { x: 120, y: 280 },
    attachment: {
      parentPartId: null,
      intent: "Bounce performances pivot here",
    },
    maskId: null,
  },
  {
    id: "head",
    label: "Head",
    bounds: { x: 40, y: 8, width: 160, height: 140, padding: 8 },
    pivot: { x: 120, y: 140 },
    attachment: {
      parentPartId: "body",
      intent: "Turn performances nod and tilt from the neck",
    },
    maskId: "mask-mouth-viseme",
  },
  {
    id: "arm-left",
    label: "Left arm",
    bounds: { x: 180, y: 120, width: 80, height: 140, padding: 8 },
    pivot: { x: 200, y: 140 },
    attachment: { parentPartId: "body", intent: "Reach performances" },
    maskId: null,
  },
  {
    id: "arm-right",
    label: "Right arm",
    bounds: { x: -20, y: 120, width: 80, height: 140, padding: 8 },
    pivot: { x: 0, y: 140 },
    attachment: { parentPartId: "body", intent: "Reach performances" },
    maskId: null,
  },
];

const DOT_PARTS: readonly DeclaredPart[] = [
  {
    id: "body",
    label: "Body",
    bounds: { x: 0, y: 0, width: 200, height: 280, padding: 12 },
    pivot: { x: 100, y: 240 },
    attachment: {
      parentPartId: null,
      intent: "Carries the whole character",
    },
    maskId: null,
  },
  {
    id: "face",
    label: "Face",
    bounds: { x: 36, y: 20, width: 128, height: 104, padding: 8 },
    pivot: { x: 100, y: 72 },
    attachment: { parentPartId: "body", intent: "Tracks the body for turns" },
    maskId: null,
  },
];

/** The explicitly labelled local demo review fixtures. They are descriptive
 * fixture evidence only — never claims that a candidate file or any derived
 * artifact exists. The same requirement always yields the same examples. */
export const REVIEW_FIXTURES: readonly ReviewFixture[] = [
  /* Scene 1 · Ollo (character) — one declared example per state */
  {
    id: "review-req-s1-ollo-incomplete",
    requirementId: "req-s1-ollo",
    sceneId: "scene-1",
    example: "incomplete",
    candidateId: "cand-req-s1-ollo-sheet",
    candidateLabel: "Ollo view sheet",
    declaredFormat: "png",
    source: FIXTURE_SOURCE,
    license: FIXTURE_LICENSE,
    declaration: {
      kind: "character-rig",
      turnaroundViews: ["Front view"],
      requiredPartIds: ["body", "face", "arm-left", "arm-right"],
      parts: [OLLO_READY_PARTS[0]!],
      requiredMaskIds: ["mask-face-alpha"],
      masks: [],
      supportedProfiles: ["Kids Adventure"],
      expressions: [],
      visemes: [],
      checklist: [
        check(
          "turnaround-coverage",
          false,
          "Only Front view is declared — Three-quarter view and Side view are not declared.",
        ),
        check(
          "part-inventory",
          false,
          "Only the body part is declared — face, arm-left, and arm-right are not declared.",
        ),
        check(
          "mask-coverage",
          false,
          "The required mask-face-alpha declaration is missing.",
        ),
        check(
          "profile-coverage",
          false,
          "Storybook Cutout coverage is not declared.",
        ),
        check(
          "expression-inventory",
          false,
          "No expressions are declared.",
        ),
        check("viseme-inventory", false, "No visemes are declared."),
      ],
    },
  },
  {
    id: "review-req-s1-ollo-needs-correction",
    requirementId: "req-s1-ollo",
    sceneId: "scene-1",
    example: "needs-correction",
    candidateId: "cand-req-s1-ollo-sheet",
    candidateLabel: "Ollo view sheet",
    declaredFormat: "png",
    source: FIXTURE_SOURCE,
    license: FIXTURE_LICENSE,
    declaration: {
      kind: "character-rig",
      turnaroundViews: ["Front view", "Three-quarter view"],
      requiredPartIds: ["body", "face", "arm-left", "arm-right"],
      parts: OLLO_READY_PARTS,
      requiredMaskIds: ["mask-face-alpha"],
      masks: [{ id: "mask-face-alpha", kind: "alpha", appliesToPartId: "face" }],
      supportedProfiles: ["Kids Adventure", "Storybook Cutout"],
      expressions: ["neutral", "happy", "surprised", "worried"],
      visemes: ["rest", "ah", "ee", "oh", "oo", "mm"],
      checklist: [
        /* The contradiction: the checklist claims full turnaround coverage
         * while the declaration above lacks the Side view. */
        check("turnaround-coverage", true),
        check("part-inventory", true),
        check("mask-coverage", true),
        check("profile-coverage", true),
        check("expression-inventory", true),
        check("viseme-inventory", true),
      ],
    },
  },
  {
    id: "review-req-s1-ollo-review-ready",
    requirementId: "req-s1-ollo",
    sceneId: "scene-1",
    example: "review-ready",
    candidateId: "cand-req-s1-ollo-sheet",
    candidateLabel: "Ollo view sheet",
    declaredFormat: "png",
    source: FIXTURE_SOURCE,
    license: FIXTURE_LICENSE,
    declaration: {
      kind: "character-rig",
      turnaroundViews: ["Front view", "Three-quarter view", "Side view"],
      requiredPartIds: ["body", "face", "arm-left", "arm-right"],
      parts: OLLO_READY_PARTS,
      requiredMaskIds: ["mask-face-alpha"],
      masks: [{ id: "mask-face-alpha", kind: "alpha", appliesToPartId: "face" }],
      supportedProfiles: ["Kids Adventure", "Storybook Cutout"],
      expressions: ["neutral", "happy", "surprised", "worried"],
      visemes: ["rest", "ah", "ee", "oh", "oo", "mm"],
      checklist: [
        check("turnaround-coverage", true),
        check("part-inventory", true),
        check("mask-coverage", true),
        check("profile-coverage", true),
        check("expression-inventory", true),
        check("viseme-inventory", true),
      ],
    },
  },
  /* Scene 1 · Ollo performance rig — one declared example per state */
  {
    id: "review-req-s1-rig-ollo-incomplete",
    requirementId: "req-s1-rig-ollo",
    sceneId: "scene-1",
    example: "incomplete",
    candidateId: "cand-req-s1-rig-ollo-sheet",
    candidateLabel: "Ollo performance rig view sheet",
    declaredFormat: "png",
    source: FIXTURE_SOURCE,
    license: FIXTURE_LICENSE,
    declaration: {
      kind: "character-rig",
      turnaroundViews: ["Neutral front pose"],
      requiredPartIds: ["body", "head", "arm-left", "arm-right"],
      parts: [RIG_READY_PARTS[0]!],
      requiredMaskIds: ["mask-mouth-viseme"],
      masks: [],
      supportedProfiles: [],
      expressions: [],
      visemes: [],
      checklist: [
        check(
          "turnaround-coverage",
          false,
          "Only the Neutral front pose is declared — the Neutral side pose is not declared.",
        ),
        check(
          "part-inventory",
          false,
          "Only the body part is declared — head, arm-left, and arm-right are not declared.",
        ),
        check(
          "mask-coverage",
          false,
          "The required mask-mouth-viseme declaration is missing.",
        ),
        check(
          "profile-coverage",
          false,
          "No supported profile coverage is declared.",
        ),
        check(
          "expression-inventory",
          false,
          "No expressions are declared.",
        ),
        check("viseme-inventory", false, "No visemes are declared."),
      ],
    },
  },
  {
    id: "review-req-s1-rig-ollo-needs-correction",
    requirementId: "req-s1-rig-ollo",
    sceneId: "scene-1",
    example: "needs-correction",
    candidateId: "cand-req-s1-rig-ollo-sheet",
    candidateLabel: "Ollo performance rig view sheet",
    declaredFormat: "png",
    source: FIXTURE_SOURCE,
    license: FIXTURE_LICENSE,
    declaration: {
      kind: "character-rig",
      turnaroundViews: ["Neutral front pose", "Neutral side pose"],
      requiredPartIds: ["body", "head", "arm-left", "arm-right"],
      parts: RIG_READY_PARTS,
      requiredMaskIds: ["mask-mouth-viseme"],
      masks: [
        { id: "mask-mouth-viseme", kind: "alpha", appliesToPartId: "head" },
      ],
      supportedProfiles: ["Kids Adventure"],
      expressions: ["neutral", "determined"],
      visemes: ["rest", "ah", "oo", "mm"],
      checklist: [
        check("turnaround-coverage", true),
        check("part-inventory", true),
        check("mask-coverage", true),
        /* The contradiction: full profile coverage is claimed while
         * Storybook Cutout coverage is not declared. */
        check("profile-coverage", true),
        check("expression-inventory", true),
        check("viseme-inventory", true),
      ],
    },
  },
  {
    id: "review-req-s1-rig-ollo-review-ready",
    requirementId: "req-s1-rig-ollo",
    sceneId: "scene-1",
    example: "review-ready",
    candidateId: "cand-req-s1-rig-ollo-sheet",
    candidateLabel: "Ollo performance rig view sheet",
    declaredFormat: "png",
    source: FIXTURE_SOURCE,
    license: FIXTURE_LICENSE,
    declaration: {
      kind: "character-rig",
      turnaroundViews: ["Neutral front pose", "Neutral side pose"],
      requiredPartIds: ["body", "head", "arm-left", "arm-right"],
      parts: RIG_READY_PARTS,
      requiredMaskIds: ["mask-mouth-viseme"],
      masks: [
        { id: "mask-mouth-viseme", kind: "alpha", appliesToPartId: "head" },
      ],
      supportedProfiles: ["Kids Adventure", "Storybook Cutout"],
      expressions: ["neutral", "determined"],
      visemes: ["rest", "ah", "ee", "oh", "oo", "mm"],
      checklist: [
        check("turnaround-coverage", true),
        check("part-inventory", true),
        check("mask-coverage", true),
        check("profile-coverage", true),
        check("expression-inventory", true),
        check("viseme-inventory", true),
      ],
    },
  },
  /* Scene 1 · The Home Nook set — one declared example per state */
  {
    id: "review-req-s1-home-nook-incomplete",
    requirementId: "req-s1-home-nook",
    sceneId: "scene-1",
    example: "incomplete",
    candidateId: "cand-req-s1-home-nook-sheet",
    candidateLabel: "The Home Nook set sheet",
    declaredFormat: "png",
    source: FIXTURE_SOURCE,
    license: FIXTURE_LICENSE,
    declaration: {
      kind: "layered-set",
      planes: [
        {
          id: "plane-nook-back",
          plane: "background",
          order: 1,
          description: "Den wall, round window, and shelf backboards",
        },
      ],
      occluders: [],
      checklist: [
        check(
          "plane-coverage",
          false,
          "Only a background plane is declared — midground and foreground planes are not declared.",
        ),
        check(
          "occluder-intent",
          false,
          "No foreground occluders are declared.",
        ),
      ],
    },
  },
  {
    id: "review-req-s1-home-nook-needs-correction",
    requirementId: "req-s1-home-nook",
    sceneId: "scene-1",
    example: "needs-correction",
    candidateId: "cand-req-s1-home-nook-sheet",
    candidateLabel: "The Home Nook set sheet",
    declaredFormat: "png",
    source: FIXTURE_SOURCE,
    license: FIXTURE_LICENSE,
    declaration: {
      kind: "layered-set",
      planes: [
        {
          id: "plane-nook-back",
          plane: "background",
          order: 1,
          description: "Den wall, round window, and shelf backboards",
        },
        {
          id: "plane-nook-front",
          plane: "foreground",
          order: 2,
          description: "Window vines and near-edge leaves",
        },
      ],
      occluders: [
        {
          id: "occluder-nook-vines",
          planeId: "plane-nook-front",
          subjectRelationship:
            "Foreground vines frame Ollo reading on the cushion, passing in front of him at the frame edges.",
        },
      ],
      checklist: [
        /* The contradiction: full plane coverage is claimed while no
         * midground plane is declared. */
        check("plane-coverage", true),
        check("occluder-intent", true),
      ],
    },
  },
  {
    id: "review-req-s1-home-nook-review-ready",
    requirementId: "req-s1-home-nook",
    sceneId: "scene-1",
    example: "review-ready",
    candidateId: "cand-req-s1-home-nook-sheet",
    candidateLabel: "The Home Nook set sheet",
    declaredFormat: "png",
    source: FIXTURE_SOURCE,
    license: FIXTURE_LICENSE,
    declaration: {
      kind: "layered-set",
      planes: [
        {
          id: "plane-nook-back",
          plane: "background",
          order: 1,
          description: "Den wall, round window, and shelf backboards",
        },
        {
          id: "plane-nook-mid",
          plane: "midground",
          order: 2,
          description: "Reading cushion, low table, and story stack",
        },
        {
          id: "plane-nook-front",
          plane: "foreground",
          order: 3,
          description: "Window vines and near-edge leaves",
        },
      ],
      occluders: [
        {
          id: "occluder-nook-vines",
          planeId: "plane-nook-front",
          subjectRelationship:
            "Foreground vines frame Ollo reading on the cushion, passing in front of him at the frame edges.",
        },
      ],
      checklist: [check("plane-coverage", true), check("occluder-intent", true)],
    },
  },
  /* Scene 3 · Dot (character) — the needs-correction example with one exact
   * readable blocker */
  {
    id: "review-req-s3-dot-needs-correction",
    requirementId: "req-s3-dot",
    sceneId: "scene-3",
    example: "needs-correction",
    candidateId: "cand-req-s3-dot-sheet",
    candidateLabel: "Dot view sheet",
    declaredFormat: "png",
    source: FIXTURE_SOURCE,
    license: FIXTURE_LICENSE,
    declaration: {
      kind: "character-rig",
      turnaroundViews: ["Front view", "Three-quarter view"],
      requiredPartIds: ["body", "face"],
      parts: DOT_PARTS,
      requiredMaskIds: [],
      masks: [],
      supportedProfiles: ["Kids Adventure", "Storybook Cutout"],
      expressions: ["neutral"],
      visemes: ["rest"],
      checklist: [
        /* The one exact contradiction: full turnaround coverage is claimed
         * while the Side view is not declared. */
        check("turnaround-coverage", true),
        check("part-inventory", true),
        check("mask-coverage", true),
        check("profile-coverage", true),
        check("expression-inventory", true),
        check("viseme-inventory", true),
      ],
    },
  },
  /* Scene 5 · Lantern Bridge set — the incomplete example with readable
   * missing-plane guidance */
  {
    id: "review-req-s5-lantern-bridge-incomplete",
    requirementId: "req-s5-lantern-bridge",
    sceneId: "scene-5",
    example: "incomplete",
    candidateId: "cand-req-s5-lantern-bridge-sheet",
    candidateLabel: "Lantern Bridge set sheet",
    declaredFormat: "png",
    source: FIXTURE_SOURCE,
    license: FIXTURE_LICENSE,
    declaration: {
      kind: "layered-set",
      planes: [
        {
          id: "plane-bridge-back",
          plane: "background",
          order: 1,
          description: "Night sky and the far folded hill",
        },
        {
          id: "plane-bridge-mid",
          plane: "midground",
          order: 2,
          description: "Bridge deck, posts, and lantern line",
        },
      ],
      occluders: [],
      checklist: [
        check(
          "plane-coverage",
          false,
          "No foreground plane is declared.",
        ),
        check(
          "occluder-intent",
          false,
          "No foreground occluders are declared.",
        ),
      ],
    },
  },
];

/* ------------------------------------------------------------------ */
/* Resolution (fail closed)                                            */
/* ------------------------------------------------------------------ */

export type ReviewCandidateProvenance = "fixture" | "session-record";

export interface ResolvedReviewCandidate {
  id: string;
  label: string;
  declaredFormat: string;
  source: string;
  license: string;
  provenance: ReviewCandidateProvenance;
}

export interface ResolvedChecklistRow {
  id: ReviewChecklistId;
  label: string;
  pass: boolean;
  blockReason: string | null;
  /** True when the declared pass claim contradicts the declared facts — a
   * needs-correction finding, never a silent pass. */
  contradictory: boolean;
}

interface ResolvedReviewBase {
  fixture: ReviewFixture;
  candidate: ResolvedReviewCandidate | null;
  /** Null when the fixture and its requirement binding are internally
   * consistent. Otherwise the exact blocker; an unavailable review is shown
   * explicitly and never yields a state or a review-ready result. */
  unavailableReason: string | null;
  state: ReviewState | null;
  contradictions: readonly string[];
  missing: readonly string[];
  checklist: readonly ResolvedChecklistRow[];
}

export interface ResolvedCharacterRigReview extends ResolvedReviewBase {
  kind: "character-rig";
  requiredViews: readonly string[];
  viewStatus: readonly { view: string; declared: boolean }[];
  requiredPartStatus: readonly { partId: string; declared: boolean }[];
  parts: readonly DeclaredPart[];
  requiredMaskStatus: readonly { maskId: string; declared: boolean }[];
  masks: readonly DeclaredMask[];
  profileStatus: readonly { profile: string; declared: boolean }[];
  expressions: readonly string[];
  visemes: readonly string[];
}

export interface ResolvedLayeredSetReview extends ResolvedReviewBase {
  kind: "layered-set";
  planeCoverage: readonly { plane: string; declared: boolean }[];
  orderedPlanes: readonly DeclaredSetPlane[];
  occluders: readonly DeclaredForegroundOccluder[];
}

export type ResolvedReview = ResolvedCharacterRigReview | ResolvedLayeredSetReview;

/** The deterministic demo-candidate identities a declared review candidate
 * may use for one requirement — the same identity scheme the accepted F4-WP3
 * demo candidates use. */
export const knownDemoCandidateIds = (
  requirementId: string,
): readonly string[] => [
  `cand-${requirementId}-front`,
  `cand-${requirementId}-sheet`,
  `cand-${requirementId}-notes`,
];

/** The declared demo review fixtures bound to one requirement, in fixture
 * order. */
export const reviewFixturesFor = (
  requirementId: string,
  fixtures: readonly ReviewFixture[] = REVIEW_FIXTURES,
): readonly ReviewFixture[] =>
  fixtures.filter((fixture) => fixture.requirementId === requirementId);

const invalidCharacterRig = (
  fixture: ReviewFixture,
  reason: string,
): ResolvedCharacterRigReview => ({
  kind: "character-rig",
  fixture,
  candidate: null,
  unavailableReason: reason,
  state: null,
  contradictions: [],
  missing: [],
  checklist: [],
  requiredViews: [],
  viewStatus: [],
  requiredPartStatus: [],
  parts: [],
  requiredMaskStatus: [],
  masks: [],
  profileStatus: [],
  expressions: [],
  visemes: [],
});

const invalidLayeredSet = (
  fixture: ReviewFixture,
  reason: string,
): ResolvedLayeredSetReview => ({
  kind: "layered-set",
  fixture,
  candidate: null,
  unavailableReason: reason,
  state: null,
  contradictions: [],
  missing: [],
  checklist: [],
  planeCoverage: [],
  orderedPlanes: [],
  occluders: [],
});

const invalid = (fixture: ReviewFixture, reason: string): ResolvedReview =>
  fixture.declaration.kind === "character-rig"
    ? invalidCharacterRig(fixture, reason)
    : invalidLayeredSet(fixture, reason);

const finiteNumber = (value: number): boolean =>
  typeof value === "number" && Number.isFinite(value);

const duplicatesIn = (ids: readonly string[]): string | null => {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) return id;
    seen.add(id);
  }
  return null;
};

/** Validate a checklist declaration structurally: exactly the required
 * checks, no unknown check, and no self-contradictory check state. Returns
 * the fail-closed reason or null. */
const validateChecklist = (
  checklist: readonly ReviewChecklistDeclaration[],
  required: readonly ReviewChecklistId[],
): string | null => {
  const duplicate = duplicatesIn(checklist.map((entry) => entry.id));
  if (duplicate !== null)
    return `Duplicate required identity: checklist check "${duplicate}" is declared twice. This review fails closed as unavailable.`;
  for (const entry of checklist) {
    if (!(required as readonly string[]).includes(entry.id))
      return `Unknown checklist state: "${entry.id}" is not a bounded ${required === CHARACTER_RIG_CHECKLIST ? "character/rig" : "layered-set"} review check. This review fails closed as unavailable.`;
    if (entry.pass && entry.blockReason !== null)
      return `Contradictory checklist state: "${entry.id}" is marked passing but still carries a block reason. This review fails closed as unavailable.`;
    if (!entry.pass && entry.blockReason === null)
      return `Contradictory checklist state: "${entry.id}" is marked blocked without a readable reason. This review fails closed as unavailable.`;
  }
  for (const id of required) {
    if (!checklist.some((entry) => entry.id === id))
      return `Contradictory checklist state: the required check "${id}" is missing from the declaration. This review fails closed as unavailable.`;
  }
  return null;
};

interface ChecklistEvaluation {
  rows: readonly ResolvedChecklistRow[];
  contradictions: readonly string[];
}

/** Evaluate the declared checklist against the observed declaration facts:
 * a pass claim while the underlying declaration is incomplete is a visible
 * contradiction (needs-correction), never a pass. */
const evaluateChecklist = (
  checklist: readonly ReviewChecklistDeclaration[],
  required: readonly ReviewChecklistId[],
  incompleteByCheck: Readonly<Record<ReviewChecklistId, readonly string[]>>,
): ChecklistEvaluation => {
  const rows: ResolvedChecklistRow[] = [];
  const contradictions: string[] = [];
  for (const id of required) {
    const entry = checklist.find((candidate) => candidate.id === id)!;
    const incompleteness = incompleteByCheck[id];
    const contradictory = entry.pass && incompleteness.length > 0;
    if (contradictory)
      contradictions.push(
        `Checklist "${REVIEW_CHECKLIST_LABELS[id]}" is marked passing, but the declaration is incomplete: ${incompleteness.join("; ")}.`,
      );
    rows.push({
      id,
      label: REVIEW_CHECKLIST_LABELS[id],
      pass: entry.pass && !contradictory,
      blockReason: entry.blockReason,
      contradictory,
    });
  }
  return { rows, contradictions };
};

const NO_INCOMPLETE: Readonly<Record<ReviewChecklistId, readonly string[]>> = {
  "turnaround-coverage": [],
  "part-inventory": [],
  "mask-coverage": [],
  "profile-coverage": [],
  "expression-inventory": [],
  "viseme-inventory": [],
  "plane-coverage": [],
  "occluder-intent": [],
};

/** Validate the structural facts of a character/rig declaration. Every
 * failure is fail-closed: the review becomes explicitly unavailable and can
 * never yield a state. */
const validateCharacterRig = (
  declaration: CharacterRigDeclaration,
  requiredViews: readonly string[],
): string | null => {
  for (const view of declaration.turnaroundViews) {
    if (!requiredViews.includes(view))
      return `Unknown turnaround view: "${view}" is not one of the required views (${requiredViews.join(", ")}). This review fails closed as unavailable.`;
  }
  const duplicateRequired = duplicatesIn(declaration.requiredPartIds);
  if (duplicateRequired !== null)
    return `Duplicate required identity: part "${duplicateRequired}" is listed twice as required. This review fails closed as unavailable.`;
  const duplicatePart = duplicatesIn(
    declaration.parts.map((part) => part.id),
  );
  if (duplicatePart !== null)
    return `Duplicate required identity: part "${duplicatePart}" is declared twice. This review fails closed as unavailable.`;
  const partIds = new Set(declaration.parts.map((part) => part.id));
  const masks = declaration.masks;
  if (declaration.requiredMaskIds.length > 0 && masks === null)
    return "Missing mask declaration: masks are required but no mask declaration exists at all. This review fails closed as unavailable.";
  const duplicateRequiredMask = duplicatesIn(declaration.requiredMaskIds);
  if (duplicateRequiredMask !== null)
    return `Duplicate required identity: mask "${duplicateRequiredMask}" is listed twice as required. This review fails closed as unavailable.`;
  const maskIds = new Set((masks ?? []).map((mask) => mask.id));
  const duplicateMask = duplicatesIn((masks ?? []).map((mask) => mask.id));
  if (duplicateMask !== null)
    return `Duplicate required identity: mask "${duplicateMask}" is declared twice. This review fails closed as unavailable.`;
  for (const mask of masks ?? []) {
    if (!(KNOWN_MASK_KINDS as readonly string[]).includes(mask.kind))
      return `Unknown mask kind: "${mask.kind}" on mask "${mask.id}". This review fails closed as unavailable.`;
    if (!partIds.has(mask.appliesToPartId))
      return `Unknown part identity: mask "${mask.id}" applies to undeclared part "${mask.appliesToPartId}". This review fails closed as unavailable.`;
  }
  let rootCount = 0;
  for (const part of declaration.parts) {
    if (part.bounds === null)
      return `Missing padded bounds declaration: part "${part.id}" declares no padded bounds. This review fails closed as unavailable.`;
    const { x, y, width, height, padding } = part.bounds;
    if (
      ![x, y, width, height, padding].every(finiteNumber) ||
      width <= 0 ||
      height <= 0 ||
      padding < 0
    )
      return `Invalid padded bounds declaration: part "${part.id}" declares bounds that are non-finite, empty, or negatively padded. This review fails closed as unavailable.`;
    if (part.pivot === null)
      return `Missing pivot declaration: part "${part.id}" declares no pivot. This review fails closed as unavailable.`;
    if (!finiteNumber(part.pivot.x) || !finiteNumber(part.pivot.y))
      return `Non-finite pivot declaration: part "${part.id}" declares a pivot that is not a finite point. This review fails closed as unavailable.`;
    if (
      part.pivot.x < x ||
      part.pivot.x > x + width ||
      part.pivot.y < y ||
      part.pivot.y > y + height
    )
      return `Out-of-bounds pivot declaration: part "${part.id}" declares a pivot outside its declared padded bounds. This review fails closed as unavailable.`;
    if (part.attachment.parentPartId === null) rootCount += 1;
    else if (!partIds.has(part.attachment.parentPartId))
      return `Unknown part identity: part "${part.id}" attaches to undeclared part "${part.attachment.parentPartId}". This review fails closed as unavailable.`;
    if (part.attachment.intent.trim() === "")
      return `Invalid attachment intent: part "${part.id}" declares no readable attachment intent. This review fails closed as unavailable.`;
    if (part.maskId !== null && !maskIds.has(part.maskId))
      return `Missing mask declaration: part "${part.id}" relies on mask "${part.maskId}", which is not declared. This review fails closed as unavailable.`;
  }
  if (rootCount !== 1)
    return `Invalid attachment intent: exactly one root part is required, but ${rootCount} are declared. This review fails closed as unavailable.`;
  for (const profile of declaration.supportedProfiles) {
    if (!(SUPPORTED_PROFILES as readonly string[]).includes(profile))
      return `Unsupported profile: "${profile}" is not one of the bounded demo profiles (${SUPPORTED_PROFILES.join(", ")}). This review fails closed as unavailable.`;
  }
  for (const expression of declaration.expressions) {
    if (!(KNOWN_EXPRESSIONS as readonly string[]).includes(expression))
      return `Unknown expression: "${expression}". This review fails closed as unavailable.`;
  }
  for (const viseme of declaration.visemes) {
    if (!(KNOWN_VISEMES as readonly string[]).includes(viseme))
      return `Unknown viseme: "${viseme}". This review fails closed as unavailable.`;
  }
  return validateChecklist(declaration.checklist, CHARACTER_RIG_CHECKLIST);
};

const resolveCharacterRig = (
  fixture: ReviewFixture,
  declaration: CharacterRigDeclaration,
  candidate: ResolvedReviewCandidate,
  category: "characters" | "rigs",
): ResolvedCharacterRigReview => {
  const requiredViews =
    category === "characters" ? CHARACTER_REQUIRED_VIEWS : RIG_REQUIRED_VIEWS;
  const structuralFailure = validateCharacterRig(declaration, [
    ...requiredViews,
  ]);
  if (structuralFailure !== null)
    return invalidCharacterRig(fixture, structuralFailure);

  const declaredViews = new Set(declaration.turnaroundViews);
  const viewStatus = requiredViews.map((view) => ({
    view,
    declared: declaredViews.has(view),
  }));
  const missingViews = viewStatus
    .filter((entry) => !entry.declared)
    .map((entry) => entry.view);

  const declaredPartIds = new Set(declaration.parts.map((part) => part.id));
  const requiredPartStatus = declaration.requiredPartIds.map((partId) => ({
    partId,
    declared: declaredPartIds.has(partId),
  }));
  const missingParts = requiredPartStatus
    .filter((entry) => !entry.declared)
    .map((entry) => entry.partId);

  const declaredMaskIds = new Set(
    (declaration.masks ?? []).map((mask) => mask.id),
  );
  const requiredMaskStatus = declaration.requiredMaskIds.map((maskId) => ({
    maskId,
    declared: declaredMaskIds.has(maskId),
  }));
  const missingMasks = requiredMaskStatus
    .filter((entry) => !entry.declared)
    .map((entry) => entry.maskId);

  const declaredProfiles = new Set(declaration.supportedProfiles);
  const profileStatus = SUPPORTED_PROFILES.map((profile) => ({
    profile,
    declared: declaredProfiles.has(profile),
  }));
  const missingProfiles = profileStatus
    .filter((entry) => !entry.declared)
    .map((entry) => entry.profile);

  const missing: string[] = [];
  if (missingViews.length > 0)
    missing.push(`Turnaround views not declared: ${missingViews.join(", ")}.`);
  if (missingParts.length > 0)
    missing.push(`Required parts not declared: ${missingParts.join(", ")}.`);
  if (missingMasks.length > 0)
    missing.push(`Required masks not declared: ${missingMasks.join(", ")}.`);
  if (missingProfiles.length > 0)
    missing.push(
      `Supported profile coverage not declared: ${missingProfiles.join(", ")}.`,
    );
  if (declaration.expressions.length === 0)
    missing.push("No expressions are declared.");
  if (declaration.visemes.length === 0)
    missing.push("No visemes are declared.");

  const { rows, contradictions } = evaluateChecklist(
    declaration.checklist,
    CHARACTER_RIG_CHECKLIST,
    {
      ...NO_INCOMPLETE,
      "turnaround-coverage": missingViews.map(
        (view) => `${view} is not declared`,
      ),
      "part-inventory": missingParts.map(
        (partId) => `part "${partId}" is not declared`,
      ),
      "mask-coverage": missingMasks.map(
        (maskId) => `mask "${maskId}" is not declared`,
      ),
      "profile-coverage": missingProfiles.map(
        (profile) => `${profile} coverage is not declared`,
      ),
      "expression-inventory":
        declaration.expressions.length === 0
          ? ["no expressions are declared"]
          : [],
      "viseme-inventory":
        declaration.visemes.length === 0 ? ["no visemes are declared"] : [],
    },
  );

  /* Invalid/conflicting facts outrank completeness. */
  const state: ReviewState =
    contradictions.length > 0
      ? "needs-correction"
      : missing.length > 0
        ? "incomplete"
        : "review-ready";

  return {
    kind: "character-rig",
    fixture,
    candidate,
    unavailableReason: null,
    state,
    contradictions,
    missing,
    checklist: rows,
    requiredViews: [...requiredViews],
    viewStatus,
    requiredPartStatus,
    parts: declaration.parts,
    requiredMaskStatus,
    masks: declaration.masks ?? [],
    profileStatus,
    expressions: declaration.expressions,
    visemes: declaration.visemes,
  };
};

/** Validate the structural facts of a layered-set declaration, fail closed. */
const validateLayeredSet = (declaration: LayeredSetDeclaration): string | null => {
  const duplicatePlane = duplicatesIn(
    declaration.planes.map((plane) => plane.id),
  );
  if (duplicatePlane !== null)
    return `Duplicate required identity: plane "${duplicatePlane}" is declared twice. This review fails closed as unavailable.`;
  const orders = declaration.planes.map((plane) => plane.order);
  const duplicateOrder = duplicatesIn(orders.map((order) => String(order)));
  if (duplicateOrder !== null)
    return `Duplicate plane order: order ${duplicateOrder} is declared by two planes. This review fails closed as unavailable.`;
  const planeById = new Map(declaration.planes.map((plane) => [plane.id, plane]));
  for (const plane of declaration.planes) {
    if (!(KNOWN_SET_PLANES as readonly string[]).includes(plane.plane))
      return `Unknown layered-set plane: "${plane.plane}" on plane "${plane.id}" is not background, midground, or foreground. This review fails closed as unavailable.`;
    if (!finiteNumber(plane.order) || plane.order < 1)
      return `Invalid plane order: plane "${plane.id}" declares a non-finite or non-positive order. This review fails closed as unavailable.`;
  }
  const duplicateOccluder = duplicatesIn(
    declaration.occluders.map((occluder) => occluder.id),
  );
  if (duplicateOccluder !== null)
    return `Duplicate required identity: occluder "${duplicateOccluder}" is declared twice. This review fails closed as unavailable.`;
  for (const occluder of declaration.occluders) {
    const plane = planeById.get(occluder.planeId);
    if (!plane)
      return `Invalid foreground-occluder association: occluder "${occluder.id}" references undeclared plane "${occluder.planeId}". This review fails closed as unavailable.`;
    if (plane.plane !== "foreground")
      return `Invalid foreground-occluder association: occluder "${occluder.id}" is attached to the ${plane.plane} plane "${plane.id}" instead of a foreground plane. This review fails closed as unavailable.`;
    if (occluder.subjectRelationship.trim() === "")
      return `Invalid foreground-occluder association: occluder "${occluder.id}" declares no intended subject relationship. This review fails closed as unavailable.`;
  }
  return validateChecklist(declaration.checklist, LAYERED_SET_CHECKLIST);
};

const resolveLayeredSet = (
  fixture: ReviewFixture,
  declaration: LayeredSetDeclaration,
  candidate: ResolvedReviewCandidate,
): ResolvedLayeredSetReview => {
  const structuralFailure = validateLayeredSet(declaration);
  if (structuralFailure !== null)
    return invalidLayeredSet(fixture, structuralFailure);

  const declaredPlanes = new Set(declaration.planes.map((plane) => plane.plane));
  const planeCoverage = KNOWN_SET_PLANES.map((plane) => ({
    plane,
    declared: declaredPlanes.has(plane),
  }));
  const missingPlanes = planeCoverage
    .filter((entry) => !entry.declared)
    .map((entry) => entry.plane);
  const orderedPlanes = [...declaration.planes].sort(
    (left, right) => left.order - right.order,
  );

  const missing: string[] = [];
  if (missingPlanes.length > 0)
    missing.push(`Planes not declared: ${missingPlanes.join(", ")}.`);
  if (declaration.occluders.length === 0)
    missing.push("No foreground occluders are declared.");

  const { rows, contradictions } = evaluateChecklist(
    declaration.checklist,
    LAYERED_SET_CHECKLIST,
    {
      ...NO_INCOMPLETE,
      "plane-coverage": missingPlanes.map(
        (plane) => `no ${plane} plane is declared`,
      ),
      "occluder-intent":
        declaration.occluders.length === 0
          ? ["no foreground occluders are declared"]
          : [],
    },
  );

  const state: ReviewState =
    contradictions.length > 0
      ? "needs-correction"
      : missing.length > 0
        ? "incomplete"
        : "review-ready";

  return {
    kind: "layered-set",
    fixture,
    candidate,
    unavailableReason: null,
    state,
    contradictions,
    missing,
    checklist: rows,
    planeCoverage,
    orderedPlanes,
    occluders: declaration.occluders,
  };
};

/** Resolve one review fixture against its exact requirement binding, failing
 * closed: unknown requirement/candidate/category, stale scene association,
 * an unavailable requirement, duplicate identities, and every structural
 * declaration defect become explicit unavailable results that never enter
 * counts or a review-ready state. Session-local candidate records, when one
 * carries the declared identity, supply the visible source/rights truth;
 * otherwise the fixture's own declared text is shown. */
export const resolveReviewFixture = (
  fixture: ReviewFixture,
  item: ResolvedSceneRequirement | null,
  sessionCandidates: readonly LocalCandidateRecord[] = [],
): ResolvedReview => {
  if (item === null || fixture.requirementId !== item.entry.id)
    return invalid(
      fixture,
      `Unknown requirement identity: ${fixture.requirementId}. This review fails closed as unavailable and is never counted.`,
    );
  if (item.unavailableReason !== null)
    return invalid(
      fixture,
      `Unavailable requirement: ${item.unavailableReason} This review fails closed as unavailable.`,
    );
  if (fixture.sceneId !== item.entry.sceneId)
    return invalid(
      fixture,
      `Stale scene association: this review is declared for ${fixture.sceneId}, but the requirement is scoped to ${item.entry.sceneId} (${requirementSceneLabel(item.entry.sceneId)}). This review fails closed as unavailable.`,
    );
  const category = item.entry.category;
  if (
    fixture.declaration.kind === "character-rig" &&
    category !== "characters" &&
    category !== "rigs"
  )
    return invalid(
      fixture,
      `Mismatched category: a character/rig review cannot describe the ${category} requirement "${item.entry.plannedName}". This review fails closed as unavailable.`,
    );
  if (fixture.declaration.kind === "layered-set" && category !== "layered-sets")
    return invalid(
      fixture,
      `Mismatched category: a layered-set review cannot describe the ${category} requirement "${item.entry.plannedName}". This review fails closed as unavailable.`,
    );

  const sessionRecord = sessionCandidates.find(
    (record) =>
      record.id === fixture.candidateId &&
      record.requirementId === item.entry.id,
  );
  if (
    sessionRecord === undefined &&
    !knownDemoCandidateIds(item.entry.id).includes(fixture.candidateId)
  )
    return invalid(
      fixture,
      `Unknown candidate identity: ${fixture.candidateId} is neither a deterministic demo-candidate identity nor a session-local candidate record for this requirement. This review fails closed as unavailable.`,
    );

  const candidate: ResolvedReviewCandidate =
    sessionRecord !== undefined
      ? {
          id: sessionRecord.id,
          label: sessionRecord.name,
          declaredFormat: sessionRecord.declaredFormat,
          source: sessionRecord.source,
          license: sessionRecord.license,
          provenance: "session-record",
        }
      : {
          id: fixture.candidateId,
          label: fixture.candidateLabel,
          declaredFormat: fixture.declaredFormat,
          source: fixture.source,
          license: fixture.license,
          provenance: "fixture",
        };

  if (fixture.declaration.kind === "character-rig")
    return resolveCharacterRig(
      fixture,
      fixture.declaration,
      candidate,
      category as "characters" | "rigs",
    );
  return resolveLayeredSet(fixture, fixture.declaration, candidate);
};

/** Resolve every declared review example for one requirement, failing closed
 * on duplicate review-record identity: when two fixtures share one id, every
 * fixture carrying that duplicated identity becomes unavailable. */
export const resolveReviewList = (
  item: ResolvedSceneRequirement,
  fixtures: readonly ReviewFixture[] = REVIEW_FIXTURES,
  sessionCandidates: readonly LocalCandidateRecord[] = [],
): readonly ResolvedReview[] => {
  const bound = reviewFixturesFor(item.entry.id, fixtures);
  const duplicated = new Set<string>();
  const seen = new Set<string>();
  for (const fixture of bound) {
    if (seen.has(fixture.id)) duplicated.add(fixture.id);
    seen.add(fixture.id);
  }
  return bound.map((fixture) =>
    duplicated.has(fixture.id)
      ? invalid(
          fixture,
          `Duplicate required identity: review record "${fixture.id}" is declared twice for this requirement. This review fails closed as unavailable.`,
        )
      : resolveReviewFixture(fixture, item, sessionCandidates),
  );
};

/** Whether a requirement exposes a review action at all: only character,
 * rig, and layered-set requirements that themselves resolved cleanly. Other
 * categories omit the action; an eligible requirement without a declared
 * example shows the truthful disabled reason. */
export const reviewEligibility = (
  item: ResolvedSceneRequirement,
): "eligible" | "omit" | "requirement-unavailable" => {
  if (item.unavailableReason !== null) return "requirement-unavailable";
  if (
    item.entry.category === "characters" ||
    item.entry.category === "rigs" ||
    item.entry.category === "layered-sets"
  )
    return "eligible";
  return "omit";
};
