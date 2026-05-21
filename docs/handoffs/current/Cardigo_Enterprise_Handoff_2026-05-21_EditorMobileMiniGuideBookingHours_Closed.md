# Cardigo Enterprise Handoff — Editor Mobile Mini-Guide: תורים ושעות — Closed

**Date:** 2026-05-21
**Project:** Cardigo — Israel-first digital business card SaaS
**Canonical domain:** https://cardigo.co.il
**Status:** CLOSED / CODE VERIFIED / OPERATOR-SMOKED / FRONTEND GATES PASS / READY FOR DEPLOY CHECKLIST

---

## 1. Contours

EDITOR_MOBILE_GUIDE_MINI_TOUR_BOOKING_HOURS
EDITOR_MOBILE_GUIDE_MINI_TOUR_BOOKING_HOURS_CONTROL_ACTION_BUG_P2_FIX

---

## 2. Executive Summary

This handoff closes the third authenticated mobile mini-guide workstream. A new step-by-step coach panel guide titled "תורים ושעות" was added to the existing `מדריך` dropdown on the `/edit/card/templates` route. The guide walks a premium authenticated user through the steps required to configure booking availability and business hours.

Two sub-contours are closed in this workstream:

1. **Initial implementation** — five modified files, new steps factory `buildBookingHoursSteps`, context-aware conditional steps, new `BOOKING_HOURS` guide ID.
2. **Control-action bug fix** — `useEditorMiniGuide.js` only. Replaced `isLabelClickStep` with `isCheckboxChangeStep` (change listener on nested input, `checked === true` guard, `setTimeout(0)` deferral) and added `isListboxSelectStep` (click listener on wrapper element, `[role="option"]` guard, `setTimeout(0)` deferral).

The guide reuses the existing `useEditorMiniGuide` hook, `TourMiniPanel` component, and all drawer orchestration infrastructure introduced in prior mini-guide contours.

**Operator smoke:** PASS.
**Frontend gates:** all EXIT:0.
**Ready for deploy checklist:** see §12.
**Not production verified yet:** no production deploy was executed as part of this contour.

No backend changes. No API route changes. No CSS changes. No save/commitDraft logic changes. No BusinessHoursPanel handler changes. No schema or index changes. No env variable changes. No auth, payment, billing, SEO, OG, sitemap, tracking, anonymous-guide, or drawer a11y changes.

---

## 3. Product / UX Truth

### 3.1 Scope

- **Audience:** authenticated personal-card users with both `canUseBusinessHours === true` AND `canUseBooking === true`.
- **Route:** `/edit/card/templates`.
- **Entry point:** existing `מדריך` dropdown in the mobile topbar.
- **New dropdown item:** "תורים ושעות" — renders third, after "איך לשתף כרטיס" and "SEO וסקריפטים", before env-controlled video guide links.
- **Replay:** guide is fully replayable on every dropdown click; no localStorage state.
- **No completion persistence:** guide does not write any localStorage key on completion.
- **Guide does not write by itself:** the guide only navigates and highlights existing UI elements. No data writes occur from guide code. Actual writes happen only through existing user toggle/checkbox actions and the existing `שמור שינויים` save button, exactly as before.

### 3.2 Dropdown Order

`מדריך` dropdown item render order (source: `Editor.jsx`):

1. "איך לשתף כרטיס" — `{onStartShareMiniGuide ? (...) : null}` — `ref={guideFirstItemRef}`
2. "SEO וסקריפטים" — `{onStartSeoMiniGuide ? (...) : null}`
3. "תורים ושעות" — `{onStartBookingHoursMiniGuide ? (...) : null}` — **no ref**
4. "מדריך לסלולר" — `{GUIDE_URLS.mobile ? (...) : null}` — env-controlled
5. "מדריך למחשב" — `{GUIDE_URLS.desktop ? (...) : null}` — env-controlled

