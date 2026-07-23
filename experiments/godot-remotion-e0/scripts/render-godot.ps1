param(
  [Parameter(Mandatory = $true)]
  [string]$OutputDirectory,
  [string]$GodotBin = "C:\Tools\Godot\4.7.1\Godot_v4.7.1-stable_win64_console.exe"
)

$ErrorActionPreference = "Stop"
$experimentRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$artifactRoot = (Resolve-Path (Join-Path $experimentRoot "artifacts")).Path
$outputFull = [System.IO.Path]::GetFullPath($OutputDirectory)

if (-not $outputFull.StartsWith($artifactRoot + [System.IO.Path]::DirectorySeparatorChar)) {
  throw "Output must stay under $artifactRoot"
}
if (Test-Path -LiteralPath $outputFull) {
  throw "Output already exists: $outputFull"
}
if (-not (Test-Path -LiteralPath $GodotBin)) {
  throw "Pinned Godot binary not found: $GodotBin"
}

$godotProject = Join-Path $experimentRoot "godot"
$relativeOutput = "res://../artifacts/" + [System.IO.Path]::GetFileName($outputFull)

Push-Location $godotProject
try {
  & $GodotBin --path . --rendering-method gl_compatibility --fixed-fps 30 --position 4000,4000 -- --output $relativeOutput
  if ($LASTEXITCODE -ne 0) {
    throw "Godot render failed with exit code $LASTEXITCODE"
  }
} finally {
  Pop-Location
}

$frames = @(Get-ChildItem -LiteralPath $outputFull -Filter "frame-*.png")
if ($frames.Count -ne 120) {
  throw "Expected 120 frames, found $($frames.Count)"
}
Write-Output "Rendered 120 frames to $outputFull"
