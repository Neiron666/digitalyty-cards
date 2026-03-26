import crypto from "crypto";
import Card from "../models/Card.model.js";
import Booking from "../models/Booking.model.js";
import { resolveActor, assertCardOwner } from "../utils/actor.js";
import { HttpError } from "../utils/httpError.js";
import { resolveBilling } from "../utils/trial.js";
import { resolveEffectiveTier } from "../utils/tier.js";
import { computeEntitlements } from "../utils/cardDTO.js";
import User from "../models/User.model.js";
import {
    sanitizePublicBookingInput,
    computeBookingTimers,
    buildPersonKey,
} from "../utils/bookingSanitize.js";
import { assertSlotLegalAgainstBusinessHoursOrThrow } from "../utils/bookingBusinessHours.util.js";

const FAKE_BOOKING_ID = "000000000000000000000000";

function ipHashBestEffort(ip) {
    const s = String(ip || "").trim();
    if (!s) return null;
    return crypto.createHash("sha256").update(s).digest("hex");
}

function getClientIp(req) {
    const xf = req.headers["x-forwarded-for"];
    if (typeof xf === "string" && xf.trim()) return xf.split(",")[0].trim();
    return req.ip || req.connection?.remoteAddress || "";
}

function isDuplicateKeyError(err, indexName) {
    const code = err?.code;
    const keyPattern = err?.keyPattern;
    const msg = String(err?.message || "");

    if (code !== 11000) return false;
    if (indexName && msg.includes(indexName)) return true;

    // Fallback: check keyPattern signature
    if (indexName === "uniq_booking_blocking_slot") {
        return Boolean(keyPattern?.card && keyPattern?.slotKey);
    }
    if (indexName === "uniq_booking_blocking_person") {
        return Boolean(keyPattern?.card && keyPattern?.personKey);
    }

    return true;
}

function weekdayKeyFromDateKeyIl(dateKeyIl) {
    // Map JS UTC day to businessHours weekday keys.
    const d = new Date(`${String(dateKeyIl || "").trim()}T00:00:00Z`);
    const day = d.getUTCDay();
    if (day === 0) return "sun";
    if (day === 1) return "mon";
    if (day === 2) return "tue";
    if (day === 3) return "wed";
    if (day === 4) return "thu";
    if (day === 5) return "fri";
    if (day === 6) return "sat";
    return null;
}

function addMinutesHHmm(localStartHHmm, minutesToAdd) {
    const m = /^([01]\d|2[0-3]):(00|30)$/.exec(String(localStartHHmm || ""));
    if (!m) return null;
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    const total = hh * 60 + mm + Number(minutesToAdd || 0);
    const out = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
    const oh = String(Math.floor(out / 60)).padStart(2, "0");
    const om = String(out % 60).padStart(2, "0");
    return `${oh}:${om}`;
}

async function preExpireBlockingPending({
    cardId,
    slotKey,
    personKey,
    nowUtc,
}) {
    const now = nowUtc instanceof Date ? nowUtc : new Date(nowUtc);
    if (!Number.isFinite(now.getTime())) return;

    // Targeted release: expire ONLY pending bookings that could conflict with this submit
    // (slot lock or person lock), so stale pending can't keep blocking.
    await Booking.updateMany(
        {
            card: cardId,
            status: "pending",
            expiresAt: { $lte: now },
            $or: [{ slotKey }, { personKey }],
        },
        { $set: { status: "expired" } },
    );
}

async function loadActiveCardOrNotFound(cardId) {
    const card = await Card.findById(cardId);
    if (!card || !card.isActive) {
        throw new HttpError(404, "Card not found", "NOT_FOUND");
    }
    return card;
}

async function assertBookingEntitled(card) {
    const now = new Date();
    const effectiveBilling = resolveBilling(card, now);

    const userTier = card?.user
        ? await User.findById(String(card.user))
              .select("adminTier adminTierUntil")
              .lean()
        : null;

    const effectiveTier = resolveEffectiveTier({
        card,
        user: userTier,
        effectiveBilling,
        now,
    });

    const entitlements = computeEntitlements(
        card,
        effectiveBilling,
        effectiveTier,
        now,
    );

    if (!effectiveBilling?.isEntitled) {
        throw new HttpError(403, "Access expired", "TRIAL_EXPIRED");
    }

    // V1 gate: reuse premium gating semantics (similar to leads).
    if (!entitlements?.canUseLeads) {
        throw new HttpError(
            403,
            "Booking available only for paid plans",
            "FEATURE_NOT_AVAILABLE",
        );
    }
}

