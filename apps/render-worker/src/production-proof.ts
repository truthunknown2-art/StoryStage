import {execFile} from "node:child_process";
import {createHash} from "node:crypto";
import {mkdir, readFile, rm, writeFile} from "node:fs/promises";
import {isAbsolute, relative, resolve} from "node:path";
import {promisify} from "node:util";
import {deflateSync} from "node:zlib";
import ffmpegPath from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import {prepareCandidateSets, stageCandidateBundle} from "@storystage/asset-pipeline";
import {commitApprovalWorkflow} from "@storystage/asset-pipeline/approval-recovery";
import {
  buildApprovedProductionRevisionDraft,
  buildSelectedCandidateRigArtifacts,
  persistAssetReviewRecordSnapshot,
  promotePreparedCandidateSet,
} from "@storystage/asset-pipeline/approved-asset-workflow";
import {commitImportEvidenceDirectory} from "@storystage/asset-pipeline/import-evidence-store";
import {createImportRecordFromStagedCandidates} from "@storystage/asset-pipeline/import-record-builder";
import {
  buildAnimaticSync,
  candidateBundleSchema,
  createImportValidationReport,
  createProductionDraft,
  finalizeAssetReviewRecord,
  finalizeGenerationJob,
  finalizeProductionBundle,
  generationExchangeStateSchema,
  generationJobDraftSchema,
  hashCanonical,
  importRecordSchema,
  importValidationReportSchema,
  prepareCandidateSetsRequestSchema,
  verifyImportEvidence,
  verifyPreparationReportHash,
  verifyProductionBundleHash,
  type CandidateBundle,
  type ProductionBundle,
} from "@storystage/story-engine";
import {readSampleMetadata, renderProduction, renderRigDiagnostic} from "./render-service";

const workspaceRoot = resolve(import.meta.dirname, "../../..");
const proofRoot = resolve(workspaceRoot, "artifacts/SS-002");
const privateRoot = resolve(proofRoot, "private");
const assetsRoot = resolve(privateRoot, "assets");
const productionsRoot = resolve(privateRoot, "productions");
const outputRoot = resolve(proofRoot, "renders");
const framesRoot = resolve(proofRoot, "frame-checks");
const sourceRoot = resolve(proofRoot, "manual-chatgpt-return");
const trustedStagingRoot = privateRoot;
const importId = "import-approved-proof";
const stagingRoot = resolve(privateRoot, "jobs/inbox/production-approved-proof/r1", importId);
const reviewsRoot = resolve(stagingRoot, "reviews");
const execFileAsync = promisify(execFile);
const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

function isWithin(root: string, candidate: string): boolean {
  const delta = relative(root, candidate);
  return delta === "" || (!delta.startsWith("..") && !isAbsolute(delta));
}

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(typeName: string, data: Buffer): Buffer {
  const type = Buffer.from(typeName, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([type, data])));
  return Buffer.concat([length, type, data, checksum]);
}

function makeVoiceProofWav(sampleFrames: number, sampleRate = 48_000, frequency = 190): Buffer {
  const dataBytes = sampleFrames * 2;
  const bytes = Buffer.alloc(44 + dataBytes);
  bytes.write("RIFF", 0, "ascii"); bytes.writeUInt32LE(36 + dataBytes, 4); bytes.write("WAVE", 8, "ascii"); bytes.write("fmt ", 12, "ascii"); bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22); bytes.writeUInt32LE(sampleRate, 24); bytes.writeUInt32LE(sampleRate * 2, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34); bytes.write("data", 36, "ascii"); bytes.writeUInt32LE(dataBytes, 40);
  for (let frame = 0; frame < sampleFrames; frame += 1) {
    const envelope = .25 + .75 * Math.abs(Math.sin(frame / sampleRate * Math.PI * 1.7));
    bytes.writeInt16LE(Math.round(Math.sin(frame / sampleRate * Math.PI * 2 * frequency) * 2_400 * envelope), 44 + frame * 2);
  }
  return bytes;
}

type Color = [number, number, number, number];
type Pose = "identity" | "neutral" | "talk" | "reaction";

