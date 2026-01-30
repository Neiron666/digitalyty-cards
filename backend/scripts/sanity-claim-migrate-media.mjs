import "dotenv/config";

import crypto from "node:crypto";

import { connectDB } from "../src/config/db.js";
import Card from "../src/models/Card.model.js";
import User from "../src/models/User.model.js";
import {
    uploadBuffer,
    downloadToBuffer,
    getAnonPrivateBucketName,
    getPublicBucketName,
    removeObjects,
} from "../src/services/supabaseStorage.js";
import { claimAnonymousCardForUser } from "../src/services/claimCard.service.js";
import {
    collectSupabasePathsFromCard,
    normalizeSupabasePaths,
} from "../src/utils/supabasePaths.js";

function requireEnv(name) {
    const v = process.env[name];
    if (!v || !String(v).trim()) {
        throw new Error(`Missing env var: ${name}`);
    }
    return String(v).trim();
}

function randomHex(bytes = 6) {
    return crypto.randomBytes(bytes).toString("hex");
}

function sha256_16(input) {
    return crypto
        .createHash("sha256")
        .update(String(input))
        .digest("hex")
        .slice(0, 16);
}

function tinyPngBuffer() {
    // 1x1 transparent PNG
    const base64 =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/erWf2cAAAAASUVORK5CYII=";
    return Buffer.from(base64, "base64");
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

async function main() {
    // Mongo
    await connectDB(process.env.MONGO_URI);

    // Supabase env sanity
    requireEnv("SUPABASE_URL");
    requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    requireEnv("SUPABASE_STORAGE_BUCKET");

    const anonBucket = getAnonPrivateBucketName({ allowFallback: false });
    assert(
        anonBucket,
        "SUPABASE_STORAGE_BUCKET_ANON_PRIVATE must be configured for this sanity script",
    );

    const publicBucket = getPublicBucketName();

    const anonId = crypto.randomUUID();
    const anonHash = sha256_16(anonId);

    const email = `sanity-claim-${Date.now()}-${randomHex()}@example.com`;
    const user = await User.create({
        email,
        passwordHash: "sanity",
    });

    const slug = `sanity-claim-${Date.now()}-${randomHex()}`;
    const card = await Card.create({
        slug,
        anonymousId: anonId,
        status: "draft",
        business: { name: "Sanity Claim" },
        design: {},
        gallery: [],
        uploads: [],
    });

    const cardId = String(card._id);

    // Build anon paths (same shape as upload.controller.js)
    const bgPathOld = `cards/anon/${anonHash}/${cardId}/background/${crypto.randomUUID()}.png`;
    const gPathOld = `cards/anon/${anonHash}/${cardId}/gallery/${crypto.randomUUID()}.png`;
    const gtPathOld = `cards/anon/${anonHash}/${cardId}/galleryThumb/${crypto.randomUUID()}.png`;

    // Upload 3 objects into anon-private bucket
    const png = tinyPngBuffer();

    const uploadedBg = await uploadBuffer({
        buffer: png,
        mime: "image/png",
        path: bgPathOld,
        bucket: anonBucket,
        signedUrlExpiresIn: 60,
    });

    const uploadedG = await uploadBuffer({
        buffer: png,
        mime: "image/png",
        path: gPathOld,
        bucket: anonBucket,
        signedUrlExpiresIn: 60,
    });

    const uploadedGT = await uploadBuffer({
        buffer: png,
        mime: "image/png",
        path: gtPathOld,
        bucket: anonBucket,
        signedUrlExpiresIn: 60,
    });

    // Persist references as the editor would
    card.design = {
        ...(card.design || {}),
        backgroundImagePath: bgPathOld,
        coverImagePath: bgPathOld,
        backgroundImage: uploadedBg.url,
        coverImage: uploadedBg.url,
    };

    card.gallery = [
        {
            url: uploadedG.url,
            path: gPathOld,
            thumbUrl: uploadedGT.url,
            thumbPath: gtPathOld,
            createdAt: new Date(),
        },
    ];

    card.uploads = [
        {
            kind: "background",
            url: uploadedBg.url,
            path: bgPathOld,
            createdAt: new Date(),
        },
        {
            kind: "gallery",
            url: uploadedG.url,
            path: gPathOld,
            createdAt: new Date(),
        },
        {
            kind: "gallerythumb",
            url: uploadedGT.url,
            path: gtPathOld,
            createdAt: new Date(),
        },
    ];

    await card.save();

    const beforePaths = normalizeSupabasePaths(
        collectSupabasePathsFromCard(card),
    );

    // Claim + migrate
    const result = await claimAnonymousCardForUser({
        userId: String(user._id),
        anonymousId: anonId,
        strict: true,
    });

    assert(result && result.ok, `claim failed: ${JSON.stringify(result)}`);

    const freshCard = await Card.findById(card._id).lean();
    const freshUser = await User.findById(user._id).lean();

    assert(
        String(freshUser.cardId) === cardId,
        "user.cardId not set correctly",
    );
    assert(
        String(freshCard.user) === String(user._id),
        "card.user not set correctly",
    );
    assert(!freshCard.anonymousId, "card.anonymousId was not cleared");

    const bgPathNew = freshCard?.design?.backgroundImagePath;
    assert(
        typeof bgPathNew === "string" &&
            bgPathNew.includes(`cards/user/${String(user._id)}/${cardId}/`),
        "design.backgroundImagePath not migrated to cards/user/...",
    );

    const bgUrlNew = freshCard?.design?.backgroundImage;
    assert(
        typeof bgUrlNew === "string" && /^https?:\/\//i.test(bgUrlNew),
        "design.backgroundImage not a public url",
    );

    const g0 = Array.isArray(freshCard.gallery) ? freshCard.gallery[0] : null;
    assert(g0 && typeof g0 === "object", "gallery[0] missing");
    assert(
        typeof g0.path === "string" &&
            g0.path.includes(`cards/user/${String(user._id)}/${cardId}/`),
        "gallery[0].path not migrated",
    );
    assert(
        typeof g0.url === "string" && /^https?:\/\//i.test(g0.url),
        "gallery[0].url not a public url",
    );

    const afterPaths = normalizeSupabasePaths(
        collectSupabasePathsFromCard(freshCard),
    );
    const hasOldPaths = afterPaths.some((p) => p.startsWith("cards/anon/"));
    if (hasOldPaths) {
        const oldPaths = afterPaths
            .filter((p) => p.startsWith("cards/anon/"))
            .slice(0, 10);
        console.error("REMAINING_OLD_PATHS", {
            userId: String(user._id),
            cardId,
            oldPaths,
            design: freshCard?.design,
            gallery0: Array.isArray(freshCard?.gallery)
                ? freshCard.gallery[0]
                : null,
            uploads0: Array.isArray(freshCard?.uploads)
                ? freshCard.uploads[0]
                : null,
        });
    }
    assert(
        !hasOldPaths,
        "card still references cards/anon/* paths after claim",
    );

    // Confirm migrated objects exist in PUBLIC bucket and are readable.
    for (const p of afterPaths) {
        assert(
            p.startsWith(`cards/user/${String(user._id)}/${cardId}/`),
            `unexpected path after claim: ${p}`,
        );
        const buf = await downloadToBuffer({ bucket: publicBucket, path: p });
        assert(buf && buf.length > 0, `public object missing/empty: ${p}`);
    }

    // Idempotency: repeat claim should return "already has card".
    const repeat = await claimAnonymousCardForUser({
        userId: String(user._id),
        anonymousId: anonId,
        strict: true,
    });
    assert(
        repeat &&
            repeat.ok === false &&
            repeat.code === "USER_ALREADY_HAS_CARD",
        `repeat claim did not return USER_ALREADY_HAS_CARD: ${JSON.stringify(
            repeat,
        )}`,
    );

    // Simulate Mongo E11000 (duplicate Card.user) safety:
    // remove user.cardId to bypass early return, create a second anon card, then claim it.
    await User.updateOne({ _id: user._id }, { $unset: { cardId: 1 } });

    const anonId2 = crypto.randomUUID();
    const anonHash2 = sha256_16(anonId2);
    const card2 = await Card.create({
        slug: `sanity-claim-dup-${Date.now()}-${randomHex()}`,
        anonymousId: anonId2,
        status: "draft",
        business: { name: "Sanity Claim Duplicate" },
        design: {},
        gallery: [],
        uploads: [],
    });

    const card2Id = String(card2._id);
    const bg2Old = `cards/anon/${anonHash2}/${card2Id}/background/${crypto.randomUUID()}.png`;
    const uploaded2 = await uploadBuffer({
        buffer: png,
        mime: "image/png",
        path: bg2Old,
        bucket: anonBucket,
        signedUrlExpiresIn: 60,
    });

    card2.design = {
        ...(card2.design || {}),
        backgroundImagePath: bg2Old,
        coverImagePath: bg2Old,
        backgroundImage: uploaded2.url,
        coverImage: uploaded2.url,
    };
    await card2.save();

    const dupAttempt = await claimAnonymousCardForUser({
        userId: String(user._id),
        anonymousId: anonId2,
        strict: true,
    });

    assert(
        dupAttempt &&
            dupAttempt.ok === false &&
            dupAttempt.code === "USER_ALREADY_HAS_CARD",
        `duplicate claim did not return USER_ALREADY_HAS_CARD: ${JSON.stringify(
            dupAttempt,
        )}`,
    );

    const fresh2 = await Card.findById(card2._id).lean();
    assert(!fresh2.user, "duplicate claim unexpectedly set card2.user");
    assert(
        String(fresh2.anonymousId || "") === anonId2,
        "duplicate claim unexpectedly cleared card2.anonymousId",
    );

    // Ensure any copied public objects for card2 were cleaned up best-effort.
    const bg2File = bg2Old.split("/").pop();
    const expectedBg2New = `cards/user/${String(user._id)}/${card2Id}/background/${bg2File}`;
    try {
        await downloadToBuffer({ bucket: publicBucket, path: expectedBg2New });
        throw new Error(
            "expected cleanup of copied public object for duplicate claim, but object still exists",
        );
    } catch {
        // ok
    }

    // Best-effort: confirm old objects are gone (may be skipped if cleanup fails)
    let oldDeleted = 0;
    for (const p of beforePaths) {
        if (!p.startsWith("cards/anon/")) continue;
        try {
            await downloadToBuffer({ bucket: anonBucket, path: p });
        } catch {
            oldDeleted += 1;
        }
    }

    console.log("OK", {
        userId: String(user._id),
        cardId,
        anonId,
        anonBucket,
        publicBucket,
        beforePathCount: beforePaths.length,
        afterPathCount: afterPaths.length,
        oldDeletedApprox: oldDeleted,
    });

    // Cleanup (best-effort)
    try {
        await removeObjects({
            paths: beforePaths,
            buckets: [anonBucket, publicBucket],
        });
    } catch {
        // ignore
    }
    try {
        await removeObjects({
            paths: afterPaths,
            buckets: [publicBucket, anonBucket],
        });
    } catch {
        // ignore
    }

    await Card.deleteOne({ _id: card._id });
    await Card.deleteOne({ _id: card2._id });
    await User.deleteOne({ _id: user._id });
}

main().catch((err) => {
    console.error("FAILED", err?.message || err);
    process.exitCode = 1;
});
