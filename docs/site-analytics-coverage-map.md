# Site Analytics - Coverage Map (Marketing Pages)

Scope: marketing site pages only (not `/card/*`, not `/admin`, not `/edit`).

## Page Views (trackSitePageView)

| Page     | File                            | trackSitePageView() | Notes                |
| -------- | ------------------------------- | ------------------: | -------------------- |
| Home     | frontend/src/pages/Home.jsx     |                  ✅ | Called once on mount |
| Pricing  | frontend/src/pages/Pricing.jsx  |                  ✅ | Called once on mount |
| Guides   | frontend/src/pages/Guides.jsx   |                  ✅ | Called once on mount |
| Cards    | frontend/src/pages/Cards.jsx    |                  ✅ | Called once on mount |
| Blog     | frontend/src/pages/Blog.jsx     |                  ✅ | Called once on mount |
| BlogPost | frontend/src/pages/BlogPost.jsx |                  ✅ | Called once on mount |
| Contact  | frontend/src/pages/Contact.jsx  |                  ✅ | Called once on mount |

## Click Intents (trackSiteClick)

### Contact

| CTA            | Current tracking | Action                           | pagePath |
| -------------- | ---------------: | -------------------------------- | -------- |
| Email (mailto) |               ✅ | SITE_ACTIONS.contact_email_click | /contact |

No other CTAs (tel/WhatsApp/social) are present in the current Contact page.

### Blog

| CTA           | Current tracking | Action                          | pagePath |
| ------------- | ---------------: | ------------------------------- | -------- |
| Article click |               ✅ | SITE_ACTIONS.blog_article_click | /blog    |

Fires from `frontend/src/pages/Blog.jsx` on article card click. Routed through `trackSiteClick` → first-party backend → dataLayer bridge.

### Guides

| CTA           | Current tracking | Action                           | pagePath |
| ------------- | ---------------: | -------------------------------- | -------- |
| Article click |               ✅ | SITE_ACTIONS.guide_article_click | /guides  |

Fires from `frontend/src/pages/Guides.jsx` on guide card click. Routed through `trackSiteClick` → first-party backend → dataLayer bridge.

## First-Party → GTM DataLayer Bridge

`trackSiteClick()` in `frontend/src/services/siteAnalytics.client.js` calls the internal first-party backend and **also** pushes to GTM `dataLayer` via `pushToDataLayer(eventName, pagePath)`. This bridge was added as a bounded contour (P0-A) so that click-intent signals (including `blog_article_click`, `guide_article_click`) are observable by GTM tags.

Bridge payload shape:

```json
{
    "event": "cardigo_event",
    "event_name": "<SITE_ACTIONS key>",
    "page_path": "<pagePath>"
}
```

The bridge fires on every successful `trackSiteClick` call that passes the `shouldTrackSitePagePath` guard. It does **not** fire for `trackSitePageView` (page views are not bridged to dataLayer).

## GTM-Side Mapping — Meta CardigoStartFreeCardIntent

Added in GTM Version 7 (published 2026-05-17). See canonical detail in `docs/handoffs/current/Cardigo_Enterprise_Handoff_2026-05-17_GTM_V7_StartFreeCardIntent_Meta_Conversion_Closed.md`.

The existing `cardigo_event` dataLayer pushes produced by `trackSiteClick()` are consumed on the GTM side by a new trigger that maps a subset of `SITE_ACTIONS` to a Meta Custom Event (`trackCustom`, `"CardigoStartFreeCardIntent"`).

### Allowed actions (trigger allowlist)

The following 8 `SITE_ACTIONS` values fire `CardigoStartFreeCardIntent`:

| SITE_ACTIONS key              | Page     |
| ----------------------------- | -------- |
| `home_hero_primary_register`  | `/`      |
| `home_templates_cta`          | `/`      |
| `home_bottom_cta`             | `/`      |
| `cards_hero_cta`              | `/cards` |
| `cards_templates_cta`         | `/cards` |
| `cards_showcase_card_cta`     | `/cards` |
| `cards_showcase_view_all_cta` | `/cards` |
| `cards_bottom_cta`            | `/cards` |

