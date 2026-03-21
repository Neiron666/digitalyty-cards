# Billing Flow SSoT — Event Sequence, Policy & Gate Model

**Scope:** Canonical reference for the Cardigo billing lifecycle (registration → payment → premium → receipt → email → cabinet).
This document is the single source of truth for all billing architecture decisions. When code or other docs conflict with this file, this file wins (Tier 2 per copilot-instructions.md).

**Status:** Active — Enterprise Plan v4.

---

## 1) Pricing SSoT

All internal amounts are **integers in agorot** (1/100 of ₪). No floats anywhere in the system.

| Plan key  | Agorot | Display (₪) |
| --------- | ------ | ----------- |
| `monthly` | 3990   | ₪39.90      |
| `yearly`  | 39990  | ₪399.90     |

**Canonical location:** `backend/src/config/plans.js` → `PRICES` export.

**Conversion rules:**

- Backend stores and compares agorot (integer).
- Tranzila redirect `sum` = agorot / 100 (shekel, decimal — Tranzila's contract).
- Frontend display = agorot / 100, formatted with `toFixed(2)`.
- Receipt (YeshInvoice) amount = agorot / 100 (shekel, per their API).

**Stale price locations (must be removed/aligned):**

- `backend/src/services/payment/tranzila.provider.js` — local `PRICES` (29.9 / 299).
- `backend/src/controllers/payment.controller.js` — dead code, local `PRICES` (29.9 / 200).
- `frontend/src/components/pricing/PricingPlans.jsx` — hardcoded ₪29.99 / ₪299.

---

## 2) Feature Matrix SSoT

**Canonical location:** `backend/src/config/plans.js` → `PLANS` export.

### Gated features (must-ship with payments)

| Feature key    | Free           | Monthly        | Yearly         | Org            |
| -------------- | -------------- | -------------- | -------------- | -------------- |
| `publish`      | ✗              | ✓              | ✓              | ✓              |
| `seo`          | ✗              | ✓              | ✓              | ✓              |
| `analytics`    | ✗              | ✓              | ✓              | ✓              |
| `slugChange`   | ✗              | ✓              | ✓              | ✓              |
| `leadForm`     | ✗              | ✓              | ✓              | ✓              |
| `video`        | ✗              | ✓              | ✓              | ✓              |
| `reviews`      | ✗              | ✓              | ✓              | ✓              |
| `templates`    | `[1]`          | `"all"`        | `"all"`        | `"all"`        |
| `galleryLimit` | 5              | 10             | 10             | 50             |
| `aiGeneration` | 10/mo (shared) | 30/mo (shared) | 30/mo (shared) | 30/mo (shared) |

> **AI quota note:** `aiGeneration` is a **shared monthly budget** across all AI surfaces (About, FAQ, SEO). The numbers above are the total per-user monthly limit, not per-surface. Enforcement: `backend/src/controllers/ai.controller.js` → `readTotalMonthlyUsage`. See `docs/ai-about-workstream.md` §5.1 for details.

**Enforcement policy:** `publish`, `seo`, `analytics`, `slugChange` MUST be backend-enforced in the respective controller actions (card.controller.js publish/SEO/slug endpoints). UI crowns are informational only — they do not replace backend gates.

**Feature check function:** `backend/src/utils/planAccess.js` → `hasAccess(plan, feature)`.

---

## 3) Event Sequence

```
User clicks "Upgrade"
  │
  ▼
① POST /api/payments/create { plan }          ← requireAuth
  │  Backend returns { paymentUrl }
  ▼
② Browser redirects to Tranzila hosted checkout
  │
  ├─ ③a User completes payment → Tranzila redirects to success_url (UX only)
  └─ ③b User abandons/fails   → Tranzila redirects to fail_url   (UX only)
  │
  ▼ (independent, server-to-server)
④ Tranzila POST to notify URL (form-urlencoded)
  │
  ▼
⑤ Netlify function: payment-notify.js
  │  - Validates ?nt= token
  │  - Parses form-urlencoded OR json body
  │  - Normalizes to JSON
  │  - Forwards JSON to backend with proxy secret
  ▼
⑥ Backend POST /api/payments/notify
  │  a. Verify Tranzila signature
  │  b. Check Response === "000" (success)
  │  c. Derive providerTxnId (see §7)
  │  d. Persist PaymentTransaction to ledger
  │     - If duplicate (E11000) → return 200 (idempotent)
  │  e. Update User.subscription + Card.billing
  │  f. Best-effort: create receipt (YeshInvoice) + send email (Mailjet)
  │     - Receipt/email failure does NOT cause 5xx
  ▼
⑦ Return 200 "OK" (generic body)
```

**Critical invariant:** Notify (④→⑦) is the **sole source of truth** for payment confirmation. Success/fail redirect URLs (③) are UX-only and must never trigger entitlement changes.

---

## 4) ACK Policy

| Condition                             | HTTP status | Body      | Rationale                                    |
| ------------------------------------- | ----------- | --------- | -------------------------------------------- |
| Ledger persisted (new transaction)    | 200         | `"OK"`    | Payment processed                            |
| Duplicate providerTxnId recognized    | 200         | `"OK"`    | Idempotent replay                            |
| Response ≠ "000" (failed payment)     | 200         | `"OK"`    | Acknowledged, no action                      |
| Invalid signature                     | 200         | `"OK"`    | Anti-oracle: do not leak verification result |
| Infra failure (DB/ledger unreachable) | 500         | `"ERROR"` | Provider will retry                          |

**Rules:**

- 200 is returned ONLY after the ledger write succeeds OR a duplicate is recognized.
- 5xx is returned ONLY on infrastructure failure (DB down, unrecoverable exception) so the payment provider retries.
- Body is ALWAYS a generic string (`"OK"` or `"ERROR"`). Never include user/card/payment details (anti-oracle).
- Never return 400/404/422 — these would stop provider retries and leak information.

---

## 5) Gate Model for Notify

### Problem

Tranzila sends server-to-server POST. The Netlify proxy gate (proxy.js) requires a `__Host-cardigo_gate` cookie. Tranzila has no cookie → request is blocked.

### Solution: Dedicated Netlify Function

**File:** `frontend/netlify/functions/payment-notify.js`

**`_redirects` rule** (must appear BEFORE the generic `/api/*` rule):

```
/api/payments/notify  /.netlify/functions/payment-notify  200
```

**Security layers (defense-in-depth):**

| Layer                  | Where                | Check                                                                                                                                                                                         |
| ---------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. `nt` query token    | Netlify function     | `?nt=` must match `CARDIGO_NOTIFY_TOKEN` env var. Mismatch → 403.                                                                                                                             |
| 2. Notify token header | Netlify → Backend    | Function forwards `x-cardigo-notify-token` header. Backend verifies it against `CARDIGO_NOTIFY_TOKEN` — **MUST if set; skip if unset** (same pattern as proxy-secret middleware in `app.js`). |
| 3. Proxy secret header | Backend origin lock  | Function forwards `x-cardigo-proxy-secret`. Backend rejects if missing/wrong (existing middleware).                                                                                           |
| 4. Tranzila signature  | Backend handleNotify | HMAC verification of payload fields against `TRANZILA_SECRET`.                                                                                                                                |

**Function behavior:**

- Accepts `POST` only (405 otherwise).
- Body parsing — best-effort cascade (follows `auth.js` pattern, never checks `Content-Type` header):
    1. Try parse as JSON.
    2. If not valid JSON → try parse as `x-www-form-urlencoded`.
    3. If both fail → read as text, attempt parse again; if still unparseable → forward `{ rawBody: "<text>", parseError: true }` and let backend ACK per policy.
- Forwards normalized JSON body to `BACKEND_ORIGIN/api/payments/notify` with `x-cardigo-proxy-secret` and `x-cardigo-notify-token` headers.
- Returns upstream status code, but body is always generic: `"OK"` for 2xx, `"ERROR"` otherwise. Never pass upstream body verbatim (anti-leak at edge boundary).

**No global express.urlencoded():** The Netlify function handles form-urlencoded parsing. Backend continues to use only `express.json()`. This isolates the parsing concern and avoids side effects on other routes.

---

## 6) Idempotency Strategy

### Ledger model

**New model:** `backend/src/models/PaymentTransaction.model.js` (append-only).

Key fields:

- `providerTxnId` (String, unique index) — the idempotency key.
- `provider` (String: `"tranzila"` | `"mock"`).
- `userId` (ObjectId, ref User).
- `cardId` (ObjectId, ref Card, nullable).
- `plan` (String: `"monthly"` | `"yearly"`).
- `amountAgorot` (Number, integer).
- `payloadAllowlisted` (Object) — allowlisted subset of notify payload (no sensitive fields).
- `rawPayloadHash` (String) — `sha256` of the full raw payload for audit/forensics.
- `status` (String: `"pending"` | `"paid"` | `"failed"` | `"refunded"`). Note: `"duplicate"` is NOT a status (see idempotencyNote).
- `idempotencyNote` (String, nullable) — set to `"duplicate_skipped"` when E11000 is caught on insert.
- `receiptId` (ObjectId, ref Receipt, nullable) — link to Receipt document.
- `createdAt`, `updatedAt` (timestamps).

**Receipt is a separate model (planned).** `providerDocId`, `pdfPath`, `receiptStatus`, `emailSentAt` live in Receipt, not in PaymentTransaction. Ledger (PaymentTransaction) is not exposed to the cabinet directly.

### providerTxnId derivation

Strategy: **discover-then-derive**.

1. Check Tranzila payload for a provider-assigned transaction identifier (e.g., `index`, `authnr`, `ConfirmationCode`). Use the first non-empty value.
2. If none found (edge case): compute `sha256(normalized_payload_string)` as fallback.
3. Prefix with provider name: `tranzila:<value>` / `mock:<value>`.

### Duplicate handling

- Attempt `PaymentTransaction.create(...)`.
- If MongoDB E11000 on `providerTxnId` → set `idempotencyNote: "duplicate_skipped"` in log, return 200 `"OK"`.
- No state mutation on duplicate. No User/Card updates repeated.

---

## 7) Billing Resolution Chain (existing — documented for reference)

Precedence (highest → lowest):

1. `card.adminOverride` (temporary support override, time-bounded)
2. `card.billing` (real payment, time-bounded by `paidUntil`)
3. Trial (anonymous cards only; user-owned cards are always entitled to write)
4. Legacy `card.plan` field (migration fallback)
5. None → free

**SSoT files:**

- Resolution: `backend/src/utils/trial.js` → `resolveBilling()`
- Tier: `backend/src/utils/tier.js` → `resolveEffectiveTier()`
- Entitlements: `backend/src/utils/cardDTO.js` → `computeEntitlements()`

**Important policy:** `isEntitled()` returns `true` for all registered user-owned cards (trial.js L75). This grants write access. Feature gates (publish/seo/analytics/slugChange) are a SEPARATE concern from write-access entitlement. Feature gates use `hasAccess(plan, feature)` against the effective billing plan.

---

## 8) Subscription Lifecycle Fields (planned additions)

### User.subscription (existing + new)

| Field              | Type        | Status   | Purpose                          |
| ------------------ | ----------- | -------- | -------------------------------- |
| `status`           | String enum | existing | inactive/active/expired          |
| `expiresAt`        | Date        | existing | Current period end               |
| `provider`         | String      | existing | "mock"/"tranzila"                |
| `autoRenew`        | Boolean     | **new**  | Whether subscription auto-renews |
| `currentPeriodEnd` | Date        | **new**  | Explicit renewal boundary        |

### Reconciliation (planned)

Two planned reconciliation jobs:

1. **Subscription expiry:** checks subscriptions where `expiresAt < now` and `status === "active"` → sets `status: "expired"`, downgrades User.plan and Card.billing. Interval configurable via `SUBSCRIPTION_RECONCILIATION_INTERVAL_MS` env var (planned, default: 3600000).
2. **Receipt retry:** retries failed receipt creation (Receipt.receiptStatus === "failed"). Interval configurable via `RECEIPT_RECONCILIATION_INTERVAL_MS` env var (planned, default: 3600000).

---

## 9) Receipt & Email (planned)

### Receipt provider

**YeshInvoice** (REST API). Environment-driven:

- `YESH_INVOICE_API_URL` — sandbox vs production endpoint.
- `YESH_INVOICE_API_TOKEN` — API authentication.

Receipt creation is **best-effort**: failure does not block the 200 ACK to Tranzila. On failure, `Receipt.receiptStatus` is set to `"failed"` for later reconciliation/retry (see §8).

### Email

**Mailjet** plaintext receipt notification via existing `mailjet.service.js` pattern.

- New env vars: `MAILJET_RECEIPT_SUBJECT`, `MAILJET_RECEIPT_TEXT_PREFIX`.
- Fire-and-forget (best-effort). Failure logged but does not affect billing state.

### Frontend (cabinet)

Receipts list replaces the placeholder text "היסטוריית תשלומים אינה זמינה כעת" in `SettingsPanel.jsx` billing section.

**Cabinet endpoints (canonical):**

- `GET /api/account/receipts` (requireAuth) — returns list of Receipt documents for the authenticated user.
- `GET /api/account/receipts/:id/download` (requireAuth + ownership + 404 anti-enum) — signed URL / redirect to receipt PDF.

Ledger (PaymentTransaction) is not exposed to the cabinet directly. Cabinet reads Receipt model only.

---

## 10) Index Governance

- `autoIndex: false`, `autoCreate: false` (`backend/src/config/db.js`).
- New unique index required: `PaymentTransaction.providerTxnId`.
- Index creation via manual migration script following existing pattern:
    1. Dry-run: script reports what would be created.
    2. Apply: script creates the index, logs result.
    3. Drift detection: sanity script checks expected vs actual indexes.
- No auto-apply. No runtime index creation.

---

## 11) Env Vars Inventory

### Backend (Render) — existing (billing-relevant subset)

| Var                           | File                          | Purpose                            |
| ----------------------------- | ----------------------------- | ---------------------------------- |
| `PAYMENT_PROVIDER`            | `services/payment/index.js`   | `"tranzila"` or mock (default)     |
| `TRANZILA_TERMINAL`           | `config/tranzila.js`          | Terminal ID                        |
| `TRANZILA_SECRET`             | `config/tranzila.js`          | HMAC signature secret              |
| `TRANZILA_NOTIFY_URL`         | `config/tranzila.js`          | Server-to-server notify URL        |
| `TRANZILA_SUCCESS_URL`        | `config/tranzila.js`          | User redirect on success (UX only) |
| `TRANZILA_FAIL_URL`           | `config/tranzila.js`          | User redirect on failure (UX only) |
| `CARDIGO_PROXY_SHARED_SECRET` | `app.js`                      | Origin lock (proxy → backend)      |
| `MAILJET_API_KEY`             | `services/mailjet.service.js` | Email API                          |
| `MAILJET_API_SECRET`          | `services/mailjet.service.js` | Email API                          |
| `MAILJET_FROM_EMAIL`          | `services/mailjet.service.js` | Sender                             |
| `MAILJET_FROM_NAME`           | `services/mailjet.service.js` | Sender name                        |
| `SITE_URL`                    | `utils/siteUrl.util.js`       | Canonical domain                   |

### Backend (Render) — new

| Var                                       | Purpose                                                      |
| ----------------------------------------- | ------------------------------------------------------------ |
| `CARDIGO_NOTIFY_TOKEN`                    | Verify `?nt=` token from Netlify function (defense-in-depth) |
| `YESH_INVOICE_API_URL`                    | YeshInvoice endpoint (sandbox / production)                  |
| `YESH_INVOICE_API_TOKEN`                  | YeshInvoice API authentication                               |
| `MAILJET_RECEIPT_SUBJECT`                 | Receipt email subject line                                   |
| `MAILJET_RECEIPT_TEXT_PREFIX`             | Receipt email body prefix                                    |
| `RECEIPT_RECONCILIATION_INTERVAL_MS`      | Receipt retry job interval (planned, default 3600000)        |
| `SUBSCRIPTION_RECONCILIATION_INTERVAL_MS` | Subscription expiry job interval (planned, default 3600000)  |

### Netlify — existing (billing-relevant subset)

| Var                           | Purpose                                          |
| ----------------------------- | ------------------------------------------------ |
| `CARDIGO_GATE_COOKIE_VALUE`   | Gate cookie (proxy.js)                           |
| `CARDIGO_PROXY_SHARED_SECRET` | Forwarded to backend by proxy and payment-notify |

### Netlify — new

| Var                    | Purpose                                 |
| ---------------------- | --------------------------------------- |
| `CARDIGO_NOTIFY_TOKEN` | `?nt=` token check in payment-notify.js |

---

## 12) Known Issues (documented, not solved in this epic)

1. **Gallery limit conflict:** `cardDTO.js` uses flat `GALLERY_LIMIT = 12` from `config/galleryLimit.js`, ignoring per-plan values in `plans.js` (free=5, monthly=10, yearly=10, org=50). Resolution deferred. The flat 12 remains effective until explicitly aligned.

2. **Dead code in payment.controller.js:** Contains stale `PRICES` and functions never called by routes (routes use the provider factory). Must be deleted when billing code is updated.

3. **Mock provider security:** `mock.provider.js` handleNotify accepts any `{userId, plan}` with no verification. Safe only when `PAYMENT_PROVIDER` ≠ `"tranzila"` and the notify endpoint is not publicly reachable. In production: `PAYMENT_PROVIDER=tranzila` is mandatory.

4. **Non-atomic User + Card updates:** Both tranzila.provider.js and mock.provider.js do `User.save()` then 2× `Card.updateOne()`. A crash between saves can leave User and Card billing out of sync. Mitigation: reconciliation job (§8) + admin tools. Full transactional writes deferred.

---

## Open Questions

1. **Tranzila providerTxnId field:** Which field in the Tranzila notify payload is the canonical unique transaction identifier? Candidates: `index`, `authnr`, `ConfirmationCode`. Must be confirmed against real Tranzila sandbox payload.

2. **Tranzila notify Content-Type:** Does Tranzila send `application/x-www-form-urlencoded` exclusively, or can it send JSON? The Netlify function handles both, but the primary path must be confirmed.

3. **Tranzila retry behavior:** How many times and at what intervals does Tranzila retry on 5xx? This affects idempotency window and reconciliation timing.

4. **YeshInvoice API specifics:** Exact endpoint paths, required fields, response shape, and sandbox credentials. Must be confirmed before receipt integration task.

5. **YeshInvoice document type:** Receipt (קבלה) vs. invoice (חשבונית מס / קבלה). Israeli tax law requirements for digital service subscriptions must be confirmed.

6. **Tranzila `TRANZILA_NOTIFY_URL` value:** Must be updated to `https://cardigo.co.il/api/payments/notify?nt=<token>` (routed through the dedicated Netlify function). Current value in env is unknown.

---

## 13) Go-Live Runbook

Before switching `PAYMENT_PROVIDER=tranzila` in production, complete the operational checklist:

→ [Tranzila Go-Live Checklist](./tranzila-go-live-checklist.md)
