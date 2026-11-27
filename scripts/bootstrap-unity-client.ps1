# Tự động khởi tạo dự án Unity 6 (6000.3.29f1) tại apps\unity-client, nạp bộ C# Chặng U2,
# đóng gói Sidecar @lkdf/server và mở sân khấu U1_VerticalSlice_Arena.unity sau khi Sếp cài xong Unity 6.

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$unityCli = "C:\Users\kyuu4\AppData\Local\Unity\bin\unity.exe"
$projectParent = Join-Path $repoRoot "apps"
$projectDir = Join-Path $projectParent "unity-client"
$kitScripts = Join-Path $repoRoot "unity-u2-kit\Scripts"

Write-Host "=== KHỞI TẠO DỰ ÁN UNITY 6 + CHẶNG U2 CHO CỬU CHÂU ẨN KIẾM ===" -ForegroundColor Yellow

$editorsJson = & $unityCli editors --installed --format json | ConvertFrom-Json
if (-not $editorsJson.success -or $editorsJson.data.items.Count -eq 0) {
    Write-Error "Chưa phát hiện Unity 6 được cài đặt! Vui lòng chạy scripts\Cai_Unity6_Chang_U0.cmd trước."
    exit 1
}

$licenseJson = & $unityCli license status --format json | ConvertFrom-Json
if (-not $licenseJson.success) {
    Write-Error "Chưa kích hoạt giấy phép Unity Personal 0đ! Vui lòng chạy scripts\Cai_Unity6_Chang_U0.cmd."
    exit 1
}

if (-not (Test-Path $projectDir)) {
    Write-Host "[1/4] Tạo dự án Unity 6.3 URP 2D tại $projectDir ..." -ForegroundColor Cyan
    & $unityCli projects create unity-client --output-dir $projectParent --editor-version 6000.3.29f1 --template com.unity.template.universal-2d --no-cloud --non-interactive
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "[2/4] Bổ sung Newtonsoft.Json + com.unity.pipeline vào Packages/manifest.json ..." -ForegroundColor Cyan
$manifestPath = Join-Path $projectDir "Packages\manifest.json"
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$manifest.dependencies | Add-Member -NotePropertyName "com.unity.nuget.newtonsoft-json" -NotePropertyValue "3.2.1" -Force
[System.IO.File]::WriteAllText($manifestPath, ($manifest | ConvertTo-Json -Depth 10), [System.Text.UTF8Encoding]::new($false))

& $unityCli pipeline install --project-path $projectDir
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "[3/4] Chép 7 mô-đun C# Chặng U2 & Sidecar @lkdf/server vào Assets/ ..." -ForegroundColor Cyan
$targetScripts = Join-Path $projectDir "Assets\Scripts"
New-Item -ItemType Directory -Force -Path $targetScripts | Out-Null
Copy-Item -Path "$kitScripts\*" -Destination $targetScripts -Recurse -Force

$sidecarOut = Join-Path $projectDir "Assets\StreamingAssets\ServerSidecar"
New-Item -ItemType Directory -Force -Path $sidecarOut | Out-Null
@(
    "DEV MODE SIDECAR MARKER",
    "During Editor/Dev runs without bundled node_modules here, LkdfSidecarProcess automatically resolves to workspace apps/server/dist/index.js.",
    "For production standalone player builds (Chang U6), deploy complete self-contained server bundle + node_modules + node.exe into this folder."
) | Set-Content -Path (Join-Path $sidecarOut "README.txt") -Encoding UTF8

$logsDir = Join-Path $projectDir "Logs"
New-Item -ItemType Directory -Force -Path $logsDir | Out-Null
$u1Log = Join-Path $logsDir "u1-build.log"

$tmpShadersDir = Join-Path $projectDir "Assets\TextMesh Pro\Shaders"
if (-not (Test-Path $tmpShadersDir)) {
    $tmpPkg = Get-ChildItem (Join-Path $projectDir "Library\PackageCache") -Filter "TMP Essential Resources.unitypackage" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($tmpPkg) {
        Write-Host "[3.5/4] Nap TMP Essential Resources package vao Assets\TextMesh Pro ..." -ForegroundColor Cyan
        & $unityCli run $projectDir --log-file (Join-Path $logsDir "tmp-import.log") --no-tail --timeout 180 -- -importPackage $tmpPkg.FullName
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    }
}

Write-Host "[4/4] Chạy CuuChauU1SliceBuilder.BuildAll nạp bộ mẫu U1, tạo scene 1080p & chụp ảnh thật..." -ForegroundColor Cyan
& $unityCli run $projectDir --log-file $u1Log --no-tail --timeout 300 -- -executeMethod CuuChau.Editor.CuuChauU1SliceBuilder.BuildAll
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "HOÀN TẤT 100%! Dự án Unity 6 sẵn sàng tại $projectDir" -ForegroundColor Green
