# Kimi full brief - F4-WP3 image request and candidate-import UX

## Assignment identity

- Inbox-Version: `83`
- Issue: `#109`
- Exact accepted base: `5eb0037fb6e702696d008b913de53721c12a47b7`
- Required branch: `agent/kimi-f4-wp3-image-request-import-ux`
- Owner: Kimi, frontend/UI only
- Review and integration: Codex
- Milestone audit: ChatGPT Pro after all F4 packages are review-clean
- Product authority: Preston's standing dependency-ordered continuation direction

Claim issue #109 before writing. The watcher supplies a fresh, clean, detached
workspace at the exact accepted base. Create only the required work branch and
confirm it is absent locally and remotely. If any identity, scope, base,
branch, status, issue, or evidence instruction conflicts, stop fail closed and
report the conflict instead of guessing.

## Primary invariant

The creator can move from an understandable, scene-scoped image request pack to
an explicitly confirmed local candidate record while every source, rights,
error, cancellation, and no-real-file boundary remains visible and truthful.

## Required Product v1 experience

Extend only the accepted F4-WP2 Product v1 Assets & Rigs workspace:

1. Preserve Projects -> Create -> shared proposal review -> Studio -> Assets &
   Rigs; the Scene board / Assets & Rigs switch; selected scene and beat;
   direction history; AI Director fixture state; category/filter/detail
   synchronization; F4-WP2 requirement classes, readiness states, blockers,
   counts, and fail-closed unknown-scope behavior.
2. Add a scene-scoped **Request image pack** path from a visible non-ready
   requirement. It must keep the selected scene, requirement, category, and
   current blocker visible.
3. Preview a deterministic local request pack containing a creator-readable
   prompt, labelled reference attachments, expected views, expected layers,
   intended use, and the requirement/scene it serves. References are names and
   descriptive local demo records only; no reference bytes or files exist.
4. Provide honest manual-workflow guidance for taking the request to a creator-
   chosen image tool and returning with candidates. Do not claim text was copied,
   a site was opened, an image was generated, or a download occurred unless an
   existing real browser/clipboard capability actually proves it. Omit or disable
   unavailable actions with a plain reason.
5. Model deterministic session-local UI states for import selection and drag/
   drop intent: idle, selection/drop pending, reviewing candidate metadata,
   cancelled, duplicate, wrong format, missing source, missing license, and a
   generic failed/unavailable state. These states never read or write real bytes.
6. Show the proposed candidate name, declared format, source, license/rights,
   reference association, expected-view coverage, and any validation problem
   before confirmation. Unknown or stale IDs and invalid state transitions fail
   closed into an explicit unavailable state.
7. Require an explicit confirmation step before adding a **local candidate
   record** to the bounded review list. Confirmation must be impossible while
   required source/license or format truth is invalid. Cancellation returns to a
   stable prior state without changing readiness or counts.
8. After confirmation, say exactly that only a session-local descriptive
   candidate record now exists. Do not label a file imported, uploaded,
   generated, reviewed, approved, prepared, rigged, capable, ready, or production
   usable. F4-WP2 readiness and episode counts may change only if the shared
   deterministic fixture model truthfully defines that local-record transition;
   they must never imply an artifact exists.
9. Every new visible control must either perform its bounded local-state action
   or remain unavailable with a readable reason. No dead success controls.

## Truthful request and import model

- Use deterministic session-local fixtures only. Do not use pasted screenplay
  text, AI, MCP, Codex, providers, network, browser automation, clipboard,
  native pickers, drag/drop bytes, File/Blob reads, filesystem, host adapters,
  workers, or persistence.
- Expected views/layers are request instructions, not verified asset structure.
- A reference attachment row is descriptive planning metadata, not an attached
  file or content-addressed artifact.
- `Duplicate` is a deterministic fixture collision, not a byte/hash comparison.
- `Wrong format` is declared local demo metadata, not media sniffing or decoding.
- Source and license fields are creator-entered local UI text. They do not prove
  provenance, ownership, permission, or legal sufficiency.
- Candidate acceptance means only explicit admission of a local descriptive
  record to later review. It is not asset approval or production promotion.
- Error and cancel paths must preserve the exact previously accepted workspace
  state and must not increment counts or change unrelated records.

## State, keyboard, and accessibility requirements

- New controls are keyboard reachable in logical DOM order, have visible focus,
  explicit labels, and selected/current/invalid semantics beyond color.
- Do not introduce nested interactive controls, pointer-only drop behavior,
  modal focus loss, or status communicated only by a badge or toast.
