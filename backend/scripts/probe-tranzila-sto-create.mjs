/**
 * probe-tranzila-sto-create.mjs
 *
 * Tranzila STO portability probe — resolves architectural gate U1.
 *
 * PURPOSE:
 *   Verify whether a TranzilaTK captured on the clearing terminal (testcards)
 *   is accepted by the Tranzila STO API on the token terminal (testcardstok).
 *   This is a SANDBOX DIAGNOSTIC ONLY — not STO implementation.
 *
 * INVARIANTS (never violated by this script):
 *   - Zero writes to our MongoDB (read-only User lookup only)
 *   - No changes to payment runtime code
 *   - No routes, controllers, providers, or models touched
 *   - Safe-by-default: requires --execute for real HTTP call
 *
 * AUTH HARNESS (Tranzila v2, investigation mode):
 *   Use --auth-variant and --nonce-format to test whitelisted auth combinations.
 *   Default (no flags) = original formula: HMAC-SHA256(privateKey, appKey:nonce:requestTime), hex, 80-char hex nonce.
 *
 *   Whitelisted auth variants:
 *     current                — HMAC-SHA256(key=privateKey, msg=appKey:nonce:requestTime), digest=hex
 *     order_swap             — HMAC-SHA256(key=privateKey, msg=appKey:requestTime:nonce), digest=hex
 *     no_colons              — HMAC-SHA256(key=privateKey, msg=appKey+nonce+requestTime), digest=hex
 *     base64_digest          — same message as current, digest=base64
 *     literal_msg_concat_hex — HMAC-SHA256(key=privateKey, msg=appKey+requestTime+nonce), digest=hex
 *                              [provider-literal interpretation A — no delimiters, provider field order]
 *     literal_msg_concat_base64 — same message as literal_msg_concat_hex, digest=base64
 *     literal_php_interp_hex — HMAC-SHA256(key=privateKey+requestTime+nonce, msg=appKey), digest=hex
 *                              [provider-literal interpretation B — PHP hash_hmac('sha256', appKey, key)]
 *     literal_php_interp_base64 — same as literal_php_interp_hex, digest=base64
 *
 *   Whitelisted nonce formats:
 *     current — crypto.randomBytes(40).toString("hex") → 80-char hex
 *     uuid    — crypto.randomUUID() → 36-char UUID
 *
 *   Each run tests exactly ONE combination. No auto-iteration.
 *   If non-401 is returned, record the winning variant and stop.
 *   If all whitelisted combinations return 401, next step is provider confirmation.
 *
 * SECRETS POLICY:
 *   Never prints: TranzilaTK value, APP_KEY, PRIVATE_KEY, PW, raw HMAC/access-token, API username.
 *   Prints only:  tokenPresent boolean, apiUsernamePresent boolean, terminal, auth diagnostics, price, dates, HTTP status, raw response.
 *
 * Usage:
 *   node scripts/probe-tranzila-sto-create.mjs --help
 *   node scripts/probe-tranzila-sto-create.mjs --dry-run \
 *       --user-email=support@cardigo.co.il --exp-month=12 --exp-year=2030 \
 *       --plan=monthly --first-charge-date=2026-05-01
 *   node scripts/probe-tranzila-sto-create.mjs --execute \
 *       --user-email=support@cardigo.co.il --exp-month=MM --exp-year=YYYY \
 *       --plan=monthly --first-charge-date=YYYY-MM-DD
 */

import "dotenv/config";

import crypto from "node:crypto";
import mongoose from "mongoose";

import { connectDB } from "../src/config/db.js";
import User from "../src/models/User.model.js";
import { TRANZILA_CONFIG } from "../src/config/tranzila.js";
import { PRICES_AGOROT } from "../src/config/plans.js";

// ── Constants ────────────────────────────────────────────────────────────────

/** Terminals matching this pattern are treated as production — blocked unless --allow-prod. */
const PROD_TERMINAL_PATTERN = /^fxp/i;

// ── Help ──────────────────────────────────────────────────────────────────────

