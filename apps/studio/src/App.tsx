import {Player} from "@remotion/player";
import {
  type Production,
  type DesktopCapabilities,
  type RenderJobState,
  type Scene,
  type Shot,
  type TimelineEvent,
  type TimelineKind,
} from "@storystage/contracts";
import {productions, sampleEpisodePlan} from "@storystage/fixtures";
import {StoryStageComposition} from "@storystage/remotion-runtime";
import {
  Aperture,
  ArrowLeft,
  AudioLines,
  Box,
  Check,
  ChevronDown,
  CircleAlert,
  Clapperboard,
  Clock3,
  Cloud,
  Download,
  FileText,
  FolderOpen,
  Grid2X2,
  Image,
  LayoutDashboard,
  Library,
  LockKeyhole,
  MonitorPlay,
  MoreHorizontal,
  MousePointer2,
  Play,
  Plus,
  Redo2,
  Save,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  TestTube2,
  Undo2,
  Volume2,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import {useEffect, useMemo, useState} from "react";
import {createHostAdapter} from "./host";

type Screen = "productions" | "episode";

const idleRender: RenderJobState = {
  status: "idle",
  progress: null,
  message: "Ready to render",
};

const timelineLabels: Record<TimelineKind, string> = {
  camera: "Camera",
  "character-a": "Iris",
  "character-b": "Otto",
  dialogue: "Dialogue",
  sfx: "SFX",
  music: "Music",
};

const navItems: Array<{icon: LucideIcon; label: string}> = [
  {icon: FileText, label: "Script"},
  {icon: Grid2X2, label: "Board"},
  {icon: Aperture, label: "Stage"},
  {icon: AudioLines, label: "Sound"},
  {icon: Box, label: "Assets"},
  {icon: Download, label: "Deliver"},
];

const stageTone: Record<Production["stage"], string> = {
  development: "neutral",
  "board-review": "proposal",
  "animatic-approved": "approved",
  "voice-recording": "voice",
  "final-render": "approved",
};

function formatTime(frame: number) {
  const totalSeconds = frame / sampleEpisodePlan.fps;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const frames = frame % sampleEpisodePlan.fps;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}:${String(frames).padStart(2, "0")}`;
}

function ProductionArtwork({production}: {production: Production}) {
  return (
    <div className="production-art" style={{"--art-a": production.palette[0], "--art-b": production.palette[1], "--art-c": production.palette[2]} as React.CSSProperties}>
      <div className="art-sun" />
      <div className="art-building art-building-a" />
      <div className="art-building art-building-b" />
      <div className="art-character art-character-a"><span /></div>
      <div className="art-character art-character-b"><span /></div>
      <div className="art-grain" />
      <span className="show-pack-tag">{production.showPack}</span>
    </div>
  );
}

function AppMark({compact = false}: {compact?: boolean}) {
  return (
    <div className={`app-mark ${compact ? "is-compact" : ""}`} aria-label="StoryStage">
      <span className="mark-frame"><span className="mark-stage" /></span>
      {!compact ? <span>StoryStage</span> : null}
    </div>
  );
}

function ProductionsScreen({onOpen}: {onOpen: (production: Production) => void}) {
  return (
    <div className="productions-shell">
      <aside className="productions-sidebar">
        <AppMark />
        <nav className="home-nav" aria-label="Home">
          <button className="home-nav-item is-active"><LayoutDashboard size={17} />Productions</button>
          <button className="home-nav-item"><Library size={17} />Show Packs</button>
          <button className="home-nav-item"><Box size={17} />Asset library</button>
        </nav>
        <div className="sidebar-rule" />
        <p className="sidebar-label">Workspace</p>
        <button className="home-nav-item"><MonitorPlay size={17} />Render queue<span className="nav-count">1</span></button>
        <button className="home-nav-item"><Settings2 size={17} />Preferences</button>
        <div className="sidebar-spacer" />
        <div className="local-studio-card">
          <span className="status-light" />
          <div><strong>Local studio</strong><small>Renderer available</small></div>
          <MoreHorizontal size={16} />
        </div>
        <div className="profile-row">
          <span className="avatar">PB</span>
          <div><strong>Preston</strong><small>Director</small></div>
          <ChevronDown size={15} />
        </div>
      </aside>

      <main className="productions-main">
        <header className="productions-header">
          <div>
            <p className="eyebrow">Production desk</p>
            <h1>Good evening, Preston.</h1>
            <p>Pick up where the story left off.</p>
          </div>
          <div className="header-actions">
            <button className="icon-button" aria-label="Search"><Search size={18} /></button>
            <button className="primary-button"><Plus size={17} />New production</button>
          </div>
        </header>

        <section className="section-block" aria-labelledby="recent-heading">
          <div className="section-heading-row">
            <div><p className="section-kicker">On your desk</p><h2 id="recent-heading">Recent productions</h2></div>
            <button className="text-button">View all <span>→</span></button>
          </div>
          <div className="production-grid">
            {productions.map((production, index) => (
              <article className={`production-card ${index === 0 ? "is-featured" : ""}`} key={production.id}>
                <ProductionArtwork production={production} />
                <div className="production-card-body">
                  <div className="card-meta-row">
                    <span className={`stage-badge ${stageTone[production.stage]}`}><span />{production.stageLabel}</span>
                    <button className="bare-icon-button" aria-label={`More options for ${production.episodeTitle}`}><MoreHorizontal size={18} /></button>
                  </div>
                  <p className="show-name">{production.title}</p>
                  <h3>{production.episodeTitle}</h3>
                  <p className="logline">{production.logline}</p>
                  <div className="card-footer">
                    <span><Clock3 size={14} />{production.durationLabel}</span>
                    <span>{production.updatedLabel}</span>
                  </div>
                  <button className="card-open-button" onClick={() => onOpen(production)} aria-label={`Open ${production.episodeTitle}`}>
                    Open production <span>↗</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="render-queue-card" aria-labelledby="queue-heading">
          <div className="queue-icon"><Clapperboard size={22} /></div>
          <div className="queue-copy"><p className="section-kicker">Render queue</p><h2 id="queue-heading">Scene 12 · final quality</h2><p>Frankly Weird History · The Dancing Plague</p></div>
          <div className="queue-progress"><div className="queue-progress-label"><span>Rendering frames</span><strong>68%</strong></div><div className="progress-track"><span style={{width: "68%"}} /></div></div>
          <button className="secondary-button"><MonitorPlay size={16} />View queue</button>
        </section>
      </main>
    </div>
  );
}

function SceneThumbnail({scene}: {scene: Scene}) {
  return (
    <div className="scene-thumbnail" style={{"--scene-color": scene.color} as React.CSSProperties}>
      <span className="scene-sun" />
      <span className="scene-set scene-set-a" />
      <span className="scene-set scene-set-b" />
      <span className="scene-person scene-person-a" />
      <span className="scene-person scene-person-b" />
      <span className="scene-grain" />
    </div>
  );
}

function SceneStrip({selectedId, selectedShotId, onSelect, onSelectShot}: {selectedId: string; selectedShotId: string; onSelect: (scene: Scene) => void; onSelectShot: (shot: Shot) => void}) {
  return (
    <section className="scene-strip" aria-label="Scenes">
      <div className="scene-strip-title"><span>Scenes</span><strong>{sampleEpisodePlan.scenes.length}</strong></div>
      <div className="scene-cards">
        {sampleEpisodePlan.scenes.map((scene) => (
          <button className={`scene-card ${selectedId === scene.id ? "is-selected" : ""}`} key={scene.id} onClick={() => onSelect(scene)}>
            <SceneThumbnail scene={scene} />
            <span className="scene-number">{String(scene.number).padStart(2, "0")}</span>
            <span className="scene-copy"><strong>{scene.title}</strong><small>{formatTime(scene.startFrame)} · {Math.round(scene.durationInFrames / sampleEpisodePlan.fps)}s</small></span>
          </button>
        ))}
        <button className="add-scene-button" aria-label="Add scene"><Plus size={17} /><span>Add scene</span></button>
      </div>
      <div className="shot-pills" aria-label="Shots">
        {sampleEpisodePlan.shots.filter((shot) => shot.sceneId === selectedId).map((shot) => (
          <button className={selectedShotId === shot.id ? "is-selected" : ""} key={shot.id} onClick={() => onSelectShot(shot)}>
            {shot.number} · {shot.title}
          </button>
        ))}
      </div>
    </section>
  );
}

function TimelineClip({event, selected, onSelect}: {event: TimelineEvent; selected: boolean; onSelect: (event: TimelineEvent) => void}) {
  const left = (event.startFrame / sampleEpisodePlan.durationInFrames) * 100;
  const width = (event.durationInFrames / sampleEpisodePlan.durationInFrames) * 100;
  return (
    <button
      className={`timeline-clip ${selected ? "is-selected" : ""}`}
      onClick={() => onSelect(event)}
      style={{left: `${left}%`, width: `${width}%`, "--clip-color": event.color} as React.CSSProperties}
      title={`${event.label}: ${event.detail}`}
    >
      {event.locked ? <LockKeyhole size={10} /> : null}<span>{event.label}</span>
    </button>
  );
}

function SemanticTimeline({selectedEvent, onSelect}: {selectedEvent: string | null; onSelect: (event: TimelineEvent) => void}) {
  const kinds = Object.keys(timelineLabels) as TimelineKind[];
  return (
    <section className="timeline-panel" aria-label="Semantic timeline">
      <div className="timeline-toolbar">
        <div className="transport">
          <button aria-label="Previous frame"><span>‹</span></button>
          <button className="transport-play" aria-label="Play timeline"><Play size={13} fill="currentColor" /></button>
          <button aria-label="Next frame"><span>›</span></button>
          <time>00:06:18</time>
          <span className="duration">/ 00:12:00</span>
        </div>
        <div className="timeline-actions"><button><MousePointer2 size={14} /></button><button><SlidersHorizontal size={14} /></button><button><span>−</span></button><span className="zoom-track"><i /></span><button><span>+</span></button></div>
      </div>
      <div className="time-ruler"><span className="track-label-space" />{[0, 2, 4, 6, 8, 10, 12].map((time) => <span key={time}>{time}s</span>)}</div>
      <div className="timeline-content">
        <div className="playhead" style={{left: "calc(154px + 52.5%)"}}><span /></div>
        {kinds.map((kind) => (
          <div className="timeline-track" key={kind}>
            <div className="track-label"><span className={`track-glyph ${kind}`} />{timelineLabels[kind]}</div>
            <div className="track-lane">
              {sampleEpisodePlan.timeline.filter((event) => event.kind === kind).map((event) => (
                <TimelineClip event={event} key={event.id} onSelect={onSelect} selected={selectedEvent === event.id} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Inspector({shot, event}: {shot: Shot; event?: TimelineEvent}) {
  const objectTitle = event?.label ?? shot.title;
  const objectDetail = event?.detail ?? shot.description;
  return (
    <aside className="inspector-panel">
      <div className="inspector-heading">
        <div><p className="eyebrow">Director</p><h2>{shot.number}</h2></div>
        <button className="bare-icon-button" aria-label="Inspector options"><MoreHorizontal size={18} /></button>
      </div>
      <div className="selected-object-card">
        <span className="object-icon"><WandSparkles size={17} /></span>
        <div><small>{event ? timelineLabels[event.kind] : "Selected shot"}</small><strong>{objectTitle}</strong><p>{objectDetail}</p></div>
        <span className="proposal-dot">AI</span>
      </div>
      <div className="inspector-section">
        <div className="inspector-section-title"><span>Shot direction</span><ChevronDown size={14} /></div>
        <label>Framing<button>{shot.framing}<ChevronDown size={13} /></button></label>
        <label>Purpose<textarea value={shot.purpose} readOnly /></label>
        <div className="field-grid"><label>Lead-in<div className="number-field">8 <span>fr</span></div></label><label>Hold<div className="number-field">12 <span>fr</span></div></label></div>
      </div>
      <div className="inspector-section">
        <div className="inspector-section-title"><span>Performance</span><ChevronDown size={14} /></div>
        <label>Intensity<div className="range-row"><input type="range" min="0" max="100" defaultValue="42" /><output>42%</output></div></label>
        <label>Look target<button>Camera<ChevronDown size={13} /></button></label>
        <label>Trigger<div className="text-field">word “apparently”</div></label>
      </div>
      <div className="inspector-section sound-cue-section">
        <div className="inspector-section-title"><span>Sound cue</span><ChevronDown size={14} /></div>
        <div className="cue-row"><Volume2 size={16} /><div><strong>paper.flip</strong><small>Variation 3 of 8 · −11 dB</small></div><button><Play size={12} fill="currentColor" /></button></div>
      </div>
      <div className="inspector-footer">
        <button className="reject-button">Reject</button>
        <button className="approve-button"><Check size={15} />Approve</button>
      </div>
    </aside>
  );
}

function RenderStatus({render, onReveal, onRetry}: {render: RenderJobState; onReveal: () => void; onRetry: () => void}) {
  if (render.status === "idle") return null;
  const progress = render.status === "completed" ? 1 : render.progress ?? 0;
  return (
    <div className={`render-status ${render.status}`} role="status">
      <div className="render-status-icon">
        {render.status === "completed" ? <Check size={16} /> : render.status === "failed" ? <CircleAlert size={16} /> : <Clapperboard size={16} />}
      </div>
      <div><strong>{render.message}</strong><div className="mini-progress"><span style={{width: `${Math.round(progress * 100)}%`}} /></div></div>
      <span>{render.status === "completed" ? "100%" : render.progress === null ? "—" : `${Math.round(progress * 100)}%`}</span>
      {render.status === "completed" ? <button onClick={onReveal}><FolderOpen size={14} />Show file</button> : null}
      {render.status === "failed" ? <button onClick={onRetry}>Retry</button> : null}
    </div>
  );
}

function EpisodeWorkspace({onBack}: {onBack: () => void}) {
  const [selectedScene, setSelectedScene] = useState(sampleEpisodePlan.scenes[1]!.id);
  const [selectedShot, setSelectedShot] = useState(sampleEpisodePlan.shots[2]!.id);
  const [selectedEvent, setSelectedEvent] = useState<string | null>("cam-2");
  const [render, setRender] = useState<RenderJobState>(idleRender);
  const [capabilities, setCapabilities] = useState<DesktopCapabilities | null>(null);
  const host = useMemo(() => createHostAdapter(window.storyStage), []);

  const shot = useMemo(() => sampleEpisodePlan.shots.find((item) => item.id === selectedShot) ?? sampleEpisodePlan.shots[0]!, [selectedShot]);
  const event = useMemo(() => sampleEpisodePlan.timeline.find((item) => item.id === selectedEvent), [selectedEvent]);

  useEffect(() => {
    return host.subscribeToRenderJobs(setRender);
  }, [host]);

  useEffect(() => {
    let active = true;
    void host.getCapabilities().then((next) => {
      if (active) setCapabilities(next);
    });
    return () => { active = false; };
  }, [host]);

  const selectScene = (scene: Scene) => {
    setSelectedScene(scene.id);
    setSelectedShot(scene.shotIds[0]!);
    setSelectedEvent(null);
  };

  const selectTimelineEvent = (timelineEvent: TimelineEvent) => {
    setSelectedEvent(timelineEvent.id);
    const matchingShot = sampleEpisodePlan.shots.find(
      (candidate) => timelineEvent.startFrame >= candidate.startFrame && timelineEvent.startFrame < candidate.startFrame + candidate.durationInFrames,
    );
    if (matchingShot) {
      setSelectedShot(matchingShot.id);
      setSelectedScene(matchingShot.sceneId);
    }
  };

  const selectShot = (nextShot: Shot) => {
    setSelectedShot(nextShot.id);
    setSelectedScene(nextShot.sceneId);
    setSelectedEvent(null);
  };

  const startRender = async (simulateFailure = false) => {
    if (!capabilities?.localRendering) return;
    try {
      const result = await host.startSampleRender({simulateFailure});
      setRender((current) => current.status === "idle" ? {jobId: result.jobId, status: "queued", progress: null, message: "Render queued"} : current);
    } catch (error) {
      const message = error instanceof Error ? error.message : "The desktop render connection stopped unexpectedly";
      setRender({jobId: "unstarted", status: "failed", progress: null, message, error: {code: "START_REJECTED", message}});
    }
  };

  const revealOutput = async () => {
    if (render.status !== "completed") return;
    const result = await host.openRenderedFile(render.jobId);
    if (!result.ok) setRender({jobId: render.jobId, status: "failed", progress: null, message: result.error.message, error: result.error});
  };

  return (
    <div className="workspace-shell">
      <header className="workspace-topbar">
        <div className="workspace-brand"><AppMark compact /><button className="back-button" onClick={onBack} aria-label="Back to productions"><ArrowLeft size={15} /></button><div className="production-crumb"><span>Frankly Weird History</span><strong>The Dancing Plague</strong></div></div>
        <div className="save-state"><Cloud size={14} /><span>Saved just now</span></div>
        <div className="workspace-actions"><button className="history-button" aria-label="Undo"><Undo2 size={15} /></button><button className="history-button" aria-label="Redo"><Redo2 size={15} /></button><span className="toolbar-rule" /><button className="secondary-button"><Save size={15} />Save</button><button className="preview-button"><Play size={14} fill="currentColor" />Preview</button><button className="primary-button" disabled={!capabilities?.localRendering} title={capabilities?.localRendering ? "Render locally" : "Desktop app required for local rendering"} onClick={() => void startRender()}><Clapperboard size={16} />Render</button><button className="bare-icon-button" aria-label="More workspace options"><MoreHorizontal size={19} /></button></div>
      </header>

      <div className="workspace-body">
        <aside className="workspace-nav">
          <p>Production</p>
          <nav aria-label="Production sections">
            {navItems.map(({icon: Icon, label}) => <button className={label === "Stage" ? "is-active" : ""} key={label}><Icon size={17} /><span>{label}</span>{label === "Board" ? <i>2</i> : null}</button>)}
          </nav>
          <div className="workspace-nav-spacer" />
          <button className="ai-director-button"><Sparkles size={17} /><span><strong>Ask Director</strong><small>Context-aware help</small></span></button>
          <button className="failure-test-button" disabled={!capabilities?.localRendering} onClick={() => void startRender(true)}><TestTube2 size={14} />Test worker failure</button>
        </aside>

        <main className="stage-workspace">
          <div className="stage-header">
            <div><p className="eyebrow">Scene 03 · Shot {shot.number}</p><h1>{shot.title}</h1></div>
            <div className="stage-header-actions"><span className={`shot-status ${shot.status}`}><span />{shot.status}</span><button><Image size={15} />Compare</button><button className="direct-button"><Sparkles size={14} />Direct this shot</button></div>
          </div>
          <div className="preview-area">
            <div className="player-frame">
              <Player
                component={StoryStageComposition}
                inputProps={{plan: sampleEpisodePlan}}
                durationInFrames={sampleEpisodePlan.durationInFrames}
                compositionWidth={sampleEpisodePlan.width}
                compositionHeight={sampleEpisodePlan.height}
                fps={sampleEpisodePlan.fps}
                acknowledgeRemotionLicense
                controls
                style={{width: "100%", height: "100%"}}
              />
              <div className="preview-badge"><span />720p animatic</div>
              {capabilities && !capabilities.localRendering ? <div className="browser-render-notice">Desktop app required for local rendering</div> : null}
            </div>
            <RenderStatus render={render} onReveal={() => void revealOutput()} onRetry={() => void startRender(false)} />
          </div>
          <SceneStrip selectedId={selectedScene} selectedShotId={selectedShot} onSelect={selectScene} onSelectShot={selectShot} />
          <SemanticTimeline selectedEvent={selectedEvent} onSelect={selectTimelineEvent} />
        </main>

        <Inspector shot={shot} event={event} />
      </div>
    </div>
  );
}

export function App() {
  const [screen, setScreen] = useState<Screen>("productions");

  return screen === "productions" ? (
    <ProductionsScreen onOpen={() => setScreen("episode")} />
  ) : (
    <EpisodeWorkspace onBack={() => setScreen("productions")} />
  );
}
