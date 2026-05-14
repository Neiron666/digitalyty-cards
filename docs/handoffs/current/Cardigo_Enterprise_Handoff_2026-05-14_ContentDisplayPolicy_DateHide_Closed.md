# Cardigo Enterprise Handoff — Content Display Policy: Published Date Hide — CLOSED

**Date:** 2026-05-14
**Project:** Cardigo — Digital Business Cards SaaS
**Canonical domain:** https://cardigo.co.il
**Contour:** CONTENT_VISIBLE_PUBLISHED_DATE_HIDE_POLICY_SSoT
**Status:** CLOSED / PASS / PRODUCTION VERIFIED
**Scope:** Frontend content display policy (visible UI date hiding) + docs closure
**Env required:** NO

**Brand invariant:** Cardigo and Digitalyty are separate products. No brand, canonical URL, public path, SEO metadata, OG, JSON-LD, sitemap, or backend changes were made in this contour.

---

## 1. Executive Summary

Visible publication dates in the Blog and Guides UI surfaces were intentionally hidden as an evergreen content product decision. Early production evergreen content should not overemphasize publish age — the goal is for readers to engage with content quality, not recency signals.

This was implemented by introducing a single source-controlled frontend content display policy at `frontend/src/utils/contentDisplayPolicy.js`. The `CONTENT_DISPLAY_POLICY.showPublishedDates = false` flag gates all four date-rendering call sites (Blog list, Guides list, BlogPost detail header, GuidePost detail header). No env file, no Netlify variable, no Render variable, and no backend change is required.

SEO and structured data truth remains fully honest and intact. JSON-LD `datePublished`/`dateModified` fields and `SeoHelmet` `articlePublishedTime`/`articleModifiedTime` props are independent of this UI display flag and were not changed. Backend `publishedAt` is untouched. Sitemap `<lastmod>` uses `updatedAt` and was not changed.

The change is reversible in one line: set `showPublishedDates: true` in the policy file.

---

## 2. Code Change Surface

Exactly 5 code files changed. No other files changed.

### frontend/src/utils/contentDisplayPolicy.js — CREATED

New pure ESM data module. Dependency-free. No React, no DOM, no side effects. Safe to import from pages, components, or hooks.

```
export const CONTENT_DISPLAY_POLICY = Object.freeze({
    showPublishedDates: false,
});
```

Header comment documents: dependency-free, SEO independence invariant, Blog/Guides scope, reversibility.

### frontend/src/pages/Blog.jsx — EDITED

- Import added: `import { CONTENT_DISPLAY_POLICY } from "../utils/contentDisplayPolicy.js";` (line 15)
- Comment block replaced with guarded JSX at line 247:
  `{CONTENT_DISPLAY_POLICY.showPublishedDates && post.publishedAt && ( <time className={styles.cardDate} ... > )}`

### frontend/src/pages/Guides.jsx — EDITED

- Import added at line 15 (same pattern as Blog.jsx)
- Comment block replaced with guarded JSX at line 241 using `styles.cardDate`

### frontend/src/pages/BlogPost.jsx — EDITED

- Import added at line 6
- Comment block replaced with guarded JSX at line 444 using `styles.date`
- JSON-LD builder and SeoHelmet article props: NOT touched

### frontend/src/pages/GuidePost.jsx — EDITED

- Import added at line 6
- Comment block replaced with guarded JSX at line 442 using `styles.date`
- JSON-LD builder and SeoHelmet article props: NOT touched

---

## 3. Policy SSoT

**File:** `frontend/src/utils/contentDisplayPolicy.js`

**Export:**

```
export const CONTENT_DISPLAY_POLICY = Object.freeze({
    showPublishedDates: false,
});
```

**Properties:**

- Pure ESM data module — no imports, no React, no DOM, no side effects
- Safe to import from any layer: pages, components, hooks
- `Object.freeze` prevents accidental mutation
- `showPublishedDates` is the sole key in V1
- Source-controlled policy — not environment-controlled
- No `.env` file required
- No `VITE_*` variable required
- No Netlify env var required
- No Render env var required

