import { hashCanonical } from "../canonical-hash";
import {
  cv002ProjectSchema,
  type Cv002Beat,
  type Cv002BeatRole,
  type Cv002Project,
} from "../cv002-story-draft";
import {
  alphaCapabilityRegistry,
  resolveDirectorCapabilities,
  type CapabilityRegistry,
} from "./capability-report";
import { sealDirectorPlan, type DirectorPlanDraft } from "./director-plan";
import {
  sealExecutableEpisodePlan,
  type ExecutableEpisodePlanDraft,
} from "./executable-episode-plan";
import { getGrammarProfile } from "./grammar-profile";
import { analyzeDirectorQuality } from "./quality-report";
import {
  sealDirectorProject,
  type DirectorProject,
  type DirectorRevisionLineage,
} from "./director-project";
import {
  Cv002AlphaDirectorPlanner,
  type DirectorPlanner,
  type DirectorProposal,
} from "./director-proposal";
import { sealSceneWorldPlan, type SceneWorldPlan } from "./scene-world";
import {
  sealTimingSolution,
  type TimingSolutionDraft,
} from "./timing-solution";
import { directorWorldStateSchema } from "./world-state";

export type DirectorOutputFormat = {
  width: number;
  height: number;
  fps: number;
};
export type DirectorTimingBasis = {
  kind: "estimated" | "guide-audio" | "approved-final-audio";
  contentHash: string;
};

export type DirectorCompileFailureCode =
  | "invalid-story-project"
  | "input-policy-failed"
  | "planner-output-invalid"
  | "scene-world-invalid"
  | "director-plan-invalid"
  | "timing-unsatisfiable"
  | "capability-resolution-failed"
  | "executable-plan-invalid";

export type DirectorCompileDiagnostic = {
  code: DirectorCompileFailureCode;
  message: string;
};

export type CompileDirectorProjectInput = {
  storyProject: Cv002Project;
  planner?: DirectorPlanner;
  capabilities?: CapabilityRegistry;
  format?: DirectorOutputFormat;
  timingBasis?: DirectorTimingBasis;
  revision?: DirectorRevisionLineage;
};

export type CompileDirectorProjectResult =
  | { ok: true; directorProject: DirectorProject }
  | { ok: false; diagnostics: DirectorCompileDiagnostic[] };

class DirectorCompileError extends Error {
  constructor(
    readonly code: DirectorCompileFailureCode,
    message: string,
  ) {
    super(message);
    this.name = "DirectorCompileError";
  }
}

function compileStep<T>(
  code: DirectorCompileFailureCode,
  operation: () => T,
): T {
  try {
    return operation();
  } catch (error) {
    if (error instanceof DirectorCompileError) throw error;
    throw new DirectorCompileError(
      code,
      error instanceof Error ? error.message : String(error),
    );
  }
}

export const directorAlphaInputPolicy = {
  minimumWords: 100,
  maximumWords: 300,
  version: "1.0",
} as const;

const humanize = (value: string) => value.replaceAll("-", " ");
const wordCount = (value: string) =>
  value.trim().split(/\s+/).filter(Boolean).length;
const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, value));

const purposeFor = (
  grammar: Cv002Project["grammar"],
  role: Cv002BeatRole,
  firstInScene: boolean,
) => {
  if (firstInScene)
    return grammar === "kids-adventure"
      ? "establish-space"
      : "environment-reset";
  if (grammar === "weird-history") {
    if (role === "reveal" || role === "action") return "evidence";
    if (role === "explanation") return "diagram";
    if (role === "punchline") return "text-emphasis";
    if (role === "reaction") return "reaction";
    if (role === "transition") return "environment-reset";
    return "clarify-action";
  }
  if (role === "action") return "follow-action";
  if (role === "reaction") return "reaction";
  if (role === "reveal") return "reveal";
  if (role === "punchline") return "payoff";
  if (role === "transition") return "location-transition";
  return "clarify-action";
};

const eventKindFor = (role: Cv002BeatRole) => {
  if (role === "reaction") return "reaction" as const;
  if (role === "reveal") return "reveal" as const;
  if (role === "action") return "impact" as const;
  if (role === "transition") return "settle" as const;
  return "hold" as const;
};

function durationFor(project: Cv002Project, beat: Cv002Beat) {
  const words = wordCount(beat.text);
  if (project.grammar === "kids-adventure") {
    const roleExtra =
      beat.role === "action"
        ? 22
        : beat.role === "reaction"
          ? 16
          : beat.role === "reveal"
            ? 20
            : 0;
    return clamp(Math.round(58 + words * 1.5 + roleExtra), 48, 150);
  }
  const roleExtra =
    beat.role === "reveal" || beat.role === "explanation"
      ? 10
      : beat.role === "punchline"
        ? -4
        : 0;
  return clamp(Math.round(34 + words * 0.9 + roleExtra), 24, 105);
}

