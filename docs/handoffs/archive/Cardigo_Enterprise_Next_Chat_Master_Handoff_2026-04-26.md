# Cardigo Enterprise Next-Chat Master Handoff

**Date:** 2026-04-26  
**Project:** Cardigo — Israel-first digital business card / mini business page SaaS  
**Current master state:** Admin user delete lifecycle + billing provider cancellation + local cascade + documentation + rollout verification **PASSED**  
**Purpose:** This file is a full handoff/instruction document for the next ChatGPT conversation. It preserves the current project truth, working doctrine, closed contours, rollout evidence, and recommended next steps.

---

## 0. How the next ChatGPT should behave

The next ChatGPT must act as:

> **Senior Project Architect / Senior Backend Engineer / Senior Frontend Engineer / Payment Lifecycle Engineer / Security Engineer / Enterprise Consultant**

The assistant must not act like a code generator only. It must protect architecture truth, security boundaries, SSoT, runtime contracts, operational safety, billing correctness, and rollout discipline.

### Core behavior expected from ChatGPT

ChatGPT is responsible for:

1. **Architecture decisions**
    - Scalability
    - Security
    - Data integrity
    - Payment correctness
    - Operational safety
    - Maintainability
    - Minimal blast radius

2. **Backend/frontend consulting**
    - Backend routes/controllers/models/services
    - Frontend flows and UX
    - API contracts
    - Storage lifecycle
    - Billing/receipt lifecycle
    - Auth/security lifecycle
    - CI/CD and rollout

3. **Security review**
    - CSRF/XSS/injection class risks
    - Token leakage
    - Secret leakage
    - Password reset safety
    - Payment provider safety
    - PII/logging safety
    - User deletion/cascade safety

4. **Copilot Agent tasking**
    - ChatGPT frames the task.
    - Copilot executes.
    - ChatGPT reviews proof.
    - No code should be accepted without proof and verification.

5. **Documentation ownership**
    - Runbooks
    - Policies
    - Master handoffs
    - Anti-drift notes
    - Rollout checklists
    - Operator instructions

---

## 1. Project identity

### Product

**Cardigo** is an Israel-first SaaS product for:

- Digital business cards
- Mini business pages
- Shareable public profiles
- QR/public card URLs
- Self-service editing
- Lead collection
- Booking foundation
- Analytics
- Trial/free/premium lifecycle
- Payment integration
- Receipt generation
- Admin operations

### Market

- Israel-first / Israel-only baseline.
- Hebrew/RTL-first UX.
- Canonical public domain:

```text
https://cardigo.co.il
```

### Absolute naming rule

**Cardigo and Digitalyty must never be mixed** in:

- Canonical URLs
- Public paths
- SEO
- Structured data
- OG
- Sitemap logic
- Product logic
- UI copy
- Payment/receipt docs
- Legal docs

Digitalyty may exist as a separate brand/history, but **Cardigo is the product truth**.

---

## 2. Core stack and infrastructure truth

### Frontend

- React + Vite
- CSS Modules only
- RTL-first
- Mobile-first
- Token-based styling
- Shared render chain for public + preview
- Route-level SEO/head management

### Backend

- Node.js + Express
- MongoDB + Mongoose
- Manual index governance
- DTO-driven public truth
- Auth/org/admin/payment/booking/leads/AI/content APIs

### Storage and services

- Supabase Storage
- Mailjet
- MongoDB Atlas
- Render backend
- Netlify frontend/proxy
- Tranzila payments/STO
- YeshInvoice receipts/documents
- Sentry/cron monitoring partially prepared

### Important DB truth

- Target operational DB: `cardigo_prod` in the active production-shaped development cluster.
- Manual index governance:
    - `MONGOOSE_AUTO_INDEX=false`
    - `MONGOOSE_AUTO_CREATE=false`
- Indexes are applied by explicit scripts / operator steps, not by runtime auto-indexing.

---

## 3. Non-negotiable project constraints

Every Copilot prompt in this project must include:

```text
PROJECT MODE: Cardigo enterprise workflow.
```

### Hard frontend constraints

