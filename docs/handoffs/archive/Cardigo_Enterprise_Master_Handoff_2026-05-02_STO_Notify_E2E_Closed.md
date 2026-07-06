# Cardigo Enterprise Master Handoff — 2026-05-02 / STO Notify E2E Closed

**Date:** 2026-05-02
**Project:** Cardigo — Israel-first digital business card / mini business page SaaS
**Current master state:** TRANZILA_STO_NOTIFY_SANDBOX_E2E_P0 CLOSED/PASS (2026-05-02). All billing hardening contours closed. Sandbox STO schedule advanced to 01/06/2026 — cleanup required before production cutover.
**Supersedes:** `docs/handoffs/current/Cardigo_Enterprise_Master_Handoff_2026-04-28_Billing_Hardening_STO_Notify_Pending.md` as the current billing master truth. The 2026-04-28 handoff has also been updated in-place to reflect closure; it remains in `current/` as the updated active document. This file provides the standalone closure record.
**Purpose:** Closure record for TRANZILA_STO_NOTIFY_SANDBOX_E2E_P0. Captures final verification proof, architecture invariants confirmed, cleanup requirements, and next bounded steps.

---

## 0. How the next ChatGPT should behave

The next ChatGPT must act as:

> **Senior Project Architect / Senior Backend Engineer / Payment Lifecycle Engineer / Payment Security Engineer / Production Readiness Engineer**

Follow canonical work mode:

Architecture / Intent
→ Phase 1 — Read-Only Audit with PROOF (file:line)
→ Phase 2 — Minimal Fix
→ Phase 3 — Verification with RAW stdout + EXIT
→ Documentation / Handoff
→ Rollout / Monitoring when needed

Do not make code changes before Phase 1 audit. Require PROOF file:line for every important claim.

---

## 1. Executive Summary

The real Tranzila MyBilling STO recurring charge for `dannybestboy@gmail.com` (terminal `testcardstok`, plan monthly, ₪39.90) fired on 01/05/2026 as scheduled. The webhook was processed correctly end-to-end:

- User subscription extended to 2026-06-27T08:20:38.113Z
- PaymentTransaction created with `status=paid`, `idempotencyNote=sto_recurring_notify`
- Receipt created and sent; email arrived
- No errors, no failed flags, no mismatch

Verification was completed on 2026-05-02. Exit: `STO_NOTIFY_FINAL_VERIFY_EXIT:0`.

The STO notify implementation is confirmed working under real provider conditions. All billing hardening contours are now closed in sandbox.

**Production cutover (G6/G7) remains a separate future contour.**

---

## 2. Final Contour Status Table

| Contour                                                                                                    | Status                          |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------- |
| First-payment notify hardening (consuming gate, startup anti-drift, portal delivery mode)                  | ✅ CLOSED/PASS                  |
| Tranzila Handshake V2 (thtk verification, forged-notify blocked, real payment passed)                      | ✅ CLOSED/PASS                  |
| IframeReturnPage top-level fallback                                                                        | ✅ CLOSED/PASS                  |
| STO create sandbox E2E (full payment → STO → receipt)                                                      | ✅ CLOSED/PASS                  |
| STO fast-forward create (sto-create-custom-date.mjs, dannybestboy@gmail.com, first-charge-date=2026-05-01) | ✅ CLOSED/PASS                  |
| STO notify pre-webhook gate smoke (403 without token, 403 wrong token, 403 direct backend)                 | ✅ CLOSED/PASS                  |
| **STO recurring notify real webhook E2E (TRANZILA_STO_NOTIFY_SANDBOX_E2E_P0)**                             | ✅ **CLOSED/PASS (2026-05-02)** |
| Billing documentation / handoff closure                                                                    | ✅ CLOSED/PASS (2026-05-02)     |
| Production terminal cutover                                                                                | 🔴 OPEN (future contour)        |
| G6 (production terminal cutover)                                                                           | 🔴 OPEN                         |
| G7 (production recurring lifecycle proof)                                                                  | 🔴 OPEN                         |

**P0 blockers: 0. P1 blockers: 0. All billing hardening contours closed.**

---

## 3. Final Verification Proof — TRANZILA_STO_NOTIFY_SANDBOX_E2E_P0

**Status:** CLOSED / PASS
**Real provider webhook:** received 01/05/2026, verified 2026-05-02
**Verification exit:** `STO_NOTIFY_FINAL_VERIFY_EXIT:0`
**Target user:** `dannybestboy@gmail.com`
**Terminal:** `testcardstok`
**Plan:** monthly
**Amount:** ₪39.90 / 3990 agorot

### 3.1 Verified DB User/Card state

- `User.plan=monthly`
- `User.subscription.status=active`
- `User.subscription.provider=tranzila`
- `User.subscription.expiresAt=2026-06-27T08:20:38.113Z`
- `subscriptionExtendedBeyondFirstPayment=true`
- `renewalFailedAt=null`
- `User.tranzilaSto.status=created`
- `stoIdPresent=true` (raw stoId intentionally not documented)
- `stoLastErrorCode=null`
- `stoLastErrorMessage=null`
- `Card.billing.status=active`
- `Card.billing.plan=monthly`
- `Card.billing.paidUntil=2026-06-27T08:20:38.113Z`
- `billingMatchesUserSubscription=true`

