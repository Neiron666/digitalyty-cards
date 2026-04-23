# Cardigo Enterprise Master Handoff — YeshInvoice Groundwork

**Created:** 2026-04-23  
**Contour:** 5.12.H  
**Author role:** Senior Project Architect / Documentation Owner / Billing Systems Historian  
**Audience:** Next GPT chat (and any human engineer continuing this work)

---

> **How to use this document:**  
> Read §1 (executive snapshot) first. Then §7 (closed) and §8 (open plan). For deep-dives on any specific subsystem, use §12 (evidence appendix) to navigate to the canonical doc.  
> Do NOT treat this file as the canonical SSoT — it is a navigational snapshot. Always verify against the primary docs listed in §12.

---

## 1. Executive Snapshot

### Project state

Cardigo is a production SaaS (cardigo.co.il) — digital business cards. Monorepo: `frontend/` (React+Vite, Netlify), `backend/` (Node/Express, Render, MongoDB Atlas `cardigo_prod`). RTL-first (Hebrew). Payment via Tranzila (Israeli processor).

### Billing state — CURRENT TRUTH

- `PAYMENT_PROVIDER=tranzila` in production (Render env)
- `TRANZILA_STO_CREATE_ENABLED=false` — STO recurring schedules are **not** being created for new first payments in production right now (safe default during terminal cutover prep)
- `PRICES_AGOROT = { monthly: 500, yearly: 500 }` (₪5.00 each) — **intentional sandbox values** currently active. Production values `{ monthly: 3990, yearly: 39990 }` are commented out in `backend/src/config/plans.js:72–73`. Must NOT be changed while active sandbox STO schedules exist.
- First-payment + recurring webhook flows are fully implemented and sandbox-proven
- Self-service cancel-renewal is implemented and production-shipped
- `billingReconcile` job is live: 6h interval, expires stale active subscriptions
- `retentionPurge` job is live: purges premium-only surplus data after `downgradedAt`
- Failed renewal detection, marker (`renewalFailedAt`), email, and UI banner are all implemented

### YeshInvoice state — PRODUCTION BLOCKED / GROUNDWORK ONLY

- YeshInvoice **not implemented**. No `Receipt` model. No `yeshinvoice.service.js`. No receipt email. No cabinet endpoints.
- `PaymentTransaction.receiptId` FK anchor **already exists** in schema (`PaymentTransaction.model.js:54–60`) — the only YeshInvoice-related code currently in the runtime.
- Full groundwork documentation package created (contour 5.12.0) and **formally accepted** (5.12.0V).
- 4 Tranzila billing gates remain open (G2, G4b, G6, G7) — YeshInvoice cannot go to production until all 4 are closed.
- 6 operator decisions remain open (OP-1 through OP-6) — implementation cannot begin until answered.

### What is ready

- Full billing runtime chain (first payment, notify, STO create, STO recurring, cancel, reconcile, retention)
- 3-doc YeshInvoice groundwork package accepted
- Closed contour list through 5.12.0 (see §7)
- Auth, CORS, CSRF contours closed and hardened

### What is blocked

- Production prices (blocked on: cancel 2 sandbox STO schedules → restore prices → cutover)
- YeshInvoice implementation (blocked on: operator decisions + Tranzila billing gates)
- Production terminal cutover (blocked on: sandbox STO cancellation)

### What the next chat must understand first

1. `PRICES_AGOROT = { monthly: 500, yearly: 500 }` is sandbox — do not treat as production truth
2. The billing chain has a strict ledger-first invariant — `PaymentTransaction` is written BEFORE `User/Card` mutation
3. CURRENT TRUTH and FUTURE PROPOSED are explicitly separated in all groundwork docs — do not collapse them
4. Four billing gates remain open; none can be skipped to reach production

---

## 2. Current Billing Chain (CURRENT TRUTH)

### 2.1. First-Payment Checkout / Create Path

| Step             | Detail                                                                                         |
| ---------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **Trigger**      | Authenticated user; `POST /api/payments/create { plan }` via `requireAuth`                     |
| **File**         | `backend/src/routes/payment.routes.js` → `paymentProvider.createPayment({ userId, plan })`     |
| **Returns**      | `{ paymentUrl }` — Tranzila DirectNG hosted checkout URL                                       |
| **Browser flow** | User redirected to Tranzila; completes or abandons. Redirect back to `/pricing?payment=success | fail` is UX-only. **Never triggers entitlement.** |
| **Verified**     | ✅ Sandbox E2E proven (`testcardstok`).                                                        |

### 2.2. First-Payment Notify Path (server-to-server)

