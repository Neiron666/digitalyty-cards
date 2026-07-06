# Cardigo Enterprise Handoff — 2026-06-07

## Card Analytics: Contact Actions Breakdown + Owner Self-Exclusion Scoped Key

**Date:** 2026-06-07
**Status:** CLOSED / PASS / LOCAL BROWSER VERIFIED
**Production smoke:** Pending after deploy.

---

## 1. Contours Closed

1. `CARD_ANALYTICS_CONTACT_ACTION_PERIOD_UX_P2B`
2. `CARD_ANALYTICS_OWNER_SELF_EXCLUSION_P2A_SCOPED_KEY_REPAIR`

---

## 2. Executive Summary

The card analytics editor panel (`/edit/card/analytics`) now displays contact action click counts across three time periods — today, 7 days, 30 days — in a four-column table showing only phone (טלפון) and WhatsApp (וואטסאפ) rows. The backend `getActions` endpoint was extended to accept `range=1` (today's UTC day). All other analytics endpoints (`getSummary`, `getSources`, `getCampaigns`) remain on `[7, 30]` only.

Additionally, the owner self-exclusion toggle ("אל תכלול את הביקורים שלי באנליטיקה") was repaired from a global localStorage key — which incorrectly suppressed tracking on every Cardigo card in the owner's browser — to a per-public-path scoped key. The fix is browser-local only; no backend auth, schema, index, or migration changes were required.

---

## 3. Files Changed

| File                                                              | Role                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend/src/controllers/analytics.controller.js`                 | `getActions`: `parseRange` allowed changed from `[7, 30]` to `[1, 7, 30]` at line 782. All other endpoints unchanged.                                                                                                                                                                                                                                                                                               |
| `backend/scripts/sanity-analytics.mjs`                            | Two new assertions added: `orgActionsRange1` (range=1 → rangeDays=1) and `orgActionsBadRangeFallback` (range=99 → rangeDays=30). Check keys at lines 140–141; assertion blocks at lines 285–305.                                                                                                                                                                                                                    |
| `frontend/src/services/analytics.client.js`                       | Global self-exclusion replaced with path-scoped model. Added: `LEGACY_OWNER_SELF_EXCLUDE_KEY`, `OWNER_SELF_EXCLUDE_KEY_PREFIX`, `normalizeOwnerSelfExcludePath()`, `getOwnerSelfExcludeKey()`, `isOwnerSelfExcludedForCurrentPath()`. `trackView`/`trackClick` guards updated.                                                                                                                                      |
| `frontend/src/components/editor/panels/AnalyticsPanel.jsx`        | Added `actions1`/`actions7`/`actions30` states; three separate range API calls with `.catch(() => null)`; four-column contact-actions table (פעולה / היום / 7 ימים / 30 ימים) for טלפון and וואטסאפ only. Owner self-exclusion: `selfExcludeKey` from `useMemo(card?.publicPath)`, `useEffect` initialises scoped key and removes legacy global key, toggle writes scoped key, row hidden when `publicPath` absent. |
| `frontend/src/components/editor/panels/AnalyticsPanel.module.css` | Pre-existing `.selfExcludeRow` / `.selfExcludeLabel` / `.selfExcludeHint` classes (present before repair contour). No new CSS rules added in this repair.                                                                                                                                                                                                                                                           |

---

## 4. Backend Contract

### `GET /api/analytics/actions/:cardId`

| Parameter                   | Accepted values              | Notes                                               |
| --------------------------- | ---------------------------- | --------------------------------------------------- |
| `range=1`                   | ✅ NEW                       | Today's UTC day key only (`dayKeysBack(1)`).        |
| `range=7`                   | ✅                           | Last 7 UTC days.                                    |
| `range=30`                  | ✅                           | Last 30 UTC days.                                   |
| `range=99` (or any invalid) | Falls back to `rangeDays=30` | `parseRange` rejects values not in `allowed` array. |
| `range=bad`                 | Falls back to `rangeDays=30` | Non-numeric → `parseInt` → `NaN` → fallback.        |

- Demo cards: always return `rangeDays: 30` regardless of `range` param (demo branch fires before `parseRange`).
- Auth: `requireAuth` enforced. No auth → 401.
- Route: `analytics.routes.js` line 18 — unchanged.

### Other analytics endpoints (unchanged)

| Endpoint                               | `parseRange` allowed                                           |
| -------------------------------------- | -------------------------------------------------------------- |
| `GET /api/analytics/summary/:cardId`   | `[7, 30]`                                                      |
| `GET /api/analytics/sources/:cardId`   | `[7, 30]`                                                      |
| `GET /api/analytics/campaigns/:cardId` | `[7, 30]`                                                      |
| `POST /api/analytics/track`            | No range param. Always 204. No auth. CSRF-exempt (sendBeacon). |

### No schema / index / migration

`CardAnalyticsDaily` model, indexes, and migration scripts are unchanged.

---

## 5. Frontend Contact-Actions UX

- **Section title:** לחיצות על כפתורי קשר (`SECTION_COPY.contactActions.title`, `AnalyticsPanel.jsx` line 29)
- **Section subtitle:** כמה פעמים מבקרים לחצו על טלפון או וואטסאפ לפי תקופה. (`AnalyticsPanel.jsx` line 31)
    - Old copy "בתקופה הנבחרת" is **absent**.
- **Section visibility:** shown when any of `actions1`, `actions7`, `actions30` is non-null (OR condition). Failed individual range requests do not hide the section.
- **Table columns:** פעולה | היום | 7 ימים | 30 ימים
- **Table rows:** טלפון (maps to `actions.call`) and וואטסאפ (maps to `actions.whatsapp`) — **only these two rows**. No dynamic action-key rendering.
- **Cell when range state is `null`** (API request failed / threw): displays `"-"`.
- **Cell when range state is non-null but action key absent** (e.g. no WhatsApp clicks yet): `Number(undefined) || 0` → displays `0`.
- **Demo values:** `DEMO_ACTIONS_1 = { call: 2, whatsapp: 5 }`, `DEMO_ACTIONS_7 = { call: 11, whatsapp: 28 }`, `DEMO_ACTIONS_30 = { call: 46, whatsapp: 120 }` — synthetic monotonic values for demo tier.

---

## 6. Owner Self-Exclusion Model

### Key format

| Card type     | Key                                                      |
| ------------- | -------------------------------------------------------- |
| Personal card | `cardigo_owner_self_exclude_v1:path:/card/<slug>`        |
| Org card      | `cardigo_owner_self_exclude_v1:path:/c/<orgSlug>/<slug>` |

### Semantics

| Key value                     | Behaviour                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------ |
| Absent                        | `localStorage.getItem()` → `null`. Tracking proceeds normally.                 |
| `"1"`                         | View and click tracking suppressed for that exact public path in that browser. |
| `"0"`                         | Tracking proceeds normally.                                                    |
| `localStorage` blocked/throws | Fail open — tracking proceeds normally.                                        |

### How the key is written

- Written only by `AnalyticsPanel.jsx` `useEffect` (on analytics panel mount) and `handleSelfExcludeChange` (toggle interaction).
- Default: if key is absent when owner opens the analytics panel, written as `"1"` (default excluded).
- Toggle off: writes `"0"`.
- If `card.publicPath` is absent, key is `null`, toggle row is hidden, nothing is written.

### How the key is read

- Read only by `isOwnerSelfExcludedForCurrentPath()` in `analytics.client.js`.
- Reads `window.location.pathname` at the moment `trackView` / `trackClick` fires.
- On a public card page, `window.location.pathname` IS the card's public path — same value written by `AnalyticsPanel`.

### Legacy global key

- Old key `cardigo_owner_self_exclude_v1` (no path scope) is removed via `localStorage.removeItem()` when `AnalyticsPanel` mounts with a valid `selfExcludeKey`.
- This prevents the old global suppression from persisting in browsers that had previously opened the analytics panel.

### What is NOT implemented in this contour

- No backend `optionalAuth` owner detection on `/api/analytics/track`.
- No `isOwner` or `excludeMe` field in the tracking payload.
- No visitor PII stored.
- No event ledger or per-event timestamps.
- No device/user identity tracking.
- Self-exclusion is browser-local only. An owner visiting their card from a different browser, or after clearing `localStorage`, will be counted until they open the analytics panel in that browser.

---

## 7. Verification Summary

### Backend

| Command                                          | Result | Notes                                                                                                                                                                                                    |
| ------------------------------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm.cmd run sanity:imports` (from `backend/`)   | EXIT 0 | `{"ok":true,"importedCount":20,"failedCount":0,"failures":[]}`                                                                                                                                           |
| `npm.cmd run sanity:analytics` (from `backend/`) | EXIT 1 | Controlled-write guard blocked: target DB is production-like (`cardigo_prod`). Expected correct behaviour — not a code failure. Static assertion proof verified at `sanity-analytics.mjs` lines 285–305. |

### Frontend

| Command                                 | Result               | Notes                                                                                          |
| --------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------- |
| `npm.cmd run check:inline-styles`       | EXIT 0               | PASS — no inline styles in scope.                                                              |
| `npm.cmd run check:skins`               | EXIT 0               | PASS — 28 skin files token-only.                                                               |
| `npm.cmd run check:contract`            | EXIT 0               | PASS — 25 template contracts consistent.                                                       |
| `npm.cmd run check:typography`          | EXIT 0 (report-only) | 12 pre-existing violations in `CardLayout.module.css` lines 39–54 only. None in changed files. |
| `npm.cmd run check:typography:boundary` | EXIT 0               | PASS — 19/19 boundary tokens complete.                                                         |
| `npm.cmd run build`                     | EXIT 0               | 399 client modules, 294 SSR modules. SSG all routes. `check:ssg-output` PASS.                  |

---

## 8. Operator Local Browser Verification

Operator confirmed the following via manual browser smoke against the local development environment:

### Contact actions UI

- Section "לחיצות על כפתורי קשר" is visible in `/edit/card/analytics`.
- Subtitle reads "כמה פעמים מבקרים לחצו על טלפון או וואטסאפ לפי תקופה." — old copy "בתקופה הנבחרת" is absent.
- Table columns היום / 7 ימים / 30 ימים present.
- Rows טלפון and וואטסאפ present.
- Existing KPI cards, chart, sources, campaigns sections continue to render.

### Owner self-exclusion smoke

- After removing all `cardigo_owner_self_exclude_v1*` keys in DevTools LocalStorage:
    - Legacy global key `cardigo_owner_self_exclude_v1` is **not** re-created.
    - Scoped key (`cardigo_owner_self_exclude_v1:path:/card/<slug>` or `.../c/<orgSlug>/<slug>`) is written with value `"1"`.
    - Toggle is checked (default ON).
- With scoped key `"1"`: no `POST /api/analytics/track` fires on public card view or button click. **PASS.**
- After unchecking toggle (key written as `"0"`): `POST /api/analytics/track` fires for both view and button clicks. **PASS.**
- Owner visiting a different Cardigo card (different public path): `POST` fires normally — owner is not suppressed on other cards. **PASS.**

---

## 9. Endpoint Smoke

Operator verified via browser `fetch` console against the local development backend. Card ID is redacted; real ObjectId was not recorded.

| `range` param | HTTP status | `rangeDays` | `hasCallNumber` | Notes                          |
| ------------- | ----------- | ----------- | --------------- | ------------------------------ |
| `1`           | 200         | 1           | true            | Today's UTC day.               |
| `7`           | 200         | 7           | true            | —                              |
| `30`          | 200         | 30          | true            | —                              |
| `99`          | 200         | 30          | true            | Invalid range, fallback to 30. |
| `bad`         | 200         | 30          | true            | Non-numeric, fallback to 30.   |
| (no auth)     | 401         | —           | —               | `requireAuth` enforced.        |

Note on `hasWhatsappNumber`: may be `false` in a fixture where no WhatsApp clicks have been recorded. The frontend renders a missing `actions.whatsapp` key as `0` via `Number(undefined) || 0`.

---

## 10. Non-Actions

The following files and systems were **not changed** in this contour:

- `backend/src/routes/analytics.routes.js` — route definitions and middleware unchanged.
- `backend/src/middlewares/auth.middleware.js` — no new middleware.
- `backend/src/models/CardAnalyticsDaily.model.js` — no schema or index changes.
- `frontend/src/pages/PublicCard.jsx` — `trackView` call unchanged.
- `frontend/src/components/card/sections/ContactButtons.jsx` — `trackClick` calls unchanged; no new arguments.
- Analytics payload shape — no `isOwner`, `excludeMe`, or any new field.
- No schema migration.
- No index governance script.
- No SEO / OG / Edge files.
- No billing / auth / org files.
- No templates or skins.

---

## 11. Remaining Non-Blocking Tails

1. **Backend optionalAuth owner-skip deferred.** The `/api/analytics/track` route has no server-side owner detection. Self-exclusion is browser-local only. An owner visiting their card from a different browser (or after clearing `localStorage`) will be counted until they open the analytics panel in that browser. Acceptable product limitation for now.

2. **Self-exclusion is per-browser / per-publicPath only.** Expected by design.

3. **Slug rename orphans old scoped key.** If the owner renames their card slug, the old key (`…:path:/card/old-slug`) becomes an orphan in `localStorage`. The new path gets a fresh default-ON key the next time the owner opens the analytics panel. Owner may be counted in the interim. Infrequent operation; auto-heals on next analytics panel open.

4. **`sanity:analytics` must not be run against `cardigo_prod`.** The controlled-write guard correctly blocked execution in Phase 3. To verify assertions live, run against a disposable dev or CI database only:

    ```
    CARDIGO_ALLOW_CONTROLLED_WRITE_SANITY_ON_PRODUCTION_LIKE_DB=I_UNDERSTAND_THIS_CAN_WRITE_TEST_FIXTURES npm.cmd run sanity:analytics
    ```

5. **Pre-existing `.kpis` grid debt.** `AnalyticsPanel.module.css` contains `display: grid` on `.kpis` (the KPI card row). This predates this contour and is a known rule:1.3 violation (no Grid policy). Not introduced by this workstream.

---

## 12. Closure Statement

CLOSED / PASS / LOCAL BROWSER VERIFIED

Both contours are fully implemented, statically verified, and operator-confirmed via local browser smoke. All frontend gates passed (EXIT 0). Backend static contract verified. Production smoke pending after deploy.
