# Cardigo Enterprise Master Handoff — 2026-04-28

**Date:** 2026-04-28  
**Project:** Cardigo — Israel-first digital business card / mini business page SaaS  
**Current master state:** Billing hardening + Handshake V2 + STO fast-forward create — all CLOSED/PASS. Waiting for real Tranzila MyBilling recurring webhook on 01/05/2026.  
**Purpose:** Full handoff/instruction document for the next ChatGPT conversation. Captures all closed contours, current sandbox posture, pending webhook state, operator verification checklist, cleanup checklist, and anti-drift policy.

---

## 0. How the next ChatGPT should behave

The next ChatGPT must act as:

> **Senior Project Architect / Senior Backend Engineer / Payment Lifecycle Engineer / Payment Security Engineer / Production Readiness Engineer**

Follow canonical work mode:

```
Architecture / Intent
→ Phase 1 — Read-Only Audit with PROOF (file:line)
→ Phase 2 — Minimal Fix
→ Phase 3 — Verification with RAW stdout + EXIT
→ Documentation / Handoff
→ Rollout / Monitoring when needed
```

**Do not make code changes before Phase 1 audit.** Require PROOF file:line for every important claim.

---

## 1. Executive State

| Contour                                                                                                    | Status                   |
| ---------------------------------------------------------------------------------------------------------- | ------------------------ |
| First-payment notify hardening (consuming gate, startup anti-drift, portal delivery mode)                  | ✅ CLOSED/PASS           |
| Tranzila Handshake V2 (thtk verification, forged-notify blocked, real payment passed)                      | ✅ CLOSED/PASS           |
| IframeReturnPage top-level fallback                                                                        | ✅ CLOSED/PASS           |
| STO create sandbox E2E (full payment → STO → receipt)                                                      | ✅ CLOSED/PASS           |
| STO fast-forward create (sto-create-custom-date.mjs, dannybestboy@gmail.com, first-charge-date=2026-05-01) | ✅ CLOSED/PASS           |
| STO notify pre-webhook gate smoke (403 without token, 403 wrong token, 403 direct backend)                 | ✅ CLOSED/PASS           |
| **STO recurring notify real webhook E2E (TRANZILA_STO_NOTIFY_SANDBOX_E2E_P0)**                             | ⏳ WAITING — 01/05/2026  |
| Production terminal cutover                                                                                | 🔴 OPEN (future contour) |
| G6 (production terminal cutover)                                                                           | 🔴 OPEN                  |
| G7 (production recurring lifecycle proof)                                                                  | 🔴 OPEN                  |

**P0 blockers: 0. P1 blockers: 0. Awaiting one real provider webhook.**

---

## 2. Sandbox Runtime Posture (no secrets)

| Setting                         | Value                                                                                                |
| ------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `PAYMENT_PROVIDER`              | `tranzila`                                                                                           |
| `TRANZILA_TERMINAL`             | `testcards` (sandbox clearing terminal)                                                              |
| `TRANZILA_STO_TERMINAL`         | `testcardstok` (sandbox STO/MyBilling terminal)                                                      |
| `TRANZILA_NOTIFY_DELIVERY_MODE` | `portal` (notify URL not leaked to browser)                                                          |
| `TRANZILA_HANDSHAKE_ENABLED`    | `true`                                                                                               |
| `TRANZILA_STO_CREATE_ENABLED`   | `false` (returned to safe state after STO create E2E)                                                |
| `PAYMENT_INTENT_ENABLED`        | `true`                                                                                               |
| `YESH_INVOICE_ENABLED`          | `true` (sandbox credentials)                                                                         |
| `CARDIGO_NOTIFY_TOKEN`          | configured (not logged, not documented in plaintext)                                                 |
| `CARDIGO_STO_NOTIFY_TOKEN`      | configured (not logged, not documented in plaintext)                                                 |
| `PRICES_AGOROT`                 | `monthly: 3990, yearly: 39990` (₪39.90 / ₪399.90) — confirmed in `backend/src/config/plans.js:72–73` |

