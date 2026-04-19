/**
 * sto-retry-failed.mjs
 *
 * PURPOSE:
 *   Manual operator recovery for users whose Tranzila STO creation failed or
 *   got stuck after a successful first payment.
 *   This is NOT a cron job and NOT a GitHub Actions production executor.
 *   Run only by an authorized operator with access to MONGO_URI and STO env vars.
 *
 * INVARIANTS (never violated):
 *   - Dry-run by default. --run is required even for dry-run.
 *   - --execute performs an external Tranzila API call AND Mongo writes.
 *   - --execute requires --i-understand-sto-api-call.
 *   - --execute requires exactly one target: --email=<email> OR --user-id=<id>.
 *   - Production-looking STO terminals (matching /^fxp/i) are blocked in execute
 *     mode unless --allow-prod is explicitly provided.
 *   - Never print: Tranzila token, expiry month/year values, API keys,
 *     HMAC/access-token, request headers, request body, raw response body,
 *     passwordHash, full user document, or raw stoId.
 *   - Output only sanitized booleans, status enums, and counts.
 *
 * USAGE:
 *   node scripts/sto-retry-failed.mjs --run [options]
 *
 * DRY-RUN (default — no API call, no Mongo write):
 *   node scripts/sto-retry-failed.mjs --run
 *   node scripts/sto-retry-failed.mjs --run --limit=10
 *   node scripts/sto-retry-failed.mjs --run --email=user@example.com
 *
 * EXECUTE (real API call + Mongo write, single target required):
 *   node scripts/sto-retry-failed.mjs --run --execute --i-understand-sto-api-call --email=user@example.com
 *   node scripts/sto-retry-failed.mjs --run --execute --i-understand-sto-api-call --user-id=<mongoId>
 *
 * YEARLY (disabled by default in execute):
 *   node scripts/sto-retry-failed.mjs --run --execute --i-understand-sto-api-call --email=user@example.com --include-yearly
 */

import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import User from "../src/models/User.model.js";
import { TRANZILA_CONFIG } from "../src/config/tranzila.js";
import {
    createTranzilaStoForUser,
    STO_PENDING_STALE_MS,
} from "../src/services/payment/tranzila.provider.js";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Terminals matching this pattern are treated as production — blocked in execute without --allow-prod. */
const PROD_TERMINAL_PATTERN = /^fxp/i;

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// ── Arg helpers ───────────────────────────────────────────────────────────────

function hasFlag(name) {
    return process.argv.slice(2).includes(name);
}

function getFlagValue(name) {
    const args = process.argv.slice(2);
    const eqArg = args.find((a) => a.startsWith(name + "="));
    if (eqArg) return eqArg.slice(name.length + 1);
    const idx = args.indexOf(name);
    if (
        idx !== -1 &&
        idx + 1 < args.length &&
        !args[idx + 1].startsWith("--")
    ) {
        return args[idx + 1];
    }
    return null;
}

// ── Usage guard (pre-connect) ─────────────────────────────────────────────────

if (!hasFlag("--run")) {
    console.log(
        JSON.stringify(
            {
                ok: false,
                usage: "node scripts/sto-retry-failed.mjs --run [options]",
                reason: "Missing --run flag. Add --run to proceed.",
                options: {
                    "--run": "required for all modes",
                    "--execute":
                        "enable real API call + Mongo write (requires --i-understand-sto-api-call + single target)",
                    "--i-understand-sto-api-call":
                        "acknowledgment required with --execute",
                    "--email=<email>": "target a single user by email",
                    "--user-id=<id>":
                        "target a single user by MongoDB ObjectId",
                    "--limit=N": `max candidates, default ${DEFAULT_LIMIT}, max ${MAX_LIMIT}`,
                    "--include-yearly":
                        "allow yearly-plan users in execute mode",
                    "--allow-prod":
                        "allow execute against production-looking terminal",
                },
            },
            null,
            2,
        ),
    );
    process.exitCode = 1;
    process.exit(1);
}

// ── Parse flags (pre-connect) ─────────────────────────────────────────────────

const EXECUTE = hasFlag("--execute");
const ACKNOWLEDGED = hasFlag("--i-understand-sto-api-call");
const ALLOW_PROD = hasFlag("--allow-prod");
const INCLUDE_YEARLY = hasFlag("--include-yearly");
const emailArg = getFlagValue("--email")?.toLowerCase().trim() || null;
const userIdArg = getFlagValue("--user-id") || null;

// ── Pre-connect gates ─────────────────────────────────────────────────────────

if (EXECUTE && !ACKNOWLEDGED) {
    console.log(
        JSON.stringify({
            ok: false,
            blocked: "BLOCKED_MISSING_ACK",
            reason: "--execute requires --i-understand-sto-api-call",
        }),
    );
    process.exitCode = 1;
    process.exit(1);
}

