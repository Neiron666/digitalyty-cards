# YeshInvoice Code Patterns and Examples

**Contour:** 5.12.0 — YeshInvoice groundwork docs  
**Status:** GROUNDWORK ONLY — patterns and examples only; no runtime implementation  
**Created:** 2026-04-23  
**Dependencies:** `docs/runbooks/yeshinvoice-groundwork-architecture.md` (read first)

---

> **Label convention used throughout this document:**
>
> - **CURRENT EXISTING** — code that exists in the repo today (verified with file:line proof)
> - **FUTURE PROPOSED** — code that does not exist; patterns illustrating how it should be written when the implementation contour begins

---

## A. Current Grounded Examples (CURRENT EXISTING)

### A1. Feature flag: strict string equality pattern

**Source:** `backend/src/services/payment/tranzila.provider.js:181–186`

```js
// CURRENT EXISTING — isStoCreateEnabled()
function isStoCreateEnabled() {
    return process.env.TRANZILA_STO_CREATE_ENABLED === "true";
}
```

**YeshInvoice equivalent (FUTURE PROPOSED):**

```js
// FUTURE PROPOSED — isYeshInvoiceEnabled()
function isYeshInvoiceEnabled() {
    return process.env.YESH_INVOICE_ENABLED === "true";
}
```

The strict `=== "true"` string check (NOT `!!value`, NOT `Boolean(value)`) is the project standard. Any value other than the exact string `"true"` means disabled.

---

### A2. Gated startup validation pattern

**Source:** `backend/src/services/payment/index.js:22–36`

```js
// CURRENT EXISTING — Tranzila STO startup gate
const isTranjila = process.env.PAYMENT_PROVIDER === "tranzila";
const isStoEnabled = process.env.TRANZILA_STO_CREATE_ENABLED === "true";

if (isTranjila && isStoEnabled) {
    const required = [
        "TRANZILA_STO_TERMINAL",
        "TRANZILA_STO_API_URL",
        "TRANZILA_API_APP_KEY",
        "TRANZILA_API_PRIVATE_KEY",
    ];
    for (const key of required) {
        if (!process.env[key]) {
            throw new Error(
                `[startup] ${key} is required when TRANZILA_STO_CREATE_ENABLED=true`,
            );
        }
    }
}
```

**YeshInvoice equivalent (FUTURE PROPOSED) — add to `backend/src/services/payment/index.js` following the same pattern:**

```js
// FUTURE PROPOSED — YeshInvoice startup gate
const isYeshInvoiceEnabled = process.env.YESH_INVOICE_ENABLED === "true";
if (isYeshInvoiceEnabled) {
    const yiRequired = ["YESH_INVOICE_API_URL", "YESH_INVOICE_API_TOKEN"];
    for (const key of yiRequired) {
        if (!process.env[key]) {
            throw new Error(
                `[startup] ${key} is required when YESH_INVOICE_ENABLED=true`,
            );
        }
    }
}
```

---

### A3. Best-effort fire-and-forget pattern (email)

**Source:** `backend/src/services/mailjet.service.js:825` — `sendRenewalFailedEmailMailjetBestEffort`

```js
// CURRENT EXISTING — call site pattern (from tranzila.provider.js)
sendRenewalFailedEmailMailjetBestEffort({
    toEmail: user.email,
    userId: user._id,
    // ... other fields
}).catch((err) => {
    console.error("[mailjet] renewal-failed email error", {
        error: err?.message,
    });
});
// Caller does NOT await. Does NOT check return value. Does NOT block ACK.
```

Key characteristics of the best-effort pattern:

- Function returns `{ ok: true/false }` — never throws
- Input validation returns `{ ok: false, skipped: true, reason: "INVALID_INPUT" }` (not throw)
- `MAILJET_NOT_CONFIGURED` returns `{ ok: true, skipped: true, reason: "MAILJET_NOT_CONFIGURED" }` (not throw)
- Auth encoded as `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`
- Timeout: 10_000 ms
- Errors logged with `console.error("[mailjet] ...")` — no rethrow

---

### A4. Mongoose schema: FK anchor with ObjectId ref

**Source:** `backend/src/models/PaymentTransaction.model.js:54–60` — the already-existing `receiptId` field

