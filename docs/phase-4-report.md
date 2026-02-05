# Phase 4A Report (Reachability proof-only)

> **HISTORICAL / REPORT NOT CANON.** Git-evidence here is historical and not an execution rule.
> Canonical execution law: [.github/copilot-instructions.md](../.github/copilot-instructions.md), [.github/instructions/backend.instructions.md](../.github/instructions/backend.instructions.md), [.github/instructions/frontend.instructions.md](../.github/instructions/frontend.instructions.md).

Date: 2026-01-08

Scope (hard constraints):

- Read-only audit only.
- No deletions/moves/refactors.
- Evidence must be Windows-safe `git` commands (no pipes).
- Exit code interpretation: `0 = found`, `1 = not found`, `255 = invalid/run failed` (not used as evidence).

## Repo root proof

Command:

- `git rev-parse --show-toplevel`

Result:

- Output: `C:/Users/User/Desktop/Visit-me/Projects/Digitalyty-card-app/digitalyty-cards`
- Exit: `0`

## Reachability table

| Candidate                                     |          Status | Evidence (commands + results)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Notes                                                                                                                                                                               |
| --------------------------------------------- | --------------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend/src/templates/beauty/`              |   **uncertain** | 1) `git ls-files frontend/src/templates/beauty` → _(no output)_, Exit `0`<br/>2) `git status --porcelain frontend/src/templates/beauty` → `?? frontend/src/templates/beauty/`, Exit `0`<br/>3) `git grep -n "BeautyTemplate" -- frontend/src` → _(no output)_, Exit `1`<br/>4) `git grep -n "BeautySkin" -- frontend/src` → _(no output)_, Exit `1`                                                                                                                                                                                                                                                                    | Directory exists in working tree but is **untracked** (so it cannot be deleted in a git PR). Treat as hold/cleanup outside Phase 4B (or add to ignore) unless explicitly requested. |
| `frontend/src/templates/classic/`             | **unreachable** | 1) `git ls-files frontend/src/templates/classic` → `frontend/src/templates/classic/ClassicTemplate.jsx` + `ClassicTemplate.module.css`, Exit `0`<br/>2) `git grep -n "ClassicTemplate" -- frontend/src` → matches only inside `frontend/src/templates/classic/ClassicTemplate.jsx:16` and `:31`, Exit `0`<br/>3) `git grep -n "ClassicTemplate" -- frontend/src/app/router.jsx frontend/src/pages/PublicCard.jsx frontend/src/pages/EditCard.jsx frontend/src/components/editor/EditorPreview.jsx frontend/src/components/card/CardRenderer.jsx frontend/src/templates/TemplateRenderer.jsx` → _(no output)_, Exit `1` | Pattern appears only in the template’s own files; no references from router/public/editor-preview/render chain entrypoints.                                                         |
| `frontend/src/templates/minimal/`             | **unreachable** | 1) `git ls-files frontend/src/templates/minimal` → `frontend/src/templates/minimal/MinimalTemplate.jsx` + `MinimalTemplate.module.css`, Exit `0`<br/>2) `git grep -n "MinimalTemplate" -- frontend/src` → matches only inside `frontend/src/templates/minimal/MinimalTemplate.jsx:11` and `:26`, Exit `0`<br/>3) `git grep -n "MinimalTemplate" -- frontend/src/app/router.jsx frontend/src/pages/PublicCard.jsx frontend/src/pages/EditCard.jsx frontend/src/components/editor/EditorPreview.jsx frontend/src/components/card/CardRenderer.jsx frontend/src/templates/TemplateRenderer.jsx` → _(no output)_, Exit `1` | Pattern appears only in the template’s own files; no references from router/public/editor-preview/render chain entrypoints.                                                         |
| `frontend/src/templates/TemplateResolver.jsx` | **unreachable** | 1) `git ls-files frontend/src/templates/TemplateResolver.jsx` → `frontend/src/templates/TemplateResolver.jsx`, Exit `0`<br/>2) `git grep -n "TemplateResolver" -- frontend/src` → matches only inside `frontend/src/templates/TemplateResolver.jsx:12` and `:39`, Exit `0`<br/>3) `git grep -n "TemplateResolver" -- frontend/src/app/router.jsx frontend/src/pages/PublicCard.jsx frontend/src/pages/EditCard.jsx frontend/src/components/editor/EditorPreview.jsx frontend/src/components/card/CardRenderer.jsx frontend/src/templates/TemplateRenderer.jsx` → _(no output)_, Exit `1`                               | Not referenced by canonical render chains; appears to be a legacy resolver using numeric `card.templateId` and Template1..10 imports.                                               |
| `frontend/public/templates/beauty-v1/`        | **unreachable** | 1) `git ls-files frontend/public/templates/beauty-v1` → _(no output)_, Exit `0`<br/>2) `git grep -n "beauty-v1" -- frontend` → _(no output)_, Exit `1`<br/>3) `git grep -n "public/templates" -- frontend/src frontend/public` → _(no output)_, Exit `1`<br/>4) `git grep -n "templates/" -- frontend/src/templates frontend/public` → _(no output)_, Exit `1`                                                                                                                                                                                                                                                         | No tracked files under this path and no references from registry/seed/template code. (Nothing to delete unless this folder appears later.)                                          |

## Deletion set (safe)

If we proceed to Phase 4B (delete-only PR), the following are safe candidates based on the proofs above:

- `frontend/src/templates/classic/`
- `frontend/src/templates/minimal/`
- `frontend/src/templates/TemplateResolver.jsx`

## Hold set (uncertain)

Do not delete in Phase 4B:

- `frontend/src/templates/beauty/` (untracked in git; requires separate decision/process)

## Registry/seed/public link sanity (supporting proofs)

Commands:

- `git grep -n "public/templates" -- frontend/src frontend/public` → Exit `1` (no references)
- `git grep -n "templates/" -- frontend/src/templates frontend/public` → Exit `1` (no references)

Interpretation:

- Registry / seeding code does not reference `frontend/public/templates/**` via static string matches, including the `beauty-v1` candidate.
