param([Parameter(Mandatory)][ValidatePattern('^[0-9a-f]{40}$')][string]$Release)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$root = 'C:\Sites\AzureIIS\site-estancia'
$serviceName = 'site-estancia-next'
$nodeHome = 'C:\Tools\node-v20.19.5-win-x64'
$env:Path = "$nodeHome;$env:Path"
Set-Location $root

function Assert-Release {
  git fetch --quiet --no-tags https://github.com/ZaqV1-hub/site-estancia.git refs/heads/main
  if ($LASTEXITCODE -ne 0) { throw 'Unable to fetch main.' }
  if ((git rev-parse FETCH_HEAD).Trim() -ne $Release) { throw 'Main changed during deployment.' }
  if ((git branch --show-current).Trim() -ne 'main' -or (git status --porcelain --untracked-files=all -- src scripts .github) -or (git diff --name-only HEAD)) {
    throw 'Production checkout must be on main with a clean source tree.'
  }
  git merge-base --is-ancestor HEAD $Release
  if ($LASTEXITCODE -ne 0) { throw 'Production checkout cannot fast-forward to the release.' }
}

function Wait-Healthy {
  for ($attempt = 0; $attempt -lt 12; $attempt++) {
    try {
      $next = Invoke-WebRequest -Uri 'http://127.0.0.1:3001/robots.txt' -UseBasicParsing -Method Head -TimeoutSec 5
      $iis = Invoke-WebRequest -Uri 'http://127.0.0.1:8905/robots.txt' -UseBasicParsing -Method Head -TimeoutSec 5
      if ($next.StatusCode -eq 200 -and $iis.StatusCode -eq 200) { return }
    } catch {}
    Start-Sleep -Seconds 3
  }
  throw 'The Next.js service or IIS failed its health check.'
}

function Copy-BuildFiles($Source, $Destination) {
  robocopy $Source $Destination /E /MT:8 /XD cache /NFL /NDL /NJH /NJS /NP | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "Unable to copy build files from $Source." }
}

function Invoke-BuildCommand($Arguments, $LogName) {
  $stdout = Join-Path $stage "$LogName.log"
  $stderr = Join-Path $stage "$LogName-error.log"
  $process = Start-Process -FilePath "$nodeHome\node.exe" -ArgumentList $Arguments -WorkingDirectory $stage -RedirectStandardOutput $stdout -RedirectStandardError $stderr -Wait -PassThru
  if ($process.ExitCode -ne 0) {
    Get-Content $stdout, $stderr -Tail 30
    throw "$LogName failed with exit code $($process.ExitCode)."
  }
  Get-Content $stdout -Tail 8
}

Assert-Release
if ((Get-Service $serviceName).Status -ne 'Running') { throw 'Production service is not running.' }
if ((Test-Path '.next\ESTANCIA_RELEASE') -and (Get-Content '.next\ESTANCIA_RELEASE').Trim() -eq $Release) {
  Wait-Healthy
  Write-Output "Release $Release is already active."
  return
}

$runId = (Get-Date -Format 'yyyyMMddHHmmss') + '-' + $Release.Substring(0, 8)
$stage = Join-Path $env:ProgramData "EstanciaDeploy\stage-$runId"
$candidate = Join-Path $root ".next.pre-$runId"
$previous = Join-Path $root '.next.pre-rollback'
$older = Join-Path $root ".next.pre-rollback-$runId"
$active = Join-Path $root '.next'
$failed = Join-Path $root ".next.pre-failed-$runId"
$hasMovedActive = $false
$hasStoppedService = $false

New-Item -ItemType Directory -Path $stage | Out-Null
try {
  $archive = Join-Path $stage 'source.zip'
  git archive --format=zip "--output=$archive" $Release
  if ($LASTEXITCODE -ne 0) { throw 'Unable to archive the release.' }
  Expand-Archive -LiteralPath $archive -DestinationPath $stage
  Copy-Item -LiteralPath (Join-Path $root '.env.local') -Destination $stage

  Write-Output "Installing dependencies for $Release in staging."
  Invoke-BuildCommand ('"' + "$nodeHome\node_modules\npm\bin\npm-cli.js" + '" ci --no-audit --no-fund') 'npm-ci'
  Write-Output 'Building with Webpack while production stays online.'
  Invoke-BuildCommand 'node_modules\next\dist\bin\next build --webpack' 'webpack'

  $output = Join-Path $stage '.next'
  Copy-BuildFiles "$stage\public" "$output\standalone\public"
  Copy-BuildFiles "$output\static" "$output\standalone\.next\static"
  if (!(Test-Path "$output\standalone\server.js")) { throw 'Standalone server is missing.' }
  if ((Get-Content "$output\BUILD_ID").Trim() -ne (Get-Content "$output\standalone\.next\BUILD_ID").Trim()) {
    throw 'Standalone build ID does not match.'
  }
  Set-Content -LiteralPath "$output\ESTANCIA_RELEASE" -Value $Release -Encoding Ascii
  Copy-BuildFiles $output $candidate

  Assert-Release
  git merge --ff-only $Release
  if ($LASTEXITCODE -ne 0) { throw 'Unable to fast-forward the production checkout.' }
  $uploads = Join-Path $root 'public\uploads\site'
  if (Test-Path $uploads) { Copy-BuildFiles $uploads "$candidate\standalone\public\uploads\site" }

  $hasStoppedService = $true
  Stop-Service $serviceName -Force
  (Get-Service $serviceName).WaitForStatus('Stopped', [TimeSpan]::FromSeconds(90))
  if (Test-Path $previous) { Move-Item -LiteralPath $previous -Destination $older }
  Move-Item -LiteralPath $active -Destination $previous
  $hasMovedActive = $true
  Move-Item -LiteralPath $candidate -Destination $active
  Start-Service $serviceName
  (Get-Service $serviceName).WaitForStatus('Running', [TimeSpan]::FromSeconds(60))
  Wait-Healthy
  Write-Output "Release $Release is active and healthy through IIS."
} catch {
  if ($hasMovedActive) {
    if ((Get-Service $serviceName).Status -ne 'Stopped') {
      Stop-Service $serviceName -Force
      (Get-Service $serviceName).WaitForStatus('Stopped', [TimeSpan]::FromSeconds(90))
    }
    if (Test-Path $active) { Move-Item -LiteralPath $active -Destination $failed }
    Move-Item -LiteralPath $previous -Destination $active
  }
  if ((Test-Path $older) -and !(Test-Path $previous)) {
    Move-Item -LiteralPath $older -Destination $previous
  }
  if ($hasStoppedService -or $hasMovedActive) {
    if ((Get-Service $serviceName).Status -eq 'StopPending') {
      (Get-Service $serviceName).WaitForStatus('Stopped', [TimeSpan]::FromSeconds(90))
    }
    if ((Get-Service $serviceName).Status -eq 'Stopped') { Start-Service $serviceName }
    Wait-Healthy
    Write-Output 'Previous build restored and healthy through IIS.'
  }
  throw
} finally {
  Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue
  if (Test-Path $candidate) { Remove-Item -LiteralPath $candidate -Recurse -Force -ErrorAction SilentlyContinue }
}
if (Test-Path $older) { Remove-Item -LiteralPath $older -Recurse -Force -ErrorAction Continue }
