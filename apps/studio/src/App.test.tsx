import {cleanup, render, screen, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach, describe, expect, it, vi} from "vitest";
import {App} from "./App";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function openProductionSetup() {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole("button", {name: "New production"}));
  return user;
}

async function createDefaultProduction() {
  const user = await openProductionSetup();
  await user.click(screen.getByRole("button", {name: "Create production"}));
  return user;
}

describe("StoryStage studio", () => {
  it("opens a real production setup from the home screen", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole("heading", {name: /Make the directing decisions/})).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "New production"})).toBeEnabled();
    expect(screen.getByRole("button", {name: /Show Packs/})).toBeDisabled();

    await user.click(screen.getByRole("button", {name: "New production"}));

    expect(screen.getByRole("heading", {name: "Choose how this story should think."})).toBeInTheDocument();
    expect(screen.getByRole("heading", {name: "Production type"})).toBeInTheDocument();
    expect((screen.getByLabelText("Screenplay") as HTMLTextAreaElement).value).toContain("INT. WORKSHOP");
    expect(screen.queryByText(/intensity/i)).not.toBeInTheDocument();
  });

  it("changes the actual Show Pack and routing rules for a kids production", async () => {
    const user = await openProductionSetup();

    expect(screen.getByText(/weird-history-director-v1/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", {name: /Kids Adventure/}));

    expect(screen.getByText(/kids-adventure-director-v1/)).toBeInTheDocument();
    expect(screen.getByText("2.7-4.3s")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", {name: /Authenticated sources first/})).toBeDisabled();
    expect(screen.getByRole("checkbox", {name: /Allow labeled reconstruction/})).toBeDisabled();
  });

  it("shows production presets as downstream policy, not decorative choices", async () => {
    const user = await openProductionSetup();
    const policySection = screen.getByRole("heading", {name: "Production preset"}).closest("section");
    expect(policySection).not.toBeNull();

    await user.click(within(policySection!).getByRole("button", {name: /premium/i}));

    expect(within(policySection!).getByText("4")).toBeInTheDocument();
    expect(within(policySection!).getByText("high")).toBeInTheDocument();
    expect(within(policySection!).getByText("extended")).toBeInTheDocument();
    expect(within(policySection!).getByText("2160p")).toBeInTheDocument();
  });

  it("builds the pasted script into a profile-driven direction board", async () => {
    await createDefaultProduction();

    expect(screen.getByRole("heading", {name: "The Punctual Box"})).toBeInTheDocument();
    expect(screen.getByText(/weird-history-director-v1/)).toBeInTheDocument();
    expect(screen.getByText("Planned shots")).toBeInTheDocument();
    expect(screen.getByText("Average shot")).toBeInTheDocument();
    expect(screen.getByText("Editorial routing")).toBeInTheDocument();
    expect(screen.getAllByRole("button", {name: /Select shot/}).length).toBeGreaterThan(10);
  });

  it("compiles inspector choices into semantic shot overrides", async () => {
    const user = await createDefaultProduction();

    await user.selectOptions(screen.getByLabelText("Shot framing"), "close-up");
    await user.selectOptions(screen.getByLabelText("Camera action"), "pan");
    await user.selectOptions(screen.getByLabelText("Performance gesture"), "point");

    expect(screen.getByLabelText("Shot framing")).toHaveValue("close-up");
    expect(screen.getByText("Override compiled into the current render plan.")).toBeInTheDocument();
    expect(screen.getAllByText("pan").some((element) => element.tagName === "B")).toBe(true);
    expect(screen.getAllByText("gesture").some((element) => element.tagName === "B")).toBe(true);
  });

  it("exposes an honest manual ChatGPT Images exchange with downloadable briefs", async () => {
    const user = await createDefaultProduction();
    const createObjectURL = vi.fn(() => "blob:story-stage-brief");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", {configurable: true, value: createObjectURL});
    Object.defineProperty(URL, "revokeObjectURL", {configurable: true, value: revokeObjectURL});
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    await user.click(screen.getByRole("button", {name: /Assets/}));

    expect(screen.getByRole("heading", {name: "Manual ChatGPT Images"})).toBeInTheDocument();
    expect(screen.getByText(/No API call or paid generation is hidden here/)).toBeInTheDocument();
    expect(screen.queryByRole("button", {name: /^Generate$/i})).not.toBeInTheDocument();
    expect(screen.getByRole("heading", {name: /generation briefs/})).toBeInTheDocument();

    await user.click(screen.getByRole("button", {name: /Review generation export/}));
    expect(screen.getByRole("heading", {name: /Exactly what will leave StoryStage/})).toBeInTheDocument();
    await user.click(screen.getByRole("button", {name: /Approve and export generation job/}));

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:story-stage-brief");
    expect(screen.getByText(/Generation job exported for/)).toBeInTheDocument();
  });
});
