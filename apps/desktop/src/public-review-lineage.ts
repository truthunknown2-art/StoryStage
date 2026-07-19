import {hashCanonical, verifyProductionBundleHash, type ProductionBundle, type PublicShowPackReviewRecord} from "@storystage/story-engine";

export function assertApprovedPublicReviewLineage(input: {review: PublicShowPackReviewRecord; originalTarget: ProductionBundle; currentTarget: ProductionBundle}): void {
  const {review, originalTarget, currentTarget} = input;
  if (review.decision !== "approved" || !review.approvedAssetVersion || !review.targetProductionRevision || !review.targetProductionBundleContentHash) throw new Error("The public candidate review is not an approved lineage binding.");
  if (!verifyProductionBundleHash(originalTarget) || originalTarget.contentHash !== review.targetProductionBundleContentHash || originalTarget.production.productionId !== review.productionId || originalTarget.production.revision !== review.targetProductionRevision) throw new Error("The original hash-bound Rook approval target snapshot is missing or mismatched.");
  if (!verifyProductionBundleHash(currentTarget) || currentTarget.production.productionId !== review.productionId || currentTarget.production.revision !== review.targetProductionRevision) throw new Error("The current Rook target revision is missing or invalid.");
  const expectedAsset = hashCanonical(review.approvedAssetVersion);
  const originalHasAsset = (originalTarget.approvedAssetVersions ?? []).some((asset) => hashCanonical(asset) === expectedAsset);
  const currentHasAsset = (currentTarget.approvedAssetVersions ?? []).some((asset) => hashCanonical(asset) === expectedAsset);
  if (!originalHasAsset || !currentHasAsset) throw new Error("The production lineage no longer retains the exact approved Rook asset version.");
}
