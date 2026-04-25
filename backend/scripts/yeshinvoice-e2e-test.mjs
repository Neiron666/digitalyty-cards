/**
 * Y3C.4 — YeshInvoice isolated happy-path create + persist + cleanup harness
 *
 * Proves the combined success-path only:
 *   createReceiptYeshInvoice -> Receipt.create -> findById -> deleteOne
 *
 * Does NOT persist a failed Receipt.
 * Does NOT connect to Mongo on provider failure.
 * Does NOT call shareReceiptYeshInvoice.
 * Does NOT create PaymentTransaction documents.
 * Cleans up the test Receipt on success — no residue.
 *
 * Usage:
 *   node scripts/yeshinvoice-e2e-test.mjs \
 *     --user-id=<ObjectId> \
 *     --email=<test@example.com> \
 *     [--plan=monthly|yearly] \
 *     [--first-name=<name>]
 *
 * Required env (in backend/.env or shell):
 *   YESH_INVOICE_ENABLED=true
 *   YESH_INVOICE_SECRET=<secret>
 *   YESH_INVOICE_USERKEY=<userkey>
 *   MONGO_URI=<connection string>
 *   YESH_INVOICE_API_BASE=https://api.yeshinvoice.co.il  (optional override)
 */

import "dotenv/config";

import mongoose from "mongoose";

import Receipt from "../src/models/Receipt.model.js";
import { connectDB } from "../src/config/db.js";
import {
    createReceiptYeshInvoice,
    buildYeshInvoiceDocumentUniqueKey,
} from "../src/services/yeshinvoice.service.js";
import { PRICES_AGOROT } from "../src/config/plans.js";

// ── CLI arg parsing ───────────────────────────────────────────────────────────

function parseArgs(argv) {
    const args = {
        userId: null,
        email: null,
        plan: "monthly",
        firstName: null,
    };

    for (const token of argv.slice(2)) {
        if (token.startsWith("--user-id=")) {
            args.userId = token.slice("--user-id=".length).trim();
        } else if (token.startsWith("--email=")) {
            args.email = token.slice("--email=".length).trim();
        } else if (token.startsWith("--plan=")) {
            args.plan = token.slice("--plan=".length).trim();
        } else if (token.startsWith("--first-name=")) {
            args.firstName = token.slice("--first-name=".length).trim();
        }
    }

    return args;
}

// ── Validation (pre-side-effects, fail-fast) ──────────────────────────────────

