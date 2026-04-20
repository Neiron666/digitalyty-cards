/**
 * sto-create-custom-date.mjs
 *
 * PURPOSE:
 *   Permanent operator script for controlled sandbox STO creation with a
 *   custom first_charge_date. Used in E2E acceleration scenarios where the
 *   normal TRANZILA_STO_CREATE_ENABLED=false gate is intentionally disabled
 *   and the operator needs to attach a near-term STO to a freshly paid user.
 *
 *   Routes through the production createTranzilaStoForUser() function — same
 *   request body, same idempotency guards, same Mongo write-ahead pattern.
 *   Does NOT duplicate Tranzila request body construction.
 *   Does NOT call Tranzila directly.
 *
 * INVARIANTS (never violated):
 *   - Dry-run by default — no API call, no Mongo write unless --execute.
 *   - --run is required even for dry-run (prevents accidental execution).
 *   - --execute requires --i-understand-sto-api-call.
 *   - Production terminals (/^fxp/i) are blocked in execute mode unless --allow-prod.
 *   - Only for fresh paid users with no existing STO (status != "created",
 *     stoId absent, status != "cancelled"). No force-after-cancel.
 *   - Never prints: tranzilaToken, expMonth, expYear values, raw stoId,
 *     API keys, HMAC, request body, raw response body, full user document.
 *   - Output is sanitized booleans/enums/dates only.
 *
 * USAGE:
 *   node scripts/sto-create-custom-date.mjs [options]
 *
 * REQUIRED (always):
 *   --run                              Safety gate — prevents accidental launch
 *   --email=<email>                    Target user (normalized to lowercase)
 *   --first-charge-date=YYYY-MM-DD     First STO charge date (must be future)
 *
 * REQUIRED (with --execute):
 *   --execute                          Enable real Tranzila API call + Mongo write
 *   --i-understand-sto-api-call        Explicit operator acknowledgment
 *
 * OPTIONAL:
 *   --allow-prod                       Override production terminal block
 *
 * DRY-RUN EXAMPLES:
 *   node scripts/sto-create-custom-date.mjs --run \
 *       --email=user@example.com --first-charge-date=2026-04-22
 *
 * EXECUTE EXAMPLES:
 *   node scripts/sto-create-custom-date.mjs --run --execute \
 *       --i-understand-sto-api-call \
 *       --email=user@example.com --first-charge-date=2026-04-22
 */

import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import User from "../src/models/User.model.js";
import { TRANZILA_CONFIG } from "../src/config/tranzila.js";
import { createTranzilaStoForUser } from "../src/services/payment/tranzila.provider.js";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Terminals matching this pattern are treated as production — blocked in execute without --allow-prod. */
const PROD_TERMINAL_PATTERN = /^fxp/i;

/**
 * Minimum future buffer: first_charge_date must be at least this many ms
 * ahead of now. 2 hours gives timezone safety for same-day "tomorrow" edge.
 */
const MIN_FUTURE_BUFFER_MS = 2 * 60 * 60 * 1000;

// ── Arg helpers ───────────────────────────────────────────────────────────────

function hasFlag(name) {
    return process.argv.slice(2).includes(name);
}

function getFlagValue(name) {
    const argv = process.argv.slice(2);
    const eqArg = argv.find((a) => a.startsWith(name + "="));
    if (eqArg) return eqArg.slice(name.length + 1);
    const idx = argv.indexOf(name);
    if (
        idx !== -1 &&
        idx + 1 < argv.length &&
        !argv[idx + 1].startsWith("--")
    ) {
        return argv[idx + 1];
    }
    return null;
}

// ── Usage guard (pre-connect) ─────────────────────────────────────────────────

if (!hasFlag("--run")) {
    console.log(
        JSON.stringify(
            {
                error: "MISSING_RUN_FLAG",
                usage:
                    "node scripts/sto-create-custom-date.mjs --run " +
                    "--email=<email> --first-charge-date=YYYY-MM-DD [--execute --i-understand-sto-api-call] [--allow-prod]",
                description:
                    "Operator script for controlled custom-date STO creation. " +
                    "Dry-run by default. --execute requires --i-understand-sto-api-call.",
                requiredFlags: [
                    "--run",
                    "--email=<email>",
                    "--first-charge-date=YYYY-MM-DD",
                ],
                executeFlags: ["--execute", "--i-understand-sto-api-call"],
                optionalFlags: ["--allow-prod"],
            },
            null,
            2,
        ),
    );
    process.exit(1);
}

// ── Pre-connect validation ────────────────────────────────────────────────────

const rawEmail = getFlagValue("--email");
if (!rawEmail || !rawEmail.trim()) {
    console.error(
        JSON.stringify(
            {
                error: "BLOCKED_MISSING_EMAIL",
                detail: "--email=<email> is required",
            },
            null,
            2,
        ),
    );
    process.exit(1);
}
const normalizedEmail = rawEmail.trim().toLowerCase();

