# Cardigo — Enterprise Master Handoff / Next Chat Playbook

**Дата:** 2026-04-18  
**Тема:** закрытие CI-only Atlas cluster rollout, GitHub Actions Mongo hardening, production Mongo credential rotation как следующий security contour, и полный enterprise playbook для следующего окна ChatGPT.

---

## 0. Назначение этого файла

Этот файл — handoff и рабочая инструкция для следующего окна ChatGPT по проекту **Cardigo**.

Его нужно воспринимать как:

- master handoff для продолжения работы;
- operational truth memo;
- архитектурный конспект проекта;
- playbook для работы с Copilot Agent;
- anti-drift и anti-regression инструкцию;
- статусный срез после закрытия Mongo CI / GitHub Actions hardening цикла;
- стартовую точку для следующего security contour: **production Mongo credential rotation**.

Главная цель этого handoff: следующий чат должен сразу понимать, что уже закрыто, что нельзя reopen-ить casually, какие правила обязательны, и как продолжать работу по-взрослому, без хаоса, scope creep и случайных production regressions.

---

## 1. Что такое Cardigo

**Cardigo** — Israel-first / Israel-only SaaS для цифровых визитных карточек и мини-бизнес-страниц.

Cardigo давно уже не просто “визитка”. Текущая продуктовая формула:

> **Cardigo = digital business card + mini business page + sharing layer + SEO layer + analytics layer + self-service editing + operational business layer + booking-ready foundation + premium/billing foundation.**

Проект включает или должен включать:

- цифровую визитную карточку;
- публичную карточку `/card/:slug`;
- org-aware публичную карточку `/c/:orgSlug/:slug`;
- мини-страницу бизнеса;
- WhatsApp / phone / social / QR entry points;
- self-service editor/cabinet;
- premium/free/trial lifecycle;
- gallery, services, business hours;
- booking foundation;
- lead/contact surface;
- SEO/canonical/OG/JSON-LD;
- analytics / visits / first-party tracking;
- owner GTM / GA4 / Meta Pixel support under consent;
- admin/operator tooling;
- AI-assisted content surfaces;
- legal/privacy/accessibility pages;
- public marketing pages `/`, `/cards`, `/pricing`, `/blog`, `/guides`, `/contact`;
- CI/CD governance and operational runbooks.

### 1.1 Product identity

- Product: **Cardigo**.
- Canonical production domain: **https://cardigo.co.il**.
- Market: Israel-first / Hebrew / RTL-first.
- Baseline: Israel-only, unless explicitly changed later.

### 1.2 Brand boundary

Critical invariant:

- **Cardigo** and **Digitalyty** must not be mixed.

Do not mix Cardigo and Digitalyty in:

- canonical URLs;
- SEO metadata;
- structured data;
- public paths;
- sitemap/OG logic;
- user-facing product copy;
- product naming;
- analytics audiences;
- route logic;
- public card DTOs;
- marketing attribution.

Digitalyty may exist as a separate brand/business context, but Cardigo production truth must remain clean.

---

## 2. Tech stack and core runtime truth

### 2.1 Frontend

- React + Vite.
- RTL-first.
- CSS Modules only.
- No inline styles.
- Flex only — **no CSS grid**.
- Mobile-first mandatory.
- Route-level SEO/head handling.
- Shared render chain for public + preview.
- Preview-only styles only under `[data-preview="phone"]`.
- Typography policy:
  - `font-size` only via `var(--fs-*)`;
  - `--fs-*` rem-only;
  - no px/em/%/vw/vh/clamp/fluid;
  - no `calc(non-rem)`;
  - do not invent token names ad hoc;
  - do not leak card-scope tokens into app/public/auth/admin/site-shell.

### 2.2 Backend

- Node.js + Express.
- MongoDB Atlas + Mongoose.
- Manual Mongo index governance.
- DTO-driven public truth.
- Cookie-backed browser auth.
- CSRF/CORS/proxy gate hardened contours.
- API surfaces for auth, cards, orgs, admin, booking, analytics, AI, content, uploads.