```text
- No inline styles
- CSS Modules only
- Flex only — no CSS Grid
- Mobile-first mandatory
- Typography:
  - font-size only via var(--fs-*)
  - --fs-* rem-only
  - no px/em/%/vw/vh/clamp/fluid font sizes
  - no calc(non-rem) font sizing
- Token-based skins only
- Do not invent typography tokens ad hoc
- Do not leak card-scope tokens into app/public/auth/admin/site-shell context
```

### Hard workflow constraints

```text
- No git commands
- No scope creep
- No “заодно поправил”
- No changes before audit
- Always require PROOF file:line-range
- Always require RAW stdout + EXIT for verification
- Use PowerShell + curl.exe for manual endpoint smoke checks where relevant
- Boundaries must be proven, not guessed
- Verification is mandatory as a separate phase
```

### Canonical work mode

```text
Architecture / Intent
→ Phase 1 — Read-Only Audit with PROOF
→ Phase 2 — Minimal Fix
→ Phase 3 — Verification with RAW stdout + EXIT
→ Documentation / Handoff
→ Rollout / Monitoring when needed
```

Even if the user says “let’s just fix”, the proper enterprise flow remains audit → minimal fix → verification.

---

## 4. Protected architecture invariants

### Auth/runtime

- Browser runtime is cookie-backed.
- Browser auth must not rely on localStorage JWT truth.
- Do not reintroduce browser `Authorization` header as primary auth.
- Cookie-auth / proxy / CSRF / CORS hardening is closed and must not be casually reopened.

### Public card/rendering

- Shared render chain for public + preview is protected.
- Templates registry only:

```text
frontend/src/templates/templates.config.js
```

- Skins must be token-only.
- Preview-only styles must stay under:

```css
[data-preview="phone"]
```

- `CardLayout` DOM skeleton and `CardLayout.module.css` are high-blast-radius and must not be changed casually.

### Public URL truth

Public / QR / OG URLs must come from backend DTO:

```text
publicPath
ogPath
```

Do not compute public URLs independently in frontend.

### Org/public security

- Anti-enumeration 404.
- Membership gate before SEO/410 on org surfaces.
- Sitemap must avoid N+1 patterns.

---

## 5. Current major closed contours before the latest work

This section preserves important previous truths.

### 5.1 Checkout iframe + PaymentIntent + YeshInvoice receipt flow

The iframe checkout sandbox E2E was accepted and documented.

Key truth:

- `/payment/checkout` is standalone, outside marketing Layout.
- `/payment/iframe-return` is standalone, outside marketing Layout.
- `target=iframe` return path:
    - `/api/payments/return?status=success&target=iframe`
    - 303 → `/payment/iframe-return?status=success`
- External no-target path:
    - `/api/payments/return?status=success`
    - 303 → `/pricing?payment=success`
- `postMessage` is UX-only.
- Notify webhook remains the sole entitlement path.
- PaymentIntent carries `receiptProfileSnapshot`.
- Receipt uses `PaymentIntent.receiptProfileSnapshot`.
- Receipt recipient snapshot source is `paymentIntent`.
- Raw `numberId` is not exposed to frontend DTO.
- Receipt delivery uses YeshInvoice `shareDocument`, not Mailjet.

Closed hardening:

- `CheckoutPage` no-op receipt save fixed.
- Stale `receiptOk` cleared on no-diff advance.
- Payment failure back-to-summary clears `paymentError`.
- `SettingsPanel` no-op receipt profile save uses the same “לא בוצעו שינויים.” message.
- YeshInvoice free-text fields are stripped at provider-boundary only.
- Payment/checkout pages have Cardigo logo branding.
- Documentation updated in:
    - `billing-flow-ssot.md`
    - `tranzila-go-live-checklist.md`
    - active checkout iframe handoff

### 5.2 YeshInvoice receipt truth

- Receipts are issued from payment success.
- `PaymentIntent.receiptProfileSnapshot` is authoritative for customer details.
- Free-text fields sent to YeshInvoice are sanitized at document-build boundary.
- Sanitization does **not** mutate:
    - `user.receiptProfile`
    - `PaymentIntent.receiptProfileSnapshot`
- Email / NumberID / ZipCode / CountryCode are not stripped by HTML helper because they have their own upstream validation/format rules.