| Step                      | Detail                                                                                                                                                                                                                                   |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Trigger**               | Tranzila DirectNG fires `POST` to `TRANZILA_NOTIFY_URL`. Passes through Netlify `payment-notify.js`. Arrives at `POST /api/payments/notify`.                                                                                             |
| **Defense layers**        | (1) `?nt=` token → Netlify; (2) `x-cardigo-notify-token` header → backend; (3) `x-cardigo-proxy-secret` → backend; (4) HMAC signature → `handleNotify`.                                                                                  |
| **Handler**               | `handleNotify(payload)` — `tranzila.provider.js:808`                                                                                                                                                                                     |
| **Trust evaluation**      | DirectNG mode: sum + supplier + currency + index. Dual-mode (legacy sig fallback). `isPaid = trustOk && (Response === "000")`.                                                                                                           |
| **Status written**        | `isPaid ? "paid" : "failed"`                                                                                                                                                                                                             |
| **Ledger write**          | `PaymentTransaction.create(...)` at `tranzila.provider.js:911` — written BEFORE User/Card. E11000 on duplicate → silent 200, no User/Card change. PROOF: `tranzila.provider.js:924`.                                                     |
| **If not paid**           | Early return at `tranzila.provider.js:930–932`. Failed txn in ledger. No User/Card mutation.                                                                                                                                             |
| **Fulfillment (if paid)** | `user.plan`, `user.subscription.status/expiresAt/provider`, `user.renewalFailedAt = null`, `user.save()` at `tranzila.provider.js:969`. Then `Card.updateOne()×2` (dot-path + null-billing fallback) at `tranzila.provider.js:980–1000`. |
| **TranzilaTK**            | Captured at `tranzila.provider.js:808`. Stored in `user.tranzilaToken` only on paid path at `tranzila.provider.js:955`. Never logged. Never in `payloadAllowlisted`.                                                                     |
| **ACK**                   | Always 200 after successful ledger write or E11000 recognition. 500 only on infra failure (DB down).                                                                                                                                     |
| **Verified**              | ✅ Sandbox E2E proven with real Tranzila DirectNG.                                                                                                                                                                                       |

### 2.3. STO Create Path (post-first-payment, non-blocking)

| Step             | Detail                                                                                                                                          |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Trigger**      | Automatic, end of `handleNotify` after full fulfillment.                                                                                        |
| **Feature flag** | `TRANZILA_STO_CREATE_ENABLED === "true"` (strict string). PROOF: `tranzila.provider.js:181–186`. **Currently `false` in production.**           |
| **File**         | `createTranzilaStoForUser(user, plan, expiresAt)` at `tranzila.provider.js:365`. Called at `tranzila.provider.js:1015`.                         |
| **Idempotency**  | Guard: if `user.tranzilaSto.stoId` exists and `status === "created"` → skip.                                                                    |
| **Write-ahead**  | `user.tranzilaSto.status = "pending"` before API call.                                                                                          |
| **Non-blocking** | STO failure is swallowed (`catch (_stoErr)`). Does NOT roll back fulfillment.                                                                   |
| **Startup gate** | `backend/src/services/payment/index.js:22–36` — throws on missing vars when `TRANZILA_STO_CREATE_ENABLED=true`. PROOF: confirmed closed (5.11). |
| **Verified**     | ✅ Sandbox STO schedule create proven (sandbox terminal `testcardstok`).                                                                        |

### 2.4. STO Recurring Notify Path

| Step                                | Detail                                                                                                                                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Trigger**                         | Tranzila My Billing fires server-to-server `POST` on each charge date. Arrives at `POST /api/payments/sto-notify?snk=<token>`.                                                             |
| **Defense**                         | Fail-closed 503 if `CARDIGO_STO_NOTIFY_TOKEN` env missing. `?snk=` token validated per-request.                                                                                            |
| **Handler**                         | `handleStoNotify(payload)` — `tranzila.provider.js:1049`                                                                                                                                   |
| **Core invariant**                  | No User/Card mutation before successful `PaymentTransaction.create`. PROOF: `tranzila.provider.js:1042–1044`.                                                                              |
| **E11000**                          | Duplicate → return without User/Card change.                                                                                                                                               |
| **Failure cases written to ledger** | `supplier_mismatch`, `amount_mismatch`, `currency_mismatch`, `user_not_found`, `sto_cancelled`.                                                                                            |
| **Success**                         | `status="paid"`, `idempotencyNote="sto_recurring_notify"`. Subscription extended `max(now, currentExpiry) + 30d`. Both `user.subscription.expiresAt` and `card.billing.paidUntil` updated. |
| **Verified**                        | ✅ Real Tranzila My Billing webhook received and fully verified in sandbox (contour 5.8f.9).                                                                                               |

### 2.5. Failed Recurring Charge Path

| Step            | Detail                                                                                                          |
| --------------- | --------------------------------------------------------------------------------------------------------------- |
| **Trigger**     | `handleStoNotify` receives `Response !== "000"` from Tranzila.                                                  |
| **Ledger**      | `PaymentTransaction.create({ status: "failed", failReason: "..." })`.                                           |
| **User marker** | `user.renewalFailedAt` stamped (if not already set).                                                            |
| **Email**       | `sendRenewalFailedEmailMailjetBestEffort(...)` — best-effort, fire-and-forget. PROOF: `mailjet.service.js:825`. |
| **UI**          | Banner shown in SettingsPanel when `renewalFailedAt !== null && paidUntil > now && renewalStatus === "active"`. |
| **No receipt**  | Failed txns do NOT trigger receipts (current or future).                                                        |
| **Verified**    | ✅ Sandbox proven.                                                                                              |

### 2.6. Self-Service Cancel-Renewal Path