All are primary register-intent CTAs. No frontend code changes were required — the GTM trigger reads from the existing bridge payload.

### Excluded actions

The following `SITE_ACTIONS` are **not** in the allowlist and will **not** fire `CardigoStartFreeCardIntent`:

- `home_templates_see_all` — content-browse intent, explicitly verified negative in GTM Preview.
- `home_hero_secondary_examples` — content-browse / discovery CTA.
- `pricing_*` — maps to `InitiateCheckout` (separate downstream commercial intent event).
- `contact_*` — maps to `Lead` / `Contact` (separate post-interest signals).
- `blog_article_click` — content engagement signal.
- `guide_article_click` — content engagement signal.
- `registration_complete` — post-conversion signal, maps to `CompleteRegistration`.

`Lead`, `Contact`, `InitiateCheckout`, and `CompleteRegistration` remain separate GTM tag mappings and are not affected by this addition.

## Conversion Signals

These signals are product-lifecycle events emitted **outside** the `shouldTrackSitePagePath` path gate. They fire from auth routes (`/verify-email`, `/signup`) which are excluded from marketing-page path tracking by design.

| Signal                  | Function                    | File                      | Fires from                             | Path-gated?                   |
| ----------------------- | --------------------------- | ------------------------- | -------------------------------------- | ----------------------------- |
| `registration_complete` | `trackRegistrationComplete` | `siteAnalytics.client.js` | `VerifyEmail.jsx`, `SignupConsume.jsx` | **No** — deliberate exception |

### registration_complete payload

```json
{
  "event": "cardigo_event",
  "event_name": "registration_complete",
  "cardigo_consent_optional_tracking": true | false | null
}
```

`cardigo_consent_optional_tracking` is read directly from `localStorage` (`cardigo_cookie_consent_v1`) inside `trackRegistrationComplete()` at the moment of emission. `null` means the user has not yet interacted with the consent banner. See `docs/policies/privacy-consent-and-tracking.md` Section 10 for the architectural reasoning.

This signal is the data source for the GTM `CompleteRegistration` → Meta tag. It is not a first-party internal analytics signal — it goes only to GTM `dataLayer`.

## Anti-regression

- Run `npm run check:site-actions` in `frontend/`.
- This fails if any `trackSiteClick({ action: "..." })` uses a string-literal action instead of `SITE_ACTIONS.*`.
- CI also runs this guardrail via `.github/workflows/ci.yml`.

## Business-effect manual check

1. As admin, call `GET /api/admin/site-analytics/diagnostics` (must be 200).
2. Click Contact mail CTA once.
3. Re-fetch diagnostics and confirm `counters.missing_action` does not change and `clicksTotal` in summary increments (or actionCounts increases, depending on your UI view).
4. Click a blog article and a guides article. Confirm `blog_article_click` and `guide_article_click` appear in diagnostics and in GTM Preview as `cardigo_event` dataLayer pushes.

## Google Ads Tag — Site-Level Search Retargeting (GTM V8)

Added in GTM Version 8 (published 2026-05-18). See canonical detail in `docs/handoffs/current/Cardigo_Enterprise_Handoff_2026-05-18_GTM_V8_GoogleAds_Search_Retargeting_Closed.md`.

| Property       | Value                                                      |
| -------------- | ---------------------------------------------------------- |
| Google tag     | `AW-18078197095`                                           |
| Container      | `GTM-W6Q8DP6R`                                             |
| Consent gate   | `DLV — Consent Optional Tracking` equals `true`            |
| Route boundary | Same as Meta Pixel — approved marketing routes only        |
| SPA coverage   | History Change trigger (`HC`) attached directly to the tag |

### Approved route boundary

The Google Ads tag fires only on the following routes (identical to `AD_MEASUREMENT_PATHS` in `frontend/src/components/layout/Layout.jsx` lines 16–24):

`/`, `/cards`, `/pricing`, `/blog`, `/guides`, `/contact`

Excluded from all auth, private, admin, editor, public card, and org card surfaces (`/login`, `/register`, `/edit`, `/admin`, `/card/:slug`, `/c/:orgSlug/:slug`).

