import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  characterRigAssetRequestSchema,
  createCharacterRigCandidateBundle,
  createTurnaroundNormalizationReceipt,
  createTurnaroundViewCoverageEvidence,
  hashCanonical,
  kidsBipedV1RequiredTurnaroundViews,
} from "@storystage/story-engine";
import {
  createVerifiedCharacterRigImportReceipt,
  stageCharacterRigCandidateBundle,
} from "../src/character-rig-staging";
import {
  composeKidsBipedV1TurnaroundSheet,
  type TurnaroundSheetSource,
  type TurnaroundSheetView,
} from "../src/turnaround-sheet-compositor";

const workspaceRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const evidenceRoot = resolve(workspaceRoot, "reports/evidence/KCAST-001");
const privateProofRoot = resolve(
  workspaceRoot,
  "tmp/kcast001f-ollo-turnaround-sheet-proof",
);
const trustedStagingRoot = resolve(privateProofRoot, "trusted");
const stagingRoot = resolve(trustedStagingRoot, "ollo-turnaround-h");
const stagedAt = "2026-07-19T11:45:00.000Z";

const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

const writeExact = async (target: string, bytes: Buffer) => {
  try {
    const existing = await readFile(target);
    if (!existing.equals(bytes))
      throw new Error(
        `Evidence output collides with different bytes: ${target}`,
      );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, bytes, { flag: "wx" });
  }
};

const sourceSpecs = [
  {
    view: "front" as const,
    relativeFile: "candidates/ollo-turnaround-front-candidate-h-chroma.png",
    contentHash:
      "43aa02a2951e46020269390c5ec8494d12719dff5eedd9d46ce10ffdaf26fc12",
    byteLength: 1_246_656,
  },
  {
    view: "three-quarter" as const,
    relativeFile:
      "candidates/ollo-turnaround-three-quarter-candidate-h-chroma.png",
    contentHash:
      "cc5c35b8251e0b9308a5868849a33bcbb9196e0fa606f7189b4d6e6778acb480",
    byteLength: 1_266_087,
  },
  {
    view: "profile-left" as const,
    relativeFile:
      "candidates/ollo-turnaround-profile-left-candidate-h-chroma.png",
    contentHash:
      "9b1064bccf5c223b1e7d0b10085c565d24c085fc12ed5722eedd4966c854f214",
    byteLength: 1_185_220,
  },
  {
    view: "profile-right" as const,
    relativeFile:
      "candidates/ollo-turnaround-profile-right-candidate-h-chroma.png",
    contentHash:
      "a4103e0118c2099913e549f953414e674f798d099ed9c9f99b1555c9c2150905",
    byteLength: 1_192_993,
  },
  {
    view: "rear" as const,
    relativeFile: "candidates/ollo-turnaround-rear-candidate-h-chroma.png",
    contentHash:
      "97e9137ce09215f5a52b2df9ef755d70eda0ddfe024fcf2f7dcea42e60ed3455",
    byteLength: 1_264_099,
  },
] as const;

const sources: TurnaroundSheetSource[] = [];
for (const spec of sourceSpecs) {
  const bytes = await readFile(resolve(evidenceRoot, spec.relativeFile));
  if (bytes.length !== spec.byteLength || sha256(bytes) !== spec.contentHash)
    throw new Error(`Candidate H ${spec.view} source bytes changed.`);
  const metadata = await sharp(bytes).metadata();
  if (
    metadata.format !== "png" ||
    metadata.width !== 1774 ||
    metadata.height !== 887
  )
    throw new Error(`Candidate H ${spec.view} source dimensions changed.`);
  sources.push({
    view: spec.view,
    bytes: Buffer.from(bytes),
    expectedContentHash: spec.contentHash,
    expectedDimensions: { width: 1774, height: 887 },
  });
}

const composition = await composeKidsBipedV1TurnaroundSheet(sources);
const retry = await composeKidsBipedV1TurnaroundSheet(sources);
if (
  !retry.sheet.bytes.equals(composition.sheet.bytes) ||
  retry.sheet.contentHash !== composition.sheet.contentHash
)
  throw new Error("Candidate H turnaround composition is not deterministic.");

