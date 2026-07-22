import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { useState } from "react";
import { AssetWorkspace } from "./AssetWorkspace";
import { StudioShell } from "./StudioShell";
import {
  ASSET_CATEGORIES,
  ASSET_EPISODES,
  ASSET_FIXTURE_LABEL,
  ASSET_FIXTURES,
  ASSET_READINESS_DISCLAIMER,
  SCOPE_ALL,
  assetFixtureScopeLabel,
  filterAssetFixtures,
  resolveAssetSelection,
  sanitizeAssetScope,
  scenesForEpisodeScope,
  type AssetScope,
} from "./asset-workspace";
import { OLLO_DEMO_SCENES } from "./demo-project";
import type { AiConnectionState } from "./ai-director-fixture";

afterEach(() => {
  cleanup();
});

const categoriesNav = () =>
  screen.getByRole("navigation", { name: "Asset categories" });

const assetList = () =>
  screen.getByRole("region", { name: /records in scope$/ });

const assetDetail = () =>
  screen.getByRole("region", { name: "Selected asset detail" });

const listButtons = () =>
  within(assetList())
    .getAllByRole("button")
    .map((button) => button);

const selectedListButton = () =>
  listButtons().find(
    (button) => button.getAttribute("aria-current") === "true",
  );

describe("F4-WP1 — asset scope model (pure)", () => {
  it("grounds every fixture in the accepted Ollo demo hierarchy", () => {
    const sceneIds = new Set(OLLO_DEMO_SCENES.map((scene) => scene.id));
    const episodeIds = new Set(ASSET_EPISODES.map((episode) => episode.id));
    for (const fixture of ASSET_FIXTURES) {
      expect(episodeIds.has(fixture.episodeId)).toBe(true);
      for (const sceneId of fixture.sceneIds)
        expect(sceneIds.has(sceneId)).toBe(true);
      expect(fixture.sourceTruth.length).toBeGreaterThan(0);
      expect(fixture.approvalTruth).toContain("Not reviewed");
      expect(fixture.nextPreparation.action.length).toBeGreaterThan(0);
      expect(
        fixture.nextPreparation.unavailableReason.startsWith("Unavailable"),
      ).toBe(true);
    }
    // One deterministic record per required kind: Ollo, a supporting
    // character, a story location, a layered set, a prop, a rig placeholder.
    expect(ASSET_FIXTURES.map((fixture) => fixture.id)).toEqual([
      "char-ollo",
      "char-tix",
      "char-dot",
      "loc-little-wood",
      "loc-little-elsewhere",
      "set-home-nook",
      "set-lantern-bridge",
      "prop-storylight",
      "prop-berry-trail",
      "rig-ollo",
    ]);
  });

  it("lists scene options that belong to the selected episode only", () => {
    expect(scenesForEpisodeScope(SCOPE_ALL)).toHaveLength(
      OLLO_DEMO_SCENES.length,
    );
    expect(scenesForEpisodeScope("episode-1")).toHaveLength(
      OLLO_DEMO_SCENES.length,
    );
    expect(scenesForEpisodeScope("episode-unknown")).toHaveLength(0);
  });

  it("normalizes invalid episode/scene combinations fail-closed", () => {
    const twoEpisodes = [
      { id: "episode-1", title: "Episode 1", sceneIds: ["scene-1", "scene-2"] },
      { id: "episode-2", title: "Episode 2", sceneIds: ["scene-3"] },
    ];
    // A scene that belongs to another episode cannot survive sanitization.
    expect(
      sanitizeAssetScope(
        { episodeId: "episode-2", sceneId: "scene-1" },
        twoEpisodes,
      ),
    ).toEqual({ episodeId: "episode-2", sceneId: SCOPE_ALL });
    // A valid combination is preserved exactly.
    expect(
      sanitizeAssetScope(
        { episodeId: "episode-2", sceneId: "scene-3" },
        twoEpisodes,
      ),
    ).toEqual({ episodeId: "episode-2", sceneId: "scene-3" });
    // An unknown episode drops to the honest "all" scope; a scene that is
    // valid under that normalized scope is deterministically kept.
    expect(
      sanitizeAssetScope(
        { episodeId: "nope", sceneId: "scene-1" },
        twoEpisodes,
      ),
    ).toEqual({ episodeId: SCOPE_ALL, sceneId: "scene-1" });
  });

  it("filters deterministically by category and scope", () => {
    const all: AssetScope = { episodeId: SCOPE_ALL, sceneId: SCOPE_ALL };
    expect(filterAssetFixtures("characters", all).map((a) => a.id)).toEqual([
      "char-ollo",
      "char-tix",
      "char-dot",
    ]);
    const scene3: AssetScope = { episodeId: SCOPE_ALL, sceneId: "scene-3" };
    expect(filterAssetFixtures("characters", scene3).map((a) => a.id)).toEqual([
      "char-ollo",
      "char-tix",
      "char-dot",
    ]);
    const scene2: AssetScope = { episodeId: SCOPE_ALL, sceneId: "scene-2" };
    expect(filterAssetFixtures("characters", scene2).map((a) => a.id)).toEqual([
      "char-ollo",
      "char-tix",
    ]);
    // Honest empty scope: no props are scoped to Scene 2.
    expect(filterAssetFixtures("props", scene2)).toEqual([]);
    // Episode mismatch excludes the record even when the scene matches.
    expect(
      filterAssetFixtures("characters", {
        episodeId: "episode-2",
        sceneId: "scene-3",
      }),
    ).toEqual([]);
  });

  it("resolves selection deterministically: keep, fall to first, or none", () => {
    const visible = filterAssetFixtures("characters", {
      episodeId: SCOPE_ALL,
      sceneId: SCOPE_ALL,
    });
    expect(resolveAssetSelection(visible, "char-tix")).toBe("char-tix");
    expect(resolveAssetSelection(visible, "rig-ollo")).toBe("char-ollo");
    expect(resolveAssetSelection(visible, null)).toBe("char-ollo");
    expect(resolveAssetSelection([], "char-ollo")).toBeNull();
  });

  it("labels record scope truthfully: episode-wide vs explicit scenes", () => {
    const ollo = ASSET_FIXTURES.find((fixture) => fixture.id === "char-ollo")!;
    expect(assetFixtureScopeLabel(ollo)).toBe(
      "Episode 1 · The Storylight in the Little Wood · Episode-wide (every scene)",
    );
    const tix = ASSET_FIXTURES.find((fixture) => fixture.id === "char-tix")!;
    expect(assetFixtureScopeLabel(tix)).toBe(
      "Episode 1 · The Storylight in the Little Wood · Scene 2 · Forest Path, Scene 3 · Berry Patch, Scene 4 · Little Stream",
    );
  });
});

