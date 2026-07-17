import {readFileSync} from "node:fs";
import {describe, expect, it} from "vitest";
import {
  analyzeStory,
  applyApprovedAssetVersion,
  buildAnimaticSync,
  canTransitionGenerationExchange,
  candidateBundleSchema,
  compileAnimation,
  createEstimatedTiming,
  createProductionDraft,
  directEpisode,
  finalizeGenerationJob,
  finalizeAssetReviewRecord,
  createImportValidationReport,
  finalizeImportRecord,
  finalizeRigDiagnosticReport,
  finalizeProductionBundle,
  generationBriefsMatchAuthoritativePlan,
  generationBriefSchema,
  generationJobDraftSchema,
  generationExchangeStateSchema,
  getProductionPolicy,
  getShowPack,
  measureDirectedPlan,
  parseScript,
  hashCanonical,
  rehashShowPack,
  sampleWorkshopScript,
  shotOverrideSchema,
  tryBuildAnimaticSync,
  validateCandidateSets,
  verifyImportRecordHash,
  verifyProductionBundleHash,
  verifyRenderPlanHash,
  verifyGenerationJobHash,
  verifyAssetReviewRecordHash,
  verifyImportEvidence,
  verifyRigDiagnosticReportHash,
  verifyShowPackHash,
  type DirectingProfile,
  type ProjectType,
  type ShowPack,
} from "./index";

const makeDraft = (projectType: ProjectType, options: {productionId?: string; title?: string; preset?: "draft" | "studio" | "premium"; script?: string} = {}) => createProductionDraft({
  productionId: options.productionId ?? `production-${projectType}`,
  title: options.title ?? "The Punctual Box",
  projectType,
  showPackId: projectType === "kids" ? "kids-adventure-v1" : "weird-history-editorial-v1",
  preset: options.preset ?? "studio",
  script: options.script ?? sampleWorkshopScript,
});

const buildFor = (projectType: ProjectType, preset: "draft" | "studio" | "premium" = "studio", productionId = `production-${projectType}-${preset}`) => buildAnimaticSync({draft: makeDraft(projectType, {preset, productionId})});

function directWithProfile(profile: DirectingProfile) {
  const base = getShowPack("kids-adventure-v1");
  const showPack = rehashShowPack({...base, profile} as ShowPack);
  const draft = makeDraft("kids", {productionId: "production-profile-test"});
  const document = parseScript(draft.script, draft.title, draft.productionId);
  const analysis = analyzeStory(document);
  return directEpisode(document, analysis, createEstimatedTiming(document), {draft, productionPolicy: getProductionPolicy("studio"), showPack});
}

