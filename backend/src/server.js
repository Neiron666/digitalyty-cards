import "dotenv/config";
import * as Sentry from "@sentry/node";
import { connectDB } from "./config/db.js";
import { startTrialCleanupJob } from "./jobs/trialCleanup.js";
import { startResetMailWorker } from "./jobs/resetMailWorker.js";
import { startTrialLifecycleReconcileJob } from "./jobs/trialLifecycleReconcile.js";
import { startRetentionPurgeJob } from "./jobs/retentionPurge.js";
import { startTrialReminderJob } from "./jobs/trialReminderJob.js";
import { startBillingReconcileJob } from "./jobs/billingReconcile.js";

// --- Sentry early init (before Express app loads) ---
// Must run before app.js is imported so Sentry can instrument Express/http.
const SENTRY_DSN = process.env.SENTRY_DSN || "";
if (SENTRY_DSN) {
    const rawRate = Number(process.env.SENTRY_TRACES_SAMPLE_RATE);
    Sentry.init({
        dsn: SENTRY_DSN,
        environment:
            process.env.SENTRY_ENVIRONMENT ||
            process.env.NODE_ENV ||
            "development",
        release: process.env.SENTRY_RELEASE || undefined,
        sendDefaultPii: false,
        tracesSampleRate: Number.isFinite(rawRate) ? rawRate : 0.1,
        beforeSend(event) {
            const headers = event?.request?.headers;
            if (headers && typeof headers === "object") {
                for (const key of Object.keys(headers)) {
                    const lower = key.toLowerCase();
                    if (
                        lower === "authorization" ||
                        lower === "cookie" ||
                        lower === "set-cookie" ||
                        lower === "x-forwarded-for" ||
                        lower === "x-cardigo-proxy-secret"
                    ) {
                        delete headers[key];
                    }
                }
            }
            return event;
        },
    });
}

// Dynamic import: app.js must load AFTER Sentry.init() so Express is instrumented.
const { default: app } = await import("./app.js");

const PORT = process.env.PORT || 5000;

async function start() {
    // --- Critical env validation (fail-fast before any side effects) ---
    if (
        typeof process.env.JWT_SECRET !== "string" ||
        !process.env.JWT_SECRET.trim()
    ) {
        throw new Error("JWT_SECRET is required");
    }
    if (
        process.env.NODE_ENV === "production" &&
        !process.env.CARDIGO_PROXY_SHARED_SECRET?.trim()
    ) {
        throw new Error(
            "CARDIGO_PROXY_SHARED_SECRET is required in production",
        );
    }
    if (
        typeof process.env.EMAIL_BLOCK_SECRET !== "string" ||
        !process.env.EMAIL_BLOCK_SECRET.trim()
    ) {
        throw new Error("EMAIL_BLOCK_SECRET is required");
    }

    // TRIAL_ROLLOUT_DATE: required in production (fail fast), optional in dev.
    // If provided, must be valid ISO8601. If absent in non-production, trial feature stays disabled.
    const trialRolloutRaw = process.env.TRIAL_ROLLOUT_DATE;
    if (
        trialRolloutRaw &&
        typeof trialRolloutRaw === "string" &&
        trialRolloutRaw.trim()
    ) {
        const parsed = new Date(trialRolloutRaw.trim());
        if (!Number.isFinite(parsed.getTime())) {
            throw new Error(
                `TRIAL_ROLLOUT_DATE must be valid ISO8601 (got: "${trialRolloutRaw}")`,
            );
        }
    } else if (process.env.NODE_ENV === "production") {
        throw new Error("TRIAL_ROLLOUT_DATE is required in production");
    }

    await connectDB(process.env.MONGO_URI);

    // Guaranteed cleanup for expired unpaid trial cards (Mongo + Supabase media).
    startTrialCleanupJob({
        intervalMs:
            Number(process.env.TRIAL_CLEANUP_INTERVAL_MS) || 60 * 60 * 1000,
    });

    // Password-reset mail worker: drains MailJob queue, generates tokens, sends links.
    startResetMailWorker({
        intervalMs: Number(process.env.RESET_MAIL_WORKER_INTERVAL_MS) || 60_000,
    });

    // Lifecycle reconciliation: detect expired user-premium trials, normalize billing to free.
    startTrialLifecycleReconcileJob({
        intervalMs:
            Number(process.env.TRIAL_LIFECYCLE_RECONCILE_INTERVAL_MS) ||
            6 * 60 * 60 * 1000,
    });

    // Billing reconcile: normalize expired paid subscription state, stamp downgradedAt to unblock retentionPurge.
    startBillingReconcileJob({
        intervalMs:
            Number(process.env.BILLING_RECONCILE_INTERVAL_MS) ||
            6 * 60 * 60 * 1000,
    });

    // Retention purge: remove premium-only surplus data after grace window.
    startRetentionPurgeJob({
        intervalMs:
            Number(process.env.RETENTION_PURGE_INTERVAL_MS) ||
            6 * 60 * 60 * 1000,
    });

    // Pre-expiry trial reminder: sends reminder email ~day-9, daytime window (Asia/Jerusalem), claim/send idempotency.
    startTrialReminderJob({
        intervalMs:
            Number(process.env.TRIAL_REMINDER_INTERVAL_MS) ||
            2 * 60 * 60 * 1000,
    });

    app.listen(PORT, () => {
        console.log(`Backend running on port ${PORT}`);
    });
}

start().catch((err) => {
    console.error("Server failed to start:", err.message);
    process.exit(1);
});