if (EXECUTE && !emailArg && !userIdArg) {
    console.log(
        JSON.stringify({
            ok: false,
            blocked: "BLOCKED_EXECUTE_REQUIRES_SINGLE_TARGET",
            reason: "--execute requires exactly one target: --email=<email> OR --user-id=<id>",
        }),
    );
    process.exitCode = 1;
    process.exit(1);
}

if (EXECUTE && emailArg && userIdArg) {
    console.log(
        JSON.stringify({
            ok: false,
            blocked: "BLOCKED_EXECUTE_REQUIRES_ONE_TARGET_ONLY",
            reason: "--execute requires exactly one target — provide --email OR --user-id, not both",
        }),
    );
    process.exitCode = 1;
    process.exit(1);
}

if (userIdArg && !mongoose.Types.ObjectId.isValid(userIdArg)) {
    console.log(
        JSON.stringify({
            ok: false,
            blocked: "BLOCKED_INVALID_USER_ID",
            reason: "--user-id is not a valid MongoDB ObjectId",
        }),
    );
    process.exitCode = 1;
    process.exit(1);
}

const rawLimit = getFlagValue("--limit");
let LIMIT = DEFAULT_LIMIT;
if (rawLimit !== null) {
    const parsed = parseInt(rawLimit, 10);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        console.log(
            JSON.stringify({
                ok: false,
                reason: "--limit must be a positive integer",
            }),
        );
        process.exitCode = 1;
        process.exit(1);
    }
    LIMIT = Math.min(parsed, MAX_LIMIT);
}

if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required");
}

// ── Mongoose config ───────────────────────────────────────────────────────────

