# Enterprise Governance & Hardening Cycle — March 2026

> **Tier 2 — Architecture / Ops Contract**
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

### Step 1 — Users / Auth Identity Live-Index Governance

**Scope:** Verify user/auth identity truth is backed by live DB indexes, not app logic alone.

**Outcome:** Migration script created and applied. Live indexes now include `users.email_1` (unique), `users.cardId_1` (unique sparse), and `tokenHash` unique indexes on all three auth token collections. Schema hardened (`User.email`: `trim: true`, `lowercase: true`).

**Verdict:** CLOSED / PASS

---

### Step 2 — Token Security / Org Invite Token Governance

**Scope:** Token-model governance and org invite token contour.

**Outcome:** Migration script for `orginvites`. Live indexes now include `tokenHash_1` (unique) and four query-shaped runtime indexes. `OrgInvite.model.js` aligned to governed set.

**Not touched:** `orginviteaudits`, TTL/cleanup policy.

**Verdict:** CLOSED / PASS WITH FOLLOW-UP (operational hygiene only, no correctness gap)

---

### Step 3 — Payment / Subscription / Transaction Governance

**Scope:** Ledger/idempotency/provider identity contour.

**Outcome:** No fix required. `PaymentTransaction.providerTxnId_1` unique already live. Idempotency backed by DB truth. Notify-path is source of truth.

**Verdict:** CLOSED / PASS

---

### Step 4 — Core Card / Public Content Governance

**Scope:** Core `Card` collection, public identity, slug governance, public/preview/OG/sitemap, anti-enumeration paths.

**Outcome:** No fix required. All 12 schema-declared indexes live and aligned. Partial unique slug indexes live. `publicPath`/`ogPath` computed server-side (not stale persisted truth).

**Verdict:** CLOSED / PASS

---

### Step 5 — Organizations / Membership / Org Public Identity

**Scope:** `organizations`, `organizationmembers`, org public routing, org membership/access truth.

**Outcome:** Migration script for `organizations`. Created `slug_1` unique index. Removed unjustified `isActive` schema index declaration. `organizationmembers` confirmed aligned.

**Verdict:** CLOSED / PASS

---

### Step 6 — Leads / Inbox / Contact Flows Governance

**Scope:** `Lead` model, inbox list queries, unread-count, mailbox tabs, live index support.

**Outcome:** Migration script for `leads`. Added `idx_leads_unread_count` runtime-shaped index. Removed unjustified schema-only declarations. `Lead.model.js` aligned to intentional governed set.

**Verdict:** CLOSED / PASS

---

### Step 7 — Analytics / Counters / Monthly Aggregates Governance

**Scope:** `AiUsageMonthly`, `CardAnalyticsDaily`, `SiteAnalyticsDaily` aggregate governance.

**Outcome:** No fix required. Identity truth correct everywhere (one-row-per-entity-per-period backed by live unique indexes). Only redundant/naming issues found — optimization debt, not correctness.

**Deferred:** Destructive index cleanup, naming cleanup, retention-policy redesign.

**Verdict:** CLOSED / PASS WITH FOLLOW-UP

---

### Step 8 — Auth / Registration / Token Lifecycle Runtime Hardening

**Scope:** Runtime/security correctness of all auth flows (register, login, forgot, reset, verify-email, resend-verification, signup-link, signup-consume, invite-accept, change-password).

**Outcome:**

- Password minimum length (8 chars) enforcement added to `/auth/reset`, `/account/change-password`, `/invites/accept`.
- `invite-accept` new-user branch now creates user with `isVerified: true` (invite token proves email ownership).

**Verdict:** CLOSED / PASS

---

### Step 9 — Consent / Terms / Privacy Truth Governance

**Scope:** Separate email-ownership truth from consent truth. Verify consent capture across all account-creation flows.

**Outcome:**

- `signup-consume` now captures and validates `consent === true` (UI checkbox → frontend validation → API payload → backend validation → DB persistence).
- `invite-accept` new-user branch now captures and validates consent (same full truth chain).
- Consent fields persisted: `termsAcceptedAt`, `privacyAcceptedAt`, `termsVersion`, `privacyVersion`.
- Version SSoT: `backend/src/utils/consentVersions.js`.
- Existing-user invite branch unchanged — does not recollect consent.

**Deferred:** Retroactive consent backfill for legacy null-consent users, re-consent/version-bump flow, legal copy refinement.

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

- Token TTL indexes and cleanup policy for used/expired rows.
- Stale unverified users cleanup.

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

**Cycle status: completed and closed at enterprise governance level.**

---

## Do Not Reopen Without Bounded Reason

- Completed governance steps 1–9.
- Previously closed workstreams (`/cards`, `/pricing`, blog, AI, SEO, typography).
- Destructive index cleanups without operational trigger.
- Consent backfill without explicit product/compliance decision.

---

_Last updated: 2026-03-25_
