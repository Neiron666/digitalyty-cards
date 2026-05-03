# Runbook: Admin User Delete Lifecycle

**Status:** Active  
**Date:** 2026-04-26  
**Scope:** Platform admin hard-delete, self-delete account, admin subscription revoke — operator sequence, data matrix, failure modes, sanity/CI coverage.  
**Policy reference:** `docs/policies/POLICY_ADMIN_DELETE_LIFECYCLE_V1.md`  
**Tier:** Tier 2 — Architecture / Ops Contract

---

## §1. Scope

This runbook covers three operator-initiated or user-initiated flows:

| Flow                      | Endpoint                                        | Initiator      |
| ------------------------- | ----------------------------------------------- | -------------- |
| Admin hard delete         | `POST /api/admin/users/:id/delete`              | Platform admin |
| Self-delete               | `POST /api/account/delete-account`              | User (self)    |
| Admin subscription revoke | `POST /api/admin/users/:id/subscription/revoke` | Platform admin |

**Not in scope (separate policies):**

- B1/B2/B3 inactivity-based automated deletion — see `docs/policies/POLICY_RETENTION_V1.md`
- User-initiated plan downgrade (no `User.deleteOne`)
- Org dissolution / member removal
- Anonymous card cleanup — see `docs/runbooks/anon-card-cleanup.md`; anonymous cards have no user account and no billing lifecycle
- Production billing terminal activation / production terminal cutover — a separate pre-launch checklist item, not part of the delete lifecycle

---

## §2. Accepted Product Decisions

The following decisions are locked as of 2026-04-26. Do not reopen without architect approval.

| #   | Decision                                                 | Outcome                                                                                                                                       |
| --- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Admin delete — `DeletedEmailBlock` tombstone             | **NOT created.** Admin authority ≠ finality/re-registration block                                                                             |
| 2   | Admin delete — sole-org-admin guard                      | **NOT applied.** Platform admin authority supersedes org governance                                                                           |
| 3   | Admin delete — platform authority                        | Platform admin can freely delete users per platform authority                                                                                 |
| 4   | Self-delete — tombstone                                  | **DOES create** `DeletedEmailBlock` (tombstone-first before cascade)                                                                          |
| 5   | Self-delete — sole-org-admin guard                       | **DOES block** on `SOLE_ORG_ADMIN` (409)                                                                                                      |
| 6   | STO cancellation ordering                                | Must precede all destructive local writes (delete / revoke)                                                                                   |
| 7   | STO cancellation failure                                 | **Hard block** — `!stoResult.ok && !stoResult.skipped` returns 409 `STO_CANCEL_REQUIRED`                                                      |
| 8   | Auth/job/AI cleanup                                      | Must delete PasswordReset, ActivePasswordReset, EmailVerificationToken, EmailSignupToken, MailJob, AiUsageMonthly **before** `User.deleteOne` |
| 9   | PaymentTransaction / Receipt / YeshInvoice provider docs | **Retain indefinitely** — Israeli financial law; orphaned `userId` acceptable                                                                 |
| 10  | AdminAudit                                               | **Retain indefinitely** + create `USER_DELETE_PERMANENT` entry on each admin delete                                                           |
| 11  | MarketingOptout                                          | Retain — protective suppression artifact                                                                                                      |
| 12  | SiteAnalyticsVisit / SiteAnalyticsDaily                  | TTL-managed; no `userId` field — not in cascade                                                                                               |
| 13  | `auditWriteFailed: true` semantics                       | Delete **completed** successfully; only the audit write failed — not a delete failure                                                         |

---

## §3. Admin Delete — Lifecycle Sequence

File: `backend/src/controllers/admin.controller.js`  
Function: `deleteUserPermanently`  
Route middleware: `requireAdmin` (applied globally to all `/api/admin` routes in `app.js`)

1. **Platform-admin authorization** — `requireAdmin` middleware enforces `user.role === "admin"` with a valid session before the route handler is reached (HTTP 401/403 if not satisfied)
2. **Reason requirement** — `requireReason(req, res)` validates `req.body.reason` is a non-empty string ≤ 500 chars; returns HTTP 400 `REASON_REQUIRED` / `REASON_TOO_LONG` if not satisfied
3. **Destructive confirmation token** — `req.body.confirm` must equal exactly `"DELETE"`; returns HTTP 400 `CONFIRM_REQUIRED` if not satisfied
4. **Self-target guard** — `SELF_DELETE_FORBIDDEN` if admin is deleting themselves (HTTP 409)
5. **Target admin-role guard** — `TARGET_IS_ADMIN` if target user has `role: "admin"` (HTTP 409 — MVP restriction)
6. **STO cancel** — `cancelTranzilaStoForUser(user, { source: "admin_delete" })`
    - `ok: true` or `skipped: true` → proceed
    - `!ok && !skipped` → HTTP 409 `STO_CANCEL_REQUIRED` — abort, no local writes
