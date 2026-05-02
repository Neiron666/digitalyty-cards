# Cardigo Enterprise Handoff — YeshInvoice Receipt Lifecycle Sandbox Proof

**Date:** 2026-04-24  
**Contour:** Y3G.2 / Y3H.1  
**Status:** CLOSED — sandbox proof complete. Production rollout: NOT STARTED.  
**Author:** Engineering  
**Canonical billing SSoT:** `docs/runbooks/billing-flow-ssot.md` §9, §16

---

## 1. Executive Summary

The YeshInvoice receipt lifecycle (create receipt, share/email receipt, update `Receipt.shareStatus`) has been fully implemented and sandbox-proven on 2026-04-24. All pre-implementation gates (G1–G5) are closed. The fire-and-forget hooks are wired into both payment paths (first-payment and STO recurring). The real provider-originated STO recurring webhook was separately proven on 2026-04-22.

**Production rollout is NOT STARTED.** Two production gates remain open:

- **G6:** Production terminal cutover (`TRANZILA_TERMINAL`, `TRANZILA_SECRET`, `TRANZILA_STO_TERMINAL`, `PRICES_AGOROT` restore)
- **G7:** Production recurring lifecycle proof (real customers, production terminal)

---

## 2. Scope Tested

| Component                                  | File / Endpoint                               | Status              |
| ------------------------------------------ | --------------------------------------------- | ------------------- |
| `Receipt` model                            | `backend/src/models/Receipt.model.js`         | ✅ EXISTS           |
| `yeshinvoice.service.js`                   | `backend/src/services/yeshinvoice.service.js` | ✅ EXISTS           |
| `createReceiptYeshInvoice`                 | `yeshinvoice.service.js`                      | ✅ EXISTS           |
| `shareReceiptYeshInvoice`                  | `yeshinvoice.service.js`                      | ✅ EXISTS           |
| Receipt index migration                    | `backend/scripts/migrate-receipt-indexes.mjs` | ✅ EXISTS (applied) |
| First-payment hook                         | `tranzila.provider.js` — `handleNotify`       | ✅ WIRED            |
| Recurring hook                             | `tranzila.provider.js` — `handleStoNotify`    | ✅ WIRED            |
| YeshInvoice startup validation             | `backend/src/services/payment/index.js:44–49` | ✅ IMPLEMENTED      |
| `YESH_INVOICE_ENABLED=true` in sandbox env | `backend/.env`                                | ✅ ACTIVE           |
| Sandbox share test script                  | `backend/scripts/yeshinvoice-share-test.mjs`  | ✅ EXISTS           |

---

## 3. Proof Scenarios — Full Results

### 3.1 Proof Tier Classification

| Tier   | Description                                                                  |
| ------ | ---------------------------------------------------------------------------- |
| Tier 1 | Synthetic direct-backend (handler called directly, no real Tranzila webhook) |
| Tier 2 | Relay smoke (request through public cardigo.co.il → Netlify → Render)        |
| Tier 3 | Real provider-originated webhook (Tranzila server → cardigo.co.il)           |

### 3.2 Results Table

