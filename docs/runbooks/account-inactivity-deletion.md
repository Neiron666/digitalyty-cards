# Runbook: Account Inactivity Deletion

**Status:** Active. V1 rollout not yet activated — all waves pending prerequisite stages.

**Scope:** Operational runbook for the Cardigo V1 account inactivity cleanup system. Governs user-owned registered-account deletion based on inactivity classification.

**Does NOT govern:**

- Anonymous card cleanup (`docs/runbooks/anon-card-cleanup.md` — separate closed contour)
- Post-trial premium data purge (`docs/runbooks/trial-lifecycle-ssot.md` §9 — separate closed contour)
- Self-initiated account deletion (`account.routes.js` — separate closed finality contour)

For the retention policy matrix (bucket criteria, windows, tombstone policy, warning policy, staged rollout order), see: `docs/policies/POLICY_RETENTION_V1.md`.

---

## 1) Operational Scope

This runbook covers:

- **Wave 1 (B1):** Unverified / zero-value accounts. No warning, no tombstone.
- **Wave 2 (B2):** Verified / no-card accounts. Warning-first, no tombstone.
- **Wave 3 (B3):** Free / draft-only accounts. Warning-first, no tombstone.

Buckets B4–B8 are exempt or deferred. See `docs/policies/POLICY_RETENTION_V1.md` §2 for full definitions.

---

## 2) Preconditions Before Any Destructive Wave

**No destructive wave may be activated until all of the following are confirmed:**

| #   | Precondition                                                                                       | Required for  | Status                                                                         |
| --- | -------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------ |
| 1   | `docs/policies/POLICY_RETENTION_V1.md` exists and is accepted                                      | All waves     | ✅ Satisfied                                                                   |
| 2   | External Privacy Policy updated to disclose inactivity deletion                                    | All waves     | ✅ Satisfied (2026-04-15, §12.3, §12.4)                                        |
| 3   | External Terms of Service updated with inactivity deletion clause                                  | All waves     | ✅ Satisfied (2026-04-15, §8.5, §8.6)                                          |
| 4   | `backend/src/utils/consentVersions.js` bumped (after external docs updated)                        | All waves     | ✅ Satisfied (2026-04-15)                                                      |
| 5   | Dry-run classification script run against **production** dataset — output reviewed                 | All waves     | ✅ Satisfied (2026-04-15, B1_candidate=0, 30d window retained)                 |
| 6   | `npm run sanity:imports` passes EXIT:0 on production build                                         | All waves     | ✅ Satisfied                                                                   |
| 7   | Deletion-warning email template (`sendDeletionWarningEmailMailjetBestEffort`) exists and is tested | Waves 2 and 3 | ✅ Satisfied (2026-04-15, `mailjet.service.js`, warn pass verified EXIT:0)     |
| 8   | Wave 1 (B1) stable and reviewed                                                                    | Waves 2 and 3 | ✅ Satisfied (2026-04-15, `retention-b1-cleanup.mjs` verified, dry-run EXIT:0) |

If any precondition is not met, **stop and do not proceed**.

---

## 3) Wave Summary

### Wave 1 — B1 (Unverified / Zero-Value)

| Property                   | Value                                                               |
| -------------------------- | ------------------------------------------------------------------- |
| Accounts targeted          | `isVerified = false`, `cardId = null`, no payment, no org, no admin |
| Warning email              | None                                                                |
| Tombstone                  | None                                                                |
| Initial recommended window | 30 days from `User.createdAt`                                       |
| Dry-run required           | Yes (mandatory before first destructive run)                        |

**Cascade/delete order (per account):**

1. Delete `EmailVerificationToken` records for `userId`
2. Delete `EmailSignupToken` records by `emailNormalized` (matched via normalized email)
3. Delete any pending `OrgInvite` records for the user's email
4. `User.deleteOne({ _id: userId })`

**No tombstone. No cascade to Card (user has no card — `cardId = null`).**

---

### Wave 2 — B2 (Verified / No-Card)

| Property                                 | Value                                                              |
| ---------------------------------------- | ------------------------------------------------------------------ |
| Accounts targeted                        | `isVerified = true`, `cardId = null`, no payment, no org, no admin |
| Warning email                            | ✅ Transactional, sent 14 days before scheduled deletion           |
| Tombstone                                | None                                                               |
| Initial recommended inactivity threshold | 90 days                                                            |
| Initial recommended grace window         | 14 days                                                            |
| Dry-run required                         | Yes                                                                |

**Warning-first sequence:**

