# StoryStage canonical implementation-to-private-launch roadmap

- **Product owner:** Preston
- **Frontend/UI/UX owner:** Kimi CLI
- **Backend/rendering/integration owner:** Codex
- **Milestone auditor:** ChatGPT Pro
- **Status:** G0 AI-native amendment candidate; implementation remains on planning hold until accepted
- **Roadmap base:** `product/v1@b648ff0c6224d25461aea648fd6337bec96334d2`
- **Last reconciled:** 2026-07-20

This is the dependency-ordered execution plan from product definition through a
private Windows launch. [`PRODUCT_PLAN.md`](PRODUCT_PLAN.md) defines what the
product is and the architecture boundaries. This document defines what gets
built, in what order, by whom, and how each package proves completion.

The 2026-07-19 engineering roadmap at
`agent/product-roadmap-2026-07-19@73fa4a2` remains useful historical input. It
was superseded by the product reset at `9f3d6fa` because it mixed accepted proof
work, legacy creator surfaces, and a pre-Godot production path. Its useful Ollo,
Director, audio-clock, long-form, benchmark, and Show Pack tasks are reconciled
below; its old phase authority is not restored.

## 1. Five-source Git authority

Repository documents have separate authority domains, in this read order:

1. `docs/PRODUCT_PLAN.md` - stable product definition and architecture charter.
2. `docs/PRODUCT_ROADMAP.md` - complete milestone/package sequence and gates.
3. `docs/ROADMAP_STATUS.md` - the only live accepted/active/next ledger, at exact
   Git SHAs.
4. `AGENTS.md` - mandatory startup, ownership, safety, and stop rules.
5. `CODEX_START_HERE.md` - exact cold-start commands and conflict protocol.

`docs/plans/milestone-N.md` decomposes the one active milestone without changing
this roadmap. `origin/agent/kimi-frontend:reports/agent-handoffs/KIMI_INBOX.md`
mirrors only Kimi's bounded current assignment. GitHub issues, PRs, checks, and
immutable handbacks are package evidence; none may broaden the five sources.

Chat history, a Codex goal, a local-only worktree, an unpushed document, and the
separate roadmap dashboard are never authority. A fresh task must be able to
resume from the files above without reading the old conversation.

## 2. Product launch definition

StoryStage private launch is a single-user Windows animation studio focused on
one creator-facing project template: **Ollo & Friends — Kids Story**. The
architecture remains template-capable, but no second template is displayed or
required for this release. It is launch-ready only when Preston can:

1. install or unpack one documented build on a clean Windows user profile;
2. create an Ollo & Friends project either by pasting a screenplay or describing
   an idea to the native AI Director, and reopen it after closing the app;
3. review and edit acts, sequences, scenes, beats, direction, assets, rigs,
   narration, SFX, music, and timeline state through Projects → Create → Studio;
4. use Codex inside StoryStage through official ChatGPT subscription sign-in to
   draft or revise a screenplay and direct an episode, scene, beat, or selected
   range without giving the model authority over IDs, timing, assets,
   capabilities, rendering, or saved state;
5. import approved image assets, prepare a layered set, and use a genuine
   articulated Ollo rig rendered by pinned Godot;
6. record narration, select takes, obtain approximate editable lip sync, place
   real licensed/imported SFX and music, and hear the synchronized mix;
7. preview the selected range and export the same canonical episode through
   Remotion at 1920×1080, 30 fps;
8. complete one accepted 2–3 minute Kids pilot and one reliable 20-minute,
   36,000-frame production/export proof;
9. recover from an interrupted save/render without corrupting the project;
10. download the final MP4 and a diagnostic/project backup without using source
    code, a terminal, hidden Legacy screens, or a special proof composition.

**Optional extension:** Blender/After Effects specialist-shot bridge, only when
an accepted shot cannot reasonably be produced by the 2D system.

Private launch excludes additional project templates, accounts, cloud sync,
collaboration, billing, a public store release, macOS/Linux packaging,
generated-video services as the ordinary path, mandatory TTS, automatic
telemetry, and automatic browser/session control.

## 3. Production architecture fixed by this roadmap

```text
Ollo & Friends template + creative brief or screenplay + art direction
  → subscription-backed Codex conversation through App Server + StoryStage MCP
  → editable script hierarchy and/or scoped direction proposal
  → deterministic validation and canonical episode plan
  → accepted typed shot intent
  → Godot complete-visual-shot jobs
  → verified shot masters/proxies + optional requested auxiliary passes
  → Remotion episode order/trims/transitions/audio/overlays
  → selected-range preview or complete episode delivery
  → exact MP4 + project/evidence receipts
```

- **Studio:** React creator UI. It never shells out or reads credentials.
- **Desktop host:** privileged local project, file, device, provider, Godot,
  ffmpeg, and render orchestration behind typed adapters.
- **Godot 4.x:** pinned open-source complete-visual-shot renderer using documented
  `Skeleton2D`, `Bone2D`, scene/resource, GDScript, and command-line interfaces.
  It owns the bounded shot's layered set, articulated characters, props,
  foreground occlusion, parallax, particles, lights/shaders, and local camera.
  StoryStage does not build a new animation engine or reverse-engineer Rive.
- **Remotion:** the canonical episode NLE for shot order, trims and handles,
  transitions, global narration/dialogue/SFX/music, captions, titles, evidence
  cards, selected-range preview, full-episode preview, stitching, encoding, and
  delivery. It consumes verified Godot outputs and does not recreate their
  camera or visual layer graph.
- **Director intelligence:** Codex is the first supported product agent. The
  desktop host launches a pinned/verified Codex App Server locally; Codex owns
  official ChatGPT sign-in and credential state; StoryStage supplies a bounded
  MCP server plus typed proposal/application commands. The creator sees native
  conversation, scope, progress, impact, approval, and undo UI. The MCP command
  vocabulary may remain agent-neutral, but v1 does not build a generic agent
  framework or accept arbitrary provider plugins.
- **Image creation:** v1 produces exact prompt/request packs and imports files
  created through the user's chosen image tool. Codex subscription auth does not
  imply access to consumer ChatGPT Images, Sora, or Voice. StoryStage does not
  automate chatgpt.com, copy cookies, expose account sessions, or silently fall
  back to an API key.
- **Specialist tools:** Blender/After Effects receive bounded job packages and
  return pre-rendered media only after B8 is explicitly activated.

### Governed multi-shot directing input

The user-supplied multi-shot animation framework is preserved as a source
receipt, a rule-by-rule StoryStage crosswalk, and a durable Director adaptation:

- [`multi-shot framework receipt`](research/source-frameworks/multi-shot-prompt-framework-animation.receipt.md)
- [`multi-shot framework crosswalk`](editorial/multi-shot-prompt-framework-crosswalk.md)
- [`multi-shot Director adaptation`](editorial/multi-shot-director-adaptation.md)

Its useful shot-purpose, composition, camera, dialogue-placement, and
energy-aware pacing ideas flow through G0, F3, F4/B2, B3, and B4. Its generated-
video constraints do not: StoryStage has no universal 15-second duration,
3-7-shot quota, forced camera variation, 1,500-character ceiling, or
diegetic-only audio rule. The canonical proposal remains structured and
editable; prose is derived output only.

## 4. Package operating system

Every work package has one primary invariant, one visible or audible result,
explicit non-goals, targeted verification, completion evidence, and one owner.

Package lifecycle:

```text
WAIT → START_NOW → IMPLEMENTING → REVIEW → PRO_GATE → PRESTON_GATE
     → ACCEPTED_WAIT

Failed gate → IMPLEMENTING on the same package
```

- Only one product package is `START_NOW` at a time.
- Kimi and Codex may not infer the next package from this roadmap.
- Each package uses a new issue, exact product base, named branch, allowed files,
  tests, screenshots/render/audio evidence, draft PR, and immutable handback.
- A package ends at integration. The next package requires a higher Kimi inbox
  version or an explicit Codex ticket.
- A milestone ends only after integration review, full milestone checks, Pro
  audit where required, and Preston's visible gate.
- No package may advertise incomplete capabilities or use a second product path
  to manufacture evidence.

## 5. Current progress and release train

| Stage                           | State                | Accepted evidence / next authority                                      |
| ------------------------------- | -------------------- | ----------------------------------------------------------------------- |
| Product reset                   | Accepted             | `9f3d6fa` established the current product-first plan                    |
| E0 Godot/Remotion feasibility   | Accepted             | integrated at `81a0e64`; 120 deterministic RGBA frames and Remotion MP4 |
| F1 Projects + Create            | Accepted             | integrated PR #33 at `7a46867`                                          |
| F2 Long-form Studio shell       | Accepted             | Pro + Preston accepted `product/v1@87c01f9`                             |
| G0 roadmap/truth reconciliation | Amendment review     | AI-native Codex bridge amendment must be reviewed and accepted          |
| E1 Codex/StoryStage bridge       | Not started          | bounded read-only feasibility gate after accepted G0                    |
| F3–F6 frontend                  | Not started          | F3 begins only after accepted E1 and a separate F3-WP1 ticket           |
| Frontend Gate                   | Blocked              | requires accepted F1–F6 click-through                                   |
| B1–B6 backend/product           | Blocked              | B1 begins only after Frontend Gate                                      |
| B7 future template              | Deferred             | not exposed or required for private launch                              |
| Private launch                  | Blocked              | requires F3–F6/FG, B1–B6, R1–R2, and L1                                 |
| Specialist bridge               | Conditional          | B8 activates only for one approved shot need                            |

Critical path:

```text
G0 roadmap acceptance
→ E1 read-only Codex bridge feasibility
→ F3 → F4 → F5 → F6 → Frontend Gate
→ B1 → B2 → B3 → B4 → B5 → R1 → B6
→ B8 only when a real specialist shot requires it
→ R2 → L1 private launch → S1 post-launch stabilization
→ B7 only after a separately accepted post-launch template-expansion decision
```

No calendar promise is attached to a broad phase. Each package is sized to one
reviewable delivery cycle; its actual duration is recorded when ticketed. If a
package cannot produce reviewable evidence in one cycle, split it before work.

### Dependency graph

This table is the parseable milestone dependency authority used by the
consistency checker. Comma-separated dependencies are all required unless the
row says conditional.

| Milestone | Depends on         | Condition                                            |
| --------- | ------------------ | ---------------------------------------------------- |
| P0        | none               | accepted product reset                               |
| E0        | P0                 | historical feasibility exception                     |
| F1        | P0                 | frontend sequence                                    |
| F2        | F1                 | frontend sequence                                    |
| G0        | F2                 | truth reconciliation                                 |
| E1        | G0                 | bounded pre-F3 feasibility exception                 |
| F3        | E1                 | E1 accepted and F3 separately authorized             |
| F4        | F3                 | frontend sequence                                    |
| F5        | F4                 | frontend sequence                                    |
| F6        | F5                 | frontend sequence and Frontend Gate                  |
| B1        | F6                 | Frontend Gate accepted                               |
| B2        | B1                 | durable project path                                 |
| B3        | B2                 | renderable assets and capabilities                   |
| B4        | B3                 | accepted timing and direction contracts              |
| B5        | B2, B3, B4         | finished Kids pilot                                  |
| R1        | B5                 | packaged-product foundation                          |
| B6        | B5, R1             | long-form execution                                  |
| B8        | B5                 | conditional; only when an approved shot activates it |
| R2        | R1, B6             | plus B8 only when activated                          |
| L1        | R2                 | private launch                                       |
| S1        | L1                 | stabilization                                        |
| B7        | S1                 | optional post-launch project-template expansion      |

## 6. Completed ideation and feasibility phases

### P0 — Product ideation and creator-first reset — ACCEPTED

**Objective:** define the creator-first product, production philosophy, initial
grammar, proof ladder, and team boundaries before implementation.

**Milestone invariant:** StoryStage is one directable asset-and-rig animation
studio with a clear creator journey, not a generated-video wrapper or collection
of disconnected proofs.

