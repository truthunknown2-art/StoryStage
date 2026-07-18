import { describe, expect, it } from "vitest";
import { hashCanonical } from "./canonical-hash";
import {
  createShotPerformanceProgram,
  shotPerformanceProgramDraftSchema,
  shotPerformanceProgramSchema,
} from "./performance-source";

const continuity = hashCanonical("continuity");

describe("honest hybrid performance sources", () => {
  it("models distance-driven locomotion without a pose-swap fallback", () => {
    const program = createShotPerformanceProgram({
      schemaVersion: "1.0",
      id: "mara-forest-run",
      shotId: "shot-run-to-the-ruin",
      performerId: "mara",
      sources: [
        {
          kind: "atlas-cycle",
          clipId: "mara-run-right-v1",
          view: "profile-right",
          frameCount: 8,
          drive: "root-distance",
          loop: true,
          rootDistancePerLoop: 188,
          footContactFrames: [1, 5],
        },
      ],
      phases: [{ name: "locomotion", startFrame: 0, endFrame: 84 }],
      entranceContinuityHash: continuity,
      exitContinuityHash: continuity,
      fallbackPolicy: "forbid-whole-body-pose-swap",
    });

    expect(program.sources[0]!.kind).toBe("atlas-cycle");
    expect(shotPerformanceProgramSchema.parse(program)).toEqual(program);
  });

  it("requires one-shot drawing sequences to include action and settle", () => {
    const result = shotPerformanceProgramDraftSchema.safeParse({
      schemaVersion: "1.0",
      id: "guardian-sneeze",
      shotId: "shot-spark-sneeze",
      performerId: "moss-guardian",
      sources: [
        {
          kind: "drawing-sequence",
          clipId: "guardian-sneeze-v1",
          view: "front",
          frameCount: 12,
          loop: false,
          authoredPhases: ["anticipation", "action", "overshoot"],
        },
      ],
      phases: [{ name: "action", startFrame: 0, endFrame: 40 }],
      entranceContinuityHash: continuity,
      exitContinuityHash: continuity,
      fallbackPolicy: "forbid-whole-body-pose-swap",
    });

    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues.map((issue) => issue.message)).toContain(
        "Drawing sequences require an authored settle phase.",
      );
  });

  it("rejects living holds longer than two seconds at 30 fps", () => {
    const result = shotPerformanceProgramDraftSchema.safeParse({
      schemaVersion: "1.0",
      id: "guardian-closeup-hold",
      shotId: "shot-eye-close-up",
      performerId: "moss-guardian",
      sources: [
        {
          kind: "living-hold",
          drawingAssetId: "guardian-closeup-hero",
          view: "front",
          allowedDurationInFrames: 61,
          internalChannels: ["gaze", "blink", "breathing"],
        },
      ],
      phases: [{ name: "hold", startFrame: 0, endFrame: 48 }],
      entranceContinuityHash: continuity,
      exitContinuityHash: continuity,
      fallbackPolicy: "forbid-whole-body-pose-swap",
    });

    expect(result.success).toBe(false);
  });
});
