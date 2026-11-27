@echo off
setlocal
set "UNITY_CLI=%LocalAppData%\Unity\bin\unity.exe"

echo === SETUP UNITY 6000.3.29f1 LTS INTO D:\Unity Hub\Installs ===
if not exist "%UNITY_CLI%" (
  echo [ERROR] Unity CLI not found at "%UNITY_CLI%".
  pause
  exit /b 1
)

echo [1/4] Setting install path to D:\Unity Hub\Installs ...
"%UNITY_CLI%" editors install-path --set "D:\Unity Hub\Installs"
if errorlevel 1 (
  echo [ERROR] Failed to set install path.
  pause
  exit /b 1
)

echo [2/4] Installing Unity 6000.3.29f1 LTS (reusing downloaded 4.01 GB file, click YES on UAC)...
"%UNITY_CLI%" install 6000.3.29f1 --resume --yes --accept-eula --set-default
if errorlevel 1 (
  echo [ERROR] Unity install did not finish. Please check UAC or try running as Administrator.
  pause
  exit /b 1
)

echo [3/4] Opening browser to sign in to Unity Personal (free 0 VND)...
"%UNITY_CLI%" auth login
if errorlevel 1 (
  echo [ERROR] Unity auth login failed or timed out.
  pause
  exit /b 1
)

echo [4/4] Activating free Unity Personal license...
"%UNITY_CLI%" license activate --personal --accept-eula
if errorlevel 1 (
  echo [ERROR] License activation failed.
  pause
  exit /b 1
)

echo.
echo === VERIFYING FINAL UNITY STATUS ===
"%UNITY_CLI%" editors --installed
"%UNITY_CLI%" license status
echo.
echo === DONE! Keep this window open to verify 6000.3.29f1 and Active License above ===
pause
endlocal
