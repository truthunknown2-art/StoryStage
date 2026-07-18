import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import {afterEach, describe, expect, it, vi} from "vitest";
import {App} from "./App";

const playerHarness = vi.hoisted(() => ({lastProps: null as Record<string, unknown> | null}));

vi.mock("@remotion/player", async () => {
  const React = await import("react");
  return {
    Player: React.forwardRef(function MockPlayer(props: Record<string, unknown>) {
      playerHarness.lastProps = props;
      return <div aria-label="Remotion animation" role="img" />;
    }),
  };
});

afterEach(() => {
  cleanup();
  playerHarness.lastProps = null;
  window.localStorage.clear();
  delete window.storyStage;
});

async function openHistoryBreakdown() {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole("button", {name: /Weird History/}));
  await user.click(screen.getByRole("button", {name: "Load a Weird History sample"}));
  await user.click(screen.getByRole("button", {name: "Break script into scenes"}));
  return user;
}

describe("CV-002 editable script breakdown", () => {
  it("opens arbitrary scripts in an honest draft review without mounting an animation", async () => {
    await openHistoryBreakdown();

    expect(screen.getByRole("heading", {name: "Shape the story before directing it."})).toBeInTheDocument();
    expect(screen.getByText("Draft breakdown")).toBeInTheDocument();
    expect(screen.getAllByText("Weird History").length).toBeGreaterThan(0);
    expect(screen.queryByLabelText("Remotion animation")).not.toBeInTheDocument();
    expect(playerHarness.lastProps).toBeNull();
    expect(screen.queryByText("Animated first cut")).not.toBeInTheDocument();
  });

  it("edits beat purpose, splits at the creator's cursor, and supports exact undo/redo", async () => {
    const user = await openHistoryBreakdown();
    const role = screen.getByLabelText("What job does this beat do?");

    await user.selectOptions(role, "reveal");
    expect(screen.getByRole("status")).toHaveTextContent("Changed role to reveal");
    expect(role).toHaveValue("reveal");

    await user.click(screen.getByRole("button", {name: "Undo story edit"}));
    expect(screen.getByRole("status")).toHaveTextContent("Undid story edit");
    expect(role).toHaveValue("setup");

    await user.click(screen.getByRole("button", {name: "Redo story edit"}));
    expect(screen.getByRole("status")).toHaveTextContent("Redid story edit");
    expect(role).toHaveValue("reveal");

    const beatSource = screen.getByLabelText("Source text") as HTMLTextAreaElement;
    beatSource.setSelectionRange(20, 20);
    fireEvent.select(beatSource);
    expect(screen.getByRole("button", {name: "Split at cursor"})).toBeEnabled();
    await user.click(screen.getByRole("button", {name: "Split at cursor"}));
    expect(screen.getByRole("status")).toHaveTextContent("Split beat");
  });

  it("shows the nine-field Weird History direction grammar and the exact production boundary", async () => {
    const user = await openHistoryBreakdown();
    await user.click(screen.getByRole("button", {name: /Review direction draft/}));

    expect(screen.getByRole("heading", {name: "Evidence first, hard cuts, and a faster editorial pulse."})).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Direction draft ready. Animation templates have not been assigned yet.");
    expect(screen.getAllByText("Visual treatment").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Camera").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sound effect").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Music").length).toBeGreaterThan(0);
    expect(screen.getAllByText("hard cut").length).toBeGreaterThan(0);
    expect(screen.getAllByText("editorial pulse").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", {name: "Build first cut"})).toBeDisabled();
    expect(screen.queryByLabelText("Remotion animation")).not.toBeInTheDocument();
  });

  it("restores a verified local direction draft without routing into ProductionComposition", async () => {
    const user = await openHistoryBreakdown();
    await user.selectOptions(screen.getByLabelText("What job does this beat do?"), "reveal");
    cleanup();
    render(<App />);

    const continueDraft = screen.getByRole("button", {name: /Continue direction draftThe Alaska Bargain/});
    expect(continueDraft).toBeInTheDocument();
    await user.click(continueDraft);
    expect(screen.getByRole("heading", {name: "Shape the story before directing it."})).toBeInTheDocument();
    expect(screen.getByLabelText("What job does this beat do?")).toHaveValue("reveal");
    expect(playerHarness.lastProps).toBeNull();
  });

  it("has no serious automated accessibility violations on breakdown and direction screens", async () => {
    document.documentElement.lang = "en";
    document.title = "StoryStage";
    const user = await openHistoryBreakdown();
    const breakdownAudit = await axe.run(document, {runOnly: {type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"]}});
    expect(breakdownAudit.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([]);

    await user.click(screen.getByRole("button", {name: /Review direction draft/}));
    const directionAudit = await axe.run(document, {runOnly: {type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"]}});
    expect(directionAudit.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([]);
  });
});
