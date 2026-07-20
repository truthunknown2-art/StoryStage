import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { format } from "prettier";
import {
  createOlloCandidateISourceReviewPlan,
  createCandidateRigReviewInput,
  type OlloCandidateIReviewRecipeInput,
  type OlloCandidateISourceReviewPlan,
} from "@storystage/asset-pipeline";
import { createCandidateRigExactAttachmentMeasurement } from "@storystage/asset-pipeline/private-candidate-rig-registration";
import { createOlloCandidateIProposedRegistrationPlans } from "../../../packages/asset-pipeline/src/ollo-candidate-i-registration-guides";
import { hashCanonical } from "@storystage/story-engine";
import {
  candidateRigAuthoredDecorationMaskManifestSchema,
  candidateRigRegistrationCorrectionPatchSchema,
  type CandidateRigRegistrationCorrectionPatch,
} from "@storystage/story-engine/private-candidate-rig-registration";
import { renderCandidateRigPrivateRegistrationDiagnostic } from "./candidate-rig-private-registration-diagnostic";

const workspaceRoot = resolve(
  fileURLToPath(new URL("../../..", import.meta.url)),
);
const evidenceRoot = resolve(workspaceRoot, "reports/evidence/KCAST-001");
const diagnosticRoot = resolve(
  workspaceRoot,
  "artifacts/KCAST-001/private-registration-diagnostic",
);
const reportFile = resolve(
  evidenceRoot,
  "ollo-tail-socket-corrections-v11-hash-report.json",
);
const check = process.argv.includes("--check");

const exactSources: Record<string, string> = {
  "ollo-parts-front-source-set-f-alpha":
    "ollo-parts-front-source-set-f-alpha.png",
  "ollo-face-front-source-set-f-alpha":
    "ollo-face-front-source-set-f-alpha.png",
  "ollo-parts-profile-left-source-set-i-alpha":
    "ollo-parts-profile-left-source-set-i-alpha.png",
  "ollo-face-profile-left-source-set-i-alpha":
    "ollo-face-profile-left-source-set-i-alpha.png",
  "ollo-parts-profile-right-source-set-i-alpha":
    "ollo-parts-profile-right-source-set-i-alpha.png",
  "ollo-face-profile-right-source-set-i-alpha":
    "ollo-face-profile-right-source-set-i-alpha.png",
};

const reviewArtifactKinds = [
  "rest",
  "zero",
  "minus-15",
  "plus-15",
  "gap-orbit",
  "z-order-near-far",
] as const;

const viewConfigs = [
  {
    view: "front" as const,
    requirementId: "front-pelvis-tail-base-distal",
    pointMicropixels: { x: 236_000_000, y: 126_000_000 },
    plausibilityRegionContentHash:
      "9e0d51038258a1be4cf07c9dfe2cdaf58de46d09bd91e7c56b7c9c42945f1ab4",
    patchFile: "ollo-front-tail-socket-correction-v11.json",
    sourceJobId: "v11-tail-source-front",
    correctedJobId: "v11-tail-corrected-front",
    recipeSourceJobId: "v11-tail-recipe-source-front",
    recipeCorrectedJobId: "v11-tail-recipe-corrected-front",
    sourceCompletedAt: "2026-07-19T22:10:00.000Z",
    correctedCompletedAt: "2026-07-19T22:20:00.000Z",
  },
  {
    view: "profile-left" as const,
    requirementId: "profile-left-pelvis-tail-base-distal",
    pointMicropixels: { x: 272_000_000, y: 172_000_000 },
    plausibilityRegionContentHash:
      "c7516471708e2b64674b9d1e31ddc63761f11110210f13514266ead4fb457eb6",
    patchFile: "ollo-profile-left-tail-socket-correction-v11.json",
    sourceJobId: "v11-tail-source-profile-left",
    correctedJobId: "v11-tail-corrected-profile-left",
    recipeSourceJobId: "v11-tail-recipe-source-profile-left",
    recipeCorrectedJobId: "v11-tail-recipe-corrected-profile-left",
    sourceCompletedAt: "2026-07-19T22:30:00.000Z",
    correctedCompletedAt: "2026-07-19T22:40:00.000Z",
  },
] as const;

const persistOrCheck = async (file: string, value: unknown, label: string) => {
  const bytes = await format(JSON.stringify(value), { parser: "json" });
  if (check) {
    if ((await readFile(file, "utf8")) !== bytes)
      throw new Error(`Committed ${label} is stale.`);
    return;
  }
  await writeFile(file, bytes, { encoding: "utf8", mode: 0o600 });
};

