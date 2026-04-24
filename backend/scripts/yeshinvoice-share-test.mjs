/**
 * Y3F.0 — YeshInvoice shareDocument sandbox response proof
 *
 * Calls shareReceiptYeshInvoice ONLY — proves the real shareDocument response
 * envelope casing (success vs Success, errorDescription vs ErrorMessage).
 *
 * No Mongo writes. No billing chain involvement. No Receipt persistence.
 *
 * Usage:
 *   node scripts/yeshinvoice-share-test.mjs \
 *     --provider-doc-id=<number> \
 *     [--email=<test@example.com>]
 *
 *   Omitting --email proves the error-envelope casing (API rejects the call).
 *   Providing --email with a valid doc ID proves the success-envelope casing.
 *
 * Required env (in backend/.env or shell):
 *   YESH_INVOICE_ENABLED=true
 *   YESH_INVOICE_SECRET=<secret>
 *   YESH_INVOICE_USERKEY=<userkey>
 *   YESH_INVOICE_API_BASE=https://api.yeshinvoice.co.il  (optional override)
 */

import "dotenv/config";

import { shareReceiptYeshInvoice } from "../src/services/yeshinvoice.service.js";

// ── CLI arg parsing ───────────────────────────────────────────────────────────

function parseArgs(argv) {
    const args = {
        providerDocId: null,
        email: null,
    };

    for (const token of argv.slice(2)) {
        if (token.startsWith("--provider-doc-id=")) {
            args.providerDocId = token
                .slice("--provider-doc-id=".length)
                .trim();
        } else if (token.startsWith("--email=")) {
            args.email = token.slice("--email=".length).trim();
        }
    }

    return args;
}

// ── Env validation ────────────────────────────────────────────────────────────

function validateEnv() {
    if (process.env.YESH_INVOICE_ENABLED !== "true") {
        console.error(
            "[yeshinvoice-share-test] YESH_INVOICE_ENABLED is not set to 'true' — aborting",
        );
        process.exit(1);
    }

    const missing = ["YESH_INVOICE_SECRET", "YESH_INVOICE_USERKEY"].filter(
        (k) => !process.env[k],
    );

    if (missing.length) {
        console.error(
            `[yeshinvoice-share-test] Missing required env vars: ${missing.join(", ")} — aborting`,
        );
        process.exit(1);
    }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    validateEnv();

    const args = parseArgs(process.argv);

    if (!args.providerDocId) {
        console.error(
            "[yeshinvoice-share-test] --provider-doc-id is required (e.g. --provider-doc-id=12345)",
        );
        process.exit(1);
    }

    const parsedDocId = Number(args.providerDocId);

    if (!Number.isInteger(parsedDocId) || parsedDocId <= 0) {
        console.error(
            `[yeshinvoice-share-test] --provider-doc-id="${args.providerDocId}" must be a positive integer — aborting`,
        );
        process.exit(1);
    }

    console.log("[yeshinvoice-share-test] Starting sandbox shareDocument...");
    console.log(
        `[yeshinvoice-share-test] providerDocId=${parsedDocId} emailProvided=${args.email !== null}`,
    );

    const result = await shareReceiptYeshInvoice({
        providerDocId: parsedDocId,
        customerEmail: args.email ?? undefined,
    });

    // ── Sanitized output (no secrets, no raw body dump, no email echo) ────────
    // Surfaces BOTH casing variants explicitly — the sole purpose of this proof.
    // Whichever of api.success_lc / api.Success_uc is non-null is the real field.
    // Whichever of api.errorDescription / api.ErrorMessage is non-null is the real error field.
    const sanitized = {
        ok: result.ok,
        api: {
            success_lc: result.raw?.success ?? null,
            Success_uc: result.raw?.Success ?? null,
            errorDescription: result.raw?.errorDescription ?? null,
            ErrorMessage: result.raw?.ErrorMessage ?? null,
        },
        error: result.ok ? undefined : (result.error ?? null),
    };

    console.log(
        "[yeshinvoice-share-test] result:",
        JSON.stringify(sanitized, null, 2),
    );

    // ── Exit logic ────────────────────────────────────────────────────────────

    if (result.ok) {
        console.log(
            "[yeshinvoice-share-test] EXIT 0 — share confirmed successful",
        );
        process.exit(0);
    } else {
        console.error(
            "[yeshinvoice-share-test] EXIT 1 — share failed or not confirmed",
        );
        process.exit(1);
    }
}

main().catch((err) => {
    console.error(
        "[yeshinvoice-share-test] Unhandled error:",
        err?.message ?? err,
    );
    process.exit(1);
});
