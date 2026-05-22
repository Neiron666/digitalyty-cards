# Cardigo Enterprise Handoff — Help & Support Editor Tab Closed

**Date:** 2026-05-22
**Contour:** SETTINGS_HELP_SUPPORT_TAB
**Status:** CLOSED / PASS
**Manual smoke:** PASSED by operator

---

## 1. Executive Summary

A new editor sidebar tab "עזרה" was added to the card editor. The tab opens a static panel titled "עזרה ותמיכה" that provides users with direct support contact actions via WhatsApp and email. The implementation is frontend-only: no backend API calls, no analytics/tracking hooks, no phone row, no /contact link, no tel link. The panel is free for all users (not premium-gated).

---

## 2. Final User-Facing Behavior

**Sidebar tab label:** עזרה

**Panel title:** עזרה ותמיכה

**Intro copy:**
צריכים עזרה ביצירת הכרטיס, בהגדרות או בכל דבר אחר? פשוט כתבו לנו - ונשמח לעזור.

**CTAs (two only):**

- WhatsApp button — opens https://wa.me/972545811900 in new tab
- Email button — opens mailto: to support@cardigo.co.il

No phone row. No /contact link. No tel link.

---

## 3. Changed Files

All paths relative to `frontend/src/`:

- `components/editor/editorTabs.js` — Added `export const PANEL_HELP = "help"` and appended `PANEL_HELP` as last entry in `EDITOR_CARD_TABS` Object.freeze array.
- `components/icons/EditorTabIcons.jsx` — Added `HelpIcon` export using existing inline `svgProps` factory pattern.
- `components/editor/EditorSidebar.jsx` — Added `HelpIcon` and `PANEL_HELP` imports; appended `{ id: PANEL_HELP, label: "עזרה" }` to TABS array; appended `[PANEL_HELP]: HelpIcon` to TAB_ICON map. `isPremiumTab()` left unchanged — help tab is free.
- `components/editor/EditorPanel.jsx` — Added `import HelpPanel` and `case "help": return <HelpPanel />;` in the panel switch.
- `utils/supportContact.js` — CREATED. Exports `SUPPORT_EMAIL` and `SUPPORT_WHATSAPP_URL`. Currently consumed only by HelpPanel.
- `components/editor/panels/HelpPanel.jsx` — CREATED. Static panel using `Panel` and `Button` primitives. No state, no hooks, no API calls, no tracking.
- `components/editor/panels/HelpPanel.module.css` — CREATED. CSS Modules only, Flexbox only, no grid, all font-size via existing `var(--fs-*)` tokens.

---

## 4. Architecture Notes

- `PANEL_HELP` was appended to `EDITOR_CARD_TABS` (the SSoT freeze array in `editorTabs.js`). `Editor.jsx` and `EditCard.jsx` build their `allowedTabs` / `validCardTabs` sets from that array, so the "help" route is accepted by existing tab guards without any direct modification to those files.
- The help tab is not passed to `isPremiumTab()` — it remains free for all users.
- `HelpIcon` follows the existing inline `svgProps` factory pattern used by all other icons in `EditorTabIcons.jsx`.
- `HelpPanel` uses the existing `Panel` wrapper component and the existing `Button` UI primitive; no new shared components were introduced.
- `utils/supportContact.js` is a bounded frontend config file currently consumed only by `HelpPanel`. It is NOT claimed to be the global contact SSoT for all Cardigo contact surfaces. `Contact.jsx` and billing support flows remain unchanged and independent.

---

## 5. Security / Privacy Notes

- WhatsApp CTA uses `target="_blank"` with `rel="noopener noreferrer"`.
- No user data, card data, email addresses, or slugs are injected into any external URL.
- No `siteAnalytics` calls, no `trackSiteClick` calls, and no analytics hooks of any kind were added to HelpPanel.
- No backend API calls were added.
- `HelpPanel` is purely static markup consuming two public config constants.

---

## 6. CSS / Design Constraints

- CSS Modules only. No inline styles.
- Flexbox only. No CSS Grid anywhere.
- All `font-size` declarations use existing approved `var(--fs-*)` tokens only. No numeric font-size values.
- During Phase 2D proof, an invalid token `var(--fs-body-large)` (introduced via manual edit) was detected and corrected to `var(--fs-body-lg)` before Phase 3 gates.
- `var(--lh-normal)` is not used. That token is defined only in `CardLayout.module.css` (card-scope) and must not leak into the editor shell. `HelpPanel.module.css` uses plain `line-height: 1.5` instead.
- Phone row CSS classes (`contactRow`, `contactLabel`, `contactValue`) are absent — removed by UX decision in Phase 2B.

---

## 7. Verification Summary

Frontend gates (run from `frontend/`, all EXIT 0):

- `npm.cmd run check:inline-styles` — EXIT:0 — PASS
- `npm.cmd run check:skins` — EXIT:0 — PASS (28 skin files scanned)
- `npm.cmd run check:contract` — EXIT:0 — PASS (25 registry templates)
- `npm.cmd run build` — EXIT:0 — PASS (380 modules transformed)

Targeted Select-String checks: 21/21 PASS.

Raw build re-run in Phase 3B independently confirmed: 380 modules, EXIT:0, built in 3.22s.

Operator manual browser smoke: PASSED (2026-05-22). All 14 checklist items confirmed, including sidebar tab visibility, panel title and copy, both CTAs, no phone row, WhatsApp new-tab, email client, keyboard focus-visible, mobile drawer scroll, and sibling tab regression.

---

## 8. Explicit Non-Actions

The following were explicitly NOT done in this contour:

- No backend changes of any kind.
- No analytics or tracking changes.
- No extraction or modification of `Contact.jsx`.
- No /contact link added anywhere.
- No tel: link added anywhere.
- No phone row.
- No changes to `Editor.jsx` or `EditCard.jsx` (tab guards updated automatically via SSoT).
- No changes to any other docs file.

---

## 9. Future Optional Follow-Up (Non-Blocking)

A future separate bounded contour may extract `Contact.jsx` to reuse `supportContact.js` if broader support-contact SSoT consolidation becomes desired across all Cardigo contact surfaces. This is not required for the closed Help tab contour and must not be assumed or acted upon without an explicit bounded workstream.
