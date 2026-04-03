import mongoose from "mongoose";

const { Schema } = mongoose;

export const BOOKING_STATUSES = ["pending", "approved", "canceled", "expired"];

const BookingSchema = new Schema(
    {
        card: {
            type: Schema.Types.ObjectId,
            ref: "Card",
            required: true,
            index: true,
        },

        startAt: { type: Date, required: true },
        endAt: { type: Date, required: true },

        // Israel-local derivations for UI/grouping (not the source of truth).
        dateKeyIl: { type: String, required: true, trim: true }, // YYYY-MM-DD
        localStartHHmm: { type: String, required: true, trim: true }, // HH:mm
        tz: { type: String, required: true, trim: true },

        status: {
            type: String,
            required: true,
            enum: BOOKING_STATUSES,
            index: true,
        },

        // Legacy-compatible expiry field; set equal to endAt at creation.
        // Lifecycle decisions now use endAt directly (see booking.controller).
        expiresAt: { type: Date, required: true },

        // History purge: auto-delete one week after appointment time has passed.
        purgeAt: { type: Date, required: true },

        // Anti-repeat identity
        customerName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },
        customerPhoneRaw: {
            type: String,
            required: true,
            trim: true,
            maxlength: 30,
        },
        customerPhoneNormalized: {
            type: String,
            required: true,
            trim: true,
            maxlength: 30,
        },
        // Deterministic hash of normalized phone (optionally scoped), for index-friendly dedupe.
        personKey: { type: String, required: true, trim: true, maxlength: 80 },

        // Consent evidence
        consentAccepted: { type: Boolean, required: true },
        consentAcceptedAt: { type: Date, required: true },
        consentTermsVersion: { type: String, required: true, trim: true },
        consentPrivacyVersion: { type: String, required: true, trim: true },

        // Public anti-abuse (best-effort, not relied upon for identity)
        publicIpHash: { type: String, default: null, trim: true },

        // Slot key used for uniqueness in V1 (UTC based, stable)
        slotKey: { type: String, required: true, trim: true },
    },
    {
        timestamps: true,
        minimize: false,
    },
);

// ── Governed index declarations (autoIndex OFF — migration is manual) ──

// Blocking statuses: pending/approved.
const BLOCKING_PFE = {
    status: { $in: ["pending", "approved"] },
};

// #1 Slot lock: only one blocking booking per card+slot.
BookingSchema.index(
    { card: 1, slotKey: 1 },
    {
        unique: true,
        name: "uniq_booking_blocking_slot",
        partialFilterExpression: BLOCKING_PFE,
    },
);

// #2 Same-person lock: only one blocking booking per card+person.
BookingSchema.index(
    { card: 1, personKey: 1 },
    {
        unique: true,
        name: "uniq_booking_blocking_person",
        partialFilterExpression: BLOCKING_PFE,
    },
);

// #3 Owner list view: card + startAt ordering.
BookingSchema.index(
    { card: 1, startAt: 1, _id: 1 },
    { name: "idx_booking_card_startAt" },
);

// #4 Reconciler scan: pending by endAt (slot-end cleanup).
BookingSchema.index(
    { status: 1, endAt: 1, _id: 1 },
    { name: "idx_booking_pending_endAt" },
);

// #5 Retention purge TTL: delete docs when purgeAt < now.
BookingSchema.index(
    { purgeAt: 1 },
    { name: "idx_booking_purgeAt_ttl", expireAfterSeconds: 0 },
);

export default mongoose.model("Booking", BookingSchema);
