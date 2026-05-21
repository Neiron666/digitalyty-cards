# Cardigo Enterprise Handoff — Editor Mobile Mini-Guide: SEO וסקריפטים — Closed

**Date:** 2026-05-21
**Project:** Cardigo — Israel-first digital business card SaaS
**Canonical domain:** https://cardigo.co.il
**Status:** CLOSED / CODE VERIFIED / OPERATOR-SMOKED / FRONTEND GATES PASS / READY FOR DEPLOY CHECKLIST

---

## 1. Contour

EDITOR_MOBILE_GUIDE_MINI_TOUR_SEO_AUTO

---

## 2. Executive Summary

This handoff closes the second authenticated mobile mini-guide workstream. A new step-by-step coach panel guide titled "SEO וסקריפטים" was added to the existing `מדריך` dropdown on the `/edit/card/templates` route. The guide walks a premium/trial authenticated user through the three steps required to activate the existing magic SEO auto-setup button.

The guide reuses the existing `useEditorMiniGuide` hook, `TourMiniPanel` component, and all drawer orchestration infrastructure introduced in the share-card mini-guide contour.

No backend changes. No AI service changes. No SEO generation behavior changes. No CSS structure changes. No schema or index changes. No env variable changes. No auth, payment, billing, OG, sitemap, tracking, anonymous-guide, or drawer a11y changes.

---

## 3. Product / UX Truth

### 3.1 Scope

- **Audience:** authenticated personal-card users with `canEditSeo === true` (premium / trial plans).
- **Route:** `/edit/card/templates`.
- **Entry point:** existing `מדריך` dropdown in the mobile topbar.
- **New dropdown item:** "SEO וסקריפטים" — renders second, after "איך לשתף כרטיס" and before any video guide links.
- **Replay:** guide is fully replayable on every dropdown click; no localStorage state.
- **No completion persistence:** guide does not write any localStorage key on completion.
- **No AI/API calls from guide code:** the guide only navigates the user to the existing button. Any AI call is made by the existing `runMagicSeoSetup` handler on user click, exactly as before.

### 3.2 Guide Flow

Three static steps — computed unconditionally regardless of card state:

1. **seo-open** — target `editor-tour-sections-menu`: "פתחו את תפריט העריכה."
    - `requiresDrawer: false`
    - "הבא" is enabled

2. **seo-tab** — target `editor-mini-guide-tab-seo`: "בחרו SEO וסקריפטים."
    - `requiresDrawer: true`
    - `isNextDisabledByDefault: true` — "הבא" is disabled until the user taps the SEO tab

3. **seo-auto-btn** — target `editor-mini-guide-seo-auto-btn`: "לחצו על ״הגדירו לי SEO אוטומטית״. אם הכפתור לא פעיל, השלימו קודם את הפרטים החסרים."
    - `requiresDrawer: false`
    - `isFinalBlockStep: true` — user click on the magic SEO button fires `complete()` via the existing dedicated final-block click effect; same click also fires `runMagicSeoSetup` normally
    - "סיום" button is enabled as fallback if the magic button is disabled

### 3.3 Guide Completion

When the user clicks the magic SEO button while it is enabled:

- The existing `isFinalBlockStep` dedicated click-completion effect fires `complete()`.
- No `preventDefault`, no `stopPropagation` — the real `runMagicSeoSetup` handler fires on the same user click.
- The guide closes. The existing SEO action proceeds exactly as before.

If the magic SEO button is disabled (missing business name / category / other required field):

- The user can click "סיום" to close the guide (isFinalStep → advance → complete).
- The user can click "דלג" to close the guide (skip).
- The guide does not crash and does not block the user.

### 3.4 Dropdown Order

`מדריך` dropdown item render order (source: Editor.jsx):

