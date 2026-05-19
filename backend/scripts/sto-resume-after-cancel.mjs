/**
 * sto-resume-after-cancel.mjs
 *
 * PURPOSE:
 *   Operator-only migration tool for recreating a Tranzila STO after a prior
 *   STO was cancelled. This supports the price-migration workflow without
 *   relying on the authenticated user-facing resume route.
 *
 * INVARIANTS (never violated):
 *   - Dry-run by default. --run is required in all modes.
 *   - Single-target only. --email OR --user-id is required, never both.
 *   - --execute performs an external Tranzila API call AND Mongo writes only
 *     after all preflight gates pass.
 *   - --execute requires --i-understand-sto-api-call.
 *   - Production-looking STO terminals (matching /^fxp/i) are blocked in
 *     execute mode unless --allow-prod is explicitly provided.
 *   - Never print: Tranzila token, expMonth/expYear values, API keys,
 *     HMAC/access-token, request headers, request body, raw response body,
 *     passwordHash, full user document, or raw stoId.
 *   - Output only sanitized booleans, enums, and truncated identifiers.
 *   - This operator script intentionally bypasses TRANZILA_STO_CREATE_ENABLED.
 *     That flag gates user-facing/self-service creation paths. This script is
 *     an explicit operator migration tool and is protected by CLI gates.
 *
 * USAGE:
 *   node scripts/sto-resume-after-cancel.mjs --run --email=user@example.com --expected-amount-agorot=2900
 *   node scripts/sto-resume-after-cancel.mjs --run --user-id=<mongoId> --expected-amount-agorot=2900
 *
 * DRY-RUN (default — no API call, no Mongo write):
 *   node scripts/sto-resume-after-cancel.mjs --run --email=user@example.com --expected-amount-agorot=2900
 *
 * EXECUTE (real API call + Mongo write, ack required):
 *   node scripts/sto-resume-after-cancel.mjs --run --execute --i-understand-sto-api-call --email=user@example.com --expected-amount-agorot=2900
 */

import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import User from "../src/models/User.model.js";
import { TRANZILA_CONFIG } from "../src/config/tranzila.js";
import { PRICES_AGOROT } from "../src/config/plans.js";
import { createTranzilaStoForUser } from "../src/services/payment/tranzila.provider.js";

const PROD_TERMINAL_PATTERN = /^fxp/i;

function hasFlag(name) {
    return process.argv.slice(2).includes(name);
}

