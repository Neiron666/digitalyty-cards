# Privacy, Consent & Tracking — Canonical Policy

> Canonical durable truth for Cardigo's cookie/privacy banner and tracking consent model.
> This document governs the consent architecture. Do not contradict it from handoff files.

---

## 1) Tracking Independence Rule

Cardigo operates two categories of tracking:

| Category                                                                              | Governed by banner? | Behavior                                                                                                                                                                            |
| ------------------------------------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Internal first-party analytics** (`siteAnalytics.client.js`, `analytics.client.js`) | **No**              | Always-on. Independent of banner consent state. Has zero references to consent utilities or keys. Uses its own `siteAnalyticsOptOut` localStorage key for opt-out where applicable. |
| **Optional third-party tracking** (GTM, Meta, ad pixels, etc.)                        | **Yes**             | Must only load when `optionalTrackingAllowed === true` in consent state. Not yet integrated.                                                                                        |

**Hard rule:** Internal first-party analytics must never import, reference, or be gated by any consent utility (`cookieConsent.js`, `getConsentState`, `hasAcceptedConsent`, `cardigo_cookie_consent_v1`).

---

## 2) Banner Architecture

- **Placement:** Fixed-bottom, rendered inside `Layout.jsx` (Layout-owned pages only). Public card pages (`/card/:slug`, `/c/:orgSlug/:slug`) are outside Layout and are **not** affected by this banner or by `cardigo_cookie_consent_v1`. Card routes have their own separate second-layer consent mechanism (`cardigo_card_consent_v1`) that gates card-owner–configured third-party trackers only. See Section 9.
- **Model:** Two-view replacement (not accordion). View A and View B render exclusively inside the same `<div>` container — content swaps in place, no height expansion.
- **Persistence:** Banner does not re-render after any save path (checked via `hasAcceptedConsent()` on mount).
- **Reopen entry point:** Footer contains a persistent "העדפות פרטיות" button that reopens the banner at any time.

### Reopen Architecture

- **Pattern:** React-canonical prop flow (Layout → Footer / CookieConsentBanner). No Context, no global store, no DOM events.
- **Signal:** `Layout.jsx` owns a nonce counter (`reopenPrefs`). Footer triggers a Layout callback (`onOpenPrivacyPrefs`), which increments the counter.
- **Reaction:** `CookieConsentBanner` receives `reopenPrefs` as a prop and listens via `useEffect`. On change: reads saved `optionalTrackingAllowed` from `getConsentState()`, sets view to preferences, sets visible to `true`.
- **Behavior:** Reopen always lands directly in the preferences view (View B), not the default notice. The checkbox reflects the user's previously saved choice.

---

## 3) Banner UX

### View A — Default Notice

- Short Hebrew copy describing optional third-party tool usage.
- Links to `/privacy` and `/terms`.
- **"הבנתי"** — accept-all (sets `optionalTrackingAllowed: true`).
- **"ניהול העדפות"** — switches to View B.

### View B — Preferences

- **"עוגיות הכרחיות"** — non-interactive row, badge "תמיד פעיל".
- **"כלי מדידה ושיווק של צדדים שלישיים"** — native checkbox, default checked.
- **"שמירה"** — saves user's choice and dismisses banner.
- **"חזרה"** — returns to View A.

---

## 4) Consent Persistence

### 4a) Main-site consent (`cardigo_cookie_consent_v1`)

| Property | Value                                                                               |
| -------- | ----------------------------------------------------------------------------------- |
| Storage  | `localStorage`                                                                      |
| Key      | `cardigo_cookie_consent_v1`                                                         |
| Shape    | `{ version: 1, acknowledged: true, optionalTrackingAllowed: boolean, ts: number }`  |
| Utility  | `frontend/src/utils/cookieConsent.js`                                               |
| Exports  | `getConsentState()`, `acceptConsent()`, `saveConsent(bool)`, `hasAcceptedConsent()` |

### 4b) Card-route consent (`cardigo_card_consent_v1`)

Separate key for public card routes. Completely independent of the main-site consent model.

