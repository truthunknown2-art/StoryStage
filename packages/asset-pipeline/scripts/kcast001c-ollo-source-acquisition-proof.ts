import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  createCharacterRigAssetRequest,
  createCharacterRigCandidateBundle,
  createKidsBipedRigRequestItems,
  createTurnaroundViewCoverageEvidence,
  characterRigAssetRequestSchema,
  hashCanonical,
  kidsBipedV1TopologyTemplate,
} from "@storystage/story-engine";
import { removeBorderChromaKey } from "../src/chroma-key";
import { stageCharacterRigCandidateBundle } from "../src/character-rig-staging";

const workspaceRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const evidenceRoot = resolve(workspaceRoot, "reports/evidence/KCAST-001");
const sourceRoot = evidenceRoot;
const relativeChroma = "candidates/ollo-turnaround-candidate-b-chroma.png";
const relativeHelperAlpha = "candidates/ollo-turnaround-candidate-b-alpha.png";
const relativeCanonicalAlpha =
  "candidates/ollo-turnaround-candidate-b-alpha-repo.png";
const privateProofRoot = resolve(
  workspaceRoot,
  "tmp/kcast001c-ollo-source-acquisition-proof",
);
const trustedStagingRoot = resolve(privateProofRoot, "trusted");
const stagingRoot = resolve(trustedStagingRoot, "ollo-turnaround-b");
const acquiredAt = "2026-07-19T08:45:00.000Z";

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
    await writeFile(target, bytes, { flag: "wx" });
  }
};

const chromaBytes = await readFile(resolve(sourceRoot, relativeChroma));
const helperAlphaBytes = await readFile(
  resolve(sourceRoot, relativeHelperAlpha),
);
const chromaRemoval = await removeBorderChromaKey(chromaBytes);
await writeExact(
  resolve(sourceRoot, relativeCanonicalAlpha),
  chromaRemoval.bytes,
);
const canonicalAlphaBytes = await readFile(
  resolve(sourceRoot, relativeCanonicalAlpha),
);
if (!canonicalAlphaBytes.equals(chromaRemoval.bytes))
  throw new Error("Committed repo-derived alpha does not reproduce exactly.");
if (canonicalAlphaBytes.equals(helperAlphaBytes))
  throw new Error(
    "The repo-derived and image-helper alpha sources must retain distinct provenance.",
  );

const canonicalMetadata = await sharp(canonicalAlphaBytes, {
  limitInputPixels: 64_000_000,
  animated: false,
}).metadata();
if (
  canonicalMetadata.format !== "png" ||
  canonicalMetadata.width !== 1774 ||
  canonicalMetadata.height !== 887 ||
  canonicalMetadata.channels !== 4
)
  throw new Error(
    "Canonical Ollo alpha did not decode as the expected RGBA PNG.",
  );

const request = createCharacterRigAssetRequest({
  schemaVersion: "1.0",
  requestId: "kcast-001-ollo-rig-request-v1",
  showPack: {
    id: "ollo-and-friends-kids-v1",
    version: "1.0.0",
    contentHash: hashCanonical({
      id: "ollo-and-friends-kids-v1",
      identityLock:
        "0950d7043347528a302de5d70f36736dcfbec1f9e0177296756e91b96fbc846f",
      environmentDirection: "layered-paper-cutout-v1",
    }),
  },
  character: { id: "ollo", displayName: "Ollo" },
  identityLock: {
    assetId: "ollo-friends-identity-board-v1",
    contentHash:
      "0950d7043347528a302de5d70f36736dcfbec1f9e0177296756e91b96fbc846f",
  },
  rigProfile: {
    id: "kids-biped-v1",
    version: "1.0.0",
    templateContentHash: kidsBipedV1TopologyTemplate.contentHash,
  },
  acquisition: {
    mode: "manual-file-import",
    providerNeutral: true,
    acceptedMediaTypes: ["image/png"],
    credentialsRequired: false,
    accountSessionRequired: false,
  },
  controlledMatte: "#ff00ff",
  items: createKidsBipedRigRequestItems(),
  prohibitions: [
    "Do not redesign Ollo or substitute a generic woodland character.",
    "Do not combine upper and lower limbs into a whole-limb piece.",
    "Do not translate a front-facing rig sideways as profile locomotion.",
  ],
  approvalRequired: true,
});
const persistedRequest = characterRigAssetRequestSchema.parse(
  JSON.parse(
    await readFile(resolve(evidenceRoot, "ollo-rig-request-v1.json"), "utf8"),
  ) as unknown,
);
if (persistedRequest.contentHash !== request.contentHash)
  throw new Error(
    "Persisted Ollo request does not match the acquisition proof.",
  );

