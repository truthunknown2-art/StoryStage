import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import {
  candidateRigReviewVisualProgramSchema,
  characterRigAssetRequestSchema,
  characterRigCandidateBundleSchema,
  characterRigImportReceiptSchema,
  characterRigPreparationRecipeSchema,
  characterRigStagingReportSchema,
  compileCandidateRigReviewVisualProgram,
  hashCanonical,
  type CandidateRigReviewVisualProgram,
  type CharacterRigPreparationRecipe,
} from "@storystage/story-engine";
import {
  CandidateRigReviewRasterFormatError,
  decodeCandidateRigReviewPng,
} from "./candidate-rig-review-raster";

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_PIXELS = 64_000_000;

export class CandidateRigReviewInputError extends Error {
  public constructor(
    public readonly code:
      | "invalid-evidence"
      | "lineage-mismatch"
      | "untrusted-staging-root"
      | "symlink-rejected"
      | "byte-length-mismatch"
      | "hash-mismatch"
      | "dimension-mismatch"
      | "raster-format-mismatch"
      | "wrong-view"
      | "transform-forbidden"
      | "unsafe-crop"
      | "empty-foreground"
      | "boundary-touch",
    message: string,
  ) {
    super(message);
    this.name = "CandidateRigReviewInputError";
  }
}

export type CreateCandidateRigReviewInput = {
  request: unknown;
  bundle: unknown;
  stagingReport: unknown;
  importReceipt: unknown;
  recipe: unknown;
  reviewProgram: unknown;
  trustedStagingRoot: string;
  stagingRoot: string;
};

export type CandidateRigReviewAtlasHandle = {
  status: "mechanically-verified-unapproved";
  candidateId: string;
  requestItemId: string;
  view: "front" | "profile-left" | "profile-right";
  kind: "parts-kit" | "face-kit";
  contentHash: string;
  byteLength: number;
  width: number;
  height: number;
  channels: 4;
  transform: "none";
  componentIds: string[];
  roleIds: string[];
  rgbaPixels: Buffer;
};

export type CandidateRigReviewRuntimeInput = {
  schemaVersion: "1.0";
  authority: "candidate-source-review";
  view: "front" | "profile-left" | "profile-right";
  preparationRecipeContentHash: string;
  candidateRigReviewVisualProgramContentHash: string;
  program: CandidateRigReviewVisualProgram;
  atlases: CandidateRigReviewAtlasHandle[];
  ephemeral: true;
  providerAuthority: false;
  approvalRequired: true;
  productionBindable: false;
};

const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

const isWithin = (root: string, candidate: string) => {
  const delta = relative(root, candidate);
  return delta === "" || (!delta.startsWith("..") && !isAbsolute(delta));
};

const ensureTrustedRoot = async (
  trustedStagingRoot: string,
  stagingRoot: string,
) => {
  const trusted = resolve(trustedStagingRoot);
  const staging = resolve(stagingRoot);
  if (
    trusted.startsWith("\\\\") ||
    staging.startsWith("\\\\") ||
    !isWithin(trusted, staging)
  )
    throw new CandidateRigReviewInputError(
      "untrusted-staging-root",
      "Candidate review must remain inside a host-owned local staging root.",
    );
  const trustedInfo = await lstat(trusted);
  const stagingInfo = await lstat(staging);
  if (
    trustedInfo.isSymbolicLink() ||
    !trustedInfo.isDirectory() ||
    stagingInfo.isSymbolicLink() ||
    !stagingInfo.isDirectory()
  )
    throw new CandidateRigReviewInputError(
      "symlink-rejected",
      "Candidate review staging roots must be real directories.",
    );
  const canonicalTrusted = await realpath(trusted);
  const canonicalStaging = await realpath(staging);
  if (!isWithin(canonicalTrusted, canonicalStaging))
    throw new CandidateRigReviewInputError(
      "untrusted-staging-root",
      "Candidate review staging resolves outside its trusted root.",
    );
  return canonicalStaging;
};

