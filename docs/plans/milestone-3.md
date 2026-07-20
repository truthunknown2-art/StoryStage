# Milestone 3 — F3 Director workspace

## Authority and visible outcome

This milestone implements only the frontend phase **F3 — Director workspace**
from `docs/PRODUCT_PLAN.md`.

The visible outcome is a useful, honest local Director workspace inside the
Product v1 Studio. A creator can choose a scene and beat, edit Direct, Visual,
and Motion direction for that exact scope, review the resulting direction
summary, and undo or redo committed local changes. The workspace does not claim
to generate imagery, animate a rig, plan shots with AI, save a project, play
media, render, or export.

Kimi owns implementation in `apps/studio`. Codex reviews and integrates one
work package at a time. ChatGPT Pro audits the completed milestone. Preston
accepts or rejects the visible F3 gate before F4 starts.

## Reconciled assumptions

- `product/v1` is the only integration base and GitHub is the source of truth.
- The existing F2 eight-scene Ollo hierarchy remains bounded local demo data.
- One `selectedSceneId` remains authoritative across rail, board, transport,
  overview, and Director.
- F3 adds one authoritative selected beat beneath that scene. It does not add a
  second inspector-local scene or beat selection model.
- Direction edits are deliberately session-local Product v1 UI state. They are
  not production contracts, persisted project data, AI output, or renderer
  instructions.
- Direct, Visual, and Motion are the F3 surfaces. Assets arrive in F4; narration
  and sound arrive in F5; timeline/export arrive in F6.
- Existing legacy, proof, Director Alpha, and Remotion surfaces are not Product
  v1 implementation shortcuts. F3 must not import a transitive legacy runtime
  merely to make the workspace appear functional.

## Milestone acceptance criteria

F3 passes only when:

1. scene and beat scope are always explicit and synchronized;
2. every visible editable control changes local state, while every unavailable
   capability is absent or has a plain-language reason;
3. committed Direct, Visual, and Motion changes can be undone and redone without
   corrupting another scene or beat;
4. direction survives scene/beat navigation for the current browser session and
   is never described as saved;
5. the reference board communicates the selected direction without pretending
   to be generated imagery or animation;
6. the full eight-scene demo remains navigable at 1920×1080, 1440×900, and
   1024×800 with no page-level horizontal overflow or unreachable required
   region;
7. focused Studio tests, typecheck, build, repository-root `pnpm verify`, actual
   screenshots, browser console/page-error checks, Codex review, Pro audit, and
   Preston acceptance are complete on exact pushed SHAs.

## Dependency-ordered work packages

### F3-WP1 — Director scope and workspace foundation

**Primary invariant:** one selected scene and one selected beat drive the rail,
scene board, transport context, and Director scope header.

**Deliverable:** make the selected scene's two beat rows real selection
controls; add one deterministic selected-beat state; replace the F2 "Director
arrives" block with a Product v1 Director workspace containing Direct, Visual,
and Motion tabs plus an always-visible scene/beat scope header. Changing scene
selects that scene's first beat. Selecting either beat updates the Director and
board context through the same state. Replace the stale phase-internal Preview
reason with durable capability language.

Only navigation, scope, truthful empty/read-only panel states, and tab selection
are implemented in this package. If a panel has no editable controls yet, it
must say so plainly and must not show a pretend Apply action.

**Non-goals:** direction fields, undo/redo, AI proposals, generated shot lists,
asset/audio controls, media preview, persistence, shared production schemas,
backend calls, Remotion, or Godot.

**Targeted verification:** focused Product v1 tests prove both beat choices,
scene-change first-beat selection, rail/board/Director synchronization, tab
selection, F2 long-form navigation retention, and truthful unavailable copy.

**Complete when:** the exact branch is pushed with focused tests green and
actual 1440×900 screenshots showing two different beat scopes.

### F3-WP2 — Direct editing and beat-scoped undo/redo

