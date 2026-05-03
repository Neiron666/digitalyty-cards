# Cardigo Billing Support Runbook

**Scope (current reality):**

- **Cancel-renewal** is available self-service in the product UI (SettingsPanel → billing section) via `POST /api/account/cancel-renewal` (shipped 5.9a.1/5.9a.2).
- **Resume auto-renewal** is available self-service in the product UI (SettingsPanel → billing section) via `POST /api/account/resume-auto-renewal` (sandbox-proven 2026-05-02). Requires `tranzilaSto.status === "cancelled"` and a valid stored Tranzila token. Token-absent/expired state is support-mediated. See `billing-flow-ssot.md §19`.
- **Delete saved payment method** is available self-service in the product UI (SettingsPanel → billing section → ניהול פרטי תשלום שמורים) via `POST /api/account/delete-payment-method` (manually smoke-verified 2026-05-02). Allowed only when auto-renewal is not active/pending. See `billing-flow-ssot.md §20`.
- Self‑service also includes:
    1. **Read‑only** subscription status in **Settings → תשלומים**
    2. **Initiate payment** via `POST /api/payments/create` (in dev: mock URL; in prod: Tranzila URL)
- **Refunds remain support / admin mediated.**
- **Replacing or updating to a different payment card is NOT yet self-service** and remains a future/support-mediated contour. See §4.3.

**Why:** Tranzila (single‑payment) has no Stripe‑like customer portal. Refunds and card replacement are not exposed in the product UI.
Self-service cancel-renewal and delete-payment-method are implemented separately and do not require a Tranzila portal.

---

## 1) Customer‑Facing UX Copy (Hebrew)

Use these texts in the **Settings → תשלומים** block.

### Self-service cancel-renewal UX (SettingsPanel, shipped 5.9a.2)

- **Button (shown when auto-renewal is active):** ביטול חידוש אוטומטי
- **Modal explains:**
    - הגישה Premium תמשיך עד סוף התקופה המשולמת (לא יבוטל המִשְׁתַּמֵּשׁ מידית)
    - לא יחוייבו תשלומים נוספים לאחר הביטול
    - ניתן לחדש את החידוש האוטומטי בעתיד דרך הגדרות → תשלומים (כל עוד המנוי פעיל ולא פג תוקף)
- **Cancelled state shown in UI:** החידוש האוטומטי בוטל. הגישה Premium פעילה עד {date}.

### Self-service delete saved payment method UX (SettingsPanel, smoke-verified 2026-05-02)

- **Collapsible section label (visible when a saved token exists):** ניהול פרטי תשלום שמורים
- **Static explanation inside collapsible:** המנוי יישאר פעיל עד תאריך הסיום. לאחר מחיקת פרטי התשלום לא ניתן יהיה לחדש את המנוי אוטומטית.
- **Blocked-state note (shown when STO is active/pending):** החידוש האוטומטי פעיל — יש לבטל אותו תחילה לפני מחיקת פרטי התשלום.
- **Button:** מחק פרטי תשלום (disabled while STO is active/pending)
- **Modal title:** מחיקת פרטי תשלום שמורים
- **Modal body explains:**
    - מחיקה זו לא מבטלת את המנוי הנוכחי.
    - הגישה Premium תישאר פעילה עד תאריך הסיום.
    - לאחר המחיקה לא ניתן יהיה לחדש אוטומטית את המנוי.
    - בתום התקופה יהיה צורך לבצע רכישה חדשה.
    - לא יתבצע חיוב כעת ולא תישלח קבלה.
- **Confirm button in modal:** מחק פרטי תשלום
- **Success message shown after delete:** פרטי התשלום נמחקו. לחידוש המנוי בעתיד יהיה צורך להזין פרטי תשלום מחדש.

### Static support + limitations

