# POLICY_ADMIN_DELETE_LIFECYCLE_V1

**Status:** Proposed / Required Target. Supersedes ad-hoc deletion behavior.  
**Version:** V1  
**Date:** 2026-04-26  
**Scope:** Platform admin hard-delete, self-delete account, admin subscription revoke — when billing/STO/provider artifacts may exist.  
**Tier:** Tier 1 — Product / Security Canon (see `.github/copilot-instructions.md` §2)

> **Relationship to existing policies:**
>
> - `docs/policies/POLICY_RETENTION_V1.md` governs automated _inactivity-based_ deletion (B1/B2/B3 waves). That policy is separate and closed.
> - This document governs _operator-initiated and user-initiated hard deletion_ where a paid billing artifact (Tranzila token / STO) may be active.
> - Where the two policies conflict on shared entities (e.g., `PaymentTransaction` retention), this document defers to `POLICY_RETENTION_V1.md §1.3` (financial records are never deleted).

---

## 0. Executive Summary

The Phase 1 audit (2026-04-26) established that:

1. `POST /api/admin/users/:id/delete` hard-deletes a user and all their cards **without cancelling an active Tranzila STO**.
2. `POST /api/account/delete-account` self-deletes **without cancelling an active Tranzila STO**.
3. `POST /api/admin/users/:id/subscription/revoke` downgrades a subscription to free/inactive **without cancelling an active Tranzila STO**.

In all three cases, the provider-side recurring billing schedule survives user deletion. The STO continues charging the user's payment card on the Tranzila schedule, firing STO-notify webhooks for a user that no longer exists in the local database.

This policy defines the target lifecycle that these three flows must implement before being considered production-safe for paid users.

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

`adminRevokeUserSubscription` sets `plan = "free"` and `subscription.status = "inactive"`. This does NOT cancel the Tranzila STO.

### 4.1 Current gap

If an admin revokes a subscription while an STO is `"created"`, the STO-notify webhook will fire on the next renewal date and re-activate the subscription by writing a new `PaymentTransaction` with `status: "paid"` and updating `user.plan`, `user.subscription`, and `Card.billing`. The admin revoke is silently undone by the next renewal.

### 4.2 Target policy

- Admin subscription revoke for a user with `tranzilaSto.status = "created"` **must** call `cancelTranzilaStoForUser` before applying the local plan/subscription downgrade.
- If STO cancellation fails, the revoke operation must fail and return an actionable error.
- If STO is already cancelled or absent, the revoke proceeds immediately.

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

### 6.2 Target policy

Admin hard delete **should** create a `DeletedEmailBlock` tombstone unless the specific deletion reason is classified as "non-fraud / operator housekeeping" and the product explicitly decides re-registration should be permitted.

Default policy: tombstone is always created for admin hard delete.

Rationale:

- Without a tombstone, a deleted user can immediately re-register with the same email.
- If any billing artifacts (PaymentTransaction, Receipt) reference that email via `recipientSnapshot.email`, re-registration creates a new user whose email collides with historical fiscal records.
- Tombstone creation is write-once and uses HMAC-SHA256 with `EMAIL_BLOCK_SECRET`; no raw PII is stored in the tombstone record.

### 6.3 Tombstone-first ordering

When tombstone is added to admin delete, it must be created **before** any cascade destruction begins. This matches the existing self-delete ordering in [backend/src/routes/account.routes.js](../../backend/src/routes/account.routes.js).

Tombstone must NOT be applied in automated inactivity cleanup (B1/B2/B3) — see `POLICY_RETENTION_V1.md §1.1`. This policy does not change that rule.

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

### 10.2 Target policy

Admin hard delete must apply the same sole-org-admin guard as self-delete:

- Before cascade begins, check whether the target user is the sole `admin`-role member with `status: "active"` in any organization.
- If yes: block deletion and return an actionable error identifying which organization(s) are affected.
- The admin must first transfer org ownership (assign another admin member) or dissolve the org before the deletion can proceed.

This prevents permanently orphaned organizations with no admin.

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

## 12. Current Implementation Warning

> **⚠️ The following flows are NOT production-safe for users with an active Tranzila STO.**

