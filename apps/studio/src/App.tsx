/* eslint-disable @remotion/warn-native-media-tag -- native media is intentional in the Electron review UI, outside a Remotion composition. */
import {
  audioMixSchema,
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
  type AudioMix,
  type ApprovedAssetVersion,
  type AssetRoutingPolicy,
  type GenerationBrief,
  type GenerationJobDraft,
  type MusicTrack,
  type ProductionPreset,
  type ProductionDraft,
  type ProjectType,
  type ShotOverride,
  type ShotTreatment,
  type VoiceTrack,
  musicTrackSchema,
  soundEffectAssetSchema,
  soundEffectCueSchema,
  type SoundEffectAsset,
  type SoundEffectCue,
  voiceTrackSchema,
} from "@storystage/story-engine";
import {
  Aperture,
  ArrowLeft,
  ArrowRight,
  Boxes,
  Check,
  ChevronRight,
  CircleAlert,
  CirclePause,
  Clapperboard,
  Copy,
  Download,
  FileText,
  Film,
  Gauge,
  ImagePlus,
  Layers3,
  Library,
  ListChecks,
  Lock,
  Mic2,
  PackageCheck,
  PlayCircle,
  Plus,
  RotateCcw,
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
type WorkspaceTab = "direction" | "assets" | "audio" | "preflight";

type ProductionSession = ProductionDraft & {
  overrides: ShotOverride[];
  approvedAssetVersions: ApprovedAssetVersion[];
  audioMix: AudioMix;
  musicTrack: MusicTrack | null;
  soundEffectAssets: SoundEffectAsset[];
  soundEffectCues: SoundEffectCue[];
  voiceTrack: VoiceTrack | null;
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
const treatments: ShotTreatment[] = ["environment", "character-performance", "reaction", "insert", "kinetic-type", "diagram", "licensed-media", "generated-illustration"];
const cameraActions = ["cameraPush", "pan", "reframe"] as const;
const transitionStyles = ["hard-cut", "foreground-wipe", "camera-carry", "brief-dissolve"] as const;

const defaultRouting = (type: ProjectType): AssetRoutingPolicy => ({
  reuseApprovedFirst: true,
  generateMissing: true,
  licensedSources: type === "explainer" ? "factual-first" : "disabled",
  allowGeneratedHistoricalReconstruction: type === "explainer",
  proposed3D: "never",
});

const defaultAudioMix = (type: ProjectType): AudioMix => audioMixSchema.parse({
  profile: type,
  voiceGain: 1,
  musicDecision: "pending",
  musicGain: type === "kids" ? .16 : .1,
  musicLoop: true,
  transitionSfx: type === "explainer" ? "paper-flip" : "off",
  transitionSfxGain: type === "explainer" ? .14 : .1,
  reviewed: false,
});

const draftFromSession = ({overrides, approvedAssetVersions, audioMix, musicTrack, soundEffectAssets, soundEffectCues, voiceTrack, ...draft}: ProductionSession): ProductionDraft => {
  void overrides;
  void approvedAssetVersions;
  void audioMix;
  void musicTrack;
  void soundEffectAssets;
  void soundEffectCues;
  void voiceTrack;
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
      onCreate({...draft, overrides: [], approvedAssetVersions: [], audioMix: defaultAudioMix(type), musicTrack: null, soundEffectAssets: [], soundEffectCues: [], voiceTrack: null});
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

function formatTimecode(frame: number, fps: number) {
  const wholeSeconds = Math.floor(frame / fps);
  const minutes = Math.floor(wholeSeconds / 60);
  const seconds = wholeSeconds % 60;
  const frameWithinSecond = Math.floor(frame % fps);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}:${String(frameWithinSecond).padStart(2, "0")}`;
}

function CutTimeline({build, selectedShotId, onSelect}: {build: AnimaticBuild; selectedShotId: string; onSelect: (id: string) => void}) {
  const {renderPlan} = build;
  const selectedShot = renderPlan.shots.find((shot) => shot.id === selectedShotId) ?? renderPlan.shots[0]!;
  const [frame, setFrame] = useState(selectedShot.startFrame);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setFrame((current) => current >= selectedShot.startFrame && current < selectedShot.startFrame + selectedShot.durationInFrames ? current : selectedShot.startFrame);
  }, [selectedShot.durationInFrames, selectedShot.startFrame]);

  useEffect(() => {
    if (!playing) return;
    const frameStep = Math.max(1, Math.round(renderPlan.fps / 10));
    const timer = window.setInterval(() => {
      setFrame((current) => {
        const next = Math.min(renderPlan.durationInFrames - 1, current + frameStep);
        const activeShot = renderPlan.shots.find((shot) => next >= shot.startFrame && next < shot.startFrame + shot.durationInFrames);
        if (activeShot && activeShot.id !== selectedShotId) onSelect(activeShot.id);
        if (next === renderPlan.durationInFrames - 1) setPlaying(false);
        return next;
      });
    }, 100);
    return () => window.clearInterval(timer);
  }, [onSelect, playing, renderPlan.durationInFrames, renderPlan.fps, renderPlan.shots, selectedShotId]);

  const movePlayhead = (nextFrame: number) => {
    const clamped = Math.max(0, Math.min(renderPlan.durationInFrames - 1, nextFrame));
    setFrame(clamped);
    const activeShot = renderPlan.shots.find((shot) => clamped >= shot.startFrame && clamped < shot.startFrame + shot.durationInFrames);
    if (activeShot) onSelect(activeShot.id);
  };

  const togglePlayback = () => {
    if (!playing && frame >= renderPlan.durationInFrames - 1) movePlayhead(0);
    setPlaying((current) => !current);
  };

  return (
    <section className="cut-timeline" aria-label="Cut timing">
      <header>
        <div><p className="eyebrow">Cut timing</p><h2>Playable direction timeline</h2><span>Drag the playhead or jump to a shot. The inspector follows exact compiled frame boundaries.</span></div>
        <div className="timeline-transport"><button aria-label={playing ? "Pause direction timeline" : "Play direction timeline"} onClick={togglePlayback}>{playing ? <CirclePause size={17} /> : <PlayCircle size={17} />}{playing ? "Pause" : "Play"}</button><time>{formatTimecode(frame, renderPlan.fps)} / {formatTimecode(renderPlan.durationInFrames - 1, renderPlan.fps)}</time></div>
      </header>
      <div className="cut-track" aria-label="Shot boundaries">
        {renderPlan.shots.map((shot) => <button
          aria-label={`Jump to shot ${shot.number} ${shot.title}`}
          aria-pressed={shot.id === selectedShotId}
          className={`cut-segment treatment-${shot.treatment} ${shot.id === selectedShotId ? "is-active" : ""}`}
          key={shot.id}
          onClick={() => movePlayhead(shot.startFrame)}
          style={{flexGrow: shot.durationInFrames}}
          title={`${shot.number} · ${shot.title} · ${(shot.durationInFrames / renderPlan.fps).toFixed(1)}s`}
        ><span>{shot.number}</span></button>)}
      </div>
      <input aria-label="Production playhead" max={renderPlan.durationInFrames - 1} min={0} onChange={(event) => movePlayhead(Number(event.target.value))} step={1} type="range" value={frame} />
      <footer><span>Frame {frame + 1} / {renderPlan.durationInFrames}</span><strong>{selectedShot.number} · {selectedShot.title}</strong><span>{selectedShot.transition.replaceAll("-", " ")}</span></footer>
    </section>
  );
}

type RenderShot = AnimaticBuild["renderPlan"]["shots"][number];

function AudioCueEditor({build, shot, locked, onOverride}: {build: AnimaticBuild; shot: RenderShot; locked: boolean; onOverride: (shotId: string, patch: Partial<ShotOverride>) => void}) {
  const [captionDraft, setCaptionDraft] = useState(shot.caption ?? "");
  const [durationDraft, setDurationDraft] = useState((shot.durationInFrames / build.renderPlan.fps).toFixed(2));
  const creativeShot = build.creativePlan.shots.find((candidate) => candidate.id === shot.id)!;

  useEffect(() => setCaptionDraft(shot.caption ?? ""), [shot.caption]);
  useEffect(() => setDurationDraft((shot.durationInFrames / build.renderPlan.fps).toFixed(2)), [build.renderPlan.fps, shot.durationInFrames]);

  const normalizedDuration = () => {
    const seconds = Number(durationDraft);
    if (!Number.isFinite(seconds)) return shot.durationInFrames;
    return Math.max(12, Math.min(1800, Math.round(seconds * build.renderPlan.fps)));
  };
  const editedCaption = () => captionDraft.trim() || null;
  const commitDraft = (timingLocked?: true) => onOverride(shot.id, {caption: editedCaption(), durationInFrames: normalizedDuration(), timingLocked});
  const reset = () => onOverride(shot.id, {caption: undefined, durationInFrames: undefined, timingLocked: undefined});

  return <article className="audio-cue-editor">
    <header><div><p className="eyebrow">Selected spoken beat</p><h3>{shot.number} · {shot.title}</h3><p>Source: {creativeShot.sourceExcerpt}</p></div><span className={locked ? "is-locked" : ""}>{locked ? "Timing locked" : "Estimated timing"}</span></header>
    <label>Spoken line / caption<textarea aria-label={`Spoken text for shot ${shot.number}`} onBlur={() => commitDraft()} onChange={(event) => setCaptionDraft(event.target.value)} value={captionDraft} /></label>
    <div className="audio-timing-controls">
      <label>Duration (seconds)<input aria-label={`Duration for shot ${shot.number}`} min="0.4" max="60" onBlur={() => commitDraft()} onChange={(event) => setDurationDraft(event.target.value)} step="0.01" type="number" value={durationDraft} /></label>
      <dl><div><dt>In</dt><dd>{formatTimecode(shot.startFrame, build.renderPlan.fps)}</dd></div><div><dt>Out</dt><dd>{formatTimecode(shot.startFrame + shot.durationInFrames, build.renderPlan.fps)}</dd></div><div><dt>Frames</dt><dd>{shot.durationInFrames}</dd></div></dl>
    </div>
    <footer><button className="reset-cue" onClick={reset}><RotateCcw size={13} />Use script estimate</button><button className="lock-cue" onClick={() => commitDraft(locked ? undefined : true)}><Lock size={13} />{locked ? "Unlock timing" : "Lock this timing"}</button></footer>
  </article>;
}

const voiceTrackMediaUrl = (contentHash: string) => `storystage-media://voice/${encodeURIComponent(contentHash)}`;
const musicTrackMediaUrl = (contentHash: string) => `storystage-media://music/${encodeURIComponent(contentHash)}`;
const soundEffectMediaUrl = (contentHash: string) => `storystage-media://sfx/${encodeURIComponent(contentHash)}`;

function VoiceTrackReview({build, capabilities, host, productionBundleContentHash, session, onTrack}: {build: AnimaticBuild; capabilities: DesktopCapabilities; host: HostAdapter; productionBundleContentHash: string | null; session: ProductionSession; onTrack: (track: VoiceTrack) => void}) {
  const [listenedThrough, setListenedThrough] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const track = session.voiceTrack;
  useEffect(() => {setListenedThrough(false); setError(null);}, [track?.contentHash]);
  const planSeconds = build.renderPlan.durationInFrames / build.renderPlan.fps;
  const durationDifference = track ? Math.abs(track.durationInSeconds - planSeconds) : 0;
  const coverageAligned = Boolean(track && durationDifference <= Math.max(2, planSeconds * .1));

  const importTrack = async () => {
    if (!productionBundleContentHash) return;
    setBusy(true); setError(null);
    const result = await host.importVoiceTrack({productionId: session.productionId, revision: session.revision, productionBundleContentHash});
    setBusy(false);
    if (result.status === "imported") onTrack(voiceTrackSchema.parse(result.track));
    if (result.status === "failed") setError(result.error.message);
  };
  const approveTrack = async () => {
    if (!track || !productionBundleContentHash || !listenedThrough) return;
    setBusy(true); setError(null);
    const result = await host.approveVoiceTrack({productionId: session.productionId, revision: session.revision, productionBundleContentHash, voiceTrackContentHash: track.contentHash, listenedThrough: true});
    setBusy(false);
    if (result.ok) onTrack(voiceTrackSchema.parse(result.track));
    else setError(result.error.message);
  };

  return <article className="voice-master-card">
    <header><div><p className="eyebrow">Local voice master</p><h3>{track ? track.sourceFileName : "No recording bound"}</h3><p>{track ? `${track.codec.replaceAll("-", " ")} · ${track.sampleRate / 1000} kHz · ${track.channels === 1 ? "mono" : "stereo"} · ${track.durationInSeconds.toFixed(2)}s` : "Import one uncompressed PCM/float WAV. The desktop copies and hashes it into private local storage."}</p></div><span className={track?.approvalStatus === "approved" ? "is-approved" : ""}>{track?.approvalStatus ?? "required"}</span></header>
    {track ? <><audio aria-label="Imported voice master" controls key={track.contentHash} onEnded={() => setListenedThrough(true)} preload="metadata" src={voiceTrackMediaUrl(track.contentHash)} /><div className={coverageAligned ? "voice-coverage is-aligned" : "voice-coverage"}><strong>{coverageAligned ? "Runtime aligned" : "Runtime needs review"}</strong><span>Voice {track.durationInSeconds.toFixed(1)}s · plan {planSeconds.toFixed(1)}s · Δ {durationDifference.toFixed(1)}s</span></div></> : null}
    {error ? <p className="voice-error" role="alert">{error}</p> : null}
    <footer><button disabled={!capabilities.localAudioImport || !productionBundleContentHash || busy} onClick={() => void importTrack()}><Upload size={13} />{busy ? "Working…" : track ? "Replace WAV" : "Import WAV"}</button>{track?.approvalStatus === "imported" ? <button className="approve-voice" disabled={!listenedThrough || !productionBundleContentHash || busy} onClick={() => void approveTrack()}><Check size={13} />{listenedThrough ? "Approve listened take" : "Listen through to approve"}</button> : track?.approvalStatus === "approved" ? <small><ShieldCheck size={13} />Approved bytes are render-bound</small> : null}</footer>
  </article>;
}

function MusicTrackReview({capabilities, host, productionBundleContentHash, session, onTrack}: {capabilities: DesktopCapabilities; host: HostAdapter; productionBundleContentHash: string | null; session: ProductionSession; onTrack: (track: MusicTrack) => void}) {
  const [listenedThrough, setListenedThrough] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const track = session.musicTrack;
  useEffect(() => {setListenedThrough(false); setError(null);}, [track?.contentHash]);
  const importTrack = async () => {
    if (!productionBundleContentHash) return;
    setBusy(true); setError(null);
    const result = await host.importMusicTrack({productionId: session.productionId, revision: session.revision, productionBundleContentHash});
    setBusy(false);
    if (result.status === "imported") onTrack(musicTrackSchema.parse(result.track));
    if (result.status === "failed") setError(result.error.message);
  };
  const approveTrack = async () => {
    if (!track || !productionBundleContentHash || !listenedThrough) return;
    setBusy(true); setError(null);
    const result = await host.approveMusicTrack({productionId: session.productionId, revision: session.revision, productionBundleContentHash, musicTrackContentHash: track.contentHash, listenedThrough: true});
    setBusy(false);
    if (result.ok) onTrack(musicTrackSchema.parse(result.track));
    else setError(result.error.message);
  };
  return <article className="voice-master-card music-master-card">
    <header><div><p className="eyebrow">Local music master</p><h3>{track ? track.sourceFileName : "No music bound"}</h3><p>{track ? `${track.codec.replaceAll("-", " ")} · ${track.sampleRate / 1000} kHz · ${track.channels === 1 ? "mono" : "stereo"} · ${track.durationInSeconds.toFixed(2)}s` : "Import one uncompressed PCM/float WAV. Approval requires a full in-app listen-through."}</p></div><span className={track?.approvalStatus === "approved" ? "is-approved" : ""}>{track?.approvalStatus ?? "optional"}</span></header>
    {track ? <audio aria-label="Imported music master" controls key={track.contentHash} onEnded={() => setListenedThrough(true)} preload="metadata" src={musicTrackMediaUrl(track.contentHash)} /> : null}
    {error ? <p className="voice-error" role="alert">{error}</p> : null}
    <footer><button disabled={!capabilities.localAudioImport || !productionBundleContentHash || busy} onClick={() => void importTrack()}><Upload size={13} />{busy ? "Working…" : track ? "Replace music WAV" : "Import music WAV"}</button>{track?.approvalStatus === "imported" ? <button className="approve-voice" disabled={!listenedThrough || !productionBundleContentHash || busy} onClick={() => void approveTrack()}><Check size={13} />{listenedThrough ? "Approve listened music" : "Listen through to approve"}</button> : track?.approvalStatus === "approved" ? <small><ShieldCheck size={13} />Approved music bytes are render-bound</small> : null}</footer>
  </article>;
}

function SoundEffectWorkspace({build, capabilities, host, productionBundleContentHash, selectedShot, session, onAssets, onCues}: {build: AnimaticBuild; capabilities: DesktopCapabilities; host: HostAdapter; productionBundleContentHash: string | null; selectedShot: RenderShot; session: ProductionSession; onAssets: (assets: SoundEffectAsset[]) => void; onCues: (cues: SoundEffectCue[]) => void}) {
  const [listenedHashes, setListenedHashes] = useState<Set<string>>(() => new Set());
  const [busyHash, setBusyHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const importAsset = async () => {
    if (!productionBundleContentHash) return;
    setBusyHash("import"); setError(null);
    const result = await host.importSoundEffect({productionId: session.productionId, revision: session.revision, productionBundleContentHash});
    setBusyHash(null);
    if (result.status === "imported") {
      const asset = soundEffectAssetSchema.parse(result.track);
      onAssets([...session.soundEffectAssets.filter((candidate) => candidate.contentHash !== asset.contentHash), asset]);
    }
    if (result.status === "failed") setError(result.error.message);
  };
  const approveAsset = async (asset: SoundEffectAsset) => {
    if (!productionBundleContentHash || !listenedHashes.has(asset.contentHash)) return;
    setBusyHash(asset.contentHash); setError(null);
    const result = await host.approveSoundEffect({productionId: session.productionId, revision: session.revision, productionBundleContentHash, soundEffectContentHash: asset.contentHash, listenedThrough: true});
    setBusyHash(null);
    if (result.ok) {
      const approved = soundEffectAssetSchema.parse(result.track);
      onAssets(session.soundEffectAssets.map((candidate) => candidate.contentHash === approved.contentHash ? approved : candidate));
    } else setError(result.error.message);
  };
  const placeCue = (asset: SoundEffectAsset) => {
    const ordinal = session.soundEffectCues.filter((cue) => cue.assetContentHash === asset.contentHash && cue.shotId === selectedShot.id).length + 1;
    const cue = soundEffectCueSchema.parse({id: `sfx-cue-${asset.contentHash.slice(0, 10)}-${selectedShot.id}-${ordinal}`, assetContentHash: asset.contentHash, shotId: selectedShot.id, offsetInFrames: 0, gain: .5, label: asset.sourceFileName.replace(/\.wav$/i, "")});
    onCues([...session.soundEffectCues, cue]);
  };
  const updateCue = (id: string, patch: Partial<SoundEffectCue>) => onCues(session.soundEffectCues.map((cue) => cue.id === id ? soundEffectCueSchema.parse({...cue, ...patch}) : cue));
  const removeCue = (id: string) => onCues(session.soundEffectCues.filter((cue) => cue.id !== id));

  return <article className="sfx-workspace-card">
    <header><div><p className="eyebrow">Cue-placed local SFX</p><h3>Approved effects library</h3><p>Import reusable WAV effects, listen through, approve the exact bytes, then place cues relative to the selected shot.</p></div><button disabled={!capabilities.localAudioImport || !productionBundleContentHash || busyHash !== null} onClick={() => void importAsset()}><Upload size={13} />{busyHash === "import" ? "Importing…" : "Import SFX WAV"}</button></header>
    {error ? <p className="voice-error" role="alert">{error}</p> : null}
    {session.soundEffectAssets.length > 0 ? <div className="sfx-asset-list">{session.soundEffectAssets.map((asset) => <div key={asset.contentHash}><div><strong>{asset.sourceFileName}</strong><small>{asset.durationInSeconds.toFixed(2)}s · {asset.approvalStatus}</small></div><audio aria-label={`Sound effect ${asset.sourceFileName}`} controls onEnded={() => setListenedHashes((current) => new Set(current).add(asset.contentHash))} preload="metadata" src={soundEffectMediaUrl(asset.contentHash)} />{asset.approvalStatus === "imported" ? <button disabled={!listenedHashes.has(asset.contentHash) || !productionBundleContentHash || busyHash !== null} onClick={() => void approveAsset(asset)}>{listenedHashes.has(asset.contentHash) ? "Approve listened SFX" : "Listen through"}</button> : <button onClick={() => placeCue(asset)}>Place on {selectedShot.number}</button>}</div>)}</div> : <p className="sfx-empty">No custom effects imported. The profile transition accent remains a separate mix choice.</p>}
    {session.soundEffectCues.length > 0 ? <div className="sfx-cue-list"><h4>Placed cues</h4>{session.soundEffectCues.map((cue) => {
      const asset = session.soundEffectAssets.find((candidate) => candidate.contentHash === cue.assetContentHash);
      const planShot = build.renderPlan.shots.find((candidate) => candidate.id === cue.shotId);
      return <div key={cue.id}><span><strong>{cue.label}</strong><small>{cue.shotId}{asset ? ` · ${asset.sourceFileName}` : ""}</small></span><label>Offset frames<input aria-label={`Offset frames for ${cue.label}`} max={Math.max(0, (planShot?.durationInFrames ?? 1800) - 1)} min="0" onChange={(event) => updateCue(cue.id, {offsetInFrames: Number(event.target.value)})} type="number" value={cue.offsetInFrames} /></label><label>Gain <input aria-label={`Gain for ${cue.label}`} max="1" min="0" onChange={(event) => updateCue(cue.id, {gain: Number(event.target.value)})} step="0.01" type="range" value={cue.gain} /></label><button aria-label={`Remove cue ${cue.label}`} onClick={() => removeCue(cue.id)}>Remove</button></div>;
    })}</div> : null}
  </article>;
}

function AudioMixReview({mix, musicTrack, onMix}: {mix: AudioMix; musicTrack: MusicTrack | null; onMix: (mix: AudioMix) => void}) {
  const musicGain = mix.musicGain ?? (mix.profile === "kids" ? .16 : .1);
  const musicLoop = mix.musicLoop ?? true;
  const change = (patch: Partial<AudioMix>) => onMix(audioMixSchema.parse({...mix, musicGain, musicLoop, ...patch, reviewed: false}));
  const approvedMusicAvailable = musicTrack?.approvalStatus === "approved";
  const canReview = mix.musicDecision === "none" || (mix.musicDecision === "approved-master" && approvedMusicAvailable);
  return <article className="audio-mix-card">
    <header><div><p className="eyebrow">Profile-aware final mix</p><h3>Voice, music & transition SFX</h3><p>Every audible layer must be an explicit editorial decision. StoryStage never sneaks a guide loop into a render.</p></div><span className={mix.reviewed ? "is-reviewed" : ""}>{mix.reviewed ? "reviewed" : "decision required"}</span></header>
    <div className="audio-mix-controls">
      <label>Voice gain <strong>{mix.voiceGain.toFixed(2)}×</strong><input aria-label="Voice gain" max="2" min="0" onChange={(event) => change({voiceGain: Number(event.target.value)})} step="0.05" type="range" value={mix.voiceGain} /></label>
      <label>Music decision<select aria-label="Music decision" onChange={(event) => change({musicDecision: event.target.value as AudioMix["musicDecision"]})} value={mix.musicDecision}><option value="pending">Music master still required</option><option value="none">No music — intentional dry mix</option><option disabled={!approvedMusicAvailable} value="approved-master">Use approved music master</option></select></label>
      <label>Music gain <strong>{musicGain.toFixed(2)}×</strong><input aria-label="Music gain" disabled={mix.musicDecision !== "approved-master"} max="1" min="0" onChange={(event) => change({musicGain: Number(event.target.value)})} step="0.01" type="range" value={musicGain} /></label>
      <label className="loop-choice"><input aria-label="Loop music to picture" checked={musicLoop} disabled={mix.musicDecision !== "approved-master"} onChange={(event) => change({musicLoop: event.target.checked})} type="checkbox" />Loop music to picture</label>
      <label>Transition SFX<select aria-label="Transition SFX" onChange={(event) => change({transitionSfx: event.target.value as AudioMix["transitionSfx"]})} value={mix.transitionSfx}><option value="off">Off</option><option value="paper-flip">Project-owned paper flip</option></select></label>
      <label>SFX gain <strong>{mix.transitionSfxGain.toFixed(2)}×</strong><input aria-label="Transition SFX gain" disabled={mix.transitionSfx === "off"} max="1" min="0" onChange={(event) => change({transitionSfxGain: Number(event.target.value)})} step="0.01" type="range" value={mix.transitionSfxGain} /></label>
    </div>
    <footer><p>{mix.profile === "kids" ? "Kids default: performance-forward, no automatic cut noise." : "History default: restrained paper accents for fast editorial resets."}</p><button disabled={!canReview || mix.reviewed} onClick={() => onMix(audioMixSchema.parse({...mix, musicGain, musicLoop, reviewed: true}))}><ListChecks size={13} />{mix.reviewed ? "Mix decisions reviewed" : canReview ? "Mark mix reviewed" : approvedMusicAvailable ? "Choose music use" : "Resolve music first"}</button></footer>
  </article>;
}

function AudioTimingWorkspace({build, capabilities, host, overrides, productionBundleContentHash, session, selectedShotId, onSelect, onAudioMix, onMusicTrack, onOverride, onSoundEffectAssets, onSoundEffectCues, onVoiceTrack}: {build: AnimaticBuild; capabilities: DesktopCapabilities; host: HostAdapter; overrides: ShotOverride[]; productionBundleContentHash: string | null; session: ProductionSession; selectedShotId: string; onSelect: (id: string) => void; onAudioMix: (mix: AudioMix) => void; onMusicTrack: (track: MusicTrack) => void; onOverride: (shotId: string, patch: Partial<ShotOverride>) => void; onSoundEffectAssets: (assets: SoundEffectAsset[]) => void; onSoundEffectCues: (cues: SoundEffectCue[]) => void; onVoiceTrack: (track: VoiceTrack) => void}) {
  const sourceSpokenIds = new Set(build.creativePlan.shots.filter((shot) => Boolean(shot.caption)).map((shot) => shot.id));
  const cues = build.renderPlan.shots.filter((shot) => sourceSpokenIds.has(shot.id) || Boolean(shot.caption));
  const selected = cues.find((shot) => shot.id === selectedShotId) ?? cues[0];
  const selectedRenderShot = build.renderPlan.shots.find((shot) => shot.id === selectedShotId) ?? build.renderPlan.shots[0]!;
  const lockedIds = new Set(overrides.filter((override) => override.timingLocked).map((override) => override.shotId));
  const speakerFor = (shot: RenderShot) => {
    const creative = build.creativePlan.shots.find((candidate) => candidate.id === shot.id);
    const source = creative?.sourceElementIds.map((id) => build.scriptDocument.elements.find((element) => element.id === id)).find((element) => element?.type === "dialogue");
    return source?.type === "dialogue" ? source.speaker : "Editorial caption";
  };

  return <section className="audio-workspace" aria-label="Narration timing workspace">
    <header><div><p className="eyebrow">Frame-accurate spoken edit</p><h2>Narration & caption timing</h2><p>Retiming a cue shifts every downstream shot boundary and the deterministic render plan. Lock only timing you have actually reviewed.</p></div><div className="audio-lock-score"><strong>{cues.filter((shot) => lockedIds.has(shot.id)).length}/{cues.length}</strong><span>spoken cues locked</span></div></header>
    <VoiceTrackReview build={build} capabilities={capabilities} host={host} onTrack={onVoiceTrack} productionBundleContentHash={productionBundleContentHash} session={session} />
    <MusicTrackReview capabilities={capabilities} host={host} onTrack={onMusicTrack} productionBundleContentHash={productionBundleContentHash} session={session} />
    <SoundEffectWorkspace build={build} capabilities={capabilities} host={host} onAssets={onSoundEffectAssets} onCues={onSoundEffectCues} productionBundleContentHash={productionBundleContentHash} selectedShot={selectedRenderShot} session={session} />
    <AudioMixReview mix={session.audioMix} musicTrack={session.musicTrack} onMix={onAudioMix} />
    <div className="audio-workspace-grid">
      <div className="audio-cue-list">{cues.map((shot) => <button aria-label={`Select timing cue ${shot.number}`} className={shot.id === selected?.id ? "is-active" : ""} key={shot.id} onClick={() => onSelect(shot.id)}>
        <span className="cue-time">{formatTimecode(shot.startFrame, build.renderPlan.fps)}</span><div><strong>{shot.number} · {speakerFor(shot)}</strong><p>{shot.caption ?? "Caption intentionally removed"}</p></div><span className={lockedIds.has(shot.id) ? "cue-status is-locked" : "cue-status"}>{lockedIds.has(shot.id) ? "locked" : "estimate"}</span>
      </button>)}</div>
      {selected ? <AudioCueEditor build={build} key={selected.id} locked={lockedIds.has(selected.id)} onOverride={onOverride} shot={selected} /> : <div className="audio-empty"><Mic2 size={20} /><p>No spoken cues were derived from this script.</p></div>}
    </div>
    <footer><CircleAlert size={15} /><p>Timing-driven mouth cues compile into the immutable render plan. They are a deterministic two-pose performance pass, not phoneme recognition; final character art and performance review still matter.</p></footer>
  </section>;
}

function ApprovedRenderReview({build, job, onSelect, onReveal}: {build: AnimaticBuild; job: Extract<RenderJobEvent, {status: "completed"}>; onSelect: (id: string) => void; onReveal: () => void}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const {renderPlan} = build;
  const durationInFrames = Math.min(renderPlan.durationInFrames, renderPlan.fps * 24);
  const reviewShots = renderPlan.shots.filter((shot) => shot.startFrame < durationInFrames);
  const [frame, setFrame] = useState(0);
  const activeShot = reviewShots.find((shot) => frame >= shot.startFrame && frame < Math.min(durationInFrames, shot.startFrame + shot.durationInFrames)) ?? reviewShots[0]!;

  useEffect(() => setFrame(0), [job.jobId]);

  const movePlayhead = (nextFrame: number, seekVideo: boolean) => {
    const clamped = Math.max(0, Math.min(durationInFrames - 1, nextFrame));
    setFrame(clamped);
    const shot = reviewShots.find((candidate) => clamped >= candidate.startFrame && clamped < candidate.startFrame + candidate.durationInFrames);
    if (shot) onSelect(shot.id);
    if (seekVideo && videoRef.current) videoRef.current.currentTime = clamped / renderPlan.fps;
  };

  return (
    <section className="approved-render-review" aria-label="Approved render review">
      <header><div><p className="eyebrow">Approved-pixel playback</p><h2>Rendered production review</h2><p>This is the actual H.264 output from the verified saved revision—not a storyboard placeholder.</p></div><button onClick={onReveal}><Film size={15} />Show MP4</button></header>
      <div className="approved-player-shell">
        <video
          aria-label="Approved render player"
          controls
          key={job.jobId}
          onEnded={() => movePlayhead(durationInFrames - 1, false)}
          onSeeked={(event) => movePlayhead(Math.floor(event.currentTarget.currentTime * renderPlan.fps), false)}
          onTimeUpdate={(event) => movePlayhead(Math.floor(event.currentTarget.currentTime * renderPlan.fps), false)}
          preload="metadata"
          ref={videoRef}
          src={`${renderedMediaUrl(job.jobId)}`}
        />
        <div className="approved-player-meta"><span>Verified local MP4</span><time>{formatTimecode(frame, renderPlan.fps)} / {formatTimecode(durationInFrames - 1, renderPlan.fps)}</time><strong>{activeShot.number} · {activeShot.title}</strong></div>
      </div>
      <div className="approved-review-track" aria-label="Rendered shot boundaries">{reviewShots.map((shot) => <button aria-label={`Seek rendered shot ${shot.number} ${shot.title}`} className={shot.id === activeShot.id ? "is-active" : ""} key={shot.id} onClick={() => movePlayhead(shot.startFrame, true)} style={{flexGrow: Math.min(shot.durationInFrames, durationInFrames - shot.startFrame)}} title={`${shot.number} · ${shot.title}`}><span>{shot.number}</span></button>)}</div>
      <input aria-label="Approved render playhead" max={durationInFrames - 1} min={0} onChange={(event) => movePlayhead(Number(event.target.value), true)} step={1} type="range" value={frame} />
      <footer><span>Frame {frame + 1} / {durationInFrames}</span><p>Native review playback follows the exact 24-second engineering slice. Re-render after changing direction or approved assets.</p></footer>
    </section>
  );
}

const renderedMediaUrl = (jobId: string) => `storystage-media://render/${encodeURIComponent(jobId)}`;

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

const promptRoleDirection = (brief: GenerationBrief, fileRole: string) => {
  if (fileRole === "identity-sheet.png") return "Create a canonical full-body identity sheet with front, three-quarter, and profile views plus a compact expression row. Keep the entire figure visible and proportions unambiguous.";
  if (fileRole === "neutral-pose.png") return "Create one isolated full-body neutral performance pose, facing three-quarter toward camera, with every limb readable and nothing cropped.";
  if (fileRole === "talk-pose.png") return "Create one isolated full-body speaking pose with a clearly open talking mouth and a readable explanatory hand gesture. Preserve the exact canonical identity.";
  if (fileRole === "reaction-pose.png") return "Create one isolated full-body reaction pose with a strong readable expression and silhouette. Preserve the exact canonical identity.";
  if (fileRole === "clean-plate.png") return "Create a complete 16:9 environment clean plate with no characters, captions, logos, or foreground occluders. It must work as the opaque base layer.";
  if (fileRole === "midground.png") return "Create only the 16:9 midground layer for the same clean-plate camera and perspective. Isolate the layer on transparency, or on the exact controlled matte if transparency is unavailable.";
  if (fileRole === "foreground-occluders.png") return "Create only the 16:9 foreground occluder layer for the same clean-plate camera and perspective. Keep the center performance area usable and isolate the layer on transparency or the exact controlled matte.";
  if (["reconstruction", "diagram", "editorial-illustration"].includes(brief.outputRole)) return "Create one complete 16:9 editorial frame with a deliberate focal point and useful negative space for later captions. Do not embed labels or text; StoryStage adds sourced context and reconstruction labels during editing.";
  return "Create one clean isolated production asset on transparency, or on the exact controlled matte if transparency is unavailable. Keep the full object visible and easy to cut out.";
};

function buildChatGptAssetPrompt(session: ProductionSession, brief: GenerationBrief, candidateSetNumber: number, fileRole: string) {
  return [
    `Create ONE original image asset for the StoryStage production "${session.title}".`,
    `Entity: ${brief.entity.name} (${brief.outputRole.replaceAll("-", " ")}).`,
    `Candidate set: ${candidateSetNumber} of ${brief.candidateCount}. File role: ${fileRole}.`,
    `Story context: ${brief.sourceExcerpts.join(" ")}`,
    `Style bible: ${brief.styleBible.principles.join("; ")}.`,
    `Creative requirements: ${brief.creativeRequirements.join(" ")}`,
    `Continuity lock: ${brief.continuityRequirements.join(" ")} Keep this candidate-set identity, palette, proportions, camera logic, and rendering style consistent with every other file in the same set.`,
    promptRoleDirection(brief, fileRole),
    `Background rule: use true transparency where requested; if that is unavailable, use only the flat matte ${brief.controlledMatte} with no shadows or spill.`,
    `Hard prohibitions: ${brief.prohibitedChanges.join(" ")} Do not imitate any named channel, copyrighted character, living artist, or supplied reference-channel artwork.`,
    "Return only the generated image, with no explanation, labels, filename text, border, signature, or watermark.",
  ].join("\n\n");
}

const suggestedAssetFilename = (brief: GenerationBrief, candidateSetNumber: number, fileRole: string) => `${brief.entity.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "asset"}-set-${candidateSetNumber}-${fileRole}`;

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
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [generationPromptsReady, setGenerationPromptsReady] = useState(false);
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
    setGenerationPromptsReady(true);
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
      setGenerationPromptsReady(true);
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
    setGenerationPromptsReady(true);
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

  const copyGenerationPrompt = async (brief: GenerationBrief, candidateSetNumber: number, fileRole: string) => {
    const promptId = `${brief.id}:${candidateSetNumber}:${fileRole}`;
    try {
      await navigator.clipboard.writeText(buildChatGptAssetPrompt(session, brief, candidateSetNumber, fileRole));
      setCopiedPromptId(promptId);
      setImportError(null);
    } catch {
      setCopiedPromptId(null);
      setImportError("StoryStage could not copy the prompt. Clipboard permission is required only for this user-triggered action.");
    }
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
      {generationPromptsReady ? <section className="prompt-queue" aria-label="ChatGPT image prompt queue">
        <header><div><p className="eyebrow">Subscription workflow</p><h2>ChatGPT image prompt queue</h2><p>Use one ChatGPT conversation per candidate set. Generate and download each file, then import the loose images and map them to these same roles.</p></div><span>{generationJobDraft.briefs.reduce((sum, brief) => sum + brief.candidateCount * brief.expectedFiles.length, 0)} images</span></header>
        <div>{generationJobDraft.briefs.map((brief) => <details key={brief.id} open={generationJobDraft.briefs.length === 1}>
          <summary><span><strong>{brief.entity.name}</strong><small>{brief.outputRole.replaceAll("-", " ")} · {brief.candidateCount} coherent sets</small></span><b>{brief.candidateCount * brief.expectedFiles.length} prompts</b></summary>
          <div className="prompt-items">{Array.from({length: brief.candidateCount}, (_, index) => index + 1).flatMap((candidateSetNumber) => brief.expectedFiles.map((fileRole) => {
            const promptId = `${brief.id}:${candidateSetNumber}:${fileRole}`;
            return <article key={promptId}><span><strong>Set {candidateSetNumber} · {fileRole}</strong><small>{suggestedAssetFilename(brief, candidateSetNumber, fileRole)}</small></span><button aria-label={`Copy prompt for ${brief.entity.name} set ${candidateSetNumber} ${fileRole}`} onClick={() => void copyGenerationPrompt(brief, candidateSetNumber, fileRole)}>{copiedPromptId === promptId ? <Check size={14} /> : <Copy size={14} />}{copiedPromptId === promptId ? "Copied" : "Copy prompt"}</button></article>;
          }))}</div>
        </details>)}</div>
        <footer><ShieldCheck size={14} /><p>StoryStage never reads your ChatGPT session. Only prompts you explicitly copy and images you explicitly import cross the boundary.</p></footer>
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
          <div className="prepared-role-list">{candidateSet.preparedCandidates.map((candidate) => <span key={candidate.candidateId}><strong>{candidate.fileRole}</strong><small>{candidate.width}x{candidate.height} · {candidate.assetClass.replaceAll("-", " ")}</small></span>)}</div>
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

function ProductionPreflight({session, build, capabilities, productionBundleContentHash, onNavigate}: {session: ProductionSession; build: AnimaticBuild; capabilities: DesktopCapabilities; productionBundleContentHash: string | null; onNavigate: (tab: WorkspaceTab) => void}) {
  const missingApprovals = build.resolvedPlan.generationBriefs.length;
  const deferredSources = build.resolvedPlan.requirements.filter((requirement) => requirement.status === "deferred").length;
  const approvedAssets = session.approvedAssetVersions.length;
  const spokenShotIds = new Set(build.creativePlan.shots.filter((shot) => Boolean(shot.caption)).map((shot) => shot.id));
  const lockedSpokenTimings = session.overrides.filter((override) => override.timingLocked && spokenShotIds.has(override.shotId)).length;
  const planSeconds = build.renderPlan.durationInFrames / build.renderPlan.fps;
  const voiceCoverageAligned = Boolean(session.voiceTrack && Math.abs(session.voiceTrack.durationInSeconds - planSeconds) <= Math.max(2, planSeconds * .1));
  const items = [
    {id: "plan", ready: true, warning: false, title: "Script and direction compiled", detail: `${build.creativePlan.scenes.length} natural scenes · ${build.renderPlan.shots.length} shots · ${build.renderPlan.durationInFrames} exact frames`, action: "direction" as const},
    {id: "snapshot", ready: Boolean(productionBundleContentHash), warning: !capabilities.manualImageExchange, title: "Production snapshot saved", detail: productionBundleContentHash ? `Content ${productionBundleContentHash.slice(0, 12)}… is acknowledged by the desktop host.` : capabilities.manualImageExchange ? "The current production revision is still saving." : "Durable local snapshots require the desktop app.", action: "direction" as const},
    {id: "assets", ready: missingApprovals === 0, warning: false, title: "Generated asset approvals complete", detail: missingApprovals === 0 ? `${approvedAssets} immutable approved asset versions are bound to this revision.` : `${missingApprovals} asset approvals still required; ${approvedAssets} immutable versions are currently bound.`, action: "assets" as const},
    {id: "sources", ready: deferredSources === 0, warning: deferredSources > 0, title: "Deferred source acquisitions cleared", detail: deferredSources === 0 ? "No licensed, archive, or generation requirement is deferred." : `${deferredSources} requirements still need an approved source or an explicit production decision.`, action: "assets" as const},
    {id: "timing", ready: spokenShotIds.size === 0 || lockedSpokenTimings === spokenShotIds.size, warning: false, title: "Spoken timing reviewed and locked", detail: spokenShotIds.size === 0 ? "This production has no derived spoken cues." : `${lockedSpokenTimings}/${spokenShotIds.size} narration or dialogue cues have editor-locked frame timing.`, action: "audio" as const},
    {id: "voice", ready: session.voiceTrack?.approvalStatus === "approved" && voiceCoverageAligned, warning: Boolean(session.voiceTrack && !voiceCoverageAligned), title: "Approved voice master bound", detail: !session.voiceTrack ? "Import, listen through, and approve a local WAV voice master." : session.voiceTrack.approvalStatus !== "approved" ? `${session.voiceTrack.sourceFileName} is imported but not yet listened-through and approved.` : voiceCoverageAligned ? `${session.voiceTrack.sourceFileName} is approved, hash-bound, and runtime-aligned.` : `Approved voice is ${session.voiceTrack.durationInSeconds.toFixed(1)}s while the plan is ${planSeconds.toFixed(1)}s; retime before final render.`, action: "audio" as const},
    {id: "mix", ready: session.audioMix.reviewed && (session.audioMix.musicDecision !== "approved-master" || session.musicTrack?.approvalStatus === "approved"), warning: session.audioMix.musicDecision === "pending", title: "Music and SFX decisions reviewed", detail: session.audioMix.reviewed ? `Voice ${session.audioMix.voiceGain.toFixed(2)}× · music ${session.audioMix.musicDecision}${session.audioMix.musicDecision === "approved-master" ? ` at ${(session.audioMix.musicGain ?? .1).toFixed(2)}×${session.audioMix.musicLoop ?? true ? " looped" : ""}` : ""} · transition SFX ${session.audioMix.transitionSfx}.` : session.audioMix.musicDecision === "pending" ? "Import and approve a music master, or explicitly choose a dry mix, then review the SFX decision." : "The layer choices changed and need a fresh editorial review.", action: "audio" as const},
    {id: "custom-sfx", ready: session.soundEffectAssets.every((asset) => asset.approvalStatus === "approved"), warning: session.soundEffectAssets.some((asset) => asset.approvalStatus !== "approved"), title: "Custom SFX assets approved", detail: session.soundEffectAssets.length === 0 ? "No custom SFX assets are used; transition accents follow the reviewed mix decision." : `${session.soundEffectAssets.filter((asset) => asset.approvalStatus === "approved").length}/${session.soundEffectAssets.length} effects approved · ${session.soundEffectCues.length} shot-relative cues placed.`, action: "audio" as const},
    {id: "renderer", ready: capabilities.localRendering, warning: false, title: "Desktop renderer available", detail: capabilities.localRendering ? "The isolated render worker is available for approved local evidence." : "Desktop renderer unavailable in this host.", action: "direction" as const},
    {id: "slice", ready: capabilities.localRendering && Boolean(productionBundleContentHash) && approvedAssets > 0, warning: false, title: "Approved engineering slice can render", detail: approvedAssets > 0 ? "At least one approved asset is available for the current 24-second engineering render path." : "Approve at least one prepared asset before the engineering render action unlocks.", action: "assets" as const},
  ];
  const readyCount = items.filter((item) => item.ready).length;

  return (
    <section className="preflight-panel" aria-label="Production preflight">
      <header><div><p className="eyebrow">Honest readiness check</p><h2>Production preflight</h2><p>This separates an engineering render from a genuinely finished episode. No green badge is decorative.</p></div><strong>{readyCount}/{items.length} ready</strong></header>
      <div className="preflight-items">{items.map((item) => <article className={item.ready ? "is-ready" : item.warning ? "is-warning" : "is-blocked"} key={item.id}>
        <span className="preflight-state">{item.ready ? <Check size={15} /> : <CircleAlert size={15} />}</span>
        <div><h3>{item.title}</h3><p>{item.detail}</p></div>
        {!item.ready ? <button onClick={() => onNavigate(item.action)}>{item.action === "assets" ? "Open assets" : item.action === "audio" ? "Open timing" : "Open direction"}</button> : <small>Verified</small>}
      </article>)}</div>
      <footer><CircleAlert size={16} /><p><strong>Finished-episode gate remains closed.</strong> Timing, a voice master, pose-swap mouth cues, and reviewed layer decisions are only part of the chain; final profile artwork, any selected soundtrack masters, performance polish, and full-length approved-pixel playback still require evidence before StoryStage can claim a publishable episode.</p></footer>
    </section>
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
  const baseSelectedShot = build.creativePlan.shots.find((shot) => shot.id === selectedShot.id) ?? build.creativePlan.shots[0]!;
  const currentOverride = session.overrides.find((override) => override.shotId === selectedShot.id);
  const selectedRequirements = build.resolvedPlan.requirements.filter((requirement) => requirement.consumingShotIds.includes(selectedShot.id));
  const selectedNewBriefs = build.resolvedPlan.generationBriefs.filter((brief) => brief.consumingShotIds.includes(selectedShot.id)).length;
  const selectedDeferredRequirements = selectedRequirements.filter((requirement) => requirement.status === "deferred").length;
  const pack = getShowPack(session.showPackId);
  const averageShot = build.renderPlan.durationInFrames / build.renderPlan.shots.length / build.renderPlan.fps;
  const routed = ["insert", "kinetic-type", "diagram", "licensed-media", "generated-illustration"].reduce((sum, treatment) => sum + (build.metrics.treatmentDistribution[treatment] ?? 0), 0);

  useEffect(() => {
    if (!capabilities.manualImageExchange) return;
    const sequence = ++saveSequence.current;
    setLastSavedHash(null);
    const draft = productionBundleDraftSchema.parse({schemaVersion: "1.0", production: draftFromSession(session), overrides: session.overrides, approvedAssetVersions: session.approvedAssetVersions, audioMix: session.audioMix, ...(session.musicTrack ? {musicTrack: session.musicTrack} : {}), soundEffectAssets: session.soundEffectAssets, soundEffectCues: session.soundEffectCues, ...(session.voiceTrack ? {voiceTrack: session.voiceTrack} : {}), resolvedPlan: build.resolvedPlan, renderPlan: build.renderPlan, metrics: build.metrics, estimate: build.estimate});
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

  const updateShotOverride = (shotId: string, patch: Partial<ShotOverride>) => {
    const existing = session.overrides.find((override) => override.shotId === shotId);
    const nextOverride = Object.fromEntries(Object.entries({...existing, shotId, ...patch}).filter(([, value]) => value !== undefined)) as ShotOverride;
    const remaining = session.overrides.filter((override) => override.shotId !== shotId);
    const overrides = Object.keys(nextOverride).length === 1 ? remaining : [...remaining, nextOverride];
    let approvedAssetVersions = session.approvedAssetVersions;
    if (Object.prototype.hasOwnProperty.call(patch, "treatment")) {
      const rerouted = buildAnimaticSync({draft: draftFromSession(session), overrides});
      const validRequirementIds = new Set(rerouted.resolvedPlan.requirements.map((requirement) => requirement.id));
      approvedAssetVersions = approvedAssetVersions.filter((approved) => validRequirementIds.has(approved.requirementId));
    }
    setSession({...session, overrides, approvedAssetVersions});
  };
  const updateOverride = (patch: Partial<ShotOverride>) => updateShotOverride(selectedShot.id, patch);

  const applyApprovedAsset = (approved: ApprovedAssetVersion) => {
    setSession({...session, revision: session.revision + 1, approvedAssetVersions: [...session.approvedAssetVersions.filter((asset) => asset.requirementId !== approved.requirementId), approved]});
  };
  const applyVoiceTrack = (voiceTrack: VoiceTrack) => setSession({...session, voiceTrack});
  const applyMusicTrack = (musicTrack: MusicTrack) => setSession({...session, musicTrack, audioMix: {...session.audioMix, musicDecision: "pending", reviewed: false}});
  const applySoundEffectAssets = (soundEffectAssets: SoundEffectAsset[]) => setSession({...session, soundEffectAssets});
  const applySoundEffectCues = (soundEffectCues: SoundEffectCue[]) => setSession({...session, soundEffectCues});
  const applyAudioMix = (audioMix: AudioMix) => setSession({...session, audioMix});

  return (
    <div className="workspace-shell">
      <header className="workspace-topbar"><Brand /><button className="quiet-button" onClick={onExit}><ArrowLeft size={14} />Productions</button><div className="production-crumb"><span>{pack.displayName}</span><ChevronRight size={13} /><strong>{session.title}</strong></div><span className="saved-state"><Check size={13} />{lastSavedHash ? `Saved ${lastSavedHash.slice(0, 8)}` : "Saving"}</span><button className="render-slice-button" disabled={!lastSavedHash || session.approvedAssetVersions.length === 0 || Boolean(renderJob && !["completed", "failed"].includes(renderJob.status))} onClick={() => void renderApprovedSlice()}><PlayCircle size={15} />{renderJob && !["completed", "failed"].includes(renderJob.status) ? renderJob.message : "Render approved 24s slice"}</button>{renderJob?.status === "completed" ? <button className="quiet-button" onClick={() => void host.openRenderedFile(renderJob.jobId)}>Open MP4</button> : null}</header>
      <aside className="workspace-nav">
        <button className={tab === "direction" ? "is-active" : ""} onClick={() => setTab("direction")}><Aperture size={18} /><span>Direction</span></button>
        <button className={tab === "assets" ? "is-active" : ""} onClick={() => setTab("assets")}><Layers3 size={18} /><span>Assets</span><b>{build.resolvedPlan.generationBriefs.length}</b></button>
        <button className={tab === "audio" ? "is-active" : ""} onClick={() => setTab("audio")}><Mic2 size={18} /><span>Audio</span></button>
        <div className="nav-spacer" />
        <button className={tab === "preflight" ? "is-active" : ""} onClick={() => setTab("preflight")}><ListChecks size={18} /><span>Preflight</span></button>
      </aside>
      <main className="workspace-main">
        <header className="workspace-heading"><div><p className="eyebrow">{tab === "direction" ? "Profile-driven plan" : tab === "assets" ? "Generated-asset exchange" : tab === "audio" ? "Spoken editorial timing" : "Production readiness"}</p><h1>{session.title}</h1><p>{pack.profile.id} · {session.preset} · {build.creativePlan.scenes.length} scenes</p></div><span className="profile-chip" style={{"--profile": pack.profile.accentColor} as React.CSSProperties}>{pack.projectType === "kids" ? "Kids Adventure" : "Editorial Explainer"}</span></header>
        {tab === "direction" ? <>
          <section className="metrics-row"><Metric label="Planned shots" value={String(build.renderPlan.shots.length)} detail={`${build.creativePlan.scenes.length} natural scenes`} /><Metric label="Average shot" value={`${averageShot.toFixed(1)}s`} detail={`${profileCadence(pack)} profile envelope`} /><Metric label="Editorial routing" value={`${Math.round(routed * 100)}%`} detail="Insert, evidence, type, diagram" /><Metric label="Estimated runtime" value={formatDuration(build.renderPlan.durationInFrames, build.renderPlan.fps)} detail={`${build.renderPlan.fps} fps · ${build.renderPlan.height}p`} /></section>
          <CutTimeline build={build} selectedShotId={selectedShot.id} onSelect={setSelectedShotId} />
          {renderJob?.status === "completed" ? <ApprovedRenderReview build={build} job={renderJob} onReveal={() => void host.openRenderedFile(renderJob.jobId)} onSelect={setSelectedShotId} /> : null}
          <div className="workspace-grid">
            <DirectionBoard build={build} selectedShotId={selectedShot.id} onSelect={setSelectedShotId} />
            <aside className="shot-inspector">
              <header><div><p className="eyebrow">Shot inspector</p><h2>{selectedShot.number}</h2></div><span>{selectedShot.treatment.replaceAll("-", " ")}</span></header>
              <div className="intent-card"><WandSparkles size={19} /><div><small>Selected intent</small><strong>{selectedShot.title}</strong><p>{selectedShot.caption ?? selectedShot.actions[0]!.label}</p></div></div>
              <label>Framing<select aria-label="Shot framing" value={currentOverride?.framing ?? selectedShot.framing} onChange={(event) => updateOverride({framing: event.target.value as ShotOverride["framing"]})}>{framings.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
              <label>Visual treatment<select aria-label="Visual treatment" value={currentOverride?.treatment ?? ""} onChange={(event) => updateOverride({treatment: event.target.value ? event.target.value as ShotTreatment : undefined})}><option value="">Profile default · {baseSelectedShot.treatment.replaceAll("-", " ")}</option>{treatments.map((value) => <option key={value} value={value}>{value.replaceAll("-", " ")}</option>)}</select></label>
              <div className="requirement-routing" aria-label="Rerouted visual requirements"><div><span>Active visual route</span><strong>{selectedNewBriefs} new · {selectedDeferredRequirements} deferred</strong></div><div className="requirement-chips">{selectedShot.visualBindings.map((binding) => <span className={`is-${binding.resolutionStatus}`} key={binding.requirementId}>{binding.role.replaceAll("-", " ")}</span>)}</div><small>Treatment changes rebuild requirement IDs, generation briefs, bindings, metrics, and the frozen render hash.</small></div>
              <label>Transition<select aria-label="Shot transition" value={currentOverride?.transition ?? ""} onChange={(event) => updateOverride({transition: event.target.value ? event.target.value as ShotOverride["transition"] : undefined})}><option value="">Profile default · {selectedShot.transition.replaceAll("-", " ")}</option>{transitionStyles.map((value) => <option key={value} value={value}>{value.replaceAll("-", " ")}</option>)}</select></label>
              <label>Camera action<select aria-label="Camera action" value={currentOverride?.cameraAction ?? ""} onChange={(event) => updateOverride({cameraAction: event.target.value ? event.target.value as ShotOverride["cameraAction"] : undefined})}><option value="">Profile default</option>{cameraActions.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
              <label>Performance gesture<select aria-label="Performance gesture" value={currentOverride?.gesture ?? ""} onChange={(event) => updateOverride({gesture: event.target.value ? event.target.value as ShotOverride["gesture"] : undefined})}><option value="">Profile default</option>{pack.allowedGestures.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
              <div className="locked-field"><span>Resolved background</span><strong>{pack.assets.find((asset) => asset.id === selectedShot.locationAssetId)?.displayName ?? selectedShot.locationAssetId}</strong><small>Change the approved visual requirement, not the frozen render binding.</small></div>
              <div className="compiled-actions"><span>Compiled actions</span>{selectedShot.actions.map((action) => <div key={action.id}><b>{action.detail.type}</b><small>{action.endFrame - action.startFrame} fr</small></div>)}</div>
              {currentOverride ? <p className="override-state"><Check size={13} />Override compiled into the current render plan.</p> : <p className="override-help">Change a field to create a semantic override. No JSON editing required.</p>}
            </aside>
          </div>
        </> : tab === "assets" ? <AssetExchange session={session} build={build} host={host} capabilities={capabilities} onApprovedAsset={applyApprovedAsset} productionBundleContentHash={lastSavedHash} /> : tab === "audio" ? <AudioTimingWorkspace build={build} capabilities={capabilities} host={host} onAudioMix={applyAudioMix} onMusicTrack={applyMusicTrack} onOverride={updateShotOverride} onSelect={setSelectedShotId} onSoundEffectAssets={applySoundEffectAssets} onSoundEffectCues={applySoundEffectCues} onVoiceTrack={applyVoiceTrack} overrides={session.overrides} productionBundleContentHash={lastSavedHash} selectedShotId={selectedShot.id} session={session} /> : <ProductionPreflight session={session} build={build} capabilities={capabilities} productionBundleContentHash={lastSavedHash} onNavigate={setTab} />}
      </main>
    </div>
  );
}

export function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [session, setSession] = useState<ProductionSession | null>(null);
  const [host] = useState(() => createHostAdapter(window.storyStage));
  const [capabilities, setCapabilities] = useState<DesktopCapabilities>({localRendering: false, openRenderedFile: false, manualImageExchange: false, localAudioImport: false});
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
    setSession({...bundle.production, overrides: bundle.overrides, approvedAssetVersions: bundle.approvedAssetVersions ?? [], audioMix: bundle.audioMix ?? defaultAudioMix(bundle.production.projectType), musicTrack: bundle.musicTrack ?? null, soundEffectAssets: bundle.soundEffectAssets ?? [], soundEffectCues: bundle.soundEffectCues ?? [], voiceTrack: bundle.voiceTrack ?? null});
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
