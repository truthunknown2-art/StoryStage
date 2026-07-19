import {
  articulatedCharacterRigManifestSchema,
  hashCanonical,
  type AssetRigManifest,
  type LocalPerformanceInput,
  type VisualPerformanceRenderer,
} from "@storystage/story-engine/director-alpha";
import capabilityAssetCatalog from "./generated-capability-asset-catalog.json";

const PUPPET_ASSET_ID = "mara-payoff-puppet-v1";
const PART_BORDER = 24;

const catalogEntry = (assetId: string) => {
  const entry = capabilityAssetCatalog.assets.find(
    (candidate) => candidate.assetId === assetId,
  );
  if (!entry)
    throw new Error(`Bundled local-parts asset is missing: ${assetId}`);
  return entry;
};

const puppetCatalogEntry = catalogEntry(PUPPET_ASSET_ID);

const registration = {
  anchorX: 0.5,
  anchorY: 1,
  pivotX: 836,
  pivotY: 900,
  groundY: 900,
};

const puppetAsset = (fileRole: string) => ({
  candidateId: PUPPET_ASSET_ID,
  fileRole,
  contentHash: puppetCatalogEntry.contentHash,
  relativeFile: puppetCatalogEntry.relativeFile,
  width: puppetCatalogEntry.width,
  height: puppetCatalogEntry.height,
  registration,
});

const partSources = {
  "leg-left": {
    bounds: { x: 660, y: 560, width: 250, height: 270 },
    pivot: { x: 785, y: 815 },
    sockets: [],
  },
  "leg-right": {
    bounds: { x: 920, y: 560, width: 270, height: 270 },
    pivot: { x: 1055, y: 815 },
    sockets: [],
  },
  "thigh-left": {
    bounds: { x: 710, y: 430, width: 190, height: 180 },
    pivot: { x: 805, y: 595 },
    sockets: [],
  },
  "thigh-right": {
    bounds: { x: 900, y: 430, width: 200, height: 180 },
    pivot: { x: 1000, y: 595 },
    sockets: [],
  },
  "upper-arm-left": {
    bounds: { x: 520, y: 45, width: 180, height: 275 },
    pivot: { x: 610, y: 65 },
    sockets: [],
  },
  "lower-arm-left": {
    bounds: { x: 520, y: 290, width: 200, height: 245 },
    pivot: { x: 610, y: 310 },
    sockets: [{ id: "left-hand", position: { x: 632, y: 503 } }],
  },
  torso: {
    bounds: { x: 730, y: 35, width: 350, height: 410 },
    pivot: { x: 905, y: 420 },
    sockets: [],
  },
  "upper-arm-right": {
    bounds: { x: 1110, y: 40, width: 180, height: 280 },
    pivot: { x: 1200, y: 60 },
    sockets: [],
  },
  "lower-arm-right": {
    bounds: { x: 1080, y: 290, width: 210, height: 250 },
    pivot: { x: 1185, y: 310 },
    sockets: [{ id: "right-hand", position: { x: 1178, y: 503 } }],
  },
  head: {
    bounds: { x: 30, y: 20, width: 490, height: 430 },
    pivot: { x: 275, y: 430 },
    sockets: [],
  },
} as const;

type PartId = keyof typeof partSources;

const separatedPart = (partId: PartId) => {
  const source = partSources[partId];
  const entry = catalogEntry(`mara-local-${partId}-v1`);
  const localPoint = (point: { x: number; y: number }) => ({
    x: point.x - source.bounds.x + PART_BORDER,
    y: point.y - source.bounds.y + PART_BORDER,
  });
  const pivot = localPoint(source.pivot);
  const partRegistration = {
    anchorX: 0.5,
    anchorY: 1,
    pivotX: pivot.x,
    pivotY: pivot.y,
    groundY: entry.height - 1,
  };
  return {
    asset: {
      candidateId: entry.assetId,
      fileRole: partId,
      contentHash: entry.contentHash,
      relativeFile: entry.relativeFile,
      width: entry.width,
      height: entry.height,
      registration: partRegistration,
    },
    bounds: { x: 0, y: 0, width: entry.width, height: entry.height },
    pivot,
    sockets: source.sockets.map((socket) => ({
      id: socket.id,
      position: localPoint(socket.position),
    })),
  };
};

