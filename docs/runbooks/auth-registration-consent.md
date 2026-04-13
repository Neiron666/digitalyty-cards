# Auth: Account-Creation Consent - Runbook

## Purpose

All account-creation flows require explicit consent to the Privacy Policy and Terms of Use (Israeli Privacy Law baseline).

Consent-bearing flows:

- `POST /api/auth/register`
- `POST /api/auth/signup-consume`
- `POST /api/invites/accept` (new-user branch only)

**Important:** Email-ownership proof (magic link, invite token) justifies `isVerified: true` but does **not** satisfy consent. These are distinct concerns.

---

## How It Works

All three consent-bearing flows follow the same truth chain:

1. **UI:** A required `firstName` field (given name) and a required consent checkbox linking to `/privacy` and `/terms`.
2. **Payload:** `firstName` (non-empty string, max 100 chars) and `consent: true` are both required in the request body.
3. **Backend:** enforces `firstName` non-empty (max 100 chars) and `consent === true` (strict boolean). Rejection behavior per flow:
    - `/register` → `400 { code: "CONSENT_REQUIRED" }`
    - `/signup-consume` → neutral `400` (anti-enumeration)
    - `/invites/accept` (new-user) → `404` (anti-enumeration)
4. **Persistence:** on successful account creation the User document receives:
    - `termsAcceptedAt` - timestamp of acceptance
    - `privacyAcceptedAt` - timestamp of acceptance
    - `termsVersion` - version string from SSoT constants
    - `privacyVersion` - version string from SSoT constants

### Flow-specific notes

- **Register:** `isVerified: false` (email verification sent separately).
- **Signup-consume:** `isVerified: true` (magic link proves email ownership).
- **Invite-accept new-user:** `isVerified: true` (invite token proves email ownership). Existing-user branch does not collect new consent.

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

1. Edit `backend/src/utils/consentVersions.js` - update the relevant version string.
2. Deploy backend.
3. All new registrations will record the new version string.

Existing users are **not affected** - consent fields are additive and null-safe.

---

## Manual Smoke Verification

Run from the repo root (PowerShell + `curl.exe`).

### 1. No consent field → 400

```powershell
curl.exe -s -X POST http://localhost:5000/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{"email":"smoke1@example.com","firstName":"Test","password":"Test1234!"}'
# expect: 400 { "code": "CONSENT_REQUIRED" }
```

### 2. consent: false → 400

```powershell
curl.exe -s -X POST http://localhost:5000/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{"email":"smoke2@example.com","firstName":"Test","password":"Test1234!","consent":false}'
# expect: 400 { "code": "CONSENT_REQUIRED" }
```

### 3. consent: "true" (string) → 400

```powershell
curl.exe -s -X POST http://localhost:5000/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{"email":"smoke3@example.com","firstName":"Test","password":"Test1234!","consent":"true"}'
# expect: 400 { "code": "CONSENT_REQUIRED" }
```

### 4. consent: true → success

```powershell
curl.exe -s -X POST http://localhost:5000/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{"email":"smoke4@example.com","firstName":"Test","password":"Test1234!","consent":true}'
# expect: 200 { "registered": true, "isVerified": false }
# No auth cookie is set - user must verify email first.
```

After test 4, verify the User document in MongoDB contains `termsAcceptedAt`, `privacyAcceptedAt`, `termsVersion`, and `privacyVersion` populated.

---

## Limits / Caveats

- `/privacy` and `/terms` pages are **engineering baseline content**, not lawyer-reviewed final legal text.
- Card editor / card-data consent is **out of scope** - deferred to a separate future task.
- Existing users have `null` consent fields - backward compatible, no migration required.
- Retroactive consent backfill for legacy null-consent users is intentionally deferred.
- Re-consent / version-bump flow is intentionally deferred.

---

## Related Files

| File                                          | Role                                              |
| --------------------------------------------- | ------------------------------------------------- |
| `frontend/src/pages/Register.jsx`             | Consent checkbox UI (register)                    |
| `frontend/src/pages/Register.module.css`      | Consent row styles (register)                     |
| `frontend/src/pages/SignupConsume.jsx`        | Consent checkbox UI (signup-consume)              |
| `frontend/src/pages/SignupConsume.module.css` | Consent row styles (signup-consume)               |
| `frontend/src/pages/InviteAccept.jsx`         | Consent checkbox UI (invite-accept, new-user)     |
| `frontend/src/pages/InviteAccept.module.css`  | Consent row styles (invite-accept)                |
| `frontend/src/services/auth.service.js`       | Sends `firstName` and `consent` params to backend |
| `backend/src/routes/auth.routes.js`           | Consent enforcement (register + signup-consume)   |
| `backend/src/routes/invites.routes.js`        | Consent enforcement (invite-accept new-user)      |
| `backend/src/models/User.model.js`            | Consent fields on User schema                     |
| `backend/src/utils/consentVersions.js`        | Version SSoT constants                            |
| `frontend/src/pages/Privacy.jsx`              | Privacy policy page                               |
| `frontend/src/pages/Terms.jsx`                | Terms of use page                                 |
