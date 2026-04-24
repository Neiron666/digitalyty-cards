/**
 * Y3C.3A — YeshInvoice Receipt persistence harness
 *
 * Tests Receipt.create -> findById -> deleteOne in isolation.
 * Does NOT call YeshInvoice API.
 * Does NOT create PaymentTransaction documents.
 * Cleans up the test Receipt on success — no residue.
 *
 * Usage:
 *   node scripts/yeshinvoice-persist-test.mjs \
 *     --user-id=<ObjectId> \
 *     --provider-doc-id=<number> \
 *     --provider-doc-number=<number> \
 *     --pdf-url=<string> \
 *     --document-url=<string> \
 *     [--plan=monthly|yearly] \
 *     [--amount-agorot=<number>]
 *
 * Required env (in backend/.env or shell):
 *   MONGO_URI=<connection string>
 */

import "dotenv/config";

import mongoose from "mongoose";

import Receipt from "../src/models/Receipt.model.js";
import { connectDB } from "../src/config/db.js";
import { buildYeshInvoiceDocumentUniqueKey } from "../src/services/yeshinvoice.service.js";
import { PRICES_AGOROT } from "../src/config/plans.js";

// ── CLI arg parsing ───────────────────────────────────────────────────────────

function parseArgs(argv) {
    const args = {
        userId: null,
        providerDocId: null,
        providerDocNumber: null,
        pdfUrl: null,
        documentUrl: null,
        plan: "monthly",
        amountAgorot: null,
    };

    for (const token of argv.slice(2)) {
        if (token.startsWith("--user-id=")) {
            args.userId = token.slice("--user-id=".length).trim();
        } else if (token.startsWith("--provider-doc-id=")) {
            args.providerDocId = token
                .slice("--provider-doc-id=".length)
                .trim();
        } else if (token.startsWith("--provider-doc-number=")) {
            args.providerDocNumber = token
                .slice("--provider-doc-number=".length)
                .trim();
        } else if (token.startsWith("--pdf-url=")) {
            args.pdfUrl = token.slice("--pdf-url=".length).trim();
        } else if (token.startsWith("--document-url=")) {
            args.documentUrl = token.slice("--document-url=".length).trim();
        } else if (token.startsWith("--plan=")) {
            args.plan = token.slice("--plan=".length).trim();
        } else if (token.startsWith("--amount-agorot=")) {
            args.amountAgorot = token.slice("--amount-agorot=".length).trim();
        }
    }

    return args;
}

// ── Validation (pre-DB, fail-fast) ────────────────────────────────────────────

