import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { AssetWorkspace } from "./AssetWorkspace";
import {
  SCENE_REQUIREMENTS,
  resolveSceneRequirement,
} from "./asset-requirements";
import {
  EXPECTED_STRUCTURE_TRUTH,
  MANUAL_WORKFLOW_TRUTH,
  REFERENCE_TRUTH,
  REQUEST_PACK_TRUTH,
  buildRequestPack,
} from "./asset-request-pack";
import {
  ACCEPTED_DECLARED_FORMATS,
  CANCELLED_TRUTH,
  CONFIRMED_CANDIDATE_TRUTH,
  acceptedDeclaredFormat,
  demoCandidatesFor,
  transitionImport,
  type ImportContext,
  type ImportWorkflowState,
  type LocalCandidateRecord,
} from "./asset-import";

afterEach(() => {
  cleanup();
});

const requirementsRegion = () => screen.getByTestId("pv1-requirements");

const requirementCountsText = () =>
  requirementsRegion().querySelector(".pv1-requirement-counts")?.textContent ??
  "";

const requestPanel = () => screen.getByTestId("pv1-request");

const selectScene = async (
  user: ReturnType<typeof userEvent.setup>,
  sceneId: string,
) => {
  await user.selectOptions(
    screen.getByRole("combobox", { name: "Scene filter" }),
    sceneId,
  );
};

const dotEntry = SCENE_REQUIREMENTS.find(
  (entry) => entry.id === "req-s3-dot",
)!;
const dotItem = resolveSceneRequirement(dotEntry);
const dotPack = buildRequestPack(dotItem)!;

const contextFor = (
  reviewList: readonly LocalCandidateRecord[] = [],
): ImportContext => ({
  pack: dotPack,
  candidates: demoCandidatesFor(dotPack),
  reviewList,
});

const idle: ImportWorkflowState = { kind: "idle" };

/* Drive the machine to a valid confirming state for the front candidate. */
const confirmingState = () => {
  const context = contextFor();
  let state = transitionImport(idle, { type: "begin-choose" }, context);
  state = transitionImport(
    state,
    { type: "choose-candidate", candidateId: `cand-${dotEntry.id}-front` },
    context,
  );
  state = transitionImport(
    state,
    { type: "edit-source", value: "Painted in my own tool" },
    context,
  );
  state = transitionImport(
    state,
    { type: "edit-license", value: "I own the result" },
    context,
  );
  state = transitionImport(state, { type: "continue-to-confirmation" }, context);
  return state;
};

describe("F4-WP3 — request pack model (pure)", () => {
  it("builds a deterministic scene-scoped pack with prompt, references, views, layers, and intended use", () => {
    expect(buildRequestPack(dotItem)).toEqual(dotPack);
    expect(dotPack.requirementId).toBe("req-s3-dot");
    expect(dotPack.sceneId).toBe("scene-3");
    expect(dotPack.sceneLabel).toBe("Scene 3 · Berry Patch");
    expect(dotPack.categoryLabel).toBe("Characters");
    expect(dotPack.blocker).toBe(dotEntry.blocker);
    expect(dotPack.prompt).toContain("Dot");
    expect(dotPack.prompt).toContain("Berry Patch");
    expect(dotPack.prompt.length).toBeGreaterThan(80);
    expect(dotPack.references.length).toBeGreaterThanOrEqual(2);
    for (const reference of dotPack.references) {
      expect(reference.label.length).toBeGreaterThan(4);
      expect(reference.description.length).toBeGreaterThan(20);
    }
    expect(dotPack.expectedViews.length).toBeGreaterThanOrEqual(2);
    expect(dotPack.expectedLayers.length).toBeGreaterThanOrEqual(1);
    expect(dotPack.intendedUse).toContain("Scene 3 · Berry Patch");
    expect(dotPack.intendedUse).not.toContain("approves anything");
    expect(dotPack.truthNote).toBe(REQUEST_PACK_TRUTH);
  });

  it("marks reusable records with a shared-record reference note", () => {
    const tix = resolveSceneRequirement(
      SCENE_REQUIREMENTS.find((entry) => entry.id === "req-s2-tix")!,
    );
    const pack = buildRequestPack(tix)!;
    expect(tix.reusable).toBe(true);
    expect(
      pack.references.some((reference) =>
        reference.label.includes("Shared record"),
      ),
    ).toBe(true);
  });

  it("fails closed: ready and unavailable requirements have no request path", () => {
    const ready = resolveSceneRequirement(
      SCENE_REQUIREMENTS.find((entry) => entry.id === "req-s3-ollo")!,
    );
    expect(ready.entry.readiness).toBe("ready");
    expect(buildRequestPack(ready)).toBeNull();
    const stale = resolveSceneRequirement({
      ...dotEntry,
      assetId: "char-nobody",
    });
    expect(stale.unavailableReason).not.toBeNull();
    expect(buildRequestPack(stale)).toBeNull();
  });

  it("declares deterministic demo candidates including one wrong-format fixture", () => {
    const candidates = demoCandidatesFor(dotPack);
    expect(demoCandidatesFor(dotPack)).toEqual(candidates);
    expect(candidates).toHaveLength(3);
    expect(candidates[0]!.declaredFormat).toBe("png");
    expect(candidates[1]!.coveredViews).toEqual(dotPack.expectedViews);
    expect(acceptedDeclaredFormat(candidates[2]!.declaredFormat)).toBe(false);
    expect(ACCEPTED_DECLARED_FORMATS).toEqual(["png", "jpg", "webp"]);
  });
});