| Step                                           | Detail                                                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **Trigger**                                    | User clicks "ביטול חידוש אוטומטי" in SettingsPanel. `POST /api/account/cancel-renewal` (no body). |
| **Auth**                                       | `requireAuth`. Rate-limited 3/10min per userId.                                                   |
| **Provider-first**                             | `cancelTranzilaStoForUser` called BEFORE any Mongo write.                                         |
| **Mongo write (only after provider confirms)** | `tranzilaSto.status = "cancelled"`, `cancellationSource = "self_service"`.                        |
| **Premium preserved**                          | `subscription.expiresAt` and `card.billing.paidUntil` NOT changed.                                |
| **No PaymentTransaction**                      | Cancel-renewal does NOT create a ledger record.                                                   |
| **Response**                                   | `{ ok: true, renewalStatus: "cancelled", autoRenewal: {...}, messageKey: "cancelled" }`           |
| **Verified**                                   | ✅ Sandbox proven (contour 5.9a.1).                                                               |

### 2.7. `billingReconcile` Job

| Step                       | Detail                                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Start**                  | `startBillingReconcileJob({ intervalMs })` wired in `backend/src/server.js:113`.                                               |
| **Interval env**           | `BILLING_RECONCILE_INTERVAL_MS`, default `6 * 60 * 60 * 1000` (6h). PROOF: `billingReconcile.js:265`.                          |
| **Query**                  | `subscription.status=active + subscription.expiresAt < now + cardId != null`.                                                  |
| **CARD-FIRST write order** | `card.downgradedAt = now` stamped first (triggers `retentionPurge`). Then: `subscription.status = "expired"`, `plan = "free"`. |
| **adminOverride guard**    | If `card.adminOverride` active: skip card normalization; still normalize user.                                                 |
| **Observability**          | Sentry cron monitor `"billing-reconcile"`. Running-flag guard (no concurrent runs).                                            |
| **No PaymentTransaction**  | Reconcile downgrade does NOT create a ledger record.                                                                           |

### 2.8. Retention Purge Interaction

| Step        | Detail                                                                                              |
| ----------- | --------------------------------------------------------------------------------------------------- |
| **Trigger** | `card.downgradedAt` stamped by `billingReconcile`.                                                  |
| **Job**     | `startRetentionPurgeJob` wired in `server.js`. Interval: `RETENTION_PURGE_INTERVAL_MS`, default 6h. |
| **Purges**  | Gallery overflow, services, videoUrl, businessHours, premium contact fields.                        |
| **Guards**  | Skips if card re-upgraded or admin-overridden since `downgradedAt`.                                 |
| **File**    | `backend/src/jobs/retentionPurge.js`                                                                |

---

## 3. Future YeshInvoice Chain (FUTURE PROPOSED)

> **Everything in this section is FUTURE PROPOSED only. Nothing below is implemented. No files exist.**

### 3.1. Receipt Candidate Generation

- A `PaymentTransaction` with `status === "paid"` AND `provider !== "mock"` is the sole receipt candidate.
- Trigger for first payment: after `Card.updateOne()×2` in `handleNotify`, before STO create block (~L1000–1015).
- Trigger for recurring: after `PaymentTransaction.create({ status: "paid" })` in `handleStoNotify`, before return.

### 3.2. Best-Effort Receipt Issuance

- `createReceiptBestEffort({ userId, paymentTransactionId, plan, amountAgorot, provider })` (future `yeshinvoice.service.js`)
- Fire-and-forget: `.catch()` at hook site. Does NOT await. Does NOT block webhook ACK.
- Guard 1: `YESH_INVOICE_ENABLED !== "true"` → skip
- Guard 2: `provider === "mock"` → skip
- Guard 3: `Receipt.findOne({ paymentTransactionId })` exists with `receiptStatus === "created"` → skip
- Write-ahead: `Receipt.create({ receiptStatus: "pending" })` before API call.

### 3.3. Idempotent Skip If Already Issued

- Unique index on `Receipt.paymentTransactionId` (manual migration — no autoIndex).
- E11000 on `Receipt.create` → catch silently, no second YeshInvoice call.
- Webhook replay: blocked at `PaymentTransaction` E11000 fence; no second receipt possible.

### 3.4. Failed Receipt Path

- YeshInvoice API fails → `receiptStatus = "failed"`, `providerDocId = null`.
- Payment ACK unaffected — already sent before `createReceiptBestEffort` fired.

### 3.5. Retry Path

- Future job: `startReceiptRetryJob` (future `backend/src/jobs/receiptRetry.js`)
- Pattern: `billingReconcile.js` (running-flag, Sentry cron, bounded query `.limit(50)`)
- Interval: `RECEIPT_RETRY_INTERVAL_MS`, proposed default 3h
- Queries: `Receipt.find({ receiptStatus: "failed", providerDocId: null })`

### 3.6. User Receipt Retrieval Path

- `GET /api/account/receipts` — future cabinet endpoint, `requireAuth`, reads `Receipt` model
- `GET /api/account/receipts/:id/download` — `requireAuth`, ownership check (`receipt.userId === req.userId`), returns signed URL or proxied PDF
- **Ledger (`PaymentTransaction`) is NOT exposed to cabinet.** Cabinet reads `Receipt` only.

### 3.7. Receipt Email Path

- `sendReceiptEmailMailjetBestEffort(...)` (future function in `mailjet.service.js`, following `sendRenewalFailedEmailMailjetBestEffort:825` pattern)
- Env vars: `MAILJET_RECEIPT_SUBJECT` (default `"קבלה מ-Cardigo"`), `MAILJET_RECEIPT_TEXT_PREFIX`
- Timing: after YeshInvoice confirms (OP-6 decision)

