import { describe, expect, it } from "vitest";
import { hashCanonical } from "../canonical-hash";
import {
  continuitySequencePlanDraftSchema,
  sealContinuitySequencePlan,
  type ContinuitySequencePlanDraft,
} from "./continuity-sequence-plan";

const hash = hashCanonical("continuity-fixture");

const cameraProgram = (
  shotId: string,
  focalRegion: "left-third" | "center" | "right-third",
  x: number,
) => {
  const program = {
    id: `proxy-camera-${shotId}`,
    focalRegion,
    keyframes: [
      { frame: 0, x, y: 0, scale: 1 },
      { frame: 29, x: x + 4, y: 0, scale: 1 },
    ],
  };
  return { ...program, contentHash: hashCanonical(program) };
};

const transitionProgram = (
  shotId: string,
  kind: "hard-cut" | "camera-carry",
) => {
  const program = {
    id: `proxy-transition-${shotId}`,
    kind,
    progressKeyframes: [
      { frame: 0, progress: 1 },
      { frame: 1, progress: 1 },
    ],
    occluderId: null,
  };
  return { ...program, contentHash: hashCanonical(program) };
};

const entity = (entityId: string, x: number) => ({
  entityId,
  lifecycle: "onstage" as const,
  transform: { x, y: 0.72, z: 0, scale: 1, rotation: 0 },
  facing: entityId === "lead" ? ("right" as const) : ("left" as const),
  gazeTargetId: entityId === "lead" ? "support" : "lead",
  velocity: { x: 0, y: 0, z: 0 },
});

const world = (frame: number, leadX: number) => ({
  frame,
  entities: {
    lead: entity("lead", leadX),
    support: entity("support", 0.7),
  },
  props: {
    lantern: {
      kind: "attached" as const,
      ownerId: "lead",
      socketId: "right-hand",
    },
  },
});

const performance = (
  leadMotion: "idle" | "running",
  leadPhase: "hold" | "action",
  gaitPhase: number | null,
) => [
  {
    entityId: "lead",
    motionMode: leadMotion,
    actionPhase: leadPhase,
    gaitPhase,
    performanceProgramId: "lead-run",
    performanceProgramContentHash: hash,
  },
  {
    entityId: "support",
    motionMode: "idle" as const,
    actionPhase: "hold" as const,
    gaitPhase: null,
    performanceProgramId: "support-hold",
    performanceProgramContentHash: hash,
  },
];

const performanceSegments = (
  startFrame: number,
  endFrameExclusive: number,
  gaitStart: number,
  gaitAdvanceCycles: number,
) => [
  {
    entityId: "lead",
    startFrame,
    endFrameExclusive,
    motionMode: "running" as const,
    actionPhase: "action" as const,
    gaitStart,
    gaitAdvanceCycles,
    performanceProgramId: "lead-run",
    performanceProgramContentHash: hash,
  },
  {
    entityId: "support",
    startFrame,
    endFrameExclusive,
    motionMode: "idle" as const,
    actionPhase: "hold" as const,
    gaitStart: null,
    gaitAdvanceCycles: null,
    performanceProgramId: "support-hold",
    performanceProgramContentHash: hash,
  },
];

