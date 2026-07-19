# [KIMI] Scene Craft v1.1 evidence ledger handback

Task: `KIMI-SCENECRAFT-V11-EVIDENCE-LEDGER` (inbox v18, START-NOW)
Work branch: `agent/kimi-scenecraft-v11-evidence-ledger`, from exact accepted base `c7618f06c96bd52a866e87dadaaea7a4cf991e4c` (PR #17 merged)
Milestone: `SCENECRAFT-001` (documentation/evidence layer only)

## What was delivered

The mixed Scene Craft material is now a complete, auditable, **non-normative** editorial knowledge ledger. No product code, validators, thresholds, compiler/runtime behavior, UI, or production authority was added.

1. **`docs/editorial/scene-craft-v1.1.md`** — the accepted Pro/Codex amendment (hard-versus-soft ruling preserved verbatim in substance), revised so every creative section links to ledger rule IDs (`SC-###`), with an explicit header stating the document grants no planning, timing, rig, capability, render, audio, export, or production authority.
2. **`docs/editorial/scene-craft-v1.1-rule-ledger.json`** — valid formatted JSON containing:
   - a **12-entry source-artifact registry**: exact repo path, Git commit where applicable, independently computed SHA-256 of the referenced file bytes (commit IDs kept as provenance, never as content-hash substitutes), evidence kind, and an explicit statement of what each source can and cannot support;
   - **43 numbered records** covering every candidate rule, threshold, principle, warning, prior, hypothesis, and example from v1 and the v1.1 amendment — each with the full required shape (`id`, `title`, `sourceSection`, `grammarScope`, `domain`, `enforcement`, `minimumSampleSize`, `exceptionCodes`, `sourceContentHashes`, `evidenceKind`, `confidence`, `disposition`, `rationale`, plus a `sourceArtifacts` cross-reference). No unclassified leftovers hidden only in prose.

## Classification results

- **43 rules total.** By enforcement: **15 hard-invariant, 14 planner-prior, 12 hypothesis, 2 example-only** (no rule needed `warning`/`information` — graded findings that might one day warn are held as hypotheses with minimum samples and exception codes).
- **By evidence kind:** 27 established-practice, 3 project-regression, 13 unvalidated-hypothesis. **Zero measured-reference** — the reference-analysis artifacts are registered as measured-reference sources, but no rule claims their support for an exact StoryStage number, per the no-invented-evidence rule.
- **Low confidence (15):** SC-024 (8–16f hold), SC-025 (CV 0.15), SC-026 (4s static idea), SC-027 (6s gesture repeat / six gestures), SC-028 (same-size streaks), SC-029 (3-of-4 reveal), SC-030 (25/40/25/10 mix), SC-031 (80% hard cuts), SC-032 (dissolve 8–16f pose change), SC-033 (wipe 6–10f), SC-034 (never stack push+pan), SC-035 (pose evolution 1–2s), SC-036 (gaze offsets 2–4f), SC-037 (blink 2.5–4.5s), SC-039 (15 shots/30s).
- Every inherited v1 numeric claim is hypothesis, planner-prior, or example-only. The 15-shot treatment is `example-only` (illustrative, never a target or rubric). The blind-pilot rubric is `example-only` — an accepted human evaluation contract that authorizes no validator or hard gate in product code.
- Hard-invariant is reserved for evidence-bound mechanical/authority failures only (lineage, timing/read envelopes, causal/continuity/geography/axis/lifecycle/prop/contact/gait/action consistency, capability/approval authority, asset integrity, honest executed camera/transition behavior, deterministic honest render, no hidden planner fallback, unreadable reveal causality).
- Accepted principles (purposeful coverage, listener reaction, motivated cuts/camera, energy shaping, reveal preparation, performance follow-through, audio-led timing) are preserved as `planner-prior` knowledge without quotas.

## Changed files

- `docs/editorial/scene-craft-v1.1.md` — revised with ledger rule-ID links per section and an explicit no-authority header; hard-versus-soft ruling preserved
- `docs/editorial/scene-craft-v1.1-rule-ledger.json` — new: 12-artifact registry + 43 classified rule records

Source documents were read without changing branches from `origin/agent/kimi-frontend` (`scene-craft-v1.md` @ `0a4f25d`, `scene-craft-v1.1.md` @ `3f07a61`); no coordination-branch merge or cherry-pick was performed.

## Commands and results

| Command                                                                                                                   | Result                                         |
| ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `node -e "JSON.parse(...rule-ledger.json)"`                                                                               | **valid JSON** (43 rules, 12 registry entries) |
| `corepack pnpm exec prettier --check docs/editorial/scene-craft-v1.1.md docs/editorial/scene-craft-v1.1-rule-ledger.json` | clean (after one `--write` pass on the JSON)   |
| `git diff --check`                                                                                                        | clean                                          |

## Limitations

1. The ledger is classification, not measurement: 15 numeric claims sit at low confidence pending blind-pilot calibration, exactly as the brief requires — none were upgraded.
2. The reference-analysis JSONs are registered as `measured-reference` sources, but no rule is marked `measured-reference`, because none of them directly measures an exact StoryStage threshold (recorded in each registry entry's support statement).
3. Project-regression evidence (frame audit + frames) supports the _existence_ of the repeated-gesture and smear-ghosting failure modes in this project; it does not support the universal numeric limits, which remain hypotheses.
4. The Storylight external-intent examples were deliberately not started (Codex issues that task separately, per the brief's stop rules).
5. No new reference-video claims or web research; no schema export, validator, or behavior change of any kind.

## Integration instructions

Branch is one commit (`<SHA>`) plus this handback on top of the accepted merge `c7618f0`. Draft PR targets `agent/kcast001-provider-neutral-rig`. Do not merge — Codex and Pro review the immutable head. Codex will decide later whether any accepted ledger entry becomes compiler, continuity, quality-report, capability, or planner behavior.
