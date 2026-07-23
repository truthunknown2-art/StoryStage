[CmdletBinding(DefaultParameterSetName = 'Status')]
param(
  [Parameter(ParameterSetName = 'Install', Mandatory)] [switch]$Install,
  [Parameter(ParameterSetName = 'Status', Mandatory)] [switch]$Status,
  [Parameter(ParameterSetName = 'Uninstall', Mandatory)] [switch]$Uninstall
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$taskName = 'StoryStage-KimiInboxWatcher'
$RepositoryUrl = 'https://github.com/truthunknown2-art/StoryStage.git'
$StateRoot = Join-Path $env:LOCALAPPDATA 'StoryStage\coordination'
$binRoot = Join-Path $StateRoot 'bin'
$installedWatcher = Join-Path $binRoot 'Invoke-KimiInboxWatcher.ps1'
$installedRunner = Join-Path $binRoot 'Run-KimiInboxAssignment.ps1'
$statePath = Join-Path $StateRoot 'state.json'

if ($Install) {
  New-Item -ItemType Directory -Path $binRoot -Force | Out-Null
  Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'Invoke-KimiInboxWatcher.ps1') -Destination $installedWatcher -Force
  Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'Run-KimiInboxAssignment.ps1') -Destination $installedRunner -Force

  $powerShell = (Get-Command powershell.exe -ErrorAction Stop).Source
  $actionArguments = '-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "{0}" -RepositoryUrl "{1}" -StateRoot "{2}"' -f $installedWatcher, $RepositoryUrl, $StateRoot
  $action = New-ScheduledTaskAction -Execute $powerShell -Argument $actionArguments
  $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 5)
  $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 12)
  $principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description 'Zero-token StoryStage Kimi inbox watcher. Launches Kimi only for a higher validated START_NOW inbox.' -Force | Out-Null

  & $installedWatcher -RepositoryUrl $RepositoryUrl -StateRoot $StateRoot -NoLaunch | Out-Null
  Write-Output "Installed $taskName. Initial deterministic poll completed without launching Kimi."
  exit 0
}

if ($Uninstall) {
  $task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
  if ($null -ne $task) { Unregister-ScheduledTask -TaskName $taskName -Confirm:$false }
  Write-Output "Uninstalled $taskName. Preserved coordination state and logs at $StateRoot."
  exit 0
}

$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
$state = if (Test-Path -LiteralPath $statePath) {
  Get-Content -Raw -LiteralPath $statePath -Encoding utf8 | ConvertFrom-Json
} else { $null }
[pscustomobject]@{
  TaskName = $taskName
  Installed = $null -ne $task
  TaskState = if ($null -ne $task) { $task.State.ToString() } else { 'Missing' }
  StateRoot = $StateRoot
  WatcherPresent = Test-Path -LiteralPath $installedWatcher
  LastObservedVersion = if ($null -ne $state) { $state.lastObservedVersion } else { $null }
  LastObservedStatus = if ($null -ne $state) { $state.lastObservedStatus } else { $null }
  LastLaunchedVersion = if ($null -ne $state) { $state.lastLaunchedVersion } else { $null }
  LastLaunchPid = if ($null -ne $state) { $state.lastLaunchPid } else { $null }
  LastLaunchState = if ($null -ne $state -and $null -ne $state.PSObject.Properties['lastLaunchState']) { $state.lastLaunchState } else { $null }
  LastError = if ($null -ne $state) { $state.lastError } else { $null }
}
