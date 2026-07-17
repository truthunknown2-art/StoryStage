import {createHash, randomUUID} from "node:crypto";
import {lstat, mkdir, readFile, readdir, realpath, rename, rm, writeFile} from "node:fs/promises";
import {basename, isAbsolute, join, relative, resolve} from "node:path";
import {
  buildDeliveryProjectManifest,
  buildDeliveryProvenanceReport,
  buildDeliverySrt,
  deliveryManifestSchema,
  deliveryProjectManifestSchema,
  deliveryProvenanceReportSchema,
  finalizeDeliveryManifest,
  productionBundleSchema,
  renderReceiptSchema,
  verifyDeliveryManifestHash,
  verifyProductionBundleHash,
  verifyRenderReceiptHash,
  type DeliveryManifest,
  type ProductionBundle,
  type RenderReceipt,
} from "@storystage/story-engine";
import {assertVerifiedFullRenderReceipt} from "./render-receipt";

const fileNames = ["master.mp4", "captions.srt", "production-bundle.json", "render-receipt.json", "project-manifest.json", "provenance-rights.json", "delivery-manifest.json"] as const;
const isWithin = (root: string, candidate: string) => {const path = relative(root, candidate); return path === "" || (!path.startsWith("..") && !isAbsolute(path));};
const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const jsonBytes = (value: unknown) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");

