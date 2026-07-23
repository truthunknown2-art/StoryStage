import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { useState } from "react";
import { AudioWorkspace } from "./AudioWorkspace";
import {
  DECLARED_DURATION_TRUTH,
  GAIN_BOUNDS,
  IMPORT_FIXTURES,
  NARRATION_PANEL_TRUTH_NOTE,
  NARRATION_PROTOTYPE_LABEL,
  RECORDING_EVENTS,
  RECORDING_STATES,
  UNSAVED_DIALOG_TITLE,
  auditionCopy,
  buildImportTake,
  buildWalkthroughTake,
  clampGain,
  clampTrimEnd,
  clampTrimStart,
  guardedActionLabel,
  importResultCopy,
  initialTakeValues,
  permittedRecordingEvents,
  recordingAfterScopeChange,
  recordingStateCopy,
  reduceRecording,
  resolveTakeSelection,
  takeDraftDirty,
  takeStatusCopy,
  takesForScope,
  unsavedDialogBody,
  type GuardedAction,
  type RecordingEvent,
  type RecordingState,
} from "./narration-takes";
import { OLLO_DEMO_SCENES } from "./demo-project";

afterEach(() => {
  cleanup();
});

const DEFAULT_SCENE = OLLO_DEMO_SCENES[0]!;

/** Harness mirroring the shell's authoritative scope contract, exactly like
 * the accepted F5-WP1 harness: a scene change resets the beat to that
 * scene's first beat. */
function AudioHarness() {
  const [sceneId, setSceneId] = useState(DEFAULT_SCENE.id);
  const [beatIndex, setBeatIndex] = useState(0);
  const scene = OLLO_DEMO_SCENES.find((entry) => entry.id === sceneId)!;
  return (
    <AudioWorkspace
      onSelectBeat={setBeatIndex}
      onSelectScene={(nextSceneId) => {
        setSceneId(nextSceneId);
        setBeatIndex(0);
      }}
      selectedBeatIndex={beatIndex}
      selectedScene={scene}
    />
  );
}

const panel = () => screen.getByTestId("pv1-takes");
const recorder = () =>
  within(panel()).getByRole("region", { name: "Recording walkthrough" });
const takeList = () =>
  within(panel()).getByRole("region", { name: "Prototype takes in scope" });
const review = () =>
  within(panel()).getByRole("region", { name: "Selected prototype take" });
const stateBadge = () => screen.getByTestId("pv1-takes-state");

const trackTab = (name: string) =>
  within(screen.getByRole("tablist", { name: "Audio tracks" })).getByRole(
    "tab",
    { name },
  );

const recorderButton = (name: string | RegExp) =>
  within(recorder()).getByRole("button", { name });

/** Walks one full successful walkthrough: arm → start → stop → keep. */
async function createWalkthroughTake(
  user: ReturnType<typeof userEvent.setup>,
) {
  await user.click(recorderButton("Arm take walkthrough"));
  await user.click(recorderButton("Start recording walkthrough"));
  await user.click(recorderButton("Stop walkthrough"));
  await user.click(recorderButton("Keep as prototype take"));
}

const takeCard = (name: RegExp) =>
  within(takeList()).getByRole("button", { name });

