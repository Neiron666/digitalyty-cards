# Cardigo Enterprise Handoff — YESHINVOICE_RECEIPT_RETRY — Phase 2A + Phase 2B CLOSED

**Date:** 2026-05-05
**Project:** Cardigo — Digital Business Cards SaaS
**Canonical domain:** https://cardigo.co.il
**Workstream:** YESHINVOICE_RECEIPT_RETRY_CONTOUR
**Status:** Phase 2A (receipt retry job) and Phase 2B (receipt retry indexes + schema fields) CLOSED. Production rollout ACTIVE for first-payment / payment notify / receipt creation / receipt share / receipt retry. Recurring STO production charge proof remains a separately tracked follow-up.

---

## 1. Executive Summary

The receipt retry contour adds a production-grade background job that re-attempts failed YeshInvoice receipt creation. This handoff closes two phases of implementation:

Phase 2A — `startReceiptRetryJob` in `backend/src/jobs/receiptRetry.js`: job creation, query, exponential backoff, dual feature-flag guard, Sentry monitor integration.

Phase 2B — `migrate-receipt-indexes.mjs`: compound index `status_1_nextRetryAt_1` applied to production. Schema fields `retryCount` (Number, default 0) and `nextRetryAt` (Date, default null) added to `Receipt.model.js`.

Operator confirmed real production first-payment flow: Tranzila payment, Cardigo fulfillment, YeshInvoice receipt creation/share, STO creation — all verified. No raw provider IDs, receipt numbers, tokens, or customer PII recorded.

---

## 2. Classification

G6 — CLOSED / OPERATOR-CONFIRMED
Production terminal cutover: real production first-payment flow verified with Tranzila payment, Cardigo fulfillment, YeshInvoice receipt creation/share, and STO creation. No raw provider IDs or customer PII recorded per doc hygiene policy.

G7 — PARTIAL / SEPARATELY TRACKED
Production STO recurring charge proof pending until the first real production recurring charge fires and is operator-verified. This gate is explicitly not claimed as closed and is tracked as a follow-up.

---

## 3. Closed Contours

| Contour                      | Status                     | Evidence                                                                                                                         |
| ---------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| YESHINVOICE_RECEIPT_RETRY_2A | CLOSED / PRODUCTION ACTIVE | receiptRetry.js in production; RECEIPT_RETRY_ENABLED=true confirmed on Render; operator first-payment verified 2026-05-05        |
| YESHINVOICE_RECEIPT_RETRY_2B | CLOSED / PRODUCTION ACTIVE | migrate-receipt-indexes.mjs applied; compound index status_1_nextRetryAt_1 live; retryCount/nextRetryAt fields in Receipt schema |

---

## 4. Runtime Details (code-verified)

Job file: `backend/src/jobs/receiptRetry.js`
Sentry monitor slug: `receipt-retry`
Feature flags: `RECEIPT_RETRY_ENABLED=true` AND `YESH_INVOICE_ENABLED=true` (both required)
Interval: `RECEIPT_RETRY_INTERVAL_MS` (default 1800000 = 30 min)
Boot delay: 105s (staggered after billing-reconcile at 90s)
MAX_RETRIES: 5
MAX_BATCH: 20 per run
Backoff base: 5 min; backoff cap: 4 h
Query: `Receipt.status === "failed"`, `retryCount < 5`, `nextRetryAt <= now` OR `$exists: false` (pre-field documents)
Share failure: does NOT increment retryCount (share retry is a distinct deferred contour)
Index: `status_1_nextRetryAt_1` compound, applied via `migrate-receipt-indexes.mjs`
Schema additions: `retryCount` (Number, default 0), `nextRetryAt` (Date, default null) on `Receipt.model.js`

---

## 5. Documentation Updated

All 5 runbooks updated in Phase 2 documentation closure (2026-05-05):

docs/runbooks/billing-flow-ssot.md — §9 header, gate list items 6/7, §16, §17, Receipt model description, env var table (RECEIPT_RETRY_ENABLED + RECEIPT_RETRY_INTERVAL_MS rows), §2.7 production rollout boundary
docs/runbooks/yeshinvoice-integration-runbook.md — status header (line 4), B.Level3 Gate 6/7 (lines 60–65), D8 entry (lines 200–213), E1/E2 checklists
docs/runbooks/scheduled-jobs-readiness.md — status date, worker count (5→7), §2.6 billing-reconcile entry, §2.7 receipt-retry entry, §9 production readiness table
docs/runbooks/tranzila-go-live-checklist.md — YeshInvoice item (line 254)
docs/runbooks/yeshinvoice-groundwork-architecture.md — status header (line 4), §2.7 "What this groundwork package documents" production rollout statement (line 52), D6 (FUTURE PROPOSED → IMPLEMENTED)

---

## 6. G7 Follow-up Tracking

The next operator action required to close G7: when the first real STO recurring charge fires in production, verify via Render logs and Tranzila portal that the recurring payment completed, fulfillment ran, and a new receipt was created/shared. At that point, update billing-flow-ssot.md §9 gate 7 and §16/§17 G7 entries from PARTIAL to CLOSED/OPERATOR-CONFIRMED.

No code changes are required for G7 closure — this is an observation/verification gate only.

---

## 7. Open Items (not in scope of this handoff)

- G7 recurring charge production verification — separately tracked follow-up (see §6 above)
- yeshinvoice-code-patterns-and-examples.md: contains `receiptStatus` references in example code blocks — these are historical design examples predating the implementation; they are not authoritative schema documentation. No edit required unless this doc is promoted to Tier 1/2 SSoT.
- yeshinvoice-groundwork-architecture.md D2–D5 section headers still carry "FUTURE PROPOSED" labels — accurate for the original design narrative, misleading given that D1–D6 are all implemented. Not in scope for this closure; can be updated in a future doc maintenance pass.
- yeshinvoice-integration-runbook.md lines 135–139 (D5 pseudocode): contain `receiptStatus` — annotated at line 106 as "These names do NOT exist in the actual schema." Acceptable historical context, not authoritative.

---

## 8. No Code Changes In This Session

All edits in this session were documentation-only (docs/runbooks/\*_). No backend/src/_, frontend/src/_, scripts/_, or package.json files were modified. The code for Phase 2A and Phase 2B was implemented and production-active prior to this documentation closure session.