- **שינוי/החלפת אמצעי תשלום (Replace card)**: לא זמין כעת בממשק העצמי. פנה לתמיכה: **support@cardigo.co.il**
- **מחיקת אמצעי תשלום שמור (Delete stored token)**: זמין עצמאית בהגדרות → תשלומים כאשר החידוש האוטומטי אינו פעיל.
- **היסטוריית תשלומים** זמינה בממשק המוצר: הגדרות → תשלומים → "קבלות" (עד 12 קבלות אחרונות, MVP).
- **החזרים כספיים** אינם מתבצעים אוטומטית. במידת הצורך - דרך התמיכה בלבד.

### Dev / not‑connected payment provider message (already implemented as dev‑safe fallback)

- תשלום לא זמין בסביבת פיתוח.

### Optional short disclaimer (if you want one line only)

- להחלפת/החזר אמצעי תשלום - תמיכה בלבד. מחיקת אמצעי תשלום שמור זמינה עצמאית.

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
> - **Admin revoke endpoint (`POST /api/admin/billing/users/:userId/subscription/revoke`) handles STO cancellation automatically as a hard precondition.** It calls `cancelTranzilaStoForUser` internally before any local write. If STO cancellation fails, the endpoint returns 409 `STO_CANCEL_REQUIRED` — operator must use `sto-cancel.mjs` script or Tranzila portal to resolve the STO before retrying the revoke. If STO is already cancelled or absent, revoke proceeds immediately.
> - After a successful admin revoke, the local stored payment token (`tranzilaToken` and `tranzilaTokenMeta`) is automatically cleared. The user cannot resume auto-renewal using the old token after a platform revoke. No payment, receipt, refund, YeshInvoice document, or email is created by admin revoke.
> - **First, check `tranzilaSto.status` (applies when using manual/legacy admin billing-set endpoint, not the revoke endpoint):**
>     - If `"cancelled"` — the user has already self-service-cancelled via the product UI. Provider-side cancellation is already done. Do NOT cancel at the provider again.
>     - If `"created"` AND a `stoId` is present — an active STO is registered at Tranzila. Downgrading Cardigo alone will NOT stop the recurring charge.
>     - If `"pending"` or `"failed"` — do NOT assume there is no provider-side STO. Inspect Tranzila portal / logs before downgrade.
>     - If `null` / no `stoId` — no active STO is known in Cardigo. Standard downgrade steps may proceed.
> - **User self-service cancel path (product UI):** `POST /api/account/cancel-renewal` calls `cancelTranzilaStoForUser`, which cancels provider-side before writing `tranzilaSto.status = "cancelled"` in Mongo.
> - **Operator manual / fallback cancel path:** Use `sto-cancel.mjs` script or Tranzila portal to deactivate provider-side STO when the revoke endpoint returns `STO_CANCEL_REQUIRED` or when using manual billing-set operations. Document the action: ticket ID, operator, date/time.
> - Never mark `tranzilaSto.status = "cancelled"` in Mongo before provider-side cancellation is confirmed.
> - Never use ad-hoc DB mutation as the normal cancellation flow.
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

**Important distinction:** Cardigo stores a Tranzila provider-issued token (not raw PAN/CVV/card numbers). Two separate concepts apply:

**Delete stored token (self-service):** The user can delete the locally stored Tranzila token via Settings → תשלומים → **ניהול פרטי תשלום שמורים** → **מחק פרטי תשלום**, provided auto-renewal is not active/pending. Deleting the token does NOT cancel the current Premium subscription or create a charge. After deletion, auto-renewal and resume become unavailable.

**Replace/update to a different card (NOT self-service):** There is no current self-service path for an active-premium user to replace the stored token with a new card. Active-premium checkout bypass is not supported. The correct support response: "Replacing your payment card while your subscription is active is not yet available as a self-service option. Please contact us at support@cardigo.co.il. After your current subscription expires, you can subscribe again with a new card via the normal checkout."

If the user is mid-cycle and wants future renewals with the existing token: self-service resume auto-renewal is available (via **חדש חידוש אוטומטי** button in Settings → תשלומים) provided the subscription is still active and the stored Tranzila token has not been deleted and has not expired. If the token is expired, missing, or was deleted, this is a support-mediated path requiring the user to subscribe again after expiry.

