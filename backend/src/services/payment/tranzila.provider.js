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

// ── [BATCH-3] STO private service ─────────────────────────────────────────────
// Not wired. Not exported. Called only from the wiring contour (Batch 4).

/** Stale pending threshold: treat pending records older than 5 min as retryable. */
const STO_PENDING_STALE_MS = 5 * 60 * 1000;

/**
 * Ensure user.tranzilaSto is a writable Mongoose-tracked object before any read/write.
 * Required for old User documents where the tranzilaSto inline nested path was never
 * materialized in MongoDB (created before the Batch-2 schema field was added).
 * Uses Mongoose canonical user.set() so the path is registered in the change-tracking
 * system and leaf defaults (null) are applied via schema caster.
 * Returns the live subdoc reference so the caller needs no ?? fallback.
 *
 * @param {object} user — Mongoose User document
 * @returns {object} user.tranzilaSto — guaranteed writable object
 */
function ensureTranzilaStoState(user) {
    if (!user.tranzilaSto) {
        user.set("tranzilaSto", {});
    }

    return user.tranzilaSto;
}

/**
 * Returns true only when TRANZILA_STO_CREATE_ENABLED is explicitly set to the
 * string "true". Absent, "false", or any other value disables STO creation.
 * Strict string equality — no truthy coercion.
 */
function isStoCreateEnabled() {
    return process.env.TRANZILA_STO_CREATE_ENABLED === "true";
}

/**
 * Build Tranzila v2 API auth headers.
 * Winning formula (postman_canonical): requestTime=Unix_seconds,
 * nonce=80_alphanumeric, HMAC(key=privateKey+requestTime+nonce, msg=appKey) hex.
 * Never logs any header value.
 *
 * @returns {Record<string, string>}
 */
function buildTranzilaApiAuthHeaders() {
    const appKey = TRANZILA_CONFIG.apiAppKey;
    const privateKey = TRANZILA_CONFIG.apiPrivateKey;

    const requestTime = String(Math.round(Date.now() / 1000));

    const charset =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const bytes = crypto.randomBytes(80);
    const nonce = Array.from(bytes, (b) => charset[b % charset.length]).join(
        "",
    );

    const accessToken = crypto
        .createHmac("sha256", privateKey + requestTime + nonce)
        .update(appKey)
        .digest("hex");

    return {
        "X-tranzila-api-app-key": appKey,
        "X-tranzila-api-request-time": requestTime,
        "X-tranzila-api-nonce": nonce,
        "X-tranzila-api-access-token": accessToken,
        Accept: "application/json",
        "Content-Type": "application/json",
    };
}

/**
 * Sanitize provider error message before DB storage.
 * Truncates to schema maxlength (500). Never logs the value.
 *
 * @param {unknown} message
 * @returns {string|null}
 */
function sanitizeStoErrorMessage(message) {
    if (typeof message !== "string") return null;
    return message.slice(0, 500);
}

/**
 * Build the Tranzila /v2/sto/create request body.
 * Uses only the proven probe body shape (U1 success: HTTP 200 error_code=0).
 * Throws on validation failure — caller wraps in try/catch.
 *
 * @param {object} user           — Mongoose User document
 * @param {"monthly"|"yearly"} plan
 * @param {Date} firstChargeDate  — must be in the future
 * @returns {object}              — JSON-serialisable body
 */
