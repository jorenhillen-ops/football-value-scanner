param([switch]$InstallTask)

$ErrorActionPreference='Stop'
$Root=Split-Path -Parent $MyInvocation.MyCommand.Path
$TaskName='Football Value Scanner Daily Update'
$Log=Join-Path $Root 'data\daily-auto-update.log'
$ScriptPath=$MyInvocation.MyCommand.Path

function Log([string]$m){
  if(!(Test-Path (Split-Path $Log -Parent))){New-Item -ItemType Directory -Force -Path (Split-Path $Log -Parent)|Out-Null}
  Add-Content -Path $Log -Value ("{0}  {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'),$m)
}

if($InstallTask){
  try{
    $action=New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ("-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"{0}`"" -f $ScriptPath)
    $trigger=New-ScheduledTaskTrigger -Daily -At '08:00'
    $settings=New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew
    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Description 'Vernieuwt dagelijks Football Value Scanner-data, clubs en spelers wanneer Windows beschikbaar is.' -Force | Out-Null
    Write-Host "Dagelijkse update ingesteld om 08:00. Gemiste runs starten zodra Windows weer beschikbaar is."
    Write-Host "Taak: $TaskName"
    exit 0
  }catch{
    Write-Host "Kon de geplande taak niet registreren: $($_.Exception.Message)"
    Write-Host "Probeer INSTALL_DAILY_AUTO_UPDATE.bat eenmalig als administrator uit te voeren."
    exit 1
  }
}

Set-Location $Root
Log 'Dagupdate gestart.'

function HealthOk{
  try{$r=Invoke-RestMethod -Uri 'http://127.0.0.1:3106/health' -TimeoutSec 2;return [bool]$r.ok}catch{return $false}
}

try{
  if(-not (HealthOk)){
    Log 'Server draait niet; eerst GitHub-update uitvoeren.'
    $updater=Join-Path $Root 'UPDATE_FROM_GITHUB.ps1'
    if(Test-Path $updater){& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $updater -Quiet | Out-Null}
    Log 'Server verborgen starten.'
    Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','set PORT=3106&&npm start' -WorkingDirectory $Root -WindowStyle Hidden | Out-Null
    $ok=$false
    for($i=0;$i -lt 60;$i++){
      if(HealthOk){$ok=$true;break}
      Start-Sleep -Seconds 1
    }
    if(-not $ok){throw 'Server reageert niet op /health na 60 seconden.'}
  }else{
    Log 'Server draait al; lokale runtime blijft actief.'
  }

  Log 'Actuele wedstrijddashboard-refresh starten.'
  try{
    $body='{}'
    $resp=Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:3106/api/refresh' -ContentType 'application/json' -Body $body -TimeoutSec 120
    if($resp.running){
      for($i=0;$i -lt 120;$i++){
        Start-Sleep -Seconds 2
        $st=Invoke-RestMethod -Uri 'http://127.0.0.1:3106/api/sync-status' -TimeoutSec 3
        if(-not $st.running){break}
      }
    }
    Log 'Wedstrijdrefresh klaar of reeds actueel.'
  }catch{
    Log ("Wedstrijdrefresh waarschuwing: {0}" -f $_.Exception.Message)
  }

  Log 'Club- en spelersmaintenance starten.'
  try{
    Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:3106/api/maintenance-now' -ContentType 'application/json' -Body '{}' -TimeoutSec 15 | Out-Null
    Log 'Club/speler-maintenance gestart.'
  }catch{
    Log ("Club/speler-maintenance waarschuwing: {0}" -f $_.Exception.Message)
  }

  Log 'Dagupdate afgerond.'
}catch{
  Log ("FOUT: {0}" -f $_.Exception.Message)
  exit 1
}
