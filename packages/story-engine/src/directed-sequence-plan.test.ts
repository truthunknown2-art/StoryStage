import { describe, expect, it } from "vitest";
import { createKidsShowcaseSparkSneezePlan } from "./kids-showcase";
import {
  directedSequencePlanSchema,
  resolveDirectorAudioIntentFrame,
} from "./directed-sequence-plan";

describe("directed sequence plan", () => {
  it("binds creative direction to deterministic picture events", () => {
    const plan = createKidsShowcaseSparkSneezePlan();

    expect(plan.contentHash).toHaveLength(64);
    expect(
      resolveDirectorAudioIntentFrame(plan, "intent-guardian-sneeze"),
    ).toBe(582);
    expect(resolveDirectorAudioIntentFrame(plan, "intent-children-gasp")).toBe(
      590,
    );
    expect(
      plan.audioIntents.find((intent) => intent.id === "intent-music-duck"),
    ).toMatchObject({ anchorEventId: "sneeze-impact", duckMusicDb: -8 });
  });

  it("rejects stale event references and hash-preserving creative edits", () => {
    const plan = createKidsShowcaseSparkSneezePlan();
    expect(() =>
      directedSequencePlanSchema.parse({
        ...plan,
        shots: [
          {
            ...plan.shots[0]!,
            events: plan.shots[0]!.events.filter(
              (event) => event.id !== "sneeze-impact",
            ),
          },
        ],
      }),
    ).toThrow(/stale audio intent/i);
    expect(() =>
      directedSequencePlanSchema.parse({
        ...plan,
        beats: [
          {
            ...plan.beats[0]!,
            audienceQuestion: "Did this edit invalidate the plan?",
          },
        ],
      }),
    ).toThrow(/plan hash/i);
  });
});
