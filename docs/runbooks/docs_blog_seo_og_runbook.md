# Blog & Guides SEO & OG - Runbook (Cardigo)

**Статус:** Production OPEN. Blog and guides SEO/OG, social preview, JSON-LD, article meta, image alt, and sitemap are live and verified on https://cardigo.co.il. Production launch: 2026-05-03.

> For the full public indexability SSoT (all routes, social preview architecture, robots.txt policy, deferred items), see: `docs/runbooks/seo-public-indexability-runbook.md`

---

## 1) Что считается “готово” по блогу

### Public

- `/blog` - листинг опубликованных постов.
- `/blog/:slug` - страница поста (семантическая разметка, секции).
- SEO в `<head>` через `SeoHelmet` (title/description/canonical/OG) + JSON-LD:
    - `BlogPosting`
    - `BreadcrumbList`

### Backend SEO infrastructure

- **OG endpoint:** `GET /og/blog/:slug`
    - `published-only`, draft/missing → `404 Not found` (anti-enumeration)
    - `og:type="article"`, `og:title`, `og:description`, `og:url`
    - `og:image` (conditional on hero image), `og:image:alt` (conditional)
    - `twitter:image` (conditional), `twitter:image:alt` (conditional)
    - `article:published_time`, `article:modified_time`, `article:author`
    - `og:locale` = `"he_IL"` (hardcoded constant, SEO_BACKEND_OG_METADATA_PARITY_P2, production verified 2026-05-23)
    - `og:site_name` = `"Cardigo"` (hardcoded constant)
    - `meta refresh` redirect на canonical: `https://cardigo.co.il/blog/:slug`
- **OG endpoint:** `GET /og/guides/:slug`
    - Same tag inventory as `/og/blog/:slug` (including `og:locale` and `og:site_name`). Canonical redirect to `/guides/:slug`.
- **Sitemap:** `GET /sitemap.xml`
    - включает blog и guide URLs для `published`, с `<lastmod>` из `updatedAt`
    - включает card URLs (personal + org-owned premium) с `<lastmod>` из `updatedAt`
    - static paths include stable `<lastmod>` baseline
    - без N+1 (single query для blog posts)

---

## 2) Статус продакшена

> **Pre-production historical note (до 2026-05-03):** Before production launch, a Netlify proxy gate (the `cardigo-proxy` header guard) blocked all public crawlers. That gate was fully removed at production launch on 2026-05-03.

Current production truth (2026-05-03 — present):

- `https://cardigo.co.il/sitemap.xml` — HTTP 200, publicly served.
- `https://cardigo.co.il/og/blog/:slug` — HTTP 200 for published slugs; 404 for missing.
- `https://cardigo.co.il/og/guides/:slug` — HTTP 200 for published slugs; 404 for missing.
- `https://cardigo.co.il/api/blog?...` — HTTP 200. `/api/*` is intentionally NOT disallowed in robots.txt because Google WRS depends on it for SPA rendering.
- `https://cardigo.co.il/robots.txt` — publicly served; see `docs/runbooks/seo-public-indexability-runbook.md` for current Disallow policy.

---

## 3) Локальная проверка (dev / staging)

### 3.1 Backend sanity

Из `backend/`:

```powershell
npm.cmd run sanity:imports
npm.cmd run sanity:slug-policy
```

Ожидаемо: оба `EXIT:0`.

### 3.2 Curl smoke (PowerShell)

```powershell
$base = "http://localhost:5000"

# Sitemap (должен быть 200 + XML)
curl.exe -i "$base/sitemap.xml"

# OG для published поста (подставь реальный slug)
curl.exe -i "$base/og/blog/7"

# OG для несуществующего slug (должно быть 404 Not found)
curl.exe -i "$base/og/blog/nonexistent-slug-zzz"
```

**Что проверяем в OG HTML**:

- `og:type` = `article`
- `og:title`, `og:description`, `og:url` присутствуют
- `og:image` присутствует только если есть hero image (иначе отсутствует)
- `og:image:alt` присутствует только если есть hero image (значение из `heroImage.alt` или `title`)
- `twitter:title`, `twitter:description`, `twitter:image` валидные, **single-line** `content="..."`
- `twitter:image:alt` присутствует только если есть hero image
- `article:published_time`, `article:modified_time`, `article:author` присутствуют
- `og:locale` = `"he_IL"` присутствует (одна копия, без дублей)
- `og:site_name` = `"Cardigo"` присутствует
- `refresh` redirect на `https://cardigo.co.il/blog/<slug>`

