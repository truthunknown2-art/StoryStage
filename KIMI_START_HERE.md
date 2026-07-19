# StoryStage Kimi frontend lane

Base commit: `63c61c7`

You are StoryStage's frontend, creator-workflow, and animation-direction
specialist. Work only in this `agent/kimi-frontend` worktree. Codex owns the
canonical contracts, deterministic compiler, persistence, security boundaries,
renderer integration, and final merge. ChatGPT Pro is the product architect and
acceptance reviewer. Preston is the final creative authority.

## First assignment: read-only product and performance audit

Do not change product code yet. Inspect:

- `docs/design/creator-first-reset/story-stage-create-v1.png`
- `docs/design/creator-first-reset/story-stage-studio-v1.png`
- `apps/studio/src/App.tsx`
- `apps/studio/src/Cv002DraftReview.tsx`
- `apps/studio/src/creator-studio-components.tsx`
- `apps/studio/src/director/`
- `apps/studio/src/styles.css`
- `apps/studio/src/cv002-draft-review.css`
- draft PR #1 and the current branch history

Run the app and compare its Create and Director screens with both binding
mockups at desktop and 1024px widths. Rank the five largest information
hierarchy, navigation, responsive, accessibility, and interaction-clarity
defects. For each defect, name the exact component/CSS area and the smallest
honest correction. Also critique whether the current moving output reads as
genuine character performance or engineering proxy motion.

Your existing observation that the renderer swaps a few whole-body images,
leaves several compiled action types without visual performance, and has thin
camera/transition/audio behavior is useful. Turn that into a source-linked
audit rather than starting implementation from chat assumptions. Propose the
smallest visual-performance layer that could own:

- parts-based character rigs and authored exposures;
- internal body/face performance, walk/idle/reaction cycles, easing, blinking,
  and lip-sync visuals;
- local visual performance that consumes compiler-resolved camera,
  transition, phase, gait, gaze, and viseme samples without deciding their
  timing;
- reusable motion programs that consume, but never independently invent,
canonical root motion, facing, gaze, gait phase, action phase, visibility,
prop attachment, camera/transition samples, viseme timing, or shot-boundary
state.

Codex owns those canonical continuity states in a new hash-bound
`ContinuitySequencePlan` inside the existing `ExecutableEpisodePlan`. Your
audit must name the exact TypeScript boundary you recommend between that plan
and the visual-performance implementation so the two lanes cannot create
competing root-motion, camera, or timing authority.

Pro has accepted this tightened ownership line:

- Codex compiles camera intent to exact samples, transition intent to exact
  progress/mask samples, dialogue timing to exact viseme cues, and continuity
  to exact root/boundary states.
- Kimi owns deterministic local rig output only: articulated parts, authored
  exposures, facial shapes, blink appearance, secondary motion, sockets, and
  local effects.
- Kimi's output may not contain root transforms, camera or transition values,
  absolute frames, shot-duration mutation, visibility mutation, prop ownership,
  prop lifecycle, or cut timing.
- A rig renders at local origin inside Codex-owned entity, camera, and
  transition hosts. Kimi owns how a viseme looks, never when it occurs.

Your audit should propose strict `LocalPerformanceInput` and
`LocalPerformanceFrame` schemas, fail-closed rig validation, and a first
120–150 frame generic Kids proof covering walk/decelerate, named plant,
gaze/head lead, torso follow, arm reach, supplied viseme cues, blink, settle,
and living hold. Do not begin that proof until the accepted continuity-contract
commit is available as a new base.

## Accepted implementation lane after the audit

Preston explicitly wants Kimi to own StoryStage's UI/UX implementation as well
as local visual performance. The product is an **AI-automated animation
studio**: a creator pastes a script, reviews natural story beats and a directed
first cut, then edits real scene, character, camera, voice, SFX, music, asset,
and timing decisions without confronting internal compiler jargon.

The two committed mockups are the binding desktop targets:

- `docs/design/creator-first-reset/story-stage-create-v1.png`
- `docs/design/creator-first-reset/story-stage-studio-v1.png`

After Codex/Pro accepts the audit and provides the accepted continuity-contract
base, implement the existing Create and Studio routes toward those mockups in
small reviewable commits. The Create screen must make script -> grammar -> art
style -> voice/format -> first cut obvious. The Studio screen must make scene
selection, the real Player, director controls, and the multi-track timeline
read as one coherent workspace. Reuse the current application state and
actions; do not build a disconnected visual demo or placeholder controls.

UI evidence for each slice must include desktop and 1024px screenshots,
keyboard/focus checks, tests, and a short mapping from every visible control to
the real state mutation or command it invokes. If a mockup control is not yet
backed by product capability, label it honestly or omit it rather than faking
completion.

Write only the audit, proposed rig/performance interface, and proposed file plan to
`reports/agent-handoffs/kimi-ui-audit.md`, commit it, push
`agent/kimi-frontend`, and open a draft PR. Do not implement until Pro/Codex
accept the file plan.

## Non-negotiable architecture rules

- Do not create a second preview, timeline, compiler, or render path.
- The authoritative Player consumes the canonical `ExecutableEpisodePlan`.
- Do not add decorative Audio, Assets, Export, or timeline controls that do not
  perform real work.
- Do not weaken approvals, capability honesty, deterministic gates, or asset
  verification.
- Do not show proxy-only motion as final-ready.
- Use the two committed mockups as binding visual targets, not loose inspiration.
- Preserve accessibility and responsive behavior.

## Handoff format

Include base commit, branch, scope, status, summary, files changed, test commands
and results, screenshot paths, questions, and any merge-risk notes. Every claim
must be tied to a commit or captured artifact.
