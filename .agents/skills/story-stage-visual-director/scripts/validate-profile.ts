import {readFileSync} from "node:fs";
import {showPackSchema} from "../../../../packages/story-engine/src/model";
import {getShowPack} from "../../../../packages/story-engine/src/show-pack";
import {verifyShowPackHash} from "../../../../packages/story-engine/src/show-pack";

const input = process.argv[2];
if (!input) throw new Error("Usage: validate-profile.ts <show-pack.json|builtin:show-pack-id>");
const candidate = input.startsWith("builtin:") ? getShowPack(input.slice("builtin:".length)) : JSON.parse(readFileSync(input, "utf8"));
const result = showPackSchema.safeParse(candidate);
if (!result.success) {
  process.stderr.write(`${JSON.stringify(result.error.format(), null, 2)}\n`);
  process.exitCode = 1;
} else {
  if (!verifyShowPackHash(result.data)) {
    process.stderr.write(`${result.data.id}@${result.data.version} has a stale content hash.\n`);
    process.exitCode = 1;
  } else process.stdout.write(`${result.data.id}@${result.data.version} is valid and hash-verified.\n`);
}
