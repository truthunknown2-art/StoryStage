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
      screen.queryByTestId("pv1-handoff"),
    ).not.toBeInTheDocument();
  });

  it("opens the honest local Studio handoff for a valid script and never claims generation", async () => {
    const user = userEvent.setup();
    await openCreate(user);
    fireEvent.change(screen.getByRole("textbox", { name: "Script" }), {
      target: { value: SAMPLE_SCRIPT },
    });
    await user.click(
      screen.getByRole("button", { name: "Create first cut" }),
    );
    const handoff = await screen.findByTestId("pv1-handoff");
    expect(handoff).toHaveTextContent(
      "Local UI demo — production services are not connected.",
    );
    expect(handoff).toHaveTextContent(/No imagery,\s*animation,\s*audio,\s*or render was generated/);
    expect(handoff).toHaveTextContent("Detected beats (5)");
    expect(
      within(handoff).getByRole("button", { name: /Edit script/ }),
    ).toBeEnabled();
    expect(
      within(handoff).getByRole("button", { name: /Back to projects/ }),
    ).toBeEnabled();
    expect(handoff).not.toHaveTextContent(/rendered|exported|generated video/i);
  });

  it("opens the bounded long-form Ollo demo, visibly labelled Local UI demo", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      await screen.findByRole("button", {
        name: /Open local demo project The Storylight in the Little Wood/,
      }),
    );
    const demo = await screen.findByTestId("pv1-demo");
    expect(demo).toHaveTextContent(
      "Local UI demo — production services are not connected.",
    );
    expect(demo).toHaveTextContent("~20 min episode");
    expect(demo).toHaveTextContent("Scenes · 8 · 20 min planned");
    expect(demo).toHaveTextContent(/no imagery,\s*animation,\s*audio,\s*or render exists/i);
    expect(demo).toHaveTextContent("not produced");
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
