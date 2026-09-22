$ErrorActionPreference = "Stop"
$stripe = "C:\Users\Administrator\AppData\Local\Microsoft\WinGet\Links\stripe.exe"
$envFile = Join-Path (Split-Path -Parent $PSScriptRoot) ".env"

$secret = (& $stripe listen --print-secret).Trim()
if ($secret -notmatch '^whsec_') {
  throw "Stripe CLI nevratil whsec."
}

$lines = Get-Content $envFile
$written = $false
$out = foreach ($line in $lines) {
  if ($line -match '^STRIPE_WEBHOOK_SECRET=') {
    $written = $true
    "STRIPE_WEBHOOK_SECRET=$secret"
  } else {
    $line
  }
}
if (-not $written) {
  $out += "STRIPE_WEBHOOK_SECRET=$secret"
}
Set-Content -Path $envFile -Value $out -Encoding utf8
Write-Host "STRIPE_WEBHOOK_SECRET written"
