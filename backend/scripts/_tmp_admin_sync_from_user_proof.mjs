import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import { signToken } from "../src/utils/jwt.js";
import User from "../src/models/User.model.js";
import Card from "../src/models/Card.model.js";
import AdminAudit from "../src/models/AdminAudit.model.js";

const cardIdFromEnv = String(process.env.TMP_CARD_ID || "").trim();

function mustObjectId(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error(`Invalid ObjectId: ${id}`);
    }
    return new mongoose.Types.ObjectId(id);
}

async function main() {
    await connectDB(process.env.MONGO_URI);

    // If a proxy secret is enabled, allow loopback requests without the header.
    // See backend/src/app.js (CARDIGO_PROXY_SHARED_SECRET + ALLOW_LOCAL_DIRECT).
    process.env.ALLOW_LOCAL_DIRECT = "1";

    const { default: app } = await import("../src/app.js");
    const server = await new Promise((resolve) => {
        const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : null;
    if (!port) {
        console.log("NO_SERVER_PORT");
        process.exitCode = 10;
        return;
    }
    const origin = `http://127.0.0.1:${port}`;

    const adminUser = await User.findOne({ role: "admin" })
        .sort({ createdAt: 1 })
        .select("_id email role")
        .lean();

    if (!adminUser?._id) {
        console.log("NO_ADMIN_USER_FOUND");
        process.exitCode = 2;
        return;
    }

    const cardFilter = cardIdFromEnv
        ? { _id: mustObjectId(cardIdFromEnv) }
        : { user: { $exists: true, $ne: null } };

    const card = await Card.findOne(cardFilter)
        .sort({ updatedAt: -1 })
        .select("_id slug user billing plan")
        .lean();

    if (!card?._id) {
        console.log("NO_CARD_FOUND");
        process.exitCode = 3;
        return;
    }

    const token = signToken(String(adminUser._id));

    try {
        const url = `${origin}/api/admin/billing/cards/${card._id}/billing/sync-from-user`;

        const res = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: "{}",
        });

        const text = await res.text();

        console.log("ORIGIN", origin);
        console.log("ADMIN_USER_ID", String(adminUser._id));
        console.log("CARD_ID", String(card._id));
        console.log("CARD_SLUG", String(card.slug || ""));
        console.log("HTTP_STATUS", res.status);
        console.log("HTTP_BODY", text);
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }

    const latest = await AdminAudit.find({
        action: "CARD_BILLING_SYNC_FROM_USER",
        targetId: card._id,
    })
        .sort({ createdAt: -1 })
        .limit(1)
        .lean();

    console.log("AUDIT_REASON", latest?.[0]?.reason || null);

    if (!latest?.[0]?.reason) {
        process.exitCode = 4;
    }
}

try {
    await main();
} catch (err) {
    console.error("ERROR", err?.message || err);
    process.exitCode = 1;
} finally {
    try {
        await mongoose.disconnect();
    } catch {
        // ignore
    }
}
