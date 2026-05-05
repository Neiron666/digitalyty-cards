import * as Sentry from "@sentry/node";

// ---------------------------------------------------------------------------
// Sentry Application Metrics helper — Batch 1 (payments + receipts).
//
// Hard allowlists for metric names and tag key/values.
// No-op when Sentry is not configured or metrics API is unavailable.
// Never throws. Wraps every Sentry call in try/catch.
// No console output from this module.
//
// Forbidden tag values (never pass to Sentry):
//   userId, email, slug, providerTxnId, stoId, TranzilaTK,
//   raw payload, rawPayloadHash, documentUniqueKey, providerDocId,
//   document number, paymentTransactionId, raw error message,
//   amountAgorot, raw provider response fields.
// ---------------------------------------------------------------------------

// ── Allowed metric names ──────────────────────────────────────────────────

const ALLOWED_METRIC_NAMES = new Set([
    "payment.notify.success",
    "payment.notify.failed",
    "receipt.create.failed",
    "receipt.retry.candidate_count",
    "receipt.retry.success",
    "receipt.retry.failed",
]);

// ── Allowed tag values per key ────────────────────────────────────────────

const ALLOWED_TAG_VALUES = {
    provider: new Set(["tranzila", "yeshinvoice"]),
    flow: new Set(["first_payment", "sto_recurring", "retry_job"]),
    plan: new Set(["monthly", "yearly", "unknown"]),
    reason: new Set([
        "invalid_token",
        "amount_mismatch",
        "duplicate",
        "provider_error",
        "signature_error",
        "intent_error",
        "handshake_error",
        "currency_mismatch",
        "supplier_mismatch",
        "user_not_found",
        "create_failed",
        "share_failed",
        "unknown",
    ]),
};

// ── Reason sanitizer ──────────────────────────────────────────────────────
// Accepts any input. Null/undefined/non-string -> "unknown".
// Ordered checks: startsWith first, then contains, then fallback.

function sanitizeReason(raw) {
    if (raw === null || raw === undefined || typeof raw !== "string") {
        return "unknown";
    }
    const v = raw;
    if (v.startsWith("response_")) return "provider_error";
    if (v.includes("token")) return "invalid_token";
    if (v.includes("amount")) return "amount_mismatch";
    if (v.includes("duplicate")) return "duplicate";
    if (v.includes("signature")) return "signature_error";
    if (v.includes("intent")) return "intent_error";
    if (v.includes("handshake")) return "handshake_error";
    if (v.includes("currency")) return "currency_mismatch";
    if (v.includes("supplier")) return "supplier_mismatch";
    if (v.includes("user_not_found") || v.includes("invalid_userId"))
        return "user_not_found";
    return "unknown";
}

// ── Tag sanitizer ─────────────────────────────────────────────────────────
// For each incoming tag key:
//   - Unknown key: drop it (not included in output).
//   - provider/flow with invalid value: drop that tag.
//   - plan with invalid/missing value: use "unknown".
//   - reason: run through sanitizeReason, then validate against allowlist.

function sanitizeTags(rawTags) {
    if (!rawTags || typeof rawTags !== "object" || Array.isArray(rawTags)) {
        return {};
    }

    const out = {};

    for (const key of Object.keys(rawTags)) {
        const allowedValues = ALLOWED_TAG_VALUES[key];
        if (!allowedValues) {
            // Unknown tag key — drop.
            continue;
        }

        let value;
        if (key === "reason") {
            value = sanitizeReason(rawTags[key]);
        } else if (key === "plan") {
            const v = rawTags[key];
            value =
                typeof v === "string" && allowedValues.has(v) ? v : "unknown";
        } else {
            // provider, flow: only pass if value is in allowlist; otherwise drop the tag entirely.
            const v = rawTags[key];
            if (typeof v === "string" && allowedValues.has(v)) {
                value = v;
            } else {
                continue; // drop invalid provider/flow
            }
        }

        // Final allowlist check (belt-and-suspenders).
        if (allowedValues.has(value)) {
            out[key] = value;
        }
    }

    return out;
}

// ── No-op guard ───────────────────────────────────────────────────────────

function isSentryActive() {
    return typeof Sentry.getClient === "function" && !!Sentry.getClient();
}

// ── Exports ───────────────────────────────────────────────────────────────

/**
 * Increment a counter metric by 1.
 * No-op if Sentry is not configured, metrics API unavailable, name not in allowlist.
 * Never throws.
 *
 * @param {string} name — must be in ALLOWED_METRIC_NAMES
 * @param {object} tags — sanitized against allowlist before sending
 */
export function incrementMetric(name, tags = {}) {
    if (!ALLOWED_METRIC_NAMES.has(name)) return;
    if (!isSentryActive()) return;
    if (
        typeof Sentry.metrics?.increment !== "function"
    ) return;

    const safeTags = sanitizeTags(tags);
    try {
        Sentry.metrics.increment(name, 1, { tags: safeTags });
    } catch {
        // Swallow — metric failure must never affect callers.
    }
}

/**
 * Record a gauge metric value.
 * No-op if Sentry is not configured, metrics API unavailable, name not in allowlist.
 * Never throws.
 *
 * @param {string} name  — must be in ALLOWED_METRIC_NAMES
 * @param {number} value — numeric gauge value
 * @param {object} tags  — sanitized against allowlist before sending
 */
export function gaugeMetric(name, value, tags = {}) {
    if (!ALLOWED_METRIC_NAMES.has(name)) return;
    if (!isSentryActive()) return;
    if (
        typeof Sentry.metrics?.gauge !== "function"
    ) return;

    const safeTags = sanitizeTags(tags);
    try {
        Sentry.metrics.gauge(name, value, { tags: safeTags });
    } catch {
        // Swallow — metric failure must never affect callers.
    }
}
