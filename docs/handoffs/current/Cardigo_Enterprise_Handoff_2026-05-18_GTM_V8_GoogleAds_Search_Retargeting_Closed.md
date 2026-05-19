# Cardigo — Enterprise Handoff: GTM V8 / Google Ads Search Retargeting

_Date: 2026-05-18_
_Status: GOOGLE ADS SEARCH RETARGETING — MEASUREMENT SETUP CLOSED_

> **Important:** This handoff documents measurement infrastructure and campaign setup only. No campaign performance data exists at time of writing. No performance improvement is claimed.

---

## 1) Status / Executive Summary

A Google Ads Google tag (`AW-18078197095`) has been installed and published via GTM Version 8. The tag is consent-gated, route-bounded to the approved Cardigo marketing surfaces, and wired with a History Change trigger for SPA route transitions.

A corresponding website visitor audience segment (`Cardigo | Website Visitors | Approved Marketing Routes | 30d`) and a Google Search retargeting campaign (`GOOGLE | SEARCH | IL | RETARGETING | CARDIGO | V1`) have been created in Google Ads. The campaign must remain under controlled rollout until the audience segment has accumulated sufficient Search Network users.

No code changes were made. This is a GTM-only configuration. No frontend, backend, env, or package files were modified.

---

## 2) GTM V8 Operational Truth

| Property       | Value                                     |
| -------------- | ----------------------------------------- |
| Container ID   | `GTM-W6Q8DP6R`                            |
| Google Ads Tag | `AW-18078197095`                          |
| Published      | 2026-05-18                                |
| GTM Version    | 8                                         |
| Changes in V8  | One Google tag added. Two triggers wired. |

### 2.1 Tag Added

**Name:** Google Ads - Google Tag - Cardigo - Approved Routes

**Type:** Google tag

**Tag ID:** `AW-18078197095`

**Triggers attached at tag level (OR semantics; either trigger can fire the tag when its own conditions are satisfied):**

1. `TG - Google Ads - Approved Routes + Optional Consent` (trigger group — fires on page load / consent update)
2. `HC - Google Ads - Approved Routes + Optional Consent` (History Change — fires on SPA route transition)

---

## 3) Trigger Architecture

### 3.1 Trigger Group — Page Load / Consent Path

**Name:** TG - Google Ads - Approved Routes + Optional Consent

**Type:** Trigger Group

**Condition:** All conditions must be true

**Member triggers:**

| Trigger                                         | Condition                                                                                                 |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Cardigo - Approved Ad Routes                    | Fires on approved marketing routes only                                                                   |
| CE - Consent Update - Optional Tracking Allowed | Fires when `cardigo_consent_update` event is received AND `DLV — Consent Optional Tracking` equals `true` |

This trigger group ensures the Google Ads tag fires on page load / consent update only on approved marketing routes with confirmed optional tracking consent.

### 3.2 History Change Trigger — SPA Route Transitions

**Name:** HC - Google Ads - Approved Routes + Optional Consent

**Type:** History Change

**Conditions (both must be true):**

1. `Cardigo - Is Approved Ad Route` equals `true`
2. `DLV — Consent Optional Tracking` equals `true`

**Critical architecture note:**

The History Change trigger (`HC`) is attached **directly** to the Google Ads tag as a separate trigger. It must **NOT** be nested inside the trigger group (`TG`). GTM does not support nesting a History Change trigger inside a trigger group for this use case. Direct attachment is the correct pattern for SPA frameworks using React Router history-based navigation.

This means the Google Ads tag has two separate firing conditions:

1. The trigger group (for initial page loads and consent update events).
2. The HC trigger (for subsequent client-side route navigations).

---

## 4) Approved and Excluded Routes

### Approved routes (AD_MEASUREMENT_PATHS)

The following routes are the only surfaces on which the Google Ads tag is permitted to fire:

| Route      | Notes                     |
| ---------- | ------------------------- |
| `/`        | Home / marketing homepage |
| `/cards`   | Cards showcase page       |
| `/pricing` | Pricing page              |
| `/blog`    | Blog index                |
| `/guides`  | Guides index              |
| `/contact` | Contact page              |

**Code proof:** `frontend/src/components/layout/Layout.jsx` lines 16–24 (`AD_MEASUREMENT_PATHS` array) and lines 38–42 (`isApprovedAdPath` guard on consent push). The approved route list is identical to the existing `AD_MEASUREMENT_PATHS` guard that governs the Meta Pixel consent push. No new route gate was required.

Comment at code line 14–15: _"Only these pages contribute to Cardigo marketing audiences / retargeting. Auth, product, legal, admin, and public-card routes are intentionally excluded."_

### Excluded surfaces

