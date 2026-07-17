import {
  creativeEpisodePlanSchema,
  type CreativeEpisodePlan,
  type CreativeShot,
  type ProductionPolicy,
  type ProductionPreset,
  type ScriptDocument,
  type ShowPack,
  type StoryAnalysis,
} from "./model";
import type {DialogueTimingResult} from "./timing";

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const countWords = (value: string) => value.trim().split(/\s+/).filter(Boolean).length;

function splitIntoBeats(text: string, preset: ProductionPreset): string[] {
  if (preset === "draft") return [text];
  const maxWords = preset === "premium" ? 6 : 9;
  const clauses = text.split(/(?<=[.!?;:])\s+|,\s+/).map((part) => part.trim()).filter(Boolean);
  const beats: string[] = [];
  for (const clause of clauses) {
    const words = clause.split(/\s+/);
    for (let index = 0; index < words.length; index += maxWords) beats.push(words.slice(index, index + maxWords).join(" "));
  }
  return beats.length ? beats : [text];
}

const historyTreatments: CreativeShot["treatment"][] = [
  "character-performance",
  "kinetic-type",
  "insert",
  "reaction",
  "diagram",
];

const kidsTreatments: CreativeShot["treatment"][] = [
  "character-performance",
  "reaction",
  "environment",
  "character-performance",
  "reaction",
];

const framings: CreativeShot["framing"][] = ["medium", "close-up", "insert", "wide"];

export type DirectEpisodeOptions = {
  productionPolicy: ProductionPolicy;
  showPack: ShowPack;
};