### 2.3 Infra / services

- Frontend hosting: Netlify-like surface.
- Backend runtime: Render.
- Storage: Supabase Storage.
- Email: Mailjet.
- Payments: Tranzila contour in progress / pending full production readiness.
- Documents/invoices: YeshInvoice / חשבונית contour planned.
- Mongo runtime: production Atlas cluster.
- CI Mongo: dedicated CI-only Atlas cluster.
- Tracking: GTM, Meta Pixel, GA4 with route isolation and consent logic.

### 2.4 Mongo governance truth

Mongo auto-generation must remain off:

```env
MONGOOSE_AUTO_INDEX=false
MONGOOSE_AUTO_CREATE=false
```

Meaning:

- indexes are not created casually by runtime;
- structural DB truth must be created via explicit scripts/migrations;
- drift must be detected and fixed intentionally;
- production and CI cluster index parity must be governed.

---

## 3. Roles: ChatGPT and Copilot Agent

### 3.1 ChatGPT role

In this project, ChatGPT must act as:

- **Senior Project Architect**;
- **Senior Full-Stack Engineer**;
- **Enterprise Consultant**;
- security-minded technical lead;
- DevOps/CI governance advisor when relevant;
- documentation and handoff owner.

Responsibilities:

- protect architecture truth;
- protect SSoT / contracts / invariants / boundaries;
- think about scalability, security, performance, maintainability;
- minimize blast radius;
- prevent scope creep;
- never accept “works on my machine” without proof;
- require `PROOF file:line-range` from Copilot;
- require raw stdout + EXIT from verification;
- separate audit, implementation, verification, docs;
- prevent CI/prod drift;
- document meaningful operational changes;
- keep closed contours closed unless there is a strong reason to reopen.

### 3.2 Copilot Agent role

Copilot Agent is **executor only**, not architect.

Copilot must:

- read first;
- prove current state;
- modify only after approved scope;
- make minimal changes;
- stop after each phase;
- not run git commands;
- not broaden scope;
- not do “заодно поправил”;
- not refactor unrelated files;
- show proof and raw outputs.

---

## 4. Canonical workflow for every task

Every Cardigo workstream must follow:

1. **Architecture / intent clarification**
2. **Phase 1 — Read-Only Audit with PROOF**
3. **Phase 2 — Minimal Fix**
4. **Phase 3 — Verification with RAW stdout + EXIT**
5. **Documentation / Handoff**

Rules:

- No code changes before audit.
- No acceptance without verification.
- No moving to the next task until current one is fully closed or explicitly deferred.
- Verification is mandatory and separate.
- Use PowerShell + `curl.exe` for manual smoke where relevant.
- Do not give Copilot exact edit line numbers as instructions; ask it to prove anchors and line ranges after changes.

### 4.1 Mandatory Copilot prompt header

Every Copilot prompt should include:

```text
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

---

## 5. High-risk invariants not to touch casually

### 5.1 Frontend / render chain

Do not casually touch:

- shared render chain public + preview;
- `CardLayout` DOM skeleton;
- `CardLayout.module.css`;
- templates registry: `frontend/src/templates/templates.config.js` only;
- skins token-only logic;
- preview-only styles outside `[data-preview="phone"]`.

### 5.2 URLs / DTOs

- Public / QR / OG URLs must come from backend DTO fields like `publicPath` / `ogPath`.
- Do not reconstruct canonical public truth independently in frontend.
- Do not mix Cardigo/Digitalyty in URL, SEO, OG, JSON-LD, sitemap.

### 5.3 Auth/security

- Browser auth is cookie-backed.
- Do not return to localStorage auth truth for browser.
- Do not reintroduce browser Authorization header as primary auth.
- Existing CSRF/CORS/proxy gate boundaries must not be weakened casually.

### 5.4 Org/security

- Anti-enumeration behavior must be preserved.
- Membership gate must remain before SEO/410 behavior where designed.
- Sitemap must avoid N+1.

---

## 6. Closed major contours to preserve

The following are considered closed unless a new bounded workstream explicitly reopens them.

### 6.1 Public / marketing / SEO / legal

- `/cards` closed as premium public marketing/examples page.
- `/pricing` closed as premium public pricing page.
- Blog/guides subsystem closed.
- Legal/info pages closed:
  - `/privacy`
  - `/terms`
  - `/accessibility-statement`
- Route-level SEO via `SeoHelmet` matured.
- Structured data / FAQ / Breadcrumb contours closed where already accepted.
- PWA/installability contour closed.

### 6.2 Trial / premium lifecycle

- 10-day trial for eligible new users on first legitimate card acquisition.
- Trial is onboarding incentive, not separate plan.
- Free fallback after expiry.
- Gallery is premium-only.
- Free users can publish/share cards but premium features are gated.
- Gallery retention/purge contour closed as previously documented.

### 6.3 Tracking / consent

- Site GTM container and Meta Pixel are route-isolated.
- Site-level tracking limited to approved marketing routes.
- Per-card owner GTM/GA4/Meta Pixel separated from site tracking.
- Per-card consent controls owner trackers.
- Platform IDs blocked from owner tracker configuration.
- GA4 owner route behavior aligned with card consent.

### 6.4 Admin / UX / bundle / auth improvements

Closed and accepted in previous cycles:

- Admin billing convenience hydration.
- Trial-aware admin filtering.
- Auth validation UX for login/register.
- Bundle splitting/vendor chunk hardening.
- PWA/install controls.
- Services/Business Hours premium-lock parity in editor.

---

## 7. Most recent closed workstream: CI-only Atlas + GitHub Actions Mongo hardening

This is the key status from the current conversation.

### 7.1 Problem that triggered the workstream

GitHub Actions Mongo-backed workflows were failing with MongoDB Atlas connection errors. Initial failure was due to workflow pointing to an old/non-working cluster. After redirecting secrets to the new production-shaped cluster, Atlas Network Access blocked GitHub runners. Temporary production `0.0.0.0/0` allowed the workflow to proceed, revealing a separate app-level sanity issue.

### 7.2 Intermediate findings

- Old cluster was unusable and should not be relied on.
- GitHub Actions originally used fallback:

```bash
EFFECTIVE_MONGO_URI="${MONGO_URI_DRIFT_CHECK:-${MONGO_URI:-}}"
```

This allowed fallback to production `MONGO_URI`.

- `backend-admin-sanity` then failed at `/uploads/image` with `403 PREMIUM_REQUIRED` because gallery is premium-only and the sanity card was free.
- Fix was bounded to `sanity-admin-user-delete.mjs`: temporary `adminTier: "premium"` + `adminTierUntil` on synthetic test card before gallery upload.
- This preserved production entitlement policy and fixed test precondition.

### 7.3 CI-only Atlas cluster rollout

Closed truth:

- Dedicated CI-only Atlas cluster exists.
- CI DB name: `cardigo_ci`.
- CI cluster may allow `0.0.0.0/0` because it contains no production data and GitHub-hosted runners have dynamic IPs.
- This posture is allowed only for CI-only cluster and must never be copied to production.
- CI cluster was created in a separate Atlas project due to free-tier availability constraints.

### 7.4 Blank CI cluster bootstrap truth

Important discovery:

- On a blank CI cluster, before running card index migration scripts, an empty `cards` collection must be explicitly created.
- Otherwise `migrate-card-user-index.mjs --apply --i-understand-index-downtime` may fail with:

```text
ns does not exist: cardigo_ci.cards
```

Mandatory bootstrap sequence:

1. Create empty `cards` collection.
2. Run:

```powershell
node scripts/migrate-card-user-index.mjs --apply --i-understand-index-downtime
node scripts/migrate-card-anonymousid-index.mjs --apply
node scripts/migrate-card-org-user-index.mjs --apply
node scripts/migrate-tenantkey-slug.mjs --apply --create-index
```

### 7.5 Accepted CI drift warnings

Local and GitHub `sanity:card-index-drift` passed with:

- `ok: true`
- `missing: []`
- `mismatches: []`
- `EXIT:0`

Accepted non-blocking warnings count is currently **5**:

- `tenantKey:1`
- `orgId:1`
- `status:1`
- `trialDeleteAt:1`
- `adminTier:1`

These are accepted steady-state warnings because the drift gate only fails on missing/mismatches for governed/critical indexes.

### 7.6 Production Atlas hardening

Closed truth:

- Production Atlas `0.0.0.0/0` was removed.
- Production Atlas allowlists Render outbound ranges:
  - `74.220.51.0/24`
  - `74.220.59.0/24`
- Render backend logs after hardening confirmed:
  - `MongoDB connected`
  - backend running normally.
- `https://cardigo.co.il` returned `200 OK`.
- Direct backend `/api/health` may return `403 PROXY_FORBIDDEN` because proxy gate is enabled. This is expected and not a Mongo failure.

