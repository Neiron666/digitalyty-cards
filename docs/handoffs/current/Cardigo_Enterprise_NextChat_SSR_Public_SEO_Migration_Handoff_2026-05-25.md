# Cardigo Enterprise Next Chat Handoff - Public SEO / SSR Migration Playbook

---

> **SUPERSEDED UPDATE — 2026-07-05:**
> SSR_REAL_ROUTE_PRODUCTION_ROLLOUT is now CLOSED / PASS / PRODUCTION VERIFIED.
> Production /card/* and /c/* now serve full SSR HTML with sanitized data island for browser/Googlebot paths, while social UA remains raw OG HTML.
> See `docs/handoffs/current/Cardigo_Enterprise_Handoff_2026-07-05_SSR_Real_Route_Production_Rollout_Closed.md` and `docs/runbooks/seo-public-indexability-runbook.md` Section 23 for current truth.


Updated: 2026-05-25  
Project: Cardigo  
Primary domain: https://cardigo.co.il  
Language baseline: Hebrew / RTL / Israel-first  
Mode: Enterprise workflow

---

## 0. Purpose of this file

This file is a full next-chat handoff for continuing Cardigo in a new ChatGPT window.

Its purpose is to preserve:

- project identity and architecture truth;
- strict working doctrine;
- what was completed in the current slug lifecycle contour;
- what must not be reopened casually;
- what remains deferred;
- the next strategic direction: moving public SEO-critical pages from fragile CSR + Edge patches toward deterministic initial HTML / SSR-level SEO;
- how ChatGPT must behave as the senior architect of the project;
- how Copilot Agent must be instructed and constrained.

This is not just a status note. Treat it as a working project doctrine and next-chat playbook.

---

## 1. Role of ChatGPT in this project

In Cardigo, ChatGPT must operate as:

- Senior Project Architect
- Senior Full-Stack Engineer
- Senior Backend Engineer
- Senior Frontend Engineer
- Senior Security Engineer
- Senior SEO Engineer
- Enterprise Consultant

The assistant is not just writing prompts. It must think like a senior architect responsible for production safety.

Core responsibilities:

- protect architecture truth;
- protect public/private boundaries;
- protect SEO/canonical/OG/sitemap invariants;
- protect auth/security/billing/org boundaries;
- prevent scope creep;
- prevent accidental regressions;
- require proof before accepting claims;
- require raw verification outputs before closure;
- classify tails explicitly as closed, deferred, non-blocking, or blocking;
- produce bounded Copilot prompts;
- keep closed contours closed unless hard evidence requires reopening.

Copilot Agent is executor only. It is not the architect.

---

## 2. Mandatory Cardigo enterprise workflow

Every Cardigo task must follow this workflow:

1. Architecture / intent clarification
2. Phase 1 - Read-Only Audit with PROOF file:line-range
3. Phase 2 - Minimal Fix
4. Phase 3 - Verification with RAW stdout + EXIT
5. Documentation / Handoff when meaningful
6. Rollout / Monitoring when relevant

No code changes before audit.  
No acceptance without verification.  
No next contour until current contour is closed or tails are explicitly classified.

Even if someone says "two phases", Cardigo still requires verification as a separate phase.

---

## 3. Mandatory Copilot prompt header and constraints

Every future Copilot prompt must include:

```text
PROJECT MODE: Cardigo enterprise workflow.
```

Hard constraints for every Copilot prompt:

```text
- No git commands
- No inline styles
- CSS Modules only
- Flex only - no grid
- Mobile-first mandatory
- Typography:
  - font-size only via var(--fs-*)
  - use only existing approved typography tokens
  - --fs-* rem-only
  - no px/em/%/vw/vh/clamp/fluid
  - no calc(non-rem)
- No scope creep
- No "while I was there" changes
- No formatting churn
- Every important claim requires PROOF file:line-range
- Verification must include RAW stdout + EXIT
- Manual endpoint smoke uses PowerShell + curl.exe
```

For public/SEO/crawler tasks, add:

```text
- Do not guess canonical/OG/sitemap behavior
- Prove browser, Googlebot, social crawler, direct OG and API behavior separately
- Do not introduce HTTP redirects without explicit redirect/cache/reclaim policy
- Do not expose private/draft/deleted targets
- Preserve anti-enumeration behavior
```

---

## 4. Product identity

Cardigo is an Israel-first SaaS product for digital business cards and mini business pages.

Current product formula:

```text
Cardigo = digital business card
        + mini business page
        + sharing layer
        + SEO layer
        + analytics layer
        + self-service editing
        + operational business layer
        + booking-ready foundation
```

The product includes or is expected to include:

- public digital card pages;
- mini business page content;
- WhatsApp / phone / QR / social sharing;
- self-service editor;
- SEO metadata and structured data;
- OG/social preview support;
- card analytics;
- owner tracking support with consent;
- booking foundation;
- lead capture;
- services and business hours;
- blog and guides;
- admin and org surfaces;
- billing and receipts;
- slug lifecycle and SEO-safe redirect/quarantine governance.

Market baseline:

- Israel-first
- Hebrew/RTL default
- canonical production domain: `https://cardigo.co.il`
- non-www canonical
- Cardigo and Digitalyty are separate brands and must not be mixed in canonical, SEO, OG, sitemap, public naming, product logic, analytics, or user-facing Cardigo copy.

---

## 5. Current stack and infrastructure truth

Frontend:

- React + Vite
- RTL-first
- CSS Modules
- token-based styling
- route-level head management with React Helmet / SeoHelmet
- Netlify hosted public/marketing frontend
- SPA fallback for normal browser routes
- Edge function for crawler/social head handling

Backend:

- Node.js + Express
- MongoDB / Mongoose
- DTO-driven public truth
- backend OG endpoints
- manual index governance
- cookie-auth/CSRF/CORS hardened direction
- no browser localStorage auth
- no browser Authorization header revival

Database governance:

```text
MONGOOSE_AUTO_INDEX=false
MONGOOSE_AUTO_CREATE=false
```

Meaning:

- production indexes are manually governed;
- migrations and sanity scripts are canonical;
- runtime auto-index creation is not accepted;
- drift is detected by sanity scripts.

Hosting/services:

- Netlify frontend
- Render backend
- MongoDB Atlas
- Supabase Storage
- Mailjet
- Tranzila payments
- YeshInvoice receipts
- Sentry
- GTM / Meta Pixel

---

## 6. Critical invariants

Do not casually break:

- SSoT public + preview render chain
- templates registry only in `frontend/src/templates/templates.config.js`
- skins token-only
- preview-only styles only under `[data-preview="phone"]`
- CardLayout DOM skeleton is high blast radius
- public / QR / OG URLs come from backend DTO `publicPath` / `ogPath`
- anti-enumeration 404 and membership gate ordering
- sitemap without N+1 behavior
- cookie-backed auth runtime truth
- manual index governance
- tracking route isolation
- consent-aware owner tracking
- provider/internal URLs must not leak to public DTOs
- receipt PDFs proxied through backend, not raw provider redirect
- Cardigo and Digitalyty must not mix

---

## 7. Important public surfaces

Marketing/public:

```text
/
/cards
/pricing
/contact
/blog
/blog/:slug
/guides
/guides/:slug
/privacy
/terms
/accessibility-statement
/payment-policy
```

Public card routes:

```text
/card/:slug
/c/:orgSlug/:slug
```

OG routes:

```text
/og/card/:slug
/og/c/:orgSlug/:slug
/og/blog/:slug
/og/guides/:slug
```

Product/private:

```text
/dashboard
/inbox
/org/invites
/edit/...
/admin
```

Auth/system:

```text
/login
/register
/forgot-password
/reset-password
/signup
/signup-link
/verify-email
/invite
```

---

## 8. Why SSR / deterministic initial HTML is now the next strategic direction

Cardigo has been operating with:

- React SPA for normal browser routes;
- SeoHelmet for hydrated head;
- backend OG endpoints for social previews;
- Netlify Edge function that conditionally handles crawler/social paths;
- targeted fixes for canonical/OG gaps.

This architecture worked and was improved, but it remains fragile for SEO-critical routes because initial HTML for normal routes is still mostly SPA shell unless Edge injects head for certain user agents.

Observed SEO/product lessons:

- Google can render SPA, but deterministic initial HTML is safer for SEO-critical pages.
- Static shell metadata can pollute routes before hydration if not governed strictly.
- Social bots need immediate OG HTML and do not wait for React hydration.
- Public card slug changes require crawler/social behavior separate from normal browser flow.
- SEO-critical pages should not rely on client hydration for canonical, robots, OG, JSON-LD, title, description, and route identity.

Strategic verdict:

```text
Cardigo should move public SEO-critical surfaces toward deterministic initial HTML.
Full immediate migration of the whole app is too high blast radius.
The mature path is partial hybrid rendering, starting with public SEO-critical pages.
```

Do not treat this as a casual framework rewrite. Treat it as a controlled migration program.

---

## 9. SSR / new SEO level - target architecture direction

The goal is not "rewrite everything in Next.js tomorrow".

The goal is:

```text
Public SEO-critical pages should return route-correct initial HTML without relying on CSR hydration.
Private/product/editor/admin can remain SPA where SEO is irrelevant.
```

Likely target model:

- public SEO pages move to SSR / deterministic renderer;
- app/editor/admin remain Vite React SPA unless a later migration proves value;
- backend DTO remains SSoT for card public data;
- canonical/OG/public paths continue coming from backend contracts;
- Netlify Edge patches are reduced over time, not expanded forever;
- SSR renderer must preserve Cardigo invariants and existing DTO contracts.

Public pages that are SEO-critical:

Priority 1:

```text
/card/:slug
/c/:orgSlug/:slug
```

Priority 2:

```text
/blog/:slug
/guides/:slug
/blog
/guides
/cards
/pricing
/contact
/
```

Priority 3:

```text
/legal pages
/privacy
/terms
/accessibility-statement
/payment-policy
```

Private routes are not SSR migration targets now:

```text
/edit
/dashboard
/admin
/org
auth routes
```

---

## 10. SSR migration principles

The migration must be:

- phased;
- reversible;
- contract-driven;
- SEO-safe;
- security-safe;
- no scope creep;
- low blast radius;
- proven by browser/curl/crawler/social smokes.

Primary migration rules:

1. Start with read-only architecture audit.
2. Prove current Netlify routing, Edge behavior, backend OG/API contracts.
3. Decide renderer boundary before touching code.
4. Do not mix SSR migration with feature fixes.
5. Do not rework card editor or CardLayout unless proven required.
6. Do not duplicate public/card rendering logic casually.
7. Preserve backend DTO as SSoT.
8. Preserve slug lifecycle behavior.
9. Preserve no-index/indexability policy.
10. Preserve Hebrew/RTL and CSS Modules policy.
11. Avoid inline style hacks.
12. Avoid grid in CSS.
13. SSR must emit correct initial title/meta/canonical/robots/OG/JSON-LD.
14. Hydration must not replace correct head with stale/fallback head.
15. Sitemap must reflect only indexable routes.
16. OG/social route behavior must remain correct.

---

## 11. Recently closed slug lifecycle chain

The current major completed chain was slug lifecycle protection and SEO-safe old slug handling.

This chain is important because SSR migration must not regress it.

### Phase 2A - SlugRedirect model/index foundation

Implemented:

- `SlugRedirect` model
- manual index migration
- read-only index drift sanity
- package aliases
- no TTL index
- audit-trail preservation

Key idea:

```text
Old slugs are not permanently reserved, but they enter temporary quarantine.
```

### Phase 2B - Write-path slug quarantine

Implemented:

- slug changes create `SlugRedirect` record
- old slug enters `redirect_quarantine`
- targetCardId points to live target card
- targetSlugSnapshot stores audit snapshot
- quarantine window is about 30 days
- reclaim blocked while active
- active card always wins

### Phase 2C - Backend read DTO for old slug

Implemented:

- `/api/cards/:oldSlug` returns `404 + SLUG_MOVED` DTO if target is visible
- no `Location` header
- no network redirect
- fake/nonexistent slugs remain plain 404
- target visibility checks prevent draft/private/deleted leaks

### Phase 2D - Frontend SPA navigation

Implemented:

- PublicCard detects `404 + SLUG_MOVED`
- safe local-path validation
- `navigate(redirectTo, { replace: true })`
- no loop
- browser back button does not return to old slug
- normal browser path remains SPA flow

### Phase 2E - OG / social / Googlebot resolution

Implemented:

- backend OG routes resolve old quarantined slugs to target card OG HTML
- no HTTP 301/302/308
- direct `/og/card/:oldSlug` returns target OG HTML if target visible
- social crawler gets correct target OG
- Googlebot gets target canonical/OG injected through Edge
- normal browser flow remains unchanged

### Phase 2F - Delete/account tombstones

Implemented:

- `createCardSlugTombstone`
- deleted user-owned cards create `SlugRedirect` tombstone
- `targetCardId=null`
- reason values include `card_deleted`, `account_deleted`, `trial_expired`
- deleted slug returns plain 404
- no `SLUG_MOVED`
- no target OG
- active tombstone blocks reclaim
- anonymous/user-null cards skipped

Manually verified core personal-card smoke:

- test slug `neiron-player` changed to `neiron-player-new`
- old slug redirect quarantine created
- deleted current slug created tombstone
- deleted slug returned 404
- old/current slugs stayed claim-blocked

Deferred tails:

- full admin-delete tombstone runtime smoke
- full self-service account-delete tombstone smoke
- upload lazy trial-delete fixture smoke
- org-delete bulk slug lifecycle
- stale targetCardId cleanup

### Phase 2G - Release sweep

Implemented:

- shared release helper
- operator dry-run/apply script
- backend-owned maintenance job
- no TTL delete
- no external cron
- 24h default interval
- 120s boot delay
- strict env gate `SLUG_REDIRECT_RELEASE_ENABLED=true`
- local/false/absent disables job
- production dry-run `candidateCount=0`
- production job scheduled and first run done:
  - `candidateCount=0`
  - `modifiedCount=0`

Current production env:

```text
SLUG_REDIRECT_RELEASE_ENABLED=true
```

Do not set `SLUG_REDIRECT_RELEASE_INTERVAL_MS` unless intentionally overriding 24h default.

---

## 12. Documentation closure status

The docs contour for Phase 2F + 2G is closed.

Updated docs:

- `docs/handoffs/current/Cardigo_Enterprise_Handoff_2026-05-25_SlugLifecycle_2F_2G_Closed.md`
- `docs/runbooks/scheduled-jobs-readiness.md`
- `docs/policies/POLICY_ADMIN_DELETE_LIFECYCLE_V1.md`
- `docs/policies/POLICY_RETENTION_V1.md`
- `backend/README.md`

Verified:

- no stale `7 active workers`;
- scheduled jobs now reflect 8 workers;
- `slug-redirect-release` documented;
- `routeType` corrected to `card`, not `personal`;
- no raw Mongo ObjectIds leaked;
- no secret values leaked;
- no false 301/302/308 claim;
- no TTL-delete overclaim;
- apply-not-run correctly documented;
- deferred tails are explicitly catalogued.

---

## 13. Current deferred slug lifecycle tails

These are not blockers for moving to SSR audit, but they are known future contours:

- admin-delete tombstone runtime smoke;
- account-delete tombstone runtime smoke;
- upload lazy trial-delete fixture smoke;
- org-delete bulk slug lifecycle;
- stale targetCardId cleanup;
- admin/manual release UI;
- backlog sanity script;
- Sentry monitor for slug-redirect-release;
- full architecture runbook for all SlugRedirect phases 2A-2G.

Do not casually reopen them during SSR migration unless direct dependency is proven.

---

## 14. Current SEO architecture truth to preserve during SSR migration

Known current model:

- normal browser `/card/:slug` receives SPA shell;
- frontend fetches `/api/cards/:slug`;
- if old slug has `SLUG_MOVED`, SPA navigates to target;
- social crawler / Googlebot behavior goes through Edge and backend OG;
- `/og/card/:oldSlug` can now serve target OG HTML for slug-change quarantine;
- tombstone old slug returns plain 404;
- no HTTP 301/302/308 in current slug lifecycle;
- old slugs are temporarily quarantined and later released;
- SlugRedirect records are audit trail, not TTL-deleted.

SSR migration must not break:

- old slug browser behavior;
- old slug API behavior;
- old slug social/OG behavior;
- tombstone behavior;
- release sweep claimability behavior;
- sitemap indexability policy.

---

## 15. Recommended next macro-contour

Next macro-contour should be:

```text
PUBLIC_SEO_DETERMINISTIC_RENDERING_MIGRATION_AUDIT
```

or more specific:

```text
CARD_PUBLIC_ROUTES_SSR_MIGRATION_READINESS_AUDIT
```

Goal:

Audit how to move `/card/:slug` and `/c/:orgSlug/:slug` toward deterministic initial HTML / SSR-level SEO without breaking current SPA, Edge, OG, slug lifecycle, auth, privacy, or sitemap behavior.

Do not implement SSR immediately.

---

## 16. SSR migration audit - what must be proven first

The audit must prove:

### Routing and hosting

- Netlify redirects
- Netlify Edge function registration
- SPA fallback
- `/api/*` proxy behavior
- `/og/*` proxy behavior
- browser vs crawler/social UA behavior
- whether Netlify supports proposed SSR function model
- whether Render backend can serve SSR HTML
- whether a separate SSR renderer is needed

### Current card public flow

- `PublicCard.jsx`
- `cards.service.js`
- backend public DTO
- backend `toCardDTO`
- `publicPath` / `ogPath`
- `SeoHelmet`
- JSON-LD generation
- FAQ JSON-LD
- robots/indexability
- trial/entitlement rules
- public card visibility rules

### Current crawler/social flow

- `og-preview.js`
- `og.routes.js`
- social UA branch
- Googlebot branch
- target OG HTML
- canonical extraction/injection
- old slug behavior
- tombstone behavior

### SEO data sources

- card SEO fields
- computed fallback title/description
- image/OG image source
- JSON-LD owner data
- robots
- canonical
- public URL origin
- sitemap source

### Security/privacy

- draft cards must not render SSR HTML
- expired trial cards must not leak
- anon/private cards must not leak
- org fake/inactive slug must remain anti-enumerated
- wrong org member/owner state must not leak
- raw provider/internal URLs must not leak
- no sensitive fields in HTML

### Performance/caching

- cache-control policy
- ISR-like possibility if available
- invalidation on card update
- slug change and tombstone invalidation
- no stale old slug canonical
- no CDN permanent redirect cache for temporary slugs

---

## 17. Recommended SSR migration options to compare

The next audit should compare options, not assume one.

### Option A - Backend Express renders public card HTML

Backend adds HTML rendering for `/card/:slug` and `/c/:orgSlug/:slug`.

Pros:

- backend already has DTO and access checks;
- fewer cross-service consistency issues;
- can reuse existing OG metadata logic.

Cons:

- frontend app still Netlify SPA;
- need route/proxy changes;
- may split rendering responsibilities;
- need safe hydration strategy if React page remains client-rendered.

### Option B - Netlify function SSR for public routes

Netlify function fetches backend DTO and returns deterministic HTML.

Pros:

- close to frontend deployment;
- can handle public routes before SPA fallback.

Cons:

- must duplicate backend access/indexability logic or rely on DTO;
- secret/proxy handling required;
- possible cold starts and timeout concerns;
- careful cache policy needed.

### Option C - Dedicated Next.js public frontend

Move public SEO routes to Next.js, keep app/editor/admin Vite.

Pros:

- mature SSR/SSG/metadata routing;
- cleaner long-term SEO architecture.

Cons:

- high blast radius;
- new app boundary;
- routing/domain/proxy complexity;
- duplicated UI/render logic risk;
- larger migration cost.

### Option D - Keep Vite SPA, strengthen Edge deterministic HTML

Continue using Edge for crawler/social and add more deterministic injection.

Pros:

- lower short-term blast radius.

Cons:

- remains patch-based;
- does not fully solve deterministic initial HTML for normal/non-crawler requests;
- harder to reason about long-term.

Likely mature direction:

```text
Hybrid staged migration:
1. First prove public card route SSR feasibility.
2. Keep private app in Vite.
3. Preserve backend DTO SSoT.
4. Avoid full-site framework migration until evidence supports it.
```

---

## 18. Next bounded SSR work order

Do not jump into code. Use this order:

### Step 1 - Public route SSR readiness audit

Scope:

```text
/card/:slug
/c/:orgSlug/:slug
```

Deliverable:

- architecture map;
- current data flow;
- current crawler/social flow;
- security gates;
- SEO output matrix;
- SSR option comparison;
- recommended first implementation boundary;
- no code changes.

### Step 2 - Decide renderer boundary

Only after audit:

- backend HTML endpoint?
- Netlify SSR function?
- separate Next public app?
- enhanced Edge only?

Decision must include:

- blast radius;
- rollback path;
- cache invalidation;
- deploy topology;
- data contract;
- security boundary;
- SEO verification plan.

### Step 3 - Minimal proof of concept

Very small scope. Suggested target:

```text
/card/:slug deterministic HTML proof for one public card route
```

Not the whole site.

Must verify:

- normal browser gets correct initial title/canonical/meta;
- Googlebot gets same;
- social gets correct OG;
- draft/deleted/nonexistent stay 404;
- old slug/tombstone behavior preserved;
- hydration does not destroy SEO head.

### Step 4 - Expand to org cards

Only after personal card SSR proof.

### Step 5 - Expand to marketing/blog/guides

Only after card routes are stable.

### Step 6 - Documentation and rollout

Update runbooks and SEO architecture docs.

---

## 19. SSR verification matrix

Future SSR verification must include:

### Browser

```text
curl.exe -si https://cardigo.co.il/card/<slug>
```

Expected:

- HTTP 200 for public card;
- initial HTML includes correct `<title>`;
- canonical self;
- og:url self;
- robots correct;
- no generic homepage fallback pollution.

### Googlebot

```text
curl.exe -A "Googlebot/2.1 (+http://www.google.com/bot.html)" -si https://cardigo.co.il/card/<slug>
```

Expected:

- deterministic correct head;
- no duplicate/conflicting canonical;
- no stale old slug URL.

### Facebook/social

```text
curl.exe -A "facebookexternalhit/1.1" -si https://cardigo.co.il/card/<slug>
```

Expected:

- correct OG title/description/image/url;
- no fallback to generic Cardigo unless user card lacks fields and fallback is intentional.

### Old slug

```text
curl.exe -si https://cardigo.co.il/card/<oldSlug>
curl.exe -A "facebookexternalhit/1.1" -si https://cardigo.co.il/card/<oldSlug>
```

Expected depends on current policy:

- browser SPA navigate or SSR equivalent safe redirect behavior;
- no permanent 301 unless policy changes;
- social/crawler target OG for slug_change quarantine;
- tombstone plain 404.

### Deleted/tombstone slug

Expected:

- plain 404;
- no `SLUG_MOVED`;
- no target OG;
- claim blocked until release.

### Fake org

Expected:

- plain 404;
- no enumeration leak.

### Sitemap

Expected:

- includes only current indexable public slugs;
- does not include old quarantined slugs;
- does not include tombstones;
- no N+1 regression.

---

## 20. Copilot prompt template for next SSR audit

Use this as the next chat's first technical prompt when ready.

```text
PROJECT MODE: Cardigo enterprise workflow.

You are acting as combined senior role:
- Senior Project Architect
- Senior Backend Engineer
- Senior Frontend Engineer
- Senior SEO Engineer
- Senior Security Engineer
- Production Routing Engineer

CONTOUR:
CARD_PUBLIC_ROUTES_SSR_MIGRATION_READINESS_AUDIT

PHASE:
Phase 1 - Read-Only Audit only.

GOAL:
Audit how to move Cardigo public card routes /card/:slug and /c/:orgSlug/:slug from CSR + Edge/OG patching toward deterministic initial HTML / SSR-level SEO, without breaking current slug lifecycle, security, SEO, OG, sitemap, browser flow, or private route boundaries.

READ-ONLY ONLY.
Do not change code.
Do not change docs.
Do not change config/env/package/generated files.
Do not mutate DB.
Do not deploy.
Do not use git commands.

Hard constraints:
- No git commands
- No inline styles
- CSS Modules only
- Flex only - no grid
- Mobile-first mandatory
- Typography:
  - font-size only via var(--fs-*)
  - approved existing tokens only
  - --fs-* rem-only
  - no px/em/%/vw/vh/clamp/fluid
  - no calc(non-rem)
- No scope creep
- No implementation
- Every important claim requires PROOF file:line-range
- Every command must include RAW stdout + EXIT code
- If evidence is unclear, mark BLOCKED_NEEDS_REAUDIT

Audit must prove:

A. Current routing topology:
- Netlify redirects
- Edge function registration
- SPA fallback
- /api proxy
- /og proxy
- normal browser vs Googlebot vs social crawler behavior

B. Current public card data flow:
- PublicCard.jsx
- cards.service.js
- backend DTO
- publicPath / ogPath
- SeoHelmet
- JSON-LD
- robots/indexability
- trial/entitlement visibility

C. Current OG/crawler flow:
- og-preview.js
- og.routes.js
- /og/card/:slug
- /og/c/:orgSlug/:slug
- slug_change old slug behavior
- tombstone behavior

D. SSR migration options:
- backend Express HTML renderer
- Netlify SSR/function renderer
- separate Next.js public app
- stronger Edge-only deterministic HTML
Compare blast radius, security, SEO correctness, deploy complexity, rollback.

E. Security boundaries:
- draft cards
- expired trials
- deleted/tombstone slugs
- fake orgs
- org membership/anti-enumeration
- private/admin/editor/auth routes

F. SEO output contract:
- title
- description
- canonical
- og:url
- og:image
- robots
- JSON-LD
- hreflang only if proven relevant
- sitemap impact

G. Recommended first bounded implementation plan:
Plan only. No code.

Required output:
A. EXECUTIVE VERDICT
Use only:
- READY_FOR_SSR_PLAN
- BLOCKED_ROUTING_TOPOLOGY_UNCLEAR
- BLOCKED_SECURITY_BOUNDARY_UNCLEAR
- BLOCKED_SEO_CONTRACT_UNCLEAR
- BLOCKED_NEEDS_REAUDIT
- STOP_DO_NOT_IMPLEMENT

B. SCOPE RESTATEMENT
C. CURRENT ROUTING TOPOLOGY WITH PROOF
D. CURRENT PUBLIC CARD DATA FLOW WITH PROOF
E. CURRENT OG/CRAWLER FLOW WITH PROOF
F. SSR OPTIONS COMPARISON
G. SECURITY / PRIVACY RISK REGISTER
H. SEO CONTRACT FOR SSR
I. ORDERED BOUNDED IMPLEMENTATION PLAN
J. VERIFICATION MATRIX
K. FINAL RECOMMENDATION
L. STOP CONDITION

End exactly:
STOP. Phase 1 SSR migration readiness audit complete. Do not implement until explicitly approved.
```

---

## 21. Tactical reminders for next chat

The next chat must not start by writing code.

It should:

1. Load this handoff.
2. Confirm it will operate as Senior Project Architect.
3. Ask for or prepare a Phase 1 SSR audit prompt.
4. Keep the slug lifecycle chain closed.
5. Not reopen 2F/2G docs unless a concrete contradiction is found.
6. Not propose a full Next.js migration without proving blast radius.
7. Not mix SSR migration with unrelated UI/marketing/content fixes.
8. Not touch editor/private/admin routes unless audit proves unavoidable.
9. Not rely on confidence. Require proof.
10. Stop after each phase.

---

## 22. Current project status summary

Closed:

- tracking/privacy/Meta foundation
- billing/receipts cabinet and retry readiness
- slug lifecycle Phase 2A-2G
- slug lifecycle 2F/2G documentation
- Render backend always-on/worker baseline
- receipt retry/scheduled job readiness earlier contours
- multiple SEO/canonical fixes including card canonical self-guard
- PublicCard image alt fix
- JSON-LD owner allowlist

Current recommended next macro step:

```text
Public SEO deterministic rendering / SSR migration readiness audit
```

Do not implement SSR before audit.

---

## 23. Final architect note

Cardigo is now past the "patch random bug" stage. The next SEO level is architectural.

The correct mindset:

```text
Do not chase individual Google quirks.
Do not patch one card.
Do not rewrite the whole stack.
Prove the current routing and SEO contracts.
Choose the smallest deterministic rendering boundary.
Protect production invariants.
Ship in bounded, verified contours.
```

The safest mature path is:

```text
Audit -> architecture decision -> tiny proof -> verification -> rollout -> docs
```

For SSR migration, the highest-value first target is:

```text
/card/:slug and /c/:orgSlug/:slug deterministic initial HTML
```

Everything else comes after that boundary is proven.
