import crypto from "crypto";
import { TRANZILA_CONFIG } from "../../config/tranzila.js";
import User from "../../models/User.model.js";
import Card from "../../models/Card.model.js";
import PaymentTransaction from "../../models/PaymentTransaction.model.js";
import { PRICES_AGOROT } from "../../config/plans.js";

/**
 * Подпись Tranzila
 */
function sign(payload) {
    return crypto
        .createHash("sha256")
        .update(payload + TRANZILA_CONFIG.secret)
        .digest("hex");
}

/**
 * Keys that must NEVER be stored (PAN, CVV, expiry).
 */
const STRIP_KEYS = new Set([
    "ccno",
    "mycvv",
    "myexpdate",
    "expdate",
    "expmonth",
    "expyear",
    "card_number",
    "cvv",
    "cc_number",
    "cred_type",
    // [BATCH-0] Token field — must be lowercase to match k.toLowerCase() in allowlistPayload.
    "tranzilatk",
]);

/**
 * Return payload with sensitive keys removed.
 */
function allowlistPayload(payload) {
    const safe = {};
    for (const [k, v] of Object.entries(payload)) {
        if (!STRIP_KEYS.has(k.toLowerCase())) {
            safe[k] = v;
        }
    }
    return safe;
}

/**
 * Deterministic sha256 hash of the full payload (stable key order).
 */
function computeRawPayloadHash(payload) {
    const sorted = JSON.stringify(payload, Object.keys(payload).sort());
    return crypto.createHash("sha256").update(sorted).digest("hex");
}

/**
 * Discover-then-derive providerTxnId.
 * Prefer a provider-assigned ID; fallback to sha256 of payload.
 */
function deriveProviderTxnId(payload) {
    const candidates = [
        payload.index,
        payload.authnr,
        payload.ConfirmationCode,
    ];
    const found = candidates.find(
        (v) => v !== undefined && v !== null && String(v).trim() !== "",
    );
    if (found) return `tranzila:${String(found).trim()}`;

    const hash = computeRawPayloadHash(payload);
    return `tranzila:hash:${hash}`;
}

/**
 * Parse sum field to integer agorot. Returns null if unparseable.
 */
function parseAmountAgorot(sum) {
    if (sum === undefined || sum === null) return null;
    const num = Number(sum);
    if (!Number.isFinite(num) || num < 0) return null;
    // Tranzila reports sum in ILS (e.g. 39.99). Convert to agorot.
    return Math.round(num * 100);
}

/**
 * Loose ObjectId check (24 hex chars).
 */
function looksLikeObjectId(v) {
    return typeof v === "string" && /^[a-f0-9]{24}$/i.test(v);
}