```js
// CURRENT EXISTING — receiptId field in PaymentTransaction schema
receiptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Receipt",
    default: null,
},
```

This FK anchor is already in the schema. When a `Receipt` document is created, this field is populated. The receipt can be joined: `PaymentTransaction.findById(txnId).populate("receiptId")`.

---

### A5. Index declaration pattern (manual — no autoIndex)

**Source:** `backend/src/models/PaymentTransaction.model.js:67–70`

```js
// CURRENT EXISTING — manual index declaration, NOT auto-applied
// autoIndex is OFF globally (db.js); this index is NOT created at runtime.
// To create: run manual migration script with --apply --create-index.
paymentTransactionSchema.index({ providerTxnId: 1 }, { unique: true });
```

**YeshInvoice equivalent (FUTURE PROPOSED) — in Receipt model:**

```js
// FUTURE PROPOSED — unique index on paymentTransactionId
// autoIndex is OFF globally — NOT created at runtime — manual migration required.
receiptSchema.index({ paymentTransactionId: 1 }, { unique: true });
```

---

### A6. Ledger-first write order invariant

**Source:** `backend/src/services/payment/tranzila.provider.js:1042–1044`

```
// CURRENT EXISTING — documented invariant in handleStoNotify
// Core invariant: no User/Card mutation before successful PaymentTransaction.create.
// Success path: validate user fully FIRST, then create paid txn, then extend.
// Duplicate (E11000): return without any User/Card mutation.
```

**Source:** First-payment ledger write at `tranzila.provider.js:911` — written BEFORE `user.save()` at `tranzila.provider.js:969`.

This invariant means: if `PaymentTransaction.status === "paid"` exists, fulfillment is guaranteed to have succeeded (or to be in progress on the same write). The receipt hook fires AFTER fulfillment writes, giving a stable ledger entry to reference.

---

### A7. STO non-blocking hook position

**Source:** `backend/src/services/payment/tranzila.provider.js:1013–1015`

```js
// CURRENT EXISTING — STO create: non-blocking, after full fulfillment
// STO is a follow-on lifecycle operation and must not block first-payment fulfillment.
if (isStoCreateEnabled()) {
    try {
        const stoResult = await createTranzilaStoForUser(
            user,
            validPlan,
            expiresAt,
        );
        // ...
    } catch (_stoErr) {
        // Swallow — first payment is already fulfilled. Do not rethrow.
    }
}
```

This is the model for the receipt hook position. The receipt fires in the same post-fulfillment zone, after all `user.save()` and `Card.updateOne()` calls, BEFORE or ALONGSIDE the STO create block.

---

### A8. E11000 idempotency handling pattern

**Source:** `backend/src/services/payment/tranzila.provider.js:909–924`

```js
// CURRENT EXISTING — ledger insert with E11000 idempotency
let txn;
try {
    txn = await PaymentTransaction.create({
        providerTxnId,
        provider: "tranzila",
        userId,
        // ...
        status,
    });
} catch (err) {
    if (err?.code === 11000) {
        // Already processed — idempotent no-op. No User/Card change.
        return;
    }
    throw err; // Infra failure → propagate → route returns 500 → Tranzila retries
}
```

Receipt creation must perform the same idempotency check on `paymentTransactionId` (via unique index on `Receipt.paymentTransactionId`). A 11000 on the Receipt create means a receipt is already in progress — skip silently.

---

### A9. `buildAutoRenewalDto` — safe DTO pattern (no raw provider fields)

**Source:** `backend/src/routes/account.routes.js:83–98`

```js
// CURRENT EXISTING — buildAutoRenewalDto returns safe fields only
function buildAutoRenewalDto(user) {
    // Returns: { status, canCancel, cancelledAtPresent, subscriptionExpiresAt }
    // Does NOT expose: stoId, tranzilaToken, raw STO payload, billing secrets
}
```

The cabinet receipt DTO must follow the same discipline: no raw `providerDocId` (if it is an internal YeshInvoice ID), no full `pdfPath` if it contains a raw signed URL that leaks credentials. Return a clean, bounded DTO from cabinet endpoints.

---

## B. Future Proposed Hook Examples (FUTURE PROPOSED)

> All code in this section is PROPOSED ONLY. No files exist yet.

### B1. `Receipt` model (FUTURE PROPOSED)