const rawFirstChargeDate = getFlagValue("--first-charge-date");
if (!rawFirstChargeDate || !rawFirstChargeDate.trim()) {
    console.error(
        JSON.stringify(
            {
                error: "BLOCKED_MISSING_FIRST_CHARGE_DATE",
                detail: "--first-charge-date=YYYY-MM-DD is required",
            },
            null,
            2,
        ),
    );
    process.exit(1);
}

const FIRST_CHARGE_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
if (!FIRST_CHARGE_DATE_RE.test(rawFirstChargeDate.trim())) {
    console.error(
        JSON.stringify(
            {
                error: "BLOCKED_INVALID_FIRST_CHARGE_DATE",
                detail: `--first-charge-date must be YYYY-MM-DD format, got: ${rawFirstChargeDate}`,
            },
            null,
            2,
        ),
    );
    process.exit(1);
}

// Parse as UTC midnight
const parsedFirstChargeDate = new Date(
    rawFirstChargeDate.trim() + "T00:00:00.000Z",
);
if (!Number.isFinite(parsedFirstChargeDate.getTime())) {
    console.error(
        JSON.stringify(
            {
                error: "BLOCKED_INVALID_FIRST_CHARGE_DATE",
                detail: "Date could not be parsed to a valid Date object",
            },
            null,
            2,
        ),
    );
    process.exit(1);
}

if (parsedFirstChargeDate.getTime() <= Date.now() + MIN_FUTURE_BUFFER_MS) {
    console.error(
        JSON.stringify(
            {
                error: "BLOCKED_FIRST_CHARGE_DATE_NOT_FUTURE",
                detail: `--first-charge-date must be at least 2 hours in the future. Got: ${rawFirstChargeDate}. Prefer D+1 or D+2.`,
            },
            null,
            2,
        ),
    );
    process.exit(1);
}

const isExecute = hasFlag("--execute");
const hasAck = hasFlag("--i-understand-sto-api-call");
const allowProd = hasFlag("--allow-prod");

if (isExecute && !hasAck) {
    console.error(
        JSON.stringify(
            {
                error: "BLOCKED_MISSING_ACK",
                detail: "--execute requires --i-understand-sto-api-call to be provided explicitly",
            },
            null,
            2,
        ),
    );
    process.exit(1);
}

if (!process.env.MONGO_URI) {
    console.error(
        JSON.stringify(
            {
                error: "BLOCKED_MISSING_MONGO_URI",
                detail: "MONGO_URI is not set in environment",
            },
            null,
            2,
        ),
    );
    process.exit(1);
}

// ── Main ──────────────────────────────────────────────────────────────────────

mongoose.set("autoIndex", false);
mongoose.set("autoCreate", false);

