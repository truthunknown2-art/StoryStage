import { resolve } from "node:path";
import sharp from "sharp";

const clampByte = (value: number) =>
  Math.max(0, Math.min(255, Math.round(value)));

const median = (values: number[]) => {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

async function main() {
  const [inputArgument, outputArgument] = process.argv
    .slice(2)
    .filter((argument) => argument !== "--");
  if (!inputArgument || !outputArgument)
    throw new Error(
      "Usage: chroma-key-cli <source-chroma.png> <transparent-atlas.png>",
    );

  const inputFile = resolve(inputArgument);
  const outputFile = resolve(outputArgument);
  const decoded = await sharp(inputFile).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });
  const pixels = decoded.data;
  const { width, height, channels } = decoded.info;
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
  const background = [
    median(borderRed),
    median(borderGreen),
    median(borderBlue),
  ];

  // Image generators introduce subtle texture into a requested flat chroma
  // plate. A soft distance matte removes that noise, then unblends edge pixels
  // from the measured plate color so magenta cannot outline the sprite.
  const transparentRadius = 40;
  const opaqueRadius = 225;
  for (let offset = 0; offset < pixels.length; offset += channels) {
    const red = pixels[offset]!;
    const green = pixels[offset + 1]!;
    const blue = pixels[offset + 2]!;
    const distance = Math.sqrt(
      (background[0]! - red) ** 2 +
        (background[1]! - green) ** 2 +
        (background[2]! - blue) ** 2,
    );
    const alpha = Math.max(
      0,
      Math.min(
        1,
        (distance - transparentRadius) / (opaqueRadius - transparentRadius),
      ),
    );
    if (alpha < 0.04) {
      pixels[offset] = 0;
      pixels[offset + 1] = 0;
      pixels[offset + 2] = 0;
      pixels[offset + 3] = 0;
      continue;
    }
    pixels[offset + 3] = clampByte(pixels[offset + 3]! * alpha);
    if (alpha < 0.995) {
      pixels[offset] = clampByte((red - (1 - alpha) * background[0]!) / alpha);
      pixels[offset + 1] = clampByte(
        (green - (1 - alpha) * background[1]!) / alpha,
      );
      pixels[offset + 2] = clampByte(
        (blue - (1 - alpha) * background[2]!) / alpha,
      );
    }
  }

  await sharp(pixels, { raw: decoded.info })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(outputFile);
  console.log(
    `Chroma keyed ${inputFile} -> ${outputFile} using rgb(${background.join(",")})`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
