# ADR-EDI-001: AI Editorial Director — filling the `DirectorPlanner` judgment seam

- **Status:** Proposal — for Pro acceptance and Codex feasibility review
- **Author:** Kimi (frontend / visual-performance / animation-direction lane)
- **Date:** 2026-07-19
- **Lane note:** This is a proposal document only. It changes no contracts, compilers, or product code. Ownership lines from `KIMI_START_HERE.md` are preserved: Codex owns canonical plans, timing, continuity, and validation; this ADR proposes *who writes the first draft*, not who holds authority.

---

## 1. Context and problem

StoryStage turns a screenplay into a video. Every layer of the stack has a designed authority except one: **editorial judgment** — the decisions that make a video "look good cut to cut." Today those decisions are made by deterministic lookup tables:

- Script → beats: regex sentence/clause splitting + keyword role classification (`cv002-story-draft.ts:186-195`).
- Role → shot size: fixed table — reaction → close-up, action → wide, else medium (`cv002-story-draft.ts:249-288`). Same role ⇒ same framing, every occurrence.
- Beat → shot is 1:1; exactly one beat per episode may receive a second shot (`director-compiler.ts:466-467`).
- Composition variety is mechanical rotation: focal region `globalIndex % 3`, facing `% 2` (`director-compiler.ts:631-635, 724-728`) — visibly repetitive within the first minute.
- Shot duration is a word-count formula (`director-compiler.ts:149-169`); cut placement is a linear cursor (`director-compiler.ts:804-840`).
- Camera/transition `motivation` strings are templates generated *after* the decision — labels, not reasons (`director-compiler.ts:692-697`).
- The measured reference analyses (`docs/reference-analysis/*.json`, shot mixes, cadences, "no static idea > 4s") are not consumed by the canonical path.
- `quality-report.ts` detects repetition (repeated shot signature, repeated camera move, centered staging >75%, duration CV < 0.06) but is advisory-only and never triggers re-planning.
- Evidence the ceiling is real: the best output so far (`kids-showcase-director-timeline.ts`) is a hand-authored 900-frame timeline. Heuristic output has never matched it.

There is **no AI judgment anywhere in the directing loop**. The integration point already exists and is empty: `DirectorPlanner.propose()` (`director-proposal.ts:106-118`) passes the regex-derived draft through unchanged, and `directorProposalDraftSchema` is documented as *"AI-judgment boundary. A future GPT/Codex skill emits this draft contract"* (`director-proposal.ts:66-67`).

## 2. Decision (proposed)

Introduce an **AI Editorial Director**: a planner-side agent (GPT-class model; initially operated by Kimi or ChatGPT in the agent loop, later via API) that emits the existing `directorProposalDraftSchema` — **AI proposes, deterministic code disposes.**

The deterministic compiler remains the sole authority: it validates, clamps, or rejects every AI proposal against timing envelopes, continuity rules, axis/grammar constraints, and capability resolution before anything is sealed and hashed. The AI never touches frames, timing solutions, world state, or hashes. If the AI output fails validation, the system falls back to today's heuristic draft — the pipeline can never be broken by a bad proposal, only unimproved.

## 3. What the AI proposes (and what it may never decide)

**In scope for the proposal draft:**

1. **Shot coverage per beat (1:n).** Replace the 1:1 beat→shot rule. Dialogue beats get coverage: speaker shot, listener reaction shot, optional two-shot. Action beats get cut-on-action splits. Reveal beats get insert coverage of the story-relevant prop. The current one-multi-shot-beat-per-episode cap is removed *for proposals*; the validator enforces per-scene coverage budgets.
2. **Shot sizes with stated reasons.** Each shot's framing carries a short `rationale` string written by the AI (e.g. "close-up: emotional peak of the episode; hold 12f longer than cadence"). Reasons are auditable by Preston/Pro — motivation stops being a template and becomes testimony.
3. **Pacing intent per scene.** A per-scene `energyCurve` (rising/peak/falling/breather) that modulates shot durations *within* the existing timing envelopes — the episode breathes instead of metronoming.
4. **Camera and transition motivation.** Camera moves and transitions proposed from story logic (tension rising → slow push; POV shift → match cut), validated against grammar profiles and `continuity-rules.ts`.
5. **Variety constraints as input, not rotation.** The planner receives the last N shots' signatures and the reference-mix targets (§4) and must *justify* repeats rather than being forbidden them (a deliberate triple close-up can be right — with a reason).

