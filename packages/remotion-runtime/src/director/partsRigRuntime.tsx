import {
  articulatedCharacterRigManifestSchema,
  compileRigVisualProgram,
  evaluateLocalPerformance,
  hashCanonical,
  listArticulatedRigAssetReferences,
  localPerformanceInputSchema,
  type ApprovedAssetBinding,
  type ArticulatedCharacterRigManifest,
  type ExecutableEpisodePlan,
  type LocalPerformanceFrame,
  type LocalPerformanceInput,
  type PerformanceProgram,
  type ResolvedEntityFrame,
} from "@storystage/story-engine/director-alpha";
import { maraLocalPartsVisualPerformanceRenderer } from "./maraLocalParts";
import { VerifiedRasterImage } from "./VerifiedRasterImage";

export type LocalPartsV1Execution = {
  kind: "articulated-rig";
  mode: "local-parts-v1";
  assetId: string;
  displayScale: number;
  rigManifest: ArticulatedCharacterRigManifest;
};

type PartsRigRuntimeSource = {
  episodePlan: ExecutableEpisodePlan;
  execution: LocalPartsV1Execution;
  localFrame: number;
  performance: PerformanceProgram;
  resolved: ResolvedEntityFrame;
  shotId: string;
  verifiedAssets: VerifiedPartsRigAsset[];
};

export type VerifiedPartsRigAsset = {
  binding: ApprovedAssetBinding & {
    byteLength: number;
    immutableLocationId: string;
    relativeFile: string;
  };
  verifiedUrl: string;
};

