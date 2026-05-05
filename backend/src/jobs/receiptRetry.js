import Receipt from "../models/Receipt.model.js";
import PaymentTransaction from "../models/PaymentTransaction.model.js";
import {
    createReceiptYeshInvoice,
    shareReceiptYeshInvoice,
} from "../services/yeshinvoice.service.js";
import * as Sentry from "@sentry/node";
import { incrementMetric, gaugeMetric } from "../utils/sentryMetrics.util.js";

// ---------------------------------------------------------------------------
// Receipt retry job — retries failed YeshInvoice receipt creation for
// Receipt{status:"failed"} records persisted by Phase 2A.
//
// Disabled by default. Both flags must be true to schedule:
//   RECEIPT_RETRY_ENABLED === "true"
//   YESH_INVOICE_ENABLED  === "true"
//
// Reentrancy: module-level running flag prevents overlapping sweeps.
// This is correct for the current single-process Render deployment.
// If horizontal multi-instance is introduced in a future contour,
// replace this with an atomic DB claim/lock pattern (processingUntil).
//
// On success: updates existing Receipt to status:"created" in-place.
//   Does NOT create a new Receipt (paymentTransactionId unique index enforces
//   one Receipt per PaymentTransaction — Receipt.create would E11000).
// On failure: increments retryCount and sets nextRetryAt with exponential backoff.
//   retryCount is capped at MAX_RETRIES; eligible receipts are no longer
//   selected once retryCount >= MAX_RETRIES.
//
// Share failure: does NOT increment retryCount.
//   The document IS created at that point. Share retry is a separate lifecycle.
// ---------------------------------------------------------------------------

const MONITOR_SLUG = "receipt-retry";
const DEFAULT_RECEIPT_RETRY_INTERVAL_MS = 30 * 60 * 1000; // 30 min
const DEFAULT_RECEIPT_RETRY_BOOT_DELAY_MS = 105 * 1000; // 105 s — next free slot after billingReconcile at 90 s

const MAX_RETRIES = 5;
const MAX_BATCH = 20;
const BACKOFF_BASE_MS = 5 * 60 * 1000; // 5 min
const BACKOFF_MAX_MS = 4 * 60 * 60 * 1000; // 4 h

const DEFAULT_HEARTBEAT_MS = 6 * 60 * 60 * 1000; // 6 h
const HEARTBEAT_MS = Math.max(
    DEFAULT_HEARTBEAT_MS,
    Number(process.env.RECEIPT_RETRY_HEARTBEAT_MS) || DEFAULT_HEARTBEAT_MS,
);

let monitorIntervalMs = DEFAULT_RECEIPT_RETRY_INTERVAL_MS;

let running = false;
let lastHeartbeatAt = 0;

// ---------------------------------------------------------------------------
// Backoff helper
// nextRetryAt = now + BACKOFF_BASE_MS * 2^(retryCount), capped at BACKOFF_MAX_MS.
// retryCount 0 → 5 min, 1 → 10 min, 2 → 20 min, 3 → 40 min, 4+ → 4 h cap.
// ---------------------------------------------------------------------------
function computeNextRetryAt(retryCount) {
    const delay = Math.min(
        BACKOFF_BASE_MS * Math.pow(2, retryCount),
        BACKOFF_MAX_MS,
    );
    return new Date(Date.now() + delay);
}

// ---------------------------------------------------------------------------
// Best-effort PaymentTransaction receiptId write-back.
// Local equivalent of the private linkReceiptToPaymentTransactionBestEffort
// in tranzila.provider.js. Writes only receiptId — no other fields touched.
// Fire-and-forget: failures are logged but do not block the retry sweep.
// ---------------------------------------------------------------------------
async function linkReceiptToPaymentTransactionBestEffort(
    paymentTransactionId,
    receiptId,
) {
    if (!paymentTransactionId || !receiptId) return;
    try {
        await PaymentTransaction.updateOne(
            { _id: paymentTransactionId, receiptId: null },
            { $set: { receiptId } },
        );
    } catch (err) {
        console.warn("[receipt-retry] txn writeback failed", {
            event: "receipt_retry_txn_writeback_error",
            paymentTransactionIdPresent: Boolean(paymentTransactionId),
            receiptIdPresent: Boolean(receiptId),
            ok: false,
            failReason: String(err?.message ?? "").slice(0, 200),
        });
    }
}