describe("F4-WP3 — import workflow machine (pure)", () => {
  it("walks idle -> pending -> reviewing -> confirming -> confirmed with an explicit confirmation boundary", () => {
    const context = contextFor();
    let state = transitionImport(idle, { type: "begin-choose" }, context);
    expect(state.kind).toBe("selection-pending");
    state = transitionImport(
      state,
      { type: "choose-candidate", candidateId: `cand-${dotEntry.id}-sheet` },
      context,
    );
    expect(state.kind).toBe("reviewing");
    /* Confirmation is impossible while required source/license truth is
     * missing: the machine refuses to advance. */
    state = transitionImport(
      state,
      { type: "continue-to-confirmation" },
      context,
    );
    expect(state.kind).toBe("missing-source");
    /* Fields stay editable inside the missing state until valid. */
    state = transitionImport(
      state,
      { type: "edit-source", value: "My scanner" },
      context,
    );
    expect(state.kind).toBe("missing-source");
    state = transitionImport(
      state,
      { type: "continue-to-confirmation" },
      context,
    );
    expect(state.kind).toBe("missing-license");
    state = transitionImport(
      state,
      { type: "edit-license", value: "All rights mine" },
      context,
    );
    state = transitionImport(
      state,
      { type: "continue-to-confirmation" },
      context,
    );
    expect(state.kind).toBe("confirming");
    state = transitionImport(state, { type: "confirm" }, context);
    expect(state.kind).toBe("confirmed");
    if (state.kind !== "confirmed") throw new Error("expected confirmed");
    expect(state.record.requirementId).toBe("req-s3-dot");
    expect(state.record.sceneId).toBe("scene-3");
    expect(state.record.truth).toBe(CONFIRMED_CANDIDATE_TRUTH);
    expect(state.record.truth).toContain(
      "Only a session-local descriptive candidate record now exists",
    );
    /* The input review list was never mutated. */
    expect(context.reviewList).toHaveLength(0);
  });

  it("models drop intent and the generic unavailable state for unknown and stale identities", () => {
    const context = contextFor();
    let state = transitionImport(
      idle,
      { type: "declare-drop-intent" },
      context,
    );
    expect(state).toEqual({ kind: "selection-pending", intent: "drop" });
    state = transitionImport(
      state,
      { type: "choose-candidate", candidateId: "cand-ghost" },
      context,
    );
    expect(state.kind).toBe("unavailable");
    if (state.kind !== "unavailable") throw new Error("expected unavailable");
    expect(state.reason).toContain("Unknown candidate identity");
    /* A stale identity at the confirmation boundary also fails closed. */
    const confirming = confirmingState();
    if (confirming.kind !== "confirming") throw new Error("setup failed");
    const staleContext = {
      ...context,
      candidates: context.candidates.filter(
        (candidate) => candidate.id !== confirming.candidateId,
      ),
    };
    const stale = transitionImport(confirming, { type: "confirm" }, staleContext);
    expect(stale.kind).toBe("unavailable");
  });

  it("fails closed on every invalid transition without changing state shape", () => {
    const context = contextFor();
    expect(transitionImport(idle, { type: "confirm" }, context).kind).toBe(
      "unavailable",
    );
    expect(
      transitionImport(
        idle,
        { type: "choose-candidate", candidateId: "x" },
        context,
      ).kind,
    ).toBe("unavailable");
    expect(
      transitionImport(idle, { type: "edit-source", value: "s" }, context)
        .kind,
    ).toBe("unavailable");
    expect(
      transitionImport(idle, { type: "start-over" }, context).kind,
    ).toBe("unavailable");
    const confirming = confirmingState();
    expect(
      transitionImport(confirming, { type: "begin-choose" }, context).kind,
    ).toBe("unavailable");
    expect(
      transitionImport(
        confirming,
        { type: "continue-to-confirmation" },
        context,
      ).kind,
    ).toBe("unavailable");
  });

  it("reaches the wrong-format state from declared metadata and never creates a candidate", () => {
    const context = contextFor();
    let state = transitionImport(idle, { type: "begin-choose" }, context);
    state = transitionImport(
      state,
      { type: "choose-candidate", candidateId: `cand-${dotEntry.id}-notes` },
      context,
    );
    state = transitionImport(
      state,
      { type: "edit-source", value: "My notes app" },
      context,
    );
    state = transitionImport(
      state,
      { type: "edit-license", value: "Mine" },
      context,
    );
    state = transitionImport(state, { type: "continue-to-confirmation" }, context);
    expect(state.kind).toBe("wrong-format");
    if (state.kind !== "wrong-format") throw new Error("expected wrong-format");
    expect(state.reason).toContain('"txt"');
    expect(state.reason).toContain("not media sniffing");
    expect(state.reason).toContain("No candidate was created");
    /* Start over recovers to idle with the review list untouched. */
    expect(transitionImport(state, { type: "start-over" }, context)).toEqual(
      idle,
    );
    expect(context.reviewList).toHaveLength(0);
  });

  it("detects duplicates as deterministic fixture collisions at choose and at confirm", () => {
    const confirmed = confirmingState();
    const first = transitionImport(confirmed, { type: "confirm" }, contextFor());
    if (first.kind !== "confirmed") throw new Error("setup failed");
    const context = contextFor([first.record]);
    /* Choosing the same fixture identity again is a duplicate. */
    let state = transitionImport(idle, { type: "begin-choose" }, context);
    state = transitionImport(
      state,
      { type: "choose-candidate", candidateId: first.record.id },
      context,
    );
    expect(state.kind).toBe("duplicate");
    if (state.kind !== "duplicate") throw new Error("expected duplicate");
    expect(state.reason).toContain("deterministic fixture identity collision");
    expect(state.reason).toContain("No second record was created");
    /* A record confirmed between review and confirm is still caught at the
     * confirmation boundary. */
    const raced = transitionImport(confirmed, { type: "confirm" }, context);
    expect(raced.kind).toBe("duplicate");
    expect(context.reviewList).toHaveLength(1);
  });

  it("cancellation is always safe and preserves the prior state exactly", () => {
    const context = contextFor();
    const confirming = confirmingState();
    const cancelled = transitionImport(confirming, { type: "cancel" }, context);
    expect(cancelled).toEqual({ kind: "cancelled", truth: CANCELLED_TRUTH });
    expect(context.reviewList).toHaveLength(0);
    expect(transitionImport(cancelled, { type: "start-over" }, context)).toEqual(
      idle,
    );
    expect(transitionImport(idle, { type: "cancel" }, context)).toEqual(idle);
  });
});

