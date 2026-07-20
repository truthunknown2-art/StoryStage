# StoryStage operating contract

Read [`CODEX_START_HERE.md`](CODEX_START_HERE.md) before changing this
repository. It routes the binding product plan, complete implementation roadmap,
and live remote status. GitHub is the source of truth; chat history, a Codex
goal, local-only worktrees, and old proof branches are not.

## Current phase

Do not hard-code the active phase in this file. After fetching, read
`origin/product/v1:docs/ROADMAP_STATUS.md`. Read the highest-version Kimi inbox
from `origin/agent/kimi-frontend` only when that status names Kimi as owner, as
specified by `CODEX_START_HERE.md`.

Only one phase and one ticket per agent may be active. A finished ticket does
not authorize the next ticket. Backend product work remains blocked until
Preston accepts the Frontend Gate after F6.

If a request conflicts with the active phase, ownership, allowed files, or
acceptance gate, stop and report the conflict. Do not improvise a second
workstream.

## Team ownership

- **Preston:** product owner and final acceptance authority.
- **Kimi:** `apps/studio` frontend, UI/UX, responsive behavior, and frontend
  tests on the branch named in its current inbox brief.
- **Codex:** contracts, story/director engine, desktop host, asset/audio workers,
  Remotion runtime, Godot/render workers, integration, and Kimi review. During
  F1–F6, Codex changes frontend only to review or correct an accepted ticket—not
  to start a competing design.
- **ChatGPT Pro:** milestone audit of actual screenshots, click-throughs, audio,
  or renders. Pro advises; it does not silently change the roadmap.

## Required work loop

1. Fetch Git and read this file, `CODEX_START_HERE.md`,
   `docs/PRODUCT_PLAN.md`, `docs/PRODUCT_ROADMAP.md`, the live remote status,
   and the active ticket.
2. State the active phase, owner, visible deliverable, exact base, allowed files,
   and non-goals.
3. Make the smallest change that satisfies that ticket.
4. Run the ticket's tests and capture its required visible/audible evidence.
5. Commit and push the exact branch; report SHA, files, tests, evidence, and
   limitations.
6. Stop. The next package requires a new ticket and gate decision where
   specified.

No “while I’m here” work. No silent rollover into the next package.

## Subagent model routing

The unattended root default is **GPT-5.6 Sol Medium**. Root-model selection
remains a user setting; Codex routes bounded subagents as follows:

- **Sol High/XHigh:** difficult planning, architecture decisions, hard
  debugging, visual-quality review, and phase-gate audits.
- **Terra Low/Medium:** repository scans, test/log analysis, mechanical edits,
  and other routine bounded work.
- **Sol Ultra:** only when an important planning or audit task genuinely splits
  into independent parallel reviews.
- **Root Sol Medium:** ordinary scoped implementation and integration.

Use the lowest effort that reliably completes the bounded task. Never assign an
agent an open-ended instruction such as “keep building StoryStage.” Every task
needs one deliverable, explicit non-goals, and a return condition.

## Product and architecture boundaries

- StoryStage is a directable animation studio, not a one-click generated-video
  service.
- Creator-facing product surfaces are only **Projects → Create → Studio**.
- `packages/contracts` is shared vocabulary, not fixtures.
- `packages/remotion-runtime` remains deterministic and browser-safe.
- Godot is the pinned articulated 2D performance worker; Remotion remains the
  single canonical episode compositor.
- `apps/render-worker` owns rendering and output creation.
- `apps/desktop` owns privileged orchestration and local persistence.
- `apps/studio` remains an unprivileged frontend using typed host adapters.
- AI may propose bounded creative intent. Deterministic code owns timing,
  continuity, assets, capabilities, rendering, and saved project state.

## Anti-overengineering rules

- No new schema unless the active approved UI operation needs missing data.
- No new demo app, proof composition, preview path, or framework during product
  phases.
- No backend product work before the Frontend Gate.
- No second art grammar before the Kids workflow passes its pilot gate.
- No Blender/After Effects automation until a real approved shot requires it.
- No accounts, collaboration, cloud sync, billing, marketplace, or generic
  Adobe clone.
- No engineering hashes, evidence ledgers, or approval jargon in the normal
  creator UI.
- No visible control may pretend generation, recording, upload, rendering, or
  export succeeded.

**Accepted historical exception:** E0 in `docs/PRODUCT_PLAN.md` proved the
Godot/Remotion seam. It does not authorize B1/B2, Product v1 integration, or a
second engine experiment.

## Definition of done

A ticket is done only when its user-visible result works, scoped checks pass,
evidence is captured, and the exact commit is pushed. A phase is done only when
its gate in `docs/PRODUCT_ROADMAP.md` passes and the live status records the
accepted exact SHA. Technical groundwork without a visible result is not phase
completion.
