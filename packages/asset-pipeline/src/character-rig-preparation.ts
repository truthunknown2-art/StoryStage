import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import sharp from "sharp";
import {
  characterRigAssetRequestSchema,
  characterRigCandidateBundleSchema,
  characterRigImportReceiptSchema,
  characterRigPreparationRecipeSchema,
  characterRigStagingReportSchema,
  hashCanonical,
  preparedCharacterRigViewManifestDraftSchema,
  preparedCharacterRigViewManifestSchema,
  validateCharacterRigPreparationRecipe,
  validatePreparedCharacterRigViewManifest,
  type CharacterRigImportReceipt,
  type CharacterRigPreparationRecipe,
  type PreparedCharacterRigViewManifest,
  type PreparedCharacterRigViewManifestDraft,
} from "@storystage/story-engine";

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_PIXELS = 64_000_000;
const PROCESSOR_ID = "character-rig-component-preparation" as const;
const PROCESSOR_VERSION = "1.0.0" as const;
const SHARP_VERSION = "0.34.5" as const;

export class CharacterRigPreparationError extends Error {
  public constructor(
    public readonly code:
      | "invalid-evidence"
      | "incomplete-receipt"
      | "lineage-mismatch"
      | "processor-mismatch"
      | "symlink-rejected"
      | "untrusted-staging-root"
      | "byte-length-mismatch"
      | "hash-mismatch"
      | "dimension-mismatch"
      | "unsafe-crop"
      | "empty-foreground"
      | "boundary-touch"
      | "output-collision",
    message: string,
  ) {
    super(message);
    this.name = "CharacterRigPreparationError";
  }
}

export type PrepareCharacterRigViewInput = {
  recipe: CharacterRigPreparationRecipe | unknown;
  trustedStagingRoot: string;
  stagingRoot: string;
  preparedAt: string;
};

const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

const isWithin = (root: string, candidate: string) => {
  const delta = relative(root, candidate);
  return delta === "" || (!delta.startsWith("..") && !isAbsolute(delta));
};

const ensureTrustedStagingRoot = async (
  trustedStagingRoot: string,
  stagingRoot: string,
) => {
  const trusted = resolve(trustedStagingRoot);
  const target = resolve(stagingRoot);
  if (
    trusted.startsWith("\\\\") ||
    target.startsWith("\\\\") ||
    !isWithin(trusted, target)
  )
    throw new CharacterRigPreparationError(
      "untrusted-staging-root",
      "Character rig preparation must remain inside a host-owned local staging root.",
    );
  const trustedInfo = await lstat(trusted);
  if (trustedInfo.isSymbolicLink() || !trustedInfo.isDirectory())
    throw new CharacterRigPreparationError(
      "symlink-rejected",
      "Trusted character rig staging root must be a real directory.",
    );
  const canonicalTrusted = await realpath(trusted);
  const targetInfo = await lstat(target);
  if (targetInfo.isSymbolicLink() || !targetInfo.isDirectory())
    throw new CharacterRigPreparationError(
      "symlink-rejected",
      "Character rig staging root must be a real directory.",
    );
  const canonicalTarget = await realpath(target);
  if (!isWithin(canonicalTrusted, canonicalTarget))
    throw new CharacterRigPreparationError(
      "untrusted-staging-root",
      "Character rig staging root resolves outside its trusted root.",
    );
  return canonicalTarget;
};

const ensureRealDirectory = async (
  stagingRoot: string,
  segments: string[],
  createMissing: boolean,
) => {
  const canonicalRoot = await realpath(stagingRoot);
  let cursor = canonicalRoot;
  for (const segment of segments) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(segment))
      throw new CharacterRigPreparationError(
        "untrusted-staging-root",
        "Character rig preparation derived an unsafe directory name.",
      );
    const next = resolve(cursor, segment);
    if (!isWithin(canonicalRoot, next))
      throw new CharacterRigPreparationError(
        "untrusted-staging-root",
        "Character rig preparation path escapes its staging root.",
      );
    if (createMissing) {
      try {
        await mkdir(next, { mode: 0o700 });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      }
    }
    const info = await lstat(next);
    if (info.isSymbolicLink() || !info.isDirectory())
      throw new CharacterRigPreparationError(
        "symlink-rejected",
        "Character rig preparation path contains a symbolic link or junction.",
      );
    const canonicalNext = await realpath(next);
    if (!isWithin(canonicalRoot, canonicalNext))
      throw new CharacterRigPreparationError(
        "untrusted-staging-root",
        "Character rig preparation directory resolves outside its staging root.",
      );
    cursor = canonicalNext;
  }
  return cursor;
};