**Active sandbox STO schedule:** `dannybestboy@gmail.com`, terminal `testcardstok`, amount ₪39.90, plan monthly, `first-charge-date=2026-05-01`. Do NOT change `PRICES_AGOROT` while this schedule is active.

---

## 3. Closed Contours Summary

### 3.1 First-Payment Notify Hardening — CLOSED/PASS

- `TRANZILA_NOTIFY_DELIVERY_MODE=portal`: `notify_url_address` is omitted from the Tranzila checkout URL in portal mode. The notify URL is configured directly in the Tranzila portal, not embedded in browser-visible params.
- `CARDIGO_NOTIFY_TOKEN` role clarified: routing/origin guard only, not a payment-authenticity proof. Payment-authenticity comes from Tranzila HMAC signature + Handshake thtk verification.
- `PaymentIntent` strict atomic gate: write-ahead `status=consuming` prevents concurrent double-fulfillment on notify replay.
- Startup anti-drift guards: when `PAYMENT_PROVIDER=tranzila`, backend fails fast at startup if `PAYMENT_INTENT_ENABLED`, `CARDIGO_NOTIFY_TOKEN`, or `TRANZILA_NOTIFY_DELIVERY_MODE=portal` are absent.
- No-payment smoke passed after hardening.

**Anti-drift:** Do not remove `TRANZILA_NOTIFY_DELIVERY_MODE=portal` from Render env. Do not remove the `consuming` write-ahead gate from `handleNotify`. Do not treat `CARDIGO_NOTIFY_TOKEN` as the sole security layer for first-payment notify.

### 3.2 Tranzila Handshake V2 — CLOSED/PASS

- `TRANZILA_HANDSHAKE_ENABLED=true`, `TRANZILA_HANDSHAKE_API_URL=https://api.tranzila.com/v2/handshake/create`.
- Handshake API V2 implemented using existing `buildTranzilaApiAuthHeaders()`.
- Tranzila `testcards` portal has Hand Shake turned ON.
- Checkout URL contains `thtk`. `PaymentIntent.handshakeThtkHash` stores `sha256(thtk)` — plaintext `thtk` is never stored.
- Tranzila S2S first-payment notify echoes `thtk`. `handleNotify` verifies `sha256(notify.thtk)` against `PaymentIntent.handshakeThtkHash`.
- `thtk` is in `STRIP_KEYS` — never persisted in `PaymentTransaction.payloadAllowlisted`.

**Forged notify tests — both BLOCKED:**

| Test                          | Result                             | Failure reason                       |
| ----------------------------- | ---------------------------------- | ------------------------------------ |
| Forged notify without thtk    | `PaymentTransaction.status=failed` | `failReason=handshake_thtk_missing`  |
| Forged notify with wrong thtk | `PaymentTransaction.status=failed` | `failReason=handshake_thtk_mismatch` |

User/Card not activated in either blocked case.

**Real sandbox first payment with Handshake — PASS:**

| Check                          | Result                      |
| ------------------------------ | --------------------------- |
| `PaymentTransaction.status`    | `paid`                      |
| `PaymentIntent.status`         | `completed`                 |
| `User.subscription.status`     | `active`                    |
| `Card.billing.status`          | `active`                    |
| `thtk` in `payloadAllowlisted` | absent (correctly stripped) |
| YeshInvoice sandbox receipt    | created and sent            |

**Anti-drift:** `TRANZILA_HANDSHAKE_ENABLED=true` must remain active for production-style DirectNG checkout. Disabling removes thtk verification and allows forged notifies through the hash check. The `thtk` amount locking concern (STO amount locked at create time; price-change reconciliation) is a separate future contour, not yet designed.

### 3.3 IframeReturnPage Top-Level Fallback — CLOSED/PASS

**Problem:** Tranzila DirectNG may navigate `_top` to the return URL, exiting the iframe context. In that case `window.parent === window` and `postMessage` is never delivered.

**Fix:** Top-level fallback added to `IframeReturnPage`. When `window.parent === window`:

| `?status=` | Navigation destination  |
| ---------- | ----------------------- |
| `success`  | `/edit/card/settings`   |
| `fail`     | `/pricing?payment=fail` |
| unknown    | `/pricing?payment=fail` |

**Implementation:** `frontend/src/pages/payment/IframeReturnPage.jsx:26–47`.

**Smoke tests 2026-04-28 — all passed:**

- `/payment/iframe-return?status=success` → navigated to `/edit/card/settings`
- `/payment/iframe-return?status=fail` → navigated to `/pricing?payment=fail`
- unknown status → navigated to `/pricing?payment=fail`
- Full sandbox iframe payment flow redirected correctly to `/edit/card/settings` after success.

**Anti-drift:** The postMessage path (when inside iframe) is unchanged. The top-level fallback is additive — it only fires when `window.parent === window`. Both paths are tested. Do not remove the top-level fallback branch.

### 3.4 STO Create Sandbox E2E — CLOSED/PASS

- `TRANZILA_STO_CREATE_ENABLED=true` was temporarily enabled for the sandbox E2E test window.
- Successful sandbox first payment → STO created automatically via API on `testcardstok`.
- `User.tranzilaSto.status=created`, `stoIdPresent=true`. STO visible in Tranzila `testcardstok` UI.
- Terminal: `testcardstok`. Amount: ₪39.90. Frequency: monthly. Unlimited recurring.
- Card expiry captured as `06/30`. `thtk` absent from `PaymentTransaction.payloadAllowlisted`.
- YeshInvoice sandbox receipt created and sent. Receipt email confirmed delivered.
- `TRANZILA_STO_CREATE_ENABLED=false` restored immediately after test.

**Anti-drift:** `TRANZILA_STO_CREATE_ENABLED` defaults to `false`. Only set `true` during an approved controlled test window. Never leave `true` unattended on Render — it auto-creates STO for every first payment.

### 3.5 STO Fast-Forward Create — CLOSED/PASS

**Context:** Needed a real recurring webhook for `TRANZILA_STO_NOTIFY_SANDBOX_E2E_P0`. Manual UI date rescheduling in Tranzila portal is not accepted as enterprise proof because prior testing showed manual portal UI date changes may not trigger the webhook.

**Existing operator script used:** `backend/scripts/sto-create-custom-date.mjs`

- Dry-run by default. Requires `--run --execute --i-understand-sto-api-call --email=<email> --first-charge-date=<YYYY-MM-DD>` to call the provider API.
- No new code was needed.

**`charge_dom` clamp — critical finding:**

`charge_dom = Math.min(Math.max(firstChargeDate.getUTCDate(), 1), 28)`

Days 29, 30, 31 produce `charge_dom=28`, placing the next charge on day 28 of the following month — **not** the next day.

**Discarded partial observation (`sales@cardigo.co.il`):** `first-charge-date=2026-04-29` produced `יום חיוב בחודש=28`, `מועד החיוב הבא=28/05/2026`. Not accepted as next-day webhook proof due to `charge_dom` clamp.

**Accepted candidate (`dannybestboy@gmail.com`):**

- `TRANZILA_STO_CREATE_ENABLED=false` during first payment (prevented automatic STO create).
- First payment passed: `subscription.status=active`, `plan=monthly`, `tranzilaTokenPresent=true`, `tranzilaSto.status=null`, `stoIdPresent=false`, `PaymentIntent.status=completed`, receipt sent.
- `sto-create-custom-date.mjs` dry-run for `first-charge-date=2026-05-01` → passed.
- `sto-create-custom-date.mjs` execute → passed.
- DB post-check: `tranzilaSto.status=created`, `stoIdPresent=true`, `stoCreatedAt` present, no STO recurring `PaymentTransaction` yet.
- Tranzila `testcardstok` portal confirms: `תחילת החיובים=01/05/2026`, `מועד החיוב הבא=01/05/2026`, terminal `testcardstok`, amount ₪39.90.

