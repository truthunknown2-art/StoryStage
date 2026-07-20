import {
  candidateRigReviewRegistrationPlanSchema,
  characterRigAssetRequestSchema,
  characterRigCandidateBundleSchema,
  characterRigImportReceiptSchema,
  characterRigStagingReportSchema,
  hashCanonical,
  kidsBipedV1TopologyTemplate,
  validateCharacterRigImportReceipt,
  type CandidateRigReviewRegistrationPlan,
} from "@storystage/story-engine";
import {
  createOlloCandidateIProposedReviewRecipes,
  type OlloCandidateIAtlasMap,
} from "./ollo-candidate-i-review-recipes";

type ReviewView = "front" | "profile-left" | "profile-right";
type Point = { x: number; y: number };
type Guide = Point & { rotation: number; scale: number };

export type OlloCandidateIRegistrationEvidence = {
  request: unknown;
  bundle: unknown;
  stagingReport: unknown;
  importReceipt: unknown;
  atlasMaps: OlloCandidateIAtlasMap[];
};

const extractionPadding = 8;

/**
 * Proximal pivot positions within each exact extracted source component.
 * These values are measured from alpha-content bounds, never atlas-cell
 * centers. The diagnostic guide still requires Preston's visual review.
 */
const bodyPivotV: Record<string, number> = {
  torso: 0.5,
  pelvis: 0.08,
  head: 0.96,
  "ear-left": 0.96,
  "ear-right": 0.96,
  "upper-arm-left": 0.06,
  "lower-arm-left": 0.06,
  "hand-left": 0.08,
  "upper-arm-right": 0.06,
  "lower-arm-right": 0.06,
  "hand-right": 0.08,
  "upper-leg-left": 0.06,
  "lower-leg-left": 0.06,
  "foot-left": 0.08,
  "upper-leg-right": 0.06,
  "lower-leg-right": 0.06,
  "foot-right": 0.08,
  tail: 0.94,
  "secondary-front": 0.08,
  "secondary-back": 0.08,
};

const g = (x: number, y: number, scale: number, rotation = 0): Guide => ({
  x,
  y,
  scale,
  rotation,
});

const tailRecipeCorrections: Partial<
  Record<ReviewView, { childPivot: Point; guide: Guide }>
> = {
  // Private gap/orbit diagnostics found that the original guide-derived tail
  // origins rotate around stale source pivots. These remain proposed recipe
  // inputs: they align the fixed evidence-led sockets without granting review.
  front: {
    childPivot: { x: 141, y: 201 },
    guide: g(347.28, 677.3, 0.6, -15),
  },
  "profile-left": {
    childPivot: { x: 156, y: 266 },
    guide: g(333.76, 681.68, 0.55, -18),
  },
};

/**
 * Manually authored against the exact 576x832 Candidate-H turnaround views.
 * They are diagnostic targets, not accepted registration measurements.
 */
