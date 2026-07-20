import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { hashCanonical } from "@storystage/story-engine";
import { createOlloCandidateIProposedRegistrationPlans } from "./ollo-candidate-i-registration-guides";
import type { OlloCandidateIAtlasMap } from "./ollo-candidate-i-review-recipes";

const workspaceRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const evidenceRoot = resolve(workspaceRoot, "reports/evidence/KCAST-001");

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

describe("Candidate I proposed registration guides", () => {
  it("creates deterministic three-view plans from content bounds, not atlas centers", async () => {
    const evidence = await loadEvidence();
    const first = createOlloCandidateIProposedRegistrationPlans(evidence);
    const second = createOlloCandidateIProposedRegistrationPlans(evidence);
    expect(hashCanonical(first)).toBe(hashCanonical(second));
    expect(first.map((plan) => plan.view)).toEqual([
      "front",
      "profile-left",
      "profile-right",
    ]);
    expect(
      first.every(
        (plan) =>
          plan.registrationState === "proposed" &&
          plan.approvalRequired &&
          !plan.productionBindable &&
          plan.parts.length === 29 &&
          plan.exposures.length === 13,
      ),
    ).toBe(true);

    const front = first[0]!;
    const part = (role: string) =>
      front.parts.find((candidate) => candidate.role === role)!;
    expect(part("head").childPivot).toEqual({ x: 168, y: 285 });
    expect(part("torso").childPivot).toEqual({ x: 168, y: 164 });
    expect(part("eye-white-left").childPivot).toEqual({ x: 416, y: 272 });
    // The front parts cell center would be (168, 164). The head's measured
    // proximal tab is deliberately distinct.
    expect(part("head").childPivot).not.toEqual({ x: 168, y: 164 });
    expect(part("torso").restTransform).toMatchObject({
      x: 288,
      y: 575,
      rotation: 0,
      scaleX: 1.1,
      scaleY: 1.1,
    });
    expect(part("tail")).toMatchObject({
      childPivot: { x: 141, y: 201 },
      parentJoint: { x: 244, y: 134 },
      restTransform: { x: 76, y: 35 },
    });
    const profileLeftTail = first[1]!.parts.find(
      (candidate) => candidate.role === "tail",
    );
    expect(profileLeftTail).toMatchObject({
      childPivot: { x: 156, y: 266 },
      parentJoint: { x: 280, y: 180 },
      restTransform: { x: 87, y: 66 },
    });

    for (const plan of first) {
      const byRole = new Map(
        plan.parts.map((candidate) => [candidate.role, candidate]),
      );
      for (const child of plan.parts.filter(
        (candidate) => candidate.parentJoint,
      )) {
        const parent = plan.parts.find((candidate) =>
          candidate.sockets.some(
            (socket) =>
              socket.position.x === child.parentJoint!.x &&
              socket.position.y === child.parentJoint!.y,
          ),
        );
        expect(parent).toBeDefined();
        const socket = parent!.sockets.find(
          (candidate) =>
            candidate.position.x === child.parentJoint!.x &&
            candidate.position.y === child.parentJoint!.y,
        )!;
        expect(child.restTransform.x).toBe(
          socket.position.x - parent!.childPivot.x,
        );
        expect(child.restTransform.y).toBe(
          socket.position.y - parent!.childPivot.y,
        );
      }
      for (const exposure of plan.exposures) {
        const targetRole = exposure.role.startsWith("viseme-")
          ? "mouth-rest"
          : exposure.role.startsWith("brow-raised-")
            ? exposure.role.replace("raised", "neutral")
            : exposure.role.replace(/lid-(half|closed)-/, "lid-open-");
        expect(exposure.childPivot).toEqual(byRole.get(targetRole)!.childPivot);
      }
    }
  });

  it("fails closed when an exact atlas component map is changed", async () => {
    const evidence = await loadEvidence();
    const changed = structuredClone(evidence);
    changed.atlasMaps[0]!.components[0]!.atlasContentBounds.x += 1;
    expect(() =>
      createOlloCandidateIProposedRegistrationPlans(changed),
    ).toThrow(/stale or forged/i);
  });
});
