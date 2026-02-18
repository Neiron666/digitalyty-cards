# Typography SSoT (Corporate Policy)

This document defines the **single source of truth (SSoT)** rules for typography across Cardigo, with a hard requirement that **card typography is isolated** from app/admin/editor typography.

Scope:

- Defines the corporate policy (MUST / MUST NOT)
- Defines **two independent value contexts** (App vs Card) using the **same token schema**
- Defines the **Card Typography Boundary** contract and how skins/preview interact with it
- Defines a phased migration playbook and gate/check plan

Non-goals:

- This doc does not prescribe visual design.
- This doc does not require a specific template/skin look.

---

## 1) Corporate Typography Policy

### 1.1 MUST

- **All `font-size` must be token-driven**: `font-size: var(--fs-*)`.
- **All `--fs-*` token values must be rem-only**.
- **Responsive typography must be achieved only via token overrides** in approved SSoT layers.
- **Cards must be hard isolated**: app typography changes must not affect card typography.

### 1.2 MUST NOT

- No `px`, `em`, `%`, `vw`, `vh` in `font-size` values.
- No fluid typography: no `clamp()` for `font-size` or `--fs-*` token definitions.
- No viewport-driven typography inside cards.
- No ad-hoc component-level font sizes outside the SSoT contract.

Notes:

- The policy is about **font-size**. Other properties (layout, transforms, etc.) have their own governance.

---

## 2) Two Contexts, One Token Schema

We use **one shared token schema** (same token names everywhere) but we have **two independent value contexts**:

1. **App Typography Context**

- Scoped under an app root container (not `:root`).
- Used by marketing pages, admin, editor chrome, UI kit.

2. **Card Typography Context (Card Typography Boundary)**

- Scoped under the card boundary root: `[data-cardigo-scope="card"]`.
- Used by all public cards and editor previews.

### 2.1 Why two contexts

- Prevents accidental global typography changes (admin/editor/marketing) from changing public cards.
- Makes the card renderer stable and tenant-safe across product evolution.

---

## 3) Card Typography Boundary Contract

### 3.1 Boundary requirements

The card boundary root **MUST**:

- Define the canonical card typography tokens (`--fs-*`, `--lh-*`, `--fw-*`, `--ls-*`, `--font-family`).
- Provide semantic aliases for components (`--fs-base`, `--fs-h1`, `--fs-h2`, `--fs-h3`).
- Keep back-compat tokens only as aliases (deprecated), never as the primary source.

### 3.2 What card components are allowed to do

Card components **MUST**:

- Consume tokens only: `font-size: var(--fs-...)`.

Card components **MUST NOT**:

- Use literal values: `font-size: 16px` / `1rem` / `clamp(...)`.

### 3.3 Preview-only visual changes

Preview-only typography/layout differences (editor phone frame) must be:

- Scoped under the preview ancestor marker: `[data-preview="phone"] …`
- Container-driven (phone container width), not viewport-driven
- Never leaking into public pages

---

## 4) Token Schema (Canonical)

### 4.1 Required typography tokens

**Font families**

- `--font-family`
- `--font-family-mono`

**Font weights**

- `--fw-regular`, `--fw-medium`, `--fw-semibold`, `--fw-bold`, `--fw-extrabold`

**Line heights**

- `--lh-tight`, `--lh-normal`, `--lh-relaxed`

**Letter spacing**

- `--ls-tight`, `--ls-normal`, `--ls-wide`

**Font-size scale**

- `--fs-scale` (supporting token; skins may override)
- Primitive sizes: `--fs-10`, `--fs-11`, `--fs-12`, `--fs-13`, `--fs-14`, `--fs-15`, `--fs-16`, `--fs-18`, `--fs-20`, `--fs-24`, `--fs-28`, `--fs-32`

**Semantic font-size tokens**

- `--fs-base`
- `--fs-h1`, `--fs-h2`, `--fs-h3`

### 4.2 Deprecated legacy tokens

Keep only as aliases (back-compat), and plan removal:

- `--text-h1`, `--text-h2`, `--text-h3`, `--text-h4`

---

## 5) Skins Policy (Token-Only)

Skins:

- MUST only define CSS variables (`--*`) under `.theme` / `.palette*`.
- MUST NOT include structure/layout rules in skins (no `display`, `position`, `width/height`, etc.).

Typography-specific rule:

- Skins may override only token values (e.g. `--fs-scale`, `--fs-h1`).
- Skins must not introduce `px` in typography token values.

---

## 6) Responsive Typography Policy

### 6.1 Approved breakpoints

- Use **1–2 breakpoints max** for typography token overrides.
- Breakpoints must be **rem-based** (example only):
    - `@media (min-width: 64rem)`
    - `@media (min-width: 90rem)`

### 6.2 Where responsive overrides are allowed

- **Card context:** override typography tokens only at the card boundary.
- **App context:** override typography tokens only at the app root container.

---

## 7) Migration Playbook (Phased)

M0 — Inventory

- Produce a complete violations registry (file:line → violation type → surface).

M1 — Define canonical card tokens

- Replace any fluid/clamp/vw `--fs-*` definitions with rem-only values.

M2 — Replace component literals

- Replace `font-size: *px` and `font-size: clamp(...)` with `var(--fs-*)` usages.

M3 — Align skins

- Ensure skins only override tokens with rem-only values.
- Convert typography breakpoints from px to rem and reduce to 1–2.

M4 — Add gates

- Add a CI check that enforces this policy (see §8).

M5 — Deprecation cleanup

- Remove/stop using `--text-h*` aliases once consumers are migrated.

---

## 8) Checks / Gates Plan (No New Gates Yet)

Existing checks already present in the repo:

- `npm.cmd run check:inline-styles`
- `npm.cmd run check:skins`
- `npm.cmd run check:contract`

### 8.1 Checks & Enforcement

Typography governance checks (report-only by default):

- `npm.cmd run check:typography`
    - Scans `frontend/src/**/*.css` and validates only:
        - `font-size` does not use `px/em/%/vw/vh`
        - `font-size` does not use `clamp(...)`
        - `font-size` does not use `calc(...)` with any non-rem units
        - `font-size` does not contain `px` fallbacks inside `var(...)` (e.g. `var(--fs-*, 12px)`)
        - `--fs-*` token definitions do not contain `px/em/%/vw/vh/clamp` or `calc(non-rem)`

- `npm.cmd run check:typography:boundary`
    - Reports missing canonical card boundary typography tokens to keep the card value-context self-contained.

Strict mode:

- By default these checks are **report-only** and exit with code **0** even if violations are found.
- If `TYPO_STRICT=1` is set, any violation/missing token causes exit code **1**.

Planned (future) typography gate:

- Scan `frontend/src/**/*.css` for:
    - `font-size:` not using `var(--fs-` (CARD and APP contexts separately)
    - disallowed units in `font-size` (`px`, `em`, `%`, `vw`, `vh`)
    - any `clamp(` in `font-size` or `--fs-*` token definitions
    - `@media` typography rules using px breakpoints (must be rem)

---

## 9) Definition of Done / QA Checklist

- All card `font-size` declarations consume `var(--fs-*)`.
- All `--fs-*` token values in card context are rem-only.
- No `clamp()` for font-size tokens or usage.
- Skins remain token-only (passes `check:skins`).
- Template contract checks still pass (`check:contract`).
- Preview-only tweaks remain scoped under `[data-preview="phone"]`.
