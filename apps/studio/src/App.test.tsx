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
    expect(studio).toHaveTextContent("Director controls arrive in F3");
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

    expect(studio).toHaveTextContent("Director controls arrive in F3");
    expect(
      within(studio).queryByRole("button", { name: /Apply/i }),
    ).not.toBeInTheDocument();
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
      studio.textContent?.includes("A real preview arrives after the WP2 Studio playhead work."),
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
