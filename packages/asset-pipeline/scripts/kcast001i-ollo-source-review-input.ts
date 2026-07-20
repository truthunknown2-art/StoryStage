import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createOlloCandidateISourceReviewPlan,
  type OlloCandidateIAtlasMap,
} from "../src/index";
import { createOlloCandidateIProposedRegistrationPlans } from "../src/ollo-candidate-i-registration-guides";

const workspaceRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const evidenceRoot = resolve(workspaceRoot, "reports/evidence/KCAST-001");
const outputFile = resolve(
  evidenceRoot,
  "ollo-candidate-i-source-review-render-input.json",
);

const readJson = async (file: string) =>
  JSON.parse(await readFile(resolve(evidenceRoot, file), "utf8")) as Record<
    string,
    unknown
  >;

const mapHashes = {
  "front:parts-kit":
    "6497bcf970ff62d7239c6ad6dd1ca50b3ddc218d47e75ece150103400ecf11f6",
  "front:face-kit":
    "35a6bb37ed0b11a16b4abb50d7c08a42aa1a99b028e04d404b3134ebf8fdede7",
  "profile-left:parts-kit":
    "a7fbec549081200e900f220b054350a741099f229d0f208e25910b9de364b85e",
  "profile-left:face-kit":
    "4f578a175828417c5e27589f105b9b58dce33872c5523da1284ae728a83ddfd7",
  "profile-right:parts-kit":
    "fac167f8c0a918b0f26c97749b9822d26f2efbcdb2a6ab9a97e13675233c8ad6",
  "profile-right:face-kit":
    "6ae9ea3d2d2cca2a909a0b61e18ad937e283a79e209e4210acf638c7cb1ee77a",
} as const;

type AtlasEvidence = {
  relativeFile: string;
  contentHash: string;
  width: number;
  height: number;
  components: Array<{
    id: string;
    atlasCell: { x: number; y: number; width: number; height: number };
    atlasContentBounds: { x: number; y: number; width: number; height: number };
  }>;
};

const atlasMap = (
  view: OlloCandidateIAtlasMap["view"],
  kind: OlloCandidateIAtlasMap["kind"],
  requestItemId: string,
  candidateId: string,
  atlas: AtlasEvidence,
): OlloCandidateIAtlasMap => ({
  view,
  kind,
  requestItemId,
  candidateId,
  stagedContentHash: atlas.contentHash,
  width: atlas.width,
  height: atlas.height,
  alphaClass: "mixed-alpha",
  matteMode: "existing-alpha",
  mapContentHash: mapHashes[`${view}:${kind}`],
  components: atlas.components.map((component) => ({
    role: component.id,
    atlasCell: component.atlasCell,
    atlasContentBounds: component.atlasContentBounds,
  })),
});

const loadEvidence = async () => {
  const [request, bundle, stagingReport, importReceipt, front, profiles] =
    await Promise.all([
      readJson("ollo-rig-request-v1.json"),
      readJson("ollo-complete-candidate-bundle-i.json"),
      readJson("ollo-complete-staging-report-i.json"),
      readJson("ollo-complete-import-receipt-i.json"),
      readJson("ollo-front-atlas-evidence-f.json"),
      readJson("ollo-profile-atlas-evidence-i.json"),
    ]);
  const frontAtlases = front.atlases as {
    partsFront: AtlasEvidence;
    faceFront: AtlasEvidence;
  };
  const profileCompositions = profiles.profileCompositions as Array<{
    view: "profile-left" | "profile-right";
    atlases: { parts: AtlasEvidence; face: AtlasEvidence };
  }>;
  const atlasMaps = [
    atlasMap(
      "front",
      "parts-kit",
      "parts-front",
      "ollo-parts-front-source-set-f-alpha",
      frontAtlases.partsFront,
    ),
    atlasMap(
      "front",
      "face-kit",
      "face-front",
      "ollo-face-front-source-set-f-alpha",
      frontAtlases.faceFront,
    ),
    ...profileCompositions.flatMap((profile) => [
      atlasMap(
        profile.view,
        "parts-kit",
        `parts-${profile.view}`,
        `ollo-parts-${profile.view}-source-set-i-alpha`,
        profile.atlases.parts,
      ),
      atlasMap(
        profile.view,
        "face-kit",
        `face-${profile.view}`,
        `ollo-face-${profile.view}-source-set-i-alpha`,
        profile.atlases.face,
      ),
    ]),
  ];
  return { request, bundle, stagingReport, importReceipt, atlasMaps };
};

const main = async () => {
  const importedEvidence = await loadEvidence();
  const registrationPlans =
    createOlloCandidateIProposedRegistrationPlans(importedEvidence);
  const evidence = { ...importedEvidence, registrationPlans };
  const sourceReviewPlan = createOlloCandidateISourceReviewPlan(evidence);
  const bytes = `${JSON.stringify({ evidence, sourceReviewPlan }, null, 2)}\n`;
  if (process.argv.includes("--check")) {
    const existing = await readFile(outputFile, "utf8");
    if (existing !== bytes)
      throw new Error(
        "Committed Candidate-I source-review render input is stale.",
      );
    console.log(`Verified ${outputFile}`);
    return;
  }
  await writeFile(outputFile, bytes, { encoding: "utf8", mode: 0o600 });
  console.log(`Wrote ${outputFile}`);
};

await main();
