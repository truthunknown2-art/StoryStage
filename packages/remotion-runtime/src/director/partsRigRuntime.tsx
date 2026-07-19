import {
  articulatedCharacterRigManifestSchema,
  compileRigVisualProgram,
  evaluateLocalPerformance,
  hashCanonical,
  localPerformanceInputSchema,
  type ApprovedAssetBinding,
  type ExecutableEpisodePlan,
  type LocalPerformanceFrame,
  type LocalPerformanceInput,
  type PerformanceProgram,
  type ResolvedEntityFrame,
} from "@storystage/story-engine/director-alpha";
import { Img } from "remotion";
import { maraLocalPartsVisualPerformanceRenderer } from "./maraLocalParts";

export type LocalPartsV1Execution = {
  kind: "articulated-rig";
  mode: "local-parts-v1";
  assetId: string;
  displayScale: number;
  rigManifest: unknown;
};

type PartsRigRuntimeSource = {
  episodePlan: ExecutableEpisodePlan;
  execution: LocalPartsV1Execution;
  localFrame: number;
  performance: PerformanceProgram;
  resolved: ResolvedEntityFrame;
  shotId: string;
  verifiedAsset: ApprovedAssetBinding & {
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
  verifiedAsset,
  verifiedUrl,
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
  const assetBindings = [
    manifest.identityReference,
    ...manifest.parts.map((part) => part.asset),
    ...manifest.exposures.map((exposure) => exposure.asset),
  ];
  if (
    execution.assetId !== verifiedAsset.assetId ||
    assetBindings.some(
      (binding) =>
        binding.candidateId !== execution.assetId ||
        binding.contentHash !== verifiedAsset.contentHash ||
        binding.relativeFile !== verifiedAsset.relativeFile ||
        binding.width !== manifest.identityReference.width ||
        binding.height !== manifest.identityReference.height,
    )
  )
    throw new Error(
      `Local-parts rig ${manifest.manifestId} is not bound to the exact approved puppet asset.`,
    );
  if (
    verifiedAsset.immutableLocationId !==
      `sha256:${verifiedAsset.contentHash}` ||
    !verifiedAsset.relativeFile.includes(verifiedAsset.contentHash)
  )
    throw new Error(
      `Local-parts asset ${verifiedAsset.assetId} is not content-addressed.`,
    );
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
    assets: [
      {
        assetId: verifiedAsset.assetId,
        contentHash: verifiedAsset.contentHash,
        byteLength: verifiedAsset.byteLength,
        width: manifest.identityReference.width,
        height: manifest.identityReference.height,
        verifiedUrl,
      },
    ],
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
  asset: LocalPerformanceInput["assets"][number];
  frame: LocalPerformanceFrame;
}> = ({ asset, frame }) => {
  const geometry = createHeadFaceOverlayGeometry(frame);
  const eyeOpen = Math.max(0.08, Math.min(1, frame.face.eyeOpen));
  return (
    <div data-rig-face="head-local" style={{ position: "absolute" }}>
      {geometry.eyes.map((eye) => (
        <div
          data-rig-eye={eye.id}
          key={eye.id}
          style={{
            background: "#fff8df",
            border: "7px solid #3a2119",
            borderRadius: "48%",
            boxSizing: "border-box",
            height: 94,
            left: eye.left,
            overflow: "hidden",
            position: "absolute",
            top: eye.top,
            transform: `scaleY(${eyeOpen})`,
            transformOrigin: "center 55%",
            width: 80,
          }}
        >
          <div
            data-rig-pupil={eye.id}
            style={{
              background: "#241713",
              border: "6px solid #6b3c20",
              borderRadius: "50%",
              height: 44,
              left: 13 + frame.face.pupilX * 10,
              position: "absolute",
              top: 24 + frame.face.pupilY * 8,
              width: 44,
            }}
          />
        </div>
      ))}
      {geometry.mouth ? (
        <div
          data-rig-exposure={frame.face.mouthExposureId ?? undefined}
          style={{
            height: geometry.mouth.source.height,
            left: geometry.mouth.target.left,
            overflow: "hidden",
            position: "absolute",
            top: geometry.mouth.target.top,
            width: geometry.mouth.source.width,
          }}
        >
          <Img
            src={asset.verifiedUrl}
            style={{
              height: asset.height,
              left: -geometry.mouth.source.x,
              maxWidth: "none",
              position: "absolute",
              top: -geometry.mouth.source.y,
              width: asset.width,
            }}
          />
        </div>
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
  asset: LocalPerformanceInput["assets"][number];
  frame: LocalPerformanceFrame;
  manifest: ParsedRigManifest;
  node: PartsRigRenderNode;
}> = ({ asset, frame, manifest, node }) => {
  const part = manifest.parts.find(
    (candidate) => candidate.id === node.partId,
  )!;
  const partFrame = frame.parts[part.id]!;
  const pivotX = part.pivot.x - part.bounds.x;
  const pivotY = part.pivot.y - part.bounds.y;
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
      <div
        style={{
          height: part.bounds.height,
          left: -pivotX,
          opacity: partFrame.opacity,
          overflow: "hidden",
          position: "absolute",
          top: -pivotY,
          width: part.bounds.width,
        }}
      >
        <Img
          src={asset.verifiedUrl}
          style={{
            height: asset.height,
            left: -part.bounds.x,
            maxWidth: "none",
            position: "absolute",
            top: -part.bounds.y,
            width: asset.width,
          }}
        />
      </div>
      {part.id === "head" ? (
        <HeadFaceOverlay asset={asset} frame={frame} />
      ) : null}
      {node.children.map((child) => (
        <RigPartTree
          asset={asset}
          frame={frame}
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
  const asset = input.assets[0]!;
  return (
    <div
      data-local-parts-renderer={partsRigRuntime.rendererId}
      data-rig-manifest={manifest.manifestId}
      style={{ height: 1, position: "relative", width: 1 }}
    >
      {renderTree.map((node) => (
        <RigPartTree
          asset={asset}
          frame={frame}
          key={node.partId}
          manifest={manifest}
          node={node}
        />
      ))}
    </div>
  );
};