The Google Ads tag must **not** fire on:

- `/login`, `/register` — auth entry surfaces
- `/edit` — card editor / product surface
- `/admin` — admin panel
- `/card/:slug` — personal public card routes
- `/c/:orgSlug/:slug` — org card routes
- `/verify-email`, `/signup` — auth conversion surfaces
- All other non-marketing routes

This exclusion is enforced structurally: the `isApprovedAdPath` guard in `Layout.jsx` prevents `cardigo_consent_update` from being pushed to GTM on any excluded path. GTM consent-gated triggers therefore never see a valid consent event on excluded paths.

---

## 5) Consent Boundary

The Google Ads tag fires only when `DLV — Consent Optional Tracking` equals `true`.

This Data Layer Variable is populated by the `cardigo_consent_update` event, which is pushed to GTM `dataLayer` by `Layout.jsx` only when `isApprovedAdPath(location.pathname)` is true and the user has accepted optional tracking via the Cardigo consent banner.

Consent model reference: `docs/policies/privacy-consent-and-tracking.md` Sections 2–6.

The consent architecture is the same for both the Google Ads tag and the existing Meta Pixel tag. No additional consent infrastructure was required.

---

## 6) Google Ads Audience Segment

| Property            | Value                                                           |
| ------------------- | --------------------------------------------------------------- |
| Name                | Cardigo \| Website Visitors \| Approved Marketing Routes \| 30d |
| Type                | Website visitors                                                |
| Membership duration | 30 days                                                         |
| Intended use        | Google Search retargeting only                                  |
| Data source         | Google Ads tag `AW-18078197095` via GTM                         |

**Rollout dependency:** The campaign must not scale until this segment has accumulated a meaningful user count on the Search Network. See Section 10 (Rollout Guard).

---

## 7) Google Search Campaign Context

| Property               | Value                                                   |
| ---------------------- | ------------------------------------------------------- |
| Campaign name          | GOOGLE \| SEARCH \| IL \| RETARGETING \| CARDIGO \| V1  |
| Campaign type          | Search                                                  |
| AI Max                 | Off                                                     |
| Display Network        | Off                                                     |
| Google Search partners | Off                                                     |
| Location               | Israel                                                  |
| Languages              | Hebrew, Russian, English                                |
| Landing URL            | `https://cardigo.co.il/cards`                           |
| Budget (observed)      | 15 ILS/day (operator-observed in UI; subject to change) |

Targeting mode: retargeting audience (`Cardigo | Website Visitors | Approved Marketing Routes | 30d`). Must be configured in Targeting mode, not Observation mode, to restrict delivery to the retargeting segment.

---

## 8) Manual Snippet Guard

Google Ads may display a generic recommendation to install the Google tag snippet manually in source code.

**This recommendation must not be followed.**

The Google tag is already installed and fully managed through GTM with the following boundaries in place:

- Route boundary: fires only on approved marketing routes (`AD_MEASUREMENT_PATHS`)
- Consent boundary: fires only when `DLV — Consent Optional Tracking` equals `true`
- SPA coverage: History Change trigger handles client-side navigation

Installing the tag snippet manually in source code (e.g., in `frontend/index.html`) would:

1. Fire unconditionally on all routes — including `/edit`, `/admin`, `/card/:slug`, `/login`, and `/register`.
2. Bypass the consent gate — firing before or regardless of user consent state.
3. Contaminate retargeting audiences with product/auth/admin traffic.
4. Conflict with the GTM-managed tag, potentially causing duplicate measurement.

GTM is the single installation point for this tag. Dismiss any Google Ads UI recommendation to install the snippet in source code.

---

## 9) Verification Evidence Summary

The following checks should be performed to verify the GTM V8 setup is correct:

| Check                                                    | Expected result                          |
| -------------------------------------------------------- | ---------------------------------------- |
| GTM Preview — load `/` with consent accepted             | Google Ads tag fires                     |
| GTM Preview — load `/cards` with consent accepted        | Google Ads tag fires                     |
| GTM Preview — navigate `/` → `/cards` (SPA) with consent | HC trigger fires Google Ads tag          |
| GTM Preview — load `/login`                              | Google Ads tag does NOT fire             |
| GTM Preview — load `/edit`                               | Google Ads tag does NOT fire             |
| GTM Preview — load `/card/:slug`                         | Google Ads tag does NOT fire             |
| GTM Preview — load `/` without consent                   | Google Ads tag does NOT fire             |
| GTM Preview — SPA navigate to `/admin`                   | Google Ads tag does NOT fire             |
| Google Ads UI — Tag quality                              | Excellent, tag sending data, no errors   |
| Google Ads Audience Manager — segment visible            | Segment present, membership accumulating |

