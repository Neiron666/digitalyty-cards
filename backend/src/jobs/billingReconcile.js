import User from "../models/User.model.js";
import Card from "../models/Card.model.js";
import * as Sentry from "@sentry/node";
import {
    getPersonalOrgIdReadOnly,
    classifyBillingScope,
} from "../utils/personalOrg.util.js";
import { isPersonalPaidGrace48hEnabled } from "../config/personalPaidGrace48h.config.js";
import { resolveLifecycleDowngradeDecision } from "../services/lifecycleDowngradeDecision.service.js";

// ---------------------------------------------------------------------------
// Billing reconcile job — normalizes stale expired paid subscription state
// after subscription.expiresAt / card.billing.paidUntil has passed.
//
// Handles ALL expired active paid users (self-cancelled, failed-renewal,
// lapsed) — not only failed-renewal users.
// renewalFailedAt is an audit marker and is never touched by this job.
//
// Write order: CARD-FIRST, User-normalization ONLY on confirmed Card success.
//   Reason: card.downgradedAt is the downstream trigger for retentionPurge.
//   The Card write is the sole destructive/decisive transition; User
//   normalization is a coupled follow-on, never an independent mutation.
//
// PERSONAL_PAID_GRACE_48H_STEP1: destructive Card authorization is delegated
// entirely to resolveLifecycleDowngradeDecision (canonical billingScope +
// personalPaidGrace48hEnabled) — no local billing/grace rules are duplicated
// here. The Card write uses an exact decision-preimage CAS (every field that
// can change the lifecycle decision is pinned to its captured snapshot
// value), not merely "paidUntil < now". User normalization only proceeds
// after cardResult.modifiedCount === 1, using an exact User-preimage CAS.
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
// STO renewal grace window — Tranzila My Billing charges are triggered by a
// billing-day schedule (charge_dom) and the provider notify may arrive hours
// after subscription.expiresAt passes (UTC) on the same calendar day.
// While the STO is active (status="created", stoId present) and the expiry is
// recent (within this window), skip the downgrade so handleStoNotify can
// still process the in-flight recurring charge and renew the subscription.
// ---------------------------------------------------------------------------
const STO_RENEWAL_GRACE_MS = 48 * 60 * 60 * 1000; // 48 hours

// ---------------------------------------------------------------------------
// Exact User-preimage CAS filter. Pins the exact candidate snapshot values
// (not "expiresAt < now") so a concurrent payment/renewal write on User
// causes this update to miss rather than overwrite newer state.
// ---------------------------------------------------------------------------
function buildExactUserPreimageCas(user) {
    return {
        _id: user._id,
        cardId: user.cardId,
        plan: user.plan ?? null,
        "subscription.status": user.subscription?.status ?? null,
        "subscription.expiresAt": user.subscription?.expiresAt ?? null,
    };
}

// ---------------------------------------------------------------------------
// Pure, DB-free decision core for one billing-reconcile candidate.
// Exported for test-only direct access. Does NOT duplicate billing/grace
// rules — those remain solely owned by resolveLifecycleDowngradeDecision.
//
// Returns one of:
//   { action: "card_missing" }
//   { action: "sto_renewal_grace" }
//   { action: "relation_mismatch" }
//   { action: "no_downgrade", reason }
//   { action: "downgrade", reason, cardCasFilter, cardSetPayload, userCasFilter }
// ---------------------------------------------------------------------------
export function resolveReconcileCandidateAction({
    user,
    card,
    personalOrgId,
    personalPaidGrace48hEnabled,
    now,
}) {
    if (!card) {
        return { action: "card_missing" };
    }

    // --- STO renewal grace window — preserved verbatim, unchanged ordering. ---
    const stoState = user.tranzilaSto ?? {};
    const expiresAtMs = user.subscription?.expiresAt
        ? new Date(user.subscription.expiresAt).getTime()
        : null;
    if (
        user.subscription?.provider === "tranzila" &&
        stoState.status === "created" &&
        stoState.stoId &&
        expiresAtMs !== null &&
        now.getTime() - expiresAtMs <= STO_RENEWAL_GRACE_MS
    ) {
        return { action: "sto_renewal_grace" };
    }

    // --- Exact User<->Card relation interlock. No anonymous Card can pass. ---
    const relationOk =
        card.user != null && String(card.user) === String(user._id);
    if (!relationOk) {
        return { action: "relation_mismatch" };
    }

    const billingScope = classifyBillingScope(card, personalOrgId);
    const decision = resolveLifecycleDowngradeDecision({
        card,
        billingScope,
        personalPaidGrace48hEnabled,
        now,
    });

    if (decision.allowPersonalDowngrade !== true) {
        return { action: "no_downgrade", reason: decision.reason };
    }

    // --- Exact Card decision-preimage CAS filter. ---
    const cardCasFilter = {
        _id: card._id,
        user: card.user,
        orgId: card.orgId ?? null,
        plan: card.plan ?? null,
        "billing.status": card.billing?.status ?? null,
        "billing.plan": card.billing?.plan ?? null,
        "billing.paidUntil": card.billing?.paidUntil ?? null,
        "adminOverride.until": card.adminOverride?.until ?? null,
        "adminOverride.plan": card.adminOverride?.plan ?? null,
        trialEndsAt: card.trialEndsAt ?? null,
        trialDeleteAt: card.trialDeleteAt ?? null,
        downgradedAt: null,
    };

    const cardSetPayload = {
        plan: "free",
        "billing.status": "free",
        "billing.plan": "free",
        "billing.paidUntil": null,
        downgradedAt: now,
    };

    return {
        action: "downgrade",
        reason: decision.reason,
        cardCasFilter,
        cardSetPayload,
        userCasFilter: buildExactUserPreimageCas(user),
    };
}

