@echo off
setlocal
title Football Value Scanner - iPhone app
cd /d "%~dp0"

if not exist "IPHONE_APP_INSTALLEREN.ps1" (
  echo FOUT: IPHONE_APP_INSTALLEREN.ps1 ontbreekt.
  echo Voer eerst CHECK_UPDATE.bat uit.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0IPHONE_APP_INSTALLEREN.ps1"
exit /b %errorlevel%
