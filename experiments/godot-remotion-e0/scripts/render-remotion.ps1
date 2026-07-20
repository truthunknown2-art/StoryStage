param(
  [Parameter(Mandatory = $true)]
  [string]$FrameDirectory
)

$ErrorActionPreference = "Stop"
$experimentRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$frameSource = (Resolve-Path $FrameDirectory).Path
$remotionRoot = Join-Path $experimentRoot "remotion"
$publicFrames = Join-Path $experimentRoot "remotion\public\frames"
$evidenceRoot = Join-Path $experimentRoot "evidence"
$stillsRoot = Join-Path $evidenceRoot "stills"
$entry = Join-Path $experimentRoot "remotion\src\index.tsx"
$video = Join-Path $evidenceRoot "godot-remotion-e0.mp4"

New-Item -ItemType Directory -Force -Path $publicFrames, $stillsRoot | Out-Null
Get-ChildItem -LiteralPath $publicFrames -Filter "frame-*.png" | Remove-Item -Force
Copy-Item -Path (Join-Path $frameSource "frame-*.png") -Destination $publicFrames

$sourceFrames = @(Get-ChildItem -LiteralPath $frameSource -Filter "frame-*.png")
$stagedFrames = @(Get-ChildItem -LiteralPath $publicFrames -Filter "frame-*.png")
if ($sourceFrames.Count -ne 120 -or $stagedFrames.Count -ne 120) {
  throw "Remotion staging requires exactly 120 source and staged frames"
}
for ($index = 0; $index -lt 120; $index++) {
  $sourceHash = (Get-FileHash -Algorithm SHA256 $sourceFrames[$index].FullName).Hash
  $stagedHash = (Get-FileHash -Algorithm SHA256 $stagedFrames[$index].FullName).Hash
  if ($sourceHash -ne $stagedHash) {
    throw "Staged frame mismatch at index $index"
  }
}

Push-Location $remotionRoot
try {
  & pnpm exec remotion render $entry E0GodotRemotion $video --codec=h264 --crf=18 --overwrite
  if ($LASTEXITCODE -ne 0) { throw "Remotion video render failed" }

  foreach ($frame in @(0, 41, 78, 88, 119)) {
    $still = Join-Path $stillsRoot ("composite-frame-{0:D4}.png" -f $frame)
    & pnpm exec remotion still $entry E0GodotRemotion $still --frame=$frame --overwrite
    if ($LASTEXITCODE -ne 0) { throw "Remotion still render failed at frame $frame" }
  }
} finally {
  Pop-Location
}

Write-Output "Rendered $video and five representative stills"
