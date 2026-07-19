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

const candidateCountOverride = vi.hoisted(() => ({
  count: null as number | null,
}));

vi.mock("@storystage/story-engine/director-alpha", async () => {
  const actual = await vi.importActual<
    typeof import("@storystage/story-engine/director-alpha")
  >("@storystage/story-engine/director-alpha");
  return {
    ...actual,
    listDirectorReactionDelayCandidates: (
      project: Parameters<typeof actual.listDirectorReactionDelayCandidates>[0],
      beatId: string,
    ) =>
      candidateCountOverride.count === null
        ? actual.listDirectorReactionDelayCandidates(project, beatId)
        : Array.from({ length: candidateCountOverride.count }, () => ({})),
  };
});

afterEach(() => {
  cleanup();
  playerHarness.lastProps = null;
  playerHarness.lastSeek = null;
  playerHarness.frameListener = null;
  candidateCountOverride.count = null;
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
    const shell = screen.getByLabelText("Directed animatic draft");
    expect(
      within(shell).getByLabelText("Studio scenes and beats"),
    ).toBeVisible();
    expect(within(shell).getByLabelText("Director controls")).toBeVisible();
    expect(within(shell).getByLabelText("Compact beat strip")).toBeVisible();
    expect(
      within(shell).getByLabelText("Selected-beat timeline"),
    ).not.toHaveAttribute("open");
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

    await user.click(within(rail).getByRole("button", { name: /1\.1 setup/i }));
    playerHarness.lastSeek = null;
    await user.click(
      within(strip).getByRole("button", { name: /Scene 3, beat 1/i }),
    );
    expect(playerHarness.lastSeek).toBe(reactionStartFrame);
    expect(reactionBeat).toHaveAttribute("aria-pressed", "true");
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
    expect(timeline).not.toHaveAttribute("open");
    await user.click(within(timeline).getByText("Selected-beat timeline"));
    expect(within(timeline).getByText("Shots")).toBeVisible();
    expect(within(timeline).getByText("Events")).toBeVisible();
    expect(within(timeline).getByText("Camera")).toBeVisible();
    playerHarness.lastSeek = null;
    await user.click(within(timeline).getAllByRole("button")[0]!);
    expect(playerHarness.lastSeek).not.toBeNull();
  });

  it("seeks to genuine resolved event frames and tracks playback on the timeline", async () => {
    const user = await openKidsBreakdown();
    await user.click(
      screen.getByRole("button", { name: /Review direction draft/ }),
    );
    const rail = screen.getByLabelText("Studio scenes and beats");
    await user.click(
      within(rail).getByRole("button", { name: /3\.1 reaction/i }),
    );

    const timeline = screen.getByLabelText("Selected-beat timeline");
    expect(timeline).not.toHaveAttribute("open");
    await user.click(within(timeline).getByText("Selected-beat timeline"));

    const lanes = Array.from(
      timeline.querySelectorAll(".director-timeline-label"),
    ).map((lane) => lane.textContent!.trim());
    expect(lanes).toEqual(["Shots", "Events", "Camera"]);

    const eventsLane = timeline.querySelector(
      ".director-timeline-lane.is-events",
    ) as HTMLElement;
    expect(eventsLane).not.toBeNull();
    const marker = within(eventsLane).getAllByRole("button")[0]!;
    const expectedFrame = Number(
      marker.getAttribute("title")!.match(/frame (\d+)$/)![1],
    );
    playerHarness.lastSeek = null;
    await user.click(marker);
    expect(playerHarness.lastSeek).toBe(expectedFrame);

    const rangeText = within(timeline)
      .getByText(/^\d+–\d+f$/)
      .textContent!.replace("f", "");
    const [start, endInclusive] = rangeText.split("–").map(Number);
    const probeFrame = start! + 10;
    act(() => {
      playerHarness.frameListener?.({ detail: { frame: probeFrame } });
    });
    const expectedLeft = `${
      ((probeFrame - start!) / Math.max(1, endInclusive! + 1 - start!)) * 100
    }%`;
    const playhead = timeline.querySelector(
      ".director-timeline-playhead",
    ) as HTMLElement;
    expect(playhead.style.left).toBe(expectedLeft);
  });

  it("keeps the shell honest: draft labels, closed advanced controls, no fake panels", async () => {
    const user = await openHistoryBreakdown();
    await user.click(
      screen.getByRole("button", { name: /Review direction draft/ }),
    );

    expect(screen.getAllByText("Draft animatic").length).toBeGreaterThan(0);
    expect(screen.getByText("Proxy performance")).toBeInTheDocument();
    expect(
      screen.getByText(/Final character rig unavailable/),
    ).toBeInTheDocument();

    expect(screen.getByLabelText("Selected-beat timeline")).not.toHaveAttribute(
      "open",
    );
    expect(
      screen.getByText("Advanced production details").closest("details"),
    ).not.toHaveAttribute("open");
    expect(
      screen.getByText("Advanced / Preflight").closest("details"),
    ).not.toHaveAttribute("open");

    expect(
      screen.queryByRole("button", { name: /export/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /audio/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: /assets/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/waveform/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /trim/i }),
    ).not.toBeInTheDocument();
  });

  it("gates the Director command to beats with a concrete reaction event", async () => {
    const user = await openKidsBreakdown();
    await user.click(
      screen.getByRole("button", { name: /Review direction draft/ }),
    );

    // The default setup beat (1.1) has no reaction event: the command control
    // would reject every input, so an honest explanation replaces it.
    expect(
      screen.queryByLabelText("Direction for selected beat"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/Structured direction unavailable on this beat/),
    ).toBeInTheDocument();

    // A beat with exactly one concrete reaction event gets the real control.
    await user.click(
      within(screen.getByLabelText("Studio scenes and beats")).getByRole(
        "button",
        { name: /3\.1 reaction/i },
      ),
    );
    expect(
      screen.getByLabelText("Direction for selected beat"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Structured direction unavailable on this beat/),
    ).not.toBeInTheDocument();
  });

  it("renders truthful, distinct copy for zero, one, and ambiguous reaction-target counts", async () => {
    const user = await openKidsBreakdown();
    await user.click(
      screen.getByRole("button", { name: /Review direction draft/ }),
    );
    const rail = screen.getByLabelText("Studio scenes and beats");
    const setupBeat = () =>
      within(rail).getByRole("button", { name: /1\.1 setup/i });
    const reactionBeat = () =>
      within(rail).getByRole("button", { name: /2\.2 reaction/i });
    const motionPanel = () => screen.getByLabelText("Motion controls");

    // 0 candidates on the natural setup beat: honest unavailability, no input.
    expect(
      screen.queryByLabelText("Direction for selected beat"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/Structured direction unavailable on this beat/),
    ).toBeInTheDocument();

    // Exactly 1 candidate: the real command control is present.
    candidateCountOverride.count = 1;
    await user.click(reactionBeat());
    expect(
      screen.getByLabelText("Direction for selected beat"),
    ).toBeInTheDocument();

    // 2+ candidates: distinct ambiguous state, no input, no fake target picker.
    candidateCountOverride.count = 2;
    await user.click(setupBeat());
    expect(
      screen.queryByLabelText("Direction for selected beat"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/Multiple reaction targets on this beat/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/explicit target selection is not supported yet/),
    ).toBeInTheDocument();

    // Motion panel parity at 2+: explains, never points at the absent control.
    await user.click(screen.getByRole("tab", { name: "Motion" }));
    expect(
      within(motionPanel()).getByText(
        /explicit target selection is not supported yet/,
      ),
    ).toBeInTheDocument();
    expect(
      within(motionPanel()).queryByText(/Use “Direct this beat” above/),
    ).not.toBeInTheDocument();

    // Motion panel parity at 0: states delay editing is unavailable.
    candidateCountOverride.count = 0;
    await user.click(reactionBeat());
    expect(
      within(motionPanel()).getByText(
        /No editable reaction target exists on this beat/,
      ),
    ).toBeInTheDocument();
    expect(
      within(motionPanel()).queryByText(/Use “Direct this beat” above/),
    ).not.toBeInTheDocument();

    // Motion panel parity at 1: points at the real control.
    candidateCountOverride.count = 1;
    await user.click(setupBeat());
    expect(
      within(motionPanel()).getByText(/Use “Direct this beat” above/),
    ).toBeInTheDocument();
  });

  it("clears a typed direction when the selected beat changes", async () => {
    const user = await openKidsBreakdown();
    await user.click(
      screen.getByRole("button", { name: /Review direction draft/ }),
    );
    const rail = screen.getByLabelText("Studio scenes and beats");

    await user.click(
      within(rail).getByRole("button", { name: /2\.2 reaction/i }),
    );
    const input = screen.getByLabelText(
      "Direction for selected beat",
    ) as HTMLInputElement;
    await user.type(input, "Make the reaction 6 frames later");
    expect(input.value).toBe("Make the reaction 6 frames later");

    await user.click(
      within(rail).getByRole("button", { name: /3\.1 reaction/i }),
    );
    expect(
      (screen.getByLabelText("Direction for selected beat") as HTMLInputElement)
        .value,
    ).toBe("");
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
