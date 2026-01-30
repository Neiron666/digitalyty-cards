import "dotenv/config";

import crypto from "node:crypto";

import mongoose from "mongoose";

import app from "../src/app.js";
import { connectDB } from "../src/config/db.js";
import Card from "../src/models/Card.model.js";
import User from "../src/models/User.model.js";
import { signToken } from "../src/utils/jwt.js";

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function sha256_16(input) {
    return crypto
        .createHash("sha256")
        .update(String(input))
        .digest("hex")
        .slice(0, 16);
}

function randomHex(bytes = 6) {
    return crypto.randomBytes(bytes).toString("hex");
}

async function listen(serverApp) {
    return await new Promise((resolve, reject) => {
        const server = serverApp.listen(0, "127.0.0.1", () => resolve(server));
        server.on("error", reject);
    });
}

async function readJson(res) {
    const text = await res.text();
    try {
        return text ? JSON.parse(text) : null;
    } catch {
        return { raw: text };
    }
}

async function postClaim({ baseUrl, token, anonymousId }) {
    const res = await fetch(`${baseUrl}/cards/claim`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "x-anonymous-id": anonymousId,
            Accept: "application/json",
        },
    });

    const body = await readJson(res);
    return { status: res.status, body };
}

async function cleanupDocs({ userIds, cardIds }) {
    const uids = Array.isArray(userIds) ? userIds : [];
    const cids = Array.isArray(cardIds) ? cardIds : [];

    try {
        await Card.deleteMany({ _id: { $in: cids } });
    } catch {
        // ignore
    }
    try {
        await User.deleteMany({ _id: { $in: uids } });
    } catch {
        // ignore
    }
}

async function main() {
    // Capture logs in-process (useful for verifying that failures are logged).
    const capturedErrors = [];
    const originalConsoleError = console.error;
    console.error = (...args) => {
        try {
            capturedErrors.push(args.map((x) => String(x)).join(" "));
        } catch {
            // ignore
        }
        originalConsoleError(...args);
    };

    // Mongo
    await connectDB(process.env.MONGO_URI);

    // JWT secret is required for auth middleware.
    assert(
        typeof process.env.JWT_SECRET === "string" &&
            process.env.JWT_SECRET.trim(),
        "Missing JWT_SECRET in env",
    );

    const server = await listen(app);
    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}/api`;

    const createdUserIds = [];
    const createdCardIds = [];

    try {
        // 409 scenario: user already has card
        {
            const user = await User.create({
                email: `sanity-409-${Date.now()}-${randomHex()}@example.com`,
                passwordHash: "sanity",
                cardId: new mongoose.Types.ObjectId(),
            });
            createdUserIds.push(user._id);

            const token = signToken(String(user._id));
            const anonymousId = crypto.randomUUID();

            const r = await postClaim({ baseUrl, token, anonymousId });
            assert(r.status === 409, `expected 409, got ${r.status}`);
            assert(
                r.body && r.body.code === "USER_ALREADY_HAS_CARD",
                `expected USER_ALREADY_HAS_CARD, got ${JSON.stringify(r.body)}`,
            );
        }

        // 502 scenario: media migration fails (missing object in Storage)
        {
            const user = await User.create({
                email: `sanity-502-${Date.now()}-${randomHex()}@example.com`,
                passwordHash: "sanity",
            });
            createdUserIds.push(user._id);

            const anonymousId = crypto.randomUUID();
            const anonHash = sha256_16(anonymousId);

            const card = await Card.create({
                slug: `sanity-502-${Date.now()}-${randomHex()}`,
                anonymousId,
                status: "draft",
                business: { name: "Sanity 502" },
                design: {},
                gallery: [],
                uploads: [],
            });
            createdCardIds.push(card._id);

            const missingPath = `cards/anon/${anonHash}/${String(card._id)}/background/${crypto.randomUUID()}.png`;
            await Card.updateOne(
                { _id: card._id },
                {
                    $set: {
                        "design.backgroundImagePath": missingPath,
                        "design.coverImagePath": missingPath,
                    },
                },
            );

            const token = signToken(String(user._id));
            const r = await postClaim({ baseUrl, token, anonymousId });
            assert(r.status === 502, `expected 502, got ${r.status}`);
            assert(
                r.body && r.body.code === "MEDIA_MIGRATION_FAILED",
                `expected MEDIA_MIGRATION_FAILED, got ${JSON.stringify(r.body)}`,
            );

            const fresh = await Card.findById(card._id).lean();
            assert(
                fresh &&
                    !fresh.user &&
                    String(fresh.anonymousId || "") === anonymousId,
                "expected ownership NOT to be switched on 502",
            );

            assert(
                capturedErrors.some((s) =>
                    s.includes("[claim] media copy failed"),
                ),
                "expected a '[claim] media copy failed' log for 502 scenario",
            );
        }

        // 500 scenario: CLAIM_FAILED (Mongo validation failure on card.save)
        {
            const user = await User.create({
                email: `sanity-500-${Date.now()}-${randomHex()}@example.com`,
                passwordHash: "sanity",
            });
            createdUserIds.push(user._id);

            const anonymousId = crypto.randomUUID();

            const card = await Card.create({
                slug: `sanity-500-${Date.now()}-${randomHex()}`,
                anonymousId,
                status: "draft",
                business: { name: "Sanity 500" },
                design: {},
                gallery: [],
                uploads: [],
            });
            createdCardIds.push(card._id);

            // Make the doc invalid so that claim's card.save() fails with a non-duplicate error.
            await Card.updateOne({ _id: card._id }, { $set: { slug: null } });

            const token = signToken(String(user._id));
            const r = await postClaim({ baseUrl, token, anonymousId });
            assert(r.status === 500, `expected 500, got ${r.status}`);
            assert(
                r.body && r.body.code === "CLAIM_FAILED",
                `expected CLAIM_FAILED, got ${JSON.stringify(r.body)}`,
            );

            const fresh = await Card.findById(card._id).lean();
            assert(
                fresh &&
                    !fresh.user &&
                    String(fresh.anonymousId || "") === anonymousId,
                "expected no partial ownership to remain on 500",
            );

            assert(
                capturedErrors.some((s) =>
                    s.includes("[claim] card save failed"),
                ),
                "expected a '[claim] card save failed' log for 500 scenario",
            );
        }

        console.log("OK", {
            baseUrl,
            checks: {
                http409: true,
                http502: true,
                http500: true,
            },
        });
    } finally {
        await cleanupDocs({ userIds: createdUserIds, cardIds: createdCardIds });

        await new Promise((resolve) => server.close(() => resolve()));
        await mongoose.disconnect();

        console.error = originalConsoleError;
    }
}

main().catch((err) => {
    console.error("FAILED", err?.message || err);
    process.exitCode = 1;
});
