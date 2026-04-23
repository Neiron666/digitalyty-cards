import User from "../models/User.model.js";
import Card from "../models/Card.model.js";
import { resolveBilling } from "../utils/trial.js";
import * as Sentry from "@sentry/node";

// ---------------------------------------------------------------------------
// Billing reconcile job — normalizes stale expired paid subscription state
// after subscription.expiresAt / card.billing.paidUntil has passed.
//
// Handles ALL expired active paid users (self-cancelled, failed-renewal,
// lapsed) — not only failed-renewal users.
// renewalFailedAt is an audit marker and is never touched by this job.
//
// Write order: CARD-FIRST.
//   Reason: card.downgradedAt is the downstream trigger for retentionPurge.
//   Normalizing User first would remove the candidate from the next query
//   if the Card update were to fail/race, leaving the Card permanently dirty.
//
// Anti-drift: even if a Card update races/misses (already downgraded),
//   User normalization is still attempted if User is still stale.
// ---------------------------------------------------------------------------

const MONITOR_SLUG = "billing-reconcile";
let monitorIntervalMs = 6 * 60 * 60 * 1000;

let running = false;
let lastHeartbeatAt = 0;
const DEFAULT_HEARTBEAT_MS = 12 * 60 * 60 * 1000;
const HEARTBEAT_MS = Math.max(
    DEFAULT_HEARTBEAT_MS,
    Number(process.env.BILLING_RECONCILE_HEARTBEAT_MS) || DEFAULT_HEARTBEAT_MS,
);

// ---------------------------------------------------------------------------
// Local helper — normalizes expired subscription state on User.
// Idempotent: filter ensures only still-stale users are updated.
//
// Preserves (never touched):
//   subscription.expiresAt  — historical record
//   subscription.provider   — audit trail
//   renewalFailedAt         — audit signal for 5.10a.3.4 UI banner
//   tranzilaSto.*           — independent STO lifecycle
//   cancellation fields     — audit trail
//   all other user fields
// ---------------------------------------------------------------------------
async function normalizeUserExpiredBilling(user, now) {
    // Pre-check: skip if already normalized or not actually expired.
    if (
        user.subscription?.status !== "active" ||
        !user.subscription?.expiresAt ||
        new Date(user.subscription.expiresAt) >= now
    ) {
        return false;
    }

    const result = await User.updateOne(
        {
            _id: user._id,
            "subscription.status": "active",
            "subscription.expiresAt": { $lt: now },
        },
        {
            $set: {
                "subscription.status": "expired",
                plan: "free",
                // Fields explicitly NOT in $set:
                // renewalFailedAt         — preserved (audit signal)
                // subscription.expiresAt  — preserved (historical record)
                // subscription.provider   — preserved (audit trail)
                // tranzilaSto.*           — independent lifecycle
                // cancellation fields     — audit trail
            },
        },
    );

    return result.modifiedCount === 1;
}

