# API Security — Auth Endpoints & Policies

> **Tier 2 — Architecture / Ops Contract**
> Canonical reference for auth endpoint behaviour, rate limiting, and security hardening.

---

## Table of Contents

1. [Global Middleware](#1-global-middleware)
2. [Auth Endpoints](#2-auth-endpoints)
    - [POST /api/auth/register](#post-apiauthregister)
    - [POST /api/auth/login](#post-apiauthlogin)
    - [POST /api/auth/forgot](#post-apiauthforgot)
    - [POST /api/auth/reset](#post-apiauthreset)
    - [POST /api/auth/signup-link](#post-apiauthsignup-link)
    - [POST /api/auth/signup-consume](#post-apiauthsignup-consume)
    - [GET /api/auth/me](#get-apiauthme)
    - [POST /api/auth/verify-email](#post-apiauthverify-email)
    - [POST /api/auth/resend-verification](#post-apiauthresend-verification)
3. [Rate Limiting Summary](#3-rate-limiting-summary)
4. [Email Verification Flow](#4-email-verification-flow)
5. [Password Policy](#5-password-policy)
6. [Environment Variables](#6-environment-variables)
7. [Security Design Decisions](#7-security-design-decisions)

---

## 1. Global Middleware

### Helmet

`helmet` is applied at the top of the Express middleware stack (`backend/src/app.js`).

| Header                | Value / Behaviour                                |
| --------------------- | ------------------------------------------------ |
| contentSecurityPolicy | **disabled** — CSP is delegated to reverse-proxy |
| frameguard            | `sameorigin` — prevents click-jacking            |
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

| Field      | Location | Required | Description                    |
| ---------- | -------- | -------- | ------------------------------ |
| `email`    | body     | yes      | User email (normalized)        |
| `password` | body     | yes      | Plaintext password (≥ 8 chars) |

**Rate limit**: 20 requests / 10 min per IP.

**Behaviour**:

1. Validates email format and password length (≥ 8 characters).
2. Case-insensitive duplicate check (2-step: exact match → collation fallback).
3. Hashes password with `bcrypt` (salt rounds 10).
4. Creates user with `isVerified: false`.
5. Best-effort: claims any anonymous card linked to the session.
6. Best-effort: generates a verification token (24 h TTL), sends a link via Mailjet.

**Responses**:

| Status | Body                                                         | Condition                      |
| ------ | ------------------------------------------------------------ | ------------------------------ |
| 200    | `{ "token": "<jwt>", "isVerified": false }`                  | Account created                |
| 400    | `{ "message": "Invalid email" }`                             | Malformed email                |
| 400    | `{ "message": "Invalid password" }`                          | Missing or non-string password |
| 400    | `{ "message": "Password must be at least 8 characters" }`    | Too short                      |
| 409    | `{ "message": "Unable to register" }`                        | Duplicate email (anti-enum)    |
| 429    | `{ "code": "RATE_LIMITED", "message": "Too many requests" }` | Rate limit exceeded            |

**Example**:

```bash
curl -X POST https://cardigo.co.il/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"securePass1"}'
# → 200 {"token":"eyJ...","isVerified":false}
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
3. Returns a JWT on success.

**Responses**:

| Status | Body                                                         | Condition          |
| ------ | ------------------------------------------------------------ | ------------------ |
| 200    | `{ "token": "<jwt>" }`                                       | Success            |
| 401    | `{ "message": "Invalid credentials" }`                       | Bad email/password |
| 429    | `{ "code": "RATE_LIMITED", "message": "Too many requests" }` | Rate limit         |

---

### POST /api/auth/forgot

Request a password-reset link. **Anti-enumeration** — always returns 204 regardless of whether the email exists.

| Field   | Location | Required | Description |
| ------- | -------- | -------- | ----------- |
| `email` | body     | yes      | User email  |

**Rate limit**: 20 requests / 10 min per IP.

**Responses**:

| Status | Body                                                         | Condition                 |
| ------ | ------------------------------------------------------------ | ------------------------- |
| 204    | —                                                            | Always (anti-enumeration) |
| 429    | `{ "code": "RATE_LIMITED", "message": "Too many requests" }` | Rate limit                |

---

### POST /api/auth/reset

Consume a password-reset token and set a new password.

| Field      | Location | Required | Description              |
| ---------- | -------- | -------- | ------------------------ |
| `token`    | body     | yes      | Raw reset token (hex)    |
| `password` | body     | yes      | New password (≥ 8 chars) |

**Rate limit**: 40 requests / 10 min per IP.

**Behaviour**: Atomically consumes the token; hashes and stores the new password.

**Responses**:

| Status | Body                                                         | Condition             |
| ------ | ------------------------------------------------------------ | --------------------- |
| 204    | —                                                            | Password reset        |
| 400    | `{ "message": "Unable to reset password" }`                  | Invalid/expired token |
| 429    | `{ "code": "RATE_LIMITED", "message": "Too many requests" }` | Rate limit            |

---

### POST /api/auth/signup-link

Request a magic signup link via email. **Anti-enumeration** — always returns 204.

| Field   | Location | Required | Description |
| ------- | -------- | -------- | ----------- |
| `email` | body     | yes      | User email  |

**Rate limits**:

- **IP**: 30 requests / 10 min.
- **Per-email**: 5 requests / 10 min.

**Responses**:

| Status | Body                                                         | Condition                 |
| ------ | ------------------------------------------------------------ | ------------------------- |
| 204    | —                                                            | Always (anti-enumeration) |
| 429    | `{ "code": "RATE_LIMITED", "message": "Too many requests" }` | Rate limit                |

---

### POST /api/auth/signup-consume

Consume a magic signup link token and create an account with a password.

| Field      | Location | Required | Description                          |
| ---------- | -------- | -------- | ------------------------------------ |
| `token`    | body     | yes      | Raw signup token (hex)               |
| `password` | body     | yes      | Password for new account (≥ 8 chars) |

**Rate limit**: 60 requests / 10 min per IP.

**Behaviour**:

1. Atomically consumes the signup token.
2. Creates user with `isVerified: true` — the magic link already proves email ownership.
3. Hashes password with `bcrypt` (salt rounds 10).

**Responses**:

| Status | Body                                         | Condition               |
| ------ | -------------------------------------------- | ----------------------- |
| 200    | `{ "token": "<jwt>" }`                       | Account created         |
| 400    | `{ "message": "Unable to complete signup" }` | Any failure (anti-enum) |

> **Design note**: neutral 400 on _all_ failures including rate limit (enterprise contract — no distinction between invalid token and rate limit).

---

### GET /api/auth/me

Return the current user's profile. Requires JWT (`Authorization: Bearer <token>`).

**Rate limit**: none (auth-gated).

**Cache control**: `no-store` — response must not be cached; `Vary: Authorization`.

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

Resend the email-verification link. Requires JWT (`Authorization: Bearer <token>`).

**Rate limit**: 5 requests / 10 min per IP.

**Behaviour**:

1. Checks `isVerified` — if already verified, returns `{ "message": "Already verified" }`.
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

### Path A — Standard Registration (`/register`)

```
User submits email + password
  → Account created (isVerified: false)
  → JWT returned immediately (user can access the app)
  → Verification email sent (best-effort, 24 h TTL)
  → User clicks link → /verify-email consumes token
  → isVerified set to true
```

### Path B — Magic Link Signup (`/signup-link` → `/signup-consume`)

```
User requests magic link → email sent
  → User clicks link → provides password via /signup-consume
  → Account created with isVerified: true
  (magic link already proves email ownership — no separate verification needed)
```

### Token lifecycle

- Generated via `crypto.randomBytes(32).toString("hex")` (64 hex chars).
- Stored in DB as `SHA-256(raw)` hash — the raw token is _never_ persisted.
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

| Rule       | Value       | Enforced on                              |
| ---------- | ----------- | ---------------------------------------- |
| Min length | **8 chars** | `/register`, `/signup-consume`, `/reset` |
| Hashing    | bcrypt      | Salt rounds: 10                          |

> Future: consider adding complexity rules (uppercase, digit, symbol).

---

## 6. Environment Variables

| Variable                     | Required | Default                                                                  | Description                         |
| ---------------------------- | -------- | ------------------------------------------------------------------------ | ----------------------------------- |
| `CORS_ORIGINS`               | prod     | (empty = allow all)                                                      | Comma-separated allowed origins     |
| `JWT_SECRET`                 | yes      | —                                                                        | HS256 signing key                   |
| `SITE_URL`                   | prod     | `http://localhost:5173`                                                  | Base URL for links in emails        |
| `MAILJET_API_KEY`            | yes\*    | —                                                                        | Mailjet public key                  |
| `MAILJET_SECRET_KEY`         | yes\*    | —                                                                        | Mailjet private key                 |
| `MAILJET_FROM_EMAIL`         | no       | `noreply@cardigo.co.il`                                                  | Sender email                        |
| `MAILJET_FROM_NAME`          | no       | `Cardigo`                                                                | Sender display name                 |
| `MAILJET_VERIFY_SUBJECT`     | no       | `אימות כתובת האימייל` (Verify your email)                                | Subject for verification emails     |
| `MAILJET_VERIFY_TEXT_PREFIX` | no       | `כדי להשלים את ההרשמה, נא לאמת את כתובת האימייל על ידי לחיצה על הקישור.` | Body prefix for verification emails |

\* If Mailjet keys are not configured, email sending is skipped (best-effort).

---

## 7. Security Design Decisions

### Anti-enumeration

- `/register` returns a generic `409 "Unable to register"` — does not reveal whether the email exists.
- `/forgot` always returns `204` regardless of email existence.
- `/signup-link` always returns `204`.
- `/signup-consume` always returns `400` on any failure — no distinction between rate limit, invalid token, or duplicate user.
- `/resend-verification` always returns `200` — does not expose internal errors.

### Token storage

All security tokens (password-reset, signup-link, email-verification) are stored as **SHA-256 hashes** in the database. The raw token appears only in the email link and is never persisted.

### Atomic consumption

Token consumption uses MongoDB's `findOneAndUpdate` with a `usedAt: null` predicate to prevent race-condition reuse.

### JWT

- Algorithm: HS256 (via `jsonwebtoken`).
- Payload: `{ userId }`.
- Expiry: **7 days**.
- No refresh-token mechanism currently implemented.

### bcrypt

- Salt rounds: **10**.
- Used for all password hashing (registration, reset, magic-link signup).

---

_Last updated: 2025-01_
