import {act, cleanup, fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach, describe, expect, it, vi} from "vitest";
import type {StoryStageDesktopBridge} from "@storystage/contracts";
import {audioMixSchema, buildAnimaticSync, createRookPilot001Fixture, finalizeProductionBundle, getFullProductionRenderBlockers, type ApprovedAssetVersion} from "@storystage/story-engine";
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
  await user.click(screen.getByRole("button", {name: "Create first cut"}));
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
    listPublicShowPackCandidates: vi.fn(async () => ({candidates: []})),
    reviewPublicShowPackCandidate: vi.fn(async () => ({status: "failed" as const, error: {code: "NOT_READY", message: "Not ready"}})),
    importVoiceTrack: vi.fn(async () => ({status: "cancelled" as const})),
    approveVoiceTrack: vi.fn(async () => ({ok: false as const, error: {code: "NOT_READY", message: "Not ready"}})),
    importMusicTrack: vi.fn(async () => ({status: "cancelled" as const})),
    approveMusicTrack: vi.fn(async () => ({ok: false as const, error: {code: "NOT_READY", message: "Not ready"}})),
    importSoundEffect: vi.fn(async () => ({status: "cancelled" as const})),
    approveSoundEffect: vi.fn(async () => ({ok: false as const, error: {code: "NOT_READY", message: "Not ready"}})),
    startSampleRender: vi.fn(async () => ({jobId: "render-one"})),
    startProductionRender: vi.fn(async () => ({jobId: "production-render-one"})),
    subscribeToRenderJobs: vi.fn(() => () => undefined),
    openRenderedFile: vi.fn(async () => ({ok: true as const})),
    getVerifiedDelivery: vi.fn(async () => ({delivery: null})),
    openDeliveryMaster: vi.fn(async () => ({ok: true as const})),
    revealDeliveryBundle: vi.fn(async () => ({ok: true as const})),
    ...overrides,
  };
}

const rookCandidateSummary = {candidateId: "weird-history-rook-v1", version: "1.0.0", showPackId: "weird-history-editorial-v1", displayName: "Rook editorial presenter", status: "candidate-needs-human-review" as const, contentHash: "6c60b1fa633a4c3c7e9a32cbe475a52277f38b7d5cf2e239b0acee2ada85c691", identityLock: "Angular swept-back dark hair and a vermilion scarf.", provenance: {provider: "ChatGPT Images", usageNotes: "Human review required."}, files: [{role: "identity-sheet" as const, url: "/identity.png", width: 1536, height: 1024}, {role: "neutral-pose" as const, url: "/neutral.png", width: 1600, height: 1800}, {role: "talk-pose" as const, url: "/talk.png", width: 1600, height: 1800}, {role: "reaction-pose" as const, url: "/reaction.png", width: 1600, height: 1800}], diagnosticUrl: "/diagnostic.mp4", verifiedByHost: true, canReview: true, review: {decision: "none" as const}};

function createApprovedRookTargetBundle() {
  const fixture = createRookPilot001Fixture();
  const source = buildAnimaticSync(fixture);
  const presenter = source.resolvedPlan.characters.find((entry) => entry.entityName === "NARRATOR")!;
  const requirement = source.resolvedPlan.requirements.find((entry) => entry.role === "character" && entry.entityId === presenter.entityId)!;
  const approved: ApprovedAssetVersion = {assetId: `approved-weird-history-rook-v1-${requirement.id}`, version: "sha256-rook", requirementId: requirement.id, contentHash: "a".repeat(64), relativeFile: `approved-weird-history-rook-v1-${requirement.id}/sha256-rook/manifest.json`, provenance: {sourceType: "generated", provider: "ChatGPT Images", usageNotes: "Human reviewed."}, approvedAt: "2026-07-17T20:30:00.000Z"};
  const draft = {...fixture.draft, revision: 2};
  const build = buildAnimaticSync({draft, overrides: fixture.overrides, approvedAssetVersions: [approved]});
  const audioMix = audioMixSchema.parse({profile: "explainer", voiceGain: 1, musicDecision: "pending", musicGain: .1, musicLoop: true, transitionSfx: "paper-flip", transitionSfxGain: .14, reviewed: false});
  return finalizeProductionBundle({schemaVersion: "1.0", production: draft, overrides: fixture.overrides, approvedAssetVersions: [approved], audioMix, soundEffectAssets: [], soundEffectCues: [], resolvedPlan: build.resolvedPlan, renderPlan: build.renderPlan, metrics: build.metrics, estimate: build.estimate}, "2026-07-17T20:30:00.000Z");
}

function createGateReadyRookBundle() {
  const fixture = createRookPilot001Fixture();
  const source = buildAnimaticSync(fixture);
  const approvedAt = "2026-07-17T21:00:00.000Z";
  const approvedAssetVersions: ApprovedAssetVersion[] = source.resolvedPlan.requirements.map((requirement, index) => {
    const contentHash = (index + 1).toString(16).padStart(64, "0");
    const assetId = `approved-finish-${index + 1}`;
    return {assetId, version: contentHash.slice(0, 12), requirementId: requirement.id, contentHash, relativeFile: `${assetId}/${contentHash}/manifest.json`, provenance: {sourceType: "generated", provider: "ChatGPT Images", usageNotes: "Human-reviewed finish-flow test art."}, approvedAt};
  });
  const spokenShotIds = source.renderPlan.shots.filter((shot) => shot.actions.some((action) => action.detail.type === "talk") || Boolean(shot.caption)).map((shot) => shot.id);
  const overrides = source.renderPlan.shots.map((shot) => ({...fixture.overrides.find((override) => override.shotId === shot.id), shotId: shot.id, ...(spokenShotIds.includes(shot.id) ? {timingLocked: true as const} : {})}));
  const build = buildAnimaticSync({draft: fixture.draft, overrides, approvedAssetVersions});
  const audioMix = audioMixSchema.parse({profile: "explainer", voiceGain: 1, musicDecision: "none", musicGain: .1, musicLoop: true, transitionSfx: "paper-flip", transitionSfxGain: .14, reviewed: true});
  const voiceTrack = {id: "voice-finish-ready", contentHash: "f".repeat(64), relativeFile: `voice/${fixture.draft.productionId}/r${fixture.draft.revision}/${"f".repeat(64)}.wav`, sourceFileName: "final-rook-narration.wav", codec: "pcm-wav" as const, durationInSeconds: build.renderPlan.durationInFrames / build.renderPlan.fps, sampleRate: 48_000, channels: 1 as const, bitsPerSample: 24 as const, importedAt: approvedAt, approvalStatus: "approved" as const, approvedAt, rights: {sourceType: "user-owned" as const, provider: "Operator", usageNotes: "Original narration recording.", clearanceStatus: "cleared" as const, evidenceReference: "Operator recording ledger 2026-07-17"}};
  expect(getFullProductionRenderBlockers({approvedAssetVersions, audioMix, overrides, renderPlan: build.renderPlan, resolvedPlan: build.resolvedPlan, soundEffectAssets: [], soundEffectCues: [], voiceTrack})).toEqual([]);
  return finalizeProductionBundle({schemaVersion: "1.0", production: fixture.draft, overrides, approvedAssetVersions, audioMix, soundEffectAssets: [], soundEffectCues: [], voiceTrack, resolvedPlan: build.resolvedPlan, renderPlan: build.renderPlan, metrics: build.metrics, estimate: build.estimate}, approvedAt);
}