const createPatch = (input: {
  config: (typeof viewConfigs)[number];
  baseProposalContentHash: string;
  sourceDiagnosticReceiptContentHash: string;
  pointMicropixels?: { x: number; y: number };
  patchId?: string;
  createdAt?: string;
}): CandidateRigRegistrationCorrectionPatch => {
  const draft = {
    schemaVersion: "1.0" as const,
    artifactKind: "candidate-rig-registration-correction-patch" as const,
    authorityDomain: "private-source-review-registration" as const,
    patchId:
      input.patchId ?? `ollo-${input.config.view}-tail-socket-correction-v11`,
    reviewSessionId: "ollo-tail-socket-private-review-v11",
    baseProposalContentHash: input.baseProposalContentHash,
    expectedTargetRevisionContentHash: input.baseProposalContentHash,
    previousPatchContentHash: null,
    revision: 1,
    sourceDiagnosticReceiptContentHash:
      input.sourceDiagnosticReceiptContentHash,
    reviewer: "preston" as const,
    reason:
      "Place the evidence-led guide-proposed pelvis tail socket for private visual review; no static gate acceptance is recorded.",
    createdAt: input.createdAt ?? input.config.correctedCompletedAt,
    operations: [
      {
        op: "set-parent-socket" as const,
        requirementId: input.config.requirementId,
        parentRole: "pelvis",
        childRole: "tail",
        socketId: "tail-base",
        motionChannelId: "tail-tail-base",
        zIndex: 1,
        pointMicropixels:
          input.pointMicropixels ?? input.config.pointMicropixels,
        basis: "guide-proposed" as const,
        sourceFeatureIds: [],
        plausibilityRegionContentHash:
          input.config.plausibilityRegionContentHash,
      },
    ],
    immutablePatchOperations: true as const,
    providerAuthority: false as const,
    approvalAuthority: false as const,
    capabilityAuthority: false as const,
    productionBindable: false as const,
  };
  return candidateRigRegistrationCorrectionPatchSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
};

