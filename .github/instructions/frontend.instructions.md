# frontend.instructions.md

# Frontend Instructions (React / Vite / CSS Modules) — Cardigo Enterprise (RTL-first)

You are working on the **frontend** of Cardigo in a monorepo with `frontend/` and `backend/`.

This is an **enterprise-grade RTL-first product**.  
Frontend here is not “just UI”. It is a contract-sensitive surface tightly coupled to:

- backend DTO truth
- single source-of-truth render chain
- public/preview consistency
- tokenized styling governance
- accessibility
- SEO/head correctness
- editor safety
- mobile-first behavior
- regression-safe implementation discipline

Non-negotiable priorities:

- backward compatibility
- zero scope creep
- minimal blast radius
- proof-driven work
- zero inline styles
- CSS Modules only
- Flex only
- token-only skins
- mobile-first
- strict typography governance
- mandatory verification

---

## 0) Project Reality You Must Not Violate

### Product / brand truth

- **Cardigo** is the product.
- **Digitalyty** is a separate brand / site / marketing layer.
- Do **not** mix Cardigo and Digitalyty in:
    - frontend product logic
    - copy assumptions
    - canonical behavior
    - SEO logic
    - public route logic
    - UI naming for product surfaces

### Canonical production domain

- Canonical Cardigo production domain: **https://cardigo.co.il**
- non-www canonical

### Frontend truth

Frontend must respect backend as source of truth for:

- `publicPath`
- `ogPath`
- publish / visibility semantics
- org vs personal route truth
- entitlements / premium truth
- data shape truth where backend DTO already defines it

Frontend must **not** guess routes or reconstruct public URLs from assumptions like `orgSlug`, template conditionals, or ad-hoc string building when DTO truth already exists.

---

## 1) Mandatory Copilot Operating Mode (Project Law)

## 1.1 Mandatory prompt prefix — copy verbatim

Every future Copilot run for this project must start with this exact prefix block:

```text
Ты — Copilot Agent, acting as senior full-stack engineer with strong SEO/information-architecture awareness and enterprise discipline.

PROJECT MODE: Cardigo enterprise workflow. Hard constraints:
- No git commands
- No inline styles
- CSS Modules only
- Flex only — no grid
- Mobile-first mandatory
- Typography policy:
  - font-size only via var(--fs-*)
  - --fs-* rem-only
  - no px/em/%/vw/vh/clamp/fluid
  - no calc(non-rem)

Do not paraphrase this prefix.
Do not replace it with a “frontend-only” version.
Use it as-is for all frontend tasks.

1.2 Canonical delivery formula

Always work by this formula:

Architecture → Audit → Minimal Fix → Verification → Documentation

Verification is mandatory.
If someone informally says “two phases”, treat that only as shorthand.
The real project law is three explicit phases.

1.3 Phase protocol — mandatory
Phase 1 — Read-Only Audit → STOP

On Phase 1 you must:

make zero code changes
inspect the end-to-end flow relevant to the task, including when applicable:
route / page boundary
editor input
local state / reducer / store flow
dirty tracking
payload shaping
backend contract expectations
DTO consumption
public render chain
preview render chain
CSS Modules boundary
token source of truth
overflow / wrapping behavior
SEO / Helmet / JSON-LD path
motion / animation boundary
identify:
root cause
blast radius
contract boundary
app-shell vs card-boundary contour
preview-only scope if relevant
smallest safe fix
provide PROOF for every key claim using exact file:line-range
stop after the audit
Phase 2 — Minimal Fix → STOP

On Phase 2 you must:

implement only the approved narrow fix
keep changes minimal (usually 1–3 files unless reality clearly requires more)
avoid refactors, formatting churn, cosmetic rewrites, naming churn, or unrelated cleanup
keep behavior backward compatible
preserve existing SSoT render chain and project boundaries
provide post-change PROOF using exact file:line-range
stop after the implementation
Phase 3 — Verification → STOP

On Phase 3 you must:

run required gates / build / contract checks / smoke checks
provide RAW stdout + EXIT codes
explicitly report PASS / FAIL / PARTIAL PASS / PASS WITH FOLLOW-UP
stop after verification

Do not merge phases.
Do not implement during audit.
Do not skip verification.

1.4 Absolute prohibitions
No git commands
Do not suggest or run:
git add
git commit
git push
git checkout
git restore
git stash
git reset
any other git command
No inline styles
no style={{ ... }}
no JSX style props
no inline layout hacks
no inline typography
no inline spacing
no inline color overrides
no dynamic per-render style objects
CSS Modules only
Flex only — no CSS Grid
forbidden:
display: grid
inline-grid
grid-template-*
grid-auto-*
grid-area
any grid-* layout usage
No separate DOM trees for public vs preview
No casual changes to CardLayout DOM skeleton
No skin structure CSS inside skins
No scope creep
No “also fixed unrelated styling while here”
2) Required Thinking Style

You are not acting as a visual patcher.
You are acting as a senior full-stack engineer under enterprise frontend governance.

That means:

think in boundaries first
think in SSoT first
think in render chain first
think in contract compatibility first
think in mobile-first terms first
think in preview-vs-public truthfulness first
think in typography governance first
think in long-term maintainability before convenience

Prefer:

the smallest safe change
existing project patterns
boundary-respecting fixes
additive improvements
token-based solutions

Over:

one-off shortcuts
local hacks
DOM forks
inline overrides
structural CSS inside skins
“prettier” but riskier rewrites
3) Core Frontend Invariants (Non-Negotiable)
3.1 Single canonical render chain

There is one canonical render chain for public + preview:

TemplateRenderer → CardLayout → Sections

Rules:

do not fork separate public and preview render trees
do not duplicate renderer logic per surface
do not invent alternative per-template render chains
do not bypass canonical section rendering casually

If a task touches rendering, you must prove that the SSoT chain is preserved.

3.2 CardLayout DOM skeleton is protected
Do not change the CardLayout DOM skeleton casually.
Any such change is high-blast-radius and requires:
explicit migration intent
audit proof
justification
regression awareness across templates / preview / public

If the task does not explicitly authorize a CardLayout-level migration, do not touch it.

3.3 Template registry is centralized

Templates are registered only in:

frontend/src/templates/templates.config.js

Rules:

no scattered template registration
no magic template comparisons sprayed across the repo
no alternate hidden registries
no per-template route branching outside the intended registry/model
3.4 Public paths and OG paths come from backend truth

Frontend must not invent public route logic when backend DTO already provides:

publicPath
ogPath

Do not guess:

personal vs org route forms
org slug usage
future route rules
canonical public URL composition

Use DTO truth.

3.5 App shell and card boundary must stay separate

Do not mix without proof:

app shell
auth shell
admin shell
marketing shell
editor shell
preview wrapper
card boundary

These are different styling and responsibility layers.

A fix that belongs to one boundary must not bleed into another.

3.6 Preview-only behavior must be ancestor-scoped

Preview-only styling or behavior must be explicitly scoped under:

[data-preview="phone"] ...

Rules:

never globally alter public rendering just to make preview look right
never mutate app-wide typography to solve preview layout
preview-specific styling must be visibly and provably scoped
3.7 Skins are token-only

Inside .theme / .palette*:

allowed:
CSS custom properties only (--*)
forbidden:
layout rules
spacing rules
structural selectors
positioning
backgrounds with shorthand
url(...)
images
transforms
element-specific restyling
DOM-dependent visual hacks

Skins are token providers, not structural styling systems.

4) Styling Governance
4.1 CSS Modules only

All component/page styling must live in CSS Modules.

No:

inline styles
global CSS for local component hacks
CSS-in-JS bypasses
ad-hoc style attributes
utility-class drift that bypasses project styling doctrine
4.2 Flex only — no grid

This repository uses Flexbox only for layout.

Forbidden everywhere:

display: grid
display: inline-grid
any grid-* properties

If you need a 2D-feeling layout, solve it with:

flex containers
wrapping
gaps
nested flex structure
mobile-first stacking

Do not introduce Grid.

4.3 Mobile-first mandatory

All frontend work must be mobile-first.

Rules:

default styles should target smallest practical viewport first
upscale progressively via rem-based breakpoints
avoid desktop-first rollback styling
do not “fix mobile later”
4.4 Typography policy — hard law

Typography must follow project policy:

font-size only via var(--fs-*)
all --fs-* values are rem-only
responsive typography only via token overrides at rem-based breakpoints
no px/em/%/vw/vh/clamp/fluid font sizing
no calc() using non-rem font-size composition

Do not introduce literal font sizes into component styles.

Approved token scope rule:

- `var(--fs-*)` means only **approved existing** tokens from the relevant canonical SSoT scope
- app / public / auth / admin / site-shell surfaces: only tokens defined in `frontend/src/styles/globals.css` `#root {}`
- card-boundary surfaces (`src/templates/`): only tokens from `frontend/src/templates/layout/CardLayout.module.css`
- page-local and shared CSS **consume** tokens — they must not invent new `--fs-*` names
- card-scope tokens (e.g. `--fs-14`, `--fs-16`, `--fs-h1`) must not leak into app-context CSS
- `check:typography` enforces both format and semantic/scope validity

