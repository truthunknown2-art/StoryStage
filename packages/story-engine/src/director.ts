import {
  STORY_ENGINE_COMPILER_VERSION,
  creativeEpisodePlanSchema,
  type AssetRoutingPolicy,
  type CreativeEpisodePlan,
  type CreativeShot,
  type DirectingProfile,
  type ProductionDraft,
  type ProductionPolicy,
  type ScriptDocument,
  type ShowPack,
  type StoryAnalysis,
  type VisualRequirement,
} from "./model";
import type {DialogueTimingResult} from "./timing";

const countWords = (value: string) => value.trim().split(/\s+/).filter(Boolean).length;
const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));
const stableFraction = (ordinal: number) => (ordinal * 0.6180339887498949) % 1;

function weightedPick<T>(entries: Array<[T, number]>, ordinal: number): T {
  const point = stableFraction(ordinal);
  let cursor = 0;
  for (const [value, weight] of entries) {
    cursor += weight;
    if (point <= cursor + Number.EPSILON) return value;
  }
  return entries.at(-1)![0];
}

const treatmentEntries = (profile: DirectingProfile): Array<[CreativeShot["treatment"], number]> => [
  ["environment", profile.treatmentWeights.environment],
  ["character-performance", profile.treatmentWeights.characterPerformance],
  ["reaction", profile.treatmentWeights.reaction],
  ["insert", profile.treatmentWeights.insert],
  ["kinetic-type", profile.treatmentWeights.kineticType],
  ["diagram", profile.treatmentWeights.diagram],
  ["licensed-media", profile.treatmentWeights.licensedMedia],
  ["generated-illustration", profile.treatmentWeights.generatedIllustration],
];

const framingEntries = (profile: DirectingProfile): Array<[CreativeShot["framing"], number]> => [
  ["wide", profile.framingWeights.wide], ["medium", profile.framingWeights.medium], ["close-up", profile.framingWeights.closeUp], ["insert", profile.framingWeights.insert],
];

const transitionEntries = (profile: DirectingProfile): Array<[CreativeShot["transition"], number]> => [
  ["hard-cut", profile.transitionPolicy.hardCut], ["foreground-wipe", profile.transitionPolicy.foregroundWipe], ["camera-carry", profile.transitionPolicy.cameraCarry], ["brief-dissolve", profile.transitionPolicy.briefDissolve],
];

function splitIntoBeats(text: string, maximumWords: number, preset: ProductionPolicy["preset"]): string[] {
  const adjustedMaximum = preset === "draft" ? Math.ceil(maximumWords * 1.45) : preset === "premium" ? Math.max(3, Math.floor(maximumWords * 0.85)) : maximumWords;
  const clauses = text.split(/(?<=[.!?;:])\s+|,\s+/).map((part) => part.trim()).filter(Boolean);
  const beats: string[] = [];
  for (const clause of clauses) {
    const words = clause.split(/\s+/);
    for (let index = 0; index < words.length; index += adjustedMaximum) beats.push(words.slice(index, index + adjustedMaximum).join(" "));
  }
  return beats.length ? beats : [text];
}

function shouldSchedule(ratePerMinute: number, durationFrames: number, ordinal: number): boolean {
  if (ratePerMinute <= 0) return false;
  return stableFraction(ordinal * 3 + 1) < Math.min(1, (ratePerMinute * durationFrames) / 1800);
}

function sourceIntentFor(treatment: CreativeShot["treatment"], routing: AssetRoutingPolicy): VisualRequirement["sourceIntent"] {
  if (treatment === "licensed-media") return routing.licensedSources === "disabled" ? "generated" : "public-domain";
  if (treatment === "generated-illustration") return "generated";
  return "approved-recurring";
}

export type DirectEpisodeOptions = {draft: ProductionDraft; productionPolicy: ProductionPolicy; showPack: ShowPack};

