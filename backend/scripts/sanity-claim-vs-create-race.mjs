import "dotenv/config";

import crypto from "node:crypto";
import mongoose from "mongoose";

import app from "../src/app.js";
import { connectDB } from "../src/config/db.js";
import Card from "../src/models/Card.model.js";
import User from "../src/models/User.model.js";
import { signToken } from "../src/utils/jwt.js";
import { getPersonalOrgId } from "../src/utils/personalOrg.util.js";

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

async function requestJson({ url, method, headers, body }) {
    const res = await fetch(url, {
        method,
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...(headers || {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });

    return {
        status: res.status,
        body: await readJson(res),
    };
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

const anonymousId = crypto.randomUUID();
const email = `sanity-claim-then-mine-${Date.now()}-${crypto
    .randomBytes(3)
    .toString("hex")}@example.com`;

const mongoUri = process.env.MONGO_URI;
assert(mongoUri, "Missing MONGO_URI");

const jwtSecret = process.env.JWT_SECRET;
assert(jwtSecret && String(jwtSecret).trim(), "Missing JWT_SECRET");

const created = {
    userId: null,
    anonCardId: null,
};

await connectDB(mongoUri);

const personalOrgId = await getPersonalOrgId();
assert(personalOrgId, "Missing personalOrgId");
const personalOrgIdStr = String(personalOrgId);

const server = await listen(app);
const addr = server.address();
const baseUrl = `http://127.0.0.1:${addr.port}/api`;

try {
    const user = await User.create({ email, passwordHash: "sanity" });
    created.userId = String(user._id);

    const anonCard = await Card.create({
        slug: `sanity-claim-then-mine-${Date.now()}-${crypto
            .randomBytes(3)
            .toString("hex")}`,
        anonymousId,
        status: "draft",
        business: { name: "Sanity Claim Then Mine" },
        design: {},
        gallery: [],
        uploads: [],
    });
    created.anonCardId = String(anonCard._id);

    const token = signToken(String(user._id));
    const headers = {
        Authorization: `Bearer ${token}`,
        "x-anonymous-id": anonymousId,
    };

    // This simulates the frontend serialization fix: await claim BEFORE editor init.
    const claim = await requestJson({
        url: `${baseUrl}/cards/claim`,
        method: "POST",
        headers,
    });

    assert(claim.status === 200, `Expected claim 200, got ${claim.status}`);
    assert(
        claim.body && claim.body._id,
        "Expected claim response with card _id",
    );

    const mine = await requestJson({
        url: `${baseUrl}/cards/mine`,
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
        },
    });

    assert(mine.status === 200, `Expected mine 200, got ${mine.status}`);
    assert(
        mine.body && mine.body._id,
        "Expected /cards/mine response with card _id",
    );

    // After claim, editor should see the claimed card; no need to POST /cards.
    assert(
        String(mine.body._id) === String(claim.body._id),
        "Expected /cards/mine _id to equal claimed card _id",
    );

    // Additional safety: POST /cards should return existing card (200), not create a new one (201).
    const create = await requestJson({
        url: `${baseUrl}/cards`,
        method: "POST",
        headers,
        body: {},
    });

    assert(
        create.status === 200,
        `Expected POST /cards to return 200 after claim, got ${create.status}`,
    );
    assert(
        create.body && create.body._id,
        "Expected POST /cards response with _id",
    );
    assert(
        String(create.body._id) === String(claim.body._id),
        "Expected POST /cards _id to equal claimed card _id",
    );

    const freshUser = await User.findById(user._id).lean();
    const freshClaimedCard = await Card.findById(claim.body._id).lean();

    assert(freshUser?.cardId, "Expected Mongo User.cardId after claim");
    assert(
        String(freshUser.cardId) === String(claim.body._id),
        "Expected Mongo User.cardId to equal claimed card _id",
    );

    assert(freshClaimedCard?.user, "Expected Mongo Card.user after claim");
    assert(
        String(freshClaimedCard.user) === String(user._id),
        "Expected Mongo Card.user to equal user._id",
    );

    assert(
        freshClaimedCard?.orgId,
        "Expected Mongo Card.orgId to exist after claim",
    );
    assert(
        String(freshClaimedCard.orgId) === personalOrgIdStr,
        "Expected Mongo Card.orgId to equal personalOrgId after claim",
    );

    const anonLeft = await Card.findOne({ anonymousId }).lean();
    assert(
        !anonLeft,
        "Expected no remaining card with anonymousId after claim",
    );

    console.log(
        JSON.stringify(
            {
                ok: true,
                claim: { status: claim.status, cardId: String(claim.body._id) },
                mine: { status: mine.status, cardId: String(mine.body._id) },
                create: {
                    status: create.status,
                    cardId: String(create.body._id),
                },
                mongo: {
                    userId: String(user._id),
                    userCardId: String(freshUser.cardId),
                },
            },
            null,
            2,
        ),
    );
} finally {
    // Cleanup
    try {
        if (created.anonCardId)
            await Card.deleteOne({ _id: created.anonCardId });
    } catch {
        // ignore
    }

    try {
        if (created.userId) {
            await Card.deleteMany({ user: created.userId });
            const u = await User.findById(created.userId).lean();
            if (u?.cardId) await Card.deleteOne({ _id: u.cardId });
        }
    } catch {
        // ignore
    }

    try {
        if (created.userId) await User.deleteOne({ _id: created.userId });
    } catch {
        // ignore
    }

    await new Promise((resolve) => server.close(() => resolve()));
    await mongoose.disconnect();
}
