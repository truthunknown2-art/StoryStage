import {describe, expect, it} from "vitest";
import {buildAnimaticSync} from "./pipeline";
import {createRookPilot001Fixture} from "./pilots/rook-pilot-001";
import {finalizeProductionBundle} from "./production-bundle";
import {buildDeliverySrt, deliveryRenderPlanContentHash, finalizeDeliveryManifest, finalizeRenderReceipt, verifyDeliveryManifestHash, verifyRenderReceiptHash} from "./delivery";

const hash = (character: string) => character.repeat(64);

describe("delivery contracts", () => {
  it("content-binds a full-production render receipt and every delivery payload", () => {
    const receipt = finalizeRenderReceipt({
      schemaVersion: "1.0",
      renderId: "render-proof-one",
      production: {id: "production-one", revision: 2, bundleContentHash: hash("a"), renderPlanContentHash: hash("b")},
      scope: "full-production",
      master: {relativeFile: "render-output/master.mp4", sha256: hash("c"), byteLength: 4096, codec: "h264", width: 1920, height: 1080, fps: 30, frameCount: 790, durationInSeconds: 790 / 30, audio: {codec: "aac", channels: 2, sampleRate: 48_000}},
      toolchain: {storyStageVersion: "0.1.0", storyStageCommit: "abc1234", compilerVersion: "1", remotionVersion: "4.0.490", ffmpegVersion: "6.0", platform: "win32", architecture: "x64"},
      completedAt: "2026-07-17T23:30:00.000Z",
    });
    expect(verifyRenderReceiptHash(receipt)).toBe(true);
    expect(verifyRenderReceiptHash({...receipt, master: {...receipt.master, byteLength: 4097}})).toBe(false);

    const manifest = finalizeDeliveryManifest({
      schemaVersion: "1.0",
      production: receipt.production,
      renderReceiptContentHash: receipt.contentHash,
      createdAt: receipt.completedAt,
      files: [
        {role: "master", relativeFile: "master.mp4", sha256: hash("1"), byteLength: 100},
        {role: "captions", relativeFile: "captions.srt", sha256: hash("2"), byteLength: 10},
        {role: "production-bundle", relativeFile: "production-bundle.json", sha256: hash("3"), byteLength: 10},
        {role: "render-receipt", relativeFile: "render-receipt.json", sha256: hash("4"), byteLength: 10},
        {role: "project-manifest", relativeFile: "project-manifest.json", sha256: hash("5"), byteLength: 10},
        {role: "provenance-rights", relativeFile: "provenance-rights.json", sha256: hash("6"), byteLength: 10},
      ],
    });
    expect(verifyDeliveryManifestHash(manifest)).toBe(true);
    expect(() => finalizeDeliveryManifest({...manifest, files: manifest.files.slice(0, 5)})).toThrow();
  });

  it("derives deterministic UTF-8 SRT from exact final frame boundaries", () => {
    const fixture = createRookPilot001Fixture();
    const build = buildAnimaticSync(fixture);
    const bundle = finalizeProductionBundle({schemaVersion: "1.0", production: fixture.draft, overrides: fixture.overrides, resolvedPlan: build.resolvedPlan, renderPlan: build.renderPlan, metrics: build.metrics, estimate: build.estimate}, "2026-07-17T23:40:00.000Z");
    const firstCaption = bundle.renderPlan.shots.find((shot) => shot.caption)!;
    const delivery = buildDeliverySrt(bundle);
    expect(delivery.cueCount).toBeGreaterThanOrEqual(bundle.renderPlan.shots.filter((shot) => shot.caption).length);
    expect(delivery.text).toContain("1\r\n");
    expect(delivery.text).toContain(firstCaption.caption!);
    expect(delivery.text).toMatch(/\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/);
    expect(deliveryRenderPlanContentHash(bundle.renderPlan)).toHaveLength(64);
  });

  it("honors an explicit sidecar-caption omission for a spoken shot", () => {
    const fixture = createRookPilot001Fixture();
    const initial = buildAnimaticSync(fixture);
    const spoken = initial.renderPlan.shots.find((shot) => shot.caption)!;
    const explicitOverrides = [...fixture.overrides, {shotId: spoken.id, caption: null as null}];
    const explicitBuild = buildAnimaticSync({draft: fixture.draft, overrides: explicitOverrides});
    const explicitBundle = finalizeProductionBundle({schemaVersion: "1.0", production: fixture.draft, overrides: explicitOverrides, resolvedPlan: explicitBuild.resolvedPlan, renderPlan: explicitBuild.renderPlan, metrics: explicitBuild.metrics, estimate: explicitBuild.estimate}, "2026-07-17T23:50:00.000Z");
    const delivery = buildDeliverySrt(explicitBundle);
    expect(delivery.text).not.toContain(spoken.caption!);
    expect(delivery.cueCount).toBeLessThan(buildDeliverySrt(finalizeProductionBundle({schemaVersion: "1.0", production: fixture.draft, overrides: fixture.overrides, resolvedPlan: initial.resolvedPlan, renderPlan: initial.renderPlan, metrics: initial.metrics, estimate: initial.estimate}, "2026-07-17T23:51:00.000Z")).cueCount);
  });
});