**Dependencies/owners:** no prior product milestone; Preston owns the product
decision, Pro advises, and Codex records the accepted charter.

Retained decisions:

- single-user Projects → Create → Studio product;
- Kids-first Ollo & Friends identity and cut-paper/watercolor art direction;
- script → hierarchy → editable direction → assets/rigs → audio → timeline →
  Remotion delivery;
- foreground occlusion, multiplane depth, selective ambient motion, grounded
  profile-aware movement, and no default character blur;
- user-recorded narration first; approximate editable visemes; real imported
  SFX/music; no generated-video provider dependency;
- 30-second, 2–3 minute, and 20-minute proof ladder;
- Kimi frontend ownership, Codex backend ownership, Pro milestone audit, Preston
  final acceptance.

#### P0-WP1 — Product and creator journey

- **Tasks:** define Projects → Create → Studio, Kids-first scope, editing model,
  and the script-to-delivery journey.
- **Non-goals:** implementation, provider selection, or speculative enterprise
  features.
- **Verify/complete:** Preston accepted the reset charter and three-screen
  creator path at exact milestone SHA.

#### P0-WP2 — Visual and production principles

- **Tasks:** define cut-paper/watercolor art direction, layered environments,
  grounded profile-aware motion, selective ambient motion, and truthful audio.
- **Non-goals:** approving final Ollo art, rigs, shots, or reusable media.
- **Verify/complete:** retained rules are represented in the stable product plan
  and later roadmap gates.

#### P0-WP3 — Proof ladder and team contract

- **Tasks:** define 30-second, 2–3 minute, and 20-minute proofs plus Kimi,
  Codex, Pro, and Preston ownership.
- **Non-goals:** treating a technical proof as product completion.
- **Verify/complete:** sequencing and acceptance ownership are durable in Git.

**Required evidence:** accepted product charter, art-direction references,
creator-journey definition, proof ladder, and exact accepted SHA.

**Milestone gate:** Preston accepts the product reset as the sole basis for
future execution.

### E0 — Godot/Remotion feasibility — ACCEPTED

**Objective:** prove the minimum deterministic seam needed to keep Godot as the
planned performance worker and Remotion as canonical compositor.

**Milestone invariant:** the spike proves only an engine interchange contract;
it grants no product, rig, art, or backend implementation authority.

**Dependencies/owners:** after P0; Codex owns the isolated spike, Pro audits the
evidence, and Preston accepts or rejects Godot eligibility.

Evidence proved a pinned Godot `SubViewport` can render 120 deterministic
1920×1080 RGBA articulated frames and Remotion can consume those exact frames
into a four-second MP4. E0 did not approve Ollo art, a final rig, visual quality,
or a production worker. Those remain B2 work.

#### E0-WP1 — Pinned Godot performance pass

- **Tasks:** pin the engine, render one articulated four-second 2D performance,
  and record the execution environment.
- **Non-goals:** final Ollo rig, production worker, or creator UI.
- **Verify/complete:** exactly 120 transparent 1920×1080 frames are produced.

#### E0-WP2 — Determinism and alpha evidence

- **Tasks:** repeat the render, compare decoded RGBA buffers, and prove complete
  frame numbering and useful alpha.
- **Non-goals:** visual-quality acceptance or lossy comparison shortcuts.
- **Verify/complete:** repeated decoded frames match exactly with no missing or
  duplicate index.

#### E0-WP3 — Canonical Remotion handoff

- **Tasks:** composite the exact Godot frames in Remotion and render the proof
  MP4 with hashes and limitations.
- **Non-goals:** a second editor, separate final renderer, or product integration.
- **Verify/complete:** the same 120 frames produce the accepted four-second MP4.

**Required evidence:** engine/version receipt, 120 RGBA frames, repeat-render
comparison, Remotion MP4, hashes, commands, and limitations.

**Milestone gate:** the deterministic seam passes and Godot remains eligible
for B2; failure would require a roadmap amendment.

### F1 — Projects + Create — ACCEPTED

**Objective:** deliver the understandable product entry and script-to-demo
handoff before the larger Studio surface.

**Milestone invariant:** every visible Projects/Create action is real local
state or clearly labelled demo behavior.

**Dependencies/owners:** after P0; Kimi implements, Codex reviews, Pro audits,
and Preston accepts the visible milestone.

Delivered unified Product v1 entry, local Projects list, script input/import,
grammar/art-style choices, bounded beat preview, truthful demo handoff, and
responsive evidence.

#### F1-WP1 — Projects entry

- **Tasks:** unify product entry, project cards, continue/new-project flow, and
  honest local status.
- **Non-goals:** accounts, cloud sync, persistence services, or production media.
- **Verify/complete:** project navigation and responsive screenshots pass.

#### F1-WP2 — Script and project choices

- **Tasks:** support script paste/import, grammar, art style, voice/format choices,
  estimates, and validation states.
- **Non-goals:** AI planning, image generation, narration recording, or rendering.
- **Verify/complete:** inputs and choices behave across desktop/compact layouts.

#### F1-WP3 — Beat preview and truthful handoff

- **Tasks:** show bounded natural-beat preview and create a disclosed local Ollo
  layout demo without discarding selected project choices.
- **Non-goals:** claiming the demo is generated from the submitted screenplay.
- **Verify/complete:** created-project truth and beat-preview tests pass.

#### F1-WP4 — Responsive acceptance gate

- **Tasks:** keyboard/focus/contrast/responsive corrections, evidence capture,
  hosted verification, and milestone audit.
- **Non-goals:** F2 shell or backend work.
- **Verify/complete:** exact screenshots/checks and Pro/Preston acceptance pass.

**Required evidence:** Projects/Create screenshots, interaction tests, responsive
captures, accessibility evidence, hosted verification, and exact accepted SHA.

**Milestone gate:** Preston can create and enter a disclosed demo project without
dead success controls or false production claims.

### F2 — Long-form Studio shell — ACCEPTED

**Objective:** prove the long-form Studio information architecture and
navigation before adding authoring tools.

**Milestone invariant:** a 20-minute hierarchy remains bounded, synchronized,
responsive, and truthful without pretending preview/export works.

**Dependencies/owners:** after F1; Kimi implements, Codex reviews, Pro audits,
and Preston accepts the visible milestone.

Delivered a bounded 20-minute Ollo demo hierarchy, synchronized scene selection,
selected-scene-only beat rendering, collapse/Reveal, keyboard navigation,
scene-relative local timing, responsive layout, and honest disabled preview and
export states.

#### F2-WP1 — Studio shell foundation

- **Tasks:** establish scene rail, reference board, Director area, overview,
  selection ownership, and disclosed demo state.
- **Non-goals:** real editing, media, playback, persistence, or export.
- **Verify/complete:** created projects preserve their choices and shell state.

#### F2-WP2 — Bounded long-form navigation

- **Tasks:** add 20-minute hierarchy, selected-scene-only beat rendering,
  collapse/reveal, scene selection, and episode overview.
- **Non-goals:** thousands of expanded beat rows or hidden duplicate controls.
- **Verify/complete:** bounded-DOM and cross-surface selection tests pass.

#### F2-WP3 — Timing, keyboard, and responsive behavior

- **Tasks:** add scene-relative timing, keyboard navigation, focus handling,
  compact layout, reduced motion, and readable hierarchy.
- **Non-goals:** executable playback, authoring, or backend timing authority.
- **Verify/complete:** interaction, responsive, and accessibility evidence passes.

#### F2-WP4 — Evidence and milestone gate

- **Tasks:** capture immutable screenshots/hashes, run local/hosted verification,
  audit truthfulness, and integrate the accepted shell.
- **Non-goals:** beginning F3 or connecting services.
- **Verify/complete:** exact handback, hosted run, Pro audit, and Preston decision
  are recorded.

**Required evidence:** bounded hierarchy tests, responsive/keyboard captures,
truthful unavailable states, screenshot hashes, hosted verification, and exact
accepted SHA.

**Milestone gate:** Preston can navigate the complete demo episode without lost
selection, screen flooding, freezing, or false playback/export claims.

### G0 — Canonical roadmap and repository-truth reconciliation — CURRENT

**Objective:** make Git sufficient to recover accepted product truth, the full
execution sequence, and exactly one authorized next action after any cold start.

**Milestone invariant:** a new chat, new Codex task, or compacted context
reconstructs the same accepted state and one next authorized action from Git
alone. Product implementation remains blocked throughout G0.

**Dependencies/owners:** after accepted F2; Codex owns reconciliation, Pro owns
the exact-SHA audit, Kimi remains waiting, and Preston accepts the roadmap.

#### G0-WP1 — Canonical plan set

- **Tasks:** remove live phase state from `PRODUCT_PLAN`; replace the roadmap
  redirect with this complete plan; create the exact live `ROADMAP_STATUS`;
  govern the multi-shot source receipt, crosswalk, and Director adaptation.
- **Non-goals:** F3 code, backend code, UI changes, media work, or feature cleanup.
- **Verify/complete:** source links, milestone/package IDs, dependencies, and
  the accepted F2 lineage agree across all three documents.

#### G0-WP2 — Cold-start operating contract

- **Tasks:** make `AGENTS.md` phase-neutral; add root `CODEX_START_HERE.md` with
  read-only bootstrap commands, exact-base checks, precedence, and stop rules.
- **Non-goals:** automation that mutates a checkout or infers the next ticket.
- **Verify/complete:** a fresh worktree reconstructs current state without chat,
  a goal, local notes, or the roadmap dashboard.

#### G0-WP3 — Stale-authority repair and history

- **Tasks:** update README; archive the old `PROJECT_STATE` and 2026-07-19
  roadmap; replace current state with a short five-source pointer; mark PR #47
  superseded and map retained historical work into current milestones.
- **Non-goals:** deleting historical evidence or reviving its old sequencing.
- **Verify/complete:** repository-wide stale-authority scan finds no competing
  active phase, next ticket, or binding roadmap claim.

#### G0-WP4 — Evidence-class quality and status validation

- **Tasks:** replace universal render requirements with ticket-class evidence;
  define derived-dashboard behavior; validate IDs, dependencies, bases, single
  active assignment, and Kimi inbox agreement.
- **Non-goals:** rendering docs/UI tickets or making the dashboard authoritative.
- **Verify/complete:** governance, frontend, contracts, media, long-form, and
  release examples resolve to the correct checks and evidence.

#### G0-WP5 — AI-native product amendment

- **Tasks:** reconcile the user-requested Hearth-style in-product agent workflow
  with official Codex App Server, ChatGPT sign-in, and MCP behavior; add E1;
  update frontend, backend, packaging, security, risks, and launch requirements;
  replace the earlier provider/API default without weakening human approval or
  deterministic StoryStage authority.
- **Non-goals:** executing Hearth, copying its code, building a generic agent
  host, API-key fallback, chatgpt.com automation, or starting E1/F3 product work.
- **Verify/complete:** Product Plan, Roadmap, G0/E1 plans, status, and operating
  boundary agree on the exact auth/process/tool model and next gate.

#### G0-WP6 — Complete-shot rendering architecture amendment

- **Tasks:** analyze the supplied Godot cutscene reference and creator process;
  assign complete visual shots to Godot and episode assembly/audio/overlays to
  Remotion; add the first two-shot boundary proof and propagate the ownership
  decision through B2, B3, B6, risks, and acceptance evidence.
- **Non-goals:** copying reference source/assets, one monolithic Godot scene,
  rebuilding an NLE in Godot, or implementing production render code.
- **Verify/complete:** Product Plan, Roadmap, G0 plan, retained research note,
  and engine stop rules describe one non-overlapping shot/episode boundary.

#### G0-WP7 — Governance gate

- **Tasks:** push one docs-only candidate, run consistency/cold-start checks,
  obtain Pro's exact-SHA audit, record Preston's decision, and leave status WAIT.
