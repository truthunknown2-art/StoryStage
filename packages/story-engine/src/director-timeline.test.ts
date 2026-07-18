import { describe, expect, it } from "vitest";
import { hashCanonical } from "./canonical-hash";
import {
  createDirectorTimeline,
  directorTimelineDraftSchema,
} from "./director-timeline";
import { createKidsShowcaseDirectorTimeline } from "./kids-showcase-director-timeline";

describe("director timeline hard gates", () => {
  it("compiles the 30-second kids cut around ten named picture events", () => {
    const timeline = createKidsShowcaseDirectorTimeline(
      hashCanonical("script"),
    );
    expect(timeline.shots).toHaveLength(10);
    expect(timeline.shots.map((shot) => shot.startFrame)).toEqual([
      0, 120, 210, 342, 414, 462, 534, 654, 774, 846,
    ]);
    expect(
      timeline.shots.at(-1)!.startFrame +
        timeline.shots.at(-1)!.durationInFrames,
    ).toBe(900);
    expect(timeline.shots.every((shot) => shot.cutOutEventId.length > 0)).toBe(
      true,
    );
  });

  it("rejects a character teleport before rendering", () => {
    const timeline = createKidsShowcaseDirectorTimeline(
      hashCanonical("script"),
    );
    const { contentHash: _contentHash, ...draft } = timeline;
    void _contentHash;
    const changed = structuredClone(draft);
    changed.shots[1]!.entryState.find(
      (state) => state.entityId === "mara",
    )!.stageX = 0.9;
    expect(() => directorTimelineDraftSchema.parse(changed)).toThrow(
      /teleports/i,
    );
  });

  it("rejects fixed-duration cuts that lack a named picture event", () => {
    const timeline = createKidsShowcaseDirectorTimeline(
      hashCanonical("script"),
    );
    const { contentHash: _contentHash, ...draft } = timeline;
    void _contentHash;
    const changed = structuredClone(draft);
    changed.shots[4]!.cutOutEventId = "timer-expired";
    expect(() => createDirectorTimeline(changed)).toThrow(
      /named picture event/i,
    );
  });

  it("rejects locomotion that becomes a planted pose without a contact event", () => {
    const timeline = createKidsShowcaseDirectorTimeline(
      hashCanonical("script"),
    );
    const { contentHash: _contentHash, ...draft } = timeline;
    void _contentHash;
    const changed = structuredClone(draft);
    changed.shots[1]!.events = changed.shots[1]!.events.filter(
      (event) =>
        !(
          event.subjectIds.includes("mara") &&
          ["foot-contact", "settle"].includes(event.kind)
        ),
    );
    expect(() => createDirectorTimeline(changed)).toThrow(
      /without a named plant/i,
    );
  });

  it("rejects a prop attachment that is not held long enough to read", () => {
    const timeline = createKidsShowcaseDirectorTimeline(
      hashCanonical("script"),
    );
    const { contentHash: _contentHash, ...draft } = timeline;
    void _contentHash;
    const changed = structuredClone(draft);
    const offer = changed.shots[8]!;
    offer.minimumReadFramesAfterCutEvent = 0;
    offer.events.find(
      (event) => event.id === "mara-hand-contact",
    )!.frameOffset = 68;
    expect(() => createDirectorTimeline(changed)).toThrow(
      /visibly attached for at least six frames/i,
    );
  });
});
