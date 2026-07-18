import { describe, expect, it } from "vitest";
import {
  createKidsShowcaseProject,
  getKidsShowcaseShotLineage,
  makeKidsShowcaseSneezeBigger,
  redoKidsShowcaseEdit,
  undoKidsShowcaseEdit,
} from "./kids-showcase";

describe("30-second Kids showcase product path", () => {
  it("binds one source script through three scenes, six beats, and eleven deterministic shots", () => {
    const project = createKidsShowcaseProject();
    expect(project.program.scenes).toHaveLength(3);
    expect(project.program.beats).toHaveLength(6);
    expect(project.program.shotBindings).toHaveLength(11);
    expect(project.program.renderPlan.durationInFrames).toBe(900);
    expect(
      project.program.renderPlan.shots.at(-1)!.startFrame +
        project.program.renderPlan.shots.at(-1)!.durationInFrames,
    ).toBe(900);
    const lineage = getKidsShowcaseShotLineage(
      project.program,
      "shot-spark-sneeze",
    );
    expect(lineage.beat.id).toBe("beat-spark-sneeze");
    expect(lineage.binding.motionChannels).toContain("delayed-kids-reaction");
  });

  it("edits only the bounded sneeze direction and supports exact undo and redo", () => {
    const initial = createKidsShowcaseProject();
    const changed = makeKidsShowcaseSneezeBigger(initial);
    expect(changed.program.contentHash).toBe(initial.program.contentHash);
    expect(changed.direction.sneezeIntensity).toBe(1.4);
    const undone = undoKidsShowcaseEdit(changed);
    expect(undone.direction).toEqual(initial.direction);
    const redone = redoKidsShowcaseEdit(undone);
    expect(redone.direction).toEqual(changed.direction);
  });
});