- **Non-goals:** silently issuing E1-WP1 or F3-WP1 after the merge.
- **Verify/complete:** exact candidate SHA, changed files, checks, audit, and
  Preston verdict are recorded; only a later status change can start E1-WP1.

**Required evidence:** exact diff, stale-reference report, consistency results,
cold-start transcript, candidate SHA, Pro audit, and Preston decision.

**Milestone gate:** a fresh task resumes coherently from the five sources,
hosted drift checks pass, Pro accepts the exact remote head, Preston accepts the
roadmap, and no implementation package starts implicitly.

### E1 — ChatGPT-subscription StoryStage agent bridge feasibility

**Objective:** prove the supported local Codex integration that the creator UX
and later B3 product path will use, before F3 designs around unverified events or
auth assumptions.

**Milestone invariant:** a pinned local Codex App Server, signed in through
Codex's official ChatGPT flow, can read one synthetic StoryStage scene through a
read-only MCP server and return one schema-valid proposal while StoryStage never
receives credentials or permits a project mutation.

**Dependencies/owners:** after accepted G0; Codex implements the isolated lab,
Pro audits the exact evidence, Kimi remains waiting, and Preston accepts or
rejects the bridge before F3.

#### E1-WP1 — Runtime, protocol, and auth preflight

- **Tasks:** pin one Codex/App Server version; generate its exact protocol
  schema; launch over stdio; initialize; discover account/model/usage state; use
  Codex-owned browser/device sign-in; record stable versus experimental methods;
  cancel and shut down cleanly.
- **Non-goals:** API key entry, StoryStage credential storage, webview login,
  remote WebSocket transport, production packaging, or creator-facing UI.
- **Verify/complete:** installed/not-installed, signed-in/out, initialize,
  thread/turn, interrupt, and shutdown tests pass with a redacted process receipt.

#### E1-WP2 — Read-only StoryStage MCP scene context

- **Tasks:** expose one synthetic scene through a local stdio MCP server with a
  minimal allowlist such as project summary, selected scene/beat, direction
  state, available demo assets/rig capabilities, and proposal submission; keep
  all context under a lab root and reject write/render/approval requests.
- **Non-goals:** real project files, broad filesystem/shell access, asset
  generation, rendering, persistence, or a reusable generic MCP framework.
- **Verify/complete:** tool/schema tests prove scope, path containment, size
  limits, no canonical-authority fields, and fail-closed MCP startup.

#### E1-WP3 — Streamed structured-proposal round trip

- **Tasks:** connect App Server to the E1 MCP server; start one project-scoped
  thread; request one direction revision; stream agent/tool/progress events;
  validate one typed proposal; show context, impact, Preview/Apply/Reject-style
  approval states in an isolated lab surface while Apply remains disabled.
- **Non-goals:** F3 product UI, live mutation, rendering, autonomous loops,
  screenplay generation, image generation, or background operation.
- **Verify/complete:** one captured round trip is reproducible, schema-valid,
  explicitly read-only, cancellable, and understandable without terminal output.

#### E1-WP4 — Failure, security, and feasibility gate

- **Tasks:** exercise revoked/expired session, offline, usage limit, incompatible
  protocol, MCP failure, malformed/adversarial proposal, prompt injection,
  cancellation, child crash/restart, log redaction, and lab-root containment;
  record license/distribution questions and the productization delta for F3/B3/R1.
- **Non-goals:** claiming production security, bundling Codex, or fixing later B3
  product concerns inside the spike.
- **Verify/complete:** no StoryStage project or credential changes; every failure
  is visible and recoverable; exact versions, schemas, tests, recording, and
  limitations are pushed for Pro and Preston review.

**Required evidence:** pinned version/hash and generated schema, redacted auth/
account-state receipts, MCP tool contract/tests, one recorded streamed proposal,
negative/failure matrix, no-secret scan, and exact remote SHA.

**Milestone gate:** Pro and Preston accept the read-only bridge and its known
compatibility risk. Only then may a separate ticket start F3-WP1; E1 does not
authorize B1, B3, production mutation, or a silent API/website fallback.

## 7. Frontend-first phases — Kimi implementation, Codex review

Frontend packages use local/demo state only. They define the accepted product
workflow before Codex connects persistence, workers, providers, media, or
rendering.

### F3 — Director workspace

**Objective:** provide understandable scoped manual direction plus the truthful
creator-facing AI Director shell that later consumes the proven E1 event and
proposal model.

**Milestone invariant:** Direct, Visual, Motion, and AI proposal interactions
have explicit episode/sequence/scene/beat/range scope; every visible action is
real local state or clearly labelled demo/unavailable state; and committed edits
can be undone without leaking into unrelated work.

**Dependencies/owners:** after accepted E1; Kimi implements packages in listed order,
Codex reviews, Pro audits the milestone, and Preston accepts it.

#### F3-WP1 — Scope and workspace foundation

- **Tasks:** make selected beat real; synchronize rail, board, and Director;
  add Direct/Visual/Motion tabs and permanent scope header; select the first
  beat on scene change; replace stale WP2 Preview copy.
- **Non-goals:** edit fields, undo, AI, persistence, media, assets, audio, or
  runtime contracts.
- **Verify/complete:** selection/tab tests, retained F2 navigation, two actual
  1440×900 beat-scope screenshots, root verification, exact pushed handback.

#### F3-WP2 — Direct edits and scoped history

- **Tasks:** add bounded beat-purpose, performance-direction, and continuity-note
  drafts; real Apply; per-beat committed state; Undo/Redo; boundary states;
  session-local wording.
- **Non-goals:** AI command interpretation, global undo, saved projects, timing,
  Visual/Motion fields, or production schemas.
- **Verify/complete:** draft/apply/undo/redo/redo-invalidation tests; independent
  histories across two beats and scenes; before/apply/undo screenshots.

#### F3-WP3 — Visual and Motion edits

- **Tasks:** add framing and composition-focus controls; camera intent,
  performance pace, and end-hold controls; commit through the same history;
  show an honest selected-direction overlay/summary on the reference board.
- **Non-goals:** generated imagery, canvas effects, keyframes, real camera move,
  playback, timeline, asset, or audio controls.
- **Verify/complete:** each control has observable state; cross-panel history and
  scope tests; Direct/Visual/Motion screenshots; no animation/render wording.

#### F3-WP4 — AI Director conversation and proposal shell

- **Tasks:** make New Project present exactly **Paste a script** and **What's your
  idea?**; the second path opens the normal creator-facing AI Director panel for
  an Ollo & Friends brief, target duration, tone, cast, and constraints. If
  disconnected, show a compact **Connect AI Director** sheet with runtime check
  and **Sign in with ChatGPT**; the creator never configures MCP or enters a key.
  Keep a truthful status chip in Create/Studio plus **Settings → AI Director**
  for reconnect, sign out, runtime check, and redacted diagnostics. Use
  explicit E1-derived fixture states for Codex connection/auth/usage, persistent
  thread, episode/scene/beat/range scope, streamed progress, tool activity,
  structured screenplay/hierarchy/direction proposals, affected-range/asset
  impact, scene-duration scrubber, captured playhead/range/shot/character context
  chips, time-anchored proposal markers, Preview, Apply, Revise, Reject, and
  Undo. Both creation paths meet at
  the same editable proposal review before project creation. Follow the visual
  hierarchy and truth rules in
  [`design/ai-copilot-studio/README.md`](design/ai-copilot-studio/README.md) and
  the linked
  [`AI-copilot concept board`](design/ai-copilot-studio/ai-copilot-concept-board.webp).
- **Non-goals:** live Codex/App Server connection, API key field, terminal as the
  ordinary UI, real project mutation, image generation, rendering, background
  autonomy, or pretending fixture output came from AI.
- **Verify/complete:** local labelled fixtures cover connected/signed-out/offline/
  limited/error/cancelled states; scope and proposal actions change only bounded
  local demo state; creator can understand and reverse one proposed change.

#### F3-WP5 — Responsive/accessibility/evidence gate

- **Tasks:** keyboard and focus flow for beats/tabs/fields/actions; compact
  layout; AI Director thread/proposal focus and live-region semantics; reduced
  motion; exact screenshots/hashes; click-through/evidence; compare the real
  Product v1 captures against the supplied
  [`Create reference`](design/ai-copilot-studio/create-screen-reference.webp),
  [`Studio reference`](design/ai-copilot-studio/studio-timeline-reference.webp),
  and
  [`AI-copilot concept board`](design/ai-copilot-studio/ai-copilot-concept-board.webp).
- **Non-goals:** F4 assets, live AI, persistence, media, or backend work.
- **Verify/complete:** Studio tests, typecheck/build, root verify, 1920×1080,
  1440×900, and 1024×800 browser audit, zero console/page errors, Codex/Pro
  review, Preston acceptance.

**Required evidence:** Direct/Visual/Motion and AI Director screenshots, scoped
edit and proposal/undo tests across beats/scenes, truthful connection/error
states, keyboard/compact captures, exact handback, hosted verification, and Pro
audit.

**Milestone gate:** Preston can manually edit and undo direction, request or
review a clearly scoped AI proposal through the truthful local demo, and
understand what would change without state leakage or any false production claim.

### F4 — Assets and rigs workspace

**Objective:** make every scene's character, set, prop, layer, and rig needs
understandable and reviewable before real asset services exist.

**Milestone invariant:** every selected scene exposes understandable asset needs,
source/approval/readiness truth, and the next real preparation action without
claiming that an image or rig exists.

**Dependencies/owners:** after F3; Kimi implements, Codex audits feasibility and
terminology, Pro audits the milestone, and Preston accepts it.

#### F4-WP1 — Asset workspace information architecture

- **Tasks:** add Characters, Locations, Layered Sets, Props, and Rigs views;
  scene/episode filters; selected asset detail; truthful local demo fixtures;
  readiness vocabulary.
- **Non-goals:** file import, image generation, slicing, rigging, approval, or
  backend contracts.
- **Verify/complete:** navigation and selection tests; no dead success control;
  desktop workspace screenshots.

#### F4-WP2 — Scene asset requirements and readiness

- **Tasks:** show required/optional/reusable assets per scene; missing, candidate,
  needs-preparation, needs-review, and ready states; explain blocking reason;
  aggregate episode counts without hiding scene scope.
- **Non-goals:** automatic script analysis, asset creation, capability counts, or
  production approval.
- **Verify/complete:** multi-scene readiness tests and honest empty/partial/ready
  screenshots.

#### F4-WP3 — Image request and import UX

- **Tasks:** prompt/request pack preview; reference attachment list; expected
  views/layers; download/import/drop states; duplicate/wrong-format/error states;
  source and license fields; user confirmation before candidate acceptance.
- **Non-goals:** ChatGPT website control, API credentials, background generation,
  automatic approval, or real filesystem writes.
- **Verify/complete:** full request → candidate-import prototype, error and cancel
  paths, no credential fields, actual screenshots.

#### F4-WP4 — Layer and rig review UX

- **Tasks:** view turnaround, part list, padded bounds, pivots, masks, profiles,
  expressions/visemes, motion-readiness checklist, layered-set planes and
  foreground occluders; visible review-required state.
- **Non-goals:** actual slicing, socket calculation, Godot scenes, motion render,
  capability promotion, or ordinary Player integration.
- **Verify/complete:** truthful incomplete/needs-correction/review-ready states;
  no candidate is labelled production-ready without evidence.

#### F4-WP5 — Responsive/accessibility/evidence gate

- **Tasks:** keyboard asset navigation, filters, drawers/stacking, focus,
  reduced motion, screenshot/hash package, complete click-through.
- **Non-goals:** F5 audio, persistence, providers, workers, or backend.
- **Verify/complete:** required viewports, no overflow/unreachable region,
  root verify, Codex/Pro audit, Preston acceptance.

**Required evidence:** asset-workspace screenshots, multi-scene readiness tests,
request/import error paths, layer/rig review states, rights/source fields,
keyboard/compact captures, exact handback, and hosted verification.