function printHelp() {
    console.log(`
probe-tranzila-sto-create.mjs — Tranzila STO portability probe (U1 resolution)

PURPOSE
  Verify whether a TranzilaTK captured on the clearing terminal (testcards) is
  accepted by the STO API on the token terminal (testcardstok). Resolves gate U1.
  This is a sandbox diagnostic only — NOT STO implementation.

USAGE
  node scripts/probe-tranzila-sto-create.mjs [options]

REQUIRED (identity — exactly one)
  --user-email=<email>           Look up user by email address
  --user-id=<mongoId>            Look up user by MongoDB ObjectId

REQUIRED (card expiry)
  --exp-month=<MM>               Card expiry month (1–12)
  --exp-year=<YYYY>              Card expiry year (e.g. 2030)

EXECUTION MODE (default: dry-run)
  --dry-run                      Connect to DB, resolve user, build body, print summary — no HTTP
  --execute                      Perform real HTTP POST to Tranzila STO API sandbox

REQUIRED FOR --execute
  --first-charge-date=YYYY-MM-DD First STO charge date (day clamped 1–28 for charge_dom)

OPTIONAL
  --plan=monthly|yearly          Plan to probe (default: monthly)
  --card-holder-id=<id>          Cardholder national ID
  --card-holder-name=<name>      Cardholder name
  --allow-prod                   Allow probe against production-like terminals (fxp*)
  --help                         Print this usage and exit 0

USERNAME INVESTIGATION (for resolving 401 when provider requires API username)
  --api-username=<value>         API username from Tranzila (never printed in output)
  --username-mode=<mode>         Where to include the API username (default: none)
                                   none    Do not include username — preserves existing behavior
                                   header  Add X-tranzila-api-username request header
                                   body    Add api_username field to request body
                                   both    Add both header and body field
  Note: --api-username is required when --username-mode is not "none".
        Username value is never printed; only apiUsernamePresent: true/false is reported.

AUTH INVESTIGATION (bounded whitelist — for resolving 401)
  --auth-variant=<variant>       Auth formula variant (default: current)
    Colon-delimited variants (originally probed):
      current                HMAC(key=privateKey, msg=appKey:nonce:requestTime) hex
      order_swap             HMAC(key=privateKey, msg=appKey:requestTime:nonce) hex
      no_colons              HMAC(key=privateKey, msg=appKey+nonce+requestTime) hex  [wrong order vs provider]
      base64_digest          HMAC(key=privateKey, msg=appKey:nonce:requestTime) base64
    Provider-literal variants (interpretation A — msg-concat, provider field order):
      literal_msg_concat_hex        HMAC(key=privateKey, msg=appKey+requestTime+nonce) hex
      literal_msg_concat_base64     HMAC(key=privateKey, msg=appKey+requestTime+nonce) base64
    Provider-literal variants (interpretation B — PHP hash_hmac literal key-concat):
      literal_php_interp_hex        HMAC(key=privateKey+requestTime+nonce, msg=appKey) hex
      literal_php_interp_base64     HMAC(key=privateKey+requestTime+nonce, msg=appKey) base64
    Postman-canonical alias (same topology as literal_php_interp_hex):
      postman_canonical             HMAC(key=privateKey+requestTime+nonce, msg=appKey) hex
                                    Use with --request-time-unit=seconds --nonce-format=postman
  --nonce-format=<format>        Nonce generation format (default: current)
                                   current      crypto.randomBytes(40).toString("hex") — 80-char hex
                                   uuid         crypto.randomUUID() — 36-char UUID
                                   postman      80-char alphanumeric (A-Za-z0-9) — matches Tranzila Postman example
  --request-time-unit=<unit>     Request time unit for X-tranzila-api-request-time (default: ms)
                                   ms           String(Date.now()) — 13-digit milliseconds [existing behavior]
                                   seconds      String(Math.round(Date.now()/1000)) — 10-digit Unix seconds [Postman canonical]

  Each run tests exactly ONE combination. No auto-iteration.
  If a non-401 response is received, record the winning variant and stop.
  If all whitelisted combinations return 401, next step is provider confirmation.

ENVIRONMENT
  Reads backend/.env automatically. Required vars:
    MONGO_URI, TRANZILA_STO_TERMINAL, TRANZILA_STO_API_URL,
    TRANZILA_API_APP_KEY, TRANZILA_API_PRIVATE_KEY

OUTPUT
  Prints redacted probe summary. With --execute: raw HTTP status and response body.
  Secrets (token, app key, private key) are never printed.

VERDICT CODES
  U1 RESOLVED  — Token is portable; STO accepted by token terminal (2xx)
  AUTH FAILURE — HMAC auth rejected (401/403); verify v2 formula
  U1 REJECTED  — Token not portable or terminal mismatch (4xx with rejection signal)
  INCONCLUSIVE — Inspect raw response
`);
}

