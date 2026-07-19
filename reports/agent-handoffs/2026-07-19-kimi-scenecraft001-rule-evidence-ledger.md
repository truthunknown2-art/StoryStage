# [KIMI] SCENECRAFT-001 — Scene Craft v1.1 rule & evidence ledger handback

Task: `KIMI-SCENECRAFT-V11-EVIDENCE-LEDGER` (active instruction: **inbox Version 21**)
Work branch: `agent/kimi-scenecraft-v11-evidence-ledger`
Exact base SHA: `c7618f06c96bd52a866e87dadaaea7a4cf991e4c`
Exact implementation commit A SHA: `799546f`
Milestone: `SCENECRAFT-001` (documentation/evidence layer only)

This handback is commit B of the two-commit protocol: commit A (`799546f`) carries the corrected canonical editorial documents; this commit records the recomputed audit and exact metadata. The non-circular record of handback head B is the updated PR #22 body.

## Canonical deliverables

1. `docs/editorial/scene-craft-rule-ledger-v1.md` — canonical numbered Markdown ledger: **43 rules**, stable contiguous classification-free IDs `SC-001`–`SC-043`, every rule stating all **17** required fields directly (rule ID, plain-language principle, domain, grammar scope, enforcement class, evaluation window, minimum sample requirement, semantic exception codes, evidence source path, exact Git blob and/or 64-character file-content SHA-256, evidence kind, measured sample size, confidence, current calibration status, future consumer, implementation owner, notes/rationale), plus a 12-artifact source & evidence registry as additional context.
2. `docs/editorial/scene-craft-v1.1.md` — narrative at the exact draft status (_Draft editorial knowledge base; non-normative until rule classification, evidence mapping, and pilot calibration are accepted_), canonical ledger link, explicit no-authority statement, and the exact binding spaced vocabulary in its type block, prose, and ledger-rule lines (zero hyphenated variants).
3. This handback at the required path.

## Exact counts (mechanically derived from the final ledger)

- Enforcement classes: **15 hard invariant, 14 planner prior, 12 hypothesis, 2 example only** (`warning` and `information` appear zero times).
- Evidence kinds: **25 established editorial practice, 3 project regression, 13 unvalidated hypothesis, 2 worked example** (SC-039 treatment, SC-040 rubric).
- **Zero rules claim measured-reference support for an exact StoryStage number.**
- Low confidence / uncalibrated (15): SC-024, SC-025, SC-026, SC-027, SC-028, SC-029, SC-030, SC-031, SC-032, SC-033, SC-034, SC-035, SC-036, SC-037, SC-039.

## v1 claims softened or demoted

- **Softened:** "exactly one job per shot" → mechanical rejection only for no/contradictory purpose or unsatisfiable envelope (SC-010) + purpose vocabulary (SC-011); compound camera restriction → declared-reason permission (SC-015, with the v1 phrasing recorded as a superseded preference in SC-034 without repeating its blocking token); universal identical-pose dissolve restriction → hypothesis with semantic exceptions (SC-032); cue-per-event density → requested-cue synchronization only (SC-022); fixed four-shot reveal → importance-scaled palette (SC-019).
- **Demoted to hypothesis (low confidence, pending blind pilot):** all inherited v1 numerics — 8–16 frames, CV 0.15, 3× improvement, four/six-second limits, gesture counts, reveal counts, percentage mixes, 15 shots (the 15 rows listed above).
- **Retained with evidence (measured):** none; no evidence was invented or upgraded.
- **Removed outright:** none — every claim is classified live, recorded as superseded (SC-034), or demoted.

## Mechanical audit (recomputed at commit A `799546f`)

- **IDs:** 43 unique, contiguous `SC-001`–`SC-043` (no gaps, no extras).
- **Fields:** 43 × 17 required fields — 0 missing.
- **Per-rule evidence:** every row carries exact repository path plus full Git blob and/or full 64-character SHA-256; both unique SHA-256 citations recompute exactly from the referenced bytes (including the amendment bytes recomputed from provenance commit `3f07a61`); all cited paths verified present (coordination-branch sources verified from `0a4f25d` / `3f07a61`).
- **Vocabulary:** only exact allowed values — enforcement `hard invariant / planner prior / hypothesis / example only`; evidence kinds `established editorial practice / project regression / unvalidated hypothesis / worked example`; zero hyphenated variants in either canonical document.
- **Blocking tokens:** zero hits across all soft rows (`never`, `prohibited`, `rejected`, `fails`, `banned`, `must reject`).
- **Handback counts equal ledger counts** (this file's numbers are the audit's numbers).
- **Files changed from base:** exactly the three canonical documentation files (the v18-era JSON and nested handback were added and removed within branch history and net to absent).

## Changed files (since base `c7618f0`)

- `docs/editorial/scene-craft-rule-ledger-v1.md` (created)
- `docs/editorial/scene-craft-v1.1.md` (modified)
- `reports/agent-handoffs/2026-07-19-kimi-scenecraft001-rule-evidence-ledger.md` (created)

## Unresolved questions

1. Which blind-pilot schedule will calibrate the 15 unvalidated numeric rows (none exists yet; rows wait).
2. Whether any reference-analysis artifact should ever map to exact StoryStage numbers — zero rules claim this today; needs a Pro/Codex ruling first.
3. Storylight external-intent examples: deliberately not started; they wait for the exact accepted Editorial Director contract head and a frozen host-issued pilot planning request with clause references.
4. Whether the two project-regression hard invariants (SC-007, SC-038) should later gain an approved smear-drawing style capability (recorded only as an exception code).

## Commands and results

| Command                                                                                                                                                                                            | Result          |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| `corepack pnpm exec prettier --check docs/editorial/scene-craft-v1.1.md docs/editorial/scene-craft-rule-ledger-v1.md reports/agent-handoffs/2026-07-19-kimi-scenecraft001-rule-evidence-ledger.md` | clean           |
| `git diff --check`                                                                                                                                                                                 | clean           |
| Mechanical audit (above)                                                                                                                                                                           | all checks pass |

## Limitations

1. The ledger is classification, not measurement: 15 numeric claims sit at low confidence pending blind-pilot calibration; none were upgraded.
2. Reference-analysis JSONs are registered as `measured reference` sources at registry level, but no rule is marked `measured reference` — none directly measures an exact StoryStage threshold.
3. Project regression evidence proves the specific observed failures in one 30s render (gesture repeat, smear ghosting); it does not prove universal numeric thresholds.
4. Storylight external-intent examples are deliberately absent pending the exact accepted Editorial Director contract head and a frozen host-issued pilot planning request with clause references.
5. The superseded v18 JSON and nested handback remain only in branch history for traceability; they are not part of the accepted output.

## No code or authority changed

Documentation and evidence classification only: no TypeScript, schema, validator, quality-report, grammar-profile, Show Pack, runtime, worker, UI, audio, provider/model prompt, motion, asset requirement, EditorialTargets value, or production gate was added or modified. Reason and exception codes remain editorial vocabulary, not schemas or compiler contracts.

## Integration instructions

Base `c7618f0` → implementation commit A `799546f` → handback commit B (this commit). Draft PR #22 targets `agent/kcast001-provider-neutral-rig`; its body names implementation A, handback head B, the three canonical files, exact counts, and current tests. Do not merge — Codex and Pro review the immutable head.
