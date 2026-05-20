# Cardigo Enterprise Handoff — Anonymous Mobile Editor Guide Replan And UX Fixes Closed

**Date:** 2026-05-20
**Status:** CLOSED / PASS / PRODUCTION VERIFIED
**Verification type:** manual operator production smoke + frontend gates

---

## 1. Executive Summary

This handoff closes the full anonymous mobile editor guide replan workstream and all follow-up UX fix contours.

The anonymous mobile card editor now includes a 24-step guided walkthrough that activates on the `/edit/card/templates` route for anonymous editing sessions. The guide coaches the user through the full card-creation flow — template selection, uploading images, filling in business and contact information, and saving each section — before completing with a post-tour free-save CTA highlight.

Six sub-contours are closed in this workstream:

1. Main 24-step anonymous mobile guide replan — full implementation across six frontend source files.
2. Hook-order runtime crash fix — EditCard.jsx only; corrected conditional hook call order after initial implementation.
3. Post-tour "שמרו בחינם" CTA highlight — useEditorTour.js + EditCard.jsx; localStorage-pending-key based, fires only on natural completion.
4. Paste-to-advance support in guided input fields — useEditorTour.js only.
5. First typed character preservation fix — useEditorTour.js only; unified deferred scheduleAdvance replaces split sync/deferred paths.
6. Final production smoke closure — manual operator verification on production; all behaviors confirmed.

No backend changes. No CSS changes. No schema or index changes. No env or provider changes. No SEO, OG, sitemap, auth, payment, or billing changes. No docs other than this closure handoff were modified in this docs contour.

---

## 2. Product / UX Truth

The anonymous mobile editor guide is a step-by-step coach panel sequence that activates for anonymous users on the mobile card editor. It guides the user through the minimum viable card creation flow before surfacing a save-for-free registration CTA.

Key product properties:

- The guide activates on the `/edit/card/templates` route for anonymous editing sessions.
- The guide has 24 steps in production.
- Active guide target elements scroll into view on mobile automatically.
- The guide is driven by `useEditorTour.js` and rendered by `TourCoachPanel.jsx`.
- `TourCoachPanel` does NOT render after natural completion. After natural completion the guide is `isDone=true`, `isActive=false`, and no coach panel is shown.
- The post-tour state is communicated via a localStorage pending key, not via a visible coach panel.

Do not claim the guide runs for authenticated users. Production verification was performed on anonymous sessions only.

---

## 3. Final 24-Step Guide Flow

The 24-step sequence covers the full anonymous card creation flow in this order:

1. Template selection — user is directed to choose a template.
2. Template save — user is directed to apply/save the selected template.
3. Preview / edit — guide transitions user to the editor preview.
4. Head section — guide highlights the head/profile section.
5. Background upload — user is directed to upload a background image.
6. Avatar / logo upload — user is directed to upload an avatar or logo image.
7. Head / design save — user is directed to save the head section.
8. Preview / edit after upload — guide returns user to preview/edit.
9. Business tab — guide navigates user to the business information tab.
10. Business name input — user is directed to fill in the business name.
11. Business category input — user is directed to fill in the business category.
12. Business save — user is directed to save the business section.
13. Contact tab — guide navigates user to the contact information tab.
14. Phone input — user is directed to fill in a phone number.
15. Email input — user is directed to fill in an email address.
16. Contact save — user is directed to save the contact section.
17. Final preview / edit — guide completes with a final preview call to action.

Steps 5–17 cover the core content entry and save loop. Upload and save steps have their own advance gates (see Section 4).

Step numbering and user-facing step text are sourced from the step array in `frontend/src/hooks/useEditorTour.js`. Step text may change in future iterations; this handoff documents the step count and flow order as production truth for this contour.

---

## 4. Advance Mechanics

There are four advance trigger types. Each step declares its type in the step definition.

### 4.1 Click Steps (default)

Most navigation steps advance on a user click of the designated target element. No value check is performed. The click event handler fires `advance()` directly.

### 4.2 Upload Success Steps (`isUploadStep`)

