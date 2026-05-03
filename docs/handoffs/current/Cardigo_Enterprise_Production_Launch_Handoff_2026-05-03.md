# Cardigo Enterprise Production Launch Handoff — 2026-05-03

**Date:** 2026-05-03
**Project:** Cardigo — Israel-first digital business card / mini business page SaaS
**Canonical domain:** https://cardigo.co.il
**Status:** PRODUCTION OPEN
**Audience:** Next ChatGPT window / Copilot Agent / operator / on-call engineer.

This file is the authoritative post-launch operational truth for Cardigo as of 2026-05-03.
It supersedes all pre-launch handoffs for production status claims.
Pre-launch handoffs in docs/handoffs/current/ remain valid for architecture/billing lifecycle context but must not be read as current infrastructure truth.

---

## 0. How to use this file

This file is the SSoT for:

- current production open/closed status;
- production infrastructure truth;
- DB baseline after cleanup;
- production payment E2E results;
- gate removal truth;
- SEO/indexing truth;
- remaining tails and next contours;
- emergency/support notes.

For billing architecture and lifecycle details, consult:

- docs/runbooks/billing-flow-ssot.md (Tier 2 canon)
- docs/runbooks/tranzila-go-live-checklist.md
- docs/runbooks/yeshinvoice-integration-runbook.md
- docs/handoffs/current/Cardigo_Enterprise_Next_Chat_Master_Handoff_2026-05-03_Billing_Production_Readiness.md (architecture baseline)

---

## 1. Executive Status

Cardigo is PRODUCTION OPEN as of 2026-05-03.

- Canonical URL: https://cardigo.co.il
- Frontend: Netlify (production deploy active)
- Backend: Render (production env active)
- DB: MongoDB Atlas cardigo_prod
- Public API gate: REMOVED
- Global noindex: REMOVED
- robots.txt: allows crawling
- sitemap.xml: public and canonical
- Payment E2E: PASSED (production first payment, production STO create, production receipt)
- Self-delete with active STO: PASSED

Remaining tails exist and are classified in Section 15.

---

## 2. Production Infrastructure Truth

| Component               | Provider                     | Status                         |
| ----------------------- | ---------------------------- | ------------------------------ |
| Frontend SPA            | Netlify                      | Live                           |
| Netlify proxy function  | Netlify Functions            | Gate-free; proxy secret active |
| Payment notify function | Netlify Functions            | Token-protected                |
| STO notify function     | Netlify Functions            | Token-protected                |
| Backend API             | Render                       | Live                           |
| Database                | MongoDB Atlas (cardigo_prod) | Live                           |
| File storage            | Supabase Storage             | Live                           |
| Transactional email     | Mailjet                      | Live (verified sender)         |
| Payments / checkout     | Tranzila DirectNG            | Production terminal active     |
| Recurring billing       | Tranzila MyBilling STO       | Production STO terminal active |
| Receipts                | YeshInvoice                  | Production account active      |
| Analytics               | GTM + Meta Pixel             | Active                         |

Proxy architecture:

- Browser requests to /api/_, /og/_, /sitemap.xml → Netlify proxy function → Render backend.
- Proxy function forwards x-cardigo-proxy-secret to backend origin lock.
- No gate cookie check. No CARDIGO_GATE_COOKIE_VALUE check.
- Payment notify and STO notify are protected by ?nt= and ?snk= token checks respectively.

---

## 3. MongoDB Production Baseline (post-cleanup, 2026-05-03)

Active operational database: cardigo_prod

- Collections: 26
- Indexes: 111
- users: 0 (test user deleted after smoke)
- cards: 0 (test card deleted after smoke)
- paymentintents: 2 (retained; fiscal/audit records)
- paymenttransactions: 1 (retained; fiscal/audit record from successful production payment)
- receipts: 1 (retained; fiscal/audit record from successful production receipt)

Important: The DB is not fully empty. Fiscal and audit records are intentionally retained per retention policy (docs/policies/POLICY_RETENTION_V1.md). Do not treat paymentintents/paymenttransactions/receipts as cleanup targets.

Structural backup: A MongoDB structural backup of cardigo_prod was taken before production cutover. It exists as an operator-held artifact. It is not a user/card data backup.

Index governance invariants:

- MONGOOSE_AUTO_INDEX=false
- MONGOOSE_AUTO_CREATE=false
- All indexes were applied by explicit operator scripts only. Runtime auto-index creation is disabled.

---

## 4. Supabase Baseline

- Supabase cleanup was accepted before production open.
- public bucket: only structural placeholder objects remained; no real user uploads present.
- anon private bucket: clean.
- No production blocker from Supabase state.
- Production Supabase project is active and connected to Render backend.

---

## 5. Env Cutover Truth

Production environment was switched to production values on all providers. Summary (no secret values):

Render (backend):

- MONGO_URI: points to cardigo_prod on Atlas
- PAYMENT_PROVIDER: tranzila (production)
- TRANZILA_TERMINAL: production clearing terminal (not sandbox testcards)
- TRANZILA_STO_TERMINAL: production MyBilling/STO terminal (not testcardstok)
- TRANZILA_NOTIFY_URL: https://cardigo.co.il/api/payments/notify?nt=<CARDIGO_NOTIFY_TOKEN>
- TRANZILA_NOTIFY_DELIVERY_MODE: portal
- TRANZILA_HANDSHAKE_ENABLED: true
- TRANZILA_STO_CREATE_ENABLED: true (production)
- CARDIGO_NOTIFY_TOKEN: matches Netlify
- CARDIGO_STO_NOTIFY_TOKEN: matches Netlify
- CARDIGO_PROXY_SHARED_SECRET: matches Netlify
- YESHINVOICE: production account/keys active
- Mailjet sender: verified

Netlify (frontend/functions):

- VITE_PUBLIC_ORIGIN: https://cardigo.co.il
- VITE_SEO_DEBUG: absent from Netlify dashboard (blanked locally in .env and .env.local)
- CARDIGO_NOTIFY_TOKEN: matches Render
- CARDIGO_STO_NOTIFY_TOKEN: matches Render
- CARDIGO_PROXY_SHARED_SECRET: matches Render
- CARDIGO_GATE_PASSWORD: removed from Netlify dashboard
- CARDIGO_GATE_COOKIE_VALUE: removed from Netlify dashboard
- CARDIGO_GATE_DEBUG: removed from Netlify dashboard

Local backend .env: gate keys (CARDIGO_GATE_PASSWORD, CARDIGO_GATE_COOKIE_VALUE) manually removed by operator. Local file only; gitignored; no Render impact.

---

## 6. First Failed Production Payment — Incident Record

**Date:** 2026-05-03 (pre-success smoke)
**Root cause:** Tranzila portal notify URL was configured with double https:// prefix (https://https://cardigo.co.il/api/payments/notify?nt=...).
**Effect chain:**

- Tranzila could not reach the notify URL.
- Notify never arrived at Netlify payment-notify function.
- Cardigo fulfillment never ran.
- PaymentIntent remained in pending state.
- No PaymentTransaction was created.
- No Receipt was created.
- No user subscription was activated.
  **Resolution:**
- The provider-side payment was manually cancelled/refunded in Tranzila portal.
- The provider-side STO (if any was created before the notify attempt) was manually cancelled in Tranzila portal.
- The notify URL was corrected to single https://cardigo.co.il/api/payments/notify?nt=<token>.
- The second E2E attempt passed (see Section 7).
  **Retained records:**
- The pending PaymentIntent(s) from the failed attempt are retained in MongoDB (paymentintents=2 includes these).
- No PaymentTransaction or Receipt was created for the failed attempt. There is nothing to retain from the ledger perspective.
  **Anti-overclaim:** Raw provider transaction IDs, STO IDs, or confirmation codes from this incident are not documented here.

---

## 7. Successful Production Payment E2E — Summary

**Date:** 2026-05-03
**Result:** PASS

Verified state after successful production payment (safe booleans only):

Payment / fulfillment:

- providerTxnIdPresent=true
- paymentTransactionStatus=paid
- userSubscriptionStatus=active (during smoke)
- cardBillingStatus=active (during smoke)
- tranzilaTokenPresent=true (captured from first payment)

STO:

- stoIdPresent=true
- stoStatus=created (during smoke)

Receipt:

- receiptIdPresent=true
- receiptStatus=created
- receiptShareStatus=sent
- documentUniqueKeyPresent=true

