import {copyFile, mkdir, readFile, rm, writeFile} from "node:fs/promises";
import {isAbsolute, relative, resolve} from "node:path";
import {
  commitImportEvidenceDirectory,
  createPreparedCandidateComparisonSheet,
  prepareCandidateSets,
  stageCandidateBundle,
  verifyLoggedCandidateBytes,
} from "../packages/asset-pipeline/src/index.ts";
import {createImportRecordFromStagedCandidates} from "../packages/asset-pipeline/src/import-record-builder.ts";
import {
  buildAnimaticSync,
  canTransitionGenerationExchange,
  candidateBundleSchema,
  createImportValidationReport,
  createRookPilot001Fixture,
  finalizeGenerationJob,
  finalizeProductionBundle,
  generationExchangeStateSchema,
  generationJobDraftSchema,
  hashCanonical,
  importRecordSchema,
  importValidationReportSchema,
  prepareCandidateSetsRequestSchema,
  verifyGenerationJobHash,
  verifyImportEvidence,
  verifyPreparationReportHash,
  verifyProductionBundleHash,
  type CandidateBundle,
  type ImportRecord,
} from "../packages/story-engine/src/index.ts";

const workspaceRoot = resolve(process.cwd());
const sourceRoot = resolve(workspaceRoot, "artifacts/SS-009/generated-candidates");
const outputRoot = resolve(workspaceRoot, "artifacts/SS-009/reconstruction-review-packet");
const trustedStagingRoot = resolve(outputRoot, "private-staging");
const stagingRoot = resolve(trustedStagingRoot, "rook-pilot-import");
const reviewRoot = resolve(outputRoot, "review");
const technicalRoot = resolve(outputRoot, "technical");
const createdAt = "2026-07-17T23:45:00.000Z";
const generatedAt = "2026-07-17T22:30:00.000Z";
const exchangeJobId = "job-rook-pilot-001-review";
const importId = "import-rook-pilot-001-review";

const candidateGroups = [
  {shot: "1.03", slug: "shot-1-03-dancing-alone", briefId: "brief-requirement-reconstruction-shot-shot-3-shot-3-reconstruction", sets: [
    {number: 1, expectedContentHash: "9fb05276b39049db8e13615b4127a6a84b4f4cda24008edac64c39c3b0da2000"},
    {number: 2, expectedContentHash: "1b926e74921ba48a8b6cf6cc20ca6cc389b03301a15e305fd5853da239c455e5"},
  ]},
  {shot: "1.05", slug: "shot-1-05-public-emergency", briefId: "brief-requirement-reconstruction-shot-shot-5-shot-5-reconstruction", sets: [
    {number: 1, expectedContentHash: "5bf09b87fd824b290457556511a61e2ebc37477db7d1922df20cd23127f75efa"},
    {number: 2, expectedContentHash: "1e9713f1df40f625a46d6109e0f4067520abe01ef3692bd857f76f2aee5df520"},
  ]},
  {shot: "1.08", slug: "shot-1-08-exhaustion-theory", briefId: "brief-requirement-reconstruction-shot-shot-8-shot-8-reconstruction", sets: [
    {number: 1, expectedContentHash: "03e5dc12c4d8f92563b7b032a82391f1a6a09a97bcb16cf5b55211b0b14a68c9"},
    {number: 2, expectedContentHash: "9b2cdcf3eafb9e59585e838c1f52c57cc8c0f5a0ba7560a1d017b2280ebf7746"},
  ]},
] as const;

function assertWorkspaceOutput(path: string): void {
  const fromWorkspace = relative(workspaceRoot, path);
  if (fromWorkspace === "" || fromWorkspace.startsWith("..") || isAbsolute(fromWorkspace)) throw new Error(`Refusing to replace a review packet outside the workspace: ${path}`);
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, {encoding: "utf8", flag: "wx"});
}

async function readCommittedImportRecord(evidenceRoot: string): Promise<ImportRecord> {
  const [bundle, record, validation] = await Promise.all([
    readFile(resolve(evidenceRoot, "candidate-bundle.json"), "utf8").then((value) => candidateBundleSchema.parse(JSON.parse(value))),
    readFile(resolve(evidenceRoot, "import-record.json"), "utf8").then((value) => importRecordSchema.parse(JSON.parse(value))),
    readFile(resolve(evidenceRoot, "validation-report.json"), "utf8").then((value) => importValidationReportSchema.parse(JSON.parse(value))),
  ]);
  if (hashCanonical(bundle) !== record.manifestContentHash || hashCanonical(bundle) !== hashCanonical(record.candidateBundle) || !verifyImportEvidence(record, validation)) throw new Error("Committed Rook import evidence failed exact three-file binding.");
  return record;
}

