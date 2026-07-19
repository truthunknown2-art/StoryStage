import { z } from "zod";
import { hashCanonical } from "../canonical-hash";
import { hashSchema, identifierSchema } from "../model";
import { assertContinuitySequenceMatchesSources } from "./continuity-compiler";
import { continuitySequencePlanSchema } from "./continuity-sequence-plan";
import { directorPlanSchema, type DirectorPlan } from "./director-plan";
import { timingSolutionSchema, type TimingSolution } from "./timing-solution";

const executableShotSchema = z
  .object({
    id: identifierSchema,
    directorShotId: identifierSchema,
    startFrame: z.number().int().nonnegative(),
    endFrameExclusive: z.number().int().positive(),
    cutEventId: identifierSchema,
    stageKitId: identifierSchema,
    treatmentRendererId: identifierSchema,
    transitionRendererId: identifierSchema,
    performanceProgramIds: z.array(identifierSchema),
    layerIds: z.array(identifierSchema).min(3),
  })
  .strict();

const spriteSourceRectSchema = z
  .object({
    x: z.number().int().nonnegative(),
    y: z.number().int().nonnegative(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  })
  .strict();

const spriteAnchorSchema = z.object({ x: z.number(), y: z.number() }).strict();

const atlasFrameSchema = z
  .object({
    source: spriteSourceRectSchema,
    anchor: spriteAnchorSchema,
  })
  .strict();

const atlasExecutionFields = {
  assetId: identifierSchema,
  atlasWidth: z.number().int().positive(),
  atlasHeight: z.number().int().positive(),
  frames: z.array(atlasFrameSchema).min(1),
};

const atlasCycleExecutionSchema = z
  .object({
    kind: z.literal("atlas-cycle"),
    ...atlasExecutionFields,
    loop: z.literal(true),
    rootDistancePerLoop: z.number().positive(),
    footContactFrameIndices: z.array(z.number().int().nonnegative()).min(1),
  })
  .strict()
  .superRefine((execution, context) => {
    if (
      execution.footContactFrameIndices.some(
        (index) => index >= execution.frames.length,
      )
    )
      context.addIssue({
        code: "custom",
        path: ["footContactFrameIndices"],
        message: "Atlas foot contacts must reference an authored frame.",
      });
  });

const livingHoldExecutionSchema = z
  .object({
    kind: z.literal("living-hold"),
    ...atlasExecutionFields,
    poseSequence: z.array(z.number().int().nonnegative()).min(2),
    cycleFrames: z.number().int().min(12).max(120),
    breathingAmplitude: z.number().positive().max(0.08),
  })
  .strict()
  .superRefine((execution, context) => {
    if (
      execution.poseSequence.some((index) => index >= execution.frames.length)
    )
      context.addIssue({
        code: "custom",
        path: ["poseSequence"],
        message: "Living-hold poses must reference an authored frame.",
      });
  });

const articulatedPartSchema = z
  .object({
    id: identifierSchema,
    parentId: identifierSchema.nullable(),
    source: spriteSourceRectSchema,
    pivot: spriteAnchorSchema,
    joint: spriteAnchorSchema,
    rotation: z.number(),
    zIndex: z.number().int(),
  })
  .strict();

const articulatedChannelSchema = z
  .object({
    partId: identifierSchema,
    keyframes: z
      .array(
        z
          .object({
            progress: z.number().min(0).max(1),
            rotation: z.number(),
          })
          .strict(),
      )
      .min(2),
  })
  .strict();

const articulatedRigExecutionSchema = z
  .object({
    kind: z.literal("articulated-rig"),
    assetId: identifierSchema,
    sheetWidth: z.number().int().positive(),
    sheetHeight: z.number().int().positive(),
    displayScale: z.number().positive(),
    parts: z.array(articulatedPartSchema).min(2),
    channels: z.array(articulatedChannelSchema).min(1),
  })
  .strict()
  .superRefine((execution, context) => {
    const partIds = new Set(execution.parts.map((part) => part.id));
    if (partIds.size !== execution.parts.length)
      context.addIssue({
        code: "custom",
        path: ["parts"],
        message: "Articulated part IDs must be unique.",
      });
    execution.parts.forEach((part, index) => {
      if (part.parentId && !partIds.has(part.parentId))
        context.addIssue({
          code: "custom",
          path: ["parts", index, "parentId"],
          message: "Articulated parents must reference another part.",
        });
    });
    execution.channels.forEach((channel, index) => {
      if (!partIds.has(channel.partId))
        context.addIssue({
          code: "custom",
          path: ["channels", index, "partId"],
          message: "Articulated channels must target a declared part.",
        });
      if (
        channel.keyframes.some(
          (keyframe, keyframeIndex) =>
            keyframeIndex > 0 &&
            keyframe.progress <= channel.keyframes[keyframeIndex - 1]!.progress,
        )
      )
        context.addIssue({
          code: "custom",
          path: ["channels", index, "keyframes"],
          message: "Articulated channel progress must increase.",
        });
    });
  });

export const performanceExecutionSchema = z.discriminatedUnion("kind", [
  atlasCycleExecutionSchema,
  articulatedRigExecutionSchema,
  livingHoldExecutionSchema,
]);

export const performanceProgramSchema = z
  .object({
    id: identifierSchema,
    kind: z.enum([
      "articulated-rig",
      "drawing-sequence",
      "atlas-cycle",
      "living-hold",
    ]),
    rendererId: identifierSchema,
    rendererVersion: z.string().min(1),
    entityId: identifierSchema,
    eventIds: z.array(identifierSchema).min(1),
    assetIds: z.array(identifierSchema),
    manifestContentHash: hashSchema,
    sourceSceneIds: z.array(identifierSchema).optional(),
    sourceBeatIds: z.array(identifierSchema).optional(),
    sourceShotIds: z.array(identifierSchema).optional(),
    execution: performanceExecutionSchema.optional(),
    contentHash: hashSchema.optional(),
  })
  .strict()
  .superRefine((program, context) => {
    if (!program.contentHash) return;
    const { contentHash, ...draft } = program;
    if (hashCanonical(draft) !== contentHash)
      context.addIssue({
        code: "custom",
        path: ["contentHash"],
        message: "Performance program hash is invalid.",
      });
  });

export const approvedAssetBindingSchema = z
  .object({
    assetId: identifierSchema,
    version: z.string().min(1),
    contentHash: hashSchema,
    status: z.enum(["approved", "proxy"]),
    relativeFile: z.string().min(1).optional(),
    byteLength: z.number().int().positive().optional(),
    immutableLocationId: z
      .string()
      .regex(/^sha256:[a-f0-9]{64}$/)
      .optional(),
  })
  .strict();

export type PerformanceExecution = z.infer<typeof performanceExecutionSchema>;
export type PerformanceProgram = z.infer<typeof performanceProgramSchema>;
export type ApprovedAssetBinding = z.infer<typeof approvedAssetBindingSchema>;

const executableProgramLineageFields = {
  sourceSceneIds: z.array(identifierSchema),
  sourceBeatIds: z.array(identifierSchema),
  sourceShotIds: z.array(identifierSchema),
  rendererId: identifierSchema,
  rendererVersion: z.string().min(1),
};

const validateExecutableProgramHash = (
  program: { contentHash: string } & Record<string, unknown>,
  context: z.RefinementCtx,
) => {
  const { contentHash, ...draft } = program;
  if (hashCanonical(draft) !== contentHash)
    context.addIssue({
      code: "custom",
      path: ["contentHash"],
      message: "Executable program hash is invalid.",
    });
};

const proxyTransformSchema = z
  .object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
    scale: z.number().positive(),
    rotation: z.number(),
  })
  .strict();