const targetGuides: Record<ReviewView, Record<string, Guide>> = {
  front: {
    torso: g(288, 575, 1.1),
    pelvis: g(288, 650, 0.78),
    head: g(288, 466, 1.12),
    "ear-left": g(178, 286, 1.08, -8),
    "ear-right": g(398, 286, 1.08, 8),
    "upper-arm-left": g(205, 478, 0.48, 28),
    "lower-arm-left": g(166, 544, 0.44, 28),
    "hand-left": g(130, 598, 0.4, 18),
    "upper-arm-right": g(371, 478, 0.48, -28),
    "lower-arm-right": g(410, 544, 0.44, -28),
    "hand-right": g(446, 598, 0.4, -18),
    "upper-leg-left": g(262, 662, 0.34, 3),
    "lower-leg-left": g(252, 718, 0.3, 1),
    "foot-left": g(248, 771, 0.38),
    "upper-leg-right": g(314, 662, 0.34, -3),
    "lower-leg-right": g(324, 718, 0.3, -1),
    "foot-right": g(328, 771, 0.38),
    tail: tailRecipeCorrections.front!.guide,
    "secondary-front": g(288, 468, 1.08),
    "secondary-back": g(360, 470, 0.68, -2),
    "eye-white-left": g(227, 359, 0.34),
    "eye-white-right": g(347, 359, 0.34),
    "pupil-left": g(227, 365, 0.29),
    "pupil-right": g(346, 365, 0.29),
    "lid-open-left": g(227, 359, 0.34),
    "lid-open-right": g(347, 359, 0.34),
    "brow-neutral-left": g(216, 300, 0.36),
    "brow-neutral-right": g(358, 300, 0.36),
    "mouth-rest": g(287, 417, 0.21),
  },
  "profile-left": {
    torso: g(292, 594, 0.78),
    pelvis: g(292, 650, 0.48),
    head: g(276, 466, 1),
    "ear-left": g(344, 305, 0.85, -5),
    "ear-right": g(315, 298, 0.78, -7),
    "upper-arm-left": g(305, 492, 0.36, -5),
    "lower-arm-left": g(318, 563, 0.3, -2),
    "hand-left": g(326, 618, 0.38),
    "upper-arm-right": g(285, 492, 0.33, -2),
    "lower-arm-right": g(287, 558, 0.27),
    "hand-right": g(289, 611, 0.33),
    "upper-leg-left": g(303, 658, 0.28),
    "lower-leg-left": g(306, 718, 0.24),
    "foot-left": g(303, 770, 0.4),
    "upper-leg-right": g(270, 658, 0.26),
    "lower-leg-right": g(260, 715, 0.23),
    "foot-right": g(250, 768, 0.37),
    tail: tailRecipeCorrections["profile-left"]!.guide,
    "secondary-front": g(255, 468, 0.82),
    "secondary-back": g(335, 468, 0.75),
    "eye-white-left": g(174, 359, 0.3),
    "eye-white-right": g(207, 358, 0.23),
    "pupil-left": g(174, 361, 0.29),
    "pupil-right": g(207, 359, 0.22),
    "lid-open-left": g(174, 359, 0.3),
    "lid-open-right": g(207, 358, 0.23),
    "brow-neutral-left": g(184, 300, 0.3),
    "brow-neutral-right": g(211, 305, 0.23),
    "mouth-rest": g(149, 420, 0.2),
  },
  "profile-right": {
    torso: g(284, 590, 0.78),
    pelvis: g(284, 650, 0.48),
    head: g(300, 466, 1),
    "ear-left": g(232, 305, 0.84, 5),
    "ear-right": g(263, 298, 0.78, 7),
    "upper-arm-left": g(271, 492, 0.36, 5),
    "lower-arm-left": g(258, 563, 0.3, 2),
    "hand-left": g(250, 618, 0.38),
    "upper-arm-right": g(291, 492, 0.33, 2),
    "lower-arm-right": g(289, 558, 0.27),
    "hand-right": g(287, 611, 0.33),
    "upper-leg-left": g(273, 658, 0.28),
    "lower-leg-left": g(270, 718, 0.24),
    "foot-left": g(273, 770, 0.4),
    "upper-leg-right": g(306, 658, 0.26),
    "lower-leg-right": g(316, 715, 0.23),
    "foot-right": g(326, 768, 0.37),
    tail: g(203, 650, 0.55, 18),
    "secondary-front": g(321, 468, 0.82),
    "secondary-back": g(241, 468, 0.75),
    "eye-white-left": g(391, 359, 0.3),
    "eye-white-right": g(365, 358, 0.23),
    "pupil-left": g(391, 361, 0.29),
    "pupil-right": g(365, 359, 0.22),
    "lid-open-left": g(391, 359, 0.3),
    "lid-open-right": g(365, 358, 0.23),
    "brow-neutral-left": g(392, 300, 0.3),
    "brow-neutral-right": g(365, 305, 0.23),
    "mouth-rest": g(427, 420, 0.2),
  },
};

const faceOrder = [
  "mouth-rest",
  "eye-white-left",
  "eye-white-right",
  "pupil-left",
  "pupil-right",
  "lid-open-left",
  "lid-open-right",
  "brow-neutral-left",
  "brow-neutral-right",
];

const frontZOrder = [
  "secondary-back",
  "tail",
  "ear-left",
  "ear-right",
  "upper-leg-left",
  "lower-leg-left",
  "foot-left",
  "upper-leg-right",
  "lower-leg-right",
  "foot-right",
  "torso",
  "pelvis",
  "head",
  "secondary-front",
  "upper-arm-left",
  "lower-arm-left",
  "hand-left",
  "upper-arm-right",
  "lower-arm-right",
  "hand-right",
  ...faceOrder,
];

