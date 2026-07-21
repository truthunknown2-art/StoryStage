# Kimi zero-token watcher handback

- Tracking issue: #66
- Exact base: `product/v1@6bf7d33016086dfb444f67361af11a2ac4dfd502`
- Branch: `agent/codex-kimi-event-watcher`
- Product capability changed: none
- Kimi assignment changed: none; inbox v59 remains `WAIT`

## Delivered boundary

The previous model-driven 15-minute polling contract is replaced by a
deterministic per-user Windows scheduled task. `WAIT`, `HOLD`, `STOP`, `DONE`,
`BLOCKED`, invalid input, and unchanged inbox versions cannot launch Kimi. A
strictly higher valid `START_NOW` version may launch exactly one fresh
`kimi --auto --prompt ... --output-format stream-json` process after exact
base, branch, issue, brief-path, brief-identity, and product-lineage checks.

The task is named `StoryStage-KimiInboxWatcher`. Its installed scripts, private
coordination checkout, state, logs, launch receipts, and one-shot run logs live
under `%LOCALAPPDATA%\StoryStage\coordination`. The task runs only as the signed-
in user at limited privilege. Its trigger repetition interval is exactly
`PT5M`; overlapping task instances are ignored and the watcher also owns a
named mutex. It may start on battery and is not stopped by a switch to battery.
Each valid launch version is atomically reserved before the external process is
started, closing the crash-gap duplicate-launch case.

No Kimi ACP/server port, long-lived agent session, credential read, model call,
branch switch, merge, rebase, reset, cherry-pick, or force-push is part of the
polling path.

## Verification

- PowerShell parser: PASS for all four watcher scripts.
- `scripts/Test-KimiInboxWatcher.ps1`: PASS. It covers strict headers,
  duplicate/unknown status rejection, safe/unsafe brief paths, new `WAIT`,
  unchanged `WAIT`, one higher valid fixture `START_NOW`, and no relaunch of the
  same version through a temporary real Git remote.
- Real remote `-NoLaunch` poll: v59 `WAIT`, no launch; repeated poll reports
  `unchanged`, no launch.
- Install/status/uninstall/reinstall: PASS.
- Manually started scheduled task: exit code `0`; state `Ready`; no new Kimi
  PID; log says `IDLE unchanged inbox v59 WAIT; no Kimi launch.`
- Trigger: `PT5M`, `MultipleInstances=IgnoreNew`, limited interactive user.
- `pnpm verify:roadmap`: PASS.
- full root `pnpm verify`: PASS; 12 Codex-lab files / 84 tests, 34
  story-engine files / 353 tests, and all other workspace suites passed; only
  the two pre-existing Remotion non-pure-animation warnings remain.
- `pnpm verify:privacy`: PASS for 950 publishable workspace files.
- targeted Prettier for the new/edited cold-start and operations documents and
  `git diff --check`: PASS. `PRODUCT_PLAN.md` retains its existing table layout
  outside the surgical wake-up section.

## Known operational limitation

The already-open long-lived Kimi process PID 35820 predates this watcher. Direct
normal and forced termination both returned Windows `Access is denied`; the
watcher did not create or relaunch it. Preston must close that elevated/external
Kimi window once. After it is closed, the installed watcher is the only normal
Kimi wake-up path and unchanged `WAIT` polls remain model-free.

The watcher intentionally records `STOP` but does not kill an active Kimi
implementation, because automatic termination could destroy unpublished work.
