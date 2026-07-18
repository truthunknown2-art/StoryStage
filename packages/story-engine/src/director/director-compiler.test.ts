import { describe, expect, it } from "vitest";
import { hashCanonical } from "../canonical-hash";
import { createCv002Project } from "../cv002-story-draft";
import {
  compileDirectorProject,
  tryCompileDirectorProject,
} from "./director-compiler";
import {
  createCapabilityRegistry,
  type PerformanceCapabilityDraft,
} from "./capability-report";
import {
  Cv002AlphaDirectorPlanner,
  type DirectorCameraMovement,
  type DirectorPlanner,
  type DirectorProposalDraft,
  type DirectorShotSize,
} from "./director-proposal";
import { proxyCameraProgramSchema } from "./executable-episode-plan";

const sentence =
  "A curious traveler follows a bright clue and pauses when the hidden answer changes everything.";
const script = Array.from(
  { length: 9 },
  (_, index) => `${sentence.slice(0, -1)} ${index + 1}.`,
).join(" ");
const exactWords = (count: number) =>
  Array.from({ length: count }, (_, index) =>
    index % 17 === 16 ? `word${index}.` : `word${index}`,
  ).join(" ");

const cameraSizes = [
  "extreme-wide",
  "wide",
  "medium",
  "close-up",
  "insert",
] as const satisfies readonly DirectorShotSize[];
const cameraMovements = [
  "locked",
  "pan",
  "track",
  "push",
  "pull",
  "reframe",
] as const satisfies readonly DirectorCameraMovement[];

const capabilityFor = (
  requirement: {
    id: string;
    entityId: string;
    source: "atlas-cycle" | "articulated-rig" | "living-hold";
  },
  index: number,
): PerformanceCapabilityDraft => {
  const assetId = `performance-asset-${index}`;
  const common = {
    id: `concrete-capability-${index}`,
    requirementId: requirement.id,
    entityId: requirement.entityId,
    kind: requirement.source,
    rendererId: `renderer-${requirement.source}`,
    rendererVersion: "1.0.0",
    assets: [
      {
        assetId,
        version: "1.0.0",
        contentHash: `${index + 1}`.repeat(64),
        status: "approved" as const,
        relativeFile: `approved/${assetId}.png`,
      },
    ],
  };
  if (requirement.source === "articulated-rig")
    return {
      ...common,
      execution: {
        kind: "articulated-rig",
        assetId,
        sheetWidth: 100,
        sheetHeight: 100,
        displayScale: 1,
        parts: [
          {
            id: "body",
            parentId: null,
            source: { x: 0, y: 0, width: 50, height: 50 },
            pivot: { x: 25, y: 50 },
            joint: { x: 0, y: 0 },
            rotation: 0,
            zIndex: 0,
          },
          {
            id: "arm",
            parentId: "body",
            source: { x: 50, y: 0, width: 50, height: 50 },
            pivot: { x: 5, y: 5 },
            joint: { x: 20, y: 10 },
            rotation: 0,
            zIndex: 1,
          },
        ],
        channels: [
          {
            partId: "arm",
            keyframes: [
              { progress: 0, rotation: 0 },
              { progress: 1, rotation: 30 },
            ],
          },
        ],
      },
    };
  const atlas = {
    assetId,
    atlasWidth: 100,
    atlasHeight: 50,
    frames: [
      {
        source: { x: 0, y: 0, width: 50, height: 50 },
        anchor: { x: 25, y: 50 },
      },
      {
        source: { x: 50, y: 0, width: 50, height: 50 },
        anchor: { x: 25, y: 50 },
      },
    ],
  };
  return requirement.source === "atlas-cycle"
    ? {
        ...common,
        execution: {
          kind: "atlas-cycle",
          ...atlas,
          loop: true,
          rootDistancePerLoop: 100,
          footContactFrameIndices: [0],
        },
      }
    : {
        ...common,
        execution: {
          kind: "living-hold",
          ...atlas,
          poseSequence: [0, 1],
          cycleFrames: 24,
          breathingAmplitude: 0.01,
        },
      };
};