export function directEpisode(document: ScriptDocument, analysis: StoryAnalysis, timing: DialogueTimingResult, {draft, productionPolicy, showPack}: DirectEpisodeOptions): CreativeEpisodePlan {
  const assetRoutingPolicy: AssetRoutingPolicy = draft.assetRoutingPolicy;
  const profile = showPack.profile;
  const headingElements = document.elements.filter((element) => element.type === "scene-heading");
  const timingByLine = new Map(timing.lines.map((line) => [line.lineId, line.durationInFrames]));
  const entityByName = new Map([...analysis.characters, ...analysis.locations, ...analysis.props].map((entity) => [entity.name.toLowerCase(), entity]));
  const shots: CreativeShot[] = [];
  const scenes: CreativeEpisodePlan["scenes"] = [];
  const visualRequirements: VisualRequirement[] = [];
  let globalShotOrdinal = 0;

  const addRequirements = (shotId: string, sceneId: string, treatment: CreativeShot["treatment"], locationName: string, focusName: string | null, sourceElementIds: string[]) => {
    const requirements: VisualRequirement[] = [];
    const location = entityByName.get(locationName.toLowerCase());
    requirements.push({id: `${shotId}-background`, sceneId, shotId, role: "background", entityId: location?.id ?? null, sourceIntent: "approved-recurring", required: true, description: `Background for ${locationName}`});
    if (focusName) {
      const character = entityByName.get(focusName.toLowerCase());
      requirements.push({id: `${shotId}-character`, sceneId, shotId, role: "character", entityId: character?.id ?? null, sourceIntent: "approved-recurring", required: true, description: `On-screen performance for ${focusName}`});
    }
    const prop = analysis.props.find((candidate) => candidate.sourceElementIds.some((id) => sourceElementIds.includes(id)));
    if (treatment === "insert" || prop) requirements.push({id: `${shotId}-insert`, sceneId, shotId, role: prop ? "prop" : "insert", entityId: prop?.id ?? null, sourceIntent: prop ? "approved-recurring" : "generated", required: true, description: prop ? `Readable prop view of ${prop.name}` : "Editorial insert visual"});
    if (treatment === "diagram" || treatment === "kinetic-type") requirements.push({id: `${shotId}-diagram`, sceneId, shotId, role: "diagram", entityId: null, sourceIntent: "user-owned", required: true, description: treatment === "kinetic-type" ? "Profile-authored kinetic typography" : "Profile-authored explanatory diagram"});
    if (treatment === "licensed-media") requirements.push({id: `${shotId}-evidence`, sceneId, shotId, role: "evidence", entityId: null, sourceIntent: sourceIntentFor(treatment, assetRoutingPolicy), required: true, description: "Authenticated contextual evidence or licensed source"});
    if (treatment === "generated-illustration") requirements.push({id: `${shotId}-reconstruction`, sceneId, shotId, role: assetRoutingPolicy.allowGeneratedHistoricalReconstruction ? "reconstruction" : "insert", entityId: null, sourceIntent: "generated", required: true, description: "Original generated illustration with reconstruction labeling when factual"});
    visualRequirements.push(...requirements);
    return requirements;
  };

  const appendCameraAction = (actions: CreativeShot["actions"], shotId: string, focus: string | null, duration: number, ordinal: number) => {
    const camera = weightedPick(profile.cameraPolicy.moves.map((move) => [move.type, move.weight]), ordinal);
    if (camera === "locked") return;
    const detail = camera === "cameraPush"
      ? {type: "cameraPush" as const, fromScale: 1, toScale: 1.08, easingId: "ease-standard"}
      : camera === "pan" ? {type: "pan" as const, fromX: -0.04, toX: 0.04, easingId: "ease-standard"}
        : {type: "reframe" as const, framing: weightedPick(framingEntries(profile), ordinal + 11), easingId: "ease-standard"};
    actions.push({id: `${shotId}-camera`, actorName: null, targetName: focus, label: `Profile camera: ${camera}`, startOffsetFrames: 0, durationInFrames: duration, detail});
  };

  for (const heading of headingElements) {
    const content = document.elements.filter((element) => "sceneId" in element && element.sceneId === heading.id);
    const sceneShots: CreativeShot[] = [];
    const sceneCharacters = analysis.characters.filter((character) => character.sceneIds.includes(heading.id));
    const primaryCharacter = sceneCharacters.find((character) => character.role === "presenter")?.name ?? sceneCharacters[0]?.name ?? null;

    const establishId = `shot-${++globalShotOrdinal}`;
    const establishDuration = clamp(Math.round(1800 / profile.cadence.targetCutsPerMinute / productionPolicy.cadenceMultiplier), profile.cadence.minShotFrames, Math.min(profile.cadence.maxShotFrames, profile.cadence.maxStaticFrames));
    const establishRequirements = addRequirements(establishId, heading.id, "environment", heading.location, primaryCharacter, [heading.id]);
    const establishActions: CreativeShot["actions"] = [
      {id: `${establishId}-settle`, actorName: primaryCharacter, targetName: null, label: "Establish the scene geography", startOffsetFrames: 0, durationInFrames: establishDuration, detail: {type: "holdPose", poseId: "pose-establish"}},
    ];
    if (primaryCharacter) establishActions.push({id: `${establishId}-enter`, actorName: primaryCharacter, targetName: null, label: "Enter the scene", startOffsetFrames: Math.min(4, establishDuration - 1), durationInFrames: Math.max(1, establishDuration - Math.min(4, establishDuration - 1)), detail: {type: "enter", direction: globalShotOrdinal % 2 ? "left" : "right"}});
    appendCameraAction(establishActions, establishId, primaryCharacter, establishDuration, globalShotOrdinal);
    sceneShots.push({id: establishId, sceneId: heading.id, number: `${heading.ordinal}.01`, title: `Establish ${heading.location.toLowerCase()}`, framing: "wide", treatment: "environment", transition: heading.ordinal === 1 ? "camera-carry" : weightedPick(transitionEntries(profile), globalShotOrdinal), locationName: heading.location, focusCharacterName: primaryCharacter, sourceElementIds: [heading.id], visualRequirementIds: establishRequirements.map((requirement) => requirement.id), durationInFrames: establishDuration, actions: establishActions, caption: null});

    for (const [contentIndex, element] of content.entries()) {
      if (element.type === "dialogue") {
        const beats = splitIntoBeats(element.text, profile.textPolicy.maximumWords, productionPolicy.preset);
        const lineDuration = timingByLine.get(element.id) ?? 72;
        const totalWords = Math.max(1, countWords(element.text));
        for (const [beatIndex, beat] of beats.entries()) {
          const shotId = `shot-${++globalShotOrdinal}`;
          const focus = element.narration ? (sceneCharacters.find((character) => character.role === "presenter")?.name ?? primaryCharacter) : element.speaker;
          const listener = sceneCharacters.find((character) => character.name !== focus && character.role !== "presenter")?.name ?? null;
          const rawDuration = Math.round(lineDuration * countWords(beat) / totalWords / productionPolicy.cadenceMultiplier);
          const duration = clamp(rawDuration, profile.cadence.minShotFrames, Math.min(profile.cadence.maxShotFrames, profile.cadence.maxStaticFrames));
          const treatment = weightedPick(treatmentEntries(profile), globalShotOrdinal + contentIndex + beatIndex);
          const framing = ["insert", "kinetic-type", "diagram", "licensed-media"].includes(treatment) ? "insert" : weightedPick(framingEntries(profile), globalShotOrdinal + beatIndex);
          const transition = weightedPick(transitionEntries(profile), globalShotOrdinal);
          const requirements = addRequirements(shotId, heading.id, treatment, heading.location, focus, [element.id]);
          const insertRequirement = requirements.find((requirement) => ["prop", "insert", "diagram", "evidence", "reconstruction"].includes(requirement.role));
          const actions: CreativeShot["actions"] = [];
          if (!element.narration) actions.push({id: `${shotId}-talk`, actorName: focus, targetName: listener, label: `Deliver ${element.id}`, startOffsetFrames: 0, durationInFrames: duration, detail: {type: "talk", dialogueLineId: element.id, timingId: `timing-${element.id}`}});
          else actions.push({id: `${shotId}-narration-pose`, actorName: focus, targetName: null, label: "Present the narrated visual beat", startOffsetFrames: 0, durationInFrames: duration, detail: {type: "holdPose", poseId: "pose-present"}});
          if (shouldSchedule(profile.performancePolicy.gesturesPerMinute, duration, globalShotOrdinal) && focus) actions.push({id: `${shotId}-gesture`, actorName: focus, targetName: listener, label: "Profile performance gesture", startOffsetFrames: Math.min(8, duration - 1), durationInFrames: Math.max(1, Math.floor(duration * 0.45)), detail: {type: "gesture", gestureId: showPack.allowedGestures[globalShotOrdinal % showPack.allowedGestures.length]!, intensity: 0.72}});
          if (listener && shouldSchedule(profile.performancePolicy.reactionsPerMinute, duration, globalShotOrdinal + 9)) actions.push({id: `${shotId}-react`, actorName: listener, targetName: focus, label: "Listening reaction", startOffsetFrames: Math.floor(duration * 0.58), durationInFrames: Math.max(1, Math.floor(duration * 0.3)), detail: {type: "react", poseId: "pose-reaction"}});
          if (treatment === "kinetic-type") actions.push({id: `${shotId}-type`, actorName: null, targetName: null, label: `Emphasize ${beat}`, startOffsetFrames: 0, durationInFrames: duration, detail: {type: "kineticType", text: beat, emphasis: countWords(beat) === 1 ? "word" : "phrase"}});
          if (insertRequirement) actions.push({id: `${shotId}-insert-action`, actorName: null, targetName: insertRequirement.entityId ? analysis.props.find((prop) => prop.id === insertRequirement.entityId)?.name ?? null : null, label: insertRequirement.description, startOffsetFrames: 0, durationInFrames: duration, detail: {type: "insert", visualRequirementId: insertRequirement.id}});
          if (transition === "hard-cut" && globalShotOrdinal > 1) actions.push({id: `${shotId}-cut`, actorName: null, targetName: focus, label: "Profile hard cut", startOffsetFrames: 0, durationInFrames: 1, detail: {type: "hardCut"}});
          appendCameraAction(actions, shotId, focus, duration, globalShotOrdinal);
          sceneShots.push({id: shotId, sceneId: heading.id, number: `${heading.ordinal}.${String(sceneShots.length + 1).padStart(2, "0")}`, title: treatment === "kinetic-type" ? `Keyword: ${beat.split(/\s+/).at(-1) ?? beat}` : element.narration ? "Narration visual beat" : `${element.speaker.toLowerCase()} speaks`, framing, treatment, transition, locationName: heading.location, focusCharacterName: focus, sourceElementIds: [element.id], visualRequirementIds: requirements.map((requirement) => requirement.id), durationInFrames: duration, actions, caption: beat});
        }
        continue;
      }

      if (element.type === "action") {
        const shotId = `shot-${++globalShotOrdinal}`;
        const prop = analysis.props.find((candidate) => candidate.sourceElementIds.includes(element.id));
        const actor = sceneCharacters.find((character) => element.text.toUpperCase().includes(character.name))?.name ?? primaryCharacter;
        const treatment = prop ? "insert" : weightedPick(treatmentEntries(profile), globalShotOrdinal + contentIndex);
        const duration = clamp(Math.round(1800 / profile.cadence.targetCutsPerMinute / productionPolicy.cadenceMultiplier), profile.cadence.minShotFrames, Math.min(profile.cadence.maxShotFrames, profile.cadence.maxStaticFrames));
        const requirements = addRequirements(shotId, heading.id, treatment, heading.location, actor, [element.id]);
        const propRequirement = requirements.find((requirement) => requirement.entityId === prop?.id);
        const actions: CreativeShot["actions"] = [{id: `${shotId}-action`, actorName: actor, targetName: prop?.name ?? null, label: element.text, startOffsetFrames: 0, durationInFrames: duration, detail: propRequirement ? {type: "insert", visualRequirementId: propRequirement.id} : {type: "gesture", gestureId: "explain", intensity: 0.65}}];
        appendCameraAction(actions, shotId, prop?.name ?? actor, duration, globalShotOrdinal);
        sceneShots.push({id: shotId, sceneId: heading.id, number: `${heading.ordinal}.${String(sceneShots.length + 1).padStart(2, "0")}`, title: prop ? `Insert: ${prop.name.toLowerCase()}` : "Physical story beat", framing: prop ? "insert" : weightedPick(framingEntries(profile), globalShotOrdinal), treatment, transition: weightedPick(transitionEntries(profile), globalShotOrdinal), locationName: heading.location, focusCharacterName: actor, sourceElementIds: [element.id], visualRequirementIds: requirements.map((requirement) => requirement.id), durationInFrames: duration, actions, caption: null});
      }
    }

    shots.push(...sceneShots);
    scenes.push({id: heading.id, sourceSceneId: heading.id, number: heading.ordinal, title: `${heading.location} - ${heading.timeOfDay}`, locationName: heading.location, shotIds: sceneShots.map((shot) => shot.id)});
  }

  const width = draft.format.aspectRatio === "16:9" ? Math.round(productionPolicy.outputHeight * 16 / 9) : Math.round(productionPolicy.outputHeight * 9 / 16);
  return creativeEpisodePlanSchema.parse({schemaVersion: "1.2", id: `creative-${document.productionId}-r${draft.revision}`, productionId: document.productionId, planRevision: draft.revision, compilerVersion: STORY_ENGINE_COMPILER_VERSION, title: document.title, fps: timing.fps, width, height: productionPolicy.outputHeight, projectType: showPack.projectType, productionPolicy, assetRoutingPolicy, showPackId: showPack.id, directingProfileId: profile.id, analysis, scenes, shots, visualRequirements});
}