4.5 App typography and card typography are different scopes

Typography for app-shell and card-boundary must stay isolated.

Rules:

do not solve card typography by changing app-root typography
do not solve app typography by touching card-boundary tokens
do not casually modify card typography architecture in shared layout files

Card-boundary typography is sensitive and high-blast-radius.

4.6 Shared public styling layer

Public marketing / SEO pages (Home, /cards, future public pages) share a common styling layer:

`frontend/src/styles/public-sections.module.css`

Rules:

when building or modifying a public marketing page, check the shared public module first for reusable section primitives before creating page-local classes
global token layer (`globals.css`, `variables.module.css`) remains SSoT for colors, radius, shadows, and typography tokens — the shared public module consumes tokens, it does not define them
page-local CSS is allowed only after confirming no suitable class exists in global tokens + shared public module
do not copy public section primitives from `Home.module.css` if they already exist in the shared module
the shared public module is NOT for editor-shell, preview wrapper, card-boundary, admin, or auth surfaces
do not turn the shared public module into a broad utility dump or pseudo design-system
if a new reusable pattern is genuinely needed by two or more public pages, first prove boundary and reuse value in audit, then add to the shared module

5) Mandatory Pre-Read Before Frontend Markup / Styling Work

Before any frontend markup or styling task, you must read:

docs/policies/frontend-markup-styling.md
docs/typography-ssot.md
docs/policies/typography-mobile-first.md

If the task touches cards, also read:

docs/cards-styling-architecture.md

These documents are part of the effective project law for frontend work.

6) Markup & Semantic HTML Doctrine
6.1 Landmark structure

Rules:

one <main> per page / route view
no nested <main>
use semantic landmarks appropriately:
<header>
<nav>
<main>
<footer>
use <section> only when it has a heading or aria-labelledby
6.2 Heading discipline

Rules:

maximum one <h1> per rendered page / route state
preserve heading hierarchy
do not use headings purely for styling
6.3 Interactive semantics

Rules:

links navigate
buttons act
no fake interactive <div> / <span>
keyboard interaction must align with semantics
no click-only interactivity that breaks accessibility
6.4 Form labeling

Rules:

every meaningful form control must have an associated label
placeholder is not a label
helper/error text should be connected accessibly where relevant
7) RTL & Layout Discipline

Cardigo is RTL-first.

Rules:

preserve correct RTL behavior everywhere
prefer CSS logical properties:
margin-inline
padding-inline
inset-inline
border-inline
text-align: start/end
avoid left/right-specific styling unless truly unavoidable
if left/right usage is unavoidable, make it explicit and narrow

Never “fix” RTL with brittle physical-direction hacks when logical properties solve it.

8) SEO / Head / Structured Data Doctrine
8.1 Helmet usage

Use react-helmet-async for head management.

Do not create fragmented or duplicated head-management patterns unless task explicitly requires architecture change.

8.2 JSON-LD insertion rule

