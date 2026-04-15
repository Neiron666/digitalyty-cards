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
                usage: "node scripts/retention-b2-cleanup.mjs --run [--apply --i-understand-deletion]",
                reason: "Missing --run flag. This script performs B2 inactivity account cleanup. Add --run to proceed.",
                modes: {
                    "dry-run (default)":
                        "node scripts/retention-b2-cleanup.mjs --run",
                    apply: "node scripts/retention-b2-cleanup.mjs --run --apply --i-understand-deletion",
                },
                env_overrides: {
                    INACTIVITY_B2_TTL_DAYS: "default 90",
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
const ACKNOWLEDGED = hasFlag("--i-understand-deletion");

// ── Destructive safety gate ───────────────────────────────────────

if (!DRY_RUN && !ACKNOWLEDGED) {
    console.log(
        JSON.stringify(
            {
                ok: false,
                reason: "Apply mode requires --i-understand-deletion flag. Re-run with both --apply and --i-understand-deletion.",
                usage: "node scripts/retention-b2-cleanup.mjs --run --apply --i-understand-deletion",
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

// Note: INACTIVITY_B2_GRACE_DAYS is intentionally NOT read here.
// Grace eligibility is determined entirely by the stored b2GraceUntil field
// on each user, stamped by the warn pass at send time.
// Using the stored value prevents env-drift between warn and cleanup runs
// (see User.model.js b2GraceUntil field comment).

// ── Mongoose config ───────────────────────────────────────────────

mongoose.set("autoIndex", false);
mongoose.set("autoCreate", false);

// ── Main ──────────────────────────────────────────────────────────

async function main() {
    await mongoose.connect(process.env.MONGO_URI);

    // Dynamic imports after connection (mirrors governance-script convention).
    const { default: User } = await import("../src/models/User.model.js");
    const { default: EmailVerificationToken } =
        await import("../src/models/EmailVerificationToken.model.js");
    const { default: EmailSignupToken } =
        await import("../src/models/EmailSignupToken.model.js");
    const { default: PasswordReset } =
        await import("../src/models/PasswordReset.model.js");
    const { default: ActivePasswordReset } =
        await import("../src/models/ActivePasswordReset.model.js");
    const { default: MailJob } = await import("../src/models/MailJob.model.js");
    const { default: OrgInvite } =
        await import("../src/models/OrgInvite.model.js");
    // Read-only guard models — never deleted
    const { default: Card } = await import("../src/models/Card.model.js");
    const { default: OrganizationMember } =
        await import("../src/models/OrganizationMember.model.js");
    const { default: PaymentTransaction } =
        await import("../src/models/PaymentTransaction.model.js");

    const now = new Date();
    const cutoffB2 = new Date(now.getTime() - B2_DAYS * 24 * 60 * 60 * 1000);

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
    // skippedCount counts only post-candidacy skips (reverify).
    // Invariant: candidateCount === deletedCount + skippedCount + errorCount.

    let scannedCount = 0;
    let candidateCount = 0;
    let deletedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const skip_reasons = {
        too_recent: 0,
        reactivated: 0, // Guard 2: lastLoginAt > b2WarningSentAt (post-warning login)
        exempt_admin: 0,
        exempt_paid: 0,
        exempt_org: 0,
        pending_invite: 0,
        stale_card_ref: 0,
        reverify_failed: 0,
    };

    // ── Cursor scan ────────────────────────────────────────────────
    // Narrow at query level: verified, no card, warned, grace expired.
    // b2GraceUntil is the stored per-user value stamped by the warn pass —
    // not recomputed from any env var.

    const cursor = User.find(
        {
            isVerified: true,
            cardId: null,
            b2WarningSentAt: { $ne: null },
            b2GraceUntil: { $lt: now },
        },
        {
            _id: 1,
            email: 1,
            role: 1,
            adminTier: 1,
            cardId: 1,
            isVerified: 1,
            lastLoginAt: 1,
            createdAt: 1,
            b2WarningSentAt: 1,
            b2GraceUntil: 1,
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
        // sanity invariant (candidateCount === deletedCount + skippedCount
        // + errorCount) holds correctly.

        // Guard 1 — Standard inactivity re-check.
        // Use lastLoginAt where available; fall back to createdAt for users
        // who predate the lastLoginAt field rollout.
        const activityAt = user.lastLoginAt ?? user.createdAt;
        if (!activityAt || activityAt > cutoffB2) {
            skip_reasons.too_recent++;
            continue;
        }

        // Guard 2 — Explicit re-activation guard (post-warning login).
        // If the user logged in after the warning was sent, they have
        // re-activated and must not be deleted, regardless of the inactivity
        // threshold. This guard uses stored absolute timestamps and cannot be
        // bypassed by env changes between warn and cleanup runs.
        if (
            user.lastLoginAt != null &&
            user.lastLoginAt > user.b2WarningSentAt
        ) {
            skip_reasons.reactivated++;
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

        // ── B2 cleanup candidate confirmed ─────────────────────────
        candidateCount++;

        // ── Pre-deletion re-verify (live DB, runs in both modes) ───
        // Guards against state changes between cursor query and deletion.
        // Any failure → count as skipped.

        const liveUser = await User.findById(uid, {
            isVerified: 1,
            cardId: 1,
            role: 1,
            adminTier: 1,
            lastLoginAt: 1,
            createdAt: 1,
            b2WarningSentAt: 1,
            b2GraceUntil: 1,
        }).lean();

        const liveActivityAt = liveUser?.lastLoginAt ?? liveUser?.createdAt;
        const stillInactive = Boolean(
            liveActivityAt && liveActivityAt <= cutoffB2,
        );
        const notReactivated =
            liveUser?.lastLoginAt == null ||
            liveUser.lastLoginAt <= liveUser.b2WarningSentAt;

        if (
            !liveUser ||
            liveUser.isVerified !== true ||
            liveUser.cardId != null ||
            liveUser.role === "admin" ||
            liveUser.adminTier != null ||
            liveUser.b2WarningSentAt == null ||
            liveUser.b2GraceUntil == null ||
            liveUser.b2GraceUntil >= now ||
            !notReactivated ||
            !stillInactive
        ) {
            skip_reasons.reverify_failed++;
            skippedCount++;
            if (!DRY_RUN) {
                console.error(
                    JSON.stringify({
                        action: "skip",
                        userId: String(uid),
                        reason: "reverify_user_changed",
                    }),
                );
            }
            continue;
        }

        const liveCard = await Card.findOne({ user: uid }, { _id: 1 }).lean();
        if (liveCard) {
            skip_reasons.reverify_failed++;
            skippedCount++;
            if (!DRY_RUN) {
                console.error(
                    JSON.stringify({
                        action: "skip",
                        userId: String(uid),
                        reason: "reverify_card_found",
                    }),
                );
            }
            continue;
        }

        const livePaidTx = await PaymentTransaction.findOne(
            { userId: uid, status: "paid" },
            { _id: 1 },
        ).lean();
        if (livePaidTx) {
            skip_reasons.reverify_failed++;
            skippedCount++;
            if (!DRY_RUN) {
                console.error(
                    JSON.stringify({
                        action: "skip",
                        userId: String(uid),
                        reason: "reverify_paid_tx_found",
                    }),
                );
            }
            continue;
        }

        const liveOrgMember = await OrganizationMember.findOne(
            { userId: uid, status: "active" },
            { _id: 1 },
        ).lean();
        if (liveOrgMember) {
            skip_reasons.reverify_failed++;
            skippedCount++;
            if (!DRY_RUN) {
                console.error(
                    JSON.stringify({
                        action: "skip",
                        userId: String(uid),
                        reason: "reverify_org_member_found",
                    }),
                );
            }
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
                skip_reasons.reverify_failed++;
                skippedCount++;
                if (!DRY_RUN) {
                    console.error(
                        JSON.stringify({
                            action: "skip",
                            userId: String(uid),
                            reason: "reverify_invite_found",
                        }),
                    );
                }
                continue;
            }
        }

        // ── Dry-run: candidate would be deleted ────────────────────

        if (DRY_RUN) {
            deletedCount++;
            continue;
        }

        // ── Apply: deletion sequence ───────────────────────────────

        try {
            await EmailVerificationToken.deleteMany({ userId: uid });

            if (normalizedEmail) {
                await EmailSignupToken.deleteMany({
                    emailNormalized: normalizedEmail,
                });
            }

            await PasswordReset.deleteMany({ userId: uid });
            await ActivePasswordReset.deleteMany({ userId: uid });
            await MailJob.deleteMany({ userId: uid });

            if (normalizedEmail) {
                await OrgInvite.deleteMany({
                    email: normalizedEmail,
                    revokedAt: null,
                    usedAt: null,
                    expiresAt: { $gt: now },
                });
            }

            await User.deleteOne({ _id: uid });

            console.error(
                JSON.stringify({ action: "deleted", userId: String(uid) }),
            );
            deletedCount++;
        } catch (err) {
            errorCount++;
            console.error(
                JSON.stringify({
                    action: "error",
                    userId: String(uid),
                    message: err?.message ?? String(err),
                }),
            );
        }
    }

    // ── Summary output (machine-readable JSON to stdout) ──────────

    const sanity_ok =
        candidateCount === deletedCount + skippedCount + errorCount;

    console.log(
        JSON.stringify(
            {
                runAt: now.toISOString(),
                mode: DRY_RUN ? "dry-run" : "apply",
                thresholds: { b2_days: B2_DAYS },
                scannedCount,
                candidateCount,
                deletedCount,
                skippedCount,
                errorCount,
                sanity_ok,
                skip_reasons,
                note: DRY_RUN
                    ? "dry-run: no records deleted; deletedCount = would-delete candidates. sanity_ok: candidateCount === deletedCount + skippedCount + errorCount"
                    : "sanity_ok: candidateCount === deletedCount + skippedCount + errorCount",
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
