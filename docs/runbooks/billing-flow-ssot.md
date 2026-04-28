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

> **⚠️ Active STO schedule price lock:** `PRICES_AGOROT` current code value: `monthly: 3990, yearly: 39990` (₪39.90 / ₪399.90). Confirmed in `backend/src/config/plans.js:72–73`. An active sandbox STO schedule exists at ₪39.90/month (`testcardstok` terminal, `dannybestboy@gmail.com`, first-charge-date 2026-05-01, pending webhook 01/05/2026). **Do NOT change `PRICES_AGOROT` while this schedule is active** — any mismatch between the code value and the amount on the STO schedule will cause every recurring notify to fail with `amount_mismatch`. After the 01/05/2026 webhook is verified and the test schedule is cancelled via `sto-cancel.mjs`, restore production values only in a dedicated pre-production contour.

**Conversion rules:**

- Backend stores and compares agorot (integer).
- Tranzila redirect `sum` = agorot / 100 (shekel, decimal - Tranzila's contract).
- Frontend display = agorot / 100, formatted with `toFixed(2)`.
- Receipt (YeshInvoice) amount = agorot / 100 (shekel, per their API).

**Stale price locations (must be removed/aligned):**

- ~~`backend/src/services/payment/tranzila.provider.js` - local `PRICES` (29.9 / 299).~~ **RESOLVED:** provider now imports canonical `PRICES_AGOROT` from `backend/src/config/plans.js`.
- ~~`backend/src/controllers/payment.controller.js` - dead code, local `PRICES` (29.9 / 200).~~ **RESOLVED:** file absent from codebase.
- ~~`frontend/src/components/pricing/PricingPlans.jsx` - hardcoded ₪29.99 / ₪299.~~ **RESOLVED:** file removed; current prices (₪39.90 / ₪399.90) live in `frontend/src/pages/Pricing.jsx`.

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

> **Org plan note:** Org plan access is granted through platform-admin annual entitlement, **not** through personal Tranzila payment flow. There is no org checkout, no STO recurring billing, and no automatic receipt generated for org grants. See §18 and `docs/runbooks/org-annual-entitlement-admin-grant.md`.

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
  │  g. Receipt (YeshInvoice) + email (Mailjet): IMPLEMENTED (sandbox-proven 2026-04-24).
  │     Fire-and-forget IIFE after billing activation. See §9 for implementation details and open production gates.
  ▼
⑦ Return 200 "OK" (generic body)
```

**Critical invariant:** Notify (④→⑦) is the **sole source of truth** for payment confirmation. Success/fail redirect URLs (③) are UX-only and must never trigger entitlement changes.

### Iframe Checkout Mode (additional flow — sandbox-proven 2026-04-25)

> Runs **in parallel** to the server-to-server notify contour above. Entitlement still originates exclusively from ④→⑦.

```
User at /payment/checkout?plan=...  (standalone, no Layout)
  │
  ▼
① POST /api/payments/create { plan, mode:"iframe" }    ← requireAuth
  │  If PAYMENT_INTENT_ENABLED=true:
  │    - Create / reuse PaymentIntent (reuse guard: see §17)
  │    - paymentIntentId passed as udf3 in DirectNG URL
  │  Backend returns { paymentUrl, paymentIntentId }
  ▼
② CheckoutPage embeds DirectNG iframe (paymentUrl)
  │
  ├─ ③a Payment succeeds → Tranzila POST-submits browser form to:
  │     TRANZILA_IFRAME_SUCCESS_URL
  │     = https://cardigo.co.il/api/payments/return?status=success&target=iframe
  └─ ③b Payment fails/cancelled → Tranzila POST-submits browser form to:
        TRANZILA_IFRAME_FAIL_URL
        = https://cardigo.co.il/api/payments/return?status=fail&target=iframe
  │
  ▼ (_redirects L3 routes ALL methods on /api/payments/return to Netlify function)
④ Netlify function: payment-return.js
  │  - Reads only ?status= and ?target= query params (no body parse)
  │  - target allowlist: only "iframe" recognized
  │  - Returns HTTP 303 to /payment/iframe-return?status=<status>
  ▼
⑤ Browser GET /payment/iframe-return?status=<status>  (SPA catch-all handles GET)
  │
  ▼
⑥ IframeReturnPage (standalone, no Layout)
  │  - Reads ?status= from URL
  │  - Calls window.parent.postMessage({ type:"CARDIGO_PAYMENT_STATUS", status }, origin)
  ▼
⑦ CheckoutPage postMessage listener (UX only)
  │  - Validates event.origin === window.location.origin
  │  - Validates event.data.type === "CARDIGO_PAYMENT_STATUS"
  │  - Calls setPaymentResult("success" | "fail")
  │  - On success: navigates to /edit/card/settings
  │  - Does NOT call backend. Does NOT grant entitlement.
  ▼
(independent, server-to-server — same as external flow)
⑧ Tranzila POST to notify URL (identical to notify contour ④→⑦ above)
  │  Entitlement, PaymentTransaction, Receipt all created here.
```

**Anti-drift rule:** `TRANZILA_IFRAME_SUCCESS_URL` and `TRANZILA_IFRAME_FAIL_URL` must **always** include `&target=iframe`. Never point these vars directly to `/payment/iframe-return`. Reason: Tranzila return is a POST form submission; SPA catch-all handles GET only; `/api/payments/return` is the Netlify function bridge that converts POST → GET redirect.

**Return relay routing table:**

| Request to `/api/payments/return` | 303 destination                         |
| --------------------------------- | --------------------------------------- |
| `?status=success` (no target)     | `/pricing?payment=success`              |
| `?status=fail` (no target)        | `/pricing?payment=fail`                 |
| `?status=success&target=iframe`   | `/payment/iframe-return?status=success` |
| `?status=fail&target=iframe`      | `/payment/iframe-return?status=fail`    |
| invalid status + `target=iframe`  | `/payment/iframe-return?status=fail`    |
| invalid status, no target         | `/pricing?payment=fail`                 |

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

**Receipt is a separate model (implemented).** `providerDocId`, `pdfUrl`, `status` (enum `"created"`/`"failed"`/`"skipped"`), `shareStatus`, `sharedAt` live in `Receipt`, not in `PaymentTransaction`. Ledger (`PaymentTransaction`) is not exposed to the cabinet directly.

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

**Important:** Org-owned cards (`card.orgId` set) under an active organization annual entitlement resolve via a separate path **before** this chain is entered. See §18 for the org entitlement path. The chain below applies to personal cards and to org cards when no active org entitlement exists.

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

| Field       | Type        | Status   | Purpose                 |
| ----------- | ----------- | -------- | ----------------------- |
| `status`    | String enum | existing | inactive/active/expired |
| `expiresAt` | Date        | existing | Current period end      |
| `provider`  | String      | existing | "mock"/"tranzila"       |

> **`autoRenew` and `currentPeriodEnd` are NOT stored fields.** Auto-renewal state is tracked via the `User.tranzilaSto` subdocument and surfaced as a computed `autoRenewal` DTO by `GET /api/account/me` (see §15). `subscription.expiresAt` remains the canonical paid-until date.
>
> **`autoRenewal` DTO shape** (frontend-safe, no raw provider fields):
>
> ```
> autoRenewal: {
>   status: "active" | "cancelled" | "none" | "pending" | "failed",
>   canCancel: boolean,
>   cancelledAtPresent: boolean,
>   subscriptionExpiresAt: Date | null
> }
> ```
>
> Derived by `buildAutoRenewalDto()` in `backend/src/routes/account.routes.js`. Does not expose `stoId`, `tranzilaToken`, or any raw provider response.

### Reconciliation

Two reconciliation jobs:

1. **Subscription expiry:** checks subscriptions where `expiresAt < now` and `status === "active"` → sets `status: "expired"`, downgrades User.plan and Card.billing. **Implemented** as `startBillingReconcileJob` in `backend/src/jobs/billingReconcile.js`, wired in `backend/src/server.js`. Interval configurable via `BILLING_RECONCILE_INTERVAL_MS` env var (default: 21600000 = 6h).
2. **Receipt retry:** retries failed receipt creation (Receipt.receiptStatus === "failed"). Interval configurable via `RECEIPT_RECONCILIATION_INTERVAL_MS` env var (planned, default: 3600000).

---

## 9) Receipt & Email (IMPLEMENTED — sandbox-proven 2026-04-24)

### Implementation status

**YeshInvoice / קבלה integration is IMPLEMENTED and sandbox-proven.** All 5 pre-implementation gates (G1–G5) are closed. Production enablement gates (G6 production terminal cutover, G7 production recurring lifecycle proof) remain open — see §14 for the full gate list. **Production rollout has NOT started.**

**Business context (unchanged):**

- The operator is **עוסק פטור** (VAT-exempt small business).
- Every paying user receives a **קבלה** (receipt) after a successful payment.
- Receipt issuance is based on confirmed backend ledger/webhook truth — never on browser success redirect.
- Receipt covers both first-payment AND recurring charges.

**Implementation gate history (all pre-implementation gates now closed):**

1. ~~STO notify handler (recurring charge webhook received and processed).~~ **CLOSED 2026-04-22** — Real Tranzila My Billing webhook received and fully verified (contour 5.8f.9, `REAL_TRANZILA_STO_NOTIFY_E2E_SUCCESS_FULLY_VERIFIED`).
2. ~~Failed-STO retry/recovery script or job.~~ **RESOLVED (5.12.H):** Operator script `backend/scripts/sto-retry-failed.mjs` — dry-run default, single-target (`--email`/`--user-id`), production-terminal block (`/^fxp/i` requires `--allow-prod`).
3. ~~STO cancellation/deactivation runbook and/or script.~~ **RESOLVED (5.6 + 5.9a.1):** Operator script `sto-cancel.mjs` exists (sandbox active→inactive proven). User self-service cancel-renewal shipped 2026-04-22 via `POST /api/account/cancel-renewal` (provider-first, idempotent, `cancellationSource: "self_service"`). Admin UI/button remains deferred but is not a YeshInvoice blocking gate.
4. ~~Non-sensitive structured observability for STO create result.~~ **RESOLVED (5.12.H):** `logStoCreateOutcome()` at `tranzila.provider.js:733–769` — structured `[sto]` event log (no sensitive fields: `stoIdPresent` boolean only, no token/expiry/raw response). Wired in `handleNotify()` at L1020–1029 on both success and unexpected-error paths.
5. ~~Gated startup validation when `TRANZILA_STO_CREATE_ENABLED=true`.~~ **RESOLVED (5.11):** Implemented in `backend/src/services/payment/index.js` — fails fast on missing STO vars when `TRANZILA_STO_CREATE_ENABLED=true`.
6. Production terminal cutover completed. _(open)_
7. Tranzila recurring lifecycle proven end-to-end in production (real customers, production terminal). _(open — only sandbox `testcardstok` proven to date)_

**What is now implemented (contour 5.12.x — COMPLETE):**

- `backend/src/models/Receipt.model.js` — `Receipt` model with `shareStatus` enum `["pending","sent","failed","skipped"]`, `shareFailReason`, `sharedAt`, index on `paymentTransactionId` (unique, applied via `migrate-receipt-indexes.mjs`).
- `backend/src/services/yeshinvoice.service.js` — `createReceiptYeshInvoice` + `shareReceiptYeshInvoice`. Auth: `Authorization: JSON.stringify({ secret, userkey })` (literal JSON string). Response envelope: `{ Success: bool, ErrorMessage: string, ReturnValue: { id, docNumber, pdfurl, url } }` (uppercase). Never throws; returns `{ ok: bool, raw, error? }`.
- Fire-and-forget IIFE hooks wired in `tranzila.provider.js` — both `handleNotify` (first-payment) and `handleStoNotify` (recurring). Pattern: `void (async () => { ... })()`. ACK path unblocked.
- Idempotency: `Receipt.create()` with `catch (e) { if (e.code === 11000) return; throw e; }`.
- Env vars: `YESH_INVOICE_ENABLED`, `YESH_INVOICE_SECRET`, `YESH_INVOICE_USERKEY`, `YESH_INVOICE_API_BASE`.
- Startup validation: if `YESH_INVOICE_ENABLED=true`, `YESH_INVOICE_SECRET` and `YESH_INVOICE_USERKEY` are validated at startup (fail-fast). Implemented at `backend/src/services/payment/index.js:44–49`.
- Receipt creation is **best-effort**: failure does not block the 200 ACK to Tranzila.
- On share failure: `Receipt.shareStatus` set to `"failed"`; `shareFailReason` recorded.
- Cabinet endpoints — **IMPLEMENTED (2026-04-24):**
    - `GET /api/account/receipts` — `requireAuth`, server-clamps limit 1–20 (frontend requests 12), returns newest-first safe DTO; reads `Receipt` model only. PROOF: `backend/src/routes/account.routes.js`.
    - `GET /api/account/receipts/:id/download` — `requireAuth`, backend proxy: streams PDF bytes from YeshInvoice; `pdfUrl` (contains query-string access key) is **never** forwarded to the client. Response: `Content-Type: application/pdf`, `Content-Disposition: attachment`, `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`.
    - Frontend receipt history in Settings → Section 3: תשלומים → "קבלות" accordion (native `<details>/<summary>`, collapsed by default). MVP shows up to 12 latest receipts. `failed`/`skipped` receipts not user-facing in MVP.
    - Closure evidence: `docs/handoffs/current/Cardigo_Enterprise_Handoff_ReceiptCabinet_Frontend_2026-04-24.md`.
- Ledger (`PaymentTransaction`) is not exposed to the cabinet directly; cabinet reads `Receipt` model only.

**Provider-boundary text sanitization (MC-H2, 2026-04-26):** `stripHtmlForYeshInvoiceText()` is applied in `yeshinvoice.service.js → buildReceiptBody()` only. Strips HTML/XML-like tags from free-text YeshInvoice fields: `Name`, `NameInvoice`, `FullName`, `Address`, `City`. **Not** applied to format-safe fields: `EmailAddress`, `NumberID`, `ZipCode`, `CountryCode`. This sanitization occurs at the YeshInvoice document-build boundary only. It does **not** mutate `user.receiptProfile` or `PaymentIntent.receiptProfileSnapshot`. Raw `numberId` remains server-side only and is not logged or exposed; it is used for `NumberID` in the YeshInvoice payload where required.

**Sandbox proof (2026-04-24 — COMPLETE):** See `docs/handoffs/current/Cardigo_Enterprise_Handoff_YeshInvoice_Receipt_Sandbox_Proof_2026-04-24.md` for full evidence package.

**Production rollout: NOT STARTED.** G6 and G7 remain open. Do not enable `YESH_INVOICE_ENABLED=true` on the production Render deployment until G6 (production terminal cutover) and G7 (production lifecycle proof) are closed.

**See also:**

- `docs/runbooks/yeshinvoice-groundwork-architecture.md` — billing chain, trigger truth, receipt architecture, endpoint/DTO map, idempotency rules
- `docs/runbooks/yeshinvoice-integration-runbook.md` — operator checklist, developer checklist, verification, rollback
- `docs/runbooks/yeshinvoice-code-patterns-and-examples.md` — grounded code examples (file:line)

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

| Var                             | File                          | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PAYMENT_PROVIDER`              | `services/payment/index.js`   | `"tranzila"` or mock (default)                                                                                                                                                                                                                                                                                                                                                                                                               |
| `TRANZILA_TERMINAL`             | `config/tranzila.js`          | Terminal ID                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `TRANZILA_SECRET`               | `config/tranzila.js`          | HMAC signature secret                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `TRANZILA_NOTIFY_URL`           | `config/tranzila.js`          | Server-to-server notify URL                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `TRANZILA_SUCCESS_URL`          | `config/tranzila.js`          | User redirect on success — external/full-window flow (UX only). Value: `https://cardigo.co.il/pricing?payment=success`                                                                                                                                                                                                                                                                                                                       |
| `TRANZILA_FAIL_URL`             | `config/tranzila.js`          | User redirect on failure — external/full-window flow (UX only). Value: `https://cardigo.co.il/pricing?payment=fail`                                                                                                                                                                                                                                                                                                                          |
| `TRANZILA_IFRAME_SUCCESS_URL`   | `config/tranzila.js`          | Iframe return URL — success. **Anti-drift: must include `&target=iframe`.** Required value: `https://cardigo.co.il/api/payments/return?status=success&target=iframe`. Never point directly to `/payment/iframe-return`. See §17.                                                                                                                                                                                                             |
| `TRANZILA_IFRAME_FAIL_URL`      | `config/tranzila.js`          | Iframe return URL — fail. **Anti-drift: must include `&target=iframe`.** Required value: `https://cardigo.co.il/api/payments/return?status=fail&target=iframe`. Never point directly to `/payment/iframe-return`. See §17.                                                                                                                                                                                                                   |
| `PAYMENT_INTENT_ENABLED`        | `routes/payment.routes.js`    | Enables PaymentIntent snapshot/reconciliation path for iframe checkout. Set `true` when iframe flow is intentionally armed and tested. Do not enable for production terminal rollout without full E2E smoke discipline. Sandbox-proven with `testcards` terminal 2026-04-25.                                                                                                                                                                 |
| `TRANZILA_NOTIFY_DELIVERY_MODE` | `config/tranzila.js`          | Set `portal` to omit `notify_url_address` from checkout URL (prevents notify endpoint leakage to browser). **Required when `PAYMENT_PROVIDER=tranzila`.** Anti-drift: removing or changing to a non-portal value reintroduces `notify_url_address` in the browser-visible checkout URL. Sandbox-proven 2026-04-28.                                                                                                                           |
| `TRANZILA_HANDSHAKE_ENABLED`    | `config/tranzila.js`          | `true` to arm Tranzila Handshake V2 for DirectNG checkout. When enabled: checkout URL includes `thtk`; `handleNotify` verifies `sha256(notify.thtk)` against `PaymentIntent.handshakeThtkHash`; forged notifies are rejected (`failReason=handshake_thtk_missing` / `handshake_thtk_mismatch`). **Requires `TRANZILA_HANDSHAKE_API_URL`.** Sandbox-proven 2026-04-28. Anti-drift: must remain `true` for production-style DirectNG checkout. |
| `TRANZILA_HANDSHAKE_API_URL`    | `config/tranzila.js`          | Tranzila Handshake V2 create endpoint. Value: `https://api.tranzila.com/v2/handshake/create`. Required when `TRANZILA_HANDSHAKE_ENABLED=true`.                                                                                                                                                                                                                                                                                               |
| `CARDIGO_PROXY_SHARED_SECRET`   | `app.js`                      | Origin lock (proxy → backend)                                                                                                                                                                                                                                                                                                                                                                                                                |
| `MAILJET_API_KEY`               | `services/mailjet.service.js` | Email API                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `MAILJET_API_SECRET`            | `services/mailjet.service.js` | Email API                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `MAILJET_FROM_EMAIL`            | `services/mailjet.service.js` | Sender                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `MAILJET_FROM_NAME`             | `services/mailjet.service.js` | Sender name                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `SITE_URL`                      | `utils/siteUrl.util.js`       | Canonical domain                                                                                                                                                                                                                                                                                                                                                                                                                             |

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

### Backend (Render) - receipt / email (IMPLEMENTED — sandbox active; production rollout NOT STARTED)

| Var                                  | Purpose                                                                                                                                        |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `CARDIGO_NOTIFY_TOKEN`               | Verify `?nt=` token from Netlify function (defense-in-depth)                                                                                   |
| `YESH_INVOICE_ENABLED`               | Feature flag. `"true"` enables receipt creation. Requires `YESH_INVOICE_SECRET` and `YESH_INVOICE_USERKEY` to also be set (startup fail-fast). |
| `YESH_INVOICE_SECRET`                | YeshInvoice API secret (sandbox or production). Validated at startup when `YESH_INVOICE_ENABLED=true`. Never log.                              |
| `YESH_INVOICE_USERKEY`               | YeshInvoice API user key (sandbox or production). Validated at startup when `YESH_INVOICE_ENABLED=true`. Never log.                            |
| `YESH_INVOICE_API_BASE`              | YeshInvoice API base URL (e.g. `https://api.yeshinvoice.co.il`).                                                                               |
| `MAILJET_RECEIPT_SUBJECT`            | Receipt email subject line.                                                                                                                    |
| `MAILJET_RECEIPT_TEXT_PREFIX`        | Receipt email body prefix.                                                                                                                     |
| `RECEIPT_RECONCILIATION_INTERVAL_MS` | Receipt retry job interval (planned, default 3600000).                                                                                         |
| `BILLING_RECONCILE_INTERVAL_MS`      | `startBillingReconcileJob` interval (implemented, default 21600000 = 6h)                                                                       |

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

2. ~~**Dead code in payment.controller.js** (RESOLVED):~~ `backend/src/controllers/payment.controller.js` no longer exists in the codebase — file was removed.

3. **Mock provider security:** `mock.provider.js` handleNotify accepts any `{userId, plan}` with no verification. Safe only when `PAYMENT_PROVIDER` ≠ `"tranzila"` and the notify endpoint is not publicly reachable. In production: `PAYMENT_PROVIDER=tranzila` is mandatory.

4. **Non-atomic User + Card updates:** Both tranzila.provider.js and mock.provider.js do `User.save()` then 2× `Card.updateOne()`. A crash between saves can leave User and Card billing out of sync. Mitigation: reconciliation job (§8) + admin tools. Full transactional writes deferred.

---

## Open Questions

1. ~~**Tranzila providerTxnId field:** Which field in the Tranzila notify payload is the canonical unique transaction identifier?~~ **RESOLVED:** `index` (preferred) → `authnr` → `ConfirmationCode` → `sha256(payload)` fallback. Implemented in `deriveProviderTxnId()` in `tranzila.provider.js`. Priority order confirmed via real DirectNG sandbox payment.

2. ~~**Tranzila notify Content-Type:** Does Tranzila send `application/x-www-form-urlencoded` exclusively, or can it send JSON?~~ **RESOLVED:** Tranzila DirectNG sends `application/x-www-form-urlencoded`. Netlify function handles both (best-effort cascade). Confirmed in production DirectNG flow.

3. **Tranzila retry behavior:** How many times and at what intervals does Tranzila retry on 5xx? This affects idempotency window and reconciliation timing. Still open.

4. ~~**YeshInvoice API specifics:** Exact endpoint paths, required fields, response shape, and sandbox credentials.~~ **RESOLVED:** Auth: `Authorization: JSON.stringify({ secret, userkey })`. Response envelope: `{ Success: bool, ErrorMessage: string, ReturnValue: { id, docNumber, pdfurl, url } }`. Sandbox credentials confirmed active. See `yeshinvoice.service.js`.

5. ~~**YeshInvoice document type:** Receipt (קבלה) vs. invoice (חשבונית מס / קבלה).~~ **RESOLVED:** Operator confirmed עוסק פטור — document type 6 (קבלה). Implemented in `yeshinvoice.service.js`.

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
- Runtime-created STO: `stoIdPresent=true` (raw stoId intentionally not documented) — confirmed in MongoDB (`tranzilaSto.status="created"`) and Tranzila `testcardstok` portal
- Old probe-created STO: `stoIdPresent=true` (raw stoId intentionally not documented) — created by probe script only, never written to MongoDB
- Both test STOs deactivated in Tranzila `testcardstok` portal after test window
- `TRANZILA_STO_CREATE_ENABLED` set back to `false` on Render immediately after test

### Idempotency guard

- Guard A: if `user.tranzilaSto.stoId` exists and `status === "created"` → skip, return `{ ok: true, skipped: true }`
- A user with `tranzilaSto.status === "created"` cannot be used for a clean e2e re-test without explicit DB state reset or a fresh test user

### Operator fast-forward notes (sto-create-custom-date.mjs)

**`charge_dom` clamp invariant:** `charge_dom` is clamped to `Math.min(Math.max(firstChargeDate.getUTCDate(), 1), 28)`. Days 29, 30, 31 produce `charge_dom=28`, placing the next charge on day 28 of the following month — **not** the next day. Always use days 1–28 for fast-forward webhook tests.

**Operator script:** `backend/scripts/sto-create-custom-date.mjs` — dry-run by default. Requires `--run --execute --i-understand-sto-api-call --email=<email> --first-charge-date=<YYYY-MM-DD>` to call the provider API. Does nothing unless manually executed with all required flags. Do not delete this script.

**Current active fast-forward candidate (2026-04-28):** `dannybestboy@gmail.com`, `first-charge-date=2026-05-01`. Tranzila `testcardstok` portal confirms `תחילת החיובים=01/05/2026`, `מועד החיוב הבא=01/05/2026`, amount ₪39.90. Waiting for real webhook on 01/05/2026 (scope: `TRANZILA_STO_NOTIFY_SANDBOX_E2E_P0`).

**Discarded fast-forward attempt:** `first-charge-date=2026-04-29` produced `יום חיוב בחודש=28`, `מועד החיוב הבא=28/05/2026` due to `charge_dom` clamp. Not accepted as next-day webhook proof.

**Cleanup after test:** Use `sto-cancel.mjs` to cancel the test schedule after the 01/05/2026 webhook is verified. Do not rely on portal-only deactivation.

### Production blockers (must close before production STO rollout)

1. ~~**STO notify handler**~~ — **FULLY RESOLVED (5.8a–5.8f.9):** `handleStoNotify` implemented; Netlify `payment-sto-notify.js` and backend `POST /api/payments/sto-notify` route deployed with token gates and safe observability logs (5.8f.LOG.1). **Real provider-generated Tranzila My Billing webhook received and fully verified on 2026-04-22** (`valik@cardigo.co.il`, contour 5.8f.9, classification: `REAL_TRANZILA_STO_NOTIFY_E2E_SUCCESS_FULLY_VERIFIED`). Ledger baseline after E2E: `sto_recurring_notify_count=6`, `sto_prefix_txn_count=6`. Portal URL configured for `testcardstok` terminal.
2. ~~**Failed-STO retry/recovery**~~ — **FULLY RESOLVED (5.12.H):** Operator script `backend/scripts/sto-retry-failed.mjs` — dry-run default, single-target (`--email`/`--user-id`), production-terminal block (`/^fxp/i` requires `--allow-prod`). Imports `createTranzilaStoForUser` and `STO_PENDING_STALE_MS` directly from the runtime for stale-threshold parity.
3. ~~**Cancellation/deactivation runbook — no operator procedure**~~ — **FULLY RESOLVED (5.6 + 5.9a.1/5.9a.2):** `sto-cancel.mjs` operator script exists (sandbox proven). User self-service cancel-renewal shipped 2026-04-22: `POST /api/account/cancel-renewal` (requireAuth, provider-first via `cancelTranzilaStoForUser`, idempotent, rate-limited 3/10min). SettingsPanel UI shipped in 5.9a.2. Premium remains active until `subscription.expiresAt` / `Card.billing.paidUntil` — no immediate downgrade. Admin UI/button remains deferred and non-blocking.
4. **Non-sensitive STO notify observability** — ✅ **RESOLVED (5.8f.LOG.1):** Safe structured logs deployed to Netlify edge function and backend `/sto-notify` route; verified 54/54 PASS with no sensitive data. ~~**STO create observability** (structured log on create result success/skip/failure) remains open _(separate item)_.~~ **RESOLVED (5.12.H):** `logStoCreateOutcome()` at `tranzila.provider.js:733–769`, wired in `handleNotify()` at L1020–1029.
5. ~~**Gated startup validation**~~ — **FULLY RESOLVED (5.11):** `backend/src/services/payment/index.js` validates `TRANZILA_STO_TERMINAL`, `TRANZILA_STO_API_URL`, `TRANZILA_API_APP_KEY`, `TRANZILA_API_PRIVATE_KEY` at startup when `TRANZILA_STO_CREATE_ENABLED=true`. Throws fail-fast on missing vars.
6. **Production terminal cutover** — Render STO env vars must be switched from sandbox terminal to production terminal values; `PRICES_AGOROT` must be restored to production values (`3990`/`39990`) **after** all active sandbox STO schedules are cancelled/deactivated (changing prices while active schedules charge old amounts causes `amount_mismatch`). Operator decision: price restore is deferred to a dedicated pre-production contour. _(open)_
7. ~~**Handshake V2 (thtk verification)**~~ — **CLOSED/SANDBOX-PROVEN (2026-04-28).** `TRANZILA_HANDSHAKE_ENABLED=true`; Handshake API V2 integrated via `buildTranzilaApiAuthHeaders()`. Checkout URL carries `thtk`; `PaymentIntent.handshakeThtkHash` stores `sha256(thtk)` (plaintext never stored). `thtk` is in `STRIP_KEYS` — never in `payloadAllowlisted`. Forged notify without `thtk` → `failReason=handshake_thtk_missing`. Forged notify with wrong `thtk` → `failReason=handshake_thtk_mismatch`. Real sandbox first payment passed. **`thtk` amount locking** (separate concern: STO amount locked at create time; price-change reconciliation) remains a future contour.
8. ~~**YeshInvoice / קבלה**~~ — **IMPLEMENTED AND SANDBOX-PROVEN (2026-04-24).** See §9 for full implementation details. Production enablement blocked on G6 (production terminal cutover) and G7 (production recurring lifecycle proof) only.

---

## 15) User Self-Service Cancel Renewal

### Endpoint

```
POST /api/account/cancel-renewal
```

- `requireAuth` — user derived from `req.userId` (httpOnly cookie auth only).
- No request body accepted. `userId`, `stoId`, `email` from the request body are ignored.
- Rate limit: **3 attempts / 10 minutes per authenticated user** (userId-keyed in-memory map).

### Response DTO

```json
{
    "ok": true,
    "renewalStatus": "cancelled",
    "autoRenewal": {
        "status": "cancelled",
        "canCancel": false,
        "cancelledAtPresent": true,
        "subscriptionExpiresAt": "<ISO>"
    },
    "messageKey": "cancelled"
}
```

`messageKey` values: `already_cancelled` | `no_active_renewal` | `cancel_unavailable` | `cancelled` | `cancel_failed`

### Provider-First Architecture

`cancelTranzilaStoForUser` (in `backend/src/services/payment/tranzila.provider.js`) is called **before** any Mongo write. Provider cancellation failure aborts the operation — Mongo `tranzilaSto.status` is never set to `"cancelled"` unless the provider confirms deactivation. The operation is idempotent: repeated calls with `status === "cancelled"` return `messageKey: "already_cancelled"` without a second provider call.

`cancellationSource` is set to `"self_service"` in `User.tranzilaSto`.

> **`cancelTranzilaStoForUser` is also used as a hard precondition in platform admin operations:** admin hard delete (`source: "admin_delete"`), self-delete (`source: "self_delete"`), and admin subscription revoke (`source: "admin_revoke"`) all call this function and hard-block on provider failure. See `docs/runbooks/admin-user-delete-lifecycle.md §9` for operator recovery procedures.

### Premium-Remains Policy

User self-service cancel stops **future** recurring charges only. It does NOT trigger an immediate downgrade.

- `subscription.expiresAt` is **not changed** by cancellation.
- `Card.billing.paidUntil` is **not changed** by cancellation.
- Premium access remains active until those dates expire naturally.
- No refund is issued. No `PaymentTransaction` ledger record is created by cancellation.

### UI (SettingsPanel, shipped 5.9a.2)

- Button label: **ביטול חידוש אוטומטי** (shown only when `autoRenewal.status === "active" && autoRenewal.canCancel === true`).
- After cancellation: button is hidden; status row shows "החידוש האוטומטי בוטל. הגישה Premium פעילה עד {date}."
- `autoRenewal.canCancel` is `true` only when `status === "active"`.

### `buildAutoRenewalDto()` Status Map

| `tranzilaSto.status` | DTO `status`  | `canCancel` |
| -------------------- | ------------- | ----------- |
| `"created"` + stoId  | `"active"`    | `true`      |
| `"cancelled"`        | `"cancelled"` | `false`     |
| `"pending"`          | `"pending"`   | `false`     |
| `"failed"`           | `"failed"`    | `false`     |
| absent / other       | `"none"`      | `false`     |

`autoRenewal` is not a stored field. It is derived on every `GET /api/account/me` request via `buildAutoRenewalDto()`. Does not expose `stoId`, `tranzilaToken`, or raw provider identifiers.

---

## 16) YeshInvoice Receipt Lifecycle — Canonical Proof Truth (2026-04-24)

**Status: IMPLEMENTED + SANDBOX-PROVEN. Production rollout: NOT STARTED.**

### Final Accepted Proof Statement

| Scenario                                                             | Result    | Date       | Classification                                                                 |
| -------------------------------------------------------------------- | --------- | ---------- | ------------------------------------------------------------------------------ |
| Real provider-originated first-payment webhook (Tranzila DirectNG)   | ✅ PROVED | 2026-04-24 | Tier 3 — real provider                                                         |
| Real provider-originated STO recurring webhook (Tranzila My Billing) | ✅ PROVED | 2026-04-22 | Tier 3 — real provider (`REAL_TRANZILA_STO_NOTIFY_E2E_SUCCESS_FULLY_VERIFIED`) |
| YeshInvoice `Receipt.create` (provider doc issued)                   | ✅ PROVED | 2026-04-24 | Tier 1 — sandbox API                                                           |
| YeshInvoice `shareReceiptYeshInvoice` (email sent)                   | ✅ PROVED | 2026-04-24 | Tier 1 — sandbox API                                                           |
| `Receipt.shareStatus` update (pending → sent)                        | ✅ PROVED | 2026-04-24 | Tier 1 — Mongo write verified                                                  |
| First-payment replay / idempotency                                   | ✅ PROVED | 2026-04-24 | Tier 1 — E11000 idempotency confirmed                                          |
| STO recurring replay / idempotency                                   | ✅ PROVED | 2026-04-24 | Tier 1 — E11000 idempotency confirmed                                          |
| Synthetic direct-backend runtime proof (fire-and-forget hook)        | ✅ PROVED | 2026-04-24 | Tier 1 — synthetic handler                                                     |
| Public relay smoke (cardigo.co.il → Netlify → Render)                | ✅ PROVED | 2026-04-24 | Tier 2 — relay (caveat: requires Render warm-up; see below)                    |

### Known Caveats

- **SANDBOX-STO-002:** Reserved failed public attempt (502). Cause: Render cold start + Netlify 9s timeout. Not a defect. Do not reuse this reference ID.
- **Render cold-start / Netlify 9s timeout:** Public relay smoke may return 502 before Render backend warms up. Allow 30–60s warm-up time and retry. This is a false-negative infrastructure caveat, not a bug.
- **Early polluted fake notify attempt:** One early direct-backend fake notify attempt was made before the real sandbox proof. It created no DB residue. Ledger is clean.
- **Local sandbox env:** `TRANZILA_TERMINAL=testcards`, `TRANZILA_STO_TERMINAL=testcardstok` — these are sandbox values. Production terminal vars are commented out in `.env`.
- **PRICES_AGOROT:** Current code value is `3990/39990` (₪39.90 / ₪399.90) — confirmed in `plans.js:72–73`. Active sandbox STO schedule: `dannybestboy@gmail.com`, first-charge-date 2026-05-01, terminal `testcardstok`, ₪39.90/month. **Do NOT change while this schedule is active** — `amount_mismatch` on every recurring notify. Restore production values in a dedicated pre-production contour only after all sandbox STO schedules are cancelled.

### Open Production Gates

- **G6:** Production terminal cutover (`TRANZILA_TERMINAL`, `TRANZILA_SECRET`, `TRANZILA_STO_TERMINAL`, `PRICES_AGOROT` restore) — **OPEN**
- **G7:** Production recurring lifecycle proof (real customers, production terminal) — **OPEN**

Full evidence package: `docs/handoffs/current/Cardigo_Enterprise_Handoff_YeshInvoice_Receipt_Sandbox_Proof_2026-04-24.md`

---

## 17) Iframe Checkout Mode — Sandbox E2E Accepted 2026-04-25

> **Scope:** This section closes sandbox documentation readiness for iframe checkout. It does **not** close production terminal rollout. Production terminal cutover, production Tranzila terminal validation, production provider credentials, final production payment smoke, and recurring lifecycle production proof remain separate future contours.

### Architecture Summary

**Flow:** `CheckoutPage (iframe)` → `DirectNG iframenew.php` → Tranzila POST → `payment-return.js` (Netlify function bridge) → `IframeReturnPage` (SPA relay) → `postMessage` → `CheckoutPage` state update → navigate `/edit/card/settings`.

**Entitlement path (unchanged):** Tranzila server-to-server notify → `payment-notify.js` → backend `POST /api/payments/notify` → `handleNotify` → `User.subscription` + `Card.billing`. This is the sole entitlement trigger.

**IframeReturnPage top-level fallback (CLOSED, 2026-04-28):** When Tranzila navigates `_top` directly to the return URL (browser exits iframe context), `window.parent === window` and `postMessage` is not delivered. `IframeReturnPage` handles this with a timed direct navigation: `status=success` → `/edit/card/settings`; `status=fail` or unknown → `/pricing?payment=fail`. Implementation: `frontend/src/pages/payment/IframeReturnPage.jsx:26–47`. All three paths smoke-tested 2026-04-28.

**Files (canonical locations):**

| Concern                                 | File                                                                                                           |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Netlify return bridge                   | `frontend/netlify/functions/payment-return.js`                                                                 |
| Iframe relay SPA page                   | `frontend/src/pages/payment/IframeReturnPage.jsx`                                                              |
| Checkout page (postMessage consumer)    | `frontend/src/pages/payment/CheckoutPage.jsx`                                                                  |
| Framing defense headers                 | `frontend/public/_headers` (`/payment/iframe-return`: `X-Frame-Options: SAMEORIGIN`, `frame-ancestors 'self'`) |
| Router registration (standalone routes) | `frontend/src/app/router.jsx` (top-level, no Layout)                                                           |
| PaymentIntent model + indexes           | `backend/src/models/PaymentIntent.model.js`                                                                    |
| Payment create route (PI reuse guard)   | `backend/src/routes/payment.routes.js`                                                                         |
| Provider URL builder + notify handler   | `backend/src/services/payment/tranzila.provider.js`                                                            |

### Return Relay Truth

See §3 iframe flow for the full routing table. Key invariant:

- `TRANZILA_IFRAME_SUCCESS_URL` → must contain `&target=iframe` → `payment-return.js` recognizes by strict allowlist → 303 to `/payment/iframe-return?status=success`.
- External flow (`TRANZILA_SUCCESS_URL`) has no `target` param → 303 to `/pricing?payment=success`. **These two flows are independent and must not be conflated.**

### PaymentIntent Reuse Guard Truth

`POST /api/payments/create { plan, mode:"iframe" }` when `PAYMENT_INTENT_ENABLED=true`:

1. Looks for existing `pending` PaymentIntent for `(userId, plan, mode)` with `checkoutExpiresAt > now`.
2. Compares `receiptProfileSnapshot` of existing PI vs freshly-built snapshot (11 billing fields; `capturedAt` excluded).
3. **Reuse** if snapshots are equivalent → regenerate Tranzila URL using existing PI `_id` as `udf3`.
4. **New PI** if no match, expired, or snapshot mismatch (receipt profile changed) → `PaymentIntent.create()`.
5. Completed / failed / cancelled PIs are never reused.

**PaymentIntent `consuming` status — anti-drift invariant:** When `handleNotify` processes a first-payment notify, it writes `PaymentIntent.status = "consuming"` as an atomic write-ahead gate before any fulfillment writes. This prevents concurrent double-fulfillment if Tranzila replays the notify before the first run completes. The `consuming` status must remain part of the `PaymentIntent` lifecycle when `PAYMENT_PROVIDER=tranzila`. Do not remove or bypass it.

**Expected physical indexes (applied 2026-04-25):**

| Index name                                                 | Purpose                      |
| ---------------------------------------------------------- | ---------------------------- |
| `paymentintents_purgeAt_ttl`                               | TTL auto-purge after 14 days |
| `paymentintents_userId_createdAt`                          | Notify reconciliation lookup |
| `paymentintents_userId_plan_mode_status_checkoutExpiresAt` | Reuse guard lookup           |

### Receipt / YeshInvoice Email Truth

- When `paymentIntentId` is resolved in `handleNotify`, `buildFirstPaymentCustomer()` uses `buildCustomerFromPaymentIntent()` → `customer.source = "paymentIntent"`.
- `buildRecipientSnapshot(customer, paymentIntentId)` stores: `numberIdMasked`, `numberIdHash` (inside `recipientSnapshot`), `source: "paymentIntent"`, `paymentIntentId`.
- Raw `numberId` is **never stored** in `Receipt.recipientSnapshot`.
- Receipt email delivery uses `shareReceiptYeshInvoice()` (YeshInvoice `shareDocument` API). Mailjet is unrelated to receipt delivery.

### Sandbox E2E Acceptance Record — 2026-04-25

| Check                                                           | Result |
| --------------------------------------------------------------- | ------ |
| Route `/payment/checkout?plan=monthly` accessible               | ✅     |
| Tranzila sandbox terminal used (`testcards`)                    | ✅     |
| `PAYMENT_INTENT_ENABLED=true` armed                             | ✅     |
| `YESH_INVOICE_ENABLED=true` with test credentials               | ✅     |
| Iframe payment succeeded                                        | ✅     |
| PaymentIntent `status=completed`                                | ✅     |
| PaymentTransaction `status=paid`, `providerTxnId` present       | ✅     |
| Receipt created, `providerDocId` present                        | ✅     |
| Receipt `recipientSnapshot.source="paymentIntent"`              | ✅     |
| Receipt `numberIdMasked` stored, raw `numberId` absent          | ✅     |
| Receipt `shareStatus=sent`, email received                      | ✅     |
| Receipt appeared in `/edit/card/settings`, downloaded correctly | ✅     |
| Post-payment success button navigated to `/edit/card/settings`  | ✅     |
| Duplicate pending PI count after smoke = 0                      | ✅     |

**Redacted evidence note:** All personal/financial identifiers (paymentIntentId, paymentTransactionId, providerTxnId, providerDocId, numberId, email) from the sandbox smoke are redacted from this document per doc hygiene policy.

### Open P2 Tails (non-blocking — closed and deferred)

1. ~~**`handleReceiptSave` empty-payload guard**~~ — ~~if no receipt profile fields changed, a no-op PATCH is still sent. Add empty-payload guard before `updateReceiptProfile` call in `CheckoutPage.jsx`.~~ **CLOSED (MC-H1, 2026-04-26):** Empty-payload guard added after validation and before `setReceiptBusy(true)`. No PATCH sent on no-op. Message: "לא בוצעו שינויים."
2. ~~**`receiptOk` not cleared in no-diff path**~~ — ~~`handleContinueToSummary` no-diff branch advances to `setStep("summary")` without calling `setReceiptOk("")`. Stale success notice may persist briefly.~~ **CLOSED (MC-H1, 2026-04-26):** `setReceiptOk("")` called in no-diff advance path. `setPaymentError("")` called on fail back-to-summary. No payment logic change.
3. **Fallback external-mode PI on null paymentUrl** — `handleExternalFallback()` in `CheckoutPage.jsx`: if `paymentUrl` is null, calls `createPayment(plan, { mode:"external" })`. Creates an external-mode PI even when an iframe PI exists for the same user/plan (different mode → reuse guard doesn't match). Orphaned pending PI expires via TTL. Not a security or billing risk. _(still deferred)_
4. ~~**HTML tag stripping before YeshInvoice text fields**~~ — ~~`name`/`nameInvoice`/`address` fields are not HTML-stripped before passing to YeshInvoice. React escapes tags in UI; tags may appear as-is in PDF. Low/medium risk. Deferred.~~ **CLOSED (MC-H2, 2026-04-26):** `stripHtmlForYeshInvoiceText()` applied in `yeshinvoice.service.js → buildReceiptBody()` to `Name`, `NameInvoice`, `FullName`, `Address`, `City`. Not applied to `EmailAddress`, `NumberID`, `ZipCode`, `CountryCode`. No DB mutation. See §9 for full detail.
5. **Pricing CTA UX for active subscribers** — active-subscriber path shows a notice and navigates to `/edit/card/settings`. No pricing upgrade option visible to active subscribers. UX polish deferred. _(still deferred)_

### Post-E2E Hardening Closure (2026-04-26)

| Contour | Closed behavior                                                                                                                                                                                                                                                    | File truth                                                                                       | Anti-drift note                                                                                                                                                                |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| MC-H1   | `handleReceiptSave` empty-payload guard (no PATCH on no-op). `handleContinueToSummary` clears stale `receiptOk` on no-diff advance. Fail back-to-summary clears `paymentError`.                                                                                    | `frontend/src/pages/payment/CheckoutPage.jsx`                                                    | Guard runs after validation and before `setReceiptBusy(true)` / API call. No payment logic change. No `numberId` behavior change.                                              |
| MC-H2   | `stripHtmlForYeshInvoiceText()` at `buildReceiptBody()` provider document-build boundary only. Applies to: `Name`, `NameInvoice`, `FullName`, `Address`, `City`. Does NOT apply to: `EmailAddress`, `NumberID`, `ZipCode`, `CountryCode`.                          | `backend/src/services/yeshinvoice.service.js`                                                    | Provider-boundary only. Does NOT mutate `user.receiptProfile` or `PaymentIntent.receiptProfileSnapshot`. Raw `numberId` remains server-side only and is not logged or exposed. |
| MC-S1   | `handleReceiptProfileSave` (SettingsPanel) empty-payload guard mirrors MC-H1 pattern. Empty payload no longer triggers confusing backend 400. Message: "לא בוצעו שינויים."                                                                                         | `frontend/src/components/editor/panels/SettingsPanel.jsx`                                        | Guard runs after validation and before `setReceiptProfileBusy(true)`. No receipt cabinet change. No payment flow change.                                                       |
| MC-H4   | `CheckoutBrandMark` component in all 10 `CheckoutPage` card states and `IframeReturnPage`. Logo uses existing public assets: `/images/brand-logo/cardigo-logo.webp` (primary) + `/images/brand-logo/cardigo-logo.png` (fallback). Non-clickable `<div>` container. | `frontend/src/pages/payment/CheckoutPage.jsx`, `frontend/src/pages/payment/IframeReturnPage.jsx` | No `Link` wrapper. No `onClick`. No `Header` or `Layout` import. Payment pages remain standalone. No payment logic, postMessage, or iframe sandbox change.                     |

All 4 micro-contours: frontend gates EXIT 0 on 2026-04-26 (`check:inline-styles`, `check:skins`, `check:contract`, `build`).

### Production Rollout Boundary (explicit)

**This section closes sandbox documentation readiness only.** The following items remain separate future contours and are NOT closed by this section:

- Production terminal cutover (swap `testcards`/`testcardstok` for production terminal IDs).
- `PRICES_AGOROT` restore to production values (`3990`/`39990`) after all active sandbox STO schedules are cancelled.
- `TRANZILA_SECRET` swap to production signing secret.
- Full production E2E payment smoke on production terminal.
- Production recurring lifecycle proof (STO charges on production terminal).
- G6 + G7 (see §14 and §16) remain open.

**Cross-reference:** `docs/handoffs/current/Cardigo_Enterprise_Handoff_CheckoutIframe_E2E_2026-04-25.md`

---

## 18) Organization Annual Entitlement — Outside Personal Billing Flow

**Status:** Active — 2026-04-26.

Organization annual entitlement is a **separate mechanism** from the personal billing flow documented in §1–§17. It is not part of this flow.

### What org annual entitlement is NOT

The following personal billing components are **not involved** in org annual entitlement:

| Component                                      | Status for org entitlement |
| ---------------------------------------------- | -------------------------- |
| `/payment/checkout` (Tranzila hosted checkout) | NOT used                   |
| `/api/payments/create`                         | NOT used                   |
| `PaymentIntent` model                          | NOT used                   |
| `PaymentTransaction` model                     | NOT used                   |
| `Receipt` model                                | NOT used                   |
| Tranzila provider                              | NOT used                   |
| Tranzila STO (recurring)                       | NOT used                   |
| YeshInvoice (receipt/document)                 | NOT used                   |
| `User.subscription` mutation                   | NOT triggered              |
| Automatic invoice/receipt generation           | NOT triggered              |

### What org annual entitlement IS

- `Organization.orgEntitlement` is the SSoT for org premium access.
- Platform admin grants/extends/revokes entitlement manually via admin UI after confirmed off-platform payment or agreement.
- No payment provider is involved.
- No automatic receipt is generated.

### Resolver behavior for org cards

When `card.orgId` is set and the organization has `orgEntitlement.status === "active"` and `orgEntitlement.expiresAt > now`:

```json
{
    "source": "organization",
    "isPaid": true,
    "plan": "org"
}
```

- `effectiveBilling.source = "organization"` is the public DTO value.
- `PLANS.org` feature gates apply (see §2 feature matrix).
- Personal cards belonging to org members are unaffected.
- `User.subscription` is unaffected.

### Resolution chain position

Org-owned cards under active org entitlement resolve **before** the personal billing/trial/free chain (§7). When org entitlement is active, the personal chain is not entered for that card.

When org entitlement is absent, expired, or revoked, the personal chain (§7) applies normally.

### Operator runbook

For full operator instructions (grant/extend/revoke flows, API contract, error codes, troubleshooting):

→ `docs/runbooks/org-annual-entitlement-admin-grant.md`
