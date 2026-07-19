# Codex correction handoff — Kimi Scene Craft v1.1 ledger (Version 20)

Exact-head review of draft PR #22 at
`864b82deb9a53d92b7c66f3a503a99068da395dd` accepts the substantive effort and
the documentation-only boundary, but the output shape is not the binding
Version 19 contract. This correction is deliberately narrow: preserve useful
classification/source work while conforming the deliverables exactly.

## Exact branch and scope

- Continue only on `agent/kimi-scenecraft-v11-evidence-ledger`.
- Preserve base `c7618f06c96bd52a866e87dadaaea7a4cf991e4c` and draft PR #22.
- Documentation only. No TypeScript, schema, validator, runtime, UI, prompt,
  audio, motion, asset requirement, production authority, or Storylight intent
  example.
- Do not rewrite history or force-push. Add one immutable successor commit.

## Required corrections

1. Replace the superseded JSON ledger:
   - remove `docs/editorial/scene-craft-v1.1-rule-ledger.json`;
   - create the exact canonical file
     `docs/editorial/scene-craft-rule-ledger-v1.md`;
   - use a numbered Markdown section or table for every rule, with stable,
     contiguous IDs `SC-001` through `SC-043`; update all narrative references
     consistently. Do not encode classification in an ID.
2. Every rule row/section must state all Version 19 fields directly, not only
   through an indirect registry key:
   - rule ID;
   - plain-language principle;
   - domain;
   - grammar scope;
   - enforcement class;
   - evaluation window;
   - minimum sample requirement;
   - semantic exception codes;
   - evidence source path;
   - exact Git blob and/or 64-character file-content SHA-256;
   - evidence kind;
   - measured sample size, when applicable;
   - confidence;
   - current calibration status;
   - future consumer;
   - implementation owner;
   - notes/rationale.
3. Use the allowed vocabulary exactly, including spaces:
   - enforcement: `hard invariant`, `warning`, `information`,
     `planner prior`, `hypothesis`, `example only`;
   - evidence: `measured reference`, `project regression`,
     `established editorial practice`, `unvalidated hypothesis`,
     `worked example`.
     Values such as `hard-invariant`, `planner-prior`, `example-only`,
     `established-practice`, and `unvalidated-hypothesis` are not the binding
     vocabulary.
4. Audit all `warning`, `information`, `planner prior`, `hypothesis`, and
   `example only` rows. None may say `fails`, `banned`, `must reject`, `never`,
   `prohibited`, or equivalent blocking language. Preserve an inherited
   absolute claim only as a clearly attributed historical claim in the notes;
   make the current principle and disposition non-blocking.
5. In `docs/editorial/scene-craft-v1.1.md`, use the exact status:
   **Draft editorial knowledge base; non-normative until rule classification,
   evidence mapping, and pilot calibration are accepted**. Link the canonical
   Markdown ledger filename and keep the explicit no-authority statement.
6. Replace the nested/superseded handback:
   - remove
     `reports/agent-handoffs/2026-07-19-kimi-scenecraft-v11-evidence-ledger/HANDOFF.md`;
   - create the exact file
     `reports/agent-handoffs/2026-07-19-kimi-scenecraft001-rule-evidence-ledger.md`;
   - label the active instruction as inbox Version 20;
   - report exact base and successor SHAs, all changed files, counts by exact
     enforcement/evidence vocabulary, softened or removed v1 claims, numeric
     claims retained with evidence, numeric claims demoted, unresolved
     questions, commands/results, limitations, and state that no code or
     authority changed.
7. Update the PR body so it names only the canonical deliverables and exact
   successor SHA. Do not describe the removed JSON or old nested handback as
   the accepted output.

## Evidence and classification guardrails

- Preserve the useful source-artifact hashes, but put the exact path plus hash
  on every applicable rule. A registry may remain as additional Markdown
  context; it cannot substitute for required per-rule fields.
- Use `worked example` for an illustrative treatment/rubric when that is the
  actual evidence kind. Do not call a worked example established practice
  merely because humans will evaluate it.
- A null/unknown sample requirement is not the same as an omitted field.
  Express `not applicable`, `unknown`, or the actual value explicitly.
- Keep every numeric claim non-blocking unless exact measured evidence in the
  cited artifact actually supports that number. Do not invent evidence.
- The blind-pilot rubric remains a human evaluation contract, not a product
  validator or compiler gate.

## Verification and handback

Run at minimum:

```text
corepack pnpm exec prettier --check docs/editorial/scene-craft-v1.1.md docs/editorial/scene-craft-rule-ledger-v1.md reports/agent-handoffs/2026-07-19-kimi-scenecraft001-rule-evidence-ledger.md
git diff --check
```

Also report a mechanical audit proving:

- exactly 43 unique, contiguous rule IDs;
- every rule contains all 17 required fields;
- only the exact allowed enforcement/evidence values appear;
- no soft row contains blocking language;
- every cited repository path exists at its stated provenance and every cited
  64-character SHA-256 was recomputed from the referenced bytes.

Commit and push the immutable successor to PR #22, update its body, and wait
for Codex/Pro exact-head review.
