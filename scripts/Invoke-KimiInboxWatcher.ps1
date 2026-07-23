[CmdletBinding()]
param(
  [string]$RepositoryUrl = 'https://github.com/truthunknown2-art/StoryStage.git',
  [string]$StateRoot = (Join-Path $env:LOCALAPPDATA 'StoryStage\coordination'),
  [string]$KimiPath = 'kimi.exe',
  [switch]$NoLaunch,
  [switch]$SkipFetch,
  [switch]$LibraryOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:WatcherVersion = 1
$script:InboxRef = 'refs/remotes/origin/agent/kimi-frontend'
$script:ProductRef = 'refs/remotes/origin/product/v1'

function Write-AtomicJson {
  param(
    [Parameter(Mandatory)] [string]$Path,
    [Parameter(Mandatory)] [object]$Value
  )

  $directory = Split-Path -Parent $Path
  New-Item -ItemType Directory -Path $directory -Force | Out-Null
  $temporary = Join-Path $directory ('.{0}.{1}.tmp' -f (Split-Path -Leaf $Path), [guid]::NewGuid().ToString('N'))
  $json = $Value | ConvertTo-Json -Depth 12
  [System.IO.File]::WriteAllText($temporary, $json, [System.Text.UTF8Encoding]::new($false))
  Move-Item -LiteralPath $temporary -Destination $Path -Force
}

function Write-WatcherLog {
  param(
    [Parameter(Mandatory)] [string]$Root,
    [Parameter(Mandatory)] [string]$Message
  )

  $logDirectory = Join-Path $Root 'logs'
  New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
  $line = '{0} {1}' -f [DateTimeOffset]::UtcNow.ToString('o'), $Message
  Add-Content -LiteralPath (Join-Path $logDirectory 'watcher.log') -Value $line -Encoding utf8
}

function Invoke-CheckedGit {
  param(
    [Parameter(Mandatory)] [string[]]$Arguments,
    [switch]$AllowFailure
  )

  $priorPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $output = @(& git @Arguments 2>&1)
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $priorPreference
  }
  $text = ($output | ForEach-Object { $_.ToString() }) -join [Environment]::NewLine
  if (-not $AllowFailure -and $exitCode -ne 0) {
    throw "Git command failed with exit code $exitCode."
  }

  [pscustomobject]@{
    ExitCode = $exitCode
    Output = $text.Trim()
  }
}

function Get-UniqueInboxHeader {
  param(
    [Parameter(Mandatory)] [string]$Text,
    [Parameter(Mandatory)] [string]$Name,
    [switch]$Optional
  )

  $pattern = '(?m)^' + [regex]::Escape($Name) + ':\s*`?([^`\r\n]+?)`?\s*$'
  $matches = [regex]::Matches($Text, $pattern)
  if ($matches.Count -eq 0 -and $Optional) { return $null }
  if ($matches.Count -ne 1) {
    throw "Inbox header '$Name' must appear exactly once."
  }
  $matches[0].Groups[1].Value.Trim()
}

function ConvertFrom-KimiInbox {
  param([Parameter(Mandatory)] [string]$Text)

  $rawVersion = Get-UniqueInboxHeader -Text $Text -Name 'Inbox-Version'
  $version = 0
  if (-not [int]::TryParse($rawVersion, [ref]$version) -or $version -lt 1) {
    throw 'Inbox-Version must be a positive integer.'
  }

  $status = (Get-UniqueInboxHeader -Text $Text -Name 'Status').ToUpperInvariant().Replace('-', '_')
  if (@('WAIT', 'HOLD', 'STOP', 'DONE', 'BLOCKED', 'START_NOW') -notcontains $status) {
    throw "Unsupported Kimi inbox status '$status'."
  }

  [pscustomobject]@{
    Version = $version
    Task = Get-UniqueInboxHeader -Text $Text -Name 'Current-Task'
    Status = $status
    AcceptedBase = Get-UniqueInboxHeader -Text $Text -Name 'Accepted-Root-Base'
    RequiredBranch = Get-UniqueInboxHeader -Text $Text -Name 'Required-Work-Branch'
    FullBrief = Get-UniqueInboxHeader -Text $Text -Name 'Full-Brief'
    Issue = Get-UniqueInboxHeader -Text $Text -Name 'Issue' -Optional
  }
}

function Test-SafeBriefPath {
  param([Parameter(Mandatory)] [string]$Path)
  $Path -match '^reports/agent-handoffs/[A-Za-z0-9._/-]+\.md$' -and
    $Path -notmatch '(^|/)\.\.(/|$)' -and
    $Path -notmatch '\\'
}

