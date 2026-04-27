import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import paymentProvider from "../services/payment/index.js";
import PaymentIntent from "../models/PaymentIntent.model.js";
import User from "../models/User.model.js";
import { PRICES_AGOROT } from "../config/plans.js";

const router = Router();

// Supported checkout modes:
// - external = full-page DirectNG redirect flow (existing).
// - iframe   = iframe checkout flow; requires TRANZILA_IFRAME_SUCCESS_URL and
//              TRANZILA_IFRAME_FAIL_URL to be configured (validated at call time).
const ALLOWED_MODES = new Set(["external", "iframe"]);

/**
 * Returns true if receiptProfile has at least one non-null, non-empty meaningful field.
 */
function hasMeaningfulReceiptProfile(rp) {
    if (!rp || typeof rp !== "object") return false;
    const fields = [
        "name",
        "nameInvoice",
        "fullName",
        "numberId",
        "email",
        "address",
        "city",
        "zipCode",
        "countryCode",
    ];
    return fields.some((f) => {
        const v = rp[f];
        return v !== null && v !== undefined && v !== "";
    });
}

/**
 * Build receiptProfileSnapshot from user for PaymentIntent creation.
 * numberId is stored server-side only; never logged or returned in DTOs.
 */
function buildReceiptProfileSnapshot(user) {
    const rp = user.receiptProfile ?? null;
    const now = new Date();
    if (hasMeaningfulReceiptProfile(rp)) {
        return {
            snapshotSource: "receiptProfile",
            recipientType: rp.recipientType ?? null,
            name: rp.name || user.firstName || user.email || null,
            nameInvoice: rp.nameInvoice ?? null,
            fullName: rp.fullName ?? null,
            numberId: rp.numberId ?? null,
            email: rp.email || user.email || null,
            address: rp.address ?? null,
            city: rp.city ?? null,
            zipCode: rp.zipCode ?? null,
            countryCode: rp.countryCode ?? null,
            capturedAt: now,
        };
    }
    return {
        snapshotSource: "fallback",
        recipientType: null,
        name: user.firstName || user.email || null,
        nameInvoice: null,
        fullName: null,
        numberId: null,
        email: user.email || null,
        address: null,
        city: null,
        zipCode: null,
        countryCode: null,
        capturedAt: now,
    };
}

// ── Snapshot equivalence helpers (module-private) ────────────────────────────
// Used to determine whether an existing pending PaymentIntent can be reused.
// capturedAt is intentionally excluded: it is a timestamp of when the snapshot
// was taken, not a receipt-data field. Two snapshots with identical billing data
// but different capturedAt values are semantically equivalent.

const SNAPSHOT_COMPARE_FIELDS = [
    "recipientType",
    "name",
    "nameInvoice",
    "fullName",
    "numberId", // compared server-side only; never logged
    "email",
    "address",
    "city",
    "zipCode",
    "countryCode",
    "snapshotSource",
    // capturedAt — intentionally absent
];

/**
 * Normalise a receipt snapshot field value for equivalence comparison.
 * null / undefined → null
 * string → trim; empty-after-trim → null; otherwise trimmed string
 * other primitives → value as-is
 * Does not log. Does not expose values.
 */
function normalizeReceiptSnapshotValue(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === "string") {
        const t = value.trim();
        return t === "" ? null : t;
    }
    return value;
}

/**
 * Returns true iff both receipt profile snapshots represent equivalent
 * billing/receipt data (all SNAPSHOT_COMPARE_FIELDS match after normalization).
 * Returns false if either argument is absent.
 * Never logs values. Never exposes numberId.
 */
function receiptProfileSnapshotsEquivalent(a, b) {
    if (!a || !b) return false;
    for (const field of SNAPSHOT_COMPARE_FIELDS) {
        if (
            normalizeReceiptSnapshotValue(a[field]) !==
            normalizeReceiptSnapshotValue(b[field])
        ) {
            return false;
        }
    }
    return true;
}

/**
 * POST /create — Create a payment
 * body: { plan: "monthly" | "yearly", mode?: "external" }
 */
