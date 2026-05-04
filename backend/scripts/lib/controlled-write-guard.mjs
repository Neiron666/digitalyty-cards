/**
 * controlled-write-guard.mjs
 *
 * Shared safety guard for all controlled-write backend sanity scripts.
 * Fails closed if MONGO_URI points to a production-like target (by dbName or NODE_ENV).
 * Never prints the full URI, credentials, or secrets.
 *
 * Anti-drift policy (ENFORCED):
 *   - Every controlled-write sanity script MUST call assertControlledWriteSanityTarget()
 *     before mongoose.connect / connectDB or any external storage mutation.
 *   - Read-only / index-drift scripts must NOT import this file.
 *   - No controlled-write script may replicate this production-like DB detection logic.
 *   - Any future controlled-write sanity script must import and call this guard.
 */

const OVERRIDE_ENV =
    "CARDIGO_ALLOW_CONTROLLED_WRITE_SANITY_ON_PRODUCTION_LIKE_DB";
const OVERRIDE_VALUE = "I_UNDERSTAND_THIS_CAN_WRITE_TEST_FIXTURES";

/**
 * Asserts that the current MONGO_URI is safe for a controlled-write sanity script.
 *
 * Synchronous — no DB connection, no await.
 * Safe to call at module top-level or as the first statement inside async main()
 * before any mongoose.connect / connectDB call.
 *
 * Production-like detection rules (ANY match triggers guard):
 *   - dbName === "cardigo_prod"
 *   - dbName.toLowerCase().includes("prod")
 *   - dbName === "(unparseable)"  — multi-host replica-set or malformed URI
 *   - dbName === "(empty-db-name)"  — URI without a DB path segment
 *   - process.env.NODE_ENV === "production"
 *
 * Override: set CARDIGO_ALLOW_CONTROLLED_WRITE_SANITY_ON_PRODUCTION_LIKE_DB
 * to the exact value I_UNDERSTAND_THIS_CAN_WRITE_TEST_FIXTURES (no other values accepted).
 *
 * @param {string} scriptName  Canonical script name, e.g. "sanity:analytics"
 */
export function assertControlledWriteSanityTarget(scriptName) {
    const mongoUri = process.env.MONGO_URI;

    // 1. Missing or blank MONGO_URI — fail closed.
    if (!mongoUri || !String(mongoUri).trim()) {
        throw new Error(
            `CONTROLLED_WRITE_GUARD: MONGO_URI is required for controlled-write ` +
                `sanity script "${scriptName}". ` +
                `Set MONGO_URI to a safe local or staging DB before running this script.`,
        );
    }

    // 2. Parse URI — extract only safe fields (hostname and db path).
    //    Never use or log username, password, search params, or full URI.
    let dbName;
    let safeHostHint;

    try {
        const url = new URL(mongoUri);
        // pathname is "/<dbname>" or "" for URIs without a DB path segment.
        // .split("?") is a defensive extra guard for any edge-case path encoding.
        const rawDb = url.pathname.slice(1).split("?")[0].trim();
        dbName = rawDb || "(empty-db-name)";
        safeHostHint = url.hostname || "(unknown-host)";
    } catch {
        // new URL() throws on multi-host replica-set URIs (comma-separated hosts)
        // and on malformed URIs. Both are treated as production-like — fail closed.
        dbName = "(unparseable)";
        safeHostHint = "(unparseable-uri)";
    }

    const nodeEnv = process.env.NODE_ENV || "(not-set)";

    // 3. Determine if the target DB is production-like.
    //    Any single condition is sufficient to trigger the block.
    const productionLike =
        dbName === "cardigo_prod" ||
        dbName.toLowerCase().includes("prod") ||
        dbName === "(unparseable)" ||
        dbName === "(empty-db-name)" ||
        process.env.NODE_ENV === "production";

    // 4. Safe target — log and return.
    if (!productionLike) {
        console.log(
            `CONTROLLED_WRITE_GUARD: OK — ${scriptName}; ` +
                `dbName=${dbName}; host=${safeHostHint}; nodeEnv=${nodeEnv}`,
        );
        return;
    }

    // 5. Production-like target — require explicit override.
    const override = process.env[OVERRIDE_ENV];

    if (override === OVERRIDE_VALUE) {
        // Override is set correctly — warn loudly and allow.
        console.warn(
            `CONTROLLED_WRITE_GUARD: *** OVERRIDE ACTIVE *** for production-like DB.\n` +
                `script=${scriptName} | dbName=${dbName} | ` +
                `host=${safeHostHint} | NODE_ENV=${nodeEnv}\n` +
                `Test fixtures WILL be written and cleaned up. ` +
                `Ensure this is a safe disposable target — not real production.`,
        );
        return;
    }

    // 6. No valid override — fail closed. Never print full URI.
    throw new Error(
        `CONTROLLED_WRITE_GUARD: blocked controlled-write sanity script "${scriptName}" ` +
            `because target DB is production-like.\n` +
            `dbName: ${dbName} | host: ${safeHostHint} | NODE_ENV: ${nodeEnv}\n` +
            `To unblock: set env ${OVERRIDE_ENV}=${OVERRIDE_VALUE}\n` +
            `WARNING: Only use this on a disposable dev/staging DB. ` +
            `Controlled-write sanity scripts create and delete test fixtures — ` +
            `never run them against real production data.`,
    );
}
