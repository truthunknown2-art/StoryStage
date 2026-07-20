# G0 roadmap corrections — final audit wait (inbox v53)

## Authority

- Repository: `truthunknown2-art/StoryStage`
- Accepted product base: `87c01f9b684642e39cf470f06be2aaf6797cd3d7`
- Candidate branch: `agent/codex-full-product-roadmap`
- Draft PR: <https://github.com/truthunknown2-art/StoryStage/pull/48>
- Exact correction head: `44bd2385fa3a744b034dddc571858a7f46ab90df`
- Pro correction verdict head: `fdc4c155001f53716177908fc868960df3517f2f`
- Kimi status: `WAIT`
- Required work branch: none

## What changed

ChatGPT Pro accepted the full phase sequence, Godot-to-Remotion architecture,
five-source authority model, and public-repository receipt/crosswalk treatment,
then required eight bounded G0 corrections. Codex applied only those corrections:

- live review identity no longer uses an impossible self-referential SHA;
- `PRODUCT_PLAN` is a stable charter rather than an execution ledger;
- lifecycle enums and the cold-start read order are singular;
- every P0-S1 milestone has 3-8 packages, objective, invariant,
  dependencies/owners, tasks, non-goals, verification/exit, required evidence,
  and a milestone gate;
- completed P0/E0/F1/F2 packages and full accepted SHAs are recorded;
- a parseable dependency graph and explicit launch stop conditions exist;
- the user-supplied multi-shot source URL is recorded at `t=616s`, while the
  unlicensed verbatim source remains outside the public repository;
- the roadmap checker validates the live candidate, Kimi WAIT state, structure,
  dependencies, stale claims, links, and authorization, and now runs in root CI.

## Verification

- `pnpm verify:roadmap`: PASS on exact remote head
- Prettier checks: PASS
- `git diff --check`: PASS
- root roadmap/assets/privacy/lint/typecheck stages: PASS
- root tests: 545 tests passed; two untouched asset-pipeline cases timed out
  under contention, then passed in isolated reruns (`14/14` and `9/9`)
- hosted Verify run `29785438661`: pending at issue time

## Kimi instruction

Do no implementation work. Do not create, change, or claim an F3 branch or
issue. Continue polling this inbox. A higher inbox version is required before
any frontend task begins.

## Next authority

Codex waits for hosted verification, returns exact head `44bd2385...` to Pro for
final acceptance, records the verdict in GitHub, and obtains Preston's G0 phase
decision. F3-WP1 is not authorized by this brief.
