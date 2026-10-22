& {
  [CmdletBinding()]
  param()

  $ErrorActionPreference = 'Stop'
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

  $repo = "shenghsi/MarkDew"

  function Write-LogInfo($msg) {
    Write-Host "info: $msg" -ForegroundColor Cyan
  }

  function Write-LogError($msg) {
    Write-Host "error: $msg" -ForegroundColor Red
  }

  # Validate 64-bit architecture
  $arch = [System.Environment]::GetEnvironmentVariable("PROCESSOR_ARCHITECTURE")
  if ($arch -ne "AMD64" -and $arch -ne "ARM64") {
    Write-LogError "Unsupported architecture: $arch. MarkDew requires an x64 or ARM64 processor."
    exit 1
  }

  # Check if MarkDew is currently running
  $running = Get-Process -Name "MarkDew" -ErrorAction SilentlyContinue
  if ($running) {
    Write-LogError "MarkDew is currently running. Close MarkDew before you update."
    exit 1
  }

  # Resolve latest release tag using HTTP redirect header to bypass API rate limits
  $tag = $null
  try {
    $req = [System.Net.HttpWebRequest]::Create("https://github.com/$repo/releases/latest")
    $req.AllowAutoRedirect = $false
    $req.Method = "HEAD"
    $res = $req.GetResponse()
    $loc = $res.GetResponseHeader("Location")
    $res.Close()
    if ($loc) {
      $tag = $loc.Substring($loc.LastIndexOf("/") + 1)
    }
  } catch {
    # Fallback to REST API
  }

  if (-not $tag) {
    try {
      $apiRelease = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/latest" -Headers @{ "User-Agent" = "MarkDew-Installer" }
      $tag = $apiRelease.tag_name
    } catch {
      Write-LogError "Cannot resolve the latest MarkDew release tag."
      exit 1
    }
  }

  $packageName = "MarkDew-$tag-windows-x64.exe"
  $tempDir = Join-Path $env:TEMP ([System.Guid]::NewGuid().ToString())
  New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

  try {
    $baseUrl = "https://github.com/$repo/releases/download/$tag"
    $packageUrl = "$baseUrl/$packageName"
    $sumsUrl = "$baseUrl/SHA256SUMS"

    $packageFile = Join-Path $tempDir $packageName
    $sumsFile = Join-Path $tempDir "SHA256SUMS"

    Write-LogInfo "Downloading MarkDew $tag ($packageName)..."
    Invoke-WebRequest -Uri $packageUrl -OutFile $packageFile -UseBasicParsing

    Write-LogInfo "Downloading SHA256SUMS..."
    Invoke-WebRequest -Uri $sumsUrl -OutFile $sumsFile -UseBasicParsing

    Write-LogInfo "Verifying SHA-256 digest..."
    $sumsContent = Get-Content $sumsFile
    $expectedLine = $sumsContent | Where-Object { $_ -match "\s+$packageName`$" } | Select-Object -First 1

    if (-not $expectedLine) {
      Write-LogError "Verification record for $packageName was not found in SHA256SUMS."
      exit 1
    }

    $expectedHash = ($expectedLine -split '\s+')[0].ToLowerInvariant()
    $actualHash = (Get-FileHash -Path $packageFile -Algorithm SHA256).Hash.ToLowerInvariant()

    if ($expectedHash -ne $actualHash) {
      Write-LogError "SHA-256 hash mismatch. Expected: $expectedHash, Actual: $actualHash. Download is rejected."
      exit 1
    }

    Write-LogInfo "Digest verified successfully."
    Write-LogInfo "Installing MarkDew..."
    $process = Start-Process -FilePath $packageFile -ArgumentList "/S" -Wait -PassThru

    if ($process.ExitCode -ne 0) {
      Write-LogError "Installer exited with error code $($process.ExitCode)."
      exit $process.ExitCode
    }

    Write-LogInfo "MarkDew installed successfully."
  } finally {
    if (Test-Path $tempDir) {
      Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
  }
}
