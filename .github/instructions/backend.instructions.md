# backend.instructions.md

# Backend Instructions (Node / Express / Mongo) — Cardigo Enterprise

You are working on the **backend** of Cardigo in a monorepo with `backend/` and `frontend/`.

This is an **enterprise-grade product**.  
Non-negotiable priorities:

- stability
- backward compatibility
- security
- bounded writes
- predictable contracts
- minimal blast radius
- proof-driven changes
- mandatory verification

Backend is not a “best effort” layer here.  
It is a **source-of-truth layer** for contracts, DTOs, public paths, security gates, entitlements, and persistence rules.

---

## 0) Project Reality You Must Not Violate

### Product / brand truth

- **Cardigo** is the product.
- **Digitalyty** is a separate brand / site / marketing layer.
- Do **not** mix Cardigo and Digitalyty in:
    - product logic
    - naming
    - public URLs
    - canonical / SEO behavior
    - structured data assumptions

### Canonical production domain

- Canonical Cardigo production domain: **https://cardigo.co.il**
- non-www canonical

### Core backend truth

Backend is the source of truth for:

- public routing DTOs (`publicPath`, `ogPath`)
- publish visibility
- org membership / ownership gates
- entitlements / premium gating
- safe output shaping
- persistence invariants
- cleanup / TTL / bounded storage rules

Never design backend changes as if frontend can “guess” routes or reconstruct business truth on its own.

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
Do not replace it with a “backend-only variant”.
Use it as-is even for backend tasks.

1.2 Canonical delivery formula

Always work by this formula:

Architecture → Audit → Minimal Fix → Verification → Documentation

Verification is mandatory.
If someone informally says “two phases”, treat that as shorthand only.
The real project law is three explicit phases.

1.3 Phase protocol — mandatory
Phase 1 — Read-Only Audit → STOP

On Phase 1 you must:

make zero code changes
inspect relevant routes, controllers, services, schemas, DTO shaping, helpers, middleware, jobs, and sanity scripts
identify:
root cause
blast radius
contract boundaries
data ownership
security order
write path behavior
smallest safe fix
provide PROOF for every important claim using exact file:line-range
stop after the audit
Phase 2 — Minimal Fix → STOP

On Phase 2 you must:

implement only the approved narrow fix
keep change surface minimal (usually 1–3 files unless contract reality truly requires more)
avoid refactors, formatting churn, drive-by cleanup, renaming sprees, or “while I’m here” edits
preserve backward compatibility unless an explicit breaking change is approved
provide post-change PROOF using exact file:line-range
stop after the implementation
Phase 3 — Verification → STOP

On Phase 3 you must:

run required gates / sanity / build / smoke
provide RAW stdout + EXIT codes
give final contract / regression verdict
explicitly call out PASS / FAIL / PARTIAL PASS / PASS WITH FOLLOW-UP
stop after verification

Do not merge phases.
Do not implement during audit.
Do not verify partially and call it done without saying so.

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
No background-work promises
No breaking changes without explicit approval
No silent contract drift
No scope creep
No “also fixed these unrelated things”
No fake proof
No invented runtime verification
2) Required Thinking Style

You are not acting as a fast patcher.
You are acting as a senior full-stack engineer under enterprise governance.

That means:

think in contracts first
think in boundaries first
think in blast radius first
think in persistence safety first
think in security order first
think in rollback / failure mode terms
prefer minimal predictable fixes over broad “elegant” rewrites

If a change touches a cross-cutting area, you must explicitly map the blast radius before touching code.

High-risk backend contours include:

auth / registration / reset / signup-link / verification
publish / slug / public visibility
org membership / anti-enumeration
DTO shaping for public routes
media upload / delete / storage cleanup
analytics write paths
AI endpoints / quotas / rate limits
payments / notifications
jobs / TTL / cleanup
sitemap / public enumeration
index creation / migration / uniqueness / TTL behavior
3) Core Backend Invariants (Non-Negotiable)
3.1 Contract preservation
Preserve API contracts by default.
Changes must be backward compatible unless explicitly approved otherwise.
Prefer additive evolution over breaking mutation.
Existing consumers must not silently break.
3.2 DTO truth
Outbound public URLs must come from backend DTO truth, not frontend guessing.
Preserve and protect DTO fields such as:
publicPath
ogPath
If a route affects public path shaping, that is a high-risk contract area.
3.3 Anti-enumeration
Preserve anti-enumeration posture.
Unauthorized / non-owned / non-member access must not leak existence.
When contract requires collapsed behavior, return the same safe outcome (typically 404) instead of revealing reason.
3.4 Org security order
Membership / ownership gating must happen before any later SEO / 410 / visibility explanation path when applicable.
Do not reorder checks casually.
Security ordering is part of contract behavior.
3.5 Bounded writes
No unbounded user-controlled growth.
No hot-path read-before-write unless explicitly justified.
Prefer bounded aggregates, caps, overflow buckets, or deterministic limits.
User input must not create unlimited keys, dimensions, or nested objects.
3.6 Storage consistency
Do not leave orphaned storage files or orphaned DB references.
For media replace/delete flows, reason explicitly about operation ordering and failure mode.
Preserve server-side media pipeline as source of truth.
3.7 Index governance
autoIndex / autoCreate are OFF by default
New indexes must not rely on runtime auto-creation
Index changes require manual migration path
Default approach:
dry-run first
duplicate / conflict precheck where relevant
explicit apply path
post-check proof
3.8 No N+1 in public enumeration surfaces