### 5.3 Trial/free/premium lifecycle truth

- Trial starts on first legitimate card acquisition:
    - first card creation, or
    - claiming anonymous card as first card
- Trial length: 10 days.
- Trial does not delete card on expiry.
- After expiry entitlement falls back to free.
- Gallery is premium-only on free.
- AI is hard-blocked on free.
- Retention purge removes gallery fully, with storage cleanup.
- Product truth:
    - Trial is onboarding incentive, not a separate plan.

### 5.4 Tracking/consent truth

- GTM: `GTM-W6Q8DP6R`
- Meta Pixel: `1901625820558020`
- Site-level tracking only on approved marketing routes.
- Card routes have separate owner tracker consent architecture.
- Site-level and per-card tracking must not contaminate each other.

### 5.5 Install/PWA truth

- One Cardigo app identity site-wide.
- Per-card PWA is not implemented and not planned in that contour.
- Installability contour closed.

---

### 5.6 Org Annual Entitlement — Phase 2A–2I CLOSED

Organization annual entitlement contour: fully implemented, verified, and documented.

**What was built (all phases closed):**

| Phase | Contour                                                                          | Status |
| ----- | -------------------------------------------------------------------------------- | ------ |
| 2A    | `Organization.orgEntitlement` model field + `AdminAudit` model                   | CLOSED |
| 2B    | Org-aware DTO resolver (`effectiveBilling.source = "organization"`)              | CLOSED |
| 2C    | retentionPurgeJob + trialLifecycleReconcile skip org-owned cards                 | CLOSED |
| 2D    | Admin grant/extend/revoke API (`POST /api/admin/orgs/:id/entitlement/*`)         | CLOSED |
| 2E    | Local admin API smoke                                                            | PASSED |
| 2F    | Org card premium DTO smoke                                                       | PASSED |
| 2G    | `ai.controller.js` org entitlement recognition for AI access                     | CLOSED |
| 2H    | `admin.controller.js` org-card billing/trial guards (Phase 2H)                   | CLOSED |
| 2I    | Admin UI (AdminOrganizationsView — entitlement block, grant/extend/revoke forms) | CLOSED |
| 3I    | Manual browser smoke / operator UX acceptance                                    | PASSED |
| 2J    | Docs package (runbook, policy, billing SSoT, admin.md, trial lifecycle)          | CLOSED |

**Product truth:**

- Platform admin grants annual entitlement after confirmed off-platform payment/agreement.
- All org-owned cards under active entitlement resolve: `effectiveBilling.source = "organization"`, `plan = "org"`, `effectiveTier = "premium"`.
- Personal cards and `User.subscription` are unaffected.
- No self-service org checkout. No Tranzila/STO/YeshInvoice/PaymentTransaction/Receipt involved.

**Admin hardening (Phase 2H):**

- `extendTrial`, `adminSetCardBilling`, `adminSyncCardBillingFromUser`, `adminRevokeCardBilling` blocked for org-owned cards with `409 ORG_CARD_BILLING_MANAGED_BY_ORG`.
- `adminOverride` remains a deferred escape hatch; it was intentionally not blocked.

**Docs location:**

- Operator runbook: `docs/runbooks/org-annual-entitlement-admin-grant.md`
- Policy: `docs/policies/POLICY_ORGS.md` §12
- Billing boundary: `docs/runbooks/billing-flow-ssot.md` §18
- Admin API reference: `docs/admin.md` — Organization Annual Entitlement section
- Trial lifecycle: `docs/runbooks/trial-lifecycle-ssot.md` §2 and §9

**Explicit out-of-scope (not implemented in this contour):**

- Tranzila / STO / YeshInvoice / PaymentTransaction / Receipt
- Personal checkout for org cards
- Org-wide AI quota pool (V1 uses per-user quota)
- Org self-service entitlement management
- Org entitlement expiry notification
- Audit trail UI (display AdminAudit per org)
- Production rollout verification (separate future contour)

---

## 6. Latest major workstream: Admin user delete lifecycle

This is the most recent and most important closed contour.

### Original concern

The user correctly raised a serious payment lifecycle risk:

> If platform admin deletes a user, local data may be deleted, but the linked Tranzila STO/credit card schedule might continue charging the customer.