function refinalizeWithVoice(bundle: ReturnType<typeof createGateReadyRookBundle>, voiceTrack: NonNullable<ReturnType<typeof createGateReadyRookBundle>["voiceTrack"]>) {
  return finalizeProductionBundle({schemaVersion: "1.0", production: bundle.production, overrides: bundle.overrides, approvedAssetVersions: bundle.approvedAssetVersions ?? [], ...(bundle.audioMix ? {audioMix: bundle.audioMix} : {}), ...(bundle.musicTrack ? {musicTrack: bundle.musicTrack} : {}), soundEffectAssets: bundle.soundEffectAssets ?? [], soundEffectCues: bundle.soundEffectCues ?? [], voiceTrack, resolvedPlan: bundle.resolvedPlan, renderPlan: bundle.renderPlan, metrics: bundle.metrics, estimate: bundle.estimate}, bundle.savedAt);
}

describe("StoryStage studio", () => {
  it("opens a real production setup from the home screen", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole("heading", {name: /Make the directing decisions/})).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "New production"})).toBeEnabled();
    expect(screen.getByRole("button", {name: /Show Packs/})).toBeDisabled();

    await user.click(screen.getByRole("button", {name: "New production"}));

    expect(screen.getByRole("heading", {name: "Paste the script. Pick its directing brain."})).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Create first cut"})).toBeEnabled();
    expect(screen.getByRole("heading", {name: "Production type"})).toBeInTheDocument();
    expect((screen.getByLabelText("Screenplay") as HTMLTextAreaElement).value).toContain("INT. WORKSHOP");
    expect(screen.queryByText(/intensity/i)).not.toBeInTheDocument();
  });

  it("loads the fixed Rook Pilot 001 production template", async () => {
    const user = await openProductionSetup();
    await user.click(screen.getByRole("button", {name: /Load Rook Pilot 001/}));
    expect(screen.getByLabelText("Episode title")).toHaveValue("The Dancing Plague Had a Payroll");
    expect((screen.getByLabelText("Screenplay") as HTMLTextAreaElement).value).toContain("approved its entertainment budget");
    expect(screen.getByText(/First cut ready · 11 directed shots/)).toBeInTheDocument();
    expect(screen.getByText("0:26")).toBeInTheDocument();

    await user.click(screen.getByRole("button", {name: "Create first cut"}));
    const shotButtons = screen.getAllByRole("button", {name: /Select shot/});
    expect(shotButtons).toHaveLength(11);
    const preview = screen.getByRole("region", {name: "Live production preview"});
    expect(within(preview).getByText("UNAPPROVED CANDIDATE · PREVIEW ONLY")).toBeInTheDocument();
    expect(preview.querySelector('img[src*="rook-v1-neutral.png"]')).not.toBeNull();
    for (const button of shotButtons) expect(button).not.toHaveAccessibleName(/insert|licensed media|diagram|generated illustration/i);
    expect(screen.getAllByText("kinetic type").length).toBeGreaterThan(0);
  });

  it("adopts the exact main-owned Rook approval revision and saves the same acknowledged draft", async () => {
    const target = createApprovedRookTargetBundle();
    const saveProductionBundle = vi.fn(async (request: Parameters<StoryStageDesktopBridge["saveProductionBundle"]>[0]) => {
      const revision = (JSON.parse(request.serializedDraft) as {production: {revision: number}}).production.revision;
      return {ok: true as const, productionId: "rook-pilot-001", revision, contentHash: revision === 2 ? target.contentHash : "b".repeat(64)};
    });
    const loadProductionBundle = vi.fn(async () => ({ok: true as const, serializedBundle: JSON.stringify(target)}));
    const listPublicShowPackCandidates = vi.fn(async (request: Parameters<StoryStageDesktopBridge["listPublicShowPackCandidates"]>[0]) => ({candidates: [{...rookCandidateSummary, ...(request.revision === 2 ? {canReview: false, review: {decision: "approved" as const, decidedAt: "2026-07-17T20:30:00.000Z", targetProductionRevision: 2, targetProductionBundleContentHash: target.contentHash}} : {})}]}));
    window.storyStage = makeDesktopBridge({
      saveProductionBundle,
      loadProductionBundle,
      listPublicShowPackCandidates,
      reviewPublicShowPackCandidate: vi.fn(async () => ({status: "reviewed" as const, decision: "approved" as const, approvedAssetVersion: target.approvedAssetVersions![0]!, targetProductionRevision: 2, targetProductionBundleContentHash: target.contentHash})),
    });
    const user = await openProductionSetup();
    await user.click(screen.getByRole("button", {name: /Load Rook Pilot 001/}));
    await user.click(screen.getByRole("button", {name: "Create first cut"}));
    await waitFor(() => expect(screen.getByText(/Saved bbbbbbbb/)).toBeInTheDocument());
    await user.click(screen.getByRole("button", {name: /Assets/}));
    const reviewRegion = await screen.findByRole("generic", {name: "Rook review acknowledgements"});
    for (const checkbox of within(reviewRegion).getAllByRole("checkbox")) await user.click(checkbox);
    await user.click(screen.getByRole("button", {name: /Approve Rook and bind/}));
    await waitFor(() => expect(loadProductionBundle).toHaveBeenCalledWith({productionId: "rook-pilot-001", revision: 2}));
    await waitFor(() => expect(screen.getByText(/Saved [a-f0-9]{8}/)).toHaveTextContent(`Saved ${target.contentHash.slice(0, 8)}`));
    await waitFor(() => expect(listPublicShowPackCandidates).toHaveBeenCalledWith({productionId: "rook-pilot-001", revision: 2, productionBundleContentHash: target.contentHash}));
    const revisionTwoSave = saveProductionBundle.mock.calls.map(([request]) => JSON.parse(request.serializedDraft) as {production: {revision: number}; approvedAssetVersions?: ApprovedAssetVersion[]}).find((draft) => draft.production.revision === 2);
    expect(revisionTwoSave?.approvedAssetVersions?.[0]?.contentHash).toBe(target.approvedAssetVersions?.[0]?.contentHash);
    expect(screen.getByText("Approved and bound")).toBeInTheDocument();
  });

  it("shows a durable rejected Rook decision without offering incompatible actions", async () => {
    const listPublicShowPackCandidates = vi.fn(async () => ({candidates: [{...rookCandidateSummary, canReview: false, review: {decision: "rejected" as const, decidedAt: "2026-07-17T20:45:00.000Z"}}]}));
    window.storyStage = makeDesktopBridge({listPublicShowPackCandidates});
    const user = await openProductionSetup();
    await user.click(screen.getByRole("button", {name: /Load Rook Pilot 001/}));
    await user.click(screen.getByRole("button", {name: "Create first cut"}));
    await waitFor(() => expect(screen.getByText(/Saved aaaaaaaa/)).toBeInTheDocument());
    await user.click(screen.getByRole("button", {name: /Assets/}));
    expect(await screen.findByText("Rejected")).toBeInTheDocument();
    expect(screen.getByText("Rejected for this production revision. No asset was bound.")).toBeInTheDocument();
    expect(screen.queryByRole("button", {name: /Approve Rook and bind/})).not.toBeInTheDocument();
    expect(listPublicShowPackCandidates).toHaveBeenCalledWith({productionId: "rook-pilot-001", revision: 1, productionBundleContentHash: "a".repeat(64)});
  });

  it("rehydrates an exact verified delivery and exposes only main-owned open actions", async () => {
    const manifestHash = "d".repeat(64);
    const getVerifiedDelivery = vi.fn(async (request: Parameters<StoryStageDesktopBridge["getVerifiedDelivery"]>[0]) => ({delivery: {deliveryManifestContentHash: manifestHash, productionId: request.productionId, revision: request.revision, productionBundleContentHash: request.productionBundleContentHash, rightsStatus: "cleared" as const, captionCueCount: 11, master: {width: 1920 as const, height: 1080 as const, fps: 30 as const, frameCount: 792, durationInSeconds: 26.4}}}));
    const openDeliveryMaster = vi.fn(async () => ({ok: true as const}));
    const revealDeliveryBundle = vi.fn(async () => ({ok: true as const}));
    window.storyStage = makeDesktopBridge({getVerifiedDelivery, openDeliveryMaster, revealDeliveryBundle});
    const user = await createDefaultProduction();

    const banner = await screen.findByRole("region", {name: "Verified delivery"});
    expect(within(banner).getByText(/1080p master.*792 frames.*11 caption cues.*rights cleared/)).toBeInTheDocument();
    expect(getVerifiedDelivery).toHaveBeenCalledWith(expect.objectContaining({revision: 1, productionBundleContentHash: "a".repeat(64)}));
    await user.click(within(banner).getByRole("button", {name: "Open master"}));
    await user.click(within(banner).getByRole("button", {name: "Reveal bundle"}));
    expect(openDeliveryMaster).toHaveBeenCalledWith(manifestHash);
    expect(revealDeliveryBundle).toHaveBeenCalledWith(manifestHash);
    await user.click(screen.getByRole("button", {name: "Finish episode"}));
    expect(screen.getByRole("heading", {name: "Episode delivered"})).toBeInTheDocument();
    expect(screen.getByText("6/6 complete")).toBeInTheDocument();
    expect(screen.getByText(/Verified delivery is current/)).toBeInTheDocument();
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
    const preview = screen.getByRole("region", {name: "Live production preview"});
    expect(within(preview).getByRole("heading", {name: "Final composition, before export"})).toBeInTheDocument();
    expect(within(preview).getByText("UNAPPROVED CANDIDATE · PREVIEW ONLY")).toBeInTheDocument();
    expect(preview.querySelector('img[src*="rook-v1-neutral.png"]')).not.toBeNull();
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

  it("labels a silent first cut and routes its next upgrade to picture review", async () => {
    const user = await createDefaultProduction();
    const preview = screen.getByRole("region", {name: "Live production preview"});
    expect(within(preview).getByText("Silent first cut · add narration")).toBeInTheDocument();
    const path = within(preview).getByRole("region", {name: "First cut upgrade path"});
    expect(within(path).getByText("Next: Review picture")).toBeInTheDocument();
    expect(screen.getByRole("slider", {name: "Production playhead"})).toHaveValue("0");

    await user.click(within(path).getByRole("button", {name: "Review picture"}));
    expect(screen.getByRole("button", {name: /Assets/})).toHaveClass("is-active");
  });

  it("creates a profile-distinct Kids first cut without pretending placeholder art is approved", async () => {
    const user = await openProductionSetup();
    await user.click(screen.getByRole("button", {name: /Kids Adventure/}));
    await user.click(screen.getByRole("button", {name: "Create first cut"}));

    const preview = await screen.findByRole("region", {name: "Live production preview"});
    expect(screen.getByText(/kids-adventure-director-v1/)).toBeInTheDocument();
    expect(screen.getAllByText("Kids Adventure").some((element) => element.classList.contains("profile-chip"))).toBe(true);
    expect(within(preview).getByText("PLACEHOLDER PREVIEW · NOT APPROVED")).toBeInTheDocument();
    expect(within(preview).getByText("Silent first cut · add narration")).toBeInTheDocument();
  });

  it("routes approved composition pixels through the verified private media protocol without a preview watermark", async () => {
    const bundle = createGateReadyRookBundle();
    window.storyStage = makeDesktopBridge({
      listProductionBundles: vi.fn(async () => ({productions: [{productionId: bundle.production.productionId, revision: bundle.production.revision, title: bundle.production.title, projectType: bundle.production.projectType, showPackId: bundle.production.showPackId, savedAt: bundle.savedAt, contentHash: bundle.contentHash}]})),
      loadProductionBundle: vi.fn(async () => ({ok: true as const, serializedBundle: JSON.stringify(bundle)})),
      saveProductionBundle: vi.fn(async () => ({ok: true as const, productionId: bundle.production.productionId, revision: bundle.production.revision, contentHash: bundle.contentHash})),
    });
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", {name: new RegExp(bundle.production.title)}));

    const preview = await screen.findByRole("region", {name: "Live production preview"});
    await waitFor(() => expect(preview.querySelector('img[src^="storystage-media://asset/"]')).not.toBeNull());
    expect(within(preview).getByText("Approved media")).toBeInTheDocument();
    expect(within(preview).queryByText(/PREVIEW ONLY|NOT APPROVED/)).not.toBeInTheDocument();
  });

  it("turns preflight into an evidence-backed readiness view instead of a disabled placeholder", async () => {
    const user = await createDefaultProduction();
    await user.click(screen.getByRole("button", {name: "Finish episode"}));

    expect(screen.getByRole("heading", {name: "Finish episode"})).toBeInTheDocument();
    expect(screen.getByRole("region", {name: "Next finish action"})).toHaveTextContent("Review and approve picture");
    expect(screen.getByText(/asset approvals still required/)).toBeInTheDocument();
    expect(screen.getByText("Desktop renderer unavailable in this host.")).toBeInTheDocument();
    expect(screen.getByText(/Final delivery stays locked/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", {name: "Review artwork"}));
    expect(screen.getByRole("heading", {name: "Manual ChatGPT Images"})).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", {name: /Review generation export/})).toHaveFocus());

    await user.click(screen.getByRole("button", {name: "Finish episode"}));
    const voiceStep = screen.getByText("Approve the final voice").closest("li")!;
    await user.click(within(voiceStep).getByRole("button", {name: "Open"}));
    await waitFor(() => expect(document.getElementById("finish-voice-master")).toHaveFocus());

    await user.click(screen.getByRole("button", {name: "Finish episode"}));
    const timingStep = screen.getByText("Lock every spoken beat").closest("li")!;
    await user.click(within(timingStep).getByRole("button", {name: "Open"}));
    await waitFor(() => expect(screen.getAllByRole("button", {name: /Select timing cue/})[0]).toHaveFocus());

    await user.click(screen.getByRole("button", {name: "Finish episode"}));
    const mixStep = screen.getByText("Approve the final mix").closest("li")!;
    await user.click(within(mixStep).getByRole("button", {name: "Open"}));
    await waitFor(() => expect(screen.getByLabelText("Music decision")).toHaveFocus());
  });

  it("starts the exact full-production render from the guided finish path", async () => {
    const bundle = createGateReadyRookBundle();
    const startProductionRender = vi.fn(async () => ({jobId: "finish-render-one"}));
    let emitRenderJob: Parameters<StoryStageDesktopBridge["subscribeToRenderJobs"]>[0] | null = null;
    window.storyStage = makeDesktopBridge({
      listProductionBundles: vi.fn(async () => ({productions: [{productionId: bundle.production.productionId, revision: bundle.production.revision, title: bundle.production.title, projectType: bundle.production.projectType, showPackId: bundle.production.showPackId, savedAt: bundle.savedAt, contentHash: bundle.contentHash}]})),
      loadProductionBundle: vi.fn(async () => ({ok: true as const, serializedBundle: JSON.stringify(bundle)})),
      saveProductionBundle: vi.fn(async () => ({ok: true as const, productionId: bundle.production.productionId, revision: bundle.production.revision, contentHash: bundle.contentHash})),
      startProductionRender,
      subscribeToRenderJobs: vi.fn((listener) => {emitRenderJob = listener; return () => undefined;}),
    });
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", {name: new RegExp(bundle.production.title)}));
    await waitFor(() => expect(screen.getByText(`Saved ${bundle.contentHash.slice(0, 8)}`)).toBeInTheDocument());
    await user.click(screen.getByRole("button", {name: "Finish episode"}));

    expect(screen.getByRole("region", {name: "Next finish action"})).toHaveTextContent("Render and verify delivery");
    expect(screen.getByText("5/6 complete")).toBeInTheDocument();
    await user.click(screen.getByRole("button", {name: "Render & publish delivery"}));
    expect(startProductionRender).toHaveBeenCalledWith({productionId: bundle.production.productionId, revision: bundle.production.revision, scope: "full-production"});
    expect(screen.getByRole("button", {name: "Final render running"})).toBeDisabled();

    act(() => emitRenderJob?.({jobId: "unrelated-finish-render", status: "completed", progress: null, message: "Unrelated job completed", outputPath: "C:/private/unrelated.mp4", delivery: {deliveryManifestContentHash: "c".repeat(64), productionId: bundle.production.productionId, revision: bundle.production.revision, productionBundleContentHash: bundle.contentHash, rightsStatus: "cleared", captionCueCount: 11, master: {width: 1920, height: 1080, fps: 30, frameCount: bundle.renderPlan.durationInFrames, durationInSeconds: bundle.renderPlan.durationInFrames / bundle.renderPlan.fps}}}));
    expect(screen.queryByRole("region", {name: "Verified delivery"})).not.toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Final render running"})).toBeDisabled();

    act(() => emitRenderJob?.({jobId: "finish-render-one", status: "completed", progress: null, message: "Another production completed", outputPath: "C:/private/other.mp4", delivery: {deliveryManifestContentHash: "d".repeat(64), productionId: "another-production", revision: 1, productionBundleContentHash: "e".repeat(64), rightsStatus: "cleared", captionCueCount: 1, master: {width: 1920, height: 1080, fps: 30, frameCount: 30, durationInSeconds: 1}}}));
    expect(screen.queryByRole("region", {name: "Verified delivery"})).not.toBeInTheDocument();
    expect(screen.getByRole("heading", {name: "Finish episode"})).toBeInTheDocument();
    await user.click(screen.getByRole("button", {name: "Render & publish delivery"}));
    expect(startProductionRender).toHaveBeenCalledTimes(2);

    act(() => emitRenderJob?.({jobId: "finish-render-one", status: "failed", progress: null, message: "Encoding failed", error: {code: "ENCODE_FAILED", message: "The final encoder stopped."}}));
    expect((await screen.findAllByText("The final encoder stopped.")).length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", {name: "Retry final render"}));
    expect(startProductionRender).toHaveBeenCalledTimes(3);
  });

  it("shows and retries an immediate full-production start rejection", async () => {
    const bundle = createGateReadyRookBundle();
    const startProductionRender = vi.fn()
      .mockRejectedValueOnce(new Error("The renderer refused this final job."))
      .mockResolvedValueOnce({jobId: "finish-retry-one"});
    window.storyStage = makeDesktopBridge({
      listProductionBundles: vi.fn(async () => ({productions: [{productionId: bundle.production.productionId, revision: bundle.production.revision, title: bundle.production.title, projectType: bundle.production.projectType, showPackId: bundle.production.showPackId, savedAt: bundle.savedAt, contentHash: bundle.contentHash}]})),
      loadProductionBundle: vi.fn(async () => ({ok: true as const, serializedBundle: JSON.stringify(bundle)})),
      saveProductionBundle: vi.fn(async () => ({ok: true as const, productionId: bundle.production.productionId, revision: bundle.production.revision, contentHash: bundle.contentHash})),
      startProductionRender,
    });
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", {name: new RegExp(bundle.production.title)}));
    await waitFor(() => expect(screen.getByText(`Saved ${bundle.contentHash.slice(0, 8)}`)).toBeInTheDocument());
    await user.click(screen.getByRole("button", {name: "Finish episode"}));
    await user.click(screen.getByRole("button", {name: "Render & publish delivery"}));

    expect((await screen.findAllByText("The renderer refused this final job.")).length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", {name: "Retry final render"}));
    expect(startProductionRender).toHaveBeenLastCalledWith({productionId: bundle.production.productionId, revision: bundle.production.revision, scope: "full-production"});
    expect(screen.getByRole("button", {name: "Final render running"})).toBeDisabled();
  });

  it("replays a terminal render failure emitted before the start call returns its job ID", async () => {
    const bundle = createGateReadyRookBundle();
    let emitRenderJob: Parameters<StoryStageDesktopBridge["subscribeToRenderJobs"]>[0] | null = null;
    let attempt = 0;
    const startProductionRender = vi.fn(async () => {
      attempt += 1;
      if (attempt === 1) emitRenderJob?.({jobId: "early-worker-failure", status: "failed", progress: null, message: "Worker could not start", error: {code: "WORKER_START_FAILED", message: "Worker could not start"}});
      return {jobId: attempt === 1 ? "early-worker-failure" : "retry-after-early-failure"};
    });
    window.storyStage = makeDesktopBridge({
      listProductionBundles: vi.fn(async () => ({productions: [{productionId: bundle.production.productionId, revision: bundle.production.revision, title: bundle.production.title, projectType: bundle.production.projectType, showPackId: bundle.production.showPackId, savedAt: bundle.savedAt, contentHash: bundle.contentHash}]})),
      loadProductionBundle: vi.fn(async () => ({ok: true as const, serializedBundle: JSON.stringify(bundle)})),
      saveProductionBundle: vi.fn(async () => ({ok: true as const, productionId: bundle.production.productionId, revision: bundle.production.revision, contentHash: bundle.contentHash})),
      startProductionRender,
      subscribeToRenderJobs: vi.fn((listener) => {emitRenderJob = listener; return () => undefined;}),
    });
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", {name: new RegExp(bundle.production.title)}));
    await waitFor(() => expect(screen.getByText(`Saved ${bundle.contentHash.slice(0, 8)}`)).toBeInTheDocument());
    await user.click(screen.getByRole("button", {name: "Finish episode"}));
    await user.click(screen.getByRole("button", {name: "Render & publish delivery"}));

    expect(await screen.findAllByText("Worker could not start")).not.toHaveLength(0);
    await user.click(screen.getByRole("button", {name: "Retry final render"}));
    expect(startProductionRender).toHaveBeenLastCalledWith({productionId: bundle.production.productionId, revision: bundle.production.revision, scope: "full-production"});
    expect(screen.getByRole("button", {name: "Final render running"})).toBeDisabled();
  });

  it("blocks final delivery during an engineering render and then plays its completed output", async () => {
    const bundle = createGateReadyRookBundle();
    let emitRenderJob: Parameters<StoryStageDesktopBridge["subscribeToRenderJobs"]>[0] | null = null;
    const bridge = makeDesktopBridge({
      listProductionBundles: vi.fn(async () => ({productions: [{productionId: bundle.production.productionId, revision: bundle.production.revision, title: bundle.production.title, projectType: bundle.production.projectType, showPackId: bundle.production.showPackId, savedAt: bundle.savedAt, contentHash: bundle.contentHash}]})),
      loadProductionBundle: vi.fn(async () => ({ok: true as const, serializedBundle: JSON.stringify(bundle)})),
      saveProductionBundle: vi.fn(async () => ({ok: true as const, productionId: bundle.production.productionId, revision: bundle.production.revision, contentHash: bundle.contentHash})),
      startProductionRender: vi.fn(async () => ({jobId: "render-approved-one"})),
      subscribeToRenderJobs: vi.fn((listener) => {emitRenderJob = listener; return () => undefined;}),
    });
    window.storyStage = bridge;
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", {name: new RegExp(bundle.production.title)}));
    await waitFor(() => expect(screen.getByText(`Saved ${bundle.contentHash.slice(0, 8)}`)).toBeInTheDocument());
    await user.click(screen.getByRole("button", {name: "Render approved 24s slice"}));
    await user.click(screen.getByRole("button", {name: "Finish episode"}));
    expect(screen.getByRole("button", {name: "Preview render running"})).toBeDisabled();

    act(() => emitRenderJob?.({jobId: "render-approved-one", status: "completed", progress: null, message: "Approved production slice complete", outputPath: "C:/private/render-approved-one.mp4"}));
    await user.click(screen.getByRole("button", {name: "Direction"}));

    const player = await screen.findByLabelText("Approved render player");
    expect(player).toHaveAttribute("src", "storystage-media://render/render-approved-one");
    expect(screen.getByText(/actual H\.264 output/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", {name: /Seek rendered shot 1\.04/}));
    expect(screen.getByRole("slider", {name: "Approved render playhead"})).not.toHaveValue("0");
    expect(screen.getByRole("heading", {name: "1.04"})).toBeInTheDocument();
  });

  it("compiles inspector choices into semantic shot overrides", async () => {
    const user = await createDefaultProduction();
    const assetNavigationBefore = screen.getByRole("button", {name: /Assets/}).textContent;

    await user.selectOptions(screen.getByLabelText("Shot framing"), "close-up");
    await user.selectOptions(screen.getByLabelText("Visual treatment"), "generated-illustration");
    await user.selectOptions(screen.getByLabelText("Shot transition"), "brief-dissolve");
    await user.selectOptions(screen.getByLabelText("Camera action"), "pan");
    await user.selectOptions(screen.getByLabelText("Performance gesture"), "point");

    expect(screen.getByLabelText("Shot framing")).toHaveValue("close-up");
    expect(screen.getByLabelText("Visual treatment")).toHaveValue("generated-illustration");
    expect(screen.getByLabelText("Shot transition")).toHaveValue("brief-dissolve");
    expect(within(screen.getByLabelText("Rerouted visual requirements")).getByText("reconstruction")).toBeInTheDocument();
    expect(screen.getByRole("button", {name: /Assets/}).textContent).not.toBe(assetNavigationBefore);
    expect(screen.getByText("Override compiled into the current render plan.")).toBeInTheDocument();
    expect(screen.getAllByText("pan").some((element) => element.tagName === "B")).toBe(true);
    expect(screen.getAllByText("gesture").some((element) => element.tagName === "B")).toBe(true);
  });

  it("separates the engineering slice from the gated full-production render", async () => {
    const user = await createDefaultProduction();
    const scope = screen.getByLabelText("Render scope");
    expect(scope).toHaveValue("engineering-slice");
    await user.selectOptions(scope, "full-production");
    expect(screen.getByRole("button", {name: "Render full production"})).toBeDisabled();
    await user.click(screen.getByRole("button", {name: "Finish episode"}));
    expect(screen.getByText("Full production render gate")).toBeInTheDocument();
    expect(screen.getByText(/final-output gates remain/)).toBeInTheDocument();
  });

  it("shows generated Show Pack art as a review candidate without faking approval", async () => {
    const user = await createDefaultProduction();
    await user.click(screen.getByRole("button", {name: /Assets/}));
    expect(await screen.findByRole("heading", {name: "Rook editorial presenter"})).toBeInTheDocument();
    expect(screen.getByText("Needs human review")).toBeInTheDocument();
    expect(screen.getByAltText("Rook presenter canonical identity sheet")).toHaveAttribute("src", expect.stringContaining("identity-sheet"));
    expect(screen.getByAltText("Rook neutral pose")).toHaveAttribute("src", expect.stringContaining("rook-v1-neutral"));
    expect(screen.getByLabelText("Rook moving rig diagnostic")).toHaveAttribute("src", expect.stringContaining("rig-diagnostic-rook-v1"));
    expect(screen.getAllByText(/browser preview only/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", {name: /Approve Rook and bind/})).toBeDisabled();
    expect(screen.getByText(/desktop review is required/i)).toBeInTheDocument();
  });

  it("waits for delayed Rook verification and focuses the first unchecked acknowledgement", async () => {
    window.storyStage = makeDesktopBridge({
      listPublicShowPackCandidates: vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1_150));
        return {candidates: [rookCandidateSummary]};
      }),
    });
    const user = await openProductionSetup();
    await user.click(screen.getByRole("button", {name: /Load Rook Pilot 001/}));
    await user.click(screen.getByRole("button", {name: "Create first cut"}));
    await waitFor(() => expect(screen.getByText(/Saved aaaaaaaa/)).toBeInTheDocument());
    await user.click(screen.getByRole("button", {name: "Finish episode"}));
    await user.click(screen.getByRole("button", {name: "Review Rook"}));

    const reviewRegion = await screen.findByRole("generic", {name: "Rook review acknowledgements"}, {timeout: 3_000});
    await waitFor(() => expect(within(reviewRegion).getAllByRole("checkbox")[0]).toHaveFocus(), {timeout: 3_000});
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

    await user.click(screen.getByRole("button", {name: "Finish episode"}));
    expect(screen.getByText(/1\/\d+ narration or dialogue cues have editor-locked frame timing/)).toBeInTheDocument();
    expect(screen.getByRole("heading", {name: "Approved voice master bound"})).toBeInTheDocument();
  });

  it("imports, auditions, and approves an exact local WAV voice master", async () => {
    const importedTrack = {id: "voice-aaaaaaaaaaaaaaaaaaaa", contentHash: "a".repeat(64), relativeFile: `voice/production-placeholder/r1/${"a".repeat(64)}.wav`, sourceFileName: "narration-take-03.wav", codec: "pcm-wav" as const, durationInSeconds: 54, sampleRate: 48_000, channels: 1 as const, bitsPerSample: 16 as const, importedAt: "2026-07-17T12:00:00.000Z", approvalStatus: "imported" as const, approvedAt: null};
    let boundTrack = importedTrack;
    const bridge = makeDesktopBridge({
      importVoiceTrack: vi.fn(async (request) => {boundTrack = {...importedTrack, relativeFile: `voice/${request.productionId}/r${request.revision}/${"a".repeat(64)}.wav`}; return {status: "imported" as const, track: boundTrack};}),
      approveVoiceTrack: vi.fn(async (request) => ({ok: true as const, track: {...boundTrack, approvalStatus: "approved" as const, approvedAt: "2026-07-17T12:05:00.000Z", rights: request.rights}})),
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
    await user.type(screen.getByLabelText("Voice master rights evidence"), "Recorded and owned by the operator");
    await user.click(screen.getByLabelText("Voice master rights cleared"));
    const approve = screen.getByRole("button", {name: "Approve listened take"});
    await waitFor(() => expect(approve).toBeEnabled());
    await user.click(approve);

    expect(await screen.findByText("Approved bytes and rights are render-bound")).toBeInTheDocument();
    expect(bridge.approveVoiceTrack).toHaveBeenCalledWith(expect.objectContaining({
      voiceTrackContentHash: "a".repeat(64),
      listenedThrough: true,
      rights: expect.objectContaining({clearanceStatus: "cleared", evidenceReference: "Recorded and owned by the operator"}),
    }));
  });

  it("routes a legacy approved voice without rights through listen and re-confirmation", async () => {
    const ready = createGateReadyRookBundle();
    const legacyVoice = {...ready.voiceTrack!};
    delete legacyVoice.rights;
    const bundle = refinalizeWithVoice(ready, legacyVoice);
    const approveVoiceTrack = vi.fn(async (request: Parameters<StoryStageDesktopBridge["approveVoiceTrack"]>[0]) => ({ok: true as const, track: {...legacyVoice, rights: request.rights}}));
    window.storyStage = makeDesktopBridge({
      listProductionBundles: vi.fn(async () => ({productions: [{productionId: bundle.production.productionId, revision: bundle.production.revision, title: bundle.production.title, projectType: bundle.production.projectType, showPackId: bundle.production.showPackId, savedAt: bundle.savedAt, contentHash: bundle.contentHash}]})),
      loadProductionBundle: vi.fn(async () => ({ok: true as const, serializedBundle: JSON.stringify(bundle)})),
      saveProductionBundle: vi.fn(async () => ({ok: true as const, productionId: bundle.production.productionId, revision: bundle.production.revision, contentHash: bundle.contentHash})),
      approveVoiceTrack,
    });
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", {name: new RegExp(bundle.production.title)}));
    await waitFor(() => expect(screen.getByText(`Saved ${bundle.contentHash.slice(0, 8)}`)).toBeInTheDocument());
    await user.click(screen.getByRole("button", {name: "Finish episode"}));
    await user.click(screen.getByRole("button", {name: "Confirm voice rights"}));

    const player = await screen.findByLabelText("Imported voice master");
    await waitFor(() => expect(player).toHaveFocus());
    fireEvent.ended(player);
    await user.type(screen.getByLabelText("Voice master rights evidence"), "Legacy recording ownership ledger");
    await user.click(screen.getByLabelText("Voice master rights cleared"));
    await user.click(screen.getByRole("button", {name: "Re-confirm approved voice rights"}));
    expect(approveVoiceTrack).toHaveBeenCalledWith(expect.objectContaining({voiceTrackContentHash: legacyVoice.contentHash, listenedThrough: true, rights: expect.objectContaining({evidenceReference: "Legacy recording ownership ledger"})}));
  });

  it("routes a timing-locked misaligned approved voice to the replace WAV control", async () => {
    const ready = createGateReadyRookBundle();
    const bundle = refinalizeWithVoice(ready, {...ready.voiceTrack!, durationInSeconds: ready.voiceTrack!.durationInSeconds + 30});
    window.storyStage = makeDesktopBridge({
      listProductionBundles: vi.fn(async () => ({productions: [{productionId: bundle.production.productionId, revision: bundle.production.revision, title: bundle.production.title, projectType: bundle.production.projectType, showPackId: bundle.production.showPackId, savedAt: bundle.savedAt, contentHash: bundle.contentHash}]})),
      loadProductionBundle: vi.fn(async () => ({ok: true as const, serializedBundle: JSON.stringify(bundle)})),
      saveProductionBundle: vi.fn(async () => ({ok: true as const, productionId: bundle.production.productionId, revision: bundle.production.revision, contentHash: bundle.contentHash})),
    });
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", {name: new RegExp(bundle.production.title)}));
    await waitFor(() => expect(screen.getByText(`Saved ${bundle.contentHash.slice(0, 8)}`)).toBeInTheDocument());
    await user.click(screen.getByRole("button", {name: "Finish episode"}));
    await user.click(screen.getByRole("button", {name: "Replace voice WAV"}));

    await waitFor(() => expect(screen.getByRole("button", {name: "Replace WAV"})).toHaveFocus());
    expect(screen.queryByText(/could not open the exact finish control/i)).not.toBeInTheDocument();
  });

  it("imports, auditions, approves, and selects an exact local music master", async () => {
    const importedTrack = {id: "music-bbbbbbbbbbbbbbbbbbbb", contentHash: "b".repeat(64), relativeFile: `music/production-placeholder/r1/${"b".repeat(64)}.wav`, sourceFileName: "gentle-bed.wav", codec: "pcm-wav" as const, durationInSeconds: 45, sampleRate: 48_000, channels: 2 as const, bitsPerSample: 24 as const, importedAt: "2026-07-17T12:00:00.000Z", approvalStatus: "imported" as const, approvedAt: null};
    let boundTrack = importedTrack;
    const bridge = makeDesktopBridge({
      importMusicTrack: vi.fn(async (request) => {boundTrack = {...importedTrack, relativeFile: `music/${request.productionId}/r${request.revision}/${"b".repeat(64)}.wav`}; return {status: "imported" as const, track: boundTrack};}),
      approveMusicTrack: vi.fn(async () => ({ok: true as const, track: {...boundTrack, approvalStatus: "approved" as const, approvedAt: "2026-07-17T12:05:00.000Z"}})),
    });
    window.storyStage = bridge;
    const user = await createDefaultProduction();
    await user.click(screen.getByRole("button", {name: "Audio"}));
    const importButton = screen.getByRole("button", {name: "Import music WAV"});
    await waitFor(() => expect(importButton).toBeEnabled());
    await user.click(importButton);

    const player = await screen.findByLabelText("Imported music master");
    expect(player).toHaveAttribute("src", `storystage-media://music/${"b".repeat(64)}`);
    fireEvent.ended(player);
    await user.type(screen.getByLabelText("Music master rights evidence"), "Licensed music receipt 2026-07-17");
    await user.click(screen.getByLabelText("Music master rights cleared"));
    const approveMusic = screen.getByRole("button", {name: "Approve listened music"});
    await waitFor(() => expect(approveMusic).toBeEnabled());
    await user.click(approveMusic);
    expect(await screen.findByText("Approved music bytes and rights are render-bound")).toBeInTheDocument();
    expect(bridge.approveMusicTrack).toHaveBeenCalledWith(expect.objectContaining({
      musicTrackContentHash: "b".repeat(64),
      listenedThrough: true,
      rights: expect.objectContaining({clearanceStatus: "cleared", evidenceReference: "Licensed music receipt 2026-07-17"}),
    }));

    await user.selectOptions(screen.getByLabelText("Music decision"), "approved-master");
    expect(screen.getByLabelText("Music gain")).toBeEnabled();
    await user.click(screen.getByRole("button", {name: "Mark mix reviewed"}));
    await user.click(screen.getByRole("button", {name: "Finish episode"}));
    expect(screen.getByText(/music approved-master/)).toBeInTheDocument();
  });

  it("imports, approves, and places a custom SFX cue relative to a shot", async () => {
    const importedAsset = {id: "sfx-cccccccccccccccccccc", contentHash: "c".repeat(64), relativeFile: `sfx/production-placeholder/r1/${"c".repeat(64)}.wav`, sourceFileName: "clock-hit.wav", codec: "pcm-wav" as const, durationInSeconds: .8, sampleRate: 48_000, channels: 1 as const, bitsPerSample: 16 as const, importedAt: "2026-07-17T12:00:00.000Z", approvalStatus: "imported" as const, approvedAt: null};
    let boundAsset = importedAsset;
    const bridge = makeDesktopBridge({
      importSoundEffect: vi.fn(async (request) => {boundAsset = {...importedAsset, relativeFile: `sfx/${request.productionId}/r${request.revision}/${"c".repeat(64)}.wav`}; return {status: "imported" as const, track: boundAsset};}),
      approveSoundEffect: vi.fn(async () => ({ok: true as const, track: {...boundAsset, approvalStatus: "approved" as const, approvedAt: "2026-07-17T12:05:00.000Z"}})),
    });
    window.storyStage = bridge;
    const user = await createDefaultProduction();
    await user.click(screen.getByRole("button", {name: "Audio"}));
    const importButton = screen.getByRole("button", {name: "Import SFX WAV"});
    await waitFor(() => expect(importButton).toBeEnabled());
    await user.click(importButton);
    await screen.findByLabelText("Sound effect clock-hit.wav");
    await user.click(screen.getByRole("button", {name: "Finish episode"}));
    const mixStep = screen.getByText("Approve the final mix").closest("li")!;
    await user.click(within(mixStep).getByRole("button", {name: "Open"}));
    const player = await screen.findByLabelText("Sound effect clock-hit.wav");
    await waitFor(() => expect(player).toHaveFocus());
    fireEvent.ended(player);
    await user.type(screen.getByLabelText("Sound effect clock-hit.wav rights evidence"), "Original operator recording");
    await user.click(screen.getByLabelText("Sound effect clock-hit.wav rights cleared"));
    const approve = screen.getByRole("button", {name: "Approve listened SFX"});
    await waitFor(() => expect(approve).toBeEnabled());
    await user.click(approve);
    const place = await screen.findByRole("button", {name: /Place on 1\.01/});
    await user.click(place);

    expect(screen.getByLabelText("Offset frames for clock-hit")).toHaveValue(0);
    await user.clear(screen.getByLabelText("Offset frames for clock-hit"));
    await user.type(screen.getByLabelText("Offset frames for clock-hit"), "4");
    expect(screen.getByLabelText("Offset frames for clock-hit")).toHaveValue(4);
    expect(bridge.approveSoundEffect).toHaveBeenCalledWith(expect.objectContaining({
      soundEffectContentHash: "c".repeat(64),
      listenedThrough: true,
      rights: expect.objectContaining({clearanceStatus: "cleared", evidenceReference: "Original operator recording"}),
    }));

    await user.click(screen.getByRole("button", {name: "Finish episode"}));
    expect(screen.getByText(/1\/1 effects approved · 1 shot-relative cues placed/)).toBeInTheDocument();
  });

  it("requires explicit profile-aware music and SFX mix decisions", async () => {
    const user = await createDefaultProduction();
    await user.click(screen.getByRole("button", {name: "Audio"}));

    expect(screen.getByRole("heading", {name: "Voice, music & transition SFX"})).toBeInTheDocument();
    expect(screen.getByLabelText("Transition SFX")).toHaveValue("paper-flip");
    expect(screen.getByRole("button", {name: "Resolve music first"})).toBeDisabled();
    await user.selectOptions(screen.getByLabelText("Music decision"), "none");
    await user.selectOptions(screen.getByLabelText("Transition SFX"), "off");
    await user.click(screen.getByRole("button", {name: "Mark mix reviewed"}));
    expect(screen.getByText("reviewed")).toBeInTheDocument();

    await user.click(screen.getByRole("button", {name: "Finish episode"}));
    expect(screen.getByText("Music and SFX decisions reviewed")).toBeInTheDocument();
    expect(screen.getByText(/music none · transition SFX off/)).toBeInTheDocument();
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
      listPublicShowPackCandidates: vi.fn(async () => ({candidates: []})),
      reviewPublicShowPackCandidate: vi.fn(async () => ({status: "failed" as const, error: {code: "NOT_READY", message: "Not ready"}})),
      importVoiceTrack: vi.fn(async () => ({status: "cancelled" as const})),
      approveVoiceTrack: vi.fn(async () => ({ok: false as const, error: {code: "NOT_READY", message: "Not ready"}})),
      importMusicTrack: vi.fn(async () => ({status: "cancelled" as const})),
      approveMusicTrack: vi.fn(async () => ({ok: false as const, error: {code: "NOT_READY", message: "Not ready"}})),
      importSoundEffect: vi.fn(async () => ({status: "cancelled" as const})),
      approveSoundEffect: vi.fn(async () => ({ok: false as const, error: {code: "NOT_READY", message: "Not ready"}})),
      startSampleRender: vi.fn(async () => ({jobId: "render-one"})),
      startProductionRender: vi.fn(async () => ({jobId: "production-render-one"})),
      subscribeToRenderJobs: vi.fn(() => () => undefined),
      openRenderedFile: vi.fn(async () => ({ok: true as const})),
      getVerifiedDelivery: vi.fn(async () => ({delivery: null})),
      openDeliveryMaster: vi.fn(async () => ({ok: true as const})),
      revealDeliveryBundle: vi.fn(async () => ({ok: true as const})),
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
