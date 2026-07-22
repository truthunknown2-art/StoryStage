import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { useState } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { AssetWorkspace } from "./AssetWorkspace";
import { StudioShell } from "./StudioShell";
import type { AiConnectionState } from "./ai-director-fixture";
import {
  REVIEW_FIXTURES,
  REVIEW_READY_TRUTH,
  type CharacterRigDeclaration,
  type ReviewFixture,
} from "./asset-review";

/**
 * F4-WP5 focused accessibility regressions for the integrated Product v1
 * Assets & Rigs workspace: keyboard entry/exit, selection agreement,
 * expanded/controls relationships, deliberate focus for open/switch/Escape/
 * Close/validation/terminal/scope-removal states, the one-open transient
 * panel invariant, table naming, non-color state meaning, retained truth,
 * and the reduced-motion source contract. Computed reduced-motion and
 * responsive behavior is proven by the F4-WP5 browser evidence package.
 */

afterEach(() => {
  cleanup();
});

const requirementsRegion = () => screen.getByTestId("pv1-requirements");

const requirementCountsText = () =>
  requirementsRegion().querySelector(".pv1-requirement-counts")?.textContent ??
  "";

const reviewPanel = () => screen.getByTestId("pv1-review");

const requestPanel = () => screen.getByTestId("pv1-request");

const sceneFilter = () =>
  screen.getByRole("combobox", { name: "Scene filter" });

const selectScene = async (
  user: ReturnType<typeof userEvent.setup>,
  sceneId: string,
) => {
  await user.selectOptions(sceneFilter(), sceneId);
};

const requirementRow = (name: string) =>
  [...requirementsRegion().querySelectorAll(".pv1-requirement-row")].find(
    (row) => row.querySelector("strong")?.textContent === name,
  )!;

const pressEnter = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.keyboard("{Enter}");
};

describe("F4-WP5 — keyboard entry into and exit from Assets & Rigs", () => {
  function StudioHarness() {
    const [aiConnection, setAiConnection] =
      useState<AiConnectionState>("signed-out");
    return (
      <StudioShell
        aiConnection={aiConnection}
        artStyleLabel="Storybook Cutout"
        grammarLabel="Kids Adventure"
        onAiConnectionChange={setAiConnection}
        onBackToProjects={() => {}}
        projectTitle="The Storylight in the Little Wood"
      />
    );
  }

  const workspaceTab = (name: string) =>
    within(
      screen.getByRole("navigation", { name: "Studio workspace" }),
    ).getByRole("button", { name });

  it("enters the workspace by keyboard, Tabs into categories and filters, and exits back to the board", async () => {
    const user = userEvent.setup();
    render(<StudioHarness />);
    /* Arrival focus is deliberate: the primary board heading. */
    const boardHeading = screen.getByRole("heading", {
      name: "The Home Nook",
    });
    expect(document.activeElement).toBe(boardHeading);

    /* Shift+Tab backwards reaches the workspace switch without a pointer
     * (the rail's group/scene/beat controls sit between it and the board
     * heading, so the walk crosses them). */
    const assetsTab = workspaceTab("Assets & Rigs");
    for (let index = 0; index < 80; index += 1) {
      if (document.activeElement === assetsTab) break;
      await user.tab({ shift: true });
    }
    expect(document.activeElement).toBe(assetsTab);

    /* Enter opens the workspace; focus is not yanked away from the
     * surviving invoker, which reports the current workspace. */
    await pressEnter(user);
    expect(screen.getByTestId("pv1-assets")).toBeTruthy();
    expect(document.activeElement).toBe(assetsTab);
    expect(assetsTab).toHaveAttribute("aria-current", "true");

    /* The next Tab stop is the first asset category; the episode and scene
     * filters follow within a short logical order. */
    await user.tab();
    expect(
      document.activeElement ===
        within(
          screen.getByRole("navigation", { name: "Asset categories" }),
        ).getByRole("button", { name: "Characters" }),
    ).toBe(true);
    let reachedSceneFilter = false;
    for (let index = 0; index < 10; index += 1) {
      await user.tab();
      if (document.activeElement === sceneFilter()) {
        reachedSceneFilter = true;
        break;
      }
    }
    expect(reachedSceneFilter).toBe(true);

    /* Exiting by keyboard returns to the board and keeps focus on the
     * surviving switch control. */
    const boardTab = workspaceTab("Scene board");
    for (let index = 0; index < 16; index += 1) {
      if (document.activeElement === boardTab) break;
      await user.tab({ shift: true });
    }
    expect(document.activeElement).toBe(boardTab);
    await pressEnter(user);
    expect(screen.queryByTestId("pv1-assets")).toBeNull();
    expect(document.activeElement).toBe(boardTab);
    expect(boardTab).toHaveAttribute("aria-current", "true");
    expect(
      document.querySelector(".pv1-studio-layout")?.hasAttribute("hidden"),
    ).toBe(false);
  });
});

