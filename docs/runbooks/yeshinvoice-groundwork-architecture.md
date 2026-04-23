# YeshInvoice Groundwork Architecture

**Contour:** 5.12.0 — YeshInvoice groundwork docs  
**Status:** GROUNDWORK ONLY — no implementation exists  
**Created:** 2026-04-23  
**See also:** `docs/runbooks/billing-flow-ssot.md` §9 (deferral policy and gate list)

---

## A. Executive Summary

### What is already ready (CURRENT TRUTH)

- Full Tranzila billing lifecycle is implemented and sandbox-proven:
    - First payment (DirectNG hosted checkout) → server-to-server notify → fulfillment → `PaymentTransaction` ledger record
    - STO recurring schedule create (post-fulfillment, non-blocking, `TRANZILA_STO_CREATE_ENABLED` flag)
    - STO recurring charge webhook (`handleStoNotify`) → ledger record → subscription extension
    - Failed renewal detection, marker, email, and UI banner
    - Self-service cancel-renewal (product UI + `POST /api/account/cancel-renewal`)
    - `billingReconcile` job: expires stale active subscriptions, stamps `downgradedAt`, triggers retention purge
- **`PaymentTransaction.receiptId`** FK anchor already exists as `ObjectId ref "Receipt", default null`. PROOF: `backend/src/models/PaymentTransaction.model.js:54–60`
- `PaymentTransaction.status` enum includes `"paid"`, `"failed"`, `"pending"`, `"refunded"`. The canonical receipt trigger is `status === "paid"`.
- **Mailjet service** pattern is established: best-effort fire-and-forget email functions, each returning `{ ok: true/false }`. PROOF: `backend/src/services/mailjet.service.js:825`

### What is NOT implemented

- `Receipt` model — does not exist
- `yeshinvoice.service.js` — does not exist
- `sendReceiptEmailMailjetBestEffort` — does not exist
- Receipt retry job — does not exist
- `GET /api/account/receipts` — does not exist
- `GET /api/account/receipts/:id/download` — does not exist
- Receipt section in admin API — does not exist

### What is blocked for production

See `billing-flow-ssot.md §9` for the canonical gate list. Summary:

- Gate 2: Failed-STO retry/recovery — open
- Gate 4b: STO create observability structured log — open
- Gate 6: Production terminal cutover — open
- Gate 7: Tranzila recurring lifecycle proven in production — open

All 4 remaining gates must close before YeshInvoice is enabled in production.  
Behind-flag scaffolding (Receipt model, service, email) may begin once operator questions are answered (see §G below).

### What this groundwork package does and does not mean

**Does:** documents current billing chain, proposed future integration architecture, existing code patterns to reuse, runbook and checklist for future implementation contour.

**Does NOT:** constitute approval to implement YeshInvoice, create a Receipt model, add env vars to Render/Netlify, change billing runtime, or enable any production feature.

---

## B. Current Billing Runtime Chain (CURRENT TRUTH)

### B1. First Payment Flow

**Trigger:** Authenticated user clicks payment CTA in `SettingsPanel` or `/pricing`. Calls `POST /api/payments/create`.

