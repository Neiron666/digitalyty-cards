# Cardigo Enterprise Handoff — Blog/Guide Admin Markdown Links & SSG Freshness — CLOSED

**Contour:** BLOG_GUIDE_ADMIN_MARKDOWN_LINK_PARITY
**Status:** CLOSED / PASS
**Date:** 2026-05-28
**Primary domain:** https://cardigo.co.il

---

## 1. Executive Status

- **Contour:** BLOG_GUIDE_ADMIN_MARKDOWN_LINK_PARITY — CLOSED / PASS
- **Production smoke:** PASS
- **SSG redeploy smoke:** SSG_REDEPLOY_REFRESH_PASS — after Netlify frontend SSG rebuild/redeploy, raw articleExcerpt and cardExcerpt in production HTML contain the expected anchor elements.
- **Rollback:** NOT required.
- **Backend changed:** NO — no backend source files were modified.
- **package.json changed:** NO.
- **DB writes / migrations:** NONE.
- **Sitemap / canonical / Edge function changed:** NO.
- **Frontend gates:** check:inline-styles PASS, check:skins PASS, check:contract PASS, build PASS (EXIT 0).

---

## 2. Behavior Contract

### 2.1 Excerpt / תקציר — now supports markdown-style links

Admin-authored markdown-style links of the form `[anchor text](url)` in the excerpt / תקציר field of Blog and Guide posts now render as safe clickable `<a>` elements in the visible DOM.

This applies to all four excerpt surfaces:

- Blog listing card excerpt (`/blog/` and `/blog/page/N/`)
- Blog detail article excerpt (`/blog/:slug/`)
- Guides listing card excerpt (`/guides/` and `/guides/page/N/`)
- Guide detail article excerpt (`/guides/:slug/`)

### 2.2 Section body / קטעי תוכן — preserved

Section body support for markdown-style links was already present before this contour and remains unchanged. `textToParagraphs` splits body text into paragraphs; each paragraph passes through `renderLinkedText`. This behavior is preserved without regression.

### 2.3 Shared frontend SSoT

All Blog/Guide visible linked-text rendering is owned by a single shared utility:

`frontend/src/utils/safeLinkedText.jsx`

This file is the SSoT for:

- Markdown link parsing and rendering (`renderLinkedText`)
- Paragraph splitting (`textToParagraphs`)
- Markdown-to-plain-text stripping (`markdownLinksToPlainText`)
- URL validation and scheme allowlist (`validateLinkUrl`)

No Blog or Guide page component contains its own inline link-rendering logic. All call the shared utility.

### 2.4 Rendering rules

- **Visible content:** uses `renderLinkedText`. Produces React elements with `<a>` anchors.
- **Paragraph-split content:** uses `textToParagraphs(text).map(para => renderLinkedText(para))`.
- **No `dangerouslySetInnerHTML`:** zero usage in this utility or in the Blog/Guide pages.
- **No raw HTML rendering.**
- **No external markdown parser dependency** was added to `package.json`.

### 2.5 Link type policy

| Link type                                                                                    | Rendered as         | Target      | Rel                   |
| -------------------------------------------------------------------------------------------- | ------------------- | ----------- | --------------------- |
| Internal relative path (`/...`)                                                              | `<a href="...">`    | no `target` | no `rel`              |
| External `http:` / `https:`                                                                  | `<a href="...">`    | `_blank`    | `noopener noreferrer` |
| Bare https:// URL in text                                                                    | `<a href="...">`    | `_blank`    | `noopener noreferrer` |
| Unsafe scheme (`javascript:`, `data:`, `vbscript:`, `blob:`, `file:`, `//evil.com`, unknown) | plain text fallback | —           | —                     |
| Malformed / unparseable URL                                                                  | plain text fallback | —           | —                     |

Unsafe scheme rejection applies at both the Pass 1 (link-text extraction) stage and the Pass 2 (bare URL) stage in `renderLinkedText`. A disallowed URL is never emitted as an `href`.

### 2.6 Nested anchor safety

The Blog.jsx and Guides.jsx listing card DOM structure was audited as part of this contour (Phase 2R2). The listing card root element is `<article>`, not `<a>`, `<Link>`, or `<NavLink>`. The excerpt `<p>` and the CTA Link are siblings inside `<div className={styles.cardBody}>`, not nested. No nested-anchor risk exists.

