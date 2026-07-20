import { createHash } from "node:crypto";
import {
  lstat,
  mkdir,
  open,
  realpath,
  rename,
  writeFile,
} from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import sharp from "sharp";
import {
  createCandidateRigReviewInput,
  createOlloCandidateISourceReviewPlan,
  type OlloCandidateIReviewRecipeInput,
  type OlloCandidateISourceReviewPlan,
} from "@storystage/asset-pipeline";
import {
  createCandidateRigExactAttachmentMeasurement,
  createCandidateRigGapOrbitMeasurementReport,
  createCandidateRigPrivateRegistrationComponentImages,
  createCandidateRigUnapprovedRegistrationProposal,
} from "@storystage/asset-pipeline/private-candidate-rig-registration";
import { hashCanonical } from "@storystage/story-engine";
import {
  applyCandidateRigRegistrationCorrectionPatchChain,
  candidateRigAllViewStaticGateOneBundleSchema,
  candidateRigExactAttachmentMeasurementReportSchema,
  candidateRigGapOrbitMeasurementReportSchema,
  candidateRigJointDerivationEvidenceSchema,
  candidateRigPrivateRegistrationDiagnosticReceiptSchema,
  candidateRigRegistrationCorrectionPatchSchema,
  candidateRigStaticGateOneDecisionSchema,
  candidateRigUnapprovedRegistrationProposalSchema,
  validateCandidateRigAllViewStaticGateOneBundleBindings,
  validateCandidateRigRegistrationCorrectionPatchChain,
  validateCandidateRigStaticGateOneBindings,
  type CandidateRigAllViewStaticGateOneBundle,
  type CandidateRigPrivateRegistrationDiagnosticReceipt,
  type CandidateRigRegistrationCorrectionPatch,
} from "@storystage/story-engine/private-candidate-rig-registration";
import {
  CANDIDATE_RIG_PRIVATE_REGISTRATION_DIAGNOSTIC_ID,
  candidateRigPrivateRegistrationDiagnosticKinds,
  type CandidateRigPrivateRegistrationDiagnosticProps,
} from "./CandidateRigPrivateRegistrationDiagnostic";

const workspaceRoot = resolve(
  fileURLToPath(new URL("../../..", import.meta.url)),
);
const jobIdPattern = /^[a-z0-9][a-z0-9-]{0,63}$/;
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
const isWithin = (root: string, candidate: string) => {
  const delta = relative(root, candidate);
  return delta === "" || (!delta.startsWith("..") && !isAbsolute(delta));
};

const trustedPrivateRegistrationDiagnostics = new WeakSet<object>();

const deepFreeze = <Value>(value: Value): Value => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>))
      deepFreeze(child);
    Object.freeze(value);
  }
  return value;
};

export const isTrustedCandidateRigPrivateRegistrationDiagnostic = (
  receipt: unknown,
): receipt is CandidateRigPrivateRegistrationDiagnosticReceipt =>
  typeof receipt === "object" &&
  receipt !== null &&
  trustedPrivateRegistrationDiagnostics.has(receipt);

const readRegularFileStable = async (file: string) => {
  const pathInfo = await lstat(file);
  if (pathInfo.isSymbolicLink())
    throw new Error("Private registration input/output cannot be a link.");
  const handle = await open(file, "r");
  try {
    const before = await handle.stat();
    if (!before.isFile() || before.size <= 0 || before.size > 100_000_000)
      throw new Error(
        "Private registration input/output must be a bounded non-empty regular file.",
      );
    const bytes = await handle.readFile();
    const after = await handle.stat();
    if (
      bytes.length !== before.size ||
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      before.size !== after.size ||
      before.mtimeMs !== after.mtimeMs ||
      before.ctimeMs !== after.ctimeMs
    )
      throw new Error(
        "Private registration input/output changed while it was reopened.",
      );
    return { bytes, byteLength: before.size, sha256: sha256(bytes) };
  } finally {
    await handle.close();
  }
};

export const probeCandidateRigPrivateRegistrationDiagnosticPng = async (
  bytes: Buffer,
) => {
  if (!bytes.subarray(0, pngSignature.length).equals(pngSignature))
    throw new Error("Private registration diagnostic artifact is not a PNG.");
  const image = sharp(bytes, {
    failOn: "error",
    limitInputPixels: 1920 * 1080,
  });
  const metadata = await image.metadata();
  if (
    metadata.format !== "png" ||
    (metadata.pages ?? 1) !== 1 ||
    metadata.width !== 1920 ||
    metadata.height !== 1080
  )
    throw new Error(
      "Private registration diagnostic artifact failed its exact 1920x1080 PNG probe.",
    );
  const { data, info } = await image.ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });
  if (
    info.width !== 1920 ||
    info.height !== 1080 ||
    info.channels !== 4 ||
    data.byteLength !== 1920 * 1080 * 4
  )
    throw new Error(
      "Private registration diagnostic artifact did not decode to exact RGBA.",
    );
};

const probePacketEvidencePng = async (bytes: Buffer) => {
  if (!bytes.subarray(0, pngSignature.length).equals(pngSignature))
    throw new Error("Private registration packet evidence is not a PNG.");
  const metadata = await sharp(bytes, {
    failOn: "error",
    limitInputPixels: 64_000_000,
  }).metadata();
  if (
    metadata.format !== "png" ||
    (metadata.pages ?? 1) !== 1 ||
    !metadata.width ||
    !metadata.height
  )
    throw new Error(
      "Private registration packet evidence failed its bounded PNG probe.",
    );
};

const decodePngDataUrl = (dataUrl: string) => {
  const prefix = "data:image/png;base64,";
  if (!dataUrl.startsWith(prefix))
    throw new Error("Private registration packet PNG data URL is invalid.");
  const bytes = Buffer.from(dataUrl.slice(prefix.length), "base64");
  if (bytes.length === 0)
    throw new Error("Private registration packet PNG data URL is empty.");
  return bytes;
};

type PacketEvidenceFile =
  CandidateRigPrivateRegistrationDiagnosticReceipt["packetEvidence"]["files"][number];