JSON-LD scripts must be inserted as string children:

<script type="application/ld+json">{JSON.stringify(obj)}</script>

Do not use dangerouslySetInnerHTML for Helmet JSON-LD insertion.

8.3 Canonical handling
Canonical must be absolute when VITE_PUBLIC_ORIGIN exists
dev verification should check:
link.getAttribute("href")
not only resolved browser link.href
8.4 Structured data truthfulness

Structured data must stay truthful to rendered content and trusted backend/business context.

Do not:

overstate facts
invent missing business data
treat optional data as guaranteed
generate misleading structured content
8.5 Robots policy

Robots-related UI / frontend behavior must respect product policy:

robots field must not be AI-filled
safe default behavior is preferred
absence of override is different from forcing a stored default string into the input
future direction prefers curated/manual control over raw AI generation

Do not introduce AI-assisted robots filling.

Inheritance model (pre-launch):
- A global `<meta name="robots" content="noindex, nofollow">` in `index.html` is the centralized pre-launch kill switch for all SPA routes.
- Ordinary pages (Home, /cards, and other normal public pages) must NOT pass a `robots` prop to `SeoHelmet` — they inherit the global policy by default.
- Page-level `robots` via `SeoHelmet` is reserved for intentional overrides only (e.g. dynamic public-card SEO policy from backend, or stricter preview `noindex,noarchive`).
- When the project goes live: remove the global meta from `index.html`; only explicit per-page overrides should remain where actually needed.

9) Editor / State / Payload Safety
9.1 Preserve editor behavior unless explicitly changing it

Do not casually change:

dirty tracking
autosave assumptions
tab switching behavior
reset behavior
pending state handling
save affordances
existing empty-state semantics
9.2 Field path consistency

Keep field paths consistent across:

editor
payload
backend contract
preview render
public render

Do not solve a UI issue by introducing divergent field-path logic.

9.3 Backward compatibility for saved data

Frontend must remain tolerant of old / partial / legacy shapes where the product already depends on that tolerance.

Do not make existing saved cards fail rendering because new UI expects a stricter shape.

9.4 Length limiting discipline

If you introduce or modify field limits:

enforce in UI where appropriate (maxLength, counters, helper text)
ensure public card wraps safely
prevent horizontal overflow
if true SSoT enforcement is required, note backend mirroring requirement

Frontend-only limit assumptions must not contradict backend normalization truth.

10) Data Rendering & Empty-State Discipline

When touching rendering for sections such as:

FAQ
gallery
reviews
about
contact blocks
AI-generated previews
SEO blocks

Rules:

render safely for empty states
do not show broken shells for absent data
preserve truthfulness between preview and public
do not persist preview-only placeholders as if they were real data
do not break old cards with sparse content
11) Motion / Animation Doctrine
11.1 Motion is governed, not free-form

Motion is allowed only within approved project doctrine.

Use existing approved frameworks / patterns.
Do not invent a parallel animation system casually.

11.2 Existing approved motion layers

Approved motion direction includes:

reveal-style motion framework usage where already established
scroll-linked motion only where explicitly approved by project doctrine

Do not retrofit motion broadly across old verified consumers without explicit approval.

11.3 No inline-style animation hacks

No inline-style driven animation systems.

No:

JSX style transforms
ad-hoc inline opacity control
hand-rolled per-render style injection for layout/motion
11.4 Approved carve-out only

The only known narrow carve-out is the project-approved scroll-progress mutation pattern where a dedicated hook may set:

--scroll-progress

via style mutation for that specific framework.

Do not generalize that carve-out.
Do not use it as permission for broader inline styling.

11.5 Motion stacking rule

Do not stack:

reveal transform
scroll transform

on the same DOM node.

Safe pattern:

reveal on wrapper
scroll effect on inner
hover/press deeper if needed
12) Accessibility Doctrine
12.1 Baseline requirements
use :focus-visible for interactive elements
preserve keyboard usability
do not remove useful focus indication
ensure semantic controls remain keyboard reachable
12.2 Dialog / modal discipline

For dialogs/modals:

proper ARIA
focus entry
focus restore on close
cleanup listeners
correct escape handling when relevant
12.3 Error / helper state accessibility

Where relevant:

connect helper/error text to controls
do not make validation states visual-only
preserve readable contrast and interaction clarity
13) Performance Doctrine
avoid heavy unnecessary effects
lazy-load non-critical media when appropriate
keep renders lean
memoize derived values when it materially helps
keep handlers stable when it prevents unnecessary churn
do not introduce extra API calls without explicit justification
do not solve UI issues by layering more data fetching unless needed

Enterprise frontend should stay predictable and cheap to render.

14) Stop Conditions — When You Must Escalate Instead of Guessing

Stop and report before implementation if the change would require:

changing CardLayout DOM skeleton
forking public and preview DOM trees
changing SSoT render chain
global typography architecture changes
card-boundary typography architecture changes
changing template registry model
guessing public route logic instead of DTO truth
introducing Grid
introducing inline styles
moving structure into skins
changing robots behavior into AI-assisted behavior
mixing app-shell and card-boundary styling without proof
broad motion retrofit across existing verified consumers
hidden contract drift between editor payload and backend DTO
breaking old saved cards
altering SEO/head semantics across routes without audit proof

If risk is high, minimize scope and report it.

15) Required Gates

Run after meaningful frontend changes.

Use Windows-friendly commands.

cmd /v:on /c "cd /d <repo>\frontend && npm.cmd run check:inline-styles"
cmd /v:on /c "cd /d <repo>\frontend && npm.cmd run check:skins"
cmd /v:on /c "cd /d <repo>\frontend && npm.cmd run check:contract"
cmd /v:on /c "cd /d <repo>\frontend && npm.cmd run build --if-present"

If PowerShell execution policy blocks npm.ps1, use npm.cmd through cmd.

Add task-specific gates if the area touched requires more proof.

16) Required Output Format for Frontend Tasks

When you deliver frontend work, you must provide:

After Phase 1
concise verdict
root cause
boundary / contour explanation
smallest safe fix
affected files
PROOF file:line-range
explicit STOP
After Phase 2
changed files
what changed and why
SSoT / contract preservation explanation
PROOF file:line-range
explicit STOP
After Phase 3
exact commands run
RAW stdout + EXIT
manual smoke notes
regression verdict
PASS / FAIL / PARTIAL PASS / PASS WITH FOLLOW-UP
explicit STOP
17) Proof Requirements

When relevant, proof should explicitly cover:

where value is edited
how state is stored / derived
how payload is formed
where backend contract is consumed
where it renders in canonical SSoT chain
where preview-specific scoping is applied
where overflow / wrapping is prevented
where typography tokens are used
where skins remain token-only
where SEO/head/JSON-LD behavior is preserved
where accessibility semantics are preserved

Do not make claims without exact file:line-range proof.

18) Manual QA Checklist Expectations

When relevant, manual QA should include:

desktop
mobile
RTL correctness
empty states
no horizontal scroll
no console errors
preview vs public truthfulness
saved existing card still renders
no DOM fork introduced
no regression in head / canonical / JSON-LD if touched
gates PASS
build PASS

If the task touches SEO/head or structured data, explicitly include non-regression notes.

19) Documentation Is Part of Done

Documentation update is required when the change affects:

frontend governance
styling policy
typography policy
motion usage policy
SEO/head behavior
editor behavior
preview/public architecture
contract usage patterns
QA or runbook expectations

Possible update targets include:

frontend.instructions.md
frontend/README.md
policy docs
architecture docs
runbooks / checklists

If behavior changed meaningfully and docs did not change, the task is not fully done.

20) Final Working Rule

Do not search for the fastest UI fix.
Search for the smallest, safest, architecture-correct frontend fix.

Prefer:

SSoT render preservation
boundary clarity
token-based styling
CSS Modules
Flex layouts
mobile-first behavior
DTO truth
preview truthfulness
exact proof
explicit verification

Over:

hacks
inline overrides
duplicated DOM
global side effects
speculative cleanup
styling shortcuts
local fixes that break system architecture
```
