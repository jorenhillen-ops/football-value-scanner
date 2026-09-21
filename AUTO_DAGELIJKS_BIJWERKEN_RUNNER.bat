@echo off
setlocal
cd /d "%~dp0"

REM Alleen starten wanneer de server nog niet bereikbaar is.
powershell -NoProfile -Command "try{$r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3106/health' -TimeoutSec 1;if($r.StatusCode -eq 200){exit 0}else{exit 1}}catch{exit 1}"
if not errorlevel 1 exit /b 0

REM Eerst code bijwerken; data/ en API-keys blijven behouden.
if exist "UPDATE_FROM_GITHUB.ps1" powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0UPDATE_FROM_GITHUB.ps1" -Quiet

if not exist "node_modules\express\package.json" call npm install --no-audit --no-fund
set PORT=3106
start "Football Value Scanner AUTO SERVER" /min cmd /k "cd /d ""%~dp0"" && set PORT=3106 && npm start"
exit /b 0