| Property | Value                                                                           |
| -------- | ------------------------------------------------------------------------------- |
| Storage  | `localStorage`                                                                  |
| Key      | `cardigo_card_consent_v1`                                                       |
| Shape    | `{ version: 1, acknowledged: true, ownerTrackingAllowed: boolean, ts: number }` |
| Utility  | `frontend/src/utils/cookieConsent.js` (card-route section)                      |
| Exports  | `getCardConsentState()`, `saveCardConsent(bool)`, `hasAcceptedCardConsent()`    |

**Hard rule:** `saveCardConsent()` does **not** call `pushConsentToDataLayer` and does **not** push `cardigo_consent_update`. Card consent must never feed Cardigo's site-level GTM dataLayer.

### Save paths

| User action             | `optionalTrackingAllowed` |
| ----------------------- | ------------------------- |
| "הבנתי"                 | `true`                    |
| "שמירה" with toggle ON  | `true`                    |
| "שמירה" with toggle OFF | `false`                   |

`acknowledged` is always `true`. `version` is always `1`.

---

## 5) Privacy Policy Alignment

- Clause **8.6** in `frontend/src/pages/Privacy.jsx` (placed after 8.5, before section 9).
- Clause documents: in-product preferences for third-party tools + internal tools operating independently of that preference layer.

---

## 6) Files in Contour

### Main-site consent

| File                                                                            | Role                                                          |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `frontend/src/utils/cookieConsent.js`                                           | Consent persistence utility (main-site + card-route sections) |
| `frontend/src/components/ui/CookieConsentBanner/CookieConsentBanner.jsx`        | Banner component                                              |
| `frontend/src/components/ui/CookieConsentBanner/CookieConsentBanner.module.css` | Banner styles                                                 |
| `frontend/src/components/layout/Layout.jsx`                                     | Integration point (import + render + reopen signal)           |
| `frontend/src/components/layout/Footer.jsx`                                     | Reopen entry point ("העדפות פרטיות" button)                   |
| `frontend/src/components/layout/Footer.module.css`                              | `.linkButton` class for footer button                         |
| `frontend/src/pages/Privacy.jsx`                                                | Clause 8.6                                                    |

### Card-route consent (separate contour)

| File                                                                                  | Role                                                                                   |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `frontend/src/utils/cookieConsent.js`                                                 | Card-route helpers: `getCardConsentState`, `saveCardConsent`, `hasAcceptedCardConsent` |
| `frontend/src/components/ui/CardOwnerConsentBanner/CardOwnerConsentBanner.jsx`        | Banner for card-route owner-tracker consent                                            |
| `frontend/src/components/ui/CardOwnerConsentBanner/CardOwnerConsentBanner.module.css` | Banner styles                                                                          |
| `frontend/src/pages/PublicCard.jsx`                                                   | Gate point: `trackingMode` gated by `allowTracking && cardConsentAllowed`              |

---

## 7) Third-Party Loader Gating Rule

### Site-level loaders (Future)

When sitewide GTM, Meta pixel, or other third-party measurement/marketing loaders are enabled at the site shell level:

1. They **must** call `getConsentState()` from `cookieConsent.js`.
2. They **must** only initialize/fire when `optionalTrackingAllowed === true`.
3. They **must not** fire on first visit before user has interacted with the banner.

### Card-route owner-configured loaders (Current — implemented)

Owner-configured GTM and Meta Pixel on public card routes (`/card/:slug`, `/c/:orgSlug/:slug`) are gated via the separate `cardigo_card_consent_v1` model:

1. They fire only when `cardConsentAllowed === true` (set via `CardOwnerConsentBanner` accept).
2. They use `getCardConsentState()?.ownerTrackingAllowed`, not `getConsentState()`.
3. Owner GA4 (`gaMeasurementId`) is now consent-gated via the same `cardigo_card_consent_v1` gate as owner GTM + Pixel: `gaMeasurementId` is passed as `undefined` to `SeoHelmet` when `cardConsentAllowed === false`. The env gate (`PROD || VITE_SEO_DEBUG=1`) additionally applies.
4. First-party internal card analytics (`trackView`) is ungated by design — it is not a third-party tracker.
5. Preview routes (`/preview/*`) are outside this contour and unaffected.

