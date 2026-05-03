# POLICY_ADMIN_DELETE_LIFECYCLE_V1

**Status:** IMPLEMENTED — all primary lifecycle contours closed as of 2026-04-26.  
**Version:** V1  
**Date:** 2026-04-26  
**Scope:** Platform admin hard-delete, self-delete account, admin subscription revoke — when billing/STO/provider artifacts may exist.  
**Tier:** Tier 1 — Product / Security Canon (see `.github/copilot-instructions.md` §2)

> **Implementation status as of 2026-04-26 — all primary admin/self-delete lifecycle contours are CLOSED:**
>
> - **PROVIDER_CANCELLATION_BEFORE_DELETE_OR_REVOKE** — CLOSED
> - **LOCAL_AUTH_JOB_CLEANUP** — CLOSED
> - **AI_USAGE_DELETE_CASCADE** — CLOSED
> - **ADMIN_AUDIT_RELIABILITY** — CLOSED
> - **SANITY_ADMIN_USER_DELETE_EXPANSION** — CLOSED with live CI destructive sanity PASS
>
> The "Current Implementation Warning" section (§12) and the Implementation Roadmap (§14) have been updated to reflect these closures.
> For the operator-facing sequence, sanity coverage, and verification checklist, see `docs/runbooks/admin-user-delete-lifecycle.md`.

> **Relationship to existing policies:**
>
> - `docs/policies/POLICY_RETENTION_V1.md` governs automated _inactivity-based_ deletion (B1/B2/B3 waves). That policy is separate and closed.
> - This document governs _operator-initiated and user-initiated hard deletion_ where a paid billing artifact (Tranzila token / STO) may be active.
> - Where the two policies conflict on shared entities (e.g., `PaymentTransaction` retention), this document defers to `POLICY_RETENTION_V1.md §1.3` (financial records are never deleted).

---

## 0. Executive Summary

The Phase 1 audit (2026-04-26) identified three gaps:

1. `POST /api/admin/users/:id/delete` hard-deleted a user without cancelling an active Tranzila STO and without cleaning auth/job/AI records.
2. `POST /api/account/delete-account` self-deleted without cancelling an active Tranzila STO.
3. `POST /api/admin/users/:id/subscription/revoke` downgraded a subscription without cancelling an active Tranzila STO.

**As of 2026-04-26 all three gaps are closed.** All five implementation contours listed above have been verified by a live CI destructive sanity (`backend-admin-sanity.yml` against `MONGO_URI_DRIFT_CHECK`).

This policy documents the finalized lifecycle and the accepted product decisions that govern these three flows.

---

## 1. Scope

This policy applies to:

| Trigger                            | Entry point                                     |
| ---------------------------------- | ----------------------------------------------- |
| Platform admin hard-deletes a user | `POST /api/admin/users/:id/delete`              |
| User self-deletes account          | `POST /api/account/delete-account`              |
| Admin revokes user subscription    | `POST /api/admin/users/:id/subscription/revoke` |

This policy does NOT apply to:

- Automated inactivity-based deletion (B1/B2/B3) — governed by `POLICY_RETENTION_V1.md`. B1/B2 users are exempted if they have any paid transaction; they cannot have an active STO.
- Anonymous card cleanup — governed by `docs/runbooks/anon-card-cleanup.md`. Anonymous cards have no user account and no billing.
- Trial/premium data field purge after downgrade — governed by `docs/runbooks/trial-lifecycle-ssot.md §9`.

---

## 2. Core P0 Invariant

> **A user must not be locally hard-deleted while an active provider-side STO recurring billing schedule can continue charging.**

This invariant has no exceptions. It applies equally to:

- Admin-initiated delete
- User self-initiated delete
- Admin subscription revoke (which, if it does not cancel the STO, leaves the provider able to re-activate the subscription via the next STO-notify webhook)

Violation of this invariant constitutes a financial liability: the customer is charged after their account is deleted, with no recourse path in the local system.

---

## 3. Provider Cancellation Policy

### 3.1 Pre-condition check

Before any delete or subscription revoke operation, the system must evaluate the user's STO state:

