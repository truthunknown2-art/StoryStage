import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { useState } from "react";
import { AssetWorkspace } from "./AssetWorkspace";
import { StudioShell } from "./StudioShell";
import { ASSET_FIXTURES, SCOPE_ALL } from "./asset-workspace";
import {
  READY_LOCAL_RECORD_DISCLAIMER,
  SCENE_REQUIREMENTS,
  countRequirements,
  findSceneRequirement,
  requirementSceneLabel,
  requirementScopeLabel,
  resolveSceneRequirement,
  resolveScopeRequirements,
  type SceneRequirementFixture,
} from "./asset-requirements";
import { OLLO_DEMO_SCENES } from "./demo-project";
import type { AiConnectionState } from "./ai-director-fixture";

afterEach(() => {
  cleanup();
});

const ALL_SCENES = { episodeId: SCOPE_ALL, sceneId: SCOPE_ALL } as const;

const categoriesNav = () =>
  screen.getByRole("navigation", { name: "Asset categories" });

const assetList = () =>
  screen.getByRole("region", { name: /records in scope$/ });

const assetDetail = () =>
  screen.getByRole("region", { name: "Selected asset detail" });

const requirementsRegion = () => screen.getByTestId("pv1-requirements");

const requirementRows = () => [
  ...requirementsRegion().querySelectorAll<HTMLElement>(".pv1-requirement-row"),
];

const requirementCountsText = () =>
  requirementsRegion().querySelector(".pv1-requirement-counts")?.textContent ??
  "";

const rowFor = (name: string, sceneTitle?: string) => {
  const row = requirementRows().find(
    (candidate) =>
      candidate.querySelector("strong")?.textContent === name &&
      (sceneTitle === undefined || candidate.textContent?.includes(sceneTitle)),
  );
  expect(row, `requirement row for ${name}`).toBeTruthy();
  return row!;
};

const selectScene = async (
  user: ReturnType<typeof userEvent.setup>,
  sceneId: string,
) => {
  await user.selectOptions(
    screen.getByRole("combobox", { name: "Scene filter" }),
    sceneId,
  );
};

const sceneRequirementDetail = () =>
  screen.getByTestId("pv1-assets").querySelector(".pv1-asset-scene-requirement")
    ?.textContent ?? "";

describe("F4-WP2 — requirement fixture model (pure)", () => {
  it("declares exactly one requirement for every accepted asset/scene pairing", () => {
    for (const asset of ASSET_FIXTURES) {
      for (const sceneId of asset.sceneIds) {
        const matches = SCENE_REQUIREMENTS.filter(
          (entry) => entry.assetId === asset.id && entry.sceneId === sceneId,
        );
        expect(matches, `${asset.id} in ${sceneId}`).toHaveLength(1);
        expect(matches[0]!.plannedName).toBe(asset.name);
        expect(matches[0]!.category).toBe(asset.category);
      }
    }
    // The only record-less entry is the deliberate missing shelf dressing.
    const recordLess = SCENE_REQUIREMENTS.filter(
      (entry) => entry.assetId === null,
    );
    expect(recordLess).toHaveLength(1);
    expect(recordLess[0]!.readiness).toBe("missing");
    // Every shipped entry resolves cleanly — no unavailable rows in the demo.
    for (const entry of SCENE_REQUIREMENTS)
      expect(resolveSceneRequirement(entry).unavailableReason).toBeNull();
  });

  it("keeps Required/Optional necessity independent from cross-scene reuse", () => {
    for (const necessity of ["required", "optional"] as const) {
      const entries = SCENE_REQUIREMENTS.filter(
        (entry) => entry.necessity === necessity,
      );
      expect(
        new Set(entries.map((entry) => entry.sceneId)).size,
        `${necessity} scene coverage`,
      ).toBeGreaterThanOrEqual(3);
      expect(
        new Set(entries.map((entry) => entry.category)).size,
        `${necessity} category coverage`,
      ).toBeGreaterThanOrEqual(2);
    }
    const sceneFiveOllo = resolveSceneRequirement(
      SCENE_REQUIREMENTS.find((entry) => entry.id === "req-s5-ollo")!,
    );
    expect(sceneFiveOllo.entry.necessity).toBe("required");
    expect(sceneFiveOllo.reusable).toBe(true);

    const berry = resolveSceneRequirement(
      SCENE_REQUIREMENTS.find((entry) => entry.id === "req-s3-berry-trail")!,
    );
    expect(berry.entry.necessity).toBe("required");
    expect(berry.reusable).toBe(false);
  });

  it("covers all five readiness states with exact blocker or ready explanations", () => {
    expect(new Set(SCENE_REQUIREMENTS.map((entry) => entry.readiness))).toEqual(
      new Set([
        "missing",
        "candidate",
        "needs-preparation",
        "needs-review",
        "ready",
      ]),
    );
    for (const entry of SCENE_REQUIREMENTS) {
      if (entry.readiness === "ready") {
        expect(entry.blocker, entry.id).toBeNull();
        expect(entry.readyExplanation, entry.id).toContain(
          "Local planning checklist complete",
        );
        const asset = ASSET_FIXTURES.find(
          (candidate) => candidate.id === entry.assetId,
        )!;
        // Ready is only meaningful for a described local record.
        expect(asset.readiness, entry.id).toBe("described");
      } else {
        expect(entry.readyExplanation, entry.id).toBeNull();
        expect((entry.blocker ?? "").length, entry.id).toBeGreaterThan(20);
      }
      if (entry.readiness === "missing") {
        const asset = entry.assetId
          ? ASSET_FIXTURES.find((candidate) => candidate.id === entry.assetId)!
          : null;
        expect(
          asset === null || asset.readiness === "record-only",
          entry.id,
        ).toBe(true);
      }
      expect(entry.sourceTruth).toContain("not derived from script text");
      expect(
        entry.nextPreparation.unavailableReason.startsWith("Unavailable"),
      ).toBe(true);
    }
  });
});