| Flow                      | File                                                                                                        | Gap                                                              |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Admin hard delete         | [backend/src/controllers/admin.controller.js:644](../../backend/src/controllers/admin.controller.js#L644)   | No `cancelTranzilaStoForUser` call before user deletion          |
| Self-delete               | [backend/src/routes/account.routes.js](../../backend/src/routes/account.routes.js)                          | No `cancelTranzilaStoForUser` call before user deletion          |
| Admin subscription revoke | [backend/src/controllers/admin.controller.js:1388](../../backend/src/controllers/admin.controller.js#L1388) | No `cancelTranzilaStoForUser` call before subscription downgrade |

**Temporary operator rule (until implementation is complete):**

Before executing any of these operations on a user with `tranzilaSto.status = "created"`:

1. Run `npm run sto:cancel:dry-run` to verify the target user's STO state.
2. Run `npm run sto:cancel:execute --cancellation-reason="admin delete - pre-delete cancellation" --email=<user_email>` to cancel the STO at the provider.
3. Confirm the STO status has been updated to `"cancelled"` in the user document.
4. Proceed with the delete or revoke operation.

This manual step MUST NOT be skipped for users on `plan: "monthly"` or `plan: "yearly"` with `tranzilaSto.status = "created"`.

---

## 13. Data Classification Table

| Data Type                    | Collection / Service   | Phase 1 Current Behavior                      | Target Policy                      | Action                                            | Rationale                                                                           | Needs Product/Legal Decision?                                                           |
| ---------------------------- | ---------------------- | --------------------------------------------- | ---------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| User document                | `users`                | DELETED                                       | DELETED                            | Hard delete — last step after cascade             | Core entity                                                                         | No                                                                                      |
| Cards                        | `cards`                | DELETED (storage-first)                       | DELETED (storage-first)            | Same — preserve ordering                          | User data                                                                           | No                                                                                      |
| Supabase storage objects     | Supabase Storage       | DELETED (blocks DB delete)                    | DELETED (blocks DB delete)         | Same — preserve blocking semantics                | User-uploaded media                                                                 | No                                                                                      |
| Leads                        | `leads`                | DELETED via card cascade                      | DELETED via card cascade           | Maintain; review per §9                           | Customer-submitted; processing ends with account                                    | **Yes — export/grace period?**                                                          |
| Bookings                     | `bookings`             | DELETED via card cascade                      | DELETED via card cascade           | Maintain; review per §9                           | Customer-submitted appointment data                                                 | **Yes — export/grace period?**                                                          |
| CardAnalyticsDaily           | `cardanalyticsdailys`  | DELETED via card cascade                      | DELETED via card cascade           | Maintain                                          | No standalone value after card deleted                                              | No                                                                                      |
| SiteAnalyticsVisit           | `siteanalyticsvisits`  | RETAINED (no userId, TTL 90d)                 | RETAIN (TTL)                       | No action needed                                  | No userId link; hash-only identity; TTL handles                                     | No                                                                                      |
| SiteAnalyticsDaily           | `siteanalyticsdailys`  | RETAINED (no userId, TTL 365d)                | RETAIN (TTL)                       | No action needed                                  | No userId link; aggregate only                                                      | No                                                                                      |
| AiUsageMonthly               | `aiusagemonthlys`      | NOT TOUCHED (retained forever)                | **DELETE on user deletion**        | Add to cascade                                    | Personal usage history; no fiscal value; see §7.2                                   | **Yes — if product needs anonymized aggregates**                                        |
| PasswordReset                | `passwordresets`       | NOT TOUCHED (admin delete gap)                | DELETE                             | Add to admin delete cascade                       | Security hygiene; stale tokens for non-existent user                                | No                                                                                      |
| ActivePasswordReset          | `activepasswordresets` | NOT TOUCHED (admin delete gap)                | DELETE                             | Add to admin delete cascade                       | Security hygiene                                                                    | No                                                                                      |
| EmailSignupToken             | `emailsignuptokens`    | NOT TOUCHED                                   | DELETE                             | Add to cascade (both paths)                       | Good hygiene; email-based reference                                                 | No                                                                                      |
| MailJob                      | `mailjobs`             | NOT TOUCHED in admin delete; deleted in B1/B2 | DELETE before user doc             | Add to admin delete; enforce ordering (see §11.3) | May fire post-deletion without cancellation                                         | No                                                                                      |
| DeletedEmailBlock            | `deletedemailblocks`   | CREATED by self-delete; NOT by admin delete   | CREATE on admin delete (target)    | Add tombstone creation to admin delete            | Prevents re-registration ambiguity; see §6                                          | **Yes — product may want opt-out for specific admin delete reasons**                    |
| MarketingOptout              | `marketingoptouts`     | NOT TOUCHED                                   | RETAIN                             | No deletion                                       | Protective suppression artifact                                                     | No                                                                                      |
| PaymentIntent                | `paymentintents`       | RETAINED (TTL index)                          | RETAIN until TTL                   | No action needed                                  | TTL-managed; no PII exposure concern                                                | No                                                                                      |
| PaymentTransaction           | `paymenttransactions`  | RETAINED INTENTIONALLY                        | **MUST RETAIN**                    | Never delete                                      | Israeli financial law; orphaned userId acceptable per `POLICY_RETENTION_V1.md §1.3` | **Yes — confirm retention period with accountant/legal**                                |
| Receipt                      | `receipts`             | RETAINED INTENTIONALLY                        | **MUST RETAIN**                    | Never delete                                      | Fiscal record; YeshInvoice-issued                                                   | **Yes — confirm retention period with accountant/legal**                                |
| YeshInvoice provider doc     | YeshInvoice API        | RETAINED at provider (no delete API)          | **MUST RETAIN at provider**        | No action (no deletion capability)                | Permanent fiscal artifact at provider                                               | No                                                                                      |
| Tranzila STO (provider side) | Tranzila API           | NOT CANCELLED on delete                       | **CANCEL before local delete**     | Call `cancelTranzilaStoForUser` as pre-condition  | Core P0 invariant; see §2–§3                                                        | No                                                                                      |
| Tranzila token (local field) | `users.tranzilaToken`  | DELETED with user doc                         | DELETED with user doc              | Implicit — part of user document                  | No standalone value after user deleted; provider retains its own token record       | No                                                                                      |
| AdminAudit                   | `adminaudits`          | RETAINED + created on delete                  | **MUST RETAIN** + create on delete | Never delete; always create on user deletion      | Legal/audit trail                                                                   | No                                                                                      |
| OrgInviteAudit               | `orginviteaudits`      | RETAINED                                      | RETAIN                             | No deletion                                       | Audit trail for accepted invites                                                    | **Yes — anonymize actorUserId after retention window? Separate future policy required** |
| OrganizationMember           | `organizationmembers`  | DELETED                                       | DELETED                            | Maintain                                          | User-membership binding; org persists independently                                 | No                                                                                      |
| OrgInvite (pending)          | `orginvites`           | DELETED (pending only)                        | DELETED (pending only)             | Maintain                                          | Operational garbage only                                                            | No                                                                                      |

---

## 14. Implementation Roadmap

This section documents future implementation contours. **No code changes are made as part of this document.**

### Contour A — Provider Cancellation Integration (P0)

**Goal:** Call `cancelTranzilaStoForUser` as a pre-condition in `deleteUserPermanently`, `POST /delete-account`, and `adminRevokeUserSubscription`.  
**Dependencies:** This policy approved by architect/product.  
**Files:** `backend/src/controllers/admin.controller.js`, `backend/src/routes/account.routes.js`  
**Risks:** Tranzila API unavailability blocks all deletes/revokes. Stale `pending` STO state may not be cancellable; need state-machine handling.  
**Verification:** Extend `sanity-admin-user-delete.mjs` to cover STO pre-cancel path. CI gate.  
**Rollback:** Revert controller changes. Operator falls back to `sto-cancel.mjs` manually.

### Contour B — Cascade Cleanup Gaps (P1)

**Goal:** Add `PasswordReset`, `ActivePasswordReset`, `MailJob`, `AiUsageMonthly`, `EmailSignupToken` to admin delete cascade. Add sole-org-admin guard to admin delete. Add tombstone creation to admin delete.  
**Dependencies:** Contour A complete. AiUsageMonthly product decision (§7.2). Tombstone product decision (§6.2).  
**Files:** `backend/src/controllers/admin.controller.js`, `backend/src/routes/account.routes.js`  
**Risks:** More operations increase partial-failure surface. MailJob ordering constraint (§11.3) must be respected.  
**Verification:** Extend `sanity-admin-user-delete.mjs` to assert zero-count on PasswordReset, MailJob, AiUsageMonthly after delete.

### Contour C — Transaction / Idempotency Helper (P2)

**Goal:** Introduce a structured multi-card deletion helper that tracks per-card completion state, enabling safe retry without re-deleting already-cleaned cards.  
**Dependencies:** Contour B complete.  
**Files:** New utility, `backend/src/controllers/admin.controller.js`  
**Risks:** Complexity. Without Mongo transactions, true atomicity is not achievable; focus on correct retry semantics and audit-friendly state.

### Contour D — Admin UI Confirmation (P2)

**Goal:** Admin panel surfaces active STO status before presenting delete/revoke option. Requires operator acknowledgment when STO is active. Surfaces STO cancellation as a first-class step.  
**Dependencies:** Contour A complete (API surfaces STO cancel result).  
**Files:** Frontend admin components.

### Contour E — Tests / Sanity (P1)

**Goal:** Extend `sanity-admin-user-delete.mjs` to cover: STO pre-cancel state assertion, PasswordReset/MailJob/AiUsageMonthly zero-count verification, sole-org-admin blocking, tombstone creation. Consider a separate `sanity-admin-delete-billing.mjs` that exercises the STO cancellation path with a mock STO state (no real Tranzila call in CI).  
**Dependencies:** Contour B.  
**Files:** `backend/scripts/sanity-admin-user-delete.mjs`, potentially new `backend/scripts/sanity-admin-delete-billing.mjs`

### Contour F — Docs / Runbooks (P1)

**Goal:** New `docs/runbooks/admin-user-delete.md` covering: pre-delete STO check, sole-org-admin guard, cascade order, retention artifacts, post-delete verification. Update `docs/runbooks/billing-flow-ssot.md` STO cancellation section.  
**Dependencies:** Contour A/B complete.  
**Files:** New runbook. `docs/runbooks/billing-flow-ssot.md`.

### Contour G — Rollout (P1)

**Goal:** Stage deployment. Test on staging with a real STO-enabled test user (mock STO, no real payment). Production rollout with operator on standby.  
**Dependencies:** All previous contours. Staging proof.  
**Pre-rollout operator action:** Run `classify:retention:dry-run` to identify all users with `tranzilaSto.status = "created"`. For each, confirm Tranzila portal shows active STO. Prepare operator runbook entry.  
**Rollback:** Revert Contour A/B changes. Fall back to manual `sto-cancel.mjs` workflow.

---

## 15. Open Decisions Requiring Sign-Off

The following decisions are required before implementation begins. Each is tagged with who must sign off.

| #   | Decision                                                                          | Owner               | Impact if deferred                                             |
| --- | --------------------------------------------------------------------------------- | ------------------- | -------------------------------------------------------------- |
| D1  | STO cancellation hard-block vs. enqueue-and-proceed                               | Architect + Product | Blocks Contour A design                                        |
| D2  | Tombstone creation on admin hard delete (always vs. reason-conditional)           | Product             | Blocks Contour B tombstone integration                         |
| D3  | Leads/bookings: immediate delete vs. export grace period                          | Product + Legal     | Blocks Contour B or requires new export flow                   |
| D4  | AiUsageMonthly: delete immediately vs. anonymized aggregate retention             | Product             | Blocks Contour B AiUsage cleanup                               |
| D5  | Sole-org-admin blocking: block delete or auto-transfer ownership to another admin | Product             | Blocks Contour B org guard                                     |
| D6  | PaymentTransaction / Receipt retention period (years)                             | Accountant / Legal  | Required for compliance posture; does not block implementation |
| D7  | OrgInviteAudit: retain-forever vs. anonymize actorUserId after N years            | Legal               | Does not block current implementation; future migration        |
| D8  | Audit log failure: `{ ok: true, auditWriteFailed: true }` vs. block and rollback  | Architect           | Blocks Contour A audit order-of-operations                     |

This policy document recommends the answer to D1 (hard-block), D2 (always create tombstone), D3 (delete with card, pending review), D4 (delete), D5 (block deletion), and D8 (surface as warning, do not rollback). All recommendations require sign-off before implementation.

---

_End of POLICY_ADMIN_DELETE_LIFECYCLE_V1_