const proxyKeyframeSchema = z
  .object({
    frame: z.number().int().nonnegative(),
    transform: proxyTransformSchema,
    facing: z.enum(["left", "right", "front", "three-quarter", "away"]),
    actionPhase: z.enum([
      "anticipation",
      "action",
      "impact",
      "reaction",
      "settle",
      "hold",
    ]),
  })
  .strict();

export const proxyStageProgramSchema = z
  .object({
    id: identifierSchema,
    ...executableProgramLineageFields,
    stageId: identifierSchema,
    sceneId: identifierSchema,
    title: z.string().min(1),
    palette: z
      .object({
        sky: z.string().min(1),
        ground: z.string().min(1),
        ink: z.string().min(1),
        accent: z.string().min(1),
      })
      .strict(),
    landmarkLabels: z.array(z.string().min(1)),
    contentHash: hashSchema,
  })
  .strict()
  .superRefine(validateExecutableProgramHash);

export const proxyCameraProgramSchema = z
  .object({
    id: identifierSchema,
    ...executableProgramLineageFields,
    shotId: identifierSchema,
    purpose: z.string().min(1),
    size: z.enum(["extreme-wide", "wide", "medium", "close-up", "insert"]),
    focalRegion: z.enum([
      "left-third",
      "center",
      "right-third",
      "upper-third",
      "lower-third",
    ]),
    movement: z.enum(["locked", "pan", "track", "push", "pull", "reframe"]),
    keyframes: z
      .array(
        z
          .object({
            frame: z.number().int().nonnegative(),
            x: z.number(),
            y: z.number(),
            scale: z.number().positive(),
          })
          .strict(),
      )
      .min(2),
    contentHash: hashSchema,
  })
  .strict()
  .superRefine(validateExecutableProgramHash)
  .superRefine((program, context) => {
    const first = program.keyframes[0]!;
    const last = program.keyframes.at(-1)!;
    const xChanges = program.keyframes.some(
      (keyframe) => keyframe.x !== first.x,
    );
    const yChanges = program.keyframes.some(
      (keyframe) => keyframe.y !== first.y,
    );
    const positionChanges = xChanges || yChanges;
    const scaleChanges = program.keyframes.some(
      (keyframe) => keyframe.scale !== first.scale,
    );
    const reject = (message: string) =>
      context.addIssue({
        code: "custom",
        path: ["keyframes"],
        message,
      });

    if (program.movement === "locked" && (positionChanges || scaleChanges))
      reject("A locked camera must keep a constant transform.");
    if (program.movement === "pan" && (!xChanges || yChanges || scaleChanges))
      reject("A pan must visibly change horizontal position without zooming.");
    if (
      ["track", "reframe"].includes(program.movement) &&
      (!positionChanges || scaleChanges)
    )
      reject(
        `${program.movement} must visibly change position without changing scale.`,
      );
    if (
      program.movement === "push" &&
      (!scaleChanges || last.scale <= first.scale)
    )
      reject("A push must end at a visibly larger scale.");
    if (
      program.movement === "pull" &&
      (!scaleChanges || last.scale >= first.scale)
    )
      reject("A pull must end at a visibly smaller scale.");
  });