const persistPacketEvidenceBytes = async (input: {
  outputRoot: string;
  relativeFile: string;
  bytes: Buffer;
  evidenceKind: PacketEvidenceFile["evidenceKind"];
  componentId?: string | null;
  candidateId?: string | null;
  mediaType: PacketEvidenceFile["mediaType"];
}): Promise<PacketEvidenceFile> => {
  const file = resolve(input.outputRoot, input.relativeFile);
  if (!isWithin(input.outputRoot, file))
    throw new Error("Private registration packet evidence escaped its root.");
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, input.bytes, { flag: "wx", mode: 0o600 });
  const snapshot = await readRegularFileStable(file);
  if (input.mediaType === "image/png")
    await probePacketEvidencePng(snapshot.bytes);
  else JSON.parse(snapshot.bytes.toString("utf8"));
  return {
    evidenceKind: input.evidenceKind,
    componentId: input.componentId ?? null,
    candidateId: input.candidateId ?? null,
    relativeFile: input.relativeFile.replaceAll("\\", "/"),
    sha256: snapshot.sha256,
    byteLength: snapshot.byteLength,
    mediaType: input.mediaType,
  };
};

const persistPacketJson = (input: {
  outputRoot: string;
  relativeFile: string;
  value: unknown;
  evidenceKind: PacketEvidenceFile["evidenceKind"];
  componentId?: string | null;
  candidateId?: string | null;
}) =>
  persistPacketEvidenceBytes({
    ...input,
    bytes: Buffer.from(`${JSON.stringify(input.value, null, 2)}\n`, "utf8"),
    mediaType: "application/json",
  });

const boundBehavioralSourceSpecs = [
  {
    role: "gap-orbit-measurement" as const,
    workspaceRelativeFile:
      "packages/asset-pipeline/src/candidate-rig-gap-orbit-measurement.ts",
  },
  {
    role: "orchestrator" as const,
    workspaceRelativeFile:
      "apps/render-worker/src/candidate-rig-private-registration-diagnostic.ts",
  },
  {
    role: "entry-point" as const,
    workspaceRelativeFile:
      "apps/render-worker/src/candidate-rig-private-registration-remotion-entry.tsx",
  },
  {
    role: "composition" as const,
    workspaceRelativeFile:
      "apps/render-worker/src/CandidateRigPrivateRegistrationDiagnostic.tsx",
  },
  {
    role: "exact-measurement" as const,
    workspaceRelativeFile:
      "packages/asset-pipeline/src/candidate-rig-exact-attachment-measurement.ts",
  },
  {
    role: "mask-derivation" as const,
    workspaceRelativeFile:
      "packages/asset-pipeline/src/candidate-rig-private-registration-images.ts",
  },
  {
    role: "proposal-compiler" as const,
    workspaceRelativeFile:
      "packages/asset-pipeline/src/candidate-rig-unapproved-registration-proposal.ts",
  },
  {
    role: "review-input" as const,
    workspaceRelativeFile:
      "packages/asset-pipeline/src/candidate-rig-review-input.ts",
  },
  {
    role: "review-raster" as const,
    workspaceRelativeFile:
      "packages/asset-pipeline/src/candidate-rig-review-raster.ts",
  },
  {
    role: "review-recipes" as const,
    workspaceRelativeFile:
      "packages/asset-pipeline/src/ollo-candidate-i-review-recipes.ts",
  },
  {
    role: "registration-guides" as const,
    workspaceRelativeFile:
      "packages/asset-pipeline/src/ollo-candidate-i-registration-guides.ts",
  },
  {
    role: "registration-contract" as const,
    workspaceRelativeFile:
      "packages/story-engine/src/candidate-rig-private-registration-contract.ts",
  },
  {
    role: "registration-schema" as const,
    workspaceRelativeFile: "packages/story-engine/src/candidate-rig-review.ts",
  },
  {
    role: "preparation-schema" as const,
    workspaceRelativeFile:
      "packages/story-engine/src/character-rig-preparation.ts",
  },
  {
    role: "topology-template" as const,
    workspaceRelativeFile:
      "packages/story-engine/src/character-rig-acquisition.ts",
  },
  {
    role: "canonical-hash" as const,
    workspaceRelativeFile: "packages/story-engine/src/canonical-hash.ts",
  },
] as const;

const readBoundBehavioralSources = async () => {
  const files = await Promise.all(
    boundBehavioralSourceSpecs.map(async (spec) => {
      const snapshot = await readRegularFileStable(
        resolve(workspaceRoot, spec.workspaceRelativeFile),
      );
      return { ...spec, sha256: snapshot.sha256 };
    }),
  );
  return {
    claim: "enumerated-local-behavioral-inputs-not-transitive-closure" as const,
    files,
    contentHash: hashCanonical(files),
  };
};

const outputParent = resolve(
  workspaceRoot,
  "artifacts/KCAST-001/private-registration-diagnostic",
);

const ensureOutputParent = async () => {
  const workspaceInfo = await lstat(workspaceRoot);
  if (workspaceInfo.isSymbolicLink() || !workspaceInfo.isDirectory())
    throw new Error(
      "Private registration diagnostic workspace must be a real directory.",
    );
  const canonicalWorkspace = await realpath(workspaceRoot);
  await mkdir(outputParent, { recursive: true });
  const parentInfo = await lstat(outputParent);
  const canonicalParent = await realpath(outputParent);
  if (
    parentInfo.isSymbolicLink() ||
    !parentInfo.isDirectory() ||
    !isWithin(canonicalWorkspace, canonicalParent)
  )
    throw new Error(
      "Private registration diagnostic output parent escaped the fixed workspace root.",
    );
  return canonicalParent;
};