describe("F4-WP5 — selection agreement and unique names", () => {
  it("keeps category, filter, requirement-action, record-selection, and detail in agreement under keyboard operation", async () => {
    const user = userEvent.setup();
    render(<AssetWorkspace />);

    /* Category activation by keyboard swaps the record list. */
    const propsCategory = within(
      screen.getByRole("navigation", { name: "Asset categories" }),
    ).getByRole("button", { name: "Props" });
    propsCategory.focus();
    await pressEnter(user);
    expect(propsCategory).toHaveAttribute("aria-current", "true");
    const list = () =>
      screen.getByRole("region", { name: /records in scope$/ });
    const firstRecord = within(list()).getAllByRole("button")[0]!;
    const recordName = firstRecord.querySelector("strong")!.textContent!;

    /* Record selection by keyboard synchronizes the detail surface. */
    firstRecord.focus();
    await pressEnter(user);
    expect(firstRecord).toHaveAttribute("aria-current", "true");
    const detail = () =>
      screen.getByRole("region", { name: "Selected asset detail" });
    expect(
      within(detail()).getByRole("heading", { name: recordName }),
    ).toBeTruthy();

    /* The requirement action navigates to the same record identity. */
    await selectScene(user, "scene-1");
    const charactersCategory = within(
      screen.getByRole("navigation", { name: "Asset categories" }),
    ).getByRole("button", { name: "Characters" });
    charactersCategory.focus();
    await pressEnter(user);
    const olloRow = requirementRow("Ollo");
    const openRecord = within(olloRow as HTMLElement).getByRole("button", {
      name: /^Open Ollo record for Scene 1/,
    });
    openRecord.focus();
    await pressEnter(user);
    expect(openRecord).toHaveAttribute("aria-current", "true");
    expect((olloRow as HTMLElement).classList.contains("is-open")).toBe(true);
    expect(
      within(detail()).getByRole("heading", { name: "Ollo" }),
    ).toBeTruthy();
    const selectedListButton = within(list())
      .getAllByRole("button")
      .find((button) => button.getAttribute("aria-current") === "true")!;
    expect(selectedListButton.querySelector("strong")!.textContent).toBe(
      "Ollo",
    );
  });

  it("gives every enabled control a unique accessible name, including inside an open review panel", async () => {
    const user = userEvent.setup();
    render(<AssetWorkspace />);
    const accessibleNames = (root: HTMLElement) =>
      [...root.querySelectorAll("button:not([disabled])")].map(
        (button) =>
          button.getAttribute("aria-label") ?? button.textContent?.trim() ?? "",
      );
    const workspace = screen.getByTestId("pv1-assets");
    const baseNames = accessibleNames(workspace);
    expect(new Set(baseNames).size).toBe(baseNames.length);

    await selectScene(user, "scene-1");
    await user.click(
      screen.getByRole("button", {
        name: "Review layers & rig for Ollo in Scene 1 · The Home Nook",
      }),
    );
    const panelNames = accessibleNames(reviewPanel());
    expect(new Set(panelNames).size).toBe(panelNames.length);
  });
});

