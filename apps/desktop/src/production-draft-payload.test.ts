import {describe, expect, it} from "vitest";
import {buildAnimaticSync, createRookPilot001Fixture, finalizeProductionBundle, hashCanonical} from "@storystage/story-engine";
import {productionDraftPayload} from "./production-draft-payload";

describe("production draft payload", () => {
  it("preserves every optional production field for exact approval-target deduplication", () => {
    const fixture = createRookPilot001Fixture();
    const build = buildAnimaticSync(fixture);
    const approvedAt = "2026-07-17T21:00:00.000Z";
    const track = {contentHash: "a".repeat(64), sourceFileName: "approved.wav", codec: "pcm-wav" as const, durationInSeconds: 26.3, sampleRate: 48_000, channels: 2 as const, bitsPerSample: 16 as const, importedAt: approvedAt, approvalStatus: "approved" as const, approvedAt};
    const voiceTrack = {...track, id: "voice-rook", relativeFile: "voice/rook-pilot-001/approved.wav"};
    const musicTrack = {...track, id: "music-rook", contentHash: "b".repeat(64), relativeFile: "music/rook-pilot-001/approved.wav"};
    const soundEffectAssets = [{...track, id: "sfx-rook", contentHash: "c".repeat(64), relativeFile: "sfx/rook-pilot-001/approved.wav"}];
    const soundEffectCues = [{id: "cue-rook", assetContentHash: soundEffectAssets[0]!.contentHash, shotId: build.renderPlan.shots[0]!.id, offsetInFrames: 1, gain: .7, label: "Footstep"}];
    const draft = {schemaVersion: "1.0" as const, production: fixture.draft, overrides: fixture.overrides, approvedAssetVersions: [], audioMix: {profile: "explainer" as const, voiceGain: 1, musicDecision: "approved-master" as const, musicGain: .1, musicLoop: true, transitionSfx: "paper-flip" as const, transitionSfxGain: .14, reviewed: true}, musicTrack, soundEffectAssets, soundEffectCues, voiceTrack, resolvedPlan: build.resolvedPlan, renderPlan: build.renderPlan, metrics: build.metrics, estimate: build.estimate};
    const bundle = finalizeProductionBundle(draft, approvedAt);
    const recovered = productionDraftPayload(bundle);
    expect(recovered).toEqual(draft);
    expect(hashCanonical(recovered)).toBe(hashCanonical(draft));
  });
});
