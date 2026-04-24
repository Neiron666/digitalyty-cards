/**
 * Y3B — YeshInvoice preview smoke / sandbox proof
 *
 * Calls createDocumentPreview ONLY — no real document is created,
 * no Mongo writes, no billing chain involvement.
 *
 * Usage:
 *   node scripts/yeshinvoice-preview-test.mjs --email=<test@example.com> [--plan=monthly|yearly] [--first-name=<name>]
 *
 * Required env (in backend/.env or shell):
 *   YESH_INVOICE_ENABLED=true
 *   YESH_INVOICE_SECRET=<secret>
 *   YESH_INVOICE_USERKEY=<userkey>
 *   YESH_INVOICE_API_BASE=https://api.yeshinvoice.co.il  (optional override)
 */

import "dotenv/config";

import {
    previewReceiptYeshInvoice,
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
            "[yeshinvoice-preview-test] YESH_INVOICE_ENABLED is not set to 'true' — aborting",
        );
        process.exit(1);
    }

    const missing = ["YESH_INVOICE_SECRET", "YESH_INVOICE_USERKEY"].filter(
        (k) => !process.env[k],
    );

    if (missing.length) {
        console.error(
            `[yeshinvoice-preview-test] Missing required env vars: ${missing.join(", ")} — aborting`,
        );
        process.exit(1);
    }
}

// ── URL extraction (sanitized, no raw response dump) ─────────────────────────

function extractPreviewUrls(raw) {
    if (!raw || typeof raw !== "object") return [];

    const rv = raw.ReturnValue;

    // Priority 1: ReturnValue is an array — createDocumentPreview returns array of image preview URLs
    if (Array.isArray(rv)) {
        return rv.filter((u) => typeof u === "string" && u.startsWith("http"));
    }

    // Priority 2: ReturnValue is a plain string URL
    if (typeof rv === "string" && rv.startsWith("http")) {
        return [rv];
    }

    // Priority 3: ReturnValue is an object — check documented sub-keys
    const rvUrls =
        rv && typeof rv === "object"
            ? [
                  rv.url,
                  rv.pdfurl,
                  rv.copypdfurl,
                  rv.loyalpdfurl,
                  rv.pdf80mm,
                  rv.paymenturl,
              ]
            : [];

    const candidates = [
        ...rvUrls,
        // Flat fallbacks on raw itself
        ...(Array.isArray(raw.previewUrls) ? raw.previewUrls : []),
        raw.previewUrl,
        raw.downloadUrl,
        raw.shareUrl,
        raw.documentUrl,
        raw.pdfUrl,
    ];

    return candidates.filter(
        (u) => typeof u === "string" && u.startsWith("http"),
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    validateEnv();

    const args = parseArgs(process.argv);

    // Validate --email
    if (!args.email) {
        console.error(
            "[yeshinvoice-preview-test] --email is required (e.g. --email=test@example.com)",
        );
        process.exit(1);
    }

    // Validate --plan
    if (!Object.prototype.hasOwnProperty.call(PRICES_AGOROT, args.plan)) {
        console.error(
            `[yeshinvoice-preview-test] Invalid --plan="${args.plan}". Must be: monthly | yearly`,
        );
        process.exit(1);
    }

    const amountAgorot = PRICES_AGOROT[args.plan];
    const planLabel = args.plan === "monthly" ? "חודשי" : "שנתי";

    // Harmless sandbox providerTxnId — never matches a real transaction
    const providerTxnId = `PREVIEW_SMOKE_${Date.now()}`;
    const documentUniqueKey = buildYeshInvoiceDocumentUniqueKey(providerTxnId);

    const customerName = args.firstName ?? "Cardigo Preview";
    const description = `מנוי Cardigo - ${planLabel}`;

    // Harmless userId placeholder — context only, not passed to provider
    const smokePlaceholderUserId = "smoke-preview-placeholder";

    console.log("[yeshinvoice-preview-test] Starting preview smoke...");
    console.log(
        `  plan=${args.plan}  amountAgorot=${amountAgorot}  userId(placeholder)=${smokePlaceholderUserId}`,
    );
    console.log(`  providerTxnId(smoke)=${providerTxnId}`);
    console.log(`  documentUniqueKey=${documentUniqueKey}`);

    const result = await previewReceiptYeshInvoice({
        documentUniqueKey,
        customerName,
        customerEmail: args.email,
        amountAgorot,
        description,
    });

    const previewUrls = extractPreviewUrls(result.raw);

    // Sanitized bounded output — no secrets, no raw dump, no auth header
    console.log("[yeshinvoice-preview-test] Result:");
    console.log(`  ok=${result.ok}`);
    console.log(`  previewUrlsCount=${previewUrls.length}`);
    console.log(`  firstPreviewUrl=${previewUrls[0] ?? "(none)"}`);

    // Normalized provider-level diagnostics (sanitized fields only, no raw body dump)
    // API shape: { Success: bool, ErrorMessage: string, ReturnValue: ... }
    const apiSuccess = result.raw?.Success ?? null;
    const apiErrorMessage = result.raw?.ErrorMessage ?? null;
    const httpStatus = result.httpStatus ?? null;

    if (httpStatus !== null) {
        console.log(`  httpStatus=${httpStatus}`);
    }
    if (apiSuccess !== null) {
        console.log(`  api.Success=${apiSuccess}`);
    }
    if (apiErrorMessage) {
        console.log(`  api.ErrorMessage=${apiErrorMessage}`);
    }
    // Caught-exception message from service (no stack, no internals)
    if (result.error) {
        console.log(`  failReason=${result.error}`);
    }

    if (!result.ok || previewUrls.length === 0) {
        console.error(
            "[yeshinvoice-preview-test] FAILED — ok=false or no preview URLs returned",
        );
        process.exit(1);
    }

    console.log("[yeshinvoice-preview-test] PASSED");
    process.exit(0);
}

main().catch((err) => {
    console.error(
        "[yeshinvoice-preview-test] Unhandled error:",
        err.message ?? err,
    );
    process.exit(1);
});
