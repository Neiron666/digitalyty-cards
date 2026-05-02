# Cardigo Enterprise Handoff — Resume Auto-Renewal

**Date:** 2026-05-02
**Contour:** Self-Service Resume Auto-Renewal (SettingsPanel + backend endpoint)
**Status:** IMPLEMENTED + SANDBOX-PROVEN. Production rollout: NOT STARTED.

---

## Executive Summary

User self-service resume auto-renewal is fully implemented and sandbox-proven. A user whose Tranzila STO was cancelled (via self-service cancel-renewal) can re-enable recurring charges from the SettingsPanel billing section without contacting support, provided:

1. Subscription is still active (`subscription.status === "active"` and `expiresAt` not yet passed).
2. Provider is Tranzila and plan is monthly or yearly.
3. A valid stored Tranzila token (`tranzilaSto.tranzilaToken`) exists and has not expired.

The full lifecycle was smoke-tested in sandbox on 2026-05-02: payment → YeshInvoice receipt email → cancel → resume → STO recreated → cancel (cleanup). All checks PASS.

---

## Backend Closure

**File:** `backend/src/routes/account.routes.js`

- `POST /api/account/resume-auto-renewal` — `requireAuth`, no request body, rate-limited (2/24h per userId), in-flight guard (`resumeRenewalInFlight` Set).
- Feature flag: `TRANZILA_STO_CREATE_ENABLED === "true"` (strict) — returns 503 `"resume_unavailable"` if absent/false.
- Preconditions checked before any provider call (see §19 of `billing-flow-ssot.md` for full table).
- Calls `createTranzilaStoForUser(user, plan, firstChargeDate, { allowRecreateAfterCancel: true })`.
- Returns `{ ok: true, resumed: true, autoRenewal: buildAutoRenewalDto(refreshed) }` on success.

**File:** `backend/src/services/payment/tranzila.provider.js`

- `createTranzilaStoForUser` uses a write-ahead/pending pattern: `tranzilaSto.status` is written to `"pending"` before the provider API call, then advanced to `"created"` on success or `"failed"` on error.
- `opts.allowRecreateAfterCancel=true` bypasses the `status === "cancelled"` hard-stop only. Guard A (`status === "created"` idempotency guard) remains fully enforced.

---

## Frontend Closure

**File:** `frontend/src/services/account.service.js`

- `resumeAutoRenewal()` — `api.post("/account/resume-auto-renewal")` → `res.data`. No request body.

**File:** `frontend/src/components/editor/panels/SettingsPanel.jsx`

- `canResumeAutoRenewal` IIFE: `renewalStatus === "cancelled"` AND `provider === "tranzila"` AND `subStatus === "active"` AND `Boolean(expiresAt)` AND `!isExpired` AND (`acPlan === "monthly"` OR `"yearly"`).
- `handleResumeRenewal()` — Hebrew error mapping for all real messageKeys.
- Button label: **חדש חידוש אוטומטי** (shown only when `canResumeAutoRenewal === true`).
- On success: UI reflects updated `autoRenewal.status === "active"`.

Real messageKeys implemented in `handleResumeRenewal()`:
`account_not_found` | `resume_unavailable` | `subscription_not_active` | `subscription_expired` | `wrong_provider` | `unsupported_plan` | `already_active` | `renewal_in_progress` | `renewal_not_cancelled` | `token_missing` | `token_expired` | `resume_failed` | `resume_renewal_rate_limited` (429)

---

## Verification (Phase 3)

All checks run from `frontend/` after Phase 2B changes:

| Gate                | Command                       | Exit |
| ------------------- | ----------------------------- | ---- |
| check:inline-styles | `npm run check:inline-styles` | 0    |
| check:skins         | `npm run check:skins`         | 0    |
| check:contract      | `npm run check:contract`      | 0    |
| build               | `npm run build --if-present`  | 0    |

24/24 backend/frontend verification checks: PASS.

---

## Manual Sandbox Smoke (2026-05-02) — PASS

Full lifecycle tested in local sandbox environment (`PAYMENT_PROVIDER=tranzila`, `TRANZILA_STO_CREATE_ENABLED=true`, `YESH_INVOICE_ENABLED=true`):

| Check                                         | Result |
| --------------------------------------------- | ------ |
| Payment → STO created                         | ✅     |
| YeshInvoice receipt email delivered           | ✅     |
| Cancel → `tranzilaSto.status="cancelled"`     | ✅     |
| Resume endpoint → 200 `ok:true, resumed:true` | ✅     |
| New `stoIdPresent=true` written to MongoDB    | ✅     |
| `tranzilaSto.status="created"` after resume   | ✅     |
| `subscription.expiresAt` unchanged throughout | ✅     |
| Cancel (cleanup) after smoke                  | ✅     |
| All 4 frontend gates EXIT:0                   | ✅     |
| No YeshInvoice email on resume (Class A)      | ✅     |

**Redacted evidence note:** Raw stoId, TranzilaTK, providerTxnId, providerDocId, and email are intentionally not documented here per doc hygiene policy. Booleans used instead.

---

## YeshInvoice / Receipt Resolution

Resume creates no payment. No `handleNotify` / `handleStoNotify` is triggered. No `PaymentTransaction` is created. No `Receipt` is created. No YeshInvoice email is sent.

**Classification: Class A expected behavior.** Email delivery requires a real payment event, not an STO creation event. This was audited and confirmed in Phase 1 read-only review of `account.routes.js:1113–1320` and `tranzila.provider.js:462–645`. No code change is warranted.

---

## Open Future Tails

1. **`PaymentTransaction.receiptId` write-back** — In this smoke, `Receipt.paymentTransactionId` is populated (Receipt → PaymentTransaction link exists) but `PaymentTransaction.receiptIdPresent=false` — the link is one-directional. Write-back of `receiptId` to `PaymentTransaction` is deferred. Not a blocking issue.

2. **token_missing / token_expired support path** — If the stored Tranzila token is absent or expired, the self-service resume path cannot proceed. The current state surfaces the correct error to the UI. Operator/support escalation path for token renewal is not yet defined. Deferred as a future contour.

3. **Production STO schedule cleanup** — Active sandbox STO schedules (including the sandbox test user, `recipientEmailMatchesTarget=true`, `testcardstok` portal) must be manually cancelled/deactivated before production cutover. Operator responsibility.

---

## Production Boundary (explicit)

This handoff closes sandbox documentation readiness only. The following items remain separate future contours and are NOT closed by this handoff:

- Production terminal cutover (G6): swap `testcards`/`testcardstok` for production terminal IDs.
- `PRICES_AGOROT` restore after all active sandbox STO schedules are cancelled/deactivated.
- `TRANZILA_SECRET` swap to production signing secret.
- `TRANZILA_STO_CREATE_ENABLED=true` armed in production Render env.
- Full production E2E payment smoke on production terminal.
- G6 + G7 (see `billing-flow-ssot.md §14` and `§16`) remain open.

**Canonical SSoT:** `docs/runbooks/billing-flow-ssot.md §19`
**Support runbook:** `docs/runbooks/cardigo_billing_support_runbook.md`