All sensitive raw values (tranzilaToken, stoId, providerTxnId, documentUniqueKey, ConfirmationCode) are intentionally not documented. See Section 17 anti-secret policy.

---

## 8. YeshInvoice Receipt Truth

- Receipt was created in production YeshInvoice account.
- Receipt was shared/relayed via YeshInvoice provider.
- Receipt email arrived and was visible to operator.
- Receipt is retained in MongoDB receipts collection.
- receiptIdPresent=true
- documentUniqueKeyPresent=true
- pdfUrlPresent=true (raw URL not documented)

Important nuance:

- receiptShareStatus=sent means YeshInvoice accepted the share request.
- It does not guarantee inbox delivery (email infrastructure is provider-side).
- If a receipt email is missing, inspect Receipt.status, Receipt.shareStatus, and YeshInvoice dashboard. Do not create a duplicate document blindly.

---

## 9. STO Production Truth

- Tranzila STO (Standing Order) was successfully created in production MyBilling/STO terminal after the successful first payment.
- stoStatus=created during smoke.
- stoIdPresent=true.
- STO terminal: production fxpcardigotok (not testcardstok).

Important:

- Production recurring STO notify E2E has NOT yet been proven.
- Sandbox STO recurring notify E2E was proven on 2026-05-02 (see docs/handoffs/current/Cardigo_Enterprise_Master_Handoff_2026-05-02_STO_Notify_E2E_Closed.md).
- Production first recurring charge will occur in approximately one month from the production payment date.
- When the production recurring charge fires, the notify path must be monitored and verified.
- Production recurring notify E2E is classified as P1 tail (see Section 15).

---

## 10. Self-Delete with Active STO — Production Smoke

- Self-delete was executed on the paid production test user after payment/STO/receipt smoke.
- Tranzila STO was cancelled provider-side as part of the self-delete flow (provider-first cancellation).
- User document was deleted.
- Card document was deleted.
- PaymentTransaction was retained (fiscal/audit record).
- Receipt was retained (fiscal/audit record).
- Fiscal retention invariant: PASSED.

---

## 11. Final Cleanup State (post-smoke)

- users: 0
- cards: 0
- paymentintents: 2 (retained intentionally — includes pending PaymentIntent(s) from failed attempt and completed PaymentIntent from successful payment)
- paymenttransactions: 1 (retained intentionally — successful production payment ledger record)
- receipts: 1 (retained intentionally — successful production receipt)
- No test users or test cards remain in cardigo_prod.
- Fiscal and audit records (paymentintents, paymenttransactions, receipts) must not be deleted.

---

## 12. Public Gate Removal Truth

All gate components have been removed or tombstoned. Gate is fully off.

frontend/netlify/functions/proxy.js:

- No longer reads CARDIGO_GATE_COOKIE_VALUE.
- No longer checks \_\_Host-cardigo_gate cookie.
- Gate cookie block removed from proxy function.
- /api/health returns HTTP 200 without any gate cookie.

frontend/public/gate.html:

- Static file deleted.
- /gate.html is tombstoned via Netlify \_redirects rule: /gate.html → HTTP 404.

frontend/netlify/functions/auth.js:

- Old auth function (password/cookie issuance) was deleted.
- A minimal 404 tombstone function was re-created in its place.
- GET /.netlify/functions/auth returns HTTP 404 JSON { ok: false, code: "NOT_FOUND" }.
- POST /.netlify/functions/auth returns HTTP 404 JSON { ok: false, code: "NOT_FOUND" }.
- No password logic. No cookie issuance. No env reads. No CARDIGO*GATE*\* references.

frontend/public/\_redirects:

- /gate.html /index.html 404 rule is present before the /\* SPA fallback.

Netlify dashboard:

- CARDIGO_GATE_PASSWORD: removed.
- CARDIGO_GATE_COOKIE_VALUE: removed.
- CARDIGO_GATE_DEBUG: removed.

Local backend .env (gitignored, operator-only):

- CARDIGO_GATE_PASSWORD and CARDIGO_GATE_COOKIE_VALUE manually removed.

Payment notify and STO notify remain protected:

- POST /api/payments/notify without valid ?nt= token → 403.
- POST /api/payments/sto-notify without valid ?snk= token → 403.
- These protections are independent of the gate and remain fully active.

Retired gate document:

- docs/security/SECURITY_TEMP_API_GATE.md has been marked RETIRED/ARCHIVED at the top.
- The old body is preserved as historical reference only.
- Do not use it as an operational runbook.

---

## 13. SEO / Indexing Truth

global noindex:

- Removed from frontend/index.html.
- HTML shell no longer contains <meta name="robots" content="noindex, nofollow">.
- Homepage, pricing, and all other non-excluded public pages are now indexable by Google.

robots.txt (frontend/public/robots.txt):

- User-agent: \* / Allow: / / Sitemap: https://cardigo.co.il/sitemap.xml
- No Disallow rules.

sitemap.xml:

- Served via Netlify proxy function → backend /sitemap.xml → sitemap.routes.js.
- Returns 200 with canonical URLs under https://cardigo.co.il.
- Static paths: 10 marketing pages (/, /blog, /pricing, /contact, /guides, /cards, /privacy, /terms, /accessibility-statement, /payment-policy).
- Premium user card URLs included; free-tier cards excluded via resolveEffectiveTier.

VITE_SEO_DEBUG:

- Blanked in frontend/.env (VITE_SEO_DEBUG=) and frontend/.env.local (VITE_SEO_DEBUG=).
- Absent from Netlify dashboard env vars.
- In production, PROD=true short-circuits getAllowTracking() regardless of this variable.
- SeoHelmetDebugMeta is never mounted anywhere in the app; debug meta tags were never rendered.

Intentional per-route noindex policies remain active and must NOT be removed:

- /preview/\* (PreviewCard.jsx): noindex, nofollow, noarchive.
- /payment/checkout and all checkout states (CheckoutPage.jsx): noindex, nofollow.
- /payment/iframe-return (IframeReturnPage.jsx): noindex, nofollow.
- Free-tier public cards (backend cardDTO.js): robots: "noindex" injected in DTO.

Remaining SEO tails:

- Google Search Console verification and sitemap submission not yet completed (P1 tail).

---

## 14. Payment / Security Invariants

These invariants must not be violated by future changes:

- Browser redirect after payment (success_url, fail_url) is UX-only. It does not prove payment and must never grant entitlement.
- Server-side Tranzila notify (POST /api/payments/notify) is the sole payment truth.
- PaymentTransaction ledger is written before user/card fulfillment.
- Duplicate providerTxnId → idempotent OK → no double-fulfillment.
- Receipt is created only on actual paid transaction. Not on cancel, resume, delete, revoke, or admin-delete.
- PaymentTransaction and Receipt are fiscal/audit records. They must be retained through user delete, admin delete, and self-delete.
- Tranzila token (user.tranzilaToken) must never be returned in DTO, API response, log, audit, or documentation.
- Use tranzilaTokenPresent=true/false boolean only.
- Admin revoke clears local token after safe STO cancellation gate. It does not create receipt, refund, payment, or email.
- Delete-payment-method clears local token only when STO is not active/pending. It does not cancel STO.
- Cancel auto-renewal intentionally retains token for resume.
- Resume auto-renewal does not create payment, receipt, or YeshInvoice document.

---

## 15. Remaining Tails

### P1 — Must complete before treating production as fully hardened

P1.1 — Google Search Console verification and sitemap submission.
Google Search Console has not been verified and sitemap.xml has not been submitted. Until GSC is configured, crawl errors and indexing gaps are not visible. This is the highest priority SEO tail.

P1.2 — Production recurring STO notify E2E.
The production first payment created an STO schedule. The real production recurring charge has not yet fired. When it does, the notify path (POST /api/payments/sto-notify) must process successfully. No monitoring is in place for this. This should be watched and verified when the charge occurs (approximately one month from the production payment date).

P1.3 — Monitoring and alerting baseline.
Currently there is no Sentry integration, no Render health monitors, no alert for failed payment notify, no alert for STO notify failures, no alert for YeshInvoice errors, no cron monitor. Any silent failure in production notify/STO/receipt would be invisible.

P1.4 — Production incident/support runbook for payment and receipt failures.
See Section 18 for interim guidance. A formal runbook should be created as a separate bounded contour.

### P2 — Should complete soon, not blocking production open

P2.1 — Update billing-flow-ssot.md to reflect production cutover complete and remove stale sandbox-cleanup warning.

P2.2 — Annotate tranzila-go-live-checklist.md to note production E2E was completed on 2026-05-03.

