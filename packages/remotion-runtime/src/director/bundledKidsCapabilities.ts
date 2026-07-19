import {
  createCapabilityRegistry,
  type CapabilityRegistry,
  type PerformanceCapabilityDraft,
} from "@storystage/story-engine/director-alpha";
import maraPerformanceAtlas from "../../public/show-packs/kids/moonlit-ruins/v1/rigs/mara/performance-v1/atlas-manifest.json";
import maraRunAtlas from "../../public/show-packs/kids/moonlit-ruins/v1/rigs/mara/run-right-v1/atlas-manifest.json";
import capabilityAssetCatalog from "./generated-capability-asset-catalog.json";

export type BundledKidsCapabilityTarget = {
  kind: "atlas-cycle" | "articulated-rig" | "living-hold";
  requirementId: string;
  entityId: string;
};
export type BundledKidsCapabilityKind = BundledKidsCapabilityTarget["kind"];

const measuredFrames = (atlas: typeof maraPerformanceAtlas) =>
  atlas.frames.map((frame) => ({
    source: frame.source,
    anchor: frame.anchor,
  }));

const asset = (assetId: string) => {
  const entry = capabilityAssetCatalog.assets.find(
    (candidate) => candidate.assetId === assetId,
  );
  if (!entry)
    throw new Error(`Bundled capability asset is missing: ${assetId}`);
  return {
    assetId: entry.assetId,
    contentHash: entry.contentHash,
    byteLength: entry.byteLength,
    immutableLocationId: entry.immutableLocationId,
    relativeFile: entry.relativeFile,
    version: "1.0.0",
    status: "approved" as const,
  };
};

const assertAtlasCatalogBinding = (
  atlas: typeof maraPerformanceAtlas,
  assetId: string,
) => {
  if (asset(assetId).contentHash !== atlas.sourceContentHash)
    throw new Error(
      `${assetId} atlas metadata is stale against its byte catalog.`,
    );
};

assertAtlasCatalogBinding(maraPerformanceAtlas, "mara-performance-v1");
assertAtlasCatalogBinding(maraRunAtlas, "mara-run-right-v1");

