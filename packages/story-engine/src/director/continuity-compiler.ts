import { hashCanonical } from "../canonical-hash";
import {
  continuitySequencePlanSchema,
  sealContinuitySequencePlan,
  type ContinuityPerformanceSegment,
  type ContinuityPerformanceState,
  type ContinuitySequencePlan,
  type ContinuitySequencePlanDraft,
} from "./continuity-sequence-plan";
import { directorPlanSchema, type DirectorPlan } from "./director-plan";
import { sceneWorldPlanSchema, type SceneWorldPlan } from "./scene-world";
import { timingSolutionSchema, type TimingSolution } from "./timing-solution";
import {
  directorWorldStateSchema,
  type DirectorWorldState,
} from "./world-state";

export type ContinuityPerformanceProgramBinding = {
  id: string;
  entityId: string;
  kind: "articulated-rig" | "drawing-sequence" | "atlas-cycle" | "living-hold";
  contentHash: string;
  sourceShotIds: string[];
};

export type CompileContinuitySequenceInput = {
  directorPlan: DirectorPlan;
  timingSolution: TimingSolution;
  sceneWorlds: SceneWorldPlan[];
  fps: number;
  performancePrograms: ContinuityPerformanceProgramBinding[];
};

const cloneWorldAt = (state: DirectorWorldState, frame: number) =>
  directorWorldStateSchema.parse({ ...structuredClone(state), frame });

const defaultPerformanceState = (
  entityId: string,
): ContinuityPerformanceState => ({
  entityId,
  motionMode: "idle",
  actionPhase: "hold",
  gaitPhase: null,
  performanceProgramId: null,
  performanceProgramContentHash: null,
});

const actionPhaseFor = (
  eventKind: DirectorPlan["events"][number]["kind"],
): ContinuityPerformanceState["actionPhase"] => {
  if (eventKind === "anticipation") return "anticipation";
  if (eventKind === "impact") return "impact";
  if (eventKind === "reaction") return "reaction";
  if (eventKind === "settle") return "settle";
  if (eventKind === "hold") return "hold";
  return "action";
};

const expectedTransitionBridge = (
  outgoing: DirectorPlan["shots"][number],
  incoming: DirectorPlan["shots"][number],
) => {
  const changedStage = outgoing.stageId !== incoming.stageId;
  const changedAxis = outgoing.camera.axisId !== incoming.camera.axisId;
  const neutralEstablishing = ["establish-space", "environment-reset"].includes(
    incoming.storyFunction,
  );
  const bridgeKind = changedStage
    ? neutralEstablishing
      ? ("neutral-establishing-shot" as const)
      : ("location-transition-event" as const)
    : changedAxis
      ? ("axis-reset-event" as const)
      : ("none" as const);
  return {
    bridgeKind,
    bridgeEventId:
      bridgeKind === "none" || bridgeKind === "neutral-establishing-shot"
        ? null
        : incoming.entryEventId,
  };
};

const normalizedLandmark = (
  world: SceneWorldPlan,
  stageId: string,
  landmarkId: string,
) => {
  const stage = world.stages.find((candidate) => candidate.id === stageId);
  const landmark = stage?.landmarks.find(
    (candidate) => candidate.id === landmarkId,
  );
  if (!stage || !landmark)
    throw new Error(`${stageId} is missing continuity landmark ${landmarkId}.`);
  return {
    x: landmark.position.x / world.coordinateSystem.width,
    y: landmark.position.y / world.coordinateSystem.height,
    z: landmark.position.z,
  };
};

const programForEntity = (
  shotId: string,
  entityId: string,
  programs: ContinuityPerformanceProgramBinding[],
) =>
  programs.find(
    (program) =>
      program.entityId === entityId && program.sourceShotIds.includes(shotId),
  ) ?? null;

const sealContinuityProgram = <T extends Record<string, unknown>>(
  draft: T,
) => ({
  ...draft,
  contentHash: hashCanonical(draft),
});

const wrapGait = (value: number) => ((value % 1) + 1) % 1;

const gaitAfterFrames = (start: number, frames: number) =>
  wrapGait(start + frames / 12);

