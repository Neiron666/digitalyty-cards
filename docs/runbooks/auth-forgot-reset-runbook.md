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

Index governance

Mongoose autoIndex/autoCreate may be off in runtime.

PasswordReset indexes are managed via migration script:

Default is dry-run.

Apply requires explicit --apply.

Script handles missing collection safely.

Manual smoke (PowerShell + curl.exe)

Forgot: always 204:

send {email} and expect 204

Reset:

first use of token → 204

second use of same token → 400

Single-active:

run forgot twice → token1 must fail, token2 must succeed