`guideFirstItemRef` focus-on-open behavior is safe: `miniBookingHoursGuideAvailable` requires `miniGuideAvailable`, so the share guide item is always present when the booking guide item is present. Focus always lands on item 1.

### 3.3 Guide Flow

Steps are computed dynamically at `start()` time from card state (`bookingEnabled`, `hoursEnabled`, `week`, `canUseBooking`). Skipped steps are not injected — only applicable steps are built.

Full step sequence (when all steps are applicable — fresh card with no booking/hours configured):

1. **booking-hours-open** — target `editor-tour-sections-menu`: "פתחו את תפריט העריכה." — `requiresDrawer: false`
2. **booking-hours-tab** — target `editor-mini-guide-tab-hours`: "עברו לשעות פעילות." — `requiresDrawer: true`, `isNextDisabledByDefault: true` — "הבא" disabled until user taps the hours tab
3. **booking-enable** — target `editor-mini-guide-hours-booking-enable`: "אפשרו ללקוחות להזמין תורים מהכרטיס." — `isCheckboxChangeStep: true` — **skipped if `bookingEnabled === true` at guide start**
4. **booking-horizon** — target `editor-mini-guide-hours-horizon`: "בחרו כמה זמן קדימה לקוחות יוכלו להזמין." — `isListboxSelectStep: true` — always included when `canUseBooking` is true
5. **hours-show-in-card** — target `editor-mini-guide-hours-show-in-card`: "הפעילו הצגה של שעות הפעילות בכרטיס." — `isCheckboxChangeStep: true` — **skipped if `hoursEnabled === true` at guide start**
   6–15. **hours-{key}-open** / **hours-{key}-add-range** (×5 days, ×2 step types each) — one pair per day: ראשון (sun), שני (mon), שלישי (tue), רביעי (wed), חמישי (thu) — per day: open step skipped if `day.open === true`; add-range step skipped if `day.intervals.length > 0`
6. **booking-hours-save** — target `editor-tour-save-changes`: "שמרו את השינויים." — `isFinalBlockStep: true` — "סיום" or save button click closes guide

### 3.4 Visibility Gating

`onStartBookingHoursMiniGuide` is passed to `Editor` only when all of the following are true:

- `miniGuideAvailable` is true (same base conditions as prior guides: authenticated personal user, templates tab, context resolved, `section === "card"`, `draftCard._id` non-null, `draftCard.publicPath` non-null).
- `draftCard.entitlements.canUseBusinessHours === true`.
- `draftCard.entitlements.canUseBooking === true`.

Source: `EditCard.jsx` — `miniBookingHoursGuideAvailable` computation at L2521–L2524.

When `onStartBookingHoursMiniGuide` is undefined, the "תורים ושעות" dropdown item does not render.

### 3.5 Guide Button Visibility

`showGuideBtn` condition in `Editor.jsx`:

```
isMobile && showGuideDropdown && activeTab === PANEL_TEMPLATES &&
(HAS_ANY_GUIDE_URL || Boolean(onStartShareMiniGuide) || Boolean(onStartSeoMiniGuide) || Boolean(onStartBookingHoursMiniGuide))
```

The `מדריך` button renders if at least one guide item or video URL is available.

Source: `Editor.jsx` L256–L263.

### 3.6 Step Advance Mechanics

#### isCheckboxChangeStep steps (booking-enable, hours-show-in-card, per-day-open)

These steps target a `<label>` element that wraps a `<input type="checkbox">`. Advance fires when:

1. The effect queries `activeTargetEl.querySelector('input[type="checkbox"]')`.
2. If not found or `disabled`, effect returns early (no-op).
3. A `change` listener is attached to the nested input.
4. On `change`, if `e.target.checked !== true`, listener returns (no advance on uncheck).
5. If `checked === true`, sets `handled = true`, schedules `advance()` via `setTimeout(0)`.
6. Cleanup: sets `handled = true`, clears timer, removes listener.

The `setTimeout(0)` deferral ensures React's `onChange`/state update completes before the guide advances. No `preventDefault`, no `stopPropagation`.

