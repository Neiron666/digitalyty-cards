import { releaseExpiredSlugRedirects } from "../utils/releaseExpiredSlugRedirects.js";

// Boot delay slots already claimed:
//   15 s  — trialCleanup
//   30 s  — resetMailWorker
//   45 s  — trialLifecycleReconcile
//   60 s  — retentionPurge
//   75 s  — trialReminderJob
//   90 s  — billingReconcile
//   105 s — receiptRetry
//   120 s — slugRedirectRelease  ← this job

const DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1000;
const MIN_INTERVAL_MS = 60 * 60 * 1000;
const BOOT_DELAY_MS = 120 * 1000;

let running = false;

async function sweepOnce() {
    if (running) return;
    running = true;

    try {
        const result = await releaseExpiredSlugRedirects({ dryRun: false });
        console.log("[slug-redirect-release] done", {
            checkedAt: result.checkedAt,
            candidateCount: result.candidateCount,
            modifiedCount: result.modifiedCount,
            durationMs: result.durationMs,
        });
    } catch (err) {
        console.error("[slug-redirect-release] failed", {
            error: err?.message || err,
        });
    } finally {
        running = false;
    }
}

export function startSlugRedirectReleaseJob({ intervalMs } = {}) {
    if (process.env.SLUG_REDIRECT_RELEASE_ENABLED !== "true") {
        console.log(
            "[slug-redirect-release] disabled (SLUG_REDIRECT_RELEASE_ENABLED !== true)",
        );
        return;
    }

    const parsedIntervalMs =
        Number.isFinite(intervalMs) && intervalMs >= MIN_INTERVAL_MS
            ? intervalMs
            : DEFAULT_INTERVAL_MS;

    setTimeout(() => {
        sweepOnce();
    }, BOOT_DELAY_MS);

    setInterval(() => {
        sweepOnce();
    }, parsedIntervalMs);

    console.log("[slug-redirect-release] scheduled", {
        intervalMs: parsedIntervalMs,
        bootDelayMs: BOOT_DELAY_MS,
    });
}
