## Sanity scripts

- `sanity:ownership-consistency` checks User↔Card ownership invariants (A–E) and prints a JSON report.
- Exit codes: `0` = clean, `2` = issues found, `1` = runtime error.
- Windows: `npm.cmd run sanity:ownership-consistency`

## Release sanity gates (SSoT)

Windows commands (must-pass before release):

`npm.cmd run sanity:cascade-delete`
`npm.cmd run sanity:claim-migrate-media`
`npm.cmd run sanity:claim-api-contract`
`npm.cmd run sanity:ownership-consistency`
`npm.cmd run sanity:claim-vs-create-race`
`npm.cmd run sanity:slug-policy`

Exit code semantics:

- Most sanity scripts: `0` = OK, `1` = FAILED/exception.
- `sanity:ownership-consistency`: `0` = clean, `2` = issues found, `1` = exception.

Notes:

- `sanity:cascade-delete` is NOT read-only (creates/deletes fixtures).
- The other gates are read-only as currently implemented.
- `slugPolicy` is returned only from `GET /api/cards/mine` (user branch) when `exposeSlugPolicy:true`; `sanity:slug-policy` guards against leaking it via public/other endpoints.
- WARNING: `sanity:slug-policy` does not currently gate on `remaining/limit` fields in the 429 payload (it records it as `checks.limitPayload` only).

TENANT_HOST_ALLOWLIST:

- Wildcard `*` is forbidden (misconfig; ignored).
- Example local: `TENANT_HOST_ALLOWLIST=localhost,127.0.0.1,127.0.0.2` (no ports; ports are stripped from Host).
- If host is not allowlisted: public/SEO routes return `404`, analytics returns `204` (no DB lookup).

Allowed Hosts (MongoDB allowlist + ENV bootstrap):

- The effective allowlist is a UNION of:
    - `TENANT_HOST_ALLOWLIST` (ENV bootstrap; always applied)
    - `AllowedHost` collection in MongoDB where `isActive=true`
- Cache: backend keeps an in-memory cache (TTL default 60s).
- Failure mode: if MongoDB allowlist query fails, backend falls back to ENV allowlist only (fail-closed for DB-managed hosts).

Admin management:

- List: `GET /api/admin/allowed-hosts`
- Add: `POST /api/admin/allowed-hosts` with `{ host, note? }`
- Update: `PATCH /api/admin/allowed-hosts/:id` with `{ isActive?, note? }`
- Deactivate (soft-delete): `DELETE /api/admin/allowed-hosts/:id`

Bootstrap guidance:

- Keep the core production domains in `TENANT_HOST_ALLOWLIST` so the admin panel remains reachable even if Mongo is temporarily unavailable.
- Add new customer domains via the admin API/UI so changes persist without redeploy.
