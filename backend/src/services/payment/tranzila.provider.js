import crypto from "crypto";
import { TRANZILA_CONFIG } from "../../config/tranzila.js";
import User from "../../models/User.model.js";
import Card from "../../models/Card.model.js";
import PaymentTransaction from "../../models/PaymentTransaction.model.js";
import { PRICES_AGOROT } from "../../config/plans.js";
import { sendRenewalFailedEmailMailjetBestEffort } from "../mailjet.service.js";
import { getSiteUrl } from "../../utils/siteUrl.util.js";
import {
    createReceiptYeshInvoice,
    buildYeshInvoiceDocumentUniqueKey,
    shareReceiptYeshInvoice,
} from "../yeshinvoice.service.js";
import Receipt from "../../models/Receipt.model.js";
import PaymentIntent from "../../models/PaymentIntent.model.js";
import { incrementMetric } from "../../utils/sentryMetrics.util.js";

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
    // [BATCH-2] Handshake echo field — extracted before allowlist for §5.6 hash verification.
    // Must be stripped so it is never persisted in PaymentTransaction.payloadAllowlisted.
    // lowercase: allowlistPayload lowercases keys via k.toLowerCase() before STRIP_KEYS lookup.
    "thtk",
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

/**
 * Recovery plan resolver for STO recurring notify.
 *
 * Used when user.plan was already downgraded to a non-paid value (e.g. by
 * billingReconcile) BEFORE a genuinely paid recurring notify arrives, which
 * would otherwise be rejected as invalid_plan and create charged-but-free.
 *
 * Source of truth: the durable paid PaymentTransaction ledger, which is NEVER
 * downgraded. Prefers the same cardId when the user has a linked card.
 * Anti-drift: NEVER derives plan from payload.pdesc/description and NEVER
 * infers plan from amount. Returns "monthly" | "yearly" | null only.
 *
 * @param {object} user — Mongoose User document
 * @returns {Promise<"monthly"|"yearly"|null>}
 */