function buildStoCreateBody(user, plan, firstChargeDate) {
    // ── Input validation (throw → createTranzilaStoForUser maps to failed state) ──
    if (!user.tranzilaToken) {
        throw new Error("sto_build_error: missing tranzilaToken");
    }
    const expMonth = user.tranzilaTokenMeta?.expMonth;
    const expYear = user.tranzilaTokenMeta?.expYear;
    if (!Number.isInteger(expMonth) || expMonth < 1 || expMonth > 12) {
        throw new Error("sto_build_error: invalid expMonth");
    }
    if (!Number.isInteger(expYear) || expYear < 2020 || expYear > 2099) {
        throw new Error("sto_build_error: invalid expYear");
    }
    if (plan !== "monthly" && plan !== "yearly") {
        throw new Error(`sto_build_error: invalid plan ${plan}`);
    }
    if (
        !(firstChargeDate instanceof Date) ||
        !Number.isFinite(firstChargeDate.getTime())
    ) {
        throw new Error("sto_build_error: invalid firstChargeDate");
    }
    if (firstChargeDate.getTime() <= Date.now()) {
        throw new Error(
            "sto_build_error: firstChargeDate must be in the future",
        );
    }

    // ── first_charge_date: YYYY-MM-DD ──
    const firstChargeDateStr = firstChargeDate.toISOString().slice(0, 10);

    // ── charge_dom: day of month clamped 1–28 (avoids Feb 29/30/31 edge cases) ──
    const rawDay = firstChargeDate.getUTCDate();
    const chargeDom = Math.min(Math.max(rawDay, 1), 28);

    // ── item label ──
    const itemName =
        plan === "yearly"
            ? "Cardigo Premium - Yearly"
            : "Cardigo Premium - Monthly";

    // ── unit_price: agorot → ILS shekels ──
    const unitPrice = PRICES_AGOROT[plan] / 100;

    // ── client block ──
    const clientName = user.firstName?.trim() || null;
    const client = { email: user.email };
    if (clientName) client.name = clientName;

    return {
        terminal_name: TRANZILA_CONFIG.stoTerminal,
        sto_payments_number: 9999,
        charge_frequency: plan,
        first_charge_date: firstChargeDateStr,
        charge_dom: chargeDom,
        currency_code: "ILS",
        response_language: "english",
        created_by_user: "cardigo-service",
        items: [
            {
                name: itemName,
                units_number: 1,
                unit_price: unitPrice,
            },
        ],
        // card.token is never logged; stored only at the point of use here.
        card: {
            token: user.tranzilaToken,
            expire_month: expMonth,
            expire_year: expYear,
        },
        client,
    };
}

/**
 * Build the Tranzila /v2/sto/update request body for STO deactivation.
 * Returns a status-only body — exactly 5 keys, no pricing or schedule fields.
 * Throws on validation failure — caller wraps in try/catch.
 *
 * @param {string} stoTerminal
 * @param {string|number} stoId — provider STO schedule ID (stored as String in schema)
 * @returns {object}
 */
function buildStoDeactivateBody(stoTerminal, stoId) {
    if (!stoTerminal || typeof stoTerminal !== "string") {
        throw new Error("sto_deactivate_build_error: invalid stoTerminal");
    }
    const stoIdNum = Number(stoId);
    if (
        !Number.isFinite(stoIdNum) ||
        stoIdNum <= 0 ||
        !Number.isInteger(stoIdNum)
    ) {
        throw new Error("sto_deactivate_build_error: invalid stoId");
    }
    return {
        terminal_name: stoTerminal,
        sto_id: stoIdNum,
        sto_status: "inactive",
        updated_by_user: "cardigo_cancel_script",
        response_language: "english",
    };
}

/**
 * Create a Tranzila STO schedule for a user who has a confirmed token.
 * [BATCH-3] PRIVATE — NOT exported. Not wired into handleNotify yet (Batch 4).
 *
 * Idempotency:  stoId + status="created"  → skip.
 * Write-ahead:  status="pending"          → before HTTP call.
 * Stale guard:  pending older than STO_PENDING_STALE_MS → allow retry.
 *
 * @param {object} user             — Mongoose User document (must be fetched, not plain object)
 * @param {"monthly"|"yearly"} plan
 * @param {Date} firstChargeDate    — typically user.subscription.expiresAt
 * @returns {Promise<{ok:boolean, [skipped]:boolean, [created]:boolean, [stoId]:string, [reason]:string, [errorCode]:number|null, [errorMessage]:string}>}
 */
