/* eslint-disable @remotion/warn-native-media-tag -- native media is intentional in the Electron review UI, outside a Remotion composition. */
import {
  buildAnimaticSync,
  candidateBundleSchema,
  createProductionDraft,
  generationJobDraftSchema,
  getShowPack,
  productionPolicies,
  productionBundleSchema,
  productionBundleDraftSchema,
  sampleWorkshopScript,
  showPacks,
  type AnimaticBuild,
  type ApprovedAssetVersion,
  type AssetRoutingPolicy,
  type GenerationJobDraft,
  type ProductionPreset,
  type ProductionDraft,
  type ProjectType,
  type ShotOverride,
} from "@storystage/story-engine";
import {
  Aperture,
  ArrowLeft,
  ArrowRight,
  Boxes,
  Check,
  ChevronRight,
  CircleAlert,
  Clapperboard,
  Download,
  FileText,
  Film,
  Gauge,
  ImagePlus,
  Layers3,
  Library,
  ListChecks,
  PackageCheck,
  PlayCircle,
  Plus,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Upload,
  WandSparkles,
} from "lucide-react";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {createHostAdapter, type HostAdapter} from "./host";
import type {CandidateSetReviewSummary, DesktopCapabilities, GenerationExchangeSummary, ImportLooseCandidateFilesResult, PreparationReview, ProductionBundleSummary, RenderJobEvent, StagedCandidateSummary} from "@storystage/contracts";

type LooseMappingState = Extract<ImportLooseCandidateFilesResult, {status: "mapping-required"}>;

type Screen = "home" | "new-production" | "workspace";
type WorkspaceTab = "direction" | "assets";

type ProductionSession = ProductionDraft & {
  overrides: ShotOverride[];
  approvedAssetVersions: ApprovedAssetVersion[];
};

const projectOptions: Array<{
  type: ProjectType;
  title: string;
  eyebrow: string;
  description: string;
  color: string;
  cadence: string;
  grammar: string;
}> = [
  {
    type: "kids",
    title: "Kids Adventure",
    eyebrow: "Movement + story",
    description: "Readable characters, layered worlds, participatory action, clear reactions, and lyric-aware movement loops.",
    color: "#ffd84a",
    cadence: "2.7-4.3s typical shots",
    grammar: "Performance first",
  },
  {
    type: "explainer",
    title: "Frankly Weird History",
    eyebrow: "Fast editorial explainer",
    description: "Narration-led hard cuts across presenter, evidence, type, diagrams, archival media, and labeled reconstruction.",
    color: "#ff6047",
    cadence: "1.9-3.0s typical shots",
    grammar: "Editorial reset first",
  },
];

const framings = ["wide", "medium", "close-up", "insert"] as const;
const cameraActions = ["cameraPush", "pan", "reframe"] as const;

const defaultRouting = (type: ProjectType): AssetRoutingPolicy => ({
  reuseApprovedFirst: true,
  generateMissing: true,
  licensedSources: type === "explainer" ? "factual-first" : "disabled",
  allowGeneratedHistoricalReconstruction: type === "explainer",
  proposed3D: "never",
});

const draftFromSession = ({overrides, approvedAssetVersions, ...draft}: ProductionSession): ProductionDraft => {
  void overrides;
  void approvedAssetVersions;
  return draft;
};

const profileCadence = (pack: ReturnType<typeof getShowPack>) => `${(pack.profile.cadence.minShotFrames / 30).toFixed(1)}-${(pack.profile.cadence.maxShotFrames / 30).toFixed(1)}s`;

