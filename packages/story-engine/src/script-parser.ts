import {
  scriptDocumentSchema,
  storyAnalysisSchema,
  type ScriptDocument,
  type ScriptElement,
  type StoryAnalysis,
} from "./model";

const sceneHeadingPattern = /^(INT\.|EXT\.|INT\/EXT\.)\s+(.+?)(?:\s+-\s+([A-Z][A-Z\s]+))?$/;
const dialoguePattern = /^([A-Z][A-Z0-9 _'-]{1,30}):\s+(.+)$/;
const propTerms = [
  "box", "clock", "key", "book", "letter", "map", "cup", "bottle", "table", "lamp",
  "phone", "photograph", "photo", "newspaper", "paper", "tool", "machine", "bag", "case",
] as const;

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const countMentions = (source: string, term: string) => (source.match(new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi")) ?? []).length;

export function parseScript(sourceText: string, title = "Pasted Story"): ScriptDocument {
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
      elements.push({
        id: currentSceneId,
        type: "scene-heading",
        ordinal: sceneOrdinal,
        interiorExterior: heading[1]!.replace(".", "") as "INT" | "EXT" | "INT/EXT",
        location: heading[2]!.trim(),
        timeOfDay: heading[3]?.trim() ?? "UNSPECIFIED",
      });
      continue;
    }

    if (!currentSceneId) throw new Error("The script must begin with a scene heading such as INT. WORKSHOP - MORNING.");
    elementOrdinal += 1;
    const dialogue = dialoguePattern.exec(block);
    if (dialogue) {
      const speaker = dialogue[1]!.trim();
      elements.push({
        id: `line-${elementOrdinal}`,
        type: "dialogue",
        sceneId: currentSceneId,
        speaker,
        text: dialogue[2]!.trim(),
        narration: speaker === "NARRATOR",
      });
      continue;
    }

    const actionText = block.startsWith("[") && block.endsWith("]") ? block.slice(1, -1).trim() : block;
    elements.push({id: `action-${elementOrdinal}`, type: "action", sceneId: currentSceneId, text: actionText});
  }

  if (sceneOrdinal === 0) throw new Error("No screenplay scene headings were found.");
  return scriptDocumentSchema.parse({schemaVersion: "1.0", id: `script-${slug(title) || "pasted-story"}`, title, sourceText: normalized, elements});
}

export function analyzeStory(document: ScriptDocument): StoryAnalysis {
  const characters = new Map<string, number>();
  const locations = new Map<string, number>();

  for (const element of document.elements) {
    if (element.type === "dialogue" && !element.narration) characters.set(element.speaker, (characters.get(element.speaker) ?? 0) + 1);
    if (element.type === "scene-heading") locations.set(element.location, (locations.get(element.location) ?? 0) + 1);
  }

  const props = propTerms
    .map((term) => ({term, mentions: countMentions(document.sourceText, term)}))
    .filter(({mentions}) => mentions > 0)
    .map(({term, mentions}) => ({id: `prop-${slug(term)}`, kind: "prop" as const, name: term.toUpperCase(), mentions}));

  const warnings: string[] = [];
  if (characters.size < 2) warnings.push("The first animatic works best with at least two recurring speaking characters.");
  if (locations.size < 2) warnings.push("Only one location was found; include a second scene heading to prove location changes.");
  if (props.length === 0) warnings.push("No supported prop term was detected; unknown props will use a visible placeholder.");

  return storyAnalysisSchema.parse({
    schemaVersion: "1.0",
    documentId: document.id,
    characters: [...characters].map(([name, mentions]) => ({id: `character-${slug(name)}`, kind: "character", name, mentions})),
    locations: [...locations].map(([name, mentions]) => ({id: `location-${slug(name)}`, kind: "location", name, mentions})),
    props,
    warnings,
  });
}
