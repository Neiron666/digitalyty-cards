# Cardigo Enterprise Handoff — 2026-06-08

## PublicCard: Location Section, Maps/Waze Navigation, PostalAddress JSON-LD, Non-Premium Sanitization

**Date:** 2026-06-08
**Status:** CLOSED / PRODUCTION VERIFIED
**Production smoke:** Confirmed — premium org card `/c/digitalyty/kartis-bikur-digitali-lemetavech-nadlan`

---

## 1. Contours Closed

1. `PUBLICCARD_LOCATION_SECTION_PREVIEW_SPECIFICITY_FIX_P2F`
2. `PUBLICCARD_LOCATION_POSTALADDRESS_JSONLD_P2A_SEOGEN`
3. `PUBLICCARD_LOCATION_NONPREMIUM_JSONLD_SANITIZE_P2A`
4. `PUBLICCARD_GITIGNORE_DIST_SSR_ENV_LOCAL_P0`

**Umbrella schema contour ID (seo-public-indexability-runbook.md table):** `PUBLIC_CARD_LOCATION_POSTALADDRESS_JSONLD_P3`

---

## 2. Executive Summary

Premium public cards now display a dedicated LocationSection featuring a Google Maps iframe and round navigation bubble buttons (Google Maps + Waze), generated from `business.address` + `business.city` + country "ישראל". A matching Waze header button appears in the contact button row for premium cards with a complete address. The "צור מידע מובנה" JSON-LD generator in the SEO panel now populates `address.streetAddress` from `business.address` for LocalBusiness schema. Non-premium public cards receive a render-time sanitizer on both the browser path (`PublicCard.jsx`) and the OG/Edge path (`cardPublicProjection.util.js`) that removes `streetAddress`, `geo`, `latitude`, and `longitude` from any saved LocalBusiness JSON-LD regardless of what was previously saved. A P0 repo hygiene fix was applied to `.gitignore` to prevent future leaks of `dist_ssr/` build artifacts and `.env.local` files containing API keys.

---

## 3. Files Changed

