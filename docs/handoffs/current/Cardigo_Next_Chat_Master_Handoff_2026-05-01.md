# Cardigo Enterprise Project Handoff — Next Chat Master Brief

**Prepared for:** next ChatGPT window / continuing Cardigo project work  
**Project:** Cardigo — Israel-first digital business card SaaS  
**Current handoff date:** 2026-05-01  
**Most recent closed contour:** `PASSWORD_POLICY_V1` / `REGISTER_PASSWORD_POLICY_HARDENING`  
**Final rollout smoke date recorded:** 2026-04-29  

---

## 1. Executive Summary

Cardigo is an Israel-first / Israel-only SaaS product for professional digital business cards and mini business pages. The product enables Israeli business owners to create a modern digital card with contact actions, WhatsApp, phone, links, gallery, services, SEO/public pages, QR/OG sharing, analytics, leads, bookings, trial/premium lifecycle, org/B2B support, payments, receipts, and admin/operator controls.

The project is being built with strict enterprise discipline. ChatGPT is not a casual coding assistant here. ChatGPT acts as:

- Senior Project Architect
- Senior Full-Stack Engineer
- Senior Backend Engineer
- Senior Frontend Engineer
- Security Engineer
- Payment/Billing Lifecycle Engineer where relevant
- Enterprise Consultant
- Documentation / runbook / handoff owner

Copilot Agent is the executor only. Copilot must not make independent architecture/product/security boundary decisions.

The canonical workflow is:

```txt
Architecture / Intent
→ Phase 1 — Read-Only Audit with PROOF file:line-range
→ STOP
→ Phase 2 — Minimal Fix
→ STOP
→ Phase 3 — Verification with RAW stdout + EXIT
→ STOP
→ Documentation / Handoff
→ Rollout / Monitoring / Smoke
```

No code changes are allowed before audit. No task should move to the next phase until the current phase is fully closed, including all tails.

---

## 2. Non-Negotiable Project Rules

Every Copilot prompt for this project must begin with / include this project mode and constraints:

```txt
PROJECT MODE: Cardigo enterprise workflow.

Hard constraints:
- No git commands
- No inline styles
- CSS Modules only
- Flex only — no grid
- Mobile-first mandatory
- Typography policy:
  - font-size only via var(--fs-*)
  - --fs-* rem-only
  - no px/em/%/vw/vh/clamp/fluid
  - no calc(non-rem)
```

Additional tactical rules:

```txt
- No scope creep
- No “заодно поправил”
- No broad refactor unless explicitly approved and proven safest
- No formatting-only churn
- Always require PROOF file:line-range in audits
- Always inspect raw outputs before acceptance
- Verification must include RAW stdout + EXIT code
- Endpoint/manual smoke should use Windows PowerShell + curl.exe
- Do not use git commands
- Do not accept boundary decisions “by feel”
- Boundaries must be proven before implementation
- Do not change high-blast-radius files casually
- Any “two-phase” wording is shorthand only; canonical flow remains 3-phase plus docs/handoff
```

The user works on Windows. Prefer PowerShell commands and `curl.exe`.

---

## 3. Project Identity and Product Boundaries

### 3.1 Cardigo Identity

Cardigo is:

```txt
Israel-first / Israel-only SaaS for digital business cards and business mini-pages.
Hebrew / RTL-first UX.
Canonical domain: https://cardigo.co.il
```

Cardigo must not be mixed with Digitalyty in any user-facing or canonical layer.

Strict separation rule:

```txt
Cardigo ≠ Digitalyty
```

Do not mix Digitalyty into:

- canonical URLs
- SEO
- structured data
- public paths
- OG
- sitemap logic
- product copy
- analytics audiences
- route logic
- schema naming
- product positioning

### 3.2 Canonical Production Domain

```txt
https://cardigo.co.il
```

Non-www canonical.

### 3.3 Main Product Areas

Cardigo includes / is intended to include:

- public digital business card pages
- self-service card editor
- card preview rendering
- QR/public/OG URL generation
- SEO title/description and structured data
- gallery / services / links / contact actions
- WhatsApp / phone / external links
- lead capture
- booking / appointment request foundation
- analytics / owner tracking / consent-aware public tracking
- free / trial / premium lifecycle
- payment foundation through Tranzila
- YeshInvoice receipts / receipt cabinet
- org/B2B offline entitlement flow
- admin/operator tools
- auth / registration / forgot-reset / invite accept
- CI / sanity / manual index governance
- documentation / runbooks / handoffs

---

## 4. Tech Stack and Runtime Truth

### 4.1 Frontend

