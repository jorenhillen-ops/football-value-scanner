@echo off
setlocal
title Football Value Scanner - iPhone app
cd /d "%~dp0"

echo Football Value Scanner iPhone Web App
echo.
echo 1. Start eerst START_FOOTBALL_VALUE_SCANNER.bat en laat het servervenster open.
echo 2. Zorg dat iPhone en pc op hetzelfde wifi-netwerk zitten.
echo.
for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "$ip=Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue ^| Where-Object {$_.IPAddress -notmatch '^127\.' -and $_.AddressState -eq 'Preferred' -and $_.PrefixOrigin -ne 'WellKnown'} ^| Sort-Object InterfaceMetric ^| Select-Object -First 1 -ExpandProperty IPAddress; if($ip){$ip}"`) do set IP=%%I

if not defined IP (
  echo Geen lokaal IPv4-adres gevonden.
  echo Open op de pc: http://localhost:3106
  echo Zoek daarna je lokale pc-IP via ipconfig.
  pause
  exit /b 1
)

echo Open op je iPhone in Safari:
echo.
echo     http://%IP%:3106
echo.
echo Daarna in Safari:
echo   Deel-knop ^> Zet op beginscherm ^> Voeg toe
echo.
echo Vanaf dan staat Value Scanner als app-icoon op je iPhone.
echo De pc moet aanstaan en de scanner-server moet draaien om de app te gebruiken.
echo.
echo Werkt het adres niet? Dan blokkeert Windows Firewall mogelijk poort 3106 op je prive-netwerk.
pause
