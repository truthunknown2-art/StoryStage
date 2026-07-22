import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { ProductV1App } from "./product-v1/ProductV1App";
import "./product-v1/asset-workspace.test";
import "./product-v1/asset-requirements.test";
import "./product-v1/asset-request-import.test";
import {
  AI_CONNECTION_LABELS,
  AI_CONNECTION_STATES,
  AI_FIXTURE_LABEL,
  advanceAiTurn,
  aiApplyBlocker,
  applyProposalToBeatState,
  buildFixtureProposal,
  canApplyAiTurn,
  canUndoProposalApply,
  cancelAiTurn,
  captureAiScope,
  completeAiTurn,
  rejectAiTurnProposal,
  startAiTurn,
  supersedePendingProposals,
  undoProposalApply,
  type AiCapturedScope,
} from "./product-v1/ai-director-fixture";
import {
  CREATE_TEMPLATE_LABEL,
  buildIdeaProposal,
  buildPasteProposal,
} from "./product-v1/create-proposal";
import {
  applyDirectDraft,
  committedDirectDraft,
  directDraftsEqual,
  initialBeatDirectState,
  updateDirectDraft,
} from "./product-v1/direct-history";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

const SAMPLE_SCRIPT = [
  "Lila lives in a quiet village at the edge of a deep, whispering forest.",
  "One evening, she finds a small lantern glowing under the roots of an old tree.",
  "The light flickers, and a soft rustle in the bushes makes her pause.",
  "Summoning her courage, Lila picks up the lantern and follows the glow.",
  "It leads her across a stream and into a hidden glade filled with fireflies.",
].join("\n\n");

async function openCreate(user: ReturnType<typeof userEvent.setup>) {
  render(<App />);
  await user.click(
    screen.getByRole("button", { name: /New project/ }),
  );
  return screen.findByRole("heading", {
    name: /Start a new Kids Story/,
  });
}

/** F3-WP4: from the two-path choice onto the Paste a script path. */
async function openPastePath(user: ReturnType<typeof userEvent.setup>) {
  await openCreate(user);
  await user.click(screen.getByRole("button", { name: /Paste a script/ }));
  return screen.findByRole("heading", { name: "Paste a script" });
}

