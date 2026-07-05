# Cardigo Enterprise Handoff — Public Card SEO Rendering D1 — CLOSED

---

> **SUPERSEDED UPDATE — 2026-07-05:**
> SSR_REAL_ROUTE_PRODUCTION_ROLLOUT is now CLOSED / PASS / PRODUCTION VERIFIED.
> Production /card/* and /c/* now serve full SSR HTML with sanitized data island for browser/Googlebot paths, while social UA remains raw OG HTML.
> See `docs/handoffs/current/Cardigo_Enterprise_Handoff_2026-07-05_SSR_Real_Route_Production_Rollout_Closed.md` and `docs/runbooks/seo-public-indexability-runbook.md` Section 23 for current truth.


> **Tier 1 — Product/Security Canon**
> Closure record for the PUBLIC_CARD_SEO_RENDERING_D1_CHAIN workstream.
> All sub-contours listed here are CLOSED / PASS / PRODUCTION VERIFIED as of 2026-06-01.
> Do not retroactively rewrite this document — open a new handoff for any follow-on contour.

---

## 1. Executive Status

CONTOUR_WORKSTREAM: PUBLIC_CARD_SEO_RENDERING_D1_CHAIN

Status: ALL SUB-CONTOURS CLOSED / PASS / PRODUCTION VERIFIED

Date: 2026-06-01

Sub-contours closed:

- P2A-FIX — backend /og FAQPage + LocalBusiness + visible FAQ dt/dd
- P2B-1 — SeoHelmet duplicate JSON-LD suppression after Edge marker
- P2B-2 — Browser + Googlebot initial HTML includes Edge-marked JSON-LD
- P2B-3 — Hydrated DOM non-JSON-LD SEO meta deduplication
- MARKETING_SSG_INSTALL_CTA_HYDRATION_MISMATCH — InstallCta mounted-gate fix
- PUBLIC_CARD_EDGE_VISIBLE_BODY_FALLBACK_D1 — visible semantic fallback body before empty #root

Files changed in this workstream:

- `frontend/netlify/edge-functions/og-preview.js` (P2B-2, D1)
- `frontend/src/components/seo/SeoHelmet.jsx` (P2B-1, P2B-3)
- `frontend/src/pages/PublicCard.jsx` (D1 cleanup)
- `frontend/src/components/layout/InstallCta.jsx` (MARKETING_SSG_INSTALL_CTA_HYDRATION_MISMATCH)
- `backend/src/services/cardOgHtml.service.js` (P2A-FIX)

Files NOT changed in this workstream:

- `frontend/src/main.jsx` — untouched; hydration branch unchanged
- `frontend/src/components/card/layout/CardLayout.jsx` — untouched
- All templates and skins — untouched
- `backend/src/routes/og.routes.js` — untouched; social branch unchanged
- `frontend/netlify/edge-functions/og-preview.js` social branch — unchanged within file
- Unknown slug matrix — unchanged

**CRITICAL SCOPE STATEMENT:**

This is NOT full React SSR.
Full React SSR remains HOLD.
D1 is an intermediate SEO-rendering foundation only.
CardLayout is not server-rendered. Templates are not server-rendered. React card UI is still client-rendered after public card data loads.

---

## 2. What Was Built — Per Sub-Contour

### 2.1 P2A-FIX — Backend /og FAQPage + LocalBusiness JSON-LD + visible FAQ dt/dd

**File:** `backend/src/services/cardOgHtml.service.js`

Before this fix, backend `/og/card/:slug` and `/og/c/:orgSlug/:slug` emitted only a single LocalBusiness JSON-LD block.

After this fix:

- Both routes emit two JSON-LD scripts: FAQPage + LocalBusiness.
- The FAQPage block contains `mainEntity` items populated from the card's FAQ field when available.
- The visible `/og` body HTML includes `<dl>` with `<dt>` question and `<dd>` answer elements rendered from FAQ items.
- Production proof: `ldJsonCount=2`, `dtCount=5`, `ddCount=5` confirmed on production fixtures for both `/og/card/:slug` and `/og/c/:orgSlug/:slug`.
- Social preview branch remains unchanged — social bots receive this richer OG HTML when they hit `/card/:slug` or `/c/:orgSlug/:slug`.
- The `extractOgMainContent` helper in `og-preview.js` extracts this body for use in the Edge body fallback (D1).

### 2.2 P2B-1 — SeoHelmet duplicate JSON-LD suppression after Edge marker

**File:** `frontend/src/components/seo/SeoHelmet.jsx`

When the initial HTML for `/card/:slug` or `/c/:orgSlug/:slug` already contains JSON-LD scripts carrying `data-cardigo-edge-ld="1"` (injected by the Edge function — see P2B-2), SeoHelmet detects the marker and suppresses its own duplicate JSON-LD injection post-hydration.

Key implementation facts:

- `EDGE_LD_MARKER_SELECTOR` constant is exported from `SeoHelmet.jsx` and used as the selector to detect whether trusted Edge JSON-LD is present.
- The P2B-1 cross-phase contract comment in `SeoHelmet.jsx` must not be removed — it documents the coupling between P2B-1 (SeoHelmet suppression) and P2B-2 (Edge injection).
- Suppression is one-way: if no Edge-marked JSON-LD is present (e.g., on routes not handled by the CRAWLER branch), SeoHelmet emits its own JSON-LD normally.
- No visual regression. Post-hydration DOM JSON-LD count on indexed `/card` routes = 2 (Edge-injected FAQPage + LocalBusiness with `data-cardigo-edge-ld="1"` remain; SeoHelmet does not add duplicates).

### 2.3 P2B-2 — Browser + Googlebot initial HTML includes Edge-marked JSON-LD

**File:** `frontend/netlify/edge-functions/og-preview.js`

The Edge function `serveCardEnrichedShell` handler (CRAWLER/browser branch) now injects FAQPage + LocalBusiness JSON-LD into the initial HTML served for `/card/:slug` and `/c/:orgSlug/:slug` — for ALL non-social UAs (browsers and Googlebot alike).

Key implementation facts:

- Each injected JSON-LD `<script>` carries `data-cardigo-edge-ld="1"`.
- `ldJsonCount=2`, `edgeLdCount=2` confirmed in production smoke for both browser `/card` and browser `/c`.
- Cache-control for the enriched shell: `public, max-age=60, stale-while-revalidate=300, Vary: User-Agent`.
- The social branch (/og proxy to backend) remains unchanged — social UAs do not receive the Edge-enriched shell; they receive the full backend `/og` response body directly.
- The injection uses the existing `injectMetadataIntoShell` whitelist extraction pipeline. The JSON-LD scripts are part of the head injection block.

### 2.4 P2B-3 — Hydrated DOM non-JSON-LD SEO meta deduplication

**File:** `frontend/src/components/seo/SeoHelmet.jsx`

When trusted Edge JSON-LD exists (`data-cardigo-edge-ld="1"` present), SeoHelmet also suppresses selected duplicate non-JSON-LD SEO meta tags that the Edge function has already injected into the initial HTML — specifically: canonical, title, description, and robots meta.

Key implementation facts:

- This prevents post-hydration DOM duplication of the head tags that are authoritative from the Edge layer.
- After hydration on an indexed `/card` route: `canonical count = 1`, `title count = 1`, `robots count = 0` (indexable card), `og:url count = 1`, `og:title count = 1` — all confirmed in production smoke.
- Suppression is scoped to the routes where Edge JSON-LD marker is present. All other routes are unaffected.

### 2.5 MARKETING_SSG_INSTALL_CTA_HYDRATION_MISMATCH — InstallCta mounted-gate fix

**File:** `frontend/src/components/layout/InstallCta.jsx`

Before this fix, InstallCta rendered branch-dependent helpText unconditionally in its initial render. On SSG pages (marketing routes: `/cards`, `/pricing`, `/guides`, `/blog`, `/`, etc.), the SSG HTML and the initial client render could mismatch, triggering React hydration error #418/#423/#425.

After this fix:

- `helpText` rendering is gated behind a `mounted` state (`useState(false)`, set to `true` in `useEffect`).
- Pre-mount: the install button renders (always visible), but no branch-dependent helpText renders.
- Post-mount (client only): helpText renders and responds to button click normally.
- SSG HTML is stable: install button present, helpText absent — client render matches SSG HTML on first mount.
- Production smoke confirmed: `installCtaBtn=1`, `helpText_default=0` on all four tested marketing pages (`/cards`, `/`, `/pricing`, `/guides`).
- React hydration errors #418/#423/#425 resolved on marketing SSG pages.

**Unchanged surfaces:** `installPromptStore.js`, `useInstallPrompt.js`, `CardFooter.jsx`, `Footer.jsx`, `CardLayout.jsx`, all layout wrappers, all backend files. P2B was not reopened. No PWA install behavior changed — only the pre-mount rendering guard.

### 2.6 PUBLIC_CARD_EDGE_VISIBLE_BODY_FALLBACK_D1 — Visible semantic fallback body before empty #root

**Files:** `frontend/netlify/edge-functions/og-preview.js`, `frontend/src/pages/PublicCard.jsx`

The Edge function `serveCardEnrichedShell` handler now injects a visible semantic fallback body block before `<div id="root"></div>` in the initial HTML served for `/card/:slug` and `/c/:orgSlug/:slug` for all non-social UAs (browsers and Googlebot alike).

Key implementation facts:

Fallback structure:

- Element ID: `cardigo-body-fallback`
- Element attribute: `data-cardigo-body-fallback="1"`
- Structure: `<div id="cardigo-body-fallback" data-cardigo-body-fallback="1">` wrapping the sanitized body content extracted from the backend `/og` response.
- Content: public-safe semantic HTML including H1, subtitle, about text, contact links, services list, FAQ `<dl>`/`<dt>`/`<dd>`, business hours, gallery `<img>` tags, social links. Sourced from `extractOgMainContent` + `sanitizeOgBody` helpers in `og-preview.js`.

Visibility invariants:

- Fallback is VISIBLE — not hidden, not aria-hidden, not inert, no `display:none`, no `visibility:hidden`.
- Same content visible to crawlers and users.
- This is not cloaking. Content is not hidden or presented differently to Googlebot vs users.

Position invariants:

- Fallback is placed BEFORE `<div id="root"></div>` in the raw Edge HTML.
- `#root` remains exactly `<div id="root"></div>` (empty) in raw Edge HTML.
- The fallback is OUTSIDE `#root` — it is unmanaged by React.

Hydration contract:

- `main.jsx` hydration branch: `if (rootEl.hasChildNodes()) hydrateRoot(rootEl, app); else createRoot(rootEl).render(app)` — UNCHANGED.
- Because `#root` is empty in the raw Edge HTML, `createRoot` is always used for `/card` and `/c`.
- `hydrateRoot` would only be triggered if content existed inside `#root`. The fallback is intentionally outside `#root` to avoid triggering `hydrateRoot`, which would cause React error #418/#423 if the server and client trees do not match.

Cleanup contract:

- `PublicCard.jsx` cleanup `useEffect` (added, fires once `card` becomes truthy):
    ```
    useEffect(() => {
      if (!card) return;
      const fallback = document.getElementById("cardigo-body-fallback");
      if (fallback) fallback.remove();
    }, [card]);
    ```
- After card data loads: fallback div is removed from the DOM. React card UI takes over.
- On 404/410/error: `card` stays null, cleanup never fires, fallback remains visible alongside the React error/loading state. This is accepted behavior — the fallback was correct public data anyway.

**D1 visual swap — known UX behavior (not a rollback reason):**
The fallback body is plain semantic HTML, not a styled CardLayout. On real production loads, the operator confirmed the fallback is visible long enough to screenshot before the styled React card UI replaces it. This is accepted D1 runtime behavior. It must not be mitigated by hiding the fallback — hidden SEO content is cloaking and is prohibited (see Anti-Regression Rule 3). Reducing or eliminating the plain-fallback flash is classified as a P1 UX/perceived-performance follow-up under `PUBLIC_CARD_EDGE_FALLBACK_VISUAL_SWAP_P1_AUDIT` (see Section 9). Full React SSR remains HOLD.

Sanitizer safety:

- `sanitizeOgBody` is a 19-step regex chain that strips: `<script>`, `<style>`, `<iframe>`, `<object>`, `<embed>`, `<form>`, inline `style=` attributes, `on*=` event handlers, `javascript:` URIs, `hidden` attribute, `aria-hidden` attribute, `inert` attribute.
- Production scan confirmed: all 11 forbidden pattern types clean in the fallback boundary.

Private leakage scan:

- Production smoke scan confirmed zero matches in initial HTML for: `_id`, `userId`, `orgId`, `tranzila`, `receipt`, `provider`, `token`, `secret`, `password`, `billing`, `adminOverride`, `anonymousId`.
- Fallback content sourced exclusively from `cardOgHtml.service.js` which enforces public-safe DTO projection. No private fields can appear.

`injectBodyFallback` helper:

- Uses exact string literal replace on `ROOT_MARKER = '<div id="root"></div>'` (not regex).
- Nested try/catch: outer catch handles head injection failure; inner catch handles body injection failure. Body injection failure degrades to head-injected HTML only — not bare SPA shell.

---

## 3. Architecture Truth as of 2026-06-01

### 3.1 Browser /card/:slug and /c/:orgSlug/:slug (non-social UA)

```
Browser request → Netlify Edge Function (og-preview.js)
  → serveCardEnrichedShell:
      1. Fetches backend /og/:slug for metadata
      2. Fetches SPA shell via context.next()
      3. Injects deterministic head (canonical, title, description, robots, og:*, twitter:*, JSON-LD FAQPage+LocalBusiness with data-cardigo-edge-ld="1")
      4. Injects visible semantic fallback body before <div id="root"></div>
      5. Returns enriched shell
      Cache-Control: public, max-age=60, stale-while-revalidate=300, Vary: User-Agent

↓ Browser receives enriched shell with:
  - Deterministic SEO head
  - Edge-marked JSON-LD (data-cardigo-edge-ld="1") × 2
  - Visible semantic fallback body (id="cardigo-body-fallback")
  - <div id="root"></div> EMPTY

↓ React runtime:
  main.jsx: rootEl.hasChildNodes() → false (root is empty) → createRoot(rootEl).render(app)

↓ PublicCard mounts, calls loadCard() API
  During API fetch: fallback body is visible to user
  After card data loads: cleanup useEffect fires → fallback.remove()
  Card UI renders inside #root

↓ SeoHelmet post-hydration:
  Detects data-cardigo-edge-ld="1" → suppresses duplicate JSON-LD (P2B-1)
  Suppresses selected duplicate non-JSON-LD meta tags (P2B-3)
  Final DOM: canonical=1, title=1, robots=0 (indexable), og:url=1, JSON-LD=2
```

### 3.2 Googlebot / Crawler /card/:slug and /c/:orgSlug/:slug

Same flow as browser (section 3.1). The Edge function does not distinguish browser from Googlebot for the CRAWLER/browser branch — both receive the same enriched shell via `serveCardEnrichedShell`.

Content visible to Googlebot = content visible to users. Not cloaking.

### 3.3 Social UA /card/:slug and /c/:orgSlug/:slug

```
Social bot request (facebookexternalhit, WhatsApp, Twitterbot, LinkedInBot, etc.)
→ og-preview.js SOCIAL branch (unchanged)
→ proxies to backend /og/card/:slug or /og/c/:orgSlug/:slug
→ returns full backend OG HTML directly
No fallback wrapper. No #root. No SPA shell.
Cache-Control: public, max-age=300, stale-while-revalidate=60, Vary: User-Agent
```

The social branch is completely unchanged by this workstream.

### 3.4 Direct /og routes

```
Direct GET /og/card/:slug or /og/c/:orgSlug/:slug
→ Backend route handler
→ cardOgHtml.service.js generates deterministic HTML
→ Returns full OG HTML with FAQPage + LocalBusiness JSON-LD, visible FAQ dt/dd, H1, etc.
No Edge fallback wrapper. No #root.
Cache-Control: no-cache
```

Direct `/og` routes are not intercepted by the Edge function. P2A-FIX added FAQPage + visible FAQ content to the backend service.

### 3.5 Unknown slug — browser

```
Browser GET /card/unknown-slug
→ Edge function: backend /og returns non-200
→ Falls through to SPA shell (no fallback injected for unknown slugs)
→ HTTP 200, SPA shell, empty #root
→ React loads, PublicCard fetches, gets 404, shows Hebrew error state
```

No fallback is injected for unknown slugs. The backend 404 causes the Edge function to skip body injection.

### 3.6 Unknown slug — Googlebot / crawler

```
Googlebot GET /card/unknown-slug
→ og-preview.js: backend /og returns non-200
→ HTTP 404, "Not found", Cache-Control: no-store
→ No SPA shell, no fallback
```

Anti-enumeration preserved.

---

## 4. What This Is and Is Not

### This IS:

- Deterministic Edge SEO head for browser and Googlebot initial HTML
- Edge-marked JSON-LD (FAQPage + LocalBusiness, `data-cardigo-edge-ld="1"`) in initial HTML
- Visible semantic fallback body (accessible, not hidden) before empty `#root`
- React card UI after API load
- Fallback cleanup after React card render
- Intermediate SEO-rendering foundation for `/card` and `/c` routes
- A meaningful improvement for GSC WRS indexing and crawlability

### This is NOT:

- Full React SSR body rendering
- Server-rendered CardLayout
- Server-rendered card UI
- Data island implementation (no card JSON embedded in initial HTML)
- Framework migration (still Vite React SPA)
- SSG for `/card` or `/c` routes
- A replacement for a full React SSR migration

Full React SSR remains HOLD. Any future SSR contour for `/card` and `/c` requires a separate P1 audit covering: data island / DTO scoping, CardLayout hydration, template/skin server rendering, cache and status propagation, and security surface.

---

## 5. Hydration and Cleanup Contract

This section is normative. Do not violate without a bounded Phase 1 audit.

### 5.1 main.jsx hydration branch (unchanged)

```js
// frontend/src/main.jsx — UNCHANGED
const rootEl = document.getElementById("root");
if (rootEl.hasChildNodes()) {
    hydrateRoot(rootEl, app);
} else {
    createRoot(rootEl).render(app);
}
```

This branch is driven by whether `#root` has child nodes in the initial HTML.

### 5.2 Why #root must remain empty

If any content is placed inside `#root` in the Edge-enriched HTML, `hasChildNodes()` returns `true` and `hydrateRoot` is called. `hydrateRoot` requires the server-rendered tree to exactly match the client component tree. If they do not match, React throws hydration error #418, #423, or #425 — causing a broken client-side render.

The fallback body is intentionally placed BEFORE `#root` (outside it) specifically to avoid this. The fallback is unmanaged by React.

### 5.3 PublicCard cleanup useEffect

The cleanup fires once after `card` state becomes truthy (card data loaded from API):

- Selects `document.getElementById("cardigo-body-fallback")`.
- Calls `.remove()`.
- Dependency array: `[card]`.

If `card` is never truthy (network error, 404, loading timeout), the cleanup never fires. The fallback remains visible. This is intentional — stale fallback content is better than a blank page.

### 5.4 data-cardigo-body-fallback="1" attribute contract

The `id="cardigo-body-fallback"` and `data-cardigo-body-fallback="1"` attribute are the stable cleanup anchors. Do not rename or remove without updating the `getElementById("cardigo-body-fallback")` call in `PublicCard.jsx`.

---

## 6. Preserved Branches and Untouched Surfaces

| Surface                                  | Status                                   | Notes                                                               |
| ---------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------- |
| `main.jsx` hydration branch              | UNTOUCHED                                | createRoot/hydrateRoot logic unchanged                              |
| `CardLayout.jsx`                         | UNTOUCHED                                | No structural changes                                               |
| All templates                            | UNTOUCHED                                | Template registry unchanged                                         |
| All skins                                | UNTOUCHED                                | No CSS variable changes                                             |
| `backend/src/routes/og.routes.js`        | UNTOUCHED                                | /og routes unchanged                                                |
| og-preview.js SOCIAL branch              | UNCHANGED                                | Social UA path unchanged within the file                            |
| `og-preview.js` CRAWLER marketing branch | UNCHANGED                                | /pricing, /blog, /guides, /cards, /contact crawler branch unchanged |
| Unknown slug matrix                      | UNCHANGED                                | Browser 200 SPA; Googlebot 404 no-store                             |
| `installPromptStore.js`                  | UNTOUCHED                                | PWA install store unchanged                                         |
| `useInstallPrompt.js`                    | UNTOUCHED                                | PWA install hook unchanged                                          |
| `Footer.jsx`                             | UNTOUCHED                                | Site footer wrapper unchanged                                       |
| `CardFooter.jsx`                         | UNTOUCHED                                | Card footer CTA unchanged                                           |
| All backend routes                       | UNTOUCHED (except cardOgHtml.service.js) | Only the OG HTML generator service was changed (P2A-FIX)            |

---

## 7. Security and Private Leakage

### 7.1 Fallback content source

The fallback body content is sourced exclusively from the backend `/og` HTML response body, specifically the `<main><article>` block extracted by `extractOgMainContent` and sanitized by `sanitizeOgBody`.

The `/og` response is generated by `cardOgHtml.service.js`, which enforces a public-safe DTO projection. Only public-facing card fields are included. Private fields such as `userId`, `orgId`, `billing`, `adminOverride`, and `anonymousId` are not in the `/og` DTO and cannot appear in the fallback.

### 7.2 Sanitizer coverage

`sanitizeOgBody` strips the following from fallback content:

- `<script>` and `</script>` blocks
- `<style>` and `</style>` blocks
- `<iframe>`, `<object>`, `<embed>`, `<form>` tags
- Inline `style=` attributes
- `on*=` event handler attributes
- `javascript:` URI occurrences
- `hidden` attribute
- `aria-hidden` attribute
- `inert` attribute

### 7.3 Production private leakage scan result

Production smoke scan confirmed zero matches across all 8 HTML response fixtures for:

```
_id, userId, orgId, tranzila, receipt, provider, token, secret,
password, billing, adminOverride, anonymousId
```

Result: CLEAN.

---

## 8. Production Verification Summary

### 8.1 Frontend gates (run from frontend/)

```
check:inline-styles  EXIT 0  PASS
check:skins          EXIT 0  PASS  (28 CSS modules scanned)
check:contract       EXIT 0  PASS  (25 templates verified)
build                EXIT 0  PASS
```

### 8.2 Production smoke — automated (2026-06-01)

A. Browser /card/:slug (fixture: /card/digitalyty):

- HTTP 200
- `fallbackPresent=True` — `<div id="cardigo-body-fallback">` found in initial HTML
- `fallbackBeforeRoot=True` — fallback appears before `<div id="root"></div>`
- `rootEmpty=True` — `<div id="root"></div>` is empty in raw HTML
- `h1Count=1` — H1 present in fallback
- `dtCount=5`, `ddCount=5` — FAQ items in fallback body
- `ldJsonCount=2`, `edgeLdCount=2` — FAQPage + LocalBusiness, both Edge-marked
- `canonicalCount=1`, `titleCount=1`, `robotsCount=0 (indexable)`
- Forbidden pattern scan on fallback boundary: ALL CLEAN (11 patterns)
- `Cache-Control: public, max-age=60, stale-while-revalidate=300, Vary: User-Agent`

B. Browser /c/:orgSlug/:slug (fixture: /c/digitalyty/digital-card):

- Same checks as A — all PASS

C. Social /card/:slug (facebookexternalhit UA):

- HTTP 200
- `hasFallback=False` — no fallback div (correct — social branch serves raw /og body)
- `hasRoot=False` — no #root (correct — raw OG HTML, not SPA shell)
- `ldJsonCount=2`, `dtCount=5`, `ddCount=5` — full backend OG body
- `Cache-Control: public, max-age=300, stale-while-revalidate=60, Vary: User-Agent`

D. Social /c/:orgSlug/:slug:

- Same checks as C — all PASS

E. Direct /og/card/:slug and /og/c/:orgSlug/:slug:

- HTTP 200
- `hasFallback=False` — no fallback wrapper
- `ldJsonCount=2`, `dtCount=5`, `ddCount=5` — deterministic OG HTML
- `Cache-Control: no-cache`

F. Unknown slug — browser:

- HTTP 200, SPA shell, `hasFallback=False`, `rootPresent=True`

F2. Unknown slug — Googlebot UA:

- HTTP 404, "Not found", `Cache-Control: no-store`

G. Private leakage scan — all 8 HTML fixtures:

- CLEAN — zero matches for all 13 sensitive field patterns

H. Manual browser DevTools (deferred to operator):

- Expected post-render: `fallbackPresent=false`, `rootChildCount=1` (React card UI), `JSON-LD scripts=2` (Edge-marked), `SEO meta counts=1 each`
- Not automated — requires real browser on production URL

I. Manual /c DevTools (deferred to operator):

- Same as H for org-card route

J. Temp file cleanup:

- All 16 temp files removed. `CLEAN_OK` confirmed.

---

## 9. Open Tails — Separate Future Contours

These items are identified as future work. None are blockers. Do not mix into this closed workstream.

1. CACHE_INVALIDATION_AFTER_CARD_EDIT_FOR_EDGE_FALLBACK_P1_AUDIT
   The Edge-cached enriched shell (`max-age=60`) may serve stale fallback body content for up to 60 seconds after a card owner edits their card. This is bounded and acceptable as current behavior. A future audit should determine whether a cache purge hook on card save events is warranted and what the tradeoff is with Googlebot recrawl frequency.

2. PUBLIC_CARD_DATA_ISLAND_FOR_FAST_HYDRATION_P1_AUDIT
   D1 establishes a visible fallback but React still requires an API call before the card UI renders. A data island (card JSON embedded in initial HTML at Edge render time) would eliminate the waterfall and make the fallback disappear immediately after mount. Requires DTO scoping audit, no private field leakage audit, and alignment with existing API contracts. This is a meaningful step toward full SSR.

3. FULL_REACT_SSR_BODY_DATA_ISLAND_P1_AUDIT — HOLD (not the default next step)
   Full React SSR for `/card` and `/c` requires: CardLayout hydration audit, template/skin server rendering audit, data island DTO contract, cache and status propagation, security surface review. High blast radius. Do not start without a full P1 audit and explicit architect approval.

4. PUBLIC_CARD_OG_CACHE_HARDENING_P1_AUDIT
   Review and harden the cache-control strategy for all `/card` and `/c` Edge responses — browser shell TTL, social /og TTL, and CDN cache-key behavior.

5. GSC WRS behavior monitoring
   Monitor Google Search Console for any WRS rendering errors or indexing anomalies after D1 deployment. If GSC shows unexpected rendering failures, open a new bounded contour.

6. SEO_PUBLIC_CARD_IMAGE_ALT_META_P2
   Still deferred. Scoped audit required — card fields are user-controlled.

7. PUBLIC_CARD_EDGE_FALLBACK_VISUAL_SWAP_P1_AUDIT
   The D1 fallback is plain semantic HTML, not styled CardLayout. On real production loads, the operator confirmed the fallback can be visible long enough to screenshot before the styled React card UI replaces it. This is accepted D1 behavior and not a rollback reason. Audit whether to reduce or eliminate the visible plain-fallback flash by using a data island, faster cleanup, loading-skeleton coordination, minimal static fallback CSS, or another safe approach. Must not use hidden SEO content, must not inject into #root, and must not reopen CardLayout/templates/skins casually. Full React SSR remains HOLD.

---

## 10. Anti-Regression Rules

The following rules are normative. Any proposed change that violates them requires a new bounded Phase 1 audit and explicit architect approval.

1. Do NOT place any content inside `<div id="root"></div>` in the Edge-enriched HTML. Any content in `#root` will trigger `hydrateRoot` in `main.jsx`, which requires a matching server/client tree. A mismatch causes React hydration errors #418, #423, or #425 and a broken client render.

2. Do NOT remove the `data-cardigo-body-fallback="1"` attribute from the injected fallback div without also updating the `getElementById("cardigo-body-fallback")` cleanup call in `PublicCard.jsx`. The cleanup depends on this ID as its anchor.

3. Do NOT add hidden presentation to the fallback body. The fallback must remain visible: no `hidden` attribute, no `aria-hidden`, no `inert`, no `display:none`, no `visibility:hidden`, no `opacity:0`. Hidden content visible only to crawlers is cloaking.

4. Do NOT change the `EDGE_LD_MARKER_SELECTOR` value in `SeoHelmet.jsx` or the `data-cardigo-edge-ld="1"` attribute in `og-preview.js` without a full P2B-1/P2B-2 cross-phase audit. These are coupled: the marker injected by P2B-2 is read by P2B-1 suppression.

5. Do NOT modify the SOCIAL branch in `og-preview.js` to inject the body fallback or serve the enriched SPA shell to social UAs. Social bots must continue to receive the raw backend `/og` body via the SOCIAL branch.

6. Do NOT claim this contour constitutes full SSR. CardLayout, templates, and skins are not server-rendered. The React card UI is client-rendered after API load.

7. Do NOT casually edit `CardLayout.jsx`, templates, or skins without a dedicated styling contour with frontend gates.

8. Do NOT remove the cleanup `useEffect` from `PublicCard.jsx` without a D1 contour re-audit. Removing it would cause the fallback body to persist indefinitely after React card render, creating duplicate visible content.

9. Do NOT modify `main.jsx` hydration branch without a full hydration architecture audit. The `hasChildNodes()` / `createRoot` / `hydrateRoot` logic is tightly coupled to the invariant that `#root` is empty in the Edge HTML.

10. Do NOT reopen MARKETING_SSG_INSTALL_CTA_HYDRATION_MISMATCH without a new bounded reason. The `mounted` gate in `InstallCta.jsx` is the correct fix. Do not remove the gate without a full SSG hydration audit.