const exposureAsset = (
  exposureId: "mouth-open" | "mouth-rest",
  headRegistration: ReturnType<typeof separatedPart>["asset"]["registration"],
) => {
  const entry = catalogEntry(`mara-local-${exposureId}-v1`);
  return {
    candidateId: entry.assetId,
    fileRole: exposureId,
    contentHash: entry.contentHash,
    relativeFile: entry.relativeFile,
    width: entry.width,
    height: entry.height,
    registration: headRegistration,
  };
};

const manifestDraft = (target: {
  entityId: string;
  requirementId: string;
}) => {
  const headPart = separatedPart("head");
  return {
  schemaVersion: "1.0" as const,
  manifestId: "mara-local-parts-rig-v1",
  candidateSetId: "mara-payoff-puppet-v1",
  briefId: "mara-local-parts-brief-v1",
  requirementId: target.requirementId,
  entityId: target.entityId,
  entityName: "Mara",
  createdAt: "2026-07-18T00:00:00.000Z",
  type: "character-rig" as const,
  animationMode: "articulated-2d" as const,
  identityReference: puppetAsset("identity-reference"),
  renderer: { id: "director-local-parts", version: "1.0.0" },
  template: { id: "kids-local-parts", version: "1.0.0" },
  parts: [
    {
      id: "leg-left",
      parentId: "thigh-left",
      ...separatedPart("leg-left"),
    },
    {
      id: "leg-right",
      parentId: "thigh-right",
      ...separatedPart("leg-right"),
    },
    {
      id: "thigh-left",
      parentId: "torso",
      ...separatedPart("thigh-left"),
    },
    {
      id: "thigh-right",
      parentId: "torso",
      ...separatedPart("thigh-right"),
    },
    {
      id: "upper-arm-left",
      parentId: "torso",
      ...separatedPart("upper-arm-left"),
    },
    {
      id: "lower-arm-left",
      parentId: "upper-arm-left",
      ...separatedPart("lower-arm-left"),
    },
    {
      id: "torso",
      parentId: null,
      ...separatedPart("torso"),
    },
    {
      id: "upper-arm-right",
      parentId: "torso",
      ...separatedPart("upper-arm-right"),
    },
    {
      id: "lower-arm-right",
      parentId: "upper-arm-right",
      ...separatedPart("lower-arm-right"),
    },
    {
      id: "head",
      parentId: "torso",
      ...headPart,
    },
  ],
  exposures: [
    {
      id: "mouth-rest",
      partId: "head",
      asset: exposureAsset("mouth-rest", headPart.asset.registration),
    },
    {
      id: "mouth-open",
      partId: "head",
      asset: exposureAsset("mouth-open", headPart.asset.registration),
    },
  ],
  visemeIds: ["rest", "open"],
  visemeMappings: [
    { visemeId: "rest", exposureId: "mouth-rest" },
    { visemeId: "open", exposureId: "mouth-open" },
  ],
  };
};

export const createBundledMaraLocalPartsRigManifest = (target: {
  entityId: string;
  requirementId: string;
}) => {
  const draft = manifestDraft(target);
  return articulatedCharacterRigManifestSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
};

export const bundledMaraLocalPartsRigManifest =
  createBundledMaraLocalPartsRigManifest({
    entityId: "lead",
    requirementId: "performance-1-primary",
  });

export type BundledMaraLocalPartsRigManifest = Extract<
  AssetRigManifest,
  { animationMode: "articulated-2d" }
>;

const parentLocalPlacement = {
  "leg-left": { x: 0, y: 201 },
  "leg-right": { x: 0, y: 201 },
  "thigh-left": { x: -62, y: 155 },
  "thigh-right": { x: 68, y: 155 },
  "upper-arm-left": { x: -142, y: -290 },
  "lower-arm-left": { x: 20, y: 205 },
  torso: { x: 0, y: -400 },
  "upper-arm-right": { x: 145, y: -290 },
  "lower-arm-right": { x: 0, y: 205 },
  head: { x: 0, y: -355 },
} as const;

const seedOffset = (seed: string): number =>
  Number.parseInt(seed.slice(0, 8), 16);