function Get-InboxDecision {
  param(
    [Parameter(Mandatory)] [object]$Inbox,
    [AllowNull()] [object]$PreviousState
  )

  $previousVersion = if ($null -eq $PreviousState -or $null -eq $PreviousState.lastObservedVersion) {
    0
  } else {
    [int]$PreviousState.lastObservedVersion
  }

  if ($Inbox.Version -lt $previousVersion) { return 'rollback' }
  if ($Inbox.Version -eq $previousVersion) {
    $pendingVersion = if ($null -ne $PreviousState -and
        $null -ne $PreviousState.PSObject.Properties['pendingLaunchVersion']) {
      [int]$PreviousState.pendingLaunchVersion
    } else { 0 }
    $launchedVersion = if ($null -ne $PreviousState -and
        $null -ne $PreviousState.PSObject.Properties['lastLaunchedVersion'] -and
        $null -ne $PreviousState.lastLaunchedVersion) {
      [int]$PreviousState.lastLaunchedVersion
    } else { 0 }
    if ($Inbox.Status -eq 'START_NOW' -and $pendingVersion -eq $Inbox.Version -and
        $launchedVersion -ne $Inbox.Version) {
      foreach ($pair in @(
          @('pendingTask', $Inbox.Task),
          @('pendingAcceptedBase', $Inbox.AcceptedBase),
          @('pendingRequiredBranch', $Inbox.RequiredBranch),
          @('pendingFullBrief', $Inbox.FullBrief),
          @('pendingIssue', $Inbox.Issue)
        )) {
        $property = $PreviousState.PSObject.Properties[$pair[0]]
        if ($null -eq $property -or [string]$property.Value -ne [string]$pair[1]) {
          return 'conflict'
        }
      }
      return 'launch'
    }
    return 'unchanged'
  }
  if ($Inbox.Status -eq 'START_NOW') { return 'launch' }
  'idle'
}

function Get-TextSha256 {
  param([Parameter(Mandatory)] [string]$Text)
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    ([BitConverter]::ToString($sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($Text)))).Replace('-', '').ToLowerInvariant()
  } finally {
    $sha.Dispose()
  }
}

