# Cardigo Enterprise Handoff — Admin Revoke Token Clear

**Contour:** `ADMIN_REVOKE_TOKEN_CLEAR_P1`
**Status:** `CODE VERIFIED / DOCS UPDATED / PENDING PHASE 3B SANDBOX SMOKE`
**Date:** 2026-05-03
**Scope:** Backend only. No frontend. No provider API change. No migration.

---

## 1. Problem Before Fix

When a platform admin revoked a user subscription via
`POST /api/admin/billing/users/:userId/subscription/revoke`, the handler:

- cancelled the Tranzila STO (Contour `PROVIDER_CANCELLATION_BEFORE_DELETE_OR_REVOKE`, closed 2026-04-26);
- downgraded `plan` and `subscription` to free/inactive;
- **did not clear the local stored Tranzila payment token.**

This created two issues:

1. **Privacy/data-minimization gap:** A payment credential (`tranzilaToken`, `tranzilaTokenMeta`) was retained in the user document with no active lifecycle purpose. The STO was cancelled, but the credential remained.
2. **Resume-auto-renewal bypass risk:** The self-service `POST /api/account/resume-auto-renewal` endpoint reads `tranzilaToken` directly. Because the token was retained, a revoked user whose STO status was `"cancelled"` (as set by the revoke flow) could pass the `token_missing` precondition gate and recreate the STO — effectively re-activating auto-renewal after an admin revoke.

Originating deferral note: `docs/handoffs/current/Cardigo_Enterprise_Handoff_DeletePaymentMethod_2026-05-02.md` line 216.

---

## 2. Implemented Behavior

After this contour, when admin subscription revoke succeeds or safely skips STO cancellation, the same atomic `User.findByIdAndUpdate` now also clears:

- `tranzilaToken = null`
- `tranzilaTokenMeta.expMonth = null`
- `tranzilaTokenMeta.expYear = null`

The clear is part of the existing `$set` payload. It is local DB cleanup only.

---

## 3. Safe Ordering

The ordering is unchanged from the pre-existing revoke flow. The token clear fields are added to the `$set` object that is only executed after the STO gate passes:

1. `cancelTranzilaStoForUser(existing, { source: "admin_revoke", reason })` — provider-first.
2. Hard gate: if `!stoResult.ok && !stoResult.skipped` → return 409 `STO_CANCEL_REQUIRED`. No local writes.
3. `User.findByIdAndUpdate` with `$set` containing plan, subscription fields, and token-clear fields — only reached after gate passes.

Token clear cannot happen while an active STO exists at the provider because the hard gate at step 2 blocks execution if provider cancellation fails.

---

## 4. Code Change Summary

File changed: `backend/src/controllers/admin.controller.js`
Function: `adminRevokeUserSubscription`
Change: three null-set fields appended to the existing `update` object literal, inside the same `$set` payload passed to `User.findByIdAndUpdate`.

Fields added to `update`:

- `tranzilaToken: null`
- `"tranzilaTokenMeta.expMonth": null`
- `"tranzilaTokenMeta.expYear": null`

No other files modified. No new imports. No Object.assign, no spread, no second update object.

---

## 5. Verification Summary (Phase 3A — Static)

All checks passed 2026-05-03:

- `node --check backend/src/controllers/admin.controller.js` — EXIT 0, no syntax errors.
- `npm run sanity:imports` (backend) — importedCount: 20, failedCount: 0 — EXIT 0.
- Frontend `check:inline-styles` — PASS / EXIT 0.
- Frontend `check:skins` — PASS / EXIT 0 (28 skin files scanned).
- Frontend `check:contract` — PASS / EXIT 0 (25 templates).
- Frontend `build` — PASS / EXIT 0 (362 modules, vite v7.3.1).

Phase 3B manual sandbox smoke is the recommended follow-up step (optional; see section 9).

---

## 6. Behavior Matrix

cancel-renewal (`POST /api/account/cancel-renewal`):
STO cancelled at provider. Token intentionally retained. User can resume auto-renewal self-service using retained token.

