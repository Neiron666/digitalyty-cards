# Cardigo Handoff — Homepage Static OG Preview — CLOSED

Date: 2026-05-03
Contour: HOMEPAGE_STATIC_OG_PREVIEW
Status: CLOSED — production verified PASS

---

## Problem

Facebook/WhatsApp scrapers do not execute JavaScript. All homepage Open Graph, Twitter Card, canonical, and meta description tags were injected exclusively by react-helmet-async at runtime. Raw `frontend/index.html` and deployed `dist/index.html` contained no explicit OG metadata. Facebook Sharing Debugger reported og:image as "inferred/computed" rather than explicitly declared. WhatsApp preview showed no image or description.

---

## Fix

Static homepage crawler fallback metadata block added to `frontend/index.html` immediately after `<title>Cardigo</title>`, before `</head>`. One file changed. No backend changes. No SeoHelmet.jsx changes. No Home.jsx changes.

File changed: `frontend/index.html`
Anchor used: semantic string `<title>Cardigo</title>` (not hard-coded line numbers).

Compact contract comment co-located with the block:

    <!-- Static crawler fallback for Facebook/WhatsApp. Keep aligned with Home.jsx SeoHelmet homepage metadata. -->

Wording SSoT: `frontend/src/pages/Home.jsx` SeoHelmet call (title prop line 445, description prop line 446).

---

## Metadata Included

Tags added (all static, absolute URLs, no JS required):

- meta name="description"
- link rel="canonical" href="https://cardigo.co.il/"
- meta property="og:locale" content="he_IL"
- meta property="og:type" content="website"
- meta property="og:site_name" content="Cardigo"
- meta property="og:title" content="כרטיס ביקור דיגיטלי לעסקים | Cardigo"
- meta property="og:description"
- meta property="og:url" content="https://cardigo.co.il/"
- meta property="og:image" content="https://cardigo.co.il/images/og/cardigo-home-og-1200x630.jpg"
- meta property="og:image:secure_url" content="https://cardigo.co.il/images/og/cardigo-home-og-1200x630.jpg"
- meta property="og:image:width" content="1200"
- meta property="og:image:height" content="630"
- meta property="og:image:type" content="image/jpeg"
- meta property="og:image:alt" content="Cardigo – כרטיס ביקור דיגיטלי לעסקים"
- meta name="twitter:card" content="summary_large_image"
- meta name="twitter:title"
- meta name="twitter:description"
- meta name="twitter:image" content="https://cardigo.co.il/images/og/cardigo-home-og-1200x630.jpg"
- meta name="twitter:image:alt"

OG image: https://cardigo.co.il/images/og/cardigo-home-og-1200x630.jpg
Dimensions: 1200x630, image/jpeg, ~293 KB

OG image structured-property ordering (contiguous, required by Open Graph spec):
og:image → og:image:secure_url → og:image:width → og:image:height → og:image:type → og:image:alt

---

## Runtime Trade-off (Accepted)

react-helmet-async injects runtime equivalents for browsers (marked data-rh="true"). Static tags in index.html carry no data-rh attribute. Browsers after hydration see duplicate og:\* tags with identical values. This is an accepted P0 SPA crawler fallback trade-off. Deduplication is follow-up scope.

---

## Anti-Drift Policy

The contract comment names the SSoT for wording. If the homepage description or title is changed in `frontend/src/pages/Home.jsx`, `frontend/index.html` must be updated to match. A future `check:og-drift` CI script (Phase 4 follow-up) should automate this.

---

## Verification Results

Local source HTML check (PowerShell Select-String): PASS — all 20 required snippets present, vscodeArtifactCount=0, digitalytyCount=0, ogImageExactCount=1, ogImageSecureExactCount=1, twitterImageExactCount=1, canonicalLinkExactCount=1, ogUrlExactCount=1, ogImageStructuredOrder=True.

Local build: PASS — BUILD_EXIT:0, vite v7.3.1, 362 modules, dist/index.html 4.76 kB.

dist/index.html check: PASS — identical results to source check. Vite passes index.html through unmodified (positions identical: 2539, 2641, 2754, 2806, 2858, 2915).

Production raw HTML smoke (curl.exe -A "facebookexternalhit/1.1"): PASS — all 20 has\* checks true, digitalytyCount=0, vscodeArtifactCount=0.

Production OG image HEAD: PASS — HTTP 200, Content-Type: image/jpeg, Content-Length: 300052, served via Netlify Edge cache.

Production OG image structured order: PASS — allSixPresent=true, ordered=true, tokenCount=6, positions: 2547, 2649, 2762, 2814, 2866, 2923.

Facebook Sharing Debugger Scrape Again: PASS — og:image explicitly declared at 1200×630, no "inferred" warning, Hebrew description visible.

---

## Explicit Out of Scope (Not Fixed in This Contour)

- /card/:slug route-specific social previews
- /c/:orgSlug/:slug route-specific social previews
- blog and guides dynamic metadata
- SSR / prerender / edge head injection architecture
- SeoHelmet.jsx runtime deduplication / ogImageWidth/Height props hardening
- og:drift CI check script

---

## Next Recommended Contour

PUBLIC_ROUTE_SOCIAL_PREVIEW_ARCHITECTURE_P1

Scope: design and implement route-aware social preview for public card URLs (/card/:slug, /c/:orgSlug/:slug). Options: Netlify Edge Functions for head injection, or backend-generated per-route OG HTML fragments. Do not start in this handoff.
