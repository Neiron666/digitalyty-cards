# Cardigo Enterprise Handoff — PASSWORD_POLICY_V1

## Status: CLOSED / PASS — 2026-04-29

Contour: REGISTER_PASSWORD_POLICY_HARDENING_TASK_1 through TASK_5.5

---

## 1. Executive Summary

The password enforcement model has been upgraded from minimum-length-only (8 chars, no complexity, single WEAK_PASSWORD code) to PASSWORD_POLICY_V1: a full 9-rule complexity policy with 9 distinct machine-readable error codes, consistent enforcement across 5 backend routes, and a matching frontend UX layer (real-time checklist + helper text + backend error mapping) across 5 surfaces.

WEAK*PASSWORD is permanently retired. The canonical error code family is PASSWORD*\*.

All frontend gates passed EXIT:0. No DB migration. No environment variable change. No index change. No backward-incompatible API contract change. Standard deploy.

---

## 2. Canonical PASSWORD_POLICY_V1

### Rules

| #   | Rule                 | Detail                                                                 |
| --- | -------------------- | ---------------------------------------------------------------------- |
| 1   | Required             | Non-empty string                                                       |
| 2   | Min length           | 8 characters                                                           |
| 3   | Max length           | 72 characters (bcrypt truncation guard)                                |
| 4   | No whitespace        | Space, tab, newline, any `\s` rejected                                 |
| 5   | Printable ASCII only | charCodes 33–126 (`/^[\x21-\x7E]+$/`); rejects Hebrew, Cyrillic, emoji |
| 6   | Lowercase required   | At least one `[a-z]`                                                   |
| 7   | Uppercase required   | At least one `[A-Z]`                                                   |
| 8   | Digit required       | At least one `[0-9]`                                                   |
| 9   | Symbol required      | At least one printable non-alphanumeric ASCII character                |

Validation is deterministic early-return: first failing rule determines the code. Password is never logged, trimmed, normalized, or echoed.

### Error codes

| Code                           | Triggered when                              |
| ------------------------------ | ------------------------------------------- |
| `PASSWORD_REQUIRED`            | Missing or empty string                     |
| `PASSWORD_TOO_SHORT`           | Fewer than 8 characters                     |
| `PASSWORD_TOO_LONG`            | More than 72 characters                     |
| `PASSWORD_CONTAINS_WHITESPACE` | Any whitespace character present            |
| `PASSWORD_CONTAINS_NON_ASCII`  | Any character outside printable ASCII range |
| `PASSWORD_MISSING_LOWERCASE`   | No lowercase English letter                 |
| `PASSWORD_MISSING_UPPERCASE`   | No uppercase English letter                 |
| `PASSWORD_MISSING_DIGIT`       | No digit                                    |
| `PASSWORD_MISSING_SYMBOL`      | No printable ASCII symbol                   |

### SSoT files

| Scope    | File                                   |
| -------- | -------------------------------------- |
| Backend  | `backend/src/utils/passwordPolicy.js`  |
| Frontend | `frontend/src/utils/passwordPolicy.js` |

Both files export `PASSWORD_POLICY`, `PASSWORD_POLICY_ERROR_CODES`, and `validatePasswordPolicy` with identical logic. Frontend additionally exports `PASSWORD_POLICY_MESSAGES_HE`, `PASSWORD_POLICY_HELPER_TEXT_HE`, `PASSWORD_POLICY_REQUIREMENTS_HE`, `getPasswordPolicyMessage`, and `getPasswordPolicyChecklist`.

---

## 3. Backend Coverage

