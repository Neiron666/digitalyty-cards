# Cardigo — Enterprise Handoff: GTM V7 / StartFreeCardIntent Meta Conversion

_Date: 2026-05-17_
_Status: TRACKING / MEASUREMENT SETUP — CLOSED-PASS_

> **Important:** This handoff documents measurement and optimization infrastructure only. Campaign performance improvement has **not** been proven or claimed. No V3 campaign results exist at time of writing.

---

## 1) Executive Summary

A new middle-funnel Meta custom event (`CardigoStartFreeCardIntent`) and a corresponding Meta Custom Conversion (`Cardigo - Start Free Card Intent`) were added as cold V3 optimization candidates via GTM Version 7.

This is measurement infrastructure. It enables Meta's algorithm to receive a higher-volume, higher-intent signal than Landing Page View (too shallow) and a more available signal than InitiateCheckout (too rare at early cold traffic volumes). No campaign performance data exists yet. This is not a claim of success.

InitiateCheckout remains a fully active downstream commercial intent event. It was not removed or globally replaced.

---

## 2) GTM Version 7 — Operational Truth

| Property       | Value                                 |
| -------------- | ------------------------------------- |
| Container ID   | `GTM-W6Q8DP6R`                        |
| Meta Pixel     | `1901625820558020`                    |
| Published      | 2026-05-17                            |
| Version number | 7                                     |
| Version name   | CardigoStartFreeCardIntent Meta event |
| Changes in V7  | One trigger added. One tag added.     |

### 2.1 Trigger Added

**Name:** CE — Cardigo Event — StartFreeCardIntent

**Type:** Custom Event / Special event

**Event name:** `cardigo_event`

**Trigger conditions (both must be true):**

1. `DLV — Consent Optional Tracking` equals `true`
2. `DLV — Cardigo Event Name` matches regex:

```
^(home_hero_primary_register|home_templates_cta|home_bottom_cta|cards_hero_cta|cards_templates_cta|cards_showcase_card_cta|cards_showcase_view_all_cta|cards_bottom_cta)$
```

### 2.2 Tag Added

**Name:** Meta Pixel — StartFreeCardIntent — Cardigo

**Type:** Custom HTML (Meta fbevents.js snippet)

**Trigger:** CE — Cardigo Event — StartFreeCardIntent

**Tag fires:**

```js
fbq("trackCustom", "CardigoStartFreeCardIntent", {
    content_name: eventName,
    cardigo_event_name: eventName,
    page_path: pagePath,
});
```

This is a `trackCustom` call (Meta Custom Event), not a standard `fbq("track", ...)` call.

`eventName` and `pagePath` are resolved from the `cardigo_event` dataLayer push variables (`DLV — Cardigo Event Name`, `DLV — Cardigo Page Path`).

---

## 3) Trigger Allowlist — Allowed Event Names

The following 8 `SITE_ACTIONS` values are in the trigger regex and will fire `CardigoStartFreeCardIntent`:

1. `home_hero_primary_register`
2. `home_templates_cta`
3. `home_bottom_cta`
4. `cards_hero_cta`
5. `cards_templates_cta`
6. `cards_showcase_card_cta`
7. `cards_showcase_view_all_cta`
8. `cards_bottom_cta`

These are all primary register-intent CTAs on the Home (`/`) and Cards (`/cards`) marketing pages.

All 8 are registered in `frontend/src/services/siteAnalytics.actions.js` and flow through `trackSiteClick()` → first-party backend + dataLayer bridge. No frontend code changes were required for this GTM configuration.

---

## 4) Explicit Exclusions / Anti-Contamination

The following `SITE_ACTIONS` are **not** in the trigger regex and will **not** fire `CardigoStartFreeCardIntent`:

| Excluded action / group        | Reason for exclusion                                                               |
| ------------------------------ | ---------------------------------------------------------------------------------- |
| `home_templates_see_all`       | Content-browse intent, not register intent. Explicitly GTM-Preview verified.       |
| `home_hero_secondary_whatsapp` | Content-browse / discovery CTA, not register intent.                               |
| `pricing_*` (all pricing CTAs) | Maps to `InitiateCheckout` — separate commercial intent event, not middle-funnel.  |
| `contact_*`                    | Maps to `Lead` / `Contact` — separate post-interest signal.                        |
| `blog_article_click`           | Content engagement signal, not register intent.                                    |
| `guide_article_click`          | Content engagement signal, not register intent.                                    |
| `registration_complete`        | Post-conversion signal, maps to `CompleteRegistration` — downstream of this event. |

**GTM Preview negative test explicitly confirmed:** `home_templates_see_all` (the "גלו עוד דוגמאות ויכולות של הכרטיסים" browse CTA on the homepage) did **not** fire `CardigoStartFreeCardIntent`.

---

## 5) Meta Event and Custom Conversion

### 5.1 Meta Custom Event

| Property   | Value                                             |
| ---------- | ------------------------------------------------- |
| Event type | Custom Event (`trackCustom`)                      |
| Event name | `CardigoStartFreeCardIntent`                      |
| Pixel      | `1901625820558020`                                |
| Parameters | `content_name`, `cardigo_event_name`, `page_path` |

