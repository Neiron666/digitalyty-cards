# Cardigo Enterprise Handoff — 2026-06-20

## Site Analytics: Bot-Share Minimal Display (Admin-Only)

**Date:** 2026-06-20
**Status:** LOCAL CLOSED / PASS — Production pending deploy + smoke
**Contour ID:** `SITE_ANALYTICS_BOT_SHARE_MINIMAL`

---

## 1. Contours Closed

1. `SITE_ANALYTICS_BOT_SHARE_MINIMAL_P2A_BACKEND` — backend bot-share counters + path validation hardening
2. `SITE_ANALYTICS_BOT_SHARE_MINIMAL_P2B_FRONTEND_DISPLAY` — admin UI bot-share display

---

## 2. Executive Summary

General (mixed) `views` remains unchanged in definition: every accepted page-view event increments it regardless of bot status. No existing analytics formulas were altered. No bots are removed from view counts.

What was added: two additive persistent counters on `SiteAnalyticsDaily` (`botViews`, `botKindCounts`) that allow the admin to see how much of total traffic was detected as bot/crawler/scanner traffic, without changing the baseline view metric.

On the path-validation side: `malformed pagePath` inputs (Hebrew in slug, full URLs, unmapped routes) now return 204 early via a new `isAllowedPublicPath` guard. `/c/*` org-card routes and `/og/*` OG-preview routes are now explicitly server-side excluded from site analytics ingestion (they were not tracked in practice but were silently accepted before).

---

## 3. Files Changed

