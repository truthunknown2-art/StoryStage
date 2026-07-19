import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const workspaceRoot = resolve(
  fileURLToPath(new URL("../../..", import.meta.url)),
);
const source = resolve(
  workspaceRoot,
  "packages/remotion-runtime/public/show-packs/kids/moonlit-ruins/v1/rigs/mara/payoff-puppet-v1/puppet-parts.png",
);
const outputRoot = resolve(
  workspaceRoot,
  "packages/remotion-runtime/public/show-packs/kids/moonlit-ruins/v1/rigs/mara/local-parts-v1",
);
const border = 24;

const parts = [
  { id: "leg-left", bounds: { x: 660, y: 560, width: 250, height: 270 } },
  { id: "leg-right", bounds: { x: 920, y: 560, width: 270, height: 270 } },
  { id: "thigh-left", bounds: { x: 710, y: 430, width: 190, height: 180 } },
  { id: "thigh-right", bounds: { x: 900, y: 430, width: 200, height: 180 } },
  {
    id: "upper-arm-left",
    bounds: { x: 520, y: 45, width: 180, height: 275 },
  },
  {
    id: "lower-arm-left",
    bounds: { x: 520, y: 290, width: 200, height: 245 },
  },
  { id: "torso", bounds: { x: 730, y: 35, width: 350, height: 410 } },
  {
    id: "upper-arm-right",
    bounds: { x: 1110, y: 40, width: 180, height: 280 },
  },
  {
    id: "lower-arm-right",
    bounds: { x: 1080, y: 290, width: 210, height: 250 },
  },
  { id: "head", bounds: { x: 30, y: 20, width: 490, height: 430 } },
];

await mkdir(outputRoot, { recursive: true });
for (const part of parts) {
  await sharp(source)
    .extract({
      left: part.bounds.x,
      top: part.bounds.y,
      width: part.bounds.width,
      height: part.bounds.height,
    })
    .extend({
      top: border,
      bottom: border,
      left: border,
      right: border,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ adaptiveFiltering: false, compressionLevel: 9, palette: false })
    .toFile(resolve(outputRoot, `${part.id}.png`));
}

const head = parts.find((part) => part.id === "head");
if (!head) throw new Error("KVP head part is missing.");
const headWidth = head.bounds.width + border * 2;
const headHeight = head.bounds.height + border * 2;
const headPivot = {
  x: 275 - head.bounds.x + border,
  y: 430 - head.bounds.y + border,
};
const exposures = [
  {
    id: "mouth-rest",
    source: { x: 435, y: 838, width: 90, height: 48 },
    target: { left: 25, top: -108 },
  },
  {
    id: "mouth-open",
    source: { x: 620, y: 835, width: 105, height: 65 },
    target: { left: 18, top: -116 },
  },
];

for (const exposure of exposures) {
  const mouth = await sharp(source)
    .extract({
      left: exposure.source.x,
      top: exposure.source.y,
      width: exposure.source.width,
      height: exposure.source.height,
    })
    .png({ adaptiveFiltering: false, compressionLevel: 9, palette: false })
    .toBuffer();
  await sharp({
    create: {
      width: headWidth,
      height: headHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: mouth,
        left: Math.round(headPivot.x + exposure.target.left),
        top: Math.round(headPivot.y + exposure.target.top),
      },
    ])
    .png({ adaptiveFiltering: false, compressionLevel: 9, palette: false })
    .toFile(resolve(outputRoot, `${exposure.id}.png`));
}

process.stdout.write(
  `Prepared ${parts.length} KVP parts and ${exposures.length} head exposures.\n`,
);