const cropPlans = [
  {
    view: "front" as const,
    semanticDirection: "neutral-front" as const,
    rect: { x: 96, y: 16, width: 528, height: 832 },
  },
  {
    view: "profile-left" as const,
    semanticDirection: "faces-screen-left" as const,
    rect: { x: 680, y: 16, width: 448, height: 832 },
  },
  {
    view: "profile-right" as const,
    semanticDirection: "faces-screen-right" as const,
    rect: { x: 1150, y: 16, width: 448, height: 832 },
  },
];
const coverageViews: Parameters<
  typeof createTurnaroundViewCoverageEvidence
>[0]["views"] = [];
for (const plan of cropPlans) {
  const derived = await sharp(canonicalAlphaBytes, {
    limitInputPixels: 64_000_000,
    animated: false,
  })
    .extract({
      left: plan.rect.x,
      top: plan.rect.y,
      width: plan.rect.width,
      height: plan.rect.height,
    })
    .ensureAlpha()
    .png({
      compressionLevel: 9,
      adaptiveFiltering: false,
      palette: false,
      effort: 10,
    })
    .toBuffer();
  coverageViews.push({
    view: plan.view,
    sourceContentHash: sha256(canonicalAlphaBytes),
    sourceRect: plan.rect,
    derivedContentHash: sha256(derived),
    byteLength: derived.length,
    width: plan.rect.width,
    height: plan.rect.height,
    semanticDirection: plan.semanticDirection,
    transform: "none" as const,
  });
}
const coverageEvidence = createTurnaroundViewCoverageEvidence({
  schemaVersion: "1.0",
  requestId: request.requestId,
  requestContentHash: request.contentHash,
  requestItemId: "turnaround-sheet",
  candidateId: "ollo-turnaround-candidate-b-alpha-repo",
  candidateContentHash: sha256(canonicalAlphaBytes),
  requiredViews: [
    "front",
    "three-quarter",
    "profile-left",
    "profile-right",
    "rear",
  ],
  views: coverageViews,
});
const coverageRelativeFile =
  "ollo-turnaround-coverage-evidence-b-v1.json";
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
    createdAt: "2026-07-19T08:30:00.000Z",
    rightsStatement:
      "Original generated candidate created from the user-supplied Ollo identity and environment boards for this project; unapproved source art.",
  },
  assets: [
    {
      candidateId: "ollo-turnaround-candidate-b-alpha-repo",
      requestItemId: "turnaround-sheet",
      relativeFile: relativeCanonicalAlpha,
      contentHash: sha256(canonicalAlphaBytes),
      byteLength: canonicalAlphaBytes.length,
      mediaType: "image/png",
      width: canonicalMetadata.width,
      height: canonicalMetadata.height,
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
  sourceRoot,
  trustedStagingRoot,
  stagingRoot,
  stagedAt: acquiredAt,
});
if (
  report.status !== "incomplete" ||
  report.returnedItems.length !== 0 ||
  report.partialItems.join(",") !== "turnaround-sheet" ||
  report.missingItems.length !== 6 ||
  report.missingSubitems.map((item) => item.view).join(",") !==
    "three-quarter,rear" ||
  report.assets[0]?.alphaClass !== "mixed-alpha"
)
  throw new Error(
    "Ollo turnaround source did not remain an incomplete alpha intake.",
  );

const staged = report.assets[0]!;
const reopenedStagedBytes = await readFile(
  resolve(stagingRoot, ...staged.relativeFile.split("/")),
);
if (
  reopenedStagedBytes.length !== staged.byteLength ||
  sha256(reopenedStagedBytes) !== staged.stagedContentHash ||
  !reopenedStagedBytes.equals(canonicalAlphaBytes)
)
  throw new Error(
    "Reopened staged turnaround bytes do not match their lineage.",
  );

