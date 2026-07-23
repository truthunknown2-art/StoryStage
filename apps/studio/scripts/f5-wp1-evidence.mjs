/* global console, document, getComputedStyle, process, window */
/* F5-WP1 reproducible browser evidence capture.
 * Exercises the real Product v1 Projects → Create → shared proposal review →
 * Studio → Audio workspace path at 1440x900 against the dev server on
 * 127.0.0.1:5195, with console/pageerror listeners attached before any
 * navigation. Captures the Narration selected-take state, the Dialogue
 * honest empty state, the SFX selected-cue state, the Music guide-versus-
 * final timing boundary, and a deterministic shared-scope change, and hashes
 * every screenshot and the machine-readable report with SHA-256.
 *
 * The capture set is fail-closed: the report must contain exactly the nine
 * expected capture names in EXPECTED_SCREENSHOT_NAMES, once each — a
 * missing, duplicate, or extra capture fails the gate. The pure set check is
 * exported so the deterministic negative regression
 * (src/product-v1/f5-wp1-evidence-gate.test.ts) can prove the gate fails for
 * an incomplete set without launching a browser; the browser journey runs
 * only when this file is executed directly. */
import crypto from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..", "..", "..");

const BASE = "http://127.0.0.1:5195/";
const OUT = path.join(
  REPO_ROOT,
  "reports",
  "agent-handoffs",
  "2026-07-22-kimi-f5-wp1-audio-workspace-track-hierarchy",
  "screenshots",
);
const SAMPLE_SCRIPT = [
  "Lila lives in a quiet village at the edge of a deep, whispering forest.",
  "One evening, she finds a small lantern glowing under the roots of an old tree.",
  "The light flickers, and a soft rustle in the bushes makes her pause.",
  "Summoning her courage, Lila picks up the lantern and follows the glow.",
  "It leads her across a stream and into a hidden glade filled with fireflies.",
].join("\n\n");

/** The exact nine captures this package requires, in journey order. The
 * evidence gate fails closed unless the report contains exactly this set,
 * once each — no missing, duplicate, or extra capture. */
export const EXPECTED_SCREENSHOT_NAMES = Object.freeze([
  "wp1-1440x900-projects",
  "wp1-1440x900-proposal-review",
  "wp1-1440x900-studio-board",
  "wp1-1440x900-audio-narration-take",
  "wp1-1440x900-audio-dialogue-empty",
  "wp1-1440x900-audio-sfx-cue",
  "wp1-1440x900-audio-music-timing",
  "wp1-1440x900-audio-scope-change",
  "wp1-1440x900-audio-track-tab-focus",
]);

/** Pure fail-closed set check over captured `screenshots/<name>.png`
 * entries: returns one message per missing, duplicate, or extra capture. An
 * empty result means the entries hold exactly the nine expected captures,
 * once each, so an incomplete or empty report can never pass. */
export function screenshotSetFailures(files) {
  const names = files.map((file) =>
    String(file)
      .split(/[\\/]/)
      .pop()
      .replace(/\.png$/i, ""),
  );
  const counts = new Map();
  for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
  const failures = [];
  for (const expected of EXPECTED_SCREENSHOT_NAMES) {
    const seen = counts.get(expected) ?? 0;
    if (seen === 0) failures.push(`missing expected capture: ${expected}`);
    else if (seen > 1)
      failures.push(`duplicate capture: ${expected} (x${seen})`);
  }
  for (const name of [...counts.keys()].sort()) {
    if (!EXPECTED_SCREENSHOT_NAMES.includes(name))
      failures.push(`extra capture: ${name}`);
  }
  return failures;
}

const sha256File = (file) =>
  crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

const AUDIO_REGIONS = [
  "[data-testid='pv1-audio']",
  ".pv1-audio-controls",
  ".pv1-audio-list",
  ".pv1-audio-inspector",
];

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

