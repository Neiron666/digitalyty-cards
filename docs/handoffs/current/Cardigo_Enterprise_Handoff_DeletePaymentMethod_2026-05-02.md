# Cardigo Enterprise Handoff — Delete Saved Payment Method

**Date:** 2026-05-02
**Contour:** Self-Service Delete Saved Payment Method (SettingsPanel + backend endpoint)
**Status:** IMPLEMENTED + MANUALLY SMOKE-VERIFIED. Production rollout: NOT STARTED (production terminal cutover pending).

---

## Executive Summary

User self-service delete saved payment method is fully implemented and manually smoke-verified. A user may delete the locally stored Tranzila provider-issued token from their Cardigo account when auto-renewal is not active or pending, without contacting support.

Key invariants:

1. Delete is a **local DB operation only** — no Tranzila API call, no STO cancellation, no YeshInvoice contact, no Mailjet email, no receipt, no charge.
2. Delete is **blocked while STO is `"created"` or `"pending"`** (fail-closed allowlist).
3. Delete does **not affect Premium entitlement** — `subscription.expiresAt` and `Card.billing.paidUntil` are unchanged.
4. After delete, `paymentMethod.saved` becomes `false`, resume auto-renewal becomes unavailable (`token_missing` on any backend attempt), and the delete section disappears from the UI.
5. State sync is fully backend-driven: cancel-renewal and resume-auto-renewal responses now include `paymentMethod` DTO so the UI reflects the correct enable/disable state without reload.

---

## Backend Closure

**File:** `backend/src/routes/account.routes.js`

### GET /api/account/me — paymentMethod DTO

Returns a computed `paymentMethod` DTO (never raw token/meta/provider fields):

```
paymentMethod: {
  saved: boolean,     // true if local Tranzila token is present
  expired: boolean,   // server-computed from token metadata
  canDelete: boolean  // saved === true AND STO status is in the allowed set
}
```

Derived by `buildPaymentMethodDto()` at `account.routes.js:L143-L170`. `canDelete` does NOT depend on `expired`. An expired token may still be deleted if STO status allows.

### POST /api/account/delete-payment-method

- `requireAuth` — cookie-auth only.
- No request body.
- Rate limit: **5 / 24h** per userId (`DELETE_PAYMENT_METHOD_LIMIT=5`, `DELETE_PAYMENT_METHOD_WINDOW_MS=86400000`).
- In-flight guard: `deletePaymentMethodInFlight` Set — one concurrent call per userId.

STO allowlist (`isPaymentMethodDeleteAllowedStoStatus()` at `account.routes.js:L137`):

| `tranzilaSto.status` | Delete allowed?  |
| -------------------- | ---------------- |
| `null` / absent      | Yes              |
| `"cancelled"`        | Yes              |
| `"failed"`           | Yes              |
| `"created"`          | No               |
| `"pending"`          | No               |
| Any unknown value    | No (fail-closed) |

**Mutation (local DB only):**

- `tranzilaToken = null`
- `tranzilaTokenMeta.expMonth = null`
- `tranzilaTokenMeta.expYear = null`
- Implemented via `User.updateOne` with the STO allowlist as an explicit `$or` filter — atomic, no race condition.

**Idempotency:** If token is already `null`, returns 200 `payment_method_already_deleted` — no mutation.

**Response DTO on success:**

```json
{
    "ok": true,
    "messageKey": "payment_method_deleted",
    "paymentMethod": { "saved": false, "expired": false, "canDelete": false },
    "autoRenewal": { ... }
}
```

All response paths return only safe DTOs. No raw token, expiry, stoId, or provider identifiers are returned.

**messageKeys:**

| `messageKey`                         | HTTP |
| ------------------------------------ | ---- |
| `payment_method_deleted`             | 200  |
| `payment_method_already_deleted`     | 200  |
| `payment_method_sto_not_deletable`   | 409  |
| `payment_method_delete_rate_limited` | 429  |
| `payment_method_in_flight`           | 409  |
| `payment_method_delete_failed`       | 500  |
| `account_not_found`                  | 404  |

### Cancel-Renewal and Resume-Auto-Renewal — paymentMethod added to responses

Both `POST /api/account/cancel-renewal` and `POST /api/account/resume-auto-renewal` success/idempotent responses now include `paymentMethod: buildPaymentMethodDto(...)`. This enables immediate UI state sync without reload.

- After cancel: STO `"cancelled"`, `canDelete` may become `true` — delete button enabled immediately.
- After resume: STO `"created"`, `canDelete` becomes `false` — delete button disabled immediately.

PROOF:

- Cancel-renewal L1089, L1099, L1132: `paymentMethod: buildPaymentMethodDto(user)` added to each success path.
- Resume-auto-renewal L1339-1351: `refreshed` select extended to include `tranzilaToken tranzilaTokenMeta`; response now includes `paymentMethod: buildPaymentMethodDto(refreshed)`.

---

## Frontend Closure

**File:** `frontend/src/components/editor/panels/SettingsPanel.jsx`

### Collapsible danger UX

Outer gate: `account?.paymentMethod?.saved === true` — entire section hidden once `saved` becomes `false`.

Inside: `<details className={collapsible + collapsibleDanger}>` — native HTML disclosure element, not a peer action alongside resume.

- Summary label: **ניהול פרטי תשלום שמורים**
- Static note: "המנוי יישאר פעיל עד תאריך הסיום. לאחר מחיקת פרטי התשלום לא ניתן יהיה לחדש את המנוי אוטומטית."
- Blocked note (when `canDelete !== true`): "החידוש האוטומטי פעיל — יש לבטל אותו תחילה לפני מחיקת פרטי התשלום."
- Button: **מחק פרטי תשלום** — `disabled={deletePaymentMethodBusy || canDelete !== true}`