const safeTarget = async (
  stagingRoot: string,
  segments: string[],
  fileName: string,
) => {
  const parent = await ensureRealDirectory(stagingRoot, segments, false);
  const target = resolve(parent, fileName);
  const canonicalRoot = await realpath(stagingRoot);
  if (!isWithin(canonicalRoot, target))
    throw new CharacterRigPreparationError(
      "untrusted-staging-root",
      "Character rig preparation target escapes its staging root.",
    );
  return target;
};

const readEvidence = async (
  stagingRoot: string,
  segments: string[],
  fileName: string,
  maximumBytes = 8_000_000,
) => {
  const target = await safeTarget(stagingRoot, segments, fileName);
  const info = await lstat(target);
  if (info.isSymbolicLink() || !info.isFile())
    throw new CharacterRigPreparationError(
      "symlink-rejected",
      `Character rig evidence is not a real file: ${fileName}.`,
    );
  if (info.size <= 0 || info.size > maximumBytes)
    throw new CharacterRigPreparationError(
      "byte-length-mismatch",
      `Character rig evidence has an invalid byte length: ${fileName}.`,
    );
  const canonicalRoot = await realpath(stagingRoot);
  const canonicalTarget = await realpath(target);
  if (!isWithin(canonicalRoot, canonicalTarget))
    throw new CharacterRigPreparationError(
      "untrusted-staging-root",
      `Character rig evidence resolves outside staging: ${fileName}.`,
    );
  const bytes = await readFile(canonicalTarget);
  if (bytes.length !== info.size)
    throw new CharacterRigPreparationError(
      "byte-length-mismatch",
      `Character rig evidence changed while being reopened: ${fileName}.`,
    );
  return bytes;
};

