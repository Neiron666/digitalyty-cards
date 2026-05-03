# Cardigo Enterprise Next Chat Master Handoff

**Date:** 2026-05-03  
**Project:** Cardigo — Israel-first digital business card / mini business page SaaS  
**Canonical domain:** `https://cardigo.co.il`  
**Current next bounded contour:** `BILLING_PRODUCTION_ROLLOUT_READINESS_P1`  
**Status:** Next-chat master handoff / project doctrine / production-readiness briefing  
**Audience:** Next ChatGPT window acting as Senior Project Architect / Senior Full-Stack Engineer / Senior Backend Engineer / Senior Frontend Engineer / Payment Lifecycle Engineer / Security Engineer / Production Readiness Engineer / Enterprise Consultant / Technical Documentation Owner.

---

## 0. How to use this handoff

This file is intended to be pasted or uploaded into the next ChatGPT conversation before continuing the Cardigo project.

The next ChatGPT must treat this file as:

- project doctrine;
- architecture baseline;
- operational truth;
- billing/payment/receipt lifecycle context;
- anti-drift and anti-regression instruction;
- Copilot Agent tasking rulebook;
- production-readiness kickoff memo.

The next workstream should be:

```text
BILLING_PRODUCTION_ROLLOUT_READINESS_P1
```

This next workstream must start with:

```text
Phase 1 — Read-Only Audit only.
```

No implementation, rollout, env changes, provider changes, DB writes, price changes, migrations, docs edits, or production actions should be performed before a complete audit is accepted.

---

## 1. What Cardigo is

**Cardigo** is an Israel-first / Israel-only SaaS platform for professional digital business cards and mini business pages.

Cardigo is not just a “digital business card.” It is a broader business presence platform:

```text
Cardigo = digital business card
        + mini business page
        + public share / QR / link layer
        + SEO / canonical / OG / JSON-LD layer
        + first-party analytics
        + self-service editor
        + leads / contact surface
        + booking/business operations foundation
        + free/trial/premium lifecycle
        + organization/team surface
        + admin/operator tooling
        + Tranzila payments and recurring lifecycle
        + YeshInvoice receipts and receipt cabinet
        + privacy/security/compliance posture
        + production readiness: monitoring, CI/CD, alerts, runbooks, rollout discipline
```

### Product identity

- Product name: **Cardigo**
- Canonical domain: `https://cardigo.co.il`
- Canonical form: non-www
- Market: Israel-first / Israel-only
- UX baseline: Hebrew / RTL-first

### Brand separation

Cardigo and Digitalyty are separate. They must never be mixed in:

- canonical URLs;
- public paths;
- SEO metadata;
- OG / social preview logic;
- structured data;
- sitemap logic;
- product copy;
- payment/receipt docs;
- tracking audiences;
- route logic;
- public DTOs;
- billing/customer-facing policy text.

---

## 2. Role of ChatGPT in this project

In this project, ChatGPT must act as:

- Senior Project Architect;
- Senior Full-Stack Engineer;
- Senior Backend Engineer;
- Senior Frontend Engineer;
- Payment Lifecycle Engineer;
- Payment Security Engineer;
- Security Engineer;
- Production Readiness Engineer;
- Enterprise Consultant;
- Technical Documentation Owner.

ChatGPT is not just a code helper. ChatGPT is responsible for protecting:

- architecture truth;
- SSoT;
- contracts;
- invariants;
- security boundaries;
- payment correctness;
- privacy/data-minimization;
- fiscal record retention;
- production behavior;
- maintainability;
- scalability;
- minimal blast radius;
- documentation truth.

### Copilot Agent role

Copilot Agent is **executor only**, not architect.

Copilot must:

- audit first;
- prove current state with `file:line-range`;
- make minimal changes only after approval;
- not broaden scope;
- not refactor “because it noticed something”;
- not run git commands;
- stop after each phase;
- provide raw verification output and EXIT codes.

---

## 3. Canonical Cardigo workflow

Every meaningful Cardigo task follows this flow:

```text
Architecture / Intent clarification
→ Phase 1 — Read-Only Audit with PROOF file:line-range
→ STOP
→ Phase 2 — Minimal Fix
→ STOP
→ Phase 3 — Verification with RAW stdout + EXIT
→ STOP
→ Documentation / Handoff
→ Rollout / Monitoring when relevant
```

Even if someone says “two phases,” that is shorthand only. The canonical Cardigo execution model always includes a separate verification phase.

### Phase 1 — Read-Only Audit

Only read/analyze. No edits.

Required:

- relevant file map;
- flow map;
- current behavior proof;
- boundary proof;
- risk classification P0/P1/P2/P3;
- options table when relevant;
- recommended enterprise-safe plan;
- minimal change surface if implementation is later approved;
- verification plan;
- explicit non-actions;
- STOP.

### Phase 2 — Minimal Fix

Only after Phase 1 is accepted.

Required:

- minimal change surface;
- usually 1–3 files if feasible;
- no unrelated refactor;
- no formatting churn;
- no “while I’m here” cleanup;
- preserve API contracts unless explicitly approved;
- STOP.

### Phase 3 — Verification

Required after implementation.

Must include:

- raw stdout;
- EXIT codes;
- targeted greps;
- syntax/build/import sanity;
- endpoint/manual smoke when relevant;
- anti-secret proof;
- anti-regression matrix;
- PASS/FAIL verdict;
- STOP.

### Documentation / Handoff

After a meaningful contour closes:

- update SSoT docs/runbooks;
- create/adjust handoff;
- run stale phrase scan;
- run anti-secret scan;
- run anti-overclaim scan;
- keep historical handoffs intact unless explicitly designated current/live docs.

---

## 4. Mandatory hard constraints for every Copilot prompt

Every Copilot prompt for Cardigo must include:

```text
PROJECT MODE: Cardigo enterprise workflow.
```

Hard constraints:

```text
- No git commands
- No inline styles
- CSS Modules only
- Flex only — no CSS Grid
- Mobile-first mandatory
- Typography policy:
  - font-size only via var(--fs-*)
  - use only approved canonical typography tokens
  - --fs-* rem-only
  - no px/em/%/vw/vh/clamp/fluid
  - no calc(non-rem)
  - do not invent token names ad hoc
  - do not leak card-scope tokens into app/public/auth/admin/site-shell contexts
```

Additional tactical constraints:

```text
- No scope creep
- No “заодно поправил”
- No broad refactor unless explicitly approved and proven safest
- No formatting-only churn
- No code changes before audit
- Always require PROOF file:line-range
- Always require RAW stdout + EXIT for verification
- Use PowerShell + curl.exe for endpoint/manual smoke on Windows
- Boundaries must be proven, not guessed
- Do not touch unrelated files
- Do not weaken security gates without proof
- Do not move to a new contour until the current one is closed or explicitly deferred
```

---

## 5. Core technical architecture

### Frontend

- React + Vite
- RTL-first
- CSS Modules only
- Flex only; no CSS Grid
- Mobile-first
- token-based styling
- typography via `var(--fs-*)` only
- route-level SEO/head
- shared public + preview render chain
- preview-only styles under `[data-preview="phone"]`

Protected high-blast-radius areas:

- `CardLayout` DOM skeleton;
- `CardLayout.module.css`;
- preview wrapper/card boundary;
- `frontend/src/templates/templates.config.js` templates registry;
- skins/token system;
- public/preview shared render chain.

### Backend

- Node.js + Express
- MongoDB Atlas + Mongoose
- DTO-driven public truth
- cookie-backed browser auth
- manual index governance
- auth/org/admin/payment/booking/leads/AI/content APIs

Mongo/index governance:

```env
MONGOOSE_AUTO_INDEX=false
MONGOOSE_AUTO_CREATE=false
```

Indexes must be applied only by explicit scripts/operator action. Do not rely on runtime auto-index creation.

### Auth/security runtime truth

