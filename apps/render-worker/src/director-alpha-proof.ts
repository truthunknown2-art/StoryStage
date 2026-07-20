import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import {
  renderMedia,
  renderStill,
  selectComposition,
} from "@remotion/renderer";
import type { ProductionCompositionProps } from "@storystage/remotion-runtime";
import { STORY_STAGE_PRODUCTION_COMPOSITION_ID } from "@storystage/remotion-runtime/manifest";
import {
  applyDirectorPatch,
  compileDirectorProject,
  createCv002ArtDirectionSelection,
  createCv002Project,
  proposeDirectorPatch,
  type Cv002Grammar,
} from "@storystage/story-engine/director-alpha";

const workspaceRoot = resolve(
  fileURLToPath(new URL("../../..", import.meta.url)),
);
const outputRoot = resolve(
  workspaceRoot,
  "artifacts/DSA-001/director-alpha-proof",
);
const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

const kidsScript = `Nia and Rowan sneak into the greenhouse after a silver seed begins tapping against the window. Nia lifts the latch, but the seed hops away and rolls beneath a tower of flowerpots. Rowan points toward the wobbling stack while Nia takes one careful step closer.

The seed suddenly sprouts two bright leaves and the children freeze. A tiny vine curls around Nia's boot, pauses, then points toward a dry fountain at the back of the room. Nia follows while Rowan hangs behind, watching the flowerpots tremble again.

At the fountain, Nia pours one drop of water onto the seed. Golden roots race through the cracked tiles and every sleeping plant opens at once. Rowan gasps a moment later, then laughs when the smallest blossom sneezes a cloud of blue pollen. The new garden settles into a warm glow, and the vine draws a doorway home.`;

const historyScript = `In 1814, London beer drinkers received a reminder that even a brewery can become a natural disaster. A giant vat at the Horse Shoe Brewery failed, and its collapsing hoops struck nearby tanks. The result was not a polite spill but a dark wave of porter rushing into the streets.

Londoners gasped at reports of broken walls, flooded cellars, and families trapped in crowded rooms. The brewery stood in a poor neighborhood where homes were packed below street level, so the liquid had nowhere safe to go. Eight people died, and the absurd headline hid a very real urban tragedy.

The strangest aftermath came in court. The flood was ruled an act of God, which meant the brewery avoided legal responsibility. Londoners were left with a disaster caused by industrial equipment but explained as bad luck, a conclusion almost as unbelievable as a tidal wave made of beer.`;

type Fixture = {
  slug: string;
  title: string;
  grammar: Cv002Grammar;
  script: string;
};

