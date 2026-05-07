# Cardigo Enterprise Handoff — Schema & GSC Governance Closure

**Date:** 2026-05-07
**Project:** Cardigo — Digital Business Cards SaaS
**Canonical domain:** https://cardigo.co.il
**Status:** 3 code contours CLOSED / PASS + 1 read-only audit accepted

**Brand separation invariant:** Cardigo is the platform and product. Digitalyty is an organization on the Cardigo platform (a customer/partner). Digitalyty must not be mixed with Cardigo product identity in canonical URLs, SEO metadata, structured data, OG, user-facing copy, or documentation.

> This handoff documents documentation closure only. No source code changes are introduced by this docs contour. All code changes were completed and verified in prior contour phases.

---

## 1. Executive Summary

Three code contours were closed and verified in this session:

- SCHEMA_OWNER_JSONLD_LENGTH_LIMIT_P1 — CLOSED / PASS
- SCHEMA_OWNER_JSONLD_TYPE_ALLOWLIST_P1 — CLOSED / PASS
- SCHEMA_BLOG_GUIDES_PAGINATION_FAQ_SCHEMA_P1 — CLOSED / PASS

One read-only triage audit was accepted:

- SEO_GSC_DISCOVERED_NOT_INDEXED_TRIAGE_P1 — Phase 1 accepted / no known code/config blocker found from read-only audit

No source code, CSS, package, env, DB, or deploy changes are made by this documentation contour.

---

## 2. Closed Contour — SCHEMA_OWNER_JSONLD_LENGTH_LIMIT_P1

**Status:** CLOSED / PASS

**Files changed in the code contour:**

- `backend/src/models/Card.model.js`
- `frontend/src/pages/EditCard.jsx`
- `frontend/src/components/editor/panels/SeoPanel.jsx`

**What was enforced:**

- MAX_JSONLD_LENGTH = 5000 characters on `card.seo.jsonLd`.
- Backend: length is checked before JSON.parse. If the string exceeds 5000 characters the validator returns false and Mongoose emits a VALIDATION_ERROR.
- Frontend: EditCard.jsx mirrors the same length check before attempting to save. The error message is surfaced inline in the SEO panel.
- SeoPanel.jsx: the JSON-LD textarea has `maxLength={5000}` enforced at the HTML input level.

**Behavioral invariants:**

- Empty / null: allowed (no JSON-LD is emitted).
- Valid JSON object or array with length <= 5000: allowed (subject to @type/nesting rules — see next contour).
- Invalid JSON: rejected.
- Primitive JSON (e.g. a bare string or number): rejected.
- Length > 5000: rejected.

**Data migration policy:**

- Existing oversized DB values that predate this validator are not migrated or deleted.
- They will pass read/display operations unchanged.
- They will fail Mongoose validation on the next save attempt and the user will need to shorten before saving.

**Not changed by this contour:**

- SeoHelmet, PublicCard, card DTO, card controller, OG routes, sitemap, CSS, package, docs, DB/env/deploy.

---

## 3. Closed Contour — SCHEMA_OWNER_JSONLD_TYPE_ALLOWLIST_P1

**Status:** CLOSED / PASS

**Files changed in the code contour:**

- `backend/src/models/Card.model.js`
- `frontend/src/pages/EditCard.jsx`

**Note:** SeoPanel.jsx was read during audit and confirmed unchanged. It was not modified.

**Allowed top-level @type (exact set):**

- LocalBusiness
- Organization
- Person
- Service

**Rejected top-level @type examples (non-exhaustive):**

- MedicalOrganization
- EducationalOrganization
- Product
- Event
- Review
- AggregateRating
- FAQPage
- WebSite
- BlogPosting

Any @type not in the four-value allowed set is rejected.

**Additional structural rules enforced:**

- @graph: any root object (or root array item) that contains an `@graph` key is rejected.
- Missing @type: any root node without an `@type` key is rejected.
- @type value types: @type may be a string (single type) or a non-empty array of strings. All strings in an array @type must be in the allowed set.
- Top-level array: accepted. Each element of the array is validated independently as a root node and must pass all root-node rules.
- MAX_NESTING_DEPTH = 10: depth-first traversal is capped at 10 levels. Any structure that exceeds this depth is fail-closed (rejected). This is a security guard against infinite-recursion payloads.

**Nested type blocklist:**

- Review: rejected anywhere in the nested tree.
- AggregateRating: rejected anywhere in the nested tree.
- Rating: rejected anywhere in the nested tree.

**Nested helper types that remain allowed:**

- PostalAddress nested inside LocalBusiness: allowed and produced by the LocalBusiness template in SeoPanel. Not in the nested blocklist.

**Hebrew validation messages:**

