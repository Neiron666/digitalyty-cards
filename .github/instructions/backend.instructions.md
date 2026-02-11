# backend.instructions.md

# Backend Instructions (Node/Express/Mongo) — Cardigo (Enterprise)

You are working on the backend of Cardigo (monorepo: backend/ + frontend/).
This is an enterprise-grade product: stability, backward compatibility, security, and bounded writes are non-negotiable.

---

## 0) Copilot Execution Protocol (Project Law)

### Mandatory prompt header (EVERY Copilot run)

First line MUST be:
"Ты — Copilot Agent, acting as senior frontend engineer with пониманием backend контракта."

(Yes, even for backend tasks — it enforces the same discipline and contract awareness.)

### Two-phase workflow (mandatory)

**Phase 1 — READ-ONLY AUDIT**

- Do not change any code.
- Enumerate relevant call sites, schemas, DTO shaping, normalization, allowlists, update logic.
- Provide **PROOF** for every key claim using **file:line ranges** (exact).
- Identify the smallest safe fix with the least blast radius.

**Phase 2 — MINIMAL FIX**

- Implement only pinpoint changes required to satisfy acceptance criteria.
- Prevent “spread”: no refactors, no formatting churn, no unrelated cleanup.
- Keep API contract backward compatible unless explicitly approved.
- After changes: provide PROOF (file:line), then run sanity checks.
- Release sanity gates are documented in `backend/README.md` (SSoT).

### Absolute prohibitions

- **NO git commands** (do not suggest, do not run): no checkout/restore/add/commit/push/tag/stash etc.
- No “background work” promises. Act only on current scope.
- No breaking changes without explicit approval.

### Verification discipline

- Always keep and mention invariants: status codes, anti-enumeration, runValidators, allowlists, DTO output, bounded storage.
- Prefer **cmd-based** commands on Windows (e.g., `npm.cmd`, `node --input-type=module ...`).

---

## 1) Core Principles (Non-Negotiable)

- Preserve API contracts. Backward compatible changes only, unless explicitly approved.
- Security first: validate inputs, prevent injection, avoid leaking existence (anti-enumeration).
- Keep DB writes bounded and predictable (no unbounded user-controlled growth).
- Prefer additive schema evolution and additive responses.
- Defense-in-depth: validate on input, normalize on write, shape on output.

---

## 2) Architecture & Ownership

- Controllers stay thin; move rules into:
    - `backend/src/utils/*` (normalization, safe keys, URL shaping, caps)
    - domain helpers/services (billing/entitlements/analytics) when logic grows.
- Always shape outbound objects via DTOs; never leak internal/admin-only fields on non-admin routes.
- Centralize constraints as SSoT constants in utils and mirror them in schema validators.

---

## 3) PATCH Discipline & Mongo Update Safety (Critical)

### Explicit allowlist only

- PATCH must accept only allowlisted top-level keys.
- No “patch everything”.

### Dot-path risk (null parent objects)

- The project uses dot-walk style `$set` building (nested objects become paths like `faq.items`).
- **MongoDB cannot `$set` `foo.bar` if `foo` is `null`.**
- Enterprise fix pattern:
    - For nested objects that may be `null` (e.g., `faq`, `business`, `content` segments):
        - Normalize/merge on server.
        - Then **atomically set the whole object**: `$set: { foo: normalizedFoo }`
        - And remove `foo.*` dot-path entries to avoid conflicts.

### runValidators / setters

- Preserve `runValidators: true` on updates.
- If relying on schema setters/normalizers, ensure update path uses `runSettersOnQuery` as intended.
- Prefer normalization in controller before `$set` for critical invariants.

---

## 4) Data Safety / Injection Prevention (Critical)

- Any user-controlled key used in Mongo path updates (`$inc`, `$set`, map paths) MUST be sanitized:
    - Disallow `.`, `$`, null bytes, path traversal tokens, and unsafe separators.
    - Use centralized `safeKey()` / `safeCompositeKey()` with strict allowlist behavior.
- For high-cardinality “dimensions” (sources/UTM/etc.): normalize + allowlist; unknown → `other`/`null`.

---

## 5) Bounded Aggregates (Critical)

- Any user-controlled high-cardinality dimensions MUST be bounded:
    - Prefer write-time caps without heavy reads.
    - Use overflow buckets (`other_*`).
    - Avoid read-before-write in hot paths unless explicitly approved.

---

## 6) Normalization Rules (Enterprise SSoT)

- All “user copy” fields must be normalized on write:
    - trim whitespace
    - collapse obviously-invalid values to `""` or `null` consistently
    - enforce max lengths with truncation (tolerant) or 422 (strict) — choose intentionally.
- Collections must be bounded:
    - enforce max length in util (SSoT) + schema validator (defense-in-depth).
- For structured sections (FAQ, Reviews, etc.):
    - accept legacy shapes if necessary
    - normalize to canonical shape
    - store only valid items (e.g., FAQ requires both q and a non-empty)
    - never persist empty placeholders

---

## 7) Analytics Invariants

- `POST /api/analytics/track`:
    - ALWAYS `204`
    - best-effort write-only
    - must NOT reveal card existence
- Aggregations must be additive; tier shaping rules must be preserved.

---

## 8) Validation, Error Handling & Logging

- Validate request payloads (body/query/params) consistently.
- No stack traces in production responses.
- Log enough for debugging, never sensitive data (tokens/secrets/PII beyond necessity).

---

## 9) Output Requirements (When implementing backend changes)

- List changed files + rationale.
- Provide PROOF (file:line ranges) for:
    - contract preservation
    - allowlist behavior
    - normalization/caps/validators
    - atomic `$set` rules (if applied)
- Provide manual QA steps (curl / DevTools expectations).
- Provide sanity commands using Windows-friendly invocations:
    - `node --input-type=module -e "await import('...'); console.log('OK')"`
    - `npm.cmd run dev` / project-specific tasks
- **No git commands.**