describe("F4-WP5 — request/import focus contract", () => {
  it("exposes a stable expanded/controls relationship and deliberate validation, terminal, Escape, and Close focus", async () => {
    const user = userEvent.setup();
    render(<AssetWorkspace />);
    await selectScene(user, "scene-3");
    const countsBefore = requirementCountsText();

    const invoker = screen.getByRole("button", {
      name: "Request image pack for Dot in Scene 3 · Berry Patch",
    });
    const controlsId = invoker.getAttribute("aria-controls")!;
    expect(controlsId.startsWith("pv1-request-")).toBe(true);
    expect(invoker).toHaveAttribute("aria-expanded", "false");

    invoker.focus();
    await pressEnter(user);
    let panel = requestPanel();
    expect(panel.id).toBe(controlsId);
    expect(invoker).toHaveAttribute("aria-expanded", "true");
    /* Opening moves focus to the labelled heading. */
    expect(
      document.activeElement ===
        within(panel).getByRole("heading", { name: "Dot" }),
    ).toBe(true);

    /* Validation: missing source moves focus to the field and announces one
     * concise alert; missing license does the same for its field. */
    await user.click(
      screen.getByRole("button", { name: "Choose a declared demo candidate" }),
    );
    /* One Escape from an active request workflow closes the inline panel and
     * restores focus to its exact surviving invoker. It never requires a
     * second Escape through an intermediate cancelled state. */
    await user.keyboard("{Escape}");
    expect(screen.queryByTestId("pv1-request")).toBeNull();
    expect(document.activeElement).toBe(invoker);
    await pressEnter(user);
    panel = requestPanel();
    await user.click(
      screen.getByRole("button", { name: "Choose a declared demo candidate" }),
    );
    await user.click(
      screen.getByRole("button", { name: /Dot view sheet/ }),
    );
    await user.click(
      screen.getByRole("button", { name: "Continue to confirmation" }),
    );
    expect(within(panel).getAllByRole("alert")).toHaveLength(1);
    const sourceInput = within(panel).getByLabelText("Source (required)");
    expect(document.activeElement).toBe(sourceInput);
    expect(sourceInput).toHaveAttribute("aria-invalid", "true");
    await user.type(sourceInput, "Painted in my own tool");
    await user.click(
      screen.getByRole("button", { name: "Continue to confirmation" }),
    );
    expect(within(panel).getAllByRole("alert")).toHaveLength(1);
    const licenseInput = within(panel).getByLabelText(
      "License / rights (required)",
    );
    expect(document.activeElement).toBe(licenseInput);
    await user.type(licenseInput, "I own the result");
    await user.click(
      screen.getByRole("button", { name: "Continue to confirmation" }),
    );

    /* Terminal confirmed state moves focus to its concise status note and
     * leaves counts untouched. */
    await user.click(
      screen.getByRole("button", { name: "Confirm local candidate record" }),
    );
    const note = within(panel).getByRole("status");
    expect(document.activeElement).toBe(note);
    expect(requirementCountsText()).toBe(countsBefore);
    expect(requirementsRegion().textContent).toContain(
      "Local candidate records: 1",
    );

    /* Escape from the terminal state closes and restores focus to the exact
     * surviving invoker; reopening and Close does the same. */
    await user.keyboard("{Escape}");
    expect(screen.queryByTestId("pv1-request")).toBeNull();
    expect(document.activeElement).toBe(invoker);
    expect(invoker).toHaveAttribute("aria-expanded", "false");
    await pressEnter(user);
    await user.click(
      within(requestPanel()).getByRole("button", {
        name: "Close request panel for Dot",
      }),
    );
    expect(screen.queryByTestId("pv1-request")).toBeNull();
    expect(document.activeElement).toBe(invoker);
  });
});

