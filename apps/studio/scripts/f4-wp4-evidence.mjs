/* global console, document, getComputedStyle, process */
/* F4-WP4 reproducible browser evidence. Exercises the real Product v1
 * Projects -> Create -> shared review -> Studio -> Assets & Rigs route at
 * 1440x900 and captures the deterministic layer-and-rig review prototype:
 * character Incomplete, character Needs correction with its exact blocker,
 * character Review-ready with the adjacent non-production truth, rig
 * turnaround/parts/pivots/masks/profiles, expressions/visemes and the motion
 * checklist, layered-set plane order, foreground occluder review, the
 * unavailable fail-closed disabled reason, keyboard focus, and Escape and
 * scope-change recovery. Listeners are attached before navigation; every
 * screenshot and the machine-readable report are SHA-256 hashed. */
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

const BASE = process.env.STUDIO_BASE_URL ?? "http://127.0.0.1:5173/";
const OUT = path.join(
  REPO_ROOT,
  "reports",
  "agent-handoffs",
  "2026-07-22-kimi-f4-wp4-layer-rig-review-ux",
  "screenshots",
);
const SAMPLE_SCRIPT = [
  "Lila lives in a quiet village at the edge of a deep, whispering forest.",
  "One evening, she finds a small lantern glowing under the roots of an old tree.",
  "The light flickers, and a soft rustle in the bushes makes her pause.",
  "Summoning her courage, Lila picks up the lantern and follows the glow.",
].join("\n\n");
const REVIEW_READY_TRUTH_FRAGMENT =
  "no files were inspected, no layer or rig exists";
const NO_EXAMPLE_FRAGMENT =
  "no declared demo review example in the bounded F4-WP4 fixture";