---

## 8) Deferred Items

| Item                                       | Status       | Notes                                                                                                                                                                                                    |
| ------------------------------------------ | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reopen-preferences path                    | **Done**     | Footer button "העדפות פרטיות" reopens banner directly into preferences view via React prop flow.                                                                                                         |
| Site-level GTM / Meta loader gating        | Done via GTM | Handled via GTM dataLayer (`cardigo_consent_update` event). Not via `getConsentState()` at JS level. Applies to main public marketing pages only.                                                        |
| Per-card owner GTM + Pixel consent gate    | **Done**     | Gated via `cardigo_card_consent_v1` + `CardOwnerConsentBanner`. Verified EXIT:0. See Section 9.                                                                                                          |
| Per-card owner GA4 consent gate            | **Done**     | Closed 2026-04-09: `gaMeasurementId` passed as `undefined` to `SeoHelmet` when `cardConsentAllowed === false`. All three owner third-party trackers are now consent-gated via `cardigo_card_consent_v1`. |
| Fuller consent manager / reject-all        | Not started  | Only if regulatory requirements escalate. Current model covers informational + optional-consent tier.                                                                                                    |
| Card-route GTM signal bootstrap (main.jsx) | Deferred     | Distinct from per-card owner consent. Future contour: push `cardigo_consent_update` to GTM on card-route loads. MUST include route guard.                                                                |
| Per-card banner copy legal review          | Deferred     | Hebrew banner copy needs legal sign-off. Non-blocking for current implementation.                                                                                                                        |

---

## 9) Card-Route Consent Subsystem

> **Status: CLOSED and verified (2026-04-09, all gates EXIT:0, 348 modules).**

This is a **separate, second-layer consent subsystem** distinct from the main-site cookie banner. It governs only owner-configured third-party trackers on public card routes.

### Architecture

- Public card routes (`/card/:slug`, `/c/:orgSlug/:slug`) render without `Layout` — the main-site `CookieConsentBanner` and `cardigo_cookie_consent_v1` are never involved.
- `CardOwnerConsentBanner` mounts inside `PublicCard.jsx` (not in Layout).
- Banner is only shown when the card has at least one valid, non-blocklisted owner third-party tracker (`hasOwnerThirdPartyTracker = Boolean(gtmIdNormalized || gaMeasurementIdNormalized || metaPixelIdNormalized)`).
- Default state: `ownerTrackingAllowed = false` (trackers blocked until explicit accept).

### Consent Key

- Key: `cardigo_card_consent_v1`
- Shape: `{ version: 1, acknowledged: true, ownerTrackingAllowed: boolean, ts: number }`
- `saveCardConsent()` does **not** call `pushConsentToDataLayer` — card consent never feeds Cardigo GTM dataLayer.

### Gating Scope

| Tracker                                           | Gated by `cardigo_card_consent_v1`?                                              |
| ------------------------------------------------- | -------------------------------------------------------------------------------- |
| Owner GTM (`card.seo.gtmId`)                      | **Yes**                                                                          |
| Owner Meta Pixel (`card.seo.metaPixelId`)         | **Yes**                                                                          |
| Owner GA4 (`card.seo.gaMeasurementId`)            | **Yes** — consent-gated via `cardigo_card_consent_v1` (same gate as GTM + Pixel) |
| First-party `trackView` (internal card analytics) | **No** — ungated by design, not a third-party tracker                            |

### Platform-ID Blocklist

Cardigo's own platform IDs are blocked at two layers to prevent contamination:

- **Runtime (`SeoHelmet.jsx`):** `normalizeGtmId` returns `""` for `GTM-W6Q8DP6R`; `normalizeMetaPixelId` returns `""` for `1901625820558020`.
- **DB (`Card.model.js`):** Schema validators reject these IDs at save time.

Result: a card owner cannot configure Cardigo's own platform IDs as per-card trackers.

### Exclusions

- **Preview routes** (`/preview/*`): separate component, separate router entries — completely outside this contour and unaffected.
- **Site-level Cardigo GTM/Pixel**: unaffected — card-route consent lives on a separate key and does not interact with GTM dataLayer.