- EditCard.jsx seoErrorMessageByField["seo.jsonLd"] and the VALIDATION_ERROR handler messageByField["seo.jsonLd"] were updated to reflect the combined constraint message.

**Data migration policy:**

- Existing off-policy DB values (e.g. stored FAQPage or AggregateRating JSON-LD from before this contour) are not migrated or deleted.
- They will pass read/display operations unchanged.
- They will fail Mongoose validation on the next save attempt.

**Future test-tail (deferred):**

- When schema drift tests are added: explicitly cover nested blocked @type as an array value, e.g. `{ "@type": ["AggregateRating"] }` nested inside a valid root.

**Not changed by this contour:**

- SeoHelmet, PublicCard, Blog/Guides/Post pages, card DTO, card controller, OG routes, sitemap, SeoPanel, CSS, package, docs, DB/env/deploy.

---

## 4. Closed Contour — SCHEMA_BLOG_GUIDES_PAGINATION_FAQ_SCHEMA_P1

**Status:** CLOSED / PASS

**Files changed in the code contour:**

- `frontend/src/pages/Blog.jsx`
- `frontend/src/pages/Guides.jsx`

**What was fixed:**

Before this contour, both Blog.jsx and Guides.jsx emitted the archive FAQPage JSON-LD block unconditionally on all archive pages — including paginated pages /blog/page/2, /blog/page/3, etc. This created a schema/canonical mismatch: the FAQPage @id and url fields pointed to /blog (the base route) but the page canonical was /blog/page/N.

After this contour, the FAQPage JSON-LD is emitted conditionally:

- `effectivePage <= 1` — FAQPage JSON-LD is emitted (i.e. /blog and /guides base routes).
- `effectivePage > 1` — `jsonLdItems=[]` is passed to SeoHelmet and no FAQPage JSON-LD is emitted (i.e. /blog/page/2+, /guides/page/2+).

**Unchanged by this contour:**

- `buildBlogFaqJsonLd()` and `buildGuidesFaqJsonLd()` functions: unchanged.
- FAQ @id values: unchanged (`${ORIGIN}/blog#faq`, `${ORIGIN}/guides#faq`).
- FAQ url values: unchanged (`${ORIGIN}/blog`, `${ORIGIN}/guides`).
- canonicalUrl logic: unchanged (effectivePage <= 1 → /blog, else /blog/page/N).
- title, description, url, image, imageAlt props: unchanged.
- Visible FAQ UI rendered on the page: unchanged.
- SeoHelmet, router, sitemap, OG, og-preview.js edge function, marketingMeta.config.js, owner JSON-LD validators, card DTO, card controller, CSS, package, docs, DB/env/deploy: all unchanged.

**Verification passed:**

- check:inline-styles — EXIT 0
- check:skins — EXIT 0
- check:contract — EXIT 0
- check:seo-static-shell — EXIT 0
- build — EXIT 0

---

## 5. Accepted Read-Only Triage — SEO_GSC_DISCOVERED_NOT_INDEXED_TRIAGE_P1

**Status:** Phase 1 read-only audit accepted with caution

**Context:**

Google Search Console showed the following six URLs as "Discovered — currently not indexed" with last crawl date absent:

- /privacy
- /terms
- /accessibility-statement
- /payment-policy
- /card/cardigo
- /c/digitalyty/digital-card

**Triage method:**

Read-only operator HEAD checks and source code audit only. No mutations, no GSC API calls, no DB changes.

**Findings:**

- Operator HTTP HEAD checks returned HTTP 200 OK for all six URLs. No visible X-Robots-Tag noindex header observed.
- robots.txt allows all six URLs (Allow: / with no per-path Disallow covering these routes). Source confirmed: `frontend/public/robots.txt`.
- sitemap.xml confirmed to include all six URLs with lastmod values. Source confirmed: `backend/src/routes/sitemap.routes.js`.
- No global static noindex in `frontend/index.html` in production (global noindex was removed at production launch 2026-05-03).
- Legal pages (Privacy.jsx, Terms.jsx, Accessibility.jsx, PaymentPolicy.jsx) all have SeoHelmet with title, description, canonicalUrl, url. No noindex emitted.
- /card/cardigo is a public, active, premium card. Sitemap-eligible. OG endpoint returned HTTP 200 with valid title and og:url.
- /c/digitalyty/digital-card is technically public, sitemap-eligible, and OG 200. However it requires a product/operator decision (see §6 pending tails).

**Verdict:**

No known code/config blocker found from read-only audit.

GSC "Discovered — currently not indexed" with absent last-crawl date is consistent with normal CSR/SPA crawl queue behavior for a recently launched site. Google Web Rendering Service queues JS-rendered pages separately from static pages; queue wait times can be days to weeks.

