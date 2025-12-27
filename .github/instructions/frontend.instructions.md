# Frontend Instructions (React/Vite/CSS Modules)

You are working on the frontend of Digitalyty Cards / The-Card.

## Non-Negotiable Styling Rules

-   CSS Modules ONLY.
-   NO inline styles in components.
    -   Exception: if truly unavoidable, inline style may only set CSS custom properties (`--var`) and must be minimal and documented.
-   Do not edit shared CSS Modules of sections when creating template-specific skins.
    -   Template/skin styles must live inside the template/skin module and be scoped via wrapper classes.

## RTL & Layout

-   RTL-first (Hebrew) must remain correct.
-   Use CSS logical properties:
    -   `margin-inline`, `padding-inline`, `inset-inline`, `border-inline`, etc.
-   Avoid hardcoding left/right unless necessary; prefer logical alternatives.

## Template System (Layout + Skins)

Goal: One shared layout that defines DOM placement + hooks, with skins providing visuals only.

-   Shared layout: `CardLayout` (or equivalent) defines section order, hero placement, socials placement, CTA, sections, footer.
-   Skins:
    -   Provide token overrides (e.g., `--hero-gradient`, typography, radii, borders).
    -   Must NOT override hero background composition directly via `background:` shorthand.
-   Do not change section DOM structure unless explicitly approved.

## Performance

-   Avoid heavy CSS: no `background-attachment: fixed`, avoid global blur, minimize large shadows.
-   Lazy-load gallery images; keep rendering lightweight.
-   Prevent unnecessary renders:
    -   Memoize derived rows/tables.
    -   Keep handlers stable when meaningful.
-   Do not add extra API calls unless explicitly approved.

## Accessibility

-   Add clear `:focus-visible` styling for interactive elements.
-   Ensure adequate contrast for text and buttons.
-   Provide sensible empty states for missing data (no gallery/reviews/etc.).

## State & Data Handling

-   Preserve existing form behavior, validation rules, and conditional section rendering unless asked.
-   When refactoring UI (tabs/panels), do not reset card state on tab changes.
-   Use consistent field paths for design values across editor and renderer.

## Networking / URL Handling

-   Use shared helpers for converting relative asset paths to absolute URLs.
-   Avoid duplicating URL resolution logic per template.

## Output / QA

When you implement frontend changes:

-   Summarize files changed and why.
-   Provide a manual QA checklist:
    -   Desktop + mobile breakpoints
    -   RTL correctness
    -   Empty-state behavior
    -   No horizontal scroll
    -   No console errors
