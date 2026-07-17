import {createHash} from "node:crypto";
import {access, copyFile, mkdir, mkdtemp, readFile, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {dirname, join, resolve} from "node:path";
import {prepareCandidateSets, stageLooseCandidateFiles} from "../packages/asset-pipeline/src/index.ts";
import {buildSelectedCandidateRigArtifacts} from "../packages/asset-pipeline/src/approved-asset-workflow.ts";
import {
  generationBriefSchema,
  prepareCandidateSetsRequestSchema,
  verifyAssetRigManifestHash,
  verifyPreparationReportHash,
  verifyRigDiagnosticReportHash,
  verifyRigValidationReportHash,
} from "../packages/story-engine/src/index.ts";
import {renderRigDiagnostic} from "../apps/render-worker/src/render-service.ts";

const workspaceRoot = resolve(process.cwd());
const candidateRoot = resolve(workspaceRoot, "packages/remotion-runtime/public/show-packs/weird-history/rook/v1");
const candidateManifestFile = join(candidateRoot, "candidate-manifest.json");
const createdAt = "2026-07-17T17:00:00.000Z";
const candidateSetId = "rook-v1";

const sourceFiles = [
  {candidateId: "rook-v1-identity", fileRole: "identity-sheet.png", sourceFile: join(candidateRoot, "identity-sheet.png")},
  {candidateId: "rook-v1-neutral", fileRole: "neutral-pose.png", sourceFile: join(candidateRoot, "neutral-pose.png")},
  {candidateId: "rook-v1-talk", fileRole: "talk-pose.png", sourceFile: join(candidateRoot, "talk-pose.png")},
  {candidateId: "rook-v1-reaction", fileRole: "reaction-pose.png", sourceFile: join(candidateRoot, "reaction-pose.png")},
] as const;

const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

async function main(): Promise<void> {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "storystage-rook-"));
  const trustedStagingRoot = join(temporaryRoot, "private-staging");
  const stagingRoot = join(trustedStagingRoot, "rook-import");

  try {
    const sourceManifestHash = sha256(await readFile(candidateManifestFile));
    const staged = await stageLooseCandidateFiles({files: sourceFiles.map(({candidateId, sourceFile}) => ({candidateId, sourceFile})), trustedStagingRoot, stagingRoot});
    const stagedById = new Map(staged.map((entry) => [entry.candidate.candidateId, entry]));
    const request = prepareCandidateSetsRequestSchema.parse({
      importId: "show-pack-rook-v1-import",
      importRecordContentHash: sourceManifestHash,
      exchangeJobId: "show-pack-rook-v1-exchange",
      candidates: sourceFiles.map((source) => {
        const entry = stagedById.get(source.candidateId);
        if (!entry) throw new Error(`Rook source did not stage: ${source.candidateId}`);
        return {
          candidateSetId,
          briefId: "brief-show-pack-rook-v1",
          requirementId: "requirement-show-pack-rook-v1",
          fileRole: source.fileRole,
          expectedMediaType: entry.mediaType,
          expectedWidth: entry.width,
          expectedHeight: entry.height,
          outputRole: "character-canonical-sheet",
          stagedCandidate: entry.candidate,
        };
      }),
    });
    const report = await prepareCandidateSets({request, trustedStagingRoot, stagingRoot});
    if (!verifyPreparationReportHash(report)) throw new Error("Rook preparation report failed its canonical hash.");
    const preparedSet = report.candidateSets[0];
    if (!preparedSet || preparedSet.status !== "ready-for-review") throw new Error("Rook did not produce a complete review-ready candidate set.");

    const brief = generationBriefSchema.parse({
      schemaVersion: "1.0",
      id: "brief-show-pack-rook-v1",
      exchangeMode: "manual-chatgpt-images",
      productionId: "show-pack-weird-history",
      requirementId: "requirement-show-pack-rook-v1",
      showPack: {id: "weird-history-editorial-v1", version: "1.0.0", contentHash: sourceManifestHash},
      styleBible: {id: "style-weird-history-v1", version: "1.0.0", principles: ["Tactile editorial cut-paper illustration", "Readable silhouette at thumbnail size"], contentHash: sourceManifestHash},
      identityLock: null,
      entity: {id: "character-rook", name: "Rook", kind: "character"},
      outputRole: "character-canonical-sheet",
      candidateCount: 1,
      imageQuality: "high",
      backgroundLayerTarget: 3,
      posePack: "basic",
      controlledMatte: "#00FF00",
      referenceAssets: [],
      sourceExcerpts: ["Rook presents a fast-paced weird-history episode."],
      creativeRequirements: ["Original recurring editorial presenter with neutral, talk, and reaction poses"],
      continuityRequirements: ["Preserve face, hair, scarf, clothing, proportions, palette, and texture"],
      prohibitedChanges: ["Do not imitate an existing creator, mascot, or copyrighted character"],
      expectedFiles: sourceFiles.map((source) => source.fileRole),
      consumingSceneIds: ["scene-show-pack-preview"],
      consumingShotIds: ["shot-show-pack-preview"],
      approvalRequired: true,
      status: "draft",
    });

    const existingRigFiles = [
      `prepared/rig-manifest-${candidateSetId}.json`,
      `prepared/rig-validation-${candidateSetId}.json`,
      `prepared/rig-diagnostic-${candidateSetId}.mp4`,
      `prepared/rig-diagnostic-${candidateSetId}.json`,
    ];
    const reuseExistingRig = await Promise.all(existingRigFiles.map((relativeFile) => access(resolve(candidateRoot, ...relativeFile.split("/"))).then(() => true).catch(() => false))).then((results) => results.every(Boolean));
    if (reuseExistingRig) {
      for (const relativeFile of existingRigFiles) {
        const destination = resolve(stagingRoot, ...relativeFile.split("/"));
        await mkdir(dirname(destination), {recursive: true});
        await copyFile(resolve(candidateRoot, ...relativeFile.split("/")), destination);
      }
    }

    const rig = await buildSelectedCandidateRigArtifacts({
      stagingRoot,
      report,
      brief,
      candidateSetId,
      createdAt,
      renderDiagnostic: async ({stagingRoot: importRoot, manifestFile, outputFile, entityName}) => {
        await renderRigDiagnostic({jobId: "rook-v1-diagnostic", entityName, importRoot, manifestFile, outputFile, workspaceRoot});
      },
    });
    if (!verifyAssetRigManifestHash(rig.manifest) || !verifyRigValidationReportHash(rig.validation) || rig.validation.status !== "passed" || !verifyRigDiagnosticReportHash(rig.diagnostic)) {
      throw new Error("Rook rig evidence failed integrity or technical validation.");
    }

    const relativeFiles = [
      ...preparedSet.preparedCandidates.map((candidate) => candidate.relativeFile),
      ...(preparedSet.contactSheet ? [preparedSet.contactSheet.relativeFile] : []),
      `prepared/rig-manifest-${candidateSetId}.json`,
      `prepared/rig-validation-${candidateSetId}.json`,
      rig.diagnostic.videoRelativeFile,
      `prepared/rig-diagnostic-${candidateSetId}.json`,
    ];
    for (const relativeFile of relativeFiles) {
      const destination = resolve(candidateRoot, ...relativeFile.split("/"));
      await mkdir(dirname(destination), {recursive: true});
      await copyFile(resolve(stagingRoot, ...relativeFile.split("/")), destination);
    }

    process.stdout.write(`Prepared Rook: ${preparedSet.preparedCandidates.length} assets, rig ${rig.validation.status}, diagnostic ${rig.diagnostic.videoContentHash} (${reuseExistingRig ? "verified existing" : "rendered new"})\n`);
  } finally {
    await rm(temporaryRoot, {recursive: true, force: true});
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