**Milestone gate:** Preston can identify what each scene needs, what is missing,
and the next honest preparation step without being told an asset or rig exists.

### F5 — Narration and sound workspace

**Objective:** complete the creator-facing narration, SFX, and music workflow
states before connecting devices, files, analysis, or final mixing.

**Milestone invariant:** recording, takes, cues, and mix controls expose complete
success/error/cancel states without claiming access to a microphone or audio
file until the backend exists.

**Dependencies/owners:** after F4; Kimi implements, Codex audits device/audio
feasibility, Pro audits the milestone, and Preston accepts it.

#### F5-WP1 — Audio workspace and track hierarchy

- **Tasks:** add Narration, Dialogue, SFX, and Music views; scene/beat scope;
  take/cue cards; selected-track inspector; guide-versus-final timing labels.
- **Non-goals:** device access, files, playback, waveforms, lip sync, or mixing.
- **Verify/complete:** scope and navigation tests; honest empty/demo states;
  desktop screenshots.

#### F5-WP2 — Narration recording and take-management UX

- **Tasks:** arm, record, stop, cancel, audition, keep/discard, retake, import,
  trim handles, gain, restore; permission denied, missing device, interrupted,
  empty, invalid file, and unsaved-change states.
- **Non-goals:** real MediaRecorder/device calls, WAV storage, speech synthesis,
  or automatic timing authority.
- **Verify/complete:** state-machine tests cover every path; no simulated success;
  record/permission/retake screenshots.

#### F5-WP3 — SFX and music placement UX

- **Tasks:** searchable local-library prototype; source/license/attribution;
  import, place, move, trim, loop, fade, gain, mute, delete, narration ducking;
  missing-media and license-warning states.
- **Non-goals:** web downloading, Suno API, final mix, or real audio decoding.
- **Verify/complete:** cue-edit tests and visible SFX/music/missing-license states.

#### F5-WP4 — Timing and lip-sync review UX

- **Tasks:** selected narration timing basis; word/clause markers; approximate
  viseme lane; editable mouth events; mute/solo; stale timing warning after take
  replacement; explicit apply-as-timing-authority action.
- **Non-goals:** phoneme inference, waveform generation, character animation, or
  canonical timing writes.
- **Verify/complete:** take replacement invalidates derived state; manual viseme
  edits remain scoped; guide/final authority copy is exact.

#### F5-WP5 — Responsive/accessibility/evidence gate

- **Tasks:** keyboard audio workflow, compact layout, focus, reduced motion,
  state screenshots/hashes, full click-through.
- **Non-goals:** F6 timeline/export, backend audio, or provider integration.
- **Verify/complete:** required viewports, root verify, no console/page errors,
  Codex/Pro audit, Preston acceptance.

**Required evidence:** recording/import/take-management states, permission and
missing-device errors, audio placement/retime/ducking interactions, keyboard and
responsive captures, exact handback, and hosted verification.

**Milestone gate:** Preston can understand and complete the intended narration
and sound journey, including failures, without any fake recorded or mixed media.

### F6 — Timeline, export, and product polish

**Objective:** complete the frontend interaction model, edit visibility, export
configuration, accessibility, and visual coherence before backend work begins.

**Milestone invariant:** the complete local Product v1 journey is understandable,
keyboard-operable, visually coherent, and every edit/export action is either a
working local prototype or truthfully unavailable.

**Dependencies/owners:** after F5; Kimi implements, Codex audits future backend
mapping, Pro audits the complete journey, and Preston owns the Frontend Gate.

#### F6-WP1 — Selected-range timeline foundation

- **Tasks:** compact episode overview plus expanded selected-scene timeline;
  Character, Prop, Camera, Voice, SFX, and Music lanes; playhead, time ruler,
  selection, zoom, track collapse, no unbounded 20-minute DOM.
- **Non-goals:** real media, file persistence, frame compiler, or rendering.
- **Verify/complete:** bounded rendering and selection tests; desktop/compact
  timeline screenshots.

#### F6-WP2 — Direct-manipulation prototypes

- **Tasks:** local trim/move/resize, snap indicator, scene/beat range selection,
  keyboard nudging, delete/restore, undo/redo, conflict and invalid-drop states.
- **Non-goals:** canonical patch contracts, saved edits, worker jobs, or ripple
  editing beyond the listed prototypes.
- **Verify/complete:** every manipulation changes local state and reverses;
  boundary/conflict tests; no fake saved state.

#### F6-WP3 — Preview/export drawer UX

- **Tasks:** selected-range/full-episode choices; resolution/fps; destination;
  readiness list; blocked reason; start/progress/cancel/retry/failure/complete;
  reveal/download controls only in a real-complete fixture state.
- **Non-goals:** rendering, ffmpeg, filesystem dialogs, or actual output.
- **Verify/complete:** complete state matrix and disabled-reason tests; no success
  path appears without explicit fixture injection.

#### F6-WP4 — Full-product visual/accessibility pass

- **Tasks:** reconcile approved mockups across Projects/Create/Studio; typography,
  spacing, hierarchy, density, focus, contrast, semantics, reduced motion,
  keyboard-only journey, screen-reader labels, error-boundary UX.
- **Non-goals:** new capabilities or backend wiring.
- **Verify/complete:** 1920×1080, 1440×900, and 1024×800 full click-through;
  zero overlap/overflow/unreachable controls; visual audit.

#### F6-WP5 — Frontend Gate evidence

- **Tasks:** freeze demo data; record all control truth states; run full Studio
  and root verification; capture Projects → Create → Studio → Director → Assets
  → Audio → Timeline → Export evidence; publish exact handback.
- **Non-goals:** backend implementation or opportunistic polish.
- **Verify/complete:** Codex and Pro find no blocking defect and Preston accepts
  the complete visible product. Only then may B1 start.

**Required evidence:** track/trim/drag/zoom interactions, history behavior,
export-readiness blocking, full Projects → Create → Studio click-through,
responsive/accessibility captures, exact handback, hosted verification, and Pro
audit.

**Milestone gate — Frontend Gate:** Preston can complete and understand the full
creator journey; every visible control is functional local state or truthfully
unavailable, and F1–F6 remain passing together.

## 8. Backend and production phases — Codex implementation

Backend packages connect only the accepted frontend operations. Existing proof,
legacy, and provider-neutral code is evidence to audit, not assumed product
completion.

### B1 — One durable project path

**Objective:** connect the accepted creator workflow to one durable, recoverable
project model and remove competing legacy authority.

**Milestone invariant:** Projects, Create, and Studio operate on one versioned
local project that survives close/reopen and never falls through to a hidden
Legacy surface.

**Dependencies/owners:** after the accepted Frontend Gate; Codex implements,
Kimi reviews the integrated UX, Pro audits, and Preston accepts.

#### B1-WP1 — Reuse-versus-retire audit

- **Tasks:** inventory current contracts, story/director engine, desktop host,
  asset/audio workers, Remotion runtime, proof apps, registration review, and
  legacy Studio; classify each as `ADOPT`, `ADAPT`, `QUARANTINE`, or `RETIRE`;
  identify the single Product v1 call path and delete nothing yet.
- **Non-goals:** refactoring, schema creation, UI changes, or counting old proof
  capability as delivered backend work.
- **Verify/complete:** import/call graph and decision ledger reviewed by Pro;
  every selected dependency has one Product v1 consumer and named owner.

#### B1-WP2 — Local project layout and version contract

- **Tasks:** define the smallest versioned project manifest required by accepted
  F1–F6 operations; project/media/cache/render directories; stable IDs; relative
  paths; atomic writes; migration entry point; content hashes for imported media.
- **Non-goals:** cloud sync, collaboration, database server, speculative domain
  fields, engine jobs, or provider credentials.
- **Verify/complete:** create/read/validate/migrate fixtures; corrupt/unknown
  version fails safely; only UI-required fields exist.

#### B1-WP3 — Desktop project service and host adapter

- **Tasks:** create/open/save/save-as/close; recent-project list; native folder
  selection; typed unprivileged Studio bridge; path boundary; media import copy;
  structured errors and cancellation.
- **Non-goals:** autosave, rendering, AI, asset preparation, or audio device work.
- **Verify/complete:** adapter contract tests, path traversal rejection, cancel
  paths, clean Studio build, no direct frontend filesystem access.

#### B1-WP4 — Product v1 state integration

- **Tasks:** replace demo-only project creation with real manifest creation;
  hydrate accepted hierarchy/direction/assets/audio/timeline state; save edits;
  close/reopen; preserve truthful unavailable production actions.
- **Non-goals:** generating a real episode, worker jobs, or adding new UI fields.
- **Verify/complete:** create → edit → save → close → reopen round trip across
  every accepted frontend phase without Legacy imports.

#### B1-WP5 — Autosave, recovery, backup, and migration

- **Tasks:** debounced atomic autosave; last-known-good journal; crash/interrupted
  write recovery; explicit project backup/export and restore; migration backup;
  missing-media relink state.
- **Non-goals:** cloud backup, multi-user conflict resolution, or opaque repair.
- **Verify/complete:** fault-injection tests at write boundaries; recover exact
  accepted state or fail with an actionable choice; backup restores on a clean
  temp profile.

#### B1-WP6 — Durable-path milestone gate

- **Tasks:** clean-profile integration test; long demo save/reopen; imported media
  and missing media; migration; recovery; logs; actual click-through evidence.
- **Non-goals:** B2 animation, AI, or audio.
- **Verify/complete:** Preston creates, edits, closes, reopens, backs up, and
  restores through ordinary Product v1; root/hosted checks pass on exact SHA.

**Required evidence:** save/reopen/migrate/recover tests, project snapshots,
crash and invalid-data cases, ordinary Studio click-through on the durable path,
retired-path report, exact handback, and hosted verification.

**Milestone gate:** a real project can be created, edited, closed, reopened, and
recovered through the accepted UI without hidden legacy surfaces or data loss.

### B2 — Ollo visual engine: Godot complete shots + Remotion episode assembly

**Objective:** produce the first coherent Ollo sequence from independently
renderable, complete visual Godot shots and one canonical Remotion episode edit.

**Milestone invariant:** one canonical plan produces one coherent 25–30 second
Ollo sequence. Godot owns all visual truth inside each shot; Remotion owns shot
order, trims, transitions, global audio/overlays, preview, and delivery. The
result has no sliding, clipping, disappearing, ghosting, or nonsensical cuts.

**Dependencies/owners:** after B1; Codex implements workers/contracts/assets,
Kimi reviews rig/set/scene UX, Pro audits, and Preston owns the visual gates.

#### B2-WP1 — Complete-shot Godot/Remotion boundary proof

- **Tasks:** create two independent Godot shot scenes totaling 8–12 seconds at
  1920×1080/30 fps. Shot A includes a complete layered set, test character,
  foreground occlusion, ambient/particles, and local camera. Shot B uses a
  different framing, prop/reaction, light/shader, and separate scene graph. Each
  emits exact frames, 12–24 frame handles, a complete visual master, proxy, cue
  transcript, and source/plan/asset/engine/output hashes. Remotion trims handles,
  reorders the shots without a Godot rerender, performs one cut and one overlap
  transition, adds a caption/title plus global narration/SFX/music, and renders
  the same Player/final timeline and selected/full range.
- **Non-goals:** Ollo art, one giant `AnimationPlayer`, transparent-character-only
  production architecture, final audio, or production worker abstraction.
- **Verify/complete:** two repeat Godot renders are decoded-frame equivalent;
  malformed/cancel cases fail visibly; changing only Shot B leaves Shot A's hash
  unchanged; pure editorial/audio changes do not rerender either shot; no
  gaps/duplicates/discontinuities occur; Player/final match; storage, decode,
  and preview costs are measured.

#### B2-WP2 — Ollo and environment production-readiness audit

