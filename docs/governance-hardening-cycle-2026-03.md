# Enterprise Governance & Hardening Cycle - March 2026

> **Tier 2 - Architecture / Ops Contract**
> Canonical summary of the completed governance/hardening audit cycle (Steps 1–9).

_Completed: 2026-03-25_

---

## Purpose

This document records the enterprise governance and hardening cycle that audited and aligned the core data, auth, public-routing, and consent contours of the Cardigo backend and frontend.

The cycle followed the project's phased protocol (Phase 1 audit → Phase 2 minimal fix → Phase 3 verification) for each step. No step was closed without verification proof.

This is not a feature changelog. It is a governance record:

- what was audited,
- what was fixed,
- what canonical decisions were accepted,
- what was intentionally deferred.

Do not casually reopen closed steps without a bounded reason.

---

## Completed Steps

### Step 1 - Users / Auth Identity Live-Index Governance

**Scope:** Verify user/auth identity truth is backed by live DB indexes, not app logic alone.

**Outcome:** Migration script created and applied. Live indexes now include `users.email_1` (unique), `users.cardId_1` (unique sparse), and `tokenHash` unique indexes on all three auth token collections. Schema hardened (`User.email`: `trim: true`, `lowercase: true`).

**Verdict:** CLOSED / PASS

---

### Step 2 - Token Security / Org Invite Token Governance

**Scope:** Token-model governance and org invite token contour.

**Outcome:** Migration script for `orginvites`. Live indexes now include `tokenHash_1` (unique) and four query-shaped runtime indexes. `OrgInvite.model.js` aligned to governed set.

**Not touched:** `orginviteaudits`, TTL/cleanup policy.

**Verdict:** CLOSED / PASS WITH FOLLOW-UP (operational hygiene only, no correctness gap)

---

### Step 3 - Payment / Subscription / Transaction Governance

**Scope:** Ledger/idempotency/provider identity contour.

**Outcome:** No fix required. `PaymentTransaction.providerTxnId_1` unique already live. Idempotency backed by DB truth. Notify-path is source of truth.

**Verdict:** CLOSED / PASS

---

### Step 4 - Core Card / Public Content Governance

**Scope:** Core `Card` collection, public identity, slug governance, public/preview/OG/sitemap, anti-enumeration paths.

**Outcome:** No fix required. All 12 schema-declared indexes live and aligned. Partial unique slug indexes live. `publicPath`/`ogPath` computed server-side (not stale persisted truth).

**Verdict:** CLOSED / PASS

---

### Step 5 - Organizations / Membership / Org Public Identity

**Scope:** `organizations`, `organizationmembers`, org public routing, org membership/access truth.

**Outcome:** Migration script for `organizations`. Created `slug_1` unique index. Removed unjustified `isActive` schema index declaration. `organizationmembers` confirmed aligned.

**Verdict:** CLOSED / PASS

---

### Step 6 - Leads / Inbox / Contact Flows Governance

**Scope:** `Lead` model, inbox list queries, unread-count, mailbox tabs, live index support.

**Outcome:** Migration script for `leads`. Added `idx_leads_unread_count` runtime-shaped index. Removed unjustified schema-only declarations. `Lead.model.js` aligned to intentional governed set.

**Verdict:** CLOSED / PASS

---

### Step 7 - Analytics / Counters / Monthly Aggregates Governance

**Scope:** `AiUsageMonthly`, `CardAnalyticsDaily`, `SiteAnalyticsDaily` aggregate governance.

**Outcome:** No fix required. Identity truth correct everywhere (one-row-per-entity-per-period backed by live unique indexes). Only redundant/naming issues found - optimization debt, not correctness.

**Deferred:** Destructive index cleanup, naming cleanup, retention-policy redesign.

**Verdict:** CLOSED / PASS WITH FOLLOW-UP

---

### Step 8 - Auth / Registration / Token Lifecycle Runtime Hardening

**Scope:** Runtime/security correctness of all auth flows (register, login, forgot, reset, verify-email, resend-verification, signup-link, signup-consume, invite-accept, change-password).

**Outcome:**

- Password minimum length (8 chars) enforcement added to `/auth/reset`, `/account/change-password`, `/invites/accept`.
- `invite-accept` new-user branch now creates user with `isVerified: true` (invite token proves email ownership).