| Step                                  | Function / Route                                                                                     | File                                                    | What happens                                                                                            |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----- |
| 1. Create payment                     | `POST /api/payments/create`                                                                          | `backend/src/routes/payment.routes.js`                  | `requireAuth` → `paymentProvider.createPayment({userId, plan})` → returns Tranzila hosted checkout URL  |
| 2. User completes payment on Tranzila | Tranzila DirectNG hosted checkout                                                                    | External (Tranzila)                                     | Card data captured; `TranzilaTK` token returned in notify; user redirected to `/pricing?payment=success | fail` |
| 3. Server-to-server notify            | `POST /api/payments/notify` (via Netlify proxy)                                                      | `backend/src/routes/payment.routes.js`                  | No-auth, MUST-if-set `x-cardigo-notify-token` defense                                                   |
| 4. Handle notify                      | `handleNotify(payload)`                                                                              | `backend/src/services/payment/tranzila.provider.js:808` | Trust evaluation, status determination, ledger insert, fulfillment                                      |
| 5. Ledger insert                      | `PaymentTransaction.create(...)`                                                                     | `tranzila.provider.js:911`                              | Written BEFORE User/Card mutation. E11000 on duplicate → silent no-op (L924)                            |
| 6. Status determination               | `isPaid = trustOk && responseOk; status = isPaid ? "paid" : "failed"`                                | `tranzila.provider.js:894`                              | Dual-mode trust: DirectNG (sum, supplier, currency, index) or legacy signature                          |
| 7. If not paid → stop                 | Early return                                                                                         | `tranzila.provider.js:930–932`                          | Failed txn in ledger; no User/Card change                                                               |
| 8. Fulfillment                        | `user.plan`, `user.subscription`, `user.renewalFailedAt = null`, `user.save()`, `Card.updateOne()×2` | `tranzila.provider.js:940–1000`                         | User + Card billing updated                                                                             |
| 9. STO schedule create (non-blocking) | `createTranzilaStoForUser(user, plan, expiresAt)`                                                    | `tranzila.provider.js:1015`                             | Only if `TRANZILA_STO_CREATE_ENABLED === "true"`. Swallowed on failure. Never blocks fulfillment.       |

**Receipt hook point (FUTURE):** After step 5, when `status === "paid"` and `provider !== "mock"` — best-effort, non-blocking.

### B2. STO Create Flow

**Trigger:** Automatically invoked at end of successful `handleNotify` when `TRANZILA_STO_CREATE_ENABLED === "true"`.

| Step                  | Function                                                | File                           | What happens                                                                 |
| --------------------- | ------------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------- |
| 1. Feature flag check | `isStoCreateEnabled()`                                  | `tranzila.provider.js:181–186` | Strict string equality: `process.env.TRANZILA_STO_CREATE_ENABLED === "true"` |
| 2. Idempotency guard  | Guard A                                                 | `tranzila.provider.js:368`     | If `user.tranzilaSto.stoId` exists and `status === "created"` → skip         |
| 3. Write-ahead        | `user.tranzilaSto.status = "pending"`                   | `tranzila.provider.js`         | Before API call                                                              |
| 4. API call           | `buildTranzilaApiAuthHeaders()` + `POST /v2/sto/create` | `tranzila.provider.js`         | HMAC SHA-256 auth                                                            |
| 5. Success            | `status = "created"`, `stoId` persisted                 |                                |                                                                              |
| 6. Failure            | `status = "failed"`                                     |                                | Swallowed — fulfillment NOT rolled back                                      |

**Receipt hook:** Does NOT apply. STO create is not a payment event.

### B3. STO Recurring Notify Flow

**Trigger:** Tranzila My Billing fires a server-to-server webhook on each recurring charge date.

| Step                 | Function / Route                                                                               | File                                   | What happens                                                                                    |
| -------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1. Webhook arrives   | `POST /api/payments/sto-notify`                                                                | `backend/src/routes/payment.routes.js` | Fail-closed 503 if `CARDIGO_STO_NOTIFY_TOKEN` missing; token validated from `?snk=` query param |
| 2. Handle STO notify | `handleStoNotify(payload)`                                                                     | `tranzila.provider.js:1049`            | Validation, ledger insert, subscription extension                                               |
| 3. Core invariant    | Ledger written BEFORE User/Card mutation                                                       | `tranzila.provider.js:1042–1044`       | E11000 on duplicate → return without User/Card change                                           |
| 4. Failure cases     | `supplier_mismatch`, `amount_mismatch`, `currency_mismatch`, `user_not_found`, `sto_cancelled` | `tranzila.provider.js`                 | Failed txn written to ledger; no subscription extension                                         |
| 5. Success case      | `status = "paid"`, subscription extended `max(now, currentExpiry) + 30 days`                   | `tranzila.provider.js`                 | `user.subscription.expiresAt` and `card.billing.paidUntil` updated                              |

**Receipt hook point (FUTURE):** After step 3, when paid txn successfully committed and `provider !== "mock"` — best-effort, non-blocking.

