# Cardigo Enterprise Handoff — Checkout Iframe E2E (2026-04-25)

**Workstream:** `CHECKOUT_IFRAME_SANDBOX_E2E_ACCEPTANCE_AND_DOC_AUDIT`  
**Status:** ACCEPTED WITH TAILS — Sandbox E2E proven. Production rollout NOT started.  
**Date:** 2026-04-25  
**Supersedes:** This handoff covers iframe checkout only. For YeshInvoice receipt architecture, see `Cardigo_Enterprise_Handoff_YeshInvoice_Receipt_Sandbox_Proof_2026-04-24.md`. For billing MyBilling baseline (external flow), see `Cardigo_Enterprise_Handoff_Billing_MyBilling_2026-04-19.md` (archive; do not edit).

---

## 1) What Was Accepted

Iframe-embedded DirectNG checkout for Cardigo paying users, sandbox-proven end-to-end on 2026-04-25 with `testcards` terminal.

Prior to this workstream, two bugs were fixed:

- **Bug A (Render env):** `TRANZILA_IFRAME_SUCCESS_URL` pointed to SPA path `/payment/iframe-return?status=...`. Tranzila POST-submits the browser; Netlify SPA catch-all handles GET only — POST returned 404. **Fix:** Operator updated Render env to `https://cardigo.co.il/api/payments/return?status=success&target=iframe` (Netlify function bridge).
- **Bug B (code):** `payment-return.js` unconditionally redirected all returns to `/pricing?payment=...`. Even with correct env, relay page never received control. **Fix:** `target=iframe` routing added to `payment-return.js`.

After both fixes, full E2E smoke was run by the operator and accepted.

---

## 2) Architecture

```
CheckoutPage (/payment/checkout)
  └─ iframe src=paymentUrl (Tranzila DirectNG iframenew.php, sandbox terminal "testcards")
              │
              └─ Payment completes → Tranzila POST-submits browser form to:
                        TRANZILA_IFRAME_SUCCESS_URL
                        = https://cardigo.co.il/api/payments/return?status=success&target=iframe
                                  │ (_redirects L3: /api/payments/return → payment-return.js)
                                  ▼
                        Netlify function: payment-return.js
                          reads ?status= and ?target= (allowlist only, no body)
                          target === "iframe" → 303 /payment/iframe-return?status=success
                                  │
                                  ▼
                        /payment/iframe-return (SPA GET catch-all → IframeReturnPage)
                          reads ?status=
                          calls window.parent.postMessage({type:"CARDIGO_PAYMENT_STATUS", status}, origin)
                                  │
                                  ▼
                        CheckoutPage.handleMessage (UX only)
                          validates origin === window.location.origin
                          validates type === "CARDIGO_PAYMENT_STATUS"
                          setPaymentResult("success") → navigate("/edit/card/settings")

Entitlement path (independent, unchanged):
  Tranzila → POST /api/payments/notify → payment-notify.js → backend handleNotify
           → User.subscription + Card.billing + Receipt (YeshInvoice)
```

**Routes:** Both `/payment/checkout` and `/payment/iframe-return` are standalone routes (no Layout — no marketing header/footer). Confirmed in `frontend/src/app/router.jsx`.

**Framing defense (`frontend/public/_headers`):**

```
/payment/iframe-return
  X-Frame-Options: SAMEORIGIN
  Content-Security-Policy: frame-ancestors 'self'
```

---

## 3) File Map

| Concern                 | File                                                | Key lines                                          |
| ----------------------- | --------------------------------------------------- | -------------------------------------------------- |
| Netlify return bridge   | `frontend/netlify/functions/payment-return.js`      | status+target allowlist, 303 routing               |
| Iframe relay SPA page   | `frontend/src/pages/payment/IframeReturnPage.jsx`   | postMessage sender                                 |
| Checkout page           | `frontend/src/pages/payment/CheckoutPage.jsx`       | postMessage listener L179–192; navigate L438, L695 |
| Framing headers         | `frontend/public/_headers`                          | `/payment/iframe-return` section                   |
| SPA redirects           | `frontend/public/_redirects`                        | L3: `/api/payments/return` → function              |
| Router                  | `frontend/src/app/router.jsx`                       | L309–315 checkout, L321–330 iframe-return          |
| PaymentIntent model     | `backend/src/models/PaymentIntent.model.js`         | 3 indexes (TTL, userId+createdAt, reuse guard)     |
| Payment create route    | `backend/src/routes/payment.routes.js`              | SNAPSHOT_COMPARE_FIELDS, reuse guard               |
| Provider (URL + notify) | `backend/src/services/payment/tranzila.provider.js` | udf3=paymentIntentId (L962); handleNotify (L983)   |

