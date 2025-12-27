# Backend Instructions (Node/Express/Mongo)

You are working on the backend of Digitalyty Cards / The-Card.

## Core Principles

-   Preserve API contracts; changes must be backward compatible unless explicitly approved.
-   Security first: validate inputs, prevent injection, avoid leaking existence.
-   Keep DB writes bounded and predictable; no unbounded map growth.

## Architecture & Code Organization

-   Prefer small utilities in `backend/src/utils/*` for normalization and safe-key logic.
-   Use DTO shaping when returning card objects; do not leak internal fields to non-admin clients.
-   Avoid controller bloat: extract helpers for business rules (billing/entitlements/analytics).

## Data Safety / Injection Prevention

-   Any key used in Mongo `$inc` or map paths MUST be safe:
    -   Disallow `.`, `$`, and any path traversal tokens.
    -   Use a centralized `safeKey()`/`safeCompositeKey()` with strict rules.
-   For source buckets, only allow canonical allowlisted values (e.g., normalizeSocialSource + allowlist).

## Bounded Aggregates (Critical)

-   Any user-controlled high-cardinality dimension (utm_campaign, utm_content, referrers, etc.) MUST be bounded:
    -   Prefer write-time caps without heavy reads.
    -   Use overflow bucket keys (e.g., `other_campaign`).
    -   Use global counters (e.g., keyCount) if you need write-time gating without reads.

## Analytics Invariants

-   `POST /api/analytics/track`:
    -   ALWAYS return `204`.
    -   Must remain best-effort and write-only.
    -   Must not reveal card existence (anti-enumeration).
-   Aggregations (`/analytics/sources` etc.):
    -   New fields must be additive.
    -   Tier shaping: premium gets richer fields; basic gets limited fields; demo may return synthetic premium-shaped data without "guessing" correlations.

## Performance / DB Practices

-   Avoid read-before-write in hot paths (like tracking) unless absolutely required and approved.
-   Use indexed queries; avoid large aggregation pipelines unless necessary.
-   Keep documents bounded to prevent growth impacting reads and storage.

## Error Handling & Logging

-   Centralized error handling middleware.
-   Avoid leaking stack traces in production responses.
-   Log server errors with enough context for debugging but no sensitive data.

## Validation

-   Validate request payloads (body/query/params).
-   Normalize UTM fields and referrers consistently.
-   Treat unknown values as `null` or fold into `other`.

## Security Basics

-   Ensure CORS, auth, and rate limits align with environment.
-   All auth-protected endpoints must verify token and handle missing/expired tokens gracefully.
-   Avoid returning raw billing/trial/adminOverride for non-admin routes.

## Output / QA

When you implement backend changes:

-   Summarize files changed and why.
-   Provide manual QA steps:
    -   Example curl/HTTP calls with expected status codes and key response fields.
    -   Confirm invariants (e.g., tracking remains 204).
