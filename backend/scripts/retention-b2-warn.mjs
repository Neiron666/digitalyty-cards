import "dotenv/config";
import mongoose from "mongoose";

// ── Arg parsing ───────────────────────────────────────────────────

function hasFlag(name) {
    return process.argv.slice(2).includes(name);
}

// ── Usage guard ───────────────────────────────────────────────────

if (!hasFlag("--run")) {
    console.log(
        JSON.stringify(
            {
                ok: false,
                usage: "node scripts/retention-b2-warn.mjs --run [--apply --i-understand-sending]",
                reason: "Missing --run flag. This script sends B2 inactivity warning emails. Add --run to proceed.",
                modes: {
                    "dry-run (default)":
                        "node scripts/retention-b2-warn.mjs --run",
                    apply: "node scripts/retention-b2-warn.mjs --run --apply --i-understand-sending",
                },
                env_overrides: {
                    INACTIVITY_B2_TTL_DAYS: "default 90",
                    INACTIVITY_B2_GRACE_DAYS: "default 14",
                },
            },
            null,
            2,
        ),
    );
    process.exitCode = 1;
    process.exit(1);
}

// ── Mode resolution ───────────────────────────────────────────────

const DRY_RUN = !hasFlag("--apply");
const ACKNOWLEDGED = hasFlag("--i-understand-sending");

// ── Apply safety gate ─────────────────────────────────────────────

if (!DRY_RUN && !ACKNOWLEDGED) {
    console.log(
        JSON.stringify(
            {
                ok: false,
                reason: "Apply mode requires --i-understand-sending. This script sends warning emails to B2 inactivity candidates. Re-run with both --apply and --i-understand-sending.",
                usage: "node scripts/retention-b2-warn.mjs --run --apply --i-understand-sending",
            },
            null,
            2,
        ),
    );
    process.exitCode = 1;
    process.exit(1);
}

// ── Env guard ─────────────────────────────────────────────────────

if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required");
}

// ── Threshold config ──────────────────────────────────────────────

const B2_DAYS = Math.max(
    1,
    parseInt(process.env.INACTIVITY_B2_TTL_DAYS ?? "90", 10) || 90,
);

const GRACE_DAYS = Math.max(
    1,
    parseInt(process.env.INACTIVITY_B2_GRACE_DAYS ?? "14", 10) || 14,
);

// Stale-claim reclaim threshold: a claim older than this is treated as
// abandoned (process crash between claim and send) and becomes re-eligible.
const STALE_WARN_THRESHOLD_MS = 4 * 60 * 60 * 1000; // 4 h

// ── Mongoose config ───────────────────────────────────────────────

mongoose.set("autoIndex", false);
mongoose.set("autoCreate", false);

// ── Main ──────────────────────────────────────────────────────────