1. Operator runs `npm run retention:b2:warn:dry-run` — review candidate count (`warnedCount`)
2. Operator runs `npm run retention:b2:warn:apply` — sends transactional deletion-warning emails; stamps `b2WarningSentAt` + `b2GraceUntil` per user
3. Grace window elapses (14 days, stored per-user in `b2GraceUntil`)
4. Operator runs `npm run retention:b2:cleanup:dry-run` — review candidates whose grace has expired; inspect `skip_reasons.reactivated` (users who logged in during grace)
5. Operator runs `npm run retention:b2:cleanup:apply` — deletes accounts that are still inactive after grace

**Recovery rule:** If `User.lastLoginAt > b2WarningSentAt` at cleanup time, the account is skipped (`reactivated`). No additional operator action required.

**Cleanup delete surface (per account, in order):**

1. `EmailVerificationToken.deleteMany({ userId })`
2. `EmailSignupToken.deleteMany({ emailNormalized })`
3. `PasswordReset.deleteMany({ userId })`
4. `ActivePasswordReset.deleteMany({ userId })`
5. `MailJob.deleteMany({ userId })`
6. `OrgInvite.deleteMany({ email, revokedAt: null, usedAt: null, expiresAt: { $gt: now } })`
7. `User.deleteOne({ _id: userId })`

**No tombstone. No Card cascade (user has no card — `cardId = null`). `PaymentTransaction` records preserved.**

**Preconditions:** §2 rows 7 and 8 must be ✅ before warn pass activates (both satisfied — see §2).

---

### Wave 3 — B3 (Free / Draft-Only)

| Property                                 | Value                                                                                                                   |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Accounts targeted                        | `isVerified = true`, `cardId != null`, card `status = "draft"`, `billing.status = "free"`, no payment, no org, no admin |
| Warning email                            | ✅ Transactional, sent 14 days before scheduled deletion                                                                |
| Tombstone                                | None                                                                                                                    |
| Initial recommended inactivity threshold | 180 days                                                                                                                |
| Initial recommended grace window         | 14 days                                                                                                                 |
| Dry-run required                         | Yes                                                                                                                     |

**Warning-first sequence:**

1. Job identifies B3 candidates (inactivity threshold met, card confirmed draft)
2. Transactional deletion-warning email sent
3. Grace window timer starts (14 days)
4. At deletion time: re-check all conditions
    - If `User.lastLoginAt` updated within grace window → skip
    - **If `Card.status` is now `"published"` → skip unconditionally (user is now B4 exempt)**
    - If conditions still met → proceed with deletion

**Deletion order (per account) — mirrors self-delete ordering discipline:**

1. Supabase media cleanup (same helper as self-delete path)
2. `deleteCardCascade({ cardId: card._id })` — deletes Leads, CardAnalyticsDaily, Bookings
3. `Card.deleteOne({ _id: card._id })`
4. Clean up org invites for user email
5. `User.deleteOne({ _id: userId })`

**No tombstone at any point.**

---

## 4) Invariants (Must Be Upheld by All Waves)

These rules may not be overridden by any individual script, job, or operator.

### 4.1 No tombstone for inactivity cleanup

`createEmailBlock()` (`backend/src/utils/emailBlock.util.js`) must NOT be called from any inactivity-deletion path. Tombstone is reserved for self-delete and fraud/abuse (see `docs/policies/POLICY_RETENTION_V1.md` §1.1).

### 4.2 PaymentTransaction records are preserved

No inactivity-cleanup path may delete `PaymentTransaction` records. The `userId` field on a transaction may become an orphaned reference after user deletion; this is acceptable. Financial records must be kept for audit/legal purposes.

### 4.3 Published free cards are unconditionally protected

Before any Wave 3 deletion is committed, `Card.status` must be verified as `"draft"` at deletion time — not just at warning time. If the card has become `"published"` between warning and deletion, the deletion is aborted.

### 4.4 Paid / org / admin accounts are never touched

**All six exemption checks must pass before any account is queued:**

1. `Card.billing.status` is NOT `"active"` or `"past_due"`
2. No `PaymentTransaction` with `status: "paid"` for this user
3. No `OrgMember` with `status: "active"` for this user
4. `User.adminTier = null`
5. No card with `Card.adminOverride.plan != null`
6. `User.role != "admin"`

If any check fails — skip the account.

### 4.5 Dry-run before destructive activation

Every job or script must implement a dry-run mode. Dry-run must log all candidates that would be affected without writing any destructive changes. A destructive run must require an explicit flag (e.g., `--apply --i-understand-deletion`). This mirrors the existing migration script governance pattern.

---

## 5) Operator Checklist — Before Each Wave Activation

Before activating a new destructive wave for the first time:

- [ ] Confirm all preconditions in §2 are met
- [ ] Run the classification dry-run script against the production dataset
- [ ] Review dry-run candidate counts — compare against expected bucket size
- [ ] Spot-check 3–5 candidates manually to confirm query correctness
- [ ] Confirm `sanity:imports` EXIT:0
- [ ] Confirm `sanity:cascade-delete` EXIT:0 (Wave 3 only — verifies cascade includes Bookings)
- [ ] Activate wave with dry-run flag first, even in production (`--dry-run`)
- [ ] Review dry-run output for unexpected candidates
- [ ] Only then activate with `--apply` flag
- [ ] Monitor first run log output: `deletedCount`, `skippedCount`, errors
- [ ] Set recurring schedule after first confirmed run

---

## 6) Abort Conditions

Stop the wave immediately and do NOT re-activate until the condition is investigated:

| Condition                                                             | Action                                                               |
| --------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `deletedCount` is unexpectedly large (> 2× dry-run candidate count)   | Stop. Investigate query.                                             |
| Any account with a published card appears in deletion output          | Stop. Critical policy violation. Fix exemption check.                |
| Any account with a PaymentTransaction appears in deletion output      | Stop. Critical invariant violation.                                  |
| Any OrgMember active account appears in deletion output               | Stop. Critical invariant violation.                                  |
| Any `createEmailBlock()` call appears in logs                         | Stop. Tombstone policy violation.                                    |
| `sanity:imports` exits non-zero after a code deploy preceding the run | Stop. Deployment issue.                                              |
| Supabase deletion failures spike (Wave 3)                             | Pause wave. Retry logic applies per card. Investigate storage state. |

---

## 7) Environment Variables

These env vars govern inactivity job behavior. Specific values are recommendations; adjust after dry-run evidence.

| Env var                    | Purpose                                                          | V1 recommended default |
| -------------------------- | ---------------------------------------------------------------- | ---------------------- |
| `INACTIVITY_B1_TTL_DAYS`   | B1 inactivity window (days from `createdAt`)                     | `30`                   |
| `INACTIVITY_B2_TTL_DAYS`   | B2 inactivity threshold (days from `lastLoginAt` or `createdAt`) | `90`                   |
| `INACTIVITY_B2_GRACE_DAYS` | B2 warning grace window before deletion                          | `14`                   |
| `INACTIVITY_B3_TTL_DAYS`   | B3 inactivity threshold                                          | `180`                  |
| `INACTIVITY_B3_GRACE_DAYS` | B3 warning grace window                                          | `14`                   |
| `INACTIVITY_WAVE1_ENABLED` | Gate for Wave 1 (B1) destructive runs                            | `false` (default OFF)  |
| `INACTIVITY_WAVE2_ENABLED` | Gate for Wave 2 (B2) destructive runs                            | `false` (default OFF)  |
| `INACTIVITY_WAVE3_ENABLED` | Gate for Wave 3 (B3) destructive runs                            | `false` (default OFF)  |

All wave gates default to `false`. Enabling any wave requires explicit operator action and is not a code change.

---

## 8) Cross-References

| Reference                                                                    | Location                                                 |
| ---------------------------------------------------------------------------- | -------------------------------------------------------- |
| Retention policy matrix (bucket criteria, windows, tombstone/warning policy) | `docs/policies/POLICY_RETENTION_V1.md`                   |
| Anonymous card cleanup (separate closed contour, TTL precedent)              | `docs/runbooks/anon-card-cleanup.md`                     |
| Trial lifecycle / retention grace                                            | `docs/runbooks/trial-lifecycle-ssot.md` §8–§9            |
| Self-delete tombstone (closed finality path)                                 | `backend/src/routes/account.routes.js`                   |
| Tombstone utility (must NOT be called from inactivity paths)                 | `backend/src/utils/emailBlock.util.js`                   |
| Cascade utility (Leads + Analytics + Bookings)                               | `backend/src/utils/cardDeleteCascade.js`                 |
| lastLoginAt signal                                                           | `backend/src/models/User.model.js` (`lastLoginAt` field) |
| Consent version SSoT                                                         | `backend/src/utils/consentVersions.js`                   |
| Org membership (B6 exemption)                                                | `backend/src/models/OrganizationMember.model.js`         |

---

_Created: 2026-04-15. Last reviewed: 2026-04-15. Rollout not yet activated — all §2 prerequisites satisfied (rows 1–8). B1 may proceed immediately upon operator activation intent. B2 warn pass ready; requires Mailjet env confirmed live in production before `retention:b2:warn:apply`. B2 cleanup pass ready; must run after B2 warn:apply + grace window elapsed. Production dry-run (2026-04-15): B1_candidate=0, sanity_ok=true, 30-day window retained. B2 warn dry-run (2026-04-15): mode=dry-run, sanity_ok=true. B2 cleanup dry-run (2026-04-15): mode=dry-run, sanity_ok=true._