mongoose.set("autoIndex", false);
mongoose.set("autoCreate", false);

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    await connectDB(process.env.MONGO_URI);

    const dbName = mongoose.connection.db?.databaseName ?? "unknown";
    const stoTerminal = TRANZILA_CONFIG.stoTerminal || "";
    const terminalLooksProduction = PROD_TERMINAL_PATTERN.test(stoTerminal);

    // Production terminal guard
    if (terminalLooksProduction && !ALLOW_PROD) {
        if (EXECUTE) {
            console.log(
                JSON.stringify({
                    ok: false,
                    blocked: "BLOCKED_PRODUCTION_TERMINAL",
                    reason: "stoTerminal matches production pattern (/^fxp/i). Pass --allow-prod to override. Intended for sandbox only.",
                }),
            );
            process.exitCode = 1;
            process.exit(1);
        } else {
            console.warn(
                "[sto-retry] WARN: stoTerminal matches PROD_TERMINAL_PATTERN — this looks like a production terminal.",
            );
        }
    }

    // Execute-mode STO config guard
    if (EXECUTE) {
        const missingVars = [
            !TRANZILA_CONFIG.stoTerminal && "TRANZILA_STO_TERMINAL",
            !TRANZILA_CONFIG.stoApiUrl && "TRANZILA_STO_API_URL",
            !TRANZILA_CONFIG.apiAppKey && "TRANZILA_API_APP_KEY",
            !TRANZILA_CONFIG.apiPrivateKey && "TRANZILA_API_PRIVATE_KEY",
        ].filter(Boolean);
        if (missingVars.length) {
            console.log(
                JSON.stringify({
                    ok: false,
                    reason: "Execute mode requires STO env vars",
                    missingVarNames: missingVars,
                }),
            );
            process.exitCode = 1;
            process.exit(1);
        }
    }

    const now = new Date();
    const staleBefore = new Date(Date.now() - STO_PENDING_STALE_MS);

    // ── Candidate query ───────────────────────────────────────────────────────
    // Full Mongoose documents required — createTranzilaStoForUser calls user.save().

    const filter = {
        $or: [
            { "tranzilaSto.status": "failed" },
            {
                "tranzilaSto.status": "pending",
                "tranzilaSto.lastAttemptAt": { $lt: staleBefore },
            },
        ],
        "tranzilaSto.stoId": null,
        "subscription.status": "active",
        "subscription.expiresAt": { $gt: now },
        tranzilaToken: { $exists: true, $type: "string", $ne: "" },
        plan: { $in: ["monthly", "yearly"] },
    };

    if (emailArg) {
        filter.email = emailArg;
    }
    if (userIdArg) {
        filter._id = new mongoose.Types.ObjectId(userIdArg);
    }

    const candidates = await User.find(filter).limit(LIMIT);

    // ── Per-user processing ───────────────────────────────────────────────────

    let retryEligibleCount = 0;
    let attempted = 0;
    let created = 0;
    let failedAttempts = 0;
    let skipped = 0;
    let infraErrors = 0;

    const rows = [];

    for (const user of candidates) {
        const expMonth = user.tranzilaTokenMeta?.expMonth;
        const expYear = user.tranzilaTokenMeta?.expYear;
        const tokenMetaValid =
            Number.isInteger(expMonth) &&
            expMonth >= 1 &&
            expMonth <= 12 &&
            Number.isInteger(expYear) &&
            expYear >= 2020 &&
            expYear <= 2099;

        const subscriptionExpiresAtFuture =
            user.subscription?.expiresAt instanceof Date &&
            user.subscription.expiresAt > now;

        // ── Preflight object (allowed fields only) ──
        const preflight = {
            userId: String(user._id),
            email: user.email,
            plan: user.plan,
            subscriptionStatus: user.subscription?.status ?? null,
            subscriptionExpiresAtFuture,
            stoStatus: user.tranzilaSto?.status ?? null,
            stoIdPresent: Boolean(user.tranzilaSto?.stoId),
            tokenPresent: Boolean(user.tranzilaToken),
            tokenMetaValid,
            retryEligible: false,
            skipReason: null,
        };

        // ── Skip classification ──
        const currentSto = user.tranzilaSto;

        if (currentSto?.stoId && currentSto?.status === "created") {
            preflight.skipReason = "already_created";
        } else if (currentSto?.stoId) {
            preflight.skipReason = "has_sto_id";
        } else if (currentSto?.status === "cancelled") {
            preflight.skipReason = "cancelled";
        } else if (
            currentSto?.status === "pending" &&
            currentSto?.lastAttemptAt instanceof Date &&
            currentSto.lastAttemptAt >= staleBefore
        ) {
            preflight.skipReason = "pending_fresh";
        } else if (!user.tranzilaToken) {
            preflight.skipReason = "missing_token";
        } else if (!tokenMetaValid) {
            preflight.skipReason = "invalid_token_meta";
        } else if (user.subscription?.status !== "active") {
            preflight.skipReason = "inactive_subscription";
        } else if (!subscriptionExpiresAtFuture) {
            preflight.skipReason = "expired_subscription";
        } else if (user.plan !== "monthly" && user.plan !== "yearly") {
            preflight.skipReason = "invalid_plan";
        } else {
            preflight.retryEligible = true;
        }

        if (preflight.retryEligible) {
            retryEligibleCount++;
        }

        // ── Execute path ──
        if (EXECUTE && ACKNOWLEDGED && preflight.retryEligible) {
            // Yearly guard
            if (user.plan === "yearly" && !INCLUDE_YEARLY) {
                preflight.retryEligible = false;
                preflight.skipReason = "yearly_not_enabled";
                retryEligibleCount--;
                skipped++;
                rows.push({
                    ...preflight,
                    result: "skipped_yearly_not_enabled",
                });
                continue;
            }

            attempted++;
            let resultEnum = null;
            let resultErrorCode = null;
            let resultErrorMessage = null;
            let resultStoIdPresent = false;

            try {
                const r = await createTranzilaStoForUser(
                    user,
                    user.plan,
                    user.subscription.expiresAt,
                );
                resultStoIdPresent = Boolean(r?.stoId);
                resultErrorCode = r?.errorCode ?? null;
                resultErrorMessage = r?.errorMessage ?? null;

                if (r?.ok === true && r?.created === true) {
                    resultEnum = "retry_attempted_created";
                    created++;
                } else if (r?.ok === true && r?.skipped === true) {
                    resultEnum = `skipped_${r.reason ?? "unknown"}`;
                    skipped++;
                } else if (r?.ok === false && r?.skipped === true) {
                    resultEnum = `skipped_${r.reason ?? "unknown"}`;
                    skipped++;
                } else {
                    resultEnum = "retry_attempted_failed";
                    failedAttempts++;
                }
            } catch (_err) {
                resultEnum = "infra_error";
                infraErrors++;
            }

            rows.push({
                ...preflight,
                result: resultEnum,
                errorCode: resultErrorCode,
                errorMessage: resultErrorMessage,
                stoIdPresent: resultStoIdPresent,
            });
        } else {
            if (!preflight.retryEligible) {
                skipped++;
            }
            rows.push(preflight);
        }
    }

    // ── Output ────────────────────────────────────────────────────────────────

    console.log(
        JSON.stringify(
            {
                mode: EXECUTE ? "EXECUTE" : "DRY_RUN",
                dbName,
                terminalLooksProduction,
                totalCandidates: candidates.length,
                retryEligible: retryEligibleCount,
                attempted,
                created,
                failedAttempts,
                skipped,
                infraErrors,
                candidates: rows,
            },
            null,
            2,
        ),
    );

    process.exitCode = 0;
}

try {
    await main();
} catch (err) {
    console.error("[sto-retry] fatal:", err?.message ?? err);
    process.exitCode = 1;
} finally {
    await mongoose.disconnect();
}