const shouldUseMultipleShots = (project: Cv002Project, beat: Cv002Beat) => {
  const semanticRole =
    project.grammar === "kids-adventure"
      ? ["action", "reveal"].includes(beat.role)
      : ["explanation", "reveal", "punchline"].includes(beat.role);
  const compoundAction =
    wordCount(beat.text) >= 12 &&
    /\b(?:and|but|when|then|until)\b/i.test(beat.text);
  return semanticRole || compoundAction;
};

function shotDurationFor(
  project: Cv002Project,
  beat: Cv002Beat,
  shotCount: number,
  shotIndex: number,
) {
  if (shotCount === 1) return durationFor(project, beat);
  const minimum = getGrammarProfile(project.grammar).pacing.shotDurationFrames
    .minimum;
  const base = durationFor(project, beat);
  return project.grammar === "kids-adventure"
    ? Math.max(minimum, Math.round(base * (shotIndex === 0 ? 0.68 : 0.58)))
    : Math.max(minimum, Math.round(base * (shotIndex === 0 ? 0.62 : 0.5)));
}

const sealExecutableProgram = <T extends Record<string, unknown>>(
  draft: T,
) => ({
  ...draft,
  contentHash: hashCanonical(draft),
});

const paletteFor = (grammar: Cv002Project["grammar"], index: number) =>
  grammar === "kids-adventure"
    ? [
        {
          sky: "#d9f4e4",
          ground: "#547b67",
          ink: "#143b40",
          accent: "#f7c96b",
        },
        {
          sky: "#dce7ff",
          ground: "#5b668e",
          ink: "#222947",
          accent: "#ff8f77",
        },
        {
          sky: "#f7e4ca",
          ground: "#806849",
          ink: "#3b2a24",
          accent: "#91c9a8",
        },
      ][index % 3]!
    : [
        {
          sky: "#ebe7df",
          ground: "#c8c0b3",
          ink: "#171b1d",
          accent: "#ef563f",
        },
        {
          sky: "#e4e9e6",
          ground: "#b8c3bd",
          ink: "#17201d",
          accent: "#e9b949",
        },
        {
          sky: "#ece4dc",
          ground: "#cbb9aa",
          ink: "#241c1a",
          accent: "#e56c4f",
        },
      ][index % 3]!;

function assertProposal(project: Cv002Project, proposal: DirectorProposal) {
  const beatIds = project.graph.scenes.flatMap((scene) =>
    scene.beats.map((beat) => beat.id),
  );
  if (
    !proposal.plannerId.trim() ||
    !proposal.plannerVersion.trim() ||
    proposal.storyGraphContentHash !== project.graph.contentHash ||
    proposal.grammar !== project.grammar
  )
    throw new Error(
      "Director proposal is not bound to the current story graph.",
    );
  if (
    proposal.beatDirections.length !== beatIds.length ||
    proposal.beatDirections.some(
      (direction, index) => direction.beatId !== beatIds[index],
    )
  )
    throw new Error(
      "Director proposal must cover every story beat exactly once in source order.",
    );
  const adjustmentIds = proposal.beatTimingAdjustments.map(
    (adjustment) => adjustment.beatId,
  );
  if (
    new Set(adjustmentIds).size !== adjustmentIds.length ||
    proposal.beatTimingAdjustments.some(
      (adjustment) =>
        !beatIds.includes(adjustment.beatId) ||
        !Number.isInteger(adjustment.reactionDelayFrames) ||
        adjustment.reactionDelayFrames < 0 ||
        adjustment.reactionDelayFrames > 30,
    )
  )
    throw new Error(
      "Director proposal timing adjustments must target unique known beats with a 0 to 30 frame reaction delay.",
    );
}