1. "איך לשתף כרטיס" — `{onStartShareMiniGuide ? (...) : null}` — `ref={guideFirstItemRef}`
2. "SEO וסקריפטים" — `{onStartSeoMiniGuide ? (...) : null}` — **no ref** (guideFirstItemRef stays on item 1)
3. "מדריך לסלולר" — `{GUIDE_URLS.mobile ? (...) : null}` — env-controlled
4. "מדריך למחשב" — `{GUIDE_URLS.desktop ? (...) : null}` — env-controlled

`guideFirstItemRef` focus-on-open behavior is safe: `miniSeoGuideAvailable` requires `miniGuideAvailable`, so the share guide item is always present when the SEO guide item is present. Focus always lands on item 1.

### 3.5 Visibility Gating

`onStartSeoMiniGuide` is passed to `Editor` only when both of the following are true:

- `miniGuideAvailable` is true (same conditions as share guide: authenticated personal user, templates tab, context resolved, `section === "card"`, `draftCard._id` non-null, `draftCard.publicPath` non-null).
- `draftCard.entitlements.canEditSeo === true` (premium / trial).

Source: `EditCard.jsx` — `miniSeoGuideAvailable` computation.

When `onStartSeoMiniGuide` is undefined, the "SEO וסקריפטים" dropdown item does not render.

### 3.6 Guide Button Visibility

`showGuideBtn` condition in `Editor.jsx`:

```
isMobile && showGuideDropdown && activeTab === PANEL_TEMPLATES &&
(HAS_ANY_GUIDE_URL || Boolean(onStartShareMiniGuide) || Boolean(onStartSeoMiniGuide))
```

The `מדריך` button renders if at least one guide item or video URL is available.

---

## 4. Architecture

### 4.1 Hook: useEditorMiniGuide

- `MINI_GUIDE_IDS` registry extended: `SEO_AUTO: "seo-auto"` added alongside existing `SHARE_CARD: "share-card"`.
- `buildSeoAutoSteps()` added as a static factory — accepts `context` argument but ignores it (steps are unconditional).
- `computeActiveSteps()` dispatch extended: `if (guideId === MINI_GUIDE_IDS.SEO_AUTO) return buildSeoAutoSteps(context);` branch added after the existing `SHARE_CARD` branch.
- No changes to `buildShareCardSteps()`, slug/publish advance effects, input/paste advance effects, or `isFinalBlockStep` dedicated click effect.
- `currentGuideId` was already in the hook return object — no new export added.

### 4.2 Component: TourMiniPanel

- New `guideTitle` prop added to destructure list.
- `aria-label` changed from hardcoded `"מדריך שיתוף כרטיס"` to `{guideTitle || "מדריך"}`.
- When SEO guide is active, `EditCard.jsx` passes `"מדריך SEO אוטומטי"`.
- When share guide is active, `EditCard.jsx` passes `"מדריך שיתוף כרטיס"`.
- No CSS changes. Continues to use `TourCoachPanel.module.css` unchanged.

### 4.3 Component: Editor

- `onStartSeoMiniGuide` destructured from props (after `onStartShareMiniGuide`).
- `showGuideBtn` condition extended with `|| Boolean(onStartSeoMiniGuide)`.
- "SEO וסקריפטים" button inserted between share guide item and video guide items in the dropdown JSX.
- SEO guide button has no `ref` — `guideFirstItemRef` remains on the share guide item.
- All existing drawer a11y (`useFocusTrap`, `inert`, focus handoff, Escape handling, scroll lock) unchanged.

### 4.4 Page: EditCard

- `miniSeoGuideAvailable` derived after `miniGuideAvailable`.
- `miniGuideTitle` stable const derived from `miniGuide.currentGuideId`.
- `guideTitle={miniGuideTitle}` passed to `TourMiniPanel`.
- `onStartSeoMiniGuide` prop wired to `Editor` component.
- `useEditorMiniGuide` hook call position unchanged — still before all early returns.

### 4.5 Component: EditorSidebar

- `data-tour-id` ternary extended: `tab.id === "seo" ? "editor-mini-guide-tab-seo" : undefined` added before the final `undefined` fallback.
- All existing anchors (`head`, `business`, `contact`, `settings`) unchanged.