async function main() {
    await connectDB(process.env.MONGO_URI);

    try {
        const dbName = mongoose.connection.db.databaseName;

        // ── Production terminal gate ──────────────────────────────────────────
        const terminalLooksProduction = PROD_TERMINAL_PATTERN.test(
            TRANZILA_CONFIG.stoTerminal || "",
        );

        if (isExecute && terminalLooksProduction && !allowProd) {
            console.error(
                JSON.stringify(
                    {
                        error: "BLOCKED_PRODUCTION_TERMINAL",
                        detail: `TRANZILA_CONFIG.stoTerminal matches production pattern (/^fxp/i). Add --allow-prod to override.`,
                        terminalLooksProduction: true,
                    },
                    null,
                    2,
                ),
            );
            process.exit(1);
        }

        if (!isExecute && terminalLooksProduction) {
            // Dry-run: warn but do not block.
            console.warn(
                JSON.stringify(
                    {
                        warning: "PRODUCTION_TERMINAL_DETECTED_DRY_RUN",
                        detail: "stoTerminal looks like a production terminal. Execute would be blocked without --allow-prod.",
                        terminalLooksProduction: true,
                    },
                    null,
                    2,
                ),
            );
        }

        // ── User lookup (full Mongoose doc, not lean) ─────────────────────────
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            console.error(
                JSON.stringify(
                    { error: "BLOCKED_USER_NOT_FOUND", email: normalizedEmail },
                    null,
                    2,
                ),
            );
            process.exit(1);
        }

        // ── User validation ───────────────────────────────────────────────────

        if (user.plan !== "monthly" && user.plan !== "yearly") {
            console.error(
                JSON.stringify(
                    {
                        error: "BLOCKED_INVALID_PLAN",
                        detail: `user.plan must be "monthly" or "yearly". Got: ${user.plan ?? "null"}`,
                    },
                    null,
                    2,
                ),
            );
            process.exit(1);
        }

        if (user.subscription?.status !== "active") {
            console.error(
                JSON.stringify(
                    {
                        error: "BLOCKED_SUBSCRIPTION_NOT_ACTIVE",
                        detail: `user.subscription.status must be "active". Got: ${user.subscription?.status ?? "null"}`,
                    },
                    null,
                    2,
                ),
            );
            process.exit(1);
        }

        if (user.subscription?.provider !== "tranzila") {
            console.error(
                JSON.stringify(
                    {
                        error: "BLOCKED_SUBSCRIPTION_PROVIDER_NOT_TRANZILA",
                        detail: `user.subscription.provider must be "tranzila". Got: ${user.subscription?.provider ?? "null"}`,
                    },
                    null,
                    2,
                ),
            );
            process.exit(1);
        }

        if (!user.tranzilaToken) {
            console.error(
                JSON.stringify(
                    {
                        error: "BLOCKED_TOKEN_ABSENT",
                        detail: "user.tranzilaToken is absent or empty",
                    },
                    null,
                    2,
                ),
            );
            process.exit(1);
        }

        const expMonth = user.tranzilaTokenMeta?.expMonth;
        const expYear = user.tranzilaTokenMeta?.expYear;

        if (!Number.isInteger(expMonth) || expMonth < 1 || expMonth > 12) {
            console.error(
                JSON.stringify(
                    {
                        error: "BLOCKED_TOKEN_META_INVALID_EXP_MONTH",
                        detail: "tranzilaTokenMeta.expMonth is invalid",
                    },
                    null,
                    2,
                ),
            );
            process.exit(1);
        }

        if (!Number.isInteger(expYear) || expYear < 2020 || expYear > 2099) {
            console.error(
                JSON.stringify(
                    {
                        error: "BLOCKED_TOKEN_META_INVALID_EXP_YEAR",
                        detail: "tranzilaTokenMeta.expYear is invalid",
                    },
                    null,
                    2,
                ),
            );
            process.exit(1);
        }

        const stoStatus = user.tranzilaSto?.status ?? null;
        const stoIdPresent = Boolean(user.tranzilaSto?.stoId);

        if (stoStatus === "created") {
            console.error(
                JSON.stringify(
                    {
                        error: "BLOCKED_STO_ALREADY_CREATED",
                        detail: 'tranzilaSto.status is already "created". This script is for fresh users with no existing STO.',
                        stoStatus,
                        stoIdPresent,
                    },
                    null,
                    2,
                ),
            );
            process.exit(1);
        }

        if (stoIdPresent) {
            console.error(
                JSON.stringify(
                    {
                        error: "BLOCKED_STO_ID_PRESENT",
                        detail: "tranzilaSto.stoId is present. This script is for fresh users with no existing STO.",
                        stoStatus,
                        stoIdPresent,
                    },
                    null,
                    2,
                ),
            );
            process.exit(1);
        }

        if (stoStatus === "cancelled") {
            console.error(
                JSON.stringify(
                    {
                        error: "BLOCKED_STO_CANCELLED",
                        detail: 'tranzilaSto.status is "cancelled". This script does not support force-after-cancel.',
                        stoStatus,
                    },
                    null,
                    2,
                ),
            );
            process.exit(1);
        }

        // ── Sanitized user block for output ───────────────────────────────────
        const userOut = {
            userIdPresent: Boolean(user._id),
            email: user.email,
            plan: user.plan,
            subscriptionStatus: user.subscription?.status ?? null,
            subscriptionProvider: user.subscription?.provider ?? null,
            tokenPresent: true,
            tokenMetaValid: true,
            stoStatus,
            stoIdPresent,
        };

        // ── Dry-run path ──────────────────────────────────────────────────────
        if (!isExecute) {
            console.log(
                JSON.stringify(
                    {
                        mode: "DRY_RUN",
                        dbName,
                        terminalLooksProduction,
                        user: userOut,
                        firstChargeDate: rawFirstChargeDate.trim(),
                        result: {
                            ok: true,
                            wouldCreate: true,
                            classification: "READY_FOR_CUSTOM_DATE_STO_CREATE",
                        },
                    },
                    null,
                    2,
                ),
            );
            return;
        }

        // ── Execute path ──────────────────────────────────────────────────────
        const r = await createTranzilaStoForUser(
            user,
            user.plan,
            parsedFirstChargeDate,
        );

        console.log(
            JSON.stringify(
                {
                    mode: "EXECUTE",
                    dbName,
                    terminalLooksProduction,
                    user: userOut,
                    firstChargeDate: rawFirstChargeDate.trim(),
                    result: {
                        ok: r?.ok ?? false,
                        created: r?.created ?? false,
                        skipped: r?.skipped ?? false,
                        reason: r?.reason ?? null,
                        errorCode: r?.errorCode ?? null,
                        errorMessage: r?.errorMessage ?? null,
                        stoIdPresent: Boolean(user.tranzilaSto?.stoId),
                    },
                },
                null,
                2,
            ),
        );
    } finally {
        await mongoose.disconnect();
    }
}

main().catch((err) => {
    console.error(
        JSON.stringify({ error: "FATAL", detail: err.message }, null, 2),
    );
    process.exit(1);
});
