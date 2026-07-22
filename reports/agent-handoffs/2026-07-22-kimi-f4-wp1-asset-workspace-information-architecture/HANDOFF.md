# F4-WP1 immutable handback

Task: `F4-WP1-ASSET-WORKSPACE-INFORMATION-ARCHITECTURE`
Issue: [#99](https://github.com/truthunknown2-art/StoryStage/issues/99)
Draft PR: [#101](https://github.com/truthunknown2-art/StoryStage/pull/101)
Required branch: `agent/kimi-f4-wp1-asset-workspace-information-architecture`
Inbox: version `79` on `origin/agent/kimi-frontend`

## Exact identity

- Exact accepted base: `d6fe17ca7507cfd37f61a954b5f5034982c3554d`
  (`product/v1` head at dispatch; the watcher-supplied workspace was detached
  at exactly this commit, verified before writing).
- Implementation SHA: `c2273d3db4ca74acc1a732c20ceeca1d4a041a59`
- Kimi handback tip: `0ded42ebaad72361d61a285845dc0944e7eb8dc9`.
- Final review-correction tip: the commit containing this updated file,
  reported as an exact remote SHA in PR #101 and issue #99 because a Git
  commit cannot embed its own SHA.
- Required branch was confirmed absent locally and remotely before creation.

## Delivered result

One bounded Product v1 **Assets & Rigs** workspace, reachable from the
accepted Studio shell through a Scene board / Assets & Rigs switch, that
preserves the accepted Projects → Create → shared proposal review → Studio
journey and the selected scene/beat scope exactly:

- Characters, Locations, Layered Sets, Props, and Rigs category views with
  `aria-current` selected semantics (never color alone).
- Episode and scene filters grounded in the deterministic Ollo demo
  hierarchy. Scene options always belong to the selected episode fixture;
  invalid episode/scene combinations normalize fail-closed in
  `sanitizeAssetScope`.
- One selected asset identity synchronized between the category/list surface
  and the selected-asset detail. When a category or filter excludes the
  selection, it deterministically falls to the first visible record or an
  honest empty scope — hidden stale detail is never retained
  (`resolveAssetSelection`, render-time adjustment, no effect races).
- Deterministic session-local fixtures only: Ollo, two supporting characters
  (Tix, Dot), two story locations (The Little Wood, The Little Elsewhere),
  two layered sets (The Home Nook set, Lantern Bridge set), two props (The
  Storylight lantern, Dropped berry trail), and one rig placeholder (Ollo
  performance rig). Every record exposes what is known plus source truth,
  approval truth, readiness truth, and one next honest preparation action.
- A small consistent readiness vocabulary — `Record only`, `Described`,
  `Needs reference` — always shown next to its fixture disclaimer, ready for
  later F4 packages to extend. F4-WP2 scene-requirement aggregation,
  episode counts, and blocker rollups are deliberately absent.
- Every preparation action (Attach reference art, Slice artwork into layers,
  Register rig markers) is visibly unavailable (disabled) with its reason.
  No control claims an artifact, approval, import, generation, or success.
- The board surfaces (rail, board, inspector, AI Director panel, episode
  overview) stay mounted behind `hidden` while the workspace is open, so the
  selected scene/beat, playhead, per-beat direction history, and AI Director
  panel session state are preserved exactly. Asset filters are workspace
  state only and can never change the selected Studio scene.

## Changed files (implementation `c2273d3`)

```
 apps/studio/scripts/f4-wp1-evidence.mjs            | 450 ++++++
 apps/studio/src/product-v1/AssetWorkspace.tsx      | 250 ++++
 apps/studio/src/product-v1/StudioShell.tsx         |  53 +-
 apps/studio/src/product-v1/asset-workspace.test.tsx | 512 ++++++
 apps/studio/src/product-v1/asset-workspace.ts      | 392 +++++
 apps/studio/src/styles.css                         | 277 ++++
 6 files changed, 1932 insertions(+), 2 deletions(-)
```

The handback commit adds this package's evidence directory
(`reports/agent-handoffs/2026-07-22-kimi-f4-wp1-asset-workspace-information-architecture/`)
plus a one-line `/* global … */` comment fix in
`apps/studio/scripts/f4-wp1-evidence.mjs` that keeps `pnpm lint` at zero
errors (the branch is never rewritten; the correction rides the handback
commit instead of amending the pushed implementation). Codex's review
successor adds one side-effect test import in `apps/studio/src/App.test.tsx`,
two evidence-script capture calls, two focus-state PNGs, and this truthful
handback update. No manifest,
lockfile, roadmap/status, coordination inbox, contract, story engine,
desktop, worker, Godot, Remotion, asset, audio, persistence, renderer,
export, packaging, or legacy production `AssetExchange`/Assets file was
changed.

## Verification

- `pnpm --filter @storystage/studio test` — PASS, 153/153 tests. Codex's
  bounded review correction imports the focused asset-workspace suite from
  the already-enumerated `App.test.tsx` entrypoint, so all 18 new regressions
  now run in the required standard command without changing the manifest.
- `pnpm --filter @storystage/studio exec vitest run src/product-v1/asset-workspace.test.tsx`
  — PASS, 18/18 focused tests: category navigation and selected state;
  episode/scene filter synchronization and invalid combinations
  (fail-closed sanitize); selection/detail synchronization across
  Characters/Layered Sets/Rigs and two scene scopes; empty-scope and
  stale-selection clearing; truth tests (disabled preparation actions, no
  success claim, fixture labels, readiness disclaimer); Studio switching
  preservation of scene/beat and AI panel session state. The focused file
  also remains directly runnable for diagnosis.
- `pnpm --filter @storystage/studio typecheck` — PASS.
- `pnpm --filter @storystage/studio build` — PASS; only the pre-existing
  Vite large-chunk warning remains.
- `node apps/studio/scripts/f4-wp1-evidence.mjs` against the local Studio
  dev server (`vite --host 127.0.0.1 --port 5195`) — PASS, 17/17 checks,
  zero console warnings, zero console errors, zero page errors, no
  horizontal document overflow in any captured state (document/client width
  evidence recorded per state in the report).
- Repository-root `pnpm verify`:
  - `verify:roadmap` — FAILS ONLY with the brief-anticipated pre-transition
    conflict: the branch is rooted at the mandated base whose
    `docs/ROADMAP_STATUS.md` still records `ACCEPTED_WAIT` / owner Codex /
    F3-WP5, while the live inbox is `START-NOW` for F4-WP1, so the guard
    reports `Codex owns the active package but Kimi is not waiting:
    START-NOW`. No status/roadmap file may be edited by this package.
  - Synthetic merge proof: a clean git worktree of exact implementation
    `c2273d3` with only the authorization block of `docs/ROADMAP_STATUS.md`
    set to the live START_NOW state (`F4 / F4-WP1 / owner Kimi / exactBase
    d6fe17c… / issue 99 / pr 101 / candidateContentHead c2273d3… /
    candidateRef agent/kimi-f4-wp1-asset-workspace-information-architecture`)
    passes the same guard against the live inbox:
    `Roadmap consistency PASS: F4 / F4-WP1 / START_NOW /
    d6fe17ca7507cfd37f61a954b5f5034982c3554d /
    c2273d3db4ca74acc1a732c20ceeca1d4a041a59`. The synthetic tree was
    discarded after the check; nothing was normalized or concealed.
  - `verify:director-capability-assets` — PASS (19 assets).
  - `verify:candidate-rig-review-implementation-receipt` — PASS.
  - `verify:e1-app-server-schema` — PASS (`0.144.1`).
  - `verify:e1-wp4-failure-matrix` — PASS.
  - `verify:privacy` — PASS (1044 files after evidence was added).
  - `pnpm lint` — PASS with zero errors; only the two pre-existing Remotion
    purity warnings in `apps/render-worker/src/kvp001-proof.ts` remain.
  - `pnpm typecheck` (all packages) — PASS.
  - `pnpm test` (recursive, all packages) — the apps/studio suite passes
    153/153 after the review correction and `@storystage/story-engine` passes
    353/353 standalone;
    `packages/asset-pipeline` (outside this package's allowed files,
    byte-identical to the base) shows pre-existing timing-sensitive 5 s
    test timeouts in heavy CPU image tests
    (`character-rig-preparation.test.ts`,
    `character-rig-staging.test.ts`) whenever the suite runs with full
    worker parallelism on this machine. Each implicated file passes in
    isolation (9/9 and 14/14). `packages/asset-pipeline` is byte-identical
    to the accepted base in this branch's diff and neither imports nor
    executes any studio code, so the flake cannot be caused by this
    package's change; no failure was normalized or concealed. See the
    exact-run ledger below.

### Exact-run ledger for the out-of-scope flake

1. Root `pnpm test` (default concurrency): asset-pipeline 1 timeout;
   story-engine suite not reached.
2. Root `pnpm test` retry: asset-pipeline passed; story-engine 3 timeouts.
3. `pnpm --workspace-concurrency=1 -r --if-present test`: asset-pipeline 2
   timeouts.
4. `pnpm --filter @storystage/story-engine test` standalone: PASS 353/353.
5. `character-rig-preparation.test.ts` alone: PASS 9/9.
6. `character-rig-staging.test.ts` alone: PASS 14/14.
7. `pnpm --filter @storystage/asset-pipeline test` standalone: 2 timeouts
   under full file parallelism.
8. asset-pipeline full file list with `--maxWorkers=2`: PASS 126/126,
   confirming worker-parallelism resource contention on this machine as
   the cause; the implicated tests and suites are green whenever
   parallelism is bounded.

## Evidence

Machine-readable report: `screenshots/clickthrough-report.json`
Report SHA-256: `af8c4c3c1a92599bfe01cb69bede05ef354fb24d05b6cf0c7ba83e3f2f67137e`

Listeners (`console` warning/error and `pageerror`) were attached before any
navigation. The real Projects → Create → shared proposal review → Studio →
Assets & Rigs path was exercised at 1440×900. Captured states, each
SHA-256-hashed and recorded in the report:

- `wp1-1440x900-projects.png` —
  `1b55a93a097d2980bc79e1be3c90a6d15fd77ca659978cec8b52d1c574e55b08`
- `wp1-1440x900-proposal-review.png` —
  `be6794751d825f67e7cb596732e35ab1e17f9190fc69ed9e0c8392ac9a8aa675`
- `wp1-1440x900-studio-board.png` —
  `fe29fd11da6bd0be19e368d763b54406443dbad558a9f49a49c845c8f51b83f0`
- `wp1-1440x900-assets-overview.png` (workspace overview: Characters, all
  episodes, all scenes, Ollo selected) —
  `498920926e3c907609146bc40148a5152d56c1b911bcdc3fb1ecd6922fd9682f`
- `wp1-1440x900-assets-layered-set-detail.png` (category/detail state with
  visibly unavailable preparation action) —
  `bf81a1a46ebca8c16b5eb0953f3229afdad15d10a8d05f43a0d2f2fa72aeed75`
- `wp1-1440x900-assets-scene-filter.png` (scene-filter change: Scene 3 ·
  Berry Patch, Tix kept selected) —
  `9301cee4bf77d99e5670b19a72f3b36ce14735254d856accfce365543188cf46`
- `wp1-1440x900-assets-empty-scope.png` (honest empty scope: Props, Scene
  2 · Forest Path) —
  `cb4ccb89aa9b6c6ec6096925d2398f7c69e1735ca29eaef0ae1950e5c59d5aaa`
- `wp1-1440x900-workspace-tab-focus.png` (visible keyboard focus on the
  Scene board / Assets & Rigs workspace switch) —
  `b0747b83a1bf8ebe4fc46c66a80f57c3f8fcfc54b4d234410ea92dc4af31feb7`
- `wp1-1440x900-asset-category-focus.png` (visible keyboard focus on the
  Characters category control) —
  `694a49e4158308826ec309db866c6bebc707f3a8d5961063d5eeacef38a74c49`

The report also records: workspace-switch and category `aria-current`
semantics, list/detail identity synchronization, stale-selection clearing,
disabled preparation controls with reasons, the fixture disclaimer, zero
enabled preparation controls and zero success claims, and keyboard
reachability with visible ≥2 px focus outlines for the workspace switch and
category navigation. Both focus states are now captured in the nine-image
evidence set as well as measured in the report.

## Visible-control truth state

- Scene board / Assets & Rigs switch, category navigation, episode and scene
  filters, and asset selection work as labelled local UI behavior over
  deterministic session-local fixtures.
- Every asset record is labelled **Local demo record — no artifact exists**;
  the readiness vocabulary always appears with its fixture disclaimer.
- Attach reference art, Slice artwork into layers, and Register rig markers
  are disabled with their honest unavailable reasons. No control creates,
  imports, generates, slices, rigs, approves, or reports success.
- Preview and Export remain disabled for the accepted F3 reasons; the AI
  Director surfaces remain explicitly no-service local fixtures; the
  accepted scene/beat scope header stays authoritative in both workspaces.

## Limitations and stop

This is F4-WP1 information architecture only. It does not accept F4, start
F4-WP2, create or import assets, prepare layers or rigs, run approvals,
persist projects, connect providers or workers, or authorize backend,
Godot, Remotion, rendering, export, packaging, or private-launch work.
Episode filtering is grounded in the single accepted Ollo demo episode; the
fail-closed multi-episode path is covered by pure-model tests against
synthetic episode fixtures.

Merge only after the exact handback tip has a green hosted check and Codex
review. Do not treat this handback as F4 acceptance.
