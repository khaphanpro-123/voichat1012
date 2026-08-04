# scripts/check-dart-carts.ps1
# Smoke test for every endpoint added by the DART / CARTS implementation (PowerShell).
# Usage:
#   $env:BASE = "http://localhost:3000"; $env:VOCAB = "<mongo _id>"; $env:USER_ID = "demo-user"
#   ./scripts/check-dart-carts.ps1

$Base   = if ($env:BASE)    { $env:BASE }    else { "http://localhost:3000" }
$UserId = if ($env:USER_ID) { $env:USER_ID } else { "demo-user" }
$Vocab  = $env:VOCAB

$pass = 0; $fail = 0; $skip = 0

function Invoke-Check {
  param([string]$Name, [string]$Method, [string]$Path, $Body = $null)
  Write-Host ""
  Write-Host "── $Name  " -NoNewline
  Write-Host "$Method $Base$Path" -ForegroundColor DarkGray
  try {
    $params = @{ Method = $Method; Uri = "$Base$Path"; Headers = @{ "content-type" = "application/json" } }
    if ($Body) { $params.Body = ($Body | ConvertTo-Json -Compress) }
    $res = Invoke-RestMethod @params -ErrorAction Stop
    $res | ConvertTo-Json -Depth 8 | Write-Host
    if ($res.success -eq $true) {
      Write-Host "✓ pass" -ForegroundColor Green
      $script:pass++
    } else {
      Write-Host "✗ fail" -ForegroundColor Red
      $script:fail++
    }
  } catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host "✗ fail" -ForegroundColor Red
    $script:fail++
  }
}

function Skip-Check {
  param([string]$Name, [string]$Reason)
  Write-Host ""
  Write-Host "── $Name  " -NoNewline
  Write-Host "(skipped: $Reason)" -ForegroundColor DarkGray
  $script:skip++
}

Invoke-Check "GET  /api/dart/weights"          "GET"  "/api/dart/weights"
Invoke-Check "POST /api/dart/weights (reload)" "POST" "/api/dart/weights"
Invoke-Check "GET  /api/experiment/assign"     "GET"  "/api/experiment/assign?userId=$UserId&stratum=B1"
Invoke-Check "POST /api/experiment/assign"     "POST" "/api/experiment/assign" @{ userId = $UserId; stratum = "B1" }

if ($Vocab) {
  Invoke-Check "POST /api/dart/schedule"       "POST" "/api/dart/schedule"  @{
    vocabularyId = $Vocab; userId = $UserId; quality = 4; lastRetrievalType = 1
  }
  Invoke-Check "POST /api/carts/schedule"      "POST" "/api/carts/schedule" @{
    vocabularyId = $Vocab; userId = $UserId; contextPool = "auto"
  }
} else {
  Skip-Check "POST /api/dart/schedule"  "set `$env:VOCAB = '<mongo _id>'"
  Skip-Check "POST /api/carts/schedule" "set `$env:VOCAB = '<mongo _id>'"
}

Invoke-Check "POST /api/context-transfer/judge" "POST" "/api/context-transfer/judge" @{
  word = "resilient"; learnerSentence = "The bridge is resilient to floods."; userId = $UserId
}

Write-Host ""
Write-Host "───────────────────────────────"
Write-Host " pass=$pass  fail=$fail  skip=$skip"
Write-Host "───────────────────────────────"
if ($fail -gt 0) { exit 1 } else { exit 0 }