| `tranzilaSto.status` | `tranzilaSto.stoId` present? | Pre-delete action required                                                                                                            |
| -------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `null` / absent      | —                            | None — proceed with delete                                                                                                            |
| `"cancelled"`        | Any                          | None — STO already inactive, proceed                                                                                                  |
| `"failed"`           | No stoId                     | None — provider never confirmed creation, proceed                                                                                     |
| `"pending"`          | Any                          | Attempt cancellation. If provider confirms inactive or no-STO, proceed. If provider returns error, block and require operator action. |
| `"created"`          | Yes                          | **Mandatory**: attempt provider cancellation before proceeding                                                                        |

### 3.2 Cancellation order of operations

```
1. Evaluate STO state (check tranzilaSto.status + stoId).
2. If cancellation required:
   a. Call cancelTranzilaStoForUser(user, { source, reason }).
   b. If result.ok === true OR result.skipped === true → STO is inactive. Proceed.
   c. If result.ok === false → STOP. Return error to caller. Do NOT proceed with local deletion.
3. If no cancellation required → proceed to local cascade.
```

### 3.3 Blocking policy on cancellation failure

Provider cancellation failure **blocks** local deletion. This is the hard-block policy.

Rationale:

- `cancelTranzilaStoForUser` is idempotent and never throws — it returns a normalized `{ ok, skipped?, reason? }` result.
- A failure means the provider could not be reached, the STO ID was rejected, or an unexpected error occurred.
- In all failure cases, the provider-side schedule may still be active.
- Local deletion while the schedule is active creates an unrecoverable financial liability.
- The correct operator action is to retry, investigate the Tranzila portal, and only delete after confirming provider-side inactivity.

### 3.4 Alternative approaches considered and rejected

| Alternative                                           | Reason rejected                                                                                     |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Delete locally and enqueue background cancellation    | If the job fails silently or the queue is unavailable, billing continues indefinitely with no alert |
| Delete locally and mark a "pending cancellation" flag | Flag may never be processed; creates zombie cancellation state; same liability                      |
| Retry cancellation up to N times, then proceed        | Proceeding after N retries still leaves the liability; unacceptable for financial correctness       |

### 3.5 Operator action when cancellation blocks

When `cancelTranzilaStoForUser` returns `ok: false`, the blocking error must surface to the admin UI. The operator must:

1. Check the Tranzila operator portal for the STO status.
2. If STO is already inactive at provider, update `user.tranzilaSto.status = "cancelled"` via the operator console (idempotency: the next delete call will see already-cancelled and skip).
3. If STO is active, cancel it via the Tranzila portal or via `npm run sto:cancel:execute` (see [backend/scripts/sto-cancel.mjs](../../backend/scripts/sto-cancel.mjs)).
4. Retry the delete operation.

---

## 4. Admin Subscription Revoke Policy

**Status: CLOSED.** Contour `PROVIDER_CANCELLATION_BEFORE_DELETE_OR_REVOKE` closed 2026-04-26. Contour `ADMIN_REVOKE_TOKEN_CLEAR_P1` closed 2026-05-03.

`adminRevokeUserSubscription` is provider/STO-first. It calls `cancelTranzilaStoForUser(existing, { source: "admin_revoke" })` before any local write. If provider cancellation fails (`!stoResult.ok && !stoResult.skipped`), revoke returns 409 `STO_CANCEL_REQUIRED` and no local writes occur. If STO is already cancelled, absent, or safely skipped, execution proceeds.

After safe STO cancellation/skip, a single atomic `User.findByIdAndUpdate` performs:

- `plan = "free"`
- `subscription.status = "inactive"`, `subscription.expiresAt = null`, `subscription.provider = "admin"`
- `tranzilaToken = null`
- `tranzilaTokenMeta.expMonth = null`
- `tranzilaTokenMeta.expYear = null`

The token clear is local DB only. No provider-side token invalidation. `PaymentTransaction` and `Receipt` are retained. No YeshInvoice document, Mailjet email, payment, or refund is created. After revoke, `token_missing` gate blocks resume-auto-renewal.

> **Contrast with cancel-renewal:** Self-service cancel-renewal intentionally retains `tranzilaToken` so the user can resume auto-renewal. Admin revoke clears the token because the subscription is being revoked by the platform.

---

## 5. Self-Delete Policy

