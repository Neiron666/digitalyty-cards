# Phase 2 Report (Manual QA + Evidence)

Scope locked:

- Base + CustomV1 only (Beauty excluded by design)
- No deletions of legacy renderers/templates in this phase (stop-gate)

## (a) Guardrail output

Command (Windows, deterministic, from repo root):

- `cmd /c "cd frontend && node scripts\check-no-inline-styles.mjs"`

Output:

- `PASS: no inline styles found. Scope: src/pages/PublicCard.jsx, src/components/card/CardRenderer.jsx, src/templates/TemplateRenderer.jsx, src/templates/layout, src/templates/skins, src/templates/seed, src/components/editor/EditorPreview.jsx, src/components/editor/panels/DesignPanel.jsx. Base: .`

Exit code:

- `0`

Guardrail re-run after Phase 2 fixes:

- Same command
- Same PASS stdout
- Exit code: `0`

## Seeding regression (fixed)

Issue:

- `seedTemplateContent` incorrectly applied the local-assets-only filter to all arrays, which prevented seeding arrays of objects like `socials`.

Fix (minimal):

- Only apply assets-only filtering to:
	- strings
	- arrays of strings (string[])
- If an array contains objects (e.g., `socials`), seed it normally (still only when the target field is empty).
- Keep gallery restricted to local `/templates/...` for both string[] and `{title,url}` item shapes.

Evidence (automated sanity via cmd.exe):

- Command: `cmd /c "cd frontend && node scripts\phase2-seed-sanity.mjs"`
- Output:
	- `PASS: socials seeds (array of objects) when empty`
	- `PASS: gallery string[] seeds local /templates only`
	- `PASS: coverImage blocks non-local seed value`
	- `PASS: avatarImage seeds local /templates value`
	- `PASS: non-empty fields are not overwritten`

## CustomV1 palette rollback (fixed)

Symptom:

- Selecting Ocean/Forest reverts back to Gold after ~1s (after autosave response).

Root cause:

- Backend schema `Card.design` did not include `customPaletteKey`, so Mongoose dropped it on save; the next server response returned `design.customPaletteKey` as missing/null, and the UI fell back to `gold`.

Fix:

- Added `design.customPaletteKey` to the Mongoose schema so it persists.
- Normalized palette key to `trim().toLowerCase()` on change before saving.

## (b) QA matrix

See the filled checklist + evidence links in:

- docs/template-qa-matrix.md

## (c) Issues + minimal fix proposals

Manual QA in-progress (see docs/template-qa-matrix.md). Screenshots and console notes must be collected interactively in the browser.

Issues found during QA and status:

- CTA/Social elements not consistently colored (Editor + Public): FIXED by switching those components to the shared token contract.
- CustomV1 palette (Ocean/Forest) reverting to Gold after ~1s: FIXED by persisting `design.customPaletteKey` in the backend schema.
- Console error `A listener indicated an asynchronous response...`: likely browser extension noise; must confirm in Incognito/without extensions.

## Beauty

- Decision: keep legacy present-but-unreachable until Phase 4.

## Stop-gate

- No deletions of legacy templates/renderers in Phase 2.

If issues are found during manual QA, record them here as:

- Symptom:
- Repro steps:
- Expected vs actual:
- Console warnings/errors:
- Suspected root cause:
- Minimal fix proposal:
- Exact file reference(s):
