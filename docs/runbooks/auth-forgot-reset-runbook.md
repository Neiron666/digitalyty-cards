Auth: Forgot/Reset Password — Runbook (Enterprise)

Purpose
Password reset via email token. Token is delivered only by email. API must not leak whether an account exists.

Endpoints

POST /api/auth/forgot

Input: { "email": "<user email>" }

Output: 204 No Content always (anti-enumeration), regardless of whether the email exists or is valid.

Side effects (best-effort):

If user exists, backend generates a reset token (raw token never stored), stores tokenHash (sha256) in PasswordReset, builds reset link using SSoT SITE_URL, and attempts to send email via Mailjet.

Single-active token semantics: when a new token is issued and mailer send is attempted (not skipped), previous active tokens for the user are invalidated (marked usedAt=now).

Rate limit baseline applies; exceeding returns 429 (IP-based).

POST /api/auth/reset

Input: { "token": "<raw token>", "password": "<new password>" }

Output:

204 No Content on success (password updated, token one-time used).

400 with neutral message on any failure (invalid/expired/used token, missing user, etc.). No reason leakage.

Token security model

Raw token is never stored in DB.

DB stores tokenHash = sha256(token) with expiresAt and usedAt.

One-time use enforced by atomic “consume” (usedAt set once).

Tokens are time-limited (expiresAt based on configured TTL).

Mailjet semantics (best-effort)

Email sending is backend-only.

Mailjet failures do not break /forgot response (still 204).

No logging of raw tokens or full reset links.

Rate limiting baseline

/auth/forgot and /auth/reset are rate-limited (in-memory, IP-based).

Note: in-memory limiter is not shared across instances (enterprise future improvement: Redis/shared limiter).

/auth/forgot abuse hardening (live)

In addition to IP rate limiting, a backend-authoritative per-user DB-backed cooldown is enforced:

- Cooldown window: 180 seconds from creation of the last active unexpired reset token for the same userId.
- If a recent active token is found, the send is suppressed silently; 204 is returned (anti-enumeration preserved).
- Catch block is fail-closed: any DB error during cooldown check also returns 204 (error cannot bypass the abuse rail).
- IP rate-limit response is 204 (not 429): callers cannot distinguish IP limit from user-not-found or cooldown.
- Frontend client enforces a matching 180-second countdown UX with a spam/junk folder hint.

JWT session invalidation consequence

A successful /auth/reset call sets passwordChangedAt on the user record, which immediately invalidates all existing JWT sessions for that user. Any token with iat < passwordChangedAt.getTime()/1000 will be rejected by requireAuth (401) and silently dropped by optionalAuth on the next authenticated request.

Index governance

Mongoose autoIndex/autoCreate are disabled at runtime. PasswordReset indexes must be applied manually via the canonical migration script.

Canonical script: migrate:user-auth-indexes (backend/scripts/migrate-user-auth-indexes.mjs)

This script governs indexes for all auth token collections including passwordresets. It creates:

- tokenHash_1 (unique) — enforces at DB level that no two reset documents share a hash
- userId_1 — supports per-user cooldown and invalidation queries
- expiresAt_1 — supports expire-filter queries
- usedAt_1 — supports active-token queries

Operational procedure:

1. Dry-run first (default, safe, read-only):
   node scripts/migrate-user-auth-indexes.mjs
   or: npm.cmd run migrate:user-auth-indexes

2. Review output — confirm no BLOCKED messages.

3. Apply (mutates DB — run in a maintenance window):
   npm.cmd run migrate:user-auth-indexes -- --apply

4. Confirm post-check passes: script prints POST-CHECK: all critical indexes verified.

App-level expiry remains authoritative: even without DB indexes, the application always
filters on expiresAt: { $gt: now } and usedAt: null before accepting any token. Missing
indexes are a performance and uniqueness-guarantee gap, not a correctness or security gap.

TTL index decision (deferred):

A MongoDB TTL index on expiresAt (expireAfterSeconds: 0) would allow MongoDB to
automatically delete expired PasswordReset documents. This is NOT currently applied.

Current state: expired documents accumulate in the collection but are harmless — the
application-level expiry guard rejects them on every lookup.

To apply TTL in a future maintenance window (separate from the canonical index apply):
node scripts/migrate-passwordreset-indexes.mjs --apply --ttl
Note: if expiresAt_1 was already created as a plain index, it must be dropped before
recreating as a TTL index. Confirm with dry-run first.

Manual smoke (PowerShell + curl.exe)

Forgot: always 204:

send {email} and expect 204

Reset:

first use of token → 204

second use of same token → 400

Single-active:

run forgot twice → token1 must fail, token2 must succeed
