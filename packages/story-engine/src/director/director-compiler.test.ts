import { describe, expect, it } from "vitest";
import { createCv002Project } from "../cv002-story-draft";
import {
  compileDirectorProject,
  tryCompileDirectorProject,
} from "./director-compiler";

const sentence =
  "A curious traveler follows a bright clue and pauses when the hidden answer changes everything.";
const script = Array.from(
  { length: 9 },
  (_, index) => `${sentence.slice(0, -1)} ${index + 1}.`,
).join(" ");
const exactWords = (count: number) =>
  Array.from({ length: count }, (_, index) =>
    index % 17 === 16 ? `word${index}.` : `word${index}`,
  ).join(" ");

describe("Director Studio Alpha compiler", () => {
  it("compiles one deterministic canonical project and executable proxy plan", () => {
    const story = createCv002Project(
      "A bright trail",
      script,
      "kids-adventure",
    );
    const first = compileDirectorProject({ storyProject: story });
    const second = compileDirectorProject({ storyProject: story });
    const beatCount = story.graph.scenes.flatMap((scene) => scene.beats).length;

    expect(first.contentHash).toBe(second.contentHash);
    expect(first.directorPlan.planningAuthority).toEqual({
      plannerId: "cv002-alpha-director",
      plannerVersion: "1.0",
    });
    expect(first.directorPlan.beats).toHaveLength(beatCount);
    expect(first.directorPlan.shots).toHaveLength(beatCount + 1);
    expect(first.executableEpisodePlan.renderMode).toBe("proxy-animatic");
    expect(first.executableEpisodePlan.proxyStagePrograms).toHaveLength(
      story.graph.scenes.length,
    );
    expect(first.executableEpisodePlan.proxyCameraPrograms).toHaveLength(
      beatCount + 1,
    );
    expect(first.executableEpisodePlan.proxyEntityPrograms?.length).toBe(
      (beatCount + 1) * 2,
    );
    expect(first.executableEpisodePlan.contentHash).toBe(
      first.executableEpisodePlan.contentHash,
    );
    expect(first.capabilityReport.summary.proxyOnly).toBeGreaterThan(0);
    expect(
      first.directorPlan.beats
        .flatMap((beat) => beat.performanceRequirements)
        .some((requirement) => requirement.source === "proxy"),
    ).toBe(false);
    const multiShotBeat = first.directorPlan.beats.find(
      (beat) =>
        first.directorPlan.shots.filter((shot) =>
          shot.beatIds.includes(beat.beatId),
        ).length === 2,
    )!;
    const multiShots = first.directorPlan.shots.filter((shot) =>
      shot.beatIds.includes(multiShotBeat.beatId),
    );
    const ranges = multiShots.map(
      (shot) =>
        first.timingSolution.resolvedShots.find(
          (resolved) => resolved.shotId === shot.id,
        )!,
    );
    expect(multiShots).toHaveLength(2);
    expect(multiShots[0]!.storyFunction).not.toBe(multiShots[1]!.storyFunction);
    expect(multiShots[0]!.exitEventId).not.toBe(multiShots[1]!.exitEventId);
    expect(ranges[0]!.endFrameExclusive).toBe(ranges[1]!.startFrame);
    expect(
      first.executableEpisodePlan.proxyCaptionPrograms?.filter(
        (caption) => caption.beatId === multiShotBeat.beatId,
      ),
    ).toHaveLength(1);
    const embeddedPrograms = [
      ...(first.executableEpisodePlan.proxyStagePrograms ?? []),
      ...(first.executableEpisodePlan.proxyCameraPrograms ?? []),
      ...(first.executableEpisodePlan.proxyEntityPrograms ?? []),
      ...(first.executableEpisodePlan.proxyCaptionPrograms ?? []),
      ...(first.executableEpisodePlan.proxyTransitionPrograms ?? []),
    ];
    expect(
      embeddedPrograms.every(
        (program) =>
          program.contentHash.length === 64 && program.sourceBeatIds.length > 0,
      ),
    ).toBe(true);
  });

  it("directs Kids Adventure and Weird History with different grammars", () => {
    const kids = compileDirectorProject({
      storyProject: createCv002Project("Kids", script, "kids-adventure"),
    });
    const history = compileDirectorProject({
      storyProject: createCv002Project("History", script, "weird-history"),
    });

    expect(kids.directorPlan.grammarProfileContentHash).not.toBe(
      history.directorPlan.grammarProfileContentHash,
    );
    expect(
      kids.directorPlan.shots.map((shot) => shot.storyFunction),
    ).not.toEqual(history.directorPlan.shots.map((shot) => shot.storyFunction));
    expect(
      kids.directorPlan.beats
        .flatMap((beat) => beat.performanceRequirements)
        .map((requirement) => requirement.source),
    ).not.toEqual(
      history.directorPlan.beats
        .flatMap((beat) => beat.performanceRequirements)
        .map((requirement) => requirement.source),
    );
    expect(kids.timingSolution.durationInFrames).toBeGreaterThan(
      history.timingSolution.durationInFrames,
    );
    expect(
      kids.directorPlan.beats.some(
        (beat) =>
          kids.directorPlan.shots.filter((shot) =>
            shot.beatIds.includes(beat.beatId),
          ).length === 2,
      ),
    ).toBe(true);
    expect(
      history.directorPlan.beats.some(
        (beat) =>
          history.directorPlan.shots.filter((shot) =>
            shot.beatIds.includes(beat.beatId),
          ).length === 2,
      ),
    ).toBe(true);
  });

  it("enforces the Director Studio 100 to 300 word contract", () => {
    expect(() =>
      compileDirectorProject({
        storyProject: createCv002Project(
          "Short",
          exactWords(99),
          "kids-adventure",
        ),
      }),
    ).toThrow(/100 to 300/);
    expect(() =>
      compileDirectorProject({
        storyProject: createCv002Project(
          "Minimum",
          exactWords(100),
          "kids-adventure",
        ),
      }),
    ).not.toThrow();
    expect(() =>
      compileDirectorProject({
        storyProject: createCv002Project(
          "Maximum",
          exactWords(300),
          "weird-history",
        ),
      }),
    ).not.toThrow();
    expect(() =>
      compileDirectorProject({
        storyProject: createCv002Project(
          "Long",
          exactWords(301),
          "weird-history",
        ),
      }),
    ).toThrow(/100 to 300/);
  });

  it("offers deterministic typed diagnostics for the DSA-002 stage shell", () => {
    const input = {
      storyProject: createCv002Project(
        "Short",
        exactWords(99),
        "kids-adventure" as const,
      ),
    };

    const first = tryCompileDirectorProject(input);
    const repeated = tryCompileDirectorProject(input);

    expect(first).toEqual(repeated);
    expect(first).toEqual({
      ok: false,
      diagnostics: [
        {
          code: "input-policy-failed",
          message:
            "Director Studio Alpha supports scripts from 100 to 300 words. This script has 99.",
        },
      ],
    });
  });
});
