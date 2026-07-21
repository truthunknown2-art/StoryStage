import { describe, expect, it } from "vitest";
import {
  applyDirectDraft,
  canRedoDirect,
  canUndoDirect,
  committedDirectDraft,
  directBeatKey,
  directDraftsEqual,
  hasCommittedVisualMotionDirection,
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
  visualMotion: Partial<DirectDraft> = {},
): DirectDraft => ({
  beatPurpose,
  performanceDirection,
  continuityNote,
  framing: "Unspecified",
  compositionFocus: "",
  cameraIntent: "Unspecified",
  performancePace: "Unspecified",
  endHold: "Unspecified",
  ...visualMotion,
});

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
    expect(hasCommittedVisualMotionDirection(state)).toBe(false);
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

  it("commits the complete eight-field draft atomically from mixed Direct/Visual/Motion edits", () => {
    const complete: DirectDraft = draft(
      "Hold the doorway reveal",
      "Hushed, then a shared gasp",
      "Glow color matches Beat 1",
      {
        framing: "Wide",
        compositionFocus: "Doorway centered, characters flanking",
        cameraIntent: "Gentle push",
        performancePace: "Measured",
        endHold: "Brief hold",
      },
    );
    let state = initialBeatDirectState();
    // Edits across all three tabs still create no history on their own.
    state = updateDirectDraft(state, {
      beatPurpose: complete.beatPurpose,
      performanceDirection: complete.performanceDirection,
      continuityNote: complete.continuityNote,
    });
    state = updateDirectDraft(state, {
      framing: complete.framing,
      compositionFocus: complete.compositionFocus,
    });
    state = updateDirectDraft(state, {
      cameraIntent: complete.cameraIntent,
      performancePace: complete.performancePace,
      endHold: complete.endHold,
    });
    expect(state.history).toHaveLength(1);
    expect(hasUnappliedDirectChanges(state)).toBe(true);

    // One Apply commits all eight fields as one atomic step.
    const committed = applyDirectDraft(state);
    expect(committed.history).toHaveLength(2);
    expect(committed.cursor).toBe(1);
    expect(committedDirectDraft(committed)).toEqual(complete);
    expect(hasCommittedVisualMotionDirection(committed)).toBe(true);
    // Applying the identical complete snapshot again stays a no-op.
    expect(applyDirectDraft(committed)).toBe(committed);
  });

  it("treats a Visual- or Motion-only edit as a real change and restores all eight fields through Undo/Redo", () => {
    const snapshotA: DirectDraft = draft("A1", "A2", "A3", {
      framing: "Medium",
      compositionFocus: "Lantern in the left third",
      cameraIntent: "Locked-off",
      performancePace: "Gentle",
      endHold: "No hold",
    });
    const snapshotB: DirectDraft = draft("B1", "B2", "B3", {
      framing: "Close-up",
      compositionFocus: "The glow on Tix's face",
      cameraIntent: "Follow action",
      performancePace: "Energetic",
      endHold: "Full hold",
    });
    const withA = applyDirectDraft(
      updateDirectDraft(initialBeatDirectState(), snapshotA),
    );

    // Changing only a Motion field differs from the committed snapshot.
    const motionOnlyEdit = updateDirectDraft(withA, {
      performancePace: "Energetic",
    });
    expect(hasUnappliedDirectChanges(motionOnlyEdit)).toBe(true);

    const withB = applyDirectDraft(
      updateDirectDraft(withA, snapshotB),
    );
    expect(committedDirectDraft(withB)).toEqual(snapshotB);

    // Undo/Redo restore the exact complete committed snapshots.
    const undone = undoDirect(withB);
    expect(committedDirectDraft(undone)).toEqual(snapshotA);
    expect(undone.draft).toEqual(snapshotA);
    const redone = redoDirect(undone);
    expect(committedDirectDraft(redone)).toEqual(snapshotB);
    expect(redone.draft).toEqual(snapshotB);
  });

  it("invalidates the redo branch when a distinct eight-field Apply follows Undo", () => {
    const withA = applyDirectDraft(
      updateDirectDraft(
        initialBeatDirectState(),
        draft("A", "", "", { framing: "Wide" }),
      ),
    );
    const withB = applyDirectDraft(
      updateDirectDraft(withA, draft("B", "", "", { framing: "Medium" })),
    );
    const undone = undoDirect(withB);

    // A distinct Apply after Undo — here only Visual/Motion values differ —
    // truncates only this beat's redo branch.
    const withC = applyDirectDraft(
      updateDirectDraft(
        undone,
        draft("A", "", "", { framing: "Wide", endHold: "Brief hold" }),
      ),
    );
    expect(canRedoDirect(withC)).toBe(false);
    expect(withC.history.map((entry) => entry.beatPurpose)).toEqual([
      "",
      "A",
      "A",
    ]);
    const forwardAgain = redoDirect(undoDirect(withC));
    expect(committedDirectDraft(forwardAgain)).toEqual(
      draft("A", "", "", { framing: "Wide", endHold: "Brief hold" }),
    );
  });

  it("reports committed Visual/Motion direction only for real committed values", () => {
    // Direct-only commits keep the empty state.
    const directOnly = applyDirectDraft(
      updateDirectDraft(initialBeatDirectState(), draft("Purpose only")),
    );
    expect(hasCommittedVisualMotionDirection(directOnly)).toBe(false);

    // Each single Visual/Motion value — including text-only focus — is
    // enough to list the committed values.
    for (const patch of [
      { framing: "Close-up" },
      { compositionFocus: "Window light on the shelf" },
      { cameraIntent: "Gentle pull" },
      { performancePace: "Measured" },
      { endHold: "Full hold" },
    ] satisfies Array<Partial<DirectDraft>>) {
      const committed = applyDirectDraft(
        updateDirectDraft(initialBeatDirectState(), patch),
      );
      expect(hasCommittedVisualMotionDirection(committed)).toBe(true);
    }

    // Draft values alone never count — only the committed snapshot.
    const drafting = updateDirectDraft(initialBeatDirectState(), {
      framing: "Wide",
    });
    expect(hasCommittedVisualMotionDirection(drafting)).toBe(false);
  });
});