Generic click-to-advance skips these steps entirely (guard at `useEditorMiniGuide.js` L382).

#### isListboxSelectStep steps (booking-horizon)

This step targets the `<div data-tour-id="editor-mini-guide-hours-horizon">` wrapper around `TimeListbox`. The advance fires when:

1. A `click` listener is attached to the wrapper element (`activeTargetEl`).
2. On `click`, checks `e.target?.closest?.('[role="option"]')`.
3. If no `[role="option"]` ancestor found (trigger button, backdrop, etc.) → returns early.
4. If `[role="option"]` found → sets `handled = true`, schedules `advance()` via `setTimeout(0)`.
5. Cleanup: sets `handled = true`, clears timer, removes listener.

The `[role="option"]` guard prevents the trigger button click (which opens the listbox) from advancing the guide. Only an actual option selection advances. The `setTimeout(0)` deferral ensures the option's own React `onClick` fires first. No `preventDefault`, no `stopPropagation`.

Generic click-to-advance skips these steps entirely (guard at `useEditorMiniGuide.js` L383).

---

## 4. Architecture

### 4.1 Hook: useEditorMiniGuide

- `MINI_GUIDE_IDS` registry extended: `BOOKING_HOURS: "booking-hours"` added (L6).
- `BOOKING_HOURS_GUIDE_DAYS` constant added: array of `{ key, label }` for five weekdays sun–thu in Hebrew (L109–L115).
- `buildBookingHoursSteps({ canUseBooking, bookingEnabled, hoursEnabled, week })` factory added (L117–L207). Accepts `extraContext` from `start()` call. Dynamically skips steps based on current card state.
- `computeActiveSteps()` dispatch extended: `if (guideId === MINI_GUIDE_IDS.BOOKING_HOURS) return buildBookingHoursSteps(context);` branch added (L216–L218).
- `start(newGuideId, extraContext)` — existing API, unchanged in signature. Merges `extraContext` into context before dispatching (L260–L280). Used by BOOKING_HOURS to pass `{ canUseBooking, bookingEnabled, hoursEnabled, week }`.
- `isCheckboxChangeStep` flag added to applicable steps; dedicated effect at L475–L506. **Replaces** the removed `isLabelClickStep` mechanism. Generic click-to-advance skips steps with this flag (L382).
- `isListboxSelectStep` flag added to horizon step; dedicated effect at L515–L542. Generic click-to-advance skips steps with this flag (L383).
- No changes to `buildShareCardSteps()`, `buildSeoAutoSteps()`, slug/publish advance effects, input/paste advance effects, `isFinalBlockStep` dedicated click effect, or hook return shape.

### 4.2 Component: Editor

- `onStartBookingHoursMiniGuide` destructured from props (L60).
- `showGuideBtn` condition extended with `|| Boolean(onStartBookingHoursMiniGuide)` (L263).
- "תורים ושעות" dropdown button inserted as item 3 in the `מדריך` dropdown JSX (L441–L450).
- Booking guide button has no `ref` — `guideFirstItemRef` remains on item 1 (share guide).
- All existing drawer a11y (`useFocusTrap`, `inert`, focus handoff, Escape handling, scroll lock) unchanged.

### 4.3 Page: EditCard

- `miniBookingHoursGuideAvailable` derived from `miniGuideAvailable && canUseBusinessHours && canUseBooking` (L2521–L2524).
- `miniGuideTitle` ternary extended to three branches: `SEO_AUTO` → "מדריך SEO אוטומטי", `BOOKING_HOURS` → "מדריך תורים ושעות", fallback → "מדריך שיתוף כרטיס" (L2526–L2531).
- `onStartBookingHoursMiniGuide` prop wired to `Editor` with full `extraContext` (L2721–L2737).
- `useEditorMiniGuide` hook call position unchanged — still before all early returns (near L2248).

### 4.4 Component: EditorSidebar