### B4. Failed Renewal Flow (STO charge rejection)

**Trigger:** `handleStoNotify` receives a payload where `Response !== "000"`.

| Step                                           | What happens                                                                       |
| ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| Failed txn written to ledger                   | `status = "failed"`, `failReason` set                                              |
| `user.renewalFailedAt` stamped                 | If not already set                                                                 |
| `sendRenewalFailedEmailMailjetBestEffort(...)` | Best-effort, fire-and-forget. PROOF: `backend/src/services/mailjet.service.js:825` |
| UI banner shown in SettingsPanel               | When `renewalFailedAt !== null && paidUntil > now && renewalStatus === "active"`   |

**Receipt hook:** Does NOT apply. Failed txns do NOT trigger receipts.

### B5. Self-Service Cancel-Renewal Flow

**Trigger:** User clicks "ביטול חידוש אוטומטי" button in SettingsPanel.

| Step                               | What happens                                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `POST /api/account/cancel-renewal` | `requireAuth`; rate-limited 3/10min per userId                                                         |
| Provider-first                     | `cancelTranzilaStoForUser` called before any Mongo write                                               |
| Mongo write                        | `tranzilaSto.status = "cancelled"`, `cancellationSource = "self_service"` only after provider confirms |
| Premium remains                    | `subscription.expiresAt` and `card.billing.paidUntil` NOT changed                                      |
| Response                           | `{ ok: true, renewalStatus: "cancelled", autoRenewal: {...}, messageKey: "cancelled" }`                |

**Receipt hook:** Does NOT apply. Cancellation is not a payment event. No `PaymentTransaction` created.

### B6. `billingReconcile` Job Flow

**Trigger:** `setInterval`, default 6h. Configurable via `BILLING_RECONCILE_INTERVAL_MS`. PROOF: `backend/src/server.js:113–116`, `backend/src/jobs/billingReconcile.js:265`.

| Step                   | What happens                                                                  |
| ---------------------- | ----------------------------------------------------------------------------- |
| Query                  | `subscription.status=active + subscription.expiresAt < now + cardId != null`  |
| CARD-FIRST write order | `card.downgradedAt = now` stamped first (triggers `retentionPurge`)           |
| User write             | `subscription.status = "expired"`, `plan = "free"`                            |
| adminOverride guard    | If `card.adminOverride` active: skip card normalization; still normalize user |
| Sentry cron monitor    | `"billing-reconcile"`                                                         |

**Receipt hook:** Does NOT apply. Downgrade/expiry is not a payment event.

### B7. Retention Purge Interaction

- `downgradedAt` stamped by `billingReconcile` triggers `retentionPurge` job (separate, separate interval)
- Purges: gallery overflow, services, videoUrl, businessHours, premium contact fields
- Defense: skips if card re-upgraded or admin-overridden since downgrade
- PROOF: `backend/src/jobs/retentionPurge.js`

**Receipt hook:** Does NOT apply.

---

## C. Future YeshInvoice Trigger Truth

### Why `PaymentTransaction.status = "paid"` is canonical (CURRENT TRUTH)

**Rule:** A receipt must be issued if and only if a `PaymentTransaction` document exists with `status === "paid"` AND `provider !== "mock"`.

**Why NOT `User.subscription.status`:**

1. `User.subscription.status` can be set to `"active"` by admin tools (`admin.routes.js` billing set/sync endpoints) — these are support grants, not revenue events. A receipt for an admin-granted subscription would be legally and financially incorrect.
2. `User.subscription.status` is also set by the mock provider (`mock.provider.js`) in development. Mock payments must never trigger real YeshInvoice API calls.
3. `billing-flow-ssot.md §3` confirms: server-to-server notify is the sole billing truth source. Browser redirect (`/pricing?payment=success`) is UX only — never a billing trigger.

**The `PaymentTransaction` is the authoritative ledger record.** It is written before any User/Card mutation. An E11000 duplicate on `providerTxnId` is the idempotency fence — if a record already exists, no second receipt can be issued.

