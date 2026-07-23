import { describe, expect, it } from "vitest";
// @ts-expect-error — the plain-.mjs evidence script has no type declarations;
// vitest imports and runs it without launching the browser journey.
import { EXPECTED_SCREENSHOT_NAMES, screenshotSetFailures } from "../../scripts/f5-wp1-evidence.mjs";

/* F5-WP1 evidence-gate unit proof: the exact nine-capture set check is
 * deterministic and fail-closed, so an incomplete, duplicated, or padded
 * screenshot report can never pass — no browser run required. */
describe("F5-WP1 — evidence screenshot set gate (pure)", () => {
  const files = (names: readonly string[]) =>
    names.map((name) => `screenshots/${name}.png`);

  it("accepts exactly the nine expected captures once each", () => {
    expect(EXPECTED_SCREENSHOT_NAMES).toEqual([
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
    expect(screenshotSetFailures(files(EXPECTED_SCREENSHOT_NAMES))).toEqual(
      [],
    );
    // Journey order does not matter; the exact set must match once each.
    expect(
      screenshotSetFailures(files([...EXPECTED_SCREENSHOT_NAMES].reverse())),
    ).toEqual([]);
  });

  it("fails closed when one expected capture is missing", () => {
    const incomplete = EXPECTED_SCREENSHOT_NAMES.filter(
      (name: string) => name !== "wp1-1440x900-audio-dialogue-empty",
    );
    expect(screenshotSetFailures(files(incomplete))).toEqual([
      "missing expected capture: wp1-1440x900-audio-dialogue-empty",
    ]);
  });

  it("fails closed for an empty report", () => {
    const failures = screenshotSetFailures([]);
    expect(failures).toHaveLength(9);
    expect(failures[0]).toBe(
      "missing expected capture: wp1-1440x900-projects",
    );
  });

  it("fails closed on duplicate and extra captures", () => {
    expect(
      screenshotSetFailures(
        files([...EXPECTED_SCREENSHOT_NAMES, "wp1-1440x900-projects"]),
      ),
    ).toEqual(["duplicate capture: wp1-1440x900-projects (x2)"]);
    expect(
      screenshotSetFailures(
        files([...EXPECTED_SCREENSHOT_NAMES, "wp1-1440x900-unexpected"]),
      ),
    ).toEqual(["extra capture: wp1-1440x900-unexpected"]);
  });
});
