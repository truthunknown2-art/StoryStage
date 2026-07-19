# Codex correction handoff — Kimi Scene Craft ledger (Version 22)

Independent exact-head audit of draft PR #22 at
`a3a6491ed1cf85145c011c2db3048fe345fb7693` rejects only the residual
mechanical truth defects below. Preserve the documentation-only boundary,
three-file net scope, 43 contiguous rule IDs, 17-field rows, exact Git blob
IDs, and the already-clean soft-row blocking-token audit.

Exact accepted lineage for this correction:

```text
base:             c7618f06c96bd52a866e87dadaaea7a4cf991e4c
implementation A: 799546f6838dd997e51b2e33f0a0a996b9efaa20
handback B/head:   a3a6491ed1cf85145c011c2db3048fe345fb7693
```

## 1. Correct SC-027 and the mechanically derived counts

SC-027 cites one observed project repetition, but that observation does not
validate its universal six-second/six-gesture numeric claim. Change SC-027's
evidence kind from `project regression` to `unvalidated hypothesis`.

The exact final counts must then be:

```text
Enforcement:
15 hard invariant / 14 planner prior / 12 hypothesis / 2 example only

Evidence:
25 established editorial practice / 2 project regression /
14 unvalidated hypothesis / 2 worked example
```

Derive these counts from the final ledger in the verification script; do not
copy a stale handback total.

## 2. Finish the exact taxonomy conversion

Remove all ten remaining `hard-invariant` tokens:

```text
docs/editorial/scene-craft-v1.1.md:59
docs/editorial/scene-craft-rule-ledger-v1.md:60
docs/editorial/scene-craft-rule-ledger-v1.md:74
docs/editorial/scene-craft-rule-ledger-v1.md:88
docs/editorial/scene-craft-rule-ledger-v1.md:102
docs/editorial/scene-craft-rule-ledger-v1.md:116
docs/editorial/scene-craft-rule-ledger-v1.md:130
docs/editorial/scene-craft-rule-ledger-v1.md:144
docs/editorial/scene-craft-rule-ledger-v1.md:158
docs/editorial/scene-craft-rule-ledger-v1.md:172
```

Use `Hard invariant classes` in the narrative heading and update every ledger
section citation to that exact spaced heading. Add the omitted binding value
`worked example` to the narrative's illustrative `evidenceKind` union. The
canonical documents must contain zero hyphenated taxonomy/evidence values.

## 3. Hash the exact Git-provenance bytes

Seven registry SHA-256 values were computed from a CRLF-transformed checkout,
not the exact bytes named by the Git provenance. Replace them with the
independently recomputed SHA-256 values below:

| Source                                                          | Required SHA-256 of exact Git object bytes                         |
| --------------------------------------------------------------- | ------------------------------------------------------------------ |
| `docs/PRODUCT_ROADMAP.md`                                       | `776a4ed213763578b4f6d8b0d4aa912cf7609f0484fa5c9f70c9e654f8e3deeb` |
| `docs/REFERENCE-DIRECTION-STUDY.md`                             | `2268f8ffe7646d8e868ea6cb72d9624903137104355ef6547ccbf56ef9b5c6a5` |
| `docs/reference-analysis/kids-dragon-hunt-2-analysis.json`      | `ab39eee3b4be2082049b71fa49ac305382e75ad6d3b7c5c2fbf36feddad5dd43` |
| `docs/reference-analysis/sticko-teen-analysis.json`             | `4fc0a1a0b7300689767b734745ee89e5f13fb0b1495ad5d58d0c2bbf23d07d6e` |
| `docs/reference-analysis/profile-comparison.md`                 | `1dcd91ce2f51c6bdcb3e8561df878bdeb58c207faf37eb914be248d45cfa73d1` |
| `docs/design/kids-showcase-proof/pro-encoded-frame-audit-v3.md` | `7702342648cad9eb7080db1efaa6fe26a2d2b92a09e0f21c583cf0506075791c` |
| `docs/design/kids-showcase-proof/proof-report.json`             | `edb98aedebdaa342352c205a6165d081194812502dfc0a53c4384bfe0f011657` |

The stale `pro-encoded-frame-audit-v3.md` SHA also appears directly in SC-007;
replace that occurrence. Recompute from `git cat-file blob <exact-blob-id>` or
an equivalent raw-byte path. Do not hash a checked-out text file.

## 4. Make the handback and PR body non-circular and exact

Use the same two-commit protocol again:

1. Commit C changes only the two canonical editorial documents.
2. Commit D changes only the canonical handback.
3. The handback records the full exact base SHA, the full exact prior A/B SHAs,
   and full exact implementation commit C SHA. It must not name its own commit
   D SHA and must not say `this commit`.
4. Describe both canonical editorial documents as net `added` from the exact
   base, not `modified`.
5. Record inbox Version 22 and the corrected mechanically derived counts.
6. Update the PR body after pushing so it records full 40-character base,
   implementation C, and handback-head D SHAs. The PR body is the only
   non-circular record of D.

Do not abbreviate a SHA that is called exact.

## Required verification

Prove mechanically at the final head:

- the net diff from
  `c7618f06c96bd52a866e87dadaaea7a4cf991e4c` is exactly the two added
  canonical editorial documents plus the added canonical handback;
- IDs are exactly `SC-001` through `SC-043`;
- all 43 rows contain the 17 required fields;
- SC-027 is `unvalidated hypothesis` and exact counts are
  `25 / 2 / 14 / 2` for evidence;
- both canonical documents contain zero `hard-invariant`, `planner-prior`,
  `example-only`, `measured-reference`, `project-regression`,
  `established-practice`, or `unvalidated-hypothesis` tokens;
- `worked example` appears in the illustrative narrative union;
- all cited Git blobs exist and every cited SHA-256 recomputes from exact Git
  object bytes;
- the handback contains no `this commit`, no abbreviated exact SHA, no stale
  Version 21 label, and no false modified-file claim;
- scoped Prettier, `git diff --check`, and hosted verification pass.

Push commits C and D on the existing work branch, update PR #22 body with full
exact SHAs, leave a concise handback comment, then wait. Do not change code,
schema, validator, UI, runtime, prompt, audio, motion, asset, authority, or
Storylight intent.
