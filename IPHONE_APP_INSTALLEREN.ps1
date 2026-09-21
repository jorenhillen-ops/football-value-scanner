$ErrorActionPreference='SilentlyContinue'
$root=Split-Path -Parent $MyInvocation.MyCommand.Path
$port=3106
Write-Host 'Football Value Scanner - iPhone installatie' -ForegroundColor Cyan
Write-Host ''

try {
  $health=Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port/health" -TimeoutSec 2
} catch {
  Write-Host 'De scanner-server draait nog niet.' -ForegroundColor Yellow
  Write-Host 'Start eerst START_FOOTBALL_VALUE_SCANNER.bat en laat het servervenster open.'
  Read-Host 'Druk Enter om af te sluiten'
  exit 1
}

$cfg=Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -and $_.IPv4Address -and $_.NetAdapter.Status -eq 'Up' } | Sort-Object InterfaceMetric | Select-Object -First 1
$ip=$null
if($cfg){$ip=($cfg.IPv4Address | Where-Object { $_.IPAddress -notmatch '^127\.' } | Select-Object -First 1 -ExpandProperty IPAddress)}
if(-not $ip){
  $ip=(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -match '^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[01])\.' -and $_.AddressState -eq 'Preferred' } | Sort-Object InterfaceMetric | Select-Object -First 1 -ExpandProperty IPAddress)
}
if(-not $ip){
  Write-Host 'Geen lokaal IPv4-adres gevonden.' -ForegroundColor Red
  Write-Host 'Controleer of de pc met wifi/ethernet verbonden is.'
  Read-Host 'Druk Enter om af te sluiten'
  exit 1
}

$rule=Get-NetFirewallRule -DisplayName 'Football Value Scanner 3106' -ErrorAction SilentlyContinue
if(-not $rule){
  Write-Host 'Windows Firewall moet poort 3106 op je prive-netwerk toelaten.' -ForegroundColor Yellow
  Write-Host 'Er kan nu een Windows-bevestigingsvenster verschijnen.'
  $cmd="New-NetFirewallRule -DisplayName 'Football Value Scanner 3106' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3106 -Profile Private | Out-Null"
  try { Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-Command',$cmd } catch {}
}

$url="http://${ip}:$port"
try {
  $lan=Invoke-WebRequest -UseBasicParsing -Uri "$url/health" -TimeoutSec 3
  $ok=$lan.StatusCode -eq 200
} catch {$ok=$false}

Write-Host ''
if($ok){
  Write-Host 'KLAAR. Open op je iPhone in Safari:' -ForegroundColor Green
} else {
  Write-Host 'Gebruik op je iPhone in Safari dit adres:' -ForegroundColor Yellow
}
Write-Host ''
Write-Host "    $url" -ForegroundColor Cyan
Write-Host ''
Write-Host 'Belangrijk:'
Write-Host '- iPhone en pc moeten op hetzelfde wifi-netwerk zitten.'
Write-Host '- De Football Value Scanner-server moet op de pc blijven draaien.'
Write-Host '- Zet mobiele data eventueel kort uit tijdens de eerste test.'
Write-Host '- Daarna: Safari > Deel > Zet op beginscherm > Voeg toe.'
Write-Host ''
if(-not $ok){
  Write-Host 'De LAN-test vanaf deze pc kon het adres nog niet bevestigen.' -ForegroundColor Yellow
  Write-Host 'Controleer in Windows of je huidige netwerkprofiel op Prive staat.'
}
Read-Host 'Druk Enter om dit venster te sluiten'