| File                                                       | Role                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend/src/models/SiteAnalyticsDaily.model.js`           | Added `botViews: Number` and `botKindCounts: Map<String,Number>` fields. Added `BOT_KIND_MAX_KEYS = 15` static constant.                                                                                                                                                                                                                                                                            |
| `backend/src/controllers/siteAnalytics.controller.js`      | Added `isAllowedPublicPath()` guard with `isSafeAsciiSlug()` (char-code loop, no regex). Added `BOT_UA_PATTERNS` (18 entries). Added `classifyUA()`. Added `/c/`, `/og/` to `EXCLUDED_PREFIXES` and `EXCLUDED_EXACT`. Added `malformed_pagePath` to `DIAGNOSTIC_REASONS`. Bot classification now increments `botViews` and `botKindCounts.{kind}` inside `tryUpsertVisit` for accepted view events. |
| `backend/src/controllers/adminSiteAnalytics.controller.js` | `kpiFromTotals()` now computes and returns `botViews` and `botShare`. `.select()` includes `botViews` and `botKindCounts`. Aggregation loop sums `botViewsTotal` and `sumInto(botKindCounts, ...)`. Summary and sources responses include new additive fields.                                                                                                                                      |
| `frontend/src/pages/admin/AdminAnalyticsView.jsx`          | Added `BOT_KIND_LABELS` map (12 keys). Derives `botViews`, `botShare`, `botSharePercent` from `summary.kpi` with safe fallbacks. Added `botKindRows` useMemo from `sources.botKindCounts`. Bot sub-row rendered inside the "צפיות" KPI card. Helper text and breakdown block rendered conditionally in "מדדי מפתח" section.                                                                         |
| `frontend/src/pages/admin/AdminAnalyticsView.module.css`   | Added 4 new classes: `.botSubSep`, `.botSubValue`, `.botInfoText`, `.botBreakdown`. All Flex-only, all font sizes via `var(--fs-*)` tokens.                                                                                                                                                                                                                                                         |

---

## 4. Architecture — What Changed

### Backend: UA classification (analytics only)

`classifyUA(rawUA)` is a pure function that loops over `BOT_UA_PATTERNS` (18 pattern/kind pairs) using `String.prototype.includes`. It returns `{ isBot: boolean, botKind: string }`. The raw `userAgent` string is a local variable only — it is NOT stored in any Mongo collection.

Bot kinds (normalized keys): `googlebot`, `adsbot_google`, `bingbot`, `ahrefsbot`, `semrushbot`, `yandexbot`, `dotbot`, `lighthouse`, `pagespeed`, `headless`, `social_bot`, `other_bot`.

This classification is for analytics display ONLY. It is NOT a security trust boundary. Spoofed UAs are still accepted.

### Backend: pagePath validation

`isAllowedPublicPath(pagePath)` applies a three-tier check:

1. Exact match against `ALLOWED_EXACT_PATHS` (`/`, `/cards`, `/cards/`, `/pricing`, `/pricing/`, `/contact`, `/contact/`, `/blog`, `/blog/`, `/guides`, `/guides/`).
2. Pagination match: `/blog/page/:n` and `/guides/page/:n` where `:n` is digits only, max 6 digits.
3. Slug match: `/blog/:slug` and `/guides/:slug` where slug passes `isSafeAsciiSlug()` (a-z, A-Z, 0-9, hyphen only; charCode loop; maxLen 120).

Paths failing all three tiers → `incDiagnostics("malformed_pagePath")` → 204 early return. This prevents accidental ingestion of Hebrew slugs, full URLs, or misconfigured SPA paths.

`EXCLUDED_PREFIXES` now includes `/c/` and `/og/` (org-card and OG-preview routes must never appear in site analytics). `EXCLUDED_EXACT` includes `/c` and `/og` as defense-in-depth.

### Backend: DB writes

`botViews` increments ONLY when `isBot === true` AND `event === "view"`. `views` increments for ALL accepted view events (bots included) — this is unchanged behavior. `botKindCounts.{kind}` increments when `isBot === true` using `safeKey(botKind, { maxLen: 20 })`. Raw userAgent is NEVER written to any collection.

### Admin API — additive fields

`GET /api/admin/site-analytics/summary`:

- `kpi.botViews` (Number) — sum of botViews over range
- `kpi.botShare` (Number, fraction 0–1) — botViews / views, or 0 when views = 0
- `today.botViews`, `today.botShare` — same fields for today's row
- `series[].botViews` — per-day bot view count

`GET /api/admin/site-analytics/sources`:

- `botKindCounts` (Object) — aggregated bot kind breakdown over range

No fields were removed or renamed. All additions are backward-additive. Old clients that do not read these fields are unaffected.

### Frontend

Bot sub-row inside "צפיות" KPI card:

- Label: "מתוכן סריקות בוטים"
- Value: `botViews` (number, 0 when absent)
- Percent: `{botSharePercent}% מכלל הצפיות`

Helper text (caption-size, muted): "הצפיות הכלליות כוללות גם סריקות טכניות. כאן מוצג כמה מתוכן זוהו כרובוטים."

Breakdown card "סריקות לפי רובוט": renders only when `sources.botKindCounts` has at least one entry with count > 0. Rows sorted descending by count. Uses `BOT_KIND_LABELS[key] ?? key` for readable labels.

All existing sections (מקורות, ביקורים לפי מקור, פופולרי, UTM, referrers, AI sources) unchanged.

---

## 5. What Did NOT Change

- `views` field semantics — remains total mixed views (human + bot)
- Conversion formula (`clicksTotal / views`) — unchanged
- `humanViews` — not introduced
- Bot top pages — not tracked in this contour
- `SiteAnalyticsVisit` model — unchanged
- `SiteAnalyticsDaily` existing fields (`views`, `clicksTotal`, `channels`, `pagePathCounts`, etc.) — unchanged
- gclid / paid attribution — not touched
- OG-preview, robots.txt, sitemap — not touched
- Auth, billing, org, card, payment — not touched
- DB migrations — none required (Mongoose adds new Map fields on first upsert; legacy documents that lack `botViews` / `botKindCounts` are treated as 0 in read code via `botViews = 0` default and `sumInto` guard)
- Index definitions — no new indexes added
- Analytics ingestion endpoint contracts — 204-always behavior preserved

---

## 6. Verification Summary

### Backend local tests (direct controller, local MongoDB `cardigo_p3_test`)

| Test | Path                               | UA            | Expected                                      | Actual |
| ---- | ---------------------------------- | ------------- | --------------------------------------------- | ------ |
| T1   | `/cards`                           | Human Chrome  | 204, views++, botViews unchanged              | PASS   |
| T2   | `/blog/free-digital-business-card` | Googlebot     | 204, views++, botViews++, bkc.googlebot++     | PASS   |
| T3   | `/cards`                           | AdsBot-Google | 204, views++, botViews++, bkc.adsbot_google++ | PASS   |
| T4   | `/guides/seo`                      | bingbot       | 204, views++, botViews++, bkc.bingbot++       | PASS   |
| T5   | `/blog/כרטיס`                      | Chrome        | 204, no write (malformed_pagePath)            | PASS   |
| T6   | `https://cardigo.co.il/cards`      | Chrome        | 204, no write (invalid_pagePath)              | PASS   |
| T7   | `/admin`                           | Chrome        | 204, no write (malformed_pagePath)            | PASS   |
| T8   | `/card/test-card`                  | Chrome        | 204, no write (card_denied)                   | PASS   |
| T9   | `/c/test-org/test-card`            | Chrome        | 204, no write (excluded_pagePath)             | PASS   |
| T10  | `/og/card/test`                    | Chrome        | 204, no write (excluded_pagePath)             | PASS   |