describe("F4-WP2 — fail-closed resolution (pure)", () => {
  const ready = SCENE_REQUIREMENTS.find((entry) => entry.id === "req-s1-ollo")!;
  const dot = SCENE_REQUIREMENTS.find((entry) => entry.id === "req-s3-dot")!;
  const nook = SCENE_REQUIREMENTS.find(
    (entry) => entry.id === "req-s1-home-nook",
  )!;
  const shelf = SCENE_REQUIREMENTS.find(
    (entry) => entry.id === "req-s1-story-shelf",
  )!;
  const cases: Array<[string, SceneRequirementFixture, string]> = [
    [
      "unknown record reference",
      { ...ready, id: "bad-unknown", assetId: "char-nobody" },
      "Unknown local record reference",
    ],
    [
      "stale category reference",
      { ...ready, id: "bad-category", category: "props" },
      "category no longer matches",
    ],
    [
      "stale scene reference",
      { ...nook, id: "bad-scene", sceneId: "scene-2" },
      "no longer scoped to this scene",
    ],
    [
      "unknown scene identity",
      { ...shelf, id: "bad-unknown-scene", sceneId: "scene-404" },
      "Unknown scene reference",
    ],
    [
      "stale planned name",
      { ...ready, id: "bad-name", plannedName: "Not Ollo" },
      "name no longer matches",
    ],
    [
      "unbounded source truth",
      { ...ready, id: "bad-source", sourceTruth: "Automatically inferred" },
      "source truth must match",
    ],
    [
      "unbounded next action",
      {
        ...ready,
        id: "bad-action",
        nextPreparation: {
          action: "Generate now",
          unavailableReason: "Available",
        },
      },
      "next preparation action",
    ],
    [
      "ready claim on a name-only record",
      {
        ...dot,
        id: "bad-ready",
        readiness: "ready",
        blocker: null,
        readyExplanation:
          "Local planning checklist complete for this scene: fabricated.",
      },
      "described local record",
    ],
    [
      "record-less non-missing entry",
      {
        ...ready,
        id: "bad-recordless",
        assetId: null,
        readiness: "candidate",
        blocker:
          "A labelled local candidate record exists, but it remains unreviewed and no artifact exists.",
        readyExplanation: null,
      },
      "can only be missing",
    ],
    [
      "ready with a contradictory blocker",
      { ...ready, id: "bad-blocked-ready", blocker: "contradiction" },
      "no blocker",
    ],
    [
      "non-ready without an exact blocker",
      {
        ...ready,
        id: "bad-blockerless",
        readiness: "candidate",
        blocker: null,
        readyExplanation: null,
      },
      "exact blocker",
    ],
    [
      "missing claim on a described record",
      {
        ...ready,
        id: "bad-missing",
        readiness: "missing",
        blocker:
          "Only a name is recorded — no candidate or reference record sufficient for the next local planning step exists.",
        readyExplanation: null,
      },
      "name-only record",
    ],
  ];

  it("fails invalid or stale references closed into explicit unavailable entries", () => {
    for (const [name, entry, fragment] of cases) {
      const resolved = resolveSceneRequirement(entry);
      expect(resolved.unavailableReason, name).not.toBeNull();
      expect(resolved.unavailableReason, name).toContain(fragment);
    }
  });

  it("preserves a known record identity when its requirement fails closed", () => {
    const resolved = resolveSceneRequirement({
      ...ready,
      id: "bad-known-category",
      category: "props",
    });
    expect(resolved.unavailableReason).toContain("category no longer matches");
    expect(resolved.asset?.id).toBe("char-ollo");
    expect(resolved.reusable).toBe(true);
  });

  it("rejects a record moved outside the requirement scene's episode", () => {
    const movedAssets = ASSET_FIXTURES.map((asset) =>
      asset.id === "char-ollo" ? { ...asset, episodeId: "episode-stale" } : asset,
    );
    const resolved = resolveSceneRequirement(ready, movedAssets);
    expect(resolved.unavailableReason).toContain(
      "episode no longer contains this requirement scene",
    );
    expect(resolved.asset?.id).toBe("char-ollo");
  });

  it("counts every displayed unavailable row but never counts one as ready or as a necessity", () => {
    const resolved = [
      ...resolveScopeRequirements(ALL_SCENES),
      ...cases.map(([, entry]) => resolveSceneRequirement(entry)),
    ];
    const counts = countRequirements(resolved);
    expect(counts.unavailable).toBe(cases.length);
    // The genuine episode numbers are unchanged by the invalid additions.
    expect(counts.ready).toBe(7);
    const valid = countRequirements(resolveScopeRequirements(ALL_SCENES));
    expect(counts.required).toBe(valid.required);
    expect(counts.optional).toBe(valid.optional);
    expect(counts.total).toBe(37 + cases.length);
  });
});

