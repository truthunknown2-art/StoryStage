import {createHash} from "node:crypto";
import {mkdir, readFile, writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {bundle} from "@remotion/bundler";
import {renderStill, selectComposition} from "@remotion/renderer";
import {verifyPublicShowPackCandidate} from "@storystage/asset-pipeline/public-show-pack-promotion";
import {STORY_STAGE_PRODUCTION_COMPOSITION_ID} from "@storystage/remotion-runtime/manifest";
import type {ProductionCompositionProps} from "@storystage/remotion-runtime";
import {buildAnimaticSync, createRookPilot001Fixture, type ApprovedAssetVersion} from "@storystage/story-engine";

const workspaceRoot = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const candidateRoot = resolve(workspaceRoot, "packages/remotion-runtime/public/show-packs/weird-history/rook/v1");
const outputRoot = resolve(workspaceRoot, "artifacts/SS-009/rook-pilot-content-preview");
const candidateId = "weird-history-rook-v1";
const candidateContentHash = "6c60b1fa633a4c3c7e9a32cbe475a52277f38b7d5cf2e239b0acee2ada85c691";
const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

async function preparedDataUrl(file: string, expectedHash: string): Promise<string> {
  const bytes = await readFile(resolve(candidateRoot, ...file.split("/")));
  if (sha256(bytes) !== expectedHash) throw new Error(`Rook visual-preview pixels changed: ${file}`);
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

async function main(): Promise<void> {
  const {candidate} = await verifyPublicShowPackCandidate({candidateRoot, expectedCandidateId: candidateId, expectedCandidateContentHash: candidateContentHash});
  const fixture = createRookPilot001Fixture();
  const initial = buildAnimaticSync(fixture);
  const presenter = initial.resolvedPlan.characters.find((character) => character.entityName === "NARRATOR");
  const requirement = initial.resolvedPlan.requirements.find((entry) => entry.role === "character" && entry.entityId === presenter?.entityId);
  if (!presenter || !requirement) throw new Error("Rook Pilot 001 lost its unique presenter requirement.");
  const previewAsset: ApprovedAssetVersion = {assetId: "preview-rook-v1", version: "unapproved-candidate-preview", requirementId: requirement.id, contentHash: candidate.evidence.rigManifest.contentHash, relativeFile: "preview-only/manifest.json", provenance: candidate.rights, approvedAt: candidate.generatedAt};
  const build = buildAnimaticSync({...fixture, approvedAssetVersions: [previewAsset]});
  const prepared = new Map(candidate.preparedFiles.map((file) => [file.role, file]));
  const neutral = prepared.get("neutral-pose")!;
  const talk = prepared.get("talk-pose")!;
  const reaction = prepared.get("reaction-pose")!;
  const inputProps: ProductionCompositionProps = {
    plan: build.renderPlan,
    playbackAssets: {[previewAsset.assetId]: {type: "character-rig", assetId: previewAsset.assetId, neutral: await preparedDataUrl(neutral.file, neutral.contentHash), talk: await preparedDataUrl(talk.file, talk.contentHash), reaction: await preparedDataUrl(reaction.file, reaction.contentHash)}},
    sliceDurationInFrames: build.renderPlan.durationInFrames,
    previewWatermark: "Unapproved Rook candidate · visual QA only",
  };
  await mkdir(outputRoot, {recursive: true});
  const serveUrl = await bundle({entryPoint: resolve(workspaceRoot, "packages/remotion-runtime/src/remotion-entry.ts"), publicDir: resolve(workspaceRoot, "packages/remotion-runtime/public")});
  const composition = await selectComposition({serveUrl, id: STORY_STAGE_PRODUCTION_COMPOSITION_ID, inputProps});
  const desiredTreatments = ["environment", "character-performance", "generated-illustration", "diagram", "kinetic-type", "reaction"] as const;
  const frames = desiredTreatments.map((treatment) => {
    const shot = build.renderPlan.shots.find((candidateShot) => candidateShot.treatment === treatment);
    if (!shot) throw new Error(`Rook Pilot 001 lost its ${treatment} treatment.`);
    return {frame: shot.startFrame + Math.floor(shot.durationInFrames / 2), shotId: shot.id, treatment};
  });
  for (const item of frames) await renderStill({composition, frame: item.frame, inputProps, output: resolve(outputRoot, `${item.treatment}-${item.shotId}.png`), serveUrl});
  await writeFile(resolve(outputRoot, "preview-report.json"), `${JSON.stringify({schemaVersion: "1.0", status: "unapproved-candidate-content-preview", candidateId, candidateContentHash, durationInFrames: build.renderPlan.durationInFrames, durationSeconds: build.renderPlan.durationInFrames / build.renderPlan.fps, shotCount: build.renderPlan.shots.length, reconstructionBriefCount: build.resolvedPlan.generationBriefs.filter((brief) => brief.outputRole === "reconstruction").length, treatmentDistribution: build.metrics.treatmentDistribution, frames}, null, 2)}\n`, "utf8");
  process.stdout.write(`Rendered ${frames.length} watermarked Rook Pilot 001 review frames to ${outputRoot}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
