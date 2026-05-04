/**
 * sanity-analytics.mjs
 *
 * Verifies the analytics entitlement contract for both free-tier and org-premium cards.
 *
 * Checks:
 *   noAuthSummary401     — GET /api/analytics/summary/:id without JWT → 401
 *   nonOwnerSummary403   — other user's JWT → 403
 *   trackValid204        — POST /api/analytics/track valid view event → 204
 *   trackMissingSlug204  — POST /api/analytics/track empty body → 204 (anti-enumeration)
 *   freeSummaryIsDemo    — owner JWT, free card → 200, body.isDemo === true
 *   orgSummaryNotDemo    — owner JWT, org-premium card → 200, no isDemo, rangeDays present
 *   orgActions200        — owner JWT, org-premium card → GET /actions → 200, no isDemo
 *   orgSources200        — owner JWT, org-premium card → GET /sources → 200, no isDemo
 *   orgCampaigns200      — owner JWT, org-premium card → GET /campaigns → 200, no isDemo
 *
 * Fixtures: created fresh via direct DB writes; cleaned up in finally.
 * No production data read or mutated.
 * No secrets in stdout (emails are ephemeral test-only, JWTs are signing-key-derived).
 */

import "dotenv/config";

import mongoose from "mongoose";

import {
    assert,
    randomHex,
    listen,
    requestJson,
} from "./sanity-shared-fixtures.mjs";
import { assertControlledWriteSanityTarget } from "./lib/controlled-write-guard.mjs";

// Node 22: treat unhandled rejections as fatal.
process.on("unhandledRejection", (reason) => {
    console.error("unhandledRejection", reason);
    process.exitCode = 1;
});

console.log("sanity-analytics:script-start");

async function cleanup(
    { Card, CardAnalyticsDaily, Organization, User },
    { ownerUserId, otherUserId, orgId, freeCardId, orgCardId },
) {
    const cardIds = [freeCardId, orgCardId].filter(Boolean);
    try {
        if (cardIds.length) {
            await CardAnalyticsDaily.deleteMany({
                cardId: { $in: cardIds },
            });
        }
    } catch {
        /* ignore */
    }

    try {
        if (cardIds.length) {
            await Card.deleteMany({ _id: { $in: cardIds } });
        }
    } catch {
        /* ignore */
    }

    try {
        if (orgId) await Organization.deleteOne({ _id: orgId });
    } catch {
        /* ignore */
    }

    try {
        const userIds = [ownerUserId, otherUserId].filter(Boolean);
        if (userIds.length) await User.deleteMany({ _id: { $in: userIds } });
    } catch {
        /* ignore */
    }
}

