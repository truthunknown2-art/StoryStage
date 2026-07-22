import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { AssetWorkspace } from "./AssetWorkspace";
import {
  SCENE_REQUIREMENTS,
  resolveSceneRequirement,
} from "./asset-requirements";
import { CONFIRMED_CANDIDATE_TRUTH } from "./asset-import";
import {
  DECLARED_METADATA_TRUTH,
  FIXTURE_SOURCE_TRUTH,
  FUTURE_WORKFLOW_TRUTH,
  KNOWN_EXPRESSIONS,
  KNOWN_VISEMES,
  NO_REVIEW_EXAMPLE_REASON,
  REVIEW_FIXTURES,
  REVIEW_READY_TRUTH,
  REVIEW_STATE_DISCLAIMER,
  SUPPORTED_PROFILES,
  knownDemoCandidateIds,
  resolveReviewFixture,
  resolveReviewList,
  reviewEligibility,
  reviewFixturesFor,
  type CharacterRigDeclaration,
  type LayeredSetDeclaration,
  type ReviewFixture,
} from "./asset-review";

afterEach(() => {
  cleanup();
});

const requirementsRegion = () => screen.getByTestId("pv1-requirements");

const requirementCountsText = () =>
  requirementsRegion().querySelector(".pv1-requirement-counts")?.textContent ??
  "";

const reviewPanel = () => screen.getByTestId("pv1-review");

const selectScene = async (
  user: ReturnType<typeof userEvent.setup>,
  sceneId: string,
) => {
  await user.selectOptions(
    screen.getByRole("combobox", { name: "Scene filter" }),
    sceneId,
  );
};

const itemFor = (requirementId: string) =>
  resolveSceneRequirement(
    SCENE_REQUIREMENTS.find((entry) => entry.id === requirementId)!,
  );

const fixtureFor = (fixtureId: string) =>
  REVIEW_FIXTURES.find((fixture) => fixture.id === fixtureId)!;

const OLLO_READY = fixtureFor("review-req-s1-ollo-review-ready");
const SET_READY = fixtureFor("review-req-s1-home-nook-review-ready");

/** Clone a shipped character/rig fixture and apply one declaration
 * mutation, for fail-closed and derivation cases. */
const mutateCharacterRig = (
  fixture: ReviewFixture,
  mutate: (declaration: CharacterRigDeclaration) => CharacterRigDeclaration,
): ReviewFixture => {
  const clone = structuredClone(fixture);
  clone.declaration = mutate(clone.declaration as CharacterRigDeclaration);
  return clone;
};

const mutateLayeredSet = (
  fixture: ReviewFixture,
  mutate: (declaration: LayeredSetDeclaration) => LayeredSetDeclaration,
): ReviewFixture => {
  const clone = structuredClone(fixture);
  clone.declaration = mutate(clone.declaration as LayeredSetDeclaration);
  return clone;
};