describe("F4-WP1 — category navigation and selected state", () => {
  it("defaults to Characters with the deterministic first record selected", () => {
    render(<AssetWorkspace />);
    const categories = within(categoriesNav()).getAllByRole("button");
    expect(categories.map((button) => button.textContent)).toEqual(
      ASSET_CATEGORIES.map((category) => category.label),
    );
    expect(categories[0]!.getAttribute("aria-current")).toBe("true");
    for (const button of categories.slice(1))
      expect(button.getAttribute("aria-current")).toBeNull();
    expect(selectedListButton()?.textContent).toContain("Ollo");
    expect(
      within(assetDetail()).getByRole("heading", { name: "Ollo" }),
    ).toBeTruthy();
  });

  it("moves category selected state with navigation, never by color alone", async () => {
    const user = userEvent.setup();
    render(<AssetWorkspace />);
    for (const category of ASSET_CATEGORIES.slice(1)) {
      await user.click(
        within(categoriesNav()).getByRole("button", {
          name: category.label,
        }),
      );
      expect(
        within(categoriesNav())
          .getByRole("button", { name: category.label })
          .getAttribute("aria-current"),
      ).toBe("true");
      expect(
        within(categoriesNav())
          .getAllByRole("button")
          .filter((button) => button.getAttribute("aria-current") === "true"),
      ).toHaveLength(1);
    }
  });

  it("keeps one selected asset identity synchronized between list and detail across three categories", async () => {
    const user = userEvent.setup();
    render(<AssetWorkspace />);

    // Characters: select Tix.
    await user.click(within(assetList()).getByRole("button", { name: /Tix/ }));
    expect(selectedListButton()?.textContent).toContain("Tix");
    let detail = within(assetDetail());
    expect(detail.getByRole("heading", { name: "Tix" })).toBeTruthy();
    expect(detail.getByText("Characters")).toBeTruthy();

    // Layered Sets: deterministic first record, then select Lantern Bridge.
    await user.click(
      within(categoriesNav()).getByRole("button", { name: "Layered Sets" }),
    );
    expect(selectedListButton()?.textContent).toContain("The Home Nook set");
    expect(
      within(assetDetail()).getByRole("heading", {
        name: "The Home Nook set",
      }),
    ).toBeTruthy();
    await user.click(
      within(assetList()).getByRole("button", { name: /Lantern Bridge set/ }),
    );
    detail = within(assetDetail());
    expect(
      detail.getByRole("heading", { name: "Lantern Bridge set" }),
    ).toBeTruthy();
    expect(detail.getByText("Layered Sets")).toBeTruthy();
    expect(detail.getByText(/Scene 5 · Lantern Bridge/)).toBeTruthy();

    // Rigs: the placeholder rig record.
    await user.click(
      within(categoriesNav()).getByRole("button", { name: "Rigs" }),
    );
    expect(selectedListButton()?.textContent).toContain("Ollo performance rig");
    detail = within(assetDetail());
    expect(
      detail.getByRole("heading", { name: "Ollo performance rig" }),
    ).toBeTruthy();
    expect(detail.getByText("Rigs")).toBeTruthy();
    expect(detail.getByText(/Episode-wide \(every scene\)/)).toBeTruthy();
  });
});

