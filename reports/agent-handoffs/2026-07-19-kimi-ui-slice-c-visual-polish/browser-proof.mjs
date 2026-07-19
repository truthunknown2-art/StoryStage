/**
 * StoryStage Slice C — deterministic browser proof harness (committed evidence).
 *
 * Protocol: Player-ref exact-frame. The Studio proof surface (data-proof-frame
 * / data-proof-playing on the Player container) reflects the actual PlayerRef
 * state from real Player events, never the optimistic timeline CSS state.
 *
 * Steps:
 *   1. opens the Kids Adventure shell (fresh browser profile, localStorage clean);
 *   2. captures the 0-target setup state;
 *   3. selects the exactly-one-target beat (2.2), performs the real timeline
 *      seek, and waits for the Player-ref observation to report the exact
 *      integer frame (zero tolerance), then pauses;
 *   4. locates the rendered composition viewport inside the Player (largest
 *      button-free rectangle inside .__remotion-player) and proves the clip
 *      does not intersect the transport-controls rectangle;
 *   5. clips that viewport alone, persists the PNG, and records SHA-256,
 *      integer bounds, total/nonblack pixel counts and ratio, luminance mean,
 *      variance/stddev, unique-color count, and an explicit uniform/blank
 *      rejection result (all pixels, no sampling);
 *   6. if the sought frame's composition is uniform/blank, falls back to the
 *      first nonblank exact resolved event frame and names it — never weakens
 *      the thresholds, never counts chrome;
 *   7. captures 1440 + 1920 screenshots only while the Player-ref still
 *      reports that same exact paused frame;
 *   8. measures zoom geometry at Fit width / 160% / back to fit, and the 820 /
 *      740 responsive states with overflow measurements;
 *   9. writes browser-proofs.json next to this script.
 *
 * Pixel rules (documented): a pixel is black when max(r,g,b) <= 8. A frame is
 * rejected as uniform/blank when stddev <= 4 AND uniqueColors16 <= 4 — a
 * uniform dark wash fails exactly like a uniform black one.
 *
 * Run from the repository root with the studio dev server on 127.0.0.1:5174:
 *   node reports/agent-handoffs/2026-07-19-kimi-ui-slice-c-visual-polish/browser-proof.mjs
 */
/* global document, window, getComputedStyle, console, Image */
import { chromium } from "../../../node_modules/.pnpm/playwright@1.62.0-alpha-1783623505000/node_modules/playwright/index.mjs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const HERE = dirname(fileURLToPath(import.meta.url));
const URL = "http://127.0.0.1:5174/";
const shot = (name) => resolve(HERE, name);

const assert = (condition, message) => {
  if (!condition) throw new Error(`PROOF FAILURE: ${message}`);
};

const readPlayerState = async (page) =>
  page.evaluate(() => {
    const container = document.querySelector(".cv2-director-player");
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
    return {
      episodeHash: document
        .querySelector("[data-episode-hash]")
        ?.getAttribute("data-episode-hash"),
      exactFrame: Number(container?.getAttribute("data-proof-frame")),
      paused: container?.getAttribute("data-proof-playing") === "false",
      shotId: shotSelect?.value ?? null,
      beatId: beat?.id ?? null,
    };
  });

const waitForPlayerFrame = (page, frame) =>
  page.waitForFunction(
    (expected) =>
      document
        .querySelector(".cv2-director-player")
        ?.getAttribute("data-proof-frame") === String(expected),
    frame,
    { timeout: 10000 },
  );

const pausePlayer = async (page) => {
  await page.evaluate(() => {
    const pauseButton = document.querySelector(
      '.cv2-director-player button[aria-label*="Pause" i]',
    );
    if (pauseButton) pauseButton.click();
  });
  await page.waitForFunction(
    () =>
      document
        .querySelector(".cv2-director-player")
        ?.getAttribute("data-proof-playing") === "false",
    undefined,
    { timeout: 5000 },
  );
};