---

## 4) Production smoke checklist

> **Pre-production historical note:** This section formerly described a gateway bypass approach for opening the site. The gate was fully removed on 2026-05-03 (see §2). Sections 4.2 and 4.3 now serve as ongoing production smoke and GSC checklist.

### 4.1 (Archived — gate approach)

The `CARDIGO_GATE_PUBLIC_BYPASS=1` feature-flag bypass approach was not used. The gate was removed directly at launch. This subsection is preserved as historical reference only.

### 4.2 Production smoke (blog and guides)

Verify blog/guides OG with social bot UA:

```powershell
$UA = "facebookexternalhit/1.1"
curl.exe -s -A $UA "https://cardigo.co.il/blog/post-7a9572f4" | findstr /i "og:type" "og:image:alt" "article:published_time"
curl.exe -s -A $UA "https://cardigo.co.il/guides/seo" | findstr /i "og:type" "og:image:alt" "article:published_time"
```

Expected: `og:type` = `article`, `og:image:alt` and `article:published_time` present.

Verify missing slug returns 404:

```powershell
curl.exe -s -o NUL -w "%{http_code}" -A $UA "https://cardigo.co.il/blog/nonexistent-slug-zzz999"
```

Expected: `404`.

Verify sitemap has blog, guides, and card entries with lastmod:

```powershell
curl.exe -s "https://cardigo.co.il/sitemap.xml" | findstr /i "blog" "guides" "lastmod"
```

Expected: blog and guide URLs present with `<lastmod>` values; card URLs present with `<lastmod>` values.

### 4.3 Search Console and Rich Results

- Submit `https://cardigo.co.il/sitemap.xml` in Google Search Console (GSC). **DEFERRED — not yet done (P1 tail).**
- Rich Results Test for `/blog/:slug` (BlogPosting JSON-LD): **VERIFIED** — Article + Breadcrumbs detected, no errors.
- Rich Results Test for `/guides/:slug` (Article JSON-LD): **VERIFIED** — Article + Breadcrumbs detected.
- After GSC setup: monitor Index Coverage report for blog and guides pages.

---

## 5) DoD "SEO activation" — COMPLETE (2026-05-03)

All DoD items were satisfied at production launch on 2026-05-03:

- ✓ `sitemap.xml` publicly accessible; contains published blog and guide URLs with `<lastmod>`.
- ✓ `/og/blog/:slug` and `/og/guides/:slug` publicly accessible with full OG/Twitter/article meta.
- ✓ `/api/blog` and `/api/guides` publicly accessible (intentionally kept crawlable for Google WRS).
- ✓ Admin/write API endpoints remain protected (authentication required, independent of gate).

---

## 6) Public Surfaces & Rendering

### Blog listing

- `/blog` - premium public page. Displays published posts with thumbnails, excerpt, and author. Publication dates are intentionally not shown in the visible UI while the evergreen content display policy is disabled.
- Footer site-shell includes a persistent `/blog` link for discoverability.

### Blog post page

- `/blog/:slug` - single post page with semantic HTML, `SeoHelmet`, JSON-LD (`BlogPosting`, `BreadcrumbList`).
- Page-level light background wrapper prevents body background bleed on the post page.
- Hero / cover image renders from the post's `heroImage`. If no hero is set, a default fallback placeholder is shown (defined in `blog.js` config constants).

### Related posts

- Related-posts block (V1) appears below the post body.
- Currently shows the most recent published posts (excluding the current post).
- Mobile-responsive; scroll-based on narrow viewports.

### Author bio

- Author bio block renders below the post body when `authorName` is present.
- Includes author image (optional), name, and short bio text.

### Guides public surfaces

The guides section mirrors the blog structure:

- `/guides` — listing of published guides.
- `/guides/:slug` — single guide page with `SeoHelmet`, JSON-LD (`Article`, `BreadcrumbList`), hero image, and article meta.
- `GET /og/guides/:slug` — backend OG endpoint for social preview bots. Same tag inventory as `/og/blog/:slug`.
- `GuidePost.jsx` mirrors `BlogPost.jsx`: passes article meta props, `imageAlt`, and emits soft-404 noindex for missing slugs.