### 7.7 GitHub Actions Mongo secret hardening

Closed truth:

- Mongo-backed GitHub workflows now require `MONGO_URI_DRIFT_CHECK`.
- `MONGO_URI` is production/runtime truth and must not be used by ordinary Mongo-backed CI jobs.
- Fallback chain `${MONGO_URI_DRIFT_CHECK:-${MONGO_URI:-}}` eliminated from both Mongo-backed workflows.
- `secrets.MONGO_URI` no longer referenced by Mongo-backed CI workflow env blocks.

Behavior now:

- PR drift check:
  - if `MONGO_URI_DRIFT_CHECK` missing → warn/skip;
  - no fallback to production.
- Push/main/release/workflow_dispatch drift gate:
  - if missing → hard fail;
  - no fallback to production.
- Backend Admin Sanity:
  - if missing → hard fail;
  - no fallback to production.

Verified after hardening:

- `Backend Index Governance` passed green.
- `Backend Admin Sanity` passed green.

### 7.8 Documentation closure

Closed and verified:

- `docs/runbooks/ci-cluster-bootstrap.md` created and updated.
- `README.md` updated.
- `docs/backend-verification-and-deploy.md` updated.
- Final closure section added to `ci-cluster-bootstrap.md`.
- Docs verified clean:
  - no raw Mongo URI;
  - no passwords;
  - no Atlas private IDs;
  - no GitHub secret values;
  - no stale fallback framing.

---

## 8. Mandatory Mongo / CI-only impact assessment rule

This rule is now permanent and must be applied to every future Mongo-touching workstream.

Every production Mongo index, collection, migration, or Mongo-related script change requires explicit CI-only impact assessment before workstream closure.

Required format:

```text
CI-only impact assessment:
- Affects CI cluster: YES/NO
- Reason:
- Required CI bootstrap/migration update: YES/NO
- Required verification:
- Required docs update:
```

If YES:

- update CI bootstrap/migration path;
- run required verification;
- update docs/runbooks/ci-cluster-bootstrap.md and linked docs.

If NO:

- explicitly record that CI-only cluster is not affected;
- do not add anything to CI cluster silently.

Silent omission is not acceptable.

---

## 9. Current active next workstream: production Mongo credential rotation

This is the next security contour and must be handled separately.

### 9.1 Why this is needed

During the previous workstream, a production Mongo connection string / credential value appeared in chat/log context. Repo scans showed no committed raw Mongo URI or secret, but the credential was exposed in conversation context.

Therefore, rotate production Mongo credentials.

### 9.2 Audit conclusion

Phase 1 audit already completed for rotation.

Findings:

- Runtime backend uses production Mongo through:
  - `server.js` → `connectDB(process.env.MONGO_URI)`
  - `db.js` receives URI as parameter.
