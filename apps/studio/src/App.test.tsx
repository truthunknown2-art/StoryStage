import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { ProductV1App } from "./product-v1/ProductV1App";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
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
    name: /Turn your script into an animated first cut/,
  });
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
      screen.getByRole("button", { name: "Create first cut" }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /Back to projects/ }),
    );
    expect(
      await screen.findByRole("heading", { name: "Projects" }),
    ).toBeInTheDocument();
  });

  it("updates word count, duration, and beat preview on edits and .txt import", async () => {
    const user = userEvent.setup();
    await openCreate(user);
    const scriptInput = screen.getByRole("textbox", { name: "Script" });
    expect(screen.getByText(/Beats appear here as you write/)).toBeInTheDocument();

    await user.type(scriptInput, "One small paragraph.");
    expect(screen.getByText(/3 words · about 5 seconds/)).toBeInTheDocument();

    const file = new File([SAMPLE_SCRIPT], "story.txt", {
      type: "text/plain",
    });
    fireEvent.change(screen.getByLabelText("Import .txt file"), {
      target: { files: [file] },
    });
    expect(await screen.findByText(/68 words · about 27 seconds/)).toBeInTheDocument();
    // Five paragraphs → four visible beats plus the "and N more" note.
    expect(
      await screen.findByText("Lila lives in a…"),
    ).toBeInTheDocument();
    expect(screen.getByText("and 1 more")).toBeInTheDocument();

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

  it("updates grammar, art style, narration, format, and language state", async () => {
    const user = userEvent.setup();
    await openCreate(user);

    const weirdHistory = screen.getByRole("button", {
      name: /Weird History/,
    });
    await user.click(weirdHistory);
    expect(weirdHistory).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: /Kids Adventure/ }),
    ).toHaveAttribute("aria-pressed", "false");

    const collage = screen.getByRole("button", { name: /Paper Collage/ });
    await user.click(collage);
    expect(collage).toHaveAttribute("aria-pressed", "true");

    const narration = screen.getByLabelText("Narration mode");
    await user.selectOptions(narration, "silent");
    expect(narration).toHaveValue("silent");

    const format = screen.getByLabelText("Episode format");
    expect(format).toHaveValue("16:9");
    expect(
      within(format as HTMLSelectElement).getByRole("option", {
        name: "9:16 — arrives later",
      }),
    ).toBeDisabled();

    const language = screen.getByLabelText("Language");
    expect(language).toHaveValue("english");
    expect(
      within(language as HTMLSelectElement).getByRole("option", {
        name: "More languages — arrives later",
      }),
    ).toBeDisabled();
  });

  it("blocks first-cut navigation on an empty script with a useful error", async () => {
    const user = userEvent.setup();
    await openCreate(user);
    await user.click(
      screen.getByRole("button", { name: "Create first cut" }),
    );
    expect(
      await screen.findByText("Add your script before creating the first cut."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /Turn your script into an animated first cut/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("pv1-studio"),
    ).not.toBeInTheDocument();
  });

  it("opens the honest Studio shell for a valid script and never claims generation", async () => {
    const user = userEvent.setup();
    await openCreate(user);
    fireEvent.change(screen.getByRole("textbox", { name: "Script" }), {
      target: { value: SAMPLE_SCRIPT },
    });
    await user.click(
      screen.getByRole("button", { name: "Create first cut" }),
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
    expect(studio).not.toHaveTextContent(/rendered|exported/i);
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

  it("shows the creator's actual grammar and art style, with the layout-demo disclosure", async () => {
    const user = userEvent.setup();
    await openCreate(user);
    await user.click(screen.getByRole("button", { name: /Weird History/ }));
    await user.click(screen.getByRole("button", { name: /Paper Collage/ }));
    fireEvent.change(screen.getByRole("textbox", { name: "Script" }), {
      target: { value: SAMPLE_SCRIPT },
    });
    await user.click(
      screen.getByRole("button", { name: "Create first cut" }),
    );
    const studio = await screen.findByTestId("pv1-studio");
    const topbar = studio.querySelector(".pv1-topbar")!;
    expect(topbar).toHaveTextContent("Weird History");
    expect(topbar).toHaveTextContent("Paper Collage");
    expect(topbar).not.toHaveTextContent("Kids Adventure");
    expect(topbar).not.toHaveTextContent("Storybook Cutout");
    expect(studio).toHaveTextContent(/Layout demo — the eight scenes below are the bounded Ollo demo plan, not scenes from your script/);
    expect(studio).toHaveTextContent(/Script-specific scenes have not been planned or generated yet/);
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

    // F3-WP2 Director tabs: Direct exposes the real bounded session-local
    // drafts with honest initial history states; Visual and Motion stay
    // truthful, non-editable later-package surfaces.
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
    // No shot/action/camera control fields exist in this slice.
    expect(
      within(studio).queryByRole("combobox", {
        name: /shot|action|camera/i,
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
        "Preview stays disabled in F3-WP2 — Direct edits are session-local direction only; there is still no media to preview.",
      ),
    ).toBe(true);
    expect(
      studio.textContent?.includes("Export unlocks when production services connect."),
    ).toBe(true);
    expect(
      within(studio).queryByRole("button", { name: /Play|Pause|Scrub/i }),
    ).not.toBeInTheDocument();
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
    expect(within(studio).getByRole("tabpanel")).toHaveTextContent(
      "Visual direction (art, camera, lighting) is not editable in this package.",
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
    expect(within(studio).getByRole("tabpanel")).toHaveTextContent(
      "Motion controls arrive later. The performance note in Direct is session-local text only; it does not animate or render this beat.",
    );
    await user.keyboard("{Home}");
    expect(direct).toHaveAttribute("aria-selected", "true");
    expect(direct).toHaveFocus();
    await user.keyboard("{End}");
    expect(motion).toHaveAttribute("aria-selected", "true");
    expect(motion).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(direct).toHaveAttribute("aria-selected", "true");
    expect(direct).toHaveFocus();

    // The Direct tab now exposes exactly the three bounded session-local
    // drafts plus real Apply/Undo/Redo with honest initial disabled
    // states; Visual and Motion expose no editing or false capability.
    const inspector = within(studio).getByRole("complementary", {
      name: "Studio inspector",
    });
    await user.click(visual);
    expect(within(inspector).queryByRole("textbox")).not.toBeInTheDocument();
    expect(within(inspector).queryByRole("combobox")).not.toBeInTheDocument();
    expect(
      within(inspector).queryByRole("button", { name: /Apply|Undo|Redo/i }),
    ).not.toBeInTheDocument();
    await user.click(motion);
    expect(within(inspector).queryByRole("textbox")).not.toBeInTheDocument();
    expect(within(inspector).queryByRole("combobox")).not.toBeInTheDocument();
    expect(
      within(inspector).queryByRole("button", { name: /Apply|Undo|Redo/i }),
    ).not.toBeInTheDocument();
    await user.click(direct);
    expect(within(inspector).getAllByRole("textbox")).toHaveLength(3);
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
