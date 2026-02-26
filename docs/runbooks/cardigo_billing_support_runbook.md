# Cardigo Billing Support Runbook (Option A — Support‑Mediated)

**Scope (current reality):**
- No self‑service “manage payment method / cancel subscription / refund” in the product UI.
- Self‑service is limited to:
  1) **Read‑only** subscription status in **Settings → תשלומים**
  2) **Initiate payment** via `POST /api/payments/create` (in dev: mock URL; in prod: Tranzila URL)
- Any cancel/refund/payment‑method change is handled by **Support / Admin**.

**Why:** Tranzila (single‑payment) has no Stripe‑like customer portal, and the system currently has **no persistent transaction ledger** (no Payment/Invoice model).  
This is intentional to avoid fake UX and security/finance drift.

---

## 1) Customer‑Facing UX Copy (Hebrew)

Use these texts in the **Settings → תשלומים** block.

### Static support + limitations
- **ביטול או שינוי אמצעי תשלום**: פנה לתמיכה: **support@cardigo.co.il**
- **היסטוריית תשלומים** אינה זמינה כעת.
- **החזרים כספיים** אינם מתבצעים אוטומטית. במידת הצורך — דרך התמיכה בלבד.

### Dev / not‑connected payment provider message (already implemented as dev‑safe fallback)
- תשלום לא זמין בסביבת פיתוח.

### Optional short disclaimer (if you want one line only)
- לשינוי אמצעי תשלום/ביטול/החזר — תמיכה בלבד.

---

## 2) Support Intake Checklist (what to ask)

Before any billing action:
1) **Account identity**: request must come from the account email, or the user must prove control.
2) **Requested action**: cancel / refund request / payment issue / change plan.
3) **Context**:
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
Given Tranzila single‑payment:
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

- No payment history / invoices in product (no ledger model).
- `/api/payments/notify` replay/idempotency is limited (no transaction ID stored).  
  This is acceptable for dev / early stage but must be hardened before full production billing.

---

## 7) Upgrade Path (when Tranzila is fully integrated)

When you connect Tranzila for real:
1) Add a **PaymentEvent / Transaction** collection (append‑only ledger):
   - provider, transactionId, amount, currency, plan, userId/cardId, createdAt, raw payload hash
2) Implement **idempotency key** for notify:
   - ignore duplicates by providerTxnId
3) Consider “extend from max(now, currentExpiresAt)” instead of resetting from now.
4) Revisit support vs self‑service:
   - If Tranzila offers any portal capabilities, link to it.
   - Otherwise self‑service remains limited; keep the runbook.

---

## 8) Definition of Done (Option A)

- UI “תשלומים” is honest: status + CTA + support note; no fake features.
- Payment initiation works in prod; in dev it’s dev‑safe (no crash).
- A runbook exists in repo docs (this file).
- Operators have a consistent audit trail (reason/ticket ID) for any manual billing changes.
