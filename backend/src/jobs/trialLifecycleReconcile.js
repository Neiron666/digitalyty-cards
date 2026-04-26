import Card from "../models/Card.model.js";
import { resolveBilling } from "../utils/trial.js";
import * as Sentry from "@sentry/node";

const MONITOR_SLUG = "trial-lifecycle-reconcile";
let monitorIntervalMs = 6 * 60 * 60 * 1000;

let running = false;
let lastHeartbeatAt = 0;
const DEFAULT_HEARTBEAT_MS = 12 * 60 * 60 * 1000;
const HEARTBEAT_MS = Math.max(
    DEFAULT_HEARTBEAT_MS,
    Number(process.env.TRIAL_LIFECYCLE_HEARTBEAT_MS) || DEFAULT_HEARTBEAT_MS,
);

async function reconcileOnce() {
    if (running) return;
    running = true;

    const now = new Date();

    const sweep = async () => {
        // Find user-owned cards with expired trials that haven't been downgraded yet.
        // billing.status = "trial" + trialEndsAt <= now + downgradedAt is null + user-owned.
        const candidates = await Card.find({
            user: { $ne: null },
            "billing.status": "trial",
            trialEndsAt: { $lte: now },
            downgradedAt: null,
        }).select("_id orgId billing trialEndsAt user adminOverride");

        let downgradedCount = 0;
        let skippedPaidOrOverride = 0;
        let skippedOrgCards = 0;

        for (const card of candidates) {
            // Org-owned cards are governed by Organization.orgEntitlement.
            // Trial lifecycle downgrade/downgradedAt stamp must not apply to org-owned cards.
            // Do NOT load Organization or check source:"organization" here;
            // the structural card.orgId guard is the correct boundary.
            if (card?.orgId) {
                skippedOrgCards += 1;
                continue;
            }

            // Defense-in-depth: re-check billing at evaluation time.
            // If the card has been upgraded or has an active admin override,
            // skip - do NOT overwrite legitimate billing.
            const billing = resolveBilling(card, now);
            if (
                billing?.source === "billing" ||
                billing?.source === "adminOverride"
            ) {
                skippedPaidOrOverride += 1;
                continue;
            }

            // Normalize billing to free and stamp downgradedAt.
            await Card.updateOne(
                {
                    _id: card._id,
                    // Guard: only update if still in trial state (race protection).
                    "billing.status": "trial",
                    downgradedAt: null,
                },
                {
                    $set: {
                        downgradedAt: now,
                        "billing.status": "free",
                        "billing.plan": "free",
                        "billing.paidUntil": null,
                    },
                },
            );
            downgradedCount += 1;
        }

        if (candidates.length) {
            console.log("[trial-lifecycle-reconcile] done", {
                candidates: candidates.length,
                downgradedCount,
                skippedPaidOrOverride,
                skippedOrgCards,
            });
        } else {
            const nowMs = Date.now();
            if (nowMs - lastHeartbeatAt >= HEARTBEAT_MS) {
                console.log("[trial-lifecycle-reconcile] heartbeat", {
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
            Math.round(monitorIntervalMs / 60000),
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
        console.error(
            "[trial-lifecycle-reconcile] failed",
            err?.message || err,
        );
    } finally {
        running = false;
    }
}

export function startTrialLifecycleReconcileJob({
    intervalMs = 6 * 60 * 60 * 1000,
} = {}) {
    monitorIntervalMs = intervalMs;

    // Run once shortly after boot (staggered after existing workers), then periodically.
    setTimeout(() => {
        reconcileOnce();
    }, 45 * 1000);

    setInterval(() => {
        reconcileOnce();
    }, intervalMs);

    console.log("[trial-lifecycle-reconcile] scheduled", { intervalMs });
}