### 5.2 Meta Custom Conversion

| Property         | Value                              |
| ---------------- | ---------------------------------- |
| Name             | Cardigo - Start Free Card Intent   |
| Source           | Cardigo Pixel (`1901625820558020`) |
| Source action    | Website                            |
| Conversion event | `CardigoStartFreeCardIntent`       |
| Category         | Lead                               |
| Rule             | URL contains `cardigo.co.il`       |
| Conversion value | Not set                            |

---

## 6) Strategy Rationale

### Why a new middle-funnel signal was needed for cold V3

**Landing Page View was too shallow.** LPV fires on every page load regardless of user behavior, producing a large pool with weak downstream action correlation. Optimizing cold ads toward LPV trains the algorithm on low-intent signals.

**InitiateCheckout was too rare at early cold traffic volumes.** IC fires only when a user reaches a pricing CTA and signals checkout intent. At early cold audience scale, the event volume is insufficient for Meta's learning algorithm to exit the learning phase.

**CardigoStartFreeCardIntent is a middle-funnel CTA-intent signal.** It fires when a user explicitly clicks a primary "create a free digital card" CTA, demonstrating intent to start the product flow. This provides higher signal quality than LPV and higher volume than IC, making it a better optimization candidate for cold V3 learning.

**InitiateCheckout is NOT removed or globally replaced.** IC remains fully active as a downstream commercial intent signal. It continues to fire on pricing CTA clicks and is still visible in Meta Events Manager. StartFreeCardIntent sits upstream of IC in the funnel.

---

## 7) Verification Evidence Summary

| Test                                                                                                       | Result                               |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| GTM Preview — Homepage top CTA "צרו כרטיס דיגיטלי בחינם" fired StartFreeCardIntent                         | PASS                                 |
| GTM Preview — /cards top CTA "צרו כרטיס דיגיטלי בחינם" fired StartFreeCardIntent                           | PASS                                 |
| GTM Preview — homepage "גלו עוד דוגמאות ויכולות" (home_templates_see_all) did NOT fire StartFreeCardIntent | PASS (negative / anti-contamination) |
| Meta Events Manager Test Events received CardigoStartFreeCardIntent                                        | PASS                                 |
| Meta Events Manager parameter confirmation: content_name=home_hero_primary_register, page_path=/           | PASS                                 |
| Meta Custom Conversion "Cardigo - Start Free Card Intent" created                                          | PASS                                 |

**Events Manager test event detail:**

- Source: Browser
- Setup method: Manual
- URL: https://cardigo.co.il/
- Parameters confirmed: `content_name: home_hero_primary_register`, `cardigo_event_name: home_hero_primary_register`, `page_path: /`

---

## 8) Anti-Overclaim / Non-Actions

The following are explicitly **not** part of this workstream and must not be claimed or implied:

- No CAPI / server-side Conversions API / event_id deduplication implemented. CAPI remains "Deferred" per the canonical tracking truth.
- No GA4 / Google Ads / Google tag changes. Google retargeting contour remains explicitly stopped.
- No landing page changes. Home and /cards page content and CTA copy are unchanged.
- No frontend code changes. All GTM configuration was done in GTM only. No JS, JSX, or CSS was modified.
- No campaign performance improvement claimed. No live ad spend data using this event exists at time of writing.
- No V3 cold campaign success claimed. V3 has not launched at time of writing.
- No purchase or registration optimization claimed. CardigoStartFreeCardIntent is a middle-funnel micro-conversion, not a purchase or final registration event.
- No Automatic Advanced Matching changes. Advanced Matching remains intentionally OFF.
- No audience changes or new custom audiences created in this workstream.

---

## 9) Supersession Note

This handoff supersedes **only** the following specific sections of earlier handoffs:

- `Cardigo_Enterprise_Master_Handoff_2026-04-10_TRACKING_CLOSED_PLAYBOOK.md` Section 2.8 (Meta Standard-Event GTM Mappings table) and Section 2.12 (Events Manager confirmed truth list) — those sections are now incomplete because they predate this event.
- `Cardigo_Enterprise_Master_Handoff_2026-04-11_ADS_PLAYBOOK_AND_NEXT_CHAT_FULL.md` Section 8.14 (Events Manager truth), Section 9.1 and Section 9.2 (InitiateCheckout as sole cold optimization proxy) — those sections are now stale with respect to the cold V3 optimization candidate.

It does **not** supersede the remainder of those documents. All other tracking contour truth in those files (consent gating, route isolation, registration_complete architecture, platform-ID blocklist, deferred contours) remains valid and canonical.

---

## 10) Updated Events Manager Confirmed Truth (as of 2026-05-17)

The following events are confirmed received in Meta Events Manager:

1. `PageView`
2. `Lead`
3. `Contact`
4. `InitiateCheckout`
5. `CompleteRegistration`
6. `CardigoStartFreeCardIntent`

This updates the list previously documented in `Cardigo_Enterprise_Master_Handoff_2026-04-11_ADS_PLAYBOOK_AND_NEXT_CHAT_FULL.md` Section 8.14 and `Cardigo_Enterprise_Master_Handoff_2026-04-10_TRACKING_CLOSED_PLAYBOOK.md` Section 2.12.