const profileZOrder = [
  "secondary-back",
  "tail",
  "ear-left",
  "ear-right",
  "upper-leg-right",
  "lower-leg-right",
  "foot-right",
  "upper-arm-right",
  "lower-arm-right",
  "hand-right",
  "torso",
  "pelvis",
  "head",
  "secondary-front",
  "upper-leg-left",
  "lower-leg-left",
  "foot-left",
  "upper-arm-left",
  "lower-arm-left",
  "hand-left",
  ...faceOrder,
];

const rounded = (value: number) => Number(value.toFixed(6));

const sourcePivot = (
  role: string,
  component: OlloCandidateIAtlasMap["components"][number],
): Point => {
  const bounds = component.atlasContentBounds;
  const cell = component.atlasCell;
  const v = bodyPivotV[role] ?? 0.5;
  return {
    x: Math.round(extractionPadding + (bounds.x - cell.x) + bounds.width * 0.5),
    y: Math.round(extractionPadding + (bounds.y - cell.y) + bounds.height * v),
  };
};

const inverseParentOffset = (parent: Guide, child: Guide): Point => {
  const radians = (-parent.rotation * Math.PI) / 180;
  const dx = (child.x - parent.x) / parent.scale;
  const dy = (child.y - parent.y) / parent.scale;
  return {
    x: Math.cos(radians) * dx - Math.sin(radians) * dy,
    y: Math.sin(radians) * dx + Math.cos(radians) * dy,
  };
};

const assertExactRoleCoverage = (
  view: ReviewView,
  values: string[],
  label: string,
) => {
  const expected = kidsBipedV1TopologyTemplate.parts
    .map((part) => part.role)
    .sort();
  const actual = [...values].sort();
  if (
    actual.length !== expected.length ||
    new Set(actual).size !== actual.length ||
    hashCanonical(actual) !== hashCanonical(expected)
  )
    throw new Error(
      `Candidate I ${view} ${label} does not exactly cover kids-biped-v1 parts.`,
    );
};

