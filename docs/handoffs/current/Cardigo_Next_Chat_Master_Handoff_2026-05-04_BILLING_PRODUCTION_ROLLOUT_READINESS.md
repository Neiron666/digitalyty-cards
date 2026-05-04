# Cardigo — Next Chat Master Handoff / Enterprise Production-Readiness Playbook

**Date:** 2026-05-04  
**Project:** Cardigo — Israel-first / Israel-only digital business card and mini business page SaaS  
**Canonical domain:** `https://cardigo.co.il`  
**Next bounded contour:** `BILLING_PRODUCTION_ROLLOUT_READINESS_P1`  
**Status:** Master handoff for the next ChatGPT window. Use as project instruction, architecture truth, operating doctrine, anti-drift baseline, and production-readiness kickoff document.  
**Audience:** Next ChatGPT session acting as Senior Project Architect / Senior Full-Stack Engineer / Senior Backend Engineer / Senior Frontend Engineer / Payment Lifecycle Engineer / Payment Security Engineer / Security Engineer / Production Readiness Engineer / Enterprise Consultant / Technical Documentation Owner.

---

## 0. How to use this file in the next ChatGPT window

Paste or upload this file into the next ChatGPT conversation before continuing Cardigo.

The next ChatGPT must treat this document as:

- project doctrine;
- architecture baseline;
- current product/runtime truth;
- billing/payment/receipt lifecycle context;
- Copilot Agent tasking rulebook;
- anti-drift / anti-regression instruction;
- production-readiness kickoff memo;
- documentation and runbook ownership baseline.

The next workstream is:

```text
BILLING_PRODUCTION_ROLLOUT_READINESS_P1
```

This workstream must start with:

```text
Phase 1 — Read-Only Audit only.
```

No implementation, no rollout, no env changes, no provider changes, no DB writes, no price changes, no migrations, no docs edits, no CI changes, no deploy, and no production actions should happen before a complete Phase 1 audit is accepted.

---

## 1. What Cardigo is

**Cardigo** is an Israel-first / Israel-only SaaS platform for professional digital business cards and mini business pages.

Cardigo is not only a “digital business card.” Architecturally and product-wise, it is a broader business presence platform:

```text
Cardigo = digital business card
        + mini business page
        + public share / QR / link layer
        + SEO / canonical / OG / JSON-LD layer
        + first-party analytics
        + self-service editor
        + leads / contact surface
        + gallery / services / business hours
        + booking / appointments foundation
        + free / trial / premium lifecycle
        + organization / team surface
        + admin / operator tooling
        + Tranzila payments and recurring lifecycle
        + YeshInvoice receipts and receipt cabinet
        + privacy / consent / compliance posture
        + production readiness: monitoring, CI/CD, alerts, runbooks, rollout discipline
```

### 1.1 Product identity

- Product name: **Cardigo**.
- Canonical production domain: `https://cardigo.co.il`.
- Canonical form: non-www.
- Market: Israel-first / Israel-only.
- UX baseline: Hebrew / RTL-first.

### 1.2 Brand separation — critical invariant

Cardigo and Digitalyty are separate and must never be mixed in:

- canonical URLs;
- public paths;
- SEO metadata;
- OG/social preview logic;
- structured data;
- sitemap logic;
- product copy;
- route logic;
- public DTOs;
- payment/receipt docs;
- billing/customer-facing policy text;
- tracking audiences;
- provider/business account decisions unless explicitly approved.

Digitalyty can exist as a separate brand/business context, but Cardigo production truth must remain clean.

---

## 2. Role of ChatGPT and Copilot Agent

### 2.1 ChatGPT role

In this project, ChatGPT must operate as:

- **Senior Project Architect**;
- **Senior Full-Stack Engineer**;
- **Senior Backend Engineer**;
- **Senior Frontend Engineer**;
- **Payment Lifecycle Engineer**;
- **Payment Security Engineer**;
- **Security Engineer**;
- **Production Readiness Engineer**;
- **Enterprise Consultant**;
- **Technical Documentation Owner**.

ChatGPT is responsible for protecting:

- architecture truth;
- SSoT;
- contracts;
- invariants;
- security boundaries;
- payment correctness;
- fiscal record retention;
- privacy/data minimization;
- production behavior;
- maintainability;
- scalability;
- minimal blast radius;
- documentation truth.

ChatGPT must not behave like a casual code generator. It must think like the senior architect responsible for what goes into production.

### 2.2 Copilot Agent role

Copilot Agent is **executor only**, not architect.