describe("F5-WP2 — narration recording state machine (pure)", () => {
  it("covers every required state and exactly the permitted transitions", () => {
    const expected: Record<RecordingState, Partial<Record<RecordingEvent, RecordingState>>> = {
      idle: { arm: "armed" },
      armed: {
        start: "recording",
        "simulate-permission-denied": "permission-denied",
        "simulate-missing-device": "missing-device",
        disarm: "idle",
      },
      recording: {
        stop: "stopped",
        cancel: "cancelled",
        interrupt: "interrupted",
      },
      stopped: {
        keep: "idle",
        retake: "armed",
        "discard-walkthrough": "idle",
      },
      cancelled: { "arm-again": "armed", dismiss: "idle" },
      interrupted: { "arm-again": "armed", dismiss: "idle" },
      "permission-denied": { "arm-again": "armed", dismiss: "idle" },
      "missing-device": { "arm-again": "armed", dismiss: "idle" },
    };
    expect(Object.keys(expected).sort()).toEqual([...RECORDING_STATES].sort());
    for (const state of RECORDING_STATES) {
      for (const event of RECORDING_EVENTS) {
        expect(reduceRecording(state, event)).toEqual(
          expected[state][event] ?? null,
        );
      }
      // The rendered control list is exactly the permitted event set.
      expect([...permittedRecordingEvents(state)].sort()).toEqual(
        RECORDING_EVENTS.filter((event) => expected[state][event]).sort(),
      );
    }
  });

  it("ends every recording path in an explicit success, error, or cancel state", () => {
    // Success path: idle → armed → recording → stopped → keep → idle.
    expect(reduceRecording("idle", "arm")).toBe("armed");
    expect(reduceRecording("armed", "start")).toBe("recording");
    expect(reduceRecording("recording", "stop")).toBe("stopped");
    expect(reduceRecording("stopped", "keep")).toBe("idle");
    // Cancel path: recording → cancelled, with retry and dismiss recovery.
    expect(reduceRecording("recording", "cancel")).toBe("cancelled");
    expect(reduceRecording("cancelled", "arm-again")).toBe("armed");
    expect(reduceRecording("cancelled", "dismiss")).toBe("idle");
    // Error paths: permission denied, missing device, interrupted — each
    // with deterministic retry and dismiss recovery.
    expect(reduceRecording("armed", "simulate-permission-denied")).toBe(
      "permission-denied",
    );
    expect(reduceRecording("permission-denied", "arm-again")).toBe("armed");
    expect(reduceRecording("permission-denied", "dismiss")).toBe("idle");
    expect(reduceRecording("armed", "simulate-missing-device")).toBe(
      "missing-device",
    );
    expect(reduceRecording("missing-device", "arm-again")).toBe("armed");
    expect(reduceRecording("missing-device", "dismiss")).toBe("idle");
    expect(reduceRecording("recording", "interrupt")).toBe("interrupted");
    expect(reduceRecording("interrupted", "arm-again")).toBe("armed");
    expect(reduceRecording("interrupted", "dismiss")).toBe("idle");
    // Retake returns to armed; discarding a stopped walkthrough ends idle.
    expect(reduceRecording("stopped", "retake")).toBe("armed");
    expect(reduceRecording("stopped", "discard-walkthrough")).toBe("idle");
    expect(reduceRecording("armed", "disarm")).toBe("idle");
  });

  it("fails closed on impossible transitions and abandons walkthroughs on scope change", () => {
    expect(reduceRecording("idle", "stop")).toBeNull();
    expect(reduceRecording("idle", "keep")).toBeNull();
    expect(reduceRecording("recording", "arm")).toBeNull();
    expect(reduceRecording("permission-denied", "start")).toBeNull();
    expect(reduceRecording("stopped", "start")).toBeNull();
    for (const state of RECORDING_STATES)
      expect(recordingAfterScopeChange(), `abandoned from ${state}`).toBe(
        "idle",
      );
  });

  it("states the no-capture/no-device/no-media truth in every state with no success language", () => {
    expect(NARRATION_PROTOTYPE_LABEL).toBe(
      "Local prototype — no audio is captured, imported, or played",
    );
    expect(NARRATION_PANEL_TRUTH_NOTE).toContain("no microphone");
    expect(NARRATION_PANEL_TRUTH_NOTE).toContain("playback");
    expect(NARRATION_PANEL_TRUTH_NOTE).toContain("persistence");
    for (const state of RECORDING_STATES) {
      const copy = recordingStateCopy(state);
      const text = `${copy.badge} ${copy.detail}`;
      // Every state carries an explicit no-media truth marker.
      expect(text).toMatch(/no audio|no microphone|no media|no device|nothing|never|no stream/i);
      // No state claims a real recording/import/playback/save success.
      expect(text).not.toMatch(
        /successfully|has been (recorded|imported|played|saved)|now playing|recording started/i,
      );
    }
    // Failure states state they are deterministic simulations, not browser
    // permission/device evidence.
    expect(recordingStateCopy("permission-denied").detail).toContain(
      "never asked for device access",
    );
    expect(recordingStateCopy("permission-denied").badge).toContain(
      "simulated",
    );
    expect(recordingStateCopy("missing-device").detail).toContain(
      "No device was enumerated",
    );
    expect(recordingStateCopy("interrupted").badge).toContain("simulated");
  });
});

