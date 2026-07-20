import { resolve } from "node:path";
import { runEditorialGuideAudioProof } from "./editorial-guide-audio-proof";

const usage =
  "Usage: pnpm --filter @storystage/render-worker render:editorial-guide-audio-proof -- --script <script.txt> --wav <guide.wav> --clauses <clauses.json>";

export function parseEditorialGuideAudioProofArgs(args: readonly string[]) {
  const normalized = args[0] === "--" ? args.slice(1) : args;
  const values = new Map<string, string>();
  for (let index = 0; index < normalized.length; index += 2) {
    const flag = normalized[index];
    const value = normalized[index + 1];
    if (
      !flag ||
      !value ||
      !["--script", "--wav", "--clauses"].includes(flag) ||
      values.has(flag)
    )
      throw new Error(usage);
    values.set(flag, value);
  }
  if (values.size !== 3) throw new Error(usage);
  return {
    script: resolve(values.get("--script")!),
    wav: resolve(values.get("--wav")!),
    clauses: resolve(values.get("--clauses")!),
  };
}

const result = await runEditorialGuideAudioProof(
  parseEditorialGuideAudioProofArgs(process.argv.slice(2)),
);
console.log(`Editorial guide-audio proof PASS: ${result.reportPath}`);
