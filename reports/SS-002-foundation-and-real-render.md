# SS-002 durable foundation and real asset-to-frame proof

Date: 2026-07-17
Status: locally verified; fresh Pro audit pending

## Scope

This milestone responds directly to Pro's rejection of `e85e351`. It closes the durable-foundation defects in the same milestone that consumes them through actual prepared pixels, a moving selected-rig diagnostic, immutable approval, a new production revision, and a real Remotion MP4.

## Blocker mapping

- A - exact bundle derivation: the full stored render plan must canonically equal a fresh compile; main finalizes persistence metadata; per-revision saves serialize; the UI tracks the last acknowledged hash.
- B - atomic import evidence: separate bundle/record/report schemas cross-check codec, dimensions, rights, source hash, and staged hash. A temporary evidence directory is atomically renamed. Five desktop tests cover failure after every write, after commit, retry, and conflict.
- C - exact generation binding: jobs carry the production bundle hash and exact generation briefs. Export and rehydration repeat the authoritative comparison.
- D - artifact-backed lifecycle: state refinements bind import IDs; restart validates required loose sessions, staged bytes, preparation/contact sheets, reviews, approved local versions, rejection decisions, and supersession targets.
- E - later reverification: staged bytes are reopened through the isolated worker before preparation; approval and rendering reopen and rehash prepared/approved evidence; the renderer independently checks PNG signature, dimensions, alpha requirements, containment, symlinks, validation, and diagnostic hashes.
- F - real path: normalized bytes -> contact sheet -> selected set -> manifest -> validation -> moving diagnostic -> final approval -> new revision -> exact recompile -> approved Remotion frames -> MP4.

## Proof output

Command:

```powershell
pnpm render:production-proof
```

Evidence: `artifacts/SS-002/proof-report.json`

Observed output:

- H.264, 1920x1080, 30 fps
- 24.04 seconds
- 720 video frames
- stereo AAC at 48 kHz
- approved production bundle hash `9f67b51c2fe373931f4dbe2119f9ef6dc18762b7c3866d7f267c68017247bb74`
- approved manifest hash `3905045f3098649f4749765055c02871e10af66a19dfce03c0fa8dded51183d9`
- diagnostic report hash `7536fc1330dc8e11ba6493534b948f6d3c944099bf9e3fe4564be4d316038834`
- exact decoded production frames 0, 120, 360, and 650 with distinct SHA-256 hashes

Visual inspection confirms actual approved character pixels, pose/mouth/arm changes, plan-driven shot cuts, camera scaling/movement, and fallback visual treatment. The proof fixture is intentionally crude and must not be evaluated as final art.

## Automated evidence

- `pnpm verify`: privacy check, lint, typecheck, and 69 tests across fixtures, contracts, story-engine, desktop, asset-pipeline, studio, asset-worker, and render-worker
- `pnpm build`: all nine code packages plus the Vite studio bundle
- story-engine: production derivation, job/evidence hashes, lifecycle, approval/recompile, diagnostic binding, profile behavior
- asset-pipeline: real transparent character-kit preparation, contact sheet, rig validation, opaque-mask stop, tamper rejection
- desktop: atomic evidence crash/retry tests
- render-worker: strict sample, production, and rig-diagnostic command routing
- studio: host boundary, resume/review state, and StrictMode-safe render subscription

## Live UI evidence

The browser-mode smoke pass completed the default Frankly Weird History setup and produced a 25-shot plan from two natural scenes. Selecting shot 1.04 updated the inspector to that exact shot and its insert framing. The Assets view exposed five generated-art briefs, and the generation-export review disclosed the exact source excerpts, references, style rules, and expected output roles before approval. The desktop-only render action remained disabled in browser mode, and the page emitted no console errors.

Screenshots are intentionally private engineering artifacts under `artifacts/SS-002/ui/` and remain ignored by Git.

## Known open product work

- Real original ChatGPT-generated kids and history art has not yet completed the manual round trip.
- The current character implementation is honest 2D pose-swap, not a skeletal or Blender rig.
- Full live Remotion player/timeline review is not complete.
- Final voice timing, lip sync, music selection, licensed archive/stock ingestion, and automatic Blender routing are not implemented.
- The two polished 25-40 second profile outputs required by Gate 9 remain open.
