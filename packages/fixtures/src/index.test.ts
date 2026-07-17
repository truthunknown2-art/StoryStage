import {calculateEpisodeDurationInFrames, episodePlanSchema} from "@storystage/contracts";
import {describe, expect, it} from "vitest";
import {sampleEpisodePlan} from "./index";

describe("StoryStage fixtures", () => {
  it("satisfies the production episode schema", () => {
    expect(episodePlanSchema.parse(sampleEpisodePlan).schemaVersion).toBe("1.0");
  });

  it("calculates the composition duration from the validated plan", () => {
    expect(calculateEpisodeDurationInFrames(sampleEpisodePlan)).toBe(360);
  });
});
