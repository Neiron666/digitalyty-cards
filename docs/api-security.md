# API Security - Auth Endpoints & Policies

> **Tier 2 - Architecture / Ops Contract**
> Canonical reference for auth endpoint behaviour, rate limiting, and security hardening.

---

## Table of Contents

- [API Security - Auth Endpoints \& Policies](#api-security--auth-endpoints--policies)
    - [Table of Contents](#table-of-contents)
    - [1. Global Middleware](#1-global-middleware)
        - [Helmet](#helmet)
        - [CORS](#cors)
        - [ETag](#etag)
    - [2. Auth Endpoints](#2-auth-endpoints)
        - [POST /api/auth/register](#post-apiauthregister)
        - [POST /api/auth/login](#post-apiauthlogin)
        - [POST /api/auth/forgot](#post-apiauthforgot)
        - [POST /api/auth/reset](#post-apiauthreset)
        - [POST /api/auth/signup-link](#post-apiauthsignup-link)
        - [POST /api/auth/signup-consume](#post-apiauthsignup-consume)
        - [GET /api/auth/me](#get-apiauthme)
        - [POST /api/auth/verify-email](#post-apiauthverify-email)
        - [POST /api/auth/resend-verification](#post-apiauthresend-verification)
    - [3. Rate Limiting Summary](#3-rate-limiting-summary)
    - [4. Email Verification Flow](#4-email-verification-flow)
        - [Path A - Standard Registration (`/register`)](#path-a--standard-registration-register)
        - [Path B - Magic Link Signup (`/signup-link` → `/signup-consume`)](#path-b--magic-link-signup-signup-link--signup-consume)
        - [Token lifecycle](#token-lifecycle)
        - [Model: `EmailVerificationToken`](#model-emailverificationtoken)
    - [5. Password Policy](#5-password-policy)
    - [6. Environment Variables](#6-environment-variables)
    - [7. Security Design Decisions](#7-security-design-decisions)
        - [Anti-enumeration](#anti-enumeration)
        - [Token storage](#token-storage)
        - [Atomic consumption](#atomic-consumption)
        - [JWT](#jwt)
        - [JWT session invalidation after password change](#jwt-session-invalidation-after-password-change)
        - [bcrypt](#bcrypt)
        - [Account-creation consent](#account-creation-consent)
        - [Password-reset: implemented runtime design](#password-reset-implemented-runtime-design)
            - [Guiding principle](#guiding-principle)
            - [Current implementation (live as of 2026-03-29)](#current-implementation-live-as-of-2026-03-29)
            - [Transition: dual-read on /auth/reset (temporary)](#transition-dual-read-on-authreset-temporary)
            - [First-version delivery policy](#first-version-delivery-policy)
            - [DB / index prerequisites (applied 2026-03-29)](#db--index-prerequisites-applied-2026-03-29)

---

## 1. Global Middleware

### Helmet

`helmet` is applied at the top of the Express middleware stack (`backend/src/app.js`).

| Header                | Value / Behaviour                                |
| --------------------- | ------------------------------------------------ |
| contentSecurityPolicy | **disabled** - CSP is delegated to reverse-proxy |
| frameguard            | `sameorigin` - prevents click-jacking            |
| Other defaults        | Enabled (X-Content-Type-Options, HSTS, etc.)     |

### CORS

CORS origin whitelist is driven by the `CORS_ORIGINS` environment variable.

- **Production**: `CORS_ORIGINS=https://cardigo.co.il` (comma-separated if multiple).
- **Development**: if `CORS_ORIGINS` is unset or empty, all origins are allowed.
- Requests with **no origin** (server-to-server, curl, mobile) are always allowed.
- `credentials: true` is enabled.

### ETag

ETag generation is disabled app-wide (`app.set("etag", false)`) to avoid 304 responses with empty bodies for XHR clients.

---

## 2. Auth Endpoints

All endpoints are mounted under `/api/auth` (see `backend/src/routes/auth.routes.js`).

---

### POST /api/auth/register

Create a new user account via email + password.

| Field      | Location | Required | Description                                                   |
| ---------- | -------- | -------- | ------------------------------------------------------------- |
| `email`    | body     | yes      | User email (normalized)                                       |
| `password` | body     | yes      | Plaintext password — must satisfy PASSWORD_POLICY_V1 (see §5) |
| `consent`  | body     | yes      | Boolean `true` - explicit acceptance of Terms & Privacy       |

**Rate limit**: 20 requests / 10 min per IP.

**Behaviour**:

1. Validates email format and password against PASSWORD_POLICY_V1 (see §5).
2. Enforces `consent === true` (strict boolean); rejects with `CONSENT_REQUIRED` otherwise.
3. Case-insensitive duplicate check (2-step: exact match → collation fallback).
4. Hashes password with `bcrypt` (salt rounds 10).
5. Creates user with `isVerified: false`; persists `termsAcceptedAt`, `privacyAcceptedAt`, `termsVersion`, `privacyVersion` from SSoT version constants.
6. Best-effort: claims any anonymous card linked to the session.
7. Best-effort: generates a verification token (24 h TTL), sends a link via Mailjet.

**Responses**:

| Status | Body                                                           | Condition                                                       |
| ------ | -------------------------------------------------------------- | --------------------------------------------------------------- |
| 200    | `{ "registered": true, "isVerified": false }`                  | Account created (no auth cookie - user must verify email first) |
| 400    | `{ "message": "Invalid email" }`                               | Malformed email                                                 |
| 400    | `{ "code": "<PASSWORD_*>", "message": "Invalid password" }`    | Password fails PASSWORD_POLICY_V1 (see §5 for all codes)        |
| 400    | `{ "message": "Invalid request", "code": "CONSENT_REQUIRED" }` | `consent !== true`                                              |
| 409    | `{ "message": "Unable to register" }`                          | Duplicate or permanently blocked email (anti-enum)              |
| 429    | `{ "code": "RATE_LIMITED", "message": "Too many requests" }`   | Rate limit exceeded                                             |

**Example**:

```bash
curl -X POST https://cardigo.co.il/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"securePass1","consent":true}'
# → 200 {"registered":true,"isVerified":false}
# No auth cookie is set - user must verify email first.
```

---

### POST /api/auth/login

Authenticate an existing user.

| Field      | Location | Required | Description        |
| ---------- | -------- | -------- | ------------------ |
| `email`    | body     | yes      | User email         |
| `password` | body     | yes      | Plaintext password |

**Rate limit**: 30 requests / 10 min per IP.

**Behaviour**:

1. 2-step case-insensitive user lookup.
2. Compares password via `bcrypt.compare`.
3. On success, sets an httpOnly auth cookie and returns `{ ok: true }`.

**Responses**:

| Status | Body                                                         | Condition                                  |
| ------ | ------------------------------------------------------------ | ------------------------------------------ |
| 200    | `{ "ok": true }`                                             | Success (auth cookie set via `Set-Cookie`) |
| 401    | `{ "message": "Invalid credentials" }`                       | Bad email/password                         |
| 429    | `{ "code": "RATE_LIMITED", "message": "Too many requests" }` | Rate limit                                 |

---

### POST /api/auth/forgot

Request a password-reset link. **Anti-enumeration** - always returns 204 regardless of whether the email exists.

| Field   | Location | Required | Description |
| ------- | -------- | -------- | ----------- |
| `email` | body     | yes      | User email  |

**Rate limit**: 20 requests / 10 min per IP.

> **Backend-authoritative abuse cooldown (live):** In addition to the IP rate limit, a per-user DB-backed cooldown of 180 seconds is enforced. If an active unexpired reset token was already issued for the same user within the last 180 s, the re-send is suppressed silently. The catch block is fail-closed - any DB error during the cooldown check also returns 204. The IP rate-limit response is also 204 (not 429) to preserve consistent anti-enumeration posture.

**Responses**:

| Status | Body | Condition                                                    |
| ------ | ---- | ------------------------------------------------------------ |
| 204    | -    | Always (anti-enumeration, including rate limit and cooldown) |

---

### POST /api/auth/reset

Consume a password-reset token and set a new password.

| Field      | Location | Required | Description                                             |
| ---------- | -------- | -------- | ------------------------------------------------------- |
| `token`    | body     | yes      | Raw reset token (hex)                                   |
| `password` | body     | yes      | New password — must satisfy PASSWORD_POLICY_V1 (see §5) |

**Rate limit**: 40 requests / 10 min per IP.

**Behaviour**: Atomically consumes the token; hashes and stores the new password.

**Responses**:

| Status | Body                                                         | Condition                                                     |
| ------ | ------------------------------------------------------------ | ------------------------------------------------------------- |
| 204    | -                                                            | Password reset                                                |
| 400    | `{ "code": "<PASSWORD_*>", "message": "Invalid password" }`  | Password fails PASSWORD_POLICY_V1. **Token is NOT consumed.** |
| 400    | `{ "message": "Unable to reset password" }`                  | Invalid, expired, or already-used token (no code field)       |
| 429    | `{ "code": "RATE_LIMITED", "message": "Too many requests" }` | Rate limit                                                    |

---

### POST /api/auth/signup-link

Request a magic signup link via email. **Anti-enumeration** - always returns 204.

| Field   | Location | Required | Description |
| ------- | -------- | -------- | ----------- |
| `email` | body     | yes      | User email  |

**Rate limits**:

- **IP**: 30 requests / 10 min.
- **Per-email**: 5 requests / 10 min.

**Responses**:

| Status | Body                                                         | Condition                 |
| ------ | ------------------------------------------------------------ | ------------------------- |
| 204    | -                                                            | Always (anti-enumeration) |
| 429    | `{ "code": "RATE_LIMITED", "message": "Too many requests" }` | Rate limit                |

---

### POST /api/auth/signup-consume

Consume a magic signup link token and create an account with a password.

| Field      | Location | Required | Description                                                         |
| ---------- | -------- | -------- | ------------------------------------------------------------------- |
| `token`    | body     | yes      | Raw signup token (hex)                                              |
| `password` | body     | yes      | Password for new account — must satisfy PASSWORD_POLICY_V1 (see §5) |
| `consent`  | body     | yes      | Boolean `true` - explicit acceptance of Terms & Privacy             |

**Rate limit**: 60 requests / 10 min per IP.

**Behaviour**:

1. Atomically consumes the signup token.
2. Enforces `consent === true` (strict boolean); rejects with neutral 400 otherwise.
3. Creates user with `isVerified: true` - the magic link already proves email ownership.
4. Persists `termsAcceptedAt`, `privacyAcceptedAt`, `termsVersion`, `privacyVersion` from SSoT version constants.
5. Hashes password with `bcrypt` (salt rounds 10).

**Responses**:

| Status | Body                                                                 | Condition                                                                 |
| ------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 200    | `{ "ok": true }`                                                     | Account created (auth cookie set via `Set-Cookie`)                        |
| 400    | `{ "code": "<PASSWORD_*>", "message": "Unable to complete signup" }` | Password fails PASSWORD_POLICY_V1. Token NOT consumed (see §5 for codes). |
| 400    | `{ "message": "Unable to complete signup" }`                         | Any other failure (anti-enum)                                             |

> **Design note**: neutral 400 on _all_ failures including rate limit (enterprise contract - no distinction between invalid token and rate limit).

---

### GET /api/auth/me

Return the current user's profile. Requires authentication (browser: httpOnly cookie; tooling/curl: `Authorization: Bearer <token>`).

**Rate limit**: none (auth-gated).

**Cache control**: `no-store` - response must not be cached; `Vary: Authorization, Cookie`.

**Responses**:

| Status | Body                                                     | Condition       |
| ------ | -------------------------------------------------------- | --------------- |
| 200    | `{ "email": "...", "role": "user", "isVerified": true }` | Success         |
| 401    | `{ "message": "Invalid token" }`                         | Missing/bad JWT |
| 404    | `{ "message": "User not found" }`                        | Deleted user    |

**Example**:

```bash
curl https://cardigo.co.il/api/auth/me \
  -H "Authorization: Bearer eyJ..."
# → 200 {"email":"user@example.com","role":"user","isVerified":true}
```

---

### POST /api/auth/verify-email

Consume an email-verification token and mark the account as verified.

| Field   | Location | Required | Description                  |
| ------- | -------- | -------- | ---------------------------- |
| `token` | body     | yes      | Raw verification token (hex) |

**Rate limit**: 30 requests / 10 min per IP.

**Behaviour**:

1. Hashes the raw token with SHA-256 to look up the DB record.
2. Atomically marks the token as used (`findOneAndUpdate` with `usedAt: null` guard).
3. Sets `isVerified: true` on the corresponding user.

**Responses**:

| Status | Body                                                         | Condition            |
| ------ | ------------------------------------------------------------ | -------------------- |
| 200    | `{ "verified": true }`                                       | Email verified       |
| 400    | `{ "message": "Invalid or expired token" }`                  | Missing/expired/used |
| 429    | `{ "code": "RATE_LIMITED", "message": "Too many requests" }` | Rate limit           |

**Example**:

```bash
curl -X POST https://cardigo.co.il/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token":"a1b2c3..."}'
# → 200 {"verified":true}
```

---

### POST /api/auth/resend-verification

Resend the email-verification link. Requires authentication (browser: httpOnly cookie; tooling/curl: `Authorization: Bearer <token>`).

**Rate limit**: 5 requests / 10 min per IP.

**Behaviour**:

1. Checks `isVerified` - if already verified, returns `{ "message": "Already verified" }`.
2. Generates a new 32-byte token (24 h TTL).
3. Sends verification link via Mailjet (best-effort).
4. Invalidates all previous unused tokens for this user.
5. **Anti-enumeration**: always returns success, even on internal errors.

**Responses**:

| Status | Body                                                         | Condition        |
| ------ | ------------------------------------------------------------ | ---------------- |
| 200    | `{ "message": "Already verified" }`                          | Already verified |
| 200    | `{ "message": "Verification email sent" }`                   | Sent / attempted |
| 401    | `{ "message": "Invalid token" }`                             | Missing/bad JWT  |
| 404    | `{ "message": "User not found" }`                            | Deleted user     |
| 429    | `{ "code": "RATE_LIMITED", "message": "Too many requests" }` | Rate limit       |

---

## 3. Rate Limiting Summary

All rate limits use an **in-memory Map** per endpoint keyed by client IP. Window is **10 minutes**, auto-swept every 500 requests.

| Endpoint               | Limit  | Key       | Window |
| ---------------------- | ------ | --------- | ------ |
| `/register`            | 20 req | IP        | 10 min |
| `/login`               | 30 req | IP        | 10 min |
| `/forgot`              | 20 req | IP        | 10 min |
| `/reset`               | 40 req | IP        | 10 min |
| `/signup-link`         | 30 req | IP        | 10 min |
| `/signup-link`         | 5 req  | per-email | 10 min |
| `/signup-consume`      | 60 req | IP        | 10 min |
| `/verify-email`        | 30 req | IP        | 10 min |
| `/resend-verification` | 5 req  | IP        | 10 min |

> **Note**: In-memory rate limiting resets on server restart and does not share state across multiple instances. For multi-instance deployments, a Redis-backed limiter is recommended.

---

## 4. Email Verification Flow

### Path A - Standard Registration (`/register`)

```
User submits email + password
  → Account created (isVerified: false, no auth cookie)
  → Verification email sent (best-effort, 24 h TTL)
  → User clicks link → /verify-email consumes token
  → isVerified set to true
```

### Path B - Magic Link Signup (`/signup-link` → `/signup-consume`)

```
User requests magic link → email sent
  → User clicks link → provides password via /signup-consume
  → Account created with isVerified: true
  (magic link already proves email ownership - no separate verification needed)
```

### Token lifecycle

- Generated via `crypto.randomBytes(32).toString("hex")` (64 hex chars).
- Stored in DB as `SHA-256(raw)` hash - the raw token is _never_ persisted.
- **TTL**: 24 hours (`VERIFY_TOKEN_TTL_MS`).
- Atomically consumed: `findOneAndUpdate` with `usedAt: null, expiresAt: { $gt: now }`.
- On resend, previous unused tokens for the same user are invalidated.

### Model: `EmailVerificationToken`

| Field       | Type     | Index  | Description                    |
| ----------- | -------- | ------ | ------------------------------ |
| `userId`    | ObjectId | yes    | Ref → User                     |
| `tokenHash` | String   | unique | SHA-256 of the raw token       |
| `expiresAt` | Date     | yes    | When the token becomes invalid |
| `usedAt`    | Date     | yes    | `null` until consumed          |

---

## 5. Password Policy

### PASSWORD_POLICY_V1 (active — 2026-04)

All password-creation and password-change flows enforce PASSWORD_POLICY_V1. Login (`/login`) must NOT apply this policy — bcrypt.compare is unconditional on the login path.

SSoT files:

- Backend: `backend/src/utils/passwordPolicy.js`
- Frontend: `frontend/src/utils/passwordPolicy.js`

| Rule                 | Detail                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Required             | Non-empty string                                                       |
| Min length           | **8 characters**                                                       |
| Max length           | **72 characters** (bcrypt truncation guard)                            |
| No whitespace        | Space, tab, newline, and all `\s` characters rejected                  |
| Printable ASCII only | charCodes 33–126 (`/^[\x21-\x7E]+$/`); rejects Hebrew, Cyrillic, emoji |
| Lowercase required   | At least one `[a-z]`                                                   |
| Uppercase required   | At least one `[A-Z]`                                                   |
| Digit required       | At least one `[0-9]`                                                   |
| Symbol required      | At least one printable non-alphanumeric ASCII character                |

Validation is deterministic early-return: the first failing rule determines the returned code. The password is never logged, trimmed, normalized, or echoed.

### Error codes

| Code                           | Condition                               |
| ------------------------------ | --------------------------------------- |
| `PASSWORD_REQUIRED`            | Missing or empty                        |
| `PASSWORD_TOO_SHORT`           | Fewer than 8 characters                 |
| `PASSWORD_TOO_LONG`            | More than 72 characters                 |
| `PASSWORD_CONTAINS_WHITESPACE` | Contains any whitespace                 |
| `PASSWORD_CONTAINS_NON_ASCII`  | Contains non-printable-ASCII characters |
| `PASSWORD_MISSING_LOWERCASE`   | No lowercase English letter             |
| `PASSWORD_MISSING_UPPERCASE`   | No uppercase English letter             |
| `PASSWORD_MISSING_DIGIT`       | No digit                                |
| `PASSWORD_MISSING_SYMBOL`      | No printable ASCII symbol               |

### Route coverage

| Route                        | Enforcement                                                                                                                    | Error response                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| `/auth/register`             | full validation                                                                                                                | `400 { code: "<PASSWORD_*>", message: "Invalid password" }`          |
| `/auth/signup-consume`       | full validation                                                                                                                | `400 { code: "<PASSWORD_*>", message: "Unable to complete signup" }` |
| `/auth/reset`                | full validation — token NOT consumed on failure                                                                                | `400 { code: "<PASSWORD_*>", message: "Invalid password" }`          |
| `/account/change-password`   | applies to `newPassword` only — `currentPassword` is credential verification, not policy-validated                             | `400 { code: "<PASSWORD_*>", message: "Unable to change password" }` |
| `/invites/accept` (new-user) | policy enforced as boolean gate — invalid password returns `404/notFound`, same as invalid token, to preserve anti-enumeration | `404 { message: "Not found" }`                                       |
| `/auth/login`                | **EXEMPT** — policy must not gate login; bcrypt.compare is unconditional                                                       | —                                                                    |

### Hashing

| Rule        | Value  |
| ----------- | ------ |
| Hashing     | bcrypt |
| Salt rounds | 10     |

---

## 6. Environment Variables

| Variable                     | Required | Default                                                                  | Description                                                                |
| ---------------------------- | -------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| `CORS_ORIGINS`               | prod     | (empty = allow all)                                                      | Comma-separated allowed origins                                            |
| `JWT_SECRET`                 | yes      | -                                                                        | HS256 signing key                                                          |
| `SITE_URL`                   | prod     | `http://localhost:5173`                                                  | Base URL for links in emails                                               |
| `MAILJET_API_KEY`            | yes\*    | -                                                                        | Mailjet public key                                                         |
| `MAILJET_SECRET_KEY`         | yes\*    | -                                                                        | Mailjet private key                                                        |
| `MAILJET_FROM_EMAIL`         | no       | `noreply@cardigo.co.il`                                                  | Sender email                                                               |
| `MAILJET_FROM_NAME`          | no       | `Cardigo`                                                                | Sender display name                                                        |
| `MAILJET_VERIFY_SUBJECT`     | no       | `אימות כתובת האימייל` (Verify your email)                                | Subject for verification emails                                            |
| `MAILJET_VERIFY_TEXT_PREFIX` | no       | `כדי להשלים את ההרשמה, נא לאמת את כתובת האימייל על ידי לחיצה על הקישור.` | Body prefix for verification emails                                        |
| `EMAIL_BLOCK_SECRET`         | yes      | -                                                                        | HMAC-SHA256 key for deleted-email tombstone hashing (fail-fast at startup) |

\* If Mailjet keys are not configured, email sending is skipped (best-effort).

---

## 7. Security Design Decisions

### Anti-enumeration

- `/register` returns a generic `409 "Unable to register"` - does not reveal whether the email exists or is permanently blocked.
- `/forgot` always returns `204` regardless of email existence.
- `/signup-link` always returns `204` - including when the email is permanently blocked.
- `/signup-consume` always returns `400` on any failure - no distinction between rate limit, invalid token, blocked email, or duplicate user.
- `/invites/accept` (new-user branch) returns `404` on blocked email - consistent with the existing anti-enumeration posture for that route.
- `/resend-verification` always returns `200` - does not expose internal errors.

### Token storage

All security tokens (password-reset, signup-link, email-verification) are stored as **SHA-256 hashes** in the database. The raw token appears only in the email link and is never persisted.

### Atomic consumption

Token consumption uses MongoDB's `findOneAndUpdate` with a `usedAt: null` predicate to prevent race-condition reuse.

### JWT

- Algorithm: HS256 (via `jsonwebtoken`).
- Payload: `{ userId }`.
- Expiry: **7 days**.
- No refresh-token mechanism currently implemented.

### JWT session invalidation after password change

All existing JWT sessions are invalidated server-side when a user changes their password via `/auth/reset` or `/account/change-password`.

- Mechanism: `User.passwordChangedAt` (Date, default `null`) is written with `new Date()` on every successful password change.
- `requireAuth` and `optionalAuth` middlewares perform an async DB read of `passwordChangedAt` and compare against the token's `iat`. Tokens issued before the last password change are rejected (`requireAuth` → 401; `optionalAuth` → silent credential drop, public fallback).
- `requireAdmin` performs the same check using the existing DB read (no additional query).
- `null` / absent value means "no change event yet" - all tokens are fresh (backward-compatible with pre-existing accounts).
- Same-second safety: `iat >= changedAtSec` (tokens issued in the same clock second as the change are FRESH).
- Helper: `backend/src/utils/isTokenFresh.js`.
- **Admin coverage note:** static proof via `requireAdmin` code path + import sanity was accepted during verification. Live admin fixture was not available in the test environment at time of audit.

### bcrypt

- Salt rounds: **10**.
- Used for all password hashing (registration, reset, magic-link signup).

### Account-creation consent

Consent to Terms of Use and Privacy Policy is required on all account-creation flows:

| Flow                                     | Consent required | Enforcement                                                              |
| ---------------------------------------- | ---------------- | ------------------------------------------------------------------------ |
| `/register`                              | yes              | `consent === true` (strict boolean); rejects with `400 CONSENT_REQUIRED` |
| `/signup-consume`                        | yes              | `consent === true`; rejects with neutral `400`                           |
| `/invites/accept` (new-user branch)      | yes              | `consent === true`; rejects with `404` (anti-enumeration)                |
| `/invites/accept` (existing-user branch) | no               | Existing user already consented at account creation                      |

On success, all consent-bearing flows persist: `termsAcceptedAt`, `privacyAcceptedAt`, `termsVersion`, `privacyVersion` on the User document.

**Important distinction:** Email-ownership proof (magic link, invite token) is sufficient for `isVerified: true`, but is **not** sufficient for consent. Consent requires explicit UI capture and strict boolean validation.

Version constants are managed in `backend/src/utils/consentVersions.js`; see `docs/runbooks/auth-registration-consent.md` for operational guidance.

### Password-reset: implemented runtime design

#### Guiding principle

> **Response must wait for durable reset intent and durable delivery intent, but must not wait for external mail transport.**

#### Current implementation (live as of 2026-03-29)

`POST /auth/forgot` persists two durable DB writes before responding with `204`, then defers all mail transport - including usable token generation - to a background worker (`resetMailWorker`):

| Aspect             | Behaviour                                                                                                                                                                          |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reset intent       | `ActivePasswordReset` upserted per-user (`findOneAndReplace`, unique `userId` index) with `status: 'pending-delivery'` - new request atomically replaces prior intent before `204` |
| Token generation   | `rawToken` (32 random bytes) generated **only in memory** by `resetMailWorker` at delivery time - no plaintext secret ever persisted at any point                                  |
| Token invalidation | Prior active record atomically replaced by the upsert - no separate invalidation step, no post-response side effect                                                                |
| Mail delivery      | `MailJob` (`userId` only, no email or token snapshot) persisted before `204` - worker resolves `User.email` at send time via `User.findById`                                       |
| Transport          | `resetMailWorker` drains `MailJob` queue asynchronously (default: every 60 s, 30 s initial delay)                                                                                  |
| Response floor     | Uniform 50 ms minimum floor (`FORGOT_RESPONSE_FLOOR_MS`) preserved on all `204` branches                                                                                           |
| Security invariant | Both durable writes complete before `204` - no security-critical side-effect executes after the response                                                                           |

**Cooldown semantics (per-user DB-backed, 180 s):**

The cooldown queries `ActivePasswordReset` by `updatedAt`. Suppression is status-aware:

- **Suppress** if `APR.status === 'active'` - a usable link has already been delivered to this user.
- **Suppress** if `APR.status === 'pending-delivery'` AND a live `MailJob` exists (`status: pending|processing`, not expired) - delivery pipeline is in flight.
- **Do NOT suppress** if `APR.status === 'pending-delivery'` but no live `MailJob` exists - self-heal path: cooldown allows a retry which replaces the orphaned `APR` and creates a new `MailJob`.
- **Fail-closed**: any DB error during cooldown check returns `204` without writes (anti-enumeration preserved).

**Collections introduced:**

| Collection             | Purpose                                                                | PII stored                         |
| ---------------------- | ---------------------------------------------------------------------- | ---------------------------------- |
| `activepasswordresets` | One-active-per-user reset intent; `tokenHash` set by worker on deliver | `userId` only                      |
| `mailjobs`             | Durable delivery intent for worker queue                               | `userId` only - no email, no token |

#### Transition: dual-read on /auth/reset (temporary)

`POST /auth/reset` uses a temporary dual-read to support `PasswordReset` tokens issued before the Slice 2+3 cutover:

1. **Primary** - `ActivePasswordReset.findOneAndUpdate({tokenHash, status:'active', ...})`
2. **Legacy fallback** - `PasswordReset.findOneAndUpdate({tokenHash, ...})` - runs only if primary returns `null`

All existing `PasswordReset` tokens expire within 30 minutes of the `/forgot` cutover (`RESET_TOKEN_TTL_MS = 30 min`). **Deferred cleanup:** remove the fallback read, the `PasswordReset` import from `auth.routes.js`, and `PasswordReset.model.js` in the next release cycle after the window has closed.

#### First-version delivery policy

The first implementation does **not** perform blind automatic retry with a regenerated token when mail-delivery outcome is ambiguous. If the Mailjet response is uncertain (network timeout, non-definitive error), the `MailJob` is left in `processing` state for operator inspection rather than immediately regenerating a new `rawToken` and overwriting the prior `tokenHash`. Rationale: regenerating a token on an ambiguous outcome would invalidate a link that may already have been delivered, locking the user out of a working link without certainty.

See `docs/runbooks/auth-forgot-reset-runbook.md` for stuck-job operator guidance.

#### DB / index prerequisites (applied 2026-03-29)

Migration script: `npm run migrate:active-password-reset-indexes` (`backend/scripts/migrate-active-password-reset-indexes.mjs`)

**`activepasswordresets` indexes:**

| Index                        | Key             | Unique | Note                                                                        |
| ---------------------------- | --------------- | ------ | --------------------------------------------------------------------------- |
| `userId_1_unique`            | `{userId:1}`    | yes    | One-active-per-user structural guarantee                                    |
| `tokenHash_1_partial_unique` | `{tokenHash:1}` | yes    | Partial filter `{tokenHash:{$type:"string"}}` - excludes absent `tokenHash` |
| `expiresAt_1`                | `{expiresAt:1}` | no     | Worker filter + cleanup                                                     |
| `status_1`                   | `{status:1}`    | no     | Worker polling                                                              |
| `usedAt_1`                   | `{usedAt:1}`    | no     | Cleanup / audit                                                             |

**`mailjobs` indexes:**

| Index                  | Key                       | Unique | Note                         |
| ---------------------- | ------------------------- | ------ | ---------------------------- |
| `userId_1`             | `{userId:1}`              | no     | Per-user lookup              |
| `status_1_expiresAt_1` | `{status:1, expiresAt:1}` | no     | Primary worker poll compound |
| `expiresAt_1`          | `{expiresAt:1}`           | no     | Cleanup sweep                |

### Deleted-email recreation block (self-delete only)

After a user performs a full self-delete of their account, the email address is **permanently blocked** from creating a new Cardigo account.

**Mechanism:**

- On self-delete, before the destructive cascade (card/media/data removal), the system writes a **tombstone document** to the `deletedemailblocks` collection.
- The tombstone stores an HMAC-SHA256 hash of the normalized email (`emailKey`), keyed by `EMAIL_BLOCK_SECRET`. The raw email is not stored.
- All account-creation flows check for the tombstone before proceeding.

**Guard coverage:**

| Flow                         | Blocked-email response     | Anti-enum shape            |
| ---------------------------- | -------------------------- | -------------------------- |
| `/auth/register`             | `409 "Unable to register"` | Same as duplicate email    |
| `/auth/signup-link`          | `204` (silent)             | Same as all other outcomes |
| `/auth/signup-consume`       | `400` (neutral)            | Same as all other failures |
| `/invites/accept` (new-user) | `404`                      | Same as not-found          |

**Ordering invariant:** Tombstone is written **before** the destructive cascade. If the cascade fails partway, the email remains blocked (fail-safe).

**Model: `DeletedEmailBlock`**

| Field          | Type     | Index  | Description                           |
| -------------- | -------- | ------ | ------------------------------------- |
| `emailKey`     | String   | unique | HMAC-SHA256 hash of normalized email  |
| `formerUserId` | ObjectId | -      | Reference to the deleted user (audit) |
| `createdAt`    | Date     | -      | Timestamp of deletion                 |

**DB / index prerequisite:**

| Index        | Key            | Unique | Note                                                                                                           |
| ------------ | -------------- | ------ | -------------------------------------------------------------------------------------------------------------- |
| `emailKey_1` | `{emailKey:1}` | yes    | Manual governance - must be created via `db.deletedemailblocks.createIndex({ emailKey: 1 }, { unique: true })` |

**Scope limitation:** Admin-delete does **not** create tombstones in this milestone. This is an intentional product decision - admin-delete policy is a separate future contour.

---

_Last updated: 2026-04-29 (PASSWORD_POLICY_V1: §5 rewritten with full complexity rules + error code table + route coverage; WEAK_PASSWORD retired; /register, /reset, /signup-consume request + response tables updated; prior entry: 2026-04-03 deleted-email block)_