function assertNoPrivatePathLeak(bytes: Uint8Array, fileName: string): void {
  const text = Buffer.from(bytes).toString("utf8");
  if (/(?:^|["'\s])(?:[a-z]:[\\/]|\\\\[^\\]|\/Users\/|\/home\/)|\.storystage-local|chatgpt\.com\/c\/|api[_-]?key|auth[_-]?token/i.test(text)) throw new Error(`${fileName} contains a private local path or account/session reference.`);
}

async function safeFileBytes(root: string, fileName: string, maxBytes: number): Promise<Buffer> {
  const file = resolve(root, fileName);
  if (!isWithin(resolve(root), file)) throw new Error("Delivery payload escaped its bundle directory.");
  const info = await lstat(file);
  if (info.isSymbolicLink() || !info.isFile() || info.size > maxBytes) throw new Error(`Delivery payload ${fileName} is unsafe or exceeds its limit.`);
  return readFile(file);
}

export type VerifiedDeliveryBundle = {directory: string; manifest: DeliveryManifest; bundle: ProductionBundle; receipt: RenderReceipt; captionCueCount: number};
export type DeliveryPublishCheckpoint = `after-write:${typeof fileNames[number]}` | "after-verify" | "before-rename" | "after-rename";

export async function readVerifiedDeliveryBundle(directoryInput: string, requireContentAddressedLeaf = true): Promise<VerifiedDeliveryBundle> {
  const directory = resolve(directoryInput);
  const directoryInfo = await lstat(directory);
  if (directoryInfo.isSymbolicLink() || !directoryInfo.isDirectory()) throw new Error("Delivery bundle is not a trusted directory.");
  const canonicalDirectory = await realpath(directory);
  const children = await readdir(canonicalDirectory);
  if (children.length !== fileNames.length || fileNames.some((file) => !children.includes(file))) throw new Error("Delivery bundle is partial or contains unmanifested files.");
  const manifestBytes = await safeFileBytes(canonicalDirectory, "delivery-manifest.json", 2_000_000);
  const manifest = deliveryManifestSchema.parse(JSON.parse(manifestBytes.toString("utf8")));
  if (!verifyDeliveryManifestHash(manifest) || (requireContentAddressedLeaf && basename(canonicalDirectory) !== manifest.contentHash)) throw new Error("Delivery manifest failed its content-addressed identity.");
  for (const file of manifest.files) {
    const maxBytes = file.role === "master" ? 4 * 1024 * 1024 * 1024 : 12_000_000;
    const bytes = await safeFileBytes(canonicalDirectory, file.relativeFile, maxBytes);
    if (bytes.byteLength !== file.byteLength || sha256(bytes) !== file.sha256) throw new Error(`Delivery payload ${file.relativeFile} failed its byte binding.`);
  }
  const [bundleBytes, receiptBytes, captionsBytes, projectBytes, provenanceBytes, masterBytes] = await Promise.all([
    safeFileBytes(canonicalDirectory, "production-bundle.json", 10_000_000),
    safeFileBytes(canonicalDirectory, "render-receipt.json", 2_000_000),
    safeFileBytes(canonicalDirectory, "captions.srt", 4_000_000),
    safeFileBytes(canonicalDirectory, "project-manifest.json", 4_000_000),
    safeFileBytes(canonicalDirectory, "provenance-rights.json", 4_000_000),
    safeFileBytes(canonicalDirectory, "master.mp4", 4 * 1024 * 1024 * 1024),
  ]);
  const bundle = productionBundleSchema.parse(JSON.parse(bundleBytes.toString("utf8")));
  const receipt = renderReceiptSchema.parse(JSON.parse(receiptBytes.toString("utf8")));
  const project = deliveryProjectManifestSchema.parse(JSON.parse(projectBytes.toString("utf8")));
  const provenance = deliveryProvenanceReportSchema.parse(JSON.parse(provenanceBytes.toString("utf8")));
  if (!verifyProductionBundleHash(bundle) || !verifyRenderReceiptHash(receipt) || receipt.contentHash !== manifest.renderReceiptContentHash || bundle.contentHash !== manifest.production.bundleContentHash || project.production.bundleContentHash !== bundle.contentHash || project.productionBundleByteHash !== sha256(bundleBytes) || provenance.productionBundleContentHash !== bundle.contentHash) throw new Error("Delivery evidence does not share one production identity.");
  assertVerifiedFullRenderReceipt({receipt, bundle, masterBytes, masterFile: join(canonicalDirectory, "master.mp4"), enforceSourceFileName: false});
  const expectedCaptions = buildDeliverySrt(bundle);
  if (!captionsBytes.equals(Buffer.from(expectedCaptions.text, "utf8")) || project.captionCueCount !== expectedCaptions.cueCount) throw new Error("Delivery captions no longer match the exact final render plan.");
  return {directory: canonicalDirectory, manifest, bundle, receipt, captionCueCount: expectedCaptions.cueCount};
}

export async function publishDeliveryBundle(input: {deliveryRoot: string; bundleFile: string; receiptFile: string; masterFile: string; transitionSfxFile?: string; onCheckpoint?: (checkpoint: DeliveryPublishCheckpoint) => void | Promise<void>}): Promise<VerifiedDeliveryBundle> {
  const [bundleBytes, receiptBytes, masterBytes] = await Promise.all([readFile(input.bundleFile), readFile(input.receiptFile), readFile(input.masterFile)]);
  const bundle = productionBundleSchema.parse(JSON.parse(bundleBytes.toString("utf8")));
  const receipt = renderReceiptSchema.parse(JSON.parse(receiptBytes.toString("utf8")));
  assertVerifiedFullRenderReceipt({receipt, bundle, masterBytes, masterFile: input.masterFile});
  const transitionSfxContentHash = input.transitionSfxFile ? sha256(await readFile(input.transitionSfxFile)) : undefined;
  const captions = buildDeliverySrt(bundle);
  const project = buildDeliveryProjectManifest({bundle, receipt, captionCueCount: captions.cueCount, productionBundleByteHash: sha256(bundleBytes)});
  const provenance = buildDeliveryProvenanceReport({bundle, ...(transitionSfxContentHash ? {transitionSfxContentHash} : {})});
  const payloads = [
    {role: "master" as const, relativeFile: "master.mp4", bytes: masterBytes},
    {role: "captions" as const, relativeFile: "captions.srt", bytes: Buffer.from(captions.text, "utf8")},
    {role: "production-bundle" as const, relativeFile: "production-bundle.json", bytes: bundleBytes},
    {role: "render-receipt" as const, relativeFile: "render-receipt.json", bytes: receiptBytes},
    {role: "project-manifest" as const, relativeFile: "project-manifest.json", bytes: jsonBytes(project)},
    {role: "provenance-rights" as const, relativeFile: "provenance-rights.json", bytes: jsonBytes(provenance)},
  ];
  for (const payload of payloads.filter((entry) => entry.role !== "master")) assertNoPrivatePathLeak(payload.bytes, payload.relativeFile);
  const manifest = finalizeDeliveryManifest({schemaVersion: "1.0", production: receipt.production, renderReceiptContentHash: receipt.contentHash, createdAt: receipt.completedAt, files: payloads.map((payload) => ({role: payload.role, relativeFile: payload.relativeFile, sha256: sha256(payload.bytes), byteLength: payload.bytes.byteLength}))});
  const parent = resolve(input.deliveryRoot, bundle.production.productionId, `r${bundle.production.revision}`, bundle.contentHash);
  const target = resolve(parent, manifest.contentHash);
  await mkdir(parent, {recursive: true});
  try {
    return await readVerifiedDeliveryBundle(target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const temporary = resolve(parent, `.tmp-${manifest.contentHash}-${randomUUID()}`);
  if (!isWithin(parent, temporary) || !isWithin(parent, target)) throw new Error("Delivery publication escaped its content-addressed root.");
  await mkdir(temporary, {recursive: false});
  try {
    for (const payload of payloads) {
      await writeFile(join(temporary, payload.relativeFile), payload.bytes, {flag: "wx", mode: 0o600});
      await input.onCheckpoint?.(`after-write:${payload.relativeFile}` as DeliveryPublishCheckpoint);
    }
    await writeFile(join(temporary, "delivery-manifest.json"), jsonBytes(manifest), {flag: "wx", mode: 0o600});
    await input.onCheckpoint?.("after-write:delivery-manifest.json");
    await readVerifiedDeliveryBundle(temporary, false);
    await input.onCheckpoint?.("after-verify");
    await input.onCheckpoint?.("before-rename");
    try {
      await rename(temporary, target);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
    await input.onCheckpoint?.("after-rename");
    return await readVerifiedDeliveryBundle(target);
  } finally {
    try {
      const canonicalParent = await realpath(parent);
      const resolvedTemporary = resolve(temporary);
      if (isWithin(canonicalParent, resolvedTemporary)) await rm(resolvedTemporary, {recursive: true, force: true});
    } catch {
      // A successful atomic rename removes the temporary path; crash debris remains untrusted and is never rehydrated.
    }
  }
}
