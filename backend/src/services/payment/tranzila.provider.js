import crypto from "crypto";
import { TRANZILA_CONFIG } from "../../config/tranzila.js";
import User from "../../models/User.model.js";
import Card from "../../models/Card.model.js";
import PaymentTransaction from "../../models/PaymentTransaction.model.js";
import { PRICES_AGOROT } from "../../config/plans.js";
import { sendRenewalFailedEmailMailjetBestEffort } from "../mailjet.service.js";
import { getSiteUrl } from "../../utils/siteUrl.util.js";

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
    // [STO-BATCH-1] STO recurring notify: PII, customer data, and card/bank metadata.
    // These fields are not needed for V1 recurring renewal processing.
    // Lookup will be by sto_external_id, not by customer email/name/ID.
    // This remains a strip-list, not a strict allowlist; stricter STO-only allowlisting is a future contour if needed.
    // myid: Israeli national ID — critical PII, must never be stored.
    // contact/email: customer name/email — PII.
    // cardtype/dbfcard/dbfcardtype: card type/reference metadata.
    // responsecvv: CVV check result code — card security metadata.
    // json_purchase_data: opaque nested JSON — unknown content, strip in V1.
    // cardaquirer/cardissuer: acquirer/issuer metadata — not needed for renewal.
    // dbfisforeign/imaam: card/tax flags — not needed for renewal logic.
    "myid",
    "contact",
    "email",
    "cardtype",
    "dbfcard",
    "dbfcardtype",
    "responsecvv",
    "json_purchase_data",
    "cardaquirer",
    "cardissuer",
    "dbfisforeign",
    "imaam",
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
 * Derive providerTxnId for a Tranzila STO recurring notify.
 *
 * Namespace:  sto:<stoId>:<index>
 *             sto:<stoId>:tempref:<Tempref>  (fallback when index absent)
 *
 * V1 policy — hard constraints (anti-drift):
 *   - No hash fallback: hash instability on field reorder would create
 *     silent duplicate subscription extensions on retries.
 *   - No ConfirmationCode fallback: absent or zero for failed charges —
 *     the cases where idempotency matters most.
 *   - "sto:" prefix guarantees namespace isolation from DirectNG
 *     "tranzila:" and "tranzila:hash:" keys produced by deriveProviderTxnId.
 *
 * Returns null when:
 *   - sto_external_id is absent or empty: payload cannot be grouped.
 *   - Both index and Tempref are absent or empty: no stable replay key exists.
 *
 * Callers MUST treat null as: cannot process — ACK 200 + log, no transaction.
 *
 * @param {object} payload — raw STO notify body (pre-allowlist)
 * @returns {string|null}
 */