---

## 4. Endpoint Map

### A. CURRENT EXISTING ENDPOINTS

| Method | Route                         | Purpose                                | Auth                     | Notes                                                                                       |
| ------ | ----------------------------- | -------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------- |
| `POST` | `/api/payments/create`        | Generate Tranzila hosted checkout URL  | `requireAuth`            | Returns `{ paymentUrl }`                                                                    |
| `POST` | `/api/payments/notify`        | First-payment server-to-server webhook | No auth (defense layers) | Via Netlify `payment-notify.js`. MUST-if-set `x-cardigo-notify-token` + proxy secret + HMAC |
| `POST` | `/api/payments/sto-notify`    | Recurring charge webhook (My Billing)  | No auth (token guard)    | Fail-closed 503 if `CARDIGO_STO_NOTIFY_TOKEN` missing. `?snk=` token.                       |
| `GET`  | `/api/account/me`             | User account DTO incl. billing state   | `requireAuth`            | Returns subscription, autoRenewal, plan. No receipts.                                       |
| `POST` | `/api/account/cancel-renewal` | Self-service STO cancellation          | `requireAuth`            | Rate-limited 3/10min. Provider-first. No body.                                              |

### B. FUTURE PROPOSED ENDPOINTS

| Method | Route                                | Purpose                          | Status          | Notes                                                                |
| ------ | ------------------------------------ | -------------------------------- | --------------- | -------------------------------------------------------------------- |
| `GET`  | `/api/account/receipts`              | List user receipts (paginated)   | FUTURE PROPOSED | Reads `Receipt` model only. No raw `PaymentTransaction` fields.      |
| `GET`  | `/api/account/receipts/:id/download` | Download/redirect to receipt PDF | FUTURE PROPOSED | `requireAuth` + ownership check (anti-enumeration: 404 on mismatch). |

---

## 5. DTO Map

### A. CURRENT EXISTING DTOs

#### `GET /api/account/me` — billing-relevant fields

PROOF: `backend/src/routes/account.routes.js:186–205`

```json
{
    "plan": "free | monthly | yearly",
    "subscription": {
        "status": "inactive | active | expired",
        "expiresAt": "ISO date | null",
        "provider": "tranzila | mock | null"
    },
    "autoRenewal": {
        "status": "active | cancelled | pending | failed | none",
        "canCancel": true,
        "cancelledAtPresent": false,
        "subscriptionExpiresAt": "ISO date | null"
    }
}
```

`autoRenewal` is derived from `buildAutoRenewalDto(user)` at `account.routes.js:83`. It does NOT expose `stoId`, `tranzilaToken`, `tranzilaSto.stoId`, or raw STO payload fields.

#### `PaymentTransaction` — stored field truth

PROOF: `backend/src/models/PaymentTransaction.model.js:1–65`

| Field                    | Type                                                        | Key notes                                                 |
| ------------------------ | ----------------------------------------------------------- | --------------------------------------------------------- |
| `providerTxnId`          | String, required                                            | Unique index (manual migration). Idempotency fence.       |
| `provider`               | enum: `"tranzila"` \| `"mock"` \| `"admin"`                 | Receipt guard: must be `!== "mock"` for receipt issuance. |
| `userId`                 | ObjectId ref User                                           | May be null on early-validation failures.                 |
| `cardId`                 | ObjectId ref Card                                           | May be null.                                              |
| `plan`                   | enum: `"monthly"` \| `"yearly"` \| null                     |                                                           |
| `amountAgorot`           | Number (integer)                                            | Use txn value, NOT config constant (sandbox pricing).     |
| `currency`               | String, default `"ILS"`                                     |                                                           |
| `payloadAllowlisted`     | Object                                                      | Sanitized subset. No TranzilaTK, no raw secrets.          |
| `rawPayloadHash`         | String                                                      | SHA-256 of raw payload for audit.                         |
| `status`                 | enum: `"pending"` \| `"paid"` \| `"failed"` \| `"refunded"` |                                                           |
| `idempotencyNote`        | String                                                      | e.g. `"sto_recurring_notify"`, `"duplicate_skipped"`.     |
| `receiptId`              | ObjectId ref Receipt, default null                          | **FK anchor — already exists in production schema.**      |
| `failReason`             | String                                                      | e.g. `"supplier_mismatch"`, `"amount_mismatch"`.          |
| `createdAt`, `updatedAt` | timestamps                                                  |                                                           |

#### Cancel-renewal response

```json
{
    "ok": true,
    "renewalStatus": "cancelled",
    "autoRenewal": {
        "status": "cancelled",
        "canCancel": false,
        "cancelledAtPresent": true,
        "subscriptionExpiresAt": "..."
    },
    "messageKey": "cancelled"
}
```

### B. FUTURE PROPOSED DTOs

#### `Receipt` — proposed stored fields (FUTURE PROPOSED)

| Field                    | Type                                           | Notes                        |
| ------------------------ | ---------------------------------------------- | ---------------------------- |
| `userId`                 | ObjectId ref User                              | Receipt owner.               |
| `paymentTransactionId`   | ObjectId ref PaymentTransaction                | Back-link. Unique index.     |
| `providerDocId`          | String                                         | YeshInvoice document ID.     |
| `pdfPath`                | String                                         | URL or Supabase path of PDF. |
| `receiptStatus`          | enum: `"pending"` \| `"created"` \| `"failed"` |                              |
| `emailSentAt`            | Date \| null                                   |                              |
| `createdAt`, `updatedAt` | timestamps                                     |                              |

