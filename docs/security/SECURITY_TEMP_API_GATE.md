# Temporary API Gate (Password + Cookie) + Proxy Origin Lock

This repo currently uses a **temporary password gate** to restrict access to proxied backend endpoints during testing, plus a **shared-secret origin lock** to prevent direct access to the Render backend origin.

This document is the operational SSoT for this mechanism (how it works, how to operate it, and how to safely remove it later).

## Scope (what is gated)

Only these paths are proxied via Netlify and therefore gated:

- `/api/*`
- `/og/*`
- `/sitemap.xml`

Netlify redirects proof: `frontend/public/_redirects` routes these paths to `/.netlify/functions/proxy/...`.

## Components

### 1) Gate page: `/gate.html`

- Static page used to enter the password and obtain the session cookie.
- It POSTs the password to `/.netlify/functions/auth` and uses `credentials: 'include'` so the browser stores the cookie.

Implementation proof:

- `frontend/public/gate.html`

### 2) Netlify Function: `auth` (password → cookie)

- Endpoint: `/.netlify/functions/auth`
- Accepts `POST` only.
- Parses body as JSON or `application/x-www-form-urlencoded`.
- Compares provided password to `CARDIGO_GATE_PASSWORD` using timing-safe compare.
- On success sets cookie:

    `__Host-cardigo_gate=<CARDIGO_GATE_COOKIE_VALUE>; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200`

- On failure returns `401` with `{ ok:false, code:"GATE_BAD_PASSWORD" }`.
- If misconfigured (missing env), returns `500` with `{ ok:false, code:"GATE_MISCONFIG" }`.

Implementation proof:

- `frontend/netlify/functions/auth.js`

Required Netlify env vars:

- `CARDIGO_GATE_PASSWORD` — the temporary password (do not commit).
- `CARDIGO_GATE_COOKIE_VALUE` — random opaque cookie value (treat as secret).
- `CARDIGO_GATE_DEBUG` — optional, set to `1` only for debugging parsing issues.

### 3) Netlify Function: `proxy` (cookie check + backend proxy)

- Endpoint: `/.netlify/functions/proxy/*`
- Allowlist: only proxies `/api/*`, `/og/*`, `/sitemap.xml`.
- Gate behavior:
    - If `CARDIGO_GATE_COOKIE_VALUE` is missing ⇒ `500` `GATE_MISCONFIG`
    - If cookie `__Host-cardigo_gate` is missing or does not match ⇒ `401` `GATE_REQUIRED`
    - Otherwise forwards the request upstream.

- Adds header `x-cardigo-proxy-secret` (from `CARDIGO_PROXY_SHARED_SECRET`) to the upstream request.

Implementation proof:

- `frontend/netlify/functions/proxy.js`

Required Netlify env vars:

- `CARDIGO_PROXY_SHARED_SECRET` — shared secret used to authenticate Netlify → backend.

### 4) Backend origin lock (Render): shared-secret middleware

Backend (Render) rejects requests unless the shared secret header matches.

- If `CARDIGO_PROXY_SHARED_SECRET` is set on the backend:
    - Missing/wrong `x-cardigo-proxy-secret` ⇒ `403 { ok:false, code:"PROXY_FORBIDDEN" }`

Implementation proof:

- `backend/src/app.js`

Required Render env vars:

- `CARDIGO_PROXY_SHARED_SECRET` — must match the Netlify value.

## Expected error codes (debug checklist)

- `401 GATE_REQUIRED`: you did not pass the `__Host-cardigo_gate` cookie or it mismatched.
- `500 GATE_MISCONFIG`: Netlify functions missing required env vars.
- `403 PROXY_FORBIDDEN`: backend origin lock blocked the request (usually direct Render access, or Netlify proxy secret mismatch).

## Operational runbook

### A) Get access in browser

1. Open `https://cardigo.co.il/gate.html`
2. Enter password
3. On success you are redirected to `/edit/card/templates`
4. Any XHR calls to `/api/*` should now succeed (cookie present)

### B) Smoke via curl (cookie jar)

1. Without cookie (should be blocked by gate):

```bash
curl.exe -i https://cardigo.co.il/api/health
```

2. Obtain cookie:

```bash
curl.exe -i -c cg_cookies.txt -X POST "https://cardigo.co.il/.netlify/functions/auth" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data "password=<YOUR_PASSWORD>"
```

3. With cookie:

```bash
curl.exe -i -b cg_cookies.txt https://cardigo.co.il/api/health
```

4. Direct Render origin should be blocked:

```bash
curl.exe -i https://cardigo-backend.onrender.com/api/health
```

## How to open the API for broad use (safe removal plan)

This gate is intentionally temporary. Removing it should be a **deliberate** change with clear acceptance criteria.

### Step 0 — Decide desired security model

Choose one of these target states:

- **A) Keep origin locked, remove password gate**: users access APIs via `cardigo.co.il` only, but without `/gate.html`.
- **B) Allow direct backend origin access**: remove origin lock (not recommended unless you have another control layer).

### Step 1 — Remove the password gate (Netlify side)

- Remove `/gate.html` usage in operations (optional: delete the file later).
- Remove `auth` function and all `CARDIGO_GATE_*` env vars.
- In the `proxy` function, remove the cookie requirement (the allowlist can remain).

Acceptance criteria:

- `/api/health` works without prior password.
- No `GATE_REQUIRED`/`GATE_MISCONFIG` responses.

### Step 2 — Replace gate with real auth (product-grade)

Options (pick based on product requirements):

- Use existing **JWT** auth flows for user-specific endpoints and keep anonymous rules where needed.
- Add OAuth/OIDC for external consumers (if this becomes a public API).

Acceptance criteria:

- Auth requirements are enforced per-route and align with backend policy.
- No reliance on a shared password for gating.

### Step 3 — Keep or remove origin lock (Render side)

If you keep origin lock:

- Keep `CARDIGO_PROXY_SHARED_SECRET` on both Netlify and backend.
- Rotate the secret when removing the gate (recommended).

If you remove origin lock:

- Remove the middleware in `backend/src/app.js` and delete `CARDIGO_PROXY_SHARED_SECRET` from backend env.

Acceptance criteria:

- No existence leaks beyond policy.
- Health checks and public pages continue to work.

## Notes

- `__Host-` cookie prefix implies `Secure` + `Path=/` and no `Domain=` attribute; keep these invariants.
- Do not commit secrets (passwords/cookie values/shared secrets) into the repo.
