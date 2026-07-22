import {createHash} from "node:crypto";
import {mkdtemp, mkdir, readFile, symlink, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import sharp from "sharp";
import {describe, expect, it} from "vitest";
import {
  candidateBundleSchema,
  createImportValidationReport,
  createAssetRigManifest,
  finalizeImportRecord,
  finalizePreparationReport,
  generationBriefSchema,
  hashCanonical,
  validateAssetRigManifest,
  verifyAssetRigManifestHash,
  verifyPreparationReportHash,
  verifyRigValidationReportHash,
} from "@storystage/story-engine";
import {CandidateStagingError, createPreparedCandidateComparisonSheet, prepareCandidateSets, stageCandidateBundle, stageLooseCandidateFiles, verifyLoggedCandidateBytes, verifyPreparationReportAgainstImportEvidence, verifyStagedCandidates} from "./index";

const rgbaPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+Avz9WQAAAABJRU5ErkJggg==", "base64");

function hash(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function bundle(contentHash = hash(rgbaPng), overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: "1.0",
    exchangeMode: "manual-chatgpt-images",
    exchangeJobId: "job-one",
    generationJobContentHash: "f".repeat(64),
    production: {id: "production-one", revision: 1},
    showPack: {id: "kids-adventure-v1", version: "1.0.0", contentHash: "e".repeat(64)},
    providerMetadata: {
      provider: "chatgpt-images",
      generatedAt: "2026-07-17T00:00:00.000Z",
      conversationReference: null,
    },
    assets: [{
      candidateId: "candidate-one",
      candidateSetId: "candidate-set-one",
      briefId: "brief-one",
      fileRole: "candidate.png",
      relativeFile: "incoming/friendly-name.png",
      contentHash,
      mediaType: "image/png",
      width: 1,
      height: 1,
      rights: {sourceType: "generated", provider: "chatgpt-images", usageNotes: "Original generated candidate"},
      ...overrides,
    }],
  };
}

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "storystage-assets-"));
  const sourceRoot = join(root, "source");
  const trustedStagingRoot = join(root, "private-staging");
  const stagingRoot = join(trustedStagingRoot, "jobs", "import-one");
  await mkdir(join(sourceRoot, "incoming"), {recursive: true});
  await writeFile(join(sourceRoot, "incoming", "friendly-name.png"), rgbaPng);
  return {root, sourceRoot, trustedStagingRoot, stagingRoot};
}

async function transparentFixture(width = 120, height = 160): Promise<Buffer> {
  return sharp({create: {width, height, channels: 4, background: {r: 0, g: 0, b: 0, alpha: 0}}})
    .composite([{input: {create: {width: Math.round(width * 0.5), height: Math.round(height * 0.72), channels: 4, background: {r: 242, g: 91, b: 79, alpha: 1}}}, left: Math.round(width * 0.25), top: Math.round(height * 0.2)}])
    .png()
    .toBuffer();
}

async function opaqueFixture(width = 120, height = 160): Promise<Buffer> {
  return sharp({create: {width, height, channels: 3, background: {r: 242, g: 91, b: 79}}}).png().toBuffer();
}

const characterBrief = generationBriefSchema.parse({
  schemaVersion: "1.0",
  id: "brief-character",
  exchangeMode: "manual-chatgpt-images",
  productionId: "production-one",
  requirementId: "requirement-character",
  showPack: {id: "kids-adventure-v1", version: "1.0.0", contentHash: "a".repeat(64)},
  styleBible: {id: "style-kids", version: "1.0.0", principles: ["Readable silhouettes"], contentHash: "b".repeat(64)},
  identityLock: null,
  entity: {id: "character-mara", name: "Mara", kind: "character"},
  outputRole: "character-parts",
  candidateCount: 1,
  imageQuality: "high",
  backgroundLayerTarget: 3,
  posePack: "basic",
  controlledMatte: "#00FF00",
  referenceAssets: [],
  sourceExcerpts: ["Mara opens the punctual box."],
  creativeRequirements: ["Full-body pose swap kit"],
  continuityRequirements: ["Preserve face and costume"],
  prohibitedChanges: ["Do not redesign the character"],
  expectedFiles: ["identity-sheet.png", "neutral-pose.png", "talk-pose.png", "reaction-pose.png"],
  consumingSceneIds: ["scene-one"],
  consumingShotIds: ["shot-one"],
  approvalRequired: true,
  status: "draft",
});