**Anti-drift:** Always use days 1–28 for fast-forward tests. Days 29/30/31 are invalid for next-day proof. `sto-create-custom-date.mjs` is an operator script — it does nothing unless manually executed with all required flags. Do not delete this script. Cancel test schedules with `sto-cancel.mjs` after verification; do not rely on portal-only deactivation.

### 3.6 STO Notify Pre-Webhook Gate Smoke — CLOSED/PASS

| Test                                                                                         | Expected | Result |
| -------------------------------------------------------------------------------------------- | -------- | ------ |
| `POST /api/payments/sto-notify` (no `?snk=`)                                                 | 403      | ✅ 403 |
| `POST /api/payments/sto-notify?snk=WRONGTOKEN`                                               | 403      | ✅ 403 |
| Direct backend POST `cardigo-backend.onrender.com/api/payments/sto-notify` (no proxy secret) | 403      | ✅ 403 |

Tranzila portal STO notify URL configured: domain `cardigo.co.il`, path `/api/payments/sto-notify`, `?snk=` present, method POST.

---

## 4. Pending: TRANZILA_STO_NOTIFY_SANDBOX_E2E_P0

**Status:** `WAITING_FOR_REAL_PROVIDER_WEBHOOK`  
**Expected date:** 01/05/2026  
**Target user:** `dannybestboy@gmail.com`  
**Terminal:** `testcardstok`  
**Amount:** ₪39.90  
**Plan:** monthly

**Expected chain when webhook arrives:**

```
Real Tranzila MyBilling recurring charge
  → POST /api/payments/sto-notify?snk=<token>
  → Netlify payment-sto-notify.js (token validation)
  → Backend handleStoNotify
  → User lookup by tranzilaSto.stoId
  → supplier / currency / amount checks
  → providerTxnId idempotency gate
  → PaymentTransaction created (paid, idempotencyNote="sto_recurring_notify")
  → User.subscription.expiresAt extended from max(currentExpiresAt, now) + 30 days
  → Card.billing.paidUntil extended
  → YeshInvoice Receipt created / shared
  → Receipt email delivered to dannybestboy@gmail.com
```

---

## 5. Expected Post-Webhook Verification Checklist

After the real Tranzila MyBilling webhook arrives on 01/05/2026, verify the following in order:

### Step 1 — Render log check

Look for this line in Render backend logs:

```
[sto-notify] handler result ok:true duplicate:false plan:monthly
```

- `ok:true` — required
- `duplicate:false` — required (first occurrence)
- No error stack in the surrounding log context
- No raw token, stoId, or payment details in logs (only boolean presence fields)

### Step 2 — MongoDB state: `dannybestboy@gmail.com`

| Field                         | Expected                                                            |
| ----------------------------- | ------------------------------------------------------------------- |
| `User.subscription.status`    | `active`                                                            |
| `User.subscription.expiresAt` | Extended forward (approximately `01/05/2026 + 30d`)                 |
| `User.renewalFailedAt`        | `null`                                                              |
| `User.tranzilaSto.status`     | `created` (unchanged — recurring success does not alter STO status) |
| `stoIdPresent`                | `true` (unchanged)                                                  |

### Step 3 — PaymentTransaction ledger

| Field                    | Expected                            |
| ------------------------ | ----------------------------------- |
| New `PaymentTransaction` | present                             |
| `status`                 | `paid`                              |
| `idempotencyNote`        | `"sto_recurring_notify"`            |
| `amountAgorot`           | `3990`                              |
| `providerTxnId`          | present (starts with `sto:` prefix) |

### Step 4 — Receipt

| Field         | Expected  |
| ------------- | --------- |
| New `Receipt` | present   |
| `status`      | `created` |
| `shareStatus` | `sent`    |
| `sharedAt`    | populated |

### Step 5 — Card billing

| Field                    | Expected                   |
| ------------------------ | -------------------------- |
| `Card.billing.paidUntil` | Updated (extended forward) |

### Step 6 — Email delivery

- Check `dannybestboy@gmail.com` inbox for YeshInvoice receipt email.

### Step 7 — Idempotency architecture note (diagnostic only)

