# YeshInvoice Integration Runbook

**Contour:** 5.12.x — YeshInvoice integration (FUTURE — not yet started)  
**Status:** GROUNDWORK ONLY — do not proceed past §B until operator decisions resolved  
**Created:** 2026-04-23  
**Dependencies:**

- `docs/runbooks/yeshinvoice-groundwork-architecture.md` (architecture reference — read first)
- `docs/runbooks/billing-flow-ssot.md` §9 (gate list)
- `docs/upload-supabase-contract.md` (if Supabase PDF storage is chosen)

---

## A. Scope

### In scope for this runbook

- Creating the `Receipt` model (`backend/src/models/Receipt.model.js`)
- Creating the YeshInvoice service (`backend/src/services/yeshinvoice.service.js`)
- Creating `sendReceiptEmailMailjetBestEffort` in `backend/src/services/mailjet.service.js`
- Wiring best-effort receipt hooks into `handleNotify` (first payment) and `handleStoNotify` (recurring) in `backend/src/services/payment/tranzila.provider.js`
- Creating a receipt retry job (`backend/src/jobs/receiptRetry.js`)
- Creating cabinet API endpoints (`GET /api/account/receipts`, `GET /api/account/receipts/:id/download`) in `backend/src/routes/account.routes.js`
- Startup env validation for YeshInvoice when `YESH_INVOICE_ENABLED=true`
- Index governance (manual migration — no autoIndex)

### Out of scope for this runbook

- Changing Tranzila billing logic (first-payment fulfillment, STO create, reconcile, etc.)
- Retroactive receipts for existing `PaymentTransaction` records — requires separate operator decision and separate runbook
- Admin-panel receipt management or refund handling
- Any billing gate item (G2, G4b, G6, G7) — those are prerequisites, not in this runbook
- Frontend receipt cabinet UI — separate contour
- Tranzila STO create observability (`tranzilaSto.status` structured log) — separate contour (5.10i)
- Any change to `User.subscription`, `Card.billing`, or payment routing logic

---

## B. Preconditions

### Level 1 — Documentation (this groundwork — already done)

- [x] `yeshinvoice-groundwork-architecture.md` created
- [x] `yeshinvoice-integration-runbook.md` created (this file)
- [x] `yeshinvoice-code-patterns-and-examples.md` created
- [x] `billing-flow-ssot.md` gate list corrected and current (5.11)
- [x] `PaymentTransaction.receiptId` FK anchor confirmed in schema (`backend/src/models/PaymentTransaction.model.js:54–60`)

### Level 2 — Operator decisions (must be resolved before any code)

- [ ] **OP-1: Document type confirmed.** עוסק פטור (קבלה) or עוסק מורשה (חשבונית מס קבלה)?
- [ ] **OP-2: YeshInvoice account created.** Sandbox API URL and API token available.
- [ ] **OP-3: PDF storage strategy decided.** YeshInvoice native download URL or Supabase bucket?
- [ ] **OP-4: Receipt email language decided.** Hebrew only or bilingual?
- [ ] **OP-5: Retroactive receipts decision.** Explicitly in-scope or explicitly deferred?
- [ ] **OP-6: Receipt email timing.** On `PaymentTransaction.create(status="paid")` or after YeshInvoice API confirmation?

None of the Level 3 technical work may begin until all Level 2 decisions are recorded in this runbook.

### Level 3 — Billing gates (must be closed before `YESH_INVOICE_ENABLED=true`)

These gates are prerequisites for production enablement, but sandbox implementation may proceed once Level 2 is resolved:

- [ ] Gate 2: Failed-STO retry / recovery (5.10h)
- [ ] Gate 4b: STO create observability (5.10i)
- [ ] Gate 6: Production terminal cutover (5.10f)
- [ ] Gate 7: Production E2E lifecycle proof (5.10g)

---

## C. Operator Checklist (pre-implementation)

Run through this checklist with the operator/business owner before writing any code.

| #    | Question                                                                         | Answer (fill in)                           | Impact                                        |
| ---- | -------------------------------------------------------------------------------- | ------------------------------------------ | --------------------------------------------- |
| OP-1 | Are you registered as עוסק פטור or עוסק מורשה?                                   |                                            | Determines document type API call             |
| OP-2 | YeshInvoice sandbox API URL?                                                     | `____________`                             | Set as `YESH_INVOICE_API_URL` (sandbox)       |
| OP-2 | YeshInvoice sandbox API token?                                                   | `____________` (store in Render, not docs) | Set as `YESH_INVOICE_API_TOKEN` (sandbox)     |
| OP-3 | PDF: native YeshInvoice URL (no storage cost) or Supabase (permanent copy, CDN)? |                                            | Affects `pdfPath` field and download endpoint |
| OP-4 | Receipt email language: Hebrew only or bilingual?                                |                                            | Affects `mailjet.service.js` template         |
| OP-5 | Issue retroactive receipts for ≈10 existing paid transactions?                   |                                            | Separate backfill contour required if yes     |
| OP-6 | Receipt email timing: on paid txn creation or after YeshInvoice confirms?        |                                            | Affects email fire point in service           |

