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
  Invoke-TestGit $remote @('symbolic-ref', 'HEAD', 'refs/heads/product/v1') | Out-Null
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
  $script:capturedWatcherArguments = $null
  $second = Invoke-KimiWatcherPoll -Root $fixtureState -Url $remote -Executable 'powershell.exe' -ProcessStarter {
    param($Arguments)
    $script:capturedWatcherArguments = @($Arguments)
    [pscustomobject]@{ Id = 6060 }
  }
  Assert-Equal 'launch' $second.Decision 'The real poll after a dry run must launch the pending version.'
  Assert-Equal $true $second.Launched 'Pending START_NOW must launch exactly once.'
  $workingDirectoryIndex = [Array]::IndexOf($script:capturedWatcherArguments, '-WorkingDirectory')
  Assert-Equal $true ($workingDirectoryIndex -ge 0) 'Watcher launch omitted the assignment working directory.'
  $launchedWorkspace = $script:capturedWatcherArguments[$workingDirectoryIndex + 1].Trim('"')
  $expectedWorkspace = Get-AssignmentWorkspacePath -Root $fixtureState -Version 60
  Assert-Equal $expectedWorkspace $launchedWorkspace 'Watcher passed the wrong assignment working directory.'
  Assert-Equal $false ($launchedWorkspace -eq (Join-Path $fixtureState 'repo')) 'Watcher passed the no-checkout control clone to Kimi.'
  Assert-Equal $base (Invoke-TestGit $launchedWorkspace @('rev-parse', 'HEAD')).Trim() 'Assignment workspace HEAD must equal the accepted base.'
  $detachedResult = Invoke-CheckedGit -Arguments @('-C', $launchedWorkspace, 'symbolic-ref', '--quiet', 'HEAD') -AllowFailure
  Assert-Equal 1 $detachedResult.ExitCode 'Assignment workspace must begin detached.'
  Assert-Equal '' (Invoke-TestGit $launchedWorkspace @('status', '--porcelain=v1', '--untracked-files=all')).Trim() 'Assignment workspace must begin clean.'
  $controlStatus = (Invoke-TestGit (Join-Path $fixtureState 'repo') @('status', '--short')).Trim()
  Assert-Equal $true (-not [string]::IsNullOrWhiteSpace($controlStatus)) 'Fixture control clone must reproduce the dirty no-checkout state.'
  $third = Invoke-KimiWatcherPoll -Root $fixtureState -Url $remote -Executable 'kimi.exe' -DryRun
  Assert-Equal 'unchanged' $third.Decision 'A launched START_NOW version must not relaunch.'
  $receipt = Get-Content -Raw -LiteralPath (Join-Path $fixtureState 'launches\v60.json') -Encoding utf8 | ConvertFrom-Json
  Assert-Equal 60 $receipt.inboxVersion 'Launch receipt version mismatch.'
  Assert-Equal $branch $receipt.requiredBranch 'Launch receipt branch mismatch.'
  Assert-Equal $expectedWorkspace $receipt.workingDirectory 'Launch receipt must pin the exact assignment workspace.'

  Assert-PinnedKimiWorkspace -Directory $expectedWorkspace -Launch $receipt
  $dirtySentinel = Join-Path $expectedWorkspace 'watcher-dirty-sentinel.txt'
  [System.IO.File]::WriteAllText($dirtySentinel, 'dirty')
  $dirtyRejected = $false
  try { Assert-PinnedKimiWorkspace -Directory $expectedWorkspace -Launch $receipt } catch { $dirtyRejected = $_.Exception.Message -match 'not clean' }
  Assert-Equal $true $dirtyRejected 'Runner must reject an untracked file before Kimi starts.'
  Remove-Item -LiteralPath $dirtySentinel -Force

  $wrongHeadLaunch = $receipt | Select-Object *
  $wrongHeadLaunch.acceptedBase = '0000000000000000000000000000000000000000'
  $wrongHeadRejected = $false
  try { Assert-PinnedKimiWorkspace -Directory $expectedWorkspace -Launch $wrongHeadLaunch } catch { $wrongHeadRejected = $_.Exception.Message -match 'HEAD changed' }
  Assert-Equal $true $wrongHeadRejected 'Runner must reject a clean workspace at the wrong exact SHA.'

  Invoke-TestGit $expectedWorkspace @('switch', '-c', 'fixture-attached-head') | Out-Null
  $attachedRejected = $false
  try { Assert-PinnedKimiWorkspace -Directory $expectedWorkspace -Launch $receipt } catch { $attachedRejected = $_.Exception.Message -match 'no longer detached' }
  Assert-Equal $true $attachedRejected 'Runner must reject an attached assignment workspace.'
  Invoke-TestGit $expectedWorkspace @('switch', '--detach', $base) | Out-Null

  $wrongPathLaunch = $receipt | Select-Object *
  $wrongPathLaunch.workingDirectory = Join-Path $fixtureState 'repo'
  $wrongPathRejected = $false
  try { Assert-PinnedKimiWorkspace -Directory $expectedWorkspace -Launch $wrongPathLaunch } catch { $wrongPathRejected = $_.Exception.Message -match 'does not match' }
  Assert-Equal $true $wrongPathRejected 'Runner must reject a checkout outside the pinned version workspace.'

  $existingState = Join-Path $fixtureRoot 'existing-workspace-state'
  $existingWorkspace = Get-AssignmentWorkspacePath -Root $existingState -Version 60
  New-Item -ItemType Directory -Path $existingWorkspace -Force | Out-Null
  $sentinelPath = Join-Path $existingWorkspace 'sentinel.txt'
  [System.IO.File]::WriteAllText($sentinelPath, 'preserve me')
  $existingRejected = $false
  try {
    New-AssignmentWorkspace -Root $existingState -Url $remote -Inbox $start | Out-Null
  } catch {
    $existingRejected = $_.Exception.Message -match 'refusing to reuse or delete'
  }
  Assert-Equal $true $existingRejected 'Watcher must reject a pre-existing version workspace.'
  Assert-Equal 'preserve me' ([System.IO.File]::ReadAllText($sentinelPath)) 'Watcher altered a pre-existing version workspace.'

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
  $script:capturedKimiArguments = $null
  $timeoutOutcome = Invoke-BoundedKimiProcess -Executable 'kimi.exe' -Prompt 'bounded fixture prompt' -Directory $source -StandardOutputPath (Join-Path $fixtureRoot 'stdout.log') -StandardErrorPath (Join-Path $fixtureRoot 'stderr.log') -TimeoutSeconds 1 -ProcessStarter {
    param($Arguments)
    $script:capturedKimiArguments = @($Arguments)
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
  Assert-Equal 4 $script:capturedKimiArguments.Count 'Kimi prompt launch argument count changed unexpectedly.'
  Assert-Equal '--prompt' $script:capturedKimiArguments[0] 'Kimi prompt mode flag is missing.'
  Assert-Equal '"bounded fixture prompt"' $script:capturedKimiArguments[1] 'Kimi prompt argument changed unexpectedly.'
  Assert-Equal '--output-format' $script:capturedKimiArguments[2] 'Kimi structured-output flag is missing.'
  Assert-Equal 'stream-json' $script:capturedKimiArguments[3] 'Kimi structured-output value changed unexpectedly.'
  Assert-Equal $false ($script:capturedKimiArguments -contains '--auto') 'Prompt mode must not pass incompatible --auto.'
  Assert-Equal $false ($script:capturedKimiArguments -contains '--yolo') 'Watcher must never pass --yolo.'
  Assert-Equal $false ($script:capturedKimiArguments -contains '--plan') 'Prompt mode must not pause for plan approval.'
  Assert-Equal $false ($script:capturedKimiArguments -contains 'acp') 'Watcher must not start Kimi ACP mode.'
  Assert-Equal $false ($script:capturedKimiArguments -contains 'web') 'Watcher must not start Kimi web mode.'

  $completedWithoutExitCode = [pscustomobject]@{ Id = 8080; ExitCode = $null }
  $completedWithoutExitCode | Add-Member -MemberType ScriptMethod -Name WaitForExit -Value {
    param($Milliseconds)
    if ($PSBoundParameters.ContainsKey('Milliseconds')) { return $true }
  }
  $missingExitOutcome = Invoke-BoundedKimiProcess -Executable 'kimi.exe' -Prompt 'completed without exit code' -Directory $source -StandardOutputPath (Join-Path $fixtureRoot 'stdout-null-exit.log') -StandardErrorPath (Join-Path $fixtureRoot 'stderr-null-exit.log') -TimeoutSeconds 1 -ProcessStarter {
    param($Arguments)
    $completedWithoutExitCode
  }
  Assert-Equal 1 $missingExitOutcome.ExitCode 'A completed process without an exit code must fail closed.'
  Assert-Equal $false $missingExitOutcome.TimedOut 'Missing exit code is a startup/completion failure, not a timeout.'

  $failedStopOutcome = Invoke-BoundedKimiProcess -Executable 'kimi.exe' -Prompt 'bounded failed-stop fixture' -Directory $source -StandardOutputPath (Join-Path $fixtureRoot 'stdout-2.log') -StandardErrorPath (Join-Path $fixtureRoot 'stderr-2.log') -TimeoutSeconds 1 -ProcessStarter {
    param($Arguments)
    $fakeProcess
  } -ProcessTreeStopper {
    param($ProcessId)
    return $false
  }
  Assert-Equal $false $failedStopOutcome.TerminationSucceeded 'Failed process-tree termination must remain visible.'

  Invoke-TestGit $source @('branch', $branch, $base) | Out-Null
  Invoke-TestGit $source @('push', 'origin', $branch) | Out-Null
  $collisionState = Join-Path $fixtureRoot 'remote-branch-collision-state'
  $collisionInbox = $start | Select-Object *
  $collisionInbox.RequiredBranch = $branch
  $collisionInbox.AcceptedBase = $base
  $branchCollisionRejected = $false
  try {
    New-AssignmentWorkspace -Root $collisionState -Url $remote -Inbox $collisionInbox | Out-Null
  } catch {
    $branchCollisionRejected = $_.Exception.Message -match 'already exists on origin'
  }
  Assert-Equal $true $branchCollisionRejected 'Watcher must reject an existing remote required branch.'
  Assert-Equal $false (Test-Path -LiteralPath (Get-AssignmentWorkspacePath -Root $collisionState -Version 60)) 'Branch collision must not create a workspace.'
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