function deriveStoProviderTxnId(payload) {
    const stoId = String(payload.sto_external_id ?? "").trim();
    if (!stoId) return null;

    const index = String(payload.index ?? "").trim();
    if (index) return `sto:${stoId}:${index}`;

    const tempref = String(payload.Tempref ?? "").trim();
    if (tempref) return `sto:${stoId}:tempref:${tempref}`;

    return null;
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
        "self_service",
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

        // [5.10a.3.1] Clear renewal failure marker on successful first payment.
        user.renewalFailedAt = null;

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

    /**
     * Process a Tranzila My Billing STO recurring charge notification (server-to-server).
     *
     * ACK policy: business/validation failures do NOT throw (caller returns 200).
     * Only infra failures (DB unreachable) throw → route returns 500 → Tranzila retries.
     *
     * Core invariant: no User/Card mutation before successful PaymentTransaction.create.
     * Success path: validate user fully FIRST, then create paid txn, then extend.
     * Duplicate (E11000): return without any User/Card mutation.
     *
     * @param {object} payload — raw STO My Billing notify body (pre-sanitized by caller)
     * @returns {Promise<object>} — bounded structured result (see return shapes below)
     */
    async handleStoNotify(payload) {
        // ── 0. Common field extraction (no DB, no side effects) ──────────────────
        const payloadAllowlisted = allowlistPayload(payload);
        const rawPayloadHash = computeRawPayloadHash(payload);
        const providerTxnId = deriveStoProviderTxnId(payload);
        const amountAgorot = parseAmountAgorot(payload.sum);
        const stoId = String(payload.sto_external_id ?? "").trim();
        const supplier = String(payload.supplier ?? "").trim();
        const expectedSupplier = String(
            TRANZILA_CONFIG.stoTerminal ?? "",
        ).trim();
        // STO My Billing uses ISO 4217 "ILS" string.
        // DirectNG first-payment numeric "1" must NOT be reused here (anti-drift).
        const currency = String(payload.currency ?? "")
            .trim()
            .toUpperCase();
        const responseCode = String(payload.Response ?? "").trim();
        const isPaid = responseCode === "000";

        // ── 1. Stable replay key guard ────────────────────────────────────────────
        // No stable replay key: cannot safely create ledger record or extend subscription.
        if (!providerTxnId) {
            return { ok: false, reason: "no_provider_txn_id" };
        }

        // ── 2. Early validation failures (pre-user-lookup, userId:null) ──────────
        if (supplier !== expectedSupplier) {
            try {
                await PaymentTransaction.create({
                    providerTxnId,
                    provider: "tranzila",
                    status: "failed",
                    userId: null,
                    cardId: null,
                    plan: null,
                    amountAgorot,
                    currency,
                    payloadAllowlisted,
                    rawPayloadHash,
                    failReason: "supplier_mismatch",
                    idempotencyNote: "sto_recurring_notify",
                });
            } catch (e) {
                if (e.code === 11000) {
                    return { ok: true, duplicate: true, providerTxnId };
                }
                throw e;
            }
            return { ok: false, reason: "supplier_mismatch", providerTxnId };
        }

        // Anti-drift: STO My Billing uses ISO 4217 "ILS"; DirectNG numeric "1" is wrong here.
        if (currency !== "ILS") {
            try {
                await PaymentTransaction.create({
                    providerTxnId,
                    provider: "tranzila",
                    status: "failed",
                    userId: null,
                    cardId: null,
                    plan: null,
                    amountAgorot,
                    currency,
                    payloadAllowlisted,
                    rawPayloadHash,
                    failReason: "currency_mismatch",
                    idempotencyNote: "sto_recurring_notify",
                });
            } catch (e) {
                if (e.code === 11000) {
                    return { ok: true, duplicate: true, providerTxnId };
                }
                throw e;
            }
            return { ok: false, reason: "currency_mismatch", providerTxnId };
        }

        // ── 3. User lookup ────────────────────────────────────────────────────────
        const user = await User.findOne({ "tranzilaSto.stoId": stoId });
        if (!user) {
            try {
                await PaymentTransaction.create({
                    providerTxnId,
                    provider: "tranzila",
                    status: "failed",
                    userId: null,
                    cardId: null,
                    plan: null,
                    amountAgorot,
                    currency,
                    payloadAllowlisted,
                    rawPayloadHash,
                    failReason: "user_not_found",
                    idempotencyNote: "sto_recurring_notify",
                });
            } catch (e) {
                if (e.code === 11000) {
                    return { ok: true, duplicate: true, providerTxnId };
                }
                throw e;
            }
            return { ok: false, reason: "user_not_found", providerTxnId };
        }

        // ── 4. Materialize tranzilaSto subdoc ─────────────────────────────────────
        // Required before any tranzilaSto read/write.
        // Materializes the subdoc for User docs created before the Batch-2 schema field was added.
        const sto = ensureTranzilaStoState(user);

        // ── Local helper: record failed txn + update lastError* (post-user-lookup) ─
        // Does NOT overwrite cancellation audit fields.
        // Returns { duplicate: true } on E11000, throws on infra error.
        const recordFailure = async (
            failReason,
            lastErrorCode,
            { setRenewalFailedAt = false } = {},
        ) => {
            try {
                await PaymentTransaction.create({
                    providerTxnId,
                    provider: "tranzila",
                    status: "failed",
                    userId: user._id,
                    cardId: user.cardId ?? null,
                    plan:
                        user.plan === "monthly" || user.plan === "yearly"
                            ? user.plan
                            : null,
                    amountAgorot,
                    currency,
                    payloadAllowlisted,
                    rawPayloadHash,
                    failReason,
                    idempotencyNote: "sto_recurring_notify",
                });
            } catch (e) {
                if (e.code === 11000) {
                    return { duplicate: true };
                }
                throw e;
            }
            // Only after successful create: update lastError*.
            // Do NOT touch: cancelledAt, cancellationAttemptAt, cancellationErrorCode,
            //               cancellationErrorMessage, cancellationSource, cancellationReason.
            sto.lastErrorCode = lastErrorCode ?? null;
            sto.lastErrorMessage = sanitizeStoErrorMessage(failReason);
            sto.lastErrorAt = new Date();
            // [5.10a.3.1] Set renewal failure marker only for genuine failed recurring charges.
            if (setRenewalFailedAt) user.renewalFailedAt = new Date();
            await user.save();
            return { duplicate: false };
        };

        // ── 5. Post-user-lookup validation failures ───────────────────────────────

        // A. Failed charge (Response !== "000")
        if (!isPaid) {
            const failReason = `response_${responseCode || "unknown"}`;
            const rawCode = Number(responseCode);
            const lastErrorCode =
                responseCode !== "" && Number.isInteger(rawCode)
                    ? rawCode
                    : null;
            // [5.10a.3.1] Genuine provider charge rejection — sets renewalFailedAt marker.
            // Paths 5.B/C/D (sto_cancelled, invalid_plan, amount_mismatch) do NOT set this flag.
            const { duplicate } = await recordFailure(
                failReason,
                lastErrorCode,
                { setRenewalFailedAt: true },
            );
            if (duplicate) return { ok: true, duplicate: true, providerTxnId };
            // [5.10a.3.2] Best-effort failed renewal email — genuine charge rejection only.
            // Fire-and-forget: must never delay webhook ACK.
            // Duplicate replays are filtered above by providerTxnId E11000 guard.
            sendRenewalFailedEmailMailjetBestEffort({
                toEmail: user.email,
                firstName: user.firstName ?? null,
                expiresAt: user.subscription?.expiresAt ?? null,
                pricingUrl: `${getSiteUrl()}/pricing`,
                userId: String(user._id),
            }).catch(() => {});
            return { ok: false, reason: failReason, providerTxnId };
        }

        // B. STO cancelled — notify arrives after operator/user cancellation
        if (sto.status === "cancelled") {
            const { duplicate } = await recordFailure("sto_cancelled", null);
            if (duplicate) return { ok: true, duplicate: true, providerTxnId };
            return { ok: false, reason: "sto_cancelled", providerTxnId };
        }

        // C. Invalid plan — user.plan is DB SSoT; do NOT parse payload.pdesc (anti-drift).
        if (user.plan !== "monthly" && user.plan !== "yearly") {
            const { duplicate } = await recordFailure("invalid_plan", null);
            if (duplicate) return { ok: true, duplicate: true, providerTxnId };
            return { ok: false, reason: "invalid_plan", providerTxnId };
        }

        // D. Amount mismatch — strict equality, no tolerance.
        // P0 operator note: price change in PRICES_AGOROT breaks existing STOs;
        // requires cancel+recreate migration for all active STO users (see 5.8e runbook).
        if (
            amountAgorot === null ||
            amountAgorot !== PRICES_AGOROT[user.plan]
        ) {
            const { duplicate } = await recordFailure("amount_mismatch", null);
            if (duplicate) return { ok: true, duplicate: true, providerTxnId };
            return { ok: false, reason: "amount_mismatch", providerTxnId };
        }

        // ── 6. Success path ───────────────────────────────────────────────────────
        // All validations passed. Create paid ledger record FIRST.
        // Invariant: no User/Card mutation before successful PaymentTransaction.create.
        try {
            await PaymentTransaction.create({
                providerTxnId,
                provider: "tranzila",
                status: "paid",
                userId: user._id,
                cardId: user.cardId ?? null,
                plan: user.plan,
                amountAgorot,
                currency: "ILS",
                payloadAllowlisted,
                rawPayloadHash,
                failReason: null,
                idempotencyNote: "sto_recurring_notify",
            });
        } catch (e) {
            if (e.code === 11000) {
                // Duplicate providerTxnId — idempotent replay, no extension.
                return { ok: true, duplicate: true, providerTxnId };
            }
            throw e;
        }

        // ── 7. Subscription renewal ───────────────────────────────────────────────
        // Use max(now, current paidUntil): do NOT use Date.now()+period alone.
        // Early webhook delivery must not cause paid-time loss (anti-drift).
        const now = new Date();
        const currentExpiry = user.subscription?.expiresAt;
        const baseDate =
            currentExpiry instanceof Date && currentExpiry > now
                ? currentExpiry
                : now;
        const newExpiresAt =
            user.plan === "monthly"
                ? new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000)
                : new Date(baseDate.getTime() + 365 * 24 * 60 * 60 * 1000);

        // Clear last error on successful renewal.
        sto.lastErrorCode = null;
        sto.lastErrorMessage = null;
        sto.lastErrorAt = null;
        // [5.10a.3.1] Clear renewal failure marker on successful recurring renewal.
        user.renewalFailedAt = null;

        // plan: explicit no-op assignment — plan is DB SSoT, not payload.pdesc (anti-drift).
        user.plan = user.plan;
        user.subscription = {
            status: "active",
            provider: "tranzila",
            expiresAt: newExpiresAt,
        };

        await user.save();

        // ── 8. Card billing dual-path update ─────────────────────────────────────
        // Never overwrite billing wholesale (preserve billing.features + billing.payer).
        if (user.cardId) {
            const paidUntil = newExpiresAt;

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
                        plan: user.plan,
                        "billing.status": "active",
                        "billing.plan": user.plan,
                        "billing.paidUntil": paidUntil,
                    },
                },
            );

            // 2) Fallback for billing === null (dot-path would fail). Do NOT set payer/features.
            await Card.updateOne(
                { _id: user.cardId, billing: null },
                {
                    $set: {
                        plan: user.plan,
                        billing: {
                            status: "active",
                            plan: user.plan,
                            paidUntil: paidUntil,
                        },
                    },
                },
            );
        }

        return {
            ok: true,
            providerTxnId,
            userId: String(user._id),
            cardIdPresent: Boolean(user.cardId),
            plan: user.plan,
            paidUntil: newExpiresAt,
        };
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
