/* global console, document, getComputedStyle, process */
/* F4-WP2 reproducible browser evidence. Exercises the real Product v1
 * Projects -> Create -> Studio -> Assets & Rigs journey at 1440x900 and
 * captures selected-scene partial, blocked, ready, episode aggregate, honest
 * empty, and keyboard-focus states. Listeners are attached before navigation;
 * every screenshot and the report are SHA-256 hashed. */
import crypto from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const loadPackage = createRequire(import.meta.url);
const REPO_ROOT = path.resolve(import.meta.dirname, "../../..");
const pnpmStore = path.join(REPO_ROOT, "node_modules", ".pnpm");
const playwrightStores = fs
  .readdirSync(pnpmStore)
  .filter((entry) => entry.startsWith("playwright-core@"));
if (playwrightStores.length !== 1)
  throw new Error(
    `Expected exactly one installed playwright-core, found ${playwrightStores.length}`,
  );
const pw = loadPackage(
  path.join(pnpmStore, playwrightStores[0], "node_modules", "playwright-core"),
);

const BASE = "http://127.0.0.1:5173/";
const OUT = path.join(
  REPO_ROOT,
  "reports",
  "agent-handoffs",
  "2026-07-22-kimi-f4-wp2-scene-asset-requirements-readiness",
  "screenshots",
);
const SAMPLE_SCRIPT = [
  "Lila lives in a quiet village at the edge of a deep, whispering forest.",
  "One evening, she finds a small lantern glowing under the roots of an old tree.",
  "The light flickers, and a soft rustle in the bushes makes her pause.",
  "Summoning her courage, Lila picks up the lantern and follows the glow.",
].join("\n\n");
const READY_DISCLAIMER =
  "Ready here means only that this local planning record satisfies this package's local checklist";

const sha256File = (file) =>
  crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const report = {
  task: "F4-WP2-SCENE-ASSET-REQUIREMENTS-READINESS",
  base: BASE,
  capturedAt: new Date().toISOString(),
  viewport: "1440x900",
  checks: [],
  consoleIssues: [],
  pageErrors: [],
  screenshots: [],
};
const rec = (name, pass, details) =>
  report.checks.push({ name, pass, details });

async function measure(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const overflowElements = [];
    document.querySelectorAll("body *").forEach((element) => {
      const rect = element.getBoundingClientRect();
      if (
        rect.width > 0 &&
        (rect.right > doc.clientWidth + 1 || rect.left < -1)
      )
        overflowElements.push({
          tag: element.tagName.toLowerCase(),
          cls:
            typeof element.className === "string"
              ? element.className.slice(0, 80)
              : "",
          left: Math.round(rect.left),
          right: Math.round(rect.right),
        });
    });
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      overflowElements: overflowElements.slice(0, 10),
    };
  });
}

async function assertNoOverflow(page, name) {
  const value = await measure(page);
  rec(
    `${name}: no horizontal document overflow`,
    value.scrollWidth <= value.clientWidth &&
      value.overflowElements.length === 0,
    value,
  );
}

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  report.screenshots.push({
    file: `screenshots/${name}.png`,
    sha256: sha256File(file),
  });
}

