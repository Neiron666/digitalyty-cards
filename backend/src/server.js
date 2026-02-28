import "dotenv/config";
import * as Sentry from "@sentry/node";
import { connectDB } from "./config/db.js";
import { startTrialCleanupJob } from "./jobs/trialCleanup.js";

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
    await connectDB(process.env.MONGO_URI);

    // Guaranteed cleanup for expired unpaid trial cards (Mongo + Supabase media).
    startTrialCleanupJob({
        intervalMs:
            Number(process.env.TRIAL_CLEANUP_INTERVAL_MS) || 60 * 60 * 1000,
    });

    app.listen(PORT, () => {
        console.log(`Backend running on port ${PORT}`);
    });
}

start().catch((err) => {
    console.error("Server failed to start:", err.message);
    process.exit(1);
});
