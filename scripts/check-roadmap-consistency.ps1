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

function Fetch-RemoteBranch([string]$Branch) {
  $refspec = '+refs/heads/' + $Branch + ':refs/remotes/origin/' + $Branch
  git -C $RepoRoot fetch --quiet --no-tags origin $refspec
  Require ($LASTEXITCODE -eq 0) "Unable to fetch origin/$Branch."
}

function Require-RelativeLinks([string]$Path) {
  $text = Read-RepoFile $Path
  $directory = Split-Path (Join-Path $RepoRoot $Path)
  foreach ($match in [regex]::Matches($text, '\[[^\]]+\]\(([^)]+)\)')) {
    $target = $match.Groups[1].Value.Trim('<', '>')
    if ($target -match '^(?:https?://|mailto:|#)') { continue }
    $localTarget = ($target -split '[?#]')[0]
    if ($localTarget.Length -eq 0) { continue }
    Require (Test-Path (Join-Path $directory $localTarget)) ("Broken relative link in {0}: {1}" -f $Path, $target)
  }
}

$plan = Read-RepoFile 'docs/PRODUCT_PLAN.md'
$roadmap = Read-RepoFile 'docs/PRODUCT_ROADMAP.md'
$status = Read-RepoFile 'docs/ROADMAP_STATUS.md'
$agents = Read-RepoFile 'AGENTS.md'
$start = Read-RepoFile 'CODEX_START_HERE.md'
$readme = Read-RepoFile 'README.md'
$projectState = Read-RepoFile 'docs/PROJECT_STATE.md'

Require ($plan -match '(?m)^\*\*Status:\*\* Binding product and architecture charter\s*$') 'PRODUCT_PLAN must be the stable product and architecture charter.'
Require ($plan -notmatch '(?im)^\*\*Active phase:') 'PRODUCT_PLAN must not declare an active phase.'
Require ($plan -notmatch 'agent/kimi-ui-v2') 'PRODUCT_PLAN must not hard-code an implementation branch.'
Require ($plan -notmatch 'during the F2 frontend phase') 'PRODUCT_PLAN contains a stale F2 authorization boundary.'
Require ($agents -notmatch '(?im)^\*\*Active phase:') 'AGENTS must not hard-code an active phase.'
Require ($agents -match 'execute the mandatory read order in') 'AGENTS must defer to the single cold-start read order.'
Require ($readme -notmatch '(?i)SS-002 is (the )?active') 'README contains a stale SS-002 active claim.'
Require ($projectState -notmatch '(?im)^## Active milestone') 'PROJECT_STATE contains a competing active milestone.'
Require ($status -notmatch '(?m)^\s*candidateHead:') 'ROADMAP_STATUS must distinguish content identity from the live review head.'
Require ($roadmap -notmatch '\b(?:START-NOW|PRO-GATE|PRESTON-GATE|ACCEPTED-WAIT)\b') 'PRODUCT_ROADMAP contains non-canonical authorization enums.'

foreach ($required in @('PRODUCT_PLAN.md','PRODUCT_ROADMAP.md','ROADMAP_STATUS.md','AGENTS.md','CODEX_START_HERE.md')) {
  Require (($plan + $roadmap + $status + $agents + $start) -match [regex]::Escape($required)) "Five-source link missing: $required"
}

$milestone = [regex]::Match($status, '(?m)^\s*milestone:\s*([A-Z][A-Z0-9]*)\s*$').Groups[1].Value
$package = [regex]::Match($status, '(?m)^\s*package:\s*([A-Z][A-Z0-9]*-WP[0-9]+)\s*$').Groups[1].Value
$base = [regex]::Match($status, '(?m)^\s*exactBase:\s*([0-9a-f]{40})\s*$').Groups[1].Value
$state = [regex]::Match($status, '(?m)^\s*state:\s*([A-Z_]+)\s*$').Groups[1].Value
$owner = [regex]::Match($status, '(?m)^\s*owner:\s*([A-Za-z]+)\s*$').Groups[1].Value
$candidateContentHead = [regex]::Match($status, '(?m)^\s*candidateContentHead:\s*([0-9a-f]{40})\s*$').Groups[1].Value
$candidateRef = [regex]::Match($status, '(?m)^\s*candidateRef:\s*([A-Za-z0-9._/-]+)\s*$').Groups[1].Value