---

## 3. SEO / Meta Contract

### 3.1 Visible content may contain anchors

The visible Blog/Guide excerpt and section body can contain `<a>` anchor elements in the rendered DOM. This is correct, expected, and SEO-safe for visible content.

### 3.2 Meta and JSON-LD must remain plain text

All of the following must remain plain text with no markdown syntax and no `<a>` tags:

- `<meta name="description">` content
- `<meta property="og:description">` content
- `<meta name="twitter:description">` content
- `BlogPosting` / `Article` JSON-LD `"description"` field value

### 3.3 markdownLinksToPlainText

`markdownLinksToPlainText(text)` is the utility function that strips `[anchor text](url)` markdown syntax to `anchor text` only. It is called at every meta/JSON-LD emission point:

- `BlogPost.jsx` — JSON-LD `BlogPosting` description: `markdownLinksToPlainText(post.seo?.description || post.excerpt || "")`
- `BlogPost.jsx` — `SeoHelmet` description prop: `markdownLinksToPlainText(...)`
- `GuidePost.jsx` — JSON-LD `Article` description: same pattern
- `GuidePost.jsx` — `SeoHelmet` description prop: same pattern

No `<a>` tags and no `](` artifacts appear in any `content=` attribute or in JSON-LD string values.

### 3.4 Raw markdown in data island is acceptable

The `cardigo-initial-detail-data` JSON island serialized into the SSG HTML may contain raw markdown in the `excerpt` field (e.g. `[כרטיס ביקור דיגיטלי](/)`). This is source data consumed by the React component — it is not rendered to meta or emitted to social preview tags. The component applies `markdownLinksToPlainText` for meta output and `renderLinkedText` for visible DOM rendering. Raw markdown in the island is correct and expected behavior.

### 3.5 Production verification

Phase 3B raw HTML SEO proof confirmed on production:

- `META_HAS_MD:False` — no raw markdown `](` in any meta `content=` attribute
- `META_HAS_ANCHOR_TAG:False` — no `<a` tags in any meta `content=` attribute
- `LD_HAS_MD:False` — no raw markdown in JSON-LD string values
- `LD_HAS_ANCHOR_TAG:False` — no `<a` tags in JSON-LD values

---

## 4. Production Proof

**Fixture:** https://cardigo.co.il/blog/blog-digital-business-card-whatsapp/

**Admin-authored excerpt fixture:** included `[כרטיס ביקור דיגיטלי](/)` as a markdown link mid-sentence in the excerpt field.

**Post-redeploy results (after Netlify "Clear cache and deploy site", 2026-05-28):**

1. Raw detail page (`/blog/blog-digital-business-card-whatsapp/`) — articleExcerpt DOM element:
    - Contains: `<a href="/">כרטיס ביקור דיגיטלי</a>`
    - `AE_HAS_MD:False` — no raw `](` artifact
    - `AE_HAS_ANCHOR:True` — anchor present as expected
    - `AE_UNSAFE_HREF:False` — href value is `/` (safe internal)

2. Raw listing page (`/blog/`) — cardExcerpt DOM element for the same post:
    - Contains: `<a href="/">כרטיס ביקור דיגיטלי</a>`
    - `CE_HAS_MD:False`
    - `CE_HAS_ANCHOR:True`

3. JSON-LD `dateModified`: `"2026-05-28T06:45:27.818Z"` — confirms fresh SSG build.

4. Listing HTML size grew from 51737 bytes (pre-redeploy) to 52029 bytes (post-redeploy) — consistent with anchor HTML replacing plain text in the excerpt.

5. All meta content attributes: plain Hebrew text, no `](` artifacts, no `<a` tags.

6. No unsafe `href` scheme in any visible anchor.

7. No nested anchor risk (see 2.6).

8. **Rollback:** NOT required.

---

## 5. Operational SSG Freshness Truth

This section documents the operationally discovered behavior of admin content edits and SSG freshness. It is authoritative. Do not modify without a contour.

### 5.1 API updates immediately

When an admin saves a blog or guide post, the backend API (`/api/blog/:slug`, `/api/guides/:slug`) reflects the updated content immediately — on the next request after the save.

