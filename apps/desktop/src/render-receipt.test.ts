import {describe, expect, it} from "vitest";
import {createHash} from "node:crypto";
import {buildAnimaticSync, createRookPilot001Fixture, deliveryRenderPlanContentHash, finalizeProductionBundle, finalizeRenderReceipt} from "@storystage/story-engine";
import {assertVerifiedFullRenderReceipt} from "./render-receipt";

describe("durable render receipt verification", () => {
  it("binds the exact production snapshot and completed master bytes", () => {
    const fixture = createRookPilot001Fixture();
    const build = buildAnimaticSync(fixture);
    const bundle = finalizeProductionBundle({schemaVersion: "1.0", production: fixture.draft, overrides: fixture.overrides, resolvedPlan: build.resolvedPlan, renderPlan: build.renderPlan, metrics: build.metrics, estimate: build.estimate}, "2026-07-17T23:55:00.000Z");
    const masterBytes = Buffer.from("verified mp4 fixture bytes");
    const receipt = finalizeRenderReceipt({schemaVersion: "1.0", renderId: "render-one", production: {id: bundle.production.productionId, revision: bundle.production.revision, bundleContentHash: bundle.contentHash, renderPlanContentHash: deliveryRenderPlanContentHash(bundle.renderPlan)}, scope: "full-production", master: {relativeFile: "master.mp4", sha256: createHash("sha256").update(masterBytes).digest("hex"), byteLength: masterBytes.length, codec: "h264", width: 1920, height: 1080, fps: 30, frameCount: bundle.renderPlan.durationInFrames, durationInSeconds: bundle.renderPlan.durationInFrames / 30, audio: {codec: "aac", channels: 2, sampleRate: 48_000}}, toolchain: {storyStageVersion: "0.1.0", storyStageCommit: "test", compilerVersion: bundle.renderPlan.compilerVersion, remotionVersion: "4.0.490", ffmpegVersion: "test", platform: "win32", architecture: "x64"}, completedAt: "2026-07-17T23:56:00.000Z"});
    expect(() => assertVerifiedFullRenderReceipt({receipt, bundle, masterBytes, masterFile: "C:\\renders\\master.mp4"})).not.toThrow();
    expect(() => assertVerifiedFullRenderReceipt({receipt, bundle, masterBytes: Buffer.from("changed"), masterFile: "C:\\renders\\master.mp4"})).toThrow(/master/);
    expect(() => assertVerifiedFullRenderReceipt({receipt: {...receipt, production: {...receipt.production, bundleContentHash: "f".repeat(64)}}, bundle, masterBytes, masterFile: "C:\\renders\\master.mp4"})).toThrow();
  });
});