function buildSceneWorlds(project: Cv002Project) {
  const isKids = project.grammar === "kids-adventure";
  const entities = isKids
    ? {
        lead: {
          entityId: "lead",
          lifecycle: "onstage" as const,
          transform: { x: 0.28, y: 0.72, z: 0, scale: 1, rotation: 0 },
          facing: "right" as const,
          gazeTargetId: "support",
          velocity: { x: 0, y: 0, z: 0 },
        },
        support: {
          entityId: "support",
          lifecycle: "onstage" as const,
          transform: { x: 0.68, y: 0.72, z: 0, scale: 0.92, rotation: 0 },
          facing: "left" as const,
          gazeTargetId: "lead",
          velocity: { x: 0, y: 0, z: 0 },
        },
      }
    : {
        presenter: {
          entityId: "presenter",
          lifecycle: "onstage" as const,
          transform: { x: 0.24, y: 0.72, z: 0, scale: 1, rotation: 0 },
          facing: "three-quarter" as const,
          gazeTargetId: "evidence",
          velocity: { x: 0, y: 0, z: 0 },
        },
        evidence: {
          entityId: "evidence",
          lifecycle: "onstage" as const,
          transform: { x: 0.68, y: 0.48, z: 0, scale: 1, rotation: 0 },
          facing: "front" as const,
          gazeTargetId: null,
          velocity: { x: 0, y: 0, z: 0 },
        },
      };
  const initialWorldState = directorWorldStateSchema.parse({
    frame: 0,
    entities,
    props: {},
  });
  const worlds = project.graph.scenes.map((scene, sceneIndex) => {
    const stageId = `stage-${sceneIndex + 1}-${scene.contentHash.slice(0, 8)}`;
    return sealSceneWorldPlan({
      schemaVersion: "1.0",
      id: `world-${sceneIndex + 1}-${scene.contentHash.slice(0, 8)}`,
      sceneId: scene.id,
      sourceSceneContentHash: scene.contentHash,
      coordinateSystem: {
        width: 100,
        height: 56.25,
        depthMinimum: -10,
        depthMaximum: 10,
      },
      stages: [
        {
          id: stageId,
          stageKitRequirementId: `stage-kit-${sceneIndex + 1}`,
          walkableSurfaces: [
            {
              id: `floor-${sceneIndex + 1}`,
              boundary: [
                { x: 0, y: 42, z: 0 },
                { x: 100, y: 42, z: 0 },
                { x: 100, y: 56.25, z: 0 },
                { x: 0, y: 56.25, z: 0 },
              ],
              elevation: 0,
            },
          ],
          depthPlanes: [
            {
              id: `far-${sceneIndex + 1}`,
              role: "background",
              depth: -5,
              layerRequirementId: `background-${sceneIndex + 1}`,
            },
            {
              id: `actors-${sceneIndex + 1}`,
              role: "performance",
              depth: 0,
              layerRequirementId: `performance-${sceneIndex + 1}`,
            },
            {
              id: `near-${sceneIndex + 1}`,
              role: "foreground",
              depth: 5,
              layerRequirementId: `foreground-${sceneIndex + 1}`,
            },
          ],
          landmarks: [
            {
              id: `entry-${sceneIndex + 1}`,
              kind: "entrance",
              position: { x: 12, y: 42, z: 0 },
              facing: "right",
            },
            {
              id: `focus-${sceneIndex + 1}`,
              kind: "action-mark",
              position: { x: 50, y: 42, z: 0 },
              facing: "front",
            },
            {
              id: `exit-${sceneIndex + 1}`,
              kind: "exit",
              position: { x: 88, y: 42, z: 0 },
              facing: "right",
            },
          ],
          occluders: [],
          cameraZones: [
            {
              id: `camera-zone-${sceneIndex + 1}`,
              boundary: [
                { x: 0, y: 0, z: -2 },
                { x: 100, y: 0, z: -2 },
                { x: 100, y: 56.25, z: -2 },
                { x: 0, y: 56.25, z: -2 },
              ],
              permittedShotSizes: [
                "extreme-wide",
                "wide",
                "medium",
                "close-up",
                "insert",
              ],
            },
          ],
        },
      ],
      portals: [],
      initialWorldState,
    });
  });
  return { worlds, initialWorldState };
}