Copilot must:

- audit first;
- prove current state with `file:line-range`;
- make minimal changes only after approval;
- never broaden scope by itself;
- never run git commands;
- never do “заодно поправил”;
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

Even if a prior note says “two phases,” that is shorthand only. The canonical Cardigo workflow always includes a separate verification phase.

### 3.1 Phase 1 — Read-Only Audit

Only read/analyze. No edits.

Required output:

- relevant file map;
- current behavior proof;
- flow map;
- boundary proof;
- risk classification P0/P1/P2/P3;
- options table when relevant;
- recommended enterprise-safe plan;
- minimal change surface if implementation is later approved;
- verification plan;
- explicit non-actions;
- STOP.

### 3.2 Phase 2 — Minimal Fix

Only after Phase 1 is accepted.

Required:

- minimal change surface;
- usually 1–3 files if feasible;
- no unrelated refactor;
- no formatting churn;
- no broad cleanup;
- preserve API contracts unless explicitly approved;
- STOP.

### 3.3 Phase 3 — Verification

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

### 3.4 Documentation / Handoff

After a meaningful contour closes:

- update SSoT docs/runbooks;
- update or create handoff only where warranted;
- run stale phrase scan;
- run anti-secret scan;
- run anti-overclaim scan;
- keep historical/archive handoffs intact unless a current/live doc is intentionally updated.

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

### 5.1 Frontend

- React + Vite.
- RTL-first.
- CSS Modules only.
- Flex only; no CSS Grid.
- Mobile-first.
- Token-based styling.
- Typography via `var(--fs-*)` only.
- Route-level SEO/head.
- Shared public + preview render chain.
- Preview-only styles under `[data-preview="phone"]`.

Protected high-blast-radius areas:

- `CardLayout` DOM skeleton;
- `CardLayout.module.css`;
- preview wrapper / card boundary;
- `frontend/src/templates/templates.config.js` templates registry;
- skins/token system;
- public/preview shared render chain.

### 5.2 Backend

- Node.js + Express.
- MongoDB Atlas + Mongoose.
- DTO-driven public truth.
- Cookie-backed browser auth.
- Manual index governance.
- Auth / org / admin / payment / booking / leads / analytics / AI / content APIs.

Mongo/index governance:

```env
MONGOOSE_AUTO_INDEX=false
MONGOOSE_AUTO_CREATE=false
```

Indexes must be applied only by explicit scripts/operator actions. Do not rely on runtime auto-index creation.

### 5.3 Auth/security runtime truth

- Browser auth is cookie-backed / httpOnly.
- Do not reintroduce browser localStorage JWT truth.
- Do not reintroduce browser `Authorization` header as the primary browser auth path.
- Backend dual-mode Bearer compatibility may exist for tooling/internal use, but browser runtime truth must remain cookie-backed.
- Cookie-auth / proxy / CSRF / CORS contours are closed and must not be casually reopened.

---

## 6. Production-shaped runtime truth

Current infrastructure truth:

- Frontend: Netlify.
- Backend: Render.
- DB: MongoDB Atlas.
- Active operational DB: `cardigo_prod`.
- Storage: Supabase Storage.
- Email: Mailjet.
- Payments: Tranzila DirectNG + MyBilling STO.
- Receipts: YeshInvoice.
- Tracking: GTM / Meta Pixel.
- Canonical domain: `https://cardigo.co.il`.

Important DB truth:

- A new clean production-shaped Mongo cluster is the operational baseline.
- Old cluster remains rollback/reference only.
- Old data was intentionally not migrated.
- Manual index/bootstrap governance has been intentionally applied.
- Render backend works on the new cluster.
- Production database name is `cardigo_prod`.

---

## 7. Mongo / CI / index governance truth as of 2026-05-04

Manual index governance is a core project law. Never assume indexes are created by runtime.

### 7.1 Recently closed OrganizationMember index tail

A pre-existing CI tail was found and closed:

- `sanity:org-membership` failed on safe CI MongoDB target `cardigo_ci`.
- Root cause: CI DB bootstrap gap, not a code bug.
- Missing CI index:
  - collection: `organizationmembers`
  - index name: `orgId_1_userId_1`
  - key: `{ orgId: 1, userId: 1 }`
  - unique: `true`
- Existing migration script was already correct:
  - `backend/scripts/migrate-orgmember-indexes.mjs`

Operator safely applied the migration against `cardigo_ci` only:

```text
DB_NAME: cardigo_ci
NODE_ENV: development
SAFE_TARGET_CONFIRMED
```

