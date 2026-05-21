# Cardigo Enterprise Handoff — Editor Mobile Mini-Guide: איך לשתף כרטיס — Closed

**Date:** 2026-05-21
**Project:** Cardigo — Israel-first digital business card SaaS
**Canonical domain:** https://cardigo.co.il
**Status:** CLOSED / CODE VERIFIED / OPERATOR-SMOKED / FRONTEND GATES PASS

---

## 0. Addendum Notice — 2026-05-21

This handoff is the historical closure record for contour `EDITOR_MOBILE_GUIDE_MINI_TOURS_SHARE_CARD`. It documents the mini-guide implementation at the time that contour was closed.

A subsequent separate accessibility hardening contour (`EDITOR_MOBILE_MINI_GUIDE_AND_DRAWER_A11Y`) was completed after this handoff was written. Any "CSS untouched" or "no CSS files modified" statements in this document apply **only** to the original mini-guide implementation contour scope at the time of its closure.

Current drawer accessibility truth — including `inert`, focus handoff, focus trap, initial focus, and `.tab:focus-visible` — is documented in:
`docs/handoffs/current/Cardigo_Enterprise_Handoff_2026-05-21_EditorMobileDrawerA11Y_Closed.md`

---

## 1. Contour

EDITOR_MOBILE_GUIDE_MINI_TOURS_SHARE_CARD

---

## 2. Executive Summary

This handoff closes the authenticated personal mobile mini-guide workstream. A new step-by-step coach panel guide titled "איך לשתף כרטיס" was added to the existing `מדריך` dropdown on the `/edit/card/templates` route. The guide walks an authenticated personal-card user through the minimum steps required to publish and share their card.

Three sub-contours are closed in this workstream:

1. Main mini-guide implementation — two new files + four modified files.
2. Hook-order runtime crash fix — `EditCard.jsx` hook-order violation corrected.
3. Mobile drawer regression fix — bad guard reverted, unconditional `closeDrawer()` restored, slug/publish steps set to `requiresDrawer: false`.

No backend changes. No CSS structure changes. No schema or index changes. No env variable changes. No auth, payment, billing, SEO, OG, sitemap, tracking, or anonymous-guide changes.

---

## 3. Product / UX Truth

### 3.1 Scope

- **Audience:** authenticated personal-card users only (not org-context users; guide is gated by the absence of an active org context).
- **Route:** `/edit/card/templates`.
- **Entry point:** existing `מדריך` dropdown in the mobile topbar.
- **New dropdown item:** "איך לשתף כרטיס" — renders above any video guide items.
- **Video guide items:** remain env-controlled (VITE_GUIDE_URL_MOBILE / VITE_GUIDE_URL_DESKTOP). When valid env URLs are absent or rejected by the validator, video items do not render. The `מדריך` button continues to render as long as at least one of the mini-guide item or a valid video URL is available.
- **Replay:** guide is fully replayable on every dropdown click; no localStorage state.
- **No completion persistence:** guide does not write any localStorage key on completion.

### 3.2 Guide Content and Branching

The guide step array is computed at start time from the card's publish/entitlement state. Four branches exist:

- **Already published:** steps — open sections menu → settings tab → open sections menu again → public link block.
- **Draft, cannot publish (free plan):** same four steps, link block shows future-link copy.
- **Draft, can publish, cannot change slug:** steps — open sections menu → settings tab → publish button → open sections menu → public link block.
- **Draft, can publish, can change slug:** steps — open sections menu → settings tab → slug input → publish button → open sections menu → public link block.

Source: `frontend/src/hooks/useEditorMiniGuide.js` — `buildShareCardSteps()` function (lines 9–74), four branch return statements.

### 3.3 Advance Mechanics

- **Click steps:** advance fires on user click of the designated target element (button, anchor, role=button, role=link).
- **Slug step (`isSlugStep`):** advance fires on first non-empty input/paste. Both `input` and `paste` events are handled via a shared `scheduleAdvance()` with `setTimeout(0)` deferral and a `handled` flag. This prevents double-advance, preserves the first typed character, and handles paste-then-input firing.
- **Publish step (`isPublishStep`):** advance fires only after `cardIsPublished` prop becomes `true`. Direct click on publish button does NOT advance — only the successful publish outcome advances the guide. A failed publish leaves the guide on the publish step.
- **Final link block (`isFinalBlockStep`):** click on the target div fires `complete()`. No `preventDefault`, no `stopPropagation` — child anchors open in new tab normally.

### 3.4 Next Button Enable/Disable

- Settings tab step (`isNextDisabledByDefault: true`): "המשך" button is disabled until the user taps the settings tab, which fires the click-to-advance handler.
- Publish step: "המשך" button is disabled while `cardIsPublished` is false.
- All other steps: "המשך" button is enabled.

