import { z } from "zod";
import { hashCanonical } from "./canonical-hash";
import {
  compileCv001CreatorScene,
  createDefaultCv001CreatorDirectionState,
  type Cv001CreatorCompiledScene,
} from "./cv001-creator-direction";
import { createCv001ThreeBeatProofFixture } from "./cv001-proof-fixture";
import {
  cv001ThreeBeatSceneInputSchema,
  type Cv001ThreeBeatSceneInput,
} from "./cv001-scene-compiler";
import { cv001RigContract } from "./motion-program";
import {
  hashSchema,
  identifierSchema,
  type FrameAccurateRenderPlan,
} from "./model";
import { cv002ProjectSchema, type Cv002Project } from "./cv002-story-draft";

export const CV002_OBJECT_DISCOVERY_TEMPLATE_ID = "kids-object-discovery-v1";
export const CV002_OBJECT_DISCOVERY_TEMPLATE_VERSION = "1.0.0";
export const CV002_TEMPLATE_ASSIGNMENT_STORAGE_KEY =
  "storystage.cv002.template-assignment.v1";

const projectAssetDraftSchema = z
  .object({
    id: identifierSchema,
    version: z.string().min(1),
    label: z.string().min(1),
    origin: z.literal("project-owned-code"),
  })
  .strict();

const sealProjectAsset = (draft: z.infer<typeof projectAssetDraftSchema>) => ({
  ...draft,
  contentHash: hashCanonical(draft),
});

export const CV002_PROTOTYPE_CHARACTER_ASSET = sealProjectAsset(
  projectAssetDraftSchema.parse({
    id: "cv001-character",
    version: "1.0.0",
    label: "Mara paper-cut prototype",
    origin: "project-owned-code",
  }),
);

export const CV002_PROTOTYPE_LANTERN_ASSET = sealProjectAsset(
  projectAssetDraftSchema.parse({
    id: "lantern",
    version: "1.0.0",
    label: "Lantern paper-cut prototype",
    origin: "project-owned-code",
  }),
);

export const CV002_CV001_RIG_BINDING = {
  id: cv001RigContract.id,
  contentHash: hashCanonical(cv001RigContract),
} as const;

export const cv002TemplateSlotSchema = z.enum([
  "notice-object",
  "reach-and-pick-up",
  "react-and-present",
]);
export type Cv002TemplateSlot = z.infer<typeof cv002TemplateSlotSchema>;

const slotMappingSchema = z
  .object({
    slot: cv002TemplateSlotSchema,
    beatId: identifierSchema,
    beatContentHash: hashSchema,
  })
  .strict();

const assignmentFields = {
  schemaVersion: z.literal("1.0"),
  id: identifierSchema,
  template: z
    .object({
      id: z.literal(CV002_OBJECT_DISCOVERY_TEMPLATE_ID),
      version: z.literal(CV002_OBJECT_DISCOVERY_TEMPLATE_VERSION),
    })
    .strict(),
  projectGraphHash: hashSchema,
  sceneId: identifierSchema,
  sceneContentHash: hashSchema,
  slots: z.tuple([
    slotMappingSchema.extend({ slot: z.literal("notice-object") }).strict(),
    slotMappingSchema.extend({ slot: z.literal("reach-and-pick-up") }).strict(),
    slotMappingSchema.extend({ slot: z.literal("react-and-present") }).strict(),
  ]),
  rig: z
    .object({
      id: z.literal("cv001-paper-cut-rig-v1"),
      contentHash: hashSchema,
    })
    .strict(),
  characterAsset: z
    .object({
      id: z.literal("cv001-character"),
      version: z.literal("1.0.0"),
      contentHash: hashSchema,
      origin: z.literal("project-owned-code"),
    })
    .strict(),
  propAsset: z
    .object({
      id: z.literal("lantern"),
      version: z.literal("1.0.0"),
      contentHash: hashSchema,
      origin: z.literal("project-owned-code"),
    })
    .strict(),
  status: z.literal("template-assigned"),
};

const cv002TemplateAssignmentDraftSchema = z.object(assignmentFields).strict();
export const cv002TemplateAssignmentSchema = z
  .object({ ...assignmentFields, contentHash: hashSchema })
  .strict()
  .superRefine((assignment, context) => {
    const { contentHash, ...draft } = assignment;
    if (hashCanonical(draft) !== contentHash)
      context.addIssue({
        code: "custom",
        message: "Template assignment hash is invalid.",
        path: ["contentHash"],
      });
    const expectedId = `assignment-${hashCanonical({ ...draft, id: undefined }).slice(0, 12)}`;
    if (assignment.id !== expectedId)
      context.addIssue({
        code: "custom",
        message: "Template assignment ID is not content-derived.",
        path: ["id"],
      });
    if (
      new Set(assignment.slots.map((slot) => slot.beatId)).size !==
      assignment.slots.length
    )
      context.addIssue({
        code: "custom",
        message: "Every template slot must map to a different beat.",
        path: ["slots"],
      });
  });