Results:

- dry-run EXIT:0;
- apply EXIT:0;
- `sanity:org-membership` EXIT:0;
- `sanity:org-access` EXIT:0.

Production was then checked by read-only dry-run and was already at parity:

- production DB target: `cardigo_prod`;
- `orgId_1_userId_1` already existed and was unique;
- no production apply was performed or required.

Final classification:

```text
ORG_MEMBERSHIP_SANITY_CI_INDEX_BOOTSTRAP = CLOSED / PASS
PRODUCTION_INDEX_READY = true for organizationmembers.orgId_1_userId_1
```

### 7.2 Controlled-write sanity production guard

A shared guard was added for controlled-write sanity scripts:

- helper: `backend/scripts/lib/controlled-write-guard.mjs`;
- guarded scripts: 11 controlled-write sanity scripts;
- read-only/index drift scripts are intentionally not guarded;
- production-like DBs fail closed unless an intentionally verbose override is set;
- guard never prints raw `MONGO_URI` or credentials;
- fail-closed tests passed;
- safe-local test passed;
- read-only sanity regression passed.

Guard override env name:

```text
CARDIGO_ALLOW_CONTROLLED_WRITE_SANITY_ON_PRODUCTION_LIKE_DB
```

Allowed override value:

```text
I_UNDERSTAND_THIS_CAN_WRITE_TEST_FIXTURES
```

This override must never be set casually and must not be used against real production.

### 7.3 New QA sanity coverage

Dedicated sanity scripts now exist for premium/data/action paths:

- `sanity:analytics`
- `sanity:booking`
- `sanity:leads`

These scripts are controlled-write, guarded, and cleanup their fixtures. They passed:

- analytics: 9/9 checks;
- booking: 4/4 checks;
- leads: 6/6 checks.

Existing regressions also passed:

- `sanity:imports`;
- `sanity:org-access`;
- `sanity:org-membership`;
- `sanity:slug-policy`;
- `sanity:ownership-consistency`;
- `sanity:card-index-drift`;
- frontend discipline gates/build.

### 7.4 Invite helper dedup closure

`SANITY_INVITE_HELPERS_DEDUP` is closed:

- `SANITY_INVITE_PASSWORD` is centralized in `sanity-shared-fixtures.mjs`.
- `extractTokenFromInviteLink` is centralized in `sanity-shared-fixtures.mjs`.
- Robust 7-guard parser was preserved.
- `sanity-org-access.mjs` and `sanity-org-membership.mjs` import these from shared fixtures.
- Other per-script helpers remain local by design.
- Both org sanities passed against `cardigo_ci` with `NODE_ENV=development`.
- Production DB was not touched.

---

## 8. Org-owned premium feature parity truth

A deeper org-card premium parity issue was found and fixed before this handoff.

### 8.1 Root cause class

Some backend feature paths were using raw/org-unaware billing resolution (`resolveBilling`) instead of org-aware effective billing resolution (`resolveEffectiveBilling` with `Organization.orgEntitlement`). This caused org-owned premium cards to show premium UI in some places while backend endpoints still behaved as free/demo.

### 8.2 Fixed paths

The following org-premium feature paths were repaired and verified:

- gallery upload;
- analytics real data vs demo data;
- booking availability/calendar;
- lead creation;
- business hours save path confirmed already org-aware;
- sitemap org entitlement inclusion;
- org access sanity fixture entitlement source.

### 8.3 Gallery limit product decision

The org gallery limit was changed from 50 to 10 by product decision.

Current truth:

- monthly: 10;
- yearly: 10;
- org: 10;
- free gallery is gated off even if a moot limit exists.

Docs were aligned after this change.

### 8.4 Production smoke/manual confirmation

Production/manual checks confirmed:

- org gallery upload works;
- org gallery limit is 10;
- analytics shows real premium data, not demo;
- business hours save/reload works;
- booking calendar appears with real slots;
- lead form renders and path is org-aware;
- sitemap includes org-owned premium card;
- anti-enumeration fake org OG path returns 404.

---

## 9. Billing / payment / receipt architecture truth

Billing is one of Cardigo’s most sensitive contours. Treat it as payment/fiscal infrastructure, not as a casual feature.

### 9.1 First payment flow

Trusted entitlement path is server-side Tranzila notify, not browser redirect.

Flow:

1. User starts checkout.
2. PaymentIntent snapshot may be created.
3. Tranzila DirectNG hosted checkout runs.
4. Browser success/fail return is UX-only.
5. Tranzila server-to-server notify is the source of truth.
6. Backend validates notify.
7. PaymentTransaction ledger is written first.
8. User subscription/plan is updated.
9. Card billing is updated.
10. Tranzila token is captured into `user.tranzilaToken` on paid path.
11. STO create may be attempted after fulfillment depending on `TRANZILA_STO_CREATE_ENABLED`.
12. YeshInvoice receipt is created/shared for actual payment.

### 9.2 Critical invariants

- PaymentTransaction ledger first.
- Duplicate provider transaction returns idempotent OK and must not mutate User/Card again.
- Browser success redirect never grants entitlement.
- Failed payment does not update subscription.
- Receipt only on actual payment.
- No receipt on cancel/resume/delete/revoke/delete-account/admin-delete.
- Tranzila token must never be returned in DTO/API response/log/audit.
- Use booleans like `tranzilaTokenPresent`, not raw token values.

---

## 10. STO lifecycle truth

### 10.1 STO create

- Uses saved `user.tranzilaToken`.
- Can create recurring schedule after first-payment fulfillment.
- Controlled by `TRANZILA_STO_CREATE_ENABLED === "true"`.
- Non-blocking after first payment; first-payment fulfillment is not rolled back if STO create fails.
- If `user.tranzilaSto.stoId` exists and status is `created`, create is skipped.

### 10.2 Cancel auto-renewal

Self-service cancel-renewal:

- calls provider cancellation first;
- marks STO cancelled;
- does not change premium expiry;
- does not clear token;
- does not create PaymentTransaction;
- does not create Receipt/YeshInvoice;
- token intentionally remains so the user can resume auto-renewal while Premium is still active.

### 10.3 Resume auto-renewal

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

### 10.4 Delete saved payment method

Self-service delete saved payment method:

- allowed only when STO is not active/pending;
- clears local token/meta fields only;
- does not call Tranzila;
- does not invalidate token provider-side;
- does not cancel STO;
- does not create payment/receipt/email;
- disables resume because token is missing.

### 10.5 Admin revoke token clear

`ADMIN_REVOKE_TOKEN_CLEAR_P1` is closed/pass by code/static/docs verification.

Current truth:

1. Backend attempts/safely-skips STO cancellation provider-first.
2. If provider cancellation fails, revoke is blocked with `STO_CANCEL_REQUIRED`.
3. Only after safe gate, user is downgraded/revoked.
4. The same atomic update clears:
   - `tranzilaToken`;
   - `tranzilaTokenMeta.expMonth`;
   - `tranzilaTokenMeta.expYear`.
5. PaymentTransaction and Receipt are retained.
6. No YeshInvoice document, Mailjet email, refund, new payment, or receipt is created by admin revoke.
7. Resume auto-renewal after admin revoke is blocked by existing `token_missing` behavior.

### 10.6 Admin/self-delete provider-first cleanup

Self-delete and admin-delete policy:

- if active STO exists, provider cancellation is attempted first;
- if provider cancellation fails and is not safely skipped, deletion is blocked;
- after provider-side cancellation/safe skip, cascade cleanup runs;
- User document is deleted;
- token disappears with user document;
- PaymentTransaction and Receipt are retained.

A paid sandbox user deletion was manually smoke-verified:

- user deleted through Admin UI;
- STO visually removed/cancelled in Tranzila;
- user removed from Mongo;
- PaymentTransaction retained;
- Receipt retained;
- AdminAudit present and clean from sensitive keys.

---

## 11. Receipt / YeshInvoice truth

Receipts are implemented and sandbox/prod-shaped proven for actual payments.

Current truth:

- Receipt is issued on actual first payment.
- Receipt is issued on successful recurring STO payment.
- Receipt is not issued on cancel-renewal.
- Receipt is not issued on resume auto-renewal.
- Receipt is not issued on delete-payment-method.
- Receipt is not issued on admin revoke.
- Receipt is not issued on account/admin delete.
- Receipt cabinet can list/download persisted receipts.
- Receipt delivery uses YeshInvoice share/relay path.
- `shareStatus="sent"` means provider accepted the share request; it does not prove inbox delivery.

Fiscal retention:

- PaymentTransaction and Receipt are fiscal/audit records.
- They must not be deleted as part of user/account/admin delete cascades.
- Raw provider document identifiers and sensitive values must not be exposed in docs/logs/API responses.

---

## 12. Update/replace payment method decision

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

Do not open or implement `UPDATE_PAYMENT_METHOD_ARCHITECTURE_P1` unless explicitly reopened later.

