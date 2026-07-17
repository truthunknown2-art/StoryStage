# SS-005 human gate completion path

Date: 2026-07-17
Status: **ACCEPTED by ChatGPT Pro at `0e5cd3e`**

## Outcome

StoryStage now has a first-class Finish Episode workspace. It turns the production gate chain into an ordered operating path rather than leaving the user to infer the next step from scattered disabled controls.

## Implemented behavior

- The workspace has six evidence-derived stages: picture approval, final voice, spoken timing, mix, full preflight, and verified delivery.
- One highlighted next action explains the current blocker and navigates to its exact owner.
- Focus routing observes async review UI until the state-owning control exists, scrolls that exact control into view, focuses it, and provides a short visual pulse or a visible routing error.
- The detailed technical ledger remains available beneath the guided route and uses the same full-production readiness policy as the render worker.
- The final action always requests `full-production`, claims its scope before the host call, disables concurrent final starts during any active render, shows real queued/rendering progress, surfaces immediate and worker failure text, and permits a real retry.
- Render events that arrive before the host returns the correlated job ID are retained in a bounded eight-job buffer and replayed through the same identity checks, so an immediate worker failure cannot disappear behind a false queued state.
- Render completion and verified delivery are accepted only when the active job ID, render scope, production ID, revision, and saved production-bundle hash all match.
- Legacy approved voice tracks without rights evidence route through listen-through, evidence capture, and same-content-hash re-confirmation. Approved tracks made duration-incompatible by timing edits route to the first editable timing cue, or to exact WAV replacement when timing is locked.
- A current verified delivery changes the finish state to Episode Delivered and binds the visible completion to the exact delivery manifest.
- The old Preflight navigation item is now Finish, with the remaining full-production blocker count visible in the rail.

## Verification

- Studio typecheck passes.
- All 31 Studio tests pass, including exact picture/voice/timing/mix/SFX focus navigation, a delayed Rook mount beyond one second, a gate-complete full-production request, unrelated-job and cross-production delivery rejection, immediate and pre-correlation worker failure/retry, engineering-render lockout, approved-voice rights recovery, approved-voice duration recovery, and rehydrated delivery completion.
- Repository-wide verification passes across 140 tests, and the production build completes with the Electron workspace bundle check.
- In-app browser QA on the Rook pilot shows the ordered 0/6 route, the correct ten-item technical evidence ledger, and honest browser-only renderer blocking.
- The Review Rook action navigates to Assets, waits for the candidate UI, pulses the candidate region, and focuses the first review acknowledgement.

## Product truth

This slice removes workflow ambiguity; it does not supply the missing human approvals. The Rook pilot still needs the user's visual decision and final voice/mix work before StoryStage can create its first real publishable delivery.