### Trigger matrix

| Event                                 | Creates `PaymentTransaction`? | `status`   | `provider`   | Receipt candidate?     |
| ------------------------------------- | ----------------------------- | ---------- | ------------ | ---------------------- |
| First Tranzila payment (trust passes) | ✅ Yes                        | `"paid"`   | `"tranzila"` | ✅ YES                 |
| First Tranzila payment (trust fails)  | ✅ Yes                        | `"failed"` | `"tranzila"` | ❌ No                  |
| STO recurring charge (Response=000)   | ✅ Yes                        | `"paid"`   | `"tranzila"` | ✅ YES                 |
| STO recurring charge (Response≠000)   | ✅ Yes                        | `"failed"` | `"tranzila"` | ❌ No                  |
| Mock provider notify                  | ✅ Yes                        | `"paid"`   | `"mock"`     | ❌ No (provider guard) |
| Admin billing set/revoke              | ❌ No                         | —          | —            | ❌ No                  |
| Cancel-renewal                        | ❌ No                         | —          | —            | ❌ No                  |
| `billingReconcile` downgrade          | ❌ No                         | —          | —            | ❌ No                  |
| Webhook replay (duplicate)            | E11000 no-op                  | —          | —            | ❌ No (idempotency)    |

---

## D. Future Receipt Architecture (FUTURE PROPOSED)

> **All content in this section is FUTURE PROPOSED architecture only.**  
> No Receipt model, no YeshInvoice service, no receipt email exists at the time of this writing.

### D1. Receipt Model Role

The `Receipt` model will serve as the **provider document record** — distinct from `PaymentTransaction` (the ledger record). `PaymentTransaction` is the billing truth; `Receipt` is the receipt issuance record.

The two are linked via `PaymentTransaction.receiptId` (already exists as FK anchor: `backend/src/models/PaymentTransaction.model.js:54–60`).

**FUTURE PROPOSED `Receipt` schema fields:**

| Field                  | Type                                           | Purpose                                         |
| ---------------------- | ---------------------------------------------- | ----------------------------------------------- |
| `userId`               | ObjectId ref User                              | Receipt owner                                   |
| `paymentTransactionId` | ObjectId ref PaymentTransaction                | Back-link to the triggering txn                 |
| `providerDocId`        | String                                         | YeshInvoice document/receipt ID returned by API |
| `pdfPath`              | String                                         | URL or storage path of the receipt PDF          |
| `receiptStatus`        | enum: `"pending"` \| `"created"` \| `"failed"` | Lifecycle state                                 |
| `emailSentAt`          | Date (null until sent)                         | When the receipt email was dispatched           |
| `timestamps`           | createdAt, updatedAt                           | Standard Mongoose                               |

**FUTURE PROPOSED index:** unique on `paymentTransactionId` (one receipt per transaction). Must follow `migrate-paymenttransaction-indexes.mjs` pattern — no auto-index.

### D2. `receiptId` Back-Link on `PaymentTransaction`

`PaymentTransaction.receiptId` (ObjectId ref "Receipt", default null) already exists in the schema. When a `Receipt` is created for a `PaymentTransaction`, the back-link is set:

```
PaymentTransaction.findByIdAndUpdate(txnId, { $set: { receiptId: receipt._id } })
```

### D3. `receiptStatus` Lifecycle (FUTURE PROPOSED)

```
[trigger: paid txn] → Receipt.create({ receiptStatus: "pending" })
                    → [YeshInvoice API call]
                    → success → receiptStatus = "created", providerDocId set
                    → failure → receiptStatus = "failed" (queued for retry)
```

### D4. Best-Effort Creation After Paid Txn (FUTURE PROPOSED)

Receipt creation must be **best-effort and non-blocking**. The 200 ACK to Tranzila must not wait for YeshInvoice success. Pattern:

```js
// After PaymentTransaction.create({ status: "paid", ... }) — fire-and-forget
createReceiptBestEffort({
    userId,
    paymentTransactionId: txn._id,
    plan,
    amountAgorot,
}).catch((err) =>
    console.error("[receipt] best-effort fire-and-forget error", {
        error: err?.message,
    }),
);
```

