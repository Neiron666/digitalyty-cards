# Cardigo — Enterprise Master Handoff: Tracking Closed Playbook

_Date: 2026-04-10_

---

## 0) Purpose and Supersession

This document supersedes the tracking truth in:

- `Cardigo_Enterprise_Master_Handoff_2026-04-08_TRACKING_AND_NEXTCHAT.md` — stale on CompleteRegistration, Meta event status, consent-hardening, token sanitization.
- `Cardigo_Enterprise_Master_Handoff_2026-04-09_FULL_PLAYBOOK.md` — tracking sections (6–12) are skeleton-only; do not consult for tracking detail.

Those files remain as historical records. For any conflict, this file is the canonical truth.

---

## 1) Tracking Stack (Operational Truth)

| Component                   | ID / Value         | Status                 |
| --------------------------- | ------------------ | ---------------------- |
| GTM Container               | `GTM-W6Q8DP6R`     | Live                   |
| Cardigo Meta Pixel          | `1901625820558020` | Live                   |
| Automatic Advanced Matching | Off                | Intentional — deferred |
| Conversions API / CAPI      | Not configured     | Deferred               |
| Site-level GA4 / Google Ads | Not configured     | Deferred               |

---

## 2) Closed Contours (All Verified EXIT:0, 348 Modules)

### 2.1 Site-Level GTM Container Install

- GTM script inserted in `frontend/index.html` `<head>` after viewport meta.
- GTM noscript inserted immediately after `<body>`.
- Container ID `GTM-W6Q8DP6R` appears exactly twice in the shell HTML (script + noscript).
- Per-card GTM (`card.seo.gtmId`) is a separate unrelated mechanism — not affected.

### 2.2 Consent → DataLayer Wiring

- `pushConsentToDataLayer(state)` called on every `saveConsent()` and on Layout mount for returning visitors.
- Consent event name: `cardigo_consent_update`.
- Payload: `{ event, cardigo_consent_version, cardigo_consent_acknowledged, cardigo_consent_optional_tracking }`.
- GTM DLV: `DLV — Consent Optional Tracking` (key: `cardigo_consent_optional_tracking`).
- GTM trigger: `CE — Consent Update — Optional Tracking Allowed` (event = `cardigo_consent_update` AND `cardigo_consent_optional_tracking = true`).

### 2.3 Route Isolation / AD_MEASUREMENT_PATHS Hardening

- `Layout.jsx` contains `AD_MEASUREMENT_PATHS` allowlist.
- Consent push (`pushConsentToDataLayer`) fires only on: `/`, `/cards`, `/pricing`, `/contact`, `/blog`, `/guides`.
- All other Layout-wrapped routes (auth, product, admin, legal) do not push consent to dataLayer.
- This is an intentional anti-contamination guard. Do not casually reopen.

### 2.4 Site-Level Meta Pixel Base Setup

- GTM tag: `Meta Pixel — Base — Cardigo` (Custom HTML, full fbevents.js snippet).
- Pixel ID: `1901625820558020`.
- Trigger: `CE — Consent Update — Optional Tracking Allowed` (consent-gated, not All Pages).
- Runtime verified: after consent, GTM Preview confirms tag fires; network shows `fbevents.js` + `connect.facebook.net` requests.

### 2.5 Platform-ID Blocklist

Cardigo's own GTM and Pixel IDs are blocked at two layers to prevent card owners from loading Cardigo's marketing infrastructure via their card:

| Layer   | File                                         | What is blocked                                                                                  |
| ------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Runtime | `frontend/src/components/card/SeoHelmet.jsx` | `normalizeGtmId` → `""` for `GTM-W6Q8DP6R`; `normalizeMetaPixelId` → `""` for `1901625820558020` |
| DB      | `backend/src/models/Card.model.js`           | Schema validators reject both IDs at save time                                                   |

### 2.6 First-Party → GTM DataLayer Bridge (P0-A)

- `trackSiteClick()` in `siteAnalytics.client.js` now calls `pushToDataLayer(eventName, pagePath)` in addition to the first-party backend.
- Bridge payload: `{ event: "cardigo_event", event_name: "<action>", page_path: "<pagePath>" }`.
- This makes click-intent signals observable by GTM tags without a separate GTM trigger on every click.
- Does not fire for `trackSitePageView`.

### 2.7 blog_article_click and guide_article_click

