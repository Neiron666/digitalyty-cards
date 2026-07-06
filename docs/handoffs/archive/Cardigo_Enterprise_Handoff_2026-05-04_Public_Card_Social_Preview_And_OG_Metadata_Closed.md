# Cardigo Enterprise Handoff — Public Card Social Preview & OG Metadata Quality — CLOSED

**Date:** 2026-05-04
**Contour 1:** PUBLIC_CARD_SOCIAL_PREVIEW_EDGE_ROUTING — CLOSED / PRODUCTION PASS
**Contour 2:** OG_ROUTES_CARD_METADATA_QUALITY — CLOSED / PRODUCTION PASS
**Status:** Both contours production-verified. No follow-up implementation required.

---

## 1. Problem

Public card URLs (`/card/:slug`, `/c/:orgSlug/:slug`) are the primary social-sharing surface for Cardigo users. Facebook, WhatsApp, LinkedIn, Telegram, Discord, and similar crawlers fetch these URLs to generate link previews.

Before this fix:

- All requests to `/card/*` and `/c/*` — regardless of User-Agent — received the Vite SPA shell (`index.html`). SPA HTML contains no card-specific OG metadata. Crawlers saw only the static homepage fallback tags (or nothing).
- The backend `/og/card/:slug` and `/og/c/:orgSlug/:slug` endpoints already existed and generated card-specific OG HTML. But social crawlers never reached them because there was no routing layer to intercept crawler requests at the public card URLs.
- A secondary metadata quality tail existed in `backend/src/routes/og.routes.js`: even when the backend was reached directly, `og:title` could produce the generic string `"כרטיס ביקור דיגיטלי – Cardigo"` (when `card.seo.title` was unset or held the default value), `og:image:alt` was absent, and `og:image:secure_url` / structured image width/height/type tags were missing.

---

## 2. Edge Function Solution

**File:** `frontend/netlify/edge-functions/og-preview.js`

A Netlify Edge Function intercepts social preview crawler requests at the Netlify CDN edge, before any SPA serving occurs. It proxies the request to the backend `/og/*` equivalent route and returns the backend-generated OG HTML directly to the crawler.

Key properties:

- Inline `export const config` targets only `/card/*` and `/c/*` paths, matching only the social preview UA allowlist (facebookexternalhit, Facebot, WhatsApp, Twitterbot, LinkedInBot, TelegramBot, Slackbot, Slack-ImgProxy, Discordbot, Pinterest, vkShare). No UA outside this list triggers the Edge Function.
- Normal browser requests (Mozilla/Chrome/Safari/etc.) pass through to existing Netlify `_redirects` SPA fallback rules unaffected.
- Googlebot, Bingbot, and generic bots are NOT in the allowlist and receive the SPA shell as before.
- No `netlify.toml` was created. The function registers itself via its inline `config`.
- `_redirects` was not modified.
- The Edge Function performs no DB reads and no card data fetches. It is a pure HTTP proxy.
- The function constructs the upstream URL as `backendOrigin + /og/card/:slug` or `backendOrigin + /og/c/:orgSlug/:slug`, forwarding the proxy secret header (`x-cardigo-proxy-secret`).
- 404 and 410 responses from the backend are passed through transparently to the crawler.
- Unexpected backend errors or fetch failures fail open: the Edge Function returns the SPA shell, preventing a broken user experience.

**No other frontend files were modified.**

---

## 3. Backend OG Metadata Quality Solution

**File:** `backend/src/routes/og.routes.js`

Four module-scope helpers were added between `escapeHtml` and the Blog OG section. Both the personal card handler (`router.get("/og/card/:slug")`) and the org card handler (`router.get("/og/c/:orgSlug/:slug")`) were updated to use a single shared helper.

### 3.1 Helpers added

`GENERIC_CARD_OG_TITLES` (Set):
Four known generic/default title strings that must be treated as empty:

- `"כרטיס ביקור דיגיטלי"`
- `"כרטיס ביקור דיגיטלי – Cardigo"`
- `"כרטיס ביקור דיגיטלי | Cardigo"`
- `"Cardigo"`

`normalizeMetaText(value, maxLength)`:
Collapses whitespace, trims, and optionally slices. Pure synchronous string operation.

`isGenericCardOgTitle(value)`:
Returns true if the normalized value is in `GENERIC_CARD_OG_TITLES`.

`buildCardOgMetadata(card, siteUrl)`:
Shared SSoT helper for both card OG handlers. Returns `{ title, description, image, imageMetaHtml }`.

### 3.2 Metadata quality policy (live in production)

**Title policy:**

1. Use `card.seo.title` if set AND not in `GENERIC_CARD_OG_TITLES`.
2. Else use `card.business.name + " – כרטיס ביקור דיגיטלי"` if `business.name` is set.
3. Else use `"כרטיס ביקור דיגיטלי"` (generic fallback).

**Description policy (160-char cap per tier):**

1. `card.seo.description`
2. `card.content.description`
3. `card.content.aboutText`
4. `"כרטיס ביקור דיגיטלי לעסקים – Cardigo"` (generic fallback)

**Image priority:**

1. `card.design.coverImage`
2. `card.design.logo`
3. `https://cardigo.co.il/og-default.jpg` (fallback image)

**`og:image` structured block (`imageMetaHtml`):**

- `og:image` always emitted.
- `og:image:secure_url` emitted for all HTTPS images (Supabase URLs are always HTTPS).
- `og:image:width` / `og:image:height` / `og:image:type` emitted **only** for the `/og-default.jpg` fallback (1200, 630, image/jpeg). Supabase user-uploaded image dimensions are not guessed or probed.
- `og:image:alt` always emitted. Value: `businessName + " – Cardigo"` if `business.name` set, else `"Cardigo – כרטיס ביקור דיגיטלי לעסקים"`.
- All values are escaped through `escapeHtml`.

**Performance invariants:**

- No new DB queries.
- No image fetch or image probing network calls.
- No async operations added to the helper.
- Helper is pure synchronous string operations — O(1) for any card.

### 3.3 Guards unchanged

The following guards were not modified and remain intact:

- Personal `/og/card/:slug`: card 404 guard, trial 410 guard.
- Org `/og/c/:orgSlug/:slug`: orgSlug/slug 404, org existence 404, card existence 404, **membership anti-enumeration gate** (`ownerMember?._id` check before any distinguishable response), trial 410.

---

## 4. Production Verification Results

**Date:** 2026-05-04

All tests run with `curl.exe` from PowerShell against `https://cardigo.co.il`. No files were modified during verification.

```
S0  /api/health                                                             HTTP 200
S1  /og/card/cardigo        Facebook UA    Backend OG HTML     PASS
S2  /card/cardigo           Facebook UA    Backend OG HTML     PASS (via Edge Function)
S3  /card/cardigo           WhatsApp UA    Backend OG HTML     PASS (via Edge Function)
S4  /card/cardigo           Mozilla UA     SPA shell           PASS (id="root" present)
S5  /og/c/digitalyty/draft-41d469-eae8ac  Facebook UA  Backend OG HTML  PASS
S6  /c/digitalyty/draft-41d469-eae8ac    Facebook UA  Backend OG HTML  PASS (via Edge Function)
S7  /og/card/nonexistent-zzz-99999  Facebook UA   HTTP 404     PASS
S8  /card/nonexistent-zzz-99999     Facebook UA   HTTP 404     PASS
S9  /card/cardigo           Googlebot UA   SPA shell           PASS (not intercepted by Edge)
S10 /og-default.jpg                        HTTP 200 image/jpeg PASS
```

**OG metadata extracted from `/og/card/cardigo` (Facebook UA):**

