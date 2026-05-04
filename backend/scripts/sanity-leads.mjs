/**
 * sanity-leads.mjs
 *
 * Verifies the lead-form entitlement contract and public submission flow.
 *
 * Checks:
 *   inactiveCard404        — POST /api/leads/ with inactive card → 404
 *   consentFalse400        — POST /api/leads/ with consent:false → 400 CONSENT_REQUIRED
 *   honeypotFake201        — POST /api/leads/ with honeypot field set → 201, fake leadId
 *   freeCardFeatureGate    — POST /api/leads/ with free-tier card → 403 FEATURE_NOT_AVAILABLE
 *   orgLeadCreated201      — POST /api/leads/ with org-premium card, valid body → 201, leadId
 *   leadDocInDb            — Lead document exists in DB after successful submission
 *
 * Security invariants verified:
 *   - Inactive card → 404 (not 403 or 500)
 *   - Free user-owned card: isEntitled:true but canUseLeads:false → 403 FEATURE_NOT_AVAILABLE
 *   - Honeypot: response is indistinguishable from success (fake leadId = FAKE_LEAD_ID)
 *   - Consent required before any DB write
 *   - Org-premium card: resolveEffectiveBilling passes org → canUseLeads:true → 201
 *
 * Fixtures: created fresh via direct DB writes; Lead docs cleaned up in finally.
 * No production data read or mutated. No secrets in stdout.
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

// Honeypot fake ID used by the controller (from lead.controller.js FAKE_LEAD_ID).
const FAKE_LEAD_ID = "000000000000000000000000";

// Node 22: treat unhandled rejections as fatal.
process.on("unhandledRejection", (reason) => {
    console.error("unhandledRejection", reason);
    process.exitCode = 1;
});

console.log("sanity-leads:script-start");

async function cleanup(
    { Card, Lead, Organization, User },
    { ownerUserId, orgId, inactiveCardId, freeCardId, orgCardId },
) {
    try {
        if (orgCardId) await Lead.deleteMany({ card: orgCardId });
    } catch {
        /* ignore */
    }

    try {
        const cardIds = [inactiveCardId, freeCardId, orgCardId].filter(Boolean);
        if (cardIds.length) await Card.deleteMany({ _id: { $in: cardIds } });
    } catch {
        /* ignore */
    }

    try {
        if (orgId) await Organization.deleteOne({ _id: orgId });
    } catch {
        /* ignore */
    }

    try {
        if (ownerUserId) await User.deleteOne({ _id: ownerUserId });
    } catch {
        /* ignore */
    }
}