Require ($milestone.Length -gt 0) 'ROADMAP_STATUS milestone is missing or invalid.'
Require ($package.Length -gt 0) 'ROADMAP_STATUS package is missing or invalid.'
Require ($base.Length -eq 40) 'ROADMAP_STATUS exactBase must be a full SHA.'
Require ($candidateContentHead.Length -eq 40) 'ROADMAP_STATUS candidateContentHead must be a full SHA.'
Require ($candidateRef.Length -gt 0) 'ROADMAP_STATUS candidateRef is missing.'
Require (@('WAIT','START_NOW','IMPLEMENTING','REVIEW','PRO_GATE','PRESTON_GATE','ACCEPTED_WAIT') -contains $state) "Unknown authorization state: $state"
Require ($status -match '(?m)^\s*hostedSource:\s*github-pr-checks\s*$') 'ROADMAP_STATUS must resolve hosted verification from GitHub PR checks.'
Require ($status -match '(?m)^\s*hostedTarget:\s*live-pr-head\s*$') 'ROADMAP_STATUS hosted target must be the live PR head.'

$milestoneMatches = [regex]::Matches($roadmap, '(?m)^### ([A-Z][A-Z0-9]*)\b.*$')
$milestoneIds = @($milestoneMatches | ForEach-Object { $_.Groups[1].Value })
$packageIds = @([regex]::Matches($roadmap, '(?m)^#### ([A-Z][A-Z0-9]*-WP[0-9]+)\b') | ForEach-Object { $_.Groups[1].Value })
Require ($milestoneIds.Count -eq ($milestoneIds | Select-Object -Unique).Count) 'Duplicate milestone ID in PRODUCT_ROADMAP.'
Require ($packageIds.Count -eq ($packageIds | Select-Object -Unique).Count) 'Duplicate package ID in PRODUCT_ROADMAP.'
Require ($milestoneIds -contains $milestone) "Unknown active milestone: $milestone"
Require ($packageIds -contains $package) "Unknown active package: $package"
Require ($package.StartsWith("$milestone-WP")) 'Active package does not belong to active milestone.'

for ($index = 0; $index -lt $milestoneMatches.Count; $index++) {
  $match = $milestoneMatches[$index]
  $end = if ($index + 1 -lt $milestoneMatches.Count) { $milestoneMatches[$index + 1].Index } else { $roadmap.Length }
  $section = $roadmap.Substring($match.Index, $end - $match.Index)
  $id = $match.Groups[1].Value
  $count = [regex]::Matches($section, "(?m)^#### $([regex]::Escape($id))-WP[0-9]+\b").Count
  Require ($count -ge 3 -and $count -le 8) "Milestone $id must contain 3-8 work packages; found $count."
  Require ($section -match '(?m)^\*\*Objective:\*\*') "Milestone $id is missing Objective."
  Require ($section -match '(?m)^\*\*Milestone invariant:\*\*') "Milestone $id is missing Milestone invariant."
  Require ($section -match '(?m)^\*\*Dependencies/owners:\*\*') "Milestone $id is missing Dependencies/owners."
  Require ($section -match '(?m)^\*\*Required evidence:\*\*') "Milestone $id is missing Required evidence."
  Require ($section -match '(?m)^\*\*Milestone gate') "Milestone $id is missing Milestone gate."
  $sectionPackages = [regex]::Matches($section, '(?m)^#### ([A-Z][A-Z0-9]*-WP[0-9]+)\b.*$')
  for ($packageIndex = 0; $packageIndex -lt $sectionPackages.Count; $packageIndex++) {
    $packageMatch = $sectionPackages[$packageIndex]
    $packageEnd = if ($packageIndex + 1 -lt $sectionPackages.Count) { $sectionPackages[$packageIndex + 1].Index } else { $section.Length }
    $packageSection = $section.Substring($packageMatch.Index, $packageEnd - $packageMatch.Index)
    $packageId = $packageMatch.Groups[1].Value
    Require ($packageSection -match '(?m)^- \*\*Tasks:\*\*') "Package $packageId is missing Tasks."
    Require ($packageSection -match '(?m)^- \*\*Non-goals:\*\*') "Package $packageId is missing Non-goals."
    Require ($packageSection -match '(?m)^- \*\*Verify/complete:\*\*') "Package $packageId is missing Verify/complete."
  }
}

$completedBlock = [regex]::Match($status, '(?ms)^completedMilestones:\s*\r?\n(?<body>(?:  .+\r?\n)+)').Groups['body'].Value
$completedMatches = [regex]::Matches($completedBlock, '(?m)^\s{2}([A-Z][A-Z0-9]*):\s*([0-9a-f]{40})\s*$')
$completedIds = @($completedMatches | ForEach-Object { $_.Groups[1].Value })
$completedLineCount = [regex]::Matches($completedBlock, '(?m)^\s{2}[A-Z][A-Z0-9]*:').Count
Require ($completedMatches.Count -eq $completedLineCount) 'Every completed milestone must use a full 40-character SHA.'
foreach ($completedId in $completedIds) {
  Require ($milestoneIds -contains $completedId) "Completed milestone missing from roadmap: $completedId"
}