const candidateId = "ollo-turnaround-candidate-h-five-view-alpha";
const candidateRelativeFile =
  "candidates/ollo-turnaround-candidate-h-five-view-alpha.png";
await writeExact(
  resolve(evidenceRoot, candidateRelativeFile),
  composition.sheet.bytes,
);
for (const view of composition.sheet.views)
  await writeExact(
    resolve(
      evidenceRoot,
      `derived/ollo-turnaround-candidate-h-${view.view}.png`,
    ),
    view.derivedBytes,
  );

const request = characterRigAssetRequestSchema.parse(
  JSON.parse(
    await readFile(resolve(evidenceRoot, "ollo-rig-request-v1.json"), "utf8"),
  ) as unknown,
);
if (
  request.contentHash !==
  "82844eac0b85b33c7fd1e6cf8654755fc27a17aedeb0e0f2acd5779407cc6310"
)
  throw new Error(
    "Candidate H proof is not bound to the accepted Ollo request.",
  );

const normalizationReceiptFor = (result: typeof composition) =>
  createTurnaroundNormalizationReceipt({
    schemaVersion: "1.0",
    requestId: request.requestId,
    requestContentHash: request.contentHash,
    requestItemId: "turnaround-sheet",
    candidateId,
    candidateContentHash: result.sheet.contentHash,
    views: result.sheet.views.map((view) => ({
      view: view.view,
      sourceContentHash: view.sourceContentHash,
      sourceContentBounds: view.sourceContentBounds,
      normalizedContentHash: view.normalizedContentHash,
      targetCharacterHeight: view.targetCharacterHeight,
      scale: view.scale,
      translateX: view.translateX,
      translateY: view.translateY,
      baselineY: view.baselineY,
      resampler: view.resampler,
      processorVersion: view.processorVersion,
      transform: view.transform,
    })),
    review: {
      identityConsistencyPassed: false,
      semanticViewAuditPassed: false,
      registrationReady: false,
    },
  });
const normalizationReceipt = normalizationReceiptFor(composition);
const normalizationReceiptRetry = normalizationReceiptFor(retry);
if (
  normalizationReceiptRetry.contentHash !== normalizationReceipt.contentHash ||
  JSON.stringify(normalizationReceiptRetry) !==
    JSON.stringify(normalizationReceipt)
)
  throw new Error("Candidate H normalization receipt is not deterministic.");
const normalizationReceiptRelativeFile =
  "ollo-turnaround-normalization-receipt-h-v1.json";
const normalizationReceiptBytes = Buffer.from(
  `${JSON.stringify(normalizationReceipt, null, 2)}\n`,
  "utf8",
);

const semanticDirection = {
  front: "neutral-front",
  "three-quarter": "three-quarter",
  "profile-left": "faces-screen-left",
  "profile-right": "faces-screen-right",
  rear: "neutral-rear",
} as const satisfies Record<TurnaroundSheetView, string>;
const coverageEvidence = createTurnaroundViewCoverageEvidence({
  schemaVersion: "1.0",
  requestId: request.requestId,
  requestContentHash: request.contentHash,
  requestItemId: "turnaround-sheet",
  candidateId,
  candidateContentHash: composition.sheet.contentHash,
  requiredViews: [...kidsBipedV1RequiredTurnaroundViews],
  views: composition.sheet.views.map((view) => ({
    view: view.view,
    sourceContentHash: composition.sheet.contentHash,
    sourceRect: view.sheetSourceRect,
    derivedContentHash: view.derivedContentHash,
    byteLength: view.derivedByteLength,
    width: view.sheetSourceRect.width,
    height: view.sheetSourceRect.height,
    semanticDirection: semanticDirection[view.view],
    transform: "none" as const,
  })),
});
const coverageRelativeFile = "ollo-turnaround-coverage-evidence-h-v1.json";
const coverageBytes = Buffer.from(
  `${JSON.stringify(coverageEvidence, null, 2)}\n`,
  "utf8",
);
await writeExact(resolve(evidenceRoot, coverageRelativeFile), coverageBytes);