describe("F4-WP5 — review focus contract and panel invariant", () => {
  it("exposes a stable expanded/controls relationship, names its table, keeps state off color alone, and restores focus on Close", async () => {
    const user = userEvent.setup();
    render(<AssetWorkspace />);
    await selectScene(user, "scene-1");

    const invoker = screen.getByRole("button", {
      name: "Review layers & rig for Ollo in Scene 1 · The Home Nook",
    });
    const controlsId = invoker.getAttribute("aria-controls")!;
    expect(controlsId.startsWith("pv1-review-")).toBe(true);
    expect(invoker).toHaveAttribute("aria-expanded", "false");

    invoker.focus();
    await pressEnter(user);
    const panel = reviewPanel();
    expect(panel.id).toBe(controlsId);
    expect(invoker).toHaveAttribute("aria-expanded", "true");
    expect(
      document.activeElement ===
        within(panel).getByRole("heading", { name: "Ollo" }),
    ).toBe(true);

    /* Review state is text, never color alone: the state chip and every
     * declared/missing fact carry explicit words. */
    expect(panel.textContent).toContain("Review state:");
    expect(panel.textContent).toContain("Incomplete");
    expect(panel.textContent).toContain("Declared");
    expect(panel.textContent).toContain("Missing");

    /* The wide part table has an accessible name inside a labelled,
     * keyboard-reachable contained horizontal scroller. */
    const scroller = within(panel).getByRole("region", {
      name: /part inventory table/i,
    });
    expect(scroller.tabIndex).toBe(0);
    const table = within(scroller).getByRole("table", {
      name: "Declared part inventory (demo metadata)",
    });
    expect(table.querySelectorAll("tbody tr").length).toBeGreaterThan(0);

    /* Review-ready always carries its adjacent non-production truth. */
    await user.click(
      screen.getByRole("button", { name: "Review-ready example" }),
    );
    expect(reviewPanel().textContent).toContain("Review-ready");
    expect(reviewPanel().textContent).toContain(REVIEW_READY_TRUTH);

    /* Close restores focus to the exact surviving invoker. */
    await user.click(
      within(reviewPanel()).getByRole("button", {
        name: "Close review panel for Ollo",
      }),
    );
    expect(screen.queryByTestId("pv1-review")).toBeNull();
    expect(document.activeElement).toBe(invoker);
    expect(invoker).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps at most one transient panel open when switching request to review, never stranding focus", async () => {
    const user = userEvent.setup();
    render(<AssetWorkspace />);
    await selectScene(user, "scene-3");

    const requestInvoker = screen.getByRole("button", {
      name: "Request image pack for Dot in Scene 3 · Berry Patch",
    });
    await user.click(requestInvoker);
    expect(requestPanel()).toBeTruthy();

    const reviewInvoker = screen.getByRole("button", {
      name: "Review layers & rig for Dot in Scene 3 · Berry Patch",
    });
    await user.click(reviewInvoker);
    expect(screen.queryByTestId("pv1-request")).toBeNull();
    expect(reviewPanel()).toBeTruthy();
    /* Exactly one transient panel exists, and focus landed inside it on the
     * labelled heading — never in removed content. */
    expect(
      document.querySelectorAll(
        "[data-testid='pv1-request'], [data-testid='pv1-review']",
      ),
    ).toHaveLength(1);
    const active = document.activeElement;
    expect(active === reviewPanel() || reviewPanel().contains(active)).toBe(
      true,
    );
    expect(requestInvoker).toHaveAttribute("aria-expanded", "false");
    expect(reviewInvoker).toHaveAttribute("aria-expanded", "true");

    /* Escape closes the review and restores focus to its invoker. */
    await user.keyboard("{Escape}");
    expect(screen.queryByTestId("pv1-review")).toBeNull();
    expect(document.activeElement).toBe(reviewInvoker);
  });

  it("moves focus to the readable alert when the active example fails closed as unavailable", async () => {
    const user = userEvent.setup();
    const fixtureFor = (fixtureId: string) =>
      REVIEW_FIXTURES.find((fixture) => fixture.id === fixtureId)!;
    const ready = fixtureFor("review-req-s1-ollo-review-ready");
    const brokenSource = structuredClone(
      fixtureFor("review-req-s1-ollo-incomplete"),
    );
    brokenSource.declaration = {
      ...(brokenSource.declaration as CharacterRigDeclaration),
      turnaroundViews: ["Front view", "Overhead view"],
    };
    const broken: ReviewFixture = brokenSource;
    render(<AssetWorkspace reviewFixtures={[ready, broken]} />);
    await selectScene(user, "scene-1");
    await user.click(
      screen.getByRole("button", {
        name: "Review layers & rig for Ollo in Scene 1 · The Home Nook",
      }),
    );
    await user.click(
      screen.getByRole("button", { name: "Incomplete example" }),
    );
    const alert = within(reviewPanel()).getByRole("alert");
    expect(alert.textContent).toContain("Unknown turnaround view");
    expect(document.activeElement).toBe(alert);
    /* The unavailable example enters no counts and claims no state. */
    expect(reviewPanel().textContent).toContain("fails closed as unavailable");
    expect(reviewPanel().textContent).not.toContain("Review state:");
  });
});