// Locate the rendered composition viewport: the stage .__remotion-player
// element itself. In the pinned Remotion version that subtree is pure
// composition — the transport controls ("Play video", "Mute sound",
// "Enter Fullscreen") are siblings inside .cv2-director-player, never
// descendants — which the purity assertion verifies on every run.
const locateCompositionViewport = async (page) =>
  page.evaluate(() => {
    const stage = document.querySelector(".cv2-director-player");
    const root = stage?.querySelector(".__remotion-player");
    if (!stage || !root) return { error: "no stage .__remotion-player found" };
    const playerRect = root.getBoundingClientRect();

    // The Remotion transport chrome (time label, progress/volume, buttons)
    // OVERLAYS the bottom of the player box from sibling containers — it is
    // not a DOM descendant of .__remotion-player, but its pixels cover the
    // composition's lower strip. The pure composition viewport is the player
    // box above that overlay strip.
    const chromeRects = [];
    stage.querySelectorAll("button").forEach((node) => {
      chromeRects.push(node.getBoundingClientRect());
    });
    stage.querySelectorAll("span, div, p").forEach((node) => {
      if (
        node.children.length === 0 &&
        /\d+:\d\d/.test(node.textContent.trim()) &&
        node.textContent.trim().length < 20
      )
        chromeRects.push(node.getBoundingClientRect());
    });
    stage
      .querySelectorAll('input[type="range"], [role="slider"]')
      .forEach((node) => chromeRects.push(node.getBoundingClientRect()));
    const overlayTop = chromeRects.length
      ? Math.min(...chromeRects.map((rect) => rect.top))
      : null;
    const stripCoversPlayerBottom =
      overlayTop !== null &&
      overlayTop > playerRect.top &&
      overlayTop < playerRect.bottom;
    const chromeStrip = stripCoversPlayerBottom
      ? {
          x: playerRect.x,
          y: overlayTop,
          width: playerRect.width,
          height: playerRect.bottom - overlayTop,
          area: playerRect.width * (playerRect.bottom - overlayTop),
        }
      : null;
    const viewport = {
      x: playerRect.x,
      y: playerRect.y,
      width: playerRect.width,
      height: chromeStrip ? chromeStrip.y - playerRect.y : playerRect.height,
      area: 0,
      buttonDescendants: root.querySelectorAll("button").length,
    };
    viewport.area = viewport.width * viewport.height;
    let controls = null;
    stage.querySelectorAll("div").forEach((node) => {
      if (node.querySelectorAll("button").length === 0) return;
      const rect = node.getBoundingClientRect();
      const area = rect.width * rect.height;
      if (!controls || area < controls.area)
        controls = {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          area,
        };
    });
    return { viewport, controls, chromeStrip };
  });

const intersects = (a, b) =>
  a.x < b.x + b.width &&
  b.x < a.x + a.width &&
  a.y < b.y + b.height &&
  b.y < a.y + a.height;