### Content Display Policy (blog/guides visible dates)

**SSoT:** `frontend/src/utils/contentDisplayPolicy.js`

**Contour: CONTENT_VISIBLE_PUBLISHED_DATE_HIDE_POLICY_SSoT — CLOSED / PASS (2026-05-14)**

`CONTENT_DISPLAY_POLICY.showPublishedDates = false` — visible publication `<time>` elements are not rendered in Blog/Guides list cards or detail page headers.

- **Blog/Guides list cards:** no visible date rendered.
- **Blog/Guide detail page header:** no visible date rendered.
- **Reversibility:** `formatDate` helpers and CSS classes (`.cardDate` in Blog/Guides listing, `.date` in BlogPost/GuidePost) are preserved. Setting `showPublishedDates: true` restores visible dates with no backend, sitemap, or SEO changes required.
- **SEO invariant:** `datePublished` / `dateModified` in JSON-LD and `articlePublishedTime` / `articleModifiedTime` in `SeoHelmet` remain active and are independent of this flag.
- **Backend/sitemap invariant:** backend `publishedAt` field is untouched; sitemap `<lastmod>` uses `updatedAt` and was not changed.
- **Env invariant:** no `.env`, `VITE_*`, Netlify, or Render env var is required. This is source-controlled frontend display policy only.

---

## 7) Discoverability / SEO / IA

### URL-driven archive pagination

- `/blog/page/:pageNum` - paginated archive pages.
- Invalid or out-of-range page numbers (< 1, > totalPages, non-numeric) are normalized: redirect to `/blog` (page 1) or `/blog/page/<totalPages>` respectively.

### FAQPage JSON-LD conditional emission on archive pages

**Contour: SCHEMA_BLOG_GUIDES_PAGINATION_FAQ_SCHEMA_P1 — CLOSED / PASS (2026-05-07)**

`Blog.jsx` and `Guides.jsx` emit the archive FAQPage JSON-LD block conditionally based on `effectivePage`:

- `effectivePage <= 1` (i.e. `/blog` and `/guides` base routes): FAQPage JSON-LD **is emitted**.
- `effectivePage > 1` (i.e. `/blog/page/2+` and `/guides/page/2+`): `jsonLdItems=[]` is passed to SeoHelmet and **no FAQPage JSON-LD is emitted**.

This prevents a schema/canonical mismatch where FAQPage `@id` and `url` pointed to `/blog` (the base route) while the page canonical was `/blog/page/N`.

Unchanged by this contour:

- `buildBlogFaqJsonLd()` and `buildGuidesFaqJsonLd()` functions.
- FAQ `@id` values (`${ORIGIN}/blog#faq`, `${ORIGIN}/guides#faq`).
- FAQ `url` values (`${ORIGIN}/blog`, `${ORIGIN}/guides`).
- canonicalUrl logic, title, description, url, image, imageAlt props.
- Visible FAQ UI rendered on the page.
- SeoHelmet, router, sitemap, OG routes, og-preview.js edge function.

### Sitemap

- `GET /sitemap.xml` includes all `published` blog post and guide post URLs with `<lastmod>` from `updatedAt`.
- Card URLs (personal and org-owned premium) also include `<lastmod>` from `updatedAt`.
- Static marketing pages include a stable `<lastmod>` date baseline (2026-05-03).
- Only posts with `status: "published"` appear. Drafts and alias slugs are excluded.

### OG endpoint

- `GET /og/blog/:slug` — resolves only the **current canonical slug** (not aliases). Published-only; draft/missing → `404 Not found`.
- `GET /og/guides/:slug` — same policy as blog. Published-only; draft/missing → `404 Not found`.
- Both endpoints emit `article:published_time`, `article:modified_time`, `article:author`, `og:image:alt`, `twitter:image:alt` (last two conditional on hero image).
- Social preview bots reach these endpoints via Netlify Edge Function (og-preview.js) intercepting `/blog/*` and `/guides/*` UA-selectively.

### Analytics

- `/blog` listing and `/blog/:slug` post pages both call `trackSitePageView` once on mount.
- Coverage tracked in `docs/site-analytics-coverage-map.md`.

### Current posture