const reopenPersistedDiagnostic = async (reference: {
  jobId: string;
  receiptContentHash: string;
  verifyCurrentSourceClosure: boolean;
}) => {
  if (!jobIdPattern.test(reference.jobId))
    throw new Error("Private registration diagnostic job id is unsafe.");
  const canonicalParent = await ensureOutputParent();
  const jobRoot = resolve(outputParent, reference.jobId);
  const canonicalRoot = await realpath(jobRoot);
  if (!isWithin(canonicalParent, canonicalRoot))
    throw new Error(
      "Private registration diagnostic job escaped its fixed artifact root.",
    );
  const receiptFile = resolve(
    jobRoot,
    `${reference.receiptContentHash}.private-registration-diagnostic.json`,
  );
  const canonicalReceipt = await realpath(receiptFile);
  if (!isWithin(canonicalRoot, canonicalReceipt))
    throw new Error(
      "Private registration diagnostic receipt escaped its canonical job root.",
    );
  const snapshot = await readRegularFileStable(canonicalReceipt);
  const receipt = candidateRigPrivateRegistrationDiagnosticReceiptSchema.parse(
    JSON.parse(snapshot.bytes.toString("utf8")),
  );
  if (receipt.contentHash !== reference.receiptContentHash)
    throw new Error(
      "Private registration diagnostic receipt content hash was substituted.",
    );
  if (
    reference.verifyCurrentSourceClosure &&
    (await readBoundBehavioralSources()).contentHash !==
      receipt.boundBehavioralSources.contentHash
  )
    throw new Error(
      "Private registration diagnostic renderer source changed before receipt trust finalization.",
    );
  for (const artifact of receipt.artifacts) {
    const artifactFile = resolve(jobRoot, artifact.relativeFile);
    if (!isWithin(jobRoot, artifactFile))
      throw new Error(
        "Private registration diagnostic artifact escaped its receipt root.",
      );
    const canonicalArtifact = await realpath(artifactFile);
    if (!isWithin(canonicalRoot, canonicalArtifact))
      throw new Error(
        "Private registration diagnostic artifact escaped its canonical job root.",
      );
    const artifactSnapshot = await readRegularFileStable(canonicalArtifact);
    if (
      artifactSnapshot.byteLength !== artifact.byteLength ||
      artifactSnapshot.sha256 !== artifact.sha256
    )
      throw new Error(
        "Private registration diagnostic artifact bytes drifted from its receipt.",
      );
    await probeCandidateRigPrivateRegistrationDiagnosticPng(
      artifactSnapshot.bytes,
    );
  }
  const packetJson = new Map<string, unknown>();
  const componentMaskRuns = new Map<string, unknown>();
  const jointSelectedSupports = new Map<string, unknown>();
  const jointEvidenceRecords = new Map<string, unknown>();
  const packetPngBytes = new Map<string, Buffer>();
  for (const evidence of receipt.packetEvidence.files) {
    const evidenceFile = resolve(jobRoot, evidence.relativeFile);
    if (!isWithin(jobRoot, evidenceFile))
      throw new Error(
        "Private registration packet evidence escaped its receipt root.",
      );
    const canonicalEvidence = await realpath(evidenceFile);
    if (!isWithin(canonicalRoot, canonicalEvidence))
      throw new Error(
        "Private registration packet evidence escaped its canonical job root.",
      );
    const snapshot = await readRegularFileStable(canonicalEvidence);
    if (
      snapshot.byteLength !== evidence.byteLength ||
      snapshot.sha256 !== evidence.sha256
    )
      throw new Error(
        "Private registration packet evidence bytes drifted from its receipt.",
      );
    if (evidence.mediaType === "image/png") {
      await probePacketEvidencePng(snapshot.bytes);
      packetPngBytes.set(
        `${evidence.evidenceKind}:${evidence.componentId ?? ""}:${evidence.candidateId ?? ""}`,
        snapshot.bytes,
      );
    } else {
      const parsed = JSON.parse(snapshot.bytes.toString("utf8"));
      packetJson.set(evidence.evidenceKind, parsed);
      if (evidence.evidenceKind === "component-mask-runs")
        componentMaskRuns.set(evidence.componentId!, parsed);
      if (evidence.evidenceKind === "joint-selected-support-runs")
        jointSelectedSupports.set(evidence.candidateId!, parsed);
      if (evidence.evidenceKind === "joint-evidence-record")
        jointEvidenceRecords.set(evidence.candidateId!, parsed);
    }
  }
  const measurement = candidateRigExactAttachmentMeasurementReportSchema.parse(
    packetJson.get("measurement-report"),
  );
  const baseProposal = candidateRigUnapprovedRegistrationProposalSchema.parse(
    packetJson.get("base-proposal"),
  );
  const effectiveProposal =
    candidateRigUnapprovedRegistrationProposalSchema.parse(
      packetJson.get("effective-proposal"),
    );
  const gapOrbit = candidateRigGapOrbitMeasurementReportSchema.parse(
    packetJson.get("gap-orbit-measurements"),
  );
  const rawPatchChain = packetJson.get("correction-patch-chain");
  if (!Array.isArray(rawPatchChain))
    throw new Error(
      "Private registration correction patch chain evidence is not an array.",
    );
  const patchChain = rawPatchChain.map((patch) =>
    candidateRigRegistrationCorrectionPatchSchema.parse(patch),
  );
  const jointEvidenceIds = receipt.packetEvidence.files
    .filter((file) => file.evidenceKind === "joint-original-crop")
    .map((file) => file.candidateId);
  const measuredCandidateIds = measurement.components.flatMap((component) =>
    component.candidates.map((candidate) => candidate.candidateId),
  );
  if (
    measurement.view !== receipt.view ||
    measurement.contentHash !== receipt.measurementReportContentHash ||
    baseProposal.contentHash !== receipt.baseProposalContentHash ||
    effectiveProposal.contentHash !== receipt.effectiveProposalContentHash ||
    gapOrbit.contentHash !==
      receipt.packetEvidence.gapOrbitMeasurementReportContentHash ||
    (patchChain.at(-1)?.contentHash ?? null) !==
      receipt.correctionPatchContentHash ||
    hashCanonical([...jointEvidenceIds].sort()) !==
      hashCanonical([...measuredCandidateIds].sort())
  )
    throw new Error(
      "Private registration packet did not reopen its exact view, reports, proposal revisions, patch chain, numeric gap/orbit report, and per-joint original crops.",
    );
  for (const mask of receipt.maskDerivationEvidence) {
    const byKind = new Map(
      receipt.packetEvidence.files
        .filter((file) => file.componentId === mask.componentId)
        .map((file) => [file.evidenceKind, file]),
    );
    if (
      byKind.get("component-original")?.sha256 !==
        mask.originalPngContentHash ||
      byKind.get("component-masked")?.sha256 !== mask.maskedPngContentHash ||
      byKind.get("component-audit-original")?.sha256 !==
        mask.auditOriginalPngContentHash ||
      byKind.get("component-audit-masked")?.sha256 !==
        mask.auditMaskedPngContentHash ||
      byKind.get("component-audit-evidence")?.sha256 !==
        mask.auditEvidencePngContentHash ||
      hashCanonical(componentMaskRuns.get(mask.componentId)) !==
        mask.maskRunLengthEncodingContentHash
    )
      throw new Error(
        `Private registration component ${mask.componentId} audit bytes drifted from its receipt.`,
      );
  }
  const measuredCandidateById = new Map(
    measurement.components.flatMap((component) =>
      component.candidates.map(
        (candidate) =>
          [candidate.candidateId, { component, candidate }] as const,
      ),
    ),
  );
  if (
    hashCanonical(
      receipt.jointDerivationEvidence.map((joint) => joint.candidateId).sort(),
    ) !== hashCanonical([...measuredCandidateIds].sort())
  )
    throw new Error(
      "Private registration receipt does not contain one derivation record for every measured joint.",
    );
  const decodedComponentOriginals = new Map<
    string,
    { data: Buffer; width: number; height: number }
  >();
  for (const sealedJoint of receipt.jointDerivationEvidence) {
    const measured = measuredCandidateById.get(sealedJoint.candidateId);
    const persistedRecord = candidateRigJointDerivationEvidenceSchema.parse(
      jointEvidenceRecords.get(sealedJoint.candidateId),
    );
    if (
      !measured ||
      hashCanonical(persistedRecord) !== hashCanonical(sealedJoint)
    )
      throw new Error(
        `Private registration joint ${sealedJoint.candidateId} lost its exact persisted evidence record.`,
      );
    const { component, candidate } = measured;
    const selectedSupport = jointSelectedSupports.get(sealedJoint.candidateId);
    const requirementIds = measurement.requirements
      .filter(
        (requirement) =>
          requirement.componentRole === candidate.semanticRole &&
          requirement.featureClass === candidate.featureClass,
      )
      .map((requirement) => requirement.requirementId)
      .sort();
    const proposalReferenceIds = [
      ...effectiveProposal.parts
        .filter((part) =>
          part.childPivot.sourceFeatureIds.includes(candidate.candidateId),
        )
        .map((part) => `part-${part.role}-${part.childPivot.requirementId}`),
      ...effectiveProposal.sockets
        .filter((socket) =>
          socket.position.sourceFeatureIds.includes(candidate.candidateId),
        )
        .map(
          (socket) =>
            `socket-${socket.parentRole}-${socket.socketId}-${socket.position.requirementId}`,
        ),
      ...effectiveProposal.maskOnlySupports
        .filter((support) =>
          support.sourceFeatureIds.includes(candidate.candidateId),
        )
        .map((support) => `mask-${support.componentRole}`),
      ...effectiveProposal.attachmentClassDecisions
        .filter((decision) =>
          decision.sourceFeatureIds.includes(candidate.candidateId),
        )
        .map((decision) => `class-${decision.requirementId}`),
    ].sort();
    const bounds = candidate.selectedSupport.bounds;
    if (!bounds)
      throw new Error(
        `Private registration joint ${candidate.candidateId} has no selected support bounds.`,
      );
    const expectedRegion = {
      x: Math.max(0, bounds.x - 4),
      y: Math.max(0, bounds.y - 4),
      width:
        Math.min(component.sourceRect.width, bounds.x + bounds.width + 4) -
        Math.max(0, bounds.x - 4),
      height:
        Math.min(component.sourceRect.height, bounds.y + bounds.height + 4) -
        Math.max(0, bounds.y - 4),
    };
    if (
      sealedJoint.componentId !== component.componentId ||
      sealedJoint.semanticRole !== component.semanticRole ||
      sealedJoint.sourceRgbaContentHash !== component.sourceRgbaContentHash ||
      sealedJoint.physicalFeatureContentHash !==
        candidate.physicalFeatureContentHash ||
      sealedJoint.candidateMeasurementContentHash !==
        hashCanonical(candidate) ||
      sealedJoint.measurementReportContentHash !== measurement.contentHash ||
      sealedJoint.effectiveProposalContentHash !==
        effectiveProposal.contentHash ||
      hashCanonical(sealedJoint.auditRegion) !==
        hashCanonical(expectedRegion) ||
      sealedJoint.selectedSupportRunLengthEncodingContentHash !==
        candidate.selectedSupport.runLengthEncodingContentHash ||
      sealedJoint.selectedSupportPixelCount !==
        candidate.selectedSupport.pixelCount ||
      hashCanonical(selectedSupport) !==
        hashCanonical(candidate.selectedSupport) ||
      hashCanonical(sealedJoint.requirementIds) !==
        hashCanonical(requirementIds) ||
      hashCanonical(sealedJoint.proposalReferenceIds) !==
        hashCanonical(proposalReferenceIds)
    )
      throw new Error(
        `Private registration joint ${candidate.candidateId} drifted from its exact measurement, support mask, proposal references, or audit region.`,
      );
    const pngKey = (kind: string) =>
      `${kind}:${component.componentId}:${candidate.candidateId}`;
    const originalBytes = packetPngBytes.get(pngKey("joint-original-crop"));
    const maskedBytes = packetPngBytes.get(pngKey("joint-masked-crop"));
    const auditBytes = packetPngBytes.get(pngKey("joint-audit-evidence"));
    const componentOriginalKey = `component-original:${component.componentId}:`;
    const componentOriginalBytes = packetPngBytes.get(componentOriginalKey);
    if (
      !originalBytes ||
      !maskedBytes ||
      !auditBytes ||
      !componentOriginalBytes
    )
      throw new Error(
        `Private registration joint ${candidate.candidateId} is missing persisted image bytes.`,
      );
    let componentOriginal = decodedComponentOriginals.get(
      component.componentId,
    );
    if (!componentOriginal) {
      const decoded = await sharp(componentOriginalBytes)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      componentOriginal = {
        data: decoded.data,
        width: decoded.info.width,
        height: decoded.info.height,
      };
      decodedComponentOriginals.set(component.componentId, componentOriginal);
    }
    const [original, masked, audit] = await Promise.all([
      sharp(originalBytes)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true }),
      sharp(maskedBytes)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true }),
      sharp(auditBytes)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true }),
    ]);
    if (
      componentOriginal.width !==
        component.sourceRect.width + sealedJoint.componentOutputPadding * 2 ||
      componentOriginal.height !==
        component.sourceRect.height + sealedJoint.componentOutputPadding * 2 ||
      [original, masked, audit].some(
        (image) =>
          image.info.width !== expectedRegion.width ||
          image.info.height !== expectedRegion.height ||
          image.info.channels !== 4,
      )
    )
      throw new Error(
        `Private registration joint ${candidate.candidateId} image geometry is invalid.`,
      );
    const selectedPixels = new Set<number>();
    for (const run of candidate.selectedSupport.runs)
      for (let x = run.x; x < run.x + run.length; x += 1)
        selectedPixels.add(run.y * component.sourceRect.width + x);
    for (let y = 0; y < expectedRegion.height; y += 1)
      for (let x = 0; x < expectedRegion.width; x += 1) {
        const sourceX = expectedRegion.x + x;
        const sourceY = expectedRegion.y + y;
        const jointOffset = (y * expectedRegion.width + x) * 4;
        const componentOffset =
          ((sourceY + sealedJoint.componentOutputPadding) *
            componentOriginal.width +
            sourceX +
            sealedJoint.componentOutputPadding) *
          4;
        const selected = selectedPixels.has(
          sourceY * component.sourceRect.width + sourceX,
        );
        for (let channel = 0; channel < 4; channel += 1) {
          if (
            original.data[jointOffset + channel] !==
            componentOriginal.data[componentOffset + channel]
          )
            throw new Error(
              `Private registration joint ${candidate.candidateId} original crop does not derive from its persisted component source.`,
            );
          const expectedMasked = selected
            ? 0
            : original.data[jointOffset + channel];
          const expectedAudit = selected ? [228, 86, 86, 255][channel]! : 0;
          if (
            masked.data[jointOffset + channel] !== expectedMasked ||
            audit.data[jointOffset + channel] !== expectedAudit
          )
            throw new Error(
              `Private registration joint ${candidate.candidateId} masked/audit bytes do not derive from its exact selected support.`,
            );
        }
      }
  }
  const trusted = deepFreeze(receipt);
  trustedPrivateRegistrationDiagnostics.add(trusted);
  return { receipt: trusted, receiptPath: canonicalReceipt };
};