const actionWeight = (input: LocalPerformanceInput): number => {
  if (input.actionPhase === "anticipation") return -0.35 * input.phaseProgress;
  if (input.actionPhase === "action" || input.actionPhase === "impact")
    return input.phaseProgress;
  if (input.actionPhase === "reaction") return 1 - input.phaseProgress * 0.35;
  if (input.actionPhase === "settle") return 0.65 * (1 - input.phaseProgress);
  return 0;
};

/**
 * Pure, frame-addressed actor-local performance. It can move only allowlisted
 * parts and sockets; continuity remains the sole owner of the actor root.
 */
export const maraLocalPartsVisualPerformanceRenderer: VisualPerformanceRenderer =
  {
    rendererId: "director-local-parts",
    rendererVersion: "1.0.0",
    evaluate(input) {
      const gait = input.gaitPhase ?? 0;
      const locomotion = input.gaitPhase === null ? 0 : 1;
      const stride = Math.sin(gait * Math.PI * 2) * locomotion;
      const lift = Math.max(0, Math.sin(gait * Math.PI * 2)) * locomotion;
      const action = actionWeight(input);
      const micro = Math.sin(
        ((input.localFrame + (seedOffset(input.microMotionSeed) % 71)) /
          input.fps) *
          Math.PI *
          2 *
          0.42,
      );
      const bob = Math.abs(Math.sin(gait * Math.PI * 2)) * 7 * locomotion;
      const rotationByPart: Record<string, number> = {
        "leg-left": 24 * stride,
        "leg-right": -24 * stride,
        "thigh-left": -18 * stride,
        "thigh-right": 18 * stride,
        "upper-arm-left": 13 * stride - 12 * action,
        "lower-arm-left": -8 * stride - 9 * action,
        torso: -3 * stride + 1.2 * micro,
        "upper-arm-right": -13 * stride - 66 * action,
        "lower-arm-right": 8 * stride - 24 * action,
        head: -1.5 * micro - 8 * action,
      };
      const parts = Object.fromEntries(
        input.program.partIds.map((partId) => {
          const placement =
            parentLocalPlacement[partId as keyof typeof parentLocalPlacement];
          if (!placement)
            throw new Error(
              `Mara local-parts renderer does not author ${partId}.`,
            );
          const legLift =
            partId === "leg-left"
              ? -lift * 8
              : partId === "leg-right"
                ? -(1 - lift) * 3 * locomotion
                : 0;
          return [
            partId,
            {
              x: placement.x,
              y: placement.y - (partId === "torso" ? bob : 0) + legLift,
              rotation: rotationByPart[partId] ?? 0,
              scaleX: 1,
              scaleY: 1,
              opacity: 1,
              exposureId: null,
            },
          ];
        }),
      );
      const blinkFrame =
        (input.localFrame + (seedOffset(input.microMotionSeed) % 97)) % 97;
      const eyeOpen = blinkFrame === 0 ? 0.08 : blinkFrame === 1 ? 0.42 : 1;
      const gaze = input.gazeVectorLocal;
      return {
        parts,
        face: {
          eyeOpen,
          pupilX: gaze ? Math.max(-1, Math.min(1, gaze.x)) : 0,
          pupilY: gaze ? Math.max(-1, Math.min(1, gaze.y)) : 0,
          brow: Math.max(-1, Math.min(1, action * 0.6)),
          mouthExposureId:
            input.visemeId === "open"
              ? "mouth-open"
              : input.visemeId === "rest"
                ? "mouth-rest"
                : null,
        },
        sockets: {
          "left-hand": {
            x: -118 - 18 * action,
            y: -290 - 20 * action - bob,
            rotation: -8 * stride - 9 * action,
            scale: 1,
          },
          "right-hand": {
            x: 148 + 42 * action,
            y: -290 - 96 * action - bob,
            rotation: 8 * stride - 24 * action,
            scale: 1,
          },
        },
        localEffects: [],
      };
    },
  };

export const bundledMaraPuppetAsset = {
  assetId: PUPPET_ASSET_ID,
  contentHash: puppetCatalogEntry.contentHash,
  byteLength: puppetCatalogEntry.byteLength,
  width: puppetCatalogEntry.width,
  height: puppetCatalogEntry.height,
  relativeFile: puppetCatalogEntry.relativeFile,
  immutableLocationId: puppetCatalogEntry.immutableLocationId,
} as const;