| #   | Scenario                                              | Tier | Result  | Date       | Notes                                                                                                   |
| --- | ----------------------------------------------------- | ---- | ------- | ---------- | ------------------------------------------------------------------------------------------------------- |
| 1   | Direct backend first-payment proof (synthetic notify) | 1    | ✅ PASS | 2026-04-24 | Fake direct-backend call; no Tranzila origin. No residue from polluted early attempt (see §5).          |
| 2   | First-payment replay / idempotency                    | 1    | ✅ PASS | 2026-04-24 | Duplicate notify → E11000 → silent no-op; no second `PaymentTransaction` or Receipt created.            |
| 3   | Real Tranzila sandbox first payment (user 2)          | 3    | ✅ PASS | 2026-04-24 | Real Tranzila DirectNG payment with real card token. `PaymentTransaction` + `Receipt` created in Mongo. |
| 4   | Tranzila token (`TranzilaTK`) capture verified        | 3    | ✅ PASS | 2026-04-24 | Token present in notify payload for STO create.                                                         |
| 5   | STO create from first payment                         | 3    | ✅ PASS | 2026-04-24 | `tranzilaSto.status="created"` confirmed in Mongo; `stoId` present.                                     |
| 6   | Direct STO notify proof (synthetic)                   | 1    | ✅ PASS | 2026-04-24 | `handleStoNotify` called directly; subscription extended.                                               |
| 7   | STO replay / idempotency                              | 1    | ✅ PASS | 2026-04-24 | Duplicate STO notify → E11000 → silent no-op.                                                           |
| 8   | YeshInvoice `Receipt.create` (provider doc issued)    | 1    | ✅ PASS | 2026-04-24 | `providerDocId` populated; `receiptStatus="created"` in Mongo.                                          |
| 9   | YeshInvoice `shareReceiptYeshInvoice` (email sent)    | 1    | ✅ PASS | 2026-04-24 | `Success=true` (uppercase envelope confirmed); receipt email delivered.                                 |
| 10  | `Receipt.shareStatus` update (pending → sent)         | 1    | ✅ PASS | 2026-04-24 | `shareStatus="sent"`, `sharedAt` set in Mongo.                                                          |
| 11  | Public relay smoke (cardigo.co.il → Netlify → Render) | 2    | ✅ PASS | 2026-04-24 | After Render warm-up. See §4 for cold-start caveat.                                                     |

### 3.3 Pre-session proof (separately verified)

| Scenario                                       | Tier | Result    | Date       | Classification                                                                                                                                                                                                                                                                              |
| ---------------------------------------------- | ---- | --------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Real provider-originated STO recurring webhook | 3    | ✅ PROVED | 2026-04-22 | `REAL_TRANZILA_STO_NOTIFY_E2E_SUCCESS_FULLY_VERIFIED`. `valik@cardigo.co.il`, contour 5.8f.9. Ledger: `sto_recurring_notify_count=6`, `sto_prefix_txn_count=6`. Subscription extended from `2026-05-20T16:05:50.657Z` → `2026-06-19T16:05:50.657Z` (exact +30 days from prior `paidUntil`). |

---

## 4. Known Caveats

### 4.1 SANDBOX-STO-002 — Reserved Failed Artifact

**Description:** First public relay smoke attempt returned `502 ERROR`.  
**Cause:** Render cold start + Netlify 9s function timeout. The Render backend was not yet warm when the public smoke was sent.  
**Classification:** False-negative infrastructure caveat. Not a defect.  
**Impact:** No DB residue. No `PaymentTransaction` or `Receipt` created.  
**Action:** Do not reuse reference ID `SANDBOX-STO-002`. This ID is permanently reserved as a failed probe artifact.

### 4.2 Render Cold-Start / Netlify 9s Timeout

Public relay smoke through `https://cardigo.co.il/api/payments/notify` (Netlify → Render) can return 502 if the Render backend is in cold-start state.

**Operator guidance:** Before running public relay smoke:

1. Warm up Render by making a lightweight request to the backend (e.g. health check or `GET /api/cards/known-slug`).
2. Allow 30–60 seconds after first response before sending the smoke notify.
3. A 502 on first attempt after cold start is expected — retry once after warm-up.

### 4.3 Early Polluted Fake Notify Attempt

One early direct-backend fake notify attempt was made before the proper sandbox proof sequence began. It created no DB residue (`PaymentTransaction` or `Receipt`). The ledger is clean. This early attempt is documented only to avoid confusion when auditing Render logs.

### 4.4 Local Sandbox Env Correction

During the proof session, the local env was confirmed as:

```
TRANZILA_TERMINAL=testcards
TRANZILA_STO_TERMINAL=testcardstok
YESH_INVOICE_ENABLED="true"
YESH_INVOICE_API_BASE=https://api.yeshinvoice.co.il
```

The production terminal vars are commented out in `backend/.env`. Do not uncomment them until the dedicated pre-production rollout contour.

### 4.5 PRICES_AGOROT Sandbox Values

