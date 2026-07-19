import { execFile, spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { get } from "node:http";
import { resolve } from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";
import { fileURLToPath, URL } from "node:url";

const execFileAsync = promisify(execFile);
const workspaceRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const outputDir = resolve(workspaceRoot, "output/playwright/cv001-creator");
const codeFile = resolve(outputDir, "browser-proof.playwright.js");
const reportFile = resolve(outputDir, "proof-report.json");
const url = "http://127.0.0.1:5173/";
const session = `cv001-creator-proof-${process.pid}`;
const cli =
  process.platform === "win32"
    ? resolve(workspaceRoot, "node_modules/.bin/playwright-cli.CMD")
    : resolve(workspaceRoot, "node_modules/.bin/playwright-cli");

const runCli = async (args, options = {}) =>
  execFileAsync(
    process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : cli,
    process.platform === "win32"
      ? ["/d", "/s", "/c", cli, `-s=${session}`, ...args]
      : [`-s=${session}`, ...args],
    {
      cwd: outputDir,
      maxBuffer: 20 * 1024 * 1024,
      ...options,
    },
  );

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
  await mkdir(outputDir, { recursive: true });
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
    axePath: resolve(
      workspaceRoot,
      "node_modules/axe-core/axe.min.js",
    ).replaceAll("\\", "/"),
    outputDir: outputDir.replaceAll("\\", "/"),
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
      const targets = [...document.querySelectorAll("button:not([disabled]), input:not([disabled]), textarea:not([disabled]), summary")]
        .filter(visible)
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {name: element.getAttribute("aria-label") || element.textContent?.trim().slice(0, 80) || element.tagName, width: rect.width, height: rect.height};
        })
        .filter((target) => target.width < 43.5 || target.height < 43.5);
      const microtype = [...document.querySelectorAll("p, small, q, label, legend, button, span, strong, dt, dd")]
        .filter((element) => element instanceof HTMLElement && visible(element) && !element.closest(".cv-advanced-drawer") && (element.textContent?.trim().length ?? 0) > 0)
        .map((element) => ({text: element.textContent.trim().slice(0, 80), fontSize: Number.parseFloat(getComputedStyle(element).fontSize)}))
        .filter((item) => item.fontSize < 10);
      return {targets, microtype};
    });
    const layout = async () => page.evaluate(() => {
      const preview = document.querySelector(".cv-player-frame")?.getBoundingClientRect();
      const director = document.querySelector(".cv-director")?.getBoundingClientRect();
      const rail = document.querySelector(".cv-beats-panel")?.getBoundingClientRect();
      return {
        viewport: {width: innerWidth, height: innerHeight},
        scrollWidth: document.documentElement.scrollWidth,
        preview: preview ? {width: preview.width, height: preview.height} : null,
        director: director ? {x: director.x, width: director.width, right: director.right} : null,
        rail: rail ? {width: rail.width} : null,
      };
    });

    const createAccessibility = await accessibilityAudit();
    const createErgonomics = await ergonomicsAudit();
    ensure(createAccessibility.criticalOrSerious.length === 0, "Create has critical or serious accessibility violations.");
    ensure(createErgonomics.targets.length === 0, "Create has interactive targets smaller than 44px.");
    ensure(createErgonomics.microtype.length === 0, "Create has creator-facing text smaller than 10px.");
    await page.screenshot({path: config.outputDir + "/create-1440x900.png"});

    await page.getByRole("button", {name: "Create animated first cut"}).click();
    await page.getByRole("heading", {name: "Notice the lantern"}).waitFor();
    const playhead = page.getByRole("slider", {name: "Scene playhead"});
    const pause = page.getByRole("button", {name: "Pause scene"});
    if (await pause.count()) await pause.click();
    await playhead.fill("0");
    const initialFrame = Number(await playhead.inputValue());
    ensure(initialFrame === 0, "New first cut did not begin at frame zero.");
    const advancedClosedByDefault = await page.getByRole("complementary", {name: "Advanced"}).count() === 0;
    ensure(advancedClosedByDefault, "Advanced was open by default.");
    const studioAccessibility = await accessibilityAudit();
    const studioErgonomics = await ergonomicsAudit();
    ensure(studioAccessibility.criticalOrSerious.length === 0, "Studio has critical or serious accessibility violations.");
    ensure(studioErgonomics.targets.length === 0, "Studio has interactive targets smaller than 44px.");
    ensure(studioErgonomics.microtype.length === 0, "Studio has creator-facing text smaller than 10px.");
    const desktopLayout = await layout();
    ensure(desktopLayout.scrollWidth === 1440, "Desktop Studio has horizontal overflow.");
    ensure(desktopLayout.preview.width >= 720, "Desktop preview is narrower than 720px.");
    ensure(desktopLayout.preview.width > desktopLayout.rail.width, "Desktop preview is not wider than the beat rail.");
    ensure(desktopLayout.preview.width > desktopLayout.director.width, "Desktop preview is not wider than Director.");
    ensure(desktopLayout.director.width <= 380, "Desktop Director exceeds 380px.");
    await page.screenshot({path: config.outputDir + "/studio-default-1440x900.png"});

    await page.getByRole("button", {name: "Play scene"}).click();
    await page.waitForTimeout(500);
    const advancedFrame = Number(await playhead.inputValue());
    ensure(advancedFrame > 0, "Player did not advance during playback.");
    await page.waitForTimeout(5000);
    const fullSceneFrame = Number(await playhead.inputValue());
    ensure(fullSceneFrame > 90, "New first cut stopped after Beat 1 instead of playing the full scene.");
    if (await page.getByRole("button", {name: "Pause scene"}).count()) await page.getByRole("button", {name: "Pause scene"}).click();

    const rail = page.getByRole("navigation", {name: "Scenes and beats"});
    await rail.getByRole("button", {name: /Pick up the lantern/}).click();
    const beat2Frame = Number(await playhead.inputValue());
    ensure(beat2Frame === 90, "Beat 2 selection did not seek to exact frame 90.");
    if (await page.getByRole("button", {name: "Pause scene"}).count()) await page.getByRole("button", {name: "Pause scene"}).click();
    await rail.getByRole("button", {name: /Show the lantern/}).click();
    const beat3Frame = Number(await playhead.inputValue());
    ensure(beat3Frame === 210, "Beat 3 selection did not seek to exact frame 210.");
    if (await page.getByRole("button", {name: "Pause scene"}).count()) await page.getByRole("button", {name: "Pause scene"}).click();

    const bindingHashes = async () => rail.locator("button[data-binding-hash]").evaluateAll((buttons) => buttons.map((button) => button.dataset.bindingHash));
    const beforeBindings = await bindingHashes();
    const direction = page.getByRole("textbox", {name: "What should change?"});
    await direction.fill("Make the reaction bigger and hold it longer.");
    await page.getByRole("button", {name: "Update beat"}).click();
    await page.waitForTimeout(120);
    if (await page.getByRole("button", {name: "Pause scene"}).count()) await page.getByRole("button", {name: "Pause scene"}).click();
    const editedBindings = await bindingHashes();
    ensure(editedBindings[0] === beforeBindings[0] && editedBindings[1] === beforeBindings[1] && editedBindings[2] !== beforeBindings[2], "Required direction did not change only Beat 3.");
    const editedProjectHash = await page.evaluate(() => JSON.parse(localStorage.getItem("storystage.cv001.creator.v1")).contentHash);
    await page.screenshot({path: config.outputDir + "/studio-beat-3-edited-1440x900.png"});

    await page.getByRole("button", {name: "Undo direction"}).click();
    await page.waitForTimeout(80);
    const undoneBindings = await bindingHashes();
    ensure(JSON.stringify(undoneBindings) === JSON.stringify(beforeBindings), "Undo did not restore exact binding hashes.");
    await page.getByRole("button", {name: "Redo direction"}).click();
    await page.waitForTimeout(80);
    const redoneBindings = await bindingHashes();
    ensure(JSON.stringify(redoneBindings) === JSON.stringify(editedBindings), "Redo did not restore exact edited hashes.");

    await page.getByRole("button", {name: "Advanced"}).click();
    await page.getByRole("complementary", {name: "Advanced"}).waitFor();
    await page.screenshot({path: config.outputDir + "/studio-advanced-open-1440x900.png"});
    await page.getByRole("button", {name: "Close Advanced"}).click();

    await page.reload({waitUntil: "networkidle"});
    await page.getByRole("button", {name: /Continue animated prototype The Lantern Discovery/}).click();
    await page.getByRole("heading", {name: "Show the lantern"}).waitFor();
    const continueStart = Number(await page.getByRole("slider", {name: "Scene playhead"}).inputValue());
    await page.waitForTimeout(350);
    const continueAfterWait = Number(await page.getByRole("slider", {name: "Scene playhead"}).inputValue());
    const restoredProjectHash = await page.evaluate(() => JSON.parse(localStorage.getItem("storystage.cv001.creator.v1")).contentHash);
    ensure(continueStart === 210 && continueAfterWait === 210, "Continue did not reopen paused at the saved Beat 3 start.");
    ensure(restoredProjectHash === editedProjectHash, "Reload did not preserve the verified edited project.");

    await page.setViewportSize({width: 1024, height: 768});
    await page.getByRole("button", {name: "Direct beat"}).click();
    await page.getByRole("button", {name: "Close Director"}).waitFor();
    await page.waitForTimeout(250);
    const responsiveLayout = await layout();
    ensure(responsiveLayout.scrollWidth === 1024, "Responsive Studio has horizontal overflow.");
    ensure(responsiveLayout.preview.width > 0, "Responsive preview is not visible.");
    ensure(Math.abs(responsiveLayout.director.width - 360) < 1 && Math.abs(responsiveLayout.director.right - 1024) < 1, "Responsive Director is not a 360px right-edge drawer.");
    await page.screenshot({path: config.outputDir + "/studio-1024x768.png"});

    ensure(consoleErrors.length === 0, "Browser console errors: " + consoleErrors.join(" | "));
    return {
      schemaVersion: "1.0",
      status: "cv001-creator-browser-proof",
      accessibility: {create: createAccessibility, studio: studioAccessibility},
      advancedClosedByDefault,
      bindingHashes: {before: beforeBindings, edited: editedBindings, undone: undoneBindings, redone: redoneBindings},
      consoleErrors,
      entryPlayback: {initialFrame, advancedFrame, fullSceneFrame, continueStart, continueAfterWait},
      ergonomics: {create: createErgonomics, studio: studioErgonomics},
      layout: {desktop: desktopLayout, responsive: responsiveLayout},
      persistedProjectHash: {beforeReload: editedProjectHash, afterReload: restoredProjectHash},
      selectedBeatFrames: {beat2: beat2Frame, beat3: beat3Frame},
      screenshots: ["create-1440x900.png", "studio-default-1440x900.png", "studio-beat-3-edited-1440x900.png", "studio-advanced-open-1440x900.png", "studio-1024x768.png"],
    };
  }`;
  await writeFile(codeFile, proofSource, "utf8");

  try {
    await runCli(["open", url]);
    await runCli(["snapshot"]);
    const { stdout } = await runCli(
      ["--raw", "run-code", "--filename", codeFile],
      { timeout: 120_000 },
    );
    let report;
    try {
      report = JSON.parse(stdout.trim());
    } catch {
      throw new Error(`Browser proof did not return a JSON report:\n${stdout}`);
    }
    await writeFile(reportFile, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    process.stdout.write(
      `CV-001 creator browser proof passed: ${reportFile}\n`,
    );
  } finally {
    await runCli(["close"]).catch(() => undefined);
    if (server) server.kill();
  }
}

void main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exitCode = 1;
});