**Pattern precedent:** follows the same module pattern as `frontend/src/utils/passwordPolicy.js`.

---

## 4. UI Behavior

| Route                          | Visible date before  | Visible date after          |
| ------------------------------ | -------------------- | --------------------------- |
| /blog (list cards)             | Hidden (JSX comment) | Hidden (policy guard false) |
| /guides (list cards)           | Hidden (JSX comment) | Hidden (policy guard false) |
| /blog/:slug (article header)   | Hidden (JSX comment) | Hidden (policy guard false) |
| /guides/:slug (article header) | Hidden (JSX comment) | Hidden (policy guard false) |

Before this contour, dates were hidden via raw JSX comment blocks spread across 4 files — invisible policy, fragile, no named truth. After this contour, all 4 call sites are gated by a single named boolean in a named SSoT module.

---

## 5. Preserved Invariants

| Invariant                           | Status                  | Proof                                                                                                                      |
| ----------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| backend `publishedAt` field         | PRESERVED — NOT CHANGED | adminBlog.controller.js:515 sets publishedAt on publish; blog.controller.js:55 includes it in public DTO                   |
| JSON-LD `datePublished`             | PRESERVED — ACTIVE      | BlogPost.jsx:255, GuidePost.jsx:255 — active in buildBlogPostingJsonLd/buildArticleJsonLd                                  |
| JSON-LD `dateModified`              | PRESERVED — ACTIVE      | BlogPost.jsx:256, GuidePost.jsx:256 — active                                                                               |
| SeoHelmet `articlePublishedTime`    | PRESERVED — ACTIVE      | BlogPost.jsx:433, GuidePost.jsx:432 — passed as props                                                                      |
| SeoHelmet `articleModifiedTime`     | PRESERVED — ACTIVE      | BlogPost.jsx:434-435, GuidePost.jsx:432-433 — passed as props                                                              |
| Backend OG `article:published_time` | PRESERVED — ACTIVE      | backend og.routes.js — untouched; social bots receive article:published_time via Edge Function                             |
| Sitemap `<lastmod>`                 | PRESERVED — UNTOUCHED   | sitemap.routes.js uses updatedAt; not changed                                                                              |
| CSS class `.cardDate`               | PRESERVED               | Blog.module.css:147, Guides.module.css:147 — not deleted                                                                   |
| CSS class `.date`                   | PRESERVED               | BlogPost.module.css:152, GuidePost.module.css:152 — not deleted                                                            |
| `formatDate` helpers                | PRESERVED               | Blog.jsx:82, Guides.jsx:82, BlogPost.jsx:36, GuidePost.jsx:36 — all present; called inside guarded block for reversibility |
| No env required                     | CONFIRMED               | CONTENT*DISPLAY_POLICY is source-controlled; no .env / VITE*\* / Netlify / Render var needed                               |

---

## 6. Verification Evidence

### Frontend Gates (from Phase 3 code verification)

```
npm.cmd run check:inline-styles → EXIT 0
  PASS: no inline styles found.

npm.cmd run check:skins → EXIT 0
  PASS: skins are token-only. Scanned 28 files.

npm.cmd run check:contract → EXIT 0
  PASS: template contracts are consistent. Registry templates: 25.

npm.cmd run build → EXIT 0
  vite v7.3.1 building client environment for production...
  371 modules transformed. built in 3.14s.
```

### Scope Confirmation

Operator confirmed via VS Code Source Control UI that exactly 5 files were changed. No additional files were staged or modified. Git commands were not used (project policy).

### Targeted Search Results (Phase 3 grep verification)