async function main() {
    await mongoose.connect(process.env.MONGO_URI);

    // Dynamic imports after connection (mirrors governance-script convention).
    const { default: User } = await import("../src/models/User.model.js");
    const { default: Card } = await import("../src/models/Card.model.js");
    const { default: OrganizationMember } =
        await import("../src/models/OrganizationMember.model.js");
    const { default: PaymentTransaction } =
        await import("../src/models/PaymentTransaction.model.js");
    const { default: OrgInvite } =
        await import("../src/models/OrgInvite.model.js");
    const { sendDeletionWarningEmailMailjetBestEffort } =
        await import("../src/services/mailjet.service.js");
    const { getSiteUrl } = await import("../src/utils/siteUrl.util.js");

    // Build loginUrl once — sourced from existing getSiteUrl() resolution
    // (SITE_URL → PUBLIC_ORIGIN → PUBLIC_URL → canonical fallback).
    // Not hard-coded; not rebuilt per-candidate.
    const loginUrl = getSiteUrl() + "/login";

    const now = new Date();
    const cutoffB2 = new Date(now.getTime() - B2_DAYS * 24 * 60 * 60 * 1000);
    const staleBefore = new Date(now.getTime() - STALE_WARN_THRESHOLD_MS);
    const graceDeadline = new Date(
        now.getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000,
    );

    // ── Batch pre-loads ────────────────────────────────────────────
    // PaymentTransaction has no userId index — per-doc findOne inside the
    // cursor would cause a full collection scan per candidate.
    // Batch pre-load is mandatory.

    const paidTxDocs = await PaymentTransaction.find(
        { status: "paid", userId: { $ne: null } },
        { userId: 1 },
    ).lean();
    const paidUserIds = new Set(paidTxDocs.map((d) => String(d.userId)));

    const activeMemberDocs = await OrganizationMember.find(
        { status: "active" },
        { userId: 1 },
    ).lean();
    const activeOrgMemberIds = new Set(
        activeMemberDocs.map((d) => String(d.userId)),
    );

    const pendingInviteDocs = await OrgInvite.find(
        { revokedAt: null, usedAt: null, expiresAt: { $gt: now } },
        { email: 1 },
    ).lean();
    const pendingInviteEmails = new Set(
        pendingInviteDocs
            .map((d) =>
                typeof d.email === "string" ? d.email.trim().toLowerCase() : "",
            )
            .filter(Boolean),
    );

    // ── Counters ───────────────────────────────────────────────────
    // skip_reasons tracks all filter exits (pre- and post-candidacy).
    // skippedCount counts only post-candidacy skips (claim-race, reverify).
    // Invariant: candidateCount === warnedCount + skippedCount + errorCount.

    let scannedCount = 0;
    let candidateCount = 0;
    let warnedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const skip_reasons = {
        too_recent: 0,
        exempt_admin: 0,
        exempt_paid: 0,
        exempt_org: 0,
        pending_invite: 0,
        stale_card_ref: 0,
        claim_race: 0,
        reverify_failed: 0,
    };

    // ── Cursor scan ────────────────────────────────────────────────
    // Narrow at query level: verified, no card, not yet warned, and either
    // never claimed or with a stale claim (enabling stale-claim reclaim).

    const cursor = User.find(
        {
            isVerified: true,
            cardId: null,
            b2WarningSentAt: null,
            $or: [
                { b2WarningClaimedAt: null },
                { b2WarningClaimedAt: { $lte: staleBefore } },
            ],
        },
        {
            _id: 1,
            email: 1,
            firstName: 1,
            role: 1,
            adminTier: 1,
            cardId: 1,
            isVerified: 1,
            lastLoginAt: 1,
            createdAt: 1,
            b2WarningSentAt: 1,
        },
    )
        .lean()
        .cursor();

    for await (const user of cursor) {
        scannedCount++;
        const uid = user._id;
        const normalizedEmail =
            typeof user.email === "string"
                ? user.email.trim().toLowerCase()
                : "";

        // ── Fast pre-filter (in-memory — no extra DB reads) ────────
        // Pre-filter exits go to skip_reasons only. They do NOT increment
        // skippedCount — those are reserved for post-candidacy exits so the
        // sanity invariant (candidateCount === warnedCount + skippedCount
        // + errorCount) holds correctly.

        // Inactivity: use lastLoginAt where available; fall back to createdAt
        // for users who predate the lastLoginAt field rollout.
        const activityAt = user.lastLoginAt ?? user.createdAt;
        if (!activityAt || activityAt > cutoffB2) {
            skip_reasons.too_recent++;
            continue;
        }

        if (user.role === "admin" || user.adminTier != null) {
            skip_reasons.exempt_admin++;
            continue;
        }

        if (paidUserIds.has(String(uid))) {
            skip_reasons.exempt_paid++;
            continue;
        }

        if (activeOrgMemberIds.has(String(uid))) {
            skip_reasons.exempt_org++;
            continue;
        }

        if (normalizedEmail && pendingInviteEmails.has(normalizedEmail)) {
            skip_reasons.pending_invite++;
            continue;
        }

        // Stale Card.user reference — 1 DB read per candidate, only after all
        // cheaper in-memory filters. Card.user_1 is a sparse index.
        const staleCard = await Card.findOne({ user: uid }, { _id: 1 }).lean();
        if (staleCard) {
            skip_reasons.stale_card_ref++;
            continue;
        }

        // ── B2 candidate confirmed ─────────────────────────────────
        candidateCount++;

        // ── Dry-run: no email, no stamp ────────────────────────────
        if (DRY_RUN) {
            warnedCount++; // "would-warn" count — no send attempted
            continue;
        }

        // ── Atomic claim ───────────────────────────────────────────
        // Only the process that successfully sets b2WarningClaimedAt from
        // null/stale to now may proceed. A null result means another process
        // claimed this candidate first and we must skip.
        const claimed = await User.findOneAndUpdate(
            {
                _id: uid,
                b2WarningSentAt: null,
                $or: [
                    { b2WarningClaimedAt: null },
                    { b2WarningClaimedAt: { $lte: staleBefore } },
                ],
            },
            { $set: { b2WarningClaimedAt: now } },
            { new: false },
        );

        if (!claimed) {
            skip_reasons.claim_race++;
            skippedCount++;
            continue;
        }

        // ── Re-verify live DB state ────────────────────────────────
        // Guards against state changes between cursor query and claim.
        // Any failure → release claim, count as skipped.

        const liveUser = await User.findById(uid, {
            isVerified: 1,
            cardId: 1,
            role: 1,
            adminTier: 1,
            lastLoginAt: 1,
            createdAt: 1,
            b2WarningSentAt: 1,
        }).lean();

        const liveActivityAt = liveUser?.lastLoginAt ?? liveUser?.createdAt;
        const stillInactive = Boolean(
            liveActivityAt && liveActivityAt <= cutoffB2,
        );

        if (
            !liveUser ||
            liveUser.isVerified !== true ||
            liveUser.cardId != null ||
            liveUser.role === "admin" ||
            liveUser.adminTier != null ||
            liveUser.b2WarningSentAt != null ||
            !stillInactive
        ) {
            await User.updateOne(
                { _id: uid },
                { $set: { b2WarningClaimedAt: null } },
            );
            skip_reasons.reverify_failed++;
            skippedCount++;
            continue;
        }

        const liveCard = await Card.findOne({ user: uid }, { _id: 1 }).lean();
        if (liveCard) {
            await User.updateOne(
                { _id: uid },
                { $set: { b2WarningClaimedAt: null } },
            );
            skip_reasons.reverify_failed++;
            skippedCount++;
            continue;
        }

        const livePaidTx = await PaymentTransaction.findOne(
            { userId: uid, status: "paid" },
            { _id: 1 },
        ).lean();
        if (livePaidTx) {
            await User.updateOne(
                { _id: uid },
                { $set: { b2WarningClaimedAt: null } },
            );
            skip_reasons.reverify_failed++;
            skippedCount++;
            continue;
        }

        const liveOrgMember = await OrganizationMember.findOne(
            { userId: uid, status: "active" },
            { _id: 1 },
        ).lean();
        if (liveOrgMember) {
            await User.updateOne(
                { _id: uid },
                { $set: { b2WarningClaimedAt: null } },
            );
            skip_reasons.reverify_failed++;
            skippedCount++;
            continue;
        }

        if (normalizedEmail) {
            const liveInvite = await OrgInvite.findOne(
                {
                    email: normalizedEmail,
                    revokedAt: null,
                    usedAt: null,
                    expiresAt: { $gt: now },
                },
                { _id: 1 },
            ).lean();
            if (liveInvite) {
                await User.updateOne(
                    { _id: uid },
                    { $set: { b2WarningClaimedAt: null } },
                );
                skip_reasons.reverify_failed++;
                skippedCount++;
                continue;
            }
        }

        // ── Send warning email ─────────────────────────────────────
        // Strictly transactional — no marketing gate, no unsubscribe logic.
        // firstName is passed to the mail helper for the greeting only and
        // is never printed in any log line.
        // In apply mode, MAILJET_NOT_CONFIGURED is treated as an error
        // (not a silent skip) to prevent undetected no-op production runs.

        const result = await sendDeletionWarningEmailMailjetBestEffort({
            toEmail: user.email,
            loginUrl,
            graceUntil: graceDeadline,
            firstName: user.firstName ?? null,
            userId: String(uid),
        });

        if (result.ok && !result.skipped) {
            // ── Success: stamp sentAt + graceUntil ─────────────────
            // Idempotent guard (b2WarningSentAt: null) ensures only one
            // stamp lands even under concurrent pressure.
            await User.updateOne(
                { _id: uid, b2WarningSentAt: null },
                {
                    $set: {
                        b2WarningSentAt: now,
                        b2GraceUntil: graceDeadline,
                    },
                },
            );
            warnedCount++;
            console.error(
                JSON.stringify({ action: "warned", userId: String(uid) }),
            );
        } else {
            // ── Failure: release claim, count as error ─────────────
            // Covers both genuine Mailjet failures and MAILJET_NOT_CONFIGURED.
            // Release allows a retry on the next operator-triggered run.
            await User.updateOne(
                { _id: uid },
                { $set: { b2WarningClaimedAt: null } },
            );
            errorCount++;
            console.error(
                JSON.stringify({
                    action: "error",
                    userId: String(uid),
                    reason: result.reason ?? "send_failed",
                }),
            );
        }
    }

    // ── Summary output (machine-readable JSON to stdout) ──────────

    const sanity_ok =
        candidateCount === warnedCount + skippedCount + errorCount;

    console.log(
        JSON.stringify(
            {
                runAt: now.toISOString(),
                mode: DRY_RUN ? "dry-run" : "apply",
                thresholds: { b2_days: B2_DAYS, grace_days: GRACE_DAYS },
                scannedCount,
                candidateCount,
                warnedCount,
                skippedCount,
                errorCount,
                sanity_ok,
                skip_reasons,
                note: DRY_RUN
                    ? "dry-run: no emails sent; warnedCount = would-warn candidates. sanity_ok: candidateCount === warnedCount + skippedCount + errorCount"
                    : "sanity_ok: candidateCount === warnedCount + skippedCount + errorCount",
            },
            null,
            2,
        ),
    );

    process.exitCode = sanity_ok ? 0 : 1;
}

try {
    await main();
} finally {
    await mongoose.disconnect();
}
