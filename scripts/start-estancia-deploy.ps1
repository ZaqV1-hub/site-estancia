# Install outside the checkout as the forced SSH command and scheduled task entry point.
param([switch]$Worker)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$root = 'C:\Sites\AzureIIS\site-estancia'
$folder = Join-Path $env:ProgramData 'EstanciaDeploy'
$taskName = 'EstanciaGitHubDeploy'
$requestPath = Join-Path $folder 'request.json'

if ($Worker) {
  if (!(Test-Path $requestPath)) { return }
  $request = Get-Content -LiteralPath $requestPath -Raw | ConvertFrom-Json
  $resultPath = Join-Path $folder "$($request.id).result"
  $logPath = Join-Path $folder "$($request.id).log"
  $result = 'failed'
  try {
    $env:Path = 'C:\Program Files\Git\cmd;' + $env:Path
    $env:GIT_CONFIG_COUNT = '1'
    $env:GIT_CONFIG_KEY_0 = 'safe.directory'
    $env:GIT_CONFIG_VALUE_0 = $root.Replace('\', '/')
    Set-Location $root
    $release = [string]$request.release
    if ($release -cnotmatch '^[0-9a-f]{40}$') { throw 'Invalid release SHA.' }
    git fetch --quiet --no-tags https://github.com/ZaqV1-hub/site-estancia.git refs/heads/main *> $logPath
    if ($LASTEXITCODE -ne 0) { throw 'Unable to fetch main.' }
    if ((git rev-parse FETCH_HEAD).Trim() -ne $release) {
      throw 'Requested commit is no longer the tip of main. Run the workflow again from main.'
    }
    $source = git show "${release}:scripts/deploy-estancia.ps1"
    if ($LASTEXITCODE -ne 0) { throw 'Release deployment script is missing.' }
    & ([scriptblock]::Create(($source -join [Environment]::NewLine))) -Release $release *>> $logPath
    $result = 'success'
  } catch {
    Add-Content -LiteralPath $logPath -Value $_.Exception.Message
  } finally {
    Set-Content -LiteralPath $resultPath -Value $result -Encoding Ascii
    Remove-Item -LiteralPath $requestPath
  }
  if ($result -ne 'success') { exit 1 }
  return
}

if ($env:SSH_ORIGINAL_COMMAND -eq 'check') {
  $task = Get-ScheduledTask -TaskName $taskName
  if ($task.State -eq 'Disabled') { throw 'Estancia deploy task is disabled.' }
  Write-Output 'Estancia deploy connection OK'
  return
}
if ($env:SSH_ORIGINAL_COMMAND -cnotmatch '^deploy ([0-9a-f]{40})$') {
  throw 'Expected deploy followed by a full Git commit SHA.'
}
$release = $Matches[1]
$id = [Guid]::NewGuid().ToString('N')

# Serialize submissions. Task Scheduler keeps the worker alive after SSH disconnects.
$mutex = New-Object System.Threading.Mutex($false, 'Global\EstanciaGitHubDeployQueue')
try {
  if (!$mutex.WaitOne(0)) { throw 'Another deploy request is being submitted.' }
  try {
    if ((Test-Path $requestPath) -or (Get-ScheduledTask -TaskName $taskName).State -eq 'Running') {
      throw 'Another Estancia deployment is running.'
    }
    @{id = $id; release = $release} | ConvertTo-Json -Compress | Set-Content -LiteralPath $requestPath -Encoding Ascii
    try {
      Start-ScheduledTask -TaskName $taskName
    } catch {
      Remove-Item -LiteralPath $requestPath
      throw
    }
  } finally {
    $mutex.ReleaseMutex()
  }
} finally {
  $mutex.Dispose()
}

$resultPath = Join-Path $folder "$id.result"
$logPath = Join-Path $folder "$id.log"
Write-Output "Deployment queued for $release."
while (!(Test-Path $resultPath)) { Start-Sleep -Seconds 5 }
Get-Content -LiteralPath $logPath -Tail 40
if ((Get-Content -LiteralPath $resultPath).Trim() -ne 'success') { exit 1 }