- `data-tour-id` ternary extended: `tab.id === "businessHours" ? "editor-mini-guide-tab-hours" : undefined` added before the final `undefined` fallback (L401–L402).
- All existing anchors (`settings`, `seo`, and others) unchanged.

### 4.5 Component: BusinessHoursPanel

- Five `data-tour-id` anchors added to existing DOM elements. No handler logic changes. No CSS changes. No structural changes.
- `data-tour-id="editor-mini-guide-hours-booking-enable"` on the booking-enable `<label>` (L308).
- `data-tour-id="editor-mini-guide-hours-horizon"` on the `<div>` wrapper around `TimeListbox` (L330).
- `data-tour-id="editor-mini-guide-hours-show-in-card"` on the show-in-card `<label>` (L376).
- `data-tour-id={`editor-mini-guide-hours-${d.key}-closed`}` on each per-day open `<label>` (L410).
- `data-tour-id={`editor-mini-guide-hours-${d.key}-add-range`}` on each per-day add-range `<button>` (L435).

### 4.6 Existing: EditorSaveBar

- `data-tour-id="editor-tour-save-changes"` was already present on the save button (`EditorSaveBar.jsx` L24).
- No changes to `EditorSaveBar.jsx`. The booking-hours guide reuses this existing anchor.

---

## 5. Changed Files

Initial implementation — 5 files modified:

`frontend/src/hooks/useEditorMiniGuide.js` — added `BOOKING_HOURS` to `MINI_GUIDE_IDS`, added `BOOKING_HOURS_GUIDE_DAYS`, added `buildBookingHoursSteps()`, extended `computeActiveSteps()` dispatch; initial implementation also included `isLabelClickStep` (subsequently removed in bug fix)

`frontend/src/components/editor/Editor.jsx` — added `onStartBookingHoursMiniGuide` prop, extended `showGuideBtn`, added "תורים ושעות" dropdown item

`frontend/src/pages/EditCard.jsx` — added `miniBookingHoursGuideAvailable`, extended `miniGuideTitle` to 3-branch, wired `onStartBookingHoursMiniGuide` to Editor

`frontend/src/components/editor/EditorSidebar.jsx` — added `"businessHours"` case to `data-tour-id` ternary

`frontend/src/components/editor/panels/BusinessHoursPanel.jsx` — added 5 `data-tour-id` anchors to existing elements

Bug fix (control-action bug) — 1 file modified:

`frontend/src/hooks/useEditorMiniGuide.js` — removed `isLabelClickStep`, replaced with `isCheckboxChangeStep` (change listener + `checked === true` guard + `setTimeout(0)`) and added `isListboxSelectStep` (click listener + `[role="option"]` guard + `setTimeout(0)`)

---

## 6. Source Proof Summary

All file:line references are from Phase 2 static verification (2026-05-21).

`MINI_GUIDE_IDS.BOOKING_HOURS`
`frontend/src/hooks/useEditorMiniGuide.js` L3–L7
`export const MINI_GUIDE_IDS = { SHARE_CARD: "share-card", SEO_AUTO: "seo-auto", BOOKING_HOURS: "booking-hours", };`

`BOOKING_HOURS_GUIDE_DAYS`
`frontend/src/hooks/useEditorMiniGuide.js` L109–L115
Array of 5 `{ key, label }` entries: `sun/ראשון`, `mon/שני`, `tue/שלישי`, `wed/רביעי`, `thu/חמישי`.

`buildBookingHoursSteps()`
`frontend/src/hooks/useEditorMiniGuide.js` L117–L207
Context-aware factory. Accepts `{ canUseBooking, bookingEnabled, hoursEnabled, week }`. Conditionally pushes steps based on card state at guide start time.

`isCheckboxChangeStep: true` — booking-enable step
`frontend/src/hooks/useEditorMiniGuide.js` L147
Step pushed only when `canUseBooking === true && bookingEnabled !== true`.

