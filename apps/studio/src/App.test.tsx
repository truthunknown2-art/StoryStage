import {cleanup, render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach, describe, expect, it, vi} from "vitest";
import {StrictMode} from "react";
import {App} from "./App";

vi.mock("@remotion/player", () => ({
  Player: () => <div data-testid="remotion-player">Remotion preview</div>,
}));

afterEach(() => {
  cleanup();
  delete window.storyStage;
});

describe("StoryStage studio", () => {
  it("opens the sample production and exposes the directing workspace", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole("heading", {name: "Recent productions"})).toBeInTheDocument();
    await user.click(screen.getByRole("button", {name: "Open The Dancing Plague"}));

    expect(screen.getByTestId("remotion-player")).toBeInTheDocument();
    expect(screen.getByRole("region", {name: "Scenes"})).toBeInTheDocument();
    expect(screen.getByRole("region", {name: "Semantic timeline"})).toBeInTheDocument();
    expect(screen.getAllByText("Slow push")).toHaveLength(2);
  });

  it("changes the selected shot when a scene is selected", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", {name: "Open The Dancing Plague"}));
    await user.click(screen.getByRole("button", {name: /The story pivots/}));
    await user.click(screen.getByRole("button", {name: /2.02 · Otto points/}));

    expect(screen.getByRole("heading", {name: "Otto points"})).toBeInTheDocument();
    expect(screen.getByText("2.02")).toBeInTheDocument();
  });

  it("updates the inspector for scene, shot, timeline, and character-action selections", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", {name: "Open The Dancing Plague"}));

    await user.click(screen.getByRole("button", {name: /01An ordinary morning/}));
    expect(screen.getByRole("heading", {name: "Square establishes"})).toBeInTheDocument();

    await user.click(screen.getByRole("button", {name: /1.02 · Iris notices/}));
    expect(screen.getByRole("heading", {name: "Iris notices"})).toBeInTheDocument();

    await user.click(screen.getByRole("button", {name: "Wide hold"}));
    expect(screen.getByText("Locked 16:9 master")).toBeInTheDocument();

    await user.click(screen.getByRole("button", {name: "Skeptical hold"}));
    expect(screen.getAllByText("Skeptical hold")).toHaveLength(2);
    expect(screen.getByText("Reaction pose")).toBeInTheDocument();
  });

  it("visibly disables local rendering in browser mode without creating a job", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", {name: "Open The Dancing Plague"}));

    const renderButton = screen.getByRole("button", {name: "Render"});
    await waitFor(() => expect(renderButton).toBeDisabled());
    expect(screen.getByText("Desktop app required for local rendering")).toBeInTheDocument();
    expect(screen.queryByText("Preview render complete")).not.toBeInTheDocument();
  });

  it("keeps desktop subscriptions StrictMode-safe", async () => {
    const user = userEvent.setup();
    let activeListeners = 0;
    const subscribeToRenderJobs = vi.fn(() => {
      activeListeners += 1;
      return () => { activeListeners -= 1; };
    });
    window.storyStage = {
      getCapabilities: vi.fn(async () => ({localRendering: true, openRenderedFile: true})),
      startSampleRender: vi.fn(async () => ({jobId: "job-1"})),
      subscribeToRenderJobs,
      openRenderedFile: vi.fn(async () => ({ok: true as const})),
    };

    const view = render(<StrictMode><App /></StrictMode>);
    await user.click(screen.getByRole("button", {name: "Open The Dancing Plague"}));
    await waitFor(() => expect(activeListeners).toBe(1));
    expect(subscribeToRenderJobs).toHaveBeenCalledTimes(2);
    view.unmount();
    expect(activeListeners).toBe(0);
  });
});
