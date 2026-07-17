# SS-005 human gate completion path

Date: 2026-07-17
Status: **IMPLEMENTED — verification and Pro audit pending**

## Product objective

Turn the existing scattered human checks into one obvious route from a directed production to a verified episode. This slice does not bypass review or pretend that unfinished artwork and audio are complete. It makes the honest path fast enough to use.

## Acceptance contract

- Studio exposes a first-class **Finish** workspace rather than a passive Preflight report.
- The workspace orders picture review, voice import/listen-through/rights approval, spoken timing locks, mix review, full preflight, final render, and verified delivery.
- It shows exactly one next action and a six-step completion state derived from current production evidence.
- Each unresolved step routes to and focuses the exact owning control, including Rook review, the voice master, timing editor, mix review, and generic asset approvals.
- The final action requests `full-production` directly; it cannot accidentally inherit the engineering-slice selector.
- Active render state, worker failure, retry, and verified-delivery completion use real host events. A raw completed MP4 is not presented as delivery.
- A current verified delivery proves the completed chain after restart and exposes its manifest-bound state.
- Browser mode may inspect the flow but remains blocked from local review, rendering, and delivery actions.
- Automated tests cover the blocked route, focus navigation, a gate-complete full-render request, active render state, and rehydrated delivered state.

## Out of scope

Automatically approving Rook, generating final artwork without review, recording a real voice performance, bypassing rights evidence, cloud publishing, Blender, broader asset libraries, and claiming that the engineering fixture is a finished episode.