describe("F5-WP2 — import and take model (pure)", () => {
  const scene = OLLO_DEMO_SCENES[0]!;

  it("states exact no-file truth for picked, invalid, empty, and cancelled results", () => {
    const wav = IMPORT_FIXTURES.find((f) => f.id === "fixture-welcome-wav")!;
    const txt = IMPORT_FIXTURES.find((f) => f.id === "fixture-notes-txt")!;
    expect(importResultCopy("picked", wav)).toBe(
      "Import walkthrough result — “morning-welcome-read.wav” became session-only prototype take metadata. No file was opened, read, decoded, or stored; the name, format, and duration are declared fixture values.",
    );
    expect(importResultCopy("invalid", txt)).toContain(
      "“narration-notes.txt” is not an audio file StoryStage can plan with",
    );
    expect(importResultCopy("invalid", txt)).toContain(
      "Nothing was imported, opened, or read.",
    );
    expect(importResultCopy("empty", null)).toBe(
      "Import walkthrough result — no file was chosen. Nothing was imported, opened, or read.",
    );
    expect(importResultCopy("cancelled", null)).toBe(
      "Import walkthrough cancelled — nothing was chosen, imported, opened, or read.",
    );
    for (const copy of [
      importResultCopy("picked", wav),
      importResultCopy("invalid", txt),
      importResultCopy("empty", null),
      importResultCopy("cancelled", null),
    ])
      expect(copy).not.toMatch(/successfully imported|file loaded|now playing/i);
  });

  it("clamps trim and gain to deterministic bounds", () => {
    const values = { startSeconds: 2, endSeconds: 10, gainDb: 0 };
    expect(clampTrimStart(-5, values)).toBe(0);
    expect(clampTrimStart(99, values)).toBe(9); // stays before trim end
    expect(clampTrimStart(5, values)).toBe(5);
    expect(clampTrimEnd(-5, values, 12)).toBe(3); // stays after trim start
    expect(clampTrimEnd(99, values, 12)).toBe(12); // capped at declared duration
    expect(clampTrimEnd(8, values, 12)).toBe(8);
    expect(clampGain(99)).toBe(GAIN_BOUNDS.maxDb);
    expect(clampGain(-99)).toBe(GAIN_BOUNDS.minDb);
    expect(clampGain(3)).toBe(3);
  });

  it("tracks dirty state against kept values and restore values exactly", () => {
    const take = buildWalkthroughTake(1, scene, 0);
    const declared = initialTakeValues(70);
    expect(take.restoreValues).toEqual(declared);
    expect(take.keptValues).toEqual(declared);
    expect(takeDraftDirty(declared, take)).toBe(false);
    const edited = { ...declared, gainDb: 3 };
    expect(takeDraftDirty(edited, take)).toBe(true);
  });

  it("binds every take to its exact scope with no cross-scope leak", () => {
    const a = buildWalkthroughTake(1, scene, 0);
    const b = buildImportTake(
      2,
      scene,
      1,
      IMPORT_FIXTURES.find((f) => f.id === "fixture-welcome-wav")!,
    );
    expect(takesForScope([a, b], "scene-1", 0)).toEqual([a]);
    expect(takesForScope([a, b], "scene-1", 1)).toEqual([b]);
    expect(takesForScope([a, b], "scene-2", 0)).toEqual([]);
    // Selection keeps a visible take, falls to first visible, never leaks.
    expect(resolveTakeSelection([a], a.id)).toBe(a.id);
    expect(resolveTakeSelection([a], b.id)).toBe(a.id);
    expect(resolveTakeSelection([], a.id)).toBeNull();
    expect(resolveTakeSelection([a], null)).toBe(a.id);
  });

  it("builds takes with exact origin truth and declared (never decoded) duration", () => {
    const walk = buildWalkthroughTake(3, scene, 0);
    expect(walk.id).toBe("prototype-take-3");
    expect(walk.sceneId).toBe("scene-1");
    expect(walk.beatIndex).toBe(0);
    expect(walk.name).toBe("Prototype take 3 · recording walkthrough");
    expect(walk.originTruth).toContain("no microphone, stream, or audio");
    expect(walk.declaredDurationSeconds).toBe(70); // the demo beat's seconds
    expect(walk.status).toBe("review");
    const wav = IMPORT_FIXTURES.find((f) => f.id === "fixture-welcome-wav")!;
    const imp = buildImportTake(4, scene, 0, wav);
    expect(imp.name).toBe(
      "Prototype take 4 · import fixture “morning-welcome-read.wav”",
    );
    expect(imp.originTruth).toContain(
      "no file was opened, read, decoded, or stored",
    );
    expect(imp.declaredDurationSeconds).toBe(12);
    expect(DECLARED_DURATION_TRUTH).toContain("no audio was decoded");
    // Status and audition copy never claim media or playback.
    expect(takeStatusCopy(imp)).toContain("no audio exists");
    expect(takeStatusCopy({ ...imp, status: "kept" })).toContain(
      "still no audio exists",
    );
    expect(auditionCopy(imp)).toContain("never plays audio");
    expect(auditionCopy({ ...imp, auditioning: true })).toContain(
      "no audio plays",
    );
    expect(auditionCopy({ ...imp, auditioning: true })).not.toMatch(
      /now playing/i,
    );
  });

  it("labels every guarded action and the unsaved dialog honestly", () => {
    const actions: GuardedAction[] = [
      { kind: "select-take", takeId: "x" },
      { kind: "discard-take", takeId: "x" },
      { kind: "retake-take", takeId: "x" },
      { kind: "select-scene", sceneId: "scene-2" },
      { kind: "select-beat", beatIndex: 1 },
      { kind: "select-track", trackId: "sfx" },
      { kind: "start-recording" },
      { kind: "start-import" },
    ];
    for (const action of actions) {
      expect(guardedActionLabel(action).length).toBeGreaterThan(0);
      expect(unsavedDialogBody(action)).toContain(
        "session-only prototype metadata",
      );
      expect(unsavedDialogBody(action)).toContain(
        "Nothing is ever saved to a project, file, or device.",
      );
    }
    expect(UNSAVED_DIALOG_TITLE).toBe("Unsaved prototype edits");
  });
});