function validate(args) {
    if (process.env.YESH_INVOICE_ENABLED !== "true") {
        console.error(
            "[yeshinvoice-e2e-test] YESH_INVOICE_ENABLED is not set to 'true' — aborting",
        );
        process.exit(1);
    }

    const missingYI = ["YESH_INVOICE_SECRET", "YESH_INVOICE_USERKEY"].filter(
        (k) => !process.env[k],
    );
    if (missingYI.length) {
        console.error(
            `[yeshinvoice-e2e-test] Missing required env vars: ${missingYI.join(", ")} — aborting`,
        );
        process.exit(1);
    }

    if (!process.env.MONGO_URI) {
        console.error("[yeshinvoice-e2e-test] MONGO_URI is not set — aborting");
        process.exit(1);
    }

    if (!args.userId) {
        console.error(
            "[yeshinvoice-e2e-test] --user-id is required — aborting",
        );
        process.exit(1);
    }

    if (!mongoose.Types.ObjectId.isValid(args.userId)) {
        console.error(
            `[yeshinvoice-e2e-test] --user-id="${args.userId}" is not a valid ObjectId — aborting`,
        );
        process.exit(1);
    }

    if (!args.email) {
        console.error("[yeshinvoice-e2e-test] --email is required — aborting");
        process.exit(1);
    }

    if (!Object.prototype.hasOwnProperty.call(PRICES_AGOROT, args.plan)) {
        console.error(
            `[yeshinvoice-e2e-test] Invalid --plan="${args.plan}". Must be: monthly | yearly`,
        );
        process.exit(1);
    }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    const args = parseArgs(process.argv);
    validate(args);

    const amountAgorot = PRICES_AGOROT[args.plan];
    const planLabel = args.plan === "monthly" ? "חודשי" : "שנתי";

    // Synthetic test-only values — distinct prefix from CREATE_SMOKE_ and PERSIST_SMOKE_
    const providerTxnId = `FULL_SMOKE_${Date.now()}`;
    const documentUniqueKey = buildYeshInvoiceDocumentUniqueKey(providerTxnId);
    const syntheticPaymentTransactionId = new mongoose.Types.ObjectId();
    const customerName = args.firstName ?? "Cardigo Test";
    const description = `מנוי Cardigo - ${planLabel}`;

    console.log(
        "[yeshinvoice-e2e-test] Starting provider call (no Mongo yet)...",
    );
    console.log(
        `[yeshinvoice-e2e-test] plan=${args.plan} amountAgorot=${amountAgorot} documentUniqueKey=${documentUniqueKey}`,
    );

    // ── Step 1: Provider call — NO Mongo connection at this point ─────────────

    const result = await createReceiptYeshInvoice({
        documentUniqueKey,
        customer: {
            name: customerName,
            email: args.email,
            countryCode: "IL",
        },
        amountAgorot,
        description,
    });

    let createdId = null;
    let passed = false;
    let providerFailed = false;

    try {
        // ── Step 2: Provider result gate ──────────────────────────────────────

        if (result.ok !== true) {
            providerFailed = true;
            console.error(
                "[yeshinvoice-e2e-test] Provider call FAILED — not connecting to Mongo",
            );
            console.error(
                "[yeshinvoice-e2e-test] provider failure:",
                JSON.stringify(
                    {
                        ok: result.ok,
                        api: {
                            Success: result.raw?.Success ?? null,
                            ErrorMessage: result.raw?.ErrorMessage ?? null,
                        },
                        error: result.error ?? null,
                    },
                    null,
                    2,
                ),
            );
            // Do not connect to Mongo. Finally disconnects (safe no-op).
        } else {
            // ── Step 3: Connect to Mongo (only on confirmed provider success) ──

            console.log(
                "[yeshinvoice-e2e-test] Provider call succeeded. Connecting to Mongo...",
            );
            await connectDB(process.env.MONGO_URI);

            let readbackPassed = false;
            let deleteResult = null;

            // ── Inner try/finally: guarantees cleanup if Receipt.create succeeds ──

            try {
                // ── Step 4: Receipt.create ─────────────────────────────────────

                console.log("[yeshinvoice-e2e-test] Creating Receipt...");

                const created = await Receipt.create({
                    paymentTransactionId: syntheticPaymentTransactionId,
                    userId: new mongoose.Types.ObjectId(args.userId),
                    provider: "yeshinvoice",
                    providerDocId: result.providerDocId,
                    providerDocNumber: result.providerDocNumber,
                    documentType: 6,
                    pdfUrl: result.pdfUrl,
                    documentUrl: result.documentUrl,
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
                    `[yeshinvoice-e2e-test] Created Receipt _id=${createdId}`,
                );

                // ── Step 5: Read-back verification ─────────────────────────────

                console.log("[yeshinvoice-e2e-test] Reading back Receipt...");

                const found = await Receipt.findById(createdId).lean();

                if (!found) {
                    console.error(
                        `[yeshinvoice-e2e-test] FAIL: Receipt not found on read-back (_id=${createdId})`,
                    );
                } else {
                    const checks = [
                        ["provider", found.provider, "yeshinvoice"],
                        [
                            "providerDocId",
                            found.providerDocId,
                            result.providerDocId,
                        ],
                        [
                            "providerDocNumber",
                            found.providerDocNumber,
                            result.providerDocNumber,
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
                                `[yeshinvoice-e2e-test] FAIL read-back: ${field} expected=${expected} actual=${actual}`,
                            );
                            allChecksPassed = false;
                        }
                    }

                    if (allChecksPassed) {
                        console.log(
                            "[yeshinvoice-e2e-test] Read-back verification PASSED",
                        );
                        readbackPassed = true;
                    }
                }
            } finally {
                // ── Step 6: Cleanup — guaranteed if createdId !== null ─────────
                // Gated on createdId, NOT on readbackPassed.

                if (createdId !== null) {
                    console.log(
                        "[yeshinvoice-e2e-test] Cleaning up test Receipt...",
                    );
                    deleteResult = await Receipt.deleteOne({ _id: createdId });

                    if (deleteResult.deletedCount !== 1) {
                        console.error(
                            `[yeshinvoice-e2e-test] CLEANUP FAILED: deletedCount=${deleteResult.deletedCount} for _id=${createdId}` +
                                " — test receipt may still exist in the collection",
                        );
                    } else {
                        console.log(
                            "[yeshinvoice-e2e-test] Cleanup PASSED (deletedCount=1)",
                        );
                    }
                }
            }

            // passed = read-back OK AND cleanup OK
            passed =
                readbackPassed === true &&
                deleteResult !== null &&
                deleteResult.deletedCount === 1;

            // ── Sanitized summary output ───────────────────────────────────────

            const summary = {
                providerDocId: result.providerDocId ?? null,
                providerDocNumber: result.providerDocNumber ?? null,
                pdfUrl: result.pdfUrl ?? null,
                documentUrl: result.documentUrl ?? null,
                createdReceiptId: createdId !== null ? String(createdId) : null,
                syntheticPaymentTransactionId: String(
                    syntheticPaymentTransactionId,
                ),
                cleanupDeletedCount: deleteResult?.deletedCount ?? null,
                result: passed ? "PASS" : "FAIL",
            };

            console.log(
                "[yeshinvoice-e2e-test] summary:",
                JSON.stringify(summary, null, 2),
            );
        }
    } finally {
        // Always disconnect — safe no-op if connectDB was never called.
        await mongoose.disconnect();
    }

    if (providerFailed) {
        console.error("[yeshinvoice-e2e-test] EXIT 1 — provider call failed");
        process.exit(1);
    }

    if (passed) {
        console.log(
            "[yeshinvoice-e2e-test] EXIT 0 — happy-path harness passed",
        );
        process.exit(0);
    } else {
        console.error(
            "[yeshinvoice-e2e-test] EXIT 1 — happy-path harness failed",
        );
        process.exit(1);
    }
}

main().catch((err) => {
    console.error(
        "[yeshinvoice-e2e-test] Unhandled error:",
        err?.message ?? err,
    );
    process.exit(1);
});