The `POST /api/account/delete-account` flow currently creates an email tombstone (`DeletedEmailBlock`) and hard-deletes the user and all associated data, but does not cancel an active Tranzila STO.

### 5.1 Target policy

- Before performing local cascade, self-delete must evaluate the STO state and apply the same cancellation rule as admin delete (§3.1–§3.3).
- If STO cancellation fails, the self-delete operation must not proceed with local deletion.
- The user-facing error response must be generic and support-safe: it must not surface provider names, provider error codes, STO identifiers, or any financial provider details.
- Recommended user-facing message: a key such as `"self_delete_billing_cancel_failed"` resolved on the frontend to a message like "We could not complete your account deletion. Please contact support."

---

## 6. Tombstone Policy

### 6.1 Current state

`POST /api/account/delete-account` creates a `DeletedEmailBlock` tombstone.  
`POST /api/admin/users/:id/delete` does NOT create a tombstone (deferred as of `docs/api-security.md:599`).

### 6.2 Accepted product decision (2026-04-26)

**Admin hard delete must NOT create a `DeletedEmailBlock` tombstone.**

Rationale: platform admin authority is not equivalent to a finality/re-registration block. An admin delete is an operator-initiated action, not a self-initiated finality event. Tombstone-blocking re-registration on every admin delete would be an over-reach relative to admin intent.

**Self-delete DOES create a `DeletedEmailBlock` tombstone** (tombstone-first, before any cascade). This behavior is unchanged.

Tombstone must NOT be applied in automated inactivity cleanup (B1/B2/B3) — see `POLICY_RETENTION_V1.md §1.1`. This policy does not change that rule.

### 6.3 Tombstone-first ordering (self-delete only)

Self-delete creates the tombstone before any cascade destruction begins (`account.routes.js`). This ordering is preserved. Admin delete has no tombstone step.

---

## 7. Cascade Cleanup Policy

The following is the target cascade for all three covered operations (admin delete, self-delete, admin subscription revoke where applicable).

### 7.1 Required deletions (target state)

| Entity                        | Target action                         | Notes                                                                                               |
| ----------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Cards owned by user           | **DELETE**                            | Storage-first: Supabase objects deleted before Mongo document                                       |
| Supabase storage objects      | **DELETE**                            | Storage deletion blocks DB deletion for affected card                                               |
| Leads (per card)              | **DELETE**                            | Via `deleteCardCascade`                                                                             |
| Bookings (per card)           | **DELETE**                            | Via `deleteCardCascade`; see §9 for customer data caveat                                            |
| CardAnalyticsDaily (per card) | **DELETE**                            | Via `deleteCardCascade`                                                                             |
| OrganizationMember            | **DELETE**                            | All memberships for deleted user                                                                    |
| OrgInvite (pending, by user)  | **DELETE**                            | Operational garbage only; used/revoked/accepted invites retained                                    |
| PasswordReset                 | **DELETE**                            | All tokens for deleted user — security hygiene                                                      |
| ActivePasswordReset           | **DELETE**                            | All tokens for deleted user — security hygiene                                                      |
| MailJob (pending)             | **DELETE**                            | Cancel/delete all pending/processing jobs before user delete; prevents post-deletion email delivery |
| AiUsageMonthly                | **DELETE**                            | See §7.2                                                                                            |
| EmailSignupToken              | **DELETE**                            | Good hygiene; email-based but references deleted user's email                                       |
| Tranzila STO                  | **CANCEL at provider** (precondition) | Must be cancelled before local delete, per §3                                                       |
| User document                 | **DELETE**                            | Last step after all cascade and provider cancellation                                               |

### 7.2 AiUsageMonthly decision

**Policy recommendation:** Delete `AiUsageMonthly` records on hard user deletion.

Rationale: These records reference `userId` directly. They represent the deleted user's personal AI usage history. They have no standalone legal/fiscal value. If anonymized aggregate AI usage statistics are ever needed for product analytics, they should be aggregated at query-time from retained data or derived from a separate anonymized table — not kept as orphaned user-level records indefinitely.

If the product team decides that anonymized AI usage aggregates are needed long-term, an explicit anonymization step (replace `userId` with a non-reversible aggregate key) must be designed before this policy goes into effect. Until then, delete on user deletion.

### 7.3 Retention (do not delete)