Upload steps do NOT advance on upload button click. They advance only after a confirmed upload-and-apply cycle. The advance fires on receipt of the `cardigo:upload-applied` CustomEvent, dispatched by the upload handler only after successful upload and application to the card.

Upload cancel does not dispatch the event — guide does not advance.
Upload error does not dispatch the event — guide does not advance.
This ensures the guide only progresses when real content is present.

### 4.3 Input Typing / Paste Steps (`advanceOn: "input"`)

Four steps in the guide are input steps (business name, business category, phone, email).

Advance fires after the first non-empty value is detected in the controlled input. Both typing and paste are supported.

Implementation note (relevant for future maintenance): Both `input` and `paste` events are handled via a single deferred `scheduleAdvance()` function using `setTimeout(0)`. Deferral is required because native `addEventListener` fires at React 18 DefaultEventPriority while React's controlled `onChange` fires at SyncLane. Without deferral, the advance state update could render before `onChange` commits the character, resetting the controlled input value and losing the first typed character. The `setTimeout(0)` deferral allows React to commit both state updates before the value check runs. A `handled` flag prevents double-advance if both input and paste fire in close succession.

Behavior guarantees:

- First typed character is preserved.
- Paste advances the guide without double-advancing.
- Guide does not advance if the input value is empty or whitespace only.

### 4.4 Save Success Steps (`isSaveStep`)

Save steps advance only after a confirmed save operation succeeds.

The "המשך" (continue) button in the editor is routed through `guardedTourNext` in `EditCard.jsx`. If the current guide step is a save step and the form has dirty (unsaved) changes, `guardedTourNext` triggers the save flow and blocks guide advance until save success is confirmed.

If the current guide step is a save step but the form has no dirty changes (nothing has been modified since the last save), `guardedTourNext` allows "המשך" to advance the guide directly, preventing a deadlock where the user cannot proceed because there is nothing to save.

"המשך" cannot bypass a dirty save step. The user must save before the guide advances.

---

## 5. Skip / Replay / Completion Behavior

### Skip

The guide is dismissed only by clicking "דלג על ההדרכה". This calls `skip()` in `useEditorTour.js`, which:

- Sets `isDone=true`, `isActive=false`.
- Calls `clearEditorTourCtaHighlightPending()` — the CTA highlight pending key is explicitly cleared.
- Skip does NOT write the CTA highlight pending key.
- Skip does NOT trigger the post-tour "שמרו בחינם" highlight.

### Natural Completion

When all 24 steps have been advanced without skip, the guide completes naturally. `advance()` on the final step:

- Sets `isDone=true`, `isActive=false`.
- Calls `writeEditorTourCtaHighlightPending()` — the CTA highlight pending key is written to localStorage.
- The post-tour CTA highlight state activates (see Section 6).

### Replay

"הדריכו אותי שוב" calls `restart()` in `useEditorTour.js`, which:

- Calls `clearEditorTourCtaHighlightPending()` — any existing CTA highlight pending key is cleared.
- Resets the guide to step 0, `isActive=true`, `isDone=false`.

After a replay runs to natural completion, `writeEditorTourCtaHighlightPending()` is called again and the CTA highlight reappears.

---

## 6. Post-Tour CTA Highlight

After natural guide completion, the "שמרו בחינם" anchor link in the anonymous final CTA banner receives a visual highlight. This is implemented via a localStorage pending key, not via `TourCoachPanel`.

Pending key: `cardigo_editor_tour_cta_highlight_pending_v1`

Behavior:

- Written to localStorage by `advance()` only on natural final step completion.
- `EditCard.jsx` reads the pending key on mount. When `editorTour.isDone && !editorTour.isActive`, it syncs the highlight pending state into React component state.
- While pending is active, the "שמרו בחינם" anchor link renders with `data-tour-active="true"`.
- First click on "שמרו בחינם" clears the pending key and removes `data-tour-active`.
- The pending key persists across page reload until clicked.
- Skip explicitly calls `clearEditorTourCtaHighlightPending()` — skip never results in a highlight.
- `TourCoachPanel` does not render during the CTA highlight phase.

Final anonymous CTA banner copy (unchanged in this contour):

