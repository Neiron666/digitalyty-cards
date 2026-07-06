# Cardigo Enterprise Handoff — Price ₪29/₪299 + STO Resume Production Closed

**Status:** CLOSED / PASS / PRODUCTION VERIFIED
**Date:** 2026-05-19
**Contour:** PRICE_29_299_STO_RESUME_DOCS_SYNC_P2
**Classification:** Production closure handoff. Read this in conjunction with the sandbox chronicle (`docs/handoffs/current/Cardigo_Enterprise_Handoff_ResumeAutoRenewal_2026-05-02.md`). Do not edit the sandbox chronicle.

---

## 1) Scope

This handoff closes three related items that completed as a single production contour on 2026-05-19:

1. **Price change deployment:** `PRICES_AGOROT` changed from `3990/39990` (₪39.90/₪399.90) to `2900/29900` (₪29/₪299). Yearly saving display updated to ₪49.
2. **Existing active monthly STO migration:** Existing monthly-plan users with active STO schedules at the old price were cancelled and resumed through the product self-service UI, creating new STO schedules at ₪29.00.
3. **Documentation sync:** Active runbooks updated to reflect deployed production truth (this contour — PRICE_29_299_STO_RESUME_DOCS_SYNC_P2).

---

## 2) Production Price Truth

**Canonical location:** `backend/src/config/plans.js` — `PRICES_AGOROT` export.

| Plan    | Agorot | Display (₪) |
| ------- | ------ | ----------- |
| monthly | 2900   | ₪29.00      |
| yearly  | 29900  | ₪299.00     |

Yearly saving displayed in UI: **₪49** (₪29 × 12 = ₪348 vs ₪299 yearly = ₪49 saving).

No sandbox-commented variant, no placeholder. These are the live production values.

---

## 3) Files of Record

Code files holding the production price truth at contour close:

- `backend/src/config/plans.js:71–74` — `PRICES_AGOROT` export (monthly: 2900, yearly: 29900).
- `frontend/src/pages/Pricing.jsx` — pricing page UI (₪29/₪299/₪49 saving).
- `frontend/src/pages/payment/CheckoutPage.jsx` — checkout monthly/yearly UI.
- `frontend/src/components/editor/panels/SettingsPanel.jsx` — editor/settings billing block (plan display, cancel/resume gate, canResumeAutoRenewal IIFE).
- `backend/scripts/sto-cancel.mjs` — operator cancel script. JSDoc examples updated to 2900.
- `backend/scripts/sto-resume-after-cancel.mjs` — operator resume-after-cancel script. JSDoc examples updated to 2900.

---

## 4) Production Verification (2026-05-19)

All production surfaces verified:

| Surface                                                   | Result  |
| --------------------------------------------------------- | ------- |
| /pricing page (monthly/yearly/saving)                     | ✅ PASS |
| Checkout flow monthly                                     | ✅ PASS |
| Checkout flow yearly                                      | ✅ PASS |
| Editor/settings billing block                             | ✅ PASS |
| Resume via product UI (two monthly-plan production users) | ✅ PASS |

**STO resume production state (count-only, no PII):**

- Two monthly-plan production users resumed via the product self-service UI (**חדש חידוש אוטומטי** button).
- New Tranzila STO schedules created at **₪29.00**.
- Next billing date: **05/06/2026**.
- MongoDB state confirmed per user:
    - `subscription.status = active`
    - `plan = monthly`
    - `tranzilaSto.status = created`
    - `lastErrorCode = null`
    - `lastErrorMessage = null`

No raw user emails, raw STO IDs, raw provider transaction IDs, tokens, HMAC values, or other sensitive identifiers are recorded here per doc hygiene policy.

---

## 5) STO Cancellation Audit Retention — Accepted as Safe Historical Metadata

**Audit result:** PASS. No code change required.

**Invariant:** `tranzilaSto.status` is the **only source of truth** for current STO state. Do not infer current cancellation state from `cancelledAt`, `cancellationSource`, `cancellationReason`, or any other `cancellation_*` field.

**Retention contract:** The `cancellation_*` fields (`cancelledAt`, `cancellationAttemptAt`, `cancellationErrorCode`, `cancellationErrorMessage`, `cancellationSource`, `cancellationReason`) are write-once-per-cancellation **historical audit metadata**. They are intentionally preserved after a successful resume. After resume, `tranzilaSto.status` returns to `"created"` while `cancelledAt` and related fields remain set from the prior cancellation event. This is correct, safe, and expected.

**DTO note:** `autoRenewal.cancelledAtPresent` in the `/api/account/me` response reflects whether `cancelledAt` is non-null. After resume, this field may remain `true` for users who were previously cancelled. This is informational/historical and is **not consumed by the frontend** (`canResumeAutoRenewal` reads only `autoRenewal.status`).

**Code anchors:**

