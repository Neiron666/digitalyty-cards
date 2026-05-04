/**
 * sanity-booking.mjs
 *
 * Verifies the booking entitlement contract and public availability/creation flow.
 *
 * Checks:
 *   inactiveCard404         — GET /availability with inactive card → 404
 *   freeCardFeatureGate     — GET /availability with free-tier card + booking on → 403 FEATURE_NOT_AVAILABLE
 *   orgAvailability200      — GET /availability with org-premium card + booking on → 200, days array
 *   orgBookingCreate201     — POST / with valid future slot on org-premium card → 201, bookingId
 *
 * Fixtures: created fresh via direct DB writes; Booking docs cleaned up in finally.
 * No auth required for the tested (public) endpoints.
 * No production data read or mutated. No secrets in stdout.
 */

import "dotenv/config";

import { DateTime } from "luxon";
import mongoose from "mongoose";

import {
    assert,
    randomHex,
    listen,
    requestJson,
} from "./sanity-shared-fixtures.mjs";
import { assertControlledWriteSanityTarget } from "./lib/controlled-write-guard.mjs";

const APP_TZ = "Asia/Jerusalem";

// Weekday key array: JS getUTCDay() maps 0=Sun..6=Sat, matching AVAIL_WEEKDAY_MAP.
const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

// Node 22: treat unhandled rejections as fatal.
process.on("unhandledRejection", (reason) => {
    console.error("unhandledRejection", reason);
    process.exitCode = 1;
});

console.log("sanity-booking:script-start");

/**
 * Returns { dateKeyIl, weekdayKey } for tomorrow in Israel timezone.
 * Used to construct a valid future booking slot.
 */
function tomorrowIl() {
    const dt = DateTime.now().setZone(APP_TZ).plus({ days: 1 });
    const dateKeyIl = dt.toFormat("yyyy-LL-dd");
    // Luxon weekday: 1=Mon..7=Sun. Convert to JS 0=Sun..6=Sat.
    const luxonWd = dt.weekday;
    const jsWd = luxonWd === 7 ? 0 : luxonWd;
    return { dateKeyIl, weekdayKey: WEEKDAY_KEYS[jsWd] };
}

/**
 * businessHours schema with all seven days open, 09:00–17:00.
 * Ensures any weekday for "tomorrow" is covered.
 */
function allDaysOpenBusinessHours() {
    const day = {
        open: true,
        intervals: [{ start: "09:00", end: "17:00" }],
    };
    return {
        v: 1,
        enabled: true,
        week: {
            sun: day,
            mon: day,
            tue: day,
            wed: day,
            thu: day,
            fri: day,
            sat: day,
        },
    };
}

async function cleanup(
    { Booking, Card, Organization, User },
    { ownerUserId, orgId, inactiveCardId, freeCardId, orgCardId },
) {
    try {
        if (orgCardId) await Booking.deleteMany({ card: orgCardId });
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
    assertControlledWriteSanityTarget("sanity:booking");
    // Must set BEFORE any model imports to prevent background index builds.
    mongoose.set("autoIndex", false);
    mongoose.set("autoCreate", false);

    const [
        { default: app },
        { default: Booking },
        { default: Card },
        { default: Organization },
        { default: User },
        { getPersonalOrgId },
    ] = await Promise.all([
        import("../src/app.js"),
        import("../src/models/Booking.model.js"),
        import("../src/models/Card.model.js"),
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
        freeCardFeatureGate: false,
        orgAvailability200: false,
        orgBookingCreate201: false,
    };

    try {
        const now = new Date();

        // ── Create owner user ──
        const ownerEmail = `sanity-booking-owner-${Date.now()}-${randomHex()}@example.test`;
        const owner = await User.create({
            email: ownerEmail,
            passwordHash: "sanity",
            role: "user",
        });
        created.ownerUserId = String(owner._id);

        // ── Create test org with active orgEntitlement ──
        const orgSlug = `st-booking-${randomHex(4)}`;
        const org = await Organization.create({
            slug: orgSlug,
            name: "Sanity Booking Org",
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
            slug: `sanity-booking-inactive-${randomHex(4)}`,
            user: owner._id,
            orgId: new mongoose.Types.ObjectId(),
            isActive: false,
        });
        created.inactiveCardId = String(inactiveCard._id);

        // ── Create free-tier card with booking on (for FEATURE_NOT_AVAILABLE test) ──
        // orgId = personalOrgId → no active orgEntitlement → plan "free" → canUseBooking: false.
        const freeCard = await Card.create({
            slug: `sanity-booking-free-${randomHex(4)}`,
            user: owner._id,
            orgId: personalOrgId,
            isActive: true,
            bookingSettings: { enabled: true },
            businessHours: allDaysOpenBusinessHours(),
        });
        created.freeCardId = String(freeCard._id);

        // ── Create org-premium card with booking on ──
        const orgCard = await Card.create({
            slug: `sanity-booking-org-${randomHex(4)}`,
            user: owner._id,
            orgId: org._id,
            isActive: true,
            bookingSettings: { enabled: true },
            businessHours: allDaysOpenBusinessHours(),
        });
        created.orgCardId = String(orgCard._id);

        // ── Check 1: inactive card → 404 ──
        const r1 = await requestJson({
            baseUrl,
            path: `/bookings/availability?cardId=${String(inactiveCard._id)}`,
            method: "GET",
        });
        checks.inactiveCard404 = r1.status === 404;

        // ── Check 2: free card with booking on → 403 FEATURE_NOT_AVAILABLE ──
        const r2 = await requestJson({
            baseUrl,
            path: `/bookings/availability?cardId=${String(freeCard._id)}`,
            method: "GET",
        });
        checks.freeCardFeatureGate =
            r2.status === 403 && r2.body?.code === "FEATURE_NOT_AVAILABLE";

        // ── Check 3: org-premium card → 200, days array ──
        const r3 = await requestJson({
            baseUrl,
            path: `/bookings/availability?cardId=${String(orgCard._id)}&days=3`,
            method: "GET",
        });
        checks.orgAvailability200 =
            r3.status === 200 && Array.isArray(r3.body?.days);

        // ── Check 4: org-premium card → POST booking with valid future slot → 201 ──
        const { dateKeyIl } = tomorrowIl();
        const r4 = await requestJson({
            baseUrl,
            path: "/bookings",
            method: "POST",
            body: {
                cardId: String(orgCard._id),
                name: "Sanity Test User",
                phone: "0501234567",
                consent: true,
                date: dateKeyIl,
                hour: 10,
                minute: 0,
            },
        });
        checks.orgBookingCreate201 =
            r4.status === 201 && Boolean(r4.body?.bookingId);
    } finally {
        const models = { Booking, Card, Organization, User };
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
        console.error(`sanity-booking: ${failed.length} check(s) FAILED`);
        process.exitCode = 1;
    } else {
        console.log(`sanity-booking: all ${passed.length} checks PASSED`);
    }
}

main().catch((err) => {
    console.error("sanity-booking: fatal error:", err?.message || err);
    process.exitCode = 1;
});
