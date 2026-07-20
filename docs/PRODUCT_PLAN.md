# StoryStage v1 product plan

> Stable product and architecture charter. Read the full execution sequence in
> [`PRODUCT_ROADMAP.md`](PRODUCT_ROADMAP.md) and the only live phase/package state
> in [`ROADMAP_STATUS.md`](ROADMAP_STATUS.md).

**Status:** Binding product and architecture charter

**Product owner:** Preston

**Accepted reset base:** `e4c5f7eb92c8a09423bc80ed079813c1f51ca721`

**Integration branch:** `product/v1`

**Updated:** 2026-07-20

## 1. Product definition

StoryStage is a single-user desktop animation studio that turns a script into an editable, layered animation production. It directs scenes and shots, prepares reusable art and rigs, animates 2D characters and multiplane environments, records or imports narration, places real sound, and exports through Remotion.

It does **not** generate finished video through Veo, Seedance, or a similar service. It builds animation from controlled assets, rigs, backgrounds, layers, props, motion programs, camera direction, audio, editing, and deterministic rendering.

### Initial production defaults

- Kids Adventure first: Ollo, Tix, Dot, and Storylight.
- Storybook watercolor / cut-paper mixed-media art direction.
- 16:9, 1920×1080, 30 fps.
- User-recorded narration first, with import and record-later states.
- Approximate 6–8-viseme lip sync with manual correction, not expensive perfect facial solving.
- Real imported or locally stored SFX and music.
- ChatGPT-assisted image creation through an explicit manual request/import workflow first.
- Codex as the first supported in-product AI Director, launched locally through
  the official Codex App Server and signed in through Codex's browser-mediated
  **Sign in with ChatGPT** flow. StoryStage never asks for an OpenAI API key,
  never copies browser cookies, and never stores the user's ChatGPT credentials.
- Godot 4.x as the free, open-source 2D character/performance engine; no paid
  animation runtime or per-export dependency is required for ordinary episodes.
- Remotion as the canonical episode editor, compositor, timing/audio authority,
  preview surface, and final renderer. Godot supplies deterministic animated
  character/prop passes; it does not replace the StoryStage edit or export path.
- Final target: approximately 20-minute episodes.
- Proof gates: one coherent 25–30 second scene, one finished 2–3 minute pilot, then one reliable 20-minute episode.

## 2. Creator experience

There are only three creator-facing screens:

```text
Projects
  → Create
    → Studio
       ├─ Direct
       ├─ Visual / Camera
       ├─ Motion
       ├─ Assets & Rigs
       ├─ Narration / SFX / Music
       └─ Export
```

### Projects

A simple episode list with thumbnail, title, grammar/style, duration, and honest status: Draft, Missing assets, Ready, or Exporting. The primary actions are Continue and New project. There are no accounts, enterprise dashboards, or production bureaucracy.

### Create

- Start from a pasted/imported script or ask the AI Director to draft one for a
  selected Show Pack, grammar, target duration, cast, and creative brief.
- Choose Kids Adventure or Weird History.
- Choose an art direction.
- Choose estimated, guide, imported, or record-later narration.
- Show estimated duration.
- Preview the proposed episode → sequence → scene → beat hierarchy before it
  becomes project state.
- Revise, approve, or reject the script/hierarchy proposal, then create an
  editable first cut. A request such as "write a 15-minute Ollo episode" never
  silently renders or overwrites a project.

### Studio

- **Left:** collapsible acts, sequences, scenes, and beats.
- **Center:** authoritative Remotion preview and real transport controls.
- **Right:** Direct, Visual/Camera, Motion, Assets/Rigs, and Audio inspectors.
- **AI Director:** a persistent creator-facing conversation that clearly shows
  whether it is scoped to the episode, sequence, scene, beat, or selected range;
  streams progress; explains proposed changes; and offers Preview, Apply,
  Revise, Reject, and Undo. Accepted changes use the same validated commands as
  manual controls.