This triggered a large enterprise audit.

### Initial audit finding

Before the fixes:

- Admin hard delete did **not** cancel Tranzila STO.
- Self-delete did **not** cancel Tranzila STO.
- Admin subscription revoke did **not** cancel Tranzila STO.
- `cancelTranzilaStoForUser` already existed and was solid, but was called only from self-service cancel-renewal.
- Admin delete local cascade was incomplete.
- Self-delete cascade was also incomplete.
- Admin delete documentation/policy had stale assumptions.

### Major risk

A deleted user could still have active provider-side recurring billing.

This was classified as a P0 payment lifecycle risk.

---

## 7. Closed implementation contours in admin delete lifecycle

### 7.1 PROVIDER_CANCELLATION_BEFORE_DELETE_OR_REVOKE — CLOSED

#### What was fixed

Added STO cancellation before destructive/local lifecycle operations.

Covered flows:

1. Admin hard delete:
    - `source: "admin_delete"`
    - blocks with `409 STO_CANCEL_REQUIRED` if cancellation fails.

2. Admin subscription revoke:
    - `source: "admin_revoke"`
    - blocks with `409 STO_CANCEL_REQUIRED` before local downgrade.

3. Self-delete:
    - `source: "self_delete"`
    - after tombstone, before card cascade.
    - blocks with generic 400 if provider cancellation fails.

#### Important invariant

All STO block conditions must remain:

```js
!stoResult.ok && !stoResult.skipped;
```

Do **not** simplify to:

```js
!stoResult.ok;
```

because no-STO / invalid non-created states can return:

```js
{ ok: false, skipped: true }
```

and those must be proceed-safe.

#### Verification

Safe gates passed:

- `sanity:imports`
- `sanity:slug-policy`
- `sanity:ownership-consistency`
- `sanity:paymentintent-index-drift`

---

### 7.2 LOCAL_AUTH_JOB_CLEANUP — CLOSED

#### What was fixed

Before deleting user documents, both admin delete and self-delete now clean:

- `MailJob`
- `EmailVerificationToken`
- `EmailSignupToken`
- `PasswordReset`
- `ActivePasswordReset`

#### Why it matters

This closes:

- MailJob race window
- stale password reset records
- stale active password reset records
- stale email verification/signup records

#### Failure behavior

Cleanup is hard-blocking:

- Admin delete:
    - `500 USER_DELETE_CLEANUP_FAILED`
    - user is **not** deleted
    - safe to retry after DB/Mongo connectivity is healthy

- Self-delete:
    - generic 400
    - user is **not** deleted

---

### 7.3 AI_USAGE_DELETE_CASCADE — CLOSED

#### What was fixed

Both admin delete and self-delete now also delete:

```text
AiUsageMonthly
```

by `userId`.

#### Why it matters

`AiUsageMonthly` is quota/usage data only:

- not fiscal
- not billing
- no receipt relation
- no legal retention value
- orphaned after user deletion

Therefore it is deleted with user.

---

### 7.4 ADMIN_AUDIT_RELIABILITY — CLOSED

#### Problem

`logAdminAction("USER_DELETE_PERMANENT")` happened after irreversible deletion. If audit write failed, the admin could receive HTTP 500 even though deletion had already completed.

#### Fix

Admin delete now wraps the audit write in targeted try/catch.

If audit succeeds:

```json
{ "ok": true }
```

If audit fails after deletion:

```json
{
    "ok": true,
    "deleted": true,
    "auditWriteFailed": true,
    "warning": "User was deleted but admin audit log could not be written. Check server logs."
}
```

#### Important truth

`auditWriteFailed:true` means:

```text
Delete succeeded.
Only the audit write failed.
Do not retry as if delete failed.
```

---

### 7.5 SANITY_ADMIN_USER_DELETE_EXPANSION — CLOSED

The CI sanity script now seeds and asserts deletion of cleanup targets.

#### Script

```text
backend/scripts/sanity-admin-user-delete.mjs
```

#### Workflow

```text
.github/workflows/backend-admin-sanity.yml
```

#### This sanity is destructive by design