describe("F4-WP1 — episode/scene filters and stale selection clearing", () => {
  it("narrows the list through the scene filter while keeping a still-visible selection", async () => {
    const user = userEvent.setup();
    render(<AssetWorkspace />);
    // Select Tix, then narrow to Scene 3 (Berry Patch): Tix stays selected.
    await user.click(within(assetList()).getByRole("button", { name: /Tix/ }));
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Scene filter" }),
      "scene-3",
    );
    expect(
      within(assetList()).getByRole("heading", {
        name: "All episodes · Scene 3 · Berry Patch",
      }),
    ).toBeTruthy();
    expect(listButtons().map((button) => button.textContent)).toEqual([
      expect.stringContaining("Ollo"),
      expect.stringContaining("Tix"),
      expect.stringContaining("Dot"),
    ]);
    expect(selectedListButton()?.textContent).toContain("Tix");
    expect(
      within(assetDetail()).getByRole("heading", { name: "Tix" }),
    ).toBeTruthy();
  });

  it("clears a stale selection deterministically when the filter excludes it", async () => {
    const user = userEvent.setup();
    render(<AssetWorkspace />);
    await user.click(within(assetList()).getByRole("button", { name: /Tix/ }));
    // Scene 5 excludes Tix: selection falls to the first visible record.
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Scene filter" }),
      "scene-5",
    );
    expect(listButtons()).toHaveLength(1);
    expect(selectedListButton()?.textContent).toContain("Ollo");
    expect(
      within(assetDetail()).getByRole("heading", { name: "Ollo" }),
    ).toBeTruthy();
    expect(within(assetDetail()).queryByText(/Tix/)).toBeNull();
    // Widening the filter again never revives the stale hidden selection.
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Scene filter" }),
      SCOPE_ALL,
    );
    expect(selectedListButton()?.textContent).toContain("Ollo");
  });

  it("shows an honest empty scope and no stale detail when nothing matches", async () => {
    const user = userEvent.setup();
    render(<AssetWorkspace />);
    await user.click(
      within(categoriesNav()).getByRole("button", { name: "Props" }),
    );
    // Select the berry trail under Scene 3 first, then move to the empty
    // Scene 2 scope: neither the record nor its detail may survive.
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Scene filter" }),
      "scene-3",
    );
    expect(selectedListButton()?.textContent).toContain("Dropped berry trail");
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Scene filter" }),
      "scene-2",
    );
    expect(
      within(assetList()).getByText(
        /No props records are scoped to All episodes · Scene 2 · Forest Path/,
      ),
    ).toBeTruthy();
    expect(within(assetList()).queryByRole("button")).toBeNull();
    expect(within(assetDetail()).getByText(/Nothing selected/)).toBeTruthy();
    expect(within(assetDetail()).queryByText(/berry/i)).toBeNull();
  });

  it("keeps the episode and scene filters understandable together", async () => {
    const user = userEvent.setup();
    render(<AssetWorkspace />);
    const episodeFilter = screen.getByRole("combobox", {
      name: "Episode filter",
    });
    const sceneFilter = screen.getByRole("combobox", { name: "Scene filter" });
    // Scene options always belong to the selected episode fixture.
    await user.selectOptions(episodeFilter, "episode-1");
    expect(within(sceneFilter).getAllByRole("option")).toHaveLength(
      OLLO_DEMO_SCENES.length + 1,
    );
    await user.selectOptions(sceneFilter, "scene-7");
    expect(
      within(assetList()).getByRole("heading", {
        name: "Episode 1 · The Storylight in the Little Wood · Scene 7 · Sunflower Field",
      }),
    ).toBeTruthy();
    // Back to All episodes restores the combined scope label honestly.
    await user.selectOptions(episodeFilter, SCOPE_ALL);
    expect(
      within(assetList()).getByRole("heading", {
        name: "All episodes · Scene 7 · Sunflower Field",
      }),
    ).toBeTruthy();
  });
});

