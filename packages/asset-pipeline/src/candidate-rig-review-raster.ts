import sharp, { type Metadata, type OutputInfo } from "sharp";

export class CandidateRigReviewRasterFormatError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "CandidateRigReviewRasterFormatError";
  }
}

export const assertCandidateRigReviewPngMetadata = (
  metadata: Pick<Metadata, "format" | "pages" | "width" | "height">,
  expected: { width: number; height: number },
): void => {
  if (
    metadata.format !== "png" ||
    (metadata.pages ?? 1) !== 1 ||
    metadata.width !== expected.width ||
    metadata.height !== expected.height
  )
    throw new CandidateRigReviewRasterFormatError(
      "Candidate review source must remain an exact single-page PNG.",
    );
};

export const decodeCandidateRigReviewPng = async (
  bytes: Buffer,
  expected: { width: number; height: number },
  maxPixels: number,
): Promise<{ data: Buffer; info: OutputInfo }> => {
  const metadata = await sharp(bytes, {
    limitInputPixels: maxPixels,
    animated: true,
  }).metadata();
  assertCandidateRigReviewPngMetadata(metadata, expected);
  return sharp(bytes, { limitInputPixels: maxPixels, animated: false })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
};