- **Bottom:** compact episode overview plus expanded tracks for the selected scene.
- **Tracks:** characters, props, camera, voice, SFX, and music.
- **Top-right:** Preview and Export.

A 20-minute project never renders thousands of expanded beat cards. The overview stays scene-level; only the selected sequence or scene expands.

During frontend development, a bounded local Ollo demo drives the complete 20-minute information architecture. It must always show:

> Local UI demo — production services are not connected.

No control may fake a generated, uploaded, recorded, rendered, or exported success state.

## 3. Frontend-first delivery — Kimi

Codex reviews and integrates these phases but does not start unrelated backend implementation.

| Phase                                 | Visible delivery                                                                               | Acceptance gate                                                                                                            |
| ------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **F1 — Projects + Create**            | One unified entry, project list, and Create screen matching the approved product direction     | 1440×900 and 1920×1080 screenshots; script import, selections, demo loading, and navigation work; no dead success controls |
| **F2 — Long-form Studio shell**       | Hierarchical scene rail, preview area, transport, and 20-minute episode overview               | The complete demo episode is navigable without losing selection, flooding the screen, or freezing                          |
| **F3 — Director workspace**           | Direct, Visual, Motion, and AI Director proposal/review surfaces with explicit scope and undo   | Every visible control changes local state or clearly explains why it is unavailable                                        |
| **F4 — Assets and rigs**              | Characters, rigs, locations, layered sets, props, and asset-request views                      | Every scene exposes understandable asset needs and honest readiness                                                        |
| **F5 — Narration and sound**          | Recording states, take management, voice track, SFX placement, and music controls              | Record/retake/import/mute/retime UX is complete, including permission and missing-device errors                            |
| **F6 — Timeline, export, and polish** | Track editing, zoom, trim/drag prototypes, export drawer, accessibility, and final visual pass | Preston accepts the complete Projects → Create → Studio click-through as understandable and visually coherent              |

**Frontend Gate:** F1–F6 are accepted by Preston. Only then may normal backend product implementation begin.

### E0 — approved Godot/Remotion feasibility spike

Preston authorizes one isolated, non-shipping engine spike while the frontend
gate remains active. This is research evidence, not backend product
implementation and not permission to advance B1 or B2.

The spike must:

- install and record one pinned stable Godot 4.x build locally without checking
  the engine binary, installer, cache, or credentials into Git;
- create one four-second, 120-frame, 1920×1080, 30 fps 2D cutout performance
  using `Skeleton2D`/`Bone2D` and real articulated motion—not whole-pose image
  swapping or a character sliding across the frame;
- use approved existing Ollo parts only if their public provenance and rig
  readiness are already valid; otherwise use an original visibly labelled
  engine-test puppet rather than weakening an asset gate;
- render the puppet into a transparent `SubViewport`, capture each completed
  frame with `get_texture().get_image()`, and save RGBA PNGs from GDScript under
  an unattended fixed-frame-rate command. Godot's built-in PNG MovieWriter is
  not valid evidence because it does not preserve the required transparency;
- record the exact Godot version and executable hash, operating system,
  rendering method and driver, GPU/driver identity, relevant project settings,
  and command line;
- produce exactly 120 consecutively numbered 1920×1080 RGBA frames with no
  missing or duplicate indices and prove nontrivial alpha in representative
  frames;
- repeat the Godot render on that pinned host. Decoded RGBA pixel buffers must
  match exactly; raw PNG byte equality is reported separately. Any mismatch is
  a failure and must not be hidden;
- composite those exact 120 frames in Remotion and render a 120-frame
  downloadable MP4 plus representative stills, with commands, hashes, frame
  count, and known limitations recorded in Git;
- remain outside the creator UI, desktop persistence, Director contracts, and
  production render path, and stop after the evidence handback.

