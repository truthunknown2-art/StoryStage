import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  createCharacterRigAssetRequest,
  createCharacterRigCandidateBundle,
  createKidsBipedRigRequestItems,
  hashCanonical,
  kidsBipedV1TopologyTemplate,
} from "@storystage/story-engine";
import { stageCharacterRigCandidateBundle } from "../src/character-rig-staging";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const evidenceRoot = resolve(workspaceRoot, "reports/evidence/KCAST-001");
const sourceRoot = evidenceRoot;
const relativeCandidate = "candidates/ollo-turnaround-candidate-a.png";
const candidateFile = resolve(sourceRoot, ...relativeCandidate.split("/"));
const privateProofRoot = resolve(workspaceRoot, "tmp/kcast001b-ollo-intake-proof");
const trustedStagingRoot = resolve(privateProofRoot, "trusted");
const stagingRoot = resolve(trustedStagingRoot, "ollo-turnaround-a");

const bytes = await readFile(candidateFile);
const contentHash = createHash("sha256").update(bytes).digest("hex");
const metadata = await sharp(bytes, { limitInputPixels: 64_000_000 }).metadata();
if (metadata.format !== "png" || !metadata.width || !metadata.height)
  throw new Error("The Ollo turnaround proof source is not a decoded PNG.");

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

const bundle = createCharacterRigCandidateBundle({
  schemaVersion: "1.0",
  acquisitionMode: "manual-file-import",
  requestId: request.requestId,
  requestContentHash: request.contentHash,
  provenance: {
    sourceType: "generated",
    providerLabel: "OpenAI built-in image generation",
    sourceReference: "Codex task 019f6dc3-6859-79d1-960a-fc69c9e275d9",
    createdAt: "2026-07-19T05:50:00.000Z",
    rightsStatement:
      "Original generated candidate created from the user-supplied Ollo identity board for this project; unapproved source art.",
  },
  assets: [
    {
      candidateId: "ollo-turnaround-candidate-a",
      requestItemId: "turnaround-sheet",
      relativeFile: relativeCandidate,
      contentHash,
      byteLength: bytes.length,
      mediaType: "image/png",
      width: metadata.width,
      height: metadata.height,
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
  stagedAt: "2026-07-19T06:00:00.000Z",
});

await Promise.all([
  writeFile(resolve(evidenceRoot, "ollo-rig-request-v1.json"), `${JSON.stringify(request, null, 2)}\n`, "utf8"),
  writeFile(resolve(evidenceRoot, "ollo-turnaround-candidate-bundle-a.json"), `${JSON.stringify(bundle, null, 2)}\n`, "utf8"),
  writeFile(resolve(evidenceRoot, "ollo-turnaround-staging-report-a.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8"),
]);

process.stdout.write(`${JSON.stringify({
  verdict: "PASS: exact Ollo turnaround bytes stage safely as incomplete, unapproved source evidence.",
  requestContentHash: request.contentHash,
  bundleContentHash: bundle.contentHash,
  stagingReportContentHash: report.contentHash,
  candidateContentHash: contentHash,
  status: report.status,
  missingItems: report.missingItems,
  providerAuthority: report.providerAuthority,
  approvalRequired: report.approvalRequired,
}, null, 2)}\n`);