| Entity             | Target action          | Notes                                                              |
| ------------------ | ---------------------- | ------------------------------------------------------------------ |
| DeletedEmailBlock  | **RETAIN** (or create) | Protective tombstone                                               |
| MarketingOptout    | **RETAIN**             | Protective suppression; prevents re-send if email is re-registered |
| PaymentIntent      | **RETAIN until TTL**   | TTL index handles lifecycle; no intervention needed                |
| PaymentTransaction | **MUST RETAIN**        | See §8                                                             |
| Receipt            | **MUST RETAIN**        | See §8                                                             |
| AdminAudit         | **MUST RETAIN**        | See §8                                                             |
| OrgInviteAudit     | **RETAIN**             | See §8                                                             |

---

## 8. Legal / Audit Retention Policy

The following rules apply to all three covered operations and may not be overridden by individual scripts or route handlers.

### 8.1 Financial records

`PaymentTransaction` and `Receipt` records **must not be deleted** as part of any user deletion flow (admin delete, self-delete, inactivity cleanup, or any other automated or operator-initiated path).

- `PaymentTransaction.userId` may become an orphaned ObjectId reference after user deletion. This is an acceptable and documented trade-off per `POLICY_RETENTION_V1.md §1.3`.
- `Receipt.userId` same rule applies.
- YeshInvoice-issued documents are permanent artifacts at the provider. Cardigo has no deletion API for them. They must remain.
- PII appearing inside fiscal record snapshots (e.g., `Receipt.recipientSnapshot.email`, `Receipt.recipientSnapshot.name`) is retained as part of the fiscal record, not as an active app-profile. This is standard practice for tax/accounting records.

> **Legal note:** The specific retention period for Israeli financial records and VAT receipts must be confirmed with a licensed accountant or legal counsel. This policy assumes a minimum of 7 years, which is a commonly cited figure under Israeli tax law, but does not constitute legal advice. Any changes to this retention period require explicit sign-off from the company's accountant or legal representative.

### 8.2 Audit trail

`AdminAudit` records must be retained permanently. They must not be deleted, anonymized, or overwritten. An `AdminAudit` entry with `action: "USER_DELETE_PERMANENT"` must be created for every successful admin hard delete.

**Audit creation ordering:** The audit record must be created only after all cascade operations have succeeded. If the audit write fails, the failure must be logged with sufficient context (adminUserId, targetUserId, timestamp) to allow manual reconstruction. The audit write failure must not silently succeed — it should be surfaced to the admin caller as a non-fatal warning, or alternatively, an audit intent record should be written before the cascade begins and updated on completion.

### 8.3 OrgInviteAudit

Retained. If a future privacy/anonymization policy requires scrubbing `actorUserId` from audit records after a retention window, that must be designed as a separate explicit policy document and implemented as a separate migration. This document does not approve that scrubbing.

---

## 9. Leads and Bookings Policy

### 9.1 Current behavior

Leads and bookings are hard-deleted via `deleteCardCascade` when a card is deleted.

### 9.2 Classification

Leads and bookings contain **customer-submitted data**: name, phone, email (for leads); name, phone, appointment time (for bookings). The user (card owner) is the data processor; Cardigo is the sub-processor.

### 9.3 Target policy

**Policy recommendation: delete with card (current behavior is maintained) unless product/legal explicitly decides otherwise.**

Rationale: The customer submitted their data to the card owner's contact form or booking widget. When the card owner's account is deleted, the processing relationship ends. Retaining the data beyond deletion in Cardigo's database without a legal basis or the card owner's ability to manage it would be more problematic than deletion.

**Decision required from product/legal:** Whether a customer data export or notification mechanism should be offered before card deletion proceeds. If yes, a grace period and export flow must be designed.

Until that decision is made, current behavior (delete with card cascade) stands.

---

## 10. Sole Org Admin Policy

### 10.1 Current gap

The self-delete endpoint (`POST /api/account/delete-account`) checks whether the user is the sole admin of any organization and blocks deletion if true. The admin hard-delete endpoint (`POST /api/admin/users/:id/delete`) does NOT perform this check.

### 10.2 Accepted product decision (2026-04-26)

**Admin hard delete must NOT be blocked by sole-org-admin state.**

