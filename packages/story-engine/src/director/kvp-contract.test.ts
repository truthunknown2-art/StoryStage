import { describe, expect, it } from "vitest";
import { hashCanonical } from "../canonical-hash";
import { createCv002Project } from "../cv002-story-draft";
import { createCv002ArtDirectionSelection } from "../cv002-art-direction";
import {
  articulatedCharacterRigManifestSchema,
  type ArticulatedCharacterRigManifest,
} from "../rig-manifests";
import {
  createCapabilityRegistry,
  type PerformanceCapabilityDraft,
} from "./capability-report";
import { compileDirectorProject } from "./director-compiler";
import { evaluateContinuityFrame } from "./continuity-frame-evaluator";
import {
  isLocalPartsV1Execution,
  listArticulatedRigAssetReferences,
  performanceProgramSchema,
  sealExecutableEpisodePlan,
} from "./executable-episode-plan";
import {
  createKvp001ProofFixture,
  KVP001_PROOF_LIMITATION,
} from "./kvp001-proof-fixture";

const rigAsset = (candidateId: string) => {
  const contentHash = hashCanonical(candidateId);
  return {
    candidateId,
    fileRole: `${candidateId}.png`,
    contentHash,
    relativeFile: `approved/${contentHash}/${candidateId}.png`,
    width: 256,
    height: 256,
    registration: {
      anchorX: 0.5,
      anchorY: 0.5,
      pivotX: 128,
      pivotY: 128,
      groundY: 240,
    },
  };
};

const localPartsManifest = (
  requirementId: string,
  entityId: string,
): ArticulatedCharacterRigManifest => {
  const draft = {
    schemaVersion: "1.0" as const,
    manifestId: "manifest-kvp-lead",
    candidateSetId: "candidate-set-kvp-lead",
    briefId: "brief-kvp-lead",
    requirementId,
    entityId,
    entityName: "Lead",
    createdAt: "2026-07-18T20:00:00.000Z",
    type: "character-rig" as const,
    animationMode: "articulated-2d" as const,
    identityReference: rigAsset("lead-identity"),
    renderer: { id: "local-parts-renderer", version: "1.0.0" },
    template: { id: "kids-biped", version: "1.0.0" },
    parts: [
      {
        id: "torso",
        parentId: null,
        asset: rigAsset("lead-torso"),
        bounds: { x: 32, y: 24, width: 192, height: 216 },
        pivot: { x: 128, y: 144 },
        sockets: [{ id: "neck", position: { x: 128, y: 48 } }],
      },
      {
        id: "head",
        parentId: "torso",
        asset: rigAsset("lead-head"),
        bounds: { x: 40, y: 24, width: 176, height: 176 },
        pivot: { x: 128, y: 160 },
        sockets: [{ id: "mouth", position: { x: 128, y: 132 } }],
      },
    ],
    exposures: [
      {
        id: "mouth-rest",
        partId: "head",
        asset: rigAsset("lead-mouth-rest"),
      },
      {
        id: "mouth-open",
        partId: "head",
        asset: rigAsset("lead-mouth-open"),
      },
    ],
    visemeIds: ["rest", "open"],
    visemeMappings: [
      { visemeId: "rest", exposureId: "mouth-rest" },
      { visemeId: "open", exposureId: "mouth-open" },
    ],
  };
  return articulatedCharacterRigManifestSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
};

const capabilityFixture = () => {
  const { storyProject, planner } = createKvp001ProofFixture();
  const proxy = compileDirectorProject({ storyProject, planner });
  const firstBeat = proxy.directorPlan.beats[0]!;
  const requirement = firstBeat.performanceRequirements[0]!;
  expect(requirement.source).toBe("articulated-rig");
  const manifest = localPartsManifest(requirement.id, requirement.entityId);
  const references = listArticulatedRigAssetReferences(manifest);
  const capability: PerformanceCapabilityDraft = {
    id: "capability-kvp-lead",
    requirementId: requirement.id,
    entityId: requirement.entityId,
    kind: "articulated-rig",
    rendererId: manifest.renderer.id,
    rendererVersion: manifest.renderer.version,
    assets: references.map((reference) => ({
      assetId: reference.candidateId,
      version: "1.0.0",
      contentHash: reference.contentHash,
      status: "approved" as const,
      relativeFile: reference.relativeFile,
      byteLength: 1024,
      immutableLocationId: `sha256:${reference.contentHash}` as const,
    })),
    execution: {
      kind: "articulated-rig",
      mode: "local-parts-v1",
      assetId: manifest.identityReference.candidateId,
      displayScale: 1,
      rigManifest: manifest,
    },
  };
  return { storyProject, planner, requirement, manifest, capability };
};

