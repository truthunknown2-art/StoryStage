import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  characterRigAssetRequestSchema,
  createCharacterRigCandidateBundle,
  hashCanonical,
} from "@storystage/story-engine";
import { composeKidsBipedV1FrontAtlases } from "../src/fixed-grid-front-atlas";
import type { FrontAtlasSourceInput } from "../src/fixed-grid-front-atlas";
import { stageCharacterRigCandidateBundle } from "../src/character-rig-staging";

const workspaceRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const evidenceRoot = resolve(workspaceRoot, "reports/evidence/KCAST-001");
const privateProofRoot = resolve(
  workspaceRoot,
  "tmp/kcast001d-ollo-front-atlas-composition-proof",
);
const trustedStagingRoot = resolve(privateProofRoot, "trusted");
const stagingRoot = resolve(trustedStagingRoot, "ollo-front-source-set-d");
const stagedAt = "2026-07-19T10:30:00.000Z";

const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

const source = async (
  relativeFile: string,
  contentHash: string,
  width: number,
  height: number,
): Promise<FrontAtlasSourceInput> => {
  const bytes = await readFile(resolve(evidenceRoot, relativeFile));
  if (sha256(bytes) !== contentHash)
    throw new Error(
      `Candidate front-atlas source bytes changed: ${relativeFile}.`,
    );
  return {
    bytes,
    expectedContentHash: contentHash,
    expectedDimensions: { width, height },
  };
};

const input = {
  core: await source(
    "candidates/ollo-parts-front-core-candidate-d-chroma.png",
    "8678f1b4813bb02ff7d6eb2a3885dac7d5677cebd4555a9b3e1a31862793219d",
    1536,
    1024,
  ),
  limbs: await source(
    "candidates/ollo-parts-front-limbs-candidate-e-chroma.png",
    "1f1a6dca2775de25bd402ea250461dc824c157201f55c814053138383a187b21",
    1672,
    941,
  ),
  eyes: await source(
    "candidates/ollo-face-front-eyes-candidate-c-chroma.png",
    "65c568d88c21e7c89f7d8cd9863e8da6119e568b1c06242389bca1c33ddcb875",
    1774,
    887,
  ),
  mouths: await source(
    "candidates/ollo-face-front-mouth-overlays-candidate-f-chroma.png",
    "2fe8b26f892cf951e74a5a6c9ee75738efedef57481d2994828460b97d365437",
    1448,
    1086,
  ),
};

input.limbs.maximumMeasuredKeyDistance = 32;
input.eyes.sourceRects = [
  { x: 41, y: 125, width: 227, height: 251 },
  { x: 295, y: 137, width: 201, height: 234 },
  { x: 525, y: 177, width: 289, height: 148 },
  { x: 825, y: 197, width: 266, height: 153 },
  { x: 1125, y: 264, width: 208, height: 79 },
  { x: 1362, y: 228, width: 185, height: 112 },
  { x: 1574, y: 195, width: 179, height: 152 },
  { x: 39, y: 511, width: 225, height: 253 },
  { x: 290, y: 523, width: 201, height: 235 },
  { x: 520, y: 549, width: 289, height: 156 },
  { x: 825, y: 568, width: 267, height: 161 },
  { x: 1125, y: 640, width: 208, height: 78 },
  { x: 1359, y: 599, width: 185, height: 110 },
  { x: 1563, y: 579, width: 166, height: 143 },
];
const lowerFaceBase = await source(
  "candidates/ollo-face-front-lower-base-candidate-f-chroma.png",
  "b20a8c344b74dcd9ee3e4b6c0ca93f305cb0e6e9f1bb75a170b8d13a53c0437c",
  1448,
  1086,
);
const compositionInput = {
  ...input,
  lowerFace: {
    base: lowerFaceBase,
    baseSourceRect: { x: 340, y: 290, width: 768, height: 480 },
    pivot: { x: 384, y: 120 },
    noseAnchor: { x: 384, y: 120 },
    mouthChangeBounds: { x: 220, y: 200, width: 328, height: 180 },
  },
};

const first = await composeKidsBipedV1FrontAtlases(compositionInput);
const retry = await composeKidsBipedV1FrontAtlases(compositionInput);
if (
  first.atlases.partsFront.contentHash !==
    retry.atlases.partsFront.contentHash ||
  first.atlases.faceFront.contentHash !== retry.atlases.faceFront.contentHash ||
  !first.atlases.partsFront.bytes.equals(retry.atlases.partsFront.bytes) ||
  !first.atlases.faceFront.bytes.equals(retry.atlases.faceFront.bytes)
)
  throw new Error(
    "Candidate front-atlas composition did not reproduce byte-identically.",
  );