function validate(args) {
    if (!process.env.MONGO_URI) {
        console.error(
            "[yeshinvoice-persist-test] MONGO_URI is not set — aborting",
        );
        process.exit(1);
    }

    const required = [
        ["--user-id", args.userId],
        ["--provider-doc-id", args.providerDocId],
        ["--provider-doc-number", args.providerDocNumber],
        ["--pdf-url", args.pdfUrl],
        ["--document-url", args.documentUrl],
    ];

    for (const [flag, value] of required) {
        if (!value) {
            console.error(
                `[yeshinvoice-persist-test] ${flag} is required — aborting`,
            );
            process.exit(1);
        }
    }

    if (!Object.prototype.hasOwnProperty.call(PRICES_AGOROT, args.plan)) {
        console.error(
            `[yeshinvoice-persist-test] Invalid --plan="${args.plan}". Must be: monthly | yearly`,
        );
        process.exit(1);
    }

    if (!mongoose.Types.ObjectId.isValid(args.userId)) {
        console.error(
            `[yeshinvoice-persist-test] --user-id="${args.userId}" is not a valid ObjectId — aborting`,
        );
        process.exit(1);
    }

    const parsedDocId = parseInt(args.providerDocId, 10);
    if (
        !Number.isInteger(parsedDocId) ||
        String(parsedDocId) !== String(parseInt(args.providerDocId, 10))
    ) {
        console.error(
            `[yeshinvoice-persist-test] --provider-doc-id="${args.providerDocId}" is not a valid integer — aborting`,
        );
        process.exit(1);
    }

    const parsedDocNumber = parseInt(args.providerDocNumber, 10);
    if (
        !Number.isInteger(parsedDocNumber) ||
        String(parsedDocNumber) !== String(parseInt(args.providerDocNumber, 10))
    ) {
        console.error(
            `[yeshinvoice-persist-test] --provider-doc-number="${args.providerDocNumber}" is not a valid integer — aborting`,
        );
        process.exit(1);
    }

    if (args.amountAgorot !== null) {
        const parsedAmount = parseInt(args.amountAgorot, 10);
        if (!Number.isInteger(parsedAmount) || parsedAmount <= 0) {
            console.error(
                `[yeshinvoice-persist-test] --amount-agorot="${args.amountAgorot}" must be a positive integer — aborting`,
            );
            process.exit(1);
        }
    }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    const args = parseArgs(process.argv);
    validate(args);

    const providerDocId = parseInt(args.providerDocId, 10);
    const providerDocNumber = parseInt(args.providerDocNumber, 10);
    const amountAgorot =
        args.amountAgorot !== null
            ? parseInt(args.amountAgorot, 10)
            : PRICES_AGOROT[args.plan];

    // Synthetic test-only values — never match real transactions
    const syntheticPaymentTransactionId = new mongoose.Types.ObjectId();
    const providerTxnId = `PERSIST_SMOKE_${Date.now()}`;
    const documentUniqueKey = buildYeshInvoiceDocumentUniqueKey(providerTxnId);

    console.log("[yeshinvoice-persist-test] Synthetic values:");
    console.log(
        `  syntheticPaymentTransactionId = ${syntheticPaymentTransactionId}`,
    );
    console.log(`  documentUniqueKey = ${documentUniqueKey}`);
    console.log(
        "[note] paymentTransactionId unique index may not exist yet; " +
            "E11000/idempotency is not proven in this contour",
    );

    await connectDB(process.env.MONGO_URI);

    let createdId = null;
    let passed = false;

    try {
        // ── Step 1: Create ─────────────────────────────────────────────────────

        console.log("[yeshinvoice-persist-test] Creating Receipt...");

        const created = await Receipt.create({
            paymentTransactionId: syntheticPaymentTransactionId,
            userId: new mongoose.Types.ObjectId(args.userId),
            provider: "yeshinvoice",
            providerDocId,
            providerDocNumber,
            documentType: 6,
            pdfUrl: args.pdfUrl,
            documentUrl: args.documentUrl,
            amountAgorot,
            plan: args.plan,
            status: "created",
            failReason: null,
            documentUniqueKey,
            issuedAt: new Date(),
            shareStatus: "pending",
        });

        createdId = created._id;
        console.log(
            `[yeshinvoice-persist-test] Created Receipt _id=${createdId}`,
        );

        // ── Step 2: Read-back verification ─────────────────────────────────────

        console.log("[yeshinvoice-persist-test] Reading back Receipt...");

        const found = await Receipt.findById(createdId).lean();

        if (!found) {
            console.error(
                `[yeshinvoice-persist-test] FAIL: Receipt not found on read-back (_id=${createdId})`,
            );
            // Fall through to cleanup
        } else {
            const checks = [
                ["provider", found.provider, "yeshinvoice"],
                ["providerDocId", found.providerDocId, providerDocId],
                [
                    "providerDocNumber",
                    found.providerDocNumber,
                    providerDocNumber,
                ],
                ["documentType", found.documentType, 6],
                ["amountAgorot", found.amountAgorot, amountAgorot],
                ["plan", found.plan, args.plan],
                ["status", found.status, "created"],
                ["shareStatus", found.shareStatus, "pending"],
                [
                    "documentUniqueKey",
                    found.documentUniqueKey,
                    documentUniqueKey,
                ],
            ];

            let allChecksPassed = true;
            for (const [field, actual, expected] of checks) {
                if (actual !== expected) {
                    console.error(
                        `[yeshinvoice-persist-test] FAIL read-back: ${field} expected=${expected} actual=${actual}`,
                    );
                    allChecksPassed = false;
                }
            }

            if (allChecksPassed) {
                console.log(
                    "[yeshinvoice-persist-test] Read-back verification PASSED",
                );
                passed = true;
            }
        }

        // ── Step 3: Cleanup ────────────────────────────────────────────────────

        console.log("[yeshinvoice-persist-test] Cleaning up test Receipt...");

        const deleteResult = await Receipt.deleteOne({ _id: createdId });

        if (deleteResult.deletedCount !== 1) {
            console.error(
                `[yeshinvoice-persist-test] CLEANUP FAILED: deletedCount=${deleteResult.deletedCount} for _id=${createdId}` +
                    " — test receipt may still exist in the collection",
            );
            passed = false;
        } else {
            console.log(
                "[yeshinvoice-persist-test] Cleanup PASSED (deletedCount=1)",
            );
        }

        // ── Sanitized summary output ───────────────────────────────────────────

        const summary = {
            createdReceiptId: String(createdId),
            syntheticPaymentTransactionId: String(
                syntheticPaymentTransactionId,
            ),
            providerDocId,
            providerDocNumber,
            status: "created",
            cleanupDeletedCount: deleteResult.deletedCount,
            result: passed ? "PASS" : "FAIL",
        };

        console.log(
            "[yeshinvoice-persist-test] summary:",
            JSON.stringify(summary, null, 2),
        );
    } finally {
        await mongoose.disconnect();
    }

    if (passed) {
        console.log(
            "[yeshinvoice-persist-test] EXIT 0 — persistence harness passed",
        );
        process.exit(0);
    } else {
        console.error(
            "[yeshinvoice-persist-test] EXIT 1 — persistence harness failed",
        );
        process.exit(1);
    }
}

main().catch((err) => {
    console.error(
        "[yeshinvoice-persist-test] Unhandled error:",
        err?.message ?? err,
    );
    process.exit(1);
});