describe("F4-WP3 — request pack preview (UI)", () => {
  it("opens a scene-scoped pack from a non-ready requirement keeping scene, category, and blocker visible", async () => {
    const user = userEvent.setup();
    render(<AssetWorkspace />);
    await selectScene(user, "scene-3");
    await user.click(
      screen.getByRole("button", {
        name: "Request image pack for Dot in Scene 3 · Berry Patch",
      }),
    );
    const panel = requestPanel();
    expect(panel.textContent).toContain("Scene 3 · Berry Patch");
    expect(panel.textContent).toContain("Characters");
    expect(panel.textContent).toContain("Current blocker:");
    expect(panel.textContent).toContain(dotEntry.blocker);
    expect(panel.textContent).toContain(REQUEST_PACK_TRUTH);
    expect(panel.textContent).toContain(REFERENCE_TRUTH);
    expect(panel.textContent).toContain(EXPECTED_STRUCTURE_TRUTH);
    expect(panel.textContent).toContain(MANUAL_WORKFLOW_TRUTH);
    /* The prompt is a readonly, selectable text — no copy action exists. */
    const prompt = within(panel).getByLabelText(
      "Request prompt (select and copy it yourself)",
    );
    expect(prompt.tagName).toBe("TEXTAREA");
    expect(prompt).toHaveAttribute("readonly");
    expect(prompt).toHaveValue(dotPack.prompt);
    /* References are labelled descriptive rows; expected views/layers are
     * listed as instructions. */
    expect(panel.textContent).toContain("Dot — local planning record");
    expect(panel.textContent).toContain("Scene 3 · Berry Patch — bounded demo scene");
    expect(panel.textContent).toContain("Front view");
    expect(panel.textContent).toContain("Three-quarter view");
    /* The panel moved focus in deliberately. */
    const heading = within(panel).getByRole("heading", { name: "Dot" });
    expect(document.activeElement).toBe(heading);
    /* Ready requirements and unavailable rows expose no request path. */
    expect(
      screen.queryByRole("button", {
        name: "Request image pack for Ollo in Scene 3",
      }),
    ).toBeNull();
  });

  it("closes the panel on a scene change and never retains a candidate from another scope", async () => {
    const user = userEvent.setup();
    render(<AssetWorkspace />);
    await selectScene(user, "scene-3");
    await user.click(
      screen.getByRole("button", {
        name: "Request image pack for Dot in Scene 3 · Berry Patch",
      }),
    );
    await user.click(
      screen.getByRole("button", { name: "Choose a declared demo candidate" }),
    );
    await user.click(
      screen.getByRole("button", { name: /Dot front view/ }),
    );
    expect(requestPanel().textContent).toContain(
      "Reviewing candidate metadata",
    );
    await selectScene(user, "scene-7");
    expect(screen.queryByTestId("pv1-request")).toBeNull();
    /* Reopening in the new scope starts clean — no hidden reviewing state. */
    await user.click(
      screen.getByRole("button", {
        name: "Request image pack for Dot in Scene 7 · Sunflower Field",
      }),
    );
    expect(requestPanel().textContent).toContain("Scene 7 · Sunflower Field");
    expect(requestPanel().textContent).toContain("Import state: Idle");
  });

  it("closes the panel on a category change", async () => {
    const user = userEvent.setup();
    render(<AssetWorkspace />);
    await selectScene(user, "scene-3");
    await user.click(
      screen.getByRole("button", {
        name: "Request image pack for Dot in Scene 3 · Berry Patch",
      }),
    );
    expect(requestPanel()).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Props" }));
    expect(screen.queryByTestId("pv1-request")).toBeNull();
  });
});