async function reconcileOnce() {
    if (running) return;
    running = true;

    const now = new Date();

    const sweep = async () => {
        // Primary candidate query: all expired active paid users with a card.
        // Does NOT filter on renewalFailedAt — expiry truth is the sole trigger.
        const candidates = await User.find({
            "subscription.status": "active",
            "subscription.expiresAt": { $lt: now },
            cardId: { $ne: null },
        }).select("_id cardId plan subscription.status subscription.expiresAt");

        let downgradedCards = 0;
        let normalizedUsers = 0;
        let normalizedUsersWithoutCard = 0;
        let userNormalizedAfterCardRace = 0;
        let skippedCardMissing = 0;
        let skippedStillPaid = 0;
        let skippedAlreadyDowngraded = 0;
        let skippedAdminOverride = 0;
        let errors = 0;

        for (const user of candidates) {
            try {
                // --- A. Load card ---
                const card = await Card.findById(user.cardId).select(
                    "_id plan billing downgradedAt adminOverride",
                );

                // --- B. Missing card ---
                // Card may have been deleted. This does not excuse stale User
                // billing truth. Normalize User, skip card logic.
                if (!card) {
                    skippedCardMissing += 1;
                    const normalized = await normalizeUserExpiredBilling(
                        user,
                        now,
                    );
                    if (normalized) normalizedUsersWithoutCard += 1;
                    continue;
                }

                // --- C. Defense-in-depth: check current billing truth ---
                // If the card is genuinely still paid (e.g. a concurrent webhook
                // extended paidUntil), skip both card and user normalization.
                const billing = resolveBilling(card, now);
                if (billing?.source === "billing") {
                    skippedStillPaid += 1;
                    continue;
                }

                // --- D. Active adminOverride covering premium state ---
                // Preserve Card in its admin-override premium state.
                // Do NOT skip User normalization: subscription.expiresAt is
                // expired regardless of adminOverride on card.
                if (billing?.source === "adminOverride") {
                    skippedAdminOverride += 1;
                    const normalized = await normalizeUserExpiredBilling(
                        user,
                        now,
                    );
                    if (normalized) normalizedUsers += 1;
                    continue;
                }

                // --- E. Stale expired paid card: CARD-FIRST normalization ---

                // Card update — race-guarded by downgradedAt: null.
                // Targets only stale paid billing status ("active" or legacy "paid").
                const cardResult = await Card.updateOne(
                    {
                        _id: card._id,
                        downgradedAt: null,
                        "billing.status": { $in: ["active", "paid"] },
                    },
                    {
                        $set: {
                            plan: "free",
                            "billing.status": "free",
                            "billing.plan": "free",
                            "billing.paidUntil": null,
                            downgradedAt: now,
                            // Fields explicitly NOT in $set:
                            // billing.payer       — admin attribution, untouched
                            // billing.features    — admin feature flags, untouched
                            // retentionPurgedAt   — managed by retentionPurge only
                            // adminOverride       — admin tool only
                        },
                    },
                );

                if (cardResult.modifiedCount === 1) {
                    downgradedCards += 1;
                } else {
                    // Card was already downgraded or race-missed (another process
                    // won the downgradedAt update between our query and this write).
                    skippedAlreadyDowngraded += 1;
                }

                // Anti-drift: always attempt User normalization after the card step,
                // even if card was already downgraded or the update race-missed.
                // This repairs partially dirty state from prior incomplete runs.
                const userNormalized = await normalizeUserExpiredBilling(
                    user,
                    now,
                );
                if (userNormalized) {
                    if (cardResult.modifiedCount === 0) {
                        userNormalizedAfterCardRace += 1;
                    } else {
                        normalizedUsers += 1;
                    }
                }
            } catch (err) {
                errors += 1;
                console.error("[billing-reconcile] candidate error", {
                    error: err?.message || String(err),
                });
            }
        }

        if (candidates.length) {
            console.log("[billing-reconcile] done", {
                candidates: candidates.length,
                downgradedCards,
                normalizedUsers,
                normalizedUsersWithoutCard,
                userNormalizedAfterCardRace,
                skippedCardMissing,
                skippedStillPaid,
                skippedAlreadyDowngraded,
                skippedAdminOverride,
                errors,
            });
        } else {
            const nowMs = Date.now();
            if (nowMs - lastHeartbeatAt >= HEARTBEAT_MS) {
                console.log("[billing-reconcile] heartbeat", {
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
        console.error("[billing-reconcile] failed", err?.message || err);
    } finally {
        running = false;
    }
}

export function startBillingReconcileJob({
    intervalMs = 6 * 60 * 60 * 1000,
} = {}) {
    monitorIntervalMs = intervalMs;

    // Boot delay: 90 s — next free slot after existing jobs.
    // Existing slots: 15 s (trialCleanup), 30 s (resetMailWorker),
    //   45 s (trialLifecycleReconcile), 60 s (retentionPurge), 75 s (trialReminderJob).
    setTimeout(() => {
        reconcileOnce();
    }, 90 * 1000);

    setInterval(() => {
        reconcileOnce();
    }, intervalMs);

    console.log("[billing-reconcile] scheduled", { intervalMs });
}