export default {
    /**
     * Создание платежа (redirect пользователя на Tranzila)
     */
    async createPayment({ userId, plan }) {
        const ag = PRICES_AGOROT[plan];
        if (!ag) {
            throw new Error("Invalid plan");
        }

        const sumStr = `${Math.floor(ag / 100)}.${String(ag % 100).padStart(2, "0")}`;
        const description = `Cardigo – ${plan} plan`;

        // DirectNG: terminal lives in the URL path, not as a query param.
        // tranmode=AK: standard debit + create token — required for TranzilaTK to be returned.
        // No outbound signature: DirectNG hosted checkout does not use a request signature.
        const params = [
            `sum=${sumStr}`,
            `currency=1`,
            `lang=il`,
            `tranmode=AK`,
            `description=${encodeURIComponent(description)}`,
            `notify_url_address=${encodeURIComponent(TRANZILA_CONFIG.notifyUrl)}`,
            `success_url_address=${encodeURIComponent(TRANZILA_CONFIG.successUrl)}`,
            `fail_url_address=${encodeURIComponent(TRANZILA_CONFIG.failUrl)}`,
            `udf1=${userId}`,
            `udf2=${plan}`,
        ].join("&");

        return {
            paymentUrl: `${TRANZILA_CONFIG.checkoutBase}/${TRANZILA_CONFIG.terminal}/iframenew.php?${params}`,
        };
    },

    /**
     * Server-to-server notify от Tranzila
     * Здесь принимается РЕШЕНИЕ о подписке.
     *
     * ACK policy (SSoT §4):
     * - Signature/business failures do NOT throw (anti-oracle).
     * - Only infra failures (DB unreachable) throw → route returns 500.
     * - Ledger insert BEFORE any User/Card fulfillment.
     */
    async handleNotify(payload) {
        const { signature, ...data } = payload;

        // [BATCH-0] Extract token BEFORE allowlist/strip so it is never
        // written into payloadAllowlisted. "tranzilatk" in STRIP_KEYS ensures
        // allowlistPayload(payload) drops it even if called with full payload.
        const capturedToken = data.TranzilaTK ?? null;

        // ── 1. Derive idempotency key ──
        const providerTxnId = deriveProviderTxnId(payload);

        // ── 2. Compute audit fields ──
        const payloadAllowlisted = allowlistPayload(payload);
        const rawPayloadHash = computeRawPayloadHash(payload);

        // ── 3. Resolve fields safely (moved before trust — DirectNG trust needs these) ──
        const rawUserId = data.udf1;
        const plan = data.udf2;
        const userId = looksLikeObjectId(rawUserId) ? rawUserId : null;
        const validPlan = plan === "monthly" || plan === "yearly" ? plan : null;
        const amountAgorot = parseAmountAgorot(data.sum);

        // ── 4. Dual-mode trust model ──
        // Legacy path: payload contains `signature` (legacy Tranzila notify endpoint).
        // DirectNG path: no `signature` in payload; use bounded correlated field trust.
        const hasLegacySignature =
            typeof signature === "string" && signature.length > 0;
        let legacySigOk = false;
        if (hasLegacySignature) {
            const signaturePayload = [
                `terminal=${TRANZILA_CONFIG.terminal}`,
                `sum=${data.sum}`,
                `Response=${data.Response}`,
                `udf1=${data.udf1}`,
                `udf2=${data.udf2}`,
            ].join("&");
            legacySigOk = signature === sign(signaturePayload);
        }

        const responseOk = data.Response === "000";
        const expectedAgorot = PRICES_AGOROT[validPlan] ?? null;
        const sumOk =
            amountAgorot !== null &&
            expectedAgorot !== null &&
            amountAgorot === expectedAgorot;
        const supplierOk =
            String(data.supplier || "").trim() ===
            String(TRANZILA_CONFIG.terminal || "").trim();
        const currencyOk = data.currency === "1";
        const tranmodeOk = data.tranmode === "AK";
        const indexPresent =
            typeof data.index === "string" && data.index.trim() !== "";
        const directNgTrustOk =
            responseOk &&
            Boolean(userId) &&
            Boolean(validPlan) &&
            sumOk &&
            supplierOk &&
            currencyOk &&
            tranmodeOk &&
            indexPresent;
        const trustOk = hasLegacySignature ? legacySigOk : directNgTrustOk;

        // [BATCH-0-PROBE] Temporary sandbox observability — remove after sandbox verification.
        // Logs field names and booleans only. Never logs token value or raw payload values.
        console.log(
            "[batch0-probe]",
            JSON.stringify({
                keys: Object.keys(payload).sort(),
                Response: data.Response,
                hasLegacySignature,
                directNgTrustOk,
                trustOk,
                hasToken: Boolean(capturedToken),
                candidateFields: {
                    index: Boolean(data.index),
                    authnr: Boolean(data.authnr),
                    ConfirmationCode: Boolean(data.ConfirmationCode),
                },
                expiryFields: {
                    expmonth: Boolean(data.expmonth),
                    expyear: Boolean(data.expyear),
                    expdate: Boolean(data.expdate),
                    myexpdate: Boolean(data.myexpdate),
                },
            }),
        );

        // ── 5. Determine status ──
        const isPaid = trustOk && responseOk;
        const status = isPaid ? "paid" : "failed";

        let failReason = null;
        if (!responseOk) failReason = `response_${data.Response || "unknown"}`;
        if (!userId) failReason = failReason || "invalid_userId";
        if (!validPlan) failReason = failReason || "invalid_plan";
        if (hasLegacySignature && !legacySigOk)
            failReason = failReason || "legacy_bad_signature";
        if (!hasLegacySignature) {
            if (!sumOk) failReason = failReason || "amount_mismatch";
            if (!supplierOk) failReason = failReason || "supplier_mismatch";
            if (!currencyOk) failReason = failReason || "currency_mismatch";
            if (!tranmodeOk) failReason = failReason || "tranmode_mismatch";
            if (!indexPresent) failReason = failReason || "missing_index";
        }

        // ── 6. Ledger insert (idempotency via unique providerTxnId) ──
        try {
            await PaymentTransaction.create({
                providerTxnId,
                provider: "tranzila",
                userId,
                plan: validPlan,
                amountAgorot,
                status,
                payloadAllowlisted,
                rawPayloadHash,
                failReason,
            });
        } catch (e) {
            if (e.code === 11000) {
                // Duplicate providerTxnId - idempotent replay, no-op.
                return;
            }
            // Infra failure - throw so route returns 500 and provider retries.
            throw e;
        }

        // ── 7. If not paid → stop (already logged in ledger) ──
        if (!isPaid) return;
        if (!validPlan) return;
        if (!userId) return;

        // ── 8. Fulfillment: User + Card updates (existing logic) ──
        const user = await User.findById(userId);
        if (!user) return;

        const expiresAt =
            validPlan === "monthly"
                ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

        user.plan = validPlan;
        user.subscription = {
            status: "active",
            provider: "tranzila",
            expiresAt,
        };

        // [BATCH-0] Persist token only on successful paid path.
        // tranzilaToken is not logged and not stored in audit payload.
        if (capturedToken) {
            user.tranzilaToken = capturedToken;
        }

        await user.save();

        if (user.cardId) {
            const paidUntil = expiresAt;

            // Phase 2C: never overwrite billing wholesale (preserve billing.features + billing.payer).
            // 1) Dot-path update for normal cases (billing missing or object).
            await Card.updateOne(
                {
                    _id: user.cardId,
                    $or: [
                        { billing: { $exists: false } },
                        { billing: { $type: "object" } },
                    ],
                },
                {
                    $set: {
                        plan: validPlan,
                        "billing.status": "active",
                        "billing.plan": validPlan,
                        "billing.paidUntil": paidUntil,
                    },
                },
            );

            // 2) Fallback for billing === null (dot-path would fail). Do NOT set payer/features.
            await Card.updateOne(
                { _id: user.cardId, billing: null },
                {
                    $set: {
                        plan: validPlan,
                        billing: {
                            status: "active",
                            plan: validPlan,
                            paidUntil: paidUntil,
                        },
                    },
                },
            );
        }
    },
};
