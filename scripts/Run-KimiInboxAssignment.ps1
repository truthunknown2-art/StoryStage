[CmdletBinding()]
param(
  [Parameter(Mandatory)] [string]$LaunchFile,
  [Parameter(Mandatory)] [string]$KimiPath,
  [Parameter(Mandatory)] [string]$WorkingDirectory
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

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
$resultPath = Join-Path $runDirectory ("v{0}.result.json" -f $launch.inboxVersion)

$startedAt = [DateTimeOffset]::UtcNow
$exitCode = 1
$locationPushed = $false
try {
  Push-Location $WorkingDirectory
  $locationPushed = $true
  & $KimiPath --auto --prompt ([string]$launch.prompt) --output-format stream-json *> $logPath
  $exitCode = $LASTEXITCODE
} finally {
  if ($locationPushed) { Pop-Location }
  $result = [ordered]@{
    schemaVersion = 1
    inboxVersion = $launch.inboxVersion
    task = $launch.task
    startedAt = $startedAt.ToString('o')
    completedAt = [DateTimeOffset]::UtcNow.ToString('o')
    exitCode = $exitCode
    logPath = $logPath
  }
  $temporary = "$resultPath.tmp"
  $json = $result | ConvertTo-Json -Depth 5
  [System.IO.File]::WriteAllText($temporary, $json, [System.Text.UTF8Encoding]::new($false))
  Move-Item -LiteralPath $temporary -Destination $resultPath -Force
}

exit $exitCode
