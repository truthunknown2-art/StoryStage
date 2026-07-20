import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProductionComposition } from "@storystage/remotion-runtime";
import {
  createCv002ArtDirectionSelection,
  createCv002Project,
} from "@storystage/story-engine";
import { LegacyCreatorApp as App } from "./App";

const playerHarness = vi.hoisted(() => ({
  addEventListener: vi.fn(),
  isPlaying: vi.fn(() => false),
  pause: vi.fn(),
  play: vi.fn(),
  removeEventListener: vi.fn(),
  requestFullscreen: vi.fn(),
  seekTo: vi.fn(),
  listeners: {} as Record<
    string,
    (event: { detail: { frame: number } }) => void
  >,
  lastProps: null as Record<string, unknown> | null,
}));

const ARBITRARY_SCRIPT = Array.from(
  { length: 12 },
  () =>
    "A curious fox discovers a brass key beside the river and asks three friends to help identify the tiny carved stars on it.",
).join(" ");

vi.mock("@remotion/player", async () => {
  const React = await import("react");
  playerHarness.addEventListener.mockImplementation(
    (
      name: string,
      listener: (event: { detail: { frame: number } }) => void,
    ) => {
      playerHarness.listeners[name] = listener;
    },
  );
  playerHarness.removeEventListener.mockImplementation((name: string) => {
    delete playerHarness.listeners[name];
  });
  return {
    Player: React.forwardRef(function MockPlayer(
      props: Record<string, unknown>,
      ref: React.ForwardedRef<unknown>,
    ) {
      playerHarness.lastProps = props;
      React.useImperativeHandle(ref, () => playerHarness);
      return (
        <div
          aria-label="Remotion animation"
          data-duration={props.durationInFrames}
          role="img"
        />
      );
    }),
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  playerHarness.listeners = {};
  playerHarness.lastProps = null;
  window.localStorage.clear();
  delete window.storyStage;
});

async function openStudio() {
  const user = userEvent.setup();
  render(<App />);
  await user.click(
    screen.getByRole("button", { name: "Open engineering animation demo" }),
  );
  return user;
}

async function expectNoSeriousAccessibilityViolations() {
  const audit = await axe.run(document, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
  });
  expect(
    audit.violations.filter(
      (violation) =>
        violation.impact === "critical" || violation.impact === "serious",
    ),
  ).toEqual([]);
}