**What this verdict does NOT mean:**

- It does not mean Google will index all six URLs.
- It does not mean indexing is complete or guaranteed.
- It does not mean no technical blocker can ever exist.
- It does not mean the GSC triage is finished — manual URL Inspection and Request Indexing are still required (see §6).

**P2 metadata gap found (non-blocking):**

Legal pages (Privacy.jsx, Terms.jsx, Accessibility.jsx, PaymentPolicy.jsx) have:

- Hardcoded canonical strings instead of the ORIGIN constant.
- No image / imageAlt passed to SeoHelmet.

This is documented as SEO_LEGAL_PAGES_METADATA_GAP_P2 and deferred to a future contour.

---

## 6. Pending Tails / Next Actions

| Contour                                                   | Status                   | Notes                                                                                                                                                                              |
| --------------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEO_GSC_MANUAL_URL_INSPECTION_AND_REQUEST_INDEXING_P0_OPS | PENDING OPERATOR ACTION  | Use GSC URL Inspection → Test Live URL → Request Indexing for each of the six triage URLs. Priority: P0 operator action. No code change required.                                  |
| SEO_ORG_CARD_DIGITALYTY_BOUNDARY_DECISION_P1              | PENDING PRODUCT DECISION | Is /c/digitalyty/digital-card intentionally a public/demo card or internal test data? If internal test: set robots=noindex via card DTO or unpublish. If intentional: leave as-is. |
| SEO_LEGAL_PAGES_METADATA_GAP_P2                           | PENDING FUTURE CONTOUR   | 4 legal page files: add image/imageAlt to SeoHelmet, replace hardcoded canonical strings with ORIGIN constant.                                                                     |
| SEO_INTERNAL_LINKING_AND_SITEMAP_SIGNAL_P2                | DEFERRED                 | Footer/nav link audit for crawl discoverability signal.                                                                                                                            |
| SEO_DYNAMIC_GOOGLEBOT_RENDERING_GOVERNANCE_P2             | DEFERRED                 | Deferred until GSC shows WRS rendering errors. No current evidence of WRS issues.                                                                                                  |
| SCHEMA_GUIDEPOST_TYPE_DECISION_P2                         | DEFERRED                 | GuidePost.jsx emits @type: "Article" (not "GuidePost" or "HowTo"). Product/SEO decision on whether to keep or change.                                                              |
| SCHEMA_BUILDERS_CENTRALIZATION_P2                         | DEFERRED                 | JSON-LD builder functions are spread across Blog.jsx, Guides.jsx, BlogPost.jsx, GuidePost.jsx. Centralization to a shared builders module is a future refactor contour.            |
| SCHEMA_DRIFT_GATE_P2                                      | DEFERRED                 | CI gate to detect schema drift between SeoHelmet output and expected JSON-LD shape. No enforcement gate exists yet.                                                                |

---

## 7. Anti-Overclaim / No-Secret Policy

This handoff contains:

- No raw secrets, tokens, JWT keys, connection strings, or production credentials.
- No raw provider IDs, Tranzila tokens, Gemini API keys, or Netlify access tokens.
- No claims that Google has indexed any specific URL.
- No claims that indexing is complete or guaranteed.
- No claims that no technical blocker can ever exist.

All GSC triage findings use the formulation: "no known code/config blocker found from read-only audit."

---

## 8. Files Changed in This Session (Source Code Contours Only)

Source code changes were made in prior phases. This handoff is documentation only. For reference, the source files changed across the three code contours were:

| File                                                 | Contour(s)                                                                 |
| ---------------------------------------------------- | -------------------------------------------------------------------------- |
| `backend/src/models/Card.model.js`                   | SCHEMA_OWNER_JSONLD_LENGTH_LIMIT_P1, SCHEMA_OWNER_JSONLD_TYPE_ALLOWLIST_P1 |
| `frontend/src/pages/EditCard.jsx`                    | SCHEMA_OWNER_JSONLD_LENGTH_LIMIT_P1, SCHEMA_OWNER_JSONLD_TYPE_ALLOWLIST_P1 |
| `frontend/src/components/editor/panels/SeoPanel.jsx` | SCHEMA_OWNER_JSONLD_LENGTH_LIMIT_P1 (maxLength={5000} read-confirmed)      |
| `frontend/src/pages/Blog.jsx`                        | SCHEMA_BLOG_GUIDES_PAGINATION_FAQ_SCHEMA_P1                                |
| `frontend/src/pages/Guides.jsx`                      | SCHEMA_BLOG_GUIDES_PAGINATION_FAQ_SCHEMA_P1                                |

All other files were read-only during audit and remain unchanged.
