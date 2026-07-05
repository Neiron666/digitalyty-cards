# SEO Public Indexability вЂ” Operational Runbook (Cardigo)

**Scope:** Full public indexability of cardigo.co.il вЂ” blog, guides, cards, marketing pages.
**Status:** Live (gate removed 2026-05-03). 13 SEO contours CLOSED as of 2026-05-09. PUBLIC*CARD_OG_INITIAL_METADATA_EDGE_INJECTION_P2A CLOSED/PRODUCTION VERIFIED 2026-05-09. STATIC_SOCIAL_META_HELMET_DEDUP_P2 CLOSED/PRODUCTION VERIFIED 2026-05-09. MARKETING_STATIC_ROUTES_INITIAL_METADATA_AUDIT_P1 CLOSED/PRODUCTION VERIFIED 2026-05-09. SEO_HOMEPAGE_TITLE_SINGULAR_INTENT CLOSED/PRODUCTION VERIFIED 2026-05-23. SEO_TWITTER_CARD_GUARD_P2 CLOSED/PRODUCTION VERIFIED 2026-05-23. SEO_BACKEND_OG_METADATA_PARITY_P2 CLOSED/PRODUCTION VERIFIED 2026-05-23. (Count baseline 13 as of 2026-05-09 preserved; total not incremented — a comprehensive recount including post-2026-05-09 SCHEMA*\_, AUTHCONTEXT\_\_, and WRS contour closures is needed before asserting a new total.) PUBLIC_CARD_SEO_RENDERING_D1_CHAIN CLOSED/PRODUCTION VERIFIED 2026-06-01: P2A-FIX CLOSED/PASS, P2B-1 CLOSED/PASS, P2B-2 CLOSED/PASS, P2B-3 CLOSED/PASS, PUBLIC_CARD_EDGE_VISIBLE_BODY_FALLBACK_D1 CLOSED/PASS. See Section 21 and `docs/handoffs/current/Cardigo_Enterprise_Handoff_2026-06-01_PublicCard_SEO_Rendering_D1_Closed.md`. PUBLIC_CARD_FALLBACK_DISABLE_P2B_MINIMAL CLOSED/PRODUCTION VERIFIED 2026-06-01. See Section 22 and `docs/handoffs/current/Cardigo_Enterprise_Handoff_2026-06-01_PublicCard_Fallback_Disable_P2B_Closed.md`.
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
Request в†’ cardigo.co.il
          в”‚
          в”њв”Ђ UA in social bot allowlist?
          в”‚  AND path is /card/*, /c/*, /blog/*, /guides/*?
          в”‚        в”‚
          в”‚       YES
          в”‚        в†“
          в”‚  Netlify Edge Function (og-preview.js) вЂ“ CRAWLER branch (updated 2026-06-01)
          в”‚  в†’ fetches backend /og/* for metadata (not served directly)
          в”‚  в†’ fetches SPA shell via context.next()
          в”‚  в†’ extracts/injects whitelisted head tags from /og HTML:
          в”‚    title, meta description, canonical, robots (if present),
          в”‚    og:* metas, twitter:* metas,
          в”‚    JSON-LD FAQPage + LocalBusiness (data-cardigo-edge-ld="1")
          в”‚  в†’ body fallback injection DISABLED (PUBLIC_CARD_FALLBACK_DISABLE_P2B_MINIMAL 2026-06-01) вЂ“ Edge head + JSON-LD only
          в”‚    (no fallback body in raw Edge HTML; #root is empty; see Section 22)
          в”‚  в†’ Cache-Control: public, max-age=60, stale-while-revalidate=300, Vary: User-Agent
          в”‚  [Same enriched shell served to browsers AND Googlebot]
          в”‚        в”‚
          в”‚       [Crawler/browser sees SPA shell with per-card metadata,
          в”‚        Edge-marked JSON-LD, empty #root вЂ“ body fallback DISABLED]
          в”‚        в”‚
          в”‚       React runtime (browser): #root empty вЂ“ createRoot().render(app)
          в”‚        SeoHelmet: suppresses duplicate JSON-LD (P2B-1) and
          в”‚                   selected duplicate non-JSON-LD meta (P2B-3)
          в”‚        PublicCard: hasEdgeFallback detection + cleanup useEffect remain as inert P2A residue (fallback absent)
          в”‚
          в”њв”Ђ UA is Googlebot / Googlebot-Image / bingbot?
          в”‚  AND path is a top-level marketing route?
          в”‚  (/pricing, /blog, /guides, /cards, /contact)
          в”‚        в”‚
          в”‚       YES
          в”‚        в†“
          в”‚  Netlify Edge Function (og-preview.js) вЂ” CRAWLER branch
          в”‚  в†’ builds route-specific metadata from marketingMeta.config.js
          в”‚  в†’ builds static OG HTML with canonical (includeCanonical=true)
          в”‚  в†’ fetches SPA shell via context.next()
          в”‚  в†’ injects canonical + og:* + title into SPA shell head
          в”‚  в†’ Cache-Control: no-store, Vary: User-Agent
          в”‚        в”‚
          в”‚       [Googlebot sees SPA shell with route-specific head]
          в”‚
          в”њв”Ђ UA is Googlebot / Googlebot-Image / bingbot?
          в”‚  AND path is NOT /card/:slug, /c/:orgSlug/:slug,
          в”‚  or a top-level marketing route?
          в”‚        в”‚
          в”‚       YES (blog/:slug, guides/:slug, /, other paths)
          в”‚        в†“
          в”‚  context.next() в†’ normal SPA shell (no injection)
          в”‚
          в””в”Ђ Browser / other UA?
                    в”‚
                   YES
                    в†“
             path is /card/:slug or /c/:orgSlug/:slug?
             |
            YES --> Edge (og-preview.js) --> context.next() --> card-ssr Netlify Function
                  (SSR_REAL_ROUTE_PRODUCTION_ROLLOUT -- CLOSED / PASS / PRODUCTION VERIFIED 2026-07-05)
                  card-ssr renders full React SSR body + sanitized data island.
                  Edge injects title/canonical/og:*/JSON-LD (data-cardigo-edge-ld="1") into head.
                  Cache-Control: no-store, max-age=0, Vary: User-Agent.
                  [Browser/Googlebot receives full SSR HTML with data island in #root]
             |
            NO --> Netlify _redirects SPA fallback --> SPA (index.html + JS bundle)
             --> react-helmet-async SeoHelmet
             --> head tags injected at JS runtime
             --> Googlebot (WRS) executes JS, sees rendered head for blog/guides
             --> Blog/GuidePost.jsx emits JSON-LD + BreadcrumbList
             --> SeoHelmet emits og:*, article:*, twitter:*, og:locale, og:site_name
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

Enforcement gate: `npm.cmd run check:seo-static-shell` (`frontend/scripts/check-seo-static-shell.mjs`) вЂ” runs locally and in CI. No production runtime impact.

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

- `Allow: /` вЂ” all user-facing public pages are open to crawlers.
- `Disallow: /.netlify/` вЂ” Netlify internal function paths. Not user pages.
- `Disallow: /og/` вЂ” backend social-preview OG HTML. Not user pages. Social bots reach these via Edge Function proxy, not direct crawl.
- `/api/` intentionally NOT disallowed вЂ” Google WRS depends on `/api/*` for fetching public card, blog, and guide data during SPA rendering. A `Disallow: /api/` would prevent WRS from rendering public pages correctly and harm indexation.
- Private/auth/admin/editor route Disallow: **deferred** вЂ” wait for GSC to confirm noindex processing on these pages before adding. Adding too early could prevent crawling needed for noindex to be processed.

**Modification policy:**
Any change to robots.txt requires explicit contour with rationale and WRS impact analysis. Do not add `Disallow: /api/`.

---

## 4. sitemap.xml SSoT

**Endpoint:** `GET https://cardigo.co.il/sitemap.xml`
**Route handler:** `backend/src/routes/sitemap.routes.js`

**Composition:**

### Static paths (10) вЂ” lastmod="2026-05-03"

`/` `/blog` `/pricing` `/contact` `/guides` `/cards` `/privacy` `/terms` `/accessibility-statement` `/payment-policy`

### Dynamic blog paths

- `/blog/:slug` вЂ” status: "published" posts only
- Excludes: drafts, previousSlugs (aliases)
- `<lastmod>` from `post.updatedAt`

### Dynamic guide paths

- `/guides/:slug` вЂ” status: "published" guides only
- Excludes: drafts
- `<lastmod>` from `guide.updatedAt`

### Dynamic card paths

- `/card/:slug` вЂ” active personal cards with real paid billing, active org entitlement, adminOverride, or active card.adminTier only (free-tier and trial-premium both excluded via `resolveSeoIndexability` in `seoIndexability.js`; trial-premium has isPaid:true but is intentionally platformForcedNoindex)
- `/c/:orgSlug/:slug` вЂ” active org cards: org must be active + orgEntitlement loaded + membership active (org entitlement grants indexability via resolveSeoIndexability)
- `<lastmod>` from `card.updatedAt`

### Explicitly excluded from sitemap

- Free-tier public cards (noindex by policy via resolveSeoIndexability)
- Trial-premium cards (platformForcedNoindex despite isPaid:true; SEO editor access during trial does not grant indexability)
- Draft/unpublished blog and guide posts
- Private, admin, editor, payment, preview routes

---

## 5. Public Indexability Matrix

| Route                            | Indexable? | noindex source                                                        | Metadata source                                                               | Notes                                                                                                                                        |
| -------------------------------- | ---------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| /                                | YES        | вЂ”                                                                   | SeoHelmet (Home.jsx)                                                          | Marketing page                                                                                                                               |
| /blog                            | YES        | вЂ”                                                                   | SeoHelmet (Blog.jsx)                                                          | Listing page                                                                                                                                 |
| /blog/:slug (published)          | YES        | вЂ”                                                                   | SeoHelmet + JSON-LD (BlogPost.jsx)                                            | article meta + Breadcrumbs                                                                                                                   |
| /blog/:slug (not found)          | NO         | SeoHelmet robots="noindex,nofollow"                                   | notFound branch                                                               | Hebrew not-found title                                                                                                                       |
| /guides                          | YES        | вЂ”                                                                   | SeoHelmet (Guides.jsx)                                                        | Listing page                                                                                                                                 |
| /guides/:slug (published)        | YES        | вЂ”                                                                   | SeoHelmet + JSON-LD (GuidePost.jsx)                                           | article meta + Breadcrumbs                                                                                                                   |
| /guides/:slug (not found)        | NO         | SeoHelmet robots="noindex,nofollow"                                   | notFound branch                                                               | Hebrew not-found title                                                                                                                       |
| /pricing                         | YES        | вЂ”                                                                   | SeoHelmet (Pricing.jsx)                                                       | Marketing page                                                                                                                               |
| /contact                         | YES        | вЂ”                                                                   | SeoHelmet (Contact.jsx)                                                       | Marketing page                                                                                                                               |
| /cards                           | YES        | вЂ”                                                                   | SeoHelmet (Cards.jsx)                                                         | Marketing page                                                                                                                               |
| /privacy                         | YES        | вЂ”                                                                   | SeoHelmet (Privacy.jsx)                                                       | Legal                                                                                                                                        |
| /terms                           | YES        | вЂ”                                                                   | SeoHelmet (Terms.jsx)                                                         | Legal                                                                                                                                        |
| /accessibility-statement         | YES        | вЂ”                                                                   | SeoHelmet                                                                     | Legal                                                                                                                                        |
| /payment-policy                  | YES        | вЂ”                                                                   | SeoHelmet                                                                     | Legal                                                                                                                                        |
| /card/:slug (paid billing)       | YES        | вЂ”                                                                   | Initial HTML: Edge enriched shell + post-hydration SeoHelmet with suppression | resolveSeoIndexability source=billing, isPaid:true                                                                                           |
| /card/:slug (org entitled)       | YES        | вЂ”                                                                   | Initial HTML: Edge enriched shell + post-hydration SeoHelmet with suppression | resolveSeoIndexability source=organization                                                                                                   |
| /card/:slug (adminTier/override) | YES        | вЂ”                                                                   | Initial HTML: Edge enriched shell + post-hydration SeoHelmet with suppression | resolveSeoIndexability source=adminTier or adminOverride                                                                                     |
| /card/:slug (free-tier)          | NO         | resolveSeoIndexability в†’ cardDTO.js robots: "noindex" в†’ SeoHelmet | Free-tier policy                                                              | noindex via card DTO                                                                                                                         |
| /card/:slug (trial-premium)      | NO         | resolveSeoIndexability в†’ cardDTO.js robots: "noindex" в†’ SeoHelmet | Trial policy                                                                  | isPaid:true but intentionally platformForcedNoindex; sitemap excluded; SEO editor access (seo:true) during trial does NOT grant indexability |
| /c/:orgSlug/:slug (org entitled) | YES        | вЂ”                                                                   | Initial HTML: Edge enriched shell + post-hydration SeoHelmet with suppression | Org card; resolveSeoIndexability source=organization                                                                                         |
| /preview/\*                      | NO         | SeoHelmet hardcoded noindex                                           | PreviewCard.jsx                                                               | Always noindex                                                                                                                               |
| /payment/checkout                | NO         | SeoHelmet robots="noindex,nofollow"                                   | CheckoutPage.jsx                                                              | Always noindex                                                                                                                               |
| /payment/iframe-return           | NO         | SeoHelmet robots="noindex,nofollow"                                   | IframeReturnPage.jsx                                                          | Always noindex                                                                                                                               |

---

## 6. OG/Social Preview Route Matrix

| Path                                       | Edge intercept?                        | Backend route                                  | Bot UA required                                                                                                                                   |
| ------------------------------------------ | -------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| /blog/:slug                                | YES вЂ” SOCIAL branch (og-preview.js)  | /og/blog/:slug                                 | facebookexternalhit, WhatsApp, Twitterbot, LinkedInBot, TelegramBot, Slackbot, Slack-ImgProxy, Discordbot, Pinterest, vkShare                     |
| /guides/:slug                              | YES вЂ” SOCIAL branch (og-preview.js)  | /og/guides/:slug                               | same social allowlist                                                                                                                             |
| /card/:slug                                | YES вЂ” SOCIAL branch (og-preview.js)  | /og/card/:slug                                 | same social allowlist                                                                                                                             |
| /card/:slug                                | YES вЂ” CRAWLER branch (og-preview.js) | /og/card/:slug (head enrichment) + card-ssr SSR | Googlebot, Googlebot-Image, bingbot вЂ” full SSR HTML + data island + Edge JSON-LD (SSR_REAL_ROUTE_PRODUCTION_ROLLOUT CLOSED 2026-07-05)           |
| /c/:orgSlug/:slug                          | YES вЂ” SOCIAL branch (og-preview.js)  | /og/c/:orgSlug/:slug                           | same social allowlist                                                                                                                             |
| /c/:orgSlug/:slug                          | YES вЂ” CRAWLER branch (og-preview.js) | /og/c/:orgSlug/:slug (head enrichment) + card-ssr SSR | Googlebot, Googlebot-Image, bingbot вЂ” full SSR HTML + data island + Edge JSON-LD (SSR_REAL_ROUTE_PRODUCTION_ROLLOUT CLOSED 2026-07-05)       |
| /pricing, /blog, /guides, /cards, /contact | YES вЂ” CRAWLER branch (og-preview.js) | marketingMeta.config.js (no backend /og fetch) | Googlebot, Googlebot-Image, bingbot вЂ” SPA shell with route-specific head injected. See Section 18.                                              |
| / and marketing pages (social/browser)     | NO (falls through)                     | вЂ”                                            | Social bots and browsers use index.html static fallback. Social bot OG for marketing routes deferred under SEO_MARKETING_PAGES_SOCIAL_PREVIEW_P1. |

**Googlebot and Bingbot routing note (updated 2026-05-09):**
Googlebot/Googlebot-Image/bingbot are intercepted by the Edge Function in two cases: (1) /card/:slug and /c/:orgSlug/:slug вЂ” CRAWLER branch using backend /og as metadata source (Section 16); (2) top-level marketing routes /pricing, /blog, /guides, /cards, /contact вЂ” CRAWLER branch using marketingMeta.config.js as metadata source, no backend /og fetch (Section 18). For all other paths (blog/:slug, guides/:slug, /, etc.) they receive the normal SPA shell and WRS renders head tags from react-helmet-async. The card/org-card CRAWLER branch uses backend /og as a metadata source only вЂ” backend /og HTML is never served directly to Googlebot.

---

## 7. Blog/Guides JSON-LD Inventory

### BlogPost.jsx вЂ” emits two scripts in successful branch

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
        { "position": 1, "name": "Ч‘Ч™ЧЄ", "item": "https://cardigo.co.il" },
        {
            "position": 2,
            "name": "Ч‘ЧњЧ•Ч’",
            "item": "https://cardigo.co.il/blog"
        },
        { "position": 3, "name": "<post.title>" }
    ]
}
```

### GuidePost.jsx вЂ” emits same structure

- Script 1: `@type: "Article"` (not BlogPosting) вЂ” same fields
- Script 2: BreadcrumbList вЂ” `/guides` instead of `/blog`

---

## 8. Article Meta Inventory

### Path A вЂ” SeoHelmet.jsx props (Googlebot / browsers)

| Meta tag               | Prop                 | Source in BlogPost.jsx / GuidePost.jsx |
| ---------------------- | -------------------- | -------------------------------------- |
| article:published_time | articlePublishedTime | post.publishedAt                       |
| article:modified_time  | articleModifiedTime  | post.updatedAt                         |
| article:author         | articleAuthor        | post.authorName                        |

Only emitted in the successful (published) branch. notFound/loading/error branches do not pass article meta props.

### Path B вЂ” Backend og.routes.js (social bots)

Both `/og/blog/:slug` and `/og/guides/:slug` handlers emit:

- `article:published_time` from `post.publishedAt`
- `article:modified_time` from `post.updatedAt`
- `article:author` from `post.authorName || DEFAULT_BLOG_AUTHOR_NAME`

### og:locale and og:site_name — Backend OG routes (all four)

All four backend OG handlers now emit these as hardcoded constants (SEO_BACKEND_OG_METADATA_PARITY_P2, production verified 2026-05-23):

- `og:locale` = `"he_IL"` — hardcoded in each template
- `og:site_name` = `"Cardigo"` — hardcoded in each template

Routes: `/og/blog/:slug`, `/og/guides/:slug`, `/og/card/:slug`, `/og/c/:orgSlug/:slug`.

Production smoke confirmed og:locale count = 1 on all four routes. No duplicates.

---

## 9. Image Alt Meta Inventory

### Path A вЂ” SeoHelmet.jsx

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

### Path B вЂ” og.routes.js

```js
const imageAlt = image
    ? collapseWs(post.heroImage?.alt) || collapseWs(post.title) || ""
    : "";