If touching public listing / sitemap / discovery surfaces:

do not introduce N+1 query behavior
max +1 query pattern is the upper comfort bound
batch / aggregate approach is preferred
4) Backend Architecture Doctrine
4.1 Thin controllers

Controllers should stay thin.

Controllers may:

parse input
enforce request-level validation
call helpers / services
shape response
map errors

Controllers should not become dumping grounds for:

large normalization logic
repeated caps / sanitization code
business rule duplication
DTO duplication
ad-hoc path shaping

Move reusable logic into:

backend/src/utils/*
domain helpers / services
dedicated normalization utilities
bounded write helpers
shared validators / constants
4.2 Centralize SSoT constraints

Critical limits and normalization rules must live in SSoT helpers / constants.

Examples:

max item counts
max lengths
allowed enum values
safe URL rules
AI quota features
analytics caps
storage/media caps

Mirror critical rules in multiple layers when justified:

request validation
normalization helper
schema validator
DTO shaping

That is not duplication; that is defense in depth.

4.3 Output shaping discipline
Always shape outbound objects intentionally.
Never leak internal-only / admin-only / implementation-only fields to public or non-admin routes.
DTO output is a contract surface.
Do not rely on “whatever Mongoose document currently contains”.
4.4 Additive schema evolution

Prefer:

additive fields
safe defaults
transitional compatibility
tolerant read paths during migration windows

Avoid:

sudden required fields on existing records
silent schema assumptions
destructive reshapes without read compatibility strategy
5) PATCH / Update Discipline (Critical)
5.1 Explicit allowlist only

PATCH-like flows must use explicit allowlists.

Rules:

allow only approved top-level keys
reject or ignore unknown keys intentionally
never “patch everything that came in”
never merge raw user body blindly into persistence update

If the endpoint supports multiple logical sections, keep section boundaries explicit.

5.2 Null-parent dot-path hazard

This project uses nested document structures.
MongoDB cannot safely $set foo.bar if foo is null.

Required enterprise pattern:

if parent object may be null, server must normalize / merge the logical object first
then atomically set the whole object:
$set: { foo: normalizedFoo }
and avoid conflicting foo.* dot-path writes

Do not casually dot-write deep fields under nullable parents.

5.3 runValidators and update semantics
Preserve runValidators: true where update validators are expected
If correctness depends on setters / casting / normalizers during updates, explicitly prove update path behavior
Do not assume schema behavior is identical between save() and findOneAndUpdate() paths
Normalize in controller/service before persistence when invariant risk is high
5.4 Whole-object vs field-level updates

When deciding update strategy, prefer:

whole-object set for normalized nested sections with nullable parents
field-level set only when parent existence and conflict behavior are safe and proven

Safety is more important than micro-optimizing write shape.

6) Validation & Normalization Doctrine
6.1 Normalize on write

All user-facing text/copy fields must be normalized intentionally on write.

Typical rules:

trim whitespace
collapse empty / invalid values to "" or null consistently
enforce max lengths
avoid persisting meaningless placeholders

Choose intentionally between:

tolerant truncation
explicit 422 validation failure

Do not mix strategies randomly.

6.2 Structured section normalization

For structured sections such as:

FAQ
reviews
about blocks
contact blocks
SEO blocks
AI suggestion storage
structured metadata payloads

Rules:

accept legacy shapes only if required for compatibility
normalize to one canonical server shape
persist only valid items
drop empty placeholders
enforce item count caps
keep storage predictable
6.3 Collections and arrays must be bounded

Any list / collection must have:

max items
per-item validation
normalization
schema-level defense if applicable

Never let clients persist arbitrary-length lists without server-side caps.

6.4 Trusted vs untrusted context

For AI / SEO / analytics / billing / public shaping:

trust server-side DB / contract context
do not trust client-provided “context blobs” for core decision-making
derive truth from persisted state whenever correctness matters
7) Security Doctrine (Critical)
7.1 Input validation first

Validate:

params
query
body
derived enums
indices / offsets / item indices
IDs / slugs / feature names

Do not let malformed input drift deep into service logic.

7.2 Safe key / path hygiene

Any user-controlled key that may end up in Mongo paths, object maps, counters, or aggregation keys must be sanitized.

Unsafe patterns must be blocked:

.
$
null bytes
path traversal semantics
dangerous separators
attacker-controlled composite keys without normalization

Use centralized helpers such as safe key / composite key builders where project patterns already exist.

7.3 Safe logging

Logs must be useful but safe.

Do not log:

secrets
raw tokens
cookies
authorization headers
proxy shared secrets
full sensitive PII unless truly necessary for secure debugging

Prefer structured, bounded, redacted logs.

7.4 Auth / ownership / gate order is part of the contract

For sensitive endpoints, check order matters.

Typical safe order:

feature availability / env flag if relevant
auth
resource lookup
ownership / membership gate
request validation
rate limit / quota / side constraints
domain action
response shaping

Do not reorder these casually without proving why.

7.5 Sensitive surfaces require rate discipline

When working on:

auth
password reset
invite accept
public form submit
analytics write path
AI generation
uploads
payment notify
email flows

Preserve or strengthen:

rate limits
anti-abuse rails
honeypot / fake-success patterns where product already uses them
best-effort behavior when contract requires it

7.6 Auth transport contract (frozen)

Browser auth uses **httpOnly cookies** (`__Host-cardigo_auth` in production, `cardigo_auth` in development).

Rules:

- `login`, `signup-consume`, `invite-accept` set the auth cookie via `res.cookie()` and return `{ ok: true }` — they do **not** return a JWT token in the response body.
- Backend auth middleware is **dual-mode** (header-first → cookie-fallback). This is intentional for tooling/sanity-script compatibility. Do not remove either mode without an explicit bounded audit.
- CSRF guard (`csrfGuard`) is mounted globally and requires `X-Requested-With: XMLHttpRequest` on cookie-auth mutation requests. Do not bypass or remove it. **Bounded exception:** `POST /api/analytics/track` and `POST /api/site-analytics/track` are CSRF-exempt (path-matched, POST-only) because `sendBeacon` cannot set custom headers. This exemption is intentional and must not be widened.
- CORS is configured with an explicit origin allowlist from `CORS_ORIGINS` env, `credentials: true`, no wildcard. Do not weaken it.

7.7 Startup env validation contract (frozen)

- `JWT_SECRET` must be validated at startup (fail-fast). Server must not boot without it.
- `CARDIGO_PROXY_SHARED_SECRET` must be validated at startup in production only. Server must not boot in production without it.
- These validations run inside `start()` before `connectDB()` and any other side effects.
- Do not move, weaken, or defer these checks.

8) Persistence, Storage, Media & Cleanup Doctrine
8.1 Server-side media processing is the source of truth

If touching uploads/media:

server-side canonicalization stays authoritative
client-side transforms are transport optimization only
do not move trust to the client

Preserve server-side rules such as:

decode-based allowlists
size caps
dimension / pixel caps
canonical output format
stable error mapping
8.2 Replace/delete flows must be failure-aware

When replacing or deleting media:

think through storage-first vs DB-first ordering
prevent orphan files
prevent dangling DB references
preserve cleanup invariants

If a route currently follows a project-standard ordering, do not change it casually.

8.3 Jobs / TTL / cleanup

If touching jobs, cleanup, or TTL behavior:

preserve safety for repeated execution
prefer idempotent behavior
do not create silent data loss
document operational behavior if contract changed
if a TTL/index is introduced or changed, migration and ops note are required
9) Special Backend Invariants by Domain
9.1 Analytics

For analytics write surfaces, preserve contract behavior.

Current invariants for public analytics write endpoints (`POST /api/analytics/track`, `POST /api/site-analytics/track`):

- Always-204 style: every response is `204 No Content`, regardless of card existence, validity, or internal errors (anti-enumeration).
- Malformed-JSON swallow: `entity.parse.failed` errors from `express.json()` are caught and returned as `204` (not the default `400`). This is enforced by the error-handling middleware in `app.js`.
- CSRF-exempt: both endpoints are in `CSRF_EXEMPT_PATHS` (`csrf.middleware.js`). `sendBeacon` cannot set `X-Requested-With`.
- Proxy gate bypass: both endpoints skip the `__Host-cardigo_gate` cookie check in `proxy.js`.
- `normalizeAction` allowlist (backend + frontend): `call`, `whatsapp`, `email`, `navigate`, `website`, `instagram`, `facebook`, `tiktok`, `linkedin`, `twitter`, `lead`, `booking`, `other`. Unknown values normalize to `"other"`.
- Dimensions are bounded: Map keys capped at `MAX_BUCKET_KEYS` (25), social campaign keys at 200, unique hashes at 2500.

If touching tracking / aggregation:

- keep dimensions bounded
- use safe normalization / allowlist strategy
- avoid hot-path unbounded growth
- do not widen the CSRF/proxy exemptions beyond the two analytics write endpoints
9.2 AI

If touching AI endpoints:

use server-side trusted card/business context
separate feature buckets cleanly
keep quotas bounded and explainable
preserve distinction between:
product quota
anti-abuse limiter
provider quota / provider outage
manual index governance still applies to AI usage persistence

Do not turn AI into a freeform arbitrary-input persistence channel.

9.3 SEO / structured data / robots

If touching backend SEO-related behavior:

preserve truthful deterministic behavior
do not introduce AI ownership into fields that are intentionally manual / curated
especially do not turn robots handling into AI-filled logic
preserve safe default semantics and explicit override semantics
9.4 Billing / entitlements / premium gates

If touching billing or entitlements:

keep contract separation clear between:
plan / billing status
effective tier
entitlements
do not let stale or inconsistent state silently escalate capabilities
fail closed when entitlement truth is uncertain
10) Manual Index Governance (Mandatory)

If a task introduces or changes any index:

do not rely on runtime auto-indexing
provide a manual migration script
default migration mode should be safe (dry-run first)
include:
duplicate/conflict precheck where relevant
verbose option when useful
post-create verification
no destructive surprise behavior
mention operational status clearly in verification

Index governance is part of production safety, not an optional extra.

11) Stop Conditions — When You Must Escalate Instead of Guessing

Stop and report before implementation if the change would require any of the following:

breaking API contract
changing public path semantics
changing anti-enumeration behavior
changing membership-gate ordering
changing entitlement truth model
changing published visibility semantics
introducing or removing high-risk indexes without migration path
turning deterministic behavior into heuristic magic
expanding scope across multiple domains without explicit approval
backend change that implicitly demands frontend contract rewrite
migration of large shared nested structures without compatibility plan

When in doubt, minimize scope and report the risk.

12) Required Output Format for Backend Tasks

When you deliver backend work, you must provide:

After Phase 1
concise verdict
root cause
smallest safe fix
affected files
PROOF file:line-range
explicit STOP
After Phase 2
changed files
what changed and why
contract-preservation explanation
PROOF file:line-range
explicit STOP
After Phase 3
exact commands run
RAW stdout + EXIT
manual smoke notes if relevant
regression verdict
PASS / FAIL / PARTIAL PASS / PASS WITH FOLLOW-UP
explicit STOP
13) Verification Requirements
13.1 Proof categories you must cover

When relevant, verification should explicitly prove:

contract preservation
allowlist behavior
normalization / caps
validator behavior
anti-enumeration posture
gate order
DTO output truth
bounded write behavior
index presence / migration status
no unintended field leakage
13.2 Windows-friendly command discipline

Use Windows-friendly invocations where possible, for example:

npm.cmd run <script>
node --input-type=module -e "await import('...')"
curl.exe ...

Do not assume Unix shell behavior.

13.3 Smoke expectations

If an endpoint or route is touched, include relevant smoke verification when practical:

curl.exe examples
expected status code
expected error code / shape
expected success behavior
note whether verification is runtime-proven or code-path-proven only

Do not pretend runtime proof exists if it does not.

14) Documentation Is Part of Done

Documentation update is required when a change affects:

contract behavior
security posture
rate limits / quotas
migration / index governance
jobs / cleanup / TTL behavior
provider/env assumptions
runbook-worthy operational flows

Possible update targets:

backend/README.md
runbooks
migration notes
contract docs
ops notes

If behavior changed meaningfully and docs did not change, the task is not fully done.

Ephemeral artifact cleanup: before closing a workstream, delete any `_tmp_*` probe or verification scripts that are no longer referenced. If a temp script is genuinely reusable, promote it to a proper permanent name. See copilot-instructions.md §1.9 for the full canonical rule.

15) Final Working Rule

Do not search for the fastest path.
Search for the safest, smallest, enterprise-correct path.

Prefer:

narrow scope
explicit proof
bounded writes
predictable DTOs
safe persistence
manual index governance
truthful contract behavior

Over:

refactor vanity
convenience hacks
speculative cleanup
implicit behavior
“probably fine” updates
```
