# Cardigo Enterprise Handoff — SSR Real Route Production Rollout — Closed

**Date:** 2026-07-05
**Status:** SSR_REAL_ROUTE_PRODUCTION_ROLLOUT = CLOSED / PASS / PRODUCTION VERIFIED

---

## 1. Contour Summary

Real public card routes `/card/:slug` and `/c/:orgSlug/:slug` now deliver full React SSR HTML with a sanitized data island for browser and Googlebot paths. Social UAs continue to receive raw backend OG HTML (unchanged). Direct `/og/*` paths remain proxy-routed (unchanged). The isolated preview route `/__card-ssr-preview` continues to work with `X-Cardigo-Ssr: 1` and `X-Robots-Tag: noindex`.

---

## 2. Production Routing Truth

| Route                             | Handler                                                      |
| --------------------------------- | ------------------------------------------------------------ |
| `/card/*` (browser/Googlebot GET) | Edge enrichment (og-preview.js) + card-ssr Netlify Function  |
| `/c/*` (browser/Googlebot GET)    | Edge enrichment (og-preview.js) + card-ssr Netlify Function  |
| `/card/*` (social UA GET)         | Edge SOCIAL branch → raw `/og/card/:slug` backend HTML       |
| `/c/*` (social UA GET)            | Edge SOCIAL branch → raw `/og/c/:orgSlug/:slug` backend HTML |
| `/og/*`                           | proxy → backend /og/\* (unchanged)                           |
| `/__card-ssr-preview?path=...`    | card-ssr Netlify Function (preview mode, noindex)            |

`_redirects` lines 7-8 (current production):

```
/card/*       /.netlify/functions/card-ssr/card/:splat   200
/c/*          /.netlify/functions/card-ssr/c/:splat      200
```

---

## 3. UA Behavior Matrix

| UA class                                       | /card/:slug and /c/:orgSlug/:slug behavior                                                          |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Browser                                        | Edge enriches card-ssr SSR response; full SSR HTML in #root + data island + Edge-injected head tags |
| Googlebot / bingbot                            | Same as browser                                                                                     |
| Social bot (Facebook, WhatsApp, Twitter, etc.) | Edge SOCIAL branch; raw `/og/*` backend HTML; no data island; Cache-Control: public max-age=300     |
| Direct `/og/*`                                 | proxy → backend; not SSR-routed                                                                     |

---

## 4. Noindex / Indexability Policy

| Context                                                 | X-Robots-Tag                                                                                                                          |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Published real `/card/*` and `/c/*` (browser/Googlebot) | ABSENT — indexable                                                                                                                    |
| Unknown slug `/card/*` or `/c/*`                        | `noindex` (function returns 404 + noindex)                                                                                            |
| `/__card-ssr-preview?path=...`                          | `noindex` (always, preview mode)                                                                                                      |
| All failure/error branches (400/404/410/503/500)        | `noindex`                                                                                                                             |
| Netlify Deploy Preview platform                         | Global platform noindex on ALL Deploy Preview responses — this is expected Netlify platform behavior and is NOT present in production |

---

## 5. Data Island Privacy Policy

The SSR data island uses the sanitized public card DTO only:

- Built from `PUBLIC_CARD_SSR_TOP_LEVEL_ALLOWLIST` (slug, status, isActive, business, contact, content, businessHours, bookingSettings, faq, design, gallery, reviews, seo, seoResolved, publicPath, ogPath, entitlements).
- 17 forbidden top-level keys removed (billing, adminOverride, effectiveBilling, effectiveTier, etc.).
- Design `*Path` storage paths removed; gallery path/thumbPath/storagePath removed.
- Entitlements filtered to 8 public keys only.
- `assertNoForbiddenSsrPayloadFields` assertion runs before any data is served.
- Production privacy scan result: 0 matches for all forbidden markers.

---

## 6. Production Smoke Results (2026-07-05, ALL PASS)