router.post("/create", requireAuth, async (req, res) => {
    const { plan, mode: rawMode } = req.body;

    if (!plan) {
        return res.status(400).json({ message: "Plan is required" });
    }

    const mode = rawMode === undefined ? "external" : rawMode;
    if (!ALLOWED_MODES.has(mode)) {
        return res.status(400).json({ message: "Unsupported mode" });
    }

    // Iframe config preflight — validated before any DB write or provider call.
    // Do not expose env var names or env values in client responses.
    if (
        mode === "iframe" &&
        (!process.env.TRANZILA_IFRAME_SUCCESS_URL?.trim() ||
            !process.env.TRANZILA_IFRAME_FAIL_URL?.trim())
    ) {
        return res
            .status(400)
            .json({ message: "Iframe checkout is not configured" });
    }

    if (process.env.PAYMENT_INTENT_ENABLED !== "true") {
        // Feature flag off — existing flow, zero delta.
        try {
            const payment = await paymentProvider.createPayment({
                userId: req.userId,
                plan,
                mode,
            });
            return res.json(payment);
        } catch (err) {
            if (err?.code === "IFRAME_CHECKOUT_NOT_CONFIGURED") {
                return res
                    .status(400)
                    .json({ message: "Iframe checkout is not configured" });
            }
            throw err;
        }
    }

    // ── Feature flag enabled: PaymentIntent required ──
    const amountAgorot = PRICES_AGOROT[plan];
    if (!amountAgorot) {
        return res.status(400).json({ message: "Invalid plan" });
    }

    const user = await User.findById(req.userId).select(
        "firstName email receiptProfile subscription",
    );
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    // Guard: block checkout if user already has a live active subscription.
    const sub = user.subscription || {};
    if (
        sub.status === "active" &&
        sub.expiresAt &&
        new Date(sub.expiresAt) > new Date()
    ) {
        return res
            .status(409)
            .json({ message: "Already have an active subscription" });
    }

    const snapshot = buildReceiptProfileSnapshot(user);
    const now = new Date();
    const checkoutExpiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const purgeAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    // ── Pending-intent reuse guard ────────────────────────────────────────────
    // Reuse an existing valid pending PaymentIntent only if its stored
    // receiptProfileSnapshot is equivalent to the freshly-built snapshot.
    // If the user changed receipt profile data, the snapshots will differ and
    // a new PaymentIntent is created so the receipt uses the updated data.
    const existingIntent = await PaymentIntent.findOne({
        userId: req.userId,
        plan,
        mode,
        status: "pending",
        checkoutExpiresAt: { $gt: now },
    })
        .sort({ createdAt: -1 })
        .lean();

    if (
        existingIntent &&
        receiptProfileSnapshotsEquivalent(
            existingIntent.receiptProfileSnapshot,
            snapshot,
        )
    ) {
        let payment;
        try {
            payment = await paymentProvider.createPayment({
                userId: req.userId,
                plan,
                mode,
                paymentIntentId: existingIntent._id,
            });
        } catch (err) {
            if (err?.code === "IFRAME_CHECKOUT_NOT_CONFIGURED") {
                return res
                    .status(400)
                    .json({ message: "Iframe checkout is not configured" });
            }
            throw err;
        }
        return res.json({
            ...payment,
            paymentIntentId: existingIntent._id.toString(),
        });
    }
    // → no match or snapshot mismatch: create a new PaymentIntent below

    let paymentIntent;
    try {
        paymentIntent = await PaymentIntent.create({
            userId: req.userId,
            plan,
            mode,
            amountAgorot,
            receiptProfileSnapshot: snapshot,
            checkoutExpiresAt,
            purgeAt,
        });
    } catch (err) {
        console.error("[payment/create] PaymentIntent.create failed", {
            event: "payment_intent_create_failed",
            userId: req.userId,
            plan,
            message: err?.message,
        });
        return res
            .status(500)
            .json({ message: "Payment initialization failed" });
    }

    let payment;
    try {
        payment = await paymentProvider.createPayment({
            userId: req.userId,
            plan,
            mode,
            paymentIntentId: paymentIntent._id,
        });
    } catch (err) {
        if (err?.code === "IFRAME_CHECKOUT_NOT_CONFIGURED") {
            return res
                .status(400)
                .json({ message: "Iframe checkout is not configured" });
        }
        throw err;
    }

    return res.json({
        ...payment,
        paymentIntentId: paymentIntent._id.toString(),
    });
});

/**
 * Server-to-server notify (Tranzila)
 * БЕЗ requireAuth - defense-in-depth via x-cardigo-notify-token (MUST-if-set)
 */
router.post("/notify", async (req, res) => {
    try {
        // Fail-closed: aligned with STO notify posture.
        // Missing token → 503 (misconfigured, do not process).
        // Token mismatch → 200 anti-oracle (do not leak mismatch).
        const expected = process.env.CARDIGO_NOTIFY_TOKEN?.trim();
        if (!expected) {
            return res.status(503).send("ERROR");
        }
        const provided = req.header("x-cardigo-notify-token")?.trim();
        if (provided !== expected) {
            // Anti-oracle: do not leak token mismatch
            return res.status(200).send("OK");
        }

        await paymentProvider.handleNotify(req.body);
        res.status(200).send("OK");
    } catch (err) {
        // Only infra failures (DB down, network) reach here.
        // Signature/business failures are handled inside handleNotify (no throw).
        console.error("[notify] infra failure:", err.message);
        res.status(500).send("ERROR");
    }
});

/**
 * STO server-to-server notify (Tranzila recurring)
 * БЕЗ requireAuth - fail-closed via CARDIGO_STO_NOTIFY_TOKEN (must be set, else 503)
 */
router.post("/sto-notify", async (req, res) => {
    try {
        console.log("[sto-notify] received");
        // A. Read expected token — fail-closed: 503 if not configured
        const expectedStoToken = process.env.CARDIGO_STO_NOTIFY_TOKEN?.trim();
        if (!expectedStoToken) {
            console.error(
                "[sto-notify] CARDIGO_STO_NOTIFY_TOKEN is not configured",
            );
            return res.status(503).send("ERROR");
        }

        // B. Validate provided token from header
        const provided = req.header("x-cardigo-sto-notify-token")?.trim();
        if (provided !== expectedStoToken) {
            // Anti-oracle: do not reveal mismatch to caller
            console.warn("[sto-notify] tokenMatched=false");
            return res.status(200).send("OK");
        }

        // C. Token matched — call handler
        const stoResult = await paymentProvider.handleStoNotify(req.body);
        console.log("[sto-notify] handler result", {
            ok: stoResult?.ok,
            duplicate: stoResult?.duplicate ?? false,
            reason: stoResult?.reason ?? null,
            providerTxnIdPresent: Boolean(stoResult?.providerTxnId),
            userIdPresent: Boolean(stoResult?.userId),
            cardIdPresent: stoResult?.cardIdPresent ?? null,
            plan:
                stoResult?.plan === "monthly" || stoResult?.plan === "yearly"
                    ? stoResult.plan
                    : null,
        });
        res.status(200).send("OK");
    } catch (err) {
        // Only infra failures (DB down, network) reach here.
        // Business failures are handled inside handleStoNotify (no throw).
        console.error("[sto-notify] infra failure:", err.message);
        res.status(500).send("ERROR");
    }
});

export default router;