---

## 4) Return Relay Routing Table

| Request to `/api/payments/return` | 303 destination                         | Flow                      |
| --------------------------------- | --------------------------------------- | ------------------------- |
| `?status=success` (no target)     | `/pricing?payment=success`              | External                  |
| `?status=fail` (no target)        | `/pricing?payment=fail`                 | External                  |
| `?status=success&target=iframe`   | `/payment/iframe-return?status=success` | Iframe relay              |
| `?status=fail&target=iframe`      | `/payment/iframe-return?status=fail`    | Iframe relay              |
| invalid status + `target=iframe`  | `/payment/iframe-return?status=fail`    | Iframe relay (normalized) |
| invalid status, no target         | `/pricing?payment=fail`                 | External (normalized)     |

**Security note:** `target` value is never interpolated into the destination URL — only compared with `=== "iframe"`. No open redirect possible.

---

## 5) Env Contract

### Render (backend)

| Var                           | Required value                                                           | Notes                                          |
| ----------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------- |
| `PAYMENT_INTENT_ENABLED`      | `true`                                                                   | Enables PaymentIntent path for iframe checkout |
| `TRANZILA_IFRAME_SUCCESS_URL` | `https://cardigo.co.il/api/payments/return?status=success&target=iframe` | Must include `&target=iframe`                  |
| `TRANZILA_IFRAME_FAIL_URL`    | `https://cardigo.co.il/api/payments/return?status=fail&target=iframe`    | Must include `&target=iframe`                  |

**Anti-drift checklist:**

1. `TRANZILA_IFRAME_*_URL` must always end with `&target=iframe`. Removing it silently regresses iframe relay to `/pricing`.
2. Never point `TRANZILA_IFRAME_*_URL` directly to `/payment/iframe-return`. POST → SPA catch-all is GET-only → 404.
3. External `TRANZILA_SUCCESS_URL` / `TRANZILA_FAIL_URL` must NOT include `&target=iframe`.
4. `_redirects` L3 (`/api/payments/return /.netlify/functions/payment-return 200`) must not be reordered or removed.
5. Post-payment navigation is always `/edit/card/settings`, never `/dashboard`.

---

## 6) PaymentIntent Reuse Guard

When `PAYMENT_INTENT_ENABLED=true`, `POST /api/payments/create { plan, mode:"iframe" }`:

1. Searches for most-recent `pending` PI for `(userId, plan, mode)` with `checkoutExpiresAt > now`.
2. Builds fresh `receiptProfileSnapshot` (11 billing fields, `capturedAt` excluded).
3. If found + snapshots equivalent → reuse existing PI, regenerate Tranzila URL (same `udf3`).
4. If not found, expired, or snapshot differs → `PaymentIntent.create()` with fresh snapshot.

**SNAPSHOT_COMPARE_FIELDS (11):** `recipientType`, `name`, `nameInvoice`, `fullName`, `numberId` (server-side only), `email`, `address`, `city`, `zipCode`, `countryCode`, `snapshotSource`.  
Source: `backend/src/routes/payment.routes.js → SNAPSHOT_COMPARE_FIELDS`.

**Physical indexes applied (2026-04-25):**

| Index                                                      | Purpose                                |
| ---------------------------------------------------------- | -------------------------------------- |
| `paymentintents_purgeAt_ttl`                               | TTL auto-purge (expireAfterSeconds: 0) |
| `paymentintents_userId_createdAt`                          | Notify reconciliation lookup           |
| `paymentintents_userId_plan_mode_status_checkoutExpiresAt` | Reuse guard compound index             |

---

## 7) Receipt / YeshInvoice Truth (iframe-specific)

- `udf3=paymentIntentId` is sent in the Tranzila DirectNG provider URL at L962 of `tranzila.provider.js`.
- In `handleNotify`, `rawIntentId = data.udf3` → `buildFirstPaymentCustomer()` → `buildCustomerFromPaymentIntent(intent, user)` → `customer.source = "paymentIntent"`.
- `buildRecipientSnapshot(customer, paymentIntentId)` stores: `numberIdMasked`, `numberIdHash`, `paymentIntentId`, `source: "paymentIntent"`.
- Raw `numberId` is **never stored** in `Receipt.recipientSnapshot`.
- Receipt email delivered via `shareReceiptYeshInvoice()` (YeshInvoice `shareDocument` API). Mailjet is NOT used for receipt delivery.
- Receipt creation and email share are fire-and-forget IIFEs — they never block the 200 ACK to Tranzila.