export const proxyEntityProgramSchema = z
  .object({
    id: identifierSchema,
    ...executableProgramLineageFields,
    shotId: identifierSchema,
    entityId: identifierSchema,
    appearance: z
      .object({
        shape: z.enum(["person", "presenter", "creature", "prop", "evidence"]),
        label: z.string().min(1),
        color: z.string().min(1),
      })
      .strict(),
    keyframes: z.array(proxyKeyframeSchema).min(2),
    contentHash: hashSchema,
  })
  .strict()
  .superRefine(validateExecutableProgramHash);

export const proxyCaptionProgramSchema = z
  .object({
    id: identifierSchema,
    ...executableProgramLineageFields,
    shotId: identifierSchema,
    beatId: identifierSchema,
    text: z.string().min(1),
    emphasis: z.enum(["none", "keyword", "date", "quote", "full-phrase"]),
    contentHash: hashSchema,
  })
  .strict()
  .superRefine(validateExecutableProgramHash);

export const proxyTransitionProgramSchema = z
  .object({
    id: identifierSchema,
    ...executableProgramLineageFields,
    shotId: identifierSchema,
    kind: z.enum([
      "hard-cut",
      "match-cut",
      "camera-carry",
      "foreground-wipe",
      "dissolve",
    ]),
    progressKeyframes: z
      .array(
        z
          .object({
            frame: z.number().int().nonnegative(),
            progress: z.number().min(0).max(1),
          })
          .strict(),
      )
      .min(2),
    occluderId: identifierSchema.nullable(),
    contentHash: hashSchema,
  })
  .strict()
  .superRefine(validateExecutableProgramHash)
  .superRefine((program, context) => {
    if (
      program.progressKeyframes.some(
        (keyframe, index) =>
          index > 0 &&
          keyframe.frame <= program.progressKeyframes[index - 1]!.frame,
      )
    )
      context.addIssue({
        code: "custom",
        path: ["progressKeyframes"],
        message: "Transition progress frames must increase.",
      });
    if (program.kind === "foreground-wipe" && program.occluderId === null)
      context.addIssue({
        code: "custom",
        path: ["occluderId"],
        message: "Foreground wipes require a resolved occluder.",
      });
  });