describe("secure candidate staging", () => {
  it("rejects a same-size source replacement that does not match the provenance hash", async () => {
    const logged = await sharp({create: {width: 320, height: 180, channels: 3, background: {r: 68, g: 91, b: 122}}}).png().toBuffer();
    const replacement = await sharp({create: {width: 320, height: 180, channels: 3, background: {r: 122, g: 68, b: 91}}}).png().toBuffer();
    const expected = {candidateId: "logged-candidate", expectedContentHash: hash(logged), expectedMediaType: "image/png" as const, expectedWidth: 320, expectedHeight: 180};

    expect(verifyLoggedCandidateBytes({...expected, bytes: logged})).toMatchObject({contentHash: hash(logged), mediaType: "image/png", width: 320, height: 180});
    expect(() => verifyLoggedCandidateBytes({...expected, bytes: replacement})).toThrowError(expect.objectContaining({code: "hash-mismatch"}));
  });

  it("verifies real bytes and chooses a deterministic private staging path", async () => {
    const {sourceRoot, trustedStagingRoot, stagingRoot} = await fixture();
    const [staged] = await stageCandidateBundle({bundle: bundle(), sourceRoot, trustedStagingRoot, stagingRoot});

    expect(staged?.relativeFile).toBe("candidates/candidate-one.png");
    expect(staged?.stagingState).toBe("staged-byte-verified");
    expect(staged?.checks).toEqual({dimensions: true, mediaType: true, alphaOrMatte: true, registration: false});
    await expect(readFile(join(stagingRoot, "candidates", "candidate-one.png"))).resolves.toEqual(rgbaPng);
  });

  it("rejects a manifest hash that does not match the file", async () => {
    const {sourceRoot, trustedStagingRoot, stagingRoot} = await fixture();
    await expect(stageCandidateBundle({bundle: bundle("a".repeat(64)), sourceRoot, trustedStagingRoot, stagingRoot}))
      .rejects.toMatchObject({code: "hash-mismatch"} satisfies Partial<CandidateStagingError>);
  });

  it("rejects a file whose declared media type does not match its bytes", async () => {
    const {sourceRoot, trustedStagingRoot, stagingRoot} = await fixture();
    await expect(stageCandidateBundle({bundle: bundle(hash(rgbaPng), {mediaType: "image/jpeg"}), sourceRoot, trustedStagingRoot, stagingRoot}))
      .rejects.toMatchObject({code: "media-mismatch"} satisfies Partial<CandidateStagingError>);
  });

  it("rejects images whose decoded dimensions exceed the configured pixel envelope", async () => {
    const {sourceRoot, trustedStagingRoot, stagingRoot} = await fixture();
    await expect(stageCandidateBundle({bundle: bundle(), sourceRoot, trustedStagingRoot, stagingRoot, limits: {maxDimension: 0}}))
      .rejects.toMatchObject({code: "dimension-limit"} satisfies Partial<CandidateStagingError>);
  });

  it("rejects a source symlink even when it points back inside the selected folder", async () => {
    const {sourceRoot, trustedStagingRoot, stagingRoot} = await fixture();
    const linkPath = join(sourceRoot, "incoming", "linked.png");
    try {
      await symlink(join(sourceRoot, "incoming", "friendly-name.png"), linkPath, "file");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EPERM") return;
      throw error;
    }
    await expect(stageCandidateBundle({
      bundle: bundle(hash(rgbaPng), {relativeFile: "incoming/linked.png"}),
      sourceRoot,
      trustedStagingRoot,
      stagingRoot,
    })).rejects.toMatchObject({code: "symlink-rejected"} satisfies Partial<CandidateStagingError>);
  });

  it("rejects manifest-selected traversal before touching the filesystem", async () => {
    const {sourceRoot, trustedStagingRoot, stagingRoot} = await fixture();
    await expect(stageCandidateBundle({
      bundle: bundle(hash(rgbaPng), {relativeFile: "../outside.png"}),
      sourceRoot,
      trustedStagingRoot,
      stagingRoot,
    })).rejects.toMatchObject({code: "invalid-bundle"} satisfies Partial<CandidateStagingError>);
  });

  it("stages native-picker loose files under main-owned candidate names", async () => {
    const {sourceRoot, trustedStagingRoot, stagingRoot} = await fixture();
    const [loose] = await stageLooseCandidateFiles({files: [{candidateId: "loose-one", sourceFile: join(sourceRoot, "incoming", "friendly-name.png")}], trustedStagingRoot, stagingRoot});
    expect(loose).toMatchObject({candidate: {candidateId: "loose-one", relativeFile: "candidates/loose-one.png", stagingState: "staged-byte-verified"}, originalName: "friendly-name.png", mediaType: "image/png", width: 1, height: 1});
    await expect(readFile(join(stagingRoot, "candidates", "loose-one.png"))).resolves.toEqual(rgbaPng);
  });

  it("rejects a staging destination outside the trusted main-process root", async () => {
    const {root, sourceRoot, trustedStagingRoot} = await fixture();
    await expect(stageCandidateBundle({bundle: bundle(), sourceRoot, trustedStagingRoot, stagingRoot: join(root, "outside")}))
      .rejects.toMatchObject({code: "untrusted-staging-root"} satisfies Partial<CandidateStagingError>);
  });

  it("rejects a symbolic-link or junction ancestor inside the trusted staging root", async () => {
    const {root, sourceRoot, trustedStagingRoot} = await fixture();
    await mkdir(trustedStagingRoot, {recursive: true});
    const linkedRoot = join(trustedStagingRoot, "linked");
    try {
      await symlink(join(root, "outside-target"), linkedRoot, process.platform === "win32" ? "junction" : "dir");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EPERM") return;
      throw error;
    }
    await expect(stageCandidateBundle({bundle: bundle(), sourceRoot, trustedStagingRoot, stagingRoot: join(linkedRoot, "import-one")}))
      .rejects.toMatchObject({code: "symlink-rejected"} satisfies Partial<CandidateStagingError>);
  });

  it("rechecks staged bytes before a later trust transition", async () => {
    const {sourceRoot, trustedStagingRoot, stagingRoot} = await fixture();
    const [staged] = await stageCandidateBundle({bundle: bundle(), sourceRoot, trustedStagingRoot, stagingRoot});
    await expect(verifyStagedCandidates({candidates: [staged], trustedStagingRoot, stagingRoot})).resolves.toEqual([staged]);
    await writeFile(join(stagingRoot, staged!.relativeFile), Buffer.from("changed"));
    await expect(verifyStagedCandidates({candidates: [staged], trustedStagingRoot, stagingRoot}))
      .rejects.toMatchObject({code: "hash-mismatch"} satisfies Partial<CandidateStagingError>);
  });
});