- If a dialog or confirmation sheet is used, focus enters deliberately, Escape
  or Cancel restores focus to the invoker, and invalid submission moves focus or
  association to readable errors.
- Scene/category/requirement changes must close or safely rebind transient request
  and import state; never retain a hidden candidate from another scope.
- The complete responsive/reduced-motion/accessibility gate remains F4-WP5, but
  this package must avoid obvious overflow, clipped fields, unreachable actions,
  and focus traps at 1440x900.

## Allowed files

- Existing Product v1 modules under `apps/studio/src/product-v1/**`, only as
  needed for this package.
- Narrow new Product v1 request/import fixture, model, and component modules
  under `apps/studio/src/product-v1/**`.
- Focused Product v1 tests under `apps/studio/src/product-v1/**`.
- `apps/studio/src/App.test.tsx` only for surgical connection to the standard
  Studio suite; avoid whole-file formatting.
- `apps/studio/src/styles.css` only for this bounded Product v1 surface.
- One narrowly named F4-WP3 browser-evidence script under
  `apps/studio/scripts/**`.
- Package evidence and one exact handback under
  `reports/agent-handoffs/2026-07-22-kimi-f4-wp3-image-request-import-ux/**`.

Do not modify the legacy production AssetExchange/Assets screen in
`apps/studio/src/App.tsx`, package manifests/lockfiles, roadmap/status,
coordination inbox, production contracts, story engine, desktop host,
Codex/App Server/MCP runtime, workers, Godot, Remotion, assets, audio,
persistence, rendering, export, or backend code.

## Non-goals

No ChatGPT website control, browser opening, API key/token/cookie/credential UI,
provider call, background generation, real prompt copy, real download, real file
picker, File/Blob or drag/drop byte access, filesystem write, content hashing,
media decoding, duplicate detection from bytes, upload, automatic approval,
asset promotion, layer/rig inspection, slicing, pivots, masks, sockets,
expressions, visemes, Godot scene, Remotion composition, animation, render,
export, packaging, F4-WP4, backend implementation, or private-launch claim.

## Required tests and checks

- Pure/model tests for request-pack scope, prompt/reference/view/layer inventory,
  every declared workflow state, valid transitions, and fail-closed invalid or
  stale transitions.
- Tests proving duplicate/wrong-format/missing-source/missing-license/generic
  error and cancellation paths never create a candidate or mutate unrelated
  scene/readiness state.
- Tests proving explicit confirmation is required, invalid metadata disables it,
  and a confirmed result is labelled only as a local candidate record.
- Integration tests proving scene/category/requirement/list/detail remain
  synchronized when request/import state opens, cancels, errors, confirms, or
  is invalidated by a scope change.
- Truth tests proving no credential fields, real-file claims, generation/import
  success claims, or approval/production labels appear.
- Keyboard/focus tests for the primary request path, error recovery, confirmation,
  cancellation, and restoration to the invoker.
- Keep all regressions connected to `pnpm --filter @storystage/studio test`.
- Run Studio test, typecheck, production build, lint for touched files, and
  repository-root `pnpm verify`.
- Preserve any exact unchanged hosted timeout evidence; never conceal or relabel
  a product failure as infrastructure noise.

## Required browser evidence

- Attach console warning/error and `pageerror` listeners before navigation.
- Exercise the real Product v1 Projects -> Create -> Studio -> Assets & Rigs
  route at 1440x900.
- Capture the scene-scoped request-pack preview with references and expected
  views/layers; import/drop pending or metadata review; wrong-format or duplicate
  error; missing source/license validation; cancellation with unchanged prior
  state; confirmation review; confirmed local candidate disclaimer; and one
  visible keyboard-focus state.
- Prove there are no credential fields and no visible real-file, generation,
  upload, approval, or production-success claims.
- Record zero console warnings/errors and page errors plus no horizontal document
  overflow. Hash all screenshots and the machine-readable click-through report.

## Handback and stop condition

Commit and push the exact required branch. Open one draft PR to `product/v1`.
Publish one immutable handback containing exact base, implementation SHA,
handback tip SHA, changed files, diff stat, commands/results, evidence paths and
hashes, truth boundaries, limitations, visible-control state inventory, and all
preserved failures/retries. Use the established two-commit handback protocol so
the implementation/evidence SHA is immutable and the handback tip contains only
the truthful report. Post the issue handback, then exit without polling.

Stop before F4-WP4, layer/rig review, real files/providers, production approval,
persistence, backend, Godot, Remotion, rendering, export, packaging, or private
launch. Completion of this package does not accept F4.
