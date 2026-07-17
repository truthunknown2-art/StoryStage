import {
  buildAnimaticSync,
  candidateBundleSchema,
  createProductionDraft,
  generationJobDraftSchema,
  getShowPack,
  productionPolicies,
  sampleWorkshopScript,
  showPacks,
  type AnimaticBuild,
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
import {useEffect, useMemo, useState} from "react";
import {createHostAdapter, type HostAdapter} from "./host";
import type {DesktopCapabilities} from "@storystage/contracts";

type Screen = "home" | "new-production" | "workspace";
type WorkspaceTab = "direction" | "assets";

type ProductionSession = ProductionDraft & {
  overrides: ShotOverride[];
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

const treatments = ["environment", "character-performance", "reaction", "insert", "kinetic-type", "diagram", "licensed-media", "generated-illustration"] as const;
const framings = ["wide", "medium", "close-up", "insert"] as const;
const cameraActions = ["hardCut", "cameraPush", "pan", "reframe", "foregroundWipe"] as const;

const defaultRouting = (type: ProjectType): AssetRoutingPolicy => ({
  reuseApprovedFirst: true,
  generateMissing: true,
  licensedSources: type === "explainer" ? "factual-first" : "disabled",
  allowGeneratedHistoricalReconstruction: type === "explainer",
  proposed3D: "never",
});

const draftFromSession = ({overrides, ...draft}: ProductionSession): ProductionDraft => {
  void overrides;
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

function HomeScreen({onNew}: {onNew: () => void}) {
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
      onCreate({...draft, overrides: []});
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

function createGenerationJob(session: ProductionSession, build: AnimaticBuild): GenerationJobDraft {
  const pack = getShowPack(session.showPackId);
  return generationJobDraftSchema.parse({
    schemaVersion: "1.0",
    exchangeMode: "manual-chatgpt-images",
    production: {id: session.productionId, revision: session.revision, title: session.title},
    showPack: {id: pack.id, version: pack.version, contentHash: pack.contentHash},
    briefs: build.resolvedPlan.generationBriefs,
    expectedOutputLayout: {manifest: "candidate-bundle.json", files: "candidates/<brief-id>/<candidate-id>.png"},
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

function AssetExchange({session, build, host, capabilities}: {session: ProductionSession; build: AnimaticBuild; host: HostAdapter; capabilities: DesktopCapabilities}) {
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [reviewingExport, setReviewingExport] = useState(false);
  const [exchangeJobId, setExchangeJobId] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const [manualMaskCount, setManualMaskCount] = useState(0);
  const [missingRoleCount, setMissingRoleCount] = useState(0);
  const [importError, setImportError] = useState<string | null>(null);
  const generationJobDraft = useMemo(() => createGenerationJob(session, build), [build, session]);

  const exportBriefs = async () => {
    const payload = generationJobDraft;
    if (!capabilities.manualImageExchange) {
      downloadBriefs(session, payload);
      setExportStatus(`Generation job exported for ${payload.briefs.length} briefs.`);
      setReviewingExport(false);
      return;
    }
    const result = await host.exportGenerationJob({serializedJob: JSON.stringify(payload)});
    if (!result.ok) {
      setExportStatus(null);
      setImportError(result.error.message);
      return;
    }
    setImportError(null);
    setExchangeJobId(result.jobId);
    setReviewingExport(false);
    setExportStatus(`Private generation job exported for ${result.briefCount} briefs. Its folder is open.`);
  };

  const importBundle = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = candidateBundleSchema.parse(JSON.parse(await file.text()));
      setImportedCount(parsed.assets.length);
      setManualMaskCount(0);
      setMissingRoleCount(0);
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
    setImportedCount(result.preparedCount);
    setManualMaskCount(result.needsManualMaskCount);
    setMissingRoleCount(result.missingRoleCount);
    setImportError(null);
  };

  return (
    <div className="asset-exchange">
      <section className="provider-banner"><div className="provider-icon"><ImagePlus size={23} /></div><div><p className="eyebrow">Provider-neutral exchange</p><h2>Manual ChatGPT Images</h2><p>Export an approved brief, generate original candidates in ChatGPT, then import the result bundle. No API call or paid generation is hidden here.</p></div><span className="manual-badge">Manual round trip</span></section>
      <div className="exchange-actions">
        <button onClick={() => setReviewingExport(true)}><Download size={16} /><span><strong>Review generation export</strong><small>{capabilities.manualImageExchange ? "Nothing leaves before approval" : "JSON + expected output contract"}</small></span></button>
        {capabilities.manualImageExchange
          ? <button disabled={!exchangeJobId} onClick={() => void stageDesktopBundle()}><Upload size={16} /><span><strong>Import generated results</strong><small>{exchangeJobId ? "Secure native folder selection" : "Export a job first"}</small></span></button>
          : <label><Upload size={16} /><span><strong>Validate candidate manifest</strong><small>Browser preview only{" / "}no file staging</small></span><input aria-label="Import candidate bundle" type="file" accept="application/json,.json" onChange={(event) => void importBundle(event.target.files?.[0])} /></label>}
      </div>
      {reviewingExport ? <section className="export-review" aria-label="Generation export review">
        <header><div><p className="eyebrow">Human approval gate</p><h2>Exactly what will leave StoryStage</h2></div><span>{generationJobDraft.briefs.length} briefs</span></header>
        <p>The JSON contains the production title, minimum source excerpts, Show Pack and style hashes, reference-asset hashes, prompts, and expected file roles. It contains no ChatGPT credentials, cookies, local paths, or candidate images.</p>
        <div className="review-briefs">{generationJobDraft.briefs.map((brief) => <article key={brief.id}>
          <div><strong>{brief.entity.name}</strong><small>{brief.outputRole.replaceAll("-", " ")}{" / "}{brief.candidateCount} candidates</small></div>
          <p>{brief.sourceExcerpts.join(" ")}</p>
          <dl><div><dt>References</dt><dd>{brief.referenceAssets.length || "None"}</dd></div><div><dt>Expected</dt><dd>{brief.expectedFiles.join(", ")}</dd></div></dl>
        </article>)}</div>
        <footer><button className="quiet-button" onClick={() => setReviewingExport(false)}>Cancel</button><button className="create-button" onClick={() => void exportBriefs()}><ShieldCheck size={15} />Approve and export generation job</button></footer>
      </section> : null}
      {exportStatus ? <p className="exchange-status"><Check size={14} />{exportStatus}</p> : null}
      {importedCount > 0 ? <p className="exchange-status"><PackageCheck size={14} />{capabilities.manualImageExchange ? `Prepared ${importedCount} byte-verified candidates${manualMaskCount > 0 ? `; ${manualMaskCount} need a manual mask` : ""}${missingRoleCount > 0 ? `; ${missingRoleCount} expected roles are still missing` : ""}. Approval is the next gate.` : `Manifest contains ${importedCount} candidates. Open the desktop app to verify and stage the actual image bytes.`}</p> : null}
      {importError ? <p className="exchange-error" role="alert"><CircleAlert size={14} />{importError}</p> : null}
      <section className="request-list"><header><div><p className="eyebrow">Missing asset ledger</p><h2>{build.resolvedPlan.generationBriefs.length} generation briefs</h2></div><span>Approval required</span></header>
        {build.resolvedPlan.generationBriefs.map((request) => {
          return <article className="request-card" key={request.id}><span className="request-kind">{request.outputRole.replaceAll("-", " ")}</span><div><h3>{request.entity.name}</h3><p>{request.creativeRequirements[0]}</p></div><dl><div><dt>Candidates</dt><dd>{request.candidateCount}</dd></div><div><dt>Quality</dt><dd>{request.imageQuality}</dd></div><div><dt>Layers</dt><dd>{request.backgroundLayerTarget}</dd></div><div><dt>Pose pack</dt><dd>{request.posePack}</dd></div></dl><span className="request-state">{request.status}</span></article>;
        })}
      </section>
    </div>
  );
}

function Workspace({session, setSession, onExit, host, capabilities}: {session: ProductionSession; setSession: (next: ProductionSession) => void; onExit: () => void; host: HostAdapter; capabilities: DesktopCapabilities}) {
  const build = useMemo(() => buildAnimaticSync({draft: draftFromSession(session), overrides: session.overrides}), [session]);
  const [tab, setTab] = useState<WorkspaceTab>("direction");
  const [selectedShotId, setSelectedShotId] = useState(build.renderPlan.shots[0]!.id);
  const selectedShot = build.renderPlan.shots.find((shot) => shot.id === selectedShotId) ?? build.renderPlan.shots[0]!;
  const currentOverride = session.overrides.find((override) => override.shotId === selectedShot.id);
  const pack = getShowPack(session.showPackId);
  const averageShot = build.metrics.averageShotSeconds;
  const routed = ["insert", "kinetic-type", "diagram", "licensed-media", "generated-illustration"].reduce((sum, treatment) => sum + (build.metrics.treatmentDistribution[treatment] ?? 0), 0);

  const updateOverride = (patch: Partial<ShotOverride>) => {
    const nextOverride = {...currentOverride, shotId: selectedShot.id, ...patch};
    setSession({...session, overrides: [...session.overrides.filter((override) => override.shotId !== selectedShot.id), nextOverride]});
  };

  return (
    <div className="workspace-shell">
      <header className="workspace-topbar"><Brand /><button className="quiet-button" onClick={onExit}><ArrowLeft size={14} />Productions</button><div className="production-crumb"><span>{pack.displayName}</span><ChevronRight size={13} /><strong>{session.title}</strong></div><span className="saved-state"><Check size={13} />Active session</span></header>
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
              <label>Visual treatment<select aria-label="Visual treatment" value={currentOverride?.treatment ?? selectedShot.treatment} onChange={(event) => updateOverride({treatment: event.target.value as ShotOverride["treatment"]})}>{treatments.map((value) => <option key={value} value={value}>{value.replaceAll("-", " ")}</option>)}</select></label>
              <label>Camera action<select aria-label="Camera action" value={currentOverride?.cameraAction ?? ""} onChange={(event) => updateOverride({cameraAction: event.target.value ? event.target.value as ShotOverride["cameraAction"] : undefined})}><option value="">Profile default</option>{cameraActions.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
              <label>Performance gesture<select aria-label="Performance gesture" value={currentOverride?.gesture ?? ""} onChange={(event) => updateOverride({gesture: event.target.value ? event.target.value as ShotOverride["gesture"] : undefined})}><option value="">Profile default</option>{pack.allowedGestures.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
              <label>Background<select aria-label="Background asset" value={currentOverride?.locationAssetId ?? selectedShot.locationAssetId} onChange={(event) => updateOverride({locationAssetId: event.target.value})}>{pack.assets.filter((asset) => asset.kind === "location").map((asset) => <option key={asset.id} value={asset.id}>{asset.displayName}</option>)}</select></label>
              <div className="compiled-actions"><span>Compiled actions</span>{selectedShot.actions.map((action) => <div key={action.id}><b>{action.detail.type}</b><small>{action.endFrame - action.startFrame} fr</small></div>)}</div>
              {currentOverride ? <p className="override-state"><Check size={13} />Override compiled into the current render plan.</p> : <p className="override-help">Change a field to create a semantic override. No JSON editing required.</p>}
            </aside>
          </div>
        </> : <AssetExchange session={session} build={build} host={host} capabilities={capabilities} />}
      </main>
    </div>
  );
}

export function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [session, setSession] = useState<ProductionSession | null>(null);
  const [host] = useState(() => createHostAdapter(window.storyStage));
  const [capabilities, setCapabilities] = useState<DesktopCapabilities>({localRendering: false, openRenderedFile: false, manualImageExchange: false});

  useEffect(() => {
    window.scrollTo({top: 0, left: 0, behavior: "auto"});
  }, [screen]);

  useEffect(() => {
    void host.getCapabilities().then(setCapabilities);
  }, [host]);

  if (screen === "new-production") return <NewProductionScreen onBack={() => setScreen("home")} onCreate={(created) => {setSession(created); setScreen("workspace");}} />;
  if (screen === "workspace" && session) return <Workspace session={session} setSession={setSession} onExit={() => setScreen("home")} host={host} capabilities={capabilities} />;
  return <HomeScreen onNew={() => setScreen("new-production")} />;
}
