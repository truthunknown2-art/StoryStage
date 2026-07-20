import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { format } from "prettier";
import { hashCanonical } from "@storystage/story-engine";
import {
  composeKidsBipedV1ProfileAtlases,
  type FrontAtlasSourceRect,
  type KidsBipedV1ProfileAtlasInput,
  type ProfileAtlasSourceInput,
} from "../src/fixed-grid-front-atlas";
import { removeBorderChromaKey } from "../src/chroma-key";

const workspaceRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const evidenceRoot = resolve(workspaceRoot, "reports/evidence/KCAST-001");
const candidateRoot = resolve(evidenceRoot, "candidates");
const maximumCanonicalKeyDistance = 32;
const observedAt = "2026-07-19T12:00:00.000Z";

const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

const sourceSpecs = {
  "profile-left": {
    core: {
      file: "ollo-parts-profile-left-core-candidate-g-chroma.png",
      contentHash:
        "152e5b8fc7036b96f584c785ce6461a245781f81a829fd2a3d2ef0f9701724b1",
      width: 1536,
      height: 1024,
    },
    limbs: {
      file: "ollo-parts-profile-left-limbs-candidate-g-chroma.png",
      contentHash:
        "b0e744c349af9c1d18d55d0b6886f24bfdee76c14540ecd3fb2e1295b0e21749",
      width: 1672,
      height: 941,
    },
    eyes: {
      file: "ollo-face-profile-left-eyes-candidate-g-chroma.png",
      contentHash:
        "ab827cdb3b9682549f25d165ad9e95b40fa17cc8d7cfd938670e75449638d067",
      width: 1774,
      height: 887,
    },
    mouths: {
      file: "ollo-face-profile-left-mouth-overlays-candidate-g-chroma.png",
      contentHash:
        "e9dcdd519b16e48f38d7712102c34432293b1eacd1e1bb76daa16c5f966929aa",
      width: 1672,
      height: 941,
    },
    lowerFace: {
      file: "ollo-face-profile-left-lower-base-candidate-g-chroma.png",
      contentHash:
        "269094a84b3b73fb5542b6203648764bca4491cef0bb8644d5f3c021e71ca880",
      width: 1448,
      height: 1086,
    },
  },
  "profile-right": {
    core: {
      file: "ollo-parts-profile-right-core-candidate-g-chroma.png",
      contentHash:
        "899cf650e9b847ff05c68f9b24cf125e0663716c62852b15009fd3e475980465",
      width: 1536,
      height: 1024,
    },
    limbs: {
      file: "ollo-parts-profile-right-limbs-candidate-g-chroma.png",
      contentHash:
        "fc7fca59c9354216e36352c46501a0378ed06e51a3658a3d20c6edd8968e5a99",
      width: 1672,
      height: 941,
    },
    eyes: {
      file: "ollo-face-profile-right-eyes-candidate-g-chroma.png",
      contentHash:
        "3ab91e167a2d05701c646f1ec2740ce7b3412a3b2e470dda022694a4893f0b8c",
      width: 1774,
      height: 887,
    },
    mouths: {
      file: "ollo-face-profile-right-mouth-overlays-candidate-g-chroma.png",
      contentHash:
        "ec150581a072088765094f35157505c6aab677441b1ff8e5d45ae21a8f491a16",
      width: 1672,
      height: 941,
    },
    lowerFace: {
      file: "ollo-face-profile-right-lower-base-candidate-g-chroma.png",
      contentHash:
        "0ce49c0b8928936b7d7d940f6787751e217f3c705a2701a0bd887ffb3462c8f1",
      width: 1448,
      height: 1086,
    },
  },
} as const;

type ProfileView = keyof typeof sourceSpecs;
type SheetId = keyof (typeof sourceSpecs)[ProfileView];
type RawRect = readonly [x: number, y: number, width: number, height: number];

const candidateRects: Record<
  ProfileView,
  Record<Exclude<SheetId, "lowerFace">, readonly RawRect[]>