Source: `useEditorMiniGuide.js` L104–108 — `isNextDisabled` derived from `isNextDisabledByDefault` and `isPublishStep && !cardIsPublished`.

### 3.5 Drawer Orchestration

Steps that require the mobile sidebar drawer (`requiresDrawer: true`): settings tab step, final link block step (both are inside the sidebar on mobile). When the current step has `requiresDrawer: true`, `miniGuide.requiresDrawerStepId` is non-null, and `Editor.jsx` opens the drawer.

Steps with `requiresDrawer: false`: sections-menu steps, slug input step, publish button step. These elements are in the main content area, not inside the drawer. The drawer is NOT opened for these steps and does NOT reopen after tab changes that close it.

Source: step definitions in `useEditorMiniGuide.js` L11–57; `requiresDrawerStepId` derived at L112–113; `openDrawerForMiniGuideStepId` prop wired in `EditCard.jsx` L2689; drawer open effect in `Editor.jsx` L278–281.

### 3.6 Guide Visibility Gating (miniGuideAvailable)

`onStartShareMiniGuide` is passed to `Editor` only when all of the following are true (EditCard.jsx L2512–2517):

- `showGuideDropdown` is true (authenticated personal user, templates tab, context resolved).
- `section === "card"`.
- `draftCard._id` is non-null.
- `draftCard.publicPath` is non-null.

When `onStartShareMiniGuide` is undefined, the "איך לשתף כרטיס" dropdown item does not render (Editor.jsx L380: `{onStartShareMiniGuide ? (...) : null}`).

---

## 4. Architecture

### 4.1 Separation of Concerns

- `useEditorMiniGuide.js` is a standalone hook. It does **not** extend, wrap, or import `useEditorTour.js`.
- `TourMiniPanel.jsx` is a standalone component. It reuses `TourCoachPanel.module.css` for visual consistency but does not import or extend `TourCoachPanel.jsx`.
- The mini-guide's DOM activation pattern (querySelector by `data-tour-id`, `data-tour-active` attribute, RAF retry up to 5 attempts, cleanup on step change) replicates the pattern established in `useEditorTour.js`.
- No localStorage keys are used by the mini-guide. Guide state is ephemeral (in-memory React state only).

### 4.2 Coach Panel Render Separation

`TourCoachPanel` (anonymous guide) and `TourMiniPanel` (mini-guide) are mutually exclusive at the render site in `EditCard.jsx`:

- `TourCoachPanel` renders only when `editorTour.isActive` is true (EditCard.jsx L2559).
- `TourMiniPanel` renders only when `miniGuide.isActive` is true (EditCard.jsx L2572).
- Both cannot be active simultaneously under normal conditions.

### 4.3 Sections Menu Lock

`tourSectionsMenuOpenOnly={editorTour.isActive || miniGuide.isActive}` is passed to `Editor` (EditCard.jsx L2695). When either guide is active, the sections menu in the mobile topbar is restricted to open-only mode — clicking it opens it but closing it requires clicking outside or completing the step. This prevents accidental guide disruption.

---

## 5. Changed Files

### New Files

- `frontend/src/hooks/useEditorMiniGuide.js` — guide state machine, step branch logic, DOM activation, click-to-advance, slug input dedup advance, publish prop-watch advance, final block click completion.
- `frontend/src/components/editor/TourMiniPanel.jsx` — coach panel component for the mini-guide. Reuses `TourCoachPanel.module.css`.

### Modified Files

- `frontend/src/components/editor/Editor.jsx` — accepts `onStartShareMiniGuide`, `openDrawerForMiniGuideStepId` props; adds "איך לשתף כרטיס" dropdown item above video items; `handleChangeTab` calls `closeDrawer()` unconditionally (restored after regression fix); drawer open effect for mini-guide steps.
- `frontend/src/components/editor/EditorSidebar.jsx` — `data-tour-id="editor-mini-guide-public-link-block"` added to the public link block div (L243); `data-tour-id="editor-mini-guide-tab-settings"` added to the settings tab conditional (L394).
- `frontend/src/components/editor/panels/SettingsPanel.jsx` — `data-tour-id="editor-mini-guide-publish-btn"` added to the publish button (L825); `data-tour-id="editor-mini-guide-slug-input"` added to the slug input (L924).
- `frontend/src/pages/EditCard.jsx` — imports `useEditorMiniGuide` and `TourMiniPanel`; `useEditorMiniGuide` call placed unconditionally before early returns (L2248); `miniGuideAvailable` derived (L2512); `TourMiniPanel` rendered when `miniGuide.isActive` (L2572); `openDrawerForMiniGuideStepId` and `onStartShareMiniGuide` wired to `Editor` (L2689, L2692); `tourSectionsMenuOpenOnly` updated to `editorTour.isActive || miniGuide.isActive` (L2695).

