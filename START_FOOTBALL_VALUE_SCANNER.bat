@echo off
setlocal
title Football Value Scanner V15.4
cd /d "%~dp0"

if not exist "data" mkdir "data"

REM 1) Eerst nieuwe code ophalen. data/ en node_modules/ worden door de updater behouden.
if exist "UPDATE_FROM_GITHUB.ps1" (
  echo Controleren op updates...
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0UPDATE_FROM_GITHUB.ps1" -Quiet
)

REM 2) Basiscontroles.
where node >nul 2>nul
if errorlevel 1 (
  echo FOUT: Node.js is niet gevonden. Installeer Node.js 18 of nieuwer.
  pause
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo FOUT: npm is niet gevonden.
  pause
  exit /b 1
)
if not exist "package.json" (
  echo FOUT: package.json ontbreekt. Voer CHECK_UPDATE.bat uit.
  pause
  exit /b 1
)

REM 3) Alleen dependencies installeren wanneer Express echt ontbreekt.
if not exist "node_modules\express\package.json" (
  echo Eerste installatie: dependencies installeren...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo FOUT: npm install is mislukt. Controleer internetverbinding en probeer opnieuw.
    pause
    exit /b 1
  )
)

REM 4) Start server zichtbaar en LAN-ready voor de iPhone-webapp.
set PORT=3106
set HOST=0.0.0.0
start "Football Value Scanner V15.4 SERVER" cmd /k "cd /d ""%~dp0"" && set PORT=3106 && set HOST=0.0.0.0 && npm start"

echo Wachten tot V15.4 klaar is op http://localhost:3106 ...
powershell -NoProfile -Command "$ok=$false; for($i=0;$i -lt 50;$i++){ try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:3106/health' -TimeoutSec 1; if($r.StatusCode -eq 200){$ok=$true;break} } catch {}; Start-Sleep -Milliseconds 500 }; if($ok){exit 0}else{exit 1}"
if errorlevel 1 (
  echo.
  echo V15.4 reageert nog niet. Kijk in het venster 'Football Value Scanner V15.4 SERVER' voor de exacte fout.
  echo Je lokale data en API-keys zijn niet verwijderd.
  pause
  exit /b 1
)

start "" "http://localhost:3106"
exit /b 0