- `SITE_ACTIONS.blog_article_click` wired in `Blog.jsx` — fires on article card click with `pagePath: "/blog"`.
- `SITE_ACTIONS.guide_article_click` wired in `Guides.jsx` — fires on guide card click with `pagePath: "/guides"`.
- Both registered in `siteAnalytics.actions.js` and in `IMPORTANT_ACTIONS_SET` in `siteAnalytics.controller.js`.
- Both flow through first-party backend AND dataLayer bridge.

### 2.8 Meta Standard-Event GTM Mappings

The following Meta standard events are configured in GTM (tag + trigger) with no frontend code changes required:

| Meta Event         | GTM Trigger Source                  | Status |
| ------------------ | ----------------------------------- | ------ |
| `Lead`             | `contact_form_submit` cardigo_event | Closed |
| `Contact`          | `contact_email_click` cardigo_event | Closed |
| `InitiateCheckout` | pricing CTA clicks cardigo_event    | Closed |

All three use the standard consent-gated trigger pattern (must also pass `cardigo_consent_optional_tracking = true`). No code changes were made for these — they are GTM-only configurations.

### 2.9 registration_complete Foundation Signal

- New export `trackRegistrationComplete()` in `frontend/src/services/siteAnalytics.client.js`.
- Called in `VerifyEmail.jsx` after `verifyEmail(token)` resolves successfully (before `setStatus("success")`).
- Called in `SignupConsume.jsx` after `consumeSignupToken(...)` confirms `res.data.ok` (before `window.location.replace("/edit")`).
- Pushes directly to GTM `dataLayer` only. Does not go through the standard first-party site-analytics backend pipeline.

### 2.10 registration_complete Consent-Hardening

Auth routes (`/verify-email`, `/signup`) are excluded from `AD_MEASUREMENT_PATHS`, so `cardigo_consent_update` is never pushed on these pages by Layout.jsx. On a fresh page load from an email link, GTM has no consent state in dataLayer.

Resolution: `trackRegistrationComplete()` reads `cardigo_cookie_consent_v1` from `localStorage` directly and embeds the consent value in its own payload:

```json
{
  "event": "cardigo_event",
  "event_name": "registration_complete",
  "cardigo_consent_optional_tracking": true | false | null
}
```

`null` = user has never interacted with consent banner. GTM consent-gate condition (`= true`) correctly excludes `null`.

This is the only tracking function permitted to read `cardigo_cookie_consent_v1` outside of `cookieConsent.js`. See `docs/policies/privacy-consent-and-tracking.md` Section 10 for full architectural reasoning.

### 2.11 Auth URL Token Sanitization

`/verify-email?token=<value>` and `/signup?token=<value>` previously left the raw token value visible in the URL bar for the entire page visit, leaking it into Meta Events Manager URL fields and GTM `{{Page URL}}` variables.

Resolution: Both `VerifyEmail.jsx` and `SignupConsume.jsx` strip the query string on component mount:

```js
useEffect(() => {
    if (token) window.history.replaceState(null, "", window.location.pathname);
}, []);
```

Declared before the API call effect. Token is already captured in memory via `useMemo` before any effect runs. `replaceState` does not notify React Router, does not clear the token value. After sanitization, any GTM trigger observing `{{Page URL}}` or `{{Page Path}}` sees only the clean pathname.

See `docs/policies/privacy-consent-and-tracking.md` Section 11 for full reasoning.

### 2.12 Meta CompleteRegistration — Confirmed Working

- GTM tag fires `CompleteRegistration` on `registration_complete` event when `cardigo_consent_optional_tracking = true`.
- Meta Events Manager confirms `CompleteRegistration` events are received.
- Website custom audience created:
    - **Name:** Cardigo — Registered Users — 180d
    - **Data source:** Meta Pixel `1901625820558020`
    - **Event rule:** `CompleteRegistration` only
    - **Retention:** 180 days
    - All standard exclusions apply.

---

## 3) Current Operational Truth — Tracking Layer Summary

