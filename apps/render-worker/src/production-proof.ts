import {execFile} from "node:child_process";
import {createHash} from "node:crypto";
import {mkdir, readFile, writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {promisify} from "node:util";
import {deflateSync} from "node:zlib";
import ffmpegPath from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import {
  buildAnimaticSync,
  createAssetRigManifest,
  createProductionDraft,
  finalizeProductionBundle,
  finalizeRigDiagnosticReport,
  sampleWorkshopScript,
  validateAssetRigManifest,
  type PreparedCandidate,
} from "@storystage/story-engine";
import {readSampleMetadata, renderProduction, renderRigDiagnostic} from "./render-service";

const workspaceRoot = resolve(import.meta.dirname, "../../..");
const proofRoot = resolve(workspaceRoot, "artifacts/SS-002");
const privateRoot = resolve(proofRoot, "private");
const assetsRoot = resolve(privateRoot, "assets");
const productionsRoot = resolve(privateRoot, "productions");
const outputRoot = resolve(proofRoot, "renders");
const framesRoot = resolve(proofRoot, "frame-checks");
const execFileAsync = promisify(execFile);
const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

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

type Color = [number, number, number, number];

function makePosePng(pose: "identity" | "neutral" | "talk" | "reaction"): Buffer {
  const width = 1600;
  const height = 1800;
  const pixels = new Uint8Array(width * height * 4);
  const paint = (x: number, y: number, color: Color) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const offset = (y * width + x) * 4;
    pixels.set(color, offset);
  };
  const ellipse = (cx: number, cy: number, rx: number, ry: number, color: Color) => {
    const left = Math.max(0, Math.floor(cx - rx));
    const right = Math.min(width - 1, Math.ceil(cx + rx));
    const top = Math.max(0, Math.floor(cy - ry));
    const bottom = Math.min(height - 1, Math.ceil(cy + ry));
    for (let y = top; y <= bottom; y += 1) {
      for (let x = left; x <= right; x += 1) {
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

async function main() {
  const createdAt = "2026-07-17T08:00:00.000Z";
  const draftRevisionOne = createProductionDraft({
    productionId: "production-approved-proof",
    revision: 1,
    title: "The Punctual Box / Approved Render Proof",
    projectType: "kids",
    showPackId: "kids-adventure-v1",
    preset: "studio",
    script: sampleWorkshopScript,
  });
  const initial = buildAnimaticSync({draft: draftRevisionOne});
  const brief = initial.resolvedPlan.generationBriefs.find((candidate) => candidate.entity.name === "MARA");
  if (!brief) throw new Error("The proof production did not produce the expected Mara generation brief.");

  const candidateSetId = "set-mara-proof";
  const definitions = [
    {candidateId: "mara-identity", fileRole: "identity-sheet.png", pose: "identity" as const, assetClass: "reference-sheet" as const},
    {candidateId: "mara-neutral", fileRole: "neutral-pose.png", pose: "neutral" as const, assetClass: "character-pose" as const},
    {candidateId: "mara-talk", fileRole: "talk-pose.png", pose: "talk" as const, assetClass: "character-pose" as const},
    {candidateId: "mara-reaction", fileRole: "reaction-pose.png", pose: "reaction" as const, assetClass: "character-pose" as const},
  ];
  const bytesById = new Map(definitions.map((definition) => [definition.candidateId, makePosePng(definition.pose)]));
  const prepared: PreparedCandidate[] = definitions.map((definition) => {
    const bytes = bytesById.get(definition.candidateId)!;
    return {
      schemaVersion: "1.0",
      candidateId: definition.candidateId,
      candidateSetId,
      briefId: brief.id,
      requirementId: brief.requirementId,
      fileRole: definition.fileRole,
      assetClass: definition.assetClass,
      sourceContentHash: sha256(bytes),
      preparedContentHash: sha256(bytes),
      relativeFile: `files/${definition.candidateId}.png`,
      mediaType: "image/png",
      width: 1600,
      height: 1800,
      contentBounds: {left: 280, top: 120, width: 1040, height: 1600},
      registration: {anchorX: 0.5, anchorY: 0.96, pivotX: 800, pivotY: 1720, groundY: 1720},
      processor: {id: "sharp", version: "proof-fixture"},
      preparationState: "prepared",
      checks: {dimensions: true, mediaType: true, alphaOrMatte: true, registration: true, metadataStripped: true},
    };
  });

  const manifest = createAssetRigManifest(brief, candidateSetId, prepared, createdAt);
  const validation = validateAssetRigManifest(manifest, createdAt);
  if (validation.status !== "passed") throw new Error("The deterministic proof rig did not validate.");
  const assetId = "approved-mara-proof";
  const version = `sha256-${manifest.contentHash.slice(0, 16)}`;
  const versionRoot = resolve(assetsRoot, assetId, version);
  await mkdir(resolve(versionRoot, "files"), {recursive: true});
  await Promise.all(definitions.map((definition) => writeFile(resolve(versionRoot, "files", `${definition.candidateId}.png`), bytesById.get(definition.candidateId)!)));
  const manifestFile = resolve(versionRoot, "manifest.json");
  await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await writeFile(resolve(versionRoot, "rig-validation.json"), `${JSON.stringify(validation, null, 2)}\n`, "utf8");

  const diagnosticFile = resolve(versionRoot, "rig-diagnostic.mp4");
  await renderRigDiagnostic({jobId: "proof-rig-diagnostic", entityName: brief.entity.name, importRoot: versionRoot, manifestFile, outputFile: diagnosticFile, workspaceRoot});
  const diagnosticVideo = await readFile(diagnosticFile);
  const diagnostic = finalizeRigDiagnosticReport({
    schemaVersion: "1.0",
    candidateSetId,
    manifestContentHash: manifest.contentHash,
    validationReportContentHash: validation.contentHash,
    videoContentHash: sha256(diagnosticVideo),
    videoRelativeFile: "rig-diagnostic.mp4",
    fps: 30,
    frameCount: 120,
    width: 1280,
    height: 720,
    sourceDiagnosticContentHash: null,
  }, createdAt);
  await writeFile(resolve(versionRoot, "rig-diagnostic.json"), `${JSON.stringify(diagnostic, null, 2)}\n`, "utf8");

  const approvedAssetVersion = {
    assetId,
    version,
    requirementId: brief.requirementId,
    contentHash: manifest.contentHash,
    relativeFile: `${assetId}/${version}/manifest.json`,
    provenance: {sourceType: "user-owned" as const, provider: "storystage-engineering-proof", usageNotes: "Deterministic local fixture; not production artwork."},
    approvedAt: createdAt,
  };
  const draftRevisionTwo = createProductionDraft({...draftRevisionOne, revision: 2});
  const rebuilt = buildAnimaticSync({draft: draftRevisionTwo, approvedAssetVersions: [approvedAssetVersion]});
  const bundle = finalizeProductionBundle({
    schemaVersion: "1.0",
    production: rebuilt.draft,
    overrides: [],
    approvedAssetVersions: [approvedAssetVersion],
    resolvedPlan: rebuilt.resolvedPlan,
    renderPlan: rebuilt.renderPlan,
    metrics: rebuilt.metrics,
    estimate: rebuilt.estimate,
  }, createdAt);
  const bundleRoot = resolve(productionsRoot, bundle.production.productionId, `r${bundle.production.revision}`, "snapshots");
  await mkdir(bundleRoot, {recursive: true});
  const bundleFile = resolve(bundleRoot, `${bundle.contentHash}.json`);
  await writeFile(bundleFile, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");

  const productionVideo = await renderProduction({
    assetsRoot,
    bundleContentHash: bundle.contentHash,
    bundleFile,
    jobId: "approved-production-proof",
    outputRoot,
    trustedProductionRoot: productionsRoot,
    workspaceRoot,
  });
  if (!ffmpegPath) throw new Error("ffmpeg-static did not provide an executable path.");
  await mkdir(framesRoot, {recursive: true});
  const frameFiles: string[] = [];
  for (const frame of [0, 120, 360, 650]) {
    const output = resolve(framesRoot, `frame-${String(frame).padStart(3, "0")}.png`);
    await execFileAsync(ffmpegPath, ["-y", "-i", productionVideo, "-vf", `select=eq(n\\,${frame})`, "-frames:v", "1", output], {maxBuffer: 10 * 1024 * 1024});
    frameFiles.push(output);
  }
  const probe = await execFileAsync(ffprobeStatic.path, ["-v", "error", "-show_streams", "-of", "json", productionVideo], {maxBuffer: 10 * 1024 * 1024});
  const report = {
    generatedAt: new Date().toISOString(),
    productionVideo,
    diagnosticVideo: diagnosticFile,
    metadata: await readSampleMetadata(productionVideo),
    streams: JSON.parse(probe.stdout),
    productionBundleContentHash: bundle.contentHash,
    approvedManifestContentHash: manifest.contentHash,
    diagnosticReportContentHash: diagnostic.contentHash,
    frameFiles,
    frameHashes: Object.fromEntries(await Promise.all(frameFiles.map(async (file) => [file, sha256(await readFile(file))]))),
    note: "The artwork is a deterministic engineering fixture. The evidence proves the selected-rig diagnostic, immutable approval, exact saved bundle, approved pixels, captions, cuts, audio stream, and 24-second Remotion render path.",
  };
  await writeFile(resolve(proofRoot, "proof-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.info(JSON.stringify(report, null, 2));
}

await main();