### 5.2 SSG HTML and JSON island update only after rebuild

The raw SSG HTML for each detail page (`dist/blog/slug/index.html`) and the `cardigo-initial-detail-data` JSON island embedded in it contain the API data from the most recent Netlify frontend build. They do NOT update automatically when admin saves a post.

### 5.3 Direct-load path may show stale content

When a browser fetches a blog/guide detail URL directly (first visit, no prior SPA navigation), it receives the SSG HTML. The React component reads the `cardigo-initial-detail-data` JSON island and, because the slug matches, sets `skipFirstFetchRef` to skip the initial API fetch. The rendered page uses the stale island data.

This means: **a visitor who direct-loads a detail URL may see the pre-edit version of the excerpt until a frontend SSG rebuild is deployed.**

### 5.4 SPA navigation path may show fresh content earlier

When a visitor navigates to a detail URL via an in-app link (SPA navigation), the island slug does not match the target URL, so the component performs a live `/api/blog/:slug` fetch and shows the fresh API content. This path reflects admin edits immediately without a rebuild.

### 5.5 SEO impact

Raw SSG HTML is what Googlebot sees on direct crawl. Admin edits to SEO-sensitive fields (excerpt, title, section body) require a frontend SSG rebuild and redeploy to be reflected in:

- Raw HTML served to Googlebot and bingbot
- The `cardigo-initial-detail-data` JSON island
- Direct-load browser experience

### 5.6 Current operator action (manual)

After an important admin blog/guide content edit that must be reflected in raw HTML immediately:

1. Go to Netlify → Deploys
2. Click "Trigger deploy" → "Clear cache and deploy site"
3. Wait for build to complete
4. Verify the updated content in the raw SSG HTML

**Do NOT claim this freshness gap is automatically resolved.** No auto-build hook exists. No background revalidation fetch exists. No admin warning UI exists as of 2026-05-28.

---

## 6. Deferred Tails

### BLOG_GUIDE_SSG_CONTENT_FRESHNESS_AFTER_ADMIN_UPDATE_P2_DECISION

**Status:** DEFERRED — no choice made in this contour.

**Description:** When admin saves a blog/guide post, the backend API updates immediately but the raw SSG HTML and `cardigo-initial-detail-data` JSON island remain at build-time snapshot values. Direct-load visitors and Googlebot may see stale content until the next SSG rebuild.

**Possible future approaches (not yet decided, not yet implemented):**

- Background revalidation fetch: on direct-load, after the island seed is applied, the component performs a background API fetch and rehydrates with fresh data if the content has changed.
- Netlify auto-build hook: the admin save endpoint (`PUT /api/admin/blog/:id`) triggers a Netlify deploy webhook, causing a frontend rebuild automatically within minutes after each admin save.
- Admin/operator freshness warning: the blog/guide admin editor displays a warning after saving that a frontend rebuild is required before changes appear in raw SSG HTML and Googlebot-facing pages.

**What was NOT done in this contour:**

- No auto-build hook was implemented.
- No background revalidation was implemented.
- No admin warning was implemented.
- No source code changes to handle freshness were made beyond what the Phase 2 implementation required.

---

## 7. Verification Summary

### Phase 1 — Read-Only Audit

Root cause: Blog/Guide excerpt (`תקציר`) was rendered as plain text while section body (`קטעי תוכן`) already used `renderLinkedText`. Admin-authored markdown links in the excerpt field were not rendered as clickable anchors. Gap was confirmed by source audit (`BlogPost.jsx` / `GuidePost.jsx` — no `renderLinkedText` call on excerpt).

### Phase 2 — Implementation

Files created / edited:

- `frontend/src/utils/safeLinkedText.jsx` — CREATED (shared utility)
- `frontend/src/pages/BlogPost.jsx` — EDITED (import + renderLinkedText on excerpt, markdownLinksToPlainText on meta/JSON-LD)
- `frontend/src/pages/GuidePost.jsx` — EDITED (mirror of BlogPost.jsx)
- `frontend/src/pages/Blog.jsx` — EDITED (import + renderLinkedText on listing card excerpt)
- `frontend/src/pages/Guides.jsx` — EDITED (mirror of Blog.jsx)

Frontend gates (all PASS, EXIT 0):