describe("F5-WP2 — recording walkthrough views", () => {
  it("shows the persistent prototype label and idle truth on Narration, and hides the panel on other tracks", async () => {
    const user = userEvent.setup();
    render(<AudioHarness />);
    expect(panel().hasAttribute("hidden")).toBe(false);
    expect(panel().textContent).toContain(NARRATION_PROTOTYPE_LABEL);
    expect(panel().textContent).toContain(NARRATION_PANEL_TRUTH_NOTE);
    expect(stateBadge().textContent).toBe(
      "No recording walkthrough in progress",
    );
    expect(recorder().textContent).toContain(
      "No microphone, permission prompt, device, stream, or audio buffer exists",
    );
    expect(takeList().textContent).toContain(
      "No prototype takes in this scene/beat scope",
    );
    expect(review().textContent).toContain(
      "No prototype take selected — this scope has no prototype takes.",
    );
    // Other tracks hide the panel and never acquire recording controls.
    for (const name of ["Dialogue", "SFX", "Music"]) {
      await user.click(trackTab(name));
      expect(panel().hasAttribute("hidden")).toBe(true);
      expect(
        screen.queryByRole("button", { name: "Arm take walkthrough" }),
      ).toBeNull();
    }
    await user.click(trackTab("Narration"));
    expect(panel().hasAttribute("hidden")).toBe(false);
  });

  it("walks arm → record → stop → keep as an honest UI-state walkthrough", async () => {
    const user = userEvent.setup();
    render(<AudioHarness />);
    await user.click(recorderButton("Arm take walkthrough"));
    expect(stateBadge().textContent).toBe("Armed — local UI walkthrough only");
    expect(recorder().textContent).toContain("there is no device to arm");
    await user.click(recorderButton("Start recording walkthrough"));
    expect(stateBadge().textContent).toBe(
      "Recording walkthrough in progress — no audio is captured",
    );
    expect(recorder().textContent).toContain("nothing is recorded");
    await user.click(recorderButton("Stop walkthrough"));
    expect(stateBadge().textContent).toBe(
      "Walkthrough stopped — review the prototype result",
    );
    expect(recorder().textContent).toContain(
      "no audio was captured and no media exists",
    );
    await user.click(recorderButton("Keep as prototype take"));
    expect(stateBadge().textContent).toBe(
      "No recording walkthrough in progress",
    );
    // The kept take is session-only prototype metadata, selected, in scope.
    expect(takeList().textContent).toContain(
      "1 prototype take in this scene/beat scope — none is audio",
    );
    expect(
      takeCard(/Prototype take 1 · recording walkthrough/).getAttribute(
        "aria-current",
      ),
    ).toBe("true");
    const detail = within(review());
    expect(detail.getByText(/no microphone, stream, or audio was used/)).toBeTruthy();
    expect(detail.getByText(/Declared 70s/)).toBeTruthy();
    expect(review().textContent).toContain(
      "In review — session-only prototype metadata, no audio exists",
    );
    expect(takeList().textContent).toContain(
      "kept as session-only prototype metadata — no audio was captured or saved",
    );
    // No success language anywhere in the panel.
    expect(panel().textContent).not.toMatch(
      /successfully|has been (recorded|imported|played|saved)|now playing|recording started/i,
    );
  });

  it("covers cancel, disarm, and retry recovery with explicit states", async () => {
    const user = userEvent.setup();
    render(<AudioHarness />);
    await user.click(recorderButton("Arm take walkthrough"));
    await user.click(recorderButton("Disarm"));
    expect(stateBadge().textContent).toBe(
      "No recording walkthrough in progress",
    );
    await user.click(recorderButton("Arm take walkthrough"));
    await user.click(recorderButton("Start recording walkthrough"));
    await user.click(recorderButton("Cancel walkthrough"));
    expect(stateBadge().textContent).toBe("Recording walkthrough cancelled");
    expect(recorder().textContent).toContain(
      "no audio was captured and nothing was created",
    );
    await user.click(recorderButton("Arm again"));
    expect(stateBadge().textContent).toBe("Armed — local UI walkthrough only");
    await user.click(recorderButton("Start recording walkthrough"));
    await user.click(recorderButton("Cancel walkthrough"));
    await user.click(recorderButton("Dismiss"));
    expect(stateBadge().textContent).toBe(
      "No recording walkthrough in progress",
    );
  });

  it("covers permission-denied and missing-device simulations with recovery", async () => {
    const user = userEvent.setup();
    render(<AudioHarness />);
    await user.click(recorderButton("Arm take walkthrough"));
    await user.click(recorderButton("Simulate permission denied"));
    expect(stateBadge().textContent).toBe(
      "Microphone permission denied — simulated",
    );
    expect(recorder().textContent).toContain(
      "The browser was never asked for device access",
    );
    await user.click(recorderButton("Arm again"));
    await user.click(recorderButton("Simulate missing device"));
    expect(stateBadge().textContent).toBe("No microphone found — simulated");
    expect(recorder().textContent).toContain("No device was enumerated");
    await user.click(recorderButton("Dismiss"));
    expect(stateBadge().textContent).toBe(
      "No recording walkthrough in progress",
    );
  });

  it("covers the interrupted walkthrough and abandons unfinished states on scope change", async () => {
    const user = userEvent.setup();
    render(<AudioHarness />);
    await user.click(recorderButton("Arm take walkthrough"));
    await user.click(recorderButton("Start recording walkthrough"));
    await user.click(recorderButton("Simulate interruption"));
    expect(stateBadge().textContent).toBe(
      "Recording walkthrough interrupted — simulated failure",
    );
    expect(recorder().textContent).toContain("No stream existed");
    await user.click(recorderButton("Arm again"));
    expect(stateBadge().textContent).toBe("Armed — local UI walkthrough only");
    // A scope change abandons the unfinished walkthrough deterministically.
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Audio beat scope" }),
      "1",
    );
    expect(stateBadge().textContent).toBe(
      "No recording walkthrough in progress",
    );
    expect(takeList().textContent).toContain(
      "No prototype takes in this scene/beat scope",
    );
  });
});