- **Tasks:** reconcile existing Candidate I images, atlases, prepared views,
  pivot/registration evidence, masks, tail corrections, motion diagnostics,
  art provenance, and layered Little Wood proof; list exact blockers and assets
  that require regeneration or Preston review.
- **Non-goals:** promotion based on old labels, new rig code, or ordinary Player
  exposure.
- **Verify/complete:** hash-bound readiness matrix and visible contact sheet;
  Preston decides use/correct/regenerate per required view and layer.

#### B2-WP3 — Canonical Godot rig package

- **Tasks:** produce genuine front/left/right Ollo views; padded separated parts;
  stable pivots; `Skeleton2D`/`Bone2D`; draw order; masks; expressions; eye/blink
  controls; 6–8 visemes; deterministic rig generator and pinned engine identity.
- **Non-goals:** motion library, full episode, Tix/Dot/Storylight rigs, or manual
  editor-only state that cannot be regenerated.
- **Verify/complete:** rest/orbit diagnostic for every joint/view, no crop-edge
  clipping, repeat build hashes, Preston rig review.

#### B2-WP4 — Reusable Ollo performance library

- **Tasks:** idle/living hold, blink/gaze, talk, walk, run, reach, point, react,
  enter, exit, decelerate, named plant, settle; profile-aware travel; grounded
  feet; overlap/follow-through; event markers and deterministic seeds.
- **Non-goals:** bespoke shot animation, physics simulation, motion blur, or other
  characters.
- **Verify/complete:** semantic-role reel for all views; foot-slip/trajectory,
  bounds, loop-seam, event, and repeat-render checks; Preston motion acceptance.

#### B2-WP5 — Layered Little Wood shot-scene systems

- **Tasks:** build reusable Godot shot-scene systems for far background,
  midground, character/prop plane, aligned foreground occluders, and ambient
  layer; cut-paper depth; camera-safe overscan; leaf/grass sway, lantern flicker,
  water/pollen/fireflies, restrained distant loop; particles, lights/shaders,
  safe bounds, shot-local cameras, deterministic seeds, and layer metadata.
- **Non-goals:** moving every object, default blur, 3D reconstruction, or new art
  grammar.
- **Verify/complete:** still alignment at canonical framing; characters pass
  behind intended plants/trees without invisible edges; repeat frames match.

#### B2-WP6 — Bounded complete-shot Godot worker

- **Tasks:** compile accepted `ShotVisualJob` state into documented Godot
  scene/resources; headless execution; complete visual master and proxy by
  default; exact handles, cue transcript, progress/cancel/error/log contract,
  cache key, and receipt binding shot/plan, runtime, fps/range, canvas/color,
  asset/rig hashes, output hashes, and optional explicitly requested alpha,
  foreground/transition matte, ID matte, depth/plane-index, isolated-character,
  or debug passes. No engine binary or user credentials enter Git.
- **Non-goals:** episode composition, authoritative audio mix, AI, fixed PNG-only
  transport, or a custom animation engine.
- **Verify/complete:** valid/invalid/cancel/retry tests; repeat jobs are
  decoded-frame equivalent; frame/handle/cue receipts are exact; lossless image
  sequence versus intra-frame shot container plus proxy is benchmarked before a
  production transport is selected.

#### B2-WP7 — Canonical Remotion episode assembly

- **Tasks:** consume verified Godot shot masters/proxies; order and trim handles;
  cuts and overlap transitions; global narration/dialogue/SFX/music; captions,
  titles, and evidence cards; selected-range and full-episode Player/final use
  one edit plan; evidence stills and MP4.
- **Non-goals:** rebuilding shot cameras/layers/occlusion, a second preview truth,
  long-form stitching, or an Ollo-only composition.
- **Verify/complete:** preview/final representative frames match at exact frame;
  shot outputs are reusable across editorial/audio changes; no handle, transition,
  frame-count, codec, fps, dimension, or audio-timing drift.

#### B2-WP8 — 25–30 second visual acceptance sequence

- **Tasks:** freeze an original Storylight excerpt; direct purposeful shots;
  exercise profile travel, living hold, reach/prop contact, reaction, occlusion,
  ambient motion, and motivated camera/cuts; render through ordinary Studio.
- **Non-goals:** final voices/music, long episode, hand-authored showcase beside
  the product, or fixing defects only in the final MP4.
- **Verify/complete:** frame-by-frame continuity/edge/foot/contact review, no
  mid-scene disappearance or teleport, downloadable MP4, Pro audit, Preston
  visual acceptance.

**Required evidence:** accepted two-shot boundary proof; approved Ollo
registration/readiness; rig/pivot/profile proofs; action-library clips;
layered-set/occlusion frames; deterministic complete Godot shot receipts;
canonical Remotion preview/final comparison; and coherent 25–30 second sequence.

**Milestone gate:** Preston accepts the coherent sequence with grounded articulated
motion and no sliding, clipping, disappearing, ghosting, or nonsensical cuts.

### B3 — Subscription-backed AI Director automation

**Objective:** productize the accepted E1 Codex bridge so a creator can draft a
15–20 minute screenplay from a Show Pack brief, turn it into an editable episode
hierarchy and multi-shot plan, and reiterate one scene or range inside Studio.

**Milestone invariant:** Codex may reason, converse, inspect bounded StoryStage
context, and propose typed changes; only deterministic StoryStage commands may
validate and apply approved state. Unrelated scenes, IDs, assets, timing, and
renders remain unchanged unless the creator explicitly includes them.

**Dependencies/owners:** after B2 and accepted E1/F3; Codex implements the host,
MCP, contracts, validation, and session path; Kimi reviews the product UI; Pro
audits editorial behavior; Preston accepts privacy, agent authority, and quality.

#### B3-WP1 — Productized Codex bridge and privacy contract

- **Tasks:** convert the E1 evidence into one launch ADR; pin/discover the
  supported Codex runtime and generated App Server schema; use local stdio;
  delegate sign-in, token refresh, sign-out, account, model, and usage state to
  Codex; let the host start/configure the bounded StoryStage MCP server without
  creator-entered MCP settings; define explicit script/context transmission, retention/logging,
  diagnostics redaction, offline behavior, and manual/deterministic fallback.
- **Non-goals:** OpenAI API key UI, provider billing, cookie/session automation,
  remote WebSocket exposure, arbitrary agent plugins, or silent API fallback.
- **Verify/complete:** Preston accepts the data/authority policy; signed-out,
  revoked, offline, limited, incompatible, and crash states are product-truthful;
  no credential enters a project, backup, log, diagnostic bundle, or Git.

#### B3-WP2 — Shared command layer and StoryStage MCP surface

- **Tasks:** route manual UI and AI actions through the same typed application
  commands; expose least-privilege read tools for project/show/script/selection/
  playhead/time-range/assets/rigs/layers/continuity/timing plus proposal,
  preview, apply, undo, and
  selected-range render requests; add scope, size, path, cancellation, and
  permission checks with human confirmation for every durable or costly action.
- **Non-goals:** raw project-file mutation, general shell/filesystem access,
  model-authored IDs/hashes/frames, asset approval, or an agent-specific domain.
- **Verify/complete:** UI and MCP parity tests, tool authorization matrix,
  idempotency/stale-version checks, prompt-injection cases, and fail-closed MCP
  startup prove one command path and one source of project truth.

#### B3-WP3 — Hierarchical screenplay and multi-shot proposal contract

- **Tasks:** define typed creative brief → screenplay → episode → sequence →
  scene → beat → shot proposals; include Show Pack/cast, target duration,
  dialogue/narration, dramatic purpose, duration bounds, composition, camera,
  blocking, performance, props/layers, continuity in/out, narration/SFX/music
  cues, capability requests, confidence, fallback, rationale, and affected scope;
  follow the governed
  [`crosswalk`](editorial/multi-shot-prompt-framework-crosswalk.md).
- **Non-goals:** fixed 15-second or shot quotas, final frame numbers, canonical
  hashes from AI, generated-video prompts, or accepting prose as project state.
- **Verify/complete:** schema/semantic/migration tests and readable examples for
  a complete Kids episode brief, a quiet scene, and an active scene.

#### B3-WP4 — Deterministic planning, validation, and compilation

- **Tasks:** retain a deterministic/manual planning path; validate source
  lineage, hierarchy, total/scene duration bounds, screen direction, geography,
  character/prop continuity, asset/capability availability, camera bounds, audio
  timing, and renderability; compile only accepted intent into `ShotVisualJob[]`,
  `EpisodeEditPlan`, `AudioCuePlan`, and `ContinuityState`. Godot consumes only
  complete-visual-shot jobs; Remotion consumes the episode edit, global audio,
  caption/title/evidence overlay, selected-range, and delivery plans. Explain
  warnings and fallback requests.
- **Non-goals:** model/provider call, automatic creative acceptance, taste score,
  or silent invention of assets/capabilities.
- **Verify/complete:** adversarial proposals fail predictably; accepted proposals
  compile deterministically; no agent/provider logic enters Godot or Remotion.

#### B3-WP5 — AI Director sessions, context, and proposal streaming

- **Tasks:** connect the accepted F3 panel to persistent project/episode/scene
  threads. On New Project, **What's your idea?** opens an episode-scoped thread
  that gathers the Ollo story premise, target duration, tone, cast, and
  constraints before proposing a screenplay and hierarchy. In Studio, the same
  dock automatically follows the selected episode/sequence/scene/beat/shot,
  playhead, time range, character, or asset while always showing its current
  scope. Capture attached playhead/range context at send time so “here” cannot
  drift while the response streams.
  Assemble only that bounded context; stream messages, tool
  activity, progress, approvals, cancellation, and errors; support "Write a
  15-minute Ollo episode" and scene/beat/range revision prompts; validate typed
  output before it appears as a proposal; preserve model/version/invocation
  receipts without exposing engineering jargon in normal UI.
- **Non-goals:** background autonomous production, whole-project context on every
  turn, hidden retries/spend, image/voice entitlement assumptions, or auto-apply.
- **Verify/complete:** create/resume/compact/cancel/restart and stale-context tests
  pass; a long-form draft and scoped scene revision remain reviewable and do not
  mutate canonical state.

#### B3-WP6 — Proposal review, patch, undo, and selected-range rebuild

- **Tasks:** show before/after script/direction diff, affected shots/range/assets,
  time-anchored scrubber markers and affected audio/render jobs; accept/reject/
  edit by hierarchy level, preview the proposal, apply through the
  deterministic command layer, undo/redo, regenerate only selected scope, and
  mark proposals stale when source/context changes.
- **Non-goals:** silent auto-apply, entire-episode regeneration for one scene,
  or persistence outside the B1 project path.
- **Verify/complete:** accepted edits survive reopen; rejected/stale proposals
  cannot compile; unaffected project/range hashes remain stable; UI truth matches.

#### B3-WP7 — Editorial evaluator and two-brief milestone gate

- **Tasks:** encode only evidence-backed Scene Craft hard rules as blockers while
  keeping taste priors advisory; test purposeful coverage, reactions, motivated
  cuts/camera, action follow-through, energy/reveal, audio-led timing, and
  continuity; run two materially different unseen 15–20 minute Ollo & Friends
  briefs (for example, a gentle mystery and an active adventure) through script
  and direction proposal; compare/edit blind and record capability gaps.
- **Non-goals:** equal durations, universal shot quotas, overfitting Mr. Kipley,
  copying reference art/characters, generated-video services, or a benchmark-only
  composition.
- **Verify/complete:** plans are distinct, coherent, editable, capability-valid,
  and not noun-substitution templates; scoped revision leaves unrelated work
  stable; Pro and Preston accept the assisted workflow.

**Required evidence:** exact App Server/schema/runtime receipts, auth/privacy and
failure states, MCP/tool authority tests, typed screenplay/proposal examples,
deterministic compile results, persistent session evidence, edit/preview/apply/
reject/undo/range-regeneration flows, and two materially different briefs.