### SPA trigger note

Client-side route transitions are covered by the History Change trigger `HC - Google Ads - Approved Routes + Optional Consent`, which is attached **directly** to the Google Ads tag — not nested inside the trigger group. This is the required pattern for SPA route-change tracking.

### Audience and campaign context

| Property             | Value                                                             |
| -------------------- | ----------------------------------------------------------------- |
| Audience segment     | `Cardigo \| Website Visitors \| Approved Marketing Routes \| 30d` |
| Audience type        | Website visitors, 30-day membership                               |
| Intended use         | Google Search retargeting only                                    |
| Campaign             | `GOOGLE \| SEARCH \| IL \| RETARGETING \| CARDIGO \| V1`          |
| Campaign type        | Search (AI Max off, Display off, Search Partners off)             |
| Location / Languages | Israel / Hebrew, Russian, English                                 |
| Landing URL          | `https://cardigo.co.il/cards`                                     |

### Non-actions for this contour

No GA4, no enhanced conversions, no Google Consent Mode (now a relevant deferred item), no manual source-code snippet installation.

---

## Bot-Share Detection (Admin-Only)

Added in contour `SITE_ANALYTICS_BOT_SHARE_MINIMAL` (closed 2026-06-20). See canonical detail in `docs/handoffs/current/Cardigo_Enterprise_Handoff_2026-06-20_SiteAnalytics_BotShare_Minimal_Closed.md`.

**Business rule:** General `views` remains mixed (human + bot). Bot traffic is NOT removed from any existing metric. The bot-share fields are additive read-only context for the admin.

### What was added to SiteAnalyticsDaily

| Field           | Type                     | Description                                                                                                                                                                                |
| --------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `botViews`      | Number                   | Count of view events where UA matched a known bot pattern. Subset of `views`.                                                                                                              |
| `botKindCounts` | Map&lt;String,Number&gt; | Per-kind bot breakdown. Keys: `googlebot`, `adsbot_google`, `bingbot`, `ahrefsbot`, `semrushbot`, `yandexbot`, `dotbot`, `lighthouse`, `pagespeed`, `headless`, `social_bot`, `other_bot`. |

Legacy documents (before deploy) have these fields absent. Read code treats absent values as 0. No retroactive reclassification.

### UA classification

18 UA patterns matched via `String.prototype.includes` in `classifyUA()` (pure function, `siteAnalytics.controller.js`). Classification is analytics-grade only — NOT a security trust boundary. Raw `userAgent` is never persisted to any collection.

### pagePath validation hardening (added same contour)

`isAllowedPublicPath()` now gate-keeps all accepted site-analytics paths. Valid paths: exact marketing routes (`/`, `/cards`, `/pricing`, `/contact`, `/blog`, `/guides` and their trailing-slash variants), pagination (`/blog/page/:n`, `/guides/page/:n`), blog/guide slugs (ASCII-only via charCode loop).

Paths that fail validation → `incDiagnostics("malformed_pagePath")` → 204 early return. No write occurs.

`/c/*` and `/og/*` are explicitly excluded via `EXCLUDED_PREFIXES`. `/c` and `/og` bare paths are excluded via `EXCLUDED_EXACT`.

### Admin API fields

`GET /api/admin/site-analytics/summary` now returns `kpi.botViews`, `kpi.botShare`, `today.botViews`, `today.botShare`, `series[].botViews`.

`GET /api/admin/site-analytics/sources` now returns `botKindCounts` (aggregated over range).

### Admin UI

The "מדדי מפתח" block in AdminAnalyticsView shows:

- Inside "צפיות" KPI card: sub-row with label "מתוכן סריקות בוטים", bot count, and `{botSharePercent}% מכלל הצפיות`
- Helper text: "הצפיות הכלליות כוללות גם סריקות טכניות. כאן מוצג כמה מתוכן זוהו כרובוטים."
- Conditional breakdown card "סריקות לפי רובוט" (rendered only when `botKindCounts` has entries)

All existing analytics sections unchanged.
