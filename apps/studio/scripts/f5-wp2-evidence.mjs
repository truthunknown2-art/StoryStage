/* global console, document, getComputedStyle, process, window */
/* F5-WP2 reproducible browser evidence capture.
 * Exercises the real Product v1 Projects → Create → shared proposal review →
 * Studio → Audio workspace → Narration take-management path at 1440x900
 * against the dev server on 127.0.0.1:5195, with console/pageerror listeners
 * attached before any navigation. Captures the armed/recording walkthrough
 * with its no-capture truth, the simulated permission-denied and
 * missing-device recoveries, a take-review decision with its no-playback
 * truth, the invalid import result with its no-file-read truth, the
 * trim/gain dirty state with the unsaved-change decision, and a scope change
 * proving no stale take leaks. Every screenshot and the machine-readable
 * report are hashed with SHA-256.
 *
 * The capture set is fail-closed: the report must contain exactly the ten
 * expected capture names in EXPECTED_SCREENSHOT_NAMES, once each — a
 * missing, duplicate, or extra capture fails the gate. The pure set check is
 * exported so the deterministic negative regression
 * (src/product-v1/f5-wp2-evidence-gate.test.ts) can prove the gate fails for
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
  "2026-07-22-kimi-f5-wp2-narration-take-management",
  "screenshots",
);
const SAMPLE_SCRIPT = [
  "Lila lives in a quiet village at the edge of a deep, whispering forest.",
  "One evening, she finds a small lantern glowing under the roots of an old tree.",
  "The light flickers, and a soft rustle in the bushes makes her pause.",
  "Summoning her courage, Lila picks up the lantern and follows the glow.",
  "It leads her across a stream and into a hidden glade filled with fireflies.",
].join("\n\n");

/** The exact ten captures this package requires, in journey order. The
 * evidence gate fails closed unless the report contains exactly this set,
 * once each — no missing, duplicate, or extra capture. */
export const EXPECTED_SCREENSHOT_NAMES = Object.freeze([
  "wp2-1440x900-projects",
  "wp2-1440x900-studio-board",
  "wp2-1440x900-audio-narration-idle",
  "wp2-1440x900-recording-walkthrough",
  "wp2-1440x900-permission-denied",
  "wp2-1440x900-missing-device",
  "wp2-1440x900-take-review-decision",
  "wp2-1440x900-import-invalid-result",
  "wp2-1440x900-trim-gain-dirty-unsaved",
  "wp2-1440x900-scope-change-no-leak",
]);