**Milestone gate:** Pro and Preston accept two distinct, sensible, editable
long-form Ollo & Friends scripts/plans and a coherent scene-level revision;
deterministic validation blocks unrenderable or unauthorized changes, and
StoryStage contains no API-key or website/session automation path.

### B4 — Narration and sound engine

**Objective:** implement durable narration recording/import, timing authority,
editable lip sync, real SFX/music placement, and canonical final mixing.

**Milestone invariant:** selected narration, visemes, SFX, music, and mix survive
reopen and remain sample/frame synchronized in preview and exported MP4.

**Dependencies/owners:** after B3; Codex implements host/worker/render paths,
Kimi reviews UX, Pro audits audio evidence, and Preston accepts.

#### B4-WP1 — Audio device and WAV capture service

- **Tasks:** enumerate input devices; permission flow; arm/start/stop/cancel;
  lossless WAV capture; level/clip indication; temp-file cleanup; structured
  device/disconnect/interruption errors; typed Studio adapter.
- **Non-goals:** voice generation, final timing authority, edit UI redesign, or
  browser-owned permanent blobs.
- **Verify/complete:** real microphone and denied/missing/disconnect tests; exact
  WAV metadata; no orphan temp files after cancel/crash.

#### B4-WP2 — Take storage, editing, and timing authority

- **Tasks:** persist multiple takes; audition; keep/discard; trim; gain; replace;
  restore; imported audio; waveform cache; clause/word timing; explicit apply as
  guide/final timing; invalidate derived cues/visemes after source change.
- **Non-goals:** destructive source edits, hidden timing replacement, or final mix.
- **Verify/complete:** close/reopen round trip; sample-accurate trim boundaries;
  stale derived data cannot masquerade as current.

#### B4-WP3 — Approximate editable lip sync

- **Tasks:** speech/phoneme timing adapter or word-timing fallback; map to approved
  Ollo viseme set; coarticulation/minimum holds; blink independence; manual add/
  move/change/delete; rederive confirmation; Godot mouth-event binding.
- **Non-goals:** perfect facial solving, child voice synthesis, random mouth
  flapping, or uneditable baked animation.
- **Verify/complete:** known phrase expected viseme sequence, manual overrides,
  audio/animation sync proof, reopen retention.

#### B4-WP4 — SFX and music asset library

- **Tasks:** import WAV/MP3; decode/cache; searchable metadata; cue categories;
  source URL/creator/license/attribution; missing/relink; music loop/fade/gain;
  SFX trim/retime; user recordings; provider hook optional but unused.
- **Non-goals:** scraping/downloading websites, unlicensed stock, or Suno as a
  launch dependency.
- **Verify/complete:** license-required asset cannot become delivery-ready without
  metadata; relink/hash checks; cue edits survive reopen.

#### B4-WP5 — Mix graph and Director cue binding

- **Tasks:** narration/dialogue/SFX/music buses; mute/solo; gain/pan; fade;
  narration ducking; limiter/headroom; Director cue proposals become unfilled
  requirements until real audio is assigned; J/L cut timing where supported.
- **Non-goals:** DAW feature breadth, mastering presets as quality authority, or
  provider-generated sound claims.
- **Verify/complete:** deterministic mix from same project; no clipping in test
  sequence; cue/asset/scene lineage retained.

#### B4-WP6 — Synchronized export gate

- **Tasks:** composite real narration, lip sync, SFX, and music into the B2 scene;
  verify duration/sample/frame alignment, captions if available, muted diagnostic
  render, and final mix render through ordinary path.
- **Non-goals:** full pilot or long-form render.
- **Verify/complete:** reopen then export; ffprobe/frame/audio checks; no drift;
  Preston accepts intelligibility, sync, and basic mix.

**Required evidence:** microphone/file/error tests, durable WAV/take storage,
audio-analysis and editable viseme results, licensed cue/media records, mix and
ducking checks, reload/cancel/recovery cases, and synchronized MP4 probes.

**Milestone gate:** narration, lip movement, SFX, and music survive reload and
the canonical export contains synchronized, rights-traceable picture and sound.

### B5 — Finished 2–3 minute Kids pilot

**Objective:** produce one finished Ollo episode through ordinary StoryStage to
prove direction, visual performance, audio, correction, export, and backup.

**Milestone invariant:** one ordinary StoryStage project produces a coherent,
downloadable Ollo episode whose direction, animation, and sound Preston accepts.

**Dependencies/owners:** after B2-B4; Preston owns script/creative decisions,
Codex produces and integrates, Kimi reviews UX/visuals, and Pro audits.

#### B5-WP1 — Pilot creative lock

- **Tasks:** select original 2–3 minute script; define learning/story goal,
  continuity geography, cast, locations, props, audio needs, acceptance rubric;
  lock script/version and change process.
- **Non-goals:** 20-minute scope, Weird History, or invisible script rewrites.
- **Verify/complete:** Preston approves brief/script and exact project base.

#### B5-WP2 — Asset and rig readiness

- **Tasks:** prepare required Ollo/Tix/Dot/Storylight tiers; limited one-scene
  characters; layered locations/props; request/import/review missing art; motion
  and audio readiness; license/provenance.
- **Non-goals:** full Show Pack breadth or fully rigging background extras.
- **Verify/complete:** every scene has a real ready/fallback decision; no hidden
  candidate asset enters render.

#### B5-WP3 — Direction and production lock

- **Tasks:** generate/edit hierarchy and multi-shot plan; continuity pass;
  capability/fallback review; guide narration; animatic/range previews; lock
  accepted direction before final render.
- **Non-goals:** tuning only the final MP4 or bypassing Director state.
- **Verify/complete:** Preston approves directed animatic and unresolved list is
  empty or explicitly accepted.

#### B5-WP4 — Animation, narration, SFX, music, and final edit

- **Tasks:** produce Godot performances; layer sets/props; record/select narration;
  lip sync; place real SFX/music; edit/retime; QC every scene; rerender affected
  ranges only; final canonical render.
- **Non-goals:** hand-editing outputs outside recorded specialist bridge.
- **Verify/complete:** all media derives from project; no continuity/edge/slide/
  disappearance/audio-sync blockers; downloadable MP4.

#### B5-WP5 — Pilot acceptance and regression seal

- **Tasks:** Pro creative/technical audit; Preston viewing; record defects;
  correct through product; freeze accepted project/output/hashes; turn critical
  failures into regressions and reusable Show Pack assets.
- **Non-goals:** declaring long-form readiness.
- **Verify/complete:** Preston accepts direction, animation, sound, UI workflow,
  and MP4; clean rerender reproduces accepted output.

**Required evidence:** approved script/board/assets, scene locks, final voice and
mix, continuity/visual/audio review, corrected canonical MP4, full project
backup, clean reopen, and Preston/Pro watch notes.

**Milestone gate:** Preston accepts the 2–3 minute episode and confirms it was
made, corrected, rendered, and backed up through the ordinary product path.

### R1 — Windows distribution foundation

**Objective:** package the accepted product path as a reproducible Windows build
before long-form reliability and release-candidate testing.

**Milestone invariant:** a clean Windows profile can run the pinned application,
Godot, ffmpeg, Remotion, and supported Codex/App Server path without the
development repository, a Node/pnpm toolchain, API keys, or hidden secrets. R1
depends on B5 and precedes B6.

**Dependencies/owners:** Codex owns packaging/runtime work, Pro audits clean-
machine evidence, and Preston decides signing and update policy.

#### R1-WP1 — Runtime, packager, and bundle manifest

- **Tasks:** select one Windows packager; pin and bundle Electron/Chromium,
  Studio, workers, Godot, Remotion/ffmpeg, Sharp/native modules, fonts, assets,
  versions, licenses, runtime discovery, and preflight; choose and license-review
  either a pinned supported Codex runtime distribution or verified installed-
  client discovery, including generated App Server protocol compatibility.
- **Non-goals:** auto-updating dependencies or bundling unlicensed binaries.
- **Verify/complete:** manifest and missing-runtime checks prove one reproducible
  package with plain incompatible-machine guidance.

#### R1-WP2 — Installer and signing policy

- **Tasks:** approved per-user installer scope, install/repair/uninstall,
  shortcuts, versioning, checksum, app-data paths, and certificate integration
  or an explicit Preston-approved unsigned private-beta policy.
- **Non-goals:** app stores, public distribution, accounts, or cloud services.
- **Verify/complete:** clean install/uninstall/reinstall and SmartScreen/signature
  evidence on a second Windows profile.

#### R1-WP3 — Migration, backup, and recovery

- **Tasks:** pre-upgrade backup, schema migration, interrupted-upgrade recovery,
  incompatible-version message, downgrade/rollback contract, and preservation
  of user projects on uninstall by default.
- **Non-goals:** silent destructive migration or forced updates.
- **Verify/complete:** upgrade, downgrade, interrupted-upgrade, backup restore,
  and uninstall-data cases pass.

#### R1-WP4 — Clean-machine matrix

- **Tasks:** test standard users, fresh accounts, spaces/non-ASCII paths, offline
  launch, signed-out/signed-in Codex, expired/revoked/usage-limited sessions,
  multiple measured hardware profiles, project open, B5 playback, and ordinary
  render without Node, pnpm, a checkout, or undocumented runtime installs.
- **Non-goals:** guessed hardware promises or unsupported platforms.
- **Verify/complete:** clean-machine videos/logs establish the draft supported
  matrix and the packaged B5 workflow succeeds.

#### R1-WP5 — Diagnostics, privacy, and notices

- **Tasks:** user-triggered redacted support bundle, runtime/toolchain/App Server
  compatibility report, safe cache repair, actionable worker/auth/MCP failure
  guidance, privacy review, third-party notices, engine/agent attribution, and
  known limitations without Codex auth state or conversation content by default.
- **Non-goals:** automatic telemetry/upload or evidence jargon in normal UI.
- **Verify/complete:** injected Godot/ffmpeg/device/media failures are actionable;
  no token or personal media leaks without explicit inclusion.

**Required evidence:** pinned dependency/tool manifest, installer/package hashes,
clean-machine install and launch, worker/binary validation, project open/render,
uninstall/reinstall, backup compatibility, and known signing limitations.

**Milestone gate:** the supported Windows package works without a developer
checkout or hidden machine state and preserves user projects across reinstall.

### B6 — Long-form 20-minute production

**Objective:** make a 20-minute, 36,000-frame episode editable, previewable,
cancelable, resumable, recoverable, and exactly exportable on the target PC.

**Milestone invariant:** after B5 and R1, StoryStage reliably edits, previews, renders, resumes,
and exports an exact 36,000-frame, 20-minute, 30 fps episode without exhausting
memory or corrupting project/output.

**Dependencies/owners:** after B5 and R1; Codex implements long-form execution,
Kimi reviews long-form UX, Pro audits endurance, and Preston accepts.

#### B6-WP1 — Hierarchical screenplay ingest

- **Tasks:** parse/import episode, acts/sequences, scenes, beats, dialogue/action/
  transition units, cast, props, locations, continuity; human correction UI;
  remove short-script ceiling; stable source ranges and IDs.
- **Non-goals:** automatic acceptance of ambiguous parsing or new grammar.
- **Verify/complete:** varied 5-, 10-, and 20-minute scripts; corrections survive
  reopen; source changes invalidate only affected hierarchy.

#### B6-WP2 — Long-form planning and asset reuse

- **Tasks:** episode/sequence arcs; cross-scene continuity; reusable locations,
  rigs, props, performances, audio; asset-request deduplication; cache keys and
  dependency graph; missing/readiness summary.
- **Non-goals:** hiding repeated asset variants or global regeneration.
- **Verify/complete:** two occurrences reuse exact approved asset; one changed
  dependency invalidates only affected jobs/ranges.

#### B6-WP3 — Selected-range preview and incremental rebuild

- **Tasks:** render scene/beat/range; proxy quality; cache hit/miss display;
  cache complete Godot shot masters, proxies, and optional auxiliary passes;
  invalidate/rebuild only affected shots or audio; preserve shot caches for pure
  Remotion order/trim/transition/overlay/mix edits; compare proxy/final exact
  frame at sampled points.
