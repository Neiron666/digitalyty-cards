# Phase 4 Gate (Legacy cleanup — NO deletions in Phase 3)

Phase 4 intent:
- Remove legacy/unreachable template code *only after* Phase 3 is PASS.
- This document is a candidate list + deletion criteria.

## Non-negotiable rule
- NO deletions in Phase 3.

## Deletion criteria (Phase 4)
- Phase 3 PASS in CI and locally.
- Re-audit reachability (grep + runtime smoke).
- Confirm no imports from production render chain and editor preview chain.
- If unsure, keep the file.

## Reachability baseline (current canonical chain)
- Public: `PublicCard.jsx → CardRenderer.jsx → TemplateRenderer.jsx → CardLayout.jsx`
- Editor preview: `EditorPreview.jsx → CardRenderer.jsx → TemplateRenderer.jsx → CardLayout.jsx`

## Legacy candidates (to re-audit before deletion)

Notes:
- Current grep scan did not find imports/usages of these candidates from `frontend/src/**`.
- This is still NOT deletion approval; re-audit before removing anything.

- `frontend/src/templates/beauty/` (legacy template implementation)
- `frontend/src/templates/classic/` (legacy template implementation)
- `frontend/src/templates/minimal/` (legacy template implementation)
- `frontend/src/templates/TemplateResolver.jsx` (appears unreferenced)
- `frontend/public/templates/beauty-v1/` (no references found; confirm at runtime)

