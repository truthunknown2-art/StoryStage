#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import console from "node:console";
import process from "node:process";

const path = process.argv[2];
if (!path) {
  console.error("Usage: node audit-director-plan.mjs <plan.json>");
  process.exit(2);
}

const plan = JSON.parse(await readFile(path, "utf8"));
const errors = [];
const warnings = [];
const requireArray = (value, label) => {
  if (!Array.isArray(value) || value.length === 0)
    errors.push(`${label} must be a non-empty array.`);
  return Array.isArray(value) ? value : [];
};
const uniqueMap = (items, label) => {
  const map = new Map();
  for (const item of items) {
    if (!item?.id) errors.push(`${label} entry is missing id.`);
    else if (map.has(item.id))
      errors.push(`${label} contains duplicate id ${item.id}.`);
    else map.set(item.id, item);
  }
  return map;
};

const scenes = requireArray(plan.scenes, "scenes");
const beats = requireArray(plan.beats, "beats");
const shots = requireArray(plan.shots, "shots");
const audioIntents = Array.isArray(plan.audioIntents) ? plan.audioIntents : [];
const sceneById = uniqueMap(scenes, "scenes");
const beatById = uniqueMap(beats, "beats");
const shotById = uniqueMap(shots, "shots");
const audioById = uniqueMap(audioIntents, "audioIntents");

if (!Number.isInteger(plan.startFrame) || plan.startFrame < 0)
  errors.push("startFrame must be a non-negative integer.");
if (!Number.isInteger(plan.durationInFrames) || plan.durationInFrames <= 0)
  errors.push("durationInFrames must be a positive integer.");

for (const beat of beats) {
  if (!sceneById.has(beat.sceneId))
    errors.push(`Beat ${beat.id} references unknown scene ${beat.sceneId}.`);
  for (const field of [
    "audienceQuestion",
    "knowledgeBefore",
    "knowledgeAfter",
    "emotionBefore",
    "emotionAfter",
    "muteReadableAction",
    "audioReadableIntent",
  ])
    if (!beat[field])
      errors.push(`Beat ${beat.id ?? "?"} is missing ${field}.`);
  for (const shotId of requireArray(
    beat.shotIds,
    `Beat ${beat.id ?? "?"} shotIds`,
  ))
    if (!shotById.has(shotId))
      errors.push(`Beat ${beat.id} references unknown shot ${shotId}.`);
}

for (const shot of shots) {
  if (!beatById.has(shot.beatId))
    errors.push(`Shot ${shot.id} references unknown beat ${shot.beatId}.`);
  if (!shot.storyFunction) errors.push(`Shot ${shot.id} lacks storyFunction.`);
  if (!Number.isInteger(shot.startFrame) || shot.startFrame < 0)
    errors.push(`Shot ${shot.id} has invalid startFrame.`);
  if (!Number.isInteger(shot.durationInFrames) || shot.durationInFrames <= 0)
    errors.push(`Shot ${shot.id} has invalid durationInFrames.`);
  if (
    !shot.composition?.focalSubjectId ||
    !shot.composition?.screenDirection ||
    !Array.isArray(shot.composition?.depthPlaneIds) ||
    shot.composition.depthPlaneIds.length < 2
  )
    errors.push(`Shot ${shot.id} has incomplete composition.`);
  if (!shot.transition?.type || !shot.transition?.motivation)
    errors.push(`Shot ${shot.id} has unmotivated transition.`);
  if (!Array.isArray(shot.performanceProgramIds))
    errors.push(`Shot ${shot.id} is missing performanceProgramIds.`);
  if (
    !Array.isArray(shot.assetRequirementIds) ||
    shot.assetRequirementIds.length === 0
  )
    errors.push(`Shot ${shot.id} has no assets.`);
  const events = Array.isArray(shot.events) ? shot.events : [];
  const eventIds = new Set();
  for (const event of events) {
    if (eventIds.has(event.id))
      errors.push(`Shot ${shot.id} duplicates event ${event.id}.`);
    eventIds.add(event.id);
    if (
      !Number.isInteger(event.frameOffset) ||
      event.frameOffset < 0 ||
      event.frameOffset >= shot.durationInFrames
    )
      errors.push(`Event ${event.id} falls outside shot ${shot.id}.`);
  }
  for (const audioId of shot.audioIntentIds ?? []) {
    const audio = audioById.get(audioId);
    if (!audio)
      errors.push(
        `Shot ${shot.id} references unknown audio intent ${audioId}.`,
      );
    else if (audio.shotId !== shot.id)
      errors.push(`Audio intent ${audioId} is bound to the wrong shot.`);
    else if (!eventIds.has(audio.anchorEventId))
      errors.push(
        `Audio intent ${audioId} references unknown event ${audio.anchorEventId}.`,
      );
  }
  if (
    shot.durationInFrames > 90 &&
    (shot.performanceProgramIds?.length ?? 0) === 0
  )
    warnings.push(
      `Shot ${shot.id} exceeds three seconds without a performance program.`,
    );
}

for (const audio of audioIntents) {
  const shot = shotById.get(audio.shotId);
  if (!shot)
    errors.push(
      `Audio intent ${audio.id} references unknown shot ${audio.shotId}.`,
    );
  else {
    if (!(shot.audioIntentIds ?? []).includes(audio.id))
      errors.push(
        `Audio intent ${audio.id} is not consumed by shot ${shot.id}.`,
      );
    if (!(shot.events ?? []).some((event) => event.id === audio.anchorEventId))
      errors.push(
        `Audio intent ${audio.id} references unknown event ${audio.anchorEventId}.`,
      );
  }
}

for (const scene of scenes) {
  for (const beatId of requireArray(
    scene.beatIds,
    `Scene ${scene.id ?? "?"} beatIds`,
  ))
    if (!beatById.has(beatId))
      errors.push(`Scene ${scene.id} references unknown beat ${beatId}.`);
  if (!scene.sceneKitId)
    errors.push(`Scene ${scene.id} is missing sceneKitId.`);
}

for (const issue of errors) console.error(`ERROR ${issue}`);
for (const issue of warnings) console.warn(`WARN  ${issue}`);
console.log(`${errors.length} error(s), ${warnings.length} warning(s)`);
process.exit(errors.length ? 1 : 0);