export type RenderCandidateRigPrivateRegistrationDiagnosticOptions = {
  jobId: string;
  view: "front" | "profile-left" | "profile-right";
  trustedStagingRoot: string;
  stagingRoot: string;
  evidence: OlloCandidateIReviewRecipeInput;
  sourceReviewPlan: OlloCandidateISourceReviewPlan;
  correctionPatches?: CandidateRigRegistrationCorrectionPatch[];
  sourceDiagnosticReference?: {
    jobId: string;
    receiptContentHash: string;
  };
  completedAt?: string;
};

export const renderCandidateRigPrivateRegistrationDiagnostic = async (
  options: RenderCandidateRigPrivateRegistrationDiagnosticOptions,
) => {
  if (!jobIdPattern.test(options.jobId))
    throw new Error("Private registration diagnostic job id is unsafe.");
  const expectedPlan = createOlloCandidateISourceReviewPlan(options.evidence);
  if (hashCanonical(options.sourceReviewPlan) !== hashCanonical(expectedPlan))
    throw new Error(
      "Private registration diagnostic source-review plan was substituted after exact compilation.",
    );
  const view = expectedPlan.views.find(
    (candidate) => candidate.view === options.view,
  );
  if (!view)
    throw new Error(
      `Private registration diagnostic view ${options.view} is unavailable.`,
    );
  const correctionPatches = options.correctionPatches ?? [];
  if (
    correctionPatches.length > 0 !==
    (options.sourceDiagnosticReference !== undefined)
  )
    throw new Error(
      "Corrected diagnostics require one exact previously persisted source diagnostic reference.",
    );
  const runtime = await createCandidateRigReviewInput({
    request: options.evidence.request,
    bundle: options.evidence.bundle,
    stagingReport: options.evidence.stagingReport,
    importReceipt: options.evidence.importReceipt,
    recipe: view.recipe,
    reviewProgram: view.program,
    registrationPlan: view.registrationPlan,
    trustedStagingRoot: options.trustedStagingRoot,
    stagingRoot: options.stagingRoot,
  });
  const measurement = await createCandidateRigExactAttachmentMeasurement({
    review: runtime,
    recipe: view.recipe,
  });
  const baseProposal = createCandidateRigUnapprovedRegistrationProposal({
    measurement,
    registrationPlan: view.registrationPlan,
    recipe: view.recipe,
  });
  const { effectiveProposal, patches } =
    applyCandidateRigRegistrationCorrectionPatchChain(
      measurement,
      baseProposal,
      correctionPatches,
    );
  const sourceDiagnostic = options.sourceDiagnosticReference
    ? (
        await reopenPersistedDiagnostic({
          ...options.sourceDiagnosticReference,
          verifyCurrentSourceClosure: false,
        })
      ).receipt
    : null;
  if (
    sourceDiagnostic &&
    patches.some(
      (patch) =>
        patch.sourceDiagnosticReceiptContentHash !==
        sourceDiagnostic.contentHash,
    )
  )
    throw new Error(
      "Correction patch chain does not bind the reopened source diagnostic.",
    );
  const componentImages =
    await createCandidateRigPrivateRegistrationComponentImages({
      review: runtime,
      recipe: view.recipe,
      measurement,
      proposal: effectiveProposal,
    });
  const gapOrbitMeasurement = createCandidateRigGapOrbitMeasurementReport({
    measurement,
    proposal: effectiveProposal,
    recipe: view.recipe,
  });
  const boundBehavioralSources = await readBoundBehavioralSources();
  const canonicalParent = await ensureOutputParent();
  const outputRoot = resolve(outputParent, options.jobId);
  await mkdir(outputRoot);
  const canonicalRoot = await realpath(outputRoot);
  if (!isWithin(canonicalParent, canonicalRoot))
    throw new Error(
      "Private registration diagnostic output escaped its fixed root.",
    );
  const packetEvidenceFiles: PacketEvidenceFile[] = [];
  packetEvidenceFiles.push(
    await persistPacketJson({
      outputRoot,
      relativeFile: "packet/measurement-report.json",
      value: measurement,
      evidenceKind: "measurement-report",
    }),
    await persistPacketJson({
      outputRoot,
      relativeFile: "packet/base-proposal.json",
      value: baseProposal,
      evidenceKind: "base-proposal",
    }),
    await persistPacketJson({
      outputRoot,
      relativeFile: "packet/effective-proposal.json",
      value: effectiveProposal,
      evidenceKind: "effective-proposal",
    }),
    await persistPacketJson({
      outputRoot,
      relativeFile: "packet/correction-patch-chain.json",
      value: patches,
      evidenceKind: "correction-patch-chain",
    }),
    await persistPacketJson({
      outputRoot,
      relativeFile: "packet/gap-orbit-measurements.json",
      value: gapOrbitMeasurement,
      evidenceKind: "gap-orbit-measurements",
    }),
  );
  for (const image of componentImages) {
    const componentRoot = `packet/component-audits/${image.componentId}`;
    packetEvidenceFiles.push(
      await persistPacketEvidenceBytes({
        outputRoot,
        relativeFile: `${componentRoot}/original.png`,
        bytes: decodePngDataUrl(image.originalDataUrl),
        evidenceKind: "component-original",
        componentId: image.componentId,
        mediaType: "image/png",
      }),
      await persistPacketEvidenceBytes({
        outputRoot,
        relativeFile: `${componentRoot}/masked.png`,
        bytes: decodePngDataUrl(image.maskedDataUrl),
        evidenceKind: "component-masked",
        componentId: image.componentId,
        mediaType: "image/png",
      }),
      await persistPacketJson({
        outputRoot,
        relativeFile: `${componentRoot}/mask-runs.json`,
        value: image.maskRuns,
        evidenceKind: "component-mask-runs",
        componentId: image.componentId,
      }),
    );
    if (
      image.maskAuditOriginalDataUrl &&
      image.maskAuditMaskedDataUrl &&
      image.maskAuditEvidenceDataUrl
    )
      packetEvidenceFiles.push(
        await persistPacketEvidenceBytes({
          outputRoot,
          relativeFile: `${componentRoot}/audit-original.png`,
          bytes: decodePngDataUrl(image.maskAuditOriginalDataUrl),
          evidenceKind: "component-audit-original",
          componentId: image.componentId,
          mediaType: "image/png",
        }),
        await persistPacketEvidenceBytes({
          outputRoot,
          relativeFile: `${componentRoot}/audit-masked.png`,
          bytes: decodePngDataUrl(image.maskAuditMaskedDataUrl),
          evidenceKind: "component-audit-masked",
          componentId: image.componentId,
          mediaType: "image/png",
        }),
        await persistPacketEvidenceBytes({
          outputRoot,
          relativeFile: `${componentRoot}/audit-cleared-pixels.png`,
          bytes: decodePngDataUrl(image.maskAuditEvidenceDataUrl),
          evidenceKind: "component-audit-evidence",
          componentId: image.componentId,
          mediaType: "image/png",
        }),
      );
    for (const joint of image.jointEvidence) {
      const jointRoot = `packet/joint-evidence/${joint.candidateId}`;
      packetEvidenceFiles.push(
        await persistPacketEvidenceBytes({
          outputRoot,
          relativeFile: `${jointRoot}/original.png`,
          bytes: decodePngDataUrl(joint.originalDataUrl),
          evidenceKind: "joint-original-crop",
          componentId: image.componentId,
          candidateId: joint.candidateId,
          mediaType: "image/png",
        }),
        await persistPacketEvidenceBytes({
          outputRoot,
          relativeFile: `${jointRoot}/masked.png`,
          bytes: decodePngDataUrl(joint.maskedDataUrl),
          evidenceKind: "joint-masked-crop",
          componentId: image.componentId,
          candidateId: joint.candidateId,
          mediaType: "image/png",
        }),
        await persistPacketJson({
          outputRoot,
          relativeFile: `${jointRoot}/selected-support.json`,
          value: joint.selectedSupport,
          evidenceKind: "joint-selected-support-runs",
          componentId: image.componentId,
          candidateId: joint.candidateId,
        }),
        await persistPacketEvidenceBytes({
          outputRoot,
          relativeFile: `${jointRoot}/audit-cleared-pixels.png`,
          bytes: decodePngDataUrl(joint.auditEvidenceDataUrl),
          evidenceKind: "joint-audit-evidence",
          componentId: image.componentId,
          candidateId: joint.candidateId,
          mediaType: "image/png",
        }),
        await persistPacketJson({
          outputRoot,
          relativeFile: `${jointRoot}/evidence-record.json`,
          value: joint.record,
          evidenceKind: "joint-evidence-record",
          componentId: image.componentId,
          candidateId: joint.candidateId,
        }),
      );
    }
  }
  const serveUrl = await bundle({
    entryPoint: resolve(
      workspaceRoot,
      "apps/render-worker/src/candidate-rig-private-registration-remotion-entry.tsx",
    ),
    publicDir: resolve(workspaceRoot, "packages/remotion-runtime/public"),
  });
  const baseProps: CandidateRigPrivateRegistrationDiagnosticProps = {
    artifactKind: "original",
    measurement,
    proposal: effectiveProposal,
    recipe: view.recipe,
    componentImages,
    gapOrbitMeasurement,
  };
  const artifacts: CandidateRigPrivateRegistrationDiagnosticReceipt["artifacts"] =
    [];
  for (const artifactKind of candidateRigPrivateRegistrationDiagnosticKinds) {
    const file = resolve(outputRoot, `${artifactKind}.png`);
    const inputProps: CandidateRigPrivateRegistrationDiagnosticProps = {
      ...baseProps,
      artifactKind,
    };
    const composition = await selectComposition({
      serveUrl,
      id: CANDIDATE_RIG_PRIVATE_REGISTRATION_DIAGNOSTIC_ID,
      inputProps,
    });
    await renderStill({
      composition,
      imageFormat: "png",
      inputProps,
      output: file,
      serveUrl,
    });
    const snapshot = await readRegularFileStable(file);
    await probeCandidateRigPrivateRegistrationDiagnosticPng(snapshot.bytes);
    artifacts.push({
      artifactKind,
      relativeFile: `${artifactKind}.png`,
      sha256: snapshot.sha256,
      byteLength: snapshot.byteLength,
      mediaType: "image/png",
      width: 1920,
      height: 1080,
    });
  }
  if (
    (await readBoundBehavioralSources()).contentHash !==
    boundBehavioralSources.contentHash
  )
    throw new Error(
      "Private registration diagnostic renderer source changed during static rendering.",
    );
  const completedAt = options.completedAt ?? new Date().toISOString();
  const receiptDraft = {
    schemaVersion: "1.0" as const,
    receiptKind: "candidate-rig-private-registration-diagnostic" as const,
    authorityDomain: "private-source-review-registration" as const,
    receiptId: `candidate-i-${options.view}-${options.jobId}`,
    view: options.view,
    measurementReportContentHash: measurement.contentHash,
    baseProposalContentHash: baseProposal.contentHash,
    effectiveProposalContentHash: effectiveProposal.contentHash,
    correctionPatchContentHash: patches.at(-1)?.contentHash ?? null,
    warningLabel:
      "Unapproved registration proposal for human correction" as const,
    legendColors: {
      "mechanical-seam": "green" as const,
      "guide-proposed": "amber" as const,
      "shared-profile-coordinate": "purple" as const,
      "rigid-decoration": "blue" as const,
      "mask-only": "gray" as const,
      "unresolved-blocked": "red" as const,
    },
    maskDerivationEvidence: componentImages
      .filter((image) => image.maskedPixelCount > 0)
      .map((image) => ({
        componentId: image.componentId,
        semanticRole: image.semanticRole,
        sourceRgbaContentHash: image.sourceRgbaContentHash,
        originalPngContentHash: image.originalPngContentHash,
        maskedPngContentHash: image.maskedPngContentHash,
        maskRunLengthEncodingContentHash:
          image.maskRunLengthEncodingContentHash,
        maskedPixelCount: image.maskedPixelCount,
        auditRegion: image.maskAuditRegion!,
        auditOriginalPngContentHash: image.maskAuditOriginalPngContentHash!,
        auditMaskedPngContentHash: image.maskAuditMaskedPngContentHash!,
        auditEvidencePngContentHash: image.maskAuditEvidencePngContentHash!,
        sourceMeasuredBeforeMasking: image.sourceMeasuredBeforeMasking,
        maskAuthority: image.maskAuthority,
        transformAuthority: image.transformAuthority,
      })),
    jointDerivationEvidence: componentImages.flatMap((image) =>
      image.jointEvidence.map((joint) => joint.record),
    ),
    packetEvidence: {
      gapOrbitMeasurementReportContentHash: gapOrbitMeasurement.contentHash,
      files: packetEvidenceFiles,
    },
    artifacts,
    boundBehavioralSources,
    toolchain: {
      renderer: "remotion" as const,
      remotionVersion: "4.0.490" as const,
      sharpVersion: "0.34.5" as const,
    },
    completedAt,
    motionArtifactIncluded: false as const,
    compactDiagnosticOnly: true as const,
    ordinaryPlayerReachable: false as const,
    exportReachable: false as const,
    preparationAuthority: false as const,
    approvalAuthority: false as const,
    capabilityAuthority: false as const,
    productionBindable: false as const,
  };
  const receipt = candidateRigPrivateRegistrationDiagnosticReceiptSchema.parse({
    ...receiptDraft,
    contentHash: hashCanonical(receiptDraft),
  });
  const temporaryReceiptFile = resolve(outputRoot, ".receipt.tmp");
  const receiptFile = resolve(
    outputRoot,
    `${receipt.contentHash}.private-registration-diagnostic.json`,
  );
  await writeFile(
    temporaryReceiptFile,
    `${JSON.stringify(receipt, null, 2)}\n`,
    { flag: "wx", mode: 0o600 },
  );
  await rename(temporaryReceiptFile, receiptFile);
  const trusted = await reopenPersistedDiagnostic({
    jobId: options.jobId,
    receiptContentHash: receipt.contentHash,
    verifyCurrentSourceClosure: true,
  });
  validateCandidateRigRegistrationCorrectionPatchChain(
    measurement,
    baseProposal,
    sourceDiagnostic ?? trusted.receipt,
    patches,
    trusted.receipt,
  );
  return {
    measurement,
    baseProposal,
    patches,
    effectiveProposal,
    gapOrbitMeasurement,
    sourceDiagnostic: sourceDiagnostic ?? trusted.receipt,
    receipt: trusted.receipt,
    receiptPath: trusted.receiptPath,
  };
};