delete-payment-method (`POST /api/account/delete-payment-method`):
Token cleared locally (same three fields nulled). No STO cancel — STO must already be in a safe status (allowlist gate). No provider API call.

admin revoke (`POST /api/admin/billing/users/:userId/subscription/revoke`):
STO cancelled/safely skipped first (provider-first, hard gate). Token cleared atomically with subscription downgrade. User cannot resume auto-renewal using old token.

self-delete (`POST /api/account/delete-account`):
User document deleted. Token gone with user document (implicit, not an explicit null-set).

admin-delete (`POST /api/admin/users/:id/delete`):
User document deleted. Token gone with user document (implicit).

update-card / replace-card:
Not implemented. Deferred to a separate contour (`UPDATE_PAYMENT_METHOD_ARCHITECTURE_P1`).

---

## 7. What Is NOT Changed

- Response shape of admin revoke endpoint: unchanged. `{ ok, userId, plan, subscription, cardIds }`. No token fields returned.
- Admin audit log shape: unchanged. `meta.before` and `meta.after` contain plan/subscription only. No token value in audit payload.
- `cancelTranzilaStoForUser` logic: unchanged.
- STO-first ordering: unchanged.
- Provider cancellation failure hard gate: unchanged.
- `PaymentTransaction`: not touched. Not modified. Retained per Israeli financial law.
- `Receipt`: not touched. Not modified. Retained as fiscal record.
- YeshInvoice: no document created.
- Mailjet: no email sent.
- No payment or refund created.
- No provider-side token invalidation (local null only).
- No frontend change.
- No migration.
- No env change.

---

## 8. Resume-Auto-Renewal After Revoke

After admin revoke, `Boolean(user.tranzilaToken) === false`. The `POST /api/account/resume-auto-renewal` endpoint checks `if (!user.tranzilaToken)` and returns 409 `messageKey: "token_missing"`. The resume-auto-renewal bypass identified in Phase 1 is closed.

Recovery path: user must establish a new valid payment token through a future checkout flow (standard first-payment path). Self-service resume is not available after revoke without a new token.

---

## 9. Remaining Related Contours

- `UPDATE_PAYMENT_METHOD_ARCHITECTURE_P1` — replacing the stored card with a different card while subscription is active. Not implemented. Deferred.
- Provider-side token invalidation — whether the nulled local token can be invalidated at the Tranzila provider level requires Tranzila API capability confirmation. Not implemented.
- Phase 3B sandbox smoke — optional manual smoke using boolean checks only (no raw token output). Recommended sequence: create test user with cancelled STO and non-null token, call admin revoke, assert `Boolean(user.tranzilaToken) === false`, call resume-auto-renewal, assert 409 `token_missing`.

---

## 10. Docs Updated in Phase 4B

- `docs/runbooks/billing-flow-ssot.md` — stale deferral note replaced with closed-contour statement; cancel-renewal token-preserve note updated to include admin revoke as second clearing path.
- `docs/runbooks/admin-user-delete-lifecycle.md` — §5 lifecycle sequence expanded to include token-clear step.
- `docs/policies/POLICY_ADMIN_DELETE_LIFECYCLE_V1.md` — §4 rewritten as closed current policy (removed gap/target sub-sections).
- `docs/runbooks/cardigo_billing_support_runbook.md` — §4.1 P0 gate block updated to reflect automatic STO cancel + token clear in admin revoke endpoint.
- `docs/handoffs/current/Cardigo_Enterprise_Next_Chat_Master_Handoff_2026-05-02.md` — admin revoke section updated with contour-closed status.

Historical handoff not modified: `docs/handoffs/current/Cardigo_Enterprise_Handoff_DeletePaymentMethod_2026-05-02.md` (originating deferral record — preserved as historical artifact).

---

## 11. Anti-Secret Note

This handoff uses schema field names only (`tranzilaToken`, `tranzilaTokenMeta.expMonth`, `tranzilaTokenMeta.expYear`). No raw token values, STO IDs, provider transaction IDs, provider document IDs, HMAC values, PAN/CVV, or env secret values are documented anywhere in this file or in the Phase 2/3/4 reports.