function Read-WatcherState {
  param([Parameter(Mandatory)] [string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return $null }
  Get-Content -Raw -LiteralPath $Path -Encoding utf8 | ConvertFrom-Json
}

function Ensure-CoordinationClone {
  param(
    [Parameter(Mandatory)] [string]$Root,
    [Parameter(Mandatory)] [string]$Url,
    [switch]$NoFetch
  )

  $repo = Join-Path $Root 'repo'
  if (-not (Test-Path -LiteralPath (Join-Path $repo '.git'))) {
    New-Item -ItemType Directory -Path $Root -Force | Out-Null
    Invoke-CheckedGit -Arguments @('clone', '--no-checkout', '--origin', 'origin', $Url, $repo) | Out-Null
  }

  $remote = (Invoke-CheckedGit -Arguments @('-C', $repo, 'remote', 'get-url', 'origin')).Output
  if ($remote -ne $Url) { throw 'Coordination clone origin does not match the configured StoryStage repository.' }

  if (-not $NoFetch) {
    Invoke-CheckedGit -Arguments @(
      '-C', $repo, 'fetch', '--quiet', '--no-tags', 'origin',
      '+refs/heads/product/v1:refs/remotes/origin/product/v1',
      '+refs/heads/agent/kimi-frontend:refs/remotes/origin/agent/kimi-frontend'
    ) | Out-Null
  }
  $repo
}

function Assert-StartNowAssignment {
  param(
    [Parameter(Mandatory)] [object]$Inbox,
    [Parameter(Mandatory)] [string]$Repo
  )

  if ($Inbox.Task -match '(?i)(wait|hold)' -or [string]::IsNullOrWhiteSpace($Inbox.Task)) {
    throw 'START_NOW requires a concrete non-wait task.'
  }
  if ($Inbox.Task -notmatch '^[A-Za-z0-9._/-]+$') {
    throw 'START_NOW requires a safe machine-readable task identifier.'
  }
  if ($Inbox.AcceptedBase -notmatch '^[0-9a-f]{40}$') {
    throw 'START_NOW requires a full 40-character accepted base SHA.'
  }
  if ($Inbox.RequiredBranch -notmatch '^agent/[A-Za-z0-9._/-]+$' -or
      $Inbox.RequiredBranch -match '(^|/)\.\.(/|$)') {
    throw 'START_NOW requires a safe agent work branch.'
  }
  if (-not (Test-SafeBriefPath -Path $Inbox.FullBrief)) {
    throw 'START_NOW requires a safe Markdown full-brief path under reports/agent-handoffs.'
  }
  if ($null -eq $Inbox.Issue -or $Inbox.Issue -notmatch '^#?([1-9][0-9]*)$') {
    throw 'START_NOW requires an explicit Issue header.'
  }

  $baseExists = Invoke-CheckedGit -Arguments @('-C', $Repo, 'cat-file', '-e', "$($Inbox.AcceptedBase)^{commit}") -AllowFailure
  if ($baseExists.ExitCode -ne 0) { throw 'The accepted base commit is unavailable.' }
  $ancestor = Invoke-CheckedGit -Arguments @('-C', $Repo, 'merge-base', '--is-ancestor', $Inbox.AcceptedBase, $script:ProductRef) -AllowFailure
  if ($ancestor.ExitCode -ne 0) { throw 'The accepted base is not in product/v1 history.' }

  $brief = (Invoke-CheckedGit -Arguments @('-C', $Repo, 'show', "$($script:InboxRef):$($Inbox.FullBrief)")).Output
  $issueNumber = $Inbox.Issue.TrimStart('#')
  foreach ($required in @($Inbox.AcceptedBase, $Inbox.RequiredBranch, "#$issueNumber")) {
    if (-not $brief.Contains($required)) { throw "The full brief does not contain required assignment identity '$required'." }
  }
  $brief
}

function Get-AssignmentWorkspacePath {
  param(
    [Parameter(Mandatory)] [string]$Root,
    [Parameter(Mandatory)] [int]$Version
  )

  $resolvedRoot = [System.IO.Path]::GetFullPath($Root).TrimEnd('\', '/')
  $workspace = [System.IO.Path]::GetFullPath((Join-Path $resolvedRoot ("workspaces\v{0}" -f $Version)))
  $requiredPrefix = $resolvedRoot + [System.IO.Path]::DirectorySeparatorChar
  if (-not $workspace.StartsWith($requiredPrefix, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Assignment workspace resolves outside the watcher state root.'
  }
  $workspace
}

function Assert-CleanAssignmentWorkspace {
  param(
    [Parameter(Mandatory)] [string]$Workspace,
    [Parameter(Mandatory)] [string]$Url,
    [Parameter(Mandatory)] [string]$AcceptedBase
  )

  if (-not (Test-Path -LiteralPath (Join-Path $Workspace '.git'))) {
    throw 'Assignment workspace is not a Git checkout.'
  }
  $remote = (Invoke-CheckedGit -Arguments @('-C', $Workspace, 'remote', 'get-url', 'origin')).Output
  if ($remote -ne $Url) { throw 'Assignment workspace origin does not match the configured StoryStage repository.' }
  $head = (Invoke-CheckedGit -Arguments @('-C', $Workspace, 'rev-parse', 'HEAD')).Output
  if ($head -ne $AcceptedBase) { throw 'Assignment workspace HEAD does not equal the exact accepted base.' }
  $symbolicHead = Invoke-CheckedGit -Arguments @('-C', $Workspace, 'symbolic-ref', '--quiet', 'HEAD') -AllowFailure
  if ($symbolicHead.ExitCode -eq 0) { throw 'Assignment workspace must begin on a detached exact-base HEAD.' }
  if ($symbolicHead.ExitCode -ne 1) { throw 'Unable to verify detached assignment workspace HEAD.' }
  $status = (Invoke-CheckedGit -Arguments @('-C', $Workspace, 'status', '--porcelain=v1', '--untracked-files=all')).Output
  if (-not [string]::IsNullOrWhiteSpace($status)) { throw 'Assignment workspace is not clean.' }
}

function New-AssignmentWorkspace {
  param(
    [Parameter(Mandatory)] [string]$Root,
    [Parameter(Mandatory)] [string]$Url,
    [Parameter(Mandatory)] [object]$Inbox
  )

  $workspace = Get-AssignmentWorkspacePath -Root $Root -Version $Inbox.Version
  if (Test-Path -LiteralPath $workspace) {
    throw "Assignment workspace already exists for inbox v$($Inbox.Version); refusing to reuse or delete it."
  }
  $remoteBranch = Invoke-CheckedGit -Arguments @('ls-remote', '--exit-code', '--heads', $Url, "refs/heads/$($Inbox.RequiredBranch)") -AllowFailure
  if ($remoteBranch.ExitCode -eq 0) { throw 'The required work branch already exists on origin.' }
  if ($remoteBranch.ExitCode -ne 2) { throw 'Unable to verify that the required work branch is absent on origin.' }

  New-Item -ItemType Directory -Path (Split-Path -Parent $workspace) -Force | Out-Null
  Invoke-CheckedGit -Arguments @('clone', '--no-checkout', '--origin', 'origin', $Url, $workspace) | Out-Null
  Invoke-CheckedGit -Arguments @('-C', $workspace, 'checkout', '--detach', $Inbox.AcceptedBase) | Out-Null
  Assert-CleanAssignmentWorkspace -Workspace $workspace -Url $Url -AcceptedBase $Inbox.AcceptedBase
  $workspace
}

function New-AssignmentPrompt {
  param([Parameter(Mandatory)] [object]$Inbox)
  $issue = $Inbox.Issue.TrimStart('#')
  @"
StoryStage deterministic watcher authorized inbox version $($Inbox.Version), task $($Inbox.Task).
GitHub is the source of truth. First fetch origin without resetting, rebasing, or force-pushing. Read
$($script:InboxRef):reports/agent-handoffs/KIMI_INBOX.md and its full brief $($Inbox.FullBrief), then issue #$issue.
Verify exact base $($Inbox.AcceptedBase) and required branch $($Inbox.RequiredBranch). Post the required claim, execute only that frontend brief, run its checks and evidence, commit and push the exact branch, open/update its draft PR, leave the complete handback, then exit. If any identity, scope, branch, base, status, or evidence conflicts, stop fail closed and report it. Do not begin another package and do not create a polling loop.
"@.Trim()
}

function Invoke-KimiWatcherPoll {
  param(
    [Parameter(Mandatory)] [string]$Root,
    [Parameter(Mandatory)] [string]$Url,
    [Parameter(Mandatory)] [string]$Executable,
    [switch]$DryRun,
    [switch]$NoFetch,
    [scriptblock]$ProcessStarter
  )

  New-Item -ItemType Directory -Path $Root -Force | Out-Null
  $mutex = [System.Threading.Mutex]::new($false, 'Local\StoryStage-KimiInboxWatcher')
  if (-not $mutex.WaitOne(0)) {
    Write-WatcherLog -Root $Root -Message 'SKIP overlap: another watcher instance owns the lock.'
    return [pscustomobject]@{ Decision = 'overlap'; Launched = $false }
  }

  try {
    $repo = Ensure-CoordinationClone -Root $Root -Url $Url -NoFetch:$NoFetch
    $inboxText = (Invoke-CheckedGit -Arguments @('-C', $repo, 'show', "$($script:InboxRef):reports/agent-handoffs/KIMI_INBOX.md")).Output
    $inbox = ConvertFrom-KimiInbox -Text $inboxText
    $statePath = Join-Path $Root 'state.json'
    $previous = Read-WatcherState -Path $statePath
    $decision = Get-InboxDecision -Inbox $inbox -PreviousState $previous
    if ($decision -eq 'rollback') { throw 'Inbox-Version moved backwards; refusing to process it.' }
    if ($decision -eq 'conflict') { throw 'Pending START_NOW identity changed without a higher Inbox-Version.' }
    if ($decision -eq 'unchanged') {
      Write-WatcherLog -Root $Root -Message "IDLE unchanged inbox v$($inbox.Version) $($inbox.Status); no Kimi launch."
      return [pscustomobject]@{ Decision = $decision; Version = $inbox.Version; Launched = $false }
    }

    $state = [ordered]@{
      watcherVersion = $script:WatcherVersion
      lastObservedVersion = $inbox.Version
      lastObservedStatus = $inbox.Status
      lastObservedTask = $inbox.Task
      observedAt = [DateTimeOffset]::UtcNow.ToString('o')
      lastLaunchedVersion = if ($null -ne $previous) { $previous.lastLaunchedVersion } else { $null }
      lastLaunchPid = if ($null -ne $previous) { $previous.lastLaunchPid } else { $null }
      pendingLaunchVersion = $null
      lastError = $null
    }

    if ($decision -eq 'idle') {
      Write-AtomicJson -Path $statePath -Value $state
      Write-WatcherLog -Root $Root -Message "IDLE inbox v$($inbox.Version) $($inbox.Status); no Kimi launch."
      return [pscustomobject]@{ Decision = $decision; Version = $inbox.Version; Launched = $false }
    }

    try {
      $validatedBrief = Assert-StartNowAssignment -Inbox $inbox -Repo $repo
      $briefHash = Get-TextSha256 -Text $validatedBrief
      if ($null -ne $previous -and
          $null -ne $previous.PSObject.Properties['pendingBriefSha256'] -and
          -not [string]::IsNullOrWhiteSpace([string]$previous.pendingBriefSha256) -and
          [string]$previous.pendingBriefSha256 -ne $briefHash) {
        throw 'Pending START_NOW brief changed without a higher Inbox-Version.'
      }
      $prompt = New-AssignmentPrompt -Inbox $inbox
      $launchDirectory = Join-Path $Root 'launches'
      $launchPath = Join-Path $launchDirectory ("v{0}.json" -f $inbox.Version)
      $launch = [ordered]@{
        schemaVersion = 1
        inboxVersion = $inbox.Version
        task = $inbox.Task
        acceptedBase = $inbox.AcceptedBase
        requiredBranch = $inbox.RequiredBranch
        fullBrief = $inbox.FullBrief
        issue = $inbox.Issue
        repositoryUrl = $Url
        workingDirectory = $null
        prompt = $prompt
        createdAt = [DateTimeOffset]::UtcNow.ToString('o')
      }
      Write-AtomicJson -Path $launchPath -Value $launch

      if ($DryRun) {
        $state.pendingLaunchVersion = $inbox.Version
        $state.pendingTask = $inbox.Task
        $state.pendingAcceptedBase = $inbox.AcceptedBase
        $state.pendingRequiredBranch = $inbox.RequiredBranch
        $state.pendingFullBrief = $inbox.FullBrief
        $state.pendingIssue = $inbox.Issue
        $state.pendingBriefSha256 = $briefHash
        Write-AtomicJson -Path $statePath -Value $state
        Write-WatcherLog -Root $Root -Message "DRY-RUN valid START_NOW v$($inbox.Version); pending for the next real poll, no Kimi launch."
        return [pscustomobject]@{ Decision = 'launch'; Version = $inbox.Version; Launched = $false; DryRun = $true }
      }

      $resolvedKimi = (Get-Command $Executable -CommandType Application -ErrorAction Stop).Source
      $runner = Join-Path $PSScriptRoot 'Run-KimiInboxAssignment.ps1'
      if (-not (Test-Path -LiteralPath $runner)) { throw 'Installed Kimi assignment runner is missing.' }
      $workspace = New-AssignmentWorkspace -Root $Root -Url $Url -Inbox $inbox
      $launch.workingDirectory = $workspace
      Write-AtomicJson -Path $launchPath -Value $launch
      $arguments = @(
        '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
        '-File', ('"{0}"' -f $runner),
        '-LaunchFile', ('"{0}"' -f $launchPath),
        '-KimiPath', ('"{0}"' -f $resolvedKimi),
        '-WorkingDirectory', ('"{0}"' -f $workspace)
      )

      # Reserve the inbox version before crossing the process boundary. If this
      # watcher is terminated after Start-Process but before its follow-up state
      # write, the next poll must still fail closed instead of launching the
      # same model assignment twice.
      $state.lastLaunchedVersion = $inbox.Version
      $state.lastLaunchPid = $null
      $state.lastLaunchState = 'reserved'
      $state.pendingLaunchVersion = $null
      $state.lastLaunchAt = [DateTimeOffset]::UtcNow.ToString('o')
      $state.lastLaunchWorkspace = $workspace
      Write-AtomicJson -Path $statePath -Value $state
      $process = if ($null -ne $ProcessStarter) {
        & $ProcessStarter $arguments
      } else {
        Start-Process -FilePath 'powershell.exe' -ArgumentList $arguments -WindowStyle Hidden -PassThru
      }
      if ($null -eq $process -or $null -eq $process.Id) { throw 'Kimi assignment runner did not return a process ID.' }
      $state.lastLaunchPid = $process.Id
      $state.lastLaunchState = 'started'
      Write-AtomicJson -Path $statePath -Value $state
      Write-WatcherLog -Root $Root -Message "LAUNCH inbox v$($inbox.Version) task $($inbox.Task) pid $($process.Id)."
      [pscustomobject]@{ Decision = 'launch'; Version = $inbox.Version; Launched = $true; Pid = $process.Id }
    } catch {
      $state.lastError = $_.Exception.Message
      Write-AtomicJson -Path $statePath -Value $state
      Write-WatcherLog -Root $Root -Message "REJECT inbox v$($inbox.Version): $($_.Exception.Message)"
      throw
    }
  } finally {
    $mutex.ReleaseMutex()
    $mutex.Dispose()
  }
}

if (-not $LibraryOnly) {
  Invoke-KimiWatcherPoll -Root $StateRoot -Url $RepositoryUrl -Executable $KimiPath -DryRun:$NoLaunch -NoFetch:$SkipFetch
}