#### Cabinet receipt list item (FUTURE PROPOSED)

```json
{
    "id": "ObjectId string",
    "receiptStatus": "created",
    "pdfUrl": "https://...",
    "amountAgorot": 3990,
    "plan": "monthly",
    "createdAt": "ISO date"
}
```

Note: `providerDocId` and `paymentTransactionId` are NOT exposed in cabinet DTO.

#### Receipt download (FUTURE PROPOSED)

- Redirect to signed URL (YeshInvoice native or Supabase signed URL), or proxied PDF stream.
- Behavior depends on OP-3 decision (PDF storage strategy).

---

## 6. Payload Map

### A. CURRENT EXISTING PAYLOADS

#### First-payment notify — incoming from Tranzila (form-urlencoded)

Parsed by Netlify `payment-notify.js` → forwarded as JSON.

| Field        | Used for                                                          |
| ------------ | ----------------------------------------------------------------- |
| `Response`   | `"000"` = paid                                                    |
| `supplier`   | Matched against `TRANZILA_SUPPLIER` env var                       |
| `sum`        | Matched against expected plan amount (agorot/100, shekel)         |
| `currency`   | `"1"` = ILS                                                       |
| `index`      | `providerTxnId` derivation (priority 1)                           |
| `TranzilaTK` | Token — captured before allowlist; stored encrypted; NEVER logged |

#### STO recurring notify — incoming from Tranzila My Billing (JSON)

| Field      | Used for                                |
| ---------- | --------------------------------------- |
| `Response` | `"000"` = success                       |
| `supplier` | Matched against `TRANZILA_STO_TERMINAL` |
| `sum`      | Matched against plan expected amount    |
| `currency` | `"1"` = ILS                             |

#### `POST /api/payments/create` request body

```json
{ "plan": "monthly | yearly" }
```

### B. FUTURE PROPOSED PAYLOADS

#### Internal `createReceiptBestEffort` input contract (FUTURE PROPOSED)

```js
// Input to future yeshinvoice.service.js
{
  userId: ObjectId,           // required
  paymentTransactionId: ObjectId,  // required; null → skip (no_payment_transaction)
  plan: "monthly" | "yearly",
  amountAgorot: number,       // integer; use txn.amountAgorot NOT config constant
  provider: "tranzila"        // guard: must !== "mock"
}
```

#### YeshInvoice API request (PROPOSED EXAMPLE — NOT VERIFIED PROVIDER CONTRACT)

> Exact endpoint, auth scheme, required fields, and response shape must be confirmed from YeshInvoice API docs and OP-2 credentials before any implementation.

#### `Receipt` persistence shape after successful YeshInvoice call (FUTURE PROPOSED)

```json
{
    "receiptStatus": "created",
    "providerDocId": "<YeshInvoice doc ID>",
    "pdfPath": "<URL or Supabase path>",
    "emailSentAt": null
}
```

#### Future `GET /api/account/receipts` response (FUTURE PROPOSED)

```json
{
    "receipts": [
        {
            "id": "...",
            "receiptStatus": "created",
            "pdfUrl": "...",
            "amountAgorot": 3990,
            "plan": "monthly",
            "createdAt": "..."
        }
    ]
}
```

---

## 7. Closed Contours / Accepted Truths

### CLOSED AND VERIFIED (runtime, sandbox-proven)

| Contour                                | What was proven                                                                                                                                                                   |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First-payment DirectNG flow            | `PaymentTransaction.status="paid"`, User.subscription, Card.billing all correct after real sandbox payment                                                                        |
| `providerTxnId` derivation             | `index`-first priority confirmed with real Tranzila response                                                                                                                      |
| STO schedule create (post-fulfillment) | Sandbox STO created successfully; `tranzilaSto.status="created"`                                                                                                                  |
| STO recurring notify                   | Real Tranzila My Billing webhook received, processed, subscription extended, `sto_recurring_notify` txn in ledger (5.8f.9, `REAL_TRANZILA_STO_NOTIFY_E2E_SUCCESS_FULLY_VERIFIED`) |
| Self-service cancel-renewal            | Provider-first cancel + Mongo write + premium preserved (5.9a.1)                                                                                                                  |
| Failed renewal email                   | `sendRenewalFailedEmailMailjetBestEffort` best-effort pattern confirmed                                                                                                           |
| `billingReconcile` job                 | Wired `backend/src/server.js:113`. Env var `BILLING_RECONCILE_INTERVAL_MS`, default 6h.                                                                                           |
| Startup env validation (gate G5)       | `payment/index.js:22–36` — fail-fast on missing STO create vars when enabled. RESOLVED 5.11.                                                                                      |

### CLOSED DOC TRUTH (verified in docs, not changed since last proof)

