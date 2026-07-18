import {cleanup, render, screen, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  lastProps: null as Record<string, unknown> | null,
}));

vi.mock("@remotion/player", async () => {
  const React = await import("react");
  return {
    Player: React.forwardRef(function MockPlayer(
      props: Record<string, unknown>,
      ref: React.ForwardedRef<unknown>,
    ) {
      playerHarness.lastProps = props;
      React.useImperativeHandle(ref, () => playerHarness);
      return <div aria-label="Remotion animation" data-duration={props.durationInFrames} />;
    }),
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  playerHarness.lastProps = null;
  delete window.storyStage;
});

async function openStudio() {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole("button", {name: "Create animated first cut"}));
  return user;
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
});