async function reconcileOnce() {
    if (running) return;
    running = true;

    const now = new Date();

    const sweep = async () => {
        // Read-only sentinel, resolved once per sweep (never the write-capable
        // getPersonalOrgId — this job must never create Organization data).
        const personalOrgId = await getPersonalOrgIdReadOnly();
        const personalPaidGrace48hEnabled = isPersonalPaidGrace48hEnabled();

        // Primary candidate query: all expired active paid users with a card.
        // Does NOT filter on renewalFailedAt — expiry truth is the sole trigger.
        const candidates = await User.find({
            "subscription.status": "active",
            "subscription.expiresAt": { $lt: now },
            cardId: { $ne: null },
        }).select(
            "_id cardId plan subscription.status subscription.expiresAt subscription.provider tranzilaSto.status tranzilaSto.stoId",
        );

        let downgradedCards = 0;
        let normalizedUsers = 0;
        let skippedCardMissing = 0;
        let skippedRelationMismatch = 0;
        let skippedStoRenewalGrace = 0;
        let skippedCardCasRace = 0;
        let skippedUserCasRace = 0;
        const skippedByReason = {};
        let errors = 0;

        for (const user of candidates) {
            try {
                const card = await Card.findById(user.cardId).select(
                    "_id user orgId plan billing adminOverride trialEndsAt trialDeleteAt downgradedAt",
                );

                const decision = resolveReconcileCandidateAction({
                    user,
                    card,
                    personalOrgId,
                    personalPaidGrace48hEnabled,
                    now,
                });

                if (decision.action === "card_missing") {
                    // Card may have been deleted. No Card to protect, and no
                    // User mutation either — this job only normalizes User
                    // state as a follow-on to a confirmed Card transition.
                    skippedCardMissing += 1;
                    continue;
                }

                if (decision.action === "sto_renewal_grace") {
                    skippedStoRenewalGrace += 1;
                    continue;
                }

                if (decision.action === "relation_mismatch") {
                    skippedRelationMismatch += 1;
                    continue;
                }

                if (decision.action === "no_downgrade") {
                    skippedByReason[decision.reason] =
                        (skippedByReason[decision.reason] || 0) + 1;
                    continue;
                }

                // --- decision.action === "downgrade" ---
                const cardResult = await Card.updateOne(
                    decision.cardCasFilter,
                    {
                        $set: decision.cardSetPayload,
                        // Fields explicitly NOT in $set:
                        // billing.payer       — admin attribution, untouched
                        // billing.features    — admin feature flags, untouched
                        // retentionPurgedAt   — managed by retentionPurge only
                        // adminOverride       — admin tool only
                    },
                );

                if (cardResult.modifiedCount !== 1) {
                    // Concurrent write changed the decision preimage between
                    // read and write (payment, admin override, trial change,
                    // or a prior sweep already won). No User mutation follows.
                    skippedCardCasRace += 1;
                    continue;
                }

                downgradedCards += 1;

                // User normalization ONLY after confirmed Card CAS success.
                const userResult = await User.updateOne(
                    decision.userCasFilter,
                    {
                        $set: {
                            "subscription.status": "expired",
                            plan: "free",
                        },
                    },
                );

                if (userResult.modifiedCount === 1) {
                    normalizedUsers += 1;
                } else {
                    // Bounded telemetry only — no Card rollback, no auto-repair.
                    skippedUserCasRace += 1;
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
                skippedCardMissing,
                skippedRelationMismatch,
                skippedStoRenewalGrace,
                skippedCardCasRace,
                skippedUserCasRace,
                skippedByReason,
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
