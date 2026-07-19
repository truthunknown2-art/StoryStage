# [KIMI] UI Slice A handback — creator Create screen

Task: `KIMI-UI-SLICE-A` (inbox v1, START-NOW)
Work branch: `agent/kimi-ui-slice-a`, branched from accepted root base `cc5f8a5`
Implementation commit: `4643f5e` — `feat: creator Create screen with Ollo & Friends cast and art direction (KIMI-UI-SLICE-A)`

## What was built

The creator Create surface (`apps/studio/src/Cv001CreatorApp.tsx` + `cv001-creator-studio.css`) reworked to approach the binding mockup `docs/design/creator-first-reset/story-stage-create-v1.png` while keeping every control wired to real state:

1. **Paste or import a script.** Real `.txt` import (FileReader, plain-text only, failure notice on unreadable files). Imported file name seeds the title.
2. **Preview natural beats.** Numbered beat chips with arrows, derived from the real parse (`parseCv001ThreeBeatScript` on the lantern route, `createCv002Project` graph otherwise). Header reports the true total and how many are shown; empty/invalid states say so.
3. **Choose a project grammar.** Kids Adventure card carries the approved Ollo & Friends cast crop and the honest status line `Cast identity approved · character rigs in progress` (identity approved, rigs not render-ready, per the cast brief). Weird History keeps the Rook identity sheet.
4. **Choose an art direction.** Three real, selectable directions taken from `environment-art-direction-v1.png` (Storybook Watercolor & Paper Cutout / Cut Paper Collage & Mixed Media / Soft 2D Digital Illustration). Weird History shows the single approved Editorial collage reference statically. Honest note: the choice guides the later asset step; no art is generated now. Layer line (Background / Midground / Characters / Foreground) communicates layered-scene intent without a decorative asset browser.
5. **Voice & format.** Intentionally disabled single-option selects with the reason stated inline (voice arrives in a later milestone; this build renders 16:9 · 1080p · English).
6. **Create a first cut with review-before-generation stated.** Footer keeps the review promise next to the action; when the action is disabled the exact reason (word/paragraph bounds, missing title) is shown beside the button. Title moved into `More options` (progressive disclosure). No capability hashes, confidence matrices, or diagnostics in the default flow.

