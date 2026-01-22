# frontend.instructions.md

# Frontend Instructions (React/Vite/CSS Modules) — Digitalyty Cards

You are working on the frontend of Digitalyty Cards (Vite + React + CSS Modules), RTL-first.

## Non-Negotiable Guardrails (Project Law)

### Styling

- CSS Modules ONLY.
- NO inline styles.
- No “style” props, no dynamic inline layout.
- Skins are token-only:
    - Allowed: CSS variables `--*` inside `.theme` / `.palette*`.
    - Forbidden: structural CSS (layout, backgrounds with `url()`, `background:` shorthand, images, positioning hacks).
- Preview-only differences MUST be ancestor-scoped:
    - Only under `[data-preview="phone"] ...`.
    - Do not alter public typography/tokens globally for preview.

### Layout / DOM Stability

- Single canonical render chain (SSoT) for public + preview:
    - `TemplateRenderer → CardLayout → Sections`.
- DO NOT fork public vs preview rendering with separate DOM.
- DO NOT change CardLayout DOM skeleton unless an explicit migration phase with PROOF (file:line) and rationale.

### Template Registry

- Templates are registered only in `frontend/src/templates/templates.config.js`.
- No “magic comparisons” of templateId scattered across the app.

### Required Gates (Run after meaningful changes)

- `npm.cmd run check:inline-styles`
- `npm.cmd run check:skins`
- `npm.cmd run check:contract`
- `npm.cmd run build --if-present`

## RTL & Layout Discipline

- RTL-first (Hebrew) must remain correct.
- Prefer CSS logical properties:
    - `margin-inline`, `padding-inline`, `inset-inline`, `border-inline`, etc.
- Avoid hard left/right unless unavoidable; document exceptions.

## SEO / Head Management (Helmet + canonical + JSON-LD)

- Head tags are controlled through `react-helmet-async`.
- JSON-LD scripts MUST be rendered in Helmet using string children:
    - ✅ `<script type="application/ld+json">{JSON.stringify(obj)}</script>`
    - ❌ do not rely on `dangerouslySetInnerHTML` for Helmet JSON-LD insertion.
- Canonical must be absolute when `VITE_PUBLIC_ORIGIN` is available:
    - Use a single resolver/normalizer helper (SSoT) for canonical.
    - Canonical link is rendered 1:1 from the canonicalUrl prop; do not post-process in SeoHelmet.
- DevTools verification rule:
    - Check `link.getAttribute("href")` (attribute), not `link.href` (browser-normalized property).

## Data & URL Handling

- Use shared helpers for converting relative asset paths to absolute URLs.
- Avoid duplicating URL resolution logic per template/section.
- Keep card rendering tolerant to old data shapes (backward compatibility).

## Accessibility (Baseline)

- Provide `:focus-visible` styles for interactive elements.
- Ensure contrast is acceptable for buttons/text (skins adjust tokens, not structure).
- Modal/dialog behavior:
    - Use correct ARIA (`role="dialog"`, `aria-modal="true"` where relevant).
    - Keyboard support (Esc/Arrows) only when open.
    - Clean up listeners on close/unmount.
    - Restore focus to the opener when closing.

## Performance

- Avoid heavy CSS (no `background-attachment: fixed`, minimize global blur, avoid huge shadows).
- Lazy-load non-critical images; keep rendering lightweight.
- Prevent unnecessary renders:
    - Memoize derived lists
    - Keep handlers stable where meaningful
- Do not add extra API calls unless explicitly approved.

## Editor / State Safety

- Preserve existing form behavior and validation unless explicitly requested.
- When refactoring UI (tabs/panels), do not reset card state on tab changes.
- Keep field paths consistent across editor and renderer.

## Output / QA Expectations (When you implement frontend changes)

- Summarize files changed and why (file list + rationale).
- Provide a manual QA checklist:
    - Desktop + mobile breakpoints
    - RTL correctness
    - Empty states (no gallery/faq/etc.)
    - No horizontal scroll
    - No console errors
    - Gates PASS + build PASS
- Git-команды запрещены: не выполнять и не предлагать git restore/checkout/add/commit/push и т.п. Любые Git-действия делает пользователь вручную.
