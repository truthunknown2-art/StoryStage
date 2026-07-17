import {describe, expect, it} from "vitest";
import {commitApprovalWorkflow, type ApprovalWorkflowCheckpoint} from "@storystage/asset-pipeline/approval-recovery";

const checkpoints: ApprovalWorkflowCheckpoint[] = ["review-persisted", "production-persisted", "state-approved"];

describe("approval recovery", () => {
  for (const crashPoint of checkpoints) {
    it(`reconciles a crash after ${crashPoint}`, async () => {
      const durable = {review: false, production: false, approved: false};
      const run = (crash: boolean) => commitApprovalWorkflow({
        persistReview: async () => { durable.review = true; },
        ensureProduction: async () => {
          if (!durable.review) throw new Error("production cannot precede its review");
          durable.production = true;
        },
        ensureApprovedState: async () => {
          if (!durable.production) throw new Error("approval cannot precede its production revision");
          durable.approved = true;
        },
        onCheckpoint: (checkpoint) => {
          if (crash && checkpoint === crashPoint) throw new Error(`simulated crash after ${checkpoint}`);
        },
      });

      await expect(run(true)).rejects.toThrow("simulated crash");
      await expect(run(false)).resolves.toBeUndefined();
      expect(durable).toEqual({review: true, production: true, approved: true});
    });
  }
});