| Check                                     | /card/digitalyty | /c/zman-lhofsha/vacation-deals |
| ----------------------------------------- | ---------------- | ------------------------------ |
| HTTP status                               | 200              | 200                            |
| div count (full card render)              | 46               | 45                             |
| title count                               | 1                | 1                              |
| canonical count                           | 1                | 1                              |
| og:title count                            | 1                | 1                              |
| JSON-LD script count                      | 2                | 2                              |
| X-Robots-Tag                              | ABSENT           | ABSENT                         |
| data island present                       | YES              | YES                            |
| privacy scan (forbidden fields)           | 0 matches        | 0 matches                      |
| social UA OG HTML (no data island)        | PASS             | PASS                           |
| direct /og/card/: 200 no-cache no noindex | PASS             | —                              |
| unknown personal/org routes: 404 noindex  | PASS             | PASS                           |

---

## 7. Deploy Preview Noindex Clarification

During Deploy Preview verification, `X-Robots-Tag: noindex` appeared on ALL responses (homepage, static pages, SSR routes, OG routes). This is Netlify platform behavior: Netlify automatically adds a global noindex header to all Deploy Preview and branch deploy responses to prevent crawler indexing of staging URLs. This header is NOT present in production. It is not a code or configuration issue.

---

## 8. Rollback Plan

To revert to pre-SSR routing:

1. Restore `frontend/public/_redirects` lines 7-8 to:
    ```
    /card/*       /spa-shell.html   200
    /c/*          /spa-shell.html   200
    ```
2. Restore `frontend/scripts/check-ssg-output.mjs` `REQUIRED_RULES` entries for `/card/*` and `/c/*` back to `SPA shell 200`, and restore `EXPECTED_SPA_SHELL_SOURCES` to include `/card/*` and `/c/*`.
3. Run `npm run build` to confirm BUILD_EXIT:0.
4. Commit and deploy.
5. Verify: `/card/digitalyty` returns empty `#root` (SPA shell, no data island).

Do not use destructive git operations. Do not force-push or reset published commits.

---

## 9. Monitoring Notes

- **Function logs:** Should show only `Duration` and `Memory Usage` lines after normal card route requests.
- **CARD_SSR_PREVIEW_FAILED in logs:** If present, indicates backend connectivity/env issue (CARDIGO_SSR_BACKEND_ORIGIN or CARDIGO_PROXY_SHARED_SECRET missing or backend outage).
- **Stack traces in logs:** Should never appear for routine requests. Indicates code or bundle issue.
- **TTFB monitoring:** card route TTFB may be higher than SPA shell (Lambda cold start ~100-500ms). Track as separate operator concern if needed.
- **GSC reindexing:** After monitoring period, may request re-crawl via Google Search Console URL Inspection for key published cards.

---

## 10. Anti-Regression Rules

- Do NOT revert routing without a bounded Phase 1 audit and operator approval.
- Do NOT serve SSR body for social UAs (social must receive raw `/og/*` backend HTML).
- Do NOT bypass the SSR sanitizer (`sanitizePublicCardForSsr` + `assertNoForbiddenSsrPayloadFields`).
- Do NOT add `X-Robots-Tag: noindex` to real route 200 success responses (function must omit it for `isRealRoute=true`).
- Do NOT change the `/__card-ssr-preview` noindex policy.
- Do NOT reopen SSR rollout contour without proven regression.

---

## 11. Future Follow-Up (Not Blocking)

- Performance monitoring for card route TTFB — can be tracked as separate operator concern.
- GSC re-crawl request — separate operator action after monitoring period.
- Further privacy allowlist hardening — can be a separate bounded contour if needed.
- Do not reopen SSR rollout unless regression is proven in production smoke or function logs.

---

## 12. Canonical References

- Routing source: `frontend/public/_redirects` lines 7-8
- SSR function: `frontend/netlify/functions/card-ssr.mjs`
- Edge function: `frontend/netlify/edge-functions/og-preview.js`
- SSR entry: `frontend/src/entry-server-card.jsx`
- Sanitizer: `sanitizePublicCardForSsr` + `assertNoForbiddenSsrPayloadFields` in card-ssr.mjs
- Build gate: `frontend/scripts/check-ssg-output.mjs`
- Active SSoT: `docs/runbooks/seo-public-indexability-runbook.md` Section 23