async function createTranzilaStoForUser(user, plan, firstChargeDate) {
    const currentSto = ensureTranzilaStoState(user);

    // ── A. Idempotency guard ──
    if (currentSto.stoId && currentSto.status === "created") {
        return {
            ok: true,
            skipped: true,
            reason: "already_created",
            stoId: currentSto.stoId,
        };
    }

    // ── B. Cancelled guard ──
    if (currentSto.status === "cancelled") {
        return { ok: false, skipped: true, reason: "cancelled" };
    }

    // ── C. Pending guard (stale check) ──
    if (
        currentSto.status === "pending" &&
        currentSto.lastAttemptAt instanceof Date
    ) {
        const age = Date.now() - currentSto.lastAttemptAt.getTime();
        if (age < STO_PENDING_STALE_MS) {
            return { ok: false, skipped: true, reason: "pending" };
        }
        // Stale — fall through to retry.
    }

    // ── D. Config validation ──
    const missingConfig =
        !TRANZILA_CONFIG.stoTerminal ||
        !TRANZILA_CONFIG.stoApiUrl ||
        !TRANZILA_CONFIG.apiAppKey ||
        !TRANZILA_CONFIG.apiPrivateKey;
    if (missingConfig) {
        user.tranzilaSto.status = "failed";
        user.tranzilaSto.lastAttemptAt = new Date();
        user.tranzilaSto.lastErrorCode = null;
        user.tranzilaSto.lastErrorMessage = "config_incomplete";
        user.tranzilaSto.lastErrorAt = new Date();
        await user.save();
        return { ok: false, errorMessage: "config_incomplete" };
    }

    // ── E. HTTPS guard ──
    if (!TRANZILA_CONFIG.stoApiUrl.startsWith("https://")) {
        user.tranzilaSto.status = "failed";
        user.tranzilaSto.lastAttemptAt = new Date();
        user.tranzilaSto.lastErrorCode = null;
        user.tranzilaSto.lastErrorMessage = "invalid_sto_api_url";
        user.tranzilaSto.lastErrorAt = new Date();
        await user.save();
        return { ok: false, errorMessage: "invalid_sto_api_url" };
    }

    // ── F. Write-ahead pending ──
    user.tranzilaSto.status = "pending";
    user.tranzilaSto.lastAttemptAt = new Date();
    user.tranzilaSto.lastErrorCode = null;
    user.tranzilaSto.lastErrorMessage = null;
    user.tranzilaSto.lastErrorAt = null;
    await user.save();

    // ── G. Build headers/body ──
    // Body contains card.token — must never be logged.
    let body;
    try {
        body = buildStoCreateBody(user, plan, firstChargeDate);
    } catch (buildErr) {
        user.tranzilaSto.status = "failed";
        user.tranzilaSto.lastErrorCode = null;
        user.tranzilaSto.lastErrorMessage =
            sanitizeStoErrorMessage(buildErr.message) || "build_error";
        user.tranzilaSto.lastErrorAt = new Date();
        await user.save();
        return { ok: false, errorMessage: user.tranzilaSto.lastErrorMessage };
    }

    const headers = buildTranzilaApiAuthHeaders();

    // ── H. Fetch ──
    let res;
    let rawText;
    try {
        // AbortSignal.timeout is available from Node 17.3 / Node 18+.
        res = await fetch(TRANZILA_CONFIG.stoApiUrl, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(15000),
        });
        // Read once — never re-read or log raw text.
        rawText = await res.text();
    } catch (_fetchErr) {
        // Network error, timeout, or DNS failure.
        user.tranzilaSto.status = "failed";
        user.tranzilaSto.lastErrorCode = null;
        user.tranzilaSto.lastErrorMessage = "network_error";
        user.tranzilaSto.lastErrorAt = new Date();
        await user.save();
        return { ok: false, errorMessage: "network_error" };
    }

    // ── I. Parse JSON response ──
    let responseBody;
    try {
        responseBody = JSON.parse(rawText);
    } catch (_parseErr) {
        user.tranzilaSto.status = "failed";
        user.tranzilaSto.lastErrorCode = null;
        user.tranzilaSto.lastErrorMessage = "parse_error";
        user.tranzilaSto.lastErrorAt = new Date();
        await user.save();
        return { ok: false, errorMessage: "parse_error" };
    }

    const httpStatus = res.status;
    const isHttp2xx = httpStatus >= 200 && httpStatus < 300;

    // ── L. HTTP auth / non-2xx ──
    if (!isHttp2xx) {
        const errMsg =
            httpStatus === 401 || httpStatus === 403
                ? "auth_failure"
                : "http_error";
        user.tranzilaSto.status = "failed";
        user.tranzilaSto.lastErrorCode = httpStatus;
        user.tranzilaSto.lastErrorMessage = errMsg;
        user.tranzilaSto.lastErrorAt = new Date();
        await user.save();
        return { ok: false, errorMessage: errMsg };
    }

    // ── J. Success ──
    if (Number(responseBody.error_code) === 0 && responseBody.sto_id) {
        user.tranzilaSto.stoId = String(responseBody.sto_id);
        user.tranzilaSto.status = "created";
        user.tranzilaSto.createdAt = new Date();
        user.tranzilaSto.lastErrorCode = null;
        user.tranzilaSto.lastErrorMessage = null;
        user.tranzilaSto.lastErrorAt = null;
        await user.save();
        return { ok: true, created: true, stoId: user.tranzilaSto.stoId };
    }

    // ── K. Application failure (HTTP 2xx but non-zero error_code) ──
    const errCode = Number.isFinite(Number(responseBody.error_code))
        ? Number(responseBody.error_code)
        : null;
    const errMessage =
        sanitizeStoErrorMessage(responseBody.message) || "sto_create_failed";

    user.tranzilaSto.status = "failed";
    user.tranzilaSto.lastErrorCode = errCode;
    user.tranzilaSto.lastErrorMessage = errMessage;
    user.tranzilaSto.lastErrorAt = new Date();
    await user.save();
    return { ok: false, errorCode: errCode, errorMessage: errMessage };
}