> = {
  "profile-left": {
    core: [
      [139, 117, 224, 366],
      [489, 253, 191, 226],
      [844, 117, 328, 309],
      [1277, 268, 146, 154],
      [156, 581, 135, 310],
      [498, 580, 135, 311],
      [790, 588, 268, 305],
      [1154, 590, 298, 277],
    ],
    limbs: [
      [157, 112, 87, 304],
      [428, 113, 83, 304],
      [651, 220, 132, 166],
      [945, 113, 84, 304],
      [1215, 112, 80, 305],
      [1428, 220, 143, 177],
      [139, 517, 119, 302],
      [420, 534, 89, 277],
      [615, 641, 156, 147],
      [926, 518, 117, 301],
      [1204, 538, 85, 273],
      [1399, 653, 156, 134],
    ],
    eyes: [
      [82, 146, 160, 239],
      [331, 150, 156, 237],
      [557, 209, 225, 145],
      [847, 242, 218, 95],
      [1139, 308, 165, 33],
      [1379, 251, 142, 74],
      [1585, 206, 139, 135],
      [111, 568, 90, 172],
      [324, 566, 97, 175],
      [549, 569, 217, 143],
      [852, 609, 183, 83],
      [1137, 663, 154, 32],
      [1379, 615, 132, 74],
      [1575, 580, 119, 121],
    ],
    mouths: [
      [128, 316, 136, 40],
      [549, 221, 101, 168],
      [876, 260, 275, 119],
      [1322, 300, 209, 30],
      [160, 571, 96, 147],
      [505, 597, 205, 101],
      [933, 587, 177, 120],
      [1365, 600, 82, 92],
    ],
  },
  "profile-right": {
    core: [
      [111, 109, 280, 342],
      [495, 236, 229, 217],
      [824, 119, 325, 324],
      [1259, 316, 135, 124],
      [165, 541, 144, 343],
      [484, 541, 143, 343],
      [762, 575, 281, 316],
      [1116, 575, 312, 295],
    ],
    limbs: [
      [134, 85, 101, 314],
      [403, 106, 86, 285],
      [644, 174, 140, 191],
      [937, 85, 100, 314],
      [1204, 107, 84, 284],
      [1424, 179, 136, 193],
      [117, 496, 136, 318],
      [391, 519, 85, 287],
      [630, 641, 164, 149],
      [919, 497, 136, 317],
      [1191, 519, 84, 287],
      [1408, 650, 167, 143],
    ],
    eyes: [
      [88, 162, 151, 227],
      [324, 166, 149, 223],
      [550, 214, 221, 158],
      [848, 257, 196, 97],
      [1129, 320, 157, 26],
      [1378, 261, 128, 72],
      [1580, 209, 137, 133],
      [118, 569, 87, 165],
      [324, 570, 91, 166],
      [552, 583, 197, 128],
      [852, 618, 162, 76],
      [1135, 684, 145, 25],
      [1382, 629, 125, 67],
      [1575, 580, 110, 125],
    ],
    mouths: [
      [192, 277, 100, 38],
      [552, 178, 100, 191],
      [877, 213, 261, 143],
      [1340, 279, 147, 34],
      [193, 575, 89, 140],
      [504, 592, 197, 109],
      [916, 579, 200, 125],
      [1349, 594, 93, 105],
    ],
  },
} as const satisfies Record<
  ProfileView,
  Record<Exclude<SheetId, "lowerFace">, readonly RawRect[]>
>;

const expandRects = (rects: readonly RawRect[]): FrontAtlasSourceRect[] =>
  rects.map(([x, y, width, height]) => ({
    x: x - 8,
    y: y - 8,
    width: width + 16,
    height: height + 16,
  }));

const inspectSource = async (
  view: ProfileView,
  sheetId: SheetId,
  spec: (typeof sourceSpecs)[ProfileView][SheetId],
) => {
  const bytes = await readFile(resolve(candidateRoot, spec.file));
  if (sha256(bytes) !== spec.contentHash)
    throw new Error(`Profile candidate bytes changed: ${spec.file}.`);
  const metadata = await sharp(bytes).metadata();
  if (
    metadata.format !== "png" ||
    metadata.width !== spec.width ||
    metadata.height !== spec.height
  )
    throw new Error(`Profile candidate dimensions changed: ${spec.file}.`);
  const keyed = await removeBorderChromaKey(bytes);
  const canonicalKeyDistance = Math.sqrt(
    (255 - keyed.measuredKey.red) ** 2 +
      keyed.measuredKey.green ** 2 +
      (255 - keyed.measuredKey.blue) ** 2,
  );
  return {
    view,
    sheetId,
    relativeFile: `candidates/${spec.file}`,
    contentHash: spec.contentHash,
    dimensions: { width: spec.width, height: spec.height },
    measuredKey: keyed.measuredKey,
    canonicalKeyDistance,
    maximumCanonicalKeyDistance,
    chromaGatePassed: canonicalKeyDistance <= maximumCanonicalKeyDistance,
  };
};

const observations = [];
for (const view of ["profile-left", "profile-right"] as const)
  for (const sheetId of [
    "core",
    "limbs",
    "eyes",
    "mouths",
    "lowerFace",
  ] as const)
    observations.push(
      await inspectSource(view, sheetId, sourceSpecs[view][sheetId]),
    );

const sourceInput = async (
  view: ProfileView,
  sheetId: Exclude<SheetId, "lowerFace">,
): Promise<ProfileAtlasSourceInput> => {
  const spec = sourceSpecs[view][sheetId];
  const bytes = await readFile(resolve(candidateRoot, spec.file));
  return {
    bytes,
    expectedContentHash: spec.contentHash,
    expectedDimensions: { width: spec.width, height: spec.height },
    maximumMeasuredKeyDistance: 32,
    sourceRects: expandRects(candidateRects[view][sheetId]),
  };
};