---

## 5) Security & Compliance Notes

- **PCI scope:** Cardigo does not store raw card numbers, CVV, or full PAN. Cardigo stores a Tranzila provider-issued token used for recurring STO scheduling and resume-auto-renewal. This token can be deleted by the user via self-service (see §1). Deletion removes it from Cardigo's database only; provider-side token invalidation is not implemented.
- Keep logs free of PII beyond what is necessary (email may be required, but do not log passwords/tokens).
- Maintain anti‑enumeration in public surfaces; support actions are authenticated/admin‑only.

---

## 6) Known Product Limitations (documented)

- **Receipt history (היסטוריית תשלומים) is now available in the product UI** (Settings → Section 3: תשלומים → "קבלות" accordion, shipped 2026-04-24). MVP scope: up to 12 latest receipts with PDF download via secure backend proxy route. `failed`/`skipped` receipts are not user-facing in MVP. Evidence: `docs/handoffs/current/Cardigo_Enterprise_Handoff_ReceiptCabinet_Frontend_2026-04-24.md`.
- **Self-service cancel-renewal is available in the product UI** (SettingsPanel billing section, shipped 5.9a.2). User path: product UI button → `POST /api/account/cancel-renewal` → provider-first cancel via `cancelTranzilaStoForUser`.
- **Self-service resume auto-renewal is available in the product UI** (SettingsPanel billing section, sandbox-proven 2026-05-02). User path: **חדש חידוש אוטומטי** button (shown only when `autoRenewal.status === "cancelled"` AND subscription still active AND `expiresAt` not yet passed AND provider is Tranzila AND plan is monthly/yearly) → `POST /api/account/resume-auto-renewal` → `createTranzilaStoForUser` with `allowRecreateAfterCancel:true`. Requires a valid stored Tranzila token. Token-absent/expired state is support-mediated. See `billing-flow-ssot.md §19`.
- **Self-service delete saved payment method is implemented** (smoke-verified 2026-05-02). Allowed when auto-renewal is not active/pending. See `billing-flow-ssot.md §20` and §1 of this runbook.
- Self-service **refunds** remain support-mediated.
- **Payment-method replacement/update (replacing the stored card with a different card)** is NOT implemented and remains a deferred contour. Not a self-service path.
- `sto-cancel.mjs` remains the **operator/admin** script path. It is not the user path.
- Non-atomic User + Card billing updates (crash between saves can leave inconsistency; reconciliation job planned, not yet implemented).
- Tranzila retry behavior (how many retries, intervals) is not confirmed; idempotency window and reconciliation timing are therefore not fully specified.

---

## 7) Upgrade Path (when Tranzila is fully integrated)

PaymentTransaction ledger (providerTxnId, idempotency via E11000 unique index, PayloadAllowlist) exists and is used by both `handleNotify` and `handleStoNotify`. The upgrade items still pending:

1. ~~**Self-service portal**~~ — **RESOLVED (5.9a.1/5.9a.2 + 2026-05-02):** User self-service cancel-renewal shipped. Resume auto-renewal sandbox-proven. Delete saved payment method smoke-verified. Payment-method replacement (updating to a new card) and refunds remain support-mediated.
2. ~~**Receipt / YeshInvoice**~~ — **IMPLEMENTED AND SANDBOX-PROVEN (2026-04-24).** `yeshinvoice.service.js`, `Receipt.model.js`, and fire-and-forget hooks in `tranzila.provider.js` are live in the codebase. Sandbox receipt creation, share/email, and `Receipt.shareStatus` update all proved. `YESH_INVOICE_ENABLED=true` is active in the local sandbox env. Production Render deployment requires G6 (production terminal cutover) and G7 (production recurring lifecycle proof) before `YESH_INVOICE_ENABLED=true` is set there. See `billing-flow-ssot.md §9` and `§16`.
3. ~~**STO failed-state retry/recovery**~~ — **RESOLVED (5.12.H).** `backend/scripts/sto-retry-failed.mjs` exists — dry-run default, single-target (`--email`/`--user-id`), production-terminal block (`/^fxp/i` requires `--allow-prod`).
4. **Non-atomic User + Card updates** — reconciliation job planned but not implemented.
5. ~~Consider "extend from max(now, currentExpiresAt)" instead of resetting from now.~~ — **IMPLEMENTED** in `tranzila.provider.js`. Proven in contour 5.8f.9: subscription extended exactly +30 days from previous `paidUntil` (`2026-05-20T16:05:50.657Z` → `2026-06-19T16:05:50.657Z`), not from webhook arrival date.