Rationale: platform admin authority supersedes org governance for this operation. The platform admin is performing an operator-level action and is responsible for handling any resulting org state downstream. Blocking the delete would prevent legitimate operator recovery scenarios.

**Self-delete DOES keep the sole-org-admin guard** (`SOLE_ORG_ADMIN` — 409 response). This behavior is unchanged.

Org state after admin delete of a sole org admin is an operational concern to be handled by the platform admin.

---

## 11. Failure-Mode Policy

### 11.1 Provider cancellation failure

**Blocks delete/revoke.** No local deletion proceeds. Error is returned to caller. Operator must investigate and retry. See §3.3 and §3.5.

### 11.2 Storage deletion failure

**Blocks DB deletion for the affected card.** Current implementation is correct per `admin.controller.js` CRITICAL comment. The Mongo document is retained so that the cleanup can be retried. This behavior must be preserved.

Multi-card partial state: if user has N cards and card K fails storage deletion, cards 1..K-1 have already been deleted. This is an acceptable trade-off given that Supabase storage failures are expected to be transient. The user document is not deleted if any card fails. The operator can retry the delete after resolving the storage issue.

### 11.3 MailJob / token cleanup failure

Mail job and auth token cleanup must be included in the local cascade before the user document is deleted. If any of these writes fail, they must not silently pass — the failure must be logged. The recommended behavior is: treat MailJob and token cleanup failures as non-fatal-but-logged, and proceed with user deletion if storage/cascade of cards has succeeded. The rationale: a stale auth token for a deleted user is lower risk than leaving a user document in a partially-deleted state.

However, pending MailJobs must always be cancelled/deleted BEFORE the user document is deleted, because the mail worker queries by `userId` — a race condition exists where the worker can pick up a pending job and fire an email between the user delete and the job delete if the order is reversed.

**Order:** 1) Delete MailJobs → 2) Delete auth tokens → 3) Delete user document.

### 11.4 Audit log failure

The audit record must be created after all cascade operations succeed. If the audit write fails:

- The failure must be logged with full context (adminUserId, targetUserId, action, timestamp) to allow manual reconstruction.
- The operation is considered complete (user and data have been deleted successfully).
- The audit failure must be surfaced to the admin caller in the response (e.g., `{ ok: true, auditWriteFailed: true }`) so it can be escalated.
- The audit failure must NOT cause the entire delete to be considered failed or trigger a rollback of already-completed deletions.

### 11.5 Idempotency

All three covered operations must be idempotent:

- If the user document no longer exists when delete is called → return 404 (not an error to retry).
- If the STO is already cancelled when cancellation is attempted → `cancelTranzilaStoForUser` returns `{ ok: true, skipped: true }` → proceed.
- If a card no longer exists when its cascade is attempted → skip, do not error.

The operation is NOT idempotent across partial-deletion states by design (some cards deleted, user retained). Operators must retry the full delete after resolving the blocking cause.

---

## 12. Implementation Status

> **Implementation status as of 2026-04-26: all primary admin/self-delete lifecycle contours listed in §0 are CLOSED.**

| Contour                                       | Status                                      | Date Closed |
| --------------------------------------------- | ------------------------------------------- | ----------- |
| PROVIDER_CANCELLATION_BEFORE_DELETE_OR_REVOKE | ✅ CLOSED                                   | 2026-04-26  |
| LOCAL_AUTH_JOB_CLEANUP                        | ✅ CLOSED                                   | 2026-04-26  |
| AI_USAGE_DELETE_CASCADE                       | ✅ CLOSED                                   | 2026-04-26  |
| ADMIN_AUDIT_RELIABILITY                       | ✅ CLOSED                                   | 2026-04-26  |
| SANITY_ADMIN_USER_DELETE_EXPANSION            | ✅ CLOSED — live CI destructive sanity PASS | 2026-04-26  |

All three flows are production-safe for users with an active Tranzila STO. The temporary operator manual-cancel rule is no longer required — `cancelTranzilaStoForUser` is now called automatically as a hard precondition in all three flows.

For operator verification procedures, see `docs/runbooks/admin-user-delete-lifecycle.md §11–§13`.

---

## 13. Data Classification Table

