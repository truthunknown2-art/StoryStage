import {
  executableEpisodePlanSchema,
  type ApprovedAssetBinding,
  type ExecutableEpisodePlan,
  type PerformanceProgram,
} from "@storystage/story-engine/director-alpha";
import {
  AbsoluteFill,
  Img,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useDelayRender,
} from "remotion";
import { useEffect, useState } from "react";

type ProxyEntity = NonNullable<
  ExecutableEpisodePlan["proxyEntityPrograms"]
>[number];
type ProxyCamera = NonNullable<
  ExecutableEpisodePlan["proxyCameraPrograms"]
>[number];
type ProxyStage = NonNullable<
  ExecutableEpisodePlan["proxyStagePrograms"]
>[number];
type ProxyTransition = NonNullable<
  ExecutableEpisodePlan["proxyTransitionPrograms"]
>[number];
type AtlasPerformanceExecution = Extract<
  NonNullable<PerformanceProgram["execution"]>,
  { kind: "atlas-cycle" | "living-hold" }
>;
type ArticulatedPerformanceExecution = Extract<
  NonNullable<PerformanceProgram["execution"]>,
  { kind: "articulated-rig" }
>;

const valueAt = (frame: number, frames: number[], values: number[]) =>
  interpolate(frame, frames, values, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const entityStateAt = (program: ProxyEntity, frame: number) => {
  const frames = program.keyframes.map((keyframe) => keyframe.frame);
  return {
    x: valueAt(
      frame,
      frames,
      program.keyframes.map((keyframe) => keyframe.transform.x),
    ),
    y: valueAt(
      frame,
      frames,
      program.keyframes.map((keyframe) => keyframe.transform.y),
    ),
    scale: valueAt(
      frame,
      frames,
      program.keyframes.map((keyframe) => keyframe.transform.scale),
    ),
    rotation: valueAt(
      frame,
      frames,
      program.keyframes.map((keyframe) => keyframe.transform.rotation),
    ),
    current: program.keyframes.reduce(
      (selected, keyframe) => (keyframe.frame <= frame ? keyframe : selected),
      program.keyframes[0]!,
    ),
  };
};

const approvedAsset = (
  assets: ApprovedAssetBinding[],
  assetId: string,
): ApprovedAssetBinding & {
  byteLength: number;
  immutableLocationId: string;
  relativeFile: string;
} => {
  const binding = assets.find((asset) => asset.assetId === assetId);
  if (
    binding?.status !== "approved" ||
    !binding.relativeFile ||
    !binding.byteLength ||
    binding.immutableLocationId !== `sha256:${binding.contentHash}` ||
    !binding.relativeFile.includes(binding.contentHash)
  )
    throw new Error(`${assetId} is not bound to an approved renderable file.`);
  return binding as ApprovedAssetBinding & {
    byteLength: number;
    immutableLocationId: string;
    relativeFile: string;
  };
};

const sha256 = async (bytes: ArrayBuffer) =>
  [...new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", bytes))]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const useVerifiedAssetUrl = (
  binding: ReturnType<typeof approvedAsset>,
): string | null => {
  const [verifiedUrl, setVerifiedUrl] = useState<string | null>(null);
  const { cancelRender, continueRender, delayRender } = useDelayRender();
  useEffect(() => {
    const handle = delayRender(`Verifying approved ${binding.assetId} bytes`);
    const controller = new AbortController();
    let active = true;
    let settled = false;
    let objectUrl: string | null = null;
    void (async () => {
      try {
        const response = await fetch(staticFile(binding.relativeFile), {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error(
            `Approved Director asset ${binding.assetId} could not be loaded.`,
          );
        const bytes = await response.arrayBuffer();
        if (
          bytes.byteLength !== binding.byteLength ||
          (await sha256(bytes)) !== binding.contentHash
        )
          throw new Error(
            `Approved Director asset ${binding.assetId} failed browser byte verification.`,
          );
        objectUrl = URL.createObjectURL(
          new Blob([bytes], { type: "image/png" }),
        );
        if (active) setVerifiedUrl(objectUrl);
        else URL.revokeObjectURL(objectUrl);
        settled = true;
        continueRender(handle);
      } catch (error) {
        if (!active) return;
        settled = true;
        cancelRender(error);
      }
    })();
    return () => {
      active = false;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      if (!settled) continueRender(handle);
    };
  }, [
    binding.assetId,
    binding.byteLength,
    binding.contentHash,
    binding.relativeFile,
    cancelRender,
    continueRender,
    delayRender,
  ]);
  return verifiedUrl;
};

const AtlasFrame: React.FC<{
  execution: AtlasPerformanceExecution;
  frameIndex: number;
  relativeFile: string;
}> = ({ execution, frameIndex, relativeFile }) => {
  const atlasFrame = execution.frames[frameIndex]!;
  return (
    <div
      style={{
        height: atlasFrame.source.height,
        left: -atlasFrame.anchor.x,
        overflow: "hidden",
        position: "absolute",
        top: -atlasFrame.anchor.y,
        width: atlasFrame.source.width,
      }}
    >
      <Img
        src={relativeFile}
        style={{
          height: execution.atlasHeight,
          left: -atlasFrame.source.x,
          maxWidth: "none",
          position: "absolute",
          top: -atlasFrame.source.y,
          width: execution.atlasWidth,
        }}
      />
    </div>
  );
};

const AtlasPerformanceRenderer: React.FC<{
  approvedAssets: ApprovedAssetBinding[];
  formatWidth: number;
  performance: PerformanceProgram & {
    execution: AtlasPerformanceExecution;
  };
  proxy: ProxyEntity;
}> = ({ approvedAssets, formatWidth, performance, proxy }) => {
  const frame = useCurrentFrame();
  const state = entityStateAt(proxy, frame);
  const execution = performance.execution;
  const verifiedUrl = useVerifiedAssetUrl(
    approvedAsset(approvedAssets, execution.assetId),
  );
  const firstX = proxy.keyframes[0]!.transform.x;
  const frameIndex =
    execution.kind === "atlas-cycle"
      ? Math.floor(
          ((Math.abs(state.x - firstX) * formatWidth) /
            execution.rootDistancePerLoop) *
            execution.frames.length,
        ) % execution.frames.length
      : execution.poseSequence[
          Math.floor(
            ((frame % execution.cycleFrames) / execution.cycleFrames) *
              execution.poseSequence.length,
          ) % execution.poseSequence.length
        ]!;
  const breath =
    execution.kind === "living-hold"
      ? 1 +
        Math.sin((frame / execution.cycleFrames) * Math.PI * 2) *
          execution.breathingAmplitude
      : 1;
  const performerScale =
    state.scale *
    (formatWidth / 1920) *
    (execution.kind === "atlas-cycle" ? 0.82 : 0.92);
  return verifiedUrl ? (
    <div
      data-performance-kind={execution.kind}
      data-performance-program={performance.id}
      style={{
        left: `${state.x * 100}%`,
        position: "absolute",
        top: `${state.y * 100}%`,
        transform: `rotate(${state.rotation}deg) scale(${performerScale}) scaleY(${breath})`,
        transformOrigin: "0 0",
        zIndex: Math.round(state.current.transform.z + 4),
      }}
    >
      <AtlasFrame
        execution={execution}
        frameIndex={frameIndex}
        relativeFile={verifiedUrl}
      />
    </div>
  ) : null;
};

const rotationAt = (
  execution: ArticulatedPerformanceExecution,
  partId: string,
  progress: number,
) => {
  const channel = execution.channels.find(
    (candidate) => candidate.partId === partId,
  );
  if (!channel) return 0;
  return interpolate(
    progress,
    channel.keyframes.map((keyframe) => keyframe.progress),
    channel.keyframes.map((keyframe) => keyframe.rotation),
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
};

const ArticulatedPart: React.FC<{
  execution: ArticulatedPerformanceExecution;
  part: ArticulatedPerformanceExecution["parts"][number];
  progress: number;
  relativeFile: string;
}> = ({ execution, part, progress, relativeFile }) => {
  const children = execution.parts
    .filter((candidate) => candidate.parentId === part.id)
    .sort((left, right) => left.zIndex - right.zIndex);
  return (
    <div
      style={{
        left: part.joint.x,
        position: "absolute",
        top: part.joint.y,
        transform: `rotate(${part.rotation + rotationAt(execution, part.id, progress)}deg)`,
        transformOrigin: "0 0",
        zIndex: part.zIndex,
      }}
    >
      <div
        style={{
          height: part.source.height,
          left: -part.pivot.x,
          overflow: "hidden",
          position: "absolute",
          top: -part.pivot.y,
          width: part.source.width,
        }}
      >
        <Img
          src={relativeFile}
          style={{
            height: execution.sheetHeight,
            left: -part.source.x,
            maxWidth: "none",
            position: "absolute",
            top: -part.source.y,
            width: execution.sheetWidth,
          }}
        />
      </div>
      {children.map((child) => (
        <ArticulatedPart
          execution={execution}
          key={child.id}
          part={child}
          progress={progress}
          relativeFile={relativeFile}
        />
      ))}
    </div>
  );
};

const ArticulatedPerformanceRenderer: React.FC<{
  approvedAssets: ApprovedAssetBinding[];
  durationInFrames: number;
  formatWidth: number;
  performance: PerformanceProgram & {
    execution: ArticulatedPerformanceExecution;
  };
  proxy: ProxyEntity;
}> = ({
  approvedAssets,
  durationInFrames,
  formatWidth,
  performance,
  proxy,
}) => {
  const frame = useCurrentFrame();
  const state = entityStateAt(proxy, frame);
  const execution = performance.execution;
  const progress = frame / Math.max(1, durationInFrames - 1);
  const relativeFile = useVerifiedAssetUrl(
    approvedAsset(approvedAssets, execution.assetId),
  );
  return relativeFile ? (
    <div
      data-performance-kind={execution.kind}
      data-performance-program={performance.id}
      style={{
        left: `${state.x * 100}%`,
        position: "absolute",
        top: `${state.y * 100}%`,
        transform: `rotate(${state.rotation}deg) scale(${state.scale * execution.displayScale * (formatWidth / 1920)})`,
        transformOrigin: "0 0",
        zIndex: Math.round(state.current.transform.z + 4),
      }}
    >
      {execution.parts
        .filter((part) => part.parentId === null)
        .sort((left, right) => left.zIndex - right.zIndex)
        .map((part) => (
          <ArticulatedPart
            execution={execution}
            key={part.id}
            part={part}
            progress={progress}
            relativeFile={relativeFile}
          />
        ))}
    </div>
  ) : null;
};

const ExecutablePerformanceRenderer: React.FC<{
  approvedAssets: ApprovedAssetBinding[];
  durationInFrames: number;
  formatWidth: number;
  performance: PerformanceProgram;
  proxy: ProxyEntity;
}> = ({
  approvedAssets,
  durationInFrames,
  formatWidth,
  performance,
  proxy,
}) => {
  if (!performance.execution) return <ProxyEntityRenderer program={proxy} />;
  if (performance.execution.kind === "articulated-rig")
    return (
      <ArticulatedPerformanceRenderer
        approvedAssets={approvedAssets}
        durationInFrames={durationInFrames}
        formatWidth={formatWidth}
        performance={
          performance as PerformanceProgram & {
            execution: ArticulatedPerformanceExecution;
          }
        }
        proxy={proxy}
      />
    );
  return (
    <AtlasPerformanceRenderer
      approvedAssets={approvedAssets}
      formatWidth={formatWidth}
      performance={
        performance as PerformanceProgram & {
          execution: AtlasPerformanceExecution;
        }
      }
      proxy={proxy}
    />
  );
};

const ProxyEntityRenderer: React.FC<{ program: ProxyEntity }> = ({
  program,
}) => {
  const frame = useCurrentFrame();
  const { x, y, scale, rotation, current } = entityStateAt(program, frame);
  const evidence = program.appearance.shape === "evidence";
  return (
    <div
      style={{
        left: `${x * 100}%`,
        position: "absolute",
        top: `${y * 100}%`,
        transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(${scale})`,
        transformOrigin: "50% 100%",
        zIndex: Math.round(current.transform.z + 4),
      }}
    >
      {evidence ? (
        <div
          style={{
            background: "#fffdf7",
            border: `10px solid ${program.appearance.color}`,
            borderRadius: 14,
            boxShadow: "0 24px 45px rgba(0,0,0,.22)",
            color: "#202725",
            height: 260,
            padding: 28,
            width: 390,
          }}
        >
          <div
            style={{
              fontFamily: "Arial, sans-serif",
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: 4,
              textTransform: "uppercase",
            }}
          >
            Evidence
          </div>
          <div
            style={{
              background: program.appearance.color,
              borderRadius: 8,
              height: 64,
              marginTop: 22,
              opacity: 0.8,
            }}
          />
          <div
            style={{
              background: "#d6d3ca",
              borderRadius: 5,
              height: 16,
              marginTop: 20,
              width: "92%",
            }}
          />
          <div
            style={{
              background: "#d6d3ca",
              borderRadius: 5,
              height: 16,
              marginTop: 12,
              width: "68%",
            }}
          />
        </div>
      ) : (
        <div style={{ height: 390, position: "relative", width: 240 }}>
          <div
            style={{
              background: program.appearance.color,
              border: "9px solid rgba(20,32,31,.82)",
              borderRadius:
                program.appearance.shape === "creature"
                  ? "48% 52% 44% 56%"
                  : "50%",
              boxShadow:
                "inset -18px -20px 0 rgba(0,0,0,.09), 0 22px 34px rgba(0,0,0,.22)",
              height: 142,
              left: 49,
              position: "absolute",
              top: 0,
              width: 142,
            }}
          >
            <div
              style={{
                background: "#152b2d",
                borderRadius: "50%",
                height: 14,
                left: 40,
                position: "absolute",
                top: 58,
                width: 14,
              }}
            />
            <div
              style={{
                background: "#152b2d",
                borderRadius: "50%",
                height: 14,
                position: "absolute",
                right: 40,
                top: 58,
                width: 14,
              }}
            />
          </div>
          <div
            style={{
              background: program.appearance.color,
              border: "9px solid rgba(20,32,31,.82)",
              borderRadius:
                program.appearance.shape === "presenter"
                  ? "34px 34px 20px 20px"
                  : "52% 48% 24% 24%",
              bottom: 0,
              boxShadow: "inset -20px -16px 0 rgba(0,0,0,.09)",
              height: 250,
              left: 29,
              position: "absolute",
              width: 182,
            }}
          />
          <div
            style={{
              background: "rgba(20,32,31,.82)",
              borderRadius: 18,
              height: 150,
              left: 4,
              position: "absolute",
              rotate: "10deg",
              top: 175,
              width: 34,
            }}
          />
          <div
            style={{
              background: "rgba(20,32,31,.82)",
              borderRadius: 18,
              height: 150,
              position: "absolute",
              right: 4,
              rotate: "-10deg",
              top: 175,
              width: 34,
            }}
          />
        </div>
      )}
      <div
        style={{
          background: "rgba(13,24,24,.9)",
          borderRadius: 999,
          color: "white",
          fontFamily: "Arial, sans-serif",
          fontSize: 18,
          fontWeight: 800,
          left: "50%",
          letterSpacing: 1,
          padding: "8px 14px",
          position: "absolute",
          top: evidence ? 282 : 404,
          transform: "translateX(-50%)",
          whiteSpace: "nowrap",
        }}
      >
        {program.appearance.label} · {current.actionPhase}
      </div>
    </div>
  );
};

const ProxyShot: React.FC<{
  approvedAssets: ApprovedAssetBinding[];
  camera: ProxyCamera;
  caption:
    | NonNullable<ExecutableEpisodePlan["proxyCaptionPrograms"]>[number]
    | undefined;
  entities: ProxyEntity[];
  formatWidth: number;
  performancePrograms: PerformanceProgram[];
  stage: ProxyStage;
  transitionProgram: ProxyTransition | undefined;
}> = ({
  approvedAssets,
  camera,
  caption,
  entities,
  formatWidth,
  performancePrograms,
  stage,
  transitionProgram,
}) => {
  const frame = useCurrentFrame();
  const hasFinalPerformance = performancePrograms.some(
    (program) =>
      program.execution && program.sourceShotIds?.includes(camera.shotId),
  );
  const frames = camera.keyframes.map((keyframe) => keyframe.frame);
  const x = valueAt(
    frame,
    frames,
    camera.keyframes.map((keyframe) => keyframe.x),
  );
  const y = valueAt(
    frame,
    frames,
    camera.keyframes.map((keyframe) => keyframe.y),
  );
  const scale = valueAt(
    frame,
    frames,
    camera.keyframes.map((keyframe) => keyframe.scale),
  );
  const entrance = Math.min(10, frames.at(-1) ?? 10);
  const transitionOpacity =
    transitionProgram?.kind === "dissolve"
      ? interpolate(frame, [0, entrance], [0, 1], { extrapolateRight: "clamp" })
      : 1;
  const transitionCarry =
    transitionProgram?.kind === "camera-carry"
      ? interpolate(frame, [0, entrance], [2.5, 0], {
          extrapolateRight: "clamp",
        })
      : 0;
  const diagram = camera.purpose === "diagram";
  const textEmphasis = camera.purpose === "text-emphasis";
  return (
    <AbsoluteFill
      style={{
        background: stage.palette.ink,
        opacity: transitionOpacity,
        overflow: "hidden",
      }}
    >
      <AbsoluteFill
        style={{
          transform: `translate(${x + transitionCarry}%, ${y}%) scale(${scale})`,
        }}
      >
        <AbsoluteFill
          style={{
            background: `linear-gradient(180deg, ${stage.palette.sky} 0%, ${stage.palette.sky} 58%, ${stage.palette.ground} 58%, ${stage.palette.ground} 100%)`,
          }}
        />
        <div
          style={{
            background: stage.palette.accent,
            borderRadius: "50%",
            height: 310,
            opacity: 0.35,
            position: "absolute",
            right: 130,
            top: 82,
            width: 310,
          }}
        />
        <div
          style={{
            border: `8px solid ${stage.palette.ink}`,
            borderRadius: "50% 50% 0 0",
            bottom: 205,
            height: 190,
            left: 160,
            opacity: 0.22,
            position: "absolute",
            width: 300,
          }}
        />
        <div
          style={{
            background: stage.palette.ink,
            bottom: -85,
            clipPath:
              "polygon(0 70%, 15% 45%, 31% 72%, 48% 35%, 66% 68%, 82% 42%, 100% 64%, 100% 100%, 0 100%)",
            height: 340,
            left: 0,
            opacity: 0.18,
            position: "absolute",
            width: "100%",
            zIndex: 8,
          }}
        />
        {entities.map((entity) => {
          const performance = performancePrograms.find(
            (program) =>
              program.entityId === entity.entityId &&
              program.sourceShotIds?.includes(camera.shotId),
          );
          return performance ? (
            <ExecutablePerformanceRenderer
              approvedAssets={approvedAssets}
              durationInFrames={(frames.at(-1) ?? 0) + 1}
              formatWidth={formatWidth}
              key={entity.id}
              performance={performance}
              proxy={entity}
            />
          ) : (
            <ProxyEntityRenderer key={entity.id} program={entity} />
          );
        })}
        {diagram ? (
          <div
            style={{
              alignItems: "center",
              display: "flex",
              gap: 42,
              inset: "22% 15% 28%",
              justifyContent: "center",
              position: "absolute",
              zIndex: 14,
            }}
          >
            {["Claim", "Cause", "Result"].map((label, index) => (
              <div
                key={label}
                style={{ alignItems: "center", display: "flex", gap: 34 }}
              >
                <div
                  style={{
                    alignItems: "center",
                    background: index === 1 ? stage.palette.accent : "#fffdf7",
                    border: `8px solid ${stage.palette.ink}`,
                    borderRadius: 24,
                    boxShadow: "0 18px 30px rgba(0,0,0,.2)",
                    color: stage.palette.ink,
                    display: "flex",
                    fontFamily: "Arial, sans-serif",
                    fontSize: 28,
                    fontWeight: 900,
                    height: 150,
                    justifyContent: "center",
                    width: 210,
                  }}
                >
                  {label}
                </div>
                {index < 2 ? (
                  <div
                    style={{
                      color: stage.palette.ink,
                      fontFamily: "Arial, sans-serif",
                      fontSize: 62,
                      fontWeight: 900,
                    }}
                  >
                    →
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
        {textEmphasis ? (
          <div
            style={{
              alignItems: "center",
              color: stage.palette.ink,
              display: "flex",
              fontFamily: "Arial Black, Arial, sans-serif",
              fontSize: 112,
              fontWeight: 950,
              inset: "18% 8% 25%",
              justifyContent: "center",
              letterSpacing: -4,
              lineHeight: 0.86,
              position: "absolute",
              rotate: "-3deg",
              textAlign: "center",
              textShadow: `8px 8px 0 ${stage.palette.accent}`,
              textTransform: "uppercase",
              zIndex: 15,
            }}
          >
            That changed everything.
          </div>
        ) : null}
        <div
          style={{
            background: stage.palette.ink,
            bottom: -40,
            clipPath:
              "polygon(0 62%, 8% 38%, 14% 66%, 20% 32%, 29% 70%, 36% 45%, 42% 66%, 50% 40%, 58% 70%, 67% 36%, 73% 68%, 83% 42%, 90% 66%, 100% 36%, 100% 100%, 0 100%)",
            height: 220,
            opacity: 0.38,
            position: "absolute",
            width: "100%",
            zIndex: 12,
          }}
        />
      </AbsoluteFill>
      <div style={{ left: 48, position: "absolute", top: 42 }}>
        <div
          style={{
            color: stage.palette.ink,
            fontFamily: "Arial, sans-serif",
            fontSize: 17,
            fontWeight: 900,
            letterSpacing: 5,
            opacity: 0.62,
            textTransform: "uppercase",
          }}
        >
          Directed {hasFinalPerformance ? "hybrid" : "proxy"} · {camera.size}
        </div>
        <div
          style={{
            color: stage.palette.ink,
            fontFamily: "Arial, sans-serif",
            fontSize: 30,
            fontWeight: 900,
            marginTop: 10,
            maxWidth: 780,
          }}
        >
          {camera.purpose.replaceAll("-", " ")}
        </div>
      </div>
      {caption ? (
        <div
          style={{
            background: "rgba(13,24,24,.88)",
            border: `2px solid ${stage.palette.accent}`,
            borderRadius: 18,
            bottom: 54,
            color: "#fffdf7",
            fontFamily: "Arial, sans-serif",
            fontSize: 34,
            fontWeight: 750,
            left: "50%",
            lineHeight: 1.18,
            maxWidth: 1320,
            padding: "22px 30px",
            position: "absolute",
            textAlign: "center",
            transform: "translateX(-50%)",
            width: "76%",
            zIndex: 20,
          }}
        >
          {caption.text}
        </div>
      ) : null}
      <div
        style={{
          background: stage.palette.accent,
          borderRadius: 999,
          color: stage.palette.ink,
          fontFamily: "Arial, sans-serif",
          fontSize: 16,
          fontWeight: 900,
          letterSpacing: 2,
          padding: "10px 15px",
          position: "absolute",
          right: 38,
          textTransform: "uppercase",
          top: 34,
        }}
      >
        {hasFinalPerformance ? "Approved performance" : "Proxy animatic"}
      </div>
    </AbsoluteFill>
  );
};

export const DirectorEpisodeRenderer: React.FC<{
  episodePlan: ExecutableEpisodePlan;
}> = ({ episodePlan }) => {
  const plan = executableEpisodePlanSchema.parse(episodePlan);
  if (plan.renderMode !== "proxy-animatic")
    throw new Error(
      "DirectorEpisodeRenderer only renders proxy animatic programs.",
    );
  return (
    <AbsoluteFill style={{ background: "#101616" }}>
      {plan.shots.map((shot) => {
        const stage = plan.proxyStagePrograms?.find(
          (program) => program.stageId === shot.stageKitId,
        );
        const camera = plan.proxyCameraPrograms?.find(
          (program) => program.shotId === shot.directorShotId,
        );
        if (!stage || !camera)
          throw new Error(
            `${shot.id} is missing its concrete proxy stage or camera program.`,
          );
        const entities =
          plan.proxyEntityPrograms?.filter(
            (program) => program.shotId === shot.directorShotId,
          ) ?? [];
        const caption = plan.proxyCaptionPrograms?.find(
          (program) => program.shotId === shot.directorShotId,
        );
        const transition = plan.proxyTransitionPrograms?.find(
          (program) => program.shotId === shot.directorShotId,
        );
        return (
          <Sequence
            durationInFrames={shot.endFrameExclusive - shot.startFrame}
            from={shot.startFrame}
            key={shot.id}
          >
            <ProxyShot
              approvedAssets={plan.approvedAssets}
              camera={camera}
              caption={caption}
              entities={entities}
              formatWidth={plan.format.width}
              performancePrograms={plan.performancePrograms}
              stage={stage}
              transitionProgram={transition}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
