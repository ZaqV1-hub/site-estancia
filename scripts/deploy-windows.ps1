param(
  [int]$Port = 3001
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot
$serviceName = "site-estancia-next"
$service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
$restartService = $service -and $service.Status -eq "Running"
$buildBackup = Join-Path $projectRoot (".next-deploy-backup-" + (Get-Date -Format "yyyyMMddHHmmss"))
$failedBuild = Join-Path $projectRoot (".next-failed-" + (Get-Date -Format "yyyyMMddHHmmss"))

Write-Host "Projeto:" $projectRoot
Write-Host "Porta do app:" $Port

if ($restartService) {
  Write-Host "Parando o servico" $serviceName "antes de substituir o build..."
  Stop-Service -Name $serviceName -Force
  (Get-Service -Name $serviceName).WaitForStatus("Stopped", [TimeSpan]::FromSeconds(60))
}

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

if (Test-Path ".next") {
  Move-Item -LiteralPath ".next" -Destination $buildBackup
}

try {
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

  Write-Host "Sincronizando assets publicos para o runtime standalone..."
  robocopy public .next\standalone\public /E /NFL /NDL /NJH /NJS /NP | Out-Null
  if ($LASTEXITCODE -ge 8) {
    throw "Falha ao copiar a pasta public para .next\\standalone\\public."
  }

  Write-Host "Sincronizando assets compilados do Next para o runtime standalone..."
  robocopy .next\static .next\standalone\.next\static /E /NFL /NDL /NJH /NJS /NP | Out-Null
  if ($LASTEXITCODE -ge 8) {
    throw "Falha ao copiar .next\\static para .next\\standalone\\.next\\static."
  }

  if ($restartService) {
    Write-Host "Iniciando o servico" $serviceName "e verificando a pagina inicial..."
    Start-Service -Name $serviceName
    (Get-Service -Name $serviceName).WaitForStatus("Running", [TimeSpan]::FromSeconds(60))

    $healthy = $false
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
      try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
          $healthy = $true
          break
        }
      } catch {
        Start-Sleep -Seconds 3
      }
    }

    if (-not $healthy) {
      throw "O app nao respondeu corretamente depois do deploy."
    }
  }

  if (Test-Path $buildBackup) {
    Remove-Item -LiteralPath $buildBackup -Recurse -Force
  }

  Write-Host "Deploy concluido com sucesso."
} catch {
  Write-Host $_.Exception.Message -ForegroundColor Red

  if ($restartService -and (Get-Service -Name $serviceName).Status -eq "Running") {
    Stop-Service -Name $serviceName -Force
    (Get-Service -Name $serviceName).WaitForStatus("Stopped", [TimeSpan]::FromSeconds(60))
  }

  if (Test-Path ".next") {
    Move-Item -LiteralPath ".next" -Destination $failedBuild
  }
  if (Test-Path $buildBackup) {
    Move-Item -LiteralPath $buildBackup -Destination ".next"
  }

  if ($restartService -and (Get-Service -Name $serviceName).Status -ne "Running") {
    Start-Service -Name $serviceName
    (Get-Service -Name $serviceName).WaitForStatus("Running", [TimeSpan]::FromSeconds(60))
  }

  throw
}
