import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";

import { connectDB } from "../src/config/db.js";
import { signToken } from "../src/utils/jwt.js";
import User from "../src/models/User.model.js";
import Card from "../src/models/Card.model.js";
import AdminAudit from "../src/models/AdminAudit.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, "..", "..");
const outFile = path.join(repoRoot, "_tmp_qa_setsub_sync_paiduntil.txt");

function isoNow() {
    return new Date().toISOString();
}

function safeSlug(s) {
    return String(s)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60);
}

function ms(d) {
    const t = d instanceof Date ? d.getTime() : new Date(d).getTime();
    return Number.isFinite(t) ? t : null;
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

async function writeLog(lines) {
    const text = `${lines.join("\n")}\n`;
    await fs.writeFile(outFile, text, "utf8");
}

async function main() {
    const lines = [];
    const startedAt = new Date();
    let exitCode = 0;
    let server = null;

    lines.push("QA_SCRIPT _tmp_qa_setsub_sync_paiduntil.mjs");
    lines.push(`START_AT ${startedAt.toISOString()}`);

    if (!process.env.MONGO_URI) {
        lines.push("ERROR Missing MONGO_URI");
        await writeLog(lines);
        process.exitCode = 2;
        return;
    }
    if (!process.env.JWT_SECRET) {
        lines.push("ERROR Missing JWT_SECRET");
        await writeLog(lines);
        process.exitCode = 3;
        return;
    }

    try {
        await connectDB(process.env.MONGO_URI);
        lines.push("MongoDB connected");

        // Allow loopback without proxy header if origin lock is enabled.
        process.env.ALLOW_LOCAL_DIRECT = "1";

        const { default: app } = await import("../src/app.js");
        server = await new Promise((resolve) => {
            const s = app.listen(0, "127.0.0.1", () => resolve(s));
        });

        const addr = server.address();
        const port = typeof addr === "object" && addr ? addr.port : null;
        assert(port, "NO_SERVER_PORT");
        const origin = `http://127.0.0.1:${port}`;

        lines.push(`ORIGIN ${origin}`);

        const adminUser = await User.findOne({ role: "admin" })
            .sort({ createdAt: 1 })
            .select("_id email role")
            .lean();
        assert(adminUser?._id, "NO_ADMIN_USER_FOUND");

        const token = signToken(String(adminUser._id));
        lines.push(`ADMIN_USER_ID ${String(adminUser._id)}`);

        // 1) Create QA user + card (minimal valid docs)
        const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const qaEmail = `qa-sync-${unique}@cardigo.local`;
        const qaUser = await User.create({
            email: qaEmail,
            role: "user",
            plan: "free",
            subscription: {
                status: "inactive",
                expiresAt: null,
                provider: "admin",
            },
        });

        const slug = safeSlug(`qa-sync-${unique}`) || `qa-sync-${Date.now()}`;
        const qaCard = await Card.create({
            user: qaUser._id,
            slug,
            plan: "free",
            status: "draft",
            billing: {
                status: "free",
                plan: "free",
                paidUntil: null,
                features: { analyticsPremium: false },
                payer: null,
            },
        });

        await User.findByIdAndUpdate(qaUser._id, {
            $set: { cardId: qaCard._id },
        });

        lines.push(`QA_USER_ID ${String(qaUser._id)}`);
        lines.push(`QA_USER_EMAIL ${qaEmail}`);
        lines.push(`QA_CARD_ID ${String(qaCard._id)}`);
        lines.push(`QA_CARD_SLUG ${slug}`);

        // 2) Set paid subscription via admin endpoint
        const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const expiresAtIso = future.toISOString();

        const setUrl = `${origin}/api/admin/billing/users/${qaUser._id}/subscription/set`;
        const setBody = {
            plan: "monthly",
            expiresAt: expiresAtIso,
            status: "active",
            provider: "admin",
            reason: `QA: set subscription ${isoNow()}`,
        };

        const setRes = await fetch(setUrl, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(setBody),
        });

        const setText = await setRes.text();
        lines.push(`SET_SUB_URL ${setUrl}`);
        lines.push(`SET_SUB_STATUS ${setRes.status}`);
        lines.push(`SET_SUB_BODY ${setText}`);
        assert(
            setRes.status === 200,
            `SET_SUB_EXPECT_200_GOT_${setRes.status}`,
        );

        const userAfter = await User.findById(qaUser._id)
            .select("plan subscription")
            .lean();

        const userExpiresAt = userAfter?.subscription?.expiresAt
            ? new Date(userAfter.subscription.expiresAt).toISOString()
            : null;

        lines.push(`DB_USER_PLAN ${userAfter?.plan || null}`);
        lines.push(`DB_USER_SUB_EXPIRES_AT ${userExpiresAt}`);

        assert(userAfter?.plan === "monthly", "DB_USER_PLAN_NOT_MONTHLY");
        assert(userExpiresAt === expiresAtIso, "DB_USER_EXPIRES_AT_MISMATCH");

        // 3) Sync card billing from user (NO reason → should produce AUTO reason)
        const syncUrl = `${origin}/api/admin/billing/cards/${qaCard._id}/billing/sync-from-user`;
        const syncRes = await fetch(syncUrl, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: "{}",
        });

        const syncText = await syncRes.text();
        lines.push(`SYNC_URL ${syncUrl}`);
        lines.push(`SYNC_STATUS ${syncRes.status}`);
        lines.push(`SYNC_BODY ${syncText}`);
        assert(syncRes.status === 200, `SYNC_EXPECT_200_GOT_${syncRes.status}`);

        let dto;
        try {
            dto = JSON.parse(syncText);
        } catch {
            throw new Error("SYNC_BODY_NOT_JSON");
        }

        const dtoPaidUntil = dto?.billing?.paidUntil || null;
        lines.push(`DTO_BILLING_PAID_UNTIL ${dtoPaidUntil}`);

        assert(dtoPaidUntil, "DTO_BILLING_PAID_UNTIL_NULL");

        const dtoPaidMs = ms(dtoPaidUntil);
        const expiresMs = ms(expiresAtIso);
        assert(dtoPaidMs !== null, "DTO_BILLING_PAID_UNTIL_INVALID_DATE");
        assert(expiresMs !== null, "EXPIRES_AT_INVALID_DATE");

        // 1s tolerance for serialization/parsing
        assert(
            Math.abs(dtoPaidMs - expiresMs) <= 1000,
            "DTO_BILLING_PAID_UNTIL_NOT_EQUAL_TO_USER_EXPIRES_AT",
        );

        const cardAfter = await Card.findById(qaCard._id)
            .select("billing.paidUntil billing.status billing.plan plan")
            .lean();

        const dbPaidUntilIso = cardAfter?.billing?.paidUntil
            ? new Date(cardAfter.billing.paidUntil).toISOString()
            : null;

        lines.push(`DB_CARD_PLAN ${cardAfter?.plan || null}`);
        lines.push(`DB_BILLING_STATUS ${cardAfter?.billing?.status || null}`);
        lines.push(`DB_BILLING_PLAN ${cardAfter?.billing?.plan || null}`);
        lines.push(`DB_BILLING_PAID_UNTIL ${dbPaidUntilIso}`);

        assert(dbPaidUntilIso === expiresAtIso, "DB_CARD_PAID_UNTIL_MISMATCH");

        const auditLatest = await AdminAudit.find({
            action: "CARD_BILLING_SYNC_FROM_USER",
            targetId: qaCard._id,
        })
            .sort({ createdAt: -1 })
            .limit(1)
            .select("reason createdAt")
            .lean();

        const auditReason = auditLatest?.[0]?.reason || null;
        lines.push(`AUDIT_REASON ${auditReason}`);
        assert(auditReason === "AUTO: sync-from-user", "AUDIT_REASON_NOT_AUTO");

        lines.push("ASSERT_OK true");
        exitCode = 0;
    } catch (err) {
        exitCode = 1;
        const msg = err?.message || String(err);
        lines.push(`ERROR ${msg}`);
    } finally {
        if (server) {
            await new Promise((resolve) => server.close(resolve));
        }
        try {
            await mongoose.disconnect();
        } catch {
            // ignore
        }

        const finishedAt = new Date();
        const runtimeMs = finishedAt.getTime() - startedAt.getTime();

        lines.push(`FINISH_AT ${finishedAt.toISOString()}`);
        lines.push(`RUNTIME_MS ${runtimeMs}`);
        lines.push(`EXIT:${exitCode}`);
        // eslint-disable-next-line no-unsafe-finally
        await writeLog(lines);
        process.exitCode = exitCode;
    }
}

await main();