- Browser auth is cookie-backed / httpOnly.
- Do not reintroduce browser localStorage JWT truth.
- Do not reintroduce browser `Authorization` header as the primary auth path.
- Backend dual-mode Bearer compatibility may exist for tooling/internal use, but browser runtime truth must remain cookie-backed.
- Cookie-auth / proxy / CSRF / CORS contours are closed and must not be casually reopened.

---

## 6. Production-shaped runtime truth

Current infrastructure truth:

- Frontend: Netlify
- Backend: Render
- DB: MongoDB Atlas
- Active operational DB: `cardigo_prod`
- Storage: Supabase Storage
- Email: Mailjet
- Payments: Tranzila DirectNG + MyBilling STO
- Receipts: YeshInvoice
- Tracking: GTM / Meta Pixel
- Canonical domain: `https://cardigo.co.il`

Important DB truth:

- A new clean production-shaped Mongo cluster is the operational baseline.
- Old cluster remains rollback/reference only.
- Old data was intentionally not migrated.
- Manual index/bootstrap governance has been intentionally applied.
- Render backend works on the new cluster.

---

## 7. Billing / payment / receipt architecture truth

Billing is one of the most sensitive Cardigo contours. Treat it as payment/fiscal infrastructure, not a casual feature.

### First payment flow

The trusted entitlement path is server-side Tranzila notify, not browser redirect.

Flow:

1. User starts checkout.
2. PaymentIntent snapshot may be created.
3. Tranzila DirectNG hosted checkout runs.
4. Browser success/fail return is UX-only.
5. Tranzila server-to-server notify is source of truth.
6. Backend validates notify.
7. PaymentTransaction ledger is written first.
8. User subscription/plan is updated.
9. Card billing is updated.
10. Tranzila token is captured into `user.tranzilaToken` on paid path.
11. STO create may be attempted after fulfillment, depending on `TRANZILA_STO_CREATE_ENABLED`.
12. YeshInvoice receipt is created/shared for actual payment.

### Critical invariants

- PaymentTransaction ledger first.
- Duplicate provider transaction returns idempotent OK and must not mutate User/Card again.
- Success redirect never grants entitlement.
- Failed payment does not update subscription.
- Receipt only on actual payment, not on cancel/resume/delete/revoke.
- Tranzila token must never be returned in DTO/API response/log/audit.
- Use booleans like `tranzilaTokenPresent`, not raw token values.

---

## 8. STO lifecycle truth

### STO create

- Uses saved `user.tranzilaToken`.
- Can create recurring schedule after first-payment fulfillment.
- Controlled by `TRANZILA_STO_CREATE_ENABLED === "true"`.
- Non-blocking after first payment; first-payment fulfillment is not rolled back if STO create fails.
- If `user.tranzilaSto.stoId` exists and status is `created`, create is skipped.

### Cancel auto-renewal

Self-service cancel-renewal:

- calls provider cancellation first;
- marks STO cancelled;
- does not change premium expiry;
- does not clear token;
- does not create PaymentTransaction;
- does not create Receipt/YeshInvoice;
- token intentionally remains so the user can resume auto-renewal while Premium is still active.

### Resume auto-renewal

Resume auto-renewal:

- uses saved token;
- recreates STO;
- no checkout;
- no payment;
- no receipt;
- no YeshInvoice;
- blocked if token missing;
- blocked if subscription expired;
- rate-limited.

### Delete saved payment method

Self-service delete saved payment method:

- implemented and manually smoke-verified;
- allowed only when STO is not active/pending;
- clears only local fields:
  - `tranzilaToken = null`
  - `tranzilaTokenMeta.expMonth = null`
  - `tranzilaTokenMeta.expYear = null`
- does not call Tranzila;
- does not invalidate token provider-side;
- does not cancel STO;
- does not create payment/receipt/email;
- disables resume because token is missing.

### Admin revoke token clear

`ADMIN_REVOKE_TOKEN_CLEAR_P1` is CLOSED / PASS.

Current truth:

When platform admin revokes a subscription:

1. Backend attempts/safely-skips STO cancellation provider-first.
2. If provider cancellation fails, revoke is blocked with `STO_CANCEL_REQUIRED`.
3. Only after safe gate, user is downgraded/revoked.
4. The same atomic update clears:
   - `tranzilaToken`
   - `tranzilaTokenMeta.expMonth`
   - `tranzilaTokenMeta.expYear`
5. PaymentTransaction and Receipt are retained and not modified.
6. No YeshInvoice document, Mailjet email, refund, new payment, or receipt is created by admin revoke.
7. Resume auto-renewal after admin revoke is blocked by existing `token_missing` behavior.

Verification status:

- Phase 1 audit accepted.
- Phase 2 minimal fix accepted.
- Phase 3A static verification passed.
- Phase 4 docs audit/update/verification passed.
- Contour status: CLOSED / PASS.

### Sandbox smoke addendum

A sandbox paid user `truestory.factory@gmail.com` was created and paid successfully. Before deletion it had:

- `tranzilaTokenPresent=true`
- token meta present
- `stoStatus=created`
- `paymentTransactionCount=1`
- `receiptCount=1`

The user was then deleted via platform Admin UI before a separate post-admin-revoke token-clear snapshot was captured. Operator visually confirmed STO was removed/cancelled in Tranzila.

Post-delete Mongo read-only verification by saved userId showed:

- user not found by email or ID;
- PaymentTransaction retained: 1;
- Receipt retained: 1;
- AdminAudit count: 1;
- user delete audit present;
- no subscription revoke audit;
- audit did not contain `tranzilaToken`, `tranzilaTokenMeta`, `stoId`, `providerTxnId`, or `documentUniqueKey`.

Classification:

```text
Admin delete cleanup/provider-first STO cancellation smoke = PASS
for deletion/fiscal-retention/audit-cleanliness.

ADMIN_REVOKE_TOKEN_CLEAR_P1 Phase 3B = NOT PROVEN end-to-end
because no separate post-revoke/pre-delete token-clear snapshot was captured.

This is not a blocker because ADMIN_REVOKE_TOKEN_CLEAR_P1 is already CLOSED/PASS
by code/static/docs verification.
```

---

## 9. Receipt / YeshInvoice truth

Receipts are now implemented and sandbox-proven for actual payments.

Current truth:

- Receipt is issued on actual first payment.
- Receipt is issued on successful recurring STO payment.
- Receipt is not issued on cancel-renewal.
- Receipt is not issued on resume auto-renewal.
- Receipt is not issued on delete-payment-method.
- Receipt is not issued on admin revoke.
- Receipt is not issued on account/admin delete.
- Receipt cabinet can list/download persisted receipts.
- Receipt delivery uses YeshInvoice share/relay path, not a guarantee of inbox delivery.
- `shareStatus="sent"` means provider accepted share request; it does not prove email inbox delivery.

Fiscal retention:

- PaymentTransaction and Receipt are fiscal/audit records.
- They must not be deleted as part of user/account/admin delete cascades.
- Raw provider document identifiers and sensitive values must not be exposed in docs/logs/API responses.

---

## 10. Account delete / admin delete lifecycle truth

### Self-delete

Current policy:

1. If active STO exists, backend attempts provider cancellation first.
2. If provider cancellation fails and is not safely skipped, deletion is blocked.
3. After provider-side STO cancellation/safe skip, cascade cleanup runs.
4. User document is deleted.
5. Tranzila token disappears with user document.
6. PaymentTransaction and Receipt are retained.

### Admin delete

Current policy:

1. Admin deletion must cancel active STO provider-first.
2. If provider cancellation fails, deletion is blocked unless an explicit approved recovery path exists.
3. User document deletion removes token with document.
4. PaymentTransaction and Receipt are retained.
5. AdminAudit must not include raw token/STO/provider IDs.

Recently smoke-confirmed:

- paid sandbox user deleted through Admin UI;
- STO visually removed/cancelled in Tranzila;
- user removed from Mongo;
- PaymentTransaction retained;
- Receipt retained;
- AdminAudit present and clean from sensitive keys.