Success message (outside the gate, persists after section disappears): "פרטי התשלום נמחקו. לחידוש המנוי בעתיד יהיה צורך להזין פרטי תשלום מחדש."

### State sync handlers

- `handleCancelRenewal()`: `setAccount` updater merges `autoRenewal: res?.autoRenewal` AND `paymentMethod: res?.paymentMethod ?? prev?.paymentMethod`.
- `handleResumeRenewal()`: same pattern.
- `handleDeletePaymentMethod()`: merges `paymentMethod: res?.paymentMethod ?? { saved: false, expired: false, canDelete: false }` AND `autoRenewal`.

### canResumeAutoRenewal guard

`canResumeAutoRenewal` IIFE checks `account?.paymentMethod?.saved !== false` in addition to renewal/subscription conditions. If the stored token was deleted, the resume button is hidden.

**File:** `frontend/src/components/editor/DeletePaymentMethodModal.jsx`

Presentational-only modal — no API calls inside. Props: `open`, `busy`, `onConfirm`, `onClose`. Reuses `CancelRenewalModal.module.css`. ARIA `alertdialog`, RTL dir, Escape guard (not-busy), backdrop click guard.

- Title: **מחיקת פרטי תשלום שמורים**
- Body: 5 lines explaining no current subscription impact, Premium persists, no renewal after delete, new checkout required after expiry, no charge/receipt now.
- Confirm: **מחק פרטי תשלום** | Cancel: **חזרה**

**File:** `frontend/src/services/account.service.js`

- `deletePaymentMethod()`: `api.post("/account/delete-payment-method")` → `res.data`. No request body.

---

## Manual Smoke Results (2026-05-02)

| Check                                                                        | Result |
| ---------------------------------------------------------------------------- | ------ |
| With active STO: collapsible visible, delete button disabled, note shown     | ✅     |
| After cancel-renewal: `canDelete` becomes `true` without page reload         | ✅     |
| Delete modal opens and requires confirmation                                 | ✅     |
| After confirmation: `payment_method_deleted` response received               | ✅     |
| After delete: `paymentMethod.saved=false`, collapsible section disappears    | ✅     |
| After delete: resume button hidden (`saved !== false` guard)                 | ✅     |
| After delete: Premium access remains active until `expiresAt`                | ✅     |
| After delete: success message visible outside the now-hidden section         | ✅     |
| After resume (before delete): `canDelete` becomes `false` without reload     | ✅     |
| Self-delete with active STO: STO cancelled provider-first before user delete | ✅     |
| All 4 frontend gates EXIT:0 (inline-styles, skins, contract, build)          | ✅     |

**Redacted evidence note:** Raw stoId, TranzilaTK, providerTxnId, providerDocId, and email are intentionally not documented here per doc hygiene policy. Booleans only.

---

## Security / Privacy

- Cardigo stores a Tranzila provider-issued token, not raw PAN/CVV or raw card numbers.
- `POST /api/account/delete-payment-method` removes that token from Cardigo's local MongoDB record only.
- No raw token, raw stoId, raw expiry fields, or raw card data are logged or returned by the endpoint.
- Provider-side token invalidation is **not** performed by this endpoint. Whether the token remains usable at the Tranzila provider level after local deletion is a deferred open question.
- The endpoint is rate-limited (5/24h) and in-flight guarded to prevent abuse.
- Auth: httpOnly cookie only (`requireAuth`). No localStorage token, no Authorization header from browser.

---

## Explicit Non-Actions

The following do NOT occur when `POST /api/account/delete-payment-method` is called:

- No Tranzila API call.
- No STO cancellation (STO is not affected by this endpoint).
- No `PaymentTransaction` created.
- No `Receipt` created.
- No YeshInvoice contact.
- No Mailjet email sent.
- No refund issued.
- No subscription downgrade or `subscription.expiresAt` change.
- No `Card.billing.paidUntil` change.
- No `renewalFailedAt` change.
- No fiscal record modification.

---

## Production Boundary / Rollout Notes

This handoff closes sandbox documentation readiness only.

Items that remain separate future contours and are NOT closed by this handoff:

- Production terminal cutover (G6): swap `testcards`/`testcardstok` for production terminal IDs.
- `PRICES_AGOROT` restore after all active sandbox STO schedules are cancelled/deactivated.
- Full production E2E payment smoke on production terminal.
- G6 + G7 (see `billing-flow-ssot.md §14` and `§16`) remain open.

---

## Future Tails

1. **Update/replace payment method:** Replacing the stored Tranzila token with a different card while the subscription is active is not implemented. No self-service path exists. Active-premium checkout bypass is not supported. After expiry, a normal checkout flow (new payment) re-establishes a token.

2. **Provider-side token invalidation:** Whether the deleted local token can be invalidated at the Tranzila provider level requires Tranzila API capability confirmation. Not implemented and not proven.

3. **Admin revoke token cleanup:** `POST /api/admin/users/:id/subscription/revoke` does not currently clear the local stored token. A deferred contour decision is required to determine whether revoke should also null out `tranzilaToken`/`tranzilaTokenMeta` (and under what conditions).

---

**Canonical SSoT:** `docs/runbooks/billing-flow-ssot.md §20`
**Support runbook:** `docs/runbooks/cardigo_billing_support_runbook.md §1` and `§4.3`
**Policy reference (delete lifecycle):** `docs/policies/POLICY_ADMIN_DELETE_LIFECYCLE_V1.md`