E0 closes before F1 acceptance with an explicit `PASS` or `FAIL`. Failure does
not fail the F1 UI, but it suspends Godot as the selected B2 engine and requires
a roadmap amendment before further engine work. Passing E0 permits Godot to
remain the planned B2 engine. It does not accept a final rig, final character
art, visual quality, the frontend gate, or B2.

### E1 — approved ChatGPT-subscription agent-bridge feasibility spike

Before F3, StoryStage proves the exact AI integration surface that F3 will
design around. Like E0, E1 is an isolated research exception: it is not backend
product implementation and it does not connect production projects, rendering,
or durable mutation.

The spike must:

- launch one pinned Codex App Server child process over local stdio and complete
  the documented initialize, thread, turn, streaming, cancellation, and shutdown
  lifecycle;
- use Codex's official **Sign in with ChatGPT** browser flow and existing Codex
  credential state. StoryStage must not request, receive, log, back up, or store
  the user's password, browser cookies, API key, access token, or refresh token;
- connect Codex to a read-only StoryStage MCP server exposing only one bounded,
  synthetic scene and a small allowlisted context/tool vocabulary;
- ask for one structured direction revision, validate it against a pinned schema,
  and display streamed progress plus an approval request in an isolated lab UI;
- prove that no command can change a project, call a renderer, approve an asset,
  write outside the lab root, or invent canonical IDs, hashes, timings, or files;
- demonstrate honest not-installed, signed-out, expired/revoked, offline,
  usage-limited, incompatible-version, MCP-startup-failed, cancel, and child-
  process-crash states; and
- record the exact Codex/App Server version, generated protocol schema, launch
  command, supported stable versus experimental methods, checks, and known
  compatibility risk without committing credentials or Codex state.

E1 passes only when the read-only round trip works and the failure/security
matrix is truthful. A pass authorizes F3 to build fixture-backed creator UX
against the proven event/proposal model. It does not authorize B1/B3, live
project mutation, background autonomy, or image generation through the consumer
ChatGPT Images product. A failure keeps F3 paused and requires a new integration
decision; StoryStage does not silently fall back to an API key or website
automation.

## 4. Backend delivery — Codex

Godot is the planned articulated 2D performance worker. StoryStage generates
or updates its rigs and animation jobs through Godot's documented scene,
resource, GDScript, and command-line interfaces; StoryStage does not
reverse-engineer proprietary editor formats. Remotion remains the single
episode composition used for preview and final output, layering Godot character
passes with multiplane environments, camera direction, narration, SFX, music,
captions, and editorial timing.

| Phase                               | Real delivery                                                                                                                                      | Acceptance gate                                                                                                              |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **B1 — One durable project path**   | Approved UI connected to real save/load and long-form project state                                                                                | Create, edit, close, and reopen without using hidden Legacy surfaces                                                         |
| **B2 — Ollo visual engine**         | Godot-driven real Ollo rig and action graph; Remotion-driven layered Little Wood set, foreground occlusion, ambient motion, and canonical playback | One coherent 25–30 second scene with grounded articulated motion and no sliding, clipping, disappearing, or nonsensical cuts |
| **B3 — AI Director automation**     | Subscription-backed Codex sessions, 15–20 minute script/hierarchy drafting, scene/shot planning, continuity, camera, action, props, and editable proposals | Two different briefs create sensible, editable scripts/plans and one scene can be revised without disturbing unrelated work  |
| **B4 — Narration and sound engine** | Microphone recording, WAV storage, take editing, approximate lip sync, SFX, music, and final mix                                                   | Audio survives reload and exported MP4 contains synchronized picture and sound                                               |
| **B5 — Finished Kids pilot**        | Complete 2–3 minute Ollo episode through ordinary Studio                                                                                           | Preston accepts direction, animation, sound, and downloadable MP4                                                            |
| **B6 — Long-form production**       | Long-script ingest, caching, selected-range preview, chunked/stitch rendering                                                                      | Reliable exact 36,000-frame, 20-minute, 30 fps export without memory failure                                                 |
| **B7 — Weird History grammar**      | Archival/stock media, kinetic type, evidence cards, and faster editorial pacing                                                                    | One publishable Weird History pilot through the same product                                                                 |
| **B8 — Specialist shot bridge**     | Blender/After Effects job package and pre-render import                                                                                            | Added only when an approved shot has a need the 2D system cannot reasonably satisfy                                          |

