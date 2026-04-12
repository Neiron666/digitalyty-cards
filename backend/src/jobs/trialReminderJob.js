import User from "../models/User.model.js";
import Card from "../models/Card.model.js";
import { sendTrialReminderEmailMailjetBestEffort } from "../services/mailjet.service.js";
import { getSiteUrl } from "../utils/siteUrl.util.js";
import * as Sentry from "@sentry/node";

// ---------------------------------------------------------------------------
// Trial reminder job — sends one pre-expiry premium-trial reminder email per
// eligible user, on approximately day 9 of the 10-day trial, during
// daytime hours (Asia/Jerusalem).
//
// Idempotency: claim/send pattern on User.
//   trialReminderClaimedAt — atomic ownership marker (set before send).
//   trialReminderSentAt    — completion marker (set after successful send).
//
// A claim is treated as stale after STALE_CLAIM_THRESHOLD_MS and becomes
// re-eligible (guards against process crashes between claim and send).
// ---------------------------------------------------------------------------

const MONITOR_SLUG = "trial-reminder";
let monitorIntervalMs = 2 * 60 * 60 * 1000; // 2 h default, overridden by start call

let running = false;
let lastHeartbeatAt = 0;
const DEFAULT_HEARTBEAT_MS = 12 * 60 * 60 * 1000; // 12 h
const HEARTBEAT_MS = Math.max(
    DEFAULT_HEARTBEAT_MS,
    Number(process.env.TRIAL_REMINDER_HEARTBEAT_MS) || DEFAULT_HEARTBEAT_MS,
);

// Candidate window: trialEndsAt must be between now+WINDOW_START_HOURS and
// now+WINDOW_END_HOURS. A 12-hour window (20 h – 32 h before expiry)
// gives the 2-hour job interval multiple opportunities to find the right
// daytime send slot without requiring point-in-time precision.
const WINDOW_START_HOURS =
    Number(process.env.TRIAL_REMINDER_WINDOW_START_HOURS) || 20;
const WINDOW_END_HOURS =
    Number(process.env.TRIAL_REMINDER_WINDOW_END_HOURS) || 32;

// Daytime guard: only send between SEND_HOUR_MIN and SEND_HOUR_MAX in
// Asia/Jerusalem. Uses native Intl — no timezone library dependency.
const SEND_HOUR_MIN = Number(process.env.TRIAL_REMINDER_SEND_HOUR_MIN) || 9;
const SEND_HOUR_MAX = Number(process.env.TRIAL_REMINDER_SEND_HOUR_MAX) || 18;
const SEND_TIMEZONE = "Asia/Jerusalem";

// Stale-claim threshold: a claim older than this is treated as abandoned
// (process crash) and becomes re-eligible on the next sweep.
const STALE_CLAIM_THRESHOLD_MS =
    Number(process.env.TRIAL_REMINDER_STALE_CLAIM_THRESHOLD_MS) ||
    4 * 60 * 60 * 1000; // 4 h default

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getLocalHourInJerusalem(date) {
    try {
        const formatted = new Intl.DateTimeFormat("he-IL", {
            hour: "numeric",
            hour12: false,
            timeZone: SEND_TIMEZONE,
        }).format(date);
        // Intl may return "24" for midnight in some environments; treat as 0.
        const h = parseInt(formatted, 10);
        return Number.isFinite(h) ? h % 24 : -1;
    } catch {
        // If Intl fails (unsupported env), fail open — do not block sending.
        return 12;
    }
}

// ---------------------------------------------------------------------------
// Main sweep
// ---------------------------------------------------------------------------