- **Non-goals:** low-quality preview as separate editorial truth.
- **Verify/complete:** edit one late scene without rebuilding whole episode;
  unchanged ranges retain hashes; preview/final framing matches.

#### B6-WP4 — Chunked render and exact stitch

- **Tasks:** let Remotion execute bounded long-form episode chunks over verified
  shot outputs; deterministic video/audio overlaps; ffmpeg stitch and delivery;
  codec/color/audio settings; manifest; temporary-file lifecycle; final frame
  count/duration/hash; no gaps/duplicates/drift at boundaries.
- **Non-goals:** distributed cloud rendering or lossy evidence shortcuts.
- **Verify/complete:** synthetic and real boundary tests; exact 36,000 video
  frames; sample-accurate audio duration; decoded boundary audit.

#### B6-WP5 — Progress, cancellation, resume, and recovery

- **Tasks:** persisted render job; progress/ETA; cancel; retry failed chunk;
  resume after app/worker restart; disk-space preflight; stale cache detection;
  actionable logs/diagnostic bundle.
- **Non-goals:** remote worker farm or silent deletion of recoverable work.
- **Verify/complete:** injected chunk failure and process kill resume without
  rerendering accepted chunks or corrupting final output.

#### B6-WP6 — Long-form soak and acceptance episode

- **Tasks:** run clean 20-minute project on target PC; record peak RAM/CPU/GPU/
  disk, duration, cache reuse, restart/resume; inspect every stitch and sampled
  continuity/audio points; export final MP4 and backup.
- **Non-goals:** claiming all content is publishable solely from technical pass.
- **Verify/complete:** 36,000-frame export passes technical gates, app remains
  usable, project reopens, Preston accepts long-form workflow/reliability.

**Required evidence:** long-script hierarchy, selected-range cache/preview,
chunk/stitch boundary tests, persisted progress/cancel/resume/recovery, resource
measurements, exact 36,000-frame and sample-accurate audio probes, final MP4,
and project reopen.

**Milestone gate:** Preston accepts the 20-minute workflow and output; every
chunk boundary, restart, cancellation, frame count, audio duration, and recovery
gate passes on the supported target PC.

## 9. Release hardening, launch, stabilization, and future templates

### B7 — Future Weird History project template — DEFERRED POST-LAUNCH

**Objective:** after the Ollo & Friends private launch is accepted and stable,
prove a second project template through the same project, Director, media,
audio, and canonical render path without weakening Kids.

**Dependencies/owners:** after accepted L1 and S1 plus a separate Preston
template-expansion decision; Codex implements, Kimi reviews the workflow, Pro
audits editorial/factual quality, and Preston accepts the pilot.

**Milestone invariant:** B7 is invisible and non-blocking during private-launch
development. Once separately activated after launch stabilization, the same
product and canonical render path produces a publishable Weird History pilot
with an honest editorial and media template.

#### B7-WP1 — Grammar and style bible

- **Tasks:** define pacing, evidence, humor, citation, archival/stock, maps,
  kinetic type, reenactment/cutout, narration, camera/cut grammar; preserve shared
  contracts and explicit differences from Kids.
- **Non-goals:** changing Kids defaults or copying a reference channel's identity.
- **Verify/complete:** Pro/Preston approve two sample scene plans and visual board.

#### B7-WP2 — Licensed media and evidence workflow

- **Tasks:** archival/stock import; source/license/citation; crop/pan/zoom; evidence
  cards; maps; captions; missing/expired/attribution warnings; search/request UI
  that does not scrape protected sites.
- **Non-goals:** automatic Google image copying or unlicensed downloads.
- **Verify/complete:** every visible media item traces to approved source; export
  includes required attribution/citation records.

#### B7-WP3 — Kinetic type and explainer primitives

- **Tasks:** title/lower-third/quote/date/stat/evidence-card templates; map paths;
  pointer/highlight; deterministic transitions; density/read-time bounds; reusable
  Remotion components.
- **Non-goals:** generic motion-graphics suite or one-off hand animation.
- **Verify/complete:** template tests and readable desktop/compact-safe frames;
  same preview/final path.

#### B7-WP4 — Weird History Director and pacing

- **Tasks:** provider examples/evaluation; faster motivated coverage; archival/
  type/reaction balance; narration-led timing; evidence placement; continuity and
  capability fallbacks; editable proposals.
- **Non-goals:** random rapid cuts or fixed duration quotas.
- **Verify/complete:** two scripts receive coherent editable plans; blind review
  accepts the assisted plan with zero citation hard defects.

#### B7-WP5 — Narration, fact, rights, and mix lock

- **Tasks:** final voice, pronunciation notes, captions, music/SFX, evidence-card
  readability, source/rights ledger, disclosure, and explicit fact-review lock.
- **Non-goals:** unsourced claims, fake archive media, or assumed usage rights.
- **Verify/complete:** audio/caption/fact/rights packet is complete and blocking
  gaps remain visible.

#### B7-WP6 — Publishable pilot gate

- **Tasks:** render, verify, watch, correct, back up, and deliver one real episode
  through the ordinary Product v1 and packaged R1 path.
- **Non-goals:** a separate history app, project format, or render worker.
- **Verify/complete:** Preston accepts the MP4 and workflow; source/rights ledger,
  captions, audio probe, project backup, and clean-machine playback pass.

**Required evidence:** approved grammar/style bible, licensed media and citation
ledger, kinetic-type/map primitives, two-script Director comparison, fact/rights/
audio lock, clean packaged-app production, final MP4, and project backup.

**Milestone gate:** Preston accepts one publishable Weird History pilot and Pro
finds no blocking editorial, factual, rights, citation, readability, or pacing
defect.

### B8 — Optional specialist-shot bridge

**Objective:** support one explicitly approved specialist shot only when the
normal 2D system cannot reasonably satisfy its documented need.

**Milestone invariant:** the bridge remains bounded to the accepted shot class,
preserves provenance and reproducibility, and never becomes a second animation
or episode-rendering system.

**Dependencies/owners:** conditional after an accepted B5 shot need, or a later
post-launch B7 shot need;
Codex owns interchange/integration, the approved specialist owns the external
shot, and Preston activates and accepts the exact scope.

**Activation rule:** begin only when an accepted B5 shot (or later B7 shot) has a documented
need the normal 2D system cannot reasonably satisfy and Preston approves the
exact shot. Unactivated B8 is `NOT REQUIRED` and never blocks private launch.

#### B8-WP1 — Shot need and interchange contract

- **Tasks:** define shot purpose, failed 2D alternatives, camera, duration/fps/
  resolution/color/alpha, reference layers, audio guide, handles, expected return,
  provenance, cost, and fallback.
- **Non-goals:** general Blender/After Effects automation or replacing Godot.
- **Verify/complete:** Preston accepts the need and reproducible handoff package.

#### B8-WP2 — Manual specialist production

- **Tasks:** export a bounded job package; user/specialist creates the shot in an
  approved external tool; preserve source/tool/version/provenance.
- **Non-goals:** credentials, remote-control automation, arbitrary scripts, or a
  generic 3D/compositing subsystem inside StoryStage.
- **Verify/complete:** exact candidate return and provenance are recorded.

#### B8-WP3 — Verified return import

- **Tasks:** verify decode, frame count, color, alpha, dimensions, duration,
  audio, hashes, rights, and shot binding; preview in canonical Remotion.
- **Non-goals:** reverse-engineering proprietary project formats.
- **Verify/complete:** invalid returns fail plainly; valid bytes round-trip.

#### B8-WP4 — Shot acceptance and episode integration

- **Tasks:** compare against the approved need and 2D fallback; approve exact
  bytes; rerender affected range and final master; verify cache invalidation.
- **Non-goals:** broadening the bridge beyond the proved shot class.
- **Verify/complete:** Preston accepts the shot and the project remains
  reproducible without undocumented machine state.

**Required evidence:** approved activation decision, bounded interchange package,
tool/version/provenance receipt, validated return media, fallback comparison,
canonical preview/final integration, hashes, and accepted affected-range render.

**Milestone gate:** when activated, Preston accepts the exact specialist shot
and reproducible return path; when unactivated, B8 is recorded `NOT REQUIRED`
and does not block launch.

### R2 — Release candidate quality gate

**Objective:** freeze and audit one installable release candidate across the
complete creator journey, production paths, recovery, privacy, rights, and
rollback requirements.

**Milestone invariant:** one frozen build, project format, and dependency set
passes clean-install, creator-journey, render, recovery, accessibility, privacy,
license, and documentation gates with no known P0/P1 defect. R2 depends on R1,
B6, and any activated B8; it judges an installed product, not a checkout.

**Dependencies/owners:** Codex owns hardening, Kimi reviews UI/accessibility,
Pro audits the release candidate, and Preston accepts the RC and known issues.

#### R2-WP1 — Security and privacy

- **Tasks:** Electron threat model; CSP/navigation/IPC; Codex child-process and
  stdio isolation; App Server version/schema pinning; Codex-owned auth boundary;
  StoryStage MCP tool allowlist and approval matrix; prompt-injection and
  malicious-project tests; log/conversation redaction; path containment;
  untrusted media limits; support-bundle privacy; no-secret scans.
- **Non-goals:** enterprise certification or automatic telemetry.
- **Verify/complete:** security packet passes with no open P0/P1 finding.

#### R2-WP2 — Accessibility and UX acceptance

- **Tasks:** keyboard-only full journey; focus order/visibility; labels; contrast;
  reduced motion; error comprehension; compact/desktop; first-run usability with
  no developer explanation.
- **Non-goals:** cosmetic redesign without a blocking finding.
- **Verify/complete:** Pro audit and Preston task completion; no unreachable core
  action or creator-facing implementation jargon.

#### R2-WP3 — Performance and resource budgets

- **Tasks:** measure startup, project open, selected-range preview, cache, render,
  memory, disk, cleanup, and UI responsiveness on the supported R1/B6 matrix.
- **Non-goals:** speculative rewrites or guessed hardware support.
- **Verify/complete:** thresholds and supported-hardware recommendation are tied
  to measured packaged runs.

#### R2-WP4 — License, provenance, and delivery audit

- **Tasks:** dependency licenses; fonts; Ollo art provenance; imported SFX/music/
  stock attribution; provider terms; output metadata; notices file; reject assets
  missing required license data.
- **Non-goals:** legal guarantees beyond recorded source facts.
- **Verify/complete:** every shipped/runtime/media component has disposition;
  required attributions included in project/export bundle.

#### R2-WP5 — Migration, recovery, and rollback matrix

- **Tasks:** upgrade from prior private builds, pre-upgrade backup, restore,
  incompatible-version handling, crash recovery, uninstall preservation, and
  downgrade/rollback rehearsal.
- **Non-goals:** silent data loss or unsupported destructive migration.
- **Verify/complete:** clean-machine upgrade/recovery/rollback cases pass.

#### R2-WP6 — Full regression, help, and RC build

- **Tasks:** E1, F1-F6, B1-B6, Ollo & Friends Kids 20-minute, Codex not-installed/
  signed-out/revoked/offline/usage-limit/incompatible/MCP-failure states,
  install/uninstall, render/delivery, support bundle; concise first-run/help and
  sample projects; classify every defect against one immutable build.
- **Non-goals:** new features or widening supported hardware during RC.
- **Verify/complete:** installer, CI, clean-machine videos, full matrix, help-only
  first run, and defect register are complete.

#### R2-WP7 — RC freeze and gate

- **Tasks:** freeze exact SHA/build/dependencies/project version; release notes;
  known limitations; backup compatibility; previous installer/build retention;
  rollback rehearsal; final Pro and Codex audits.
- **Non-goals:** merging unrelated green work after freeze.
- **Verify/complete:** hosted/local/package checks pass, installer and outputs
  hash, rollback works, P0/P1=0, accepted P2s documented, Preston approves RC.

