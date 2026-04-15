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
                usage: "node scripts/retention-b1-cleanup.mjs --run [--apply --i-understand-deletion]",
                reason: "Missing --run flag. This script performs B1 account cleanup. Add --run to proceed.",
                modes: {
                    "dry-run (default)":
                        "node scripts/retention-b1-cleanup.mjs --run",
                    apply: "node scripts/retention-b1-cleanup.mjs --run --apply --i-understand-deletion",
                },
                env_overrides: {
                    INACTIVITY_B1_TTL_DAYS: "default 30",
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
                usage: "node scripts/retention-b1-cleanup.mjs --run --apply --i-understand-deletion",
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

const B1_DAYS = Math.max(
    1,
    parseInt(process.env.INACTIVITY_B1_TTL_DAYS ?? "30", 10) || 30,
);

// ── Mongoose config ───────────────────────────────────────────────

mongoose.set("autoIndex", false);
mongoose.set("autoCreate", false);

// ── Main ──────────────────────────────────────────────────────────

async function main() {
    await mongoose.connect(process.env.MONGO_URI);

    // Dynamic imports after connection (mirrors governance script convention)
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
    const cutoffB1 = new Date(now.getTime() - B1_DAYS * 24 * 60 * 60 * 1000);

    // ── Batch pre-loads ────────────────────────────────────────────

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

    let scannedCount = 0;
    let candidateCount = 0;
    let deletedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const skip_reasons = {
        too_recent: 0,
        exempt_admin: 0,
        exempt_paid: 0,
        exempt_org: 0,
        pending_invite: 0,
        stale_card_ref: 0,
        reverify_failed: 0,
    };

    // ── Cursor scan ────────────────────────────────────────────────

    const cursor = User.find(
        { isVerified: false, cardId: null },
        {
            _id: 1,
            email: 1,
            role: 1,
            adminTier: 1,
            cardId: 1,
            isVerified: 1,
            createdAt: 1,
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

        if (user.createdAt > cutoffB1) {
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

        // Stale card ownership check (1 DB read per candidate — after cheaper in-memory filters)
        const staleCard = await Card.findOne({ user: uid }, { _id: 1 }).lean();
        if (staleCard) {
            skip_reasons.stale_card_ref++;
            continue;
        }

        // ── B1 candidate confirmed ─────────────────────────────────
        candidateCount++;

        // ── Pre-deletion re-verify (live DB, runs in both modes) ───

        const liveUser = await User.findById(uid, {
            isVerified: 1,
            cardId: 1,
            role: 1,
            adminTier: 1,
        }).lean();

        if (
            !liveUser ||
            liveUser.isVerified === true ||
            liveUser.cardId != null ||
            liveUser.role === "admin" ||
            liveUser.adminTier != null
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
                thresholds: { b1_days: B1_DAYS },
                scannedCount,
                candidateCount,
                deletedCount,
                skippedCount,
                errorCount,
                sanity_ok,
                skip_reasons,
                note: "sanity_ok: candidateCount === deletedCount + skippedCount + errorCount",
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