const readCandidate = async (stagingRoot: string, contentHash: string) => {
  const directory = resolve(stagingRoot, "character-rig", "candidates");
  const file = resolve(directory, `${contentHash}.png`);
  if (!isWithin(stagingRoot, file))
    throw new CandidateRigReviewInputError(
      "untrusted-staging-root",
      "Candidate review source escapes staging.",
    );
  for (const path of [resolve(stagingRoot, "character-rig"), directory, file]) {
    const info = await lstat(path);
    if (info.isSymbolicLink())
      throw new CandidateRigReviewInputError(
        "symlink-rejected",
        "Candidate review source path contains a symbolic link or junction.",
      );
  }
  const info = await lstat(file);
  if (!info.isFile())
    throw new CandidateRigReviewInputError(
      "invalid-evidence",
      "Candidate review source is not a regular file.",
    );
  if (info.size <= 0 || info.size > MAX_FILE_BYTES)
    throw new CandidateRigReviewInputError(
      "byte-length-mismatch",
      "Candidate review source has an invalid byte length.",
    );
  const canonical = await realpath(file);
  if (!isWithin(stagingRoot, canonical))
    throw new CandidateRigReviewInputError(
      "untrusted-staging-root",
      "Candidate review source resolves outside staging.",
    );
  const bytes = await readFile(canonical);
  if (bytes.length !== info.size)
    throw new CandidateRigReviewInputError(
      "byte-length-mismatch",
      "Candidate review source changed while being reopened.",
    );
  return bytes;
};

const inspectCrop = (
  pixels: Buffer,
  atlasWidth: number,
  rect: { x: number; y: number; width: number; height: number },
  componentId: string,
) => {
  let foreground = 0;
  let boundaryTouch = false;
  for (let y = 0; y < rect.height; y += 1)
    for (let x = 0; x < rect.width; x += 1) {
      const alpha = pixels[((rect.y + y) * atlasWidth + rect.x + x) * 4 + 3]!;
      if (alpha > 0) {
        foreground += 1;
        if (x === 0 || y === 0 || x === rect.width - 1 || y === rect.height - 1)
          boundaryTouch = true;
      }
    }
  if (foreground === 0)
    throw new CandidateRigReviewInputError(
      "empty-foreground",
      `Candidate review component ${componentId} has no foreground pixels.`,
    );
  if (boundaryTouch)
    throw new CandidateRigReviewInputError(
      "boundary-touch",
      `Candidate review component ${componentId} touches its crop boundary.`,
    );
};

/**
 * Reopens exact imported candidate atlases for an ephemeral source review.
 * This function never writes files and cannot produce a prepared manifest,
 * approved binding, renderer binding, or production-capable asset handle.
 */
