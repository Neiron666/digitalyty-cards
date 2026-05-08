# SEO Public Indexability — Operational Runbook (Cardigo)

**Scope:** Full public indexability of cardigo.co.il — blog, guides, cards, marketing pages.
**Status:** Live (gate removed 2026-05-03). All 10 SEO contours CLOSED as of 2026-05-05.
**Canonical domain SSoT:** https://cardigo.co.il (non-www; www redirects at DNS/hosting layer)

---

## 1. Purpose

This runbook is the authoritative operational reference for all public SEO infrastructure on cardigo.co.il.

Use it to:

- Verify the live state of crawlability, indexation, and social previews
- Debug OG/meta tag issues for blog, guides, and cards
- Understand the two render paths (Google/WRS vs social preview bots)
- Know which items are deferred and why

For per-card admin SEO scripts and field definitions, see `docs/runbooks/seo-scripts.md`.
For blog/guides OG tag implementation details, see `docs/runbooks/docs_blog_seo_og_runbook.md`.
For the full closure record, see `docs/handoffs/current/Cardigo_Enterprise_Handoff_SEO_Public_Indexability_Closed_2026-05-05.md`.

---

## 2. Render-Path Architecture

Two render paths serve two distinct audiences:

```
Request → cardigo.co.il
          │
          ├─ UA in social bot allowlist?
          │  AND path is /card/*, /c/*, /blog/*, /guides/*?
          │        │
          │       YES
          │        ↓
          │  Netlify Edge Function (og-preview.js)
          │  → proxies to backend /og/* with shared proxy secret header
          │  → backend generates static OG HTML (article/card meta, image:alt,
          │    article:published_time, article:modified_time, article:author)
          │  → social bot sees static HTML (no JS execution needed)
          │        │
          │       [bot reads <meta> tags, returns to user]
          │
          └─ Browser / Googlebot / Bingbot / other?
                    │
                   YES
                    ↓
             Netlify _redirects SPA fallback → SPA (index.html + JS bundle)
             → react-helmet-async SeoHelmet
             → head tags injected at JS runtime
             → Googlebot (WRS) executes JS, sees rendered head
             → Blog/GuidePost.jsx emits JSON-LD + BreadcrumbList
             → SeoHelmet emits og:*, article:*, twitter:*, og:locale, og:site_name
```

**Static fallback (index.html):**
`frontend/index.html` contains static OG fallback meta for the homepage brand identity. These cover:

- Marketing-page bots not in the social bot allowlist
- Requests before any route-specific SeoHelmet renders

**Static Shell Policy (canonical ban + og:url preservation):**

`frontend/index.html` is the shared SPA shell served for every route via the Netlify catchall `/* /index.html 200`. Because it is shared across all routes, the following invariants are mandatory:

1. `rel="canonical"` is FORBIDDEN in `frontend/index.html`. A static canonical in the SPA shell applies the homepage URL as the canonical for every route (including `/cards`, `/pricing`, `/contact`, etc.) before JS runs. This causes canonical pollution for Googlebot/WRS on non-home routes. Route-specific canonical is owned exclusively by `SeoHelmet` at JS runtime, or by a future route-aware renderer.

2. Exactly one static `og:url` must remain in `frontend/index.html` with the value `https://cardigo.co.il/`. This is the intentional homepage social preview fallback for Facebook/WhatsApp bots that fall through to the SPA shell on `/` and on marketing pages not covered by the Edge Function. `og:url` and `rel="canonical"` are different signal classes: `rel="canonical"` is a Google/indexing consolidation hint; `og:url` is an Open Graph object URL for social preview renderers.

3. Marketing page route-specific social previews (`/cards`, `/pricing`, `/contact`, `/blog` listing, `/guides` listing) are NOT covered by this static fallback and remain deferred under `SEO_MARKETING_PAGES_SOCIAL_PREVIEW_P1`.