describe("F4-WP1 — truth boundaries", () => {
  it("marks every record and the workspace as local demo fixtures", () => {
    render(<AssetWorkspace />);
    expect(screen.getByText(ASSET_READINESS_DISCLAIMER)).toBeTruthy();
    for (const button of listButtons())
      expect(button.textContent).toContain(ASSET_FIXTURE_LABEL);
    expect(
      within(assetDetail()).getAllByText(ASSET_FIXTURE_LABEL).length,
    ).toBeGreaterThan(0);
  });

  it("keeps every preparation action visibly unavailable with its reason, and no control reports success", async () => {
    const user = userEvent.setup();
    render(<AssetWorkspace />);
    for (const category of ASSET_CATEGORIES) {
      await user.click(
        within(categoriesNav()).getByRole("button", {
          name: category.label,
        }),
      );
      const detail = within(assetDetail());
      const actions = detail.getAllByRole("button");
      expect(actions.length).toBeGreaterThan(0);
      for (const action of actions) {
        expect((action as HTMLButtonElement).disabled).toBe(true);
      }
      expect(detail.getByText(/^Unavailable —/)).toBeTruthy();
      expect(detail.getByText(/^Not reviewed —/)).toBeTruthy();
    }
    // No surface text may claim a completed artifact, approval, or import.
    const workspace = screen.getByTestId("pv1-assets");
    expect(workspace.textContent).not.toMatch(
      /successfully|artifact created|has been (generated|imported|approved|rigged)|production-ready/i,
    );
  });

  it("uses readiness vocabulary only with its fixture disclaimer", async () => {
    const user = userEvent.setup();
    render(<AssetWorkspace />);
    await user.click(
      within(categoriesNav()).getByRole("button", { name: "Props" }),
    );
    const detail = within(assetDetail());
    expect(detail.getByText(/^Needs reference —/)).toBeTruthy();
    // The disclaimer is present on the same surface as the vocabulary.
    expect(screen.getByText(ASSET_READINESS_DISCLAIMER)).toBeTruthy();
  });
});

