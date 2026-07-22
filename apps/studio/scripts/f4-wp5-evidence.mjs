/* global console, document, Event, getComputedStyle, HTMLSelectElement, matchMedia, process */
/* F4-WP5 reproducible browser evidence. Exercises the real Product v1
 * Projects -> Paste a script -> shared review -> Studio -> Assets & Rigs
 * route at 1920x1080, 1440x900, and 1024x800 against the dev server, with
 * console/pageerror listeners attached before any navigation. Captures the
 * complete workspace overview, request/import source-and-rights state, the
 * Review-ready layer/rig state with adjacent non-production truth,
 * multi-scene readiness/aggregate truth, the wrong-format failure, the
 * Needs correction blocker, layered-set plane order and foreground occluder
 * review, the intentional 1024 stacked order, visible keyboard focus,
 * focused request validation, reachable review-table Close, Escape return
 * focus, and the reduced-motion computed contract. Every screenshot is
 * SHA-256 hashed, dimension-checked, and required to be unique; the
 * machine-readable report records per-state checks, region bounds, focus
 * identity, panel truth, computed reduced-motion styles, and the forbidden
 * enabled-claim scan. */
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
  "2026-07-22-kimi-f4-wp5-responsive-accessibility-evidence",
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
const OLLO_REVIEW_LABEL =
  "Review layers & rig for Ollo in Scene 1 · The Home Nook";
const DOT_REQUEST_LABEL =
  "Request image pack for Dot in Scene 3 · Berry Patch";
const DOT_REVIEW_LABEL = "Review layers & rig for Dot in Scene 3 · Berry Patch";
const SET_REVIEW_LABEL =
  "Review set layers for The Home Nook set in Scene 1 · The Home Nook";

const ASSETS_REGIONS = [
  "[data-testid='pv1-assets']",
  ".pv1-assets-header",
  ".pv1-asset-categories",
  ".pv1-asset-filters",
  "[data-testid='pv1-requirements']",
  ".pv1-asset-list",
  ".pv1-asset-detail",
];

const sha256File = (file) =>
  crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const pngSize = (file) => {
  const buffer = fs.readFileSync(file);
  if (buffer.toString("ascii", 12, 16) !== "IHDR")
    throw new Error(`not a PNG: ${file}`);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
};
const toMs = (value) =>
  typeof value === "string" && value.endsWith("ms")
    ? Number.parseFloat(value)
    : typeof value === "string" && value.endsWith("s")
      ? Number.parseFloat(value) * 1000
      : Number.NaN;

const report = {
  task: "F4-WP5-RESPONSIVE-ACCESSIBILITY-EVIDENCE",
  base: BASE,
  capturedAt: new Date().toISOString(),
  viewports: [],
};

async function newJourneyPage(browser, viewport) {
  const context = await browser.newContext({ viewport });
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
  return { context, page, consoleIssues, pageErrors };
}

function viewportRecord(width, height) {
  return {
    viewport: `${width}x${height}`,
    url: BASE,
    checks: [],
    consoleIssues: [],
    pageErrors: [],
    screenshots: [],
    reducedMotion: null,
  };
}

async function measureRegions(page, selectors) {
  return page.evaluate((sels) => {
    const doc = document.documentElement;
    const out = {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      regions: {},
      overflowElements: [],
    };
    for (const sel of sels) {
      const element = document.querySelector(sel);
      if (!element) {
        out.regions[sel] = null;
        continue;
      }
      const rect = element.getBoundingClientRect();
      out.regions[sel] = {
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    }
    document.querySelectorAll("body *").forEach((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && (rect.right > doc.clientWidth + 1 || rect.left < -1))
        out.overflowElements.push({
          tag: element.tagName.toLowerCase(),
          cls:
            typeof element.className === "string"
              ? element.className.slice(0, 80)
              : "",
          left: Math.round(rect.left),
          right: Math.round(rect.right),
        });
    });
    out.overflowElements = out.overflowElements.slice(0, 10);
    return out;
  }, selectors);
}

async function enterAssetsWorkspace(page) {
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
}

const countsText = (page) =>
  page.locator(".pv1-requirement-counts").textContent();