| Contour                                       | What is settled                                                                                                                     |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Pricing SSoT (5.10b)                          | `PRICES_AGOROT` in `plans.js` is canonical. Stale price locations all resolved.                                                     |
| Billing doc corrections (5.11)                | Gate count, reconcile env var name, dead code references corrected in `billing-flow-ssot.md` and `tranzila-go-live-checklist.md`.   |
| PaymentPolicy legal/runtime alignment (5.10c) | `frontend/src/pages/PaymentPolicy.jsx` copy corrected (3 edits). Annual billing, cancel, and chargeback sections verified accurate. |
| YeshInvoice groundwork package (5.12.0)       | 3-doc package created and formally accepted (5.12.0V). All 11 audit criteria PASS.                                                  |
| `billing-flow-ssot.md §9` cross-reference     | "See also" block added pointing to all 3 groundwork docs.                                                                           |

### PREPARED BUT NOT IMPLEMENTED

| Item                                      | Status                                                   |
| ----------------------------------------- | -------------------------------------------------------- |
| `Receipt` model (`Receipt.model.js`)      | Schema documented in groundwork; file does NOT exist yet |
| `yeshinvoice.service.js`                  | Pattern documented; file does NOT exist yet              |
| `sendReceiptEmailMailjetBestEffort`       | Skeleton documented; function does NOT exist yet         |
| Receipt retry job (`receiptRetry.js`)     | Pattern documented; file does NOT exist yet              |
| Cabinet API (`GET /api/account/receipts`) | Contract documented; route does NOT exist yet            |
| Index migration script for `Receipt`      | Pattern documented; script does NOT exist yet            |

---

## 8. Open Contours — Ordered Next Plan

> Do NOT reorder casually. These dependencies are real.

### Phase A — Unblock Production Billing (prerequisite for everything below)

| #     | Contour                                                                                                                                                                                                  | Reason                                                                                                                                       | Dependency                                |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| 5.10d | Cancel 2 active sandbox STO schedules (valik + neiron test) at Tranzila portal                                                                                                                           | `PRICES_AGOROT` cannot change while active schedules charge the old sandbox amount — would cause `amount_mismatch` on every recurring charge | Manual operator action at Tranzila portal |
| 5.10e | Restore `PRICES_AGOROT` to production values `{monthly: 3990, yearly: 39990}` in `plans.js`                                                                                                              | Production pricing currently wrong (₪5.00 sandbox)                                                                                           | Blocked on 5.10d                          |
| 5.10f | Production terminal cutover: set `PAYMENT_PROVIDER=tranzila`, configure `TRANZILA_TERMINAL`, `TRANZILA_SECRET`, production `TRANZILA_NOTIFY_URL`, production `TRANZILA_SUCCESS_URL`/`FAIL_URL` on Render | Closes Gate G6                                                                                                                               | Blocked on 5.10e                          |
| 5.10g | Production E2E lifecycle proof: real customer, production terminal, real first payment + STO create + recurring charge                                                                                   | Closes Gate G7                                                                                                                               | Blocked on 5.10f                          |

### Phase B — Open Production Safety Gaps (can be done in parallel with Phase A if team has capacity)

| #     | Contour                                                                                                  | Reason          | Dependency                       |
| ----- | -------------------------------------------------------------------------------------------------------- | --------------- | -------------------------------- |
| 5.10h | Failed-STO retry/recovery: job or runbook to detect `tranzilaSto.status="failed"` and retry STO creation | Closes Gate G2  | None blocking; can start anytime |
| 5.10i | STO create observability: structured log for STO create outcome (success/fail/skipped)                   | Closes Gate G4b | None blocking; can start anytime |

### Phase C — YeshInvoice Operator Decisions (prerequisite for C implementation)

| #    | Action                                                                                           | Reason                                                                               |
| ---- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| OP-1 | Operator confirms: עוסק פטור (קבלה) or עוסק מורשה (חשבונית מס קבלה)                              | Determines YeshInvoice API document type parameter                                   |
| OP-2 | Operator obtains YeshInvoice sandbox credentials (API URL + token)                               | Hard dependency for sandbox implementation testing                                   |
| OP-3 | PDF storage strategy decided: YeshInvoice native URL vs Supabase                                 | Affects `pdfPath` field, download endpoint, and Supabase bucket setup                |
| OP-4 | Receipt email language decided: Hebrew only or bilingual                                         | Affects `mailjet.service.js` template                                                |
| OP-5 | Retroactive receipts decision: issue for ≈10 existing paid `PaymentTransaction` records or defer | Determines scope of 5.12.6                                                           |
| OP-6 | Receipt email timing: on paid txn creation or after YeshInvoice confirms                         | Affects where `sendReceiptEmailMailjetBestEffort` fires in `createReceiptBestEffort` |

### Phase D — YeshInvoice Implementation (all Phase C decisions + G2/G4b/G6/G7 must be closed)

| #      | Contour                                          | Deliverable                                                                                                                     |
| ------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| 5.12.1 | Receipt model + indexes + startup validation     | `Receipt.model.js`, `migrate-receipt-indexes.mjs`, `payment/index.js` YeshInvoice gate                                          |
| 5.12.2 | YeshInvoice service + hook wiring + retry job    | `yeshinvoice.service.js`, wiring in `tranzila.provider.js`, `receiptRetry.js`                                                   |
| 5.12.3 | Receipt email + cabinet API                      | `sendReceiptEmailMailjetBestEffort` in `mailjet.service.js`, `GET /api/account/receipts` + download endpoint                    |
| 5.12.4 | Sandbox E2E proof + index migration applied      | Receipt created for test payment, email received, retry job tested                                                              |
| 5.12.5 | Production enablement                            | `YESH_INVOICE_ENABLED=true` + `YESH_INVOICE_API_URL` + `YESH_INVOICE_API_TOKEN` on Render (only after all billing gates closed) |
| 5.12.6 | Retroactive receipts backfill (if OP-5 approved) | Separate backfill script for ~10 existing paid `PaymentTransaction` records                                                     |

