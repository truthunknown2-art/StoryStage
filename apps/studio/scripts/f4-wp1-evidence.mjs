/* global console, document, getComputedStyle, process, window */
/* F4-WP1 reproducible browser evidence capture.
 * Exercises the real Product v1 Projects → Create → Studio → Assets & Rigs
 * path at 1440x900 against the dev server on 127.0.0.1:5195, with
 * console/pageerror listeners attached before any navigation. Captures the
 * workspace overview plus distinct category/detail/filter states — one
 * scene-filter change and one honest empty scope — and hashes every
 * screenshot and the machine-readable report with SHA-256. */
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
if (playwrightStores.length !== 1) {
  throw new Error(
    `Expected exactly one installed playwright-core, found ${playwrightStores.length}`,
  );
}
const pw = loadPackage(
  path.join(pnpmStore, playwrightStores[0], "node_modules", "playwright-core"),
);

const BASE = "http://127.0.0.1:5195/";
const OUT = path.join(
  REPO_ROOT,
  "reports",
  "agent-handoffs",
  "2026-07-22-kimi-f4-wp1-asset-workspace-information-architecture",
  "screenshots",
);
const SAMPLE_SCRIPT = [
  "Lila lives in a quiet village at the edge of a deep, whispering forest.",
  "One evening, she finds a small lantern glowing under the roots of an old tree.",
  "The light flickers, and a soft rustle in the bushes makes her pause.",
  "Summoning her courage, Lila picks up the lantern and follows the glow.",
  "It leads her across a stream and into a hidden glade filled with fireflies.",
].join("\n\n");

const sha256File = (file) =>
  crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

const report = {
  task: "F4-WP1-ASSET-WORKSPACE-INFORMATION-ARCHITECTURE",
  base: BASE,
  capturedAt: new Date().toISOString(),
  viewport: "1440x900",
  checks: [],
  consoleIssues: [],
  pageErrors: [],
  screenshots: [],
};

const WORKSPACE_REGIONS = [
  "[data-testid='pv1-assets']",
  ".pv1-workspace-switch",
  ".pv1-asset-categories",
  ".pv1-asset-filters",
  ".pv1-asset-list",
  ".pv1-asset-detail",
];