`isListboxSelectStep: true` — horizon step
`frontend/src/hooks/useEditorMiniGuide.js` L156
Step pushed whenever `canUseBooking === true`. Step text: "בחרו כמה זמן קדימה לקוחות יוכלו להזמין." (no "ולחצו הבא" — advance fires on option selection, not on "הבא").

`isCheckboxChangeStep: true` — hours-show-in-card step
`frontend/src/hooks/useEditorMiniGuide.js` L166
Step pushed only when `hoursEnabled !== true`.

`isCheckboxChangeStep: true` — per-day-open step (inside BOOKING_HOURS_GUIDE_DAYS loop)
`frontend/src/hooks/useEditorMiniGuide.js` L184
Step pushed per day only when `day.open !== true`.

`isFinalBlockStep: true` — booking-hours-save step
`frontend/src/hooks/useEditorMiniGuide.js` L203
Target: `editor-tour-save-changes`. Existing `EditorSaveBar.jsx` L24 anchor.

`computeActiveSteps()` BOOKING_HOURS branch
`frontend/src/hooks/useEditorMiniGuide.js` L216–L218
`if (guideId === MINI_GUIDE_IDS.BOOKING_HOURS) { return buildBookingHoursSteps(context); }`

`start(newGuideId, extraContext)` — merges extraContext into context
`frontend/src/hooks/useEditorMiniGuide.js` L260–L280
`const start = useCallback((newGuideId, extraContext = {}) => { ... const context = { cardIsPublished, entCanPublish, entCanChangeSlug, ...extraContext }; ... })`

`isCheckboxChangeStep` guard — generic click-to-advance skips this step type
`frontend/src/hooks/useEditorMiniGuide.js` L382
`if (currentStep?.isCheckboxChangeStep) return undefined;`

`isListboxSelectStep` guard — generic click-to-advance skips this step type
`frontend/src/hooks/useEditorMiniGuide.js` L383
`if (currentStep?.isListboxSelectStep) return undefined;`

Checkbox change effect — nested checkbox lookup, disabled guard, `checked === true`, deferred `setTimeout(0)`, cleanup
`frontend/src/hooks/useEditorMiniGuide.js` L475–L506
Entry guard: `if (!isActive || !activeTargetEl || !currentStep?.isCheckboxChangeStep) return undefined;`
Nested lookup: `activeTargetEl.querySelector('input[type="checkbox"]')`
Disabled guard: `if (!checkboxInput || checkboxInput.disabled) return undefined;`
Advance condition: `if (e.target.checked !== true) return;`
Deferral: `timerId = window.setTimeout(() => { ... advance(); }, 0);`
Cleanup: `handled = true; clearTimeout(timerId); checkboxInput.removeEventListener("change", handler);`

Listbox select effect — `[role="option"]` guard, ignores trigger clicks, deferred `setTimeout(0)`, cleanup
`frontend/src/hooks/useEditorMiniGuide.js` L515–L542
Entry guard: `if (!isActive || !activeTargetEl || !currentStep?.isListboxSelectStep) return undefined;`
Option guard: `const optionEl = e.target?.closest?.('[role="option"]'); if (!optionEl) return;`
Deferral: `timerId = window.setTimeout(() => { ... advance(); }, 0);`
Cleanup: `handled = true; clearTimeout(timerId); activeTargetEl.removeEventListener("click", handler);`

`onStartBookingHoursMiniGuide` prop on Editor
`frontend/src/components/editor/Editor.jsx` L60
Destructured from props.

`showGuideBtn` extended with `Boolean(onStartBookingHoursMiniGuide)`
`frontend/src/components/editor/Editor.jsx` L256–L263
`Boolean(onStartBookingHoursMiniGuide)` is the third Boolean prop in the condition (L263).

"תורים ושעות" dropdown item
`frontend/src/components/editor/Editor.jsx` L441–L450
`{onStartBookingHoursMiniGuide ? (<button ... onClick={() => { ... onStartBookingHoursMiniGuide(); }}>תורים ושעות</button>) : null}`