```

Emitted as:

- `og:image:alt` (conditional on image)
- `twitter:image:alt` (conditional on image)

`collapseWs` normalizes internal whitespace to single spaces and trims. `escapeHtml` applied to output.

### Path B (card/org-card) — og.routes.js buildCardOgMetadata

`/og/card/:slug` and `/og/c/:orgSlug/:slug` share the `buildCardOgMetadata` helper. The `imageMetaHtml` block now includes:

- `og:image:alt` — always emitted (value: `businessName + " – Cardigo"` or generic fallback)
- `twitter:image:alt` — emitted via `imageMetaHtml` (CLOSED SEO_BACKEND_OG_METADATA_PARITY_P2, production verified 2026-05-23)

No duplicate tags. Production smoke confirmed twitter:image:alt count = 1 on both card routes.

### SeoHelmet twitter:card conditional invariant (SEO_TWITTER_CARD_GUARD_P2)

`SeoHelmet.jsx` emits `twitter:card` conditionally:

- `twitter:card="summary_large_image"` when `image` prop is truthy
- `twitter:card="summary"` when `image` prop is absent or falsy

`twitter:image` and `twitter:image:alt` are gated on `image` (and `imageAlt`). No empty `twitter:image` is ever emitted.

**Legal pages expected runtime behavior (production verified 2026-05-23):** `/privacy`, `/terms`, `/accessibility-statement`, `/payment-policy` pass no `image` prop to `SeoHelmet`. After hydration they emit `twitter:card="summary"`, no `twitter:image`, no `twitter:image:alt`. This is accepted current behavior, not a gap. Browser/Google runtime: correct and verified. Raw SPA shell (pre-hydration): shows homepage shell fallback until JS executes — normal SPA pre-hydration state, not a regression in this contour.

### Deferred gaps

- Marketing/listing pages (Home, Cards, Pricing, Contact, Blog listing, Guides listing): `SEO_IMAGE_ALT_META_MARKETING_P1`
- PublicCard.jsx: `SEO_PUBLIC_CARD_IMAGE_ALT_META_P2`
- `/og/card/:slug` and `/og/c/:orgSlug/:slug` `twitter:image:alt`: CLOSED — SEO_BACKEND_OG_METADATA_PARITY_P2 (production verified 2026-05-23)

---

## 10. Soft-404 Behavior

When a blog or guide slug is not found (API 404) or not published:

- `BlogPost.jsx` / `GuidePost.jsx` renders `notFound` branch
- SeoHelmet receives: `robots="noindex, nofollow"`, Hebrew not-found title
- Emits: `<meta name="robots" content="noindex, nofollow" data-rh="true">`
- Does NOT emit article meta (article:published_time etc.)
- Does NOT emit JSON-LD (noJSON-LD in notFound branch)

**Backend Path B:** missing slug в†’ 404 response from backend OG handler (anti-enumeration, no existence leak).

**Loading/error branches:** deliberately do NOT emit noindex. Reason: a transient fetch error during WRS crawl would emit noindex on a valid URL, potentially causing incorrect deindexation.

---

## 11. Operator Production Smoke Commands

```powershell
$UA = "facebookexternalhit/1.1"
$BLOG_SLUG = "post-7a9572f4"
$GUIDE_SLUG = "seo"

# Blog social preview вЂ” expect og:type=article, og:image:alt, article:published_time
curl.exe -s -A $UA "https://cardigo.co.il/blog/$BLOG_SLUG" `
  | findstr /i "og:type" "og:image:alt" "article:published_time" "twitter:image:alt"

# Guide social preview вЂ” same expectations
curl.exe -s -A $UA "https://cardigo.co.il/guides/$GUIDE_SLUG" `
  | findstr /i "og:type" "og:image:alt" "article:published_time" "twitter:image:alt"

# Missing blog slug вЂ” must return HTTP 404
curl.exe -s -o NUL -w "%{http_code}" -A $UA "https://cardigo.co.il/blog/nonexistent-zzz999"

# Card regression вЂ” must still return card-specific OG
curl.exe -s -A $UA "https://cardigo.co.il/card/cardigo" `
  | findstr /i "og:title" "og:image:alt" "og:url"

# robots.txt вЂ” must include BOTH Disallow rules
curl.exe -s "https://cardigo.co.il/robots.txt"

# Sitemap вЂ” must include blog, guides, card entries with lastmod
curl.exe -s "https://cardigo.co.il/sitemap.xml" `
  | findstr /i "blog" "guides" "lastmod" "cardigo"