Contour history: `HOMEPAGE_STATIC_OG_PREVIEW` (2026-05-03) added the static OG block including a static canonical. `SEO_CANONICAL_DEDUP_STATIC_SHELL_P0` (2026-05-07) removed the static canonical; the `og:url` was intentionally preserved. `SEO_STATIC_SHELL_POLICY_GATE_P1` (2026-05-07) added a CI gate protecting both invariants.

Enforcement gate: `npm.cmd run check:seo-static-shell` (`frontend/scripts/check-seo-static-shell.mjs`) — runs locally and in CI. No production runtime impact.

---

## 3. robots.txt SSoT

**File:** `frontend/public/robots.txt`

```
User-agent: *
Allow: /
Disallow: /.netlify/
Disallow: /og/

Sitemap: https://cardigo.co.il/sitemap.xml
```

**Rule rationale:**

- `Allow: /` — all user-facing public pages are open to crawlers.
- `Disallow: /.netlify/` — Netlify internal function paths. Not user pages.
- `Disallow: /og/` — backend social-preview OG HTML. Not user pages. Social bots reach these via Edge Function proxy, not direct crawl.
- `/api/` intentionally NOT disallowed — Google WRS depends on `/api/*` for fetching public card, blog, and guide data during SPA rendering. A `Disallow: /api/` would prevent WRS from rendering public pages correctly and harm indexation.
- Private/auth/admin/editor route Disallow: **deferred** — wait for GSC to confirm noindex processing on these pages before adding. Adding too early could prevent crawling needed for noindex to be processed.

**Modification policy:**
Any change to robots.txt requires explicit contour with rationale and WRS impact analysis. Do not add `Disallow: /api/`.

---

## 4. sitemap.xml SSoT

**Endpoint:** `GET https://cardigo.co.il/sitemap.xml`
**Route handler:** `backend/src/routes/sitemap.routes.js`

**Composition:**

### Static paths (10) — lastmod="2026-05-03"

`/` `/blog` `/pricing` `/contact` `/guides` `/cards` `/privacy` `/terms` `/accessibility-statement` `/payment-policy`

### Dynamic blog paths

- `/blog/:slug` — status: "published" posts only
- Excludes: drafts, previousSlugs (aliases)
- `<lastmod>` from `post.updatedAt`

### Dynamic guide paths

- `/guides/:slug` — status: "published" guides only
- Excludes: drafts
- `<lastmod>` from `guide.updatedAt`

### Dynamic card paths

- `/card/:slug` — active personal cards with real paid billing, active org entitlement, adminOverride, or active card.adminTier only (free-tier and trial-premium both excluded via `resolveSeoIndexability` in `seoIndexability.js`; trial-premium has isPaid:true but is intentionally platformForcedNoindex)
- `/c/:orgSlug/:slug` — active org cards: org must be active + orgEntitlement loaded + membership active (org entitlement grants indexability via resolveSeoIndexability)
- `<lastmod>` from `card.updatedAt`

### Explicitly excluded from sitemap

- Free-tier public cards (noindex by policy via resolveSeoIndexability)
- Trial-premium cards (platformForcedNoindex despite isPaid:true; SEO editor access during trial does not grant indexability)
- Draft/unpublished blog and guide posts
- Private, admin, editor, payment, preview routes

---

## 5. Public Indexability Matrix