function makePosePng(pose: Pose): Buffer {
  const width = 1600;
  const height = 1800;
  const pixels = new Uint8Array(width * height * 4);
  const paint = (x: number, y: number, color: Color) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    pixels.set(color, (y * width + x) * 4);
  };
  const ellipse = (cx: number, cy: number, rx: number, ry: number, color: Color) => {
    for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(height - 1, Math.ceil(cy + ry)); y += 1) {
      for (let x = Math.max(0, Math.floor(cx - rx)); x <= Math.min(width - 1, Math.ceil(cx + rx)); x += 1) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) paint(x, y, color);
      }
    }
  };
  const rect = (left: number, top: number, right: number, bottom: number, color: Color) => {
    for (let y = Math.max(0, top); y < Math.min(height, bottom); y += 1) {
      for (let x = Math.max(0, left); x < Math.min(width, right); x += 1) paint(x, y, color);
    }
  };
  const line = (x1: number, y1: number, x2: number, y2: number, radius: number, color: Color) => {
    const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 18);
    for (let step = 0; step <= steps; step += 1) {
      const amount = step / steps;
      ellipse(x1 + (x2 - x1) * amount, y1 + (y2 - y1) * amount, radius, radius, color);
    }
  };

  const ink: Color = [27, 43, 50, 255];
  const skin: Color = [226, 157, 111, 255];
  const shirt: Color = pose === "reaction" ? [226, 86, 75, 255] : [42, 132, 142, 255];
  const trousers: Color = [43, 61, 87, 255];
  const white: Color = [247, 239, 218, 255];
  rect(650, 1180, 775, 1630, trousers);
  rect(825, 1180, 950, 1630, trousers);
  ellipse(708, 1650, 112, 55, ink);
  ellipse(892, 1650, 112, 55, ink);
  ellipse(800, 1030, 300, 420, shirt);
  if (pose === "talk") {
    line(570, 930, 330, 710, 58, shirt);
    line(1030, 930, 1270, 690, 58, shirt);
    ellipse(320, 700, 72, 72, skin);
    ellipse(1280, 680, 72, 72, skin);
  } else if (pose === "reaction") {
    line(570, 920, 350, 1110, 58, shirt);
    line(1030, 920, 1250, 1110, 58, shirt);
    ellipse(340, 1120, 72, 72, skin);
    ellipse(1260, 1120, 72, 72, skin);
  } else {
    line(570, 920, 430, 1220, 58, shirt);
    line(1030, 920, 1170, 1220, 58, shirt);
    ellipse(425, 1235, 72, 72, skin);
    ellipse(1175, 1235, 72, 72, skin);
  }
  ellipse(800, 480, 250, 285, skin);
  ellipse(800, 300, 255, 160, ink);
  ellipse(705, 475, 42, 48, white);
  ellipse(895, 475, 42, 48, white);
  ellipse(710, pose === "reaction" ? 455 : 480, 16, 22, ink);
  ellipse(890, pose === "reaction" ? 455 : 480, 16, 22, ink);
  if (pose === "talk") ellipse(800, 630, 88, 70, ink);
  else if (pose === "reaction") {
    line(730, 650, 870, 610, 22, ink);
    line(650, 385, 755, 350, 16, ink);
    line(845, 350, 950, 385, 16, ink);
  } else line(735, 620, 865, 620, 18, ink);
  if (pose === "identity") {
    rect(300, 120, 325, 1680, [239, 194, 77, 180]);
    rect(1275, 120, 1300, 1680, [239, 194, 77, 180]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const scanlines = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const target = y * (width * 4 + 1);
    scanlines[target] = 0;
    Buffer.from(pixels.buffer, y * width * 4, width * 4).copy(scanlines, target + 1);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(scanlines, {level: 9})),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function poseForRole(fileRole: string): Pose {
  if (fileRole === "identity-sheet.png") return "identity";
  if (fileRole === "neutral-pose.png") return "neutral";
  if (fileRole === "talk-pose.png") return "talk";
  if (fileRole === "reaction-pose.png") return "reaction";
  throw new Error(`The proof fixture does not implement the expected character role ${fileRole}.`);
}

async function persistProductionBundle(bundle: ProductionBundle): Promise<string> {
  if (!verifyProductionBundleHash(bundle)) throw new Error("A production snapshot failed its immutable hash before persistence.");
  const snapshotsRoot = resolve(productionsRoot, bundle.production.productionId, `r${bundle.production.revision}`, "snapshots");
  await mkdir(snapshotsRoot, {recursive: true});
  const file = resolve(snapshotsRoot, `${bundle.contentHash}.json`);
  await writeFile(file, `${JSON.stringify(bundle, null, 2)}\n`, {encoding: "utf8", flag: "wx"});
  return file;
}

async function readCommittedImportRecord(evidenceRoot: string) {
  const [bundle, record, validation] = await Promise.all([
    readFile(resolve(evidenceRoot, "candidate-bundle.json"), "utf8").then((value) => candidateBundleSchema.parse(JSON.parse(value))),
    readFile(resolve(evidenceRoot, "import-record.json"), "utf8").then((value) => importRecordSchema.parse(JSON.parse(value))),
    readFile(resolve(evidenceRoot, "validation-report.json"), "utf8").then((value) => importValidationReportSchema.parse(JSON.parse(value))),
  ]);
  if (hashCanonical(bundle) !== record.manifestContentHash || hashCanonical(bundle) !== hashCanonical(record.candidateBundle) || !verifyImportEvidence(record, validation)) {
    throw new Error("Committed import evidence failed exact three-file binding.");
  }
  return record;
}

async function extractFrame(video: string, frame: number, output: string): Promise<string> {
  if (!ffmpegPath) throw new Error("ffmpeg-static did not provide an executable path.");
  await execFileAsync(ffmpegPath, ["-loglevel", "error", "-y", "-i", video, "-vf", `select=eq(n\\,${frame})`, "-frames:v", "1", output], {maxBuffer: 10 * 1024 * 1024});
  return sha256(await readFile(output));
}

async function main() {
  if (!isWithin(resolve(workspaceRoot, "artifacts"), proofRoot)) throw new Error("Refusing to clean a proof folder outside the workspace artifacts root.");
  await rm(proofRoot, {recursive: true, force: true});
  await Promise.all([mkdir(sourceRoot, {recursive: true}), mkdir(privateRoot, {recursive: true}), mkdir(outputRoot, {recursive: true}), mkdir(framesRoot, {recursive: true})]);

  const createdAt = "2026-07-17T08:00:00.000Z";
  const approvedAt = "2026-07-17T08:15:00.000Z";
  const draftRevisionOne = createProductionDraft({
    productionId: "production-approved-proof",
    revision: 1,
    title: "The Punctual Box / Real Workflow Proof",
    projectType: "kids",
    showPackId: "kids-adventure-v1",
    preset: "studio",
    script: "INT. WORKSHOP - DAY\n\nMARA: I found it.",
  });
  const initial = buildAnimaticSync({draft: draftRevisionOne});
  const sourceBundle = finalizeProductionBundle({
    schemaVersion: "1.0",
    production: initial.draft,
    overrides: [],
    approvedAssetVersions: [],
    resolvedPlan: initial.resolvedPlan,
    renderPlan: initial.renderPlan,
    metrics: initial.metrics,
    estimate: initial.estimate,
  }, createdAt);
  const sourceBundleFile = await persistProductionBundle(sourceBundle);
  if (sourceBundle.resolvedPlan.generationBriefs.length !== 1) throw new Error("The proof requires exactly one unresolved character brief.");
  const draftBrief = sourceBundle.resolvedPlan.generationBriefs[0]!;
  const generationJob = finalizeGenerationJob(generationJobDraftSchema.parse({
    schemaVersion: "1.0",
    exchangeMode: "manual-chatgpt-images",
    production: {id: sourceBundle.production.productionId, revision: sourceBundle.production.revision, title: sourceBundle.production.title},
    productionBundleContentHash: sourceBundle.contentHash,
    showPack: {id: sourceBundle.resolvedPlan.showPack.id, version: sourceBundle.resolvedPlan.showPack.version, contentHash: sourceBundle.resolvedPlan.showPack.contentHash},
    briefs: sourceBundle.resolvedPlan.generationBriefs,
    expectedOutputLayout: {manifest: "candidate-bundle.json", files: "candidates/<brief-id>/<candidate-set-id>/<file-role>"},
  }), {exchangeJobId: "job-approved-proof", createdAt});
  const brief = generationJob.briefs[0]!;
  const generationJobFile = resolve(privateRoot, "jobs/outbox", generationJob.exchangeJobId, "generation-job.json");
  await mkdir(resolve(privateRoot, "jobs/outbox", generationJob.exchangeJobId), {recursive: true});
  await writeFile(generationJobFile, `${JSON.stringify(generationJob, null, 2)}\n`, {encoding: "utf8", flag: "wx"});

  const assets: CandidateBundle["assets"] = [];
  for (let setIndex = 1; setIndex <= brief.candidateCount; setIndex += 1) {
    const candidateSetId = `set-${brief.id}-${setIndex}`;
    for (const fileRole of brief.expectedFiles) {
      const pose = poseForRole(fileRole);
      const candidateId = `mara-${setIndex}-${pose}`;
      const bytes = makePosePng(pose);
      const relativeFile = `candidates/${brief.id}/${candidateSetId}/${fileRole}`;
      const absoluteFile = resolve(sourceRoot, ...relativeFile.split("/"));
      await mkdir(resolve(absoluteFile, ".."), {recursive: true});
      await writeFile(absoluteFile, bytes, {flag: "wx"});
      assets.push({candidateId, candidateSetId, briefId: brief.id, fileRole, relativeFile, contentHash: sha256(bytes), mediaType: "image/png", width: 1600, height: 1800, rights: {sourceType: "generated", provider: "chatgpt-images", usageNotes: "Deterministic local engineering fixture standing in for a manual ChatGPT Images return."}});
    }
  }
  const candidateBundle = candidateBundleSchema.parse({
    schemaVersion: "1.0",
    exchangeMode: "manual-chatgpt-images",
    exchangeJobId: generationJob.exchangeJobId,
    generationJobContentHash: generationJob.contentHash,
    production: {id: generationJob.production.id, revision: generationJob.production.revision},
    showPack: generationJob.showPack,
    providerMetadata: {provider: "chatgpt-images", generatedAt: "2026-07-17T08:05:00.000Z", conversationReference: null},
    assets,
  });
  const candidateBundleFile = resolve(sourceRoot, "candidate-bundle.json");
  await writeFile(candidateBundleFile, `${JSON.stringify(candidateBundle, null, 2)}\n`, {encoding: "utf8", flag: "wx"});

  const staged = await stageCandidateBundle({bundle: candidateBundle, sourceRoot, trustedStagingRoot, stagingRoot});
  const {record: importRecord, missingRoleCount} = createImportRecordFromStagedCandidates({job: generationJob, importId, sourceMode: "structured-bundle", bundle: candidateBundle, staged, createdAt: "2026-07-17T08:06:00.000Z"});
  if (missingRoleCount !== 0) throw new Error("The proof candidate return is not a complete coherent set.");
  const importValidation = createImportValidationReport(importRecord, "2026-07-17T08:07:00.000Z");
  await commitImportEvidenceDirectory({
    stagingRoot,
    expectedContentHash: importRecord.contentHash,
    files: {
      candidateBundle: `${JSON.stringify(candidateBundle, null, 2)}\n`,
      importRecord: `${JSON.stringify(importRecord, null, 2)}\n`,
      validationReport: `${JSON.stringify(importValidation, null, 2)}\n`,
    },
    readCommittedContentHash: async (evidenceRoot) => (await readCommittedImportRecord(evidenceRoot)).contentHash,
  });
  const committedImportRecord = await readCommittedImportRecord(resolve(stagingRoot, "evidence"));

  const briefById = new Map(generationJob.briefs.map((candidate) => [candidate.id, candidate]));
  const preparationRequest = prepareCandidateSetsRequestSchema.parse({
    importId: committedImportRecord.importId,
    importRecordContentHash: committedImportRecord.contentHash,
    exchangeJobId: committedImportRecord.exchangeJobId,
    candidates: committedImportRecord.assets.map((asset) => {
      const authoritativeBrief = briefById.get(asset.briefId);
      if (!authoritativeBrief) throw new Error("An imported candidate lost its authoritative brief.");
      return {candidateSetId: asset.candidateSetId, briefId: asset.briefId, requirementId: asset.requirementId, fileRole: asset.fileRole, expectedMediaType: asset.mediaType, expectedWidth: asset.width, expectedHeight: asset.height, outputRole: authoritativeBrief.outputRole, stagedCandidate: asset.stagedCandidate};
    }),
  });
  const preparationReport = await prepareCandidateSets({request: preparationRequest, trustedStagingRoot, stagingRoot});
  if (!verifyPreparationReportHash(preparationReport) || preparationReport.candidateSets.some((set) => set.status !== "ready-for-review")) throw new Error("Sharp preparation did not produce review-ready coherent sets.");
  const preparationReportFile = resolve(stagingRoot, "preparation-report.json");
  await writeFile(preparationReportFile, `${JSON.stringify(preparationReport, null, 2)}\n`, {encoding: "utf8", flag: "wx"});

  const selectedSet = preparationReport.candidateSets[0]!;
  const rig = await buildSelectedCandidateRigArtifacts({
    stagingRoot,
    report: preparationReport,
    brief,
    candidateSetId: selectedSet.candidateSetId,
    createdAt: "2026-07-17T08:10:00.000Z",
    renderDiagnostic: async ({stagingRoot: importRoot, manifestFile, outputFile, entityName}) => {
      await renderRigDiagnostic({jobId: "proof-selected-rig", entityName, importRoot, manifestFile, outputFile, workspaceRoot});
    },
  });
  const selectedReview = finalizeAssetReviewRecord({
    schemaVersion: "1.0",
    exchangeJobId: generationJob.exchangeJobId,
    importId,
    preparationReportContentHash: preparationReport.contentHash,
    decisions: preparationReport.candidateSets.map((set) => ({candidateSetId: set.candidateSetId, briefId: set.briefId, requirementId: set.requirementId, status: set.candidateSetId === selectedSet.candidateSetId ? "selected" as const : "rejected" as const, notes: set.candidateSetId === selectedSet.candidateSetId ? "Selected after coherent-kit comparison and moving rig diagnostic." : "Not selected after coherent-kit comparison.", decidedAt: "2026-07-17T08:11:00.000Z", approvedAssetVersion: null})),
  }, "2026-07-17T08:11:00.000Z");
  await persistAssetReviewRecordSnapshot({reviewsRoot, record: selectedReview});

  const approvedAssetVersion = await promotePreparedCandidateSet({stagingRoot, assetsRoot, report: preparationReport, importRecord: committedImportRecord, candidateSetId: selectedSet.candidateSetId, approvedAt});
  const approvedReview = finalizeAssetReviewRecord({
    schemaVersion: "1.0",
    exchangeJobId: generationJob.exchangeJobId,
    importId,
    preparationReportContentHash: preparationReport.contentHash,
    decisions: selectedReview.decisions.map((decision) => decision.candidateSetId === selectedSet.candidateSetId ? {...decision, status: "approved" as const, notes: "Approved after contact-sheet comparison and moving rig diagnostic.", decidedAt: approvedAt, approvedAssetVersion} : decision),
  }, approvedAt);
  const revisionTwoDraft = buildApprovedProductionRevisionDraft({sourceBundle, approvedAssetVersions: [approvedAssetVersion]});
  const voiceBytes = makeVoiceProofWav(Math.round(revisionTwoDraft.renderPlan.durationInFrames / revisionTwoDraft.renderPlan.fps * 48_000));
  const voiceContentHash = sha256(voiceBytes);
  const voiceRelativeFile = `voice/${revisionTwoDraft.production.productionId}/r${revisionTwoDraft.production.revision}/${voiceContentHash}.wav`;
  await mkdir(resolve(assetsRoot, ...voiceRelativeFile.split("/").slice(0, -1)), {recursive: true});
  await writeFile(resolve(assetsRoot, ...voiceRelativeFile.split("/")), voiceBytes, {flag: "wx"});
  const musicBytes = makeVoiceProofWav(Math.round(revisionTwoDraft.renderPlan.durationInFrames / revisionTwoDraft.renderPlan.fps * 48_000), 48_000, 110);
  const musicContentHash = sha256(musicBytes);
  const musicRelativeFile = `music/${revisionTwoDraft.production.productionId}/r${revisionTwoDraft.production.revision}/${musicContentHash}.wav`;
  await mkdir(resolve(assetsRoot, ...musicRelativeFile.split("/").slice(0, -1)), {recursive: true});
  await writeFile(resolve(assetsRoot, ...musicRelativeFile.split("/")), musicBytes, {flag: "wx"});
  const soundEffectBytes = makeVoiceProofWav(Math.round(.35 * 48_000), 48_000, 660);
  const soundEffectContentHash = sha256(soundEffectBytes);
  const soundEffectRelativeFile = `sfx/${revisionTwoDraft.production.productionId}/r${revisionTwoDraft.production.revision}/${soundEffectContentHash}.wav`;
  await mkdir(resolve(assetsRoot, ...soundEffectRelativeFile.split("/").slice(0, -1)), {recursive: true});
  await writeFile(resolve(assetsRoot, ...soundEffectRelativeFile.split("/")), soundEffectBytes, {flag: "wx"});
  const cueShot = revisionTwoDraft.renderPlan.shots[1] ?? revisionTwoDraft.renderPlan.shots[0]!;
  const approvedBundle = finalizeProductionBundle({...revisionTwoDraft, audioMix: {profile: "kids", voiceGain: .95, musicDecision: "approved-master", musicGain: .08, musicLoop: true, transitionSfx: "off", transitionSfxGain: .1, reviewed: true}, musicTrack: {id: `music-${musicContentHash.slice(0, 20)}`, contentHash: musicContentHash, relativeFile: musicRelativeFile, sourceFileName: "engineering-music-proof.wav", codec: "pcm-wav", durationInSeconds: revisionTwoDraft.renderPlan.durationInFrames / revisionTwoDraft.renderPlan.fps, sampleRate: 48_000, channels: 1, bitsPerSample: 16, importedAt: approvedAt, approvalStatus: "approved", approvedAt}, soundEffectAssets: [{id: `sfx-${soundEffectContentHash.slice(0, 20)}`, contentHash: soundEffectContentHash, relativeFile: soundEffectRelativeFile, sourceFileName: "engineering-impact-proof.wav", codec: "pcm-wav", durationInSeconds: .35, sampleRate: 48_000, channels: 1, bitsPerSample: 16, importedAt: approvedAt, approvalStatus: "approved", approvedAt}], soundEffectCues: [{id: "sfx-cue-engineering-impact", assetContentHash: soundEffectContentHash, shotId: cueShot.id, offsetInFrames: Math.min(4, cueShot.durationInFrames - 1), gain: .35, label: "Engineering impact"}], voiceTrack: {id: `voice-${voiceContentHash.slice(0, 20)}`, contentHash: voiceContentHash, relativeFile: voiceRelativeFile, sourceFileName: "engineering-voice-proof.wav", codec: "pcm-wav", durationInSeconds: revisionTwoDraft.renderPlan.durationInFrames / revisionTwoDraft.renderPlan.fps, sampleRate: 48_000, channels: 1, bitsPerSample: 16, importedAt: approvedAt, approvalStatus: "approved", approvedAt}}, approvedAt);
  let approvedBundleFile = "";
  const approvedState = generationExchangeStateSchema.parse({schemaVersion: "1.0", exchangeJobId: generationJob.exchangeJobId, generationJobContentHash: generationJob.contentHash, production: {id: generationJob.production.id, revision: generationJob.production.revision}, status: "approved", importId, supersededBy: null, updatedAt: approvedAt});
  const approvedStateFile = resolve(privateRoot, "jobs/outbox", generationJob.exchangeJobId, "state-approved.json");
  await commitApprovalWorkflow({
    persistReview: () => persistAssetReviewRecordSnapshot({reviewsRoot, record: approvedReview}),
    ensureProduction: async () => { approvedBundleFile = await persistProductionBundle(approvedBundle); },
    ensureApprovedState: async () => { await writeFile(approvedStateFile, `${JSON.stringify(approvedState, null, 2)}\n`, {encoding: "utf8", flag: "wx"}); },
  });
  if (approvedBundle.resolvedPlan.generationBriefs.some((candidate) => candidate.requirementId === draftBrief.requirementId)) throw new Error("The approved production revision still contains the resolved generation brief.");

  const renderOptions = {assetsRoot, bundleContentHash: approvedBundle.contentHash, bundleFile: approvedBundleFile, outputRoot, scope: "engineering-slice" as const, trustedProductionRoot: productionsRoot, workspaceRoot};
  const passOneVideo = await renderProduction({...renderOptions, jobId: "approved-production-proof-pass-1"});
  const passTwoVideo = await renderProduction({...renderOptions, jobId: "approved-production-proof-pass-2"});
  const totalFrames = Math.min(approvedBundle.renderPlan.durationInFrames, approvedBundle.renderPlan.fps * 24);
  const frameNumbers = [...new Set([0, Math.floor(totalFrames * 0.25), Math.floor(totalFrames * 0.5), Math.floor(totalFrames * 0.75), Math.max(0, totalFrames - 2)])];
  const frameComparisons = [];
  for (const frame of frameNumbers) {
    const passOneFile = resolve(framesRoot, `pass-1-frame-${String(frame).padStart(4, "0")}.png`);
    const passTwoFile = resolve(framesRoot, `pass-2-frame-${String(frame).padStart(4, "0")}.png`);
    const [passOneHash, passTwoHash] = await Promise.all([extractFrame(passOneVideo, frame, passOneFile), extractFrame(passTwoVideo, frame, passTwoFile)]);
    frameComparisons.push({frame, passOneFile, passTwoFile, passOneHash, passTwoHash, matches: passOneHash === passTwoHash});
  }
  if (frameComparisons.some((comparison) => !comparison.matches)) throw new Error("Decoded production frames changed across identical renders.");
  const probe = await execFileAsync(ffprobeStatic.path, ["-v", "error", "-show_streams", "-of", "json", passOneVideo], {maxBuffer: 10 * 1024 * 1024});
  const contactSheet = selectedSet.contactSheet!;
  const evidenceFiles = {
    sourceBundleFile,
    generationJobFile,
    candidateBundleFile,
    committedCandidateBundleFile: resolve(stagingRoot, "evidence/candidate-bundle.json"),
    importRecordFile: resolve(stagingRoot, "evidence/import-record.json"),
    importValidationFile: resolve(stagingRoot, "evidence/validation-report.json"),
    preparationReportFile,
    contactSheetFile: resolve(stagingRoot, ...contactSheet.relativeFile.split("/")),
    selectedReviewFile: resolve(reviewsRoot, `${selectedReview.contentHash}.json`),
    approvedReviewFile: resolve(reviewsRoot, `${approvedReview.contentHash}.json`),
    approvedStateFile,
    selectedRigManifestFile: resolve(stagingRoot, `prepared/rig-manifest-${selectedSet.candidateSetId}.json`),
    selectedRigValidationFile: resolve(stagingRoot, `prepared/rig-validation-${selectedSet.candidateSetId}.json`),
    selectedRigDiagnosticFile: resolve(stagingRoot, rig.diagnostic.videoRelativeFile),
    approvedBundleFile,
  };
  const report = {
    generatedAt: new Date().toISOString(),
    verdict: "PASS: the real candidate-to-approved-production path rendered twice with identical decoded frames.",
    productionVideos: [passOneVideo, passTwoVideo],
    productionVideoByteHashes: [sha256(await readFile(passOneVideo)), sha256(await readFile(passTwoVideo))],
    metadata: await readSampleMetadata(passOneVideo),
    streams: JSON.parse(probe.stdout),
    sourceProductionBundleContentHash: sourceBundle.contentHash,
    generationJobContentHash: generationJob.contentHash,
    candidateBundleContentHash: hashCanonical(candidateBundle),
    importRecordContentHash: committedImportRecord.contentHash,
    importValidationContentHash: importValidation.contentHash,
    preparationReportContentHash: preparationReport.contentHash,
    contactSheetContentHash: contactSheet.contentHash,
    selectedReviewContentHash: selectedReview.contentHash,
    approvedReviewContentHash: approvedReview.contentHash,
    selectedRigManifestContentHash: rig.manifest.contentHash,
    selectedRigValidationContentHash: rig.validation.contentHash,
    selectedRigDiagnosticContentHash: rig.diagnostic.contentHash,
    approvedAssetVersion,
    approvedProductionBundleContentHash: approvedBundle.contentHash,
    approvedVoiceTrackContentHash: approvedBundle.voiceTrack?.contentHash,
    approvedMusicTrackContentHash: approvedBundle.musicTrack?.contentHash,
    approvedSoundEffectContentHashes: approvedBundle.soundEffectAssets?.map((asset) => asset.contentHash),
    frameComparisons,
    decodedFrameHashesMatch: true,
    workflowOperations: ["finalize source production", "finalize manual generation job", "stage manifest-bound candidate bytes", "commit exact import evidence", "Sharp normalize and contact sheet", "render selected-rig diagnostic", "persist selected review", "promote immutable approved asset", "persist approved review", "bind approved WAV voice master", "bind approved WAV music master", "bind approved WAV sound effect", "place shot-relative SFX cue", "freeze reviewed audio mix", "compile profile-specific mouth cues", "build next production revision", "render exact saved revision twice", "compare decoded frames"],
    evidenceFiles,
    note: "The artwork is intentionally crude engineering fixture art, not the visual-quality target. This report proves workflow integrity and deterministic playback through the same concrete operations used by the desktop application.",
  };
  await writeFile(resolve(proofRoot, "proof-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.info(JSON.stringify(report, null, 2));
}

await main();