// ---------------------------------------------------------------------------
// Main sweep
// ---------------------------------------------------------------------------
async function retryOnce() {
    if (running) return;
    running = true;

    const now = new Date();

    const sweep = async () => {
        // Query: eligible failed receipts only.
        // $exists: false arms are required for older failed Receipt documents
        // that were created before retryCount/nextRetryAt fields were added
        // (Phase 2A records will not have these fields in the raw Mongo document;
        // lean() does not inject Mongoose defaults into non-existent keys).
        const candidates = await Receipt.find({
            status: "failed",
            $and: [
                {
                    $or: [
                        { nextRetryAt: null },
                        { nextRetryAt: { $exists: false } },
                        { nextRetryAt: { $lte: now } },
                    ],
                },
                {
                    $or: [
                        { retryCount: { $exists: false } },
                        { retryCount: { $lt: MAX_RETRIES } },
                    ],
                },
            ],
        })
            .sort({ nextRetryAt: 1, createdAt: 1 })
            .limit(MAX_BATCH)
            .lean();

        gaugeMetric("receipt.retry.candidate_count", candidates.length, { provider: "yeshinvoice", flow: "retry_job" });

        if (!candidates.length) {
            const nowMs = Date.now();
            if (nowMs - lastHeartbeatAt >= HEARTBEAT_MS) {
                console.log("[receipt-retry] heartbeat", { candidates: 0 });
                lastHeartbeatAt = nowMs;
            }
            return;
        }

        let succeeded = 0;
        let failed = 0;

        for (const receipt of candidates) {
            try {
                await processReceipt(receipt, now);
                succeeded += 1;
            } catch (err) {
                // Per-receipt error: log, count, continue — never rethrow.
                failed += 1;
                console.error("[receipt-retry] unexpected receipt error", {
                    event: "receipt_retry_unexpected_error",
                    receiptIdPresent: Boolean(receipt._id),
                    failReason: String(err?.message ?? "").slice(0, 200),
                });
            }
        }

        console.log("[receipt-retry] sweep done", {
            event: "receipt_retry_sweep_done",
            candidates: candidates.length,
            succeeded,
            failed,
        });
    };

    try {
        await Sentry.withMonitor(MONITOR_SLUG, () => sweep(), {
            schedule: {
                type: "interval",
                value: monitorIntervalMs,
                unit: "millisecond",
            },
        });
    } catch (err) {
        console.error("[receipt-retry] sweep failed", {
            event: "receipt_retry_sweep_error",
            failReason: String(err?.message ?? "").slice(0, 200),
        });
    } finally {
        running = false;
    }
}