**Verdict:** CLOSED / PASS

---

### Step 9 - Consent / Terms / Privacy Truth Governance

**Scope:** Separate email-ownership truth from consent truth. Verify consent capture across all account-creation flows.

**Outcome:**

- `signup-consume` now captures and validates `consent === true` (UI checkbox → frontend validation → API payload → backend validation → DB persistence).
- `invite-accept` new-user branch now captures and validates consent (same full truth chain).
- Consent fields persisted: `termsAcceptedAt`, `privacyAcceptedAt`, `termsVersion`, `privacyVersion`.
- Version SSoT: `backend/src/utils/consentVersions.js`.
- Existing-user invite branch unchanged - does not recollect consent.

**Deferred:** Retroactive consent backfill for legacy null-consent users, re-consent/version-bump flow, legal copy refinement.

**Verdict:** CLOSED / PASS

---

---

## Post-Cycle Hardening - Late March 2026

Four additional bounded security/governance scopes were completed after the primary nine-step cycle. Each followed the same protocol.

### Step 10 - Forgot-Password Abuse Hardening

**Scope:** Prevent spam/abuse on `/auth/forgot` regardless of IP rotation.

**Outcome:**

- Backend-authoritative per-user DB-backed cooldown (180 s): if an active unexpired reset token was already issued within the cooldown window, the new send is suppressed silently and 204 is returned (anti-enumeration preserved).
- Catch block is fail-closed: any DB error during cooldown check also returns 204 (cannot bypass abuse rail via error injection).
- IP rate-limit response changed from 429 to 204 (consistent anti-enumeration posture - callers cannot distinguish IP limit from user-not-found).
- Frontend: 180-second countdown UX after send, spam/junk folder helper hint, button disabled during cooldown.

**Verdict:** CLOSED / PASS

---

### Step 11 - JWT Session Invalidation After Password Change

**Scope:** Existing JWT sessions remain valid after password reset or change-password - stale sessions must be invalidated server-side.

**Outcome:**

- `passwordChangedAt: Date` field added to `User` schema (default `null`; null = no event yet = all tokens fresh - backward-compatible).
- `backend/src/utils/isTokenFresh.js` helper: compares `payload.iat` against `Math.floor(passwordChangedAt.getTime() / 1000)`. Same-second tokens are FRESH (`iat >= changedAtSec`).
- `requireAuth` middleware rewritten as async: DB read of `passwordChangedAt` + freshness check; stale tokens → 401.
- `optionalAuth` middleware: same DB read + freshness check; stale tokens silently drop credentials and fall through (no 401).
- `requireAdmin` middleware: extended existing `.select("role")` to `.select("role passwordChangedAt")` - zero additional DB round-trip.
- `/auth/reset` and `/account/change-password` both set `passwordChangedAt: new Date()` on success.
- Live probe verified: T1 stale after change-password → 401; T2 fresh after re-login → 200; optionalAuth stale → public fallback, no 401/500.
- Admin: DB read was already in `requireAdmin` (precedent). Static proof via import sanity accepted (no live admin fixture was available in the test environment).

**Verdict:** CLOSED / PASS

---

### Step 12 - Auth Malicious-Input Audit (XSS / NoSQL Injection / Email Injection)

**Scope:** Read-only audit of all auth-related input paths for XSS, operator injection, email header injection, unsafe sinks.

**Outcome:** No P0 or P1 issues found. No Phase 2 fix required.

Key findings proven clean:

- Zero `dangerouslySetInnerHTML` / `innerHTML` in `frontend/src` (grep: 0 matches).
- All React auth UIs render errors and user-originated values as JSX text nodes - auto-escaped.
- Mailjet: `TextPart` only across all 4 send functions - no `HtmlPart` anywhere; email body = static prefix + crypto-generated link, no user input interpolated.
- `normalizeEmail()`: `typeof value !== "string" → ""` - operator objects cannot reach any Mongo query.
- `typeof password !== "string"` guards on all password-bearing endpoints (login, register, reset, signup-consume, change-password).
- `String(req.body?.token || "").trim()` coercion on all token endpoints: `{"$gt":""}` → `"[object Object]"` → sha256 lookup fails → 400/204.
- `consent !== true` strict boolean - object injection cannot satisfy this predicate.
- Admin search uses `escapeRegExp()` before constructing regex - regex injection mitigated.

