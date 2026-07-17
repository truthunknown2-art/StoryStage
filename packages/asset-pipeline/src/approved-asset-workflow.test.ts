import {createHash} from "node:crypto";
import {mkdir, mkdtemp, readFile, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach, describe, expect, it} from "vitest";
import {
  buildAnimaticSync,
  candidateBundleSchema,
  createProductionDraft,
  finalizeAssetReviewRecord,
  finalizeGenerationJob,
  finalizePreparationReport,
  finalizeProductionBundle,
  generationJobDraftSchema,
  type PreparedCandidate,
} from "@storystage/story-engine";
import {createImportRecordFromStagedCandidates} from "./import-record-builder";
import {
  buildApprovedProductionRevisionDraft,
  buildSelectedCandidateRigArtifacts,
  persistAssetReviewRecordSnapshot,
  promotePreparedCandidateSet,
  type PromotionCheckpoint,
  type SelectedRigCheckpoint,
} from "./approved-asset-workflow";

const roots: string[] = [];
const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, {recursive: true, force: true}))); });

async function createReplayFixture() {
  const root = await mkdtemp(join(tmpdir(), "storystage-replay-"));
  roots.push(root);
  const stagingRoot = join(root, "staging");
  const assetsRoot = join(root, "assets");
  await Promise.all([mkdir(join(stagingRoot, "candidates"), {recursive: true}), mkdir(join(stagingRoot, "prepared"), {recursive: true}), mkdir(assetsRoot, {recursive: true})]);
  const built = buildAnimaticSync({draft: createProductionDraft({productionId: "production-replay-test", title: "Replay test", projectType: "kids", showPackId: "kids-adventure-v1", preset: "draft", script: "INT. WORKSHOP - DAY\n\nMARA: I found it."})});
  const sourceBundle = finalizeProductionBundle({schemaVersion: "1.0", production: built.draft, overrides: [], approvedAssetVersions: [], resolvedPlan: built.resolvedPlan, renderPlan: built.renderPlan, metrics: built.metrics, estimate: built.estimate}, "2026-07-17T08:00:00.000Z");
  const job = finalizeGenerationJob(generationJobDraftSchema.parse({schemaVersion: "1.0", exchangeMode: "manual-chatgpt-images", production: {id: sourceBundle.production.productionId, revision: 1, title: sourceBundle.production.title}, productionBundleContentHash: sourceBundle.contentHash, showPack: {id: sourceBundle.resolvedPlan.showPack.id, version: sourceBundle.resolvedPlan.showPack.version, contentHash: sourceBundle.resolvedPlan.showPack.contentHash}, briefs: sourceBundle.resolvedPlan.generationBriefs, expectedOutputLayout: {manifest: "candidate-bundle.json", files: "candidates/<brief-id>/<candidate-set-id>/<file-role>"}}), {exchangeJobId: "job-replay-test", createdAt: "2026-07-17T08:01:00.000Z"});
  const brief = job.briefs[0]!;
  const candidateSetId = `set-${brief.id}-1`;
  const sourceById = new Map<string, Buffer>();
  const assets = brief.expectedFiles.map((fileRole) => {
    const candidateId = `candidate-${fileRole.replace(".png", "").replaceAll("-", "")}`;
    const bytes = Buffer.from(`source-${fileRole}`);
    sourceById.set(candidateId, bytes);
    return {candidateId, candidateSetId, briefId: brief.id, fileRole, relativeFile: `returned/${candidateId}.png`, contentHash: sha256(bytes), mediaType: "image/png" as const, width: 1600, height: 1800, rights: {sourceType: "generated" as const, provider: "chatgpt-images", usageNotes: "Filesystem replay test fixture."}};
  });
  const bundle = candidateBundleSchema.parse({schemaVersion: "1.0", exchangeMode: "manual-chatgpt-images", exchangeJobId: job.exchangeJobId, generationJobContentHash: job.contentHash, production: {id: job.production.id, revision: job.production.revision}, showPack: job.showPack, providerMetadata: {provider: "chatgpt-images", generatedAt: "2026-07-17T08:02:00.000Z", conversationReference: null}, assets});
  const staged = await Promise.all(assets.map(async (asset) => {
    const relativeFile = `candidates/${asset.candidateId}.png`;
    await writeFile(join(stagingRoot, ...relativeFile.split("/")), sourceById.get(asset.candidateId)!);
    return {candidateId: asset.candidateId, sourceContentHash: asset.contentHash, stagedContentHash: asset.contentHash, relativeFile, stagingState: "staged-byte-verified" as const, checks: {dimensions: true as const, mediaType: true as const, alphaOrMatte: true, registration: false as const}};
  }));
  const {record: importRecord} = createImportRecordFromStagedCandidates({job, importId: "import-replay-test", sourceMode: "structured-bundle", bundle, staged, createdAt: "2026-07-17T08:03:00.000Z"});
  const preparedCandidates: PreparedCandidate[] = await Promise.all(assets.map(async (asset) => {
    const bytes = Buffer.from(`prepared-${asset.fileRole}`);
    const relativeFile = `prepared/${asset.candidateId}.png`;
    await writeFile(join(stagingRoot, ...relativeFile.split("/")), bytes);
    return {schemaVersion: "1.0" as const, candidateId: asset.candidateId, candidateSetId, briefId: brief.id, requirementId: brief.requirementId, fileRole: asset.fileRole, assetClass: asset.fileRole === "identity-sheet.png" ? "reference-sheet" as const : "character-pose" as const, sourceContentHash: asset.contentHash, preparedContentHash: sha256(bytes), relativeFile, mediaType: "image/png" as const, width: 1600, height: 1800, contentBounds: {left: 100, top: 100, width: 1400, height: 1600}, registration: {anchorX: 0.5, anchorY: 0.98, pivotX: 800, pivotY: 1699, groundY: 1699}, processor: {id: "sharp" as const, version: "test"}, preparationState: "prepared" as const, checks: {dimensions: true as const, mediaType: true as const, alphaOrMatte: true as const, registration: true as const, metadataStripped: true as const}};
  }));
  const contactBytes = Buffer.from("contact-sheet");
  await writeFile(join(stagingRoot, "prepared", `contact-sheet-${candidateSetId}.png`), contactBytes);
  const report = finalizePreparationReport({schemaVersion: "1.0", importId: importRecord.importId, importRecordContentHash: importRecord.contentHash, exchangeJobId: job.exchangeJobId, processor: {id: "sharp", version: "test"}, candidateSets: [{candidateSetId, briefId: brief.id, requirementId: brief.requirementId, outputRole: brief.outputRole, status: "ready-for-review", preparedCandidates, failures: [], contactSheet: {candidateSetId, relativeFile: `prepared/contact-sheet-${candidateSetId}.png`, contentHash: sha256(contactBytes), width: 680, height: 440, cells: preparedCandidates.map((candidate, index) => ({candidateId: candidate.candidateId, fileRole: candidate.fileRole, left: (index % 2) * 340, top: Math.floor(index / 2) * 220, width: 320, height: 180}))}}]}, "2026-07-17T08:04:00.000Z");
  return {stagingRoot, assetsRoot, brief, candidateSetId, report, importRecord};
}