// ---------------------------------------------------------------------------
// Per-receipt processing
// ---------------------------------------------------------------------------
async function processReceipt(receipt, now) {
    const snapshot = receipt.recipientSnapshot ?? {};

    // Minimum requirement: email must be present to call YeshInvoice.
    // If missing, mark as a retry failure (not a provider call).
    if (!snapshot.email) {
        const currentRetryCount = Number.isFinite(receipt.retryCount)
            ? receipt.retryCount
            : 0;
        await Receipt.updateOne(
            { _id: receipt._id, status: "failed" },
            {
                $set: {
                    retryCount: currentRetryCount + 1,
                    failReason: "missing_recipient_email",
                    nextRetryAt: computeNextRetryAt(currentRetryCount),
                },
            },
        );
        console.warn("[receipt-retry] skipped: missing recipient email", {
            event: "receipt_retry_skipped_no_email",
            receiptIdPresent: Boolean(receipt._id),
        });
        return;
    }

    // Build customer from snapshot only — do NOT fetch User or Card.
    const customer = {
        name: snapshot.name || snapshot.email,
        email: snapshot.email,
        countryCode: snapshot.countryCode || "IL",
        nameInvoice: snapshot.nameInvoice || undefined,
        fullName: snapshot.fullName || undefined,
        // numberId intentionally omitted — only hash/masked stored in snapshot.
        address: snapshot.address || undefined,
        city: snapshot.city || undefined,
        zipCode: snapshot.zipCode || undefined,
    };

    // Build description from plan.
    let description;
    if (receipt.plan === "monthly") {
        description = "מנוי Cardigo - חודשי";
    } else if (receipt.plan === "yearly") {
        description = "מנוי Cardigo - שנתי";
    } else {
        description = "מנוי Cardigo";
    }

    // Call YeshInvoice — documentUniqueKey provides server-side idempotency.
    const receiptResult = await createReceiptYeshInvoice({
        documentUniqueKey: receipt.documentUniqueKey,
        customer,
        amountAgorot: receipt.amountAgorot,
        description,
    });

    if (receiptResult.ok) {
        // Update existing failed Receipt to created in-place.
        // filter includes status:"failed" to guard against concurrent transition.
        await Receipt.updateOne(
            { _id: receipt._id, status: "failed" },
            {
                $set: {
                    status: "created",
                    providerDocId: receiptResult.providerDocId,
                    providerDocNumber: receiptResult.providerDocNumber,
                    pdfUrl: receiptResult.pdfUrl,
                    documentUrl: receiptResult.documentUrl,
                    issuedAt: new Date(),
                    shareStatus: "pending",
                    failReason: null,
                    nextRetryAt: null,
                },
            },
        );

        console.log("[receipt-retry] receipt created", {
            event: "receipt_retry_created",
            ok: true,
            planPresent: Boolean(receipt.plan),
            amountAgorotPresent: Boolean(receipt.amountAgorot),
        });
        incrementMetric("receipt.retry.success", { provider: "yeshinvoice", flow: "retry_job", plan: (receipt.plan === "monthly" || receipt.plan === "yearly") ? receipt.plan : "unknown" });

        // Best-effort PaymentTransaction receiptId write-back.
        // Only writes receiptId — no other PaymentTransaction fields touched.
        void linkReceiptToPaymentTransactionBestEffort(
            receipt.paymentTransactionId,
            receipt._id,
        );

        // Share the receipt — fire after status transition.
        // Share failure does NOT increment retryCount: the document is already
        // created at this point. Share retry is a separate future lifecycle.
        const shareResult = await shareReceiptYeshInvoice({
            providerDocId: receiptResult.providerDocId,
            customerEmail: customer.email,
        });

        if (shareResult.ok) {
            await Receipt.updateOne(
                { _id: receipt._id },
                {
                    $set: {
                        shareStatus: "sent",
                        sharedAt: new Date(),
                        shareFailReason: null,
                    },
                },
            );
            console.log("[receipt-retry] receipt shared", {
                event: "receipt_retry_shared",
                ok: true,
            });
        } else {
            // Share failure — update shareStatus only. retryCount is NOT incremented.
            // The document is created. Share retry is out of scope for Phase 2B.
            await Receipt.updateOne(
                { _id: receipt._id },
                {
                    $set: {
                        shareStatus: "failed",
                        shareFailReason: String(
                            shareResult.error ?? "unknown",
                        ).slice(0, 200),
                    },
                },
            );
            console.warn("[receipt-retry] share failed", {
                event: "receipt_retry_share_failed",
                ok: false,
                errorPresent: Boolean(shareResult.error),
            });
        }
    } else {
        // Create failure — increment retryCount and set backoff.
        const currentRetryCount = Number.isFinite(receipt.retryCount)
            ? receipt.retryCount
            : 0;

        await Receipt.updateOne(
            { _id: receipt._id, status: "failed" },
            {
                $set: {
                    retryCount: currentRetryCount + 1,
                    failReason: String(receiptResult.error ?? "unknown").slice(
                        0,
                        200,
                    ),
                    nextRetryAt: computeNextRetryAt(currentRetryCount),
                },
            },
        );

        console.warn("[receipt-retry] create failed", {
            event: "receipt_retry_create_failed",
            ok: false,
            retryCount: currentRetryCount + 1,
            errorPresent: Boolean(receiptResult.error),
        });
        incrementMetric("receipt.retry.failed", { provider: "yeshinvoice", flow: "retry_job", plan: (receipt.plan === "monthly" || receipt.plan === "yearly") ? receipt.plan : "unknown", reason: "create_failed" });
    }
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

export function startReceiptRetryJob({
    intervalMs = DEFAULT_RECEIPT_RETRY_INTERVAL_MS,
} = {}) {
    // Both flags must be explicitly "true". Any other value (absent, "false",
    // "1", "yes") leaves the job disabled. This prevents provider calls before
    // migration/index/operator rollout is complete.
    if (process.env.RECEIPT_RETRY_ENABLED !== "true") {
        console.log(
            "[receipt-retry] disabled (RECEIPT_RETRY_ENABLED !== true)",
        );
        return;
    }
    if (process.env.YESH_INVOICE_ENABLED !== "true") {
        console.log("[receipt-retry] disabled (YESH_INVOICE_ENABLED !== true)");
        return;
    }

    monitorIntervalMs = intervalMs;

    // Boot delay: 105 s — next free slot after billingReconcile at 90 s.
    setTimeout(() => {
        retryOnce();
    }, DEFAULT_RECEIPT_RETRY_BOOT_DELAY_MS);

    setInterval(() => {
        retryOnce();
    }, intervalMs);

    console.log("[receipt-retry] scheduled", { intervalMs });
}
