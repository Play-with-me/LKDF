$ErrorActionPreference = "Stop"
$unityCli = Join-Path $env:LocalAppData "Unity\bin\unity.exe"

Write-Host "=== SETUP UNITY 6000.3.29f1 LTS INTO D:\Unity Hub\Installs ===" -ForegroundColor Yellow

if (-not (Test-Path $unityCli)) {
    Write-Error "Unity CLI not found at $unityCli"
    exit 1
}

Write-Host "[1/4] Setting install path to D:\Unity Hub\Installs ..." -ForegroundColor Cyan
& $unityCli editors install-path --set "D:\Unity Hub\Installs"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "[2/4] Installing Unity 6000.3.29f1 LTS (reusing 4.01 GB payload, click YES on UAC)..." -ForegroundColor Cyan
& $unityCli install 6000.3.29f1 --resume --yes --accept-eula --set-default
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "[3/4] Opening browser to sign in to Unity Personal (free)..." -ForegroundColor Cyan
& $unityCli auth login
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "[4/4] Activating free Unity Personal license..." -ForegroundColor Cyan
& $unityCli license activate --personal --accept-eula
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "=== VERIFYING FINAL UNITY STATUS ===" -ForegroundColor Green
& $unityCli editors --installed
& $unityCli license status
Read-Host "DONE! Press Enter to close"