**Future file:** `backend/src/models/Receipt.model.js`

```js
// FUTURE PROPOSED — Receipt model
import mongoose from "mongoose";

const receiptSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        paymentTransactionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PaymentTransaction",
            required: true,
        },
        providerDocId: {
            type: String,
            default: null,
        },
        pdfPath: {
            type: String,
            default: null,
        },
        receiptStatus: {
            type: String,
            enum: ["pending", "created", "failed"],
            required: true,
        },
        emailSentAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true },
);

// NOT auto-applied. Manual migration required. Follow migrate-paymenttransaction-indexes.mjs pattern.
receiptSchema.index({ paymentTransactionId: 1 }, { unique: true });

const Receipt = mongoose.model("Receipt", receiptSchema);

export default Receipt;
```

---

### B2. `yeshinvoice.service.js` — `createReceiptBestEffort` (FUTURE PROPOSED)

**Future file:** `backend/src/services/yeshinvoice.service.js`

```js
// FUTURE PROPOSED — skeleton only; exact YeshInvoice API call requires OP-1/OP-2 decisions
import Receipt from "../models/Receipt.model.js";
import PaymentTransaction from "../models/PaymentTransaction.model.js";

export function isYeshInvoiceEnabled() {
    return process.env.YESH_INVOICE_ENABLED === "true";
}

export async function createReceiptBestEffort({
    userId,
    paymentTransactionId,
    plan,
    amountAgorot,
    provider,
}) {
    // Guard 1: feature flag
    if (!isYeshInvoiceEnabled()) {
        return { ok: true, skipped: true, reason: "disabled" };
    }

    // Guard 2: provider guard — never call YeshInvoice for mock payments
    if (provider === "mock") {
        return { ok: true, skipped: true, reason: "mock_provider" };
    }

    // Guard 3: idempotency — check for existing receipt
    const existing = await Receipt.findOne({ paymentTransactionId });
    if (existing && existing.receiptStatus === "created") {
        return { ok: true, skipped: true, reason: "already_created" };
    }

    let receipt;
    try {
        // Write-ahead: create pending receipt first
        if (!existing) {
            receipt = await Receipt.create({
                userId,
                paymentTransactionId,
                receiptStatus: "pending",
            });
        } else {
            receipt = existing; // retrying a failed receipt
        }

        // YeshInvoice API call — exact parameters depend on OP-1 (document type) decision.
        // EXAMPLE ONLY — do not implement until YeshInvoice API contract is confirmed.
        const apiResult = await callYeshInvoiceApi({
            amountAgorot,
            plan,
            receiptId: receipt._id,
        });

        // On success: update receipt + back-link PaymentTransaction
        await Receipt.findByIdAndUpdate(receipt._id, {
            $set: {
                receiptStatus: "created",
                providerDocId: apiResult.documentId,
                pdfPath: apiResult.pdfUrl,
            },
        });
        await PaymentTransaction.findByIdAndUpdate(paymentTransactionId, {
            $set: { receiptId: receipt._id },
        });

        return { ok: true, receiptId: receipt._id };
    } catch (err) {
        console.error("[yeshinvoice] createReceiptBestEffort failed", {
            userId: String(userId || ""),
            paymentTransactionId: String(paymentTransactionId || ""),
            error: err?.message || err,
        });

        // Update to failed — will be picked up by retry job
        if (receipt?._id) {
            await Receipt.findByIdAndUpdate(receipt._id, {
                $set: { receiptStatus: "failed" },
            }).catch(() => {});
        }

        return { ok: false, error: err?.message };
    }
}
```

---

### B3. First-payment hook wiring in `handleNotify` (FUTURE PROPOSED)

**Target location:** `backend/src/services/payment/tranzila.provider.js` — after `Card.updateOne()` calls (~L1000), before STO create block (~L1013)

```js
// FUTURE PROPOSED — receipt hook after fulfillment, fire-and-forget
// Pattern mirrors STO create block (lines 1013–1030): non-blocking, swallowed error
import { createReceiptBestEffort } from "../yeshinvoice.service.js";

// After Card.updateOne() calls and before if (isStoCreateEnabled()) block:
createReceiptBestEffort({
    userId,
    paymentTransactionId: txn._id,
    plan: validPlan,
    amountAgorot: txn.amountAgorot,
    provider: "tranzila",
}).catch((err) => {
    console.error("[receipt] handleNotify fire-and-forget error", {
        userId: String(userId || ""),
        error: err?.message || err,
    });
    // Swallow — fulfillment is already complete. Do NOT rethrow.
});
```

