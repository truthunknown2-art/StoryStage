import {cleanup, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach, describe, expect, it, vi} from "vitest";
import {StoryStageErrorBoundary} from "./AppErrorBoundary";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function BrokenWorkspace(): never {
  throw new Error("simulated renderer failure");
}

describe("StoryStage error boundary", () => {
  it("keeps a renderer exception recoverable instead of leaving a blank window", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const reload = vi.fn();
    render(<StoryStageErrorBoundary onReload={reload}><BrokenWorkspace /></StoryStageErrorBoundary>);

    expect(screen.getByRole("heading", {name: "StoryStage hit a display error."})).toBeInTheDocument();
    expect(screen.getByText(/Saved local productions are untouched/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", {name: "Reload StoryStage"}));
    expect(reload).toHaveBeenCalledOnce();
  });
});