async function buildReplayRig(fixture: Awaited<ReturnType<typeof createReplayFixture>>, createdAt: string, onCheckpoint?: (checkpoint: SelectedRigCheckpoint) => void | Promise<void>) {
  return buildSelectedCandidateRigArtifacts({...fixture, createdAt, onCheckpoint, renderDiagnostic: async ({outputFile}) => { await writeFile(outputFile, Buffer.from("moving-rig-diagnostic")); }});
}

describe("shared approved-asset workflow", () => {
  it("applies an approved version into the exact next production revision", () => {
    const built = buildAnimaticSync({draft: createProductionDraft({productionId: "production-revision-test", title: "Revision test", projectType: "kids", showPackId: "kids-adventure-v1", preset: "draft", script: "INT. WORKSHOP - DAY\n\nMARA: I found it."})});
    const sourceBundle = finalizeProductionBundle({schemaVersion: "1.0", production: built.draft, overrides: [], approvedAssetVersions: [], resolvedPlan: built.resolvedPlan, renderPlan: built.renderPlan, metrics: built.metrics, estimate: built.estimate}, "2026-07-17T08:00:00.000Z");
    const brief = sourceBundle.resolvedPlan.generationBriefs[0]!;
    const approvedAsset = {assetId: "approved-mara-test", version: "sha256-test", requirementId: brief.requirementId, contentHash: "a".repeat(64), relativeFile: "approved-mara-test/sha256-test/manifest.json", provenance: {sourceType: "generated" as const, provider: "chatgpt-images", usageNotes: "Test fixture."}, approvedAt: "2026-07-17T08:15:00.000Z"};
    const next = buildApprovedProductionRevisionDraft({sourceBundle, approvedAssetVersions: [approvedAsset]});
    expect(next.production.revision).toBe(2);
    expect(next.approvedAssetVersions).toEqual([approvedAsset]);
    expect(next.resolvedPlan.generationBriefs.some((candidate) => candidate.requirementId === brief.requirementId)).toBe(false);
    expect(next.resolvedPlan.approvedAssets.some((candidate) => candidate.id === approvedAsset.assetId && candidate.contentHash === approvedAsset.contentHash)).toBe(true);
  });

  it("persists only a content-hash-valid review snapshot and current pointer", async () => {
    const reviewsRoot = await mkdtemp(join(tmpdir(), "storystage-reviews-"));
    roots.push(reviewsRoot);
    const record = finalizeAssetReviewRecord({schemaVersion: "1.0", exchangeJobId: "job-review-test", importId: "import-review-test", preparationReportContentHash: "b".repeat(64), decisions: []}, "2026-07-17T08:11:00.000Z");
    await persistAssetReviewRecordSnapshot({reviewsRoot, record});
    expect(JSON.parse(await readFile(join(reviewsRoot, "current.json"), "utf8"))).toMatchObject({contentHash: record.contentHash});
    await expect(persistAssetReviewRecordSnapshot({reviewsRoot, record: {...record, contentHash: "c".repeat(64)}})).rejects.toThrow(/content hash/i);
  });

  for (const crashPoint of ["manifest-persisted", "validation-persisted", "diagnostic-video-persisted", "diagnostic-report-persisted"] satisfies SelectedRigCheckpoint[]) {
    it(`replays selected-rig construction after a crash at ${crashPoint}`, async () => {
      const fixture = await createReplayFixture();
      let crashed = false;
      await expect(buildReplayRig(fixture, "2026-07-17T08:10:00.000Z", (checkpoint) => {
        if (!crashed && checkpoint === crashPoint) {
          crashed = true;
          throw new Error(`simulated crash after ${checkpoint}`);
        }
      })).rejects.toThrow("simulated crash");
      const recovered = await buildReplayRig(fixture, "2026-07-17T08:20:00.000Z");
      const replayed = await buildReplayRig(fixture, "2026-07-17T08:30:00.000Z");
      expect(replayed).toEqual(recovered);
    });
  }

  it("replays selected-rig construction when the process dies before selected-review persistence", async () => {
    const fixture = await createReplayFixture();
    const completedBeforeReview = await buildReplayRig(fixture, "2026-07-17T08:10:00.000Z");
    expect(await buildReplayRig(fixture, "2026-07-17T08:20:00.000Z")).toEqual(completedBeforeReview);
  });

  for (const crashPoint of ["asset-files-persisted", "manifest-persisted", "validation-persisted", "diagnostic-video-persisted", "diagnostic-report-persisted"] satisfies PromotionCheckpoint[]) {
    it(`replays promotion after a crash at ${crashPoint}`, async () => {
      const fixture = await createReplayFixture();
      await buildReplayRig(fixture, "2026-07-17T08:10:00.000Z");
      let crashed = false;
      await expect(promotePreparedCandidateSet({...fixture, approvedAt: "2026-07-17T08:15:00.000Z", onCheckpoint: (checkpoint) => {
        if (!crashed && checkpoint === crashPoint) {
          crashed = true;
          throw new Error(`simulated crash after ${checkpoint}`);
        }
      }})).rejects.toThrow("simulated crash");
      const recovered = await promotePreparedCandidateSet({...fixture, approvedAt: "2026-07-17T08:25:00.000Z"});
      const replayed = await promotePreparedCandidateSet({...fixture, approvedAt: "2026-07-17T08:35:00.000Z"});
      expect(replayed).toEqual(recovered);
    });
  }

  it("replays promotion when the process dies before approved-review persistence", async () => {
    const fixture = await createReplayFixture();
    await buildReplayRig(fixture, "2026-07-17T08:10:00.000Z");
    const completedBeforeReview = await promotePreparedCandidateSet({...fixture, approvedAt: "2026-07-17T08:15:00.000Z"});
    expect(await promotePreparedCandidateSet({...fixture, approvedAt: "2026-07-17T08:25:00.000Z"})).toEqual(completedBeforeReview);
  });
});
