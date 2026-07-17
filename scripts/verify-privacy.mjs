import {execFileSync} from "node:child_process";
import {readFileSync, statSync} from "node:fs";
import {resolve} from "node:path";
import process from "node:process";
import {fileURLToPath, URL} from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const files = execFileSync("git", ["ls-files", "-co", "--exclude-standard", "-z"], {cwd: root})
  .toString("utf8")
  .split("\0")
  .filter(Boolean);

const forbiddenPaths = [
  /(^|\/)\.storystage-local(\/|$)/i,
  /(^|\/)private-assets(\/|$)/i,
  /(^|\/)candidate-bundles?(\/|$)/i,
  /(^|\/)(candidate-bundle|generation-job|provider-notes)\.json$/i,
  /(^|\/)cookies?(\.sqlite)?$/i,
  /(^|\/)web data$/i,
  /(^|\/)login data$/i,
  /(^|\/)auth-cache(\/|$)/i,
  /(^|\/)credentials?(\/|\.|$)/i,
  /(^|\/)\.env(?:\.|$)/i,
  /(^|\/)chatgpt.*export/i,
];

const secretShapes = [
  {name: "OpenAI-style secret key", pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g},
  {name: "bearer token", pattern: /\bBearer\s+[A-Za-z0-9._~+/-]{24,}={0,2}\b/gi},
  {name: "private key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g},
  {name: "cookie header", pattern: /(?:^|\n)\s*(?:set-)?cookie\s*:\s*[^\n]{12,}/gi},
];

const failures = [];
for (const file of files) {
  const normalized = file.replaceAll("\\", "/");
  if (forbiddenPaths.some((pattern) => pattern.test(normalized))) failures.push(`${normalized}: private/local artifact path is not publishable`);
  const absolute = resolve(root, file);
  let size;
  try {
    size = statSync(absolute).size;
  } catch {
    continue;
  }
  if (size > 5_000_000) continue;
  const text = readFileSync(absolute, "utf8");
  for (const secret of secretShapes) {
    secret.pattern.lastIndex = 0;
    if (secret.pattern.test(text)) failures.push(`${normalized}: contains a ${secret.name}`);
  }
}

const desktopMain = readFileSync(resolve(root, "apps/desktop/src/main.ts"), "utf8");
if (!desktopMain.includes('app.getPath("userData")') || !desktopMain.includes('".storystage-local"')) {
  failures.push("apps/desktop/src/main.ts: exchange root is not visibly anchored under Electron userData");
}
const gitignore = readFileSync(resolve(root, ".gitignore"), "utf8");
for (const required of [".storystage-local/", "private-assets/", "candidate-bundles/", ".env"]) {
  if (!gitignore.includes(required)) failures.push(`.gitignore: missing ${required}`);
}

if (failures.length > 0) {
  process.stderr.write(`Privacy verification failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`Privacy verification passed for ${files.length} tracked and publishable workspace files.\n`);
}
