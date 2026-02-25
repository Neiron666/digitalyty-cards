# Cardigo (Cardigo / The-Card)

Cardigo is a Digital Business Cards SaaS (RTL-first, Israel).

Monorepo:

- `frontend/` — React + Vite (CSS Modules)
- `backend/` — Node/Express + MongoDB

## Engineering Policies (must-read)

Before making any changes, read and follow our corporate standards:

- **Typography & Mobile-First Policy (ENFORCED):** `docs/policies/typography-mobile-first.md`
- [Runbook: SEO & Scripts (GTM / GA4 / Meta Pixel)](docs/runbooks/seo-scripts.md)
- [Runbook: Backend Verification & Deploy (Render + Windows)](docs/runbooks/backend-verification-and-deploy.md)

Hard constraints (non-negotiable):

- **Mobile-first:** base styles target small screens; responsive changes only via `@media (min-width: …rem)`.
- **Typography token-only:** components/pages must use `font-size: var(--fs-*)` only.
- **Rem-only tokens:** `--fs-*` values live in a single SSoT layer and must be **rem-only** (no `px/em/%/vw/vh/clamp` and no `calc(...)` with non-rem units).
- **No inline styles:** no `style=...` and no React `style={{...}}`.
- **CSS Modules only.**
- **Flex only:** no CSS Grid (`display: grid` / `grid-*`).
- **Copilot phased protocol:** Phase 1 (read-only audit + PROOF) → Phase 2 (minimal fix) → Phase 3 (verification).
- After meaningful changes, run gates and keep raw logs + `EXIT:<code>` when relevant:
    - `check:inline-styles`, `check:skins`, `check:contract`, `check:typography`, `check:typography:boundary`, `build --if-present`

If your change conflicts with the policy, stop and escalate to the Project Architect.