### D5. Provider Guard (FUTURE PROPOSED)

YeshInvoice must never be called when `PaymentTransaction.provider === "mock"`. This ensures dev/test environments cannot accidentally hit the real YeshInvoice API.

```js
if (txn.provider === "mock")
    return { ok: true, skipped: true, reason: "mock_provider" };
```

### D6. Retry Strategy Concept (FUTURE PROPOSED)

A background job (`startReceiptRetryJob`) will query `Receipt.receiptStatus === "failed"` records and re-attempt creation. Pattern mirrors `billingReconcile.js` (running-flag guard, Sentry cron monitor, configurable interval via `RECEIPT_RECONCILIATION_INTERVAL_MS`).

Idempotency: attempt to re-call YeshInvoice only if `receiptStatus === "failed"` and `providerDocId` is null (no partial-success state).

### D7. Retrieval / Download Concept (FUTURE PROPOSED)

Cabinet endpoints:

- `GET /api/account/receipts` — returns paginated list of receipts for the authenticated user (reads `Receipt` model, not `PaymentTransaction`)
- `GET /api/account/receipts/:id/download` — returns a signed download URL or streams the PDF

The `PaymentTransaction` ledger is NOT exposed directly to the cabinet. Cabinet reads `Receipt` only.

---

## E. Endpoint / DTO / Payload Map

### CURRENT EXISTING CONTRACTS

#### `GET /api/account/me` — Account DTO

PROOF: `backend/src/routes/account.routes.js:186–205`

```json
{
    "firstName": "string | null",
    "email": "string",
    "role": "string",
    "plan": "free | monthly | yearly",
    "subscription": {
        "status": "inactive | active | expired",
        "expiresAt": "ISO date | null",
        "provider": "tranzila | mock | null"
    },
    "autoRenewal": {
        "status": "active | cancelled | pending | failed | none",
        "canCancel": "boolean",
        "cancelledAtPresent": "boolean",
        "subscriptionExpiresAt": "ISO date | null"
    },
    "orgMemberships": "array",
    "createdAt": "ISO date | null"
}
```

Note: `autoRenewal` does NOT expose `stoId`, `tranzilaToken`, or raw provider fields. PROOF: `account.routes.js:83–98`.

#### `PaymentTransaction` stored fields

PROOF: `backend/src/models/PaymentTransaction.model.js:1–65`

| Field                    | Type                                                | Notes                                           |
| ------------------------ | --------------------------------------------------- | ----------------------------------------------- |
| `providerTxnId`          | String, required                                    | Unique index (manual). Idempotency fence.       |
| `provider`               | enum: `tranzila` \| `mock` \| `admin`               | Receipt guard: check `!== "mock"`               |
| `userId`                 | ObjectId ref User                                   | May be null on early-validation failures        |
| `cardId`                 | ObjectId ref Card                                   | May be null                                     |
| `plan`                   | enum: `monthly` \| `yearly` \| null                 |                                                 |
| `amountAgorot`           | Number                                              | Integer agorot                                  |
| `currency`               | String, default `"ILS"`                             |                                                 |
| `payloadAllowlisted`     | Object                                              | Sanitized audit payload — no raw secrets        |
| `rawPayloadHash`         | String                                              | SHA-256 of raw payload                          |
| `status`                 | enum: `pending` \| `paid` \| `failed` \| `refunded` |                                                 |
| `idempotencyNote`        | String                                              | e.g. `"sto_recurring_notify"`                   |
| `receiptId`              | ObjectId ref Receipt, default null                  | **FK anchor — already exists**                  |
| `failReason`             | String                                              | e.g. `"supplier_mismatch"`, `"amount_mismatch"` |
| `createdAt`, `updatedAt` | timestamps                                          |                                                 |

#### `POST /api/payments/notify` — first-payment webhook

No-auth endpoint. `CARDIGO_NOTIFY_TOKEN` defense. Payload is `application/x-www-form-urlencoded` from Tranzila DirectNG.

