# [KIMI] SCENECRAFT-001 — Scene Craft v1.1 rule & evidence ledger handback

Task: `KIMI-SCENECRAFT-V11-EVIDENCE-LEDGER` (inbox v18 → v19; v19's binding Markdown format supersedes the v18 JSON-first deliverable)
Work branch: `agent/kimi-scenecraft-v11-evidence-ledger`
Exact base: `c7618f06c96bd52a866e87dadaaea7a4cf991e4c` (PR #17 merged)
Exact head at handback: `7171036` (v18 JSON, superseded) → this commit (v19 format)
Milestone: `SCENECRAFT-001` (documentation/evidence layer only)

## What was delivered

1. **`docs/editorial/scene-craft-v1.1.md`** — status set to the v19 wording ("Draft editorial knowledge base; non-normative until rule classification, evidence mapping, and pilot calibration are accepted"); every candidate principle/number/example linked to ledger rule IDs (`SC-###`); explicit statement that it grants no planning, timing, rig, capability, render, audio, export, or production authority; accepted principles preserved without universal-law phrasing.
2. **`docs/editorial/scene-craft-rule-ledger-v1.md`** — the numbered Markdown rule/evidence ledger: 43 rules with stable, classification-free IDs and all 19 required fields per row (rule ID, plain-language principle, domain, grammar scope, enforcement class, evaluation window, minimum sample requirement, semantic exception codes, evidence source path, exact Git blob and/or 64-char file-content SHA-256, evidence kind, measured sample size, confidence, current calibration status, future consumer, implementation owner, notes/rationale). A 12-artifact source & evidence registry carries exact paths, commits/blobs as provenance, independently computed SHA-256 of file bytes, and explicit can/cannot-support statements. Soft rows deliberately avoid blocking language; only hard invariants may block.
3. This handback at the required path.

The superseded v18 JSON deliverable (`scene-craft-v1.1-rule-ledger.json`) and its handback directory were removed in this commit; all content was carried forward into the v19 format.

## Rule counts

- **43 rules total.** By enforcement class: **15 hard invariant, 14 planner prior, 12 hypothesis, 2 example only** (no row needed `warning`/`information`; future graded findings stay hypotheses with minimum samples and exception codes).
- By evidence kind: **27 established editorial practice, 4 unvalidated-hypothesis-class rows citing project regression observations (2) or measured-reference sources registered (0 claimed by rules), 13 unvalidated hypothesis, 1 worked example.** Precisely: established editorial practice 27, project regression 2, unvalidated hypothesis 13, worked example 1. **Zero rules claim measured-reference support for an exact StoryStage number.**
- **Low confidence / uncalibrated (15):** SC-024 (8–16f hold), SC-025 (CV 0.15), SC-026 (4s static idea), SC-027 (6s gesture repeat / six gestures), SC-028 (same-size streaks), SC-029 (3-of-4 reveal), SC-030 (25/40/25/10 mix), SC-031 (80% hard cuts), SC-032 (dissolve 8–16f pose change), SC-033 (wipe 6–10f), SC-034 (never stack push+pan — recorded as superseded), SC-035 (pose evolution 1–2s), SC-036 (gaze offsets 2–4f), SC-037 (blink 2.5–4.5s), SC-039 (15 shots/30s).

## v1 claims softened, removed, or demoted

- **Softened:** "exactly one job per shot" → mechanical rejection only for no/contradictory purpose or unsatisfiable envelope (SC-010) plus purpose vocabulary (SC-011); "never stack push+pan" → declared-reason compound permission (SC-015, with SC-034 recorded as superseded); "universal identical-pose dissolve ban" → hypothesis with semantic exceptions (SC-032); "cue per footfall/reveal/whoosh" → requested-cue synchronization only (SC-022); "fixed four-shot reveal" → importance-scaled palette (SC-019); "cue density requirement" → editorial choice (SC-022).
- **Demoted to hypothesis (low confidence, pending blind pilot):** all inherited v1 numerics — 8–16 frames, CV 0.15, 3× improvement, four/six-second limits, gesture counts, reveal counts, percentage mixes, 15 shots (SC-024–SC-033, SC-035–SC-037, SC-039).
- **Retained with evidence (measured):** none. No numeric claim has exact supporting evidence in this repository, and none was invented.
- **Removed outright:** none — every claim is either classified live, recorded as superseded (SC-034), or demoted.

## Unresolved questions

1. Which blind-pilot schedule will calibrate the 15 unvalidated numeric rows (no calibration source exists yet; rows wait).
2. Whether any reference-analysis artifact should ever map to exact StoryStage numbers — currently zero rules claim this; needs a Pro/Codex ruling before any measured-reference usage.
3. Storylight external-intent examples: deliberately not started; they wait for the exact accepted Editorial Director contract head and a frozen host-issued pilot planning request with clause references.
4. Whether the two project-regression hard invariants (SC-007, SC-038) should gain an approved smear-drawing style capability later (recorded as an exception code, not a capability).

## Commands and results

| Command                                                                                                                                                                                            | Result                                                |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `corepack pnpm exec prettier --check docs/editorial/scene-craft-v1.1.md docs/editorial/scene-craft-rule-ledger-v1.md reports/agent-handoffs/2026-07-19-kimi-scenecraft001-rule-evidence-ledger.md` | clean                                                 |
| `git diff --check`                                                                                                                                                                                 | clean                                                 |
| Structure audit (`grep -c "^### SC-"`)                                                                                                                                                             | **43 rules**, all with stable classification-free IDs |

## No code or authority changed

This task is documentation and evidence classification only: no TypeScript, schema, validator, quality-report, grammar-profile, Show Pack, runtime, worker, UI, audio, provider/model prompt, motion, asset requirement, EditorialTargets value, or production gate was added or modified. Reason and exception codes remain editorial vocabulary, not schemas or compiler contracts.

## Integration instructions

Branch holds the v19-format ledger on top of the accepted merge `c7618f0` (superseded v18 JSON commits remain in history for traceability). Draft PR #22 targets `agent/kcast001-provider-neutral-rig`. Do not merge — Codex and Pro review the immutable head. Codex will decide later whether any accepted ledger entry becomes compiler, continuity, quality-report, capability, or planner behavior.
