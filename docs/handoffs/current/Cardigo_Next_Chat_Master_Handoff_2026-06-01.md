# Cardigo - Next Chat Master Handoff

---

> **SUPERSEDED UPDATE — 2026-07-05:**
> SSR_REAL_ROUTE_PRODUCTION_ROLLOUT is now CLOSED / PASS / PRODUCTION VERIFIED.
> Production /card/* and /c/* now serve full SSR HTML with sanitized data island for browser/Googlebot paths, while social UA remains raw OG HTML.
> See `docs/handoffs/current/Cardigo_Enterprise_Handoff_2026-07-05_SSR_Real_Route_Production_Rollout_Closed.md` and `docs/runbooks/seo-public-indexability-runbook.md` Section 23 for current truth.


Date: 2026-06-01
Status: active project continuity handoff for the next ChatGPT window
Role expected from ChatGPT: Senior Project Architect / Senior Full-Stack Engineer / Backend Engineer / Frontend Engineer / Security Engineer / SEO Engineer / Enterprise Consultant

## 1. Purpose of this file

This file is intended to be pasted into the next ChatGPT window or kept as an instruction document for continuing the Cardigo project without losing context.

The goal is to preserve:

- What Cardigo is.
- What the project already includes.
- What was recently completed.
- What rules must never be violated.
- How ChatGPT must work with Copilot Agent.
- Which contours are closed and must not be casually reopened.
- Which tails remain open and how they should be handled.
- What the next mature enterprise steps should be.

This project is handled with strict anti-regression discipline. Copilot Agent is an executor. ChatGPT is the architect.

## 2. Core role of ChatGPT in this project

ChatGPT must act as:

- Senior Project Architect
- Senior Full-Stack Engineer
- Senior Backend Engineer
- Senior Frontend Engineer
- Senior Security Engineer
- Senior SEO Engineer
- Senior Product / Delivery Consultant

ChatGPT is responsible for architecture decisions, risk classification, scope boundaries, production-readiness judgment, and the final acceptance or rejection of Copilot Agent outputs.

Copilot Agent must not decide architecture independently. Copilot may audit, implement, and verify, but ChatGPT decides whether the result is acceptable.

ChatGPT must think at enterprise level:

- Protect SSoT.
- Protect security boundaries.
- Protect SEO contracts.
- Protect public/private route boundaries.
- Protect DB and billing invariants.
- Avoid hidden coupling.
- Avoid accidental regressions.
- Keep blast radius minimal.
- Demand proof before accepting claims.

If a Copilot answer is unclear, incomplete, or too optimistic, request targeted re-audit before implementation.

## 3. Mandatory Copilot prompt header

Every future Copilot prompt for Cardigo must start with:

```text
PROJECT MODE: Cardigo enterprise workflow.
```

Every Copilot prompt must include hard constraints:

```text
Hard constraints:
- No git commands
- No inline styles
- CSS Modules only
- Flex only - no grid
- Mobile-first mandatory
- Typography policy:
  - font-size only via var(--fs-*)
  - --fs-* rem-only
  - no px/em/%/vw/vh/clamp/fluid
  - no calc(non-rem)
```

Additional permanent constraints:

```text
- No scope creep
- No "while we are here" changes
- No changes before audit
- Always require PROOF file:line-range
- Always require RAW stdout + EXIT for verification
- Use PowerShell + curl.exe for endpoint/manual smoke checks on Windows
- Boundaries must be proven, not guessed
- Do not accept summaries without proof
- Do not move to the next task until current task and all meaningful tails are closed, deferred, or explicitly classified as non-blocking
```

## 4. Canonical workflow

Cardigo work must be performed in phases:

```text
Architecture / Intent clarification
-> Phase 1 - Read-only Audit with PROOF file:line-range
-> STOP
-> Phase 2 - Minimal Fix with bounded scope
-> STOP
-> Phase 3 - Verification with RAW stdout + EXIT
-> STOP
-> Documentation / Handoff
-> Rollout / Monitoring when relevant
```

Never skip Phase 1.
Never implement during audit.
Never deploy without explicit deploy signal.
Never run production smoke until deploy is complete and the architect authorizes it.

## 5. Project identity and product truth

Cardigo is an Israel-first / Israel-only SaaS platform for digital business cards.

Primary product direction:

- Hebrew / RTL first.
- Small business oriented.
- Digital business cards that can function as a mini business page.
- Public shareable card URLs.
- Org cards and personal cards.
- Marketing pages and SEO-driven public content.
- Admin analytics, blog, guides, payments, billing, receipts, tracking, and operational governance.

Canonical domain:

```text
https://cardigo.co.il
```

Non-www canonical.

Critical brand separation:

```text
Cardigo and Digitalyty must never be mixed in canonical, SEO, public paths, naming, product logic, structured data, OG, sitemap, URL logic, analytics audiences, billing docs, receipt docs, or user-facing copy.
```

Digitalyty may exist as a separate business/brand/card, but Cardigo platform truth must stay Cardigo.

## 6. Production-shaped runtime truth

Current production-shaped stack:

- Frontend: React + Vite, hosted on Netlify.
- Backend: Node.js + Express, hosted on Render.
- Database: MongoDB Atlas, active operational DB `cardigo_prod`.
- Storage: Supabase Storage.
- Email: Mailjet.
- Payments: Tranzila DirectNG + MyBilling STO.
- Receipts: YeshInvoice.
- Tracking: GTM / Meta Pixel.
- Public marketing routes: SSG / deterministic public rendering where relevant.
- Public card routes: deterministic OG HTML renderer for bots/social previews, SPA route for regular browser path.

Fresh production-shaped Mongo cluster is active baseline. Old DB was intentionally not migrated and remains only rollback/reference. Manual index governance remains mandatory.

Mongo/Mongoose production policy:

```text
MONGOOSE_AUTO_INDEX=false
MONGOOSE_AUTO_CREATE=false
```

Manual indexes/bootstrap/governance only. Never rely on auto index creation as production truth.

## 7. Core Cardigo technical invariants

### 7.1 Public and preview render chain

Public card and preview card must preserve SSoT render chain. Do not create parallel visual logic casually.

### 7.2 Templates registry

Templates registry only:

```text
frontend/src/templates/templates.config.js
```

No scattered `templateId` comparisons.

### 7.3 Skins policy

Skins are token-only.

Allowed inside theme/palette scopes:

```text
--* CSS variables only
```

Do not put structural CSS, backgrounds, URLs, layout rules, or arbitrary styles into skin files.

### 7.4 Preview-only styles

Preview-only CSS only under:

```text
[data-preview="phone"]
```

### 7.5 CardLayout protection

`CardLayout` DOM skeleton and `CardLayout.module.css` are high-blast-radius. Do not touch casually.

Any change to CardLayout requires:

- specific audit
- proof
- explicit migration reasoning
- regression gates

### 7.6 Public URLs

Public / QR / OG URLs must come from backend DTO truth:

```text
publicPath
ogPath
```

Frontend must not guess public paths when backend already provides SSoT.

### 7.7 Org security

Org public surfaces must preserve anti-enumeration:

```text
membership gate / org boundary before SEO/410 disclosure
404 for non-member / revoked / wrong org shape
```

Do not reveal whether an org/card exists through different error shapes.

### 7.8 Sitemap

Sitemap must avoid N+1. Prefer batch queries. No unbounded expensive loops without governance.

### 7.9 Browser auth

Browser runtime auth is cookie-backed/httpOnly. Do not reintroduce localStorage token or browser Authorization header as primary auth.

## 8. Public route architecture truth

Marketing static routes:

```text
/
/cards
/pricing
/contact
```

These are premium public pages and may be SSG.

Content routes:

```text
/blog
/guides
/blog/:slug
/guides/:slug
```

Blog/guides have SSG/public SEO pipeline, aliases, deterministic public content handling, and admin-created content.

Public card routes:

```text
/card/:slug
/c/:orgSlug/:slug
```

These are public card surfaces. They are separate namespaces and must never be treated as one interchangeable route.

- `/card/:slug` = global personal namespace.
- `/c/:orgSlug/:slug` = org-scoped namespace.

Private app routes:

```text
/dashboard
/edit
/admin
/account
/org
/inbox
auth/payment flows
```

These remain SPA/private app surfaces.

## 9. Recent closed contour - Public Card Deterministic OG HTML

Contour:

```text
PUBLIC_CARD_DETERMINISTIC_SSR_RENDERING / Deterministic OG HTML for /og/card and /og/c
```

Status:

```text
CLOSED / PASS / PRODUCTION VERIFIED
```

What was done:

- Chose Option A: backend deterministic HTML emitter for `/og/card/:slug` and `/og/c/:orgSlug/:slug`.
- Rejected full Vite SSR/React renderToString for this contour because of deploy artifact coupling and larger blast radius.
- Added narrow projection helpers for public card SEO/render data.
- Added deterministic card OG HTML service.
- Wired `/og/card` and `/og/c` success paths to render full deterministic semantic HTML instead of meta-refresh page.
- Preserved canonical from backend route-derived `publicUrl`, not user `seo.canonicalUrl`.
- Preserved anti-enumeration and 404/410 behavior.
- Verified with local fixture runtime smoke and production smoke.

Production fixtures used:

```text
Personal:
https://cardigo.co.il/card/kartis-bikur-digitali-hinam

Org:
https://cardigo.co.il/c/digitalyty/kartis-bikur-digitali-lemetavech-nadlan
```

Production smoke passed:

- Direct `/og/card/...` returned 200 deterministic HTML.
- Direct `/og/c/.../...` returned 200 deterministic HTML.
- Social UA public `/card/...` returned deterministic OG HTML.
- Social UA public `/c/.../...` returned deterministic OG HTML.
- Missing `/og/card` returned 404 `Not found`.
- Missing `/og/c` returned 404 `Not found`.
- No homepage canonical leak.
- No external canonical leak.
- No meta refresh.
- No inline styles.
- No target attribute.
- No rollback required.

Open tails from this contour, separate future work only:

- DB governance: explicit createIndex-only bootstrap scripts for fresh disposable DBs.
- Cache hardening for `/og/*`.
- Dead-code cleanup of old meta-refresh helpers in `og.routes.js`.
- Trial-410 route-shape clarification because 410 was effectively unreachable under current user-required query filters.
- Optional broader SSR for regular browser `/card` and `/c` SPA path, separate major contour.

Do not reopen this contour casually.

## 10. Recent closed contour - Blog/Guide Markdown Link Parity

Contour:

```text
BLOG_GUIDE_ADMIN_MARKDOWN_LINK_PARITY
```

Status:

```text
CLOSED / PASS / PRODUCTION VERIFIED / DOCS UPDATED
```

Problem:

Admin-created markdown-style links like:

```text
[כרטיס ביקור דיגיטלי](/)
```

worked in section body `קטעי תוכן - תוכן`, but did not work in excerpt `תקציר` for blog/guides.

Root cause:

- Section body used `renderLinkedText`.
- Excerpt rendered as plain text.
- Meta/OG/JSON-LD needed plain text, not anchors.

Implementation:

Created shared utility:

```text
frontend/src/utils/safeLinkedText.jsx
```

Key functions:

- `renderLinkedText(text)` - visible DOM safe anchor rendering.
- `textToParagraphs(text)` - paragraph splitting.
- `markdownLinksToPlainText(text)` - meta/JSON-LD plain text stripper.
- `validateLinkUrl(href)` - allowlist validation.

Changed:

- `BlogPost.jsx`
- `GuidePost.jsx`
- `Blog.jsx`
- `Guides.jsx`

Behavior now:

- Blog/guide excerpt supports markdown links in visible DOM.
- Blog/guide section body still supports markdown links.
- Listing card excerpts render links safely.
- Meta description / og:description / twitter:description / JSON-LD description stay plain text.
- Unsafe schemes render as literal text, no anchor.
- No `dangerouslySetInnerHTML`.
- External links use `target="_blank" rel="noopener noreferrer"`.
- Internal relative links do not use target.
- No nested anchor issue in listing cards because card root is `<article>`, not an anchor.

Production verification:

- Admin changed blog excerpt with markdown link.
- Before Netlify redeploy, API had fresh data but raw SSG HTML was stale.
- After Netlify redeploy, raw SSG HTML showed real `<a href="/">כרטיס ביקור דיגיטלי</a>` in article excerpt and listing card excerpt.
- Meta/OG/Twitter/JSON-LD remained clean plain text.
- No rollback required.

Docs updated:

- New handoff created:

```text
Cardigo_Enterprise_Handoff_2026-05-28_BlogGuide_MarkdownLinks_And_SSGFreshness_Closed.md
```

- Addendum added to:

```text
docs_blog_seo_og_runbook.md
```

Important operational truth:

Admin content updates to blog/guides are reflected immediately in API, but raw SSG HTML and the `cardigo-initial-detail-data` JSON island update only after frontend SSG rebuild/redeploy.

This is documented as SSG freshness behavior, not fixed by code.

Deferred future contour:

```text
BLOG_GUIDE_SSG_CONTENT_FRESHNESS_AFTER_ADMIN_UPDATE_P2_DECISION
```

Options later:

- background revalidation fetch
- Netlify build hook after admin save
- admin/operator warning after save

## 11. Recent closed contour - Floating WhatsApp Marketing CTA

Contour:

```text
MARKETING_FLOATING_WHATSAPP_CTA
```

Status:

```text
CLOSED / PRODUCTION VERIFIED BY OPERATOR
```

Goal:

Add a fixed floating WhatsApp CTA on marketing/listing routes, bottom-right, modern premium design, not green WhatsApp default, not intrusive, with prefilled message.

Initial implementation:

Created:

```text
frontend/src/components/marketing/FloatingWhatsAppCta.jsx
frontend/src/components/marketing/FloatingWhatsAppCta.module.css
```

Edited:

```text
frontend/src/components/layout/Layout.jsx
```

Approved routes:

```text
/
/cards
/pricing
/contact
/blog
/guides
/blog/page/:pageNum
/guides/page/:pageNum
```

Excluded routes:

```text
/blog/:slug
/guides/:slug
/card/:slug
/c/:orgSlug/:slug
/login
/register
/dashboard
/edit/*
/admin
/payment/*
private/auth/app/card/preview routes
```

Design final state:

- Premium dark/navy Cardigo styling.
- Gold rim/outline.
- White WhatsApp icon and label.
- No green WhatsApp bubble background.
- Mobile circle.
- Desktop pill with label `צריכים עזרה?`.
- Physical bottom-right position, intentionally not logical RTL side.
- `z-index: 8500`, below cookie banner at `9000`.
- Safe-area bottom support.
- Motion wrapped under `prefers-reduced-motion: no-preference`.
- No grid.
- No inline styles.
- CSS Modules only.

WhatsApp href:

```text
https://wa.me/972545811900?text=<encoded Hebrew message>
```

Message final source included waving hand emoji:

```text
שלום, ראיתי את Cardigo ואני רוצה להבין איך אפשר ליצור כרטיס ביקור דיגיטלי לעסק שלי. אשמח לעזרה 👋
```

Important fix:

Global `a:hover { color: var(--gold) }` caused the icon/label to become gold on hover. Fixed only locally in CTA CSS by adding `color: #fff` to `.cta:hover` and `.cta:focus-visible`. Global anchor hover was not changed.

Pre-deploy proof:

- frontend gates passed
- build passed
- dist was fresh
- bundle contained `👋` and not old `🙂`
- no `U+FFFD`
- global anchor hover intact
- route guard proof complete

Production status:

User deployed and visually confirmed clean.

Final accepted state:

```text
MARKETING_FLOATING_WHATSAPP_CTA: CLOSED / PRODUCTION VERIFIED
ROLLBACK_REQUIRED: NO
FURTHER_CHECKS: NOT REQUIRED
```

Possible docs tail:

A small handoff/doc closure for this CTA contour may still be useful if strict documentation tracking is desired. It is not a runtime blocker.

## 12. Recent audit - Admin Analytics Google Organic Referral

Contour:

```text
ADMIN_SITE_ANALYTICS_GOOGLE_ORGANIC_REFERRAL_P1_AUDIT
```

Status:

```text
AUDIT COMPLETE / NO CORE CODE GAP
```

Question:

In admin analytics `/admin - אנליטיקה`, table shows:

```text
Facebook
ישיר
```

Could `ישיר` include people who came from Google search?

Audit answer:

```text
Yes, partially, but not provably.
```

Current code already supports Google organic when browser sends referrer:

- frontend sends `document.referrer` as `ref`.
- backend extracts hostname only.
- `google.*` referrer becomes channel `search` and source `google`.
- admin UI already has label `Google`.

If `Google` does not appear, it means there are zero `source="google"` visit rows in selected date range.

`ישיר` means:

```text
no UTM
no referrer
no recognizable source signal
```

Some Google organic visits can land in `ישיר` if referrer is stripped by browser/app/privacy settings. This cannot be honestly recovered.

Exact Google search query cannot be known from current analytics. It requires Google Search Console integration.

No implementation required for core attribution.

Optional future improvement:

```text
ADMIN_ANALYTICS_SOURCE_EXPLANATION_P1_AUDIT
```

Goal:

Add a small admin UI explanation near source analytics saying:

- Google appears when referrer/UTM identifies Google.
- `ישיר` means direct/unknown/no referrer.
- Some privacy-stripped Google traffic can appear as direct.
- Exact search queries require Google Search Console.

Optional future separate contour:

```text
ADMIN_GSC_INTEGRATION
```

For real search queries, impressions, clicks, CTR, positions.

Optional future minor backend analytics improvement:

- gclid capture for Google Ads classification, if Cardigo runs Google Ads.

## 13. Current status summary by major area

### Public SEO / SSR / OG

Strong state. `/og/card` and `/og/c` deterministic HTML closed and production verified. Blog/guides SSG and alias parity previously closed. Public card route canonical logic preserved.

### Blog / Guides

Admin markdown links in excerpt and section body closed and production verified. SSG freshness documented. Future freshness automation remains deferred.

### Marketing UX

Floating WhatsApp CTA closed and production verified.

### Admin analytics

Google organic attribution audit complete. No core code fix. Optional UI explanation or GSC integration future.

### DB governance

Production-shaped DB indexes are OK. Disposable DB bootstrap gap remains a governance tail for Card indexes. Do not solve inside unrelated contours.

### Billing / receipts / payments

Prior project truth remains: server-side Tranzila notify is entitlement truth. Payment redirect/iframe success is UX only. PaymentTransaction and fiscal docs are audit records. Do not mutate/delete fiscal records casually.

### Auth / security

Cookie/httpOnly auth truth must remain. Do not reintroduce browser localStorage tokens or primary browser Authorization header.

## 14. Important open tails and recommended priority

### Tail 1 - WhatsApp CTA docs handoff

Priority: low-medium.

If strict documentation closure is desired, create a new current handoff:

```text
Cardigo_Enterprise_Handoff_2026-06-01_MarketingFloatingWhatsAppCTA_Closed.md
```

It should document:

- approved/hidden routes
- premium styling
- WhatsApp message/href
- hover color fix
- global anchor hover not regressed
- production operator confirmation
- no backend/db changes

Docs-only scope. No code.

### Tail 2 - Admin Analytics Source Explanation

Priority: medium.

This is useful because the user asked about direct vs Google and future operators may misinterpret `ישיר`.

Suggested contour:

```text
ADMIN_ANALYTICS_SOURCE_EXPLANATION_P1_AUDIT
```

Likely Phase 2 would be frontend-only UI helper text in `AdminAnalyticsView.jsx` and CSS Module if needed.

Do not change backend attribution logic unless a real gap is proven.

### Tail 3 - Blog/Guide SSG Freshness Decision

Priority: medium-high if admin content changes often.

Suggested contour:

```text
BLOG_GUIDE_SSG_CONTENT_FRESHNESS_AFTER_ADMIN_UPDATE_P2_DECISION
```

Do not jump to implementation. First decide between:

- background revalidation fetch after first paint
- Netlify build hook after admin save
- admin warning that rebuild is required

Enterprise recommendation: audit current admin save flows and SSG build hooks first. Avoid automatic deploy hooks without rate limiting, debouncing, auth proof, and failure visibility.

### Tail 4 - Google Search Console integration

Priority: medium for SEO growth, not urgent runtime.

Suggested contour:

```text
ADMIN_GSC_INTEGRATION_P1_AUDIT
```

Requires careful product/security planning:

- OAuth or service account feasibility
- GSC property ownership
- data retention
- UI shape
- query privacy
- scheduled fetch/cache
- no mixing with internal site analytics without clear labels

### Tail 5 - gclid capture

Priority: only if Cardigo runs Google Ads.

Suggested contour:

```text
SITE_ANALYTICS_GCLID_PAID_ATTRIBUTION_P1_AUDIT
```

Purpose:

- capture `gclid`
- classify paid Google Ads separately from organic Google
- avoid conflating ads and organic search

### Tail 6 - DB governance for fresh disposable DBs

Priority: medium for CI/staging quality.

Issue:

Fresh disposable DB lacks full Card index footprint unless manually bootstrapped. Need explicit createIndex-only migrations, not syncIndexes.

Suggested contour:

```text
CARD_INDEX_BOOTSTRAP_GOVERNANCE_P1_AUDIT
```

Never use `syncIndexes()` as general solution.

### Tail 7 - /og cache hardening

Priority: medium.

Public card OG direct backend currently has no custom Cache-Control change from that contour. Edge social route has public cache. Cache hardening should be separate.

Suggested contour:

```text
PUBLIC_CARD_OG_CACHE_HARDENING_P1_AUDIT
```

### Tail 8 - Dead-code cleanup in og.routes.js

Priority: low.

After deterministic card OG replaced old meta-refresh logic, some helpers may be dead for card scope but still used by blog/guides. Cleanup must be separate and audited.

## 15. How the next ChatGPT window should start

Recommended first message in the new chat:

```text
Ты Senior Project Architect / Senior Full-Stack Engineer / Backend Engineer / Frontend Engineer / Security Engineer для Cardigo.

Я продолжаю проект Cardigo из предыдущего окна. Прочитай следующий handoff как источник правды. Работай строго по enterprise workflow: audit -> minimal fix -> verification -> docs -> rollout. Copilot Agent является исполнителем, а ты архитектор.

Hard constraints for every Copilot prompt:
- PROJECT MODE: Cardigo enterprise workflow.
- No git commands
- No inline styles
- CSS Modules only
- Flex only - no grid
- Mobile-first mandatory
- Typography policy: font-size only via var(--fs-*), --fs-* rem-only, no px/em/%/vw/vh/clamp/fluid, no calc(non-rem)
- Always require PROOF file:line-range
- Always require RAW stdout + EXIT
- No scope creep
- No changes before audit
- Use PowerShell + curl.exe for smoke/manual checks

Current closed contours:
- Public Card deterministic OG HTML closed and production verified.
- Blog/Guide markdown links + SSG freshness docs closed.
- Marketing floating WhatsApp CTA closed and production verified.
- Admin analytics Google organic referral audit says backend already supports Google when referrer exists; direct may include privacy-stripped Google but cannot be recovered.

Next possible scope: [insert next scope here]. Start with Phase 1 read-only audit only.
```

## 16. Standard Copilot prompt template

Use this template for almost every new scope:

```text
PROJECT MODE: Cardigo enterprise workflow.

Ты Copilot Agent, acting as [Senior role based on task] for Cardigo.

CONTOUR:
[CONTOUR_NAME]

PHASE:
Phase 1 - Read-only Audit only.

GOAL:
[Clear goal]

Hard constraints:
- No git commands
- No inline styles
- CSS Modules only
- Flex only - no grid
- Mobile-first mandatory
- Typography policy:
  - font-size only via var(--fs-*)
  - --fs-* rem-only
  - no px/em/%/vw/vh/clamp/fluid
  - no calc(non-rem)
- No edits in audit
- No deploy
- No DB writes unless explicitly authorized for safe disposable DB
- Always provide PROOF file:line-range

TASKS:
1. Map current architecture and flow.
2. Identify exact files and boundaries.
3. Prove current behavior with file:line.
4. Classify risks P0/P1/P2/P3.
5. Decide if implementation is needed.
6. Propose minimal bounded Phase 2 plan only if safe.
7. Define verification gates.
8. Stop.

OUTPUT FORMAT:
A. EXECUTIVE VERDICT
B. CURRENT FLOW MAP
C. PROOF TABLE
D. RISK REGISTER
E. IMPLEMENTATION OPTIONS
F. RECOMMENDED ENTERPRISE PLAN
G. STRICT OUT OF SCOPE
H. VERIFICATION PLAN
I. OPEN QUESTIONS
J. STOP
```

## 17. Deployment signal policy

ChatGPT must explicitly say when deployment is allowed. Copilot should not infer deploy permission.

Use statuses like:

```text
DEPLOY_ALLOWED_FOR_PRODUCTION_SMOKE: YES
DEPLOY_ALLOWED_FOR_PRODUCTION_SMOKE: NO
DEPLOY_CODE_READY: YES
BACKEND_DEPLOY_REQUIRED: NO
FRONTEND_DEPLOY_REQUIRED: YES
ROLLBACK_REQUIRED: NO
```

For production smoke:

- Use read-only GETs.
- No production DB writes.
- No controlled-write sanity scripts on `cardigo_prod`.
- Use real production fixtures only when needed.
- Define rollback triggers before smoke.

## 18. Safe DB policy

Controlled-write sanity scripts must not run against `cardigo_prod` unless explicitly designed and authorized. Prefer disposable DB:

```text
DB_NAME must not be cardigo_prod
No bypass env on prod-like DB
No secrets printed
No syncIndexes
No destructive operations
```

If a fresh disposable DB lacks indexes, classify as DB provisioning/governance tail. Do not solve with `syncIndexes()`.

## 19. Documentation policy

After meaningful code/product changes, create or update docs only after verification is closed.

Rules:

- Do not edit archive handoffs.
- Do not rewrite closed current handoffs.
- Create a new current handoff for meaningful closed contours.
- Run secret scans on docs.
- Avoid overclaims.
- State deferred tails clearly.

Recommended docs style:

- Executive status.
- Behavior contract.
- Architecture summary.
- Verification summary with raw gates.
- Production proof if applicable.
- Protected invariants.
- Files changed.
- Open tails.
- Final operator note.

## 20. Product roadmap emphasis

Keep improving:

- Authorization and registration hardening.
- Invalid-token and API error handling.
- Data-protection layers.
- Monitoring and CI/CD baseline.
- Production smoke discipline.
- SEO public rendering and content freshness.
- Admin analytics clarity.
- Search Console integration planning.
- Security/vulnerability/performance/stress testing.
- Operational documentation and team handoffs.

Do not chase shiny changes before closing current tails.

## 21. Final note for the next architect

The project is now in a stronger public SEO and marketing state than before:

- Public card social/OG rendering is deterministic and production-proven.
- Blog/guides internal linking in admin content works and is production-proven.
- SSG freshness behavior is understood and documented.
- Floating WhatsApp CTA is live, premium-styled, and operator-approved.
- Google organic attribution is already supported when referrer exists.

The next valuable work should be chosen deliberately. Recommended next bounded choices:

1. Docs handoff for WhatsApp CTA if strict documentation closure is desired.
2. Admin analytics source explanation UI.
3. Blog/guide SSG freshness decision.
4. Google Search Console integration audit.
5. gclid capture audit if Google Ads is active.

Do not reopen closed contours unless a new concrete regression is proven.