7. **Auth/job/AI cascade** (in order):
    1. `MailJob.deleteMany({ userId })`
    2. `EmailVerificationToken.deleteMany({ userId })`
    3. `EmailSignupToken.deleteMany({ emailNormalized })`
    4. `PasswordReset.deleteMany({ userId })`
    5. `ActivePasswordReset.deleteMany({ userId })`
    6. `AiUsageMonthly.deleteMany({ userId })`
8. **Card cascade** — for each card owned by user: delete Supabase images, delete Card document
9. **Org cleanup** — remove user from `OrganizationMember`, remove org invites
10. **`User.deleteOne({ _id: userId })`**
11. **AdminAudit write** — `{ action: "USER_DELETE_PERMANENT", actorId, targetId }`
    - On failure: returns `{ ok: true, deleted: true, auditWriteFailed: true, warning: "..." }` — does NOT undo deletion

**No tombstone step** — `DeletedEmailBlock` is never created by admin delete (decision 1).  
**No sole-org guard** — org state post-delete is an operational concern (decision 2).

---

## §4. Self-Delete — Lifecycle Sequence

File: `backend/src/routes/account.routes.js`

1. **Authentication check** — requires authenticated session (`requireAuth` middleware)
2. **Account ownership / session confirmation** — the `requireAuth` middleware confirms the request is bound to the authenticated user's session. Explicit password re-confirmation before destructive work is implementation-dependent and is not asserted here; operators must verify the current route implementation before making UI claims about password prompts.
3. **Sole-org-admin guard** — `SOLE_ORG_ADMIN` (HTTP 409) if user is the only active admin in any org
4. **Tombstone-first** — `createEmailBlock({ normalizedEmail, formerUserId })` — HMAC-SHA256 key, no raw email stored
5. **STO cancel** — `cancelTranzilaStoForUser(user, { source: "self_delete" })`
    - Same block semantics as admin delete
6. **Auth/job/AI cascade** (same set as admin delete, same order)
7. **Card cascade** — delete Supabase images, delete Card documents
8. **Org cleanup** — remove from `OrganizationMember`, remove invites
9. **`User.deleteOne({ _id: userId })`**

---

## §5. Admin Subscription Revoke — Lifecycle Sequence

File: `backend/src/controllers/admin.controller.js`  
Function: `adminRevokeUserSubscription`

1. **STO cancel** — `cancelTranzilaStoForUser(existing, { source: "admin_revoke" })`
    - Same block semantics — hard-block on `!ok && !skipped`
    - If provider cancellation fails, revoke returns 409 `STO_CANCEL_REQUIRED` — no local writes occur
2. **Local subscription downgrade and token clear** — single atomic `User.findByIdAndUpdate` sets:
    - `plan = "free"`
    - `subscription.status = "inactive"`, `subscription.expiresAt = null`, `subscription.provider = "admin"`
    - `tranzilaToken = null` (ADMIN_REVOKE_TOKEN_CLEAR_P1, closed 2026-05-03)
    - `tranzilaTokenMeta.expMonth = null`
    - `tranzilaTokenMeta.expYear = null`
    - Token clear is local DB only. No provider-side token invalidation.
3. **No user deletion** — `User.deleteOne` is never called in this flow
4. **Fiscal records retained** — `PaymentTransaction` and `Receipt` are not touched. No YeshInvoice document, Mailjet email, payment, or refund is created.
5. **Resume-auto-renewal blocked** — after revoke, `token_missing` gate applies. Recovery requires a new valid payment through a future checkout flow.

> **Contrast with cancel-renewal:** Self-service `POST /api/account/cancel-renewal` intentionally retains `tranzilaToken` so the user can resume auto-renewal self-service. Admin revoke clears the token because the subscription is being revoked by the platform.

---

## §6. Data Deleted Matrix