It creates and deletes real records in the CI/drift DB and Supabase bucket. It must only be run through GitHub Actions / CI against:

```text
MONGO_URI_DRIFT_CHECK
```

Never run locally against production.

#### The sanity now proves

- User deleted
- Card deleted
- Supabase objects deleted
- `PasswordReset` deleted
- `ActivePasswordReset` deleted
- `EmailVerificationToken` deleted
- `EmailSignupToken` deleted
- `MailJob` deleted
- `AiUsageMonthly` deleted
- `DeletedEmailBlock` **not** created for admin delete
- `AdminAudit USER_DELETE_PERMANENT` written

Expected output booleans:

```json
{
    "passwordResetsDeleted": true,
    "activePasswordResetsDeleted": true,
    "emailVerificationTokensDeleted": true,
    "emailSignupTokensDeleted": true,
    "mailJobsDeleted": true,
    "aiUsageDeleted": true,
    "deletedEmailBlockNotCreated": true,
    "adminAuditWritten": true
}
```

---

### 7.6 ADMIN_USER_DELETE_LIFECYCLE_DOCS_AND_RUNBOOK — CLOSED

Docs updated and accepted.

Important docs:

```text
POLICY_ADMIN_DELETE_LIFECYCLE_V1.md
docs/runbooks/admin-user-delete-lifecycle.md
docs/runbooks/backend-verification-and-deploy.md
docs/runbooks/billing-flow-ssot.md
```

Runbook created:

```text
docs/runbooks/admin-user-delete-lifecycle.md
```

It documents:

- admin delete sequence
- self-delete sequence
- admin subscription revoke sequence
- data deleted
- data retained
- provider cancellation recovery
- failure modes
- CI sanity coverage
- operator pre-production checklist
- manual verification checklist
- deferred tails

---

### 7.7 ADMIN_USER_DELETE_LIFECYCLE_ROLLOUT_READINESS — CLOSED

#### Final readiness issue found

The source values were documented as:

```text
admin_delete
admin_revoke
self_delete
```

but the provider allowlist and User schema enum did not include them yet.

If only the provider allowlist was changed without schema enum, Mongoose would throw validation error on successful cancellation save.

This was correctly fixed in both places.

#### Files changed

```text
backend/src/models/User.model.js
backend/src/services/payment/tranzila.provider.js
docs/runbooks/admin-user-delete-lifecycle.md
```

#### Now accepted source values are synchronized

Provider `ALLOWED_CANCEL_SOURCES` includes:

```text
operator_script
admin
webhook
manual_portal
self_service
admin_delete
admin_revoke
self_delete
```

User model `tranzilaSto.cancellationSource` enum includes:

```text
null
operator_script
admin
webhook
manual_portal
self_service
admin_delete
admin_revoke
self_delete
```

Unknown source strings still normalize to:

```text
operator_script
```

#### Verification

- Provider/source proof passed.
- Schema enum proof passed.
- Runbook proof passed.
- `billing-flow-ssot.md` was inspect-only and already accurate.
- Safe gates passed.

---

### 7.8 ADMIN_USER_DELETE_LIFECYCLE_ROLLOUT_VERIFICATION — PASSED

The user performed full rollout verification.

#### Local safe gates

All passed:

```text
npm.cmd run sanity:imports
npm.cmd run sanity:slug-policy
npm.cmd run sanity:ownership-consistency
npm.cmd run sanity:paymentintent-index-drift
```

Results:

- imports: `ok:true`, `failedCount:0`
- slug-policy: `ok:true`
- ownership-consistency: all counts `0`
- paymentintent-index-drift: `overall: PASS`, 3/3 indexes OK

#### Safe curl smoke

`/api/health` returned:

```text
401 GATE_REQUIRED
```

This is acceptable because site/proxy gate is active. It proves the route is gated, not that backend is down.

Return endpoint checks passed:

```text
POST https://cardigo.co.il/api/payments/return?status=success&target=iframe
→ 303 /payment/iframe-return?status=success
```

```text
POST https://cardigo.co.il/api/payments/return?status=success
→ 303 /pricing?payment=success
```

#### GitHub Actions destructive sanity

Backend Admin Sanity passed with:

```text
EXIT:0
failures: []
```