- Local operator scripts read `process.env.MONGO_URI` from `.env` or session-scoped env.
- `.env` is gitignored.
- GitHub Actions no longer use production `MONGO_URI`.
- CI-only cluster unaffected.
- Raw credential not committed to tracked files.

### 9.3 CI-only impact assessment for credential rotation

```text
CI-only impact assessment:
- Affects CI cluster: NO
- Reason: production credential rotation changes only production Atlas DB user / production MONGO_URI. CI uses separate MONGO_URI_DRIFT_CHECK and separate Atlas project/DB/user.
- Required CI bootstrap/migration update: NO
- Required CI verification: NO
- Required docs update: YES, after rotation mark §11.6 credential rotation CLOSED.
```

### 9.4 Recommended strategy

Use **dual-user overlap**, not direct password change.

Why:

- Directly changing password of existing DB user creates a no-overlap risk.
- New DB user allows rollback.
- Old user remains active until new Render env is deployed and verified.
- Only after verification should old user be revoked/deleted.

### 9.5 Safe rotation plan

Do not paste secrets into chat.

#### Step 1 — Atlas: create new production DB user

In production Atlas project:

- Database Access → Add New Database User.
- Auth: Password.
- New username example:

```text
cardigo_prod_app_YYYYMMDD
```

- Strong generated password.
- Role: readWrite on `cardigo_prod`.
- Do not use Atlas Admin role.
- Do not delete old user yet.

#### Step 2 — Construct new production URI

Same host/DB, new user/password.

Format only, do not document actual value:

```text
mongodb+srv://<NEW_USER>:<NEW_PASSWORD>@<PRODUCTION_HOST>/cardigo_prod?appName=<APP_NAME>
```

If password contains special characters, URL-encode it.

#### Step 3 — Render: update backend `MONGO_URI`

Render backend service:

- Environment → `MONGO_URI`
- replace with new production URI;
- choose save + deploy / rebuild + deploy so env applies.

#### Step 4 — Verify Render reconnect

Render logs must show:

```text
MongoDB connected
Backend running on port 5000
```

If not, do not delete old user. Roll back Render `MONGO_URI` to old URI and redeploy.

#### Step 5 — Production smoke

PowerShell:

```powershell
curl.exe -I "https://cardigo.co.il"
```

Expect `200 OK` or normal successful frontend response.

Direct backend `/api/health` can return `403 PROXY_FORBIDDEN`; that alone is not Mongo failure.

#### Step 6 — Update local operator `.env`

Update local backend `.env` production `MONGO_URI` to the new URI.

Do not touch:

- `MONGO_URI_DRIFT_CHECK`;
- CI-only cluster URI;
- workflow YAML.

Clear any session override:

```powershell
echo $env:MONGO_URI
Remove-Item env:MONGO_URI
```

Only if needed.

#### Step 7 — GitHub dormant `MONGO_URI` secret

Check GitHub:

- Repository → Settings → Secrets and variables → Actions.
- If secret `MONGO_URI` exists:
  - either delete it if no longer needed;
  - or update to new production URI if kept for operator fallback.

Recommendation: delete if truly unused by workflows. If kept, ensure it does not contain old compromised credential.

#### Step 8 — Delete/revoke old Atlas DB user

Only after:

- Render connected with new user;
- frontend smoke passed;
- local `.env` updated;
- GitHub dormant secret handled;
- rollback window no longer needed.

Then delete/revoke old production DB user.

#### Step 9 — Docs closure after rotation

After successful rotation:

- update `docs/runbooks/ci-cluster-bootstrap.md` §11.6;
- mark credential rotation CLOSED;
- record date;
- state old user revoked;
- no secrets, no URIs.

---

## 10. What NOT to do during credential rotation

- Do not change `MONGO_URI_DRIFT_CHECK`.
- Do not touch CI cluster.
- Do not edit workflow YAML.
- Do not delete old DB user before Render reconnect is proven.
- Do not paste production URI/password into chat.
- Do not commit `.env`.
- Do not include raw URI in docs.
- Do not run destructive Mongo scripts.
- Do not mix this with payment/Tranzila or unrelated security tasks.

