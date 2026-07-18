import {cleanup, render, screen, waitFor, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import {afterEach, describe, expect, it, vi} from "vitest";
import {ProductionComposition} from "@storystage/remotion-runtime";
import {App} from "./App";

const playerHarness = vi.hoisted(() => ({
  addEventListener: vi.fn(),
  isPlaying: vi.fn(() => false),
  pause: vi.fn(),
  play: vi.fn(),
  removeEventListener: vi.fn(),
  requestFullscreen: vi.fn(),
  seekTo: vi.fn(),
  listeners: {} as Record<string, (event: {detail: {frame: number}}) => void>,
  lastProps: null as Record<string, unknown> | null,
}));

vi.mock("@remotion/player", async () => {
  const React = await import("react");
  playerHarness.addEventListener.mockImplementation((name: string, listener: (event: {detail: {frame: number}}) => void) => {
    playerHarness.listeners[name] = listener;
  });
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
      return <div aria-label="Remotion animation" data-duration={props.durationInFrames} role="img" />;
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
  await user.click(screen.getByRole("button", {name: "Create animated first cut"}));
  return user;
}

async function expectNoSeriousAccessibilityViolations() {
  const audit = await axe.run(document, {
    runOnly: {type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"]},
  });
  expect(audit.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious"))
    .toEqual([]);
}

describe("CV-001 creator shell", () => {
  it("launches into Create instead of mounting the engineering cockpit", () => {
    render(<App />);

    expect(screen.getByRole("heading", {name: /Start with the words/})).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue("The Lantern Discovery");
    expect((screen.getByLabelText("Script") as HTMLTextAreaElement).value).toContain("Mara notices");
    expect(screen.getByRole("button", {name: /Kids Adventure/})).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", {name: /Weird History/})).toBeDisabled();
    expect(screen.getByRole("button", {name: /Cut-paper forest/})).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", {name: /Storybook ink/})).toBeDisabled();
    expect(screen.queryByText("Production confidence", {exact: false})).not.toBeInTheDocument();
  });

  it("requires exactly three paragraphs before creating the cut", async () => {
    const user = userEvent.setup();
    render(<App />);
    const script = screen.getByLabelText("Script");

    await user.clear(script);
    await user.type(script, "Only one paragraph");

    expect(screen.getByText(/exactly three non-empty paragraphs/)).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Create animated first cut"})).toBeDisabled();
  });

  it("opens a real preview with exactly three creator-facing beat cards", async () => {
    await openStudio();
    const rail = screen.getByRole("navigation", {name: "Scenes and beats"});

    expect(within(rail).getAllByRole("button")).toHaveLength(3);
    expect(within(rail).getByRole("button", {name: /Notice the lantern/})).toBeInTheDocument();
    expect(within(rail).getByRole("button", {name: /Pick up the lantern/})).toBeInTheDocument();
    expect(within(rail).getByRole("button", {name: /Show the lantern/})).toBeInTheDocument();
    expect(screen.getByLabelText("Animated preview")).toBeInTheDocument();
    expect(playerHarness.lastProps?.component).toBe(ProductionComposition);
    expect(playerHarness.lastProps?.durationInFrames).toBe(300);
    expect(playerHarness.lastProps?.inputProps).toMatchObject({
      playbackAssets: {},
      sliceDurationInFrames: 300,
      showMotionDiagnostics: false,
    });
    expect((playerHarness.lastProps?.inputProps as {directedSceneMotion?: unknown}).directedSceneMotion).toBeDefined();
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
    const rail = screen.getByRole("navigation", {name: "Scenes and beats"});

    await user.click(within(rail).getByRole("button", {name: /Pick up the lantern/}));
    expect(playerHarness.seekTo).toHaveBeenLastCalledWith(90);
    expect(playerHarness.play).toHaveBeenCalled();

    await user.click(within(rail).getByRole("button", {name: /Show the lantern/}));
    expect(playerHarness.seekTo).toHaveBeenLastCalledWith(210);
    expect(within(rail).getByRole("button", {name: /Show the lantern/})).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps technical evidence in a closed Advanced drawer", async () => {
    const user = await openStudio();

    expect(screen.queryByRole("complementary", {name: "Advanced"})).not.toBeInTheDocument();
    expect(screen.queryByText("Render-plan hash")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", {name: "Advanced"}));
    expect(screen.getByRole("complementary", {name: "Advanced"})).toBeInTheDocument();
    expect(screen.getByText("Render-plan hash")).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Open engineering production tools"})).toBeInTheDocument();
  });

  it("applies the required Beat 3 direction locally, then undoes and redoes exact motion", async () => {
    const user = await openStudio();
    const rail = screen.getByRole("navigation", {name: "Scenes and beats"});
    const before = structuredClone(
      (playerHarness.lastProps?.inputProps as {directedSceneMotion: {contentHash: string; bindings: Array<{contentHash: string}>}}).directedSceneMotion,
    );
    vi.clearAllMocks();

    await user.click(within(rail).getByRole("button", {name: /Show the lantern/}));
    await user.type(screen.getByLabelText("What should change?"), "Make the reaction bigger and hold it longer.");
    await user.click(screen.getByRole("button", {name: "Update beat"}));

    const edited = (playerHarness.lastProps?.inputProps as {directedSceneMotion: {contentHash: string; bindings: Array<{contentHash: string}>}}).directedSceneMotion;
    expect(edited.bindings[0]!.contentHash).toBe(before.bindings[0]!.contentHash);
    expect(edited.bindings[1]!.contentHash).toBe(before.bindings[1]!.contentHash);
    expect(edited.bindings[2]!.contentHash).not.toBe(before.bindings[2]!.contentHash);
    expect(screen.getByRole("status")).toHaveTextContent("Updated “Show the lantern”");
    expect(playerHarness.seekTo).toHaveBeenLastCalledWith(210);
    expect(playerHarness.play).toHaveBeenCalled();

    await user.click(screen.getByRole("button", {name: "Undo direction"}));
    const undone = (playerHarness.lastProps?.inputProps as {directedSceneMotion: {contentHash: string}}).directedSceneMotion;
    expect(undone.contentHash).toBe(before.contentHash);
    expect(screen.getByRole("status")).toHaveTextContent("Undid direction change");

    await user.click(screen.getByRole("button", {name: "Redo direction"}));
    const redone = (playerHarness.lastProps?.inputProps as {directedSceneMotion: {contentHash: string}}).directedSceneMotion;
    expect(redone.contentHash).toBe(edited.contentHash);
    expect(screen.getByRole("status")).toHaveTextContent("Redid direction change");
  });

  it("rejects unsupported direction without changing Player input or history", async () => {
    const user = await openStudio();
    const before = (playerHarness.lastProps?.inputProps as {directedSceneMotion: {contentHash: string}}).directedSceneMotion.contentHash;

    await user.type(screen.getByLabelText("What should change?"), "Make it feel more magical and Pixar-like.");
    await user.click(screen.getByRole("button", {name: "Update beat"}));

    expect(screen.getByRole("alert")).toHaveTextContent("outside this prototype");
    expect((playerHarness.lastProps?.inputProps as {directedSceneMotion: {contentHash: string}}).directedSceneMotion.contentHash).toBe(before);
    expect(screen.getByText("No direction changes yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Undo direction"})).toBeDisabled();
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
    const rail = screen.getByRole("navigation", {name: "Scenes and beats"});
    playerHarness.listeners.frameupdate?.({detail: {frame: 215}});
    await waitFor(() => expect(within(rail).getByRole("button", {name: /Show the lantern/})).toHaveAttribute("aria-current", "true"));
  });

  it("restores verified edits through a Continue card after reload", async () => {
    const user = await openStudio();
    const rail = screen.getByRole("navigation", {name: "Scenes and beats"});
    await user.click(within(rail).getByRole("button", {name: /Show the lantern/}));
    await user.type(screen.getByLabelText("What should change?"), "Make it bigger");
    await user.click(screen.getByRole("button", {name: "Update beat"}));
    const editedHash = (playerHarness.lastProps?.inputProps as {directedSceneMotion: {contentHash: string}}).directedSceneMotion.contentHash;

    cleanup();
    render(<App />);
    expect(screen.getByRole("button", {name: /ContinueThe Lantern Discovery/})).toBeInTheDocument();
    vi.clearAllMocks();
    await user.click(screen.getByRole("button", {name: /ContinueThe Lantern Discovery/}));
    expect((playerHarness.lastProps?.inputProps as {directedSceneMotion: {contentHash: string}}).directedSceneMotion.contentHash).toBe(editedHash);
    expect(within(screen.getByRole("navigation", {name: "Scenes and beats"})).getByRole("button", {name: /Show the lantern/})).toHaveAttribute("aria-pressed", "true");
    expect(playerHarness.seekTo).toHaveBeenLastCalledWith(210);
    expect(playerHarness.play).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", {name: "Show the lantern"})).toBeInTheDocument();
  });

  it("fails closed when local creator state is corrupt", () => {
    window.localStorage.setItem("storystage.cv001.creator.v1", JSON.stringify({schemaVersion: "1.0", title: "tampered"}));
    render(<App />);

    expect(screen.getByRole("status")).toHaveTextContent("could not be verified");
    expect(screen.queryByRole("button", {name: /Continue/})).not.toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Create animated first cut"})).toBeEnabled();
  });
});
