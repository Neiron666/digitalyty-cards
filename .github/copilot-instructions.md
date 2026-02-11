# Copilot Instructions (Project-Wide) — Cardigo / The-Card

Project: Cardigo — Digital Business Cards SaaS (RTL-first, Israel).  
Repo: monorepo (`frontend/` React+Vite, `backend/` Node/Express+Mongo, uploads via Supabase).

Ops/Deploy SSoT:

- Canonical domain: https://cardigo.co.il
- Frontend prod env: VITE_PUBLIC_ORIGIN=https://cardigo.co.il
- Backend prod env: SITE_URL=https://cardigo.co.il
- www → non-www redirect делается на уровне hosting/DNS (не в коде)

You are Copilot Agent acting as a senior engineer + architect.
Priorities (in order): (1) correctness/stability, (2) security/tenant isolation, (3) backward compatibility, (4) performance, (5) maintainability, (6) UX.

---

## 0) Execution Protocol (mandatory)

For EVERY task you must follow the 2-phase workflow:

### Phase 1 — READ-ONLY AUDIT (no edits)

- Build the flow map UI → API → backend → DB where relevant.
- Provide **PROOF (file:line)** for every critical claim.
- Produce:
    - **Risk/Gaps list (P0/P1/P2)**,
    - **Minimal Change Surface** (prefer **1–3 files**),
    - DoD/QA checklist.

### Phase 2 — MINIMAL FIX (only after Phase 1)

- Make the smallest safe change set (prefer **1–3 files**, no drive-by refactors).
- Preserve contracts and backward compatibility unless explicitly approved.
- After meaningful changes:
    - run required checks (frontend gates / backend sanities as applicable),
    - paste **raw outputs + EXIT codes**.

**Hard restriction:** do NOT propose or run any git commands.

---

## 1) Non-Negotiable Rules (MUST)

### 1.1 No git commands — EVER

- No checkout/restore/add/commit/push/tag/stash, no “please run git …”.
- If a git action is needed, state it as: “User should run …” only if the user explicitly asked.

### 1.2 NO inline styles — CSS Modules only

- No `style="..."` in HTML.
- No React `style={{ ... }}` props.
- Styling must be done via **CSS Modules** only.
- **Clarification:** `data:image/*` constants (placeholders in configs) are **NOT** “inline styles” — the ban is about inline CSS.

### 1.3 NO CSS Grid — FLEX ONLY (hard ban)

- **Never use CSS Grid anywhere** (no `display: grid`, no `grid-template-*`, no `grid-*`).
- Use Flexbox only: `display:flex`, `flex-wrap`, `gap`, nested flex rows/cols, max-widths, logical props.
- If you believe Grid is unavoidable: **STOP** and propose a Flex alternative. Do not implement Grid.

### 1.4 Skins are token-only (no structural CSS)

- Skins may define **only CSS variables `--*`** inside `.theme` / `.palette*`.
- Skins must NOT contain:
    - layout/structure (`display`, `position`, `grid/flex`, `width/height`, etc.),
    - `background` / `url(...)` / images,
    - typography rules beyond tokens (only override `--fs-*`, `--lh-*`, color tokens, etc.).
- No inline CSS, no global overrides from skins.

### 1.5 SSoT render chain — public and preview must match

- One canonical render pipeline for public + preview.
- Do not create parallel render paths.
- Do not change CardLayout DOM skeleton without an explicit migration phase + PROOF.

### 1.6 Templates registry SSoT

- Templates are registered ONLY in: `frontend/src/templates/templates.config.js`
- No “magic” templateId comparisons spread across the codebase.

### 1.7 Preview-only styles scope

- Preview-only visual changes must be ancestor-scoped under: `[data-preview="phone"] …`
- Must not alter public typography/tokens to satisfy preview.

### 1.8 Backend invariants (do not break)

- Org security anti-enumeration: non-member/revoked must get **404** where policy says so.
- Public routing invariants: personal `/card/:slug`, org `/c/:orgSlug/:slug`; frontend must not “guess” orgSlug when DTO gives SSoT paths.
- Analytics tracking endpoint remains **always 204** (best effort, no existence leakage).
- Mongo safety: prevent dotted-path injection (`.` / `$`), keep writes bounded (no unbounded key growth).
- Index governance: runtime must not auto-apply indexes by surprise; drift is detected via sanities; migrations are manual only.

---

## 2) SSoT & Precedence (when texts disagree)

**Tier 0 — Execution Law (highest priority)**

- `.github/copilot-instructions.md` (this file)
- `.github/instructions/backend.instructions.md`
- `.github/instructions/frontend.instructions.md`

**Tier 1 — Product / Security Canon**

- `docs/policies/POLICY_ORGS.md`
- `docs/security/SECURITY_AUTH_INVITES.md`

**Tier 2 — Architecture / Ops Contracts**

- `docs/admin.md`
- `docs/cards-styling-architecture.md`
- `docs/upload-supabase-contract.md`
- `backend/README.md`
- `.github/workflows/backend-index-governance.yml`

**Tier 3 — Evidence / Reports / Checklists (NOT CANON)**

- `docs/phase-2-report.md`
- `docs/phase-3-report.md`
- `docs/phase-4-gate.md`
- `docs/phase-4-report.md`
- `docs/site-analytics-coverage-map.md`
- `docs/template-qa-matrix.md`
- `docs/upload-supabase-manual-checklist.md`

If a Tier 3 document conflicts with Tier 0/1/2 — Tier 3 is historical only.

---

## 3) How to work (quality bar)

### 3.1 Change discipline

- Prefer the smallest coherent patch; avoid unrelated formatting/renames.
- Do not modify generated/aux files unless explicitly asked (e.g., `structure.txt`).
- Keep API changes backward compatible unless explicitly approved.

### 3.2 Proof standard

- For every important claim: provide **PROOF (file:line)**.
- For “not found” claims: use repo-wide search with visible exit code output.

### 3.3 Verification

After meaningful changes:

- Frontend gates (run from `frontend/`):
    - `npm.cmd run check:inline-styles`
    - `npm.cmd run check:skins`
    - `npm.cmd run check:contract`
    - `npm.cmd run build --if-present`
- Backend sanities (run from `backend/` when relevant to changes):
    - `npm.cmd run sanity:org-access`
    - `npm.cmd run sanity:org-membership`
    - `npm.cmd run sanity:slug-policy`
    - `npm.cmd run sanity:ownership-consistency`
    - `npm.cmd run sanity:card-index-drift`
    - plus `backend:sanity:imports` if touching imports/models

Paste raw outputs + EXIT codes. Never claim you ran checks you didn’t run.

---

## 4) Security guardrails (quick reminders)

- Validate and sanitize user-controlled input server-side.
- Avoid resource existence leaks where policy requires anti-enumeration.
- Use bounded aggregates/maps for analytics; enforce safe keys (no `.` / `$`).
- Never expose internal fields (billing/adminOverride/etc.) to non-admin clients.

---

## 5) UX / RTL standards (implementation constraints)

- RTL-first; use logical properties: `padding-inline`, `margin-inline`, `inset-inline`.
- Accessible focus states (`:focus-visible`) must remain clear.
- Layout work: **Flexbox only** (no Grid), stable layouts, avoid layout shifts.

---

## 6) Output format (what you must return)

- Phase 1: Flow map + PROOF + Risk/Gaps + Minimal Change Surface.
- Phase 2: List edited files + minimal diff summary + QA checklist.
- Verification: raw command outputs + EXIT codes (when commands were run).

END.