| Entity                   | Collection                | Admin Delete                    | Self-Delete                     |
| ------------------------ | ------------------------- | ------------------------------- | ------------------------------- |
| `User`                   | `users`                   | ✅ Deleted                      | ✅ Deleted                      |
| `Card`                   | `cards`                   | ✅ Deleted (all owned cards)    | ✅ Deleted (all owned cards)    |
| Supabase images          | Supabase bucket           | ✅ Deleted per card             | ✅ Deleted per card             |
| `PasswordReset`          | `passwordresets`          | ✅ Deleted                      | ✅ Deleted                      |
| `ActivePasswordReset`    | `activepasswordresets`    | ✅ Deleted                      | ✅ Deleted                      |
| `EmailVerificationToken` | `emailverificationtokens` | ✅ Deleted                      | ✅ Deleted                      |
| `EmailSignupToken`       | `emailsignuptokens`       | ✅ Deleted by `emailNormalized` | ✅ Deleted by `emailNormalized` |
| `MailJob`                | `mailjobs`                | ✅ Deleted (first in order)     | ✅ Deleted                      |
| `AiUsageMonthly`         | `aiusagemonthlys`         | ✅ Deleted                      | ✅ Deleted                      |
| `OrganizationMember`     | `organizationmembers`     | ✅ Removed                      | ✅ Removed                      |
| `OrgInvite` (pending)    | `orginvites`              | ✅ Removed                      | ✅ Removed                      |
| Tranzila STO (provider)  | Tranzila API              | ✅ Cancelled as precondition    | ✅ Cancelled as precondition    |

---

## §7. Data Retained Matrix

| Entity                                      | Collection                                     | Retention Rationale                                                                     |
| ------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------- |
| `PaymentTransaction`                        | `paymenttransactions`                          | Israeli financial law — never delete. `POLICY_RETENTION_V1.md §1.3`                     |
| `Receipt`                                   | `receipts`                                     | Fiscal record (YeshInvoice-issued) — never delete                                       |
| YeshInvoice provider doc                    | YeshInvoice API                                | No deletion API; permanent fiscal artifact at provider                                  |
| `AdminAudit`                                | `adminaudits`                                  | Legal/audit trail — never delete; `USER_DELETE_PERMANENT` entry created on admin delete |
| `MarketingOptout`                           | `marketingoptouts`                             | Protective suppression artifact — retain indefinitely                                   |
| `PaymentIntent`                             | `paymentintents`                               | TTL-managed; expires naturally; no user PII concern                                     |
| `SiteAnalyticsVisit` / `SiteAnalyticsDaily` | `siteanalyticsvisits` / `siteanalyticsdailies` | No `userId` field; TTL-managed; not in cascade                                          |
| `OrgInviteAudit`                            | `orginviteaudits`                              | Audit trail for accepted invites — retain (anonymization deferred to future policy)     |

---

## §8. Data NOT Created or NOT Blocked by Admin Delete

| What                               | Why                                                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `DeletedEmailBlock` NOT created    | Product decision 1 — admin authority ≠ re-registration block. See `POLICY_ADMIN_DELETE_LIFECYCLE_V1.md §6.2`             |
| `SOLE_ORG_ADMIN` guard NOT applied | Product decision 2 — platform admin authority supersedes org governance. See `POLICY_ADMIN_DELETE_LIFECYCLE_V1.md §10.2` |

These are **intentional** product decisions, not omissions. Do not add these checks without architect approval.

---

## §9. Provider Cancellation Details

### `cancelTranzilaStoForUser` Semantics

Function: `backend/src/services/payment/tranzila.provider.js`

| Return value                                 | Meaning                                                    | Safe to proceed?       |
| -------------------------------------------- | ---------------------------------------------------------- | ---------------------- |
| `{ ok: true }`                               | STO cancelled at provider                                  | ✅ Yes                 |
| `{ ok: true, skipped: true, reason: "..." }` | No active STO to cancel (already cancelled, pending, none) | ✅ Yes                 |
| `{ ok: false }`                              | Provider call failed; STO still active                     | ❌ No — abort with 409 |

The function is idempotent and never throws. Repeated calls on a `"cancelled"` STO return `skipped: true`.

### `cancellationSource` Values

| Flow                      | `source` value   |
| ------------------------- | ---------------- |
| Admin delete              | `"admin_delete"` |
| Self-delete               | `"self_delete"`  |
| Admin subscription revoke | `"admin_revoke"` |

