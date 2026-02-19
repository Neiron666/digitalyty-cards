# React + Vite

## Engineering Policies (must-read)

Before making any changes, read and follow our corporate standards:

- **Typography & Mobile-First Policy (ENFORCED):** `docs/policies/typography-mobile-first.md`

Key rules (non-negotiable):

- **Mobile-first**: base styles for small screens; responsive changes only via `@media (min-width: …rem)`.
- **Typography token-only**: components/pages must use `font-size: var(--fs-*)` only.
- **Rem-only tokens**: `--fs-*` values are defined in a single SSoT layer and must be **rem-only** (no `px/em/%/vw/vh/clamp`).
- **Hard constraints**: No git commands (by Copilot). No inline styles. CSS Modules only. Flex only (no CSS Grid).
- After meaningful changes, run gates: `check:inline-styles`, `check:skins`, `check:contract`, `check:typography`, `check:typography:boundary`, `build --if-present` and keep raw logs + `EXIT:<code>`.

If your change conflicts with the policy, stop and escalate to the Project Architect.

## Requirements

- Node.js >= 22.12 (recommended)
    - Vite dev server requires 22.12+ on Node 22.x (older patch versions may warn or fail).

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