- SEO/OG endpoints are live and publicly accessible (gate removed 2026-05-03, see §2).
- Footer `/blog` and `/guides` links ensure crawlers discover content via internal linking.

---

## 8) Content Model / Editor

### Section illustration images (V1)

- Each blog section supports one optional illustration image.
- Admin can upload, replace, or remove a section image via the blog editor.
- When a post is deleted, all associated section images are cleaned up from storage.
- Section images are **body-only presentation** - they do NOT affect OG meta, JSON-LD, or sitemap output.

### V1 boundaries

- One image per section (no galleries, no multi-image).
- No caption field, no placement/alignment enum.
- Image storage: Supabase, same pipeline as other uploads.

### Schema reference

- Model SSoT: `backend/src/models/BlogPost.model.js`
- Config constants (limits, fallbacks): `backend/src/config/blog.js`
- Bounded arrays: `BLOG_SECTIONS_MAX`, `BLOG_PREVIOUS_SLUGS_MAX` - enforced at schema level.

---

## 9) Slug Continuity & Aliases

### Mechanism

- `previousSlugs[]` - bounded array (max `BLOG_PREVIOUS_SLUGS_MAX`) storing old slugs after a rename.
- `firstPublishedAt` - set once on first publish. Alias preservation activates only **after** a post has been published at least once.
- When a published post's slug is changed, the old slug is pushed to `previousSlugs`.
- Drafts that have never been published: slug changes do NOT accumulate aliases.

### Public resolution

- Public endpoint resolves a post by `slug` OR any entry in `previousSlugs` (via `$or` query).
- If resolved via an alias (old slug), the response includes the current canonical slug.
- Frontend performs `navigate("/blog/<canonicalSlug>", { replace: true })` - transparent redirect, no flash.

### Canonical truth

- Only the **current slug** is canonical for SEO purposes.
- Sitemap includes only current slugs (aliases are excluded).
- OG endpoint resolves only the current slug.

### Uniqueness

- Slug uniqueness is enforced across current slugs AND `previousSlugs` combined (admin controller checks both via `$or` before accepting a new slug).
- DB-level: `slug_1` unique index on the collection.

### 9.5 2026-05 previousSlugs alias redirects closure

**Contour:** PUBLIC_SEO_SSG_MIGRATION_AND_PREVIOUSSLUGS_ALIASES - CLOSED (2026-05-26).
**Production smoke classification:** PRODUCTION_CONFIRMED_BY_OPERATOR_REPORT.

This addendum extends the §9 alias mechanism above with the SSG-era public alias endpoints, frontend build-time alias materialization, browser 301 path, and operator constraints introduced in the 2026-05 public SEO SSG migration.

#### 9.5.1 Public read-only alias endpoints

- `GET /api/blog/aliases` - public, read-only, GET-only. No auth, no CSRF, no `X-Requested-With` requirement. `Cache-Control: no-store`. Response body shape: `[{ "from": "<old-slug>", "to": "<canonical-slug>" }, ...]`.
- `GET /api/guides/aliases` - mirror.
- Both routes are registered BEFORE the `/:slug` detail route so the literal segment `aliases` is not interpreted as a slug.

#### 9.5.2 Public DTO boundary

`previousSlugs` is NEVER returned in the per-post public detail DTO (`/api/blog/:slug`, `/api/guides/:slug`) and is NEVER serialized into the SSG detail data island. The alias relationship is exposed only via the alias endpoints in 9.5.1, and only as `{from,to}` pairs - no draft data, no admin metadata, no private fields.

#### 9.5.3 Backend OG alias parity (exact-first)

The shared helper used by `/og/blog/:slug` and `/og/guides/:slug` performs:

1. `Model.findOne({ slug, status: "published" })` (exact-first, current slug wins).
2. If no match: `Model.findOne({ previousSlugs: slug, status: "published" })`.

The OG `publicUrl` is built from the resolved `post.slug`, not from `req.params.slug`. A request to `/og/blog/<old-alias>` returns HTTP 200 with `og:url` pointing to the canonical trailing-slash URL (`https://cardigo.co.il/blog/<canonical-slug>/`). Reversed resolution order (`previousSlugs` first) is a regression and is forbidden. Note: the OG endpoint section earlier in this runbook describes the pre-2026-05 behavior where OG resolved only the current canonical slug; this addendum is the current authority.