`PRICES_AGOROT` is currently set to `{ monthly: 500, yearly: 500 }` (intentional sandbox value). This must NOT be changed while active sandbox STO schedules exist. Changing prices while active STO schedules are running causes `amount_mismatch` on every subsequent recurring notify. Price restore (`3990`/`39990`) is a dedicated pre-production contour item.

### 4.6 Fake vs Real Proof Separation

- **Scenario 1 (direct backend synthetic):** A fake direct-backend notify was used to prove the fire-and-forget hook without a real Tranzila origin. This proves hook wiring and `Receipt` creation but does NOT prove real Tranzila provider behaviour.
- **Scenario 3 (real sandbox first payment):** A real Tranzila DirectNG payment was made with a real test card. This is the Tier 3 first-payment proof.
- These two scenarios are distinct. The fake synthetic proof does not substitute for the real provider proof.

---

## 5. YeshInvoice API Contract (Confirmed)

| Field             | Value                                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------------------- |
| Base URL          | `https://api.yeshinvoice.co.il` (`YESH_INVOICE_API_BASE`)                                                  |
| Auth header       | `Authorization: JSON.stringify({ secret, userkey })` — literal JSON string                                 |
| Response envelope | `createDocument`: `{ Success: bool, ErrorMessage: string, ReturnValue: { id, docNumber, pdfurl, url } }` — uppercase fields. `shareDocument`: `{ Success: bool, ErrorMessage: string, ReturnValue: bool }` — `ReturnValue: true` = email dispatched. See post-proof addendum §9. |
| Document type     | 6 (קבלה — for עוסק פטור)                                                                                   |
| `Success` casing  | **Uppercase `S`** — `raw?.Success` is the correct path; `raw?.success` is `null` (confirmed sandbox proof) |

---

## 6. Final Accepted Truth Statement

As of 2026-04-24, the following is the accepted project truth:

1. **YeshInvoice implementation = COMPLETE.** `Receipt.model.js`, `yeshinvoice.service.js`, fire-and-forget hooks in `tranzila.provider.js` all exist and are wired.
2. **Sandbox proof = COMPLETE.** All 11 scenarios listed in §3.2 passed. Real provider-originated STO webhook separately proved on 2026-04-22.
3. **Real first-payment webhook = PROVED** (Tier 3, 2026-04-24).
4. **Real STO recurring webhook = PROVED** (Tier 3, 2026-04-22, `REAL_TRANZILA_STO_NOTIFY_E2E_SUCCESS_FULLY_VERIFIED`).
5. **Synthetic direct proof = PROVED** (Tier 1, 2026-04-24).
6. **Public relay smoke = PROVED** (Tier 2, 2026-04-24, after Render warm-up).
7. **YeshInvoice `Receipt.create` = PROVED** (sandbox API, 2026-04-24).
8. **YeshInvoice `shareReceiptYeshInvoice` = PROVED** (sandbox API, 2026-04-24).
9. **`Receipt.shareStatus` update = PROVED** (Mongo write, 2026-04-24).
10. **Production rollout = NOT STARTED.** G6 and G7 remain open.

---

## 7. Open Production Gates (NOT STARTED)

| Gate | Description                                                                                                                                                                                                 | Status |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| G6   | Production terminal cutover: replace `testcards`/`testcardstok` with `fxpcardigotok`/production STO terminal; restore `PRICES_AGOROT` to `3990/39990` **after** cancelling all active sandbox STO schedules | OPEN   |
| G7   | Production recurring lifecycle proof: real customers, production terminal, real recurring charge received and processed                                                                                     | OPEN   |

**Pre-production contour prerequisite:** Cancel/deactivate all active sandbox STO schedules (`valik@cardigo.co.il`, `neiron.player@gmail.com` test accounts) in the Tranzila `testcardstok` portal before restoring production prices. Changing `PRICES_AGOROT` while active sandbox schedules exist causes `amount_mismatch` on every subsequent recurring notify.

---

## 8. Next Recommended Contour

**Y3H.2 — Pre-production tails audit (READ-ONLY)**

