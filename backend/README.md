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

Exit code semantics:

- Most sanity scripts: `0` = OK, `1` = FAILED/exception.
- `sanity:ownership-consistency`: `0` = clean, `2` = issues found, `1` = exception.

Notes:

- `sanity:cascade-delete` is NOT read-only (creates/deletes fixtures).
- The other gates are read-only as currently implemented.