const formatDuration = (frames: number, fps: number) => {
  const seconds = Math.round(frames / fps);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

function Brand() {
  return (
    <div className="brand-lockup">
      <span className="brand-glyph"><span /></span>
      <div><strong>StoryStage</strong><small>Directable production</small></div>
    </div>
  );
}

function HomeScreen({onNew, recentProductions, onResume}: {onNew: () => void; recentProductions: ProductionBundleSummary[]; onResume: (production: ProductionBundleSummary) => void}) {
  return (
    <div className="home-shell">
      <aside className="home-sidebar">
        <Brand />
        <nav aria-label="Workspace navigation">
          <button className="is-active"><Film size={17} />Productions</button>
          <button disabled><Library size={17} />Show Packs <span>Soon</span></button>
          <button disabled><Boxes size={17} />Asset library <span>Soon</span></button>
        </nav>
        <div className="sidebar-note">
          <ShieldCheck size={18} />
          <div><strong>Offline renderer</strong><small>Approved assets only</small></div>
        </div>
      </aside>
      <main className="home-main">
        <header className="home-header">
          <div><p className="eyebrow">Production desk</p><h1>Make the directing decisions<br />before the frames.</h1></div>
          <button className="primary-action" onClick={onNew}><Plus size={18} />New production</button>
        </header>
        <section className="home-intro">
          <div className="intro-copy">
            <span className="status-chip"><Sparkles size={13} />SS-002 in progress</span>
            <h2>Two production grammars.<br />One deterministic pipeline.</h2>
            <p>Start with a script and a real production policy. StoryStage extracts the cast and locations, directs profile-specific shots, identifies missing art, and freezes approved decisions for render.</p>
            <button className="secondary-action" onClick={onNew}>Create from script <ArrowRight size={16} /></button>
          </div>
          <div className="grammar-stack" aria-label="Available production types">
            {projectOptions.map((option) => (
              <article className="grammar-card" key={option.type} style={{"--grammar-color": option.color} as React.CSSProperties}>
                <div><span>{option.eyebrow}</span><h3>{option.title}</h3><p>{option.description}</p></div>
                <footer><strong>{option.cadence}</strong><span>{option.grammar}</span></footer>
              </article>
            ))}
          </div>
        </section>
        <section className="baseline-card">
          <div className="baseline-icon"><Clapperboard size={22} /></div>
          <div><p className="eyebrow">Infrastructure baseline</p><h3>SS-001 Walking Skeleton</h3><p>The secure desktop shell and deterministic renderer remain preserved as engineering infrastructure—not as the visual quality target.</p></div>
          <span className="accepted-badge"><Check size={14} />Accepted</span>
        </section>
        {recentProductions.length > 0 ? <section className="recent-productions"><header><div><p className="eyebrow">Private local projects</p><h2>Resume production</h2></div><span>{recentProductions.length} saved</span></header><div>{recentProductions.map((production) => <button key={`${production.productionId}:${production.revision}`} onClick={() => onResume(production)}><strong>{production.title}</strong><span>{production.projectType === "kids" ? "Kids Adventure" : "Frankly Weird History"} · revision {production.revision}</span><small>Saved {new Date(production.savedAt).toLocaleString()}</small></button>)}</div></section> : null}
      </main>
    </div>
  );
}

function PolicySummary({preset}: {preset: ProductionPreset}) {
  const policy = productionPolicies[preset];
  const values = [
    ["Maximum new assets", String(policy.maxNewAssets)],
    ["Image candidates", String(policy.imageCandidatesPerRequest)],
    ["Image quality", policy.imageQuality],
    ["Background layers", String(policy.backgroundLayerTarget)],
    ["Pose pack", policy.posePack],
    ["Shot density", `${policy.cadenceMultiplier}x`],
    ["Preview", `${policy.outputHeight}p`],
  ];
  return <dl className="policy-summary">{values.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

function NewProductionScreen({onBack, onCreate}: {onBack: () => void; onCreate: (session: ProductionSession) => void}) {
  const [type, setType] = useState<ProjectType>("explainer");
  const [title, setTitle] = useState("The Punctual Box");
  const [script, setScript] = useState(sampleWorkshopScript);
  const [preset, setPreset] = useState<ProductionPreset>("studio");
  const [routing, setRouting] = useState<AssetRoutingPolicy>(() => defaultRouting("explainer"));
  const [error, setError] = useState<string | null>(null);
  const pack = showPacks.find((candidate) => candidate.projectType === type)!;

  const preview = useMemo(() => {
    try {
      const draft = createProductionDraft({productionId: "production-preview", title, projectType: type, showPackId: pack.id, preset, script, assetRoutingPolicy: routing});
      return buildAnimaticSync({draft});
    } catch {
      return null;
    }
  }, [pack.id, preset, routing, script, title, type]);

  const chooseType = (nextType: ProjectType) => {
    setType(nextType);
    setRouting(defaultRouting(nextType));
  };

  const create = () => {
    try {
      const draft = createProductionDraft({productionId: `production-${Date.now().toString(36)}`, title, projectType: type, showPackId: pack.id, preset, script, assetRoutingPolicy: routing});
      buildAnimaticSync({draft});
      onCreate({...draft, overrides: [], approvedAssetVersions: []});
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The production could not be created.");
    }
  };

  return (
    <div className="new-shell">
      <header className="new-topbar"><Brand /><button className="quiet-button" onClick={onBack}><ArrowLeft size={15} />Productions</button><span className="step-label">New production · analysis first</span></header>
      <main className="new-main">
        <section className="new-heading"><p className="eyebrow">Production setup</p><h1>Choose how this story should think.</h1><p>Project type changes the actual directing and asset-routing policy. Nothing below is decorative.</p></section>

        <section className="setup-section" aria-labelledby="type-heading">
          <div className="section-number">01</div><div className="section-title"><h2 id="type-heading">Production type</h2><p>Select the broad storytelling grammar.</p></div>
          <div className="type-grid">
            {projectOptions.map((option) => (
              <button className={`type-card ${type === option.type ? "is-selected" : ""}`} key={option.type} onClick={() => chooseType(option.type)} style={{"--grammar-color": option.color} as React.CSSProperties}>
                <span className="type-icon">{option.type === "kids" ? <PlayCircle size={26} /> : <ScanSearch size={26} />}</span>
                <span className="type-copy"><small>{option.eyebrow}</small><strong>{option.title}</strong><span>{option.description}</span></span>
                <span className="select-mark">{type === option.type ? <Check size={15} /> : null}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="setup-section" aria-labelledby="pack-heading">
          <div className="section-number">02</div><div className="section-title"><h2 id="pack-heading">Show Pack + profile</h2><p>The lab identity and quantitative director selected by project type.</p></div>
          <div className="pack-card">
            <div className="pack-monogram" style={{background: pack.profile.accentColor}}>{type === "kids" ? "KA" : "WH"}</div>
            <div><small>Engineering Show Pack · not final branding</small><h3>{pack.displayName}</h3><p>{pack.profile.id} · v{pack.profile.version}</p></div>
            <dl><div><dt>Text</dt><dd>{pack.profile.textPolicy.mode.replaceAll("-", " ")}</dd></div><div><dt>Cadence</dt><dd>{profileCadence(pack)}</dd></div><div><dt>Asset factory</dt><dd>Manual ChatGPT Images</dd></div></dl>
          </div>
        </section>

        <section className="setup-section" aria-labelledby="script-heading">
          <div className="section-number">03</div><div className="section-title"><h2 id="script-heading">Script</h2><p>Paste screenplay-style text. Analysis updates before creation.</p></div>
          <div className="script-layout">
            <div className="script-editor"><label>Episode title<input aria-label="Episode title" value={title} onChange={(event) => setTitle(event.target.value)} /></label><label>Screenplay<textarea aria-label="Screenplay" value={script} onChange={(event) => setScript(event.target.value)} /></label></div>
            <aside className="analysis-preview">
              <div className="analysis-title"><FileText size={18} /><div><strong>Live analysis</strong><small>{preview ? "Script is structurally valid" : "Waiting for valid scene headings"}</small></div></div>
              {preview ? <>
                <div className="analysis-stats"><div><strong>{preview.creativePlan.scenes.length}</strong><span>Scenes</span></div><div><strong>{preview.storyAnalysis.characters.length}</strong><span>Characters</span></div><div><strong>{preview.storyAnalysis.locations.length}</strong><span>Locations</span></div><div><strong>{preview.storyAnalysis.props.length}</strong><span>Props</span></div></div>
                <div className="entity-cloud">{[...preview.storyAnalysis.characters, ...preview.storyAnalysis.locations, ...preview.storyAnalysis.props].map((entity) => <span key={entity.id}>{entity.name}</span>)}</div>
                <div className="duration-estimate"><Gauge size={16} /><span>Estimated animatic</span><strong>{formatDuration(preview.renderPlan.durationInFrames, preview.renderPlan.fps)}</strong></div>
              </> : <div className="analysis-empty"><CircleAlert size={21} />Begin with a heading such as <code>INT. WORKSHOP - MORNING</code>.</div>}
            </aside>
          </div>
        </section>

        <section className="setup-section" aria-labelledby="policy-heading">
          <div className="section-number">04</div><div className="section-title"><h2 id="policy-heading">Production preset</h2><p>Active limits for plan density, generated-art requirements, and preview size.</p></div>
          <div className="preset-row">{(["draft", "studio", "premium"] as const).map((value) => <button className={preset === value ? "is-selected" : ""} key={value} onClick={() => setPreset(value)}><span>{value === "draft" ? "Draft animatic" : value}</span><small>{value === "draft" ? "Fast proof" : value === "studio" ? "Balanced production" : "Extended asset pass"}</small>{preset === value ? <Check size={14} /> : null}</button>)}</div>
          <PolicySummary preset={preset} />
        </section>

        <section className="setup-section" aria-labelledby="assets-heading">
          <div className="section-number">05</div><div className="section-title"><h2 id="assets-heading">Asset strategy</h2><p>These rules change generated briefs and evidence routing.</p></div>
          <div className="strategy-grid">
            <label><input type="checkbox" checked={routing.reuseApprovedFirst} onChange={(event) => setRouting({...routing, reuseApprovedFirst: event.target.checked})} /><span><strong>Reuse approved assets first</strong><small>Prefer identity-locked local assets.</small></span></label>
            <label><input type="checkbox" checked={routing.generateMissing} onChange={(event) => setRouting({...routing, generateMissing: event.target.checked})} /><span><strong>Brief missing custom assets</strong><small>Export for ChatGPT Images; no paid call.</small></span></label>
            <label className={type === "kids" ? "is-disabled" : ""}><input type="checkbox" disabled={type === "kids"} checked={routing.licensedSources !== "disabled"} onChange={(event) => setRouting({...routing, licensedSources: event.target.checked ? "factual-first" : "disabled"})} /><span><strong>Authenticated sources first</strong><small>Archive/public domain/licensed media for factual evidence.</small></span></label>
            <label className={type === "kids" ? "is-disabled" : ""}><input type="checkbox" disabled={type === "kids"} checked={routing.allowGeneratedHistoricalReconstruction} onChange={(event) => setRouting({...routing, allowGeneratedHistoricalReconstruction: event.target.checked})} /><span><strong>Allow labeled reconstruction</strong><small>Generated history must never masquerade as archive.</small></span></label>
          </div>
        </section>

        <footer className="create-footer">
          <div>{preview ? <><PackageCheck size={18} /><span><strong>{preview.estimate.newRequirementCount} asset briefs</strong><small>{preview.estimate.shotCount} planned shots · {preview.estimate.deferredRequirementCount} deferred requirements</small></span></> : <><CircleAlert size={18} /><span><strong>Script needs attention</strong><small>Creation remains blocked until parsing succeeds.</small></span></>}</div>
          {error ? <p role="alert">{error}</p> : null}
          <button className="create-button" disabled={!preview || !title.trim()} onClick={create}>Create production <ArrowRight size={17} /></button>
        </footer>
      </main>
    </div>
  );
}

function Metric({label, value, detail}: {label: string; value: string; detail: string}) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

function DirectionBoard({build, selectedShotId, onSelect}: {build: AnimaticBuild; selectedShotId: string; onSelect: (id: string) => void}) {
  return (
    <div className="direction-board">
      <div className="board-disclaimer"><ScanSearch size={16} /><div><strong>Direction blueprint · no artwork preview</strong><span>Cards show treatment, framing, cadence, and transitions. Generated imagery appears only after import and approval.</span></div></div>
      {build.creativePlan.scenes.map((scene) => (
        <section className="board-scene" key={scene.id}>
          <header><div><span>Scene {String(scene.number).padStart(2, "0")}</span><h3>{scene.title}</h3></div><small>{scene.shotIds.length} shots</small></header>
          <div className="shot-grid">{scene.shotIds.map((id) => {
            const shot = build.renderPlan.shots.find((candidate) => candidate.id === id)!;
            return <button aria-label={`Select shot ${shot.number} ${shot.title}`} className={`shot-card ${selectedShotId === id ? "is-selected" : ""}`} key={id} onClick={() => onSelect(id)}>
              <div className={`shot-visual treatment-${shot.treatment}`}><span>{shot.treatment.replaceAll("-", " ")}</span><b>{shot.framing}</b></div>
              <div className="shot-copy"><span>{shot.number}</span><strong>{shot.title}</strong><small>{(shot.durationInFrames / build.renderPlan.fps).toFixed(1)}s · {shot.transition.replaceAll("-", " ")}</small></div>
            </button>;
          })}</div>
        </section>
      ))}
    </div>
  );
}

function createGenerationJob(session: ProductionSession, build: AnimaticBuild, productionBundleContentHash: string): GenerationJobDraft {
  const pack = getShowPack(session.showPackId);
  return generationJobDraftSchema.parse({
    schemaVersion: "1.0",
    exchangeMode: "manual-chatgpt-images",
    production: {id: session.productionId, revision: session.revision, title: session.title},
    productionBundleContentHash,
    showPack: {id: pack.id, version: pack.version, contentHash: pack.contentHash},
    briefs: build.resolvedPlan.generationBriefs,
    expectedOutputLayout: {manifest: "candidate-bundle.json", files: "candidates/<brief-id>/<candidate-set-id>/<file-role>"},
  });
}

function downloadBriefs(session: ProductionSession, payload: GenerationJobDraft) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], {type: "application/json"}));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${session.productionId}-generation-job.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function AssetExchange({session, build, host, capabilities, onApprovedAsset, productionBundleContentHash}: {session: ProductionSession; build: AnimaticBuild; host: HostAdapter; capabilities: DesktopCapabilities; onApprovedAsset: (approved: ApprovedAssetVersion) => void; productionBundleContentHash: string | null}) {
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [reviewingExport, setReviewingExport] = useState(false);
  const [exchangeJobId, setExchangeJobId] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const [manualMaskCount, setManualMaskCount] = useState(0);
  const [missingRoleCount, setMissingRoleCount] = useState(0);
  const [stagedCandidates, setStagedCandidates] = useState<StagedCandidateSummary[]>([]);
  const [looseMapping, setLooseMapping] = useState<LooseMappingState | null>(null);
  const [looseAssignments, setLooseAssignments] = useState<Record<string, string>>({});
  const [importError, setImportError] = useState<string | null>(null);
  const [exchangeSummaries, setExchangeSummaries] = useState<GenerationExchangeSummary[]>([]);
  const [preparation, setPreparation] = useState<PreparationReview | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [assetReviews, setAssetReviews] = useState<CandidateSetReviewSummary[]>([]);
  const [reviewingSetId, setReviewingSetId] = useState<string | null>(null);
  const generationJobDraft = useMemo(() => createGenerationJob(session, build, productionBundleContentHash ?? "0".repeat(64)), [build, productionBundleContentHash, session]);

  const refreshExchanges = useCallback(async () => {
    if (!capabilities.manualImageExchange) return;
    const result = await host.listGenerationExchanges({productionId: session.productionId});
    setExchangeSummaries(result.exchanges);
  }, [capabilities.manualImageExchange, host, session.productionId]);

  useEffect(() => {
    void refreshExchanges();
  }, [refreshExchanges]);

  const resumeExchange = async (exchange: GenerationExchangeSummary) => {
    const result = await host.getGenerationExchange({exchangeJobId: exchange.exchangeJobId});
    if (!result.ok) {
      setImportError(result.error.message);
      return;
    }
    setExchangeJobId(result.summary.exchangeJobId);
    setLooseMapping(result.looseMapping);
    setLooseAssignments(result.looseMapping ? Object.fromEntries(result.looseMapping.candidates.map((candidate) => [candidate.candidateId, ""])) : {});
    setStagedCandidates(result.stagedCandidates);
    setPreparation(result.preparation);
    setAssetReviews(result.assetReviews);
    setImportedCount(result.stagedCandidates.length);
    setManualMaskCount(result.stagedCandidates.filter((candidate) => !candidate.checks.alphaOrMatte).length);
    setMissingRoleCount(result.missingRoleCount);
    setImportError(null);
    setExportStatus(`Resumed ${result.summary.status.replaceAll("-", " ")} exchange ${result.summary.exchangeJobId}.`);
  };

  const exportBriefs = async () => {
    const payload = generationJobDraft;
    if (!capabilities.manualImageExchange) {
      downloadBriefs(session, payload);
      setExportStatus(`Generation job exported for ${payload.briefs.length} briefs.`);
      setReviewingExport(false);
      return;
    }
    if (!productionBundleContentHash) return;
    const result = await host.exportGenerationJob({serializedJob: JSON.stringify(payload), productionBundleContentHash});
    if (!result.ok) {
      setExportStatus(null);
      setImportError(result.error.message);
      return;
    }
    setImportError(null);
    setExchangeJobId(result.jobId);
    setLooseMapping(null);
    setStagedCandidates([]);
    setPreparation(null);
    setAssetReviews([]);
    setReviewingExport(false);
    setExportStatus(`Private generation job exported for ${result.briefCount} briefs. Its folder is open.`);
    await refreshExchanges();
  };

  const reviewCandidateSet = async (candidateSetId: string, decision: "select" | "approve" | "reject") => {
    if (!exchangeJobId) return;
    setReviewingSetId(candidateSetId);
    const result = await host.reviewCandidateSet({exchangeJobId, candidateSetId, decision, notes: decision === "select" ? "Selected after coherent contact-sheet comparison." : decision === "approve" ? "Finally approved after visual and technical rig review." : "Rejected during visual review."});
    setReviewingSetId(null);
    if (result.status === "failed") {
      setImportError(result.error.message);
      return;
    }
    setAssetReviews(result.decisions);
    if (result.approvedAssetVersion) onApprovedAsset(result.approvedAssetVersion);
    const refreshed = await host.getGenerationExchange({exchangeJobId});
    if (refreshed.ok) {
      setPreparation(refreshed.preparation);
      setAssetReviews(refreshed.assetReviews);
    }
    setExportStatus(`Candidate review recorded. Exchange is now ${result.exchangeStatus.replaceAll("-", " ")}.`);
    setImportError(null);
    await refreshExchanges();
  };

  const importBundle = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = candidateBundleSchema.parse(JSON.parse(await file.text()));
      setImportedCount(parsed.assets.length);
      setManualMaskCount(0);
      setMissingRoleCount(0);
      setStagedCandidates([]);
      setImportError(null);
    } catch (error) {
      setImportedCount(0);
      setImportError(error instanceof Error ? error.message : "Candidate bundle is invalid.");
    }
  };

  const stageDesktopBundle = async () => {
    if (!exchangeJobId) return;
    const result = await host.stageCandidateBundle({exchangeJobId});
    if (result.status === "cancelled") return;
    if (result.status === "failed") {
      setImportedCount(0);
      setManualMaskCount(0);
      setMissingRoleCount(0);
      setImportError(result.error.message);
      return;
    }
    setImportedCount(result.stagedCount);
    setManualMaskCount(result.needsManualMaskCount);
    setMissingRoleCount(result.missingRoleCount);
    setStagedCandidates(result.candidates);
    setPreparation(null);
    setImportError(null);
  };

  const importLooseFiles = async () => {
    if (!exchangeJobId) return;
    const result = await host.importLooseCandidateFiles({exchangeJobId});
    if (result.status === "cancelled") return;
    if (result.status === "failed") {
      setLooseMapping(null);
      setImportError(result.error.message);
      return;
    }
    setLooseMapping(result);
    setPreparation(null);
    setLooseAssignments(Object.fromEntries(result.candidates.map((candidate) => [candidate.candidateId, ""])));
    setImportError(null);
  };

  const finalizeLooseMapping = async () => {
    if (!looseMapping) return;
    const assignments = Object.entries(looseAssignments).flatMap(([candidateId, roleIndex]) => {
      if (!roleIndex) return [];
      const role = looseMapping.expectedRoles[Number(roleIndex) - 1];
      return role ? [{candidateId, candidateSetId: role.candidateSetId, briefId: role.briefId, fileRole: role.fileRole}] : [];
    });
    if (assignments.length === 0) return;
    const result = await host.finalizeLooseCandidateMapping({importId: looseMapping.importId, assignments});
    if (result.status !== "staged") {
      if (result.status === "failed") setImportError(result.error.message);
      return;
    }
    setImportedCount(result.stagedCount);
    setManualMaskCount(result.needsManualMaskCount);
    setMissingRoleCount(result.missingRoleCount);
    setStagedCandidates(result.candidates);
    setPreparation(null);
    setLooseMapping(null);
    setImportError(null);
    await refreshExchanges();
  };

  const prepareImport = async () => {
    if (!exchangeJobId) return;
    setPreparing(true);
    const result = await host.prepareGenerationImport({exchangeJobId});
    setPreparing(false);
    if (result.status === "failed") {
      setImportError(result.error.message);
      return;
    }
    setPreparation(result.review);
    setImportError(null);
    setExportStatus(`Prepared ${result.review.candidateSets.length} coherent candidate sets for visual review.`);
    await refreshExchanges();
  };

  return (
    <div className="asset-exchange">
      <section className="provider-banner"><div className="provider-icon"><ImagePlus size={23} /></div><div><p className="eyebrow">Provider-neutral exchange</p><h2>Manual ChatGPT Images</h2><p>Export an approved brief, generate original candidates in ChatGPT, then import the result bundle. No API call or paid generation is hidden here.</p></div><span className="manual-badge">Manual round trip</span></section>
      <div className={`exchange-actions ${capabilities.manualImageExchange ? "is-desktop" : ""}`}>
        <button disabled={capabilities.manualImageExchange && !productionBundleContentHash} onClick={() => setReviewingExport(true)}><Download size={16} /><span><strong>Review generation export</strong><small>{capabilities.manualImageExchange ? productionBundleContentHash ? "Bound to the acknowledged production snapshot" : "Waiting for the production snapshot to save" : "JSON + expected output contract"}</small></span></button>
        {capabilities.manualImageExchange
          ? <button disabled={!exchangeJobId} onClick={() => void stageDesktopBundle()}><Upload size={16} /><span><strong>Import generated results</strong><small>{exchangeJobId ? "Secure native folder selection" : "Export a job first"}</small></span></button>
          : <label><Upload size={16} /><span><strong>Validate candidate manifest</strong><small>Browser preview only{" / "}no file staging</small></span><input aria-label="Import candidate bundle" type="file" accept="application/json,.json" onChange={(event) => void importBundle(event.target.files?.[0])} /></label>}
        {capabilities.manualImageExchange ? <button disabled={!exchangeJobId} onClick={() => void importLooseFiles()}><ImagePlus size={16} /><span><strong>Import loose image files</strong><small>Map downloads to expected roles</small></span></button> : null}
        {capabilities.manualImageExchange ? <button disabled={!exchangeJobId || stagedCandidates.length === 0 || preparing} onClick={() => void prepareImport()}><WandSparkles size={16} /><span><strong>{preparing ? "Preparing image assets..." : "Prepare staged candidates"}</strong><small>Decode, normalize, register, and contact-sheet</small></span></button> : null}
      </div>
      {exchangeSummaries.length > 0 ? <section className="exchange-history" aria-label="Saved generation exchanges">
        <header><div><p className="eyebrow">Durable local handoffs</p><h2>Resume an image exchange</h2></div><span>{exchangeSummaries.length} saved</span></header>
        <div>{exchangeSummaries.map((exchange) => <button className={exchange.exchangeJobId === exchangeJobId ? "is-active" : ""} key={exchange.exchangeJobId} onClick={() => void resumeExchange(exchange)}>
          <span><strong>{exchange.title}</strong><small>{exchange.exchangeJobId} · revision {exchange.revision}</small></span><b>{exchange.status.replaceAll("-", " ")}</b>
        </button>)}</div>
      </section> : null}
      {reviewingExport ? <section className="export-review" aria-label="Generation export review">
        <header><div><p className="eyebrow">Human approval gate</p><h2>Exactly what will leave StoryStage</h2></div><span>{generationJobDraft.briefs.length} briefs</span></header>
        <p>The JSON contains the production title, minimum source excerpts, Show Pack and style hashes, reference-asset hashes, prompts, and expected file roles. It contains no ChatGPT credentials, cookies, local paths, or candidate images.</p>
        <div className="review-briefs">{generationJobDraft.briefs.map((brief) => <article key={brief.id}>
          <div><strong>{brief.entity.name}</strong><small>{brief.outputRole.replaceAll("-", " ")}{" / "}{brief.candidateCount} candidates</small></div>
          <p>{brief.sourceExcerpts.join(" ")}</p>
          <dl><div><dt>References</dt><dd>{brief.referenceAssets.length || "None"}</dd></div><div><dt>Style rules</dt><dd>{brief.styleBible.principles.join("; ")}</dd></div><div><dt>Expected</dt><dd>{brief.expectedFiles.join(", ")}</dd></div></dl>
        </article>)}</div>
        <footer><button className="quiet-button" onClick={() => setReviewingExport(false)}>Cancel</button><button className="create-button" onClick={() => void exportBriefs()}><ShieldCheck size={15} />Approve and export generation job</button></footer>
      </section> : null}
      {looseMapping ? <section className="mapping-panel" aria-label="Loose candidate role mapping">
        <header><div><p className="eyebrow">Loose-file fallback</p><h2>Map downloaded images to production roles</h2></div><span>{looseMapping.candidates.length} files</span></header>
        <p>Choose what each image actually represents. Leaving a file unused is safe; duplicate role assignments are rejected.</p>
        <div className="mapping-rows">{looseMapping.candidates.map((candidate) => <label key={candidate.candidateId}>
          <span><strong>{candidate.originalName}</strong><small>{candidate.width}×{candidate.height}{" / "}{candidate.mediaType.replace("image/", "")}{" / "}{candidate.stagingState.replaceAll("-", " ")}</small></span>
          <select aria-label={`Role for ${candidate.originalName}`} value={looseAssignments[candidate.candidateId] ?? ""} onChange={(event) => setLooseAssignments({...looseAssignments, [candidate.candidateId]: event.target.value})}>
            <option value="">Leave unused</option>
            {looseMapping.expectedRoles.map((role, index) => <option key={`${role.briefId}:${role.candidateSetId}:${role.fileRole}`} value={String(index + 1)}>{role.entityName} · set {role.candidateSetNumber} — {role.fileRole}</option>)}
          </select>
        </label>)}</div>
        <footer><button className="quiet-button" onClick={() => setLooseMapping(null)}>Cancel</button><button className="create-button" disabled={!Object.values(looseAssignments).some(Boolean)} onClick={() => void finalizeLooseMapping()}><PackageCheck size={15} />Create local candidate bundle</button></footer>
      </section> : null}
      {exportStatus ? <p className="exchange-status"><Check size={14} />{exportStatus}</p> : null}
      {importedCount > 0 ? <p className="exchange-status"><PackageCheck size={14} />{capabilities.manualImageExchange ? `Staged ${importedCount} byte-verified candidates${manualMaskCount > 0 ? `; ${manualMaskCount} need a manual mask` : ""}${missingRoleCount > 0 ? `; ${missingRoleCount} expected roles are still missing` : ""}. Preparation and approval remain separate gates.` : `Manifest contains ${importedCount} candidates. Open the desktop app to verify and stage the actual image bytes.`}</p> : null}
      {importError ? <p className="exchange-error" role="alert"><CircleAlert size={14} />{importError}</p> : null}
      {stagedCandidates.length > 0 ? <section className="validation-report"><header><div><p className="eyebrow">Import validation</p><h2>Staged files are not prepared or approved assets</h2></div><span>Preparation required</span></header><div>{stagedCandidates.map((candidate) => <article key={candidate.candidateId}><PackageCheck size={15} /><div><strong>{candidate.originalName}</strong><small>{candidate.candidateSetId ? `${candidate.candidateSetId} / ` : ""}{candidate.fileRole ? `${candidate.fileRole} / ` : ""}{candidate.width}×{candidate.height} / {candidate.stagingState.replaceAll("-", " ")}</small></div><span>{candidate.checks.alphaOrMatte ? "Alpha present / unregistered" : "Mask needed / unregistered"}</span></article>)}</div></section> : null}
      {preparation ? <section className="preparation-review" aria-label="Prepared candidate review">
        <header><div><p className="eyebrow">Prepared visual evidence</p><h2>Review the pixels, not just the paperwork</h2></div><span>{preparation.candidateSets.filter((candidateSet) => candidateSet.status === "ready-for-review").length}/{preparation.candidateSets.length} review-ready</span></header>
        <p>Compare coherent contact sheets first. Selecting a set then builds a moving rig diagnostic from its normalized local PNGs; final approval stays locked until that MP4 exists.</p>
        <div className="prepared-set-grid">{preparation.candidateSets.map((candidateSet) => <article className={candidateSet.status === "ready-for-review" ? "is-ready" : "needs-attention"} key={candidateSet.candidateSetId}>
          <div className="prepared-set-heading"><div><small>{candidateSet.outputRole.replaceAll("-", " ")}</small><h3>{candidateSet.entityName}</h3><span>{candidateSet.candidateSetId}</span></div><b>{assetReviews.find((review) => review.candidateSetId === candidateSet.candidateSetId)?.status ?? candidateSet.status.replaceAll("-", " ")}</b></div>
          {candidateSet.contactSheetDataUrl ? <img src={candidateSet.contactSheetDataUrl} alt={`${candidateSet.entityName} prepared candidate contact sheet`} /> : <div className="contact-sheet-empty"><CircleAlert size={20} />No reviewable contact sheet</div>}
          {candidateSet.rig ? <div className="rig-diagnostic"><span>Moving diagnostic / 4 seconds</span><video aria-label={`${candidateSet.entityName} moving rig diagnostic`} autoPlay controls loop muted playsInline src={candidateSet.rig.diagnosticVideoDataUrl} /></div> : null}
          <div className="prepared-role-list">{candidateSet.preparedCandidates.map((candidate) => <span key={candidate.candidateId}><strong>{candidate.fileRole}</strong><small>{candidate.width}x{candidate.height} Â· {candidate.assetClass.replaceAll("-", " ")}</small></span>)}</div>
          {candidateSet.failures.map((failure) => <p className="prepared-failure" key={failure.candidateId}><CircleAlert size={14} /><span><strong>{failure.fileRole}</strong>{failure.message}</span></p>)}
          <footer><span>{candidateSet.rig ? `${candidateSet.rig.type.replaceAll("-", " ")} / ${candidateSet.rig.validationStatus}` : "Compare before rigging"}</span><div><button disabled={candidateSet.status !== "ready-for-review" || reviewingSetId !== null || ["approved", "rejected"].includes(assetReviews.find((review) => review.candidateSetId === candidateSet.candidateSetId)?.status ?? "")} onClick={() => void reviewCandidateSet(candidateSet.candidateSetId, "reject")}>Reject</button><button className="approve-set" disabled={candidateSet.status !== "ready-for-review" || reviewingSetId !== null || ["approved", "rejected"].includes(assetReviews.find((review) => review.candidateSetId === candidateSet.candidateSetId)?.status ?? "") || (assetReviews.find((review) => review.candidateSetId === candidateSet.candidateSetId)?.status === "selected" && !candidateSet.rig)} onClick={() => void reviewCandidateSet(candidateSet.candidateSetId, assetReviews.find((review) => review.candidateSetId === candidateSet.candidateSetId)?.status === "selected" ? "approve" : "select")}>{reviewingSetId === candidateSet.candidateSetId ? "Building proof..." : assetReviews.find((review) => review.candidateSetId === candidateSet.candidateSetId)?.status === "selected" ? "Final approve" : "Select for rig"}</button></div></footer>
        </article>)}</div>
      </section> : null}
      <section className="request-list"><header><div><p className="eyebrow">Missing asset ledger</p><h2>{build.resolvedPlan.generationBriefs.length} generation briefs</h2></div><span>Approval required</span></header>
        {build.resolvedPlan.generationBriefs.map((request) => {
          return <article className="request-card" key={request.id}><span className="request-kind">{request.outputRole.replaceAll("-", " ")}</span><div><h3>{request.entity.name}</h3><p>{request.creativeRequirements[0]}</p></div><dl><div><dt>Candidates</dt><dd>{request.candidateCount}</dd></div><div><dt>Quality</dt><dd>{request.imageQuality}</dd></div><div><dt>Layers</dt><dd>{request.backgroundLayerTarget}</dd></div><div><dt>Pose pack</dt><dd>{request.posePack}</dd></div></dl><span className="request-state">{request.status}</span></article>;
        })}
      </section>
    </div>
  );
}

function Workspace({session, setSession, onExit, host, capabilities}: {session: ProductionSession; setSession: (next: ProductionSession) => void; onExit: () => void; host: HostAdapter; capabilities: DesktopCapabilities}) {
  const build = useMemo(() => buildAnimaticSync({draft: draftFromSession(session), overrides: session.overrides, approvedAssetVersions: session.approvedAssetVersions}), [session]);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const saveSequence = useRef(0);
  const [lastSavedHash, setLastSavedHash] = useState<string | null>(null);
  const [renderJob, setRenderJob] = useState<RenderJobEvent | null>(null);
  const [tab, setTab] = useState<WorkspaceTab>("direction");
  const [selectedShotId, setSelectedShotId] = useState(build.renderPlan.shots[0]!.id);
  const selectedShot = build.renderPlan.shots.find((shot) => shot.id === selectedShotId) ?? build.renderPlan.shots[0]!;
  const currentOverride = session.overrides.find((override) => override.shotId === selectedShot.id);
  const pack = getShowPack(session.showPackId);
  const averageShot = build.metrics.averageShotSeconds;
  const routed = ["insert", "kinetic-type", "diagram", "licensed-media", "generated-illustration"].reduce((sum, treatment) => sum + (build.metrics.treatmentDistribution[treatment] ?? 0), 0);

  useEffect(() => {
    if (!capabilities.manualImageExchange) return;
    const sequence = ++saveSequence.current;
    setLastSavedHash(null);
    const draft = productionBundleDraftSchema.parse({schemaVersion: "1.0", production: draftFromSession(session), overrides: session.overrides, approvedAssetVersions: session.approvedAssetVersions, resolvedPlan: build.resolvedPlan, renderPlan: build.renderPlan, metrics: build.metrics, estimate: build.estimate});
    saveQueue.current = saveQueue.current.then(async () => {
      const result = await host.saveProductionBundle({serializedDraft: JSON.stringify(draft)});
      if (result.ok && sequence === saveSequence.current) setLastSavedHash(result.contentHash);
    });
  }, [build, capabilities.manualImageExchange, host, session]);

  useEffect(() => host.subscribeToRenderJobs(setRenderJob), [host]);

  const renderApprovedSlice = async () => {
    try {
      const result = await host.startProductionRender({productionId: session.productionId, revision: session.revision});
      setRenderJob({jobId: result.jobId, status: "queued", progress: null, message: "Approved production slice queued"});
    } catch (error) {
      setRenderJob({jobId: "render-start", status: "failed", progress: null, message: error instanceof Error ? error.message : "Production render could not start.", error: {code: "RENDER_START_FAILED", message: error instanceof Error ? error.message : "Production render could not start."}});
    }
  };

  const updateOverride = (patch: Partial<ShotOverride>) => {
    const nextOverride = {...currentOverride, shotId: selectedShot.id, ...patch};
    setSession({...session, overrides: [...session.overrides.filter((override) => override.shotId !== selectedShot.id), nextOverride]});
  };

  const applyApprovedAsset = (approved: ApprovedAssetVersion) => {
    setSession({...session, revision: session.revision + 1, approvedAssetVersions: [...session.approvedAssetVersions.filter((asset) => asset.requirementId !== approved.requirementId), approved]});
  };

  return (
    <div className="workspace-shell">
      <header className="workspace-topbar"><Brand /><button className="quiet-button" onClick={onExit}><ArrowLeft size={14} />Productions</button><div className="production-crumb"><span>{pack.displayName}</span><ChevronRight size={13} /><strong>{session.title}</strong></div><span className="saved-state"><Check size={13} />{lastSavedHash ? `Saved ${lastSavedHash.slice(0, 8)}` : "Saving"}</span><button className="render-slice-button" disabled={!lastSavedHash || session.approvedAssetVersions.length === 0 || Boolean(renderJob && !["completed", "failed"].includes(renderJob.status))} onClick={() => void renderApprovedSlice()}><PlayCircle size={15} />{renderJob && !["completed", "failed"].includes(renderJob.status) ? renderJob.message : "Render approved 24s slice"}</button>{renderJob?.status === "completed" ? <button className="quiet-button" onClick={() => void host.openRenderedFile(renderJob.jobId)}>Open MP4</button> : null}</header>
      <aside className="workspace-nav">
        <button className={tab === "direction" ? "is-active" : ""} onClick={() => setTab("direction")}><Aperture size={18} /><span>Direction</span></button>
        <button className={tab === "assets" ? "is-active" : ""} onClick={() => setTab("assets")}><Layers3 size={18} /><span>Assets</span><b>{build.resolvedPlan.generationBriefs.length}</b></button>
        <div className="nav-spacer" />
        <button disabled><ListChecks size={18} /><span>Preflight</span></button>
      </aside>
      <main className="workspace-main">
        <header className="workspace-heading"><div><p className="eyebrow">{tab === "direction" ? "Profile-driven plan" : "Generated-asset exchange"}</p><h1>{session.title}</h1><p>{pack.profile.id} · {session.preset} · {build.creativePlan.scenes.length} scenes</p></div><span className="profile-chip" style={{"--profile": pack.profile.accentColor} as React.CSSProperties}>{pack.projectType === "kids" ? "Kids Adventure" : "Editorial Explainer"}</span></header>
        {tab === "direction" ? <>
          <section className="metrics-row"><Metric label="Planned shots" value={String(build.renderPlan.shots.length)} detail={`${build.creativePlan.scenes.length} natural scenes`} /><Metric label="Average shot" value={`${averageShot.toFixed(1)}s`} detail={`${profileCadence(pack)} profile envelope`} /><Metric label="Editorial routing" value={`${Math.round(routed * 100)}%`} detail="Insert, evidence, type, diagram" /><Metric label="Estimated runtime" value={formatDuration(build.renderPlan.durationInFrames, build.renderPlan.fps)} detail={`${build.renderPlan.fps} fps · ${build.renderPlan.height}p`} /></section>
          <div className="workspace-grid">
            <DirectionBoard build={build} selectedShotId={selectedShot.id} onSelect={setSelectedShotId} />
            <aside className="shot-inspector">
              <header><div><p className="eyebrow">Shot inspector</p><h2>{selectedShot.number}</h2></div><span>{selectedShot.treatment.replaceAll("-", " ")}</span></header>
              <div className="intent-card"><WandSparkles size={19} /><div><small>Selected intent</small><strong>{selectedShot.title}</strong><p>{selectedShot.caption ?? selectedShot.actions[0]!.label}</p></div></div>
              <label>Framing<select aria-label="Shot framing" value={currentOverride?.framing ?? selectedShot.framing} onChange={(event) => updateOverride({framing: event.target.value as ShotOverride["framing"]})}>{framings.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
              <div className="locked-field"><span>Visual treatment</span><strong>{selectedShot.treatment.replaceAll("-", " ")}</strong><small>Profile-directed; editable treatment routing arrives with Gate 8.</small></div>
              <label>Camera action<select aria-label="Camera action" value={currentOverride?.cameraAction ?? ""} onChange={(event) => updateOverride({cameraAction: event.target.value ? event.target.value as ShotOverride["cameraAction"] : undefined})}><option value="">Profile default</option>{cameraActions.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
              <label>Performance gesture<select aria-label="Performance gesture" value={currentOverride?.gesture ?? ""} onChange={(event) => updateOverride({gesture: event.target.value ? event.target.value as ShotOverride["gesture"] : undefined})}><option value="">Profile default</option>{pack.allowedGestures.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
              <div className="locked-field"><span>Resolved background</span><strong>{pack.assets.find((asset) => asset.id === selectedShot.locationAssetId)?.displayName ?? selectedShot.locationAssetId}</strong><small>Change the approved visual requirement, not the frozen render binding.</small></div>
              <div className="compiled-actions"><span>Compiled actions</span>{selectedShot.actions.map((action) => <div key={action.id}><b>{action.detail.type}</b><small>{action.endFrame - action.startFrame} fr</small></div>)}</div>
              {currentOverride ? <p className="override-state"><Check size={13} />Override compiled into the current render plan.</p> : <p className="override-help">Change a field to create a semantic override. No JSON editing required.</p>}
            </aside>
          </div>
        </> : <AssetExchange session={session} build={build} host={host} capabilities={capabilities} onApprovedAsset={applyApprovedAsset} productionBundleContentHash={lastSavedHash} />}
      </main>
    </div>
  );
}

export function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [session, setSession] = useState<ProductionSession | null>(null);
  const [host] = useState(() => createHostAdapter(window.storyStage));
  const [capabilities, setCapabilities] = useState<DesktopCapabilities>({localRendering: false, openRenderedFile: false, manualImageExchange: false});
  const [recentProductions, setRecentProductions] = useState<ProductionBundleSummary[]>([]);

  useEffect(() => {
    window.scrollTo({top: 0, left: 0, behavior: "auto"});
  }, [screen]);

  useEffect(() => {
    void host.getCapabilities().then(setCapabilities);
    void host.listProductionBundles().then((result) => setRecentProductions(result.productions));
  }, [host]);

  const resumeProduction = async (production: ProductionBundleSummary) => {
    const result = await host.loadProductionBundle({productionId: production.productionId, revision: production.revision});
    if (!result.ok) return;
    const bundle = productionBundleSchema.parse(JSON.parse(result.serializedBundle));
    setSession({...bundle.production, overrides: bundle.overrides, approvedAssetVersions: bundle.approvedAssetVersions ?? []});
    setScreen("workspace");
  };

  const returnHome = async () => {
    const result = await host.listProductionBundles();
    setRecentProductions(result.productions);
    setScreen("home");
  };

  if (screen === "new-production") return <NewProductionScreen onBack={() => setScreen("home")} onCreate={(created) => {setSession(created); setScreen("workspace");}} />;
  if (screen === "workspace" && session) return <Workspace session={session} setSession={setSession} onExit={() => void returnHome()} host={host} capabilities={capabilities} />;
  return <HomeScreen onNew={() => setScreen("new-production")} recentProductions={recentProductions} onResume={(production) => void resumeProduction(production)} />;
}
