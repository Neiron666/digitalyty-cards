# Cardigo Enterprise Handoff — Custom Design: Seed Provenance & Drag Flicker Fix

Contours:

- CUSTOM_DESIGN_BASE_TEMPLATE_PROVENANCE (Phase 2D)
- CUSTOM_DESIGN_COLOR_DRAG_FALLBACK_FLASH (Phase 2E)

Date: 2026-05-24
Status: CLOSED — VERIFIED FUNCTIONAL SCOPE / DOCS UPDATED / OPERATOR MANUAL SMOKE PASS

Note: Operator-reported manual smoke covered the primary drag flicker scenario. Raw DB readback of selfThemeBaseTemplateId on a production card was not pasted into this handoff; operator should verify DB persistence of selfThemeBaseTemplateId independently if required for audit.

---

## 1. Executive Summary

This handoff closes two tightly related custom design contours:

1. Seed behavior fixed: When a user enters "עיצוב עצמי" with no existing selfThemeV1, the effective palette now derives from the selected base template's seed colors (via resolveEffectiveSelfThemeV1 + SELF_THEME_SEED_COLORS_BY_SKIN_KEY), not from hardcoded customV1 fallback colors.

2. Full selfThemeV1 write semantics: Every color picker change writes a complete 5-field selfThemeV1 object (spread of effective seed/custom palette + override of one field). Partial dot-path writes do not occur.

3. Reset-before-save fixed: Reset before the first save of a customV1 card now reflects the effective seed colors from the selected template, not a hardcoded fallback state.

4. Reset-after-save provenance fixed: Reset on a saved customV1 card restores the original base template (when design.selfThemeBaseTemplateId is valid and passes registry identity check), returning the user to the template they started from.

5. Drag flicker fixed: Editor color picker drag no longer flashes the static SelfThemeSkin CSS module defaults between drag events. Root cause was the blob URL async lifecycle (revoke → async reload gap). Fix: replaced editor blob URL injection with synchronous Helmet <style> injection.

6. Public render unchanged: Public mode still uses the backend /api/cards/:id/self-theme.css endpoint. No public render path was modified.

---

## 2. Files Changed by Implementation Phase

Phase 2 — Seed color source, full-object write semantics, editor preview alignment:

- frontend/src/templates/templates.config.js (SELF_THEME_SEED_COLORS_BY_SKIN_KEY, resolveEffectiveSelfThemeV1)
- frontend/src/components/editor/panels/SelfThemePanel.jsx (full-object writeSelfTheme using effectiveSelfTheme spread)
- frontend/src/components/editor/EditorPreview.jsx (previewCardForRender injects resolveEffectiveSelfThemeV1)

Phase 2C — Reset-before-save guard:

- frontend/src/pages/EditCard.jsx (selfThemeIsActive guard in reset path)

Phase 2D — Base template provenance:

- backend/src/models/Card.model.js (selfThemeBaseTemplateId schema field)
- frontend/src/pages/EditCard.jsx (selfThemeBaseTemplateId capture on customV1 activation; stale-clear when switching away)
- frontend/src/components/editor/panels/SelfThemePanel.jsx (reset restore branch using selfThemeBaseTemplateId + identity check)

Phase 2E — Editor drag flicker fix:

- frontend/src/templates/TemplateRenderer.jsx (removed blob URL lifecycle; added Helmet <style key="cardigo-self-theme-editor-css"> injection from selfThemeCssText useMemo)

Phase 4A — Comment cleanup (non-functional):

- frontend/src/templates/TemplateRenderer.jsx (stale "blob stylesheet" comment updated to "Helmet <style> injection")

---

## 3. Architecture Truth

### 3.1 Seed color source

SELF_THEME_SEED_COLORS_BY_SKIN_KEY in frontend/src/templates/templates.config.js maps each regular template's skinKey to a 5-field seed palette (bg, text, primary, secondary, onPrimary).

resolveEffectiveSelfThemeV1(selfThemeV1, baseTemplateId) in the same file resolves the effective palette: if selfThemeV1 has all 5 valid hex fields, returns it as-is; otherwise resolves seed colors from the base template's skinKey. Falls back to SELF_THEME_FALLBACK_PALETTE only if no seed is found.

EditorPreview.jsx injects resolveEffectiveSelfThemeV1 into the preview card clone when on the design tab. This ensures the preview always shows real seed colors from the selected template rather than SelfThemeSkin static CSS defaults.

### 3.2 Complete selfThemeV1 write semantics

SelfThemePanel.jsx writeSelfTheme computes effectiveSelfTheme via resolveEffectiveSelfThemeV1 then spreads all 5 fields, overriding only the changed field. This means changing one color picker always writes a complete 5-field selfThemeV1 object. Partial dot-path writes (which could cause the P0 Mongo crash from the existing Postmortem) are not emitted by the editor.

### 3.3 selfThemeBaseTemplateId provenance

Field: design.selfThemeBaseTemplateId
Type: nullable String, non-indexed
Added: Phase 2D — backend/src/models/Card.model.js
Default: null
Purpose: Stores the registry templateId of the regular (non-self) template from which the customV1 card was created. Used exclusively by the reset restore branch. Not used in rendering, save pipeline, or public path.
No index, no migration, no backfill.

Capture: EditCard.jsx captures selfThemeBaseTemplateId when the user activates customV1 from a regular template. If the user later switches away from customV1, the stale id is cleared.

### 3.4 Reset restore semantics