function buildDirectorPlan(
  project: Cv002Project,
  proposal: DirectorProposal,
  worlds: SceneWorldPlan[],
) {
  const grammar = getGrammarProfile(project.grammar);
  const allBeats = project.graph.scenes.flatMap((scene) => scene.beats);
  const directionByBeat = new Map(
    proposal.beatDirections.map((direction) => [direction.beatId, direction]),
  );
  const timingAdjustmentByBeat = new Map(
    proposal.beatTimingAdjustments.map((adjustment) => [
      adjustment.beatId,
      adjustment.reactionDelayFrames,
    ]),
  );
  const isKids = project.grammar === "kids-adventure";
  let eventOrder = 0;
  let previousResolveId: string | null = null;
  const events: DirectorPlanDraft["events"] = [];
  const beats: DirectorPlanDraft["beats"] = [];
  const shots: DirectorPlanDraft["shots"] = [];
  const scenes: DirectorPlanDraft["scenes"] = [];
  const multiShotBeatId =
    allBeats.find((beat) => shouldUseMultipleShots(project, beat))?.id ?? null;

  project.graph.scenes.forEach((scene, sceneIndex) => {
    const world = worlds[sceneIndex]!;
    const stage = world.stages[0]!;
    const shotIds: string[] = [];
    scene.beats.forEach((beat, beatIndex) => {
      const globalIndex = allBeats.findIndex(
        (candidate) => candidate.id === beat.id,
      );
      const direction = directionByBeat.get(beat.id)!;
      const reactionDelayFrames = timingAdjustmentByBeat.get(beat.id) ?? 0;
      const startEventId = `beat-${globalIndex + 1}-start`;
      const pivotEventId = `beat-${globalIndex + 1}-pivot`;
      const resolveEventId = `beat-${globalIndex + 1}-resolve`;
      const subjectId = isKids
        ? globalIndex % 3 === 1
          ? "support"
          : "lead"
        : direction.staging === "presenter-led"
          ? "presenter"
          : "evidence";
      const secondarySubjectId = isKids
        ? subjectId === "lead"
          ? "support"
          : "lead"
        : "evidence";
      const multiShot = beat.id === multiShotBeatId;
      events.push({
        id: startEventId,
        sceneId: scene.id,
        beatId: beat.id,
        order: eventOrder++,
        kind: "anticipation",
        subjectIds: [subjectId],
        propId: null,
        causedByEventIds: previousResolveId ? [previousResolveId] : [],
        description: `Begin: ${beat.text}`,
      });
      if (multiShot)
        events.push({
          id: pivotEventId,
          sceneId: scene.id,
          beatId: beat.id,
          order: eventOrder++,
          kind: eventKindFor(beat.role),
          subjectIds: [subjectId],
          propId: null,
          causedByEventIds: [startEventId],
          description: `The beat changes visual point of view: ${beat.text}`,
        });
      events.push({
        id: resolveEventId,
        sceneId: scene.id,
        beatId: beat.id,
        order: eventOrder++,
        kind: multiShot && isKids ? "reaction" : eventKindFor(beat.role),
        subjectIds: [multiShot ? secondarySubjectId : subjectId],
        propId: null,
        causedByEventIds: [multiShot ? pivotEventId : startEventId],
        description: `Audience reads: ${beat.text}`,
      });
      previousResolveId = resolveEventId;
      const performanceSource = isKids
        ? beat.role === "setup" || beat.role === "explanation"
          ? ("living-hold" as const)
          : ("articulated-rig" as const)
        : ["reveal", "action", "explanation"].includes(beat.role)
          ? ("drawing-sequence" as const)
          : ("living-hold" as const);
      const eventIds = multiShot
        ? [startEventId, pivotEventId, resolveEventId]
        : [startEventId, resolveEventId];
      const performanceRequirements: DirectorPlanDraft["beats"][number]["performanceRequirements"] =
        [
          {
            id: `performance-${globalIndex + 1}-primary`,
            entityId: subjectId,
            action: `${humanize(beat.role)}: ${beat.text}`,
            source: performanceSource,
            requiredInternalChannels:
              performanceSource === "living-hold"
                ? ["breath", "gaze"]
                : ["gaze", "head", "torso", "limbs"],
            requiredEventIds: multiShot
              ? [startEventId, pivotEventId]
              : [startEventId, resolveEventId],
          },
        ];
      if (multiShot)
        performanceRequirements.push({
          id: `performance-${globalIndex + 1}-response`,
          entityId: secondarySubjectId,
          action: isKids
            ? "Delayed readable reaction to the primary action"
            : "Evidence or emphasis that visually supports the claim",
          source: isKids ? "articulated-rig" : "drawing-sequence",
          requiredInternalChannels: isKids
            ? ["gaze", "head", "torso"]
            : ["layout", "emphasis"],
          requiredEventIds: [pivotEventId, resolveEventId],
        });
      beats.push({
        beatId: beat.id,
        beatContentHash: beat.contentHash,
        audienceTakeaway: beat.text,
        emotionalTurn: {
          from: beatIndex === 0 ? "orientation" : "attention",
          to: beat.role === "reaction" ? "response" : humanize(beat.role),
        },
        reactionDelayFrames,
        muteReadable: isKids,
        eventIds,
        performanceRequirements,
        sound: {
          dialogueLineIds: [],
          narrationLineIds:
            project.grammar === "weird-history"
              ? [`narration-${globalIndex + 1}`]
              : [],
          effectEventIds:
            direction.sfxIntent === "none" ? [] : [resolveEventId],
          musicFunction: humanize(direction.musicIntent),
        },
      });
      const readFrames = isKids ? 10 : 6;
      const cameraMovement =
        direction.cameraIntent === "reframe" ||
        direction.cameraIntent === "snap-reframe"
          ? ("reframe" as const)
          : direction.cameraIntent === "gentle-push" ||
              direction.cameraIntent === "fast-push"
            ? ("push" as const)
            : ("locked" as const);
      const cameraSize =
        direction.shotSize === "insert"
          ? ("insert" as const)
          : direction.shotSize;
      const focalRegion =
        globalIndex % 3 === 0
          ? ("left-third" as const)
          : globalIndex % 3 === 1
            ? ("right-third" as const)
            : ("center" as const);
      const shotCount = multiShot ? 2 : 1;
      Array.from({ length: shotCount }, (_, shotIndex) => {
        const suffix =
          shotCount === 1 ? "main" : shotIndex === 0 ? "primary" : "response";
        const shotId = `shot-${globalIndex + 1}-${suffix}`;
        const secondary = shotIndex === 1;
        const shotSubjectId = secondary ? secondarySubjectId : subjectId;
        const shotPurpose = secondary
          ? isKids
            ? "reaction"
            : beat.role === "explanation"
              ? "diagram"
              : beat.role === "punchline"
                ? "text-emphasis"
                : "evidence"
          : purposeFor(project.grammar, beat.role, beatIndex === 0);
        const entryEventId = secondary ? pivotEventId : startEventId;
        const exitEventId =
          secondary || !multiShot ? resolveEventId : pivotEventId;
        const duration =
          shotDurationFor(project, beat, shotCount, shotIndex) +
          (reactionDelayFrames > 0 && (secondary || shotIndex === shotCount - 1)
            ? reactionDelayFrames
            : 0);
        shotIds.push(shotId);
        shots.push({
          id: shotId,
          sceneId: scene.id,
          stageId: stage.id,
          beatIds: [beat.id],
          storyFunction: shotPurpose,
          entryEventId,
          exitEventId,
          camera: {
            size: secondary ? (isKids ? "close-up" : "insert") : cameraSize,
            angle:
              secondary && !isKids
                ? "overhead"
                : direction.shotSize === "insert"
                  ? "overhead"
                  : beat.role === "action" && isKids
                    ? "profile"
                    : "eye-level",
            movement: secondary ? (isKids ? "push" : "locked") : cameraMovement,
            subjectIds: [shotSubjectId],
            axisId: `axis-${sceneIndex + 1}`,
            motivation: secondary
              ? isKids
                ? "Reveal the delayed reaction caused by the action."
                : "Replace assertion with supporting visual evidence."
              : `${shotPurpose}: preserve the audience's understanding of this beat.`,
          },
          composition: {
            focalRegion: secondary
              ? isKids
                ? focalRegion === "left-third"
                  ? "right-third"
                  : "left-third"
                : "center"
              : focalRegion,
            depthLayers: stage.depthPlanes.map((plane) => plane.id),
            foregroundOccluderIds: [],
            negativeSpace: secondary
              ? "none"
              : focalRegion === "left-third"
                ? "right"
                : focalRegion === "right-third"
                  ? "left"
                  : "none",
          },
          blocking: [
            {
              entityId: shotSubjectId,
              entryLandmarkId: `entry-${sceneIndex + 1}`,
              exitLandmarkId:
                beat.role === "action"
                  ? `exit-${sceneIndex + 1}`
                  : `focus-${sceneIndex + 1}`,
              facing: isKids
                ? globalIndex % 2
                  ? "left"
                  : "right"
                : "three-quarter",
              gazeTargetId: isKids
                ? shotSubjectId === "lead"
                  ? "support"
                  : "lead"
                : shotSubjectId === "presenter"
                  ? "evidence"
                  : null,
            },
          ],
          transition: {
            kind: secondary
              ? "hard-cut"
              : direction.transition === "brief-dissolve"
                ? "dissolve"
                : direction.transition,
            motivation: secondary
              ? `Cut on the causal pivot to ${humanize(shotPurpose)}.`
              : beatIndex === 0
                ? "Enter a new scene world."
                : `Cut when the ${humanize(beat.role)} becomes readable.`,
          },
          timingEnvelope: {
            earliestCutEventId: exitEventId,
            preferredCutEventId: exitEventId,
            latestCutEventId: exitEventId,
            minimumReadFrames: readFrames,
            minimumDurationFrames: Math.min(
              duration,
              Math.max(grammar.pacing.shotDurationFrames.minimum, duration - 8),
            ),
            preferredDurationFrames: duration,
            maximumDurationFrames: Math.max(
              duration,
              Math.min(
                grammar.pacing.shotDurationFrames.maximum + 30,
                duration + 8,
              ),
            ),
          },
        });
      });
    });
    scenes.push({
      sceneId: scene.id,
      stageId: stage.id,
      geographySummary: `One persistent ${project.grammar === "kids-adventure" ? "performance space" : "editorial stage"}; subjects remain anchored across its cuts.`,
      landmarkIds: stage.landmarks.map((landmark) => landmark.id),
      beatIds: scene.beats.map((beat) => beat.id),
      shotIds,
    });
  });
  return sealDirectorPlan({
    schemaVersion: "1.0",
    id: `director-${project.graph.contentHash.slice(0, 12)}`,
    storyGraphContentHash: project.graph.contentHash,
    planningAuthority: {
      plannerId: proposal.plannerId,
      plannerVersion: proposal.plannerVersion,
    },
    grammarProfileContentHash: grammar.contentHash,
    sceneWorldContentHashes: worlds.map((world) => world.contentHash),
    initialWorldState: worlds[0]!.initialWorldState,
    events,
    beats,
    scenes,
    shots,
    status: "director-plan-ready",
  });
}

