# SS-004: Verified Delivery Bundle + Durable Render Receipt

Status: implemented; awaiting Pro audit

## Objective

Turn an exact, gate-complete full-production render into a restart-safe delivery rather than leaving an unverified MP4 in a temporary render folder. The delivery must bind the approved production snapshot, final render plan, media bytes, captions, consumed rights, and toolchain without exposing local paths or account data.

## Acceptance contract

- A content-hashed render receipt is written only after ffprobe verifies the full H.264, 1920x1080, 30 fps master, exact frame count/runtime, and required AAC stream.
- Publication reopens the exact immutable production snapshot and rejects a render if the current production changed before publication with `STALE_PRODUCTION`.
- The content-addressed delivery path is `deliveries/<production>/r<revision>/<bundle-hash>/<delivery-manifest-hash>/`.
- The atomic directory contains exactly `master.mp4`, `captions.srt`, `production-bundle.json`, `render-receipt.json`, `project-manifest.json`, `provenance-rights.json`, and `delivery-manifest.json`.
- SRT cues come from the frozen final shot boundaries with deterministic frame-to-millisecond rounding, no overlaps, and explicit `caption: null` omission.
- The project manifest distinguishes the canonical production-bundle hash from the copied JSON byte hash.
- Provenance lists only media and code treatments consumed by the frozen production. Imported voice, music, and custom SFX require content-bound clearance before a full render.
- Publication writes to a sibling temporary directory, verifies every payload and cross-file identity, then atomically renames. Existing exact deliveries reopen idempotently; partial, extra, symlinked, or tampered payloads are rejected.
- Studio rehydrates only the exact saved revision/hash after restart and exposes main-owned Open master and Reveal bundle actions. Browser mode never claims local delivery actions.

## Deliberately excluded

ZIP export, upload/cloud destinations, YouTube or social publishing, code signing, and portable editable source archives are separate product slices.
