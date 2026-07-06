# Cardigo Enterprise Handoff — Editor Mobile Drawer Accessibility Hardening — Closed

**Date:** 2026-05-21
**Project:** Cardigo — Israel-first digital business card SaaS
**Canonical domain:** https://cardigo.co.il
**Status:** CLOSED / CODE VERIFIED / OPERATOR-SMOKED / FRONTEND GATES PASS / READY FOR DEPLOY CHECKLIST

---

## 1. Contour

EDITOR_MOBILE_MINI_GUIDE_AND_DRAWER_A11Y

This is a follow-up accessibility hardening contour completed after:
EDITOR_MOBILE_GUIDE_MINI_TOURS_SHARE_CARD

---

## 2. Executive Summary

This contour delivers five targeted accessibility fixes across three frontend files. There is no new product feature. No new user-visible behavior beyond correct keyboard navigation and focus management. No backend changes. No schema or index changes. No environment variable changes. No SEO, OG, sitemap, or analytics changes. No payment, billing, or tracking changes.

All fixes are focused on focus management correctness:

- `aria-hidden` containers must not hold focus when hidden.
- Off-canvas mounted containers must be removed from the tab order when hidden.
- Open interactive drawers must receive and contain focus on mobile.
- Interactive controls inside open drawers must have visible keyboard focus indicators.

---

## 3. Root Causes and Fixes

### Issue 1 — Editor Drawer Close-Time aria-hidden Focus Bug

**Root cause:** `#editor-sections-drawer` could become `aria-hidden=true` while focus remained inside it. When `closeDrawer()` called `setDrawerOpen(false)` without first moving focus, React re-rendered with `aria-hidden={isMobile && !drawerOpen}=true` on the drawer element. Any currently focused child was then reported as inaccessible to assistive technology, producing the browser console warning "Blocked aria-hidden on a focusable element."

**Fix:** `closeDrawer()` in `Editor.jsx` synchronously returns focus to `sectionsTriggerRef.current` before `setDrawerOpen(false)`. Uses try/catch with `preventScroll: true` primary and plain `.focus()` fallback.

**Source:** `frontend/src/components/editor/Editor.jsx` L82–100 (`sectionsTriggerRef`, `drawerRef`, `closeDrawer()`).

### Issue 2 — Main Mobile Nav Close-Time aria-hidden Focus Bug

**Root cause:** `#mobile-nav` could become `aria-hidden=true` while focus remained inside it, for the same structural reason as Issue 1.

**Fix:** `closeMobile()` in `Header.jsx` synchronously returns focus to `burgerRef.current` before `setMobileOpen(false)`. Uses same try/catch pattern.

**Source:** `frontend/src/components/layout/Header.jsx` L72–82 (`closeMobile`, `burgerRef`).

### Issue 3 — Hidden Mounted Drawers Still Tabbable

**Root cause:** Both `#editor-sections-drawer` and `#mobile-nav` are mounted at all times (off-canvas via CSS transform), with descendant interactive elements remaining in the tab order even when visually hidden. A keyboard user could Tab into hidden content.

**Fix:**

- `#editor-sections-drawer`: `inert={isMobile && !drawerOpen ? "" : undefined}` added to the drawer div in `Editor.jsx`.
- `#mobile-nav`: `inert={!mobileOpen ? "" : undefined}` added to the nav div in `Header.jsx`.

The `inert` attribute (React JSX string pattern — `""` when inert, `undefined` to remove) removes all descendants from the tab order, pointer interaction, and AT discovery simultaneously.

**Source:** `frontend/src/components/editor/Editor.jsx` L529–530; `frontend/src/components/layout/Header.jsx` L299–300.

### Issue 4 — Open Editor Drawer Keyboard Containment Gap

**Root cause:** The mobile editor drawer had no focus trap and no initial focus delivery when it opened. A keyboard user could Tab past the drawer boundary into the underlying page content.

**Fix:**

- `useFocusTrap(drawerRef, isMobile && drawerOpen)` added to `Editor.jsx`. Traps Tab and Shift+Tab inside `drawerRef` when the condition is true.
- Initial focus effect: when drawer opens on mobile, focus is delivered to the first focusable element inside `drawerRef.current` (querySelector with FOCUSABLE selector). Uses try/catch pattern.

`useFocusTrap` is a pre-existing hook (`frontend/src/hooks/useFocusTrap.js`). It was not modified in this contour.