The `providerTxnId` uniqueness constraint (`E11000`) is the duplicate guard. If the same webhook is replayed, `idempotencyNote` will be set to `"duplicate_skipped"` and no second `PaymentTransaction` is created. This is an architecture invariant, not a standard verification step.

---

## 6. Failure Handling Table

| Failure mode                             | Root cause                                                                      | Recovery                                                                                                                                                                                                                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `amount_mismatch`                        | `PRICES_AGOROT` code value doesn't match the amount the STO was created with    | Do NOT change `PRICES_AGOROT` while active schedules exist. Current code is `3990` and schedule is `₪39.90` — they match. If this fires, verify `plans.js:72–73` has not been modified.                                                                                                   |
| `user_not_found`                         | `tranzilaSto.stoId` in the incoming webhook payload doesn't match any DB record | Check the incoming webhook payload `stoId` field. Verify MongoDB `dannybestboy@gmail.com` → `tranzilaSto.stoIdPresent=true`. Check if stoId in portal matches DB.                                                                                                                         |
| `no_provider_txn_id`                     | Tranzila webhook missing `Tempref` or `index` fields                            | Log the raw incoming payload (safely). `deriveStoProviderTxnId()` has fallback: `sto:<stoId>:tempref:<Tempref>` or `sto:<stoId>:<index>`. If both missing, review Tranzila sandbox My Billing payload format documentation.                                                               |
| Receipt created but `shareStatus=failed` | YeshInvoice API timeout or error during share                                   | Renewal ACK to Tranzila already sent (fire-and-forget). `shareFailReason` recorded on `Receipt`. Retry via `RECEIPT_RECONCILIATION_INTERVAL_MS` job or manually via admin.                                                                                                                |
| No webhook on 01/05                      | Tranzila did not fire, or it fired to wrong URL                                 | Check Render logs for any `[sto-notify]` entries. Check Tranzila `testcardstok` portal for charge attempt status. If no charge attempt: portal may not have fired (Option C — simulated notify). If charge attempt failed: check `user.tranzilaSto.lastErrorCode` and `lastErrorMessage`. |
| Webhook arrives but `403`                | Token mismatch between Netlify `CARDIGO_STO_NOTIFY_TOKEN` and Render env        | Verify both envs have the same value. Do not log or compare raw token values in docs.                                                                                                                                                                                                     |

---

## 7. Cleanup Checklist (after 01/05 webhook verified)

| Item                            | Action                                                              | Command                                                                                                                                          |
| ------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `dannybestboy@gmail.com` STO    | Cancel via operator script (dry-run first)                          | `cd backend && node scripts/sto-cancel.mjs --run --email=dannybestboy@gmail.com --cancellation-reason="sto-notify-e2e-sandbox-cleanup-01052026"` |
| After dry-run passes            | Execute cancel                                                      | Add `--execute --i-understand-sto-cancel-api-call` to the above                                                                                  |
| Tranzila `testcardstok` portal  | Confirm schedule shows deactivated                                  | Manual portal check                                                                                                                              |
| `TRANZILA_STO_CREATE_ENABLED`   | Must remain `false` on Render                                       | Already `false` — confirm it stays `false`                                                                                                       |
| Prior STO create E2E test users | Check if any prior test STOs remain active in `testcardstok` portal | Manual portal check; cancel any orphaned schedules                                                                                               |

**Do not delete operator scripts** (`sto-create-custom-date.mjs`, `sto-cancel.mjs`, `sto-retry-failed.mjs`). These are permanent operator tools. Cancel test schedules with `sto-cancel.mjs`, do not rely on portal-only deactivation.

---

## 8. Anti-Drift / Anti-Regression Policy

