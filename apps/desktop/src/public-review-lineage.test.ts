import {describe, expect, it} from "vitest";
import {audioMixSchema, buildAnimaticSync, createRookPilot001Fixture, finalizeProductionBundle, finalizePublicShowPackReviewRecord, type ApprovedAssetVersion} from "@storystage/story-engine";
import {assertApprovedPublicReviewLineage} from "./public-review-lineage";

describe("public review production lineage", () => {
  it("preserves approval when later voice or timing work changes the target revision hash", () => {
    const fixture = createRookPilot001Fixture();
    const sourceBuild = buildAnimaticSync(fixture);
    const presenter = sourceBuild.resolvedPlan.characters.find((entry) => entry.entityName === "NARRATOR")!;
    const requirement = sourceBuild.resolvedPlan.requirements.find((entry) => entry.role === "character" && entry.entityId === presenter.entityId)!;
    const approvedAt = "2026-07-17T23:00:00.000Z";
    const approved: ApprovedAssetVersion = {assetId: `approved-weird-history-rook-v1-${requirement.id}`, version: "sha256-rook", requirementId: requirement.id, contentHash: "a".repeat(64), relativeFile: "approved-rook/sha256-rook/manifest.json", provenance: {sourceType: "generated", provider: "ChatGPT Images", usageNotes: "Reviewed."}, approvedAt};
    const production = {...fixture.draft, revision: 2};
    const build = buildAnimaticSync({draft: production, overrides: fixture.overrides, approvedAssetVersions: [approved]});
    const base = {schemaVersion: "1.0" as const, production, overrides: fixture.overrides, approvedAssetVersions: [approved], soundEffectAssets: [], soundEffectCues: [], resolvedPlan: build.resolvedPlan, renderPlan: build.renderPlan, metrics: build.metrics, estimate: build.estimate};
    const originalTarget = finalizeProductionBundle({...base, audioMix: audioMixSchema.parse({profile: "explainer", voiceGain: 1, musicDecision: "pending", musicGain: .1, musicLoop: true, transitionSfx: "paper-flip", transitionSfxGain: .14, reviewed: false})}, approvedAt);
    const currentTarget = finalizeProductionBundle({...base, audioMix: audioMixSchema.parse({profile: "explainer", voiceGain: .9, musicDecision: "none", musicGain: .1, musicLoop: true, transitionSfx: "paper-flip", transitionSfxGain: .12, reviewed: true})}, "2026-07-17T23:10:00.000Z");
    const currentWithoutRook = finalizeProductionBundle({...base, approvedAssetVersions: [], audioMix: audioMixSchema.parse({profile: "explainer", voiceGain: .9, musicDecision: "none", musicGain: .1, musicLoop: true, transitionSfx: "paper-flip", transitionSfxGain: .12, reviewed: true})}, "2026-07-17T23:11:00.000Z");
    const review = finalizePublicShowPackReviewRecord({schemaVersion: "1.0", candidateId: "weird-history-rook-v1", candidateContentHash: "b".repeat(64), productionId: production.productionId, sourceProductionRevision: 1, sourceProductionBundleContentHash: "c".repeat(64), decision: "approved", acknowledgements: {identitySheet: true, neutralPose: true, talkPose: true, reactionPose: true, movingDiagnostic: true, identityConsistency: true, matteEdges: true, provenance: true}, decidedAt: approvedAt, approvedAssetVersion: approved, targetProductionRevision: 2, targetProductionBundleContentHash: originalTarget.contentHash});
    expect(currentTarget.contentHash).not.toBe(originalTarget.contentHash);
    expect(() => assertApprovedPublicReviewLineage({review, originalTarget, currentTarget})).not.toThrow();
    expect(() => assertApprovedPublicReviewLineage({review, originalTarget, currentTarget: currentWithoutRook})).toThrow(/approved Rook asset/);
  });
});
