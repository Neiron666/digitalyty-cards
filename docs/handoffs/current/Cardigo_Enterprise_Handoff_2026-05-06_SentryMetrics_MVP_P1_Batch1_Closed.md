# Cardigo Enterprise Handoff — SENTRY_APPLICATION_METRICS_MVP_P1_BATCH1 — CLOSED

**Date:** 2026-05-06
**Project:** Cardigo — Digital Business Cards SaaS
**Canonical domain:** https://cardigo.co.il
**Contour ID:** SENTRY_APPLICATION_METRICS_MVP_P1_BATCH1
**Status:** CLOSED — Code implementation, Phase 3 strict verification, and documentation update all complete.

---

## 1. Summary

Implemented a backend-only Sentry Application Metrics MVP covering the payment notify and receipt lifecycle. Six metrics added using a new no-op-safe helper. Scope is limited to payments and receipts only. No frontend changes, no dashboards, no alerts, no Sentry plan changes, no provider smoke calls, and no env changes were made.

---

## 2. Implemented Metrics

All six metrics are backend-only. No AI/Gemini metrics, no api.critical_error, no frontend metrics, no global API request metrics.

- payment.notify.success — increment — payment notify success (first_payment, sto_recurring)
- payment.notify.failed — increment — payment notify failure (first_payment, sto_recurring)
- receipt.create.failed — increment — YeshInvoice receipt creation failure (first_payment, sto_recurring)
- receipt.retry.candidate_count — gauge — retry job candidate count including zero sweeps
- receipt.retry.success — increment — retry job per-receipt success
- receipt.retry.failed — increment — retry job per-receipt failure

Full metric details, tag inventories, and safety properties:
See `docs/runbooks/scheduled-jobs-readiness.md` §11.

---

## 3. Changed Code Files

backend/src/utils/sentryMetrics.util.js — CREATED (new helper: no-op guard, hard allowlists, null-safe sanitizeTags, no-throw contract)
backend/src/services/payment/tranzila.provider.js — EDITED (import + 13 metric call sites: 2 success, 7 failed, 2 receipt.create.failed, plus import line)
backend/src/jobs/receiptRetry.js — EDITED (import + 3 metric call sites: 1 gauge, 1 success, 1 failed)

No other code files changed. No package files changed. No env files changed. No frontend files changed.

---

## 4. Changed Documentation Files

docs/runbooks/scheduled-jobs-readiness.md — EDITED — new §11 added: "Sentry Application Metrics — Billing + Receipt (Batch 1)"

---

## 5. Verification Summary

All Phase 3 checks passed. Summary:

- Scope proof: metric calls exist in exactly 3 files; Sentry.metrics appears only in helper; no drift to server/routes/frontend/AI files. EXIT:0.
- Helper contract: all 17 contract items confirmed by read (null guard, allowlist, no-throw, no-console, sanitizeReason order, isSentryActive guard).
- Node no-throw smoke: 10 test cases (null tags, undefined, array, string, integer, valid object, unknown metric name) — ALL_TESTS_NO_THROW. SMOKE_EXIT:0. No network calls. No Sentry DSN required.
- Billing control-flow: all 16 sub-items confirmed by file reads — no metric on E11000 duplicate, no metric on no_provider_txn_id, payment.notify.failed inside !isPaid guard, all success metrics after persistence.
- Receipt retry control-flow: all 6 items confirmed — gauge before zero-candidate guard, success/failed metrics after persistence, no forbidden tags.
- Forbidden tag scan: scanned all metric call lines in 3 files for 23 forbidden terms. ZERO HITS. FORBIDDEN_EXIT:0.
- Frontend gates: check:inline-styles EXIT:0, check:skins EXIT:0, check:contract EXIT:0, build EXIT:0.
- sanity:imports: importedCount:20, failedCount:0. EXIT:0.
- DB-writing sanity scripts (org-access, org-membership, slug-policy, ownership-consistency): BLOCKED by controlled-write guard — target DB is production-like. Guard block is expected and correct. Not bypassed.
- package.json: @sentry/node ^10.40.0 confirmed unchanged. No new packages.

---

## 6. P0 / P1 Defects Closed

P0 — payment.notify.failed fired before !isPaid guard on success paths.
Root cause: metric was a free statement before the isPaid check; every successful first payment emitted it with reason="unknown".
Fix: metric moved inside if (!isPaid) { ... return; } in tranzila.provider.js handleNotify.
Status: FIXED AND CONFIRMED.

P1-001 — sanitizeTags(null) reached Object.keys(null), throwing TypeError.
Root cause: null guard was absent; default parameter tags={} does not activate for explicit null.
Fix: added guard at top of sanitizeTags: if (!rawTags || typeof rawTags !== "object" || Array.isArray(rawTags)) { return {}; }
Applied to: backend/src/utils/sentryMetrics.util.js only.
Status: FIXED AND CONFIRMED. Smoke test confirmed no throw for null, undefined, array, string, integer.

No open P0 or P1 items.

---

## 7. P2 Tails (Non-Blocking, Not Fixed in Batch 1)

- sto_cancelled reason maps to reason="unknown" at Sentry — no matching includes() keyword in sanitizeReason. Observability quality only.
- invalid_plan reason maps to reason="unknown" at Sentry — same reason. Observability quality only.
- sanitizeReason has no case normalization — uppercase inputs fall to "unknown". All current call sites are lowercase; no runtime impact.
- receipt.retry.candidate_count emits 0 on every zero-candidate sweep — intentional heartbeat-style signal; bounded cardinality.

---

## 8. Explicit Out of Scope

- No real Tranzila or YeshInvoice provider calls were made to verify metrics. Metric correctness verified by code proof and no-network Node smoke only.
- No Sentry dashboards created.
- No Sentry alerts configured.
- No Sentry monitors created (existing receipt-retry cron monitor is pre-existing; not part of this contour).
- No AI / Gemini metrics implemented.
- No api.critical_error metric implemented.
- No frontend metrics.
- No global API request metrics.
- No Sentry PAYG or billing plan changes.
- No env changes on Render or locally.
- No package or dependency changes.

---

## 9. Next Recommended Step

Deploy normally when operator chooses. No special deploy action is required for this contour — the helper is no-op-safe when Sentry is inactive, so deploying before or without a Sentry DSN configured has no negative impact.

To observe metrics in Sentry: wait for natural payment and receipt events in production, or plan a separate controlled production smoke scope as a distinct future contour. Do not perform a production smoke within this contour.

If Sentry Application Metrics are not visible after real payment events fire, confirm that the active Sentry subscription tier includes Application Metrics. No plan changes were made in this contour.

---

## 10. Primary Runbook Reference

docs/runbooks/scheduled-jobs-readiness.md §11 — Sentry Application Metrics — Billing + Receipt (Batch 1)
