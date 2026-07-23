import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { useState } from "react";
import { AudioWorkspace } from "./AudioWorkspace";
import { StudioShell } from "./StudioShell";
import {
  AUDIO_CARD_STATUS,
  AUDIO_EMPTY_STATE,
  AUDIO_FIXTURES,
  AUDIO_FIXTURE_LABEL,
  AUDIO_NO_CARD_BADGE,
  AUDIO_NO_CARD_TIMING,
  AUDIO_TRACKS,
  FINAL_TIMING_LABEL,
  GUIDE_TIMING_LABEL,
  audioCardsForScope,
  audioCardScopeLabel,
  audioCountSummary,
  audioGuideTimingNote,
  audioNoCardStatus,
  audioOrientationActions,
  audioScopeLabel,
  resolveAudioCardSelection,
} from "./audio-workspace";
import { OLLO_DEMO_SCENES } from "./demo-project";
import type { AiConnectionState } from "./ai-director-fixture";

afterEach(() => {
  cleanup();
});

const DEFAULT_SCENE = OLLO_DEMO_SCENES[0]!;

/** Harness mirroring the shell's authoritative scope contract: a scene
 * change resets the beat to that scene's first beat, exactly like the
 * accepted render-time adjustment in StudioShell. */
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

const trackTab = (name: string) =>
  within(screen.getByRole("tablist", { name: "Audio tracks" })).getByRole(
    "tab",
    { name },
  );

/* Exactly one tabpanel is visible at a time (inactive panels are `hidden`),
 * so the visible panel query is unique. */
const activePanel = () => screen.getByRole("tabpanel");

const inspector = () =>
  screen.getByRole("region", { name: "Selected track inspector" });

const cardButtons = () =>
  within(activePanel())
    .queryAllByRole("button")
    .map((button) => button);

const selectedCardButton = () =>
  cardButtons().find(
    (button) => button.getAttribute("aria-current") === "true",
  );

