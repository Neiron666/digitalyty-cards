# Cardigo Billing Support Runbook (Option A - Support‑Mediated)

**Scope (current reality):**

- No self‑service “manage payment method / cancel subscription / refund” in the product UI.
- Self‑service is limited to:
    1. **Read‑only** subscription status in **Settings → תשלומים**
    2. **Initiate payment** via `POST /api/payments/create` (in dev: mock URL; in prod: Tranzila URL)
- Any cancel/refund/payment‑method change is handled by **Support / Admin**.

**Why:** Tranzila (single‑payment) has no Stripe‑like customer portal, and self‑service cancel/refund/payment‑method change is not yet exposed in the product UI.
This is intentional to avoid fake UX and security/finance drift.

---

## 1) Customer‑Facing UX Copy (Hebrew)

Use these texts in the **Settings → תשלומים** block.

### Static support + limitations

- **ביטול או שינוי אמצעי תשלום**: פנה לתמיכה: **support@cardigo.co.il**
- **היסטוריית תשלומים** אינה זמינה כעת.
- **החזרים כספיים** אינם מתבצעים אוטומטית. במידת הצורך - דרך התמיכה בלבד.

### Dev / not‑connected payment provider message (already implemented as dev‑safe fallback)

- תשלום לא זמין בסביבת פיתוח.

### Optional short disclaimer (if you want one line only)

- לשינוי אמצעי תשלום/ביטול/החזר - תמיכה בלבד.

---

## 2) Support Intake Checklist (what to ask)

Before any billing action:

1. **Account identity**: request must come from the account email, or the user must prove control.
2. **Requested action**: cancel / refund request / payment issue / change plan.
3. **Context**:
    - Account email
    - Card URL or slug (if relevant)
    - Organization name/slug (if relevant)
    - Approx. payment date/time and plan (monthly/yearly) if they paid
    - Any Tranzila reference/order number if they have it

**Never request or store** card numbers / CVV / full payment credentials.

---

## 3) Identity Verification (minimum viable, enterprise‑safe)

**Preferred:** user emails support from the same email as their Cardigo account.

**Alternative (if needed):**

- ask them to log in and provide a screenshot of the Settings → תשלומים status + their email shown in the account section (avoid sensitive info).

**Do not** change billing state based on messages from unverified addresses.

---

## 4) Operational Actions (Admin side)

> The exact UI/buttons may differ; follow the spirit: **auditable changes + bounded writes**.

### 4.1 “Cancel subscription”

> ⚠️ **P0 OPERATOR GATE — Active Tranzila STO check**
>
> Before executing the Cardigo-side downgrade steps below, check the user's `tranzilaSto` state.
>
> - If `tranzilaSto.status === "created"` AND `tranzilaSto.stoId` is present, the user has an active recurring standing order at Tranzila. Downgrading Cardigo alone will NOT stop the recurring charge.
> - Admin revoke / Cardigo-side downgrade is not complete cancellation for STO users. Provider-side STO must be deactivated separately.
> - Until `sto-cancel.mjs` or an admin STO cancel flow exists, the operator must manually deactivate the STO in the Tranzila portal and document the action: ticket ID, operator, date/time, and Tranzila STO ID.
> - `/v2/sto/update` with `sto_status: "inactive"` is the identified provider path, but implementation is blocked until sandbox module confirmation.
> - Never mark `tranzilaSto.status = "cancelled"` in Mongo before provider-side cancellation is confirmed.
> - Never use ad-hoc DB mutation as the normal cancellation flow.
> - If `tranzilaSto.status` is `"pending"` or `"failed"`, do NOT assume there is no provider-side STO. This can represent an interrupted or ambiguous create attempt. Inspect Tranzila portal / logs before downgrade.
> - If `tranzilaSto.status` is `null` and `tranzilaSto.stoId` is absent, no active STO is known in Cardigo. The standard downgrade steps below may proceed.
>   Given Tranzila single‑payment:

- “Cancel” usually means **do not renew next cycle**.
- If the user demands immediate removal of access, Support can **downgrade** in admin panel:
    - Set plan to **free**
    - Set `subscription.status` to **inactive** (or expired) and `expiresAt` to **now**
    - Ensure Card billing paidUntil/entitlements reflect free tier
    - Add **reason** and ticket ID to audit fields (admin reason/note)

**Policy suggestion:** do not promise pro‑rated refunds unless explicitly approved.

### 4.2 “Refund request”

Refunds are performed **in Tranzila back‑office** (manual action by operator).
After the refund is processed:

- Update Cardigo state to reflect **free/inactive**
- Record:
    - Ticket ID
    - Refund date/time
    - Operator name
    - Tranzila transaction reference (if available)

### 4.3 “Change payment method”

With Tranzila single‑payment there is no stored payment method to switch.
The correct support response:

- “We don’t store your payment method. To use a different card, start a new payment/renewal when needed.”

If the user is mid‑cycle and wants future renewals: currently **manual** only (until portal/recurring is implemented).

---

## 5) Security & Compliance Notes