const main = async () => {
  const previousReport = JSON.parse(await readFile(reportFile, "utf8")) as {
    contentHash: string;
    views: Array<{
      view: string;
      tailGapOrbit?: Array<{
        angleDegrees: -15 | 0 | 15;
        parentSocketMicropixels: { x: number; y: number };
        childPivotMicropixels: { x: number; y: number };
        gapMicropixels: number;
        heat: "pass" | "review" | "fail";
      }>;
      correctedDiagnosticReceiptContentHash?: string;
      correctedDiagnosticReceiptRelativeFile?: string;
      before?: {
        tailGapOrbit: Array<{
          angleDegrees: -15 | 0 | 15;
          parentSocketMicropixels: { x: number; y: number };
          childPivotMicropixels: { x: number; y: number };
          gapMicropixels: number;
          heat: "pass" | "review" | "fail";
        }>;
        diagnosticReceiptContentHash: string;
        diagnosticReceiptRelativeFile: string;
      };
    }>;
  };
  const { contentHash: previousReportContentHash, ...previousReportDraft } =
    previousReport;
  if (hashCanonical(previousReportDraft) !== previousReportContentHash)
    throw new Error("Previous tail correction report hash is invalid.");
  const sourceReviewInput = JSON.parse(
    await readFile(
      resolve(evidenceRoot, "ollo-candidate-i-source-review-render-input.json"),
      "utf8",
    ),
  ) as {
    evidence: OlloCandidateIReviewRecipeInput;
    sourceReviewPlan: OlloCandidateISourceReviewPlan;
  };
  const manifest = candidateRigAuthoredDecorationMaskManifestSchema.parse(
    JSON.parse(
      await readFile(
        resolve(
          evidenceRoot,
          "ollo-authored-decoration-mask-manifest-v10.json",
        ),
        "utf8",
      ),
    ),
  );
  const correctedRegistrationPlans =
    createOlloCandidateIProposedRegistrationPlans({
      request: sourceReviewInput.evidence.request,
      bundle: sourceReviewInput.evidence.bundle,
      stagingReport: sourceReviewInput.evidence.stagingReport,
      importReceipt: sourceReviewInput.evidence.importReceipt,
      atlasMaps: sourceReviewInput.evidence.atlasMaps,
    });
  const correctedEvidence: OlloCandidateIReviewRecipeInput = {
    ...sourceReviewInput.evidence,
    registrationPlans: correctedRegistrationPlans,
  };
  const correctedSourceReviewPlan =
    createOlloCandidateISourceReviewPlan(correctedEvidence);
  const temporaryRoot = await mkdtemp(join(tmpdir(), "storystage-tail-v11-"));
  const stagingRoot = join(temporaryRoot, "staging");
  try {
    for (const file of (
      sourceReviewInput.evidence.importReceipt as {
        files: Array<{ candidateId: string; stagedRelativeFile: string }>;
      }
    ).files) {
      const source = exactSources[file.candidateId];
      if (!source) continue;
      const target = join(stagingRoot, file.stagedRelativeFile);
      await mkdir(dirname(target), { recursive: true });
      await copyFile(resolve(evidenceRoot, "derived", source), target);
    }
    const correctedSourceReviewInput = {
      evidence: correctedEvidence,
      sourceReviewPlan: correctedSourceReviewPlan,
    };
    const correctedBaseMeasurementHashByView = new Map<string, string>();
    for (const view of correctedSourceReviewPlan.views) {
      const review = await createCandidateRigReviewInput({
        request: correctedEvidence.request,
        bundle: correctedEvidence.bundle,
        stagingReport: correctedEvidence.stagingReport,
        importReceipt: correctedEvidence.importReceipt,
        recipe: view.recipe,
        reviewProgram: view.program,
        registrationPlan: view.registrationPlan,
        trustedStagingRoot: temporaryRoot,
        stagingRoot,
      });
      const measurement = await createCandidateRigExactAttachmentMeasurement({
        review,
        recipe: view.recipe,
      });
      correctedBaseMeasurementHashByView.set(
        view.view,
        measurement.contentHash,
      );
    }
    const { contentHash: _oldManifestContentHash, ...correctedManifestDraft } =
      structuredClone(manifest);
    correctedManifestDraft.sourceReviewInputContentHash = hashCanonical(
      correctedSourceReviewInput,
    );
    correctedManifestDraft.entries = correctedManifestDraft.entries.map(
      (entry) => ({
        ...entry,
        baseMeasurementContentHash:
          correctedBaseMeasurementHashByView.get(entry.view) ??
          entry.baseMeasurementContentHash,
      }),
    );
    const correctedManifest =
      candidateRigAuthoredDecorationMaskManifestSchema.parse({
        ...correctedManifestDraft,
        contentHash: hashCanonical(correctedManifestDraft),
      });
    await mkdir(diagnosticRoot, { recursive: true });
    for (const config of viewConfigs)
      for (const jobId of [
        config.recipeSourceJobId,
        config.recipeCorrectedJobId,
      ])
        await rm(resolve(diagnosticRoot, jobId), {
          recursive: true,
          force: true,
        });

    const views = [];
    for (const config of viewConfigs) {
      const oldPlan = sourceReviewInput.sourceReviewPlan.views.find(
        (candidate) => candidate.view === config.view,
      );
      const recipePlan = correctedSourceReviewPlan.views.find(
        (candidate) => candidate.view === config.view,
      );
      if (!oldPlan || !recipePlan)
        throw new Error(`${config.view} source-review plan is unavailable.`);
      const priorView = previousReport.views.find(
        (candidate) => candidate.view === config.view,
      );
      const priorTailGapAngles =
        priorView?.before?.tailGapOrbit ?? priorView?.tailGapOrbit;
      const priorDiagnosticReceiptContentHash =
        priorView?.before?.diagnosticReceiptContentHash ??
        priorView?.correctedDiagnosticReceiptContentHash;
      const priorDiagnosticReceiptRelativeFile =
        priorView?.before?.diagnosticReceiptRelativeFile ??
        priorView?.correctedDiagnosticReceiptRelativeFile;
      if (
        !priorView ||
        !priorTailGapAngles ||
        !priorDiagnosticReceiptContentHash ||
        !priorDiagnosticReceiptRelativeFile
      )
        throw new Error(
          `${config.view} prior socket-only gap evidence is unavailable.`,
        );
      const recipeShared = {
        view: config.view,
        trustedStagingRoot: temporaryRoot,
        stagingRoot,
        evidence: correctedEvidence,
        sourceReviewPlan: correctedSourceReviewPlan,
        authoredMaskManifest: correctedManifest,
        authoredMaskManifestRoot: evidenceRoot,
      };
      const recipeSource =
        await renderCandidateRigPrivateRegistrationDiagnostic({
          ...recipeShared,
          jobId: config.recipeSourceJobId,
          completedAt: new Date(
            Date.parse(config.correctedCompletedAt) + 60_000,
          ).toISOString(),
        });
      const patch = createPatch({
        config,
        baseProposalContentHash: recipeSource.baseProposal.contentHash,
        sourceDiagnosticReceiptContentHash: recipeSource.receipt.contentHash,
        createdAt: new Date(
          Date.parse(config.correctedCompletedAt) + 120_000,
        ).toISOString(),
      });
      await persistOrCheck(
        resolve(evidenceRoot, config.patchFile),
        patch,
        `${config.view} tail-socket correction patch`,
      );
      const after = await renderCandidateRigPrivateRegistrationDiagnostic({
        ...recipeShared,
        jobId: config.recipeCorrectedJobId,
        correctionPatches: [patch],
        sourceDiagnosticReference: {
          jobId: config.recipeSourceJobId,
          receiptContentHash: recipeSource.receipt.contentHash,
        },
        completedAt: new Date(
          Date.parse(config.correctedCompletedAt) + 180_000,
        ).toISOString(),
      });
      const sourceUnresolvedIds =
        recipeSource.baseProposal.unresolvedRequirements
          .map((requirement) => requirement.requirementId)
          .sort();
      const afterTailGap = after.gapOrbitMeasurement.samples.find(
        (sample) =>
          sample.parentRole === "pelvis" &&
          sample.childRole === "tail" &&
          sample.socketId === "tail-base",
      );
      const beforeTailGap = { angles: priorTailGapAngles };
      const afterTailSocket = after.effectiveProposal.sockets.find(
        (socket) =>
          socket.parentRole === "pelvis" &&
          socket.childRole === "tail" &&
          socket.socketId === "tail-base",
      );
      if (
        recipeSource.baseProposal.proposalStatus !== "complete-unapproved" ||
        sourceUnresolvedIds.length !== 0 ||
        !afterTailGap ||
        !afterTailSocket ||
        afterTailSocket.zIndex !== 1 ||
        afterTailGap.angles.some((angle) => angle.heat !== "pass") ||
        after.effectiveProposal.proposalStatus !== "complete-unapproved" ||
        after.effectiveProposal.unresolvedRequirements.length !== 0 ||
        after.receipt.approvalAuthority ||
        after.receipt.capabilityAuthority ||
        after.receipt.productionBindable ||
        after.receipt.motionArtifactIncluded ||
        after.receipt.ordinaryPlayerReachable ||
        after.receipt.exportReachable
      )
        throw new Error(
          `${config.view} recipe correction did not close every tail orbit gap inside private unapproved authority.`,
        );
      const oldTailPart = oldPlan.recipe.parts.find(
        (part) => part.role === "tail",
      );
      const recipeTailPart = recipePlan.recipe.parts.find(
        (part) => part.role === "tail",
      );
      if (!oldTailPart || !recipeTailPart)
        throw new Error(`${config.view} tail recipe part is unavailable.`);
      const reviewArtifacts = after.receipt.artifacts
        .filter((artifact) =>
          reviewArtifactKinds.includes(
            artifact.artifactKind as (typeof reviewArtifactKinds)[number],
          ),
        )
        .map((artifact) => ({
          artifactKind: artifact.artifactKind,
          relativeFile: `artifacts/KCAST-001/private-registration-diagnostic/${config.recipeCorrectedJobId}/${artifact.relativeFile}`,
          sha256: artifact.sha256,
          byteLength: artifact.byteLength,
          width: artifact.width,
          height: artifact.height,
        }));
      if (reviewArtifacts.length !== reviewArtifactKinds.length)
        throw new Error(
          `${config.view} corrected recipe packet omitted a required static review artifact.`,
        );
      views.push({
        view: config.view,
        requirementId: config.requirementId,
        pointMicropixels: config.pointMicropixels,
        plausibilityRegionContentHash: config.plausibilityRegionContentHash,
        sourceUnresolvedRequirementIds: sourceUnresolvedIds,
        recipeCorrection: {
          fieldsChanged: [
            "parts[role=tail].childPivot.{x,y}",
            "parts[role=tail].restTransform.{x,y}",
          ],
          before: {
            childPivot: oldTailPart.childPivot,
            restTransform: {
              x: oldTailPart.restTransform.x,
              y: oldTailPart.restTransform.y,
            },
            recipeContentHash: oldPlan.recipe.contentHash,
          },
          after: {
            childPivot: recipeTailPart.childPivot,
            restTransform: {
              x: recipeTailPart.restTransform.x,
              y: recipeTailPart.restTransform.y,
            },
            recipeContentHash: recipePlan.recipe.contentHash,
          },
          unchanged: {
            rotation:
              oldTailPart.restTransform.rotation ===
              recipeTailPart.restTransform.rotation,
            scaleX:
              oldTailPart.restTransform.scaleX ===
              recipeTailPart.restTransform.scaleX,
            scaleY:
              oldTailPart.restTransform.scaleY ===
              recipeTailPart.restTransform.scaleY,
            zIndex: oldTailPart.zIndex === recipeTailPart.zIndex,
          },
        },
        before: {
          maxGapMicropixels: Math.max(
            ...beforeTailGap.angles.map((angle) => angle.gapMicropixels),
          ),
          tailGapOrbit: beforeTailGap.angles,
          sourceReportContentHash: previousReportContentHash,
          diagnosticReceiptContentHash: priorDiagnosticReceiptContentHash,
          diagnosticReceiptRelativeFile: priorDiagnosticReceiptRelativeFile,
        },
        after: {
          maxGapMicropixels: Math.max(
            ...afterTailGap.angles.map((angle) => angle.gapMicropixels),
          ),
          tailGapOrbit: afterTailGap.angles,
          diagnosticReceiptContentHash: after.receipt.contentHash,
          diagnosticReceiptRelativeFile: `artifacts/KCAST-001/private-registration-diagnostic/${config.recipeCorrectedJobId}/${after.receipt.contentHash}.private-registration-diagnostic.json`,
        },
        correctionPatchContentHash: patch.contentHash,
        correctionPatchRelativeFile: `reports/evidence/KCAST-001/${config.patchFile}`,
        correctedProposalContentHash: after.effectiveProposal.contentHash,
        correctedProposalStatus: after.effectiveProposal.proposalStatus,
        correctedUnresolvedRequirementIds:
          after.effectiveProposal.unresolvedRequirements.map(
            (requirement) => requirement.requirementId,
          ),
        residualVisualBlockers: [],
        correctedReviewArtifacts: reviewArtifacts,
        patchAuthority: {
          providerAuthority: patch.providerAuthority,
          approvalAuthority: patch.approvalAuthority,
          capabilityAuthority: patch.capabilityAuthority,
          productionBindable: patch.productionBindable,
        },
      });
    }
    const draft = {
      schemaVersion: "1.0" as const,
      reportKind: "ollo-tail-socket-corrections-v11-hash-report" as const,
      authorityDomain: "private-source-review-registration" as const,
      sourceReviewInputContentHash: hashCanonical(sourceReviewInput),
      correctedRegistrationPlansContentHash: hashCanonical(
        correctedRegistrationPlans,
      ),
      correctedSourceReviewPlanContentHash: hashCanonical(
        correctedSourceReviewPlan,
      ),
      authoredMaskManifestContentHash: manifest.contentHash,
      correctionScope: [
        "front-pelvis-tail-base-distal",
        "profile-left-pelvis-tail-base-distal",
      ] as const,
      views,
      correctionPatchesImmutable: true as const,
      proposalCoverageComplete: true as const,
      residualVisualBlockerCount: views.reduce(
        (total, view) => total + view.residualVisualBlockers.length,
        0,
      ),
      humanAcceptanceRecorded: false as const,
      staticGateOneDecisionRecorded: false as const,
      futureMotionDiagnosticEligible: false as const,
      motionArtifactIncluded: false as const,
      ordinaryPlayerReachable: false as const,
      exportReachable: false as const,
      preparationAuthority: false as const,
      approvalAuthority: false as const,
      capabilityAuthority: false as const,
      productionBindable: false as const,
    };
    const report = { ...draft, contentHash: hashCanonical(draft) };
    await persistOrCheck(
      reportFile,
      report,
      "Ollo tail-socket correction v11 hash report",
    );
    process.stdout.write(
      `${JSON.stringify(
        {
          status: check ? "verified" : "written",
          contentHash: report.contentHash,
          views: views.map((view) => ({
            view: view.view,
            sourceUnresolvedRequirementIds: view.sourceUnresolvedRequirementIds,
            correctedUnresolvedRequirementIds:
              view.correctedUnresolvedRequirementIds,
            correctionPatchContentHash: view.correctionPatchContentHash,
            beforeMaxGapMicropixels: view.before.maxGapMicropixels,
            afterMaxGapMicropixels: view.after.maxGapMicropixels,
            correctedDiagnosticReceiptContentHash:
              view.after.diagnosticReceiptContentHash,
          })),
          humanAcceptanceRecorded: report.humanAcceptanceRecorded,
          futureMotionDiagnosticEligible: report.futureMotionDiagnosticEligible,
        },
        null,
        2,
      )}\n`,
    );
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
};

await main();
