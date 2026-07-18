import {z} from "zod";
import {hashCanonical} from "./canonical-hash";
import {
  createDirectedShotMotionBinding,
  compileCv001ThreeBeatScene,
  cv001CompiledSceneMotionSchema,
  cv001ThreeBeatSceneInputSchema,
  getCv001CompiledBeatIssues,
  type Cv001CompiledSceneMotion,
  type Cv001ThreeBeatSceneInput,
} from "./cv001-scene-compiler";
import {createCv001ThreeBeatProofFixture} from "./cv001-proof-fixture";
import {
  assertMotionProgram,
  cv001RigContract,
  directedBeatProgramSchema,
  type DirectedBeatProgram,
  type MotionTrack,
} from "./motion-program";
import {
  frameAccurateRenderPlanSchema,
  hashSchema,
  identifierSchema,
  type FrameAccurateRenderPlan,
} from "./model";

export const CV001_CREATOR_STORAGE_KEY = "storystage.cv001.creator.v1";
export const CV001_CREATOR_PROJECT_ID = "cv001-lantern-demo";
export const CV001_DEFAULT_SCRIPT = [
  "Mara notices a strange lantern glowing beside the path.",
  "She leans in, reaches carefully, and lifts it from the ground.",
  "It flickers awake, and Mara proudly shows it to us.",
].join("\n\n");

export const cv001CreatorBeatDirectionSchema = z
  .object({
    beatId: identifierSchema,
    performance: z.enum(["subtle", "standard", "big"]),
    tempo: z.enum(["gentle", "standard", "snappy"]),
    hold: z.enum(["short", "standard", "long"]),
    camera: z.enum(["none", "subtle", "standard", "strong"]),
  })
  .strict();

const creatorDirectionStateFields = {
  schemaVersion: z.literal("1.0"),
  baseInputContentHash: hashSchema,
  beats: z.tuple([
    cv001CreatorBeatDirectionSchema,
    cv001CreatorBeatDirectionSchema,
    cv001CreatorBeatDirectionSchema,
  ]),
};

const cv001CreatorDirectionStateDraftSchema = z
  .object(creatorDirectionStateFields)
  .strict();

export const cv001CreatorDirectionStateSchema = z
  .object({...creatorDirectionStateFields, contentHash: hashSchema})
  .strict()
  .superRefine((state, context) => {
    const {contentHash, ...draft} = state;
    if (hashCanonical(draft) !== contentHash)
      context.addIssue({code: "custom", message: "Creator direction state hash is invalid.", path: ["contentHash"]});
    if (new Set(state.beats.map((beat) => beat.beatId)).size !== 3)
      context.addIssue({code: "custom", message: "Creator direction state requires three unique beats.", path: ["beats"]});
  });

export type Cv001CreatorBeatDirection = z.infer<typeof cv001CreatorBeatDirectionSchema>;
export type Cv001CreatorDirectionState = z.infer<typeof cv001CreatorDirectionStateSchema>;

const creatorOperationSchema = z.discriminatedUnion("type", [
  z.object({type: z.literal("set-performance"), value: z.enum(["subtle", "standard", "big"])}).strict(),
  z.object({type: z.literal("set-tempo"), value: z.enum(["gentle", "standard", "snappy"])}).strict(),
  z.object({type: z.literal("set-hold"), value: z.enum(["short", "standard", "long"])}).strict(),
  z.object({type: z.literal("set-camera"), value: z.enum(["none", "subtle", "standard", "strong"])}).strict(),
]);

export const cv001CreatorCommandSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    beatId: identifierSchema,
    normalizedText: z.string().min(1),
    operations: z.array(creatorOperationSchema).min(1).max(4),
  })
  .strict();

export type Cv001CreatorCommand = z.infer<typeof cv001CreatorCommandSchema>;

const creatorCompiledFields = {
  schemaVersion: z.literal("1.0"),
  directionStateContentHash: hashSchema,
  sceneMotion: cv001CompiledSceneMotionSchema,
};

const cv001CreatorCompiledSceneDraftSchema = z.object(creatorCompiledFields).strict();
export const cv001CreatorCompiledSceneSchema = z
  .object({...creatorCompiledFields, contentHash: hashSchema})
  .strict()
  .superRefine((scene, context) => {
    const {contentHash, ...draft} = scene;
    if (hashCanonical(draft) !== contentHash)
      context.addIssue({code: "custom", message: "Creator compiled-scene hash is invalid.", path: ["contentHash"]});
  });

