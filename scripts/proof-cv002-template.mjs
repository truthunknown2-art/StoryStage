import {execFile, spawn} from "node:child_process";
import {mkdir, writeFile} from "node:fs/promises";
import {get} from "node:http";
import {resolve} from "node:path";
import process from "node:process";
import {setTimeout as delay} from "node:timers/promises";
import {promisify} from "node:util";
import {fileURLToPath, URL} from "node:url";

const execFileAsync = promisify(execFile);
const workspaceRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const runtimeDir = resolve(workspaceRoot, "output/playwright/cv002-template");
const artifactDir = resolve(workspaceRoot, "docs/design/script-direction-workflow/cv002-template-proof");
const codeFile = resolve(runtimeDir, "browser-proof.playwright.js");
const reportFile = resolve(artifactDir, "proof-report.json");
const url = "http://127.0.0.1:5173/";
const session = `cv002-template-proof-${process.pid}`;
const cli = process.platform === "win32" ? resolve(workspaceRoot, "node_modules/.bin/playwright-cli.CMD") : resolve(workspaceRoot, "node_modules/.bin/playwright-cli");

const runCli = async (args, options = {}) => execFileAsync(
  process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : cli,
  process.platform === "win32" ? ["/d", "/s", "/c", cli, `-s=${session}`, ...args] : [`-s=${session}`, ...args],
  {cwd: runtimeDir, maxBuffer: 20 * 1024 * 1024, ...options},
);

async function isStudioRunning() {
  return new Promise((resolveRunning) => {
    const request = get(url, (response) => {response.resume(); resolveRunning((response.statusCode ?? 500) < 400);});
    request.setTimeout(1_000, () => {request.destroy(); resolveRunning(false);});
    request.on("error", () => resolveRunning(false));
  });
}

async function waitForStudio() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await isStudioRunning()) return;
    await delay(250);
  }
  throw new Error("StoryStage Studio did not become ready at 127.0.0.1:5173.");
}