describe("F5-WP2 — take decisions and import walkthrough", () => {
  it("supports audition, keep, discard, and retake without playback or media claims", async () => {
    const user = userEvent.setup();
    render(<AudioHarness />);
    await createWalkthroughTake(user);
    const detail = () => within(review());
    // Audition toggles a review mark only.
    await user.click(
      detail().getByRole("button", {
        name: "Audition — review only, no playback",
      }),
    );
    expect(review().textContent).toContain(
      "In audition review — marked for comparison only; no audio plays, because no audio exists.",
    );
    expect(
      detail().getByRole("button", { name: "End audition review" }),
    ).toBeTruthy();
    await user.click(detail().getByRole("button", { name: "End audition review" }));
    expect(review().textContent).toContain("Not in audition review");
    // Keep marks session metadata; the Keep control is then gone because it
    // would have no further state transition.
    await user.click(
      detail().getByRole("button", { name: "Keep as session metadata" }),
    );
    expect(review().textContent).toContain(
      "Kept as session-only prototype metadata — still no audio exists",
    );
    expect(
      detail().queryByRole("button", { name: "Keep as session metadata" }),
    ).toBeNull();
    // Retake arms a fresh walkthrough and preserves the existing take.
    await user.click(detail().getByRole("button", { name: "Retake walkthrough" }));
    expect(stateBadge().textContent).toBe("Armed — local UI walkthrough only");
    expect(takeList().textContent).toContain(
      "Prototype take 1 · recording walkthrough",
    );
    await user.click(recorderButton("Disarm"));
    // Discard removes only session metadata.
    await user.click(detail().getByRole("button", { name: "Discard take" }));
    expect(takeList().textContent).toContain(
      "No prototype takes in this scene/beat scope",
    );
    expect(takeList().textContent).toContain(
      "it was only session metadata; no file or audio was deleted",
    );
    expect(review().textContent).toContain(
      "No prototype take selected — this scope has no prototype takes.",
    );
  });

  it("covers import chooser, invalid, empty, cancelled, and picked results with no file API", async () => {
    const user = userEvent.setup();
    render(<AudioHarness />);
    // Chooser opens with fixture metadata only and focus on the first entry.
    await user.click(recorderButton("Open import chooser"));
    const chooser = () =>
      screen.getByRole("dialog", {
        name: "Import take — fixture chooser (local prototype)",
      });
    expect(chooser().textContent).toContain(NARRATION_PROTOTYPE_LABEL);
    expect(chooser().textContent).toContain("never opens a file picker");
    expect(document.activeElement).toBe(
      within(chooser()).getByRole("button", {
        name: /morning-welcome-read\.wav/,
      }),
    );
    // Invalid fixture → explicit invalid result, no take created.
    await user.click(
      within(chooser()).getByRole("button", { name: /narration-notes\.txt/ }),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(recorder().textContent).toContain(
      "“narration-notes.txt” is not an audio file StoryStage can plan with",
    );
    expect(recorder().textContent).toContain(
      "Nothing was imported, opened, or read.",
    );
    expect(takeList().textContent).toContain(
      "No prototype takes in this scene/beat scope",
    );
    // Focus returns to the Import button after the chooser closes.
    expect(document.activeElement).toBe(recorderButton("Open import chooser"));
    await user.click(recorderButton("Dismiss result"));
    // Empty result.
    await user.click(recorderButton("Open import chooser"));
    await user.click(
      within(chooser()).getByRole("button", {
        name: "None of these — close with nothing chosen",
      }),
    );
    expect(recorder().textContent).toContain(
      "Import walkthrough result — no file was chosen. Nothing was imported, opened, or read.",
    );
    await user.click(recorderButton("Dismiss result"));
    // Cancel via button and via Escape.
    await user.click(recorderButton("Open import chooser"));
    await user.click(
      within(chooser()).getByRole("button", { name: "Cancel import" }),
    );
    expect(recorder().textContent).toContain(
      "Import walkthrough cancelled — nothing was chosen, imported, opened, or read.",
    );
    await user.click(recorderButton("Dismiss result"));
    await user.click(recorderButton("Open import chooser"));
    await user.keyboard("{Escape}");
    expect(recorder().textContent).toContain("Import walkthrough cancelled");
    await user.click(recorderButton("Dismiss result"));
    // Valid fixture → picked result and a new take with fixture truth.
    await user.click(recorderButton("Open import chooser"));
    await user.click(
      within(chooser()).getByRole("button", {
        name: /morning-welcome-alt-take\.mp3/,
      }),
    );
    expect(recorder().textContent).toContain(
      "became session-only prototype take metadata. No file was opened, read, decoded, or stored",
    );
    expect(
      takeCard(/Prototype take 1 · import fixture “morning-welcome-alt-take\.mp3”/),
    ).toBeTruthy();
    expect(review().textContent).toContain(
      "no file was opened, read, decoded, or stored",
    );
    expect(review().textContent).toContain("Declared 15s");
  });
});

describe("F5-WP2 — trim, gain, restore, and unsaved-change decisions", () => {
  it("edits trim/gain over bounded metadata with exact values, dirty state, and restore", async () => {
    const user = userEvent.setup();
    render(<AudioHarness />);
    await createWalkthroughTake(user);
    const editor = () =>
      within(review()).getByRole("group", {
        name: "Trim and gain — prototype metadata",
      });
    expect(editor().textContent).toContain(
      "Current draft: trim 0s–70s of a declared 70s, gain 0 dB.",
    );
    expect(editor().textContent).toContain("Draft matches the kept session values.");
    await user.click(
      within(editor()).getByRole("button", {
        name: "Increase trim start by 1 second",
      }),
    );
    await user.click(
      within(editor()).getByRole("button", {
        name: "Increase trim start by 1 second",
      }),
    );
    await user.click(
      within(editor()).getByRole("button", {
        name: "Decrease trim end by 1 second",
      }),
    );
    await user.click(
      within(editor()).getByRole("button", {
        name: "Increase gain by 1 decibel",
      }),
    );
    await user.click(
      within(editor()).getByRole("button", {
        name: "Increase gain by 1 decibel",
      }),
    );
    await user.click(
      within(editor()).getByRole("button", {
        name: "Increase gain by 1 decibel",
      }),
    );
    expect(editor().textContent).toContain(
      "Current draft: trim 2s–69s of a declared 70s, gain +3 dB.",
    );
    expect(editor().textContent).toContain("Unsaved prototype edits");
    // Keep draft edits stores session metadata only.
    await user.click(
      within(editor()).getByRole("button", { name: "Keep draft edits" }),
    );
    expect(editor().textContent).toContain("Draft matches the kept session values.");
    expect(takeList().textContent).toContain(
      "draft edits kept as session-only prototype metadata — nothing was saved to a project, file, or device",
    );
    // Restore returns the draft to the declared values.
    await user.click(
      within(editor()).getByRole("button", {
        name: "Restore declared values",
      }),
    );
    expect(editor().textContent).toContain(
      "Current draft: trim 0s–70s of a declared 70s, gain 0 dB.",
    );
    expect(editor().textContent).toContain("Unsaved prototype edits");
    expect(takeList().textContent).toContain(
      "draft restored to the declared prototype values (trim 0s–70s, gain 0 dB)",
    );
  });

  it("clamps trim start before trim end and gain at ±12 dB", async () => {
    const user = userEvent.setup();
    render(<AudioHarness />);
    // Import the 12s fixture for a small duration.
    await user.click(recorderButton("Open import chooser"));
    await user.click(
      screen.getByRole("button", { name: /morning-welcome-read\.wav/ }),
    );
    const editor = () =>
      within(review()).getByRole("group", {
        name: "Trim and gain — prototype metadata",
      });
    const trimStartUp = within(editor()).getByRole("button", {
      name: "Increase trim start by 1 second",
    });
    for (let i = 0; i < 15; i += 1) await user.click(trimStartUp);
    expect(editor().textContent).toContain("trim 11s–12s");
    const gainUp = within(editor()).getByRole("button", {
      name: "Increase gain by 1 decibel",
    });
    for (let i = 0; i < 15; i += 1) await user.click(gainUp);
    expect(editor().textContent).toContain("gain +12 dB");
    const gainDown = within(editor()).getByRole("button", {
      name: "Decrease gain by 1 decibel",
    });
    for (let i = 0; i < 30; i += 1) await user.click(gainDown);
    expect(editor().textContent).toContain("gain −12 dB");
  });

  it("guards take switching with stay, discard, and keep decisions", async () => {
    const user = userEvent.setup();
    render(<AudioHarness />);
    await createWalkthroughTake(user);
    await user.click(recorderButton("Open import chooser"));
    await user.click(
      screen.getByRole("button", { name: /morning-welcome-read\.wav/ }),
    );
    // Select take 1 and make it dirty.
    await user.click(takeCard(/Prototype take 1 · recording walkthrough/));
    const editor = () =>
      within(review()).getByRole("group", {
        name: "Trim and gain — prototype metadata",
      });
    await user.click(
      within(editor()).getByRole("button", {
        name: "Increase gain by 1 decibel",
      }),
    );
    expect(editor().textContent).toContain("gain +1 dB");
    // Switching takes opens the unsaved-change decision.
    const otherCard = takeCard(/Prototype take 2 · import fixture/);
    otherCard.focus();
    await user.click(otherCard);
    const dialog = () =>
      screen.getByRole("alertdialog", { name: UNSAVED_DIALOG_TITLE });
    expect(dialog().textContent).toContain(
      "Switching the selected take would leave this take while its trim/gain draft has unkept edits",
    );
    expect(dialog().textContent).toContain(
      "Nothing is ever saved to a project, file, or device.",
    );
    // Stay is focused; Escape is Stay.
    expect(document.activeElement).toBe(
      within(dialog()).getByRole("button", { name: "Stay — keep editing" }),
    );
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(
      takeCard(/Prototype take 1 · recording walkthrough/).getAttribute(
        "aria-current",
      ),
    ).toBe("true");
    expect(editor().textContent).toContain("gain +1 dB");
    // Discard drops only the draft and proceeds.
    await user.click(takeCard(/Prototype take 2 · import fixture/));
    await user.click(
      within(dialog()).getByRole("button", { name: "Discard draft edits" }),
    );
    expect(
      takeCard(/Prototype take 2 · import fixture/).getAttribute(
        "aria-current",
      ),
    ).toBe("true");
    expect(editor().textContent).toContain("Draft matches the kept session values.");
    // Make take 2 dirty, then keep edits while switching back: the edits are
    // stored as session metadata on take 2.
    await user.click(
      within(editor()).getByRole("button", {
        name: "Increase gain by 1 decibel",
      }),
    );
    await user.click(takeCard(/Prototype take 1 · recording walkthrough/));
    await user.click(
      within(dialog()).getByRole("button", {
        name: "Keep edits as session metadata",
      }),
    );
    expect(
      takeCard(/Prototype take 1 · recording walkthrough/).getAttribute(
        "aria-current",
      ),
    ).toBe("true");
    await user.click(takeCard(/Prototype take 2 · import fixture/));
    expect(editor().textContent).toContain("gain +1 dB");
    expect(editor().textContent).toContain("Draft matches the kept session values.");
  });

  it("guards scope and track changes and never leaks a take across scopes", async () => {
    const user = userEvent.setup();
    render(<AudioHarness />);
    await createWalkthroughTake(user);
    const editor = () =>
      within(review()).getByRole("group", {
        name: "Trim and gain — prototype metadata",
      });
    await user.click(
      within(editor()).getByRole("button", {
        name: "Increase trim start by 1 second",
      }),
    );
    // A beat change opens the decision instead of dropping the draft.
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Audio beat scope" }),
      "1",
    );
    const dialog = () =>
      screen.getByRole("alertdialog", { name: UNSAVED_DIALOG_TITLE });
    expect(dialog().textContent).toContain("Changing the beat scope");
    await user.click(
      within(dialog()).getByRole("button", { name: "Stay — keep editing" }),
    );
    expect(
      (
        screen.getByRole("combobox", {
          name: "Audio beat scope",
        }) as HTMLSelectElement
      ).value,
    ).toBe("0");
    expect(editor().textContent).toContain("trim 1s–70s");
    // Confirming discards the draft, applies the scope change, and the take
    // stays bound to its own scope with no leak.
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Audio beat scope" }),
      "1",
    );
    await user.click(
      within(dialog()).getByRole("button", { name: "Discard draft edits" }),
    );
    expect(
      (
        screen.getByRole("combobox", {
          name: "Audio beat scope",
        }) as HTMLSelectElement
      ).value,
    ).toBe("1");
    expect(takeList().textContent).toContain(
      "No prototype takes in this scene/beat scope",
    );
    expect(panel().textContent).not.toContain(
      "Prototype take 1 · recording walkthrough",
    );
    // Returning restores exactly that scope's take, with the draft discarded.
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Audio beat scope" }),
      "0",
    );
    expect(
      takeCard(/Prototype take 1 · recording walkthrough/).getAttribute(
        "aria-current",
      ),
    ).toBe("true");
    expect(editor().textContent).toContain("trim 0s–70s");
    // A track change is guarded the same way.
    await user.click(
      within(editor()).getByRole("button", {
        name: "Increase gain by 1 decibel",
      }),
    );
    await user.click(trackTab("SFX"));
    expect(dialog().textContent).toContain("Switching tracks");
    await user.click(
      within(dialog()).getByRole("button", {
        name: "Keep edits as session metadata",
      }),
    );
    expect(trackTab("SFX").getAttribute("aria-selected")).toBe("true");
    expect(panel().hasAttribute("hidden")).toBe(true);
  });

  it("guards discard and retake of a dirty take", async () => {
    const user = userEvent.setup();
    render(<AudioHarness />);
    await createWalkthroughTake(user);
    const editor = () =>
      within(review()).getByRole("group", {
        name: "Trim and gain — prototype metadata",
      });
    await user.click(
      within(editor()).getByRole("button", {
        name: "Increase gain by 1 decibel",
      }),
    );
    const dialog = () =>
      screen.getByRole("alertdialog", { name: UNSAVED_DIALOG_TITLE });
    await user.click(
      within(review()).getByRole("button", { name: "Discard take" }),
    );
    expect(dialog().textContent).toContain("Discarding this take");
    await user.click(
      within(dialog()).getByRole("button", { name: "Stay — keep editing" }),
    );
    expect(takeList().textContent).toContain(
      "Prototype take 1 · recording walkthrough",
    );
    await user.click(
      within(review()).getByRole("button", { name: "Retake walkthrough" }),
    );
    expect(dialog().textContent).toContain("Retaking this take");
    await user.click(
      within(dialog()).getByRole("button", { name: "Discard draft edits" }),
    );
    expect(stateBadge().textContent).toBe("Armed — local UI walkthrough only");
    expect(takeList().textContent).toContain(
      "Prototype take 1 · recording walkthrough",
    );
  });

  it("preserves take scope through cancel, error, retry, and track switches with no stale state", async () => {
    const user = userEvent.setup();
    render(<AudioHarness />);
    await createWalkthroughTake(user);
    // Error and retry keep the take and its selection.
    await user.click(recorderButton("Arm take walkthrough"));
    await user.click(recorderButton("Simulate permission denied"));
    await user.click(recorderButton("Dismiss"));
    expect(
      takeCard(/Prototype take 1 · recording walkthrough/).getAttribute(
        "aria-current",
      ),
    ).toBe("true");
    // A track round-trip keeps session state exactly.
    await user.click(trackTab("Dialogue"));
    expect(panel().hasAttribute("hidden")).toBe(true);
    await user.click(trackTab("Narration"));
    expect(panel().hasAttribute("hidden")).toBe(false);
    expect(takeList().textContent).toContain(
      "1 prototype take in this scene/beat scope — none is audio",
    );
    // A scene round-trip shows only each scope's own takes.
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Audio scene scope" }),
      "scene-2",
    );
    expect(takeList().textContent).toContain(
      "No prototype takes in this scene/beat scope",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Audio scene scope" }),
      "scene-1",
    );
    expect(takeList().textContent).toContain(
      "Prototype take 1 · recording walkthrough",
    );
  });
});

