# SS-005 human gate completion path

Date: 2026-07-17
Status: **IMPLEMENTED — awaiting ChatGPT Pro audit**

## Outcome

StoryStage now has a first-class Finish Episode workspace. It turns the production gate chain into an ordered operating path rather than leaving the user to infer the next step from scattered disabled controls.

## Implemented behavior

- The workspace has six evidence-derived stages: picture approval, final voice, spoken timing, mix, full preflight, and verified delivery.
- One highlighted next action explains the current blocker and navigates to its exact owner.
- Focus routing waits for async review UI, scrolls the target into view, focuses its first usable control, and provides a short visual pulse.
- The detailed technical ledger remains available beneath the guided route and uses the same full-production readiness policy as the render worker.
- The final action always requests `full-production`, shows real queued/rendering progress, surfaces failure text, and permits a real retry.
- A current verified delivery changes the finish state to Episode Delivered and binds the visible completion to the exact delivery manifest.
- The old Preflight navigation item is now Finish, with the remaining full-production blocker count visible in the rail.

## Verification

- Studio typecheck passes.
- All 26 Studio tests pass, including exact focus navigation, a gate-complete full-production request, active render state, and rehydrated delivery completion.
- In-app browser QA on the Rook pilot shows the ordered 0/6 route, the correct ten-item technical evidence ledger, and honest browser-only renderer blocking.
- The Review Rook action navigates to Assets, waits for the candidate UI, pulses the candidate region, and focuses the first review acknowledgement.

## Product truth

This slice removes workflow ambiguity; it does not supply the missing human approvals. The Rook pilot still needs the user's visual decision and final voice/mix work before StoryStage can create its first real publishable delivery.