```txt
React + Vite
RTL-first
CSS Modules only
Flex only — no CSS Grid
Mobile-first
Token-based styling
Route-level SEO/head
Shared public + preview render chain
```

Important frontend invariants:

```txt
- No inline styles
- CSS Modules only
- Flex only
- Typography via var(--fs-*) only
- Preview-only styles only under [data-preview="phone"]
- templates registry only in frontend/src/templates/templates.config.js
- public/QR/OG URLs must come from backend DTO publicPath/ogPath
```

### 4.2 Backend

```txt
Node.js + Express
MongoDB + Mongoose
DTO-driven public truth
cookie-backed auth
CSRF/CORS/proxy hardened
auth/org/admin/payment/booking/leads/AI/content APIs
```

### 4.3 Infrastructure / Services

```txt
Netlify frontend/proxy/functions
Render backend
MongoDB Atlas
Supabase Storage
Mailjet
Tranzila payments/STO
YeshInvoice receipts/docs
Sentry/cron monitoring partially prepared
```

### 4.4 Operational DB

```txt
cardigo_prod
```

Manual Mongo index governance remains active:

```txt
MONGOOSE_AUTO_INDEX=false
MONGOOSE_AUTO_CREATE=false
```

Indexes must be applied only through explicit scripts/operator actions.

---

## 5. Architectural Invariants to Preserve

### 5.1 SSoT / Boundaries

```txt
- SSoT render chain for public + preview
- templates registry only in frontend/src/templates/templates.config.js
- skins token-only
- backend DTO publicPath/ogPath is the only source for public/QR/OG URLs
- sitemap must avoid N+1
- org security: membership gate before SEO/410 and anti-enumeration 404
- browser auth is cookie-backed; do not reintroduce localStorage token truth
```

### 5.2 High-Blast-Radius Areas

Do not touch casually:

```txt
- CardLayout DOM skeleton
- CardLayout.module.css
- preview wrapper / card boundary
- SettingsPanel broad sections
- Input.jsx shared component
- auth middleware
- payment lifecycle / receipt lifecycle
- provider notify/webhook paths
```

### 5.3 Motion Subsystem

Motion exists and is already verified. Do not casually change.

Rules:

```txt
- No JSX inline style props
- Only allowed style mutation carve-out:
  el.style.setProperty('--scroll-progress', '<numeric 0..1>') inside useScrollProgress
- Do not stack V1 reveal transform, V2 scroll transform, and hover transform on the same DOM node
- Motion allowed only in approved marketing/app-shell sections
- Motion forbidden in card-boundary and preview wrapper
```

---

## 6. Copilot Agent Working Formula

For every implementation request to Copilot:

1. Define contour name.
2. Define phase.
3. Define exact goal.
4. Define files in scope.
5. Define files out of scope.
6. Define hard constraints.
7. Require proof / raw outputs.
8. Require STOP after phase.

### 6.1 Phase 1 Prompt Pattern

```txt
Phase 1 — READ-ONLY AUDIT ONLY.

Do not modify files.
Do not create files.
Do not format.
Do not refactor.
Do not run migrations.
Do not run git commands.
Every claim must include PROOF file:line-range.
STOP after audit.
```

### 6.2 Phase 2 Prompt Pattern

```txt
Phase 2 — MINIMAL FIX ONLY.

Apply only the approved plan.
Touch only in-scope files.
No verification gates in this phase unless explicitly requested.
No docs unless this is a docs-only phase.
STOP after implementation summary.
```

### 6.3 Phase 3 Prompt Pattern

```txt
Phase 3 — PROOF / VERIFICATION ONLY.

Do not modify files.
Run required gates/smoke.
Provide RAW stdout + EXIT codes.
Provide file:line proof.
STOP after verification.
```

---

## 7. Current Closed Contour: PASSWORD_POLICY_V1

### 7.1 Final Status

```txt
REGISTER_PASSWORD_POLICY_HARDENING = CLOSED / PRODUCTION-READY / ROLLOUT SMOKE PASS
```

Closed phases:

```txt
TASK 1 — Backend Password Policy SSoT: CLOSED
TASK 2 — Backend Route Integration: CLOSED
TASK 3 — Frontend Password Policy UX SSoT: CLOSED
TASK 4 — /register UX Integration: CLOSED
TASK 5.1 — Other auth surfaces broad audit: CLOSED
TASK 5.2 — ResetPassword.jsx: CLOSED
TASK 5.3 — SignupConsume.jsx: CLOSED
TASK 5.4 — InviteAccept.jsx: CLOSED
TASK 5.5 — SettingsPanel change-password: CLOSED
TASK 6A — Final docs/rollout audit: CLOSED
TASK 6B — Docs/handoff update: CLOSED
TASK 6C — Final docs/handoff proof: CLOSED
Final rollout smoke closure appended to handoff: CLOSED
```