and all booleans true:

```json
{
    "passwordResetsDeleted": true,
    "activePasswordResetsDeleted": true,
    "emailVerificationTokensDeleted": true,
    "emailSignupTokensDeleted": true,
    "mailJobsDeleted": true,
    "aiUsageDeleted": true,
    "deletedEmailBlockNotCreated": true,
    "adminAuditWritten": true
}
```

Supabase paths were deleted:

```text
postcheckNotFoundCount = 2
pathsCount = 2
```

#### Render deploy

Render backend deployed successfully:

- `MongoDB connected`
- workers scheduled
- `Backend running on port 5000`
- service live
- no startup crash
- no cancellationSource validation error

#### Final accepted status

```text
ADMIN_USER_DELETE_LIFECYCLE = CLOSED
ADMIN_USER_DELETE_LIFECYCLE_ROLLOUT_READINESS = CLOSED
ADMIN_USER_DELETE_LIFECYCLE_ROLLOUT_VERIFICATION = PASSED
ROLLOUT_READY = YES
P0 = 0
P1 = 0
P2 = 0
P3 = future hardening only
```

---

## 8. Current accepted product decisions for delete lifecycle

### Admin hard delete

Platform admin may delete users freely within MVP restrictions.

Admin delete:

- does cancel STO first
- does cleanup local auth/job/AI records
- does delete cards/storage/cascade
- does delete user
- does write AdminAudit
- does **not** create DeletedEmailBlock
- does **not** block on sole-org-admin state

### Self-delete

Self-delete:

- requires authenticated session
- keeps sole-org-admin guard
- creates DeletedEmailBlock tombstone first
- cancels STO after tombstone, before cascade
- cleans auth/job/AI records
- deletes cards/storage/cascade
- deletes user

### Admin subscription revoke

Admin subscription revoke:

- cancels STO before local downgrade
- hard-blocks on provider failure
- then sets local subscription to free/inactive

### Fiscal retention

Never delete:

- `PaymentTransaction`
- `Receipt`
- YeshInvoice provider documents

These are fiscal/audit records.

### Marketing opt-out

Retain:

```text
MarketingOptout
```

Reason: protective suppression artifact.

### Site analytics

Retain:

- `SiteAnalyticsVisit`
- `SiteAnalyticsDaily`

Reason:

- no `userId`
- TTL-managed
- not part of user cascade

---

## 9. Current remaining P3 future hardening

These are **not blockers**.

### P3-1 — GitHub Actions optional-secret hard-fail

Current state:

- `MONGO_URI_DRIFT_CHECK` is strict.
- Missing `MONGO_URI_DRIFT_CHECK` makes workflow fail.
- Some optional secrets may allow skip/green behavior.

Future improvement:

> Make `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_STORAGE_BUCKET` hard-fail for `backend-admin-sanity.yml`, because the sanity is now meaningful only when all are present.

Do this as a separate small contour.

### P3-2 — Post-deploy monitoring checklist

Currently we know manually to watch Render logs for:

```text
STO_CANCEL_REQUIRED
USER_DELETE_CLEANUP_FAILED
auditWriteFailed
SUPABASE_DELETE_FAILED
ValidationError
cancellationSource
[admin] auth/job cleanup failed
[admin] USER_DELETE_PERMANENT audit write failed
```

Future improvement:

> Add a formal post-deploy monitoring checklist to the runbook.

### P3-3 — Log-safety documentation

Code has been checked and does not log:

- secrets
- tokens
- payment URLs
- card data
- CVV
- raw provider tokens
- raw private data in unsafe places

Future improvement:

> Create or update a log-safety doc describing allowed/disallowed logging patterns for payment/admin/delete flows.

---

## 10. Current recommended next actions

The current admin delete lifecycle is closed. Do not reopen it casually.

### Option A — P3 hardening continuation

Recommended if the user wants to polish ops:

1. `backend-admin-sanity.yml` strict secret hard-fail.
2. Post-deploy monitoring checklist.
3. Log-safety policy note.

Each must be separate, small, phased.

### Option B — New independent scope

If the user wants to continue product work, open a new bounded contour. Examples:

- Production billing terminal cutover readiness
- Tranzila production STO lifecycle proof
- YeshInvoice production readiness
- Pricing/legal final alignment before production
- Auth/registration hardening
- API invalid-token/error-path hardening
- Monitoring/alerts baseline
- Security/performance/stress testing
- Admin UI billing/delete warnings
- Retention destructive rollout
- Booking production hardening

### Strong recommendation

Do not mix P3 hardening with billing terminal cutover or new feature work.

---

## 11. How to task Copilot Agent

Every Copilot prompt must be precise and phase-bound.

### Standard Phase 1 prompt structure

```text
PROJECT MODE: Cardigo enterprise workflow.

Act as Senior Project Architect / Senior Backend Engineer / Security Engineer.

Phase: Phase 1 — Read-Only Audit.

Goal:
[clear goal]

Hard constraints:
- No git commands
- No file edits
- No code changes
- No docs changes
- No env changes
- No DB writes
- No provider calls
- No destructive scripts
- Read-only only

Required audit:
1. Inspect [files/areas].
2. Produce PROOF table with file:line.
3. Identify gaps by severity P0/P1/P2/P3.
4. Recommend minimal implementation plan.
5. STOP. Do not implement.
```

### Standard Phase 2 prompt structure

```text
PROJECT MODE: Cardigo enterprise workflow.

Phase: Phase 2 — Minimal Fix.

Goal:
Implement only the accepted Phase 1 plan.

Allowed files:
- [exact file list]

Hard constraints:
- No git commands
- No scope creep
- No unrelated refactor
- No formatting-only changes
- No inline styles
- CSS Modules only if frontend
- Flex only if CSS
- No provider calls
- No DB writes unless explicitly approved

Required deliverable:
1. Files changed.
2. Per-file summary.
3. PROOF table with file:line.
4. Security/non-regression checklist.
5. STOP. Do not run Phase 3 unless asked.
```

### Standard Phase 3 prompt structure

```text
PROJECT MODE: Cardigo enterprise workflow.

Phase: Phase 3 — Verification.

Goal:
Verify the Phase 2 changes.

Hard constraints:
- No file edits
- No code changes
- No destructive commands
- No provider calls
- No DB writes unless the exact sanity is approved

Required:
1. Static proof file:line.
2. Anti-drift greps.
3. RAW stdout + EXIT for gates.
4. Non-regression checklist.
5. Explicit statement of what was NOT run.
6. Final verdict: PASS / FAIL.
7. STOP.
```

---

## 12. Special warnings for next chat

### Never run destructive sanity locally

Do not run locally:

```text
npm run sanity:admin-user-delete
```

unless explicitly in CI/drift environment with safe DB and operator approval.

This command creates/deletes real records and Supabase files.

### Never run STO execute casually

Do not run casually:

```text
npm run sto:cancel:execute
```

This can call provider cancellation API.

### Never debug Mailjet first in payment/delete issues

For payment/delete lifecycle issues, first prove:

- route branch
- DB state
- provider state
- local cancellation state
- audit records

Do not jump to provider or email debugging before proving internal flow.

### Do not reopen closed contours casually

Closed means:

- code accepted
- verification passed
- docs aligned
- rollout verified if needed

Reopen only with a concrete regression, new product decision, or runtime evidence.

---

## 13. Current environment/run commands that are safe

These are safe read-only or non-destructive gates:

```powershell
cd backend
npm.cmd run sanity:imports
npm.cmd run sanity:slug-policy
npm.cmd run sanity:ownership-consistency
npm.cmd run sanity:paymentintent-index-drift
```

For frontend-related changes, also use:

```powershell
npm.cmd run check:inline-styles
npm.cmd run check:skins
npm.cmd run check:contract
npm.cmd run build --if-present
```

Use curl smoke carefully, e.g.:

```powershell
curl.exe -i -X POST "https://cardigo.co.il/api/payments/return?status=success&target=iframe"
curl.exe -i -X POST "https://cardigo.co.il/api/payments/return?status=success"
```

Expected:

```text
303 /payment/iframe-return?status=success
303 /pricing?payment=success
```

---

## 14. Current known non-blocking observations

### `sanity:slug-policy`

May show:

```json
"limitPayload": false
```