---

## 11. Update/replace payment method decision

`UPDATE_PAYMENT_METHOD_ARCHITECTURE_P1` is **deferred / not needed for MVP**.

Current product decision:

If a user’s saved payment token is missing/cleared/expired or resume auto-renewal cannot proceed, Cardigo will not implement an active-Premium “replace card/update payment method” flow at this stage.

MVP behavior:

```text
The user waits until the Premium period expires.
After expiry, the user enters card details again through the normal payment/checkout flow.
```

This preserves billing safety:

- no active-Premium checkout bypass;
- no accidental double charge;
- no duplicate STO;
- no accidental Receipt/YeshInvoice;
- no accounting/refund complexity;
- no dependency on unconfirmed Tranzila token-replacement capabilities.

Do not open or implement `UPDATE_PAYMENT_METHOD_ARCHITECTURE_P1` unless the user explicitly reopens it later.

---

## 12. Closed contours in current recent billing/admin scope

Recently closed or accepted truths:

1. Resume auto-renewal — CLOSED / PASS.
2. Delete saved payment method — CLOSED / PASS / manually smoke-verified.
3. Receipt ledger backlink for new records — CLOSED / PASS.
4. Docs for delete-payment-method and STO delete lifecycle — CLOSED / PASS.
5. Self-delete with active STO — manually verified provider-first.
6. Admin revoke token clear — CLOSED / PASS by code/static/docs verification.
7. Paid-user admin-delete cleanup smoke — PASS for deletion/fiscal-retention/audit-cleanliness.
8. YeshInvoice missing email suspicion — classified as expected/operator data issue, not Cardigo routing bug.
9. Update/replace payment method — deferred/not needed for MVP.

---

## 13. Important deferred / not implemented items

Do not accidentally claim these are implemented:

- active-Premium update/replace card flow;
- provider-side Tranzila token invalidation;
- active-Premium checkout bypass;
- production rollout complete;
- Phase 3B end-to-end admin-revoke token-clear smoke;
- full billing production rollout;
- final legal/tax counsel approval;
- complete monitoring/alerts baseline;
- load/security/stress testing complete.

---

## 14. Anti-secret / anti-overclaim policy

Never include in docs/prompts/reports/final answers:

- raw `tranzilaToken` / TranzilaTK;
- raw STO ID;
- raw provider transaction ID;
- raw provider document ID;
- raw `documentUniqueKey`;
- card number / PAN / CVV;
- raw HMAC/signature values;
- env secret values;
- production terminal secrets;
- cookies/session values;
- raw provider payloads with sensitive data.

Allowed:

- env var names;
- schema field names;
- placeholders like `<CARDIGO_STO_NOTIFY_TOKEN>`;
- booleans like:
  - `tranzilaTokenPresent=true/false`
  - `stoIdPresent=true/false`
  - `receiptIdPresent=true/false`
  - `providerTxnIdPresent=true/false`
  - `recipientEmailMatchesTarget=true/false`

Avoid overclaims:

- Do not say production rollout is complete unless production rollout was actually done and verified.
- Do not say update-card is implemented.
- Do not say provider-side token invalidation is implemented.
- Do not say admin revoke creates a receipt/refund/payment/email.
- Do not say delete-payment-method cancels STO.
- Do not say resume creates payment/receipt.
- Do not say YeshInvoice “sent” proves inbox delivery.
- Do not claim legal/tax compliance beyond what counsel/accountant confirmed.

---

## 15. Next bounded contour: BILLING_PRODUCTION_ROLLOUT_READINESS_P1

This is the recommended next contour for the next ChatGPT window.

### Why this is next

Billing now has multiple major implementation contours closed:

- first-payment flow;
- Tranzila notify;
- PaymentTransaction ledger;
- STO create/cancel/resume/recurring flow foundation;
- YeshInvoice receipts;
- receipt cabinet;
- delete payment method;
- admin revoke token cleanup;
- admin/self-delete provider-first cleanup patterns.