$dependencySection = [regex]::Match($roadmap, '(?ms)^### Dependency graph\s*$.*?(?=^## 6\.)').Value
Require ($dependencySection.Length -gt 0) 'PRODUCT_ROADMAP dependency graph is missing.'
$dependencyRows = @{}
foreach ($row in [regex]::Matches($dependencySection, '(?m)^\|\s*([A-Z][A-Z0-9]*)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*$')) {
  $id = $row.Groups[1].Value
  Require (-not $dependencyRows.ContainsKey($id)) "Duplicate dependency row: $id"
  $dependencyRows[$id] = $row.Groups[2].Value.Trim()
}
foreach ($id in $milestoneIds) {
  Require ($dependencyRows.ContainsKey($id)) "Missing dependency row for milestone $id."
  $dependencies = @($dependencyRows[$id] -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne 'none' })
  foreach ($dependency in $dependencies) {
    Require ($milestoneIds -contains $dependency) "Milestone $id has unknown dependency $dependency."
  }
}
$activeDependencies = @($dependencyRows[$milestone] -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne 'none' })
foreach ($dependency in $activeDependencies) {
  Require ($completedIds -contains $dependency) "Active milestone $milestone has incomplete dependency $dependency."
}

Fetch-RemoteBranch 'product/v1'
Fetch-RemoteBranch 'agent/kimi-frontend'
Fetch-RemoteBranch $candidateRef

git -C $RepoRoot cat-file -e "$base^{commit}"
Require ($LASTEXITCODE -eq 0) "exactBase does not exist: $base"
git -C $RepoRoot merge-base --is-ancestor $base origin/product/v1
Require ($LASTEXITCODE -eq 0) 'exactBase is not in the accepted product/v1 lineage.'
git -C $RepoRoot cat-file -e "$candidateContentHead^{commit}"
Require ($LASTEXITCODE -eq 0) "candidateContentHead does not exist: $candidateContentHead"
git -C $RepoRoot merge-base --is-ancestor $candidateContentHead "origin/$candidateRef"
Require ($LASTEXITCODE -eq 0) 'candidateContentHead is not an ancestor of the live candidate ref.'
$candidateRemoteHead = (git -C $RepoRoot rev-parse "origin/$candidateRef").Trim()
Require ($candidateRemoteHead -match '^[0-9a-f]{40}$') 'Live candidate ref did not resolve to a full SHA.'

$inboxLines = git -C $RepoRoot show origin/agent/kimi-frontend:reports/agent-handoffs/KIMI_INBOX.md
Require ($LASTEXITCODE -eq 0) 'Canonical Kimi inbox is unreadable.'
$inbox = [string]::Join([Environment]::NewLine, $inboxLines)
$inboxStatus = [regex]::Match($inbox, '(?m)^Status:\s*\x60?([A-Za-z_-]+)\x60?\s*$').Groups[1].Value.ToUpperInvariant()
$inboxBranch = [regex]::Match($inbox, '(?m)^Required-Work-Branch:\s*\x60?([^\x60\r\n]+)\x60?\s*$').Groups[1].Value
if ($owner -eq 'Kimi') {
  Require ($inbox -match [regex]::Escape($package)) 'Kimi inbox does not mirror the active package.'
  Require ($inbox -match [regex]::Escape($base)) 'Kimi inbox does not mirror the active exact base.'
  Require ($inboxStatus -eq 'START-NOW') 'Kimi owns the active package but its inbox is not START-NOW.'
} else {
  Require (@('WAIT','HOLD','DONE','BLOCKED') -contains $inboxStatus) "Codex owns the active package but Kimi is not waiting: $inboxStatus"
  Require ($inboxBranch -match '(?i)(none|hold|wait)') "Codex owns the active package but Kimi names an implementation branch: $inboxBranch"
}

foreach ($path in @(
  'AGENTS.md',
  'CODEX_START_HERE.md',
  'docs/PRODUCT_PLAN.md',
  'docs/PRODUCT_ROADMAP.md',
  'docs/ROADMAP_STATUS.md',
  'docs/editorial/multi-shot-director-adaptation.md',
  'docs/editorial/multi-shot-prompt-framework-crosswalk.md',
  'docs/research/source-frameworks/multi-shot-prompt-framework-animation.receipt.md'
)) {
  Require-RelativeLinks $path
}

Write-Output "Roadmap consistency PASS: $milestone / $package / $state / $base / $candidateRemoteHead"