Cast handling per `2026-07-18-codex-kimi-ollo-cast.md`: the loadable Kids sample is now an Ollo & Friends script (Ollo, Tix, Dot, the Storylight; 140 words, classifies to 3 scenes × 3 beats with `3.1 reaction`, matching the Mara sample's layout). Mara remains only in the deterministic lantern demo route, which is explicitly labeled `Demo scene with Mara engineering proof art and an assigned rig — not Ollo & Friends channel branding`. No Mara pixels were relabeled. Identity board SHA-256 verified: `0950d7043347528a302de5d70f36736dcfbec1f9e0177296756e91b96fbc846f`.

## Changed files (commit 4643f5e)

- `apps/studio/src/Cv001CreatorApp.tsx` — reworked Create screen (import, beat chips, art-direction state, honesty copy, More options, footer reason)
- `apps/studio/src/cv001-creator-studio.css` — styles for the above; responsive single-column below laptop widths
- `apps/studio/src/assets/` — 4 derived crops: `ollo-friends-cast-v1.jpg` (identity board cast), `art-direction-{storybook-watercolor,cut-paper-collage,soft-2d-illustration}.jpg` (environment board); small web-weight derivatives, sources untouched
- `docs/design/ollo-friends-show-pack/` — canonical boards copied verbatim from `origin/agent/kimi-frontend` (`identity-board-v1.jpg`, `environment-art-direction-v1.png`)
- `apps/studio/src/Cv001CreatorStudio.test.tsx`, `apps/studio/src/Cv002DraftReview.test.tsx` — updated for renamed controls (`Load an Ollo & Friends sample script`, board-named art directions), the duplicated validation message, and the Ollo sample's draft title/beat layout

No changes under `director/`, continuity, compiler, `packages/contracts`, or fixture authority. The Cv001 studio, draft review, showcase, and host adapters are untouched.

## Verification (all in `apps/studio` on this branch)

- Focused tests: `vitest run` on the 6 studio suites — **70/70 passed**
- Typecheck: `tsc --noEmit` — clean
- Lint: `eslint apps/studio` — clean (2 remotion img warnings resolved with the existing creator-workspace-thumbnail disable pattern)
- Format: `prettier --write` on the 4 touched sources
- Production build: capability-asset verify + `tsc --noEmit` + `vite build` — succeeded (pre-existing >500 kB chunk warning unchanged)
- Real UI inspection (vite dev, Chromium via Playwright; see screenshots):
  - desktop 1440×900: default lantern route; scrolled voice/format + More options; Ollo sample → `140 words · about 55 seconds · 9 beats found`, first 4 chips; Weird History switch → static Editorial collage; draft review (3 scenes · 9 beats, Ollo text); saved-work restore cards; animated studio with live Player
  - narrow 820×900: single-column stack, sticky footer action, saved-work cards, stacked studio
  - console clean (only the React DevTools info line)

Note: inspection used port **5174**, not 5173 — 5173 is occupied by another agent's dev server serving the `C:/Projects/StoryStage` (kvp001) worktree, which I did not touch.

## Screenshots

Under `reports/agent-handoffs/2026-07-19-kimi-ui-slice-a/`:

- `create-desktop-1440-default-lantern.png` — default Create, Mara demo route with honesty note
- `create-desktop-1440-scrolled-voice-format.png` — step 4 disabled with reason, More options
- `create-desktop-1440-ollo-sample-9-beats.png` — Ollo sample loaded, beat chips + counts
- `create-desktop-1440-weird-history-static-art.png` — grammar switch, static Editorial collage
- `create-desktop-1440-saved-work-restored.png` — saved-work restore after reload
- `draft-review-ollo-3-scenes-9-beats.png` — Cv002 draft review on the Ollo sample
- `studio-desktop-1440-animated-prototype.png` — Cv001 studio, live Player, labeled prototype art
- `create-narrow-820-top.png`, `create-narrow-820-saved-work.png` — narrow Create
- `studio-narrow-820-stacked.png` — narrow studio stacking

## Control honesty statement

- **Real, stateful:** script/title fields, `.txt` import, sample loaders, grammar selection, art-direction selection (create-screen state), beat preview (derived), Create action (lantern → real Cv001 project; other scripts → real Cv002 draft), saved-work continue cards, showcase entry, More options disclosure, replace-confirm dialog.
- **Intentionally disabled with stated reason:** Voice / Frame / Language selects (later milestone; reason inline); Create action when validation fails (reason rendered beside the button).
- **Omitted deliberately:** decorative cast browser (cast brief), asset/layer browser (slice brief), Back-to-projects nav (no projects list exists yet; saved work lives on this screen), Paper Collage vs Ink & Wash "coming later" placeholders (replaced by the three real board directions).

## Known limitations

- Art-direction selection is Create-screen state only; it is not yet persisted or passed into the Cv002 draft (no contract field exists — adding one is contract work outside this slice).
- Beat chips show text captions only; no per-beat thumbnails (mockup imagery would imply scene art that does not exist).
- The `estimateSeconds` readout is a rough ~150 wpm narration heuristic, labeled "about".
- Kids grammar card uses a cropped cast image from the approved identity board; rig coverage remains incomplete, stated in the card.
- `.playwright-cli/` tool artifacts were not committed.

## Merge / integration instructions

Fast-forward intended: branch is a single commit on top of `cc5f8a5` plus this handback. No rebase onto `agent/kimi-frontend` performed (its merge base predates the accepted authority work, per the slice brief). Merge `agent/kimi-ui-slice-a` into the integration branch of your choice; the only shared-file edits are the two studio sources and their two test files, so conflicts should be limited to other creator-surface work. After merge, `pnpm --filter @storystage/studio test` should stay at 70/70.

Waiting for the inbox version/status to change before starting further work.
