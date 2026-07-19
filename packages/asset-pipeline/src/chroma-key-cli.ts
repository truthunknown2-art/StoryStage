import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { removeBorderChromaKey } from "./chroma-key";

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
  const result = await removeBorderChromaKey(await readFile(inputFile));
  await writeFile(outputFile, result.bytes);
  console.log(
    `Chroma keyed ${inputFile} -> ${outputFile} using ${result.measuredKey.hex}`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