export function directEpisode(
  document: ScriptDocument,
  analysis: StoryAnalysis,
  timing: DialogueTimingResult,
  {productionPolicy, showPack}: DirectEpisodeOptions,
): CreativeEpisodePlan {
  const headingElements = document.elements.filter((element) => element.type === "scene-heading");
  const timingByLine = new Map(timing.lines.map((line) => [line.lineId, line.durationInFrames]));
  const shots: CreativeShot[] = [];
  const scenes: CreativeEpisodePlan["scenes"] = [];
  let globalShotOrdinal = 0;
  let cameraPushAssigned = false;

  const isExplainer = showPack.projectType === "explainer";
  const treatmentCycle = isExplainer ? historyTreatments : kidsTreatments;

  for (const heading of headingElements) {
    const content = document.elements.filter((element) => "sceneId" in element && element.sceneId === heading.id);
    const sceneShots: CreativeShot[] = [];
    const sceneNumber = heading.ordinal;
    const primaryCharacter = analysis.characters[(sceneNumber - 1) % Math.max(analysis.characters.length, 1)]?.name ?? null;

    const establishingId = `shot-${++globalShotOrdinal}`;
    sceneShots.push({
      id: establishingId,
      sceneId: heading.id,
      number: `${sceneNumber}.01`,
      title: `Establish ${heading.location.toLowerCase()}`,
      framing: "wide",
      treatment: "environment",
      transition: sceneNumber === 1 ? "camera-carry" : "hard-cut",
      locationName: heading.location,
      focusCharacterName: primaryCharacter,
      sourceElementIds: [heading.id],
      durationInFrames: isExplainer ? 42 : 66,
      actions: [
        {
          id: `${establishingId}-cut`,
          type: sceneNumber === 1 ? "holdPose" : "hardCut",
          actorName: primaryCharacter,
          targetName: null,
          label: sceneNumber === 1 ? "Settle into the opening geography" : "Reset to the new location",
          startOffsetFrames: 0,
          durationInFrames: 18,
        },
        {
          id: `${establishingId}-enter`,
          type: "enter",
          actorName: primaryCharacter,
          targetName: null,
          label: "Enter the scene",
          startOffsetFrames: 4,
          durationInFrames: isExplainer ? 24 : 40,
        },
      ],
      caption: null,
    });

    for (const [contentIndex, element] of content.entries()) {
      if (element.type === "dialogue") {
        const beats = isExplainer ? splitIntoBeats(element.text, productionPolicy.preset) : [element.text];
        const lineDuration = timingByLine.get(element.id) ?? 72;
        const totalWords = Math.max(1, countWords(element.text));

        for (const [beatIndex, beat] of beats.entries()) {
          const shotId = `shot-${++globalShotOrdinal}`;
          const focus = element.narration ? primaryCharacter : element.speaker;
          const listener = analysis.characters.find((character) => character.name !== focus)?.name ?? null;
          const proportionalDuration = Math.round(lineDuration * (countWords(beat) / totalWords));
          const duration = Math.max(isExplainer ? 30 : 54, Math.round(proportionalDuration / productionPolicy.cadenceMultiplier));
          const treatment = treatmentCycle[(globalShotOrdinal + contentIndex + beatIndex) % treatmentCycle.length]!;
          const framing = treatment === "insert" || treatment === "kinetic-type" || treatment === "diagram"
            ? "insert"
            : framings[(globalShotOrdinal + beatIndex) % framings.length]!;
          const transition: CreativeShot["transition"] = isExplainer
            ? "hard-cut"
            : globalShotOrdinal % 3 === 0 ? "foreground-wipe" : globalShotOrdinal % 3 === 1 ? "camera-carry" : "hard-cut";
          const addPush = !cameraPushAssigned && !element.narration;
          if (addPush) cameraPushAssigned = true;

          sceneShots.push({
            id: shotId,
            sceneId: heading.id,
            number: `${sceneNumber}.${String(sceneShots.length + 1).padStart(2, "0")}`,
            title: treatment === "kinetic-type" ? `Keyword: ${beat.split(/\s+/).at(-1) ?? beat}` : element.narration ? "Narration visual beat" : `${element.speaker.toLowerCase()} speaks`,
            framing,
            treatment,
            transition,
            locationName: heading.location,
            focusCharacterName: focus,
            sourceElementIds: [element.id],
            durationInFrames: duration,
            actions: [
              {
                id: `${shotId}-performance`,
                type: treatment === "kinetic-type" ? "kineticType" : element.narration ? "holdPose" : "talk",
                actorName: focus,
                targetName: listener,
                label: treatment === "kinetic-type" ? `Emphasize: ${beat}` : element.narration ? "Illustrate the narrated clause" : `Deliver ${element.id}`,
                startOffsetFrames: 0,
                durationInFrames: duration,
              },
              ...(listener && treatment !== "kinetic-type" && (!isExplainer || globalShotOrdinal % 5 === 0) ? [{
                id: `${shotId}-react`,
                type: "react" as const,
                actorName: listener,
                targetName: focus,
                label: "Listening reaction",
                startOffsetFrames: Math.max(5, Math.floor(duration * 0.56)),
                durationInFrames: Math.max(10, Math.floor(duration * 0.3)),
              }] : []),
              ...(!isExplainer && focus ? [{
                id: `${shotId}-gesture`,
                type: "gesture" as const,
                actorName: focus,
                targetName: listener,
                label: "Phrase-driven performance gesture",
                startOffsetFrames: Math.min(8, Math.max(0, duration - 1)),
                durationInFrames: Math.max(12, Math.floor(duration * 0.46)),
              }, {
                id: `${shotId}-accent`,
                type: "beatAccent" as const,
                actorName: focus,
                targetName: null,
                label: "Land the action word",
                startOffsetFrames: Math.max(0, Math.floor(duration * 0.7)),
                durationInFrames: Math.max(8, Math.floor(duration * 0.2)),
              }] : []),
              ...(addPush ? [{
                id: `${shotId}-push`,
                type: "cameraPush" as const,
                actorName: null,
                targetName: focus,
                label: "Emphasize the first spoken turn",
                startOffsetFrames: 0,
                durationInFrames: duration,
              }] : []),
            ],
            caption: beat,
          });
        }
        continue;
      }

      if (element.type === "action") {
        const shotId = `shot-${++globalShotOrdinal}`;
        const mentionedProp = analysis.props.find((prop) => element.text.toLowerCase().includes(prop.name.toLowerCase()));
        const actor = analysis.characters.find((character) => element.text.toUpperCase().includes(character.name))?.name ?? primaryCharacter;
        const treatment: CreativeShot["treatment"] = mentionedProp ? "insert" : isExplainer ? "diagram" : "character-performance";
        sceneShots.push({
          id: shotId,
          sceneId: heading.id,
          number: `${sceneNumber}.${String(sceneShots.length + 1).padStart(2, "0")}`,
          title: mentionedProp ? `Insert: ${mentionedProp.name.toLowerCase()}` : "Physical story beat",
          framing: mentionedProp ? "insert" : "medium",
          treatment,
          transition: isExplainer ? "hard-cut" : "foreground-wipe",
          locationName: heading.location,
          focusCharacterName: actor,
          sourceElementIds: [element.id],
          durationInFrames: isExplainer ? 42 : 72,
          actions: [
            {
              id: `${shotId}-action`,
              type: mentionedProp ? "insert" : "gesture",
              actorName: actor,
              targetName: mentionedProp?.name ?? null,
              label: element.text,
              startOffsetFrames: 0,
              durationInFrames: isExplainer ? 36 : 58,
            },
            {
              id: `${shotId}-reframe`,
              type: "reframe",
              actorName: null,
              targetName: mentionedProp?.name ?? actor,
              label: "Reframe for the physical beat",
              startOffsetFrames: 0,
              durationInFrames: 24,
            },
          ],
          caption: null,
        });
      }
    }

    while (sceneShots.length < 3) {
      const shotId = `shot-${++globalShotOrdinal}`;
      const actor = analysis.characters[sceneShots.length % Math.max(analysis.characters.length, 1)]?.name ?? null;
      sceneShots.push({
        id: shotId,
        sceneId: heading.id,
        number: `${sceneNumber}.${String(sceneShots.length + 1).padStart(2, "0")}`,
        title: "Silent reaction",
        framing: "close-up",
        treatment: "reaction",
        transition: "hard-cut",
        locationName: heading.location,
        focusCharacterName: actor,
        sourceElementIds: [heading.id],
        durationInFrames: isExplainer ? 36 : 48,
        actions: [{id: `${shotId}-react`, type: "react", actorName: actor, targetName: null, label: "Hold a readable reaction", startOffsetFrames: 0, durationInFrames: isExplainer ? 30 : 40}],
        caption: null,
      });
    }

    shots.push(...sceneShots);
    scenes.push({
      id: heading.id,
      sourceSceneId: heading.id,
      number: sceneNumber,
      title: `${heading.location} - ${heading.timeOfDay}`,
      locationName: heading.location,
      shotIds: sceneShots.map((shot) => shot.id),
    });
  }

  return creativeEpisodePlanSchema.parse({
    schemaVersion: "1.1",
    id: `creative-${slug(document.title)}`,
    title: document.title,
    fps: timing.fps,
    width: Math.round(productionPolicy.outputHeight * (16 / 9)),
    height: productionPolicy.outputHeight,
    projectType: showPack.projectType,
    productionPolicy,
    showPackId: showPack.id,
    directingProfileId: showPack.profile.id,
    analysis,
    scenes,
    shots,
  });
}