async function main() {
  await mkdir(runtimeDir, {recursive: true});
  await mkdir(artifactDir, {recursive: true});
  let server = null;
  if (!(await isStudioRunning())) {
    const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
    server = spawn(command, ["--filter", "@storystage/studio", "dev"], {cwd: workspaceRoot, stdio: "ignore", windowsHide: true});
    await waitForStudio();
  }

  const config = JSON.stringify({artifactDir: artifactDir.replaceAll("\\", "/"), axePath: resolve(workspaceRoot, "node_modules/axe-core/axe.min.js").replaceAll("\\", "/"), url});
  const proofSource = `async (page) => {
    const config = ${config};
    const ensure = (condition, message) => { if (!condition) throw new Error(message); };
    const consoleErrors = [];
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
    await page.setViewportSize({width: 1440, height: 900});
    await page.addInitScript({path: config.axePath});
    await page.goto(config.url, {waitUntil: "networkidle"});
    await page.evaluate(() => localStorage.clear());
    await page.reload({waitUntil: "networkidle"});

    const accessibilityAudit = async () => page.evaluate(async () => {
      const result = await window.axe.run(document, {runOnly: {type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"]}});
      return {criticalOrSerious: result.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious").map((violation) => ({id: violation.id, impact: violation.impact, targets: violation.nodes.map((node) => node.target)})), passes: result.passes.length};
    });
    const ergonomicsAudit = async () => page.evaluate(() => {
      const visible = (element) => {const style = getComputedStyle(element); const rect = element.getBoundingClientRect(); return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;};
      const targets = [...document.querySelectorAll("button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])")].filter(visible).map((element) => {const rect = element.getBoundingClientRect(); return {name: element.getAttribute("aria-label") || element.textContent?.trim().slice(0, 80) || element.tagName, width: rect.width, height: rect.height};}).filter((target) => target.width < 43.5 || target.height < 43.5);
      const microtype = [...document.querySelectorAll("p, small, label, legend, button, span, strong, dt, dd, em")].filter((element) => element instanceof HTMLElement && visible(element) && (element.textContent?.trim().length ?? 0) > 0).map((element) => ({text: element.textContent.trim().slice(0, 80), fontSize: Number.parseFloat(getComputedStyle(element).fontSize)})).filter((item) => item.fontSize < 10);
      return {targets, microtype};
    });
    const noOverflow = async (width) => page.evaluate((expected) => document.documentElement.scrollWidth === expected, width);
    const assignmentState = async () => page.evaluate(() => JSON.parse(localStorage.getItem("storystage.cv002.template-assignment.v1")));

    await page.getByRole("button", {name: "Load a longer Kids script sample"}).click();
    await page.getByRole("button", {name: "Break script into scenes"}).click();
    await page.getByRole("button", {name: "Review direction draft"}).click();
    await page.getByRole("heading", {name: "Map a Kids scene to real motion"}).waitFor();
    ensure(await page.locator(".cv2-template-preview").count() === 0, "Preview exists before assignment.");
    ensure(await page.getByRole("button", {name: "Verify and assign template"}).isDisabled(), "Assignment unlocked before explicit mapping.");
    ensure(await assignmentState() === null, "Assignment was inferred before creator confirmation.");
    const unassignedAccessibility = await accessibilityAudit();
    const unassignedErgonomics = await ergonomicsAudit();
    ensure(unassignedAccessibility.criticalOrSerious.length === 0, "Unassigned template panel has serious accessibility violations.");
    ensure(unassignedErgonomics.targets.length === 0 && unassignedErgonomics.microtype.length === 0, "Unassigned template panel violates control or text floors.");
    await page.screenshot({path: config.artifactDir + "/template-unassigned-1440x900.png"});

    await page.getByRole("combobox", {name: "Three-beat scene"}).selectOption({index: 2});
    await page.getByRole("combobox", {name: "1 · Notice object"}).selectOption({index: 1});
    await page.getByRole("combobox", {name: "2 · Reach and pick up"}).selectOption({index: 2});
    await page.getByRole("combobox", {name: "3 · React and present"}).selectOption({index: 3});
    ensure(await page.getByRole("button", {name: "Verify and assign template"}).isDisabled(), "Assignment unlocked before assets were explicitly selected.");
    await page.getByRole("button", {name: /Mara paper-cut prototype/}).click();
    await page.getByRole("button", {name: /Lantern paper-cut prototype/}).click();
    ensure(await page.getByRole("button", {name: "Verify and assign template"}).isEnabled(), "Complete explicit mapping did not unlock verification.");
    await page.getByRole("button", {name: "Verify and assign template"}).click();
    await page.getByRole("heading", {name: "Object discovery template assigned"}).waitFor();
    const assignment = await assignmentState();
    ensure(assignment.template.id === "kids-object-discovery-v1" && assignment.template.version === "1.0.0", "Wrong template identity was persisted.");
    ensure(assignment.slots.length === 3 && new Set(assignment.slots.map((slot) => slot.beatId)).size === 3, "Persisted slots are not three distinct explicit beat mappings.");
    ensure(assignment.rig.id === "cv001-paper-cut-rig-v1" && assignment.characterAsset.id === "cv001-character" && assignment.propAsset.id === "lantern", "Assignment is not bound to the accepted rig and project-owned assets.");
    ensure([assignment.projectGraphHash, assignment.sceneContentHash, assignment.contentHash, ...assignment.slots.map((slot) => slot.beatContentHash)].every((hash) => /^[a-f0-9]{64}$/.test(hash)), "Assignment is missing a canonical content hash binding.");
    ensure(await page.locator(".cv2-template-preview").count() === 0, "Player mounted before the creator clicked Preview animated scene.");
    await page.screenshot({path: config.artifactDir + "/template-assigned-1440x900.png"});

    const assignmentHash = assignment.contentHash;
    await page.reload({waitUntil: "networkidle"});
    await page.getByRole("button", {name: /Continue direction draft/}).click();
    await page.getByRole("button", {name: /Direction draft/}).click();
    await page.getByRole("heading", {name: "Object discovery template assigned"}).waitFor();
    ensure((await assignmentState()).contentHash === assignmentHash, "Verified assignment did not survive reload exactly.");
    ensure(await page.locator(".cv2-template-preview").count() === 0, "Restored assignment mounted a player without a fresh preview click.");

    await page.setViewportSize({width: 760, height: 900});
    await page.waitForTimeout(120);
    ensure(await noOverflow(760), "Responsive assigned template panel has horizontal overflow.");
    await page.screenshot({path: config.artifactDir + "/template-assigned-760x900.png"});
    await page.setViewportSize({width: 1440, height: 900});
    await page.getByRole("button", {name: "Preview animated scene"}).click();
    await page.locator(".cv2-template-preview").waitFor();
    await page.waitForTimeout(180);
    const playerSvg = page.locator(".cv2-template-preview > div svg").first();
    ensure(await playerSvg.count() > 0, "Verified preview did not render the articulated SVG composition.");
    if (await page.getByRole("button", {name: "Play video"}).count()) await page.getByRole("button", {name: "Play video"}).click();
    ensure(await page.getByRole("button", {name: "Pause video"}).count() === 1, "Assigned preview is not playing.");
    const playerVisual = page.locator(".cv2-template-preview > div");
    const frameA = await playerVisual.screenshot();
    await page.waitForTimeout(550);
    const frameB = await playerVisual.screenshot();
    ensure(!frameA.equals(frameB), "Assigned articulated preview did not change pixels between frames.");
    const previewAccessibility = await accessibilityAudit();
    const previewErgonomics = await ergonomicsAudit();
    ensure(previewAccessibility.criticalOrSerious.length === 0, "Assigned preview has serious accessibility violations.");
    ensure(previewErgonomics.targets.length === 0 && previewErgonomics.microtype.length === 0, "Assigned preview violates control or text floors.");
    await page.locator(".cv2-template-preview").scrollIntoViewIfNeeded();
    await page.screenshot({path: config.artifactDir + "/template-preview-1440x900.png"});

    await page.getByRole("button", {name: /Scenes & beats/}).click();
    await page.getByRole("combobox", {name: "What job does this beat do?"}).selectOption("reveal");
    ensure(await assignmentState() === null, "Graph edit did not delete the stale assignment.");
    ensure((await page.getByRole("status").textContent()).includes("template assignment was invalidated"), "Graph edit did not explain assignment invalidation.");
    await page.getByRole("button", {name: /Direction draft/}).click();
    ensure(await page.getByText("Direction draft ready. Animation templates have not been assigned yet.", {exact: true}).count() === 1, "Invalidation did not restore the exact unassigned boundary.");
    ensure(await page.getByRole("button", {name: "Preview animated scene"}).count() === 0 && await page.locator(".cv2-template-preview").count() === 0, "Invalidated assignment left preview capability open.");
    await page.screenshot({path: config.artifactDir + "/template-invalidated-1440x900.png"});

    ensure(consoleErrors.length === 0, "Browser console errors: " + consoleErrors.join(" | "));
    return {
      schemaVersion: "1.0",
      status: "cv002-template-browser-proof",
      accessibility: {unassigned: unassignedAccessibility, preview: previewAccessibility},
      assignment: {contentHash: assignmentHash, template: assignment.template, rig: assignment.rig, characterAsset: assignment.characterAsset, propAsset: assignment.propAsset, slots: assignment.slots},
      consoleErrors,
      ergonomics: {unassigned: unassignedErgonomics, preview: previewErgonomics},
      gates: {absentBeforeAssignment: true, absentBeforePreviewClick: true, persistedVerifiedAssignment: true, articulatedFramesAdvanced: true, invalidatedAfterGraphEdit: true},
      screenshots: ["template-unassigned-1440x900.png", "template-assigned-1440x900.png", "template-assigned-760x900.png", "template-preview-1440x900.png", "template-invalidated-1440x900.png"],
    };
  }`;
  await writeFile(codeFile, proofSource, "utf8");
  try {
    await runCli(["open", url]);
    await runCli(["snapshot"]);
    const {stdout} = await runCli(["--raw", "run-code", "--filename", codeFile], {timeout: 120_000});
    let report;
    try {report = JSON.parse(stdout.trim());} catch {throw new Error(`Browser proof did not return a JSON report:\n${stdout}`);}
    await writeFile(reportFile, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    process.stdout.write(`CV-002 template browser proof passed: ${reportFile}\n`);
  } finally {
    await runCli(["close"]).catch(() => undefined);
    if (server) server.kill();
  }
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`);
  process.exitCode = 1;
});