---

### B4. Recurring hook wiring in `handleStoNotify` (FUTURE PROPOSED)

**Target location:** `backend/src/services/payment/tranzila.provider.js` — after `PaymentTransaction.create({ status: "paid" })` in `handleStoNotify`, before `return { ok: true, ... }`

```js
// FUTURE PROPOSED — recurring receipt hook after paid txn committed
// Same best-effort pattern as first-payment hook.
createReceiptBestEffort({
    userId,
    paymentTransactionId: stoTxn._id,
    plan: stoTxn.plan,
    amountAgorot: stoTxn.amountAgorot,
    provider: "tranzila",
}).catch((err) => {
    console.error("[receipt] handleStoNotify fire-and-forget error", {
        userId: String(userId || ""),
        error: err?.message || err,
    });
    // Swallow — do NOT block the webhook ACK.
});
```

---

### B5. Receipt retry job skeleton (FUTURE PROPOSED)

**Future file:** `backend/src/jobs/receiptRetry.js`

```js
// FUTURE PROPOSED — receipt retry job skeleton
// Pattern: backend/src/jobs/billingReconcile.js (running flag, Sentry cron, configurable interval)
import Receipt from "../models/Receipt.model.js";
import { createReceiptBestEffort } from "../services/yeshinvoice.service.js";

let isRunning = false;

async function runReceiptRetry() {
    if (isRunning) {
        console.warn("[receiptRetry] already running, skipping tick");
        return;
    }
    isRunning = true;
    try {
        // Bounded query — do not process unbounded result sets
        const failedReceipts = await Receipt.find({
            receiptStatus: "failed",
            providerDocId: null,
        })
            .limit(50)
            .lean();

        for (const r of failedReceipts) {
            await createReceiptBestEffort({
                userId: r.userId,
                paymentTransactionId: r.paymentTransactionId,
                plan: null, // plan/amount fetched in service from PaymentTransaction
                amountAgorot: null,
                provider: "tranzila",
            });
        }
    } finally {
        isRunning = false;
    }
}

export function startReceiptRetryJob() {
    const intervalMs =
        parseInt(process.env.RECEIPT_RETRY_INTERVAL_MS, 10) ||
        3 * 60 * 60 * 1000; // default 3h
    setInterval(runReceiptRetry, intervalMs);
    console.info("[receiptRetry] job started", { intervalMs });
}
```

---

### B6. `sendReceiptEmailMailjetBestEffort` skeleton (FUTURE PROPOSED)

**Target file:** `backend/src/services/mailjet.service.js` — add after `sendRenewalFailedEmailMailjetBestEffort`

```js
// FUTURE PROPOSED — receipt email function skeleton
// Pattern: sendRenewalFailedEmailMailjetBestEffort (mailjet.service.js:825)
export async function sendReceiptEmailMailjetBestEffort({
    toEmail,
    firstName,
    receiptUrl,
    amountFormatted, // e.g. "₪39.90"
    plan, // "monthly" | "yearly"
    createdAt, // Date
    userId,
}) {
    const cfg = getMailjetConfig();
    const toEmailNormalized = normalizeEmail(toEmail);

    if (!cfg.enabled) {
        return { ok: true, skipped: true, reason: "MAILJET_NOT_CONFIGURED" };
    }

    if (!toEmailNormalized || !receiptUrl) {
        return { ok: false, skipped: true, reason: "INVALID_INPUT" };
    }

    // subject from cfg.receiptSubject (MAILJET_RECEIPT_SUBJECT env var)
    // default: "קבלה מ-Cardigo"
    // text/HTML body: Hebrew, RTL, branded, includes receiptUrl CTA
    // pattern: sendRenewalFailedEmailMailjetBestEffort for text/HTML structure

    // ... (full implementation follows sendTrialReminderEmailMailjetBestEffort pattern)
    // Returns { ok: true } on 2xx, { ok: false } otherwise. Never throws.
}
```

---

## C. Endpoint / Payload Examples