describe("F4-WP2 — scope counts and labels (pure)", () => {
  it("fails unknown episode and invalid episode/scene scopes closed", () => {
    const unknownEpisode = resolveScopeRequirements({
      episodeId: "episode-404",
      sceneId: SCOPE_ALL,
    });
    const mismatchedScene = resolveScopeRequirements({
      episodeId: "episode-1",
      sceneId: "scene-404",
    });
    expect(unknownEpisode).toEqual([]);
    expect(mismatchedScene).toEqual([]);
    expect(countRequirements(unknownEpisode).ready).toBe(0);
    expect(
      requirementScopeLabel({
        episodeId: "episode-404",
        sceneId: SCOPE_ALL,
      }),
    ).toBe("Unavailable episode scope · episode-404");
    expect(
      requirementScopeLabel({
        episodeId: "episode-1",
        sceneId: "scene-404",
      }),
    ).toBe("Unavailable scene scope · scene-404");
  });

  it("derives episode aggregates mechanically from the same records", () => {
    const episode = countRequirements(resolveScopeRequirements(ALL_SCENES));
    expect(episode).toEqual({
      total: 37,
      required: 33,
      optional: 4,
      reusable: 34,
      missing: 3,
      candidate: 5,
      needsPreparation: 15,
      needsReview: 7,
      ready: 7,
      unavailable: 0,
    });
    // The episode aggregate is exactly the sum of the per-scene counts —
    // one derivation, never a separate hand-maintained total.
    const perScene = OLLO_DEMO_SCENES.map((scene) =>
      countRequirements(
        resolveScopeRequirements({ episodeId: SCOPE_ALL, sceneId: scene.id }),
      ),
    );
    const sum = perScene.reduce((acc, counts) => ({
      total: acc.total + counts.total,
      required: acc.required + counts.required,
      optional: acc.optional + counts.optional,
      reusable: acc.reusable + counts.reusable,
      missing: acc.missing + counts.missing,
      candidate: acc.candidate + counts.candidate,
      needsPreparation: acc.needsPreparation + counts.needsPreparation,
      needsReview: acc.needsReview + counts.needsReview,
      ready: acc.ready + counts.ready,
      unavailable: acc.unavailable + counts.unavailable,
    }));
    expect(sum).toEqual(episode);
    // Scene 3 · Berry Patch is the partial state with all five states.
    expect(perScene[2]).toEqual({
      total: 6,
      required: 5,
      optional: 1,
      reusable: 5,
      missing: 1,
      candidate: 2,
      needsPreparation: 1,
      needsReview: 1,
      ready: 1,
      unavailable: 0,
    });
    // Scene 4 · Little Stream is the blocked state: nothing ready.
    expect(perScene[3]!.ready).toBe(0);
    expect(perScene[3]!.total).toBe(4);
  });

  it("labels scene and episode scope so an aggregate cannot hide scene scope", () => {
    expect(requirementScopeLabel(ALL_SCENES)).toBe(
      "Episode 1 · The Storylight in the Little Wood · All scenes",
    );
    expect(
      requirementScopeLabel({ episodeId: SCOPE_ALL, sceneId: "scene-3" }),
    ).toBe("Scene 3 · Berry Patch");
    expect(requirementSceneLabel("scene-8")).toBe("Scene 8 · Back Home");
    expect(findSceneRequirement("char-dot", "scene-7")?.necessity).toBe(
      "optional",
    );
    expect(findSceneRequirement("char-dot", "scene-1")).toBeUndefined();
  });
});