function solveTiming(
  plan: ReturnType<typeof buildDirectorPlan>,
  timingBasis: DirectorTimingBasis,
) {
  let cursor = 0;
  const eventFrames = new Map<string, number>();
  const resolvedShots: TimingSolutionDraft["resolvedShots"] = [];
  plan.shots.forEach((shot) => {
    const duration = shot.timingEnvelope.preferredDurationFrames;
    const startFrame = cursor;
    const endFrameExclusive = startFrame + duration;
    const cutFrame =
      endFrameExclusive - 1 - shot.timingEnvelope.minimumReadFrames;
    if (!eventFrames.has(shot.entryEventId))
      eventFrames.set(shot.entryEventId, startFrame + 2);
    eventFrames.set(shot.exitEventId, cutFrame);
    resolvedShots.push({
      shotId: shot.id,
      startFrame,
      endFrameExclusive,
      cutEventId: shot.exitEventId,
    });
    cursor = endFrameExclusive;
  });
  const resolvedEvents = plan.events.map((event) => ({
    eventId: event.id,
    frame: eventFrames.get(event.id)!,
  }));
  return sealTimingSolution(plan, {
    schemaVersion: "1.0",
    directorPlanContentHash: plan.contentHash,
    timingBasis,
    resolvedEvents,
    resolvedShots,
    durationInFrames: cursor,
  });
}

