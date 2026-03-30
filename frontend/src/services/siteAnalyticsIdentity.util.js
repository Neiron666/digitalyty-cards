/**
 * Site-analytics identity helpers — site analytics scope only.
 *
 * Two independent truths:
 *   deviceId  — stable per-browser (localStorage), cross-tab, cross-visit.
 *               Answers "best-effort unique visitor".
 *   visitId   — localStorage-backed with 30-min inactivity timeout.
 *               Shared across all tabs of the same browser.
 *               Answers "visit / session".
 *
 * Raw IDs are never sent to the backend in Batch C1; backend will hash them
 * before storage (Batch C3). These helpers produce the raw client-side token.
 *
 * Storage-fallback contract:
 *   If localStorage is blocked, module-scoped in-memory fallbacks are used.
 *   These are stable for the lifetime of the current page JS runtime
 *   (i.e. until page reload), NOT regenerated on every function call.
 *
 * DO NOT import from analytics.client.js (card analytics runtime).
 * DO NOT use sessionStorage-based identity — rejected by architecture audit.
 * DO NOT use cookies in this module.
 */

const STORAGE_KEY_DEVICE = "digitalyty_deviceId";
const STORAGE_KEY_VISIT = "digitalyty_visitId";
const STORAGE_KEY_VISIT_ACTIVITY = "digitalyty_visitActivity";

/** 30-minute inactivity timeout — industry-standard visit boundary. */
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

// ---------------------------------------------------------------------------
// In-memory fallbacks — stable per page runtime when localStorage is blocked.
// Initialised lazily (null until first getOrCreateDeviceId/getOrCreateVisitId
// call) so they are not re-generated across successive calls in the same page.
// ---------------------------------------------------------------------------
let _fallbackDeviceId = null;
let _fallbackVisitId = null;
let _fallbackVisitActivity = 0; // timestamp of last activity (in-memory)

// ---------------------------------------------------------------------------
// UUID generation — crypto.randomUUID when available, RFC4122-ish otherwise.
// ---------------------------------------------------------------------------
function generateUuid() {
    try {
        if (
            typeof crypto !== "undefined" &&
            typeof crypto.randomUUID === "function"
        ) {
            return crypto.randomUUID();
        }
    } catch {
        // fall through
    }

    // RFC4122 v4-ish fallback
    const bytes = new Uint8Array(16);
    try {
        crypto.getRandomValues(bytes);
    } catch {
        for (let i = 0; i < bytes.length; i += 1) {
            bytes[i] = Math.floor(Math.random() * 256);
        }
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// ---------------------------------------------------------------------------
// localStorage helpers — safe wrappers that never throw.
// ---------------------------------------------------------------------------
function lsGet(key) {
    try {
        return typeof window !== "undefined"
            ? (window.localStorage?.getItem(key) ?? null)
            : null;
    } catch {
        return null;
    }
}

function lsSet(key, value) {
    try {
        if (typeof window !== "undefined") {
            window.localStorage?.setItem(key, String(value));
        }
    } catch {
        // ignore — caller falls back to in-memory
    }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the stable per-browser device identifier.
 *
 * Uses the same localStorage key (`digitalyty_deviceId`) as card analytics
 * so the same browser retains the same best-effort identity across site and
 * card contexts without coupling the two client implementations.
 *
 * Falls back to a module-scoped in-memory ID (stable for current page
 * runtime) when localStorage is blocked.
 */
export function getOrCreateDeviceId() {
    // Try localStorage first.
    const stored = lsGet(STORAGE_KEY_DEVICE);
    if (stored) return stored;

    // Generate and persist.
    const id = generateUuid();
    lsSet(STORAGE_KEY_DEVICE, id);

    // Verify write succeeded; if not, use/create module-scoped fallback.
    if (lsGet(STORAGE_KEY_DEVICE) === id) return id;

    // localStorage blocked — stable in-memory fallback.
    if (!_fallbackDeviceId) _fallbackDeviceId = id;
    return _fallbackDeviceId;
}

/**
 * Returns the current visit identifier, rotating after 30 minutes of
 * inactivity (SESSION_TIMEOUT_MS).
 *
 * Semantics:
 *   - Shared across all tabs of the same browser (localStorage, not
 *     sessionStorage) → one visit regardless of how many tabs are open.
 *   - Rotates when the user has been inactive for ≥ 30 minutes.
 *   - Falls back to a module-scoped in-memory ID (stable for the current
 *     page JS runtime) when localStorage is blocked.
 *
 * This function MUST be called before the event payload is constructed so
 * that `digitalyty_visitActivity` is updated atomically with event dispatch.
 */
export function getOrCreateVisitId() {
    const now = Date.now();

    // --- localStorage path ---
    const storedId = lsGet(STORAGE_KEY_VISIT);
    const storedActivity = Number(lsGet(STORAGE_KEY_VISIT_ACTIVITY)) || 0;

    const isTimedOut =
        !storedActivity || now - storedActivity > SESSION_TIMEOUT_MS;

    if (storedId && !isTimedOut) {
        // Active visit: refresh activity timestamp and return existing id.
        lsSet(STORAGE_KEY_VISIT_ACTIVITY, String(now));
        return storedId;
    }

    // New visit (no id yet, or inactivity timeout elapsed): generate fresh id.
    const newId = generateUuid();
    lsSet(STORAGE_KEY_VISIT, newId);
    lsSet(STORAGE_KEY_VISIT_ACTIVITY, String(now));

    // Verify write succeeded.
    if (lsGet(STORAGE_KEY_VISIT) === newId) return newId;

    // --- localStorage blocked: in-memory fallback ---
    // Respect the same timeout semantics using the in-memory activity tracker.
    const fallbackTimedOut =
        !_fallbackVisitActivity ||
        now - _fallbackVisitActivity > SESSION_TIMEOUT_MS;

    if (!_fallbackVisitId || fallbackTimedOut) {
        _fallbackVisitId = newId; // re-use the just-generated uuid
    }
    _fallbackVisitActivity = now;
    return _fallbackVisitId;
}