describe("KVP-001 local-parts-v1 execution contract", () => {
  it("binds the exact 140-frame first shot to one sealed local-parts program", () => {
    const fixture = capabilityFixture();
    const registry = createCapabilityRegistry({
      version: "kvp-local-parts-v1",
      capabilities: [fixture.capability],
    });
    const project = compileDirectorProject({
      storyProject: fixture.storyProject,
      planner: fixture.planner,
      capabilities: registry,
    });
    const repeated = compileDirectorProject({
      storyProject: fixture.storyProject,
      planner: fixture.planner,
      capabilities: registry,
    });
    const firstShot = project.executableEpisodePlan.shots[0]!;
    const program = project.executableEpisodePlan.performancePrograms.find(
      (candidate) => candidate.id === fixture.requirement.id,
    )!;

    expect(firstShot).toMatchObject({
      startFrame: 0,
      endFrameExclusive: 140,
      performanceProgramIds: [fixture.requirement.id],
    });
    expect(program.sourceShotIds).toEqual([firstShot.directorShotId]);
    expect(program.entityId).toBe(fixture.manifest.entityId);
    expect(program.rendererId).toBe(fixture.manifest.renderer.id);
    expect(program.rendererVersion).toBe(fixture.manifest.renderer.version);
    expect(program.manifestContentHash).toBe(fixture.manifest.contentHash);
    expect(program.capabilityContentHash).toBe(
      registry.capabilities[0]!.contentHash,
    );
    expect(
      program.execution && isLocalPartsV1Execution(program.execution),
    ).toBe(true);
    const boundSegments =
      project.executableEpisodePlan.continuitySequencePlan.shots[0]!.performanceSegments.filter(
        (segment) => segment.entityId === fixture.requirement.entityId,
      );
    expect(boundSegments[0]!.startFrame).toBe(0);
    expect(boundSegments.at(-1)!.endFrameExclusive).toBe(140);
    expect(
      boundSegments.every(
        (segment, index) =>
          segment.performanceProgramId === fixture.requirement.id &&
          segment.performanceProgramContentHash === program.contentHash &&
          (index === 0 ||
            boundSegments[index - 1]!.endFrameExclusive === segment.startFrame),
      ),
    ).toBe(true);
    expect(project.contentHash).toBe(repeated.contentHash);
    expect(project.executableEpisodePlan.contentHash).toBe(
      repeated.executableEpisodePlan.contentHash,
    );
    expect(
      boundSegments.map((segment) => ({
        startFrame: segment.startFrame,
        endFrameExclusive: segment.endFrameExclusive,
        motionMode: segment.motionMode,
        actionPhase: segment.actionPhase,
        gaitStart: segment.gaitStart,
        gaitAdvanceCycles: segment.gaitAdvanceCycles,
      })),
    ).toEqual([
      {
        startFrame: 0,
        endFrameExclusive: 72,
        motionMode: "running",
        actionPhase: "action",
        gaitStart: 0,
        gaitAdvanceCycles: 6,
      },
      {
        startFrame: 72,
        endFrameExclusive: 102,
        motionMode: "decelerating",
        actionPhase: "action",
        gaitStart: 0,
        gaitAdvanceCycles: 2.5,
      },
      {
        startFrame: 102,
        endFrameExclusive: 110,
        motionMode: "idle",
        actionPhase: "impact",
        gaitStart: null,
        gaitAdvanceCycles: null,
      },
      {
        startFrame: 110,
        endFrameExclusive: 140,
        motionMode: "idle",
        actionPhase: "settle",
        gaitStart: null,
        gaitAdvanceCycles: null,
      },
    ]);
    const continuityShot =
      project.executableEpisodePlan.continuitySequencePlan.shots[0]!;
    expect(
      continuityShot.pictureEvents
        .filter((event) => event.source === "performance-event")
        .map((event) => ({ frame: event.frame, kind: event.kind })),
    ).toEqual([
      { frame: 72, kind: "deceleration" },
      { frame: 102, kind: "plant" },
    ]);
    const destination = evaluateContinuityFrame(
      project.executableEpisodePlan,
      102,
    ).entities[fixture.requirement.entityId]!;
    const held = evaluateContinuityFrame(project.executableEpisodePlan, 139)
      .entities[fixture.requirement.entityId]!;
    expect(destination.rootTransform).toEqual(held.rootTransform);
    expect(destination.motionMode).toBe("idle");
    expect(destination.actionPhase).toBe("impact");
    expect(held.actionPhase).toBe("settle");
    expect(held.velocity).toEqual({ x: 0, y: 0, z: 0 });
    expect(
      project.executableEpisodePlan.continuitySequencePlan.visemePrograms,
    ).toContainEqual(
      expect.objectContaining({
        shotId: firstShot.directorShotId,
        entityId: fixture.requirement.entityId,
        sourceLineId: project.directorPlan.beats[0]!.beatId,
        cues: [
          { startFrame: 61, endFrameExclusive: 67, visemeId: "open" },
          { startFrame: 67, endFrameExclusive: 73, visemeId: "rest" },
          { startFrame: 73, endFrameExclusive: 79, visemeId: "open" },
        ],
      }),
    );
    expect(KVP001_PROOF_LIMITATION).toMatch(/does not claim/i);
  });

  it("keeps ordinary reaction scripts stationary without an authored directive", () => {
    const sentence =
      "Mara gasped when the silver lantern flashed, then watched her friend carefully while the quiet garden answered.";
    const storyProject = createCv002Project(
      "Ordinary reaction smoke",
      Array.from({ length: 8 }, (_, index) => `${sentence} ${index + 1}.`).join(
        " ",
      ),
      "kids-adventure",
      createCv002ArtDirectionSelection(
        "kids-adventure",
        "cut-paper-collage-mixed-media",
      ),
    );
    const project = compileDirectorProject({ storyProject });
    expect(
      project.directorPlan.shots.every((shot) =>
        shot.blocking.every((blocking) => blocking.locomotion === undefined),
      ),
    ).toBe(true);
    const articulated = project.executableEpisodePlan.performancePrograms.find(
      (program) => program.kind === "articulated-rig",
    )!;
    const sourceShots = new Set(articulated.sourceShotIds);
    const segments = project.executableEpisodePlan.continuitySequencePlan.shots
      .filter((shot) => sourceShots.has(shot.shotId))
      .flatMap((shot) =>
        shot.performanceSegments.filter(
          (segment) => segment.entityId === articulated.entityId,
        ),
      );
    expect(segments.length).toBeGreaterThan(0);
    expect(
      segments.every(
        (segment) =>
          !["running", "walking", "sneaking", "decelerating"].includes(
            segment.motionMode,
          ) && segment.gaitStart === null,
      ),
    ).toBe(true);
  });

  it.each([
    [
      "entity",
      (draft: PerformanceCapabilityDraft) => void (draft.entityId = "support"),
    ],
    [
      "renderer",
      (draft: PerformanceCapabilityDraft) =>
        void (draft.rendererVersion = "2.0.0"),
    ],
    [
      "stale manifest",
      (draft: PerformanceCapabilityDraft) => {
        if (!isLocalPartsV1Execution(draft.execution))
          throw new Error("fixture");
        draft.execution.rigManifest.contentHash = "f".repeat(64);
      },
    ],
    [
      "asset",
      (draft: PerformanceCapabilityDraft) => {
        const asset = draft.assets[1]!;
        asset.contentHash = "e".repeat(64);
        asset.relativeFile = `approved/${asset.contentHash}/stale.png`;
        asset.immutableLocationId = `sha256:${asset.contentHash}`;
      },
    ],
  ])("rejects a %s mismatch at the capability boundary", (_label, mutate) => {
    const { capability } = capabilityFixture();
    const invalid = structuredClone(capability);
    mutate(invalid);
    expect(() =>
      createCapabilityRegistry({
        version: "kvp-invalid",
        capabilities: [invalid],
      }),
    ).toThrow();
  });

  it("rejects an episode whose approved asset no longer matches the sealed rig", () => {
    const fixture = capabilityFixture();
    const registry = createCapabilityRegistry({
      version: "kvp-episode-assets",
      capabilities: [fixture.capability],
    });
    const project = compileDirectorProject({
      storyProject: fixture.storyProject,
      planner: fixture.planner,
      capabilities: registry,
    });
    const { contentHash: _episodeHash, ...draft } = structuredClone(
      project.executableEpisodePlan,
    );
    void _episodeHash;
    const approved = draft.approvedAssets[1]!;
    approved.contentHash = "d".repeat(64);
    approved.relativeFile = `approved/${approved.contentHash}/stale.png`;
    approved.immutableLocationId = `sha256:${approved.contentHash}`;

    expect(() =>
      sealExecutableEpisodePlan(
        project.directorPlan,
        project.timingSolution,
        draft,
      ),
    ).toThrow(/exact approved immutable rig assets/i);
  });

  it("rejects a forged local-parts program outside its rig requirement", () => {
    const fixture = capabilityFixture();
    const registry = createCapabilityRegistry({
      version: "kvp-program-requirement",
      capabilities: [fixture.capability],
    });
    const project = compileDirectorProject({
      storyProject: fixture.storyProject,
      planner: fixture.planner,
      capabilities: registry,
    });
    const canonical = project.executableEpisodePlan.performancePrograms.find(
      (candidate) => candidate.id === fixture.requirement.id,
    )!;
    const { contentHash: _contentHash, ...draft } = structuredClone(canonical);
    void _contentHash;
    const forged = {
      ...draft,
      id: "performance-forged",
    };

    expect(() =>
      performanceProgramSchema.parse({
        ...forged,
        contentHash: hashCanonical(forged),
      }),
    ).toThrow(/program ID does not match its sealed rig requirement/i);
  });
});