- Old JSX comment blocks (`{/* {post.publishedAt`) across 4 page files: **0 matches**
- `import { CONTENT_DISPLAY_POLICY }` across 4 page files: **4 matches** (Blog.jsx:15, Guides.jsx:15, BlogPost.jsx:6, GuidePost.jsx:6)
- `CONTENT_DISPLAY_POLICY.showPublishedDates` across 4 page files: **4 matches** (Blog.jsx:247, Guides.jsx:241, BlogPost.jsx:444, GuidePost.jsx:442)
- `export const CONTENT_DISPLAY_POLICY` in contentDisplayPolicy.js: **1 match** (line 14)
- `showPublishedDates: false` in contentDisplayPolicy.js: **1 match** (line 15)
- `datePublished` in BlogPost.jsx: **1 active match** (line 255, JSON-LD builder)
- `datePublished` in GuidePost.jsx: **1 active match** (line 255, JSON-LD builder)

### Manual / Production Smoke

| Surface                                              | Local | Production |
| ---------------------------------------------------- | ----- | ---------- |
| /blog — no visible date in cards                     | PASS  | PASS       |
| /guides — no visible date in cards                   | PASS  | PASS       |
| /blog/:slug — no visible date in header              | PASS  | PASS       |
| /guides/:slug — no visible date in header            | PASS  | PASS       |
| /blog/:slug — JSON-LD datePublished in page source   | PASS  | PASS       |
| /guides/:slug — JSON-LD datePublished in page source | PASS  | PASS       |

---

## 7. Reversal Procedure

To restore visible publication dates in Blog/Guides UI:

1. Open `frontend/src/utils/contentDisplayPolicy.js`
2. Change `showPublishedDates: false` to `showPublishedDates: true`
3. Rerun frontend gates: `check:inline-styles`, `check:skins`, `check:contract`, `build`
4. Manual smoke: verify `<time>` elements appear in Blog/Guides cards and detail headers
5. No backend, sitemap, env, JSON-LD, SeoHelmet, or CSS changes required

No other files need to be changed. The `formatDate` helpers and CSS classes were intentionally preserved for exactly this reversal path.

---

## 8. Non-Actions

The following were explicitly NOT changed in this contour:

- No backend files changed
- No sitemap files changed
- No CSS Module files changed (`.cardDate` and `.date` kept)
- No `.env` files created or modified
- No Netlify env vars introduced
- No Render env vars introduced
- No JSON-LD `datePublished`/`dateModified` fields removed or modified
- No `SeoHelmet` `articlePublishedTime`/`articleModifiedTime` props removed or modified
- No backend OG route (`/og/blog/:slug`, `/og/guides/:slug`) changed
- No archive handoff files modified
- No git commands executed
- `frontend/src/utils/passwordPolicy.js` not modified (reference pattern only, not touched)
- `frontend/src/seo/marketingMeta.config.js` not modified
- `frontend/src/templates/templates.config.js` not modified

---

## 9. Docs Change Surface

| File                                                                                                  | Action                                                                                                                            |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `docs/runbooks/docs_blog_seo_og_runbook.md`                                                           | UPDATED — fixed stale `/blog` listing bullet (removed "date" claim); added bounded Content Display Policy subsection in Section 6 |
| `docs/handoffs/current/Cardigo_Enterprise_Handoff_2026-05-14_ContentDisplayPolicy_DateHide_Closed.md` | CREATED — this file                                                                                                               |

---

## 10. Closure Statement

This contour is closed for:

- Source-controlled frontend visible date display policy (`CONTENT_DISPLAY_POLICY.showPublishedDates = false`)
- Migration from raw JSX comment blocks (4 files) to a single named policy SSoT
- Docs/runbook alignment (`docs_blog_seo_og_runbook.md` Section 6 updated)
- Production smoke confirmed: visible dates not shown on all 4 affected routes

This closure does NOT imply:

- A global feature flag system exists (it does not)
- Date display is configurable via environment (it is not)
- Publication dates were removed from the data model (they were not)
- Publication dates were removed from SEO metadata (they were not)
- Sitemap behavior changed (it did not)
- Backend `publishedAt` was removed or modified (it was not)
