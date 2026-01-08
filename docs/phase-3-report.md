# Phase 3 Report (Guardrails + CI)

Status:
- Phase 2: PASS
- Phase 3: IN PROGRESS

## Phase 3 invariants

1) Skins are token-only
- Scan scope: `frontend/src/templates/skins/**/*.module.css`
- Allowed selectors: `.theme` and `.palette*` only (including inside `@media` blocks)
- Allowed declarations: CSS custom properties only (`--*: ...;`)
- Forbidden anywhere in skins: `background`, `background-image`, `url(`

2) Registry is source of truth
- `frontend/src/templates/templates.config.js` is the source of truth for:
  - template IDs
  - CustomV1 palette keys

3) Contract checks must fail on mismatch
- Mismatch between registry ↔ renderer ↔ skin class hooks is a hard FAIL.

4) CI runs these checks on PR
- GitHub Actions runs the same npm wrappers and fails fast.

## Commands + expected output + exit codes

> Filled after running checks (local Windows-friendly).

### 1) Inline styles guardrail
Command:
- `cmd /c "cd frontend && npm run check:inline-styles"`

Output:
```text

> frontend@0.0.0 check:inline-styles
> node scripts/check-no-inline-styles.mjs

PASS: no inline styles found. Scope: src/pages/PublicCard.jsx, src/components/card/CardRenderer.jsx, src/templates/TemplateRenderer.jsx, src/templates/layout, src/templates/skins, src/templates/seed, src/components/editor/EditorPreview.jsx, src/components/editor/panels/DesignPanel.jsx. Base: .
```
Exit code:
- `0`

### 2) Skins token-only guardrail
Command:
- `cmd /c "cd frontend && npm run check:skins"`

Output:
```text

> frontend@0.0.0 check:skins
> node scripts/check-skins-token-only.mjs

PASS: skins are token-only. Scanned 3 files.
- src\templates\skins\_base\SkinBase.module.css
- src\templates\skins\beauty\BeautySkin.module.css
- src\templates\skins\custom\CustomSkin.module.css
```
Exit code:
- `0`

### 3) Template contract guardrail
Command:
- `cmd /c "cd frontend && npm run check:contract"`

Output:
```text

> frontend@0.0.0 check:contract
> node scripts/check-template-contract.mjs

PASS: template contracts are consistent.
- Registry templates: 6
- CustomV1 palettes: gold, ocean, forest
```
Exit code:
- `0`
