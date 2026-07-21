import { describe, expect, it } from "vitest";
import {
  applyDirectDraft,
  canRedoDirect,
  canUndoDirect,
  committedDirectDraft,
  directBeatKey,
  directDraftsEqual,
  hasUnappliedDirectChanges,
  initialBeatDirectState,
  redoDirect,
  undoDirect,
  updateDirectDraft,
  type DirectDraft,
} from "./direct-history";

const draft = (
  beatPurpose: string,
  performanceDirection = "",
  continuityNote = "",
): DirectDraft => ({ beatPurpose, performanceDirection, continuityNote });

describe("direct-history — immutable per-beat session history", () => {
  it("starts as one committed empty snapshot with no undo/redo and no unapplied changes", () => {
    const state = initialBeatDirectState();
    expect(state.history).toHaveLength(1);
    expect(state.cursor).toBe(0);
    expect(directDraftsEqual(state.draft, committedDirectDraft(state))).toBe(
      true,
    );
    expect(canUndoDirect(state)).toBe(false);
    expect(canRedoDirect(state)).toBe(false);
    expect(hasUnappliedDirectChanges(state)).toBe(false);
  });

  it("commits the complete three-field draft atomically, empty fields included", () => {
    const edited = updateDirectDraft(initialBeatDirectState(), {
      beatPurpose: "Only the purpose is set",
    });
    expect(hasUnappliedDirectChanges(edited)).toBe(true);
    // Editing alone creates no history.
    expect(edited.history).toHaveLength(1);
    expect(canUndoDirect(edited)).toBe(false);

    const committed = applyDirectDraft(edited);
    expect(committed.history).toHaveLength(2);
    expect(committed.cursor).toBe(1);
    expect(committedDirectDraft(committed)).toEqual(
      draft("Only the purpose is set"),
    );
    expect(hasUnappliedDirectChanges(committed)).toBe(false);
    expect(canUndoDirect(committed)).toBe(true);
    expect(canRedoDirect(committed)).toBe(false);
  });

  it("returns the identical state for an unchanged Apply — no phantom step", () => {
    const committed = applyDirectDraft(
      updateDirectDraft(initialBeatDirectState(), {
        beatPurpose: "Committed once",
      }),
    );
    expect(applyDirectDraft(committed)).toBe(committed);
    expect(committed.history).toHaveLength(2);
  });

  it("undo restores the prior snapshot and redo the exact undone snapshot", () => {
    const withA = applyDirectDraft(
      updateDirectDraft(initialBeatDirectState(), draft("A1", "A2", "A3")),
    );
    const withB = applyDirectDraft(
      updateDirectDraft(withA, draft("B1", "B2", "B3")),
    );

    const undone = undoDirect(withB);
    expect(committedDirectDraft(undone)).toEqual(draft("A1", "A2", "A3"));
    expect(undone.draft).toEqual(draft("A1", "A2", "A3"));
    expect(canRedoDirect(undone)).toBe(true);

    const redone = redoDirect(undone);
    expect(committedDirectDraft(redone)).toEqual(draft("B1", "B2", "B3"));
    expect(redone.draft).toEqual(draft("B1", "B2", "B3"));
    expect(canRedoDirect(redone)).toBe(false);
  });

  it("truncates only the redo branch when a distinct draft is applied after undo", () => {
    const withA = applyDirectDraft(
      updateDirectDraft(initialBeatDirectState(), draft("A")),
    );
    const withB = applyDirectDraft(updateDirectDraft(withA, draft("B")));
    const undone = undoDirect(withB);

    const withC = applyDirectDraft(updateDirectDraft(undone, draft("C")));
    expect(withC.history.map((entry) => entry.beatPurpose)).toEqual([
      "",
      "A",
      "C",
    ]);
    expect(canRedoDirect(withC)).toBe(false);

    // The discarded B branch can never be reached again.
    const backToA = undoDirect(withC);
    const forwardAgain = redoDirect(backToA);
    expect(committedDirectDraft(forwardAgain)).toEqual(draft("C"));
  });

  it("undo/redo at the boundaries are no-ops returning the identical state", () => {
    const initial = initialBeatDirectState();
    expect(undoDirect(initial)).toBe(initial);
    expect(redoDirect(initial)).toBe(initial);
  });

  it("never mutates earlier state objects", () => {
    const initial = initialBeatDirectState();
    const edited = updateDirectDraft(initial, { beatPurpose: "Edited" });
    const committed = applyDirectDraft(edited);
    const undone = undoDirect(committed);

    expect(initial.draft.beatPurpose).toBe("");
    expect(initial.history).toHaveLength(1);
    expect(edited.history).toHaveLength(1);
    expect(committed.history).toHaveLength(2);
    expect(undone.cursor).toBe(0);
    expect(committed.history[1]).toEqual(draft("Edited"));
  });

  it("derives deterministic UI-local beat keys from scene ID and beat index", () => {
    expect(directBeatKey("scene-1", 0)).toBe("scene-1::beat-0");
    expect(directBeatKey("scene-1", 0)).toBe(directBeatKey("scene-1", 0));
    expect(directBeatKey("scene-1", 0)).not.toBe(directBeatKey("scene-1", 1));
    expect(directBeatKey("scene-1", 0)).not.toBe(directBeatKey("scene-2", 0));
  });
});