### Phase E — Frontend (separate contour, no backend blockers other than 5.12.3)

| #       | Contour                             | Deliverable                                                  |
| ------- | ----------------------------------- | ------------------------------------------------------------ |
| 5.12.FE | Receipt cabinet UI in SettingsPanel | List, download link, display amountAgorot/100 as ₪ formatted |

---

## 9. What Must NOT Be Casually Reopened

| Rule                                                                               | Reason                                                                                                                                                         |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Do not collapse CURRENT TRUTH and FUTURE PROPOSED**                              | All groundwork docs explicitly separate these. Collapsing them breaks the implementation safety contract.                                                      |
| **Do not treat sandbox pricing (`monthly: 500, yearly: 500`) as production truth** | Production prices are `{monthly: 3990, yearly: 39990}`. Sandbox values are intentionally active while sandbox STO schedules exist.                             |
| **Do not change `PRICES_AGOROT` while active sandbox STO schedules exist**         | Would cause `amount_mismatch` on every subsequent recurring notify. Cancel schedules (5.10d) first.                                                            |
| **Do not enable `YESH_INVOICE_ENABLED=true` in production**                        | No gates closed for YeshInvoice production enablement. No `Receipt` model, no service, no operator decisions answered.                                         |
| **Do not trigger receipts on admin billing grants**                                | Admin billing set/revoke does NOT create a `PaymentTransaction`. Receipt hook must use `paymentTransactionId` as required argument — no txn = no receipt.      |
| **Do not trigger receipts on `provider === "mock"`**                               | Mock provider is used in dev/staging. Must guard in `createReceiptBestEffort`.                                                                                 |
| **Do not block payment ACK on YeshInvoice failure**                                | Receipt creation must be fire-and-forget. If this invariant is broken, Tranzila webhook will time out and retry, causing duplicate processing attempts.        |
| **Do not confuse groundwork-ready with implementation-ready or production-ready**  | Groundwork docs created ≠ permission to implement. See §8 Phase C preconditions.                                                                               |
| **Do not reopen auth cookie contour, CSRF contour, or CORS contour**               | These are closed and hardened. All listed as closed contours in `copilot-instructions.md §4`.                                                                  |
| **Do not auto-apply indexes**                                                      | `autoIndex: false`, `autoCreate: false` globally. All new indexes require manual migration script with `--dry-run` → `--apply`.                                |
| **Do not use `User.subscription.status` as receipt trigger**                       | Admin grants set `subscription.status = "active"` without a `PaymentTransaction`. This would cause legally incorrect receipts for admin-granted subscriptions. |
| **Do not add `YESH_INVOICE_*` env vars to Render**                                 | Until `YESH_INVOICE_ENABLED=true` is approved in the production enablement contour (5.12.5).                                                                   |
| **Do not delete sandbox test users or test payment records**                       | These are the E2E proof record. Clean-up is a separate contour — never a side effect of a billing/YeshInvoice contour.                                         |

---

## 10. Manual / Operator Actions That May Later Be Required

| Action                                                                  | Tied to contour | Notes                                                                                                                                                                 |
| ----------------------------------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cancel 2 sandbox STO schedules (valik + neiron test) at Tranzila portal | 5.10d           | Must be done before any price restoration. Portal action only — no code change.                                                                                       |
| Restore `PRICES_AGOROT` production values in `plans.js`                 | 5.10e           | Code change (1 line in `plans.js`). Frontend build + deploy required.                                                                                                 |
| Set production Tranzila terminal + secret + URLs on Render              | 5.10f           | Render env change (no code). `PAYMENT_PROVIDER=tranzila`, `TRANZILA_TERMINAL`, `TRANZILA_SECRET`, `TRANZILA_NOTIFY_URL`, `TRANZILA_SUCCESS_URL`, `TRANZILA_FAIL_URL`. |
| Prove production first-payment E2E (real card, real customer)           | 5.10g           | Manual test. Record `PaymentTransaction._id`, `providerTxnId`, `user.subscription.expiresAt`.                                                                         |
| Confirm YeshInvoice document type (OP-1)                                | Before 5.12.1   | Business decision: עוסק פטור → קבלה; עוסק מורשה → חשבונית מס קבלה.                                                                                                    |
| Obtain YeshInvoice sandbox API URL + token (OP-2)                       | Before 5.12.1   | Store in Render env (`YESH_INVOICE_API_URL`, `YESH_INVOICE_API_TOKEN`) — never in source.                                                                             |
| Decide PDF storage strategy (OP-3)                                      | Before 5.12.2   | YeshInvoice native URL vs Supabase bucket. If Supabase: see `docs/upload-supabase-contract.md`.                                                                       |
| Decide receipt email language (OP-4)                                    | Before 5.12.3   | Hebrew only or bilingual. Affects `mailjet.service.js` template.                                                                                                      |
| Decide retroactive receipts scope (OP-5)                                | Before 5.12.5   | ≈10 existing paid `PaymentTransaction` records. If yes → separate 5.12.6 backfill contour.                                                                            |
| Decide receipt email timing (OP-6)                                      | Before 5.12.2   | On `PaymentTransaction.create("paid")` or after YeshInvoice confirms.                                                                                                 |
| Apply `migrate-receipt-indexes.mjs --apply`                             | 5.12.4          | Manual migration. Run `--dry-run` first. Never auto-applied.                                                                                                          |
| Set `YESH_INVOICE_ENABLED=true` on Render                               | 5.12.5          | Final production enablement gate. Only after all billing gates (G2, G4b, G6, G7) closed.                                                                              |

