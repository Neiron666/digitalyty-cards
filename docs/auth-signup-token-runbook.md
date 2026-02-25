Auth: Signup via Email Token (Magic Link) — Runbook (Enterprise)

Purpose
Allow a new user to sign up via a one-time email token (magic link). Prevent email enumeration and token leakage. Keep existing password login/register flows intact.

Endpoints

POST /api/auth/signup-link

Input: { "email": "<email>" }

Output: 204 No Content always (anti-enumeration), regardless of:

email validity,

whether the email already exists,

Mailjet configuration,

internal errors (neutralized).

Side effects (best-effort):

If email does not belong to an existing user and passes internal checks:

backend generates raw token (never stored),

stores tokenHash=sha256(token) in EmailSignupToken with expiresAt and usedAt=null,

builds link using SSoT getSiteUrl():

${SITE_URL}/signup?token=... (fallback to canonical prod),

sends email via Mailjet best-effort.

Single-active semantics:

when a new token is issued and mailer send is attempted (not skipped), previous active tokens for the same emailNormalized are invalidated via usedAt=now.

Rate limiting:

per-IP baseline,

per-emailNormalized baseline for signup-link,

responses stay 204 (anti-enum).

POST /api/auth/signup-consume

Input: { "token": "<raw token>", "password": "<new password>" }

Output:

Success: returns { "token": "<jwt>" } (user is authenticated immediately).

Any failure: 400 with a neutral message (invalid/expired/used token, existing user, rate-limit, internal error). No reason leakage.

Behavior:

token is consumed atomically (usedAt set once),

user is created with passwordHash=bcrypt(...) (no partial users).

Token security model

Raw tokens are never stored.

DB stores only tokenHash, expiresAt, usedAt, emailNormalized.

One-time use enforced by atomic consume.

TTL enforced by expiresAt.

Mailjet semantics (best-effort)

backend-only sending.

“skipped when not configured” is supported.

no logging of raw token or full signup link.

Index governance

Mongoose autoIndex/autoCreate may be off in runtime.

EmailSignupToken indexes are created via migration script:

dry-run default

--apply required

NamespaceNotFound-safe

Manual smoke (PowerShell + curl.exe)

signup-link: always 204

consume:

first use → success (JWT)

second use → 400

single-active:

request token twice → token1 must fail, token2 must succeed