async function main() {
    assertControlledWriteSanityTarget("sanity:leads");
    // Must set BEFORE any model imports to prevent background index builds.
    mongoose.set("autoIndex", false);
    mongoose.set("autoCreate", false);

    const [
        { default: app },
        { default: Card },
        { default: Lead },
        { default: Organization },
        { default: User },
        { getPersonalOrgId },
    ] = await Promise.all([
        import("../src/app.js"),
        import("../src/models/Card.model.js"),
        import("../src/models/Lead.model.js"),
        import("../src/models/Organization.model.js"),
        import("../src/models/User.model.js"),
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
        typeof process.env.MONGO_URI === "string" &&
            process.env.MONGO_URI.trim(),
        "Missing MONGO_URI in env",
    );

    await Organization.init();

    const server = await listen(app);
    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}/api`;

    const created = {
        ownerUserId: null,
        orgId: null,
        inactiveCardId: null,
        freeCardId: null,
        orgCardId: null,
    };

    const checks = {
        inactiveCard404: false,
        consentFalse400: false,
        honeypotFake201: false,
        freeCardFeatureGate: false,
        orgLeadCreated201: false,
        leadDocInDb: false,
    };

    try {
        const now = new Date();

        // ── Create owner user ──
        const ownerEmail = `sanity-leads-owner-${Date.now()}-${randomHex()}@example.test`;
        const owner = await User.create({
            email: ownerEmail,
            passwordHash: "sanity",
            role: "user",
        });
        created.ownerUserId = String(owner._id);

        // ── Create test org with active orgEntitlement ──
        const orgSlug = `st-leads-${randomHex(4)}`;
        const org = await Organization.create({
            slug: orgSlug,
            name: "Sanity Leads Org",
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

        const personalOrgId = await getPersonalOrgId();

        // ── Create inactive card (for 404 test) ──
        // Use a random non-existent ObjectId to avoid (orgId,user) collision with orgCard.
        // The 404 fires from isActive:false before any entitlement check so orgId is irrelevant.
        const inactiveCard = await Card.create({
            slug: `sanity-leads-inactive-${randomHex(4)}`,
            user: owner._id,
            orgId: new mongoose.Types.ObjectId(),
            isActive: false,
        });
        created.inactiveCardId = String(inactiveCard._id);

        // ── Create free-tier card (for FEATURE_NOT_AVAILABLE test) ──
        // orgId = personalOrgId → no active orgEntitlement → plan "free" → canUseLeads: false.
        const freeCard = await Card.create({
            slug: `sanity-leads-free-${randomHex(4)}`,
            user: owner._id,
            orgId: personalOrgId,
            isActive: true,
        });
        created.freeCardId = String(freeCard._id);

        // ── Create org-premium card ──
        const orgCard = await Card.create({
            slug: `sanity-leads-org-${randomHex(4)}`,
            user: owner._id,
            orgId: org._id,
            isActive: true,
        });
        created.orgCardId = String(orgCard._id);

        // ── Check 1: inactive card → 404 ──
        const r1 = await requestJson({
            baseUrl,
            path: "/leads",
            method: "POST",
            body: {
                cardId: String(inactiveCard._id),
                name: "Sanity",
                email: "sanity@example.test",
                consent: true,
            },
        });
        checks.inactiveCard404 = r1.status === 404;

        // ── Check 2: active card, consent:false → 400 CONSENT_REQUIRED ──
        const r2 = await requestJson({
            baseUrl,
            path: "/leads",
            method: "POST",
            body: {
                cardId: String(orgCard._id),
                name: "Sanity",
                email: "sanity@example.test",
                consent: false,
            },
        });
        checks.consentFalse400 =
            r2.status === 400 && r2.body?.code === "CONSENT_REQUIRED";

        // ── Check 3: honeypot field set → 201 with fake leadId ──
        // Honeypot behavior: backend treats non-empty website as a bot signal
        // and returns fake success without writing a Lead document.
        const r3 = await requestJson({
            baseUrl,
            path: "/leads",
            method: "POST",
            body: {
                cardId: String(orgCard._id),
                name: "Bot",
                email: "bot@example.test",
                consent: true,
                website: "http://spam.example.test",
            },
        });
        checks.honeypotFake201 =
            r3.status === 201 && String(r3.body?.leadId) === FAKE_LEAD_ID;

        // ── Check 4: free-tier card → 403 FEATURE_NOT_AVAILABLE ──
        const r4 = await requestJson({
            baseUrl,
            path: "/leads",
            method: "POST",
            body: {
                cardId: String(freeCard._id),
                name: "Sanity",
                email: "sanity@example.test",
                consent: true,
            },
        });
        checks.freeCardFeatureGate =
            r4.status === 403 && r4.body?.code === "FEATURE_NOT_AVAILABLE";

        // ── Check 5: org-premium card → 201, leadId present ──
        const r5 = await requestJson({
            baseUrl,
            path: "/leads",
            method: "POST",
            body: {
                cardId: String(orgCard._id),
                name: "Sanity Test",
                email: "sanity.test@example.test",
                phone: "0521234567",
                consent: true,
            },
        });
        checks.orgLeadCreated201 =
            r5.status === 201 && Boolean(r5.body?.leadId);

        // ── Check 6: Lead document actually in DB ──
        if (checks.orgLeadCreated201) {
            const leadDoc = await Lead.findOne({
                card: orgCard._id,
                name: "Sanity Test",
            })
                .select("_id name card")
                .lean();
            checks.leadDocInDb = Boolean(leadDoc?._id);
        }
    } finally {
        const models = { Card, Lead, Organization, User };
        await cleanup(models, {
            ownerUserId: created.ownerUserId,
            orgId: created.orgId,
            inactiveCardId: created.inactiveCardId,
            freeCardId: created.freeCardId,
            orgCardId: created.orgCardId,
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
        console.error(`sanity-leads: ${failed.length} check(s) FAILED`);
        process.exitCode = 1;
    } else {
        console.log(`sanity-leads: all ${passed.length} checks PASSED`);
    }
}

main().catch((err) => {
    console.error("sanity-leads: fatal error:", err?.message || err);
    process.exitCode = 1;
});