const derivedRoot = resolve(evidenceRoot, "derived");
await mkdir(derivedRoot, { recursive: true });
const views = [];
for (const plan of cropPlans) {
  const { rect } = plan;
  if (
    rect.x < 0 ||
    rect.y < 0 ||
    rect.x + rect.width > staged.width ||
    rect.y + rect.height > staged.height
  )
    throw new Error(`Ollo ${plan.view} review crop escapes its source.`);
  const cropBytes = await sharp(reopenedStagedBytes, {
    limitInputPixels: 64_000_000,
    animated: false,
  })
    .extract({
      left: rect.x,
      top: rect.y,
      width: rect.width,
      height: rect.height,
    })
    .ensureAlpha()
    .png({
      compressionLevel: 9,
      adaptiveFiltering: false,
      palette: false,
      effort: 10,
    })
    .toBuffer();
  const decoded = await sharp(cropBytes)
    .raw()
    .toBuffer({ resolveWithObject: true });
  let minimumX = rect.width;
  let minimumY = rect.height;
  let maximumX = -1;
  let maximumY = -1;
  let foregroundPixels = 0;
  let boundaryTouch = false;
  for (let y = 0; y < rect.height; y += 1)
    for (let x = 0; x < rect.width; x += 1) {
      const alpha = decoded.data[(y * rect.width + x) * 4 + 3]!;
      if (alpha === 0) continue;
      foregroundPixels += 1;
      minimumX = Math.min(minimumX, x);
      minimumY = Math.min(minimumY, y);
      maximumX = Math.max(maximumX, x);
      maximumY = Math.max(maximumY, y);
      if (x === 0 || y === 0 || x === rect.width - 1 || y === rect.height - 1)
        boundaryTouch = true;
    }
  if (!foregroundPixels || boundaryTouch)
    throw new Error(`Ollo ${plan.view} review crop is empty or clipped.`);
  const outputRelativeFile = `derived/ollo-turnaround-candidate-b-${plan.view}.png`;
  await writeExact(resolve(evidenceRoot, outputRelativeFile), cropBytes);
  views.push({
    view: plan.view,
    semanticDirection:
      plan.view === "front"
        ? "neutral-front"
        : plan.view === "profile-left"
          ? "nose-and-gaze-face-screen-left"
          : "nose-and-gaze-face-screen-right",
    sourceContentHash: staged.stagedContentHash,
    crop: rect,
    output: {
      relativeFile: outputRelativeFile,
      contentHash: sha256(cropBytes),
      byteLength: cropBytes.length,
      mediaType: "image/png" as const,
      width: rect.width,
      height: rect.height,
      alphaClass: "mixed-alpha" as const,
      contentBounds: {
        x: minimumX,
        y: minimumY,
        width: maximumX - minimumX + 1,
        height: maximumY - minimumY + 1,
      },
      foregroundPixels,
      boundaryTouch: false as const,
    },
    role: "identity-and-registration-review-only" as const,
  });
}