- `backend/src/services/payment/tranzila.provider.js:2091–2092` — "Do NOT touch: cancelledAt, cancellationAttemptAt, cancellationErrorCode, cancellationErrorMessage, cancellationSource, cancellationReason" comment in recurring-notify write path.
- `backend/src/services/payment/tranzila.provider.js:612–619` — resume success write set (writes only stoId/status=created/createdAt/lastError*; intentionally leaves cancellation\_* untouched).
- `backend/src/models/User.model.js:120–143` — cancellation audit fields schema, labeled "additive, all null-default, no migration required".
- `backend/src/routes/account.routes.js:116–135` — `buildAutoRenewalDto` (emits `cancelledAtPresent` boolean; unused by frontend).

**SettingsPanel guard anchor:**

- `frontend/src/components/editor/panels/SettingsPanel.jsx` — `canResumeAutoRenewal` IIFE reads only `autoRenewal.status`; never reads `cancelledAt` or `cancelledAtPresent`.

---

## 6) Payment / Receipt Truth

- **Resume is not a payment.** No `PaymentTransaction` is created on resume. No `Receipt` is created. No YeshInvoice contact occurs.
- **Cancel is not a payment.** No `PaymentTransaction`, no `Receipt`, no YeshInvoice contact occurs on cancel.
- **Receipts are created only for actual successful payments / recurring notify fulfillment.** The only path that creates `PaymentTransaction` + `Receipt` is the Tranzila recurring-notify webhook (`POST /api/payments/sto-notify` → `handleStoNotify`).
- **PaymentTransaction and Receipt retention remains fiscal history.** Cancel/resume does not affect existing `PaymentTransaction` or `Receipt` records.

---

## 7) Operator Scripts

- **`backend/scripts/sto-cancel.mjs`** — operator-controlled cancellation. Dry-run default. `--execute` requires an explicit confirmation flag. Production terminal (`/^fxp/i` pattern) requires `--allow-prod`. Production DB guard: dbName=`cardigo_prod` / `NODE_ENV=production` triggers guard. See script JSDoc for exact CLI. Do not paste commands containing user emails or provider identifiers into chat.
- **`backend/scripts/sto-resume-after-cancel.mjs`** — operator-side counterpart to self-service resume. Dry-run default. `--execute` requires an explicit `--i-understand-sto-api-call` confirmation flag. Production terminal requires `--allow-prod`. `--expected-amount-agorot` can be set for extra safety (defaults to plan config value). See script JSDoc for exact CLI. Do not paste commands containing user emails or provider identifiers into chat.

---

## 8) Do Not Edit — Historical Handoffs

The following handoffs remain unmodified as time-stamped chronicle records. Do not backfill prices or resume closure into them:

- `docs/handoffs/current/Cardigo_Enterprise_Handoff_ResumeAutoRenewal_2026-05-02.md` (sandbox resume chronicle)
- `docs/handoffs/current/Cardigo_Enterprise_Master_Handoff_2026-04-28_Billing_Hardening_STO_Notify_Pending.md`
- `docs/handoffs/current/Cardigo_Enterprise_Master_Handoff_2026-05-02_STO_Notify_E2E_Closed.md`
- `docs/handoffs/current/Cardigo_Enterprise_Project_Handoff_2026-05-02.md`
- `docs/handoffs/current/Cardigo_Enterprise_Handoff_2026-05-06_SentryMetrics_AttributesFix_CounterMethodFix_And_ProductionSmoke_Closed.md`
- `docs/handoffs/current/Cardigo_Enterprise_Handoff_CheckoutIframe_E2E_2026-04-25.md`
- `docs/handoffs/current/Cardigo_Enterprise_Handoff_YeshInvoice_Receipt_Sandbox_Proof_2026-04-24.md`
- `docs/handoffs/current/Cardigo_Enterprise_Handoff_YeshInvoice_Groundwork_Master_2026-04-23.md`
- `docs/handoffs/archive/**` (all archived handoffs)

---

## 9) Remaining Non-Blocking Tails

The following are informational gaps only. No production blocker, no code action required:

- Optional code comment expansion in `backend/src/models/User.model.js:120` adding explicit "Retained after resume as historical audit metadata; use tranzilaSto.status to determine current state." — deferred.
- G7 (production recurring lifecycle proof — first real production STO recurring charge → notify → PaymentTransaction + subscription extension + Receipt) remains PARTIAL / SEPARATELY TRACKED in `billing-flow-ssot.md §16`. Not related to this contour.
- Payment-method replacement (update card) remains deferred as a future contour.

---

## 10) Anti-Secret Attestation

This document contains:

- No production user emails.
- No raw STO IDs.
- No raw provider transaction IDs.
- No Tranzila tokens, HMAC values, or signing secrets.
- No env secret values.
- No raw webhook payloads.

All verification used count-only wording ("two monthly-plan production users") per doc hygiene policy.

---

## 11) Superseded Planning Artifacts

The following planning artifacts are superseded by this closure handoff. They are preserved as historical records and must NOT be edited:

- `docs/handoffs/current/Cardigo_Next_Chat_Master_Handoff_2026-05-04_BILLING_PRODUCTION_ROLLOUT_READINESS.md`
- `docs/handoffs/current/Cardigo_Enterprise_Next_Chat_Master_Handoff_2026-05-03_Billing_Production_Readiness.md`