P2.3 — Update backend-verification-and-deploy.md cross-reference to SECURITY_TEMP_API_GATE.md to note that doc is now retired.

P2.4 — Legal/tax/accountant confirmation for production receipt retention policy and fiscal compliance.

P2.5 — Route-specific noindex review for /edit/_, /admin/_ if desired for SEO hygiene.

### P3 — Low priority / cosmetic

P3.1 — Move old pre-launch handoffs from docs/handoffs/current/ to docs/handoffs/archive/.

P3.2 — Remove old local cookie test artifacts (cg_cookies.txt, cookies.txt) from repo root if still present.

P3.3 — og:site_name improvement (previously deferred).

P3.4 — Full rewrite/cleanup of SECURITY_TEMP_API_GATE.md body in a later docs cleanup contour.

P3.5 — Sandbox STO schedule cleanup confirmation (testcardstok sandbox schedule from 2026-05-02 E2E should be cancelled/deactivated to avoid unexpected future sandbox charges).

---

## 16. Next Bounded Contours (recommended order)

1. POST_LAUNCH_SEARCH_CONSOLE_AND_SITEMAP_SUBMISSION_P1
   Verify GSC ownership, submit sitemap, confirm first index coverage report visible.

2. PRODUCTION_MONITORING_AND_ALERTING_BASELINE_P1
   Establish Render uptime monitor, Sentry (or equivalent) error tracking for backend, alerts for payment notify failures, STO notify failures, YeshInvoice errors.

3. BILLING_RECURRING_STO_PRODUCTION_NOTIFY_WATCH_P1
   Watch for the real production recurring STO charge. When it fires, verify notify was received, PaymentTransaction created, subscription extended, receipt created. Treat as a live E2E proof gate.

4. POST_LAUNCH_DOCS_STALE_RUNBOOK_CLEANUP_P2
   Update billing-flow-ssot.md, tranzila-go-live-checklist.md, and backend-verification-and-deploy.md.
   Archive pre-launch handoffs.

5. SEO_ROUTE_NOINDEX_HYGIENE_P2_P3
   Review /edit/_, /admin/_ noindex policy. Low priority.

---

## 17. Anti-Secret / Anti-Overclaim Policy

### What must NEVER appear in docs, prompts, API responses, or logs

- raw tranzilaToken / TranzilaTK value
- raw stoId (STO ID)
- raw providerTxnId (raw transaction ID)
- raw documentUniqueKey (YeshInvoice document key)
- raw YeshInvoice receipt or document ID
- raw CARDIGO_NOTIFY_TOKEN value
- raw CARDIGO_STO_NOTIFY_TOKEN value
- raw CARDIGO_PROXY_SHARED_SECRET value
- raw JWT_SECRET / EMAIL_BLOCK_SECRET
- raw Tranzila terminal secrets or HMAC values
- raw card numbers / PAN / CVV
- raw cookie or session values
- raw Mailjet API key
- raw Supabase service key
- raw CARDIGO_GATE_PASSWORD / CARDIGO_GATE_COOKIE_VALUE (now removed but still secret)

### Allowed safe wording

- tranzilaTokenPresent=true/false
- stoIdPresent=true/false
- receiptIdPresent=true/false
- providerTxnIdPresent=true/false
- documentUniqueKeyPresent=true/false
- pdfUrlPresent=true/false
- paymentTransactionStatus=paid
- receiptStatus=created
- receiptShareStatus=sent
- userSubscriptionStatus=active
- cardBillingStatus=active
- Env var names (e.g., CARDIGO_NOTIFY_TOKEN, TRANZILA_STO_TERMINAL)
- Schema field names (e.g., user.tranzilaToken, user.tranzilaSto.stoId)

### Anti-overclaim rules

Do not claim:

- production recurring STO notify is proven (it has NOT yet fired in production)
- Google Search Console is configured or sitemap submitted
- monitoring or alerts are in place
- legal/tax compliance has been reviewed or approved
- update-card / replace-payment-method is implemented (it is NOT — deferred MVP)
- provider-side Tranzila token invalidation is implemented (it is NOT)
- admin revoke creates a receipt, refund, payment, or email (it does NOT)
- delete-payment-method cancels STO (it does NOT)
- resume auto-renewal creates a payment or receipt (it does NOT)
- YeshInvoice shareStatus=sent proves inbox delivery (it does NOT — it is provider acceptance only)

