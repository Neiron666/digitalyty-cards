import "dotenv/config";
import mongoose from "mongoose";

// Governed migration for the MarketingCampaignRecipient collection indexes.
// Dry-run by default. Apply requires explicit acknowledgement flags.
// Mirrors backend/scripts/migrate-marketing-campaign-indexes.mjs conventions
// (flags, guards, autoIndex/autoCreate off, JSON-safe output).
//
// This slice CREATES MISSING indexes only. It NEVER drops and NEVER
// recreates drifted indexes — drift remediation is a separate operator step.

// ── Arg parsing ───────────────────────────────────────────────────

function hasFlag(name) {
    return process.argv.slice(2).includes(name);
}

function parseBoolEnv(value) {
    if (typeof value !== "string") return false;
    const normalized = value.trim().toLowerCase();
    if (!normalized) return false;
    return ["1", "true", "yes", "y", "on"].includes(normalized);
}

// ── Helpers ───────────────────────────────────────────────────────

function safeIndexes(collection) {
    return collection.indexes().catch((err) => {
        const code = err?.code;
        const codeName = err?.codeName;
        if (code === 26 || codeName === "NamespaceNotFound") return [];
        throw err;
    });
}

// Required indexes for the marketingcampaignrecipients collection.
// Mirrors MarketingCampaignRecipient.model.js exactly.
const REQUIRED_INDEXES = [
    {
        name: "marketing_campaign_recipient_campaign_user_v1",
        key: { campaignId: 1, userId: 1 },
        options: {
            name: "marketing_campaign_recipient_campaign_user_v1",
            unique: true,
        },
    },
    {
        name: "marketing_campaign_recipient_campaign_status_v1",
        key: { campaignId: 1, status: 1 },
        options: {
            name: "marketing_campaign_recipient_campaign_status_v1",
        },
    },
    {
        name: "marketing_campaign_recipient_status_next_attempt_v1",
        key: { status: 1, nextAttemptAt: 1 },
        options: {
            name: "marketing_campaign_recipient_status_next_attempt_v1",
        },
    },
];

// ── Main ─────────────────────────────────────────────────────────

async function main() {
    const apply = hasFlag("--apply");
    const acknowledgeDowntime = hasFlag("--i-understand-index-downtime");
    const force = hasFlag("--force");
    const allowByEnv = parseBoolEnv(process.env.ALLOW_INDEX_MIGRATION);

    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI is missing in environment variables");
    }

    // Never let this script trigger automatic index builds.
    mongoose.set("autoIndex", false);
    mongoose.set("autoCreate", false);

    const { default: MarketingCampaignRecipient } =
        await import("../src/models/MarketingCampaignRecipient.model.js");

    let connected = false;
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            autoIndex: false,
            autoCreate: false,
        });
        connected = true;

        const before = await safeIndexes(MarketingCampaignRecipient.collection);
        const beforeNames = before.map((i) => i?.name).filter(Boolean);

        const missing = REQUIRED_INDEXES.filter(
            (req) => !beforeNames.includes(req.name),
        );

        console.log(
            JSON.stringify(
                {
                    mode: apply ? "apply" : "dry-run",
                    collection: "marketingcampaignrecipients",
                    currentIndexes: beforeNames,
                    requiredIndexes: REQUIRED_INDEXES.map((r) => r.name),
                    missing: missing.map((r) => r.name),
                },
                null,
                2,
            ),
        );

        // ── DRY-RUN path ─────────────────────────────────────────

        if (!apply) {
            if (missing.length === 0) {
                console.log(
                    JSON.stringify(
                        {
                            ok: true,
                            reason: "all required indexes present (dry-run)",
                        },
                        null,
                        2,
                    ),
                );
                process.exitCode = 0;
                return;
            }

            console.log(
                JSON.stringify(
                    {
                        ok: false,
                        reason: "required indexes missing (dry-run) — PENDING_INDEX_APPLY",
                        wouldCreate: missing.map((r) => ({
                            key: r.key,
                            options: r.options,
                        })),
                    },
                    null,
                    2,
                ),
            );
            process.exitCode = 1;
            return;
        }

        // ── APPLY safety gates ────────────────────────────────────

        const hasAcknowledgement = acknowledgeDowntime || allowByEnv;
        if (!hasAcknowledgement) {
            console.log(
                JSON.stringify(
                    {
                        ok: false,
                        reason: "apply refused: missing --i-understand-index-downtime or ALLOW_INDEX_MIGRATION=1",
                    },
                    null,
                    2,
                ),
            );
            process.exitCode = 1;
            return;
        }

        if (String(process.env.NODE_ENV || "").toLowerCase() === "production") {
            if (!force) {
                console.log(
                    JSON.stringify(
                        {
                            ok: false,
                            reason: "apply refused in NODE_ENV=production without --force",
                        },
                        null,
                        2,
                    ),
                );
                process.exitCode = 1;
                return;
            }
        }

        // ── APPLY path ────────────────────────────────────────────
        // Create missing indexes only. Never drop, never recreate drift.

        if (missing.length === 0) {
            console.log(
                JSON.stringify(
                    {
                        ok: true,
                        reason: "no-op: all required indexes already present",
                    },
                    null,
                    2,
                ),
            );
            process.exitCode = 0;
            return;
        }

        for (const req of missing) {
            await MarketingCampaignRecipient.collection.createIndex(
                req.key,
                req.options,
            );
        }

        // ── Post-check verification ───────────────────────────────

        const after = await safeIndexes(MarketingCampaignRecipient.collection);
        const afterNames = after.map((i) => i?.name).filter(Boolean);
        const stillMissing = REQUIRED_INDEXES.filter(
            (req) => !afterNames.includes(req.name),
        ).map((r) => r.name);

        const ok = stillMissing.length === 0;

        console.log(
            JSON.stringify(
                {
                    ok,
                    created: missing.map((r) => r.name),
                    currentIndexes: afterNames,
                    ...(ok ? {} : { stillMissing }),
                },
                null,
                2,
            ),
        );

        process.exitCode = ok ? 0 : 1;
    } finally {
        if (connected) await mongoose.disconnect();
    }
}

main()
    .catch((err) => {
        console.error(
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
    })
    .finally(() => {
        console.log(`EXIT:${process.exitCode ?? 0}`);
    });