const writeImmutable = async (target: string, bytes: Buffer, label: string) => {
  try {
    await writeFile(target, bytes, { flag: "wx", mode: 0o600 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    const info = await lstat(target);
    if (info.isSymbolicLink() || !info.isFile())
      throw new CharacterRigPreparationError(
        "output-collision",
        `${label} collides with a non-file or link.`,
      );
    const existing = await readFile(target);
    if (!existing.equals(bytes))
      throw new CharacterRigPreparationError(
        "output-collision",
        `${label} collides with different bytes.`,
      );
  }
};

const assertImmutableTargetCompatible = async (
  target: string,
  bytes: Buffer,
  label: string,
) => {
  try {
    const info = await lstat(target);
    if (info.isSymbolicLink() || !info.isFile())
      throw new CharacterRigPreparationError(
        "output-collision",
        `${label} collides with a non-file or link.`,
      );
    const existing = await readFile(target);
    if (!existing.equals(bytes))
      throw new CharacterRigPreparationError(
        "output-collision",
        `${label} collides with different bytes.`,
      );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
};

const reopenPersisted = async <T extends { contentHash: string }>(
  stagingRoot: string,
  fileName: string,
  parser: { parse(value: unknown): T },
  expectedContentHash: string,
) => {
  const bytes = await readEvidence(stagingRoot, ["character-rig"], fileName);
  let raw: unknown;
  try {
    raw = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new CharacterRigPreparationError(
      "invalid-evidence",
      `Character rig evidence is not valid JSON: ${fileName}.`,
    );
  }
  let persisted: T;
  try {
    persisted = parser.parse(raw);
  } catch (error) {
    throw new CharacterRigPreparationError(
      "invalid-evidence",
      `Character rig evidence failed strict validation: ${fileName}. ${error instanceof Error ? error.message : ""}`,
    );
  }
  if (persisted.contentHash !== expectedContentHash)
    throw new CharacterRigPreparationError(
      "lineage-mismatch",
      `Character rig evidence does not match the exact sealed recipe lineage: ${fileName}.`,
    );
  return persisted;
};

type RecipeComponent =
  | {
      kind: "part";
      component: CharacterRigPreparationRecipe["parts"][number];
    }
  | {
      kind: "exposure";
      component: CharacterRigPreparationRecipe["exposures"][number];
    };

const parseColor = (color: string) => ({
  r: Number.parseInt(color.slice(1, 3), 16),
  g: Number.parseInt(color.slice(3, 5), 16),
  b: Number.parseInt(color.slice(5, 7), 16),
});

const applyMatte = (
  pixels: Buffer,
  matte: RecipeComponent["component"]["source"]["matte"],
) => {
  const output = Buffer.from(pixels);
  if (matte.mode === "chroma-key") {
    const key = parseColor(matte.color);
    const featherEnd = matte.tolerance + matte.softness;
    for (let offset = 0; offset < output.length; offset += 4) {
      const sourceAlpha = output[offset + 3]!;
      const red = output[offset]!;
      const green = output[offset + 1]!;
      const blue = output[offset + 2]!;
      const distance = Math.sqrt(
        (red - key.r) ** 2 +
          (green - key.g) ** 2 +
          (blue - key.b) ** 2,
      );
      const matteAlpha =
        distance <= matte.tolerance
          ? 0
          : matte.softness === 0 || distance >= featherEnd
            ? 255
            : Math.round(
                ((distance - matte.tolerance) / matte.softness) * 255,
              );
      const alpha = Math.round((sourceAlpha * matteAlpha) / 255);
      const spillAmount =
        matte.spillSuppression * (1 - alpha / Math.max(1, sourceAlpha));
      const neutral = Math.round((red + green + blue) / 3);
      output[offset] = Math.round(red + (neutral - red) * spillAmount);
      output[offset + 1] = Math.round(
        green + (neutral - green) * spillAmount,
      );
      output[offset + 2] = Math.round(
        blue + (neutral - blue) * spillAmount,
      );
      output[offset + 3] = alpha;
    }
  }
  for (let offset = 0; offset < output.length; offset += 4)
    if (output[offset + 3] === 0) {
      output[offset] = 0;
      output[offset + 1] = 0;
      output[offset + 2] = 0;
    }
  return output;
};

const inspectForeground = (
  pixels: Buffer,
  width: number,
  height: number,
  componentId: string,
) => {
  let foreground = 0;
  let boundaryTouch = false;
  let minimumX = width;
  let minimumY = height;
  let maximumX = -1;
  let maximumY = -1;
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      const alpha = pixels[(y * width + x) * 4 + 3]!;
      if (alpha > 0) {
        foreground += 1;
        minimumX = Math.min(minimumX, x);
        minimumY = Math.min(minimumY, y);
        maximumX = Math.max(maximumX, x);
        maximumY = Math.max(maximumY, y);
        if (x === 0 || y === 0 || x === width - 1 || y === height - 1)
          boundaryTouch = true;
      }
    }
  if (foreground === 0)
    throw new CharacterRigPreparationError(
      "empty-foreground",
      `Prepared component ${componentId} has no foreground pixels.`,
    );
  if (boundaryTouch)
    throw new CharacterRigPreparationError(
      "boundary-touch",
      `Prepared component ${componentId} touches its crop boundary and may be clipped.`,
    );
  return {
    x: minimumX,
    y: minimumY,
    width: maximumX - minimumX + 1,
    height: maximumY - minimumY + 1,
  };
};

const prepareComponent = async (
  entry: RecipeComponent,
  sourceBytes: Buffer,
  view: CharacterRigPreparationRecipe["view"],
) => {
  const { component } = entry;
  const { rect, matte } = component.source;
  const padding = component.output.padding;
  if (
    component.output.width !== rect.width + padding * 2 ||
    component.output.height !== rect.height + padding * 2 ||
    component.output.width * component.output.height > MAX_PIXELS
  )
    throw new CharacterRigPreparationError(
      "unsafe-crop",
      `Prepared component ${component.id} output must equal its crop plus a fixed safety gutter.`,
    );
  const decoded = await sharp(sourceBytes, {
    limitInputPixels: MAX_PIXELS,
    animated: false,
  })
    .extract({
      left: rect.x,
      top: rect.y,
      width: rect.width,
      height: rect.height,
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (
    decoded.info.width !== rect.width ||
    decoded.info.height !== rect.height ||
    decoded.info.channels !== 4
  )
    throw new CharacterRigPreparationError(
      "dimension-mismatch",
      `Prepared component ${component.id} crop decoded unexpectedly.`,
    );
  const foreground = applyMatte(decoded.data, matte);
  const foregroundBounds = inspectForeground(
    foreground,
    rect.width,
    rect.height,
    component.id,
  );
  const rgba = Buffer.alloc(component.output.width * component.output.height * 4);
  for (let y = 0; y < rect.height; y += 1) {
    const sourceStart = y * rect.width * 4;
    const targetStart =
      ((y + padding) * component.output.width + padding) * 4;
    foreground.copy(
      rgba,
      targetStart,
      sourceStart,
      sourceStart + rect.width * 4,
    );
  }
  const bytes = await sharp(rgba, {
    raw: {
      width: component.output.width,
      height: component.output.height,
      channels: 4,
    },
  })
    .png({
      compressionLevel: 9,
      adaptiveFiltering: false,
      palette: false,
      effort: 10,
    })
    .toBuffer();
  const contentHash = sha256(bytes);
  const relativeFile = `character-rig/prepared/${view}/${contentHash}.png`;
  return {
    bytes,
    output: {
      plannedRelativeFile: component.output.relativeFile,
      relativeFile,
      contentHash,
      immutableLocationId: `sha256:${contentHash}`,
      byteLength: bytes.length,
      mediaType: "image/png" as const,
      width: component.output.width,
      height: component.output.height,
      padding,
      contentBounds: {
        x: foregroundBounds.x + padding,
        y: foregroundBounds.y + padding,
        width: foregroundBounds.width,
        height: foregroundBounds.height,
      },
      alphaClass: "mixed-alpha" as const,
    },
    checks: {
      exactSourceLineage: true as const,
      normalizedRgbaPng: true as const,
      safetyGutter: true as const,
      nonemptyForeground: true as const,
      noBoundaryTouch: true as const,
      noClipping: true as const,
      pivotBounds: true as const,
      socketBounds: true as const,
    },
  };
};

const sealPreparedCharacterRigViewManifest = (
  rawDraft: PreparedCharacterRigViewManifestDraft,
): PreparedCharacterRigViewManifest => {
  const draft = preparedCharacterRigViewManifestDraftSchema.parse(rawDraft);
  return preparedCharacterRigViewManifestSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
};

export const prepareCharacterRigView = async (
  input: PrepareCharacterRigViewInput,
): Promise<PreparedCharacterRigViewManifest> => {
  const recipe = characterRigPreparationRecipeSchema.parse(input.recipe);
  if (sharp.versions.sharp !== SHARP_VERSION)
    throw new CharacterRigPreparationError(
      "processor-mismatch",
      `Character rig preparation requires Sharp ${SHARP_VERSION}.`,
    );
  const stagingRoot = await ensureTrustedStagingRoot(
    input.trustedStagingRoot,
    input.stagingRoot,
  );
  await ensureRealDirectory(stagingRoot, ["character-rig"], false);
  const request = await reopenPersisted(
    stagingRoot,
    `request-${recipe.requestContentHash}.json`,
    characterRigAssetRequestSchema,
    recipe.requestContentHash,
  );
  const bundle = await reopenPersisted(
    stagingRoot,
    `candidate-bundle-${recipe.bundleContentHash}.json`,
    characterRigCandidateBundleSchema,
    recipe.bundleContentHash,
  );
  const report = await reopenPersisted(
    stagingRoot,
    `staging-report-${recipe.stagingReportContentHash}.json`,
    characterRigStagingReportSchema,
    recipe.stagingReportContentHash,
  );
  let receipt: CharacterRigImportReceipt;
  try {
    receipt = await reopenPersisted(
      stagingRoot,
      `import-receipt-${recipe.importReceiptContentHash}.json`,
      characterRigImportReceiptSchema,
      recipe.importReceiptContentHash,
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      throw new CharacterRigPreparationError(
        "incomplete-receipt",
        "Character rig preparation requires persisted complete import receipt evidence.",
      );
    throw error;
  }
  try {
    validateCharacterRigPreparationRecipe(
      request,
      bundle,
      report,
      receipt,
      recipe,
    );
  } catch (error) {
    throw new CharacterRigPreparationError(
      report.status === "incomplete"
        ? "incomplete-receipt"
        : "lineage-mismatch",
      error instanceof Error ? error.message : "Invalid preparation lineage.",
    );
  }
  const recipeFile = await safeTarget(
    stagingRoot,
    ["character-rig"],
    `preparation-recipe-${recipe.contentHash}.json`,
  );
  await writeImmutable(
    recipeFile,
    Buffer.from(`${JSON.stringify(recipe, null, 2)}\n`, "utf8"),
    "Character rig preparation recipe",
  );

  const plannedComponents = [...recipe.parts, ...recipe.exposures];
  const plannedPixels = plannedComponents.reduce(
    (sum, component) =>
      sum + component.output.width * component.output.height,
    0,
  );
  if (plannedPixels > 128_000_000)
    throw new CharacterRigPreparationError(
      "unsafe-crop",
      "Character rig preparation exceeds its aggregate pixel budget.",
    );

  const stagedByCandidate = new Map(
    report.assets.map((asset) => [asset.candidateId, asset]),
  );
  const receiptByCandidate = new Map(
    receipt.files.map((file) => [file.candidateId, file]),
  );
  const referencedCandidateIds = new Set(
    [...recipe.parts, ...recipe.exposures].map(
      (component) => component.source.candidateId,
    ),
  );
  const sourceBytes = new Map<string, Buffer>();
  for (const candidateId of referencedCandidateIds) {
    const staged = stagedByCandidate.get(candidateId);
    const imported = receiptByCandidate.get(candidateId);
    if (!staged || !imported)
      throw new CharacterRigPreparationError(
        "lineage-mismatch",
        `Referenced candidate ${candidateId} is absent from verified evidence.`,
      );
    const expectedRelativeFile = `character-rig/candidates/${staged.stagedContentHash}.png`;
    if (
      staged.relativeFile !== expectedRelativeFile ||
      imported.stagedRelativeFile !== expectedRelativeFile
    )
      throw new CharacterRigPreparationError(
        "lineage-mismatch",
        `Referenced candidate ${candidateId} is not content addressed.`,
      );
    const bytes = await readEvidence(
      stagingRoot,
      ["character-rig", "candidates"],
      `${staged.stagedContentHash}.png`,
      MAX_FILE_BYTES,
    );
    if (bytes.length !== staged.byteLength || bytes.length !== imported.byteLength)
      throw new CharacterRigPreparationError(
        "byte-length-mismatch",
        `Referenced candidate ${candidateId} changed byte length.`,
      );
    const contentHash = sha256(bytes);
    if (
      contentHash !== staged.stagedContentHash ||
      contentHash !== imported.sourceContentHash
    )
      throw new CharacterRigPreparationError(
        "hash-mismatch",
        `Referenced candidate ${candidateId} changed after import.`,
      );
    const metadata = await sharp(bytes, {
      limitInputPixels: MAX_PIXELS,
      animated: false,
    }).metadata();
    if (
      (metadata.pages !== undefined && metadata.pages !== 1) ||
      metadata.width !== staged.width ||
      metadata.height !== staged.height ||
      metadata.format !== "png"
    )
      throw new CharacterRigPreparationError(
        "dimension-mismatch",
        `Referenced candidate ${candidateId} no longer matches PNG evidence.`,
      );
    sourceBytes.set(candidateId, bytes);
  }

  const derivedParts = [];
  for (const part of recipe.parts) {
    const bytes = sourceBytes.get(part.source.candidateId)!;
    const prepared = await prepareComponent(
      { kind: "part", component: part },
      bytes,
      recipe.view,
    );
    derivedParts.push({
      bytes: prepared.bytes,
      component: {
        ...part,
        output: prepared.output,
        checks: prepared.checks,
      },
    });
  }
  const derivedExposures = [];
  for (const exposure of recipe.exposures) {
    const bytes = sourceBytes.get(exposure.source.candidateId)!;
    const prepared = await prepareComponent(
      { kind: "exposure", component: exposure },
      bytes,
      recipe.view,
    );
    derivedExposures.push({
      bytes: prepared.bytes,
      component: {
        ...exposure,
        output: prepared.output,
        checks: prepared.checks,
      },
    });
  }

  const manifest = sealPreparedCharacterRigViewManifest({
    schemaVersion: "1.0",
    manifestId: `prepared-${recipe.view}-${recipe.contentHash.slice(0, 20)}`,
    requestId: request.requestId,
    requestContentHash: request.contentHash,
    candidateBundleContentHash: bundle.contentHash,
    stagingReportContentHash: report.contentHash,
    importReceiptContentHash: receipt.contentHash,
    preparationRecipeContentHash: recipe.contentHash,
    identityLockContentHash: request.identityLock.contentHash,
    templateContentHash: request.rigProfile.templateContentHash,
    processor: {
      extractionAlgorithm: {
        id: PROCESSOR_ID,
        version: PROCESSOR_VERSION,
      },
      imageLibrary: { id: "sharp", version: SHARP_VERSION },
      pngNormalizer: { id: "rgba8-png", version: "1.0.0" },
    },
    view: recipe.view,
    parts: derivedParts.map((entry) => entry.component),
    exposures: derivedExposures.map((entry) => entry.component),
    providerAuthority: false,
    approvalRequired: true,
    preparedAt: input.preparedAt,
  });
  validatePreparedCharacterRigViewManifest(
    request,
    bundle,
    report,
    receipt,
    recipe,
    manifest,
  );
  await ensureRealDirectory(
    stagingRoot,
    ["character-rig", "prepared"],
    true,
  );
  await ensureRealDirectory(
    stagingRoot,
    ["character-rig", "prepared", recipe.view],
    true,
  );
  const allDerived = [...derivedParts, ...derivedExposures];
  for (const derived of allDerived) {
    const target = await safeTarget(
      stagingRoot,
      ["character-rig", "prepared", recipe.view],
      `${derived.component.output.contentHash}.png`,
    );
    await assertImmutableTargetCompatible(
      target,
      derived.bytes,
      `Prepared component ${derived.component.id}`,
    );
  }
  const manifestBytes = Buffer.from(
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  const prospectiveManifestTarget = await safeTarget(
    stagingRoot,
    ["character-rig", "prepared", recipe.view],
    `manifest-${manifest.contentHash}.json`,
  );
  await assertImmutableTargetCompatible(
    prospectiveManifestTarget,
    manifestBytes,
    "Prepared character rig view manifest",
  );
  for (const derived of allDerived) {
    const fileName = `${derived.component.output.contentHash}.png`;
    const target = await safeTarget(
      stagingRoot,
      ["character-rig", "prepared", recipe.view],
      fileName,
    );
    await writeImmutable(
      target,
      derived.bytes,
      `Prepared component ${derived.component.id}`,
    );
    const published = await readEvidence(
      stagingRoot,
      ["character-rig", "prepared", recipe.view],
      fileName,
      MAX_FILE_BYTES,
    );
    if (
      !published.equals(derived.bytes) ||
      sha256(published) !== derived.component.output.contentHash
    )
      throw new CharacterRigPreparationError(
        "hash-mismatch",
        `Prepared component ${derived.component.id} changed after publication.`,
      );
    const metadata = await sharp(published, {
      limitInputPixels: MAX_PIXELS,
      animated: false,
    }).metadata();
    if (
      metadata.format !== "png" ||
      metadata.width !== derived.component.output.width ||
      metadata.height !== derived.component.output.height ||
      metadata.channels !== 4 ||
      metadata.hasAlpha !== true
    )
      throw new CharacterRigPreparationError(
        "dimension-mismatch",
        `Prepared component ${derived.component.id} is not normalized RGBA PNG evidence.`,
      );
  }
  const manifestTarget = await safeTarget(
    stagingRoot,
    ["character-rig", "prepared", recipe.view],
    `manifest-${manifest.contentHash}.json`,
  );
  await writeImmutable(
    manifestTarget,
    manifestBytes,
    "Prepared character rig view manifest",
  );
  return manifest;
};