Final DB state confirmed: `views:5 botViews:4 botKindCounts:{"googlebot":1,"adsbot_google":1,"bingbot":1}` — DBFINAL_EXIT:0

Admin API direct call (local DB, range=7): `kpi_botViews:4 kpi_botShare:0.8 today_botViews:4 sources_botKindCounts:{"googlebot":1,"adsbot_google":1,"bingbot":1}` — ADMIN_EXIT:0. No `userAgent` in any response body.

### Frontend static verification

- Missing backend fields (botViews/botShare absent): renders 0 / 0% safely, breakdown hidden — PASS
- Populated bot data (botViews=7, botShare=0.225806): renders "7" and "22.6% מכלל הצפיות", breakdown shows Googlebot/AdsBot-Google/Bingbot — PASS
- Zero bots (botViews=0, botKindCounts={}): renders 0 / 0%, breakdown hidden — PASS
- No raw userAgent / deviceHash / visitHash in any rendered output — PASS
- No inline styles, no CSS Grid, all font-size via var(--fs-\*) — PASS

### Gates (all EXIT:0)

- `check:inline-styles` PASS EXIT:0
- `check:skins` PASS EXIT:0
- `check:contract` PASS EXIT:0
- `build` (client + ssr + ssg + ssg-output) PASS EXIT:0
- `sanity:imports` `{"ok":true,"importedCount":20,"failedCount":0,"failures":[]}` EXIT:0

---

## 7. Production Rollout Plan

1. Deploy backend + frontend together (single deploy).
2. Open `/admin` → "אנליטיקה" tab.
3. Verify the "מתוכן סריקות בוטים" sub-row is visible inside the "צפיות" KPI card.
4. If traffic exists in range: verify bot count > 0 and bot share displays as a reasonable percentage.
5. Verify "סריקות לפי רובוט" breakdown appears when botKindCounts has entries.
6. Verify all existing sections (מקורות, UTM, ביקורים לפי מקור, פופולרי) are still present and correct.
7. Verify no browser console errors on the admin analytics page.
8. Call `GET /api/admin/site-analytics/summary?range=7` and confirm response includes `kpi.botViews`, `kpi.botShare`.
9. Call `GET /api/admin/site-analytics/sources?range=7` and confirm response includes `botKindCounts`.
10. Do NOT run POST tests against `/api/site-analytics/track` on production without explicit approval.

---

## 8. Known Limitations

- **Historical data:** Documents created before this deploy have `botViews = 0` (field absent). Read code treats absent `botViews` as 0. Bot share for historical periods will appear as 0% even though those views included bots. This is expected and correct — no retroactive reclassification is performed.
- **UA-based classification:** Bot detection is based on `User-Agent` string matching. It is NOT a security trust boundary. A spoofed or custom UA will be classified as human. This is analytics-grade classification only.
- **`other_bot` fallback not yet used:** The `BOT_UA_PATTERNS` list covers 18 known patterns. UA strings that do not match any pattern are classified as human. A future contour can add `other_bot` catchall logic if desired.
- **`botKindCounts` cap:** `BOT_KIND_MAX_KEYS = 15` is defined as a static constant but the cap enforcement is documented as a future guard. The current 12 mapped kinds are well within the cap.
- **gclid attribution:** Paid click classification is a separate future contour (`SITE_ANALYTICS_GCLID_PAID_ATTRIBUTION_P1_AUDIT`).
- **Bot top pages:** Not tracked in this minimal contour. Adding bot-specific `pagePathCounts` is a separate optional future enhancement.

---

## 9. Future Contours

- `SITE_ANALYTICS_GCLID_PAID_ATTRIBUTION_P1_AUDIT` — pending audit and implementation
- Optional: bot top pages / human-only conversion as a later analytics enhancement
- Optional: admin reconciliation for `other_page` / topPages correction
- Optional: `other_bot` UA catchall if coverage gaps are observed in production