**Required evidence:** security/privacy packet, accessibility journey, resource
budgets, license/provenance audit, migration/recovery/rollback matrix, full
regression and clean-machine runs, frozen installer/output hashes, known issues,
release notes, and exact RC SHA.

**Milestone gate:** P0/P1 defects are zero, accepted P2s are documented, rollback
works, all required milestone gates remain passing, and Preston approves the
immutable release candidate.

### L1 — Private launch

**Objective:** deliver the immutable release candidate to a bounded private
cohort with backups, support, diagnostics, and a proven rollback path.

**Dependencies/owners:** after R2; Preston owns cohort and launch decisions,
Codex owns release operations, and Pro audits readiness.

**Milestone invariant:** every named tester receives the same immutable R2
release, can protect and recover projects, and can return to the prior release
without hidden data loss. Preston owns the cohort and launch decision; Codex
owns release operations; Pro audits readiness.

#### L1-WP1 — Release assembly

- **Tasks:** freeze installer, version, checksum, release notes, known issues,
  license notices, one Ollo & Friends sample project, backup and recovery
  instructions.
- **Non-goals:** developer-mode fallback or rebuilding after release freeze.
- **Verify/complete:** independent checksum/install and immutable release packet.

#### L1-WP2 — Tester onboarding

- **Tasks:** named cohort, hardware check, provider/privacy disclosure, backup
  instructions, support channel, pilot tasks, and launch stop conditions.
- **Non-goals:** open public download or silent data collection.
- **Verify/complete:** onboarding checklist and support ownership are accepted.

#### L1-WP3 — Deployment and first production

- **Tasks:** deliver through the approved private channel; verify representative
  installs; create/open projects; produce one real output without file surgery.
- **Non-goals:** hand-fixing project files or outputs outside supported UI.
- **Verify/complete:** first-install confirmations and accepted MP4/project backup.

#### L1-WP4 — Support and diagnostics

- **Tasks:** user-triggered diagnostics, severity triage, privacy-safe collection,
  reproduction template, response owner, and bounded support response process.
- **Non-goals:** automatic upload, telemetry, or feature-request implementation.
- **Verify/complete:** one sample support case is reproduced and resolved through
  the documented loop.

#### L1-WP5 — Rollback and launch gate

- **Tasks:** retain previous installer, pre-upgrade backup, rollback rehearsal,
  classify all release findings, rerun impacted gates, and record Preston's
  explicit cohort-open decision and exact tag/build.
- **Non-goals:** opportunistic post-launch features.
- **Verify/complete:** rollback succeeds, support is staffed, P0/P1=0, and
  `ROADMAP_STATUS.md` records the immutable private launch.

**Required evidence:** immutable release packet, tester/hardware roster,
onboarding and backup confirmation, representative clean installs, first real
productions, support rehearsal, rollback result, defect state, and explicit
cohort-open decision.

**Milestone gate:** Preston opens the named cohort only when P0/P1=0, support is
owned, backups and rollback pass, and the exact tag/build is recorded.

### S1 — Post-launch stabilization

**Objective:** protect projects and stabilize the private release through
bounded measured fixes before considering broader use or new features.

**Dependencies/owners:** after L1; Codex owns product fixes, Kimi owns bounded
UX fixes, Pro audits significant changes, and Preston owns scope and exit.

**Milestone invariant:** stabilization protects project data and fixes bounded
defects against the exact private release without smuggling in unreviewed
features. Codex owns patches, Kimi owns bounded UX fixes, Pro audits significant
changes, and Preston owns scope and exit.

#### S1-WP1 — Private-cohort triage and issue burn-down

- **Tasks:** triage launch logs/findings; P0/P1 immediately; P2 by impact;
  regressions for every corrected failure; no roadmap expansion disguised as fix.
- **Non-goals:** new grammar/features before stability.
- **Verify/complete:** two consecutive real productions without repeated blocker.

#### S1-WP2 — Performance and cache tuning

- **Tasks:** use measured launch profiles; remove dominant waits/memory/disk waste;
  cache diagnostics/cleanup; retain deterministic equality.
- **Non-goals:** speculative rewrites or different render engine.
- **Verify/complete:** recorded target-PC improvement with unchanged outputs.

#### S1-WP3 — Data, migration, and rollback watch

- **Tasks:** audit migration failures, backup/restore, project recovery, cache
  cleanup, provider privacy, installer upgrade, and rollback for every patch.
- **Non-goals:** accepting data loss as a known limitation.
- **Verify/complete:** no unresolved data-safety issue and recovery evidence is
  attached to each affected patch.

#### S1-WP4 — Maintenance release and stabilization gate

- **Tasks:** versioning, migration policy, release notes, installer/rollback,
  dependency cadence, backup compatibility, defect/support/performance summary,
  cohort feedback, and broader-beta/further-stabilization decision.
- **Non-goals:** silent forced updates.
- **Verify/complete:** one maintenance release installs/upgrades/rolls back
  cleanly, P0/P1=0, and Preston records the next-release disposition.

**Required evidence:** cohort defect ledger, regressions for every fix,
performance/cache before-and-after measurements, migration/backup/rollback
results for each patch, maintenance installer hashes, release notes, and cohort
feedback.

**Milestone gate:** one maintenance release installs, upgrades, recovers, and
rolls back cleanly; P0/P1=0; repeated blockers are gone; Preston records the
next-release disposition.

## 10. Cross-phase quality gates

The following never wait until launch:

- **Truthfulness:** unsupported state is absent or plainly unavailable.
- **Determinism:** same accepted inputs produce the same canonical plan and frame/
  audio outputs where deterministic components apply.
- **One path:** Studio preview, range render, final render, and evidence consume
  the same project/plan/runtime path.
- **Continuity:** character identity, profile, screen direction, geography, props,
  layers, camera, and audio state persist unless an authored transition changes.
- **Visual integrity:** no invisible sprite crop, detached face, moonwalk, default
  full-character blur, foreground misalignment, ghosting, teleport, or unintended
  disappearance.
- **Audio integrity:** real media, explicit timing authority, editable lip sync,
  source/license metadata, no drift/clipping.
- **Accessibility:** keyboard/focus/labels/contrast/reduced motion and compact
  layout are package evidence, not final polish only.
- **Recovery:** any durable write or long job has cancellation/failure/reopen
  behavior before it is advertised.
- **Security/privacy:** no credentials/sessions in Git, projects, screenshots, or
  support bundles; subprocess and file boundaries are explicit.
- **AI authority:** every model-visible context is explicitly scoped; durable or
  costly actions require a reviewable typed proposal and human approval; manual
  UI and MCP use the same validated command layer.
- **Evidence:** exact remote SHA, tests, actual UI/render/audio, limitations, and
  hosted checks are recorded before acceptance.

## 11. Launch stop conditions

Do not proceed to private launch when any of the following is true:

- preview and final render do not consume the same canonical composition;
- Godot produces non-deterministic accepted output;
- a shipped or episode asset lacks required provenance or license disposition;
- a project cannot recover after crash, restart, or interrupted durable write;
- the 20-minute render cannot cancel, resume, recover, and produce exactly
  36,000 video frames with sample-accurate audio;
- any visible control falsely claims generation, recording, rendering, export,
  upload, approval, or production success;
- any P0 or P1 defect remains open;
- install, migration, backup, restore, or rollback has not been validated on the
  supported Windows configuration;
- the packaged app requires developer tools, a repository checkout, hidden
  credentials, or undocumented machine state;
- the Codex/App Server bridge lacks an honest installed/auth/offline/usage-limit/
  incompatible-version state, can expose credentials, or can bypass the
  StoryStage MCP allowlist and proposal approval path;
- required provider privacy, media rights, citation, accessibility, or support
  ownership remains unresolved.

## 12. Risk register and decisions that must not drift

| Risk                                          | Current decision / mitigation                                                      | Gate                   |
| --------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------- |
| Plan forgotten after chat compaction/new task | Git bootstrap documents + status ledger; goals/chat are non-authoritative          | roadmap acceptance     |
| Old proofs mistaken for product               | B1 reuse-versus-retire audit; no proof counts as phase completion                  | B1-WP1                 |
| Ollo source/rig inconsistency                 | exact readiness audit and Preston registration/motion gates                        | B2-WP2–4               |
| Godot/Remotion mismatch                       | complete visual Godot shots; one Remotion episode edit/audio/delivery composition  | B2-WP1, B2-WP6–8       |
| AI produces incoherent/random direction       | structured proposal, deterministic validation, human edits, two-brief benchmark     | B3                     |
| ChatGPT subscription treated as an API/session | Codex owns official ChatGPT auth; no key/cookie/web automation or silent fallback  | E1/B3/R2               |
| Agent gains hidden production authority       | least-privilege MCP, one command layer, typed diff, approval, undo, scoped context  | E1/F3/B3/R2            |
| App Server protocol changes                    | pinned runtime/schema, stable-method preference, compatibility preflight and gate   | E1/B3/R1               |
| Audio underestimated                          | F5 UI then B4 engine before finished pilot                                         | F5/B4                  |
| 20-minute memory/render failure               | selected-range caches, chunks, resume, exact 36,000-frame soak                     | B6                     |
| Unlicensed Google/stock/SFX/media             | source/license metadata and hard delivery readiness rules                          | F4/B4/R2; B7 if added  |
| UI and roadmap dashboard drift                | `ROADMAP_STATUS.md` is authority; dashboard must read generated/exported status    | roadmap tooling ticket |
| Overengineering                               | one package, visible result, explicit non-goals, split before work if too large    | every ticket           |

## 13. Preston decisions and recommended defaults

| Decision                     | Recommended default                                                                                                                                     | Deadline        |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| Private-launch template scope | Expose only Ollo & Friends — Kids Story; add no placeholder/disabled second template; Weird History is post-launch                                   | G0 gate         |
| AI agent                     | Codex first through local App Server + official ChatGPT sign-in + StoryStage MCP; no API-key or website-session fallback                                 | E1/B3-WP1       |
| Agent extensibility          | Keep domain commands agent-neutral, but do not build or ship a generic provider/plugin framework in v1                                                     | B3-WP2          |
| Screenplay privacy           | Show scope before each request; Codex owns auth; no cookies, raw tokens, API keys, silent background transmission, or conversation content in diagnostics | E1/B3-WP1/R2    |
| TTS                          | Not required; user recording/import first                                                                                                               | F5 gate         |
| Stock/archive/audio          | Approved sources and license policy; no unlicensed scraping; detailed archival workflow waits for post-launch B7                                        | F4/B4/B7-WP2    |
| Windows signing              | Obtain a certificate if practical; otherwise explicitly accept unsigned private-beta friction                                                           | R1-WP2          |
| Updates                      | Manual installer upgrades for private launch                                                                                                            | R1-WP2          |
| Telemetry                    | None; user-triggered redacted diagnostics only                                                                                                          | R2-WP1          |
| Supported hardware           | Set from measured R1/B6 results, not guesses                                                                                                            | R2-WP3          |
| Private cohort               | Named bounded testers with backup instructions and an explicit support owner                                                                            | L1-WP2          |
| B8                           | Inactive and non-blocking unless one specific approved shot requires it                                                                                 | B5 shot lock    |

The roadmap candidate uses these defaults for sequencing. Preston's G0 decision
either accepts them or records an exact amendment before implementation begins.

## 14. Definition of complete

StoryStage is not complete because a shell, schema, rig proof, render demo, or
pilot exists. The private-launch product is complete only after B6, R2, and L1
acceptance. B8 is either `NOT REQUIRED` or complete only for the exact activated
specialist shot class. S1 closes the first stabilization cycle. B7 is optional
post-launch template expansion and cannot block this release.

The next permissible action after this amended roadmap is accepted is
**E1-WP1 only**. No later E1 package, F3 implementation, later frontend phase,
backend phase, or launch package is authorized merely by this document existing.
