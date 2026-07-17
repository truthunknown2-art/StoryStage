import {createHash} from "node:crypto";
import {mkdtemp, mkdir, readFile, rm, writeFile} from "node:fs/promises";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {afterEach, describe, expect, it} from "vitest";
import {buildAnimaticSync, createRookPilot001Fixture, deliveryRenderPlanContentHash, finalizeProductionBundle, finalizeRenderReceipt, type ApprovedAssetVersion} from "@storystage/story-engine";
import {publishDeliveryBundle, readVerifiedDeliveryBundle, type DeliveryPublishCheckpoint} from "./delivery-store";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, {recursive: true, force: true}))));

async function createDeliveryInput(root: string) {
  const fixture = createRookPilot001Fixture();
  const initial = buildAnimaticSync(fixture);
  const approvedAt = "2026-07-18T00:00:00.000Z";
  const approved: ApprovedAssetVersion[] = initial.resolvedPlan.requirements.map((requirement, index) => ({assetId: `approved-delivery-asset-${index + 1}`, version: `v${index + 1}`, requirementId: requirement.id, contentHash: createHash("sha256").update(requirement.id).digest("hex"), relativeFile: `approved-delivery-asset-${index + 1}/v${index + 1}/manifest.json`, provenance: {sourceType: "generated", provider: "StoryStage delivery test", usageNotes: "Original test fixture."}, approvedAt}));
  const build = buildAnimaticSync({draft: fixture.draft, overrides: fixture.overrides, approvedAssetVersions: approved});
  const bundle = finalizeProductionBundle({schemaVersion: "1.0", production: fixture.draft, overrides: fixture.overrides, approvedAssetVersions: approved, resolvedPlan: build.resolvedPlan, renderPlan: build.renderPlan, metrics: build.metrics, estimate: build.estimate}, approvedAt);
  const masterBytes = Buffer.from("delivery master bytes");
  const receipt = finalizeRenderReceipt({schemaVersion: "1.0", renderId: "render-delivery-test", production: {id: bundle.production.productionId, revision: bundle.production.revision, bundleContentHash: bundle.contentHash, renderPlanContentHash: deliveryRenderPlanContentHash(bundle.renderPlan)}, scope: "full-production", master: {relativeFile: "source.mp4", sha256: createHash("sha256").update(masterBytes).digest("hex"), byteLength: masterBytes.length, codec: "h264", width: 1920, height: 1080, fps: 30, frameCount: bundle.renderPlan.durationInFrames, durationInSeconds: bundle.renderPlan.durationInFrames / 30, audio: null}, toolchain: {storyStageVersion: "0.1.0", storyStageCommit: "test", compilerVersion: bundle.renderPlan.compilerVersion, remotionVersion: "4.0.490", ffmpegVersion: "test", platform: "win32", architecture: "x64"}, completedAt: "2026-07-18T00:01:00.000Z"});
  const inputs = join(root, "inputs"); await mkdir(inputs);
  const bundleFile = join(inputs, "bundle.json"); const receiptFile = join(inputs, "receipt.json"); const masterFile = join(inputs, "source.mp4");
  await Promise.all([writeFile(bundleFile, `${JSON.stringify(bundle, null, 2)}\n`), writeFile(receiptFile, `${JSON.stringify(receipt, null, 2)}\n`), writeFile(masterFile, masterBytes)]);
  return {deliveryRoot: join(root, "deliveries"), bundleFile, receiptFile, masterFile};
}

describe("atomic verified delivery publication", () => {
  it("publishes idempotently and rejects one-byte tampering", async () => {
    const root = await mkdtemp(join(tmpdir(), "storystage-delivery-")); roots.push(root);
    const input = await createDeliveryInput(root);
    const first = await publishDeliveryBundle(input);
    const second = await publishDeliveryBundle(input);
    expect(second.directory).toBe(first.directory);
    expect(second.manifest.contentHash).toBe(first.manifest.contentHash);
    expect(second.captionCueCount).toBeGreaterThan(0);
    await writeFile(join(first.directory, "captions.srt"), Buffer.concat([await readFile(join(first.directory, "captions.srt")), Buffer.from("x")]));
    await expect(readVerifiedDeliveryBundle(first.directory)).rejects.toThrow(/byte binding/);
  });

  it("recovers cleanly from every publication checkpoint", async () => {
    const checkpoints: DeliveryPublishCheckpoint[] = ["after-write:master.mp4", "after-write:captions.srt", "after-write:production-bundle.json", "after-write:render-receipt.json", "after-write:project-manifest.json", "after-write:provenance-rights.json", "after-write:delivery-manifest.json", "after-verify", "before-rename", "after-rename"];
    for (const checkpoint of checkpoints) {
      const root = await mkdtemp(join(tmpdir(), "storystage-delivery-crash-")); roots.push(root);
      const input = await createDeliveryInput(root);
      await expect(publishDeliveryBundle({...input, onCheckpoint: (current) => {if (current === checkpoint) throw new Error(`simulated crash at ${checkpoint}`);}})).rejects.toThrow(/simulated crash/);
      const recovered = await publishDeliveryBundle(input);
      expect(recovered.manifest.contentHash).toHaveLength(64);
      expect((await readVerifiedDeliveryBundle(recovered.directory)).directory).toBe(recovered.directory);
    }
  });
});