```

**Rendered head verification (browser devtools):**

1. Open https://cardigo.co.il/pricing в†’ inspect `<head>` в†’ confirm:
    - `meta property="og:locale" content="he_IL"`
    - `meta property="og:site_name" content="Cardigo"`

2. Open https://cardigo.co.il/blog/<slug-with-hero> в†’ inspect `<head>` в†’ confirm:
    - `meta property="og:image:alt"` present (non-empty)
    - `meta property="article:published_time"` present

**Rich Results Test:**

- https://search.google.com/test/rich-results?url=https%3A%2F%2Fcardigo.co.il%2Fblog%2Fpost-7a9572f4
- Expected: Article + Breadcrumbs detected, 0 errors.

---

## 12. GSC Checklist

**Updated: 2026-05-07 вЂ” SEO_GSC_DISCOVERED_NOT_INDEXED_TRIAGE_P1 Phase 1 accepted**

As of 2026-05-07, GSC shows the following six URLs as "Discovered вЂ” currently not indexed" with last crawl date absent:

- /privacy
- /terms
- /accessibility-statement
- /payment-policy
- /card/cardigo
- /c/digitalyty/digital-card

A read-only triage audit found no known code/config blocker from read-only audit (HTTP 200 for all six, no X-Robots-Tag noindex, all six in sitemap, robots.txt allows all six, no global noindex in index.html). "Discovered вЂ” currently not indexed" with absent last-crawl is consistent with normal CSR/SPA crawl queue behavior.

Formal GSC ownership verification and sitemap submission status still require operator confirmation if not already completed. Manual URL Inspection, Test Live URL, and Request Indexing are pending under SEO_GSC_MANUAL_URL_INSPECTION_AND_REQUEST_INDEXING_P0_OPS.

Note: /c/digitalyty/digital-card requires a product/operator decision before requesting indexing вЂ” see SEO_ORG_CARD_DIGITALYTY_BOUNDARY_DECISION_P1.

When ready, steps:

1. Add GSC HTML verification file to `frontend/public/` OR use DNS TXT record verification (preferred, avoids deploying a file).
2. Verify property: https://cardigo.co.il
3. Submit sitemap: https://cardigo.co.il/sitemap.xml
4. For each of the six triage URLs: GSC в†’ URL Inspection в†’ Test Live URL в†’ Request Indexing.
5. Check Index Coverage report after 48вЂ“72 hours for crawl errors.
6. Check Rich Results in GSC for Blog and Guides structured data.
7. Monitor for any WRS rendering errors under "Enhancements" tab.

---

## 13. Deferred SEO Register

| Item                                                                   | Contour                                                   | Priority                                | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GSC ownership + sitemap submission                                     | POST_LAUNCH_SEARCH_CONSOLE_AND_SITEMAP_SUBMISSION_P1      | P1                                      | Cannot monitor indexing without this                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Marketing page imageAlt                                                | SEO_IMAGE_ALT_META_MARKETING_P1                           | P1                                      | 6 files: Home, Cards, Pricing, Contact, Blog, Guides listing                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| PublicCard.jsx imageAlt                                                | SEO_PUBLIC_CARD_IMAGE_ALT_META_P2                         | P2                                      | Scoped audit required вЂ” card fields are user-controlled                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| twitter:image:alt for /og/card/\*                                      | SEO_BACKEND_OG_METADATA_PARITY_P2                         | CLOSED / PRODUCTION VERIFIED 2026-05-23 | Added via `buildCardOgMetadata` `imageMetaHtml`. Flows to both `/og/card/:slug` and `/og/c/:orgSlug/:slug`. Production smoke confirmed twitter:image:alt count = 1 on both routes, no duplicates.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Backend OG og:locale parity                                            | SEO_BACKEND_OG_METADATA_PARITY_P2                         | CLOSED / PRODUCTION VERIFIED 2026-05-23 | All four backend OG handlers now emit `og:locale="he_IL"` as a hardcoded constant: `/og/blog/:slug`, `/og/guides/:slug`, `/og/card/:slug`, `/og/c/:orgSlug/:slug`. Production smoke confirmed og:locale count = 1 per route, no duplicates.                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| SeoHelmet twitter:card conditional guard                               | SEO_TWITTER_CARD_GUARD_P2                                 | CLOSED / PRODUCTION VERIFIED 2026-05-23 | `SeoHelmet.jsx` emits `twitter:card="summary_large_image"` when `image` prop truthy; `"summary"` when absent. Legal pages (/privacy, /terms, /accessibility-statement, /payment-policy) verified at runtime via Playwright: all four emit `twitter:card="summary"`, no twitter:image, no twitter:image:alt. Accepted behavior.                                                                                                                                                                                                                                                                                                                                                                                      |
| Homepage title singular alignment                                      | SEO_HOMEPAGE_TITLE_SINGULAR_INTENT                        | CLOSED / PRODUCTION VERIFIED 2026-05-23 | `frontend/index.html` and `Home.jsx` SeoHelmet aligned on singular form: title = "כרטיס ביקור דיגיטלי לעסק                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Cardigo", og:image:alt / twitter:image:alt = "Cardigo – כרטיס ביקור דיגיטלי לעסק". Static shell and runtime post-hydration consistent. `rel="canonical"` absent from `index.html` by design (SSoT: `check:seo-static-shell` gate). |
| og:image:secure_url, width, height, type                               | вЂ”                                                       | P3                                      | Blog/guides OG HTML, backend path                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Private/admin route Disallow                                           | вЂ”                                                       | P2                                      | Deferred until GSC confirms noindex processed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| og-drift CI check                                                      | вЂ”                                                       | P3                                      | Alignment check: index.html vs Home.jsx OG                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| sitemap index / image sitemap                                          | вЂ”                                                       | Scale                                   | Post-GSC-data decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| True HTTP 404 for SPA not-found                                        | вЂ”                                                       | P2                                      | Infrastructure/hosting contour                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| SSR/prerender indexability (INTERMEDIATE)                              | вЂ“                                                       | INTERMEDIATE CLOSED 2026-06-01          | D1 CHAIN closed 2026-06-01; Full React SSR rollout CLOSED / PASS / PRODUCTION VERIFIED 2026-07-05. /card/* and /c/* now serve full SSR HTML with data island. See Section 23 and Cardigo_Enterprise_Handoff_2026-07-05_SSR_Real_Route_Production_Rollout_Closed.md                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| fb:app_id / Meta app governance                                        | вЂ”                                                       | P3                                      | Product decision required                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Free-tier card noindex policy review                                   | вЂ”                                                       | P3                                      | Product decision: OG preview vs noindex                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Static shell canonical policy gate                                     | SEO_STATIC_SHELL_POLICY_GATE_P1                           | CLOSED                                  | CI/local gate preventing static canonical reintroduction and preserving homepage og:url fallback. Command: `npm.cmd run check:seo-static-shell`. Invariants protected: (1) no static `rel="canonical"` in `frontend/index.html`; (2) exactly one static `og:url`; (3) `og:url` value is `https://cardigo.co.il/`. Production result: initial HTML has no canonical; runtime canonical supplied by SeoHelmet; homepage og:url fallback remains. No source code, package.json, or handoff changes in this contour.                                                                                                                                                                                                    |
| Marketing page route-specific OG/social preview                        | SEO_MARKETING_PAGES_SOCIAL_PREVIEW_P1                     | P1 / DEFERRED                           | Googlebot initial metadata gap (canonical + og:url) for /pricing, /blog, /guides, /cards, /contact is CLOSED under MARKETING_STATIC_ROUTES_INITIAL_METADATA_AUDIT_P1 (Section 18). Social bot OG preview remains deferred: /cards, /pricing, /contact, /blog listing, /guides listing now receive route-specific og:url and og:title via buildStaticMarketingOgHtml. Social branch remains canonical-absent by design. The remaining deferred gap is og:image differentiation вЂ” all 5 routes still share the homepage og:image. Do not conflate with the Googlebot contour. Do not mark this item as closed.                                                                                                      |
| Owner JSON-LD 5000-char length limit                                   | SCHEMA_OWNER_JSONLD_LENGTH_LIMIT_P1                       | CLOSED / PASS                           | `card.seo.jsonLd` вЂ” backend Card.model.js + frontend EditCard.jsx + SeoPanel.jsx maxLength={5000}. Empty/null allowed. >5000 chars or invalid JSON rejected. Existing oversized DB values fail on rewrite only.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Owner JSON-LD @type allowlist + nested blocklist                       | SCHEMA_OWNER_JSONLD_TYPE_ALLOWLIST_P1                     | CLOSED / PASS                           | Allowed top-level @type: LocalBusiness, Organization, Person, Service. @graph rejected. Missing @type rejected. Nested Review/AggregateRating/Rating rejected. MAX_NESTING_DEPTH=10 fail-closed. Files: Card.model.js, EditCard.jsx.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Blog/Guides paginated archive FAQPage suppress                         | SCHEMA_BLOG_GUIDES_PAGINATION_FAQ_SCHEMA_P1               | CLOSED / PASS                           | Blog.jsx and Guides.jsx emit FAQPage JSON-LD only on effectivePage <= 1. /blog/page/N and /guides/page/N (N>1) receive jsonLdItems=[]. Fixes schema/canonical mismatch on paginated archive pages.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| LocalBusiness JSON-LD address.streetAddress + non-premium sanitization | PUBLIC_CARD_LOCATION_POSTALADDRESS_JSONLD_P3              | CLOSED / PRODUCTION VERIFIED 2026-06-08 | LocalBusiness JSON-LD generator ("צור מידע מובנה") now emits address.streetAddress from business.address. Browser path (PublicCard.jsx) and OG path (cardPublicProjection.util.js) sanitize streetAddress/geo/latitude/longitude for non-premium (canUseServices !== true) at render time. geo/latitude/longitude are intentionally absent from generation. Production smoke: /c/digitalyty/kartis-bikur-digitali-lemetavech-nadlan — streetAddress confirmed present for premium, absent for non-premium (static proof). Files: SeoPanel.jsx, PublicCard.jsx, cardPublicProjection.util.js. See docs/handoffs/current/Cardigo_Enterprise_Handoff_2026-06-08_PublicCard_Location_Maps_Waze_PostalAddress_Closed.md. |
| Public card Googlebot metadata injection                               | PUBLIC_CARD_OG_INITIAL_METADATA_EDGE_INJECTION_P2A        | CLOSED / PRODUCTION VERIFIED 2026-05-09 | Googlebot/bingbot hitting /card/:slug and /c/:orgSlug/:slug now receive SPA shell with route-specific head tags injected from backend /og metadata. No meta http-equiv=refresh. Cache-Control: no-store, Vary: User-Agent. Production smoke script final verdict: FINAL: PASS вЂ” production Edge smoke passed. Smoke groups G1вЂ“G10 all passed. See Section 16.                                                                                                                                                                                                                                                                                                                                                   |
| Hydrated social metadata deduplication                                 | STATIC_SOCIAL_META_HELMET_DEDUP_P2                        | CLOSED / PRODUCTION VERIFIED 2026-05-09 | Static social/meta fallback tags in frontend/index.html were missing data-rh="true". react-helmet-async only removes tags it manages (data-rh="true"). Result: duplicate social tags persisted after hydration; querySelector returned the first (stale homepage) value on all non-home routes. Fix: added data-rh="true" to all 18 static fallback tags. Added imageAlt prop to Home.jsx SeoHelmet callsite. Production DOM smoke: all verified routes emit exactly one set of social tags post-hydration. See Section 17.                                                                                                                                                                                         |
| Marketing routes Googlebot initial metadata                            | MARKETING_STATIC_ROUTES_INITIAL_METADATA_AUDIT_P1         | CLOSED / PRODUCTION VERIFIED 2026-05-09 | Closes the raw initial metadata gap for top-level marketing routes (/pricing, /blog, /guides, /cards, /contact) when accessed by Googlebot/bingbot. Root cause: isCrawler branch fell through to context.next() for all non-card paths, returning raw SPA shell with no route-specific canonical or og:url. Fix: og-preview.js buildStaticMarketingOgHtml extended with optional includeCanonical param; new crawler injection block added for marketing route keys from marketingMeta.config.js. File changed: frontend/netlify/edge-functions/og-preview.js only. G1вЂ“G6 all PASS. See Section 18.                                                                                                               |
| GSC six-URL triage                                                     | SEO_GSC_DISCOVERED_NOT_INDEXED_TRIAGE_P1                  | Phase 1 accepted                        | No known code/config blocker found from read-only audit. Six URLs: /privacy, /terms, /accessibility-statement, /payment-policy, /card/cardigo, /c/digitalyty/digital-card. All HTTP 200, no noindex, all in sitemap. Manual GSC operator steps pending.                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| GSC manual URL Inspection + Request Indexing                           | SEO_GSC_MANUAL_URL_INSPECTION_AND_REQUEST_INDEXING_P0_OPS | PENDING OPERATOR ACTION                 | GSC URL Inspection в†’ Test Live URL в†’ Request Indexing for each of the six triage URLs. /c/digitalyty/digital-card requires product decision first. No code change required.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Digitalyty org-card indexability decision                              | SEO_ORG_CARD_DIGITALYTY_BOUNDARY_DECISION_P1              | PENDING PRODUCT DECISION                | Is /c/digitalyty/digital-card intentionally public/demo or internal test? If internal test: set robots=noindex or unpublish. If intentional: leave as-is and proceed with GSC request.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Legal pages canonical hardcoding                                       | SEO_LEGAL_PAGES_METADATA_GAP_P2                           | P3 / DEFERRED MAINTENANCE               | Privacy.jsx, Terms.jsx, Accessibility.jsx, PaymentPolicy.jsx: hardcoded canonical string literals instead of ORIGIN constant. Maintenance tail only. No image/imageAlt on legal pages is **accepted current behavior** — SeoHelmet conditional guards ensure correct `twitter:card="summary"` output. The twitter:card gap portion of this item is CLOSED by SEO_TWITTER_CARD_GUARD_P2.                                                                                                                                                                                                                                                                                                                             |
| Internal linking and sitemap signal                                    | SEO_INTERNAL_LINKING_AND_SITEMAP_SIGNAL_P2                | P2 / DEFERRED                           | Footer/nav link audit for crawl discoverability. Post-GSC-data decision.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Dynamic Googlebot rendering governance                                 | SEO_DYNAMIC_GOOGLEBOT_RENDERING_GOVERNANCE_P2             | P2 / DEFERRED                           | Defer until GSC shows WRS rendering errors. No current evidence of WRS issues.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| GuidePost @type decision                                               | SCHEMA_GUIDEPOST_TYPE_DECISION_P2                         | P2 / DEFERRED                           | GuidePost.jsx emits @type: "Article". Product/SEO decision whether to keep Article or change to HowTo or another type.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Schema builders centralization                                         | SCHEMA_BUILDERS_CENTRALIZATION_P2                         | P2 / DEFERRED                           | JSON-LD builder functions spread across Blog.jsx, Guides.jsx, BlogPost.jsx, GuidePost.jsx. Future centralization refactor.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Schema drift gate                                                      | SCHEMA_DRIFT_GATE_P2                                      | P2 / DEFERRED                           | CI gate to detect schema drift between SeoHelmet output and expected JSON-LD shape. No gate exists yet.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

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

---

## 16. Edge Crawler Behavior for Public Card Routes

**Contour:** PUBLIC_CARD_OG_INITIAL_METADATA_EDGE_INJECTION_P2A
**Status:** CLOSED / PRODUCTION VERIFIED / PASS вЂ” 2026-05-09
**Implemented in:** `frontend/netlify/edge-functions/og-preview.js`

---

### 16.1 UA Class Routing Summary

| UA class                                                                                                                    | Routes intercepted                                  | Response                                                                                                                                                   |
| --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Social bots (facebookexternalhit, WhatsApp, Twitterbot, LinkedInBot, TelegramBot, Slackbot, Discordbot, Pinterest, vkShare) | /card/_, /c/_, /blog/_, /guides/_                   | Full backend /og HTML served directly. meta http-equiv=refresh present. Cache-Control: public, max-age=300.                                                |
| Search crawlers (Googlebot, Googlebot-Image, bingbot)                                                                       | /card/:slug and /c/:orgSlug/:slug only              | SPA shell with route-specific head tags injected from backend /og metadata. No meta refresh. Cache-Control: no-store. Vary: User-Agent.                    |
| Search crawlers (Googlebot, Googlebot-Image, bingbot)                                                                       | /pricing, /blog, /guides, /cards, /contact          | SPA shell with route-specific head injected from marketingMeta.config.js. No backend /og fetch. Cache-Control: no-store. Vary: User-Agent. See Section 18. |
| Search crawlers (Googlebot, Googlebot-Image, bingbot)                                                                       | All other paths (blog/:slug, guides/:slug, /, etc.) | Normal SPA shell via context.next(). No injection.                                                                                                         |
| Browsers and all other UAs                                                                                                  | /card/:slug, /c/:orgSlug/:slug                      | Enriched SPA shell: Edge-injected head + fallback body + JSON-LD. Same shell as Googlebot.                                                                 |
| Browsers and all other UAs                                                                                                  | All other paths                                     | Normal SPA shell via context.next(). No injection.                                                                                                         |