// ── Arg parsing ───────────────────────────────────────────────────────────────

// Whitelisted auth variants, nonce formats, and time units — do NOT extend without a new contour.
const AUTH_VARIANTS = [
    // Colon-delimited variants (probed in run 1-3)
    "current",
    "order_swap",
    "no_colons",
    "base64_digest",
    // Provider-literal variants (interpretation A: HMAC(key=privateKey, msg=appKey+requestTime+nonce))
    "literal_msg_concat_hex",
    "literal_msg_concat_base64",
    // Provider-literal variants (interpretation B: HMAC(key=privateKey+requestTime+nonce, msg=appKey))
    "literal_php_interp_hex",
    "literal_php_interp_base64",
    // Postman-canonical alias — same topology as literal_php_interp_hex, use with seconds+postman nonce
    "postman_canonical",
];
const NONCE_FORMATS = ["current", "uuid", "postman"];
const TIME_UNITS = ["ms", "seconds"];
const USERNAME_MODES = ["none", "header", "body", "both"];

function parseArgs(argv) {
    const args = {
        userEmail: null,
        userId: null,
        expMonth: null,
        expYear: null,
        plan: "monthly",
        firstChargeDate: null,
        cardHolderId: null,
        cardHolderName: null,
        allowProd: false,
        dryRun: true, // safe-by-default: must explicitly pass --execute
        execute: false,
        help: false,
        authVariant: "current", // default preserves existing behavior exactly
        nonceFormat: "current", // default preserves existing behavior exactly
        requestTimeUnit: "ms", // default preserves existing 13-digit ms behavior
        apiUsername: null, // never printed; used only when usernameMode != none
        usernameMode: "none", // default: do not send username — preserves prior behavior
    };

    for (const tok of argv.slice(2)) {
        if (tok === "--help" || tok === "-h") {
            args.help = true;
        } else if (tok === "--dry-run") {
            args.dryRun = true;
            args.execute = false;
        } else if (tok === "--execute") {
            args.execute = true;
            args.dryRun = false;
        } else if (tok === "--allow-prod") {
            args.allowProd = true;
        } else if (tok.startsWith("--user-email=")) {
            args.userEmail = tok.slice("--user-email=".length).trim();
        } else if (tok.startsWith("--user-id=")) {
            args.userId = tok.slice("--user-id=".length).trim();
        } else if (tok.startsWith("--exp-month=")) {
            args.expMonth = tok.slice("--exp-month=".length).trim();
        } else if (tok.startsWith("--exp-year=")) {
            args.expYear = tok.slice("--exp-year=".length).trim();
        } else if (tok.startsWith("--plan=")) {
            args.plan = tok.slice("--plan=".length).trim();
        } else if (tok.startsWith("--first-charge-date=")) {
            args.firstChargeDate = tok
                .slice("--first-charge-date=".length)
                .trim();
        } else if (tok.startsWith("--card-holder-id=")) {
            args.cardHolderId = tok.slice("--card-holder-id=".length).trim();
        } else if (tok.startsWith("--card-holder-name=")) {
            args.cardHolderName = tok
                .slice("--card-holder-name=".length)
                .trim();
        } else if (tok.startsWith("--auth-variant=")) {
            args.authVariant = tok.slice("--auth-variant=".length).trim();
        } else if (tok.startsWith("--nonce-format=")) {
            args.nonceFormat = tok.slice("--nonce-format=".length).trim();
        } else if (tok.startsWith("--api-username=")) {
            args.apiUsername = tok.slice("--api-username=".length).trim();
        } else if (tok.startsWith("--username-mode=")) {
            args.usernameMode = tok.slice("--username-mode=".length).trim();
        } else if (tok.startsWith("--request-time-unit=")) {
            args.requestTimeUnit = tok
                .slice("--request-time-unit=".length)
                .trim();
        } else {
            console.error(`[WARN] Unknown argument: ${tok}`);
        }
    }

    // Enforce safe-by-default: if neither flag explicitly passed, treat as dry-run.
    if (!args.execute) args.dryRun = true;

    return args;
}

// ── Input validation ──────────────────────────────────────────────────────────

