import {
  executableEpisodePlanSchema,
  type ExecutableEpisodePlan,
} from "./executable-episode-plan";
import {
  resolvedContinuityFrameSchema,
  type ResolvedContinuityFrame,
  type ResolvedEntityFrame,
} from "./visual-performance-contract";

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const lerp = (left: number, right: number, progress: number) =>
  left + (right - left) * progress;

const sample = (
  frame: number,
  keyframes: readonly { frame: number; value: number }[],
) => {
  const first = keyframes[0]!;
  const last = keyframes.at(-1)!;
  if (frame <= first.frame) return first.value;
  if (frame >= last.frame) return last.value;
  const rightIndex = keyframes.findIndex((keyframe) => keyframe.frame >= frame);
  const right = keyframes[rightIndex]!;
  const left = keyframes[rightIndex - 1]!;
  return lerp(
    left.value,
    right.value,
    (frame - left.frame) / Math.max(1, right.frame - left.frame),
  );
};

const lifecycleVisible = (lifecycle: ResolvedEntityFrame["lifecycle"]) =>
  lifecycle === "entering" ||
  lifecycle === "onstage" ||
  lifecycle === "exiting";

export const continuityGaitPhaseAt = (
  entry: number | null,
  advanceCycles: number | null,
  progress: number,
) => {
  if (entry === null || advanceCycles === null) return null;
  return ((entry + advanceCycles * progress) % 1 + 1) % 1;
};

export const continuityMotionProgressAt = (
  frame: number,
  startFrame: number,
  endFrame: number,
  decelerationFrame: number | undefined,
  plantFrame: number | undefined,
) => {
  const motionEnd = Math.min(endFrame, plantFrame ?? endFrame);
  if (frame <= startFrame) return 0;
  if (frame >= motionEnd) return 1;
  const motionSpan = Math.max(1, motionEnd - startFrame);
  if (
    decelerationFrame === undefined ||
    decelerationFrame <= startFrame ||
    decelerationFrame >= motionEnd
  )
    return clamp01((frame - startFrame) / motionSpan);

  if (frame <= decelerationFrame)
    return clamp01((frame - startFrame) / motionSpan);

  const entryProgress = (decelerationFrame - startFrame) / motionSpan;
  const settleSpan = motionEnd - decelerationFrame;
  const t = (frame - decelerationFrame) / Math.max(1, settleSpan);
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  const entrySlopePerFrame = 1 / motionSpan;
  return clamp01(
    h00 * entryProgress + h10 * settleSpan * entrySlopePerFrame + h01 + h11 * 0,
  );
};