async function requirementsText(page) {
  return page.locator("[data-testid='pv1-requirements']").textContent();
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await pw.chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  const consoleIssues = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "warning" || message.type() === "error")
      consoleIssues.push(`${message.type()}: ${message.text()}`);
  });
  page.on("pageerror", (error) =>
    pageErrors.push(`pageerror: ${error.message}`),
  );

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "New project" }).first().click();
  await page.getByRole("button", { name: /Paste a script/ }).click();
  await page.getByRole("textbox", { name: "Script" }).fill(SAMPLE_SCRIPT);
  await page.getByRole("button", { name: "Create proposal" }).click();
  await page.getByRole("article", { name: "Review proposal" }).waitFor();
  await page.getByRole("button", { name: /Enter Studio/ }).click();
  await page.waitForSelector("[data-testid='pv1-studio']");
  await page.getByRole("button", { name: "Assets & Rigs" }).click();
  await page.waitForSelector("[data-testid='pv1-assets']");

  // All-scenes episode aggregate: scope is explicit and counts come from the
  // same 37 rendered rows.
  await page
    .locator("[data-testid='pv1-requirements']")
    .scrollIntoViewIfNeeded();
  let text = await requirementsText(page);
  rec(
    "episode aggregate: visible scope, mechanically matching totals, and ready disclaimer",
    text.includes(
      "Episode 1 · The Storylight in the Little Wood · All scenes",
    ) &&
      text.includes("not a selected-scene result") &&
      text.includes("Required 33 · Optional 4 · Reusable 34") &&
      text.includes("Counts derive from the 37 records listed below") &&
      text.includes(READY_DISCLAIMER),
    { text: text.slice(0, 1000) },
  );
  await assertNoOverflow(page, "episode aggregate");
  await shot(page, "wp2-1440x900-all-scenes-aggregate");

  // Scene 3: partial state covers all five readiness values and independently
  // displays necessity and reuse.
  await page.getByLabel("Scene filter").selectOption("scene-3");
  await page
    .locator("[data-testid='pv1-requirements']")
    .scrollIntoViewIfNeeded();
  text = await requirementsText(page);
  rec(
    "scene 3 partial: all readiness states, independent necessity/reuse, and selected scope",
    text.includes("Scene 3 · Berry Patch") &&
      text.includes("Required 5 · Optional 1 · Reusable 5") &&
      text.includes("Ready 1 · Candidate 2 · Missing 1") &&
      text.includes("Needs preparation 1 · Needs review 1") &&
      text.includes("Required · Reusable · Missing") &&
      text.includes(READY_DISCLAIMER),
    { text: text.slice(0, 1400) },
  );
  await assertNoOverflow(page, "scene 3 partial");
  await shot(page, "wp2-1440x900-scene3-partial");

  // New Open-record controls are keyboard focusable with a visible outline
  // and unique accessible identity.
  const focusTarget = page.getByRole("button", {
    name: /Open Dropped berry trail record for Scene 3/,
  });
  for (let index = 0; index < 24; index += 1) {
    await page.keyboard.press("Tab");
    if (
      await focusTarget.evaluate(
        (element) => document.activeElement === element,
      )
    )
      break;
  }
  const focus = await focusTarget.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      active: document.activeElement === element,
      outlineWidth: style.outlineWidth,
      outlineStyle: style.outlineStyle,
      ariaLabel: element.getAttribute("aria-label"),
    };
  });
  rec(
    "keyboard focus: unique Open-record control has visible focus",
    focus.active &&
      Number.parseFloat(focus.outlineWidth) >= 2 &&
      focus.outlineStyle === "solid" &&
      focus.ariaLabel.includes("Dropped berry trail") &&
      focus.ariaLabel.includes("Scene 3"),
    focus,
  );
  await shot(page, "wp2-1440x900-open-record-focus");

  // Scene 4: deliberately blocked with no Ready rows and every non-ready row
  // carrying readable reasons.
  await page.getByLabel("Scene filter").selectOption("scene-4");
  await page
    .locator("[data-testid='pv1-requirements']")
    .scrollIntoViewIfNeeded();
  text = await requirementsText(page);
  const blocked = await page.evaluate(() => ({
    rows: document.querySelectorAll(".pv1-requirement-row").length,
    reasons: [...document.querySelectorAll(".pv1-requirement-reason")].map(
      (element) => element.textContent?.trim() ?? "",
    ),
  }));
  rec(
    "scene 4 blocked: zero ready and readable blocker on every row",
    text.includes("Scene 4 · Little Stream") &&
      text.includes("Ready 0") &&
      blocked.rows === 4 &&
      blocked.reasons.length === 4 &&
      blocked.reasons.every((reason) => reason.length > 20),
    blocked,
  );
  await assertNoOverflow(page, "scene 4 blocked");
  await shot(page, "wp2-1440x900-scene4-blocked");

  // Scene 1: honest local-record Ready state with adjacent disclaimer and a
  // separate record-less Missing entry.
  await page.getByLabel("Scene filter").selectOption("scene-1");
  await page
    .locator("[data-testid='pv1-requirements']")
    .scrollIntoViewIfNeeded();
  text = await requirementsText(page);
  rec(
    "scene 1 ready: local-only disclaimer and record-less missing truth",
    text.includes("Scene 1 · The Home Nook") &&
      text.includes("Ready 1") &&
      text.includes(READY_DISCLAIMER) &&
      text.includes("Unfinished-stories shelf dressing") &&
      text.includes("No local record exists to open"),
    { text: text.slice(0, 1400) },
  );
  await assertNoOverflow(page, "scene 1 ready");
  await shot(page, "wp2-1440x900-scene1-ready");

  // Honest empty asset category/list while scene requirements remain visible
  // and authoritative.
  await page.getByRole("button", { name: "Props" }).click();
  await page.getByLabel("Scene filter").selectOption("scene-2");
  await page.locator(".pv1-assets-columns").scrollIntoViewIfNeeded();
  const empty = await page.evaluate(() => ({
    list: document.querySelector(".pv1-asset-list")?.textContent ?? "",
    detail: document.querySelector(".pv1-asset-detail")?.textContent ?? "",
    requirementScope:
      document.querySelector("[data-testid='pv1-requirements'] h2")
        ?.textContent ?? "",
  }));
  rec(
    "empty state: no hidden Props record and scene requirement scope remains authoritative",
    empty.list.includes("No props records are scoped to") &&
      empty.detail.includes("Nothing selected") &&
      empty.requirementScope === "Scene 2 · Forest Path",
    empty,
  );
  await assertNoOverflow(page, "honest empty state");
  await shot(page, "wp2-1440x900-empty-props-scene2");

  report.consoleIssues = consoleIssues;
  report.pageErrors = pageErrors;
  await context.close();
  await browser.close();

  const reportFile = path.join(OUT, "clickthrough-report.json");
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  const failed = report.checks.filter((check) => !check.pass);
  if (consoleIssues.length > 0)
    failed.push({ name: `console issues ${JSON.stringify(consoleIssues)}` });
  if (pageErrors.length > 0)
    failed.push({ name: `page errors ${JSON.stringify(pageErrors)}` });
  console.log(`report: ${reportFile}`);
  console.log(`report sha256: ${sha256File(reportFile)}`);
  if (failed.length > 0) {
    console.log(`FAILED CHECKS (${failed.length}):`);
    failed.forEach((failure) => console.log(` - ${failure.name}`));
    process.exit(1);
  }
  console.log(
    `ALL ${report.checks.length} CHECKS PASSED, zero console warnings/errors, zero page errors`,
  );
})().catch((error) => {
  console.error("EVIDENCE FAILED", error);
  process.exit(1);
});
