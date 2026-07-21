[CmdletBinding()]
param(
  [string]$LaunchFile,
  [string]$KimiPath,
  [string]$WorkingDirectory,
  [ValidateRange(1, 10800)] [int]$MaxRuntimeSeconds = 10800,
  [switch]$LibraryOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Invoke-BoundedKimiProcess {
  param(
    [Parameter(Mandatory)] [string]$Executable,
    [Parameter(Mandatory)] [string]$Prompt,
    [Parameter(Mandatory)] [string]$Directory,
    [Parameter(Mandatory)] [string]$StandardOutputPath,
    [Parameter(Mandatory)] [string]$StandardErrorPath,
    [Parameter(Mandatory)] [int]$TimeoutSeconds,
    [scriptblock]$ProcessStarter,
    [scriptblock]$ProcessTreeStopper
  )

  $singleLinePrompt = ($Prompt -replace '\s+', ' ').Trim()
  if ([string]::IsNullOrWhiteSpace($singleLinePrompt) -or $singleLinePrompt.Contains('"')) {
    throw 'Kimi assignment prompt is empty or contains an unsafe quote.'
  }
  # Prompt mode is already non-interactive and uses Kimi's auto permission
  # policy. Kimi 0.27+ rejects an explicit --auto combined with --prompt.
  $arguments = @('--prompt', ('"{0}"' -f $singleLinePrompt), '--output-format', 'stream-json')
  $process = if ($null -ne $ProcessStarter) {
    & $ProcessStarter $arguments
  } else {
    Start-Process -FilePath $Executable -ArgumentList $arguments -WorkingDirectory $Directory -WindowStyle Hidden -PassThru -RedirectStandardOutput $StandardOutputPath -RedirectStandardError $StandardErrorPath
  }
  if ($null -eq $process -or $null -eq $process.Id) { throw 'Kimi CLI did not return a process ID.' }

  $completed = $process.WaitForExit($TimeoutSeconds * 1000)
  if ($completed) {
    $process.WaitForExit()
    $exitCode = if ($null -eq $process.ExitCode) { 1 } else { [int]$process.ExitCode }
    return [pscustomobject]@{
      ExitCode = $exitCode
      TimedOut = $false
      ProcessId = $process.Id
      TerminationSucceeded = $null
    }
  }

  $terminationSucceeded = $false
  if ($null -ne $ProcessTreeStopper) {
    $terminationSucceeded = [bool](& $ProcessTreeStopper $process.Id)
  } else {
    $priorPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
      & taskkill.exe /PID $process.Id /T /F 2>&1 | Out-Null
      $terminationSucceeded = $LASTEXITCODE -eq 0
      if (-not $terminationSucceeded) {
        # Parent-only cleanup cannot prove that every descendant stopped.
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
      } else {
        try { $process.WaitForExit(5000) | Out-Null } catch { }
      }
    } finally {
      $ErrorActionPreference = $priorPreference
    }
  }

  [pscustomobject]@{
    ExitCode = 124
    TimedOut = $true
    ProcessId = $process.Id
    TerminationSucceeded = $terminationSucceeded
  }
}

if ($LibraryOnly) { return }

if ([string]::IsNullOrWhiteSpace($LaunchFile) -or
    [string]::IsNullOrWhiteSpace($KimiPath) -or
    [string]::IsNullOrWhiteSpace($WorkingDirectory)) {
  throw 'LaunchFile, KimiPath, and WorkingDirectory are required.'
}

$launch = Get-Content -Raw -LiteralPath $LaunchFile -Encoding utf8 | ConvertFrom-Json
if ($launch.schemaVersion -ne 1 -or $launch.inboxVersion -lt 1 -or [string]::IsNullOrWhiteSpace($launch.prompt)) {
  throw 'Invalid Kimi assignment launch receipt.'
}
if (-not (Test-Path -LiteralPath (Join-Path $WorkingDirectory '.git'))) {
  throw 'Kimi coordination working directory is not a Git checkout.'
}

$launchRoot = Split-Path -Parent $LaunchFile
$root = Split-Path -Parent $launchRoot
$runDirectory = Join-Path $root 'runs'
New-Item -ItemType Directory -Path $runDirectory -Force | Out-Null
$logPath = Join-Path $runDirectory ("v{0}.stream-json.log" -f $launch.inboxVersion)
$errorLogPath = Join-Path $runDirectory ("v{0}.stderr.log" -f $launch.inboxVersion)
$resultPath = Join-Path $runDirectory ("v{0}.result.json" -f $launch.inboxVersion)

$startedAt = [DateTimeOffset]::UtcNow
$outcome = $null
try {
  $outcome = Invoke-BoundedKimiProcess -Executable $KimiPath -Prompt ([string]$launch.prompt) -Directory $WorkingDirectory -StandardOutputPath $logPath -StandardErrorPath $errorLogPath -TimeoutSeconds $MaxRuntimeSeconds
} finally {
  $result = [ordered]@{
    schemaVersion = 1
    inboxVersion = $launch.inboxVersion
    task = $launch.task
    startedAt = $startedAt.ToString('o')
    completedAt = [DateTimeOffset]::UtcNow.ToString('o')
    exitCode = if ($null -ne $outcome) { $outcome.ExitCode } else { 1 }
    timedOut = if ($null -ne $outcome) { $outcome.TimedOut } else { $false }
    processId = if ($null -ne $outcome) { $outcome.ProcessId } else { $null }
    terminationSucceeded = if ($null -ne $outcome) { $outcome.TerminationSucceeded } else { $null }
    maxRuntimeSeconds = $MaxRuntimeSeconds
    logPath = $logPath
    errorLogPath = $errorLogPath
  }
  $temporary = "$resultPath.tmp"
  $json = $result | ConvertTo-Json -Depth 5
  [System.IO.File]::WriteAllText($temporary, $json, [System.Text.UTF8Encoding]::new($false))
  Move-Item -LiteralPath $temporary -Destination $resultPath -Force
}

exit $outcome.ExitCode