Scope:

- Verify current Render env state (which env vars are set; confirm `YESH_INVOICE_ENABLED` is NOT set to `true` on production Render)
- Confirm sandbox STO active/cancelled status for `valik` and `neiron` test accounts
- Confirm `PRICES_AGOROT` values in `backend/src/config/plans.js` (source of truth) vs current sandbox env
- Identify any other pre-production gaps before opening the bounded production rollout contour

**Do NOT open the production rollout contour until the pre-production tails audit is complete.**

---

## 9. Post-proof addendum — YeshInvoice shareDocument ReturnValue contract fix

**Date:** 2026-05-02
**Contour:** YESHINVOICE_SHARE_EMAIL_REGRESSION_DOC_CLOSURE_P2D
**Phase 2A fix applied:** 2026-05-02
**Phase 3A verification:** PASS (all gates EXIT:0, 2026-05-02)

### Incident summary

The original `shareReceiptYeshInvoice` implementation checked only `raw.Success === true` before marking a share as successful. The correct YeshInvoice API contract for `shareDocument` requires both `Success: true` AND `ReturnValue: true`. `Success: true` alone means the API request was accepted; `ReturnValue: true` means the email was actually dispatched by the provider. The two fields are not equivalent for the share operation.

This was a documentation/code misunderstanding arising from conflating `createDocument` response semantics (where `ReturnValue` is an object `{ id, docNumber, pdfurl, url }`) with `shareDocument` response semantics (where `ReturnValue` is a boolean).

### Historical clarification for the 2026-04-24 proof

The 2026-04-24 sandbox proof remains **valid and is not invalidated**. The email was delivered and `Receipt.shareStatus` was set to `sent` correctly in that run. The bug did not manifest because `ReturnValue` happened to be `true` in those runs. However, the old code did not verify `ReturnValue` — meaning a future case where `Success: true, ReturnValue: false` would have been silently mis-classified as `sent`. Phase 2A closes this gap.

### Phase 2A fix summary (5 changes, 2 files)

1. `shareReceiptYeshInvoice` now requires `raw.ReturnValue === true` (in addition to `raw.Success === true`) before returning `ok: true`.
2. `Success: true` with `ReturnValue !== true` returns `{ ok: false, error: "share_document_not_sent" }`.
3. Missing `providerDocId` returns `{ ok: false, error: "missing_provider_doc_id" }` before the API call is made.
4. Undocumented `email: customerEmail` field removed from the `shareDocument` request body. Body is now `{ id, SendEmail, SendSMS }` only — matching the documented API contract exactly.
5. Two safe structured warn-level log events added to `tranzila.provider.js` share IIFEs (both `first_payment` and `sto_recurring` flows): `receipt_share_failed` (share returned `ok: false`) and `receipt_share_exception` (unexpected throw). Both contain only non-sensitive boolean presence fields.

Files changed: `backend/src/services/yeshinvoice.service.js`, `backend/src/services/payment/tranzila.provider.js`. No schema, env, frontend, or payment ACK changes.

### Phase 3A verification summary

All gates passed (EXIT:0, 2026-05-02): import sanity, `sanity:imports` (20 imports, 0 failed), `check:inline-styles`, `check:skins` (28 files), `check:contract` (25 templates), `build` (✓ built). Anti-leak grep confirmed no forbidden fields in share warning blocks. `ReturnValue` check confirmed at exact line. `email: customerEmail` absence confirmed.

### Controlled smoke summary

Controlled end-to-end smoke for `neiron.player@gmail.com` passed (2026-05-02): `PaymentTransaction.status=paid`, `Receipt` created, `Receipt.shareStatus=sent`, `Receipt.shareFailReason=null`, `recipientEmailMatchesTarget=true`, receipt email arrived automatically in the correct inbox, STO created.

### Cross-reference

Canonical corrected API contract: `docs/runbooks/billing-flow-ssot.md §9` — the `yeshinvoice.service.js` implementation bullet now documents `createDocument` and `shareDocument` `ReturnValue` shapes separately with anti-drift wording.
