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
const runtimeDir = resolve(workspaceRoot, "output/playwright/cv002-draft");
const artifactDir = resolve(workspaceRoot, "docs/design/script-direction-workflow/cv002-browser-proof");
const codeFile = resolve(runtimeDir, "browser-proof.playwright.js");
const reportFile = resolve(artifactDir, "proof-report.json");
const url = "http://127.0.0.1:5173/";
const session = `cv002-draft-proof-${process.pid}`;
const cli = process.platform === "win32"
  ? resolve(workspaceRoot, "node_modules/.bin/playwright-cli.CMD")
  : resolve(workspaceRoot, "node_modules/.bin/playwright-cli");

const runCli = async (args, options = {}) => execFileAsync(
  process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : cli,
  process.platform === "win32"
    ? ["/d", "/s", "/c", cli, `-s=${session}`, ...args]
    : [`-s=${session}`, ...args], {
  cwd: runtimeDir,
  maxBuffer: 20 * 1024 * 1024,
  ...options,
});

async function isStudioRunning() {
  return new Promise((resolveRunning) => {
    const request = get(url, (response) => {
      response.resume();
      resolveRunning((response.statusCode ?? 500) < 400);
    });
    request.setTimeout(1_000, () => {
      request.destroy();
      resolveRunning(false);
    });
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
    server = spawn(command, ["--filter", "@storystage/studio", "dev"], {
      cwd: workspaceRoot,
      stdio: "ignore",
      windowsHide: true,
    });
    await waitForStudio();
  }

  const config = JSON.stringify({
    artifactDir: artifactDir.replaceAll("\\", "/"),
    axePath: resolve(workspaceRoot, "node_modules/axe-core/axe.min.js").replaceAll("\\", "/"),
    url,
  });
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
      return {
        criticalOrSerious: result.violations
          .filter((violation) => violation.impact === "critical" || violation.impact === "serious")
          .map((violation) => ({id: violation.id, impact: violation.impact, help: violation.help, targets: violation.nodes.map((node) => node.target)})),
        passes: result.passes.length,
      };
    });
    const ergonomicsAudit = async () => page.evaluate(() => {
      const visible = (element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
      };
      const targets = [...document.querySelectorAll("button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])")]
        .filter(visible)
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {name: element.getAttribute("aria-label") || element.textContent?.trim().slice(0, 80) || element.tagName, width: rect.width, height: rect.height};
        })
        .filter((target) => target.width < 43.5 || target.height < 43.5);
      const microtype = [...document.querySelectorAll("p, small, label, legend, button, span, strong, dt, dd")]
        .filter((element) => element instanceof HTMLElement && visible(element) && (element.textContent?.trim().length ?? 0) > 0)
        .map((element) => ({text: element.textContent.trim().slice(0, 80), fontSize: Number.parseFloat(getComputedStyle(element).fontSize)}))
        .filter((item) => item.fontSize < 10);
      return {targets, microtype};
    });
    const layoutAudit = async () => page.evaluate(() => {
      const rail = document.querySelector(".cv2-scene-rail")?.getBoundingClientRect();
      const source = document.querySelector(".cv2-source-card")?.getBoundingClientRect();
      return {viewport: {width: innerWidth, height: innerHeight}, scrollWidth: document.documentElement.scrollWidth, railWidth: rail?.width ?? 0, sourceWidth: source?.width ?? 0};
    });
    const storedProject = async () => page.evaluate(() => JSON.parse(localStorage.getItem("storystage.cv002.draft.v1")));
    const exactRoundTrip = (project) => {
      const beats = project.graph.scenes.flatMap((scene) => scene.beats);
      let cursor = 0;
      let reconstructed = "";
      for (const beat of beats) {
        reconstructed += project.sourceText.slice(cursor, beat.sourceRange.start) + beat.text;
        cursor = beat.sourceRange.end;
      }
      reconstructed += project.sourceText.slice(cursor);
      return reconstructed === project.sourceText && beats.every((beat) => project.sourceText.slice(beat.sourceRange.start, beat.sourceRange.end) === beat.text);
    };

    const createAccessibility = await accessibilityAudit();
    const createErgonomics = await ergonomicsAudit();
    ensure(createAccessibility.criticalOrSerious.length === 0, "Create has critical or serious accessibility violations.");
    ensure(createErgonomics.targets.length === 0, "Create has interactive targets smaller than 44px.");
    ensure(createErgonomics.microtype.length === 0, "Create has creator-facing text smaller than 10px.");

    await page.getByRole("button", {name: /Weird History/}).click();
    ensure(await page.getByRole("button", {name: "Create animated first cut"}).count() === 0, "Weird History falsely claims an animated first cut.");
    await page.getByRole("button", {name: "Load a Weird History sample"}).click();
    const sourceText = await page.getByRole("textbox", {name: "Script"}).inputValue();
    ensure(sourceText.split(/\\s+/).filter(Boolean).length >= 80, "History sample does not meet the script bound.");
    ensure(await page.getByText("Draft breakdown only · no generated art, voice, animation, or export").count() === 1, "Create is missing the honest draft boundary.");
    await page.screenshot({path: config.artifactDir + "/create-weird-history-1440x900.png"});

    await page.getByRole("button", {name: "Break script into scenes"}).click();
    await page.getByRole("heading", {name: "Shape the story before directing it."}).waitFor();
    ensure(await page.getByLabel("Remotion animation").count() === 0, "Arbitrary breakdown mounted the Remotion player.");
    ensure(await page.locator(".cv-player-frame").count() === 0, "Arbitrary breakdown mounted a production preview.");
    const initial = await storedProject();
    ensure(initial.sourceText === sourceText && exactRoundTrip(initial), "Initial graph did not preserve exact source text and spans.");
    ensure(initial.graph.scenes.length === 3 && initial.graph.scenes.flatMap((scene) => scene.beats).length === 9, "Sample did not produce the expected deterministic 3-scene/9-beat breakdown.");
    const initialGraphHash = initial.graph.contentHash;
    const initialDirectionHashes = initial.directionDraft.directions.map((direction) => direction.contentHash);
    const breakdownAccessibility = await accessibilityAudit();
    const breakdownErgonomics = await ergonomicsAudit();
    const desktopLayout = await layoutAudit();
    ensure(breakdownAccessibility.criticalOrSerious.length === 0, "Breakdown has critical or serious accessibility violations.");
    ensure(breakdownErgonomics.targets.length === 0, "Breakdown has interactive targets smaller than 44px.");
    ensure(breakdownErgonomics.microtype.length === 0, "Breakdown has creator-facing text smaller than 10px.");
    ensure(desktopLayout.scrollWidth === 1440 && desktopLayout.railWidth >= 280 && desktopLayout.sourceWidth >= 600, "Desktop breakdown layout failed its size or overflow contract.");

    const role = page.getByRole("combobox", {name: "What job does this beat do?"});
    await role.selectOption("reveal");
    const roleEdited = await storedProject();
    ensure(roleEdited.historyCursor === 1 && roleEdited.graph.scenes[0].beats[0].role === "reveal", "Role edit was not committed.");
    const editedDirectionHashes = roleEdited.directionDraft.directions.map((direction) => direction.contentHash);
    ensure(editedDirectionHashes[0] !== initialDirectionHashes[0] && editedDirectionHashes.slice(1).every((hash, index) => hash === initialDirectionHashes[index + 1]), "Role edit changed unrelated beat directions.");
    await page.getByRole("button", {name: "Undo story edit"}).click();
    const undone = await storedProject();
    ensure(undone.graph.contentHash === initialGraphHash && undone.historyCursor === 0, "Undo did not restore the exact initial graph.");
    await page.getByRole("button", {name: "Redo story edit"}).click();
    const redone = await storedProject();
    ensure(redone.graph.contentHash === roleEdited.graph.contentHash && redone.historyCursor === 1, "Redo did not restore the exact role edit.");

    const sourceBeat = page.getByRole("textbox", {name: "Source text"});
    await sourceBeat.evaluate((element) => {
      element.focus();
      element.setSelectionRange(20, 20);
      element.dispatchEvent(new Event("select", {bubbles: true}));
      document.dispatchEvent(new Event("selectionchange", {bubbles: true}));
    });
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowLeft");
    ensure(await page.getByRole("button", {name: "Split at cursor"}).isEnabled(), "Cursor split did not become available.");
    await page.getByRole("button", {name: "Split at cursor"}).click();
    const split = await storedProject();
    ensure(split.graph.scenes.flatMap((scene) => scene.beats).length === 10 && exactRoundTrip(split), "Cursor split lost source text or did not add one beat.");
    await page.locator(".cv2-scene-rail section > button").nth(1).click();
    await page.getByRole("button", {name: "Merge with previous"}).click();
    const merged = await storedProject();
    ensure(merged.graph.scenes.flatMap((scene) => scene.beats).length === 9 && exactRoundTrip(merged), "Merge did not restore nine beats with exact source text.");

    await page.locator(".cv2-scene-rail section > button").nth(1).click();
    await page.getByRole("button", {name: "Start new scene"}).click();
    const boundaryAdded = await storedProject();
    ensure(boundaryAdded.graph.scenes.length === 4, "Add scene boundary did not create a fourth scene.");
    await page.getByRole("button", {name: "Remove scene break"}).click();
    const boundaryRemoved = await storedProject();
    ensure(boundaryRemoved.graph.scenes.length === 3 && exactRoundTrip(boundaryRemoved), "Remove scene boundary did not restore three exact scenes.");
    await page.getByRole("button", {name: "Undo story edit"}).click();
    ensure((await storedProject()).graph.scenes.length === 4, "Undo did not restore the added scene boundary.");
    await page.getByRole("button", {name: "Redo story edit"}).click();
    const finalBreakdown = await storedProject();
    ensure(finalBreakdown.graph.scenes.length === 3 && finalBreakdown.graph.scenes[0].beats[0].role === "reveal", "Redo did not restore the final edited breakdown.");
    await page.screenshot({path: config.artifactDir + "/breakdown-edited-1440x900.png"});

    await page.getByRole("button", {name: "Review direction draft"}).click();
    await page.getByRole("heading", {name: "Evidence first, hard cuts, and a faster editorial pulse."}).waitFor();
    const exactBoundary = "Direction draft ready. Animation templates have not been assigned yet.";
    ensure(await page.getByText(exactBoundary, {exact: true}).count() === 1, "Direction page is missing the exact animation-template boundary.");
    ensure(await page.getByRole("button", {name: "Build first cut"}).isDisabled(), "Unassigned direction draft exposed first-cut production.");
    ensure(await page.getByLabel("Remotion animation").count() === 0, "Direction draft mounted the Remotion player.");
    const direction = await storedProject();
    const fields = ["staging", "shotSize", "treatment", "cameraIntent", "transition", "performanceIntent", "textEmphasis", "sfxIntent", "musicIntent"];
    ensure(direction.directionDraft.directions.every((beat) => fields.every((field) => typeof beat[field] === "string")), "Direction draft is missing a strict direction field.");
    ensure(direction.directionDraft.directions.some((beat) => beat.transition === "hard-cut") && direction.directionDraft.directions.some((beat) => ["evidence", "diagram", "reconstruction"].includes(beat.treatment)), "Weird History draft does not visibly use editorial grammar.");
    const directionAccessibility = await accessibilityAudit();
    const directionErgonomics = await ergonomicsAudit();
    ensure(directionAccessibility.criticalOrSerious.length === 0, "Direction has critical or serious accessibility violations.");
    ensure(directionErgonomics.targets.length === 0, "Direction has interactive targets smaller than 44px.");
    ensure(directionErgonomics.microtype.length === 0, "Direction has creator-facing text smaller than 10px.");
    await page.screenshot({path: config.artifactDir + "/direction-weird-history-1440x900.png"});

    const finalHash = direction.contentHash;
    await page.reload({waitUntil: "networkidle"});
    await page.getByRole("button", {name: /Continue direction draft/}).click();
    await page.getByRole("heading", {name: "Shape the story before directing it."}).waitFor();
    const restored = await storedProject();
    ensure(restored.contentHash === finalHash && restored.graph.scenes[0].beats[0].role === "reveal", "Reload did not restore the verified edited direction draft.");
    ensure(await page.getByLabel("Remotion animation").count() === 0, "Restored arbitrary draft mounted the Remotion player.");

    await page.setViewportSize({width: 760, height: 900});
    await page.waitForTimeout(120);
    const responsiveLayout = await layoutAudit();
    ensure(responsiveLayout.scrollWidth === 760 && responsiveLayout.sourceWidth > 0, "Responsive breakdown has overflow or a missing source editor.");
    await page.screenshot({path: config.artifactDir + "/breakdown-760x900.png"});

    ensure(consoleErrors.length === 0, "Browser console errors: " + consoleErrors.join(" | "));
    return {
      schemaVersion: "1.0",
      status: "cv002-draft-browser-proof",
      accessibility: {create: createAccessibility, breakdown: breakdownAccessibility, direction: directionAccessibility},
      consoleErrors,
      direction: {beatCount: direction.directionDraft.directions.length, fields, grammar: direction.grammar, templatesAssigned: direction.directionDraft.animationStatus !== "templates-unassigned"},
      editing: {initialGraphHash, roleEditedGraphHash: roleEdited.graph.contentHash, finalProjectHash: finalHash, historyLength: direction.history.length},
      ergonomics: {create: createErgonomics, breakdown: breakdownErgonomics, direction: directionErgonomics},
      layout: {desktop: desktopLayout, responsive: responsiveLayout},
      sourceIntegrity: {characters: sourceText.length, exactRoundTrip: exactRoundTrip(direction), paragraphs: sourceText.split(/\\r?\\n[\\t ]*\\r?\\n/).length, words: sourceText.split(/\\s+/).filter(Boolean).length},
      screenshots: ["create-weird-history-1440x900.png", "breakdown-edited-1440x900.png", "direction-weird-history-1440x900.png", "breakdown-760x900.png"],
    };
  }`;
  await writeFile(codeFile, proofSource, "utf8");

  try {
    await runCli(["open", url]);
    await runCli(["snapshot"]);
    const {stdout} = await runCli(["--raw", "run-code", "--filename", codeFile], {timeout: 120_000});
    let report;
    try {
      report = JSON.parse(stdout.trim());
    } catch {
      throw new Error(`Browser proof did not return a JSON report:\n${stdout}`);
    }
    await writeFile(reportFile, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    process.stdout.write(`CV-002 draft browser proof passed: ${reportFile}\n`);
  } finally {
    await runCli(["close"]).catch(() => undefined);
    if (server) server.kill();
  }
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`);
  process.exitCode = 1;
});