export const createPartsRigRuntimeInput = ({
  episodePlan,
  execution,
  localFrame,
  performance,
  resolved,
  shotId,
  verifiedAssets,
}: PartsRigRuntimeSource): LocalPerformanceInput => {
  if (!performance.contentHash)
    throw new Error(
      `Local-parts performance ${performance.id} is missing its sealed content hash.`,
    );
  const sealedPerformance = episodePlan.performancePrograms.find(
    (candidate) => candidate.id === performance.id,
  );
  if (
    !sealedPerformance?.contentHash ||
    sealedPerformance.contentHash !== performance.contentHash ||
    hashCanonical(sealedPerformance) !== hashCanonical(performance)
  )
    throw new Error(
      `Local-parts performance ${performance.id} is not the exact sealed episode program.`,
    );
  if (resolved.performanceProgramId !== performance.id)
    throw new Error(
      `Local-parts performance ${performance.id} is not the canonical resolved program for ${resolved.entityId}.`,
    );
  if (resolved.performanceProgramContentHash !== performance.contentHash)
    throw new Error(
      `Local-parts performance ${performance.id} does not match the canonical resolved hash.`,
    );
  const executableShot = episodePlan.shots.find(
    (shot) => shot.directorShotId === shotId,
  );
  const continuityShot = episodePlan.continuitySequencePlan.shots.find(
    (shot) => shot.shotId === shotId,
  );
  if (
    !performance.sourceShotIds?.includes(shotId) ||
    !executableShot?.performanceProgramIds.includes(performance.id) ||
    !continuityShot ||
    localFrame >= continuityShot.endFrameExclusive - continuityShot.startFrame
  )
    throw new Error(
      `Local-parts performance ${performance.id} is not authorized for canonical shot ${shotId}.`,
    );
  const activeSegment = continuityShot.performanceSegments.find(
    (segment) =>
      segment.entityId === resolved.entityId &&
      segment.performanceProgramId === performance.id &&
      segment.performanceProgramContentHash === performance.contentHash &&
      continuityShot.startFrame + localFrame >= segment.startFrame &&
      continuityShot.startFrame + localFrame < segment.endFrameExclusive,
  );
  if (!activeSegment)
    throw new Error(
      `Local-parts performance ${performance.id} is not the exact active canonical segment at frame ${localFrame}.`,
    );
  const manifest = articulatedCharacterRigManifestSchema.parse(
    execution.rigManifest,
  );
  if (
    !performance.execution ||
    hashCanonical(performance.execution) !== hashCanonical(execution) ||
    performance.id !== manifest.requirementId ||
    performance.entityId !== manifest.entityId ||
    resolved.entityId !== manifest.entityId ||
    performance.manifestContentHash !== manifest.contentHash ||
    performance.rendererId !== manifest.renderer.id ||
    performance.rendererVersion !== manifest.renderer.version
  )
    throw new Error(
      `Local-parts performance ${performance.id} does not match its exact sealed rig execution.`,
    );
  if (
    manifest.renderer.id !== maraLocalPartsVisualPerformanceRenderer.rendererId
  )
    throw new Error(
      `Local-parts rig ${manifest.manifestId} requires unsupported renderer ${manifest.renderer.id}.`,
    );
  if (
    manifest.renderer.version !==
    maraLocalPartsVisualPerformanceRenderer.rendererVersion
  )
    throw new Error(
      `Local-parts rig ${manifest.manifestId} requires unsupported renderer version ${manifest.renderer.version}.`,
    );
  const assetReferences = listArticulatedRigAssetReferences(manifest);
  if (execution.assetId !== manifest.identityReference.candidateId)
    throw new Error(
      `Local-parts rig ${manifest.manifestId} identity does not match its executable asset.`,
    );
  const verifiedById = new Map(
    verifiedAssets.map((asset) => [asset.binding.assetId, asset]),
  );
  if (
    verifiedById.size !== verifiedAssets.length ||
    verifiedById.size !== assetReferences.length
  )
    throw new Error(
      `Local-parts rig ${manifest.manifestId} requires one exact verified handle per immutable asset reference.`,
    );
  const assetHandles = assetReferences.map((reference) => {
    const verified = verifiedById.get(reference.candidateId);
    if (!verified)
      throw new Error(
        `Local-parts rig ${manifest.manifestId} is missing verified asset ${reference.candidateId}.`,
      );
    const { binding } = verified;
    if (
      binding.status !== "approved" ||
      binding.assetId !== reference.candidateId ||
      binding.contentHash !== reference.contentHash ||
      binding.relativeFile !== reference.relativeFile ||
      binding.immutableLocationId !== `sha256:${reference.contentHash}` ||
      !binding.relativeFile.includes(reference.contentHash)
    )
      throw new Error(
        `Local-parts asset ${reference.candidateId} does not match its exact approved manifest binding.`,
      );
    return {
      assetId: binding.assetId,
      contentHash: binding.contentHash,
      byteLength: binding.byteLength,
      width: reference.width,
      height: reference.height,
      verifiedUrl: verified.verifiedUrl,
    };
  });
  const program = compileRigVisualProgram(manifest, performance.contentHash);
  return localPerformanceInputSchema.parse({
    schemaVersion: "1.0",
    episodePlanContentHash: episodePlan.contentHash,
    continuitySequencePlanContentHash:
      episodePlan.continuitySequencePlan.contentHash,
    performanceProgramContentHash: performance.contentHash,
    rigVisualProgramContentHash: program.contentHash,
    rigManifestContentHash: manifest.contentHash,
    entityId: resolved.entityId,
    shotId,
    localFrame,
    fps: episodePlan.format.fps,
    motionMode: resolved.motionMode,
    actionPhase: resolved.actionPhase,
    phaseProgress: resolved.phaseProgress,
    gaitPhase: resolved.gaitPhase,
    facing: resolved.facing,
    gazeVectorLocal: resolved.gazeVectorLocal,
    visemeId: resolved.visemeId,
    microMotionSeed: hashCanonical({
      episodePlanContentHash: episodePlan.contentHash,
      continuitySequencePlanContentHash:
        episodePlan.continuitySequencePlan.contentHash,
      performanceProgramContentHash: performance.contentHash,
      entityId: resolved.entityId,
      shotId,
    }),
    program,
    assets: assetHandles,
  });
};

