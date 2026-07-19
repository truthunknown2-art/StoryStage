import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { act } from "react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProductionComposition } from "@storystage/remotion-runtime";
import { DirectorProductionComposition } from "@storystage/remotion-runtime/director";
import { App } from "./App";

const playerHarness = vi.hoisted(() => ({
  lastProps: null as Record<string, unknown> | null,
  lastSeek: null as number | null,
  frameListener: null as
    | ((event: { detail: { frame: number } }) => void)
    | null,
}));

vi.mock("@remotion/player", async () => {
  const React = await import("react");
  return {
    Player: React.forwardRef(function MockPlayer(
      props: Record<string, unknown>,
      ref,
    ) {
      playerHarness.lastProps = props;
      React.useImperativeHandle(ref, () => ({
        addEventListener: (
          name: string,
          listener: typeof playerHarness.frameListener,
        ) => {
          if (name === "frameupdate") playerHarness.frameListener = listener;
        },
        removeEventListener: (
          name: string,
          listener: typeof playerHarness.frameListener,
        ) => {
          if (
            name === "frameupdate" &&
            playerHarness.frameListener === listener
          )
            playerHarness.frameListener = null;
        },
        seekTo: (frame: number) => {
          playerHarness.lastSeek = frame;
        },
        play: vi.fn(),
        pause: vi.fn(),
      }));
      return <div aria-label="Remotion animation" role="img" />;
    }),
  };
});

