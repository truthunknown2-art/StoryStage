import {z} from "zod";
import {hashCanonical} from "./canonical-hash";
import {
  cv002ArtDirectionSelectionSchema,
  validateCv002ArtDirectionSelection,
  type Cv002ArtDirectionSelection,
} from "./cv002-art-direction";
import {hashSchema, identifierSchema} from "./model";

export const cv002GrammarSchema = z.enum(["kids-adventure", "weird-history"]);
export const cv002BeatRoleSchema = z.enum([
  "setup",
  "action",
  "reaction",
  "reveal",
  "explanation",
  "punchline",
  "transition",
]);
export const cv002SourceRangeSchema = z.object({start: z.number().int().nonnegative(), end: z.number().int().positive()}).strict().superRefine((range, context) => {
  if (range.end <= range.start) context.addIssue({code: "custom", message: "Source range end must follow its start."});
});

const beatFields = {
  schemaVersion: z.literal("1.0"),
  id: identifierSchema,
  sourceRange: cv002SourceRangeSchema,
  text: z.string().min(1),
  role: cv002BeatRoleSchema,
};
const cv002BeatDraftSchema = z.object(beatFields).strict();
export const cv002BeatSchema = z.object({...beatFields, contentHash: hashSchema}).strict().superRefine((beat, context) => {
  const {contentHash, ...draft} = beat;
  if (hashCanonical(draft) !== contentHash) context.addIssue({code: "custom", message: "Story beat hash is invalid.", path: ["contentHash"]});
});

const sceneFields = {
  schemaVersion: z.literal("1.0"),
  id: identifierSchema,
  sourceRange: cv002SourceRangeSchema,
  beats: z.array(cv002BeatSchema).min(1),
};
const cv002SceneDraftSchema = z.object(sceneFields).strict();
export const cv002SceneSchema = z.object({...sceneFields, contentHash: hashSchema}).strict().superRefine((scene, context) => {
  const {contentHash, ...draft} = scene;
  if (hashCanonical(draft) !== contentHash) context.addIssue({code: "custom", message: "Story scene hash is invalid.", path: ["contentHash"]});
});

const graphFields = {
  schemaVersion: z.literal("1.0"),
  sourceText: z.string().min(1),
  grammar: cv002GrammarSchema,
  scenes: z.array(cv002SceneSchema).min(1),
};
const cv002StoryGraphDraftSchema = z.object(graphFields).strict();
export const cv002StoryGraphSchema = z.object({...graphFields, contentHash: hashSchema}).strict().superRefine((graph, context) => {
  const {contentHash, ...draft} = graph;
  if (hashCanonical(draft) !== contentHash) context.addIssue({code: "custom", message: "Story graph hash is invalid.", path: ["contentHash"]});
  const beats = graph.scenes.flatMap((scene) => scene.beats);
  let previousEnd = 0;
  beats.forEach((beat, index) => {
    const {start, end} = beat.sourceRange;
    if (end > graph.sourceText.length)
      context.addIssue({code: "custom", message: "Beat source span exceeds the source text length.", path: ["scenes"]});
    if (graph.sourceText.slice(start, end) !== beat.text)
      context.addIssue({code: "custom", message: "Beat text does not match its exact source span.", path: ["scenes"]});
    const expectedId = `beat-${hashCanonical({sourceRange: beat.sourceRange, text: beat.text}).slice(0, 12)}`;
    if (beat.id !== expectedId)
      context.addIssue({code: "custom", message: "Beat ID is not derived from its exact source span and text.", path: ["scenes"]});
    if (index > 0 && start < previousEnd)
      context.addIssue({code: "custom", message: "Beat source spans must remain ordered and non-overlapping.", path: ["scenes"]});
    if (/\S/.test(graph.sourceText.slice(previousEnd, start)))
      context.addIssue({code: "custom", message: "Non-whitespace source text is missing from the story graph.", path: ["scenes"]});
    previousEnd = end;
  });
  if (beats.length > 0 && /\S/.test(graph.sourceText.slice(previousEnd)))
    context.addIssue({code: "custom", message: "Trailing source text is missing from the story graph.", path: ["scenes"]});
  graph.scenes.forEach((scene, index) => {
    const first = scene.beats[0]!;
    const last = scene.beats.at(-1)!;
    if (scene.sourceRange.end > graph.sourceText.length)
      context.addIssue({code: "custom", message: "Scene source span exceeds the source text length.", path: ["scenes", index, "sourceRange"]});
    if (scene.sourceRange.start !== first.sourceRange.start || scene.sourceRange.end !== last.sourceRange.end)
      context.addIssue({code: "custom", message: "Scene source span must cover its beats exactly.", path: ["scenes", index, "sourceRange"]});
    const expectedId = `scene-${hashCanonical({sourceRange: scene.sourceRange, beatIds: scene.beats.map((beat) => beat.id)}).slice(0, 12)}`;
    if (scene.id !== expectedId)
      context.addIssue({code: "custom", message: "Scene ID is not derived from its exact span and beat IDs.", path: ["scenes", index, "id"]});
  });
  if (new Set(beats.map((beat) => beat.id)).size !== beats.length)
    context.addIssue({code: "custom", message: "Story graph beat IDs must be unique.", path: ["scenes"]});
  if (new Set(graph.scenes.map((scene) => scene.id)).size !== graph.scenes.length)
    context.addIssue({code: "custom", message: "Story graph scene IDs must be unique.", path: ["scenes"]});
});