---

## 13. Current production E2E / payment evidence

A controlled production payment E2E was completed with a test user.

Final production-shaped state after successful second payment:

- users: 2;
- cards: 2;
- paymentintents: 2;
- paymenttransactions: 1;
- receipts: 1.

Successful test user evidence included:

- plan: monthly;
- subscription status: active;
- subscription provider: tranzila;
- `tranzilaTokenPresent: true`;
- token meta present;
- `tranzilaSto.status: created`;
- `stoIdPresent: true`;
- no STO error code/message.

PaymentTransaction evidence:

- status: paid;
- provider: tranzila;
- plan: monthly;
- amount/currency correct for that test path;
- provider transaction ID present;
- paymentIntentId present;
- receiptId present;
- rawPayloadHash present.

Receipt evidence:

- status: created;
- shareStatus: sent;
- paymentTransactionId present;
- provider document ID present;
- documentUniqueKey present;
- pdfUrl present;
- YeshInvoice kabala arrived by email and is visible in YeshInvoice.

Classification:

```text
CONTROLLED_PRODUCTION_PAYMENT_E2E = CLOSED / PASS
```

Important next rule from that E2E:

- deleting users/data must use UI self-delete/admin-delete path, not manual Mongo deletion;
- fiscal records must remain retained;
- do not delete PaymentTransaction or Receipt manually.

---

## 14. Anti-secret / anti-overclaim policy

Never include in docs/prompts/reports/final answers:

- raw TranzilaTK / `tranzilaToken`;
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
  - `tranzilaTokenPresent=true/false`;
  - `stoIdPresent=true/false`;
  - `receiptIdPresent=true/false`;
  - `providerTxnIdPresent=true/false`;
  - `recipientEmailMatchesTarget=true/false`.

Avoid overclaims:

- Do not say production rollout is complete unless rollout was actually done and verified.
- Do not say update-card is implemented.
- Do not say provider-side token invalidation is implemented.
- Do not say admin revoke creates receipt/refund/payment/email.
- Do not say delete-payment-method cancels STO.
- Do not say resume creates payment/receipt.
- Do not say YeshInvoice “sent” proves inbox delivery.
- Do not claim legal/tax compliance beyond what counsel/accountant confirmed.

---

## 15. Recently closed / accepted contours as of 2026-05-04

Recent closed or accepted project truths include:

1. Resume auto-renewal — CLOSED / PASS.
2. Delete saved payment method — CLOSED / PASS / manually smoke-verified.
3. Receipt ledger backlink for new records — CLOSED / PASS.
4. Self-delete/admin-delete active STO cleanup patterns — provider-first policy accepted/smoked.
5. Admin revoke token clear — CLOSED / PASS by code/static/docs verification.
6. Paid-user admin-delete cleanup smoke — PASS for deletion/fiscal retention/audit cleanliness.
7. Update/replace payment method — deferred/not needed for MVP.
8. Org access sanity + sitemap org entitlement — CLOSED / production pass.
9. Org card premium feature parity — CLOSED / PASS.
10. QA sanity coverage for analytics/booking/leads — CLOSED / PASS.
11. Controlled-write sanity production DB guard — CLOSED / PASS.
12. OrganizationMember CI index bootstrap + production parity docs — CLOSED / PASS.
13. SANITY_INVITE_HELPERS_DEDUP — CLOSED / VERIFIED.

Closed contours should not be casually reopened. Reopen only with a new bounded contour and a clear reason.

---

## 16. Important deferred / not implemented items

Do not accidentally claim these are implemented:

- active-Premium update/replace card flow;
- provider-side Tranzila token invalidation;
- active-Premium checkout bypass;
- full billing production rollout;
- final legal/tax counsel approval;
- complete monitoring/alerts baseline;
- load/security/stress testing complete;
- full CI wiring for every controlled-write sanity;
- production price/terminal cutover unless explicitly completed in the next contour.

---

## 17. Next bounded contour: BILLING_PRODUCTION_ROLLOUT_READINESS_P1

This is the requested next contour for the next ChatGPT window.

### 17.1 Why this is next

Billing now has many major foundations closed:

- first-payment flow;
- Tranzila notify;
- PaymentTransaction ledger;
- STO create/cancel/resume/recurring flow foundation;
- YeshInvoice receipts;
- receipt cabinet;
- delete saved payment method;
- admin revoke token cleanup;
- self/admin delete provider-first cleanup patterns;
- production-shaped payment E2E proof;
- org premium feature parity repair;
- QA sanity and controlled-write guards.