**Source:** `frontend/src/components/editor/Editor.jsx` L12 (import), L83 (`drawerRef`), L88 (`useFocusTrap` call), L163–177 (initial focus effect).

### Issue 5 — Invisible Keyboard Focus on Editor Drawer Tab Buttons

**Root cause:** The `.tab` base class in `EditorSidebar.module.css` sets a permanent decorative `outline: 1px solid #f59f0b81` with `outline-offset: -5px`. This author rule at specificity (0,1,0) overrides the UA stylesheet's `:focus-visible` default rule at specificity (0,0,0), making the focus ring invisible when a `.tab` button receives keyboard focus. No `.tab:focus-visible` override existed.

**Fix:** `.tab:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }` added to `EditorSidebar.module.css`. Specificity (0,2,0) overrides the base `.tab` decorative outline when `:focus-visible` is active, producing a clear 2px gold focus ring. When not focused, the decorative base outline remains unchanged. `.tab`, `.tab:hover`, and `.tab.active` rules are not modified.

**Source:** `frontend/src/components/editor/EditorSidebar.module.css` L46–49.

---

## 4. Changed Files — This A11Y Contour

### frontend/src/components/editor/Editor.jsx

Changes in this contour:

- `import useFocusTrap from "../../hooks/useFocusTrap"` — L12.
- `const sectionsTriggerRef = useRef(null)` — L82 (trigger button ref for focus handoff on drawer close).
- `const drawerRef = useRef(null)` — L83 (drawer container ref for focus trap and `inert`).
- `useFocusTrap(drawerRef, isMobile && drawerOpen)` — L88 (focus trap, active on mobile open).
- `closeDrawer()` — synchronous focus return to `sectionsTriggerRef` before `setDrawerOpen(false)` — L88–100.
- `ref={sectionsTriggerRef}` on the sections-trigger button — L317.
- Initial focus `useEffect` on drawer open (deps: `[drawerOpen, isMobile]`) — L163–177.
- `aria-hidden={isMobile && !drawerOpen}` on `#editor-sections-drawer` div — L529.
- `inert={isMobile && !drawerOpen ? "" : undefined}` on `#editor-sections-drawer` div — L530.

### frontend/src/components/layout/Header.jsx

Changes in this contour:

- `closeMobile()` — synchronous focus return to `burgerRef` before `setMobileOpen(false)` — L72–82.
- `aria-hidden={!mobileOpen}` on `#mobile-nav` — L299.
- `inert={!mobileOpen ? "" : undefined}` on `#mobile-nav` — L300.

Pre-existing and unchanged in this contour:

- `useFocusTrap(drawerRef, mobileOpen)` — L22 (was already in place before this contour, not modified).
- `burgerRef` — L15 (was already in place before this contour, not modified).

### frontend/src/components/editor/EditorSidebar.module.css

Changes in this contour:

- `.tab:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }` — L46–49.

Unchanged in this contour:

- `.tab` base rule — NOT modified.
- `.tab:hover` rule — NOT modified.
- `.tab.active` rule — NOT modified.
- No other rules in this file were modified.

---

## 5. Unchanged Files — Anti-Scope

The following files were NOT changed in this contour:

- `frontend/src/hooks/useEditorMiniGuide.js` — untouched.
- `frontend/src/hooks/useEditorTour.js` — untouched.
- `frontend/src/hooks/useFocusTrap.js` — pre-existing, used but not modified.
- `frontend/src/pages/EditCard.jsx` — untouched.
- `frontend/src/components/editor/EditorSidebar.jsx` — untouched.
- `frontend/src/components/editor/panels/SettingsPanel.jsx` — untouched.
- `frontend/src/components/editor/TourMiniPanel.jsx` — untouched.
- `frontend/src/components/editor/TourCoachPanel.jsx` — untouched.
- Backend source files — untouched.
- Environment variable files — untouched.
- Router / `useBlocker` — untouched.
- Video modal / YouTube validation / iframe sandbox — untouched.
- CardLayout / templates registry — untouched.
- SEO, OG, sitemap, robots.txt — untouched.
- Payment, billing, tracking — untouched.

---

## 6. Verification

### 6.1 Frontend Gates (run from frontend/, final run after .tab:focus-visible addition)