const sha256File = (file) =>
  crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const report = {
  task: "F4-WP4-LAYER-RIG-REVIEW-UX",
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

const panelText = (page) =>
  page.locator("[data-testid='pv1-review']").textContent();
const countsText = (page) =>
  page.locator(".pv1-requirement-counts").textContent();
const scrollPanel = (page) =>
  page.locator("[data-testid='pv1-review']").scrollIntoViewIfNeeded();

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
  await page.getByLabel("Scene filter").selectOption("scene-1");
  const countsAtStart = await countsText(page);

  // Keyboard focus: the review control is reachable by Tab with a visible
  // outline and a unique accessible name.
  const olloReviewButton = page.getByRole("button", {
    name: "Review layers & rig for Ollo in Scene 1 · The Home Nook",
  });
  for (let index = 0; index < 60; index += 1) {
    await page.keyboard.press("Tab");
    if (
      await olloReviewButton.evaluate(
        (element) => document.activeElement === element,
      )
    )
      break;
  }
  const focus = await olloReviewButton.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      active: document.activeElement === element,
      outlineWidth: style.outlineWidth,
      outlineStyle: style.outlineStyle,
      ariaLabel: element.getAttribute("aria-label"),
      ariaExpanded: element.getAttribute("aria-expanded"),
    };
  });
  rec(
    "keyboard focus: review control is reachable with visible focus and unique identity",
    focus.active &&
      Number.parseFloat(focus.outlineWidth) >= 2 &&
      focus.outlineStyle === "solid" &&
      focus.ariaLabel.includes("Ollo") &&
      focus.ariaLabel.includes("Scene 1") &&
      focus.ariaExpanded === "false",
    focus,
  );
  await olloReviewButton.evaluate((element) =>
    element.scrollIntoView({ block: "center" }),
  );
  await shot(page, "wp4-1440x900-review-button-focus");

  // Character Incomplete: the default declared example names what is missing.
  await olloReviewButton.press("Enter");
  await page.waitForSelector("[data-testid='pv1-review']");
  const headingFocus = await page.evaluate(() => {
    const heading = document.querySelector("[data-testid='pv1-review'] h3");
    return {
      focused: document.activeElement === heading,
      text: heading?.textContent ?? "",
    };
  });
  let text = await panelText(page);
  rec(
    "character incomplete: focus enters the labelled heading; missing declarations and state disclaimer are visible",
    headingFocus.focused &&
      headingFocus.text === "Ollo" &&
      text.includes("Review state:") &&
      text.includes("Incomplete") &&
      text.includes("Before this declaration could be review-ready") &&
      text.includes(
        "Turnaround views not declared: Three-quarter view, Side view.",
      ) &&
      text.includes("Review states describe only the declared local checklist"),
    { headingFocus, text: text.slice(0, 900) },
  );
  rec(
    "counts unchanged after opening review",
    (await countsText(page)) === countsAtStart,
    { countsAtStart, now: await countsText(page) },
  );
  await scrollPanel(page);
  await assertNoOverflow(page, "character-incomplete");
  await shot(page, "wp4-1440x900-character-incomplete");

  // Character Review-ready with the adjacent non-production truth.
  await page.getByRole("button", { name: "Review-ready example" }).click();
  text = await panelText(page);
  rec(
    "character review-ready: turnaround views, parts/pivots, masks, profiles, expressions/visemes, checklist pass, and the adjacent non-production truth",
    text.includes("Review-ready") &&
      text.includes(REVIEW_READY_TRUTH_FRAGMENT) &&
      text.includes("not approval, capability, or production readiness") &&
      text.includes("Three-quarter view") &&
      text.includes("240 × 320, padding 16") &&
      text.includes("x 120, y 280") &&
      text.includes("mask-face-alpha") &&
      text.includes("Kids Adventure") &&
      text.includes("Storybook Cutout") &&
      text.includes("neutral") &&
      text.includes("rest") &&
      text.includes("Motion-readiness checklist"),
    { text: text.slice(0, 1400) },
  );
  await scrollPanel(page);
  await shot(page, "wp4-1440x900-character-review-ready");

  // Rig review: turnaround poses, parts, pivots, masks, profiles.
  await page
    .getByRole("button", {
      name: "Review layers & rig for Ollo performance rig in Scene 1 · The Home Nook",
    })
    .click();
  await page
    .getByRole("button", { name: "Review-ready example" })
    .click();
  text = await panelText(page);
  rec(
    "rig review-ready: neutral poses, part inventory, declared pivots, viseme mask, and supported profiles",
    text.includes("Neutral front pose") &&
      text.includes("Neutral side pose") &&
      text.includes("mask-mouth-viseme") &&
      text.includes("alpha mask applying to part head") &&
      text.includes("Bounce performances pivot here") &&
      text.includes("Kids Adventure") &&
      text.includes(REVIEW_READY_TRUTH_FRAGMENT),
    { text: text.slice(0, 1200) },
  );
  await scrollPanel(page);
  await shot(page, "wp4-1440x900-rig-turnaround-parts-pivots-masks-profiles");

  // Expressions/visemes and the motion-readiness checklist.
  await page
    .locator("[data-testid='pv1-review-expressions']")
    .scrollIntoViewIfNeeded();
  const checklistText = await page
    .locator("[data-testid='pv1-review-checklist']")
    .textContent();
  const expressionsText = await page
    .locator("[data-testid='pv1-review-expressions']")
    .textContent();
  rec(
    "expressions/visemes inventory and motion-readiness checklist with pass reasons",
    expressionsText.includes("Expressions") &&
      expressionsText.includes("determined") &&
      expressionsText.includes("Visemes") &&
      expressionsText.includes("oo") &&
      checklistText.includes("Motion-readiness checklist") &&
      checklistText.includes("All required turnaround views declared") &&
      checklistText.includes("Pass"),
    {
      expressions: expressionsText.slice(0, 300),
      checklist: checklistText.slice(0, 400),
    },
  );
  await shot(page, "wp4-1440x900-rig-expressions-visemes-motion-checklist");
  await page
    .getByRole("button", { name: "Close review panel for Ollo performance rig" })
    .click();

  // Layered-set review: explicit plane order and foreground occluders.
  await page
    .getByRole("button", {
      name: "Review set layers for The Home Nook set in Scene 1 · The Home Nook",
    })
    .click();
  await page
    .getByRole("button", { name: "Review-ready example" })
    .click();
  const planeText = await page
    .locator("[data-testid='pv1-review-planes']")
    .textContent();
  const order =
    planeText.indexOf("1. background") >= 0 &&
    planeText.indexOf("2. midground") > planeText.indexOf("1. background") &&
    planeText.indexOf("3. foreground") > planeText.indexOf("2. midground");
  rec(
    "layered-set review: background/midground/foreground planes in explicit order with declared descriptions",
    order &&
      planeText.includes("Den wall, round window") &&
      planeText.includes("Reading cushion") &&
      planeText.includes("Window vines"),
    { planeText: planeText.slice(0, 500) },
  );
  await scrollPanel(page);
  await shot(page, "wp4-1440x900-layered-set-plane-order");

  await page
    .locator("[data-testid='pv1-review-occluders']")
    .evaluate((element) => element.scrollIntoView({ block: "center" }));
  const occluderText = await page
    .locator("[data-testid='pv1-review-occluders']")
    .textContent();
  rec(
    "foreground occluder review: declared occluder and intended subject relationship",
    occluderText.includes("occluder-nook-vines") &&
      occluderText.includes("intended subject relationship") &&
      occluderText.includes("frame Ollo reading on the cushion"),
    { occluderText: occluderText.slice(0, 400) },
  );
  await shot(page, "wp4-1440x900-foreground-occluder-review");

  // Escape recovery: focus returns to the exact surviving invoker.
  const setReviewButton = page.getByRole("button", {
    name: "Review set layers for The Home Nook set in Scene 1 · The Home Nook",
  });
  await page.keyboard.press("Escape");
  const escapeState = await page.evaluate(() => ({
    panelOpen: document.querySelector("[data-testid='pv1-review']") !== null,
    activeLabel: document.activeElement?.getAttribute("aria-label") ?? "",
  }));
  rec(
    "escape recovery: panel closes and focus returns to the exact surviving invoker",
    escapeState.panelOpen === false &&
      escapeState.activeLabel.includes("Review set layers"),
    escapeState,
  );
  rec(
    "counts unchanged after switching examples and closing",
    (await countsText(page)) === countsAtStart,
    { countsAtStart, now: await countsText(page) },
  );
  await setReviewButton.evaluate((element) =>
    element.scrollIntoView({ block: "center" }),
  );
  await shot(page, "wp4-1440x900-escape-focus-restored");

  // Character Needs correction with the readable exact blocker (Scene 3 Dot).
  await page.getByLabel("Scene filter").selectOption("scene-3");
  await page
    .getByRole("button", {
      name: "Review layers & rig for Dot in Scene 3 · Berry Patch",
    })
    .click();
  text = await panelText(page);
  rec(
    "character needs correction: the exact readable contradiction is the blocker",
    text.includes("Needs correction") &&
      text.includes("Contradictions to correct") &&
      text.includes(
        'Checklist "All required turnaround views declared" is marked passing, but the declaration is incomplete: Side view is not declared.',
      ),
    { text: text.slice(0, 900) },
  );
  await scrollPanel(page);
  await assertNoOverflow(page, "character-needs-correction");
  await shot(page, "wp4-1440x900-character-needs-correction-blocker");
  await page
    .getByRole("button", { name: "Close review panel for Dot" })
    .click();

  // Scope change closes the panel fail-closed; nothing stale is retained.
  await page
    .getByRole("button", {
      name: "Review layers & rig for Dot in Scene 3 · Berry Patch",
    })
    .click();
  await page.getByLabel("Scene filter").selectOption("scene-7");
  const rebound = await page.evaluate(() => ({
    panelOpen: document.querySelector("[data-testid='pv1-review']") !== null,
    scope:
      document.querySelector("[data-testid='pv1-requirements'] h2")
        ?.textContent ?? "",
  }));
  rec(
    "scope-change recovery: panel closes and never retains review state from another scope",
    rebound.panelOpen === false && rebound.scope === "Scene 7 · Sunflower Field",
    rebound,
  );

  // Unavailable fail-closed state: an eligible requirement without a declared
  // example shows a disabled control with the exact reason.
  await page.getByLabel("Scene filter").selectOption("scene-2");
  const disabledReview = await page.evaluate(() => {
    const rows = [...document.querySelectorAll(".pv1-requirement-row")];
    const tix = rows.find((row) =>
      row.querySelector("strong")?.textContent?.includes("Tix"),
    );
    const button = tix?.querySelector(".pv1-requirement-no-review button");
    const reason = tix?.querySelector(".pv1-requirement-no-review span");
    return {
      disabled: button?.disabled ?? null,
      label: button?.textContent ?? "",
      reason: reason?.textContent ?? "",
    };
  });
  rec(
    "unavailable fail-closed state: eligible requirement without a declared example is disabled with the exact reason",
    disabledReview.disabled === true &&
      disabledReview.label === "Review layers & rig" &&
      disabledReview.reason.includes(NO_EXAMPLE_FRAGMENT),
    disabledReview,
  );
  await page.evaluate(() => {
    const rows = [...document.querySelectorAll(".pv1-requirement-row")];
    rows
      .find((row) => row.querySelector("strong")?.textContent?.includes("Tix"))
      ?.scrollIntoView({ block: "center" });
  });
  await shot(page, "wp4-1440x900-unavailable-fail-closed-disabled-reason");

  // Truth boundaries: no enabled approval, promotion, production, file,
  // provider, Godot, render, or export claim anywhere in the workspace, and
  // no fake imagery inside a review panel.
  await page.getByLabel("Scene filter").selectOption("scene-1");
  await page
    .getByRole("button", {
      name: "Review layers & rig for Ollo in Scene 1 · The Home Nook",
    })
    .click();
  const truth = await page.evaluate(() => {
    const workspace = document.querySelector("[data-testid='pv1-assets']");
    const text = workspace?.textContent ?? "";
    const enabledForbidden = [...(workspace?.querySelectorAll("button") ?? [])]
      .filter((button) => !button.disabled)
      .map((button) => button.textContent ?? "")
      .filter((label) =>
        /slice|generate mask|calculate pivot|build rig|preview motion|approve|promote|production ready|open in godot|render|export/i.test(
          label,
        ),
      );
    const panel = document.querySelector("[data-testid='pv1-review']");
    const futureButtons = [
      ...(panel?.querySelectorAll(
        "[data-testid='pv1-review-future'] button",
      ) ?? []),
    ];
    return {
      enabledForbidden,
      futureAllDisabled: futureButtons.every((button) => button.disabled),
      panelMedia: panel?.querySelectorAll("img, canvas, svg, video").length ?? -1,
      fileInputs: workspace?.querySelectorAll("input[type='file']").length ?? -1,
      passwordFields:
        workspace?.querySelectorAll("input[type='password']").length ?? -1,
      apiKey: /api\s*key|access\s*token|password/i.test(text),
      approved: /has been approved|is approved/i.test(text),
      productionReady: /production[- ]ready(?!\w)/i.test(
        text.replace(/not approval, capability, or production readiness/g, ""),
      ),
      generated: text.includes("Image generated"),
      rendered: /has been rendered|render complete/i.test(text),
      exported: /has been exported|export complete/i.test(text),
    };
  });
  rec(
    "truth boundaries: zero enabled approval/promotion/production/file/provider/Godot/render/export claims; later-workflow controls disabled; no fake imagery",
    truth.enabledForbidden.length === 0 &&
      truth.futureAllDisabled === true &&
      truth.panelMedia === 0 &&
      truth.fileInputs === 0 &&
      truth.passwordFields === 0 &&
      !truth.apiKey &&
      !truth.approved &&
      !truth.productionReady &&
      !truth.generated &&
      !truth.rendered &&
      !truth.exported,
    truth,
  );
  rec(
    "counts unchanged at the end of the review journey",
    (await countsText(page)) === countsAtStart,
    { countsAtStart, now: await countsText(page) },
  );
  await scrollPanel(page);
  await assertNoOverflow(page, "final state");

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
