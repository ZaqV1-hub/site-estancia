param(
  [string] $MerchantId,
  [Security.SecureString] $MerchantKey
)

$ErrorActionPreference = 'Stop'
$nextRoot = 'C:\Sites\AzureIIS\site-estancia'
$legacyRoots = @(
  'C:\Sites\AzureIIS\RincaoDeploy\estancia_site',
  'C:\Sites\AzureIIS\RincaoProd\estancia_site'
)
$queryEndpoint = 'https://apiquery.cieloecommerce.cielo.com.br'

if (-not $MerchantId) {
  $MerchantId = Read-Host 'MerchantId da API E-commerce Cielo 3.0'
}

if (-not $MerchantKey) {
  $MerchantKey = Read-Host 'MerchantKey da API E-commerce Cielo 3.0' -AsSecureString
}

$MerchantId = $MerchantId.Trim()
$keyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($MerchantKey)

try {
  $plainMerchantKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyPointer)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($keyPointer)
}

if (-not $MerchantId -or -not $plainMerchantKey) {
  throw 'MerchantId e MerchantKey sao obrigatorios.'
}

if ($MerchantId -match '[\r\n"]' -or $plainMerchantKey -match '[\r\n"]') {
  throw 'As credenciais contem caracteres invalidos.'
}

function Set-EnvValue {
  param(
    [string] $Path,
    [string] $Name,
    [string] $Value
  )

  $lines = @(Get-Content -LiteralPath $Path)
  $pattern = '^' + [regex]::Escape($Name) + '='
  $replacement = $Name + '=' + $Value
  $found = $false

  for ($index = 0; $index -lt $lines.Count; $index++) {
    if ($lines[$index] -match $pattern) {
      $lines[$index] = $replacement
      $found = $true
    }
  }

  if (-not $found) {
    $lines += $replacement
  }

  [IO.File]::WriteAllLines(
    $Path,
    $lines,
    [Text.UTF8Encoding]::new($false)
  )
}

function Set-IniValue {
  param(
    [string] $Path,
    [string] $Name,
    [string] $Value
  )

  $content = Get-Content -Raw -LiteralPath $Path
  $pattern = '(?m)^(\s*' + [regex]::Escape($Name) + '\s*=\s*)"[^"]*"\s*$'

  if (-not [regex]::IsMatch($content, $pattern)) {
    throw ('Configuracao nao encontrada em ' + $Path + ': ' + $Name)
  }

  $updated = [regex]::Replace(
    $content,
    $pattern,
    { param($match) $match.Groups[1].Value + '"' + $Value + '"' }
  )
  [IO.File]::WriteAllText($Path, $updated, [Text.UTF8Encoding]::new($false))
}

function Test-CieloCredentials {
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  $probeId = '00000000-0000-0000-0000-000000000000'
  $request = [Net.HttpWebRequest]::Create($queryEndpoint + '/1/sales/' + $probeId)
  $request.Method = 'GET'
  $request.Headers.Add('MerchantId', $MerchantId)
  $request.Headers.Add('MerchantKey', $plainMerchantKey)
  $request.Timeout = 20000

  try {
    $response = $request.GetResponse()
    $status = [int] $response.StatusCode
    $response.Close()
  } catch [Net.WebException] {
    if (-not $_.Exception.Response) {
      throw 'Nao foi possivel conectar na API de consulta da Cielo.'
    }

    $status = [int] $_.Exception.Response.StatusCode
    $_.Exception.Response.Close()
  }

  if ($status -eq 401 -or $status -eq 403) {
    throw ('Credenciais recusadas pela Cielo (HTTP ' + $status + '). Nada foi alterado.')
  }

  Write-Output ('cielo_preflight_http=' + $status)
}

function Start-NextRuntime {
  $runScript = Join-Path $nextRoot 'run_next.cmd'
  Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', $runScript) -WorkingDirectory $nextRoot -WindowStyle Hidden

  for ($attempt = 1; $attempt -le 30; $attempt++) {
    Start-Sleep -Seconds 1
    try {
      $response = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3001/robots.txt' -TimeoutSec 3
      if ($response.StatusCode -eq 200) {
        return
      }
    } catch {
    }
  }

  throw 'O runtime Next nao respondeu depois da reinicializacao.'
}

Test-CieloCredentials

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupRoot = 'C:\Sites\AzureIIS\_backups\cielo-credentials-' + $stamp
$nextEnv = Join-Path $nextRoot '.env.local'
$legacyConfigs = $legacyRoots | ForEach-Object {
  Join-Path $_ 'application\configs\application.ini'
}
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
Copy-Item -LiteralPath $nextEnv -Destination (Join-Path $backupRoot 'site-estancia.env.local')

for ($index = 0; $index -lt $legacyConfigs.Count; $index++) {
  Copy-Item -LiteralPath $legacyConfigs[$index] -Destination (
    Join-Path $backupRoot ('legacy-' + $index + '-application.ini')
  )
}

try {
  Set-EnvValue $nextEnv 'INGRESSO_CIELO_MERCHANT_ID' $MerchantId
  Set-EnvValue $nextEnv 'INGRESSO_CIELO_MERCHANT_KEY' $plainMerchantKey

  foreach ($configPath in $legacyConfigs) {
    Set-IniValue $configPath 'cielo_ecommerce.merchantId' $MerchantId
    Set-IniValue $configPath 'cielo_ecommerce.merchantKey' $plainMerchantKey
  }

  $listener = Get-NetTCPConnection -State Listen -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($listener) {
    Stop-Process -Id $listener.OwningProcess -Force
    Start-Sleep -Seconds 1
  }

  Start-NextRuntime
} catch {
  Copy-Item -LiteralPath (Join-Path $backupRoot 'site-estancia.env.local') -Destination $nextEnv -Force
  for ($index = 0; $index -lt $legacyConfigs.Count; $index++) {
    Copy-Item -LiteralPath (Join-Path $backupRoot ('legacy-' + $index + '-application.ini')) -Destination $legacyConfigs[$index] -Force
  }

  $listener = Get-NetTCPConnection -State Listen -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($listener) {
    Stop-Process -Id $listener.OwningProcess -Force
    Start-Sleep -Seconds 1
  }
  Start-NextRuntime
  throw
} finally {
  $plainMerchantKey = $null
}

Write-Output ('backup=' + $backupRoot)
Write-Output 'credentials_updated=true'
Write-Output 'next_health=http_200'