describe("StoryStage story engine", () => {
  it("creates an entity ledger with scene presence and unknown action props", () => {
    const script = `INT. CAVE - NIGHT\n\nMARA: This should be fine.\n\n[Mara lifts the dragon compass from a stone shelf.]`;
    const document = parseScript(script, "Compass", "production-compass");
    const analysis = analyzeStory(document);
    const compass = analysis.props.find((prop) => prop.name === "DRAGON COMPASS");

    expect(compass).toMatchObject({status: "needs-review", role: "prop"});
    expect(compass?.sceneIds).toEqual(["scene-1"]);
    expect(analysis.characters[0]?.sceneIds).toEqual(["scene-1"]);
  });

  it("returns structured diagnostics for malformed input", () => {
    const result = tryBuildAnimaticSync({draft: makeDraft("kids", {script: "MARA: There is no heading here."})});
    expect(result).toEqual({ok: false, diagnostics: [expect.objectContaining({code: "invalid-script", path: "script"})]});
  });

  it("uses production identity and revision rather than the title for plan identity", () => {
    const first = buildAnimaticSync({draft: makeDraft("kids", {productionId: "production-one", title: "!!!"})});
    const second = buildAnimaticSync({draft: makeDraft("kids", {productionId: "production-two", title: "!!!"})});
    expect(first.renderPlan.id).toBe("render-production-one-r1");
    expect(second.renderPlan.id).toBe("render-production-two-r1");
    expect(first.renderPlan.id).not.toBe(second.renderPlan.id);
  });

  it("rejects a Show Pack whose project type does not match the production", () => {
    const mismatched = {...makeDraft("kids"), showPackId: "weird-history-editorial-v1"};
    const result = tryBuildAnimaticSync({draft: mismatched});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.diagnostics[0]?.code).toBe("show-pack-mismatch");
  });

  it("builds deterministic profile-specific plans and shared metrics", () => {
    const kids = buildFor("kids");
    const history = buildFor("explainer");
    const historyAgain = buildFor("explainer");

    expect(history).toEqual(historyAgain);
    expect(history.renderPlan.shots.length).toBeGreaterThan(kids.renderPlan.shots.length);
    expect(history.metrics.averageShotSeconds).toBeLessThan(kids.metrics.averageShotSeconds);
    expect(history.metrics.treatmentDistribution["insert"] ?? 0).toBeGreaterThan(kids.metrics.treatmentDistribution["insert"] ?? 0);
    expect(history.metrics.transitionDistribution["hard-cut"] ?? 0).toBeGreaterThan(kids.metrics.transitionDistribution["hard-cut"] ?? 0);
    expect(history.metrics.textEventsPerMinute).toBeGreaterThan(kids.metrics.textEventsPerMinute);
    expect(kids.metrics.performanceEventsPerMinute).toBeGreaterThan(history.metrics.performanceEventsPerMinute);
    expect(kids.metrics.maximumStaticFrames).toBeLessThanOrEqual(getShowPack("kids-adventure-v1").profile.cadence.maxStaticFrames);
    expect(history.metrics.maximumStaticFrames).toBeLessThanOrEqual(getShowPack("weird-history-editorial-v1").profile.cadence.maxStaticFrames);
    expect(measureDirectedPlan(history.creativePlan)).toEqual(history.metrics);
  });

  it("lets cadence alone alter directed cadence", () => {
    const base = getShowPack("kids-adventure-v1").profile;
    const changed = {...base, cadence: {...base.cadence, targetCutsPerMinute: 30, minShotFrames: 45, maxShotFrames: 60, maxStaticFrames: 60}};
    expect(measureDirectedPlan(directWithProfile(changed)).averageShotSeconds).toBeLessThan(measureDirectedPlan(directWithProfile(base)).averageShotSeconds);
  });

  it("lets treatment, camera, and transition policies independently alter output", () => {
    const base = getShowPack("kids-adventure-v1").profile;
    const baseline = measureDirectedPlan(directWithProfile(base));
    const treatment = measureDirectedPlan(directWithProfile({...base, treatmentWeights: {environment: 1, characterPerformance: 0, reaction: 0, insert: 0, kineticType: 0, diagram: 0, licensedMedia: 0, generatedIllustration: 0}}));
    const camera = measureDirectedPlan(directWithProfile({...base, cameraPolicy: {moves: [{type: "locked", weight: 1}]}}));
    const transition = measureDirectedPlan(directWithProfile({...base, transitionPolicy: {hardCut: 1, foregroundWipe: 0, cameraCarry: 0, briefDissolve: 0}}));

    expect(treatment.treatmentDistribution).not.toEqual(baseline.treatmentDistribution);
    expect(camera.cameraActionsPerMinute).toBe(0);
    expect(transition.transitionDistribution["hard-cut"]).toBeGreaterThan(baseline.transitionDistribution["hard-cut"] ?? 0);
  });

  it("enforces camera, pose-change, and text event quotas independently", () => {
    const base = getShowPack("kids-adventure-v1").profile;
    const cameraOpen = measureDirectedPlan(directWithProfile({...base, cameraPolicy: {moves: [{type: "cameraPush", weight: 1}]}}));
    const cameraCapped = measureDirectedPlan(directWithProfile({...base, cameraPolicy: {moves: [{type: "cameraPush", weight: 1, maximumPerMinute: 0.1}]}}));
    const lowPose = measureDirectedPlan(directWithProfile({...base, performancePolicy: {...base.performancePolicy, poseChangesPerMinute: 1}}));
    const highPose = measureDirectedPlan(directWithProfile({...base, performancePolicy: {...base.performancePolicy, poseChangesPerMinute: 20}}));
    const lowText = measureDirectedPlan(directWithProfile({...base, textPolicy: {...base.textPolicy, targetEventsPerMinute: 1}}));
    const highText = measureDirectedPlan(directWithProfile({...base, textPolicy: {...base.textPolicy, targetEventsPerMinute: 20}}));

    expect(cameraCapped.cameraActionsPerMinute).toBeLessThan(cameraOpen.cameraActionsPerMinute);
    expect(highPose.poseChangesPerMinute).toBeGreaterThan(lowPose.poseChangesPerMinute);
    expect(highText.textEventsPerMinute).toBeGreaterThan(lowText.textEventsPerMinute);
  });

  it("binds narration-only explainers to the approved presenter role", () => {
    const script = `INT. ARCHIVE - NIGHT\n\nNARRATOR: The ledger had been wrong for one hundred years.`;
    const build = buildAnimaticSync({draft: makeDraft("explainer", {productionId: "production-narrator", script})});
    const presenter = build.resolvedPlan.characters.find((character) => character.entityName === "NARRATOR");
    expect(presenter).toMatchObject({assetId: "history-rig-guide", matchStrategy: "show-pack-role", resolved: true});
    expect(build.creativePlan.shots.every((shot) => shot.focusCharacterName === "NARRATOR")).toBe(true);
  });

  it("prioritizes real missing assets and leaves exhausted requirements visible", () => {
    const build = buildFor("explainer", "draft");
    const clockBrief = build.resolvedPlan.generationBriefs.find((brief) => brief.entity.name === "CLOCK");
    const boxBrief = build.resolvedPlan.generationBriefs.find((brief) => brief.entity.name === "BOX");
    expect(clockBrief).toBeDefined();
    expect(boxBrief).toBeUndefined();
    expect(build.resolvedPlan.requirements.some((requirement) => requirement.status === "deferred")).toBe(true);
    expect(build.resolvedPlan.warnings.some((warning) => /budget is exhausted|acquisition and remains deferred/.test(warning))).toBe(true);
  });

  it("preserves talk timing when a gesture override is compiled", () => {
    const initial = buildFor("kids");
    const talkingShot = initial.renderPlan.shots.find((shot) => shot.actions.some((action) => action.detail.type === "talk"))!;
    const updated = buildAnimaticSync({draft: initial.draft, overrides: [{shotId: talkingShot.id, gesture: "point", gestureIntensity: 0.9}]});
    const changed = updated.renderPlan.shots.find((shot) => shot.id === talkingShot.id)!;
    expect(changed.actions.some((action) => action.detail.type === "talk")).toBe(true);
    expect(changed.actions.some((action) => action.detail.type === "gesture" && action.detail.gestureId === "point" && action.detail.intensity === 0.9)).toBe(true);
  });

  it("uses one validated manual exchange schema and keeps prompts out of render plans", () => {
    const build = buildFor("explainer");
    const brief = generationBriefSchema.parse(build.resolvedPlan.generationBriefs[0]);
    expect(brief.exchangeMode).toBe("manual-chatgpt-images");
    expect(brief.showPack.contentHash).toHaveLength(64);
    expect(brief.consumingShotIds.length).toBeGreaterThan(0);
    expect(JSON.stringify(build.renderPlan)).not.toMatch(/creativeRequirements|prohibitedChanges|controlledMatte|expectedFiles/i);
  });

  it("keeps the Visual Director generation template on the runtime schema", () => {
    const template = JSON.parse(readFileSync(new URL("../../../.agents/skills/story-stage-visual-director/assets/generation-brief-template.json", import.meta.url), "utf8"));
    expect(generationBriefSchema.parse(template).exchangeMode).toBe("manual-chatgpt-images");
    const candidateTemplate = JSON.parse(readFileSync(new URL("../../../.agents/skills/story-stage-visual-director/assets/candidate-bundle-template.json", import.meta.url), "utf8"));
    expect(candidateBundleSchema.parse(candidateTemplate).assets[0]?.fileRole).toBe("candidate.png");
  });

  it("finalizes immutable generation jobs with a verifiable content hash", () => {
    const build = buildAnimaticSync({draft: makeDraft("kids")});
    const pack = getShowPack("kids-adventure-v1");
    const draft = generationJobDraftSchema.parse({schemaVersion: "1.0", exchangeMode: "manual-chatgpt-images", production: {id: build.draft.productionId, revision: build.draft.revision, title: build.draft.title}, productionBundleContentHash: "d".repeat(64), showPack: {id: pack.id, version: pack.version, contentHash: pack.contentHash}, briefs: build.resolvedPlan.generationBriefs, expectedOutputLayout: {manifest: "candidate-bundle.json", files: "candidates/<brief-id>/<candidate-set-id>/<file-role>"}});
    const job = finalizeGenerationJob(draft, {exchangeJobId: "job-one", createdAt: "2026-07-17T00:00:00.000Z"});
    expect(verifyGenerationJobHash(job)).toBe(true);
    expect(verifyGenerationJobHash({...job, createdAt: "2026-07-18T00:00:00.000Z"})).toBe(false);
    expect(job.briefs[0]?.styleBible.principles.length).toBeGreaterThan(0);
    expect(generationJobDraftSchema.safeParse({...draft, production: {...draft.production, id: "different-production"}}).success).toBe(false);
    expect(generationJobDraftSchema.safeParse({...draft, briefs: draft.briefs.length > 0 ? [draft.briefs[0]!, draft.briefs[0]!] : []}).success).toBe(false);
    expect(generationBriefsMatchAuthoritativePlan(job.briefs, build.resolvedPlan.generationBriefs)).toBe(true);
    expect(generationBriefsMatchAuthoritativePlan(job.briefs, build.resolvedPlan.generationBriefs.map((brief, index) => index === 0 ? {...brief, candidateCount: brief.candidateCount + 1} : brief))).toBe(false);
  });

  it("persists a hash-bound production bundle that still derives from its resolved plan", () => {
    const build = buildFor("kids", "studio", "production-bundle");
    const bundle = finalizeProductionBundle({schemaVersion: "1.0", production: build.draft, overrides: [], resolvedPlan: build.resolvedPlan, renderPlan: build.renderPlan, metrics: build.metrics, estimate: build.estimate}, "2026-07-17T00:00:00.000Z");

    expect(verifyProductionBundleHash(bundle)).toBe(true);
    expect(verifyProductionBundleHash({...bundle, savedAt: "2026-07-18T00:00:00.000Z"})).toBe(false);
    expect(() => finalizeProductionBundle({schemaVersion: "1.0", production: {...build.draft, productionId: "other-production"}, overrides: [], resolvedPlan: build.resolvedPlan, renderPlan: build.renderPlan, metrics: build.metrics, estimate: build.estimate}, "2026-07-17T00:00:00.000Z")).toThrow(/identity/i);
    expect(() => finalizeProductionBundle({schemaVersion: "1.0", production: build.draft, overrides: [], resolvedPlan: build.resolvedPlan, renderPlan: {...build.renderPlan, shots: build.renderPlan.shots.map((shot, index) => index === 0 ? {...shot, title: "Divergent shot with retained hash"} : shot)}, metrics: build.metrics, estimate: build.estimate}, "2026-07-17T00:00:00.000Z")).toThrow(/exactly derive|content hash/i);
  });

  it("validates complete candidate kits by set and preserves the import evidence", () => {
    const build = buildFor("explainer", "studio", "production-import-record");
    const pack = getShowPack(build.draft.showPackId);
    const jobDraft = generationJobDraftSchema.parse({schemaVersion: "1.0", exchangeMode: "manual-chatgpt-images", production: {id: build.draft.productionId, revision: build.draft.revision, title: build.draft.title}, productionBundleContentHash: "e".repeat(64), showPack: {id: pack.id, version: pack.version, contentHash: pack.contentHash}, briefs: build.resolvedPlan.generationBriefs, expectedOutputLayout: {manifest: "candidate-bundle.json", files: "candidates/<brief-id>/<candidate-set-id>/<file-role>"}});
    const job = finalizeGenerationJob(jobDraft, {exchangeJobId: "job-import-record", createdAt: "2026-07-17T00:00:00.000Z"});
    const brief = job.briefs[0]!;
    const candidateSetId = `set-${brief.id}-1`;
    const rights = {sourceType: "generated" as const, provider: "chatgpt-images", usageNotes: "Original generated candidate"};
    const assets = brief.expectedFiles.map((fileRole, index) => ({candidateId: `candidate-${index + 1}`, candidateSetId, briefId: brief.id, fileRole, relativeFile: `candidates/${brief.id}/${candidateSetId}/${fileRole}`, contentHash: hashCanonical({fileRole, index}), mediaType: "image/png" as const, width: 1024, height: 1024, rights}));
    const candidateBundle = candidateBundleSchema.parse({schemaVersion: "1.0", exchangeMode: "manual-chatgpt-images", exchangeJobId: job.exchangeJobId, generationJobContentHash: job.contentHash, production: {id: job.production.id, revision: job.production.revision}, showPack: job.showPack, providerMetadata: {provider: "chatgpt-images", generatedAt: "2026-07-17T00:05:00.000Z", conversationReference: null}, assets});
    const validation = validateCandidateSets(job, candidateBundle);

    expect(validation.candidateSets[0]).toMatchObject({candidateSetId, complete: true, missingRoles: []});
    expect(validation.missingRoleCount).toBe(job.briefs.reduce((sum, entry) => sum + entry.candidateCount * entry.expectedFiles.length, 0) - brief.expectedFiles.length);
    expect(() => validateCandidateSets(job, {...candidateBundle, assets: [{...candidateBundle.assets[0]!, fileRole: "unexpected-role.png"}]})).toThrow(/unexpected role/i);

    const stagedAssets = candidateBundle.assets.map((asset) => ({candidateId: asset.candidateId, candidateSetId: asset.candidateSetId, briefId: asset.briefId, requirementId: brief.requirementId, fileRole: asset.fileRole, originalName: asset.fileRole, mediaType: asset.mediaType, width: asset.width, height: asset.height, rights: asset.rights, stagedCandidate: {candidateId: asset.candidateId, sourceContentHash: asset.contentHash, stagedContentHash: asset.contentHash, relativeFile: `candidates/${asset.candidateId}.png`, stagingState: "staged-byte-verified" as const, checks: {dimensions: true as const, mediaType: true as const, alphaOrMatte: true, registration: false as const}}}));
    const record = finalizeImportRecord({schemaVersion: "1.0", importId: "import-record-one", sourceMode: "structured-bundle", exchangeJobId: job.exchangeJobId, generationJobContentHash: job.contentHash, production: {id: job.production.id, revision: job.production.revision}, manifestContentHash: hashCanonical(candidateBundle), candidateBundle, assets: stagedAssets, candidateSets: validation.candidateSets, findings: validation.findings}, "2026-07-17T00:06:00.000Z");
    expect(verifyImportRecordHash(record)).toBe(true);
    expect(verifyImportRecordHash({...record, sourceMode: "loose-files"})).toBe(false);
    const report = createImportValidationReport(record, "2026-07-17T00:07:00.000Z");
    expect(verifyImportEvidence(record, report)).toBe(true);
    expect(verifyImportEvidence(record, {...report, assets: report.assets.map((asset, index) => index === 0 ? {...asset, width: asset.width + 1} : asset)})).toBe(false);
    expect(verifyImportEvidence(record, {...report, assets: report.assets.map((asset, index) => index === 0 ? {...asset, stagedContentHash: "f".repeat(64)} : asset)})).toBe(false);
    const {createdAt: _createdAt, contentHash: _contentHash, ...recordDraft} = record;
    void _createdAt;
    void _contentHash;
    expect(() => finalizeImportRecord({...recordDraft, assets: record.assets.map((asset, index) => index === 0 ? {...asset, width: asset.width + 1} : asset)}, "2026-07-17T00:08:00.000Z")).toThrow(/candidate-bundle entry/i);
    expect(() => finalizeImportRecord({...recordDraft, assets: record.assets.map((asset, index) => index === 0 ? {...asset, rights: {...asset.rights, usageNotes: "Changed after bundle creation"}} : asset)}, "2026-07-17T00:08:00.000Z")).toThrow(/candidate-bundle entry/i);
  });

  it("enforces generation exchange lifecycle transitions", () => {
    expect(canTransitionGenerationExchange("awaiting-results", "files-imported")).toBe(true);
    expect(canTransitionGenerationExchange("awaiting-results", "staged")).toBe(true);
    expect(canTransitionGenerationExchange("files-imported", "staged")).toBe(true);
    expect(canTransitionGenerationExchange("staged", "needs-review")).toBe(true);
    expect(canTransitionGenerationExchange("needs-review", "approved")).toBe(true);
    expect(canTransitionGenerationExchange("awaiting-results", "approved")).toBe(false);
    expect(canTransitionGenerationExchange("approved", "staged")).toBe(false);
    expect(generationExchangeStateSchema.safeParse({schemaVersion: "1.0", exchangeJobId: "job-one", generationJobContentHash: "a".repeat(64), production: {id: "production-one", revision: 1}, status: "awaiting-results", importId: "import-one", updatedAt: "2026-07-17T00:00:00.000Z"}).success).toBe(false);
    expect(generationExchangeStateSchema.safeParse({schemaVersion: "1.0", exchangeJobId: "job-one", generationJobContentHash: "a".repeat(64), production: {id: "production-one", revision: 1}, status: "approved", importId: null, updatedAt: "2026-07-17T00:00:00.000Z"}).success).toBe(false);
  });

  it("binds moving rig diagnostics to one manifest, validation report, and MP4", () => {
    const diagnostic = finalizeRigDiagnosticReport({schemaVersion: "1.0", candidateSetId: "set-character-one", manifestContentHash: "a".repeat(64), validationReportContentHash: "b".repeat(64), videoContentHash: "c".repeat(64), videoRelativeFile: "prepared/rig-diagnostic-set-character-one.mp4", fps: 30, frameCount: 120, width: 1280, height: 720, sourceDiagnosticContentHash: null}, "2026-07-17T00:00:00.000Z");

    expect(verifyRigDiagnosticReportHash(diagnostic)).toBe(true);
    expect(verifyRigDiagnosticReportHash({...diagnostic, videoContentHash: "d".repeat(64)})).toBe(false);
    expect(verifyRigDiagnosticReportHash({...diagnostic, manifestContentHash: "e".repeat(64)})).toBe(false);
  });

  it("rejects candidate manifests that attempt path traversal", () => {
    const parsed = candidateBundleSchema.safeParse({schemaVersion: "1.0", exchangeMode: "manual-chatgpt-images", exchangeJobId: "job-one", generationJobContentHash: "a".repeat(64), production: {id: "production-one", revision: 1}, showPack: {id: "kids-adventure-v1", version: "1.0.0", contentHash: "c".repeat(64)}, providerMetadata: {provider: "chatgpt-images", generatedAt: "2026-07-17T00:00:00.000Z", conversationReference: null}, assets: [{candidateId: "candidate-one", candidateSetId: "candidate-set-one", briefId: "brief-one", fileRole: "candidate.png", relativeFile: "../outside.png", contentHash: "b".repeat(64), mediaType: "image/png", width: 1024, height: 1024, rights: {sourceType: "generated", provider: "chatgpt-images", usageNotes: "Original generated candidate"}}]});
    expect(parsed.success).toBe(false);
  });

  it("binds every shot to resolved visual requirements without acquisition data", () => {
    const build = buildFor("explainer");
    expect(build.renderPlan.shots.every((shot) => shot.visualBindings.length > 0)).toBe(true);
    expect(build.renderPlan.shots.some((shot) => shot.visualBindings.some((binding) => binding.resolutionStatus !== "approved"))).toBe(true);
    expect(build.renderPlan.shots.every((shot) => shot.visualBindings.every((binding) => binding.contentHash.length === 64))).toBe(true);
    expect(build.renderPlan.shots.every((shot) => shot.visualBindings.find((binding) => binding.role === "background")?.assetId === shot.locationAssetId)).toBe(true);
    expect(shotOverrideSchema.safeParse({shotId: build.renderPlan.shots[0]!.id, treatment: "diagram"}).success).toBe(false);
    expect(shotOverrideSchema.safeParse({shotId: build.renderPlan.shots[0]!.id, transition: "brief-dissolve"}).success).toBe(true);
    expect(shotOverrideSchema.safeParse({shotId: build.renderPlan.shots[0]!.id, locationAssetId: "other-background"}).success).toBe(false);
    expect(shotOverrideSchema.safeParse({shotId: build.renderPlan.shots[0]!.id, cameraAction: "hardCut"}).success).toBe(false);
  });

  it("compiles transition overrides into rendered transition metadata and actions", () => {
    const base = buildFor("explainer");
    const shot = base.renderPlan.shots[1]!;
    const dissolved = buildAnimaticSync({draft: base.draft, overrides: [{shotId: shot.id, transition: "brief-dissolve"}]}).renderPlan.shots[1]!;
    const wiped = buildAnimaticSync({draft: base.draft, overrides: [{shotId: shot.id, transition: "foreground-wipe"}]}).renderPlan.shots[1]!;

    expect(dissolved.transition).toBe("brief-dissolve");
    expect(dissolved.actions.some((action) => action.detail.type === "hardCut")).toBe(false);
    expect(wiped.transition).toBe("foreground-wipe");
    expect(wiped.actions.some((action) => action.detail.type === "foregroundWipe")).toBe(true);
  });

  it("retimes narration and captions without breaking exact shot boundaries", () => {
    const base = buildFor("explainer");
    const shotIndex = base.renderPlan.shots.findIndex((shot) => Boolean(shot.caption));
    const shot = base.renderPlan.shots[shotIndex]!;
    const nextShot = base.renderPlan.shots[shotIndex + 1]!;
    const addedFrames = 24;
    const rebuilt = buildAnimaticSync({draft: base.draft, overrides: [{shotId: shot.id, caption: "A sharper editorial read.", durationInFrames: shot.durationInFrames + addedFrames, timingLocked: true}]});
    const retimed = rebuilt.renderPlan.shots[shotIndex]!;

    expect(retimed.caption).toBe("A sharper editorial read.");
    expect(retimed.durationInFrames).toBe(shot.durationInFrames + addedFrames);
    expect(rebuilt.renderPlan.shots[shotIndex + 1]!.startFrame).toBe(nextShot.startFrame + addedFrames);
    expect(rebuilt.renderPlan.durationInFrames).toBe(base.renderPlan.durationInFrames + addedFrames);
    expect(retimed.actions.every((action) => action.startFrame >= retimed.startFrame && action.endFrame <= retimed.startFrame + retimed.durationInFrames)).toBe(true);
    expect(retimed.actions.some((action) => ["talk", "holdPose"].includes(action.detail.type) && action.endFrame === retimed.startFrame + retimed.durationInFrames)).toBe(true);
    expect(shotOverrideSchema.safeParse({shotId: shot.id, caption: null, durationInFrames: 12, timingLocked: true}).success).toBe(true);
  });

  it("resolves only dependent shots when an immutable candidate is approved", () => {
    const build = buildFor("explainer");
    const requirement = build.resolvedPlan.requirements.find((candidate) => candidate.entityId === "character-mara" && candidate.role === "character")!;
    const approvedHash = "a".repeat(64);
    const approved = applyApprovedAssetVersion(build.resolvedPlan, {assetId: "approved-mara-v1", version: "1.0.0", requirementId: requirement.id, contentHash: approvedHash, relativeFile: "approved/approved-mara-v1.png", provenance: {sourceType: "generated", provider: "chatgpt-images", usageNotes: "Original generated lab asset"}, approvedAt: "2026-07-17T00:00:00.000Z"});
    const render = compileAnimation(approved);
    const dependent = new Set(requirement.consumingShotIds);

    expect(approved.requirements.find((candidate) => candidate.id === requirement.id)?.status).toBe("resolved");
    expect(render.assets.some((asset) => asset.id === "approved-mara-v1" && asset.contentHash === approvedHash)).toBe(true);
    expect(render.shots.filter((shot) => dependent.has(shot.id)).every((shot) => shot.visualBindings.some((binding) => binding.assetId === "approved-mara-v1"))).toBe(true);
    expect(render.shots.filter((shot) => !dependent.has(shot.id)).every((shot) => shot.visualBindings.every((binding) => binding.assetId !== "approved-mara-v1"))).toBe(true);
  });

  it("rebuilds and persists a production from approved asset versions", () => {
    const initial = buildFor("explainer", "studio", "production-approved-rebuild");
    const requirement = initial.resolvedPlan.requirements.find((candidate) => candidate.entityId === "character-mara" && candidate.role === "character")!;
    const approvedAssetVersion = {assetId: "approved-character-mara", version: "sha256-1234567890abcdef", requirementId: requirement.id, contentHash: "c".repeat(64), relativeFile: "approved-character-mara/sha256-1234567890abcdef/manifest.json", provenance: {sourceType: "generated" as const, provider: "chatgpt-images", usageNotes: "User-approved coherent pose kit"}, approvedAt: "2026-07-17T00:00:00.000Z"};
    const rebuilt = buildAnimaticSync({draft: initial.draft, approvedAssetVersions: [approvedAssetVersion]});
    const bundle = finalizeProductionBundle({schemaVersion: "1.0", production: rebuilt.draft, overrides: [], approvedAssetVersions: [approvedAssetVersion], resolvedPlan: rebuilt.resolvedPlan, renderPlan: rebuilt.renderPlan, metrics: rebuilt.metrics, estimate: rebuilt.estimate}, "2026-07-17T00:01:00.000Z");

    expect(rebuilt.resolvedPlan.requirements.find((candidate) => candidate.id === requirement.id)?.status).toBe("resolved");
    expect(rebuilt.resolvedPlan.generationBriefs.some((brief) => brief.requirementId === requirement.id)).toBe(false);
    expect(rebuilt.renderPlan.assets.some((asset) => asset.id === approvedAssetVersion.assetId)).toBe(true);
    expect(bundle.approvedAssetVersions).toEqual([approvedAssetVersion]);
    expect(verifyProductionBundleHash(bundle)).toBe(true);

    const review = finalizeAssetReviewRecord({schemaVersion: "1.0", exchangeJobId: "job-review", importId: "import-review", preparationReportContentHash: "d".repeat(64), decisions: [{candidateSetId: "set-character-one", briefId: "brief-character", requirementId: requirement.id, status: "approved", notes: "Identity and poses approved.", decidedAt: "2026-07-17T00:00:00.000Z", approvedAssetVersion}]}, "2026-07-17T00:00:00.000Z");
    expect(verifyAssetReviewRecordHash(review)).toBe(true);
    expect(verifyAssetReviewRecordHash({...review, updatedAt: "2026-07-18T00:00:00.000Z"})).toBe(false);
  });

  it("computes and verifies Show Pack and frozen-plan hashes", () => {
    const pack = getShowPack("kids-adventure-v1");
    const changed = rehashShowPack({...pack, profile: {...pack.profile, accentColor: "#abcdef"}} as ShowPack);
    const build = buildFor("kids");
    expect(verifyShowPackHash(pack)).toBe(true);
    expect(changed.contentHash).not.toBe(pack.contentHash);
    expect(verifyRenderPlanHash(build.renderPlan)).toBe(true);
    expect(build.renderPlan.contentHash).toBe(buildFor("kids").renderPlan.contentHash);
  });

  it("makes presets change at least five actual downstream outcomes", () => {
    const draft = buildFor("kids", "draft");
    const premium = buildFor("kids", "premium");
    const draftBrief = draft.resolvedPlan.generationBriefs[0]!;
    const premiumBrief = premium.resolvedPlan.generationBriefs[0]!;

    expect(draft.renderPlan.shots.length).not.toBe(premium.renderPlan.shots.length);
    expect(draft.estimate.outputHeight).not.toBe(premium.estimate.outputHeight);
    expect(draftBrief.candidateCount).not.toBe(premiumBrief.candidateCount);
    expect(draftBrief.imageQuality).not.toBe(premiumBrief.imageQuality);
    expect(draftBrief.backgroundLayerTarget).not.toBe(premiumBrief.backgroundLayerTarget);
    expect(draftBrief.posePack).not.toBe(premiumBrief.posePack);
    expect(draft.estimate.estimatedCandidateImages).not.toBe(premium.estimate.estimatedCandidateImages);
  });

  it("routes approved matches into replacement generation when reuse is disabled", () => {
    const reusable = makeDraft("kids");
    const replacement = createProductionDraft({...reusable, assetRoutingPolicy: {...reusable.assetRoutingPolicy, reuseApprovedFirst: false}});
    const reusedBuild = buildAnimaticSync({draft: reusable});
    const replacementBuild = buildAnimaticSync({draft: replacement});
    expect(replacementBuild.resolvedPlan.generationBriefs.length).toBeGreaterThan(reusedBuild.resolvedPlan.generationBriefs.length);
    expect(replacementBuild.resolvedPlan.warnings.some((warning) => warning.includes("replacement generation"))).toBe(true);
    expect(replacementBuild.estimate.estimatedCandidateImages).toBeGreaterThan(reusedBuild.estimate.estimatedCandidateImages);
  });

  it("keeps unrelated non-entity visuals at shot scope", () => {
    const build = buildFor("explainer");
    const shotScoped = build.creativePlan.visualRequirements.filter((visual) => visual.entityId === null && visual.reusableConceptKey === null);
    expect(shotScoped.length).toBeGreaterThan(1);
    for (const visual of shotScoped) {
      expect(build.resolvedPlan.requirements.some((requirement) => requirement.id === `requirement-${visual.role}-shot-${visual.shotId}-${visual.id}`)).toBe(true);
    }
  });
});