export type Cv001CreatorCompiledScene = z.infer<typeof cv001CreatorCompiledSceneSchema>;

export function parseCv001ThreeBeatScript(script: string): [string, string, string] {
  const paragraphs = script
    .trim()
    .split(/(?:\r?\n\s*){2,}/)
    .map((paragraph) => paragraph.trim().replace(/\s+/g, " "))
    .filter(Boolean);
  if (paragraphs.length !== 3)
    throw new Error("This prototype needs exactly three non-empty paragraphs.");
  return [paragraphs[0]!, paragraphs[1]!, paragraphs[2]!];
}

export function createCv001InputFromScript(
  script: string,
  baseInput = createCv001ThreeBeatProofFixture().input,
): Cv001ThreeBeatSceneInput {
  const paragraphs = parseCv001ThreeBeatScript(script);
  return cv001ThreeBeatSceneInputSchema.parse({
    ...structuredClone(baseInput),
    beats: baseInput.beats.map((beat, index) => ({...beat, text: paragraphs[index]!})),
  });
}

export function createDefaultCv001CreatorDirectionState(
  baseInput: Cv001ThreeBeatSceneInput,
): Cv001CreatorDirectionState {
  const input = cv001ThreeBeatSceneInputSchema.parse(baseInput);
  const draft = cv001CreatorDirectionStateDraftSchema.parse({
    schemaVersion: "1.0",
    baseInputContentHash: hashCanonical(input),
    beats: input.beats.map((beat) => ({
      beatId: beat.id,
      performance: "standard",
      tempo: "standard",
      hold: "standard",
      camera: "standard",
    })),
  });
  return cv001CreatorDirectionStateSchema.parse({...draft, contentHash: hashCanonical(draft)});
}

const phraseOperations: Array<{
  phrases: string[];
  operation: Cv001CreatorCommand["operations"][number];
}> = [
  {phrases: ["make it bigger", "make the reaction bigger", "make the motion stronger", "more expressive"], operation: {type: "set-performance", value: "big"}},
  {phrases: ["make it smaller", "make it more subtle", "make the reaction restrained", "more subtle"], operation: {type: "set-performance", value: "subtle"}},
  {phrases: ["hold it longer", "make the final hold longer", "longer hold"], operation: {type: "set-hold", value: "long"}},
  {phrases: ["shorten the hold", "make the hold shorter"], operation: {type: "set-hold", value: "short"}},
  {phrases: ["make it quicker", "make it snappier"], operation: {type: "set-tempo", value: "snappy"}},
  {phrases: ["make it gentler", "make it slower"], operation: {type: "set-tempo", value: "gentle"}},
  {phrases: ["push in more", "use a stronger camera move"], operation: {type: "set-camera", value: "strong"}},
  {phrases: ["use less camera movement", "reduce the camera move"], operation: {type: "set-camera", value: "subtle"}},
];

const unsupportedDirectionMessage =
  'That direction is outside this prototype. Try "make it bigger," "hold it longer," "make it snappier," or "push in more."';