---

## 11. Exact Operator Questions Still Open

These are the 6 unanswered questions that block YeshInvoice implementation. No others. These are not documentation gaps — they are genuine business/operator decisions required before code is written.

| #    | Question                                                                                                                                            | Impact if not answered                                                                         |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| OP-1 | Is Cardigo/Digitalyty registered as עוסק פטור or עוסק מורשה?                                                                                        | Cannot determine correct YeshInvoice document type API parameter                               |
| OP-2 | What are the YeshInvoice sandbox API URL and API token?                                                                                             | Cannot do any sandbox testing of receipt creation                                              |
| OP-3 | PDF storage: use YeshInvoice native download URL, or store a copy in Supabase?                                                                      | Affects `pdfPath` field design, download endpoint, and whether Supabase bucket setup is needed |
| OP-4 | Receipt email language: Hebrew only or bilingual?                                                                                                   | Affects `mailjet.service.js` template design                                                   |
| OP-5 | Issue retroactive receipts for the ~10 existing paid `PaymentTransaction` records once YeshInvoice is live?                                         | Determines whether 5.12.6 backfill contour is in scope                                         |
| OP-6 | When should the receipt email be sent: immediately when `PaymentTransaction` is created as `"paid"`, or only after YeshInvoice confirms generation? | Affects the fire point of `sendReceiptEmailMailjetBestEffort` inside `createReceiptBestEffort` |

---

## 12. Evidence Appendix — Canonical Docs

| Document                                                  | Best for                                                                                                                                                                                                                                             |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/runbooks/billing-flow-ssot.md`                      | Canonical billing architecture, pricing SSoT, event sequence, ACK policy, idempotency, PaymentTransaction model, all billing gate definitions. **Read this first for any billing question.**                                                         |
| `docs/runbooks/cardigo_billing_support_runbook.md`        | Support and incident handling. How to query the billing state for a user. What to do when a charge fails. E2E proof record.                                                                                                                          |
| `docs/runbooks/tranzila-go-live-checklist.md`             | Pre-production checklist: env vars required, terminal config, Netlify notify URL, STO env config, go-live gate sequence.                                                                                                                             |
| `docs/runbooks/yeshinvoice-groundwork-architecture.md`    | Architecture truth for future YeshInvoice integration: current billing chain, trigger truth (why `PaymentTransaction.status="paid"` is canonical), future Receipt architecture, endpoint/DTO map, idempotency rules, production enablement boundary. |
| `docs/runbooks/yeshinvoice-integration-runbook.md`        | Ordered implementation plan for YeshInvoice: operator checklist (OP-1–6), developer checklist (D1–D10), verification checklist, failure classification table, rollback/disablement strategy, contour log (5.12.1–5.12.6).                            |
| `docs/runbooks/yeshinvoice-code-patterns-and-examples.md` | Every grounded code example (file:line) for current billing patterns + future proposed hook patterns. Anti-drift rules (D1–D10). Endpoint/payload examples clearly labeled CURRENT EXISTING vs FUTURE PROPOSED.                                      |

---

## 13. Ready-for-Next-Chat Note

### Do first

1. Read §1 (executive snapshot) and §7 (closed contours) to orient.
2. Confirm the active question: which contour is being opened? Phase A (production billing) or Phase C/D (YeshInvoice)?
3. If billing production: start with 5.10d (cancel sandbox STO schedules). This is a manual operator action, not a code change.
4. If YeshInvoice: confirm OP-1 through OP-6 are answered. Do not begin any implementation until all 6 are resolved.

### Do NOT do first

- Do not begin YeshInvoice implementation before OP decisions are answered and billing gates G2/G4b/G6/G7 are closed.
- Do not change `PRICES_AGOROT` before 5.10d (sandbox STO cancellation) is complete.
- Do not set `YESH_INVOICE_ENABLED=true` on Render for any reason.
- Do not treat the groundwork docs as implementation approval — they are planning documents only.
- Do not open Phase 2 of any billing contour without a Phase 1 read-only audit as per the Execution Protocol in `copilot-instructions.md §0`.

### What contour should be opened next

**5.10d** — Cancel the 2 active sandbox STO schedules (valik + neiron test accounts) at the Tranzila portal. This is a manual operator step that unlocks the entire remaining production billing sequence (5.10e → 5.10f → 5.10g).

Alternatively, if the operator prefers to work on YeshInvoice operator decisions in parallel: answer OP-1 through OP-6 and record them in `docs/runbooks/yeshinvoice-integration-runbook.md §C`. This unblocks the start of 5.12.1 independently of the billing production sequence.

---

_End of handoff. No source files changed. No runtime logic touched. No env changed. No DB written._
