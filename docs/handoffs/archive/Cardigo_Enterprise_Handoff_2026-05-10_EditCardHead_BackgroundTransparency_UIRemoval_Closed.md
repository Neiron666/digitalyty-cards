# Cardigo Enterprise Handoff

## Contour: EDIT_CARD_HEAD_BACKGROUND_TRANSPARENCY_REMOVAL_PHASE2A

**Date:** 2026-05-10
**Status:** CLOSED

---

## Decision

UI-only removal of the "שקיפות רקע" (background transparency) range slider from the /edit/card/head editor panel.

The control was judged unfinished and confusing to users. It was safe to remove from the UI because the underlying field, render chain, and saved data are all still fully functional.

---

## What Was Done

Removed the JSX `<label>` block in `DesignEditor.jsx` that rendered:

- A visible Hebrew label: "שקיפות רקע"
- An `<input type="range">` slider (min=0, max=70) reading and writing `design.backgroundOverlay`

The block was located inside the `template?.supports?.backgroundImage` conditional section of `DesignEditor.jsx`, after the "שמור/י את הכרטיס" helper paragraph and before the section close.

---

## Files Changed

- `frontend/src/components/editor/design/DesignEditor.jsx` — removed the `<label>` block described above. No other edits.

---

## Explicitly Preserved (Not Touched)

- `design.backgroundOverlay` — field remains in MongoDB schema, DTO, save payload, and draft state.
- `backend/src/models/Card.model.js` — `backgroundOverlay: { type: Number, default: 40 }` at line 1114 unchanged.
- `backend/src/utils/cardDTO.js` — `design: cardObj.design` passthrough at line 113 unchanged.
- `backend/src/controllers/card.controller.js` — `sanitizeWritablePatch` and `buildSetUpdateFromPatch` unchanged. The field continues to pass through to MongoDB writes.
- `frontend/src/templates/layout/CardLayout.jsx` — `overlayValue = Number(design?.backgroundOverlay ?? 40)` at line 47 unchanged. Public and preview render chain intact.
- `frontend/src/templates/layout/CardLayout.module.css` — `.overlay0` through `.overlay70` CSS classes unchanged.
- `frontend/src/templates/templates.config.js` — `backgroundOverlay: 40` in `designDefaults` at lines 199 and 338 unchanged.
- `frontend/src/components/editor/design/DesignEditor.module.css` — `.label` and `.labelTitle` classes unchanged (shared by other controls in same component).
- `frontend/src/components/editor/panels/HeaderPanel.jsx` — legacy/dead component, unchanged.
- All existing card documents in MongoDB — `design.backgroundOverlay` values are preserved. No migration was run.

---

## Behavior After Change

- `/edit/card/head` no longer shows "שקיפות רקע" or the overlay slider.
- Background image upload/delete controls remain fully functional.
- Avatar upload/delete controls remain fully functional.
- All other editor controls in the head tab remain unchanged.
- Existing cards continue to render with their saved `backgroundOverlay` value via `CardLayout` overlay classes.
- New cards receive `backgroundOverlay: 40` from the Mongoose schema default; `CardLayout` renders `.overlay40`.
- When any design field is saved, the full `draftCard.design` object (including `backgroundOverlay`) is included in the PATCH payload and accepted by the backend without error.
- Public card and preview render chains are visually unchanged.

---

## Verification Summary

### Automated Gates (all EXIT:0)

| Gate                              | Result                                      |
| --------------------------------- | ------------------------------------------- |
| `npm.cmd run check:inline-styles` | PASS / EXIT:0                               |
| `npm.cmd run check:skins`         | PASS / EXIT:0 — 28 skin files scanned       |
| `npm.cmd run check:contract`      | PASS / EXIT:0 — 25 templates                |
| `npm.cmd run build`               | PASS / EXIT:0 — 366 modules, built in 3.94s |

### Source Proof

- `"שקיפות רקע"` in `DesignEditor.jsx` → 0 matches
- `backgroundOverlay` in `DesignEditor.jsx` → 0 matches
- Background image controls present at lines 194, 198, 223, 226, 241
- Avatar controls present at lines 271, 273, 298, 301, 316

### Anti-Scope Proof

- `CardLayout.jsx` — `backgroundOverlay` read at line 47: unchanged
- `CardLayout.module.css` — `.overlay40` at line 197: unchanged
- `DesignEditor.module.css` — `.label` / `.labelTitle` at lines 112, 118: unchanged
- `HeaderPanel.jsx` — dead references at lines 124, 128: unchanged
- `Card.model.js` — schema field at line 1114: unchanged
- `cardDTO.js` — design passthrough at line 113: unchanged
- `templates.config.js` — designDefaults at lines 199, 338: unchanged

### Manual Smoke (PASS)

- `/edit/card/head` opens without crash or console errors
- "שקיפות רקע" not visible
- Neighboring controls functional
- Editor preview renders
- Save succeeds; no validation error
- Public card renders; no visual overlay regression

---

## Future Deferred Cleanup (Separate Contours — Do Not Act Here)

1. **Schema/render cleanup** — Do NOT remove `backgroundOverlay` from `Card.model.js`, `cardDTO.js`, or `CardLayout.jsx` without a full data-migration plan and explicit architect approval. Existing card documents contain this field and CardLayout actively uses it.

2. **Overlay CSS cleanup** — Do NOT remove `.overlay0`–`.overlay70` classes from `CardLayout.module.css`. They are consumed by the public/preview render chain for all templates.

3. **HeaderPanel.jsx legacy cleanup** — The dead `backgroundOverlay` references at lines 124,128 can be removed in a dedicated dead-code cleanup contour. Not urgent; component is not connected to any route.

4. **DesignEditor.module.css cleanup** — `.label` and `.labelTitle` classes may become partially orphaned in the future. Audit before removing; they may still be used by other controls.

5. **`_tmp_matrix.mjs` repo root** — Pre-existing ephemeral artifact at repo root. Clean up under Rule 1.9 as a separate task.

---

## Rollback

If the slider must be restored, revert the `<label>` block deletion in `DesignEditor.jsx`. No backend, schema, CSS, or data action is needed. Rollback is a single-file, single-block JSX revert.