export type Cv002Grammar = z.infer<typeof cv002GrammarSchema>;
export type Cv002BeatRole = z.infer<typeof cv002BeatRoleSchema>;
export type Cv002Beat = z.infer<typeof cv002BeatSchema>;
export type Cv002Scene = z.infer<typeof cv002SceneSchema>;
export type Cv002StoryGraph = z.infer<typeof cv002StoryGraphSchema>;

const directionFields = {
  schemaVersion: z.literal("1.0"),
  beatId: identifierSchema,
  beatContentHash: hashSchema,
  staging: z.enum(["character-led", "environment-led", "presenter-led", "evidence-led", "diagram-led"]),
  shotSize: z.enum(["wide", "medium", "close-up", "insert"]),
  treatment: z.enum(["character-performance", "reaction", "environment", "illustrated-insert", "presenter", "evidence", "reconstruction", "diagram", "kinetic-type"]),
  cameraIntent: z.enum(["hold", "gentle-push", "reframe", "locked", "fast-push", "snap-reframe"]),
  transition: z.enum(["camera-carry", "foreground-wipe", "brief-dissolve", "hard-cut", "match-cut"]),
  performanceIntent: z.enum(["gaze-led", "readable-action", "clear-reaction", "comprehension-hold", "restrained-presenter", "evidence-priority"]),
  textEmphasis: z.enum(["none", "keyword", "date", "quote", "full-phrase"]),
  sfxIntent: z.enum(["none", "action-accent", "reaction-pop", "environment-detail", "paper-hit", "type-hit", "cut-whoosh"]),
  musicIntent: z.enum(["playful-bed", "gentle-discovery", "wonder-rise", "editorial-pulse", "tension-bed", "dry-comedy-drop"]),
};
const cv002BeatDirectionDraftSchema = z.object(directionFields).strict();
export const cv002BeatDirectionSchema = z.object({...directionFields, contentHash: hashSchema}).strict().superRefine((direction, context) => {
  const {contentHash, ...draft} = direction;
  if (hashCanonical(draft) !== contentHash) context.addIssue({code: "custom", message: "Beat direction hash is invalid.", path: ["contentHash"]});
});

const directionDraftFields = {
  schemaVersion: z.literal("1.0"),
  grammar: cv002GrammarSchema,
  graphContentHash: hashSchema,
  directions: z.array(cv002BeatDirectionSchema).min(1),
  status: z.literal("direction-draft-ready"),
  animationStatus: z.literal("templates-unassigned"),
};
const cv002DirectionDraftDraftSchema = z.object(directionDraftFields).strict();
export const cv002DirectionDraftSchema = z.object({...directionDraftFields, contentHash: hashSchema}).strict().superRefine((draft, context) => {
  const {contentHash, ...payload} = draft;
  if (hashCanonical(payload) !== contentHash) context.addIssue({code: "custom", message: "Direction draft hash is invalid.", path: ["contentHash"]});
  if (new Set(draft.directions.map((direction) => direction.beatId)).size !== draft.directions.length)
    context.addIssue({code: "custom", message: "Direction draft may target each beat only once.", path: ["directions"]});
});

