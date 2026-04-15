# Account Retention Policy V1

**Status:** Formalized. V1 initial rollout windows are recommendations subject to dry-run evidence and product sign-off before any destructive wave is activated.

**Scope:** Internal repository policy governing automated inactivity-based account lifecycle decisions for registered Cardigo users.

**Does NOT govern:**

- Anonymous card cleanup (separate closed contour — see `docs/runbooks/anon-card-cleanup.md`)
- Trial/premium data purge after expiry (separate closed contour — see `docs/runbooks/trial-lifecycle-ssot.md` §9)
- Self-initiated account deletion (separate closed finality contour — `account.routes.js`)
- Published free card dormancy (explicitly deferred — see §5.4)

---

## 1) Policy Laws (Non-Negotiable)

These rules govern all V1 inactivity-deletion decisions. They may not be overridden by any individual job or script.

### 1.1 Tombstone is finality, not housekeeping

`DeletedEmailBlock` (the permanent email-block tombstone) is applied **only** to:

- Self-initiated voluntary account deletion
- Admin-initiated fraud/abuse deletion

**Tombstone must NOT be applied to any automated inactivity cleanup bucket (B1, B2, B3).**

Rationale: inactivity ≠ finality. An inactive user retains the right to return and re-register. Permanent email blocking for inactivity is a trust violation and disproportionate to the housekeeping intent.

### 1.2 Deletion-warning email is transactional

For buckets where a warning is required (B2, B3), the deletion-warning email is classified as **transactional** — not marketing.

Consequences:

- It must NOT be gated on `user.emailMarketingConsent`.
- It must NOT use the marketing suppression (`MarketingOptOut`) gate.
- It follows the same delivery model as password-reset and verification emails.
- `emailMarketingConsent: null` must not block the sending of a deletion warning.

### 1.3 Financial records are preserved after user deletion

`PaymentTransaction` records (financial audit trail) must NOT be deleted when a user account is removed via any inactivity cleanup path.

Rationale: Israeli financial law requires retention of payment records. The `PaymentTransaction.userId` field may become an orphaned reference after user deletion; this is an acceptable trade-off.

This invariant is already upheld in the existing self-delete path (no PaymentTransaction deletion in `account.routes.js`). All inactivity-cleanup paths must maintain the same invariant.

### 1.4 Published free cards are unconditionally exempt from V1

Any user whose card has `status: "published"` is unconditionally exempt from V1 auto-deletion, regardless of inactivity window.

Rationale: a published card is a live artifact in the world — potentially backed by physical QR codes, printed materials, NFC tags, or indexed URLs. Deletion causes irreversible public breakage that cannot be recalled.

### 1.5 Dry-run before destructive wave

Every inactivity-cleanup job or script must support a dry-run mode (log-only with no destructive writes) and must be validated in dry-run before any destructive activation. This rule has no exceptions.

---

## 2) Account Bucket Matrix

### B1 — Unverified / Zero-Value

| Parameter                  | Value                                                      |
| -------------------------- | ---------------------------------------------------------- |
| V1 included                | ✅ Yes — Wave 1                                            |
| Warning email              | ❌ No (email not verified; reliable delivery not possible) |
| Tombstone                  | ❌ No (see §1.1)                                           |
| Initial recommended window | 30 days from `User.createdAt`                              |

**Classification criteria (all must be true):**

- `User.isVerified = false`
- `User.cardId = null`
- No `PaymentTransaction` with `status: "paid"` for this user
- No `OrgMember` record with `status: "active"` for this user
- `User.adminTier = null`
- No `Card` with `adminOverride.plan != null` owned by this user
- `User.role != "admin"`

**Fate:** Hard delete of `User` document. Associated `EmailVerificationToken`, `EmailSignupToken`, and inactive invite records are cleaned up. No tombstone.

**Precedent:** Shares the housekeeping philosophy of the anonymous card cleanup (`docs/runbooks/anon-card-cleanup.md`), applied to unverified registrations. The inactivity threshold is different (account-age based, not `updatedAt` based).

---

### B2 — Verified / No-Card / No-Payment / No-Org

| Parameter                                | Value                                  |
| ---------------------------------------- | -------------------------------------- |
| V1 included                              | ✅ Yes — Wave 2 (warning-first)        |
| Warning email                            | ✅ Required — transactional (see §1.2) |
| Tombstone                                | ❌ No (see §1.1)                       |
| Initial recommended inactivity threshold | 90 days                                |
| Initial recommended warning grace window | 14 days                                |

**Classification criteria (all must be true):**

