param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..'))
)

$ErrorActionPreference = 'Stop'

function Read-RepoFile([string]$Path) {
  Get-Content -Raw -Encoding utf8 (Join-Path $RepoRoot $Path)
}

function Require([bool]$Condition, [string]$Message) {
  if (-not $Condition) { throw $Message }
}

$plan = Read-RepoFile 'docs/PRODUCT_PLAN.md'
$roadmap = Read-RepoFile 'docs/PRODUCT_ROADMAP.md'
$status = Read-RepoFile 'docs/ROADMAP_STATUS.md'
$agents = Read-RepoFile 'AGENTS.md'
$start = Read-RepoFile 'CODEX_START_HERE.md'
$readme = Read-RepoFile 'README.md'
$projectState = Read-RepoFile 'docs/PROJECT_STATE.md'

Require ($plan -notmatch '(?im)^\*\*Active phase:') 'PRODUCT_PLAN must not declare an active phase.'
Require ($agents -notmatch '(?im)^\*\*Active phase:') 'AGENTS must not hard-code an active phase.'
Require ($readme -notmatch '(?i)SS-002 is (the )?active') 'README contains a stale SS-002 active claim.'
Require ($projectState -notmatch '(?im)^## Active milestone') 'PROJECT_STATE contains a competing active milestone.'

foreach ($required in @('PRODUCT_PLAN.md','PRODUCT_ROADMAP.md','ROADMAP_STATUS.md','AGENTS.md','CODEX_START_HERE.md')) {
  Require (($plan + $roadmap + $status + $agents + $start) -match [regex]::Escape($required)) "Five-source link missing: $required"
}

$milestone = [regex]::Match($status, '(?m)^\s*milestone:\s*([A-Z][A-Z0-9]*)\s*$').Groups[1].Value
$package = [regex]::Match($status, '(?m)^\s*package:\s*([A-Z][A-Z0-9]*-WP[0-9]+)\s*$').Groups[1].Value
$base = [regex]::Match($status, '(?m)^\s*exactBase:\s*([0-9a-f]{40})\s*$').Groups[1].Value
$state = [regex]::Match($status, '(?m)^\s*state:\s*([A-Z_]+)\s*$').Groups[1].Value
$owner = [regex]::Match($status, '(?m)^\s*owner:\s*([A-Za-z]+)\s*$').Groups[1].Value

Require ($milestone.Length -gt 0) 'ROADMAP_STATUS milestone is missing or invalid.'
Require ($package.Length -gt 0) 'ROADMAP_STATUS package is missing or invalid.'
Require ($base.Length -eq 40) 'ROADMAP_STATUS exactBase must be a full SHA.'
Require ($roadmap -match "(?m)^### $([regex]::Escape($milestone))\b") "Unknown active milestone: $milestone"
Require ($roadmap -match "(?m)^#### $([regex]::Escape($package))\b") "Unknown active package: $package"
Require ($package.StartsWith("$milestone-WP")) 'Active package does not belong to active milestone.'
Require (@('WAIT','START_NOW','IMPLEMENTING','REVIEW','PRO_GATE','PRESTON_GATE','ACCEPTED_WAIT') -contains $state) "Unknown authorization state: $state"

$milestoneIds = [regex]::Matches($roadmap, '(?m)^### ([A-Z][A-Z0-9]*)\b') | ForEach-Object { $_.Groups[1].Value }
$packageIds = [regex]::Matches($roadmap, '(?m)^#### ([A-Z][A-Z0-9]*-WP[0-9]+)\b') | ForEach-Object { $_.Groups[1].Value }
Require ($milestoneIds.Count -eq ($milestoneIds | Select-Object -Unique).Count) 'Duplicate milestone ID in PRODUCT_ROADMAP.'
Require ($packageIds.Count -eq ($packageIds | Select-Object -Unique).Count) 'Duplicate package ID in PRODUCT_ROADMAP.'

foreach ($completed in [regex]::Matches($status, '(?m)^\s{2}([A-Z][A-Z0-9]*):\s*[0-9a-f]+\s*$')) {
  $completedId = $completed.Groups[1].Value
  Require ($milestoneIds -contains $completedId) "Completed milestone missing from roadmap: $completedId"
}

git -C $RepoRoot cat-file -e "$base^{commit}"
Require ($LASTEXITCODE -eq 0) "exactBase does not exist: $base"
git -C $RepoRoot merge-base --is-ancestor $base origin/product/v1
Require ($LASTEXITCODE -eq 0) 'exactBase is not in the accepted product/v1 lineage.'

if ($owner -eq 'Kimi') {
  $inbox = git -C $RepoRoot show origin/agent/kimi-frontend:reports/agent-handoffs/KIMI_INBOX.md
  Require ($LASTEXITCODE -eq 0) 'Kimi is active but the canonical inbox is unreadable.'
  Require (($inbox -join "`n") -match [regex]::Escape($package)) 'Kimi inbox does not mirror the active package.'
}

Write-Output "Roadmap consistency PASS: $milestone / $package / $state / $base"