export function evaluateContinuityFrame(
  rawEpisodePlan: ExecutableEpisodePlan,
  absoluteFrame: number,
): ResolvedContinuityFrame {
  const episode = executableEpisodePlanSchema.parse(rawEpisodePlan);
  if (
    !Number.isInteger(absoluteFrame) ||
    absoluteFrame < 0 ||
    absoluteFrame >= episode.format.durationInFrames
  )
    throw new Error(`Frame ${absoluteFrame} falls outside the episode.`);
  const executableShot = episode.shots.find(
    (shot) =>
      absoluteFrame >= shot.startFrame &&
      absoluteFrame < shot.endFrameExclusive,
  );
  if (!executableShot) throw new Error(`Frame ${absoluteFrame} has no shot.`);
  const continuityShot = episode.continuitySequencePlan.shots.find(
    (shot) => shot.shotId === executableShot.directorShotId,
  );
  if (!continuityShot)
    throw new Error(`${executableShot.id} is missing resolved continuity.`);
  const shotFrame = absoluteFrame - executableShot.startFrame;
  const duration = executableShot.endFrameExclusive - executableShot.startFrame;
  const shotProgress = clamp01(shotFrame / Math.max(1, duration - 1));
  const cameraProgram = continuityShot.cameraProgram;
  const transitionProgram = continuityShot.transitionProgram;
  const cameraKeyframes = cameraProgram.keyframes;
  const camera = {
    programId: cameraProgram.id,
    programContentHash: cameraProgram.contentHash,
    x: sample(
      shotFrame,
      cameraKeyframes.map((keyframe) => ({
        frame: keyframe.frame,
        value: keyframe.x,
      })),
    ),
    y: sample(
      shotFrame,
      cameraKeyframes.map((keyframe) => ({
        frame: keyframe.frame,
        value: keyframe.y,
      })),
    ),
    scale: sample(
      shotFrame,
      cameraKeyframes.map((keyframe) => ({
        frame: keyframe.frame,
        value: keyframe.scale,
      })),
    ),
    rotation: 0,
    shotSize: continuityShot.camera.size,
  };
  const transition = {
    programId: transitionProgram.id,
    programContentHash: transitionProgram.contentHash,
    kind: transitionProgram.kind,
    progress: sample(
      shotFrame,
      transitionProgram.progressKeyframes.map((keyframe) => ({
        frame: keyframe.frame,
        value: keyframe.progress,
      })),
    ),
    fromShotId:
      episode.shots.findIndex((shot) => shot.id === executableShot.id) > 0
        ? episode.shots[
            episode.shots.findIndex((shot) => shot.id === executableShot.id) - 1
          ]!.directorShotId
        : null,
    toShotId: executableShot.directorShotId,
    occluderId: transitionProgram.occluderId,
  };

  const phaseStartByEntity = new Map<string, number>();
  const decelerationFrameByEntity = new Map<string, number>();
  const plantFrameByEntity = new Map<string, number>();
  continuityShot.pictureEvents.forEach((event) =>
    event.subjectIds.forEach((entityId) => {
      const existing = phaseStartByEntity.get(entityId);
      if (existing === undefined || event.frame < existing)
        phaseStartByEntity.set(entityId, event.frame);
      if (event.source === "performance-event") {
        if (event.kind === "deceleration")
          decelerationFrameByEntity.set(entityId, event.frame);
        if (event.kind === "plant" || event.kind === "foot-contact")
          plantFrameByEntity.set(entityId, event.frame);
      }
    }),
  );
  const motionProgressByEntity = new Map(
    Object.keys(continuityShot.entryWorldState.entities).map((entityId) => [
      entityId,
      continuityMotionProgressAt(
        absoluteFrame,
        continuityShot.startFrame,
        continuityShot.endFrameExclusive - 1,
        decelerationFrameByEntity.get(entityId),
        plantFrameByEntity.get(entityId),
      ),
    ]),
  );
  const roots = Object.fromEntries(
    Object.entries(continuityShot.entryWorldState.entities).map(
      ([entityId, entryWorld]) => {
        const exitWorld = continuityShot.exitWorldState.entities[entityId]!;
        const motionProgress = motionProgressByEntity.get(entityId)!;
        return [
          entityId,
          {
            x: lerp(
              entryWorld.transform.x,
              exitWorld.transform.x,
              motionProgress,
            ),
            y: lerp(
              entryWorld.transform.y,
              exitWorld.transform.y,
              motionProgress,
            ),
            z: lerp(
              entryWorld.transform.z,
              exitWorld.transform.z,
              motionProgress,
            ),
            scale: lerp(
              entryWorld.transform.scale,
              exitWorld.transform.scale,
              motionProgress,
            ),
            rotation: lerp(
              entryWorld.transform.rotation,
              exitWorld.transform.rotation,
              motionProgress,
            ),
          },
        ];
      },
    ),
  );
  const entities = Object.fromEntries(
    Object.entries(continuityShot.entryWorldState.entities).map(
      ([entityId, entryWorld]) => {
        const exitWorld = continuityShot.exitWorldState.entities[entityId]!;
        const performanceSegment = continuityShot.performanceSegments.find(
          (segment) =>
            segment.entityId === entityId &&
            absoluteFrame >= segment.startFrame &&
            absoluteFrame < segment.endFrameExclusive,
        );
        if (!performanceSegment)
          throw new Error(
            `${entityId} has no canonical performance segment at frame ${absoluteFrame}.`,
          );
        const phaseStart =
          phaseStartByEntity.get(entityId) ?? continuityShot.startFrame;
        const phaseProgress = clamp01(
          (absoluteFrame - performanceSegment.startFrame) /
            Math.max(
              1,
              performanceSegment.endFrameExclusive -
                1 -
                performanceSegment.startFrame,
            ),
        );
        const transitioned = absoluteFrame >= phaseStart;
        const performanceProgramId = performanceSegment.performanceProgramId;
        const performanceProgram = performanceProgramId
          ? episode.performancePrograms.find(
              (program) => program.id === performanceProgramId,
            )
          : null;
        if (
          performanceProgramId !== null &&
          (!performanceProgram ||
            performanceProgram.entityId !== entityId ||
            !performanceProgram.sourceShotIds?.includes(
              executableShot.directorShotId,
            ) ||
            performanceProgram.contentHash !==
              performanceSegment.performanceProgramContentHash)
        )
          throw new Error(
            `${entityId} performance segment is not bound to the exact current-shot program.`,
          );
        const gazeTargetId = transitioned
          ? exitWorld.gazeTargetId
          : entryWorld.gazeTargetId;
        const gazeTarget = gazeTargetId ? roots[gazeTargetId] : null;
        const root = roots[entityId]!;
        const plantFrame = plantFrameByEntity.get(entityId);
        const atMotionStart = absoluteFrame === continuityShot.startFrame;
        const planted = plantFrame !== undefined && absoluteFrame >= plantFrame;
        const previousProgress = continuityMotionProgressAt(
          Math.max(continuityShot.startFrame, absoluteFrame - 1),
          continuityShot.startFrame,
          continuityShot.endFrameExclusive - 1,
          decelerationFrameByEntity.get(entityId),
          plantFrame,
        );
        const currentProgress = motionProgressByEntity.get(entityId)!;
        const sampledVelocity = {
          x:
            (exitWorld.transform.x - entryWorld.transform.x) *
            (currentProgress - previousProgress),
          y:
            (exitWorld.transform.y - entryWorld.transform.y) *
            (currentProgress - previousProgress),
          z:
            (exitWorld.transform.z - entryWorld.transform.z) *
            (currentProgress - previousProgress),
        };
        const gazeVectorLocal = gazeTarget
          ? (() => {
              const x = gazeTarget.x - root.x;
              const y = gazeTarget.y - root.y;
              const length = Math.hypot(x, y) || 1;
              return { x: x / length, y: y / length };
            })()
          : null;
        const lifecycle = transitioned
          ? exitWorld.lifecycle
          : entryWorld.lifecycle;
        const visemeProgram =
          episode.continuitySequencePlan.visemePrograms.find(
            (program) =>
              program.shotId === executableShot.directorShotId &&
              program.entityId === entityId,
          );
        const visemeId =
          visemeProgram?.cues.find(
            (cue) =>
              absoluteFrame >= cue.startFrame &&
              absoluteFrame < cue.endFrameExclusive,
          )?.visemeId ?? null;
        return [
          entityId,
          {
            entityId,
            visible: lifecycleVisible(lifecycle),
            lifecycle,
            rootTransform: root,
            velocity: atMotionStart
              ? entryWorld.velocity
              : planted
                ? exitWorld.velocity
                : sampledVelocity,
            facing: transitioned ? exitWorld.facing : entryWorld.facing,
            gazeVectorLocal,
            motionMode: performanceSegment.motionMode,
            actionPhase: performanceSegment.actionPhase,
            phaseProgress,
            gaitPhase: continuityGaitPhaseAt(
              performanceSegment.gaitStart,
              performanceSegment.gaitAdvanceCycles,
              phaseProgress,
            ),
            visemeId,
            performanceProgramId,
            performanceProgramContentHash:
              performanceSegment.performanceProgramContentHash,
          },
        ];
      },
    ),
  );
  const props = Object.fromEntries(
    Object.entries(
      shotProgress < 0.5
        ? continuityShot.entryWorldState.props
        : continuityShot.exitWorldState.props,
    ).map(([propId, state]) => [propId, { propId, state }]),
  );
  return resolvedContinuityFrameSchema.parse({
    schemaVersion: "1.0",
    episodePlanContentHash: episode.contentHash,
    continuitySequencePlanContentHash:
      episode.continuitySequencePlan.contentHash,
    absoluteFrame,
    shotFrame,
    fps: episode.format.fps,
    shotId: executableShot.directorShotId,
    sceneId: continuityShot.sceneId,
    camera,
    transition,
    entities,
    props,
  });
}