**Primary invariant:** a committed edit changes only its exact scene/beat and
can be reversed without mutating another scope.

**Deliverable:** add a small local direction model owned by Product v1 and a
Direct panel with a bounded set of useful fields: beat purpose, performance
direction, and continuity note. Inputs edit a labelled draft for the selected
beat; a real Apply action commits one transaction; Undo and Redo operate on that
beat's committed transaction history. Switching away and back restores that
beat's session-local committed direction and any clearly labelled draft policy.
The UI must say "local session" rather than "saved" or "generated."

**Non-goals:** free-form AI command interpretation, automatic screenplay
direction, global cross-beat undo, persistence, collaboration, production
contracts, timing changes, visual/motion fields, or renderer integration.

**Targeted verification:** tests cover draft versus committed state, Apply,
Undo, Redo, redo invalidation after a successor commit, independent histories
for two beats and two scenes, navigation restoration, and disabled Undo/Redo at
their real boundaries.

**Complete when:** a creator can visibly change and reverse Direct direction on
multiple beats without scope leakage, with focused tests and one actual
before/after/undo screenshot sequence.

### F3-WP3 — Visual and Motion editing with honest board feedback

**Primary invariant:** Visual and Motion controls commit through the same
beat-scoped transaction path as Direct and never claim a rendered result.

**Deliverable:** add bounded Visual controls for framing and composition focus,
and bounded Motion controls for camera intent, performance pace, and end hold.
Use ordinary labelled controls with concise option sets. Applying either panel
updates the selected beat's committed direction and participates in the same
Undo/Redo history. The reference board gains an honest direction overlay or
summary showing the committed shot, focus, camera, pace, and hold values while
remaining visibly labelled **reference board — not animation**.

Every control must have an observable local-state consequence. Do not add an
"AI direct," "generate," "animate," or preview button until a real later phase
connects that capability.

**Non-goals:** image effects, canvas manipulation, drag handles, keyframes,
timeline edits, real camera motion, playback, animation, assets, audio,
persistence, or backend/runtime contracts.

**Targeted verification:** tests cover all option groups, Apply from each panel,
cross-panel Undo/Redo ordering within one beat, independent beat state, board
summary synchronization, and retained F2 scene navigation.

**Complete when:** Direct, Visual, and Motion each produce a useful reversible
local edit and the board reports exactly what is committed without visual or
capability exaggeration.

### F3-WP4 — Responsive, accessibility, evidence, and phase gate

**Primary invariant:** the evidence describes only controls and states present
in the exact pushed F3 candidate.

**Deliverable:** complete keyboard and focus behavior for beat selection, panel
tabs, fields, Apply, Undo, and Redo; tune desktop and compact layouts; retain
reduced-motion behavior; reconcile the F2 extra screenshot by either indexing
it or removing it from the new evidence lineage; capture final Direct, Visual,
Motion, Undo, and compact states with exact hashes; and publish the immutable F3
handback.

**Non-goals:** opportunistic F4 work, persistence, AI, assets, audio, timeline,
export, backend implementation, production schemas, animation, or render work.

**Targeted verification:** focused Product v1 tests, Studio typecheck/build,
repository-root `pnpm verify`, screenshot hash verification, 1920×1080,
1440×900, and 1024×800 browser checks, keyboard-only click-through, no
page-level horizontal overflow, reduced-motion check, and zero console/page
errors.

**Complete when:** Codex and Pro find no blocking F3 defect and Preston accepts
the visible Director workspace at the exact integrated `product/v1` SHA. F4
still requires a separate plan/ticket.

## Stop rules

- Execute only one work package at a time.
- Each package ends in one pushed branch and draft PR reviewable on its own.
- Codex records ACCEPT or bounded corrections against an immutable remote SHA.
- A package acceptance does not start the next package until the accepted head
  is integrated and the Kimi inbox advances to a higher version.
- No package may change shared engine/runtime contracts to make frontend state
  appear more real.
- F3 completion does not authorize F4 or backend work.
