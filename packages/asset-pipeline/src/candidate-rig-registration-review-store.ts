import { createHash, randomUUID } from "node:crypto";
import { link, lstat, mkdir, open, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  hashCanonical,
  prestonCandidateRigRegistrationAnnotationReviewSchema,
  type PrestonCandidateRigRegistrationAnnotationReview,
} from "@storystage/story-engine";

const MAX_REVIEW_BYTES = 2_000_000;

// This module is intentionally package-internal and is not re-exported from
// @storystage/asset-pipeline. Only the private review worker may turn a
// persisted Preston decision into the in-process capability checked below.

export type AcceptedPrestonCandidateRigRegistrationReviewReceipt = Readonly<{
  schemaVersion: "1.0";
  receiptKind: "persisted-preston-registration-review";
  reviewerId: "preston";
  decision: "accepted-for-measurement";
  annotationMapContentHash: string;
  reviewRecordContentHash: string;
  reviewFileContentHash: string;
  review: PrestonCandidateRigRegistrationAnnotationReview;
}>;

const acceptedReceipts = new WeakSet<object>();

const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

type InspectedReviewFileIdentity = Readonly<{
  dev: number;
  ino: number;
  size: number;
  birthtimeMs: number;
  ctimeMs: number;
}>;

/**
 * Package-internal handle reader. The identity check closes the lstat/open
 * replacement window, and all bytes come from the same validated handle.
 * Exported only so the adjacent regression can deterministically simulate a
 * path swap; this module has no package export.
 */
export const readPrivateCandidateRigRegistrationReviewFileSnapshot =
  async (input: { file: string; inspected: InspectedReviewFileIdentity }) => {
    const handle = await open(input.file, "r");
    try {
      const before = await handle.stat();
      if (
        !before.isFile() ||
        before.size > MAX_REVIEW_BYTES ||
        before.size !== input.inspected.size ||
        before.dev !== input.inspected.dev ||
        before.ino !== input.inspected.ino ||
        before.birthtimeMs !== input.inspected.birthtimeMs ||
        before.ctimeMs !== input.inspected.ctimeMs
      )
        throw new Error(
          "The private registration review record changed after path inspection.",
        );
      const bytes = await handle.readFile();
      const after = await handle.stat();
      if (
        after.dev !== before.dev ||
        after.ino !== before.ino ||
        after.size !== before.size ||
        after.birthtimeMs !== before.birthtimeMs ||
        after.ctimeMs !== before.ctimeMs ||
        bytes.length !== before.size
      )
        throw new Error(
          "The private registration review record changed while it was read.",
        );
      return bytes;
    } finally {
      await handle.close();
    }
  };

const deepFreeze = <Value>(value: Value): Value => {
  if (value === null || typeof value !== "object" || Object.isFrozen(value))
    return value;
  for (const child of Object.values(value as Record<string, unknown>))
    deepFreeze(child);
  return Object.freeze(value);
};

export const isAcceptedPrestonCandidateRigRegistrationReviewReceipt = (
  value: unknown,
): value is AcceptedPrestonCandidateRigRegistrationReviewReceipt =>
  value !== null && typeof value === "object" && acceptedReceipts.has(value);

const requireAcceptedReview = (
  review: PrestonCandidateRigRegistrationAnnotationReview,
  expectedAnnotationMapContentHash: string,
) => {
  if (
    review.reviewerId !== "preston" ||
    review.decision !== "accepted-for-measurement" ||
    review.annotationMapContentHash !== expectedAnnotationMapContentHash ||
    !Object.values(review.checks).every(Boolean)
  )
    throw new Error(
      "The persisted registration review is not Preston's exact accepted review for this annotation.",
    );
};

const receiptFromBytes = (
  bytes: Buffer,
  expectedAnnotationMapContentHash: string,
) => {
  const review = prestonCandidateRigRegistrationAnnotationReviewSchema.parse(
    JSON.parse(bytes.toString("utf8")) as unknown,
  );
  requireAcceptedReview(review, expectedAnnotationMapContentHash);
  const receipt = deepFreeze({
    schemaVersion: "1.0" as const,
    receiptKind: "persisted-preston-registration-review" as const,
    reviewerId: review.reviewerId,
    decision: "accepted-for-measurement" as const,
    annotationMapContentHash: review.annotationMapContentHash,
    reviewRecordContentHash: review.contentHash,
    reviewFileContentHash: sha256(bytes),
    review,
  });
  acceptedReceipts.add(receipt);
  return receipt;
};

export const readAcceptedPrestonCandidateRigRegistrationReviewReceipt =
  async (input: {
    file: string;
    expectedAnnotationMapContentHash: string;
  }): Promise<AcceptedPrestonCandidateRigRegistrationReviewReceipt | null> => {
    try {
      const info = await lstat(input.file);
      if (
        info.isSymbolicLink() ||
        !info.isFile() ||
        info.size > MAX_REVIEW_BYTES
      )
        throw new Error("The private registration review record is unsafe.");
      const bytes = await readPrivateCandidateRigRegistrationReviewFileSnapshot(
        {
          file: input.file,
          inspected: {
            dev: info.dev,
            ino: info.ino,
            size: info.size,
            birthtimeMs: info.birthtimeMs,
            ctimeMs: info.ctimeMs,
          },
        },
      );
      return receiptFromBytes(bytes, input.expectedAnnotationMapContentHash);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  };

export const persistAcceptedPrestonCandidateRigRegistrationReview =
  async (input: {
    file: string;
    review: PrestonCandidateRigRegistrationAnnotationReview;
  }): Promise<AcceptedPrestonCandidateRigRegistrationReviewReceipt> => {
    const review = prestonCandidateRigRegistrationAnnotationReviewSchema.parse(
      input.review,
    );
    requireAcceptedReview(review, review.annotationMapContentHash);
    const bytes = Buffer.from(`${JSON.stringify(review, null, 2)}\n`, "utf8");
    await mkdir(dirname(input.file), { recursive: true });
    const temporaryFile = `${input.file}.${randomUUID()}.tmp`;
    await writeFile(temporaryFile, bytes, {
      encoding: "utf8",
      mode: 0o600,
      flag: "wx",
    });
    try {
      try {
        await link(temporaryFile, input.file);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        const existing =
          await readAcceptedPrestonCandidateRigRegistrationReviewReceipt({
            file: input.file,
            expectedAnnotationMapContentHash: review.annotationMapContentHash,
          });
        if (
          !existing ||
          hashCanonical(existing.review) !== hashCanonical(review)
        )
          throw new Error(
            "This annotation already has a different or invalid persisted Preston review.",
          );
      }
    } finally {
      await unlink(temporaryFile).catch(() => undefined);
    }
    const published =
      await readAcceptedPrestonCandidateRigRegistrationReviewReceipt({
        file: input.file,
        expectedAnnotationMapContentHash: review.annotationMapContentHash,
      });
    if (!published || hashCanonical(published.review) !== hashCanonical(review))
      throw new Error(
        "The persisted Preston registration review does not match the accepted decision.",
      );
    return published;
  };

export const unwrapAcceptedPrestonCandidateRigRegistrationReview = (
  receipt: unknown,
): PrestonCandidateRigRegistrationAnnotationReview => {
  if (!isAcceptedPrestonCandidateRigRegistrationReviewReceipt(receipt))
    throw new Error(
      "Trusted registration measurement requires a persisted Preston review receipt.",
    );
  return receipt.review;
};