The next mature step is not a new feature. The next mature step is **production rollout readiness**.

### What this contour is

`BILLING_PRODUCTION_ROLLOUT_READINESS_P1` is a read-only production-readiness audit and rollout plan for billing/payment/receipt infrastructure.

It should determine:

- what is already production-ready;
- what is sandbox-only;
- what environment values must be changed;
- what Tranzila/YeshInvoice production terminal/account checks are still needed;
- what sandbox artifacts must be cleaned/cancelled;
- what smoke tests are required before enabling production billing;
- what monitoring/alerts/runbooks are missing;
- what legal/payment policy copy must be aligned;
- what rollback strategy is needed.

### What this contour is NOT

It is not:

- a price change task;
- a Tranzila terminal cutover task;
- a YeshInvoice production enablement task;
- a migration task;
- an implementation task;
- a docs edit task;
- a monitoring setup task;
- a legal approval task.

Those may become follow-up contours after the audit.

### Critical audit areas

The Phase 1 audit should cover at minimum:

1. Pricing constants and sandbox/production values.
2. Tranzila production terminal configuration.
3. Tranzila notify/return URLs.
4. STO create flag and required envs.
5. Existing active sandbox STO schedules/artifacts.
6. PaymentTransaction indexes/idempotency.
7. Receipt/YeshInvoice production state.
8. Receipt cabinet/proxy/download safety.
9. Admin revoke/delete/self-delete billing cleanup behavior.
10. Legal/payment policy alignment.
11. Terms/refund/cancel/auto-renew disclosure.
12. Monitoring/alerting/Sentry/cron gaps.
13. Render/backend uptime/cron limitations.
14. Netlify proxy/function gates.
15. Secrets/env management.
16. Admin/support runbook completeness.
17. Production smoke plan.
18. Rollback plan.
19. Anti-secret/anti-overclaim docs policy.
20. What must not be touched in this phase.

---

## 16. Suggested opening message for next ChatGPT

Paste this into the next ChatGPT window:

```text
PROJECT MODE: Cardigo enterprise workflow.

Use the uploaded handoff file as current project truth.

Act as Senior Project Architect, Senior Backend Engineer, Senior Frontend Engineer, Payment Lifecycle Engineer, Payment Security Engineer, Production Readiness Engineer, Enterprise Consultant, and Technical Documentation Owner.

We are continuing Cardigo.
Current next bounded contour:
BILLING_PRODUCTION_ROLLOUT_READINESS_P1

Start with Architecture / Intent and then prepare a Phase 1 — Read-Only Audit prompt for Copilot.

Important current truths:
- ADMIN_REVOKE_TOKEN_CLEAR_P1 is CLOSED / PASS by code/static/docs verification.
- Active-premium update/replace card is deferred/not needed for MVP.
- If a user needs new card details, they should re-enter card details only after Premium expires via normal checkout.
- Active-premium checkout bypass remains forbidden.
- Paid-user admin-delete cleanup smoke passed for user deletion, STO visual cleanup, fiscal retention, and audit cleanliness.
- Billing production rollout is NOT complete.

Hard constraints:
- No git commands.
- No inline styles.
- CSS Modules only.
- Flex only — no CSS Grid.
- Mobile-first mandatory.
- Typography via var(--fs-*), rem-only, no px/em/%/vw/vh/clamp/fluid, no calc(non-rem).
- No scope creep.
- No code changes before audit.
- Always require PROOF file:line-range.
- Always require RAW stdout + EXIT for verification.
- Use PowerShell + curl.exe for manual smoke where relevant.
- No raw secrets, tokens, STO IDs, provider IDs, card numbers, cookies, or env secret values.

Begin with Phase 1 — Read-Only Audit only.
No code edits.
No docs edits.
No DB writes.
No provider calls.
No env changes.
No migrations.
No production rollout actions.
```

---

## 17. Ready-to-use Copilot prompt for BILLING_PRODUCTION_ROLLOUT_READINESS_P1