---

## 8) Sandbox E2E Acceptance Record (2026-04-25)

| Check                                                         | Result                   |
| ------------------------------------------------------------- | ------------------------ |
| Route `/payment/checkout?plan=monthly`                        | ✅ accessible            |
| Tranzila terminal                                             | ✅ sandbox (`testcards`) |
| `PAYMENT_INTENT_ENABLED=true`                                 | ✅                       |
| `YESH_INVOICE_ENABLED=true` (test credentials)                | ✅                       |
| Iframe payment succeeded                                      | ✅                       |
| `PaymentIntent.status = "completed"`                          | ✅                       |
| `PaymentTransaction.status = "paid"`, `providerTxnId` present | ✅                       |
| `Receipt.status = "created"`, `providerDocId` present         | ✅                       |
| `Receipt.recipientSnapshot.source = "paymentIntent"`          | ✅                       |
| `Receipt.recipientSnapshot.numberIdMasked` present            | ✅                       |
| Raw `numberId` absent from Receipt                            | ✅                       |
| `Receipt.shareStatus = "sent"`, email received                | ✅                       |
| Receipt visible + downloadable in `/edit/card/settings`       | ✅                       |
| Post-payment navigate → `/edit/card/settings`                 | ✅                       |
| Pending PI count after smoke = 0                              | ✅                       |
| `User.subscription.status = "active"`                         | ✅                       |

**Redacted evidence note:** All personal/financial identifiers (paymentIntentId, paymentTransactionId, providerTxnId, providerDocId, userId, email, numberId) are redacted from this document per doc hygiene policy. Raw values were verified live by the operator during the smoke session.

---

## 9) Open P2 Tails (non-blocking, deferred)

| #    | Tail                                                                                    | Location                     | Risk                                                                              |
| ---- | --------------------------------------------------------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------- |
| P2-1 | `handleReceiptSave` sends a no-op PATCH if no profile fields changed                    | `CheckoutPage.jsx`           | Wastes a round-trip. No billing/security risk.                                    |
| P2-2 | `receiptOk` not cleared in no-diff path of `handleContinueToSummary`                    | `CheckoutPage.jsx`           | Stale success notice may briefly persist. UX-only.                                |
| P2-3 | `handleExternalFallback` may create orphaned external-mode PI when `paymentUrl` is null | `CheckoutPage.jsx`           | Orphaned PI expires via 2h TTL. No security or billing risk.                      |
| P2-4 | HTML tags not stripped from `name`/`nameInvoice`/`address` before YeshInvoice           | `tranzila.provider.js`       | Tags may appear in PDF. React escapes in UI. Low/medium risk.                     |
| P2-5 | Pricing CTA UX for active subscribers                                                   | `CheckoutPage.jsx` / Pricing | Active subscriber sees notice + redirect; no upgrade option visible. Polish item. |

---

## 10) Production Rollout Boundary

**THIS HANDOFF COVERS SANDBOX ONLY.**

The following items remain separate future contours. None are implied by this acceptance:

| Item                                                                             | Status              |
| -------------------------------------------------------------------------------- | ------------------- |
| Production terminal cutover (`TRANZILA_TERMINAL` → production)                   | Open (G6)           |
| `PRICES_AGOROT` restore to `3990`/`39990` after cancelling sandbox STO schedules | Open (G6 pre-req)   |
| `TRANZILA_SECRET` → production signing secret                                    | Open (G6)           |
| `TRANZILA_STO_TERMINAL` → production STO terminal                                | Open (G6)           |
| Full production E2E payment smoke                                                | Open (G6 follow-up) |
| Production recurring lifecycle proof (real customers + STO)                      | Open (G7)           |
| `YESH_INVOICE_ENABLED=true` with production credentials in Render                | Open (after G6)     |

**SSoT references:** `docs/runbooks/billing-flow-ssot.md` §16 (open gates), §17 (this workstream)  
**Go-live checklist:** `docs/runbooks/tranzila-go-live-checklist.md` §4.C (iframe smoke), §4.D (relay anti-regression)