describe("candidate preparation and rig validation", () => {
  it("normalizes a transparent pose kit, creates review evidence, and validates a pose-swap rig", async () => {
    const {root, trustedStagingRoot, stagingRoot} = await fixture();
    const sourceFiles = await Promise.all(characterBrief.expectedFiles.map(async (fileRole, index) => {
      const sourceFile = join(root, `${fileRole}-${index}.png`);
      await writeFile(sourceFile, fileRole === "identity-sheet.png" ? await opaqueFixture() : await transparentFixture());
      return {candidateId: `character-candidate-${index + 1}`, sourceFile};
    }));
    const staged = await stageLooseCandidateFiles({files: sourceFiles, trustedStagingRoot, stagingRoot});
    const request = {
      importId: "import-one",
      importRecordContentHash: "c".repeat(64),
      exchangeJobId: "job-one",
      candidates: staged.map((entry, index) => ({
        candidateSetId: "set-character-one",
        briefId: characterBrief.id,
        requirementId: characterBrief.requirementId,
        fileRole: characterBrief.expectedFiles[index]!,
        expectedMediaType: entry.mediaType,
        expectedWidth: entry.width,
        expectedHeight: entry.height,
        outputRole: characterBrief.outputRole,
        stagedCandidate: entry.candidate,
      })),
    };

    const report = await prepareCandidateSets({request, trustedStagingRoot, stagingRoot});
    expect(verifyPreparationReportHash(report)).toBe(true);
    expect(report.candidateSets).toHaveLength(1);
    expect(report.candidateSets[0]).toMatchObject({status: "ready-for-review", failures: []});
    expect(report.candidateSets[0]!.preparedCandidates).toHaveLength(4);
    expect(report.candidateSets[0]!.contactSheet).toMatchObject({width: 680, height: 440});

    for (const candidate of report.candidateSets[0]!.preparedCandidates) {
      const bytes = await readFile(join(stagingRoot, candidate.relativeFile));
      expect(hash(bytes)).toBe(candidate.preparedContentHash);
      expect(await sharp(bytes).metadata()).toMatchObject({format: "png", width: 1600, height: 1800});
      expect(candidate.registration.groundY).toBeLessThan(candidate.height);
    }
    const contactSheet = report.candidateSets[0]!.contactSheet!;
    expect(hash(await readFile(join(stagingRoot, contactSheet.relativeFile)))).toBe(contactSheet.contentHash);

    const manifest = createAssetRigManifest(characterBrief, "set-character-one", report.candidateSets[0]!.preparedCandidates, "2026-07-17T00:00:00.000Z");
    const validation = validateAssetRigManifest(manifest, "2026-07-17T00:01:00.000Z");
    expect(manifest).toMatchObject({type: "character-rig", animationMode: "pose-swap-2d"});
    expect(verifyAssetRigManifestHash(manifest)).toBe(true);
    expect(validation.status).toBe("passed");
    expect(verifyRigValidationReportHash(validation)).toBe(true);
  });

  it("refuses to pretend an opaque cutout has a usable matte", async () => {
    const {root, trustedStagingRoot, stagingRoot} = await fixture();
    const sourceFile = join(root, "opaque-prop.png");
    await writeFile(sourceFile, await opaqueFixture());
    const [staged] = await stageLooseCandidateFiles({files: [{candidateId: "opaque-prop", sourceFile}], trustedStagingRoot, stagingRoot});
    const report = await prepareCandidateSets({
      request: {
        importId: "import-one",
        importRecordContentHash: "d".repeat(64),
        exchangeJobId: "job-one",
        candidates: [{candidateSetId: "set-prop-one", briefId: "brief-prop", requirementId: "requirement-prop", fileRole: "candidate.png", expectedMediaType: staged!.mediaType, expectedWidth: staged!.width, expectedHeight: staged!.height, outputRole: "prop-cutout", stagedCandidate: staged!.candidate}],
      },
      trustedStagingRoot,
      stagingRoot,
    });
    expect(report.candidateSets[0]).toMatchObject({status: "needs-attention", preparedCandidates: [], contactSheet: null});
    expect(report.candidateSets[0]!.failures[0]).toMatchObject({status: "needs-manual-mask", code: "MANUAL_MASK_REQUIRED"});
  });

  it("creates a hash-bound side-by-side sheet from two distinct prepared sets", async () => {
    const {root, trustedStagingRoot, stagingRoot} = await fixture();
    const sourceFiles = await Promise.all([1, 2].map(async (setNumber) => {
      const sourceFile = join(root, `editorial-${setNumber}.png`);
      await writeFile(sourceFile, await opaqueFixture(320 + setNumber * 10, 180));
      return {candidateId: `editorial-${setNumber}`, sourceFile};
    }));
    const staged = await stageLooseCandidateFiles({files: sourceFiles, trustedStagingRoot, stagingRoot});
    const report = await prepareCandidateSets({
      request: {
        importId: "import-one",
        importRecordContentHash: "f".repeat(64),
        exchangeJobId: "job-one",
        candidates: staged.map((entry, index) => ({candidateSetId: `editorial-set-${index + 1}`, briefId: "brief-editorial", requirementId: "requirement-editorial", fileRole: "candidate.png", expectedMediaType: entry.mediaType, expectedWidth: entry.width, expectedHeight: entry.height, outputRole: "reconstruction", stagedCandidate: entry.candidate})),
      },
      trustedStagingRoot,
      stagingRoot,
    });
    const prepared = report.candidateSets.map((set) => set.preparedCandidates[0]!);
    expect(prepared).toHaveLength(2);
    expect(prepared.every((candidate) => candidate.width === 1920 && candidate.height === 1080)).toBe(true);

    const comparison = await createPreparedCandidateComparisonSheet({trustedStagingRoot, stagingRoot, candidates: prepared});
    const bytes = await readFile(join(stagingRoot, comparison.relativeFile));
    expect(hash(bytes)).toBe(comparison.contentHash);
    expect(comparison).toMatchObject({briefId: "brief-editorial", width: 1320, height: 450});
    expect(comparison.cells.map((cell) => cell.candidateSetId)).toEqual(["editorial-set-1", "editorial-set-2"]);
    expect(await sharp(bytes).metadata()).toMatchObject({format: "png", width: 1320, height: 450});
  }, 30_000);

  it("detects report and manifest tampering", async () => {
    const {root, trustedStagingRoot, stagingRoot} = await fixture();
    const sourceFile = join(root, "prop.png");
    await writeFile(sourceFile, await transparentFixture());
    const [staged] = await stageLooseCandidateFiles({files: [{candidateId: "prop-candidate", sourceFile}], trustedStagingRoot, stagingRoot});
    const report = await prepareCandidateSets({request: {importId: "import-one", importRecordContentHash: "e".repeat(64), exchangeJobId: "job-one", candidates: [{candidateSetId: "set-prop-one", briefId: "brief-prop", requirementId: "requirement-prop", fileRole: "candidate.png", expectedMediaType: staged!.mediaType, expectedWidth: staged!.width, expectedHeight: staged!.height, outputRole: "prop-cutout", stagedCandidate: staged!.candidate}]}, trustedStagingRoot, stagingRoot});
    expect(verifyPreparationReportHash({...report, preparedAt: "2026-07-17T00:00:00.000Z"})).toBe(false);
  });

  it("rejects replacement prepared pixels even when their report hash is recomputed", async () => {
    const {sourceRoot, trustedStagingRoot, stagingRoot} = await fixture();
    const sourceBytes = await opaqueFixture(320, 180);
    await writeFile(join(sourceRoot, "incoming", "friendly-name.png"), sourceBytes);
    const candidateBundle = candidateBundleSchema.parse(bundle(hash(sourceBytes), {candidateId: "candidate-editorial", candidateSetId: "candidate-set-editorial", briefId: "brief-editorial", width: 320, height: 180}));
    const [stagedCandidate] = await stageCandidateBundle({bundle: candidateBundle, sourceRoot, trustedStagingRoot, stagingRoot});
    const rights = candidateBundle.assets[0]!.rights;
    const importRecord = finalizeImportRecord({
      schemaVersion: "1.0",
      importId: "import-one",
      sourceMode: "structured-bundle",
      exchangeJobId: candidateBundle.exchangeJobId,
      generationJobContentHash: candidateBundle.generationJobContentHash,
      production: candidateBundle.production,
      manifestContentHash: hashCanonical(candidateBundle),
      candidateBundle,
      assets: [{candidateId: "candidate-editorial", candidateSetId: "candidate-set-editorial", briefId: "brief-editorial", requirementId: "requirement-editorial", fileRole: "candidate.png", originalName: "friendly-name.png", mediaType: "image/png", width: 320, height: 180, rights, stagedCandidate: stagedCandidate!}],
      candidateSets: [{candidateSetId: "candidate-set-editorial", briefId: "brief-editorial", requirementId: "requirement-editorial", expectedRoles: ["candidate.png"], returnedRoles: ["candidate.png"], missingRoles: [], complete: true}],
      findings: [],
      missingRoleCount: 0,
    }, "2026-07-17T00:00:00.000Z");
    const validationReport = createImportValidationReport(importRecord, "2026-07-17T00:01:00.000Z");
    const preparationReport = await prepareCandidateSets({request: {importId: importRecord.importId, importRecordContentHash: importRecord.contentHash, exchangeJobId: importRecord.exchangeJobId, candidates: [{candidateSetId: "candidate-set-editorial", briefId: "brief-editorial", requirementId: "requirement-editorial", fileRole: "candidate.png", expectedMediaType: "image/png", expectedWidth: 320, expectedHeight: 180, outputRole: "reconstruction", stagedCandidate: stagedCandidate!}]}, trustedStagingRoot, stagingRoot});
    await expect(verifyPreparationReportAgainstImportEvidence({candidateBundle, importRecord, validationReport, preparationReport, trustedStagingRoot, stagingRoot})).resolves.toMatchObject({preparationReport: {contentHash: preparationReport.contentHash}});

    const replacement = await sharp({create: {width: 1920, height: 1080, channels: 4, background: {r: 1, g: 2, b: 3, alpha: 1}}}).png({compressionLevel: 9, adaptiveFiltering: true}).toBuffer();
    const originalPrepared = preparationReport.candidateSets[0]!.preparedCandidates[0]!;
    await writeFile(join(stagingRoot, originalPrepared.relativeFile), replacement);
    const changedCandidateSets = preparationReport.candidateSets.map((set) => ({...set, preparedCandidates: set.preparedCandidates.map((candidate) => candidate.candidateId === originalPrepared.candidateId ? {...candidate, preparedContentHash: hash(replacement)} : candidate)}));
    const replacedReport = finalizePreparationReport({schemaVersion: "1.0", importId: preparationReport.importId, importRecordContentHash: preparationReport.importRecordContentHash, exchangeJobId: preparationReport.exchangeJobId, processor: preparationReport.processor, candidateSets: changedCandidateSets}, preparationReport.preparedAt);
    expect(verifyPreparationReportHash(replacedReport)).toBe(true);
    await expect(verifyPreparationReportAgainstImportEvidence({candidateBundle, importRecord, validationReport, preparationReport: replacedReport, trustedStagingRoot, stagingRoot})).rejects.toMatchObject({code: "hash-mismatch"} satisfies Partial<CandidateStagingError>);
  });
});