afterEach(() => {
  cleanup();
  playerHarness.lastProps = null;
  playerHarness.lastSeek = null;
  playerHarness.frameListener = null;
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
  await user.click(screen.getByRole("button", { name: "Create first cut" }));
  return user;
}

async function openKidsBreakdown() {
  const user = userEvent.setup();
  render(<App />);
  await user.click(
    screen.getByRole("button", {
      name: "Load an Ollo & Friends sample script",
    }),
  );
  await user.click(screen.getByRole("button", { name: "Create first cut" }));
  return user;
}

async function assignKidsTemplate(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole("button", { name: /Review direction draft/ }),
  );
  await openAdvancedProductionDetails(user);
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

async function openAdvancedProductionDetails(
  user: ReturnType<typeof userEvent.setup>,
) {
  await user.click(screen.getByText("Advanced production details"));
  await user.click(screen.getByText("Animation capability prototype"));
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

  it("shows the creator-first Weird History studio and mounts the canonical directed animatic", async () => {
    const user = await openHistoryBreakdown();
    await user.click(
      screen.getByRole("button", { name: /Review direction draft/ }),
    );
    await openAdvancedProductionDetails(user);

    expect(
      screen.getByRole("heading", { name: "The Alaska Bargain" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Draft animatic ready",
    );
    expect(screen.getByLabelText("Studio scenes and beats")).toBeVisible();
    expect(screen.getByLabelText("Director controls")).toBeVisible();
    expect(screen.getByLabelText("Compact beat strip")).toBeVisible();
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
          episodePlan?: { contentHash: string; renderMode: string };
        }
      ).episodePlan?.renderMode,
    ).toBe("proxy-animatic");
    const episodeHash = (
      playerHarness.lastProps?.inputProps as {
        episodePlan?: { contentHash: string };
      }
    ).episodePlan?.contentHash;
    expect(
      within(screen.getByLabelText("Studio scenes and beats"))
        .getAllByRole("img", { name: /Canonical frame/ })
        .every(
          (thumbnail) =>
            thumbnail.getAttribute("data-episode-hash") === episodeHash,
        ),
    ).toBe(true);
    expect(screen.getByLabelText("Directed animatic draft")).toHaveAttribute(
      "data-episode-hash",
    );
  });

  it("previews a structured beat patch and restores exact workspace history after reload", async () => {
    const user = await openKidsBreakdown();
    await user.click(
      screen.getByRole("button", { name: /Review direction draft/ }),
    );
    const animatic = screen.getByLabelText("Directed animatic draft");
    const originalHash = animatic.getAttribute("data-episode-hash");
    const targetBeat = within(
      screen.getByLabelText("Studio scenes and beats"),
    ).getByRole("button", { name: /3\.1 reaction/i });

    await user.click(targetBeat);
    expect(targetBeat).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("tab", { name: "Motion" }));
    await user.type(
      screen.getByLabelText("Direction for selected beat"),
      "Make the reaction 6 frames later",
    );
    await user.click(screen.getByRole("button", { name: "Preview change" }));

    expect(screen.getByLabelText("Proposed change")).toHaveTextContent(
      "Delay the reaction by 6 frames",
    );
    expect(screen.getByLabelText("Proposed change")).toHaveTextContent(
      "Re-solve timing and preserve the other beat programs",
    );
    await user.click(
      screen.getByRole("button", { name: "Apply and replay this beat" }),
    );

    const editedHash = animatic.getAttribute("data-episode-hash");
    expect(editedHash).not.toBe(originalHash);
    expect(
      within(screen.getByLabelText("Studio scenes and beats"))
        .getAllByRole("img", { name: /Canonical frame/ })
        .every(
          (thumbnail) =>
            thumbnail.getAttribute("data-episode-hash") === editedHash,
        ),
    ).toBe(true);
    expect(screen.getByText(/Beat updated\. New canonical cut/)).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Undo direction" }),
    ).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Undo direction" }));
    expect(animatic).toHaveAttribute("data-episode-hash", originalHash);
    await user.click(screen.getByRole("button", { name: "Redo direction" }));
    expect(animatic).toHaveAttribute("data-episode-hash", editedHash);

    cleanup();
    render(<App />);
    await user.click(
      screen.getByRole("button", {
        name: /Continue direction draftThe Storylight in the Little Wood/,
      }),
    );
    await user.click(screen.getByRole("button", { name: /Direction draft/ }));

    expect(screen.getByLabelText("Directed animatic draft")).toHaveAttribute(
      "data-episode-hash",
      editedHash,
    );
    expect(
      within(screen.getByLabelText("Studio scenes and beats")).getByRole(
        "button",
        { name: /3\.1 reaction/i },
      ),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "Undo direction" }),
    ).toBeEnabled();
  });

  it("keeps rail and beat-strip selection synchronized with Player playback", async () => {
    const user = await openKidsBreakdown();
    await user.click(
      screen.getByRole("button", { name: /Review direction draft/ }),
    );
    const rail = screen.getByLabelText("Studio scenes and beats");
    const strip = screen.getByLabelText("Compact beat strip");
    const reactionBeat = within(rail).getByRole("button", {
      name: /3\.1 reaction/i,
    });
    await user.click(reactionBeat);
    const reactionStartFrame = playerHarness.lastSeek;
    expect(reactionStartFrame).not.toBeNull();

    await user.click(within(rail).getByRole("button", { name: /1\.1 setup/i }));
    expect(reactionBeat).toHaveAttribute("aria-pressed", "false");
    act(() => {
      playerHarness.frameListener?.({
        detail: { frame: reactionStartFrame! },
      });
    });

    expect(reactionBeat).toHaveAttribute("aria-pressed", "true");
    expect(
      within(strip).getByRole("button", { name: /Scene 3, beat 1/i }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("applies patch-backed Visual controls and exposes genuine selected-beat lanes", async () => {
    const user = await openHistoryBreakdown();
    await user.click(
      screen.getByRole("button", { name: /Review direction draft/ }),
    );
    const animatic = screen.getByLabelText("Directed animatic draft");
    const originalHash = animatic.getAttribute("data-episode-hash");
    const visualTab = screen.getByRole("tab", { name: "Visual" });
    expect(visualTab).toHaveAttribute("aria-selected", "true");

    const shotSize = screen.getByLabelText("Shot size") as HTMLSelectElement;
    const nextSize = shotSize.value === "close-up" ? "wide" : "close-up";
    await user.selectOptions(shotSize, nextSize);
    await user.click(
      screen.getByRole("button", { name: "Preview visual change" }),
    );
    expect(screen.getByLabelText("Proposed change")).toHaveTextContent(
      `Set shot-1-main to ${nextSize}`,
    );
    await user.click(
      screen.getByRole("button", { name: "Apply and replay this beat" }),
    );
    expect(animatic.getAttribute("data-episode-hash")).not.toBe(originalHash);

    const timeline = screen.getByLabelText("Selected-beat timeline");
    expect(within(timeline).getByText("Shots")).toBeVisible();
    expect(within(timeline).getByText("Events")).toBeVisible();
    expect(within(timeline).getByText("Camera")).toBeVisible();
    playerHarness.lastSeek = null;
    await user.click(within(timeline).getAllByRole("button")[0]!);
    expect(playerHarness.lastSeek).not.toBeNull();
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
    await openAdvancedProductionDetails(user);
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
    await openAdvancedProductionDetails(user);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Draft animatic ready",
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
        name: /Continue direction draftThe Storylight in the Little Wood/,
      }),
    );
    await user.click(screen.getByRole("button", { name: /Direction draft/ }));
    await openAdvancedProductionDetails(user);

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