const compileCameraSemantics = (
  size: DirectorShotSize,
  movement: DirectorCameraMovement,
) => {
  const storyProject = createCv002Project(
    "Camera semantics",
    script,
    "kids-adventure",
  );
  const base = compileDirectorProject({ storyProject });
  const targetShot = base.directorPlan.shots[0]!;
  const beatId = targetShot.beatIds[0]!;
  const defaultPlanner = new Cv002AlphaDirectorPlanner();
  const planner: DirectorPlanner = {
    propose(context): DirectorProposalDraft {
      return {
        ...defaultPlanner.propose(context),
        plannerId: "camera-semantics-test",
        shotOverrides: [
          {
            beatId,
            shotId: targetShot.id,
            shotSize: size,
            cameraMovement: movement,
          },
        ],
      };
    },
  };
  const project = compileDirectorProject({ storyProject, planner });
  return project.executableEpisodePlan.proxyCameraPrograms!.find(
    (program) => program.shotId === targetShot.id,
  )!;
};

describe("Director Studio Alpha compiler", () => {
  it("compiles one deterministic canonical project and executable proxy plan", () => {
    const story = createCv002Project(
      "A bright trail",
      script,
      "kids-adventure",
    );
    const first = compileDirectorProject({ storyProject: story });
    const second = compileDirectorProject({ storyProject: story });
    const beatCount = story.graph.scenes.flatMap((scene) => scene.beats).length;

    expect(first.contentHash).toBe(second.contentHash);
    expect(first.directorPlan.planningAuthority).toEqual({
      plannerId: "cv002-alpha-director",
      plannerVersion: "1.0",
    });
    expect(first.directorPlan.beats).toHaveLength(beatCount);
    expect(first.directorPlan.shots).toHaveLength(beatCount + 1);
    expect(first.executableEpisodePlan.renderMode).toBe("proxy-animatic");
    expect(first.executableEpisodePlan.proxyStagePrograms).toHaveLength(
      story.graph.scenes.length,
    );
    expect(first.executableEpisodePlan.proxyCameraPrograms).toHaveLength(
      beatCount + 1,
    );
    expect(first.executableEpisodePlan.proxyEntityPrograms?.length).toBe(
      (beatCount + 1) * 2,
    );
    expect(first.executableEpisodePlan.contentHash).toBe(
      first.executableEpisodePlan.contentHash,
    );
    expect(first.capabilityReport.summary.proxyOnly).toBeGreaterThan(0);
    expect(
      first.directorPlan.beats
        .flatMap((beat) => beat.performanceRequirements)
        .some((requirement) => requirement.source === "proxy"),
    ).toBe(false);
    const multiShotBeat = first.directorPlan.beats.find(
      (beat) =>
        first.directorPlan.shots.filter((shot) =>
          shot.beatIds.includes(beat.beatId),
        ).length === 2,
    )!;
    const multiShots = first.directorPlan.shots.filter((shot) =>
      shot.beatIds.includes(multiShotBeat.beatId),
    );
    const ranges = multiShots.map(
      (shot) =>
        first.timingSolution.resolvedShots.find(
          (resolved) => resolved.shotId === shot.id,
        )!,
    );
    expect(multiShots).toHaveLength(2);
    expect(multiShots[0]!.storyFunction).not.toBe(multiShots[1]!.storyFunction);
    expect(multiShots[0]!.exitEventId).not.toBe(multiShots[1]!.exitEventId);
    expect(ranges[0]!.endFrameExclusive).toBe(ranges[1]!.startFrame);
    expect(
      first.executableEpisodePlan.proxyCaptionPrograms?.filter(
        (caption) => caption.beatId === multiShotBeat.beatId,
      ),
    ).toHaveLength(1);
    const embeddedPrograms = [
      ...(first.executableEpisodePlan.proxyStagePrograms ?? []),
      ...(first.executableEpisodePlan.proxyCameraPrograms ?? []),
      ...(first.executableEpisodePlan.proxyEntityPrograms ?? []),
      ...(first.executableEpisodePlan.proxyCaptionPrograms ?? []),
      ...(first.executableEpisodePlan.proxyTransitionPrograms ?? []),
    ];
    expect(
      embeddedPrograms.every(
        (program) =>
          program.contentHash.length === 64 && program.sourceBeatIds.length > 0,
      ),
    ).toBe(true);
  });

  it("directs Kids Adventure and Weird History with different grammars", () => {
    const kids = compileDirectorProject({
      storyProject: createCv002Project("Kids", script, "kids-adventure"),
    });
    const history = compileDirectorProject({
      storyProject: createCv002Project("History", script, "weird-history"),
    });

    expect(kids.directorPlan.grammarProfileContentHash).not.toBe(
      history.directorPlan.grammarProfileContentHash,
    );
    expect(
      kids.directorPlan.shots.map((shot) => shot.storyFunction),
    ).not.toEqual(history.directorPlan.shots.map((shot) => shot.storyFunction));
    expect(
      kids.directorPlan.beats
        .flatMap((beat) => beat.performanceRequirements)
        .map((requirement) => requirement.source),
    ).not.toEqual(
      history.directorPlan.beats
        .flatMap((beat) => beat.performanceRequirements)
        .map((requirement) => requirement.source),
    );
    expect(kids.timingSolution.durationInFrames).toBeGreaterThan(
      history.timingSolution.durationInFrames,
    );
    expect(
      kids.directorPlan.beats.some(
        (beat) =>
          kids.directorPlan.shots.filter((shot) =>
            shot.beatIds.includes(beat.beatId),
          ).length === 2,
      ),
    ).toBe(true);
    expect(
      history.directorPlan.beats.some(
        (beat) =>
          history.directorPlan.shots.filter((shot) =>
            shot.beatIds.includes(beat.beatId),
          ).length === 2,
      ),
    ).toBe(true);
  });

  it("embeds exact concrete performance programs while leaving every unmatched beat honestly proxy-only", () => {
    const capabilityScript = [
      "A curious traveler studies a bright trail beside the quiet forest before sunrise.",
      "She ran across the clearing, jumped over a stream, and carried the glowing map toward the old gate.",
      "She discovers the secret marker and reveals that the hidden road circles back toward their village.",
      ...Array.from(
        { length: 6 },
        (_, index) =>
          `The patient guide explains why the marker was important to their careful search and what the friends learned from clue ${index + 1}.`,
      ),
    ].join(" ");
    const story = createCv002Project(
      "Capability boundary",
      capabilityScript,
      "kids-adventure",
    );
    const proxy = compileDirectorProject({ storyProject: story });
    const supportedKinds = [
      "living-hold",
      "atlas-cycle",
      "articulated-rig",
    ] as const;
    const targets = supportedKinds.map(
      (kind) =>
        proxy.directorPlan.beats
          .flatMap((beat) => beat.performanceRequirements)
          .find((requirement) => requirement.source === kind)!,
    );
    expect(targets.every(Boolean)).toBe(true);
    const registry = createCapabilityRegistry({
      version: "test-concrete-performance-v1",
      capabilities: targets.map((target, index) =>
        capabilityFor(
          target as typeof target & {
            source: (typeof supportedKinds)[number];
          },
          index,
        ),
      ),
    });
    const compiled = compileDirectorProject({
      storyProject: story,
      capabilities: registry,
    });
    const supported = compiled.executableEpisodePlan.performancePrograms.filter(
      (program) => program.execution,
    );
    const proxyOnly = compiled.executableEpisodePlan.performancePrograms.filter(
      (program) => !program.execution,
    );

    expect(compiled.capabilityReport.summary.supported).toBe(3);
    expect(compiled.capabilityReport.summary.proxyOnly).toBe(proxyOnly.length);
    expect(supported.map((program) => program.kind).sort()).toEqual(
      [...supportedKinds].sort(),
    );
    expect(
      supported.every(
        (program) =>
          program.assetIds.length > 0 &&
          program.rendererId !== "director-proxy-performance" &&
          program.sourceShotIds?.length,
      ),
    ).toBe(true);
    expect(
      proxyOnly.every(
        (program) =>
          program.assetIds.length === 0 &&
          program.rendererId === "director-proxy-performance",
      ),
    ).toBe(true);
    expect(compiled.executableEpisodePlan.approvedAssets).toHaveLength(3);
  });

  it("compiles every exposed shot size to a distinct renderer-consumed scale", () => {
    const programs = cameraSizes.map((size) =>
      compileCameraSemantics(size, "locked"),
    );
    const scales = programs.map((program) => program.keyframes[0]!.scale);

    expect(new Set(scales).size).toBe(cameraSizes.length);
    expect(scales).toEqual([...scales].sort((left, right) => left - right));
    programs.forEach((program) => {
      expect(
        program.keyframes.every(
          (keyframe) => keyframe.scale === program.keyframes[0]!.scale,
        ),
      ).toBe(true);
    });
  });

  it("compiles every exposed camera movement to truthful, non-collapsing keyframes", () => {
    const programs = new Map(
      cameraMovements.map((movement) => [
        movement,
        compileCameraSemantics("medium", movement),
      ]),
    );
    const values = (movement: DirectorCameraMovement) =>
      programs
        .get(movement)!
        .keyframes.map(({ x, y, scale }) => ({ x, y, scale }));
    const changes = (
      movement: DirectorCameraMovement,
      key: "x" | "y" | "scale",
    ) => new Set(values(movement).map((value) => value[key])).size > 1;

    expect(changes("locked", "x")).toBe(false);
    expect(changes("locked", "y")).toBe(false);
    expect(changes("locked", "scale")).toBe(false);

    expect(changes("pan", "x")).toBe(true);
    expect(changes("pan", "y")).toBe(false);
    expect(changes("pan", "scale")).toBe(false);

    expect(changes("track", "x") || changes("track", "y")).toBe(true);
    expect(changes("track", "scale")).toBe(false);

    expect(changes("push", "x")).toBe(false);
    expect(changes("push", "y")).toBe(false);
    expect(values("push").at(-1)!.scale).toBeGreaterThan(
      values("push")[0]!.scale,
    );

    expect(changes("pull", "x")).toBe(false);
    expect(changes("pull", "y")).toBe(false);
    expect(values("pull").at(-1)!.scale).toBeLessThan(values("pull")[0]!.scale);

    expect(changes("reframe", "x") || changes("reframe", "y")).toBe(true);
    expect(changes("reframe", "scale")).toBe(false);

    expect(
      new Set(
        cameraMovements.map((movement) => JSON.stringify(values(movement))),
      ).size,
    ).toBe(cameraMovements.length);
  });

  it("rejects camera programs whose movement label is not executed by keyframes", () => {
    cameraMovements.forEach((movement) => {
      const valid = compileCameraSemantics("medium", movement);
      const draft = Object.fromEntries(
        Object.entries(valid).filter(([key]) => key !== "contentHash"),
      ) as Omit<typeof valid, "contentHash">;
      const first = draft.keyframes[0]!;
      const dishonestKeyframes =
        movement === "locked"
          ? draft.keyframes.map((keyframe, index) => ({
              ...keyframe,
              x: first.x + index,
            }))
          : draft.keyframes.map((keyframe) => ({
              ...keyframe,
              x: first.x,
              y: first.y,
              scale: first.scale,
            }));
      const dishonestDraft = { ...draft, keyframes: dishonestKeyframes };

      expect(
        proxyCameraProgramSchema.safeParse({
          ...dishonestDraft,
          contentHash: hashCanonical(dishonestDraft),
        }).success,
        movement,
      ).toBe(false);
    });
  });

  it("enforces the Director Studio 100 to 300 word contract", () => {
    expect(() =>
      compileDirectorProject({
        storyProject: createCv002Project(
          "Short",
          exactWords(99),
          "kids-adventure",
        ),
      }),
    ).toThrow(/100 to 300/);
    expect(() =>
      compileDirectorProject({
        storyProject: createCv002Project(
          "Minimum",
          exactWords(100),
          "kids-adventure",
        ),
      }),
    ).not.toThrow();
    expect(() =>
      compileDirectorProject({
        storyProject: createCv002Project(
          "Maximum",
          exactWords(300),
          "weird-history",
        ),
      }),
    ).not.toThrow();
    expect(() =>
      compileDirectorProject({
        storyProject: createCv002Project(
          "Long",
          exactWords(301),
          "weird-history",
        ),
      }),
    ).toThrow(/100 to 300/);
  });

  it("offers deterministic typed diagnostics for the DSA-002 stage shell", () => {
    const input = {
      storyProject: createCv002Project(
        "Short",
        exactWords(99),
        "kids-adventure" as const,
      ),
    };

    const first = tryCompileDirectorProject(input);
    const repeated = tryCompileDirectorProject(input);

    expect(first).toEqual(repeated);
    expect(first).toEqual({
      ok: false,
      diagnostics: [
        {
          code: "input-policy-failed",
          message:
            "Director Studio Alpha supports scripts from 100 to 300 words. This script has 99.",
        },
      ],
    });
  });
});