describe("F4-WP3 — candidate import flow (UI)", () => {
  const openDotPanel = async (user: ReturnType<typeof userEvent.setup>) => {
    render(<AssetWorkspace />);
    await selectScene(user, "scene-3");
    await user.click(
      screen.getByRole("button", {
        name: "Request image pack for Dot in Scene 3 · Berry Patch",
      }),
    );
  };

  it("requires explicit confirmation, labels the result only as a local candidate record, and never changes readiness or counts", async () => {
    const user = userEvent.setup();
    await openDotPanel(user);
    const countsBefore = requirementCountsText();
    await user.click(
      screen.getByRole("button", { name: "Choose a declared demo candidate" }),
    );
    await user.click(
      screen.getByRole("button", { name: /Dot view sheet/ }),
    );
    expect(requestPanel().textContent).toContain("Proposed name");
    expect(requestPanel().textContent).toContain("Declared format");
    expect(requestPanel().textContent).toContain("Reference association");
    expect(requestPanel().textContent).toContain("Covers every expected view");
    /* Continue with empty source -> missing source, focus moves to the
     * readable error association, and no candidate exists. */
    await user.click(
      screen.getByRole("button", { name: "Continue to confirmation" }),
    );
    expect(requestPanel().textContent).toContain("Source is required");
    const sourceInput = within(requestPanel()).getByLabelText(
      "Source (required)",
    );
    expect(document.activeElement).toBe(sourceInput);
    expect(sourceInput).toHaveAttribute("aria-invalid", "true");
    expect(requestPanel().textContent).toContain(
      "Local candidate records for this requirement (0)",
    );
    await user.type(sourceInput, "Painted in my own tool");
    await user.click(
      screen.getByRole("button", { name: "Continue to confirmation" }),
    );
    expect(requestPanel().textContent).toContain("License or rights are required");
    const licenseInput = within(requestPanel()).getByLabelText(
      "License / rights (required)",
    );
    expect(document.activeElement).toBe(licenseInput);
    await user.type(licenseInput, "I own the result");
    await user.click(
      screen.getByRole("button", { name: "Continue to confirmation" }),
    );
    expect(requestPanel().textContent).toContain("Awaiting explicit confirmation");
    /* Metadata is visible but locked at the confirmation boundary. */
    expect(
      within(requestPanel()).getByLabelText("Source (required)"),
    ).toBeDisabled();
    expect(
      within(requestPanel()).getByLabelText("License / rights (required)"),
    ).toBeDisabled();
    await user.click(
      screen.getByRole("button", { name: "Confirm local candidate record" }),
    );
    expect(requestPanel().textContent).toContain(CONFIRMED_CANDIDATE_TRUTH);
    expect(requestPanel().textContent).toContain(
      "Local candidate records for this requirement (1)",
    );
    /* The requirement row reports the record without touching readiness. */
    expect(requirementCountsText()).toBe(countsBefore);
    expect(requirementsRegion().textContent).toContain(
      "Local candidate records: 1",
    );
    /* Closing restores focus to the invoking control. */
    const invoker = screen.getByRole("button", {
      name: "Request image pack for Dot in Scene 3 · Berry Patch",
    });
    await user.click(
      within(requestPanel()).getByRole("button", { name: "Close panel" }),
    );
    expect(screen.queryByTestId("pv1-request")).toBeNull();
    expect(document.activeElement).toBe(invoker);
  });

  it("models drop intent, wrong format, duplicate, and cancellation without ever creating a candidate or mutating counts", async () => {
    const user = userEvent.setup();
    await openDotPanel(user);
    const countsBefore = requirementCountsText();
    /* Drop intent is declared honestly — no bytes are read. */
    await user.click(
      screen.getByRole("button", { name: "Declare drop intent" }),
    );
    expect(requestPanel().textContent).toContain("Drop intent recorded");
    expect(requestPanel().textContent).toContain("cannot read dropped bytes");
    /* Wrong format: declared metadata, not sniffing; no candidate created. */
    await user.click(
      screen.getByRole("button", { name: /Dot notes export/ }),
    );
    await user.type(
      within(requestPanel()).getByLabelText("Source (required)"),
      "My notes app",
    );
    await user.type(
      within(requestPanel()).getByLabelText("License / rights (required)"),
      "Mine",
    );
    await user.click(
      screen.getByRole("button", { name: "Continue to confirmation" }),
    );
    expect(requestPanel().textContent).toContain('"txt"');
    expect(requestPanel().textContent).toContain("not media sniffing");
    expect(requestPanel().textContent).toContain(
      "Local candidate records for this requirement (0)",
    );
    await user.click(screen.getByRole("button", { name: "Start over" }));
    /* Confirm the front view, then choosing it again is a duplicate. */
    await user.click(
      screen.getByRole("button", { name: "Choose a declared demo candidate" }),
    );
    await user.click(
      screen.getByRole("button", { name: /Dot front view/ }),
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
    expect(requestPanel().textContent).toContain(
      "Local candidate records for this requirement (1)",
    );
    await user.click(screen.getByRole("button", { name: "Close panel" }));
    await user.click(
      screen.getByRole("button", {
        name: "Request image pack for Dot in Scene 3 · Berry Patch",
      }),
    );
    await user.click(
      screen.getByRole("button", { name: "Choose a declared demo candidate" }),
    );
    await user.click(
      screen.getByRole("button", { name: /Dot front view/ }),
    );
    expect(requestPanel().textContent).toContain(
      "deterministic fixture identity collision",
    );
    expect(requestPanel().textContent).toContain(
      "Local candidate records for this requirement (1)",
    );
    /* Cancellation returns to a stable prior state; counts never moved. */
    await user.click(
      screen.getAllByRole("button", { name: "Cancel import" })[0]!,
    );
    expect(requestPanel().textContent).toContain(CANCELLED_TRUTH);
    expect(requirementCountsText()).toBe(countsBefore);
  });

  it("supports full keyboard operation with visible focus and Escape recovery to the invoker", async () => {
    const user = userEvent.setup();
    render(<AssetWorkspace />);
    await selectScene(user, "scene-3");
    const invoker = screen.getByRole("button", {
      name: "Request image pack for Dot in Scene 3 · Berry Patch",
    });
    invoker.focus();
    expect(document.activeElement).toBe(invoker);
    await user.keyboard("{Enter}");
    const heading = within(requestPanel()).getByRole("heading", {
      name: "Dot",
    });
    expect(document.activeElement).toBe(heading);
    /* Escape from an in-flight flow cancels into the explicit cancelled
     * state; Escape again closes and restores the invoker. */
    await user.click(
      screen.getByRole("button", { name: "Choose a declared demo candidate" }),
    );
    await user.keyboard("{Escape}");
    expect(requestPanel().textContent).toContain(CANCELLED_TRUTH);
    await user.keyboard("{Escape}");
    expect(screen.queryByTestId("pv1-request")).toBeNull();
    expect(document.activeElement).toBe(invoker);
    expect(requirementCountsText()).toContain("Missing 1");
  });
});

describe("F4-WP3 — truth boundaries (UI)", () => {
  it("shows no credential fields and no real-file, generation, upload, approval, or production success claims", async () => {
    const user = userEvent.setup();
    render(<AssetWorkspace />);
    await selectScene(user, "scene-3");
    await user.click(
      screen.getByRole("button", {
        name: "Request image pack for Dot in Scene 3 · Berry Patch",
      }),
    );
    const workspace = screen.getByTestId("pv1-assets");
    /* No credential capture of any kind. */
    expect(workspace.querySelector("input[type='password']")).toBeNull();
    expect(workspace.textContent).not.toMatch(/api\s*key/i);
    expect(workspace.textContent).not.toMatch(/access\s*token/i);
    expect(workspace.textContent).not.toMatch(/password/i);
    /* No success claims for capabilities that do not exist. */
    expect(workspace.textContent).not.toMatch(/copied to your clipboard(?! —)/i);
    expect(workspace.textContent).not.toContain("Image generated");
    expect(workspace.textContent).not.toContain("Import complete");
    expect(workspace.textContent).not.toContain("File imported");
    expect(workspace.textContent).not.toContain("Uploaded");
    expect(workspace.textContent).not.toContain("Approved");
    expect(workspace.textContent).not.toContain("Production ready");
    expect(workspace.textContent).not.toContain("Opened in your browser");
    expect(workspace.textContent).not.toContain("Download started");
    /* Every interactive control is a labelled button, field, or link — no
     * dead success controls and no pointer-only drop target. */
    const panel = requestPanel();
    expect(panel.querySelector("[ondrop]")).toBeNull();
    expect(panel.querySelector("input[type='file']")).toBeNull();
  });
});
