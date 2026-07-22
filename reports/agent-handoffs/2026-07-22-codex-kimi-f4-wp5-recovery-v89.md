# Kimi full brief — F4-WP5 recovery after v88 CLI exit

## Immutable assignment identity

- Inbox version: `89`
- Task: `F4-WP5-RESPONSIVE-ACCESSIBILITY-EVIDENCE-RECOVERY`
- Issue: `#117`
- Exact accepted base: `0b8d03940e65114d6cd7edba4ae4fa2028be2c19`
- Required branch: `agent/kimi-f4-wp5-responsive-accessibility-evidence-v2`
- Preserved v88 WIP: `51ff4741f246b86244f13d11a2ad3b373f99d75f`
- Recovery status merge: `product/v1@9873819739396cf8314affa9893be0fa3e106f21`
- Owner: Kimi, frontend/UI/UX only
- Milestone/package: `F4 / F4-WP5`

Version 88's Kimi process exited unexpectedly after its complete Studio run and
before a handback, PR, or evidence capture. Codex stopped only the orphaned
launcher, preserved the clean six-file in-scope workspace as the explicitly
unaccepted WIP commit above, and did not alter its contents.

Start from the exact accepted base on the exact required v2 branch. Fetch the
preserved WIP and cherry-pick exact `51ff4741f246b86244f13d11a2ad3b373f99d75f`.
Verify the resulting diff is limited to the Version 88 allowed files. Continue
the same F4-WP5 package; do not redesign or broaden it.

## Binding scope

The complete Version 88 brief remains binding:
`reports/agent-handoffs/2026-07-22-codex-kimi-f4-wp5-responsive-accessibility-evidence-v88.md`.

Preserve its keyboard, focus, responsive, reduced-motion, truthfulness,
evidence, allowed-file, non-goal, handback, and stop requirements exactly.
This recovery changes only branch identity and supplies the preserved WIP.

## Known verification state

- Focused F4-WP5 suite: `12 passed`, `155 skipped`.
- First complete Studio run: `226 passed`, three failures.
- Independent complete Studio rerun: `228 passed`, one failure.
- The remaining failure was the unchanged
  `Cv002DraftReview.test.tsx` structured-beat/history test exceeding its existing
  5000 ms timeout at 5117 ms under full-suite resource pressure.
- That exact unchanged test passed alone in 4.28 seconds.

Do not edit unrelated accepted tests or increase their timeout merely to make a
gate green. Run the complete Studio suite serially or with bounded workers to
avoid resource-pressure timeouts, and record both the command and duration. If
an actual deterministic regression remains, fix only the F4-WP5 allowed files.

## Recovery completion requirements

1. Cherry-pick the exact preserved WIP onto the required v2 branch.
2. Re-run focused F4-WP5 tests and the complete Studio suite with bounded
   workers; both must pass.
3. Run Studio typecheck, production build, touched-file lint, `git diff
--check`, and serialized repository-root verification.
4. Complete the exact 1920x1080, 1440x900, and 1024x800 browser evidence matrix
   from the final implementation commit with zero console/page errors and exact
   screenshot/report hashes.
5. Commit and push the exact v2 branch, open a draft PR to `product/v1`, publish
   the complete immutable handback required by Version 88, and exit.

## Non-goals and stop

No fixture/model semantic changes, F5/F6, real files, providers, preparation,
approval, capabilities, persistence, workers, backend, Godot, Remotion,
rendering, export, packaging, or private launch. Completion creates only the
F4 milestone candidate for Codex exact-head review, hosted checks, and Pro's
separate milestone audit.