async function resolveRecoveryPlanFromLedger(user) {
    const baseQuery = {
        userId: user._id,
        provider: "tranzila",
        status: "paid",
        plan: { $in: ["monthly", "yearly"] },
    };

    // Prefer same-card paid history when the user has a linked card.
    if (user.cardId) {
        const sameCard = await PaymentTransaction.findOne({
            ...baseQuery,
            cardId: user.cardId,
        })
            .sort({ createdAt: -1 })
            .select("plan")
            .lean();
        if (sameCard?.plan === "monthly" || sameCard?.plan === "yearly") {
            return sameCard.plan;
        }
    }

    // Fallback: latest paid txn for this user regardless of card linkage.
    const anyPaid = await PaymentTransaction.findOne(baseQuery)
        .sort({ createdAt: -1 })
        .select("plan")
        .lean();
    if (anyPaid?.plan === "monthly" || anyPaid?.plan === "yearly") {
        return anyPaid.plan;
    }

    return null;
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
 * Returns true only when YESH_INVOICE_ENABLED is explicitly set to the
 * string "true". Absent, "false", or any other value disables receipt creation.
 * Strict string equality — no truthy coercion.
 */
function isYeshInvoiceEnabled() {
    return process.env.YESH_INVOICE_ENABLED === "true";
}

/**
 * Returns true only when TRANZILA_HANDSHAKE_ENABLED is explicitly set to the
 * string "true". Absent, "false", or any other value disables Handshake.
 * Strict string equality — no truthy coercion. Mirrors isStoCreateEnabled/isYeshInvoiceEnabled.
 */
function isHandshakeEnabled() {
    return process.env.TRANZILA_HANDSHAKE_ENABLED === "true";
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
 * Fetch a Tranzila Handshake V2 token server-side.
 * Locks the transaction amount at the Tranzila server before presenting checkout.
 * Returns the thtk token string. Throws on any failure — caller must fail closed.
 *
 * ANTI-DRIFT:
 * - buildTranzilaApiAuthHeaders() is called unchanged — do not inline or alter its formula.
 * - sumIls must always equal PRICES_AGOROT[plan] / 100 — same source as sumStr in createPayment.
 * - terminal must always be TRANZILA_CONFIG.terminal — the DirectNG checkout terminal, NOT stoTerminal.
 * - request_params is intentionally omitted in Phase 2 (minimal footprint).
 * - Never log thtk, auth headers, raw response body, or secrets.
 *
 * @param {{ terminal: string, sumIls: number }} params
 * @returns {Promise<string>} thtk token (memory-only; caller must not persist plaintext)
 */
async function fetchTranzilaHandshakeToken({ terminal, sumIls }) {
    const url = TRANZILA_CONFIG.handshakeApiUrl;
    if (!url || !url.startsWith("https://")) {
        throw new Error(
            "handshake_config_error: handshakeApiUrl missing or not https",
        );
    }

    const headers = buildTranzilaApiAuthHeaders();
    const body = JSON.stringify({ terminal_name: terminal, sum: sumIls });

    let res;
    let rawText;
    try {
        res = await fetch(url, {
            method: "POST",
            headers,
            body,
            signal: AbortSignal.timeout(10000),
        });
        rawText = await res.text();
    } catch (_fetchErr) {
        throw new Error("handshake_network_error");
    }

    if (res.status < 200 || res.status >= 300) {
        const code =
            res.status === 401 || res.status === 403
                ? "handshake_auth_error"
                : "handshake_http_error";
        throw new Error(`${code}: ${res.status}`);
    }

    let parsed;
    try {
        parsed = JSON.parse(rawText);
    } catch (_parseErr) {
        throw new Error("handshake_parse_error");
    }

    if (Number(parsed.error_code) !== 0) {
        throw new Error(
            `handshake_provider_error: ${Number(parsed.error_code)}`,
        );
    }

    if (typeof parsed.thtk !== "string" || parsed.thtk.trim() === "") {
        throw new Error("handshake_missing_thtk");
    }

    return parsed.thtk;
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
async function createTranzilaStoForUser(
    user,
    plan,
    firstChargeDate,
    opts = {},
) {
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
    // Default behaviour: cancelled STO cannot be recreated (prevents accidental double-STO).
    // Exception: opts.allowRecreateAfterCancel === true enables the dedicated self-service
    // resume path (POST /api/account/resume-auto-renewal) which validates all preconditions.
    if (
        currentSto.status === "cancelled" &&
        opts.allowRecreateAfterCancel !== true
    ) {
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
        "admin_delete",
        "admin_revoke",
        "self_delete",
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

// ── YeshInvoice Customer mapping helpers ───────────────────────────────────────────
// Private to this module. Handles receipt profile resolution, PII masking,
// and structured customer object assembly for YeshInvoice API calls.

function trimOrNull(value) {
    if (value === null || value === undefined) return null;
    if (typeof value !== "string") return null;
    const t = value.trim();
    return t === "" ? null : t;
}

function hasMeaningfulReceiptProfile(profile) {
    if (!profile) return false;
    return !!(
        trimOrNull(profile.name) ||
        trimOrNull(profile.nameInvoice) ||
        trimOrNull(profile.fullName) ||
        trimOrNull(profile.numberId) ||
        trimOrNull(profile.email) ||
        trimOrNull(profile.address) ||
        trimOrNull(profile.city) ||
        trimOrNull(profile.zipCode) ||
        trimOrNull(profile.countryCode) ||
        trimOrNull(profile.recipientType)
    );
}

function maskNumberId(raw) {
    const v = trimOrNull(raw);
    if (v === null) return null;
    if (v.length <= 4) return "***";
    return "***" + v.slice(-4);
}

function hashNumberId(raw) {
    const v = trimOrNull(raw);
    if (v === null) return null;
    return crypto.createHash("sha256").update(v).digest("hex");
}

function buildFallbackCustomer(user) {
    return {
        name: trimOrNull(user.firstName) || trimOrNull(user.email) || "",
        email: trimOrNull(user.email) || "",
        countryCode: "IL",
        source: "fallback",
    };
}

function buildCustomerFromProfile(profile, user, source) {
    return {
        name: trimOrNull(profile.name) || trimOrNull(user.email) || "",
        nameInvoice: trimOrNull(profile.nameInvoice),
        fullName: trimOrNull(profile.fullName),
        numberId: trimOrNull(profile.numberId),
        email: trimOrNull(profile.email) || trimOrNull(user.email) || "",
        address: trimOrNull(profile.address),
        city: trimOrNull(profile.city),
        zipCode: trimOrNull(profile.zipCode),
        countryCode: (trimOrNull(profile.countryCode) || "IL").toUpperCase(),
        source,
    };
}

function buildCustomerFromPaymentIntent(intent, user) {
    const snap = intent.receiptProfileSnapshot ?? {};
    return {
        name: trimOrNull(snap.name) || trimOrNull(user.email) || "",
        nameInvoice: trimOrNull(snap.nameInvoice),
        fullName: trimOrNull(snap.fullName),
        numberId: trimOrNull(snap.numberId),
        email: trimOrNull(snap.email) || trimOrNull(user.email) || "",
        address: trimOrNull(snap.address),
        city: trimOrNull(snap.city),
        zipCode: trimOrNull(snap.zipCode),
        countryCode: (trimOrNull(snap.countryCode) || "IL").toUpperCase(),
        source: "paymentIntent",
    };
}

function buildFirstPaymentCustomer(user, resolvedPaymentIntent) {
    if (resolvedPaymentIntent !== null) {
        return buildCustomerFromPaymentIntent(resolvedPaymentIntent, user);
    }
    if (hasMeaningfulReceiptProfile(user.receiptProfile)) {
        return buildCustomerFromProfile(
            user.receiptProfile,
            user,
            "receiptProfile",
        );
    }
    return buildFallbackCustomer(user);
}

function buildStoCustomer(user) {
    if (hasMeaningfulReceiptProfile(user.receiptProfile)) {
        return buildCustomerFromProfile(
            user.receiptProfile,
            user,
            "receiptProfile",
        );
    }
    return buildFallbackCustomer(user);
}

function buildRecipientSnapshot(customer, paymentIntentId) {
    return {
        name: customer.name || null,
        nameInvoice: customer.nameInvoice || null,
        fullName: customer.fullName || null,
        email: customer.email || null,
        numberIdMasked: maskNumberId(customer.numberId),
        numberIdHash: hashNumberId(customer.numberId),
        address: customer.address || null,
        city: customer.city || null,
        zipCode: customer.zipCode || null,
        countryCode: customer.countryCode || null,
        source: customer.source || null,
        paymentIntentId: paymentIntentId || null,
    };
}

// [Y3G] Best-effort reverse link — must NOT block ACK, share, or fulfillment.
async function linkReceiptToPaymentTransactionBestEffort(
    paymentTransactionId,
    receiptId,
    source,
) {
    if (!paymentTransactionId || !receiptId) return;
    try {
        await PaymentTransaction.updateOne(
            { _id: paymentTransactionId, receiptId: null },
            { $set: { receiptId } },
        );
    } catch (err) {
        console.warn("[receipt] txn writeback failed", {
            event: "receipt_txn_writeback_error",
            paymentTransactionIdPresent: Boolean(paymentTransactionId),
            receiptIdPresent: Boolean(receiptId),
            source,
            ok: false,
            failReason: String(err?.message ?? "").slice(0, 200),
        });
    }
}

// [Y3H] Best-effort failed-receipt persistence — Phase 2A.
// Creates a Receipt{status:"failed", shareStatus:"skipped"} as a durable retry target.
// Must never block payment notify ACK, fulfillment, or successful receipt behavior.
// Phase 2B retry job will later update these records to status:"created".
async function persistFailedReceiptBestEffort({
    txnDocId,
    userId,
    amountAgorot,
    plan,
    documentUniqueKey,
    failReason,
    recipientSnapshot,
    flow,
}) {
    if (!txnDocId) {
        console.warn("[receipt] failed receipt skipped — no txnDocId", {
            event: "receipt_failed_no_txn_id",
            flow,
            ok: false,
        });
        return;
    }
    try {
        await Receipt.create({
            paymentTransactionId: txnDocId,
            userId,
            provider: "yeshinvoice",
            providerDocId: null,
            providerDocNumber: null,
            documentType: 6,
            pdfUrl: null,
            documentUrl: null,
            amountAgorot,
            plan,
            status: "failed",
            shareStatus: "skipped",
            failReason: String(failReason ?? "").slice(0, 200),
            documentUniqueKey,
            issuedAt: null,
            recipientSnapshot,
        });
    } catch (_err) {
        if (_err.code === 11000) {
            // Idempotent replay — failed Receipt for this PaymentTransaction already exists.
            console.info(
                "[receipt] failed receipt duplicate — idempotent replay",
                {
                    event: "receipt_failed_duplicate",
                    flow,
                    txnDocIdPresent: Boolean(txnDocId),
                    idempotent: true,
                },
            );
            return;
        }
        console.error("[receipt] failed receipt create error", {
            event: "receipt_failed_create_error",
            flow,
            txnDocIdPresent: Boolean(txnDocId),
            userIdPresent: Boolean(userId),
            ok: false,
            failReason: String(_err?.message ?? "").slice(0, 200),
        });
    }
}

/**
 * Validates and returns the iframe-mode return URL pair.
 * Throws IFRAME_CHECKOUT_NOT_CONFIGURED if either URL is missing.
 * Called only when mode="iframe" is requested.
 */
function requireIframeCheckoutUrls() {
    if (!TRANZILA_CONFIG.iframeSuccessUrl || !TRANZILA_CONFIG.iframeFailUrl) {
        const err = new Error("Iframe checkout is not configured");
        err.code = "IFRAME_CHECKOUT_NOT_CONFIGURED";
        throw err;
    }
    return {
        successUrl: TRANZILA_CONFIG.iframeSuccessUrl,
        failUrl: TRANZILA_CONFIG.iframeFailUrl,
    };
}

export default {
    /**
     * Создание платежа (redirect пользователя на Tranzila)
     */
    async createPayment({
        userId,
        plan,
        paymentIntentId,
        mode = "external",
    } = {}) {
        const ag = PRICES_AGOROT[plan];
        if (!ag) {
            throw new Error("Invalid plan");
        }

        const sumStr = `${Math.floor(ag / 100)}.${String(ag % 100).padStart(2, "0")}`;

        // ── Handshake: amount-lock at Tranzila server ──────────────────────────
        // ANTI-DRIFT: terminal must always match TRANZILA_CONFIG.terminal (same as checkout URL path).
        // ANTI-DRIFT: sumIls must always equal ag / 100 (same source as sumStr above).
        // ANTI-DRIFT: request_params intentionally absent — add only after explicit audit.
        // ANTI-DRIFT: TRANZILA_STO_TERMINAL must never be used here (STO and checkout are separate terminals).
        // Fail closed: any failure throws → route returns error → paymentUrl never returned.
        // paymentIntentId is required when Handshake is enabled — Cardigo hardened flow invariant.
        let thtk = null;
        if (isHandshakeEnabled()) {
            if (!paymentIntentId) {
                throw new Error("handshake_requires_payment_intent");
            }
            thtk = await fetchTranzilaHandshakeToken({
                terminal: TRANZILA_CONFIG.terminal,
                sumIls: ag / 100,
            });
            // Hash-only storage — plaintext thtk must never be persisted.
            // Filter includes all intent trust fields to prevent writing to a consumed or foreign intent.
            const thtkHash = crypto
                .createHash("sha256")
                .update(thtk)
                .digest("hex");
            const updateResult = await PaymentIntent.updateOne(
                {
                    _id: paymentIntentId,
                    userId,
                    plan,
                    amountAgorot: ag,
                    status: "pending",
                    checkoutExpiresAt: { $gt: new Date() },
                },
                {
                    $set: {
                        handshakeThtkHash: thtkHash,
                        handshakeCreatedAt: new Date(),
                    },
                },
            );
            if (!updateResult.matchedCount) {
                throw new Error("handshake_intent_update_failed");
            }
        }

        const description = `Cardigo – ${plan} plan`;

        // Select success/fail return URLs based on mode.
        // notify_url_address is always the server-to-server notify endpoint regardless of mode.
        const { successUrl, failUrl } =
            mode === "iframe"
                ? requireIframeCheckoutUrls()
                : {
                      successUrl: TRANZILA_CONFIG.successUrl,
                      failUrl: TRANZILA_CONFIG.failUrl,
                  };

        // NOTIFY DELIVERY MODE:
        // "portal" (TRANZILA_NOTIFY_DELIVERY_MODE=portal): notify URL is configured
        //   statically in Tranzila terminal Advanced settings ("כתובת דף notify").
        //   ANTI-DRIFT: NEVER re-add notify_url_address here in portal mode.
        //   Keeping it out of the browser-visible paymentUrl prevents CARDIGO_NOTIFY_TOKEN exposure.
        // "embedded" (absent/any other value): existing behavior — notify_url_address
        //   included in params. Used for mock/dev/local where portal URL is not configured.
        const notifyDeliveryMode =
            process.env.TRANZILA_NOTIFY_DELIVERY_MODE ?? "embedded";
        const notifyParam =
            notifyDeliveryMode === "portal"
                ? []
                : [
                      `notify_url_address=${encodeURIComponent(TRANZILA_CONFIG.notifyUrl)}`,
                  ];

        // DirectNG: terminal lives in the URL path, not as a query param.
        // tranmode=AK: standard debit + create token — required for TranzilaTK to be returned.
        // No outbound signature: DirectNG hosted checkout does not use a request signature.
        const params = [
            `sum=${sumStr}`,
            `currency=1`,
            `lang=il`,
            `tranmode=AK`,
            `description=${encodeURIComponent(description)}`,
            ...notifyParam,
            `success_url_address=${encodeURIComponent(successUrl)}`,
            `fail_url_address=${encodeURIComponent(failUrl)}`,
            `udf1=${userId}`,
            `udf2=${plan}`,
            ...(paymentIntentId ? [`udf3=${paymentIntentId}`] : []),
            // ANTI-DRIFT: thtk must use encodeURIComponent; only present when Handshake enabled and token obtained.
            ...(thtk ? [`thtk=${encodeURIComponent(thtk)}`] : []),
        ].join("&");

        const result = {
            paymentUrl: `${TRANZILA_CONFIG.checkoutBase}/${TRANZILA_CONFIG.terminal}/iframenew.php?${params}`,
        };
        if (paymentIntentId) {
            result.paymentIntentId = String(paymentIntentId);
        }
        return result;
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

        // [BATCH-2] Extract thtk BEFORE allowlist/strip — "thtk" is in STRIP_KEYS.
        // Used only for hash comparison in §5.6. Plaintext never stored, never logged.
        const notifyThtk = data.thtk ?? null;

        // ── 1. Derive idempotency key ──
        const providerTxnId = deriveProviderTxnId(payload);

        // ── 2. Compute audit fields ──
        const payloadAllowlisted = allowlistPayload(payload);
        const rawPayloadHash = computeRawPayloadHash(payload);

        // ── 3. Resolve fields safely (moved before trust — DirectNG trust needs these) ──
        const rawUserId = data.udf1;
        const plan = data.udf2;
        const rawIntentId = data.udf3 ?? null;
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
        // let: may be overridden by §5.5 PaymentIntent gate (DirectNG paid path).
        let isPaid = trustOk && responseOk;
        let status = isPaid ? "paid" : "failed";

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

        // ── 5.5. PaymentIntent strict atomic gate ──
        // For paid DirectNG notifies with PAYMENT_INTENT_ENABLED=true:
        //   - udf3/rawIntentId is required and must reference a valid pending intent.
        //   - Atomic consume: pending → consuming (findOneAndUpdate).
        //   - If gate fails: fulfillment is BLOCKED (isPaid forced false, no User/Card update).
        // For all other paths (legacy signed, failed DirectNG, gating disabled):
        //   - Best-effort resolve only — does not block fulfillment.
        let resolvedPaymentIntentId = null;
        let resolvedPaymentIntent = null;
        const isDirectNgPaidCandidate = isPaid && !hasLegacySignature;
        const intentGatingEnabled =
            process.env.PAYMENT_INTENT_ENABLED === "true";

        if (isDirectNgPaidCandidate && intentGatingEnabled) {
            // Gate 1: rawIntentId must be present and a valid ObjectId.
            if (rawIntentId === null || !looksLikeObjectId(rawIntentId)) {
                isPaid = false;
                status = "failed";
                failReason = failReason || "payment_intent_required";
                console.warn(
                    "[payment_intent] gate blocked: no valid intentId in paid DirectNG notify",
                    {
                        event: "payment_intent_gate_blocked",
                        reason: "missing_intent_id",
                        userId,
                        plan: validPlan,
                    },
                );
            } else {
                // Gate 2: atomic consume — pending → consuming.
                try {
                    const intentNow = new Date();
                    const preUpdateIntent =
                        await PaymentIntent.findOneAndUpdate(
                            {
                                _id: rawIntentId,
                                userId,
                                plan: validPlan,
                                amountAgorot,
                                status: "pending",
                                checkoutExpiresAt: { $gt: intentNow },
                            },
                            { $set: { status: "consuming" } },
                            { new: false }, // return pre-update doc for receiptProfileSnapshot
                        );
                    if (preUpdateIntent === null) {
                        isPaid = false;
                        status = "failed";
                        failReason =
                            failReason ||
                            "payment_intent_not_found_or_consumed";
                        console.warn(
                            "[payment_intent] gate blocked: atomic consume returned null",
                            {
                                event: "payment_intent_gate_blocked",
                                reason: "not_found_or_consumed",
                                userId,
                                plan: validPlan,
                            },
                        );
                    } else {
                        resolvedPaymentIntent = preUpdateIntent;
                        resolvedPaymentIntentId = preUpdateIntent._id;
                    }
                } catch (intentConsumeErr) {
                    // DB infra failure — fail-safe: treat as blocked, not fail-open.
                    isPaid = false;
                    status = "failed";
                    failReason = failReason || "payment_intent_lookup_failed";
                    console.warn(
                        "[payment_intent] gate error: atomic consume threw",
                        {
                            event: "payment_intent_gate_error",
                            message: intentConsumeErr?.message,
                            userId,
                            plan: validPlan,
                        },
                    );
                }
            }
        } else if (
            rawIntentId !== null &&
            looksLikeObjectId(rawIntentId) &&
            userId &&
            validPlan
        ) {
            // Non-blocking resolve: legacy signed path, failed DirectNG, or gating disabled.
            try {
                const intent = await PaymentIntent.findOne({
                    _id: rawIntentId,
                    userId,
                    plan: validPlan,
                });
                if (intent) {
                    resolvedPaymentIntent = intent;
                    resolvedPaymentIntentId = intent._id;
                }
            } catch (intentLookupErr) {
                console.warn(
                    "[payment_intent] lookup failed (non-blocking path)",
                    {
                        event: "payment_intent_lookup_failed",
                        message: intentLookupErr?.message,
                    },
                );
            }
        }

        // ── 5.6. Handshake thtk hash verification ─────────────────────────────────────
        // Enforced only on the paid DirectNG path with both PAYMENT_INTENT_ENABLED and
        // TRANZILA_HANDSHAKE_ENABLED set to "true". All other paths are unconditionally exempt.
        //
        // Exempt: legacy signed path, failed payments, STO notify, handshake disabled, intent gating disabled.
        //
        // Why !hasLegacySignature and not isDirectNgPaidCandidate:
        //   isDirectNgPaidCandidate is a snapshot from before §5.5 and can be stale if §5.5 blocked.
        //   !hasLegacySignature is the canonical, stable discriminator for the DirectNG path.
        //
        // ANTI-DRIFT: notifyThtk must never appear in log values, stored fields, or forwarded objects.
        // ANTI-DRIFT: Only event/reason/userId/plan may be logged — no hashes, no tokens, no payload.
        // ANTI-DRIFT: storedHash format validated (sha256 hex, 64 chars) — rejects placeholder/null/malformed.
        //
        // PaymentIntent consuming→failed behavior (file:line proof, no extra code needed):
        //   §6.5 at line ~1370: intentFinalStatus = isPaid ? "completed" : "failed".
        //   When §5.6 sets isPaid=false: intentFinalStatus="failed", filter={_id:resolvedPaymentIntentId}.
        //   updateOne fires unconditionally — transitions consuming→failed. No stuck intent.
        if (
            isPaid &&
            !hasLegacySignature &&
            intentGatingEnabled &&
            isHandshakeEnabled()
        ) {
            const storedHash = resolvedPaymentIntent?.handshakeThtkHash ?? null;
            const isValidSha256Hex =
                typeof storedHash === "string" &&
                storedHash.length === 64 &&
                /^[a-f0-9]{64}$/i.test(storedHash);

            if (!isValidSha256Hex) {
                // Intent created before Handshake was enabled, hash not written, or hash malformed.
                // Operator must drain in-flight pending intents before enabling the flag.
                isPaid = false;
                status = "failed";
                failReason = "handshake_hash_missing";
                console.warn(
                    "[handshake] notify blocked: handshakeThtkHash invalid or missing on intent",
                    {
                        event: "handshake_verify_blocked",
                        reason: "hash_missing",
                        userId,
                        plan: validPlan,
                    },
                );
            } else if (notifyThtk === null || notifyThtk.trim() === "") {
                isPaid = false;
                status = "failed";
                failReason = "handshake_thtk_missing";
                console.warn(
                    "[handshake] notify blocked: thtk absent in notify payload",
                    {
                        event: "handshake_verify_blocked",
                        reason: "thtk_missing",
                        userId,
                        plan: validPlan,
                    },
                );
            } else {
                const notifyThtkHash = crypto
                    .createHash("sha256")
                    .update(notifyThtk)
                    .digest("hex");
                if (notifyThtkHash !== storedHash) {
                    isPaid = false;
                    status = "failed";
                    failReason = "handshake_thtk_mismatch";
                    console.warn(
                        "[handshake] notify blocked: thtk hash mismatch",
                        {
                            event: "handshake_verify_blocked",
                            reason: "thtk_mismatch",
                            userId,
                            plan: validPlan,
                        },
                    );
                }
            }
        }

        // ── 6. Ledger insert (idempotency via unique providerTxnId) ──
        let txnDoc;
        try {
            txnDoc = await PaymentTransaction.create({
                providerTxnId,
                provider: "tranzila",
                userId,
                plan: validPlan,
                amountAgorot,
                status,
                payloadAllowlisted,
                rawPayloadHash,
                failReason,
                paymentIntentId: resolvedPaymentIntentId,
            });
        } catch (e) {
            if (e.code === 11000) {
                // Duplicate providerTxnId - idempotent replay, no-op.
                return;
            }
            // Infra failure - throw so route returns 500 and provider retries.
            throw e;
        }

        // ── 6.5. PaymentIntent final status sync ──
        // Paid DirectNG gated path: intent is in "consuming" — update to "completed" only
        //   when filter includes status:"consuming" (prevents stale/duplicate writes).
        // Non-blocking path (legacy/failed): update best-effort with no status filter.
        if (resolvedPaymentIntentId !== null) {
            const intentFinalStatus = isPaid ? "completed" : "failed";
            const intentUpdateFilter =
                isPaid && !hasLegacySignature && intentGatingEnabled
                    ? { _id: resolvedPaymentIntentId, status: "consuming" }
                    : { _id: resolvedPaymentIntentId };
            void PaymentIntent.updateOne(intentUpdateFilter, {
                $set: { status: intentFinalStatus },
            }).catch((intentSyncErr) => {
                console.warn("[payment_intent] status sync failed", {
                    event: "payment_intent_status_sync_failed",
                    message: intentSyncErr?.message,
                });
            });
        }

        // ── 7. If not paid → stop (already logged in ledger) ──
        if (!isPaid) {
            incrementMetric("payment.notify.failed", {
                provider: "tranzila",
                flow: "first_payment",
                reason: failReason,
            });
            return;
        }
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

        // ── 10. [Y3D.2] YeshInvoice receipt create — non-blocking, after full fulfillment ──
        // Receipt issuance is a follow-on artifact. Must never block first-payment fulfillment.
        // Outer try/catch swallows all unexpected setup/provider-call errors.
        incrementMetric("payment.notify.success", {
            provider: "tranzila",
            flow: "first_payment",
            plan: validPlan,
        });
        if (isYeshInvoiceEnabled()) {
            try {
                const documentUniqueKey =
                    buildYeshInvoiceDocumentUniqueKey(providerTxnId);
                const customer = buildFirstPaymentCustomer(
                    user,
                    resolvedPaymentIntent,
                );
                const description =
                    validPlan === "monthly"
                        ? "מנוי Cardigo - חודשי"
                        : "מנוי Cardigo - שנתי";

                const receiptResult = await createReceiptYeshInvoice({
                    documentUniqueKey,
                    customer,
                    amountAgorot,
                    description,
                });

                if (!receiptResult.ok) {
                    incrementMetric("receipt.create.failed", {
                        provider: "yeshinvoice",
                        flow: "first_payment",
                        plan: validPlan,
                        reason: "create_failed",
                    });
                    console.warn("[receipt] provider call failed", {
                        event: "receipt_create_provider_failed",
                        providerTxnId,
                        paymentTransactionIdPresent: Boolean(txnDoc?._id),
                        userId,
                        plan: validPlan,
                        ok: false,
                        failReason: String(receiptResult.error ?? "").slice(
                            0,
                            200,
                        ),
                    });
                    await persistFailedReceiptBestEffort({
                        txnDocId: txnDoc._id,
                        userId: user._id,
                        amountAgorot,
                        plan: validPlan,
                        documentUniqueKey,
                        failReason: receiptResult.error,
                        recipientSnapshot: buildRecipientSnapshot(
                            customer,
                            resolvedPaymentIntentId,
                        ),
                        flow: "first_payment",
                    });
                } else {
                    // Inner try/catch: precise E11000 vs infra error discrimination.
                    try {
                        const createdReceipt = await Receipt.create({
                            paymentTransactionId: txnDoc._id,
                            userId: user._id,
                            provider: "yeshinvoice",
                            providerDocId: receiptResult.providerDocId,
                            providerDocNumber: receiptResult.providerDocNumber,
                            documentType: 6,
                            pdfUrl: receiptResult.pdfUrl,
                            documentUrl: receiptResult.documentUrl,
                            amountAgorot,
                            plan: validPlan,
                            status: "created",
                            failReason: null,
                            documentUniqueKey,
                            issuedAt: new Date(),
                            shareStatus: "pending",
                            recipientSnapshot: buildRecipientSnapshot(
                                customer,
                                resolvedPaymentIntentId,
                            ),
                        });
                        // [Y3G.1] Write-back receiptId to PaymentTransaction — best-effort, detached.
                        void linkReceiptToPaymentTransactionBestEffort(
                            txnDoc._id,
                            createdReceipt._id,
                            "first_payment",
                        );
                        // [Y3F.2] Fire-and-forget share — must NOT block ACK path.
                        void (async () => {
                            try {
                                const shareResult =
                                    await shareReceiptYeshInvoice({
                                        providerDocId:
                                            receiptResult.providerDocId,
                                        customerEmail: customer.email,
                                    });
                                const shareUpdate = shareResult.ok
                                    ? {
                                          shareStatus: "sent",
                                          sharedAt: new Date(),
                                          shareFailReason: null,
                                      }
                                    : {
                                          shareStatus: "failed",
                                          shareFailReason: String(
                                              shareResult.error ?? "unknown",
                                          ).slice(0, 200),
                                      };
                                if (!shareResult.ok) {
                                    console.warn("[receipt] share failed", {
                                        event: "receipt_share_failed",
                                        flow: "first_payment",
                                        receiptIdPresent: Boolean(
                                            createdReceipt._id,
                                        ),
                                        paymentTransactionIdPresent: Boolean(
                                            txnDoc?._id,
                                        ),
                                        providerTxnIdPresent:
                                            Boolean(providerTxnId),
                                        userIdPresent: Boolean(userId),
                                        plan: validPlan,
                                        shareFailReason: String(
                                            shareResult.error ?? "unknown",
                                        ).slice(0, 200),
                                    });
                                }
                                try {
                                    await Receipt.updateOne(
                                        { _id: createdReceipt._id },
                                        { $set: shareUpdate },
                                    );
                                } catch (_updateErr) {
                                    console.warn(
                                        "[receipt] share status updateOne failed",
                                        {
                                            event: "receipt_share_update_error",
                                            providerTxnId,
                                            receiptId: String(
                                                createdReceipt._id,
                                            ),
                                            userId,
                                            plan: validPlan,
                                            ok: false,
                                            failReason: String(
                                                _updateErr?.message ?? "",
                                            ).slice(0, 200),
                                        },
                                    );
                                }
                            } catch (_shareErr) {
                                console.warn("[receipt] share exception", {
                                    event: "receipt_share_exception",
                                    flow: "first_payment",
                                    receiptIdPresent: Boolean(
                                        createdReceipt._id,
                                    ),
                                    paymentTransactionIdPresent: Boolean(
                                        txnDoc?._id,
                                    ),
                                    providerTxnIdPresent:
                                        Boolean(providerTxnId),
                                    userIdPresent: Boolean(userId),
                                    plan: validPlan,
                                    errorMessage: String(
                                        _shareErr?.message ?? "unknown",
                                    ).slice(0, 200),
                                });
                                try {
                                    await Receipt.updateOne(
                                        { _id: createdReceipt._id },
                                        {
                                            $set: {
                                                shareStatus: "failed",
                                                shareFailReason: String(
                                                    _shareErr?.message ??
                                                        "unknown",
                                                ).slice(0, 200),
                                            },
                                        },
                                    );
                                } catch {
                                    // swallow — last-resort, must not propagate
                                }
                            }
                        })();
                    } catch (_receiptErr) {
                        if (_receiptErr.code === 11000) {
                            // Idempotent duplicate — paymentTransactionId unique index hit.
                            console.info(
                                "[receipt] duplicate receipt — idempotent replay",
                                {
                                    event: "receipt_create_duplicate",
                                    providerTxnId,
                                    paymentTransactionIdPresent: true,
                                    userId,
                                    plan: validPlan,
                                    duplicate: true,
                                },
                            );
                        } else {
                            console.error(
                                "[receipt] Receipt.create infra error",
                                {
                                    event: "receipt_create_infra_error",
                                    providerTxnId,
                                    paymentTransactionIdPresent: Boolean(
                                        txnDoc?._id,
                                    ),
                                    userId,
                                    plan: validPlan,
                                    ok: false,
                                    failReason: String(
                                        _receiptErr?.message ?? "",
                                    ).slice(0, 200),
                                },
                            );
                        }
                        // Swallow — fulfillment is already durable. Do not rethrow.
                    }
                }
            } catch (_outerReceiptErr) {
                console.error("[receipt] unexpected receipt hook error", {
                    event: "receipt_hook_unexpected_error",
                    providerTxnId,
                    userId,
                    plan: validPlan,
                    failReason: String(_outerReceiptErr?.message ?? "").slice(
                        0,
                        200,
                    ),
                });
                // Swallow — must not alter ACK or fulfillment outcome.
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
            // Strong sanitized signal: charged-but-unfulfilled is otherwise
            // invisible (no ledger row on this path). Presence booleans only —
            // never the raw payload / tokens / card data.
            incrementMetric("payment.notify.failed", {
                provider: "tranzila",
                flow: "sto_recurring",
                reason: "no_provider_txn_id",
            });
            console.warn(
                "[sto-notify] no_provider_txn_id — cannot derive replay key; no ledger written",
                {
                    event: "sto_recurring_no_provider_txn_id",
                    reason: "no_provider_txn_id",
                    hasStoExternalId: Boolean(stoId),
                    hasIndex: Boolean(String(payload?.index ?? "").trim()),
                    hasTempref: Boolean(String(payload?.Tempref ?? "").trim()),
                    hasResponse: Boolean(responseCode),
                    hasSupplier: Boolean(supplier),
                    hasSum: payload?.sum !== undefined && payload?.sum !== null,
                    hasCurrency: Boolean(currency),
                    payloadKeyCount:
                        payload && typeof payload === "object"
                            ? Object.keys(payload).length
                            : 0,
                },
            );
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
            incrementMetric("payment.notify.failed", {
                provider: "tranzila",
                flow: "sto_recurring",
                reason: "supplier_mismatch",
            });
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
            incrementMetric("payment.notify.failed", {
                provider: "tranzila",
                flow: "sto_recurring",
                reason: "currency_mismatch",
            });
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
            incrementMetric("payment.notify.failed", {
                provider: "tranzila",
                flow: "sto_recurring",
                reason: "user_not_found",
            });
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
            incrementMetric("payment.notify.failed", {
                provider: "tranzila",
                flow: "sto_recurring",
                reason: failReason,
            });
            return { ok: false, reason: failReason, providerTxnId };
        }

        // B. STO cancelled — notify arrives after operator/user cancellation
        if (sto.status === "cancelled") {
            const { duplicate } = await recordFailure("sto_cancelled", null);
            if (duplicate) return { ok: true, duplicate: true, providerTxnId };
            incrementMetric("payment.notify.failed", {
                provider: "tranzila",
                flow: "sto_recurring",
                reason: "sto_cancelled",
            });
            return { ok: false, reason: "sto_cancelled", providerTxnId };
        }

        // C. Plan resolution + charged-but-free recovery.
        // Primary source: user.plan (DB SSoT) when monthly/yearly.
        // Recovery source: latest paid PaymentTransaction (ledger is never
        //   downgraded, so it survives billingReconcile wiping user.plan/billing).
        // Anti-drift: NEVER parse payload.pdesc/description; NEVER infer from amount.
        let validPlan =
            user.plan === "monthly" || user.plan === "yearly"
                ? user.plan
                : null;
        let recoveredFromDowngrade = false;

        if (!validPlan) {
            const recoveredPlan = await resolveRecoveryPlanFromLedger(user);
            if (recoveredPlan) {
                validPlan = recoveredPlan;
                recoveredFromDowngrade = true;
            }
        }

        // C.1 Plan could not be safely resolved — do NOT guess from amount/payload.
        if (!validPlan) {
            const { duplicate } = await recordFailure("plan_unresolved", null);
            if (duplicate) return { ok: true, duplicate: true, providerTxnId };
            incrementMetric("payment.notify.failed", {
                provider: "tranzila",
                flow: "sto_recurring",
                reason: "plan_unresolved",
            });
            console.warn(
                "[sto-notify] plan_unresolved — paid notify with no resolvable plan; manual review",
                {
                    event: "sto_recurring_plan_unresolved",
                    providerTxnIdPresent: Boolean(providerTxnId),
                    stoIdPresent: Boolean(stoId),
                    userIdPresent: Boolean(user?._id),
                    cardIdPresent: Boolean(user?.cardId),
                },
            );
            return { ok: false, reason: "plan_unresolved", providerTxnId };
        }

        // C.2 Recovery telemetry — a paid recurring notify arrived after downgrade.
        if (recoveredFromDowngrade) {
            console.warn(
                "[sto-notify] recovered premium after downgrade (charged-but-free prevented)",
                {
                    event: "sto_recurring_recovered_after_downgrade",
                    plan: validPlan,
                    providerTxnIdPresent: Boolean(providerTxnId),
                    stoIdPresent: Boolean(stoId),
                    userIdPresent: Boolean(user?._id),
                    cardIdPresent: Boolean(user?.cardId),
                },
            );
        }

        // D. Amount mismatch — strict equality against resolved validPlan, no tolerance.
        // P0 operator note: price change in PRICES_AGOROT breaks existing STOs;
        // requires cancel+recreate migration for all active STO users (see 5.8e runbook).
        if (
            amountAgorot === null ||
            amountAgorot !== PRICES_AGOROT[validPlan]
        ) {
            const { duplicate } = await recordFailure("amount_mismatch", null);
            if (duplicate) return { ok: true, duplicate: true, providerTxnId };
            incrementMetric("payment.notify.failed", {
                provider: "tranzila",
                flow: "sto_recurring",
                reason: "amount_mismatch",
            });
            return { ok: false, reason: "amount_mismatch", providerTxnId };
        }

        // ── 6. Success path ───────────────────────────────────────────────────────
        // All validations passed. Create paid ledger record FIRST.
        // Invariant: no User/Card mutation before successful PaymentTransaction.create.
        let txnDoc;
        try {
            txnDoc = await PaymentTransaction.create({
                providerTxnId,
                provider: "tranzila",
                status: "paid",
                userId: user._id,
                cardId: user.cardId ?? null,
                plan: validPlan,
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
            validPlan === "monthly"
                ? new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000)
                : new Date(baseDate.getTime() + 365 * 24 * 60 * 60 * 1000);

        // Clear last error on successful renewal.
        sto.lastErrorCode = null;
        sto.lastErrorMessage = null;
        sto.lastErrorAt = null;
        // [5.10a.3.1] Clear renewal failure marker on successful recurring renewal.
        user.renewalFailedAt = null;

        // plan: resolved validPlan (restores Premium on recovery). DB-/ledger-sourced,
        // never payload.pdesc (anti-drift). Assigned AFTER the paid ledger insert above.
        user.plan = validPlan;
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
            //    downgradedAt:null clears the retentionPurge trigger on recovery.
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
                        downgradedAt: null,
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
                        downgradedAt: null,
                        billing: {
                            status: "active",
                            plan: validPlan,
                            paidUntil: paidUntil,
                        },
                    },
                },
            );
        }

        // ── 9. [Y3E.2] YeshInvoice receipt create — non-blocking, after full fulfillment ──
        // Receipt issuance is a follow-on artifact. Must never block recurring fulfillment.
        // Outer try/catch swallows all unexpected setup/provider-call errors.
        incrementMetric("payment.notify.success", {
            provider: "tranzila",
            flow: "sto_recurring",
            plan: user.plan,
        });
        if (isYeshInvoiceEnabled()) {
            try {
                const documentUniqueKey =
                    buildYeshInvoiceDocumentUniqueKey(providerTxnId);
                const customer = buildStoCustomer(user);
                const description =
                    user.plan === "monthly"
                        ? "מנוי Cardigo - חודשי"
                        : "מנוי Cardigo - שנתי";

                const receiptResult = await createReceiptYeshInvoice({
                    documentUniqueKey,
                    customer,
                    amountAgorot,
                    description,
                });

                if (!receiptResult.ok) {
                    incrementMetric("receipt.create.failed", {
                        provider: "yeshinvoice",
                        flow: "sto_recurring",
                        plan: user.plan,
                        reason: "create_failed",
                    });
                    console.warn("[receipt] recurring provider call failed", {
                        event: "receipt_recurring_provider_failed",
                        providerTxnId,
                        paymentTransactionIdPresent: Boolean(txnDoc?._id),
                        userId: String(user._id),
                        plan: user.plan,
                        ok: false,
                        failReason: String(receiptResult.error ?? "").slice(
                            0,
                            200,
                        ),
                    });
                    await persistFailedReceiptBestEffort({
                        txnDocId: txnDoc._id,
                        userId: user._id,
                        amountAgorot,
                        plan: user.plan,
                        documentUniqueKey,
                        failReason: receiptResult.error,
                        recipientSnapshot: buildRecipientSnapshot(
                            customer,
                            null,
                        ),
                        flow: "sto_recurring",
                    });
                } else {
                    // Inner try/catch: precise E11000 vs infra error discrimination.
                    try {
                        const createdReceipt = await Receipt.create({
                            paymentTransactionId: txnDoc._id,
                            userId: user._id,
                            provider: "yeshinvoice",
                            providerDocId: receiptResult.providerDocId,
                            providerDocNumber: receiptResult.providerDocNumber,
                            documentType: 6,
                            pdfUrl: receiptResult.pdfUrl,
                            documentUrl: receiptResult.documentUrl,
                            amountAgorot,
                            plan: user.plan,
                            status: "created",
                            failReason: null,
                            documentUniqueKey,
                            issuedAt: new Date(),
                            shareStatus: "pending",
                            recipientSnapshot: buildRecipientSnapshot(
                                customer,
                                null,
                            ),
                        });
                        // [Y3G.2] Write-back receiptId to PaymentTransaction — best-effort, detached.
                        void linkReceiptToPaymentTransactionBestEffort(
                            txnDoc._id,
                            createdReceipt._id,
                            "sto_recurring",
                        );
                        // [Y3F.2] Fire-and-forget share — must NOT block ACK path.
                        void (async () => {
                            try {
                                const shareResult =
                                    await shareReceiptYeshInvoice({
                                        providerDocId:
                                            receiptResult.providerDocId,
                                        customerEmail: customer.email,
                                    });
                                const shareUpdate = shareResult.ok
                                    ? {
                                          shareStatus: "sent",
                                          sharedAt: new Date(),
                                          shareFailReason: null,
                                      }
                                    : {
                                          shareStatus: "failed",
                                          shareFailReason: String(
                                              shareResult.error ?? "unknown",
                                          ).slice(0, 200),
                                      };
                                if (!shareResult.ok) {
                                    console.warn("[receipt] share failed", {
                                        event: "receipt_share_failed",
                                        flow: "sto_recurring",
                                        receiptIdPresent: Boolean(
                                            createdReceipt._id,
                                        ),
                                        paymentTransactionIdPresent: Boolean(
                                            txnDoc?._id,
                                        ),
                                        providerTxnIdPresent:
                                            Boolean(providerTxnId),
                                        userIdPresent: Boolean(user?._id),
                                        plan: user.plan,
                                        shareFailReason: String(
                                            shareResult.error ?? "unknown",
                                        ).slice(0, 200),
                                    });
                                }
                                try {
                                    await Receipt.updateOne(
                                        { _id: createdReceipt._id },
                                        { $set: shareUpdate },
                                    );
                                } catch (_updateErr) {
                                    console.warn(
                                        "[receipt] recurring share status updateOne failed",
                                        {
                                            event: "receipt_recurring_share_update_error",
                                            providerTxnId,
                                            receiptId: String(
                                                createdReceipt._id,
                                            ),
                                            userId: String(user._id),
                                            plan: user.plan,
                                            ok: false,
                                            failReason: String(
                                                _updateErr?.message ?? "",
                                            ).slice(0, 200),
                                        },
                                    );
                                }
                            } catch (_shareErr) {
                                console.warn("[receipt] share exception", {
                                    event: "receipt_share_exception",
                                    flow: "sto_recurring",
                                    receiptIdPresent: Boolean(
                                        createdReceipt._id,
                                    ),
                                    paymentTransactionIdPresent: Boolean(
                                        txnDoc?._id,
                                    ),
                                    providerTxnIdPresent:
                                        Boolean(providerTxnId),
                                    userIdPresent: Boolean(user?._id),
                                    plan: user.plan,
                                    errorMessage: String(
                                        _shareErr?.message ?? "unknown",
                                    ).slice(0, 200),
                                });
                                try {
                                    await Receipt.updateOne(
                                        { _id: createdReceipt._id },
                                        {
                                            $set: {
                                                shareStatus: "failed",
                                                shareFailReason: String(
                                                    _shareErr?.message ??
                                                        "unknown",
                                                ).slice(0, 200),
                                            },
                                        },
                                    );
                                } catch {
                                    // swallow — last-resort, must not propagate
                                }
                            }
                        })();
                    } catch (_receiptErr) {
                        if (_receiptErr.code === 11000) {
                            // Idempotent duplicate — paymentTransactionId unique index hit.
                            console.info(
                                "[receipt] recurring duplicate — idempotent replay",
                                {
                                    event: "receipt_recurring_duplicate",
                                    providerTxnId,
                                    paymentTransactionIdPresent: true,
                                    userId: String(user._id),
                                    plan: user.plan,
                                    duplicate: true,
                                },
                            );
                        } else {
                            console.error(
                                "[receipt] recurring Receipt.create infra error",
                                {
                                    event: "receipt_recurring_infra_error",
                                    providerTxnId,
                                    paymentTransactionIdPresent: Boolean(
                                        txnDoc?._id,
                                    ),
                                    userId: String(user._id),
                                    plan: user.plan,
                                    ok: false,
                                    failReason: String(
                                        _receiptErr?.message ?? "",
                                    ).slice(0, 200),
                                },
                            );
                        }
                        // Swallow — fulfillment is already durable. Do not rethrow.
                    }
                }
            } catch (_outerReceiptErr) {
                console.error(
                    "[receipt] unexpected recurring receipt hook error",
                    {
                        event: "receipt_recurring_hook_unexpected_error",
                        providerTxnId,
                        userId: String(user._id),
                        plan: user.plan,
                        failReason: String(
                            _outerReceiptErr?.message ?? "",
                        ).slice(0, 200),
                    },
                );
                // Swallow — must not alter return contract.
            }
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