const profileInput = async (
  view: ProfileView,
): Promise<KidsBipedV1ProfileAtlasInput> => {
  const baseSpec = sourceSpecs[view].lowerFace;
  const baseBytes = await readFile(resolve(candidateRoot, baseSpec.file));
  return {
    core: await sourceInput(view, "core"),
    limbs: await sourceInput(view, "limbs"),
    eyes: await sourceInput(view, "eyes"),
    mouths: await sourceInput(view, "mouths"),
    lowerFace: {
      base: {
        bytes: baseBytes,
        expectedContentHash: baseSpec.contentHash,
        expectedDimensions: {
          width: baseSpec.width,
          height: baseSpec.height,
        },
        maximumMeasuredKeyDistance: 32,
      },
      baseSourceRect: { x: 300, y: 360, width: 850, height: 470 },
      pivot: { x: 425, y: 235 },
      noseAnchor:
        view === "profile-left" ? { x: 80, y: 90 } : { x: 770, y: 90 },
      mouthChangeBounds:
        view === "profile-left"
          ? { x: 240, y: 160, width: 320, height: 220 }
          : { x: 190, y: 116, width: 320, height: 208 },
    },
  };
};

const failClosedChecks = [];
for (const view of ["profile-left", "profile-right"] as const) {
  let message = "";
  try {
    await composeKidsBipedV1ProfileAtlases(view, await profileInput(view));
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  if (!/not the declared #ff00ff background/i.test(message))
    throw new Error(
      `${view} did not fail closed at the 32px canonical-key gate: ${message}`,
    );
  failClosedChecks.push({ view, rejected: true as const, message });
}

const chromaRejections = observations.filter(
  ({ chromaGatePassed }) => !chromaGatePassed,
);
if (
  chromaRejections.map(({ relativeFile }) => relativeFile).join(",") !==
  [
    "candidates/ollo-parts-profile-left-core-candidate-g-chroma.png",
    "candidates/ollo-parts-profile-left-limbs-candidate-g-chroma.png",
    "candidates/ollo-parts-profile-right-limbs-candidate-g-chroma.png",
    "candidates/ollo-face-profile-right-lower-base-candidate-g-chroma.png",
  ].join(",")
)
  throw new Error("Profile candidate G chroma rejection set changed.");

const evidenceDraft = {
  schemaVersion: "1.0" as const,
  evidenceId: "kcast-001d-ollo-profile-source-candidate-g-rejection",
  observedAt,
  classification: "source-candidate-diagnostic-only" as const,
  verdict: "rejected" as const,
  declaredInventories: {
    partsPerProfile: 20,
    faceRolesPerProfile: 22,
    sourceRectangleMode: "sealed-source-rects" as const,
    deterministicCompositorImplemented: true as const,
    inventorySemanticsAccepted: false as const,
  },
  chromaGate: {
    expectedKey: "#ff00ff" as const,
    maximumCanonicalKeyDistance,
    observations,
    rejectedSources: chromaRejections.map(({ relativeFile }) => relativeFile),
    failClosedChecks,
  },
  visualRoleAudit: {
    passed: false as const,
    rejections: [
      {
        views: ["profile-left", "profile-right"] as const,
        role: "secondary-front" as const,
        reason:
          "Both core sheets use a full frontal apron; a profile rig requires a foreshortened view-specific apron layer.",
      },
      {
        views: ["profile-right"] as const,
        role: "eye, lid, and brow overlays" as const,
        reason:
          "The profile-right eye, lid, and brow sheet retains profile-left near/far anatomy and asymmetric feature handedness; it must be reauthored for a genuine right-facing construction.",
      },
      {
        views: ["profile-right"] as const,
        role: "mouth overlays" as const,
        reason:
          "The profile-right mouth set retains the same handedness as profile-left and must be reauthored for the right-facing muzzle.",
      },
    ],
  },
  publicationGate: {
    derivedProfileAtlasesCreated: false as const,
    lowerFaceDiagnosticsCreated: false as const,
    importReceiptCreated: false as const,
    preparedManifestCreated: false as const,
    providerAuthority: false as const,
    preparationAuthority: false as const,
    approvalGranted: false as const,
    productionBindable: false as const,
    regenerationRequired: true as const,
  },
};
const evidence = {
  ...evidenceDraft,
  contentHash: hashCanonical(evidenceDraft),
};
const evidenceFile = resolve(
  evidenceRoot,
  "ollo-profile-source-candidate-g-rejection-evidence.json",
);
const evidenceBytes = Buffer.from(
  await format(JSON.stringify(evidence), { parser: "json" }),
);
await mkdir(evidenceRoot, { recursive: true });
try {
  const existing = await readFile(evidenceFile);
  if (!existing.equals(evidenceBytes))
    throw new Error(
      "Profile rejection evidence collides with different bytes.",
    );
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  await writeFile(evidenceFile, evidenceBytes, { flag: "wx" });
}

process.stdout.write(
  `${JSON.stringify(
    {
      verdict:
        "REJECTED: candidate G fails the 32px chroma ceiling and view-specific visual-role audit; no profile atlas or rig authority was created.",
      evidenceContentHash: evidence.contentHash,
      rejectedSources: evidence.chromaGate.rejectedSources,
      visualRoleRejections: evidence.visualRoleAudit.rejections,
      derivedProfileAtlasesCreated: false,
      importReceiptCreated: false,
      preparedManifestCreated: false,
      productionBindable: false,
    },
    null,
    2,
  )}\n`,
);