describe("F4-WP5 — scope-removal focus backstop", () => {
  it("moves stranded focus to the surviving Scene filter when scope removal closes a review panel", async () => {
    const user = userEvent.setup();
    render(<AssetWorkspace />);
    await selectScene(user, "scene-1");
    await user.click(
      screen.getByRole("button", {
        name: "Review layers & rig for Ollo in Scene 1 · The Home Nook",
      }),
    );
    /* Focus rests inside the panel; a scope change removes the panel and its
     * invoker without a pointer anywhere near the filter. */
    expect(reviewPanel().contains(document.activeElement)).toBe(true);
    fireEvent.change(sceneFilter(), { target: { value: "scene-2" } });
    expect(screen.queryByTestId("pv1-review")).toBeNull();
    expect(document.activeElement).toBe(sceneFilter());
  });

  it("moves stranded focus to the surviving Scene filter when scope removal closes a request panel", async () => {
    const user = userEvent.setup();
    render(<AssetWorkspace />);
    await selectScene(user, "scene-3");
    await user.click(
      screen.getByRole("button", {
        name: "Request image pack for Dot in Scene 3 · Berry Patch",
      }),
    );
    expect(requestPanel().contains(document.activeElement)).toBe(true);
    fireEvent.change(sceneFilter(), { target: { value: "scene-1" } });
    expect(screen.queryByTestId("pv1-request")).toBeNull();
    expect(document.activeElement).toBe(sceneFilter());
  });

  it("never yanks focus that already rests on a surviving control", async () => {
    const user = userEvent.setup();
    render(<AssetWorkspace />);
    await selectScene(user, "scene-1");
    await user.click(
      screen.getByRole("button", {
        name: "Review layers & rig for Ollo in Scene 1 · The Home Nook",
      }),
    );
    expect(reviewPanel()).toBeTruthy();
    const propsCategory = within(
      screen.getByRole("navigation", { name: "Asset categories" }),
    ).getByRole("button", { name: "Props" });
    propsCategory.focus();
    fireEvent.change(sceneFilter(), { target: { value: "scene-2" } });
    expect(screen.queryByTestId("pv1-review")).toBeNull();
    expect(document.activeElement).toBe(propsCategory);
  });
});