| Policy                         | Invariant                                                                                                                                                                                                                                                                                            |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `notify_url_address`           | `TRANZILA_NOTIFY_DELIVERY_MODE=portal` must remain set when `PAYMENT_PROVIDER=tranzila`. Removing it reintroduces `notify_url_address` in the browser-visible checkout URL.                                                                                                                          |
| Handshake                      | `TRANZILA_HANDSHAKE_ENABLED=true` must remain active for production-style DirectNG checkout. Disabling removes thtk verification and allows forged first-payment notifies to bypass the hash check.                                                                                                  |
| thtk persistence               | `thtk` is in `STRIP_KEYS`. `PaymentIntent.handshakeThtkHash` stores `sha256(thtk)` only. Plaintext `thtk` must never appear in `payloadAllowlisted`.                                                                                                                                                 |
| PaymentIntent `consuming` gate | `status=consuming` write-ahead must remain active when `PAYMENT_PROVIDER=tranzila`. Prevents double-activation on concurrent notify replays.                                                                                                                                                         |
| STO notify independence        | `/api/payments/sto-notify` does NOT use `PaymentIntent` or Handshake. Its security model is independent: `CARDIGO_STO_NOTIFY_TOKEN` + proxy secret + `stoId` user correlation + supplier/currency/amount checks + `providerTxnId` idempotency.                                                       |
| `charge_dom` clamp             | `charge_dom = Math.min(Math.max(firstChargeDate.getUTCDate(), 1), 28)`. Days 29/30/31 are not valid for next-day webhook tests. Use days 1–28.                                                                                                                                                       |
| Operator scripts               | `sto-create-custom-date.mjs`, `sto-cancel.mjs`, `sto-retry-failed.mjs` are operator scripts — they do nothing unless manually executed with all required flags. Do not delete them.                                                                                                                  |
| Startup guards                 | When `PAYMENT_PROVIDER=tranzila`: startup fails fast if `PAYMENT_INTENT_ENABLED`, `CARDIGO_NOTIFY_TOKEN`, or `TRANZILA_NOTIFY_DELIVERY_MODE=portal` are missing. These cannot be bypassed.                                                                                                           |
| `PRICES_AGOROT` lock           | Do not change `PRICES_AGOROT` while active STO schedules exist. Amount mismatch = every recurring notify fails. Restore to production values only in a dedicated pre-production contour, after ALL sandbox STO schedules are cancelled.                                                              |
| Production terminal cutover    | `TRANZILA_TERMINAL`, `TRANZILA_STO_TERMINAL`, `TRANZILA_SECRET`, `TRANZILA_HANDSHAKE_ENABLED`, `TRANZILA_HANDSHAKE_API_URL` must all be explicitly verified for the production terminal before any production go-live. Do not carry sandbox terminal IDs (`testcards`/`testcardstok`) to production. |

---

## 9. No-Secret Policy

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

**Test email `dannybestboy@gmail.com`:** may be referenced when operationally needed (it is the current pending STO webhook test candidate).

---

## 10. Next Steps for Next GPT Chat

### Immediate next action (01/05/2026)

When the real Tranzila MyBilling webhook arrives, run the post-webhook verification checklist (§5 above).

Expected outcome: `TRANZILA_STO_NOTIFY_SANDBOX_E2E_P0 = CLOSED/PASS`

After verification passes:

1. Run cleanup checklist (§7 above).
2. Update `billing-flow-ssot.md §16` proof table to add the 01/05 recurring webhook result.
3. Consider creating a brief handoff update noting `TRANZILA_STO_NOTIFY_SANDBOX_E2E_P0 = CLOSED/PASS`.

### If webhook does not arrive on 01/05

1. Check Render backend logs for any `[sto-notify]` entries on 01/05.
2. Check Tranzila `testcardstok` portal — was a charge attempt made?
3. If no charge attempt: use Option C (simulated notify with a real previously-received payload).
4. Do not re-run `sto-create-custom-date.mjs` without cancelling the existing schedule first.

### After `TRANZILA_STO_NOTIFY_SANDBOX_E2E_P0` is closed

Recommended future contours (in priority order):

1. **Production terminal cutover** — swap sandbox terminals for production terminal IDs; restore `PRICES_AGOROT` to `3990/39990` in production env (confirm it already is in code); verify all env vars on Render and Netlify; production first-payment smoke.
2. **G7 production recurring lifecycle proof** — real customers on production terminal.
3. **thtk amount locking** — STO amount locked at create time; price-change reconciliation design.
4. **Post-deploy monitoring checklist formalization** — monitoring signals, alert thresholds.
5. **Log-safety policy document** — allowed/disallowed logging patterns for payment/admin flows.

