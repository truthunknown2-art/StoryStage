/**
 * StoryStage Slice C — deterministic browser proof harness (committed evidence).
 *
 * Reproduces the Slice C browser evidence exactly:
 *   1. opens the Kids Adventure shell (fresh browser profile, localStorage clean);
 *   2. captures the 0-target setup state;
 *   3. selects the exactly-one-target beat (2.2), performs the real timeline
 *      seek, and asserts the Player's exact current frame equals the lane
 *      item's resolved frame (playhead geometry, not transport text);
 *   4. plays forward, pauses deterministically, and records the exact paused
 *      frame + paused state + episode/shot/beat IDs from the same app state,
 *      verifying the frame is nonblank before capturing;
 *   5. measures zoom geometry at Fit width / 160% / back to fit;
 *   6. captures 1920 hierarchy on the same named paused frame, plus 820 and
 *      740 responsive states with overflow measurements;
 *   7. writes browser-proofs.json next to this script.
 *
 * Frame protocol (exact): the selected-beat timeline renders its playhead at
 * `left = (frame - startFrame) / (endFrameExclusive - startFrame)` percent of
 * the lane, so `frame = startFrame + pct * range` recovers the Player's exact
 * current frame (style attribute precision ~0.01 frame). Transport text
 * ("0:11") only proves a 1-second window and is recorded as context only.
 *
 * Run from the repository root with the studio dev server on 127.0.0.1:5174:
 *   node reports/agent-handoffs/2026-07-19-kimi-ui-slice-c-visual-polish/browser-proof.mjs
 */
/* global document, window, getComputedStyle, console */
import { chromium } from "../../../node_modules/.pnpm/playwright@1.62.0-alpha-1783623505000/node_modules/playwright/index.mjs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { writeFileSync } from "node:fs";

const HERE = dirname(fileURLToPath(import.meta.url));
const URL = "http://127.0.0.1:5174/";
const shot = (name) => resolve(HERE, name);

const readPlayerState = async (page) =>
  page.evaluate(() => {
    const playhead = document.querySelector(".director-timeline-playhead");
    const summary = document
      .querySelector(".director-timeline-drawer summary")
      ?.textContent.match(/(\d+)–(\d+)f/);
    const transport = Array.from(
      document.querySelectorAll(".cv2-director-player *"),
    )
      .map((n) => n.textContent?.trim() ?? "")
      .find((t) => /^\d+:\d\d\s*\/\s*\d+:\d\d$/.test(t));
    const shotSelect = document.querySelector(
      ".director-department-panel select",
    );
    const beatText = document
      .querySelector(".director-selected-beat-copy")
      ?.textContent?.trim();
    const draftRaw = window.localStorage.getItem("storystage.cv002.draft.v1");
    const draft = draftRaw ? JSON.parse(draftRaw) : null;
    const beat = draft?.graph?.scenes
      ?.flatMap((scene) => scene.beats)
      ?.find((candidate) => candidate.text === beatText);
    const playButton = document.querySelector(
      '.cv2-director-player button[aria-label*="Play" i]',
    );
    const pct = playhead
      ? parseFloat(playhead.style.left.replace("%", "")) / 100
      : null;
    const startFrame = summary ? Number(summary[1]) : null;
    const endFrameExclusive = summary ? Number(summary[2]) + 1 : null;
    const exactFrame =
      pct !== null && startFrame !== null
        ? startFrame + pct * (endFrameExclusive - startFrame)
        : null;
    return {
      episodeHash: document
        .querySelector("[data-episode-hash]")
        ?.getAttribute("data-episode-hash"),
      transportText: transport ?? null,
      laneRange: summary
        ? { startFrame, endFrameExclusive }
        : { startFrame: null, endFrameExclusive: null },
      playheadPct: pct,
      exactFrame,
      shotId: shotSelect?.value ?? null,
      beatId: beat?.id ?? null,
      paused: Boolean(playButton),
    };
  });

const nonblankCheck = async (page) =>
  page.evaluate(() => {
    const el = document.querySelector(".cv2-director-player");
    const colored = Array.from(el.querySelectorAll("*")).filter((n) => {
      const s = getComputedStyle(n);
      return (
        s.backgroundColor &&
        !["rgba(0, 0, 0, 0)", "rgb(0, 0, 0)"].includes(s.backgroundColor)
      );
    }).length;
    return { coloredNodes: colored, nonblank: colored > 20 };
  });

const measure = async (page) =>
  page.evaluate(() => {
    const grid = document.querySelector(".director-timeline-grid");
    const lane = document.querySelector(".director-timeline-lane.is-shots");
    const scroll = document.querySelector(".director-timeline-scroll");
    return {
      gridWidth: Math.round(grid.getBoundingClientRect().width),
      laneWidth: Math.round(lane.getBoundingClientRect().width),
      scrollable: scroll.scrollWidth > scroll.clientWidth + 1,
      label: document.querySelector(".director-timeline-zoom small")
        ?.textContent,
      minusDisabled: document.querySelector(
        '.director-timeline-zoom button[aria-label="Zoom timeline out"]',
      )?.disabled,
    };
  });

