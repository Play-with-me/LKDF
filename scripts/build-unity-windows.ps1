$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$repoRoot = Split-Path -Parent $PSScriptRoot
$unityProject = Join-Path $repoRoot "apps\unity-client"
$unityCli = Join-Path $env:LocalAppData "Unity\bin\unity.exe"
$logsDir = Join-Path $unityProject "Logs"
$buildLog = Join-Path $logsDir "u6-win64-build.log"
$buildDir = Join-Path $unityProject "Builds\Windows"
$exePath = Join-Path $buildDir "CuuChauAnKiem.exe"
$dataDir = Join-Path $buildDir "CuuChauAnKiem_Data"
$sidecarDir = Join-Path $dataDir "StreamingAssets\ServerSidecar"
$releaseDir = Join-Path $repoRoot "releases"
$zipFileName = "CuuChauAnKiem-Unity6-Win64-Portable-0.6.0.zip"
$releaseZip = Join-Path $releaseDir $zipFileName
$desktopDir = "C:\Users\kyuu4\OneDrive\Desktop"
$desktopZip = Join-Path $desktopDir $zipFileName

function Test-PortInUse {
    param([int]$Port)
    $listener = $null
    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
        $listener.Start()
        return $false
    }
    catch [System.Net.Sockets.SocketException] {
        return $true
    }
    finally {
        if ($null -ne $listener) {
            try { $listener.Stop() } catch {}
        }
    }
}

function Invoke-HealthCheck {
    param([string]$Url)
    try {
        return Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec 2
    }
    catch {
        return $null
    }
}

Write-Host "=== CHẶNG U6: ĐÓNG GÓI STANDALONE WINDOWS x64 (CUUCHAUANKIEM 0.6.0) ===" -ForegroundColor Yellow

# ---------------------------------------------------------------------------
# Step A: Build @lkdf/shared & @lkdf/server
# ---------------------------------------------------------------------------
Write-Host "[Step A] Build @lkdf/shared và @lkdf/server..." -ForegroundColor Cyan
Push-Location $repoRoot
try {
    & npm.cmd run build --workspace=@lkdf/shared
    if ($LASTEXITCODE -ne 0) { throw "Build @lkdf/shared thất bại (exit=$LASTEXITCODE)." }

    & npm.cmd run build --workspace=@lkdf/server
    if ($LASTEXITCODE -ne 0) { throw "Build @lkdf/server thất bại (exit=$LASTEXITCODE)." }
}
finally {
    Pop-Location
}

# ---------------------------------------------------------------------------
# Step B: Build Unity 6.3 Standalone Windows x64
# ---------------------------------------------------------------------------
Write-Host "[Step B] Build Unity 6.3 Windows x64 Standalone..." -ForegroundColor Cyan
if (-not (Test-Path $unityCli)) {
    throw "Không tìm thấy Unity CLI tại: $unityCli"
}
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
}
if (Test-Path $buildDir) {
    Remove-Item -Path $buildDir -Recurse -Force
}

& $unityCli run $unityProject --log-file $buildLog --no-tail --timeout 300 -- -buildTarget win64 -executeMethod CuuChau.Editor.CuuChauU6WindowsBuild.BuildWindows64
if ($LASTEXITCODE -ne 0) {
    throw "Unity build thất bại (exit=$LASTEXITCODE). Xem log: $buildLog"
}
if (-not (Test-Path $exePath) -or -not (Test-Path $dataDir)) {
    throw "Thiếu file đầu ra sau build tại: $exePath"
}

# ---------------------------------------------------------------------------
# Step C: Stage self-contained portable Sidecar directly into Builds/Windows/...
# ---------------------------------------------------------------------------
Write-Host "[Step C] Đóng gói Sidecar tự chứa vào StreamingAssets\ServerSidecar..." -ForegroundColor Cyan
$assetsSidecarNodeModules = Join-Path $unityProject "Assets\StreamingAssets\ServerSidecar\node_modules"
if (Test-Path $assetsSidecarNodeModules) {
    throw "Phát hiện node_modules nằm nhầm trong Assets\StreamingAssets\ServerSidecar! Phải giữ sạch để tránh sinh hàng nghìn file .meta."
}