---

## 11. Explicit Non-Actions and Boundaries

| Non-action                                                                | Reason                                                                                                                                                            |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Do NOT update prior handoff docs                                          | Historical records — modifying them corrupts the chronicle. This doc supersedes `Cardigo_Enterprise_Next_Chat_Master_Handoff_2026-04-26.md` as the current truth. |
| Do NOT delete `Cardigo_Enterprise_Next_Chat_Master_Handoff_2026-04-26.md` | It is the prior master truth and remains as historical record in `current/`.                                                                                      |
| Do NOT change `PRICES_AGOROT`                                             | Active STO schedule at `₪39.90` (`dannybestboy@gmail.com`). Code already matches. No action needed.                                                               |
| Do NOT set `TRANZILA_STO_CREATE_ENABLED=true`                             | Must stay `false` until next approved test window or production rollout.                                                                                          |
| Do NOT run `sto-cancel.mjs` yet                                           | Wait until 01/05 webhook is verified before cleanup.                                                                                                              |
| Do NOT reopen admin user delete lifecycle contour                         | Closed and verified 2026-04-26. No regression observed.                                                                                                           |
| Do NOT reopen iframe checkout E2E contour                                 | Closed 2026-04-25, hardened 2026-04-26. No regression observed.                                                                                                   |
| Do NOT carry sandbox terminal IDs to production                           | `testcards` and `testcardstok` are sandbox only. Production terminal cutover is a separate future contour.                                                        |
| Do NOT document raw token/stoId/thtk/TranzilaTK values                    | No-secret policy is absolute. See §9.                                                                                                                             |
| Do NOT add Handshake to a separate architecture doc                       | All Handshake facts belong in `billing-flow-ssot.md §14` and this handoff only.                                                                                   |

---

## 12. Safe Read-Only Verification Gates (non-destructive)

After next chat begins, these are safe to run:

```powershell
cd backend
npm.cmd run sanity:imports
npm.cmd run sanity:slug-policy
npm.cmd run sanity:ownership-consistency
npm.cmd run sanity:paymentintent-index-drift
```

For frontend-related work:

```powershell
cd frontend
npm.cmd run check:inline-styles
npm.cmd run check:skins
npm.cmd run check:contract
npm.cmd run build --if-present
```

Safe endpoint smokes:

```powershell
# Expect 403 (gate token required):
curl.exe -s -o NUL -w "%{http_code}" -X POST "https://cardigo.co.il/api/payments/sto-notify"

# Expect 303 to /payment/iframe-return?status=success:
curl.exe -i -X POST "https://cardigo.co.il/api/payments/return?status=success&target=iframe"
```

**Never run `npm run sanity:admin-user-delete` locally** — destructive CI-only script.  
**Never run `sto:cancel:execute` casually** — calls provider API.

---

## 13. Document Chain

| Doc                                                                                 | Purpose                                                                                     |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| This file                                                                           | Current master truth (2026-04-28)                                                           |
| `Cardigo_Enterprise_Next_Chat_Master_Handoff_2026-04-26.md`                         | Prior master — admin delete lifecycle closure. Historical reference only.                   |
| `docs/runbooks/billing-flow-ssot.md`                                                | Tier 2 SSoT — billing architecture, event sequence, env vars, STO, receipt, iframe checkout |
| `docs/runbooks/tranzila-go-live-checklist.md`                                       | Tier 2 — go-live operator checklist                                                         |
| `docs/runbooks/admin-user-delete-lifecycle.md`                                      | Operator runbook — admin/self delete + STO cancellation cascade                             |
| `docs/runbooks/yeshinvoice-integration-runbook.md`                                  | YeshInvoice integration operator checklist                                                  |
| `docs/handoffs/current/Cardigo_Enterprise_Handoff_CheckoutIframe_E2E_2026-04-25.md` | Iframe checkout E2E evidence (historical)                                                   |
