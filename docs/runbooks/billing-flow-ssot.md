# Billing Flow SSoT - Event Sequence, Policy & Gate Model

**Scope:** Canonical reference for the Cardigo billing lifecycle (registration → payment → premium → receipt → email → cabinet).
This document is the single source of truth for all billing architecture decisions. When code or other docs conflict with this file, this file wins (Tier 2 per copilot-instructions.md).

**Status:** Active - Enterprise Plan v4.

---

## 1) Pricing SSoT

All internal amounts are **integers in agorot** (1/100 of ₪). No floats anywhere in the system.

| Plan key  | Agorot | Display (₪) |
| --------- | ------ | ----------- |
| `monthly` | 3990   | ₪39.90      |
| `yearly`  | 39990  | ₪399.90     |

**Canonical location:** `backend/src/config/plans.js` → `PRICES_AGOROT` export.

> **⚠️ Sandbox/test price notice:** `PRICES_AGOROT` currently contains temporary sandbox values (`monthly: 500, yearly: 500` — ₪5.00 each) for STO testing. Production canonical values (`monthly: 3990, yearly: 39990`) are commented out in `plans.js`. **Before connecting production-priced STO schedules or switching to the production terminal, restore production prices and review all active STO schedules.** STO schedules lock the charge amount at creation time — if `PRICES_AGOROT` changes while active STO schedules still charge the old amount, every recurring notify will fail with `amount_mismatch`. Existing active schedules must be cancelled and recreated at the new price.

**Conversion rules:**