#### 9.5.4 Frontend SSG build-time consumption

`frontend/scripts/lib/fetchAliasMapForSsg.mjs` fetches the two endpoints at build time, validates slugs, rejects reserved segments (e.g. `page`, `aliases`), deduplicates, and drops ambiguous mappings. `frontend/scripts/generate-static.mjs` emits a `301` line into `dist/_redirects` for each accepted pair, both with and without trailing slash on the source. The marker block is `# cardigo-generated-alias-redirects:start` ... `:end` and MUST precede the `/blog/*` and `/guides/*` 404 wildcards in `_redirects`.

#### 9.5.5 Browser path vs social UA path

- Browser GET on the alias source: Netlify HTTP 301 -> canonical trailing-slash URL. Verified across Chrome, Googlebot, Bingbot UAs.
- Social UA GET on the alias source: Edge `og-preview.js` intercepts and serves the backend OG payload with canonical `og:url`; no browser 301 (Edge intercept upstream).

Both paths keep `og:url` pointing to the canonical resolved slug. The two paths are intentionally distinct.

#### 9.5.6 Sitemap exclusion

The backend `sitemap.xml` does not include alias source slugs. Only the canonical `slug` of each published post is emitted. This restates and is consistent with the §9 "Canonical truth" rule above.

#### 9.5.7 Operator constraint - rebuild required after alias data change

Adding, changing, or removing a `previousSlugs` value on a published post does NOT automatically refresh the Netlify alias 301 lines. A frontend build + deploy must run so that `dist/_redirects` is regenerated from `/api/blog/aliases` and `/api/guides/aliases`. Until that build is deployed, the browser path will not 301 from the new alias source. The rebuild-on-publish hook is a known tail and is not closed by this contour.

#### 9.5.8 Canary pair (operator-reported production proof)

- from: `post-afa20c3c`
- to: `digital-card-small-business`
- Browser GET `https://cardigo.co.il/blog/post-afa20c3c` and `https://cardigo.co.il/blog/post-afa20c3c/` -> Netlify 301 -> `https://cardigo.co.il/blog/digital-card-small-business/`, final 200 with canonical and og:url both pointing to the canonical URL.
- Social UA GET on the same source -> 200 with canonical `og:url`.
- Sitemap does not contain the alias source.

Evidence classification is PRODUCTION_CONFIRMED_BY_OPERATOR_REPORT (no repo-persisted log files).

#### 9.5.9 Cross-references

- Contour handoff: `docs/handoffs/current/Cardigo_Enterprise_Handoff_2026-05-26_Public_SEO_SSG_Migration_And_PreviousSlugs_Aliases_Closed.md`.
- Operational runbook authoritative section: `docs/runbooks/seo-public-indexability-runbook.md` -> "## 20. Public SSG Render Path for Marketing + Blog + Guides - 2026-05 Migration".

---

## 10) Index Governance & Migration

### Expected live indexes (collection: `blogposts`)

| Index name                | Key                              | Properties                     |
| ------------------------- | -------------------------------- | ------------------------------ |
| `_id_`                    | `{ _id: 1 }`                     | default                        |
| `slug_1`                  | `{ slug: 1 }`                    | **unique**                     |
| `status_1_publishedAt_-1` | `{ status: 1, publishedAt: -1 }` | compound, public listing query |
| `previousSlugs_1`         | `{ previousSlugs: 1 }`           | multikey, alias resolution     |

### Migration script

- **Script:** `backend/scripts/migrate-blogpost-indexes.mjs`
- **npm command:** `npm run migrate:blogpost-indexes`
- **Dry-run** (default, read-only): reports which indexes exist, which are missing, exits cleanly.
- **Apply:** `npm run migrate:blogpost-indexes -- --apply`
    - Creates missing indexes.
    - Includes `checkDuplicateSlugs()` safety: blocks `slug_1` unique index creation if duplicate slugs are found.
- **Idempotent:** re-running reports "already exists - no-op" for each index.

### Discipline

- `autoIndex` / `autoCreate` are OFF at runtime (project-wide governance).
- Indexes are created only via the migration script with explicit `--apply`.
- Do NOT run `--apply` in CI.
- DoD after apply: re-run dry-run and confirm all indexes report "already exists".