async function reminderOnce() {
    if (running) return;
    running = true;

    const now = new Date();

    const sweep = async () => {
        // Daytime guard — exit early if outside send window.
        const localHour = getLocalHourInJerusalem(now);
        if (localHour < SEND_HOUR_MIN || localHour >= SEND_HOUR_MAX) {
            const nowMs = Date.now();
            if (nowMs - lastHeartbeatAt >= HEARTBEAT_MS) {
                console.log("[trial-reminder] outside send window", {
                    localHour,
                    sendWindow: `${SEND_HOUR_MIN}–${SEND_HOUR_MAX} ${SEND_TIMEZONE}`,
                });
                lastHeartbeatAt = nowMs;
            }
            return;
        }

        const windowStart = new Date(
            now.getTime() + WINDOW_START_HOURS * 3_600_000,
        );
        const windowEnd = new Date(
            now.getTime() + WINDOW_END_HOURS * 3_600_000,
        );
        const staleBefore = new Date(now.getTime() - STALE_CLAIM_THRESHOLD_MS);

        // Find candidates: active trial users nearing expiry, not yet reminded,
        // verified, and either not yet claimed or with a stale claim.
        const candidates = await User.find({
            trialActivatedAt: { $ne: null },
            trialEndsAt: { $gt: windowStart, $lte: windowEnd },
            trialReminderSentAt: null,
            isVerified: true,
            $or: [
                { trialReminderClaimedAt: null },
                { trialReminderClaimedAt: { $lte: staleBefore } },
            ],
        })
            .select("_id email trialEndsAt")
            .lean();

        let sentCount = 0;
        let skippedUpgraded = 0;
        let skippedExpired = 0;
        let skippedClaimRace = 0;
        let failedSend = 0;

        for (const candidate of candidates) {
            // --- 1. Atomic claim -----------------------------------------------
            // Only the process that successfully sets trialReminderClaimedAt
            // from null/stale to now may proceed. All others see a null result.
            const claimed = await User.findOneAndUpdate(
                {
                    _id: candidate._id,
                    trialReminderSentAt: null,
                    $or: [
                        { trialReminderClaimedAt: null },
                        { trialReminderClaimedAt: { $lte: staleBefore } },
                    ],
                },
                { $set: { trialReminderClaimedAt: now } },
                { new: false },
            );

            if (!claimed) {
                // Another process claimed this candidate first.
                skippedClaimRace += 1;
                continue;
            }

            // --- 2. Guard: re-check trial still in future (clock drift / delay) --
            const trialEndsAtMs = new Date(candidate.trialEndsAt).getTime();
            if (
                !Number.isFinite(trialEndsAtMs) ||
                trialEndsAtMs <= now.getTime()
            ) {
                // Trial already expired — release claim, do not send.
                await User.updateOne(
                    { _id: candidate._id },
                    { $set: { trialReminderClaimedAt: null } },
                );
                skippedExpired += 1;
                continue;
            }

            // --- 3. Defense-in-depth: confirm user still has an active trial card --
            // Protects against users who upgraded after the candidate query.
            // findOne+lean stops at first match; countDocuments would scan all.
            const activeTrialCard = await Card.findOne({
                user: candidate._id,
                "billing.status": "trial",
                trialEndsAt: { $gt: now },
            })
                .select("_id")
                .lean();

            if (!activeTrialCard) {
                // User has no cards in active trial state — upgraded or no cards.
                await User.updateOne(
                    { _id: candidate._id },
                    { $set: { trialReminderClaimedAt: null } },
                );
                skippedUpgraded += 1;
                continue;
            }

            // --- 4. Send email ------------------------------------------------
            const pricingUrl = `${getSiteUrl()}/pricing`;
            const result = await sendTrialReminderEmailMailjetBestEffort({
                toEmail: candidate.email,
                trialEndsAt: candidate.trialEndsAt,
                pricingUrl,
                userId: String(candidate._id),
            });

            if (result.ok && !result.skipped) {
                // --- 5a. Success: stamp sentAt (idempotent update guard) ----------
                await User.updateOne(
                    { _id: candidate._id, trialReminderSentAt: null },
                    { $set: { trialReminderSentAt: now } },
                );
                sentCount += 1;
            } else {
                // --- 5b. Failure / Mailjet not configured: release claim ----------
                // Allows a retry on the next job tick.
                await User.updateOne(
                    { _id: candidate._id },
                    { $set: { trialReminderClaimedAt: null } },
                );
                if (!result.skipped) {
                    // Genuine delivery failure — log for observability.
                    failedSend += 1;
                    console.warn(
                        "[trial-reminder] send failed, claim released",
                        {
                            userId: String(candidate._id),
                            reason: result.reason,
                        },
                    );
                }
                // skipped = Mailjet not configured (dev env) — silent release.
            }
        }

        if (candidates.length) {
            console.log("[trial-reminder] sweep done", {
                candidates: candidates.length,
                sentCount,
                skippedUpgraded,
                skippedExpired,
                skippedClaimRace,
                failedSend,
            });
        } else {
            const nowMs = Date.now();
            if (nowMs - lastHeartbeatAt >= HEARTBEAT_MS) {
                console.log("[trial-reminder] heartbeat", {
                    candidates: 0,
                    heartbeatMs: HEARTBEAT_MS,
                    sinceLastHeartbeatMs: lastHeartbeatAt
                        ? nowMs - lastHeartbeatAt
                        : null,
                });
                lastHeartbeatAt = nowMs;
            }
        }
    };

    try {
        const intervalMinutes = Math.max(
            1,
            Math.round(monitorIntervalMs / 60_000),
        );
        const monitorConfig = {
            schedule: {
                type: "interval",
                value: intervalMinutes,
                unit: "minute",
            },
            checkinMargin: 5,
            maxRuntime: 10,
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
        console.error("[trial-reminder] failed", err?.message || err);
    } finally {
        running = false;
    }
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

export function startTrialReminderJob({
    intervalMs = 2 * 60 * 60 * 1000,
} = {}) {
    monitorIntervalMs = intervalMs;

    // First run staggered after the existing 4 jobs (+15 s, +30 s, +45 s, +60 s).
    setTimeout(() => {
        reminderOnce();
    }, 75 * 1000);

    setInterval(() => {
        reminderOnce();
    }, intervalMs);

    console.log("[trial-reminder] scheduled", { intervalMs });
}
