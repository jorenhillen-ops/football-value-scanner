@echo off
cd /d "%~dp0"
echo Football Value Scanner - updatecontrole
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0UPDATE_FROM_GITHUB.ps1" -Force
set RC=%ERRORLEVEL%
echo.
if "%RC%"=="10" (
  echo Update toegepast.
) else (
  echo Controle afgerond.
)
pause
