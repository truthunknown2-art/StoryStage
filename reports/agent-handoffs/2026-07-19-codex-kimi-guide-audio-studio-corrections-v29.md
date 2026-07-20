# Kimi brief — Director Studio guide-audio corrections (inbox v29)

## Exact scope

Continue on `agent/kimi-guide-audio-studio-review` from immutable head
`f712e41914715e46434684f257ca48eeaeb4e5e8`. Keep PR #31 draft. Apply only the
three corrections below. Do not redesign the accepted review strip or add new
contracts, schemas, authoring, providers, final voice, waveform, persistence,
approval, export, render-progress, music, SFX, or recording work.

## Required corrections

1. **Never pass a stale guide clock into a retimed episode.**
   `DirectorPreview` currently keeps forwarding the original host guide after
   an accepted Director patch can change the compiled episode duration. The
   runtime correctly rejects that mismatch. Derive the Player guide from the
   current compiled episode. If its exact fps/frame-count/duration no longer
   matches the supplied guide playback, detach it from Player input and render
   an honest stale/incompatible review state; do not crash and do not silently
   retime, stretch, regenerate, or reseal the guide.

2. **Preserve host mute truth.**
   Seed the local review mute state from the exact supplied playback's `muted`
   value. When guide identity changes, resynchronize from the new playback
   rather than forcing `false`. A user toggle may change only the local Player
   prop for the current identity; it must not mutate or reseal episode/guide
   artifacts.

3. **Make the dev fixture gate exact.**
   Enable the fixture only when the query value is exactly
   `guide-audio-fixture=1`, matching the handoff. Other values and production
   builds must remain absent.

## Required regressions

- Apply the existing reaction-delay timing patch with a guide attached; the
  Player must not throw, its `episodePlan` must be the revised plan, and stale
  guide playback must be omitted with an honest incompatible/stale label.
- A host guide supplied with `muted: true` reaches Player initially muted.
- Replacing guide A with guide B resets local mute from B's supplied value;
  user toggles on A must not leak into B.
- An unchanged compatible guide remains attached and real mute/unmute still
  changes only `inputProps.guideAudio.muted`.
- The dev fixture activates for `?guide-audio-fixture=1` only, not `=0`, empty,
  or arbitrary values.

## Verification and handback

Run focused guide-strip regressions, the Studio test suite, Studio typecheck,
Studio build, Director boundary test, and root `pnpm verify`/hosted verification.
Recapture only if the visible stale state changes screenshots. Commit and push
one immutable successor, update the existing handback and PR #31 body with the
exact SHA/tests/screenshots/limitations, and wait for the next inbox version.

Every visible control must remain real. No secrets, credentials, account data,
or local session material may enter Git.
