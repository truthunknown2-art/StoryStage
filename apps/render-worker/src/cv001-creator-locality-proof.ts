import {createHash} from "node:crypto";
import {mkdir, readFile, writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {bundle} from "@remotion/bundler";
import {renderStill, selectComposition} from "@remotion/renderer";
import type {ProductionCompositionProps} from "@storystage/remotion-runtime";
import {STORY_STAGE_PRODUCTION_COMPOSITION_ID} from "@storystage/remotion-runtime/manifest";
import {
  commitCv001CreatorCommand,
  compileCv001CreatorScene,
  createCv001CreatorProject,
  createCv001ThreeBeatProofFixture,
  getCv001LanternPickupTransform,
  parseCv001CreatorCommand,
  CV001_DEFAULT_SCRIPT,
} from "@storystage/story-engine";

const workspaceRoot = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const outputRoot = resolve(workspaceRoot, "artifacts/CV-001/creator-direction-locality-proof");
const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

async function main(): Promise<void> {
  const fixture = createCv001ThreeBeatProofFixture();
  const project = createCv001CreatorProject({title: "The Lantern Discovery", script: CV001_DEFAULT_SCRIPT});
  const baseline = compileCv001CreatorScene({
    baseInput: project.baseInput,
    directionState: project.directionState,
    renderPlan: fixture.renderPlan,
  });
  const edited = commitCv001CreatorCommand({
    project,
    command: parseCv001CreatorCommand(project.baseInput.beats[1].id, "Make it bigger"),
    renderPlan: fixture.renderPlan,
  }).compiled;

  if (baseline.sceneMotion.bindings[0].contentHash !== edited.sceneMotion.bindings[0].contentHash)
    throw new Error("Beat 1 binding changed during a Beat 2 edit.");
  if (baseline.sceneMotion.bindings[2].contentHash !== edited.sceneMotion.bindings[2].contentHash)
    throw new Error("Beat 3 binding changed during a Beat 2 edit.");
  if (baseline.sceneMotion.bindings[1].contentHash === edited.sceneMotion.bindings[1].contentHash)
    throw new Error("Beat 2 binding did not change.");

  const baselinePickup = getCv001LanternPickupTransform(baseline.sceneMotion.bindings[1].program);
  const editedPickup = getCv001LanternPickupTransform(edited.sceneMotion.bindings[1].program);
  if (JSON.stringify(baselinePickup) !== JSON.stringify(editedPickup))
    throw new Error("Beat 2 edit changed the pickup attachment world transform.");

  await mkdir(outputRoot, {recursive: true});
  const serveUrl = await bundle({
    entryPoint: resolve(workspaceRoot, "packages/remotion-runtime/src/remotion-entry.ts"),
    publicDir: resolve(workspaceRoot, "packages/remotion-runtime/public"),
  });
  const createProps = (directedSceneMotion: ProductionCompositionProps["directedSceneMotion"]): ProductionCompositionProps => ({
    plan: fixture.renderPlan,
    playbackAssets: {},
    sliceDurationInFrames: fixture.renderPlan.durationInFrames,
    directedSceneMotion,
    showMotionDiagnostics: false,
  });
  const baselineProps = createProps(baseline.sceneMotion);
  const editedProps = createProps(edited.sceneMotion);
  const baselineComposition = await selectComposition({
    serveUrl,
    id: STORY_STAGE_PRODUCTION_COMPOSITION_ID,
    inputProps: baselineProps,
  });
  const editedComposition = await selectComposition({
    serveUrl,
    id: STORY_STAGE_PRODUCTION_COMPOSITION_ID,
    inputProps: editedProps,
  });
  const auditFrames = [0, 30, 89, 90, 120, 150, 180, 209, 210, 240, 299] as const;
  const comparisons = [];
  for (const frame of auditFrames) {
    const baselineFile = resolve(outputRoot, `baseline-${String(frame).padStart(3, "0")}.png`);
    const editedFile = resolve(outputRoot, `edited-${String(frame).padStart(3, "0")}.png`);
    await renderStill({composition: baselineComposition, frame, inputProps: baselineProps, output: baselineFile, serveUrl});
    await renderStill({composition: editedComposition, frame, inputProps: editedProps, output: editedFile, serveUrl});
    const baselineHash = sha256(await readFile(baselineFile));
    const editedHash = sha256(await readFile(editedFile));
    const beatIndex = frame < 90 ? 0 : frame < 210 ? 1 : 2;
    const matches = baselineHash === editedHash;
    if (beatIndex !== 1 && !matches)
      throw new Error(`Unrelated Beat ${beatIndex + 1} changed at rendered frame ${frame}.`);
    comparisons.push({frame, beatIndex, baselineHash, editedHash, matches});
  }
  if (!comparisons.some((comparison) => comparison.beatIndex === 1 && !comparison.matches))
    throw new Error("Beat 2 direction edit produced no visible rendered-frame change.");

  const report = {
    schemaVersion: "1.0",
    status: "creator-direction-locality-proof",
    command: "Make it bigger",
    selectedBeatId: project.baseInput.beats[1].id,
    baselineCompiledHash: baseline.contentHash,
    editedCompiledHash: edited.contentHash,
    bindingDelta: baseline.sceneMotion.bindings.map((binding, index) => {
      const editedBinding = edited.sceneMotion.bindings[index]!;
      return {
        beatId: binding.beatId,
        before: binding.contentHash,
        after: editedBinding.contentHash,
        changed: binding.contentHash !== editedBinding.contentHash,
      };
    }),
    pickupTransform: {baseline: baselinePickup, edited: editedPickup, exactMatch: true},
    unrelatedRenderedFramesExactMatch: comparisons
      .filter((comparison) => comparison.beatIndex !== 1)
      .every((comparison) => comparison.matches),
    selectedBeatHasVisibleDelta: comparisons
      .filter((comparison) => comparison.beatIndex === 1)
      .some((comparison) => !comparison.matches),
    comparisons,
  };
  await writeFile(resolve(outputRoot, "proof-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`Rendered CV-001 creator locality proof to ${outputRoot}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`);
  process.exitCode = 1;
});