| File                                                               | Role                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend/src/components/card/sections/LocationSection.module.css` | P2F: added `:global([data-preview="phone"]) .navBubbles .navItem` block at specificity 0,3,0 to defeat CardLayout `@container phone` override (0,2,1) that caused nav buttons to stack vertically in editor preview. Public card rendering unchanged.         |
| `frontend/src/components/editor/panels/SeoPanel.jsx`               | P2A SEO gen: added `address.streetAddress` from `business.address` (via `trimStr`) to the LocalBusiness JSON-LD generator. Only populated when non-empty. Does not add `geo`, `latitude`, or `longitude`.                                                     |
| `frontend/src/pages/PublicCard.jsx`                                | P2A sanitize browser: added pure module-scope helper `sanitizeLocationFieldsForNonPremiumJsonLd()`. `SeoHelmet` `jsonLd` prop is now conditional: premium (`canUseServices === true`) receives raw `card.seo?.jsonLd`; non-premium receives sanitized string. |
| `backend/src/utils/cardPublicProjection.util.js`                   | P2A sanitize OG: added pure helper `sanitizeLocationFieldsForNonPremiumJsonLdItem()`. `toCardPublicSeoDTO` now applies the sanitizer to `rawUserJsonLdItems` when `dto.entitlements.canUseServices !== true`. Auto-generated FAQPage item is never sanitized. |
| `.gitignore`                                                       | P0: added `/frontend/dist_ssr/`, `.env.local`, `.env.*.local`, `frontend/.env.local`, `frontend/.env.*.local` to prevent future leaks of SSR build artifacts and env files containing API keys.                                                               |

---

## 4. LocationSection Feature Architecture

### Premium gate

`LocationSection` renders only when `card?.entitlements?.canUseServices === true` AND `business.address` AND `business.city` are both non-empty. Free/non-premium cards do not render this section under any circumstances.

### Data SSoT

`business.address` and `business.city` are the exclusive SSoT for all navigation links. Country is hardcoded as "ישראל" / `"IL"`. No geocoding is performed.

### Google Maps iframe

Rendered when `VITE_GOOGLE_MAPS_EMBED_API_KEY` is present in the environment. If the key is absent, the iframe is not rendered but the round navigation bubble buttons still render and function. Key must be a browser-restricted key (HTTP referrers limited to cardigo.co.il and localhost). Key must never be committed to git — stored in `.env.local` only (now gitignored) and set in Netlify environment variables for production.

### Navigation buttons

Two round bubble buttons inside LocationSection: Google Maps navigate link and Waze deep-link, both generated from `business.address + business.city + "ישראל"`. Labels: "נווט עם גוגל" and "נווט עם Waze". Visual style matches ContactButtons bubble language.

### Header Waze button

`ContactButtons.jsx` renders a Waze button in the top contact button row for premium cards that have a complete address. Generated from the same `business.address` + `business.city` SSoT.

### Address input in BusinessPanel

The address text input (`business.address`) is premium-gated in the editor BusinessPanel. Non-premium owners cannot set or see this field.

### Public DTO server-side gate

`stripPremiumLocationFieldsForPublicDto` in `card.controller.js` strips `business.address`, `business.lat`, `business.lng` from public slug responses for non-premium cards. This is the primary server-side gate. The P2A render-time sanitizers in `PublicCard.jsx` and `cardPublicProjection.util.js` operate on `seo.jsonLd` as a defense-in-depth layer for saved JSON-LD strings.

---

## 5. contact.waze UI Removal and Schema Invariant

- The `contact.waze` field input was removed from the editor ContactPanel UI (prior contour, already closed before this workstream).
- The `contact.waze` field **remains** in `Card.model.js` schema and in the database. It is **NOT** rendered by `ContactButtons.jsx` or `LocationSection.jsx`. Existing values are silently retained in DB but not surfaced in any public UI.
- Waze navigation in LocationSection and the header button is generated exclusively from `business.address` + `business.city`. `contact.waze` plays no role.
- `isValidWazeOrHttpUrl()` validator in `Card.model.js` remains in place for schema validation of the field.

---

## 6. JSON-LD Generator Behavior (צור מידע מובנה — P2A SEO GEN)

The "צור מידע מובנה" button in `SEO וסקריפטים → נתונים מובנים` calls `buildJsonLdTemplate()` via `executeJsonLdInsert()` and writes the result to the `seo.jsonLd` draft field (textarea). **Saving requires an explicit "שמור שינויים" click.**

### LocalBusiness — fields generated (post P2A)

| Field                     | Source                             | Condition                               |
| ------------------------- | ---------------------------------- | --------------------------------------- |
| `@context`                | `"https://schema.org"` (hardcoded) | Always                                  |
| `@type`                   | `"LocalBusiness"`                  | Always                                  |
| `name`                    | `business.name`                    | If non-empty                            |
| `url`                     | card `publicPath` / canonical URL  | If available                            |
| `image`                   | `design.logo`                      | If valid absolute http(s) URL           |
| `telephone`               | `contact.phone`                    | If non-empty                            |
| `email`                   | `contact.email`                    | If non-empty                            |
| `address.@type`           | `"PostalAddress"` (hardcoded)      | Always present in address object        |
| `address.streetAddress`   | `business.address` via `trimStr`   | If non-empty **(added P2A 2026-06-08)** |
| `address.addressLocality` | `business.city` via `trimStr`      | If non-empty                            |
| `address.addressCountry`  | `"IL"` (hardcoded)                 | Always present in address object        |
| `sameAs`                  | social links from `contact.*`      | If at least one social link exists      |

### Intentionally NOT generated

- `geo` — not generated. No schema.org `GeoCoordinates` object is added.
- `latitude` / `longitude` — not generated.
- No geocoding is performed. `business.address` is a free-text string only.

### Existing saved JSON-LD is NOT auto-updated

Running "צור מידע מובנה" only writes to the draft when the owner clicks the button. Existing `seo.jsonLd` values saved before P2A are not modified automatically. To add `streetAddress` to a previously saved schema: (1) open SEO וסקריפטים → נתונים מובנים, (2) click "צור מידע מובנה", (3) click "שמור שינויים".

---

## 7. Non-Premium JSON-LD Sanitization — Render-Time Privacy Guard (P2A SANITIZE)

**Reason:** A downgraded card retains its previously saved `seo.jsonLd` string. The existing `stripPremiumLocationFieldsForPublicDto` strips `business.address` from the DTO but does not modify `seo.jsonLd`. Without this guard, a downgraded card that had previously saved a LocalBusiness JSON-LD with `streetAddress` would continue to expose it in public HTML.

### Fields removed from non-premium LocalBusiness items

- `address.streetAddress`
- `geo` (top-level key)
- `latitude` (top-level key)
- `longitude` (top-level key)

### Fields preserved

- `address.@type` (e.g. `"PostalAddress"`)
- `address.addressLocality`
- `address.addressCountry`
- `address` object is retained as long as it has remaining fields after removing `streetAddress`; if only `streetAddress` was present, `address` is dropped entirely
- All non-LocalBusiness items (`FAQPage`, `Organization`, `Person`, `Service`) pass through unchanged

### Sanitizer locations

**Browser path:** `sanitizeLocationFieldsForNonPremiumJsonLd()` in `frontend/src/pages/PublicCard.jsx` (module-scope pure function). Operates on the raw `seo.jsonLd` string. Called only when `card?.entitlements?.canUseServices !== true`. Parse failure returns the original string unchanged (fail-open).

**OG/Edge path:** `sanitizeLocationFieldsForNonPremiumJsonLdItem()` in `backend/src/utils/cardPublicProjection.util.js`. Operates on already-parsed items from `normalizeJsonLd()`. Applied via `.map()` to `rawUserJsonLdItems` when `canUseServices !== true`. Edge function (`og-preview.js`) is a pass-through of OG backend HTML — sanitizing OG automatically sanitizes Edge.

### SeoHelmet

Not modified. The sanitized JSON string is passed as the `jsonLd` prop; SeoHelmet emits it unchanged.

### Auto-FAQPage item

The auto-generated FAQPage item (built from `extractPublicFaqItems(dto)`) is created after the sanitization pass and is never passed through the sanitizer.

---

## 8. Analytics Action Registry

| Button                             | Action string sent | Notes                                                                                                          |
| ---------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------- |
| LocationSection Google Maps button | `"maps"`           | New action                                                                                                     |
| LocationSection Waze button        | `"waze"`           | New action                                                                                                     |
| Header contact Waze button         | `"waze"`           | New action                                                                                                     |
| Legacy `"navigate"`                | —                  | Retained in backend `normalizeAction` allowlist for backward compatibility only; no new code emits this action |

Actions are first-party always-on analytics (not consent-gated per `docs/policies/privacy-consent-and-tracking.md` Section 1).

---

## 9. Production Smoke

### Browser JSON-LD smoke — premium card, local (operator-run)

| Field            | Result                   |
| ---------------- | ------------------------ |
| hasLocalBusiness | true ✅                  |
| hasPostalAddress | true ✅                  |
| streetAddress    | "נורדאו 10" — present ✅ |
| addressLocality  | "חיפה" ✅                |
| addressCountry   | "IL" ✅                  |
| hasGeo           | false ✅                 |
| hasLatitude      | false ✅                 |
| hasLongitude     | false ✅                 |

### OG endpoint smoke — production, premium org card

`curl -s "https://cardigo.co.il/og/c/digitalyty/kartis-bikur-digitali-lemetavech-nadlan"`

Result: `streetAddress` "נורדאו 12" and `addressLocality` "חיפה" confirmed present in OG HTML; `geo`/`latitude`/`longitude` absent. EXIT 0.

### Pending smokes

- Free/non-premium browser smoke: `BLOCKED_BY_FIXTURE` — no safe local fixture exists with a non-premium card that has saved LocalBusiness JSON-LD containing `streetAddress`. Static proof of sanitizer logic is complete.
- OG non-premium smoke: `BLOCKED_BY_FIXTURE` — same reason.

---

## 10. .gitignore Hygiene Fix (P0)

**Root cause:** `dist_ssr/` was not in `.gitignore`. When `vite build --ssr` ran with `VITE_GOOGLE_MAPS_EMBED_API_KEY` present in `.env.local`, the key was baked inline into `dist_ssr/entry-server.js` and `dist_ssr/assets/CardRenderer-*.js` at build time.

**Fix applied to `.gitignore`:**

```
/frontend/dist_ssr/
.env.local
.env.*.local
frontend/.env.local
frontend/.env.*.local
```

**Operator actions required:**

1. Revoke the leaked Google Maps API key in Google Cloud Console.
2. Create a new restricted key (HTTP referrers: `cardigo.co.il/*` and `localhost`).
3. Run `git rm -r --cached frontend/dist_ssr/` to untrack already-committed artifacts.
4. Set the new key in Netlify environment variables and in local `.env.local` only.

---

## 11. API Key Governance

- `VITE_GOOGLE_MAPS_EMBED_API_KEY` must exist only in:
    - `frontend/.env.local` (local dev, now gitignored)
    - Netlify environment variables (production)
- Never commit this key to git. Never include it in `dist_ssr/` artifacts (now gitignored).
- `frontend/.env.example` lines 11-15 document the key with an empty value and full setup instructions.
- Key type: browser key restricted to HTTP referrers. Do not use a service account or server key.

---

## 12. Anti-Overclaim Assertions

The following are explicitly NOT true and must NOT be stated in code, comments, or documentation:

- This feature does **NOT** perform geocoding. `business.address` is a free-text string; no coordinates are derived or stored.
- `geo`, `latitude`, `longitude` are **NOT** generated in the JSON-LD template and **NOT** stored anywhere.
- Existing saved `seo.jsonLd` is **NOT** automatically updated when `business.address` is changed or when the card is downgraded. Owner must regenerate manually via "צור מידע מובנה" and save.
- LocationSection does **NOT** render for free/non-premium cards. `canUseServices === true` is required.
- `contact.waze` is **NOT** rendered. The UI input was removed. Waze navigation uses `business.address` + `business.city` only.

---

## 13. Non-Actions — Files NOT Changed

`SeoHelmet.jsx`, `cardDTO.js`, `card.controller.js`, `og.routes.js`, `cardOgHtml.service.js`, `og-preview.js`, `LocationSection.jsx`, `ContactButtons.jsx`, `CardLayout.jsx`, `Card.model.js` — all confirmed unchanged by this workstream (timestamps verified 2026-06-08).

---

## 14. Deferred / Tails

- Free/non-premium sanitizer smoke against a real fixture: DEFERRED until a safe fixture is created in a local/dev DB.
- OG non-premium endpoint smoke: DEFERRED.
- `normalizeAction` allowlist: legacy `"navigate"` entry should be reviewed and eventually removed when confirmed no active events use it. Deferred to a future analytics cleanup contour.