const writeExact = async (target: string, bytes: Buffer) => {
  try {
    const existing = await readFile(target);
    if (!existing.equals(bytes))
      throw new Error(
        `Evidence output collides with different bytes: ${target}`,
      );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    await writeFile(target, bytes, { flag: "wx" });
  }
};

const partsRelativeFile = "derived/ollo-parts-front-source-set-f-alpha.png";
const faceRelativeFile = "derived/ollo-face-front-source-set-f-alpha.png";
const diagnosticRelativeFile =
  "derived/ollo-lower-face-source-candidate-diagnostic-f.png";
await mkdir(resolve(evidenceRoot, "derived"), { recursive: true });
await Promise.all([
  writeExact(
    resolve(evidenceRoot, partsRelativeFile),
    first.atlases.partsFront.bytes,
  ),
  writeExact(
    resolve(evidenceRoot, faceRelativeFile),
    first.atlases.faceFront.bytes,
  ),
  writeExact(
    resolve(evidenceRoot, diagnosticRelativeFile),
    first.lowerFacePatches.diagnostic.bytes,
  ),
]);
const reopenedParts = await readFile(resolve(evidenceRoot, partsRelativeFile));
const reopenedFace = await readFile(resolve(evidenceRoot, faceRelativeFile));
const reopenedDiagnostic = await readFile(
  resolve(evidenceRoot, diagnosticRelativeFile),
);
if (
  !reopenedParts.equals(first.atlases.partsFront.bytes) ||
  !reopenedFace.equals(first.atlases.faceFront.bytes) ||
  !reopenedDiagnostic.equals(first.lowerFacePatches.diagnostic.bytes)
)
  throw new Error(
    "Reopened candidate front-atlas bytes changed after publication.",
  );

const request = characterRigAssetRequestSchema.parse(
  JSON.parse(
    await readFile(resolve(evidenceRoot, "ollo-rig-request-v1.json"), "utf8"),
  ) as unknown,
);
const turnaroundRelativeFile =
  "candidates/ollo-turnaround-candidate-b-alpha-repo.png";
const turnaroundBytes = await readFile(
  resolve(evidenceRoot, turnaroundRelativeFile),
);
const turnaroundHash =
  "38d0321cfcb1daaf564b676c19fe65d2a3c0172ac1b378fe4a4b13076de9b0ec";
if (sha256(turnaroundBytes) !== turnaroundHash)
  throw new Error("Accepted Ollo turnaround source bytes changed.");

const bundle = createCharacterRigCandidateBundle({
  schemaVersion: "1.0",
  acquisitionMode: "manual-file-import",
  requestId: request.requestId,
  requestContentHash: request.contentHash,
  provenance: {
    sourceType: "generated",
    providerLabel:
      "OpenAI built-in image generation plus deterministic repo composition",
    sourceReference:
      "Codex task 019f6dc3-6859-79d1-960a-fc69c9e275d9 / KCAST-001D",
    createdAt: "2026-07-19T10:00:00.000Z",
    rightsStatement:
      "Original generated candidates created for this project and composed by deterministic repository code; unapproved source art.",
  },
  assets: [
    {
      candidateId: "ollo-turnaround-candidate-b-alpha-repo",
      requestItemId: "turnaround-sheet",
      relativeFile: turnaroundRelativeFile,
      contentHash: turnaroundHash,
      byteLength: turnaroundBytes.length,
      mediaType: "image/png",
      width: 1774,
      height: 887,
    },
    {
      candidateId: "ollo-parts-front-source-set-f-alpha",
      requestItemId: "parts-front",
      relativeFile: partsRelativeFile,
      contentHash: first.atlases.partsFront.contentHash,
      byteLength: first.atlases.partsFront.byteLength,
      mediaType: "image/png",
      width: first.atlases.partsFront.width,
      height: first.atlases.partsFront.height,
    },
    {
      candidateId: "ollo-face-front-source-set-f-alpha",
      requestItemId: "face-front",
      relativeFile: faceRelativeFile,
      contentHash: first.atlases.faceFront.contentHash,
      byteLength: first.atlases.faceFront.byteLength,
      mediaType: "image/png",
      width: first.atlases.faceFront.width,
      height: first.atlases.faceFront.height,
    },
  ],
});