const nativeViews = ["front", "profile-left", "profile-right"] as const;
type NativeView = (typeof nativeViews)[number];

export type RenderCandidateRigAllViewPrivateRegistrationOptions = Omit<
  RenderCandidateRigPrivateRegistrationDiagnosticOptions,
  "view" | "correctionPatches" | "sourceDiagnosticReference"
> & {
  correctionPatchesByView?: Partial<
    Record<NativeView, CandidateRigRegistrationCorrectionPatch[]>
  >;
  sourceDiagnosticReferencesByView?: Partial<
    Record<NativeView, { jobId: string; receiptContentHash: string }>
  >;
  gateDecisionsByView?: Partial<
    Record<
      NativeView,
      {
        decision:
          | "accepted-static-gate-one"
          | "needs-registration-correction"
          | "regenerate-source";
        humanDecisionRecorded: boolean;
      }
    >
  >;
};

export const renderCandidateRigAllViewPrivateRegistrationPackets = async (
  options: RenderCandidateRigAllViewPrivateRegistrationOptions,
) => {
  if (!jobIdPattern.test(options.jobId) || options.jobId.length > 40)
    throw new Error(
      "All-view private registration packet job id must be a short safe identifier.",
    );
  const rendered = [];
  for (const view of nativeViews) {
    const result = await renderCandidateRigPrivateRegistrationDiagnostic({
      ...options,
      jobId: `${options.jobId}-${view}`,
      view,
      correctionPatches: options.correctionPatchesByView?.[view],
      sourceDiagnosticReference:
        options.sourceDiagnosticReferencesByView?.[view],
    });
    const unresolvedRequirementCount =
      result.effectiveProposal.unresolvedRequirements.length;
    const requested = options.gateDecisionsByView?.[view];
    const decision = requested?.decision ?? "needs-registration-correction";
    const humanDecisionRecorded = requested?.humanDecisionRecorded ?? false;
    const gateDraft = {
      schemaVersion: "1.0" as const,
      artifactKind: "candidate-rig-static-gate-one-decision" as const,
      authorityDomain: "private-source-review-registration" as const,
      gateId: `${options.jobId}-${view}-static-gate-one`,
      reviewer: "preston" as const,
      view,
      measurementReportContentHash: result.measurement.contentHash,
      baseProposalContentHash: result.baseProposal.contentHash,
      effectiveProposalContentHash: result.effectiveProposal.contentHash,
      patchChainContentHashes: result.patches.map((patch) => patch.contentHash),
      diagnosticReceiptContentHash: result.receipt.contentHash,
      unresolvedRequirementCount,
      humanDecisionRecorded,
      decision,
      staticDiagnosticOnly: true as const,
      futureMotionDiagnosticEligible:
        decision === "accepted-static-gate-one" &&
        humanDecisionRecorded &&
        unresolvedRequirementCount === 0,
      motionDiagnosticAuthorized: false as const,
      ordinaryPlayerReachable: false as const,
      exportReachable: false as const,
      preparationAuthority: false as const,
      approvalAuthority: false as const,
      capabilityAuthority: false as const,
      productionBindable: false as const,
    };
    const gate = candidateRigStaticGateOneDecisionSchema.parse({
      ...gateDraft,
      contentHash: hashCanonical(gateDraft),
    });
    validateCandidateRigStaticGateOneBindings(
      result.measurement,
      result.baseProposal,
      result.sourceDiagnostic,
      result.patches,
      result.receipt,
      gate,
    );
    const gateFile = resolve(
      outputParent,
      `${options.jobId}-${view}`,
      `${gate.contentHash}.static-gate-one.json`,
    );
    await writeFile(gateFile, `${JSON.stringify(gate, null, 2)}\n`, {
      flag: "wx",
      mode: 0o600,
    });
    const gateSnapshot = await readRegularFileStable(gateFile);
    if (gateSnapshot.sha256.length !== 64)
      throw new Error("Static Gate 1 decision did not persist exactly.");
    rendered.push({ view, result, gate, gateFile });
  }
  const bundleDraft = {
    schemaVersion: "1.0" as const,
    artifactKind: "candidate-rig-all-view-static-gate-one-bundle" as const,
    authorityDomain: "private-source-review-registration" as const,
    bundleId: `${options.jobId}-all-view-static-gate-one`,
    views: rendered.map(({ view, result, gate }) => ({
      view,
      measurementReportContentHash: result.measurement.contentHash,
      baseProposalContentHash: result.baseProposal.contentHash,
      effectiveProposalContentHash: result.effectiveProposal.contentHash,
      patchChainContentHashes: result.patches.map((patch) => patch.contentHash),
      diagnosticReceiptContentHash: result.receipt.contentHash,
      gateContentHash: gate.contentHash,
      decision: gate.decision,
      unresolvedRequirementCount:
        result.effectiveProposal.unresolvedRequirements.length,
    })),
    allViewsAccepted: rendered.every(
      ({ gate }) => gate.decision === "accepted-static-gate-one",
    ),
    futureMotionDiagnosticEligible: rendered.every(
      ({ gate }) => gate.futureMotionDiagnosticEligible,
    ),
    motionDiagnosticAuthorized: false as const,
    staticGateOneOnly: true as const,
    ordinaryPlayerReachable: false as const,
    exportReachable: false as const,
    preparationAuthority: false as const,
    approvalAuthority: false as const,
    capabilityAuthority: false as const,
    productionBindable: false as const,
  };
  const bundle: CandidateRigAllViewStaticGateOneBundle =
    candidateRigAllViewStaticGateOneBundleSchema.parse({
      ...bundleDraft,
      contentHash: hashCanonical(bundleDraft),
    });
  validateCandidateRigAllViewStaticGateOneBundleBindings(
    rendered.map(({ result, gate }) => ({
      measurement: result.measurement,
      baseProposal: result.baseProposal,
      sourceDiagnosticReceipt: result.sourceDiagnostic,
      patches: result.patches,
      effectiveDiagnosticReceipt: result.receipt,
      gate,
    })),
    bundle,
  );
  const canonicalParent = await ensureOutputParent();
  const aggregateRoot = resolve(outputParent, `${options.jobId}-aggregate`);
  await mkdir(aggregateRoot);
  const canonicalAggregateRoot = await realpath(aggregateRoot);
  if (!isWithin(canonicalParent, canonicalAggregateRoot))
    throw new Error("All-view static Gate 1 bundle escaped its output root.");
  const bundleFile = resolve(
    aggregateRoot,
    `${bundle.contentHash}.all-view-static-gate-one.json`,
  );
  await writeFile(bundleFile, `${JSON.stringify(bundle, null, 2)}\n`, {
    flag: "wx",
    mode: 0o600,
  });
  const bundleSnapshot = await readRegularFileStable(bundleFile);
  const reopenedBundle = candidateRigAllViewStaticGateOneBundleSchema.parse(
    JSON.parse(bundleSnapshot.bytes.toString("utf8")),
  );
  if (reopenedBundle.contentHash !== bundle.contentHash)
    throw new Error("All-view static Gate 1 bundle changed after persistence.");
  return { rendered, bundle: reopenedBundle, bundleFile };
};