const executableEpisodePlanFields = {
  schemaVersion: z.literal("1.0"),
  id: identifierSchema,
  renderMode: z.enum(["proxy-animatic", "final"]),
  directorPlanContentHash: hashSchema,
  timingSolutionContentHash: hashSchema,
  grammarProfileContentHash: hashSchema,
  continuitySequencePlan: continuitySequencePlanSchema,
  registryVersions: z
    .object({
      stage: z.string().min(1),
      performance: z.string().min(1),
      treatment: z.string().min(1),
      transition: z.string().min(1),
      audio: z.string().min(1),
    })
    .strict(),
  format: z
    .object({
      width: z.number().int().positive(),
      height: z.number().int().positive(),
      fps: z.number().int().positive(),
      durationInFrames: z.number().int().positive(),
    })
    .strict(),
  stageKits: z.array(
    z
      .object({
        id: identifierSchema,
        rendererId: identifierSchema,
        layerIds: z.array(identifierSchema).min(3),
        assetIds: z.array(identifierSchema),
      })
      .strict(),
  ),
  shots: z.array(executableShotSchema).min(1),
  performancePrograms: z.array(performanceProgramSchema),
  approvedAssets: z.array(approvedAssetBindingSchema),
  audioCues: z.array(
    z
      .object({
        id: identifierSchema,
        eventId: identifierSchema,
        assetId: identifierSchema.nullable(),
        gain: z.number().min(0).max(2),
      })
      .strict(),
  ),
  /**
   * Concrete proxy programs are the executable rendering boundary for
   * Director Studio Alpha. They are optional only so sealed legacy/final
   * fixtures remain readable while the old pipeline is retired.
   */
  proxyStagePrograms: z.array(proxyStageProgramSchema).optional(),
  proxyCameraPrograms: z.array(proxyCameraProgramSchema).optional(),
  proxyEntityPrograms: z.array(proxyEntityProgramSchema).optional(),
  proxyCaptionPrograms: z.array(proxyCaptionProgramSchema).optional(),
  proxyTransitionPrograms: z.array(proxyTransitionProgramSchema).optional(),
  resolvedEventFrames: z
    .array(
      z
        .object({
          eventId: identifierSchema,
          frame: z.number().int().nonnegative(),
        })
        .strict(),
    )
    .optional(),
};

export const executableEpisodePlanDraftSchema = z
  .object(executableEpisodePlanFields)
  .strict();

export const executableEpisodePlanSchema = z
  .object({ ...executableEpisodePlanFields, contentHash: hashSchema })
  .strict()
  .superRefine((episode, context) => {
    const { contentHash, ...draft } = episode;
    if (hashCanonical(draft) !== contentHash)
      context.addIssue({
        code: "custom",
        path: ["contentHash"],
        message: "Executable episode plan hash is invalid.",
      });
    if (
      episode.renderMode === "final" &&
      episode.approvedAssets.some((asset) => asset.status !== "approved")
    )
      context.addIssue({
        code: "custom",
        path: ["approvedAssets"],
        message: "Final renders may not consume proxy assets.",
      });
    if (
      episode.renderMode === "final" &&
      [
        episode.proxyStagePrograms,
        episode.proxyCameraPrograms,
        episode.proxyEntityPrograms,
        episode.proxyCaptionPrograms,
        episode.proxyTransitionPrograms,
      ].some((programs) => (programs?.length ?? 0) > 0)
    )
      context.addIssue({
        code: "custom",
        path: ["renderMode"],
        message: "Final renders may not consume proxy executable programs.",
      });
  });

export type ExecutableEpisodePlanDraft = z.infer<
  typeof executableEpisodePlanDraftSchema
>;
export type ExecutableEpisodePlan = z.infer<typeof executableEpisodePlanSchema>;