### 4.6 Component: SeoPanel

- `data-tour-id="editor-mini-guide-seo-auto-btn"` attribute added to the magic SEO button opening tag.
- `disabled={!magicReady || orchestratorBusy}` — unchanged.
- `onClick={runMagicSeoSetup}` — unchanged.
- `type="button"` — unchanged.
- `runMagicSeoSetup`, AI quota logic, consent logic, orchestrator, and all SEO generation behavior — unchanged.

---

## 5. Changed Files

| File                                                 | Change                                                                                                               |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `frontend/src/hooks/useEditorMiniGuide.js`           | Added `SEO_AUTO` to `MINI_GUIDE_IDS`, added `buildSeoAutoSteps()`, extended `computeActiveSteps()` dispatch          |
| `frontend/src/components/editor/TourMiniPanel.jsx`   | Added `guideTitle` prop, dynamic `aria-label`                                                                        |
| `frontend/src/components/editor/Editor.jsx`          | Added `onStartSeoMiniGuide` prop, extended `showGuideBtn`, added SEO dropdown item                                   |
| `frontend/src/pages/EditCard.jsx`                    | Added `miniSeoGuideAvailable`, `miniGuideTitle`, `guideTitle` prop to TourMiniPanel, `onStartSeoMiniGuide` to Editor |
| `frontend/src/components/editor/EditorSidebar.jsx`   | Added `"seo"` case to `data-tour-id` ternary                                                                         |
| `frontend/src/components/editor/panels/SeoPanel.jsx` | Added `data-tour-id` to magic SEO button                                                                             |

---

## 6. Source Proof Summary

All file:line-range references are from Phase 3 static verification.

`MINI_GUIDE_IDS.SEO_AUTO`
frontend/src/hooks/useEditorMiniGuide.js L3-L6
`export const MINI_GUIDE_IDS = { SHARE_CARD: "share-card", SEO_AUTO: "seo-auto", };`

`buildSeoAutoSteps()`
frontend/src/hooks/useEditorMiniGuide.js L83-L116
Static 3-step factory; context argument accepted but unused.

`computeActiveSteps()` SEO branch
frontend/src/hooks/useEditorMiniGuide.js L118-L128
`if (guideId === MINI_GUIDE_IDS.SEO_AUTO) { return buildSeoAutoSteps(context); }` — added after SHARE_CARD branch, before `return [];`.

`currentGuideId` in hook return (not duplicated)
frontend/src/hooks/useEditorMiniGuide.js L381-L397
`currentGuideId` appears once in the return object, unchanged from share-card implementation.

`isFinalBlockStep` dedicated click effect — no preventDefault / stopPropagation
frontend/src/hooks/useEditorMiniGuide.js L364-L380
`const handler = () => { complete(); };` — plain click listener only.

`TourMiniPanel guideTitle` prop
frontend/src/components/editor/TourMiniPanel.jsx L15
`guideTitle,` in destructure list.

`TourMiniPanel aria-label` dynamic
frontend/src/components/editor/TourMiniPanel.jsx L23
`aria-label={guideTitle || "מדריך"}`

Dropdown ordering (share → seo → video)
frontend/src/components/editor/Editor.jsx L415-L483
(1) `{onStartShareMiniGuide ? (<button ref={guideFirstItemRef}>איך לשתף כרטיס</button>) : null}` L415-L428
(2) `{onStartSeoMiniGuide ? (<button>SEO וסקריפטים</button>) : null}` L429-L440
(3) `{GUIDE_URLS.mobile ? ...}` L441+
(4) `{GUIDE_URLS.desktop ? ...}` follows

SEO dropdown item has no `guideFirstItemRef`
frontend/src/components/editor/Editor.jsx L429-L440 — no `ref` prop on SEO button.

`showGuideBtn` includes `Boolean(onStartSeoMiniGuide)`
frontend/src/components/editor/Editor.jsx L254-L259
`(HAS_ANY_GUIDE_URL || Boolean(onStartShareMiniGuide) || Boolean(onStartSeoMiniGuide));`

