import {Player} from "@remotion/player";
import {ProductionComposition} from "@storystage/remotion-runtime";
import {
  compileCv002AssignedScenePreview,
  createCv002TemplateAssignment,
  CV002_OBJECT_DISCOVERY_TEMPLATE_ID,
  CV002_OBJECT_DISCOVERY_TEMPLATE_VERSION,
  CV002_PROTOTYPE_CHARACTER_ASSET,
  CV002_PROTOTYPE_LANTERN_ASSET,
  type Cv002Project,
  type Cv002TemplateAssignment,
} from "@storystage/story-engine";
import {Check, Clapperboard, Play, ShieldCheck, Sparkles, X} from "lucide-react";
import {useMemo, useState} from "react";

const SLOT_COPY = [
  {key: "notice", label: "1 · Notice object", help: "Character spots the lantern and the audience reads the discovery."},
  {key: "pickup", label: "2 · Reach and pick up", help: "Anticipation, articulated reach, hand attachment, lift, and settle."},
  {key: "present", label: "3 · React and present", help: "Readable reaction, turn toward camera, present, and final hold."},
] as const;

export function Cv002TemplateAssignmentPanel({
  assignment,
  onAssignmentChange,
  project,
}: {
  assignment: Cv002TemplateAssignment | null;
  onAssignmentChange: (assignment: Cv002TemplateAssignment | null) => void;
  project: Cv002Project;
}) {
  const eligibleScenes = project.graph.scenes.filter((scene) => scene.beats.length === 3);
  const [sceneId, setSceneId] = useState("");
  const selectedScene = eligibleScenes.find((scene) => scene.id === sceneId) ?? null;
  const [noticeBeatId, setNoticeBeatId] = useState("");
  const [pickupBeatId, setPickupBeatId] = useState("");
  const [presentBeatId, setPresentBeatId] = useState("");
  const [characterAssetId, setCharacterAssetId] = useState("");
  const [propAssetId, setPropAssetId] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preview = useMemo(() => previewOpen && assignment ? compileCv002AssignedScenePreview(project, assignment) : null, [assignment, previewOpen, project]);
  const slotIds = [noticeBeatId, pickupBeatId, presentBeatId];
  const complete = Boolean(selectedScene && slotIds.every(Boolean) && new Set(slotIds).size === 3 && characterAssetId && propAssetId);

  if (project.grammar !== "kids-adventure") return (
    <section className="cv2-template-panel is-unavailable" aria-label="Animation template assignment">
      <header><span><Clapperboard size={18} /></span><div><small>Animation template</small><h2>Direction only · template not assigned</h2></div></header>
      <p>The current articulated prototype is a Kids object-discovery performance. Weird History needs separate presenter, evidence, diagram, and kinetic-type templates before preview can unlock.</p>
    </section>
  );

  if (assignment) {
    const sceneIndex = project.graph.scenes.findIndex((scene) => scene.id === assignment.sceneId);
    return (
      <section className="cv2-template-panel is-assigned" aria-label="Animation template assignment">
        <header><span><ShieldCheck size={18} /></span><div><small>Capability-gated animation</small><h2>Object discovery template assigned</h2></div><em>Scene {sceneIndex + 1}</em></header>
        <div className="cv2-assignment-summary">
          <div><small>Template</small><strong>{assignment.template.id}</strong><span>v{assignment.template.version}</span></div>
          <div><small>Character asset</small><strong>{CV002_PROTOTYPE_CHARACTER_ASSET.label}</strong><span>Project-owned · v{assignment.characterAsset.version}</span></div>
          <div><small>Prop asset</small><strong>{CV002_PROTOTYPE_LANTERN_ASSET.label}</strong><span>Project-owned · v{assignment.propAsset.version}</span></div>
        </div>
        <ol className="cv2-assigned-slots">
          {assignment.slots.map((slot, index) => {
            const beat = project.graph.scenes[sceneIndex]!.beats.find((candidate) => candidate.id === slot.beatId)!;
            return <li key={slot.slot}><span>{index + 1}</span><div><small>{slot.slot.replaceAll("-", " ")}</small><strong>{beat.text}</strong></div></li>;
          })}
        </ol>
        <p className="cv2-template-boundary"><Sparkles size={15} />This maps your words onto the project-owned lantern prototype. It does not generate new art, infer objects, or animate other scenes.</p>
        <div className="cv2-template-actions">
          <button className="is-preview" onClick={() => setPreviewOpen((open) => !open)} type="button"><Play fill="currentColor" size={16} />{previewOpen ? "Close animated preview" : "Preview animated scene"}</button>
          <button onClick={() => {setPreviewOpen(false); onAssignmentChange(null);}} type="button"><X size={16} />Remove assignment</button>
        </div>
        {preview ? <section className="cv2-template-preview" aria-label="Assigned animated scene preview">
          <header><div><small>Real articulated preview</small><strong>Scene {sceneIndex + 1} · {assignment.template.id}</strong></div><span><Check size={14} />Assignment verified</span></header>
          <div>
            <Player
              acknowledgeRemotionLicense
              allowFullscreen
              autoPlay
              component={ProductionComposition}
              compositionHeight={preview.renderPlan.height}
              compositionWidth={preview.renderPlan.width}
              controls
              durationInFrames={preview.renderPlan.durationInFrames}
              fps={preview.renderPlan.fps}
              inputProps={{plan: preview.renderPlan, playbackAssets: {}, sliceDurationInFrames: preview.renderPlan.durationInFrames, directedSceneMotion: preview.compiled.sceneMotion, showMotionDiagnostics: false}}
              style={{aspectRatio: "16 / 9", width: "100%"}}
            />
          </div>
          <footer><strong>10 seconds · 30 fps · articulated SVG rig</strong><span>Notice → attach and lift → react and present</span></footer>
        </section> : null}
      </section>
    );
  }

  return (
    <section className="cv2-template-panel" aria-label="Animation template assignment">
      <header><span><Clapperboard size={18} /></span><div><small>One supported animation template</small><h2>Map a Kids scene to real motion</h2></div><em>{CV002_OBJECT_DISCOVERY_TEMPLATE_ID} · v{CV002_OBJECT_DISCOVERY_TEMPLATE_VERSION}</em></header>
      <p className="cv2-template-intro">Nothing is inferred. Choose one scene, tell StoryStage exactly which beat fills each performance slot, then explicitly select the project-owned character and lantern assets.</p>
      {eligibleScenes.length === 0 ? <p className="cv2-template-empty">No scene currently has exactly three beats. Edit the breakdown before assigning this template.</p> : <>
        <label htmlFor="cv2-template-scene">Three-beat scene</label>
        <select id="cv2-template-scene" onChange={(event) => {setSceneId(event.target.value); setNoticeBeatId(""); setPickupBeatId(""); setPresentBeatId(""); setError(null);}} value={sceneId}>
          <option value="">Choose a scene…</option>
          {eligibleScenes.map((scene) => <option key={scene.id} value={scene.id}>Scene {project.graph.scenes.indexOf(scene) + 1} · {scene.beats[0]!.text.slice(0, 72)}</option>)}
        </select>
        {selectedScene ? <div className="cv2-slot-mapper">
          {SLOT_COPY.map((slot, index) => {
            const value = [noticeBeatId, pickupBeatId, presentBeatId][index]!;
            const setter = [setNoticeBeatId, setPickupBeatId, setPresentBeatId][index]!;
            return <label key={slot.key}><span><strong>{slot.label}</strong><small>{slot.help}</small></span><select aria-label={slot.label} onChange={(event) => setter(event.target.value)} value={value}><option value="">Choose a beat…</option>{selectedScene.beats.map((beat, beatIndex) => <option key={beat.id} value={beat.id}>{beatIndex + 1} · {beat.text}</option>)}</select></label>;
          })}
        </div> : null}
        <fieldset className="cv2-asset-picker">
          <legend>Project-owned prototype assets</legend>
          <button aria-pressed={characterAssetId === CV002_PROTOTYPE_CHARACTER_ASSET.id} onClick={() => setCharacterAssetId(CV002_PROTOTYPE_CHARACTER_ASSET.id)} type="button"><span className="is-mara">M</span><div><small>Character</small><strong>{CV002_PROTOTYPE_CHARACTER_ASSET.label}</strong><em>Project-owned · v{CV002_PROTOTYPE_CHARACTER_ASSET.version}</em></div>{characterAssetId ? <Check size={16} /> : null}</button>
          <button aria-pressed={propAssetId === CV002_PROTOTYPE_LANTERN_ASSET.id} onClick={() => setPropAssetId(CV002_PROTOTYPE_LANTERN_ASSET.id)} type="button"><span className="is-lantern">✦</span><div><small>Prop</small><strong>{CV002_PROTOTYPE_LANTERN_ASSET.label}</strong><em>Project-owned · v{CV002_PROTOTYPE_LANTERN_ASSET.version}</em></div>{propAssetId ? <Check size={16} /> : null}</button>
        </fieldset>
        {slotIds.filter(Boolean).length === 3 && new Set(slotIds).size !== 3 ? <p className="cv2-template-error" role="alert">Each performance slot needs a different beat.</p> : null}
        {error ? <p className="cv2-template-error" role="alert">{error}</p> : null}
        <button className="cv2-assign-template" disabled={!complete} onClick={() => {
          try {
            const next = createCv002TemplateAssignment({project, sceneId, noticeBeatId, pickupBeatId, presentBeatId, characterAssetId, propAssetId});
            setError(null);
            onAssignmentChange(next);
          } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Template assignment could not be verified.");
          }
        }} type="button"><ShieldCheck size={17} />Verify and assign template</button>
      </>}
    </section>
  );
}