---

### 16.2 CRAWLER Branch вЂ” Technical Specification

**Source of truth for metadata:** backend /og routes (`/og/card/:slug`, `/og/c/:orgSlug/:slug`)

**Injection is whitelist-only.** Only these tags are extracted from backend /og head:

- `<title>`
- `<meta name="description">`
- `<link rel="canonical">`
- `<meta name="robots">` (only if present вЂ” absent for indexable cards, present for noindex cards)
- All `<meta property="og:*">` tags
- All `<meta name="twitter:*">` tags

**Explicitly NOT injected:**

- `<meta http-equiv="refresh">` вЂ” backend /og HTML contains this for browser fallback redirect. It is NOT present in search crawler responses. Google would treat meta refresh as a permanent redirect signal (cloaking risk) if injected. The whitelist extraction ensures it is always excluded.
- Scripts, styles, body content, any other head tags not on the whitelist.

**Anti-duplication:** remove-then-insert pattern. Shell's existing og:_, twitter:_, canonical, and robots tags are removed globally before the extracted block is inserted before `</head>`. Duplicate tags cannot occur.

**context.next() contract:** called exactly once per request in the CRAWLER branch. Shell response is cloned before reading. If injection fails, the original shell is returned (fail-open). context.next() is never called a second time.

**Response headers for CRAWLER branch:**

- `Cache-Control: no-store` вЂ” search crawlers must not receive stale/cached injected responses
- `Vary: User-Agent` вЂ” CDN must not serve crawler-injected response to browsers or vice versa

**Scope limit:** Injection applies only to /card/:slug (exactly 2 path segments after split/filter) and /c/:orgSlug/:slug (exactly 3 path segments). All other paths fall through via context.next() with no injection.

---

### 16.3 Production Smoke Record (2026-05-09)

Production smoke script final verdict: FINAL: PASS вЂ” production Edge smoke passed. All smoke groups G1вЂ“G10 passed. Smoke run performed against https://cardigo.co.il with real Googlebot UA, facebookexternalhit UA, and browser UA.

G1 вЂ” Googlebot /card/cardigo:
G1.1 status 200: PASS
G1.2 div#root present (SPA shell body): PASS
G1.3 canonical = https://cardigo.co.il/card/cardigo: PASS
G1.4 og:url = https://cardigo.co.il/card/cardigo: PASS
G1.5 robots noindex present (free-tier card): PASS
G1.6 no meta http-equiv=refresh: PASS
G1.7 no homepage og:url: PASS

G2 вЂ” Googlebot /card/eyagrrmqui6q:
G2.1 status 200: PASS
G2.2 canonical = https://cardigo.co.il/card/eyagrrmqui6q: PASS
G2.3 robots noindex present: PASS
G2.4 no meta http-equiv=refresh: PASS

G3 вЂ” Googlebot /card/nitay-tours (paid/indexable):
G3.1 status 200: PASS
G3.2 div#root present: PASS
G3.3 canonical = https://cardigo.co.il/card/nitay-tours: PASS
G3.4 og:url = https://cardigo.co.il/card/nitay-tours: PASS
G3.5 robots meta absent (indexable card): PASS
G3.6 no meta http-equiv=refresh: PASS
G3.7 no homepage og:url: PASS

G4 вЂ” Googlebot /c/digitalyty/digital-card (org card):
G4.1 status 200: PASS
G4.2 div#root present: PASS
G4.3 canonical = https://cardigo.co.il/c/digitalyty/digital-card: PASS
G4.4 og:url = https://cardigo.co.il/c/digitalyty/digital-card: PASS
G4.5 robots meta absent (indexable org card): PASS
G4.6 no meta http-equiv=refresh: PASS

G5 вЂ” Googlebot response headers (/card/nitay-tours):
G5.1 Cache-Control: no-store: PASS
G5.2 Vary: User-Agent: PASS

G6 вЂ” facebookexternalhit /card/nitay-tours (social branch unchanged):
G6.1 status 200: PASS
G6.2 og:url = https://cardigo.co.il/card/nitay-tours: PASS
G6.3 meta http-equiv=refresh present (full /og HTML): PASS
G6.4 no div#root (full /og HTML, not SPA shell): PASS

G7 вЂ” Browser UA /card/nitay-tours (normal SPA):
G7.1 status 200: PASS
G7.2 div#root present: PASS
G7.3 no robots noindex injected: PASS

G8 вЂ” Googlebot nonexistent slug:
G8.1 status 404: PASS

G9 вЂ” Googlebot /pricing (out-of-scope, no injection):
G9.1 status 200: PASS
G9.2 div#root present: PASS
G9.3 no card metadata injected: PASS

G10 вЂ” Duplicate tag guard (Googlebot /card/nitay-tours):
G10.1 title count = 1: PASS
G10.2 canonical count = 1: PASS
G10.3 robots count = 0 (indexable card): PASS
G10.4 og:url count = 1: PASS
G10.5 og:title count = 1: PASS
G10.6 og:site_name count = 1: PASS
G10.7 twitter:title count = 1: PASS

---

### 16.4 Anti-Regression Notes

The following behaviors are locked. Any proposed change that violates these must go through a new bounded contour with explicit architect approval.

1. Do NOT add Googlebot to the social /og direct-response branch. Googlebot must never receive backend /og HTML directly (contains meta http-equiv=refresh, cloaking risk).

2. Do NOT serve backend /og HTML directly to Googlebot. The CRAWLER branch uses backend /og as a metadata source only; it always serves the SPA shell as the response body.

3. Do NOT inject meta http-equiv=refresh into search crawler responses. The whitelist extraction enforces this at the code level. Never add http-equiv to the extraction whitelist.

