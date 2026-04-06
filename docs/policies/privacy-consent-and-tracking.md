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

- **Placement:** Fixed-bottom, rendered inside `Layout.jsx` (Layout-owned pages only). Public card pages (`/card/:slug`, `/c/:orgSlug/:slug`) are outside Layout and unaffected.
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

| Property | Value                                                                               |
| -------- | ----------------------------------------------------------------------------------- |
| Storage  | `localStorage`                                                                      |
| Key      | `cardigo_cookie_consent_v1`                                                         |
| Shape    | `{ version: 1, acknowledged: true, optionalTrackingAllowed: boolean, ts: number }`  |
| Utility  | `frontend/src/utils/cookieConsent.js`                                               |
| Exports  | `getConsentState()`, `acceptConsent()`, `saveConsent(bool)`, `hasAcceptedConsent()` |

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

| File                                                                            | Role                                                |
| ------------------------------------------------------------------------------- | --------------------------------------------------- |
| `frontend/src/utils/cookieConsent.js`                                           | Consent persistence utility                         |
| `frontend/src/components/ui/CookieConsentBanner/CookieConsentBanner.jsx`        | Banner component                                    |
| `frontend/src/components/ui/CookieConsentBanner/CookieConsentBanner.module.css` | Banner styles                                       |
| `frontend/src/components/layout/Layout.jsx`                                     | Integration point (import + render + reopen signal) |
| `frontend/src/components/layout/Footer.jsx`                                     | Reopen entry point ("העדפות פרטיות" button)         |
| `frontend/src/components/layout/Footer.module.css`                              | `.linkButton` class for footer button               |
| `frontend/src/pages/Privacy.jsx`                                                | Clause 8.6                                          |

---

## 7) Third-Party Loader Gating Rule (Future)

When sitewide GTM, Meta pixel, or other third-party measurement/marketing loaders are enabled:

1. They **must** call `getConsentState()` from `cookieConsent.js`.
2. They **must** only initialize/fire when `optionalTrackingAllowed === true`.
3. They **must not** fire on first visit before user has interacted with the banner.

---

## 8) Deferred Items

| Item                                | Status      | Notes                                                                                                 |
| ----------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------- |
| Reopen-preferences path             | **Done**    | Footer button "העדפות פרטיות" reopens banner directly into preferences view via React prop flow.      |
| GTM / Meta loader gating            | Not started | Blocked until those tools are actually enabled.                                                       |
| Fuller consent manager / reject-all | Not started | Only if regulatory requirements escalate. Current model covers informational + optional-consent tier. |
