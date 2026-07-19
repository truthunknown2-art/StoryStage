# KCAST-001F — Candidate H turnaround composition

Status: implemented and locally verified; not committed or pushed by this
agent.

## What changed

- Added a deterministic five-view compositor with a fixed `32px` magenta-key
  gate, exact canonical order, `768px` common figure height, shared foot
  baseline, centered `576x832` cells, and no mirroring.
- Composed the five raw Candidate H sources into one transparent `2880x832`
  Candidate H turnaround sheet.
- Created a self-hashed raw-source normalization receipt with exact crop,
  scale, translation, baseline, resampler, processor, and review-gate facts.
- Created self-hashed per-view coverage evidence bound to exact non-overlapping
  sheet cells and `transform: none` for lossless post-composition extraction.
- Staged the Candidate H bundle through `stageCharacterRigCandidateBundle()`.
  `turnaround-sheet` is complete, while the missing six parts/face kits keep
  the request incomplete.
- Proved the real import-receipt route rejects; no verified import receipt,
  preparation, approval, provider authority, or production binding was created.
  The normalization receipt is mechanical evidence only.

## Exact lineage

- sheet: `732b3a7c41b33a9f8941714066ce60c86a7ff72aea6dd288db80176be263cfec`
- normalization receipt: `08ff2f61b6b1c4a65dea29f42935aee9050cfd743445b424affd70ef63c041fa`
- normalization JSON bytes: `4826f000f4e3b4494e49ec2fe575a0cf6df8cfa83403212ff47582116d104118`
- coverage evidence: `c9e70319de980a0045d04ef8a2897b88d55a974c89d9aa098bb7dc982449946c`
- coverage JSON bytes: `598cd00e26aecce5002554134ca66903ebe11e17670a809360f858cb6650b4d6`
- bundle: `40e91d0f5dce0cdefc964cd55e3b56110b0d13082e5ffd7f5605ce2e9ed4c55a`
- staging report: `099f0e606a8bb2b173865449f2617e3bece819d6d05cb8cdf2de7088c76c32aa`
- proof evidence: `d974ae1e1d5189d3688ef8147e4f41def6157f9fbb7df44f740a216e729cc8ff`

## Verification run

- focused compositor tests: 7/7 pass, including sealed-artifact drift checks
- full Asset Pipeline suite: 87/87 pass
- Asset Pipeline typecheck: pass
- KCAST-001F proof: pass
- proof retry: deterministic exact-byte collision checks pass
- full workspace `pnpm verify`: pass; only two pre-existing Remotion purity
  warnings remain
- `git diff --check`: pass

The next authority boundary is unchanged: all six exact view-specific parts and
face kits still need source acquisition, preparation, diagnostic motion, human
approval, and immutable binding before Ollo can become production-bindable.