describe("F1 — Projects + Create", () => {
  it("opens Projects as the default creator entry with the labelled local demo", async () => {
    render(<App />);
    expect(
      await screen.findByRole("heading", { name: "Projects" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /New project/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Local UI demo — production services are not connected\./),
    ).toBeInTheDocument();
    expect(
      screen.getByText("The Storylight in the Little Wood"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Local UI demo").length).toBeGreaterThan(0);
  });

  it("navigates New project → Create and Back to projects", async () => {
    const user = userEvent.setup();
    await openCreate(user);
    expect(
      screen.getByRole("button", { name: /Paste a script/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /What's your idea\?/ }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /Back to projects/ }),
    );
    expect(
      await screen.findByRole("heading", { name: "Projects" }),
    ).toBeInTheDocument();
  });

  it("updates word count and duration on edits and bounded .txt import", async () => {
    const user = userEvent.setup();
    await openPastePath(user);
    const scriptInput = screen.getByRole("textbox", { name: "Script" });

    await user.type(scriptInput, "One small paragraph.");
    expect(screen.getByText(/3 words · about 5 seconds/)).toBeInTheDocument();

    const file = new File([SAMPLE_SCRIPT], "story.txt", {
      type: "text/plain",
    });
    fireEvent.change(screen.getByLabelText("Import .txt file"), {
      target: { files: [file] },
    });
    expect(await screen.findByText(/68 words · about 27 seconds/)).toBeInTheDocument();

    const badFile = new File(["not a script"], "story.md", {
      type: "text/markdown",
    });
    fireEvent.change(screen.getByLabelText("Import .txt file"), {
      target: { files: [badFile] },
    });
    expect(
      await screen.findByText(/is not a \.txt file/),
    ).toBeInTheDocument();
  });

  it("offers the single Kids Story template with exactly two paths and no Weird History", async () => {
    const user = userEvent.setup();
    await openCreate(user);
    expect(screen.getByText("Ollo & Friends — Kids Story")).toBeInTheDocument();
    expect(screen.getByText(/Kids Adventure grammar/)).toBeInTheDocument();
    expect(screen.getByText(/Storybook Cutout style/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Paste a script/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /What's your idea\?/ }),
    ).toBeInTheDocument();
    // The old grammar-first hierarchy is gone: no grammar or art-style
    // choice, and Weird History is never shown.
    expect(screen.queryByText(/Weird History/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Paper Collage|Soft 2D/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Narration mode")).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /What's your idea\?/ }),
    );
    // Signed out by default: the idea path opens the Connect AI Director
    // fixture instead of the conversation form.
    expect(
      await screen.findByRole("heading", { name: /Connect AI Director/ }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /Choose a different path/ }),
    );
    expect(
      await screen.findByRole("heading", { name: /Start a new Kids Story/ }),
    ).toBeInTheDocument();
  });

  it("blocks proposal review on an empty script with a useful error", async () => {
    const user = userEvent.setup();
    await openPastePath(user);
    await user.click(screen.getByRole("button", { name: "Create proposal" }));
    expect(
      await screen.findByText("Add your script before creating a proposal."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Paste a script" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("article", { name: "Review proposal" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("pv1-studio")).not.toBeInTheDocument();
  });

  it("enters the honest Studio shell only through proposal review and never claims generation", async () => {
    const user = userEvent.setup();
    await openPastePath(user);
    fireEvent.change(screen.getByRole("textbox", { name: "Script" }), {
      target: { value: SAMPLE_SCRIPT },
    });
    // The form cannot enter Studio directly — only the review can.
    expect(
      screen.queryByRole("button", { name: /Enter Studio/ }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Create proposal" }));
    const review = await screen.findByRole("article", {
      name: "Review proposal",
    });
    expect(review).toHaveTextContent("Ollo & Friends — Kids Story");
    expect(review).toHaveTextContent("From your script");
    await user.click(
      within(review).getByRole("button", {
        name: "Enter Studio — local demo only",
      }),
    );
    const studio = await screen.findByTestId("pv1-studio");
    expect(studio).toHaveTextContent(
      "Local UI demo — production services are not connected.",
    );
    expect(studio).toHaveTextContent("Reference board — not animation");
    expect(studio).toHaveTextContent(/no imagery,\s*animation,\s*audio,\s*or render exists/i);
    expect(
      within(studio).getByRole("tablist", { name: "Director workspace" }),
    ).toBeInTheDocument();
    expect(
      within(studio).getByRole("button", { name: /Back to projects/ }),
    ).toBeEnabled();
    // No generation claims anywhere. The one permitted "rendered" is the
    // mandated F3-WP3 planning disclaimer ("not animation or rendered
    // output."); every other rendered/exported claim stays forbidden.
    expect(studio).not.toHaveTextContent(/rendered(?! output)|exported/i);
  });

  it("opens the bounded long-form Ollo demo in the same Studio shell, visibly labelled", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      await screen.findByRole("button", {
        name: /Open local demo project The Storylight in the Little Wood/,
      }),
    );
    const studio = await screen.findByTestId("pv1-studio");
    expect(studio).toHaveTextContent("The Storylight in the Little Wood");
    expect(studio).toHaveTextContent(
      "Local UI demo — production services are not connected.",
    );
    expect(studio).toHaveTextContent("Kids Adventure");
    expect(studio).toHaveTextContent("Storybook Cutout");
    expect(studio).toHaveTextContent("Act I · Everyday Problem");
    expect(studio).toHaveTextContent("Act II · The Little Elsewhere");
    expect(
      within(studio).getAllByRole("button", { name: /not produced/ }).length,
    ).toBe(8);
  });

  it("shows an understandable empty state when the demo project is absent", async () => {
    // The demo card is the only seeded project; an empty Projects grid must
    // stay understandable. ProductV1App supports this via its fixture prop.
    cleanup();
    render(<ProductV1App showDemoProject={false} />);
    expect(
      await screen.findByText("No projects yet"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Create your first story/),
    ).toBeInTheDocument();
  });
});

describe("F2-WP1 — Studio shell selection invariant", () => {
  async function openDemoStudio(user: ReturnType<typeof userEvent.setup>) {
    render(<App />);
    await user.click(
      await screen.findByRole("button", {
        name: /Open local demo project The Storylight in the Little Wood/,
      }),
    );
    return screen.findByTestId("pv1-studio");
  }

  it("drives every surface from one selected scene: rail selection", async () => {
    const user = userEvent.setup();
    const studio = await openDemoStudio(user);

    const rail = within(studio).getByRole("navigation", {
      name: "Episode hierarchy",
    });
    await user.click(
      within(rail).getByRole("button", { name: /Scene 3 Berry Patch/ }),
    );

    // Board, transport, overview, and rail all agree on Scene 3.
    expect(
      within(studio).getByRole("heading", { name: "Berry Patch" }),
    ).toBeInTheDocument();
    expect(
      within(studio).getByText(/Scene 3 of 8 · 140s · episode 5:10–7:30 of 20:00/),
    ).toBeInTheDocument();
    expect(
      within(rail).getByRole("button", { name: /Scene 3 Berry Patch/ }),
    ).toHaveAttribute("aria-current", "true");
    const overview = within(studio).getByRole("navigation", {
      name: "Episode overview",
    });
    expect(
      within(overview).getByRole("button", { name: /Scene 3 Berry Patch/ }),
    ).toHaveAttribute("aria-current", "true");
    // Beats belong to the selected scene only.
    expect(studio).toHaveTextContent("Dot finds a trail of dropped berries");
  });

  it("drives every surface from one selected scene: overview selection", async () => {
    const user = userEvent.setup();
    const studio = await openDemoStudio(user);

    const overview = within(studio).getByRole("navigation", {
      name: "Episode overview",
    });
    await user.click(
      within(overview).getByRole("button", { name: /Scene 5 Lantern Bridge/ }),
    );

    expect(
      within(studio).getByRole("heading", { name: "Lantern Bridge" }),
    ).toBeInTheDocument();
    expect(
      within(studio).getByText(/Scene 5 of 8 · 170s · episode 10:00–12:50 of 20:00/),
    ).toBeInTheDocument();
    const rail = within(studio).getByRole("navigation", {
      name: "Episode hierarchy",
    });
    expect(
      within(rail).getByRole("button", { name: /Scene 5 Lantern Bridge/ }),
    ).toHaveAttribute("aria-current", "true");
    expect(studio).toHaveTextContent("The bridge lanterns wake one by one");
  });

  it("keeps previous/next boundaries honest at both ends", async () => {
    const user = userEvent.setup();
    const studio = await openDemoStudio(user);

    const previous = within(studio).getByRole("button", {
      name: "Previous scene",
    });
    const next = within(studio).getByRole("button", { name: "Next scene" });
    expect(previous).toBeDisabled();
    expect(next).toBeEnabled();

    await user.click(next);
    expect(
      within(studio).getByRole("heading", { name: "Forest Path" }),
    ).toBeInTheDocument();
    expect(previous).toBeEnabled();

    for (let index = 0; index < 6; index += 1) await user.click(next);
    expect(
      within(studio).getByRole("heading", { name: "Back Home" }),
    ).toBeInTheDocument();
    expect(next).toBeDisabled();
    expect(previous).toBeEnabled();
  });

  it("shows the single template labels and proposal title, with the layout-demo disclosure", async () => {
    const user = userEvent.setup();
    await openPastePath(user);
    fireEvent.change(screen.getByRole("textbox", { name: "Script" }), {
      target: { value: SAMPLE_SCRIPT },
    });
    await user.click(screen.getByRole("button", { name: "Create proposal" }));
    const review = await screen.findByRole("article", {
      name: "Review proposal",
    });
    await user.click(
      within(review).getByRole("button", {
        name: "Enter Studio — local demo only",
      }),
    );
    const studio = await screen.findByTestId("pv1-studio");
    const topbar = studio.querySelector(".pv1-topbar")!;
    // One private-launch template: the same labels whatever the path, and
    // the proposal's episode title becomes the visible project title.
    expect(topbar).toHaveTextContent("Kids Adventure");
    expect(topbar).toHaveTextContent("Storybook Cutout");
    expect(topbar).toHaveTextContent("Lila lives in a quiet village…");
    expect(topbar).not.toHaveTextContent("Weird History");
    expect(studio).toHaveTextContent(
      /Layout demo — the eight scenes below are the bounded Ollo demo plan, not scenes from your script/,
    );
    expect(studio).toHaveTextContent(
      /Script-specific scenes have not been planned or generated yet/,
    );
  });

  it("keeps the seeded demo badges without the layout-demo disclosure", async () => {
    const user = userEvent.setup();
    const studio = await openDemoStudio(user);
    expect(studio).toHaveTextContent("Kids Adventure");
    expect(studio).toHaveTextContent("Storybook Cutout");
    expect(studio).not.toHaveTextContent(/Layout demo —/);
  });

  it("shows only honest Studio controls: no pretend Director fields or fake media", async () => {
    const user = userEvent.setup();
    const studio = await openDemoStudio(user);

    // F3-WP3 Director tabs: Direct exposes the three accepted bounded
    // session-local drafts with honest initial history states; Visual and
    // Motion expose exactly the five bounded planning-intent controls
    // (hidden on their tabs while Direct is selected).
    expect(
      within(studio).getByRole("tablist", { name: "Director workspace" }),
    ).toBeInTheDocument();
    expect(
      within(studio).getByRole("tab", { name: "Direct" }),
    ).toBeInTheDocument();
    expect(
      within(studio).getByRole("tab", { name: "Visual" }),
    ).toBeInTheDocument();
    expect(
      within(studio).getByRole("tab", { name: "Motion" }),
    ).toBeInTheDocument();
    // The Direct tab is selected by default: exactly three bounded drafts
    // plus real Apply/Undo/Redo with honest disabled history states.
    expect(within(studio).getAllByRole("textbox")).toHaveLength(3);
    expect(
      within(studio).getByRole("button", { name: "Apply" }),
    ).toBeEnabled();
    expect(
      within(studio).getByRole("button", { name: "Undo" }),
    ).toBeDisabled();
    expect(
      within(studio).getByRole("button", { name: "Redo" }),
    ).toBeDisabled();
    // The only Director comboboxes are the four bounded Visual/Motion
    // intent selects on their hidden tabs; no shot or action control
    // fields exist in this slice.
    expect(within(studio).queryByRole("combobox")).not.toBeInTheDocument();
    expect(
      within(studio).getAllByRole("combobox", { hidden: true }),
    ).toHaveLength(4);
    expect(
      within(studio).queryByRole("combobox", {
        hidden: true,
        name: /shot|action/i,
      }),
    ).not.toBeInTheDocument();
    expect(
      within(studio).getByRole("button", { name: "Preview" }),
    ).toBeDisabled();
    expect(
      within(studio).getByRole("button", { name: "Export" }),
    ).toBeDisabled();
    expect(
      studio.textContent?.includes(
        "Preview stays disabled in F3-WP3 — direction intent is session-local planning only; there is still no media to preview.",
      ),
    ).toBe(true);
    expect(
      studio.textContent?.includes("Export unlocks when production services connect."),
    ).toBe(true);
    expect(
      within(studio).queryByRole("button", { name: /Play|Pause|Scrub/i }),
    ).not.toBeInTheDocument();
    // F3-WP4: the docked AI Director panel is present, honestly labelled,
    // and signed-out by default — a fixture Connect surface, never a
    // terminal or engineering console.
    const aiPanel = within(studio).getByRole("complementary", {
      name: "AI Director",
    });
    expect(aiPanel).toHaveTextContent(
      "Local AI Director fixture — no service connected",
    );
    expect(
      within(aiPanel).getByRole("heading", { name: /Connect AI Director/ }),
    ).toBeInTheDocument();
    expect(
      within(aiPanel).getByRole("button", { name: "Sign in with ChatGPT" }),
    ).toBeInTheDocument();
    expect(aiPanel).not.toHaveTextContent(
      /api[- ]?key|token|cookie|mcp|terminal/i,
    );
  });
});

describe("F2-WP2 — long-form navigation and bounded rendering", () => {
  async function openDemoStudio(user: ReturnType<typeof userEvent.setup>) {
    render(<App />);
    await user.click(
      await screen.findByRole("button", {
        name: /Open local demo project The Storylight in the Little Wood/,
      }),
    );
    return screen.findByTestId("pv1-studio");
  }

  const rail = (studio: HTMLElement) =>
    within(studio).getByRole("navigation", { name: "Episode hierarchy" });

  it("expands and collapses every act and sequence with semantic state", async () => {
    const user = userEvent.setup();
    const studio = await openDemoStudio(user);
    const railNav = rail(studio);

    for (const title of [
      "Act I · Everyday Problem",
      "Act II · The Little Elsewhere",
    ]) {
      const actToggle = within(railNav).getByRole("button", { name: title });
      expect(actToggle).toHaveAttribute("aria-expanded", "true");
      await user.click(actToggle);
      expect(actToggle).toHaveAttribute("aria-expanded", "false");
      await user.click(actToggle);
      expect(actToggle).toHaveAttribute("aria-expanded", "true");
    }
    for (const title of [
      "Sequence 1 · A quiet ordinary",
      "Sequence 2 · First signs",
      "Sequence 3 · The journey",
      "Sequence 4 · Resolution",
    ]) {
      const sequenceToggle = within(railNav).getByRole("button", {
        name: title,
      });
      expect(sequenceToggle).toHaveAttribute("aria-expanded", "true");
      await user.click(sequenceToggle);
      expect(sequenceToggle).toHaveAttribute("aria-expanded", "false");
      await user.click(sequenceToggle);
      expect(sequenceToggle).toHaveAttribute("aria-expanded", "true");
    }
    // Every scene is reachable after the traversal.
    for (const name of [
      "Scene 1 The Home Nook",
      "Scene 2 Forest Path",
      "Scene 3 Berry Patch",
      "Scene 4 Little Stream",
      "Scene 5 Lantern Bridge",
      "Scene 6 Folded Hills",
      "Scene 7 Sunflower Field",
      "Scene 8 Back Home",
    ]) {
      expect(
        within(railNav).getByRole("button", { name: new RegExp(name) }),
      ).toBeInTheDocument();
    }
  });

  it("renders beat rows only for the selected scene", async () => {
    const user = userEvent.setup();
    const studio = await openDemoStudio(user);

    // Initial scene: exactly its two beats exist in the DOM (board + rail).
    let beatRows = studio.querySelectorAll("[data-beat-for]");
    expect(beatRows.length).toBe(2);
    for (const row of beatRows)
      expect(row.getAttribute("data-beat-for")).toBe("scene-1");

    await user.click(
      within(rail(studio)).getByRole("button", {
        name: /Scene 5 Lantern Bridge/,
      }),
    );
    beatRows = studio.querySelectorAll("[data-beat-for]");
    expect(beatRows.length).toBe(2);
    for (const row of beatRows)
      expect(row.getAttribute("data-beat-for")).toBe("scene-5");
    expect(studio).toHaveTextContent("The bridge lanterns wake one by one");
    expect(studio).not.toHaveTextContent("Morning light through the round window");
  });

  it("keeps a hidden selection reachable behind a collapsed sequence with reveal", async () => {
    const user = userEvent.setup();
    const studio = await openDemoStudio(user);
    const railNav = rail(studio);

    await user.click(
      within(railNav).getByRole("button", { name: /Scene 3 Berry Patch/ }),
    );
    await user.click(
      within(railNav).getByRole("button", { name: "Sequence 2 · First signs" }),
    );

    // Selection survives; the board still shows it; the summary explains.
    expect(
      within(studio).getByRole("heading", { name: "Berry Patch" }),
    ).toBeInTheDocument();
    expect(
      within(railNav).queryByRole("button", { name: /Scene 3 Berry Patch/ }),
    ).not.toBeInTheDocument();
    const summary = within(railNav).getByRole("note");
    expect(summary).toHaveTextContent("Selected scene 3 · Berry Patch");

    await user.click(
      within(summary).getByRole("button", { name: /Reveal/ }),
    );
    expect(
      within(railNav).getByRole("button", { name: /Scene 3 Berry Patch/ }),
    ).toHaveAttribute("aria-current", "true");
  });

  it("keeps a hidden selection reachable behind a collapsed act with reveal", async () => {
    const user = userEvent.setup();
    const studio = await openDemoStudio(user);
    const railNav = rail(studio);

    await user.click(
      within(railNav).getByRole("button", { name: /Scene 5 Lantern Bridge/ }),
    );
    await user.click(
      within(railNav).getByRole("button", {
        name: "Act II · The Little Elsewhere",
      }),
    );

    expect(
      within(studio).getByRole("heading", { name: "Lantern Bridge" }),
    ).toBeInTheDocument();
    const summary = within(railNav).getByRole("note");
    expect(summary).toHaveTextContent("Selected scene 5 · Lantern Bridge");

    await user.click(
      within(summary).getByRole("button", { name: /Reveal/ }),
    );
    expect(
      within(railNav).getByRole("button", { name: /Scene 5 Lantern Bridge/ }),
    ).toHaveAttribute("aria-current", "true");
  });

  it("moves the scene-relative playhead honestly and resets it on scene change", async () => {
    const user = userEvent.setup();
    const studio = await openDemoStudio(user);

    const slider = within(studio).getByRole("slider", {
      name: /Scene playhead for The Home Nook/,
    });
    expect(slider).toHaveValue("0");
    expect(studio).toHaveTextContent("0:00 / 2:30");
    expect(studio).toHaveTextContent("local UI timing — not media playback");

    fireEvent.change(slider, { target: { value: "42" } });
    expect(studio).toHaveTextContent("0:42 / 2:30");

    // Deterministic reset to zero on scene change (the chosen clamp/reset
    // behavior, encoded here).
    await user.click(
      within(studio).getByRole("button", { name: "Next scene" }),
    );
    expect(studio).toHaveTextContent("0:00 / 2:40");
    expect(
      within(studio).getByRole("slider", {
        name: /Scene playhead for Forest Path/,
      }),
    ).toHaveValue("0");

    // Rail selection and overview selection share the same reset.
    fireEvent.change(
      within(studio).getByRole("slider", {
        name: /Scene playhead for Forest Path/,
      }),
      { target: { value: "80" } },
    );
    expect(studio).toHaveTextContent("1:20 / 2:40");
    await user.click(
      within(
        within(studio).getByRole("navigation", { name: "Episode overview" }),
      ).getByRole("button", { name: /Scene 1 The Home Nook/ }),
    );
    expect(studio).toHaveTextContent("0:00 / 2:30");
  });
});

describe("F2-WP3 — keyboard navigation and responsive quality", () => {
  async function openDemoStudio(user: ReturnType<typeof userEvent.setup>) {
    render(<App />);
    await user.click(
      await screen.findByRole("button", {
        name: /Open local demo project The Storylight in the Little Wood/,
      }),
    );
    return screen.findByTestId("pv1-studio");
  }

  it("drives the rail keyboard contract across boundaries with focus follow", async () => {
    const user = userEvent.setup();
    const studio = await openDemoStudio(user);
    const railNav = within(studio).getByRole("navigation", {
      name: "Episode hierarchy",
    });

    const sceneButton = (name: RegExp) =>
      within(railNav).getByRole("button", { name });

    sceneButton(/Scene 1 The Home Nook/).focus();
    await user.keyboard("{ArrowDown}");
    expect(
      within(studio).getByRole("heading", { name: "Forest Path" }),
    ).toBeInTheDocument();
    expect(sceneButton(/Scene 2 Forest Path/)).toHaveFocus();
    expect(sceneButton(/Scene 2 Forest Path/)).toHaveAttribute(
      "aria-current",
      "true",
    );

    // Sequence boundary: Scene 2 (seq 1) → Scene 3 (seq 2).
    await user.keyboard("{ArrowDown}");
    expect(
      within(studio).getByRole("heading", { name: "Berry Patch" }),
    ).toBeInTheDocument();
    // Act boundary: Scene 4 (act I) → Scene 5 (act II).
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{ArrowDown}");
    expect(
      within(studio).getByRole("heading", { name: "Lantern Bridge" }),
    ).toBeInTheDocument();
    expect(
      within(studio).getByText(/Scene 5 of 8 · 170s · episode 10:00–12:50 of 20:00/),
    ).toBeInTheDocument();

    // First/last clamps.
    await user.keyboard("{End}");
    expect(
      within(studio).getByRole("heading", { name: "Back Home" }),
    ).toBeInTheDocument();
    await user.keyboard("{ArrowDown}");
    expect(
      within(studio).getByRole("heading", { name: "Back Home" }),
    ).toBeInTheDocument();
    await user.keyboard("{Home}");
    expect(
      within(studio).getByRole("heading", { name: "The Home Nook" }),
    ).toBeInTheDocument();
    await user.keyboard("{ArrowUp}");
    expect(
      within(studio).getByRole("heading", { name: "The Home Nook" }),
    ).toBeInTheDocument();
    expect(sceneButton(/Scene 1 The Home Nook/)).toHaveFocus();
  });

  it("reveals collapsed ancestors when keyboard navigation targets a hidden scene", async () => {
    const user = userEvent.setup();
    const studio = await openDemoStudio(user);
    const railNav = within(studio).getByRole("navigation", {
      name: "Episode hierarchy",
    });

    // Collapse Sequence 3 (Scenes 5–6), then keyboard from Scene 4 to 5.
    await user.click(
      within(railNav).getByRole("button", { name: "Sequence 3 · The journey" }),
    );
    const scene4 = within(railNav).getByRole("button", {
      name: /Scene 4 Little Stream/,
    });
    scene4.focus();
    await user.keyboard("{ArrowDown}");

    expect(
      within(railNav).getByRole("button", { name: /Scene 5 Lantern Bridge/ }),
    ).toHaveAttribute("aria-current", "true");
    expect(
      within(railNav).getByRole("button", { name: "Sequence 3 · The journey" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(
      within(studio).getByRole("heading", { name: "Lantern Bridge" }),
    ).toBeInTheDocument();
  });

  it("pins the motion, compact-layout, and focus contracts in the stylesheet", () => {
    const cssPath = resolve(process.cwd(), "src/styles.css");
    const css = readFileSync(cssPath, "utf8");
    // Selection motion exists and is disabled under reduced motion.
    const motionBlock = css.match(
      /@media \(prefers-reduced-motion: reduce\) \{[^}]*\.pv1-rail-scene[^}]*\}/s,
    );
    expect(motionBlock, "reduced-motion block must cover pv1 controls").not.toBeNull();
    // Compact treatment: stacked ordered regions below 1024px.
    const compactBlock = css.match(
      /@media \(max-width: 1024px\) \{[^]*?\.pv1-studio-layout \{[^}]*flex-direction: column/s,
    );
    expect(compactBlock, "compact stacked layout rule").not.toBeNull();
    // Visible keyboard focus contract is global.
    expect(css).toContain(":focus-visible");
  });
});

describe("F3-WP1 — shared beat scope and Director tabs", () => {
  async function openDemoStudio(user: ReturnType<typeof userEvent.setup>) {
    render(<App />);
    await user.click(
      await screen.findByRole("button", {
        name: /Open local demo project The Storylight in the Little Wood/,
      }),
    );
    return screen.findByTestId("pv1-studio");
  }

  const rail = (studio: HTMLElement) =>
    within(studio).getByRole("navigation", { name: "Episode hierarchy" });
  const scopeHeader = (studio: HTMLElement) =>
    within(studio).getByRole("navigation", { name: "Current scope" });
  const beatCard = (studio: HTMLElement) =>
    within(studio).getByRole("region", { name: "Selected beat" });

  it("drives rail, beat board, scope header, and Director tab from one selected beat", async () => {
    const user = userEvent.setup();
    const studio = await openDemoStudio(user);

    // Initial shared scope: Scene 1, Beat 1.
    expect(scopeHeader(studio)).toHaveTextContent(
      "The Storylight in the Little Wood",
    );
    expect(scopeHeader(studio)).toHaveTextContent(
      "Sequence 1 · A quiet ordinary",
    );
    expect(scopeHeader(studio)).toHaveTextContent("Scene 1 · The Home Nook");
    expect(scopeHeader(studio)).toHaveTextContent(
      "Beat 1 · Morning light through the round window",
    );
    expect(beatCard(studio)).toHaveTextContent("Beat 1 of 2 · 70s");
    expect(beatCard(studio)).toHaveTextContent(
      "Morning light through the round window",
    );
    expect(
      within(studio).getByRole("tab", { name: "Direct" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(within(studio).getByRole("tabpanel")).toHaveTextContent(
      "Scope: Scene 1 · Beat 1 — Morning light through the round window",
    );
    const beatOne = within(rail(studio)).getByRole("button", {
      name: /Beat 1 Morning light through the round window/,
    });
    const beatTwo = within(rail(studio)).getByRole("button", {
      name: /Beat 2 A shelf of unfinished stories/,
    });
    expect(beatOne).toHaveAttribute("aria-current", "true");
    expect(beatTwo).not.toHaveAttribute("aria-current");

    // Selecting Beat 2 in the rail synchronizes every surface.
    await user.click(beatTwo);
    expect(beatTwo).toHaveAttribute("aria-current", "true");
    expect(beatOne).not.toHaveAttribute("aria-current");
    expect(scopeHeader(studio)).toHaveTextContent(
      "Beat 2 · A shelf of unfinished stories",
    );
    expect(scopeHeader(studio)).not.toHaveTextContent(
      "Beat 1 · Morning light through the round window",
    );
    expect(beatCard(studio)).toHaveTextContent("Beat 2 of 2 · 80s");
    expect(beatCard(studio)).toHaveTextContent("A shelf of unfinished stories");
    expect(beatCard(studio)).not.toHaveTextContent(
      "Morning light through the round window",
    );
    expect(within(studio).getByRole("tabpanel")).toHaveTextContent(
      "Scope: Scene 1 · Beat 2 — A shelf of unfinished stories",
    );
  });

  it("selects the new scene's first beat exactly once and clears stale beat state", async () => {
    const user = userEvent.setup();
    const studio = await openDemoStudio(user);

    // Own Beat 2 in Scene 1, then change scenes from the rail.
    await user.click(
      within(rail(studio)).getByRole("button", {
        name: /Beat 2 A shelf of unfinished stories/,
      }),
    );
    expect(scopeHeader(studio)).toHaveTextContent(
      "Beat 2 · A shelf of unfinished stories",
    );

    await user.click(
      within(rail(studio)).getByRole("button", { name: /Scene 2 Forest Path/ }),
    );

    // First beat of the new scene is selected everywhere; nothing stale.
    expect(scopeHeader(studio)).toHaveTextContent("Scene 2 · Forest Path");
    expect(scopeHeader(studio)).toHaveTextContent(
      "Beat 1 · Ollo bounces ahead of Tix",
    );
    expect(beatCard(studio)).toHaveTextContent("Beat 1 of 2 · 85s");
    expect(beatCard(studio)).toHaveTextContent("Ollo bounces ahead of Tix");
    expect(within(studio).getByRole("tabpanel")).toHaveTextContent(
      "Scope: Scene 2 · Beat 1 — Ollo bounces ahead of Tix",
    );
    expect(
      within(rail(studio)).getByRole("button", {
        name: /Beat 1 Ollo bounces ahead of Tix/,
      }),
    ).toHaveAttribute("aria-current", "true");
    // No stale beat ownership: every rendered beat row belongs to scene-2,
    // and the previous scene's beats are gone from the DOM.
    const beatRows = studio.querySelectorAll("[data-beat-for]");
    expect(beatRows.length).toBe(2);
    for (const row of beatRows)
      expect(row.getAttribute("data-beat-for")).toBe("scene-2");
    expect(studio).not.toHaveTextContent("A shelf of unfinished stories");

    // The same deterministic reset holds from the overview surface, and
    // returning to Scene 1 does not resurrect the earlier Beat 2 selection.
    await user.click(
      within(rail(studio)).getByRole("button", {
        name: /Beat 2 A golden glow between the ferns/,
      }),
    );
    await user.click(
      within(
        within(studio).getByRole("navigation", { name: "Episode overview" }),
      ).getByRole("button", { name: /Scene 1 The Home Nook/ }),
    );
    expect(scopeHeader(studio)).toHaveTextContent(
      "Beat 1 · Morning light through the round window",
    );
    expect(
      within(rail(studio)).getByRole("button", {
        name: /Beat 1 Morning light through the round window/,
      }),
    ).toHaveAttribute("aria-current", "true");
    expect(beatCard(studio)).toHaveTextContent("Beat 1 of 2 · 70s");
  });

  it("keeps Director tabs as real local state with truthful scope copy and keyboard support", async () => {
    const user = userEvent.setup();
    const studio = await openDemoStudio(user);

    const direct = within(studio).getByRole("tab", { name: "Direct" });
    const visual = within(studio).getByRole("tab", { name: "Visual" });
    const motion = within(studio).getByRole("tab", { name: "Motion" });
    expect(direct).toHaveAttribute("aria-selected", "true");
    expect(visual).toHaveAttribute("aria-selected", "false");
    expect(motion).toHaveAttribute("aria-selected", "false");
    expect(direct).toHaveAttribute("tabindex", "0");
    expect(visual).toHaveAttribute("tabindex", "-1");
    expect(motion).toHaveAttribute("tabindex", "-1");
    for (const tab of [direct, visual, motion]) {
      const panelId = tab.getAttribute("aria-controls");
      expect(panelId).toBeTruthy();
      expect(document.getElementById(panelId!)).toHaveAttribute(
        "aria-labelledby",
        tab.id,
      );
    }
    expect(
      within(studio).getAllByRole("tabpanel", { hidden: true }),
    ).toHaveLength(3);
    expect(within(studio).getByRole("tabpanel")).toHaveTextContent(
      "Session-local only — this direction and its undo history stay in this Studio session.",
    );

    await user.click(visual);
    expect(visual).toHaveAttribute("aria-selected", "true");
    expect(visual).toHaveAttribute("tabindex", "0");
    expect(direct).toHaveAttribute("aria-selected", "false");
    expect(direct).toHaveAttribute("tabindex", "-1");
    // F3-WP3: Visual exposes the bounded Framing and Composition focus
    // intent drafts sharing the same session-local boundary and scope.
    expect(
      within(studio).getByRole("combobox", { name: "Framing" }),
    ).toHaveValue("Unspecified");
    expect(
      within(studio).getByRole("textbox", { name: "Composition focus" }),
    ).toHaveValue("");
    expect(within(studio).getByRole("tabpanel")).toHaveTextContent(
      "Session-local only — this direction and its undo history stay in this Studio session.",
    );
    // The tab still reflects the same shared beat scope.
    expect(within(studio).getByRole("tabpanel")).toHaveTextContent(
      "Scope: Scene 1 · Beat 1 — Morning light through the round window",
    );

    // Movement derives from the focused tab, even when it is not selected.
    direct.focus();
    await user.keyboard("{ArrowRight}");
    expect(visual).toHaveAttribute("aria-selected", "true");
    expect(visual).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(motion).toHaveAttribute("aria-selected", "true");
    expect(motion).toHaveFocus();
    // F3-WP3: Motion exposes the three bounded intent selects.
    expect(
      within(studio).getByRole("combobox", { name: "Camera intent" }),
    ).toHaveValue("Unspecified");
    expect(
      within(studio).getByRole("combobox", { name: "Performance pace" }),
    ).toHaveValue("Unspecified");
    expect(
      within(studio).getByRole("combobox", { name: "End hold" }),
    ).toHaveValue("Unspecified");
    await user.keyboard("{Home}");
    expect(direct).toHaveAttribute("aria-selected", "true");
    expect(direct).toHaveFocus();
    await user.keyboard("{End}");
    expect(motion).toHaveAttribute("aria-selected", "true");
    expect(motion).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(direct).toHaveAttribute("aria-selected", "true");
    expect(direct).toHaveFocus();

    // F3-WP3: every Director tab edits the same per-beat session draft
    // through the shared Apply/Undo/Redo. Visual exposes exactly Framing
    // and Composition focus; Motion exposes exactly Camera intent,
    // Performance pace, and End hold; Direct keeps its three drafts.
    const inspector = within(studio).getByRole("complementary", {
      name: "Studio inspector",
    });
    await user.click(visual);
    expect(within(inspector).getAllByRole("combobox")).toHaveLength(1);
    expect(within(inspector).getAllByRole("textbox")).toHaveLength(1);
    expect(
      within(inspector).getByRole("button", { name: "Apply" }),
    ).toBeEnabled();
    expect(
      within(inspector).getByRole("button", { name: "Undo" }),
    ).toBeDisabled();
    expect(
      within(inspector).getByRole("button", { name: "Redo" }),
    ).toBeDisabled();
    await user.click(motion);
    expect(within(inspector).getAllByRole("combobox")).toHaveLength(3);
    expect(within(inspector).queryByRole("textbox")).not.toBeInTheDocument();
    expect(
      within(inspector).getByRole("button", { name: "Apply" }),
    ).toBeEnabled();
    await user.click(direct);
    expect(within(inspector).getAllByRole("textbox")).toHaveLength(3);
    expect(within(inspector).queryByRole("combobox")).not.toBeInTheDocument();
    expect(
      within(inspector).getByRole("button", { name: "Apply" }),
    ).toBeEnabled();
    expect(
      within(inspector).getByRole("button", { name: "Undo" }),
    ).toBeDisabled();
    expect(
      within(inspector).getByRole("button", { name: "Redo" }),
    ).toBeDisabled();
  });

  it("updates the permanent scope header across scenes, beats, and tabs", async () => {
    const user = userEvent.setup();
    const studio = await openDemoStudio(user);

    await user.click(
      within(rail(studio)).getByRole("button", {
        name: /Scene 6 Folded Hills/,
      }),
    );
    expect(scopeHeader(studio)).toHaveTextContent("Sequence 3 · The journey");
    expect(scopeHeader(studio)).toHaveTextContent("Scene 6 · Folded Hills");
    expect(scopeHeader(studio)).toHaveTextContent(
      "Beat 1 · Paper hills unfold into a valley",
    );

    await user.click(
      within(rail(studio)).getByRole("button", {
        name: /Beat 2 The Storylight shows the doorway/,
      }),
    );
    expect(scopeHeader(studio)).toHaveTextContent(
      "Beat 2 · The Storylight shows the doorway",
    );
    expect(scopeHeader(studio)).not.toHaveTextContent("Beat 1 · Paper hills");

    // Tab changes never alter the shared scope.
    await user.click(within(studio).getByRole("tab", { name: "Motion" }));
    expect(scopeHeader(studio)).toHaveTextContent(
      "Beat 2 · The Storylight shows the doorway",
    );
  });
});

describe("F3-WP2 — Direct drafts and scoped per-beat history", () => {
  async function openDemoStudio(user: ReturnType<typeof userEvent.setup>) {
    render(<App />);
    await user.click(
      await screen.findByRole("button", {
        name: /Open local demo project The Storylight in the Little Wood/,
      }),
    );
    return screen.findByTestId("pv1-studio");
  }

  const rail = (studio: HTMLElement) =>
    within(studio).getByRole("navigation", { name: "Episode hierarchy" });

  const directFields = (studio: HTMLElement) => ({
    purpose: within(studio).getByRole("textbox", { name: "Beat purpose" }),
    performance: within(studio).getByRole("textbox", {
      name: "Performance direction",
    }),
    continuity: within(studio).getByRole("textbox", {
      name: "Continuity note",
    }),
  });

  const applyButton = (studio: HTMLElement) =>
    within(studio).getByRole("button", { name: "Apply" });
  const undoButton = (studio: HTMLElement) =>
    within(studio).getByRole("button", { name: "Undo" });
  const redoButton = (studio: HTMLElement) =>
    within(studio).getByRole("button", { name: "Redo" });

  it("commits the complete three-field draft as one atomic Apply step with honest states", async () => {
    const user = userEvent.setup();
    const studio = await openDemoStudio(user);

    // The session-local boundary wording is plain and always visible.
    expect(studio).toHaveTextContent(
      "Session-local only — this direction and its undo history stay in this Studio session. They are not saved to the project, are not interpreted by AI, and are not used for animation, rendering, or export.",
    );

    const fields = directFields(studio);
    expect(applyButton(studio)).toBeEnabled();
    expect(undoButton(studio)).toBeDisabled();
    expect(redoButton(studio)).toBeDisabled();
    expect(studio).toHaveTextContent(
      "Draft matches this beat's committed session direction.",
    );

    await user.type(fields.purpose, "Establish the nook as a safe home base");
    await user.type(fields.performance, "Warm, unhurried, slightly sleepy");
    await user.type(fields.continuity, "Window light stays warm into Beat 2");
    expect(studio).toHaveTextContent(
      "Unapplied draft changes — Apply commits them as one step in this beat's session history.",
    );
    // Editing the draft alone never creates history.
    expect(undoButton(studio)).toBeDisabled();

    await user.click(applyButton(studio));
    expect(studio).toHaveTextContent(
      "Draft matches this beat's committed session direction.",
    );
    expect(undoButton(studio)).toBeEnabled();
    expect(redoButton(studio)).toBeDisabled();
    expect(fields.purpose).toHaveValue(
      "Establish the nook as a safe home base",
    );
    expect(fields.performance).toHaveValue("Warm, unhurried, slightly sleepy");
    expect(fields.continuity).toHaveValue(
      "Window light stays warm into Beat 2",
    );
  });

  it("creates no phantom history step when Apply is unchanged", async () => {
    const user = userEvent.setup();
    const studio = await openDemoStudio(user);
    const fields = directFields(studio);

    await user.type(fields.purpose, "First committed purpose");
    await user.click(applyButton(studio));
    // Re-applying the identical snapshot is a truthful no-op.
    await user.click(applyButton(studio));

    // Exactly one undo step exists: a single Undo returns to the initial
    // empty snapshot, and no further undo is available. A phantom step
    // would leave Undo enabled on an identical snapshot here.
    await user.click(undoButton(studio));
    expect(fields.purpose).toHaveValue("");
    expect(undoButton(studio)).toBeDisabled();
    expect(redoButton(studio)).toBeEnabled();

    await user.click(redoButton(studio));
    expect(fields.purpose).toHaveValue("First committed purpose");
  });

  it("restores prior and exact undone snapshots and syncs the visible draft", async () => {
    const user = userEvent.setup();
    const studio = await openDemoStudio(user);
    const fields = directFields(studio);

    await user.type(fields.purpose, "Purpose A");
    await user.type(fields.performance, "Performance A");
    await user.type(fields.continuity, "Continuity A");
    await user.click(applyButton(studio));

    await user.clear(fields.purpose);
    await user.type(fields.purpose, "Purpose B");
    await user.clear(fields.performance);
    await user.type(fields.performance, "Performance B");
    await user.clear(fields.continuity);
    await user.type(fields.continuity, "Continuity B");
    await user.click(applyButton(studio));

    // Undo restores the prior committed snapshot into the visible draft.
    await user.click(undoButton(studio));
    expect(fields.purpose).toHaveValue("Purpose A");
    expect(fields.performance).toHaveValue("Performance A");
    expect(fields.continuity).toHaveValue("Continuity A");
    expect(studio).toHaveTextContent(
      "Draft matches this beat's committed session direction.",
    );
    expect(redoButton(studio)).toBeEnabled();

    // Redo restores the exact undone snapshot.
    await user.click(redoButton(studio));
    expect(fields.purpose).toHaveValue("Purpose B");
    expect(fields.performance).toHaveValue("Performance B");
    expect(fields.continuity).toHaveValue("Continuity B");
    expect(redoButton(studio)).toBeDisabled();
    expect(undoButton(studio)).toBeEnabled();
  });

  it("invalidates only the selected beat's redo branch after Undo plus a distinct Apply", async () => {
    const user = userEvent.setup();
    const studio = await openDemoStudio(user);
    const fields = directFields(studio);

    await user.type(fields.purpose, "Snapshot A");
    await user.click(applyButton(studio));
    await user.clear(fields.purpose);
    await user.type(fields.purpose, "Snapshot B");
    await user.click(applyButton(studio));

    await user.click(undoButton(studio));
    expect(fields.purpose).toHaveValue("Snapshot A");

    // A distinct commit after Undo truncates this beat's redo branch.
    await user.clear(fields.purpose);
    await user.type(fields.purpose, "Snapshot C");
    await user.click(applyButton(studio));
    expect(redoButton(studio)).toBeDisabled();

    // The committed line is now empty → A → C: B can never reappear.
    await user.click(undoButton(studio));
    expect(fields.purpose).toHaveValue("Snapshot A");
    await user.click(redoButton(studio));
    expect(fields.purpose).toHaveValue("Snapshot C");
    expect(redoButton(studio)).toBeDisabled();
  });

  it("keeps drafts, commits, and histories independent across two beats in one scene", async () => {
    const user = userEvent.setup();
    const studio = await openDemoStudio(user);
    const fields = directFields(studio);

    // Commit on Scene 1 · Beat 1.
    await user.type(fields.purpose, "Beat 1 committed purpose");
    await user.click(applyButton(studio));

    // Beat 2 starts clean: no leaked draft, commit, or history.
    await user.click(
      within(rail(studio)).getByRole("button", {
        name: /Beat 2 A shelf of unfinished stories/,
      }),
    );
    expect(fields.purpose).toHaveValue("");
    expect(fields.performance).toHaveValue("");
    expect(fields.continuity).toHaveValue("");
    expect(undoButton(studio)).toBeDisabled();
    expect(redoButton(studio)).toBeDisabled();
    expect(studio).toHaveTextContent(
      "Draft matches this beat's committed session direction.",
    );

    // An unapplied Beat 2 draft survives leaving and returning, and never
    // appears on Beat 1.
    await user.type(fields.purpose, "Beat 2 unapplied draft");
    await user.click(
      within(rail(studio)).getByRole("button", {
        name: /Beat 1 Morning light through the round window/,
      }),
    );
    expect(fields.purpose).toHaveValue("Beat 1 committed purpose");
    expect(undoButton(studio)).toBeEnabled();

    await user.click(
      within(rail(studio)).getByRole("button", {
        name: /Beat 2 A shelf of unfinished stories/,
      }),
    );
    expect(fields.purpose).toHaveValue("Beat 2 unapplied draft");
    expect(studio).toHaveTextContent("Unapplied draft changes");
    expect(undoButton(studio)).toBeDisabled();

    // Committing Beat 2 never touches Beat 1's independent history.
    await user.click(applyButton(studio));
    await user.click(
      within(rail(studio)).getByRole("button", {
        name: /Beat 1 Morning light through the round window/,
      }),
    );
    expect(fields.purpose).toHaveValue("Beat 1 committed purpose");
    await user.click(undoButton(studio));
    expect(fields.purpose).toHaveValue("");
    expect(undoButton(studio)).toBeDisabled();

    await user.click(
      within(rail(studio)).getByRole("button", {
        name: /Beat 2 A shelf of unfinished stories/,
      }),
    );
    expect(fields.purpose).toHaveValue("Beat 2 unapplied draft");
    expect(undoButton(studio)).toBeEnabled();
    expect(redoButton(studio)).toBeDisabled();
  });

  it("keeps histories independent across scenes and selects the first beat without leaking state", async () => {
    const user = userEvent.setup();
    const studio = await openDemoStudio(user);
    const fields = directFields(studio);

    // Commit on Scene 1 · Beat 1, then change scenes from the rail.
    await user.type(fields.purpose, "Scene 1 beat 1 purpose");
    await user.click(applyButton(studio));
    await user.click(
      within(rail(studio)).getByRole("button", {
        name: /Scene 2 Forest Path/,
      }),
    );

    // The scene change still selects its first beat, and nothing leaks:
    // clean draft, clean history, honest status.
    expect(within(studio).getByRole("tabpanel")).toHaveTextContent(
      "Scope: Scene 2 · Beat 1 — Ollo bounces ahead of Tix",
    );
    expect(fields.purpose).toHaveValue("");
    expect(fields.performance).toHaveValue("");
    expect(fields.continuity).toHaveValue("");
    expect(undoButton(studio)).toBeDisabled();
    expect(redoButton(studio)).toBeDisabled();
    expect(studio).toHaveTextContent(
      "Draft matches this beat's committed session direction.",
    );

    // Commit a different snapshot on Scene 2 · Beat 1.
    await user.type(fields.purpose, "Scene 2 beat 1 purpose");
    await user.click(applyButton(studio));

    // Leave and return: Scene 1 kept its own committed snapshot and undo
    // availability; Scene 2 kept its own independent commit.
    await user.click(
      within(rail(studio)).getByRole("button", {
        name: /Scene 1 The Home Nook/,
      }),
    );
    expect(within(studio).getByRole("tabpanel")).toHaveTextContent(
      "Scope: Scene 1 · Beat 1 — Morning light through the round window",
    );
    expect(fields.purpose).toHaveValue("Scene 1 beat 1 purpose");
    expect(undoButton(studio)).toBeEnabled();

    await user.click(
      within(rail(studio)).getByRole("button", {
        name: /Scene 2 Forest Path/,
      }),
    );
    expect(fields.purpose).toHaveValue("Scene 2 beat 1 purpose");
    expect(undoButton(studio)).toBeEnabled();
    expect(redoButton(studio)).toBeDisabled();
  });
});

describe("F3-WP3 — Visual and Motion scoped history", () => {
  async function openDemoStudio(user: ReturnType<typeof userEvent.setup>) {
    render(<App />);
    await user.click(
      await screen.findByRole("button", {
        name: /Open local demo project The Storylight in the Little Wood/,
      }),
    );
    return screen.findByTestId("pv1-studio");
  }

  const EMPTY_SUMMARY =
    "No Visual or Motion direction committed for this beat";
  const PLANNING_NOTE = "Planning overlay — not animation or rendered output.";

  const rail = (studio: HTMLElement) =>
    within(studio).getByRole("navigation", { name: "Episode hierarchy" });
  const tab = (studio: HTMLElement, name: "Direct" | "Visual" | "Motion") =>
    within(studio).getByRole("tab", { name });
  const applyButton = (studio: HTMLElement) =>
    within(studio).getByRole("button", { name: "Apply" });
  const undoButton = (studio: HTMLElement) =>
    within(studio).getByRole("button", { name: "Undo" });
  const redoButton = (studio: HTMLElement) =>
    within(studio).getByRole("button", { name: "Redo" });
  const summary = (studio: HTMLElement) =>
    within(studio).getByRole("region", {
      name: "Selected direction summary",
    });

  it("keeps each of the five Visual/Motion controls draft-only until Apply and scoped to the selected beat", async () => {
    const user = userEvent.setup();
    const studio = await openDemoStudio(user);

    // Initial committed state: honest empty summary, planning-only note,
    // and the untouched reference image.
    expect(summary(studio)).toHaveTextContent(EMPTY_SUMMARY);
    expect(summary(studio)).toHaveTextContent(PLANNING_NOTE);
    expect(
      within(studio).getByAltText("Ollo & Friends cast reference art"),
    ).toBeInTheDocument();

    // Visual tab: draft Framing and Composition focus. The committed
    // summary must not move.
    await user.click(tab(studio, "Visual"));
    const framing = within(studio).getByRole("combobox", {
      name: "Framing",
    });
    const composition = within(studio).getByRole("textbox", {
      name: "Composition focus",
    });
    await user.selectOptions(framing, "Wide");
    await user.type(composition, "Window light on the shelf");
    expect(framing).toHaveValue("Wide");
    expect(composition).toHaveValue("Window light on the shelf");
    expect(summary(studio)).toHaveTextContent(EMPTY_SUMMARY);
    expect(summary(studio)).not.toHaveTextContent(
      "Window light on the shelf",
    );
    expect(studio).toHaveTextContent("Unapplied draft changes");

    // Motion tab: draft Camera intent, Performance pace, and End hold.
    // Still nothing committed; the unapplied status follows the tab.
    await user.click(tab(studio, "Motion"));
    await user.selectOptions(
      within(studio).getByRole("combobox", { name: "Camera intent" }),
      "Gentle push",
    );
    await user.selectOptions(
      within(studio).getByRole("combobox", { name: "Performance pace" }),
      "Measured",
    );
    await user.selectOptions(
      within(studio).getByRole("combobox", { name: "End hold" }),
      "Brief hold",
    );
    expect(summary(studio)).toHaveTextContent(EMPTY_SUMMARY);
    expect(studio).toHaveTextContent("Unapplied draft changes");

    // The drafts belong to this beat only: Beat 2 starts clean on the
    // same tabs, and Beat 1's unapplied drafts survive leave-and-return.
    await user.click(
      within(rail(studio)).getByRole("button", {
        name: /Beat 2 A shelf of unfinished stories/,
      }),
    );
    expect(
      within(studio).getByRole("combobox", { name: "Camera intent" }),
    ).toHaveValue("Unspecified");
    expect(summary(studio)).toHaveTextContent(EMPTY_SUMMARY);
    expect(undoButton(studio)).toBeDisabled();

    await user.click(
      within(rail(studio)).getByRole("button", {
        name: /Beat 1 Morning light through the round window/,
      }),
    );
    expect(
      within(studio).getByRole("combobox", { name: "Camera intent" }),
    ).toHaveValue("Gentle push");
    expect(studio).toHaveTextContent("Unapplied draft changes");
    expect(summary(studio)).toHaveTextContent(EMPTY_SUMMARY);

    // One Apply from the Motion tab commits the complete cross-tab draft.
    await user.click(applyButton(studio));
    expect(studio).toHaveTextContent(
      "Draft matches this beat's committed session direction.",
    );
    expect(summary(studio)).not.toHaveTextContent(EMPTY_SUMMARY);
    expect(summary(studio)).toHaveTextContent("Wide");
    expect(summary(studio)).toHaveTextContent("Window light on the shelf");
    expect(summary(studio)).toHaveTextContent("Gentle push");
    expect(summary(studio)).toHaveTextContent("Measured");
    expect(summary(studio)).toHaveTextContent("Brief hold");
    expect(summary(studio)).toHaveTextContent(PLANNING_NOTE);
    expect(undoButton(studio)).toBeEnabled();
    expect(redoButton(studio)).toBeDisabled();
  });

  it("commits edits across Direct, Visual, and Motion as one atomic history step", async () => {
    const user = userEvent.setup();
    const studio = await openDemoStudio(user);

    await user.type(
      within(studio).getByRole("textbox", { name: "Beat purpose" }),
      "Open the nook in morning calm",
    );
    await user.type(
      within(studio).getByRole("textbox", { name: "Performance direction" }),
      "Slow blink, then a smile",
    );
    await user.type(
      within(studio).getByRole("textbox", { name: "Continuity note" }),
      "Shelf props stay put",
    );

    await user.click(tab(studio, "Visual"));
    await user.selectOptions(
      within(studio).getByRole("combobox", { name: "Framing" }),
      "Medium",
    );
    await user.type(
      within(studio).getByRole("textbox", { name: "Composition focus" }),
      "The round window behind Ollo",
    );

    await user.click(tab(studio, "Motion"));
    await user.selectOptions(
      within(studio).getByRole("combobox", { name: "Camera intent" }),
      "Locked-off",
    );
    await user.selectOptions(
      within(studio).getByRole("combobox", { name: "Performance pace" }),
      "Gentle",
    );
    await user.selectOptions(
      within(studio).getByRole("combobox", { name: "End hold" }),
      "No hold",
    );

    // A single Apply from the Motion tab commits all eight fields at once.
    await user.click(applyButton(studio));
    expect(undoButton(studio)).toBeEnabled();
    expect(summary(studio)).toHaveTextContent("Medium");
    expect(summary(studio)).toHaveTextContent(
      "The round window behind Ollo",
    );
    expect(summary(studio)).toHaveTextContent("Locked-off");
    expect(summary(studio)).toHaveTextContent("Gentle");
    expect(summary(studio)).toHaveTextContent("No hold");

    // Exactly one history step exists: a single Undo from the Visual tab
    // returns every field on every tab to the initial empty snapshot.
    await user.click(tab(studio, "Visual"));
    await user.click(undoButton(studio));
    expect(undoButton(studio)).toBeDisabled();
    expect(redoButton(studio)).toBeEnabled();
    expect(
      within(studio).getByRole("combobox", { name: "Framing" }),
    ).toHaveValue("Unspecified");
    expect(
      within(studio).getByRole("textbox", { name: "Composition focus" }),
    ).toHaveValue("");
    expect(summary(studio)).toHaveTextContent(EMPTY_SUMMARY);
    await user.click(tab(studio, "Motion"));
    expect(
      within(studio).getByRole("combobox", { name: "Camera intent" }),
    ).toHaveValue("Unspecified");
    expect(
      within(studio).getByRole("combobox", { name: "Performance pace" }),
    ).toHaveValue("Unspecified");
    expect(
      within(studio).getByRole("combobox", { name: "End hold" }),
    ).toHaveValue("Unspecified");
    await user.click(tab(studio, "Direct"));
    expect(
      within(studio).getByRole("textbox", { name: "Beat purpose" }),
    ).toHaveValue("");
    expect(
      within(studio).getByRole("textbox", { name: "Performance direction" }),
    ).toHaveValue("");
    expect(
      within(studio).getByRole("textbox", { name: "Continuity note" }),
    ).toHaveValue("");

    // Redo from the Direct tab restores the exact complete snapshot.
    await user.click(redoButton(studio));
    expect(
      within(studio).getByRole("textbox", { name: "Beat purpose" }),
    ).toHaveValue("Open the nook in morning calm");
    expect(
      within(studio).getByRole("textbox", { name: "Performance direction" }),
    ).toHaveValue("Slow blink, then a smile");
    expect(
      within(studio).getByRole("textbox", { name: "Continuity note" }),
    ).toHaveValue("Shelf props stay put");
    expect(summary(studio)).toHaveTextContent("Medium");
    expect(summary(studio)).toHaveTextContent("Locked-off");
    expect(redoButton(studio)).toBeDisabled();
  });

  it("restores every field and the committed summary through Undo/Redo from different tabs", async () => {
    const user = userEvent.setup();
    const studio = await openDemoStudio(user);

    const commitComplete = async (
      framing: string,
      composition: string,
      camera: string,
      pace: string,
      hold: string,
      purpose: string,
    ) => {
      await user.click(tab(studio, "Direct"));
      const purposeField = within(studio).getByRole("textbox", {
        name: "Beat purpose",
      });
      await user.clear(purposeField);
      await user.type(purposeField, purpose);
      await user.click(tab(studio, "Visual"));
      await user.selectOptions(
        within(studio).getByRole("combobox", { name: "Framing" }),
        framing,
      );
      const compositionField = within(studio).getByRole("textbox", {
        name: "Composition focus",
      });
      await user.clear(compositionField);
      await user.type(compositionField, composition);
      await user.click(tab(studio, "Motion"));
      await user.selectOptions(
        within(studio).getByRole("combobox", { name: "Camera intent" }),
        camera,
      );
      await user.selectOptions(
        within(studio).getByRole("combobox", { name: "Performance pace" }),
        pace,
      );
      await user.selectOptions(
        within(studio).getByRole("combobox", { name: "End hold" }),
        hold,
      );
      await user.click(applyButton(studio));
    };

    await commitComplete(
      "Wide",
      "Doorway centered",
      "Gentle push",
      "Measured",
      "Brief hold",
      "Purpose A",
    );
    await commitComplete(
      "Close-up",
      "The glow on Tix's face",
      "Follow action",
      "Energetic",
      "Full hold",
      "Purpose B",
    );
    expect(summary(studio)).toHaveTextContent("Close-up");
    expect(summary(studio)).toHaveTextContent("Follow action");

    // Undo from the Direct tab: every tab's fields and the board summary
    // return to the exact first committed snapshot.
    await user.click(tab(studio, "Direct"));
    expect(
      within(studio).getByRole("textbox", { name: "Beat purpose" }),
    ).toHaveValue("Purpose B");
    await user.click(undoButton(studio));
    expect(
      within(studio).getByRole("textbox", { name: "Beat purpose" }),
    ).toHaveValue("Purpose A");
    expect(summary(studio)).toHaveTextContent("Wide");
    expect(summary(studio)).toHaveTextContent("Doorway centered");
    expect(summary(studio)).toHaveTextContent("Gentle push");
    expect(summary(studio)).toHaveTextContent("Measured");
    expect(summary(studio)).toHaveTextContent("Brief hold");
    expect(summary(studio)).not.toHaveTextContent("Close-up");

    await user.click(tab(studio, "Visual"));
    expect(
      within(studio).getByRole("combobox", { name: "Framing" }),
    ).toHaveValue("Wide");
    expect(
      within(studio).getByRole("textbox", { name: "Composition focus" }),
    ).toHaveValue("Doorway centered");

    // Redo from the Motion tab restores the exact second snapshot.
    await user.click(tab(studio, "Motion"));
    await user.click(redoButton(studio));
    expect(
      within(studio).getByRole("combobox", { name: "Camera intent" }),
    ).toHaveValue("Follow action");
    expect(
      within(studio).getByRole("combobox", { name: "Performance pace" }),
    ).toHaveValue("Energetic");
    expect(
      within(studio).getByRole("combobox", { name: "End hold" }),
    ).toHaveValue("Full hold");
    expect(summary(studio)).toHaveTextContent("Close-up");
    expect(summary(studio)).toHaveTextContent("The glow on Tix's face");
    expect(redoButton(studio)).toBeDisabled();
  });

  it("keeps drafts, commits, histories, and summaries independent across two beats in one scene", async () => {
    const user = userEvent.setup();
    const studio = await openDemoStudio(user);

    // Commit a complete direction on Scene 1 · Beat 1 from the Visual tab.
    await user.click(tab(studio, "Visual"));
    await user.selectOptions(
      within(studio).getByRole("combobox", { name: "Framing" }),
      "Wide",
    );
    await user.click(applyButton(studio));
    expect(summary(studio)).toHaveTextContent("Wide");

    // Beat 2 starts clean: empty controls, empty summary, no history.
    await user.click(
      within(rail(studio)).getByRole("button", {
        name: /Beat 2 A shelf of unfinished stories/,
      }),
    );
    expect(
      within(studio).getByRole("combobox", { name: "Framing" }),
    ).toHaveValue("Unspecified");
    expect(summary(studio)).toHaveTextContent(EMPTY_SUMMARY);
    expect(undoButton(studio)).toBeDisabled();

    // An unapplied Beat 2 Motion draft survives leave-and-return and
    // never moves Beat 1's committed summary.
    await user.click(tab(studio, "Motion"));
    await user.selectOptions(
      within(studio).getByRole("combobox", { name: "End hold" }),
      "Full hold",
    );
    await user.click(
      within(rail(studio)).getByRole("button", {
        name: /Beat 1 Morning light through the round window/,
      }),
    );
    expect(summary(studio)).toHaveTextContent("Wide");
    expect(summary(studio)).not.toHaveTextContent("Full hold");
    await user.click(
      within(rail(studio)).getByRole("button", {
        name: /Beat 2 A shelf of unfinished stories/,
      }),
    );
    expect(
      within(studio).getByRole("combobox", { name: "End hold" }),
    ).toHaveValue("Full hold");
    expect(summary(studio)).toHaveTextContent(EMPTY_SUMMARY);
    expect(studio).toHaveTextContent("Unapplied draft changes");

    // Committing Beat 2 leaves Beat 1's commit and history untouched.
    await user.click(applyButton(studio));
    expect(summary(studio)).toHaveTextContent("Full hold");
    await user.click(
      within(rail(studio)).getByRole("button", {
        name: /Beat 1 Morning light through the round window/,
      }),
    );
    expect(summary(studio)).toHaveTextContent("Wide");
    expect(undoButton(studio)).toBeEnabled();
    await user.click(undoButton(studio));
    expect(summary(studio)).toHaveTextContent(EMPTY_SUMMARY);
    expect(undoButton(studio)).toBeDisabled();

    // Beat 2's committed snapshot is unaffected by Beat 1's Undo.
    await user.click(
      within(rail(studio)).getByRole("button", {
        name: /Beat 2 A shelf of unfinished stories/,
      }),
    );
    expect(summary(studio)).toHaveTextContent("Full hold");
    expect(undoButton(studio)).toBeEnabled();
  });

  it("keeps first beats in two scenes independent and selects the first beat without leaking state", async () => {
    const user = userEvent.setup();
    const studio = await openDemoStudio(user);

    // Commit on Scene 1 · Beat 1 from the Motion tab.
    await user.click(tab(studio, "Motion"));
    await user.selectOptions(
      within(studio).getByRole("combobox", { name: "Performance pace" }),
      "Energetic",
    );
    await user.click(applyButton(studio));
    expect(summary(studio)).toHaveTextContent("Energetic");

    // Changing scenes selects the new scene's first beat: clean draft,
    // clean history, empty summary.
    await user.click(
      within(rail(studio)).getByRole("button", {
        name: /Scene 2 Forest Path/,
      }),
    );
    expect(within(studio).getByRole("tabpanel")).toHaveTextContent(
      "Scope: Scene 2 · Beat 1 — Ollo bounces ahead of Tix",
    );
    expect(
      within(studio).getByRole("combobox", { name: "Performance pace" }),
    ).toHaveValue("Unspecified");
    expect(summary(studio)).toHaveTextContent(EMPTY_SUMMARY);
    expect(undoButton(studio)).toBeDisabled();
    expect(redoButton(studio)).toBeDisabled();

    // Commit a different value on Scene 2 · Beat 1.
    await user.selectOptions(
      within(studio).getByRole("combobox", { name: "Performance pace" }),
      "Gentle",
    );
    await user.click(applyButton(studio));
    expect(summary(studio)).toHaveTextContent("Gentle");
    expect(summary(studio)).not.toHaveTextContent("Energetic");

    // Leave and return: each scene's first beat keeps its own commit and
    // summary.
    await user.click(
      within(rail(studio)).getByRole("button", {
        name: /Scene 1 The Home Nook/,
      }),
    );
    expect(within(studio).getByRole("tabpanel")).toHaveTextContent(
      "Scope: Scene 1 · Beat 1 — Morning light through the round window",
    );
    expect(
      within(studio).getByRole("combobox", { name: "Performance pace" }),
    ).toHaveValue("Energetic");
    expect(summary(studio)).toHaveTextContent("Energetic");
    expect(undoButton(studio)).toBeEnabled();

    await user.click(
      within(rail(studio)).getByRole("button", {
        name: /Scene 2 Forest Path/,
      }),
    );
    expect(
      within(studio).getByRole("combobox", { name: "Performance pace" }),
    ).toHaveValue("Gentle");
    expect(summary(studio)).toHaveTextContent("Gentle");
  });

  it("shows only committed values in the board summary and never alters the reference image", async () => {
    const user = userEvent.setup();
    const studio = await openDemoStudio(user);

    const referenceImage = () =>
      within(studio).getByAltText("Ollo & Friends cast reference art");
    const srcBefore = referenceImage().getAttribute("src");

    expect(summary(studio)).toHaveTextContent(EMPTY_SUMMARY);
    expect(summary(studio)).toHaveTextContent(PLANNING_NOTE);

    // Draft values never appear in the summary.
    await user.click(tab(studio, "Visual"));
    await user.selectOptions(
      within(studio).getByRole("combobox", { name: "Framing" }),
      "Close-up",
    );
    await user.type(
      within(studio).getByRole("textbox", { name: "Composition focus" }),
      "Tix peeking over the shelf edge",
    );
    expect(summary(studio)).toHaveTextContent(EMPTY_SUMMARY);
    expect(summary(studio)).not.toHaveTextContent("Close-up");
    expect(summary(studio)).not.toHaveTextContent(
      "Tix peeking over the shelf edge",
    );
    expect(referenceImage().getAttribute("src")).toBe(srcBefore);

    // After Apply the committed values appear; the reference image and
    // the planning-only note are unchanged.
    await user.click(applyButton(studio));
    expect(summary(studio)).toHaveTextContent("Close-up");
    expect(summary(studio)).toHaveTextContent(
      "Tix peeking over the shelf edge",
    );
    expect(summary(studio)).toHaveTextContent(PLANNING_NOTE);
    expect(referenceImage().getAttribute("src")).toBe(srcBefore);
  });
});

/* ──────────────────────────────────────────────────────────────────── */
/* F3-WP4 — AI Director conversation and proposal shell                 */
/* ──────────────────────────────────────────────────────────────────── */

const WP4_SCOPE_INPUT: AiCapturedScope = {
  sceneId: "scene-1",
  sceneIndex: 1,
  sceneTitle: "The Home Nook",
  beatIndex: 0,
  beatTitle: "Morning light through the round window",
  playheadSeconds: 12,
  rangeStartSeconds: 0,
  rangeEndSeconds: 70,
};

describe("F3-WP4 — AI Director fixture state model (pure)", () => {
  it("provides six labelled connection fixtures and honest fixture text", () => {
    expect(AI_CONNECTION_STATES).toHaveLength(6);
    expect(AI_CONNECTION_LABELS.connected).toBe("Connected");
    expect(AI_CONNECTION_LABELS["signed-out"]).toBe("Signed out");
    expect(AI_CONNECTION_LABELS.offline).toBe("Offline");
    expect(AI_CONNECTION_LABELS["usage-limit"]).toBe("Usage limit");
    expect(AI_CONNECTION_LABELS["update-required"]).toBe("Update required");
    expect(AI_CONNECTION_LABELS.crashed).toBe("Crashed");
    expect(AI_FIXTURE_LABEL).toBe(
      "Local AI Director fixture — no service connected",
    );
  });

  it("captures request scope immutably and settles turns deterministically", () => {
    const scopeInput = { ...WP4_SCOPE_INPUT };
    const scope = captureAiScope(scopeInput);
    scopeInput.playheadSeconds = 99;
    scopeInput.beatIndex = 1;
    expect(scope.playheadSeconds).toBe(12);
    expect(scope.beatIndex).toBe(0);

    const turn = startAiTurn(1, "Hold the hush", scope);
    expect(turn.status).toBe("streaming");
    expect(turn.stageIndex).toBe(0);
    let advanced = turn;
    for (let index = 0; index < 10; index += 1)
      advanced = advanceAiTurn(advanced);
    expect(advanced.stageIndex).toBe(3); // caps at the last fixture stage

    // Cancelled and Error are turn states; they can never complete.
    const cancelled = cancelAiTurn(turn);
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.scope).toEqual(scope); // captured scope preserved
    expect(completeAiTurn(cancelled, "connected").status).toBe("cancelled");
    expect(completeAiTurn(turn, "offline").status).toBe("error");
    expect(completeAiTurn(turn, "usage-limit").status).toBe("error");

    const completed = completeAiTurn(turn, "connected");
    expect(completed.status).toBe("complete");
    expect(completed.proposal).not.toBeNull();
    // Deterministic: the same request and scope always build the same
    // proposal.
    expect(completed.proposal).toEqual(
      buildFixtureProposal(1, "Hold the hush", scope),
    );
  });

  it("fails Apply closed on stale scope or unapplied manual drafts only", () => {
    const scope = captureAiScope(WP4_SCOPE_INPUT);
    const clean = initialBeatDirectState();
    expect(
      aiApplyBlocker({
        scope,
        selectedSceneId: "scene-2",
        selectedBeatIndex: 0,
        beatState: clean,
      }),
    ).toBe("stale-scope");
    expect(
      aiApplyBlocker({
        scope,
        selectedSceneId: "scene-1",
        selectedBeatIndex: 1,
        beatState: clean,
      }),
    ).toBe("stale-scope");
    const dirty = updateDirectDraft(clean, { beatPurpose: "manual" });
    expect(
      aiApplyBlocker({
        scope,
        selectedSceneId: "scene-1",
        selectedBeatIndex: 0,
        beatState: dirty,
      }),
    ).toBe("unapplied-manual-draft");
    expect(
      aiApplyBlocker({
        scope,
        selectedSceneId: "scene-1",
        selectedBeatIndex: 0,
        beatState: clean,
      }),
    ).toBeNull();
  });

  it("commits exactly performanceDirection through the existing history and undoes exactly", () => {
    const scope = captureAiScope(WP4_SCOPE_INPUT);
    const proposal = buildFixtureProposal(1, "Hold the hush", scope);
    const manual = applyDirectDraft(
      updateDirectDraft(initialBeatDirectState(), {
        beatPurpose: "Keep it cozy",
        performanceDirection: "Soft and slow",
      }),
    );
    const priorCommitted = committedDirectDraft(manual);
    const applied = applyProposalToBeatState(manual, proposal);
    // One atomic step, exactly one changed field.
    expect(applied.history.length).toBe(manual.history.length + 1);
    expect(committedDirectDraft(applied).performanceDirection).toBe(
      proposal.performanceDirection,
    );
    expect(committedDirectDraft(applied).beatPurpose).toBe("Keep it cozy");
    expect(committedDirectDraft(applied).continuityNote).toBe(
      priorCommitted.continuityNote,
    );
    expect(committedDirectDraft(applied).framing).toBe(priorCommitted.framing);
    // Exact Undo restores the prior snapshot; the guard closes after any
    // later manual commit.
    const appliedRevision = {
      revision: applied.cursor,
      node: committedDirectDraft(applied),
    };
    expect(canUndoProposalApply(applied, appliedRevision)).toBe(true);
    const undone = undoProposalApply(applied);
    expect(
      directDraftsEqual(committedDirectDraft(undone), priorCommitted),
    ).toBe(true);
    const movedOn = applyDirectDraft(
      updateDirectDraft(applied, { beatPurpose: "A manual follow-up" }),
    );
    expect(canUndoProposalApply(movedOn, appliedRevision)).toBe(false);
    expect(
      canUndoProposalApply(
        updateDirectDraft(applied, { continuityNote: "draft" }),
        appliedRevision,
      ),
    ).toBe(false);
  });

  it("binds panel Undo to the exact history revision, never field equality", () => {
    const scope = captureAiScope(WP4_SCOPE_INPUT);
    const proposal = buildFixtureProposal(1, "Hold the hush", scope);
    // AI applies snapshot S: one new revision on the empty initial snapshot.
    const applied = applyProposalToBeatState(
      initialBeatDirectState(),
      proposal,
    );
    const appliedRevision = {
      revision: applied.cursor,
      node: committedDirectDraft(applied),
    };
    expect(canUndoProposalApply(applied, appliedRevision)).toBe(true);

    // A manual commit creates T on top of S.
    const withT = applyDirectDraft(
      updateDirectDraft(applied, { beatPurpose: "Manual follow-up T" }),
    );
    expect(canUndoProposalApply(withT, appliedRevision)).toBe(false);

    // A later manual commit recreates S by value. Field equality with the
    // applied snapshot holds, but the applied revision is no longer the
    // current history node, so panel Undo stays closed and can never
    // restore the intervening T.
    const recreated = applyDirectDraft(
      updateDirectDraft(withT, { beatPurpose: "" }),
    );
    expect(
      directDraftsEqual(committedDirectDraft(recreated), appliedRevision.node),
    ).toBe(true);
    expect(recreated.cursor).not.toBe(appliedRevision.revision);
    expect(canUndoProposalApply(recreated, appliedRevision)).toBe(false);

    // Undoing the recreation through the accepted history restores T — the
    // panel Undo must stay closed exactly so it cannot perform this move.
    const backToT = undoProposalApply(recreated);
    expect(committedDirectDraft(backToT).beatPurpose).toBe(
      "Manual follow-up T",
    );
    expect(canUndoProposalApply(backToT, appliedRevision)).toBe(false);

    // Cursor reuse is not revision identity. After undoing S, a new branch
    // can commit the same values at cursor 1, but it creates a different
    // immutable history node and must not revive the old panel Undo.
    const beforeAi = undoProposalApply(applied);
    const reusedCursor = applyDirectDraft(
      updateDirectDraft(beforeAi, {
        performanceDirection: proposal.performanceDirection,
      }),
    );
    expect(reusedCursor.cursor).toBe(appliedRevision.revision);
    expect(
      directDraftsEqual(committedDirectDraft(reusedCursor), appliedRevision.node),
    ).toBe(true);
    expect(committedDirectDraft(reusedCursor)).not.toBe(appliedRevision.node);
    expect(canUndoProposalApply(reusedCursor, appliedRevision)).toBe(false);
  });

  it("never lets rejected, cancelled, error, or superseded proposals apply", () => {
    const scope = captureAiScope(WP4_SCOPE_INPUT);
    const completed = completeAiTurn(
      startAiTurn(1, "Hold the hush", scope),
      "connected",
    );
    expect(canApplyAiTurn(completed)).toBe(true);
    expect(canApplyAiTurn(rejectAiTurnProposal(completed))).toBe(false);
    expect(canApplyAiTurn(cancelAiTurn(startAiTurn(2, "Hold", scope)))).toBe(
      false,
    );
    expect(
      canApplyAiTurn(completeAiTurn(startAiTurn(3, "Hold", scope), "crashed")),
    ).toBe(false);
    const cancelled = cancelAiTurn(startAiTurn(2, "Hold", scope));
    const errored = completeAiTurn(startAiTurn(3, "Hold", scope), "crashed");
    const streaming = startAiTurn(4, "Keep moving", scope);
    const appliedTurn = { ...completed, resolution: "applied" as const };
    const settled = supersedePendingProposals([
      completed,
      cancelled,
      errored,
      streaming,
      appliedTurn,
    ]);
    expect(settled[0]!.resolution).toBe("superseded");
    expect(canApplyAiTurn(settled[0]!)).toBe(false);
    expect(settled[1]).toBe(cancelled);
    expect(settled[1]!.status).toBe("cancelled");
    expect(settled[2]).toBe(errored);
    expect(settled[2]!.status).toBe("error");
    expect(settled[3]!.resolution).toBe("superseded");
    expect(settled[4]).toBe(appliedTurn);
    // A newer request never disturbs an already-applied resolution record.
    expect(settled[4]!.resolution).toBe("applied");
  });

  it("supersedes a still-streaming turn so it can never become applicable", () => {
    const scope = captureAiScope(WP4_SCOPE_INPUT);
    const streaming = startAiTurn(1, "First overlapping request", scope);
    expect(streaming.status).toBe("streaming");
    expect(streaming.resolution).toBe("pending");

    // The overlapping send supersedes the turn while it is still streaming.
    const [superseded] = supersedePendingProposals([streaming]);
    expect(superseded!.status).toBe("streaming");
    expect(superseded!.resolution).toBe("superseded");
    expect(canApplyAiTurn(superseded!)).toBe(false);

    // It may finish its deterministic replay cleanup...
    let replayed = superseded!;
    for (let index = 0; index < 10; index += 1)
      replayed = advanceAiTurn(replayed);
    expect(replayed.stageIndex).toBe(3);
    const settled = completeAiTurn(replayed, "connected");
    // ...but it never produces a proposal and never becomes pending,
    // applicable, applied, or undoable.
    expect(settled.status).toBe("complete");
    expect(settled.resolution).toBe("superseded");
    expect(settled.proposal).toBeNull();
    expect(canApplyAiTurn(settled)).toBe(false);
    // A superseded streaming turn also never flips to the Error turn state
    // when the connection fixture is dropped at completion time.
    const droppedSettled = completeAiTurn(replayed, "offline");
    expect(droppedSettled.status).toBe("complete");
    expect(droppedSettled.resolution).toBe("superseded");
    expect(droppedSettled.proposal).toBeNull();
  });
});

describe("F3-WP4 — New Project proposal model (pure)", () => {
  it("builds a deterministic paste proposal with an honest impact and no bypass for empty input", () => {
    expect(buildPasteProposal("")).toBeNull();
    expect(buildPasteProposal("   \n  ")).toBeNull();
    const proposal = buildPasteProposal(SAMPLE_SCRIPT)!;
    expect(proposal).toEqual(buildPasteProposal(SAMPLE_SCRIPT));
    expect(proposal.source).toBe("paste");
    expect(proposal.templateLabel).toBe(CREATE_TEMPLATE_LABEL);
    expect(proposal.templateLabel).toBe("Ollo & Friends — Kids Story");
    expect(proposal.episodeTitle).toBe("Lila lives in a quiet village…");
    // Five paragraphs → scenes of at most two beats each.
    expect(proposal.scenes).toHaveLength(3);
    expect(
      proposal.scenes.reduce((sum, scene) => sum + scene.beats.length, 0),
    ).toBe(5);
    expect(proposal.hiddenBeatCount).toBe(0);
    expect(proposal.scenes[0]!.beats[0]!.title).toBe(
      "Lila lives in a quiet village at the edge of a deep, whispering forest.",
    );
    expect(proposal.assetImpactLabel).toMatch(
      /No assets, media, or project files/,
    );
    expect(proposal.affectedRangeLabel).toMatch(
      /Whole episode · about 27 seconds/,
    );

    const longScript = Array.from(
      { length: 8 },
      (_, index) => `Paragraph ${index + 1} of a longer quiet story.`,
    ).join("\n\n");
    const longProposal = buildPasteProposal(longScript)!;
    expect(longProposal.hiddenBeatCount).toBe(2);
  });

  it("builds a deterministic idea proposal echoing the conversation fields", () => {
    const empty = buildIdeaProposal({
      storyIdea: "  ",
      targetDurationSeconds: 60,
      tone: "Gentle",
      cast: "",
      constraints: "",
    });
    expect(empty).toBeNull();
    const idea = {
      storyIdea: "A brave lantern guides three friends home through the wood",
      targetDurationSeconds: 60,
      tone: "Playful" as const,
      cast: "Ollo and Tix",
      constraints: "Keep it gentle",
    };
    const proposal = buildIdeaProposal(idea)!;
    expect(proposal).toEqual(buildIdeaProposal(idea));
    expect(proposal.source).toBe("idea");
    expect(proposal.scenes).toHaveLength(3);
    expect(proposal.scenes.map((scene) => scene.title)).toEqual([
      "Scene 1 · Opening",
      "Scene 2 · Middle",
      "Scene 3 · Resolution",
    ]);
    expect(proposal.scenes.every((scene) => scene.seconds === 20)).toBe(true);
    expect(proposal.affectedRangeLabel).toBe(
      "Whole episode · about 1 min (fixture target)",
    );
    expect(proposal.directionSummary).toBe(
      "A playful three-scene Kids Story for Ollo and Tix. Constraints honored: Keep it gentle.",
    );
    expect(proposal.assetImpactLabel).toMatch(
      /No assets, media, or project files/,
    );
  });
});

describe("F3-WP4 — two-path New Project and shared proposal review", () => {
  it("converges both paths on the same review model and never bypasses review", async () => {
    const user = userEvent.setup();

    // Paste path → review.
    await openPastePath(user);
    expect(
      screen.queryByRole("button", { name: /Enter Studio/ }),
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Script" }), {
      target: { value: SAMPLE_SCRIPT },
    });
    await user.click(screen.getByRole("button", { name: "Create proposal" }));
    const pasteReview = await screen.findByRole("article", {
      name: "Review proposal",
    });
    expect(pasteReview).toHaveTextContent("From your script");
    expect(pasteReview).toHaveTextContent(AI_FIXTURE_LABEL);
    expect(
      within(pasteReview).getByRole("region", {
        name: "Proposed episode hierarchy",
      }),
    ).toBeInTheDocument();
    expect(pasteReview).toHaveTextContent("Direction summary");
    expect(pasteReview).toHaveTextContent("Affected range");
    expect(pasteReview).toHaveTextContent("Asset impact");
    expect(pasteReview).toHaveTextContent(
      "Entering Studio is local demo navigation only — no production project, media, render, or export has been created.",
    );

    // Revise returns to the intact form; review appears again on submit.
    await user.click(
      within(pasteReview).getByRole("button", { name: /Revise input/ }),
    );
    expect(screen.getByRole("textbox", { name: "Script" })).toHaveValue(
      SAMPLE_SCRIPT,
    );
    await user.click(screen.getByRole("button", { name: "Create proposal" }));
    const reviewAgain = await screen.findByRole("article", {
      name: "Review proposal",
    });
    // Start over returns to the two-path choice.
    await user.click(
      within(reviewAgain).getByRole("button", { name: "Start over" }),
    );
    expect(
      await screen.findByRole("heading", { name: /Start a new Kids Story/ }),
    ).toBeInTheDocument();

    // Idea path → the same review landmarks.
    await user.click(
      screen.getByRole("button", { name: /What's your idea\?/ }),
    );
    await user.click(
      screen.getByRole("button", { name: "Sign in with ChatGPT" }),
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Story idea" }), {
      target: { value: "A brave lantern guides three friends home" },
    });
    await user.selectOptions(screen.getByLabelText("Target duration"), "60");
    await user.selectOptions(screen.getByLabelText("Tone"), "Playful");
    await user.click(screen.getByRole("button", { name: "Create proposal" }));
    const ideaReview = await screen.findByRole("article", {
      name: "Review proposal",
    });
    expect(ideaReview).toHaveTextContent("From your idea");
    expect(ideaReview).toHaveTextContent(AI_FIXTURE_LABEL);
    expect(
      within(ideaReview).getByRole("region", {
        name: "Proposed episode hierarchy",
      }),
    ).toBeInTheDocument();
    expect(
      within(ideaReview).getByRole("textbox", { name: "Scene 1 title" }),
    ).toHaveValue("Scene 1 · Opening");
    expect(ideaReview).toHaveTextContent(
      "Whole episode · about 1 min (fixture target)",
    );
    expect(
      within(ideaReview).getByRole("button", {
        name: "Enter Studio — local demo only",
      }),
    ).toBeInTheDocument();
  });

  it("lets the creator edit the paste proposal locally and carries only the reviewed title into the demo Studio", async () => {
    const user = userEvent.setup();
    await openPastePath(user);
    fireEvent.change(screen.getByRole("textbox", { name: "Script" }), {
      target: { value: SAMPLE_SCRIPT },
    });
    await user.click(screen.getByRole("button", { name: "Create proposal" }));
    const review = await screen.findByRole("article", {
      name: "Review proposal",
    });

    // Hierarchy and direction are genuinely editable local fields.
    const episodeTitle = within(review).getByRole("textbox", {
      name: "Episode title",
    });
    expect(episodeTitle).toHaveValue("Lila lives in a quiet village…");
    await user.clear(episodeTitle);
    await user.type(episodeTitle, "Lila and the Lantern");
    const sceneDirection = within(review).getByRole("textbox", {
      name: "Scene 1 direction",
    });
    await user.clear(sceneDirection);
    await user.type(sceneDirection, "Open softly and let the glow lead.");
    const beatTitle = within(review).getByRole("textbox", {
      name: "Scene 1 beat 1 title",
    });
    await user.clear(beatTitle);
    await user.type(beatTitle, "Lila finds the glow");
    const summary = within(review).getByRole("textbox", {
      name: "Direction summary",
    });
    await user.clear(summary);
    await user.type(summary, "One gentle edited pass.");
    expect(episodeTitle).toHaveValue("Lila and the Lantern");
    expect(sceneDirection).toHaveValue("Open softly and let the glow lead.");
    expect(beatTitle).toHaveValue("Lila finds the glow");
    expect(summary).toHaveValue("One gentle edited pass.");
    // The review states plainly what the demo consumes.
    expect(review).toHaveTextContent(
      "The demo Studio opens the fixed Ollo layout-demo episode under your reviewed episode title; reviewed scenes, beats, and direction stay in this review and are not carried into the demo Studio or saved.",
    );

    // Editing the proposal is distinct from revising the source input:
    // the script stays intact and re-creating rebuilds deterministically.
    await user.click(
      within(review).getByRole("button", { name: /Revise input/ }),
    );
    expect(screen.getByRole("textbox", { name: "Script" })).toHaveValue(
      SAMPLE_SCRIPT,
    );
    await user.click(screen.getByRole("button", { name: "Create proposal" }));
    const rebuilt = await screen.findByRole("article", {
      name: "Review proposal",
    });
    expect(
      within(rebuilt).getByRole("textbox", { name: "Episode title" }),
    ).toHaveValue("Lila lives in a quiet village…");

    // Edit again, then enter Studio: the reviewed episode title — the one
    // field the existing demo draft model consumes — survives; the
    // reviewed beats honestly do not.
    const titleAgain = within(rebuilt).getByRole("textbox", {
      name: "Episode title",
    });
    await user.clear(titleAgain);
    await user.type(titleAgain, "Lila and the Lantern");
    const beatAgain = within(rebuilt).getByRole("textbox", {
      name: "Scene 1 beat 1 title",
    });
    await user.clear(beatAgain);
    await user.type(beatAgain, "Lila finds the glow");
    await user.click(
      within(rebuilt).getByRole("button", {
        name: "Enter Studio — local demo only",
      }),
    );
    const studio = await screen.findByTestId("pv1-studio");
    expect(studio.querySelector(".pv1-topbar")!).toHaveTextContent(
      "Lila and the Lantern",
    );
    expect(studio).toHaveTextContent(/Layout demo/);
    expect(studio).not.toHaveTextContent("Lila finds the glow");
  });

  it("lets the creator edit the idea proposal through the same shared review gate", async () => {
    const user = userEvent.setup();
    await openCreate(user);
    await user.click(
      screen.getByRole("button", { name: /What's your idea\?/ }),
    );
    await user.click(
      screen.getByRole("button", { name: "Sign in with ChatGPT" }),
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Story idea" }), {
      target: { value: "A brave lantern guides three friends home" },
    });
    await user.click(screen.getByRole("button", { name: "Create proposal" }));
    const review = await screen.findByRole("article", {
      name: "Review proposal",
    });
    expect(review).toHaveTextContent(AI_FIXTURE_LABEL);

    const sceneTitle = within(review).getByRole("textbox", {
      name: "Scene 1 title",
    });
    expect(sceneTitle).toHaveValue("Scene 1 · Opening");
    await user.clear(sceneTitle);
    await user.type(sceneTitle, "Scene 1 · The lantern wakes");
    const beatDirection = within(review).getByRole("textbox", {
      name: "Scene 1 beat 1 direction",
    });
    await user.clear(beatDirection);
    await user.type(beatDirection, "Start almost still, then one small step.");
    expect(sceneTitle).toHaveValue("Scene 1 · The lantern wakes");
    expect(beatDirection).toHaveValue(
      "Start almost still, then one small step.",
    );

    // The same unbypassable gate: Studio entry only through the review,
    // and the reviewed episode title is what the demo Studio shows.
    const episodeTitle = within(review).getByRole("textbox", {
      name: "Episode title",
    });
    await user.clear(episodeTitle);
    await user.type(episodeTitle, "The Lantern Walk");
    await user.click(
      within(review).getByRole("button", {
        name: "Enter Studio — local demo only",
      }),
    );
    const studio = await screen.findByTestId("pv1-studio");
    expect(studio.querySelector(".pv1-topbar")!).toHaveTextContent(
      "The Lantern Walk",
    );
    expect(studio).toHaveTextContent(/Layout demo/);
  });

  it("keeps a blank reviewed episode title inside the accessible review gate", async () => {
    const user = userEvent.setup();
    await openPastePath(user);
    fireEvent.change(screen.getByRole("textbox", { name: "Script" }), {
      target: { value: SAMPLE_SCRIPT },
    });
    await user.click(screen.getByRole("button", { name: "Create proposal" }));
    const review = await screen.findByRole("article", {
      name: "Review proposal",
    });
    const episodeTitle = within(review).getByRole("textbox", {
      name: "Episode title",
    });
    await user.clear(episodeTitle);
    await user.type(episodeTitle, "   ");
    await user.click(
      within(review).getByRole("button", {
        name: "Enter Studio — local demo only",
      }),
    );
    expect(episodeTitle).toBeInvalid();
    expect(episodeTitle).toHaveAttribute("required");
    expect(within(review).getByRole("alert")).toHaveTextContent(
      "Add an episode title before entering Studio.",
    );
    expect(screen.queryByTestId("pv1-studio")).not.toBeInTheDocument();
  });

  it("gates the idea conversation behind the Connect fixture and keeps it creator-facing", async () => {
    const user = userEvent.setup();
    await openCreate(user);
    await user.click(
      screen.getByRole("button", { name: /What's your idea\?/ }),
    );
    // Signed out by default: the compact Connect AI Director fixture with a
    // truthful sign-in action and runtime check, never a terminal.
    const connect = await screen.findByRole("region", {
      name: "Connect AI Director",
    });
    expect(connect).toHaveTextContent(AI_FIXTURE_LABEL);
    expect(connect).toHaveTextContent("Current state: Signed out");
    await user.click(
      within(connect).getByRole("button", { name: "Run runtime check" }),
    );
    expect(connect).toHaveTextContent(/no runtime was contacted/i);
    expect(connect).not.toHaveTextContent(
      /api[- ]?key|password|cookie|bearer|localhost|127\.0\.0\.1|\$\s|curl /i,
    );
    await user.click(
      within(connect).getByRole("button", { name: "Sign in with ChatGPT" }),
    );
    // Only local demo state changed: the truthful chip and the form.
    expect(
      screen.getByRole("button", {
        name: /AI Director status: Connected/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Story idea" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Target duration")).toBeInTheDocument();
    expect(screen.getByLabelText("Tone")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Cast" })).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Constraints" }),
    ).toBeInTheDocument();

    // Empty idea fails closed with a useful error; review is not shown.
    await user.click(screen.getByRole("button", { name: "Create proposal" }));
    expect(
      await screen.findByText(
        "Tell StoryStage your story idea before creating a proposal.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("article", { name: "Review proposal" }),
    ).not.toBeInTheDocument();
  });
});

describe("F3-WP4 — Studio AI Director shell", () => {
  async function openDemoStudio(user: ReturnType<typeof userEvent.setup>) {
    render(<App />);
    await user.click(
      await screen.findByRole("button", {
        name: /Open local demo project The Storylight in the Little Wood/,
      }),
    );
    return screen.findByTestId("pv1-studio");
  }

  const aiPanel = (studio: HTMLElement) =>
    within(studio).getByRole("complementary", { name: "AI Director" });

  const settleFixtureTurn = () =>
    act(
      () =>
        new Promise((resolvePromise) => {
          setTimeout(resolvePromise, 1400);
        }),
    );

  async function connectAndRequest(
    user: ReturnType<typeof userEvent.setup>,
    studio: HTMLElement,
    request: string,
  ) {
    await user.click(
      within(aiPanel(studio)).getByRole("button", {
        name: "Sign in with ChatGPT",
      }),
    );
    await user.type(
      within(aiPanel(studio)).getByRole("textbox", {
        name: "AI Director request",
      }),
      request,
    );
    await user.click(
      within(aiPanel(studio)).getByRole("button", { name: "Send request" }),
    );
  }

  it("streams a scoped fixture proposal and never retargets the captured scope", async () => {
    const user = userEvent.setup();
    const studio = await openDemoStudio(user);
    const panel = aiPanel(studio);
    expect(panel).toHaveTextContent("Scope: Scene 1 · Beat 1");
    fireEvent.change(
      within(panel).getByRole("slider", {
        name: /AI Director scene scrubber/,
      }),
      { target: { value: "30" } },
    );
    await connectAndRequest(user, studio, "Hold the hush before the lantern");

    // Streaming state with staged fixture progress and a real Cancel.
    expect(panel).toHaveTextContent("Streaming (fixture turn)");
    const stages = within(panel).getByRole("list", {
      name: "Streamed progress (fixture replay)",
    });
    expect(within(stages).getAllByRole("listitem")).toHaveLength(4);
    expect(
      within(panel).getByRole("button", { name: "Cancel request" }),
    ).toBeInTheDocument();

    await settleFixtureTurn();
    expect(panel).toHaveTextContent("Complete (fixture turn)");
    expect(panel).toHaveTextContent(
      "Re-direct Beat 1 “Morning light through the round window” around your request",
    );
    expect(panel).toHaveTextContent(
      "Play “Morning light through the round window” so the moment lands first: Hold the hush before the lantern",
    );
    expect(panel).toHaveTextContent("Beat 1 only · 0:00–1:10 of the scene");
    expect(panel).toHaveTextContent(
      "get_scene_context · submit_direction_proposal",
    );
    expect(panel).toHaveTextContent("0:00 · Beat start");
    expect(panel).toHaveTextContent("0:30 · Captured playhead");
    const captured = within(panel).getByRole("list", {
      name: "Captured scope",
    });
    expect(captured).toHaveTextContent("Scene 1 · The Home Nook");
    expect(captured).toHaveTextContent(
      "Beat 1 · Morning light through the round window",
    );
    expect(captured).toHaveTextContent("Playhead 0:30");
    expect(captured).toHaveTextContent("Range 0:00–1:10");

    // Preview changes nothing.
    await user.click(
      within(panel).getByRole("button", { name: "Preview proposal" }),
    );
    expect(panel).toHaveTextContent("Preview only — no direction has changed.");
    expect(panel).toHaveTextContent("Current committed direction: (empty)");
    expect(
      within(studio).getByRole("textbox", {
        name: "Performance direction",
      }),
    ).toHaveValue("");

    // Selection changes never retarget the immutable captured scope; Apply
    // fails closed with one honest recovery action.
    await user.click(
      within(
        within(studio).getByRole("navigation", { name: "Episode hierarchy" }),
      ).getByRole("button", { name: /Beat 2 A shelf of unfinished stories/ }),
    );
    expect(captured).toHaveTextContent(
      "Beat 1 · Morning light through the round window",
    );
    expect(captured).toHaveTextContent("Playhead 0:30");
    expect(
      within(panel).getByRole("button", { name: "Apply proposal" }),
    ).toBeDisabled();
    expect(panel).toHaveTextContent(
      "Apply is closed: the current selection differs from the captured scope.",
    );
    await user.click(
      within(panel).getByRole("button", {
        name: "Return to captured scope",
      }),
    );
    expect(
      within(studio).getByRole("navigation", { name: "Current scope" }),
    ).toHaveTextContent("Beat 1 · Morning light through the round window");
    expect(
      within(panel).getByRole("button", { name: "Apply proposal" }),
    ).toBeEnabled();
  });

  it("applies exactly the captured beat's performanceDirection and undoes it exactly", async () => {
    const user = userEvent.setup();
    const studio = await openDemoStudio(user);
    const panel = aiPanel(studio);
    await connectAndRequest(user, studio, "Hold the hush before the lantern");
    await settleFixtureTurn();

    await user.click(
      within(panel).getByRole("button", { name: "Apply proposal" }),
    );
    expect(panel).toHaveTextContent(
      "Applied to the captured beat's session-local direction — Undo restores the exact prior snapshot.",
    );
    const proposedDirection =
      "Play “Morning light through the round window” so the moment lands first: Hold the hush before the lantern";
    expect(
      within(studio).getByRole("textbox", { name: "Performance direction" }),
    ).toHaveValue(proposedDirection);
    // Exactly one field changed; the draft matches the committed snapshot.
    expect(
      within(studio).getByRole("textbox", { name: "Beat purpose" }),
    ).toHaveValue("");
    expect(within(studio).getByRole("tabpanel")).toHaveTextContent(
      "Draft matches this beat's committed session direction.",
    );

    // Another beat is untouched.
    await user.click(
      within(
        within(studio).getByRole("navigation", { name: "Episode hierarchy" }),
      ).getByRole("button", { name: /Beat 2 A shelf of unfinished stories/ }),
    );
    expect(
      within(studio).getByRole("textbox", { name: "Performance direction" }),
    ).toHaveValue("");
    await user.click(
      within(
        within(studio).getByRole("navigation", { name: "Episode hierarchy" }),
      ).getByRole("button", {
        name: /Beat 1 Morning light through the round window/,
      }),
    );

    // Exact Undo through the same history restores the prior snapshot.
    await user.click(
      within(panel).getByRole("button", { name: "Undo proposal apply" }),
    );
    expect(
      within(studio).getByRole("textbox", { name: "Performance direction" }),
    ).toHaveValue("");
    expect(within(studio).getByRole("button", { name: "Undo" })).toBeDisabled();
    expect(panel).toHaveTextContent(
      "Pending — Preview, Revise, and Reject change no direction.",
    );
  });

  it("fails Apply closed while the captured beat has unapplied manual drafts", async () => {
    const user = userEvent.setup();
    const studio = await openDemoStudio(user);
    const panel = aiPanel(studio);
    await connectAndRequest(user, studio, "Hold the hush before the lantern");
    await settleFixtureTurn();

    await user.type(
      within(studio).getByRole("textbox", { name: "Beat purpose" }),
      "Keep it cozy",
    );
    expect(
      within(panel).getByRole("button", { name: "Apply proposal" }),
    ).toBeDisabled();
    expect(panel).toHaveTextContent(
      "Apply is closed: the captured beat has unapplied manual drafts. Apply or undo them in the Director workspace first.",
    );

    // Committing the manual draft in the Director workspace re-opens Apply;
    // the proposal then changes only performanceDirection on top of it.
    await user.click(within(studio).getByRole("button", { name: "Apply" }));
    await user.click(
      within(panel).getByRole("button", { name: "Apply proposal" }),
    );
    expect(
      within(studio).getByRole("textbox", { name: "Beat purpose" }),
    ).toHaveValue("Keep it cozy");
    expect(
      within(studio).getByRole("textbox", { name: "Performance direction" }),
    ).toHaveValue(
      "Play “Morning light through the round window” so the moment lands first: Hold the hush before the lantern",
    );
    // One Director Undo returns to the manual snapshot, proving both commits
    // live in the same accepted per-beat history.
    await user.click(within(studio).getByRole("button", { name: "Undo" }));
    expect(
      within(studio).getByRole("textbox", { name: "Performance direction" }),
    ).toHaveValue("");
    expect(
      within(studio).getByRole("textbox", { name: "Beat purpose" }),
    ).toHaveValue("Keep it cozy");
  });

  it("models Cancelled and Error as turn states while the connection stays truthful", async () => {
    const user = userEvent.setup();
    const studio = await openDemoStudio(user);
    const panel = aiPanel(studio);
    await connectAndRequest(user, studio, "Try one");
    await user.click(
      within(panel).getByRole("button", { name: "Cancel request" }),
    );
    expect(panel).toHaveTextContent("Cancelled (fixture turn)");
    expect(panel).toHaveTextContent(
      "Cancelled before a proposal was produced — the captured scope below is preserved and nothing was applied.",
    );
    expect(
      within(panel).getByRole("list", { name: "Captured scope" }),
    ).toHaveTextContent("Beat 1 · Morning light through the round window");
    expect(
      within(panel).queryByRole("button", { name: "Apply proposal" }),
    ).not.toBeInTheDocument();

    // One honest recovery action reloads the request for editing.
    await user.click(
      within(panel).getByRole("button", { name: "Revise and resend" }),
    );
    expect(
      within(panel).getByRole("textbox", { name: "AI Director request" }),
    ).toHaveValue("Try one");

    // A connection drop before settling resolves to the Error turn state;
    // the connection chip stays independently truthful.
    await user.click(
      within(panel).getByRole("button", { name: "Send request" }),
    );
    await user.click(
      within(studio).getByRole("button", { name: /AI Director status:/ }),
    );
    await user.selectOptions(
      within(
        within(studio).getByRole("region", { name: "AI Director settings" }),
      ).getByRole("combobox", { name: "Connection fixture state" }),
      "offline",
    );
    await settleFixtureTurn();
    expect(panel).toHaveTextContent("Error (fixture turn)");
    expect(panel).toHaveTextContent(
      "The fixture connection was not Connected when the turn settled — no proposal was produced and nothing was applied.",
    );
    expect(
      within(studio).getByRole("button", {
        name: /AI Director status: Offline/,
      }),
    ).toBeInTheDocument();
    expect(
      within(studio).getByRole("textbox", { name: "Performance direction" }),
    ).toHaveValue("");
  });

  it("rejects and supersedes proposals without ever appearing applied", async () => {
    const user = userEvent.setup();
    const studio = await openDemoStudio(user);
    const panel = aiPanel(studio);
    await connectAndRequest(user, studio, "First request");
    await settleFixtureTurn();
    expect(panel).toHaveTextContent("Complete (fixture turn)");

    // A newer request supersedes the pending one before it could apply.
    await user.type(
      within(panel).getByRole("textbox", { name: "AI Director request" }),
      "Second request",
    );
    await user.click(
      within(panel).getByRole("button", { name: "Send request" }),
    );
    expect(panel).toHaveTextContent(
      "Superseded by a newer request — it can no longer be applied.",
    );
    const firstProposal = within(panel).getByTestId("pv1-ai-proposal-1");
    expect(
      within(firstProposal).getByRole("button", { name: "Apply proposal" }),
    ).toBeDisabled();

    await settleFixtureTurn();
    const secondProposal = within(panel).getByTestId("pv1-ai-proposal-2");
    await user.click(
      within(secondProposal).getByRole("button", { name: "Reject proposal" }),
    );
    expect(secondProposal).toHaveTextContent(
      "Rejected — no direction was changed.",
    );
    expect(
      within(secondProposal).getByRole("button", { name: "Apply proposal" }),
    ).toBeDisabled();
    // No turn ever touched the captured beat's direction.
    expect(
      within(studio).getByRole("textbox", { name: "Performance direction" }),
    ).toHaveValue("");
    expect(within(studio).getByRole("button", { name: "Undo" })).toBeDisabled();
  });

  it("supersedes a still-streaming request so only the newest turn is applicable", async () => {
    const user = userEvent.setup();
    const studio = await openDemoStudio(user);
    const panel = aiPanel(studio);
    await connectAndRequest(user, studio, "First overlapping request");
    expect(panel).toHaveTextContent("Streaming (fixture turn)");

    // The newer request is sent before the first turn settles.
    await user.type(
      within(panel).getByRole("textbox", { name: "AI Director request" }),
      "Second overlapping request",
    );
    await user.click(
      within(panel).getByRole("button", { name: "Send request" }),
    );

    // The first turn is superseded mid-stream: an honest note, and only
    // the newest (second) turn still offers Cancel.
    expect(panel).toHaveTextContent(
      "Superseded by a newer request — finishing its fixture replay; it can never become applicable, applied, or undoable.",
    );
    expect(
      within(panel).getAllByRole("button", { name: "Cancel request" }),
    ).toHaveLength(1);

    await settleFixtureTurn();

    // The superseded turn settled without a proposal and can never apply.
    expect(panel).toHaveTextContent(
      "Superseded by a newer request before a proposal was produced — nothing was applied.",
    );
    expect(
      within(panel).queryByTestId("pv1-ai-proposal-1"),
    ).not.toBeInTheDocument();

    // Only the newest request completes into an applicable proposal.
    const secondProposal = within(panel).getByTestId("pv1-ai-proposal-2");
    expect(
      within(secondProposal).getByRole("button", { name: "Apply proposal" }),
    ).toBeEnabled();
    expect(
      within(panel).getAllByRole("button", { name: "Apply proposal" }),
    ).toHaveLength(1);
  });

  it("keeps panel Undo closed after later history changes, even when values recur", async () => {
    const user = userEvent.setup();
    const studio = await openDemoStudio(user);
    const panel = aiPanel(studio);
    await connectAndRequest(user, studio, "Hold the hush before the lantern");
    await settleFixtureTurn();
    await user.click(
      within(panel).getByRole("button", { name: "Apply proposal" }),
    );
    const appliedDirection =
      "Play “Morning light through the round window” so the moment lands first: Hold the hush before the lantern";
    expect(
      within(studio).getByRole("textbox", { name: "Performance direction" }),
    ).toHaveValue(appliedDirection);
    const panelUndo = () =>
      within(panel).getByRole("button", { name: "Undo proposal apply" });
    expect(panelUndo()).toBeEnabled();

    // A manual commit T on top of the AI snapshot closes panel Undo honestly.
    await user.type(
      within(studio).getByRole("textbox", { name: "Beat purpose" }),
      "Manual follow-up T",
    );
    await user.click(within(studio).getByRole("button", { name: "Apply" }));
    expect(panelUndo()).toBeDisabled();
    expect(panel).toHaveTextContent(
      "Applied. This beat's history changed afterwards, so panel Undo is closed — use the Director workspace Undo.",
    );

    // A later manual commit recreates the AI snapshot by value; panel Undo
    // stays closed and never restores T.
    await user.clear(
      within(studio).getByRole("textbox", { name: "Beat purpose" }),
    );
    await user.click(within(studio).getByRole("button", { name: "Apply" }));
    expect(
      within(studio).getByRole("textbox", { name: "Performance direction" }),
    ).toHaveValue(appliedDirection);
    expect(panelUndo()).toBeDisabled();

    // The Director workspace Undo owns that history move: it restores T.
    await user.click(within(studio).getByRole("button", { name: "Undo" }));
    expect(
      within(studio).getByRole("textbox", { name: "Beat purpose" }),
    ).toHaveValue("Manual follow-up T");
    expect(
      within(studio).getByRole("textbox", { name: "Performance direction" }),
    ).toHaveValue(appliedDirection);
    expect(panelUndo()).toBeDisabled();
  });

  it("keeps manual direction state independent of the AI proposal lifecycle", async () => {
    const user = userEvent.setup();
    const studio = await openDemoStudio(user);
    const panel = aiPanel(studio);

    // Commit manual direction on Beat 2 first.
    await user.click(
      within(
        within(studio).getByRole("navigation", { name: "Episode hierarchy" }),
      ).getByRole("button", { name: /Beat 2 A shelf of unfinished stories/ }),
    );
    await user.type(
      within(studio).getByRole("textbox", { name: "Beat purpose" }),
      "Manual purpose for beat two",
    );
    await user.click(within(studio).getByRole("button", { name: "Apply" }));

    // AI proposal on Beat 1 applies and undoes; Beat 2 is untouched.
    await user.click(
      within(
        within(studio).getByRole("navigation", { name: "Episode hierarchy" }),
      ).getByRole("button", {
        name: /Beat 1 Morning light through the round window/,
      }),
    );
    await connectAndRequest(user, studio, "Hold the hush before the lantern");
    await settleFixtureTurn();
    await user.click(
      within(panel).getByRole("button", { name: "Apply proposal" }),
    );
    await user.click(
      within(
        within(studio).getByRole("navigation", { name: "Episode hierarchy" }),
      ).getByRole("button", { name: /Beat 2 A shelf of unfinished stories/ }),
    );
    expect(
      within(studio).getByRole("textbox", { name: "Beat purpose" }),
    ).toHaveValue("Manual purpose for beat two");
    expect(
      within(studio).getByRole("textbox", { name: "Performance direction" }),
    ).toHaveValue("");
    await user.click(
      within(
        within(studio).getByRole("navigation", { name: "Episode hierarchy" }),
      ).getByRole("button", {
        name: /Beat 1 Morning light through the round window/,
      }),
    );
    await user.click(
      within(panel).getByRole("button", { name: "Undo proposal apply" }),
    );
    expect(
      within(studio).getByRole("textbox", { name: "Performance direction" }),
    ).toHaveValue("");
  });

  it("exposes the six connection fixtures and truthful local actions in Settings → AI Director", async () => {
    const user = userEvent.setup();
    const studio = await openDemoStudio(user);
    expect(
      within(studio).getByRole("button", {
        name: /AI Director status: Signed out/,
      }),
    ).toBeInTheDocument();

    await user.click(
      within(studio).getByRole("button", { name: /AI Director status:/ }),
    );
    const settings = within(studio).getByRole("region", {
      name: "AI Director settings",
    });
    expect(settings).toHaveTextContent("Settings → AI Director");
    expect(settings).toHaveTextContent(AI_FIXTURE_LABEL);
    const fixtureSelect = within(settings).getByRole("combobox", {
      name: "Connection fixture state",
    });
    expect(
      within(fixtureSelect as HTMLSelectElement).getAllByRole("option"),
    ).toHaveLength(6);

    for (const [value, label] of [
      ["connected", "Connected"],
      ["offline", "Offline"],
      ["usage-limit", "Usage limit"],
      ["update-required", "Update required"],
      ["crashed", "Crashed"],
    ] as const) {
      await user.selectOptions(fixtureSelect, value);
      expect(
        within(studio).getByRole("button", {
          name: `AI Director status: ${label} — open AI Director settings`,
        }),
      ).toBeInTheDocument();
    }

    // Reconnect and sign-out are local fixture transitions only.
    await user.click(
      within(settings).getByRole("button", { name: "Reconnect" }),
    );
    expect(
      within(studio).getByRole("button", {
        name: /AI Director status: Connected/,
      }),
    ).toBeInTheDocument();
    await user.click(
      within(settings).getByRole("button", { name: "Sign out" }),
    );
    expect(
      within(studio).getByRole("button", {
        name: /AI Director status: Signed out/,
      }),
    ).toBeInTheDocument();

    // Runtime check and redacted diagnostics carry no credential material.
    await user.click(
      within(settings).getByRole("button", { name: "Run runtime check" }),
    );
    expect(settings).toHaveTextContent(/no runtime was contacted/i);
    await user.click(
      within(settings).getByRole("button", {
        name: "View redacted diagnostics",
      }),
    );
    expect(settings).toHaveTextContent(
      "credentials: <redacted — never accessed>",
    );
    expect(settings).not.toHaveTextContent(
      /api[- ]?key|password|cookie|bearer|localhost|127\.0\.0\.1/i,
    );
  });
});

describe("F3-WP5 — responsive, accessibility, and evidence gate", () => {
  async function openDemoStudio(user: ReturnType<typeof userEvent.setup>) {
    render(<App />);
    await user.click(
      await screen.findByRole("button", {
        name: /Open local demo project The Storylight in the Little Wood/,
      }),
    );
    return screen.findByTestId("pv1-studio");
  }

  const aiPanel = (studio: HTMLElement) =>
    within(studio).getByRole("complementary", { name: "AI Director" });

  const settleFixtureTurn = () =>
    act(
      () =>
        new Promise((resolvePromise) => {
          setTimeout(resolvePromise, 1400);
        }),
    );

  async function connectAndRequest(
    user: ReturnType<typeof userEvent.setup>,
    studio: HTMLElement,
    request: string,
  ) {
    await user.click(
      within(aiPanel(studio)).getByRole("button", {
        name: "Sign in with ChatGPT",
      }),
    );
    await user.type(
      within(aiPanel(studio)).getByRole("textbox", {
        name: "AI Director request",
      }),
      request,
    );
    await user.click(
      within(aiPanel(studio)).getByRole("button", { name: "Send request" }),
    );
  }

  it("moves focus deliberately across the whole creator journey", async () => {
    const user = userEvent.setup();
    render(<App />);
    // Arrival on Projects: focus lands on the surface heading, not the body.
    expect(screen.getByRole("heading", { name: "Projects" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: /New project/ }));
    expect(
      await screen.findByRole("heading", { name: /Start a new Kids Story/ }),
    ).toHaveFocus();

    await user.click(screen.getByRole("button", { name: /Paste a script/ }));
    expect(
      await screen.findByRole("heading", { name: "Paste a script" }),
    ).toHaveFocus();

    fireEvent.change(screen.getByRole("textbox", { name: "Script" }), {
      target: { value: SAMPLE_SCRIPT },
    });
    await user.click(screen.getByRole("button", { name: "Create proposal" }));
    // The shared review focuses its one required editable field.
    const review = await screen.findByRole("article", {
      name: "Review proposal",
    });
    expect(
      within(review).getByRole("textbox", { name: "Episode title" }),
    ).toHaveFocus();

    // Revise returns to the intact form with focus on its heading.
    await user.click(
      within(review).getByRole("button", { name: "Revise input" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Paste a script" }),
    ).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Create proposal" }));
    const reviewAgain = await screen.findByRole("article", {
      name: "Review proposal",
    });
    await user.click(
      within(reviewAgain).getByRole("button", {
        name: "Enter Studio — local demo only",
      }),
    );
    // Studio entry lands on the primary board heading — once, on arrival.
    const studio = await screen.findByTestId("pv1-studio");
    expect(
      within(studio).getByRole("heading", { name: "The Home Nook" }),
    ).toHaveFocus();

    await user.click(
      within(studio).getByRole("button", { name: "Back to projects" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Projects" }),
    ).toHaveFocus();
  });

  it("focuses the invalid episode title on the blank-title gate and clears it without a stale announcement", async () => {
    const user = userEvent.setup();
    await openPastePath(user);
    fireEvent.change(screen.getByRole("textbox", { name: "Script" }), {
      target: { value: SAMPLE_SCRIPT },
    });
    await user.click(screen.getByRole("button", { name: "Create proposal" }));
    const review = await screen.findByRole("article", {
      name: "Review proposal",
    });
    const episodeTitle = within(review).getByRole("textbox", {
      name: "Episode title",
    });
    await user.clear(episodeTitle);
    await user.type(episodeTitle, "   ");
    await user.click(
      within(review).getByRole("button", {
        name: "Enter Studio — local demo only",
      }),
    );
    // One accessible error, and focus is moved to the invalid control.
    expect(within(review).getByRole("alert")).toHaveTextContent(
      "Add an episode title before entering Studio.",
    );
    expect(episodeTitle).toBeInvalid();
    expect(episodeTitle).toHaveFocus();
    expect(screen.queryByTestId("pv1-studio")).not.toBeInTheDocument();

    // Correcting the title clears the invalid state and the announcement.
    await user.type(episodeTitle, "The Lantern Probe");
    expect(within(review).queryByRole("alert")).not.toBeInTheDocument();
    expect(episodeTitle).not.toBeInvalid();
    await user.click(
      within(review).getByRole("button", {
        name: "Enter Studio — local demo only",
      }),
    );
    expect(await screen.findByTestId("pv1-studio")).toBeInTheDocument();
  });

  it("moves focus deliberately through the idea path Connect gate", async () => {
    const user = userEvent.setup();
    await openCreate(user);
    await user.click(
      screen.getByRole("button", { name: /What's your idea\?/ }),
    );
    // Signed out: focus lands on the Connect surface heading.
    const connect = await screen.findByRole("region", {
      name: "Connect AI Director",
    });
    expect(
      within(connect).getByRole("heading", { name: "Connect AI Director" }),
    ).toHaveFocus();
    // Fixture sign-in swaps the surface; focus moves to the form heading.
    await user.click(
      within(connect).getByRole("button", { name: "Sign in with ChatGPT" }),
    );
    expect(
      await screen.findByRole("heading", { name: "What's your idea?" }),
    ).toHaveFocus();
  });

  it("moves Studio Connect focus to the composer before the signed-out surface is removed", async () => {
    const user = userEvent.setup();
    const studio = await openDemoStudio(user);
    const panel = aiPanel(studio);
    await user.click(
      within(panel).getByRole("button", { name: "Sign in with ChatGPT" }),
    );
    expect(
      within(panel).getByRole("textbox", { name: "AI Director request" }),
    ).toHaveFocus();
  });

  it("closes the AI Director settings with Escape, returns focus to the chip, and announces connection changes once", async () => {
    const user = userEvent.setup();
    await openCreate(user);
    const chip = screen.getByRole("button", {
      name: /AI Director status: Signed out/,
    });
    expect(chip).toHaveAttribute("aria-expanded", "false");
    expect(chip).toHaveAttribute("aria-controls", "pv1-ai-settings");

    await user.click(chip);
    const settings = await screen.findByRole("region", {
      name: "AI Director settings",
    });
    expect(chip).toHaveAttribute("aria-expanded", "true");

    // A connection fixture change is announced exactly once through one
    // concise status — not by re-reading the whole surface.
    const fixtureSelect = within(settings).getByRole("combobox", {
      name: "Connection fixture state",
    });
    await user.selectOptions(fixtureSelect, "offline");
    expect(
      screen.getByText("AI Director fixture state: Offline."),
    ).toBeInTheDocument();

    // Escape is the deterministic keyboard close path; focus returns to the
    // chip that opened the disclosure.
    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("region", { name: "AI Director settings" }),
    ).not.toBeInTheDocument();
    expect(chip).toHaveFocus();
    expect(chip).toHaveAttribute("aria-expanded", "false");
  });

  it("announces a cancelled turn once and moves focus Cancel → Revise and resend → composer", async () => {
    const user = userEvent.setup();
    const studio = await openDemoStudio(user);
    const panel = aiPanel(studio);
    await connectAndRequest(user, studio, "Hold the hush");
    await user.click(
      within(panel).getByRole("button", { name: "Cancel request" }),
    );
    // The settled outcome is announced once (unique text in the document).
    expect(
      screen.getByText(
        "Request cancelled — captured scope preserved, nothing was applied.",
      ),
    ).toBeInTheDocument();
    // The removed Cancel control never strands focus: it moves to the one
    // honest recovery action.
    const revise = within(panel).getByRole("button", {
      name: "Revise and resend",
    });
    expect(revise).toHaveFocus();
    await user.click(revise);
    const composer = within(panel).getByRole("textbox", {
      name: "AI Director request",
    });
    expect(composer).toHaveFocus();
    expect(composer).toHaveValue("Hold the hush");
  });

  it("announces completion once and moves focus Apply → Undo → Apply", async () => {
    const user = userEvent.setup();
    const studio = await openDemoStudio(user);
    const panel = aiPanel(studio);
    await connectAndRequest(
      user,
      studio,
      "Make the lantern moment land softer",
    );
    await settleFixtureTurn();
    expect(
      screen.getByText(
        "Fixture proposal ready for the captured scope — Scene 1 · Beat 1.",
      ),
    ).toBeInTheDocument();

    await user.click(
      within(panel).getByRole("button", { name: "Apply proposal" }),
    );
    // Apply disables itself on success; focus lands on its bounded Undo.
    const undoApply = within(panel).getByRole("button", {
      name: "Undo proposal apply",
    });
    expect(undoApply).toHaveFocus();
    expect(
      within(studio).getByRole("textbox", { name: "Performance direction" }),
    ).toHaveValue(
      "Play “Morning light through the round window” so the moment lands first: Make the lantern moment land softer",
    );

    await user.click(undoApply);
    expect(
      within(panel).getByRole("button", { name: "Apply proposal" }),
    ).toHaveFocus();
    expect(
      within(studio).getByRole("textbox", { name: "Performance direction" }),
    ).toHaveValue("");
  });

  it("re-announces identical same-scope outcomes for distinct fixture turns", async () => {
    const user = userEvent.setup();
    const studio = await openDemoStudio(user);
    const panel = aiPanel(studio);
    await connectAndRequest(user, studio, "First gentle pass");
    await settleFixtureTurn();
    const firstNotice = within(panel).getByTestId("pv1-ai-turn-notice");
    expect(firstNotice).toHaveAttribute("data-notice-key", "1:complete");
    expect(firstNotice).toHaveTextContent(
      "Fixture proposal ready for the captured scope — Scene 1 · Beat 1.",
    );

    await user.type(
      within(panel).getByRole("textbox", { name: "AI Director request" }),
      "Second gentle pass",
    );
    await user.click(
      within(panel).getByRole("button", { name: "Send request" }),
    );
    await settleFixtureTurn();
    const secondNotice = within(panel).getByTestId("pv1-ai-turn-notice");
    expect(secondNotice).toHaveAttribute("data-notice-key", "2:complete");
    expect(secondNotice).toHaveTextContent(
      "Fixture proposal ready for the captured scope — Scene 1 · Beat 1.",
    );
  });

  it("settles immediately without staged progress when reduced motion is requested", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    );
    const user = userEvent.setup();
    const studio = await openDemoStudio(user);
    const panel = aiPanel(studio);
    await connectAndRequest(user, studio, "No decorative progress");
    await act(
      () =>
        new Promise((resolvePromise) => {
          setTimeout(resolvePromise, 20);
        }),
    );
    expect(panel).toHaveTextContent("Complete (fixture turn)");
    expect(
      within(panel).queryByRole("list", {
        name: "Streamed progress (fixture replay)",
      }),
    ).not.toBeInTheDocument();
    expect(
      within(panel).queryByRole("button", { name: "Cancel request" }),
    ).not.toBeInTheDocument();
  });

  it("moves focus to the proposal status on Reject", async () => {
    const user = userEvent.setup();
    const studio = await openDemoStudio(user);
    const panel = aiPanel(studio);
    await connectAndRequest(user, studio, "Try rejecting");
    await settleFixtureTurn();
    const proposal = within(panel).getByTestId("pv1-ai-proposal-1");
    await user.click(
      within(proposal).getByRole("button", { name: "Reject proposal" }),
    );
    const status = proposal.querySelector("[data-action='proposal-status']");
    expect(status).not.toBeNull();
    expect(status).toHaveFocus();
    expect(status).toHaveTextContent("Rejected — no direction was changed.");
  });

  it("announces an Error turn once and keeps the connection announcement truthful", async () => {
    const user = userEvent.setup();
    const studio = await openDemoStudio(user);
    const panel = aiPanel(studio);
    await connectAndRequest(user, studio, "Try error path");
    // Drop the fixture connection before the turn settles.
    await user.click(
      within(studio).getByRole("button", { name: /AI Director status:/ }),
    );
    await user.selectOptions(
      within(
        within(studio).getByRole("region", { name: "AI Director settings" }),
      ).getByRole("combobox", { name: "Connection fixture state" }),
      "offline",
    );
    await user.keyboard("{Escape}");
    await settleFixtureTurn();
    expect(panel).toHaveTextContent("Error (fixture turn)");
    expect(
      screen.getByText(
        "Request ended in the Error fixture state — no proposal was produced and nothing was applied.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("AI Director fixture state: Offline."),
    ).toBeInTheDocument();
  });

  it("keeps the visible-focus and reduced-motion contracts in the stylesheet", () => {
    const cssPath = resolve(process.cwd(), "src/styles.css");
    const css = readFileSync(cssPath, "utf8");
    // No pv1 focus-visible rule may remove the global 2px outline.
    expect(css).not.toMatch(/:focus-visible\s*\{[^}]*outline:\s*none/s);
    // The reduced-motion blanket collapses transitions, animations, and
    // animated scrolling for every pv1 element.
    const blanketIndex = css.indexOf(".pv1-page *,");
    expect(blanketIndex).toBeGreaterThan(-1);
    expect(css.slice(Math.max(0, blanketIndex - 80), blanketIndex)).toContain(
      "prefers-reduced-motion: reduce",
    );
    const blanket = css.slice(blanketIndex, blanketIndex + 420);
    expect(blanket).toContain("animation-duration: 0.01ms !important");
    expect(blanket).toContain("scroll-behavior: auto !important");
    expect(blanket).toContain("transition-duration: 0.01ms !important");
    // The visually-hidden announcement utility exists.
    expect(css).toContain(".pv1-sr-only");
  });
});