describe("F4-WP4 — review fixture model (pure)", () => {
  it("binds every shipped fixture to an exact known requirement, scene, category, and declared candidate identity", () => {
    expect(REVIEW_FIXTURES).toHaveLength(11);
    for (const fixture of REVIEW_FIXTURES) {
      const requirement = SCENE_REQUIREMENTS.find(
        (entry) => entry.id === fixture.requirementId,
      );
      expect(requirement, fixture.id).toBeTruthy();
      expect(fixture.sceneId, fixture.id).toBe(requirement!.sceneId);
      expect(
        knownDemoCandidateIds(fixture.requirementId),
        fixture.id,
      ).toContain(fixture.candidateId);
      if (fixture.declaration.kind === "character-rig")
        expect(["characters", "rigs"], fixture.id).toContain(
          requirement!.category,
        );
      else expect(requirement!.category, fixture.id).toBe("layered-sets");
    }
  });

  it("resolves every shipped fixture cleanly with a mechanically derived state that matches its declared example label", () => {
    for (const fixture of REVIEW_FIXTURES) {
      const resolved = resolveReviewFixture(
        fixture,
        itemFor(fixture.requirementId),
      );
      expect(resolved.unavailableReason, fixture.id).toBeNull();
      /* The example label is honest: the derived state matches it exactly. */
      expect(resolved.state, fixture.id).toBe(fixture.example);
      expect(resolved.candidate?.provenance, fixture.id).toBe("fixture");
    }
    /* All three states are explicitly labelled for characters, rigs, and
     * layered sets. */
    for (const [kind, category] of [
      ["character-rig", "characters"],
      ["character-rig", "rigs"],
      ["layered-set", "layered-sets"],
    ] as const) {
      const examples = new Set(
        REVIEW_FIXTURES.filter(
          (fixture) =>
            fixture.declaration.kind === kind &&
            SCENE_REQUIREMENTS.find(
              (entry) => entry.id === fixture.requirementId,
            )!.category === category,
        ).map((fixture) => fixture.example),
      );
      expect(examples, `${kind}/${category}`).toEqual(
        new Set(["incomplete", "needs-correction", "review-ready"]),
      );
    }
  });

  it("derives Review-ready only from complete declarations with zero contradictions, and shows every required section fact", () => {
    const resolved = resolveReviewFixture(OLLO_READY, itemFor("req-s1-ollo"));
    if (resolved.kind !== "character-rig") throw new Error("wrong kind");
    expect(resolved.state).toBe("review-ready");
    expect(resolved.contradictions).toHaveLength(0);
    expect(resolved.missing).toHaveLength(0);
    expect(resolved.viewStatus).toEqual([
      { view: "Front view", declared: true },
      { view: "Three-quarter view", declared: true },
      { view: "Side view", declared: true },
    ]);
    expect(resolved.parts).toHaveLength(4);
    expect(resolved.requiredPartStatus.every((entry) => entry.declared)).toBe(
      true,
    );
    expect(resolved.requiredMaskStatus).toEqual([
      { maskId: "mask-face-alpha", declared: true },
    ]);
    expect(resolved.profileStatus).toEqual(
      SUPPORTED_PROFILES.map((profile) => ({ profile, declared: true })),
    );
    expect(resolved.expressions.length).toBeGreaterThan(0);
    expect(resolved.visemes.length).toBeGreaterThan(0);
    expect(
      resolved.checklist.every((row) => row.pass && !row.contradictory),
    ).toBe(true);
  });

  it("derives the Dot needs-correction example with one exact readable contradiction", () => {
    const resolved = resolveReviewFixture(
      fixtureFor("review-req-s3-dot-needs-correction"),
      itemFor("req-s3-dot"),
    );
    expect(resolved.state).toBe("needs-correction");
    expect(resolved.contradictions).toEqual([
      'Checklist "All required turnaround views declared" is marked passing, but the declaration is incomplete: Side view is not declared.',
    ]);
    const turnaround = resolved.checklist.find(
      (row) => row.id === "turnaround-coverage",
    )!;
    expect(turnaround.pass).toBe(false);
    expect(turnaround.contradictory).toBe(true);
  });

  it("lets conflicting facts outrank completeness: contradiction plus missing facts still yields Needs correction", () => {
    const fixture = mutateCharacterRig(
      fixtureFor("review-req-s1-ollo-needs-correction"),
      (declaration) => ({ ...declaration, expressions: [], visemes: [] }),
    );
    const resolved = resolveReviewFixture(fixture, itemFor("req-s1-ollo"));
    expect(resolved.state).toBe("needs-correction");
    expect(resolved.contradictions.length).toBeGreaterThan(0);
    expect(resolved.missing).toContain("No expressions are declared.");
  });

  it("derives Incomplete with the exact missing-declaration list and blocked checklist reasons", () => {
    const resolved = resolveReviewFixture(
      fixtureFor("review-req-s5-lantern-bridge-incomplete"),
      itemFor("req-s5-lantern-bridge"),
    );
    if (resolved.kind !== "layered-set") throw new Error("wrong kind");
    expect(resolved.state).toBe("incomplete");
    expect(resolved.contradictions).toHaveLength(0);
    expect(resolved.missing).toEqual([
      "Planes not declared: foreground.",
      "No foreground occluders are declared.",
    ]);
    expect(resolved.planeCoverage).toEqual([
      { plane: "background", declared: true },
      { plane: "midground", declared: true },
      { plane: "foreground", declared: false },
    ]);
    expect(
      resolved.orderedPlanes.map((plane) => plane.order),
    ).toEqual([1, 2]);
    expect(resolved.checklist.every((row) => !row.pass)).toBe(true);
    for (const row of resolved.checklist)
      expect(row.blockReason, row.id).not.toBeNull();
  });

  it("keeps session-local candidate source/rights truth when a confirmed record carries the declared identity", () => {
    const sessionRecord = {
      id: "cand-req-s3-dot-sheet",
      requirementId: "req-s3-dot",
      sceneId: "scene-3",
      name: "Dot view sheet",
      declaredFormat: "png",
      source: "Painted in my own tool",
      license: "I own the result",
      referenceLabel: "ref",
      coveredViews: [],
      truth: CONFIRMED_CANDIDATE_TRUTH,
    };
    const resolved = resolveReviewFixture(
      fixtureFor("review-req-s3-dot-needs-correction"),
      itemFor("req-s3-dot"),
      [sessionRecord],
    );
    expect(resolved.candidate?.provenance).toBe("session-record");
    expect(resolved.candidate?.source).toBe("Painted in my own tool");
    expect(resolved.candidate?.license).toBe("I own the result");
    /* A record for another requirement never binds. */
    const foreign = resolveReviewFixture(
      fixtureFor("review-req-s3-dot-needs-correction"),
      itemFor("req-s3-dot"),
      [{ ...sessionRecord, requirementId: "req-s1-ollo" }],
    );
    expect(foreign.candidate?.provenance).toBe("fixture");
  });

  it("fails closed for every listed identity and structural defect class", () => {
    const ollo = itemFor("req-s1-ollo");
    const cases: Array<[string, ReviewFixture, string]> = [
      [
        "unknown requirement identity",
        { ...structuredClone(OLLO_READY), requirementId: "req-nope" },
        "Unknown requirement identity",
      ],
      [
        "stale scene association",
        { ...structuredClone(OLLO_READY), sceneId: "scene-2" },
        "Stale scene association",
      ],
      [
        "unknown candidate identity",
        { ...structuredClone(OLLO_READY), candidateId: "cand-elsewhere" },
        "Unknown candidate identity",
      ],
      [
        "mismatched category",
        {
          ...structuredClone(OLLO_READY),
          requirementId: "req-s1-little-wood",
          sceneId: "scene-1",
          candidateId: "cand-req-s1-little-wood-sheet",
        },
        "Mismatched category",
      ],
      [
        "unknown turnaround view",
        mutateCharacterRig(OLLO_READY, (declaration) => ({
          ...declaration,
          turnaroundViews: ["Front view", "Back view"],
        })),
        "Unknown turnaround view",
      ],
      [
        "duplicate part identity",
        mutateCharacterRig(OLLO_READY, (declaration) => ({
          ...declaration,
          parts: [declaration.parts[0]!, declaration.parts[0]!],
        })),
        "Duplicate required identity",
      ],
      [
        "missing padded bounds",
        mutateCharacterRig(OLLO_READY, (declaration) => ({
          ...declaration,
          parts: declaration.parts.map((part, index) =>
            index === 0 ? { ...part, bounds: null } : part,
          ),
        })),
        "Missing padded bounds declaration",
      ],
      [
        "invalid padded bounds",
        mutateCharacterRig(OLLO_READY, (declaration) => ({
          ...declaration,
          parts: declaration.parts.map((part, index) =>
            index === 0
              ? {
                  ...part,
                  bounds: { x: 0, y: 0, width: 0, height: 10, padding: 4 },
                }
              : part,
          ),
        })),
        "Invalid padded bounds declaration",
      ],
      [
        "non-finite pivot",
        mutateCharacterRig(OLLO_READY, (declaration) => ({
          ...declaration,
          parts: declaration.parts.map((part, index) =>
            index === 0
              ? { ...part, pivot: { x: Number.NaN, y: 0 } }
              : part,
          ),
        })),
        "Non-finite pivot declaration",
      ],
      [
        "out-of-bounds pivot",
        mutateCharacterRig(OLLO_READY, (declaration) => ({
          ...declaration,
          parts: declaration.parts.map((part, index) =>
            index === 0 ? { ...part, pivot: { x: 9999, y: 0 } } : part,
          ),
        })),
        "Out-of-bounds pivot declaration",
      ],
      [
        "missing mask declaration (required but absent)",
        mutateCharacterRig(OLLO_READY, (declaration) => ({
          ...declaration,
          masks: null,
        })),
        "Missing mask declaration",
      ],
      [
        "missing mask declaration (referenced but undeclared)",
        mutateCharacterRig(OLLO_READY, (declaration) => ({
          ...declaration,
          masks: [],
        })),
        "Missing mask declaration",
      ],
      [
        "unknown part identity (attachment parent)",
        mutateCharacterRig(OLLO_READY, (declaration) => ({
          ...declaration,
          parts: declaration.parts.map((part, index) =>
            index === 1
              ? {
                  ...part,
                  attachment: {
                    parentPartId: "ghost",
                    intent: part.attachment.intent,
                  },
                }
              : part,
          ),
        })),
        "Unknown part identity",
      ],
      [
        "invalid attachment intent (no root part)",
        mutateCharacterRig(OLLO_READY, (declaration) => ({
          ...declaration,
          parts: declaration.parts.map((part) => ({
            ...part,
            attachment: {
              parentPartId: declaration.parts[0]!.id,
              intent: part.attachment.intent,
            },
          })),
        })),
        "Invalid attachment intent",
      ],
      [
        "unsupported profile",
        mutateCharacterRig(OLLO_READY, (declaration) => ({
          ...declaration,
          supportedProfiles: ["Kids Adventure", "Cyberpunk Noir"],
        })),
        "Unsupported profile",
      ],
      [
        "unknown expression",
        mutateCharacterRig(OLLO_READY, (declaration) => ({
          ...declaration,
          expressions: ["ecstatic"],
        })),
        "Unknown expression",
      ],
      [
        "unknown viseme",
        mutateCharacterRig(OLLO_READY, (declaration) => ({
          ...declaration,
          visemes: ["zzz"],
        })),
        "Unknown viseme",
      ],
      [
        "contradictory checklist state (pass with a block reason)",
        mutateCharacterRig(OLLO_READY, (declaration) => ({
          ...declaration,
          checklist: declaration.checklist.map((entry, index) =>
            index === 0 ? { ...entry, blockReason: "leftover" } : entry,
          ),
        })),
        "Contradictory checklist state",
      ],
      [
        "contradictory checklist state (blocked without a reason)",
        mutateCharacterRig(OLLO_READY, (declaration) => ({
          ...declaration,
          checklist: declaration.checklist.map((entry, index) =>
            index === 0 ? { ...entry, pass: false } : entry,
          ),
        })),
        "Contradictory checklist state",
      ],
      [
        "unknown layered-set plane",
        mutateLayeredSet(SET_READY, (declaration) => ({
          ...declaration,
          planes: declaration.planes.map((plane, index) =>
            index === 0 ? { ...plane, plane: "skybox" } : plane,
          ),
        })),
        "Unknown layered-set plane",
      ],
      [
        "duplicate plane order",
        mutateLayeredSet(SET_READY, (declaration) => ({
          ...declaration,
          planes: declaration.planes.map((plane, index) =>
            index === 2 ? { ...plane, order: 1 } : plane,
          ),
        })),
        "Duplicate plane order",
      ],
      [
        "invalid foreground-occluder association (undeclared plane)",
        mutateLayeredSet(SET_READY, (declaration) => ({
          ...declaration,
          occluders: [
            {
              id: "occ-x",
              planeId: "plane-nope",
              subjectRelationship: "Frames Ollo.",
            },
          ],
        })),
        "Invalid foreground-occluder association",
      ],
      [
        "invalid foreground-occluder association (non-foreground plane)",
        mutateLayeredSet(SET_READY, (declaration) => ({
          ...declaration,
          occluders: [
            {
              id: "occ-x",
              planeId: "plane-nook-back",
              subjectRelationship: "Frames Ollo.",
            },
          ],
        })),
        "Invalid foreground-occluder association",
      ],
    ];
    for (const [name, fixture, prefix] of cases) {
      const item =
        fixture.requirementId === "req-nope"
          ? null
          : SCENE_REQUIREMENTS.some(
                (entry) => entry.id === fixture.requirementId,
              )
            ? itemFor(fixture.requirementId)
            : null;
      const resolved = resolveReviewFixture(
        fixture,
        item,
        [],
      );
      expect(resolved.unavailableReason, name).not.toBeNull();
      expect(
        resolved.unavailableReason!.startsWith(prefix),
        `${name}: ${resolved.unavailableReason}`,
      ).toBe(true);
      expect(resolved.unavailableReason, name).toContain("fails closed");
      expect(resolved.state, name).toBeNull();
    }
    /* An unavailable requirement can never host a review result. */
    const staleRequirement = {
      ...ollo,
      unavailableReason: "Stale fixture reference: test double.",
    };
    const propagated = resolveReviewFixture(OLLO_READY, staleRequirement);
    expect(propagated.unavailableReason).toContain("Unavailable requirement");
    /* Error copy never claims byte, pixel, or media inspection. */
    for (const [, fixture] of cases) {
      const item = SCENE_REQUIREMENTS.some(
        (entry) => entry.id === fixture.requirementId,
      )
        ? itemFor(fixture.requirementId)
        : null;
      const reason =
        resolveReviewFixture(fixture, item).unavailableReason ?? "";
      expect(reason).not.toMatch(/pixel|byte|bytes|decoded|sniff|inspect/i);
    }
  });

  it("fails closed on duplicate review-record identity within one requirement list", () => {
    const duplicated = [
      structuredClone(OLLO_READY),
      {
        ...structuredClone(
          fixtureFor("review-req-s1-ollo-incomplete"),
        ),
        id: OLLO_READY.id,
      },
    ];
    const resolved = resolveReviewList(itemFor("req-s1-ollo"), duplicated);
    expect(resolved).toHaveLength(2);
    for (const entry of resolved) {
      expect(entry.unavailableReason).toContain("Duplicate required identity");
      expect(entry.state).toBeNull();
    }
  });

  it("exposes the review action only for cleanly resolved character, rig, and layered-set requirements", () => {
    expect(reviewEligibility(itemFor("req-s1-ollo"))).toBe("eligible");
    expect(reviewEligibility(itemFor("req-s1-rig-ollo"))).toBe("eligible");
    expect(reviewEligibility(itemFor("req-s1-home-nook"))).toBe("eligible");
    expect(reviewEligibility(itemFor("req-s1-little-wood"))).toBe("omit");
    expect(reviewEligibility(itemFor("req-s3-berry-trail"))).toBe("omit");
    expect(
      reviewEligibility({
        ...itemFor("req-s1-ollo"),
        unavailableReason: "test double",
      }),
    ).toBe("requirement-unavailable");
    expect(reviewFixturesFor("req-s1-ollo")).toHaveLength(3);
    expect(reviewFixturesFor("req-s2-tix")).toHaveLength(0);
    for (const expression of KNOWN_EXPRESSIONS)
      expect(expression.length).toBeGreaterThan(1);
    for (const viseme of KNOWN_VISEMES) expect(viseme.length).toBeGreaterThan(0);
  });
});