```text
PROJECT MODE: Cardigo enterprise workflow.

Act as Senior Project Architect, Senior Backend Engineer, Senior Frontend Engineer, Payment Lifecycle Engineer, Payment Security Engineer, Production Readiness Engineer, DevOps/Monitoring Engineer, and Technical Documentation Owner.

CONTOUR:
BILLING_PRODUCTION_ROLLOUT_READINESS_P1

PHASE 1 — READ-ONLY AUDIT ONLY.

Goal:
Audit Cardigo billing/payment/receipt readiness for controlled production rollout. Determine what is already ready, what is sandbox-only, what is blocked, what operator actions are needed, what monitoring/runbooks are missing, and what follow-up bounded contours are required before production billing can be enabled safely.

Hard constraints:
- No git commands.
- No file edits.
- No code changes.
- No docs changes.
- No DB writes.
- No provider/API calls.
- No migrations.
- No env changes.
- No production rollout actions.
- No price changes.
- No Tranzila terminal changes.
- No YeshInvoice production enablement.
- No feature flag toggles.
- No scope creep.
- No raw secrets.
- No raw Tranzila token values.
- No raw STO IDs.
- No raw provider transaction IDs.
- No raw provider document IDs.
- No card numbers / PAN / CVV.
- No cookies/session values.
- Provide PROOF file:line-range for every claim.
- STOP after Phase 1 audit.

Context:
Cardigo has implemented major billing foundations: Tranzila first-payment notify, PaymentTransaction ledger, STO lifecycle, YeshInvoice receipts, receipt cabinet, delete saved payment method, admin revoke token clear, self/admin delete provider-first cleanup patterns.

Current product/architecture decisions:
- Active-premium update/replace card flow is deferred/not needed for MVP.
- Active-premium checkout bypass remains forbidden.
- If token is missing/cleared/expired, user re-enters card details only after Premium expires via normal checkout.
- Admin revoke clears local token after safe STO cancellation gate.
- Delete-payment-method clears local token only when STO is not active/pending.
- Cancel-renewal intentionally retains token for resume.

Required audit sections:

A) Executive summary
- Is billing ready for production rollout now?
- If not, list blockers.
- Severity classification P0/P1/P2/P3.
- Recommended next sequence of bounded contours.

B) Billing flow map
Trace with PROOF:
- checkout create;
- PaymentIntent if relevant;
- Tranzila hosted checkout params;
- notify route;
- ledger write;
- user/card fulfillment;
- token capture;
- STO create;
- recurring STO notify;
- receipt creation/share/cabinet;
- cancel/resume/delete-payment-method;
- admin revoke/delete/self-delete cleanup.

C) Sandbox vs production config audit
Identify all env/config/constants that are sandbox-only or production-sensitive:
- prices;
- terminals;
- notify URLs;
- return URLs;
- STO flags;
- YeshInvoice flags/API mode;
- Mailjet sender/config;
- proxy/notify secrets;
- Render/Netlify env assumptions.

D) Pricing readiness
Audit current `PRICES_AGOROT` truth and any docs/frontend display truth.
Identify whether sandbox prices are still active and what must happen before restoring production prices.
Do not change prices.

E) Tranzila production readiness
Audit what is known/unknown about:
- production clearing terminal;
- token/STO terminal;
- DirectNG URL config;
- notify URL config;
- return/success/fail URLs;
- STO create/cancel endpoints;
- active sandbox STO cleanup.

F) YeshInvoice production readiness
Audit current receipt flow and production enablement blockers:
- provider mode/account;
- document type/operator decisions;
- receipt language/email behavior;
- cabinet/download safety;
- provider-side share behavior;
- what is sandbox-proven vs production-proven.

G) Fiscal/audit retention
Prove:
- PaymentTransaction retained;
- Receipt retained;
- delete/admin delete/self-delete do not remove fiscal records;
- sensitive provider IDs/tokens are not exposed.

H) Auth/security/proxy readiness
Audit:
- cookie-backed auth;
- CSRF/CORS/proxy gate assumptions;
- Netlify payment notify/return functions;
- anti-oracle behavior;
- provider webhooks that bypass browser gate safely.

I) Monitoring/alerts/readiness gaps
Audit what exists and what is missing:
- backend health;
- payment notify failures;
- STO recurring failures;
- YeshInvoice failures;
- Mailjet/share failures;
- cron/job liveness;
- Render sleeping risk;
- Sentry/cron monitors;
- operator alerting.

J) Support/admin runbook readiness
Audit current support docs for:
- payment succeeded but receipt missing;
- STO failed;
- renewal failed;
- token missing;
- admin revoke;
- admin delete;
- user deletion;
- refund/cancellation policy gaps.

K) Legal/policy/copy readiness
Audit whether user-facing policy/copy is aligned for:
- recurring billing;
- auto-renewal;
- cancellation;
- refunds;
- receipts/invoices;
- Israeli business context;
- privacy/data retention.

L) Production smoke plan
Propose a safe production smoke sequence but do not run it.
Include:
- internal test user;
- small controlled payment;
- notify proof;
- receipt proof;
- STO proof if enabled;
- cancel/revoke/delete cleanup decisions;
- rollback plan.

M) Rollback plan
Define rollback needs:
- env rollback;
- price rollback;
- terminal rollback;
- feature flag rollback;
- provider rollback;
- operator/manual recovery.

N) Risk register
Classify P0/P1/P2/P3 risks.
Separate blockers from non-blocking confidence improvements.

O) Minimal next contours
Propose the next bounded contours after this audit.
Examples may include:
- PRODUCTION_PRICING_RESTORE_P1
- TRANZILA_PRODUCTION_TERMINAL_CUTOVER_P1
- YESHINVOICE_PRODUCTION_ENABLEMENT_P1
- BILLING_MONITORING_ALERTS_P1
- BILLING_PRODUCTION_SMOKE_P1
- BILLING_SUPPORT_RUNBOOK_FINALIZATION_P1
But do not invent implementation before audit proof.

P) Explicit non-actions
Confirm no files edited, no DB writes, no provider calls, no env changes, no migrations, no production rollout, no git.

STOP after Phase 1.
```