| Data Type                    | Collection / Service   | Phase 1 Current Behavior                                                                                     | Target Policy                                                      | Action                                                                     | Rationale                                                                           | Needs Product/Legal Decision?                                                           |
| ---------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| User document                | `users`                | DELETED                                                                                                      | DELETED                                                            | Hard delete — last step after cascade                                      | Core entity                                                                         | No                                                                                      |
| Cards                        | `cards`                | DELETED (storage-first)                                                                                      | DELETED (storage-first)                                            | Same — preserve ordering                                                   | User data                                                                           | No                                                                                      |
| Supabase storage objects     | Supabase Storage       | DELETED (blocks DB delete)                                                                                   | DELETED (blocks DB delete)                                         | Same — preserve blocking semantics                                         | User-uploaded media                                                                 | No                                                                                      |
| Leads                        | `leads`                | DELETED via card cascade                                                                                     | DELETED via card cascade                                           | Maintain; review per §9                                                    | Customer-submitted; processing ends with account                                    | **Yes — export/grace period?**                                                          |
| Bookings                     | `bookings`             | DELETED via card cascade                                                                                     | DELETED via card cascade                                           | Maintain; review per §9                                                    | Customer-submitted appointment data                                                 | **Yes — export/grace period?**                                                          |
| CardAnalyticsDaily           | `cardanalyticsdailys`  | DELETED via card cascade                                                                                     | DELETED via card cascade                                           | Maintain                                                                   | No standalone value after card deleted                                              | No                                                                                      |
| SiteAnalyticsVisit           | `siteanalyticsvisits`  | RETAINED (no userId, TTL 90d)                                                                                | RETAIN (TTL)                                                       | No action needed                                                           | No userId link; hash-only identity; TTL handles                                     | No                                                                                      |
| SiteAnalyticsDaily           | `siteanalyticsdailys`  | RETAINED (no userId, TTL 365d)                                                                               | RETAIN (TTL)                                                       | No action needed                                                           | No userId link; aggregate only                                                      | No                                                                                      |
| AiUsageMonthly               | `aiusagemonthlys`      | **DELETED on user deletion** (AI_USAGE_DELETE_CASCADE closed 2026-04-26)                                     | **DELETE on user deletion**                                        | Already implemented                                                        | Personal usage history; no fiscal value; see §7.2                                   | **Yes — if product needs anonymized aggregates**                                        |
| PasswordReset                | `passwordresets`       | **DELETED** (LOCAL_AUTH_JOB_CLEANUP closed 2026-04-26)                                                       | DELETE                                                             | Already implemented                                                        | Security hygiene; stale tokens for non-existent user                                | No                                                                                      |
| ActivePasswordReset          | `activepasswordresets` | **DELETED** (LOCAL_AUTH_JOB_CLEANUP closed 2026-04-26)                                                       | DELETE                                                             | Already implemented                                                        | Security hygiene                                                                    | No                                                                                      |
| EmailSignupToken             | `emailsignuptokens`    | **DELETED** by emailNormalized (LOCAL_AUTH_JOB_CLEANUP closed 2026-04-26)                                    | DELETE                                                             | Already implemented (both admin and self-delete paths)                     | Hygiene; email-based reference                                                      | No                                                                                      |
| MailJob                      | `mailjobs`             | **DELETED before User.deleteOne** in admin delete and self-delete (LOCAL_AUTH_JOB_CLEANUP closed 2026-04-26) | DELETE before user doc                                             | Already implemented; ordering enforced                                     | Prevents post-deletion email delivery                                               | No                                                                                      |
| DeletedEmailBlock            | `deletedemailblocks`   | CREATED by self-delete; NOT by admin delete                                                                  | **MUST NOT CREATE on admin delete. CREATE/RETAIN on self-delete.** | No action on admin delete (product decision 2026-04-26, see §6.2)          | Platform admin authority is not a finality event; product decision closed           | No — product decision locked                                                            |
| MarketingOptout              | `marketingoptouts`     | NOT TOUCHED                                                                                                  | RETAIN                                                             | No deletion                                                                | Protective suppression artifact                                                     | No                                                                                      |
| PaymentIntent                | `paymentintents`       | RETAINED (TTL index)                                                                                         | RETAIN until TTL                                                   | No action needed                                                           | TTL-managed; no PII exposure concern                                                | No                                                                                      |
| PaymentTransaction           | `paymenttransactions`  | RETAINED INTENTIONALLY                                                                                       | **MUST RETAIN**                                                    | Never delete                                                               | Israeli financial law; orphaned userId acceptable per `POLICY_RETENTION_V1.md §1.3` | **Yes — confirm retention period with accountant/legal**                                |
| Receipt                      | `receipts`             | RETAINED INTENTIONALLY                                                                                       | **MUST RETAIN**                                                    | Never delete                                                               | Fiscal record; YeshInvoice-issued                                                   | **Yes — confirm retention period with accountant/legal**                                |
| YeshInvoice provider doc     | YeshInvoice API        | RETAINED at provider (no delete API)                                                                         | **MUST RETAIN at provider**                                        | No action (no deletion capability)                                         | Permanent fiscal artifact at provider                                               | No                                                                                      |
| Tranzila STO (provider side) | Tranzila API           | **CANCELLED as hard precondition** (PROVIDER_CANCELLATION_BEFORE_DELETE_OR_REVOKE closed 2026-04-26)         | **CANCEL before local delete/revoke**                              | Already implemented — `cancelTranzilaStoForUser` called in all three flows | Core P0 invariant; see §2–§3                                                        | No                                                                                      |
| Tranzila token (local field) | `users.tranzilaToken`  | DELETED with user doc                                                                                        | DELETED with user doc                                              | Implicit — part of user document                                           | No standalone value after user deleted; provider retains its own token record       | No                                                                                      |
| AdminAudit                   | `adminaudits`          | RETAINED + `USER_DELETE_PERMANENT` created on successful admin delete                                        | **MUST RETAIN** + create on delete                                 | Already implemented (ADMIN_AUDIT_RELIABILITY closed 2026-04-26)            | Legal/audit trail                                                                   | No                                                                                      |
| OrgInviteAudit               | `orginviteaudits`      | RETAINED                                                                                                     | RETAIN                                                             | No deletion                                                                | Audit trail for accepted invites                                                    | **Yes — anonymize actorUserId after retention window? Separate future policy required** |
| OrganizationMember           | `organizationmembers`  | DELETED                                                                                                      | DELETED                                                            | Maintain                                                                   | User-membership binding; org persists independently                                 | No                                                                                      |
| OrgInvite (pending)          | `orginvites`           | DELETED (pending only)                                                                                       | DELETED (pending only)                                             | Maintain                                                                   | Operational garbage only                                                            | No                                                                                      |