---

## 11. Future important workstreams

These are not current tasks, but must remain visible.

### 11.1 Payments / Tranzila / recurring billing

Open strategic contour:

- decide official recurring charging flow;
- clarify STO/token terminal behavior;
- avoid testing blindly on production terminal;
- handle failed charges;
- decide automatic emails / phone visibility in emails;
- align legal Terms with billing reality;
- decide cancellation/refund/renewal policy;
- update docs and legal copy before production billing.

### 11.2 Legal/payment readiness

Known risks from prior audit:

- Terms visible date/version mismatch may exist.
- Cancellation/refund/renewal copy must be legally aligned.
- B2B-only vs consumer-open stance requires decision.
- If consumer-open in Israel, legal counsel may be needed for cancellation rights.
- Orphaned pricing components with contradictory copy should not remain stale.

### 11.3 Monitoring / CI/CD maturity

Future work:

- proper monitoring and alerts;
- release checklist;
- scheduled sanity monitoring;
- production health/smoke procedures;
- stronger secret policy for non-Mongo secrets;
- maybe review admin sanity “skip” behavior for non-Mongo required secrets as separate contour.

### 11.4 Security testing

After launch readiness:

- CSRF/XSS/injection review;
- auth invalid-token paths;
- rate limits;
- abuse controls;
- phone-bound trial anti-abuse;
- backup/restore drills;
- stress/performance testing.

---

## 12. Standard next-chat bootstrap prompt

Use this at the start of the next ChatGPT window:

```text
PROJECT MODE: Cardigo enterprise workflow.

You are ChatGPT acting as Senior Project Architect / Senior Full-Stack Engineer / Enterprise Consultant for Cardigo.

Read and follow the attached handoff. Preserve all closed contours. Work by phases only:
Architecture → Phase 1 Read-Only Audit with PROOF → Phase 2 Minimal Fix → Phase 3 Verification with RAW stdout + EXIT → Documentation / Handoff.

Hard constraints for Copilot prompts:
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

Current next workstream:
Production Mongo credential rotation.
Use dual-user overlap. Do not directly change old password unless explicitly approved. Do not delete old DB user until Render reconnect and production smoke are proven. Do not touch MONGO_URI_DRIFT_CHECK. CI-only impact assessment for this contour: Affects CI cluster = NO.
```

---

## 13. Summary for next chat in one page

Cardigo is an Israel-first SaaS for digital business cards and mini business pages. Production domain is `https://cardigo.co.il`. React/Vite frontend, Node/Express backend, MongoDB Atlas, Supabase Storage, Mailjet, Render, Netlify-like frontend hosting. Strict styling laws: CSS Modules only, no inline styles, Flex only, mobile-first, typography tokens only.

The latest major workstream closed CI/prod Mongo separation:

- dedicated CI-only Atlas cluster exists;
- CI DB is `cardigo_ci`;
- GitHub Actions use `MONGO_URI_DRIFT_CHECK` only;
- no fallback to production `MONGO_URI` remains;
- production `0.0.0.0/0` removed;
- Render outbound ranges allowlisted;
- both `Backend Index Governance` and `Backend Admin Sanity` green;
- docs/runbook completed and verified.

Mandatory Mongo governance:

Every production Mongo index, collection, migration, or Mongo-related script change requires explicit CI-only impact assessment before closing the workstream.

Current next task:

Production Mongo credential rotation because a production Mongo URI/password appeared in chat/log context. Use dual-user overlap:

1. create new Atlas production DB user;
2. update Render `MONGO_URI`;
3. redeploy;
4. verify `MongoDB connected` and production smoke;
5. update local `.env` and any dormant GitHub `MONGO_URI` secret;
6. only then revoke old Atlas user;
7. update docs §11.6 to mark rotation CLOSED.

Do not paste secrets into chat. Do not touch CI cluster. Do not touch `MONGO_URI_DRIFT_CHECK`.