const guideVisemeProgramFor = (
  shot: DirectorPlan["shots"][number],
  startFrame: number,
  endFrameExclusive: number,
  program: ContinuityPerformanceProgramBinding,
) => {
  const duration = endFrameExclusive - startFrame;
  if (
    program.kind !== "articulated-rig" ||
    !program.sourceShotIds.includes(shot.id) ||
    duration < 6
  )
    return null;
  const unit = Math.max(1, Math.min(6, Math.floor(duration / 8)));
  const span = unit * 3;
  const cueStart = startFrame + Math.floor((duration - span) / 2);
  const draft = {
    id: `guide-viseme-${shot.id}-${program.entityId}`,
    shotId: shot.id,
    entityId: program.entityId,
    sourceLineId: shot.beatIds[0]!,
    cues: [
      {
        startFrame: cueStart,
        endFrameExclusive: cueStart + unit,
        visemeId: "open",
      },
      {
        startFrame: cueStart + unit,
        endFrameExclusive: cueStart + unit * 2,
        visemeId: "rest",
      },
      {
        startFrame: cueStart + unit * 2,
        endFrameExclusive: cueStart + span,
        visemeId: "open",
      },
    ],
  };
  return { ...draft, contentHash: hashCanonical(draft) };
};

const cameraProgramForShot = (
  shot: DirectorPlan["shots"][number],
  duration: number,
  entryWorldState: DirectorWorldState,
  exitWorldState: DirectorWorldState,
) => {
  const scaleBySize = {
    "extreme-wide": 1,
    wide: 1.08,
    medium: 1.2,
    "close-up": 1.38,
    insert: 1.62,
  } as const;
  const scale = scaleBySize[shot.camera.size];
  const focalX =
    shot.composition.focalRegion === "left-third"
      ? -6
      : shot.composition.focalRegion === "right-third"
        ? 6
        : 0;
  const focalY =
    shot.composition.focalRegion === "upper-third"
      ? -4
      : shot.composition.focalRegion === "lower-third"
        ? 4
        : 0;
  const endFrame = duration - 1;
  const constantScale = (value: number) => ({ scale: value });
  const keyframes = (() => {
    switch (shot.camera.movement) {
      case "locked":
        return [
          { frame: 0, x: focalX, y: focalY, ...constantScale(scale) },
          { frame: endFrame, x: focalX, y: focalY, ...constantScale(scale) },
        ];
      case "pan":
        return [
          { frame: 0, x: focalX - 5, y: focalY, ...constantScale(scale) },
          {
            frame: endFrame,
            x: focalX + 5,
            y: focalY,
            ...constantScale(scale),
          },
        ];
      case "track": {
        const subjectId = shot.camera.subjectIds[0]!;
        const entry = entryWorldState.entities[subjectId]?.transform;
        const exit = exitWorldState.entities[subjectId]?.transform;
        const moved =
          entry && exit && (entry.x !== exit.x || entry.y !== exit.y);
        return moved
          ? [
              { frame: 0, x: focalX, y: focalY, ...constantScale(scale) },
              {
                frame: endFrame,
                x: focalX - (exit.x - entry.x) * 100,
                y: focalY - (exit.y - entry.y) * 100,
                ...constantScale(scale),
              },
            ]
          : [
              {
                frame: 0,
                x: focalX - 4,
                y: focalY,
                ...constantScale(scale),
              },
              {
                frame: endFrame,
                x: focalX + 4,
                y: focalY,
                ...constantScale(scale),
              },
            ];
      }
      case "push":
        return [
          { frame: 0, x: focalX, y: focalY, scale: scale * 0.96 },
          {
            frame: endFrame,
            x: focalX,
            y: focalY,
            scale: scale * 1.04,
          },
        ];
      case "pull":
        return [
          { frame: 0, x: focalX, y: focalY, scale: scale * 1.04 },
          {
            frame: endFrame,
            x: focalX,
            y: focalY,
            scale: scale * 0.96,
          },
        ];
      case "reframe":
        return [
          {
            frame: 0,
            x: focalX >= 0 ? focalX - 5 : focalX + 5,
            y: focalY >= 0 ? focalY + 3 : focalY - 3,
            ...constantScale(scale),
          },
          { frame: endFrame, x: focalX, y: focalY, ...constantScale(scale) },
        ];
    }
  })();
  return sealContinuityProgram({
    id: `proxy-camera-${shot.id}`,
    focalRegion: shot.composition.focalRegion,
    keyframes,
  });
};

