@echo off
setlocal
title Football Value Scanner LIVE
cd /d "%~dp0"

if not exist "data" mkdir "data"

REM Controleer bij elke start automatisch of er nieuwe code op GitHub staat.
if exist "UPDATE_FROM_GITHUB.ps1" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0UPDATE_FROM_GITHUB.ps1" -Quiet
)

if not exist "package.json" (
  echo FOUT: package.json niet gevonden.
  pause
  exit /b 1
)

REM npm install is snel wanneer alles al actueel is en pakt ook nieuwe dependencies mee.
echo Dependencies controleren...
call npm install --no-audit --no-fund >nul
if errorlevel 1 (
  echo npm install gaf een fout. De bestaande installatie wordt geprobeerd.
)

set PORT=3106
start "Football Value Scanner LIVE" cmd /k "cd /d ""%~dp0"" && set PORT=3106 && npm start"
timeout /t 4 /nobreak >nul
start "" "http://localhost:3106"
exit
