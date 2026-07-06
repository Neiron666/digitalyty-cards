# Cardigo Enterprise Handoff — Public SEO SSG Migration & previousSlugs Aliases — CLOSED

**Date:** 2026-05-26
**Contour:** PUBLIC_SEO_SSG_MIGRATION_AND_PREVIOUSSLUGS_ALIASES
**Status:** CLOSED.
**Production smoke evidence classification:** PRODUCTION_CONFIRMED_BY_OPERATOR_REPORT (no repo-persisted log files; smoke executed live against https://cardigo.co.il during Phase 3A/3B/3C of the contour).
**Rollback:** Not required.

---

## 1. Executive summary

The public SEO migration milestone is closed. Cardigo's marketing, blog, and guides surfaces now render as true Static Site Generation (SSG) HTML — pre-rendered at build time and published from `dist/` via Netlify static hosting — rather than as a runtime SPA shell hydrated in the browser. The previously-implemented Edge social UA branch and Googlebot CRAWLER branch continue to serve `/card/:slug` and `/c/:orgSlug/:slug`, but are no longer the primary delivery path for the marketing and content routes listed in section 2.

In parallel, the `previousSlugs` → canonical slug alias redirect contour is closed for both blog and guides. Browsers receive a real Netlify HTTP 301 from the old slug to the canonical slug; social UAs receive a backend OG payload whose `og:url` already points to the canonical slug; the sitemap excludes alias source slugs; and a public read-only alias-map endpoint exists for build-time consumption.

**Canary alias pair (operator-reported production proof):**

- from: `post-afa20c3c`
- to: `digital-card-small-business`
- Browser GET `https://cardigo.co.il/blog/post-afa20c3c` → HTTP 301 → `https://cardigo.co.il/blog/digital-card-small-business/` (final 200, canonical and og:url both point to the canonical trailing-slash URL).
- Social UA GET on the same alias source → HTTP 200 OG payload with canonical og:url.
- Sitemap does not contain the alias source.

---

## 2. Scope closed

The following items are CLOSED. Each is proven by source (file:line in the SSoT runbooks and the Phase 1 audit) plus operator-reported production smoke for the live behaviour.

1. SSG for `/`, `/cards/`, `/pricing/`, `/contact/`.
2. Trailing-slash canonical policy for SSG public routes.
3. `/blog/` and `/guides/` listing SSG (build-time public API fetch, FULL/DEGRADED gate, fail-open).
4. Listing initial data island (`cardigo-initial-listing-data`) consumed by `Blog.jsx` / `Guides.jsx`.
5. Accepted slim social crawler variant for `/blog/` and `/guides/` listing pages. This is intentional and is not a defect.
6. `/blog/:slug/` and `/guides/:slug/` detail SSG with eager-imported page components.
7. Detail initial data island (`cardigo-initial-detail-data`) consumed by `BlogPost.jsx` / `GuidePost.jsx`.
8. Static 404 soft-404 remediation: unknown `/blog/:slug/` and `/guides/:slug/` return HTTP 404 from a static `404.html` with `noindex,nofollow`, no canonical, no og:url, no JSON-LD, no data island.
9. `/blog/page/N/` and `/guides/page/N/` pagination SSG where valid; `robots="noindex, follow"` and self canonical.
10. Invalid pagination (out-of-range / non-numeric) routes to the static 404 page via Netlify `_redirects`.
11. Sitemap excludes `/blog/page/` and `/guides/page/` paths.
12. `previousSlugs` alias public endpoints `/api/blog/aliases` and `/api/guides/aliases`.
13. Backend OG alias parity: `/og/blog/:slug` and `/og/guides/:slug` resolve current slug AND `previousSlugs`.
14. Exact-first OG alias resolution: the backend helper tries an exact `slug` match first, then `previousSlugs`.
15. Build-generated `dist/_redirects` alias marker block inserted before the `/blog/*` and `/guides/*` 404 bucket wildcards.
16. Netlify browser 301 from alias source to canonical (verified live against the canary pair).
17. Social UA OG canonicalization: backend `publicUrl` is built from the resolved `post.slug`, not from the request param.
18. Sitemap excludes alias source slugs (only canonical slugs appear).

---

## 3. Architecture decision record

3.1 **SSG-first for marketing, blog, and guides.** Routes listed in section 2 items 1, 3, 6, 9 are pre-rendered into HTML at build time using `renderToString` (React) plus react-helmet-async, written into per-route `index.html` files under `dist/`, and published by Netlify as static files. Hydration still attaches on the client.

3.2 **Edge social UA branch retained where designed.** The Netlify Edge Function `og-preview.js` continues to intercept social UAs (Facebook, WhatsApp, Twitter, LinkedIn, Telegram, Slack, Discord, Pinterest) for `/blog/:slug` and `/guides/:slug` and serve the backend `/og/blog/:slug` / `/og/guides/:slug` payload with canonical `og:url` injected into the shell. This is intentional and out of scope for change.

3.3 **Edge CRAWLER branch still authoritative only for `/card/:slug` and `/c/:orgSlug/:slug`.** Card and org-card public routes are still SPA-shell-delivered with Edge-injected metadata. They are NOT SSG. Their migration is a future contour.

3.4 **`BlogPost` and `GuidePost` must remain eager imports.** `renderToString` cannot resolve `React.lazy` / `Suspense` at build time; lazy-loaded route components emit an empty `#root` into the static HTML and fail the SSG gate. The route table in `frontend/src/app/routes.config.jsx` keeps these components as top-level static imports. Reverting them to `React.lazy()` is a regression.

---

## 4. Netlify / `_redirects` contract

The template `frontend/public/_redirects` is copied into `dist/_redirects` by the build, and the alias marker block is materialized at build time by `frontend/scripts/generate-static.mjs`.

Rule ordering invariants (first-match-wins in Netlify):

1. `/api/*` → backend proxy 200.
2. `/sitemap.xml` → backend proxy 200.
3. `/og/*` → backend proxy 200.
4. `/card/*` → SPA shell 200.
5. `/c/*` → SPA shell 200.
6. **Alias marker block** (`# cardigo-generated-alias-redirects:start` … `:end`) containing one `301` line per alias pair, BOTH with and without trailing slash for each alias source.
7. `/blog/page/*` → `/404.html` 404.
8. `/blog/*` → `/404.html` 404.
9. `/guides/page/*` → `/404.html` 404.
10. `/guides/*` → `/404.html` 404.
11. `/*` → SPA shell 200 (catch-all).

Hard contract:

- The alias marker block MUST appear BEFORE the `/blog/*` and `/guides/*` 404 wildcards. Otherwise the bucket wildcards shadow the alias 301 into a 404.
- No `!` force flag is allowed on alias lines. Force changes the Netlify rule semantics and is forbidden.
- Static-file precedence: a valid pre-rendered `/blog/page/2/index.html` (or `/guides/page/2/index.html`) wins over the `/blog/page/* /404.html 404` rule because Netlify serves the matching static file first. Invalid `/blog/page/N/` (where N is out of range / non-numeric / missing) falls through to the 404 rule.
- Unknown `/blog/:slug/` and `/guides/:slug/` likewise fall through to `/404.html` 404 because no pre-rendered static file exists.
- The template `frontend/public/_redirects` remains the source of truth for the static rule set. The alias marker block is build-materialized only in `dist/_redirects`. Operators MUST NOT hand-edit `dist/_redirects`; it is regenerated on every build.

---

## 5. Data islands contract

Two and only two data island element IDs are used:

- `cardigo-initial-listing-data` — listing seed for `/blog/`, `/guides/`, `/blog/page/N/`, `/guides/page/N/`.
- `cardigo-initial-detail-data` — detail seed for `/blog/:slug/`, `/guides/:slug/`.

Listing DTO whitelist (per item): `id`, `slug`, `title`, `excerpt`, `heroImageUrl`, `heroImageAlt`, `publishedAt`. No additional fields are emitted.

Detail DTO whitelist (per item): 15 public fields only. `sections` are filtered to `{ heading, body, imageUrl, imageAlt }`. `previousSlugs` is NEVER included in either listing or detail island. The alias mapping is only ever exposed via the dedicated public alias endpoints documented in section 10.

Fail-open behaviour: if the build-time fetcher cannot retrieve the listing or detail data (timeout, non-2xx, malformed JSON), it returns `{ ok: false }`. The page still renders with an empty seed; the client effect performs a normal API fetch after hydration. The SSG gate marks the route as DEGRADED but does not abort the build. Detail pages with no detail data emit no JSON-LD and no canonical, treating the route as unknown.

---

## 6. Blog / guides listing SSG

For `/blog/`, `/guides/`, and each valid `/blog/page/N/` and `/guides/page/N/`:

- Build-time fetcher hits the public listing API to load page items + total count.
- A `cardigo-initial-listing-data` script element is injected before `</body>` with `{ key, page, total, items }`.
- The component reads the island via `useInitialListingData(key)`; if the seed matches the current page, the initial render uses it and suppresses the first effect-driven fetch.
- Canonical: page 1 → `https://cardigo.co.il/blog/` (or `/guides/`); page N > 1 → `https://cardigo.co.il/blog/page/N/` (or `/guides/page/N/`).
- Robots: page 1 → indexable; page N > 1 → `noindex, follow`.
- No homepage canonical or og:url leak appears on any listing page (verified by Phase 1 source proof and Phase 3 operator smoke).
- Accepted slim social crawler variant: social UAs on `/blog/` and `/guides/` listings receive a slim shell rather than full SSG; this is the accepted design and is NOT a defect.

---

## 7. Blog / guides detail SSG

For each published `/blog/:slug/` and `/guides/:slug/`:

- Build-time fetcher hits the public detail API to load the post; the whitelisted detail DTO is serialized into the `cardigo-initial-detail-data` island.
- `BlogPost.jsx` / `GuidePost.jsx` read the island via `useInitialDetailData("blog" | "guides")`; if the seed slug matches `useParams().slug`, the initial render uses it and suppresses the first effect-driven fetch.
- Canonical and og:url: `https://cardigo.co.il/blog/${slug}/` and `https://cardigo.co.il/guides/${slug}/` (trailing slash mandatory).
- JSON-LD: two scripts — `BlogPosting` (or `Article`) with `@id` and `url` matching the trailing-slash canonical; `BreadcrumbList` with positions Blog/Guides root → article.
- Eager component imports are mandatory; see ADR 3.4.

---

## 8. Static 404 / soft-404 remediation

- Unknown `/blog/:slug/` and `/guides/:slug/` return a real HTTP 404 served by the static `frontend/public/404.html` via the Netlify `_redirects` 404 buckets.
- The static 404 page contains `<meta name="robots" content="noindex, nofollow" />`, a Hebrew page title, no canonical, no `og:url`, no JSON-LD, and no data island.
- No SPA-shell 200 is returned for unknown blog/guide slugs.

---

## 9. Pagination SEO policy

- Valid `/blog/page/N/` and `/guides/page/N/` are SSG with self canonical and `robots="noindex, follow"`.
- Page count is derived from the build-time public listing API total; only valid pages are pre-rendered.
- Invalid pagination (`/blog/page/0/`, `/blog/page/<N+1>/`, non-numeric) falls through to `/404.html` 404 via `_redirects`.
- The backend `sitemap.xml` excludes all `/blog/page/*` and `/guides/page/*` paths.

---

## 10. previousSlugs / alias redirects

10.1 **Public alias-map endpoints.**

- `GET /api/blog/aliases` — public, read-only, GET-only. No auth, no CSRF, no `X-Requested-With` requirement. `Cache-Control: no-store`. Response body shape: `[{ "from": "<old-slug>", "to": "<canonical-slug>" }, …]`.
- `GET /api/guides/aliases` — mirror.
- Both routes are registered BEFORE the `/:slug` detail route in their respective route files so the literal segment `aliases` is not interpreted as a slug.

    10.2 **Public DTO whitelist.** `previousSlugs` is NEVER present in the per-post public DTO returned by the detail endpoints or seeded into the detail island. The alias relationship is exposed only via the dedicated alias endpoints above.

    10.3 **Backend OG alias parity (exact-first).** The shared helper in the OG router tries `Model.findOne({ slug, status: "published" })` first, then `Model.findOne({ previousSlugs: slug, status: "published" })`. The OG `publicUrl` is built from the resolved `post.slug`, not from `req.params.slug`. Result: a request for `/og/blog/<old-alias>` returns HTTP 200 with `og:url` pointing to the canonical trailing-slash URL.

    10.4 **Current slug wins over `previousSlugs` everywhere.** Sitemap, OG, JSON-LD `@id`, data island `canonicalUrl`, and per-post DTO all use the current slug.

    10.5 **Sitemap exclusion.** Alias source slugs are not selected when building the sitemap. Only the canonical `slug` of each published post is emitted.

    10.6 **Frontend rebuild required to materialize new alias redirects.** Adding, changing, or removing a `previousSlugs` value on a published post does NOT automatically refresh the Netlify alias 301s. A frontend build + deploy must run so the alias marker block in `dist/_redirects` is regenerated from `/api/blog/aliases` and `/api/guides/aliases`. The rebuild-on-publish hook is out of scope and is listed as a tail in section 15.

    10.7 **Canary pair (operator-reported production proof).** See section 1.

---

## 11. Social crawler behavior

Three intentionally distinct paths are preserved:

- **Browser path** (Chrome / Firefox / Safari / Googlebot / Bingbot on marketing, blog, guides): Netlify serves the pre-rendered SSG HTML directly from `dist/`. Alias source URLs receive a Netlify HTTP 301 to the canonical URL.
- **Googlebot / Bingbot on `/card/:slug` and `/c/:orgSlug/:slug`**: the Edge CRAWLER branch still applies (SPA shell with injected route metadata). See the existing runbook sections 2 and 16 for this contour.
- **Social UA path** (Facebook, WhatsApp, Twitter, LinkedIn, Telegram, Slack, Discord, Pinterest): the Edge `og-preview.js` function intercepts `/blog/:slug`, `/guides/:slug`, `/card/:slug`, `/c/:orgSlug/:slug` and serves the backend `/og/...` payload with canonical `og:url`. For alias sources on blog/guides, `og:url` already points to the canonical URL because the backend resolves the alias and emits the resolved slug.

For the accepted slim listing variant: social UAs hitting `/blog/` and `/guides/` listing pages receive a slim shell. This is intentional and is NOT a defect.

---

## 12. Sitemap policy

- `https://cardigo.co.il/sitemap.xml` is served by the backend.
- Includes static marketing routes, `/blog/:slug/` and `/guides/:slug/` (trailing slash) for every published post, and personal + org-owned premium card URLs.
- Excludes drafts, `previousSlugs` alias source slugs, and `/blog/page/*` / `/guides/page/*` paths.

---

## 13. Security / privacy boundaries

- `/api/blog/aliases` and `/api/guides/aliases` are public, read-only, and emit only `{ from, to }` pairs. No private fields, no draft data, no admin metadata.
- `previousSlugs` is never present in the per-post public DTO.
- No new auth surface was widened by this contour. CSRF / `X-Requested-With` contracts remain unchanged for cookie-auth mutation endpoints (the new GET endpoints are read-only and do not require CSRF tokens, matching existing public GET conventions).
- No secrets, tokens, cookies, provider keys, or DB connection strings appear in any new doc, build artifact, or runtime payload introduced by this contour.

---

## 14. Verification gates and production smoke summary

14.1 **Frontend gates (run from `frontend/`):**

- `npm.cmd run check:inline-styles`
- `npm.cmd run check:skins`
- `npm.cmd run check:contract`
- `npm.cmd run build --if-present`
- SSG output gate inside `frontend/scripts/check-ssg-output.mjs` (FULL vs DEGRADED, alias guard, canonical/og:url presence).

    14.2 **Backend sanities (run from `backend/`):**

- `npm.cmd run sanity:imports`
- `npm.cmd run sanity:slug-policy`
- `npm.cmd run sanity:ownership-consistency`
- Org sanities as applicable.

    14.3 **Production smoke matrix (Phase 3A backend, Phase 3B SSG materialization, Phase 3C browser 301).** Classification: **PRODUCTION_CONFIRMED_BY_OPERATOR_REPORT** (no repo-persisted log files). Highlights:

- `/api/blog/aliases` and `/api/guides/aliases` return `200` with `Cache-Control: no-store` and the expected `[{from,to}]` shape (blog: one canary pair; guides: empty array).
- `/og/blog/<canary-alias-source>` returns `200` with canonical `og:url`; unknown OG slugs return `404`.
- Browser GET `/blog/<canary-alias-source>` and `/blog/<canary-alias-source>/` return Netlify `301` → canonical URL across Chrome, Googlebot, Bingbot UAs. Final follow lands at `200` with one redirect.
- Social UA GET on the canary source returns `200` with canonical `og:url` (no redirect; Edge intercept).
- Sitemap contains canonical targets and excludes alias source and pagination paths.
- No rollback required.

---

## 15. Known tails / not closed

These items are NOT closed by this contour and are explicitly OUT OF SCOPE:

- `/card/:slug` deterministic SSG rendering (still SPA-shell + Edge CRAWLER).
- `/c/:orgSlug/:slug` deterministic SSG rendering (still SPA-shell + Edge CRAWLER).
- Rebuild-on-publish hook for content updates and alias-map refresh (does not yet exist).
- Outstanding `npm audit` vulnerabilities (not addressed in this contour).
- Route-handler runtime smoke improvement for backend OG handlers (catch route-handler `ReferenceError` at sanity time via an ephemeral `http.createServer` GET smoke step).
- Possible `previousSlugs` / `getPublishedPost` exact-first ambiguity outside the OG path if still open (not proven remediated in the per-post detail controller path).
- Broader public-card SEO migration (cards and org-cards SSG/SSR).

---

## 16. Operator anti-regression checklist

Reviewers and operators MUST verify the following before merging any change that touches public SEO surfaces, alias endpoints, OG handlers, sitemap, or Netlify configuration:

- Alias marker block in `dist/_redirects` remains BEFORE the `/blog/*` and `/guides/*` 404 wildcards.
- No `!` force flag on any alias line.
- Exact-first OG alias resolution preserved (slug exact match before `previousSlugs` match).
- Current slug wins over `previousSlugs` in OG, sitemap, JSON-LD, data island, and per-post DTO.
- `previousSlugs` not present in the per-post public DTO.
- Sitemap excludes alias source slugs and `/blog/page/*` / `/guides/page/*`.
- Unknown `/blog/:slug/` and `/guides/:slug/` return a real HTTP 404 (not SPA shell 200).
- Valid `/blog/page/N/` and `/guides/page/N/` stay `noindex, follow` with self canonical.
- Social UA path remains intentionally distinct from the browser path; both must keep `og:url` on the canonical URL.
- `BlogPost.jsx` and `GuidePost.jsx` remain eager imports in the route table.
- After backend alias data changes, a frontend rebuild + deploy is required to materialize new browser 301s.
- Trailing slash canonical for `/blog/:slug/`, `/guides/:slug/`, `/blog/page/N/`, `/guides/page/N/`, `/blog/`, `/guides/`, `/`, `/cards/`, `/pricing/`, `/contact/`.
- Listing DTO whitelist (7 fields per item) and detail DTO whitelist (15 fields) preserved.
- `Cache-Control: no-store` preserved on `/api/blog/aliases` and `/api/guides/aliases`.

---

## 17. Cross-references

- `docs/runbooks/seo-public-indexability-runbook.md` — operational SEO runbook; §20 "Public SSG Render Path for Marketing + Blog + Guides - 2026-05 Migration" is the runbook-side authority for this contour.
- `docs/runbooks/docs_blog_seo_og_runbook.md` — blog/guides-specific runbook; §9 "Slug Continuity & Aliases", addendum "### 9.5 2026-05 previousSlugs alias redirects closure", is the runbook-side authority for the alias endpoints.
- Predecessor closure: `docs/handoffs/current/Cardigo_Enterprise_Handoff_SEO_Public_Indexability_Closed_2026-05-05.md` (SPA-shell-era public indexability closure; still STILL_TRUE for its date).
- Slug-lifecycle predecessor: `docs/handoffs/current/Cardigo_Enterprise_NextChat_SSR_Public_SEO_Migration_Handoff_2026-05-25.md`.

---

**END OF HANDOFF.**