export function sealExecutableEpisodePlan(
  rawDirectorPlan: DirectorPlan,
  rawTimingSolution: TimingSolution,
  rawDraft: ExecutableEpisodePlanDraft,
): ExecutableEpisodePlan {
  const directorPlan = directorPlanSchema.parse(rawDirectorPlan);
  const timing = timingSolutionSchema.parse(rawTimingSolution);
  const draft = executableEpisodePlanDraftSchema.parse(rawDraft);
  if (
    draft.directorPlanContentHash !== directorPlan.contentHash ||
    timing.directorPlanContentHash !== directorPlan.contentHash
  )
    throw new Error("Executable plan does not match the Director plan.");
  if (draft.timingSolutionContentHash !== timing.contentHash)
    throw new Error("Executable plan does not match the Timing Solution.");
  if (
    draft.grammarProfileContentHash !== directorPlan.grammarProfileContentHash
  )
    throw new Error("Executable plan does not match the directing grammar.");
  if (draft.format.durationInFrames !== timing.durationInFrames)
    throw new Error("Executable duration does not match the Timing Solution.");
  if (
    draft.continuitySequencePlan.fps !== draft.format.fps ||
    draft.continuitySequencePlan.durationInFrames !==
      draft.format.durationInFrames
  )
    throw new Error(
      "Executable format does not match the continuity sequence.",
    );
  assertContinuitySequenceMatchesSources(
    directorPlan,
    timing,
    draft.continuitySequencePlan,
    draft.performancePrograms.flatMap((program) =>
      program.contentHash && program.sourceShotIds
        ? [
            {
              id: program.id,
              entityId: program.entityId,
              kind: program.kind,
              contentHash: program.contentHash,
              sourceShotIds: program.sourceShotIds,
            },
          ]
        : [],
    ),
  );

  const programIds = new Set(
    draft.performancePrograms.map((program) => program.id),
  );
  const stageIds = new Set(draft.stageKits.map((stage) => stage.id));
  const assetIds = new Set(draft.approvedAssets.map((asset) => asset.assetId));
  if (
    draft.shots.length !== timing.resolvedShots.length ||
    draft.shots.some((shot, index) => {
      const resolved = timing.resolvedShots[index];
      return (
        !resolved ||
        shot.directorShotId !== resolved.shotId ||
        shot.startFrame !== resolved.startFrame ||
        shot.endFrameExclusive !== resolved.endFrameExclusive ||
        shot.cutEventId !== resolved.cutEventId
      );
    })
  )
    throw new Error("Executable shots must exactly match the Timing Solution.");
  draft.shots.forEach((shot) => {
    if (!stageIds.has(shot.stageKitId))
      throw new Error(`${shot.id} references an unknown stage kit.`);
    if (
      shot.performanceProgramIds.some((programId) => !programIds.has(programId))
    )
      throw new Error(`${shot.id} references an unknown performance program.`);
  });
  draft.performancePrograms.forEach((program) => {
    if (program.assetIds.some((assetId) => !assetIds.has(assetId)))
      throw new Error(`${program.id} references an unresolved asset.`);
    if (program.execution) {
      const executionAsset = draft.approvedAssets.find(
        (asset) => asset.assetId === program.execution!.assetId,
      );
      if (
        program.kind !== program.execution.kind ||
        !program.assetIds.includes(program.execution.assetId) ||
        executionAsset?.status !== "approved" ||
        !executionAsset.relativeFile ||
        !executionAsset.byteLength ||
        executionAsset.immutableLocationId !==
          `sha256:${executionAsset.contentHash}` ||
        !executionAsset.relativeFile.includes(executionAsset.contentHash)
      )
        throw new Error(
          `${program.id} executable performance is not bound to an approved renderable asset.`,
        );
    }
  });
  draft.continuitySequencePlan.shots.forEach((continuityShot) => {
    const validatePerformanceBinding = (
      entityId: string,
      performanceProgramId: string | null,
      performanceProgramContentHash: string | null,
    ) => {
      if (performanceProgramId === null) {
        if (performanceProgramContentHash !== null)
          throw new Error(
            `${continuityShot.shotId}/${entityId} has a performance hash without a program ID.`,
          );
        return;
      }
      const program = draft.performancePrograms.find(
        (candidate) => candidate.id === performanceProgramId,
      );
      if (
        !program ||
        program.entityId !== entityId ||
        !program.sourceShotIds?.includes(continuityShot.shotId) ||
        program.contentHash !== performanceProgramContentHash
      )
        throw new Error(
          `${continuityShot.shotId}/${entityId} is not bound to the exact current-shot performance program.`,
        );
    };

    continuityShot.entryPerformanceState.forEach((state) =>
      validatePerformanceBinding(
        state.entityId,
        state.performanceProgramId,
        state.performanceProgramContentHash,
      ),
    );
    continuityShot.exitPerformanceState.forEach((state) =>
      validatePerformanceBinding(
        state.entityId,
        state.performanceProgramId,
        state.performanceProgramContentHash,
      ),
    );
    continuityShot.performanceSegments.forEach((segment) =>
      validatePerformanceBinding(
        segment.entityId,
        segment.performanceProgramId,
        segment.performanceProgramContentHash,
      ),
    );
    continuityShot.pictureEvents
      .filter((event) => event.source === "performance-event")
      .forEach((event) => {
        event.subjectIds.forEach((entityId) => {
          const program = draft.performancePrograms.find(
            (candidate) =>
              candidate.entityId === entityId &&
              candidate.sourceShotIds?.includes(continuityShot.shotId) &&
              candidate.contentHash === event.sourceProgramContentHash,
          );
          if (!program)
            throw new Error(
              `${event.id} is not bound to an exact current-shot performance program.`,
            );
        });
      });

    Object.entries(continuityShot.entryWorldState.entities).forEach(
      ([entityId, entryWorld]) => {
        const exitWorld = continuityShot.exitWorldState.entities[entityId]!;
        const moved =
          Math.hypot(
            exitWorld.transform.x - entryWorld.transform.x,
            exitWorld.transform.y - entryWorld.transform.y,
            exitWorld.transform.z - entryWorld.transform.z,
          ) > 0.000001;
        if (!moved) return;
        const segments = continuityShot.performanceSegments.filter(
          (segment) => segment.entityId === entityId,
        );
        const decelerationFrame = continuityShot.pictureEvents.find(
          (event) =>
            event.source === "performance-event" &&
            event.kind === "deceleration" &&
            event.subjectIds.includes(entityId),
        )?.frame;
        const plantFrame = continuityShot.pictureEvents.find(
          (event) =>
            event.source === "performance-event" &&
            (event.kind === "plant" || event.kind === "foot-contact") &&
            event.subjectIds.includes(entityId),
        )?.frame;
        if (
          segments.some(
            (segment) =>
              segment.startFrame <
                (plantFrame ?? continuityShot.endFrameExclusive) &&
              segment.motionMode === "idle",
          )
        )
          throw new Error(
            `${continuityShot.shotId}/${entityId} reports idle while its canonical root is moving.`,
          );
        if (decelerationFrame !== undefined) {
          const deceleration = segments.find(
            (segment) =>
              decelerationFrame >= segment.startFrame &&
              decelerationFrame < segment.endFrameExclusive,
          );
          if (deceleration?.motionMode !== "decelerating")
            throw new Error(
              `${continuityShot.shotId}/${entityId} does not enter deceleration on its named event.`,
            );
        }
        if (plantFrame !== undefined) {
          const plant = segments.find(
            (segment) =>
              plantFrame >= segment.startFrame &&
              plantFrame < segment.endFrameExclusive,
          );
          if (
            plant?.motionMode !== "idle" ||
            !["settle", "hold"].includes(plant.actionPhase) ||
            plant.gaitStart !== null ||
            plant.gaitAdvanceCycles !== null
          )
            throw new Error(
              `${continuityShot.shotId}/${entityId} does not stop on its named plant contact.`,
            );
        }
      },
    );
  });
  draft.stageKits.forEach((stage) => {
    if (stage.assetIds.some((assetId) => !assetIds.has(assetId)))
      throw new Error(`${stage.id} references an unresolved asset.`);
  });
  if (draft.renderMode === "proxy-animatic") {
    const directorShotIds = new Set(
      draft.shots.map((shot) => shot.directorShotId),
    );
    const directorStageIds = new Set(draft.stageKits.map((stage) => stage.id));
    if (!draft.proxyStagePrograms?.length || !draft.proxyCameraPrograms?.length)
      throw new Error(
        "Proxy animatics need concrete stage and camera programs.",
      );
    draft.proxyStagePrograms.forEach((program) => {
      if (!directorStageIds.has(program.stageId))
        throw new Error(`${program.id} references an unknown proxy stage.`);
    });
    draft.proxyCameraPrograms.forEach((program) => {
      if (!directorShotIds.has(program.shotId))
        throw new Error(`${program.id} references an unknown proxy shot.`);
      const continuityShot = draft.continuitySequencePlan.shots.find(
        (shot) => shot.shotId === program.shotId,
      );
      const directorShot = directorPlan.shots.find(
        (shot) => shot.id === program.shotId,
      );
      if (
        !continuityShot ||
        !directorShot ||
        program.id !== continuityShot.cameraProgram.id ||
        program.size !== continuityShot.camera.size ||
        program.movement !== continuityShot.camera.movement ||
        program.focalRegion !== continuityShot.cameraProgram.focalRegion ||
        program.purpose !== directorShot.storyFunction ||
        hashCanonical(program.keyframes) !==
          hashCanonical(continuityShot.cameraProgram.keyframes)
      )
        throw new Error(
          `${program.id} invents camera motion outside the continuity sequence.`,
        );
    });
    draft.proxyEntityPrograms?.forEach((program) => {
      if (!directorShotIds.has(program.shotId))
        throw new Error(`${program.id} references an unknown proxy shot.`);
      const continuityShot = draft.continuitySequencePlan.shots.find(
        (shot) => shot.shotId === program.shotId,
      );
      const entryWorld =
        continuityShot?.entryWorldState.entities[program.entityId];
      const exitWorld =
        continuityShot?.exitWorldState.entities[program.entityId];
      const entryPerformance = continuityShot?.entryPerformanceState.find(
        (state) => state.entityId === program.entityId,
      );
      const exitPerformance = continuityShot?.exitPerformanceState.find(
        (state) => state.entityId === program.entityId,
      );
      const first = program.keyframes[0];
      const last = program.keyframes.at(-1);
      const duration = continuityShot
        ? continuityShot.endFrameExclusive - continuityShot.startFrame
        : 0;
      if (
        !continuityShot ||
        !entryWorld ||
        !exitWorld ||
        !entryPerformance ||
        !exitPerformance ||
        !first ||
        !last ||
        first.frame !== 0 ||
        last.frame !== duration - 1 ||
        hashCanonical(first.transform) !==
          hashCanonical(entryWorld.transform) ||
        hashCanonical(last.transform) !== hashCanonical(exitWorld.transform) ||
        first.facing !== entryWorld.facing ||
        last.facing !== exitWorld.facing ||
        first.actionPhase !== entryPerformance.actionPhase ||
        last.actionPhase !== exitPerformance.actionPhase
      )
        throw new Error(
          `${program.id} invents root motion outside the continuity sequence.`,
        );
    });
    draft.proxyCaptionPrograms?.forEach((program) => {
      if (!directorShotIds.has(program.shotId))
        throw new Error(`${program.id} references an unknown proxy shot.`);
    });
    draft.proxyTransitionPrograms?.forEach((program) => {
      if (!directorShotIds.has(program.shotId))
        throw new Error(`${program.id} references an unknown proxy shot.`);
      const continuityShot = draft.continuitySequencePlan.shots.find(
        (shot) => shot.shotId === program.shotId,
      );
      if (
        !continuityShot ||
        program.id !== continuityShot.transitionProgram.id ||
        program.kind !== continuityShot.transitionProgram.kind ||
        program.occluderId !== continuityShot.transitionProgram.occluderId ||
        hashCanonical(program.progressKeyframes) !==
          hashCanonical(continuityShot.transitionProgram.progressKeyframes)
      )
        throw new Error(
          `${program.id} invents a transition outside the continuity sequence.`,
        );
    });
    const allPrograms = [
      ...(draft.proxyStagePrograms ?? []),
      ...(draft.proxyCameraPrograms ?? []),
      ...(draft.proxyEntityPrograms ?? []),
      ...(draft.proxyCaptionPrograms ?? []),
      ...(draft.proxyTransitionPrograms ?? []),
    ];
    if (
      new Set(allPrograms.map((program) => program.id)).size !==
      allPrograms.length
    )
      throw new Error("Executable proxy program IDs must be globally unique.");
    draft.performancePrograms.forEach((program) => {
      if (
        !program.contentHash ||
        !program.sourceSceneIds ||
        !program.sourceBeatIds ||
        !program.sourceShotIds
      )
        throw new Error(
          `${program.id} is missing executable source lineage or its content hash.`,
        );
    });
    if (
      !draft.resolvedEventFrames ||
      hashCanonical(draft.resolvedEventFrames) !==
        hashCanonical(timing.resolvedEvents)
    )
      throw new Error(
        "Executable proxy event bindings must exactly match the Timing Solution.",
      );
  }

  return executableEpisodePlanSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
}
