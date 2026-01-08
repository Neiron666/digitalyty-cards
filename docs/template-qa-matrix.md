# Template QA Matrix (Manual)

Scope: templates + editor preview surfaces.

## Preconditions

-   Ensure you have at least one card with:
    -   A user-selected cover image ("תמונת רקע")
    -   A non-empty avatar
    -   A mix of long/short text values
-   Test both LTR and RTL (RTL-first expectation).

## Matrix

Run each scenario in:

-   Editor Preview (in Edit Card)
-   Public Card View (shared/public URL)

For each template:

### Base (default)

-   Cover image visible in hero
-   Hero gradient visible on top of cover
-   Overlay opacity changes reflect `design.backgroundOverlay` (0–70 in 5% steps)
-   No mixed-content warning when site is HTTPS and uploads are served over HTTP
-   Switching away and back to the template does not overwrite user content after initial seed

Evidence (Phase 2)

-   Editor Preview screenshots:
    -   `docs/assets/phase2/base-editor-hero.png` (hero with cover)
    -   `docs/assets/phase2/base-editor-body.png` (body section)
-   Public screenshots:
    -   `docs/assets/phase2/base-public-hero.png` (hero with cover)
    -   `docs/assets/phase2/base-public-body.png` (body section)
-   Console warnings (Editor / Public):
    -   Editor:
    -   Public:

Results (Phase 2)

-   Header upload cover → hero shows cover (Editor Preview): PASS (confirmed)
-   Header upload cover → hero shows cover (Public): PASS (confirmed)
-   Mixed-content blocks/warnings (must be none): PASS (confirmed)
-   Overlay discrete mapping verified at 0 / 35 / 70: PASS (confirmed)
-   Template switch Base ↔ CustomV1 does not overwrite user content after initial seeding:
-   CTA/Social buttons (all interactive elements) use tokens and color consistently: FIXED (re-verify)
-   Console warning `design:1 Uncaught (in promise) Error: A listener indicated...`: check Incognito (likely extension noise)

### CustomV1 (Palette)

-   Palette selector changes theme (Gold/Ocean/Forest) without breaking layout
-   Palette persists after refresh (saved `design.customPaletteKey`)
-   Cover + gradient + overlay all remain visible
-   No inline styles added by palette changes (class-based only)

Evidence (Phase 2)

-   Editor Preview screenshots:
    -   `docs/assets/phase2/customv1-editor-hero.png` (hero with cover)
    -   `docs/assets/phase2/customv1-editor-body.png` (body section)
-   Public screenshots:
    -   `docs/assets/phase2/customv1-public-hero.png` (hero with cover)
    -   `docs/assets/phase2/customv1-public-body.png` (body section)
-   Console warnings (Editor / Public):
    -   Editor:
    -   Public:

Results (Phase 2)

-   Header upload cover → hero shows cover (Editor Preview): PASS (confirmed)
-   Header upload cover → hero shows cover (Public): PASS (confirmed)
-   Overlay discrete mapping verified at 0 / 35 / 70: PASS (confirmed)
-   Palette changes persist after refresh (saved `design.customPaletteKey`): FIXED (re-verify)
-   Palette changes do not affect DOM structure/order:
-   Template switch Base ↔ CustomV1 does not overwrite user content after initial seeding:
-   CTA/Social buttons (all interactive elements) use tokens and color consistently: FIXED (re-verify)
-   Console warning `design:1 Uncaught (in promise) Error: A listener indicated...`: check Incognito (likely extension noise)

## Regression Checks

-   Existing templates still render via the shared layout without crashing
-   Image URLs resolve correctly for:
    -   Absolute URLs
    -   `/uploads/...` URLs

## Guardrail

Run:

-   Deterministic on Windows from repo root (no PowerShell policy dependencies):
    -   `cmd /c "cd frontend && node scripts/check-no-inline-styles.mjs"`
-   From `frontend/`:
    -   `node scripts/check-no-inline-styles.mjs`

Notes:

-   Default scan scope is limited to the template + editor preview surfaces touched by this PR.
-   You can pass additional directories/files to scan, e.g. `node scripts/check-no-inline-styles.mjs src/components/editor`.

Expected:

-   The script exits with code 0 and prints a PASS/FAIL summary.