await rm(privateProofRoot, { recursive: true, force: true });
await mkdir(trustedStagingRoot, { recursive: true });
const report = await stageCharacterRigCandidateBundle({
  request,
  bundle,
  sourceRoot: evidenceRoot,
  trustedStagingRoot,
  stagingRoot,
  stagedAt,
});
if (
  report.status !== "incomplete" ||
  report.returnedItems.join(",") !==
    "face-front,parts-front,turnaround-sheet" ||
  report.missingItems.join(",") !==
    "face-profile-left,face-profile-right,parts-profile-left,parts-profile-right" ||
  report.assets.some(({ alphaClass }) => alphaClass !== "mixed-alpha")
)
  throw new Error(
    `Candidate front bundle did not remain exact and incomplete: ${JSON.stringify({ status: report.status, returnedItems: report.returnedItems, missingItems: report.missingItems, alphaClasses: report.assets.map(({ alphaClass }) => alphaClass) })}`,
  );
for (const asset of report.assets) {
  const stagedBytes = await readFile(
    resolve(stagingRoot, ...asset.relativeFile.split("/")),
  );
  if (
    stagedBytes.length !== asset.byteLength ||
    sha256(stagedBytes) !== asset.stagedContentHash
  )
    throw new Error(`Reopened staged bytes changed: ${asset.candidateId}.`);
}

const withoutBytes = <T extends { bytes: Buffer }>(value: T) => {
  const { bytes, ...rest } = value;
  void bytes;
  return rest;
};
const evidenceDraft = {
  schemaVersion: "1.0" as const,
  evidenceId: "kcast-001d-ollo-front-atlas-source-set-f",
  requestId: request.requestId,
  requestContentHash: request.contentHash,
  candidateBundleContentHash: bundle.contentHash,
  stagingReportContentHash: report.contentHash,
  processor: first.processor,
  sourceSheets: first.sources,
  atlases: {
    partsFront: {
      relativeFile: partsRelativeFile,
      ...withoutBytes(first.atlases.partsFront),
    },
    faceFront: {
      relativeFile: faceRelativeFile,
      ...withoutBytes(first.atlases.faceFront),
    },
  },
  lowerFacePatches: {
    contract: first.lowerFacePatches.contract,
    base: first.lowerFacePatches.base,
    patches: first.lowerFacePatches.patches,
    diagnostic: {
      relativeFile: diagnosticRelativeFile,
      ...withoutBytes(first.lowerFacePatches.diagnostic),
    },
  },
  gate: {
    ...first.gate,
    bundleStatus: report.status,
    returnedItems: report.returnedItems,
    missingItems: report.missingItems,
    profileKitsMissing: true as const,
    turnaroundInstructionViewsMissing: ["three-quarter", "rear"] as const,
    visualRoleAuditRequired: true as const,
    registrationAuditRequired: true as const,
    movingDiagnosticRequired: true as const,
    frontPreviewClassification: "source-candidate-diagnostic-only" as const,
  },
  stagedAt,
};
const evidence = {
  ...evidenceDraft,
  contentHash: hashCanonical(evidenceDraft),
};
await Promise.all([
  writeExact(
    resolve(evidenceRoot, "ollo-front-candidate-bundle-f.json"),
    Buffer.from(`${JSON.stringify(bundle, null, 2)}\n`, "utf8"),
  ),
  writeExact(
    resolve(evidenceRoot, "ollo-front-staging-report-f.json"),
    Buffer.from(`${JSON.stringify(report, null, 2)}\n`, "utf8"),
  ),
  writeExact(
    resolve(evidenceRoot, "ollo-front-atlas-evidence-f.json"),
    Buffer.from(`${JSON.stringify(evidence, null, 2)}\n`, "utf8"),
  ),
]);
await rm(privateProofRoot, { recursive: true, force: true });

process.stdout.write(
  `${JSON.stringify(
    {
      verdict:
        "PASS: the exact D-core/E-limb/C-eye/F-exclusive-lower-face source set composes byte-deterministic front source atlases and stages only as an incomplete provider-neutral bundle.",
      bundleContentHash: bundle.contentHash,
      stagingReportContentHash: report.contentHash,
      evidenceContentHash: evidence.contentHash,
      partsFront: {
        contentHash: first.atlases.partsFront.contentHash,
        dimensions: `${first.atlases.partsFront.width}x${first.atlases.partsFront.height}`,
        components: first.atlases.partsFront.components.length,
      },
      faceFront: {
        contentHash: first.atlases.faceFront.contentHash,
        dimensions: `${first.atlases.faceFront.width}x${first.atlases.faceFront.height}`,
        components: first.atlases.faceFront.components.length,
      },
      status: report.status,
      missingItems: report.missingItems,
      importReceiptCreated: false,
      preparedManifestCreated: false,
      providerAuthority: false,
      productionBindable: false,
      approvalRequired: true,
    },
    null,
    2,
  )}\n`,
);
