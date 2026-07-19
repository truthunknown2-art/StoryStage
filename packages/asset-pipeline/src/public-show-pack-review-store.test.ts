import {join} from "node:path";
import {mkdtemp, readdir, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {afterEach, describe, expect, it} from "vitest";
import {finalizePublicShowPackReviewRecord} from "@storystage/story-engine";
import {persistPublicShowPackReviewRecord, PublicShowPackReviewCoordinator, readPublicShowPackReviewRecord} from "./public-show-pack-review-store";

const roots: string[] = [];
afterEach(async () => {await Promise.all(roots.splice(0).map((root) => rm(root, {recursive: true, force: true})))});

const makeRecord = (decision: "approved" | "rejected" = "rejected") => finalizePublicShowPackReviewRecord({
  schemaVersion: "1.0",
  candidateId: "weird-history-rook-v1",
  candidateContentHash: "1".repeat(64),
  productionId: "production-review-store",
  sourceProductionRevision: 1,
  sourceProductionBundleContentHash: "2".repeat(64),
  decision,
  acknowledgements: {identitySheet: decision === "approved", neutralPose: decision === "approved", talkPose: decision === "approved", reactionPose: decision === "approved", movingDiagnostic: decision === "approved", identityConsistency: decision === "approved", matteEdges: decision === "approved", provenance: decision === "approved"},
  decidedAt: "2026-07-17T20:00:00.000Z",
  approvedAssetVersion: decision === "approved" ? {assetId: "approved-rook", version: "sha256-1234", requirementId: "requirement-rook", contentHash: "3".repeat(64), relativeFile: "approved-rook/sha256-1234/manifest.json", provenance: {sourceType: "generated", provider: "ChatGPT Images", usageNotes: "Human reviewed."}, approvedAt: "2026-07-17T20:00:00.000Z"} : null,
  targetProductionRevision: decision === "approved" ? 2 : null,
  targetProductionBundleContentHash: decision === "approved" ? "4".repeat(64) : null,
});

async function setup() {
  const root = await mkdtemp(join(tmpdir(), "storystage-public-review-"));
  roots.push(root);
  return {root, file: join(root, "review.json")};
}

describe("public Show Pack review store", () => {
  it("leaves no partial final record when publication stops after the temporary write, then replays", async () => {
    const {root, file} = await setup();
    const record = makeRecord();
    await expect(persistPublicShowPackReviewRecord({file, record, onCheckpoint: (checkpoint) => {if (checkpoint === "temporary-written") throw new Error("simulated exit");}})).rejects.toThrow("simulated exit");
    expect(await readPublicShowPackReviewRecord(file)).toBeNull();
    expect(await readdir(root)).toEqual([]);
    await persistPublicShowPackReviewRecord({file, record});
    expect(await readPublicShowPackReviewRecord(file)).toEqual(record);
  });

  it("replays the same published record after an exit at the publication boundary", async () => {
    const {file} = await setup();
    const record = makeRecord("approved");
    await expect(persistPublicShowPackReviewRecord({file, record, onCheckpoint: (checkpoint) => {if (checkpoint === "published") throw new Error("simulated exit");}})).rejects.toThrow("simulated exit");
    expect(await readPublicShowPackReviewRecord(file)).toEqual(record);
    await persistPublicShowPackReviewRecord({file, record});
    expect(await readPublicShowPackReviewRecord(file)).toEqual(record);
  });

  it("rejects an opposite or corrupt existing final decision", async () => {
    const {file} = await setup();
    await persistPublicShowPackReviewRecord({file, record: makeRecord()});
    await expect(persistPublicShowPackReviewRecord({file, record: makeRecord("approved")})).rejects.toThrow(/different|invalid/);
    const corrupt = await setup();
    await writeFile(corrupt.file, "{partial", "utf8");
    await expect(persistPublicShowPackReviewRecord({file: corrupt.file, record: makeRecord()})).rejects.toThrow();
  });

  it("serializes simultaneous approval and rejection so approval side effects cannot be contradicted", async () => {
    const coordinator = new PublicShowPackReviewCoordinator();
    const durable: {decision: "approved" | "rejected" | null; approvedTarget: boolean} = {decision: null, approvedTarget: false};
    const decide = (decision: "approved" | "rejected") => coordinator.run("production:1:rook", async () => {
      if (durable.decision && durable.decision !== decision) throw new Error("opposite final decision");
      if (decision === "approved") {
        await Promise.resolve();
        durable.approvedTarget = true;
      }
      durable.decision = decision;
    });
    const approval = decide("approved");
    const rejection = decide("rejected");
    await expect(approval).resolves.toBeUndefined();
    await expect(rejection).rejects.toThrow("opposite final decision");
    expect(durable).toEqual({decision: "approved", approvedTarget: true});
  });

  it("keeps an approval from creating an orphan target when simultaneous rejection wins", async () => {
    const coordinator = new PublicShowPackReviewCoordinator();
    const durable: {decision: "approved" | "rejected" | null; approvedTarget: boolean} = {decision: null, approvedTarget: false};
    const decide = (decision: "approved" | "rejected") => coordinator.run("production:1:rook", async () => {
      if (durable.decision && durable.decision !== decision) throw new Error("opposite final decision");
      if (decision === "approved") durable.approvedTarget = true;
      durable.decision = decision;
    });
    const rejection = decide("rejected");
    const approval = decide("approved");
    await expect(rejection).resolves.toBeUndefined();
    await expect(approval).rejects.toThrow("opposite final decision");
    expect(durable).toEqual({decision: "rejected", approvedTarget: false});
  });
});