async function main(): Promise<void> {
  assertWorkspaceOutput(outputRoot);
  await rm(outputRoot, {recursive: true, force: true});
  await Promise.all([mkdir(reviewRoot, {recursive: true}), mkdir(technicalRoot, {recursive: true})]);

  const fixture = createRookPilot001Fixture();
  const build = buildAnimaticSync(fixture);
  const sourceBundle = finalizeProductionBundle({schemaVersion: "1.0", production: build.draft, overrides: fixture.overrides, approvedAssetVersions: [], resolvedPlan: build.resolvedPlan, renderPlan: build.renderPlan, metrics: build.metrics, estimate: build.estimate}, createdAt);
  if (!verifyProductionBundleHash(sourceBundle)) throw new Error("The Rook source production snapshot failed canonical verification.");
  const job = finalizeGenerationJob(generationJobDraftSchema.parse({
    schemaVersion: "1.0",
    exchangeMode: "manual-chatgpt-images",
    production: {id: sourceBundle.production.productionId, revision: sourceBundle.production.revision, title: sourceBundle.production.title},
    productionBundleContentHash: sourceBundle.contentHash,
    showPack: {id: sourceBundle.resolvedPlan.showPack.id, version: sourceBundle.resolvedPlan.showPack.version, contentHash: sourceBundle.resolvedPlan.showPack.contentHash},
    briefs: sourceBundle.resolvedPlan.generationBriefs,
    expectedOutputLayout: {manifest: "candidate-bundle.json", files: "candidates/<brief-id>/<candidate-set-id>/<file-role>"},
  }), {exchangeJobId, createdAt});
  if (!verifyGenerationJobHash(job)) throw new Error("The Rook generation job failed canonical verification.");
  if (job.briefs.length !== 3 || job.briefs.some((brief) => brief.candidateCount !== 2 || hashCanonical(brief.expectedFiles) !== hashCanonical(["candidate.png"]))) throw new Error("The Rook review packet requires exactly three one-file briefs with two candidate sets each.");

  const assets: CandidateBundle["assets"] = [];
  for (const group of candidateGroups) {
    const brief = job.briefs.find((candidate) => candidate.id === group.briefId);
    if (!brief) throw new Error(`The authoritative Rook job is missing ${group.briefId}.`);
    for (const set of group.sets) {
      const setNumber = set.number;
      const relativeFile = `${group.slug}/set-${setNumber}/candidate.png`;
      const bytes = await readFile(resolve(sourceRoot, ...relativeFile.split("/")));
      const verified = verifyLoggedCandidateBytes({candidateId: `rook-${group.slug}-set-${setNumber}`, bytes, expectedContentHash: set.expectedContentHash, expectedMediaType: "image/png", expectedWidth: 1672, expectedHeight: 941});
      assets.push({
        candidateId: `rook-${group.slug}-set-${setNumber}`,
        candidateSetId: `set-rook-${group.slug}-${setNumber}`,
        briefId: brief.id,
        fileRole: "candidate.png",
        relativeFile,
        contentHash: verified.contentHash,
        mediaType: verified.mediaType,
        width: verified.width,
        height: verified.height,
        rights: {sourceType: "generated", provider: "ChatGPT Images", usageNotes: "Original StoryStage Rook Pilot 001 reconstruction candidate; human approval required before production use."},
      });
    }
  }
  const candidateBundle = candidateBundleSchema.parse({
    schemaVersion: "1.0",
    exchangeMode: "manual-chatgpt-images",
    exchangeJobId: job.exchangeJobId,
    generationJobContentHash: job.contentHash,
    production: {id: job.production.id, revision: job.production.revision},
    showPack: job.showPack,
    providerMetadata: {provider: "chatgpt-images", generatedAt, conversationReference: null},
    assets,
  });

  const staged = await stageCandidateBundle({bundle: candidateBundle, sourceRoot, trustedStagingRoot, stagingRoot});
  const {record: importRecord, missingRoleCount} = createImportRecordFromStagedCandidates({job, importId, sourceMode: "structured-bundle", bundle: candidateBundle, staged, createdAt});
  if (missingRoleCount !== 0 || staged.length !== 6) throw new Error(`Rook staging is incomplete: ${staged.length} staged, ${missingRoleCount} expected roles missing.`);
  const validation = createImportValidationReport(importRecord, createdAt);
  await commitImportEvidenceDirectory({
    stagingRoot,
    expectedContentHash: importRecord.contentHash,
    files: {candidateBundle: `${JSON.stringify(candidateBundle, null, 2)}\n`, importRecord: `${JSON.stringify(importRecord, null, 2)}\n`, validationReport: `${JSON.stringify(validation, null, 2)}\n`},
    readCommittedContentHash: async (evidenceRoot) => (await readCommittedImportRecord(evidenceRoot)).contentHash,
    transactionId: "rook-pilot-review-evidence",
  });
  const committedImportRecord = await readCommittedImportRecord(resolve(stagingRoot, "evidence"));

  const briefsById = new Map(job.briefs.map((brief) => [brief.id, brief]));
  const request = prepareCandidateSetsRequestSchema.parse({
    importId: committedImportRecord.importId,
    importRecordContentHash: committedImportRecord.contentHash,
    exchangeJobId: committedImportRecord.exchangeJobId,
    candidates: committedImportRecord.assets.map((asset) => {
      const brief = briefsById.get(asset.briefId);
      if (!brief) throw new Error(`Prepared candidate lost its authoritative brief: ${asset.candidateId}`);
      return {candidateSetId: asset.candidateSetId, briefId: asset.briefId, requirementId: asset.requirementId, fileRole: asset.fileRole, expectedMediaType: asset.mediaType, expectedWidth: asset.width, expectedHeight: asset.height, outputRole: brief.outputRole, stagedCandidate: asset.stagedCandidate};
    }),
  });
  const report = await prepareCandidateSets({request, trustedStagingRoot, stagingRoot});
  if (!verifyPreparationReportHash(report) || report.candidateSets.length !== 6 || report.candidateSets.some((set) => set.status !== "ready-for-review" || set.failures.length > 0 || set.preparedCandidates.length !== 1 || !set.contactSheet)) throw new Error("The real preparation path did not produce six complete review-ready candidate sets.");

  const comparisons = [];
  const reviewCandidates = [];
  for (const group of candidateGroups) {
    const sets = report.candidateSets.filter((set) => set.briefId === group.briefId).sort((left, right) => left.candidateSetId.localeCompare(right.candidateSetId));
    const prepared = sets.map((set) => set.preparedCandidates[0]!);
    if (prepared.some((candidate) => candidate.width !== 1920 || candidate.height !== 1080 || candidate.assetClass !== "editorial-visual")) throw new Error(`Shot ${group.shot} did not normalize to canonical 1920x1080 editorial visuals.`);
    const comparison = await createPreparedCandidateComparisonSheet({trustedStagingRoot, stagingRoot, candidates: prepared});
    const comparisonFile = `shot-${group.shot.replace(".", "-")}-comparison.png`;
    await copyFile(resolve(stagingRoot, ...comparison.relativeFile.split("/")), resolve(reviewRoot, comparisonFile));
    comparisons.push({...comparison, shot: group.shot, reviewFile: `review/${comparisonFile}`});
    for (const [index, candidate] of prepared.entries()) {
      const reviewFile = `shot-${group.shot.replace(".", "-")}-set-${index + 1}.png`;
      await copyFile(resolve(stagingRoot, ...candidate.relativeFile.split("/")), resolve(reviewRoot, reviewFile));
      reviewCandidates.push({...candidate, shot: group.shot, setNumber: index + 1, reviewFile: `review/${reviewFile}`});
    }
  }

  if (!canTransitionGenerationExchange("staged", "needs-review")) throw new Error("The generation exchange contract no longer permits the non-approving review transition.");
  const exchangeState = generationExchangeStateSchema.parse({schemaVersion: "1.0", exchangeJobId: job.exchangeJobId, generationJobContentHash: job.contentHash, production: {id: job.production.id, revision: job.production.revision}, status: "needs-review", importId, supersededBy: null, updatedAt: report.preparedAt});
  const diagnostics = {
    schemaVersion: "1.0",
    production: exchangeState.production,
    exchangeStatus: exchangeState.status,
    generationJobContentHash: job.contentHash,
    importRecordContentHash: committedImportRecord.contentHash,
    preparationReportContentHash: report.contentHash,
    sourceCandidateCount: assets.length,
    preparedCandidateCount: reviewCandidates.length,
    comparisons,
    candidates: reviewCandidates,
    humanDecisions: {selectedCandidateSetIds: [], rejectedCandidateSetIds: [], approvedAssetVersions: []},
  };
  await Promise.all([
    writeJson(resolve(technicalRoot, "source-production.json"), sourceBundle),
    writeJson(resolve(technicalRoot, "generation-job.json"), job),
    writeJson(resolve(technicalRoot, "preparation-report.json"), report),
    writeJson(resolve(technicalRoot, "generation-exchange-state.json"), exchangeState),
    writeJson(resolve(technicalRoot, "technical-diagnostics.json"), diagnostics),
  ]);
  const summaryLines = comparisons.map((comparison) => `- Shot ${comparison.shot}: \`${comparison.reviewFile}\` · ${comparison.width}x${comparison.height} · \`${comparison.contentHash}\``).join("\n");
  await writeFile(resolve(outputRoot, "README.md"), `# SS-009 reconstruction review packet\n\nStatus: **needs-review**\n\nStoryStage byte-verified all six logged PNGs, committed immutable import evidence, normalized each candidate through the production Sharp path to 1920x1080, and generated three A/B comparison sheets. This packet records no selection, rejection, approval, promotion, or production binding.\n\n## A/B comparison sheets\n\n${summaryLines}\n\n## Technical evidence\n\n- Generation job: \`${job.contentHash}\`\n- Import record: \`${committedImportRecord.contentHash}\`\n- Preparation report: \`${report.contentHash}\`\n- Exchange state: \`needs-review\`\n- Human decisions: zero\n`, {encoding: "utf8", flag: "wx"});

  process.stdout.write(`Prepared SS-009 review packet: ${reviewCandidates.length} canonical candidates, ${comparisons.length} A/B sheets, ${exchangeState.status}, 0 human decisions.\n${outputRoot}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