> These values are accepted by `cancelTranzilaStoForUser` and persist to `user.tranzilaSto.cancellationSource`. Unknown or legacy source strings still normalize to `"operator_script"`. The accepted value set is kept in sync between `ALLOWED_CANCEL_SOURCES` (provider) and the `cancellationSource` schema enum (User model) — both must be updated together if new lifecycle sources are added.

### Manual Operator Recovery (STO failure)

If a delete is blocked by 409 `STO_CANCEL_REQUIRED` due to a transient Tranzila API failure:

1. Verify the user's `tranzilaSto.status` in Mongo.
2. Run `npm run sto:cancel:dry-run` (from `backend/`) to probe the provider state.
3. Run `npm run sto:cancel:execute` with the appropriate `--email` argument.
4. Confirm Mongo `tranzilaSto.status === "cancelled"`.
5. Retry the delete / revoke operation.

---

## §10. Failure Modes

| Failure                                                  | Response                                                              | Data State                                                                                                                                                                                                                          |
| -------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| STO provider call fails (`ok: false`)                    | HTTP 409 `STO_CANCEL_REQUIRED`                                        | No local writes; user intact                                                                                                                                                                                                        |
| Supabase image delete fails for a card                   | Logged; cascade continues                                             | Card document deleted; image may remain in bucket                                                                                                                                                                                   |
| Auth/job/AI cleanup fails (`USER_DELETE_CLEANUP_FAILED`) | HTTP 500 `USER_DELETE_CLEANUP_FAILED`                                 | **User NOT deleted** — no destructive writes yet; inspect backend logs for `[admin] auth/job cleanup failed`; confirm DB/Mongo connectivity; retry the admin delete request; do NOT manually delete the user until cleanup succeeds |
| AdminAudit write fails                                   | `{ ok: true, deleted: true, auditWriteFailed: true, warning: "..." }` | User deleted; audit entry missing                                                                                                                                                                                                   |
| Target user not found                                    | HTTP 404                                                              | No writes                                                                                                                                                                                                                           |
| Self-target (admin deleting themselves)                  | HTTP 409 `SELF_DELETE_FORBIDDEN`                                      | No writes                                                                                                                                                                                                                           |
| Sole-org-admin guard fires (self-delete only)            | HTTP 409 `SOLE_ORG_ADMIN`                                             | No writes                                                                                                                                                                                                                           |

---

## §11. Sanity / CI Coverage

### CI Workflow

File: `.github/workflows/backend-admin-sanity.yml`  
Schedule: Nightly + `workflow_dispatch`  
Target: `MONGO_URI_DRIFT_CHECK` (a dedicated check cluster, not production)

> **`sanity:admin-user-delete` is a DESTRUCTIVE sanity.** It creates and then deletes real Mongo documents. It must NEVER be run against the production `MONGO_URI`. It is gated to CI (`backend-admin-sanity.yml`) only. The workflow hard-fails if `MONGO_URI_DRIFT_CHECK` is empty.
>
> This script is excluded from the standard sanity order in `docs/runbooks/backend-verification-and-deploy.md §D`.

### Script: `backend/scripts/sanity-admin-user-delete.mjs`

**11 post-delete assertions** verified by this sanity:

| #   | Assertion                                  | Field queried                                            |
| --- | ------------------------------------------ | -------------------------------------------------------- |
| 1   | `User` document deleted                    | `_id: targetUserId`                                      |
| 2   | `Card` document deleted                    | `userId: targetUserId`                                   |
| 3   | Supabase paths not found (2 paths)         | via Supabase storage API                                 |
| 4   | `PasswordReset` deleted                    | `userId`                                                 |
| 5   | `ActivePasswordReset` deleted              | `userId`                                                 |
| 6   | `EmailVerificationToken` deleted           | `userId`                                                 |
| 7   | `EmailSignupToken` deleted                 | `emailNormalized: targetEmailNormalized`                 |
| 8   | `MailJob` deleted                          | `userId`                                                 |
| 9   | `AiUsageMonthly` deleted                   | `userId`                                                 |
| 10  | `DeletedEmailBlock` NOT created            | `formerUserId: targetUserId` (NOT by `emailKey`)         |
| 11  | `AdminAudit USER_DELETE_PERMANENT` written | `action, targetId: ObjectId(targetUserId)` — count === 1 |

