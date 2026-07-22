/* F3-WP5 reproducible browser evidence capture.
 * Exercises the real Product v1 journey at 1920x1080, 1440x900, 1024x800
 * against the dev server on 127.0.0.1:5195, with console/pageerror
 * listeners attached before any navigation. Produces screenshots +
 * machine-readable clickthrough report under the package evidence dir. */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const REPO_ROOT = path.resolve(__dirname, "../../..");
const pnpmStore = path.join(REPO_ROOT, "node_modules", ".pnpm");
const playwrightStores = fs
  .readdirSync(pnpmStore)
  .filter((entry) => entry.startsWith("playwright-core@"));
if (playwrightStores.length !== 1) {
  throw new Error(
    `Expected exactly one installed playwright-core, found ${playwrightStores.length}`,
  );
}
const pw = require(
  path.join(pnpmStore, playwrightStores[0], "node_modules", "playwright-core"),
);

const BASE = "http://127.0.0.1:5195/";
const OUT = path.join(
  REPO_ROOT,
  "reports",
  "agent-handoffs",
  "2026-07-21-kimi-f3-wp5-responsive-accessibility-evidence",
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
  task: "F3-WP5-RESPONSIVE-ACCESSIBILITY-EVIDENCE",
  base: BASE,
  capturedAt: new Date().toISOString(),
  viewports: [],
  referenceHashes: {},
};

const CRITICAL_REGIONS = {
  projects: [
    "[data-testid='pv1-projects']",
    ".pv1-topbar",
    ".pv1-projects-body",
  ],
  create: [
    "[data-testid='pv1-create']",
    ".pv1-topbar",
    ".pv1-create-narrow",
    ".pv1-create-review",
  ],
  review: [".pv1-proposal-review", ".pv1-proposal-actions"],
  studio: [
    "[data-testid='pv1-studio']",
    ".pv1-topbar",
    ".pv1-scope-header",
    ".pv1-studio-rail",
    ".pv1-studio-board",
    ".pv1-studio-inspector",
    ".pv1-ai-panel",
    ".pv1-studio-overview",
  ],
};

