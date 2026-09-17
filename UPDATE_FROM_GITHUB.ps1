param(
  [switch]$Force,
  [switch]$Quiet
)

$ErrorActionPreference = 'Stop'
$Repo = 'jorenhillen-ops/football-value-scanner'
$Branch = 'main'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$DataDir = Join-Path $Root 'data'
$StateFile = Join-Path $DataDir 'update-state.json'

function Say($Text) {
  if (-not $Quiet) { Write-Host $Text }
}

if (-not (Test-Path $DataDir)) {
  New-Item -ItemType Directory -Path $DataDir | Out-Null
}

try {
  $headers = @{ 'User-Agent' = 'Football-Value-Scanner-Updater' }
  $commit = Invoke-RestMethod -Headers $headers -Uri "https://api.github.com/repos/$Repo/commits/$Branch" -TimeoutSec 20
  $remoteSha = [string]$commit.sha
  if (-not $remoteSha) { throw 'GitHub gaf geen commit-ID terug.' }

  $localSha = ''
  if (Test-Path $StateFile) {
    try { $localSha = [string](Get-Content $StateFile -Raw | ConvertFrom-Json).lastCommit } catch {}
  }

  if (-not $Force -and $localSha -eq $remoteSha) {
    Say 'Code is al up-to-date.'
    exit 0
  }

  Say 'Nieuwe code-update gevonden. Bezig met bijwerken...'
  $temp = Join-Path ([System.IO.Path]::GetTempPath()) ("football-value-scanner-" + [guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $temp | Out-Null
  $zip = Join-Path $temp 'update.zip'
  $extract = Join-Path $temp 'extract'

  Invoke-WebRequest -Headers $headers -Uri "https://codeload.github.com/$Repo/zip/refs/heads/$Branch" -OutFile $zip -TimeoutSec 60
  Expand-Archive -Path $zip -DestinationPath $extract -Force
  $source = Get-ChildItem $extract -Directory | Select-Object -First 1
  if (-not $source) { throw 'Updatepakket kon niet worden uitgepakt.' }

  # Runtime data, API keys and installed dependencies are deliberately preserved.
  $null = & robocopy $source.FullName $Root /E /R:2 /W:1 /XD data node_modules .git .update-temp /XF *.log
  $rc = $LASTEXITCODE
  if ($rc -ge 8) { throw "Bestanden kopieren mislukt (robocopy code $rc)." }

  $state = [ordered]@{
    lastCommit = $remoteSha
    updatedAt = (Get-Date).ToUniversalTime().ToString('o')
    repository = $Repo
    branch = $Branch
  }
  $state | ConvertTo-Json | Set-Content -Path $StateFile -Encoding UTF8

  Remove-Item $temp -Recurse -Force -ErrorAction SilentlyContinue
  Say 'Update voltooid. Lokale data en API-sleutels zijn behouden.'
  exit 10
}
catch {
  Say ("Updatecontrole overgeslagen: " + $_.Exception.Message)
  exit 0
}