---

## 14. Implementation Roadmap

### ✅ Contour A — Provider Cancellation Integration — CLOSED 2026-04-26

**Contour:** PROVIDER_CANCELLATION_BEFORE_DELETE_OR_REVOKE  
**Status:** CLOSED. `cancelTranzilaStoForUser` is called as a hard precondition in `deleteUserPermanently` (`source: "admin_delete"`), `POST /delete-account` (`source: "self_delete"`), and `adminRevokeUserSubscription` (`source: "admin_revoke"`). All three flows block on `!stoResult.ok && !stoResult.skipped`.

### ✅ Contour B — Cascade Cleanup Gaps — CLOSED 2026-04-26

**Contour:** LOCAL_AUTH_JOB_CLEANUP + AI_USAGE_DELETE_CASCADE  
**Status:** CLOSED. `PasswordReset`, `ActivePasswordReset`, `MailJob`, `EmailVerificationToken`, `EmailSignupToken`, `AiUsageMonthly` are now deleted before `User.deleteOne` in both admin delete and self-delete.

**Intentionally NOT implemented (product decisions 2026-04-26):**

- ~~Add sole-org-admin guard to admin delete~~ → **REJECTED** — platform admin authority supersedes org governance (see §10.2)
- ~~Add tombstone creation to admin delete~~ → **REJECTED** — admin delete must NOT create DeletedEmailBlock (see §6.2)

### ✅ Contour E — Tests / Sanity — CLOSED 2026-04-26

**Contour:** SANITY_ADMIN_USER_DELETE_EXPANSION  
**Status:** CLOSED with live CI destructive sanity PASS. `sanity-admin-user-delete.mjs` now verifies: admin delete endpoint, User deleted, Card deleted, Supabase paths not found, PasswordReset/ActivePasswordReset/EmailVerificationToken/EmailSignupToken/MailJob/AiUsageMonthly deleted, DeletedEmailBlock NOT created, `AdminAudit USER_DELETE_PERMANENT` written. See `docs/runbooks/admin-user-delete-lifecycle.md §11`.

