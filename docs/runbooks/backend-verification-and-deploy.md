# Runbook: Backend Verification & Deploy (Render + Windows)

Scope: operations-only guidance for a deterministic backend deploy / verification flow.

## A) Render backend service settings (checklist)

**Service root**

- Root Directory: `backend`

**Build / start**

- Build Command: `npm ci`
- Start Command: `npm start`

**Node version**

- Use a single pinned Node major/minor across environments.
- Verify in build logs that Render uses the intended Node version (the log prints it early for most Node builds).
- If the backend behaves differently locally vs Render, first confirm Node versions match.

**How to pin (recommended)**

- Prefer pinning via `backend/package.json` → `engines.node` with a bounded range (include an upper bound so you do not silently drift onto a new major).
    - Example intent (do not copy blindly): allow Node 22.x, block Node 23+: `>=22.12 <23`.
    - This is documentation guidance only; do not change `package.json` unless explicitly requested.

**Render alternatives**

- If your hosting flow supports it, you can pin via `.nvmrc` or `.node-version`.
- In a monorepo, ensure the service is configured with **Root Directory = `backend`** so the platform resolves the correct `package.json` and the backend’s Node constraints.

**ENV checklist (SSoT)**

- Origin-lock / proxy secret configuration is documented as the operational SSoT in:
    - See docs/security/SECURITY_TEMP_API_GATE.md (Render env vars + expected status codes)

**Troubleshooting (startup crash on Render)**

- Confirm Root Directory is `backend` and that `npm ci` ran inside that folder.
- Check Render build logs for:
    - working directory
    - `npm ci` output
    - Node version
- If the process crashes during import/boot (e.g., Mongoose schema compile-time errors), it will fail before listening on the port; treat that as a deploy blocker.

## B) Windows deterministic install + typical EPERM (bcrypt.node)

**Symptom**

- `npm.cmd ci` fails with `EPERM: operation not permitted, unlink ...\node_modules\bcrypt\...\bcrypt.node`

**Cause**

- A live `node.exe` process (often `node src/server.js`, `nodemon`, or a sanity script) still holds a lock on `backend/node_modules`.

**Fix (deterministic, lockfile-driven)**

1. Ensure your current directory is `backend`.
2. Stop the backend Node process that holds the lock.
3. Delete `node_modules`.
4. Re-run `npm.cmd ci`.

**PowerShell example (targeted stop)**

```powershell
# From repo root or anywhere
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Select-Object ProcessId,CommandLine |
  Format-List

# Stop only the backend process (example PID)
Stop-Process -Id <PID> -Force

Set-Location backend
cmd /c "if exist node_modules rmdir /s /q node_modules"
npm.cmd ci
```

**cmd fallback (if PowerShell output/PSReadLine is unstable)**

PSReadLine workaround (current session only):

```powershell
Remove-Module PSReadLine -Force -ErrorAction SilentlyContinue
```

```bat
cd backend
cmd /c "if exist node_modules rmdir /s /q node_modules"
npm.cmd ci
```

## C) Early-stop smoke before running sanities

Run this immediately after `npm.cmd ci`:

```powershell
node --input-type=module -e "import 'dotenv/config'; console.log('dotenv ok')"
```

- If it does **not** print `dotenv ok` or exits non-zero: **STOP**.
- Fix install / cwd first (otherwise all `sanity:*` scripts that import `dotenv/config` will fail at module resolution).

## D) Governance: canonical sanity order + RAW+EXIT

**Recommended order** (fastest signal first):

1. `npm.cmd run sanity:imports`
2. `npm.cmd run sanity:org-access`
3. `npm.cmd run sanity:org-membership`
4. `npm.cmd run sanity:slug-policy`
5. `npm.cmd run sanity:ownership-consistency`
6. `npm.cmd run sanity:card-index-drift`

**Raw logs policy**

- Always keep RAW stdout/stderr and an explicit `EXIT:<code>` line for each command.
- Using VS Code tasks that redirect output to `_tmp_*.txt` and append `EXIT:` is an acceptable and preferred way to keep verification evidence.

## E) Final smoke start (long-running)

Run from `backend`:

```powershell
npm.cmd start
```

**Success criteria**

- Logs include `Backend running on port ...`.
- Process does not exit immediately (no crash during boot/import).

**How to stop**

- Foreground: `Ctrl+C`.
- If you started it in a separate terminal/session: stop the corresponding `node.exe` / terminal process.

**Evidence / exit code note**

- `EXIT:<code>` is not applicable to long-running processes.
- Capture and attach the startup log lines above as the operational proof.

## F) Production Mongo connectivity (post CI-only cluster rollout)

**Production Atlas Network Access (post-hardening):**

The production Atlas cluster no longer allows `0.0.0.0/0`. It allowlists only the two Render backend outbound ranges:

- `74.220.51.0/24`
- `74.220.59.0/24`

**Verification method:** Render service logs — confirm `MongoDB connected` line appears in the startup log. This is the authoritative proof of production Mongo connectivity.

**Why direct `/api/health` curl returns 403:**

A direct `curl` to the production backend URL may return:

```
HTTP/2 403  {"code":"PROXY_FORBIDDEN"}
```

This is the **proxy gate** (`CARDIGO_PROXY_SHARED_SECRET`) rejecting a non-proxied request. It is **not** a MongoDB connectivity failure. Do not diagnose `PROXY_FORBIDDEN` as a Mongo error.

Correct production verification path:

1. Render logs — confirm `MongoDB connected`
2. Frontend smoke — `curl -I https://cardigo.co.il` → 200

**GitHub Actions Mongo checks:**

GitHub Actions workflows use the dedicated CI-only cluster via `MONGO_URI_DRIFT_CHECK`. They do not reach the production cluster under normal steady-state. See `docs/runbooks/ci-cluster-bootstrap.md` for the full CI cluster runbook.

## G) Scheduled / background jobs

All background jobs run in-process inside this web service. There are no Render Cron Jobs or Render Background Workers.

For the full scheduled-jobs inventory, readiness status, Sentry monitoring state, and production rollout requirements see:

- `docs/runbooks/scheduled-jobs-readiness.md`

**Critical note:** The backend is currently a Render Free / sleeping service. In-process Node timers stop when the service sleeps. Sentry Cron missed check-ins under a sleeping free tier are expected, not indicative of code failure. Production-grade job scheduling requires an always-on paid instance or a dedicated scheduler architecture — see the runbook above.