---

## 18. What not to do in the next chat

Do not:

- immediately implement production rollout;
- restore production prices without audit;
- enable Tranzila production terminal without audit;
- enable YeshInvoice production mode without audit;
- enable STO create flag without audit;
- change env vars;
- call providers;
- write DB;
- run migrations;
- edit docs before docs audit;
- reopen update-card unless user explicitly reopens it;
- bypass active-Premium checkout guard;
- print secrets;
- trust summaries without proof.

---

## 19. Current final status snapshot

### Strongly working / verified

- production-shaped DB baseline;
- admin bootstrap/login;
- email verification;
- card creation/editor;
- media upload;
- AI generation;
- business hours;
- booking request foundation;
- public card;
- Tranzila first payment sandbox flow;
- PaymentTransaction ledger;
- STO create/cancel/resume/recurring lifecycle foundation;
- YeshInvoice receipt creation/share/cabinet;
- delete saved payment method;
- admin revoke token clear;
- self/admin delete provider-first cleanup patterns;
- fiscal record retention under admin delete smoke;
- docs/runbooks/handoffs for recent billing contours.

### Not production-complete / must not overclaim

- production billing rollout;
- production price restoration;
- production Tranzila terminal cutover;
- production YeshInvoice enablement;
- provider-side token invalidation;
- active-Premium card replacement;
- monitoring/alerts baseline;
- legal/tax final approval;
- security/load/stress testing;
- full production smoke.

---

## 20. One-line operational summary

Cardigo is now a serious Israel-first billing-enabled SaaS with Tranzila payments/STO lifecycle, YeshInvoice receipts, receipt cabinet, delete-payment-method, admin revoke token cleanup, and provider-first delete cleanup patterns; the next workstream should be `BILLING_PRODUCTION_ROLLOUT_READINESS_P1`, starting strictly with read-only audit and enterprise production-readiness thinking.