### C1. CURRENT EXISTING: `POST /api/payments/notify` — first-payment webhook

**Source:** `backend/src/routes/payment.routes.js`, handler calls `tranzila.provider.js:808`

Incoming payload: `application/x-www-form-urlencoded` from Tranzila DirectNG.

Selected fields used by `handleNotify`:

- `Response` — `"000"` = approved
- `supplier` — matched against `TRANZILA_SUPPLIER`
- `sum` — matched against expected amount (plan × agorot → converted to shekels)
- `currency` — `"1"` for ILS
- `index` — Tranzila transaction index for `providerTxnId` derivation
- `TranzilaTK` — token (captured at L808, stored only on paid path at L955, NEVER logged)

Auth defense: `x-cardigo-notify-token` header vs `CARDIGO_NOTIFY_TOKEN` env (if set).

---

### C2. CURRENT EXISTING: `POST /api/payments/sto-notify` — recurring webhook

**Source:** `backend/src/routes/payment.routes.js`, handler calls `tranzila.provider.js:1049`

Auth defense: `?snk=` query param vs `CARDIGO_STO_NOTIFY_TOKEN`. Fail-closed 503 if env var missing.

Incoming payload: `application/json` (STO My Billing notify).

Selected fields used by `handleStoNotify`:

- `Response` — `"000"` = success
- `supplier` — must match `TRANZILA_STO_TERMINAL`
- `sum` — matched against subscription plan expected amount
- `currency` — `"1"` for ILS

---

### C3. CURRENT EXISTING: `GET /api/account/me` response shape

**Source:** `backend/src/routes/account.routes.js:186–205`

Relevant billing fields:

```json
{
    "plan": "free | monthly | yearly",
    "subscription": {
        "status": "inactive | active | expired",
        "expiresAt": "2026-05-22T00:00:00.000Z | null",
        "provider": "tranzila | mock | null"
    },
    "autoRenewal": {
        "status": "active | cancelled | pending | failed | none",
        "canCancel": true,
        "cancelledAtPresent": false,
        "subscriptionExpiresAt": "2026-05-22T00:00:00.000Z | null"
    }
}
```

**No receipt fields in current `/me` DTO.** Receipt data will be at `GET /api/account/receipts` (FUTURE PROPOSED).

---

### C4. FUTURE PROPOSED: `GET /api/account/receipts` response shape

```json
{
    "receipts": [
        {
            "id": "663a1234...",
            "receiptStatus": "created",
            "pdfUrl": "https://...",
            "amountAgorot": 3990,
            "plan": "monthly",
            "createdAt": "2026-04-15T10:00:00.000Z"
        }
    ]
}
```

Note: `providerDocId` (internal YeshInvoice ID) is NOT exposed in the cabinet DTO. `paymentTransactionId` is NOT exposed. No raw Tranzila fields.

---

### C5. FUTURE PROPOSED: `GET /api/account/receipts/:id/download` response

Returns a redirect to a signed PDF URL, or a proxied PDF stream, depending on OP-3 (PDF storage) decision:

- If YeshInvoice native URL: redirect to `pdfPath` (YeshInvoice PDF URL)
- If Supabase: generate a signed URL via Supabase storage SDK, valid for a short duration

Auth: `requireAuth`. Ownership check: `receipt.userId === req.userId` (403/404 if mismatch — apply anti-enumeration policy per `POLICY_ORGS.md` pattern).

---

## D. Anti-Drift / Anti-Regression Rules

### D1. Trigger guard: admin grants must NEVER trigger receipts

**Rule:** A receipt must only be issued for a `PaymentTransaction` that was created by the Tranzila provider. Admin billing set/revoke does NOT create a `PaymentTransaction`. Therefore: never query `User.subscription.status` to decide if a receipt should fire. Always query `PaymentTransaction.status === "paid"`.

**Proof of risk:** `admin.routes.js` can set `user.plan = "monthly"` without any `PaymentTransaction`. If receipt logic reads `User.subscription.status`, it would fire for admin-granted subscriptions. This is legally and financially incorrect.

**Implementation check:** The `createReceiptBestEffort` function receives `paymentTransactionId` as a required argument. If `paymentTransactionId` is null/undefined, the function must return `{ ok: false, skipped: true, reason: "no_payment_transaction" }`.

---