/** Pure fail-closed set check over captured `screenshots/<name>.png`
 * entries: returns one message per missing, duplicate, or extra capture. An
 * empty result means the entries hold exactly the ten expected captures,
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
  "[data-testid='pv1-takes']",
  ".pv1-takes-columns",
  ".pv1-takes-recorder",
  ".pv1-takes-list",
  ".pv1-takes-review",
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

const takeState = () => {
  const root = document.querySelector("[data-testid='pv1-takes']");
  const recorder = root?.querySelector(".pv1-takes-recorder");
  const list = root?.querySelector(".pv1-takes-list");
  const reviewPanel = root?.querySelector(".pv1-takes-review");
  return {
    hidden: root?.hasAttribute("hidden") ?? null,
    badge: root?.querySelector("[data-testid='pv1-takes-state']")?.textContent ?? null,
    label:
      root?.querySelector(".pv1-takes-header .pv1-badge")?.textContent ?? null,
    recorderText: recorder?.textContent ?? "",
    listText: list?.textContent ?? "",
    reviewText: reviewPanel?.textContent ?? "",
    rootText: root?.textContent ?? "",
    takeCards: list?.querySelectorAll(".pv1-takes-card").length ?? -1,
    selectedCard:
      list?.querySelector(".pv1-takes-card.is-selected strong")?.textContent ??
      null,
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
    task: "F5-WP2-NARRATION-TAKE-MANAGEMENT",
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
  report.screenshots.push(await shot(page, "wp2-1440x900-projects"));

  await page.getByRole("button", { name: "New project" }).first().click();
  await page
    .getByRole("heading", { name: /Start a new Kids Story/ })
    .waitFor();
  await page.getByRole("button", { name: /Paste a script/ }).click();
  await page.getByRole("textbox", { name: "Script" }).fill(SAMPLE_SCRIPT);
  await page.getByRole("button", { name: "Create proposal" }).click();
  await page.getByRole("article", { name: "Review proposal" }).waitFor();

  await page.getByRole("button", { name: /Enter Studio/ }).click();
  await page.waitForSelector("[data-testid='pv1-studio']");
  await page.evaluate(() => window.scrollTo(0, 0));
  report.screenshots.push(await shot(page, "wp2-1440x900-studio-board"));

  /* Audio workspace arrival: the F5-WP1 surface is intact and the take
   * panel opens on Narration with the persistent prototype truth. */
  await page.getByRole("button", { name: "Audio", exact: true }).click();
  await page.waitForSelector("[data-testid='pv1-audio']");
  let m = await measureRegions(page, AUDIO_REGIONS);
  rec(
    "audio arrival: no horizontal overflow",
    m.scrollWidth <= m.clientWidth && m.overflowElements.length === 0,
    m,
  );
  let state = await page.evaluate(takeState);
  rec(
    "audio arrival: F5-WP1 planning cards and inspector truth remain intact",
    state.hidden === false &&
      (await page.evaluate(() => {
        const panel = document.querySelector(
          "[data-testid='pv1-audio'] .pv1-audio-list:not([hidden])",
        );
        const inspector = document.querySelector(".pv1-audio-inspector");
        return (
          panel !== null &&
          panel.textContent.includes(
            "2 planned takes in this scene/beat scope",
          ) &&
          panel.textContent.includes(
            "Local demo planning card — no audio exists",
          ) &&
          inspector !== null &&
          inspector.textContent.includes(
            "Take A · Morning welcome narration",
          ) &&
          inspector.textContent.includes(
            "Guide timing — provisional planning only, not final timing",
          )
        );
      })),
    {},
  );
  rec(
    "audio arrival: take panel idle with persistent no-capture/no-file/no-playback truth",
    state.badge === "No recording walkthrough in progress" &&
      state.label ===
        "Local prototype — no audio is captured, imported, or played" &&
      state.rootText.includes(
        "no microphone, permission prompt, device, file, audio bytes, playback, waveform, or persistence exists",
      ) &&
      state.listText.includes("No prototype takes in this scene/beat scope") &&
      state.reviewText.includes(
        "No prototype take selected — this scope has no prototype takes.",
      ),
    state,
  );
  /* Bring the take panel into view so the idle capture visibly shows the
   * idle recorder, empty take list, and empty review state. */
  await page.evaluate(() => {
    document
      .querySelector("[data-testid='pv1-takes']")
      ?.scrollIntoView({ block: "start" });
  });
  report.screenshots.push(await shot(page, "wp2-1440x900-audio-narration-idle"));

  /* Recording walkthrough: arm and record with visible no-capture truth. */
  await page.getByRole("button", { name: "Arm take walkthrough" }).click();
  state = await page.evaluate(takeState);
  rec(
    "walkthrough: armed state is an honest local UI walkthrough",
    state.badge === "Armed — local UI walkthrough only" &&
      state.recorderText.includes("there is no device to arm"),
    state,
  );
  await page
    .getByRole("button", { name: "Start recording walkthrough" })
    .click();
  state = await page.evaluate(takeState);
  rec(
    "walkthrough: recording state says no audio is captured and no media exists",
    state.badge ===
      "Recording walkthrough in progress — no audio is captured" &&
      state.recorderText.includes("nothing is recorded") &&
      !/now playing|recording started|has been recorded/i.test(state.rootText),
    state,
  );
  m = await measureRegions(page, AUDIO_REGIONS);
  rec(
    "walkthrough: no horizontal overflow while recording",
    m.scrollWidth <= m.clientWidth && m.overflowElements.length === 0,
    m,
  );
  report.screenshots.push(await shot(page, "wp2-1440x900-recording-walkthrough"));

  /* Cancel and retry recovery, then the permission-denied simulation. */
  await page.getByRole("button", { name: "Cancel walkthrough" }).click();
  state = await page.evaluate(takeState);
  rec(
    "walkthrough: cancel ends in an explicit cancelled state with recovery",
    state.badge === "Recording walkthrough cancelled" &&
      state.recorderText.includes("no audio was captured and nothing was created"),
    state,
  );
  await page.getByRole("button", { name: "Arm again" }).click();
  await page.getByRole("button", { name: "Simulate permission denied" }).click();
  state = await page.evaluate(takeState);
  rec(
    "permission denied: deterministic simulation with recovery, never a browser permission request",
    state.badge === "Microphone permission denied — simulated" &&
      state.recorderText.includes(
        "The browser was never asked for device access",
      ) &&
      state.recorderText.includes("Arm again") &&
      state.recorderText.includes("Dismiss"),
    state,
  );
  report.screenshots.push(await shot(page, "wp2-1440x900-permission-denied"));

  /* Missing-device simulation, then a full successful walkthrough. */
  await page.getByRole("button", { name: "Arm again" }).click();
  await page.getByRole("button", { name: "Simulate missing device" }).click();
  state = await page.evaluate(takeState);
  rec(
    "missing device: deterministic simulation with recovery, never device enumeration",
    state.badge === "No microphone found — simulated" &&
      state.recorderText.includes("No device was enumerated"),
    state,
  );
  report.screenshots.push(await shot(page, "wp2-1440x900-missing-device"));

  await page.getByRole("button", { name: "Arm again" }).click();
  await page
    .getByRole("button", { name: "Start recording walkthrough" })
    .click();
  await page.getByRole("button", { name: "Stop walkthrough" }).click();
  state = await page.evaluate(takeState);
  rec(
    "walkthrough: stopped state is a completed UI walkthrough, never a recording success",
    state.badge === "Walkthrough stopped — review the prototype result" &&
      state.recorderText.includes(
        "no audio was captured and no media exists",
      ),
    state,
  );
  await page.getByRole("button", { name: "Keep as prototype take" }).click();
  state = await page.evaluate(takeState);
  rec(
    "take review: kept walkthrough take is session-only prototype metadata in the exact scope",
    state.takeCards === 1 &&
      state.selectedCard === "Prototype take 1 · recording walkthrough" &&
      state.listText.includes(
        "1 prototype take in this scene/beat scope — none is audio",
      ) &&
      state.reviewText.includes(
        "no microphone, stream, or audio was used or captured",
      ) &&
      state.reviewText.includes("Declared 70s") &&
      state.reviewText.includes(
        "In review — session-only prototype metadata, no audio exists",
      ),
    state,
  );

  /* Take-review decisions: audition marks review without playback; keep
   * stores session metadata only. */
  await page
    .getByRole("button", { name: "Audition — review only, no playback" })
    .click();
  state = await page.evaluate(takeState);
  rec(
    "take decision: audition is a review mark with visible no-playback truth",
    state.reviewText.includes(
      "In audition review — marked for comparison only; no audio plays, because no audio exists.",
    ) && !/now playing/i.test(state.rootText),
    state,
  );
  await page
    .getByRole("button", { name: "Keep as session metadata" })
    .click();
  state = await page.evaluate(takeState);
  rec(
    "take decision: keep stores session-only prototype metadata, still no audio",
    state.reviewText.includes(
      "Kept as session-only prototype metadata — still no audio exists",
    ),
    state,
  );
  report.screenshots.push(await shot(page, "wp2-1440x900-take-review-decision"));

  /* Import walkthrough: chooser, invalid result, then empty and cancelled
   * results, all without any file API. */
  await page.getByRole("button", { name: "Open import chooser" }).click();
  const chooserVisible = await page.evaluate(() => {
    const dialog = document.querySelector("[role='dialog']");
    return (
      dialog !== null &&
      dialog.textContent.includes(
        "Local prototype — no audio is captured, imported, or played",
      ) &&
      dialog.textContent.includes("never opens a file picker") &&
      dialog.textContent.includes("morning-welcome-read.wav") &&
      dialog.textContent.includes("narration-notes.txt")
    );
  });
  rec(
    "import: chooser lists declared fixture metadata with no-file truth",
    chooserVisible,
    {},
  );
  await page
    .getByRole("button", { name: /narration-notes\.txt/ })
    .click();
  state = await page.evaluate(takeState);
  rec(
    "import: invalid-file result names the fixture and claims no import, open, or read",
    state.recorderText.includes(
      "“narration-notes.txt” is not an audio file StoryStage can plan with",
    ) &&
      state.recorderText.includes("Nothing was imported, opened, or read.") &&
      state.takeCards === 1,
    state,
  );
  report.screenshots.push(await shot(page, "wp2-1440x900-import-invalid-result"));

  await page.getByRole("button", { name: "Dismiss result" }).click();
  await page.getByRole("button", { name: "Open import chooser" }).click();
  await page
    .getByRole("button", { name: "None of these — close with nothing chosen" })
    .click();
  state = await page.evaluate(takeState);
  rec(
    "import: empty result claims nothing chosen, imported, opened, or read",
    state.recorderText.includes(
      "Import walkthrough result — no file was chosen. Nothing was imported, opened, or read.",
    ),
    state,
  );
  await page.getByRole("button", { name: "Dismiss result" }).click();
  await page.getByRole("button", { name: "Open import chooser" }).click();
  await page.getByRole("button", { name: "Cancel import" }).click();
  state = await page.evaluate(takeState);
  rec(
    "import: cancelled result claims nothing chosen, imported, opened, or read",
    state.recorderText.includes(
      "Import walkthrough cancelled — nothing was chosen, imported, opened, or read.",
    ),
    state,
  );
  await page.getByRole("button", { name: "Dismiss result" }).click();
  await page.getByRole("button", { name: "Open import chooser" }).click();
  await page
    .getByRole("button", { name: /morning-welcome-read\.wav/ })
    .click();
  state = await page.evaluate(takeState);
  rec(
    "import: picked fixture becomes session-only metadata with no file read",
    state.recorderText.includes(
      "became session-only prototype take metadata. No file was opened, read, decoded, or stored",
    ) &&
      state.takeCards === 2 &&
      state.selectedCard ===
        "Prototype take 2 · import fixture “morning-welcome-read.wav”",
    state,
  );
  await page.getByRole("button", { name: "Dismiss result" }).click();

  /* Trim/gain dirty state and the unsaved-change decision. */
  await page
    .getByRole("button", {
      name: /Prototype take 1 · recording walkthrough/,
    })
    .click();
  await page
    .getByRole("button", { name: "Increase trim start by 1 second" })
    .click();
  await page
    .getByRole("button", { name: "Increase trim start by 1 second" })
    .click();
  await page
    .getByRole("button", { name: "Increase gain by 1 decibel" })
    .click();
  state = await page.evaluate(takeState);
  rec(
    "trim/gain: exact current values, bounds, and dirty state over prototype metadata only",
    state.reviewText.includes(
      "Current draft: trim 2s–70s of a declared 70s, gain +1 dB.",
    ) &&
      state.reviewText.includes("Unsaved prototype edits") &&
      state.reviewText.includes("Bounds 0s–69s") &&
      state.reviewText.includes("Bounds -12 dB–+12 dB") &&
      state.reviewText.includes(
        "no audio was decoded or measured",
      ),
    state,
  );
  await page
    .getByRole("button", {
      name: /Prototype take 2 · import fixture/,
    })
    .click();
  const unsavedVisible = await page.evaluate(() => {
    const dialog = document.querySelector("[role='alertdialog']");
    return (
      dialog !== null &&
      dialog.textContent.includes("Unsaved prototype edits") &&
      dialog.textContent.includes(
        "Switching the selected take would leave this take while its trim/gain draft has unkept edits",
      ) &&
      dialog.textContent.includes(
        "Nothing is ever saved to a project, file, or device.",
      ) &&
      dialog.textContent.includes("Stay — keep editing") &&
      dialog.textContent.includes("Discard draft edits") &&
      dialog.textContent.includes("Keep edits as session metadata")
    );
  });
  rec(
    "unsaved change: leaving a dirty take requires an explicit stay/discard/keep decision",
    unsavedVisible,
    {},
  );
  report.screenshots.push(await shot(page, "wp2-1440x900-trim-gain-dirty-unsaved"));

  await page
    .getByRole("button", { name: "Discard draft edits" })
    .click();
  state = await page.evaluate(takeState);
  rec(
    "unsaved change: discard drops only the draft and selects the other take",
    state.selectedCard ===
      "Prototype take 2 · import fixture “morning-welcome-read.wav”" &&
      state.reviewText.includes("Draft matches the kept session values."),
    state,
  );

  /* Scope change: no stale take leaks across beats, and each scope keeps
   * exactly its own session takes. */
  await page.getByLabel("Audio beat scope").selectOption("1");
  state = await page.evaluate(takeState);
  rec(
    "scope change: no stale take leaks into the new beat scope",
    state.takeCards === 0 &&
      state.listText.includes("No prototype takes in this scene/beat scope") &&
      !state.listText.includes("Prototype take 1") &&
      !state.reviewText.includes("Prototype take 1") &&
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
  report.screenshots.push(await shot(page, "wp2-1440x900-scope-change-no-leak"));
  await page.getByLabel("Audio beat scope").selectOption("0");
  state = await page.evaluate(takeState);
  rec(
    "scope change: returning restores exactly this scope's own takes",
    state.takeCards === 2 &&
      state.listText.includes("Prototype take 1 · recording walkthrough") &&
      state.listText.includes("Prototype take 2 · import fixture"),
    state,
  );

  /* Keyboard reachability: the take-management controls are reachable with a
   * visible focus outline. */
  let focused = null;
  for (let i = 0; i < 80; i++) {
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
    if (focused && focused.label === "Arm take walkthrough") break;
  }
  rec(
    "keyboard: take-management controls are reachable with a visible focus outline",
    focused !== null &&
      focused.label === "Arm take walkthrough" &&
      Number.parseFloat(focused.outlineWidth) >= 2 &&
      focused.outlineStyle === "solid",
    focused,
  );

  /* Truth sweep across the whole audio surface: no state claims a device,
   * file, playback, waveform, or persistence success. */
  const truthSweep = await page.evaluate(() => {
    const root = document.querySelector("[data-testid='pv1-audio']");
    return {
      text: root?.textContent ?? "",
      disabledActions: [
        ...(root?.querySelectorAll(".pv1-audio-actions button") ?? []),
      ].every((button) => button.disabled),
    };
  });
  rec(
    "truth sweep: no device/file/playback/persistence success claim exists anywhere",
    truthSweep.disabledActions &&
      !/successfully|has been (recorded|imported|decoded|played|mixed|saved)|now playing|recording started/i.test(
        truthSweep.text,
      ) &&
      truthSweep.text.includes(
        "Local prototype — no audio is captured, imported, or played",
      ),
    { disabledActions: truthSweep.disabledActions },
  );
  m = await measureRegions(page, AUDIO_REGIONS);
  rec(
    "final state: no horizontal overflow",
    m.scrollWidth <= m.clientWidth && m.overflowElements.length === 0,
    m,
  );

  report.consoleIssues = consoleIssues;
  report.pageErrors = pageErrors;

  await context.close();
  await browser.close();

  /* Fail closed on the capture set itself: exactly the ten expected
   * captures, once each — a missing, duplicate, or extra name fails before
   * dimensions and hashes are even considered. */
  const setFailures = screenshotSetFailures(
    report.screenshots.map((entry) => entry.file),
  );
  const hashes = report.screenshots.map((entry) => entry.sha256);
  rec(
    "screenshots: exactly the ten expected captures, each 1440x900 with a unique SHA-256",
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
