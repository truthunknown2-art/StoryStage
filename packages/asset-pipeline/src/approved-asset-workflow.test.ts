import {mkdtemp, readFile, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach, describe, expect, it} from "vitest";
import {
  buildAnimaticSync,
  createProductionDraft,
  finalizeAssetReviewRecord,
  finalizeProductionBundle,
} from "@storystage/story-engine";
import {buildApprovedProductionRevisionDraft, persistAssetReviewRecordSnapshot} from "./approved-asset-workflow";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, {recursive: true, force: true}))); });

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
});