$nodeCmd = Get-Command node -ErrorAction Stop
$nodeExeSrc = $nodeCmd.Source

foreach ($stale in @("apps", "packages", "node_modules", "node.exe", "package.json", "package-lock.json")) {
    $target = Join-Path $sidecarDir $stale
    if (Test-Path $target) {
        Remove-Item -Path $target -Recurse -Force
    }
}
New-Item -ItemType Directory -Path $sidecarDir -Force | Out-Null

Copy-Item -Path $nodeExeSrc -Destination (Join-Path $sidecarDir "node.exe") -Force

$serverStageDir = Join-Path $sidecarDir "apps\server"
New-Item -ItemType Directory -Path $serverStageDir -Force | Out-Null
Copy-Item -Path (Join-Path $repoRoot "apps\server\dist") -Destination (Join-Path $serverStageDir "dist") -Recurse -Force
Copy-Item -Path (Join-Path $repoRoot "apps\server\package.json") -Destination (Join-Path $serverStageDir "package.json") -Force

$sharedStageDir = Join-Path $sidecarDir "packages\shared"
New-Item -ItemType Directory -Path $sharedStageDir -Force | Out-Null
Copy-Item -Path (Join-Path $repoRoot "packages\shared\dist") -Destination (Join-Path $sharedStageDir "dist") -Recurse -Force
Copy-Item -Path (Join-Path $repoRoot "packages\shared\package.json") -Destination (Join-Path $sharedStageDir "package.json") -Force

