import {mkdtemp, readFile, rm, writeFile, cp} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {afterEach, describe, expect, it} from "vitest";
import {assetRigManifestSchema, verifyAssetRigManifestHash} from "@storystage/story-engine";
import {promotePublicShowPackCandidate, verifyPublicShowPackCandidate} from "./public-show-pack-promotion";

const candidateId = "weird-history-rook-v1";
const candidateContentHash = "86558382828a8db94cdc8c30369e3ff84c7aad0919081a1fe736efc5bb2f84d7";
const sourceCandidateRoot = resolve(fileURLToPath(new URL("../../remotion-runtime/public/show-packs/weird-history/rook/v1", import.meta.url)));
const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, {recursive: true, force: true})));
});

describe("public Show Pack promotion", () => {
  it("verifies, privately publishes, and replays the exact packaged Rook release", async () => {
    const assetsRoot = await mkdtemp(join(tmpdir(), "storystage-public-assets-"));
    temporaryRoots.push(assetsRoot);
    const input = {candidateRoot: sourceCandidateRoot, assetsRoot, expectedCandidateId: candidateId, expectedCandidateContentHash: candidateContentHash, requirementId: "requirement-character-entity-character-narrator", entityId: "character-narrator", entityName: "NARRATOR", approvedAt: "2026-07-17T18:00:00.000Z"};
    const approved = await promotePublicShowPackCandidate(input);
    const replayed = await promotePublicShowPackCandidate({...input, approvedAt: "2026-07-17T19:00:00.000Z"});
    expect(replayed).toEqual(approved);
    expect(approved.approvedAt).toBe(input.approvedAt);
    const manifest = assetRigManifestSchema.parse(JSON.parse(await readFile(join(assetsRoot, ...approved.relativeFile.split("/")), "utf8")));
    expect(verifyAssetRigManifestHash(manifest)).toBe(true);
    expect(manifest.requirementId).toBe(input.requirementId);
    expect(manifest.type).toBe("character-rig");
  });

  it("rejects packaged pixels that no longer match the allowlisted evidence", async () => {
    const root = await mkdtemp(join(tmpdir(), "storystage-public-tamper-"));
    temporaryRoots.push(root);
    await cp(sourceCandidateRoot, root, {recursive: true});
    const file = join(root, "prepared", "rook-v1-talk.png");
    const bytes = await readFile(file);
    bytes[bytes.length - 1] = bytes[bytes.length - 1]! ^ 1;
    await writeFile(file, bytes);
    await expect(verifyPublicShowPackCandidate({candidateRoot: root, expectedCandidateId: candidateId, expectedCandidateContentHash: candidateContentHash})).rejects.toThrow("changed");
  });
});
