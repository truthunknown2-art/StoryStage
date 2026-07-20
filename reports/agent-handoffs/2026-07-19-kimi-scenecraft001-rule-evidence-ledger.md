# [KIMI] SCENECRAFT-001 — Scene Craft v1.1 rule & evidence ledger handback

Task: `KIMI-SCENECRAFT-V11-EVIDENCE-LEDGER` (active instruction: **inbox Version 22**)
Work branch: `agent/kimi-scenecraft-v11-evidence-ledger`
Milestone: `SCENECRAFT-001` (documentation/evidence layer only)

## Exact lineage (full SHAs)

- Exact base: `c7618f06c96bd52a866e87dadaaea7a4cf991e4c`
- Prior accepted line: implementation A `799546f6838dd997e51b2e33f0a0a996b9efaa20`, handback B `a3a6491ed1cf85145c011c2db3048fe345fb7693`
- Exact implementation commit C: `b2fd05799f767c989ae0ba6392f40e4a7e420db5`
- Handback head D: recorded only in the updated PR #22 body (the non-circular record of D; this file intentionally names no D SHA and avoids any self-referential commit label)

## Canonical deliverables (all net **added** from the exact base)

1. `docs/editorial/scene-craft-rule-ledger-v1.md` — **added**. Canonical numbered Markdown ledger: **43 rules**, stable contiguous classification-free IDs `SC-001`–`SC-043`, every rule stating all **17** required fields directly (rule ID, plain-language principle, domain, grammar scope, enforcement class, evaluation window, minimum sample requirement, semantic exception codes, evidence source path, exact Git blob and/or 64-character file-content SHA-256, evidence kind, measured sample size, confidence, current calibration status, future consumer, implementation owner, notes/rationale), plus a 12-artifact source & evidence registry as additional context.
2. `docs/editorial/scene-craft-v1.1.md` — **added**. Narrative at the exact draft status (_Draft editorial knowledge base; non-normative until rule classification, evidence mapping, and pilot calibration are accepted_), canonical ledger link, explicit no-authority statement, the exact spaced vocabulary throughout, the `Hard invariant classes` heading, and the `worked example` value present in the illustrative `evidenceKind` union.
3. `reports/agent-handoffs/2026-07-19-kimi-scenecraft001-rule-evidence-ledger.md` — **added**. This handback.

## Exact counts (mechanically derived from the final ledger)

- Enforcement classes: **15 hard invariant, 14 planner prior, 12 hypothesis, 2 example only** (`warning` and `information` appear zero times).
- Evidence kinds: **25 established editorial practice, 2 project regression, 14 unvalidated hypothesis, 2 worked example** (SC-039 treatment, SC-040 rubric).
- SC-027 is `unvalidated hypothesis`: the single observed project repetition does not validate its universal six-second/six-gesture numeric claim.
- **Zero rules claim measured-reference support for an exact StoryStage number.**
- Low confidence / uncalibrated (15): SC-024, SC-025, SC-026, SC-027, SC-028, SC-029, SC-030, SC-031, SC-032, SC-033, SC-034, SC-035, SC-036, SC-037, SC-039.

## v1 claims softened or demoted

- **Softened:** "exactly one job per shot" → mechanical rejection only for no/contradictory purpose or unsatisfiable envelope (SC-010) + purpose vocabulary (SC-011); compound camera restriction → declared-reason permission (SC-015, with the v1 phrasing recorded as a superseded preference in SC-034 without repeating its blocking token); universal identical-pose dissolve restriction → hypothesis with semantic exceptions (SC-032); cue-per-event density → requested-cue synchronization only (SC-022); fixed four-shot reveal → importance-scaled palette (SC-019).
- **Demoted to hypothesis (low confidence, pending blind pilot):** all inherited v1 numerics — 8–16 frames, CV 0.15, 3× improvement, four/six-second limits, gesture counts, reveal counts, percentage mixes, 15 shots (the 15 rows listed above).
- **Retained with evidence (measured):** none; no evidence was invented or upgraded.
- **Removed outright:** none — every claim is classified live, recorded as superseded (SC-034), or demoted.

## Mechanical audit (recomputed at commit C `b2fd05799f767c989ae0ba6392f40e4a7e420db5`)

- **Net diff from base:** exactly the three **added** canonical files (verified `A`-status for both editorial documents and the handback).
- **IDs:** 43 unique, contiguous `SC-001`–`SC-043` (no gaps, no extras).
- **Fields:** 43 × 17 required fields — 0 missing.
- **Per-rule evidence:** every row carries exact repository path plus full Git blob and/or full 64-character SHA-256; **all cited Git blobs exist** (`git cat-file -e`), and every cited SHA-256 **recomputes from exact Git object bytes** (`git cat-file blob`) — including the seven registry values corrected from the CRLF-checkout mistake and the SC-007 audit hash.
- **Vocabulary:** zero `hard-invariant`, `planner-prior`, `example-only`, `measured-reference`, `project-regression`, `established-practice`, or `unvalidated-hypothesis` tokens in either canonical document; `worked example` present in the narrative union.
- **Blocking tokens:** zero hits across all soft rows.
- **Counts:** handback equals ledger (15/14/12/2 and 25/2/14/2); SC-027 verified `unvalidated hypothesis`.
- **Handback hygiene:** no self-referential commit label, no abbreviated exact SHA, no stale Version 21 label, no false modified-file claim.

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

Base `c7618f06c96bd52a866e87dadaaea7a4cf991e4c` → prior A/B (`799546f…`, `a3a6491…`) → implementation C `b2fd05799f767c989ae0ba6392f40e4a7e420db5` → handback head D (recorded in the PR #22 body). Draft PR #22 targets `agent/kcast001-provider-neutral-rig`. Do not merge — Codex and Pro review the immutable head.