const requestText = (page) =>
  page.locator("[data-testid='pv1-request']").textContent();
const reviewText = (page) =>
  page.locator("[data-testid='pv1-review']").textContent();

async function truthScan(page) {
  return page.evaluate(() => {
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
    return {
      enabledForbidden,
      fileInputs: workspace?.querySelectorAll("input[type='file']").length ?? -1,
      passwordFields:
        workspace?.querySelectorAll("input[type='password']").length ?? -1,
      apiKey: /api\s*key|access\s*token|password/i.test(text),
      approved: /has been approved|is approved/i.test(text),
      productionReady: /production[- ]ready(?!\w)/i.test(
        text.replace(/not approval, capability, or production readiness/g, ""),
      ),
      generated: text.includes("Image generated"),
      imported: text.includes("File imported"),
      uploaded: text.includes("Uploaded"),
      rendered: /has been rendered|render complete/i.test(text),
      exported: /has been exported|export complete/i.test(text),
    };
  });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await pw.chromium.launch({ headless: true });
  const allHashes = [];
  const allDims = [];

  async function shot(vp, page, width, height, name) {
    const file = path.join(OUT, `${name}.png`);
    await page.screenshot({ path: file, fullPage: false });
    const sha = sha256File(file);
    const dims = pngSize(file);
    allHashes.push({ name, sha });
    allDims.push({ name, ...dims });
    vp.screenshots.push({ file: `screenshots/${name}.png`, sha256: sha, ...dims });
    vp.checks.push({
      name: `${name}: exact ${width}x${height} screenshot dimensions`,
      pass: dims.width === width && dims.height === height,
      details: dims,
    });
  }

  /* ================= 1920x1080 ================= */
  {
    const width = 1920;
    const height = 1080;
    const vp = viewportRecord(width, height);
    const { context, page, consoleIssues, pageErrors } = await newJourneyPage(
      browser,
      { width, height },
    );
    const rec = (name, pass, details) =>
      vp.checks.push({ name, pass, details });

    await enterAssetsWorkspace(page);
    await page.getByLabel("Scene filter").selectOption("scene-1");
    const countsAtStart = await countsText(page);

    let m = await measureRegions(page, ASSETS_REGIONS);
    rec(
      "workspace overview: no horizontal document overflow; categories, filters, requirements, list, and detail all present",
      m.scrollWidth <= m.clientWidth &&
        m.overflowElements.length === 0 &&
        ASSETS_REGIONS.every((sel) => m.regions[sel] !== null),
      m,
    );
    await shot(vp, page, width, height, "wp5-1920x1080-workspace-overview");

    // Request/import source-and-rights state (Scene 3 Dot).
    await page.getByLabel("Scene filter").selectOption("scene-3");
    await page.getByRole("button", { name: DOT_REQUEST_LABEL }).click();
    await page.waitForSelector("[data-testid='pv1-request']");
    const requestHeadingFocus = await page.evaluate(() => {
      const heading = document.querySelector("[data-testid='pv1-request'] h3");
      return {
        focused: document.activeElement === heading,
        text: heading?.textContent ?? "",
      };
    });
    rec(
      "request open: focus moves into the labelled request heading",
      requestHeadingFocus.focused && requestHeadingFocus.text.length > 0,
      requestHeadingFocus,
    );
    await page
      .getByRole("button", { name: "Choose a declared demo candidate" })
      .click();
    await page.getByRole("button", { name: /Dot view sheet/ }).click();
    let text = await requestText(page);
    rec(
      "request source-and-rights state: required source/license fields, declared-metadata honesty, and no import claim",
      text.includes("Source (required)") &&
        text.includes("License / rights (required)") &&
        text.includes("Reviewing candidate metadata") &&
        text.includes("declared demo metadata, not media sniffing"),
      { text: text.slice(-1000) },
    );
    await page
      .locator("[data-testid='pv1-request']")
      .scrollIntoViewIfNeeded();
    m = await measureRegions(page, ASSETS_REGIONS);
    rec(
      "request source-and-rights: no horizontal document overflow",
      m.scrollWidth <= m.clientWidth && m.overflowElements.length === 0,
      m,
    );
    await shot(vp, page, width, height, "wp5-1920x1080-request-source-rights");
    await page
      .getByRole("button", { name: "Close request panel for Dot" })
      .click();

    // Review-ready layer/rig state with the adjacent non-production truth.
    await page.getByLabel("Scene filter").selectOption("scene-1");
    await page.getByRole("button", { name: OLLO_REVIEW_LABEL }).click();
    await page.waitForSelector("[data-testid='pv1-review']");
    await page.getByRole("button", { name: "Review-ready example" }).click();
    text = await reviewText(page);
    rec(
      "review-ready layer/rig state: turnaround, parts/pivots, masks, profiles, checklist, and the adjacent non-production truth",
      text.includes("Review-ready") &&
        text.includes(REVIEW_READY_TRUTH_FRAGMENT) &&
        text.includes("not approval, capability, or production readiness") &&
        text.includes("Three-quarter view") &&
        text.includes("Motion-readiness checklist"),
      { text: text.slice(0, 1400) },
    );
    rec(
      "counts unchanged through transient review panel",
      (await countsText(page)) === countsAtStart,
      { countsAtStart, now: await countsText(page) },
    );
    await page.locator("[data-testid='pv1-review']").scrollIntoViewIfNeeded();
    m = await measureRegions(page, ASSETS_REGIONS);
    rec(
      "review-ready: no horizontal document overflow",
      m.scrollWidth <= m.clientWidth && m.overflowElements.length === 0,
      m,
    );
    await shot(
      vp,
      page,
      width,
      height,
      "wp5-1920x1080-review-ready-nonproduction-truth",
    );

    const truth = await truthScan(page);
    rec(
      "truth boundaries: zero enabled approval/promotion/production/file/provider/Godot/render/export claims",
      truth.enabledForbidden.length === 0 &&
        truth.fileInputs === 0 &&
        truth.passwordFields === 0 &&
        !truth.apiKey &&
        !truth.approved &&
        !truth.productionReady &&
        !truth.generated &&
        !truth.imported &&
        !truth.uploaded &&
        !truth.rendered &&
        !truth.exported,
      truth,
    );

    vp.consoleIssues = consoleIssues;
    vp.pageErrors = pageErrors;
    report.viewports.push(vp);
    await context.close();
  }

  /* ================= 1440x900 ================= */
  {
    const width = 1440;
    const height = 900;
    const vp = viewportRecord(width, height);
    const { context, page, consoleIssues, pageErrors } = await newJourneyPage(
      browser,
      { width, height },
    );
    const rec = (name, pass, details) =>
      vp.checks.push({ name, pass, details });

    await enterAssetsWorkspace(page);

    // Multi-scene readiness/aggregate truth (episode scope).
    await page.getByLabel("Scene filter").selectOption("all");
    const requirementsText = await page
      .locator("[data-testid='pv1-requirements']")
      .textContent();
    const countsAtStart = await countsText(page);
    rec(
      "multi-scene readiness: episode aggregate summary names its scope and keeps per-scene truth visible",
      requirementsText.includes("Episode requirements summary") &&
        requirementsText.includes("Episode-scope summary across every scene") &&
        requirementsText.includes("Scene 1 · The Home Nook") &&
        requirementsText.includes("Scene 3 · Berry Patch") &&
        requirementsText.includes("Required") &&
        requirementsText.includes("Missing"),
      { text: requirementsText.slice(0, 900), countsAtStart },
    );
    let m = await measureRegions(page, ASSETS_REGIONS);
    rec(
      "multi-scene readiness: no horizontal document overflow",
      m.scrollWidth <= m.clientWidth && m.overflowElements.length === 0,
      m,
    );
    await shot(
      vp,
      page,
      width,
      height,
      "wp5-1440x900-multi-scene-readiness-aggregate",
    );

    // Wrong-format failure: declared metadata, not media sniffing.
    await page.getByLabel("Scene filter").selectOption("scene-3");
    const countsScene3 = await countsText(page);
    await page.getByRole("button", { name: DOT_REQUEST_LABEL }).click();
    await page.waitForSelector("[data-testid='pv1-request']");
    await page
      .getByRole("button", { name: "Choose a declared demo candidate" })
      .click();
    await page.getByRole("button", { name: /Dot notes export/ }).click();
    await page.getByLabel("Source (required)").fill("My notes app");
    await page.getByLabel("License / rights (required)").fill("Mine");
    await page.getByRole("button", { name: "Continue to confirmation" }).click();
    let text = await requestText(page);
    rec(
      "wrong-format failure: declared demo metadata reason, not media sniffing, no candidate created, scene counts unchanged",
      text.includes('"txt"') &&
        text.includes("not media sniffing") &&
        text.includes("No candidate was created") &&
        (await countsText(page)) === countsScene3,
      { countsScene3, now: await countsText(page), text: text.slice(-700) },
    );
    await page
      .locator("[data-testid='pv1-request']")
      .scrollIntoViewIfNeeded();
    m = await measureRegions(page, ASSETS_REGIONS);
    rec(
      "wrong-format failure: no horizontal document overflow",
      m.scrollWidth <= m.clientWidth && m.overflowElements.length === 0,
      m,
    );
    await shot(vp, page, width, height, "wp5-1440x900-wrong-format-failure");
    await page
      .getByRole("button", { name: "Close request panel for Dot" })
      .click();

    // Needs correction: the exact readable contradiction is the blocker.
    await page.getByRole("button", { name: DOT_REVIEW_LABEL }).click();
    await page.waitForSelector("[data-testid='pv1-review']");
    text = await reviewText(page);
    rec(
      "needs correction: the exact readable contradiction is the blocker",
      text.includes("Needs correction") &&
        text.includes("Contradictions to correct") &&
        text.includes(
          'Checklist "All required turnaround views declared" is marked passing, but the declaration is incomplete: Side view is not declared.',
        ),
      { text: text.slice(0, 900) },
    );
    await page.locator("[data-testid='pv1-review']").scrollIntoViewIfNeeded();
    await shot(vp, page, width, height, "wp5-1440x900-needs-correction-blocker");
    await page
      .getByRole("button", { name: "Close review panel for Dot" })
      .click();

    // Layered-set plane order and foreground occluder review.
    await page.getByLabel("Scene filter").selectOption("scene-1");
    await page.getByRole("button", { name: SET_REVIEW_LABEL }).click();
    await page.waitForSelector("[data-testid='pv1-review']");
    await page.getByRole("button", { name: "Review-ready example" }).click();
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
    await page.locator("[data-testid='pv1-review']").scrollIntoViewIfNeeded();
    await shot(vp, page, width, height, "wp5-1440x900-layered-set-plane-order");
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
    await shot(
      vp,
      page,
      width,
      height,
      "wp5-1440x900-foreground-occluder-review",
    );

    // Scope-removal backstop: with focus inside the open panel, a scope
    // change removes the invoker and focus must land on the stable
    // surviving Scene filter, never on body or removed content.
    await page.evaluate(() => {
      document.querySelector(".pv1-review-close").focus();
      const select = document.querySelector("select[aria-label='Scene filter']");
      const setter = Object.getOwnPropertyDescriptor(
        HTMLSelectElement.prototype,
        "value",
      ).set;
      setter.call(select, "scene-3");
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await page.waitForFunction(
      () => document.querySelector("[data-testid='pv1-review']") === null,
    );
    const stranded = await page.evaluate(() => ({
      panelOpen: document.querySelector("[data-testid='pv1-review']") !== null,
      activeLabel: document.activeElement?.getAttribute("aria-label") ?? "",
      activeTag: document.activeElement?.tagName.toLowerCase() ?? "",
    }));
    rec(
      "scope-removal backstop: panel closes and focus moves to the stable surviving Scene filter, never body or removed content",
      stranded.panelOpen === false &&
        stranded.activeLabel === "Scene filter" &&
        stranded.activeTag === "select",
      stranded,
    );

    await page.getByLabel("Scene filter").selectOption("all");
    rec(
      "episode counts unchanged at the end of the 1440x900 journey",
      (await countsText(page)) === countsAtStart,
      { countsAtStart, now: await countsText(page) },
    );
    const truth = await truthScan(page);
    rec(
      "truth boundaries: zero enabled forbidden claims at 1440x900",
      truth.enabledForbidden.length === 0 &&
        truth.fileInputs === 0 &&
        truth.passwordFields === 0 &&
        !truth.apiKey &&
        !truth.approved &&
        !truth.productionReady &&
        !truth.generated &&
        !truth.imported &&
        !truth.uploaded &&
        !truth.rendered &&
        !truth.exported,
      truth,
    );

    vp.consoleIssues = consoleIssues;
    vp.pageErrors = pageErrors;
    report.viewports.push(vp);
    await context.close();
  }

  /* ================= 1024x800 ================= */
  {
    const width = 1024;
    const height = 800;
    const vp = viewportRecord(width, height);
    const { context, page, consoleIssues, pageErrors } = await newJourneyPage(
      browser,
      { width, height },
    );
    const rec = (name, pass, details) =>
      vp.checks.push({ name, pass, details });

    await enterAssetsWorkspace(page);
    await page.getByLabel("Scene filter").selectOption("scene-1");
    const countsAtStart = await countsText(page);

    // Intentional stacked order: header -> categories -> filters ->
    // requirements -> asset list -> selected detail.
    let m = await measureRegions(page, ASSETS_REGIONS);
    const tops = [
      ".pv1-assets-header",
      ".pv1-asset-categories",
      ".pv1-asset-filters",
      "[data-testid='pv1-requirements']",
      ".pv1-asset-list",
      ".pv1-asset-detail",
    ].map((sel) => m.regions[sel]?.top ?? Number.NaN);
    rec(
      "stacked overview: intentional order header, categories, filters, requirements, asset list, selected detail",
      m.scrollWidth <= m.clientWidth &&
        m.overflowElements.length === 0 &&
        tops.every((top) => Number.isFinite(top)) &&
        tops.every((top, index) => index === 0 || tops[index - 1] <= top),
      { tops, scrollWidth: m.scrollWidth, clientWidth: m.clientWidth },
    );
    await shot(vp, page, width, height, "wp5-1024x800-stacked-overview");

    // Visible keyboard focus on category navigation.
    const charactersTab = page
      .getByRole("navigation", { name: "Asset categories" })
      .getByRole("button", { name: "Characters" });
    for (let index = 0; index < 40; index += 1) {
      await page.keyboard.press("Tab");
      if (
        await charactersTab.evaluate(
          (element) => document.activeElement === element,
        )
      )
        break;
    }
    const categoryFocus = await charactersTab.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        active: document.activeElement === element,
        outlineWidth: style.outlineWidth,
        outlineStyle: style.outlineStyle,
        text: element.textContent ?? "",
      };
    });
    rec(
      "keyboard focus: category navigation is reachable with a visible >=2px focus indicator",
      categoryFocus.active &&
        Number.parseFloat(categoryFocus.outlineWidth) >= 2 &&
        categoryFocus.outlineStyle === "solid",
      categoryFocus,
    );
    await shot(vp, page, width, height, "wp5-1024x800-keyboard-focus-category");

    // Focused request validation at compact width.
    await page.getByLabel("Scene filter").selectOption("scene-3");
    await page.getByRole("button", { name: DOT_REQUEST_LABEL }).click();
    await page.waitForSelector("[data-testid='pv1-request']");
    await page
      .getByRole("button", { name: "Choose a declared demo candidate" })
      .click();
    await page.getByRole("button", { name: /Dot view sheet/ }).click();
    await page.getByRole("button", { name: "Continue to confirmation" }).click();
    const validation = await page.evaluate(() => {
      const input = document.getElementById("pv1-source-req-s3-dot");
      return {
        alert: document.querySelector(".pv1-request-alert")?.textContent ?? "",
        focused: document.activeElement === input,
        invalid: input?.getAttribute("aria-invalid"),
      };
    });
    rec(
      "request validation: readable alert, aria-invalid, and focus moves to the source field",
      validation.alert.includes("Source is required") &&
        validation.alert.includes("No candidate was created") &&
        validation.focused &&
        validation.invalid === "true",
      validation,
    );
    await page
      .locator("[data-testid='pv1-request']")
      .scrollIntoViewIfNeeded();
    m = await measureRegions(page, ASSETS_REGIONS);
    rec(
      "request validation: no horizontal document overflow",
      m.scrollWidth <= m.clientWidth && m.overflowElements.length === 0,
      m,
    );
    await shot(vp, page, width, height, "wp5-1024x800-request-validation-focus");
    await page
      .getByRole("button", { name: "Close request panel for Dot" })
      .click();

    // Reachable review-table Close: the wide declared part table is contained
    // in a labelled keyboard-reachable scroller and never widens the document.
    await page.getByLabel("Scene filter").selectOption("scene-1");
    await page.getByRole("button", { name: OLLO_REVIEW_LABEL }).click();
    await page.waitForSelector("[data-testid='pv1-review']");
    await page.getByRole("button", { name: "Review-ready example" }).click();
    const scroller = await page.evaluate(() => {
      const region = document.querySelector(".pv1-review-table-scroll");
      const table = region?.querySelector("table");
      return {
        exists: region !== null,
        role: region?.getAttribute("role") ?? null,
        tabIndex: region?.getAttribute("tabindex") ?? null,
        regionLabel: region?.getAttribute("aria-label") ?? null,
        tableLabel: table?.getAttribute("aria-label") ?? null,
        documentScrollWidth: document.documentElement.scrollWidth,
        documentClientWidth: document.documentElement.clientWidth,
      };
    });
    rec(
      "review table: labelled keyboard-reachable contained scroller; the document never widens",
      scroller.exists &&
        scroller.role === "region" &&
        scroller.tabIndex === "0" &&
        scroller.regionLabel !== null &&
        scroller.tableLabel !== null &&
        scroller.documentScrollWidth <= scroller.documentClientWidth,
      scroller,
    );
    const closeButton = page.getByRole("button", {
      name: "Close review panel for Ollo",
    });
    /* The Close control sits in the panel header, before the example
     * switcher in DOM order, so Shift+Tab walks backwards to it — the same
     * reverse path a keyboard user takes. */
    let closeFocused = false;
    for (let index = 0; index < 80; index += 1) {
      await page.keyboard.press("Shift+Tab");
      if (
        await closeButton.evaluate(
          (element) => document.activeElement === element,
        )
      ) {
        closeFocused = true;
        break;
      }
    }
    const closeState = await closeButton.evaluate((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        outlineWidth: style.outlineWidth,
        outlineStyle: style.outlineStyle,
        left: Math.round(rect.left),
        right: Math.round(rect.right),
      };
    });
    rec(
      "review table Close: keyboard-reachable with visible focus and inside the document width",
      closeFocused &&
        Number.parseFloat(closeState.outlineWidth) >= 2 &&
        closeState.outlineStyle === "solid" &&
        closeState.left >= 0 &&
        closeState.right <= 1024,
      { closeFocused, closeState },
    );
    await shot(
      vp,
      page,
      width,
      height,
      "wp5-1024x800-review-table-close-reachable",
    );
    rec(
      "counts unchanged through compact transient panels",
      (await countsText(page)) === countsAtStart,
      { countsAtStart, now: await countsText(page) },
    );

    // Escape return-focus state: focus lands on the exact surviving invoker.
    await page.keyboard.press("Escape");
    const escapeState = await page.evaluate(() => ({
      panelOpen: document.querySelector("[data-testid='pv1-review']") !== null,
      activeLabel: document.activeElement?.getAttribute("aria-label") ?? "",
    }));
    rec(
      "escape recovery: panel closes and focus returns to the exact surviving invoker",
      escapeState.panelOpen === false &&
        escapeState.activeLabel === OLLO_REVIEW_LABEL,
      escapeState,
    );
    await shot(vp, page, width, height, "wp5-1024x800-escape-return-focus");

    // Reduced-motion state: the query matches, computed motion is effectively
    // removed, scrolling is immediate, and focus restoration stays instant.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.getByRole("button", { name: OLLO_REVIEW_LABEL }).click();
    await page.waitForSelector("[data-testid='pv1-review']");
    const rm = await page.evaluate(() => {
      const category = document.querySelector(".pv1-asset-categories button");
      const categoryStyle = getComputedStyle(category);
      const workspace = document.querySelector("[data-testid='pv1-assets']");
      const workspaceStyle = getComputedStyle(workspace);
      const heading = document.querySelector("[data-testid='pv1-review'] h3");
      return {
        matches: matchMedia("(prefers-reduced-motion: reduce)").matches,
        categoryTransitionDuration: categoryStyle.transitionDuration,
        categoryAnimationDuration: categoryStyle.animationDuration,
        categoryAnimationIterationCount:
          categoryStyle.animationIterationCount,
        categoryAnimationName: categoryStyle.animationName,
        workspaceScrollBehavior: workspaceStyle.scrollBehavior,
        headingFocusedImmediately: document.activeElement === heading,
      };
    });
    vp.reducedMotion = rm;
    rec(
      "reduced motion: query matches, computed durations clamp to 0.01ms, scroll is auto, and focus still enters the panel heading immediately",
      rm.matches === true &&
        toMs(rm.categoryTransitionDuration) <= 0.01 &&
        toMs(rm.categoryAnimationDuration) <= 0.01 &&
        rm.categoryAnimationIterationCount === "1" &&
        rm.categoryAnimationName === "none" &&
        rm.workspaceScrollBehavior === "auto" &&
        rm.headingFocusedImmediately === true,
      rm,
    );
    await page.locator("[data-testid='pv1-review']").scrollIntoViewIfNeeded();
    await shot(vp, page, width, height, "wp5-1024x800-reduced-motion");
    await page.keyboard.press("Escape");
    const rmEscape = await page.evaluate(() => ({
      panelOpen: document.querySelector("[data-testid='pv1-review']") !== null,
      activeLabel: document.activeElement?.getAttribute("aria-label") ?? "",
    }));
    rec(
      "reduced motion: Escape still restores focus to the exact surviving invoker immediately",
      rmEscape.panelOpen === false &&
        rmEscape.activeLabel === OLLO_REVIEW_LABEL,
      rmEscape,
    );
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const truth = await truthScan(page);
    rec(
      "truth boundaries: zero enabled forbidden claims at 1024x800",
      truth.enabledForbidden.length === 0 &&
        truth.fileInputs === 0 &&
        truth.passwordFields === 0 &&
        !truth.apiKey &&
        !truth.approved &&
        !truth.productionReady &&
        !truth.generated &&
        !truth.imported &&
        !truth.uploaded &&
        !truth.rendered &&
        !truth.exported,
      truth,
    );

    vp.consoleIssues = consoleIssues;
    vp.pageErrors = pageErrors;
    report.viewports.push(vp);
    await context.close();
  }

  await browser.close();

  // Cross-viewport evidence integrity: every screenshot hash is unique.
  const hashSet = new Set(allHashes.map((entry) => entry.sha));
  report.viewports.push({
    viewport: "all",
    url: BASE,
    checks: [
      {
        name: "evidence integrity: every captured screenshot has a unique SHA-256",
        pass: hashSet.size === allHashes.length,
        details: { screenshots: allHashes.length, unique: hashSet.size },
      },
    ],
    consoleIssues: [],
    pageErrors: [],
    screenshots: [],
    reducedMotion: null,
  });

  const reportFile = path.join(OUT, "clickthrough-report.json");
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  const failed = [];
  for (const vp of report.viewports) {
    for (const check of vp.checks)
      if (!check.pass) failed.push(`${vp.viewport}: ${check.name}`);
    if (vp.consoleIssues.length > 0)
      failed.push(
        `${vp.viewport}: console issues ${JSON.stringify(vp.consoleIssues)}`,
      );
    if (vp.pageErrors.length > 0)
      failed.push(
        `${vp.viewport}: page errors ${JSON.stringify(vp.pageErrors)}`,
      );
  }
  console.log(`report: ${reportFile}`);
  console.log(`report sha256: ${sha256File(reportFile)}`);
  if (failed.length > 0) {
    console.log(`FAILED CHECKS (${failed.length}):`);
    failed.forEach((failure) => console.log(` - ${failure}`));
    process.exit(1);
  }
  console.log(
    `ALL ${report.viewports.reduce((total, vp) => total + vp.checks.length, 0)} CHECKS PASSED, zero console warnings/errors, zero page errors`,
  );
})().catch((error) => {
  console.error("EVIDENCE FAILED", error);
  process.exit(1);
});