const transitionProgramForShot = (
  shot: DirectorPlan["shots"][number],
  duration: number,
) => {
  const transitionFrames = Math.max(1, Math.min(10, duration - 1));
  const immediate = ["hard-cut", "match-cut"].includes(shot.transition.kind);
  const occluderId =
    shot.transition.kind === "foreground-wipe"
      ? (shot.composition.foregroundOccluderIds[0] ??
        shot.composition.depthLayers.at(-1) ??
        null)
      : null;
  if (shot.transition.kind === "foreground-wipe" && !occluderId)
    throw new Error(`${shot.id} cannot wipe without a foreground occluder.`);
  return sealContinuityProgram({
    id: `proxy-transition-${shot.id}`,
    kind: shot.transition.kind,
    progressKeyframes: [
      { frame: 0, progress: immediate ? 1 : 0 },
      { frame: transitionFrames, progress: 1 },
    ],
    occluderId,
  });
};

export function assertContinuitySequenceMatchesSources(
  rawDirectorPlan: DirectorPlan,
  rawTimingSolution: TimingSolution,
  rawContinuityPlan: ContinuitySequencePlan,
  performancePrograms: ContinuityPerformanceProgramBinding[],
) {
  const directorPlan = directorPlanSchema.parse(rawDirectorPlan);
  const timing = timingSolutionSchema.parse(rawTimingSolution);
  const continuity = continuitySequencePlanSchema.parse(rawContinuityPlan);
  if (
    continuity.directorPlanContentHash !== directorPlan.contentHash ||
    continuity.timingSolutionContentHash !== timing.contentHash
  )
    throw new Error("Continuity sequence does not match its Director sources.");
  if (
    hashCanonical(continuity.sceneWorldContentHashes) !==
    hashCanonical(directorPlan.sceneWorldContentHashes)
  )
    throw new Error(
      "Continuity sequence does not match the Director scene worlds.",
    );
  if (
    continuity.durationInFrames !== timing.durationInFrames ||
    continuity.shots.length !== directorPlan.shots.length ||
    continuity.shots.length !== timing.resolvedShots.length
  )
    throw new Error(
      "Continuity sequence coverage does not match Director timing.",
    );

  continuity.shots.forEach((shot, index) => {
    const planned = directorPlan.shots[index];
    const resolved = timing.resolvedShots[index];
    const duration = resolved
      ? resolved.endFrameExclusive - resolved.startFrame
      : 0;
    const expectedCamera = planned
      ? cameraProgramForShot(
          planned,
          duration,
          shot.entryWorldState,
          shot.exitWorldState,
        )
      : null;
    const expectedTransition = planned
      ? transitionProgramForShot(planned, duration)
      : null;
    if (
      !planned ||
      !resolved ||
      shot.shotId !== planned.id ||
      shot.sceneId !== planned.sceneId ||
      shot.stageId !== planned.stageId ||
      hashCanonical(shot.beatIds) !== hashCanonical(planned.beatIds) ||
      shot.startFrame !== resolved.startFrame ||
      shot.endFrameExclusive !== resolved.endFrameExclusive ||
      shot.cutEventId !== resolved.cutEventId ||
      shot.camera.axisId !== planned.camera.axisId ||
      shot.camera.size !== planned.camera.size ||
      shot.camera.angle !== planned.camera.angle ||
      shot.camera.movement !== planned.camera.movement ||
      hashCanonical(shot.camera.subjectIds) !==
        hashCanonical(planned.camera.subjectIds) ||
      shot.camera.motivation !== planned.camera.motivation ||
      !expectedCamera ||
      shot.cameraProgram.contentHash !== expectedCamera.contentHash ||
      !expectedTransition ||
      shot.transitionProgram.contentHash !== expectedTransition.contentHash
    )
      throw new Error(
        `${shot.shotId} invents continuity authority outside DirectorPlan.`,
      );

    const expectedVisemes = performancePrograms
      .filter((program) => program.sourceShotIds.includes(shot.shotId))
      .map((program) =>
        guideVisemeProgramFor(
          planned,
          shot.startFrame,
          shot.endFrameExclusive,
          program,
        ),
      )
      .filter((program) => program !== null)
      .sort((left, right) => left.id.localeCompare(right.id));
    const actualVisemes = continuity.visemePrograms
      .filter((program) => program.shotId === shot.shotId)
      .sort((left, right) => left.id.localeCompare(right.id));
    if (hashCanonical(actualVisemes) !== hashCanonical(expectedVisemes))
      throw new Error(
        `${shot.shotId} moves guide visemes outside compiler-owned timing.`,
      );
  });

  continuity.transitions.forEach((transition, index) => {
    const plannedOutgoing = directorPlan.shots[index];
    const plannedIncoming = directorPlan.shots[index + 1];
    const resolvedOutgoing = timing.resolvedShots[index];
    const expectedBridge =
      plannedOutgoing && plannedIncoming
        ? expectedTransitionBridge(plannedOutgoing, plannedIncoming)
        : null;
    if (
      !plannedOutgoing ||
      !plannedIncoming ||
      !resolvedOutgoing ||
      !expectedBridge ||
      transition.fromShotId !== plannedOutgoing.id ||
      transition.toShotId !== plannedIncoming.id ||
      transition.cutEventId !== resolvedOutgoing.cutEventId ||
      transition.kind !== plannedIncoming.transition.kind ||
      transition.motivation !== plannedIncoming.transition.motivation ||
      transition.bridgeKind !== expectedBridge.bridgeKind ||
      transition.bridgeEventId !== expectedBridge.bridgeEventId
    )
      throw new Error(
        "Continuity transition does not match the Director shot boundary.",
      );

    if (expectedBridge.bridgeEventId) {
      const bridgeEvent = directorPlan.events.find(
        (event) => event.id === expectedBridge.bridgeEventId,
      );
      const bridgeFrame = timing.resolvedEvents.find(
        (event) => event.eventId === expectedBridge.bridgeEventId,
      )?.frame;
      const incomingContinuityShot = continuity.shots[index + 1];
      if (
        !bridgeEvent ||
        bridgeFrame === undefined ||
        bridgeEvent.sceneId !== plannedIncoming.sceneId ||
        !incomingContinuityShot?.pictureEvents.some(
          (event) =>
            event.source === "director-event" &&
            event.eventId === bridgeEvent.id &&
            event.frame === bridgeFrame,
        )
      )
        throw new Error(
          `${expectedBridge.bridgeEventId} is not an exact resolved Director bridge event.`,
        );
    }
  });

  const eventFrames = new Map(
    timing.resolvedEvents.map((event) => [event.eventId, event.frame]),
  );
  const directorEventIds = new Set(
    directorPlan.events.map((event) => event.id),
  );
  continuity.shots.forEach((shot) =>
    shot.pictureEvents.forEach((event) => {
      if (event.source === "director-event") {
        if (
          !directorEventIds.has(event.eventId) ||
          eventFrames.get(event.eventId) !== event.frame
        )
          throw new Error(
            `${event.eventId} is not an exact resolved Director event.`,
          );
      } else if (!directorEventIds.has(event.parentDirectorEventId))
        throw new Error(`${event.id} has no canonical parent Director event.`);
    }),
  );

  for (let index = 1; index < continuity.shots.length; index += 1) {
    const previous = continuity.shots[index - 1]!;
    const current = continuity.shots[index]!;
    const previousIds = new Set(Object.keys(previous.exitWorldState.entities));
    const currentIds = new Set(Object.keys(current.entryWorldState.entities));
    const changes = [
      ...[...currentIds]
        .filter((entityId) => !previousIds.has(entityId))
        .map((entityId) => ({ entityId, kind: "entrance" as const })),
      ...[...previousIds]
        .filter((entityId) => !currentIds.has(entityId))
        .map((entityId) => ({ entityId, kind: "exit" as const })),
    ];
    for (const change of changes) {
      const lifecycleEvent = directorPlan.events.find((event) => {
        if (
          event.kind !== change.kind ||
          !event.subjectIds.includes(change.entityId)
        )
          return false;
        const frame = eventFrames.get(event.id);
        if (
          frame !== previous.endFrameExclusive - 1 &&
          frame !== current.startFrame
        )
          return false;
        return [previous, current].some((shot) =>
          shot.pictureEvents.some(
            (pictureEvent) =>
              pictureEvent.source === "director-event" &&
              pictureEvent.eventId === event.id &&
              pictureEvent.frame === frame,
          ),
        );
      });
      if (!lifecycleEvent)
        throw new Error(
          `${change.entityId} ${change.kind} across ${current.shotId} is not authorized by an exact boundary lifecycle event.`,
        );
    }
  }
}