const draft = (): ContinuitySequencePlanDraft => ({
  schemaVersion: "1.0",
  directorPlanContentHash: hash,
  timingSolutionContentHash: hash,
  sceneWorldContentHashes: [hash],
  fps: 30,
  durationInFrames: 60,
  shots: [
    {
      shotId: "shot-one",
      sceneId: "scene-one",
      stageId: "forest-stage",
      beatIds: ["beat-one"],
      startFrame: 0,
      endFrameExclusive: 30,
      cutEventId: "cut-one",
      camera: {
        axisId: "forest-axis",
        size: "wide",
        angle: "profile",
        movement: "track",
        subjectIds: ["lead", "support"],
        motivation: "Carry the run without losing geography.",
        screenProjection: { worldXDirection: 1, worldXOffset: 0 },
      },
      cameraProgram: cameraProgram("shot-one", "left-third", -4),
      transitionProgram: transitionProgram("shot-one", "hard-cut"),
      entryWorldState: world(0, 0.25),
      exitWorldState: world(29, 0.4),
      entryPerformanceState: performance("idle", "hold", null),
      exitPerformanceState: performance("running", "action", 0.25),
      performanceSegments: performanceSegments(0, 30, 0, 0.25),
      pictureEvents: [
        {
          source: "director-event",
          eventId: "cut-one",
          frame: 24,
          subjectIds: ["lead"],
        },
      ],
    },
    {
      shotId: "shot-two",
      sceneId: "scene-one",
      stageId: "forest-stage",
      beatIds: ["beat-one", "beat-two"],
      startFrame: 30,
      endFrameExclusive: 60,
      cutEventId: "cut-two",
      camera: {
        axisId: "forest-axis",
        size: "medium",
        angle: "profile",
        movement: "track",
        subjectIds: ["lead", "support"],
        motivation: "Stay with the run through the reaction.",
        screenProjection: { worldXDirection: 1, worldXOffset: 0 },
      },
      cameraProgram: cameraProgram("shot-two", "center", 0),
      transitionProgram: transitionProgram("shot-two", "camera-carry"),
      entryWorldState: world(30, 0.4),
      exitWorldState: world(59, 0.55),
      entryPerformanceState: performance("running", "action", 0.25),
      exitPerformanceState: performance("running", "action", 0.75),
      performanceSegments: performanceSegments(30, 60, 0.25, 0.5),
      pictureEvents: [
        {
          source: "director-event",
          eventId: "cut-two",
          frame: 54,
          subjectIds: ["lead", "support"],
        },
      ],
    },
  ],
  transitions: [
    {
      fromShotId: "shot-one",
      toShotId: "shot-two",
      cutEventId: "cut-one",
      kind: "camera-carry",
      motivation: "Preserve the running action across the cut.",
      bridgeKind: "none",
      bridgeEventId: null,
    },
  ],
  visemePrograms: [],
});