async function main() {
    assertControlledWriteSanityTarget("sanity:analytics");
    // Must set BEFORE any model imports to prevent background index builds.
    mongoose.set("autoIndex", false);
    mongoose.set("autoCreate", false);

    const [
        { default: app },
        { default: Card },
        { default: CardAnalyticsDaily },
        { default: Organization },
        { default: User },
        { signToken },
        { getPersonalOrgId },
    ] = await Promise.all([
        import("../src/app.js"),
        import("../src/models/Card.model.js"),
        import("../src/models/CardAnalyticsDaily.model.js"),
        import("../src/models/Organization.model.js"),
        import("../src/models/User.model.js"),
        import("../src/utils/jwt.js"),
        import("../src/utils/personalOrg.util.js"),
    ]);

    Organization.schema.set("autoIndex", false);
    Card.schema.set("autoIndex", false);

    await mongoose.connect(process.env.MONGO_URI, {
        autoIndex: false,
        autoCreate: false,
    });
    console.log("MongoDB connected");

    assert(
        typeof process.env.JWT_SECRET === "string" &&
            process.env.JWT_SECRET.trim(),
        "Missing JWT_SECRET in env",
    );

    await Organization.init();

    const server = await listen(app);
    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}/api`;

    const created = {
        ownerUserId: null,
        otherUserId: null,
        orgId: null,
        freeCardId: null,
        orgCardId: null,
    };

    const checks = {
        noAuthSummary401: false,
        nonOwnerSummary403: false,
        trackValid204: false,
        trackMissingSlug204: false,
        freeSummaryIsDemo: false,
        orgSummaryNotDemo: false,
        orgActions200: false,
        orgSources200: false,
        orgCampaigns200: false,
    };

    try {
        const personalOrgId = await getPersonalOrgId();

        // ── Create owner user ──
        const ownerEmail = `sanity-analytics-owner-${Date.now()}-${randomHex()}@example.test`;
        const owner = await User.create({
            email: ownerEmail,
            passwordHash: "sanity",
            role: "user",
        });
        created.ownerUserId = String(owner._id);
        const ownerJwt = signToken(String(owner._id));
        const ownerHeaders = {
            Authorization: `Bearer ${ownerJwt}`,
            "X-Requested-With": "XMLHttpRequest",
        };

        // ── Create other user (non-owner) ──
        const otherEmail = `sanity-analytics-other-${Date.now()}-${randomHex()}@example.test`;
        const other = await User.create({
            email: otherEmail,
            passwordHash: "sanity",
            role: "user",
        });
        created.otherUserId = String(other._id);
        const otherJwt = signToken(String(other._id));
        const otherHeaders = {
            Authorization: `Bearer ${otherJwt}`,
            "X-Requested-With": "XMLHttpRequest",
        };

        // ── Create test org with active orgEntitlement ──
        const orgSlug = `st-analytics-${randomHex(4)}`;
        const now = new Date();
        const org = await Organization.create({
            slug: orgSlug,
            name: "Sanity Analytics Org",
            note: "sanity-auto",
            isActive: true,
            orgEntitlement: {
                status: "active",
                plan: "org",
                startsAt: new Date(now.getTime() - 1000),
                expiresAt: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
                grantedAt: now,
                source: "admin-manual",
            },
        });
        created.orgId = String(org._id);

        // ── Create free card (orgId = personalOrgId → no org entitlement) ──
        const freeSlug = `sanity-analytics-free-${randomHex(4)}`;
        const freeCard = await Card.create({
            slug: freeSlug,
            user: owner._id,
            orgId: personalOrgId,
            isActive: true,
            status: "published",
        });
        created.freeCardId = String(freeCard._id);

        // ── Create org-premium card ──
        const orgCardSlug = `sanity-analytics-org-${randomHex(4)}`;
        const orgCard = await Card.create({
            slug: orgCardSlug,
            user: owner._id,
            orgId: org._id,
            isActive: true,
            status: "published",
        });
        created.orgCardId = String(orgCard._id);

        // ── Check 1: no auth → 401 ──
        const r1 = await requestJson({
            baseUrl,
            path: `/analytics/summary/${String(freeCard._id)}`,
            method: "GET",
            headers: {},
        });
        checks.noAuthSummary401 = r1.status === 401;

        // ── Check 2: non-owner → 403 ──
        const r2 = await requestJson({
            baseUrl,
            path: `/analytics/summary/${String(freeCard._id)}`,
            method: "GET",
            headers: otherHeaders,
        });
        checks.nonOwnerSummary403 = r2.status === 403;

        // ── Check 3: track valid view → 204 ──
        const r3 = await requestJson({
            baseUrl,
            path: "/analytics/track",
            method: "POST",
            body: { slug: freeSlug, event: "view" },
        });
        checks.trackValid204 = r3.status === 204;

        // ── Check 4: track missing slug → 204 (anti-enumeration) ──
        const r4 = await requestJson({
            baseUrl,
            path: "/analytics/track",
            method: "POST",
            body: {},
        });
        checks.trackMissingSlug204 = r4.status === 204;

        // ── Check 5: free card summary → isDemo:true ──
        const r5 = await requestJson({
            baseUrl,
            path: `/analytics/summary/${String(freeCard._id)}`,
            method: "GET",
            headers: ownerHeaders,
        });
        checks.freeSummaryIsDemo =
            r5.status === 200 && r5.body?.isDemo === true;

        // ── Check 6: org-premium card summary → no isDemo, rangeDays present ──
        const r6 = await requestJson({
            baseUrl,
            path: `/analytics/summary/${String(orgCard._id)}`,
            method: "GET",
            headers: ownerHeaders,
        });
        checks.orgSummaryNotDemo =
            r6.status === 200 &&
            r6.body?.isDemo !== true &&
            typeof r6.body?.rangeDays === "number";

        // ── Check 7: org-premium actions → 200, no isDemo ──
        const r7 = await requestJson({
            baseUrl,
            path: `/analytics/actions/${String(orgCard._id)}`,
            method: "GET",
            headers: ownerHeaders,
        });
        checks.orgActions200 = r7.status === 200 && r7.body?.isDemo !== true;

        // ── Check 8: org-premium sources → 200, no isDemo ──
        const r8 = await requestJson({
            baseUrl,
            path: `/analytics/sources/${String(orgCard._id)}`,
            method: "GET",
            headers: ownerHeaders,
        });
        checks.orgSources200 = r8.status === 200 && r8.body?.isDemo !== true;

        // ── Check 9: org-premium campaigns → 200, no isDemo ──
        const r9 = await requestJson({
            baseUrl,
            path: `/analytics/campaigns/${String(orgCard._id)}`,
            method: "GET",
            headers: ownerHeaders,
        });
        checks.orgCampaigns200 = r9.status === 200 && r9.body?.isDemo !== true;
    } finally {
        const models = {
            Card,
            CardAnalyticsDaily,
            Organization,
            User,
        };
        await cleanup(models, {
            ownerUserId: created.ownerUserId,
            otherUserId: created.otherUserId,
            orgId: created.orgId,
            freeCardId: created.freeCardId ? created.freeCardId : null,
            orgCardId: created.orgCardId ? created.orgCardId : null,
        });

        await mongoose.disconnect();

        if (server?.close) {
            await new Promise((resolve) => server.close(resolve));
        }
    }

    const failed = Object.entries(checks).filter(([, v]) => !v);
    const passed = Object.entries(checks).filter(([, v]) => v);

    console.log(
        JSON.stringify(
            {
                ok: failed.length === 0,
                passed: passed.map(([k]) => k),
                failed: failed.map(([k]) => k),
                checks,
            },
            null,
            2,
        ),
    );

    if (failed.length > 0) {
        console.error(`sanity-analytics: ${failed.length} check(s) FAILED`);
        process.exitCode = 1;
    } else {
        console.log(`sanity-analytics: all ${passed.length} checks PASSED`);
    }
}

main().catch((err) => {
    console.error("sanity-analytics: fatal error:", err?.message || err);
    process.exitCode = 1;
});
