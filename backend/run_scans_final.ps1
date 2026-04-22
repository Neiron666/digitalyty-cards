$docsDir = "c:\Users\User\Desktop\Visit-me\Projects\Digitalyty-card-app\digitalyty-cards\docs\runbooks"
$files = @("billing-flow-ssot.md", "tranzila-go-live-checklist.md", "cardigo_billing_support_runbook.md")
$fullPaths = $files | ForEach-Object { Join-Path $docsDir $_ }
Write-Host "--- SCAN 1: Stale phrase check (ABSENT) ---"
$stalePhrases = @("Real provider-generated webhook E2E is still pending", "portal URL not yet registered", "STO notify handler Ч not implemented", "future notify contour", "Consider `"extend from max(now, currentExpiresAt)`"", "notify replay/idempotency limited", "no ledger model", "pending contour 5.8f.2", "First real provider-generated Tranzila My Billing webhook E2E is still pending", "–еальный provider-generated webhook E2E ещЄ не выполнен")
foreach ($phrase in $stalePhrases) {
    if ($fullPaths | Where-Object { Test-Path $_ } | Where-Object { Select-String -Path $_ -Pattern [regex]::Escape($phrase) -Quiet }) { Write-Host "FAIL: $phrase found" -ForegroundColor Red } else { Write-Host "PASS: $phrase absent" -ForegroundColor Green }
}
Write-Host "`n--- SCAN 2: Required phrase check (PRESENT) ---"
$requiredPhrases = @("REAL_TRANZILA_STO_NOTIFY_E2E_SUCCESS_FULLY_VERIFIED", "2026-04-22", "sto_recurring_notify_count=6", "sto_prefix_txn_count=6", "valik@cardigo.co.il", "2026-06-19T16:05:50.657Z", "PRICES_AGOROT", "500/500", "3990/39990", "amount_mismatch", "CARDIGO_STO_NOTIFY_TOKEN", "YeshInvoice remains deferred", "5.8f.LOG.1", "5.8f.9")
foreach ($phrase in $requiredPhrases) {
    if ($fullPaths | Where-Object { Test-Path $_ } | Where-Object { Select-String -Path $_ -Pattern [regex]::Escape($phrase) -Quiet }) { Write-Host "PASS: $phrase found" -ForegroundColor Green } else { Write-Host "FAIL: $phrase absent" -ForegroundColor Red }
}
Write-Host "`n--- SCAN 3: Secret hygiene check (ABSENT) ---"
$secretPatterns = @("AeJkgrzdzjCoKzwD0qwQYm", "qj6FGZGZ", "ToZ84RMbWt", "sto:[0-9]", "stoId=[0-9]", "429105")
foreach ($pattern in $secretPatterns) {
    if ($fullPaths | Where-Object { Test-Path $_ } | Where-Object { Select-String -Path $_ -Pattern $pattern -Quiet }) { Write-Host "FAIL: Pattern $pattern found" -ForegroundColor Red } else { Write-Host "PASS: Pattern $pattern absent" -ForegroundColor Green }
}
Write-Host "`n--- SCAN 4: Scope check (Last Modified) ---"
$root = "c:\Users\User\Desktop\Visit-me\Projects\Digitalyty-card-app\digitalyty-cards"
$checkFiles = @("docs\runbooks\billing-flow-ssot.md", "docs\runbooks\tranzila-go-live-checklist.md", "docs\runbooks\cardigo_billing_support_runbook.md", "backend\src\config\plans.js", "frontend\netlify\functions\payment-sto-notify.js", "backend\src\routes\payment.routes.js", "backend\package.json", "frontend\public\_redirects")
foreach ($relPath in $checkFiles) {
    $path = Join-Path $root $relPath
    if (Test-Path $path) { Write-Host "$relPath : $((Get-Item $path).LastWriteTime)" } else { Write-Host "$relPath : NOT FOUND" -ForegroundColor Yellow }
}
