import {
  scriptDocumentSchema,
  storyAnalysisSchema,
  type ScriptDocument,
  type ScriptElement,
  type StoryAnalysis,
  type StoryEntity,
} from "./model";

const sceneHeadingPattern = /^(INT\.|EXT\.|INT\/EXT\.)\s+(.+?)(?:\s+-\s+([A-Z][A-Z\s]+))?$/;
const dialoguePattern = /^([A-Z][A-Z0-9 _'-]{1,30}):\s+(.+)$/;
const propTerms = ["box", "clock", "key", "book", "letter", "map", "cup", "bottle", "table", "lamp", "phone", "photograph", "photo", "newspaper", "paper", "tool", "machine", "bag", "case"] as const;
const objectVerbPattern = /\b(?:lifts?|holds?|turns?|opens?|closes?|carries?|drops?|uses?|touches?|examines?|reveals?|finds?|takes?|puts?|hides?|points?\s+toward)\s+(?:a|an|the)\s+([a-z][a-z'-]*(?:\s+[a-z][a-z'-]*){0,2})(?=\s+(?:from|to|at|on|in|with|and|while|before|after)|[.,]|$)/gi;
const annotationPattern = /@asset\(prop:\s*([^)]+)\)/gi;
const removableModifiers = new Set(["curious", "brass", "dusty", "careful", "tiny", "largest", "small", "guilty", "strange", "old", "new"]);

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const countMentions = (source: string, term: string) => (source.match(new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi")) ?? []).length;

export function parseScript(sourceText: string, title = "Pasted Story", productionId = "production-pasted"): ScriptDocument {
  const normalized = sourceText.replace(/\r\n/g, "\n").trim();
  if (!normalized) throw new Error("Paste a screenplay-style script before building the animatic.");

  const blocks = normalized.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
  const elements: ScriptElement[] = [];
  let currentSceneId: string | null = null;
  let sceneOrdinal = 0;
  let elementOrdinal = 0;

  for (const block of blocks) {
    const heading = sceneHeadingPattern.exec(block);
    if (heading) {
      sceneOrdinal += 1;
      currentSceneId = `scene-${sceneOrdinal}`;
      elements.push({id: currentSceneId, type: "scene-heading", ordinal: sceneOrdinal, interiorExterior: heading[1]!.replace(".", "") as "INT" | "EXT" | "INT/EXT", location: heading[2]!.trim(), timeOfDay: heading[3]?.trim() ?? "UNSPECIFIED"});
      continue;
    }

    if (!currentSceneId) throw new Error("The script must begin with a scene heading such as INT. WORKSHOP - MORNING.");
    elementOrdinal += 1;
    const dialogue = dialoguePattern.exec(block);
    if (dialogue) {
      const speaker = dialogue[1]!.trim();
      elements.push({id: `line-${elementOrdinal}`, type: "dialogue", sceneId: currentSceneId, speaker, text: dialogue[2]!.trim(), narration: speaker === "NARRATOR"});
      continue;
    }

    const actionText = block.startsWith("[") && block.endsWith("]") ? block.slice(1, -1).trim() : block;
    elements.push({id: `action-${elementOrdinal}`, type: "action", sceneId: currentSceneId, text: actionText});
  }

  if (sceneOrdinal === 0) throw new Error("No screenplay scene headings were found.");
  return scriptDocumentSchema.parse({schemaVersion: "1.0", id: `script-${productionId}`, productionId, title, sourceText: normalized, elements});
}

type AnalyzeStoryOptions = {includeNarrationPresenter?: boolean};
type EntityAccumulator = {name: string; mentions: number; sceneIds: Set<string>; sourceElementIds: Set<string>; confidence: number; status: StoryEntity["status"]; role: StoryEntity["role"]};

function addEntity(map: Map<string, EntityAccumulator>, name: string, sceneId: string, sourceElementId: string, options: Pick<EntityAccumulator, "confidence" | "status" | "role">) {
  const key = name.toUpperCase();
  const existing = map.get(key) ?? {name: key, mentions: 0, sceneIds: new Set<string>(), sourceElementIds: new Set<string>(), ...options};
  existing.mentions += 1;
  existing.sceneIds.add(sceneId);
  existing.sourceElementIds.add(sourceElementId);
  existing.confidence = Math.max(existing.confidence, options.confidence);
  if (options.status === "confirmed") existing.status = "confirmed";
  map.set(key, existing);
}

const toEntity = (kind: StoryEntity["kind"], value: EntityAccumulator): StoryEntity => ({id: `${kind}-${slug(value.name)}`, kind, name: value.name, mentions: value.mentions, sceneIds: [...value.sceneIds].sort(), sourceElementIds: [...value.sourceElementIds].sort(), confidence: value.confidence, status: value.status, role: value.role});

function normalizeObjectPhrase(phrase: string): string {
  const words = phrase.toLowerCase().split(/\s+/).filter((word) => !removableModifiers.has(word));
  const known = [...propTerms].find((term) => words.includes(term));
  return (known ?? words.slice(-2).join(" ")).toUpperCase();
}

export function analyzeStory(document: ScriptDocument, options: AnalyzeStoryOptions = {}): StoryAnalysis {
  const characters = new Map<string, EntityAccumulator>();
  const locations = new Map<string, EntityAccumulator>();
  const props = new Map<string, EntityAccumulator>();
  const headings = document.elements.filter((element) => element.type === "scene-heading");

  for (const heading of headings) addEntity(locations, heading.location, heading.id, heading.id, {confidence: 1, status: "confirmed", role: "location"});

  for (const element of document.elements) {
    if (element.type === "dialogue" && !element.narration) addEntity(characters, element.speaker, element.sceneId, element.id, {confidence: 1, status: "confirmed", role: "speaker"});
    if (element.type === "dialogue" && element.narration && options.includeNarrationPresenter) addEntity(characters, "NARRATOR", element.sceneId, element.id, {confidence: 1, status: "confirmed", role: "presenter"});
  }

  for (const element of document.elements) {
    if (element.type !== "action") continue;
    for (const character of characters.values()) if (countMentions(element.text, character.name) > 0) {
      character.sceneIds.add(element.sceneId);
      character.sourceElementIds.add(element.id);
      character.mentions += countMentions(element.text, character.name);
    }
    for (const term of propTerms) if (countMentions(element.text, term) > 0) addEntity(props, term, element.sceneId, element.id, {confidence: 1, status: "confirmed", role: "prop"});

    for (const match of element.text.matchAll(annotationPattern)) addEntity(props, match[1]!.trim(), element.sceneId, element.id, {confidence: 1, status: "confirmed", role: "prop"});
    for (const match of element.text.matchAll(objectVerbPattern)) {
      const candidate = normalizeObjectPhrase(match[1]!);
      if (!candidate || characters.has(candidate) || locations.has(candidate)) continue;
      addEntity(props, candidate, element.sceneId, element.id, {confidence: 0.72, status: "needs-review", role: "prop"});
    }
  }

  // Dialogue mentions still count toward known prop usage and consuming shots.
  for (const term of propTerms) for (const element of document.elements) if (element.type === "dialogue" && countMentions(element.text, term) > 0) addEntity(props, term, element.sceneId, element.id, {confidence: 1, status: "confirmed", role: "prop"});

  const warnings: string[] = [];
  if (characters.size === 0) warnings.push("No on-screen speaker or presenter was found; character staging requires review.");
  if (locations.size < 2) warnings.push("Only one location was found; repeated staging will require visual variation.");
  if (props.size === 0) warnings.push("No explicit or inferred visual prop was found.");
  if ([...props.values()].some((prop) => prop.status === "needs-review")) warnings.push("One or more inferred visual entities need confirmation before identity lock.");

  return storyAnalysisSchema.parse({
    schemaVersion: "1.1",
    documentId: document.id,
    characters: [...characters.values()].map((value) => toEntity("character", value)),
    locations: [...locations.values()].map((value) => toEntity("location", value)),
    props: [...props.values()].map((value) => toEntity("prop", value)),
    warnings,
  });
}