- `npm.cmd run check:inline-styles` — PASS
- `npm.cmd run check:skins` — PASS
- `npm.cmd run check:contract` — PASS
- `npm.cmd run build` — PASS

### Phase 2R — Source Proof

Exact file:line proof confirmed for:

- `ORIGIN` constant and `CANONICAL_ORIGIN` computation in `safeLinkedText.jsx`
- `MD_LINK_RE`, `BARE_URL_RE`, `TRAILING_PUNCT_RE` regex definitions
- `validateLinkUrl` scheme allowlist and rejection logic
- `renderLinkedText` external/internal branch
- `markdownLinksToPlainText` stripping
- All four callsites in `BlogPost.jsx` and `GuidePost.jsx`
- Listing callsites in `Blog.jsx` and `Guides.jsx`

### Phase 2R2 — Nested Anchor Audit

Verdict: **SAFE_NO_NESTED_ANCHOR**

The Blog.jsx and Guides.jsx listing card DOM root is `<article>` (not `<a>`, `<Link>`, or `<NavLink>`). The excerpt `<p>` element and the CTA `<Link>` element are siblings inside `<div className={styles.cardBody}>`. No anchor nesting risk.

### Phase 3 — Visible Production Smoke

Verdict: **SMOKE_PASS**

Confirmed via `fetch_webpage` on production: the Blog listing page for `free-digital-business-card` rendered a live clickable anchor for the internal link in the excerpt. Visual rendering confirmed.

### Phase 3B — Raw HTML SEO Proof

Verdict: **PRODUCTION_RAW_HTML_SEO_PROOF_PASS**

Two fixtures verified by raw `curl.exe` against production HTML:

- `https://cardigo.co.il/blog/free-digital-business-card/`
- `https://cardigo.co.il/guides/seo/`

All meta content= attributes: plain text, no `](` artifacts, no `<a` tags.
All JSON-LD string values: plain text, no markdown, no anchor tags.

### Phase 3C — Admin Fixture Smoke + SSG Staleness Discovery

Initial attempt: `https://cardigo.co.il/blog/blog-digital-business-card-whatsapp/`

Phase 1 of Phase 3C: admin had saved an excerpt with `[כרטיס ביקור דיגיטלי](/)` markdown. API returned fresh excerpt with markdown. Raw SSG HTML returned stale plain-text excerpt. Classification: **API_UPDATED_SSG_STALE**.

Root cause confirmed: SSG detail pages and the `cardigo-initial-detail-data` island are frozen at build time. Direct-load path uses stale island data. SPA-navigation path sees fresh API. The SSG freshness window is documented in Section 5 of this handoff.

After operator triggered Netlify "Clear cache and deploy site":

Post-redeploy verdict: **SSG_REDEPLOY_REFRESH_PASS**

- Raw `articleExcerpt` element: `<a href="/">כרטיס ביקור דיגיטלי</a>` present.
- Raw `cardExcerpt` element on listing: `<a href="/">כרטיס ביקור דיגיטלי</a>` present.
- JSON-LD `dateModified`: `"2026-05-28T06:45:27.818Z"` confirming fresh build.
- All meta clean.

---

## 8. Files Changed in Implementation Contour

### Created

- `frontend/src/utils/safeLinkedText.jsx` — new shared utility, SSoT for all Blog/Guide linked-text rendering

### Edited

- `frontend/src/pages/BlogPost.jsx` — import safeLinkedText; renderLinkedText on excerpt; markdownLinksToPlainText on JSON-LD + SeoHelmet description
- `frontend/src/pages/GuidePost.jsx` — mirror of BlogPost.jsx
- `frontend/src/pages/Blog.jsx` — import safeLinkedText; renderLinkedText on listing card excerpt
- `frontend/src/pages/Guides.jsx` — mirror of Blog.jsx

### Not changed

- No backend source files.
- No `package.json` (frontend or backend).
- No DB schema, indexes, or migrations.
- No sitemap (`backend/src/routes/sitemap.routes.js`).
- No Edge Function (`frontend/netlify/edge-functions/og-preview.js`).
- No OG routes (`backend/src/routes/og.routes.js`).
- No `SeoHelmet.jsx`.
- No `frontend/index.html`.
- No `frontend/public/_redirects`.
- No env files.
