# Cardigo Enterprise Handoff — 2026-05-06
# Sentry Metrics: AttributesFix + CounterMethodFix + Production Smoke

**Date:** 2026-05-06
**Contours:**
- SENTRY_APPLICATION_METRICS_ATTRIBUTES_FIX_P1
- SENTRY_APPLICATION_METRICS_COUNTER_METHOD_FIX_P1
- PAYMENT_PRODUCTION_SMOKE_AND_OBSERVABILITY_P1

**Status:** CLOSED — documentation reconciliation complete after verified fixes and production smoke.

---

## Summary

Batch 1 of Sentry Application Metrics (SENTRY_APPLICATION_METRICS_MVP_P1_BATCH1) implemented 6 backend-only metrics covering payment notify, receipt creation, and receipt retry paths.

After Batch 1 implementation, two bugs were identified and fixed in the helper (`backend/src/utils/sentryMetrics.util.js`):

1. **ATTRIBUTES_FIX_P1**: The helper passed `{ tags: safeTags }` to the Sentry Node SDK. The correct SDK option key is `{ attributes: safeTags }`. This caused all custom dimensions to be silently dropped at ingestion. Gauge metric ingestion itself was functional; only the attribute dimensions were missing.

2. **COUNTER_METHOD_FIX_P1**: The helper called `Sentry.metrics.increment`, which does not exist in `@sentry/node ^10.40.0`. SDK inspection confirmed `typeof Sentry.metrics.increment === "undefined"` while `typeof Sentry.metrics.count === "function"`. `Object.keys(Sentry.metrics)` = `["count", "distribution", "gauge"]`. The guard in the helper detected the missing method correctly and exited silently, meaning all counter metrics were silently dropped on every call.

Both bugs were helper-level only. No call-site changes were required.

After both fixes, the helper now:
- Uses `Sentry.metrics.count()` for all counter metrics (5 of 6 metrics).
- Uses `Sentry.metrics.gauge()` for the gauge metric (1 of 6 metrics).
- Passes `{ attributes: safeTags }` as the SDK dimension option for both.

---

## Root Causes Closed

### ATTRIBUTES_FIX_P1

- **Original issue:** `{ tags: safeTags }` passed to Sentry Node SDK.
- **Correct key:** `{ attributes: safeTags }`.
- **Scope:** `backend/src/utils/sentryMetrics.util.js` — helper-level, no call-site changes.
- **Production proof:** `receipt.retry.candidate_count` observed in Sentry with `provider=yeshinvoice`, `flow=retry_job`, custom attributes present in the production environment. This confirms gauge ingestion and attribute transmission are operational.

### COUNTER_METHOD_FIX_P1

- **Original issue:** Helper called `Sentry.metrics.increment` — undefined in the installed SDK version.
- **SDK inspection proof:**
  - `typeof Sentry.metrics.increment === "undefined"`
  - `typeof Sentry.metrics.count === "function"`
  - `typeof Sentry.metrics.gauge === "function"`
  - `Object.keys(Sentry.metrics)` = `["count", "distribution", "gauge"]`
- **Effect before fix:** Guard `typeof Sentry.metrics?.increment !== "function"` evaluated to `true` on every invocation, causing all counter calls to exit silently without emitting.
- **Fix:** Guard and call updated from `increment` to `count` in the helper.
- **Scope:** `backend/src/utils/sentryMetrics.util.js` — helper-level, no call-site changes.

---

## Changed Code Files

Only one file was changed across both fix contours:

- `backend/src/utils/sentryMetrics.util.js` — SDK option key changed from `tags` to `attributes`; counter guard and call changed from `increment` to `count`.

No other backend files, no frontend files, no package files, no env files, no migration scripts, and no Sentry configuration were changed in these contours.

---

## Production Payment Smoke — Safe Summary

A first-payment production smoke was performed manually after Batch 1 implementation.

Confirmed outcomes (no PII, no secrets):

- Tranzila payment approved: ₪39.90 (amountAgorot=3990).
- PaymentIntent status: completed.
- PaymentTransaction status: paid, amountAgorot=3990.
- User plan: monthly active.
- Tranzila token: captured.
- STO schedule: created.
- YeshInvoice קבלה: created via API.
- Receipt cabinet: visible and contains the receipt.
- Card billing status: not claimed — no explicit Card document proof was gathered during this smoke.

No real customer PII, ObjectIds, providerTxnId, stoId, receipt numbers, confirmation codes, or raw provider payloads are included in this handoff.

---

## Verification Summaries

### PASS_ATTRIBUTES_FIX_VERIFICATION

- Phase 3 verification passed after ATTRIBUTES_FIX_P1.
- Production confirmation: `receipt.retry.candidate_count` observed in Sentry with `provider=yeshinvoice`, `flow=retry_job`, custom attributes present in production environment.

### PASS_COUNTER_METHOD_FIX_VERIFICATION

- Phase 3 verification passed after COUNTER_METHOD_FIX_P1.
- SDK method (`Sentry.metrics.count`) confirmed as function type in the installed `@sentry/node ^10.40.0`.
- `payment.notify.success` was NOT observed during the production smoke performed before COUNTER_METHOD_FIX_P1. This is consistent with the root cause: counter helper still used the nonexistent `increment` method at the time of the smoke.
- `payment.notify.success` production observation is expected on the next natural successful payment after COUNTER_METHOD_FIX_P1 is deployed. No additional smoke is required solely for this purpose.

---

## Out of Scope

The following were explicitly not part of these fix contours:

- No new payment smoke required solely for Sentry counter metric verification.
- No Sentry dashboards created.
- No Sentry alerts configured.
- No Sentry monitors added.
- No AI / Gemini metrics implemented.
- No `api.critical_error` metric implemented.
- No frontend metrics.
- No global API request metrics.
- No Sentry PAYG or billing plan changes made.
- No billing flow code changes (tranzila.provider.js, receiptRetry.js, etc.) in these fix contours.
- No receipt or STO schema/model changes.
- No YeshInvoice integration changes.

---

## Next Expected Signal — After COUNTER_METHOD_FIX_P1 Deploy

After COUNTER_METHOD_FIX_P1 is deployed to production, the next natural successful payment (first_payment or sto_recurring) should emit:

- Metric: `payment.notify.success`
- Attributes: `provider=tranzila`, `flow=first_payment`, `plan=monthly` or `plan=yearly`

This signal does not require triggering another production payment smoke solely for Sentry counter metric verification.
