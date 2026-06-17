param(
  [int]$Port = 3001
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

Write-Host "Projeto:" $projectRoot
Write-Host "Porta do app:" $Port

$connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue

if ($connections) {
  $processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique

  foreach ($processId in $processIds) {
    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue

    if ($process -and $process.ProcessName -eq "node") {
      Write-Host "Parando processo node PID" $processId "que esta usando a porta" $Port
      Stop-Process -Id $processId -Force
    }
  }

  Start-Sleep -Seconds 2
}

Write-Host "Rodando npm ci..."
npm ci
if ($LASTEXITCODE -ne 0) {
  throw "npm ci falhou."
}

Write-Host "Rodando npm run build..."
npm run build
if ($LASTEXITCODE -ne 0) {
  throw "npm run build falhou."
}

Write-Host ""
Write-Host "Deploy preparado com sucesso."
Write-Host "Para subir o app novamente:"
Write-Host "  `$env:PORT='$Port'; node .next\\standalone\\server.js"
