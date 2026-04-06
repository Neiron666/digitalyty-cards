import crypto from "crypto";
import * as Sentry from "@sentry/node";
import User from "../models/User.model.js";
import ActivePasswordReset from "../models/ActivePasswordReset.model.js";
import MailJob from "../models/MailJob.model.js";
import { getSiteUrl } from "../utils/siteUrl.util.js";
import { sendPasswordResetEmailMailjetBestEffort } from "../services/mailjet.service.js";

const MONITOR_SLUG = "reset-mail-worker";
let monitorIntervalMs = 60_000;

// sha256 helper - intentionally local to this worker; do not import from auth.routes.
function sha256Hex(value) {
    return crypto
        .createHash("sha256")
        .update(String(value), "utf8")
        .digest("hex");
}

let running = false;

async function deliverOnce() {
    if (running) return;
    running = true;

    const sweep = async () => {
        const now = new Date();

        // Atomically claim exactly one pending, non-expired job (FIFO).
        const job = await MailJob.findOneAndUpdate(
            { status: "pending", expiresAt: { $gt: now } },
            {
                $set: { status: "processing", lastAttemptAt: now },
                $inc: { attempts: 1 },
            },
            { new: true, sort: { createdAt: 1 } },
        );

        if (!job) {
            // No pending work this tick. Normal idle state.
            return;
        }

        // Resolve user - userId only stored in job (no PII snapshot).
        const user = await User.findById(job.userId).select("email").lean();
        if (!user) {
            // User was deleted before delivery. Abandon.
            await MailJob.findByIdAndUpdate(job._id, {
                $set: { status: "abandoned" },
            });
            // Mark the reset intent as used so it doesn't block future /forgot requests.
            await ActivePasswordReset.findOneAndUpdate(
                { userId: job.userId, status: "pending-delivery" },
                { $set: { status: "used", usedAt: new Date() } },
            ).catch((err) => {
                console.error(
                    "[reset-mail-worker] APR cleanup on user-missing failed",
                    err?.message || err,
                );
            });
            console.warn("[reset-mail-worker] user not found, job abandoned", {
                jobId: String(job._id),
                userId: String(job.userId),
            });
            return;
        }

        // Generate rawToken in memory only - never persisted anywhere.
        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = sha256Hex(rawToken);

        // Durably set tokenHash on the APR and advance to 'active'.
        // Gate on status:'pending-delivery' to avoid overwriting a record that was
        // already replaced by a subsequent /forgot request for the same user.
        const nowForUpdate = new Date();
        const resetRecord = await ActivePasswordReset.findOneAndUpdate(
            {
                userId: job.userId,
                status: "pending-delivery",
                usedAt: null,
                expiresAt: { $gt: nowForUpdate },
            },
            { $set: { tokenHash, status: "active" } },
            { new: true },
        );

        if (!resetRecord) {
            // APR expired, already consumed, or replaced by a newer /forgot request.
            // Abandon this job - the delivery pipeline is no longer valid.
            await MailJob.findByIdAndUpdate(job._id, {
                $set: { status: "abandoned" },
            });
            // rawToken discarded here (never left memory; no sensitive data at rest).
            console.warn(
                "[reset-mail-worker] APR not claimable, job abandoned",
                {
                    jobId: String(job._id),
                    userId: String(job.userId),
                },
            );
            return;
        }

        // Build reset link in memory - rawToken exists only within this call frame.
        const siteUrl = getSiteUrl();
        const resetLink = `${siteUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;

        // Attempt mail send.
        let sendRes;
        try {
            sendRes = await sendPasswordResetEmailMailjetBestEffort({
                toEmail: user.email,
                resetLink,
                userId: job.userId,
                resetId: resetRecord._id,
            });
        } catch (err) {
            // Unexpected throw from the service layer (should not normally happen;
            // service is designed to return structured results). Treat as ambiguous.
            console.error("[reset-mail-worker] send threw unexpectedly", {
                jobId: String(job._id),
                error: err?.message || err,
            });
            // Leave job in 'processing' - ambiguous outcome per first-version policy.
            // DO NOT regenerate rawToken or overwrite tokenHash on APR.
            // rawToken is discarded; the link may or may not have been sent.
            return;
        }

        // rawToken is no longer needed after this point regardless of outcome.
        // JS GC handles reclamation; it was never written to any persistent store.

        if (sendRes?.ok && !sendRes?.skipped) {
            // Definitive success: Mailjet accepted the message.
            await MailJob.findByIdAndUpdate(job._id, {
                $set: { status: "sent" },
            });
            return;
        }

        if (sendRes?.skipped) {
            // Mailjet is not configured (dev/staging with no keys).
            // Mark failed; APR remains 'active' with a tokenHash. Operator must investigate.
            await MailJob.findByIdAndUpdate(job._id, {
                $set: { status: "failed" },
            });
            console.warn(
                "[reset-mail-worker] mail send skipped (not configured)",
                {
                    jobId: String(job._id),
                    reason: sendRes?.reason,
                },
            );
            return;
        }

        // Ambiguous outcome (non-definitive error, network timeout, unexpected response).
        // V1 first-version policy: leave job in 'processing' for operator inspection.
        // DO NOT regenerate rawToken. DO NOT overwrite tokenHash on ActivePasswordReset.
        // Rationale: the link may already have been delivered; overwriting tokenHash would
        // invalidate a working link without certainty.
        console.error(
            "[reset-mail-worker] ambiguous Mailjet outcome, job left in processing",
            {
                jobId: String(job._id),
                userId: String(job.userId),
                sendRes,
            },
        );
    };

    try {
        const intervalMinutes = Math.max(
            1,
            Math.round(monitorIntervalMs / 60000),
        );
        const monitorConfig = {
            schedule: {
                type: "interval",
                value: intervalMinutes,
                unit: "minute",
            },
            checkinMargin: 5,
            maxRuntime: 5,
            timezone: "UTC",
            failureIssueThreshold: 2,
            recoveryThreshold: 1,
        };

        const sentryActive =
            typeof Sentry.getClient === "function" && !!Sentry.getClient();

        if (sentryActive) {
            await Sentry.withMonitor(MONITOR_SLUG, sweep, monitorConfig);
        } else {
            await sweep();
        }
    } catch (err) {
        console.error("[reset-mail-worker] failed", err?.message || err);
    } finally {
        running = false;
    }
}

export function startResetMailWorker({ intervalMs = 60_000 } = {}) {
    monitorIntervalMs = intervalMs;

    // Initial tick: 30 s after boot (lower priority than trial cleanup at 15 s).
    setTimeout(() => {
        deliverOnce();
    }, 30 * 1000);

    setInterval(() => {
        deliverOnce();
    }, intervalMs);

    console.log("[reset-mail-worker] scheduled", { intervalMs });
}