---

## 8) Definition of Done (Option A)

- UI “תשלומים” is honest: status + CTA + support note; no fake features.
- Payment initiation works in prod; in dev it’s dev‑safe (no crash).
- A runbook exists in repo docs (this file).
- Operators have a consistent audit trail (reason/ticket ID) for any manual billing changes.

---

## 9) STO Recurring Notify — Operator Reference

> **Status (2026-04-22 — UPDATED):** **Fully proven E2E.** Real Tranzila My Billing webhook received and fully verified (contour 5.8f.9, classification: `REAL_TRANZILA_STO_NOTIFY_E2E_SUCCESS_FULLY_VERIFIED`).
>
> **Proven E2E chain (2026-04-22, `valik@cardigo.co.il`, sandbox terminal `testcardstok`):**
>
> 1. Tranzila My Billing recurring charge fired automatically.
> 2. Netlify `payment-sto-notify` received `POST` (`upstreamStatus=200 upstreamOk=true`).
> 3. Render `/api/payments/sto-notify` received and validated request.
> 4. `handleStoNotify` returned `{ ok: true, duplicate: false, plan: "monthly", providerTxnIdPresent: true, userIdPresent: true, cardIdPresent: true }`.
> 5. `PaymentTransaction` created: `status="paid"`, `amountAgorot=500`, `currency="ILS"`, `idempotencyNote="sto_recurring_notify"`.
> 6. User `subscription.expiresAt` extended from `2026-05-20T16:05:50.657Z` to `2026-06-19T16:05:50.657Z` (exact +30 days from prior `paidUntil`, **not** from webhook arrival date — `max(now, currentExpiry)` behavior confirmed).
> 7. `card.billing.paidUntil` extended to `2026-06-19T16:05:50.657Z` (matches user `subscription.expiresAt`).
>
> **Ledger baseline after E2E:** `sto_recurring_notify_count=6`, `sto_prefix_txn_count=6`.
>
> **Safe observability logs** deployed (5.8f.LOG.1): Netlify edge and Render `/sto-notify` route. Logs are production-safe (no raw ids/tokens/payload values).
>
> **Operator notes:**
>
> - `valik@cardigo.co.il` and `neiron.player@gmail.com` are test artifacts. Test STOs/users will be cancelled/cleaned up in a dedicated contour.
> - `neiron` UI-edit experiment charged ₪5 but no webhook was observed (portal notify URL was not registered at time of that charge). Test artifact only.
> - Do not delete `PaymentTransaction` ledger records — they are an audit trail (manual smoke + real E2E webhook).
> - Cancel/deactivate test STOs provider-side when sandbox testing is complete. Do not change `PRICES_AGOROT` while active sandbox STOs exist (`amount_mismatch` on every subsequent notify).
> - `CARDIGO_STO_NOTIFY_TOKEN` must remain secret. Token rotation requires coordinated update of: (1) Render env, (2) Netlify env, (3) Tranzila portal Transaction Notification Endpoint URL — all three before the old token stops being valid.
> - `TRANZILA_STO_NOTIFY_URL` in `.env` is operator/reference only (value `_TODO_` intentional); the actual portal URL contains the live token and must never be stored in docs or source.

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