async function renderFixture(serveUrl: string, fixture: Fixture) {
  const fixtureRoot = resolve(outputRoot, fixture.slug);
  await mkdir(fixtureRoot, { recursive: true });
  const storyProject = createCv002Project(
    fixture.title,
    fixture.script,
    fixture.grammar,
    createCv002ArtDirectionSelection(
      fixture.grammar,
      fixture.grammar === "kids-adventure"
        ? "cut-paper-collage-mixed-media"
        : "weird-history-editorial-collage",
    ),
  );
  const first = compileDirectorProject({ storyProject });
  const repeated = compileDirectorProject({ storyProject });
  if (
    first.contentHash !== repeated.contentHash ||
    first.directorPlan.contentHash !== repeated.directorPlan.contentHash ||
    first.timingSolution.contentHash !== repeated.timingSolution.contentHash ||
    first.executableEpisodePlan.contentHash !==
      repeated.executableEpisodePlan.contentHash
  )
    throw new Error(
      `${fixture.slug} changed across identical Director compiles.`,
    );
  const episodePlan = first.executableEpisodePlan;
  const inputProps: ProductionCompositionProps = {
    mode: "director-episode",
    episodePlan,
  };
  const composition = await selectComposition({
    serveUrl,
    id: STORY_STAGE_PRODUCTION_COMPOSITION_ID,
    inputProps,
  });
  if (
    composition.durationInFrames !== episodePlan.format.durationInFrames ||
    composition.fps !== episodePlan.format.fps
  )
    throw new Error(
      `${fixture.slug} worker metadata diverged from its episode plan.`,
    );

  const multiBeat = first.directorPlan.beats.find(
    (beat) =>
      first.directorPlan.shots.filter((shot) =>
        shot.beatIds.includes(beat.beatId),
      ).length === 2,
  )!;
  const multiShots = first.directorPlan.shots.filter((shot) =>
    shot.beatIds.includes(multiBeat.beatId),
  );
  const multiRanges = multiShots.map(
    (shot) =>
      first.timingSolution.resolvedShots.find(
        (range) => range.shotId === shot.id,
      )!,
  );
  const patchBeat = first.directorPlan.beats.find((beat) =>
    first.directorPlan.events.some(
      (event) => event.beatId === beat.beatId && event.kind === "reaction",
    ),
  );
  if (!patchBeat)
    throw new Error(
      `${fixture.slug} has no event-bound reaction patch target.`,
    );
  const patch = proposeDirectorPatch({
    baseDirectorProject: first,
    targetBeatId: patchBeat.beatId,
    command: "Make the reaction 6 frames later",
  });
  const patched = applyDirectorPatch({
    storyProject,
    baseDirectorProject: first,
    patch,
  });
  const patchedRepeat = applyDirectorPatch({
    storyProject,
    baseDirectorProject: first,
    patch,
  });
  if (patched.contentHash !== patchedRepeat.contentHash)
    throw new Error(`${fixture.slug} Director patch was not deterministic.`);
  const baseUntouchedPrograms = [
    ...(first.executableEpisodePlan.proxyStagePrograms ?? []),
    ...(first.executableEpisodePlan.proxyCameraPrograms ?? []),
    ...(first.executableEpisodePlan.proxyEntityPrograms ?? []),
    ...(first.executableEpisodePlan.proxyCaptionPrograms ?? []),
    ...(first.executableEpisodePlan.proxyTransitionPrograms ?? []),
  ].filter((program) => !program.sourceBeatIds.includes(patchBeat.beatId));
  const patchedPrograms = new Map(
    [
      ...(patched.executableEpisodePlan.proxyStagePrograms ?? []),
      ...(patched.executableEpisodePlan.proxyCameraPrograms ?? []),
      ...(patched.executableEpisodePlan.proxyEntityPrograms ?? []),
      ...(patched.executableEpisodePlan.proxyCaptionPrograms ?? []),
      ...(patched.executableEpisodePlan.proxyTransitionPrograms ?? []),
    ].map((program) => [program.id, program]),
  );
  const preservedUntouchedPrograms = baseUntouchedPrograms.every(
    (program) =>
      patchedPrograms.get(program.id)?.contentHash === program.contentHash,
  );
  if (!preservedUntouchedPrograms)
    throw new Error(
      `${fixture.slug} Director patch changed an unrelated executable program.`,
    );
  const patchedInputProps: ProductionCompositionProps = {
    mode: "director-episode",
    episodePlan: patched.executableEpisodePlan,
  };
  const patchedComposition = await selectComposition({
    serveUrl,
    id: STORY_STAGE_PRODUCTION_COMPOSITION_ID,
    inputProps: patchedInputProps,
  });
  const delayOperation = patch.operations.find(
    (operation) => operation.kind === "delay-event",
  );
  if (!delayOperation)
    throw new Error(`${fixture.slug} patch is missing its delay operation.`);
  const patchedRange = patched.timingSolution.resolvedShots.find(
    (range) => range.shotId === delayOperation.sourceShotId,
  )!;
  const patchedStill = resolve(fixtureRoot, "patched-beat-start.png");
  const patchedRepeatStill = resolve(
    fixtureRoot,
    "patched-beat-start-repeat.png",
  );
  await renderStill({
    composition: patchedComposition,
    frame: patchedRange.startFrame,
    inputProps: patchedInputProps,
    output: patchedStill,
    serveUrl,
  });
  await renderStill({
    composition: patchedComposition,
    frame: patchedRange.startFrame,
    inputProps: patchedInputProps,
    output: patchedRepeatStill,
    serveUrl,
  });
  const patchedStillHash = sha256(await readFile(patchedStill));
  const patchedRepeatStillHash = sha256(await readFile(patchedRepeatStill));
  if (patchedStillHash !== patchedRepeatStillHash)
    throw new Error(
      `${fixture.slug} patched frame changed across identical renders.`,
    );
  const sceneStarts = first.directorPlan.scenes.map(
    (scene) =>
      first.timingSolution.resolvedShots.find((range) =>
        scene.shotIds.includes(range.shotId),
      )!.startFrame,
  );
  const movingShot =
    first.directorPlan.shots.find(
      (shot) => shot.camera.movement !== "locked",
    ) ?? first.directorPlan.shots[0]!;
  const movingRange = first.timingSolution.resolvedShots.find(
    (range) => range.shotId === movingShot.id,
  )!;
  const movingFrames = [
    movingRange.startFrame,
    Math.floor(
      (movingRange.startFrame + movingRange.endFrameExclusive - 1) / 2,
    ),
    movingRange.endFrameExclusive - 1,
  ];
  const auditFrames = [
    ...new Set([
      0,
      ...sceneStarts,
      multiRanges[0]!.endFrameExclusive - 1,
      multiRanges[1]!.startFrame,
      ...movingFrames,
      episodePlan.format.durationInFrames - 1,
    ]),
  ].sort((left, right) => left - right);
  const stills: Array<{
    frame: number;
    file: string;
    contentHash: string;
    repeatContentHash: string;
  }> = [];
  for (const frame of auditFrames) {
    const name = `frame-${String(frame).padStart(4, "0")}.png`;
    const repeatName = `frame-${String(frame).padStart(4, "0")}-repeat.png`;
    const file = resolve(fixtureRoot, name);
    const repeatFile = resolve(fixtureRoot, repeatName);
    await renderStill({
      composition,
      frame,
      inputProps,
      output: file,
      serveUrl,
    });
    await renderStill({
      composition,
      frame,
      inputProps,
      output: repeatFile,
      serveUrl,
    });
    const contentHash = sha256(await readFile(file));
    const repeatContentHash = sha256(await readFile(repeatFile));
    if (contentHash !== repeatContentHash)
      throw new Error(
        `${fixture.slug} frame ${frame} changed across identical renders.`,
      );
    stills.push({ frame, file: name, contentHash, repeatContentHash });
  }
  const movingHashes = movingFrames.map(
    (frame) => stills.find((still) => still.frame === frame)!.contentHash,
  );
  if (new Set(movingHashes).size < 3)
    throw new Error(
      `${fixture.slug} moving shot did not produce three distinct decoded frames.`,
    );

  const video = resolve(fixtureRoot, `${fixture.slug}.mp4`);
  await renderMedia({
    codec: "h264",
    composition,
    inputProps,
    outputLocation: video,
    serveUrl,
  });
  const report = {
    schemaVersion: "1.0",
    status: "pass",
    grammar: fixture.grammar,
    compositionId: STORY_STAGE_PRODUCTION_COMPOSITION_ID,
    storyProjectContentHash: storyProject.contentHash,
    directorProjectContentHash: first.contentHash,
    directorPlanContentHash: first.directorPlan.contentHash,
    timingSolutionContentHash: first.timingSolution.contentHash,
    executableEpisodePlanContentHash: episodePlan.contentHash,
    capabilitySummary: first.capabilityReport.summary,
    multiShotBeat: {
      beatId: multiBeat.beatId,
      shotIds: multiShots.map((shot) => shot.id),
      contiguous:
        multiRanges[0]!.endFrameExclusive === multiRanges[1]!.startFrame,
    },
    directorPatch: {
      contentHash: patch.contentHash,
      baseDirectorProjectContentHash: patch.baseDirectorProjectContentHash,
      editedDirectorProjectContentHash: patched.contentHash,
      editedExecutableEpisodePlanContentHash:
        patched.executableEpisodePlan.contentHash,
      targetBeatId: patch.targetBeatId,
      reactionDelayFrames: delayOperation.frames,
      preservedUntouchedPrograms,
      untouchedProgramCount: baseUntouchedPrograms.length,
      deterministicStill: {
        frame: patchedRange.startFrame,
        contentHash: patchedStillHash,
        repeatContentHash: patchedRepeatStillHash,
      },
    },
    movingShot: {
      shotId: movingShot.id,
      frames: movingFrames,
      distinctDecodedFrames: new Set(movingHashes).size,
    },
    format: episodePlan.format,
    stills,
    video: {
      file: `${fixture.slug}.mp4`,
      contentHash: sha256(await readFile(video)),
    },
  };
  await writeFile(
    resolve(fixtureRoot, "proof-report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  return report;
}

async function main() {
  await mkdir(outputRoot, { recursive: true });
  const serveUrl = await bundle({
    entryPoint: resolve(
      workspaceRoot,
      "packages/remotion-runtime/src/remotion-entry.ts",
    ),
    publicDir: resolve(workspaceRoot, "packages/remotion-runtime/public"),
  });
  const fixtures: Fixture[] = [
    {
      slug: "arbitrary-kids",
      title: "The Silver Seed",
      grammar: "kids-adventure",
      script: kidsScript,
    },
    {
      slug: "arbitrary-history",
      title: "The London Beer Flood",
      grammar: "weird-history",
      script: historyScript,
    },
  ];
  const reports = [];
  for (const fixture of fixtures)
    reports.push(await renderFixture(serveUrl, fixture));
  await writeFile(
    resolve(outputRoot, "proof-report.json"),
    `${JSON.stringify({ schemaVersion: "1.0", status: "pass", reports }, null, 2)}\n`,
    "utf8",
  );
  console.log(
    `Director Alpha dual proof PASS: ${reports.map((report) => report.executableEpisodePlanContentHash).join(", ")}`,
  );
  console.log(outputRoot);
}

await main();