describe("F4-WP2 — episode summary and scene states (UI)", () => {
  it("discloses episode scope beside every aggregate and never masquerades as a scene result", () => {
    render(<AssetWorkspace />);
    expect(requirementsRegion().querySelector("h2")?.textContent).toBe(
      "Episode 1 · The Storylight in the Little Wood · All scenes",
    );
    const note =
      requirementsRegion().querySelector(".pv1-requirements-scope-note")
        ?.textContent ?? "";
    expect(note).toContain("Episode-scope summary");
    expect(note).toContain("not a selected-scene result");
    expect(note).toContain("37 records");
    expect(requirementCountsText()).toContain(
      "Required 33 · Optional 4 · Reusable 34",
    );
    expect(requirementCountsText()).toContain(
      "Ready 7 · Candidate 5 · Missing 3 · Needs preparation 15 · Needs review 7",
    );
    // Counts derive from the same records the list renders.
    expect(requirementRows()).toHaveLength(37);
    // Every visible requirement identifies record, category, class, readiness,
    // scene scope, reason, source truth, and the next honest action.
    for (const row of requirementRows()) {
      expect(row.querySelector("strong")?.textContent?.length).toBeGreaterThan(
        0,
      );
      const meta = row.querySelector("small")?.textContent ?? "";
      expect(meta).toMatch(
        /· (Required|Optional)(?: · Reusable)? · (Missing|Candidate|Needs preparation|Needs review|Ready) · Scene [1-8] · /,
      );
      expect(
        row.querySelector(".pv1-requirement-reason")?.textContent?.length,
      ).toBeGreaterThan(20);
      expect(
        row.querySelector(".pv1-requirement-source")?.textContent,
      ).toContain("not derived from script text");
      expect(
        row.querySelector(".pv1-requirement-actions button[disabled]"),
      ).not.toBeNull();
    }
  });

  it("shows scene-scoped partial truth with all five readiness states in Scene 3", async () => {
    const user = userEvent.setup();
    render(<AssetWorkspace />);
    await selectScene(user, "scene-3");
    expect(requirementsRegion().querySelector("h2")?.textContent).toBe(
      "Scene 3 · Berry Patch",
    );
    const note =
      requirementsRegion().querySelector(".pv1-requirements-scope-note")
        ?.textContent ?? "";
    expect(note).toContain("Scene-scoped planning truth");
    expect(note).toContain("Scene 3 · Berry Patch");
    expect(requirementCountsText()).toContain(
      "Required 5 · Optional 1 · Reusable 5",
    );
    expect(requirementCountsText()).toContain(
      "Ready 1 · Candidate 2 · Missing 1 · Needs preparation 1 · Needs review 1",
    );
    expect(requirementRows()).toHaveLength(6);
    expect(
      requirementsRegion().querySelector(".pv1-requirement-ready-note")
        ?.textContent,
    ).toBe(READY_LOCAL_RECORD_DISCLAIMER);
    const metas = requirementRows().map(
      (row) => row.querySelector("small")?.textContent ?? "",
    );
    for (const state of [
      "Missing",
      "Candidate",
      "Needs preparation",
      "Needs review",
      "Ready",
    ])
      expect(metas.some((meta) => meta.includes(`· ${state}`))).toBe(true);
    // The missing record explains its exact blocker readably.
    expect(rowFor("Dot").textContent).toContain(
      "Only a name is recorded — no candidate or reference record sufficient",
    );
  });

  it("shows the blocked Scene 4 state with zero ready and a readable reason per record", async () => {
    const user = userEvent.setup();
    render(<AssetWorkspace />);
    await selectScene(user, "scene-4");
    expect(requirementsRegion().querySelector("h2")?.textContent).toBe(
      "Scene 4 · Little Stream",
    );
    expect(requirementCountsText()).toContain("Ready 0 ·");
    expect(requirementRows()).toHaveLength(4);
    for (const row of requirementRows()) {
      const meta = row.querySelector("small")?.textContent ?? "";
      expect(meta).not.toContain("· Ready");
      expect(
        row.querySelector(".pv1-requirement-reason")?.textContent?.length,
      ).toBeGreaterThan(20);
    }
    expect(rowFor("Ollo").textContent).toContain(
      "enough descriptive information for a later review, but no review or approval has occurred",
    );
  });

  it("shows the Scene 1 ready-local-record state with its adjacent disclaimer and an honest record-less missing row", async () => {
    const user = userEvent.setup();
    render(<AssetWorkspace />);
    await selectScene(user, "scene-1");
    const olloRow = rowFor("Ollo");
    expect(olloRow.querySelector("small")?.textContent).toContain("· Ready");
    expect(
      olloRow.querySelector(".pv1-requirement-reason")?.textContent,
    ).toContain(READY_LOCAL_RECORD_DISCLAIMER);
    // The missing shelf dressing has no record to open and says so.
    const shelfRow = rowFor("Unfinished-stories shelf dressing");
    expect(shelfRow.querySelector("small")?.textContent).toContain("· Missing");
    expect(
      within(shelfRow).queryByRole("button", { name: "Open record" }),
    ).toBeNull();
    expect(shelfRow.textContent).toContain("No local record exists to open.");
    const createAction = within(shelfRow).getByRole("button", {
      name: "Create local candidate record",
    });
    expect((createAction as HTMLButtonElement).disabled).toBe(true);
    expect(shelfRow.textContent).toContain(
      "Unavailable — asset creation, import, and generation do not exist in this demo.",
    );
  });

  it("keeps scene requirement truth visible when the record list is an honest empty scope", async () => {
    const user = userEvent.setup();
    render(<AssetWorkspace />);
    await user.click(
      within(categoriesNav()).getByRole("button", { name: "Props" }),
    );
    await selectScene(user, "scene-2");
    expect(
      within(assetList()).getByText(/No props records are scoped to/),
    ).toBeTruthy();
    // The requirements region is scene-scope driven, not category filtered:
    // Scene 2 still exposes its four requirement records and counts.
    expect(requirementsRegion().querySelector("h2")?.textContent).toBe(
      "Scene 2 · Forest Path",
    );
    expect(requirementRows()).toHaveLength(4);
    expect(requirementCountsText()).toContain(
      "Ready 1 · Candidate 1 · Missing 0 · Needs preparation 1 · Needs review 1",
    );
  });
});