Assertions 10 and 11 verify the two most important product-decision invariants.

---

## §12. Operator Pre-Production Checklist

Before running admin delete or subscription revoke on any paid user:

- [ ] Confirm `MONGO_URI` points to the correct environment (never run sanity against production `MONGO_URI`)
- [ ] Verify target user's `tranzilaSto.status` — if `"created"`, `cancelTranzilaStoForUser` will be called automatically; ensure Tranzila API is reachable
- [ ] Confirm no pending `MailJob` documents need to be reviewed before deletion (they will be deleted immediately)
- [ ] If `auditWriteFailed: true` is returned: manually create an `AdminAudit` entry with `action: "USER_DELETE_PERMANENT"` and a note explaining the missed write
- [ ] For subscription revoke: confirm that no manual Tranzila STO re-activation is required after revoke

---

## §13. Manual Verification Checklist (post-delete)

After running a destructive sanity (`npm run sanity:admin-user-delete` from `backend/`) against the drift-check cluster, verify all 8 report booleans are `true` in the output:

| Boolean                          | Expected | Meaning                                                               |
| -------------------------------- | -------- | --------------------------------------------------------------------- |
| `passwordResetsDeleted`          | `true`   | All `PasswordReset` docs for target deleted                           |
| `activePasswordResetsDeleted`    | `true`   | All `ActivePasswordReset` docs for target deleted                     |
| `emailVerificationTokensDeleted` | `true`   | All `EmailVerificationToken` docs for target deleted                  |
| `emailSignupTokensDeleted`       | `true`   | All `EmailSignupToken` docs for target (by `emailNormalized`) deleted |
| `mailJobsDeleted`                | `true`   | All `MailJob` docs for target deleted                                 |
| `aiUsageDeleted`                 | `true`   | All `AiUsageMonthly` docs for target deleted                          |
| `deletedEmailBlockNotCreated`    | `true`   | `DeletedEmailBlock` was NOT created (product decision)                |
| `adminAuditWritten`              | `true`   | `AdminAudit USER_DELETE_PERMANENT` record created                     |

If any boolean is `false`: investigate the corresponding cleanup step in `admin.controller.js` and re-run after fix.

---

## §14. Deferred / Out-of-Scope Tails

The following items were explicitly deferred and are NOT implemented:

| Item                                                                    | Reason deferred                                                                                                                                                                                          | Reference                                      |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Leads/bookings cascade on user delete                                   | Product decision pending — immediate delete vs. export grace period (D3)                                                                                                                                 | `POLICY_ADMIN_DELETE_LIFECYCLE_V1.md §15` D3   |
| Card analytics records (`cardanalyticsdailies`, etc.)                   | No `userId` field in most; cascade design pending                                                                                                                                                        | Future architecture contour                    |
| Org invitation cascade for target user's sent invites                   | Low priority; invites expire naturally                                                                                                                                                                   | Future contour                                 |
| STO pre-cancel CI assertion with mock STO state (no real Tranzila call) | Requires mock infrastructure                                                                                                                                                                             | Future CI contour                              |
| Sole-org-admin guard on admin delete                                    | **Product decision REJECTED** — admin authority supersedes org governance                                                                                                                                | Decision 2, §2                                 |
| Tombstone creation on admin delete                                      | **Product decision REJECTED** — admin delete must NOT create `DeletedEmailBlock`                                                                                                                         | Decision 1, §2                                 |
| Admin UI confirmation screen (STO status pre-delete)                    | P2 deferred — Contour D                                                                                                                                                                                  | `POLICY_ADMIN_DELETE_LIFECYCLE_V1.md §14`      |
| Transaction / idempotency helper for multi-card delete                  | P2 deferred — Contour C                                                                                                                                                                                  | `POLICY_ADMIN_DELETE_LIFECYCLE_V1.md §14`      |
| `PaymentTransaction` / `Receipt` not seeded in sanity                   | Fiscal retention is verified by policy and code review, not by destructive CI seeding; seeding live fiscal records in a CI script would conflate destructive-state testing with fiscal-record governance | Future dedicated fiscal CI harness if required |
| `auditWriteFailed` path not mocked in sanity                            | Testing the audit-failure branch requires a failure-injection harness (mock write error on `AdminAudit.create`); this is not wired into the current sanity script                                        | Future failure-injection CI contour            |

---

_End of admin-user-delete-lifecycle runbook_