- Backend stores and compares agorot (integer).
- Tranzila redirect `sum` = agorot / 100 (shekel, decimal - Tranzila's contract).
- Frontend display = agorot / 100, formatted with `toFixed(2)`.
- Receipt (YeshInvoice) amount = agorot / 100 (shekel, per their API).

**Stale price locations (must be removed/aligned):**

- ~~`backend/src/services/payment/tranzila.provider.js` - local `PRICES` (29.9 / 299).~~ **RESOLVED:** provider now imports canonical `PRICES_AGOROT` from `backend/src/config/plans.js`.
- `backend/src/controllers/payment.controller.js` - dead code, local `PRICES` (29.9 / 200). Still present; must be deleted when billing code is updated.
- `frontend/src/components/pricing/PricingPlans.jsx` - hardcoded ₪29.99 / ₪299.

---

## 2) Feature Matrix SSoT

**Canonical location:** `backend/src/config/plans.js` → `PLANS` export.

### Gated features (must-ship with payments)

| Feature key    | Free           | Monthly        | Yearly         | Org            |
| -------------- | -------------- | -------------- | -------------- | -------------- |
| `publish`      | ✓              | ✓              | ✓              | ✓              |
| `seo`          | ✗              | ✓              | ✓              | ✓              |
| `analytics`    | ✗              | ✓              | ✓              | ✓              |
| `slugChange`   | ✗              | ✓              | ✓              | ✓              |
| `leadForm`     | ✗              | ✓              | ✓              | ✓              |
| `video`        | ✗              | ✓              | ✓              | ✓              |
| `reviews`      | ✗              | ✓              | ✓              | ✓              |
| `templates`    | `[1]`          | `"all"`        | `"all"`        | `"all"`        |
| `gallery`      | ✗              | ✓              | ✓              | ✓              |
| `galleryLimit` | 4 (moot)       | 10             | 10             | 50             |
| `aiGeneration` | 10/mo (shared) | 30/mo (shared) | 30/mo (shared) | 30/mo (shared) |

> **Gallery note:** Free plan has `gallery: false` → `canUseGallery === false` in entitlements. The `galleryLimit` value (4) is never reached because gallery upload is fully gated by the boolean.

> **AI quota note:** `aiGeneration` is a **shared monthly budget** across all AI surfaces (About, FAQ, SEO). The numbers above are the total per-user monthly limit, not per-surface. Enforcement: `backend/src/controllers/ai.controller.js` → `readTotalMonthlyUsage`. See `docs/ai-about-workstream.md` §5.1 for details.

**Enforcement policy:** `publish`, `seo`, `analytics`, `slugChange` MUST be backend-enforced in the respective controller actions (card.controller.js publish/SEO/slug endpoints). UI crowns are informational only - they do not replace backend gates.

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
  │  f. Best-effort: STO recurring schedule create (post-fulfillment, non-blocking — see §14)
  │     - STO failure does NOT roll back first-payment activation
  │  g. Receipt (YeshInvoice) + email (Mailjet): DEFERRED — not active in current runtime.
  │     See §9 for deferral gate and YeshInvoice/קבלה policy.
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
- Never return 400/404/422 - these would stop provider retries and leak information.

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
| 2. Notify token header | Netlify → Backend    | Function forwards `x-cardigo-notify-token` header. Backend verifies it against `CARDIGO_NOTIFY_TOKEN` - **MUST if set; skip if unset** (same pattern as proxy-secret middleware in `app.js`). |
| 3. Proxy secret header | Backend origin lock  | Function forwards `x-cardigo-proxy-secret`. Backend rejects if missing/wrong (existing middleware).                                                                                           |
| 4. Tranzila signature  | Backend handleNotify | HMAC verification of payload fields against `TRANZILA_SECRET`.                                                                                                                                |

**Function behavior:**

- Accepts `POST` only (405 otherwise).
- Body parsing - best-effort cascade (follows `auth.js` pattern, never checks `Content-Type` header):
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

- `providerTxnId` (String, unique index) - the idempotency key.
- `provider` (String: `"tranzila"` | `"mock"`).
- `userId` (ObjectId, ref User).
- `cardId` (ObjectId, ref Card, nullable).
- `plan` (String: `"monthly"` | `"yearly"`).
- `amountAgorot` (Number, integer).
- `payloadAllowlisted` (Object) - allowlisted subset of notify payload (no sensitive fields).
- `rawPayloadHash` (String) - `sha256` of the full raw payload for audit/forensics.
- `status` (String: `"pending"` | `"paid"` | `"failed"` | `"refunded"`). Note: `"duplicate"` is NOT a status (see idempotencyNote).
- `idempotencyNote` (String, nullable) - set to `"duplicate_skipped"` when E11000 is caught on insert.
- `receiptId` (ObjectId, ref Receipt, nullable) - link to Receipt document.
- `createdAt`, `updatedAt` (timestamps).

**Receipt is a separate model (planned).** `providerDocId`, `pdfPath`, `receiptStatus`, `emailSentAt` live in Receipt, not in PaymentTransaction. Ledger (PaymentTransaction) is not exposed to the cabinet directly.

### providerTxnId derivation

Strategy: **discover-then-derive**.

1. Check Tranzila payload for a provider-assigned transaction identifier in priority order: `index` (preferred) → `authnr` → `ConfirmationCode`. Use the first non-empty value.
2. If none found (edge case): compute `sha256(normalized_payload_string)` as fallback.
3. Prefix with provider name: `tranzila:<value>` / `mock:<value>`.

**RESOLVED.** Implemented in `backend/src/services/payment/tranzila.provider.js` → `deriveProviderTxnId()`. Priority order confirmed via real DirectNG sandbox payment.

### Duplicate handling

- Attempt `PaymentTransaction.create(...)`.
- If MongoDB E11000 on `providerTxnId` → set `idempotencyNote: "duplicate_skipped"` in log, return 200 `"OK"`.
- No state mutation on duplicate. No User/Card updates repeated.

---

## 7) Billing Resolution Chain (existing - documented for reference)

Precedence (highest → lowest):

1. `card.adminOverride` (temporary support override, time-bounded)
2. `card.billing` (real payment - status `active`/`paid`, `paidUntil > now`)
3. Anonymous card → `source: "free"` (no trial countdown for anonymous)
4. `trial-premium` (user-owned card with `billing.status === "trial"` and `trialEndsAt > now`) - grants `isPaid: true`, `plan: "monthly"`, time-bounded premium
5. User-owned fallback → `source: "free"`
6. Trial (anonymous cards with `trialEndsAt > now` or no trial dates yet)
7. Legacy `card.plan` field (migration fallback)
8. None → `source: "none"` (isEntitled: false)

**SSoT files:**

- Resolution: `backend/src/utils/trial.js` → `resolveBilling()`
- Tier: `backend/src/utils/tier.js` → `resolveEffectiveTier()`
- Entitlements: `backend/src/utils/cardDTO.js` → `computeEntitlements()`

**Important policy:** `isEntitled()` returns `true` for all registered user-owned cards (trial.js L75). This grants write access. Feature gates (publish/seo/analytics/slugChange) are a SEPARATE concern from write-access entitlement. Feature gates use `hasAccess(plan, feature)` against the effective billing plan.

---

## 8) Subscription Lifecycle Fields (planned additions)

### User.subscription (existing + new)

| Field              | Type        | Status                  | Purpose                          |
| ------------------ | ----------- | ----------------------- | -------------------------------- |
| `status`           | String enum | existing                | inactive/active/expired          |
| `expiresAt`        | Date        | existing                | Current period end               |
| `provider`         | String      | existing                | "mock"/"tranzila"                |
| `autoRenew`        | Boolean     | **not yet implemented** | Whether subscription auto-renews |
| `currentPeriodEnd` | Date        | **not yet implemented** | Explicit renewal boundary        |

### Reconciliation (planned)

Two planned reconciliation jobs:

1. **Subscription expiry:** checks subscriptions where `expiresAt < now` and `status === "active"` → sets `status: "expired"`, downgrades User.plan and Card.billing. Interval configurable via `SUBSCRIPTION_RECONCILIATION_INTERVAL_MS` env var (planned, default: 3600000).
2. **Receipt retry:** retries failed receipt creation (Receipt.receiptStatus === "failed"). Interval configurable via `RECEIPT_RECONCILIATION_INTERVAL_MS` env var (planned, default: 3600000).

---

## 9) Receipt & Email (DEFERRED)

### Deferral policy

**YeshInvoice / קבלה integration is explicitly deferred.** It must NOT begin until the Tranzila billing lifecycle is secure, observable, recoverable, and production-ready end-to-end.

**Business context:**

- The operator is **עוסק פטור** (VAT-exempt small business).
- Future target: every paying user should receive a **קבלה** (receipt) after a successful payment.
- Receipt issuance must be based on confirmed backend ledger/webhook truth — never on browser success redirect.
- Receipt must cover both first-payment AND recurring charges, so YeshInvoice cannot be wired before the recurring webhook notify handler exists.

**YeshInvoice integration must NOT begin until ALL of the following are closed:**

1. STO notify handler (recurring charge webhook received and processed).
2. Failed-STO retry/recovery script or job.
3. STO cancellation/deactivation runbook and/or script.
4. Non-sensitive structured observability for STO create result.
5. Gated startup validation when `TRANZILA_STO_CREATE_ENABLED=true`.
6. Production terminal cutover completed.
7. Tranzila recurring lifecycle proven end-to-end in production.

**When YeshInvoice integration begins (future contour):**

- Receipt provider: **YeshInvoice** (REST API). Environment-driven: `YESH_INVOICE_API_URL`, `YESH_INVOICE_API_TOKEN`.
- Receipt creation is **best-effort**: failure must not block the 200 ACK to Tranzila.
- On failure: `Receipt.receiptStatus` is set to `"failed"` for later reconciliation/retry.
- Receipt must be issued for: first payment, every recurring charge, and any manual renewal.
- Email notification via Mailjet (`MAILJET_RECEIPT_SUBJECT`, `MAILJET_RECEIPT_TEXT_PREFIX`).
- Cabinet endpoint: `GET /api/account/receipts` + `GET /api/account/receipts/:id/download`.
- Ledger (`PaymentTransaction`) is not exposed to the cabinet directly; cabinet reads Receipt model only.

**Do not add YeshInvoice env vars to Render or begin API integration before the deferral gate is lifted.**

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

### Backend (Render) - existing (billing-relevant subset)

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

### Backend (Render) - STO recurring terminal (active, feature-flag gated)

| Var                           | Purpose                                                                                                                                                                                                          |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TRANZILA_STO_TERMINAL`       | Token / MyBilling / STO terminal ID. **Not** a hosted checkout terminal.                                                                                                                                         |
| `TRANZILA_STO_API_URL`        | Tranzila `/v2/sto/create` endpoint URL                                                                                                                                                                           |
| `TRANZILA_API_APP_KEY`        | Tranzila API v2 public app key (used in HMAC auth header)                                                                                                                                                        |
| `TRANZILA_API_PRIVATE_KEY`    | Tranzila API v2 private key (used as HMAC key base — **never log**)                                                                                                                                              |
| `TRANZILA_STO_CREATE_ENABLED` | Feature flag. `false` = disabled (default safe state). `true` only during approved rollout window.                                                                                                               |
| `TRANZILA_PW`                 | Not used by STO v2 auth path. Reserved/unused.                                                                                                                                                                   |
| `TRANZILA_STO_NOTIFY_URL`     | Operator/reference value only — not read at runtime. Documents the portal URL pattern. Use placeholder: `https://cardigo.co.il/api/payments/sto-notify?snk=<STO_NOTIFY_TOKEN>`. Never embed real token.          |
| `CARDIGO_STO_NOTIFY_TOKEN`    | **Required** in production for STO recurring notify. Validated per-request at the `/api/payments/sto-notify` route (fail-closed 503 if missing). Must also be set in Netlify env (see Netlify table). Never log. |

### Backend (Render) - new (receipt / email — DEFERRED, see §9)

| Var                                       | Purpose                                                          |
| ----------------------------------------- | ---------------------------------------------------------------- |
| `CARDIGO_NOTIFY_TOKEN`                    | Verify `?nt=` token from Netlify function (defense-in-depth)     |
| `YESH_INVOICE_API_URL`                    | YeshInvoice endpoint (sandbox / production) — DEFERRED (see §9)  |
| `YESH_INVOICE_API_TOKEN`                  | YeshInvoice API authentication — DEFERRED (see §9)               |
| `MAILJET_RECEIPT_SUBJECT`                 | Receipt email subject line — DEFERRED (see §9)                   |
| `MAILJET_RECEIPT_TEXT_PREFIX`             | Receipt email body prefix — DEFERRED (see §9)                    |
| `RECEIPT_RECONCILIATION_INTERVAL_MS`      | Receipt retry job interval (planned, default 3600000) — DEFERRED |
| `SUBSCRIPTION_RECONCILIATION_INTERVAL_MS` | Subscription expiry job interval (planned, default 3600000)      |

### Netlify - existing (billing-relevant subset)

| Var                           | Purpose                                          |
| ----------------------------- | ------------------------------------------------ |
| `CARDIGO_GATE_COOKIE_VALUE`   | Gate cookie (proxy.js)                           |
| `CARDIGO_PROXY_SHARED_SECRET` | Forwarded to backend by proxy and payment-notify |

### Netlify - new

| Var                        | Purpose                                                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `CARDIGO_NOTIFY_TOKEN`     | `?nt=` token check in `payment-notify.js`                                                                           |
| `CARDIGO_STO_NOTIFY_TOKEN` | `?snk=` token check in `payment-sto-notify.js`. **Required** in production. Must match Render env value. Never log. |

---

## 12) Known Issues (documented, not solved in this epic)

1. **~~Gallery limit conflict~~ (RESOLVED):** Gallery limits are now per-plan via `planAccess.js` → `getGalleryLimit(featurePlan)` reading from `plans.js`. Free plan has `gallery: false` (upload fully gated). The old flat `GALLERY_LIMIT = 12` from `config/galleryLimit.js` is no longer used by `cardDTO.js`.

2. **Dead code in payment.controller.js:** Contains stale `PRICES` and functions never called by routes (routes use the provider factory). Must be deleted when billing code is updated.

3. **Mock provider security:** `mock.provider.js` handleNotify accepts any `{userId, plan}` with no verification. Safe only when `PAYMENT_PROVIDER` ≠ `"tranzila"` and the notify endpoint is not publicly reachable. In production: `PAYMENT_PROVIDER=tranzila` is mandatory.

4. **Non-atomic User + Card updates:** Both tranzila.provider.js and mock.provider.js do `User.save()` then 2× `Card.updateOne()`. A crash between saves can leave User and Card billing out of sync. Mitigation: reconciliation job (§8) + admin tools. Full transactional writes deferred.

---

## Open Questions

1. ~~**Tranzila providerTxnId field:** Which field in the Tranzila notify payload is the canonical unique transaction identifier?~~ **RESOLVED:** `index` (preferred) → `authnr` → `ConfirmationCode` → `sha256(payload)` fallback. Implemented in `deriveProviderTxnId()` in `tranzila.provider.js`. Priority order confirmed via real DirectNG sandbox payment.

2. ~~**Tranzila notify Content-Type:** Does Tranzila send `application/x-www-form-urlencoded` exclusively, or can it send JSON?~~ **RESOLVED:** Tranzila DirectNG sends `application/x-www-form-urlencoded`. Netlify function handles both (best-effort cascade). Confirmed in production DirectNG flow.

3. **Tranzila retry behavior:** How many times and at what intervals does Tranzila retry on 5xx? This affects idempotency window and reconciliation timing. Still open.

4. **YeshInvoice API specifics:** Exact endpoint paths, required fields, response shape, and sandbox credentials. Must be confirmed before receipt integration task. **DEFERRED — see §9.**

5. **YeshInvoice document type:** Receipt (קבלה) vs. invoice (חשבונית מס / קבלה). Israeli tax law requirements for digital service subscriptions must be confirmed. **DEFERRED — see §9.**

6. ~~**Tranzila `TRANZILA_NOTIFY_URL` value:** Must be updated to `https://cardigo.co.il/api/payments/notify?nt=<token>`.~~ **RESOLVED:** `TRANZILA_NOTIFY_URL` is set to `https://cardigo.co.il/api/payments/notify?nt=<CARDIGO_NOTIFY_TOKEN>` on Render. Confirmed working in production DirectNG flow.

---

## 13) Go-Live Runbook

Before switching `PAYMENT_PROVIDER=tranzila` in production, complete the operational checklist:

→ [Tranzila Go-Live Checklist](./tranzila-go-live-checklist.md)

---

## 14) STO Recurring Schedule

### Dual terminal model (confirmed)

| Terminal role                                                | Sandbox ID     | Used for                        |
| ------------------------------------------------------------ | -------------- | ------------------------------- |
| Clearing / hosted DirectNG first-payment checkout            | `testcards`    | `createPayment`, `handleNotify` |
| Token / MyBilling / STO — **not** a hosted checkout terminal | `testcardstok` | `createTranzilaStoForUser`      |

**U1 token portability confirmed:** `TranzilaTK` captured by the clearing terminal (`testcards`) is accepted by the STO API on the token terminal (`testcardstok`). Cross-terminal token portability is proven in sandbox.

### Winning STO v2 auth formula (confirmed)

- `requestTime` = `String(Math.round(Date.now() / 1000))` (Unix seconds — **not** milliseconds)
- `nonce` = 80 cryptographically random alphanumeric characters
- HMAC: SHA-256, key = `privateKey + requestTime + nonce`, message = `appKey`, digest = lowercase hex
- API username in request body: **not required** for `/v2/sto/create`
- `TRANZILA_PW`: **not used** by STO v2 auth path

Implementation: `buildTranzilaApiAuthHeaders()` in `backend/src/services/payment/tranzila.provider.js`.

### Feature flag

- `TRANZILA_STO_CREATE_ENABLED === "true"` (strict string equality — no truthy coercion)
- **Default safe state: `false`** — absent, `"false"`, or any other value disables STO creation
- Set to `"true"` **only** during an approved controlled test window or production rollout
- **Rollback:** set `TRANZILA_STO_CREATE_ENABLED=false` on Render — takes effect on next request (no restart needed)

### Lifecycle / non-blocking guarantee

- STO create runs **after** first-payment fulfillment: `user.save()`, both `Card.updateOne()` calls, and billing activation are all complete before STO is attempted
- STO failure is fully swallowed — first-payment activation is never rolled back
- `user.tranzilaSto.status` write-ahead: `"pending"` before API call → `"created"` on success → `"failed"` on any error

### Security / redaction rules

- **Never log:** `TranzilaTK` (tranzilaToken), HMAC key, HMAC value, STO request body (contains card token), raw Tranzila API response body
- `stoId` (e.g., `429105`) is a provider schedule reference — **not a secret**; safe for operator visibility via admin API
- `tranzilaSto` subdoc is visible to admin via admin `getUserById` endpoint; excluded from self/account-facing DTOs

### Sandbox e2e result (2026-04-19)

- Test user: `sales@cardigo.co.il`
- Runtime-created STO: `stoId=429105` — confirmed in MongoDB (`tranzilaSto.status="created"`) and Tranzila `testcardstok` portal
- Old probe-created STO: `428938` — created by probe script only, never written to MongoDB
- Both test STOs deactivated in Tranzila `testcardstok` portal after test window
- `TRANZILA_STO_CREATE_ENABLED` set back to `false` on Render immediately after test

### Idempotency guard

- Guard A: if `user.tranzilaSto.stoId` exists and `status === "created"` → skip, return `{ ok: true, skipped: true }`
- A user with `tranzilaSto.status === "created"` cannot be used for a clean e2e re-test without explicit DB state reset or a fresh test user

### Production blockers (must close before production STO rollout)

1. ~~**STO notify handler**~~ — **RESOLVED (5.8a–5.8e):** `handleStoNotify` implemented; Netlify `payment-sto-notify.js` and backend `POST /api/payments/sto-notify` route deployed with token gates; production-domain edge smoke passed. **First real provider-generated Tranzila My Billing webhook E2E is still pending; portal URL not yet registered** (pending contour 5.8f.2–5.8f.4 approval).
2. **Failed-STO retry/recovery** — no script or job exists; users with `tranzilaSto.status="failed"` remain in failed state
3. ~~**Cancellation/deactivation runbook — no operator procedure**~~ — **PARTIALLY RESOLVED (5.6):** `sto-cancel.mjs` operator script exists and sandbox active→inactive proof passed (`truestory.factory@gmail.com`, Tranzila portal confirmed inactive). Admin UI/button remains deferred. Production rollout policy/discipline still required before broad production use.
4. **Non-sensitive observability** — no structured log on STO create result (success / skip / failure)
5. **Gated startup validation** — if `TRANZILA_STO_CREATE_ENABLED=true`, STO config vars should be validated at startup (fail-fast)
6. **Production terminal cutover** — Render STO env vars must be switched from sandbox terminal to production terminal values; `PRICES_AGOROT` must be restored to production values (`3990`/`39990`) and active STO schedules reviewed/migrated before cutover
7. **Handshake / `thtk` amount locking** — separate future contour (STO amount locked at create time; price change reconciliation not yet designed)
8. **YeshInvoice / קבלה** — explicitly deferred; must not start until real-provider STO notify E2E and production lifecycle policies are closed (see §9)
