import { createHash } from "node:crypto";
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
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hashCanonical } from "@storystage/story-engine";
import {
  candidateRigAuthoredDecorationMaskManifestSchema,
  candidateRigAuthoredIsolatedMaskEvidenceSchema,
  type CandidateRigAuthoredDecorationMaskManifest,
  type CandidateRigAuthoredIsolatedMaskEvidence,
} from "@storystage/story-engine/private-candidate-rig-registration";
import { createCandidateRigAuthoredDecorationMaskSourceInput } from "./candidate-rig-authored-decoration-mask-input";
import { createCandidateRigAuthoredIsolatedMaskMeasurement } from "./candidate-rig-authored-isolated-mask-measurement";
import { createCandidateRigExactAttachmentMeasurement } from "./candidate-rig-exact-attachment-measurement";
import {
  createCandidateRigReviewInput,
  type CandidateRigReviewRuntimeInput,
} from "./candidate-rig-review-input";
import type {
  OlloCandidateIReviewRecipeInput,
  OlloCandidateISourceReviewPlan,
} from "./ollo-candidate-i-review-recipes";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const evidenceRoot = join(repoRoot, "reports/evidence/KCAST-001");
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

const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

const rehashManifest = (
  manifest: CandidateRigAuthoredDecorationMaskManifest,
) => {
  const { contentHash: ignored, ...draft } = manifest;
  void ignored;
  return candidateRigAuthoredDecorationMaskManifestSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
};

const exactCrop = (
  review: CandidateRigReviewRuntimeInput,
  component: {
    sourceCandidateId: string;
    sourceRect: { x: number; y: number; width: number; height: number };
  },
) => {
  const atlas = review.atlases.find(
    (candidate) => candidate.candidateId === component.sourceCandidateId,
  )!;
  const rgba = Buffer.alloc(
    component.sourceRect.width * component.sourceRect.height * 4,
  );
  for (let y = 0; y < component.sourceRect.height; y += 1) {
    const sourceStart =
      ((component.sourceRect.y + y) * atlas.width + component.sourceRect.x) * 4;
    atlas.rgbaPixels.copy(
      rgba,
      y * component.sourceRect.width * 4,
      sourceStart,
      sourceStart + component.sourceRect.width * 4,
    );
  }
  return rgba;
};

