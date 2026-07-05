# Cardigo Enterprise Handoff — Public Card Fallback Disable P2B — CLOSED

---

> **SUPERSEDED UPDATE — 2026-07-05:**
> SSR_REAL_ROUTE_PRODUCTION_ROLLOUT is now CLOSED / PASS / PRODUCTION VERIFIED.
> Production /card/* and /c/* now serve full SSR HTML with sanitized data island for browser/Googlebot paths, while social UA remains raw OG HTML.
> See `docs/handoffs/current/Cardigo_Enterprise_Handoff_2026-07-05_SSR_Real_Route_Production_Rollout_Closed.md` and `docs/runbooks/seo-public-indexability-runbook.md` Section 23 for current truth.


> **Tier 1 — Product/Security Canon**
> Closure record for PUBLIC_CARD_FALLBACK_DISABLE_P2B_MINIMAL.
> This is a follow-on contour to PUBLIC_CARD_SEO_RENDERING_D1_CHAIN (see `docs/handoffs/current/Cardigo_Enterprise_Handoff_2026-06-01_PublicCard_SEO_Rendering_D1_Closed.md`).
> Do not retroactively rewrite this document — open a new handoff for any follow-on contour.

---

## 1. Executive Status

CONTOUR: PUBLIC_CARD_FALLBACK_DISABLE_P2B_MINIMAL

Status: CLOSED / PASS / PRODUCTION VERIFIED

Date: 2026-06-01

Runtime deploy: completed (Netlify Edge Function redeployed)

Backend deploy: not required (no backend changes)

Full React SSR: HOLD (unchanged — not the scope of this contour)

Next root-fix candidate: PUBLIC_CARD_DATA_ISLAND_FOR_FAST_HYDRATION_P1_AUDIT

File changed in this contour:

- `frontend/netlify/edge-functions/og-preview.js`

Files NOT changed in this contour:

- `frontend/src/pages/PublicCard.jsx` — P2A residue present but inert
- `frontend/src/styles/globals.css` — P2A #cardigo-body-fallback CSS present but inert
- `frontend/src/components/seo/SeoHelmet.jsx` — P2B-1/P2B-3 suppression active and unchanged
- `frontend/src/main.jsx` — hydration branch unchanged
- `backend/` — no backend changes
- All templates, skins, CardLayout — untouched
- Social branch in og-preview.js — unchanged within file
- Marketing CRAWLER branch in og-preview.js — unchanged

---

## 2. Why the Visible Fallback Was Disabled

### 2.1 D1 fallback was technically valid

The D1 workstream (PUBLIC_CARD_EDGE_VISIBLE_BODY_FALLBACK_D1, closed as part of PUBLIC_CARD_SEO_RENDERING_D1_CHAIN) implemented a visible semantic fallback body injected by the Netlify Edge Function into the enriched shell served for `/card/:slug` and `/c/:orgSlug/:slug`. The fallback was extracted from the backend `/og` response, sanitized via a 19-step regex chain, and injected before `<div id="root"></div>` in the raw Edge HTML.

The D1 fallback passed all technical gates and production smoke at the time of closure. It was a valid SEO rendering foundation.

### 2.2 Visual and product rejection

P2A applied CSS styling to the fallback (`#cardigo-body-fallback` block in `globals.css`). Despite this, the operator confirmed the following at production load time:

- The fallback body was visible long enough to be screenshotted before the styled React card UI rendered.
- The fallback content is plain semantic HTML, not a styled CardLayout.
- The visible transition from plain fallback to styled card UI created a P1 product-trust / perceived-performance issue.

### 2.3 Disable decision

After a bounded P1 audit (PUBLIC_CARD_FALLBACK_FLASH_DECISION_P1_AUDIT) evaluating options A–G (including hiding, skeleton, minimal CSS, data island, full SSR, gradual reveal, and disable), the decision was:

- Short-term: disable visible body fallback (this contour, Option B).
- Root fix: data island (Option D, PUBLIC_CARD_DATA_ISLAND_FOR_FAST_HYDRATION_P1_AUDIT, separate contour).

### 2.4 What this disable is NOT

- This is NOT a rollback of the D1 SEO value. Edge head injection and Edge-marked JSON-LD remain fully active.
- This is NOT an endorsement of hidden SEO content. The fallback was not hidden — it was removed. Hidden SEO content visible only to crawlers is cloaking and remains prohibited.
- This is NOT full React SSR. CardLayout, templates, and skins are not server-rendered.
- This does NOT affect the social branch, direct /og routes, or unknown slug handling.

---

## 3. What Changed Technically

### 3.1 File changed

`frontend/netlify/edge-functions/og-preview.js`

### 3.2 Change summary

The inner body-injection try/catch block was removed from `serveCardEnrichedShell`. The chain:

```
extractOgMainContent(ogHtml) → sanitizeOgBody(raw) → injectBodyFallback(sanitizedBody, shellHtml)
```

is no longer called from `serveCardEnrichedShell`.

Net diff: approximately −6 lines of active code, +2 comment lines.

### 3.3 What remains in serveCardEnrichedShell

- `injectMetadataIntoShell(ogHtml, shellHtml)` call at the active assignment line — UNCHANGED, ACTIVE.
- `const headInjectedHtml = injectMetadataIntoShell(...)` — UNCHANGED, ACTIVE.
- `let finalHtml = headInjectedHtml;` — the ONLY assignment to `finalHtml`. No body injection is applied.
- Two-line disable comment referencing this contour and PUBLIC_CARD_DATA_ISLAND_FOR_FAST_HYDRATION_P1_AUDIT.

### 3.4 Helper function definitions kept as inert re-enable path

The following function definitions were kept in `og-preview.js` as inert/dead code to preserve a clean re-enable path:

- `extractOgMainContent(ogHtml)` — definition present, not called
- `sanitizeOgBody(raw)` — definition present, not called
- `injectBodyFallback(sanitizedBody, shellHtml)` — definition present, not called

These are dead code from the active path. ESLint warns but is non-blocking. Do not remove without a decision to either re-enable or permanently abandon the fallback approach.

### 3.5 Unchanged surfaces

- Cache headers: `Cache-Control: public, max-age=60, stale-while-revalidate=300`, `Vary: User-Agent` — UNCHANGED
- `injectMetadataIntoShell` function — UNCHANGED
- Social branch — UNCHANGED
- Marketing CRAWLER branch — UNCHANGED
- Direct `/og` routes — UNCHANGED
- Unknown slug handling (404 → Googlebot, context.next() → browser) — UNCHANGED

---

## 4. Current /card and /c Production Request Flow

### 4.1 Browser /card/:slug and /c/:orgSlug/:slug (non-social UA)

```
Browser request → Netlify Edge Function (og-preview.js)
  → serveCardEnrichedShell (isCrawler: false):
      1. Fetches backend /og/:slug for metadata
      2. Fetches SPA shell via context.next()
      3. Injects deterministic head:
           title, meta description, canonical, robots (if present),
           og:* metas, twitter:* metas,
           JSON-LD FAQPage + LocalBusiness (data-cardigo-edge-ld="1")
      4. Body fallback injection: DISABLED
      5. Returns enriched shell (finalHtml = headInjectedHtml)
      Cache-Control: public, max-age=60, stale-while-revalidate=300, Vary: User-Agent

↓ Browser receives enriched shell with:
  - Deterministic SEO head
  - Edge-marked JSON-LD (data-cardigo-edge-ld="1") × 2
  - <div id="root"></div> EMPTY
  - NO cardigo-body-fallback in HTML

↓ React runtime:
  main.jsx: rootEl.hasChildNodes() → false (root is empty) → createRoot(rootEl).render(app)

↓ PublicCard mounts, calls loadCard() API
  During API fetch: loading state shown ("טוען כרטיס...")
  After card data loads: React renders card UI
  hasEdgeFallback = false (getElementById("cardigo-body-fallback") returns null — INERT)
  cleanup useEffect: getElementById("cardigo-body-fallback") returns null — INERT

↓ SeoHelmet post-hydration:
  Detects data-cardigo-edge-ld="1" → suppresses duplicate JSON-LD (P2B-1)
  Suppresses selected duplicate non-JSON-LD meta tags (P2B-3)
  Final DOM: canonical=1, title=1, robots=0 (indexable), og:url=1, JSON-LD=2
```

### 4.2 Googlebot / non-social crawler /card/:slug and /c/:orgSlug/:slug

Same flow as browser (Section 4.1). Both receive the identical enriched shell.

Content visible to Googlebot = content visible to users. Not cloaking.

No visible body fallback in either case.

### 4.3 Social UA /card/:slug and /c/:orgSlug/:slug

```
Social bot request (facebookexternalhit, WhatsApp, Twitterbot, LinkedInBot, etc.)
→ og-preview.js SOCIAL branch (UNCHANGED)
→ proxies to backend /og/card/:slug or /og/c/:orgSlug/:slug
→ returns full backend OG HTML directly
No fallback wrapper. No #root. No SPA shell.
Cache-Control: public, max-age=300, stale-while-revalidate=60, Vary: User-Agent
```

The social branch is completely unchanged by this contour and by the preceding D1 contour.

### 4.4 Direct /og routes

```
Direct GET /og/card/:slug or /og/c/:orgSlug/:slug
→ _redirects L6: /og/* → /.netlify/functions/proxy/api/:splat 200
→ Backend route handler
→ cardOgHtml.service.js generates deterministic HTML
→ Returns full OG HTML with FAQPage + LocalBusiness JSON-LD, visible FAQ dt/dd, H1, etc.
No Edge fallback wrapper. No #root.
```

Direct `/og` routes do not pass through `serveCardEnrichedShell`. Not affected.

### 4.5 Unknown slug

Browser:

```
Browser GET /card/unknown-slug
→ Edge: backend /og returns non-200
→ context.next() → SPA shell (HTTP 200)
→ React loads, PublicCard fetches, gets 404, shows Hebrew error state
No fallback injected (fallback chain is disabled; also never ran for unknown slugs)
```

Googlebot:

```
Googlebot GET /card/unknown-slug
→ Edge: backend /og returns non-200
→ HTTP 404, "Not found", Cache-Control: no-store
Anti-enumeration preserved.
```

---

## 5. What Remains Active from Previous P2B/D1 Chain

| Sub-contour                                     | Status | Notes                                                         |
| ----------------------------------------------- | ------ | ------------------------------------------------------------- |
| P2A-FIX backend /og FAQPage + LocalBusiness     | ACTIVE | cardOgHtml.service.js unchanged; social/og body richer        |
| P2B-1 SeoHelmet JSON-LD suppression             | ACTIVE | data-cardigo-edge-ld="1" guard in SeoHelmet.jsx unchanged     |
| P2B-2 Edge JSON-LD injection                    | ACTIVE | injectMetadataIntoShell still injects FAQPage + LocalBusiness |
| P2B-3 SeoHelmet managed meta suppression        | ACTIVE | canonical/title/description/robots dedup unchanged            |
| MARKETING_SSG_INSTALL_CTA_HYDRATION_MISMATCH    | ACTIVE | InstallCta mounted-gate unchanged                             |
| P2A residue (globals.css, PublicCard detection) | INERT  | See Section 7                                                 |

---

## 6. What Is No Longer Active

| Item                                     | Current State | Notes                                                     |
| ---------------------------------------- | ------------- | --------------------------------------------------------- |
| D1 visible body fallback injection       | DISABLED      | Inner try/catch removed from serveCardEnrichedShell       |
| cardigo-body-fallback in enriched shell  | ABSENT        | Never appears in /card or /c browser/Googlebot HTML       |
| extractOgMainContent → chain active call | DEAD CODE     | Definitions kept; not called from serveCardEnrichedShell  |
| PublicCard hasEdgeFallback detection     | INERT         | getElementById returns null; hasEdgeFallback always false |
| globals.css #cardigo-body-fallback CSS   | DEAD CSS      | Element never injected; CSS rules match nothing           |
| PublicCard cleanup useEffect             | INERT         | getElementById returns null; remove() never called        |

---

## 7. P2A Residue Status

### 7.1 Files with residue

`frontend/src/styles/globals.css` — `#cardigo-body-fallback` CSS block (rules at L119–L181).
`frontend/src/pages/PublicCard.jsx` — `hasEdgeFallback` state at L137, mount effect at L139–L143, loading branch at L197, cleanup effect at L195–L198.

### 7.2 Why residue is kept

- Removing the CSS block and PublicCard detection is a source-code change, not a docs change.
- The data island contour (PUBLIC_CARD_DATA_ISLAND_FOR_FAST_HYDRATION_P1_AUDIT) may repurpose or reuse parts of the detection/cleanup pattern.
- Premature cleanup creates unnecessary churn if the data island approach reintroduces any similar cleanup idiom.

### 7.3 Disposition rule

Do NOT clean P2A residue casually. The cleanup decision should be made as part of the data island contour Phase 1 audit. No cleanup in this docs-only contour.

---

## 8. Production Verification Summary

### 8.1 Phase 3 pre-deploy frontend gates (2026-06-01)

```
check:inline-styles  EXIT 0  PASS
check:skins          EXIT 0  PASS  (28 CSS modules scanned)
check:contract       EXIT 0  PASS  (25 templates verified)
build                EXIT 0  PASS
```

Static grep proofs before deploy:

- `injectMetadataIntoShell` called in serveCardEnrichedShell — CONFIRMED ACTIVE
- `injectBodyFallback` — NOT called from serveCardEnrichedShell
- `cardigo-body-fallback` string — present only inside injectBodyFallback definition (dead code), not in active path
- `extractOgMainContent` — definition only, not called from serveCardEnrichedShell
- cache-control headers — UNCHANGED
- SOCIAL branch — UNCHANGED
- Only `og-preview.js` changed in runtime contour

### 8.2 Post-deploy production smoke (2026-06-01)

All curls run against https://cardigo.co.il post-deploy. All temp files cleaned (CLEAN_OK).

A. Browser /card/:slug (fixture: /card/digitalyty)

- HTTP 200, EXIT 0
- fallback_present = FALSE — PASS
- root_empty = TRUE — PASS
- title = "Digitalyty - בניית אתרים וכרטיסים דיגיטליים לעסקים בחיפה" — PASS (non-generic)
- canonical = TRUE — PASS
- robots = TRUE — PASS
- ld_json_count = 2 — PASS
- edge_ld_marks = 2 — PASS
- faqPage = TRUE — PASS
- localBiz = TRUE — PASS
- Cache-Control: public, max-age=60, stale-while-revalidate=300 — PASS
- Vary: Accept-Encoding, User-Agent — PASS

B. Googlebot /card/:slug (same fixture, Googlebot UA)

- HTTP 200, EXIT 0
- fallback_present = FALSE — PASS
- root_empty = TRUE — PASS
- ld_count = 2, edge_marks = 2 — PASS
- faqPage = TRUE — PASS
- Cache-Control: public, max-age=60, stale-while-revalidate=300 — PASS
- Identical enriched shell as browser — no cloaking — PASS

C. Browser /c/:orgSlug/:slug (fixture: /c/digitalyty/kartis-bikur-digitali-lemetavech-nadlan)

- HTTP 200, EXIT 0
- fallback_present = FALSE — PASS
- root_empty = TRUE — PASS
- ld_count = 2, edge_marks = 2 — PASS
- faqPage = TRUE, localBiz = TRUE — PASS
- Cache-Control: public, max-age=60, stale-while-revalidate=300 — PASS

D. Social /card/:slug (facebookexternalhit UA)

- HTTP 200, EXIT 0
- has_root = FALSE — PASS (raw /og body, not SPA shell)
- fallback_present = FALSE — PASS
- ld_count = 2 — PASS
- faqPage = TRUE, has_dt = TRUE (visible FAQ markup) — PASS
- Cache-Control: public, max-age=300, stale-while-revalidate=60 — PASS (social branch cache unchanged)

E. Social /c/:orgSlug/:slug

- Same as D — all PASS

F. Direct /og/card/:slug and /og/c/:orgSlug/:slug

- HTTP 200, EXIT 0 (both)
- has_root = FALSE — PASS
- fallback_present = FALSE — PASS
- ld_count = 2, faqPage = TRUE, has_dt = TRUE — PASS

G. Unknown slug — browser

- HTTP 200, EXIT 0
- has_root = TRUE — PASS (SPA shell passed through)
- fallback_present = FALSE — PASS

H. Unknown slug — Googlebot

- HTTP 404, body = "Not found", EXIT 0
- Cache-Control: no-store — PASS (anti-indexing preserved)

I. Temp file cleanup

- All 18 temp files removed. CLEAN_OK confirmed.

---

## 9. Anti-Regression Rules

The following rules are normative after P2B_MINIMAL. Violating them requires a new bounded Phase 1 audit and explicit architect approval.

1. Do NOT re-enable the visible body fallback without a new bounded Phase 1 audit. The disable was a product decision, not a technical defect. Re-enabling without a root fix (data island) recreates the same visual rejection problem.

2. Do NOT hide the fallback if ever re-enabled. Hidden content visible only to crawlers is cloaking and is unconditionally prohibited. If the fallback is re-enabled, it must be visible to both users and crawlers.

3. Do NOT put any content inside `<div id="root"></div>` in the Edge-enriched HTML. Any content in `#root` triggers `hydrateRoot` in `main.jsx`, which requires a matching server/client tree. A mismatch causes React hydration errors #418, #423, or #425.

4. Do NOT change the `data-cardigo-edge-ld="1"` attribute in `og-preview.js` or the `EDGE_LD_MARKER_SELECTOR` in `SeoHelmet.jsx` without a full P2B-1/P2B-2 cross-phase audit. These are coupled.

5. Do NOT modify the SOCIAL branch in `og-preview.js` to inject the enriched shell or any fallback body to social UAs. Social bots must continue to receive the raw backend `/og` body.

6. Do NOT casually clean the P2A residue in `globals.css` and `PublicCard.jsx`. Cleanup should be decided in the data island contour.

7. Do NOT claim this contour or the D1 chain constitutes full SSR. CardLayout, templates, and skins are not server-rendered. The React card UI is client-rendered after API load.

8. Full React SSR remains HOLD. Any future SSR contour requires a separate P1 audit covering data island DTO scoping, CardLayout hydration, template/skin server rendering, cache/status propagation, and security surface.

---

## 10. Open Tails

These items are separate future contours. None are blockers.

1. PUBLIC_CARD_DATA_ISLAND_FOR_FAST_HYDRATION_P1_AUDIT — PRIMARY next root-fix.
   Without the visible fallback, browser /card shows "טוען כרטיס..." loading text during the API round-trip to the backend. A data island (card JSON embedded in the Edge-enriched HTML at render time) would allow React to hydrate with card data immediately on mount, eliminating the blank loading state. Requires: DTO scoping audit (public fields only, no private field leakage), Edge render-time card JSON fetch/embed, PublicCard island consumption, alignment with existing API contracts. This is a meaningful step toward full SSR without requiring CardLayout server rendering.

2. P2A residue cleanup — deferred until data island direction is decided.
   `globals.css` `#cardigo-body-fallback` block and `PublicCard.jsx` `hasEdgeFallback` / cleanup useEffect residue. No action in this contour.

3. GSC / WRS monitoring — operator task.
   Monitor Google Search Console for rendering coverage changes after stable deploy. D1 head injection and Edge-marked JSON-LD remain active, so WRS indexability is not expected to regress.

4. CACHE_INVALIDATION_AFTER_CARD_EDIT_P1_AUDIT — still deferred.
   Edge-cached enriched shell (max-age=60) may serve stale head metadata for up to 60 seconds after a card owner edits their card. No change in this contour.

5. Full React SSR — HOLD. High blast radius. Not needed given current intermediate architecture.

---

## 11. Canonical References

- This handoff: `docs/handoffs/current/Cardigo_Enterprise_Handoff_2026-06-01_PublicCard_Fallback_Disable_P2B_Closed.md`
- D1 chain handoff: `docs/handoffs/current/Cardigo_Enterprise_Handoff_2026-06-01_PublicCard_SEO_Rendering_D1_Closed.md`
- SEO runbook: `docs/runbooks/seo-public-indexability-runbook.md` Section 22
- Edge Function: `frontend/netlify/edge-functions/og-preview.js`
- SeoHelmet (suppression active): `frontend/src/components/seo/SeoHelmet.jsx`
- PublicCard (P2A residue inert): `frontend/src/pages/PublicCard.jsx`
- globals.css (P2A residue inert): `frontend/src/styles/globals.css`