### B3 AI Director and multi-shot directing adaptation

The first supported AI Director is Codex launched locally through the Codex App
Server and signed in through Codex's official ChatGPT subscription flow. A
StoryStage MCP server exposes bounded context and typed commands. The normal
creator UI shows the conversation, scope, progress, proposals, effects, and
approval/undo controls; an advanced console may expose diagnostics, but a
terminal is never required for ordinary creation.

At episode scope, the Director can turn a Show Pack, cast, grammar, target
duration, and creative brief into an editable screenplay and episode → sequence
→ scene → beat hierarchy. At scene or beat scope, it adapts cinematic
multi-shot practice into an editable structured production proposal rather than
send compressed prose to a generated-video service. Inputs combine the current
script, project grammar and art direction, approved assets and rig capabilities,
location layers and props, selected audio timing, incoming continuity, and the
creator's selected range. Output describes motivated shots with purpose,
duration constraints, cut motivation, composition, camera intent, character
blocking and performance, prop/layer behavior, continuity in/out, audio cues,
capability requests, impact summary, and honest fallbacks.

There is no fixed 15-second duration, shot-count quota, 1,500-character limit,
forced camera variation, or diegetic-only audio rule. Timing follows dialogue,
narration, readable action, reactions, and dramatic purpose. Accepted intent is
validated and compiled into bounded Godot performance jobs plus the canonical
Remotion camera, layer, edit, caption, and audio plan. The detailed retained B3
reference is
[`editorial/multi-shot-director-adaptation.md`](editorial/multi-shot-director-adaptation.md).
Codex may propose changes, preview them, and ask StoryStage to apply them only
through the same validated command layer used by manual UI controls. It cannot
directly rewrite canonical project JSON, approve assets, fabricate receipts, or
silently regenerate unrelated ranges. This retained knowledge and the accepted
E1 spike grant no backend implementation authority before the Frontend Gate and
a separately authorized B3 package.

## 5. Animation production rules

### Character tiers

- **Recurring heroes:** front and genuine left/right views; separated padded parts; stable pivots; expressions, blinks, and mouth shapes; reusable idle, talk, walk, run, reach, point, react, enter, and exit performances.
- **Important one-scene character:** limited cutout rig sufficient for the approved shots.
- **Background extra:** sprite plus a small ambient loop.

Feet remain grounded, travel matches the facing direction, and profile movement uses a genuine profile. Characters do not slide sideways while staring at camera.

### Environments

Each useful location can become a restrained multiplane set:

1. far background;
2. midground elements;
3. character and prop plane;
4. foreground occluders aligned to their original image positions;
5. ambient elements.

Reusable deterministic motion includes leaf/grass sway, lantern flicker, water drift, floating pollen/fireflies, and small distant creature loops. Ambient motion serves the shot; every object does not move. Motion blur is a deliberate direction choice and normally affects selected moving layers or the background—not a default blur over a running character.

### Direction and continuity

The AI Director proposes the screenplay hierarchy, dramatic beat, shot purpose,
composition, camera, blocking, action, prop use, transition, narration timing,
sound cues, and continuity requirements. The creator can preview, revise, apply,
reject, and undo those proposals at an explicit episode, sequence, scene, beat,
or selected-range scope. Deterministic code validates identity, timing, scene
state, camera samples, asset availability, and renderability before an accepted
proposal becomes canonical.

Characters, props, screen direction, and scene geography persist across cuts unless an authored transition changes them. Shot duration follows performance and narration; scenes are not forced into equal lengths.