describe("F4-WP4 — review UI", () => {
  it("exposes enabled review controls only where a declared example exists, a truthful disabled reason for eligible requirements without one, and no control for other categories", () => {
    render(<AssetWorkspace />);
    const region = requirementsRegion();
    const buttons = [...region.querySelectorAll("button")];
    const enabledReview = buttons.filter(
      (button) =>
        button.classList.contains("pv1-requirement-review") &&
        !(button as HTMLButtonElement).disabled,
    );
    expect(enabledReview).toHaveLength(5);
    const disabledReview = buttons.filter(
      (button) =>
        (button as HTMLButtonElement).disabled &&
        /Review (layers & rig|set layers)/.test(button.textContent ?? ""),
    );
    /* Eligible categories without a declared example: Ollo rows outside
     * Scene 1 (7), Tix rows (3), the Scene 7 Dot row, rig rows outside
     * Scene 1 (7), and the Scene 8 Home Nook row. */
    expect(disabledReview).toHaveLength(19);
    for (const button of disabledReview) {
      const reason = button.parentElement?.querySelector("span")?.textContent;
      expect(reason).toBe(NO_REVIEW_EXAMPLE_REASON);
    }
    /* Locations and props rows carry no review control at all. */
    const rows = [...region.querySelectorAll(".pv1-requirement-row")];
    const littleWood = rows.find((row) =>
      row.textContent?.includes("The Little Wood"),
    )!;
    const storylight = rows.find((row) =>
      row.textContent?.includes("The Storylight lantern"),
    )!;
    for (const row of [littleWood, storylight])
      expect(row.textContent).not.toMatch(/Review (layers & rig|set layers)/);
  });

  it("opens the character review with focus on its labelled heading and derives all three demo states without changing counts or readiness", async () => {
    const user = userEvent.setup();
    render(<AssetWorkspace />);
    await selectScene(user, "scene-1");
    const countsBefore = requirementCountsText();
    const olloRow = () => {
      const row = [
        ...requirementsRegion().querySelectorAll(".pv1-requirement-row"),
      ].find(
        (candidate) =>
          candidate.querySelector("strong")?.textContent === "Ollo",
      );
      return row!;
    };
    const readinessBefore = olloRow().querySelector("small")?.textContent;

    const invoker = screen.getByRole("button", {
      name: "Review layers & rig for Ollo in Scene 1 · The Home Nook",
    });
    await user.click(invoker);

    const panel = reviewPanel();
    expect(panel).toBeTruthy();
    /* Opening moves focus into the labelled review heading. */
    const heading = panel.querySelector("h3")!;
    expect(heading.textContent).toBe("Ollo");
    expect(document.activeElement).toBe(heading);
    expect(invoker.getAttribute("aria-expanded")).toBe("true");

    /* Default declared example: Incomplete with readable missing reasons. */
    expect(panel.textContent).toContain("Incomplete");
    expect(panel.textContent).toContain(
      "Before this declaration could be review-ready",
    );
    expect(panel.textContent).toContain(
      "Turnaround views not declared: Three-quarter view, Side view.",
    );
    expect(panel.textContent).toContain(REVIEW_STATE_DISCLAIMER);

    /* Needs correction example: the exact contradiction is visible. */
    await user.click(
      screen.getByRole("button", { name: "Needs correction example" }),
    );
    expect(reviewPanel().textContent).toContain("Needs correction");
    expect(reviewPanel().textContent).toContain("Contradictions to correct");
    expect(reviewPanel().textContent).toContain(
      "Side view is not declared",
    );

    /* Review-ready example: every required section plus the adjacent
     * non-production truth. */
    await user.click(
      screen.getByRole("button", { name: "Review-ready example" }),
    );
    const readyPanel = reviewPanel();
    expect(readyPanel.textContent).toContain("Review-ready");
    expect(readyPanel.textContent).toContain(REVIEW_READY_TRUTH);
    const views = within(
      readyPanel.querySelector("[data-testid='pv1-review-views']") as HTMLElement,
    );
    for (const view of ["Front view", "Three-quarter view", "Side view"]) {
      expect(views.getByText(view)).toBeTruthy();
    }
    expect(views.getAllByText("Declared")).toHaveLength(3);
    const parts = readyPanel.querySelector(
      "[data-testid='pv1-review-parts']",
    )!;
    expect(parts.textContent).toContain("240 × 320, padding 16");
    expect(parts.textContent).toContain("x 120, y 280");
    expect(parts.textContent).toContain(DECLARED_METADATA_TRUTH);
    expect(parts.querySelectorAll("tbody tr")).toHaveLength(4);
    const masks = readyPanel.querySelector(
      "[data-testid='pv1-review-masks']",
    )!;
    expect(masks.textContent).toContain("mask-face-alpha");
    const profiles = readyPanel.querySelector(
      "[data-testid='pv1-review-profiles']",
    )!;
    expect(profiles.textContent).toContain("Kids Adventure");
    expect(profiles.textContent).toContain("Storybook Cutout");
    const expressions = readyPanel.querySelector(
      "[data-testid='pv1-review-expressions']",
    )!;
    expect(expressions.textContent).toContain("neutral");
    expect(expressions.textContent).toContain("rest");
    const checklist = readyPanel.querySelector(
      "[data-testid='pv1-review-checklist']",
    )!;
    expect(checklist.textContent).toContain("Motion-readiness checklist");
    expect(within(checklist as HTMLElement).getAllByText("Pass")).toHaveLength(
      6,
    );
    expect(readyPanel.textContent).toContain(FIXTURE_SOURCE_TRUTH);
    expect(readyPanel.textContent).toContain(FUTURE_WORKFLOW_TRUTH);

    /* Counts and readiness never move while the panel opens, switches, or
     * closes. */
    expect(requirementCountsText()).toBe(countsBefore);
    expect(olloRow().querySelector("small")?.textContent).toBe(
      readinessBefore,
    );
    await user.click(
      screen.getByRole("button", {
        name: "Close review panel for Ollo",
      }),
    );
    expect(screen.queryByTestId("pv1-review")).toBeNull();
    expect(requirementCountsText()).toBe(countsBefore);
    /* Close restores focus to the exact surviving invoker. */
    expect(document.activeElement).toBe(invoker);
    expect(invoker.getAttribute("aria-expanded")).toBe("false");
  });

  it("shows the rig review with turnaround poses, parts, pivots, masks, profiles, expressions, visemes, and the motion checklist", async () => {
    const user = userEvent.setup();
    render(<AssetWorkspace />);
    await selectScene(user, "scene-1");
    await user.click(
      screen.getByRole("button", {
        name: "Review layers & rig for Ollo performance rig in Scene 1 · The Home Nook",
      }),
    );
    await user.click(
      screen.getByRole("button", { name: "Review-ready example" }),
    );
    const panel = reviewPanel();
    expect(panel.textContent).toContain("Neutral front pose");
    expect(panel.textContent).toContain("Neutral side pose");
    expect(panel.textContent).toContain("mask-mouth-viseme");
    expect(panel.textContent).toContain("determined");
    expect(panel.textContent).toContain(REVIEW_READY_TRUTH);
    const checklist = panel.querySelector(
      "[data-testid='pv1-review-checklist']",
    )!;
    expect(within(checklist as HTMLElement).getAllByText("Pass")).toHaveLength(
      6,
    );
    /* The needs-correction rig example exposes the profile contradiction. */
    await user.click(
      screen.getByRole("button", { name: "Needs correction example" }),
    );
    expect(reviewPanel().textContent).toContain(
      "Storybook Cutout coverage is not declared",
    );
  });

  it("shows the Dot needs-correction example as one exact readable blocker with no example switcher", async () => {
    const user = userEvent.setup();
    render(<AssetWorkspace />);
    await selectScene(user, "scene-3");
    await user.click(
      screen.getByRole("button", {
        name: "Review layers & rig for Dot in Scene 3 · Berry Patch",
      }),
    );
    const panel = reviewPanel();
    expect(panel.textContent).toContain("Needs correction");
    expect(panel.textContent).toContain(
      'Checklist "All required turnaround views declared" is marked passing, but the declaration is incomplete: Side view is not declared.',
    );
    expect(
      screen.queryByRole("group", {
        name: "Declared demo review examples",
      }),
    ).toBeNull();
  });

  it("shows the layered-set review with explicit plane order, coverage, and foreground occluder intent", async () => {
    const user = userEvent.setup();
    render(<AssetWorkspace />);
    await selectScene(user, "scene-1");
    await user.click(
      screen.getByRole("button", {
        name: "Review set layers for The Home Nook set in Scene 1 · The Home Nook",
      }),
    );
    await user.click(
      screen.getByRole("button", { name: "Review-ready example" }),
    );
    const panel = reviewPanel();
    const planes = panel.querySelector("[data-testid='pv1-review-planes']")!;
    const planeText = planes.textContent ?? "";
    const background = planeText.indexOf("1. background");
    const midground = planeText.indexOf("2. midground");
    const foreground = planeText.indexOf("3. foreground");
    expect(background).toBeGreaterThanOrEqual(0);
    expect(midground).toBeGreaterThan(background);
    expect(foreground).toBeGreaterThan(midground);
    const occluders = panel.querySelector(
      "[data-testid='pv1-review-occluders']",
    )!;
    expect(occluders.textContent).toContain("occluder-nook-vines");
    expect(occluders.textContent).toContain(
      "intended subject relationship",
    );
    /* The incomplete example names the missing planes and occluders. */
    await user.click(
      screen.getByRole("button", { name: "Incomplete example" }),
    );
    expect(reviewPanel().textContent).toContain(
      "Planes not declared: midground, foreground.",
    );
    expect(reviewPanel().textContent).toContain(
      "No foreground occluders are declared.",
    );
  });

  it("preserves session-local candidate source/rights truth inside the review after a confirmed import", async () => {
    const user = userEvent.setup();
    render(<AssetWorkspace />);
    await selectScene(user, "scene-3");
    const countsBefore = requirementCountsText();
    await user.click(
      screen.getByRole("button", {
        name: "Request image pack for Dot in Scene 3 · Berry Patch",
      }),
    );
    await user.click(
      screen.getByRole("button", { name: "Choose a declared demo candidate" }),
    );
    await user.click(screen.getByRole("button", { name: /Dot view sheet/ }));
    await user.type(
      within(screen.getByTestId("pv1-request")).getByLabelText(
        "Source (required)",
      ),
      "Painted in my own tool",
    );
    await user.type(
      within(screen.getByTestId("pv1-request")).getByLabelText(
        "License / rights (required)",
      ),
      "I own the result",
    );
    await user.click(
      screen.getByRole("button", { name: "Continue to confirmation" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Confirm local candidate record" }),
    );
    await user.click(screen.getByRole("button", { name: "Close panel" }));

    await user.click(
      screen.getByRole("button", {
        name: "Review layers & rig for Dot in Scene 3 · Berry Patch",
      }),
    );
    const candidate = reviewPanel().querySelector(
      "[data-testid='pv1-review-candidate']",
    )!;
    expect(candidate.textContent).toContain("Painted in my own tool");
    expect(candidate.textContent).toContain("I own the result");
    expect(candidate.textContent).toContain("your words");
    expect(candidate.textContent).toContain(
      "it does not prove provenance",
    );
    expect(requirementCountsText()).toBe(countsBefore);
  });

  it("keeps one open review identity at a time: opening request closes review and opening review closes request", async () => {
    const user = userEvent.setup();
    render(<AssetWorkspace />);
    await selectScene(user, "scene-3");
    const requestButton = screen.getByRole("button", {
      name: "Request image pack for Dot in Scene 3 · Berry Patch",
    });
    const reviewButton = screen.getByRole("button", {
      name: "Review layers & rig for Dot in Scene 3 · Berry Patch",
    });
    await user.click(requestButton);
    expect(screen.queryByTestId("pv1-request")).not.toBeNull();
    await user.click(reviewButton);
    expect(screen.queryByTestId("pv1-request")).toBeNull();
    expect(screen.queryByTestId("pv1-review")).not.toBeNull();
    await user.click(requestButton);
    expect(screen.queryByTestId("pv1-review")).toBeNull();
    expect(screen.queryByTestId("pv1-request")).not.toBeNull();
  });

  it("closes on Escape with focus restored to the exact surviving invoker, and the expanded invoker toggles", async () => {
    const user = userEvent.setup();
    render(<AssetWorkspace />);
    await selectScene(user, "scene-1");
    const invoker = screen.getByRole("button", {
      name: "Review layers & rig for Ollo in Scene 1 · The Home Nook",
    });
    await user.click(invoker);
    expect(document.activeElement).toBe(
      reviewPanel().querySelector("h3"),
    );
    await user.keyboard("{Escape}");
    expect(screen.queryByTestId("pv1-review")).toBeNull();
    expect(document.activeElement).toBe(invoker);
    /* Re-open and toggle closed through the expanded invoker itself. */
    await user.click(invoker);
    expect(screen.queryByTestId("pv1-review")).not.toBeNull();
    await user.click(invoker);
    expect(screen.queryByTestId("pv1-review")).toBeNull();
    expect(document.activeElement).toBe(invoker);
  });

  it("clears transient review state on scene, category, and selected-record scope changes", async () => {
    const user = userEvent.setup();
    render(<AssetWorkspace />);
    await selectScene(user, "scene-1");
    const invoker = screen.getByRole("button", {
      name: "Review layers & rig for Ollo in Scene 1 · The Home Nook",
    });
    await user.click(invoker);
    await selectScene(user, "scene-2");
    expect(screen.queryByTestId("pv1-review")).toBeNull();

    await selectScene(user, "scene-1");
    await user.click(invoker);
    await user.click(screen.getByRole("button", { name: "Rigs" }));
    expect(screen.queryByTestId("pv1-review")).toBeNull();

    /* Selecting a record in the asset list also clears the review. */
    await user.click(
      screen.getByRole("button", {
        name: "Review layers & rig for Ollo performance rig in Scene 1 · The Home Nook",
      }),
    );
    expect(screen.queryByTestId("pv1-review")).not.toBeNull();
    const assetList = screen.getByRole("region", {
      name: /records in scope$/,
    });
    await user.click(
      within(assetList).getByRole("button", {
        name: /Ollo performance rig/,
      }),
    );
    expect(screen.queryByTestId("pv1-review")).toBeNull();
  });

  it("fails closed in the panel for an invalid injected fixture without claiming a state", async () => {
    const user = userEvent.setup();
    const broken = mutateCharacterRig(
      fixtureFor("review-req-s3-dot-needs-correction"),
      (declaration) => ({
        ...declaration,
        turnaroundViews: ["Front view", "Overhead view"],
      }),
    );
    render(
      <AssetWorkspace
        reviewFixtures={[...REVIEW_FIXTURES.filter(
          (fixture) => fixture.requirementId !== "req-s3-dot",
        ), broken]}
      />,
    );
    await selectScene(user, "scene-3");
    await user.click(
      screen.getByRole("button", {
        name: "Review layers & rig for Dot in Scene 3 · Berry Patch",
      }),
    );
    const alert = within(reviewPanel()).getByRole("alert");
    expect(alert.textContent).toContain("Unknown turnaround view");
    expect(alert.textContent).toContain("fails closed as unavailable");
    expect(reviewPanel().textContent).toContain("enters no counts");
    expect(reviewPanel().textContent).not.toContain("Review state:");
  });

  it("keeps every approval, preparation, and production control disabled with its reason and reports no production claim", async () => {
    const user = userEvent.setup();
    render(<AssetWorkspace />);
    await selectScene(user, "scene-1");
    await user.click(
      screen.getByRole("button", {
        name: "Review layers & rig for Ollo in Scene 1 · The Home Nook",
      }),
    );
    await user.click(
      screen.getByRole("button", { name: "Review-ready example" }),
    );
    const panel = reviewPanel();
    const enabledButtons = [
      ...panel.querySelectorAll("button:not([disabled])"),
    ].map((button) => button.textContent ?? "");
    for (const label of enabledButtons)
      expect(label).not.toMatch(
        /slice|generate mask|calculate pivot|build rig|preview motion|approve|promote|production ready|godot|render|export/i,
      );
    const future = panel.querySelector("[data-testid='pv1-review-future']")!;
    for (const button of future.querySelectorAll("button"))
      expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(future.textContent).toContain(FUTURE_WORKFLOW_TRUTH);
    /* Review-ready never appears without its adjacent non-production truth. */
    expect(panel.textContent).toContain(REVIEW_READY_TRUTH);
    expect(panel.textContent).not.toMatch(
      /approved|production-ready|capability granted/i,
    );
    /* No fake pixels, skeleton, or measured/calculated claims. */
    expect(panel.querySelectorAll("img, canvas, svg")).toHaveLength(0);
    expect(panel.textContent).toContain(DECLARED_METADATA_TRUTH);
  });
});