### D2. Provider guard: mock payments must NEVER call YeshInvoice

**Rule:** `createReceiptBestEffort` must check `if (provider === "mock")` and return early.

**Why:** Development and staging environments use the mock provider. A missing guard would call the real YeshInvoice API (if `YESH_INVOICE_ENABLED=true` is accidentally set in dev) for every test payment.

---

### D3. Non-blocking: payment ACK must never wait for YeshInvoice

**Rule:** The 200 ACK to Tranzila must be sent BEFORE receipt creation completes. Use fire-and-forget:

- First payment: `createReceiptBestEffort(...).catch(...)` (no `await`)
- Recurring: same pattern

**Why:** YeshInvoice API may be slow or unavailable. A blocked ACK causes Tranzila to retry the webhook. An E11000 on the retried `PaymentTransaction.create` is harmless; but the resulting E11000 on a receipt create would be harder to diagnose.

---

### D4. Idempotency: one receipt per PaymentTransaction

**Rule:** The unique index on `Receipt.paymentTransactionId` is the idempotency fence. Before any YeshInvoice API call, check for existing receipt. On 11000 error from `Receipt.create`, catch and return — do not rethrow.

**Why:** Tranzila webhook replays, retry job re-runs, and manual admin triggers could otherwise create multiple YeshInvoice documents for the same payment event.

---

### D5. No raw provider secrets in any code or docs

**Rule:** `YESH_INVOICE_API_TOKEN`, `TRANZILA_STO_API_URL`, `TRANZILA_API_PRIVATE_KEY` and all other secrets go in Render env vars only. Never in source files, never in log output, never in `payloadAllowlisted`.

**Existing pattern:** `tranzila.provider.js:808` captures `TranzilaTK` token BEFORE the allowlist; token is NOT included in `payloadAllowlisted`. The token is stored in `user.tranzilaToken` (encrypted at rest via MongoDB Atlas) but never logged and never in API responses.

---

### D6. Do not mix groundwork docs with production claims

**Rule:** This document and the other two groundwork docs (`yeshinvoice-groundwork-architecture.md`, `yeshinvoice-integration-runbook.md`) are GROUNDWORK ONLY. They do not constitute approval to implement, and they do not represent the current production state.

Do not:

- Edit `billing-flow-ssot.md` gate list to mark YeshInvoice gates as "closed" before implementation is complete
- Set `YESH_INVOICE_ENABLED=true` in production before all gates in `yeshinvoice-integration-runbook.md §B Level 3` are closed
- Reference these docs as "YeshInvoice is implemented" — they document future architecture only

---

### D7. Sandbox pricing is not production truth

**Rule:** `PRICES_AGOROT = { monthly: 500, yearly: 500 }` is the current sandbox configuration (`backend/src/config/plans.js`). Production values (`{ monthly: 3990, yearly: 39990 }`) are commented out.

The `amountAgorot` in `PaymentTransaction` reflects the actual charged amount. Receipt generation must use `paymentTransaction.amountAgorot`, not a config constant — config values may differ from actual charged amounts.

---

### D8. autoIndex is OFF globally — manual migration for all new indexes

**Rule:** All new indexes (including the `Receipt.paymentTransactionId` unique index) must be created via a manual migration script following `backend/scripts/migrate-paymenttransaction-indexes.mjs` pattern. Do not set `autoIndex: true` on any schema. Do not use `mongoose.connect({ autoIndex: true })`.

**Proof:** `backend/src/config/db.js` sets `autoIndex: false`, `autoCreate: false` globally.

---

### D9. Receipt cabinet endpoint must enforce ownership

**Rule:** `GET /api/account/receipts/:id/download` must validate that `receipt.userId === req.userId`. A non-matching userId must return 404 (not 403) to avoid leaking receipt existence to unauthorized users, following the anti-enumeration policy in `POLICY_ORGS.md`.

---

### D10. Admin grants do not create PaymentTransaction — no back-fill needed for them

**Rule:** When admin revokes a subscription, no `PaymentTransaction.status = "refunded"` is created. When admin grants a subscription, no `PaymentTransaction.status = "paid"` is created. The YeshInvoice integration touches ONLY the Tranzila payment paths. If a future requirement calls for admin-grant receipts, that is a separate contour that requires an explicit operator and architect decision.
