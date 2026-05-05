# Cardigo Enterprise Handoff — SEO Public Indexability — CLOSED

**Date:** 2026-05-05
**Project:** Cardigo — Digital Business Cards SaaS
**Canonical domain:** https://cardigo.co.il
**Status:** 10 SEO/public-indexability contours CLOSED. Production verified by operator-provided curl, devtools, and Google Rich Results evidence.

---

## 1. Executive Summary

All public indexability infrastructure for Cardigo blog, guides, cards, and marketing pages is now live on production. The proxy gate that blocked crawlers was removed at production launch (2026-05-03). This handoff documents the 10 SEO contours closed in this session and the production-verified state of the public indexability system.

Two distinct render paths serve two distinct audiences:

- **Googlebot / browsers (Path A):** SPA → react-helmet-async `SeoHelmet` → full head tags injected at runtime.
- **Social preview bots (Path B):** Netlify Edge Function (`og-preview.js`) intercepts UA-matched crawlers → proxies to backend `/og/*` → returns static OG HTML.

Both paths now emit equivalent article meta, image alt, og:locale, og:site_name, and JSON-LD where applicable.

**Remaining P1 tail:** Google Search Console (GSC) ownership verification and sitemap submission have not been completed. Until GSC is configured, crawl errors and indexing gaps are not visible. This is the highest-priority SEO item remaining.

---

## 2. Closed Contours

| Contour                                      | Status                       | Production Evidence                                                                                                       |
| -------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| SEO_BLOG_GUIDES_SOCIAL_PREVIEW_P1            | CLOSED / PRODUCTION VERIFIED | Social bot curl confirmed og:type=article and og:url for blog and guides; missing slugs return 404; card regression clean |
| SEO_ROBOTS_TXT_MINIMAL_TECHNICAL_DISALLOW_P1 | CLOSED / PRODUCTION VERIFIED | robots.txt serves with Disallow: /.netlify/ and Disallow: /og/; /api/ remains crawlable                                   |
| SEO_BLOG_GUIDES_JSONLD_SCHEMA_BASELINE_P1    | CLOSED / PRODUCTION VERIFIED | Google Rich Results Test passed for /blog/post-7a9572f4 and /guides/seo — Article + Breadcrumbs detected, no errors       |
| SEO_BLOG_GUIDES_SOFT404_NOINDEX_P1           | CLOSED / PRODUCTION VERIFIED | Missing blog slug renders Hebrew not-found title with robots="noindex, nofollow" in rendered head                         |
| SEO_SITEMAP_CARD_LASTMOD_P1                  | CLOSED / PRODUCTION VERIFIED | /card/cardigo and /c/digitalyty/digital-card entries confirmed present in sitemap.xml with lastmod values                 |
| SEO_SITEMAP_STATIC_LASTMOD_METADATA_P1       | CLOSED / PRODUCTION VERIFIED | 10 static paths include stable lastmod="2026-05-03"; verified via sitemap curl with regex checks                          |
| SEO_SEOHELMET_OG_BASELINE_META_P1            | CLOSED / PRODUCTION VERIFIED | og:locale=he_IL and og:site_name=Cardigo confirmed in rendered head on /pricing and /blog/post-7a9572f4                   |
| SEO_ARTICLE_META_TAGS_BLOG_GUIDES_P1         | CLOSED / PRODUCTION VERIFIED | article:published_time, article:modified_time, article:author confirmed via social bot curl on blog and guides            |
| SEO_IMAGE_ALT_META_EDITORIAL_P1              | CLOSED / PRODUCTION VERIFIED | og:image:alt and twitter:image:alt confirmed in rendered SPA head for blog/guide posts with hero images                   |
| SEO_BACKEND_OG_BLOG_GUIDES_IMAGE_ALT_P1      | CLOSED / PRODUCTION VERIFIED | og:image:alt and twitter:image:alt confirmed via social bot curl for blog and guide OG HTML from backend                  |

---

## 3. Production Evidence Summary

Evidence for each contour was provided by operator via:

- `curl.exe` with social bot UA (`facebookexternalhit/1.1`, `WhatsApp/2`) against https://cardigo.co.il
- Browser devtools inspection of rendered `<head>` on live production pages
- Google Rich Results Test (https://search.google.com/test/rich-results) for /blog/post-7a9572f4 and /guides/seo
- sitemap.xml direct HTTP fetch and regex verification

No automated CI proof for production OG was run. Production evidence is operator-provided manual verification. This is the expected proof mode for social-preview and head-tag correctness in a Netlify SPA with react-helmet-async.

---

## 4. Public Route Crawl/Index Policy (SSoT)

### Indexable routes (no noindex, crawlable)

- `/` (homepage)
- `/blog` (blog listing)
- `/blog/:slug` (blog post — valid published slug)
- `/guides` (guides listing)
- `/guides/:slug` (guide post — valid published slug)
- `/cards` (cards marketing page)
- `/pricing`
- `/contact`
- `/privacy`
- `/terms`
- `/accessibility-statement`
- `/payment-policy`
- `/card/:slug` (public card — premium only; free-tier cards get `robots: "noindex"` via backend DTO)
- `/c/:orgSlug/:slug` (org public card — premium org entitlement only)

### Intentionally noindexed routes (must NOT be removed)

- `/preview/*` (PreviewCard.jsx): `noindex, nofollow, noarchive` — hardcoded, intentional
- `/payment/checkout` and all checkout states (CheckoutPage.jsx): `noindex, nofollow` — intentional
- `/payment/iframe-return` (IframeReturnPage.jsx): `noindex, nofollow` — intentional
- Free-tier public cards: backend `cardDTO.js` injects `robots: "noindex"` — intentional
- Missing blog/guide slug (notFound branch): `noindex, nofollow` — runtime-only, SPA branch state

### Deferred noindex review

- `/edit/*`, `/admin/*` — noindex review deferred (P2.5 tail)
- Private auth routes — noindex review deferred until GSC confirms deindex

---

## 5. robots.txt Current Truth

Current file: `frontend/public/robots.txt`

```
User-agent: *
Allow: /
Disallow: /.netlify/
Disallow: /og/

Sitemap: https://cardigo.co.il/sitemap.xml
```

**Policy decisions:**

- `/.netlify/` disallowed — Netlify internal function paths are not user pages and must not be crawled.
- `/og/` disallowed — Backend social-preview OG HTML endpoints are not user-facing pages. Social bots reach them via Edge Function proxy, not direct crawl.
- `/api/` intentionally NOT disallowed — Google Web Rendering Service (WRS) depends on `/api/*` for fetching public card, blog, and guide data during SPA rendering. Adding a Disallow here would break WRS rendering of public pages and harm indexation.
- Private/auth/admin/editor/payment/preview route Disallow is **deferred** until GSC confirms noindex processing and page drop. Adding these prematurely could cause premature deindex of pages that still need crawling for noindex to take effect.

---

## 6. sitemap.xml Current Truth

`GET https://cardigo.co.il/sitemap.xml` returns XML with:

**Static paths (10) — lastmod="2026-05-03":**

- `/` `/blog` `/pricing` `/contact` `/guides` `/cards` `/privacy` `/terms` `/accessibility-statement` `/payment-policy`

**Dynamic blog post paths:**

- `/blog/:slug` for all `status: "published"` posts — `<lastmod>` from `post.updatedAt`
- Draft and previousSlugs (aliases) excluded

**Dynamic guide post paths:**

- `/guides/:slug` for all `status: "published"` guides — `<lastmod>` from `guide.updatedAt`

**Dynamic card paths:**

- `/card/:slug` — premium personal cards only (active, entitlement, free-tier excluded) — `<lastmod>` from `card.updatedAt`
- `/c/:orgSlug/:slug` — org-owned premium cards only (org active, orgEntitlement loaded, active membership) — `<lastmod>` from `card.updatedAt`

**Not included in sitemap:**

- Free-tier cards (excluded via resolveEffectiveTier)
- Draft/unpublished blog and guide posts
- Private/admin/editor/payment routes
- Preview routes

---

## 7. Blog/Guides Social Preview Truth

**Mechanism:** Netlify Edge Function (`frontend/netlify/edge-functions/og-preview.js`) intercepts requests to `/blog/*` and `/guides/*` from social preview bots and proxies them to the backend.

**UA allowlist (intercepts these bots):**
facebookexternalhit, Facebot, WhatsApp, Twitterbot, LinkedInBot, TelegramBot, Slackbot, Slack-ImgProxy, Discordbot, Pinterest, vkShare.

**Intentionally excluded from interception:**

- Googlebot — receives SPA shell (Path A)
- Bingbot — receives SPA shell (Path A)
- All other bots not in the UA allowlist — receive SPA shell

**Normal browser requests:** pass through to Netlify `_redirects` SPA fallback unaffected.

**Backend routes serving social bots:**

- `GET /og/blog/:slug` (backend/src/routes/og.routes.js)
- `GET /og/guides/:slug` (backend/src/routes/og.routes.js)

**Missing slug behavior:**

- `/blog/nonexistent-slug` with social bot UA → 404 from backend (anti-enumeration, confirmed via production curl)
- `/guides/nonexistent-slug` with social bot UA → 404 from backend

**Regression:** `/card/:slug` and `/c/:orgSlug/:slug` social preview (using `buildCardOgMetadata`) was unaffected by the blog/guides changes and continued to pass smoke.

---

## 8. Backend /og/\* Truth (SSoT)

File: `backend/src/routes/og.routes.js`

### /og/blog/:slug and /og/guides/:slug — full tag inventory

Both handlers emit (when published slug exists):

- `og:type="article"`
- `og:title` — post title
- `og:description` — post excerpt/description
- `og:url` — canonical URL
- `og:image` — hero image URL (conditional on hero existing)
- `og:image:alt` — `collapseWs(post.heroImage?.alt) || collapseWs(post.title)` (conditional on image)
- `twitter:card`, `twitter:title`, `twitter:description`
- `twitter:image` — hero image URL (conditional)
- `twitter:image:alt` — same source as og:image:alt (conditional)
- `article:published_time` — from `post.publishedAt`
- `article:modified_time` — from `post.updatedAt`
- `article:author` — from `post.authorName || DEFAULT_BLOG_AUTHOR_NAME`
- `meta refresh` redirect to canonical URL

All values wrapped in `escapeHtml`. No private/internal identifiers emitted.

### /og/card/:slug and /og/c/:orgSlug/:slug

Use shared `buildCardOgMetadata` helper (pre-existing, not changed in this session). Emit `og:image:alt` and `og:image:secure_url` always. `twitter:image:alt` for card routes is a **deferred gap** (pre-existing, not introduced by this session).

---

## 9. Google/WRS vs Social Bot Render-Path Split

```
Request arrives at cardigo.co.il
         │
         ├─ Social bot UA? (FB/WA/TG/LI/Slack/Discord/etc.)
         │   AND path matches /card/*, /c/*, /blog/*, /guides/*?
         │         │
         │         YES → Netlify Edge Function (og-preview.js)
         │               → proxy to backend /og/* with proxy secret
         │               → return backend-generated static OG HTML
         │               → social bot sees article/card-specific meta
         │
         └─ Browser / Googlebot / Bingbot / non-matched bot?
                   │
                   YES → Netlify _redirects SPA fallback
                         → SPA (index.html + JS bundle)
                         → react-helmet-async SeoHelmet
                         → head tags injected at runtime (WRS executes JS)
```

**Static fallback (index.html):** For requests that reach index.html before the SPA or edge layer resolves metadata, `frontend/index.html` contains static OG fallback tags for the homepage brand identity. These cover marketing pages for bots not otherwise intercepted.

---

## 10. JSON-LD / Article Metadata Truth

### BlogPost.jsx (Path A — Googlebot/browsers)

Emits two JSON-LD scripts:

1. `BlogPosting` schema with: `@id`, `url`, `mainEntityOfPage`, `headline`, `description`, `image`, `datePublished`, `dateModified`, `inLanguage: "he"`, `author` (Person), `publisher` (Organization with logo)
2. `BreadcrumbList` schema

### GuidePost.jsx (Path A — Googlebot/browsers)

Emits two JSON-LD scripts:

1. `Article` schema with the same enrichment as BlogPost (same fields, mirrors BlogPost pattern)
2. `BreadcrumbList` schema

### SeoHelmet.jsx article meta props (Path A — Googlebot/browsers)

Emits when props are provided:

- `article:published_time`
- `article:modified_time`
- `article:author`

BlogPost.jsx and GuidePost.jsx successful branches pass these props from post DTO fields. notFound/loading/error branches do not pass article meta.

### Backend /og/blog/:slug and /og/guides/:slug (Path B — social bots)

Emits equivalent article meta as HTML meta tags (not JSON-LD):

- `article:published_time`, `article:modified_time`, `article:author`

No private/internal identifiers (no `_id`, `createdByAdminId`, `firstPublishedAt`, `userId`, `email`, `token`, or secrets) emitted in any path.

---

## 11. Soft-404 Noindex Truth

When a blog or guide slug is not found (API returns 404 or post is not published):

- `BlogPost.jsx` and `GuidePost.jsx` render a notFound branch
- notFound branch passes `robots="noindex, nofollow"` to `SeoHelmet`
- `SeoHelmet` emits `<meta name="robots" content="noindex, nofollow" data-rh="true">`
- notFound branch also renders a Hebrew not-found title (e.g., "המאמר לא נמצא")

**Loading/error branches:** intentionally do NOT emit noindex. Rationale: a transient backend error or slow load could cause WRS to see noindex on a valid URL during a retry crawl, creating incorrect deindexation. Noindex is only emitted when the application has definitively determined the content does not exist.

**Runtime-only:** There is no DB persistence of noindex state. If a slug is recreated and the API returns 200, noindex is no longer emitted for that URL.

---

## 12. Image Alt Meta Truth

### Path A (Googlebot/browsers — SeoHelmet.jsx)

- New prop: `imageAlt`
- Emits `og:image:alt` and `twitter:image:alt` when both `image` AND `imageAlt` are truthy
- No empty `content=""` emitted (guarded)

BlogPost.jsx and GuidePost.jsx successful branches pass:

```
imageAlt={post.heroImageAlt || post.title || undefined}
```

`post.heroImageAlt` is `post.heroImage?.alt` from the DTO (admin-authored, not user-controlled). `post.title` is the required post title field.

### Path B (social bots — backend og.routes.js)

Both `/og/blog/:slug` and `/og/guides/:slug` compute:

```
const imageAlt = image
  ? collapseWs(post.heroImage?.alt) || collapseWs(post.title) || ""
  : "";
```

Emitted only when `image` exists. Wrapped in `escapeHtml(imageAlt)`.

**Security note:** `heroImage.alt` is an admin-authored field (max 200 chars, trimmed at schema level). `post.title` is required. Neither field accepts user-controlled arbitrary input in the current admin-only content model.

### Deferred image alt gaps

- `og:image:alt` and `twitter:image:alt` for marketing/listing pages via SeoHelmet: `SEO_IMAGE_ALT_META_MARKETING_P1` (not yet started)
- `imageAlt` in PublicCard.jsx (user-controlled field, requires separate scoped audit): `SEO_PUBLIC_CARD_IMAGE_ALT_META_P2`
- `twitter:image:alt` for `/og/card/:slug` and `/og/c/:orgSlug/:slug`: pre-existing gap, deferred

---

## 13. Cardigo/Digitalyty Anti-Drift Policy

- **Cardigo** is the product brand. `og:site_name`, canonical URLs, and all public-facing meta must use "Cardigo" as the brand name.
- **Digitalyty** is an organization on the Cardigo platform (a paying Cardigo customer/partner). It is not the Cardigo product identity.
- "Digitalyty" must NOT appear in `og:site_name`, `og:title` generic fallbacks, canonical brand descriptions, or public SEO identity unless:
    - Referring specifically to a Digitalyty org card URL (e.g., `/c/digitalyty/...`) where the card belongs to that org
    - Or in anti-drift policy documentation (this section)
- Verification: `Select-String` against new docs for "Digitalyty" matches should be limited to anti-drift sections only.

---

## 14. Deferred Items (Not Closed in This Session)

The following are explicitly deferred. Do not claim them as closed:

**P1 — Highest priority:**

- GSC ownership verification and sitemap.xml submission. Until done, crawl errors and indexing gaps are invisible. No automated crawl monitoring is in place.

**SEO infrastructure gaps (scoped future contours):**

- `SEO_IMAGE_ALT_META_MARKETING_P1`: Add `imageAlt="Cardigo – כרטיס ביקור דיגיטלי לעסקים"` to SeoHelmet call in Home.jsx, Cards.jsx, Pricing.jsx, Contact.jsx, Blog.jsx, Guides.jsx.
- `SEO_PUBLIC_CARD_IMAGE_ALT_META_P2`: PublicCard.jsx imageAlt using card-level business name. Requires scoped audit since card fields are user-controlled.
- `twitter:image:alt` for `/og/card/:slug` and `/og/c/:orgSlug/:slug` in og.routes.js.
- `og:image:secure_url`, `og:image:width`, `og:image:height`, `og:image:type` for blog/guides OG HTML (backend path).

**robots.txt deferred additions:**

- Private/auth/admin/editor/payment/preview route Disallow: deferred until GSC confirms those pages are correctly noindexed/dropped. Adding prematurely could prevent crawling needed for noindex processing.
- `/api/` must remain crawlable at all times (WRS dependency).

**Infrastructure contours:**

- True HTTP 404 for SPA not-found pages: separate infrastructure/hosting contour.
- SSR/prerender/indexability reliability: deferred until GSC data shows WRS rendering problems.
- sitemap index and image sitemap: scale-stage items.
- og-drift CI check script (index.html vs Home.jsx alignment): flagged, not yet implemented.
- Meta `fb:app_id` and Meta app governance: deferred.
- Free-tier card noindex vs OG preview policy decision: deferred product decision.

---

## 15. Operator Smoke Commands (Post-Deploy Verification)

Use these commands after deploying backend and frontend changes:

```powershell
$UA = "facebookexternalhit/1.1"

# Blog OG — social bot path (should return article OG HTML)
curl.exe -s -A $UA "https://cardigo.co.il/blog/post-7a9572f4" | findstr /i "og:type" "og:image:alt" "article:published_time" "twitter:image:alt"

# Guide OG — social bot path
curl.exe -s -A $UA "https://cardigo.co.il/guides/seo" | findstr /i "og:type" "og:image:alt" "article:published_time" "twitter:image:alt"

# Missing blog slug — must return 404
curl.exe -s -o NUL -w "%{http_code}" -A $UA "https://cardigo.co.il/blog/nonexistent-slug-zzz999"

# Card regression — must still return card-specific OG (not broken by blog/guides changes)
curl.exe -s -A $UA "https://cardigo.co.il/card/cardigo" | findstr /i "og:title" "og:image:alt" "og:url"

# Sitemap — must include blog, guides, and card entries with lastmod
curl.exe -s "https://cardigo.co.il/sitemap.xml" | findstr /i "blog" "guides" "lastmod"

# robots.txt — must include both Disallow rules
curl.exe -s "https://cardigo.co.il/robots.txt"
```

**Rendered head verification (browser devtools):**

- Open https://cardigo.co.il/pricing → inspect `<head>` → confirm `og:locale="he_IL"` and `og:site_name="Cardigo"` present.
- Open https://cardigo.co.il/blog/post-7a9572f4 → inspect `<head>` → confirm `og:image:alt` and `article:published_time` present.

**Rich Results Test:**

- https://search.google.com/test/rich-results?url=https%3A%2F%2Fcardigo.co.il%2Fblog%2Fpost-7a9572f4
- Expected: Article + Breadcrumbs detected, no errors.

---

## 16. Out-of-Scope / Do-Not-Change Policy

The following must NOT be casually modified without a dedicated bounded contour and explicit architect review:

- `buildCardOgMetadata` helper in og.routes.js — card OG generation logic, title policy, image priority, anti-generic-title set. Card OG is separate from blog/guides OG.
- Trial 410 guard and membership anti-enumeration 404 gate in `/og/c/:orgSlug/:slug` — security invariants, must not be softened.
- Edge Function UA allowlist in og-preview.js — must not add Googlebot or Bingbot. They must receive the SPA.
- `SeoHelmet.jsx` `og:locale` and `og:site_name` constants — hardcoded "he_IL" and "Cardigo". Do not make configurable or per-page overridable without explicit contour.
- `robots.txt` `/api/` non-Disallow — do not add `Disallow: /api/` without explicit WRS impact analysis. WRS rendering of public pages would break.
- Free-tier card `robots: "noindex"` in cardDTO.js — intentional product decision. Do not remove.

---

## 17. Next Recommended SEO Contours

In recommended priority order:

1. **POST_LAUNCH_SEARCH_CONSOLE_AND_SITEMAP_SUBMISSION_P1** (highest priority)
   Verify GSC ownership (HTML file or DNS method), submit sitemap.xml, confirm first Index Coverage report visible. Until done, all indexing is invisible.

2. **SEO_IMAGE_ALT_META_MARKETING_P1**
   Add `imageAlt="Cardigo – כרטיס ביקור דיגיטלי לעסקים"` to SeoHelmet call in: Home.jsx, Cards.jsx, Pricing.jsx, Contact.jsx, Blog.jsx, Guides.jsx. Static brand-level alt, same value already in index.html line 45. Frontend-only, 6-file change.

3. **SEO_PUBLIC_CARD_IMAGE_ALT_META_P2**
   Add imageAlt to PublicCard.jsx SeoHelmet call using `card.business?.name`. Requires scoped audit: card fields are user-controlled and need escaping / sanitization review. Separate bounded contour.

4. **SEO_BACKEND_CARD_TWITTER_IMAGE_ALT_P2**
   Add `twitter:image:alt` to `/og/card/:slug` and `/og/c/:orgSlug/:slug` handlers in og.routes.js, using the existing `buildCardOgMetadata` image alt logic.

5. **SEO_ROUTE_NOINDEX_HYGIENE_P2**
   Review `/edit/*` and `/admin/*` noindex policy. Low priority; these routes are not in sitemap and likely already blocked by auth redirect.

---

## 18. Files Changed in This Session

**Frontend:**

- `frontend/src/components/seo/SeoHelmet.jsx` — added `imageAlt` prop; emits `og:image:alt` and `twitter:image:alt`; added `og:locale` and `og:site_name` constants; added `articlePublishedTime`, `articleModifiedTime`, `articleAuthor` props
- `frontend/src/pages/BlogPost.jsx` — passes article meta props and `imageAlt` to SeoHelmet in successful branch; notFound branch emits robots noindex; JSON-LD enriched
- `frontend/src/pages/GuidePost.jsx` — mirrors BlogPost.jsx changes
- `frontend/public/robots.txt` — added Disallow: /.netlify/ and Disallow: /og/
- `frontend/netlify/edge-functions/og-preview.js` — added /blog/_ and /guides/_ to intercept path config

**Backend:**

- `backend/src/routes/og.routes.js` — /og/blog/:slug and /og/guides/:slug: added article meta tags and og:image:alt / twitter:image:alt; card routes unchanged
- `backend/src/routes/sitemap.routes.js` — added card lastmod from updatedAt; added static page lastmod="2026-05-03"; org entitlement fix (orgEntitlement loaded for org card filtering)

**No other files modified.** Specifically: models, controllers, auth routes, billing routes, payment routes, og-preview.js UA allowlist behavior, buildCardOgMetadata, cardDTO.js, and all CSS/template/skin files were not changed.