function getFlagValue(name) {
    const args = process.argv.slice(2);
    const eqArg = args.find((arg) => arg.startsWith(name + "="));
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

if (!hasFlag("--run")) {
    console.log(
        JSON.stringify(
            {
                ok: false,
                usage: "node scripts/sto-resume-after-cancel.mjs --run --email=<email>|--user-id=<id> --expected-amount-agorot=<number> [options]",
                reason: "Missing --run flag. Add --run to proceed.",
            },
            null,
            2,
        ),
    );
    process.exitCode = 1;
    process.exit(1);
}

const rawEmail = getFlagValue("--email")?.trim() || null;
const rawUserId = getFlagValue("--user-id")?.trim() || null;
const rawExpectedAmount =
    getFlagValue("--expected-amount-agorot")?.trim() || null;
const EXECUTE = hasFlag("--execute");
const ACKNOWLEDGED = hasFlag("--i-understand-sto-api-call");
const ALLOW_PROD = hasFlag("--allow-prod");

if (!rawEmail && !rawUserId) {
    console.log(
        JSON.stringify(
            {
                ok: false,
                blocked: "BLOCKED_MISSING_TARGET",
                reason: "A target is required: provide --email=<email> OR --user-id=<id>",
            },
            null,
            2,
        ),
    );
    process.exitCode = 1;
    process.exit(1);
}

if (rawEmail && rawUserId) {
    console.log(
        JSON.stringify(
            {
                ok: false,
                blocked: "BLOCKED_ONE_TARGET_ONLY",
                reason: "Provide --email OR --user-id, not both",
            },
            null,
            2,
        ),
    );
    process.exitCode = 1;
    process.exit(1);
}

if (rawUserId && !mongoose.Types.ObjectId.isValid(rawUserId)) {
    console.log(
        JSON.stringify(
            {
                ok: false,
                blocked: "BLOCKED_INVALID_USER_ID",
                reason: "--user-id is not a valid MongoDB ObjectId",
            },
            null,
            2,
        ),
    );
    process.exitCode = 1;
    process.exit(1);
}

if (!rawExpectedAmount) {
    console.log(
        JSON.stringify(
            {
                ok: false,
                blocked: "BLOCKED_MISSING_EXPECTED_AMOUNT",
                reason: "--expected-amount-agorot=<number> is required",
            },
            null,
            2,
        ),
    );
    process.exitCode = 1;
    process.exit(1);
}

const expectedAmountAgorot = Number(rawExpectedAmount);
if (!Number.isInteger(expectedAmountAgorot) || expectedAmountAgorot <= 0) {
    console.log(
        JSON.stringify(
            {
                ok: false,
                blocked: "BLOCKED_INVALID_EXPECTED_AMOUNT",
                reason: "--expected-amount-agorot must be a positive integer",
            },
            null,
            2,
        ),
    );
    process.exitCode = 1;
    process.exit(1);
}

if (EXECUTE && !ACKNOWLEDGED) {
    console.log(
        JSON.stringify(
            {
                ok: false,
                blocked: "BLOCKED_MISSING_ACK",
                reason: "--execute requires --i-understand-sto-api-call",
            },
            null,
            2,
        ),
    );
    process.exitCode = 1;
    process.exit(1);
}

if (!process.env.MONGO_URI) {
    console.log(
        JSON.stringify(
            {
                ok: false,
                blocked: "BLOCKED_MISSING_MONGO_URI",
                reason: "MONGO_URI is required",
            },
            null,
            2,
        ),
    );
    process.exitCode = 1;
    process.exit(1);
}

mongoose.set("autoIndex", false);
mongoose.set("autoCreate", false);

async function main() {
    await connectDB(process.env.MONGO_URI);

    const dbName = mongoose.connection.db?.databaseName ?? "unknown";
    const terminalLooksProduction = PROD_TERMINAL_PATTERN.test(
        TRANZILA_CONFIG.stoTerminal || "",
    );
    const dbLooksProduction = dbName === "cardigo_prod";
    const requiresProdAllow = terminalLooksProduction || dbLooksProduction;
    const warnings = [];

    if (requiresProdAllow && !ALLOW_PROD) {
        if (EXECUTE) {
            console.log(
                JSON.stringify(
                    {
                        ok: false,
                        blocked:
                            "BLOCKED_PRODUCTION_TARGET_REQUIRES_ALLOW_PROD",
                        reason: "Production target requires --allow-prod to execute.",
                        terminalLooksProduction,
                        dbLooksProduction,
                        requiresProdAllow,
                    },
                    null,
                    2,
                ),
            );
            process.exitCode = 1;
            process.exit(1);
        } else {
            warnings.push(
                "Production target detected; --allow-prod will be required for --execute.",
            );
            warnings.push(
                `productionTargetDetails={ terminalLooksProduction: ${terminalLooksProduction}, dbLooksProduction: ${dbLooksProduction} }`,
            );
        }
    } else if (terminalLooksProduction) {
        if (EXECUTE && !ALLOW_PROD) {
            console.log(
                JSON.stringify(
                    {
                        ok: false,
                        blocked:
                            "BLOCKED_PRODUCTION_TARGET_REQUIRES_ALLOW_PROD",
                        reason: "Production target requires --allow-prod to execute.",
                        terminalLooksProduction,
                        dbLooksProduction,
                        requiresProdAllow,
                    },
                    null,
                    2,
                ),
            );
            process.exitCode = 1;
            process.exit(1);
        } else {
            warnings.push(
                "stoTerminal matches PROD_TERMINAL_PATTERN — this looks like a production terminal.",
            );
        }
    }

    if (EXECUTE) {
        const missingVarNames = [
            !TRANZILA_CONFIG.stoApiUrl && "TRANZILA_STO_API_URL",
            !TRANZILA_CONFIG.stoTerminal && "TRANZILA_STO_TERMINAL",
            !TRANZILA_CONFIG.apiAppKey && "TRANZILA_API_APP_KEY",
            !TRANZILA_CONFIG.apiPrivateKey && "TRANZILA_API_PRIVATE_KEY",
        ].filter(Boolean);

        if (missingVarNames.length) {
            console.log(
                JSON.stringify(
                    {
                        ok: false,
                        blocked: "BLOCKED_MISSING_EXECUTE_CONFIG",
                        reason: "Execute mode requires STO create config",
                        missingVarNames,
                        terminalLooksProduction,
                        dbLooksProduction,
                        requiresProdAllow,
                    },
                    null,
                    2,
                ),
            );
            process.exitCode = 1;
            process.exit(1);
        }
    }

    const filter = rawEmail
        ? { email: rawEmail.toLowerCase() }
        : { _id: new mongoose.Types.ObjectId(rawUserId) };

    const user = await User.findOne(filter);

    if (!user) {
        console.log(
            JSON.stringify(
                {
                    mode: EXECUTE ? "EXECUTE" : "DRY_RUN",
                    dbName,
                    terminalLooksProduction,
                    dbLooksProduction,
                    requiresProdAllow,
                    warnings,
                    user: null,
                    result: {
                        ok: false,
                        reason: "BLOCKED_USER_NOT_FOUND",
                    },
                },
                null,
                2,
            ),
        );
        process.exitCode = 1;
        return;
    }

    const now = new Date();
    const subscription = user.subscription ?? {};
    const stoStatus = user.tranzilaSto?.status ?? null;
    const stoIdRaw = user.tranzilaSto?.stoId ?? null;
    const stoIdPresent = Boolean(stoIdRaw);
    const stoIdLast4 = stoIdRaw ? String(stoIdRaw).slice(-4) : null;
    const tokenMeta = user.tranzilaTokenMeta ?? null;
    const tokenMetaPresent = Boolean(tokenMeta);
    const tokenMetaValid =
        tokenMetaPresent &&
        Number.isInteger(tokenMeta.expMonth) &&
        tokenMeta.expMonth >= 1 &&
        tokenMeta.expMonth <= 12 &&
        Number.isInteger(tokenMeta.expYear) &&
        tokenMeta.expYear >= 2020 &&
        tokenMeta.expYear <= 2099;
    const tokenNotExpiredByMeta =
        tokenMetaValid &&
        (tokenMeta.expYear > now.getFullYear() ||
            (tokenMeta.expYear === now.getFullYear() &&
                tokenMeta.expMonth >= now.getMonth() + 1));
    const subscriptionExpiresAt =
        subscription.expiresAt instanceof Date ? subscription.expiresAt : null;
    const currentPlanAmountAgorot = PRICES_AGOROT[user.plan] ?? null;

    let blockedReason = null;

    if (user.plan !== "monthly") {
        blockedReason = "BLOCKED_PLAN_NOT_IN_SCOPE";
    } else if (subscription.status !== "active") {
        blockedReason = "BLOCKED_SUBSCRIPTION_NOT_ACTIVE";
    } else if (subscription.provider !== "tranzila") {
        blockedReason = "BLOCKED_SUBSCRIPTION_PROVIDER_NOT_TRANZILA";
    } else if (!subscriptionExpiresAt) {
        blockedReason = "BLOCKED_SUBSCRIPTION_EXPIRES_AT_MISSING";
    } else if (
        subscriptionExpiresAt.getTime() <=
        now.getTime() + 60 * 60 * 1000
    ) {
        blockedReason = "BLOCKED_SUBSCRIPTION_EXPIRES_TOO_SOON_OR_EXPIRED";
    } else if (currentPlanAmountAgorot !== expectedAmountAgorot) {
        blockedReason = "BLOCKED_PRICE_MISMATCH";
    } else if (stoStatus !== "cancelled") {
        blockedReason = "BLOCKED_STO_NOT_CANCELLED";
    } else if (!user.tranzilaToken) {
        blockedReason = "BLOCKED_TOKEN_ABSENT";
    } else if (!tokenMetaValid) {
        blockedReason = "BLOCKED_TOKEN_META_INVALID";
    } else if (!tokenNotExpiredByMeta) {
        blockedReason = "BLOCKED_TOKEN_EXPIRED_BY_META";
    }

    const userOut = {
        userId: String(user._id),
        email: user.email,
        plan: user.plan,
        subscriptionStatus: subscription.status ?? null,
        subscriptionExpiresAt,
        stoStatus,
        stoIdPresent,
        stoIdLast4,
        tokenPresent: Boolean(user.tranzilaToken),
        tokenMetaPresent,
        tokenMetaValid,
        tokenNotExpiredByMeta,
        expectedAmountAgorot,
        currentPlanAmountAgorot,
    };

    if (blockedReason) {
        console.log(
            JSON.stringify(
                {
                    mode: EXECUTE ? "EXECUTE" : "DRY_RUN",
                    dbName,
                    terminalLooksProduction,
                    dbLooksProduction,
                    requiresProdAllow,
                    warnings,
                    user: userOut,
                    result: {
                        ok: false,
                        skipped: true,
                        reason: blockedReason,
                    },
                },
                null,
                2,
            ),
        );
        process.exitCode = 1;
        return;
    }

    if (!EXECUTE) {
        console.log(
            JSON.stringify(
                {
                    mode: "DRY_RUN",
                    dbName,
                    terminalLooksProduction,
                    dbLooksProduction,
                    requiresProdAllow,
                    warnings,
                    user: userOut,
                    result: {
                        ok: true,
                        wouldCreate: true,
                    },
                },
                null,
                2,
            ),
        );
        process.exitCode = 0;
        return;
    }

    const result = await createTranzilaStoForUser(
        user,
        user.plan,
        user.subscription.expiresAt,
        { allowRecreateAfterCancel: true },
    );

    const newStoIdLast4 = user.tranzilaSto?.stoId
        ? String(user.tranzilaSto.stoId).slice(-4)
        : null;

    console.log(
        JSON.stringify(
            {
                mode: "EXECUTE",
                dbName,
                terminalLooksProduction,
                dbLooksProduction,
                requiresProdAllow,
                warnings,
                user: userOut,
                result: {
                    ok: result.ok === true,
                    created: result.created ?? false,
                    skipped: result.skipped ?? false,
                    reason: result.reason ?? null,
                    errorCode: result.errorCode ?? null,
                    errorMessage: result.errorMessage ?? null,
                    stoIdPresent: Boolean(user.tranzilaSto?.stoId),
                    newStoIdLast4,
                },
            },
            null,
            2,
        ),
    );

    process.exitCode = result.ok === true ? 0 : 1;
}

try {
    await main();
} catch (err) {
    console.log(
        JSON.stringify(
            {
                ok: false,
                error: err?.message ?? "unexpected_error",
            },
            null,
            2,
        ),
    );
    process.exitCode = 1;
} finally {
    await mongoose.disconnect();
}
