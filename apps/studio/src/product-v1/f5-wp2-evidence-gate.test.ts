import { describe, expect, it } from "vitest";
// @ts-expect-error — the plain-.mjs evidence script has no type declarations;
// vitest imports and runs it without launching the browser journey.
import { EXPECTED_SCREENSHOT_NAMES, screenshotSetFailures } from "../../scripts/f5-wp2-evidence.mjs";

/* F5-WP2 evidence-gate unit proof: the exact ten-capture set check is
 * deterministic and fail-closed, so an incomplete, duplicated, or padded
 * screenshot report can never pass — no browser run required. */
describe("F5-WP2 — evidence screenshot set gate (pure)", () => {
  const files = (names: readonly string[]) =>
    names.map((name) => `screenshots/${name}.png`);

  it("accepts exactly the ten expected captures once each", () => {
    expect(EXPECTED_SCREENSHOT_NAMES).toEqual([
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
      (name: string) => name !== "wp2-1440x900-permission-denied",
    );
    expect(screenshotSetFailures(files(incomplete))).toEqual([
      "missing expected capture: wp2-1440x900-permission-denied",
    ]);
  });

  it("fails closed for an empty report", () => {
    const failures = screenshotSetFailures([]);
    expect(failures).toHaveLength(10);
    expect(failures[0]).toBe(
      "missing expected capture: wp2-1440x900-projects",
    );
  });

  it("fails closed on duplicate and extra captures", () => {
    expect(
      screenshotSetFailures(
        files([...EXPECTED_SCREENSHOT_NAMES, "wp2-1440x900-projects"]),
      ),
    ).toEqual(["duplicate capture: wp2-1440x900-projects (x2)"]);
    expect(
      screenshotSetFailures(
        files([...EXPECTED_SCREENSHOT_NAMES, "wp2-1440x900-unexpected"]),
      ),
    ).toEqual(["extra capture: wp2-1440x900-unexpected"]);
  });
});
