# Codex correction handoff — Kimi Scene Craft ledger (Version 21)

Exact-head review of draft PR #22 at
`c067f2f8fcb195a58c940d20748a67f732a2f70c` accepts the canonical Markdown
files, documentation-only boundary, 43 rule sections, exact class/evidence
vocabulary in the ledger rows, and presence of the named row fields. Five
mechanical defects still block acceptance. Correct only these defects on the
existing branch; preserve the useful source and classification work.

## 1. Make the stable ID set contiguous

The current 43 IDs omit `SC-041` through `SC-043` and retain legacy
`SC-048` through `SC-050`. Rename only:

```text
SC-048 → SC-041
SC-049 → SC-042
SC-050 → SC-043
```

Update every reference in both editorial documents and the handback. The final
set must be exactly 43 unique IDs, `SC-001` through `SC-043`, with no extras.

## 2. Put exact evidence on every rule

All 43 current `Evidence` fields use abbreviated digests such as
`3b3cd1a…` and `8a128f2e…`. Version 20 explicitly required the exact source
path plus the full 40-character Git blob and/or full 64-character file-content
SHA-256 on every applicable rule; the registry cannot substitute for the
per-rule field.

For every rule:

- retain each exact repository source path;
- include the full Git blob and/or full 64-character SHA-256 for each cited
  source directly in that rule's `Evidence` field;
- use the exact allowed evidence kind;
- do not invent support a source does not provide.

Recompute every SHA-256 from the referenced bytes and mechanically prove every
cited path/blob/hash exists and matches at its stated provenance.

## 3. Remove blocking language from soft rows

The mechanical audit found blocking tokens in these non-hard rows:

```text
SC-015
SC-028
SC-030
SC-033
SC-034
SC-037
SC-040
```

Remove `never`, `prohibited`, `rejected`, `fails`, `banned`, `must reject`, or
equivalent blocking language from the entire section for each warning,
information, planner-prior, hypothesis, or example row—including titles,
quoted historical wording, notes, and cross-rule explanations. Rephrase a
historical absolute as a superseded preference without repeating the blocking
token. Refer to a hard invariant as “the mechanical case covered by SC-041”
rather than embedding hard-block wording in a soft row.

## 4. Align the narrative taxonomy

`docs/editorial/scene-craft-v1.1.md` still uses the superseded hyphenated values
in its illustrative type and prose. Replace every classification/evidence
value with the exact binding vocabulary:

```text
hard invariant
warning
information
planner prior
hypothesis
example only

measured reference
project regression
established editorial practice
unvalidated hypothesis
worked example
```

Also update the three renamed rule references from section 1. Do not leave
`hard-invariant`, `planner-prior`, `example-only`, `measured-reference`,
`project-regression`, `established-practice`, or `unvalidated-hypothesis`
anywhere in either canonical editorial document.

## 5. Make the handback and PR body exact

The current handback says “v18 → v19,” uses “this commit” instead of an exact
SHA, says 19 fields instead of the required 17, and reports evidence counts
that do not match the ledger. The current PR body still names the removed JSON
and nested handback.

Use a two-commit protocol:

1. Commit the corrected canonical editorial documents as implementation commit
   A.
2. Recompute the mechanical audit, then update the exact handback in commit B
   so it records:
   - inbox Version 21;
   - exact base SHA;
   - exact implementation commit A SHA;
   - exactly 17 required per-rule fields;
   - exact counts mechanically derived from the final ledger;
   - exact changed files, claims softened/demoted, limitations, commands, and
     no-code/no-authority statement.
3. Push both immutable commits and update PR #22 body to name implementation A,
   handback head B, the three canonical files, exact counts, and current tests.

Do not try to write commit B's own SHA inside commit B. The updated GitHub PR
body is the non-circular record of exact PR head B.

## Required verification

Run the Version 20 commands plus a mechanical audit proving:

- IDs are exactly `SC-001` through `SC-043`;
- every row contains all 17 fields;
- every per-rule Evidence field has exact path plus full blob and/or SHA-256;
- only exact allowed enforcement/evidence values appear;
- no soft row contains a blocking token;
- every source path/blob/hash recomputes at the stated provenance;
- the handback counts equal the ledger counts;
- only the three canonical documentation files differ from base.

Push, update PR #22, and wait for Codex/Pro exact-head review. No code, UI,
schema, runtime, prompt, audio, motion, asset, validator, authority, or
Storylight intent changes.
