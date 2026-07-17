import {createHash} from "node:crypto";
import {mkdtemp, mkdir, readFile, symlink, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {describe, expect, it} from "vitest";
import {CandidateStagingError, stageCandidateBundle} from "./index";

const rgbaPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+Avz9WQAAAABJRU5ErkJggg==", "base64");

function hash(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function bundle(contentHash = hash(rgbaPng), overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: "1.0",
    exchangeMode: "manual-chatgpt-images",
    exchangeJobId: "job-one",
    generationJobContentHash: "f".repeat(64),
    production: {id: "production-one", revision: 1},
    showPack: {id: "kids-adventure-v1", version: "1.0.0", contentHash: "e".repeat(64)},
    providerMetadata: {
      provider: "chatgpt-images",
      generatedAt: "2026-07-17T00:00:00.000Z",
      conversationReference: null,
    },
    assets: [{
      candidateId: "candidate-one",
      briefId: "brief-one",
      fileRole: "candidate.png",
      relativeFile: "incoming/friendly-name.png",
      contentHash,
      mediaType: "image/png",
      width: 1,
      height: 1,
      rights: {sourceType: "generated", provider: "chatgpt-images", usageNotes: "Original generated candidate"},
      ...overrides,
    }],
  };
}

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "storystage-assets-"));
  const sourceRoot = join(root, "source");
  const stagingRoot = join(root, "private-staging");
  await mkdir(join(sourceRoot, "incoming"), {recursive: true});
  await writeFile(join(sourceRoot, "incoming", "friendly-name.png"), rgbaPng);
  return {root, sourceRoot, stagingRoot};
}

describe("secure candidate staging", () => {
  it("verifies real bytes and chooses a deterministic private staging path", async () => {
    const {sourceRoot, stagingRoot} = await fixture();
    const [prepared] = await stageCandidateBundle({bundle: bundle(), sourceRoot, stagingRoot});

    expect(prepared?.relativeFile).toBe("candidates/candidate-one.png");
    expect(prepared?.preparationState).toBe("prepared");
    expect(prepared?.checks).toEqual({dimensions: true, mediaType: true, alphaOrMatte: true, registration: true});
    await expect(readFile(join(stagingRoot, "candidates", "candidate-one.png"))).resolves.toEqual(rgbaPng);
  });

  it("rejects a manifest hash that does not match the file", async () => {
    const {sourceRoot, stagingRoot} = await fixture();
    await expect(stageCandidateBundle({bundle: bundle("a".repeat(64)), sourceRoot, stagingRoot}))
      .rejects.toMatchObject({code: "hash-mismatch"} satisfies Partial<CandidateStagingError>);
  });

  it("rejects a file whose declared media type does not match its bytes", async () => {
    const {sourceRoot, stagingRoot} = await fixture();
    await expect(stageCandidateBundle({bundle: bundle(hash(rgbaPng), {mediaType: "image/jpeg"}), sourceRoot, stagingRoot}))
      .rejects.toMatchObject({code: "media-mismatch"} satisfies Partial<CandidateStagingError>);
  });

  it("rejects images whose decoded dimensions exceed the configured pixel envelope", async () => {
    const {sourceRoot, stagingRoot} = await fixture();
    await expect(stageCandidateBundle({bundle: bundle(), sourceRoot, stagingRoot, limits: {maxDimension: 0}}))
      .rejects.toMatchObject({code: "dimension-limit"} satisfies Partial<CandidateStagingError>);
  });

  it("rejects a source symlink even when it points back inside the selected folder", async () => {
    const {sourceRoot, stagingRoot} = await fixture();
    const linkPath = join(sourceRoot, "incoming", "linked.png");
    try {
      await symlink(join(sourceRoot, "incoming", "friendly-name.png"), linkPath, "file");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EPERM") return;
      throw error;
    }
    await expect(stageCandidateBundle({
      bundle: bundle(hash(rgbaPng), {relativeFile: "incoming/linked.png"}),
      sourceRoot,
      stagingRoot,
    })).rejects.toMatchObject({code: "symlink-rejected"} satisfies Partial<CandidateStagingError>);
  });

  it("rejects manifest-selected traversal before touching the filesystem", async () => {
    const {sourceRoot, stagingRoot} = await fixture();
    await expect(stageCandidateBundle({
      bundle: bundle(hash(rgbaPng), {relativeFile: "../outside.png"}),
      sourceRoot,
      stagingRoot,
    })).rejects.toMatchObject({code: "invalid-bundle"} satisfies Partial<CandidateStagingError>);
  });
});
