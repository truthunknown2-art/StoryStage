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
const runtimeDir = resolve(workspaceRoot, "output/playwright/cv002-creator-shell");
const artifactDir = resolve(
  workspaceRoot,
  "artifacts/DSA-002b1/arbitrary-creator-shell",
);
const codeFile = resolve(runtimeDir, "browser-proof.playwright.js");
const reportFile = resolve(artifactDir, "proof-report.json");
const url = "http://127.0.0.1:5173/";
const session = `cv002-creator-shell-${process.pid}`;
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
      cwd: runtimeDir,
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
  throw new Error("StoryStage Studio did not become ready.");
}

async function main() {
  await mkdir(runtimeDir, { recursive: true });
  await mkdir(artifactDir, { recursive: true });
  let server = null;
  if (!(await isStudioRunning())) {
    server = spawn(
      process.platform === "win32" ? "pnpm.cmd" : "pnpm",
      ["--filter", "@storystage/studio", "dev"],
      { cwd: workspaceRoot, stdio: "ignore", windowsHide: true },
    );
    await waitForStudio();
  }

  const config = JSON.stringify({
    artifactDir: artifactDir.replaceAll("\\", "/"),
    axePath: resolve(workspaceRoot, "node_modules/axe-core/axe.min.js").replaceAll(
      "\\",
      "/",
    ),
    url,
  });
  const proofSource = `async (page) => {
    const config = ${config};
    const ensure = (condition, message) => { if (!condition) throw new Error(message); };
    const consoleErrors = [];
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
    await page.setViewportSize({width: 1440, height: 900});
    await page.addInitScript({path: config.axePath});

    const audit = async () => page.evaluate(async () => {
      const visible = (element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
      };
      const axe = await window.axe.run(document, {runOnly: {type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"]}});
      const targets = [...document.querySelectorAll("button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])")]
        .filter(visible)
        .map((element) => { const rect = element.getBoundingClientRect(); return {name: element.getAttribute("aria-label") || element.textContent?.trim().slice(0, 70), width: rect.width, height: rect.height}; })
        .filter((target) => target.width < 43.5 || target.height < 43.5);
      const microtype = [...document.querySelectorAll("p, small, label, legend, button, span, strong, dt, dd")]
        .filter((element) => visible(element) && (element.textContent?.trim().length ?? 0) > 0)
        .map((element) => ({text: element.textContent.trim().slice(0, 70), fontSize: Number.parseFloat(getComputedStyle(element).fontSize)}))
        .filter((item) => item.fontSize < 10);
      return {
        serious: axe.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious").map((violation) => ({id: violation.id, nodes: violation.nodes.map((node) => ({target: node.target, html: node.html, failureSummary: node.failureSummary, data: node.any?.[0]?.data}))})),
        targets,
        microtype,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });

    const openProduction = async (grammar) => {
      await page.goto(config.url, {waitUntil: "networkidle"});
      await page.evaluate(() => localStorage.clear());
      await page.reload({waitUntil: "networkidle"});
      if (grammar === "kids") {
        await page.getByRole("button", {name: "Load a longer Kids script sample"}).click();
      } else {
        await page.getByRole("button", {name: /Weird History/}).click();
        await page.getByRole("button", {name: "Load a Weird History sample"}).click();
      }
      const previewIds = await page.locator('[aria-label="Preview of natural beats"] [data-beat-id]').evaluateAll((cards) => cards.map((card) => card.dataset.beatId));
      ensure(previewIds.length === 4 && previewIds.every(Boolean), grammar + " Create did not show four canonical CV-002 beat IDs.");
      await page.getByRole("button", {name: "Create first cut"}).click();
      await page.getByRole("heading", {name: "Shape the story before directing it."}).waitFor();
      await page.getByRole("button", {name: /Review direction draft/}).click();
      await page.getByLabel("Director controls").waitFor();
    };

    const assertStudio = async (grammar) => {
      ensure(await page.locator(".cv2-director-player").count() === 1 && await page.getByRole("button", {name: "Play video"}).count() === 1, grammar + " Studio does not have one authoritative Player.");
      ensure(await page.getByRole("tab", {name: "Visual"}).count() === 1, grammar + " Studio is missing Visual.");
      ensure(await page.getByRole("tab", {name: "Motion"}).count() === 1, grammar + " Studio is missing Motion.");
      ensure(await page.getByRole("tab", {name: "Audio"}).count() === 0 && await page.getByRole("tab", {name: "Assets"}).count() === 0, grammar + " Studio exposes ornamental departments.");
      const episodeHash = await page.getByLabel("Directed animatic draft").getAttribute("data-episode-hash");
      const railHashes = await page.getByLabel("Studio scenes and beats").getByRole("img", {name: /Canonical frame/}).evaluateAll((thumbnails) => thumbnails.map((thumbnail) => thumbnail.dataset.episodeHash));
      const stripHashes = await page.getByLabel("Compact beat strip").getByRole("img", {name: /Canonical frame/}).evaluateAll((thumbnails) => thumbnails.map((thumbnail) => thumbnail.dataset.episodeHash));
      ensure(railHashes.length > 3 && [...railHashes, ...stripHashes].every((hash) => hash === episodeHash), grammar + " thumbnails are not bound to the current executable episode.");
      const timeline = page.getByLabel("Selected-beat timeline");
      for (const lane of ["Shots", "Events", "Camera"]) ensure(await timeline.getByText(lane, {exact: true}).count() === 1, grammar + " Studio is missing the " + lane + " lane.");
      const result = await audit();
      ensure(result.serious.length === 0, grammar + " Studio has serious accessibility violations: " + JSON.stringify(result.serious));
      ensure(result.targets.length === 0, grammar + " Studio has sub-44px targets: " + JSON.stringify(result.targets));
      ensure(result.microtype.length === 0, grammar + " Studio has sub-10px text: " + JSON.stringify(result.microtype));
      ensure(result.scrollWidth === 1440, grammar + " Studio has horizontal overflow.");
      return {episodeHash, railThumbnailCount: railHashes.length, stripThumbnailCount: stripHashes.length, audit: result};
    };

    const results = {};
    for (const grammar of ["kids", "history"]) {
      await openProduction(grammar);
      results[grammar] = await assertStudio(grammar);
      await page.screenshot({path: config.artifactDir + "/" + grammar + "-studio-1440x900.png", fullPage: true});
    }

    const originalHash = results.history.episodeHash;
    const size = page.getByLabel("Shot size");
    const currentSize = await size.inputValue();
    await size.selectOption(currentSize === "close-up" ? "wide" : "close-up");
    await page.getByRole("button", {name: "Preview visual change"}).click();
    await page.getByRole("button", {name: "Apply and replay this beat"}).click();
    const editedHash = await page.getByLabel("Directed animatic draft").getAttribute("data-episode-hash");
    ensure(editedHash !== originalHash, "Patch-backed Visual control did not rebuild the executable episode.");
    const editedThumbnailHashes = await page.getByLabel("Studio scenes and beats").getByRole("img", {name: /Canonical frame/}).evaluateAll((thumbnails) => thumbnails.map((thumbnail) => thumbnail.dataset.episodeHash));
    ensure(editedThumbnailHashes.every((hash) => hash === editedHash), "Thumbnails did not rebuild after the Visual patch.");

    await page.setViewportSize({width: 1024, height: 768});
    await page.waitForTimeout(150);
    const responsive = await audit();
    ensure(responsive.scrollWidth === 1024 && responsive.targets.length === 0 && responsive.microtype.length === 0, "Responsive Studio failed its layout or ergonomics contract: " + JSON.stringify(responsive));
    await page.screenshot({path: config.artifactDir + "/history-studio-1024x768.png", fullPage: true});
    ensure(consoleErrors.length === 0, "Browser console errors: " + consoleErrors.join(" | "));
    return {schemaVersion: "1.0", status: "cv002-arbitrary-creator-shell-proof", results, visualPatch: {originalHash, editedHash}, responsive, consoleErrors};
  }`;
  await writeFile(codeFile, proofSource, "utf8");

  try {
    await runCli(["open", url]);
    const { stdout } = await runCli(
      ["--raw", "run-code", "--filename", codeFile],
      { timeout: 120_000 },
    );
    let report;
    try {
      report = JSON.parse(stdout.trim());
    } catch {
      throw new Error(`Browser proof did not return JSON:\n${stdout}`);
    }
    await writeFile(reportFile, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    process.stdout.write(`CV-002 creator shell proof passed: ${reportFile}\n`);
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
