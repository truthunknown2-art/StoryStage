import {
  createCapabilityRegistry,
  listArticulatedRigAssetReferences,
  type CapabilityRegistry,
  type PerformanceCapabilityDraft,
} from "@storystage/story-engine/director-alpha";
import maraPerformanceAtlas from "../../public/show-packs/kids/moonlit-ruins/v1/rigs/mara/performance-v1/atlas-manifest.json";
import maraRunAtlas from "../../public/show-packs/kids/moonlit-ruins/v1/rigs/mara/run-right-v1/atlas-manifest.json";
import capabilityAssetCatalog from "./generated-capability-asset-catalog.json";
import { createBundledMaraLocalPartsRigManifest } from "./maraLocalParts";

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

  const rigManifest = createBundledMaraLocalPartsRigManifest(target);
  return {
    id: `bundled-mara-rig-${target.requirementId}`,
    ...target,
    rendererId: rigManifest.renderer.id,
    rendererVersion: rigManifest.renderer.version,
    assets: listArticulatedRigAssetReferences(rigManifest).map((reference) =>
      asset(reference.candidateId),
    ),
    execution: {
      kind: "articulated-rig",
      mode: "local-parts-v1",
      assetId: "mara-payoff-puppet-v1",
      displayScale: 0.36,
      rigManifest,
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
