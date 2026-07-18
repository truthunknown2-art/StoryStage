import { describe, expect, it } from "vitest";
import { solveEventConstraints } from "./event-constraint-solver";
import {
  applyWorldEvent,
  reduceWorldEvents,
  type DirectorWorldState,
} from "./world-state";

const transform = { x: 0, y: 0, z: 0, scale: 1, rotation: 0 };
const initialWorld: DirectorWorldState = {
  frame: 0,
  entities: {
    mara: {
      entityId: "mara",
      lifecycle: "onstage",
      transform,
      facing: "right",
      gazeTargetId: null,
      velocity: { x: 0, y: 0, z: 0 },
    },
    guardian: {
      entityId: "guardian",
      lifecycle: "onstage",
      transform,
      facing: "left",
      gazeTargetId: "mara",
      velocity: { x: 0, y: 0, z: 0 },
    },
  },
  props: { moth: { kind: "free", transform } },
};

describe("director world state", () => {
  it("enforces one explicit prop ownership chain", () => {
    const result = reduceWorldEvents(initialWorld, [
      {
        id: "land",
        frame: 10,
        kind: "prop-attach",
        propId: "moth",
        ownerId: "guardian",
        socketId: "nose",
      },
      {
        id: "offer",
        frame: 30,
        kind: "prop-offer",
        propId: "moth",
        ownerId: "guardian",
        socketId: "hand",
        offeredToId: "mara",
      },
      {
        id: "transfer",
        frame: 40,
        kind: "prop-transfer",
        propId: "moth",
        fromOwnerId: "guardian",
        toOwnerId: "mara",
        socketId: "hand",
      },
      {
        id: "release",
        frame: 50,
        kind: "prop-release",
        propId: "moth",
        ownerId: "mara",
        transform,
      },
    ]);
    expect(result.props.moth).toEqual({ kind: "free", transform });
  });

  it("rejects visibility and ownership shortcuts", () => {
    expect(() =>
      applyWorldEvent(initialWorld, {
        id: "illegal-reveal",
        frame: 1,
        kind: "entity-reveal",
        entityId: "mara",
      }),
    ).toThrow(/cannot apply/i);
    expect(() =>
      applyWorldEvent(initialWorld, {
        id: "illegal-transfer",
        frame: 1,
        kind: "prop-transfer",
        propId: "moth",
        fromOwnerId: "guardian",
        toOwnerId: "mara",
        socketId: "hand",
      }),
    ).toThrow(/matching offer/i);
  });
});

describe("event constraint solver", () => {
  it("places cause, reaction, settle, and cut from timing envelopes", () => {
    const solution = solveEventConstraints({
      startFrame: 100,
      events: [
        { id: "impact", fixedFrame: 110 },
        { id: "reaction" },
        { id: "settle" },
        { id: "cut" },
      ],
      constraints: [
        {
          fromEventId: "impact",
          toEventId: "reaction",
          minimumDelayFrames: 4,
          preferredDelayFrames: 6,
          maximumDelayFrames: 8,
        },
        {
          fromEventId: "reaction",
          toEventId: "settle",
          minimumDelayFrames: 12,
          preferredDelayFrames: 14,
          maximumDelayFrames: 18,
        },
        {
          fromEventId: "settle",
          toEventId: "cut",
          minimumDelayFrames: 8,
          preferredDelayFrames: 10,
          maximumDelayFrames: 18,
        },
      ],
    });
    expect(solution.resolvedEvents).toEqual([
      { eventId: "impact", frame: 110 },
      { eventId: "reaction", frame: 116 },
      { eventId: "settle", frame: 130 },
      { eventId: "cut", frame: 140 },
    ]);
  });

  it("rejects cycles and impossible fixed timings", () => {
    expect(() =>
      solveEventConstraints({
        startFrame: 0,
        events: [{ id: "a" }, { id: "b" }],
        constraints: [
          {
            fromEventId: "a",
            toEventId: "b",
            minimumDelayFrames: 1,
            preferredDelayFrames: 1,
            maximumDelayFrames: 2,
          },
          {
            fromEventId: "b",
            toEventId: "a",
            minimumDelayFrames: 1,
            preferredDelayFrames: 1,
            maximumDelayFrames: 2,
          },
        ],
      }),
    ).toThrow(/cycle/i);
  });
});