#### `POST /api/payments/sto-notify` — recurring webhook

No-auth endpoint. Fail-closed 503 if `CARDIGO_STO_NOTIFY_TOKEN` missing. Token from `?snk=` query param.

#### `POST /api/account/cancel-renewal` — self-service cancel

`requireAuth`. Rate-limited 3/10min per userId. No request body. Returns `cancel-renewal` DTO (see `billing-flow-ssot.md §15`).

---

### FUTURE PROPOSED CONTRACTS

> All items below are proposals only. No runtime implementation exists.

#### FUTURE PROPOSED: `Receipt` DTO (cabinet-facing)

```json
{
    "id": "ObjectId string",
    "paymentTransactionId": "ObjectId string",
    "receiptStatus": "pending | created | failed",
    "providerDocId": "string | null",
    "pdfUrl": "string | null",
    "emailSentAt": "ISO date | null",
    "createdAt": "ISO date"
}
```

#### FUTURE PROPOSED: `GET /api/account/receipts`

Returns receipts for the authenticated user. Reads `Receipt` model only — does not expose `PaymentTransaction` raw fields.

#### FUTURE PROPOSED: `GET /api/account/receipts/:id/download`

Returns a download URL or streamed PDF for a receipt belonging to the authenticated user.

#### FUTURE PROPOSED: Internal receipt creation input

```js
// Input to future createReceiptBestEffort()
{
  userId: ObjectId,
  paymentTransactionId: ObjectId,
  plan: "monthly" | "yearly",
  amountAgorot: number,   // integer agorot
  provider: "tranzila"    // must be !== "mock"
}
```

#### FUTURE PROPOSED: YeshInvoice API integration

> **PROPOSED EXAMPLE — NOT VERIFIED PROVIDER CONTRACT.**  
> Exact endpoint paths, request/response shape, auth method, and required fields must be confirmed from YeshInvoice API documentation before implementation.

The integration will use bearer-token auth via `YESH_INVOICE_API_TOKEN`. The client will be implemented in `backend/src/services/yeshinvoice.service.js`, following the pattern of `buildTranzilaApiAuthHeaders()` in `tranzila.provider.js`.

**Do not implement before:** YeshInvoice sandbox credentials are obtained and exact API contract is confirmed.

---

## F. Idempotency / Failure / Retry / Rollback Rules

### F1. What creates a receipt candidate

A `PaymentTransaction` with `status === "paid"` and `provider !== "mock"` is the sole receipt candidate. One receipt per transaction — enforced by the unique index on `Receipt.paymentTransactionId`.

### F2. What must be idempotent

- **YeshInvoice API call:** If a receipt creation attempt is replayed (e.g. by the retry job), the service must check whether a `Receipt` document already exists for the `paymentTransactionId` before calling the API. If `receiptStatus === "created"`, skip silently.
- **Webhook replay (Tranzila):** Already idempotent via `providerTxnId` E11000 guard. A replayed webhook creates no second `PaymentTransaction` and therefore no second receipt.
- **Admin grants:** Do not create `PaymentTransaction` records; therefore cannot trigger receipt creation accidentally.

### F3. What happens on duplicate webhook replay

1. Tranzila replays a webhook for an already-processed `providerTxnId`.
2. `PaymentTransaction.create()` throws E11000.
3. Handler catches E11000 and returns silently — no User/Card mutation, no receipt creation.
4. PROOF: `tranzila.provider.js:924` (first-payment), `tranzila.provider.js:1042–1044` (STO).

### F4. What happens if YeshInvoice fails