export type Cv002BeatDirection = z.infer<typeof cv002BeatDirectionSchema>;
export type Cv002DirectionDraft = z.infer<typeof cv002DirectionDraftSchema>;

const wordCount = (value: string) => value.trim().split(/\s+/).filter(Boolean).length;
const sealBeat = (draft: z.infer<typeof cv002BeatDraftSchema>): Cv002Beat => cv002BeatSchema.parse({...draft, contentHash: hashCanonical(draft)});
const sealScene = (draft: z.infer<typeof cv002SceneDraftSchema>): Cv002Scene => cv002SceneSchema.parse({...draft, contentHash: hashCanonical(draft)});
const sealGraph = (draft: z.infer<typeof cv002StoryGraphDraftSchema>): Cv002StoryGraph => cv002StoryGraphSchema.parse({...draft, contentHash: hashCanonical(draft)});

const trimmedRange = (source: string, start: number, end: number) => {
  while (start < end && /\s/.test(source[start]!)) start += 1;
  while (end > start && /\s/.test(source[end - 1]!)) end -= 1;
  return {start, end};
};

function paragraphRanges(sourceText: string) {
  const ranges: Array<{start: number; end: number}> = [];
  const separator = /\r?\n[\t ]*\r?\n/g;
  let cursor = 0;
  for (const match of sourceText.matchAll(separator)) {
    const range = trimmedRange(sourceText, cursor, match.index!);
    if (range.end > range.start) ranges.push(range);
    cursor = match.index! + match[0].length;
  }
  const range = trimmedRange(sourceText, cursor, sourceText.length);
  if (range.end > range.start) ranges.push(range);
  return ranges;
}