### Hotfix Surface Within This Workstream

- `Editor.jsx` — `handleChangeTab` reverted to unconditional `closeDrawer()` (bad guard `if (!tourSectionsMenuOpenOnly)` removed).
- `useEditorMiniGuide.js` — `slugInput` and `publishBtn` step definitions set to `requiresDrawer: false`.
- `EditCard.jsx` — `useEditorMiniGuide` call moved before early returns to fix hook-order crash.

---

## 6. Bugfixes Closed

### 6.1 Hook-Order Runtime Crash

**Root cause:** Initial implementation placed the `useEditorMiniGuide` call after conditional early-return logic in `EditCard.jsx`, violating React's rules of hooks. This caused a runtime crash when conditions triggered an early return before the hook was called.

**Fix:** `useEditorMiniGuide` call moved to execute unconditionally before any early returns in `EditCard.jsx`. The `enabled` parameter provides the same gating logic that was previously expressed via conditional rendering, without violating hook call order. Comment at EditCard.jsx L2246: "Mini-guide hook: must be called unconditionally before any early return."

**File changed:** `EditCard.jsx` only.

### 6.2 Mobile Drawer Regression

**Root cause:** An attempted fix for the close→reopen flash during mini-guide tab transitions introduced a guard `if (!tourSectionsMenuOpenOnly) closeDrawer()` in `handleChangeTab`. This broke normal mobile menu behavior — tapping a tab no longer closed the sidebar drawer when no guide was active.

**Fix:** The guard was fully reverted. `closeDrawer()` is unconditional in `handleChangeTab` (Editor.jsx L234). The close→reopen flash during guide tab transitions was resolved instead by setting `requiresDrawer: false` on the slug input and publish button steps. Since these steps live in the main content area (not inside the drawer), the drawer correctly stays closed when the user transitions to those steps.

**Files changed:** `Editor.jsx` (guard removed), `useEditorMiniGuide.js` (`requiresDrawer: false` on slug/publish steps).

### 6.3 Slug Input Advance (typing and paste)

**Behavior:** typing any non-empty character or pasting into the slug input advances the guide to the next step. First typed character is preserved. Paste does not double-advance.

**Implementation:** shared `scheduleAdvance()` with `setTimeout(0)` deferral, `handled` flag, `timerId` with `clearTimeout` before rescheduling. Both `input` and `paste` events call `scheduleAdvance()`. This is the same pattern used in `useEditorTour.js` for anonymous guide input steps.

---

## 7. Verification

### 7.1 Frontend Gates (run from frontend/)

All four gates passed with EXIT:0:

- `npm.cmd run check:inline-styles` — EXIT:0
- `npm.cmd run check:skins` — EXIT:0
- `npm.cmd run check:contract` — EXIT:0
- `npm.cmd run build --if-present` — EXIT:0 (377 modules transformed, BUILD_EXIT:0)

No backend sanities were run in this contour. No backend files were changed; backend sanity runs were not applicable.

### 7.2 Manual Operator Smoke

Production verification was manual operator smoke. No automated E2E test suite was run. Smoke covered:

- Normal mobile menu closes on tab selection when no guide is active (drawer regression not present).
- "מדריך" dropdown renders on `/edit/card/templates` for authenticated personal user.
- "איך לשתף כרטיס" item appears above video guide items in the dropdown.
- Tapping "איך לשתף כרטיס" starts the mini-guide coach panel.
- Guide advances through steps in the correct branch order for the test account's card state.
- Slug input: typing advances guide to publish step; drawer does not reopen; first character is preserved in input; paste also advances without double-advancing.
- Publish step: guide does not advance until publish action completes and `cardIsPublished` becomes true.
- Guide completes on link block click. Child anchor in link block opens in new tab without interference.
- Replay: tapping "מדריך" dropdown and selecting "איך לשתף כרטיס" again restarts the guide from step 0.
- No hook-order crash or blank page error at any point.
- Video guide items remain listed after the mini-guide item when env URLs are configured.

---

## 8. Console Triage Classification

Three console messages were observed in the development browser during this workstream. None are introduced by mini-guide code.

### 8.1 "A router only supports one blocker at a time"

**Source:** React Router v7 — `shouldBlockNavigation` function in `react-router/dist/production/chunk-Z47B263N.js` L2946.

**Mechanism:** The `warning()` function in the React Router v7 bundle (both development and production distributions) is unconditional — it has no `process.env.NODE_ENV` guard. It fires `console.warn` when `blockerFunctions.size > 1`. Under React 18 StrictMode (active in development), `useBlocker`'s first `useEffect` (which assigns a monotonically incremented module-level `blockerId`) runs twice during the mount/cleanup/remount cycle. The second `useEffect` (which registers the blocker function) has no cleanup, causing a stale key to remain in `blockerFunctions` after the StrictMode double-invoke. From that point, `blockerFunctions.size` is 2 for the rest of the development session, and any navigation fires the warning.