describe("CV-001 creator shell", () => {
  it("launches into Create instead of mounting the engineering cockpit", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", {
        name: /Turn your script into an animated first cut/,
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue(
      "The Storylight in the Little Wood",
    );
    expect(
      (screen.getByLabelText("Script") as HTMLTextAreaElement).value,
    ).toContain("Ollo bounces down the forest path");
    expect(screen.queryByDisplayValue(/Mara notices/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Open engineering animation demo",
      }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: /Kids Adventure/ }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Weird History/ })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: /Storybook Watercolor/ }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: /Cut Paper Collage/ }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: /Soft 2D Digital Illustration/ }),
    ).toBeEnabled();
    expect(
      screen.queryByText("Production confidence", { exact: false }),
    ).not.toBeInTheDocument();
  });

  it("routes changed scripts into the bounded draft workflow instead of the lantern animation", async () => {
    const user = userEvent.setup();
    render(<App />);
    const script = screen.getByLabelText("Script");

    await user.clear(script);
    await user.type(script, "Only one paragraph");

    expect(
      screen.getAllByText(/Paste 100 to 300 words/).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: "Create first cut" }),
    ).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Create animated first cut" }),
    ).not.toBeInTheDocument();
  });

  it("previews the canonical CV-002 beats for a valid arbitrary script", async () => {
    render(<App />);
    const title = (screen.getByLabelText("Title") as HTMLInputElement).value;
    const script = (screen.getByLabelText("Script") as HTMLTextAreaElement)
      .value;
    const expectedIds = createCv002Project(
      title,
      script,
      "kids-adventure",
      createCv002ArtDirectionSelection(
        "kids-adventure",
        "storybook-watercolor-paper-cutout",
      ),
    )
      .graph.scenes.flatMap((scene) => scene.beats)
      .slice(0, 4)
      .map((beat) => beat.id);
    const preview = screen.getByLabelText("Preview of natural beats");
    const cards = Array.from(
      preview.querySelectorAll<HTMLElement>("[data-beat-id]"),
    );

    expect(cards.map((card) => card.dataset.beatId)).toEqual(expectedIds);
  });

  it("derives a visible honest title when an arbitrary script is pasted, then creates with that title", async () => {
    const user = userEvent.setup();
    render(<App />);

    fireEvent.change(screen.getByLabelText("Script"), {
      target: { value: ARBITRARY_SCRIPT },
    });

    expect(screen.getByLabelText("Title")).toHaveValue(
      "A curious fox discovers a brass key beside",
    );
    expect(screen.getByText("Unsaved setup changes")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Create first cut" }));
    expect(
      screen.getByText("A curious fox discovers a brass key beside"),
    ).toBeInTheDocument();
    expect(screen.queryByText("The Lantern Discovery")).not.toBeInTheDocument();
  });

  it("marks title, script, grammar, and art-direction setup edits as unsaved", async () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "A Different Ollo Story" },
    });
    expect(screen.getByText("Unsaved setup changes")).toBeInTheDocument();

    cleanup();
    render(<App />);
    fireEvent.change(screen.getByLabelText("Script"), {
      target: { value: ARBITRARY_SCRIPT },
    });
    expect(screen.getByText("Unsaved setup changes")).toBeInTheDocument();

    cleanup();
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Weird History/ }));
    expect(screen.getByText("Unsaved setup changes")).toBeInTheDocument();

    cleanup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Cut Paper Collage/ }));
    expect(screen.getByText("Unsaved setup changes")).toBeInTheDocument();
  });

  it("does not discard dirty setup when opening the demo without an existing prototype", async () => {
    const user = userEvent.setup();
    render(<App />);
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "The Protected Draft" },
    });
    fireEvent.change(screen.getByLabelText("Script"), {
      target: { value: ARBITRARY_SCRIPT },
    });

    await user.click(
      screen.getByRole("button", { name: "Open engineering animation demo" }),
    );

    expect(
      screen.getByRole("alertdialog", {
        name: "Confirm opening engineering animation demo",
      }),
    ).toHaveTextContent("Discard unsaved setup changes?");
    expect(screen.getByLabelText("Title")).toHaveValue("The Protected Draft");
    expect(screen.getByLabelText("Script")).toHaveValue(ARBITRARY_SCRIPT);
    expect(screen.queryByLabelText("Animated preview")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Keep editing" }));

    expect(
      screen.queryByRole("alertdialog", {
        name: "Confirm opening engineering animation demo",
      }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue("The Protected Draft");
    expect(screen.getByLabelText("Script")).toHaveValue(ARBITRARY_SCRIPT);
  });

  it("keeps exact dirty setup when an edited demo exists and confirmation is cancelled", async () => {
    const user = await openStudio();
    await user.type(
      screen.getByLabelText("What should change?"),
      "Make the reaction bigger.",
    );
    await user.click(screen.getByRole("button", { name: "Update beat" }));
    await user.click(screen.getByRole("button", { name: "Back to Create" }));

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "The Exact Protected Setup" },
    });
    fireEvent.change(screen.getByLabelText("Script"), {
      target: { value: ARBITRARY_SCRIPT },
    });
    await user.click(screen.getByRole("button", { name: /Cut Paper Collage/ }));
    await user.click(screen.getByRole("button", { name: /Weird History/ }));

    await user.click(
      screen.getByRole("button", { name: "Open engineering animation demo" }),
    );

    expect(
      screen.getByRole("alertdialog", {
        name: "Confirm opening engineering animation demo",
      }),
    ).toHaveTextContent("Discard setup and replace the edited demo?");
    expect(screen.getByLabelText("Title")).toHaveValue(
      "The Exact Protected Setup",
    );
    expect(screen.getByLabelText("Script")).toHaveValue(ARBITRARY_SCRIPT);
    expect(
      screen.getByRole("button", { name: /^Weird History Explainer/ }),
    ).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "Keep editing" }));

    expect(screen.getByLabelText("Title")).toHaveValue(
      "The Exact Protected Setup",
    );
    expect(screen.getByLabelText("Script")).toHaveValue(ARBITRARY_SCRIPT);
    expect(
      screen.getByRole("button", { name: /^Weird History Explainer/ }),
    ).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: /Kids Adventure/ }));
    expect(
      screen.getByRole("button", { name: /Cut Paper Collage/ }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("does not call a fresh Ollo setup saved merely because older work reloads", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Create first cut" }));

    cleanup();
    render(<App />);

    expect(screen.getByText("Unsaved setup changes")).toBeInTheDocument();
    expect(screen.queryByText("Saved on this device")).not.toBeInTheDocument();
  });

  it("labels the Mara demo visibly as an engineering demo", async () => {
    await openStudio();
    expect(screen.getByText("Engineering demo")).toBeInTheDocument();
  });

  it("opens a real preview with exactly three creator-facing beat cards", async () => {
    await openStudio();
    const rail = screen.getByRole("navigation", { name: "Scenes and beats" });

    expect(within(rail).getAllByRole("button")).toHaveLength(3);
    expect(
      within(rail).getByRole("button", { name: /Notice the lantern/ }),
    ).toBeInTheDocument();
    expect(
      within(rail).getByRole("button", { name: /Pick up the lantern/ }),
    ).toBeInTheDocument();
    expect(
      within(rail).getByRole("button", { name: /Show the lantern/ }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Animated preview")).toBeInTheDocument();
    expect(playerHarness.lastProps?.component).toBe(ProductionComposition);
    expect(playerHarness.lastProps?.durationInFrames).toBe(300);
    expect(playerHarness.lastProps?.inputProps).toMatchObject({
      playbackAssets: {},
      sliceDurationInFrames: 300,
      showMotionDiagnostics: false,
    });
    expect(
      (playerHarness.lastProps?.inputProps as { directedSceneMotion?: unknown })
        .directedSceneMotion,
    ).toBeDefined();
    expect(playerHarness.seekTo).toHaveBeenCalledWith(0);
    expect(playerHarness.play).toHaveBeenCalled();
  });

  it("has no critical or serious automated accessibility violations on Create", async () => {
    document.documentElement.lang = "en";
    document.title = "StoryStage";
    render(<App />);
    await expectNoSeriousAccessibilityViolations();
  });

  it("has no critical or serious automated accessibility violations on Studio", async () => {
    document.documentElement.lang = "en";
    document.title = "StoryStage";
    await openStudio();
    await expectNoSeriousAccessibilityViolations();
  });

  it("seeks to exact beat starts and plays only the selected beat", async () => {
    const user = await openStudio();
    vi.clearAllMocks();
    const rail = screen.getByRole("navigation", { name: "Scenes and beats" });

    await user.click(
      within(rail).getByRole("button", { name: /Pick up the lantern/ }),
    );
    expect(playerHarness.seekTo).toHaveBeenLastCalledWith(90);
    expect(playerHarness.play).toHaveBeenCalled();

    await user.click(
      within(rail).getByRole("button", { name: /Show the lantern/ }),
    );
    expect(playerHarness.seekTo).toHaveBeenLastCalledWith(210);
    expect(
      within(rail).getByRole("button", { name: /Show the lantern/ }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps technical evidence in a closed Advanced drawer", async () => {
    const user = await openStudio();

    expect(
      screen.queryByRole("complementary", { name: "Advanced" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Render-plan hash")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Advanced" }));
    expect(
      screen.getByRole("complementary", { name: "Advanced" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Render-plan hash")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open engineering production tools" }),
    ).toBeInTheDocument();
  });

  it("applies the required Beat 3 direction locally, then undoes and redoes exact motion", async () => {
    const user = await openStudio();
    const rail = screen.getByRole("navigation", { name: "Scenes and beats" });
    const before = structuredClone(
      (
        playerHarness.lastProps?.inputProps as {
          directedSceneMotion: {
            contentHash: string;
            bindings: Array<{ contentHash: string }>;
          };
        }
      ).directedSceneMotion,
    );
    vi.clearAllMocks();

    await user.click(
      within(rail).getByRole("button", { name: /Show the lantern/ }),
    );
    await user.type(
      screen.getByLabelText("What should change?"),
      "Make the reaction bigger and hold it longer.",
    );
    await user.click(screen.getByRole("button", { name: "Update beat" }));

    const edited = (
      playerHarness.lastProps?.inputProps as {
        directedSceneMotion: {
          contentHash: string;
          bindings: Array<{ contentHash: string }>;
        };
      }
    ).directedSceneMotion;
    expect(edited.bindings[0]!.contentHash).toBe(
      before.bindings[0]!.contentHash,
    );
    expect(edited.bindings[1]!.contentHash).toBe(
      before.bindings[1]!.contentHash,
    );
    expect(edited.bindings[2]!.contentHash).not.toBe(
      before.bindings[2]!.contentHash,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Updated “Show the lantern”",
    );
    expect(playerHarness.seekTo).toHaveBeenLastCalledWith(210);
    expect(playerHarness.play).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Undo direction" }));
    const undone = (
      playerHarness.lastProps?.inputProps as {
        directedSceneMotion: { contentHash: string };
      }
    ).directedSceneMotion;
    expect(undone.contentHash).toBe(before.contentHash);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Undid direction change",
    );

    await user.click(screen.getByRole("button", { name: "Redo direction" }));
    const redone = (
      playerHarness.lastProps?.inputProps as {
        directedSceneMotion: { contentHash: string };
      }
    ).directedSceneMotion;
    expect(redone.contentHash).toBe(edited.contentHash);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Redid direction change",
    );
  });

  it("rejects unsupported direction without changing Player input or history", async () => {
    const user = await openStudio();
    const before = (
      playerHarness.lastProps?.inputProps as {
        directedSceneMotion: { contentHash: string };
      }
    ).directedSceneMotion.contentHash;

    await user.type(
      screen.getByLabelText("What should change?"),
      "Make it feel more magical and Pixar-like.",
    );
    await user.click(screen.getByRole("button", { name: "Update beat" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "outside this prototype",
    );
    expect(
      (
        playerHarness.lastProps?.inputProps as {
          directedSceneMotion: { contentHash: string };
        }
      ).directedSceneMotion.contentHash,
    ).toBe(before);
    expect(screen.getByText("No direction changes yet.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Undo direction" }),
    ).toBeDisabled();
  });

  it("applies from the Director field with Ctrl+Enter", async () => {
    const user = await openStudio();
    const field = screen.getByLabelText("What should change?");
    await user.type(field, "Make it bigger");
    await user.keyboard("{Control>}{Enter}{/Control}");
    expect(screen.getByRole("status")).toHaveTextContent("Updated");
  });

  it("uses Player frame events as the active-beat clock", async () => {
    await openStudio();
    const rail = screen.getByRole("navigation", { name: "Scenes and beats" });
    playerHarness.listeners.frameupdate?.({ detail: { frame: 215 } });
    await waitFor(() =>
      expect(
        within(rail).getByRole("button", { name: /Show the lantern/ }),
      ).toHaveAttribute("aria-current", "true"),
    );
  });

  it("restores verified edits through a Continue card after reload", async () => {
    const user = await openStudio();
    const rail = screen.getByRole("navigation", { name: "Scenes and beats" });
    await user.click(
      within(rail).getByRole("button", { name: /Show the lantern/ }),
    );
    await user.type(
      screen.getByLabelText("What should change?"),
      "Make it bigger",
    );
    await user.click(screen.getByRole("button", { name: "Update beat" }));
    const editedHash = (
      playerHarness.lastProps?.inputProps as {
        directedSceneMotion: { contentHash: string };
      }
    ).directedSceneMotion.contentHash;

    cleanup();
    render(<App />);
    expect(
      screen.getByRole("button", {
        name: /Continue animated prototypeThe Lantern Discovery/,
      }),
    ).toBeInTheDocument();
    vi.clearAllMocks();
    await user.click(
      screen.getByRole("button", {
        name: /Continue animated prototypeThe Lantern Discovery/,
      }),
    );
    expect(
      (
        playerHarness.lastProps?.inputProps as {
          directedSceneMotion: { contentHash: string };
        }
      ).directedSceneMotion.contentHash,
    ).toBe(editedHash);
    expect(
      within(
        screen.getByRole("navigation", { name: "Scenes and beats" }),
      ).getByRole("button", { name: /Show the lantern/ }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(playerHarness.seekTo).toHaveBeenLastCalledWith(210);
    expect(playerHarness.play).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { name: "Show the lantern" }),
    ).toBeInTheDocument();
  });

  it("fails closed when local creator state is corrupt", () => {
    window.localStorage.setItem(
      "storystage.cv001.creator.v1",
      JSON.stringify({ schemaVersion: "1.0", title: "tampered" }),
    );
    render(<App />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "could not be verified",
    );
    expect(
      screen.queryByRole("button", { name: /Continue/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create first cut" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", {
        name: "Open engineering animation demo",
      }),
    ).toBeEnabled();
  });
});
