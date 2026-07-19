# [KIMI] UI Slice C handback — Director Studio visual polish

Task: `KIMI-UI-SLICE-C-VISUAL-POLISH` (inbox v10, START-NOW)
Work branch: `agent/kimi-ui-slice-c-visual-polish`, from exact accepted integration base `2de764c27640657a97f90eef2c630ff171e9176f` (PR #15 merged into the provider-neutral Ollo lineage)
Implementation commit: `206ff36`
Visual references: `Generated image 1.png` (Director Studio mockup, primary), `Generated image 2.png` (Create-flow mockup)

## What was polished

Real-data visual polish of the accepted Director Studio shell only — no new, fake, or implied capability.

- **Production header.** Grammar + sealed art-direction tag pills beside the brand (real `project.grammar` / `project.artDirectionSelection.optionId`). Topbar grid extended to a four-zone layout (back / brand / tags / actions) at the direction-screen specificity so nothing wraps or overlaps; tags hide below 1040px.
- **Scene rail.** Every beat card now carries its real resolved duration (timing solution ÷ fps) and an honest capability chip — `Render-ready` (mint) only when every performance requirement for that beat resolved to a supported executable program, otherwise `Proxy` (amber).
- **Player.** Framed canvas: border, radius, shadow; 16:9 preserved; native transport untouched.
- **Director inspector.** Pill-tab treatment for Visual/Motion; mint primary-action hierarchy on the real actions (`Preview change`, `Preview visual change`, `Apply and replay this beat`) with matching focus rings; existing grouping/rhythm retained.
- **Beat strip.** Real resolved durations under every card; wide-desktop sizing so cards stay readable at 1600/1920.
- **Selected-beat timeline.** Tools row with a **real zoom control** (visual rescale + horizontal scroll only; never alters timing data), a whole-second ruler computed from the episode fps, colored lane dots (Shots green / Events amber / Camera purple), scrollable lanes. Still collapsed by default; still only real Shots, Events, and Camera data; event markers still seek to resolved frames.
- **States/responsive/a11y.** Selection/hover/focus/disabled/unavailable treatments kept consistent; no horizontal overflow at 1440/1600/1920 (measured 1440=1440, 1600=1600, 1920=1920); reduced-motion guards added for the new transitions; existing focus-visible rings preserved and extended to the mint actions.

## Mockup-parity audit

**Now matches the mockup:**

- Compact production header with project tags and saved-state (mockup's "Autosaved"; ours is the honest `Saved locally`).
- Legible scene rail with useful thumbnails, titles/roles, durations, and per-beat state chips (mockup's Done/Editing/To-do → our honest `Render-ready`/`Proxy`, which is the only state the build actually has).
- Dominant framed 16:9 Player with clean transport spacing.
- Calm Director inspector with tab treatment, grouped fields, and a mint primary action (mockup's `Apply direction` → our real `Preview`/`Apply` patch flow).
- Beat strip with thumbnails, titles, durations, and a selected ring; multi-track selected-beat timeline with colored lane labels, markers, playhead, ruler, and zoom.

**Intentionally differs because the capability is absent (and must stay absent):**

- No `Export` button, no `Preview` render button in the header — no real behavior exists.
- No Audio/Assets Director tabs, no Voice/SFX timeline lanes, no waveforms — there is no real audio data in this build; the timeline shows only real Shots/Events/Camera.
- No `Add scene` / `Add beat` buttons — no real add behavior.
- No `Needs attention: N visuals` pill — no real attention tracking exists; the honest capability chips carry the truthful state instead.
- Mockup scene art is final-looking illustration; our canvas honestly plays the draft animatic/proxy performance with `Draft animatic` and proxy labels, per the Ollo media/runtime lane being unfinished.

**Remains for the Ollo media/runtime lane:** final character art in Player and thumbnails (currently deterministic proxy/hybrid visuals), true scene statuses (Done/Editing/To-do), Audio/Assets/Export surfaces once real behavior exists, and the pre-existing Kids-route Remotion `image-alt`/`EncodingError` items (Codex's `agent/remotion-kids-image-a11y` lane).

## Changed files (commit 206ff36)

- `apps/studio/src/Cv002DraftReview.tsx` — header tag pills (real grammar/art-direction data), short-label maps
- `apps/studio/src/director/DirectorSceneBeatRail.tsx` — real per-beat durations + capability chips (rail), durations (strip)
- `apps/studio/src/director/DirectorTimelineDrawer.tsx` — tools row + real zoom, fps ruler, lane dots, scroll container; empty ruler spacer keeps lane labels exactly Shots/Events/Camera
- `apps/studio/src/director/DirectorPreview.tsx` — passes episode fps to the drawer (one line)
- `apps/studio/src/cv002-draft-review.css` — consolidated Slice C polish block: tags, chips, player frame, tabs, mint actions, timeline visuals, wide-desktop sizing, topbar zone fix at direction-screen specificity, reduced-motion guards
- `apps/studio/src/Cv002DraftReview.test.tsx` — two timeline queries updated to target the shots lane explicitly (behavior assertions unchanged); no other test changes needed

No engine, runtime, renderer, timing, continuity, eligibility, or asset-authority changes. No Create-flow changes.

## Commands and results

| Command                                                 | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `corepack pnpm --filter @storystage/studio test`        | **82/82 passed (7 files)**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `corepack pnpm --filter @storystage/studio typecheck`   | clean                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `corepack pnpm exec eslint apps/studio`                 | clean                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `prettier --check` (touched files) / `git diff --check` | clean                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `pnpm verify` (repository root, at `206ff36`)           | **all green except one environmental timeout** — 19 capability assets verified; privacy 580 files passed; `eslint .` 0 errors; typecheck clean across 10 projects; tests: story-engine 254/254, studio 82/82, remotion-runtime 20/20, asset-pipeline 54/54, contracts 11/11, fixtures 2/2, orchestration 4/4, asset-worker 3/3, render-worker 15/15, desktop 10/11. The single failure is `apps/desktop delivery-store.test.ts > recovers cleanly from every publication checkpoint` timing out at ~5.1–5.3 s vs the 5000 ms limit **under recursive parallel load on this machine** — it passes isolated in **1669 ms**, and the branch touches zero files outside `apps/studio` (working-tree status at commit: 6 studio files only), so the failure cannot be caused by this slice. Fifth sighting of this load-sensitive test across lanes (Codex saw an asset-pipeline sibling and reserved a flake/remediation lane). Left untouched per Codex guidance; recommend Codex promote the isolation/flake lane. |

Note: bare `pnpm` is not on this machine's PATH; root commands ran through corepack shims pinned to the repo's `pnpm@11.9.0`.

## Screenshots (this directory, actual app)

- `studio-1440x900-setup-beat-no-target.png` — required: setup/no-target beat selected; honest unavailable note; header tags; rail chips
- `studio-1440x900-direct-command-one-target.png` — required: exactly-one-target beat (3.1) with the real `Direct this beat` command visible
- `studio-1920x1080-full-hierarchy.png` — required: complete Player/Director/beat-strip/timeline hierarchy at 1920
- `studio-1440x900-timeline-drawer-open.png` — bonus: ruler, lane dots, real zoom control, Shots/Events/Camera lanes

## Control honesty statement

- **Real:** header tags (display), undo/redo, step tabs, scene-rail and strip selection with exact seek, rail durations + capability chips (display), Player and its native transport, Visual/Motion patch controls, command control on exactly-one-target beats, undo/redo hashes, timeline drawer (zoom, ruler, seek markers, playhead).
- **Honestly unavailable with reason:** structured command on 0- and 2+-candidate beats (distinct truthful copy); zoom minus/plus at range ends; Preview/Apply actions until a change exists; voice/format selects on Create.
- **Omitted (capability absent):** Export, Preview-render, Audio/Assets tabs, Voice/SFX lanes, waveforms, trim, keyframes, Add scene/beat, attention pill, target picker for ambiguous beats.

## Known limitations

1. The environmental desktop delivery-store parallel-load timeout documented above (not caused by this branch; proven isolated-pass; flagged for Codex's flake lane).
2. Mockup-final media remains proxy/hybrid until the Ollo rig/runtime lane lands; thumbnails are deterministic proxy approximations and are labeled as such.
3. The zoom control is visual-only by design (rescales lanes with horizontal scroll); it does not change which frames are shown.
4. The 2+ ambiguous command state has no browser screenshot (no sample script compiles such a beat); it remains covered by the focused Studio regression and the engine ambiguity fixture from PR #12/#15 lineage.

## Integration instructions

Branch is two commits on top of `2de764c` (implementation `206ff36` + this handback). Draft PR targets `agent/kcast001-provider-neutral-rig`. Do not merge — Codex and Pro review the immutable head. After integration, `corepack pnpm --filter @storystage/studio test` should remain 82/82.
