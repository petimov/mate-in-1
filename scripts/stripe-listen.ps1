$ErrorActionPreference = "Stop"
$stripe = "C:\Users\Administrator\AppData\Local\Microsoft\WinGet\Links\stripe.exe"
if (-not (Test-Path $stripe)) {
  throw "Stripe CLI neni. winget install Stripe.StripeCli"
}

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$events = @(
  "checkout.session.completed",
  "checkout.session.expired",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.trial_will_end",
  "invoice.paid",
  "invoice.payment_failed"
) -join ","

Write-Host "Webhook → http://localhost:3000/api/stripe/webhook"
Write-Host "Nech to bezet. Dev server musi bezet zvlast."

& $stripe listen --forward-to http://localhost:3000/api/stripe/webhook --events $events