`miniBookingHoursGuideAvailable`
`frontend/src/pages/EditCard.jsx` L2521–L2524
`const miniBookingHoursGuideAvailable = miniGuideAvailable && draftCard?.entitlements?.canUseBusinessHours === true && draftCard?.entitlements?.canUseBooking === true;`

`miniGuideTitle` — 3-branch ternary including BOOKING_HOURS
`frontend/src/pages/EditCard.jsx` L2526–L2531
`const miniGuideTitle = miniGuide.currentGuideId === MINI_GUIDE_IDS.SEO_AUTO ? "מדריך SEO אוטומטי" : miniGuide.currentGuideId === MINI_GUIDE_IDS.BOOKING_HOURS ? "מדריך תורים ושעות" : "מדריך שיתוף כרטיס";`

`onStartBookingHoursMiniGuide` wired to Editor with full extraContext
`frontend/src/pages/EditCard.jsx` L2721–L2737
`onStartBookingHoursMiniGuide={ miniBookingHoursGuideAvailable ? () => miniGuide.start(MINI_GUIDE_IDS.BOOKING_HOURS, { bookingEnabled: draftCard?.bookingSettings?.enabled === true, hoursEnabled: draftCard?.businessHours?.enabled === true, week: draftCard?.businessHours?.week, canUseBooking: draftCard?.entitlements?.canUseBooking === true, }) : undefined }`

businessHours tab `data-tour-id`
`frontend/src/components/editor/EditorSidebar.jsx` L401–L402
`tab.id === "businessHours" ? "editor-mini-guide-tab-hours" : ...`

BusinessHoursPanel anchors

booking-enable label:
`frontend/src/components/editor/panels/BusinessHoursPanel.jsx` L308
`data-tour-id="editor-mini-guide-hours-booking-enable"` on the `<label className={styles.switch}>` wrapper.

horizon wrapper div:
`frontend/src/components/editor/panels/BusinessHoursPanel.jsx` L330
`<div data-tour-id="editor-mini-guide-hours-horizon">` — wraps `TimeListbox`. Option buttons inside have `role="option"` — click bubbles up to wrapper.

show-in-card label:
`frontend/src/components/editor/panels/BusinessHoursPanel.jsx` L376
`data-tour-id="editor-mini-guide-hours-show-in-card"` on the `<label>` wrapper.

per-day closed/open label:
`frontend/src/components/editor/panels/BusinessHoursPanel.jsx` L410
`data-tour-id={`editor-mini-guide-hours-${d.key}-closed`}` on the per-day open toggle `<label>`.

per-day add-range button:
`frontend/src/components/editor/panels/BusinessHoursPanel.jsx` L435
`data-tour-id={`editor-mini-guide-hours-${d.key}-add-range`}` on the add-range `<button>`.

save button target — existing anchor, unchanged
`frontend/src/components/editor/EditorSaveBar.jsx` L24
`data-tour-id="editor-tour-save-changes"` — pre-existing. Not modified. Reused by booking-hours guide.

---

## 7. Verification

### 7.1 Automated Frontend Gates

Run from `frontend/` on 2026-05-21.

```
npm.cmd run check:inline-styles
PASS: no inline styles found. Scope: src/pages/PublicCard.jsx, src/pages/EditCard.jsx, src/components/editor, src/components/card, src/templates.
EXIT:0

npm.cmd run check:skins
PASS: skins are token-only. Scanned 28 files.
EXIT:0

npm.cmd run check:contract
PASS: template contracts are consistent. Registry templates: 25. CustomV1 palettes: (none).
EXIT:0

npm.cmd run build --if-present
vite v7.3.1 building client environment for production...
✓ 377 modules transformed.
BUILD_EXIT:0
```

Module count 377 is identical to the pre-change baseline.

### 7.2 Operator Manual Smoke

Smoke was performed against local dev build on 2026-05-21. Production deploy not yet executed.

Guide dropdown order: "תורים ושעות" item renders at position 3 after share and SEO items — PASS