- `User.isVerified = true`
- `User.cardId = null` (no card created)
- No `PaymentTransaction` with `status: "paid"` for this user
- No `OrgMember` record with `status: "active"` for this user
- `User.adminTier = null`
- `User.role != "admin"`
- Inactivity measured via: `User.lastLoginAt <= threshold` OR `(User.lastLoginAt = null AND User.createdAt <= threshold)`

**Note on `lastLoginAt = null`:** Null means "never logged in via a credential-issuing path, OR logged in before the `lastLoginAt` field was introduced." For users with `null` and an old `createdAt`, this is still reliable inactivity evidence. For users with `null` and a recent `createdAt`, treat with caution (see `docs/runbooks/account-inactivity-deletion.md` §6 dry-run guidance).

**Fate:** Warning email sent 14 days before scheduled deletion. If inactivity condition is still met at deletion time, hard delete of `User` document. No tombstone.

---

### B3 — Free / Draft-Only / Low-Value

| Parameter                                | Value                                                   |
| ---------------------------------------- | ------------------------------------------------------- |
| V1 included                              | ✅ Yes — Wave 3 (warning-first, after Wave 2 is stable) |
| Warning email                            | ✅ Required — transactional (see §1.2)                  |
| Tombstone                                | ❌ No (see §1.1)                                        |
| Initial recommended inactivity threshold | 180 days                                                |
| Initial recommended warning grace window | 14 days                                                 |

**Classification criteria (all must be true):**

- `User.isVerified = true`
- `User.cardId != null`
- Associated card `Card.status = "draft"` (NOT published — see §1.4)
- `Card.billing.status = "free"` (not active, not trial, not past_due)
- No `PaymentTransaction` with `status: "paid"` for this user
- No `OrgMember` record with `status: "active"` for this user
- `User.adminTier = null`
- `Card.adminOverride.plan = null`
- `User.role != "admin"`

**Important:** `Card.status` must be re-confirmed as `"draft"` at the moment of deletion (not just at warning time). If the user publishes their card between warning and deletion, the card now falls under B4 and deletion must be aborted.

**Fate:** Warning email 14 days before scheduled deletion. Hard delete of `User` document + draft card estate via `deleteCardCascade` + `Card.deleteOne` + Supabase media cleanup. No tombstone.

---

### B4 — Free / Published

| Parameter     | Value                          |
| ------------- | ------------------------------ |
| V1 included   | ❌ Blocked — deferred entirely |
| Warning email | —                              |
| Tombstone     | —                              |

Published free cards are unconditionally exempt from V1 auto-deletion. See §1.4.

**Future consideration (post-V1):** A separate future contour may address dormant published-free card policy (e.g., unpublish-on-inactivity with notification). This requires independent product/trust decision and is explicitly out of this policy's scope.

---

### B5 — Paid Premium

| Parameter   | Value     |
| ----------- | --------- |
| V1 included | ❌ Exempt |

Any user with `Card.billing.status = "active"` or `"past_due"`, or with any `PaymentTransaction` with `status: "paid"`, is exempt from all inactivity-deletion processing.

Rationale: paying customers have the strongest contractual trust expectation. Finance/legal obligations also require preservation of payment history.

---

### B6 — Org Member / Org Admin

| Parameter   | Value     |
| ----------- | --------- |
| V1 included | ❌ Exempt |

Any user with at least one `OrgMember` record where `status: "active"` for their userId is exempt from all inactivity-deletion processing.

Rationale: org membership creates multi-party trust relationships. Deleting an org member without the org administrator's knowledge is an operational and trust breach. Org-level lifecycle decisions require a separate future policy.

---

### B7 — Admin-Tier / Admin-Override / Admin Role

| Parameter   | Value           |
| ----------- | --------------- |
| V1 included | ❌ Fully exempt |

Any user where `User.adminTier != null`, `User.role = "admin"`, or any associated card has `Card.adminOverride.plan != null` is fully exempt.

---

### B8 — Self-Deleted / Tombstoned

| Parameter   | Value                         |
| ----------- | ----------------------------- |
| V1 included | N/A — separate closed contour |

`DeletedEmailBlock` records are the finality artifacts of voluntary self-deletion. This bucket has no user record to process. The self-delete tombstone contour is closed and must not be altered by inactivity-cleanup work.

---

## 3) Tombstone Policy Summary