One P2 note (non-security): admin email regex search is a full collection scan (no index on `email` regex path) - performance concern only, no security gap.

**Verdict:** CLOSED / PASS (no fix)

---

### Step 13 - PasswordReset Index Governance

**Scope:** PasswordReset documents had no guaranteed live DB indexes. Canonical apply path was absent from `package.json`.

**Outcome:**

- Canonical migration script confirmed: `migrate:user-auth-indexes` (`backend/scripts/migrate-user-auth-indexes.mjs`). This script supersedes the legacy `migrate-passwordreset-indexes.mjs` and covers four indexes: `tokenHash_1` (unique), `userId_1`, `expiresAt_1`, `usedAt_1`.
- `migrate:user-auth-indexes` added to `backend/package.json`.
- `backend/README.md` §Index Governance updated with the canonical script entry.
- `docs/runbooks/auth-forgot-reset-runbook.md` §Index governance rewritten with canonical script, procedure, and explicit TTL-deferred note.
- **Apply run result:** all four indexes confirmed present in live `passwordresets` collection. Post-check: `POST-CHECK: all critical indexes verified`. Idempotent - zero mutations on apply (indexes were already live).
- TTL index on `expiresAt`: intentionally deferred (see Deferred section). App-level expiry guard (`expiresAt: { $gt: now }`) remains authoritative for correctness/security regardless of TTL state.

**Verdict:** CLOSED / PASS

---

## Canonical Decisions Accepted

### Email ownership ≠ consent

Invite/signup tokens prove email ownership (sufficient for `isVerified: true`), but this is **not** sufficient for consent to Terms/Privacy. Consent requires explicit UI capture and strict boolean validation.

### Do not materialize schema indexes without runtime justification

Schema declarations alone do not justify live index creation. Governed set must align schema truth, runtime truth, and live DB truth.

### Query-shaped indexes over field-by-field spraying

Index design follows actual runtime query shapes, not per-field intuition.

### Product/compliance truth requires explicit product decisions

Consent, legal, and compliance gaps cannot be silently backfilled as "technical fixes." The correct sequence: prove truth mismatch → accept product decision → implement UI/API/backend chain.

---

## Intentionally Deferred

### Auth / token retention

- PasswordReset operational indexes: **resolved** (Step 13 - live and verified).
- PasswordReset TTL index (`expireAfterSeconds` on `expiresAt`): still deferred. Expired documents accumulate but are harmless - app-level expiry guard rejects them on every query. Apply via `migrate-passwordreset-indexes.mjs --apply --ttl` when operationally decided.
- Other token collections (`emailverificationtokens`, `emailsignuptokens`): confirmed live via post-check in Step 13 apply run.
- Stale unverified users cleanup: still deferred.

### Consent future work

- Retroactive consent capture for legacy null-consent users.
- Re-consent / version-bump flow.
- Consent enforcement on existing user cohorts.
- Legal copy refinement.

### Index hygiene / optimization

- Temporary audit helper cleanup.
- Optional destructive cleanup of redundant live indexes.
- Explicit governed naming where no correctness risk exists.

### Analytics retention

- `CardAnalyticsDaily` retention decision.
- Broader aggregate cleanup strategy.

---

## Final Status

| Step | Domain                                 | Verdict                      |
| ---- | -------------------------------------- | ---------------------------- |
| 1    | Users / auth identity indexes          | CLOSED / PASS                |
| 2    | Token / org invite governance          | CLOSED / PASS WITH FOLLOW-UP |
| 3    | Payment transaction governance         | CLOSED / PASS                |
| 4    | Card / public content governance       | CLOSED / PASS                |
| 5    | Org / membership / org public identity | CLOSED / PASS                |
| 6    | Leads / inbox governance               | CLOSED / PASS                |
| 7    | Analytics / counters governance        | CLOSED / PASS WITH FOLLOW-UP |
| 8    | Auth runtime hardening                 | CLOSED / PASS                |
| 9    | Consent / terms / privacy truth        | CLOSED / PASS                |
| 10   | Forgot-password abuse hardening        | CLOSED / PASS                |
| 11   | JWT session invalidation               | CLOSED / PASS                |
| 12   | Auth malicious-input audit             | CLOSED / PASS (no fix)       |
| 13   | PasswordReset index governance         | CLOSED / PASS                |