"אפשר הזמנת תורים" checkbox: step advances only after the toggle is checked (real input change with `checked === true`), not on label click alone — PASS

Horizon listbox: trigger button opens listbox without advancing the guide — PASS

Horizon option selection: selecting an option changes the value and auto-advances the guide — PASS

"הצג בכרטיס" checkbox: step advances only after toggle is checked — PASS

ראשון–חמישי day open checkboxes: each per-day step advances only after toggle is checked — PASS

"הוסף טווח" button: clicking add-range button adds a range and advances the guide step — PASS

"שמור שינויים" save: final-block step fires on save button click, guide closes, save starts normally — PASS

No double save observed in Network tab — PASS

Reload/persistence: saved values persist after page reload — PASS

Share guide regression: guide still works, `aria-label` = "מדריך שיתוף כרטיס" — PASS

SEO guide regression: guide still works, `aria-label` = "מדריך SEO אוטומטי" — PASS

No React hook-order error in console — PASS

No `Blocked aria-hidden` warning in console — PASS

---

## 8. Bug Fix Sub-Contour: Control-Action Bug

### 8.1 Root Cause

Initial implementation used `isLabelClickStep: true`. The advance effect attached a `click` listener to the `<label>` element (the `activeTargetEl`). This advanced the guide on any label click, including clicks that toggled the checkbox from checked-to-unchecked or clicks on disabled checkboxes (where `disabled={disabled || bh.enabled !== true}` would prevent actual state change).

For the horizon step, the initial implementation had no auto-advance — the `<div>` wrapper containing `TimeListbox` is not interactive (not a `BUTTON`, `A`, `role="button"`, or `role="link"`), so generic click-to-advance correctly skipped it. No advance mechanism existed for option selection.

### 8.2 Fix

`isLabelClickStep` removed entirely. No references remain.

`isCheckboxChangeStep: true` — change listener on the nested `<input type="checkbox">`, guards on `disabled` and `checked === true`, deferred via `setTimeout(0)`. Correct semantic: advance only when user actually enables the feature.

`isListboxSelectStep: true` — click listener on the wrapper `<div>`, `e.target?.closest?.('[role="option"]')` guard ignores trigger and backdrop clicks, deferred via `setTimeout(0)`. Correct semantic: advance only when user actually selects an option.

Horizon step text updated: removed "ולחצו הבא" from the text since the step now auto-advances.

---

## 9. Console Notes

### 9.1 Router Blocker Warning

`A router only supports one blocker at a time` — observed in local dev browser console during editor tab navigation.

- This warning was audited separately across all mini-guide contours.
- It is present in local dev only, driven by React StrictMode double-invoking effects (including `useBlocker` in `EditCard.jsx` L416).
- **Production-preview smoke result:** the warning did NOT reproduce in a production-preview build smoke. The unsaved-changes guard (`ConfirmUnsavedChangesModal`) functioned correctly in production-preview smoke.
- **Classification: `DEFER_SAFE_CONFIRMED / NOT DEPLOY BLOCKER`**
- React Router `react-router-dom` installed version: `^7.10.1` (see `frontend/package.json`). There is exactly one `useBlocker` call in the entire application (`EditCard.jsx` L416). Without StrictMode double-invoke, `blockerFunctions` receives exactly one key and the triggering condition is structurally unreachable in production.
- The warning was **not fixed** in this contour, nor in any prior mini-guide or a11y contour. No router/useBlocker code was changed.
- Production safety confirmed by both static source-code trace (React Router v7 production bundle) and production-preview smoke.

### 9.2 Async Extension Listener

`A listener indicated an asynchronous response by returning true but the message channel closed before a response was received` — observed in local dev browser console.

- Classified as likely browser extension noise. Not attributed to application source.
- It was **not fixed** in this contour.
- Classification: `ASYNC_EXTENSION_NOISE_STILL_PRESENT` unless reproduced in Incognito with all browser extensions disabled and app-source proof is established.

---

## 10. Non-Changes / Anti-Scope