1. `createReceiptBestEffort` is called after `PaymentTransaction.create()` with `status="paid"`.
2. `Receipt.create({ receiptStatus: "pending", ... })` written first (write-ahead).
3. YeshInvoice API call fails (network, timeout, rate-limit, server error).
4. `Receipt.receiptStatus` updated to `"failed"`. `providerDocId` remains null.
5. `PaymentTransaction.receiptId` is NOT populated (or is set to the failed Receipt's `_id` for tracking).
6. **The 200 ACK to Tranzila is not affected.** Fulfillment is already complete.
7. Retry job picks up `receiptStatus === "failed"` records and re-attempts.

### F5. Why payment fulfillment must never block

The Tranzila webhook expects a 200 ACK within a short timeout window. Any failure in the receipt path that caused a 5xx response would result in Tranzila retrying the webhook. The `PaymentTransaction.create()` E11000 guard ensures a duplicate replay has no side effects, but the receipt creation path must be fully decoupled from the ACK to prevent cascading failures.

**Pattern:** fire-and-forget `Promise.catch()` or explicit `try/catch` with swallowed error, matching `sendRenewalFailedEmailMailjetBestEffort` pattern (`mailjet.service.js:825`).

### F6. Rollback / Disablement Strategy (FUTURE PROPOSED)

Feature flag for YeshInvoice (design only — env var name TBD):

- `YESH_INVOICE_ENABLED === "true"` (strict string equality — same pattern as `TRANZILA_STO_CREATE_ENABLED`)
- Default safe state: `false` (absent, `"false"`, or any other value = disabled)
- Rollback: set `YESH_INVOICE_ENABLED=false` on Render → takes effect immediately on next webhook (no restart required if read per-request)
- Gated startup validation: if `YESH_INVOICE_ENABLED=true`, validate `YESH_INVOICE_API_URL` and `YESH_INVOICE_API_TOKEN` at startup (fail-fast), following pattern at `backend/src/services/payment/index.js:22–36`

---

## G. Production Enablement Boundary

### Groundwork ready (current state)

- ✅ Architecture documented (this document)
- ✅ Implementation patterns documented (`yeshinvoice-code-patterns-and-examples.md`)
- ✅ Runbook documented (`yeshinvoice-integration-runbook.md`)
- ✅ `PaymentTransaction.receiptId` FK anchor exists in schema
- ✅ `billing-flow-ssot.md` gate list corrected (5.11)
- ✅ Operator questions identified (see §G3 below)

### Implementation ready (preconditions before any code is written)

- [ ] Operator confirms Israeli tax document type: **קבלה** (receipt, for עוסק פטור) vs **חשבונית מס קבלה** (tax invoice + receipt, for עוסק מורשה)
- [ ] YeshInvoice account created; sandbox credentials available (`YESH_INVOICE_API_URL`, `YESH_INVOICE_API_TOKEN` sandbox values)
- [ ] Exact YeshInvoice API contract confirmed (endpoint, auth, required fields, response shape)
- [ ] PDF storage strategy decided: YeshInvoice native PDF URL vs Supabase storage
- [ ] Receipt email language decided: Hebrew only or bilingual

### Production ready (preconditions before `YESH_INVOICE_ENABLED=true` on Render)

All of the above PLUS all remaining billing-flow-ssot.md gates:

- [ ] Gate 2: Failed-STO retry/recovery (5.10h)
- [ ] Gate 4b: STO create observability (5.10i)
- [ ] Gate 6: Production terminal cutover (5.10f)
- [ ] Gate 7: Production E2E lifecycle proof (5.10g)
- [ ] YeshInvoice sandbox E2E proven (receipt created + email sent for a test payment)
- [ ] Receipt env vars set on Render (`YESH_INVOICE_API_URL`, `YESH_INVOICE_API_TOKEN`, `MAILJET_RECEIPT_SUBJECT`)
- [ ] `YESH_INVOICE_ENABLED=true` only in approved rollout window

### Open Operator Decisions (must answer before implementation begins)

1. **Document type:** עוסק פטור (קבלה) or עוסק מורשה (חשבונית מס קבלה)?
2. **YeshInvoice account:** Sandbox credentials available?
3. **PDF strategy:** YeshInvoice native download URL or Supabase?
4. **Receipt email language:** Hebrew only or bilingual?
5. **Retroactive receipts:** Issue receipts for the 10 existing paid `PaymentTransaction` records once live?
6. **Receipt email timing:** Immediately on `PaymentTransaction` creation or after YeshInvoice confirmation?
