# Cardigo Enterprise Handoff — Receipt Cabinet Frontend

**Date:** 2026-04-24  
**Contour:** RECEIPT_CABINET_FRONTEND_IMPL + RECEIPT_CABINET_FRONTEND_ACCORDION_IMPL  
**Status:** CLOSED — feature implemented end-to-end and operator-verified. Production rollout not part of this document.  
**Canonical billing SSoT:** `docs/runbooks/billing-flow-ssot.md`

---

## 1. Scope Closed

This handoff closes the full-stack receipt cabinet feature:

| Scope item                                                              | Status         |
| ----------------------------------------------------------------------- | -------------- |
| Backend list route (`GET /api/account/receipts`)                        | ✅ IMPLEMENTED |
| Backend proxy download route (`GET /api/account/receipts/:id/download`) | ✅ IMPLEMENTED |
| Frontend receipt history UI in SettingsPanel                            | ✅ IMPLEMENTED |
| Accordion UX (native `<details>/<summary>`)                             | ✅ IMPLEMENTED |

---

## 2. File Surface

### Backend

| File                                   | Change                                                                                |
| -------------------------------------- | ------------------------------------------------------------------------------------- |
| `backend/src/routes/account.routes.js` | Added `GET /api/account/receipts` and `GET /api/account/receipts/:id/download` routes |

### Frontend

| File                                                             | Change                                                                                                                                                                                                             |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `frontend/src/components/editor/panels/SettingsPanel.jsx`        | Added `getReceipts` import; added `receipts`, `receiptsLoading`, `receiptsError` state; added secondary `getReceipts(12)` fetch in `useEffect`; added receipt history block inside `<details>/<summary>` accordion |
| `frontend/src/components/editor/panels/SettingsPanel.module.css` | Added `receiptsBlock`, `collapsible`, `collapsibleTrigger`, and related classes                                                                                                                                    |
| `frontend/src/services/account.service.js`                       | Added `getReceipts(limit = 10)` function                                                                                                                                                                           |

---

## 3. Backend Truth

### `GET /api/account/receipts`

- `requireAuth` — cookie-backed, httpOnly
- Rate-limited: 30 requests / 10 minutes per `userId`
- Reads `Receipt` model only — `status: "created"`, sorted newest-first
- Limit: server-clamps to range 1–20 (client requests `?limit=12`)
- Returns: `{ receipts: [...], hasMore: boolean, total: number }`
- `PaymentTransaction` is **not** exposed; cabinet reads `Receipt` only

### `GET /api/account/receipts/:id/download`

- `requireAuth`
- Rate-limited: 20 requests / 10 minutes per `userId`
- ObjectId pre-validation → 404 on invalid format (anti-enumeration)
- Ownership by query: `Receipt.findOne({ _id: id, userId: req.userId })` → 404 if not found or wrong owner (anti-enumeration, no existence leakage)
- **Backend proxy only:** fetches PDF bytes from the `pdfUrl` stored in the `Receipt` document; raw provider URL is **never** forwarded to the client
- Response headers: `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="receipt.pdf"`, `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`

### Why backend proxy (not redirect)?

The `pdfUrl` value returned by YeshInvoice contains a query-string access key. Forwarding this URL to the browser — whether as a redirect or as a DTO field — would expose the access credential to the client. Backend proxy is the only safe download strategy.

### Receipt cabinet source of truth

The cabinet reads the `Receipt` model, not `PaymentTransaction`. The `PaymentTransaction` ledger is an internal billing record; its fields (`providerTxnId`, `amountAgorot`, `payloadAllowlisted`, etc.) are never surfaced in the cabinet API.

### Receipt DTO (cabinet-facing)

```json
{
    "id": "ObjectId string",
    "createdAt": "ISO date | null",
    "issuedAt": "ISO date | null",
    "amountAgorot": "number | null",
    "plan": "monthly | yearly | null",
    "status": "created",
    "shareStatus": "pending | sent | failed | skipped | null",
    "hasPdf": "boolean"
}
```

**Not exposed in DTO:** `pdfUrl`, `paymentTransactionId`, `providerDocId`, `providerDocNumber`, `documentUrl`, `pdfPath`, or any other raw provider field.

---

## 4. Frontend Truth

- **Location:** `/edit/card/settings` → Section 3: תשלומים
- **UI pattern:** Native HTML `<details>/<summary>` accordion, labelled **"קבלות"**
- **Collapsed by default** — identical pattern to שינוי סיסמה / מחיקת כרטיס / מחיקת חשבון in Section 4
- **Fetch:** `getReceipts(12)` — up to 12 latest receipts on load
- **Secondary fetch:** receipts fetch is independent from the account summary fetch; failure in receipts fetch does not affect `accountLoading` or `accountError` state
- **Error isolation:** `.catch(() => setReceiptsError("לא ניתן לטעון קבלות."))` only
- **PDF download link:** plain `<a href="/api/account/receipts/:id/download">` — browser sends cookie on same-origin GET automatically; NO `download` attribute, NO axios, NO blob
- **Amount formatting:** `Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS" })` on `amountAgorot / 100`
- **Date formatting:** `Intl.DateTimeFormat("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" })`