export type Cv002TemplateAssignment = z.infer<
  typeof cv002TemplateAssignmentSchema
>;

const assignmentId = (draft: object) =>
  `assignment-${hashCanonical({ ...draft, id: undefined }).slice(0, 12)}`;

const buildCv001InputFromMappedBeats = (
  mappedBeats: Array<{ text: string }>,
): Cv001ThreeBeatSceneInput => {
  const fixture = createCv001ThreeBeatProofFixture();
  return cv001ThreeBeatSceneInputSchema.parse({
    ...structuredClone(fixture.input),
    beats: fixture.input.beats.map((beat, index) => ({
      ...beat,
      text: mappedBeats[index]?.text ?? "",
    })),
  });
};

function verifyAssignmentReferences(
  project: Cv002Project,
  assignment: Cv002TemplateAssignment,
) {
  if (project.grammar !== "kids-adventure")
    throw new Error(
      "The object-discovery animation template supports Kids Adventure only.",
    );
  if (assignment.projectGraphHash !== project.graph.contentHash)
    throw new Error(
      "Template assignment is stale because the story graph changed.",
    );
  const scene = project.graph.scenes.find(
    (candidate) => candidate.id === assignment.sceneId,
  );
  if (!scene)
    throw new Error(
      "Template assignment references a scene that no longer exists.",
    );
  if (scene.contentHash !== assignment.sceneContentHash)
    throw new Error("Template assignment is stale because its scene changed.");
  if (scene.beats.length !== 3)
    throw new Error(
      "The object-discovery template requires exactly three beats in one scene.",
    );
  const sceneBeats = new Map(scene.beats.map((beat) => [beat.id, beat]));
  assignment.slots.forEach((slot) => {
    const beat = sceneBeats.get(slot.beatId);
    if (!beat || beat.contentHash !== slot.beatContentHash)
      throw new Error(
        `Template slot ${slot.slot} no longer matches its assigned beat.`,
      );
  });
  buildCv001InputFromMappedBeats(
    assignment.slots.map((slot) => sceneBeats.get(slot.beatId)!),
  );
  if (
    assignment.rig.id !== CV002_CV001_RIG_BINDING.id ||
    assignment.rig.contentHash !== CV002_CV001_RIG_BINDING.contentHash
  )
    throw new Error(
      "Template assignment does not match the accepted articulated rig contract.",
    );
  if (
    assignment.characterAsset.contentHash !==
    CV002_PROTOTYPE_CHARACTER_ASSET.contentHash
  )
    throw new Error(
      "Template assignment does not match the project-owned character prototype.",
    );
  if (
    assignment.propAsset.contentHash !==
    CV002_PROTOTYPE_LANTERN_ASSET.contentHash
  )
    throw new Error(
      "Template assignment does not match the project-owned lantern prototype.",
    );
  return scene;
}

export function buildCv002AssignedCv001Input(
  project: Cv002Project,
  rawAssignment: Cv002TemplateAssignment,
): Cv001ThreeBeatSceneInput {
  const parsedProject = cv002ProjectSchema.parse(project);
  const assignment = cv002TemplateAssignmentSchema.parse(rawAssignment);
  const scene = verifyAssignmentReferences(parsedProject, assignment);
  const beatById = new Map(scene.beats.map((beat) => [beat.id, beat]));
  return buildCv001InputFromMappedBeats(
    assignment.slots.map((slot) => beatById.get(slot.beatId)!),
  );
}