4. Do NOT change the SPA body for crawlers. Only head tags are injected. The SPA shell body (div#root, script bundles, etc.) is byte-identical for all UA classes.

5. Do NOT cache search crawler injected responses without re-auditing cache-key behavior. Cache-Control: no-store and Vary: User-Agent are mandatory. Changing these requires a bounded contour and CDN cache-key audit.

6. Preserve no-store + Vary: User-Agent on all CRAWLER branch responses, including 404 and 410 passthrough responses.

7. Backend /og security gates remain the SSoT for metadata. The Edge Function extracts from backend /og output; it does not generate or override metadata logic.

8. Do not extend the CRAWLER branch to blog/:slug or guides/:slug without a separate contour and explicit approval. Blog/guides Googlebot behavior via WRS + SeoHelmet is separate.

---

### 16.5 Future Tails (Separate Contours)

The following items are explicitly out of scope for this contour and require their own bounded audits:

- Blog/guides Googlebot metadata behavior: /blog/:slug and /guides/:slug for Googlebot continue via WRS + SeoHelmet. If GSC shows rendering errors for these routes, open a separate contour.
- Search Console recrawl and request-indexing: Timing of Google snippet updates is controlled by Google's crawl scheduler and is not guaranteed immediately after deploy. Request Indexing via GSC URL Inspection is an operator action under SEO_GSC_MANUAL_URL_INSPECTION_AND_REQUEST_INDEXING_P0_OPS.
- PublicCard browser org canonical issue: If /c/:orgSlug/:slug browser behavior has a canonical bug (separate from Googlebot metadata injection), open a separate contour.
- twitter:image:alt for /og/card/_ and /og/c/_: CLOSED — SEO_BACKEND_OG_METADATA_PARITY_P2. Added via `buildCardOgMetadata` `imageMetaHtml`. Production verified 2026-05-23.

---

## 17. Hydrated Social Metadata Deduplication

**Contour:** STATIC_SOCIAL_META_HELMET_DEDUP_P2
**Status:** CLOSED / PRODUCTION VERIFIED / PASS вЂ” 2026-05-09
**Files changed:** `frontend/index.html`, `frontend/src/pages/Home.jsx`

---

### 17.1 Root Cause

`frontend/index.html` is the shared SPA shell served for every route via the Netlify catchall `/* /index.html 200`. It contains 18 static social/meta fallback tags (description, og:locale, og:type, og:site_name, og:title, og:description, og:url, og:image, og:image:secure_url, og:image:width, og:image:height, og:image:type, og:image:alt, twitter:card, twitter:title, twitter:description, twitter:image, twitter:image:alt) intended as homepage brand identity fallback before hydration.

Before this fix, none of these static tags had `data-rh="true"`. react-helmet-async only removes and replaces tags it considers managed вЂ” tags marked with `data-rh="true"`. Tags without this attribute are unmanaged and are never removed by Helmet.

On each route hydration, `SeoHelmet` (via react-helmet-async) appended new route-specific `data-rh="true"` tags without removing the pre-existing unmanaged static tags. Both sets coexisted in the DOM simultaneously. `document.querySelector` returns the first match вЂ” the stale, unmanaged homepage value вЂ” causing all social meta reads on non-home routes to return homepage-brand values instead of route-specific ones.

Confirmed by manual DOM inspection on `/card/nitay-tours` after hydration:

- `meta[name="description"]` count = 2, first entry dataRh=null (homepage), second dataRh="true" (card-specific)
- `meta[property="og:url"]` count = 2, first = `https://cardigo.co.il/` (homepage), second = `https://cardigo.co.il/card/nitay-tours` (correct)
- Same pattern for og:title, og:description, og:image, og:site_name, twitter:title, twitter:description, twitter:image

---

### 17.2 Fix Applied

**frontend/index.html:** `data-rh="true"` added as the first attribute (after `<meta`) to all 18 static social/meta fallback tags. Content values, tag order, tag structure, multiline layout, title element, charset, viewport, theme-color, GTM scripts, icons, manifest, and preconnect links are all unchanged. The addition of `data-rh="true"` to static tags causes react-helmet-async to treat them as managed: when a Helmet instance renders route-specific tags, the static ones are removed first and the new route-specific ones are inserted. The DOM always has exactly one set of social tags post-hydration.

**frontend/src/pages/Home.jsx:** `imageAlt` prop added to the `SeoHelmet` callsite. The static `og:image:alt` and `twitter:image:alt` tags in `index.html` are now Helmet-managed (data-rh="true") and will be removed during hydration. `SeoHelmet` only re-renders `og:image:alt` / `twitter:image:alt` when both `image` and `imageAlt` props are truthy. Without the `imageAlt` prop, the homepage hydration would silently drop both alt tags after removing the static ones. The imageAlt value (`Cardigo вЂ“ Ч›ЧЁЧЧ™ЧЎ Ч‘Ч™Ч§Ч•ЧЁ Ч“Ч™Ч’Ч™ЧЧњЧ™ ЧњЧўЧЎЧ§Ч™Чќ`, U+2013 EN DASH) is identical to the static `og:image:alt` content in `index.html`.

**No other files were changed.** `SeoHelmet.jsx`, `og-preview.js`, and `check-seo-static-shell.mjs` are unmodified. The Edge Function behavior and Googlebot CRAWLER branch are unaffected.

---

### 17.3 Runtime Behavior After Fix

**Pre-hydration (browser initial load, before JS executes):**
The static fallback tags remain in the DOM with `data-rh="true"`. Homepage OG values are visible as the initial shell state. This is correct and intentional вЂ” social bots that receive the SPA shell without JS execution see homepage brand identity. The static `og:url` value (`https://cardigo.co.il/`) remains correct for this pre-hydration state on all routes.

**Post-hydration (after SeoHelmet renders):**
react-helmet-async removes all `data-rh="true"` tags, then inserts route-specific ones. Result: exactly one set of social tags in the DOM with route-correct values.

**Homepage hydration (`/`):**
Home.jsx passes `imageAlt="Cardigo вЂ“ Ч›ЧЁЧЧ™ЧЎ Ч‘Ч™Ч§Ч•ЧЁ Ч“Ч™Ч’Ч™ЧЧњЧ™ ЧњЧўЧЎЧ§Ч™Чќ"` to SeoHelmet. After hydration: one homepage-specific set including `og:image:alt` and `twitter:image:alt`.

**Card and org-card routes (`/card/:slug`, `/c/:orgSlug/:slug`):**
SeoHelmet receives card-specific url, image, imageAlt (if set), and description from PublicCard.jsx. After hydration: one card-specific set.

**Marketing routes (`/pricing`, `/contact`, `/cards`, etc.):**
SeoHelmet receives route-specific canonical and og:url. After hydration: one route-specific set. Note: og:image structured metadata (og:image:secure_url, og:image:width, og:image:height, og:image:type) is NOT rendered by SeoHelmet on any route. These four tags are removed from the DOM post-hydration. Absence of these structured image tags is accepted over retaining the stale homepage structured metadata.

**Edge Function behavior (Googlebot CRAWLER branch, social bots):**
Unaffected. The Edge Function operates on raw HTML text (before browser rendering). The CRAWLER branch removes all og:_ and twitter:_ tags by regex, then inserts route-specific ones sourced from backend /og. The `data-rh` attribute in source HTML is irrelevant to this text-processing pipeline. See Section 16 for CRAWLER branch specification.

---

### 17.4 Production Smoke Record (2026-05-09)

**EDGE smoke: PASS** вЂ” Full edge smoke record is in Section 16.3. Edge behavior confirmed unaffected by this change.

**DOM hydrated smoke: PASS**

Verification method: Playwright browser automation against production, loading each route and waiting for React hydration to complete before reading head tags.

Note: Initial Playwright invocation failed because Playwright was not installed in the isolated smoke directory. After installing Playwright in the smoke directory, DOM smoke passed. This was a verification infrastructure issue only вЂ” not a Cardigo bug.

Route baselines verified (post-hydration DOM, all tag counts = 1):

/card/nitay-tours:

- canonical: 1 tag, https://cardigo.co.il/card/nitay-tours
- og:url: 1 tag, https://cardigo.co.il/card/nitay-tours
- title: 1 tag, card-specific title
- og:image: 1 tag, card-specific Supabase image URL
- description: 1 tag, card-specific
- og:title: 1 tag, card-specific
- twitter:title: 1 tag, card-specific
- No duplicate social tags

/c/digitalyty/digital-card:

- canonical: 1 tag, https://cardigo.co.il/c/digitalyty/digital-card
- og:url: 1 tag, https://cardigo.co.il/c/digitalyty/digital-card
- title: 1 tag, org-card-specific title
- og:image: 1 tag, card-specific Supabase image URL
- No duplicate social tags

/:

- canonical: 1 tag, https://cardigo.co.il/
- og:url: 1 tag, https://cardigo.co.il/
- og:image: 1 tag, homepage OG image (current v=20260519; previous smoke observed v=20260518 before DEFAULT_OG_IMAGE_CACHE_BUST)
- og:image:alt: 1 tag, "Cardigo вЂ“ Ч›ЧЁЧЧ™ЧЎ Ч‘Ч™Ч§Ч•ЧЁ Ч“Ч™Ч’Ч™ЧЧњЧ™ ЧњЧўЧЎЧ§Ч™Чќ"
- twitter:image:alt: 1 tag, same value
- No duplicate social tags

/pricing:

- canonical: 1 tag, https://cardigo.co.il/pricing
- og:url: 1 tag, https://cardigo.co.il/pricing
- og:image: 1 tag, shared homepage OG image (accepted for this marketing route)
- No duplicate social tags

---

### 17.5 Anti-Regression Notes

The following behaviors are locked. Any proposed change that violates these must go through a new bounded contour with explicit approval.

1. Do NOT remove the static social/meta fallback block from `frontend/index.html`. It serves as the pre-hydration homepage brand identity shell for social bots that receive the SPA shell directly and for the browser initial load state. Remove only after a full crawler/social-bot fallback re-audit.

2. Do NOT remove `data-rh="true"` from any of the 18 static social/meta fallback tags in `frontend/index.html`. Removing `data-rh="true"` reverts to the pre-fix state: static tags become unmanaged by Helmet and will persist as duplicates alongside route-specific tags post-hydration.

3. Do NOT add new social/meta tags to `frontend/index.html` without also adding `data-rh="true"`. Any static social/meta tag without `data-rh="true"` will become a permanent duplicate in the hydrated DOM on all non-home routes.

4. Do NOT remove the `imageAlt` prop from the `SeoHelmet` callsite in `frontend/src/pages/Home.jsx`. Without it, homepage hydration silently drops `og:image:alt` and `twitter:image:alt` (SeoHelmet guards: both `image` and `imageAlt` must be truthy for alt tags to emit).

5. Do NOT change `SeoHelmet.jsx`, `PublicCard.jsx`, or `og-preview.js` for issues already solved by this contour without opening a new audit. The hydration dedup fix and Edge crawler fix are closed separately; they are not coupled.

6. Keep browser initial state, hydrated DOM state, Googlebot Edge CRAWLER branch state, and social bot SOCIAL branch state as separate verification surfaces. A regression on one surface does not automatically indicate a regression on the others.

7. The CI gate `npm.cmd run check:seo-static-shell` protects two of the key invariants (no static canonical; exactly one homepage og:url). Run it after any change to `frontend/index.html`.

---

### 17.6 Future Tails (Separate Contours)

- Search Console recrawl and request-indexing: Timing of Google snippet updates is controlled by Google's crawl scheduler. It is not guaranteed immediately after this deploy. Request Indexing via GSC URL Inspection is an operator action under SEO_GSC_MANUAL_URL_INSPECTION_AND_REQUEST_INDEXING_P0_OPS.

- Blog/guides Googlebot initial metadata behavior: /blog/:slug and /guides/:slug continue to use WRS + SeoHelmet. If GSC shows rendering errors for these routes, open a separate contour. This contour does not cover blog/guides.

- og:image structured metadata (og:image:secure_url, og:image:width, og:image:height, og:image:type) for SPA routes: SeoHelmet currently does not render these four tags. If structured image metadata enhancement is desired for SPA routes, open a separate bounded SeoHelmet enhancement contour. Do not mix into the dedup closure.

- Marketing page route-specific OG/social preview: Routes /cards, /pricing, /contact, /blog listing, /guides listing still use the shared homepage og:image for social bots. This is a separate gap tracked under SEO_MARKETING_PAGES_SOCIAL_PREVIEW_P1.

---

## 18. Marketing Routes Initial Metadata вЂ” Googlebot Crawler Injection

**Contour:** MARKETING_STATIC_ROUTES_INITIAL_METADATA_AUDIT_P1
**Status:** CLOSED / PRODUCTION VERIFIED / PASS вЂ” 2026-05-09
**Files changed:** `frontend/netlify/edge-functions/og-preview.js` only

This contour closes the raw initial metadata gap for the five top-level marketing routes when accessed by Googlebot/bingbot. It does NOT claim to fix all SEO or indexing issues globally. It closes the raw initial metadata gap only for the selected top-level marketing routes (/pricing, /blog, /guides, /cards, /contact) for search crawler UAs.

---

### 18.1 Root Cause

Googlebot/Googlebot-Image/bingbot matched the Edge Function config (`config.path` includes `/pricing`, `/blog`, `/guides`, `/cards`, `/contact`; `config.header` UA matches Googlebot and bingbot). However, the `isCrawler` branch in `og-preview.js` only handled `/card/:slug` and `/c/:orgSlug/:slug` explicitly. All other paths fell through an `else` clause that immediately returned `context.next()`, causing Googlebot to receive the raw SPA shell with:

- No route-specific canonical tag (static shell has none per policy)
- No route-specific og:url (shell fallback = `https://cardigo.co.il/` homepage)
- No route-specific title or description

This is a raw initial-metadata gap only. The hydrated DOM (after WRS executes the SPA JS) emitted correct metadata via SeoHelmet. But the initial HTML received by Googlebot before JS execution was incorrect.

---

### 18.2 Fix Applied

Two edits to `frontend/netlify/edge-functions/og-preview.js`:

**Edit A вЂ” `buildStaticMarketingOgHtml` optional canonical param:**
Function signature updated to accept `includeCanonical = false` optional parameter. When true, emits `<link rel="canonical" href="{escaped_url}">` using the already-computed escaped URL variable (no double-escaping). Social branch callers pass no `includeCanonical` argument в†’ default false в†’ social branch output unchanged.

**Edit B вЂ” Marketing crawler injection block:**
In the `isCrawler` branch `else` clause (before the final `context.next()` fallthrough), a new block was added for top-level single-segment paths that match a marketing route key via `getMarketingMeta(segments[0])`. For matching routes:

1. `buildMarketingUrl(meta.path)` computes the canonical URL from SSoT.
2. `buildStaticMarketingOgHtml({ ..., includeCanonical: true })` generates a source HTML fragment with canonical, og:url, og:title, og:description, og:image, og:image:alt, twitter:\* tags.
3. `context.next()` is called exactly once to fetch the SPA shell.
4. `injectMetadataIntoShell(shellHtml, sourceHtml)` extracts the whitelisted head tags from the source fragment and injects them into the SPA shell (remove-then-insert pattern вЂ” identical to the card CRAWLER branch).
5. Response headers: `Cache-Control: no-store`, `Vary: User-Agent`, `Content-Type: text/html`.
6. On any injection error, the original `shellResponse` (already cloned-before-read) is returned as fail-open.

Non-matching paths (blog/:slug, guides/:slug, /, etc.) continue to the existing `return context.next()` fallthrough.

Metadata SSoT: `frontend/src/seo/marketingMeta.config.js` (pure ESM, imported by og-preview.js).

---

### 18.3 Production Smoke Record (2026-05-09)

All smoke groups run against https://cardigo.co.il. PowerShell EXIT:1 on some runs is a known PowerShell boolean-expression artifact (last expression evaluated to boolean $false); actual HTTP checks passed. Future smoke scripts should aggregate results and exit 0/1 explicitly.

G1 вЂ” Googlebot crawler (5 marketing routes):

G1-pricing: STATUS=200 CC=no-store VARY=Accept-Encoding,User-Agent XROBOT=(empty) CANON_COUNT=1 CANON_TAG=<link rel="canonical" href="https://cardigo.co.il/pricing"> OGURL_COUNT=1 OGURL=https://cardigo.co.il/pricing HOME_OGURL_ABSENT=True NOINDEX=False вЂ” PASS
G1-blog: STATUS=200 CC=no-store CANON_COUNT=1 CANON_TAG=<link rel="canonical" href="https://cardigo.co.il/blog"> OGURL_COUNT=1 OGURL=https://cardigo.co.il/blog HOME_OGURL_ABSENT=True NOINDEX=False вЂ” PASS
G1-guides: STATUS=200 CC=no-store CANON_COUNT=1 CANON_TAG=<link rel="canonical" href="https://cardigo.co.il/guides"> OGURL_COUNT=1 OGURL=https://cardigo.co.il/guides HOME_OGURL_ABSENT=True NOINDEX=False вЂ” PASS
G1-cards: STATUS=200 CC=no-store CANON_COUNT=1 CANON_TAG=<link rel="canonical" href="https://cardigo.co.il/cards"> OGURL_COUNT=1 OGURL=https://cardigo.co.il/cards HOME_OGURL_ABSENT=True NOINDEX=False вЂ” PASS
G1-contact: STATUS=200 CC=no-store VARY=Accept-Encoding,User-Agent XROBOT=(empty) CANON_COUNT=1 CANON_TAG=<link rel="canonical" href="https://cardigo.co.il/contact"> OGURL_COUNT=1 OGURL=https://cardigo.co.il/contact HOME_OGURL_ABSENT=True NOINDEX=False вЂ” PASS

G2 вЂ” Social bot (facebookexternalhit, 5 marketing routes, social branch unchanged):

G2-pricing: STATUS=200 CANON_ABSENT=True OGURL_COUNT=1 OGURL=https://cardigo.co.il/pricing HOME_OGURL_ABSENT=True DIV_ROOT_ABSENT=True NOINDEX=False вЂ” PASS
G2-blog: STATUS=200 CANON_ABSENT=True OGURL_COUNT=1 OGURL=https://cardigo.co.il/blog HOME_OGURL_ABSENT=True DIV_ROOT_ABSENT=True NOINDEX=False вЂ” PASS
G2-guides: STATUS=200 CANON_ABSENT=True OGURL_COUNT=1 OGURL=https://cardigo.co.il/guides HOME_OGURL_ABSENT=True DIV_ROOT_ABSENT=True NOINDEX=False вЂ” PASS
G2-cards: STATUS=200 CANON_ABSENT=True OGURL_COUNT=1 OGURL=https://cardigo.co.il/cards HOME_OGURL_ABSENT=True DIV_ROOT_ABSENT=True NOINDEX=False вЂ” PASS
G2-contact: STATUS=200 CANON_ABSENT=True OGURL_COUNT=1 OGURL=https://cardigo.co.il/contact HOME_OGURL_ABSENT=True DIV_ROOT_ABSENT=True NOINDEX=False вЂ” PASS

Key: CANON_ABSENT=True is correct for social branch вЂ” social bots use the marketing static OG HTML which intentionally does not include a canonical by default (includeCanonical not passed в†’ false). OGURL is route-specific for all 5 routes.

G3 вЂ” Browser pass-through (5 marketing routes, unchanged):

G3-pricing: STATUS=200 CC=public,max-age=0,must-revalidate CANON_ABSENT=True DIV_ROOT=True SCRIPT=True HOME_OGURL=True NOINDEX=False вЂ” PASS
G3-blog: STATUS=200 CC=public,max-age=0,must-revalidate CANON_ABSENT=True DIV_ROOT=True SCRIPT=True HOME_OGURL=True NOINDEX=False вЂ” PASS
G3-guides: STATUS=200 CC=public,max-age=0,must-revalidate CANON_ABSENT=True DIV_ROOT=True SCRIPT=True HOME_OGURL=True NOINDEX=False вЂ” PASS
G3-cards: STATUS=200 CC=public,max-age=0,must-revalidate CANON_ABSENT=True DIV_ROOT=True SCRIPT=True HOME_OGURL=True NOINDEX=False вЂ” PASS
G3-contact: STATUS=200 CC=public,max-age=0,must-revalidate CANON_ABSENT=True DIV_ROOT=True SCRIPT=True HOME_OGURL=True NOINDEX=False вЂ” PASS

Key: Browser receives normal SPA shell (unmodified). CANON_ABSENT=True correct (no canonical in static shell per policy). HOME_OGURL=True confirms static og:url fallback present pre-hydration (correct). DIV_ROOT=True and SCRIPT=True confirm SPA shell body intact.

G4 вЂ” Hydrated DOM (SeoHelmet source analysis + live Playwright smoke):

Static source analysis via Node.js (G4_STATIC_EXIT:0):
G4-static /pricing: SeoHelmet=true canonicalUrl=true noindex=false PASS=true
G4-static /blog: SeoHelmet=true canonicalUrl=true noindex=false PASS=true
G4-static /guides: SeoHelmet=true canonicalUrl=true noindex=false PASS=true
G4-static /cards: SeoHelmet=true canonicalUrl=true noindex=false PASS=true
G4-static /contact: SeoHelmet=true canonicalUrl=true noindex=false PASS=true

Live hydrated DOM smoke: PASS / EXIT:0 (all 5 routes, post-hydration DOM check via pwsh terminal).

All 5 page components (Pricing.jsx, Blog.jsx, Guides.jsx, Cards.jsx, Contact.jsx) are UNMODIFIED in this contour. SeoHelmet.jsx is UNMODIFIED. Hydrated canonical and og:url are emitted by SeoHelmet as before.

G5 вЂ” Card/org-card regression (CRAWLER branch unchanged):

G5-card-nitay-googlebot: STATUS=200 CC=no-store VARY=Accept-Encoding,User-Agent CANON_COUNT=1 CANON_TAG=<link rel="canonical" href="https://cardigo.co.il/card/nitay-tours" /> OGURL=https://cardigo.co.il/card/nitay-tours HOME_OGURL_ABSENT=True NOINDEX=False вЂ” PASS
G5-orgcard-googlebot: STATUS=200 CC=no-store VARY=Accept-Encoding,User-Agent CANON_COUNT=1 CANON_TAG=<link rel="canonical" href="https://cardigo.co.il/c/digitalyty/digital-card" /> OGURL=https://cardigo.co.il/c/digitalyty/digital-card HOME_OGURL_ABSENT=True NOINDEX=False вЂ” PASS
G5-card-nitay-social: STATUS=200 CANON_ABSENT=False OGURL=https://cardigo.co.il/card/nitay-tours DIV_ROOT_ABSENT=True REFRESH_PRESENT=True NOINDEX=False вЂ” PASS
G5-card-nitay-browser: STATUS=200 CC=public,max-age=0,must-revalidate DIV_ROOT=True SCRIPT=True CANON_ABSENT=True MKT_META_ABSENT=True NOINDEX=False вЂ” PASS

G6 вЂ” Auth/private boundary (noindex preserved, no marketing injection):

G6-login: STATUS=200 CANON_ABSENT=True XROBOT=noindex, nofollow NOINDEX_HEADER=True вЂ” PASS
G6-dashboard: STATUS=200 CANON_ABSENT=True XROBOT=noindex, nofollow NOINDEX_HEADER=True вЂ” PASS
G6-admin: STATUS=200 CANON_ABSENT=True XROBOT=noindex, nofollow NOINDEX_HEADER=True вЂ” PASS

---

### 18.4 Anti-Regression Notes

The following behaviors are locked for this contour. Any proposed change requires a new bounded contour with explicit architect approval.

1. Do NOT reintroduce a static `rel="canonical"` into `frontend/index.html`. The canonical for crawler responses is now provided by the Edge Function injection for marketing routes, and by SeoHelmet post-hydration for all routes. A static canonical in index.html would pollute all non-home routes before hydration. See Section 2 Static Shell Policy and the CI gate `npm.cmd run check:seo-static-shell`.

2. Do NOT move marketing metadata source out of `frontend/src/seo/marketingMeta.config.js` without a separate audit. This file is the SSoT imported by both og-preview.js (Edge Function) and by the SPA pages. Moving or splitting this file breaks the injection metadata source without a migration plan.

3. Do NOT apply marketing crawler injection to auth, admin, or private routes (/login, /dashboard, /admin, /editor, etc.). The injection block is gated to `getMarketingMeta(segments[0])` вЂ” only keys defined in marketingMeta.config.js match. Auth routes are not registered there. Do not register auth routes in marketingMeta.config.js.

4. Do NOT change the card CRAWLER branch (backend /og fetch + injectMetadataIntoShell) casually. The card branch and marketing branch are separate code paths in og-preview.js. Changes to the card branch require their own audit under Section 16 anti-regression rules.

5. Keep social and crawler branches behavior-distinct. Social branch for top-level marketing OG HTML intentionally remains canonical-absent (includeCanonical default false). This is by design вЂ” social bots do not follow canonical tags and canonical in social OG HTML adds no value. Do not add canonical to social branch output without a separate SEO/social policy change and explicit approval.

6. Do NOT cache search crawler marketing injection responses without re-auditing cache-key behavior. Cache-Control: no-store and Vary: User-Agent are mandatory on all marketing crawler branch responses. Same invariant as the card CRAWLER branch (Section 16 anti-regression rule 5).

7. PowerShell smoke EXIT:1 artifact: Some PowerShell snippets in smoke runs report EXIT:1 when the last expression evaluated is a boolean $false. This is not a command failure. Future smoke scripts for this contour should aggregate results and `exit $aggregatedPass ? 0 : 1` explicitly.

---

### 18.5 GSC Operator Next Steps

After this production verification, the operator may proceed with GSC Live Test for the marketing routes. Recommended order:

1. GSC URL Inspection в†’ Test Live URL for /pricing вЂ” confirm Googlebot sees correct canonical and og:url in the initial HTML.
2. GSC URL Inspection в†’ Test Live URL for /blog вЂ” same.
3. GSC URL Inspection в†’ Test Live URL for /guides вЂ” same.

Only after Live Test confirms correct canonical and indexability:

4. Request Indexing for each of the three routes.

/cards and /contact may also be submitted via GSC URL Inspection after operator confirms product readiness.

Note: GSC URL Inspection reflects Googlebot's actual crawl, not the smoke test result. If Live Test shows unexpected values, open a new contour вЂ” do not silently retry.

---

### 18.6 Future Tails (Separate Contours)

The following contours were identified during the /guides/seo WRS investigation (Phase 1D/1E/1F, 2026-05-13) and are deferred for separate handling. They are not in scope for Section 18 (marketing routes initial metadata).

1. AUTHCONTEXT_PUBLIC_RENDER_GATE_AUDIT_P1 — Audit `AuthContext.jsx` line 82 (`{!loading && children}`) render gate on public routes. The gate blocks all page rendering until `/api/auth/me` resolves. Under WRS latency this may cause transient empty-root snapshots on any SPA route. Scope: AuthContext bootstrap timeout / public-route render gate strategy. Tracked separately — see Section 19.4. **(CLOSED 2026-05-13 by AUTHCONTEXT_PUBLIC_RENDER_GATE_RELAXATION. Public SPA rendering is no longer gated by `/api/auth/me`; `/api/auth/me` still runs in the background. See `docs/handoffs/current/Cardigo_Enterprise_Handoff_2026-05-13_AuthContext_PublicRender_GateRelaxation_Closed.md`.)**

2. PUBLIC_SEO_RENDERING_ROADMAP — Long-term roadmap item: evaluate SSG / prerender / SSR for blog and guide slug routes to eliminate WRS latency dependency. No timeline. Not authorized as code change without separate workstream + architect approval.

3. GOOGLEBOT_ANALYTICS_NOISE_CLEANUP — `/api/site-analytics/track` receives noise from Googlebot preflight requests (observed as failed resource in GSC Live Test for some routes). Currently 204-best-effort; no blocking. Optional: add UA allowlist guard at the endpoint to skip track for known bot UAs. Low priority, no rendering impact.

---

## 19. /guides/seo WRS Transient Incident — Closure Record

**Contour:** SEO_GUIDE_SLUG_WRS_TRANSIENT_INCIDENT_CLOSURE_DOCS_P1F
**Date:** 2026-05-13
**Status:** CLOSED — transient WRS incident, not systemic. Phase 2 NOT authorized.
**Files changed:** none — documentation only.

---

### 19.1 Background

During GSC evidence collection on 2026-05-13 (Phase 1C), a historical GSC crawl snapshot for `/guides/seo` showed:

- `<div id="root"></div>` empty
- `<title>` = homepage fallback "כרטיס ביקור דיגיטלי לעסקים | Cardigo"
- `og:url` = https://cardigo.co.il/ (homepage fallback)
- `og:type` = website
- No canonical link
- No Article JSON-LD
- No BreadcrumbList JSON-LD

This triggered a read-only targeted investigation across Phase 1D and Phase 1E.

---

### 19.2 Runtime Evidence Collected (Phase 1D, 2026-05-13)

All checks were read-only. No code was changed.

Browser UA curl `/guides/seo`: raw SPA shell, empty root, homepage og fallback — expected pre-JS.
Googlebot UA curl `/guides/seo`: same raw shell — expected; `og-preview.js` CRAWLER branch returns `context.next()` for `/guides/:slug` by design (no injection at this route in Phase 18 scope).
Social UA curl `/guides/seo`: guide-specific og — `og:type=article`, `og:url=https://cardigo.co.il/guides/seo`, `article:published_time=2026-05-05T08:15:44.083Z`, `article:author` present. Backend `/og/guides/seo` is healthy.
`/api/guides/seo`: HTTP 200, full guide JSON, `slug=seo`, `publishedAt=2026-05-05T08:15:44.083Z`, 11 sections, SEO fields present.
Main assets: `index-DnZsl_3T.js` 200, `vendor-CAbl3aBL.js` 200, `index-CBPtTUas.css` 200 — all healthy.

Source proof:

- `frontend/netlify/edge-functions/og-preview.js` CRAWLER branch: for `segments=["guides","seo"]`, `segments.length=2` → not card/c → `if (segments.length===1)` fails → falls through to `return context.next()`. No injection at `/guides/:slug`. By design.
- `frontend/src/context/AuthContext.jsx` line 82: `{!loading && children}` — all page rendering gated behind `/api/auth/me` bootstrap. If `/api/auth/me` is slow during a WRS window, root stays empty for the full WRS observation. Identified as plausible structural contributor to the historical empty-root snapshot. Not confirmed as definitive root cause.
- `frontend/src/app/router.jsx` line 41: `GuidePost` is lazy-loaded. Requires auth gate to pass, then chunk load, then `/api/guides/:slug` fetch. Three sequential async steps before `SeoHelmet` is emitted.
- `frontend/src/pages/GuidePost.jsx` lines 372-376: loading state renders inside root — not empty. Empty root means auth gate was not passed, not that GuidePost render hung.

---

### 19.3 GSC Live Test Result (Phase 1E, 2026-05-13)

Operator ran GSC URL Inspection → Test Live URL for https://cardigo.co.il/guides/seo.

Result: PASS.

- Page can be indexed: YES
- HTTP status: 200
- Screenshot: full rendered guide page (not blank/shell)
- `<title>`: guide-specific (not homepage fallback)
- canonical: `https://cardigo.co.il/guides/seo`
- `og:type`: article
- `og:url`: `https://cardigo.co.il/guides/seo`
- Article JSON-LD: present
- BreadcrumbList JSON-LD: present
- `<div id="root">`: full (not empty)
- Failed resources: `/api/auth/me` and `/api/site-analytics/track` did not block rendering

Verdict: The historical empty-root snapshot (Phase 1C, 08:42:08) was a transient WRS incident. Current WRS renders the guide correctly in a fresh Live Test. The failure was not reproducible.

---

### 19.4 Final Decision

Phase 2 implementation `SEO_BLOG_GUIDES_GOOGLEBOT_HEAD_INJECTION_P2` is NOT authorized.
`frontend/netlify/edge-functions/og-preview.js` is NOT modified.

Classification: transient WRS/indexed snapshot mismatch + P2 architectural rendering debt.

The architecture carries a structural latency risk: the `AuthContext` render gate + lazy chunk load + guide API call represent three sequential async steps that must all complete within WRS's execution window. This was the plausible contributor to the historical snapshot failure. It did not prevent a PASS in the fresh Live Test. It remains P2 architectural debt — not an emergency code fix. **(Update 2026-05-13: the AuthContext render-gate portion of this debt is CLOSED by AUTHCONTEXT_PUBLIC_RENDER_GATE_RELAXATION. The app remains a client-side SPA; no SSR or server HTML TTFB change was introduced.)**

---

### 19.5 Operator Action

Request Indexing in GSC for `/guides/seo` now that Live Test is PASS:

1. GSC → URL Inspection → `https://cardigo.co.il/guides/seo`
2. Click "Request Indexing"
3. Monitor Coverage report over the following days for indexing confirmation

Do not request indexing for other slug routes without individual Live Test confirmation.

---

### 19.6 Deferred Follow-Ups (not in scope for this contour)

1. **AUTHCONTEXT_PUBLIC_RENDER_GATE_AUDIT_P1** — Evaluate adding a bounded timeout to `AuthContext.jsx` `bootstrap()` so that public routes begin rendering even if `/api/auth/me` is slow. Scope: `frontend/src/context/AuthContext.jsx` only. Requires separate contour, architect approval, and regression testing of auth-dependent pages (dashboard, editor). Motivation: reduce WRS latency sensitivity on any public slug route. **(CLOSED 2026-05-13 by AUTHCONTEXT_PUBLIC_RENDER_GATE_RELAXATION. Timeout resilience, route guards, EditCard guards, and provider gate relaxation were implemented and production-smoke verified. See closure handoff.)**

2. **PUBLIC_SEO_RENDERING_ROADMAP** — Long-term: evaluate SSG, prerender, or Netlify On-Demand Builders for `/blog/:slug` and `/guides/:slug` to eliminate WRS JS-execution dependency entirely. No timeline. Not a near-term action.

3. **GOOGLEBOT_ANALYTICS_NOISE** — `/api/site-analytics/track` shows as a failed resource in some Googlebot Live Tests. Currently 204-best-effort and does not block rendering. Optional low-priority cleanup: add bot UA allowlist guard at the endpoint level. No rendering impact.

---

### 19.7 Explicit Non-Actions Confirmed

- No source code files changed.
- `frontend/netlify/edge-functions/og-preview.js` — not changed.
- `frontend/src/context/AuthContext.jsx` — not changed. **(True for the original Section 19 incident closure. Superseded on 2026-05-13: `AuthContext.jsx` was later changed by AUTHCONTEXT_PUBLIC_RENDER_GATE_RELAXATION to render `{children}` while auth bootstrap runs in the background.)**
- `frontend/public/_redirects` — not changed.
- No sitemap changes.
- No analytics changes.
- No backend changes.
- No auth changes.
- No git commands.

- Social bot OG preview for marketing pages (/pricing, /blog, /guides, /cards, /contact): social bots (facebookexternalhit, WhatsApp, Twitterbot, etc.) now receive route-specific og:url and og:title via buildStaticMarketingOgHtml. Social branch remains canonical-absent by design (includeCanonical not passed в†’ false). The remaining deferred gap is og:image differentiation вЂ” all 5 routes still share the homepage og:image. This is a separate gap tracked under SEO_MARKETING_PAGES_SOCIAL_PREVIEW_P1. Do not conflate with this contour.
- Marketing page og:image differentiation: all 5 marketing routes currently share the homepage OG image via the static shell fallback. If per-route OG images are desired for Googlebot or social bots, open a separate contour.
- blog/:slug and guides/:slug Googlebot initial metadata: these slug routes continue via WRS + SeoHelmet. No injection is applied. If GSC shows rendering errors for these routes, open a separate contour.
- Search Console recrawl timing: canonical/og:url improvements become visible to Googlebot at the next crawl, not immediately. Request Indexing via GSC is the fastest operator action.

---

## 20. Public SSG Render Path for Marketing + Blog + Guides - 2026-05 Migration

**Contour:** PUBLIC_SEO_SSG_MIGRATION_AND_PREVIOUSSLUGS_ALIASES - CLOSED (2026-05-26).
**Status:** CLOSED. Production smoke classification: PRODUCTION_CONFIRMED_BY_OPERATOR_REPORT.
**Authoritative for:** marketing + blog + guides routes listed below. Sections 1-19 of this runbook remain authoritative for `/card/:slug` and `/c/:orgSlug/:slug` (Edge CRAWLER + social UA branches) and for the historical /guides/seo WRS transient incident closure (which are still NOT SSG).

### 20.1 Route table (SSG-first)

The following routes are pre-rendered to static HTML at build time and published from `dist/`:

- `/`
- `/cards/`
- `/pricing/`
- `/contact/`
- `/blog/`
- `/guides/`
- `/blog/page/N/` (for every valid N >= 2 derived from build-time data)
- `/guides/page/N/` (mirror)
- `/blog/:slug/` (for every published blog post)
- `/guides/:slug/` (for every published guide)

Trailing slash is the canonical form for all routes above. Browser path is SSG. Social UA path for `/blog/:slug` and `/guides/:slug` continues to use the Edge `og-preview.js` social branch.

### 20.2 SSG build pipeline summary

- `frontend/scripts/generate-static.mjs` enumerates the route table, performs build-time public API fetches via the helpers under `frontend/scripts/lib/`, renders each route with React `renderToString` + react-helmet-async, and writes per-route `index.html` into `dist/` with the Helmet head, the SSR body in `#root`, and the data island injected before `</body>`.
- `frontend/scripts/check-ssg-output.mjs` is the SSG gate. It enforces FULL vs DEGRADED status, canonical/og:url presence, and the alias marker block guard.
- Data is fetched at build time only; no client runtime requests are required to render the first paint.

### 20.3 `_redirects` contract (build-materialized)

`frontend/public/_redirects` is the static template. The build copies it to `dist/_redirects` and materializes the alias marker block in place.

Final rule order in `dist/_redirects` (first-match-wins):

1. `/api/*` proxy 200
2. `/sitemap.xml` proxy 200
3. `/og/*` proxy 200
4. `/card/*` → `/.netlify/functions/card-ssr/card/:splat 200` (SSR_REAL_ROUTE_PRODUCTION_ROLLOUT CLOSED 2026-07-05)
5. `/c/*` → `/.netlify/functions/card-ssr/c/:splat 200` (SSR_REAL_ROUTE_PRODUCTION_ROLLOUT CLOSED 2026-07-05)
6. Alias marker block (`# cardigo-generated-alias-redirects:start` ... `:end`) - one `301` per alias pair, both with and without trailing slash
7. `/blog/page/*` -> `/404.html` 404
8. `/blog/*` -> `/404.html` 404
9. `/guides/page/*` -> `/404.html` 404
10. `/guides/*` -> `/404.html` 404
11. `/*` SPA shell 200 (catch-all for routes not pre-rendered)

Hard invariants:

- The alias marker block MUST precede the `/blog/*` and `/guides/*` 404 wildcards, or the wildcards shadow alias 301s into 404s.
- No `!` force flag on any alias line.
- Static file precedence: a pre-rendered `/blog/page/N/index.html` wins over the `/blog/page/* /404.html 404` rule because Netlify serves the matching static file first. Invalid pagination falls through to the 404 rule.
- Unknown `/blog/:slug/` and `/guides/:slug/` fall through to `/404.html` 404 because no pre-rendered static file exists.

### 20.4 Data islands

Two element IDs only:

- `cardigo-initial-listing-data` - listing seed for `/blog/`, `/guides/`, `/blog/page/N/`, `/guides/page/N/`. DTO whitelist per item: `id`, `slug`, `title`, `excerpt`, `heroImageUrl`, `heroImageAlt`, `publishedAt`.
- `cardigo-initial-detail-data` - detail seed for `/blog/:slug/`, `/guides/:slug/`. DTO whitelist: 15 public fields; sections filtered to `{ heading, body, imageUrl, imageAlt }`.

`previousSlugs` is NEVER serialized into either island. Build-time fetchers fail open (`{ ok: false }`) on timeout / non-2xx / malformed JSON; the page still renders with an empty seed and the client effect performs a normal API fetch after hydration. The SSG gate marks the route as DEGRADED but does not abort the build.

### 20.5 Soft-404 / static 404

Unknown `/blog/:slug/` and `/guides/:slug/` return HTTP 404 served by the static `frontend/public/404.html`:

- `<meta name="robots" content="noindex, nofollow" />`
- No canonical, no og:url, no JSON-LD, no data island.
- Hebrew page title preserved.

This supersedes the previous in-SPA soft-404 noindex path for these routes. The previous SPA-soft-404 mechanism described in section 10 of this runbook still applies to non-SSG routes.

### 20.6 Pagination SEO

- Valid `/blog/page/N/` and `/guides/page/N/` are SSG with self canonical and `robots="noindex, follow"`.
- Invalid pagination falls through to the static 404.
- Page count is derived from build-time public API total; only valid pages are pre-rendered.

### 20.7 Sitemap exclusions

The backend `sitemap.xml` excludes `previousSlugs` alias source slugs, all `/blog/page/*` paths, and all `/guides/page/*` paths. Only canonical trailing-slash detail URLs and static marketing routes appear.

### 20.8 previousSlugs alias marker block

- Public read-only endpoints: `GET /api/blog/aliases` and `GET /api/guides/aliases`. Response shape `[{from,to}]`. `Cache-Control: no-store`. No auth, no CSRF, no `X-Requested-With`.
- Build-time fetcher `frontend/scripts/lib/fetchAliasMapForSsg.mjs` consumes these endpoints, validates slugs, deduplicates, and drops ambiguous mappings.
- The build emits a 301 line into `dist/_redirects` for each accepted pair, both with and without trailing slash on the source.
- Browser GET on the alias source returns Netlify HTTP 301 to the canonical URL.
- Social UA GET on the alias source returns HTTP 200 OG payload with canonical og:url (Edge intercept + backend exact-first resolution).
- Sitemap excludes the alias source slug.
- Frontend rebuild + deploy is required to materialize new alias 301s. The rebuild-on-publish hook does not yet exist; see the contour handoff for the tail list.

### 20.9 Dual render model

- SSG-first for the routes in 20.1.
- Edge / SPA-shell still authoritative for `/card/:slug` and `/c/:orgSlug/:slug` (Edge CRAWLER branch + Edge social UA branch as documented in sections 2 and 16).

### 20.10 Anti-regression rules (operator checklist)

- Preserve alias marker block ordering before bucket 404 wildcards.
- No `!` force flag.
- Exact-first OG alias resolution preserved (current slug wins).
- `previousSlugs` not in the per-post public DTO.
- Sitemap excludes aliases and pagination.
- Unknown blog / guides slugs return a real HTTP 404 (not SPA-shell 200).
- Valid pagination stays `noindex, follow`.
- Social UA path remains intentionally distinct from browser path.
- `BlogPost` and `GuidePost` route components remain eager imports (no `React.lazy`) because `renderToString` does not resolve `Suspense`.
- Listing DTO whitelist (7 fields) and detail DTO whitelist (15 fields) preserved.
- `Cache-Control: no-store` preserved on the alias endpoints.
- Frontend rebuild required after backend alias data changes.

### 20.11 Cross-references

- Contour handoff: `docs/handoffs/current/Cardigo_Enterprise_Handoff_2026-05-26_Public_SEO_SSG_Migration_And_PreviousSlugs_Aliases_Closed.md`.
- Blog-specific runbook section: `docs/runbooks/docs_blog_seo_og_runbook.md` -> "## 9) Slug Continuity & Aliases" -> addendum "### 9.5 2026-05 previousSlugs alias redirects closure".

### 20.12 Note on sections 1-19 of this runbook

Sections 1-19 of this runbook were written for the SPA-shell + Edge-injected era and the /guides/seo WRS transient incident closure, and remain accurate for `/card/:slug` and `/c/:orgSlug/:slug` (which are still NOT SSG) and for the historical WRS incident record. For marketing, blog, and guides routes listed in 20.1, this section 20 is the new authority. The older sections were not removed because they remain operationally accurate for the card and org-card surfaces and as a historical incident record.

---

## Section 21 — D1 Chain Closure Record (2026-06-01)

### 21.1 Executive Status

All sub-contours of the PUBLIC_CARD_SEO_RENDERING_D1_CHAIN workstream are CLOSED as of 2026-06-01.

Sub-contours closed:

- P2A-FIX: Edge Function og-preview.js restored after accidental removal. Status: CLOSED.
- P2B-1: SeoHelmet JSON-LD duplicate suppression (data-cardigo-edge-ld="1" guard). Status: CLOSED.
- P2B-2: Edge Function JSON-LD injection (FAQPage + LocalBusiness). Status: CLOSED.
- P2B-3: SeoHelmet non-JSON-LD head meta duplicate suppression. Status: CLOSED.
- MARKETING_SSG_INSTALL_CTA_HYDRATION_MISMATCH: InstallCta helpText mounted-gate fix. Status: CLOSED.
- D1: Visible semantic fallback body injection (id="cardigo-body-fallback") + cleanup useEffect. Status: CLOSED.

This workstream is NOT full SSR. React SSR / hydrateRoot is not used. The card component renders entirely in the browser via createRoot(). The "fallback" is a visible but non-interactive body section injected by the Netlify Edge Function into the raw HTML delivered to crawlers and browsers alike.

### 21.2 Architecture Truth (as of 2026-06-01)

For /card/:slug and /c/:orgSlug/:slug:

1. Netlify Edge Function (og-preview.js) — unified CRAWLER + BROWSER branch:
    - Fetches backend /og/\* for metadata (not served directly)
    - Fetches SPA shell via context.next()
    - Injects per-card head: title, meta description, canonical, robots, og:_, twitter:_, JSON-LD (FAQPage + LocalBusiness, data-cardigo-edge-ld="1")
    - Injects visible fallback body (id="cardigo-body-fallback") before <div id="root"></div>
    - Cache-Control: public, max-age=60, stale-while-revalidate=300, Vary: User-Agent

2. Browser / React runtime:
    - <div id="root"></div> is empty in the raw Edge HTML
    - createRoot().render(app) mounts the full React app
    - SeoHelmet suppresses duplicate JSON-LD (P2B-1) and selected non-JSON-LD head meta (P2B-3)
    - PublicCard cleanup useEffect removes #cardigo-body-fallback after card loads

3. Googlebot and all non-social UAs: receive the same enriched SPA shell as browsers — Edge-injected head, Edge-marked JSON-LD, and visible semantic fallback body before empty #root.

4. Social crawlers (facebookexternalhit, WhatsApp, Twitterbot, LinkedInBot, and similar social preview bots): NOT affected by D1. Social crawlers still receive the raw backend /og body through the unchanged SOCIAL branch in og-preview.js. D1 did not modify the SOCIAL branch. Social bots do not receive the fallback body and do not receive the SPA shell.

### 21.3 Production Verification (2026-06-01)

Production smoke results:

- /card/:slug (existing card, browser UA): HTTP 200, fallback present, fallback before #root, #root empty in raw HTML, 2x JSON-LD in head (FAQPage + LocalBusiness), data-cardigo-edge-ld="1" present, canonical present, robots present, title present. PASS.
- /card/:slug (existing card, Googlebot UA): HTTP 200, same enriched shell. PASS.
- /card/:slug (missing slug, Googlebot UA): HTTP 404 from backend. PASS.
- Social preview (existing card, social UA): correct og:title, og:description, og:image. PASS.

### 21.4 Security / Privacy Invariants

- Private card data (email, phone, address) is NOT present in fallback body or Edge-injected head.
- Fallback body contains only: display name, job title, business name, category, city, FAQ pairs — all public-profile fields.
- No auth tokens, org secrets, or internal IDs in any Edge-injected content.

### 21.5 Open Tails (Not Blocking Closure)

- GSC index coverage validation: operator task — monitor Google Search Console for rendering coverage improvements over 3–4 week window.
- Cache purge at deploy: Netlify edge cache purge is automatic on deploy; no manual action required.
- Full React SSR: CLOSED — SSR_REAL_ROUTE_PRODUCTION_ROLLOUT CLOSED / PASS / PRODUCTION VERIFIED 2026-07-05. /card/* and /c/* now serve full SSR HTML with sanitized data island. See Section 23.
- PUBLIC_CARD_EDGE_FALLBACK_VISUAL_SWAP_P1_AUDIT: The D1 fallback is plain semantic HTML, not styled CardLayout. On production, the operator confirmed the fallback can be visible long enough to screenshot before the styled React card UI replaces it. This is accepted D1 behavior and not a rollback reason. Audit whether to reduce or eliminate the visible plain-fallback flash using a data island, faster cleanup, loading-skeleton coordination, minimal static fallback CSS, or another safe approach. Must not use hidden SEO content, must not inject into #root, and must not reopen CardLayout/templates/skins casually. Full React SSR is now live — see Section 23 (SSR_REAL_ROUTE_PRODUCTION_ROLLOUT CLOSED 2026-07-05).

### 21.6 Canonical References

- Closure handoff: docs/handoffs/current/Cardigo_Enterprise_Handoff_2026-06-01_PublicCard_SEO_Rendering_D1_Closed.md
- Edge Function: netlify/edge-functions/og-preview.js
- Fallback body (D1 injection DISABLED as of PUBLIC_CARD_FALLBACK_DISABLE_P2B_MINIMAL 2026-06-01; see Section 22): helper defs kept inert in og-preview.js
- SeoHelmet: frontend/src/components/seo/SeoHelmet.jsx
- PWA install hydration fix: frontend/src/components/InstallCta/InstallCta.jsx

---

## 22. PUBLIC_CARD_FALLBACK_DISABLE_P2B_MINIMAL (2026-06-01, CLOSED/PRODUCTION VERIFIED)

### 22.1 Contour Summary

Contour: PUBLIC_CARD_FALLBACK_DISABLE_P2B_MINIMAL
Status: CLOSED / PASS / PRODUCTION VERIFIED 2026-06-01
Canonical handoff: docs/handoffs/current/Cardigo_Enterprise_Handoff_2026-06-01_PublicCard_Fallback_Disable_P2B_Closed.md

This contour is a bounded follow-on to PUBLIC_CARD_SEO_RENDERING_D1_CHAIN (Section 21).
It disables the visible body fallback injection that was implemented in D1.
It does NOT roll back the SEO head injection or Edge-marked JSON-LD (those remain active).

### 22.2 What Changed

File changed: frontend/netlify/edge-functions/og-preview.js only.

The inner body-injection try/catch in serveCardEnrichedShell was removed.
The call chain extractOgMainContent -> sanitizeOgBody -> injectBodyFallback is no longer executed.
Helper function definitions (extractOgMainContent, sanitizeOgBody, injectBodyFallback) kept as dead code for re-enable path.
finalHtml = headInjectedHtml is the only assignment (no body injection applied).
Cache headers, social branch, marketing CRAWLER branch, direct /og routes: all UNCHANGED.

### 22.3 Why

D1 visible body fallback caused a visible flash of unstyled plain HTML before the React card UI rendered.
This was confirmed as a P1 product-trust / perceived-performance issue by the operator at production load time.
The disable was a product decision, not a technical defect.
The root fix is a data island (separate contour: PUBLIC_CARD_DATA_ISLAND_FOR_FAST_HYDRATION_P1_AUDIT).

### 22.4 Current /card and /c Flow (post-disable)

Browser and Googlebot receive an enriched shell with:

- Deterministic SEO head (title, description, canonical, robots, og:_, twitter:_)
- Edge-marked JSON-LD FAQPage + LocalBusiness (data-cardigo-edge-ld="1") x2
- <div id="root"></div> EMPTY -- no body fallback injected
- NO cardigo-body-fallback element

React runtime on mount: hasEdgeFallback = false (element absent), createRoot().render(app), API round-trip loads card.
SeoHelmet P2B-1/P2B-3 suppression: unchanged and active.
Social branch: unchanged (receives raw backend /og body, not SPA shell).
Unknown slug (Googlebot): HTTP 404, no-store -- unchanged.

Full React SSR is now live in production (SSR_REAL_ROUTE_PRODUCTION_ROLLOUT CLOSED / PASS / PRODUCTION VERIFIED 2026-07-05). CardLayout, templates, and skins remain client-rendered on hydration; the SSR renderToString pass produces the initial HTML body. See Section 23.

### 22.5 P2A Residue (inert, do not clean casually)

frontend/src/styles/globals.css: #cardigo-body-fallback CSS block (dead CSS, element never injected).
frontend/src/pages/PublicCard.jsx: hasEdgeFallback detection + cleanup useEffect (dead code, element never present).
Disposition: Wait for data island contour direction before cleaning.

### 22.6 Production Smoke Summary (2026-06-01, 9 branches, all PASS)

BROWSER /card: HTTP 200, fallback_present=FALSE, root_empty=TRUE, ld_count=2, edge_marks=2, faqPage=TRUE, localBiz=TRUE, CC=public max-age=60 SWR=300 PASS
GOOGLEBOT /card: HTTP 200, fallback_present=FALSE, root_empty=TRUE, ld_count=2, edge_marks=2, faqPage=TRUE, CC=public max-age=60 SWR=300 PASS
BROWSER /c: HTTP 200, fallback_present=FALSE, root_empty=TRUE, ld_count=2, edge_marks=2, faqPage=TRUE, localBiz=TRUE PASS
SOCIAL /card: HTTP 200, has_root=FALSE, fallback_present=FALSE, ld_count=2, faqPage=TRUE, has_dt=TRUE, CC=public max-age=300 SWR=60 PASS
SOCIAL /c: HTTP 200, has_root=FALSE, fallback_present=FALSE, ld_count=2, faqPage=TRUE, has_dt=TRUE PASS
DIRECT /og/card: HTTP 200, has_root=FALSE, fallback_present=FALSE, ld_count=2, faqPage=TRUE, has_dt=TRUE PASS
DIRECT /og/c: HTTP 200, has_root=FALSE, fallback_present=FALSE, ld_count=2, has_dt=TRUE PASS
UNKNOWN-BROWSER /card: HTTP 200, has_root=TRUE, fallback_present=FALSE PASS
UNKNOWN-GOOGLEBOT /card: HTTP 404, body=Not found, cc=no-store PASS

### 22.7 Anti-Regression Rules

Do NOT re-enable body fallback without a new bounded Phase 1 audit and operator approval.
Do NOT hide any fallback if ever re-enabled (cloaking prohibition).
Do NOT put content inside <div id="root"></div> in Edge HTML (triggers React hydration mismatch).
Do NOT change data-cardigo-edge-ld="1" coupling without full P2B-1/P2B-2 cross-phase audit.
Do NOT clean P2A residue without data island contour decision.
Full React SSR: CLOSED / PASS / PRODUCTION VERIFIED 2026-07-05. See Section 23.

### 22.8 Open Tails

PRIMARY: PUBLIC_CARD_DATA_ISLAND_FOR_FAST_HYDRATION_P1_AUDIT -- data island for zero-loading-state hydration.
DEFERRED: P2A residue cleanup (globals.css, PublicCard.jsx) -- decide in data island contour.
OPERATOR: GSC / WRS monitoring -- no regression expected (SEO head + JSON-LD active).


---

## 23. SSR_REAL_ROUTE_PRODUCTION_ROLLOUT (2026-07-05, CLOSED/PASS/PRODUCTION VERIFIED)

### 23.1 Contour Summary

**Status:** CLOSED / PASS / PRODUCTION VERIFIED 2026-07-05

Real public card routes `/card/:slug` and `/c/:orgSlug/:slug` now deliver full React SSR HTML with a sanitized data island for browser and Googlebot paths. Social UAs continue to receive raw backend OG HTML (unchanged). Direct `/og/*` paths remain proxy-routed (unchanged).

### 23.2 Production Routing Truth

| Route | Method | Handler |
|-------|--------|---------|
| /card/* | GET browser/Googlebot | Edge enrichment + card-ssr Netlify Function (SSR) |
| /c/* | GET browser/Googlebot | Edge enrichment + card-ssr Netlify Function (SSR) |
| /card/* | GET social UA | Edge SOCIAL branch → raw /og/card/:slug backend HTML |
| /c/* | GET social UA | Edge SOCIAL branch → raw /og/c/:orgSlug/:slug backend HTML |
| /og/* | GET any | proxy → backend /og/* (unchanged) |
| /__card-ssr-preview?path=... | GET any | card-ssr Netlify Function (preview, noindex) |

_redirects lines 7-8 (current production):
```
/card/*       /.netlify/functions/card-ssr/card/:splat   200
/c/*          /.netlify/functions/card-ssr/c/:splat      200
```

### 23.3 UA Behavior Matrix

| UA class | /card/:slug and /c/:orgSlug/:slug |
|----------|-----------------------------------|
| Browser | Edge enriches card-ssr SSR response; receives full SSR HTML + data island in #root + Edge-injected head tags |
| Googlebot/bingbot | Same as browser |
| Social bot (Facebook, WhatsApp, Twitter, etc.) | Edge SOCIAL branch; receives raw /og/* backend HTML; no data island; Cache-Control: public max-age=300 |
| Direct /og/* | proxy → backend; not SSR-routed |

### 23.4 Noindex / Indexability Policy

| Route / context | X-Robots-Tag |
|-----------------|--------------|
| Published real /card/* and /c/* (browser/Googlebot) | ABSENT — indexable |
| Unknown slug /card/* or /c/* | noindex (function returns 404 + noindex) |
| /__card-ssr-preview?path=... | noindex (always) |
| All failure/error branches (400/404/410/503/500) | noindex |
| Netlify Deploy Preview platform | Global platform noindex added to ALL Deploy Preview responses; this is expected Netlify platform behavior and is NOT present in production |

### 23.5 Data Island Privacy Policy

The SSR data island uses the sanitized public card DTO only:
- Built from `PUBLIC_CARD_SSR_TOP_LEVEL_ALLOWLIST` (slug, status, isActive, business, contact, content, businessHours, bookingSettings, faq, design, gallery, reviews, seo, seoResolved, publicPath, ogPath, entitlements).
- 17 forbidden top-level keys removed (billing, adminOverride, effectiveBilling, effectiveTier, etc.).
- Design `*Path` storage paths removed; gallery path/thumbPath/storagePath removed.
- Entitlements filtered to 8 public keys only.
- `assertNoForbiddenSsrPayloadFields` assertion runs before any data is served.
- Production privacy scan result: 0 matches for all forbidden markers.

### 23.6 Production Smoke Results (2026-07-05, PASS)

| Check | /card/digitalyty | /c/zman-lhofsha/vacation-deals |
|-------|-----------------|-------------------------------|
| HTTP status | 200 | 200 |
| div count | 46 | 45 |
| title count | 1 | 1 |
| canonical count | 1 | 1 |
| og:title count | 1 | 1 |
| JSON-LD script count | 2 | 2 |
| X-Robots-Tag | ABSENT | ABSENT |
| data island | present | present |
| privacy scan | 0 matches | 0 matches |

Social UA: raw OG HTML, no data island. Direct /og/card/: 200 no-cache no noindex. Unknown personal/org routes: 404 no-store noindex.

### 23.7 Rollback Plan

To revert to pre-SSR routing:
1. Restore `frontend/public/_redirects` lines 7-8 to `/card/*  /spa-shell.html  200` and `/c/*  /spa-shell.html  200`.
2. Restore `frontend/scripts/check-ssg-output.mjs` REQUIRED_RULES and EXPECTED_SPA_SHELL_SOURCES to expect SPA shell routing.
3. Rebuild and deploy. Do not use git force-push or destructive operations.
4. Verify: `/card/digitalyty` returns empty #root (SPA shell), no data island.

### 23.8 Monitoring Notes

- Function logs should show only `Duration` and `Memory Usage` lines after normal requests.
- No `CARD_SSR_PREVIEW_FAILED` in production function logs (indicates backend/env issue if present).
- No stack traces in function logs.
- GSC reindexing: may request re-crawl via Search Console URL Inspection for key published cards after monitoring period.
- Performance monitoring: card route TTFB increase (Lambda cold start ~100-500ms) can be tracked as separate operator concern.

### 23.9 Anti-Regression Rules

- Do NOT revert routing without a bounded Phase 1 audit and operator approval.
- Do NOT serve SSR body for social UAs (social must receive raw /og/* backend HTML).
- Do NOT bypass the SSR sanitizer (`sanitizePublicCardForSsr` + `assertNoForbiddenSsrPayloadFields`).
- Do NOT add X-Robots-Tag: noindex to real route 200 success responses.
- Do NOT change the /__card-ssr-preview noindex policy.