const bundle = createCharacterRigCandidateBundle({
  schemaVersion: "1.0",
  acquisitionMode: "manual-file-import",
  requestId: request.requestId,
  requestContentHash: request.contentHash,
  provenance: {
    sourceType: "generated",
    providerLabel: "OpenAI built-in image generation",
    sourceReference: "Codex task 019f6dc3-6859-79d1-960a-fc69c9e275d9",
    createdAt: "2026-07-19T11:10:00.000Z",
    rightsStatement:
      "Original generated Candidate H sources created from the user-supplied Ollo identity and environment boards for this project; unapproved source art.",
  },
  assets: [
    {
      candidateId,
      requestItemId: "turnaround-sheet",
      relativeFile: candidateRelativeFile,
      contentHash: composition.sheet.contentHash,
      byteLength: composition.sheet.byteLength,
      mediaType: "image/png",
      width: composition.sheet.width,
      height: composition.sheet.height,
      turnaroundViewCoverageEvidence: {
        schemaVersion: "1.0",
        relativeFile: coverageRelativeFile,
        contentHash: coverageEvidence.contentHash,
        fileContentHash: sha256(coverageBytes),
        byteLength: coverageBytes.length,
      },
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
const stagedCoverage = report.turnaroundViewCoverageEvidence[0];
if (
  report.status !== "incomplete" ||
  report.returnedItems.join(",") !== "turnaround-sheet" ||
  report.partialItems.length !== 0 ||
  report.missingItems.length !== 6 ||
  report.missingSubitems.length !== 0 ||
  report.unknownItems.length !== 0 ||
  stagedCoverage?.status !== "complete" ||
  stagedCoverage.views.map((view) => view.view).join(",") !==
    kidsBipedV1RequiredTurnaroundViews.join(",")
)
  throw new Error(
    "Candidate H did not stage as a complete turnaround inside an otherwise incomplete rig request.",
  );

let receiptRejectionMessage: string | null = null;
try {
  await createVerifiedCharacterRigImportReceipt({
    request,
    bundle,
    report,
    trustedStagingRoot,
    stagingRoot,
    importId: "kcast-001f-ollo-candidate-h-must-not-import",
    importedAt: "2026-07-19T11:46:00.000Z",
  });
} catch (error) {
  receiptRejectionMessage =
    error instanceof Error ? error.message : String(error);
}
if (
  !receiptRejectionMessage ||
  !/missing request items|exact request-item coverage/i.test(
    receiptRejectionMessage,
  )
)
  throw new Error("Incomplete Candidate H rig unexpectedly created a receipt.");

const serializableViews = composition.sheet.views.map((view) => ({
  view: view.view,
  sourceContentHash: view.sourceContentHash,
  keyedSourceContentHash: view.keyedSourceContentHash,
  sourceContentBounds: view.sourceContentBounds,
  normalizedContentHash: view.normalizedContentHash,
  normalizedByteLength: view.normalizedByteLength,
  normalizedWidth: view.normalizedWidth,
  normalizedHeight: view.normalizedHeight,
  sheetSourceRect: view.sheetSourceRect,
  sheetContentBounds: view.sheetContentBounds,
  derivedContentHash: view.derivedContentHash,
  derivedByteLength: view.derivedByteLength,
  transform: view.transform,
}));
const evidenceDraft = {
  schemaVersion: "1.0" as const,
  evidenceId: "kcast-001f-ollo-turnaround-candidate-h",
  requestId: request.requestId,
  requestContentHash: request.contentHash,
  sources: sourceSpecs.map((spec, index) => ({
    ...spec,
    dimensions: { width: 1774, height: 887 },
    keyedSourceContentHash: composition.sources[index]!.keyedSourceContentHash,
    measuredKey: composition.sources[index]!.measuredKey,
    measuredKeyDistance: composition.sources[index]!.measuredKeyDistance,
    sourceContentBounds: composition.sources[index]!.sourceContentBounds,
  })),
  composition: {
    processor: composition.processor,
    output: {
      candidateId,
      relativeFile: candidateRelativeFile,
      contentHash: composition.sheet.contentHash,
      byteLength: composition.sheet.byteLength,
      width: composition.sheet.width,
      height: composition.sheet.height,
      alphaClass: composition.sheet.alphaClass,
    },
    views: serializableViews,
  },
  lineage: {
    turnaroundNormalizationReceiptContentHash: normalizationReceipt.contentHash,
    turnaroundNormalizationReceiptFileContentHash: sha256(
      normalizationReceiptBytes,
    ),
    turnaroundViewCoverageEvidenceContentHash: coverageEvidence.contentHash,
    turnaroundViewCoverageEvidenceFileContentHash: sha256(coverageBytes),
    candidateBundleContentHash: bundle.contentHash,
    stagingReportContentHash: report.contentHash,
  },
  stage: {
    status: report.status,
    returnedItems: report.returnedItems,
    partialItems: report.partialItems,
    missingItems: report.missingItems,
    missingSubitems: report.missingSubitems,
    turnaroundCoverageStatus: stagedCoverage.status,
  },
  gate: {
    exactFiveViewInventoryComplete: true as const,
    deterministicRegistrationComplete: true as const,
    identityConsistencyPassed: false as const,
    semanticViewAuditPassed: false as const,
    registrationReady: false as const,
    turnaroundItemComplete: true as const,
    completeRigRequest: false as const,
    missingRigKits: report.missingItems,
    importReceiptCreated: false as const,
    importReceiptAttemptRejected: true as const,
    preparedRigViewsCreated: false as const,
    providerAuthority: false as const,
    preparationAuthority: false as const,
    approvalAuthority: false as const,
    productionBindable: false as const,
    approvalRequired: true as const,
  },
  stagedAt,
};
const evidence = {
  ...evidenceDraft,
  contentHash: hashCanonical(evidenceDraft),
};

await Promise.all([
  writeExact(
    resolve(evidenceRoot, normalizationReceiptRelativeFile),
    normalizationReceiptBytes,
  ),
  writeExact(
    resolve(evidenceRoot, "ollo-turnaround-candidate-bundle-h.json"),
    Buffer.from(`${JSON.stringify(bundle, null, 2)}\n`, "utf8"),
  ),
  writeExact(
    resolve(evidenceRoot, "ollo-turnaround-staging-report-h.json"),
    Buffer.from(`${JSON.stringify(report, null, 2)}\n`, "utf8"),
  ),
  writeExact(
    resolve(evidenceRoot, "ollo-turnaround-composition-evidence-h.json"),
    Buffer.from(`${JSON.stringify(evidence, null, 2)}\n`, "utf8"),
  ),
]);
await rm(privateProofRoot, { recursive: true, force: true });

process.stdout.write(
  `${JSON.stringify(
    {
      verdict:
        "PASS: Candidate H deterministically composes and stages as a complete five-view turnaround, while the six absent rig kits keep the request incomplete and non-importable.",
      candidateContentHash: composition.sheet.contentHash,
      normalizationReceiptContentHash: normalizationReceipt.contentHash,
      normalizationReceiptFileContentHash: sha256(normalizationReceiptBytes),
      coverageEvidenceContentHash: coverageEvidence.contentHash,
      coverageEvidenceFileContentHash: sha256(coverageBytes),
      candidateBundleContentHash: bundle.contentHash,
      stagingReportContentHash: report.contentHash,
      evidenceContentHash: evidence.contentHash,
      returnedItems: report.returnedItems,
      missingItems: report.missingItems,
      receiptCreated: false,
      providerAuthority: false,
      preparationAuthority: false,
      productionBindable: false,
    },
    null,
    2,
  )}\n`,
);