Text: "שמרו את הכרטיס שלכם בחינם, פרסמו ושתפו עם הלקוחות! כולל 10 ימי פרימיום במתנה"
Primary button: "שמרו בחינם"
Secondary button: "התחברו"

Do not claim this copy is permanently frozen beyond this contour. The contour did not change this copy; it was already present.

---

## 7. Changed Files And Scope Boundaries

### Full Guide Replan Surface (main implementation + hook-order fix)

- `frontend/src/hooks/useEditorTour.js` — guide state machine, step array (24 steps), advance effects, upload success listener, input/paste advance effects, CTA highlight helpers.
- `frontend/src/pages/EditCard.jsx` — hook-order fix, `guardedTourNext`, `showSaveFreeCtaHighlight` computed, `ctaHighlightPending` state, sync useEffect for pending key, "שמרו בחינם" Link `data-tour-active` + onClick.
- `frontend/src/components/editor/design/DesignEditor.jsx` — guide target integration for design/upload steps.
- `frontend/src/components/editor/panels/BusinessPanel.jsx` — guide target integration for business input steps.
- `frontend/src/components/editor/panels/ContactPanel.jsx` — guide target integration for contact input steps.
- `frontend/src/components/editor/TourCoachPanel.jsx` — coach panel component rendering guide step content and action buttons.

### Tail Fix Surfaces (post-implementation fixes)

- Hook-order crash fix: `frontend/src/pages/EditCard.jsx` only.
- Post-tour CTA highlight: `frontend/src/hooks/useEditorTour.js` + `frontend/src/pages/EditCard.jsx`.
- Paste advance fix: `frontend/src/hooks/useEditorTour.js` only.
- First-character preservation fix: `frontend/src/hooks/useEditorTour.js` only.

### Scope Boundaries — Explicitly Not Changed

- No backend files changed.
- No CSS / CSS Modules files changed.
- No database schema or index changes.
- No environment variable or provider configuration changes.
- No SEO, OG meta, sitemap, or robots changes.
- No auth, payment, or billing changes.
- No existing closed handoff docs edited.
- No archive / historical docs edited.
- No docs other than this closure handoff were modified in this docs contour.

---

## 8. Tail Fixes Closed During The Contour

### 8.1 Hook-Order Runtime Crash

After the initial guide implementation, a runtime crash was observed in `EditCard.jsx` caused by a conditional hook call order violation (React rules of hooks). The fix reordered the hook calls so all hooks execute unconditionally before any conditional logic, restoring stable render behavior. File changed: `frontend/src/pages/EditCard.jsx` only.

### 8.2 Paste Advance

After the initial guide implementation, pasting text into a guided input field did not advance the guide. The fix added a `paste` event listener alongside the existing `input` event listener in the `advanceOn:"input"` effect in `useEditorTour.js`. A `handled` flag prevented double-advance. A `pasteTimerId` provided deferred advance for the paste path. File changed: `frontend/src/hooks/useEditorTour.js` only.

### 8.3 First-Character Preservation

After the paste advance fix, typing a single character into a guided input field was found to advance the guide while losing the typed character. Root cause: the `input` event listener called `tryAdvance()` synchronously inside a native `addEventListener`. `advance()` fired at React 18 DefaultEventPriority while React's controlled `onChange` fired at SyncLane. The priority gap allowed React to render the advance state update before `onChange` committed the character value, resetting the controlled input to empty and discarding the first character.

Fix: unified `scheduleAdvance()` replaces the split sync-input / deferred-paste paths. Both `handleInput` and `handlePaste` call `scheduleAdvance()`, which defers via `setTimeout(0)`. By the time the timer fires, React has committed both the advance state and the `onChange` value update. The controlled input value is stable. A shared `timerId` (replacing the separate `pasteTimerId`) ensures only one timer is in flight; clearing before rescheduling prevents stale timer callbacks. File changed: `frontend/src/hooks/useEditorTour.js` only.

### 8.4 CTA Highlight