- **No PCI scope** in Cardigo: we never store payment credentials.
- Keep logs free of PII beyond what is necessary (email may be required, but do not log passwords/tokens).
- Maintain anti‑enumeration in public surfaces; support actions are authenticated/admin‑only.

---

## 6) Known Product Limitations (documented)

- Payment history is not exposed in the product UI (operator-visible only via admin API / DB query).
- Self-service cancel/refund remains support-mediated (no product UI button).
- STO admin UI/button for cancellation is deferred; use `sto-cancel.mjs` operator script.
- Non-atomic User + Card billing updates (crash between saves can leave inconsistency; reconciliation job planned, not yet implemented).
- Tranzila retry behavior (how many retries, intervals) is not confirmed; idempotency window and reconciliation timing are therefore not fully specified.

---

## 7) Upgrade Path (when Tranzila is fully integrated)

PaymentTransaction ledger (providerTxnId, idempotency via E11000 unique index, PayloadAllowlist) exists and is used by both `handleNotify` and `handleStoNotify`. The upgrade items still pending:

1. **Self-service portal** — if Tranzila offers any portal capabilities, link to it; otherwise support remains manual.
2. **Receipt / YeshInvoice** — explicitly deferred until STO notify real-provider E2E and production lifecycle policies are closed.
3. **STO failed-state retry/recovery** — no job or script yet for users with `tranzilaSto.status="failed"`.
4. **Non-atomic User + Card updates** — reconciliation job planned but not implemented.
5. Consider “extend from max(now, currentExpiresAt)” instead of resetting from now.

---

## 8) Definition of Done (Option A)

- UI “תשלומים” is honest: status + CTA + support note; no fake features.
- Payment initiation works in prod; in dev it’s dev‑safe (no crash).
- A runbook exists in repo docs (this file).
- Operators have a consistent audit trail (reason/ticket ID) for any manual billing changes.

---

## 9) STO Recurring Notify — Operator Reference

> **Status (2026-04-20):** Implemented (5.8a–5.8e). Production-domain edge smoke passed. Real provider-generated webhook E2E is still pending. Portal URL not yet registered in Tranzila My Billing.

### Endpoint

```
POST https://cardigo.co.il/api/payments/sto-notify?snk=<STO_NOTIFY_TOKEN>
```

The portal URL pattern (for reference only — never paste real token):

```
https://cardigo.co.il/api/payments/sto-notify?snk=<STO_NOTIFY_TOKEN>
```

### Token locations (never in code/docs/chat)

- `CARDIGO_STO_NOTIFY_TOKEN` — Netlify production env (validates `?snk=`)
- `CARDIGO_STO_NOTIFY_TOKEN` — Render backend env (route fail-closes 503 if missing)
- Tranzila My Billing portal — embedded as `?snk=` query param in Transaction Notification Endpoint field

### Failure classification table

| Status                         | Source       | Meaning                                                                                 |
| ------------------------------ | ------------ | --------------------------------------------------------------------------------------- |
| `403`                          | Netlify edge | Wrong or missing `?snk=` token                                                          |
| `500`                          | Netlify edge | Netlify env token missing / function error                                              |
| `503`                          | Backend      | Render `CARDIGO_STO_NOTIFY_TOKEN` env missing (fail-closed)                             |
| `502`                          | Netlify edge | Netlify cannot reach backend (Render down/cold start)                                   |
| `500`                          | Backend      | Infra / DB / handler throw                                                              |
| `200` + no transaction written | Backend      | `no_provider_txn_id` — payload missing `sto_external_id` / identifiers                  |
| `200` + `failed` transaction   | Backend      | `supplier_mismatch` — terminal ID does not match expected                               |
| `200` + `failed` transaction   | Backend      | `amount_mismatch` — notify amount ≠ `PRICES_AGOROT`; check sandbox/prod price alignment |
| `200` + `failed` transaction   | Backend      | `user_not_found` — STO external ID does not map to a known user                         |
| `200` + `failed` transaction   | Backend      | `sto_cancelled` — user’s STO status is cancelled in Cardigo                             |
| `200` + `paid` transaction     | Backend      | Renewal success — subscription extended                                                 |
| Duplicate replay               | Backend      | Idempotent success — no double extension (providerTxnId unique index)                   |

### Rollback / disable

- **Fastest rollback:** clear the “Transaction Notification Endpoint” field in Tranzila My Billing portal. Instant disable, no code or env change required.
- Do NOT rotate the token without simultaneously updating the portal URL. A mismatch will 403 all incoming notifies.
- Do NOT remove env tokens during an active test window unless intentionally forcing fail-closed.

### Price-change warning

STO schedule amounts are locked at creation time in the Tranzila system. If `PRICES_AGOROT` changes in `backend/src/config/plans.js` while active STO schedules still charge the old amount, every recurring notify will fail with `amount_mismatch`. Before changing prices:

1. Cancel all active STO schedules at the old price.
2. Update `PRICES_AGOROT` in production.
3. Recreate STO schedules at the new price on next user payment.
