# SS-004 verified delivery bundle

Date: 2026-07-17
Status: **IMPLEMENTED AND LOCALLY PROVEN — awaiting ChatGPT Pro audit**

## Outcome

StoryStage now converts a successful full-production render into a verified, content-addressed delivery. The Studio can rehydrate that delivery after restart, show its exact production and master metadata, and ask Electron main to open the master or reveal the bundle. It no longer treats a raw worker MP4 or in-memory job state as final delivery evidence.

## Trust boundary

- The render worker reopens the frozen production and approved assets/audio, applies the shared full-production gate, renders the complete duration, probes the encoded file, and persists a content-hashed receipt.
- Electron main independently contains and reopens the output and receipt, checks the current production is still the exact render binding, reopens the immutable snapshot, and verifies the master bytes again before publication.
- Receipt filesystem paths remain private worker-to-main data and are stripped before the completion event reaches Studio.
- Delivery publication copies the exact master and snapshot bytes, derives deterministic captions and consumed-media provenance, hashes every payload, verifies the temporary directory, and atomically renames it to the manifest hash.
- Every rehydrate, open, and reveal request re-verifies the complete directory by manifest hash. No renderer-provided reveal path is trusted.

## Automated evidence

- Story engine tests bind receipt/manifest hashes, SRT timing, and explicit caption omission.
- Desktop tests verify receipt/master identity, seven-file publication, idempotence, tamper rejection, and recovery after every file write, post-verification, pre-rename, and post-rename checkpoint.
- Studio tests verify required rights evidence for voice, music, and custom SFX and restart rehydration of the exact delivery with main-owned actions.
- `pnpm render:production-proof` rendered an exact approved 181-frame production at 1920x1080/30 with stereo AAC, persisted receipt `ffb140c3740f6f5ef335bc8ecc0388f9145e17ded0684301ba039cf658cfca85`, and published delivery manifest `d743e43c0b08f2a79a5dfc94b0a05cf5d40a5bd6b73eada7147cd14986a919a4`.
- The real proof reopened the delivery after simulated restart and republished it idempotently. The delivery has exactly seven files, one deterministic SRT cue for the one-line proof script, and cleared consumed-media rights.
- Private executable evidence is under `artifacts/SS-002/` and remains ignored by Git.

## Product truth

This closes the local verified-delivery boundary. It does not make the proof fixture production art, auto-upload a video, or close the Rook/user voice approvals. The next product slice should use the same delivery path on the user-approved Rook pilot, then widen the reusable history and kids asset libraries based on that real episode review.