function buildExecutable(
  project: Cv002Project,
  worlds: SceneWorldPlan[],
  plan: ReturnType<typeof buildDirectorPlan>,
  timing: ReturnType<typeof solveTiming>,
  format: DirectorOutputFormat,
) {
  const beats = project.graph.scenes.flatMap((scene) => scene.beats);
  const beatById = new Map(beats.map((beat) => [beat.id, beat]));
  const directionByBeat = new Map(
    project.directionDraft.directions.map((direction) => [
      direction.beatId,
      direction,
    ]),
  );
  const programsByBeat = new Map(
    plan.beats.map((beat) => [
      beat.beatId,
      beat.performanceRequirements.map((requirement) => requirement.id),
    ]),
  );
  const resolvedByShot = new Map(
    timing.resolvedShots.map((shot) => [shot.shotId, shot]),
  );
  const isKids = project.grammar === "kids-adventure";
  const stageKits = worlds.map((world) => ({
    id: world.stages[0]!.id,
    rendererId: "director-proxy-stage",
    layerIds: world.stages[0]!.depthPlanes.map((plane) => plane.id),
    assetIds: [],
  }));
  const executableShots = plan.shots.map((shot) => {
    const resolved = resolvedByShot.get(shot.id)!;
    return {
      id: `executable-${shot.id}`,
      directorShotId: shot.id,
      startFrame: resolved.startFrame,
      endFrameExclusive: resolved.endFrameExclusive,
      cutEventId: resolved.cutEventId,
      stageKitId: shot.stageId,
      treatmentRendererId: "director-proxy-treatment",
      transitionRendererId: shot.transition.kind,
      performanceProgramIds: programsByBeat.get(shot.beatIds[0]!)!,
      layerIds: stageKits.find((stage) => stage.id === shot.stageId)!.layerIds,
    };
  });
  const performancePrograms = plan.beats.flatMap((beat) =>
    beat.performanceRequirements.map((requirement) => {
      if (requirement.source === "proxy")
        throw new Error(
          "Director plans may not request proxy as a creative performance source.",
        );
      const sourceShotIds = plan.shots
        .filter((shot) => shot.beatIds.includes(beat.beatId))
        .map((shot) => shot.id);
      const sourceSceneIds = [
        ...new Set(
          plan.shots
            .filter((shot) => sourceShotIds.includes(shot.id))
            .map((shot) => shot.sceneId),
        ),
      ];
      return sealExecutableProgram({
        id: requirement.id,
        kind: requirement.source,
        rendererId: "director-proxy-performance",
        rendererVersion: "1.0.0",
        entityId: requirement.entityId,
        eventIds: requirement.requiredEventIds,
        assetIds: [],
        manifestContentHash: hashCanonical(requirement),
        sourceSceneIds,
        sourceBeatIds: [beat.beatId],
        sourceShotIds,
      });
    }),
  );
  const proxyStagePrograms = worlds.map((world, sceneIndex) => {
    const sourceScene = plan.scenes.find(
      (scene) => scene.sceneId === world.sceneId,
    )!;
    return sealExecutableProgram({
      id: `proxy-stage-${world.sceneId}`,
      sourceSceneIds: [world.sceneId],
      sourceBeatIds: sourceScene.beatIds,
      sourceShotIds: sourceScene.shotIds,
      rendererId: "director-proxy-stage",
      rendererVersion: "1.0.0",
      stageId: world.stages[0]!.id,
      sceneId: world.sceneId,
      title: project.graph.scenes[sceneIndex]!.beats[0]!.text.slice(0, 72),
      palette: paletteFor(project.grammar, sceneIndex),
      landmarkLabels: world.stages[0]!.landmarks.map((landmark) =>
        humanize(landmark.kind),
      ),
    });
  });
  const proxyCameraPrograms = plan.shots.map((shot, index) => {
    const duration =
      executableShots[index]!.endFrameExclusive -
      executableShots[index]!.startFrame;
    const scale =
      shot.camera.size === "close-up"
        ? 1.22
        : shot.camera.size === "insert"
          ? 1.16
          : shot.camera.size === "medium"
            ? 1.08
            : 1;
    const shift =
      shot.composition.focalRegion === "left-third"
        ? -2
        : shot.composition.focalRegion === "right-third"
          ? 2
          : 0;
    const moving =
      shot.camera.movement === "push" ||
      shot.camera.movement === "reframe" ||
      shot.camera.movement === "track";
    return sealExecutableProgram({
      id: `proxy-camera-${shot.id}`,
      sourceSceneIds: [shot.sceneId],
      sourceBeatIds: shot.beatIds,
      sourceShotIds: [shot.id],
      rendererId: "director-proxy-camera",
      rendererVersion: "1.0.0",
      shotId: shot.id,
      purpose: shot.storyFunction,
      size: shot.camera.size,
      focalRegion: shot.composition.focalRegion,
      movement: shot.camera.movement,
      keyframes: [
        { frame: 0, x: shift, y: 0, scale },
        {
          frame: duration - 1,
          x: moving ? shift * 0.4 : shift,
          y: 0,
          scale: moving ? scale + 0.05 : scale,
        },
      ],
    });
  });
  const proxyEntityPrograms = plan.shots.flatMap((shot, shotIndex) => {
    const duration =
      executableShots[shotIndex]!.endFrameExclusive -
      executableShots[shotIndex]!.startFrame;
    const beat = beatById.get(shot.beatIds[0]!)!;
    const beatPlan = plan.beats.find(
      (candidate) => candidate.beatId === beat.id,
    )!;
    const active =
      shot.camera.subjectIds[0] ??
      beatPlan.performanceRequirements[0]!.entityId;
    const entitySpecs = isKids
      ? [
          {
            id: "lead",
            label: "Lead",
            shape: "person" as const,
            color: "#f26f5f",
            baseX: 0.28,
          },
          {
            id: "support",
            label: "Partner",
            shape: "creature" as const,
            color: "#4f8f8a",
            baseX: 0.68,
          },
        ]
      : [
          {
            id: "presenter",
            label: "Presenter",
            shape: "presenter" as const,
            color: "#ef563f",
            baseX: 0.25,
          },
          {
            id: "evidence",
            label: "Evidence",
            shape: "evidence" as const,
            color: "#f0c868",
            baseX: 0.68,
          },
        ];
    return entitySpecs.map((entity, entityIndex) => {
      const isActive = entity.id === active;
      const actionTravel =
        beat.role === "action" && isActive
          ? entityIndex === 0
            ? 0.1
            : -0.08
          : 0;
      const reactionLift =
        beat.role === "reaction" && isActive ? -0.055 : isActive ? -0.02 : 0;
      return sealExecutableProgram({
        id: `proxy-entity-${shot.id}-${entity.id}`,
        sourceSceneIds: [shot.sceneId],
        sourceBeatIds: shot.beatIds,
        sourceShotIds: [shot.id],
        rendererId: "director-proxy-entity",
        rendererVersion: "1.0.0",
        shotId: shot.id,
        entityId: entity.id,
        appearance: {
          shape: entity.shape,
          label: entity.label,
          color: entity.color,
        },
        keyframes: [
          {
            frame: 0,
            transform: {
              x: entity.baseX,
              y: entity.shape === "evidence" ? 0.48 : 0.72,
              z: entityIndex,
              scale: 1,
              rotation: 0,
            },
            facing: entityIndex === 0 ? ("right" as const) : ("left" as const),
            actionPhase: "anticipation" as const,
          },
          {
            frame: Math.min(
              duration - 2,
              Math.max(
                1,
                Math.round(duration * 0.46) +
                  (isActive ? beatPlan.reactionDelayFrames : 0),
              ),
            ),
            transform: {
              x: entity.baseX + actionTravel * 0.6,
              y: (entity.shape === "evidence" ? 0.48 : 0.72) + reactionLift,
              z: entityIndex,
              scale: isActive ? 1.06 : 0.98,
              rotation: isActive ? (entityIndex === 0 ? -2 : 2) : 0,
            },
            facing: entityIndex === 0 ? ("right" as const) : ("left" as const),
            actionPhase:
              beat.role === "reaction" || beatPlan.reactionDelayFrames > 0
                ? ("reaction" as const)
                : ("action" as const),
          },
          {
            frame: duration - 1,
            transform: {
              x: entity.baseX + actionTravel,
              y: entity.shape === "evidence" ? 0.48 : 0.72,
              z: entityIndex,
              scale: 1,
              rotation: 0,
            },
            facing: entityIndex === 0 ? ("right" as const) : ("left" as const),
            actionPhase: "hold" as const,
          },
        ],
      });
    });
  });
  const proxyCaptionPrograms = plan.shots
    .filter(
      (shot) =>
        plan.shots.find((candidate) => candidate.beatIds[0] === shot.beatIds[0])
          ?.id === shot.id,
    )
    .map((shot) => {
      const beat = beatById.get(shot.beatIds[0]!)!;
      return sealExecutableProgram({
        id: `proxy-caption-${shot.id}`,
        sourceSceneIds: [shot.sceneId],
        sourceBeatIds: shot.beatIds,
        sourceShotIds: [shot.id],
        rendererId: "director-proxy-caption",
        rendererVersion: "1.0.0",
        shotId: shot.id,
        beatId: beat.id,
        text: beat.text,
        emphasis: directionByBeat.get(beat.id)!.textEmphasis,
      });
    });
  const proxyTransitionPrograms = plan.shots.map((shot) =>
    sealExecutableProgram({
      id: `proxy-transition-${shot.id}`,
      sourceSceneIds: [shot.sceneId],
      sourceBeatIds: shot.beatIds,
      sourceShotIds: [shot.id],
      rendererId: "director-proxy-transition",
      rendererVersion: "1.0.0",
      shotId: shot.id,
      kind: shot.transition.kind,
    }),
  );
  const audioCues = plan.beats.flatMap((beat) =>
    beat.sound.effectEventIds.map((eventId, index) => ({
      id: `audio-${beat.beatId.slice(-8)}-${index + 1}`,
      eventId,
      assetId: null,
      gain: 0.65,
    })),
  );
  const draft: ExecutableEpisodePlanDraft = {
    schemaVersion: "1.0",
    id: `episode-${project.graph.contentHash.slice(0, 12)}`,
    renderMode: "proxy-animatic",
    directorPlanContentHash: plan.contentHash,
    timingSolutionContentHash: timing.contentHash,
    grammarProfileContentHash: getGrammarProfile(project.grammar).contentHash,
    registryVersions: {
      stage: "director-alpha-1",
      performance: "director-alpha-1",
      treatment: "director-alpha-1",
      transition: "director-alpha-1",
      audio: "director-alpha-1",
    },
    format: { ...format, durationInFrames: timing.durationInFrames },
    stageKits,
    shots: executableShots,
    performancePrograms,
    approvedAssets: [],
    audioCues,
    proxyStagePrograms,
    proxyCameraPrograms,
    proxyEntityPrograms,
    proxyCaptionPrograms,
    proxyTransitionPrograms,
    resolvedEventFrames: timing.resolvedEvents,
  };
  return sealExecutableEpisodePlan(plan, timing, draft);
}