export function parseCv001CreatorCommand(beatId: string, text: string): Cv001CreatorCommand {
  const normalizedText = text
    .trim()
    .toLowerCase()
    .replace(/[.!?]+/g, "")
    .replace(/\s+/g, " ");
  if (!normalizedText) throw new Error(unsupportedDirectionMessage);
  const clauses = normalizedText
    .split(/\s+(?:and)\s+|\s*[,;]\s*/)
    .map((clause) => clause.trim())
    .filter(Boolean);
  const operations = clauses.map((clause) => {
    const match = phraseOperations.find((candidate) => candidate.phrases.includes(clause));
    if (!match) throw new Error(unsupportedDirectionMessage);
    return match.operation;
  });
  const byType = new Map<string, string>();
  for (const operation of operations) {
    const existing = byType.get(operation.type);
    if (existing && existing !== operation.value)
      throw new Error("That direction contradicts itself. Choose one change for performance, tempo, hold, or camera.");
    byType.set(operation.type, operation.value);
  }
  return cv001CreatorCommandSchema.parse({schemaVersion: "1.0", beatId, normalizedText: clauses.join(" and "), operations});
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const adjustedValue = (
  track: Exclude<MotionTrack, {type: "attachment"}>,
  initial: number,
  value: number,
  multiplier: number,
) => {
  const adjusted = initial + (value - initial) * multiplier;
  if (track.type === "face")
    return track.channel === "gaze-x" ? clamp(adjusted, -1, 1) : clamp(adjusted, 0, 1);
  if (track.type === "bone" || track.property === "rotation") return clamp(adjusted, -180, 180);
  if (track.property === "scale") return clamp(adjusted, 0.5, 2);
  return clamp(adjusted, -500, 500);
};

const creatorPhases = (
  program: DirectedBeatProgram,
  direction: Cv001CreatorBeatDirection,
  beatIndex: number,
) => {
  if (direction.tempo === "standard" && direction.hold === "standard") return program.phases;
  const holdFrames =
    direction.hold === "long"
      ? 24
      : direction.hold === "short"
        ? beatIndex === 2
          ? 12
          : 8
        : program.phases.at(-1)!.endFrame - program.phases.at(-1)!.startFrame;
  const earlier = program.phases.slice(0, -1);
  const minimums = earlier.map((phase) => (phase.type === "action" && beatIndex === 1 ? 4 : 2));
  const remaining = program.durationInFrames - holdFrames - minimums.reduce((sum, value) => sum + value, 0);
  const weights =
    direction.tempo === "gentle"
      ? earlier.map((phase) => phase.type === "anticipation" ? 0.34 : phase.type === "action" ? 0.34 : phase.type === "settle" ? 0.24 : 0.08)
      : direction.tempo === "snappy"
        ? earlier.map((phase) => phase.type === "anticipation" ? 0.10 : phase.type === "action" ? 0.62 : phase.type === "settle" ? 0.20 : 0.08)
        : earlier.map((phase) => (phase.endFrame - phase.startFrame) / (program.durationInFrames - (program.phases.at(-1)!.endFrame - program.phases.at(-1)!.startFrame)));
  const weightTotal = weights.reduce((sum, value) => sum + value, 0);
  const extras = weights.map((weight) => Math.floor(remaining * weight / weightTotal));
  let unassigned = remaining - extras.reduce((sum, value) => sum + value, 0);
  for (let index = 0; unassigned > 0; index = (index + 1) % extras.length) {
    extras[index]! += 1;
    unassigned -= 1;
  }
  let cursor = 0;
  const phases = earlier.map((phase, index) => {
    const startFrame = cursor;
    cursor += minimums[index]! + extras[index]!;
    return {...phase, startFrame, endFrame: cursor};
  });
  phases.push({type: "hold", startFrame: cursor, endFrame: program.durationInFrames});
  return phases;
};

const mapFrameBetweenPhases = (
  frame: number,
  oldPhases: DirectedBeatProgram["phases"],
  nextPhases: DirectedBeatProgram["phases"],
) => {
  const phaseIndex = oldPhases.findIndex((phase) => frame >= phase.startFrame && frame < phase.endFrame);
  if (phaseIndex < 0) return Math.min(frame, nextPhases.at(-1)!.endFrame - 1);
  const oldPhase = oldPhases[phaseIndex]!;
  const nextPhase = nextPhases[phaseIndex]!;
  const oldSpan = Math.max(1, oldPhase.endFrame - oldPhase.startFrame - 1);
  const nextSpan = Math.max(1, nextPhase.endFrame - nextPhase.startFrame - 1);
  const progress = (frame - oldPhase.startFrame) / oldSpan;
  return Math.min(nextPhase.endFrame - 1, nextPhase.startFrame + Math.round(progress * nextSpan));
};

const retimeKeyframes = (
  keyframes: Exclude<MotionTrack, {type: "attachment"}>["keyframes"],
  oldPhases: DirectedBeatProgram["phases"],
  nextPhases: DirectedBeatProgram["phases"],
  duration: number,
) => {
  const mapped = keyframes.map((keyframe, index) => ({
    ...keyframe,
    frame:
      index === keyframes.length - 1 && keyframe.frame === duration - 1
        ? nextPhases.at(-1)!.startFrame
        : mapFrameBetweenPhases(keyframe.frame, oldPhases, nextPhases),
  }));
  for (let index = 1; index < mapped.length; index += 1)
    mapped[index]!.frame = Math.max(mapped[index]!.frame, mapped[index - 1]!.frame + 1);
  for (let index = mapped.length - 1; index >= 0; index -= 1)
    mapped[index]!.frame = Math.min(mapped[index]!.frame, duration - (mapped.length - index));
  return mapped;
};

const directProgram = (
  base: DirectedBeatProgram,
  direction: Cv001CreatorBeatDirection,
  beatIndex: number,
): DirectedBeatProgram => {
  const isDefault = direction.performance === "standard" && direction.tempo === "standard" && direction.hold === "standard" && direction.camera === "standard";
  if (isDefault) return base;
  const phases = creatorPhases(base, direction, beatIndex);
  const retime = direction.tempo !== "standard" || direction.hold !== "standard";
  const performanceMultiplier = direction.performance === "big" ? 1.25 : direction.performance === "subtle" ? 0.8 : 1;
  const cameraMultiplier = direction.camera === "strong" ? 1.4 : direction.camera === "subtle" ? 0.7 : direction.camera === "none" ? 0 : 1;
  const tracks = base.tracks.map((track) => {
    if (track.type === "attachment")
      return retime
        ? {...track, startFrame: track.startFrame === 0 ? 0 : mapFrameBetweenPhases(track.startFrame, base.phases, phases), endFrame: base.durationInFrames}
        : track;
    const multiplier = track.type === "camera" ? cameraMultiplier : performanceMultiplier;
    const initial = track.keyframes[0]!.value;
    let keyframes = track.keyframes.map((keyframe) => ({
      ...keyframe,
      value: adjustedValue(track, initial, keyframe.value, multiplier),
    }));
    if (track.type === "camera" && multiplier > 0 && multiplier < 1) {
      const values = keyframes.map((keyframe) => keyframe.value);
      const range = Math.max(...values) - Math.min(...values);
      const minimum = track.property === "scale" ? 0.015 : 8;
      if (range > 0 && range < minimum) {
        const correction = minimum / range;
        keyframes = keyframes.map((keyframe) => ({...keyframe, value: initial + (keyframe.value - initial) * correction}));
      }
    }
    if (retime) keyframes = retimeKeyframes(keyframes, base.phases, phases, base.durationInFrames);
    return {...track, keyframes};
  });
  return assertMotionProgram(
    directedBeatProgramSchema.parse({
      ...base,
      id: `${base.id}-creator-${hashCanonical(direction).slice(0, 10)}`,
      phases,
      tracks,
    }),
    {rigContract: cv001RigContract},
  );
};

export function compileCv001CreatorScene({
  baseInput: rawInput,
  directionState: rawDirectionState,
  renderPlan: rawRenderPlan,
}: {
  baseInput: Cv001ThreeBeatSceneInput;
  directionState: Cv001CreatorDirectionState;
  renderPlan: FrameAccurateRenderPlan;
}): Cv001CreatorCompiledScene {
  const baseInput = cv001ThreeBeatSceneInputSchema.parse(rawInput);
  const directionState = cv001CreatorDirectionStateSchema.parse(rawDirectionState);
  const renderPlan = frameAccurateRenderPlanSchema.parse(rawRenderPlan);
  if (directionState.baseInputContentHash !== hashCanonical(baseInput))
    throw new Error("Creator direction state does not match the fixed base input.");
  directionState.beats.forEach((direction, index) => {
    if (direction.beatId !== baseInput.beats[index]!.id)
      throw new Error("Creator direction beats must match the fixed beat order.");
  });
  const baseline = compileCv001ThreeBeatScene({input: baseInput, renderPlan});
  const bindings = baseline.bindings.map((binding, index) => {
    const program = directProgram(binding.program, directionState.beats[index]!, index);
    const issues = getCv001CompiledBeatIssues(baseInput.beats[index]!, program);
    if (issues.length > 0)
      throw new Error(`Creator direction failed motion validation: ${issues.join(" ")}`);
    return program === binding.program
      ? binding
      : createDirectedShotMotionBinding(baseInput.beats[index]!, program);
  }) as Cv001CompiledSceneMotion["bindings"];
  const {contentHash: _baselineHash, ...sceneDraft} = baseline;
  void _baselineHash;
  const sceneMotion = cv001CompiledSceneMotionSchema.parse({
    ...sceneDraft,
    bindings,
    contentHash: hashCanonical({...sceneDraft, bindings}),
  });
  const draft = cv001CreatorCompiledSceneDraftSchema.parse({
    schemaVersion: "1.0",
    directionStateContentHash: directionState.contentHash,
    sceneMotion,
  });
  return cv001CreatorCompiledSceneSchema.parse({...draft, contentHash: hashCanonical(draft)});
}

export function applyCv001CreatorCommand(
  state: Cv001CreatorDirectionState,
  command: Cv001CreatorCommand,
): Cv001CreatorDirectionState {
  const current = cv001CreatorDirectionStateSchema.parse(state);
  const parsedCommand = cv001CreatorCommandSchema.parse(command);
  const index = current.beats.findIndex((beat) => beat.beatId === parsedCommand.beatId);
  if (index < 0) throw new Error(`Unknown creator beat: ${parsedCommand.beatId}`);
  const beats = structuredClone(current.beats);
  const target = beats[index]!;
  parsedCommand.operations.forEach((operation) => {
    if (operation.type === "set-performance") target.performance = operation.value;
    if (operation.type === "set-tempo") target.tempo = operation.value;
    if (operation.type === "set-hold") target.hold = operation.value;
    if (operation.type === "set-camera") target.camera = operation.value;
  });
  const draft = cv001CreatorDirectionStateDraftSchema.parse({
    schemaVersion: "1.0",
    baseInputContentHash: current.baseInputContentHash,
    beats,
  });
  const next = cv001CreatorDirectionStateSchema.parse({...draft, contentHash: hashCanonical(draft)});
  if (next.contentHash === current.contentHash)
    throw new Error("No change needed. This beat already uses that direction.");
  return next;
}

const transactionFields = {
  schemaVersion: z.literal("1.0"),
  id: z.string().regex(/^edit-\d{4}$/),
  sequence: z.number().int().positive(),
  beatId: identifierSchema,
  command: cv001CreatorCommandSchema,
  beforeDirectionState: cv001CreatorDirectionStateSchema,
  afterDirectionState: cv001CreatorDirectionStateSchema,
  beforeCompiledHash: hashSchema,
  afterCompiledHash: hashSchema,
};

const cv001CreatorEditTransactionDraftSchema = z.object(transactionFields).strict();
export const cv001CreatorEditTransactionSchema = z
  .object({...transactionFields, contentHash: hashSchema})
  .strict()
  .superRefine((transaction, context) => {
    const {contentHash, ...draft} = transaction;
    if (hashCanonical(draft) !== contentHash)
      context.addIssue({code: "custom", message: "Creator edit transaction hash is invalid.", path: ["contentHash"]});
  });

export type Cv001CreatorEditTransaction = z.infer<typeof cv001CreatorEditTransactionSchema>;

const projectFields = {
  schemaVersion: z.literal("1.0"),
  projectId: z.literal(CV001_CREATOR_PROJECT_ID),
  title: z.string().trim().min(1),
  script: z.string().min(1),
  baseInput: cv001ThreeBeatSceneInputSchema,
  directionState: cv001CreatorDirectionStateSchema,
  history: z.array(cv001CreatorEditTransactionSchema),
  historyCursor: z.number().int().nonnegative(),
  selectedBeatId: identifierSchema,
};

const cv001CreatorProjectStateDraftSchema = z.object(projectFields).strict();
export const cv001CreatorProjectStateSchema = z
  .object({...projectFields, contentHash: hashSchema})
  .strict()
  .superRefine((project, context) => {
    const {contentHash, ...draft} = project;
    if (hashCanonical(draft) !== contentHash)
      context.addIssue({code: "custom", message: "Creator project hash is invalid.", path: ["contentHash"]});
    if (project.historyCursor > project.history.length)
      context.addIssue({code: "custom", message: "Creator history cursor exceeds the edit history.", path: ["historyCursor"]});
    if (!project.baseInput.beats.some((beat) => beat.id === project.selectedBeatId))
      context.addIssue({code: "custom", message: "Selected creator beat is invalid.", path: ["selectedBeatId"]});
  });

export type Cv001CreatorProjectState = z.infer<typeof cv001CreatorProjectStateSchema>;

const sealProject = (draft: z.infer<typeof cv001CreatorProjectStateDraftSchema>) =>
  cv001CreatorProjectStateSchema.parse({...draft, contentHash: hashCanonical(draft)});

export function createCv001CreatorProject({title, script}: {title: string; script: string}): Cv001CreatorProjectState {
  const fixture = createCv001ThreeBeatProofFixture();
  const baseInput = createCv001InputFromScript(script, fixture.input);
  const directionState = createDefaultCv001CreatorDirectionState(baseInput);
  const draft = cv001CreatorProjectStateDraftSchema.parse({
    schemaVersion: "1.0",
    projectId: CV001_CREATOR_PROJECT_ID,
    title,
    script: parseCv001ThreeBeatScript(script).join("\n\n"),
    baseInput,
    directionState,
    history: [],
    historyCursor: 0,
    selectedBeatId: baseInput.beats[0].id,
  });
  return sealProject(draft);
}

export function updateCv001CreatorSelection(project: Cv001CreatorProjectState, beatId: string) {
  const current = cv001CreatorProjectStateSchema.parse(project);
  if (!current.baseInput.beats.some((beat) => beat.id === beatId)) throw new Error(`Unknown creator beat: ${beatId}`);
  const {contentHash: _hash, ...draft} = current;
  void _hash;
  return sealProject({...draft, selectedBeatId: beatId});
}

export function commitCv001CreatorCommand({
  project: rawProject,
  command: rawCommand,
  renderPlan,
}: {
  project: Cv001CreatorProjectState;
  command: Cv001CreatorCommand;
  renderPlan: FrameAccurateRenderPlan;
}): {project: Cv001CreatorProjectState; compiled: Cv001CreatorCompiledScene; transaction: Cv001CreatorEditTransaction} {
  const project = cv001CreatorProjectStateSchema.parse(rawProject);
  const command = cv001CreatorCommandSchema.parse(rawCommand);
  const beforeCompiled = compileCv001CreatorScene({baseInput: project.baseInput, directionState: project.directionState, renderPlan});
  const afterDirectionState = applyCv001CreatorCommand(project.directionState, command);
  const afterCompiled = compileCv001CreatorScene({baseInput: project.baseInput, directionState: afterDirectionState, renderPlan});
  const changedIndex = project.baseInput.beats.findIndex((beat) => beat.id === command.beatId);
  beforeCompiled.sceneMotion.bindings.forEach((binding, index) => {
    if (index !== changedIndex && binding.contentHash !== afterCompiled.sceneMotion.bindings[index]!.contentHash)
      throw new Error("Creator edit changed an unrelated beat binding.");
  });
  const sequence = project.historyCursor + 1;
  const transactionDraft = cv001CreatorEditTransactionDraftSchema.parse({
    schemaVersion: "1.0",
    id: `edit-${String(sequence).padStart(4, "0")}`,
    sequence,
    beatId: command.beatId,
    command,
    beforeDirectionState: project.directionState,
    afterDirectionState,
    beforeCompiledHash: beforeCompiled.contentHash,
    afterCompiledHash: afterCompiled.contentHash,
  });
  const transaction = cv001CreatorEditTransactionSchema.parse({...transactionDraft, contentHash: hashCanonical(transactionDraft)});
  const history = [...project.history.slice(0, project.historyCursor), transaction];
  const {contentHash: _hash, ...draft} = project;
  void _hash;
  return {
    project: sealProject({...draft, directionState: afterDirectionState, history, historyCursor: history.length, selectedBeatId: command.beatId}),
    compiled: afterCompiled,
    transaction,
  };
}

export function undoCv001CreatorEdit(project: Cv001CreatorProjectState): Cv001CreatorProjectState {
  const current = cv001CreatorProjectStateSchema.parse(project);
  if (current.historyCursor === 0) throw new Error("There is no direction change to undo.");
  const transaction = current.history[current.historyCursor - 1]!;
  const {contentHash: _hash, ...draft} = current;
  void _hash;
  return sealProject({...draft, directionState: transaction.beforeDirectionState, historyCursor: current.historyCursor - 1, selectedBeatId: transaction.beatId});
}

export function redoCv001CreatorEdit(project: Cv001CreatorProjectState): Cv001CreatorProjectState {
  const current = cv001CreatorProjectStateSchema.parse(project);
  if (current.historyCursor >= current.history.length) throw new Error("There is no direction change to redo.");
  const transaction = current.history[current.historyCursor]!;
  const {contentHash: _hash, ...draft} = current;
  void _hash;
  return sealProject({...draft, directionState: transaction.afterDirectionState, historyCursor: current.historyCursor + 1, selectedBeatId: transaction.beatId});
}

export function restoreCv001CreatorProject(serialized: string, renderPlan: FrameAccurateRenderPlan): Cv001CreatorProjectState {
  const project = cv001CreatorProjectStateSchema.parse(JSON.parse(serialized));
  if (project.baseInput.planContentHash !== renderPlan.contentHash)
    throw new Error("Saved creator project belongs to a stale render plan.");
  const compiled = compileCv001CreatorScene({baseInput: project.baseInput, directionState: project.directionState, renderPlan});
  const activeTransaction = project.historyCursor > 0 ? project.history[project.historyCursor - 1] : undefined;
  if (activeTransaction && activeTransaction.afterCompiledHash !== compiled.contentHash)
    throw new Error("Saved creator project does not reproduce its compiled motion hash.");
  return project;
}