const rec = (name, pass, details) =>
  report.checks.push({ name, pass, details });

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
      const el = document.querySelector(sel);
      if (!el) {
        out.regions[sel] = null;
        continue;
      }
      const r = el.getBoundingClientRect();
      out.regions[sel] = {
        left: Math.round(r.left),
        right: Math.round(r.right),
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        width: Math.round(r.width),
        height: Math.round(r.height),
      };
    }
    document.querySelectorAll("body *").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && (r.right > doc.clientWidth + 1 || r.left < -1)) {
        out.overflowElements.push({
          tag: el.tagName.toLowerCase(),
          cls: (typeof el.className === "string" ? el.className : "").slice(
            0,
            80,
          ),
          left: Math.round(r.left),
          right: Math.round(r.right),
        });
      }
    });
    out.overflowElements = out.overflowElements.slice(0, 10);
    return out;
  }, selectors);
}

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return { file: `screenshots/${name}.png`, sha256: sha256File(file) };
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
  page.on("console", (msg) => {
    if (msg.type() === "warning" || msg.type() === "error")
      consoleIssues.push(`${msg.type()}: ${msg.text()}`);
  });
  page.on("pageerror", (err) => pageErrors.push(`pageerror: ${err.message}`));

  /* Real Product v1 journey: Projects → Create → shared proposal review →
   * Studio → Assets & Rigs. */
  await page.goto(BASE, { waitUntil: "networkidle" });
  let m = await measureRegions(page, ["[data-testid='pv1-projects']"]);
  rec(
    "projects: no horizontal overflow",
    m.scrollWidth <= m.clientWidth && m.overflowElements.length === 0,
    m,
  );
  report.screenshots.push(await shot(page, "wp1-1440x900-projects"));

  await page.getByRole("button", { name: "New project" }).first().click();
  await page
    .getByRole("heading", { name: /Start a new Kids Story/ })
    .waitFor();
  await page.getByRole("button", { name: /Paste a script/ }).click();
  await page.getByRole("textbox", { name: "Script" }).fill(SAMPLE_SCRIPT);
  await page.getByRole("button", { name: "Create proposal" }).click();
  await page.getByRole("article", { name: "Review proposal" }).waitFor();
  report.screenshots.push(await shot(page, "wp1-1440x900-proposal-review"));

  await page.getByRole("button", { name: /Enter Studio/ }).click();
  await page.waitForSelector("[data-testid='pv1-studio']");
  await page.evaluate(() => window.scrollTo(0, 0));
  rec(
    "studio: accepted scope header shows Scene 1 · Beat 1 on arrival",
    await page.evaluate(() => {
      const scope = document.querySelector(".pv1-scope-header");
      return (
        scope !== null &&
        scope.textContent.includes("Scene 1 · The Home Nook") &&
        scope.textContent.includes(
          "Beat 1 · Morning light through the round window",
        )
      );
    }),
    {},
  );
  report.screenshots.push(await shot(page, "wp1-1440x900-studio-board"));

  /* Workspace overview: Characters, All episodes, All scenes, Ollo
   * selected. */
  await page.getByRole("button", { name: "Assets & Rigs" }).click();
  await page.waitForSelector("[data-testid='pv1-assets']");
  m = await measureRegions(page, WORKSPACE_REGIONS);
  rec(
    "assets overview: no horizontal overflow",
    m.scrollWidth <= m.clientWidth && m.overflowElements.length === 0,
    m,
  );
  rec(
    "assets overview: workspace switch exposes selected state",
    (await page
      .getByRole("button", { name: "Assets & Rigs" })
      .getAttribute("aria-current")) === "true" &&
      (await page
        .getByRole("button", { name: "Scene board" })
        .getAttribute("aria-current")) === null,
    {},
  );
  rec(
    "assets overview: Characters category current, Ollo selected in list and detail",
    (await page
      .getByRole("button", { name: "Characters" })
      .getAttribute("aria-current")) === "true" &&
      (await page.locator(".pv1-asset-item.is-selected").textContent())
        .includes("Ollo") &&
      (await page.locator(".pv1-asset-detail h2").textContent()) === "Ollo",
    {},
  );
  rec(
    "assets overview: fixture label and readiness disclaimer are visible",
    await page.evaluate(() => {
      const root = document.querySelector("[data-testid='pv1-assets']");
      return (
        root !== null &&
        root.textContent.includes("Local demo record — no artifact exists") &&
        root.textContent.includes(
          "Readiness words describe these local demo records only",
        )
      );
    }),
    {},
  );
  report.screenshots.push(await shot(page, "wp1-1440x900-assets-overview"));

  /* Category/detail state: Layered Sets → Lantern Bridge set, with its
   * visibly unavailable preparation action. */
  await page.getByRole("button", { name: "Layered Sets" }).click();
  await page.getByRole("button", { name: /Lantern Bridge set/ }).click();
  m = await measureRegions(page, WORKSPACE_REGIONS);
  rec(
    "layered set detail: no horizontal overflow",
    m.scrollWidth <= m.clientWidth && m.overflowElements.length === 0,
    m,
  );
  const prepState = await page.evaluate(() => {
    const detail = document.querySelector(".pv1-asset-detail");
    const action = detail?.querySelector(".pv1-asset-preparation button");
    return {
      heading: detail?.querySelector("h2")?.textContent ?? null,
      selected:
        document.querySelector(".pv1-asset-item.is-selected strong")
          ?.textContent ?? null,
      actionDisabled: action?.disabled ?? null,
      reason: detail?.textContent ?? "",
    };
  });
  rec(
    "layered set detail: list and detail stay synchronized on one identity",
    prepState.heading === "Lantern Bridge set" &&
      prepState.selected === "Lantern Bridge set",
    prepState,
  );
  rec(
    "layered set detail: preparation action disabled with its honest reason",
    prepState.actionDisabled === true &&
      prepState.reason.includes(
        "Unavailable — there is no artwork to slice and no slicing capability in this demo",
      ),
    {},
  );
  report.screenshots.push(
    await shot(page, "wp1-1440x900-assets-layered-set-detail"),
  );

  /* Scene-filter change: Characters + Scene 3 with Tix selected. */
  await page.getByRole("button", { name: "Characters" }).click();
  await page.getByRole("button", { name: /^Tix/ }).click();
  await page.getByLabel("Scene filter").selectOption("scene-3");
  m = await measureRegions(page, WORKSPACE_REGIONS);
  rec(
    "scene filter change: no horizontal overflow",
    m.scrollWidth <= m.clientWidth && m.overflowElements.length === 0,
    m,
  );
  const filterState = await page.evaluate(() => {
    const list = document.querySelector(".pv1-asset-list");
    const detail = document.querySelector(".pv1-asset-detail");
    return {
      listHeading: list?.querySelector("h2")?.textContent ?? null,
      items: [...(list?.querySelectorAll(".pv1-asset-item strong") ?? [])].map(
        (el) => el.textContent,
      ),
      selected:
        document.querySelector(".pv1-asset-item.is-selected strong")
          ?.textContent ?? null,
      detailHeading: detail?.querySelector("h2")?.textContent ?? null,
    };
  });
  rec(
    "scene filter change: Scene 3 narrows the list and keeps the still-visible selection",
    filterState.listHeading === "All episodes · Scene 3 · Berry Patch" &&
      filterState.items.join("|") === "Ollo|Tix|Dot" &&
      filterState.selected === "Tix" &&
      filterState.detailHeading === "Tix",
    filterState,
  );
  report.screenshots.push(
    await shot(page, "wp1-1440x900-assets-scene-filter"),
  );

  /* Stale-selection clearing: Scene 5 excludes Tix, selection falls to Ollo. */
  await page.getByLabel("Scene filter").selectOption("scene-5");
  const staleState = await page.evaluate(() => ({
    selected:
      document.querySelector(".pv1-asset-item.is-selected strong")
        ?.textContent ?? null,
    detailHeading:
      document.querySelector(".pv1-asset-detail h2")?.textContent ?? null,
    detailText:
      document.querySelector(".pv1-asset-detail")?.textContent ?? "",
  }));
  rec(
    "stale selection clearing: excluded selection falls to the first valid record with no hidden stale detail",
    staleState.selected === "Ollo" &&
      staleState.detailHeading === "Ollo" &&
      !staleState.detailText.includes("Tix"),
    staleState,
  );

  /* Honest empty scope: Props + Scene 2. */
  await page.getByRole("button", { name: "Props" }).click();
  await page.getByLabel("Scene filter").selectOption("scene-2");
  m = await measureRegions(page, WORKSPACE_REGIONS);
  rec(
    "empty scope: no horizontal overflow",
    m.scrollWidth <= m.clientWidth && m.overflowElements.length === 0,
    m,
  );
  const emptyState = await page.evaluate(() => {
    const root = document.querySelector("[data-testid='pv1-assets']");
    return {
      listText: document.querySelector(".pv1-asset-list")?.textContent ?? "",
      detailText:
        document.querySelector(".pv1-asset-detail")?.textContent ?? "",
      itemCount: root?.querySelectorAll(".pv1-asset-item").length ?? -1,
    };
  });
  rec(
    "empty scope: honest empty list and detail, no hidden records",
    emptyState.itemCount === 0 &&
      emptyState.listText.includes(
        "No props records are scoped to All episodes · Scene 2 · Forest Path",
      ) &&
      emptyState.detailText.includes("Nothing selected"),
    emptyState,
  );
  report.screenshots.push(
    await shot(page, "wp1-1440x900-assets-empty-scope"),
  );

  /* Truth sweep: no control on the workspace reports a completed action. */
  const truthSweep = await page.evaluate(() => {
    const root = document.querySelector("[data-testid='pv1-assets']");
    return {
      enabledButtons: [
        ...(root?.querySelectorAll(".pv1-asset-detail button") ?? []),
      ].filter((button) => !button.disabled).length,
      text: root?.textContent ?? "",
    };
  });
  rec(
    "truth sweep: no enabled preparation control and no success claim anywhere",
    truthSweep.enabledButtons === 0 &&
      !/successfully|artifact created|has been (generated|imported|approved|rigged)|production-ready/i.test(
        truthSweep.text,
      ),
    { enabledButtons: truthSweep.enabledButtons },
  );

  /* Keyboard: category and filter controls are reachable in DOM order with
   * a visible focus outline. */
  await page.getByRole("button", { name: "Scene board" }).click();
  await page.waitForSelector(".pv1-studio-board");
  await page.evaluate(() => window.scrollTo(0, 0));
  let focused = null;
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press("Tab");
    focused = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        cls: typeof el.className === "string" ? el.className : "",
        outlineWidth: cs.outlineWidth,
        outlineStyle: cs.outlineStyle,
      };
    });
    if (focused && focused.cls.includes("pv1-workspace-tab")) break;
  }
  rec(
    "keyboard: workspace switch is reachable with a visible focus outline",
    focused !== null &&
      focused.cls.includes("pv1-workspace-tab") &&
      Number.parseFloat(focused.outlineWidth) >= 2 &&
      focused.outlineStyle === "solid",
    focused,
  );
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await page.waitForSelector("[data-testid='pv1-assets']");
  let categoryFocus = null;
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press("Tab");
    categoryFocus = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        cls: typeof el.className === "string" ? el.className : "",
        label: el.textContent,
        outlineWidth: cs.outlineWidth,
        outlineStyle: cs.outlineStyle,
      };
    });
    if (categoryFocus && categoryFocus.cls.includes("pv1-asset-category"))
      break;
  }
  rec(
    "keyboard: category navigation is reachable with a visible focus outline",
    categoryFocus !== null &&
      categoryFocus.cls.includes("pv1-asset-category") &&
      Number.parseFloat(categoryFocus.outlineWidth) >= 2 &&
      categoryFocus.outlineStyle === "solid",
    categoryFocus,
  );

  report.consoleIssues = consoleIssues;
  report.pageErrors = pageErrors;

  await context.close();
  await browser.close();

  const reportFile = path.join(OUT, "clickthrough-report.json");
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  const failed = report.checks.filter((check) => !check.pass);
  console.log(`report: ${reportFile}`);
  console.log(`report sha256: ${sha256File(reportFile)}`);
  if (consoleIssues.length > 0)
    failed.push({ name: `console issues ${JSON.stringify(consoleIssues)}` });
  if (pageErrors.length > 0)
    failed.push({ name: `page errors ${JSON.stringify(pageErrors)}` });
  if (failed.length > 0) {
    console.log(`FAILED CHECKS (${failed.length}):`);
    failed.forEach((f) => console.log(` - ${f.name}`));
    process.exit(1);
  }
  console.log(
    `ALL ${report.checks.length} CHECKS PASSED, zero console warnings/errors, zero page errors`,
  );
})().catch((e) => {
  console.error("EVIDENCE FAILED", e);
  process.exit(1);
});