| Route                            | Indexable? | noindex source                                                    | Metadata source                     | Notes                                                                                                                                        |
| -------------------------------- | ---------- | ----------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| /                                | YES        | —                                                                 | SeoHelmet (Home.jsx)                | Marketing page                                                                                                                               |
| /blog                            | YES        | —                                                                 | SeoHelmet (Blog.jsx)                | Listing page                                                                                                                                 |
| /blog/:slug (published)          | YES        | —                                                                 | SeoHelmet + JSON-LD (BlogPost.jsx)  | article meta + Breadcrumbs                                                                                                                   |
| /blog/:slug (not found)          | NO         | SeoHelmet robots="noindex,nofollow"                               | notFound branch                     | Hebrew not-found title                                                                                                                       |
| /guides                          | YES        | —                                                                 | SeoHelmet (Guides.jsx)              | Listing page                                                                                                                                 |
| /guides/:slug (published)        | YES        | —                                                                 | SeoHelmet + JSON-LD (GuidePost.jsx) | article meta + Breadcrumbs                                                                                                                   |
| /guides/:slug (not found)        | NO         | SeoHelmet robots="noindex,nofollow"                               | notFound branch                     | Hebrew not-found title                                                                                                                       |
| /pricing                         | YES        | —                                                                 | SeoHelmet (Pricing.jsx)             | Marketing page                                                                                                                               |
| /contact                         | YES        | —                                                                 | SeoHelmet (Contact.jsx)             | Marketing page                                                                                                                               |
| /cards                           | YES        | —                                                                 | SeoHelmet (Cards.jsx)               | Marketing page                                                                                                                               |
| /privacy                         | YES        | —                                                                 | SeoHelmet (Privacy.jsx)             | Legal                                                                                                                                        |
| /terms                           | YES        | —                                                                 | SeoHelmet (Terms.jsx)               | Legal                                                                                                                                        |
| /accessibility-statement         | YES        | —                                                                 | SeoHelmet                           | Legal                                                                                                                                        |
| /payment-policy                  | YES        | —                                                                 | SeoHelmet                           | Legal                                                                                                                                        |
| /card/:slug (paid billing)       | YES        | —                                                                 | SeoHelmet (PublicCard.jsx)          | resolveSeoIndexability source=billing, isPaid:true                                                                                           |
| /card/:slug (org entitled)       | YES        | —                                                                 | SeoHelmet (PublicCard.jsx)          | resolveSeoIndexability source=organization                                                                                                   |
| /card/:slug (adminTier/override) | YES        | —                                                                 | SeoHelmet (PublicCard.jsx)          | resolveSeoIndexability source=adminTier or adminOverride                                                                                     |
| /card/:slug (free-tier)          | NO         | resolveSeoIndexability → cardDTO.js robots: "noindex" → SeoHelmet | Free-tier policy                    | noindex via card DTO                                                                                                                         |
| /card/:slug (trial-premium)      | NO         | resolveSeoIndexability → cardDTO.js robots: "noindex" → SeoHelmet | Trial policy                        | isPaid:true but intentionally platformForcedNoindex; sitemap excluded; SEO editor access (seo:true) during trial does NOT grant indexability |
| /c/:orgSlug/:slug (org entitled) | YES        | —                                                                 | SeoHelmet (PublicCard.jsx)          | Org card; resolveSeoIndexability source=organization                                                                                         |
| /preview/\*                      | NO         | SeoHelmet hardcoded noindex                                       | PreviewCard.jsx                     | Always noindex                                                                                                                               |
| /payment/checkout                | NO         | SeoHelmet robots="noindex,nofollow"                               | CheckoutPage.jsx                    | Always noindex                                                                                                                               |
| /payment/iframe-return           | NO         | SeoHelmet robots="noindex,nofollow"                               | IframeReturnPage.jsx                | Always noindex                                                                                                                               |

---

## 6. OG/Social Preview Route Matrix

| Path                  | Edge intercept?     | Backend route        | Bot UA required                                                                                                               |
| --------------------- | ------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| /blog/:slug           | YES (og-preview.js) | /og/blog/:slug       | facebookexternalhit, WhatsApp, Twitterbot, LinkedInBot, TelegramBot, Slackbot, Slack-ImgProxy, Discordbot, Pinterest, vkShare |
| /guides/:slug         | YES (og-preview.js) | /og/guides/:slug     | same allowlist                                                                                                                |
| /card/:slug           | YES (og-preview.js) | /og/card/:slug       | same allowlist                                                                                                                |
| /c/:orgSlug/:slug     | YES (og-preview.js) | /og/c/:orgSlug/:slug | same allowlist                                                                                                                |
| / and marketing pages | NO (falls through)  | —                    | — (uses index.html static fallback)                                                                                           |

