import "dotenv/config";
import mongoose from "mongoose";

// ── Arg parsing ───────────────────────────────────────────────────

function hasFlag(name) {
    return process.argv.slice(2).includes(name);
}

/**
 * Get the value of a named argument in either "--key=value" or "--key value" form.
 * Returns null if not present.
 */
function getFlagValue(name) {
    const args = process.argv.slice(2);
    const eqArg = args.find((a) => a.startsWith(name + "="));
    if (eqArg) return eqArg.slice(name.length + 1);
    const idx = args.indexOf(name);
    if (
        idx !== -1 &&
        idx + 1 < args.length &&
        !args[idx + 1].startsWith("--")
    ) {
        return args[idx + 1];
    }
    return null;
}

// ── Usage guard ───────────────────────────────────────────────────

if (!hasFlag("--run")) {
    console.log(
        JSON.stringify(
            {
                ok: false,
                usage: "node scripts/classify-retention-buckets.mjs --run [--sample N]",
                reason: "Missing --run flag. This script performs a read-only DB scan. Add --run to proceed.",
                env_overrides: {
                    INACTIVITY_B1_TTL_DAYS: "default 30",
                    INACTIVITY_B2_TTL_DAYS: "default 90",
                    INACTIVITY_B3_TTL_DAYS: "default 180",
                },
            },
            null,
            2,
        ),
    );
    process.exitCode = 1;
    process.exit(1);
}

// ── Sample flag ───────────────────────────────────────────────────

const sampleRaw = getFlagValue("--sample");
const SAMPLE_N =
    sampleRaw != null ? Math.max(0, parseInt(sampleRaw, 10) || 0) : 0;

// ── Thresholds (configurable via env, matching runbook env var names) ──

const B1_DAYS = Math.max(
    1,
    parseInt(process.env.INACTIVITY_B1_TTL_DAYS ?? "30", 10),
);
const B2_DAYS = Math.max(
    1,
    parseInt(process.env.INACTIVITY_B2_TTL_DAYS ?? "90", 10),
);
const B3_DAYS = Math.max(
    1,
    parseInt(process.env.INACTIVITY_B3_TTL_DAYS ?? "180", 10),
);

// ── Bucket counter keys ───────────────────────────────────────────

const BUCKET_KEYS = [
    "B1_candidate",
    "B2_candidate",
    "B3_candidate",
    "B4_exempt_published",
    "B5_exempt_paid",
    "B6_exempt_org",
    "B7_exempt_admin",
    "SKIP_pending_org_invite",
    "SKIP_too_recent",
    "SKIP_lastLoginAt_null_recent",
    "UNCLASSIFIED_stale_card_ref",
    "UNCLASSIFIED_missing_card_ref",
    "UNCLASSIFIED_active_trial",
    "UNCLASSIFIED_formerly_paid",
    "UNCLASSIFIED_legacy_sub_active",
    "UNCLASSIFIED_unknown_state",
];

const counts = Object.fromEntries(BUCKET_KEYS.map((k) => [k, 0]));

// userId-only samples (never email, firstName, or any contact field)
const samples =
    SAMPLE_N > 0 ? Object.fromEntries(BUCKET_KEYS.map((k) => [k, []])) : null;

function record(bucket, uid) {
    counts[bucket]++;
    if (samples && samples[bucket].length < SAMPLE_N) {
        samples[bucket].push(String(uid));
    }
}

// ── Main ─────────────────────────────────────────────────────────