describe("F4-WP2 — synchronization and the open-record path (UI)", () => {
  it("keeps rejected requirement identity synchronized into explicit unavailable detail", async () => {
    const user = userEvent.setup();
    const ready = SCENE_REQUIREMENTS.find(
      (entry) => entry.id === "req-s1-ollo",
    )!;
    render(
      <AssetWorkspace
        requirementFixtures={[
          { ...ready, id: "bad-ui-category", category: "props" },
        ]}
      />,
    );
    await selectScene(user, "scene-1");
    expect(rowFor("Ollo").textContent).toContain(
      "Unavailable — Stale fixture reference",
    );
    expect(sceneRequirementDetail()).toContain(
      "Unavailable —Stale fixture reference: the record's category no longer matches this requirement.",
    );
    expect(sceneRequirementDetail()).not.toContain(
      "No requirement record exists",
    );
  });

  it("synchronizes category, list, detail, and requirement row on Open record in scene scope", async () => {
    const user = userEvent.setup();
    render(<AssetWorkspace />);
    await selectScene(user, "scene-3");
    const berryRow = rowFor("Dropped berry trail");
    await user.click(
      within(berryRow).getByRole("button", {
        name: /Open Dropped berry trail record for Scene 3/,
      }),
    );
    expect(
      within(categoriesNav())
        .getByRole("button", { name: "Props" })
        .getAttribute("aria-current"),
    ).toBe("true");
    const selected = within(assetList())
      .getAllByRole("button")
      .find((button) => button.getAttribute("aria-current") === "true");
    expect(selected?.textContent).toContain("Dropped berry trail");
    expect(
      within(assetDetail()).getByRole("heading", {
        name: "Dropped berry trail",
      }),
    ).toBeTruthy();
    expect(sceneRequirementDetail()).toContain(
      "Required · Candidate in Scene 3 · Berry Patch",
    );
    expect(sceneRequirementDetail()).toContain(
      "A labelled local candidate record exists, but it remains unreviewed",
    );
    // The open row carries current semantics beyond color.
    expect(
      within(berryRow)
        .getByRole("button", {
          name: /Open Dropped berry trail record for Scene 3/,
        })
        .getAttribute("aria-current"),
    ).toBe("true");
    expect(berryRow.classList.contains("is-open")).toBe(true);
  });

  it("provides a direct path from the episode summary to a contributing record", async () => {
    const user = userEvent.setup();
    render(<AssetWorkspace />);
    const lanternRow = rowFor("Lantern Bridge set", "Scene 5 · Lantern Bridge");
    await user.click(
      within(lanternRow).getByRole("button", {
        name: /Open Lantern Bridge set record for Scene 5/,
      }),
    );
    expect(
      (
        screen.getByRole("combobox", {
          name: "Scene filter",
        }) as HTMLSelectElement
      ).value,
    ).toBe("scene-5");
    expect(requirementsRegion().querySelector("h2")?.textContent).toBe(
      "Scene 5 · Lantern Bridge",
    );
    expect(
      within(categoriesNav())
        .getByRole("button", { name: "Layered Sets" })
        .getAttribute("aria-current"),
    ).toBe("true");
    expect(
      within(assetDetail()).getByRole("heading", {
        name: "Lantern Bridge set",
      }),
    ).toBeTruthy();
    expect(sceneRequirementDetail()).toContain(
      "Required · Needs preparation in Scene 5 · Lantern Bridge",
    );
  });

  it("keeps counts, rows, and detail synchronized across every scene change", async () => {
    const user = userEvent.setup();
    render(<AssetWorkspace />);
    for (const scene of OLLO_DEMO_SCENES) {
      await selectScene(user, scene.id);
      const counts = countRequirements(
        resolveScopeRequirements({ episodeId: SCOPE_ALL, sceneId: scene.id }),
      );
      expect(requirementCountsText()).toContain(
        `Required ${counts.required} · Optional ${counts.optional} · Reusable ${counts.reusable}`,
      );
      expect(requirementCountsText()).toContain(
        `Ready ${counts.ready} · Candidate ${counts.candidate} · Missing ${counts.missing} · Needs preparation ${counts.needsPreparation} · Needs review ${counts.needsReview}`,
      );
      expect(requirementRows()).toHaveLength(counts.total);
      expect(requirementsRegion().querySelector("h2")?.textContent).toBe(
        requirementSceneLabel(scene.id),
      );
    }
  });

  it("updates the detail scene requirement with the selected scene, never retaining stale truth", async () => {
    const user = userEvent.setup();
    render(<AssetWorkspace />);
    await selectScene(user, "scene-3");
    await user.click(within(assetList()).getByRole("button", { name: /Dot/ }));
    expect(sceneRequirementDetail()).toContain(
      "Required · Reusable · Missing in Scene 3 · Berry Patch",
    );
    await selectScene(user, "scene-7");
    // Dot is still visible in Scene 7, so the selection survives — with the
    // new scene's requirement truth, not the stale Scene 3 one.
    expect(
      within(assetDetail()).getByRole("heading", { name: "Dot" }),
    ).toBeTruthy();
    expect(sceneRequirementDetail()).toContain(
      "Optional · Reusable · Missing in Scene 7 · Sunflower Field",
    );
    expect(sceneRequirementDetail()).not.toContain("Berry Patch");
    expect(requirementRows()).toHaveLength(5);
  });
});