// Full-pixel analysis of the clipped PNG, decoded in-page. Deterministic:
// every pixel, row-major. Black pixel: max(r,g,b) <= 8.
const analyzeClip = async (page, pngBuffer) =>
  page.evaluate(
    async (dataUrl) => {
      const img = new Image();
      await new Promise((resolveImg, rejectImg) => {
        img.onload = resolveImg;
        img.onerror = rejectImg;
        img.src = dataUrl;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const context = canvas.getContext("2d");
      context.drawImage(img, 0, 0);
      const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const totalPixels = canvas.width * canvas.height;
      let nonblackPixels = 0;
      let sum = 0;
      let sumSq = 0;
      const colors = new Set();
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        sum += luminance;
        sumSq += luminance * luminance;
        if (Math.max(r, g, b) > 8) nonblackPixels += 1;
        colors.add(((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4));
      }
      const meanLuminance = sum / totalPixels;
      const variance = sumSq / totalPixels - meanLuminance * meanLuminance;
      const stddev = Math.sqrt(variance);
      return {
        totalPixels,
        nonblackPixels,
        nonblackRatio: Number((nonblackPixels / totalPixels).toFixed(4)),
        meanLuminance: Number(meanLuminance.toFixed(2)),
        variance: Number(variance.toFixed(2)),
        stddev: Number(stddev.toFixed(2)),
        uniqueColors16: colors.size,
        uniformBlank: stddev <= 4 && colors.size <= 4,
      };
    },
    `data:image/png;base64,${pngBuffer.toString("base64")}`,
  );

// Clip the composition viewport, persist the PNG, and return the full record.
// The transport controls unmount when idle, so hover the Player first: the
// non-intersection proof must hold while the controls are actually visible.
const captureCompositionEvidence = async (page, name) => {
  await page.locator(".__remotion-player").hover();
  await page.waitForTimeout(500);
  const { viewport, controls, chromeStrip } =
    await locateCompositionViewport(page);
  assert(viewport, "could not locate the composition viewport");
  assert(controls, "could not locate the transport controls rectangle");
  assert(
    viewport.height > 20,
    `composition viewport collapsed after chrome exclusion: ${JSON.stringify(viewport)}`,
  );
  const bounds = {
    x: Math.round(viewport.x),
    y: Math.round(viewport.y),
    width: Math.round(viewport.width),
    height: Math.round(viewport.height),
  };
  const controlsBounds = {
    x: Math.round(controls.x),
    y: Math.round(controls.y),
    width: Math.round(controls.width),
    height: Math.round(controls.height),
  };
  assert(
    viewport.buttonDescendants === 0,
    `composition subtree contains ${viewport.buttonDescendants} button descendants (controls leaked into .__remotion-player)`,
  );
  assert(
    !intersects(bounds, controlsBounds),
    `composition clip intersects controls: ${JSON.stringify({ bounds, controlsBounds })}`,
  );
  const pngBuffer = await page.screenshot({ clip: bounds });
  const artifactName = `composition-viewport-${name}.png`;
  writeFileSync(shot(artifactName), pngBuffer);
  const stats = await analyzeClip(page, pngBuffer);
  return {
    artifact: artifactName,
    sha256: createHash("sha256").update(pngBuffer).digest("hex"),
    bounds,
    controlsBounds,
    chromeStrip: chromeStrip
      ? {
          x: Math.round(chromeStrip.x),
          y: Math.round(chromeStrip.y),
          width: Math.round(chromeStrip.width),
          height: Math.round(chromeStrip.height),
        }
      : null,
    intersectsControls: false,
    buttonDescendantsInViewport: viewport.buttonDescendants,
    ...stats,
  };
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const proof = {
  harness: "browser-proof.mjs",
  protocol: "player-ref-exact-frame",
  pixelRules: {
    blackPixel: "max(r,g,b) <= 8",
    uniformBlankRejection: "stddev <= 4 AND uniqueColors16 <= 4",
    sampling: "all pixels (no sampling)",
  },
};

await page.goto(URL, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Create first cut" }).click();
await page.getByRole("button", { name: /Review direction draft/ }).click();
await page.waitForSelector("[data-episode-hash]", { timeout: 20000 });
await page.waitForTimeout(3500);
await page.screenshot({
  path: shot("studio-1440x900-setup-beat-no-target.png"),
});

// Exactly-one-target beat + real timeline seek to the named shot start.
await page.locator('button[aria-label*="2.2 reaction"]').first().click();
await page.locator(".director-timeline-drawer summary").first().click();
await page.waitForTimeout(600);
const shotsLaneButton = page
  .locator(".director-timeline-lane.is-shots button")
  .first();
const shotTitle = await shotsLaneButton.getAttribute("title");
const shotFrame = Number(shotTitle.match(/frame (\d+)$/)[1]);
await shotsLaneButton.click();
await waitForPlayerFrame(page, shotFrame);
await pausePlayer(page);
proof.seek = {
  title: shotTitle,
  expectedFrame: shotFrame,
  ...(await readPlayerState(page)),
};
assert(
  proof.seek.exactFrame === shotFrame,
  `Player-ref did not report exactly ${shotFrame}: ${JSON.stringify(proof.seek)}`,
);
assert(proof.seek.paused === true, "Player-ref does not report paused");

// Composition-viewport evidence at the sought frame; fall back to the first
// nonblank exact resolved event frame if it is genuinely uniform/blank.
let evidence = await captureCompositionEvidence(page, `frame-${shotFrame}`);
let proofFrame = shotFrame;
let frameSource = { kind: "shot", title: shotTitle };
if (evidence.uniformBlank) {
  const eventButtons = page.locator(".director-timeline-lane.is-events button");
  const count = await eventButtons.count();
  let found = null;
  for (let index = 0; index < count; index += 1) {
    const button = eventButtons.nth(index);
    const title = await button.getAttribute("title");
    const frame = Number(title.match(/frame (\d+)$/)[1]);
    await button.click();
    await waitForPlayerFrame(page, frame);
    await pausePlayer(page);
    const candidate = await captureCompositionEvidence(page, `frame-${frame}`);
    if (!candidate.uniformBlank) {
      found = { frame, title, candidate };
      break;
    }
  }
  assert(
    found,
    `no nonblank exact frame found: shot frame ${shotFrame} and ${count} event frames are all uniform/blank`,
  );
  evidence = found.candidate;
  proofFrame = found.frame;
  frameSource = { kind: "event", title: found.title };
}
proof.composition = {
  frame: proofFrame,
  frameSource,
  ...evidence,
};
assert(
  !proof.composition.uniformBlank,
  `composition is uniform/blank at exact frame ${proofFrame}: ${JSON.stringify(proof.composition)}`,
);

// Captures happen only while the Player-ref still reports that exact paused
// frame — no wall-clock playing.
const state1440 = await readPlayerState(page);
assert(
  state1440.exactFrame === proofFrame && state1440.paused,
  `frame drifted before 1440 capture: ${JSON.stringify(state1440)}`,
);
proof.pausedPlayer = state1440;
await page.screenshot({
  path: shot("studio-1440x900-direct-command-one-target.png"),
});

// Zoom geometry
const measure = async () =>
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
proof.zoom = { at100: await measure() };
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
proof.zoom.at160 = await measure();
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
proof.zoom.backToFit = await measure();
assert(
  proof.zoom.backToFit.gridWidth === proof.zoom.at100.gridWidth,
  "return to fit did not restore width",
);

// 1920 hierarchy on the same exact paused frame
const state1920 = await readPlayerState(page);
assert(
  state1920.exactFrame === proofFrame && state1920.paused,
  `frame drifted before 1920 capture: ${JSON.stringify(state1920)}`,
);
proof.hierarchy1920 = {
  frame: state1920.exactFrame,
  beatId: state1920.beatId,
  shotId: state1920.shotId,
  paused: state1920.paused,
};
await page.setViewportSize({ width: 1920, height: 1080 });
await page.waitForTimeout(800);
const state1920Settled = await readPlayerState(page);
assert(
  state1920Settled.exactFrame === proofFrame && state1920Settled.paused,
  `frame drifted during 1920 capture: ${JSON.stringify(state1920Settled)}`,
);
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