export const createCandidateRigReviewInput = async (
  input: CreateCandidateRigReviewInput,
): Promise<CandidateRigReviewRuntimeInput> => {
  const request = characterRigAssetRequestSchema.parse(input.request);
  const bundle = characterRigCandidateBundleSchema.parse(input.bundle);
  const report = characterRigStagingReportSchema.parse(input.stagingReport);
  const receipt = characterRigImportReceiptSchema.parse(input.importReceipt);
  const recipe = characterRigPreparationRecipeSchema.parse(input.recipe);
  const program = candidateRigReviewVisualProgramSchema.parse(
    input.reviewProgram,
  );
  const expectedProgram = compileCandidateRigReviewVisualProgram(
    request,
    bundle,
    report,
    receipt,
    recipe,
  );
  if (hashCanonical(program) !== hashCanonical(expectedProgram))
    throw new CandidateRigReviewInputError(
      "lineage-mismatch",
      "Candidate review program is not the exact compiler output for its recipe.",
    );
  if (receipt.providerAuthority || !receipt.approvalRequired)
    throw new CandidateRigReviewInputError(
      "invalid-evidence",
      "Candidate review requires unapproved mechanical import evidence.",
    );
  const stagingRoot = await ensureTrustedRoot(
    input.trustedStagingRoot,
    input.stagingRoot,
  );
  const stagedByCandidate = new Map(
    report.assets.map((asset) => [asset.candidateId, asset]),
  );
  const receiptByCandidate = new Map(
    receipt.files.map((file) => [file.candidateId, file]),
  );
  const requestItems = new Map(request.items.map((item) => [item.id, item]));
  const componentsByCandidate = new Map<
    string,
    Array<
      | CharacterRigPreparationRecipe["parts"][number]
      | CharacterRigPreparationRecipe["exposures"][number]
    >
  >();
  for (const component of [...recipe.parts, ...recipe.exposures]) {
    if (component.source.matte.mode !== "existing-alpha")
      throw new CandidateRigReviewInputError(
        "transform-forbidden",
        "Candidate review accepts existing-alpha crops only; re-chroma/transform paths are forbidden.",
      );
    componentsByCandidate.set(component.source.candidateId, [
      ...(componentsByCandidate.get(component.source.candidateId) ?? []),
      component,
    ]);
  }
  const atlases: CandidateRigReviewAtlasHandle[] = [];
  for (const candidateId of [...componentsByCandidate.keys()].sort()) {
    const staged = stagedByCandidate.get(candidateId);
    const imported = receiptByCandidate.get(candidateId);
    const components = componentsByCandidate.get(candidateId)!;
    const requestItemId = components[0]!.source.requestItemId;
    const requestItem = requestItems.get(requestItemId);
    if (
      !staged ||
      !imported ||
      !requestItem ||
      requestItem.kind === "turnaround-sheet" ||
      requestItem.view !== recipe.view ||
      staged.requestItemId !== requestItemId ||
      imported.requestItemId !== requestItemId ||
      staged.alphaClass !== "mixed-alpha"
    )
      throw new CandidateRigReviewInputError(
        "wrong-view",
        `Candidate review source ${candidateId} is not an exact ${recipe.view} mixed-alpha atlas.`,
      );
    if (
      staged.relativeFile !==
        `character-rig/candidates/${staged.stagedContentHash}.png` ||
      imported.stagedRelativeFile !== staged.relativeFile ||
      imported.sourceContentHash !== staged.stagedContentHash
    )
      throw new CandidateRigReviewInputError(
        "lineage-mismatch",
        `Candidate review source ${candidateId} is not content addressed.`,
      );
    for (const component of components) {
      const { rect } = component.source;
      if (
        component.source.requestItemId !== requestItemId ||
        !requestItem.requiredComponents.includes(component.role) ||
        rect.x < 0 ||
        rect.y < 0 ||
        rect.width <= 0 ||
        rect.height <= 0 ||
        rect.x + rect.width > staged.width ||
        rect.y + rect.height > staged.height
      )
        throw new CandidateRigReviewInputError(
          "unsafe-crop",
          `Candidate review component ${component.id} is outside its exact role/crop allowlist.`,
        );
    }
    const bytes = await readCandidate(stagingRoot, staged.stagedContentHash);
    if (
      bytes.length !== staged.byteLength ||
      bytes.length !== imported.byteLength
    )
      throw new CandidateRigReviewInputError(
        "byte-length-mismatch",
        `Candidate review source ${candidateId} changed byte length.`,
      );
    if (sha256(bytes) !== staged.stagedContentHash)
      throw new CandidateRigReviewInputError(
        "hash-mismatch",
        `Candidate review source ${candidateId} changed after import.`,
      );
    let decoded;
    try {
      decoded = await decodeCandidateRigReviewPng(
        bytes,
        { width: staged.width, height: staged.height },
        MAX_PIXELS,
      );
    } catch (error) {
      if (error instanceof CandidateRigReviewRasterFormatError)
        throw new CandidateRigReviewInputError(
          "raster-format-mismatch",
          `Candidate review source ${candidateId} must remain an exact single-page PNG.`,
        );
      throw error;
    }
    if (
      decoded.info.width !== staged.width ||
      decoded.info.height !== staged.height ||
      decoded.info.channels !== 4
    )
      throw new CandidateRigReviewInputError(
        "dimension-mismatch",
        `Candidate review source ${candidateId} no longer matches PNG evidence.`,
      );
    for (const component of components)
      inspectCrop(
        decoded.data,
        decoded.info.width,
        component.source.rect,
        component.id,
      );
    atlases.push({
      status: "mechanically-verified-unapproved",
      candidateId,
      requestItemId,
      view: recipe.view,
      kind: requestItem.kind,
      contentHash: staged.stagedContentHash,
      byteLength: bytes.length,
      width: decoded.info.width,
      height: decoded.info.height,
      channels: 4,
      transform: "none",
      componentIds: components.map((component) => component.id).sort(),
      roleIds: components.map((component) => component.role).sort(),
      rgbaPixels: decoded.data,
    });
  }
  return {
    schemaVersion: "1.0",
    authority: "candidate-source-review",
    view: recipe.view,
    preparationRecipeContentHash: recipe.contentHash,
    candidateRigReviewVisualProgramContentHash: program.contentHash,
    program,
    atlases,
    ephemeral: true,
    providerAuthority: false,
    approvalRequired: true,
    productionBindable: false,
  };
};