function validateArgs(args) {
    const errs = [];

    if (!args.userEmail && !args.userId) {
        errs.push("One of --user-email or --user-id is required.");
    }
    if (args.userEmail && args.userId) {
        errs.push("--user-email and --user-id are mutually exclusive.");
    }
    if (!args.expMonth) errs.push("--exp-month is required.");
    if (!args.expYear) errs.push("--exp-year is required.");

    // Integer validation for card expiry — fail fast before request construction.
    if (args.expMonth) {
        const m = parseInt(args.expMonth, 10);
        if (!Number.isInteger(m) || m < 1 || m > 12) {
            errs.push(
                `--exp-month must be an integer 1–12. Got: "${args.expMonth}"`,
            );
        }
    }
    if (args.expYear) {
        const y = parseInt(args.expYear, 10);
        if (!Number.isInteger(y) || y < 2020 || y > 2040) {
            errs.push(
                `--exp-year must be an integer 2020–2040. Got: "${args.expYear}"`,
            );
        }
    }

    const validPlans = ["monthly", "yearly"];
    if (!validPlans.includes(args.plan)) {
        errs.push(
            `--plan must be one of: ${validPlans.join(", ")}. Got: "${args.plan}"`,
        );
    }

    if (args.execute && !args.firstChargeDate) {
        errs.push(
            "--first-charge-date=YYYY-MM-DD is required when using --execute.",
        );
    }

    if (
        args.firstChargeDate &&
        !/^\d{4}-\d{2}-\d{2}$/.test(args.firstChargeDate)
    ) {
        errs.push("--first-charge-date must be in YYYY-MM-DD format.");
    }

    // Strict whitelist validation — fail fast on unknown variants.
    if (!AUTH_VARIANTS.includes(args.authVariant)) {
        errs.push(
            `--auth-variant must be one of: ${AUTH_VARIANTS.join(", ")}. Got: "${args.authVariant}"`,
        );
    }
    if (!NONCE_FORMATS.includes(args.nonceFormat)) {
        errs.push(
            `--nonce-format must be one of: ${NONCE_FORMATS.join(", ")}. Got: "${args.nonceFormat}"`,
        );
    }
    if (!TIME_UNITS.includes(args.requestTimeUnit)) {
        errs.push(
            `--request-time-unit must be one of: ${TIME_UNITS.join(", ")}. Got: "${args.requestTimeUnit}"`,
        );
    }

    // Username mode validation.
    if (!USERNAME_MODES.includes(args.usernameMode)) {
        errs.push(
            `--username-mode must be one of: ${USERNAME_MODES.join(", ")}. Got: "${args.usernameMode}"`,
        );
    }
    // When username-mode is active, api-username is required.
    if (args.usernameMode !== "none" && !args.apiUsername) {
        errs.push(
            `--api-username is required when --username-mode is "${args.usernameMode}".`,
        );
    }

    return errs;
}

// ── Config/env validation ─────────────────────────────────────────────────────

function validateConfig(args) {
    const errs = [];
    const cfg = TRANZILA_CONFIG;

    const requiredFields = [
        ["stoTerminal", "TRANZILA_STO_TERMINAL"],
        ["stoApiUrl", "TRANZILA_STO_API_URL"],
        ["apiAppKey", "TRANZILA_API_APP_KEY"],
        ["apiPrivateKey", "TRANZILA_API_PRIVATE_KEY"],
    ];

    for (const [field, envName] of requiredFields) {
        const v = cfg[field];
        if (!v || v === "_TODO_") {
            errs.push(
                `${envName} is missing or not configured (current value: ${JSON.stringify(v ?? null)})`,
            );
        }
    }

    if (!process.env.MONGO_URI) {
        errs.push("MONGO_URI is not set.");
    }

    // Production safety gate — blocks accidental probes against production terminals.
    if (
        cfg.stoTerminal &&
        PROD_TERMINAL_PATTERN.test(cfg.stoTerminal) &&
        !args.allowProd
    ) {
        errs.push(
            `stoTerminal "${cfg.stoTerminal}" looks production-like (matches /^fxp/i). ` +
                "Pass --allow-prod to override. This probe is intended for sandbox use only.",
        );
    }

    return errs;
}

// ── Auth header builder ───────────────────────────────────────────────────────