**Out of scope (unchanged authority):** final frame numbers, timing solution, continuity/world state, camera/transition sample compilation, asset authority, hashing/sealing, capability declarations. The AI writes prose-constrained intent; Codex's compiler turns valid intent into exact samples exactly as it does today.

## 4. Machine-readable editorial targets

Promote `docs/reference-analysis/*.json` + `REFERENCE-DIRECTION-STUDY.md` from prose to a versioned, code-consumed **EditorialTargets** artifact per grammar profile:

- shot-size mix (kids ≈ 25/40/25/10), cadence windows (kids 2.5–5s beats, history 1.2–3.0s), max static-idea duration (4s), transition vocabulary frequencies, gesture/pose-change rates.
- Consumed in two places: (a) injected into the AI planner's context as hard targets; (b) checked by the validator, so a plan that drifts from the measured grammar is flagged whether a human, a table, or an AI proposed it.

## 5. Closing the loop: quality-report becomes a re-plan trigger

1. Compile → run `quality-report.ts` (extended with: shot-size streaks, camera-move streaks, focal-rotation detection, duration-CV floor).
2. Findings become **structured planner feedback** ("shots 4-6 all medium/locked/center — vary framing or justify"), and the AI revises once (bounded: max 2 rounds, then heuristic fallback + human flag).
3. Severity gate: mechanical failures (envelope violations) block; taste findings route to Preston's review with the AI's rationale attached. Nothing ships silently worse than the heuristic baseline.

## 6. Scaling to 5–20 minute episodes

Editorial judgment is the prerequisite, but structure follows:

1. **Hierarchical ingest:** screenplay → episode → sequences → scenes → beats (slugline/action/dialogue parsing; cast and location tracking across scenes). Replaces the 100–300-word paragraph window (`director-compiler.ts:104-108`, `cv002-story-draft.ts:221-223`).
2. **Scene-scoped planning:** the AI plans per sequence with episode-level arc context (act position, tension budget), keeping prompts small and rationales local.
3. **Guide-voice first:** TTS narration becomes the master clock (the reference study: *"lyric/narration clause is the master clock"*) — shot durations derive from audio, cuts land on clause boundaries, J/L cuts become possible. This also unblocks real visemes and captions.
4. Render and continuity already scale in principle (frame-evaluated, episode-wide world state); chunked render/stitch is engineering work, not design work.

## 7. Pilot experiment (acceptance test for this ADR)

One fixed episode script (the existing Ollo "Storylight in the Little Wood" sample), rendered twice from the same assets:

- **Cut A:** current heuristic planner output.
- **Cut B:** AI-proposed draft through the identical validator/compiler path.

Compare blind (Preston + Pro): shot-mix distribution vs reference targets, quality-report finding counts, and a simple verdict — "which cut would you publish?" Success criterion: Cut B is preferred and produces **fewer** quality findings with **zero** contract violations. Cost: one planner invocation + one render; no new infrastructure.

## 8. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Non-determinism enters the canonical pipeline | AI output is an *input document*, validated and sealed like any human override; the sealed plan + rationale are hashed and replayable. Same input ⇒ same output, forever. |
| AI proposes impossible/invalid plans | Fail-closed validation with heuristic fallback; invalid proposals are logged as evidence, never silently repaired. |
| Cost/latency per episode | Planning is once per episode draft (seconds), not per frame; revisions bounded to 2 rounds. |
| Taste disputes | Every AI decision carries a rationale; Preston is final creative authority with a visible diff against the heuristic baseline. |
| Scope creep into Codex authority | ADR explicitly forbids proposal fields outside the existing draft schema; any new field requires its own ADR. |

## 9. Ownership summary (unchanged)

- **Codex:** validator extensions, EditorialTargets consumption, compiler/timing/continuity authority, fallback path, merge authority.
- **Kimi:** this proposal, pilot planner operation, rationale/readability UX (showing *why* a shot was chosen in the Director panel — a future Studio slice), reference-target encoding.
- **Pro:** acceptance of this ADR, pilot verdict rubric, final integration audit.
- **Preston:** blind pilot verdict; final creative authority.

## 10. Immediate asks

1. Pro: accept/reject this ADR; if accepted, name the pilot episode and verdict rubric.
2. Codex: feasibility review of the `DirectorPlanner` seam for an external draft source (schema sufficiency; validation gaps to close before any AI draft is accepted).
3. Preston: confirm the pilot script (recommend the current Ollo sample for comparability).