/**
 * Deactivate a user's Tranzila STO schedule via /v2/sto/update.
 * [BATCH-3] PRIVATE — exported for operator tooling only (see sto-cancel.mjs, contour 5.6c).
 *
 * Provider-first: Mongo status="cancelled" only after HTTP 2xx + error_code === 0.
 * Write-ahead: cancellationAttemptAt is set before the API call; status is NOT changed pre-confirm.
 *
 * @param {object} user — Mongoose User document
 * @param {{ source?: string, reason?: string|null }} [options]
 * @returns {Promise<object>}
 */
async function cancelTranzilaStoForUser(
    user,
    { source = "operator_script", reason = null } = {},
) {
    const ALLOWED_CANCEL_SOURCES = [
        "operator_script",
        "admin",
        "webhook",
        "manual_portal",
    ];
    const normalizedSource = ALLOWED_CANCEL_SOURCES.includes(source)
        ? source
        : "operator_script";
    const sanitizedReason = sanitizeStoErrorMessage(reason);

    const currentSto = ensureTranzilaStoState(user);

    // ── A. Cancelled guard ──
    if (currentSto.status === "cancelled") {
        return {
            ok: true,
            skipped: true,
            reason: "already_cancelled",
            stoIdPresent: Boolean(currentSto.stoId),
        };
    }

    // ── B. No stoId guard ──
    if (!currentSto.stoId) {
        return {
            ok: false,
            skipped: true,
            reason: "no_sto_id",
        };
    }

    // ── C. Invalid state guard ──
    if (currentSto.status !== "created") {
        return {
            ok: false,
            skipped: true,
            reason: "invalid_state",
            stoIdPresent: Boolean(currentSto.stoId),
        };
    }

    // ── D. Config guard ──
    const missingConfig =
        !TRANZILA_CONFIG.stoTerminal ||
        !TRANZILA_CONFIG.stoUpdateApiUrl ||
        !TRANZILA_CONFIG.apiAppKey ||
        !TRANZILA_CONFIG.apiPrivateKey;
    if (missingConfig) {
        user.tranzilaSto.cancellationAttemptAt = new Date();
        user.tranzilaSto.cancellationErrorCode = null;
        user.tranzilaSto.cancellationErrorMessage = "config_incomplete";
        await user.save();
        return {
            ok: false,
            errorMessage: "config_incomplete",
            stoIdPresent: true,
        };
    }

    // ── E. HTTPS guard ──
    if (!TRANZILA_CONFIG.stoUpdateApiUrl.startsWith("https://")) {
        user.tranzilaSto.cancellationAttemptAt = new Date();
        user.tranzilaSto.cancellationErrorCode = null;
        user.tranzilaSto.cancellationErrorMessage = "invalid_sto_update_url";
        await user.save();
        return {
            ok: false,
            errorMessage: "invalid_sto_update_url",
            stoIdPresent: true,
        };
    }

    // ── F. Write-ahead audit ──
    // Set cancellationAttemptAt before API call. Do NOT change status pre-confirm.
    user.tranzilaSto.cancellationAttemptAt = new Date();
    user.tranzilaSto.cancellationErrorCode = null;
    user.tranzilaSto.cancellationErrorMessage = null;
    await user.save();

    // ── G. Build body ──
    let body;
    try {
        body = buildStoDeactivateBody(
            TRANZILA_CONFIG.stoTerminal,
            currentSto.stoId,
        );
    } catch (buildErr) {
        user.tranzilaSto.cancellationErrorCode = null;
        user.tranzilaSto.cancellationErrorMessage =
            sanitizeStoErrorMessage(buildErr.message) || "build_error";
        await user.save();
        return {
            ok: false,
            errorMessage: user.tranzilaSto.cancellationErrorMessage,
            stoIdPresent: true,
        };
    }

    const headers = buildTranzilaApiAuthHeaders();

    // ── H. Fetch ──
    let res;
    let rawText;
    try {
        res = await fetch(TRANZILA_CONFIG.stoUpdateApiUrl, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(15000),
        });
        // Read once — never re-read or log raw response text.
        rawText = await res.text();
    } catch (_fetchErr) {
        user.tranzilaSto.cancellationErrorCode = null;
        user.tranzilaSto.cancellationErrorMessage = "network_error";
        await user.save();
        return { ok: false, errorMessage: "network_error", stoIdPresent: true };
    }

    // ── I. Parse response ──
    let responseBody;
    try {
        responseBody = JSON.parse(rawText);
    } catch (_parseErr) {
        user.tranzilaSto.cancellationErrorCode = null;
        user.tranzilaSto.cancellationErrorMessage = "parse_error";
        await user.save();
        return { ok: false, errorMessage: "parse_error", stoIdPresent: true };
    }

    const httpStatus = res.status;
    const isHttp2xx = httpStatus >= 200 && httpStatus < 300;

    // ── L. HTTP non-2xx ──
    if (!isHttp2xx) {
        const errMsg =
            httpStatus === 401 || httpStatus === 403
                ? "auth_failure"
                : httpStatus === 404
                  ? "provider_not_found"
                  : "http_error";
        user.tranzilaSto.cancellationErrorCode = httpStatus;
        user.tranzilaSto.cancellationErrorMessage = errMsg;
        await user.save();
        return {
            ok: false,
            errorCode: httpStatus,
            errorMessage: errMsg,
            stoIdPresent: true,
        };
    }

    // ── J. Success — provider confirmed STO inactive ──
    if (Number(responseBody.error_code) === 0) {
        user.tranzilaSto.status = "cancelled";
        user.tranzilaSto.cancelledAt = new Date();
        user.tranzilaSto.cancellationAttemptAt = new Date();
        user.tranzilaSto.cancellationSource = normalizedSource;
        user.tranzilaSto.cancellationReason = sanitizedReason;
        user.tranzilaSto.cancellationErrorCode = null;
        user.tranzilaSto.cancellationErrorMessage = null;
        await user.save();
        return { ok: true, cancelled: true, stoIdPresent: true };
    }

    // ── K. Application failure (HTTP 2xx but non-zero error_code) ──
    const errCode = Number.isFinite(Number(responseBody.error_code))
        ? Number(responseBody.error_code)
        : null;
    const errMessage =
        sanitizeStoErrorMessage(responseBody.message) || "sto_cancel_failed";

    user.tranzilaSto.cancellationErrorCode = errCode;
    user.tranzilaSto.cancellationErrorMessage = errMessage;
    await user.save();
    return {
        ok: false,
        errorCode: errCode,
        errorMessage: errMessage,
        stoIdPresent: true,
    };
}