- `npm.cmd run check:inline-styles` — EXIT:0. PASS: no inline styles found.
- `npm.cmd run check:skins` — EXIT:0. PASS: skins are token-only. Scanned 28 files.
- `npm.cmd run check:contract` — EXIT:0. PASS: template contracts are consistent. Registry templates: 25.
- `npm.cmd run build --if-present` — EXIT:0. BUILD_EXIT:0. 377 modules transformed. EditCard-\*.css +0.07 kB (4 added CSS lines for `.tab:focus-visible`). Built in 3.79s.

No backend sanities were run in this contour. No backend files were changed. Backend sanity runs were not applicable.

### 6.2 Operator Manual Smoke — PASS

Manual smoke was operator-manual only. No automated E2E test suite was run. Smoke covered:

- Hidden `#editor-sections-drawer` does not receive focus via Tab (inert confirmed).
- Hidden `#mobile-nav` does not receive focus via Tab (inert confirmed).
- No `Blocked aria-hidden...` warning in tested drawer close flows.
- Open editor drawer moves initial focus inside on mobile.
- Open editor drawer traps focus (Tab does not escape to underlying page).
- Visible gold 2px focus outline moves across editor drawer tab buttons on keyboard navigation.
- Shift+Tab wraps focus within open editor drawer.
- Main `#mobile-nav` remains fully interactive; focus trap works on mobile nav open.
- Mini-guide flow passes end-to-end: `איך לשתף כרטיס` → `תפריט עריכה` → `הגדרות` → slug input → `פרסום`.
- Drawer does not reopen on slug/publish steps.
- No hook-order error or blank page error screen.

---

## 7. Console Notes

### 7.1 "A listener indicated an asynchronous response by returning true..."

**Classification:** likely browser extension async messaging noise. The application source contains no `chrome.runtime`, `browser.runtime`, or cross-extension messaging API calls. This warning was observed in the development browser. It was not introduced by this contour and was not fixed in this contour. It is not claimed fixed. If it recurs in production, triage in Incognito mode with all browser extensions disabled and confirm it is reproduced by the application source before classifying as an application bug.

### 7.2 "A router only supports one blocker at a time"

**Classification:** React Router v7 StrictMode development-console warning. Classified and triaged in the prior contour handoff `EDITOR_MOBILE_GUIDE_MINI_TOURS_SHARE_CARD` (§8.1). Not introduced by this contour. Not fixed in this contour. Deferred to a separate contour per prior classification. Production impact: none based on static source-code trace (single `useBlocker` call in application; StrictMode double-invoke is development-only).

---

## 8. Anti-Overclaim

- Manual smoke was operator-manual only. It was not automated E2E.
- No production deployment is claimed by this handoff.
- No production verification is claimed.
- No backend changes were made.
- No environment variable changes were made.
- No payment, billing, or trial lifecycle changes were made.
- No SEO, OG, sitemap, or robots.txt changes were made.
- No analytics or tracking changes were made.
- No anonymous guide runtime changes were made (`useEditorTour.js` untouched).
- No `dialog` role, `aria-modal`, or `aria-labelledby` attributes were added in this contour. Focus management is implemented via `inert`, `useFocusTrap`, and synchronous focus handoff only.
- The async listener console message is not claimed fixed.
- The router blocker warning is not claimed fixed.

---

## 9. Remaining Tails

The following items are optional future work and are not blockers for this workstream's closure:

1. **Editor drawer dialog semantics audit (optional):** Consider whether `#editor-sections-drawer` should carry `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` pointing to the drawer title element. This would be a bounded follow-on audit, separate from this contour.

2. **Async listener Incognito triage (optional):** Reproduce the async listener message in Incognito mode with extensions disabled to confirm app-source vs. extension-noise classification definitively.

3. **Production deploy and production smoke (operator action required):** Code is verified locally and via operator smoke. Production deployment and production smoke are required before closing the production readiness gate.

---

## 10. Closure Declaration

All five accessibility issues are resolved in source:

1. Editor drawer close-time aria-hidden focus bug — CLOSED.
2. Mobile nav close-time aria-hidden focus bug — CLOSED.
3. Hidden mounted drawers tabbable — CLOSED.
4. Open editor drawer keyboard containment gap — CLOSED.
5. Invisible keyboard focus on editor drawer tab buttons — CLOSED.

Frontend gates: all EXIT:0.
Operator manual smoke: PASS.
Backend: untouched.
Production deploy: OPERATOR_REQUIRED.