**Cycle status: completed and closed at enterprise governance level (Steps 1–13).**

---

## Do Not Reopen Without Bounded Reason

- Completed governance steps 1–9.
- Previously closed workstreams (`/cards`, `/pricing`, blog, AI, SEO, typography).
- Destructive index cleanups without operational trigger.
- Consent backfill without explicit product/compliance decision.

---

_Last updated: 2026-03-28 (Steps 10–13 added)_

---

## 2026-04 Addendum — PASSWORD_POLICY_V1 Closure

Contour: REGISTER_PASSWORD_POLICY_HARDENING_TASK_1 through TASK_5.5 (closed 2026-04-29)

### Context

Step 8 of the March 2026 cycle recorded "Password minimum length (8 chars) enforcement added to /auth/reset, /account/change-password, /invites/accept." That was a correct description of the state at cycle-close. The current addendum documents the subsequent upgrade to a full complexity policy.

### What changed

The password enforcement model was upgraded from minimum-length-only (8 chars, no complexity) to PASSWORD_POLICY_V1, a full 9-rule complexity policy enforced consistently across all password-creation and password-change routes.

Old state: min-length = 8, no complexity, single legacy WEAK_PASSWORD code for short passwords.
New state: PASSWORD_POLICY_V1 — 9 rules, 9 distinct machine-readable codes.

WEAK_PASSWORD is retired. It no longer exists as an active backend error code.

### PASSWORD_POLICY_V1 rules

1. Non-empty string
2. minLength = 8
3. maxLength = 72 (bcrypt truncation guard)
4. No whitespace
5. Printable ASCII only (charCodes 33–126; rejects Hebrew, Cyrillic, emoji)
6. Lowercase English letter required
7. Uppercase English letter required
8. Digit required
9. Symbol required (printable non-alphanumeric ASCII)

### SSoT files

Backend: backend/src/utils/passwordPolicy.js
Frontend: frontend/src/utils/passwordPolicy.js

Both files are frozen-constant exports with identical validation logic and deterministic early-return order.

### Backend routes covered

/auth/register — full policy validation, PASSWORD*\* code returned on failure
/auth/signup-consume — full policy validation, PASSWORD*_ code returned on failure
/auth/reset — full policy validation, token NOT consumed on failure
/invites/accept — boolean gate only; invalid password returns 404/notFound (anti-enumeration preserved, no PASSWORD\__ code returned)
/account/change-password — applies to newPassword only; currentPassword is credential verification only

### Frontend surfaces covered

Register.jsx — validatePasswordPolicy + checklist + helper text + backend PASSWORD*\* mapping
ResetPassword.jsx — validatePasswordPolicy + checklist + helper text + backend PASSWORD*_ mapping
SignupConsume.jsx — validatePasswordPolicy + checklist + helper text + backend PASSWORD\__ mapping
InviteAccept.jsx — client-side validation for new-user flow only; no PASSWORD\_\* mapping in catch (anti-enumeration)
SettingsPanel.jsx change-password — validatePasswordPolicy(pwNew) only; currentPassword not policy-validated

### Canonical exceptions (must not be changed without architecture review)

Login exception: /login must NOT apply password policy. bcrypt.compare is unconditional.
InviteAccept anti-enumeration: backend returns 404 on invalid password, not PASSWORD*\* codes. Frontend does not map PASSWORD*\* in InviteAccept catch.
SettingsPanel currentPassword exception: currentPassword is credential verification only. Wrong currentPassword returns generic form-level error.

### Verification gates completed

All frontend gates passed EXIT:0 for each surface (TASK 5.2C, 5.3C, 5.4C, 5.5C):
check:inline-styles EXIT:0
check:skins EXIT:0
check:contract EXIT:0
build EXIT:0
backend sanity-imports covers passwordPolicy SSoT (confirmed EXIT:0).

### Docs updated

docs/api-security.md §5 — rewritten to full PASSWORD*POLICY_V1 spec; WEAK_PASSWORD retired; route coverage table added.
docs/runbooks/auth-forgot-reset-runbook.md — reset validation section updated from WEAK_PASSWORD to PASSWORD*\* pattern.
docs/handoffs/current/Cardigo_Enterprise_Handoff_PasswordPolicy_V1_Closed_2026-04-29.md — created.

### Verdict

CLOSED / PASS