describe("authored Ollo decoration-mask source input", () => {
  let root = "";
  let stagingRoot = "";
  let privateMaskRoot = "";
  let sourceInput: {
    evidence: OlloCandidateIReviewRecipeInput;
    sourceReviewPlan: OlloCandidateISourceReviewPlan;
  };
  let manifest: CandidateRigAuthoredDecorationMaskManifest;
  const fixtures = new Map<
    string,
    {
      view: OlloCandidateISourceReviewPlan["views"][number];
      review: CandidateRigReviewRuntimeInput;
      baseMeasurement: Awaited<
        ReturnType<typeof createCandidateRigExactAttachmentMeasurement>
      >;
    }
  >();

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), "storystage-authored-masks-"));
    stagingRoot = join(root, "staging");
    privateMaskRoot = join(root, "mask-root");
    sourceInput = JSON.parse(
      await readFile(
        join(evidenceRoot, "ollo-candidate-i-source-review-render-input.json"),
        "utf8",
      ),
    ) as typeof sourceInput;
    manifest = candidateRigAuthoredDecorationMaskManifestSchema.parse(
      JSON.parse(
        await readFile(
          join(evidenceRoot, "ollo-authored-decoration-mask-manifest-v10.json"),
          "utf8",
        ),
      ),
    );
    for (const file of (
      sourceInput.evidence.importReceipt as {
        files: Array<{ candidateId: string; stagedRelativeFile: string }>;
      }
    ).files) {
      const source = exactSources[file.candidateId];
      if (!source) continue;
      const target = join(stagingRoot, file.stagedRelativeFile);
      await mkdir(dirname(target), { recursive: true });
      await copyFile(join(evidenceRoot, "derived", source), target);
    }
    for (const entry of manifest.entries) {
      const target = join(privateMaskRoot, entry.maskRelativeFile);
      await mkdir(dirname(target), { recursive: true });
      await copyFile(join(evidenceRoot, entry.maskRelativeFile), target);
    }
    for (const view of sourceInput.sourceReviewPlan.views) {
      const review = await createCandidateRigReviewInput({
        request: sourceInput.evidence.request,
        bundle: sourceInput.evidence.bundle,
        stagingReport: sourceInput.evidence.stagingReport,
        importReceipt: sourceInput.evidence.importReceipt,
        recipe: view.recipe,
        reviewProgram: view.program,
        registrationPlan: view.registrationPlan,
        trustedStagingRoot: root,
        stagingRoot,
      });
      fixtures.set(view.view, {
        view,
        review,
        baseMeasurement: await createCandidateRigExactAttachmentMeasurement({
          review,
          recipe: view.recipe,
        }),
      });
    }
  }, 45_000);

  afterAll(async () => {
    if (root) await rm(root, { recursive: true, force: true });
  });

  const build = (
    nativeView: "front" | "profile-left" | "profile-right",
    inputManifest: unknown = manifest,
    manifestRoot: string = evidenceRoot,
    exactSourceInput: unknown = sourceInput,
  ) => {
    const fixture = fixtures.get(nativeView)!;
    return createCandidateRigAuthoredDecorationMaskSourceInput({
      review: fixture.review,
      recipe: fixture.view.recipe,
      baseMeasurement: fixture.baseMeasurement,
      sourceReviewInput: exactSourceInput,
      manifest: inputManifest,
      manifestRoot,
    });
  };

  it("compiles all six actual-art masks while changing only explicitly selected guide pixels", async () => {
    const hashes: string[] = [];
    for (const nativeView of [
      "front",
      "profile-left",
      "profile-right",
    ] as const) {
      const fixture = fixtures.get(nativeView)!;
      const source = await build(nativeView);
      expect(source.authoredMasks).toHaveLength(2);
      expect(source).toMatchObject({
        sourceMeasuredBeforeMasking: true,
        providerAuthority: false,
        approvalAuthority: false,
        capabilityAuthority: false,
        productionBindable: false,
      });
      for (const authored of source.authoredMasks) {
        const evidence =
          authored.evidence as CandidateRigAuthoredIsolatedMaskEvidence;
        const component = fixture.baseMeasurement.components.find(
          (candidate) => candidate.componentId === evidence.componentId,
        )!;
        const original = exactCrop(fixture.review, component);
        const selected = new Set(
          evidence.guideTabMask.runs.flatMap((run) =>
            Array.from(
              { length: run.length },
              (_, offset) =>
                run.y * evidence.guideTabMask.width + run.x + offset,
            ),
          ),
        );
        let changedOutsideMask = 0;
        let retainedInsideMask = 0;
        for (let pixel = 0; pixel < original.length / 4; pixel += 1)
          for (let channel = 0; channel < 4; channel += 1) {
            const actual = authored.maskedRgbaPixels[pixel * 4 + channel];
            if (selected.has(pixel)) {
              if (actual !== 0) retainedInsideMask += 1;
            } else if (actual !== original[pixel * 4 + channel])
              changedOutsideMask += 1;
          }
        expect({ changedOutsideMask, retainedInsideMask }).toEqual({
          changedOutsideMask: 0,
          retainedInsideMask: 0,
        });
        expect(evidence).toMatchObject({
          schemaVersion: "1.1",
          sourceManifestContentHash: manifest.contentHash,
          sourceMeasuredBeforeMasking: true,
          providerAuthority: false,
          approvalAuthority: false,
          capabilityAuthority: false,
          productionBindable: false,
        });
      }
      const measurement = createCandidateRigAuthoredIsolatedMaskMeasurement({
        review: fixture.review,
        recipe: fixture.view.recipe,
        baseMeasurement: fixture.baseMeasurement,
        authoredMasks: source.authoredMasks,
      });
      expect(measurement.authoredMaskCompiler).toMatchObject({
        version: "1.1.0",
        sourceManifestContentHashes: [manifest.contentHash],
        providerAuthority: false,
        approvalAuthority: false,
        capabilityAuthority: false,
        productionBindable: false,
      });
      for (const role of ["secondary-front", "secondary-back"])
        expect(
          measurement.requirements.find(
            (requirement) =>
              requirement.requirementId === `${nativeView}-${role}-mask`,
          )?.outcome.status,
        ).toBe("detected");
      hashes.push(measurement.contentHash);
    }
    expect(new Set(hashes).size).toBe(3);
  }, 90_000);

  it("permits zero v1.1 lineage fields in v1.0 but rejects every partial downgraded variant at schema and compiler", async () => {
    const fixture = fixtures.get("front")!;
    const source = await build("front");
    const authored = source.authoredMasks[0]!;
    const evidence =
      authored.evidence as CandidateRigAuthoredIsolatedMaskEvidence;
    const lineageFields = [
      "sourceManifestContentHash",
      "guideMaskPngContentHash",
      "authoredRegionsContentHash",
      "sentinelsContentHash",
    ] as const;
    const v10Draft = structuredClone(evidence) as Record<string, unknown>;
    delete v10Draft.contentHash;
    v10Draft.schemaVersion = "1.0";
    for (const field of lineageFields) delete v10Draft[field];
    const v10Evidence = {
      ...v10Draft,
      contentHash: hashCanonical(v10Draft),
    };
    expect(
      candidateRigAuthoredIsolatedMaskEvidenceSchema.parse(v10Evidence)
        .schemaVersion,
    ).toBe("1.0");
    expect(() =>
      createCandidateRigAuthoredIsolatedMaskMeasurement({
        review: fixture.review,
        recipe: fixture.view.recipe,
        baseMeasurement: fixture.baseMeasurement,
        authoredMasks: [
          {
            evidence: v10Evidence,
            maskedRgbaPixels: authored.maskedRgbaPixels,
          },
        ],
      }),
    ).not.toThrow();

    for (const retainedFieldCount of [1, 2, 3]) {
      const downgradedDraft = structuredClone(v10Draft);
      for (const field of lineageFields.slice(0, retainedFieldCount))
        downgradedDraft[field] = evidence[field];
      const downgraded = {
        ...downgradedDraft,
        contentHash: hashCanonical(downgradedDraft),
      };
      expect(() =>
        candidateRigAuthoredIsolatedMaskEvidenceSchema.parse(downgraded),
      ).toThrow(/version 1\.0.*omit all v1\.1 lineage fields/i);
      expect(() =>
        createCandidateRigAuthoredIsolatedMaskMeasurement({
          review: fixture.review,
          recipe: fixture.view.recipe,
          baseMeasurement: fixture.baseMeasurement,
          authoredMasks: [
            {
              evidence: downgraded,
              maskedRgbaPixels: authored.maskedRgbaPixels,
            },
          ],
        }),
      ).toThrow(/rejects partial v1\.1 authored-mask lineage/i);
    }
  }, 30_000);

  it("rejects a rehashed manifest that substitutes one mask PNG hash for another", () => {
    const source = manifest.entries[0]!;
    const target = manifest.entries[1]!;
    const { contentHash: ignored, ...withoutHash } = manifest;
    void ignored;
    const substitutedDraft = {
      ...withoutHash,
      entries: withoutHash.entries.map((entry) =>
        entry.entryId === target.entryId
          ? { ...entry, maskPngContentHash: source.maskPngContentHash }
          : entry,
      ),
    };
    expect(() =>
      candidateRigAuthoredDecorationMaskManifestSchema.parse({
        ...substitutedDraft,
        contentHash: hashCanonical(substitutedDraft),
      }),
    ).toThrow(/distinct.*PNG hashes/i);
  });

  it("rejects PNG dimensions and binary format that drift from the fixed manifest", async () => {
    const entry = manifest.entries.find(
      (candidate) =>
        candidate.view === "front" &&
        candidate.componentRole === "secondary-front",
    )!;
    const original = await readFile(
      join(privateMaskRoot, entry.maskRelativeFile),
    );
    const altered = await sharp(original)
      .extract({
        left: 0,
        top: 0,
        width: entry.maskWidth - 1,
        height: entry.maskHeight,
      })
      .png({ palette: true, colours: 2, compressionLevel: 9 })
      .toBuffer();
    const changedFile =
      "authored-decoration-masks-v10/front-secondary-front-wrong-size.png";
    await writeFile(join(privateMaskRoot, changedFile), altered);
    const changed = rehashManifest({
      ...manifest,
      entries: manifest.entries.map((candidate) =>
        candidate.entryId === entry.entryId
          ? {
              ...candidate,
              maskRelativeFile: changedFile,
              maskPngContentHash: sha256(altered),
            }
          : candidate,
      ),
    });
    await expect(
      build("front", changed, privateMaskRoot),
    ).rejects.toMatchObject({
      code: "invalid-mask-png",
    });
  });

  it("rejects transparent selection even when the added pixel is explicitly region-bound", async () => {
    const entry = manifest.entries.find(
      (candidate) =>
        candidate.view === "front" &&
        candidate.componentRole === "secondary-front",
    )!;
    const original = await readFile(
      join(privateMaskRoot, entry.maskRelativeFile),
    );
    const { data, info } = await sharp(original)
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    data[10 * info.width + 10] = 255;
    const altered = await sharp(data, {
      raw: { width: info.width, height: info.height, channels: 1 },
    })
      .png({ palette: true, colours: 2, compressionLevel: 9 })
      .toBuffer();
    const changedFile =
      "authored-decoration-masks-v10/front-secondary-front-transparent-selection.png";
    await writeFile(join(privateMaskRoot, changedFile), altered);
    const changed = rehashManifest({
      ...manifest,
      entries: manifest.entries.map((candidate) =>
        candidate.entryId === entry.entryId
          ? {
              ...candidate,
              maskRelativeFile: changedFile,
              maskPngContentHash: sha256(altered),
              selectedPixelCount: candidate.selectedPixelCount + 1,
              selectedBounds: {
                x: 10,
                y: 10,
                width:
                  candidate.selectedBounds.x +
                  candidate.selectedBounds.width -
                  10,
                height:
                  candidate.selectedBounds.y +
                  candidate.selectedBounds.height -
                  10,
              },
              authoredRegions: [
                ...candidate.authoredRegions,
                { x: 10, y: 10, width: 1, height: 1 },
              ],
              selectedGuideSeeds: [
                ...candidate.selectedGuideSeeds,
                { x: 10, y: 10 },
              ],
            }
          : candidate,
      ),
    });
    await expect(
      build("front", changed, privateMaskRoot),
    ).rejects.toMatchObject({
      code: "invalid-mask-pixels",
    });
  });

  it("rejects stale seeds, source lineage, source-input lineage, and sentinels", async () => {
    const entry = manifest.entries.find(
      (candidate) =>
        candidate.view === "front" &&
        candidate.componentRole === "secondary-front",
    )!;
    const mutate = (
      change: (
        candidate: CandidateRigAuthoredDecorationMaskManifest["entries"][number],
      ) => CandidateRigAuthoredDecorationMaskManifest["entries"][number],
    ) =>
      rehashManifest({
        ...manifest,
        entries: manifest.entries.map((candidate) =>
          candidate.entryId === entry.entryId ? change(candidate) : candidate,
        ),
      });
    const staleSeed = mutate((candidate) => ({
      ...candidate,
      selectedGuideSeeds: [
        { x: 51, y: 53 },
        ...candidate.selectedGuideSeeds.slice(1),
      ],
    }));
    await expect(build("front", staleSeed)).rejects.toMatchObject({
      code: "invalid-mask-pixels",
    });

    const staleLineage = mutate((candidate) => ({
      ...candidate,
      sourceRgbaContentHash: "a".repeat(64),
    }));
    await expect(build("front", staleLineage)).rejects.toMatchObject({
      code: "lineage-mismatch",
    });

    await expect(
      build("front", manifest, evidenceRoot, { ...sourceInput, drift: true }),
    ).rejects.toMatchObject({ code: "lineage-mismatch" });

    const staleSentinel = mutate((candidate) => ({
      ...candidate,
      retainedSemanticSentinels: [{ x: 10, y: 10 }],
    }));
    await expect(build("front", staleSentinel)).rejects.toMatchObject({
      code: "sentinel-mismatch",
    });
  }, 20_000);
});