### 7.2 Canonical PASSWORD_POLICY_V1

```txt
required non-empty string
minLength = 8
maxLength = 72
no whitespace
printable ASCII only
lowercase required
uppercase required
digit required
symbol required
```

Stable error codes:

```txt
PASSWORD_REQUIRED
PASSWORD_TOO_SHORT
PASSWORD_TOO_LONG
PASSWORD_CONTAINS_WHITESPACE
PASSWORD_CONTAINS_NON_ASCII
PASSWORD_MISSING_LOWERCASE
PASSWORD_MISSING_UPPERCASE
PASSWORD_MISSING_DIGIT
PASSWORD_MISSING_SYMBOL
```

### 7.3 Backend SSoT

File:

```txt
backend/src/utils/passwordPolicy.js
```

Characteristics:

- pure ESM module
- no DB connection
- no env dependency
- no side effects
- frozen constants
- deterministic early-return validation
- no trim / normalize / mutate / log / echo of password
- safe charCode regexes, not `\S` or `\w`
- covered by `backend/scripts/sanity-imports.mjs`

### 7.4 Frontend SSoT

File:

```txt
frontend/src/utils/passwordPolicy.js
```

Exports:

```txt
PASSWORD_POLICY
PASSWORD_POLICY_ERROR_CODES
PASSWORD_POLICY_MESSAGES_HE
PASSWORD_POLICY_HELPER_TEXT_HE
PASSWORD_POLICY_REQUIREMENTS_HE
validatePasswordPolicy
getPasswordPolicyMessage
getPasswordPolicyChecklist
```

It mirrors backend policy and provides Hebrew messages + checklist helpers.

### 7.5 Backend Route Coverage

```txt
/auth/register
/auth/signup-consume
/auth/reset
/invites/accept
/account/change-password
```

Important behavior:

- `/auth/register` returns `400 { code: "<PASSWORD_*>", message: "Invalid password" }`
- `/auth/signup-consume` returns `400 { code: "<PASSWORD_*>", message: "Unable to complete signup" }`
- `/auth/reset` returns `400 { code: "<PASSWORD_*>", message: "Invalid password" }`
- `/account/change-password` returns `400 { code: "<PASSWORD_*>", message: "Unable to change password" }` only for `newPassword`
- `/invites/accept` enforces policy as boolean gate but returns `404/notFound`, no `PASSWORD_*` code

### 7.6 Frontend Surface Coverage

```txt
Register.jsx
ResetPassword.jsx
SignupConsume.jsx
InviteAccept.jsx
SettingsPanel.jsx change-password
```

All relevant surfaces now include:

- client-side policy validation
- Hebrew helper text / checklist where applicable
- field-level errors
- maxLength = 72
- no inline styles
- CSS Modules checklist styles
- flex-only CSS
- typography tokens only

### 7.7 Security Exceptions

Do not change without architecture review:

#### Login Exception

```txt
/login must NOT apply PASSWORD_POLICY_V1.
Existing credential verification remains bcrypt.compare only.
```

#### InviteAccept Anti-Enumeration Exception

```txt
/invites/accept must NOT return PASSWORD_* codes.
Invalid password returns same 404/notFound as invalid token.
Frontend InviteAccept must NOT map backend PASSWORD_* in catch.
Client-side UX validation is allowed.
```

#### SettingsPanel Current Password Exception

```txt
currentPassword is credential verification only.
Do not apply policy/helper/checklist/meta to currentPassword.
Wrong currentPassword remains generic form-level error.
PASSWORD_POLICY_V1 applies only to newPassword / pwNew.
```

---

## 8. PASSWORD_POLICY_V1 Verification and Rollout Smoke

### 8.1 Final Gates

Final gates passed:

```txt
backend sanity:imports PASS
frontend check:inline-styles PASS
frontend check:skins PASS
frontend check:contract PASS
frontend build PASS
```

### 8.2 UI Smoke

User reported UI works correctly.

Minimum UI smoke passed:

```txt
/register password UX: PASS
SettingsPanel change-password UX: PASS
```

Token/link-based browser flows can be checked later when controlled reset/signup/invite links are available:

```txt
/reset
/signup-consume
/invite accept
```

### 8.3 Backend Inline SSoT Smoke

Executed from backend:

```txt
backend/src/utils/passwordPolicy.js
```

Verified:

```txt
validatePasswordPolicy('Ab1!') => PASSWORD_TOO_SHORT
validatePasswordPolicy('Cardigo1!' + Hebrew letters) => PASSWORD_CONTAINS_NON_ASCII
validatePasswordPolicy('Cardigo12') => PASSWORD_MISSING_SYMBOL
validatePasswordPolicy('Cardigo1!') => ok true, code null
```

Full deterministic 10-case smoke returned:

```txt
ALL PASS
```

Covered:

```txt
PASSWORD_REQUIRED
PASSWORD_TOO_SHORT
PASSWORD_TOO_LONG
PASSWORD_CONTAINS_WHITESPACE
PASSWORD_CONTAINS_NON_ASCII
PASSWORD_MISSING_LOWERCASE
PASSWORD_MISSING_UPPERCASE
PASSWORD_MISSING_DIGIT
PASSWORD_MISSING_SYMBOL
valid password -> null
```

### 8.4 Production curl Smoke Status

Production curl to `/api/**` was blocked by Netlify gate:

```txt
{"ok":false,"code":"GATE_REQUIRED"}
```

This is classified as:

```txt
Access-layer gate behavior, not password-policy failure.
```

The gate layer:

```txt
frontend/netlify/functions/proxy.js
```

checks:

```txt
__Host-cardigo_gate
```

against:

```txt
CARDIGO_GATE_COOKIE_VALUE
```

The auth function:

```txt
frontend/netlify/functions/auth.js
```

sets:

```txt
__Host-cardigo_gate
```

after successful password auth against:

```txt
CARDIGO_GATE_PASSWORD
```

The attempted gate auth returned:

```txt
GATE_BAD_PASSWORD
```

This means the endpoint works, but the supplied gate password was not the current Netlify env value.

No need to keep chasing production curl for this contour because:

- UI smoke passed through browser
- backend pure SSoT smoke passed
- production curl failure was gate-layer only

### 8.5 Handoff Closure

Updated handoff:

```txt
docs/handoffs/current/Cardigo_Enterprise_Handoff_PasswordPolicy_V1_Closed_2026-04-29.md
```

Final rollout smoke closure section was appended.

---

## 9. Documentation Updated for PASSWORD_POLICY_V1

Docs updated and verified:

```txt
docs/api-security.md
docs/runbooks/auth-forgot-reset-runbook.md
docs/governance-hardening-cycle-2026-03.md
docs/handoffs/current/Cardigo_Enterprise_Handoff_PasswordPolicy_V1_Closed_2026-04-29.md
```

Not updated because not needed:

```txt
SECURITY_AUTH_INVITES.md
auth-registration-consent.md
backend-verification-and-deploy.md
README.md
```

Important doc truth:

```txt
WEAK_PASSWORD is retired.
PASSWORD_* family is canonical.
```

If `WEAK_PASSWORD` appears now, it should only appear as a retirement note, not active behavior.

---

## 10. Deferred Debt After PASSWORD_POLICY_V1

Only deferred debt from this contour:

```txt
SettingsPanel.module.css
- .accountError raw rgba
- .pwSuccess raw rgba
```

This is pre-existing shared-class CSS token debt.

Do not fix inside auth/password/payment contours. Future contour should be:

```txt
SettingsPanel shared status classes CSS token cleanup
```

Rules for that future cleanup:

- audit first
- determine all usages of `.accountError` and `.pwSuccess`
- token-safe replacement only
- no unrelated SettingsPanel refactor
- no grid
- no inline styles
- no broad visual redesign

---

## 11. Other Major Project Truths / Closed Areas

### 11.1 Auth / Security

Current auth truth:

```txt
browser runtime is cookie-backed
browser auth no longer relies on localStorage token truth
register/login verification hardened
response-body JWT tokens removed from browser auth paths
```

Do not reintroduce browser localStorage auth or response-body JWT usage.

### 11.2 Payment / Billing

Payment/billing decisions require Payment Security Engineer mindset:

- credential safety
- token handling
- redaction
- idempotency
- least exposure
- auditability
- failure containment
- production cutover risk
- rollback readiness
- anti-fraud / amount-locking

#### Tranzila First Payment

Hosted checkout via DirectNG:

```txt
https://directng.tranzila.com/{terminalname}/iframenew.php
```

Important truth:

- server notify is entitlement truth
- payment success redirect is UX only
- PaymentTransaction ledger written before User/Card mutation
- duplicate providerTxnId must be idempotent
- no sensitive token logging
- no auto-publish from payment

#### STO / Recurring

STO creation is best-effort and gated.

Important:

```txt
TRANZILA_STO_CREATE_ENABLED=false default production posture
```

Recurring notify endpoint uses token gate and anti-oracle behavior.

#### YeshInvoice