export const partsRigRuntime = {
  rendererId: maraLocalPartsVisualPerformanceRenderer.rendererId,
  rendererVersion: maraLocalPartsVisualPerformanceRenderer.rendererVersion,
  createInput: createPartsRigRuntimeInput,
  evaluate(input: LocalPerformanceInput): LocalPerformanceFrame {
    return evaluateLocalPerformance(
      maraLocalPartsVisualPerformanceRenderer,
      input,
    );
  },
} as const;

type ParsedRigManifest = ReturnType<
  typeof articulatedCharacterRigManifestSchema.parse
>;

export type PartsRigRenderNode = {
  partId: string;
  children: PartsRigRenderNode[];
};

type FaceExposureGeometry = {
  source: { x: number; y: number; width: number; height: number };
  target: { left: number; top: number };
};

export const createHeadFaceOverlayGeometry = (
  frame: LocalPerformanceFrame,
): {
  eyes: Array<{ id: "left" | "right"; left: number; top: number }>;
  mouth: FaceExposureGeometry | null;
} => ({
  eyes: [
    { id: "left", left: -38, top: -238 },
    { id: "right", left: 72, top: -238 },
  ],
  mouth:
    frame.face.mouthExposureId === "mouth-open"
      ? {
          source: { x: 620, y: 835, width: 105, height: 65 },
          target: { left: 18, top: -116 },
        }
      : frame.face.mouthExposureId === "mouth-rest"
        ? {
            source: { x: 435, y: 838, width: 90, height: 48 },
            target: { left: 25, top: -108 },
          }
        : null,
});

const HeadFaceOverlay: React.FC<{
  frame: LocalPerformanceFrame;
  input: LocalPerformanceInput;
  manifest: ParsedRigManifest;
}> = ({ frame, input, manifest }) => {
  const geometry = createHeadFaceOverlayGeometry(frame);
  const eyeOpen = Math.max(0.08, Math.min(1, frame.face.eyeOpen));
  const mouthExposure = frame.face.mouthExposureId
    ? manifest.exposures.find(
        (candidate) => candidate.id === frame.face.mouthExposureId,
      )
    : null;
  const mouthAsset = mouthExposure
    ? input.assets.find(
        (asset) => asset.assetId === mouthExposure.asset.candidateId,
      )
    : null;
  const head = manifest.parts.find((part) => part.id === "head")!;
  if (mouthExposure && !mouthAsset)
    throw new Error(
      `Local-parts exposure ${mouthExposure.id} has no verified visual asset.`,
    );
  const eyeExposureId =
    eyeOpen <= 0.12
      ? "eyes-closed"
      : eyeOpen < 0.75
        ? "eyes-half"
        : "eyes-open";
  const verifiedExposure = (exposureId: string) => {
    const exposure = manifest.exposures.find(
      (candidate) => candidate.id === exposureId,
    );
    const asset = exposure
      ? input.assets.find(
          (candidate) => candidate.assetId === exposure.asset.candidateId,
        )
      : null;
    if (!exposure || !asset)
      throw new Error(
        `Local-parts exposure ${exposureId} has no verified visual asset.`,
      );
    return asset;
  };
  const eyeAsset = verifiedExposure(eyeExposureId);
  const pupilAsset = verifiedExposure("pupils");
  const pupilOffset = {
    x: Math.round(frame.face.pupilX * 10),
    y: Math.round(frame.face.pupilY * 8),
  };
  return (
    <div data-rig-face="head-local" style={{ position: "absolute" }}>
      <VerifiedRasterImage
        alternative={{ kind: "decorative" }}
        assetId={eyeAsset.assetId}
        data-rig-eye-layer={eyeExposureId}
        src={eyeAsset.verifiedUrl}
        style={{
          height: eyeAsset.height,
          left: -head.pivot.x,
          maxWidth: "none",
          position: "absolute",
          top: -head.pivot.y,
          width: eyeAsset.width,
        }}
      />
      {eyeExposureId !== "eyes-closed" ? (
        <VerifiedRasterImage
          alternative={{ kind: "decorative" }}
          assetId={pupilAsset.assetId}
          data-rig-pupil-layer="quantized-local"
          src={pupilAsset.verifiedUrl}
          style={{
            height: pupilAsset.height,
            left: -head.pivot.x + pupilOffset.x,
            maxWidth: "none",
            position: "absolute",
            top: -head.pivot.y + pupilOffset.y,
            width: pupilAsset.width,
          }}
        />
      ) : null}
      {geometry.mouth && mouthAsset ? (
        <VerifiedRasterImage
          alternative={{ kind: "decorative" }}
          assetId={mouthAsset.assetId}
          data-rig-exposure={frame.face.mouthExposureId ?? undefined}
          src={mouthAsset.verifiedUrl}
          style={{
            height: mouthAsset.height,
            left: -head.pivot.x,
            maxWidth: "none",
            position: "absolute",
            top: -head.pivot.y,
            width: mouthAsset.width,
          }}
        />
      ) : null}
    </div>
  );
};

