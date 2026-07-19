# KCAST-001E — Turnaround View-Coverage Authority Closure

Status: implemented and verified locally; not committed or pushed by this handoff.

## Authority change

The strict `1.0` rig request contract is unchanged. Turnaround coverage now uses a separate, self-hashed `TurnaroundViewCoverageEvidence` document. A candidate bundle binds both its semantic evidence hash and the SHA-256 of the exact JSON file bytes.

Each view record binds the source raster hash, a non-overlapping source rectangle, deterministic derived PNG hash/length/dimensions, semantic direction, and `transform: none`. Staging and import both reopen the source raster and coverage JSON, rederive every crop, and compare the immutable content-addressed crop files. Every required view must have independently derived bytes and a unique staged path; `profile-left` and `profile-right` may not share identical derived bytes.

The current Candidate-B source proves only `front`, `profile-left`, and `profile-right`. It remains a `partialItem`; `three-quarter` and `rear` are machine-readable `missingSubitems`. It cannot create an import receipt even when all parts and face kits are present.

## Current exact lineage

- Request: `82844eac0b85b33c7fd1e6cf8654755fc27a17aedeb0e0f2acd5779407cc6310`.
- Candidate-B coverage evidence: `b0b7c8a0d52e0a8e960e067cb9f3b723d26ed0668e176a31566b745d74d586a0`.
- Candidate-B coverage JSON file: `91860ac41e83e2bdc1e4653f3e6781db541f0bc35e9681ba2ebf5523a831f4a1`.
- Candidate-B bundle: `d402889f59b483add770b58f9f1b619822a388a7a5d0b02632777d4ea99afc84`.
- Candidate-B staging report: `832e0bcad358939c3f46209b3beb8736452013f7cba1d96182a7a6e0fcc0fd76`.
- Candidate-B broader view evidence: `1e8dca9a0d3ce48d1115cf5baf6a06142d5ce109242fc8053a8eb50bf137bf1c`.
- Front source-set F bundle: `ad678eebdfc97a73aaaecacacd59f1f55009db0a27bed7ac39ffa3e7331758ad`.
- Front source-set F staging report: `5922389b1e50ddf64bdea9cf58710ba66502c2df0034922993ac65c328f9f042`.
- Front source-set F evidence: `35113c30ad22d1ea007015eb9119753f50cd6ffc2db662c1fb4f37d196b29162`.

Earlier KCAST-001D hashes remain historical records and are superseded by this lineage; they were not rewritten.

## Verification

- Story Engine typecheck and full test suite pass (251/251 tests).
- Asset Pipeline typecheck and full test suite pass.
- KCAST-001B, KCAST-001C, and KCAST-001D front proofs pass and reproduce the hashes above.
- Tests reject reordered/duplicate/overlapping coverage, reused derived bytes or staged paths, non-turnaround coverage references, transforms other than `none`, self-rehashed false crop assertions, out-of-bounds crops, stale candidate/evidence bytes, modified persisted coverage JSON, modified persisted derived view PNGs, and incomplete receipt creation.

No provider, preparation, approval, rig, or production authority is created by this evidence.