describe("F4-WP2 — truth boundaries (UI)", () => {
  it("keeps every preparation action disabled with its reason and reports no success anywhere", () => {
    render(<AssetWorkspace />);
    const region = requirementsRegion();
    const buttons = [...region.querySelectorAll("button")];
    const openButtons = buttons.filter((button) =>
      button.classList.contains("pv1-requirement-open"),
    );
    const preparationButtons = buttons.filter(
      (button) => !button.classList.contains("pv1-requirement-open"),
    );
    expect(openButtons).toHaveLength(36);
    expect(preparationButtons).toHaveLength(37);
    for (const button of preparationButtons)
      expect((button as HTMLButtonElement).disabled).toBe(true);
    for (const button of openButtons)
      expect((button as HTMLButtonElement).disabled).toBe(false);
    const workspaceText = screen.getByTestId("pv1-assets").textContent ?? "";
    expect(workspaceText).not.toMatch(
      /successfully|artifact created|has been (generated|imported|approved|rigged)|production-ready/i,
    );
  });

  it("never shows a Ready label without its adjacent local-record disclaimer", () => {
    render(<AssetWorkspace />);
    for (const row of requirementRows()) {
      const meta = row.querySelector("small")?.textContent ?? "";
      const reason =
        row.querySelector(".pv1-requirement-reason")?.textContent ?? "";
      if (meta.includes("· Ready")) {
        expect(reason).toContain(READY_LOCAL_RECORD_DISCLAIMER);
      } else {
        expect(reason).not.toContain(READY_LOCAL_RECORD_DISCLAIMER);
      }
    }
    // The episode summary repeats the disclaimer beside its aggregate.
    expect(
      requirementsRegion().querySelector(".pv1-requirement-ready-note")
        ?.textContent,
    ).toBe(READY_LOCAL_RECORD_DISCLAIMER);
  });
});

describe("F4-WP2 — Studio integration", () => {
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

  it("exposes scene requirements inside Assets & Rigs without touching the accepted scene/beat scope", async () => {
    const user = userEvent.setup();
    render(<StudioHarness />);
    const studio = screen.getByTestId("pv1-studio");
    await user.click(
      within(
        within(studio).getByRole("navigation", { name: "Studio workspace" }),
      ).getByRole("button", { name: "Assets & Rigs" }),
    );
    expect(requirementsRegion()).toBeTruthy();
    expect(requirementsRegion().querySelector("h2")?.textContent).toBe(
      "Episode 1 · The Storylight in the Little Wood · All scenes",
    );
    const scopeHeader = within(studio).getByRole("navigation", {
      name: "Current scope",
    });
    expect(scopeHeader.textContent).toContain("Scene 1 · The Home Nook");
    expect(scopeHeader.textContent).toContain(
      "Beat 1 · Morning light through the round window",
    );
  });
});
