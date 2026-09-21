@echo off
setlocal
title Football Value Scanner - dagelijkse automatische update
cd /d "%~dp0"

echo Football Value Scanner - dagelijkse automatische update
echo.
echo Deze installatie maakt een Windows-taak die elke dag rond 08:00:
echo - de actuele wedstrijden en Napoleon-data vernieuwt;
echo - clubs en spelers via Sportmonks laat onderhouden;
echo - gemiste runs uitvoert zodra Windows weer beschikbaar is.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0DAILY_AUTO_UPDATE.ps1" -InstallTask
if errorlevel 1 (
  echo.
  echo Installatie is niet gelukt. Klik met rechts op dit bestand en kies
  echo 'Als administrator uitvoeren' en probeer opnieuw.
  pause
  exit /b 1
)

echo.
echo Klaar. Je hoeft de dagelijkse data-update niet meer handmatig te starten.
pause