---

## 5. Manual Acceptance Truth

The following were operator-verified on 2026-04-24:

| Scenario                                            | Result      |
| --------------------------------------------------- | ----------- |
| User with receipts — list visible and accurate      | ✅ Verified |
| User without receipts — empty state displayed       | ✅ Verified |
| PDF download works (secure backend proxy)           | ✅ Verified |
| Accordion UX (collapsed by default, opens on click) | ✅ Verified |

**Not yet explicitly re-documented as manually verified:**

- Wrong-owner download attempt → 404
- Invalid ObjectId in download URL → 404
- Unauthenticated request → 401

These scenarios are code-complete (ownership-by-query, ObjectId pre-validation, `requireAuth`). They are not falsely claimed as manually verified in this document.

---

## 6. Security Properties

| Property                       | Implementation                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Authentication required        | `requireAuth` middleware on both routes                                                                |
| Ownership isolation (list)     | `Receipt.find({ userId: req.userId, ... })` — query-scoped to owner                                    |
| Ownership isolation (download) | `Receipt.findOne({ _id, userId: req.userId })` → 404 on mismatch                                       |
| Anti-enumeration               | 404 (not 403) on missing or wrong-owner; ObjectId format pre-validated                                 |
| No existence leakage           | Receipt detail not revealed before ownership confirmed                                                 |
| Download strategy              | Backend proxy — `pdfUrl` never forwarded to client                                                     |
| Response hardening             | `Content-Type: application/pdf`, `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff` |
| List rate limit                | 30 requests / 10 minutes per `userId`                                                                  |
| Download rate limit            | 20 requests / 10 minutes per `userId`                                                                  |
| No raw provider fields in DTO  | `pdfUrl`, `providerDocId`, `providerDocNumber`, `documentUrl` all stripped from response               |

---

## 7. MVP Limitations

- **No pagination UI:** frontend requests up to 12 receipts; `hasMore` is returned in the API response but there is no "load more" button in the MVP
- **`failed`/`skipped` receipts not user-facing:** cabinet list is filtered to `status: "created"` only; failed issuance is not surfaced to the user
- **Formatter objects inside JSX IIFE:** `Intl.DateTimeFormat` and `Intl.NumberFormat` instances are created inside the render block per component render. Acceptable for MVP; can be hoisted to module scope in a future pass if performance warrants.
- **Retroactive receipts:** existing `PaymentTransaction` records without a corresponding `Receipt` do not appear in the cabinet. Retroactive backfill is a separate operator decision / separate contour.
- **Admin receipt panel:** not implemented. Admin can query MongoDB directly or via admin API if needed.
- **Negative security scenario manual tests:** not yet explicitly re-documented here (see §5).

---

## 8. Frontend Gates (Passed 2026-04-24)

All 4 frontend gates passed at EXIT 0:

```
npm.cmd run check:inline-styles   EXIT 0
npm.cmd run check:skins           EXIT 0
npm.cmd run check:contract        EXIT 0
npm.cmd run build --if-present    EXIT 0
```

No inline styles, no skin violations, no contract violations, clean production build.

---

## 9. Next Open Items

The following items are open but are **separate future contours** — they are not in scope for this document:

| Item                                                             | Status                                 |
| ---------------------------------------------------------------- | -------------------------------------- |
| G6: Production terminal cutover                                  | Open — separate pre-production contour |
| G7: Production recurring lifecycle proof                         | Open — separate pre-production contour |
| Enable `YESH_INVOICE_ENABLED=true` on production Render          | Blocked by G6 + G7                     |
| Retroactive receipts backfill                                    | Operator decision — separate contour   |
| Admin receipt panel                                              | Deferred                               |
| Pagination / load-more UI                                        | Deferred                               |
| Negative security scenario explicit manual re-test documentation | Deferred                               |

---

## 10. Final Status

**Feature closure accepted (2026-04-24).**

Receipt cabinet is implemented end-to-end: backend list + download proxy routes are live, frontend accordion UI is in Settings → תשלומים → "קבלות", and all operator-verified acceptance scenarios pass.

Production rollout and Render `YESH_INVOICE_ENABLED` enablement are **not** part of this document. See `billing-flow-ssot.md §9` and the go-live checklist for G6/G7 gating.
