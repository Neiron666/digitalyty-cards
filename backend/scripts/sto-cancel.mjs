/**
 * sto-cancel.mjs
 *
 * PURPOSE:
 *   Manual operator tool for cancelling/deactivating a Tranzila STO schedule
 *   for a single identified user.
 *   This is NOT a cron job, NOT a batch tool, and NOT a GitHub Actions executor.
 *   Run only by an authorized operator with access to MONGO_URI and STO env vars.
 *
 * INVARIANTS (never violated):
 *   - Dry-run by default. --run is required even for dry-run.
 *   - Single-target always. --email OR --user-id required in all modes.
 *   - --execute performs an external Tranzila API call AND Mongo writes
 *     through cancelTranzilaStoForUser (provider-first). No ad-hoc DB writes.
 *   - --execute requires --i-understand-sto-cancel-api-call.
 *   - --execute requires --cancellation-reason (non-empty, max 500 chars).
 *   - Production-looking STO terminals (matching /^fxp/i) are blocked in
 *     execute mode unless --allow-prod is explicitly provided.
 *   - Never print: Tranzila token, expiry month/year values, API keys,
 *     HMAC/access-token, request headers, request body, raw response body,
 *     passwordHash, full user document, or raw stoId value.
 *   - Output only sanitized booleans, status enums, and error classifications.
 *
 * USAGE:
 *   node scripts/sto-cancel.mjs --run --email=user@example.com [options]
 *   node scripts/sto-cancel.mjs --run --user-id=<mongoId> [options]
 *
 * DRY-RUN (default — no API call, no Mongo write):
 *   node scripts/sto-cancel.mjs --run --email=user@example.com
 *   node scripts/sto-cancel.mjs --run --user-id=<mongoId>
 *
 * EXECUTE (real API call + Mongo write, ack + reason required):
 *   node scripts/sto-cancel.mjs --run --execute --i-understand-sto-cancel-api-call --email=user@example.com --cancellation-reason="ticket-123 admin revoke"
 *   node scripts/sto-cancel.mjs --run --execute --i-understand-sto-cancel-api-call --user-id=<mongoId> --cancellation-reason="ticket-123 admin revoke"
 */

