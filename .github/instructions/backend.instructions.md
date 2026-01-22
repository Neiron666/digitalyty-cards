# backend.instructions.md

# Backend Instructions (Node/Express/Mongo) — Digitalyty Cards

You are working on the backend of Digitalyty Cards (monorepo: backend/ + frontend/).

## Core Principles (Non-Negotiable)

- Preserve API contracts. Changes must be backward compatible unless explicitly approved.
- Security first: validate inputs, prevent injection, avoid leaking existence (anti-enumeration).
- Keep DB writes bounded and predictable. No unbounded user-controlled growth in documents.
- Prefer additive schema evolution and additive responses.

## Architecture & Ownership

- Keep controllers thin; move business rules/normalization into:
    - `backend/src/utils/*` (normalization, URL shaping, safe key logic)
    - helpers/services for larger domains (billing/entitlements/analytics).
- Always shape outbound objects via DTOs; never leak internal/admin-only fields on non-admin routes.

## Data Safety / Injection Prevention (Critical)

- Any user-controlled key used in Mongo path updates (`$inc`, `$set`, map paths) MUST be sanitized:
    - Disallow `.`, `$`, null bytes, path traversal tokens, and any unsafe separators.
    - Use centralized `safeKey()` / `safeCompositeKey()` with strict allowlist behavior.
- For “source buckets” and similar dimensions: normalize + allowlist. Unknown → `other` or `null`.

## Bounded Aggregates (Critical)

- Any user-controlled high-cardinality dimensions MUST be bounded:
    - Use write-time caps without heavy reads whenever possible.
    - Use overflow bucket keys (e.g., `other_campaign`, `other_referrer`).
    - Avoid read-before-write in hot paths.

## Analytics Invariants

- `POST /api/analytics/track`:
    - ALWAYS return `204`.
    - Best-effort, write-only.
    - Must NOT reveal card existence.
- Aggregations (`/analytics/sources`, etc.):
    - New fields must be additive.
    - Tier shaping rules: premium can get richer data; basic limited; demo may return synthetic premium-shaped data without “guessing” correlations.

## Card Contract Discipline (FAQ included)

- Card schema changes must be:
    - Backward compatible.
    - Reflected in DTO shaping.
    - Reflected in PATCH allowlist (explicit allowlist; no “patch everything”).
- FAQ storage:
    - Treat FAQ as structured content (e.g., items with q/a), validate length/types, normalize whitespace.
    - Never allow HTML injection fields to go out “raw”; if you store rich text, define a safe sanitization strategy and clearly document where HTML is allowed.

## Validation

- Validate request payloads (body/query/params) consistently.
- Normalize UTM fields/referrers consistently.
- Treat unknown values as `null` or fold into allowlisted “other”.

## Performance / DB Practices

- Avoid read-before-write in hot paths unless explicitly approved.
- Use indexed queries; avoid heavy aggregation pipelines unless necessary.
- Keep documents bounded to prevent growth impacting reads/storage.

## Error Handling & Logging

- Centralized error middleware.
- No stack traces in production responses.
- Log enough context for debugging, but never sensitive data (tokens, secrets, PII beyond necessity).

## Output / QA Expectations (When you implement backend changes)

- Summarize files changed and why (file list + rationale).
- Provide manual QA steps:
    - Example curl/HTTP calls with expected status codes and key fields.
    - Confirm invariants (e.g., analytics track remains 204, anti-enumeration preserved).
- Git-команды запрещены: не выполнять и не предлагать git restore/checkout/add/commit/push и т.п. Любые Git-действия делает пользователь вручную.
