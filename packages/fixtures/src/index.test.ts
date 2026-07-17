import {describe, expect, it} from "vitest";
import {calculateLegacyEpisodeDurationInFrames, legacyEpisodePlanSchema, sampleEpisodePlan} from "./index";

describe("StoryStage fixtures", () => {
  it("satisfies the production episode schema", () => {
    expect(legacyEpisodePlanSchema.parse(sampleEpisodePlan).schemaVersion).toBe("1.0");
  });

  it("calculates the composition duration from the validated plan", () => {
    expect(calculateLegacyEpisodeDurationInFrames(sampleEpisodePlan)).toBe(360);
  });
});
