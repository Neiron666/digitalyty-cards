# frontend.instructions.md

# Frontend Instructions (React/Vite/CSS Modules) — Cardigo (Enterprise, RTL-first)

You are working on the frontend of Cardigo (Vite + React + CSS Modules), RTL-first.
This product has strict guardrails: SSoT render chain, token-only skins, and zero inline CSS.

---

## 0) Copilot Execution Protocol (Project Law)

### Mandatory prompt header (EVERY Copilot run)

First line MUST be:
"Ты — Copilot Agent, acting as senior frontend engineer with пониманием backend контракта."

### Two-phase workflow (mandatory)

**Phase 1 — READ-ONLY AUDIT**

- No code changes.
- Map the flow end-to-end:
    - editor input → state → dirty tracking → payload
    - backend contract expectations (shape)
    - renderer chain (public + preview)
    - CSS Modules / existing overflow rules
    - JSON-LD & Helmet constraints (if relevant)
- Provide **PROOF** via **file:line ranges** for every key statement.
- Identify the minimal change set.

**Phase 2 — MINIMAL FIX**

- Pinpoint changes only; prevent churn/spread.
- No refactors, no unrelated formatting, no new architecture.
- Keep behavior backward compatible.
- After changes: PROOF (file:line) + gates.

### Absolute prohibitions

- **NO git commands** (do not suggest, do not run): no checkout/restore/add/commit/push/tag/stash.
- **NO inline styles**:
    - no `style=...`, no `style` props
    - no “dynamic layout via inline”
- Skins must remain token-only (no structure CSS inside skins).
- Do not fork public vs preview rendering with separate DOM.
- Do not change CardLayout DOM skeleton unless explicitly approved migration phase with PROOF.

* FLEX ONLY (hard rule): CSS Grid is forbidden anywhere in this repo. Use Flexbox layouts only (no `display: grid`, no `grid-*` properties).

---

## 1) Non-Negotiable Guardrails

### Styling

- CSS Modules ONLY.
- NO inline styles.
- Skins are token-only:
    - allowed: CSS variables `--*` inside `.theme` / `.palette*`
    - forbidden: structural CSS, positioning hacks, `background:` shorthand, `url()`, images, layout rules
- Preview-only differences MUST be ancestor-scoped:
    - only under `[data-preview="phone"] ...`
    - never change public typography/tokens globally for preview

### Layout / DOM Stability

- Single canonical render chain (SSoT) for public + preview:
    - `TemplateRenderer → CardLayout → Sections`
- DO NOT create alternative render trees for preview/public.
- DO NOT change CardLayout skeleton unless explicit migration phase with rationale + PROOF.

### Template Registry

- Templates registered only in `frontend/src/templates/templates.config.js`.
- No scattered templateId “magic comparisons”.

---

## 2) Required Gates (Run after meaningful changes)

Run (Windows):

- `cmd /v:on /c "cd /d <repo>\frontend && npm.cmd run check:inline-styles"`
- `cmd /v:on /c "cd /d <repo>\frontend && npm.cmd run check:skins"`
- `cmd /v:on /c "cd /d <repo>\frontend && npm.cmd run check:contract"`
- `cmd /v:on /c "cd /d <repo>\frontend && npm.cmd run build --if-present"`

If PowerShell execution policy blocks npm.ps1, use `npm.cmd` via `cmd`.

---

## 3) RTL & Layout Discipline

- RTL-first must remain correct.
- Prefer CSS logical properties:
    - `margin-inline`, `padding-inline`, `inset-inline`, `border-inline`, etc.
- Avoid left/right unless unavoidable; document exceptions.

---

## 4) SEO / Head Management (Helmet + canonical + JSON-LD)

- Use `react-helmet-async`.
- JSON-LD scripts MUST be inserted as string children:
    - ✅ `<script type="application/ld+json">{JSON.stringify(obj)}</script>`
    - ❌ do not use `dangerouslySetInnerHTML` for Helmet JSON-LD insertion
- Canonical must be absolute when `VITE_PUBLIC_ORIGIN` exists.
- DevTools verification:
    - check `link.getAttribute("href")`, not `link.href`.

Enterprise caution:

- Any work near FAQ/FAQPage JSON-LD must include explicit non-regression checks.

---

## 5) Data & Backward Compatibility

- Keep rendering tolerant to old data shapes.
- Do not break existing saved cards.
- Avoid duplicating URL resolution logic per template/section; use shared helpers.

---

## 6) Accessibility (Baseline)

- `:focus-visible` for interactive elements.
- Keyboard support where appropriate (Esc/Arrows only when relevant).
- Modal/dialog: correct ARIA + cleanup listeners + restore focus.

---

## 7) Performance

- Avoid heavy CSS effects.
- Lazy-load non-critical images.
- Prevent unnecessary renders: memoize derived lists, keep handlers stable when meaningful.
- No extra API calls unless approved.

---

## 8) Editor / State Safety

- Preserve existing form behavior unless explicitly requested.
- Do not reset card state on tab changes.
- Keep field paths consistent across editor and renderer.
- If limiting lengths:
    - enforce in UI (maxLength + counter)
    - enforce safe wrap in public card (no horizontal overflow)
    - optionally mirror in backend normalization for true SSoT.

---

## 9) Output Requirements (When implementing frontend changes)

- List changed files + rationale.
- Provide PROOF (file:line ranges) for:
    - where value is edited
    - how payload is formed
    - where it renders (SSoT chain)
    - CSS rules preventing overflow
    - preview-only scoping when used
- Provide manual QA checklist:
    - desktop + mobile
    - RTL correctness
    - empty states (no faq/gallery/reviews)
    - no horizontal scroll
    - no console errors
    - gates PASS + build PASS
- **No git commands.**