import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import User from "../src/models/User.model.js";
import { TRANZILA_CONFIG } from "../src/config/tranzila.js";
import { cancelTranzilaStoForUser } from "../src/services/payment/tranzila.provider.js";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Terminals matching this pattern are treated as production — blocked in execute without --allow-prod. */
const PROD_TERMINAL_PATTERN = /^fxp/i;

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
                usage: "node scripts/sto-cancel.mjs --run --email=<email>|--user-id=<id> [options]",
                reason: "Missing --run flag. Add --run to proceed.",
                options: {
                    "--run": "required for all modes",
                    "--email=<email>":
                        "target a single user by email (required)",
                    "--user-id=<id>":
                        "target a single user by MongoDB ObjectId (required)",
                    "--execute":
                        "enable real API call + Mongo write (requires --i-understand-sto-cancel-api-call + --cancellation-reason)",
                    "--i-understand-sto-cancel-api-call":
                        "acknowledgment required with --execute",
                    "--cancellation-reason=<text>":
                        "cancellation reason, max 500 chars (required with --execute)",
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
const ACKNOWLEDGED = hasFlag("--i-understand-sto-cancel-api-call");
const ALLOW_PROD = hasFlag("--allow-prod");
const emailArg = getFlagValue("--email")?.toLowerCase().trim() || null;
const userIdArg = getFlagValue("--user-id") || null;
const rawReason = getFlagValue("--cancellation-reason");

// ── Pre-connect gates ─────────────────────────────────────────────────────────

// Gate 1: target required in all modes
if (!emailArg && !userIdArg) {
    console.log(
        JSON.stringify({
            ok: false,
            blocked: "BLOCKED_MISSING_TARGET",
            reason: "A target is required: provide --email=<email> OR --user-id=<id>",
        }),
    );
    process.exitCode = 1;
    process.exit(1);
}

// Gate 2: single target only
if (emailArg && userIdArg) {
    console.log(
        JSON.stringify({
            ok: false,
            blocked: "BLOCKED_ONE_TARGET_ONLY",
            reason: "Provide --email OR --user-id, not both",
        }),
    );
    process.exitCode = 1;
    process.exit(1);
}

// Gate 3: valid ObjectId
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

// Gate 4: execute ack
if (EXECUTE && !ACKNOWLEDGED) {
    console.log(
        JSON.stringify({
            ok: false,
            blocked: "BLOCKED_MISSING_ACK",
            reason: "--execute requires --i-understand-sto-cancel-api-call",
        }),
    );
    process.exitCode = 1;
    process.exit(1);
}

// Gate 5: cancellation reason present (execute only)
if (EXECUTE && !rawReason) {
    console.log(
        JSON.stringify({
            ok: false,
            blocked: "BLOCKED_MISSING_CANCELLATION_REASON",
            reason: "--execute requires --cancellation-reason=<text>",
        }),
    );
    process.exitCode = 1;
    process.exit(1);
}

// Gate 6: reason normalization — trim then validate (execute only)
const cancellationReason = rawReason?.trim() ?? null;

if (EXECUTE && cancellationReason !== null && cancellationReason.length === 0) {
    console.log(
        JSON.stringify({
            ok: false,
            blocked: "BLOCKED_MISSING_CANCELLATION_REASON",
            reason: "--cancellation-reason must not be empty after trim",
        }),
    );
    process.exitCode = 1;
    process.exit(1);
}

if (EXECUTE && cancellationReason !== null && cancellationReason.length > 500) {
    console.log(
        JSON.stringify({
            ok: false,
            blocked: "BLOCKED_REASON_TOO_LONG",
            reason: `--cancellation-reason exceeds 500 characters (got ${cancellationReason.length})`,
        }),
    );
    process.exitCode = 1;
    process.exit(1);
}

// Gate 7: MONGO_URI
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
    const warnings = [];

    // Production terminal guard
    if (terminalLooksProduction) {
        if (EXECUTE && !ALLOW_PROD) {
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
            warnings.push(
                "stoTerminal matches PROD_TERMINAL_PATTERN — this looks like a production terminal.",
            );
        }
    }

    // Execute config guard — validate env vars before any DB query
    if (EXECUTE) {
        const missingVars = [
            !TRANZILA_CONFIG.stoTerminal && "TRANZILA_STO_TERMINAL",
            !TRANZILA_CONFIG.stoUpdateApiUrl && "TRANZILA_STO_UPDATE_API_URL",
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

    // ── Build filter ──────────────────────────────────────────────────────────

    const filter = emailArg
        ? { email: emailArg }
        : { _id: new mongoose.Types.ObjectId(userIdArg) };

    const user = await User.findOne(filter);

    // ── User not found ────────────────────────────────────────────────────────

    if (!user) {
        console.log(
            JSON.stringify(
                {
                    mode: EXECUTE ? "EXECUTE" : "DRY_RUN",
                    dbName,
                    terminalLooksProduction,
                    warnings,
                    user: null,
                    result: {
                        ok: false,
                        reason: "user_not_found",
                    },
                },
                null,
                2,
            ),
        );
        process.exitCode = 1;
        return;
    }

    // ── Preflight object (sanitized fields only) ──────────────────────────────

    const stoStatus = user.tranzilaSto?.status ?? null;
    const stoIdPresent = Boolean(user.tranzilaSto?.stoId);

    let cancellationEligible = false;
    let skipReason = null;

    if (stoStatus === "cancelled") {
        skipReason = "already_cancelled";
    } else if (!stoIdPresent) {
        skipReason = "no_sto_id";
    } else if (stoStatus !== "created") {
        skipReason = "invalid_state";
    } else {
        cancellationEligible = true;
    }

    const preflight = {
        userId: String(user._id),
        email: user.email,
        plan: user.plan,
        subscriptionStatus: user.subscription?.status ?? null,
        stoStatus,
        stoIdPresent,
        cancellationEligible,
        skipReason,
    };

    // ── Dry-run ───────────────────────────────────────────────────────────────

    if (!EXECUTE) {
        console.log(
            JSON.stringify(
                {
                    mode: "DRY_RUN",
                    dbName,
                    terminalLooksProduction,
                    warnings,
                    user: preflight,
                    result: {
                        ok: cancellationEligible,
                        wouldCancel: cancellationEligible,
                        reason: skipReason,
                    },
                },
                null,
                2,
            ),
        );
        process.exitCode = 0;
        return;
    }

    // ── Execute — not eligible ────────────────────────────────────────────────

    if (!cancellationEligible) {
        console.log(
            JSON.stringify(
                {
                    mode: "EXECUTE",
                    dbName,
                    terminalLooksProduction,
                    warnings,
                    user: preflight,
                    result: {
                        ok: false,
                        skipped: true,
                        reason: skipReason,
                        stoIdPresent,
                    },
                },
                null,
                2,
            ),
        );
        process.exitCode = 0;
        return;
    }

    // ── Execute — eligible — provider call ────────────────────────────────────

    const result = await cancelTranzilaStoForUser(user, {
        source: "operator_script",
        reason: cancellationReason,
    });

    console.log(
        JSON.stringify(
            {
                mode: "EXECUTE",
                dbName,
                terminalLooksProduction,
                warnings,
                user: preflight,
                result: {
                    ok: result.ok,
                    cancelled: result.cancelled ?? false,
                    skipped: result.skipped ?? false,
                    reason: result.reason ?? null,
                    errorCode: result.errorCode ?? null,
                    errorMessage: result.errorMessage ?? null,
                    stoIdPresent: result.stoIdPresent ?? false,
                },
            },
            null,
            2,
        ),
    );

    process.exitCode = result.ok === true ? 0 : 1;
}

// ── Entry point ───────────────────────────────────────────────────────────────

try {
    await main();
} catch (err) {
    console.log(
        JSON.stringify({
            ok: false,
            error: err?.message ?? "unexpected_error",
        }),
    );
    process.exitCode = 1;
} finally {
    await mongoose.disconnect();
}