// ── STO observability ──────────────────────────────────────────────────────
// Private. Centralized at the handleNotify call site only.
// Never called inside createTranzilaStoForUser guard branches.
/**
 * @param {{ userId: unknown, plan: string, result?: object, unexpectedError?: boolean }} opts
 */
function logStoCreateOutcome({
    userId,
    plan,
    result,
    unexpectedError = false,
}) {
    const logObject = {
        event: "sto_create",
        userId: String(userId),
        plan,
        ok: Boolean(result?.ok),
        created: Boolean(result?.created),
        skipped: Boolean(result?.skipped),
        reason: result?.reason ?? null,
        errorCode: result?.errorCode ?? null,
        errorMessage: result?.errorMessage ?? null,
        stoIdPresent: Boolean(result?.stoId),
    };

    if (unexpectedError) {
        console.error("[sto]", logObject);
        return;
    }

    if (result?.ok === false && result?.skipped !== true) {
        console.warn("[sto]", logObject);
        return;
    }

    console.info("[sto]", logObject);
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

        // [BATCH-1] Extract expiry BEFORE allowlist/strip.
        // expmonth/expyear are in STRIP_KEYS — they are stripped by allowlistPayload().
        // Values are parsed here, before stripping, and never logged.
        const _rawExpMonth = parseInt(data.expmonth, 10);
        const _rawExpYear = parseInt(data.expyear, 10);
        const capturedExpMonth =
            Number.isInteger(_rawExpMonth) &&
            _rawExpMonth >= 1 &&
            _rawExpMonth <= 12
                ? _rawExpMonth
                : null;
        const _expYearNorm =
            _rawExpYear < 100 ? 2000 + _rawExpYear : _rawExpYear;
        const capturedExpYear =
            Number.isInteger(_rawExpYear) &&
            _expYearNorm >= 2020 &&
            _expYearNorm <= 2099
                ? _expYearNorm
                : null;

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
        // tranmode is observability-only — DirectNG echoes "A" for token-capable
        // payments even when checkout was initiated with tranmode=AK.
        // It is NOT used as a blocking trust signal.
        const indexPresent =
            typeof data.index === "string" && data.index.trim() !== "";
        const directNgTrustOk =
            responseOk &&
            Boolean(userId) &&
            Boolean(validPlan) &&
            sumOk &&
            supplierOk &&
            currencyOk &&
            indexPresent;
        const trustOk = hasLegacySignature ? legacySigOk : directNgTrustOk;

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
            // [BATCH-1] Persist expiry metadata alongside token.
            // Only stored when both values are valid and a token is present.
            // Do not store partial metadata. Does not block fulfillment if absent.
            if (capturedExpMonth !== null && capturedExpYear !== null) {
                user.tranzilaTokenMeta = {
                    expMonth: capturedExpMonth,
                    expYear: capturedExpYear,
                };
            }
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

        // ── 9. [BATCH-3/5.4] STO schedule create — non-blocking, after full fulfillment ──
        // STO is a follow-on lifecycle operation and must not block first-payment fulfillment.
        if (isStoCreateEnabled()) {
            try {
                const stoResult = await createTranzilaStoForUser(
                    user,
                    validPlan,
                    expiresAt,
                );
                logStoCreateOutcome({
                    userId,
                    plan: validPlan,
                    result: stoResult,
                });
            } catch (_stoErr) {
                logStoCreateOutcome({
                    userId,
                    plan: validPlan,
                    unexpectedError: true,
                });
                // Swallow — first payment is already fulfilled. Do not rethrow.
            }
        }
    },
};

// ── Named exports for operator tooling ──────────────────────────────────────
// createTranzilaStoForUser: used by sto-retry-failed.mjs operator script.
// cancelTranzilaStoForUser: used by sto-cancel.mjs operator script (contour 5.6c).
// STO_PENDING_STALE_MS: re-exported so the script uses the same threshold
//   as the runtime, preventing stale-threshold drift.
// Neither cancelTranzilaStoForUser nor createTranzilaStoForUser is added to
// export default — the payment service facade is unchanged.
export {
    createTranzilaStoForUser,
    cancelTranzilaStoForUser,
    STO_PENDING_STALE_MS,
};