YeshInvoice receipts are sandbox-proven end-to-end but production rollout remains blocked by open gates/operator decisions.

Current active docs include YeshInvoice groundwork and receipt cabinet handoffs.

### 11.3 Org Annual Entitlement

Org/B2B decision:

```txt
Organization cards do NOT use ordinary self-service payment checkout.
Org cards are B2B/admin-managed.
Platform admin grants annual org-level entitlement manually after offline payment terms.
```

Must not touch:

```txt
Tranzila
STO
YeshInvoice
/payment/checkout
User.subscription
PaymentTransaction
Receipt
```

for org entitlement unless explicitly opened.

### 11.4 CI / GitHub Actions / Mongo

Dedicated CI cluster truth:

```txt
CI uses MONGO_URI_DRIFT_CHECK
Mongo-touching CI workflows must not fallback to production MONGO_URI
```

Manual index governance remains active.

Future maintenance already noted:

```txt
After current production-readiness/documentation scopes are closed,
do docs audit/update first,
then handle GitHub Actions Node.js 20 action-runtime deprecation maintenance.
```

---

## 12. Recommended Next Steps

Since PASSWORD_POLICY_V1 is fully closed, do not reopen it unless there is a real regression.

Recommended next work should be selected as a new bounded contour.

Potential next contours:

### Option A — Production Rollout Closure Log / Deploy Tracking

If not already deployed or if rollout needs formal tracking:

```txt
CARDIGO_PRODUCTION_ROLLOUT_TRACKING_PASSWORD_POLICY_V1
```

Scope:

- record backend deploy status
- record frontend deploy status
- record UI smoke status
- do not change code
- optional deploy logs/handoff note only

### Option B — SettingsPanel CSS Token Debt

```txt
SETTINGSPANEL_SHARED_STATUS_CLASSES_TOKEN_CLEANUP
```

Scope:

- `.accountError`
- `.pwSuccess`
- audit all usages first
- minimal token replacement only
- no unrelated SettingsPanel work

### Option C — Next Production-Readiness Scope

Choose from previously deferred areas:

- auth/registration hardening continuation
- API error hardening for token/invalid-input paths
- monitoring / Sentry / cron readiness
- CI/CD maintenance
- GitHub Actions Node.js 20 action-runtime deprecation
- stress/security/performance testing
- docs audit for current project truth

### Option D — Billing / Payments

Only if explicitly reopened:

- Tranzila production go-live gates
- YeshInvoice production provider truth
- receipt/profile/legal alignment
- STO sandbox cleanup
- payment lifecycle hardening

Do not mix billing with auth/password cleanup.

---

## 13. How the Next ChatGPT Should Behave

The next ChatGPT must:

1. Treat this file as a project instruction/handoff.
2. Continue acting as Senior Project Architect.
3. Enforce phased workflow.
4. Refuse broad, risky, or ambiguous implementation without audit.
5. Use enterprise reasoning.
6. Protect Cardigo invariants.
7. Give Copilot clear phase-specific prompts.
8. Require raw proof and EXIT codes.
9. Keep documentation current.
10. Avoid “quick fix” thinking.

The next ChatGPT must not:

- skip audit
- accept Copilot claims without proof
- allow git commands
- allow inline styles
- allow CSS Grid
- allow typography literals
- modify high-blast-radius files casually
- mix Cardigo and Digitalyty
- re-open closed contours without reason
- weaken security boundaries
- leak secrets or cookies
- ask for passwords in chat

---

## 14. Standard Copilot Prompt Prefix

Use this before future task-specific prompts:

```txt
Ты — Copilot Agent, acting as senior full-stack engineer with strong SEO/information-architecture awareness and enterprise discipline.

PROJECT MODE: Cardigo enterprise workflow.

Hard constraints:
- No git commands
- No inline styles
- CSS Modules only
- Flex only — no grid
- Mobile-first mandatory
- Typography policy:
  - font-size only via var(--fs-*)
  - --fs-* rem-only
  - no px/em/%/vw/vh/clamp/fluid
  - no calc(non-rem)
```

Then add task-specific:

```txt
Contour:
...

Phase:
...

Goal:
...

Files in scope:
...

Files out of scope:
...

Required proof:
...

STOP after this phase.
```

---

## 15. Final Current Status

```txt
Cardigo project continues.
PASSWORD_POLICY_V1 is fully closed.
Do not code more in that scope.
Choose next bounded contour.
Maintain enterprise workflow.
```

Final password-policy status:

```txt
REGISTER_PASSWORD_POLICY_HARDENING
= CLOSED / PRODUCTION-READY / ROLLOUT SMOKE PASS
```