The following were explicitly not changed in this contour:

- **Backend:** zero backend files changed. No routes, models, middleware, scripts, or index changes.
- **API routes:** no API route changes.
- **BusinessHoursPanel handler logic:** no handler changes. `onToggleBooking`, `onToggleHours`, `onToggleDay`, `onAddInterval`, `onUpdateInterval`, `onRemoveInterval` — all unchanged.
- **Save / commitDraft:** no changes. `commitDraft` in `EditCard.jsx` is unchanged. The guide's final step advances on the existing save button click; it does not trigger or modify the save itself.
- **CSS files:** zero CSS files changed. All new JSX uses existing classNames. Skins gate PASS EXIT:0. Inline-styles gate PASS EXIT:0.
- **Drawer a11y:** unchanged. `useFocusTrap`, `inert` attribute, focus handoff on close, initial focus on open, Escape handling — all unchanged from the a11y contour (`EDITOR_MOBILE_MINI_GUIDE_AND_DRAWER_A11Y`).
- **Header.jsx:** not changed.
- **useEditorTour.js:** not changed. Anonymous editor tour unaffected.
- **TourCoachPanel.jsx / TourCoachPanel.module.css:** not changed.
- **Share guide behavior:** unchanged. `buildShareCardSteps()` untouched.
- **SEO guide behavior:** unchanged. `buildSeoAutoSteps()` untouched. `runMagicSeoSetup`, AI quota, AI consent, orchestrator logic — all unchanged.
- **Payment / billing / tracking:** not changed.
- **SEO / OG metadata / sitemap / robots:** not changed.
- **CardLayout / templates registry:** not changed. Registry template count = 25, unchanged. Contract gate PASS EXIT:0.
- **Router / useBlocker:** not changed.
- **Env files:** not changed.
- **Package / dependency manifests:** not changed.

---

## 11. Remaining Tails

The following are open after this contour closes:

1. **Production deploy** — operator must deploy the frontend bundle to production. All four automated gates passed. Manual smoke passed in local dev. No production deploy was executed as part of this contour.

2. **Production smoke after deploy** — after deploy, operator should verify:
    - "תורים ושעות" dropdown item renders at position 3 for eligible users on a production mobile device.
    - Booking-enable checkbox step advances on real toggle-on only.
    - Horizon option selection auto-advances.
    - Show-in-card and per-day steps advance on real toggle-on only.
    - Save step closes guide and save proceeds normally.
    - No double-save observed in Network tab.
    - Share guide and SEO guide regression checks on production.
    - No new console errors in production build.

3. **Production verification addendum** — optional: after successful production deploy and production smoke, operator may add an addendum to this handoff recording the production smoke result and upgrading status to `PRODUCTION VERIFIED`.

4. **Router blocker warning** — classified `DEFER_SAFE_CONFIRMED / NOT DEPLOY BLOCKER`. No action required unless the warning reproduces in a production build.

5. **Async listener Incognito triage** — optional. Reproduce in Incognito with extensions disabled to confirm or rule out application-source origin.

---

## 12. Related Handoffs

- `docs/handoffs/current/Cardigo_Enterprise_Handoff_2026-05-21_EditorMobileMiniGuideShareCard_Closed.md` — share-card mini-guide (first guide, same hook/component infrastructure)
- `docs/handoffs/current/Cardigo_Enterprise_Handoff_2026-05-21_EditorMobileMiniGuideSeoAuto_Closed.md` — SEO mini-guide (second guide, same hook/component infrastructure)
- `docs/handoffs/current/Cardigo_Enterprise_Handoff_2026-05-21_EditorMobileDrawerA11Y_Closed.md` — drawer a11y hardening (inert, focus trap, focus-visible; all unchanged by this contour)
- `docs/handoffs/current/Cardigo_Enterprise_Handoff_2026-05-19_EditorTemplates_MobileGuideDropdown_And_GuideVideoModal_Closed.md` — original dropdown + video modal infrastructure