const audioState = () => {
  const root = document.querySelector("[data-testid='pv1-audio']");
  const panel = root?.querySelector(".pv1-audio-list:not([hidden])");
  const inspector = root?.querySelector(".pv1-audio-inspector");
  const selectedCard = panel?.querySelector(".pv1-audio-card.is-selected");
  return {
    heading: root?.querySelector("h1")?.textContent ?? null,
    count: panel?.querySelector(".pv1-audio-count")?.textContent ?? null,
    cardCount: panel?.querySelectorAll(".pv1-audio-card").length ?? -1,
    selectedCard: selectedCard?.querySelector("strong")?.textContent ?? null,
    selectedCardCurrent:
      selectedCard?.getAttribute("aria-current") ?? null,
    panelHidden: panel?.hasAttribute("hidden") ?? null,
    inspectorText: inspector?.textContent ?? "",
    panelText: panel?.textContent ?? "",
    rootText: root?.textContent ?? "",
  };
};

async function main() {
  const loadPackage = createRequire(import.meta.url);
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

  const report = {
    task: "F5-WP1-AUDIO-WORKSPACE-TRACK-HIERARCHY",
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

  const shot = async (page, name) => {
    const file = path.join(OUT, `${name}.png`);
    await page.screenshot({ path: file, fullPage: false });
    return { file: `screenshots/${name}.png`, sha256: sha256File(file) };
  };

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
   * Studio → Audio workspace. */
  await page.goto(BASE, { waitUntil: "networkidle" });
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

  /* Audio workspace arrival: Narration is the default track; the workspace
   * switch reports selected state; the board stays mounted, hidden. */
  await page.getByRole("button", { name: "Audio", exact: true }).click();
  await page.waitForSelector("[data-testid='pv1-audio']");
  let m = await measureRegions(page, AUDIO_REGIONS);
  rec(
    "audio arrival: no horizontal overflow",
    m.scrollWidth <= m.clientWidth && m.overflowElements.length === 0,
    m,
  );
  rec(
    "audio arrival: workspace switch exposes selected state, board stays mounted hidden",
    (await page
      .getByRole("button", { name: "Audio", exact: true })
      .getAttribute("aria-current")) === "true" &&
      (await page
        .getByRole("button", { name: "Scene board" })
        .getAttribute("aria-current")) === null &&
      (await page.evaluate(() => {
        const layout = document.querySelector(".pv1-studio-layout");
        const board = document.querySelector(".pv1-studio-board");
        return (
          layout?.hasAttribute("hidden") === true && board !== null
        );
      })),
    {},
  );
  rec(
    "audio arrival: audio scope agrees with the permanent scope header",
    await page.evaluate(() => {
      const scope = document.querySelector(".pv1-scope-header");
      const panel = document.querySelector(
        "[data-testid='pv1-audio'] .pv1-audio-list:not([hidden])",
      );
      return (
        scope !== null &&
        panel !== null &&
        scope.textContent.includes("Scene 1 · The Home Nook") &&
        scope.textContent.includes(
          "Beat 1 · Morning light through the round window",
        ) &&
        panel.textContent.includes(
          "Scene 1 · The Home Nook · Beat 1 · Morning light through the round window",
        )
      );
    }),
    {},
  );
  let state = await page.evaluate(audioState);
  rec(
    "narration: tab state, heading, count, cards, and inspector agree",
    (await page
      .getByRole("tab", { name: "Narration" })
      .getAttribute("aria-selected")) === "true" &&
      state.heading === "Narration" &&
      state.count === "2 planned takes in this scene/beat scope" &&
      state.cardCount === 2 &&
      state.selectedCard === "Take A · Morning welcome narration" &&
      state.selectedCardCurrent === "true" &&
      state.inspectorText.includes("Narration — Voice track") &&
      state.inspectorText.includes("Take A · Morning welcome narration"),
    state,
  );

  /* Selected take: clicking Take B produces an observable inspector change. */
  await page
    .getByRole("button", { name: /Take B · Morning welcome, slower read/ })
    .click();
  state = await page.evaluate(audioState);
  rec(
    "narration: selecting Take B updates card state and inspector observably",
    state.selectedCard === "Take B · Morning welcome, slower read" &&
      state.selectedCardCurrent === "true" &&
      state.inspectorText.includes("Take B · Morning welcome, slower read") &&
      state.inspectorText.includes(
        "Guide plan places this take 0s into the beat for about 15s",
      ) &&
      !state.inspectorText.includes("Take A · Morning welcome narration"),
    state,
  );
  report.screenshots.push(await shot(page, "wp1-1440x900-audio-narration-take"));

  /* Dialogue: the default scope honestly has no dialogue planning takes, and
   * the empty inspector must state no-card/no-status/no-timing truth — it may
   * never claim a local demo planning card, a planned status, a guide
   * placement, or any available timing for a nonexistent card. */
  await page.getByRole("tab", { name: "Dialogue" }).click();
  state = await page.evaluate(audioState);
  rec(
    "dialogue: exact empty state, zero cards, no fake success action, and an inspector with no manufactured card/status/timing truth",
    (await page
      .getByRole("tab", { name: "Dialogue" })
      .getAttribute("aria-selected")) === "true" &&
      state.heading === "Dialogue" &&
      state.cardCount === 0 &&
      state.panelText.includes(
        "No dialogue planning takes for Scene 1 · The Home Nook · Beat 1 · Morning light through the round window",
      ) &&
      state.panelText.includes(
        "Later accepted work adds dialogue recording states",
      ) &&
      state.inspectorText.includes(
        "No take selected — this scope has no dialogue planning takes.",
      ) &&
      state.inspectorText.includes(
        "No planning card selected — no audio exists",
      ) &&
      state.inspectorText.includes(
        "No planned take exists in the current scene/beat scope",
      ) &&
      state.inspectorText.includes("No guide or final timing exists") &&
      !state.inspectorText.includes("Local demo planning card") &&
      !state.inspectorText.includes("Planned take — nothing recorded") &&
      !state.inspectorText.includes("Planned cue — no audio placed") &&
      !state.inspectorText.includes("Guide plan places") &&
      !state.inspectorText.includes(
        "Guide timing — provisional planning only, not final timing",
      ) &&
      !state.inspectorText.includes(
        "Final timing — unavailable until later accepted audio work",
      ),
    state,
  );
  report.screenshots.push(await shot(page, "wp1-1440x900-audio-dialogue-empty"));

  /* SFX: one selected local-demo cue with its truth labels. */
  await page.getByRole("tab", { name: "SFX" }).click();
  state = await page.evaluate(audioState);
  rec(
    "sfx: selected cue, status, and fixture truth labels stay associated with the track",
    state.heading === "SFX" &&
      state.count === "1 planned cue in this scene/beat scope" &&
      state.cardCount === 1 &&
      state.selectedCard === "Soft window-light chime" &&
      state.panelText.includes("Planned cue — no audio placed") &&
      state.panelText.includes(
        "Local demo planning card — no audio exists",
      ) &&
      state.inspectorText.includes("SFX — Cue track") &&
      state.inspectorText.includes("Soft window-light chime") &&
      !state.inspectorText.includes("Morning welcome narration"),
    state,
  );
  report.screenshots.push(await shot(page, "wp1-1440x900-audio-sfx-cue"));

  /* Music: the guide-versus-final timing boundary is explicit. */
  await page.getByRole("tab", { name: "Music" }).click();
  state = await page.evaluate(audioState);
  rec(
    "music: guide timing is provisional and final timing is unavailable everywhere timing appears",
    state.selectedCard === "Morning theme — guide placement" &&
      state.panelText.includes(
        "Guide plan places this cue 0s into the beat for about 30s",
      ) &&
      state.panelText.includes(
        "Guide timing — provisional planning only, not final timing",
      ) &&
      state.inspectorText.includes(
        "Guide timing — provisional planning only, not final timing",
      ) &&
      state.inspectorText.includes(
        "Final timing — unavailable until later accepted audio work",
      ) &&
      !/final timing (is|—) (available|set|locked)/i.test(
        state.inspectorText,
      ),
    state,
  );
  report.screenshots.push(await shot(page, "wp1-1440x900-audio-music-timing"));

  /* Shared scope: the in-workspace beat select writes through the same
   * authoritative Studio selection and deterministically re-resolves cards. */
  await page.getByRole("tab", { name: "Narration" }).click();
  await page.getByLabel("Audio beat scope").selectOption("1");
  state = await page.evaluate(audioState);
  rec(
    "shared scope: beat change re-resolves cards with no stale leak and updates the scope header",
    state.count === "1 planned take in this scene/beat scope" &&
      state.cardCount === 1 &&
      state.selectedCard === "Take A · Shelf of stories narration" &&
      !state.panelText.includes("Morning welcome narration") &&
      !state.inspectorText.includes("Morning welcome narration") &&
      (await page.evaluate(() => {
        const scope = document.querySelector(".pv1-scope-header");
        return (
          scope !== null &&
          scope.textContent.includes(
            "Beat 2 · A shelf of unfinished stories",
          )
        );
      })),
    state,
  );
  report.screenshots.push(await shot(page, "wp1-1440x900-audio-scope-change"));
  await page.getByLabel("Audio beat scope").selectOption("0");

  /* Truth sweep: every orientation action is disabled with its reason and no
   * surface claims a device, file, playback, waveform, lip-sync, mixing, or
   * persistence success. */
  const truthSweep = await page.evaluate(() => {
    const root = document.querySelector("[data-testid='pv1-audio']");
    const actions = [
      ...(root?.querySelectorAll(".pv1-audio-actions button") ?? []),
    ];
    return {
      actionCount: actions.length,
      enabledActions: actions.filter((button) => !button.disabled).length,
      reasons: root?.querySelector(".pv1-audio-actions")?.textContent ?? "",
      text: root?.textContent ?? "",
    };
  });
  rec(
    "truth sweep: every device/file/playback action is disabled with a reason and no success claim exists",
    truthSweep.actionCount > 0 &&
      truthSweep.enabledActions === 0 &&
      truthSweep.reasons.includes("Unavailable —") &&
      !/successfully|has been (recorded|imported|decoded|played|mixed|saved)|now playing|recording started/i.test(
        truthSweep.text,
      ),
    truthSweep,
  );

  /* Keyboard: the track tabs are reachable with a visible focus outline and
   * the arrow-key contract moves selection and focus together. */
  let focused = null;
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press("Tab");
    focused = await page.evaluate(() => {
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
    if (focused && focused.cls.includes("pv1-audio-track")) break;
  }
  rec(
    "keyboard: track tabs are reachable with a visible focus outline",
    focused !== null &&
      focused.cls.includes("pv1-audio-track") &&
      Number.parseFloat(focused.outlineWidth) >= 2 &&
      focused.outlineStyle === "solid",
    focused,
  );
  report.screenshots.push(
    await shot(page, "wp1-1440x900-audio-track-tab-focus"),
  );
  await page.keyboard.press("ArrowRight");
  const arrowState = await page.evaluate(() => ({
    selected: document
      .querySelector(".pv1-audio-tracks [aria-selected='true']")
      ?.textContent?.trim(),
    focusedCls:
      typeof document.activeElement?.className === "string"
        ? document.activeElement.className
        : "",
    focusedLabel: document.activeElement?.textContent?.trim(),
  }));
  rec(
    "keyboard: ArrowRight moves track selection and focus together",
    arrowState.selected === "Dialogue" &&
      arrowState.focusedCls.includes("pv1-audio-track") &&
      arrowState.focusedLabel === "Dialogue",
    arrowState,
  );
  m = await measureRegions(page, AUDIO_REGIONS);
  rec(
    "keyboard final state: no horizontal overflow",
    m.scrollWidth <= m.clientWidth && m.overflowElements.length === 0,
    m,
  );

  report.consoleIssues = consoleIssues;
  report.pageErrors = pageErrors;

  await context.close();
  await browser.close();

  /* Fail closed on the capture set itself: exactly the nine expected
   * captures, once each — a missing, duplicate, or extra name fails before
   * dimensions and hashes are even considered. */
  const setFailures = screenshotSetFailures(
    report.screenshots.map((entry) => entry.file),
  );
  const hashes = report.screenshots.map((entry) => entry.sha256);
  rec(
    "screenshots: exactly the nine expected captures, each 1440x900 with a unique SHA-256",
    setFailures.length === 0 &&
      new Set(hashes).size === hashes.length &&
      report.screenshots.every((entry) => {
        const png = fs.readFileSync(
          path.join(OUT, path.basename(entry.file)),
        );
        return (
          png.length > 8 &&
          png.readUInt32BE(16) === 1440 &&
          png.readUInt32BE(20) === 900
        );
      }),
    { count: hashes.length, setFailures },
  );

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
}

/* The browser journey runs only when this file is executed directly;
 * importing the pure set gate (for the deterministic negative regression)
 * never launches a browser. */
const isDirectRun =
  typeof process.argv[1] === "string" &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch((e) => {
    console.error("EVIDENCE FAILED", e);
    process.exit(1);
  });
}