> **Security:** Never write actual API tokens/secrets into this document or any source file. Tokens go in Render env vars only.

---

## D. Developer Checklist (implementation order)

Complete in this order. Do not skip steps.

### D1. Resolve operator decisions (OP-1 through OP-6)

Record answers in §C above before any code changes.

### D2. Add startup validation to `backend/src/services/payment/index.js`

Add gated startup validation for `YESH_INVOICE_ENABLED`:

```js
// Following exact pattern of TRANZILA_STO_CREATE_ENABLED gate at lines 22–36
const isYeshInvoiceEnabled = process.env.YESH_INVOICE_ENABLED === "true";
if (isYeshInvoiceEnabled) {
    if (!process.env.YESH_INVOICE_API_URL)
        throw new Error(
            "[startup] YESH_INVOICE_API_URL required when YESH_INVOICE_ENABLED=true",
        );
    if (!process.env.YESH_INVOICE_API_TOKEN)
        throw new Error(
            "[startup] YESH_INVOICE_API_TOKEN required when YESH_INVOICE_ENABLED=true",
        );
}
```

Default safe state: absent, `"false"`, or any value other than `"true"` → disabled.

### D3. Create `Receipt` model

New file: `backend/src/models/Receipt.model.js`

Schema fields: `userId`, `paymentTransactionId`, `providerDocId`, `pdfPath`, `receiptStatus`, `emailSentAt`, timestamps.

Unique index on `paymentTransactionId` — declared in schema file but NOT auto-applied (follow `PaymentTransaction.model.js` pattern):

```js
receiptSchema.index({ paymentTransactionId: 1 }, { unique: true });
```

### D4. Create index migration script

New file: `backend/scripts/migrate-receipt-indexes.mjs`

Pattern: `backend/scripts/migrate-paymenttransaction-indexes.mjs` — `--dry-run` mode by default, `--apply` to execute, idempotent.

Run dry-run in sandbox before applying.

### D5. Create `yeshinvoice.service.js`

New file: `backend/src/services/yeshinvoice.service.js`

Exported functions:

- `isYeshInvoiceEnabled()` — returns `process.env.YESH_INVOICE_ENABLED === "true"`
- `createReceiptBestEffort({ userId, paymentTransactionId, plan, amountAgorot, provider })` — async, fire-and-forget-safe

Internal flow of `createReceiptBestEffort`:

1. Guard: `if (!isYeshInvoiceEnabled()) return { ok: true, skipped: true, reason: "disabled" }`
2. Guard: `if (provider === "mock") return { ok: true, skipped: true, reason: "mock_provider" }`
3. Idempotency: check `await Receipt.findOne({ paymentTransactionId })` — if exists and `receiptStatus === "created"`, skip
4. Write-ahead: `Receipt.create({ ..., receiptStatus: "pending" })`
5. YeshInvoice API call (details depend on OP-1 document type answer)
6. On success: update `receiptStatus = "created"`, `providerDocId = <returned ID>`, `pdfPath = <returned URL or uploaded path>`; back-link `PaymentTransaction.receiptId`
7. On failure: update `receiptStatus = "failed"`, log error — do NOT throw
8. Fire `sendReceiptEmailMailjetBestEffort(...)` after step 6 (if OP-6 = "after YeshInvoice confirms")

### D6. Add `sendReceiptEmailMailjetBestEffort` to `mailjet.service.js`

Signature:

```js
export async function sendReceiptEmailMailjetBestEffort({
    toEmail, firstName, receiptUrl, amountFormatted, plan, createdAt, userId
})
```

Pattern: follow `sendRenewalFailedEmailMailjetBestEffort` at `mailjet.service.js:825`.

Configure new env vars in `getMailjetConfig()`:

- `MAILJET_RECEIPT_SUBJECT` (default: `"קבלה מ-Cardigo"`)
- `MAILJET_RECEIPT_TEXT_PREFIX` (optional)

### D7. Wire receipt hooks in `tranzila.provider.js`

**First-payment hook (inside `handleNotify`):**

After `user.save()` at `tranzila.provider.js:969` and both `Card.updateOne()` calls (~L1000), add fire-and-forget:

```js
// After line ~1000 (after card updates, before STO create block)
createReceiptBestEffort({
    userId,
    paymentTransactionId: txn._id,
    plan: validPlan,
    amountAgorot: txn.amountAgorot,
    provider: "tranzila",
}).catch((err) =>
    console.error("[receipt] handleNotify fire-and-forget error", {
        userId,
        error: err?.message,
    }),
);
```

**Recurring hook (inside `handleStoNotify`):**

After `PaymentTransaction.create({ status: "paid", ... })` succeeds and before return:

```js
createReceiptBestEffort({
    userId,
    paymentTransactionId: stoTxn._id,
    plan: stoTxn.plan,
    amountAgorot: stoTxn.amountAgorot,
    provider: "tranzila",
}).catch((err) =>
    console.error("[receipt] handleStoNotify fire-and-forget error", {
        userId,
        error: err?.message,
    }),
);
```

### D8. Create receipt retry job

New file: `backend/src/jobs/receiptRetry.js`

Pattern: `backend/src/jobs/billingReconcile.js` (running flag, Sentry cron monitor, configurable interval).

Env var: `RECEIPT_RETRY_INTERVAL_MS` (default: `3 * 60 * 60 * 1000 = 10,800,000 ms / 3h`).

Queries: `Receipt.find({ receiptStatus: "failed", providerDocId: null })` with a bounded limit per run.

Wire into `backend/src/server.js` after `startBillingReconcileJob`.

### D9. Create cabinet API endpoints

Add to `backend/src/routes/account.routes.js`:

- `GET /api/account/receipts` — `requireAuth`, reads `Receipt.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(50)`, returns safe DTO (no raw `providerDocId` if sensitive, no full `pdfPath` if signed URL is needed)
- `GET /api/account/receipts/:id/download` — `requireAuth`, validates `receipt.userId == req.userId`, returns download URL or proxied PDF

### D10. Apply index migration

Run in sandbox:

```bash
node backend/scripts/migrate-receipt-indexes.mjs --dry-run
# review output
node backend/scripts/migrate-receipt-indexes.mjs --apply --create-index
```

Verify with `Receipt.collection.indexes()`.

---

## E. Verification Checklist (after implementation, before production)

### E1. Unit / integration

- [ ] `isYeshInvoiceEnabled()` returns false when env var absent or `"false"`
- [ ] `createReceiptBestEffort` with `provider="mock"` returns `{ ok: true, skipped: true, reason: "mock_provider" }`
- [ ] Duplicate `paymentTransactionId` → unique index violation → no second receipt
- [ ] YeshInvoice API failure → `receiptStatus = "failed"` → payment ACK NOT blocked
- [ ] Retry job: picks up `receiptStatus === "failed"` records; skips `receiptStatus === "created"` records
- [ ] `GET /api/account/receipts` rejects unauthenticated requests (401)
- [ ] `GET /api/account/receipts/:id/download` rejects cross-user ownership (403/404)

### E2. Sandbox E2E

- [ ] Complete a test first payment → `PaymentTransaction.status = "paid"` confirmed → `Receipt.receiptStatus = "created"` confirmed → `providerDocId` populated
- [ ] Receipt email received in sandbox inbox
- [ ] Simulate a STO recurring charge → receipt created for `sto_recurring_notify` txn
- [ ] Simulate YeshInvoice failure → `receiptStatus = "failed"` → retry job recovers
- [ ] Admin-granted subscription → no `Receipt` document created (no `PaymentTransaction` exists)

### E3. Frontend verification (after cabinet UI contour)

- [ ] Receipt list visible in settings panel after successful payment
- [ ] PDF download works
- [ ] No extra billing info leaked (no raw `providerTxnId`, `tranzilaToken`, `stoId` in cabinet DTO)

### E4. Frontend gates (run from `frontend/` after any frontend changes)

```
npm.cmd run check:inline-styles
npm.cmd run check:skins
npm.cmd run check:contract
npm.cmd run build --if-present
```

### E5. Backend sanities (run from `backend/` after implementation changes)

```
npm.cmd run sanity:org-access
npm.cmd run sanity:org-membership
npm.cmd run sanity:slug-policy
npm.cmd run sanity:ownership-consistency
npm.cmd run sanity:card-index-drift
npm.cmd run sanity:imports   (if touching models/imports)
```

---

## F. Failure Classification

