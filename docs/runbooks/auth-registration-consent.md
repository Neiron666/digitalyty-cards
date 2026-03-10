# Auth: Registration Consent — Runbook

## Purpose

Registration requires explicit consent to the Privacy Policy and Terms of Use (Israeli Privacy Law baseline).
This is the engineering consent gate for `POST /api/auth/register`.

---

## How It Works

1. Frontend: Register form renders a required checkbox linking to `/privacy` and `/terms`.
2. Payload: `{ email, password, consent: true }` is sent to backend.
3. Backend: enforces `consent === true` (strict boolean). Any other value → `400 { code: "CONSENT_REQUIRED" }`.
4. Persistence: on successful registration the User document receives:
    - `termsAcceptedAt` — timestamp of acceptance
    - `privacyAcceptedAt` — timestamp of acceptance
    - `termsVersion` — version string from SSoT constants
    - `privacyVersion` — version string from SSoT constants

---

## Version SSoT

Policy version constants live in a single file:

```
backend/src/utils/consentVersions.js
```

Exports: `CURRENT_TERMS_VERSION`, `CURRENT_PRIVACY_VERSION`.

---

## How to Bump Versions

When the legal text of `/privacy` or `/terms` is materially updated:

1. Edit `backend/src/utils/consentVersions.js` — update the relevant version string.
2. Deploy backend.
3. All new registrations will record the new version string.

Existing users are **not affected** — consent fields are additive and null-safe.

---

## Manual Smoke Verification

Run from the repo root (PowerShell + `curl.exe`).

### 1. No consent field → 400

```powershell
curl.exe -s -X POST http://localhost:5000/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{"email":"smoke1@example.com","password":"Test1234!"}'
# expect: 400 { "code": "CONSENT_REQUIRED" }
```

### 2. consent: false → 400

```powershell
curl.exe -s -X POST http://localhost:5000/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{"email":"smoke2@example.com","password":"Test1234!","consent":false}'
# expect: 400 { "code": "CONSENT_REQUIRED" }
```

### 3. consent: "true" (string) → 400

```powershell
curl.exe -s -X POST http://localhost:5000/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{"email":"smoke3@example.com","password":"Test1234!","consent":"true"}'
# expect: 400 { "code": "CONSENT_REQUIRED" }
```

### 4. consent: true → success

```powershell
curl.exe -s -X POST http://localhost:5000/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{"email":"smoke4@example.com","password":"Test1234!","consent":true}'
# expect: 200 { "token": "eyJ...", "isVerified": false }
```

After test 4, verify the User document in MongoDB contains `termsAcceptedAt`, `privacyAcceptedAt`, `termsVersion`, and `privacyVersion` populated.

---

## Limits / Caveats

- `/privacy` and `/terms` pages are **engineering baseline content**, not lawyer-reviewed final legal text.
- Card editor / card-data consent is **out of scope** — deferred to a separate future task.
- Existing users have `null` consent fields — backward compatible, no migration required.

---

## Related Files

| File                                     | Role                             |
| ---------------------------------------- | -------------------------------- |
| `frontend/src/pages/Register.jsx`        | Consent checkbox UI              |
| `frontend/src/pages/Register.module.css` | Consent row styles               |
| `frontend/src/services/auth.service.js`  | Sends `consent` param to backend |
| `backend/src/routes/auth.routes.js`      | Strict enforcement + persistence |
| `backend/src/models/User.model.js`       | Consent fields on User schema    |
| `backend/src/utils/consentVersions.js`   | Version SSoT constants           |
| `frontend/src/pages/Privacy.jsx`         | Privacy policy page              |
| `frontend/src/pages/Terms.jsx`           | Terms of use page                |