**Production impact:** None. React StrictMode's double-invoke of effects does not occur in production. There is only one `useBlocker` call in the entire application (`EditCard.jsx` L416). Without the StrictMode double-invoke, `blockerFunctions` receives exactly one key and size never exceeds 1. The triggering condition (`size > 1`) is structurally unreachable in production with a single `useBlocker` call. The claim of production safety is based on static source-code trace, not on runtime production-preview smoke (no production-preview server was run during this contour).

**Ownership:** The `useBlocker` in `EditCard.jsx` L416 is pre-existing application code. Mini-guide did not add, modify, or interact with `useBlocker`. Unsaved-changes guard functionality was not weakened.

**No fix applied:** Wrapping the `shouldBlock` function in `useCallback` (the only EditCard-side change that would reduce spurious effect re-runs) would not eliminate the warning — the orphaned stale key from StrictMode's double-invoke is an upstream React Router v7 bug in `useBlocker`'s second effect (no cleanup for key changes). Any structural rewrite (e.g., extracting a child component) would also not eliminate the warning, while increasing blast radius.

**Disposition:** deferred as a separate contour. Future action only if production-preview smoke reproduces the warning at runtime, the unsaved-changes guard malfunctions, or an upstream React Router upgrade is evaluated.

### 8.2 Async listener / chrome.runtime message

**Classification:** browser extension messaging noise. The application source contains no `chrome.runtime`, `browser.runtime`, or cross-extension messaging API calls. Not introduced by mini-guide.

### 8.3 PWA beforeinstallprompt warning

**Classification:** pre-existing install-prompt behavior. Not introduced by mini-guide.

---

## 9. Anti-Scope / Non-Actions

The following were explicitly out of scope for this workstream and were not touched:

- Backend source files: untouched.
- CSS / CSS Modules files: untouched (TourMiniPanel.jsx imports the existing TourCoachPanel.module.css; no new CSS file was created; no existing CSS file was modified).
- MongoDB schema or index definitions: untouched.
- Environment variables, Supabase config, email provider config: untouched.
- SEO metadata, OG tags, sitemap.xml, robots.txt: untouched.
- Auth flows (login, signup, invite, cookie, CSRF): untouched.
- Payment, billing, and trial lifecycle: untouched.
- Analytics tracking endpoints: untouched.
- Organization / card public routing: untouched.
- Template registry (`frontend/src/templates/templates.config.js`): untouched.
- `useEditorTour.js` — anonymous guide hook: untouched.
- Anonymous guide flow (24-step guide, CTA highlight, replay): untouched.
- `GuideVideoModal.jsx` and video guide infrastructure: untouched.
- `useEditorTour.js`, `TourCoachPanel.jsx`: untouched.
- `useBlocker` call in `EditCard.jsx`: untouched.
- Existing closed handoff docs: untouched.
- Archive / historical docs: untouched.

---

## 10. Anti-Overclaim Notes

- Manual smoke was operator-manual. It was not automated E2E. Do not represent it as automated.
- The mini-guide is authenticated personal mobile flow only. It does not activate for org-context users. It does not activate for anonymous users (anonymous users do not reach the authenticated editor route with a real card).
- Production video URLs are not enabled unless the `VITE_GUIDE_URL_MOBILE` / `VITE_GUIDE_URL_DESKTOP` environment variables are configured with valid URLs and the Netlify deployment is redeployed. Code is deployed; videos are activation-pending via env.
- The router blocker warning remains a known development-console issue. It is classified as dev-only based on static source-code trace (React Router v7 production bundle inspected at chunk-Z47B263N.js L191, L2943–2947, L7306–7344). No production-preview server was run to produce a runtime confirmation; the production-safety claim is source-trace-based only.
- The router blocker warning is classified as a separate deferred contour. It is not a mini-guide blocker and did not block this workstream's closure.
- No production deployment is claimed by this handoff. Deployment status must be confirmed by the operator.
- Do not include raw cardIds, userIds, tokens, or URLs with private identifiers in any consumer-facing context.
- No backend API contract changes were made.
- No CSS layout or token structure was altered.

---

## 11. Closure Declaration

All three sub-contours of the authenticated mobile mini-guide "איך לשתף כרטיס" workstream are closed:

1. Main mini-guide implementation — CLOSED.
2. Hook-order runtime crash fix — CLOSED.
3. Mobile drawer regression fix — CLOSED.

Frontend gates: all EXIT:0.
Manual operator smoke: PASS.
Backend: untouched.
CSS: untouched (existing module reused, no new or modified CSS files).
Docs surface: this closure handoff only.

Router blocker warning: separate deferred contour, not a mini-guide blocker.

This workstream is complete.