export function createCv002TemplateAssignment({
  project: rawProject,
  sceneId,
  noticeBeatId,
  pickupBeatId,
  presentBeatId,
  characterAssetId,
  propAssetId,
}: {
  project: Cv002Project;
  sceneId: string;
  noticeBeatId: string;
  pickupBeatId: string;
  presentBeatId: string;
  characterAssetId: string;
  propAssetId: string;
}): Cv002TemplateAssignment {
  const project = cv002ProjectSchema.parse(rawProject);
  if (project.grammar !== "kids-adventure")
    throw new Error(
      "The object-discovery animation template supports Kids Adventure only.",
    );
  if (
    characterAssetId !== CV002_PROTOTYPE_CHARACTER_ASSET.id ||
    propAssetId !== CV002_PROTOTYPE_LANTERN_ASSET.id
  )
    throw new Error(
      "This template can use only the project-owned Mara and lantern prototypes.",
    );
  const scene = project.graph.scenes.find(
    (candidate) => candidate.id === sceneId,
  );
  if (!scene) throw new Error(`Unknown story scene: ${sceneId}`);
  if (scene.beats.length !== 3)
    throw new Error(
      "The object-discovery template requires exactly three beats in one scene.",
    );
  const beatById = new Map(scene.beats.map((beat) => [beat.id, beat]));
  const slotIds = [noticeBeatId, pickupBeatId, presentBeatId];
  if (new Set(slotIds).size !== 3)
    throw new Error("Every object-discovery slot must use a different beat.");
  if (slotIds.some((beatId) => !beatById.has(beatId)))
    throw new Error(
      "Every object-discovery slot must use a beat from the selected scene.",
    );
  const slots = [
    {
      slot: "notice-object" as const,
      beatId: noticeBeatId,
      beatContentHash: beatById.get(noticeBeatId)!.contentHash,
    },
    {
      slot: "reach-and-pick-up" as const,
      beatId: pickupBeatId,
      beatContentHash: beatById.get(pickupBeatId)!.contentHash,
    },
    {
      slot: "react-and-present" as const,
      beatId: presentBeatId,
      beatContentHash: beatById.get(presentBeatId)!.contentHash,
    },
  ] as const;
  const draftWithoutId = {
    schemaVersion: "1.0" as const,
    template: {
      id: CV002_OBJECT_DISCOVERY_TEMPLATE_ID,
      version: CV002_OBJECT_DISCOVERY_TEMPLATE_VERSION,
    },
    projectGraphHash: project.graph.contentHash,
    sceneId: scene.id,
    sceneContentHash: scene.contentHash,
    slots,
    rig: CV002_CV001_RIG_BINDING,
    characterAsset: {
      id: CV002_PROTOTYPE_CHARACTER_ASSET.id,
      version: CV002_PROTOTYPE_CHARACTER_ASSET.version,
      contentHash: CV002_PROTOTYPE_CHARACTER_ASSET.contentHash,
      origin: CV002_PROTOTYPE_CHARACTER_ASSET.origin,
    },
    propAsset: {
      id: CV002_PROTOTYPE_LANTERN_ASSET.id,
      version: CV002_PROTOTYPE_LANTERN_ASSET.version,
      contentHash: CV002_PROTOTYPE_LANTERN_ASSET.contentHash,
      origin: CV002_PROTOTYPE_LANTERN_ASSET.origin,
    },
    status: "template-assigned" as const,
  };
  const draft = cv002TemplateAssignmentDraftSchema.parse({
    ...draftWithoutId,
    id: assignmentId(draftWithoutId),
  });
  const assignment = cv002TemplateAssignmentSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
  verifyAssignmentReferences(project, assignment);
  return assignment;
}

export function verifyCv002TemplateAssignment(
  project: Cv002Project,
  rawAssignment: Cv002TemplateAssignment,
) {
  const parsedProject = cv002ProjectSchema.parse(project);
  const assignment = cv002TemplateAssignmentSchema.parse(rawAssignment);
  verifyAssignmentReferences(parsedProject, assignment);
  return assignment;
}

export function restoreCv002TemplateAssignment(
  serialized: string,
  project: Cv002Project,
) {
  return verifyCv002TemplateAssignment(project, JSON.parse(serialized));
}

export type Cv002AssignedScenePreview = {
  renderPlan: FrameAccurateRenderPlan;
  compiled: Cv001CreatorCompiledScene;
  assignment: Cv002TemplateAssignment;
  sourceBeatIds: [string, string, string];
};

export function compileCv002AssignedScenePreview(
  project: Cv002Project,
  rawAssignment: Cv002TemplateAssignment,
): Cv002AssignedScenePreview {
  const assignment = verifyCv002TemplateAssignment(project, rawAssignment);
  const scene = project.graph.scenes.find(
    (candidate) => candidate.id === assignment.sceneId,
  )!;
  const beatById = new Map(scene.beats.map((beat) => [beat.id, beat]));
  const mappedBeats = assignment.slots.map(
    (slot) => beatById.get(slot.beatId)!,
  );
  const fixture = createCv001ThreeBeatProofFixture();
  const input = buildCv002AssignedCv001Input(project, assignment);
  const directionState = createDefaultCv001CreatorDirectionState(input);
  const compiled = compileCv001CreatorScene({
    baseInput: input,
    directionState,
    renderPlan: fixture.renderPlan,
  });
  return {
    renderPlan: fixture.renderPlan,
    compiled,
    assignment,
    sourceBeatIds: mappedBeats.map((beat) => beat.id) as [
      string,
      string,
      string,
    ],
  };
}