const createPlan = (
  evidence: OlloCandidateIRegistrationEvidence,
  view: ReviewView,
): CandidateRigReviewRegistrationPlan => {
  const request = characterRigAssetRequestSchema.parse(evidence.request);
  const bundle = characterRigCandidateBundleSchema.parse(evidence.bundle);
  const report = characterRigStagingReportSchema.parse(evidence.stagingReport);
  const receipt = characterRigImportReceiptSchema.parse(evidence.importReceipt);
  const atlases = evidence.atlasMaps.filter((atlas) => atlas.view === view);
  const partsAtlas = atlases.find((atlas) => atlas.kind === "parts-kit");
  const faceAtlas = atlases.find((atlas) => atlas.kind === "face-kit");
  if (!partsAtlas || !faceAtlas || atlases.length !== 2)
    throw new Error(`Candidate I ${view} requires exact parts and face maps.`);

  const componentByRole = new Map(
    atlases.flatMap((atlas) =>
      atlas.components.map((component) => [component.role, component] as const),
    ),
  );
  const guideByRole = targetGuides[view];
  assertExactRoleCoverage(view, Object.keys(guideByRole), "target guide");

  const pivotByRole = new Map(
    kidsBipedV1TopologyTemplate.parts.map((rule) => {
      const component = componentByRole.get(rule.role);
      if (!component)
        throw new Error(`Candidate I ${view} is missing ${rule.role}.`);
      const correctedTailPivot = tailRecipeCorrections[view]?.childPivot;
      return [
        rule.role,
        rule.role === "tail" && correctedTailPivot
          ? correctedTailPivot
          : sourcePivot(rule.role, component),
      ] as const;
    }),
  );
  const zOrder = view === "front" ? frontZOrder : profileZOrder;
  assertExactRoleCoverage(view, zOrder, "z order");
  const zIndexByRole = new Map(
    zOrder.map((role, index) => [role, index] as const),
  );

  const socketsByParent = new Map<
    string,
    Array<{ id: string; position: Point }>
  >();
  const parentJointByRole = new Map<string, Point>();
  const restByRole = new Map<
    string,
    { x: number; y: number; rotation: number; scaleX: number; scaleY: number }
  >();

  for (const rule of kidsBipedV1TopologyTemplate.parts) {
    const guide = guideByRole[rule.role]!;
    if (!rule.parentRole) {
      restByRole.set(rule.role, {
        x: guide.x,
        y: guide.y,
        rotation: guide.rotation,
        scaleX: guide.scale,
        scaleY: guide.scale,
      });
      continue;
    }
    const parentGuide = guideByRole[rule.parentRole]!;
    const parentPivot = pivotByRole.get(rule.parentRole)!;
    const offset = inverseParentOffset(parentGuide, guide);
    // Points are schema-bound integers. Quantize once and use that same point
    // for metadata and the compositor translation so no seam is introduced.
    const socket = {
      x: Math.round(parentPivot.x + offset.x),
      y: Math.round(parentPivot.y + offset.y),
    };
    const restX = socket.x - parentPivot.x;
    const restY = socket.y - parentPivot.y;
    parentJointByRole.set(rule.role, socket);
    const sockets = socketsByParent.get(rule.parentRole) ?? [];
    sockets.push({ id: rule.parentSocketId!, position: socket });
    socketsByParent.set(rule.parentRole, sockets);
    restByRole.set(rule.role, {
      x: restX,
      y: restY,
      rotation: rounded(guide.rotation - parentGuide.rotation),
      scaleX: rounded(guide.scale / parentGuide.scale),
      scaleY: rounded(guide.scale / parentGuide.scale),
    });
  }

  const draft = {
    schemaVersion: "1.0" as const,
    authorityDomain: "source-review-registration-input" as const,
    registrationState: "proposed" as const,
    view,
    requestContentHash: request.contentHash,
    candidateBundleContentHash: bundle.contentHash,
    stagingReportContentHash: report.contentHash,
    importReceiptContentHash: receipt.contentHash,
    identityLockContentHash: request.identityLock.contentHash,
    topologyTemplateContentHash: request.rigProfile.templateContentHash,
    atlasMapContentHashes: {
      parts: partsAtlas.mapContentHash,
      face: faceAtlas.mapContentHash,
    },
    parts: kidsBipedV1TopologyTemplate.parts
      .map((rule) => ({
        role: rule.role,
        childPivot: pivotByRole.get(rule.role)!,
        parentJoint: parentJointByRole.get(rule.role) ?? null,
        restTransform: restByRole.get(rule.role)!,
        sockets: (socketsByParent.get(rule.role) ?? []).sort((left, right) =>
          left.id.localeCompare(right.id),
        ),
        zIndex: zIndexByRole.get(rule.role)!,
      }))
      .sort((left, right) => left.role.localeCompare(right.role)),
    exposures: kidsBipedV1TopologyTemplate.exposures
      .map((exposure) => ({
        role: exposure.role,
        // Exposure canvases replace their base part. Exact pivot equality is
        // required even when the exposure's own alpha bounds differ.
        childPivot: pivotByRole.get(exposure.targetRole)!,
      }))
      .sort((left, right) => left.role.localeCompare(right.role)),
    approvalRequired: true as const,
    productionBindable: false as const,
  };
  return candidateRigReviewRegistrationPlanSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
};

/**
 * Creates all three Candidate-I proposed diagnostic registration plans. This
 * function deliberately grants no review, approval, preparation, capability,
 * or production authority.
 */
export const createOlloCandidateIProposedRegistrationPlans = (
  evidence: OlloCandidateIRegistrationEvidence,
): CandidateRigReviewRegistrationPlan[] => {
  const request = characterRigAssetRequestSchema.parse(evidence.request);
  const bundle = characterRigCandidateBundleSchema.parse(evidence.bundle);
  const report = characterRigStagingReportSchema.parse(evidence.stagingReport);
  const receipt = characterRigImportReceiptSchema.parse(evidence.importReceipt);
  validateCharacterRigImportReceipt(request, bundle, report, receipt);
  const plans = (["front", "profile-left", "profile-right"] as const).map(
    (view) => createPlan(evidence, view),
  );
  // Reuse the exact Candidate-I compiler as the final fail-closed check over
  // imported lineage, atlas maps, topology coverage, and registration inputs.
  createOlloCandidateIProposedReviewRecipes({
    ...evidence,
    registrationPlans: plans,
  });
  return plans;
};