# Install ONLY @lkdf/server production dependencies inside an isolated temp dir (no monorepo workspace hoisting)
$serverPkg = Get-Content -Path (Join-Path $repoRoot "apps\server\package.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$filteredDeps = [ordered]@{}
foreach ($prop in $serverPkg.dependencies.PSObject.Properties) {
    if ($prop.Name -ne "@lkdf/shared") {
        $filteredDeps[$prop.Name] = $prop.Value
    }
}
$sidecarManifest = [ordered]@{
    name = "cuuchau-sidecar-runtime"
    version = "0.6.0"
    private = $true
    type = "module"
    dependencies = $filteredDeps
}

$tempNpmDir = Join-Path $env:TEMP ("cuuchau-sidecar-npm-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tempNpmDir -Force | Out-Null
try {
    $manifestJson = $sidecarManifest | ConvertTo-Json -Depth 5
    [System.IO.File]::WriteAllText((Join-Path $tempNpmDir "package.json"), $manifestJson, [System.Text.UTF8Encoding]::new($false))
    Push-Location $tempNpmDir
    try {
        & npm.cmd install --omit=dev --no-audit --no-fund
        if ($LASTEXITCODE -ne 0) {
            throw "npm install --omit=dev cho Sidecar thất bại (exit=$LASTEXITCODE)."
        }
    }
    finally {
        Pop-Location
    }

    Copy-Item -Path (Join-Path $tempNpmDir "node_modules") -Destination (Join-Path $sidecarDir "node_modules") -Recurse -Force
}
finally {
    if (Test-Path $tempNpmDir) {
        Remove-Item -Path $tempNpmDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# Verify devDependencies are NOT bundled
$sidecarNodeModules = Join-Path $sidecarDir "node_modules"
foreach ($devPkg in @("tsx", "vitest", "typescript")) {
    if (Test-Path (Join-Path $sidecarNodeModules $devPkg)) {
        throw "Phát hiện gói devDependency '$devPkg' bị lọt vào Sidecar node_modules!"
    }
}

# Copy @lkdf/shared as a real directory (NO symlink)
$sharedScopeDir = Join-Path $sidecarNodeModules "@lkdf"
$sharedTargetDir = Join-Path $sharedScopeDir "shared"
New-Item -ItemType Directory -Path $sharedScopeDir -Force | Out-Null
if (Test-Path $sharedTargetDir) {
    Remove-Item -Path $sharedTargetDir -Recurse -Force
}
Copy-Item -Path $sharedStageDir -Destination $sharedTargetDir -Recurse -Force
if (-not (Test-Path (Join-Path $sharedTargetDir "dist\index.js"))) {
    throw "Thiếu @lkdf/shared/dist/index.js trong Sidecar node_modules!"
}

# Copy THIRD_PARTY_NOTICES.txt
$noticesCandidates = @(
    (Join-Path $repoRoot "THIRD_PARTY_NOTICES.txt"),
    (Join-Path $repoRoot "apps\desktop\THIRD_PARTY_NOTICES.txt")
)
foreach ($candidate in $noticesCandidates) {
    if (Test-Path $candidate) {
        Copy-Item -Path $candidate -Destination (Join-Path $buildDir "THIRD_PARTY_NOTICES.txt") -Force
        break
    }
}

# Generate concise quick-start guide alongside CuuChauAnKiem.exe
$quickStartContent = @"
CỬU CHÂU ẨN KIẾM (BLADES OF THE NINE REALMS) — BẢN CHƠI ĐỘC LẬP WINDOWS x64 (0.6.0)
====================================================================================

1. CÁCH MỞ GAME
   - Giải nén toàn bộ tệp trong gói .zip ra một thư mục riêng (không mở trực tiếp bên trong .zip).
   - Chạy CuuChauAnKiem.exe. Máy chủ trò chơi tích hợp tự động khởi chạy cùng cửa sổ game và tự tắt khi đóng game.

2. CHƠI OFFLINE / ĐẤU VỚI MÁY (BOT)
   - Tại Sảnh Đại Điện -> bấm "Tạo Phòng" -> bấm "Thêm Máy (Bot)" đủ 4-8 ghế -> "Sẵn Sàng" -> "Khởi Chiến".

3. CHƠI MẠNG LAN / RADMIN VPN / TAILSCALE (4-8 NGƯỜI THẬT)
   - Chủ phòng (Host) tạo phòng, gửi Mã Phòng + địa chỉ IP LAN/VPN (cổng mặc định 3001) cho bạn bè.
   - Người chơi khác mở game -> nhập địa chỉ http://<IP-Chủ-Phòng>:3001 và Mã Phòng để vào chung bàn.
   - Nếu Windows Firewall hỏi quyền mạng lần đầu, chọn "Allow access" (Private/LAN).

4. ĐIỀU KHIỂN & TRỌNG TÀI
   - Kéo hoặc nhấn giữ lá bài rồi thả lên mục tiêu hợp lệ để xuất chiêu.
   - Nút Trọng Tài (góc trên bên phải): Tạm dừng trận, Chỉnh đồng hồ, Hoàn tác hoặc Dừng trận.
   - Nút Cẩm Nang: Tra cứu nhanh kỹ năng 25 Tướng và 108 lá chuẩn.
"@
[System.IO.File]::WriteAllText((Join-Path $buildDir "HUONG_DAN_CHOI_NHANH.txt"), $quickStartContent, [System.Text.UTF8Encoding]::new($false))

# ---------------------------------------------------------------------------
# Step D: Portable Sidecar isolated smoke check (port 3098, json::memory:)
# ---------------------------------------------------------------------------
Write-Host "[Step D] Kiểm tra Sidecar độc lập trên cổng 3098 (DATABASE_URL=json::memory:)..." -ForegroundColor Cyan
if (Test-PortInUse -Port 3098) {
    throw "Cổng 3098 đang bị chiếm dụng trước khi chạy smoke test Sidecar."
}

$sidecarNodeExe = Join-Path $sidecarDir "node.exe"
$sidecarEntryJs = Join-Path $sidecarDir "apps\server\dist\index.js"

$psi = [System.Diagnostics.ProcessStartInfo]::new()
$psi.FileName = $sidecarNodeExe
$psi.Arguments = "`"$sidecarEntryJs`""
$psi.WorkingDirectory = $sidecarDir
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.EnvironmentVariables["HOST"] = "127.0.0.1"
$psi.EnvironmentVariables["PORT"] = "3098"
$psi.EnvironmentVariables["DATABASE_URL"] = "json::memory:"
$psi.EnvironmentVariables["NODE_ENV"] = "production"
$psi.EnvironmentVariables["JWT_SESSION_SECRET"] = "cuu_chau_smoke_test_secret_key_v1"

$smokeProc = [System.Diagnostics.Process]::new()
$smokeProc.StartInfo = $psi
[void]$smokeProc.Start()
try {
    $deadline = (Get-Date).AddSeconds(15)
    $sidecarOk = $false
    while ((Get-Date) -lt $deadline) {
        if ($smokeProc.HasExited) {
            $errOut = $smokeProc.StandardError.ReadToEnd()
            throw "Sidecar thoát sớm khi smoke test (exit=$($smokeProc.ExitCode)): $errOut"
        }
        $health = Invoke-HealthCheck -Url "http://127.0.0.1:3098/api/health"
        if ($null -ne $health -and $health.ok -eq $true -and $health.heroCount -eq 25) {
            $sidecarOk = $true
            Write-Host "   Sidecar health OK: heroCount=$($health.heroCount), deckTotal=$($health.deckTotal)" -ForegroundColor Green
            break
        }
        Start-Sleep -Milliseconds 300
    }
    if (-not $sidecarOk) {
        throw "Sidecar không phản hồi /api/health (heroCount == 25) trong 15 giây tại cổng 3098."
    }
}
finally {
    if (-not $smokeProc.HasExited) {
        try { $smokeProc.Kill(); $smokeProc.WaitForExit(3000) | Out-Null } catch {}
    }
    $smokeProc.Dispose()
}

# ---------------------------------------------------------------------------
# Step E: Real CuuChauAnKiem.exe live smoke test + Win32 Job Object cleanup check
# ---------------------------------------------------------------------------
Write-Host "[Step E] Chạy thử CuuChauAnKiem.exe thật + kiểm tra cổng 3001 & Win32 Job Object..." -ForegroundColor Cyan
if (Test-PortInUse -Port 3001) {
    $holder = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    $holderPid = if ($holder) { $holder.OwningProcess } else { "unknown" }
    throw "Cổng 3001 đang có tiến trình khác chiếm giữ (PID=$holderPid). Hãy đóng tiến trình cũ trước khi smoke test."
}

$playerProc = Start-Process -FilePath $exePath `
    -ArgumentList @("-screen-width", "1280", "-screen-height", "720", "-screen-fullscreen", "0") `
    -WorkingDirectory $buildDir `
    -PassThru

$bundledNodePids = @()
try {
    $deadline = (Get-Date).AddSeconds(20)
    $playerHealthOk = $false
    while ((Get-Date) -lt $deadline) {
        if ($playerProc.HasExited) {
            throw "CuuChauAnKiem.exe thoát sớm trong lúc khởi động (exit=$($playerProc.ExitCode))."
        }
        $health = Invoke-HealthCheck -Url "http://127.0.0.1:3001/api/health"
        if ($null -ne $health -and $health.ok -eq $true -and $health.heroCount -eq 25) {
            $playerHealthOk = $true
            Write-Host "   CuuChauAnKiem.exe Sidecar health OK: heroCount=$($health.heroCount), deckTotal=$($health.deckTotal)" -ForegroundColor Green
            break
        }
        Start-Sleep -Milliseconds 500
    }

    if (-not $playerHealthOk) {
        throw "CuuChauAnKiem.exe không đưa được Sidecar lên /api/health (heroCount == 25) trong 20 giây."
    }

    $playerProc.Refresh()
    if ($playerProc.HasExited) {
        throw "CuuChauAnKiem.exe đã thoát trước khi kiểm tra tiến trình con."
    }

    $nodeProcs = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
        Where-Object {
            $cmd = ($_.CommandLine -replace '/', '\')
            $cmd -like "*CuuChauAnKiem_Data\StreamingAssets\ServerSidecar*"
        }

    $bundledNodePids = @($nodeProcs | ForEach-Object { [int]$_.ProcessId })
    if ($bundledNodePids.Count -lt 1) {
        throw "Không tìm thấy tiến trình con node.exe chạy từ CuuChauAnKiem_Data\StreamingAssets\ServerSidecar."
    }
    Write-Host "   Xác nhận tiến trình con Sidecar đang chạy (PID: $($bundledNodePids -join ', '))" -ForegroundColor Green
}
finally {
    if (-not $playerProc.HasExited) {
        try { $null = $playerProc.CloseMainWindow() } catch {}
        $exitWait = (Get-Date).AddSeconds(3)
        while (-not $playerProc.HasExited -and (Get-Date) -lt $exitWait) {
            Start-Sleep -Milliseconds 200
            $playerProc.Refresh()
        }
        if (-not $playerProc.HasExited) {
            try { $playerProc.Kill() } catch {}
            $playerProc.WaitForExit(5000) | Out-Null
        }
    }
}

if ($bundledNodePids.Count -gt 0) {
    $jobDeadline = (Get-Date).AddSeconds(5)
    $allExited = $false
    while ((Get-Date) -lt $jobDeadline) {
        $alive = @()
        foreach ($nodePid in $bundledNodePids) {
            if (Get-Process -Id $nodePid -ErrorAction SilentlyContinue) {
                $alive += $nodePid
            }
        }
        if ($alive.Count -eq 0) {
            $allExited = $true
            break
        }
        Start-Sleep -Milliseconds 200
    }
    if (-not $allExited) {
        throw "Tiến trình con Sidecar không tự tắt trong 5 giây sau khi đóng CuuChauAnKiem.exe (Win32 Job Object check thất bại)."
    }
    Write-Host "   Xác nhận Win32 Job Object đã dọn sạch Sidecar node.exe trong <5s." -ForegroundColor Green
}

# Remove temporary sidecar DB/lock created during live smoke test
$smokePersistDir = Join-Path $env:USERPROFILE "AppData\LocalLow\CuuChauStudio\CuuChauAnKiem"
if (Test-Path $smokePersistDir) {
    Get-ChildItem -Path $smokePersistDir -Filter "lkdf-sidecar.json*" -ErrorAction SilentlyContinue |
        Remove-Item -Force -ErrorAction SilentlyContinue
}

# ---------------------------------------------------------------------------
# Step F: Zip Builds\Windows\* to releases\ & copy to OneDrive Desktop
# ---------------------------------------------------------------------------
Write-Host "[Step F] Đóng gói bản phát hành Portable .zip..." -ForegroundColor Cyan
Get-ChildItem -Path $buildDir -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like "*_DoNotShip" -or $_.Name -like "*_ButDontShipItWithYourGame" } |
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

if (-not (Test-Path $releaseDir)) {
    New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null
}
if (Test-Path $releaseZip) {
    Remove-Item -Path $releaseZip -Force
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory(
    $buildDir,
    $releaseZip,
    [System.IO.Compression.CompressionLevel]::Optimal,
    $false
)

$zipInfo = Get-Item -Path $releaseZip
$zipSizeMb = [Math]::Round($zipInfo.Length / 1MB, 2)
Write-Host "   Đã tạo gói phát hành: $releaseZip ($zipSizeMb MB)" -ForegroundColor Green

if (Test-Path $desktopDir) {
    Copy-Item -Path $releaseZip -Destination $desktopZip -Force
    Write-Host "   Đã sao chép ra Desktop: $desktopZip" -ForegroundColor Green
}
else {
    Write-Warning "Không tìm thấy thư mục Desktop: $desktopDir (bỏ qua bước sao chép Desktop)."
}

# ---------------------------------------------------------------------------
# Step G: Sync installed local copy (%LOCALAPPDATA%\Programs\CuuChauAnKiem) & Shortcuts
# ---------------------------------------------------------------------------
$localInstallDir = Join-Path $env:LOCALAPPDATA "Programs\CuuChauAnKiem"
$runningInstalled = Get-Process -Name "CuuChauAnKiem" -ErrorAction SilentlyContinue
if ($null -eq $runningInstalled) {
    Write-Host "[Step G] Đồng bộ bản cài chính tại $localInstallDir..." -ForegroundColor Cyan
    if (Test-Path $localInstallDir) {
        Remove-Item -Path $localInstallDir -Recurse -Force
    }
    New-Item -ItemType Directory -Path $localInstallDir -Force | Out-Null
    Copy-Item -Path (Join-Path $buildDir "*") -Destination $localInstallDir -Recurse -Force

    $iconCandidate = Join-Path $repoRoot "apps\desktop\assets\icon.ico"
    $installedIcon = Join-Path $localInstallDir "icon.ico"
    if (Test-Path $iconCandidate) {
        Copy-Item -Path $iconCandidate -Destination $installedIcon -Force
    }

    $installedExe = Join-Path $localInstallDir "CuuChauAnKiem.exe"
    $shortcutTargetExe = $installedExe
    $cscPath = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
    if (Test-Path $cscPath) {
        $launcherSrc = Join-Path $env:TEMP ("LaunchCuuChau_" + [guid]::NewGuid().ToString("N") + ".cs")
        $launcherExe = Join-Path $localInstallDir "LaunchCuuChau.exe"
        $launcherCode = @'
using System;
using System.Diagnostics;
using System.IO;
static class Program {
    [STAThread]
    static void Main() {
        string dir = AppDomain.CurrentDomain.BaseDirectory;
        var psi = new ProcessStartInfo {
            FileName = Path.Combine(dir, "CuuChauAnKiem.exe"),
            WorkingDirectory = dir,
            UseShellExecute = false
        };
        Process.Start(psi);
    }
}
'@
        [System.IO.File]::WriteAllText($launcherSrc, $launcherCode, [System.Text.UTF8Encoding]::new($false))
        $iconArg = if (Test-Path $installedIcon) { "/win32icon:$installedIcon" } else { $null }
        if ($null -ne $iconArg) {
            & $cscPath /nologo /target:winexe /optimize+ "/out:$launcherExe" $iconArg $launcherSrc | Out-Null
        } else {
            & $cscPath /nologo /target:winexe /optimize+ "/out:$launcherExe" $launcherSrc | Out-Null
        }
        Remove-Item $launcherSrc -Force -ErrorAction SilentlyContinue
        if (Test-Path $launcherExe) {
            $shortcutTargetExe = $launcherExe
        }
    }

    $shortcutPaths = @(
        (Join-Path $desktopDir "Blades of the Nine Realms.lnk"),
        (Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Blades of the Nine Realms.lnk")
    )
    $wsh = New-Object -ComObject WScript.Shell
    foreach ($lnkPath in $shortcutPaths) {
        $lnkParent = Split-Path -Parent $lnkPath
        if (Test-Path $lnkParent) {
            if (Test-Path $lnkPath) {
                Remove-Item -Path $lnkPath -Force
            }
            $sc = $wsh.CreateShortcut($lnkPath)
            $sc.TargetPath = $shortcutTargetExe
            $sc.WorkingDirectory = $localInstallDir
            $sc.Description = "Cửu Châu Ẩn Kiếm (Blades of the Nine Realms) — Unity 6.3"
            if (Test-Path $installedIcon) {
                $sc.IconLocation = "$installedIcon,0"
            }
            $sc.Save()
        }
    }
    Write-Host "   Đã cập nhật bản cài chính & Shortcut Desktop/Start Menu -> $installedExe" -ForegroundColor Green
}
else {
    Write-Warning "CuuChauAnKiem.exe đang mở, bỏ qua cập nhật trực tiếp $localInstallDir."
}

Write-Host "=== HOÀN TẤT PORTABLE & INSTALLED BUILD ($zipSizeMb MB) ===" -ForegroundColor Yellow