const evidenceDraft = {
  schemaVersion: "1.0" as const,
  evidenceId: "kcast-001c-ollo-turnaround-source-b",
  requestId: request.requestId,
  requestContentHash: request.contentHash,
  candidateBundleContentHash: bundle.contentHash,
  stagingReportContentHash: report.contentHash,
  references: {
    identityAuthority: {
      sourceReference:
        "1-Photo-1.jpg from the user-supplied Ollo & Friends identity board",
      contentHash:
        "0950d7043347528a302de5d70f36736dcfbec1f9e0177296756e91b96fbc846f",
      byteLength: 126956,
      mediaType: "image/jpeg" as const,
      width: 1280,
      height: 960,
      role: "character-identity-authority" as const,
    },
    materialDirectionOnly: {
      sourceReference:
        "e44ea5c3-4cb0-4f13-803a-d2a38b2e5162.png Ollo art-direction board",
      contentHash:
        "d8fb05e2eeb63b2d8a1397f4aa43a5c4ad28d3cac333ce5b48f0a9bb7b41c30d",
      byteLength: 2940395,
      mediaType: "image/png" as const,
      width: 1536,
      height: 1024,
      role: "material-and-texture-direction-only" as const,
      identityAuthority: false as const,
    },
  },
  source: {
    chroma: {
      relativeFile: relativeChroma,
      contentHash: sha256(chromaBytes),
      byteLength: chromaBytes.length,
      mediaType: "image/png" as const,
      width: 1774,
      height: 887,
      role: "generated-source-plate" as const,
    },
    imageHelperAlpha: {
      relativeFile: relativeHelperAlpha,
      contentHash: sha256(helperAlphaBytes),
      byteLength: helperAlphaBytes.length,
      mediaType: "image/png" as const,
      width: 1774,
      height: 887,
      role: "untrusted-visual-companion-only" as const,
      productionAuthority: false as const,
    },
    canonicalRepoAlpha: {
      relativeFile: relativeCanonicalAlpha,
      contentHash: sha256(canonicalAlphaBytes),
      byteLength: canonicalAlphaBytes.length,
      mediaType: "image/png" as const,
      width: 1774,
      height: 887,
      stagedRelativeFile: staged.relativeFile,
      immutableLocationId: staged.immutableLocationId,
      derivedFromContentHash: sha256(chromaBytes),
      processor: chromaRemoval.processor,
      measuredKey: chromaRemoval.measuredKey,
      alphaPixels: chromaRemoval.alphaPixels,
      reproducedExactly: true as const,
    },
  },
  cropProcessor: {
    id: "sharp-exact-review-crop",
    version: "1.0.0",
    imageLibrary: { id: "sharp", version: sharp.versions.sharp },
    png: {
      compressionLevel: 9,
      adaptiveFiltering: false,
      palette: false,
      effort: 10,
    },
  },
  views,
  gate: {
    acquiredViewSet: ["front", "profile-left", "profile-right"] as const,
    viewAcquisitionEvidenceComplete: true as const,
    turnaroundInstructionComplete: false as const,
    missingTurnaroundInstructionViews: ["three-quarter", "rear"] as const,
    intakeStatus: report.status,
    returnedItems: report.returnedItems,
    partialItems: report.partialItems,
    missingItems: report.missingItems,
    missingSubitems: report.missingSubitems,
    turnaroundCoverageEvidenceContentHash: coverageEvidence.contentHash,
    turnaroundCoverageEvidenceFileContentHash: sha256(coverageBytes),
    importReceiptCreated: false as const,
    preparedRigViewsCreated: false as const,
    providerAuthority: false as const,
    preparationAuthority: false as const,
    productionBindable: false as const,
    movingDiagnosticRequired: true as const,
    prestonApprovalRequired: true as const,
  },
  acquiredAt,
};
const evidence = {
  ...evidenceDraft,
  contentHash: hashCanonical(evidenceDraft),
};

await Promise.all([
  writeExact(
    resolve(evidenceRoot, "ollo-turnaround-candidate-bundle-b.json"),
    Buffer.from(`${JSON.stringify(bundle, null, 2)}\n`, "utf8"),
  ),
  writeExact(
    resolve(evidenceRoot, "ollo-turnaround-staging-report-b.json"),
    Buffer.from(`${JSON.stringify(report, null, 2)}\n`, "utf8"),
  ),
  writeExact(
    resolve(evidenceRoot, "ollo-turnaround-view-evidence-b.json"),
    Buffer.from(`${JSON.stringify(evidence, null, 2)}\n`, "utf8"),
  ),
]);
await rm(privateProofRoot, { recursive: true, force: true });

process.stdout.write(
  `${JSON.stringify(
    {
      verdict:
        "PASS: one exact Ollo turnaround stages provider-neutrally and yields three deterministic review-only view crops.",
      requestContentHash: request.contentHash,
      bundleContentHash: bundle.contentHash,
      stagingReportContentHash: report.contentHash,
      viewEvidenceContentHash: evidence.contentHash,
      chromaContentHash: sha256(chromaBytes),
      helperAlphaContentHash: sha256(helperAlphaBytes),
      canonicalAlphaContentHash: sha256(canonicalAlphaBytes),
      views: views.map((view) => ({
        view: view.view,
        crop: view.crop,
        contentHash: view.output.contentHash,
      })),
      status: report.status,
      partialItems: report.partialItems,
      missingItems: report.missingItems,
      missingSubitems: report.missingSubitems,
      providerAuthority: false,
      productionBindable: false,
      movingDiagnosticRequired: true,
      approvalRequired: true,
    },
    null,
    2,
  )}\n`,
);