---

## 18. Emergency / Support Notes

If payment was approved in Tranzila but no PaymentTransaction appears in MongoDB:

1. First check TRANZILA_NOTIFY_URL in Render env — verify it is exactly https://cardigo.co.il/api/payments/notify?nt=<token> with single https://.
2. Check Netlify function logs for payment-notify function — did it receive a POST?
3. Check backend logs on Render for POST /api/payments/notify — did it run?
4. Do not manually mutate User subscription or Card billing without a bounded recovery audit.
5. The failed notify should be retried via Tranzila portal if applicable. If a duplicate arrives after retry, the idempotency guard (E11000 on providerTxnId) prevents double-fulfillment.

If PaymentIntent remains pending:

- Do not manually set status=completed.
- Audit whether a corresponding PaymentTransaction exists.
- If not, audit whether a Tranzila payment was completed provider-side.
- If payment was completed and notify failed, see above.

If STO exists in Tranzila but not in Mongo (stoId absent from user document):

- Do not wait for the first recurring charge to discover the mismatch.
- Audit user.tranzilaSto and the PaymentTransaction that should have triggered STO create.
- Consider manual reconciliation or provider-side STO cancellation depending on the user's billing state.

If receipt was not sent or is missing from the cabinet:

- Check Receipt.status and Receipt.shareStatus in MongoDB.
- Check YeshInvoice dashboard for the document.
- Do not create a duplicate YeshInvoice document blindly — this could produce a duplicate fiscal record.
- If shareStatus is not sent, investigate YeshInvoice share API response stored in the receipt record.

If a user was refunded or charged incorrectly:

- PaymentTransaction and Receipt are fiscal/audit records and must not be deleted even for refunded payments.
- Handle refunds and adjustments through Tranzila portal.
- Document the incident in an operator audit note.
- Do not mutate existing PaymentTransaction or Receipt documents.

Never trigger a Tranzila payment resend or re-notify for an old expired PaymentIntent without audit — the providerTxnId idempotency slot may be consumed incorrectly and produce silent double-fulfillment or no-op depending on DB state.

---

## 19. Explicit Non-Actions

The following are NOT proven, NOT completed, and must NOT be overclaimed:

- Production recurring STO notify has not yet fired and is not proven end-to-end.
- Google Search Console has not been verified and sitemap has not been submitted.
- Monitoring and alerting baseline has not been established.
- Legal/tax/accountant review of receipt retention and production receipt policy has not been documented as complete.
- Update-card / replace-payment-method flow is deferred and not implemented. Users re-enter card details only after Premium expires via normal checkout.
- Provider-side Tranzila token invalidation is not implemented.
- Phase 3B end-to-end admin-revoke token-clear smoke was not captured separately (admin revoke was verified via code/static analysis only).
- Old pre-launch handoffs have not been moved to archive yet.
- Sandbox STO schedule cancellation was operator-declared but not formally confirmed as a separate contour.

---

## 20. Key Proof References

All claims in this handoff are based on the following primary sources. See those files for detailed PROOF file:line-range.

- frontend/public/\_redirects — /gate.html /index.html 404 rule present (line 9)
- frontend/netlify/functions/auth.js — 404 tombstone only; no CARDIGO*GATE*\* references
- frontend/netlify/functions/proxy.js — no gate cookie check; x-cardigo-proxy-secret forwarding active
- frontend/index.html — global noindex <meta> removed
- frontend/public/robots.txt — User-agent: \* / Allow: / / Sitemap: https://cardigo.co.il/sitemap.xml
- frontend/src/components/seo/SeoHelmet.jsx — per-route noindex via prop; no global default noindex
- frontend/src/pages/PreviewCard.jsx — noindex hardcoded (intentional)
- frontend/src/pages/payment/CheckoutPage.jsx — noindex on all checkout states (intentional)
- backend/src/utils/cardDTO.js — free-tier robots: "noindex" override (intentional)
- backend/src/routes/sitemap.routes.js — canonical URLs under SITE_URL=https://cardigo.co.il
- backend/.env.example — CARDIGO*GATE*\* keys removed
- docs/security/SECURITY_TEMP_API_GATE.md — marked RETIRED/ARCHIVED at top of file