- `og:title`: `neiron666: בניית אתרים במגדל העמק – הופכים חזון להצלחה` (card-specific seo.title, not generic)
- `og:description`: card-specific (seo.description used)
- `og:image`: Supabase `.webp` background URL
- `og:image:secure_url`: same Supabase URL (HTTPS, correctly emitted)
- `og:image:alt`: `neiron666 – Cardigo` (business.name pattern)
- `og:image:width` / `og:image:height` / `og:image:type`: absent (Supabase user image, correct)

**OG metadata extracted from `/og/c/digitalyty/draft-41d469-eae8ac` (Facebook UA):**

- `og:title`: `Cardigo Digitalyty – כרטיס ביקור דיגיטלי` (business.name fallback, correct)
- `og:image:alt`: `Cardigo Digitalyty – Cardigo`
- `og:image:secure_url`: Supabase URL present

**Facebook Sharing Debugger (Scrape Again):**

- `https://cardigo.co.il/card/cardigo` showed card-specific title/description/image, not the generic `"כרטיס ביקור דיגיטלי – Cardigo"`.

---

## 5. Security / Anti-Enumeration Invariants Preserved

- Draft, unpublished, deleted, and nonexistent card slugs return HTTP 404. No existence leakage.
- Org card anti-enumeration: revoked or inactive org members' cards return 404, not 410 or card content.
- Trial-expired, non-entitled cards return 410. This occurs **after** the membership gate in the org handler.
- The Edge Function forwards no cookies and no Authorization headers from the browser to the backend.
- The proxy secret (`x-cardigo-proxy-secret`) is forwarded from Edge to backend only (operator-controlled, not browser-accessible).
- No auth, payment, billing, or admin paths were changed.
- No secret values appear in this document.

---

## 6. Performance Notes

- No frontend bundle size impact. Edge Functions are deployed separately by Netlify, not bundled with the SPA.
- Browser requests (non-bot UA) bypass the Edge Function entirely due to the UA-scoped inline config. No edge latency added to normal traffic.
- Backend metadata helper adds only synchronous string operations to the existing `/og/card/:slug` and `/og/c/:orgSlug/:slug` request handling path. No additional DB round trips.
- No Supabase API calls, image-dimension probing, or network requests in the metadata helper.
- Successful Edge OG responses are cacheable at the CDN edge. A 300-second cache TTL on successful OG responses is acceptable for social preview use cases.

---

## 7. Files Changed

```
frontend/netlify/edge-functions/og-preview.js   CREATED
backend/src/routes/og.routes.js                  MODIFIED (4 helpers added, 2 handler metadata blocks replaced)
```

No other files were modified. Specifically, `_redirects`, `netlify.toml`, `frontend/index.html`, `vite.config.js`, and all other backend routes were not touched.

---

## 8. Explicit Out of Scope / Future Contours

The following were explicitly deferred and must not be assumed as part of this closure:

- Google Search Console technical SEO — structured snippets, favicon, Rich Results.
- Blog and guides route-aware social previews (`/blog/:slug`, `/guides/:slug`).
- Static marketing route social fallbacks beyond homepage.
- `SeoHelmet.jsx` runtime structured image prop hardening or deduplication.
- Full SSR / SSG / prerender migration.
- Automatic social cache invalidation triggered by card edits.
- `fb:app_id` registration and Meta app governance.
- Free-tier card noindex vs. OG preview policy decision.
- `seo-scripts.md` bot-context wording cleanup (stale L12 claim about SPA+Helmet for bot UAs).
- `docs_blog_seo_og_runbook.md` stale gate reference cleanup.

---

## 9. Supersedes / Related Docs

- `docs/handoffs/current/Cardigo_Handoff_2026-05-03_Homepage_Static_OG_Preview_Closed.md` — that handoff explicitly deferred public card social preview (L94-107) and named `PUBLIC_ROUTE_SOCIAL_PREVIEW_ARCHITECTURE_P1` as the next contour. That contour is now closed by this document.
- `docs/policies/POLICY_ORGS.md` — route invariants (`/og/card/:slug`, `/og/c/:orgSlug/:slug`) remain valid and are not changed by this work.