**Googlebot and Bingbot are intentionally NOT intercepted.** They receive the SPA shell and WRS renders the head tags from react-helmet-async.

---

## 7. Blog/Guides JSON-LD Inventory

### BlogPost.jsx — emits two scripts in successful branch

**Script 1: BlogPosting**

```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "@id": "https://cardigo.co.il/blog/<slug>",
  "url": "https://cardigo.co.il/blog/<slug>",
  "mainEntityOfPage": "https://cardigo.co.il/blog/<slug>",
  "headline": "<post.title>",
  "description": "<post.excerpt>",
  "image": "<post.heroImage.url>",
  "datePublished": "<post.publishedAt>",
  "dateModified": "<post.updatedAt>",
  "inLanguage": "he",
  "author": { "@type": "Person", "name": "<post.authorName>" },
  "publisher": { "@type": "Organization", "name": "Cardigo", "logo": {...} }
}
```

**Script 2: BreadcrumbList**

```json
{
    "@type": "BreadcrumbList",
    "itemListElement": [
        { "position": 1, "name": "בית", "item": "https://cardigo.co.il" },
        { "position": 2, "name": "בלוג", "item": "https://cardigo.co.il/blog" },
        { "position": 3, "name": "<post.title>" }
    ]
}
```

### GuidePost.jsx — emits same structure

- Script 1: `@type: "Article"` (not BlogPosting) — same fields
- Script 2: BreadcrumbList — `/guides` instead of `/blog`

---

## 8. Article Meta Inventory

### Path A — SeoHelmet.jsx props (Googlebot / browsers)

| Meta tag               | Prop                 | Source in BlogPost.jsx / GuidePost.jsx |
| ---------------------- | -------------------- | -------------------------------------- |
| article:published_time | articlePublishedTime | post.publishedAt                       |
| article:modified_time  | articleModifiedTime  | post.updatedAt                         |
| article:author         | articleAuthor        | post.authorName                        |

Only emitted in the successful (published) branch. notFound/loading/error branches do not pass article meta props.

### Path B — Backend og.routes.js (social bots)

Both `/og/blog/:slug` and `/og/guides/:slug` handlers emit:

- `article:published_time` from `post.publishedAt`
- `article:modified_time` from `post.updatedAt`
- `article:author` from `post.authorName || DEFAULT_BLOG_AUTHOR_NAME`

---

## 9. Image Alt Meta Inventory

### Path A — SeoHelmet.jsx

New prop: `imageAlt`
Guard: emitted only when both `image` AND `imageAlt` are truthy. No empty alt emitted.

Tags emitted:

- `og:image:alt` content={imageAlt}
- `twitter:image:alt` content={imageAlt}

Source in BlogPost.jsx and GuidePost.jsx:

```
imageAlt={post.heroImageAlt || post.title || undefined}
```

`post.heroImageAlt` = `post.heroImage?.alt` (admin-authored field, max 200 chars).
`post.title` = fallback (required field).

### Path B — og.routes.js

```js
const imageAlt = image
    ? collapseWs(post.heroImage?.alt) || collapseWs(post.title) || ""
    : "";
```

Emitted as:

- `og:image:alt` (conditional on image)
- `twitter:image:alt` (conditional on image)

`collapseWs` normalizes internal whitespace to single spaces and trims. `escapeHtml` applied to output.

### Deferred gaps

- Marketing/listing pages (Home, Cards, Pricing, Contact, Blog listing, Guides listing): `SEO_IMAGE_ALT_META_MARKETING_P1`
- PublicCard.jsx: `SEO_PUBLIC_CARD_IMAGE_ALT_META_P2`
- `/og/card/:slug` and `/og/c/:orgSlug/:slug` `twitter:image:alt`: pre-existing gap, deferred

---

## 10. Soft-404 Behavior

When a blog or guide slug is not found (API 404) or not published:

- `BlogPost.jsx` / `GuidePost.jsx` renders `notFound` branch
- SeoHelmet receives: `robots="noindex, nofollow"`, Hebrew not-found title
- Emits: `<meta name="robots" content="noindex, nofollow" data-rh="true">`
- Does NOT emit article meta (article:published_time etc.)
- Does NOT emit JSON-LD (noJSON-LD in notFound branch)

**Backend Path B:** missing slug → 404 response from backend OG handler (anti-enumeration, no existence leak).

**Loading/error branches:** deliberately do NOT emit noindex. Reason: a transient fetch error during WRS crawl would emit noindex on a valid URL, potentially causing incorrect deindexation.

---

## 11. Operator Production Smoke Commands

```powershell
$UA = "facebookexternalhit/1.1"
$BLOG_SLUG = "post-7a9572f4"
$GUIDE_SLUG = "seo"

# Blog social preview — expect og:type=article, og:image:alt, article:published_time
curl.exe -s -A $UA "https://cardigo.co.il/blog/$BLOG_SLUG" `
  | findstr /i "og:type" "og:image:alt" "article:published_time" "twitter:image:alt"

# Guide social preview — same expectations
curl.exe -s -A $UA "https://cardigo.co.il/guides/$GUIDE_SLUG" `
  | findstr /i "og:type" "og:image:alt" "article:published_time" "twitter:image:alt"

# Missing blog slug — must return HTTP 404
curl.exe -s -o NUL -w "%{http_code}" -A $UA "https://cardigo.co.il/blog/nonexistent-zzz999"

# Card regression — must still return card-specific OG
curl.exe -s -A $UA "https://cardigo.co.il/card/cardigo" `
  | findstr /i "og:title" "og:image:alt" "og:url"

# robots.txt — must include BOTH Disallow rules
curl.exe -s "https://cardigo.co.il/robots.txt"

# Sitemap — must include blog, guides, card entries with lastmod
curl.exe -s "https://cardigo.co.il/sitemap.xml" `
  | findstr /i "blog" "guides" "lastmod" "cardigo"
```

**Rendered head verification (browser devtools):**

1. Open https://cardigo.co.il/pricing → inspect `<head>` → confirm:
    - `meta property="og:locale" content="he_IL"`
    - `meta property="og:site_name" content="Cardigo"`

2. Open https://cardigo.co.il/blog/<slug-with-hero> → inspect `<head>` → confirm:
    - `meta property="og:image:alt"` present (non-empty)
    - `meta property="article:published_time"` present

**Rich Results Test:**

- https://search.google.com/test/rich-results?url=https%3A%2F%2Fcardigo.co.il%2Fblog%2Fpost-7a9572f4
- Expected: Article + Breadcrumbs detected, 0 errors.

---

## 12. GSC Checklist

**Updated: 2026-05-07 — SEO_GSC_DISCOVERED_NOT_INDEXED_TRIAGE_P1 Phase 1 accepted**

As of 2026-05-07, GSC shows the following six URLs as "Discovered — currently not indexed" with last crawl date absent:

- /privacy
- /terms
- /accessibility-statement
- /payment-policy
- /card/cardigo
- /c/digitalyty/digital-card

A read-only triage audit found no known code/config blocker from read-only audit (HTTP 200 for all six, no X-Robots-Tag noindex, all six in sitemap, robots.txt allows all six, no global noindex in index.html). "Discovered — currently not indexed" with absent last-crawl is consistent with normal CSR/SPA crawl queue behavior.

Formal GSC ownership verification and sitemap submission status still require operator confirmation if not already completed. Manual URL Inspection, Test Live URL, and Request Indexing are pending under SEO_GSC_MANUAL_URL_INSPECTION_AND_REQUEST_INDEXING_P0_OPS.

Note: /c/digitalyty/digital-card requires a product/operator decision before requesting indexing — see SEO_ORG_CARD_DIGITALYTY_BOUNDARY_DECISION_P1.

When ready, steps:

1. Add GSC HTML verification file to `frontend/public/` OR use DNS TXT record verification (preferred, avoids deploying a file).
2. Verify property: https://cardigo.co.il
3. Submit sitemap: https://cardigo.co.il/sitemap.xml
4. For each of the six triage URLs: GSC → URL Inspection → Test Live URL → Request Indexing.
5. Check Index Coverage report after 48–72 hours for crawl errors.
6. Check Rich Results in GSC for Blog and Guides structured data.
7. Monitor for any WRS rendering errors under "Enhancements" tab.

---

## 13. Deferred SEO Register

| Item                                             | Contour                                                   | Priority                 | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------ | --------------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GSC ownership + sitemap submission               | POST_LAUNCH_SEARCH_CONSOLE_AND_SITEMAP_SUBMISSION_P1      | P1                       | Cannot monitor indexing without this                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Marketing page imageAlt                          | SEO_IMAGE_ALT_META_MARKETING_P1                           | P1                       | 6 files: Home, Cards, Pricing, Contact, Blog, Guides listing                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| PublicCard.jsx imageAlt                          | SEO_PUBLIC_CARD_IMAGE_ALT_META_P2                         | P2                       | Scoped audit required — card fields are user-controlled                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| twitter:image:alt for /og/card/\*                | —                                                         | P2                       | Pre-existing gap in og.routes.js card handlers                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| og:image:secure_url, width, height, type         | —                                                         | P3                       | Blog/guides OG HTML, backend path                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Private/admin route Disallow                     | —                                                         | P2                       | Deferred until GSC confirms noindex processed                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| og-drift CI check                                | —                                                         | P3                       | Alignment check: index.html vs Home.jsx OG                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| sitemap index / image sitemap                    | —                                                         | Scale                    | Post-GSC-data decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| True HTTP 404 for SPA not-found                  | —                                                         | P2                       | Infrastructure/hosting contour                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| SSR/prerender indexability                       | —                                                         | P2                       | Defer until GSC shows WRS issues                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| fb:app_id / Meta app governance                  | —                                                         | P3                       | Product decision required                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Free-tier card noindex policy review             | —                                                         | P3                       | Product decision: OG preview vs noindex                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Static shell canonical policy gate               | SEO_STATIC_SHELL_POLICY_GATE_P1                           | CLOSED                   | CI/local gate preventing static canonical reintroduction and preserving homepage og:url fallback. Command: `npm.cmd run check:seo-static-shell`. Invariants protected: (1) no static `rel="canonical"` in `frontend/index.html`; (2) exactly one static `og:url`; (3) `og:url` value is `https://cardigo.co.il/`. Production result: initial HTML has no canonical; runtime canonical supplied by SeoHelmet; homepage og:url fallback remains. No source code, package.json, or handoff changes in this contour. |
| Marketing page route-specific OG/social preview  | SEO_MARKETING_PAGES_SOCIAL_PREVIEW_P1                     | P1 / DEFERRED            | Routes `/cards`, `/pricing`, `/contact`, `/blog` listing, `/guides` listing still fall through to the homepage `og:url`/`og:title` static fallback for social bots. These routes are not covered by the Netlify Edge Function. This is separate from Google canonical/indexing. Do not mark as closed.                                                                                                                                                                                                           |
| Owner JSON-LD 5000-char length limit             | SCHEMA_OWNER_JSONLD_LENGTH_LIMIT_P1                       | CLOSED / PASS            | `card.seo.jsonLd` — backend Card.model.js + frontend EditCard.jsx + SeoPanel.jsx maxLength={5000}. Empty/null allowed. >5000 chars or invalid JSON rejected. Existing oversized DB values fail on rewrite only.                                                                                                                                                                                                                                                                                                  |
| Owner JSON-LD @type allowlist + nested blocklist | SCHEMA_OWNER_JSONLD_TYPE_ALLOWLIST_P1                     | CLOSED / PASS            | Allowed top-level @type: LocalBusiness, Organization, Person, Service. @graph rejected. Missing @type rejected. Nested Review/AggregateRating/Rating rejected. MAX_NESTING_DEPTH=10 fail-closed. Files: Card.model.js, EditCard.jsx.                                                                                                                                                                                                                                                                             |
| Blog/Guides paginated archive FAQPage suppress   | SCHEMA_BLOG_GUIDES_PAGINATION_FAQ_SCHEMA_P1               | CLOSED / PASS            | Blog.jsx and Guides.jsx emit FAQPage JSON-LD only on effectivePage <= 1. /blog/page/N and /guides/page/N (N>1) receive jsonLdItems=[]. Fixes schema/canonical mismatch on paginated archive pages.                                                                                                                                                                                                                                                                                                               |
| GSC six-URL triage                               | SEO_GSC_DISCOVERED_NOT_INDEXED_TRIAGE_P1                  | Phase 1 accepted         | No known code/config blocker found from read-only audit. Six URLs: /privacy, /terms, /accessibility-statement, /payment-policy, /card/cardigo, /c/digitalyty/digital-card. All HTTP 200, no noindex, all in sitemap. Manual GSC operator steps pending.                                                                                                                                                                                                                                                          |
| GSC manual URL Inspection + Request Indexing     | SEO_GSC_MANUAL_URL_INSPECTION_AND_REQUEST_INDEXING_P0_OPS | PENDING OPERATOR ACTION  | GSC URL Inspection → Test Live URL → Request Indexing for each of the six triage URLs. /c/digitalyty/digital-card requires product decision first. No code change required.                                                                                                                                                                                                                                                                                                                                      |
| Digitalyty org-card indexability decision        | SEO_ORG_CARD_DIGITALYTY_BOUNDARY_DECISION_P1              | PENDING PRODUCT DECISION | Is /c/digitalyty/digital-card intentionally public/demo or internal test? If internal test: set robots=noindex or unpublish. If intentional: leave as-is and proceed with GSC request.                                                                                                                                                                                                                                                                                                                           |
| Legal pages metadata gap                         | SEO_LEGAL_PAGES_METADATA_GAP_P2                           | P2 / PENDING             | Privacy.jsx, Terms.jsx, Accessibility.jsx, PaymentPolicy.jsx: hardcoded canonical strings instead of ORIGIN constant; no image/imageAlt passed to SeoHelmet. Future contour.                                                                                                                                                                                                                                                                                                                                     |
| Internal linking and sitemap signal              | SEO_INTERNAL_LINKING_AND_SITEMAP_SIGNAL_P2                | P2 / DEFERRED            | Footer/nav link audit for crawl discoverability. Post-GSC-data decision.                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Dynamic Googlebot rendering governance           | SEO_DYNAMIC_GOOGLEBOT_RENDERING_GOVERNANCE_P2             | P2 / DEFERRED            | Defer until GSC shows WRS rendering errors. No current evidence of WRS issues.                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| GuidePost @type decision                         | SCHEMA_GUIDEPOST_TYPE_DECISION_P2                         | P2 / DEFERRED            | GuidePost.jsx emits @type: "Article". Product/SEO decision whether to keep Article or change to HowTo or another type.                                                                                                                                                                                                                                                                                                                                                                                           |
| Schema builders centralization                   | SCHEMA_BUILDERS_CENTRALIZATION_P2                         | P2 / DEFERRED            | JSON-LD builder functions spread across Blog.jsx, Guides.jsx, BlogPost.jsx, GuidePost.jsx. Future centralization refactor.                                                                                                                                                                                                                                                                                                                                                                                       |
| Schema drift gate                                | SCHEMA_DRIFT_GATE_P2                                      | P2 / DEFERRED            | CI gate to detect schema drift between SeoHelmet output and expected JSON-LD shape. No gate exists yet.                                                                                                                                                                                                                                                                                                                                                                                                          |