**Note:** STO pre-cancel CI assertion (mock STO state) and org fixture/leads/bookings/card analytics cascade assertions remain deferred tails. See `docs/runbooks/admin-user-delete-lifecycle.md §14`.

### Contour C — Transaction / Idempotency Helper (P2 — deferred)

**Goal:** Introduce a structured multi-card deletion helper that tracks per-card completion state, enabling safe retry without re-deleting already-cleaned cards.  
**Dependencies:** Contours A+B complete (done).  
**Files:** New utility, `backend/src/controllers/admin.controller.js`  
**Risks:** Complexity. Without Mongo transactions, true atomicity is not achievable; focus on correct retry semantics and audit-friendly state.

### Contour D — Admin UI Confirmation (P2 — deferred)

**Goal:** Admin panel surfaces active STO status before presenting delete/revoke option. Requires operator acknowledgment when STO is active. Surfaces STO cancellation as a first-class step.  
**Dependencies:** Contour A complete (done).  
**Files:** Frontend admin components.

### ✅ Contour F — Docs / Runbooks — CLOSED 2026-04-26

**Status:** CLOSED. `docs/runbooks/admin-user-delete-lifecycle.md` created covering all operator-facing sequences, data matrix, failure modes, CI coverage, and verification checklist. `docs/runbooks/billing-flow-ssot.md` updated with cross-reference.

### Contour G — Rollout (deferred)

**Goal:** Stage deployment with a real STO-enabled test user (mock STO, no real payment). Production rollout with operator on standby.  
**Dependencies:** All primary contours complete (done).  
**Pre-rollout operator action:** Run `classify:retention:dry-run` to identify all users with `tranzilaSto.status = "created"`. For each, confirm Tranzila portal shows active STO. Prepare operator runbook entry.  
**Rollback:** Revert Contour A/B changes. Fall back to manual `sto-cancel.mjs` workflow.

---

## 15. Settled Decisions (2026-04-26)

All primary decisions previously listed as "open" have been settled by architect/product as of 2026-04-26.

| #   | Decision                                                               | Outcome (2026-04-26)                                                                           |
| --- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| D1  | STO cancellation hard-block vs. enqueue-and-proceed                    | **Hard-block** — `cancelTranzilaStoForUser` blocks all three flows on failure                  |
| D2  | Tombstone creation on admin hard delete                                | **NOT created** — admin delete must NOT create DeletedEmailBlock (see §6.2)                    |
| D3  | Leads/bookings: immediate delete vs. export grace period               | **Deferred tail** — not implemented; see `docs/runbooks/admin-user-delete-lifecycle.md §14`    |
| D4  | AiUsageMonthly: delete immediately vs. anonymized aggregate retention  | **Delete** — AI_USAGE_DELETE_CASCADE CLOSED                                                    |
| D5  | Sole-org-admin guard on admin delete                                   | **NOT blocked** — admin delete must NOT check sole-org state (see §10.2)                       |
| D6  | PaymentTransaction / Receipt retention period (years)                  | **Retain indefinitely** (defers to `POLICY_RETENTION_V1.md §1.3`); legal confirmation deferred |
| D7  | OrgInviteAudit: retain-forever vs. anonymize actorUserId after N years | **Retain** for now; future anonymization policy separate                                       |
| D8  | Audit log failure: surface warning vs. block and rollback              | **Surface as warning** — `{ ok: true, deleted: true, auditWriteFailed: true }` (see §12)       |

---

## 16. Operator Runbook Cross-Reference

See `docs/runbooks/admin-user-delete-lifecycle.md` for:

- Step-by-step operator sequences (admin delete, self-delete, subscription revoke)
- Data deleted / retained / not-created matrices
- Failure modes and recovery procedures
- CI sanity coverage details (`backend-admin-sanity.yml`)
- Manual verification checklist for the 11 post-delete assertions
- Deferred / out-of-scope tails

---

_End of POLICY_ADMIN_DELETE_LIFECYCLE_V1_