/**
 * Build Tranzila v2 auth headers for one whitelisted variant.
 *
 * @param {string} appKey
 * @param {string} privateKey
 * @param {string} authVariant    — one of AUTH_VARIANTS
 * @param {string} nonceFormat    — one of NONCE_FORMATS
 * @param {string} requestTimeUnit — one of TIME_UNITS
 * @param {{ usernameMode: string, apiUsername: string|null }} usernameOpts
 * @returns {{ headers: object, diagnostics: object }}
 *   diagnostics contains non-secret observables only.
 *   Never include secret values (username, key, token, HMAC) in diagnostics.
 */
function buildAuthHeaders(
    appKey,
    privateKey,
    authVariant,
    nonceFormat,
    requestTimeUnit,
    usernameOpts,
) {
    // ── Request time (unit-controlled) ────────────────────────────────────────
    const requestTime =
        requestTimeUnit === "seconds"
            ? String(Math.round(Date.now() / 1000)) // 10-digit Unix seconds — Postman canonical
            : String(Date.now()); // 13-digit milliseconds — original behavior

    // ── Nonce generation (whitelisted formats only) ────────────────────────────
    let nonce;
    if (nonceFormat === "uuid") {
        nonce = crypto.randomUUID(); // 36-char UUID
    } else if (nonceFormat === "postman") {
        // 80 alphanumeric chars — matches Tranzila Postman makeid(80) example
        const charset =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        const bytes = crypto.randomBytes(80);
        nonce = Array.from(bytes, (b) => charset[b % charset.length]).join("");
    } else {
        // "current" — preserve original 80-char hex behavior
        nonce = crypto.randomBytes(40).toString("hex");
    }

    // ── HMAC key, message + digest (whitelisted variants only) ────────────────
    // hmacKey defaults to privateKey; literal_php_interp_* variants override it.
    let hmacKey;
    let message;
    let digestEncoding;

    switch (authVariant) {
        case "order_swap":
            // Colon-delimited, swap nonce/requestTime positions
            hmacKey = privateKey;
            message = `${appKey}:${requestTime}:${nonce}`;
            digestEncoding = "hex";
            break;
        case "no_colons":
            // Concatenate without delimiters — original order: appKey+nonce+requestTime
            hmacKey = privateKey;
            message = `${appKey}${nonce}${requestTime}`;
            digestEncoding = "hex";
            break;
        case "base64_digest":
            // Colon-delimited current message, base64 digest
            hmacKey = privateKey;
            message = `${appKey}:${nonce}:${requestTime}`;
            digestEncoding = "base64";
            break;
        case "literal_msg_concat_hex":
            // Provider-literal interpretation A:
            // hash_hmac('sha256', appKey+requestTime+nonce, privateKey) — provider field order, no delimiters, hex
            hmacKey = privateKey;
            message = `${appKey}${requestTime}${nonce}`;
            digestEncoding = "hex";
            break;
        case "literal_msg_concat_base64":
            // Provider-literal interpretation A, base64 digest
            hmacKey = privateKey;
            message = `${appKey}${requestTime}${nonce}`;
            digestEncoding = "base64";
            break;
        case "literal_php_interp_hex":
            // Provider-literal interpretation B (PHP hash_hmac literal reading):
            // hash_hmac('sha256', appKey, privateKey+requestTime+nonce)
            // i.e. data=appKey, key=privateKey+requestTime+nonce
            hmacKey = `${privateKey}${requestTime}${nonce}`;
            message = appKey;
            digestEncoding = "hex";
            break;
        case "literal_php_interp_base64":
            // Provider-literal interpretation B, base64 digest
            hmacKey = `${privateKey}${requestTime}${nonce}`;
            message = appKey;
            digestEncoding = "base64";
            break;
        case "postman_canonical":
            // Alias for literal_php_interp_hex — intended for use with
            // --request-time-unit=seconds --nonce-format=postman
            // Produces identical HMAC topology: data=appKey, key=privateKey+requestTime+nonce
            hmacKey = `${privateKey}${requestTime}${nonce}`;
            message = appKey;
            digestEncoding = "hex";
            break;
        case "current":
        default:
            // Original formula — default; must remain unchanged
            hmacKey = privateKey;
            message = `${appKey}:${nonce}:${requestTime}`;
            digestEncoding = "hex";
            break;
    }

    const accessToken = crypto
        .createHmac("sha256", hmacKey)
        .update(message)
        .digest(digestEncoding);

    const headers = {
        "X-tranzila-api-app-key": appKey,
        "X-tranzila-api-request-time": requestTime,
        "X-tranzila-api-nonce": nonce,
        "X-tranzila-api-access-token": accessToken,
        "Content-Type": "application/json",
        Accept: "application/json",
    };

    // Username header — added only when mode requires it. Value is never logged.
    if (
        (usernameOpts.usernameMode === "header" ||
            usernameOpts.usernameMode === "both") &&
        usernameOpts.apiUsername
    ) {
        headers["X-tranzila-api-username"] = usernameOpts.apiUsername;
    }

    // Non-secret diagnostics only — never include key/token/HMAC/username values.
    const diagnostics = {
        authVariant,
        nonceFormat,
        requestTimeUnit,
        requestTimeLength: requestTime.length,
        nonceLength: nonce.length,
        digestEncoding,
        usernameMode: usernameOpts.usernameMode,
        apiUsernamePresent: Boolean(usernameOpts.apiUsername),
    };

    return { headers, diagnostics };
}