---

## 14. Anti-Drift Policy

### Cardigo is the product brand (SSoT)

- `og:site_name` = "Cardigo" (hardcoded constant in SeoHelmet.jsx)
- `og:locale` = "he_IL" (hardcoded constant in SeoHelmet.jsx)
- Canonical domain = https://cardigo.co.il
- All public-facing SEO, meta, JSON-LD publisher name = "Cardigo"

**Digitalyty is NOT the Cardigo product identity.**
Digitalyty is an organization on the Cardigo platform (a Cardigo customer/partner). The name "Digitalyty" may appear only:

- In URLs for Digitalyty's own org cards: `/c/digitalyty/...`
- In this anti-drift policy section of docs

"Digitalyty" must NOT appear in:

- `og:site_name` or any generic OG brand fallback
- JSON-LD `publisher.name`
- Any canonical product identity in documentation or code comments outside of org-specific contexts

### Verification

To check for brand drift in docs:

```powershell
Select-String -Path "docs\runbooks\seo-public-indexability-runbook.md","docs\handoffs\current\Cardigo_Enterprise_Handoff_SEO_Public_Indexability_Closed_2026-05-05.md" -Pattern "Digitalyty" | Where-Object { $_.Line -notmatch "anti-drift|NOT the Cardigo|Digitalyty is" }
```

