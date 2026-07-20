import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import {
  compileCandidateRigReviewVisualProgram,
  hashCanonical,
  kidsBipedV1TopologyTemplate,
} from "@storystage/story-engine";
import { createCandidateRigReviewInput } from "./candidate-rig-review-input";
import {
  assertCandidateRigReviewPngMetadata,
  decodeCandidateRigReviewPng,
} from "./candidate-rig-review-raster";
import {
  createOlloCandidateISourceReviewPlan,
  createOlloCandidateIProposedReviewRecipes,
  type OlloCandidateIAtlasMap,
  type OlloCandidateIRegistrationPlan,
} from "./ollo-candidate-i-review-recipes";

const workspaceRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const evidenceRoot = resolve(workspaceRoot, "reports/evidence/KCAST-001");
const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

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

const loadCandidateIFixture = async () => {
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

/** Test-only explicit registration. Production code has no fallback/default. */
const syntheticRegistrationPlans = (
  fixture: Awaited<ReturnType<typeof loadCandidateIFixture>>,
): OlloCandidateIRegistrationPlan[] => {
  const request = fixture.request as {
    contentHash: string;
    identityLock: { contentHash: string };
    rigProfile: { templateContentHash: string };
  };
  const bundle = fixture.bundle as { contentHash: string };
  const report = fixture.stagingReport as { contentHash: string };
  const receipt = fixture.importReceipt as { contentHash: string };
  return (["front", "profile-left", "profile-right"] as const).map((view) => {
    const partsAtlas = fixture.atlasMaps.find(
      (atlas) => atlas.view === view && atlas.kind === "parts-kit",
    )!;
    const faceAtlas = fixture.atlasMaps.find(
      (atlas) => atlas.view === view && atlas.kind === "face-kit",
    )!;
    const componentByRole = new Map(
      [partsAtlas, faceAtlas].flatMap((atlas) =>
        atlas.components.map(
          (component) => [component.role, component] as const,
        ),
      ),
    );
    const center = (role: string) => {
      const cell = componentByRole.get(role)!.atlasCell;
      return {
        x: Math.floor((cell.width + 16) / 2),
        y: Math.floor((cell.height + 16) / 2),
      };
    };
    const draft = {
      schemaVersion: "1.0" as const,
      authorityDomain: "source-review-registration-input" as const,
      registrationState: "proposed" as const,
      view,
      requestContentHash: request.contentHash,
      candidateBundleContentHash: bundle.contentHash,
      stagingReportContentHash: report.contentHash,
      importReceiptContentHash: receipt.contentHash,
      identityLockContentHash: request.identityLock.contentHash,
      topologyTemplateContentHash: request.rigProfile.templateContentHash,
      atlasMapContentHashes: {
        parts: partsAtlas.mapContentHash,
        face: faceAtlas.mapContentHash,
      },
      parts: kidsBipedV1TopologyTemplate.parts
        .map((part, zIndex) => ({
          role: part.role,
          childPivot: center(part.role),
          parentJoint: part.parentRole ? center(part.parentRole) : null,
          restTransform: {
            x: zIndex,
            y: -zIndex,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
          },
          sockets: kidsBipedV1TopologyTemplate.parts
            .filter((child) => child.parentRole === part.role)
            .map((child) => ({
              id: child.parentSocketId!,
              position: center(part.role),
            }))
            .sort((left, right) => left.id.localeCompare(right.id)),
          zIndex,
        }))
        .sort((left, right) => left.role.localeCompare(right.role)),
      exposures: kidsBipedV1TopologyTemplate.exposures
        .map((exposure) => ({
          role: exposure.role,
          childPivot: center(exposure.targetRole),
        }))
        .sort((left, right) => left.role.localeCompare(right.role)),
      approvalRequired: true as const,
      productionBindable: false as const,
    };
    return { ...draft, contentHash: hashCanonical(draft) };
  });
};

const buildRecipes = async () => {
  const fixture = await loadCandidateIFixture();
  const registrationPlans = syntheticRegistrationPlans(fixture);
  const recipes = createOlloCandidateIProposedReviewRecipes({
    ...fixture,
    registrationPlans,
  });
  return { fixture, registrationPlans, recipes };
};

const createStaging = async (
  fixture: Awaited<ReturnType<typeof loadCandidateIFixture>>,
) => {
  const root = await mkdtemp(join(tmpdir(), "storystage-candidate-review-"));
  roots.push(root);
  const trustedStagingRoot = join(root, "trusted");
  const stagingRoot = join(trustedStagingRoot, "candidate-i");
  const characterRigRoot = join(stagingRoot, "character-rig");
  const candidatesRoot = join(characterRigRoot, "candidates");
  await mkdir(candidatesRoot, { recursive: true });
  const bundle = fixture.bundle as {
    assets: Array<{
      candidateId: string;
      requestItemId: string;
      relativeFile: string;
      contentHash: string;
    }>;
  };
  for (const asset of bundle.assets.filter(
    (candidate) => candidate.requestItemId !== "turnaround-sheet",
  )) {
    const bytes = await readFile(resolve(evidenceRoot, asset.relativeFile));
    await writeFile(join(candidatesRoot, `${asset.contentHash}.png`), bytes);
  }
  return { root, trustedStagingRoot, stagingRoot };
};

describe("Candidate I source-review-only foundation", () => {
  it("derives the exact private render plan without accepting parallel recipe authority", async () => {
    const { fixture, registrationPlans, recipes } = await buildRecipes();
    const plan = createOlloCandidateISourceReviewPlan({
      ...fixture,
      registrationPlans,
    });
    expect(plan.status).toBe("ready-for-private-source-review-render");
    expect(plan.views.map((view) => view.view)).toEqual([
      "front",
      "profile-left",
      "profile-right",
    ]);
    expect(plan.views.map((view) => view.recipe.contentHash)).toEqual(
      recipes.map((recipe) => recipe.contentHash),
    );
    expect(plan.providerAuthority).toBe(false);
    expect(plan.approvalAuthority).toBe(false);
    expect(plan.productionBindable).toBe(false);

    const substituted = createOlloCandidateISourceReviewPlan({
      ...fixture,
      registrationPlans,
      recipes: [{ contentHash: hashCanonical("attacker-recipe") }],
      programs: [{ contentHash: hashCanonical("attacker-program") }],
    } as Parameters<typeof createOlloCandidateISourceReviewPlan>[0] & {
      recipes: unknown[];
      programs: unknown[];
    });
    expect(substituted).toEqual(plan);
  });

  it("requires explicit hash-bound registration and is deterministic under atlas role reorder", async () => {
    const fixture = await loadCandidateIFixture();
    expect(() => createOlloCandidateIProposedReviewRecipes(fixture)).toThrow(
      /explicit hash-bound registration/i,
    );
    const registrationPlans = syntheticRegistrationPlans(fixture);
    const first = createOlloCandidateIProposedReviewRecipes({
      ...fixture,
      registrationPlans,
    });
    const reordered = createOlloCandidateIProposedReviewRecipes({
      ...fixture,
      atlasMaps: fixture.atlasMaps.map((atlas) => ({
        ...atlas,
        components: [...atlas.components].reverse(),
      })),
      registrationPlans,
    });
    expect(reordered.map((recipe) => recipe.contentHash)).toEqual(
      first.map((recipe) => recipe.contentHash),
    );
    expect(first.map((recipe) => recipe.view)).toEqual([
      "front",
      "profile-left",
      "profile-right",
    ]);
    expect(first.every((recipe) => recipe.state === "proposed")).toBe(true);
    expect(
      first.every((recipe) =>
        [...recipe.parts, ...recipe.exposures].every(
          (component) => component.source.matte.mode === "existing-alpha",
        ),
      ),
    ).toBe(true);
  });

  it("fails closed on stale receipt, component map, wrong view, and attempted re-chroma", async () => {
    const fixture = await loadCandidateIFixture();
    const registrationPlans = syntheticRegistrationPlans(fixture);
    const staleReceiptDraft: Record<string, unknown> = {
      ...(fixture.importReceipt as Record<string, unknown>),
      importId: "stale-import",
    };
    delete staleReceiptDraft.contentHash;
    const staleReceipt = {
      ...staleReceiptDraft,
      contentHash: hashCanonical(staleReceiptDraft),
    };
    expect(() =>
      createOlloCandidateIProposedReviewRecipes({
        ...fixture,
        importReceipt: staleReceipt,
        registrationPlans,
      }),
    ).toThrow(/exact mechanical import lineage/i);
    expect(() =>
      createOlloCandidateIProposedReviewRecipes({
        ...fixture,
        atlasMaps: fixture.atlasMaps.map((atlas, index) =>
          index === 0
            ? {
                ...atlas,
                components: atlas.components.map((component, componentIndex) =>
                  componentIndex === 0
                    ? {
                        ...component,
                        atlasCell: {
                          ...component.atlasCell,
                          x: component.atlasCell.x + 1,
                        },
                      }
                    : component,
                ),
              }
            : atlas,
        ),
        registrationPlans,
      }),
    ).toThrow(/component map/i);
    expect(() =>
      createOlloCandidateIProposedReviewRecipes({
        ...fixture,
        atlasMaps: fixture.atlasMaps.map((atlas, index) =>
          index === 0 ? { ...atlas, view: "profile-left" } : atlas,
        ),
        registrationPlans,
      }),
    ).toThrow(/one exact parts\/face atlas/i);
    expect(() =>
      createOlloCandidateIProposedReviewRecipes({
        ...fixture,
        atlasMaps: fixture.atlasMaps.map((atlas, index) =>
          index === 0
            ? { ...atlas, matteMode: "chroma-key" as "existing-alpha" }
            : atlas,
        ),
        registrationPlans,
      }),
    ).toThrow(/re-chroma is forbidden/i);
  });

  it("reopens exact atlases only in memory and publishes no prepared output", async () => {
    const { fixture, registrationPlans, recipes } = await buildRecipes();
    const staging = await createStaging(fixture);
    for (const recipe of recipes) {
      const program = compileCandidateRigReviewVisualProgram(
        fixture.request,
        fixture.bundle,
        fixture.stagingReport,
        fixture.importReceipt,
        recipe,
      );
      const review = await createCandidateRigReviewInput({
        ...fixture,
        recipe,
        reviewProgram: program,
        registrationPlan: registrationPlans.find(
          (plan) => plan.view === recipe.view,
        ),
        ...staging,
      });
      expect(review.view).toBe(recipe.view);
      expect(review.authority).toBe("candidate-source-review");
      expect(review.ephemeral).toBe(true);
      expect(review.productionBindable).toBe(false);
      expect(review.atlases).toHaveLength(2);
      expect(
        review.atlases.every(
          (atlas) => atlas.status === "mechanically-verified-unapproved",
        ),
      ).toBe(true);
      expect(review.atlases.every((atlas) => atlas.transform === "none")).toBe(
        true,
      );
      expect(review.atlases.every((atlas) => atlas.rgbaPixels.length > 0)).toBe(
        true,
      );
    }
    await expect(
      access(join(staging.stagingRoot, "character-rig", "prepared")),
    ).rejects.toBeDefined();
  });

  it("rejects mirrored/tampered bytes and a forged review-program view", async () => {
    const { fixture, registrationPlans, recipes } = await buildRecipes();
    const staging = await createStaging(fixture);
    const recipe = recipes[1]!;
    const program = compileCandidateRigReviewVisualProgram(
      fixture.request,
      fixture.bundle,
      fixture.stagingReport,
      fixture.importReceipt,
      recipe,
    );
    const forgedDraft = { ...program, view: "profile-right" as const };
    delete (forgedDraft as Partial<typeof forgedDraft>).contentHash;
    const forgedProgram = {
      ...forgedDraft,
      contentHash: hashCanonical(forgedDraft),
    };
    await expect(
      createCandidateRigReviewInput({
        ...fixture,
        recipe,
        reviewProgram: forgedProgram,
        registrationPlan: registrationPlans.find(
          (plan) => plan.view === recipe.view,
        ),
        ...staging,
      }),
    ).rejects.toThrow(/exact compiler output/i);

    const source = recipe.parts[0]!.source;
    const file = join(
      staging.stagingRoot,
      "character-rig",
      "candidates",
      `${source.stagedContentHash}.png`,
    );
    const mirrored = await sharp(await readFile(file))
      .flop()
      .png({
        compressionLevel: 9,
        adaptiveFiltering: false,
        palette: false,
        effort: 10,
      })
      .toBuffer();
    await writeFile(file, mirrored);
    await expect(
      createCandidateRigReviewInput({
        ...fixture,
        recipe,
        reviewProgram: program,
        registrationPlan: registrationPlans.find(
          (plan) => plan.view === recipe.view,
        ),
        ...staging,
      }),
    ).rejects.toThrow(/byte length|changed after import/i);
  });

  it("keeps the asset review input free of Mara/capability imports", async () => {
    const source = await readFile(
      resolve(
        dirname(fileURLToPath(import.meta.url)),
        "candidate-rig-review-input.ts",
      ),
      "utf8",
    );
    expect(source).not.toMatch(/mara/i);
    expect(source).not.toMatch(/capability/i);
  });

  it("behaviorally rejects non-PNG and multi-page review rasters", async () => {
    const webp = await sharp({
      create: {
        width: 8,
        height: 8,
        channels: 4,
        background: { r: 32, g: 64, b: 96, alpha: 1 },
      },
    })
      .webp()
      .toBuffer();
    await expect(
      decodeCandidateRigReviewPng(webp, { width: 8, height: 8 }, 64),
    ).rejects.toThrow(/single-page PNG/i);
    expect(() =>
      assertCandidateRigReviewPngMetadata(
        { format: "png", pages: 2, width: 8, height: 8 },
        { width: 8, height: 8 },
      ),
    ).toThrow(/single-page PNG/i);
  });

  it("rejects unknown authority claims in registration inputs", async () => {
    const fixture = await loadCandidateIFixture();
    const registrationPlans = syntheticRegistrationPlans(fixture);
    expect(() =>
      createOlloCandidateIProposedReviewRecipes({
        ...fixture,
        registrationPlans: registrationPlans.map((plan, index) =>
          index === 0
            ? ({
                ...plan,
                humanReviewApproved: true,
              } as OlloCandidateIRegistrationPlan)
            : plan,
        ),
      }),
    ).toThrow(/unrecognized key/i);
  });

  it("rejects noncanonical role and socket order in registration inputs", async () => {
    const fixture = await loadCandidateIFixture();
    const registrationPlans = syntheticRegistrationPlans(fixture);
    const reordered = structuredClone(registrationPlans);
    reordered[0]!.parts.reverse();
    const draft = {
      ...reordered[0]!,
    } as Partial<OlloCandidateIRegistrationPlan>;
    delete draft.contentHash;
    reordered[0] = {
      ...draft,
      contentHash: hashCanonical(draft),
    } as OlloCandidateIRegistrationPlan;
    expect(() =>
      createOlloCandidateIProposedReviewRecipes({
        ...fixture,
        registrationPlans: reordered,
      }),
    ).toThrow(/part roles must be unique and canonically ordered/i);

    const socketPlan = structuredClone(registrationPlans);
    const partWithSockets = socketPlan[0]!.parts.find(
      (part) => part.sockets.length > 1,
    )!;
    partWithSockets.sockets.reverse();
    const socketDraft = {
      ...socketPlan[0]!,
    } as Partial<OlloCandidateIRegistrationPlan>;
    delete socketDraft.contentHash;
    socketPlan[0] = {
      ...socketDraft,
      contentHash: hashCanonical(socketDraft),
    } as OlloCandidateIRegistrationPlan;
    expect(() =>
      createOlloCandidateIProposedReviewRecipes({
        ...fixture,
        registrationPlans: socketPlan,
      }),
    ).toThrow(/socket ids .* must be unique and canonically ordered/i);
  });
});
