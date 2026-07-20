import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { isAbsolute, resolve } from "node:path";
import type {
  OlloCandidateIReviewRecipeInput,
  OlloCandidateISourceReviewPlan,
} from "@storystage/asset-pipeline";
import {
  renderCandidateRigAllViewPrivateRegistrationPackets,
  renderCandidateRigPrivateRegistrationDiagnostic,
} from "./candidate-rig-private-registration-diagnostic";

const cliArgs = process.argv.slice(2);
if (cliArgs[0] === "--") cliArgs.shift();
const [inputFile, trustedStagingRoot, stagingRoot, jobId, view] = cliArgs;
if (
  !inputFile ||
  !trustedStagingRoot ||
  !stagingRoot ||
  !jobId ||
  (view !== "front" &&
    view !== "profile-left" &&
    view !== "profile-right" &&
    view !== "all")
)
  throw new Error(
    "Usage: candidate-rig-private-registration-diagnostic-cli <input.json> <trusted-staging-root> <staging-root> <job-id> <front|profile-left|profile-right|all>",
  );

const cliWorkspaceRoot = resolve(
  fileURLToPath(new URL("../../..", import.meta.url)),
);
const fromWorkspace = (value: string) =>
  isAbsolute(value) ? resolve(value) : resolve(cliWorkspaceRoot, value);
const input = JSON.parse(await readFile(fromWorkspace(inputFile), "utf8")) as {
  evidence: OlloCandidateIReviewRecipeInput;
  sourceReviewPlan: OlloCandidateISourceReviewPlan;
};
if (!input.evidence || !input.sourceReviewPlan)
  throw new Error(
    "Private registration diagnostic input must contain exact evidence and its exact compiled source-review plan.",
  );

const shared = {
  jobId,
  trustedStagingRoot: fromWorkspace(trustedStagingRoot),
  stagingRoot: fromWorkspace(stagingRoot),
  evidence: input.evidence,
  sourceReviewPlan: input.sourceReviewPlan,
};

if (view === "all") {
  const result =
    await renderCandidateRigAllViewPrivateRegistrationPackets(shared);
  process.stdout.write(
    `${JSON.stringify(
      {
        aggregateStaticGateOneBundleContentHash: result.bundle.contentHash,
        aggregateStaticGateOneBundlePath: result.bundleFile,
        allViewsAccepted: result.bundle.allViewsAccepted,
        futureMotionDiagnosticEligible:
          result.bundle.futureMotionDiagnosticEligible,
        motionDiagnosticAuthorized: result.bundle.motionDiagnosticAuthorized,
        views: result.rendered.map(
          ({ view: nativeView, result: packet, gate }) => ({
            view: nativeView,
            measurementReportContentHash: packet.measurement.contentHash,
            baseProposalContentHash: packet.baseProposal.contentHash,
            effectiveProposalContentHash: packet.effectiveProposal.contentHash,
            receiptContentHash: packet.receipt.contentHash,
            receiptPath: packet.receiptPath,
            gateContentHash: gate.contentHash,
            decision: gate.decision,
            unresolvedRequirementCount: gate.unresolvedRequirementCount,
          }),
        ),
      },
      null,
      2,
    )}\n`,
  );
  process.exit(0);
}

const result = await renderCandidateRigPrivateRegistrationDiagnostic({
  ...shared,
  view,
});

process.stdout.write(
  `${JSON.stringify(
    {
      status: result.effectiveProposal.proposalStatus,
      measurementReportContentHash: result.measurement.contentHash,
      baseProposalContentHash: result.baseProposal.contentHash,
      effectiveProposalContentHash: result.effectiveProposal.contentHash,
      receiptContentHash: result.receipt.contentHash,
      receiptPath: result.receiptPath,
      artifactCount: result.receipt.artifacts.length,
      motionArtifactIncluded: result.receipt.motionArtifactIncluded,
      ordinaryPlayerReachable: result.receipt.ordinaryPlayerReachable,
      exportReachable: result.receipt.exportReachable,
      preparationAuthority: result.receipt.preparationAuthority,
      approvalAuthority: result.receipt.approvalAuthority,
      capabilityAuthority: result.receipt.capabilityAuthority,
      productionBindable: result.receipt.productionBindable,
    },
    null,
    2,
  )}\n`,
);
