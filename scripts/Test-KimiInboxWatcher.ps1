$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Invoke-KimiInboxWatcher.ps1') -LibraryOnly
. (Join-Path $PSScriptRoot 'Run-KimiInboxAssignment.ps1') -LibraryOnly

function Assert-Equal($Expected, $Actual, [string]$Message) {
  if ($Expected -ne $Actual) { throw "$Message Expected '$Expected', got '$Actual'." }
}

function Invoke-TestGit([string]$WorkingDirectory, [string[]]$Arguments) {
  $priorPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $output = @(& git -C $WorkingDirectory @Arguments 2>&1)
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $priorPreference
  }
  if ($exitCode -ne 0) {
    throw "Fixture Git command failed: git -C $WorkingDirectory $($Arguments -join ' ')`n$($output -join "`n")"
  }
  ($output | ForEach-Object { $_.ToString() }) -join [Environment]::NewLine
}

$waitInbox = @'
Inbox-Version: `59`
Current-Task: `E1-WP1-ACCEPTED-WAIT`
Status: `WAIT`
Accepted-Root-Base: `a246987fb678712af022b46f3b23ad22f4d22b2a`
Required-Work-Branch: `none-e1-accepted-wait`
Full-Brief: `reports/agent-handoffs/wait-v59.md`
'@
$wait = ConvertFrom-KimiInbox -Text $waitInbox
Assert-Equal 59 $wait.Version 'Version parsing failed.'
Assert-Equal 'idle' (Get-InboxDecision -Inbox $wait -PreviousState $null) 'New WAIT must be idle.'
Assert-Equal 'unchanged' (Get-InboxDecision -Inbox $wait -PreviousState ([pscustomobject]@{ lastObservedVersion = 59 })) 'Unchanged WAIT must stay idle.'

$startInbox = @'
Inbox-Version: `60`
Current-Task: `F3-WP1-DIRECTOR-UI`
Status: `START_NOW`
Accepted-Root-Base: `0123456789abcdef0123456789abcdef01234567`
Required-Work-Branch: `agent/kimi-f3-wp1-director-ui`
Full-Brief: `reports/agent-handoffs/f3-wp1-v60.md`
Issue: `#66`
'@
$start = ConvertFrom-KimiInbox -Text $startInbox
Assert-Equal 'launch' (Get-InboxDecision -Inbox $start -PreviousState ([pscustomobject]@{ lastObservedVersion = 59 })) 'Higher START_NOW must launch.'
Assert-Equal 'unchanged' (Get-InboxDecision -Inbox $start -PreviousState ([pscustomobject]@{ lastObservedVersion = 60 })) 'Processed START_NOW must not relaunch.'
$pendingDecisionState = [pscustomobject]@{
  lastObservedVersion = 60
  lastLaunchedVersion = $null
  pendingLaunchVersion = 60
  pendingTask = $start.Task
  pendingAcceptedBase = $start.AcceptedBase
  pendingRequiredBranch = $start.RequiredBranch
  pendingFullBrief = $start.FullBrief
  pendingIssue = $start.Issue
}
Assert-Equal 'launch' (Get-InboxDecision -Inbox $start -PreviousState $pendingDecisionState) 'Matching dry-run identity must remain launchable.'
$changedStart = $start | Select-Object *
$changedStart.Task = 'F3-WP1-CHANGED-WITHOUT-VERSION'
Assert-Equal 'conflict' (Get-InboxDecision -Inbox $changedStart -PreviousState $pendingDecisionState) 'Same-version pending identity drift must fail closed.'
Assert-Equal $true (Test-SafeBriefPath -Path $start.FullBrief) 'Valid brief path rejected.'
Assert-Equal $false (Test-SafeBriefPath -Path 'reports/agent-handoffs/../secret.md') 'Traversal brief path accepted.'
Assert-Equal $false (Test-SafeBriefPath -Path 'C:\secret.md') 'Rooted brief path accepted.'

$duplicateRejected = $false
try { ConvertFrom-KimiInbox -Text ($waitInbox + [Environment]::NewLine + 'Status: `HOLD`') | Out-Null } catch { $duplicateRejected = $true }
Assert-Equal $true $duplicateRejected 'Duplicate status header must fail closed.'

$unknownRejected = $false
try { ConvertFrom-KimiInbox -Text ($waitInbox -replace 'Status: `WAIT`', 'Status: `MAYBE`') | Out-Null } catch { $unknownRejected = $true }
Assert-Equal $true $unknownRejected 'Unknown status must fail closed.'

$fixtureRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("storystage-kimi-watcher-{0}" -f [guid]::NewGuid().ToString('N'))
try {
  $remote = Join-Path $fixtureRoot 'remote.git'
  $source = Join-Path $fixtureRoot 'source'
  New-Item -ItemType Directory -Path $remote, $source -Force | Out-Null
  Invoke-TestGit $remote @('init', '--bare') | Out-Null
  Invoke-TestGit $source @('init') | Out-Null
  Invoke-TestGit $source @('config', 'user.name', 'StoryStage watcher test') | Out-Null
  Invoke-TestGit $source @('config', 'user.email', 'watcher-test@invalid.example') | Out-Null
  [System.IO.File]::WriteAllText((Join-Path $source 'README.md'), "fixture`n")
  Invoke-TestGit $source @('add', 'README.md') | Out-Null
  Invoke-TestGit $source @('commit', '-m', 'fixture base') | Out-Null
  Invoke-TestGit $source @('branch', '-M', 'product/v1') | Out-Null
  Invoke-TestGit $source @('remote', 'add', 'origin', $remote) | Out-Null
  Invoke-TestGit $source @('push', '-u', 'origin', 'product/v1') | Out-Null
  $base = (Invoke-TestGit $source @('rev-parse', 'HEAD')).Trim()
  Invoke-TestGit $source @('switch', '-c', 'agent/kimi-frontend') | Out-Null

  $handoffRoot = Join-Path $source 'reports\agent-handoffs'
  New-Item -ItemType Directory -Path $handoffRoot -Force | Out-Null
  $briefPath = Join-Path $handoffRoot 'fixture-v60.md'
  $branch = 'agent/kimi-fixture-v60'
  $brief = "# Fixture`n`nExact base: ``$base```nRequired branch: ``$branch```nTracking issue: #66`n"
  [System.IO.File]::WriteAllText($briefPath, $brief, [System.Text.UTF8Encoding]::new($false))
  $inboxPath = Join-Path $handoffRoot 'KIMI_INBOX.md'
  $fixtureInbox = @"
Inbox-Version: ``60``
Current-Task: ``F3-WP1-FIXTURE``
Status: ``START_NOW``
Accepted-Root-Base: ``$base``
Required-Work-Branch: ``$branch``
Full-Brief: ``reports/agent-handoffs/fixture-v60.md``
Issue: ``#66``
"@
  [System.IO.File]::WriteAllText($inboxPath, $fixtureInbox, [System.Text.UTF8Encoding]::new($false))
  Invoke-TestGit $source @('add', 'reports/agent-handoffs/KIMI_INBOX.md', 'reports/agent-handoffs/fixture-v60.md') | Out-Null
  Invoke-TestGit $source @('commit', '-m', 'fixture START_NOW') | Out-Null
  Invoke-TestGit $source @('push', '-u', 'origin', 'agent/kimi-frontend') | Out-Null

  $fixtureState = Join-Path $fixtureRoot 'state'
  $first = Invoke-KimiWatcherPoll -Root $fixtureState -Url $remote -Executable 'kimi.exe' -DryRun
  Assert-Equal 'launch' $first.Decision 'Valid higher START_NOW must reach the launch decision.'
  Assert-Equal $false $first.Launched 'Dry-run START_NOW must not launch Kimi.'
  $pendingState = Get-Content -Raw -LiteralPath (Join-Path $fixtureState 'state.json') -Encoding utf8 | ConvertFrom-Json
  Assert-Equal 60 $pendingState.pendingLaunchVersion 'Dry-run START_NOW must remain pending.'
  $second = Invoke-KimiWatcherPoll -Root $fixtureState -Url $remote -Executable 'powershell.exe' -ProcessStarter {
    param($Arguments)
    [pscustomobject]@{ Id = 6060 }
  }
  Assert-Equal 'launch' $second.Decision 'The real poll after a dry run must launch the pending version.'
  Assert-Equal $true $second.Launched 'Pending START_NOW must launch exactly once.'
  $third = Invoke-KimiWatcherPoll -Root $fixtureState -Url $remote -Executable 'kimi.exe' -DryRun
  Assert-Equal 'unchanged' $third.Decision 'A launched START_NOW version must not relaunch.'
  $receipt = Get-Content -Raw -LiteralPath (Join-Path $fixtureState 'launches\v60.json') -Encoding utf8 | ConvertFrom-Json
  Assert-Equal 60 $receipt.inboxVersion 'Launch receipt version mismatch.'
  Assert-Equal $branch $receipt.requiredBranch 'Launch receipt branch mismatch.'

  $crashState = Join-Path $fixtureRoot 'crash-state'
  $simulatedCrash = $false
  try {
    Invoke-KimiWatcherPoll -Root $crashState -Url $remote -Executable 'powershell.exe' -ProcessStarter {
      param($Arguments)
      throw 'simulated process-boundary failure'
    } | Out-Null
  } catch {
    $simulatedCrash = $_.Exception.Message -match 'simulated process-boundary failure'
  }
  Assert-Equal $true $simulatedCrash 'Simulated process-boundary failure was not surfaced.'
  $reservedState = Get-Content -Raw -LiteralPath (Join-Path $crashState 'state.json') -Encoding utf8 | ConvertFrom-Json
  Assert-Equal 60 $reservedState.lastLaunchedVersion 'Launch version must be reserved before process startup.'
  Assert-Equal 'reserved' $reservedState.lastLaunchState 'Failed process startup must retain its reserved state.'
  $afterCrash = Invoke-KimiWatcherPoll -Root $crashState -Url $remote -Executable 'kimi.exe' -DryRun
  Assert-Equal 'unchanged' $afterCrash.Decision 'A reserved version must not relaunch after a watcher failure.'

  $fakeProcess = [pscustomobject]@{ Id = 7070; ExitCode = 0 }
  $fakeProcess | Add-Member -MemberType ScriptMethod -Name WaitForExit -Value {
    param($Milliseconds)
    return $false
  }
  $script:stoppedProcessId = 0
  $timeoutOutcome = Invoke-BoundedKimiProcess -Executable 'kimi.exe' -Prompt 'bounded fixture prompt' -Directory $source -StandardOutputPath (Join-Path $fixtureRoot 'stdout.log') -StandardErrorPath (Join-Path $fixtureRoot 'stderr.log') -TimeoutSeconds 1 -ProcessStarter {
    param($Arguments)
    $fakeProcess
  } -ProcessTreeStopper {
    param($ProcessId)
    $script:stoppedProcessId = $ProcessId
    return $true
  }
  Assert-Equal $true $timeoutOutcome.TimedOut 'A stuck Kimi process must time out.'
  Assert-Equal 124 $timeoutOutcome.ExitCode 'A timed-out Kimi process must use exit code 124.'
  Assert-Equal 7070 $script:stoppedProcessId 'Timeout must terminate the launched process tree.'
  Assert-Equal $true $timeoutOutcome.TerminationSucceeded 'Successful process-tree termination must be recorded.'
} finally {
  $resolvedTemp = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
  $resolvedFixture = [System.IO.Path]::GetFullPath($fixtureRoot)
  if ($resolvedFixture.StartsWith($resolvedTemp, [StringComparison]::OrdinalIgnoreCase) -and
      (Split-Path -Leaf $resolvedFixture).StartsWith('storystage-kimi-watcher-', [StringComparison]::Ordinal)) {
    if (Test-Path -LiteralPath $resolvedFixture) { Remove-Item -LiteralPath $resolvedFixture -Recurse -Force }
  } else {
    throw 'Refusing to remove an unexpected watcher fixture path.'
  }
}

Write-Output 'Kimi inbox watcher unit checks PASS.'