`miniSeoGuideAvailable`
frontend/src/pages/EditCard.jsx L2519-L2520
`const miniSeoGuideAvailable = miniGuideAvailable && draftCard?.entitlements?.canEditSeo === true;`

`miniGuideTitle`
frontend/src/pages/EditCard.jsx L2522-L2525
`const miniGuideTitle = miniGuide.currentGuideId === MINI_GUIDE_IDS.SEO_AUTO ? "מדריך SEO אוטומטי" : "מדריך שיתוף כרטיס";`

`guideTitle={miniGuideTitle}` passed to TourMiniPanel
frontend/src/pages/EditCard.jsx L2580
`guideTitle={miniGuideTitle}`

`onStartSeoMiniGuide` wired to Editor
frontend/src/pages/EditCard.jsx L2702-L2705
`onStartSeoMiniGuide={ miniSeoGuideAvailable ? () => miniGuide.start(MINI_GUIDE_IDS.SEO_AUTO) : undefined }`

`onStartShareMiniGuide` unchanged
frontend/src/pages/EditCard.jsx L2696-L2701
Identical to pre-change. `miniGuide.start(MINI_GUIDE_IDS.SHARE_CARD)` unmodified.

`useEditorMiniGuide` called before early returns
frontend/src/pages/EditCard.jsx L2246-L2263
Hook call at L2248. Comment: "Mini-guide hook: must be called unconditionally before any early return." First early return at L2266.

SEO tab `data-tour-id`
frontend/src/components/editor/EditorSidebar.jsx L399-L401
`tab.id === "seo" ? "editor-mini-guide-tab-seo" : undefined`

Existing sidebar anchors unchanged
frontend/src/components/editor/EditorSidebar.jsx L391-L402
head → "editor-tour-tab-head", business → "editor-tour-tab-business", contact → "editor-tour-tab-contact", settings → "editor-mini-guide-tab-settings" — all unchanged.

SEO auto button `data-tour-id`
frontend/src/components/editor/panels/SeoPanel.jsx L791
`data-tour-id="editor-mini-guide-seo-auto-btn"`

Unchanged `disabled={!magicReady || orchestratorBusy}`
frontend/src/components/editor/panels/SeoPanel.jsx L792
Attribute unchanged.

Unchanged `onClick={runMagicSeoSetup}`
frontend/src/components/editor/panels/SeoPanel.jsx L794
Attribute unchanged.

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

| Check                                                                   | Result |
| ----------------------------------------------------------------------- | ------ |
| Dropdown order: share guide first, SEO guide second, video links last   | PASS   |
| SEO guide 3-step flow activates correctly                               | PASS   |
| Step 2 "הבא" disabled until SEO tab clicked                             | PASS   |
| Magic SEO button click closes guide; existing action starts normally    | PASS   |
| No double API call observed in Network tab                              | PASS   |
| AI consent modal (if shown) remains visible and functional              | PASS   |
| Disabled button fallback: "סיום" closes guide                           | PASS   |
| Disabled button fallback: "דלג" closes guide                            | PASS   |
| Guide replay (click item again after completion) restarts from step 1   | PASS   |
| Share guide regression: still works, aria-label = "מדריך שיתוף כרטיס"   | PASS   |
| Free/locked SEO user (canEditSeo !== true): "SEO וסקריפטים" item absent | PASS   |
| Org context: guide dropdown hidden as before                            | PASS   |
| No "Blocked aria-hidden" warning in console                             | PASS   |
| No React hook-order error                                               | PASS   |
| Editor drawer focus trap still operational                              | PASS   |
| Hidden drawer remains inert                                             | PASS   |

---

## 8. Non-Changes / Anti-Scope

The following were explicitly not changed in this contour:

- **Backend:** zero backend files changed. No routes, models, middleware, scripts, or index changes.
- **AI service:** no changes. `runMagicSeoSetup`, AI quota, AI consent, orchestrator logic, Gemini integration — all unchanged.
- **SEO generation behavior:** unchanged. The guide does not call AI or any API. It only navigates the user to the existing button.
- **Quota / consent behavior:** unchanged. The existing AI consent modal fires on the first magic-button click as before.
- **CSS files:** zero CSS files changed. All new JSX uses existing classNames. Skins gate PASS EXIT:0. Inline-styles gate PASS EXIT:0.
- **Drawer a11y:** unchanged. `useFocusTrap`, `inert` attribute, focus handoff on close, initial focus on open, Escape handling — all unchanged from the a11y contour (`EDITOR_MOBILE_MINI_GUIDE_AND_DRAWER_A11Y`).
- **Header.jsx:** not changed.
- **useEditorTour.js:** not changed. Anonymous editor tour unaffected.
- **TourCoachPanel.jsx / TourCoachPanel.module.css:** not changed.
- **Payment / billing / tracking:** not changed.
- **SEO / OG metadata / sitemap:** not changed.
- **CardLayout / templates registry:** not changed. Registry template count = 25, unchanged. Contract gate PASS EXIT:0.
- **Router / useBlocker:** not changed.
- **Env files:** not changed.
- **Package / dependency manifests:** not changed.

---

## 9. Console Notes

### 9.1 Router Blocker Warning

`A router only supports one blocker at a time` — a React Router v6 warning observed during editor tab navigation in local dev.

- This warning is **not** introduced by the SEO mini-guide contour.
- It was present before this workstream and is a pre-existing condition.
- It was **not fixed** in this contour. Fixing it requires a separate router/useBlocker refactor.
- It is **non-blocking** for this contour unless reproduced in a production build or the unsaved-changes guard (`ConfirmUnsavedChangesModal`) malfunctions in operator testing.
- Classification: `ROUTER_BLOCKER_WARNING_SEPARATE_CONTOUR`.

### 9.2 Async Extension Listener

`A listener indicated an asynchronous response by returning true but the message channel closed before a response was received` — observed in local dev browser console.

- This is classified as likely browser extension noise.
- It is **not** attributed to application source.
- It was **not fixed** in this contour.
- Classification: `ASYNC_EXTENSION_NOISE_STILL_PRESENT` unless reproduced in Incognito with extensions disabled and app-source proof is established.

---

## 10. Remaining Tails

The following are open after this contour closes:

1. **Production deploy** — operator must deploy the frontend bundle to production. All four automated gates passed. Manual smoke passed in local dev. No production deploy was executed as part of this contour.

2. **Production smoke after deploy** — after deploy, operator should verify:
    - Dropdown order on production mobile device.
    - SEO guide 3-step flow on a premium/trial user.
    - Share guide regression check on production.
    - No new console errors in production build.

3. **Router blocker warning contour** — optional separate contour to resolve `A router only supports one blocker at a time`. Only warranted if the warning appears in the production build or the unsaved-changes guard (`ConfirmUnsavedChangesModal`) is confirmed to malfunction.

4. **Async listener Incognito triage** — optional. Reproduce in Incognito with extensions disabled to confirm or rule out application-source origin.

---

## 11. Related Handoffs

- `docs/handoffs/current/Cardigo_Enterprise_Handoff_2026-05-21_EditorMobileMiniGuideShareCard_Closed.md` — share-card mini-guide (first guide, same hook/component infrastructure)
- `docs/handoffs/current/Cardigo_Enterprise_Handoff_2026-05-21_EditorMobileDrawerA11Y_Closed.md` — drawer a11y hardening (inert, focus trap, focus-visible)
- `docs/handoffs/current/Cardigo_Enterprise_Handoff_2026-05-19_EditorTemplates_MobileGuideDropdown_And_GuideVideoModal_Closed.md` — original dropdown + video modal infrastructure
- `docs/handoffs/current/Cardigo_Enterprise_Handoff_2026-05-14_SeoMagicSetup_Orchestrator_Closed.md` — SEO magic orchestrator (the button whose behavior is unchanged)