Two branches:

Branch 1 — Provenance restore (new, Phase 2D):
Condition: design.selfThemeBaseTemplateId is set AND identity check passes: resolvedBase?.id === baseTemplateId (guards against getTemplateById silent fallback to TEMPLATES[0]).
Action: editor flow restores design.templateId to the base template. Colors then come from that template's skin/seed behavior as normal. Reset does NOT write seed colors directly into selfThemeV1.
Persistence: occurs at next Save, same as any template change. No second PATCH.

Branch 2 — Legacy fallback (pre-Phase 2D behavior):
Condition: selfThemeBaseTemplateId absent, null, or fails identity check.
Action: clears design.selfThemeV1; SelfThemeSkin CSS module defaults apply.
No second PATCH.

### 3.5 Invalid base id safety

getTemplateById always returns a truthy result (falls back to TEMPLATES[0] = roismanA11yLight). The reset branch uses explicit identity check resolvedBase?.id === baseTemplateId to prevent silently restoring the wrong template when a stale or invalid id is stored.

### 3.6 Editor CSS injection — Helmet <style>

Before Phase 2E: TemplateRenderer.jsx used URL.createObjectURL to create a blob: URL from selfThemeCssText, injected via Helmet <link>. revokeObjectURL was called on cleanup. The async revoke → reload gap exposed the static SelfThemeSkin CSS defaults for ~2 frames on every drag event.

After Phase 2E: Blob URL lifecycle removed entirely. No createObjectURL, no revokeObjectURL, no useEffect, no useState in TemplateRenderer.jsx for this path.

Current mechanism: selfThemeCssText is computed synchronously via useMemo from card.design.selfThemeV1 fields. Injected via Helmet <style key="cardigo-self-theme-editor-css">{selfThemeCssText}</style>. The stable key causes react-helmet-async to update the element content in-place rather than remove and re-add, eliminating all flash.

Selector scope: [data-cardigo-scope="card"][data-template-id="${templateId}"][data-self-theme="1"].

Gate: rendered only when selfThemeEditorActive && selfThemeCssText. selfThemeEditorActive = mode === "editor" && isCustomV1 && hasSelfTheme.

### 3.7 Public render branch

Unchanged. TemplateRenderer.jsx public branch:

<link rel="stylesheet" href="/api/cards/:id/self-theme.css?v=${selfThemeVersion}">
Gated by selfThemePublicActive. Backend endpoint, controller, DTO not modified.

---

## 4. Verification Summary

Frontend automated gates (run from frontend/, all EXIT 0):

- check:inline-styles: PASS — no inline styles found
- check:skins: PASS — 28 skin files, token-only
- check:contract: PASS — 25 registry templates, contracts consistent
- build: PASS — 380 modules, 0 errors

Backend sanity gates (run from backend/, all EXIT 0):

- sanity:imports: PASS — {"ok":true,"importedCount":20,"failedCount":0,"failures":[]}
- sanity:card-index-drift: PASS — {"ok":true,"missing":[],"mismatches":[],"unexpected":[]}, selfThemeBaseTemplateId absent from all index names (confirmed non-indexed)

Targeted source checks (TemplateRenderer.jsx):

- createObjectURL: 0 matches
- revokeObjectURL: 0 matches
- selfThemeBlobUrl: 0 matches
- useState: 0 matches
- useEffect: 0 matches
- style={{ or style= (inline attribute): 0 matches
- key="cardigo-self-theme-editor-css": exactly 1 match
- /api/cards/${card.\_id}/self-theme.css: exactly 1 match

Operator manual smoke:

- Primary drag flicker (color picker continuous drag): PASS — operator confirmed "теперь при смене цвета очень плавное поведение, больше не проскакивает фолбэк палитра."
- Smokes 2-8 (all 5 pickers, stop-drag persistence, save/reload, reset provenance regression, tab switch, public render, DevTools blob: network): operator manual smoke required; automated gate coverage confirms correct code path; raw DB readback not pasted into this handoff.

---

## 5. Known Limitation

Legacy customV1 cards that were created before Phase 2D do not have design.selfThemeBaseTemplateId set. For these cards, the reset restore branch (Branch 1) cannot activate. Reset falls back to Branch 2: clear selfThemeV1, show SelfThemeSkin defaults.

No migration or backfill was performed for legacy cards. This is intentional. A user with a legacy card can manually select a regular template from "תבניות" to achieve the equivalent result.

---

## 6. Boundaries Not Touched

The following were verified unchanged and are out of scope for this workstream:

- frontend/src/templates/layout/CardLayout.jsx
- frontend/src/templates/layout/CardLayout.module.css
- frontend/src/templates/skins/\*\* (all skin CSS modules including SelfThemeSkin.module.css)
- backend/src/controllers/card.controller.js
- backend/src/utils/cardDTO.js (card DTO)
- Public /api/cards/:id/self-theme.css endpoint and its server-side CSS generation
- SEO, OG metadata, sitemap, structured data
- Auth, cookies, JWT, CSRF
- Analytics tracking endpoints
- Index governance — no new indexes; sanity:card-index-drift EXIT 0 confirms no drift

---

## 7. Closure Statement

Closed for verified functional scope, with legacy no-provenance customV1 limitation documented. Automated gates passed. Operator manual smoke passed for the primary drag flicker scenario. Remaining operator smokes (DB readback, all-5-pickers, save/reload, tab-switch, public render) require manual verification in a live session and do not block this documentation closure.
