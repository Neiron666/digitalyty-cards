/**
 * Y3C.2 — YeshInvoice sandbox createDocument test
 *
 * Calls createReceiptYeshInvoice ONLY — proves real sandbox document creation
 * through the normalized service contract (Y3C.1).
 *
 * No Mongo writes. No billing chain involvement. No share/email call.
 *
 * Usage:
 *   node scripts/yeshinvoice-create-test.mjs --email=<test@example.com> [--plan=monthly|yearly] [--first-name=<name>]
 *
 * Required env (in backend/.env or shell):
 *   YESH_INVOICE_ENABLED=true
 *   YESH_INVOICE_SECRET=<secret>
 *   YESH_INVOICE_USERKEY=<userkey>
 *   YESH_INVOICE_API_BASE=https://api.yeshinvoice.co.il  (optional override)
 */

import "dotenv/config";

import {
    createReceiptYeshInvoice,
    buildYeshInvoiceDocumentUniqueKey,
} from "../src/services/yeshinvoice.service.js";
import { PRICES_AGOROT } from "../src/config/plans.js";

// ── CLI arg parsing ───────────────────────────────────────────────────────────

function parseArgs(argv) {
    const args = {
        plan: "monthly",
        email: null,
        firstName: null,
    };

    for (const token of argv.slice(2)) {
        if (token.startsWith("--plan=")) {
            args.plan = token.slice("--plan=".length).trim();
        } else if (token.startsWith("--email=")) {
            args.email = token.slice("--email=".length).trim();
        } else if (token.startsWith("--first-name=")) {
            args.firstName = token.slice("--first-name=".length).trim();
        }
    }

    return args;
}

// ── Env validation ────────────────────────────────────────────────────────────

function validateEnv() {
    if (process.env.YESH_INVOICE_ENABLED !== "true") {
        console.error(
            "[yeshinvoice-create-test] YESH_INVOICE_ENABLED is not set to 'true' — aborting",
        );
        process.exit(1);
    }

    const missing = ["YESH_INVOICE_SECRET", "YESH_INVOICE_USERKEY"].filter(
        (k) => !process.env[k],
    );

    if (missing.length) {
        console.error(
            `[yeshinvoice-create-test] Missing required env vars: ${missing.join(", ")} — aborting`,
        );
        process.exit(1);
    }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    validateEnv();

    const args = parseArgs(process.argv);

    // Validate --email
    if (!args.email) {
        console.error(
            "[yeshinvoice-create-test] --email is required (e.g. --email=test@example.com)",
        );
        process.exit(1);
    }

    // Validate --plan
    if (!Object.prototype.hasOwnProperty.call(PRICES_AGOROT, args.plan)) {
        console.error(
            `[yeshinvoice-create-test] Invalid --plan="${args.plan}". Must be: monthly | yearly`,
        );
        process.exit(1);
    }

    const amountAgorot = PRICES_AGOROT[args.plan];
    const planLabel = args.plan === "monthly" ? "חודשי" : "שנתי";

    // Harmless sandbox providerTxnId — never matches a real transaction
    const providerTxnId = `CREATE_SMOKE_${Date.now()}`;
    const documentUniqueKey = buildYeshInvoiceDocumentUniqueKey(providerTxnId);

    const customerName = args.firstName ?? "Cardigo Test";
    const customerEmail = args.email;
    const description = `מנוי Cardigo - ${planLabel}`;

    // Harmless userId placeholder — context only, never written to Mongo in this script
    const smokePlaceholderUserId = "smoke-create-placeholder";

    console.log("[yeshinvoice-create-test] Starting sandbox createDocument...");
    console.log(
        `[yeshinvoice-create-test] plan=${args.plan} amountAgorot=${amountAgorot} documentUniqueKey=${documentUniqueKey}`,
    );

    const result = await createReceiptYeshInvoice({
        documentUniqueKey,
        customerName,
        customerEmail,
        amountAgorot,
        description,
        // userId is for caller context only — service does not use it
        userId: smokePlaceholderUserId,
    });

    // ── Sanitized output (no secrets, no raw body, no auth header) ────────────

    const sanitized = {
        ok: result.ok,
        providerDocId: result.providerDocId ?? null,
        providerDocNumber: result.providerDocNumber ?? null,
        pdfUrl: result.pdfUrl ?? null,
        documentUrl: result.documentUrl ?? null,
        documentUniqueKey,
        api: {
            Success: result.raw?.Success ?? null,
            ErrorMessage: result.raw?.ErrorMessage ?? null,
        },
        failReason: result.ok ? undefined : (result.error ?? null),
    };

    console.log(
        "[yeshinvoice-create-test] result:",
        JSON.stringify(sanitized, null, 2),
    );

    // ── Exit logic ────────────────────────────────────────────────────────────

    const passed =
        result.ok === true &&
        result.providerDocId != null &&
        result.providerDocNumber != null &&
        typeof result.pdfUrl === "string" &&
        result.pdfUrl.length > 0;

    if (passed) {
        console.log(
            "[yeshinvoice-create-test] EXIT 0 — document created successfully",
        );
        process.exit(0);
    } else {
        console.error(
            "[yeshinvoice-create-test] EXIT 1 — document creation failed or incomplete result",
        );
        process.exit(1);
    }
}

main().catch((err) => {
    console.error(
        "[yeshinvoice-create-test] Unhandled error:",
        err?.message ?? err,
    );
    process.exit(1);
});