| Failure type                                     | Classification       | Impact on payment ACK             | Resolution                                                                 |
| ------------------------------------------------ | -------------------- | --------------------------------- | -------------------------------------------------------------------------- |
| YeshInvoice API unreachable (network timeout)    | Best-effort failure  | NONE — ACK sent before            | `receiptStatus = "failed"`, retry job                                      |
| YeshInvoice API returns error (4xx/5xx)          | Best-effort failure  | NONE                              | `receiptStatus = "failed"`, retry job                                      |
| Mailjet send failure                             | Best-effort failure  | NONE                              | `emailSentAt` remains null, manual re-send if needed                       |
| `Receipt.create()` unique index violation        | Idempotency handled  | NONE                              | No second receipt; log warning                                             |
| `Receipt.create()` other DB failure              | Infra failure        | NONE (still fire-and-forget)      | `receiptStatus` may be `"pending"` stuck; retry job or manual intervention |
| `createReceiptBestEffort` uncaught throw         | Must NOT propagate   | Caught by `.catch()` at hook site | Error logged; `receiptStatus = "failed"` if write-ahead succeeded          |
| `YESH_INVOICE_ENABLED=true` but env vars missing | Startup hard failure | Server will not start             | Add required env vars to Render, restart                                   |

---

## G. Rollback / Disablement

### Immediate rollback (env flag)

Set `YESH_INVOICE_ENABLED=false` on Render → save → no server restart required if flag is read per-request in `isYeshInvoiceEnabled()`.

All in-progress Receipt documents with `receiptStatus = "pending"` or `"failed"` remain in DB but no further retries will fire.

### Schema / model rollback

The `Receipt` model can be dropped without affecting billing. `PaymentTransaction.receiptId` defaults to null — dropping it has no billing impact. To drop: remove `Receipt.model.js`, remove the retry job wire in `server.js`, remove cabinet endpoints.

### Partial data state after rollback

If some receipts were created before rollback: existing `Receipt` documents remain. Cabinet endpoints (if implemented) may return partial data. This is acceptable — no billing data is lost.

---

## H. Open Operator Decisions (cross-reference)

See §C for the full decision table. Summary of blockers for implementation:

- OP-1 (document type) affects the YeshInvoice API call parameters
- OP-2 (sandbox credentials) is a hard dependency for any sandbox testing
- OP-3 (PDF storage) affects `pdfPath` shape and download endpoint
- OP-4 (email language) affects `mailjet.service.js` template
- OP-5 (retroactive) determines scope of this contour vs a follow-on backfill contour
- OP-6 (email timing) affects where in `createReceiptBestEffort` the email is fired

---

## I. Out-of-Scope Items

The following are explicitly out of scope for contour 5.12.x:

- Modifying Tranzila billing logic, fulfillment, STO create, reconcile
- Changing `User.subscription` or `Card.billing` fields or logic
- Admin-panel receipt management UI
- Refund handling or receipt cancellation
- Retroactive receipts for existing transactions (requires separate operator decision + backfill contour)
- Frontend receipt cabinet UI (separate contour; cabinet API endpoints are backend-only in 5.12.x)
- Changing `PaymentTransaction` schema (aside from populating the already-existing `receiptId` FK)
- Any change to auth, CORS, CSRF contracts
- Any Netlify function change

---

## J. Related Documents

| Document                                                  | Purpose                                                                  |
| --------------------------------------------------------- | ------------------------------------------------------------------------ |
| `docs/runbooks/yeshinvoice-groundwork-architecture.md`    | Architecture, current billing chain, trigger truth, idempotency rules    |
| `docs/runbooks/yeshinvoice-code-patterns-and-examples.md` | Code patterns, file:line examples, anti-drift rules                      |
| `docs/runbooks/billing-flow-ssot.md`                      | Canonical billing runtime. §9: gate list. §11: env vars. §12: tech debt. |
| `docs/runbooks/tranzila-go-live-checklist.md`             | Tranzila production go-live gates                                        |
| `docs/runbooks/cardigo_billing_support_runbook.md`        | Support and incident handling for billing                                |
| `docs/upload-supabase-contract.md`                        | If Supabase PDF storage is chosen                                        |

---

## K. Implementation Contour Log

| Contour | Status                   | Changes                                                           |
| ------- | ------------------------ | ----------------------------------------------------------------- |
| 5.12.0  | ✅ COMPLETE (groundwork) | Created 3 groundwork docs. No runtime changes.                    |
| 5.12.1  | ⏳ NOT STARTED           | Operator decisions → Receipt model + indexes + startup validation |
| 5.12.2  | ⏳ NOT STARTED           | YeshInvoice service + hook wiring + retry job                     |
| 5.12.3  | ⏳ NOT STARTED           | Receipt email + cabinet API endpoints                             |
| 5.12.4  | ⏳ NOT STARTED           | Sandbox E2E proof + index migration applied                       |
| 5.12.5  | ⏳ NOT STARTED           | Production enablement (all gates closed)                          |
| 5.12.6  | ⏳ NOT STARTED           | Retroactive receipts backfill (if OP-5 approved)                  |
