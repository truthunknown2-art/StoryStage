import sharp from "sharp";

const MAX_PIXELS = 64_000_000;
const TRANSPARENT_RADIUS = 40;
const OPAQUE_RADIUS = 225;

const clampByte = (value: number) =>
  Math.max(0, Math.min(255, Math.round(value)));

const median = (values: number[]) => {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

export type ChromaKeyResult = {
  bytes: Buffer;
  measuredKey: { red: number; green: number; blue: number; hex: string };
  dimensions: { width: number; height: number };
  alphaPixels: { transparent: number; partial: number; opaque: number };
  processor: {
    id: "border-median-soft-distance-matte";
    version: "1.0.0";
    transparentRadius: 40;
    opaqueRadius: 225;
    borderSampleStride: 24;
    imageLibrary: { id: "sharp"; version: string };
    png: {
      compressionLevel: 9;
      adaptiveFiltering: true;
      palette: false;
    };
  };
};

const hexByte = (value: number) => value.toString(16).padStart(2, "0");

export const removeBorderChromaKey = async (
  input: Buffer,
): Promise<ChromaKeyResult> => {
  const image = sharp(input, { limitInputPixels: MAX_PIXELS, animated: false });
  let metadata: Awaited<ReturnType<typeof image.metadata>>;
  try {
    metadata = await image.metadata();
  } catch {
    throw new Error("Chroma-key input must be one bounded PNG raster.");
  }
  if (
    metadata.format !== "png" ||
    (metadata.pages ?? 1) !== 1 ||
    !metadata.width ||
    !metadata.height ||
    metadata.width * metadata.height > MAX_PIXELS
  )
    throw new Error("Chroma-key input must be one bounded PNG raster.");

  const decoded = await image.ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });
  const pixels = decoded.data;
  const { width, height, channels } = decoded.info;
  if (channels !== 4)
    throw new Error("Chroma-key input did not decode to RGBA pixels.");

  const borderRed: number[] = [];
  const borderGreen: number[] = [];
  const borderBlue: number[] = [];
  const sample = (x: number, y: number) => {
    const offset = (y * width + x) * channels;
    borderRed.push(pixels[offset]!);
    borderGreen.push(pixels[offset + 1]!);
    borderBlue.push(pixels[offset + 2]!);
  };
  for (let x = 0; x < width; x += 24) {
    sample(x, 0);
    sample(x, height - 1);
  }
  for (let y = 0; y < height; y += 24) {
    sample(0, y);
    sample(width - 1, y);
  }
  const background = {
    red: median(borderRed),
    green: median(borderGreen),
    blue: median(borderBlue),
  };

  let transparent = 0;
  let partial = 0;
  let opaque = 0;
  for (let offset = 0; offset < pixels.length; offset += channels) {
    const red = pixels[offset]!;
    const green = pixels[offset + 1]!;
    const blue = pixels[offset + 2]!;
    const distance = Math.sqrt(
      (background.red - red) ** 2 +
        (background.green - green) ** 2 +
        (background.blue - blue) ** 2,
    );
    const alpha = Math.max(
      0,
      Math.min(
        1,
        (distance - TRANSPARENT_RADIUS) / (OPAQUE_RADIUS - TRANSPARENT_RADIUS),
      ),
    );
    if (alpha < 0.04) {
      pixels[offset] = 0;
      pixels[offset + 1] = 0;
      pixels[offset + 2] = 0;
      pixels[offset + 3] = 0;
      transparent += 1;
      continue;
    }
    pixels[offset + 3] = clampByte(pixels[offset + 3]! * alpha);
    if (alpha < 0.995) {
      pixels[offset] = clampByte((red - (1 - alpha) * background.red) / alpha);
      pixels[offset + 1] = clampByte(
        (green - (1 - alpha) * background.green) / alpha,
      );
      pixels[offset + 2] = clampByte(
        (blue - (1 - alpha) * background.blue) / alpha,
      );
    }
    if (pixels[offset + 3] === 255) opaque += 1;
    else partial += 1;
  }

  const bytes = await sharp(pixels, { raw: decoded.info })
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      palette: false,
    })
    .toBuffer();
  return {
    bytes,
    measuredKey: {
      ...background,
      hex: `#${hexByte(background.red)}${hexByte(background.green)}${hexByte(background.blue)}`,
    },
    dimensions: { width, height },
    alphaPixels: { transparent, partial, opaque },
    processor: {
      id: "border-median-soft-distance-matte",
      version: "1.0.0",
      transparentRadius: TRANSPARENT_RADIUS,
      opaqueRadius: OPAQUE_RADIUS,
      borderSampleStride: 24,
      imageLibrary: { id: "sharp", version: sharp.versions.sharp },
      png: {
        compressionLevel: 9,
        adaptiveFiltering: true,
        palette: false,
      },
    },
  };
};
