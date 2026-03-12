# Frontend Markup & Styling Policy — Cardigo

Canonical governance for frontend markup, semantic HTML, accessibility, styling architecture, and CSS discipline across all Cardigo app surfaces.

Cards have a separate styling contour (`[data-cardigo-scope="card"]`) and are governed by `docs/cards-styling-architecture.md`. This document covers **app-shell, marketing, admin, auth, and all non-card frontend surfaces**. When a task touches both app and card surfaces, both this document and the cards architecture doc apply.

---

## 1. Scope

This policy applies to:

- All app/marketing/admin/auth frontend surfaces.
- All React markup work.
- All CSS Modules styling work outside card-skin internals.

If a task touches cards, this doc works together with `docs/cards-styling-architecture.md`.

---

## 2. Mandatory Pre-Read for Frontend Work

Before any frontend markup or styling task, read:

1. `.github/instructions/frontend.instructions.md`
2. `docs/policies/frontend-markup-styling.md` (this file)
3. `docs/typography-ssot.md`
4. `docs/policies/typography-mobile-first.md`

If the task touches cards, also read:

5. `docs/cards-styling-architecture.md`

---

## 3. DOM and Landmark Rules

- **Exactly one `<main>` landmark per page/route view.** No nested `<main>`.
- Use `<header>`, `<nav>`, `<main>`, `<footer>` as canonical page landmarks.
- All page-level content must live inside `<main>`.
- **Maximum one `<h1>` per rendered page/route state.**
- Headings must follow logical hierarchy (`h1` → `h2` → `h3` …). Never skip levels for styling.
- Headings must not be used purely for visual sizing — use CSS tokens instead.
- `<section>` only for thematically grouped content that has its own heading or `aria-labelledby`. Use `<div>` when there is no real section semantics.
- `<article>` only for self-contained, independently meaningful content.
- Repeated homogeneous items should use list semantics (`<ul>`/`<ol>` → `<li>`).
- `<nav>` only for real navigation groups.
- Form groups should use `<fieldset>`/`<legend>` when semantically grouped.

---

## 4. Interaction Semantics

- **Links (`<a>`) navigate.** Buttons (`<button>`) perform actions. Never conflate.
- Never use `<div>`/`<span>` as fake interactive controls.
- Icon-only interactive controls must have an accessible name (`aria-label`, visually hidden text, or `title`).
- External links handling must remain explicit and safe (e.g., `rel="noopener noreferrer"` when appropriate).

---

## 5. Forms and Validation Accessibility

- Every `<input>`, `<select>`, `<textarea>` **must** have an associated `<label>`.
- **Placeholder is not a label.** Never rely on placeholder alone for field identification.
- Prefer explicit `htmlFor`/`id` association over implicit wrapping.
- Helper/error text should be connected via `aria-describedby` when present.
- Dynamic validation and server errors should use `aria-live` or `role="alert"` as appropriate.
- Required and invalid states must be represented semantically (`aria-required`, `aria-invalid`).
- Avoid placing navigation links inside `<label>` unless there is a very strong documented reason.

---

## 6. Images, Media, and Motion

- Informative images need meaningful `alt` text.
- Decorative images must use `alt=""`.
- Use `width`/`height` attributes or `aspect-ratio` strategy to prevent CLS.
- Animation must be restrained and purposeful.
- Prefer `transform`/`opacity` over layout-thrashing properties for animation.
- **`prefers-reduced-motion` must be respected** for all non-essential motion.
- Infinite motion is allowed only when extremely subtle and disableable.

---

## 7. Styling Architecture

- **Canonical app-global styling SSoT:**
  `main.jsx` → `styles/globals.css` → `@import variables.module.css`
- Global app styling holds app-wide reset, base rules, color tokens, and typography foundations.
- Page/component CSS Modules add only local layout, spacing, and visual behavior.
- Do not create parallel global style sources for app-shell without architectural approval.
- Local component-scoped CSS custom properties are allowed only for local geometry/behavior — never as new shared design tokens.
- Always reuse existing tokens, components, and patterns before introducing new ones.

---

## 8. App vs Card Styling Boundary

- App shell and public/admin/auth/marketing surfaces use app-global styling doctrine (this document).
- Cards are a separate styling contour under `[data-cardigo-scope="card"]`.
- Card boundary depends on `CardLayout.module.css` token boundary + skin/theme token layer.
- App styling rules must not be assumed to apply inside cards unless explicitly documented.
- Card-related styling changes must respect `docs/cards-styling-architecture.md`.
- Changes to the shared card boundary (CardLayout DOM, token schema) are **architectural changes**, not casual page styling edits.

---

## 9. Typography Doctrine

- Components must consume `font-size` **only** via `var(--fs-*)`.
- App-side `--fs-*` values are **rem-only**.
- No literal `font-size` values in app CSS Modules.
- Forbidden for `font-size`: `px`, `em`, `%`, `vw`, `vh`, `clamp()`, fluid typescale, `calc(non-rem)`.
- App typography and card typography are separate scopes and must not be conflated.

Full policy: `docs/typography-ssot.md`, `docs/policies/typography-mobile-first.md`.

---

## 10. CSS Modules + BEM-Style Naming Discipline

- CSS Modules are the canonical isolation mechanism for all component styling.
- Inside CSS Modules, use BEM-style naming where helpful: `block`, `block__element`, `block--modifier`.
- Class names must be predictable and component-oriented.
- Avoid vague names (`box`, `wrap2`, `itemA`). Prefer semantic/component naming aligned with DOM role.

---

## 11. Layout and Responsiveness Discipline

- **Mobile-first mandatory.** Base styles target narrowest viewport; widen with `min-width` media queries.
- **Flex only — no CSS Grid.** (Project-wide hard ban.)
- Avoid unnecessary wrapper `<div>` elements.
- Keep DOM shallow and meaningful.
- Preserve shared spacing rhythm and container discipline.
- Do not solve layout with one-off hacks if an existing pattern, token, or component already exists.

---

## 12. Definition of Done for Frontend Markup/Styling Changes

1. Check instruction files first.
2. Follow doctrine before coding.
3. If a change affects a contract, invariant, or policy — update docs accordingly.
4. Do not introduce new styling patterns when an existing canonical pattern already exists.
5. Run frontend gates after meaningful changes (`check:inline-styles`, `check:skins`, `check:contract`, `build`).

---

## 13. Anti-Patterns / Forbidden Shortcuts

- Inline styles (`style=`, `style={{}}`)
- CSS Grid (`display: grid`, `grid-*`)
- Fake buttons / `<div>` click handlers as interactive controls
- Multiple `<h1>` on one rendered page state
- Placeholder-only forms (no `<label>`)
- Heading tags used only for visual size
- Ad-hoc global CSS for page-specific needs
- Introducing shared design tokens locally without architectural approval

---

END.