Expected: 0 matches outside anti-drift sections.

---

## 15. Files Under This Runbook's Governance

| File                                            | Purpose                                                   | Change policy                                                                                                                                                                                                                                                      |
| ----------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `frontend/public/robots.txt`                    | robots.txt SSoT                                           | Requires contour + WRS impact analysis                                                                                                                                                                                                                             |
| `backend/src/routes/sitemap.routes.js`          | sitemap generation                                        | Requires contour; verify with sitemap curl                                                                                                                                                                                                                         |
| `frontend/netlify/edge-functions/og-preview.js` | Social bot intercept paths and UA allowlist               | Requires contour; test with bot UA curl after change                                                                                                                                                                                                               |
| `backend/src/routes/og.routes.js`               | OG HTML for social bots                                   | Requires contour; do NOT add private fields                                                                                                                                                                                                                        |
| `frontend/src/components/seo/SeoHelmet.jsx`     | react-helmet-async head tags                              | Requires contour; run frontend gates after change                                                                                                                                                                                                                  |
| `frontend/src/pages/BlogPost.jsx`               | Blog SPA head tags + JSON-LD                              | Requires contour; run frontend gates after change                                                                                                                                                                                                                  |
| `frontend/src/pages/GuidePost.jsx`              | Guide SPA head tags + JSON-LD                             | Requires contour; run frontend gates after change                                                                                                                                                                                                                  |
| `frontend/src/pages/Blog.jsx`                   | Blog archive listing; controls FAQPage JSON-LD emission   | Any change to jsonLdItems / FAQPage conditional / pagination canonical logic requires a bounded SEO contour and frontend gates (check:contract, build). Contour SCHEMA_BLOG_GUIDES_PAGINATION_FAQ_SCHEMA_P1 closed 2026-05-07.                                     |
| `frontend/src/pages/Guides.jsx`                 | Guides archive listing; controls FAQPage JSON-LD emission | Any change to jsonLdItems / FAQPage conditional / pagination canonical logic requires a bounded SEO contour and frontend gates (check:contract, build). Contour SCHEMA_BLOG_GUIDES_PAGINATION_FAQ_SCHEMA_P1 closed 2026-05-07.                                     |
| `frontend/src/components/card/cardDTO.js`       | Per-card noindex injection                                | Do not remove free-tier noindex without product approval                                                                                                                                                                                                           |
| `frontend/index.html`                           | Shared SPA shell; homepage social preview fallback only   | Must NOT contain static `rel="canonical"`. Must contain exactly one homepage `og:url` fallback (`https://cardigo.co.il/`). Must not be used as route-specific metadata SSoT. Run `npm.cmd run check:seo-static-shell` after any change.                            |
| `frontend/scripts/check-seo-static-shell.mjs`   | SEO static shell anti-regression CI gate                  | Enforces: no static canonical; exactly one homepage `og:url`; `og:url` value is `https://cardigo.co.il/`. Runs via `npm.cmd run check:seo-static-shell`. No production runtime impact. Do not weaken checks without explicit contour approval and re-verification. |