function assertSlotInBusinessHoursOrInvalidRequest({
    card,
    dateKeyIl,
    localHHmm,
}) {
    const bh =
        card?.businessHours && typeof card.businessHours === "object"
            ? card.businessHours
            : null;

    // Fail-closed: booking is only legal when businessHours exist and are enabled + meaningful.
    const weekdayKey = weekdayKeyFromDateKeyIl(dateKeyIl);
    const localEndHHmm = addMinutesHHmm(localHHmm, 30);

    assertSlotLegalAgainstBusinessHoursOrThrow({
        businessHours: bh,
        weekdayKey,
        localStartHHmm: localHHmm,
        localEndHHmm,
    });
}

export async function createPublicBooking(req, res) {
    try {
        const input = sanitizePublicBookingInput(req.body);

        if (input.error) {
            const code = input.error;
            const isNotFound = code === "INVALID_CARD_ID";
            if (isNotFound) {
                return res.status(404).json({ message: "Not found" });
            }
            return res.status(400).json({ message: "Invalid request", code });
        }

        // Honeypot: fake success, no DB write.
        if (input.hp) {
            return res
                .status(201)
                .json({ success: true, bookingId: FAKE_BOOKING_ID });
        }

        const card = await loadActiveCardOrNotFound(input.cardId);
        await assertBookingEntitled(card);

        assertSlotInBusinessHoursOrInvalidRequest({
            card,
            dateKeyIl: input.dateKeyIl,
            localHHmm: input.localStartHHmm,
        });

        const now = new Date();
        const { expiresAt, purgeAt } = computeBookingTimers({
            nowUtc: now,
            endAtUtc: input.endAt,
        });

        const personKey = buildPersonKey({
            cardId: input.cardId,
            customerPhoneNormalized: input.customerPhoneNormalized,
        });

        await preExpireBlockingPending({
            cardId: input.cardId,
            slotKey: input.slotKey,
            personKey,
            nowUtc: now,
        });

        const booking = await Booking.create({
            card: input.cardId,
            startAt: input.startAt,
            endAt: input.endAt,
            dateKeyIl: input.dateKeyIl,
            localStartHHmm: input.localStartHHmm,
            tz: input.tz,

            status: "pending",
            expiresAt,
            purgeAt,

            customerName: input.customerName,
            customerPhoneRaw: input.customerPhoneRaw,
            customerPhoneNormalized: input.customerPhoneNormalized,
            personKey,

            consentAccepted: true,
            consentAcceptedAt: now,
            consentTermsVersion: input.consentTermsVersion,
            consentPrivacyVersion: input.consentPrivacyVersion,

            publicIpHash: ipHashBestEffort(getClientIp(req)),
            slotKey: input.slotKey,
        });

        return res.status(201).json({ success: true, bookingId: booking._id });
    } catch (err) {
        if (isDuplicateKeyError(err, "uniq_booking_blocking_slot")) {
            return res
                .status(409)
                .json({ message: "Slot unavailable", code: "SLOT_TAKEN" });
        }
        if (isDuplicateKeyError(err, "uniq_booking_blocking_person")) {
            return res.status(409).json({
                message: "Already have an active booking",
                code: "PERSON_REPEAT_BLOCKED",
            });
        }

        console.error("[booking/public] error:", err?.message || "unknown");
        return res.status(500).json({ message: "Failed to create booking" });
    }
}

export async function listMyBookings(req, res) {
    try {
        const actor = resolveActor(req);
        if (!actor || actor.type !== "user") {
            throw new HttpError(401, "Unauthorized", "UNAUTHORIZED");
        }

        const cardId = String(req.query.cardId || "").trim();
        if (!cardId) {
            return res.status(400).json({ message: "Invalid request" });
        }

        const card = await Card.findById(cardId);
        assertCardOwner(card, actor);

        const limitRaw = parseInt(req.query.limit, 10);
        const limit = Number.isFinite(limitRaw)
            ? Math.min(Math.max(limitRaw, 1), 50)
            : 20;

        const docs = await Booking.find({ card: card._id })
            .sort({ startAt: -1, _id: -1 })
            .limit(limit)
            .lean();

        const bookings = docs.map((d) => ({
            _id: d._id,
            card: d.card,
            startAt: d.startAt,
            endAt: d.endAt,
            dateKeyIl: d.dateKeyIl,
            localStartHHmm: d.localStartHHmm,
            tz: d.tz,
            status: d.status,
            expiresAt: d.expiresAt,
            createdAt: d.createdAt,
            customerName: d.customerName,
            customerPhoneRaw: d.customerPhoneRaw,
        }));

        return res.json({ bookings });
    } catch (err) {
        const status = err?.statusCode || err?.status;
        if (status) {
            return res
                .status(status)
                .json({
                    message: err?.message || "Error",
                    code: err?.code || null,
                });
        }

        console.error("[booking/mine] error:", err?.message || "unknown");
        return res.status(500).json({ message: "Failed to fetch bookings" });
    }
}