| Trigger                                | Tombstone applied? | Canonical reference                                        |
| -------------------------------------- | ------------------ | ---------------------------------------------------------- |
| Self-initiated voluntary deletion      | ✅ Yes             | `account.routes.js` — tombstone-first before card deletion |
| Admin-initiated fraud/abuse deletion   | ✅ Yes (manual)    | Admin tooling                                              |
| B1 unverified inactivity cleanup       | ❌ No              | §1.1 of this document                                      |
| B2 verified/no-card inactivity cleanup | ❌ No              | §1.1 of this document                                      |
| B3 free/draft inactivity cleanup       | ❌ No              | §1.1 of this document                                      |

---

## 4) Warning Email Policy Summary

| Bucket | Warning required?        | Category      | Consent gate    |
| ------ | ------------------------ | ------------- | --------------- |
| B1     | ❌ No (email unverified) | —             | —               |
| B2     | ✅ Yes                   | Transactional | None — see §1.2 |
| B3     | ✅ Yes                   | Transactional | None — see §1.2 |

The deletion-warning email infrastructure is a separate future contour. Before any B2 or B3 wave can ship, a transactional deletion-warning email template must exist (see `docs/runbooks/account-inactivity-deletion.md` §3).

---

## 5) Staged Rollout Order

All stages below must be completed in sequence. No stage may be skipped.

| Stage    | Name                      | Description                                                                                                                   |
| -------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 0        | Policy / legal foundation | This document + runbook + external Privacy Policy / ToS updates + `consentVersions.js` bump (after external docs are updated) |
| 1        | Dry-run classification    | Read-only script reporting candidate counts per bucket. Reviewed before any destructive action.                               |
| 2        | Wave 1 — B1               | Unverified / zero-value destructive wave. Dry-run required first.                                                             |
| 3        | Warning email contour     | Build transactional `sendDeletionWarningEmailMailjetBestEffort` template and delivery mechanism. Gate before waves 2–3.       |
| 4        | Wave 2 — B2               | Verified / no-card warning-first wave. Warning email contour must be complete first.                                          |
| 5        | Wave 3 — B3               | Free / draft-only warning-first wave. Wave 2 must be stable first.                                                            |
| Deferred | B4 dormancy               | Published free card policy — separate future contour, not in V1.                                                              |

### 5.1 Current status

- [x] Stage 0: This policy document exists
- [ ] Stage 0: External Privacy Policy / ToS disclosure (external — not in repo)
- [ ] Stage 0: `consentVersions.js` bump (after external docs updated)
- [ ] Stage 1: Dry-run classification script
- [ ] Stage 2: Wave 1 (B1)
- [ ] Stage 3: Warning email contour
- [ ] Stage 4: Wave 2 (B2)
- [ ] Stage 5: Wave 3 (B3)

---

## 6) Dependencies and Canonical Cross-References

| Dependency                         | Location                                                 | Relationship                                                                                                                                                                                             |
| ---------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Anonymous card cleanup (precedent) | `docs/runbooks/anon-card-cleanup.md`                     | Separate closed contour. Governs `user: null` cards only. Referenced as architectural precedent for TTL-based cleanup philosophy. Must not be duplicated.                                                |
| Trial lifecycle / retention grace  | `docs/runbooks/trial-lifecycle-ssot.md` §8–§9            | Separate closed contour. Governs post-trial billing downgrade (90-day grace, then premium data purge). Must not be reopened.                                                                             |
| Pre-expiry trial reminder email    | `docs/runbooks/trial-lifecycle-ssot.md` §13              | Separate closed contour. Marketing-gated (`emailMarketingConsent: true` required). Referenced here as evidence that the deletion-warning email must use a different, non-marketing-gated classification. |
| Self-delete tombstone finality     | `backend/src/routes/account.routes.js` (see §Tombstone)  | Closed. CreateEmailBlock is called only from the self-delete path. Inactivity cleanup must not call it.                                                                                                  |
| `lastLoginAt` auth-activity signal | `backend/src/models/User.model.js` (field `lastLoginAt`) | Closed readiness contour. Available as inactivity classification signal for B2/B3.                                                                                                                       |
| Booking cascade                    | `backend/src/utils/cardDeleteCascade.js`                 | Closed. Cascade now includes `Booking.deleteMany({ card: cardId })`. No further changes needed.                                                                                                          |
| Consent version SSoT               | `backend/src/utils/consentVersions.js`                   | Must be bumped after external Privacy Policy / ToS are updated to disclose this retention policy.                                                                                                        |
| Org policy                         | `docs/policies/POLICY_ORGS.md`                           | B6 exemption boundary reference.                                                                                                                                                                         |

---

_Created: 2026-04-15. Policy status: formalized, V1 rollout not yet activated._
_Windows listed in §2 are initial recommendations subject to dry-run evidence and product sign-off._