async function newJourneyPage(browser, viewport, reducedMotion) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const consoleIssues = [];
  const pageErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "warning" || msg.type() === "error")
      consoleIssues.push(`${msg.type()}: ${msg.text()}`);
  });
  page.on("pageerror", (err) => pageErrors.push(`pageerror: ${err.message}`));
  if (reducedMotion) await page.emulateMedia({ reducedMotion: "reduce" });
  return { context, page, consoleIssues, pageErrors };
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

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await pw.chromium.launch({ headless: true });

  // Reference image hashes (accepted Product v1 references).
  for (const ref of [
    "create-screen-reference.webp",
    "studio-timeline-reference.webp",
    "ai-copilot-concept-board.webp",
  ]) {
    const p = path.join(REPO_ROOT, "docs", "design", "ai-copilot-studio", ref);
    report.referenceHashes[`docs/design/ai-copilot-studio/${ref}`] =
      sha256File(p);
  }
  report.referenceHashes["docs/design/ai-copilot-studio/README.md"] =
    sha256File(
      path.join(REPO_ROOT, "docs", "design", "ai-copilot-studio", "README.md"),
    );

  /* ================= 1440x900: paste path, manual direction, AI proposal, offline/error truth ================= */
  {
    const vp = viewportRecord(1440, 900);
    const { context, page, consoleIssues, pageErrors } = await newJourneyPage(
      browser,
      { width: 1440, height: 900 },
      false,
    );
    const rec = (name, pass, details) =>
      vp.checks.push({ name, pass, details });

    await page.goto(BASE, { waitUntil: "networkidle" });
    let m = await measureRegions(page, CRITICAL_REGIONS.projects);
    rec(
      "projects: no horizontal overflow",
      m.scrollWidth <= m.clientWidth && m.overflowElements.length === 0,
      m,
    );
    vp.screenshots.push(await shot(page, "wp5-1440x900-projects"));
    const focusProjects = await page.evaluate(
      () => document.activeElement?.textContent,
    );
    rec(
      "projects: focus lands on the Projects heading",
      focusProjects === "Projects",
      { focusProjects },
    );

    await page.getByRole("button", { name: "New project" }).first().click();
    await page
      .getByRole("heading", { name: /Start a new Kids Story/ })
      .waitFor();
    m = await measureRegions(page, CRITICAL_REGIONS.create);
    rec(
      "create choice: no horizontal overflow",
      m.scrollWidth <= m.clientWidth && m.overflowElements.length === 0,
      m,
    );
    rec(
      "create choice: focus on the surface heading",
      await page.evaluate(() =>
        document.activeElement?.textContent?.includes("Start a new Kids Story"),
      ),
      {},
    );
    vp.screenshots.push(await shot(page, "wp5-1440x900-create-choice"));

    await page.getByRole("button", { name: /Paste a script/ }).click();
    await page.getByRole("textbox", { name: "Script" }).waitFor();
    m = await measureRegions(page, CRITICAL_REGIONS.create);
    rec(
      "paste form: no horizontal overflow",
      m.scrollWidth <= m.clientWidth && m.overflowElements.length === 0,
      m,
    );
    await page.getByRole("textbox", { name: "Script" }).fill(SAMPLE_SCRIPT);
    await page.getByRole("button", { name: "Create proposal" }).click();
    await page.getByRole("article", { name: "Review proposal" }).waitFor();
    m = await measureRegions(
      page,
      CRITICAL_REGIONS.create.concat(CRITICAL_REGIONS.review),
    );
    rec(
      "shared review: no horizontal overflow",
      m.scrollWidth <= m.clientWidth && m.overflowElements.length === 0,
      m,
    );
    rec(
      "shared review: focus on the episode title field",
      await page.evaluate(
        () =>
          document.activeElement?.getAttribute("aria-label") ===
          "Episode title",
      ),
      {},
    );
    vp.screenshots.push(await shot(page, "wp5-1440x900-paste-proposal-review"));
    await page
      .getByRole("button", { name: /Enter Studio/ })
      .scrollIntoViewIfNeeded();
    const enterBtn = await page
      .getByRole("button", { name: /Enter Studio/ })
      .boundingBox();
    rec(
      "shared review: Enter Studio action is fully visible and reachable",
      enterBtn !== null &&
        enterBtn.x >= 0 &&
        enterBtn.x + enterBtn.width <= 1440 &&
        enterBtn.y >= 0 &&
        enterBtn.y + enterBtn.height <= 900,
      enterBtn,
    );
    vp.screenshots.push(
      await shot(page, "wp5-1440x900-paste-proposal-review-actions"),
    );

    await page.getByRole("button", { name: /Enter Studio/ }).click();
    await page.waitForSelector("[data-testid='pv1-studio']");
    await page.evaluate(() => window.scrollTo(0, 0));
    m = await measureRegions(page, CRITICAL_REGIONS.studio);
    rec(
      "studio: no horizontal overflow",
      m.scrollWidth <= m.clientWidth && m.overflowElements.length === 0,
      m,
    );
    rec(
      "studio: board between rail and inspector (visual order)",
      m.regions[".pv1-studio-rail"].right <=
        m.regions[".pv1-studio-board"].left &&
        m.regions[".pv1-studio-board"].right <=
          m.regions[".pv1-studio-inspector"].left + 1,
      {
        rail: m.regions[".pv1-studio-rail"],
        board: m.regions[".pv1-studio-board"],
        inspector: m.regions[".pv1-studio-inspector"],
      },
    );
    rec(
      "studio: focus on the board heading",
      await page.evaluate(
        () => document.activeElement?.textContent === "The Home Nook",
      ),
      {},
    );

    // Manual direction: Direct tab draft + Apply + committed status
    await page
      .getByRole("textbox", { name: "Beat purpose" })
      .fill("Set the cozy stakes");
    await page
      .getByRole("textbox", { name: "Performance direction" })
      .fill("Play it small and warm");
    await page.getByRole("button", { name: "Apply", exact: true }).click();
    await page.waitForSelector(
      "text=Draft matches this beat's committed session direction.",
    );
    vp.screenshots.push(
      await shot(page, "wp5-1440x900-studio-manual-direction"),
    );

    await page.getByRole("tab", { name: "Visual" }).click();
    rec(
      "studio: Visual tab is selected through the real Director tab contract",
      (await page
        .getByRole("tab", { name: "Visual" })
        .getAttribute("aria-selected")) === "true",
      {},
    );
    vp.screenshots.push(await shot(page, "wp5-1440x900-studio-visual"));
    await page.getByRole("tab", { name: "Motion" }).click();
    rec(
      "studio: Motion tab is selected through the real Director tab contract",
      (await page
        .getByRole("tab", { name: "Motion" })
        .getAttribute("aria-selected")) === "true",
      {},
    );
    vp.screenshots.push(await shot(page, "wp5-1440x900-studio-motion"));

    // AI proposal flow: signed-out truth first, then connect, request, proposal
    const signedOutPanel = await page.locator(".pv1-ai-panel").textContent();
    rec(
      "studio: AI panel signed-out truth (Connect surface, fixture label)",
      signedOutPanel.includes("Connect AI Director") &&
        signedOutPanel.includes(
          "Local AI Director fixture — no service connected",
        ),
      {},
    );
    await page
      .locator(".pv1-ai-panel")
      .getByRole("button", { name: "Run runtime check" })
      .click();
    rec(
      "studio: signed-out runtime check remains an explicit no-contact fixture",
      (await page.locator(".pv1-ai-panel").textContent()).includes(
        "Runtime check (fixture): no runtime was contacted",
      ),
      {},
    );
    vp.screenshots.push(await shot(page, "wp5-1440x900-studio-ai-signed-out"));
    await page.getByRole("button", { name: "Sign in with ChatGPT" }).click();
    await page
      .getByRole("textbox", { name: "AI Director request" })
      .fill("Make the lantern moment land softer");
    await page.getByRole("button", { name: "Send request" }).click();
    await page.waitForSelector("text=Complete (fixture turn)", {
      timeout: 9000,
    });
    await page.waitForSelector(
      "text=Fixture proposal ready for the captured scope — Scene 1 · Beat 1.",
    );
    m = await measureRegions(page, CRITICAL_REGIONS.studio);
    rec(
      "studio + AI proposal: no horizontal overflow",
      m.scrollWidth <= m.clientWidth && m.overflowElements.length === 0,
      m,
    );
    vp.screenshots.push(await shot(page, "wp5-1440x900-studio-ai-proposal"));

    // Apply then Undo through the panel
    await page.getByRole("button", { name: "Apply proposal" }).click();
    await page.waitForSelector("text=/Applied to the captured beat/");
    const focusUndo = await page.evaluate(
      () => document.activeElement?.textContent,
    );
    rec(
      "studio: focus moves to Undo proposal apply after Apply",
      focusUndo === "Undo proposal apply",
      { focusUndo },
    );
    await page.getByRole("button", { name: "Undo proposal apply" }).click();
    const focusApply = await page.evaluate(
      () => document.activeElement?.textContent,
    );
    rec(
      "studio: focus returns to Apply proposal after Undo",
      focusApply === "Apply proposal",
      { focusApply },
    );

    // Offline/error truth: drop connection mid-request
    await page
      .getByRole("textbox", { name: "AI Director request" })
      .fill("Try the error path");
    await page.getByRole("button", { name: "Send request" }).click();
    await page.getByRole("button", { name: /AI Director status:/ }).click();
    await page.getByLabel("Connection fixture state").selectOption("offline");
    await page.keyboard.press("Escape");
    await page.waitForSelector("text=Error (fixture turn)", { timeout: 9000 });
    await page.waitForSelector(
      "text=Request ended in the Error fixture state — no proposal was produced and nothing was applied.",
    );
    const offlineChip = await page
      .getByRole("button", { name: /AI Director status: Offline/ })
      .count();
    rec(
      "offline/error truth: Error turn + truthful Offline chip",
      offlineChip === 1,
      {},
    );
    // Bring the Error turn into the visible area for the capture.
    await page
      .locator("text=Error (fixture turn)")
      .first()
      .scrollIntoViewIfNeeded();
    vp.screenshots.push(
      await shot(page, "wp5-1440x900-ai-error-offline-truth"),
    );

    vp.consoleIssues = consoleIssues;
    vp.pageErrors = pageErrors;
    report.viewports.push(vp);
    await context.close();
  }

  /* ================= 1920x1080: idea path through the same review gate ================= */
  {
    const vp = viewportRecord(1920, 1080);
    const { context, page, consoleIssues, pageErrors } = await newJourneyPage(
      browser,
      { width: 1920, height: 1080 },
      false,
    );
    const rec = (name, pass, details) =>
      vp.checks.push({ name, pass, details });

    await page.goto(BASE, { waitUntil: "networkidle" });
    let m = await measureRegions(page, CRITICAL_REGIONS.projects);
    rec(
      "projects: no horizontal overflow",
      m.scrollWidth <= m.clientWidth && m.overflowElements.length === 0,
      m,
    );

    await page.getByRole("button", { name: "New project" }).first().click();
    await page
      .getByRole("heading", { name: /Start a new Kids Story/ })
      .waitFor();
    await page.getByRole("button", { name: /What's your idea\?/ }).click();
    await page.getByRole("region", { name: "Connect AI Director" }).waitFor();
    m = await measureRegions(page, CRITICAL_REGIONS.create);
    rec(
      "idea connect (signed out): no horizontal overflow",
      m.scrollWidth <= m.clientWidth && m.overflowElements.length === 0,
      m,
    );
    vp.screenshots.push(
      await shot(page, "wp5-1920x1080-create-idea-connect-signed-out"),
    );

    await page.getByRole("button", { name: "Sign in with ChatGPT" }).click();
    await page.getByRole("textbox", { name: "Story idea" }).waitFor();
    const focusIdea = await page.evaluate(
      () => document.activeElement?.textContent,
    );
    rec(
      "idea path: sign-in moves focus to the form heading",
      focusIdea === "What's your idea?",
      { focusIdea },
    );
    await page
      .getByRole("textbox", { name: "Story idea" })
      .fill("A shy lantern guides three friends home through the little wood.");
    await page.getByRole("button", { name: "Create proposal" }).click();
    await page.getByRole("article", { name: "Review proposal" }).waitFor();
    m = await measureRegions(
      page,
      CRITICAL_REGIONS.create.concat(CRITICAL_REGIONS.review),
    );
    rec(
      "idea review: no horizontal overflow",
      m.scrollWidth <= m.clientWidth && m.overflowElements.length === 0,
      m,
    );
    vp.screenshots.push(await shot(page, "wp5-1920x1080-idea-proposal-review"));

    await page.getByRole("button", { name: /Enter Studio/ }).click();
    await page.waitForSelector("[data-testid='pv1-studio']");
    await page.evaluate(() => window.scrollTo(0, 0));
    m = await measureRegions(page, CRITICAL_REGIONS.studio);
    rec(
      "studio: no horizontal overflow",
      m.scrollWidth <= m.clientWidth && m.overflowElements.length === 0,
      m,
    );
    rec(
      "studio: clean wide capture starts with topbar and scope header visible",
      m.regions[".pv1-topbar"].top >= 0 &&
        m.regions[".pv1-scope-header"].top >= 0 &&
        m.regions[".pv1-scope-header"].bottom <= 1080,
      {
        topbar: m.regions[".pv1-topbar"],
        scope: m.regions[".pv1-scope-header"],
      },
    );
    vp.screenshots.push(await shot(page, "wp5-1920x1080-studio"));

    // Keyboard: settings open, Escape close, focus returns to chip
    await page.getByRole("button", { name: /AI Director status:/ }).click();
    await page.getByRole("region", { name: "AI Director settings" }).waitFor();
    await page.keyboard.press("Escape");
    const chipFocus = await page.evaluate(
      () => document.activeElement?.textContent ?? "",
    );
    const settingsGone =
      (await page
        .getByRole("region", { name: "AI Director settings" })
        .count()) === 0;
    rec(
      "settings: Escape closes and focus returns to the chip",
      settingsGone && chipFocus.includes("AI Director:"),
      { settingsGone, chipFocus },
    );

    vp.consoleIssues = consoleIssues;
    vp.pageErrors = pageErrors;
    report.viewports.push(vp);
    await context.close();
  }

  /* ================= 1024x800: compact order, keyboard/focus, reduced motion ================= */
  {
    const vp = viewportRecord(1024, 800);
    const { context, page, consoleIssues, pageErrors } = await newJourneyPage(
      browser,
      { width: 1024, height: 800 },
      false,
    );
    const rec = (name, pass, details) =>
      vp.checks.push({ name, pass, details });

    await page.goto(BASE, { waitUntil: "networkidle" });
    let m = await measureRegions(page, CRITICAL_REGIONS.projects);
    rec(
      "projects: no horizontal overflow",
      m.scrollWidth <= m.clientWidth && m.overflowElements.length === 0,
      m,
    );
    vp.screenshots.push(await shot(page, "wp5-1024x800-projects"));

    await page.getByRole("button", { name: "New project" }).first().click();
    await page
      .getByRole("heading", { name: /Start a new Kids Story/ })
      .waitFor();
    m = await measureRegions(page, CRITICAL_REGIONS.create);
    rec(
      "create choice compact: no horizontal overflow",
      m.scrollWidth <= m.clientWidth && m.overflowElements.length === 0,
      m,
    );
    vp.screenshots.push(await shot(page, "wp5-1024x800-create-choice"));

    await page.getByRole("button", { name: /Paste a script/ }).click();
    await page.getByRole("textbox", { name: "Script" }).fill(SAMPLE_SCRIPT);
    await page.getByRole("button", { name: "Create proposal" }).click();
    await page.getByRole("article", { name: "Review proposal" }).waitFor();
    m = await measureRegions(
      page,
      CRITICAL_REGIONS.create.concat(CRITICAL_REGIONS.review),
    );
    rec(
      "shared review compact: no horizontal overflow",
      m.scrollWidth <= m.clientWidth && m.overflowElements.length === 0,
      m,
    );
    vp.screenshots.push(await shot(page, "wp5-1024x800-paste-proposal-review"));
    await page
      .getByRole("button", { name: /Enter Studio/ })
      .scrollIntoViewIfNeeded();
    const compactEnter = await page
      .getByRole("button", { name: /Enter Studio/ })
      .boundingBox();
    rec(
      "shared review compact: final action is fully visible and reachable",
      compactEnter !== null &&
        compactEnter.x >= 0 &&
        compactEnter.x + compactEnter.width <= 1024 &&
        compactEnter.y >= 0 &&
        compactEnter.y + compactEnter.height <= 800,
      compactEnter,
    );
    vp.screenshots.push(
      await shot(page, "wp5-1024x800-paste-proposal-review-actions"),
    );
    await page.getByRole("button", { name: /Enter Studio/ }).click();
    await page.waitForSelector("[data-testid='pv1-studio']");
    await page.evaluate(() => window.scrollTo(0, 0));

    await page.getByRole("button", { name: /AI Director status:/ }).click();
    await page.getByRole("region", { name: "AI Director settings" }).waitFor();
    m = await measureRegions(page, CRITICAL_REGIONS.studio);
    rec(
      "settings compact: no horizontal overflow",
      m.scrollWidth <= m.clientWidth && m.overflowElements.length === 0,
      m,
    );
    vp.screenshots.push(await shot(page, "wp5-1024x800-studio-settings"));
    await page.keyboard.press("Escape");
    await page.evaluate(() => window.scrollTo(0, 0));

    m = await measureRegions(page, CRITICAL_REGIONS.studio);
    rec(
      "studio compact: no horizontal overflow",
      m.scrollWidth <= m.clientWidth && m.overflowElements.length === 0,
      m,
    );
    rec(
      "studio compact: intentional stacked order rail < board < inspector < AI panel",
      m.regions[".pv1-studio-rail"].top <= m.regions[".pv1-studio-board"].top &&
        m.regions[".pv1-studio-board"].top <=
          m.regions[".pv1-studio-inspector"].top &&
        m.regions[".pv1-studio-inspector"].top <=
          m.regions[".pv1-ai-panel"].top,
      {
        rail: m.regions[".pv1-studio-rail"].top,
        board: m.regions[".pv1-studio-board"].top,
        inspector: m.regions[".pv1-studio-inspector"].top,
        aiPanel: m.regions[".pv1-ai-panel"].top,
      },
    );
    rec(
      "studio compact: board begins inside the first viewport",
      m.regions[".pv1-studio-board"].top < 800 &&
        m.regions[".pv1-studio-board"].bottom > 0,
      { board: m.regions[".pv1-studio-board"] },
    );

    // Keyboard tab order from the top: record the first focus stops.
    const tabStops = [];
    await page.keyboard.press("Tab");
    for (let i = 0; i < 12; i++) {
      const stop = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return "none";
        const label =
          el.getAttribute("aria-label") ??
          el.textContent?.trim().slice(0, 60) ??
          el.tagName;
        const cs = getComputedStyle(el);
        return {
          label: label.slice(0, 80),
          tag: el.tagName.toLowerCase(),
          outlineWidth: cs.outlineWidth,
          outlineStyle: cs.outlineStyle,
        };
      });
      tabStops.push(stop);
      await page.keyboard.press("Tab");
    }
    rec(
      "keyboard: tab stops carry a visible focus outline (>=2px)",
      tabStops.every(
        (s) =>
          typeof s !== "string" &&
          Number.parseFloat(s.outlineWidth) >= 2 &&
          s.outlineStyle === "solid",
      ),
      tabStops,
    );

    // Rail keyboard contract: focus a rail scene, ArrowDown, visible focus follows.
    await page.locator("#pv1-rail-scene-scene-1").focus();
    await page.keyboard.press("ArrowDown");
    const railFocus = await page.evaluate(() => {
      const el = document.activeElement;
      const cs = getComputedStyle(el);
      return {
        id: el.id,
        label: el.getAttribute("aria-label"),
        outlineWidth: cs.outlineWidth,
        outlineStyle: cs.outlineStyle,
        rect: (() => {
          const r = el.getBoundingClientRect();
          return { left: Math.round(r.left), right: Math.round(r.right) };
        })(),
      };
    });
    rec(
      "keyboard: rail ArrowDown moves selection+focus to Scene 2 with visible outline",
      railFocus.id === "pv1-rail-scene-scene-2" &&
        Number.parseFloat(railFocus.outlineWidth) >= 2,
      railFocus,
    );
    vp.screenshots.push(await shot(page, "wp5-1024x800-studio-keyboard-focus"));

    // AI panel reachable and operable at 1024: connect + request + proposal
    await page.getByRole("button", { name: "Sign in with ChatGPT" }).click();
    await page
      .getByRole("textbox", { name: "AI Director request" })
      .fill("Keep the hush gentle");
    await page.getByRole("button", { name: "Send request" }).click();
    await page.waitForSelector("text=Complete (fixture turn)", {
      timeout: 9000,
    });
    m = await measureRegions(page, CRITICAL_REGIONS.studio);
    rec(
      "studio compact + AI proposal: no horizontal overflow",
      m.scrollWidth <= m.clientWidth && m.overflowElements.length === 0,
      m,
    );
    const applyBox = await page
      .getByRole("button", { name: "Apply proposal" })
      .boundingBox();
    rec(
      "studio compact: Apply proposal action reachable in flow",
      applyBox !== null &&
        applyBox.width > 0 &&
        applyBox.x >= 0 &&
        applyBox.x + applyBox.width <= 1024,
      applyBox,
    );
    vp.screenshots.push(await shot(page, "wp5-1024x800-studio-ai-proposal"));

    // Reduced motion emulation: prove the query matches, motion is clamped,
    // and a new request settles without staged progress decoration.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page
      .getByRole("textbox", { name: "AI Director request" })
      .fill("Settle without decorative progress");
    await page.getByRole("button", { name: "Send request" }).click();
    await page.waitForFunction(
      () =>
        document.querySelectorAll(".pv1-ai-turn-status.is-complete").length ===
        2,
    );
    const rm = await page.evaluate(() => {
      const matches = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const rail = document.querySelector(".pv1-rail-scene");
      const railCs = getComputedStyle(rail);
      const panel = document.querySelector(".pv1-ai-panel");
      const panelCs = getComputedStyle(panel);
      const chip = document.querySelector(".pv1-ai-chip");
      const chipCs = chip ? getComputedStyle(chip) : null;
      return {
        matches,
        railTransitionDuration: railCs.transitionDuration,
        railAnimationDuration: railCs.animationDuration,
        railAnimationIterationCount: railCs.animationIterationCount,
        railAnimationName: railCs.animationName,
        panelScrollBehavior: panelCs.scrollBehavior,
        chipTransitionDuration: chipCs ? chipCs.transitionDuration : null,
        stagedProgressCount: document.querySelectorAll(".pv1-ai-stages").length,
      };
    });
    vp.reducedMotion = rm;
    const toMs = (v) =>
      typeof v === "string" && v.endsWith("ms")
        ? Number.parseFloat(v)
        : typeof v === "string" && v.endsWith("s")
          ? Number.parseFloat(v) * 1000
          : Number.NaN;
    rec(
      "reduced motion: media query matches and transitions/animations clamp to 0.01ms with auto scroll",
      rm.matches === true &&
        toMs(rm.railTransitionDuration) <= 0.01 &&
        toMs(rm.railAnimationDuration) <= 0.01 &&
        rm.railAnimationIterationCount === "1" &&
        rm.railAnimationName === "none" &&
        rm.panelScrollBehavior === "auto" &&
        toMs(rm.chipTransitionDuration) <= 0.01 &&
        rm.stagedProgressCount === 0,
      rm,
    );
    vp.screenshots.push(await shot(page, "wp5-1024x800-reduced-motion"));
    await page.emulateMedia({ reducedMotion: "no-preference" });

    await page
      .getByRole("textbox", { name: "AI Director request" })
      .fill("Exercise the compact error state");
    await page.getByRole("button", { name: "Send request" }).click();
    await page.getByRole("button", { name: /AI Director status:/ }).click();
    await page.getByLabel("Connection fixture state").selectOption("offline");
    await page.keyboard.press("Escape");
    await page.waitForSelector("text=Error (fixture turn)", { timeout: 9000 });
    rec(
      "compact error truth: Error turn and Offline connection remain distinct",
      (await page
        .getByRole("button", { name: /AI Director status: Offline/ })
        .count()) === 1,
      {},
    );
    await page
      .locator("text=Error (fixture turn)")
      .last()
      .scrollIntoViewIfNeeded();
    vp.screenshots.push(
      await shot(page, "wp5-1024x800-ai-error-offline-truth"),
    );

    vp.consoleIssues = consoleIssues;
    vp.pageErrors = pageErrors;
    report.viewports.push(vp);
    await context.close();
  }

  await browser.close();

  const reportFile = path.join(OUT, "clickthrough-report.json");
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  const failed = [];
  for (const vp of report.viewports) {
    for (const c of vp.checks)
      if (!c.pass) failed.push(`${vp.viewport}: ${c.name}`);
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
    failed.forEach((f) => console.log(` - ${f}`));
    process.exit(1);
  }
  console.log(
    `ALL ${report.viewports.reduce((n, vp) => n + vp.checks.length, 0)} CHECKS PASSED, zero console warnings/errors, zero page errors`,
  );
})().catch((e) => {
  console.error("EVIDENCE FAILED", e);
  process.exit(1);
});