| Route                             | Enforcement                   | Error shape                                                          | Exception                                                                                                                                                                  |
| --------------------------------- | ----------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /auth/register`             | Full validation               | `400 { code: "<PASSWORD_*>", message: "Invalid password" }`          | —                                                                                                                                                                          |
| `POST /auth/signup-consume`       | Full validation               | `400 { code: "<PASSWORD_*>", message: "Unable to complete signup" }` | Token NOT consumed on failure; neutral 400 pool                                                                                                                            |
| `POST /auth/reset`                | Full validation               | `400 { code: "<PASSWORD_*>", message: "Invalid password" }`          | Token NOT consumed on failure; user can correct and retry                                                                                                                  |
| `POST /account/change-password`   | Applied to `newPassword` only | `400 { code: "<PASSWORD_*>", message: "Unable to change password" }` | `currentPassword` is credential verification only — not policy-validated. Wrong `currentPassword` → generic `400 { message: "Unable to change password" }`, no code field. |
| `POST /invites/accept` (new-user) | Boolean gate                  | `404 { message: "Not found" }`                                       | Anti-enumeration: invalid password returns notFound, identical to invalid token. No PASSWORD\_\* code ever returned from this route.                                       |
| `POST /auth/login`                | **EXEMPT**                    | —                                                                    | Policy must NOT gate login. `bcrypt.compare` is unconditional.                                                                                                             |

Backend proof lines (as of 2026-04-29):

- `auth.routes.js:22` — import validatePasswordPolicy
- `auth.routes.js:194` — /register call site
- `auth.routes.js:682` — /signup-consume call site
- `auth.routes.js:806` — /reset call site, token NOT consumed on failure
- `invites.routes.js:132` — boolean gate: `if (!user && !validatePasswordPolicy(password).ok) return notFound(res)`
- `account.routes.js:675` — /change-password call site (newPassword only)

---

## 4. Frontend Coverage

| Surface                  | File                                                      | validatePasswordPolicy | Checklist          | Helper text        | Backend error mapping                                  |
| ------------------------ | --------------------------------------------------------- | ---------------------- | ------------------ | ------------------ | ------------------------------------------------------ |
| Register                 | `frontend/src/pages/Register.jsx`                         | submit + onBlur state  | yes                | yes                | code.startsWith("PASSWORD\_") → field-level            |
| Reset password           | `frontend/src/pages/ResetPassword.jsx`                    | submit + onBlur state  | yes                | yes                | code.startsWith("PASSWORD\_") → field-level            |
| Signup consume           | `frontend/src/pages/SignupConsume.jsx`                    | submit + onBlur state  | yes                | yes                | code.startsWith("PASSWORD\_") → field-level            |
| Invite accept            | `frontend/src/pages/InviteAccept.jsx`                     | submit, new-user only  | yes, new-user only | yes, new-user only | NO PASSWORD\_\* mapping in catch (anti-enum)           |
| Settings change-password | `frontend/src/components/editor/panels/SettingsPanel.jsx` | submit, `pwNew` only   | yes                | yes                | code.startsWith("PASSWORD\_") → pwNewError field-level |

Each surface has a corresponding CSS module with 5 checklist classes:
`.pwChecklist`, `.pwChecklistItem`, `.pwChecklistItem::before`, `.pwChecklistItemMet`, `.pwChecklistItemMet::before`

All checklist styles use CSS Modules only. No inline styles. No CSS Grid. Tokens only.

---

## 5. Security Exceptions — Must Not Change Without Architecture Review

| Exception                                   | Rule                                                                                                             | Rationale                                                                                                                                            |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Login exempt                                | `/auth/login` must NOT apply PASSWORD_POLICY_V1                                                                  | Existing users may have passwords that pass bcrypt but fail the new complexity rules. Blocking login would lock out legitimate users.                |
| InviteAccept no PASSWORD\_\* codes          | Backend returns 404, not PASSWORD\_\*, for invalid password on invite-accept                                     | Prevents enumeration of whether a valid invite token exists.                                                                                         |
| InviteAccept frontend no PASSWORD\_\* catch | `InviteAccept.jsx` catch block does NOT map PASSWORD\_\* codes                                                   | Backend never returns them; any hypothetical 400 with a PASSWORD\_\* code from this route would fall through to the generic "קישור אינו תקין" error. |
| currentPassword not policy-validated        | `SettingsPanel.jsx` and `/account/change-password` do NOT apply PASSWORD_POLICY_V1 to the current password field | currentPassword is a credential check, not a new password. Its value is passed to bcrypt.compare only.                                               |

---

## 6. Verification Summary

All gates run from `frontend/` cwd after each code change phase.

TASK 5.2C (ResetPassword.jsx):

- check:inline-styles EXIT:0
- check:skins EXIT:0
- check:contract EXIT:0
- build EXIT:0

TASK 5.3C (SignupConsume.jsx):

- check:inline-styles EXIT:0
- check:skins EXIT:0
- check:contract EXIT:0
- build EXIT:0

TASK 5.4C (InviteAccept.jsx):

- check:inline-styles EXIT:0
- check:skins EXIT:0
- check:contract EXIT:0
- build EXIT:0

TASK 5.5C (SettingsPanel.jsx) — final gate run 2026-04-29:

- check:inline-styles EXIT:0
- check:skins EXIT:0
- check:contract EXIT:0
- build EXIT:0 (361 modules, 3.06s)

Backend sanity-imports covers passwordPolicy SSoT:

- `backend/scripts/sanity-imports.mjs` line 61: `{ label: "passwordPolicy", relPath: "src/utils/passwordPolicy.js" }`
- sanity:imports EXIT:0

---

## 7. Rollout Readiness

| Concern                     | Status                                                                                                                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DB migration                | Not required. No new collections, no new indexes, no schema change.                                                                                                                   |
| Environment variable change | Not required.                                                                                                                                                                         |
| Index change                | Not required.                                                                                                                                                                         |
| User migration              | Not required. Existing users are unaffected until they change their password.                                                                                                         |
| Backward compatibility      | Maintained. The old WEAK*PASSWORD code was not in a client-facing contract that required compatibility. Frontend already mapped it; frontend now maps the broader PASSWORD*\* family. |
| Deploy procedure            | Standard frontend + backend deploy. No special ordering.                                                                                                                              |

---

## 8. Post-Deploy Smoke Checklist

Run manually after deploy to production (https://cardigo.co.il):

1. Register with a password that is too short (e.g. `Ab1!` — 4 chars). Expect: field-level Hebrew error, checklist shown, form not submitted.
2. Register with a valid password (e.g. `Cardigo1!`). Expect: success, email verification sent.
3. Forgot-password flow → reset with a password missing a symbol (e.g. `Cardigo12`). Expect: field-level Hebrew error, token NOT consumed (can retry).
4. Forgot-password flow → reset with a valid password (e.g. `Cardigo1!`). Expect: 204, redirect to login.
5. Sign up via magic link → signup-consume with a password that contains Hebrew characters. Expect: field-level Hebrew error for non-ASCII.
6. Sign up via magic link → signup-consume with a valid password. Expect: account created, auth cookie set.
7. Settings → change password with a new password that has no uppercase (e.g. `cardigo1!`). Expect: field-level error on the new-password field. Current-password field shows no checklist.
8. Invite accept (new-user flow) → enter an invalid password. Expect: generic "הקישור אינו תקין" error (NOT a password-specific message). This confirms anti-enumeration is intact.

---

## 9. Deferred Debt

| Item                                | Location                                                                 | Notes                                                                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `.accountError` uses raw rgba color | `frontend/src/components/editor/panels/SettingsPanel.module.css:108-110` | Pre-existing. Should be converted to token `var(--c-danger)` in a future CSS token cleanup pass. Not a password-policy concern. |
| `.pwSuccess` uses raw rgba color    | `frontend/src/components/editor/panels/SettingsPanel.module.css:218-220` | Pre-existing. Same token cleanup pass.                                                                                          |

---

## 10. Next Recommended Steps

1. TASK 6C: Re-run all 4 frontend gates from `frontend/` cwd and paste raw outputs + EXIT codes as final closure proof for this contour.
2. Standard deploy (frontend + backend). No special ordering required.
3. Run post-deploy smoke checklist (§8) against production.
4. Close contour REGISTER*PASSWORD_POLICY_HARDENING_TASK*\*.

---

## Final Rollout Smoke Closure — 2026-04-29

UI smoke was manually verified by owner as PASS.

Backend SSoT inline smoke was executed from backend/src/utils/passwordPolicy.js via Node --input-type=module inline import (no DB, no server, no network). Exit code 0. Output: ALL PASS.

Verified codes:

- PASSWORD_REQUIRED — PASS
- PASSWORD_TOO_SHORT — PASS
- PASSWORD_TOO_LONG — PASS
- PASSWORD_CONTAINS_WHITESPACE — PASS
- PASSWORD_CONTAINS_NON_ASCII — PASS
- PASSWORD_MISSING_LOWERCASE — PASS
- PASSWORD_MISSING_UPPERCASE — PASS
- PASSWORD_MISSING_DIGIT — PASS
- PASSWORD_MISSING_SYMBOL — PASS
- valid password (Cardigo1!) — ok:true, code:null — PASS

Production curl smoke was blocked by Netlify gate (GATE_REQUIRED) without a valid \_\_Host-cardigo_gate cookie. Classified as access-layer behavior, not a password-policy failure. Password policy validation is proven via backend SSoT inline smoke above.

No DB migration required. No env var required. No index apply required. No user migration required.

Final verdict: PASSWORD*POLICY_V1 rollout smoke PASS. Contour REGISTER_PASSWORD_POLICY_HARDENING_TASK*\* is closed.

---

_Created: 2026-04-29_
_Author: Copilot Agent (senior engineer mode)_
_Contour: REGISTER_PASSWORD_POLICY_HARDENING_TASK_1–5.5_
