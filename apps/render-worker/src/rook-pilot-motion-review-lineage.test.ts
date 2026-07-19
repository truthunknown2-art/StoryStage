import {describe, expect, it} from "vitest";
import {
  buildAnimaticSync,
  createRookPilot001Fixture,
  finalizeGenerationJob,
  finalizeProductionBundle,
  generationExchangeStateSchema,
  generationJobDraftSchema,
  type GenerationExchangeState,
  type GenerationJob,
  type ProductionBundle,
} from "@storystage/story-engine";
import {verifyRookMotionReviewLineage} from "./rook-pilot-motion-review-lineage";

const savedAt = "2026-07-17T23:45:00.000Z";
const jobCreatedAt = "2026-07-17T23:46:00.000Z";

function lineageFixture(): {sourceProduction: ProductionBundle; generationJob: GenerationJob; exchangeState: GenerationExchangeState} {
  const fixture = createRookPilot001Fixture();
  const build = buildAnimaticSync(fixture);
  const sourceProduction = finalizeProductionBundle({schemaVersion: "1.0", production: build.draft, overrides: fixture.overrides, approvedAssetVersions: [], resolvedPlan: build.resolvedPlan, renderPlan: build.renderPlan, metrics: build.metrics, estimate: build.estimate}, savedAt);
  const generationJob = finalizeGenerationJob(generationJobDraftSchema.parse({
    schemaVersion: "1.0",
    exchangeMode: "manual-chatgpt-images",
    production: {id: sourceProduction.production.productionId, revision: sourceProduction.production.revision, title: sourceProduction.production.title},
    productionBundleContentHash: sourceProduction.contentHash,
    showPack: {id: sourceProduction.resolvedPlan.showPack.id, version: sourceProduction.resolvedPlan.showPack.version, contentHash: sourceProduction.resolvedPlan.showPack.contentHash},
    briefs: sourceProduction.resolvedPlan.generationBriefs,
    expectedOutputLayout: {manifest: "candidate-bundle.json", files: "candidates/<brief-id>/<candidate-set-id>/<file-role>"},
  }), {exchangeJobId: "job-rook-motion-review-test", createdAt: jobCreatedAt});
  const exchangeState = generationExchangeStateSchema.parse({schemaVersion: "1.0", exchangeJobId: generationJob.exchangeJobId, generationJobContentHash: generationJob.contentHash, production: {id: generationJob.production.id, revision: generationJob.production.revision}, status: "needs-review", importId: "import-rook-motion-review-test", supersededBy: null, updatedAt: jobCreatedAt});
  return {sourceProduction, generationJob, exchangeState};
}

const verify = (fixture: ReturnType<typeof lineageFixture>, currentRenderPlanContentHash = fixture.sourceProduction.renderPlan.contentHash) => verifyRookMotionReviewLineage({
  ...fixture,
  currentProduction: {id: fixture.sourceProduction.production.productionId, revision: fixture.sourceProduction.production.revision},
  currentRenderPlanContentHash,
});

describe("Rook motion-review lineage", () => {
  it("accepts one exact source-production, generation-job, and exchange chain", () => {
    expect(verify(lineageFixture()).sourceProduction.renderPlan.contentHash).toHaveLength(64);
  });

  it("rejects a source-production file whose bytes no longer match its hash", () => {
    const fixture = lineageFixture();
    expect(() => verify({...fixture, sourceProduction: {...fixture.sourceProduction, savedAt: "2026-07-18T00:00:00.000Z"}})).toThrow(/source production failed/i);
  });

  it("rejects a valid generation job bound to a different production snapshot", () => {
    const fixture = lineageFixture();
    const generationJob = finalizeGenerationJob(generationJobDraftSchema.parse({
      schemaVersion: fixture.generationJob.schemaVersion,
      exchangeMode: fixture.generationJob.exchangeMode,
      production: fixture.generationJob.production,
      productionBundleContentHash: "a".repeat(64),
      showPack: fixture.generationJob.showPack,
      briefs: fixture.sourceProduction.resolvedPlan.generationBriefs,
      expectedOutputLayout: fixture.generationJob.expectedOutputLayout,
    }), {exchangeJobId: fixture.generationJob.exchangeJobId, createdAt: jobCreatedAt});
    expect(() => verify({...fixture, generationJob})).toThrow(/not bound to the packet source production/i);
  });

  it("rejects an exchange state bound to a different generation-job hash", () => {
    const fixture = lineageFixture();
    expect(() => verify({...fixture, exchangeState: {...fixture.exchangeState, generationJobContentHash: "b".repeat(64)}})).toThrow(/not bound to the verified generation job/i);
  });

  it("rejects a same-ID and revision plan change before rendering", () => {
    const lineage = lineageFixture();
    const fixture = createRookPilot001Fixture();
    const changed = buildAnimaticSync({draft: fixture.draft, overrides: fixture.overrides.map((override) => override.shotId === lineage.sourceProduction.renderPlan.shots.find((shot) => shot.number === "1.05")!.id ? {...override, cameraAction: "cameraPush" as const} : override)});
    expect(changed.draft.productionId).toBe(lineage.sourceProduction.production.productionId);
    expect(changed.draft.revision).toBe(lineage.sourceProduction.production.revision);
    expect(changed.renderPlan.contentHash).not.toBe(lineage.sourceProduction.renderPlan.contentHash);
    expect(() => verify(lineage, changed.renderPlan.contentHash)).toThrow(/render plan does not match the prepared source production/i);
  });
});