export function compileContinuitySequencePlan(
  input: CompileContinuitySequenceInput,
): ContinuitySequencePlan {
  const directorPlan = directorPlanSchema.parse(input.directorPlan);
  const timing = timingSolutionSchema.parse(input.timingSolution);
  const sceneWorlds = input.sceneWorlds.map((world) =>
    sceneWorldPlanSchema.parse(world),
  );
  if (!Number.isInteger(input.fps) || input.fps <= 0)
    throw new Error("Continuity fps must be a positive integer.");
  if (timing.directorPlanContentHash !== directorPlan.contentHash)
    throw new Error("Continuity timing is not bound to the Director plan.");
  if (
    hashCanonical(sceneWorlds.map((world) => world.contentHash)) !==
    hashCanonical(directorPlan.sceneWorldContentHashes)
  )
    throw new Error(
      "Continuity scene worlds are not bound to the Director plan.",
    );
  const programIds = new Set(
    input.performancePrograms.map((program) => program.id),
  );
  if (programIds.size !== input.performancePrograms.length)
    throw new Error("Continuity performance program IDs must be unique.");

  const eventById = new Map(
    directorPlan.events.map((event) => [event.id, event]),
  );
  const eventFrameById = new Map(
    timing.resolvedEvents.map((event) => [event.eventId, event.frame]),
  );
  const resolvedByShotId = new Map(
    timing.resolvedShots.map((shot) => [shot.shotId, shot]),
  );
  const worldBySceneId = new Map(
    sceneWorlds.map((world) => [world.sceneId, world]),
  );
  let worldCursor = cloneWorldAt(directorPlan.initialWorldState, 0);
  let performanceCursor = Object.keys(worldCursor.entities)
    .sort()
    .map(defaultPerformanceState);
  const shots: ContinuitySequencePlanDraft["shots"] = [];
  const visemePrograms: ContinuitySequencePlanDraft["visemePrograms"] = [];

  directorPlan.shots.forEach((plannedShot, shotIndex) => {
    const resolved = resolvedByShotId.get(plannedShot.id);
    const world = worldBySceneId.get(plannedShot.sceneId);
    if (!resolved || !world)
      throw new Error(
        `${plannedShot.id} is missing resolved continuity sources.`,
      );
    const entryWorldState = cloneWorldAt(worldCursor, resolved.startFrame);
    const entryPerformanceState = performanceCursor.map((state) => {
      const program = programForEntity(
        plannedShot.id,
        state.entityId,
        input.performancePrograms,
      );
      return {
        ...state,
        performanceProgramId: program?.id ?? null,
        performanceProgramContentHash: program?.contentHash ?? null,
      };
    });
    const exitWorldState = cloneWorldAt(
      entryWorldState,
      resolved.endFrameExclusive - 1,
    );
    const exitPerformanceState = entryPerformanceState.map((state) => ({
      ...state,
    }));
    const canonicalPictureEvents: ContinuitySequencePlanDraft["shots"][number]["pictureEvents"] =
      directorPlan.events
        .map((event) => ({ event, frame: eventFrameById.get(event.id) }))
        .filter(
          (
            binding,
          ): binding is {
            event: DirectorPlan["events"][number];
            frame: number;
          } =>
            binding.frame !== undefined &&
            binding.frame >= resolved.startFrame &&
            binding.frame < resolved.endFrameExclusive,
        )
        .map(({ event, frame }) => ({
          source: "director-event" as const,
          eventId: event.id,
          frame,
          subjectIds: event.subjectIds,
        }));
    const performancePictureEvents: ContinuitySequencePlanDraft["shots"][number]["pictureEvents"] =
      [];
    const exitDirectorEvent = eventById.get(plannedShot.exitEventId)!;

    plannedShot.blocking.forEach((blocking) => {
      const worldEntity = exitWorldState.entities[blocking.entityId];
      const performanceState = exitPerformanceState.find(
        (state) => state.entityId === blocking.entityId,
      );
      if (!worldEntity || !performanceState)
        throw new Error(
          `${plannedShot.id} blocks unknown entity ${blocking.entityId}.`,
        );
      const program = programForEntity(
        plannedShot.id,
        blocking.entityId,
        input.performancePrograms,
      );
      worldEntity.facing = blocking.facing;
      worldEntity.gazeTargetId = blocking.gazeTargetId;
      performanceState.performanceProgramId = program?.id ?? null;
      performanceState.performanceProgramContentHash =
        program?.contentHash ?? null;
      if (!program) {
        performanceState.motionMode = "idle";
        performanceState.actionPhase = "hold";
        performanceState.gaitPhase = null;
        worldEntity.velocity = { x: 0, y: 0, z: 0 };
        return;
      }

      if (program.kind === "atlas-cycle") {
        const target = normalizedLandmark(
          world,
          plannedShot.stageId,
          blocking.exitLandmarkId,
        );
        const nextShot = directorPlan.shots[shotIndex + 1];
        const continues =
          nextShot !== undefined && program.sourceShotIds.includes(nextShot.id);
        const progress = continues ? 0.55 : 1;
        const origin = entryWorldState.entities[blocking.entityId]!.transform;
        worldEntity.transform.x = origin.x + (target.x - origin.x) * progress;
        worldEntity.transform.y = origin.y + (target.y - origin.y) * progress;
        worldEntity.transform.z = target.z;
        const duration = resolved.endFrameExclusive - resolved.startFrame;
        const gaitStart =
          entryPerformanceState.find(
            (state) => state.entityId === blocking.entityId,
          )?.gaitPhase ?? 0;
        const gaitEnd = (gaitStart + duration / 12) % 1;
        if (continues) {
          performanceState.motionMode = "running";
          performanceState.actionPhase = "action";
          performanceState.gaitPhase = gaitEnd;
          worldEntity.velocity = {
            x: (worldEntity.transform.x - origin.x) / Math.max(1, duration),
            y: (worldEntity.transform.y - origin.y) / Math.max(1, duration),
            z: 0,
          };
        } else {
          const parentFrame = eventFrameById.get(plannedShot.exitEventId)!;
          const decelerationFrame = Math.max(
            resolved.startFrame,
            Math.min(parentFrame, resolved.endFrameExclusive - 7),
          );
          const plantFrame = Math.max(
            decelerationFrame + 1,
            resolved.endFrameExclusive - 3,
          );
          performancePictureEvents.push(
            {
              source: "performance-event",
              id: `${plannedShot.id}-${blocking.entityId}-decelerate`,
              parentDirectorEventId: plannedShot.exitEventId,
              sourceProgramContentHash: program.contentHash,
              frame: decelerationFrame,
              subjectIds: [blocking.entityId],
              kind: "deceleration",
            },
            {
              source: "performance-event",
              id: `${plannedShot.id}-${blocking.entityId}-plant`,
              parentDirectorEventId: plannedShot.exitEventId,
              sourceProgramContentHash: program.contentHash,
              frame: plantFrame,
              subjectIds: [blocking.entityId],
              kind: "plant",
            },
          );
          performanceState.motionMode = "idle";
          performanceState.actionPhase = "settle";
          performanceState.gaitPhase = null;
          worldEntity.velocity = { x: 0, y: 0, z: 0 };
        }
      } else if (program.kind === "articulated-rig") {
        performanceState.motionMode =
          exitDirectorEvent.kind === "reaction" ? "reacting" : "performing";
        performanceState.actionPhase = actionPhaseFor(exitDirectorEvent.kind);
        performanceState.gaitPhase = null;
        worldEntity.velocity = { x: 0, y: 0, z: 0 };
      } else {
        performanceState.motionMode = "idle";
        performanceState.actionPhase = "hold";
        performanceState.gaitPhase = null;
        worldEntity.velocity = { x: 0, y: 0, z: 0 };
      }
    });

    exitPerformanceState.forEach((outgoing) => {
      const incoming = entryPerformanceState.find(
        (state) => state.entityId === outgoing.entityId,
      );
      if (!incoming) return;
      const wasLocomoting = ["walking", "sneaking", "running"].includes(
        incoming.motionMode,
      );
      const remainsLocomoting = ["walking", "sneaking", "running"].includes(
        outgoing.motionMode,
      );
      const nextShot = directorPlan.shots[shotIndex + 1];
      const nextProgram = nextShot
        ? programForEntity(
            nextShot.id,
            outgoing.entityId,
            input.performancePrograms,
          )
        : null;
      const sourceProgram = programForEntity(
        plannedShot.id,
        outgoing.entityId,
        input.performancePrograms,
      );
      const mustPlant =
        (wasLocomoting && !remainsLocomoting) ||
        (remainsLocomoting &&
          nextProgram?.id !== outgoing.performanceProgramId);
      if (!mustPlant || !sourceProgram) return;
      const alreadyPlants = performancePictureEvents.some(
        (event) =>
          event.source === "performance-event" &&
          event.subjectIds.includes(outgoing.entityId) &&
          (event.kind === "plant" || event.kind === "foot-contact"),
      );
      if (!alreadyPlants) {
        const parentFrame = eventFrameById.get(plannedShot.exitEventId)!;
        const decelerationFrame = Math.max(
          resolved.startFrame,
          Math.min(parentFrame, resolved.endFrameExclusive - 7),
        );
        const plantFrame = Math.max(
          decelerationFrame + 1,
          resolved.endFrameExclusive - 3,
        );
        performancePictureEvents.push(
          {
            source: "performance-event",
            id: `${plannedShot.id}-${outgoing.entityId}-inherit-decelerate`,
            parentDirectorEventId: plannedShot.exitEventId,
            sourceProgramContentHash: sourceProgram.contentHash,
            frame: decelerationFrame,
            subjectIds: [outgoing.entityId],
            kind: "deceleration",
          },
          {
            source: "performance-event",
            id: `${plannedShot.id}-${outgoing.entityId}-inherit-plant`,
            parentDirectorEventId: plannedShot.exitEventId,
            sourceProgramContentHash: sourceProgram.contentHash,
            frame: plantFrame,
            subjectIds: [outgoing.entityId],
            kind: "plant",
          },
        );
      }
      outgoing.motionMode = "idle";
      outgoing.actionPhase = "settle";
      outgoing.gaitPhase = null;
      const entity = exitWorldState.entities[outgoing.entityId];
      if (entity) entity.velocity = { x: 0, y: 0, z: 0 };
    });

    if (
      !canonicalPictureEvents.some(
        (event) =>
          event.source === "director-event" &&
          event.eventId === resolved.cutEventId,
      )
    )
      throw new Error(`${plannedShot.id} has no resolved cut picture event.`);
    const shotDuration = resolved.endFrameExclusive - resolved.startFrame;
    const performanceSegments = Object.keys(entryWorldState.entities)
      .sort()
      .flatMap((entityId): ContinuityPerformanceSegment[] => {
        const entryWorld = entryWorldState.entities[entityId]!;
        const exitWorld = exitWorldState.entities[entityId]!;
        const entry = entryPerformanceState.find(
          (state) => state.entityId === entityId,
        )!;
        const exit = exitPerformanceState.find(
          (state) => state.entityId === entityId,
        )!;
        const program = programForEntity(
          plannedShot.id,
          entityId,
          input.performancePrograms,
        );
        const moved =
          Math.hypot(
            exitWorld.transform.x - entryWorld.transform.x,
            exitWorld.transform.y - entryWorld.transform.y,
            exitWorld.transform.z - entryWorld.transform.z,
          ) > 0.000001;
        const performanceEvents = performancePictureEvents.filter(
          (
            event,
          ): event is Extract<
            (typeof performancePictureEvents)[number],
            { source: "performance-event" }
          > =>
            event.source === "performance-event" &&
            event.subjectIds.includes(entityId),
        );
        const decelerationFrame = performanceEvents.find(
          (event) => event.kind === "deceleration",
        )?.frame;
        const plantFrame = performanceEvents.find(
          (event) => event.kind === "plant" || event.kind === "foot-contact",
        )?.frame;
        const gaitStart = entry.gaitPhase ?? 0;
        const segment = (
          startFrame: number,
          endFrameExclusive: number,
          motionMode: ContinuityPerformanceSegment["motionMode"],
          actionPhase: ContinuityPerformanceSegment["actionPhase"],
          startGait: number | null,
          endGait: number | null,
        ): ContinuityPerformanceSegment | null =>
          endFrameExclusive <= startFrame
            ? null
            : {
                entityId,
                startFrame,
                endFrameExclusive,
                motionMode,
                actionPhase,
                gaitStart: startGait,
                gaitEnd: endGait,
                performanceProgramId: program?.id ?? null,
                performanceProgramContentHash: program?.contentHash ?? null,
              };
        const segments: ContinuityPerformanceSegment[] = [];
        const push = (candidate: ContinuityPerformanceSegment | null) => {
          if (candidate) segments.push(candidate);
        };

        if (moved && plantFrame !== undefined) {
          const deceleration = Math.max(
            resolved.startFrame,
            Math.min(decelerationFrame ?? plantFrame - 1, plantFrame - 1),
          );
          const gaitAtDeceleration = gaitAfterFrames(
            gaitStart,
            deceleration - resolved.startFrame,
          );
          const gaitAtPlant = gaitAfterFrames(
            gaitStart,
            plantFrame - resolved.startFrame,
          );
          push(
            segment(
              resolved.startFrame,
              deceleration,
              program?.kind === "atlas-cycle" ? "running" : "walking",
              "action",
              gaitStart,
              gaitAtDeceleration,
            ),
          );
          push(
            segment(
              deceleration,
              plantFrame,
              "decelerating",
              "action",
              gaitAtDeceleration,
              gaitAtPlant,
            ),
          );
          const settleEnd = Math.min(
            resolved.endFrameExclusive,
            plantFrame + 6,
          );
          push(segment(plantFrame, settleEnd, "idle", "settle", null, null));
          push(
            segment(
              settleEnd,
              resolved.endFrameExclusive,
              "idle",
              "hold",
              null,
              null,
            ),
          );
        } else if (moved) {
          push(
            segment(
              resolved.startFrame,
              resolved.endFrameExclusive,
              program?.kind === "atlas-cycle" ? "running" : "walking",
              "action",
              gaitStart,
              gaitAfterFrames(gaitStart, shotDuration),
            ),
          );
        } else {
          const entryDiffers =
            entry.motionMode !== exit.motionMode ||
            entry.actionPhase !== exit.actionPhase ||
            entry.gaitPhase !== exit.gaitPhase;
          if (entryDiffers && shotDuration > 1)
            push(
              segment(
                resolved.startFrame,
                resolved.startFrame + 1,
                entry.motionMode,
                entry.actionPhase,
                entry.gaitPhase,
                entry.gaitPhase,
              ),
            );
          push(
            segment(
              entryDiffers && shotDuration > 1
                ? resolved.startFrame + 1
                : resolved.startFrame,
              resolved.endFrameExclusive,
              exit.motionMode,
              exit.actionPhase,
              exit.gaitPhase,
              exit.gaitPhase,
            ),
          );
        }

        const last = segments.at(-1)!;
        Object.assign(exit, {
          motionMode: last.motionMode,
          actionPhase: last.actionPhase,
          gaitPhase: last.gaitEnd,
          performanceProgramId: last.performanceProgramId,
          performanceProgramContentHash: last.performanceProgramContentHash,
        });
        return segments;
      });

    input.performancePrograms.forEach((program) => {
      if (!entryWorldState.entities[program.entityId]) return;
      const visemeProgram = guideVisemeProgramFor(
        plannedShot,
        resolved.startFrame,
        resolved.endFrameExclusive,
        program,
      );
      if (visemeProgram) visemePrograms.push(visemeProgram);
    });

    shots.push({
      shotId: plannedShot.id,
      sceneId: plannedShot.sceneId,
      stageId: plannedShot.stageId,
      beatIds: plannedShot.beatIds,
      startFrame: resolved.startFrame,
      endFrameExclusive: resolved.endFrameExclusive,
      cutEventId: resolved.cutEventId,
      camera: {
        axisId: plannedShot.camera.axisId,
        size: plannedShot.camera.size,
        angle: plannedShot.camera.angle,
        movement: plannedShot.camera.movement,
        subjectIds: plannedShot.camera.subjectIds,
        motivation: plannedShot.camera.motivation,
        screenProjection: { worldXDirection: 1, worldXOffset: 0 },
      },
      cameraProgram: cameraProgramForShot(
        plannedShot,
        shotDuration,
        entryWorldState,
        exitWorldState,
      ),
      transitionProgram: transitionProgramForShot(plannedShot, shotDuration),
      entryWorldState,
      exitWorldState,
      entryPerformanceState,
      exitPerformanceState,
      performanceSegments,
      pictureEvents: [
        ...canonicalPictureEvents,
        ...performancePictureEvents,
      ].sort((left, right) => left.frame - right.frame),
    });
    worldCursor = exitWorldState;
    performanceCursor = exitPerformanceState;
  });

  const transitions: ContinuitySequencePlanDraft["transitions"] = shots
    .slice(1)
    .map((current, index) => {
      const previous = shots[index]!;
      const outgoingPlan = directorPlan.shots[index]!;
      const incomingPlan = directorPlan.shots[index + 1]!;
      const { bridgeKind, bridgeEventId } = expectedTransitionBridge(
        outgoingPlan,
        incomingPlan,
      );
      return {
        fromShotId: previous.shotId,
        toShotId: current.shotId,
        cutEventId: previous.cutEventId,
        kind: incomingPlan.transition.kind,
        motivation: incomingPlan.transition.motivation,
        bridgeKind,
        bridgeEventId,
      };
    });

  const continuity = sealContinuitySequencePlan({
    schemaVersion: "1.0",
    directorPlanContentHash: directorPlan.contentHash,
    timingSolutionContentHash: timing.contentHash,
    sceneWorldContentHashes: sceneWorlds.map((world) => world.contentHash),
    fps: input.fps,
    durationInFrames: timing.durationInFrames,
    shots,
    transitions,
    visemePrograms,
  });
  assertContinuitySequenceMatchesSources(
    directorPlan,
    timing,
    continuity,
    input.performancePrograms,
  );
  return continuity;
}