describe("F4-WP1 — Studio workspace switching", () => {
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

  it("reaches Assets & Rigs from Studio and preserves the selected scene and beat exactly", async () => {
    const user = userEvent.setup();
    render(<StudioHarness />);
    const studio = screen.getByTestId("pv1-studio");

    // Select Scene 3, Beat 2 through the accepted rail path.
    const railNav = () =>
      within(studio).getByRole("navigation", { name: "Episode hierarchy" });
    await user.click(
      within(railNav()).getByRole("button", { name: /^Scene 3 Berry Patch/ }),
    );
    await user.click(
      within(railNav()).getByRole("button", {
        name: /^Beat 2 The glow flickers twice, inviting/,
      }),
    );
    const scopeHeader = () =>
      within(studio).getByRole("navigation", { name: "Current scope" });
    expect(scopeHeader().textContent).toContain("Scene 3 · Berry Patch");
    expect(scopeHeader().textContent).toContain(
      "Beat 2 · The glow flickers twice, inviting",
    );

    // Open the workspace: accepted scope header stays authoritative.
    await user.click(workspaceTab("Assets & Rigs"));
    expect(screen.getByTestId("pv1-assets")).toBeTruthy();
    expect(workspaceTab("Assets & Rigs").getAttribute("aria-current")).toBe(
      "true",
    );
    expect(workspaceTab("Scene board").getAttribute("aria-current")).toBeNull();
    expect(scopeHeader().textContent).toContain("Scene 3 · Berry Patch");
    expect(scopeHeader().textContent).toContain(
      "Beat 2 · The glow flickers twice, inviting",
    );

    // Asset filters must not silently change the selected Studio scene:
    // narrowing the asset scope to Scene 5 leaves the rail selection on 3.
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Scene filter" }),
      "scene-5",
    );
    const rail = within(studio).getByRole("navigation", {
      name: "Episode hierarchy",
      hidden: true,
    });
    expect(
      within(rail)
        .getAllByRole("button", { hidden: true })
        .find((button) => button.getAttribute("aria-current") === "true")
        ?.getAttribute("aria-label"),
    ).toContain("Scene 3 Berry Patch");

    // Back to the board: selection, beat, and rail state are untouched.
    await user.click(workspaceTab("Scene board"));
    expect(screen.queryByTestId("pv1-assets")).toBeNull();
    expect(scopeHeader().textContent).toContain("Scene 3 · Berry Patch");
    expect(scopeHeader().textContent).toContain(
      "Beat 2 · The glow flickers twice, inviting",
    );
  });

  it("keeps the AI Director panel mounted so its session state survives switching", async () => {
    const user = userEvent.setup();
    render(<StudioHarness />);
    const studio = screen.getByTestId("pv1-studio");
    const aiPanel = () =>
      within(studio).getByRole("complementary", { name: "AI Director" });
    await user.click(
      within(aiPanel()).getByRole("button", {
        name: "Sign in with ChatGPT",
      }),
    );
    await user.type(
      within(aiPanel()).getByRole("textbox", { name: "AI Director request" }),
      "Keep the hush",
    );
    await user.click(workspaceTab("Assets & Rigs"));
    await user.click(workspaceTab("Scene board"));
    expect(
      (
        within(aiPanel()).getByRole("textbox", {
          name: "AI Director request",
        }) as HTMLTextAreaElement
      ).value,
    ).toBe("Keep the hush");
  });
});