// ── Request body builder ──────────────────────────────────────────────────────

function buildRequestBody(args, token, user) {
    const cfg = TRANZILA_CONFIG;

    // Use canonical price source — same PRICES_AGOROT used by tranzila.provider.js.
    const agorot = PRICES_AGOROT[args.plan];
    const unitPrice = agorot / 100; // convert agorot → ILS shekels

    // Derive charge_dom from first_charge_date (clamped to valid day-of-month range).
    let chargeDom = null;
    if (args.firstChargeDate) {
        const day = parseInt(args.firstChargeDate.split("-")[2], 10);
        chargeDom = Math.min(Math.max(day, 1), 28);
    }

    const planLabel =
        args.plan === "yearly"
            ? "Cardigo Premium - Yearly"
            : "Cardigo Premium - Monthly";

    const body = {
        terminal_name: cfg.stoTerminal,
        sto_payments_number: 1,
        charge_frequency: args.plan,
        currency_code: "ILS",
        response_language: "english",
        created_by_user: args.apiUsername || "cardigo-sto-portability-probe",
        items: [
            {
                name: planLabel,
                units_number: 1,
                unit_price: unitPrice,
            },
        ],
        card: {
            token: token, // TranzilaTK — never printed; inserted directly
            expire_month: parseInt(args.expMonth, 10),
            expire_year: parseInt(args.expYear, 10),
        },
    };

    if (args.firstChargeDate) {
        body.first_charge_date = args.firstChargeDate;
    }
    if (chargeDom !== null) {
        body.charge_dom = chargeDom;
    }

    // Optional card fields — included only when operator provides them.
    if (args.cardHolderId) body.card.card_holder_id = args.cardHolderId;
    if (args.cardHolderName) body.card.card_holder_name = args.cardHolderName;

    // Username body field — added only when mode requires it. Value is never logged.
    if (
        (args.usernameMode === "body" || args.usernameMode === "both") &&
        args.apiUsername
    ) {
        body.api_username = args.apiUsername;
    }

    // Client block: minimal safe fields from DB.
    const client = {};
    if (user.email) client.email = user.email;
    // name — try common variants defensively; User.model fields may vary.
    const name =
        user.name ||
        [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
        null;
    if (name) client.name = name;
    if (Object.keys(client).length > 0) {
        body.client = client;
    }

    return body;
}

// ── Redacted summary printer ──────────────────────────────────────────────────

function printSummary(args, user, body, diagnostics) {
    const agorot = PRICES_AGOROT[args.plan];
    console.log("\n────────────────────────────────────────────────────────");
    console.log("  PROBE SUMMARY (secrets redacted)");
    console.log("────────────────────────────────────────────────────────");
    console.log(
        `  mode:              ${args.execute ? "EXECUTE — real HTTP call" : "DRY-RUN — no HTTP call"}`,
    );
    console.log(`  stoTerminal:       ${TRANZILA_CONFIG.stoTerminal}`);
    console.log(`  stoApiUrl:         ${TRANZILA_CONFIG.stoApiUrl}`);
    console.log(`  userId:            ${user._id}`);
    console.log(`  userEmail:         ${user.email ?? "(not set)"}`);
    console.log(`  tokenPresent:      true`);
    // ── Username diagnostics (value never printed) ─────────────────────────────
    console.log(`  usernameMode:      ${diagnostics.usernameMode}`);
    console.log(`  apiUsernamePresent: ${diagnostics.apiUsernamePresent}`);
    // ── Auth diagnostics (non-secret) ─────────────────────────────────────────
    console.log(`  authVariant:       ${diagnostics.authVariant}`);
    console.log(`  nonceFormat:       ${diagnostics.nonceFormat}`);
    console.log(`  requestTimeUnit:   ${diagnostics.requestTimeUnit}`);
    console.log(`  requestTimeLength: ${diagnostics.requestTimeLength}`);
    console.log(`  nonceLength:       ${diagnostics.nonceLength}`);
    console.log(`  digestEncoding:    ${diagnostics.digestEncoding}`);
    // ── Probe fields ───────────────────────────────────────────────────────────
    console.log(`  plan:              ${args.plan}`);
    console.log(`  price (agorot):    ${agorot}`);
    console.log(`  price (ILS):       ₪${(agorot / 100).toFixed(2)}`);
    console.log(`  charge_frequency:  ${body.charge_frequency}`);
    console.log(
        `  first_charge_date: ${body.first_charge_date ?? "(not set — required for --execute)"}`,
    );
    console.log(`  charge_dom:        ${body.charge_dom ?? "(not set)"}`);
    console.log(`  expire_month:      ${body.card.expire_month}`);
    console.log(`  expire_year:       ${body.card.expire_year}`);
    if (body.card.card_holder_id)
        console.log(`  card_holder_id:    ${body.card.card_holder_id}`);
    if (body.card.card_holder_name)
        console.log(`  card_holder_name:  ${body.card.card_holder_name}`);
    if (body.client?.email)
        console.log(`  client.email:      ${body.client.email}`);
    if (body.client?.name)
        console.log(`  client.name:       ${body.client.name}`);
    console.log(
        "  [redacted: TranzilaTK, API_APP_KEY, API_PRIVATE_KEY, PW, raw HMAC, API_USERNAME]",
    );
    console.log("────────────────────────────────────────────────────────\n");
}

// ── Verdict emitter ───────────────────────────────────────────────────────────

function emitVerdict(status, rawBody, args) {
    const lower = rawBody.toLowerCase();

    if (status === 401 || status === 403) {
        console.log(
            `\n[VERDICT] AUTH FAILURE — Tranzila rejected the request with HTTP ${status}.`,
        );
        console.log(
            "          Verify v2 HMAC formula or provider-side API key enablement.",
        );
        console.log(
            "          Raw response above contains provider error detail.",
        );
        console.log(
            "          If all whitelisted variants return 401, next step is provider confirmation — not runtime coding.",
        );
        return "auth_failure";
    }

    if (status >= 200 && status < 300) {
        // Check whether 2xx body signals an application-level error.
        const bodyIndicatesError =
            lower.includes('"error"') ||
            lower.includes("error_code") ||
            lower.includes('"status":"error"') ||
            lower.includes('"status": "error"');

        if (!bodyIndicatesError) {
            console.log(
                `\n[VERDICT] U1 RESOLVED — Tranzila accepted the STO create request (HTTP ${status}).`,
            );
            console.log(
                `          WINNING VARIANT: authVariant=${args.authVariant} nonceFormat=${args.nonceFormat}`,
            );
            console.log(
                "          Token is portable across terminals. Record this combination before proceeding.",
            );
            return "resolved";
        }

        console.log(
            `\n[VERDICT] INCONCLUSIVE — HTTP ${status} but response body signals an application error.`,
        );
        console.log(
            "          Inspect raw response above for provider-level detail.",
        );
        return "inconclusive";
    }

    if (status >= 400 && status < 500) {
        const portabilitySignals = [
            "token",
            "tranzilaTK",
            "card",
            "payment",
            "terminal",
            "invalid",
            "not found",
            "not supported",
            "mismatch",
        ];
        const isPortabilityRejection = portabilitySignals.some((s) =>
            lower.includes(s.toLowerCase()),
        );

        if (isPortabilityRejection) {
            console.log(
                `\n[VERDICT] U1 REJECTED — Token not portable or terminal mismatch (HTTP ${status}).`,
            );
            console.log(
                "          The STO terminal rejected the token captured on the clearing terminal.",
            );
            console.log(
                "          Raw response above contains the provider rejection reason.",
            );
            return "rejected";
        }

        console.log(
            `\n[VERDICT] INCONCLUSIVE — HTTP ${status} with unclear rejection reason.`,
        );
        console.log("          Inspect raw response above.");
        return "inconclusive";
    }

    console.log(`\n[VERDICT] INCONCLUSIVE — Unexpected HTTP status ${status}.`);
    console.log("          Inspect raw response above.");
    return "inconclusive";
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    const args = parseArgs(process.argv);

    if (args.help) {
        printHelp();
        process.exit(0);
    }

    // ── Validate args ──────────────────────────────────────────────────────────
    const argErrs = validateArgs(args);
    if (argErrs.length) {
        for (const e of argErrs) console.error(`[ERROR] ${e}`);
        console.error("\nRun with --help for full usage.");
        process.exit(1);
    }

    // ── Validate config/env ────────────────────────────────────────────────────
    const cfgErrs = validateConfig(args);
    if (cfgErrs.length) {
        for (const e of cfgErrs) console.error(`[CONFIG ERROR] ${e}`);
        process.exit(1);
    }

    // ── DB connect ─────────────────────────────────────────────────────────────
    await connectDB(process.env.MONGO_URI);

    // ── User lookup (read-only) ────────────────────────────────────────────────
    let user;
    try {
        if (args.userId) {
            user = await User.findById(args.userId).lean();
        } else {
            user = await User.findOne({
                email: args.userEmail.trim().toLowerCase(),
            }).lean();
        }
    } catch (err) {
        console.error(`[ERROR] DB lookup failed: ${err.message}`);
        await mongoose.disconnect();
        process.exit(1);
    }

    if (!user) {
        console.error(
            `[ERROR] User not found: ${args.userEmail ?? args.userId}`,
        );
        await mongoose.disconnect();
        process.exit(1);
    }

    // ── Token check (fail closed) ──────────────────────────────────────────────
    if (!user.tranzilaToken) {
        console.error(
            `[ERROR] user.tranzilaToken is absent for ${user.email ?? String(user._id)}.`,
        );
        console.error(
            "        U1 cannot be tested — this user has not completed a first payment" +
                " that captured a TranzilaTK on the clearing terminal.",
        );
        await mongoose.disconnect();
        process.exit(1);
    }

    // ── Build request body ─────────────────────────────────────────────────────
    const body = buildRequestBody(args, user.tranzilaToken, user);

    // ── Build auth headers (with selected variant + username opts) ────────────
    const { headers, diagnostics } = buildAuthHeaders(
        TRANZILA_CONFIG.apiAppKey,
        TRANZILA_CONFIG.apiPrivateKey,
        args.authVariant,
        args.nonceFormat,
        args.requestTimeUnit,
        { usernameMode: args.usernameMode, apiUsername: args.apiUsername },
    );

    // ── Print redacted summary ─────────────────────────────────────────────────
    printSummary(args, user, body, diagnostics);

    // ── Dry-run: stop before HTTP ──────────────────────────────────────────────
    if (!args.execute) {
        console.log("[DRY-RUN] No HTTP call made.");
        console.log(
            "          Pass --execute (with --first-charge-date) to run the real probe.",
        );
        await mongoose.disconnect();
        process.exit(0);
    }

    // ── Execute: real HTTP call to Tranzila STO API ────────────────────────────
    console.log(`[PROBE] POST ${TRANZILA_CONFIG.stoApiUrl}`);
    console.log(`        terminal:    ${TRANZILA_CONFIG.stoTerminal}`);
    console.log(
        `        authVariant: ${args.authVariant}  nonceFormat: ${args.nonceFormat}`,
    );

    let httpStatus;
    let rawBody;

    try {
        const res = await fetch(TRANZILA_CONFIG.stoApiUrl, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
        });
        httpStatus = res.status;
        rawBody = await res.text();
    } catch (err) {
        console.error(`[ERROR] Network/fetch failure: ${err.message}`);
        await mongoose.disconnect();
        process.exit(1);
    }

    console.log("\n────────────────────────────────────────────────────────");
    console.log("  RAW RESPONSE");
    console.log("────────────────────────────────────────────────────────");
    console.log(`  HTTP Status: ${httpStatus}`);
    console.log(`  Body:\n${rawBody}`);
    console.log("────────────────────────────────────────────────────────");

    emitVerdict(httpStatus, rawBody, args);

    await mongoose.disconnect();
    // Exit 0 for a completed probe — provider rejection is data, not a script error.
    process.exit(0);
}

main().catch((err) => {
    console.error("[FATAL]", err);
    mongoose.disconnect().catch(() => {});
    process.exitCode = 1;
});