describe("F5-WP1 — audio scope model (pure)", () => {
  it("grounds every fixture in the accepted Ollo demo hierarchy", () => {
    const trackIds = new Set(AUDIO_TRACKS.map((track) => track.id));
    for (const fixture of AUDIO_FIXTURES) {
      expect(trackIds.has(fixture.trackId)).toBe(true);
      const scene = OLLO_DEMO_SCENES.find(
        (entry) => entry.id === fixture.sceneId,
      );
      expect(scene, `fixture ${fixture.id} scene`).toBeDefined();
      const beat = scene!.beats[fixture.beatIndex];
      expect(beat, `fixture ${fixture.id} beat`).toBeDefined();
      // Guide placement stays inside the demo beat's planning seconds.
      expect(fixture.guideStartSeconds).toBeGreaterThanOrEqual(0);
      expect(fixture.guideDurationSeconds).toBeGreaterThan(0);
      expect(
        fixture.guideStartSeconds + fixture.guideDurationSeconds,
      ).toBeLessThanOrEqual(beat!.seconds);
      expect(fixture.intent.length).toBeGreaterThan(0);
    }
    // Every track type has at least one card and one honestly empty scope.
    for (const track of AUDIO_TRACKS) {
      const withCards = OLLO_DEMO_SCENES.some((scene) =>
        scene.beats.some(
          (_beat, beatIndex) =>
            audioCardsForScope(track.id, scene.id, beatIndex).length > 0,
        ),
      );
      const withoutCards = OLLO_DEMO_SCENES.some((scene) =>
        scene.beats.some(
          (_beat, beatIndex) =>
            audioCardsForScope(track.id, scene.id, beatIndex).length === 0,
        ),
      );
      expect(withCards, `${track.id} has cards`).toBe(true);
      expect(withoutCards, `${track.id} has an empty scope`).toBe(true);
    }
  });

  it("keeps every take and cue inside its own track and exact beat scope", () => {
    expect(
      audioCardsForScope("narration", "scene-1", 0).map((card) => card.id),
    ).toEqual(["nar-scene1-b1-take-a", "nar-scene1-b1-take-b"]);
    // Same scene and beat, different track: no narration leaks into SFX.
    expect(
      audioCardsForScope("sfx", "scene-1", 0).map((card) => card.id),
    ).toEqual(["sfx-scene1-b1-cue-a"]);
    // Same track and scene, neighboring beat: beat 1 cards never leak into
    // beat 0 and vice versa.
    expect(
      audioCardsForScope("narration", "scene-1", 1).map((card) => card.id),
    ).toEqual(["nar-scene1-b2-take-a"]);
    expect(audioCardsForScope("dialogue", "scene-1", 0)).toEqual([]);
    expect(
      audioCardsForScope("dialogue", "scene-5", 1).map((card) => card.id),
    ).toEqual(["dia-scene5-b2-take-a", "dia-scene5-b2-take-b"]);
  });

  it("resolves selection deterministically with no stale retention", () => {
    const visible = audioCardsForScope("narration", "scene-1", 0);
    expect(resolveAudioCardSelection(visible, "nar-scene1-b1-take-b")).toBe(
      "nar-scene1-b1-take-b",
    );
    // A card from another scope or track falls to the first visible card.
    expect(resolveAudioCardSelection(visible, "dia-scene2-b1-take-a")).toBe(
      "nar-scene1-b1-take-a",
    );
    expect(resolveAudioCardSelection(visible, null)).toBe(
      "nar-scene1-b1-take-a",
    );
    expect(resolveAudioCardSelection([], "nar-scene1-b1-take-a")).toBeNull();
  });

  it("labels scope, counts, and guide timing exactly", () => {
    expect(audioScopeLabel(DEFAULT_SCENE, 0)).toBe(
      "Scene 1 · The Home Nook · Beat 1 · Morning light through the round window",
    );
    expect(audioCardScopeLabel(AUDIO_FIXTURES[0]!)).toBe(
      "Scene 1 · The Home Nook · Beat 1 · Morning light through the round window",
    );
    expect(audioCountSummary("narration", 0)).toBe(
      "No planned takes in this scene/beat scope",
    );
    expect(audioCountSummary("sfx", 1)).toBe(
      "1 planned cue in this scene/beat scope",
    );
    expect(audioCountSummary("narration", 2)).toBe(
      "2 planned takes in this scene/beat scope",
    );
    expect(audioGuideTimingNote(AUDIO_FIXTURES[0]!)).toBe(
      "Guide plan places this take 0s into the beat for about 12s",
    );
    expect(GUIDE_TIMING_LABEL).toContain("not final timing");
    expect(FINAL_TIMING_LABEL).toContain("unavailable");
    // Every orientation action is visibly unavailable with its reason.
    for (const track of AUDIO_TRACKS) {
      for (const action of audioOrientationActions(track.id)) {
        expect(action.action.length).toBeGreaterThan(0);
        expect(action.unavailableReason.startsWith("Unavailable")).toBe(true);
      }
    }
  });

  it("states exact empty-scope truth vocabulary with no card fixture label", () => {
    expect(AUDIO_NO_CARD_BADGE).toBe(
      "No planning card selected — no audio exists",
    );
    expect(AUDIO_NO_CARD_BADGE).not.toContain(AUDIO_FIXTURE_LABEL);
    expect(audioNoCardStatus("narration")).toBe(
      "No planned take exists in the current scene/beat scope",
    );
    expect(audioNoCardStatus("dialogue")).toBe(
      "No planned take exists in the current scene/beat scope",
    );
    expect(audioNoCardStatus("sfx")).toBe(
      "No planned cue exists in the current scene/beat scope",
    );
    expect(audioNoCardStatus("music")).toBe(
      "No planned cue exists in the current scene/beat scope",
    );
    // The empty timing basis states the absence of both timing kinds without
    // reusing either non-empty label or a card fixture label.
    expect(AUDIO_NO_CARD_TIMING).toContain("No guide or final timing exists");
    expect(AUDIO_NO_CARD_TIMING).not.toContain(GUIDE_TIMING_LABEL);
    expect(AUDIO_NO_CARD_TIMING).not.toContain(FINAL_TIMING_LABEL);
    expect(AUDIO_NO_CARD_TIMING).not.toContain(AUDIO_FIXTURE_LABEL);
  });
});