describe("F4-WP5 — retained truth through transient panels", () => {
  it("keeps counts, readiness, source/rights, and session-local candidate truth unchanged", async () => {
    const user = userEvent.setup();
    render(<AssetWorkspace />);
    await selectScene(user, "scene-3");
    const countsBefore = requirementCountsText();
    const dotRowBefore = requirementRow("Dot");
    const readinessBefore =
      dotRowBefore.querySelector("small")?.textContent ?? "";
    const sourceBefore =
      dotRowBefore.querySelector(".pv1-requirement-source")?.textContent ?? "";
    expect(sourceBefore.length).toBeGreaterThan(0);

    /* Review open/Escape changes nothing. Scene 3 Dot opens on its
     * Needs-correction example with the exact readable blocker. */
    await user.click(
      screen.getByRole("button", {
        name: "Review layers & rig for Dot in Scene 3 · Berry Patch",
      }),
    );
    expect(reviewPanel().textContent).toContain("Needs correction");
    expect(reviewPanel().textContent).toContain("Contradictions to correct");
    await user.keyboard("{Escape}");
    expect(requirementCountsText()).toBe(countsBefore);

    /* A confirmed session-local candidate record changes no readiness,
     * counts, or source/rights truth — and is honestly retained. */
    await user.click(
      screen.getByRole("button", {
        name: "Request image pack for Dot in Scene 3 · Berry Patch",
      }),
    );
    await user.click(
      screen.getByRole("button", { name: "Choose a declared demo candidate" }),
    );
    await user.click(
      screen.getByRole("button", { name: /Dot view sheet/ }),
    );
    await user.type(
      within(requestPanel()).getByLabelText("Source (required)"),
      "Painted in my own tool",
    );
    await user.type(
      within(requestPanel()).getByLabelText("License / rights (required)"),
      "I own the result",
    );
    await user.click(
      screen.getByRole("button", { name: "Continue to confirmation" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Confirm local candidate record" }),
    );
    await user.click(
      within(requestPanel()).getByRole("button", { name: "Close panel" }),
    );
    expect(requirementCountsText()).toBe(countsBefore);
    const dotRowAfter = requirementRow("Dot");
    expect(dotRowAfter.querySelector("small")?.textContent).toBe(
      readinessBefore,
    );
    expect(
      dotRowAfter.querySelector(".pv1-requirement-source")?.textContent,
    ).toBe(sourceBefore);
    expect(requirementsRegion().textContent).toContain(
      "Local candidate records: 1 — descriptive session records only; no files exist and readiness is unchanged",
    );
  });
});

describe("F4-WP5 — reduced-motion contract", () => {
  it("keeps the .pv1-page reduced-motion blanket in the stylesheet and renders the workspace inside .pv1-page", async () => {
    const css = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");
    /* No pv1 focus-visible rule may remove the global 2px outline. */
    expect(css).not.toMatch(/:focus-visible\s*\{[^}]*outline:\s*none/s);
    /* The blanket collapses transitions, animations, and animated scrolling
     * for every pv1 element; the Assets & Rigs workspace is one of them. */
    const blanketIndex = css.indexOf(".pv1-page *,");
    expect(blanketIndex).toBeGreaterThan(-1);
    expect(css.slice(Math.max(0, blanketIndex - 80), blanketIndex)).toContain(
      "prefers-reduced-motion: reduce",
    );
    const blanket = css.slice(blanketIndex, blanketIndex + 420);
    expect(blanket).toContain("animation-duration: 0.01ms !important");
    expect(blanket).toContain("scroll-behavior: auto !important");
    expect(blanket).toContain("transition-duration: 0.01ms !important");
    /* The F4-WP5 table scroller keeps the 2px visible focus indicator. */
    expect(css).toMatch(
      /\.pv1-review-table-scroll:focus-visible\s*\{[^}]*outline:\s*2px solid/s,
    );
    /* Every programmatically focused request outcome keeps the same visible
     * >=2px treatment, including fail-closed alerts and terminal notes. */
    expect(css).toMatch(
      /\.pv1-request-alert:focus,\s*\.pv1-request-note:focus\s*\{[^}]*outline:\s*2px solid/s,
    );

    const user = userEvent.setup();
    function Harness() {
      const [aiConnection, setAiConnection] =
        useState<AiConnectionState>("signed-out");
      return (
        <StudioShell
          aiConnection={aiConnection}
          artStyleLabel="Storybook Cutout"
          grammarLabel="Kids Adventure"
          onAiConnectionChange={setAiConnection}
          onBackToProjects={() => {}}
          projectTitle="The Storylight in the Little Wood"
        />
      );
    }
    render(<Harness />);
    await user.click(
      within(
        screen.getByRole("navigation", { name: "Studio workspace" }),
      ).getByRole("button", { name: "Assets & Rigs" }),
    );
    const page = document.querySelector("main.pv1-page")!;
    expect(page).not.toBeNull();
    expect(page.contains(screen.getByTestId("pv1-assets"))).toBe(true);
  });
});