async function main() {
    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI is missing in environment variables");
    }

    // Prevent accidental index/collection creation.
    mongoose.set("autoIndex", false);
    mongoose.set("autoCreate", false);

    // Dynamic imports after autoIndex/autoCreate are set (mirrors migration script pattern).
    const { default: User } = await import("../src/models/User.model.js");
    const { default: Card } = await import("../src/models/Card.model.js");
    const { default: OrganizationMember } =
        await import("../src/models/OrganizationMember.model.js");
    const { default: PaymentTransaction } =
        await import("../src/models/PaymentTransaction.model.js");
    const { default: OrgInvite } =
        await import("../src/models/OrgInvite.model.js");
    const { default: DeletedEmailBlock } =
        await import("../src/models/DeletedEmailBlock.model.js");

    // NOTE: cardDeleteCascade.js and emailBlock.util.js are intentionally NOT imported.
    // This script performs no destructive or tombstone operations.

    let connected = false;
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            autoIndex: false,
            autoCreate: false,
        });
        connected = true;

        const now = new Date();

        // ── Phase 1: Batch pre-loads (before cursor) ───────────────────────────

        // PaymentTransaction has no userId index (only providerTxnId unique).
        // Per-user query would be O(users × PT_size). Batch-load is the only safe strategy.
        const ptDocs = await PaymentTransaction.find(
            { status: "paid", userId: { $ne: null } },
            { userId: 1 },
        ).lean();
        const paidUserIds = new Set(ptDocs.map((d) => String(d.userId)));

        // OrgMember: userId has an index, but batch-load keeps the loop clean.
        const omDocs = await OrganizationMember.find(
            { status: "active" },
            { userId: 1 },
        ).lean();
        const activeOrgMemberIds = new Set(omDocs.map((d) => String(d.userId)));

        // OrgInvite: no standalone email index (all compound indexes lead with orgId).
        // Batch-load all pending, non-revoked, non-expired invites by email.
        const inviteDocs = await OrgInvite.find(
            { revokedAt: null, usedAt: null, expiresAt: { $gt: now } },
            { email: 1 },
        ).lean();
        const pendingInviteEmails = new Set(inviteDocs.map((d) => d.email));

        // Tombstone count — informational only. emailKey has a unique index: O(1).
        const tombstoneCount = await DeletedEmailBlock.countDocuments();

        // Bucket inactivity cutoff timestamps.
        const MS_PER_DAY = 86_400_000;
        const cutoffB1 = new Date(now.getTime() - B1_DAYS * MS_PER_DAY);
        const cutoffB2 = new Date(now.getTime() - B2_DAYS * MS_PER_DAY);
        const cutoffB3 = new Date(now.getTime() - B3_DAYS * MS_PER_DAY);

        // ── Phase 2: Cursor scan ───────────────────────────────────────────────

        // Fetch only the fields needed for classification. Never pull email into output;
        // we need it solely for the pendingInviteEmails Set lookup (in memory, never printed).
        const cursor = User.find(
            {},
            {
                _id: 1,
                email: 1, // lookup only — never included in output
                isVerified: 1,
                role: 1,
                adminTier: 1,
                cardId: 1,
                subscription: 1,
                lastLoginAt: 1,
                createdAt: 1,
            },
        )
            .lean()
            .cursor();

        let totalScanned = 0;

        for await (const user of cursor) {
            totalScanned++;
            const uid = user._id;

            // ── Priority 1: Pending org invite — skip for ALL live buckets ─────
            // Conservative: even B1 unverified accounts are skipped.
            if (pendingInviteEmails.has(user.email)) {
                record("SKIP_pending_org_invite", uid);
                continue;
            }

            // ── Priority 2: B7 — user-level admin exemptions ──────────────────
            if (user.role === "admin" || user.adminTier != null) {
                record("B7_exempt_admin", uid);
                continue;
            }

            // ── Priority 3: B6 — active org membership ────────────────────────
            if (activeOrgMemberIds.has(String(uid))) {
                record("B6_exempt_org", uid);
                continue;
            }

            // ── Priority 4: Legacy subscription active guard ──────────────────
            // User.subscription.status is a legacy billing field not modelled in
            // the bucket matrix. Conservative: treat "active" as unclassified.
            if (user.subscription?.status === "active") {
                record("UNCLASSIFIED_legacy_sub_active", uid);
                continue;
            }

            // ── Priority 5: B5 — paid history (via batch-loaded set) ──────────
            if (paidUserIds.has(String(uid))) {
                record("B5_exempt_paid", uid);
                continue;
            }

            // ── Bucket-specific paths ──────────────────────────────────────────

            const hasCard = user.cardId != null;
            const isVerified = Boolean(user.isVerified);

            // ── B1 path: unverified + no card ─────────────────────────────────
            if (!isVerified && !hasCard) {
                // Stale card-ref check: same as B2. User.cardId is null but a Card
                // with Card.user = userId may still exist (legacy / interrupted flow).
                // If found, treat as UNCLASSIFIED to avoid deleting a user whose card
                // document still holds a reference to them.
                // Card has a sparse `user_1` index — this lookup is O(log n).
                const orphanCard = await Card.findOne(
                    { user: uid },
                    { _id: 1 },
                ).lean();
                if (orphanCard) {
                    record("UNCLASSIFIED_stale_card_ref", uid);
                    continue;
                }

                if (user.createdAt > cutoffB1) {
                    record("SKIP_too_recent", uid);
                    continue;
                }
                record("B1_candidate", uid);
                continue;
            }

            // ── B2 path: verified + no card ───────────────────────────────────
            if (isVerified && !hasCard) {
                // Stale card-ref check: User.cardId is null but a Card with
                // Card.user = userId may still exist (legacy data / interrupted claim).
                // Card has a sparse `user_1` index — this lookup is O(log n).
                const orphanCard = await Card.findOne(
                    { user: uid },
                    { _id: 1 },
                ).lean();
                if (orphanCard) {
                    record("UNCLASSIFIED_stale_card_ref", uid);
                    continue;
                }

                // Inactivity signal.
                if (user.lastLoginAt != null) {
                    if (user.lastLoginAt > cutoffB2) {
                        record("SKIP_too_recent", uid);
                        continue;
                    }
                } else {
                    // null lastLoginAt: user predates field or never issued credentials.
                    // Use createdAt as fallback. If account is newer than threshold,
                    // null is ambiguous — skip conservatively.
                    if (user.createdAt > cutoffB2) {
                        record("SKIP_lastLoginAt_null_recent", uid);
                        continue;
                    }
                }

                record("B2_candidate", uid);
                continue;
            }

            // ── B3 path: verified + has card ──────────────────────────────────
            if (isVerified && hasCard) {
                const card = await Card.findById(user.cardId, {
                    status: 1,
                    billing: 1,
                    adminOverride: 1,
                    adminTier: 1,
                }).lean();

                if (!card) {
                    // User.cardId references a document that no longer exists.
                    record("UNCLASSIFIED_missing_card_ref", uid);
                    continue;
                }

                // B7 card-level: adminOverride.plan or Card.adminTier set.
                // Conservative: treat Card.adminTier as B7-exempt even though
                // POLICY_RETENTION_V1.md §2.B7 only lists adminOverride.plan.
                if (
                    card.adminOverride?.plan != null ||
                    card.adminTier != null
                ) {
                    record("B7_exempt_admin", uid);
                    continue;
                }

                // B5 card-level billing (active/past_due means currently paying).
                const billStatus = card.billing?.status ?? "free";
                if (billStatus === "active" || billStatus === "past_due") {
                    record("B5_exempt_paid", uid);
                    continue;
                }

                // B4 — published free card: unconditionally exempt from V1.
                if (card.status === "published") {
                    record("B4_exempt_published", uid);
                    continue;
                }

                // Ambiguous billing states — do not classify into any wave.
                if (billStatus === "trial") {
                    record("UNCLASSIFIED_active_trial", uid);
                    continue;
                }

                if (billStatus === "canceled") {
                    // Formerly paid: financial history exists. Conservative:
                    // route to UNCLASSIFIED for operator review rather than B3.
                    record("UNCLASSIFIED_formerly_paid", uid);
                    continue;
                }

                // At this point we expect: billing.status = "free", card.status = "draft".
                // Any other combination is an unknown state.
                if (card.status !== "draft" || billStatus !== "free") {
                    record("UNCLASSIFIED_unknown_state", uid);
                    continue;
                }

                // Inactivity signal (same null-handling as B2, B3 threshold).
                if (user.lastLoginAt != null) {
                    if (user.lastLoginAt > cutoffB3) {
                        record("SKIP_too_recent", uid);
                        continue;
                    }
                } else {
                    if (user.createdAt > cutoffB3) {
                        record("SKIP_lastLoginAt_null_recent", uid);
                        continue;
                    }
                }

                record("B3_candidate", uid);
                continue;
            }

            // ── Catch-all: unverified + has card, or any other unexpected state ─
            record("UNCLASSIFIED_unknown_state", uid);
        }

        // ── Phase 3: Build output and enforce sanity invariant ────────────────

        const sumBuckets = Object.values(counts).reduce((a, b) => a + b, 0);
        const sanityOk = sumBuckets === totalScanned;

        const bucketsOutput = {};
        for (const key of BUCKET_KEYS) {
            bucketsOutput[key] = samples
                ? { count: counts[key], sample_user_ids: samples[key] }
                : { count: counts[key] };
        }

        const output = {
            runAt: now.toISOString(),
            thresholds: {
                b1_days: B1_DAYS,
                b2_days: B2_DAYS,
                b3_days: B3_DAYS,
            },
            buckets: bucketsOutput,
            tombstone_count: tombstoneCount,
            total_users_scanned: totalScanned,
            sanity_ok: sanityOk,
            note: "sanity_ok: true means sum of all bucket counts equals total_users_scanned",
        };

        console.log(JSON.stringify(output, null, 2));

        process.exitCode = sanityOk ? 0 : 1;
    } finally {
        if (connected) await mongoose.disconnect();
    }
}

main().catch((err) => {
    console.log(
        JSON.stringify(
            {
                ok: false,
                error: {
                    message: err?.message ?? String(err),
                    name: err?.name ?? null,
                },
            },
            null,
            2,
        ),
    );
    process.exitCode = 1;
});
