# Kimi inbox watcher

StoryStage uses a deterministic Windows watcher to wake Kimi. Kimi itself does
not poll Git, sit in a permanent terminal, or spend a model turn to discover
that its inbox is unchanged.

## Durable identity

- Scheduled task: `StoryStage-KimiInboxWatcher`
- Canonical inbox:
  `origin/agent/kimi-frontend:reports/agent-handoffs/KIMI_INBOX.md`
- Local root: `%LOCALAPPDATA%\StoryStage\coordination`
- State: `%LOCALAPPDATA%\StoryStage\coordination\state.json`
- Logs: `%LOCALAPPDATA%\StoryStage\coordination\logs`
- One-shot run records: `%LOCALAPPDATA%\StoryStage\coordination\runs`

These names are part of the cold-start contract. A new Codex task checks the
watcher with the committed status command instead of relying on chat memory.

## Install and inspect

Run from a trusted `product/v1` checkout:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Install-KimiInboxWatcher.ps1 -Install
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Install-KimiInboxWatcher.ps1 -Status
```

Installation copies the two runtime scripts into the local coordination root,
registers a least-privilege per-user task every five minutes, and performs one
deterministic dry poll. It never starts Kimi during installation.
If that poll sees a valid new `START_NOW`, it records the version as pending so
the next real scheduled poll launches it exactly once.

To remove the scheduled task while preserving its receipts:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Install-KimiInboxWatcher.ps1 -Uninstall
```

## Launch contract

Every poll fetches only `product/v1` and `agent/kimi-frontend` into a dedicated
coordination checkout without switching, merging, rebasing, or resetting.

The watcher launches nothing for:

- `WAIT`, `HOLD`, `STOP`, `DONE`, or `BLOCKED`;
- an unchanged or lower inbox version;
- an unknown status or duplicate/missing header;
- an unsafe brief path, missing issue, invalid base, invalid branch, or base
  outside the accepted `product/v1` lineage; or
- an overlapping watcher instance.

Only a strictly higher `START_NOW` inbox may launch Kimi. It must contain one
positive `Inbox-Version`, concrete `Current-Task`, full 40-character
`Accepted-Root-Base`, safe `Required-Work-Branch`, safe `Full-Brief`, and
explicit `Issue: #N`. The full brief must repeat the exact base, branch, and
issue. Validation failures are logged and require a corrected higher inbox
version.

Before a real launch, the watcher creates a new version-scoped checkout at
`%LOCALAPPDATA%\StoryStage\coordination\workspaces\v<Inbox-Version>`, checks
out the exact accepted base on a detached HEAD, and verifies its origin, exact
HEAD, and empty tracked/untracked status. Existing version directories or
existing remote work branches fail closed; the watcher never deletes or reuses
them. The runner repeats the same checks immediately before process start.

One validated version starts one fresh hidden
`kimi --prompt ... --output-format stream-json` session in that pinned clean
checkout. The no-checkout control clone is used only for validation and is
never a model working directory. Kimi prompt mode is non-interactive and applies its auto
permission policy by default; the watcher must not add the incompatible
`--auto`, the broader `--yolo`, or `--plan`. The fixed prompt makes Kimi reread GitHub truth, claim
the issue, execute only the brief, publish its handback, and exit. Repeated
polls cannot relaunch the same version. The watcher atomically reserves the
version before starting the external process, so a watcher crash cannot create
a duplicate launch; a reserved launch that fails requires a corrected higher
inbox version. Every Kimi assignment has a fixed three-hour maximum; timeout
forces termination of the launched Kimi process tree and records exit `124`.
If Windows cannot confirm process-tree termination, the receipt records
`terminationSucceeded: false` for immediate manual investigation and never
mistakes parent-only cleanup for a complete stop.
The watcher never uses `--yolo`, never
opens Kimi ACP/server ports, and never reads Kimi credentials or session data.
If a completed Kimi process does not expose a usable exit code, the runner
records exit `1` rather than treating the launch as successful.

`STOP` records an idle state; it does not kill a running implementation. Codex
and Preston handle an active-task stop explicitly so unsaved work is not lost.

## Verification

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Test-KimiInboxWatcher.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Invoke-KimiInboxWatcher.ps1 -NoLaunch
```

The first command tests strict parsing and launch decisions without network or
model use. The second performs the real deterministic fetch and validation but
cannot launch Kimi.
