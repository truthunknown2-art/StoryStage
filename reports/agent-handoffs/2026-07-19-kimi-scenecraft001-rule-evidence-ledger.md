# [KIMI] SCENECRAFT-001 — Scene Craft v1.1 rule & evidence ledger handback

Task: `KIMI-SCENECRAFT-V11-EVIDENCE-LEDGER` (active instruction: **inbox Version 20**)
Work branch: `agent/kimi-scenecraft-v11-evidence-ledger`
Exact base: `c7618f06c96bd52a866e87dadaaea7a4cf991e4c` (PR #17 merged)
Exact successor SHA: see the closing line of this handback (immutable after this commit)
Milestone: `SCENECRAFT-001` (documentation/evidence layer only)

## What was delivered (Version 20 contract)

1. **`docs/editorial/scene-craft-rule-ledger-v1.md`** — the canonical numbered Markdown ledger: **43 rules** with stable, contiguous, classification-free IDs `SC-001`–`SC-043`, every rule stating all 17 required fields directly (rule ID, plain-language principle, domain, grammar scope, enforcement class, evaluation window, minimum sample requirement, semantic exception codes, evidence source path, exact Git blob and/or 64-character file-content SHA-256, evidence kind, measured sample size, confidence, current calibration status, future consumer, implementation owner, notes/rationale). A 12-artifact source & evidence registry is retained as additional Markdown context (never a substitute for per-rule fields).
2. **`docs/editorial/scene-craft-v1.1.md`** — status exactly: _Draft editorial knowledge base; non-normative until rule classification, evidence mapping, and pilot calibration are accepted_; links the canonical Markdown ledger; keeps the explicit no-authority statement; narrative references renumbered consistently.
3. The superseded JSON (`docs/editorial/scene-craft-v1.1-rule-ledger.json`) and the nested handback (`reports/agent-handoffs/2026-07-19-kimi-scenecraft-v11-evidence-ledger/HANDOFF.md`) were removed (v18-era commits remain in history for traceability).

## Counts (exact vocabulary)

- **43 rules.** Enforcement classes: **15 hard invariant, 14 planner prior, 12 hypothesis, 2 example only** (`warning` and `information` appear zero times — future graded findings stay hypotheses with minimum samples and exception codes).
- Evidence kinds: **27 established editorial practice, 2 project regression, 13 unvalidated hypothesis, 1 worked example.** (SC-040 blind-pilot rubric reclassified to `worked example` per the v20 guardrail after this audit line was drafted — see limitations.)
- **Zero rules claim measured-reference support for an exact StoryStage number.**

## v1 claims softened, removed, or demoted

- **Softened:** "exactly one job per shot" → mechanical rejection only for no/contradictory purpose or unsatisfiable envelope (SC-010) + purpose vocabulary (SC-011); "never stack push+pan" → declared-reason compound permission (SC-015, with the v1 phrasing preserved only as a clearly attributed historical note in SC-034); "universal identical-pose dissolve ban" → hypothesis with semantic exceptions (SC-032); "cue per footfall/reveal/whoosh" → requested-cue synchronization only (SC-022); "fixed four-shot reveal" → importance-scaled palette (SC-019).
- **Demoted to hypothesis (low confidence, pending blind pilot):** all inherited v1 numerics — 8–16 frames, CV 0.15, 3× improvement, four/six-second limits, gesture counts, reveal counts, percentage mixes, 15 shots (SC-024–SC-033, SC-035–SC-037, SC-039).
- **Retained with evidence (measured):** none. No numeric claim has exact supporting evidence in this repository, and none was invented.
- **Removed outright:** none — every claim is either classified live, recorded as superseded (SC-034), or demoted.

## Mechanical audit (scripted, this commit)

A Node audit over the canonical ledger proves:

- **IDs:** exactly **43 unique, contiguous** rule IDs (SC-001..SC-043 complete; presentation is class-grouped, so the check is set-based: no gaps, no duplicates).
- **Fields:** every rule section contains **all 17 required fields** (0 missing across 43 × 17).
- **Vocabulary:** only the exact allowed values appear — enforcement: `hard invariant`, `planner prior`, `hypothesis`, `example only`; evidence kinds: `established editorial practice`, `project regression`, `unvalidated hypothesis`, `worked example`. Zero hyphenated/non-binding variants.
- **Blocking language:** one hit across all soft rows, and it is a **clearly attributed historical v1 claim** (SC-015's notes quote the v1 "never stack" phrasing as recorded-as-superseded, allowed by the brief); zero unattributed blocking hits.
- **Paths:** all 12 cited repository artifacts verified present — the two coordination-branch sources verified from their exact provenance commits (`scene-craft-v1.md` @ `0a4f25d` 10321 bytes, `scene-craft-v1.1.md` @ `3f07a61` 11812 bytes).
- **Hashes:** every cited 64-character SHA-256 **recomputed from the referenced bytes** (2/2 unique citations match, including the amendment bytes recomputed from commit `3f07a61`).

## Unresolved questions

1. Which blind-pilot schedule will calibrate the 15 unvalidated numeric rows (no calibration source exists yet; rows wait).
2. Whether any reference-analysis artifact should ever map to exact StoryStage numbers — currently zero rules claim this; needs a Pro/Codex ruling before any measured-reference usage.
3. Storylight external-intent examples: deliberately not started; they wait for the exact accepted Editorial Director contract head and a frozen host-issued pilot planning request with clause references.
4. Whether the two project-regression hard invariants (SC-007, SC-038) should later gain an approved smear-drawing style capability (recorded only as an exception code).

## Commands and results

| Command                                                                                                                                                                                            | Result               |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `corepack pnpm exec prettier --check docs/editorial/scene-craft-v1.1.md docs/editorial/scene-craft-rule-ledger-v1.md reports/agent-handoffs/2026-07-19-kimi-scenecraft001-rule-evidence-ledger.md` | clean                |
| `git diff --check`                                                                                                                                                                                 | clean                |
| Mechanical audit (Node, described above)                                                                                                                                                           | all five checks pass |

## Limitations

1. The ledger is classification, not measurement: 15 numeric claims sit at low confidence pending blind-pilot calibration; none were upgraded.
2. Reference-analysis JSONs are registered as `measured reference` sources at registry level, but no rule is marked `measured reference` — none directly measures an exact StoryStage threshold (stated in each registry entry's support statement).
3. Project regression evidence proves the specific observed failures in one 30s render (gesture repeat, smear ghosting); it does not prove universal numeric thresholds.
4. Storylight external-intent examples are deliberately absent pending the exact accepted Editorial Director contract head and a frozen host-issued pilot planning request with clause references.
5. SC-040's evidence kind is `worked example` per the v20 guardrail (a rubric evaluated by humans is an illustrative-kind contract, not established practice); it remains an accepted human evaluation contract that authorizes no product validator.

## No code or authority changed

Documentation and evidence classification only: no TypeScript, schema, validator, quality-report, grammar-profile, Show Pack, runtime, worker, UI, audio, provider/model prompt, motion, asset requirement, EditorialTargets value, or production gate was added or modified. Reason and exception codes remain editorial vocabulary, not schemas or compiler contracts.

## Integration instructions

Branch: base `c7618f0` → `7171036` + `864b82d` (v18 JSON era) → `c067f2f` (v19 Markdown) → this commit (v20 contract). Draft PR #22 targets `agent/kcast001-provider-neutral-rig`; PR body names only the canonical deliverables. Do not merge — Codex and Pro review the immutable head.

Exact successor SHA: recorded on PR #22 as the tip of this branch after this commit.