### Narration and lip sync

Narration is recorded or imported by scene/beat while the preview can loop. A take supports arm, record, stop, audition, keep/discard, trim, gain, replace, and restore. Selected narration becomes timing authority only through an explicit action.

Initial lip sync maps speech timing to a small editable viseme set. It is allowed to be approximate; it is not allowed to be random or disconnected from the selected take.

### Sound effects and music

The Director proposes concrete cues such as “two light footsteps,” “soft leaf rustle,” or “Storylight chime.” Cues are filled with real licensed/imported audio and retain source/license metadata when required. Music supports loop, trim, fade, gain, and narration ducking. Suno or another provider may be added later, but provider integration cannot block the first finished episode.

## 6. Team workflow and Git protocol

### Source of truth

- Repository: `truthunknown2-art/StoryStage`.
- Integration branch: `product/v1`.
- Existing proof branches are read-only references unless an active ticket names one.
- Kimi coordination branch: `agent/kimi-frontend`.
- Implementation branches are defined only by `ROADMAP_STATUS.md` and the
  current `KIMI_INBOX.md` assignment.

### Roles

- Kimi owns frontend/UI/UX work in `apps/studio` during F1–F6.
- Codex owns backend, Remotion/runtime, desktop services, rendering, integration, and review.
- Pro audits actual milestone evidence rather than continuously expanding architecture.
- Preston accepts or rejects each phase gate.

### One-ticket protocol

Every ticket names:

- exact base SHA and work branch;
- allowed files;
- one visible deliverable;
- explicit non-goals;
- real interactions versus intentionally unavailable controls;
- tests and screenshot/render sizes;
- acceptance criteria and PR target.

At completion the owner commits, pushes, reports the exact SHA/files/tests/evidence/limitations, and stops. A ticket never silently rolls into another.

### Kimi polling

Every 15 minutes Kimi fetches and reads, without switching branches:

```text
origin/agent/kimi-frontend:reports/agent-handoffs/KIMI_INBOX.md
```

- `HOLD` / `WAIT`: do not code.
- `START-NOW`: execute only the referenced brief on its declared branch.
- `DONE`: push the handback and wait for a higher inbox version.

Polling is read-only: no merge, rebase, reset, cherry-pick, or force-push.

Codex separately monitors the remote inbox and declared work branch. A new Kimi commit or handback authorizes review, not automatic merge or the next phase. Codex records a verdict, advances the inbox to WAIT/corrections/next ticket as appropriate, and stops at Preston's phase gates.

## 7. Model routing

- **Unattended root default:** GPT-5.6 Sol Medium.
- **Sol High/XHigh subagent:** bounded planning, hard debugging, architecture, visual quality, and phase audits.
- **Terra Low/Medium subagent:** scans, logs, tests, and mechanical tasks.
- **Sol Ultra:** only a genuinely parallel milestone audit.

Use the lowest effort that reliably completes a bounded task. Model choice never expands ticket scope.

## 8. Scope exclusions before the first publishable Kids pilot

- Generated-video APIs.
- A paid or proprietary animation engine required for the ordinary Kids
  pipeline, reverse-engineering Rive or another proprietary editor/file format,
  or rebuilding a generic Rive/game-engine clone.
- Accounts, collaboration, cloud sync, billing, or marketplace.
- A generic Premiere, CapCut, Character Animator, Blender, or After Effects clone.
- New art grammars before the Kids pipeline passes.
- Automatic Blender/After Effects integration without a real approved specialist shot.
- Production UI that exposes internal hashes, evidence ledgers, or capability bureaucracy.
- New schemas, proof applications, or parallel preview/render paths without an active-phase requirement.

## 9. Gate discipline

Every phase ends in something Preston can see, click, hear, or download. If the acceptance gate fails, the next phase does not begin. Corrections remain inside the failed phase. Product progress is measured by the creator journey and finished media—not by the number of schemas, proofs, reports, or lines of code.
