import {createHash} from "node:crypto";
import {mkdtemp, mkdir, readFile, symlink, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {describe, expect, it} from "vitest";
import {CandidateStagingError, stageCandidateBundle, stageLooseCandidateFiles} from "./index";

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
  const trustedStagingRoot = join(root, "private-staging");
  const stagingRoot = join(trustedStagingRoot, "jobs", "import-one");
  await mkdir(join(sourceRoot, "incoming"), {recursive: true});
  await writeFile(join(sourceRoot, "incoming", "friendly-name.png"), rgbaPng);
  return {root, sourceRoot, trustedStagingRoot, stagingRoot};
}

describe("secure candidate staging", () => {
  it("verifies real bytes and chooses a deterministic private staging path", async () => {
    const {sourceRoot, trustedStagingRoot, stagingRoot} = await fixture();
    const [staged] = await stageCandidateBundle({bundle: bundle(), sourceRoot, trustedStagingRoot, stagingRoot});

    expect(staged?.relativeFile).toBe("candidates/candidate-one.png");
    expect(staged?.stagingState).toBe("staged-byte-verified");
    expect(staged?.checks).toEqual({dimensions: true, mediaType: true, alphaOrMatte: true, registration: false});
    await expect(readFile(join(stagingRoot, "candidates", "candidate-one.png"))).resolves.toEqual(rgbaPng);
  });

  it("rejects a manifest hash that does not match the file", async () => {
    const {sourceRoot, trustedStagingRoot, stagingRoot} = await fixture();
    await expect(stageCandidateBundle({bundle: bundle("a".repeat(64)), sourceRoot, trustedStagingRoot, stagingRoot}))
      .rejects.toMatchObject({code: "hash-mismatch"} satisfies Partial<CandidateStagingError>);
  });

  it("rejects a file whose declared media type does not match its bytes", async () => {
    const {sourceRoot, trustedStagingRoot, stagingRoot} = await fixture();
    await expect(stageCandidateBundle({bundle: bundle(hash(rgbaPng), {mediaType: "image/jpeg"}), sourceRoot, trustedStagingRoot, stagingRoot}))
      .rejects.toMatchObject({code: "media-mismatch"} satisfies Partial<CandidateStagingError>);
  });

  it("rejects images whose decoded dimensions exceed the configured pixel envelope", async () => {
    const {sourceRoot, trustedStagingRoot, stagingRoot} = await fixture();
    await expect(stageCandidateBundle({bundle: bundle(), sourceRoot, trustedStagingRoot, stagingRoot, limits: {maxDimension: 0}}))
      .rejects.toMatchObject({code: "dimension-limit"} satisfies Partial<CandidateStagingError>);
  });

  it("rejects a source symlink even when it points back inside the selected folder", async () => {
    const {sourceRoot, trustedStagingRoot, stagingRoot} = await fixture();
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
      trustedStagingRoot,
      stagingRoot,
    })).rejects.toMatchObject({code: "symlink-rejected"} satisfies Partial<CandidateStagingError>);
  });

  it("rejects manifest-selected traversal before touching the filesystem", async () => {
    const {sourceRoot, trustedStagingRoot, stagingRoot} = await fixture();
    await expect(stageCandidateBundle({
      bundle: bundle(hash(rgbaPng), {relativeFile: "../outside.png"}),
      sourceRoot,
      trustedStagingRoot,
      stagingRoot,
    })).rejects.toMatchObject({code: "invalid-bundle"} satisfies Partial<CandidateStagingError>);
  });

  it("stages native-picker loose files under main-owned candidate names", async () => {
    const {sourceRoot, trustedStagingRoot, stagingRoot} = await fixture();
    const [loose] = await stageLooseCandidateFiles({files: [{candidateId: "loose-one", sourceFile: join(sourceRoot, "incoming", "friendly-name.png")}], trustedStagingRoot, stagingRoot});
    expect(loose).toMatchObject({candidate: {candidateId: "loose-one", relativeFile: "candidates/loose-one.png", stagingState: "staged-byte-verified"}, originalName: "friendly-name.png", mediaType: "image/png", width: 1, height: 1});
    await expect(readFile(join(stagingRoot, "candidates", "loose-one.png"))).resolves.toEqual(rgbaPng);
  });

  it("rejects a staging destination outside the trusted main-process root", async () => {
    const {root, sourceRoot, trustedStagingRoot} = await fixture();
    await expect(stageCandidateBundle({bundle: bundle(), sourceRoot, trustedStagingRoot, stagingRoot: join(root, "outside")}))
      .rejects.toMatchObject({code: "untrusted-staging-root"} satisfies Partial<CandidateStagingError>);
  });

  it("rejects a symbolic-link or junction ancestor inside the trusted staging root", async () => {
    const {root, sourceRoot, trustedStagingRoot} = await fixture();
    await mkdir(trustedStagingRoot, {recursive: true});
    const linkedRoot = join(trustedStagingRoot, "linked");
    try {
      await symlink(join(root, "outside-target"), linkedRoot, process.platform === "win32" ? "junction" : "dir");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EPERM") return;
      throw error;
    }
    await expect(stageCandidateBundle({bundle: bundle(), sourceRoot, trustedStagingRoot, stagingRoot: join(linkedRoot, "import-one")}))
      .rejects.toMatchObject({code: "symlink-rejected"} satisfies Partial<CandidateStagingError>);
  });
});
