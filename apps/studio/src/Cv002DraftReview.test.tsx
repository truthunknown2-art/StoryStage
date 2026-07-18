import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProductionComposition } from "@storystage/remotion-runtime";
import { DirectorProductionComposition } from "@storystage/remotion-runtime/director";
import { App } from "./App";

const playerHarness = vi.hoisted(() => ({
  lastProps: null as Record<string, unknown> | null,
}));

vi.mock("@remotion/player", async () => {
  const React = await import("react");
  return {
    Player: React.forwardRef(function MockPlayer(
      props: Record<string, unknown>,
    ) {
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
  await user.click(screen.getByRole("button", { name: /Weird History/ }));
  await user.click(
    screen.getByRole("button", { name: "Load a Weird History sample" }),
  );
  await user.click(
    screen.getByRole("button", { name: "Break script into scenes" }),
  );
  return user;
}

async function openKidsBreakdown() {
  const user = userEvent.setup();
  render(<App />);
  await user.click(
    screen.getByRole("button", { name: "Load a longer Kids script sample" }),
  );
  await user.click(
    screen.getByRole("button", { name: "Break script into scenes" }),
  );
  return user;
}

async function assignKidsTemplate(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole("button", { name: /Review direction draft/ }),
  );
  await user.click(
    screen.getByText(/Advanced.*legacy animation capability prototype/),
  );
  const scene = screen.getByLabelText("Three-beat scene") as HTMLSelectElement;
  await user.selectOptions(scene, scene.options[1]!.value);
  const notice = screen.getByLabelText(
    "1 · Notice object",
  ) as HTMLSelectElement;
  const pickup = screen.getByLabelText(
    "2 · Reach and pick up",
  ) as HTMLSelectElement;
  const present = screen.getByLabelText(
    "3 · React and present",
  ) as HTMLSelectElement;
  await user.selectOptions(notice, notice.options[1]!.value);
  await user.selectOptions(pickup, pickup.options[2]!.value);
  await user.selectOptions(present, present.options[3]!.value);
  await user.click(
    screen.getByRole("button", { name: /Mara paper-cut prototype/ }),
  );
  await user.click(
    screen.getByRole("button", { name: /Lantern paper-cut prototype/ }),
  );
  await user.click(
    screen.getByRole("button", { name: "Verify and assign template" }),
  );
}

describe("CV-002 editable script breakdown", () => {
  it("opens arbitrary scripts in an honest draft review without mounting an animation", async () => {
    await openHistoryBreakdown();

    expect(
      screen.getByRole("heading", {
        name: "Shape the story before directing it.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Draft breakdown")).toBeInTheDocument();
    expect(screen.getAllByText("Weird History").length).toBeGreaterThan(0);
    expect(
      screen.queryByLabelText("Remotion animation"),
    ).not.toBeInTheDocument();
    expect(playerHarness.lastProps).toBeNull();
    expect(screen.queryByText("Animated first cut")).not.toBeInTheDocument();
  });

  it("edits beat purpose, splits at the creator's cursor, and supports exact undo/redo", async () => {
    const user = await openHistoryBreakdown();
    const role = screen.getByLabelText("What job does this beat do?");

    await user.selectOptions(role, "reveal");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Changed role to reveal",
    );
    expect(role).toHaveValue("reveal");

    await user.click(screen.getByRole("button", { name: "Undo story edit" }));
    expect(screen.getByRole("status")).toHaveTextContent("Undid story edit");
    expect(role).toHaveValue("setup");

    await user.click(screen.getByRole("button", { name: "Redo story edit" }));
    expect(screen.getByRole("status")).toHaveTextContent("Redid story edit");
    expect(role).toHaveValue("reveal");

    const beatSource = screen.getByLabelText(
      "Source text",
    ) as HTMLTextAreaElement;
    beatSource.setSelectionRange(20, 20);
    fireEvent.select(beatSource);
    expect(
      screen.getByRole("button", { name: "Split at cursor" }),
    ).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Split at cursor" }));
    expect(screen.getByRole("status")).toHaveTextContent("Split beat");
  });

  it("shows the Weird History direction grammar and mounts the canonical directed animatic", async () => {
    const user = await openHistoryBreakdown();
    await user.click(
      screen.getByRole("button", { name: /Review direction draft/ }),
    );
    await user.click(
      screen.getByText(/Advanced.*legacy animation capability prototype/),
    );

    expect(
      screen.getByRole("heading", {
        name: "Evidence first, hard cuts, and a faster editorial pulse.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Directed proxy animatic ready. Final animation capabilities are not fully assigned.",
    );
    expect(screen.getAllByText("Visual treatment").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Camera").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sound effect").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Music").length).toBeGreaterThan(0);
    expect(screen.getAllByText("hard cut").length).toBeGreaterThan(0);
    expect(screen.getAllByText("editorial pulse").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Remotion animation")).toBeInTheDocument();
    expect(playerHarness.lastProps?.component).toBe(
      DirectorProductionComposition,
    );
    expect(
      (
        playerHarness.lastProps?.inputProps as {
          episodePlan?: { renderMode: string };
        }
      ).episodePlan?.renderMode,
    ).toBe("proxy-animatic");
    expect(screen.getByLabelText("Directed animatic draft")).toHaveAttribute(
      "data-episode-hash",
    );
  });

  it("restores a verified local direction draft without routing into ProductionComposition", async () => {
    const user = await openHistoryBreakdown();
    await user.selectOptions(
      screen.getByLabelText("What job does this beat do?"),
      "reveal",
    );
    cleanup();
    render(<App />);

    const continueDraft = screen.getByRole("button", {
      name: /Continue direction draftThe Alaska Bargain/,
    });
    expect(continueDraft).toBeInTheDocument();
    await user.click(continueDraft);
    expect(
      screen.getByRole("heading", {
        name: "Shape the story before directing it.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("What job does this beat do?")).toHaveValue(
      "reveal",
    );
    expect(playerHarness.lastProps).toBeNull();
  });

  it("has no serious automated accessibility violations on breakdown and direction screens", async () => {
    document.documentElement.lang = "en";
    document.title = "StoryStage";
    const user = await openHistoryBreakdown();
    const breakdownAudit = await axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
    });
    expect(
      breakdownAudit.violations.filter(
        (violation) =>
          violation.impact === "critical" || violation.impact === "serious",
      ),
    ).toEqual([]);

    await user.click(
      screen.getByRole("button", { name: /Review direction draft/ }),
    );
    await user.click(
      screen.getByText(/Advanced.*legacy animation capability prototype/),
    );
    const directionAudit = await axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
    });
    expect(
      directionAudit.violations.filter(
        (violation) =>
          violation.impact === "critical" || violation.impact === "serious",
      ),
    ).toEqual([]);
  });

  it("mounts the Kids canonical animatic while keeping the legacy articulated template behind explicit assignment", async () => {
    const user = await openKidsBreakdown();
    await user.click(
      screen.getByRole("button", { name: /Review direction draft/ }),
    );

    expect(
      screen.getByRole("heading", { name: "Map a Kids scene to real motion" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Verify and assign template" }),
    ).toBeDisabled();
    expect(playerHarness.lastProps?.component).toBe(
      DirectorProductionComposition,
    );
    expect(
      screen.queryByLabelText("Assigned animated scene preview"),
    ).not.toBeInTheDocument();

    const scene = screen.getByLabelText(
      "Three-beat scene",
    ) as HTMLSelectElement;
    await user.selectOptions(scene, scene.options[1]!.value);
    const notice = screen.getByLabelText(
      "1 · Notice object",
    ) as HTMLSelectElement;
    const pickup = screen.getByLabelText(
      "2 · Reach and pick up",
    ) as HTMLSelectElement;
    const present = screen.getByLabelText(
      "3 · React and present",
    ) as HTMLSelectElement;
    await user.selectOptions(notice, notice.options[1]!.value);
    await user.selectOptions(pickup, pickup.options[2]!.value);
    await user.selectOptions(present, present.options[3]!.value);
    await user.click(
      screen.getByRole("button", { name: /Mara paper-cut prototype/ }),
    );
    await user.click(
      screen.getByRole("button", { name: /Lantern paper-cut prototype/ }),
    );
    expect(
      screen.getByRole("button", { name: "Verify and assign template" }),
    ).toBeEnabled();
    await user.click(
      screen.getByRole("button", { name: "Verify and assign template" }),
    );

    expect(
      screen.getByRole("heading", {
        name: "Object discovery template assigned",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Preview animated scene" }),
    ).toBeEnabled();
    expect(playerHarness.lastProps?.component).toBe(
      DirectorProductionComposition,
    );
    await user.click(
      screen.getByRole("button", { name: "Preview animated scene" }),
    );
    expect(
      screen.getByLabelText("Assigned animated scene preview"),
    ).toBeInTheDocument();
    expect(
      (playerHarness.lastProps as Record<string, unknown> | null)?.component,
    ).toBe(ProductionComposition);
    expect(playerHarness.lastProps?.durationInFrames).toBe(300);
    expect(
      (
        playerHarness.lastProps?.inputProps as {
          directedSceneMotion?: { bindings: unknown[] };
        }
      ).directedSceneMotion?.bindings,
    ).toHaveLength(3);
  });

  it("invalidates an assigned preview when its graph is edited and requires explicit review again", async () => {
    const user = await openKidsBreakdown();
    await assignKidsTemplate(user);
    await user.click(screen.getByRole("button", { name: /Scenes & beats/ }));
    await user.selectOptions(
      screen.getByLabelText("What job does this beat do?"),
      "reveal",
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "template assignment was invalidated",
    );
    await user.click(screen.getByRole("button", { name: /Direction draft/ }));
    await user.click(
      screen.getByText(/Advanced.*legacy animation capability prototype/),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Directed proxy animatic ready. Final animation capabilities are not fully assigned.",
    );
    expect(
      screen.queryByRole("button", { name: "Preview animated scene" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Map a Kids scene to real motion" }),
    ).toBeInTheDocument();
  });

  it("restores only a verified template assignment and keeps preview behind a fresh click", async () => {
    const user = await openKidsBreakdown();
    await assignKidsTemplate(user);
    cleanup();
    playerHarness.lastProps = null;
    render(<App />);
    await user.click(
      screen.getByRole("button", {
        name: /Continue direction draftThe Blue Lantern Trail/,
      }),
    );
    await user.click(screen.getByRole("button", { name: /Direction draft/ }));
    await user.click(
      screen.getByText(/Advanced.*legacy animation capability prototype/),
    );

    expect(
      screen.getByRole("heading", {
        name: "Object discovery template assigned",
      }),
    ).toBeInTheDocument();
    expect(
      (playerHarness.lastProps as Record<string, unknown> | null)?.component,
    ).toBe(DirectorProductionComposition);
    await user.click(
      screen.getByRole("button", { name: "Preview animated scene" }),
    );
    expect(
      (playerHarness.lastProps as Record<string, unknown> | null)?.component,
    ).toBe(ProductionComposition);
  });
});