| Truth                         | Value                                                                                                      |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------- |
| GTM container                 | `GTM-W6Q8DP6R` in `index.html` (unconditional load)                                                        |
| Site Meta Pixel               | Consent-gated via GTM, fires on approved marketing routes only after `cardigo_consent_update`              |
| Consent push routes           | `/`, `/cards`, `/pricing`, `/contact`, `/blog`, `/guides` only (AD_MEASUREMENT_PATHS)                      |
| Consent key                   | `cardigo_cookie_consent_v1` in localStorage                                                                |
| Consent GTM event             | `cardigo_consent_update`                                                                                   |
| Consent DLV                   | `cardigo_consent_optional_tracking`                                                                        |
| First-party click events      | `contact_email_click`, `blog_article_click`, `guide_article_click` wired + bridge to dataLayer             |
| Conversion signal             | `registration_complete` (consent-inline, fires from auth routes)                                           |
| Auth URL tokens               | Stripped at mount in both auth consumer components                                                         |
| Advanced matching             | Off — intentional                                                                                          |
| Google tag / GA4 / Google Ads | Not configured at site level                                                                               |
| Per-card GA4                  | Owner-configured feature in `SeoHelmet.jsx` — consent-gated via `cardigo_card_consent_v1` — not site-level |

---

## 4) Deferred Contours

| Contour                            | Status                 | Notes                                                                                                                                                |
| ---------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Google Ads retargeting base        | **Explicitly stopped** | Audited and de-scoped. No code changes made. Do not reopen without a new bounded workstream.                                                         |
| Site-level GA4 / Google tag        | Deferred               | Separate bounded workstream required. Must not be mixed with Meta next steps.                                                                        |
| Automatic Advanced Matching (Meta) | Deferred               | Privacy/data-quality contour. Do not enable without explicit review.                                                                                 |
| Conversions API / CAPI / Stape     | Deferred               | Server-side tracking contour. Separate workstream.                                                                                                   |
| Card-route GTM signal bootstrap    | Deferred               | Push `cardigo_consent_update` to GTM on `/card/:slug` loads via `main.jsx`. MUST include `isApprovedAdPath()` route guard. Separate contour.         |
| Lead + Schedule Meta events        | Deferred               | Consent blocker on card routes is now closed. Remaining blocker: explicit product/architecture decision. Both require per-card consent model review. |
| Google Consent Mode                | Deferred               | Not relevant until Google tag is configured at site level.                                                                                           |
| Meta `noscript` pixel fragment     | Intentionally omitted  | GTM Custom HTML approach does not use noscript fallback. No action needed.                                                                           |

---

## 5) Next Recommended Step

**Google Ads retargeting: stopped.** No further action.

**Immediate options, in order of readiness:**

1. **Lead / Contact Meta events (site-level)** — GTM-only if triggered by existing `cardigo_event` dataLayer pushes. `contact_form_submit` and `contact_email_click` are already bridged. Can be wired in GTM without code changes.

2. **Site-level GA4 base setup** — Separate bounded workstream. Requires GTM tag + trigger + DLV, no code changes needed. Must not be mixed with Meta work.

3. **Advanced Matching (Meta)** — Only after explicit privacy review. Not urgent.

4. **Card-route GTM signal bootstrap** — Must include route guard. Medium-complexity contour.

---

## 6) Next Chat Bootstrap Reminder

```
PROJECT MODE: Cardigo enterprise workflow.

Hard constraints:
- No git commands
- No inline styles
- CSS Modules only
- Flex only — no grid
- Mobile-first mandatory
- Typography policy:
  - font-size only via var(--fs-*)
  - --fs-* rem-only
  - no px/em/%/vw/vh/clamp/fluid
  - no calc(non-rem)

Workflow: Phase 1 Audit → STOP | Phase 2 Minimal Fix → STOP | Phase 3 Verification → STOP

Canonical domain: https://cardigo.co.il
GTM: GTM-W6Q8DP6R | Meta Pixel: 1901625820558020
Consent key: cardigo_cookie_consent_v1
Consent GTM event: cardigo_consent_update
AD_MEASUREMENT_PATHS: /, /cards, /pricing, /contact, /blog, /guides (ONLY)
registration_complete: consent-inline (reads localStorage directly)
Auth token sanitization: history.replaceState on mount in VerifyEmail + SignupConsume
Meta CompleteRegistration: confirmed in Events Manager
Custom audience: Cardigo — Registered Users — 180d (based on CompleteRegistration)
Google retargeting: explicitly stopped
Advanced matching: intentionally OFF
Conversions API: not configured
Site-level GA4 / Google Ads: not configured
Global noindex in index.html: intentional prelaunch gate — do NOT remove casually
```