**Operator-observed external verification (not repo-provable):**

- Google Ads Tag quality status: **Excellent**
- Tag is sending data: **confirmed**
- No errors found: **confirmed**

---

## 10) Rollout Guard

The campaign `GOOGLE | SEARCH | IL | RETARGETING | CARDIGO | V1` must operate under a controlled rollout.

**Required check before scaling:**

In Google Ads Audience Manager, open the audience segment `Cardigo | Website Visitors | Approved Marketing Routes | 30d` and check the **Size: Search Network** column. The segment must have a sufficient number of matched Search Network users before the campaign is unpaused or scaled.

Google Search Network has a minimum audience size threshold for retargeting delivery. If the segment has not reached that threshold, the campaign will not deliver regardless of budget or bid settings.

Do not treat the existence of the campaign or the configured budget (15 ILS/day, operator-observed) as authorization to run at full scale. Audience size on the Search Network is the gating condition.

---

## 11) Anti-Overclaim / Non-Actions

The following are explicitly **not** part of this workstream:

- No GA4 configured or changed.
- No Google Consent Mode configured. (Now a relevant open deferred item — see Section 12.)
- No enhanced conversions configured.
- No Google Ads conversion actions created.
- No CAPI / server-side event forwarding.
- No frontend code changes. No JSX, JS, or CSS files were modified.
- No backend changes. No API, model, or route files were modified.
- No env or package file changes.
- No Meta Pixel changes.
- No existing GTM trigger, tag, or variable removed or modified.
- No campaign performance data exists at time of writing.
- No campaign results are claimed.
- No audience size sufficient for delivery is confirmed at time of writing.
- No manual Google tag snippet installed in source code.

---

## 12) Deferred Items

| Item                          | Status                        | Notes                                                                                                                                                                                                                                                    |
| ----------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Google Consent Mode           | **Newly relevant — deferred** | Google Consent Mode was previously classified as "not relevant until Google tag is configured at site level." Google tag is now configured. Google Consent Mode is a separate bounded workstream. Must not be mixed with the Search retargeting contour. |
| Google Ads conversion actions | Deferred                      | No conversion tracking configured in this workstream. Future contour if needed.                                                                                                                                                                          |
| Enhanced conversions          | Deferred                      | Requires additional data mapping. Not part of this contour.                                                                                                                                                                                              |
| GA4 site-level base           | Deferred                      | Separate bounded workstream. Must not be mixed with Google Ads or Meta work.                                                                                                                                                                             |

---

## 13) Superseded Historical Statements

This handoff supersedes the following **specific statements** in earlier documents. It does not render those documents obsolete — all other content in them remains valid.

| File                                                                                                               | Location                           | Stale statement                                                                                    | Status                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------ | ---------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/handoffs/current/Cardigo_Enterprise_Handoff_2026-05-17_GTM_V7_StartFreeCardIntent_Meta_Conversion_Closed.md` | Line 173                           | "No GA4 / Google Ads / Google tag changes. Google retargeting contour remains explicitly stopped." | Superseded. That statement was accurate at 2026-05-17 within the scope of the GTM V7 workstream. GTM V8 has now configured the Google Ads tag. |
| `docs/handoffs/archive/Cardigo_Enterprise_Master_Handoff_2026-04-10_TRACKING_CLOSED_PLAYBOOK.md`                   | Line 164 (operational truth table) | "Google tag / GA4 / Google Ads: Not configured at site level"                                      | Superseded. Google Ads Google tag is now configured at site level via GTM.                                                                     |
| `docs/handoffs/archive/Cardigo_Enterprise_Master_Handoff_2026-04-10_TRACKING_CLOSED_PLAYBOOK.md`                   | Line 172 (deferred contours table) | "Google Ads retargeting base: Explicitly stopped"                                                  | Superseded. Google Ads retargeting base is now live.                                                                                           |
| `docs/handoffs/archive/Cardigo_Enterprise_Master_Handoff_2026-04-10_TRACKING_CLOSED_PLAYBOOK.md`                   | Line 183 (deferred contours table) | "Google Consent Mode: Deferred — Not relevant until Google tag is configured at site level"        | Partially superseded. Google tag is now configured. Google Consent Mode is now a relevant open deferred item.                                  |
| `docs/handoffs/archive/Cardigo_Enterprise_Master_Handoff_2026-04-11_ADS_PLAYBOOK_AND_NEXT_CHAT_FULL.md`            | Lines 584–585                      | "Google retargeting contour explicitly stopped / deferred. Его сейчас не продолжаем."              | Superseded. Google Ads retargeting is now live.                                                                                                |

No archive documents were edited. The above statements are noted here as historical context only.