### 3.2 Verified STO recurring PaymentTransaction

- `count=1`
- `latest.status=paid`
- `latest.plan=monthly`
- `latest.amountAgorot=3990`
- `latest.currency=ILS`
- `latest.failReason=null`
- `latest.idempotencyNote=sto_recurring_notify`
- `providerTxnIdPresent=true`
- `providerTxnIdLooksSto=true`
- `paymentIntentIdPresent=false` — STO recurring notify path does NOT use PaymentIntent or Handshake V2
- `rawPayloadHashPresent=true`
- `payloadAllowlistedForbiddenKeysPresent=[]`
- `payloadHasStoExternalId=true`
- `createdAt=2026-05-01T23:20:24.885Z`

### 3.3 Verified Receipt

- `countForLatestStoTxn=1`
- `latest.status=created`
- `latest.shareStatus=sent`
- `documentUniqueKeyPresent=true`
- `paymentTransactionMatchesLatestStoTxn=true`
- `createdAt=2026-05-01T23:20:25.361Z`
- Receipt email arrived.

### 3.4 Tranzila portal

Schedule advanced to next charge date 01/06/2026.

---

## 4. Architecture Invariants Confirmed

The following invariants were confirmed by the TRANZILA_STO_NOTIFY_SANDBOX_E2E_P0 real-provider proof:

1. **STO notify path is independent from PaymentIntent and Handshake V2.**
    - STO recurring `PaymentTransaction.paymentIntentIdPresent=false` — confirmed.
    - No `thtk` field involved. No `PaymentIntent` consumed.
    - The STO notify path is a separate security contour from the first-payment notify path.

2. **STO notify security model:**
    - `CARDIGO_STO_NOTIFY_TOKEN` token gate (Netlify edge + proxy secret)
    - `stoId` user correlation (handler resolves user by `tranzilaSto.stoId`)
    - supplier / currency / amount checks
    - `providerTxnId` idempotency gate (E11000 unique index)

3. **idempotencyNote is always `sto_recurring_notify` (not null) on a fresh STO recurring PaymentTransaction.**
    - If the same webhook is replayed, `idempotencyNote` becomes `"duplicate_skipped"` and no second PaymentTransaction is created. E11000 is the guard.

4. **payloadAllowlistedForbiddenKeysPresent=[] — confirmed clean.**
    - No forbidden keys (e.g. raw card tokens, PAN) leaked into `payloadAllowlisted`.

5. **Receipt lifecycle is fire-and-forget — renewal is not rolled back if receipt fails.**
    - Renewal ACK to Tranzila is sent before receipt YeshInvoice call completes.
    - `shareFailReason` is recorded on `Receipt` if email fails; renewal remains committed.

6. **User.tranzilaSto.status remains `created` after successful recurring.**
    - Recurring success does not alter the STO registration status.

---

## 5. Cleanup / Ops Section

**Sandbox STO schedule status:** Active — next charge 01/06/2026 (advanced from 01/05/2026 after verified charge).

**Cleanup required before production cutover and before any unintended future sandbox charge:**

Operator will handle the following manually:

- Cancel/deactivate the `dannybestboy@gmail.com` STO schedule in Tranzila `testcardstok` terminal using `sto-cancel.mjs` (dry-run first, then execute with all required flags).
- Confirm schedule shows deactivated in Tranzila `testcardstok` portal after cancellation.
- Verify no orphaned test STO schedules remain in `testcardstok` portal (from prior test windows).
- Confirm `TRANZILA_STO_CREATE_ENABLED` remains `false` on Render.

**Do NOT change `PRICES_AGOROT` while active sandbox STO schedules remain** — any mismatch between the code value and the STO schedule amount will cause every recurring notify to fail with `amount_mismatch`.

After all sandbox STO schedules are cancelled/deactivated and test artifacts are cleaned, restore `PRICES_AGOROT` to production values only in a dedicated pre-production contour.

**Do not delete operator scripts** (`sto-create-custom-date.mjs`, `sto-cancel.mjs`, `sto-retry-failed.mjs`). These are permanent operator tools.

---

## 6. Next Bounded Steps

### Immediate operator cleanup (before production)

1. Cancel/deactivate sandbox STO schedule (`dannybestboy@gmail.com`, `testcardstok`) — operator handles manually.
2. Confirm no orphaned test STOs remain in `testcardstok` portal.
3. Confirm `TRANZILA_STO_CREATE_ENABLED=false` on Render.

### Documentation verification (Phase 3)

Run verification grep/read sweep across all files modified in this closure batch:

- `docs/handoffs/current/Cardigo_Enterprise_Master_Handoff_2026-04-28_Billing_Hardening_STO_Notify_Pending.md`
- `docs/runbooks/billing-flow-ssot.md`
- `docs/runbooks/tranzila-go-live-checklist.md`

Checks:

