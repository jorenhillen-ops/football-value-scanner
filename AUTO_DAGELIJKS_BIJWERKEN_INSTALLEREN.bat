@echo off
setlocal
title Football Value Scanner - dagelijks automatisch bijwerken
cd /d "%~dp0"

echo Football Value Scanner - dagelijks automatisch bijwerken
echo.
echo Dit maakt een Windows-taak die bij aanmelden de scanner start.
echo Daarna verversen wedstrijden automatisch minstens elk uur en clubs/spelers dagelijks.
echo.

set "TASK=Football Value Scanner AutoStart"
set "RUNNER=%~dp0AUTO_DAGELIJKS_BIJWERKEN_RUNNER.bat"
if not exist "%RUNNER%" (
  echo FOUT: AUTO_DAGELIJKS_BIJWERKEN_RUNNER.bat ontbreekt. Voer CHECK_UPDATE.bat uit.
  pause
  exit /b 1
)

schtasks /Create /F /SC ONLOGON /TN "%TASK%" /TR "\"%RUNNER%\"" >nul 2>nul
if errorlevel 1 (
  echo Kon de Windows-taak niet maken.
  echo Probeer dit bestand eenmalig met rechtsklik ^> Als administrator uitvoeren.
  pause
  exit /b 1
)

echo.
echo KLAAR.
echo Vanaf nu start de scanner automatisch wanneer je op Windows aanmeldt.
echo De bestaande data/API-keys blijven behouden.
echo.
pause