const sentenceRanges = (source: string, range: {start: number; end: number}) => {
  const text = source.slice(range.start, range.end);
  const ends = [...text.matchAll(/[.!?]+["'”’)]*(?=\s|$)/g)].map((match) => range.start + match.index! + match[0].length);
  const ranges: Array<{start: number; end: number}> = [];
  let cursor = range.start;
  for (const end of [...ends, range.end]) {
    const candidate = trimmedRange(source, cursor, end);
    if (candidate.end > candidate.start) ranges.push(candidate);
    cursor = end;
  }
  return ranges;
};

const splitLongRange = (source: string, range: {start: number; end: number}) => {
  if (wordCount(source.slice(range.start, range.end)) <= 28) return [range];
  const text = source.slice(range.start, range.end);
  const candidates = [...text.matchAll(/[;:—–]|,\s+(?=(?:and|but|so|yet|because|while|when|which|who)\b)/gi)]
    .map((match) => range.start + match.index! + (match[0].startsWith(",") ? 1 : match[0].length));
  if (candidates.length === 0) return [range];
  const target = range.start + Math.floor((range.end - range.start) / 2);
  const split = candidates.sort((left, right) => Math.abs(left - target) - Math.abs(right - target))[0]!;
  const left = trimmedRange(source, range.start, split);
  const right = trimmedRange(source, split, range.end);
  return wordCount(source.slice(left.start, left.end)) >= 5 && wordCount(source.slice(right.start, right.end)) >= 5 ? [left, right] : [range];
};

function classifyRole(text: string, isFirst: boolean, isLast: boolean): Cv002BeatRole {
  const normalized = text.toLowerCase();
  if (/^(meanwhile|then|later|years? later|afterward|next)\b/.test(normalized)) return "transition";
  if (/\b(reveal(?:ed|s)?|discover(?:ed|s)?|turned out|in fact|secret|actually)\b/.test(normalized)) return "reveal";
  if (/[!]|\b(gasp(?:ed|s)?|stunned|shocked|laughed|cried|could not believe|couldn't believe)\b/.test(normalized)) return "reaction";
  if (isLast && /\b(but|ironically|absurdly|ridiculously|unfortunately|of course|somehow|accidentally|jokes?|punchline)\b/.test(normalized)) return "punchline";
  if (/\b(ran|walked|jumped|lifted|opened|closed|grabbed|carried|built|fought|escaped|reached|moved|threw|pulled|pushed)\b/.test(normalized)) return "action";
  if (!isFirst && /\b(because|therefore|means|meant|was|were|is|are|had|has)\b/.test(normalized)) return "explanation";
  return isFirst ? "setup" : "explanation";
}

const beatId = (sourceRange: {start: number; end: number}, text: string) => `beat-${hashCanonical({sourceRange, text}).slice(0, 12)}`;
const makeBeat = (sourceText: string, sourceRange: {start: number; end: number}, role: Cv002BeatRole) => sealBeat(cv002BeatDraftSchema.parse({
  schemaVersion: "1.0",
  id: beatId(sourceRange, sourceText.slice(sourceRange.start, sourceRange.end)),
  sourceRange,
  text: sourceText.slice(sourceRange.start, sourceRange.end),
  role,
}));

const rebuildGraph = (sourceText: string, grammar: Cv002Grammar, beats: Cv002Beat[], breakIndices: Set<number>) => {
  const starts = [...new Set([0, ...breakIndices])].filter((index) => index >= 0 && index < beats.length).sort((left, right) => left - right);
  const scenes = starts.map((start, ordinal) => {
    const end = starts[ordinal + 1] ?? beats.length;
    const sceneBeats = beats.slice(start, end);
    const sourceRange = {start: sceneBeats[0]!.sourceRange.start, end: sceneBeats.at(-1)!.sourceRange.end};
    const id = `scene-${hashCanonical({sourceRange, beatIds: sceneBeats.map((beat) => beat.id)}).slice(0, 12)}`;
    return sealScene(cv002SceneDraftSchema.parse({schemaVersion: "1.0", id, sourceRange, beats: sceneBeats}));
  });
  return sealGraph(cv002StoryGraphDraftSchema.parse({schemaVersion: "1.0", sourceText, grammar, scenes}));
};

export function createCv002StoryGraph(sourceText: string, grammar: Cv002Grammar): Cv002StoryGraph {
  const parsedGrammar = cv002GrammarSchema.parse(grammar);
  const words = wordCount(sourceText);
  if (words < 80 || words > 400) throw new Error("Draft breakdown supports scripts from 80 to 400 words.");
  const paragraphs = paragraphRanges(sourceText);
  if (paragraphs.length < 1 || paragraphs.length > 6) throw new Error("Draft breakdown supports one to six non-empty paragraphs.");
  const beats: Cv002Beat[] = [];
  const breaks = new Set<number>();
  paragraphs.forEach((paragraph) => {
    breaks.add(beats.length);
    const ranges = sentenceRanges(sourceText, paragraph).flatMap((range) => splitLongRange(sourceText, range));
    ranges.forEach((range, index) => beats.push(makeBeat(sourceText, range, classifyRole(sourceText.slice(range.start, range.end), index === 0, index === ranges.length - 1))));
  });
  return rebuildGraph(sourceText, parsedGrammar, beats, breaks);
}

export function reconstructCv002Source(graph: Cv002StoryGraph) {
  const parsed = cv002StoryGraphSchema.parse(graph);
  const beats = parsed.scenes.flatMap((scene) => scene.beats);
  let cursor = 0;
  let reconstructed = "";
  beats.forEach((beat) => {
    reconstructed += parsed.sourceText.slice(cursor, beat.sourceRange.start);
    reconstructed += beat.text;
    cursor = beat.sourceRange.end;
  });
  return reconstructed + parsed.sourceText.slice(cursor);
}

const sealDirection = (draft: z.infer<typeof cv002BeatDirectionDraftSchema>): Cv002BeatDirection => cv002BeatDirectionSchema.parse({...draft, contentHash: hashCanonical(draft)});

function kidsDirection(beat: Cv002Beat): Cv002BeatDirection {
  const role = beat.role;
  const draft = cv002BeatDirectionDraftSchema.parse({
    schemaVersion: "1.0",
    beatId: beat.id,
    beatContentHash: beat.contentHash,
    staging: ["setup", "reveal", "explanation"].includes(role) ? "environment-led" : "character-led",
    shotSize: role === "reaction" || role === "punchline" ? "close-up" : role === "action" ? "wide" : "medium",
    treatment: role === "reaction" || role === "punchline" ? "reaction" : role === "setup" || role === "explanation" ? "environment" : role === "reveal" ? "illustrated-insert" : "character-performance",
    cameraIntent: role === "action" ? "reframe" : role === "reveal" ? "gentle-push" : "hold",
    transition: role === "transition" ? "foreground-wipe" : role === "reaction" ? "brief-dissolve" : "camera-carry",
    performanceIntent: role === "reaction" || role === "punchline" ? "clear-reaction" : role === "action" ? "readable-action" : role === "explanation" ? "comprehension-hold" : "gaze-led",
    textEmphasis: role === "reveal" || role === "punchline" ? "keyword" : "none",
    sfxIntent: role === "action" ? "action-accent" : role === "reaction" || role === "punchline" ? "reaction-pop" : role === "setup" ? "environment-detail" : "none",
    musicIntent: role === "reveal" ? "wonder-rise" : role === "setup" || role === "explanation" ? "gentle-discovery" : "playful-bed",
  });
  return sealDirection(draft);
}

function historyDirection(beat: Cv002Beat): Cv002BeatDirection {
  const role = beat.role;
  const hasDate = /\b(?:1[0-9]{3}|20[0-9]{2})\b/.test(beat.text);
  const hasQuote = /[“”"]/.test(beat.text);
  const treatment = role === "explanation" ? "diagram" : role === "reveal" ? "evidence" : role === "action" ? "reconstruction" : role === "punchline" ? "kinetic-type" : "presenter";
  const draft = cv002BeatDirectionDraftSchema.parse({
    schemaVersion: "1.0",
    beatId: beat.id,
    beatContentHash: beat.contentHash,
    staging: treatment === "diagram" ? "diagram-led" : ["evidence", "reconstruction"].includes(treatment) ? "evidence-led" : "presenter-led",
    shotSize: ["diagram", "evidence", "reconstruction", "kinetic-type"].includes(treatment) ? "insert" : role === "punchline" ? "close-up" : "medium",
    treatment,
    cameraIntent: role === "reveal" || role === "punchline" ? "fast-push" : role === "transition" ? "snap-reframe" : "locked",
    transition: role === "reveal" ? "match-cut" : "hard-cut",
    performanceIntent: ["evidence", "reconstruction", "diagram"].includes(treatment) ? "evidence-priority" : "restrained-presenter",
    textEmphasis: hasDate ? "date" : hasQuote ? "quote" : ["reveal", "explanation", "punchline"].includes(role) ? "keyword" : "none",
    sfxIntent: role === "punchline" ? "type-hit" : role === "transition" ? "cut-whoosh" : role === "reveal" || role === "explanation" ? "paper-hit" : "none",
    musicIntent: role === "punchline" ? "dry-comedy-drop" : role === "reveal" ? "tension-bed" : "editorial-pulse",
  });
  return sealDirection(draft);
}

export function compileCv002DirectionDraft(graph: Cv002StoryGraph): Cv002DirectionDraft {
  const parsed = cv002StoryGraphSchema.parse(graph);
  const directions = parsed.scenes.flatMap((scene) => scene.beats).map((beat) => parsed.grammar === "kids-adventure" ? kidsDirection(beat) : historyDirection(beat));
  const draft = cv002DirectionDraftDraftSchema.parse({schemaVersion: "1.0", grammar: parsed.grammar, graphContentHash: parsed.contentHash, directions, status: "direction-draft-ready", animationStatus: "templates-unassigned"});
  return cv002DirectionDraftSchema.parse({...draft, contentHash: hashCanonical(draft)});
}

export const cv002GraphOperationSchema = z.discriminatedUnion("type", [
  z.object({type: z.literal("split-beat"), beatId: identifierSchema, atOffset: z.number().int().positive()}).strict(),
  z.object({type: z.literal("merge-beats"), leftBeatId: identifierSchema, rightBeatId: identifierSchema}).strict(),
  z.object({type: z.literal("set-scene-boundary"), beatId: identifierSchema, enabled: z.boolean()}).strict(),
  z.object({type: z.literal("set-role"), beatId: identifierSchema, role: cv002BeatRoleSchema}).strict(),
]);
export type Cv002GraphOperation = z.infer<typeof cv002GraphOperationSchema>;

const graphParts = (graph: Cv002StoryGraph) => {
  const beats = graph.scenes.flatMap((scene) => scene.beats);
  const breaks = new Set<number>();
  let cursor = 0;
  graph.scenes.forEach((scene) => {breaks.add(cursor); cursor += scene.beats.length;});
  return {beats, breaks};
};

export function applyCv002GraphOperation(graph: Cv002StoryGraph, rawOperation: Cv002GraphOperation): Cv002StoryGraph {
  const current = cv002StoryGraphSchema.parse(graph);
  const operation = cv002GraphOperationSchema.parse(rawOperation);
  const {beats, breaks} = graphParts(current);
  if (operation.type === "split-beat") {
    const index = beats.findIndex((beat) => beat.id === operation.beatId);
    if (index < 0) throw new Error(`Unknown story beat: ${operation.beatId}`);
    const target = beats[index]!;
    if (operation.atOffset <= target.sourceRange.start || operation.atOffset >= target.sourceRange.end)
      throw new Error("Split cursor must fall inside the selected beat.");
    const leftRange = trimmedRange(current.sourceText, target.sourceRange.start, operation.atOffset);
    const rightRange = trimmedRange(current.sourceText, operation.atOffset, target.sourceRange.end);
    if (leftRange.end <= leftRange.start || rightRange.end <= rightRange.start)
      throw new Error("Split cursor must leave text on both sides.");
    const next = [makeBeat(current.sourceText, leftRange, target.role), makeBeat(current.sourceText, rightRange, classifyRole(current.sourceText.slice(rightRange.start, rightRange.end), false, true))];
    beats.splice(index, 1, ...next);
    const shifted = new Set([...breaks].map((breakIndex) => breakIndex > index ? breakIndex + 1 : breakIndex));
    return rebuildGraph(current.sourceText, current.grammar, beats, shifted);
  }
  if (operation.type === "merge-beats") {
    const leftIndex = beats.findIndex((beat) => beat.id === operation.leftBeatId);
    const rightIndex = beats.findIndex((beat) => beat.id === operation.rightBeatId);
    if (leftIndex < 0 || rightIndex !== leftIndex + 1) throw new Error("Only adjacent beats can be merged in source order.");
    const left = beats[leftIndex]!;
    const right = beats[rightIndex]!;
    const range = {start: left.sourceRange.start, end: right.sourceRange.end};
    beats.splice(leftIndex, 2, makeBeat(current.sourceText, range, left.role));
    const shifted = new Set([...breaks].filter((breakIndex) => breakIndex !== rightIndex).map((breakIndex) => breakIndex > rightIndex ? breakIndex - 1 : breakIndex));
    return rebuildGraph(current.sourceText, current.grammar, beats, shifted);
  }
  if (operation.type === "set-scene-boundary") {
    const index = beats.findIndex((beat) => beat.id === operation.beatId);
    if (index <= 0) throw new Error("The first beat must remain the first scene boundary.");
    if (breaks.has(index) === operation.enabled)
      throw new Error(operation.enabled ? "No change needed. That beat already starts a scene." : "No change needed. That beat does not start a scene.");
    if (operation.enabled) breaks.add(index); else breaks.delete(index);
    return rebuildGraph(current.sourceText, current.grammar, beats, breaks);
  }
  const index = beats.findIndex((beat) => beat.id === operation.beatId);
  if (index < 0) throw new Error(`Unknown story beat: ${operation.beatId}`);
  if (beats[index]!.role === operation.role) throw new Error("No change needed. That beat already uses this role.");
  beats[index] = makeBeat(current.sourceText, beats[index]!.sourceRange, operation.role);
  return rebuildGraph(current.sourceText, current.grammar, beats, breaks);
}

const transactionFields = {
  schemaVersion: z.literal("1.0"),
  id: z.string().regex(/^edit-\d{4}$/),
  sequence: z.number().int().positive(),
  operation: cv002GraphOperationSchema,
  beforeGraph: cv002StoryGraphSchema,
  afterGraph: cv002StoryGraphSchema,
  beforeDirectionHash: hashSchema,
  afterDirectionHash: hashSchema,
};
const cv002TransactionDraftSchema = z.object(transactionFields).strict();
export const cv002TransactionSchema = z.object({...transactionFields, contentHash: hashSchema}).strict().superRefine((transaction, context) => {
  const {contentHash, ...draft} = transaction;
  if (hashCanonical(draft) !== contentHash) context.addIssue({code: "custom", message: "Story edit transaction hash is invalid.", path: ["contentHash"]});
  if (transaction.beforeGraph.contentHash === transaction.afterGraph.contentHash)
    context.addIssue({code: "custom", message: "Story edit transaction must change the graph.", path: ["afterGraph"]});
  if (transaction.beforeDirectionHash === transaction.afterDirectionHash)
    context.addIssue({code: "custom", message: "Story edit transaction must change the direction draft.", path: ["afterDirectionHash"]});
});
export type Cv002Transaction = z.infer<typeof cv002TransactionSchema>;

const projectFields = {
  schemaVersion: z.literal("1.0"),
  title: z.string().trim().min(1),
  sourceText: z.string().min(1),
  grammar: cv002GrammarSchema,
  artDirectionSelection: cv002ArtDirectionSelectionSchema,
  graph: cv002StoryGraphSchema,
  directionDraft: cv002DirectionDraftSchema,
  history: z.array(cv002TransactionSchema),
  historyCursor: z.number().int().nonnegative(),
};
const cv002ProjectDraftSchema = z.object(projectFields).strict();
export const cv002ProjectSchema = z.object({...projectFields, contentHash: hashSchema}).strict().superRefine((project, context) => {
  const {contentHash, ...draft} = project;
  if (hashCanonical(draft) !== contentHash) context.addIssue({code: "custom", message: "Story draft project hash is invalid.", path: ["contentHash"]});
  if (project.sourceText !== project.graph.sourceText || project.grammar !== project.graph.grammar)
    context.addIssue({code: "custom", message: "Project source and grammar must match its story graph.", path: ["graph"]});
  if (project.artDirectionSelection.grammar !== project.grammar)
    context.addIssue({code: "custom", message: "Project art direction must match its grammar.", path: ["artDirectionSelection", "grammar"]});
  const compiled = compileCv002DirectionDraft(project.graph);
  if (compiled.contentHash !== project.directionDraft.contentHash)
    context.addIssue({code: "custom", message: "Project direction draft does not match its story graph.", path: ["directionDraft"]});
  if (project.historyCursor > project.history.length)
    context.addIssue({code: "custom", message: "Story edit cursor exceeds history.", path: ["historyCursor"]});
  try {
    const initialGraph = createCv002StoryGraph(project.sourceText, project.grammar);
    if (project.history.length === 0 && project.graph.contentHash !== initialGraph.contentHash)
      context.addIssue({code: "custom", message: "Project graph is not anchored to the deterministic initial breakdown.", path: ["graph"]});
    if (project.history.length > 0 && project.history[0]!.beforeGraph.contentHash !== initialGraph.contentHash)
      context.addIssue({code: "custom", message: "Story edit history is not anchored to the deterministic initial breakdown.", path: ["history", 0, "beforeGraph"]});
  } catch {
    context.addIssue({code: "custom", message: "Project source cannot reproduce a bounded initial breakdown.", path: ["sourceText"]});
  }
  let expected = project.history[0]?.beforeGraph;
  project.history.forEach((transaction, index) => {
    if (transaction.sequence !== index + 1 || transaction.id !== `edit-${String(index + 1).padStart(4, "0")}`)
      context.addIssue({code: "custom", message: "Story edit IDs and sequences must be contiguous.", path: ["history", index]});
    if (expected && transaction.beforeGraph.contentHash !== expected.contentHash)
      context.addIssue({code: "custom", message: "Story edit history is not a contiguous graph chain.", path: ["history", index]});
    try {
      const reapplied = applyCv002GraphOperation(transaction.beforeGraph, transaction.operation);
      if (reapplied.contentHash !== transaction.afterGraph.contentHash)
        context.addIssue({code: "custom", message: "Story edit result does not match its operation.", path: ["history", index]});
      if (compileCv002DirectionDraft(transaction.beforeGraph).contentHash !== transaction.beforeDirectionHash || compileCv002DirectionDraft(transaction.afterGraph).contentHash !== transaction.afterDirectionHash)
        context.addIssue({code: "custom", message: "Story edit direction hashes do not reproduce.", path: ["history", index]});
    } catch {
      context.addIssue({code: "custom", message: "Story edit operation cannot be reapplied.", path: ["history", index]});
    }
    expected = transaction.afterGraph;
  });
  const cursorGraph = project.historyCursor === 0 ? project.history[0]?.beforeGraph : project.history[project.historyCursor - 1]?.afterGraph;
  if (cursorGraph && cursorGraph.contentHash !== project.graph.contentHash)
    context.addIssue({code: "custom", message: "Project graph does not match its history cursor.", path: ["graph"]});
});
export type Cv002Project = z.infer<typeof cv002ProjectSchema>;

const sealProject = (draft: z.infer<typeof cv002ProjectDraftSchema>) => cv002ProjectSchema.parse({...draft, contentHash: hashCanonical(draft)});

export function createCv002Project(
  title: string,
  sourceText: string,
  grammar: Cv002Grammar,
  artDirectionSelection: Cv002ArtDirectionSelection,
): Cv002Project {
  const graph = createCv002StoryGraph(sourceText, grammar);
  const directionDraft = compileCv002DirectionDraft(graph);
  const selection = validateCv002ArtDirectionSelection(artDirectionSelection);
  return sealProject(cv002ProjectDraftSchema.parse({schemaVersion: "1.0", title, sourceText, grammar, artDirectionSelection: selection, graph, directionDraft, history: [], historyCursor: 0}));
}

export function commitCv002Operation(project: Cv002Project, rawOperation: Cv002GraphOperation): Cv002Project {
  const current = cv002ProjectSchema.parse(project);
  const operation = cv002GraphOperationSchema.parse(rawOperation);
  const afterGraph = applyCv002GraphOperation(current.graph, operation);
  if (afterGraph.contentHash === current.graph.contentHash) throw new Error("No change needed. The story graph is unchanged.");
  const afterDirection = compileCv002DirectionDraft(afterGraph);
  const sequence = current.historyCursor + 1;
  const transactionDraft = cv002TransactionDraftSchema.parse({schemaVersion: "1.0", id: `edit-${String(sequence).padStart(4, "0")}`, sequence, operation, beforeGraph: current.graph, afterGraph, beforeDirectionHash: current.directionDraft.contentHash, afterDirectionHash: afterDirection.contentHash});
  const transaction = cv002TransactionSchema.parse({...transactionDraft, contentHash: hashCanonical(transactionDraft)});
  const history = [...current.history.slice(0, current.historyCursor), transaction];
  const {contentHash: _hash, ...draft} = current;
  void _hash;
  return sealProject({...draft, graph: afterGraph, directionDraft: afterDirection, history, historyCursor: history.length});
}

export function undoCv002Operation(project: Cv002Project): Cv002Project {
  const current = cv002ProjectSchema.parse(project);
  if (current.historyCursor === 0) throw new Error("There is no story edit to undo.");
  const graph = current.history[current.historyCursor - 1]!.beforeGraph;
  const {contentHash: _hash, ...draft} = current;
  void _hash;
  return sealProject({...draft, graph, directionDraft: compileCv002DirectionDraft(graph), historyCursor: current.historyCursor - 1});
}

export function redoCv002Operation(project: Cv002Project): Cv002Project {
  const current = cv002ProjectSchema.parse(project);
  if (current.historyCursor >= current.history.length) throw new Error("There is no story edit to redo.");
  const graph = current.history[current.historyCursor]!.afterGraph;
  const {contentHash: _hash, ...draft} = current;
  void _hash;
  return sealProject({...draft, graph, directionDraft: compileCv002DirectionDraft(graph), historyCursor: current.historyCursor + 1});
}

export function restoreCv002Project(serialized: string): Cv002Project {
  return cv002ProjectSchema.parse(JSON.parse(serialized));
}