The next mature step is not another feature. The next mature step is **production rollout readiness**.

### 17.2 What this contour is

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

### 17.3 What this contour is NOT

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

### 17.4 Critical audit areas

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

## 18. Suggested opening message for the next ChatGPT

Paste this into the next ChatGPT window:

```text
PROJECT MODE: Cardigo enterprise workflow.

Use the uploaded handoff file as current project truth.

Act as Senior Project Architect, Senior Backend Engineer, Senior Frontend Engineer, Payment Lifecycle Engineer, Payment Security Engineer, Security Engineer, Production Readiness Engineer, Enterprise Consultant, and Technical Documentation Owner.

We are continuing Cardigo.
Current next bounded contour:
BILLING_PRODUCTION_ROLLOUT_READINESS_P1

Start with Architecture / Intent and then prepare a Phase 1 — Read-Only Audit prompt for Copilot.

Important current truths:
- Billing production rollout is NOT complete.
- CONTROLLED_PRODUCTION_PAYMENT_E2E is CLOSED / PASS for the controlled test path.
- ADMIN_REVOKE_TOKEN_CLEAR_P1 is CLOSED / PASS by code/static/docs verification.
- Active-premium update/replace card is deferred/not needed for MVP.
- If a user needs new card details, they should re-enter card details only after Premium expires via normal checkout.
- Active-premium checkout bypass remains forbidden.
- Paid-user admin-delete cleanup smoke passed for user deletion, STO visual cleanup, fiscal retention, and audit cleanliness.
- Org-owned premium feature parity is closed/pass for gallery, analytics, booking, business hours, and leads.
- OrganizationMember CI index bootstrap is closed/pass and production already had the unique index; no production apply was required.
- Controlled-write sanity guard is closed/pass.

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

## 19. Ready-to-use Copilot prompt for BILLING_PRODUCTION_ROLLOUT_READINESS_P1

Use this only after the next ChatGPT confirms the contour and intent.

```text
PROJECT MODE: Cardigo enterprise workflow.

Act as Senior Project Architect, Senior Backend Engineer, Senior Frontend Engineer, Payment Lifecycle Engineer, Payment Security Engineer, Security Engineer, Production Readiness Engineer, DevOps/Monitoring Engineer, and Technical Documentation Owner.

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
Cardigo has implemented major billing foundations: Tranzila first-payment notify, PaymentTransaction ledger, STO lifecycle, YeshInvoice receipts, receipt cabinet, delete saved payment method, admin revoke token clear, self/admin delete provider-first cleanup patterns, controlled production payment E2E, controlled-write sanity guard, and billing-related QA sanities.

Current product/architecture decisions:
- Active-premium update/replace card flow is deferred/not needed for MVP.
- Active-premium checkout bypass remains forbidden.
- If token is missing/cleared/expired, user re-enters card details only after Premium expires via normal checkout.
- Admin revoke clears local token after safe STO cancellation gate.
- Delete-payment-method clears local token only when STO is not active/pending.
- Cancel-renewal intentionally retains token for resume.
- Receipts are created only for actual payments.
- PaymentTransaction and Receipt are retained fiscal/audit records.

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
Audit current PRICES_AGOROT truth and any docs/frontend display truth.
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
- small controlled payment if appropriate;
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

## 20. Expected next-step discipline

The next chat must not start by “fixing billing.” It must start by auditing production readiness.

Correct order:

1. Accept this handoff as current truth.
2. Confirm `BILLING_PRODUCTION_ROLLOUT_READINESS_P1` as the next contour.
3. Generate/approve the Phase 1 audit prompt.
4. Copilot performs read-only audit with proof.
5. ChatGPT reviews the audit like a senior architect.
6. Only then split follow-up work into ordered bounded contours.
7. Execute one contour at a time.
8. Do not move forward while current contour has unresolved tails.
9. Before real rollout: require rollback plan, monitoring plan, manual operator instructions, smoke checklist, and anti-secret/anti-overclaim docs scan.

---

## 21. Final instruction to the next ChatGPT

You are not here to make quick changes. You are here to protect the production path.

For Cardigo, billing rollout is not just a button or env switch. It is a controlled operational event touching:

- money;
- provider terminals;
- tokens;
- recurring charges;
- invoices/receipts;
- legal copy;
- support workflow;
- user trust;
- fiscal retention;
- monitoring and rollback.

Proceed as a senior architect: audit first, prove everything, split work into bounded contours, close every tail, then roll out deliberately.