- grep for `WAITING_FOR_REAL_PROVIDER_WEBHOOK` — expect 0
- grep for `WAITING — 01/05/2026` — expect 0
- grep for `pending webhook 01/05/2026` — expect 0
- grep for `stoId=[0-9]` — expect 0 (no raw stoId)
- grep for raw token patterns — expect 0

### Future contours (in priority order)

1. **Production terminal cutover (G6)** — swap sandbox terminal vars for production values; restore `PRICES_AGOROT` in production env only after all sandbox STO schedules are cancelled; verify all env vars on Render and Netlify; production first-payment smoke.
2. **G7 production recurring lifecycle proof** — real customers on production terminal.
3. **thtk amount locking** — STO amount locked at create time; price-change reconciliation design (separate future contour).
4. **Post-deploy monitoring formalization** — monitoring signals, alert thresholds.

---

## 7. No-Secret Policy

The following must NOT appear in any documentation, logs, or operator notes:

| Category                 | Forbidden                                               | Use instead                                          |
| ------------------------ | ------------------------------------------------------- | ---------------------------------------------------- |
| Notify token             | Raw `CARDIGO_NOTIFY_TOKEN` value                        | `tokenPresent: true`                                 |
| STO notify token         | Raw `CARDIGO_STO_NOTIFY_TOKEN` value                    | `tokenPresent: true`                                 |
| thtk value               | Any specific `thtk` string                              | `thtkPresent: true`, or `handshakeThtkHash` (sha256) |
| stoId                    | Raw numeric Tranzila STO ID                             | `stoIdPresent: true`                                 |
| Card token               | Raw `TranzilaTK` / `tranzilaToken`                      | `tranzilaTokenPresent: true`                         |
| Card numbers / CVV       | Any PAN/CVV                                             | Never                                                |
| API keys / private keys  | `TRANZILA_API_PRIVATE_KEY`, `YESH_INVOICE_SECRET`, etc. | Reference env var name only                          |
| HMAC values              | Raw HMAC digest, nonce, requestTime                     | Never                                                |
| Provider transaction IDs | Raw `providerTxnId`, `providerDocId`                    | `providerTxnIdPresent: true`                         |

**Test email `dannybestboy@gmail.com`:** may be referenced when operationally needed.

---

## 8. Explicit Non-Actions

| Non-action                                             | Reason                                                                                                                       |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Do NOT touch any code files                            | This is a documentation-only closure workstream.                                                                             |
| Do NOT touch env files                                 | No env changes in this workstream.                                                                                           |
| Do NOT run migrations                                  | No schema changes in this workstream.                                                                                        |
| Do NOT write to DB                                     | No DB writes.                                                                                                                |
| Do NOT call Tranzila APIs                              | No provider calls.                                                                                                           |
| Do NOT run payment attempts                            | No payment operations.                                                                                                       |
| Do NOT change portal settings                          | Tranzila portal cleanup is deferred to operator.                                                                             |
| Do NOT touch Render/Netlify                            | No infrastructure changes.                                                                                                   |
| Do NOT modify prior historical handoffs                | The 2026-04-26 handoff remains unmodified as historical record.                                                              |
| Do NOT modify the 2026-05-01 general handoff           | That is a general project handoff, not billing-specific. Billing closure is captured in billing-specific docs and this file. |
| Do NOT set `TRANZILA_STO_CREATE_ENABLED=true`          | Must stay `false` until next approved test window or production rollout.                                                     |
| Do NOT carry sandbox terminal IDs to production        | `testcards` and `testcardstok` are sandbox only. Production terminal cutover is a separate future contour.                   |
| Do NOT document raw token/stoId/thtk/TranzilaTK values | No-secret policy is absolute. See §7.                                                                                        |
| Do NOT reopen closed billing hardening contours        | All 7 billing hardening contours are closed. No regressions observed.                                                        |

---

## 9. Document Chain

| Doc                                                                                                | Purpose                                                                                     |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| This file                                                                                          | Current master billing truth (2026-05-02) — STO notify E2E closure record                   |
| `Cardigo_Enterprise_Master_Handoff_2026-04-28_Billing_Hardening_STO_Notify_Pending.md`             | Prior billing master — updated in-place to reflect closure; remains in `current/`           |
| `Cardigo_Enterprise_Next_Chat_Master_Handoff_2026-04-26.md`                                        | Prior master — admin delete lifecycle closure. Historical reference only.                   |
| `docs/runbooks/billing-flow-ssot.md`                                                               | Tier 2 SSoT — billing architecture, event sequence, env vars, STO, receipt, iframe checkout |
| `docs/runbooks/tranzila-go-live-checklist.md`                                                      | Tier 2 — go-live operator checklist                                                         |
| `docs/handoffs/current/Cardigo_Enterprise_Handoff_YeshInvoice_Receipt_Sandbox_Proof_2026-04-24.md` | YeshInvoice receipt E2E evidence (historical)                                               |
| `docs/handoffs/current/Cardigo_Enterprise_Handoff_CheckoutIframe_E2E_2026-04-25.md`                | Iframe checkout E2E evidence (historical)                                                   |
