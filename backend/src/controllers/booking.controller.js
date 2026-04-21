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
import { getPersonalOrgId } from "../utils/personalOrg.util.js";
import { toIsrael, addIsraelDaysFromNow } from "../utils/time.util.js";
import { resolveEffectiveBookingHorizon } from "../utils/bookingHorizon.util.js";

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

    // Targeted release: expire ONLY pending bookings whose slot time has already
    // passed and that could conflict with this submit (slot lock or person lock).
    await Booking.updateMany(
        {
            card: cardId,
            status: "pending",
            endAt: { $lte: now },
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

    if (!entitlements?.canUseBooking) {
        throw new HttpError(
            403,
            "Booking available only for paid plans",
            "FEATURE_NOT_AVAILABLE",
        );
    }

    return entitlements;
}

function assertBookingEnabled(card) {
    const bs =
        card?.bookingSettings && typeof card.bookingSettings === "object"
            ? card.bookingSettings
            : null;
    if (!bs || bs.enabled !== true) {
        throw new HttpError(
            400,
            "Booking not enabled",
            "BOOKING_NOT_AVAILABLE",
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

function assertDateWithinHorizon({ card, dateKeyIl }) {
    const effectiveHorizon = resolveEffectiveBookingHorizon(card);
    // horizonDays = total days from today (inclusive): today is day 1.
    // max selectable date = today + (effectiveHorizon - 1).
    const maxDateKeyIl = addIsraelDaysFromNow(new Date(), effectiveHorizon - 1);
    if (String(dateKeyIl) > maxDateKeyIl) {
        throw new HttpError(
            400,
            "Date is outside booking horizon",
            "DATE_OUT_OF_HORIZON",
        );
    }
}

// ── Availability read (public, anonymous) ───────────────────────────

const AVAIL_WEEKDAY_MAP = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const AVAIL_SLOT_DURATION = 30;
const AVAIL_MAX_DAYS = 60; // absolute ceiling — per-card effective horizon is resolved via resolveEffectiveBookingHorizon()

function parseHHmm(hhmm) {
    if (typeof hhmm !== "string") return null;
    const m = /^([01]\d|2[0-3]):(00|30)$/.exec(hhmm);
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
}

export async function getPublicAvailability(req, res) {
    try {
        // ── Validate cardId ──
        const cardId = String(req.query.cardId || "").trim();
        if (!cardId || !/^[0-9a-fA-F]{24}$/.test(cardId)) {
            return res
                .status(400)
                .json({ message: "Invalid request", code: "INVALID_CARD_ID" });
        }

        // ── Load card + gates ──
        const card = await loadActiveCardOrNotFound(cardId);
        assertBookingEnabled(card);
        await assertBookingEntitled(card);

        // ── Validate businessHours ──
        const bh =
            card?.businessHours && typeof card.businessHours === "object"
                ? card.businessHours
                : null;
        if (!bh || bh.enabled !== true) {
            throw new HttpError(
                400,
                "Booking not available",
                "BOOKING_NOT_AVAILABLE",
            );
        }
        const week = bh.week && typeof bh.week === "object" ? bh.week : null;
        if (!week) {
            throw new HttpError(
                400,
                "Booking not available",
                "BOOKING_NOT_AVAILABLE",
            );
        }

        // ── Parse days param ──
        const effectiveHorizon = resolveEffectiveBookingHorizon(card);
        const daysRaw = parseInt(req.query.days, 10);
        const daysCount = Number.isFinite(daysRaw)
            ? Math.min(Math.max(daysRaw, 1), effectiveHorizon)
            : effectiveHorizon;

        // ── Resolve date range (Israel-local) ──
        const nowUtcDate = new Date();
        const todayIl = toIsrael(nowUtcDate);
        const todayKey = todayIl.toFormat("yyyy-LL-dd");
        const nowMinutesIl = todayIl.hour * 60 + todayIl.minute;

        // Optional startDate - must be today or future (Israel-local).
        const startDateRaw = String(req.query.startDate || "").trim();
        let baseUtc = nowUtcDate;
        if (startDateRaw) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(startDateRaw)) {
                return res.status(400).json({
                    message: "Invalid date format",
                    code: "INVALID_DATE",
                });
            }
            if (startDateRaw < todayKey) {
                return res.status(400).json({
                    message: "Date in the past",
                    code: "INVALID_DATE",
                });
            }
            baseUtc = new Date(`${startDateRaw}T00:00:00Z`);
            if (!Number.isFinite(baseUtc.getTime())) {
                return res.status(400).json({
                    message: "Invalid date",
                    code: "INVALID_DATE",
                });
            }
        }

        // ── Build date keys ──
        const dateKeys = [];
        for (let i = 0; i < daysCount; i++) {
            dateKeys.push(addIsraelDaysFromNow(baseUtc, i));
        }

        // ── Intersect with booking horizon window ──
        // Enforces: todayKey <= dateKeyIl <= maxDateKeyIl.
        // Prevents startDate or days query param from exposing dates outside the card's effective horizon.
        const maxDateKeyIl = addIsraelDaysFromNow(
            nowUtcDate,
            effectiveHorizon - 1,
        );
        const horizonDateKeys = dateKeys.filter(
            (dk) => dk >= todayKey && dk <= maxDateKeyIl,
        );

        // ── Fetch blocking bookings in one query ──
        const blockingBookings = await Booking.find({
            card: cardId,
            dateKeyIl: { $in: horizonDateKeys },
            status: { $in: ["pending", "approved"] },
        })
            .select("dateKeyIl localStartHHmm")
            .lean();

        // Group blocked slots by date
        const blockedByDate = new Map();
        for (const b of blockingBookings) {
            const key = b.dateKeyIl;
            if (!blockedByDate.has(key)) blockedByDate.set(key, new Set());
            blockedByDate.get(key).add(b.localStartHHmm);
        }

        // ── Generate per-day availability ──
        const result = horizonDateKeys.map((dateKey) => {
            const wdIdx = new Date(`${dateKey}T00:00:00Z`).getUTCDay();
            const weekdayKey = AVAIL_WEEKDAY_MAP[wdIdx] || "sun";

            const dayConf =
                week[weekdayKey] && typeof week[weekdayKey] === "object"
                    ? week[weekdayKey]
                    : null;
            if (!dayConf || dayConf.open !== true) {
                return {
                    dateKeyIl: dateKey,
                    weekdayKey,
                    isBookable: false,
                    slots: [],
                };
            }

            const intervals = Array.isArray(dayConf.intervals)
                ? dayConf.intervals
                : [];
            const blocked = blockedByDate.get(dateKey) || new Set();
            const isToday = dateKey === todayKey;

            const slots = [];
            for (const interval of intervals) {
                const sM = parseHHmm(interval?.start);
                const eM = parseHHmm(interval?.end);
                if (sM === null || eM === null || sM >= eM) continue;

                for (
                    let m = sM;
                    m + AVAIL_SLOT_DURATION <= eM;
                    m += AVAIL_SLOT_DURATION
                ) {
                    const hh = String(Math.floor(m / 60)).padStart(2, "0");
                    const mm = String(m % 60).padStart(2, "0");
                    const time = `${hh}:${mm}`;
                    const isPast = isToday && m <= nowMinutesIl;
                    const isBlocked = blocked.has(time);
                    slots.push({ time, available: !isPast && !isBlocked });
                }
            }

            return {
                dateKeyIl: dateKey,
                weekdayKey,
                isBookable: true,
                slots,
            };
        });

        return res.json({ days: result, slotDuration: AVAIL_SLOT_DURATION });
    } catch (err) {
        const status = err?.statusCode || err?.status;
        if (status) {
            return res.status(status).json({
                message: err?.message || "Error",
                code: err?.code || null,
            });
        }

        console.error(
            "[booking/availability] error:",
            err?.message || "unknown",
        );
        return res
            .status(500)
            .json({ message: "Failed to fetch availability" });
    }
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
        assertBookingEnabled(card);
        await assertBookingEntitled(card);

        assertSlotInBusinessHoursOrInvalidRequest({
            card,
            dateKeyIl: input.dateKeyIl,
            localHHmm: input.localStartHHmm,
        });

        // Reject requests whose date falls outside the card's booking horizon.
        assertDateWithinHorizon({ card, dateKeyIl: input.dateKeyIl });

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

        // Preserve domain/product HttpError status (same pattern as availability).
        const status = err?.statusCode || err?.status;
        if (status) {
            return res.status(status).json({
                message: err?.message || "Error",
                code: err?.code || null,
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

        const limitRaw = parseInt(req.query.limit, 10);
        const limit = Number.isFinite(limitRaw)
            ? Math.min(Math.max(limitRaw, 1), 50)
            : 20;

        let cardFilterIds = null;
        let cardsById = new Map();

        if (cardId) {
            const card = await Card.findById(cardId);
            assertCardOwner(card, actor);
            cardFilterIds = [card._id];
            cardsById.set(String(card._id), {
                _id: card._id,
                slug: card.slug || null,
                displayName: card.displayName || card.name || null,
                orgId: card.orgId || null,
            });
        } else {
            const ownedCards = await Card.find({
                user: actor.id,
                isActive: true,
            })
                .select("_id slug displayName name orgId")
                .lean();

            const ids = (ownedCards || []).map((c) => c._id).filter(Boolean);
            cardFilterIds = ids;
            cardsById = new Map(
                (ownedCards || []).map((c) => [
                    String(c._id),
                    {
                        _id: c._id,
                        slug: c.slug || null,
                        displayName: c.displayName || c.name || null,
                        orgId: c.orgId || null,
                    },
                ]),
            );
        }

        if (!cardFilterIds || cardFilterIds.length === 0) {
            return res.json({ bookings: [] });
        }

        // Past-slot cleanup: only expire pending bookings whose requested
        // slot time has already passed (owner-decision model).
        await Booking.updateMany(
            {
                card: { $in: cardFilterIds },
                status: "pending",
                endAt: { $lt: new Date() },
            },
            { $set: { status: "expired" } },
        );

        const docs = await Booking.find({ card: { $in: cardFilterIds } })
            .sort({ startAt: -1, _id: -1 })
            .limit(limit)
            .lean();

        const personalOrgId = await getPersonalOrgId();

        const bookings = docs.map((d) => {
            const meta = cardsById.get(String(d.card)) || null;
            const orgId = meta?.orgId ? String(meta.orgId) : "";
            const cardKind =
                !orgId || orgId === String(personalOrgId) ? "personal" : "org";

            return {
                _id: d._id,
                card: d.card,
                cardMeta: meta
                    ? {
                          _id: meta._id,
                          slug: meta.slug || null,
                          cardLabel: meta.displayName || meta.slug || null,
                          cardKind,
                      }
                    : null,
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
                phone: d.customerPhoneRaw,
            };
        });

        return res.json({ bookings });
    } catch (err) {
        const status = err?.statusCode || err?.status;
        if (status) {
            return res.status(status).json({
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

    // Only auto-expire if the requested slot time has already passed.
    const now = Date.now();
    const end =
        booking.endAt instanceof Date
            ? booking.endAt.getTime()
            : new Date(booking.endAt).getTime();
    if (!Number.isFinite(end)) return booking;

    if (end > now) return booking;

    // Slot time passed without owner action - transition to expired.
    await Booking.updateOne(
        { _id: booking._id, status: "pending" },
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

        const fresh = await expireIfNeeded(booking);

        if (fresh.status !== "pending") {
            throw new HttpError(400, "Invalid request", "INVALID_STATUS");
        }

        fresh.status = "approved";
        await fresh.save();

        return res.json({ success: true });
    } catch (err) {
        const status = err?.statusCode || err?.status;
        if (status) {
            return res.status(status).json({
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

        const fresh = await expireIfNeeded(booking);

        if (fresh.status !== "pending" && fresh.status !== "approved") {
            throw new HttpError(400, "Invalid request", "INVALID_STATUS");
        }

        fresh.status = "canceled";
        await fresh.save();

        return res.json({ success: true });
    } catch (err) {
        const status = err?.statusCode || err?.status;
        if (status) {
            return res.status(status).json({
                message: err?.message || "Error",
                code: err?.code || null,
            });
        }

        console.error("[booking/cancel] error:", err?.message || "unknown");
        return res.status(500).json({ message: "Failed to cancel booking" });
    }
}

// ── GET /api/bookings/mine/pending-count ─────────────────────────
// Returns the count of actionable (non-expired) pending bookings across all
// cards owned by the authenticated user. Used only for the header badge.
export async function getPendingCount(req, res) {
    try {
        const actor = resolveActor(req);
        if (!actor || actor.type !== "user") {
            throw new HttpError(401, "Unauthorized", "UNAUTHORIZED");
        }

        const ownedCards = await Card.find({ user: actor.id, isActive: true })
            .select("_id")
            .lean();

        if (!ownedCards || ownedCards.length === 0) {
            return res.json({ pendingCount: 0 });
        }

        const cardIds = ownedCards.map((c) => c._id);
        const now = new Date();

        const pendingCount = await Booking.countDocuments({
            card: { $in: cardIds },
            status: "pending",
            endAt: { $gt: now }, // exclude past-slot pending not yet reconciled
        });

        return res.json({ pendingCount });
    } catch (err) {
        const status = err?.statusCode || err?.status;
        if (status) {
            return res.status(status).json({
                message: err?.message || "Error",
                code: err?.code || null,
            });
        }
        console.error(
            "[booking/pending-count] error:",
            err?.message || "unknown",
        );
        return res
            .status(500)
            .json({ message: "Failed to fetch pending count" });
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

        // Past-slot cleanup: only expire pending bookings whose requested
        // slot time has already passed (owner-decision model).
        const result = await Booking.updateMany(
            {
                status: "pending",
                endAt: { $lte: now },
            },
            { $set: { status: "expired" } },
            { limit },
        );

        return res.json({ success: true, modified: result.modifiedCount || 0 });
    } catch (err) {
        const status = err?.statusCode || err?.status;
        if (status) {
            return res.status(status).json({
                message: err?.message || "Error",
                code: err?.code || null,
            });
        }

        console.error("[booking/reconcile] error:", err?.message || "unknown");
        return res.status(500).json({ message: "Failed to reconcile" });
    }
}