export function compileDirectorProject(
  input: CompileDirectorProjectInput,
): DirectorProject {
  const storyProject = compileStep("invalid-story-project", () =>
    cv002ProjectSchema.parse(input.storyProject),
  );
  const words = wordCount(storyProject.sourceText);
  if (
    words < directorAlphaInputPolicy.minimumWords ||
    words > directorAlphaInputPolicy.maximumWords
  )
    throw new DirectorCompileError(
      "input-policy-failed",
      `Director Studio Alpha supports scripts from ${directorAlphaInputPolicy.minimumWords} to ${directorAlphaInputPolicy.maximumWords} words. This script has ${words}.`,
    );
  const planner = input.planner ?? new Cv002AlphaDirectorPlanner();
  const proposal = compileStep("planner-output-invalid", () => {
    const result = planner.propose({ storyProject });
    assertProposal(storyProject, result);
    return result;
  });
  const { worlds } = compileStep("scene-world-invalid", () =>
    buildSceneWorlds(storyProject),
  );
  const directorPlan = compileStep("director-plan-invalid", () =>
    buildDirectorPlan(storyProject, proposal, worlds),
  );
  const timingBasis = input.timingBasis ?? {
    kind: "estimated" as const,
    contentHash: hashCanonical({
      storyGraphContentHash: storyProject.graph.contentHash,
      method: "director-alpha-estimate-v1",
    }),
  };
  const timingSolution = compileStep("timing-unsatisfiable", () =>
    solveTiming(directorPlan, timingBasis),
  );
  const executableEpisodePlan = compileStep("executable-plan-invalid", () =>
    buildExecutable(
      storyProject,
      worlds,
      directorPlan,
      timingSolution,
      input.format ?? { width: 1920, height: 1080, fps: 30 },
    ),
  );
  const capabilityReport = compileStep("capability-resolution-failed", () =>
    resolveDirectorCapabilities(
      directorPlan,
      input.capabilities ?? alphaCapabilityRegistry,
    ),
  );
  const qualityReport = analyzeDirectorQuality(
    directorPlan,
    getGrammarProfile(storyProject.grammar),
    timingSolution,
  );
  const draft = {
    schemaVersion: "1.0" as const,
    id: `director-project-${storyProject.graph.contentHash.slice(0, 12)}`,
    storyProjectContentHash: storyProject.contentHash,
    sceneWorlds: worlds,
    directorPlan,
    timingSolution,
    executableEpisodePlan,
    capabilityReport,
    qualityReport,
    revision: input.revision ?? null,
    status: "animatic-ready" as const,
  };
  return sealDirectorProject(draft);
}

/** Operational stages call this deterministic boundary and persist only its
 * returned hashes/diagnostics; the compiler itself owns no mutable state. */
export function tryCompileDirectorProject(
  input: CompileDirectorProjectInput,
): CompileDirectorProjectResult {
  try {
    return { ok: true, directorProject: compileDirectorProject(input) };
  } catch (error) {
    const diagnostic =
      error instanceof DirectorCompileError
        ? { code: error.code, message: error.message }
        : {
            code: "executable-plan-invalid" as const,
            message: error instanceof Error ? error.message : String(error),
          };
    return { ok: false, diagnostics: [diagnostic] };
  }
}
