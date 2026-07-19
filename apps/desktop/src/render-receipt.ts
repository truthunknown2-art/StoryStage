import {createHash} from "node:crypto";
import {basename} from "node:path";
import {deliveryRenderPlanContentHash, verifyProductionBundleHash, verifyRenderReceiptHash, type ProductionBundle, type RenderReceipt} from "@storystage/story-engine";

export function assertVerifiedFullRenderReceipt(input: {receipt: RenderReceipt; bundle: ProductionBundle; masterBytes: Uint8Array; masterFile: string; enforceSourceFileName?: boolean}): void {
  const {receipt, bundle, masterBytes, masterFile} = input;
  if (!verifyRenderReceiptHash(receipt) || receipt.scope !== "full-production") throw new Error("The full-production render receipt failed its content binding.");
  if (!verifyProductionBundleHash(bundle)
    || receipt.production.id !== bundle.production.productionId
    || receipt.production.revision !== bundle.production.revision
    || receipt.production.bundleContentHash !== bundle.contentHash
    || receipt.production.renderPlanContentHash !== deliveryRenderPlanContentHash(bundle.renderPlan)) throw new Error("The render receipt does not match its exact production snapshot.");
  if ((input.enforceSourceFileName !== false && receipt.master.relativeFile !== basename(masterFile))
    || receipt.master.byteLength !== masterBytes.byteLength
    || receipt.master.sha256 !== createHash("sha256").update(masterBytes).digest("hex")) throw new Error("The completed master no longer matches its render receipt.");
}