After the guide ran to natural completion, no visual indication directed the anonymous user toward the registration CTA. The fix introduced the `cardigo_editor_tour_cta_highlight_pending_v1` localStorage pending key, written by `advance()` on natural final step completion, cleared by `skip()` and `restart()`. `EditCard.jsx` reads the key and applies `data-tour-active="true"` to the "שמרו בחינם" anchor. The highlight persists across reload until first click. Files changed: `frontend/src/hooks/useEditorTour.js` + `frontend/src/pages/EditCard.jsx`.

---

## 9. Verification Summary

### Frontend Gates

All four frontend gates passed with EXIT:0 across the relevant contours. Gates run from `frontend/`:

- `npm.cmd run check:inline-styles` — EXIT:0
- `npm.cmd run check:skins` — EXIT:0
- `npm.cmd run check:contract` — EXIT:0
- `npm.cmd run build --if-present` — EXIT:0

Backend sanities were not run in these contours. No backend files were changed; backend sanity runs were not applicable.

### Manual Production Smoke

Production verification was manual operator smoke. No automated E2E test suite was run.

Confirmed in production:

- Guide activates on the anonymous mobile editor flow.
- Post-tour CTA "שמרו בחינם" link is highlighted after natural guide completion.
- CTA highlight clears on first click of "שמרו בחינם".
- Skip does not trigger the CTA highlight.
- Pasting text into a guided input field advances the guide.
- Paste does not double-advance the guide.
- First typed character in a guided input field is preserved while the guide advances.
- All four guided input steps (business name, business category, phone, email) preserve the first character.

---

## 10. Anti-Scope / Non-Actions

The following were explicitly out of scope for this workstream and were not touched:

- Backend source files: untouched.
- CSS / CSS Modules files: untouched.
- MongoDB schema or index definitions: untouched.
- Environment variables, Supabase config, email provider config: untouched.
- SEO metadata, OG tags, sitemap.xml, robots.txt: untouched.
- Auth flows (login, signup, invite, cookie, CSRF): untouched.
- Payment, billing, and trial lifecycle: untouched.
- Analytics tracking endpoints: untouched.
- Organization / card public routing: untouched.
- Template registry (`frontend/src/templates/templates.config.js`): untouched.
- Guide video modal feature (separate contour, documented in 2026-05-19 handoff): untouched.
- Existing closed handoff docs: untouched.
- Archive / historical docs: untouched.

---

## 11. Anti-Overclaim Notes

- Production verification was manual operator smoke, not automated E2E. Do not represent it as automated.
- The guide was production-verified on anonymous sessions. Do not claim the guide is restricted to anonymous users without source-level proof; the code surface was not audited for authenticated-user exclusion logic in this handoff.
- The CTA highlight appears only after natural completion. Do not claim it appears after skip.
- Save steps have a no-dirty bypass. Do not claim save steps always require a network call.
- User-facing step text in the guide may change in future iterations. Only the final CTA banner copy is documented here as the copy that existed at the time this contour closed. Do not claim any other copy is permanently frozen.
- `TourCoachPanel` does not render after guide natural completion. After completion, `isActive=false` and `isDone=true`; the component is not shown.
- Do not include raw anonId, cardId, userId, tokens, or URLs with private identifiers in any consumer-facing context.
- No backend API contract changes were made. Do not claim backend behavior was altered.
- No CSS structure was altered. Styling tokens and layout are unchanged.
- The 2026-05-19 handoff (`EditorTemplates_MobileGuideDropdown_And_GuideVideoModal_Closed`) noted `useEditorTour.js` as "NOT modified" in that contour. That note remains accurate for that contour. The present workstream is a separate set of contours that did modify `useEditorTour.js`.

---

## 12. Closure Declaration

All six sub-contours of the anonymous mobile editor guide replan workstream are closed:

1. Main 24-step guide replan — CLOSED.
2. Hook-order runtime crash fix — CLOSED.
3. Post-tour CTA highlight — CLOSED.
4. Paste advance support — CLOSED.
5. First-character preservation fix — CLOSED.
6. Final production smoke closure — CLOSED / PRODUCTION VERIFIED.

Frontend gates: all EXIT:0.
Manual production smoke: PASS.
Backend: untouched.
CSS: untouched.
Docs surface: this closure handoff only.

This workstream is complete.