async function expireIfNeeded(booking) {
    if (!booking || booking.status !== "pending") return booking;

    const now = Date.now();
    const exp =
        booking.expiresAt instanceof Date
            ? booking.expiresAt.getTime()
            : new Date(booking.expiresAt).getTime();
    if (!Number.isFinite(exp)) return booking;

    if (exp > now) return booking;

    // Transition pending -> expired to release unique locks while keeping history until purgeAt.
    await Booking.updateOne(
        { _id: booking._id, status: "pending", expiresAt: booking.expiresAt },
        { $set: { status: "expired" } },
    );

    return Booking.findById(booking._id);
}

export async function approveMyBooking(req, res) {
    try {
        const actor = resolveActor(req);
        if (!actor || actor.type !== "user") {
            throw new HttpError(401, "Unauthorized", "UNAUTHORIZED");
        }

        const { id } = req.params;

        const booking = await Booking.findById(id);
        if (!booking) throw new HttpError(404, "Not found", "NOT_FOUND");

        const card = await Card.findById(String(booking.card));
        assertCardOwner(card, actor);

        await expireIfNeeded(booking);

        if (booking.status !== "pending") {
            throw new HttpError(400, "Invalid request", "INVALID_STATUS");
        }

        booking.status = "approved";
        await booking.save();

        return res.json({ success: true });
    } catch (err) {
        const status = err?.statusCode || err?.status;
        if (status) {
            return res
                .status(status)
                .json({
                    message: err?.message || "Error",
                    code: err?.code || null,
                });
        }

        console.error("[booking/approve] error:", err?.message || "unknown");
        return res.status(500).json({ message: "Failed to approve booking" });
    }
}

export async function cancelMyBooking(req, res) {
    try {
        const actor = resolveActor(req);
        if (!actor || actor.type !== "user") {
            throw new HttpError(401, "Unauthorized", "UNAUTHORIZED");
        }

        const { id } = req.params;

        const booking = await Booking.findById(id);
        if (!booking) throw new HttpError(404, "Not found", "NOT_FOUND");

        const card = await Card.findById(String(booking.card));
        assertCardOwner(card, actor);

        await expireIfNeeded(booking);

        if (booking.status !== "pending" && booking.status !== "approved") {
            throw new HttpError(400, "Invalid request", "INVALID_STATUS");
        }

        booking.status = "canceled";
        await booking.save();

        return res.json({ success: true });
    } catch (err) {
        const status = err?.statusCode || err?.status;
        if (status) {
            return res
                .status(status)
                .json({
                    message: err?.message || "Error",
                    code: err?.code || null,
                });
        }

        console.error("[booking/cancel] error:", err?.message || "unknown");
        return res.status(500).json({ message: "Failed to cancel booking" });
    }
}

export async function reconcileExpiredBookings(req, res) {
    try {
        // Internal lightweight reconciler endpoint: auth required.
        const actor = resolveActor(req);
        if (!actor || actor.type !== "user") {
            throw new HttpError(401, "Unauthorized", "UNAUTHORIZED");
        }

        const now = new Date();
        const limitRaw = parseInt(req.query.limit, 10);
        const limit = Number.isFinite(limitRaw)
            ? Math.min(Math.max(limitRaw, 1), 200)
            : 200;

        const result = await Booking.updateMany(
            {
                status: "pending",
                expiresAt: { $lte: now },
            },
            { $set: { status: "expired" } },
            { limit },
        );

        return res.json({ success: true, modified: result.modifiedCount || 0 });
    } catch (err) {
        const status = err?.statusCode || err?.status;
        if (status) {
            return res
                .status(status)
                .json({
                    message: err?.message || "Error",
                    code: err?.code || null,
                });
        }

        console.error("[booking/reconcile] error:", err?.message || "unknown");
        return res.status(500).json({ message: "Failed to reconcile" });
    }
}