This is a known existing state and not related to current delete lifecycle work if `ok:true` and expected checks pass.

### `/api/health`

May return:

```json
{ "ok": false, "code": "GATE_REQUIRED" }
```

with HTTP 401 because proxy/site gate is active. This is not a backend-down signal.

---

## 15. Current documentation truth

Important docs to preserve:

```text
docs/runbooks/admin-user-delete-lifecycle.md
docs/runbooks/billing-flow-ssot.md
docs/runbooks/backend-verification-and-deploy.md
POLICY_ADMIN_DELETE_LIFECYCLE_V1.md
POLICY_RETENTION_V1.md
```

The active runbook for user deletion is:

```text
docs/runbooks/admin-user-delete-lifecycle.md
```

It is now the operational reference for:

- admin hard-delete
- self-delete
- admin subscription revoke
- STO cancellation behavior
- cleanup cascade
- retained fiscal records
- CI sanity verification
- operator response to failures

---

## 16. Rollout monitoring signals

After deploy, monitor Render logs for:

```text
STO_CANCEL_REQUIRED
USER_DELETE_CLEANUP_FAILED
auditWriteFailed
SUPABASE_DELETE_FAILED
ValidationError
cancellationSource
[admin] auth/job cleanup failed
[admin] USER_DELETE_PERMANENT audit write failed
```

### Meaning

#### STO_CANCEL_REQUIRED

Provider cancellation failed. Local delete/revoke did not proceed. Do not force-delete local records. Resolve STO first.

#### USER_DELETE_CLEANUP_FAILED

Auth/job/AI cleanup failed before `User.deleteOne`. User is not deleted. Safe retry after DB connectivity is healthy.

#### auditWriteFailed:true

Delete succeeded, only AdminAudit write failed. Reconstruct audit manually from logs if needed.

#### SUPABASE_DELETE_FAILED

Storage delete failed. DB delete should be blocked to preserve references. Investigate Supabase and retry.

#### ValidationError + cancellationSource

Would indicate schema/provider source drift. This should now be fixed. If seen, stop and audit.

---

## 17. Current final status snapshot

```text
Project: Cardigo
Date: 2026-04-26

Checkout iframe sandbox E2E: CLOSED
YeshInvoice receipt email/snapshot contour: CLOSED
Checkout hardening/branding: CLOSED
Admin user delete lifecycle: CLOSED
Admin delete lifecycle rollout readiness: CLOSED
Admin delete lifecycle rollout verification: PASSED
Billing provider cancellation before delete/revoke: CLOSED
Auth/job/AI cleanup cascade: CLOSED
AdminAudit reliability: CLOSED
Sanity admin delete expansion: CLOSED
Docs/runbook alignment: CLOSED

P0 blockers: 0
P1 blockers: 0
P2 blockers: 0
P3 future hardening: 3
```

---

## 18. Recommended first message in the next ChatGPT chat

Paste something like:

```text
We are continuing the Cardigo project.

Use the attached master handoff as the current canonical project truth.

Act as Senior Project Architect / Senior Backend & Frontend Engineer / Payment Lifecycle Engineer / Security Engineer.

Preserve the Cardigo enterprise workflow:
Audit → Minimal Fix → Verification → Documentation → Rollout when needed.

Do not use git commands.
No inline styles.
CSS Modules only.
Flex only, no CSS Grid.
Mobile-first.
Typography only via var(--fs-*) rem tokens.
No scope creep.
No changes before read-only audit.
Always require PROOF file:line and RAW stdout + EXIT.

Current latest closed contour:
ADMIN_USER_DELETE_LIFECYCLE_ROLLOUT_VERIFICATION = PASSED.
Do not reopen it unless there is a real regression.

Next I want to work on: [choose next scope].
Start with Phase 1 read-only audit only.
```

---

## 19. Final instruction to next ChatGPT

Think like an enterprise architect.

Prefer:

- bounded changes
- proof-driven decisions
- strong safety
- clear operator runbooks
- minimum blast radius
- truthful docs
- no stale SSoT
- no accidental provider calls
- no hidden destructive operations
- no “quick hacks”

Cardigo is moving toward production. Every change must be treated as production-shaped, even while still under development.