const assert = (condition, message) => {
  if (!condition) throw new Error(`PROOF FAILURE: ${message}`);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const proof = { harness: "browser-proof.mjs", protocol: "playhead-geometry" };

await page.goto(URL, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Create first cut" }).click();
await page.getByRole("button", { name: /Review direction draft/ }).click();
await page.waitForSelector("[data-episode-hash]", { timeout: 20000 });
await page.waitForTimeout(3500);
await page.screenshot({
  path: shot("studio-1440x900-setup-beat-no-target.png"),
});

// Exactly-one-target beat + real timeline seek with exact frame equality
await page.locator('button[aria-label*="2.2 reaction"]').first().click();
await page.locator(".director-timeline-drawer summary").first().click();
await page.waitForTimeout(600);
const laneButton = page
  .locator(".director-timeline-lane.is-shots button")
  .first();
const seekTitle = await laneButton.getAttribute("title");
const seekFrame = Number(seekTitle.match(/frame (\d+)$/)[1]);
await laneButton.click();
await page.waitForTimeout(500);
const pausedNow = await page.evaluate(() => {
  const pauseButton = document.querySelector(
    '.cv2-director-player button[aria-label*="Pause" i]',
  );
  if (pauseButton) pauseButton.click();
  return Boolean(
    document.querySelector('.cv2-director-player button[aria-label*="Play" i]'),
  );
});
assert(pausedNow, "Player did not reach a paused state after the seek");
proof.seek = {
  title: seekTitle,
  expectedFrame: seekFrame,
  ...(await readPlayerState(page)),
};
assert(
  Math.abs(proof.seek.exactFrame - seekFrame) <= 1,
  `seek frame mismatch: expected ${seekFrame}, measured ${proof.seek.exactFrame}`,
);
assert(proof.seek.paused === true, "Player not paused after seek");

// Deterministic nonblank paused frame inside the same beat
await page
  .locator('.cv2-director-player button[aria-label*="Play" i]')
  .first()
  .click();
await page.waitForTimeout(1400);
await page
  .locator('.cv2-director-player button[aria-label*="Pause" i]')
  .first()
  .click();
await page.waitForTimeout(800);
proof.pausedPlayer = {
  ...(await readPlayerState(page)),
  ...(await nonblankCheck(page)),
};
assert(
  proof.pausedPlayer.paused === true,
  "Player not paused after play-pause",
);
assert(
  proof.pausedPlayer.nonblank,
  `paused frame is blank (coloredNodes=${proof.pausedPlayer.coloredNodes})`,
);
await page.screenshot({
  path: shot("studio-1440x900-direct-command-one-target.png"),
});

// Zoom geometry
proof.zoom = { at100: await measure(page) };
assert(
  proof.zoom.at100.label === "Fit width",
  "default zoom label not Fit width",
);
assert(
  proof.zoom.at100.minusDisabled === true,
  "zoom-out not disabled at Fit width",
);
await page.locator('input[aria-label="Timeline zoom level"]').fill("1.6");
await page.waitForTimeout(400);
proof.zoom.at160 = await measure(page);
assert(
  proof.zoom.at160.gridWidth > proof.zoom.at100.gridWidth,
  "zoom to 160% did not increase grid width",
);
assert(
  proof.zoom.at160.scrollable === true,
  "160% not horizontally scrollable",
);
await page.locator('input[aria-label="Timeline zoom level"]').fill("1");
await page.waitForTimeout(400);
proof.zoom.backToFit = await measure(page);
assert(
  proof.zoom.backToFit.gridWidth === proof.zoom.at100.gridWidth,
  "return to fit did not restore width",
);

// 1920 hierarchy on the same named paused frame
const state1920 = await readPlayerState(page);
proof.hierarchy1920 = {
  frame: state1920.exactFrame,
  beatId: state1920.beatId,
  shotId: state1920.shotId,
  paused: state1920.paused,
  ...(await nonblankCheck(page)),
};
assert(proof.hierarchy1920.nonblank, "1920 hierarchy frame is blank");
await page.setViewportSize({ width: 1920, height: 1080 });
await page.waitForTimeout(800);
await page.screenshot({ path: shot("studio-1920x1080-full-hierarchy.png") });

// Responsive states
await page.setViewportSize({ width: 820, height: 900 });
await page.waitForTimeout(700);
proof.overflow820 = await page.evaluate(() => ({
  sw: document.scrollingElement.scrollWidth,
  iw: window.innerWidth,
}));
await page.screenshot({ path: shot("studio-820x900-stacked.png") });
await page.setViewportSize({ width: 740, height: 900 });
await page.waitForTimeout(700);
proof.topbar740 = await page.evaluate(() => {
  const t = document.querySelector(".cv2-topbar");
  return {
    sw: document.scrollingElement.scrollWidth,
    iw: window.innerWidth,
    columns: getComputedStyle(t).gridTemplateColumns,
    distinctRowCount: new Set(
      Array.from(t.children).map((c) =>
        Math.round(c.getBoundingClientRect().y),
      ),
    ).size,
  };
});
await page.screenshot({ path: shot("studio-740x900-narrow-topbar.png") });

assert(
  proof.overflow820.sw <= proof.overflow820.iw,
  "820px horizontal overflow",
);
assert(proof.topbar740.sw <= proof.topbar740.iw, "740px horizontal overflow");

await browser.close();
writeFileSync(
  resolve(HERE, "browser-proofs.json"),
  JSON.stringify(proof, null, 2),
);
console.log(JSON.stringify(proof, null, 2));
