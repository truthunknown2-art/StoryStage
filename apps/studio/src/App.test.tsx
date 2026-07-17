import {cleanup, fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach, describe, expect, it, vi} from "vitest";
import type {StoryStageDesktopBridge} from "@storystage/contracts";
import {App} from "./App";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  delete window.storyStage;
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

function makeDesktopBridge(overrides: Partial<StoryStageDesktopBridge> = {}): StoryStageDesktopBridge {
  return {
    getCapabilities: vi.fn(async () => ({localRendering: true, openRenderedFile: true, manualImageExchange: true, localAudioImport: true})),
    exportGenerationJob: vi.fn(async () => ({ok: true as const, jobId: "job-one", briefCount: 2})),
    importLooseCandidateFiles: vi.fn(async () => ({status: "cancelled" as const})),
    finalizeLooseCandidateMapping: vi.fn(async () => ({status: "cancelled" as const})),
    stageCandidateBundle: vi.fn(async () => ({status: "cancelled" as const})),
    saveProductionBundle: vi.fn(async () => ({ok: true as const, productionId: "production-one", revision: 1, contentHash: "a".repeat(64)})),
    listProductionBundles: vi.fn(async () => ({productions: []})),
    loadProductionBundle: vi.fn(async () => ({ok: false as const, error: {code: "NOT_FOUND", message: "Not found"}})),
    listGenerationExchanges: vi.fn(async () => ({exchanges: []})),
    getGenerationExchange: vi.fn(async () => ({ok: false as const, error: {code: "NOT_FOUND", message: "Not found"}})),
    prepareGenerationImport: vi.fn(async () => ({status: "failed" as const, error: {code: "NOT_READY", message: "Not ready"}})),
    reviewCandidateSet: vi.fn(async () => ({status: "failed" as const, error: {code: "NOT_READY", message: "Not ready"}})),
    importVoiceTrack: vi.fn(async () => ({status: "cancelled" as const})),
    approveVoiceTrack: vi.fn(async () => ({ok: false as const, error: {code: "NOT_READY", message: "Not ready"}})),
    startSampleRender: vi.fn(async () => ({jobId: "render-one"})),
    startProductionRender: vi.fn(async () => ({jobId: "production-render-one"})),
    subscribeToRenderJobs: vi.fn(() => () => undefined),
    openRenderedFile: vi.fn(async () => ({ok: true as const})),
    ...overrides,
  };
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

  it("uses a functional frame playhead to synchronize the timeline and inspector", async () => {
    const user = await createDefaultProduction();

    expect(screen.getByRole("slider", {name: "Production playhead"})).toHaveValue("0");
    await user.click(screen.getByRole("button", {name: /Jump to shot 1\.04/}));

    expect(screen.getByRole("slider", {name: "Production playhead"})).not.toHaveValue("0");
    expect(screen.getByRole("heading", {name: "1.04"})).toBeInTheDocument();
    expect(screen.getByText(/1\.04 · Keyword: lamp/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", {name: "Play direction timeline"}));
    expect(screen.getByRole("button", {name: "Pause direction timeline"})).toBeInTheDocument();
    await user.click(screen.getByRole("button", {name: "Pause direction timeline"}));
    expect(screen.getByRole("button", {name: "Play direction timeline"})).toBeInTheDocument();
  });

  it("turns preflight into an evidence-backed readiness view instead of a disabled placeholder", async () => {
    const user = await createDefaultProduction();
    await user.click(screen.getByRole("button", {name: "Preflight"}));

    expect(screen.getByRole("heading", {name: "Production preflight"})).toBeInTheDocument();
    expect(screen.getByText(/asset approvals still required/)).toBeInTheDocument();
    expect(screen.getByText("Desktop renderer unavailable in this host.")).toBeInTheDocument();
    expect(screen.getByText(/Finished-episode gate remains closed/)).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", {name: "Open assets"})[0]!);
    expect(screen.getByRole("heading", {name: "Manual ChatGPT Images"})).toBeInTheDocument();
  });

  it("plays a completed approved render inside the direction workspace", async () => {
    const bridge = makeDesktopBridge({
      subscribeToRenderJobs: vi.fn((listener) => {
        listener({jobId: "render-approved-one", status: "completed", progress: null, message: "Approved production slice complete", outputPath: "C:/private/render-approved-one.mp4"});
        return () => undefined;
      }),
    });
    window.storyStage = bridge;
    await createDefaultProduction();

    const player = await screen.findByLabelText("Approved render player");
    expect(player).toHaveAttribute("src", "storystage-media://render/render-approved-one");
    expect(screen.getByText(/actual H\.264 output/)).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole("button", {name: /Seek rendered shot 1\.04/}));
    expect(screen.getByRole("slider", {name: "Approved render playhead"})).not.toHaveValue("0");
    expect(screen.getByRole("heading", {name: "1.04"})).toBeInTheDocument();
  });

  it("compiles inspector choices into semantic shot overrides", async () => {
    const user = await createDefaultProduction();

    await user.selectOptions(screen.getByLabelText("Shot framing"), "close-up");
    await user.selectOptions(screen.getByLabelText("Shot transition"), "brief-dissolve");
    await user.selectOptions(screen.getByLabelText("Camera action"), "pan");
    await user.selectOptions(screen.getByLabelText("Performance gesture"), "point");

    expect(screen.getByLabelText("Shot framing")).toHaveValue("close-up");
    expect(screen.getByLabelText("Shot transition")).toHaveValue("brief-dissolve");
    expect(screen.getByText("Override compiled into the current render plan.")).toBeInTheDocument();
    expect(screen.getAllByText("pan").some((element) => element.tagName === "B")).toBe(true);
    expect(screen.getAllByText("gesture").some((element) => element.tagName === "B")).toBe(true);
  });

  it("edits and locks frame-accurate spoken timing instead of faking a voice track", async () => {
    const user = await createDefaultProduction();
    await user.click(screen.getByRole("button", {name: "Audio"}));

    expect(screen.getByRole("heading", {name: "Narration & caption timing"})).toBeInTheDocument();
    expect(screen.getAllByRole("button", {name: /Select timing cue/}).length).toBeGreaterThan(0);
    const text = screen.getByLabelText(/Spoken text for shot/);
    const duration = screen.getByLabelText(/Duration for shot/);
    await user.clear(text);
    await user.type(text, "A cleaner locked narration read.");
    await user.clear(duration);
    await user.type(duration, "7.2");
    await user.click(screen.getByRole("button", {name: "Lock this timing"}));

    expect(screen.getByRole("button", {name: "Unlock timing"})).toBeInTheDocument();
    expect(screen.getByDisplayValue("A cleaner locked narration read.")).toBeInTheDocument();
    expect(screen.getByLabelText(/Duration for shot/)).toHaveValue(7.2);
    expect(screen.getByText("Timing locked")).toBeInTheDocument();

    await user.click(screen.getByRole("button", {name: "Preflight"}));
    expect(screen.getByText(/1\/\d+ narration or dialogue cues have editor-locked frame timing/)).toBeInTheDocument();
    expect(screen.getByText(/approved voice master/)).toBeInTheDocument();
  });

  it("imports, auditions, and approves an exact local WAV voice master", async () => {
    const importedTrack = {id: "voice-aaaaaaaaaaaaaaaaaaaa", contentHash: "a".repeat(64), relativeFile: `voice/production-placeholder/r1/${"a".repeat(64)}.wav`, sourceFileName: "narration-take-03.wav", codec: "pcm-wav" as const, durationInSeconds: 54, sampleRate: 48_000, channels: 1 as const, bitsPerSample: 16 as const, importedAt: "2026-07-17T12:00:00.000Z", approvalStatus: "imported" as const, approvedAt: null};
    let boundTrack = importedTrack;
    const bridge = makeDesktopBridge({
      importVoiceTrack: vi.fn(async (request) => {boundTrack = {...importedTrack, relativeFile: `voice/${request.productionId}/r${request.revision}/${"a".repeat(64)}.wav`}; return {status: "imported" as const, track: boundTrack};}),
      approveVoiceTrack: vi.fn(async () => ({ok: true as const, track: {...boundTrack, approvalStatus: "approved" as const, approvedAt: "2026-07-17T12:05:00.000Z"}})),
    });
    window.storyStage = bridge;
    const user = await createDefaultProduction();
    await user.click(screen.getByRole("button", {name: "Audio"}));
    const importButton = screen.getByRole("button", {name: "Import WAV"});
    await waitFor(() => expect(importButton).toBeEnabled());
    await user.click(importButton);

    const player = await screen.findByLabelText("Imported voice master");
    expect(player).toHaveAttribute("src", `storystage-media://voice/${"a".repeat(64)}`);
    expect(screen.getByRole("button", {name: "Listen through to approve"})).toBeDisabled();
    fireEvent.ended(player);
    const approve = screen.getByRole("button", {name: "Approve listened take"});
    await waitFor(() => expect(approve).toBeEnabled());
    await user.click(approve);

    expect(await screen.findByText("Approved bytes are render-bound")).toBeInTheDocument();
    expect(bridge.approveVoiceTrack).toHaveBeenCalledWith(expect.objectContaining({voiceTrackContentHash: "a".repeat(64), listenedThrough: true}));
  });

  it("exposes an honest manual ChatGPT Images exchange with downloadable briefs", async () => {
    const user = await createDefaultProduction();
    const createObjectURL = vi.fn(() => "blob:story-stage-brief");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", {configurable: true, value: createObjectURL});
    Object.defineProperty(URL, "revokeObjectURL", {configurable: true, value: revokeObjectURL});
    const writeText = vi.fn(async (_text: string) => {void _text;});
    Object.defineProperty(navigator, "clipboard", {configurable: true, value: {writeText}});
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
    expect(screen.getByRole("heading", {name: "ChatGPT image prompt queue"})).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", {name: /Copy prompt for/})[0]!);
    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText.mock.calls[0]![0]).toContain("Create ONE original image asset");
    expect(writeText.mock.calls[0]![0]).toContain("Return only the generated image");
    expect(screen.getByText("Copied")).toBeInTheDocument();

    await user.click(screen.getByText("RECONSTRUCTION", {selector: ".prompt-queue summary strong"}));
    await user.click(screen.getByRole("button", {name: "Copy prompt for RECONSTRUCTION set 1 candidate.png"}));
    expect(writeText.mock.calls[1]![0]).toContain("complete 16:9 editorial frame");
    expect(writeText.mock.calls[1]![0]).toContain("Do not embed labels or text");
  });

  it("maps loose ChatGPT downloads into a locally-created candidate bundle", async () => {
    const candidate = {candidateId: "loose-one", candidateSetId: null, originalName: "mara-download.png", briefId: null, fileRole: null, mediaType: "image/png" as const, width: 1024, height: 1024, stagingState: "staged-byte-verified" as const, checks: {dimensions: true, mediaType: true, alphaOrMatte: true, registration: false} as const};
    const bridge: StoryStageDesktopBridge = {
      getCapabilities: vi.fn(async () => ({localRendering: true, openRenderedFile: true, manualImageExchange: true, localAudioImport: true})),
      exportGenerationJob: vi.fn(async () => ({ok: true as const, jobId: "job-one", briefCount: 5})),
      importLooseCandidateFiles: vi.fn(async () => ({status: "mapping-required" as const, importId: "import-one", candidates: [candidate], expectedRoles: [{briefId: "brief-one", requirementId: "requirement-one", candidateSetId: "brief-one-set-1", candidateSetNumber: 1, entityName: "MARA", fileRole: "identity-sheet.png"}]})),
      finalizeLooseCandidateMapping: vi.fn(async () => ({status: "staged" as const, importId: "import-one", stagedCount: 1, needsManualMaskCount: 0, missingRoleCount: 0, candidates: [{...candidate, candidateSetId: "brief-one-set-1", briefId: "brief-one", fileRole: "identity-sheet.png"}]})),
      stageCandidateBundle: vi.fn(async () => ({status: "cancelled" as const})),
      saveProductionBundle: vi.fn(async () => ({ok: true as const, productionId: "production-one", revision: 1, contentHash: "a".repeat(64)})),
      listProductionBundles: vi.fn(async () => ({productions: []})),
      loadProductionBundle: vi.fn(async () => ({ok: false as const, error: {code: "NOT_FOUND", message: "Not found"}})),
      listGenerationExchanges: vi.fn(async () => ({exchanges: []})),
      getGenerationExchange: vi.fn(async () => ({ok: false as const, error: {code: "NOT_FOUND", message: "Not found"}})),
      prepareGenerationImport: vi.fn(async () => ({status: "failed" as const, error: {code: "NOT_READY", message: "Not ready"}})),
      reviewCandidateSet: vi.fn(async () => ({status: "failed" as const, error: {code: "NOT_READY", message: "Not ready"}})),
      importVoiceTrack: vi.fn(async () => ({status: "cancelled" as const})),
      approveVoiceTrack: vi.fn(async () => ({ok: false as const, error: {code: "NOT_READY", message: "Not ready"}})),
      startSampleRender: vi.fn(async () => ({jobId: "render-one"})),
      startProductionRender: vi.fn(async () => ({jobId: "production-render-one"})),
      subscribeToRenderJobs: vi.fn(() => () => undefined),
      openRenderedFile: vi.fn(async () => ({ok: true as const})),
    };
    window.storyStage = bridge;
    const user = await createDefaultProduction();
    await user.click(screen.getByRole("button", {name: /Assets/}));
    await user.click(screen.getByRole("button", {name: /Review generation export/}));
    await user.click(screen.getByRole("button", {name: /Approve and export generation job/}));
    await user.click(screen.getByRole("button", {name: /Import loose image files/}));

    expect(screen.getByRole("heading", {name: /Map downloaded images/})).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Role for mara-download.png"), "1");
    await user.click(screen.getByRole("button", {name: /Create local candidate bundle/}));

    const validationReport = screen.getByRole("heading", {name: /Staged files are not prepared or approved assets/}).closest("section");
    expect(validationReport).not.toBeNull();
    expect(within(validationReport!).getByText(/identity-sheet.png/)).toBeInTheDocument();
  });

  it("lists and resumes a durable generation exchange after reopening a production", async () => {
    const summary = {exchangeJobId: "job-resumable", productionId: "production-the-punctual-box", revision: 1, title: "The Punctual Box", status: "awaiting-results" as const, briefCount: 3, importId: null, updatedAt: "2026-07-17T00:00:00.000Z"};
    window.storyStage = makeDesktopBridge({
      listGenerationExchanges: vi.fn(async () => ({exchanges: [summary]})),
      getGenerationExchange: vi.fn(async () => ({ok: true as const, summary, looseMapping: null, stagedCandidates: [], preparation: null, assetReviews: [], missingRoleCount: 0, findings: []})),
    });
    const user = await createDefaultProduction();
    await user.click(screen.getByRole("button", {name: /Assets/}));

    expect(await screen.findByRole("heading", {name: "Resume an image exchange"})).toBeInTheDocument();
    await user.click(screen.getByRole("button", {name: /The Punctual Box.*awaiting results/i}));

    expect(screen.getByText(/Resumed awaiting results exchange job-resumable/)).toBeInTheDocument();
    expect(screen.getByRole("button", {name: /Import generated results/})).toBeEnabled();
  });
});
