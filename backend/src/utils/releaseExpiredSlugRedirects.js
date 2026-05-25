import SlugRedirect from "../models/SlugRedirect.model.js";

// Global sweep for slug quarantines that have passed their expiresAt.
// Does NOT connect to DB — caller is responsible for an open connection.
// Does NOT touch: reclaimedAt, targetCardId, sourceCardId, targetSlugSnapshot,
// targetOrgSlugSnapshot, createdBy, expiresAt, permanentQuarantine, manualReleaseRequired.
//
// Returns:
//   { ok, dryRun, checkedAt, candidateCount, [modifiedCount], durationMs }

function buildReleaseFilter(now) {
    return {
        status: "redirect_quarantine",
        permanentQuarantine: { $ne: true },
        manualReleaseRequired: { $ne: true },
        expiresAt: { $lte: now },
    };
}

export async function releaseExpiredSlugRedirects({
    now = new Date(),
    dryRun = false,
} = {}) {
    const start = Date.now();
    const filter = buildReleaseFilter(now);

    if (dryRun) {
        const candidateCount = await SlugRedirect.countDocuments(filter);
        return {
            ok: true,
            dryRun: true,
            checkedAt: now.toISOString(),
            candidateCount,
            durationMs: Date.now() - start,
        };
    }

    const result = await SlugRedirect.updateMany(filter, {
        $set: {
            status: "released",
            releasedAt: now,
        },
    });

    return {
        ok: true,
        dryRun: false,
        checkedAt: now.toISOString(),
        candidateCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        durationMs: Date.now() - start,
    };
}