describe("ContinuitySequencePlan", () => {
  it("seals inherited world, action, gait, prop, and camera-relative state", () => {
    const plan = sealContinuitySequencePlan(draft());
    expect(plan.contentHash).toHaveLength(64);
    expect(plan.shots[1]?.entryWorldState.entities.lead?.transform.x).toBe(0.4);
  });

  it("rejects teleporting at a cut", () => {
    const invalid = draft();
    invalid.shots[1]!.entryWorldState.entities.lead!.transform.x = 0.62;
    expect(() => continuitySequencePlanDraftSchema.parse(invalid)).toThrow(
      /changes canonical world state/,
    );
  });

  it("rejects camera-relative screen-order reversal", () => {
    const invalid = draft();
    invalid.shots[1]!.camera.screenProjection.worldXDirection = -1;
    expect(() => continuitySequencePlanDraftSchema.parse(invalid)).toThrow(
      /reverse camera-relative screen order/,
    );
  });

  it("rejects a broken gait phase", () => {
    const invalid = draft();
    invalid.shots[1]!.entryPerformanceState[0]!.gaitPhase = 0.8;
    expect(() => continuitySequencePlanDraftSchema.parse(invalid)).toThrow(
      /breaks gait contact/,
    );
  });

  it("rejects an ownership jump across a cut", () => {
    const invalid = draft();
    const lantern = invalid.shots[1]!.entryWorldState.props.lantern;
    if (lantern?.kind !== "attached") throw new Error("fixture prop missing");
    lantern.ownerId = "support";
    expect(() => continuitySequencePlanDraftSchema.parse(invalid)).toThrow(
      /changes ownership across/,
    );
  });

  it("rejects a stage or axis change without an explicit bridge", () => {
    const invalid = draft();
    invalid.shots[1]!.camera.axisId = "reverse-axis";
    expect(() => continuitySequencePlanDraftSchema.parse(invalid)).toThrow(
      /without an explicit continuity bridge/,
    );
  });

  it("does not let an axis reset authorize canonical world teleporting", () => {
    const invalid = draft();
    invalid.shots[1]!.camera.axisId = "reverse-axis";
    invalid.transitions[0]!.bridgeKind = "axis-reset-event";
    invalid.transitions[0]!.bridgeEventId = "cut-two";
    invalid.shots[1]!.entryWorldState.entities.lead!.transform.x = 0.62;
    expect(() => continuitySequencePlanDraftSchema.parse(invalid)).toThrow(
      /changes canonical world state/,
    );
  });

  it("rejects an entity disappearing across a cut without a boundary lifecycle event", () => {
    const invalid = draft();
    delete invalid.shots[1]!.entryWorldState.entities.support;
    delete invalid.shots[1]!.exitWorldState.entities.support;
    invalid.shots[1]!.entryPerformanceState =
      invalid.shots[1]!.entryPerformanceState.filter(
        (state) => state.entityId !== "support",
      );
    invalid.shots[1]!.exitPerformanceState =
      invalid.shots[1]!.exitPerformanceState.filter(
        (state) => state.entityId !== "support",
      );
    expect(() => continuitySequencePlanDraftSchema.parse(invalid)).toThrow(
      /changes membership.*without an exact boundary lifecycle event/,
    );
  });

  it("binds bridge kind and event ID to the exact Director boundary", async () => {
    const { createCv002Project } = await import("../cv002-story-draft");
    const { createCv002ArtDirectionSelection } =
      await import("../cv002-art-direction");
    const { compileDirectorProject } = await import("./director-compiler");
    const { assertContinuitySequenceMatchesSources } =
      await import("./continuity-compiler");
    const sentence =
      "A curious traveler follows the bright trail, watches her friend, and carefully carries the lantern toward the old forest gate.";
    const script = Array.from(
      { length: 9 },
      (_, index) => `${sentence} ${index + 1}.`,
    ).join(" ");
    const project = compileDirectorProject({
      storyProject: createCv002Project(
        "Bridge authority",
        script,
        "kids-adventure",
        createCv002ArtDirectionSelection(
          "kids-adventure",
          "cut-paper-collage-mixed-media",
        ),
      ),
    });
    const { contentHash, ...continuityDraft } = structuredClone(
      project.executableEpisodePlan.continuitySequencePlan,
    );
    expect(contentHash).toHaveLength(64);
    continuityDraft.transitions[0]!.bridgeKind = "axis-reset-event";
    continuityDraft.transitions[0]!.bridgeEventId =
      project.directorPlan.shots[1]!.entryEventId;
    const inventedBridge = sealContinuitySequencePlan(continuityDraft);
    const bindings = project.executableEpisodePlan.performancePrograms.map(
      (program) => ({
        id: program.id,
        entityId: program.entityId,
        kind: program.kind,
        contentHash: program.contentHash!,
        sourceShotIds: program.sourceShotIds!,
      }),
    );

    expect(() =>
      assertContinuitySequenceMatchesSources(
        project.directorPlan,
        project.timingSolution,
        inventedBridge,
        bindings,
      ),
    ).toThrow(/does not match the Director shot boundary/);

    const movedVisemeDraft = structuredClone(
      project.executableEpisodePlan.continuitySequencePlan,
    );
    Reflect.deleteProperty(movedVisemeDraft, "contentHash");
    const viseme = movedVisemeDraft.visemePrograms[0]!;
    viseme.cues[0]!.startFrame += 1;
    const visemeDraft = structuredClone(viseme);
    Reflect.deleteProperty(visemeDraft, "contentHash");
    viseme.contentHash = hashCanonical(visemeDraft);
    const movedVisemes = sealContinuitySequencePlan(movedVisemeDraft);
    expect(() =>
      assertContinuitySequenceMatchesSources(
        project.directorPlan,
        project.timingSolution,
        movedVisemes,
        bindings,
      ),
    ).toThrow(/compiler-owned timing/);
  });

  it("rejects locomotion that stops without deceleration and a plant", () => {
    const invalid = draft();
    invalid.shots[1]!.exitPerformanceState[0] = {
      ...invalid.shots[1]!.exitPerformanceState[0]!,
      motionMode: "idle",
      actionPhase: "hold",
      gaitPhase: null,
    };
    expect(() => continuitySequencePlanDraftSchema.parse(invalid)).toThrow(
      /without named deceleration and plant events/,
    );
  });
});