export const createPartsRigRenderTree = (
  rawManifest: unknown,
): PartsRigRenderNode[] => {
  const manifest = articulatedCharacterRigManifestSchema.parse(rawManifest);
  const childrenOf = (parentId: string | null): PartsRigRenderNode[] =>
    manifest.parts
      .filter((part) => part.parentId === parentId)
      .map((part) => ({
        partId: part.id,
        children: childrenOf(part.id),
      }));
  return childrenOf(null);
};

const RigPartTree: React.FC<{
  frame: LocalPerformanceFrame;
  input: LocalPerformanceInput;
  manifest: ParsedRigManifest;
  node: PartsRigRenderNode;
}> = ({ frame, input, manifest, node }) => {
  const part = manifest.parts.find(
    (candidate) => candidate.id === node.partId,
  )!;
  const partFrame = frame.parts[part.id]!;
  const asset = input.assets.find(
    (candidate) => candidate.assetId === part.asset.candidateId,
  );
  if (!asset)
    throw new Error(
      `Local-parts part ${part.id} has no verified visual asset.`,
    );
  const torsoIndex = manifest.parts.findIndex(
    (candidate) => candidate.id === "torso",
  );
  const partIndex = manifest.parts.findIndex(
    (candidate) => candidate.id === part.id,
  );
  return (
    <div
      data-rig-part={part.id}
      style={{
        left: partFrame.x,
        position: "absolute",
        rotate: `${partFrame.rotation}deg`,
        scale: `${partFrame.scaleX} ${partFrame.scaleY}`,
        top: partFrame.y,
        transformOrigin: "0 0",
        zIndex: partIndex - torsoIndex,
      }}
    >
      <VerifiedRasterImage
        alternative={{ kind: "decorative" }}
        assetId={asset.assetId}
        src={asset.verifiedUrl}
        style={{
          height: asset.height,
          left: -part.pivot.x,
          maxWidth: "none",
          opacity: partFrame.opacity,
          position: "absolute",
          top: -part.pivot.y,
          width: asset.width,
        }}
      />
      {part.id === "head" ? (
        <HeadFaceOverlay frame={frame} input={input} manifest={manifest} />
      ) : null}
      {node.children.map((child) => (
        <RigPartTree
          frame={frame}
          input={input}
          key={child.partId}
          manifest={manifest}
          node={child}
        />
      ))}
    </div>
  );
};

export const PartsRigLocalVisual: React.FC<{
  input: LocalPerformanceInput;
  rigManifest: unknown;
}> = ({ input, rigManifest }) => {
  const manifest = articulatedCharacterRigManifestSchema.parse(rigManifest);
  const renderTree = createPartsRigRenderTree(manifest);
  const frame = partsRigRuntime.evaluate(input);
  return (
    <div
      data-local-parts-renderer={partsRigRuntime.rendererId}
      data-rig-manifest={manifest.manifestId}
      style={{ height: 1, position: "relative", width: 1 }}
    >
      {renderTree.map((node) => (
        <RigPartTree
          frame={frame}
          input={input}
          key={node.partId}
          manifest={manifest}
          node={node}
        />
      ))}
    </div>
  );
};