const capabilityFor = (
  target: BundledKidsCapabilityTarget,
): PerformanceCapabilityDraft => {
  if (target.kind === "atlas-cycle")
    return {
      id: `bundled-mara-run-${target.requirementId}`,
      ...target,
      rendererId: "director-atlas-cycle",
      rendererVersion: "1.0.0",
      assets: [asset("mara-run-right-v1")],
      execution: {
        kind: "atlas-cycle",
        assetId: "mara-run-right-v1",
        atlasWidth: maraRunAtlas.width,
        atlasHeight: maraRunAtlas.height,
        frames: measuredFrames(maraRunAtlas),
        loop: true,
        rootDistancePerLoop: 400,
        footContactFrameIndices: [0, 4],
      },
    };

  if (target.kind === "living-hold")
    return {
      id: `bundled-mara-hold-${target.requirementId}`,
      ...target,
      rendererId: "director-living-hold",
      rendererVersion: "1.0.0",
      assets: [asset("mara-performance-v1")],
      execution: {
        kind: "living-hold",
        assetId: "mara-performance-v1",
        atlasWidth: maraPerformanceAtlas.width,
        atlasHeight: maraPerformanceAtlas.height,
        frames: measuredFrames(maraPerformanceAtlas),
        poseSequence: [0, 1, 0, 1],
        cycleFrames: 48,
        breathingAmplitude: 0.018,
      },
    };

  return {
    id: `bundled-mara-rig-${target.requirementId}`,
    ...target,
    rendererId: "director-articulated-rig",
    rendererVersion: "1.0.0",
    assets: [asset("mara-payoff-puppet-v1")],
    execution: {
      kind: "articulated-rig",
      assetId: "mara-payoff-puppet-v1",
      sheetWidth: 1672,
      sheetHeight: 941,
      displayScale: 0.36,
      parts: [
        {
          id: "leg-left",
          parentId: null,
          source: { x: 660, y: 560, width: 250, height: 270 },
          pivot: { x: 125, y: 255 },
          joint: { x: -62, y: -44 },
          rotation: 0,
          zIndex: 0,
        },
        {
          id: "leg-right",
          parentId: null,
          source: { x: 920, y: 560, width: 270, height: 270 },
          pivot: { x: 135, y: 255 },
          joint: { x: 68, y: -44 },
          rotation: 0,
          zIndex: 1,
        },
        {
          id: "thigh-left",
          parentId: null,
          source: { x: 710, y: 430, width: 190, height: 180 },
          pivot: { x: 95, y: 165 },
          joint: { x: -62, y: -245 },
          rotation: 0,
          zIndex: 2,
        },
        {
          id: "thigh-right",
          parentId: null,
          source: { x: 900, y: 430, width: 200, height: 180 },
          pivot: { x: 100, y: 165 },
          joint: { x: 68, y: -245 },
          rotation: 0,
          zIndex: 3,
        },
        {
          id: "upper-arm-left",
          parentId: null,
          source: { x: 520, y: 45, width: 180, height: 275 },
          pivot: { x: 90, y: 20 },
          joint: { x: -142, y: -690 },
          rotation: 5,
          zIndex: 4,
        },
        {
          id: "lower-arm-left",
          parentId: "upper-arm-left",
          source: { x: 520, y: 290, width: 200, height: 245 },
          pivot: { x: 90, y: 20 },
          joint: { x: 20, y: 205 },
          rotation: 8,
          zIndex: 5,
        },
        {
          id: "body",
          parentId: null,
          source: { x: 730, y: 35, width: 350, height: 410 },
          pivot: { x: 175, y: 385 },
          joint: { x: 0, y: -400 },
          rotation: 0,
          zIndex: 6,
        },
        {
          id: "upper-arm-right",
          parentId: null,
          source: { x: 1110, y: 40, width: 180, height: 280 },
          pivot: { x: 90, y: 20 },
          joint: { x: 145, y: -690 },
          rotation: 8,
          zIndex: 7,
        },
        {
          id: "lower-arm-right",
          parentId: "upper-arm-right",
          source: { x: 1080, y: 290, width: 210, height: 250 },
          pivot: { x: 105, y: 20 },
          joint: { x: 0, y: 205 },
          rotation: -18,
          zIndex: 8,
        },
        {
          id: "head",
          parentId: null,
          source: { x: 30, y: 20, width: 490, height: 430 },
          pivot: { x: 245, y: 410 },
          joint: { x: 0, y: -755 },
          rotation: 0,
          zIndex: 9,
        },
      ],
      channels: [
        {
          partId: "upper-arm-right",
          keyframes: [
            { progress: 0, rotation: 0 },
            { progress: 0.45, rotation: -76 },
            { progress: 1, rotation: -28 },
          ],
        },
        {
          partId: "head",
          keyframes: [
            { progress: 0, rotation: -1 },
            { progress: 0.55, rotation: -7 },
            { progress: 1, rotation: 1 },
          ],
        },
      ],
    },
  };
};

export const createBundledKidsCapabilityRegistry = (
  targets: BundledKidsCapabilityTarget[],
): CapabilityRegistry =>
  createCapabilityRegistry({
    version: `bundled-kids-performance-v1@${capabilityAssetCatalog.contentHash.slice(0, 12)}`,
    capabilities: targets.map(capabilityFor),
  });

/** One exact first-beat capability proves the hybrid final/proxy boundary.
 * Every other arbitrary-script beat remains honestly proxy-only. */
export const createBundledKidsPilotCapabilityRegistry = (
  kind: BundledKidsCapabilityKind,
): CapabilityRegistry =>
  createBundledKidsCapabilityRegistry([
    {
      kind,
      requirementId: "performance-1-primary",
      entityId: "lead",
    },
  ]);

export const bundledKidsPilotCapabilityRegistry =
  createBundledKidsPilotCapabilityRegistry("living-hold");