describe("F5-WP2 — keyboard and focus behavior", () => {
  it("keeps every new control keyboard reachable with the accepted track-tab contract intact", async () => {
    const user = userEvent.setup();
    render(<AudioHarness />);
    // Track tabs keep roving tabindex and arrow behavior.
    expect(trackTab("Narration").tabIndex).toBe(0);
    trackTab("Narration").focus();
    await user.keyboard("{ArrowRight}");
    expect(trackTab("Dialogue").getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(trackTab("Dialogue"));
    await user.keyboard("{ArrowLeft}");
    expect(trackTab("Narration").getAttribute("aria-selected")).toBe("true");
    // Tab reaches the recorder controls and take actions in order.
    await user.tab();
    expect(document.activeElement).toBe(
      screen.getByRole("combobox", { name: "Audio scene scope" }),
    );
    await user.tab();
    expect(document.activeElement).toBe(
      screen.getByRole("combobox", { name: "Audio beat scope" }),
    );
    // Walk through the flow entirely by keyboard.
    recorderButton("Arm take walkthrough").focus();
    await user.keyboard("{Enter}");
    expect(stateBadge().textContent).toBe("Armed — local UI walkthrough only");
    recorderButton("Start recording walkthrough").focus();
    await user.keyboard("{Enter}");
    recorderButton("Stop walkthrough").focus();
    await user.keyboard("{Enter}");
    recorderButton("Keep as prototype take").focus();
    await user.keyboard("{Enter}");
    expect(takeList().textContent).toContain(
      "Prototype take 1 · recording walkthrough",
    );
    // The take card is a real button reachable and operable by keyboard.
    const card = takeCard(/Prototype take 1 · recording walkthrough/);
    card.focus();
    expect(document.activeElement).toBe(card);
  });

  it("moves focus into the unsaved dialog on open and back to the trigger on Stay", async () => {
    const user = userEvent.setup();
    render(<AudioHarness />);
    await createWalkthroughTake(user);
    const editor = () =>
      within(review()).getByRole("group", {
        name: "Trim and gain — prototype metadata",
      });
    const gainUp = within(editor()).getByRole("button", {
      name: "Increase gain by 1 decibel",
    });
    await user.click(gainUp);
    const discardButton = within(review()).getByRole("button", {
      name: "Discard take",
    });
    discardButton.focus();
    await user.click(discardButton);
    const dialog = () =>
      screen.getByRole("alertdialog", { name: UNSAVED_DIALOG_TITLE });
    expect(document.activeElement).toBe(
      within(dialog()).getByRole("button", { name: "Stay — keep editing" }),
    );
    await user.click(
      within(dialog()).getByRole("button", { name: "Stay — keep editing" }),
    );
    expect(document.activeElement).toBe(discardButton);
  });
});
