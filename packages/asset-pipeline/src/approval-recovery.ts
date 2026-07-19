export type ApprovalWorkflowCheckpoint = "review-persisted" | "production-persisted" | "state-approved";

export type CommitApprovalWorkflowOptions = {
  persistReview: () => Promise<void>;
  ensureProduction: () => Promise<void>;
  ensureApprovedState: () => Promise<void>;
  onCheckpoint?: (checkpoint: ApprovalWorkflowCheckpoint) => void | Promise<void>;
};

export async function commitApprovalWorkflow(options: CommitApprovalWorkflowOptions): Promise<void> {
  await options.persistReview();
  await options.onCheckpoint?.("review-persisted");
  await options.ensureProduction();
  await options.onCheckpoint?.("production-persisted");
  await options.ensureApprovedState();
  await options.onCheckpoint?.("state-approved");
}
