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
- WARNING: `sanity:slug-policy` does not currently gate on `remaining/limit` fields in the 429 payload (it records it as `checks.limitPayload` only).

TENANT_HOST_ALLOWLIST:

- Wildcard `*` is forbidden (misconfig; ignored).
- Example local: `TENANT_HOST_ALLOWLIST=localhost,127.0.0.1,127.0.0.2` (no ports; ports are stripped from Host).
- If host is not allowlisted: public/SEO routes return `404`, analytics returns `204` (no DB lookup).