describe("F5-WP1 — audio workspace views", () => {
  it("opens Narration with tab state, heading, count, cards, and inspector in agreement", () => {
    render(<AudioHarness />);
    expect(trackTab("Narration").getAttribute("aria-selected")).toBe("true");
    for (const name of ["Dialogue", "SFX", "Music"])
      expect(trackTab(name).getAttribute("aria-selected")).toBe("false");
    const workspace = screen.getByTestId("pv1-audio");
    expect(within(workspace).getByRole("heading", { level: 1 }).textContent).toBe(
      "Narration",
    );
    const panel = activePanel();
    expect(panel.getAttribute("aria-labelledby")).toBe("pv1-audio-tab-narration");
    expect(panel.textContent).toContain("2 planned takes in this scene/beat scope");
    const cards = cardButtons();
    expect(cards).toHaveLength(2);
    expect(selectedCardButton()?.textContent).toContain(
      "Take A · Morning welcome narration",
    );
    const detail = within(inspector());
    expect(detail.getByText(/^Narration — Voice track/)).toBeTruthy();
    expect(detail.getByText("Take A · Morning welcome narration")).toBeTruthy();
    expect(
      detail.getByText(
        "Scene 1 · The Home Nook · Beat 1 · Morning light through the round window",
      ),
    ).toBeTruthy();
  });

  it("synchronizes track switching across heading, count, cards, and inspector", async () => {
    const user = userEvent.setup();
    render(<AudioHarness />);
    await user.click(trackTab("SFX"));
    expect(trackTab("SFX").getAttribute("aria-selected")).toBe("true");
    expect(trackTab("Narration").getAttribute("aria-selected")).toBe("false");
    const workspace = screen.getByTestId("pv1-audio");
    expect(within(workspace).getByRole("heading", { level: 1 }).textContent).toBe(
      "SFX",
    );
    const panel = activePanel();
    expect(panel.textContent).toContain("1 planned cue in this scene/beat scope");
    expect(cardButtons()).toHaveLength(1);
    expect(selectedCardButton()?.textContent).toContain(
      "Soft window-light chime",
    );
    const detail = within(inspector());
    expect(detail.getByText(/^SFX — Cue track/)).toBeTruthy();
    expect(detail.getByText("Soft window-light chime")).toBeTruthy();
    // The SFX selection never exposes the previous track's take identity.
    expect(inspector().textContent).not.toContain("Morning welcome narration");
  });

  it("makes card selection produce an observable inspector change", async () => {
    const user = userEvent.setup();
    render(<AudioHarness />);
    await user.click(
      within(activePanel()).getByRole("button", {
        name: /Take B · Morning welcome, slower read/,
      }),
    );
    expect(selectedCardButton()?.textContent).toContain(
      "Take B · Morning welcome, slower read",
    );
    const detail = within(inspector());
    expect(detail.getByText("Take B · Morning welcome, slower read")).toBeTruthy();
    expect(
      detail.getByText(/Guide plan places this take 0s into the beat for about 15s/),
    ).toBeTruthy();
    expect(
      detail.getByText(/A slower planning read of the same welcome/),
    ).toBeTruthy();
  });

  it("re-resolves cards deterministically when the shared beat scope changes", async () => {
    const user = userEvent.setup();
    render(<AudioHarness />);
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Audio beat scope" }),
      "1",
    );
    const panel = activePanel();
    expect(panel.textContent).toContain(
      "Scene 1 · The Home Nook · Beat 2 · A shelf of unfinished stories",
    );
    expect(panel.textContent).toContain("1 planned take in this scene/beat scope");
    expect(cardButtons()).toHaveLength(1);
    expect(selectedCardButton()?.textContent).toContain(
      "Take A · Shelf of stories narration",
    );
    // No card from the previous beat leaks into the new scope.
    expect(panel.textContent).not.toContain("Morning welcome narration");
    expect(inspector().textContent).not.toContain("Morning welcome narration");
    expect(
      within(inspector()).getByText("Take A · Shelf of stories narration"),
    ).toBeTruthy();
  });

  it("re-resolves cards deterministically when the shared scene scope changes", async () => {
    const user = userEvent.setup();
    render(<AudioHarness />);
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Audio scene scope" }),
      "scene-2",
    );
    const panel = activePanel();
    expect(panel.textContent).toContain(
      "Scene 2 · Forest Path · Beat 1 · Ollo bounces ahead of Tix",
    );
    expect(cardButtons()).toHaveLength(1);
    expect(selectedCardButton()?.textContent).toContain(
      "Take A · Forest path opening narration",
    );
    expect(panel.textContent).not.toContain("Morning welcome narration");
    // The beat select follows the newly selected scene's first beat.
    expect(
      (
        screen.getByRole("combobox", {
          name: "Audio beat scope",
        }) as HTMLSelectElement
      ).value,
    ).toBe("0");
  });

  it("shows the exact Dialogue empty state and what later work enables", async () => {
    const user = userEvent.setup();
    render(<AudioHarness />);
    await user.click(trackTab("Dialogue"));
    const panel = activePanel();
    expect(panel.textContent).toContain(
      "No dialogue planning takes for Scene 1 · The Home Nook · Beat 1 · Morning light through the round window",
    );
    expect(panel.textContent).toContain(AUDIO_EMPTY_STATE.dialogue);
    // The empty state offers no fake success action.
    expect(cardButtons()).toHaveLength(0);
    expect(panel.textContent).toContain(
      "No planned takes in this scene/beat scope",
    );
    // Every inspector row agrees with the empty list and count: no card
    // badge, no planned status, and no timing basis may be manufactured for
    // a nonexistent planning card.
    const detail = within(inspector());
    expect(detail.getByText(AUDIO_NO_CARD_BADGE)).toBeTruthy();
    expect(detail.getByText(/^Dialogue — Voice track/)).toBeTruthy();
    expect(
      detail.getByText(
        "Scene 1 · The Home Nook · Beat 1 · Morning light through the round window",
      ),
    ).toBeTruthy();
    expect(
      detail.getByText(
        "No take selected — this scope has no dialogue planning takes.",
      ),
    ).toBeTruthy();
    expect(
      detail.getByText("No planned take exists in the current scene/beat scope."),
    ).toBeTruthy();
    expect(detail.getByText(`${AUDIO_NO_CARD_TIMING}.`)).toBeTruthy();
    const inspectorText = inspector().textContent ?? "";
    expect(inspectorText).not.toContain(AUDIO_FIXTURE_LABEL);
    expect(inspectorText).not.toContain(AUDIO_CARD_STATUS.take);
    expect(inspectorText).not.toContain(AUDIO_CARD_STATUS.cue);
    expect(inspectorText).not.toContain("Guide plan places");
    expect(inspectorText).not.toContain(GUIDE_TIMING_LABEL);
    expect(inspectorText).not.toContain(FINAL_TIMING_LABEL);
    // No intent row exists without a card; the disabled orientation actions
    // and their reasons remain truthful.
    expect(inspectorText).not.toContain("Intent");
    const actions = within(inspector())
      .getAllByRole("button")
      .map((button) => button as HTMLButtonElement);
    expect(actions.length).toBeGreaterThan(0);
    for (const action of actions) expect(action.disabled).toBe(true);
    expect(inspectorText).toMatch(/Unavailable —/);
  });

  it("states no-card/no-status/no-timing truth in every inspector row of an empty cue scope", async () => {
    const user = userEvent.setup();
    render(<AudioHarness />);
    // Scene 3 · Beat 1 has no planning cards on any track.
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Audio scene scope" }),
      "scene-3",
    );
    await user.click(trackTab("SFX"));
    const panel = activePanel();
    expect(panel.textContent).toContain(
      "No planned cues in this scene/beat scope",
    );
    expect(cardButtons()).toHaveLength(0);
    const detail = within(inspector());
    expect(detail.getByText(AUDIO_NO_CARD_BADGE)).toBeTruthy();
    expect(detail.getByText(/^SFX — Cue track/)).toBeTruthy();
    expect(
      detail.getByText(
        "Scene 3 · Berry Patch · Beat 1 · Dot finds a trail of dropped berries",
      ),
    ).toBeTruthy();
    expect(
      detail.getByText("No cue selected — this scope has no sfx planning cues."),
    ).toBeTruthy();
    expect(
      detail.getByText("No planned cue exists in the current scene/beat scope."),
    ).toBeTruthy();
    expect(detail.getByText(`${AUDIO_NO_CARD_TIMING}.`)).toBeTruthy();
    const inspectorText = inspector().textContent ?? "";
    expect(inspectorText).not.toContain(AUDIO_FIXTURE_LABEL);
    expect(inspectorText).not.toContain(AUDIO_CARD_STATUS.take);
    expect(inspectorText).not.toContain(AUDIO_CARD_STATUS.cue);
    expect(inspectorText).not.toContain("Guide plan places");
    expect(inspectorText).not.toContain(GUIDE_TIMING_LABEL);
    expect(inspectorText).not.toContain(FINAL_TIMING_LABEL);
    expect(inspectorText).not.toContain("Intent");
    const actions = within(inspector())
      .getAllByRole("button")
      .map((button) => button as HTMLButtonElement);
    expect(actions.length).toBeGreaterThan(0);
    for (const action of actions) expect(action.disabled).toBe(true);
    expect(inspectorText).toMatch(/Unavailable —/);
  });

  it("keeps empty states honest on every track of an empty scope", async () => {
    const user = userEvent.setup();
    render(<AudioHarness />);
    // Scene 3 · Beat 1 has no planning cards on any track.
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Audio scene scope" }),
      "scene-3",
    );
    for (const track of AUDIO_TRACKS) {
      await user.click(trackTab(track.label));
      const panel = activePanel();
      expect(
        within(panel).getByRole("note").textContent,
      ).toContain(AUDIO_EMPTY_STATE[track.id]);
      expect(cardButtons()).toHaveLength(0);
      expect(inspector().textContent).toContain(
        `No ${track.cardNoun} selected`,
      );
    }
  });

  it("labels guide timing as provisional and final timing as unavailable everywhere timing appears", async () => {
    const user = userEvent.setup();
    render(<AudioHarness />);
    await user.click(trackTab("Music"));
    const panel = activePanel();
    // Card-level: guide note is always paired with the provisional label.
    expect(panel.textContent).toContain(
      "Guide plan places this cue 0s into the beat for about 30s",
    );
    expect(panel.textContent).toContain(GUIDE_TIMING_LABEL);
    // Inspector-level: the final timing boundary is explicit.
    const detail = within(inspector());
    expect(detail.getByText(new RegExp(GUIDE_TIMING_LABEL))).toBeTruthy();
    expect(detail.getByText(new RegExp(FINAL_TIMING_LABEL))).toBeTruthy();
    // Guide words never stand next to a final-timing claim.
    expect(inspector().textContent).not.toMatch(
      /final timing (is|—) (available|set|locked)/i,
    );
  });

  it("exposes no device, file, playback, waveform, lip-sync, or mixing success path", async () => {
    const user = userEvent.setup();
    render(<AudioHarness />);
    for (const track of AUDIO_TRACKS) {
      await user.click(trackTab(track.label));
      const detail = inspector();
      const actions = within(detail)
        .getAllByRole("button")
        .map((button) => button as HTMLButtonElement);
      expect(actions.length).toBeGreaterThan(0);
      for (const action of actions) expect(action.disabled).toBe(true);
      expect(detail.textContent).toMatch(/Unavailable —/);
    }
    const workspace = screen.getByTestId("pv1-audio");
    expect(workspace.textContent).not.toMatch(
      /successfully|has been (recorded|imported|decoded|played|mixed|saved)|now playing|recording started/i,
    );
    // Truth labels are visible without hover on cards, inspector, and header.
    await user.click(trackTab("Narration"));
    expect(activePanel().textContent).toContain(AUDIO_FIXTURE_LABEL);
    expect(activePanel().textContent).toContain(AUDIO_CARD_STATUS.take);
    expect(inspector().textContent).toContain(AUDIO_FIXTURE_LABEL);
  });

  it("keeps the track tabs keyboard reachable with roving tab index", async () => {
    const user = userEvent.setup();
    render(<AudioHarness />);
    expect(trackTab("Narration").tabIndex).toBe(0);
    for (const name of ["Dialogue", "SFX", "Music"])
      expect(trackTab(name).tabIndex).toBe(-1);
    trackTab("Narration").focus();
    await user.keyboard("{ArrowRight}");
    expect(trackTab("Dialogue").getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(trackTab("Dialogue"));
    expect(trackTab("Dialogue").tabIndex).toBe(0);
    expect(trackTab("Narration").tabIndex).toBe(-1);
    await user.keyboard("{End}");
    expect(trackTab("Music").getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(trackTab("Music"));
    await user.keyboard("{ArrowRight}");
    expect(trackTab("Narration").getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(trackTab("Narration"));
    await user.keyboard("{ArrowLeft}");
    expect(trackTab("Music").getAttribute("aria-selected")).toBe("true");
  });
});

describe("F5-WP1 — Studio integration", () => {
  function StudioHarness() {
    const [aiConnection, setAiConnection] =
      useState<AiConnectionState>("signed-out");
    return (
      <StudioShell
        aiConnection={aiConnection}
        artStyleLabel="Storybook Cutout"
        grammarLabel="Kids Adventure"
        onAiConnectionChange={setAiConnection}
        onBackToProjects={() => {}}
        projectTitle="The Storylight in the Little Wood"
      />
    );
  }

  const workspaceTab = (name: string) =>
    within(
      screen.getByRole("navigation", { name: "Studio workspace" }),
    ).getByRole("button", { name });

  const scopeHeader = () =>
    within(screen.getByTestId("pv1-studio")).getByRole("navigation", {
      name: "Current scope",
    });

  it("reaches the Audio workspace through the accepted Studio navigation", async () => {
    const user = userEvent.setup();
    render(<StudioHarness />);
    await user.click(workspaceTab("Audio"));
    expect(screen.getByTestId("pv1-audio")).toBeTruthy();
    expect(workspaceTab("Audio").getAttribute("aria-current")).toBe("true");
    expect(workspaceTab("Scene board").getAttribute("aria-current")).toBeNull();
    // The audio surface and the permanent scope header agree on one scope.
    expect(scopeHeader().textContent).toContain("Scene 1 · The Home Nook");
    expect(scopeHeader().textContent).toContain(
      "Beat 1 · Morning light through the round window",
    );
    expect(activePanel().textContent).toContain(
      "Scene 1 · The Home Nook · Beat 1 · Morning light through the round window",
    );
    // Never a route into Legacy Studio: the board stays mounted, hidden.
    const board = screen.getByRole("region", {
      name: "Scene board",
      hidden: true,
    });
    expect(board).toBeTruthy();
    expect(board.closest("div[hidden]")).not.toBeNull();
  });

  it("shares one scene/beat scope with the board in both directions", async () => {
    const user = userEvent.setup();
    render(<StudioHarness />);
    const railNav = () =>
      within(screen.getByTestId("pv1-studio")).getByRole("navigation", {
        name: "Episode hierarchy",
      });
    // Board → Audio: a rail selection is the audio surface's scope.
    await user.click(
      within(railNav()).getByRole("button", { name: /^Scene 2 Forest Path/ }),
    );
    await user.click(
      within(railNav()).getByRole("button", {
        name: /^Beat 2 A golden glow between the ferns/,
      }),
    );
    await user.click(workspaceTab("Audio"));
    expect(activePanel().textContent).toContain(
      "Scene 2 · Forest Path · Beat 2 · A golden glow between the ferns",
    );
    // Audio → Board: the in-workspace scope selects write through the same
    // authoritative shell selection.
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Audio scene scope" }),
      "scene-5",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Audio beat scope" }),
      "1",
    );
    expect(scopeHeader().textContent).toContain("Scene 5 · Lantern Bridge");
    expect(scopeHeader().textContent).toContain("Beat 2 · A small voice says hello");
    expect(activePanel().textContent).toContain(
      "Take A · The small voice answered",
    );
    await user.click(workspaceTab("Scene board"));
    expect(scopeHeader().textContent).toContain("Scene 5 · Lantern Bridge");
    expect(scopeHeader().textContent).toContain("Beat 2 · A small voice says hello");
    const rail = within(screen.getByTestId("pv1-studio")).getByRole(
      "navigation",
      { name: "Episode hierarchy" },
    );
    expect(
      within(rail)
        .getAllByRole("button")
        .find((button) => button.getAttribute("aria-current") === "true")
        ?.getAttribute("aria-label"),
    ).toContain("Scene 5 Lantern Bridge");
  });

  it("preserves the accepted board state across Audio workspace switching", async () => {
    const user = userEvent.setup();
    render(<StudioHarness />);
    const railNav = () =>
      within(screen.getByTestId("pv1-studio")).getByRole("navigation", {
        name: "Episode hierarchy",
      });
    await user.click(
      within(railNav()).getByRole("button", { name: /^Scene 3 Berry Patch/ }),
    );
    await user.click(
      within(railNav()).getByRole("button", {
        name: /^Beat 2 The glow flickers twice, inviting/,
      }),
    );
    // Commit nothing; an unapplied Direct draft is session state that must
    // survive workspace switching exactly.
    const draftBox = within(screen.getByTestId("pv1-studio")).getByRole(
      "textbox",
      { name: "Beat purpose" },
    );
    await user.type(draftBox, "Hold the hush");
    await user.click(workspaceTab("Audio"));
    await user.click(workspaceTab("Scene board"));
    expect(scopeHeader().textContent).toContain("Scene 3 · Berry Patch");
    expect(scopeHeader().textContent).toContain(
      "Beat 2 · The glow flickers twice, inviting",
    );
    expect(
      (
        within(screen.getByTestId("pv1-studio")).getByRole("textbox", {
          name: "Beat purpose",
        }) as HTMLTextAreaElement
      ).value,
    ).toBe("Hold the hush");
  });
});
