/**
 * customActions.util.js
 *
 * Normalizer for contact.customActions write path.
 *
 * SCOPE: backend write-path only.
 * - Called only when the incoming patch/data explicitly has own-property contact.customActions.
 * - Does NOT determine premium eligibility — that is handled by the hasAccess() gate before
 *   this function is reached.
 * - Does NOT silently truncate labels or URLs beyond schema limits — Mongoose schema
 *   validators enforce maxlength and will reject overlong values.
 * - Does NOT use null as a stored clear value; [] means "clear all custom actions".
 * - Returns undefined for non-array input; returns [] or normalized array for array input.
 *
 * ALLOWED actionTypes (PRODUCTION_V1):
 *   phone | whatsapp | address | email | facebook | website | url
 * navigation/waze/maps are intentionally NOT included in this phase.
 */

const CONTROL_CHAR_RE = /[\r\n\x00-\x1F\x7F]/g;

const ALLOWED_ACTION_TYPES = new Set([
    "phone",
    "whatsapp",
    "address",
    "email",
    "facebook",
    "website",
    "url",
]);

const CUSTOM_ACTIONS_MAX = 5;

/**
 * Normalizes raw contact.customActions input before Mongoose validation.
 *
 * Semantics:
 *   [] (empty array)        → returns []; clears all stored custom actions
 *   array with valid rows   → returns normalized array
 *   array with invalid only → returns []; caller will write [] to DB
 *   undefined / null        → returns undefined; caller must delete the key,
 *                             so contact.customActions is never touched in DB
 *   object / string / etc.  → returns undefined; same delete-key behaviour
 *
 * Return contract:
 *   Array     — write this value to contact.customActions (may be [])
 *   undefined — do NOT write; caller must delete the key from patch/data
 *               so buildSetUpdateFromPatch never emits $set["contact.customActions"]
 *
 * Per-item normalization:
 *   - label:      coerce to string, strip control chars, trim.
 *                 Items with blank label after normalization are filtered out.
 *                 Does NOT truncate — schema maxlength 80 rejects overlong values.
 *   - actionType: must be a string in ALLOWED_ACTION_TYPES.
 *                 Items with invalid actionType are filtered out.
 *   - target:     coerce to string, strip control chars, trim.
 *                 Items with blank target after normalization are filtered out.
 *                 Does NOT truncate — schema maxlength 2048 rejects overlong values.
 *
 * Max items: CUSTOM_ACTIONS_MAX (5). Items beyond the max are silently dropped;
 * the schema array validator also enforces this at write time.
 *
 * @param {*} input  Raw value from the incoming request body contact.customActions.
 * @returns {Array|undefined}  Normalized array (may be empty), or undefined for non-array input.
 */
export function normalizeCustomActionsForWrite(input) {
    if (!Array.isArray(input)) {
        // null, undefined, object, string, number, boolean — all non-array.
        // Return undefined to signal "do not write; delete the key from patch".
        return undefined;
    }

    const result = [];

    for (const raw of input) {
        if (result.length >= CUSTOM_ACTIONS_MAX) break;

        if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;

        // --- label ---
        const rawLabel =
            raw.label !== undefined && raw.label !== null ? raw.label : "";
        const label = String(rawLabel).replace(CONTROL_CHAR_RE, "").trim();
        if (!label) continue; // filter out blank-label rows

        // --- actionType ---
        const actionType =
            typeof raw.actionType === "string" ? raw.actionType.trim() : "";
        if (!ALLOWED_ACTION_TYPES.has(actionType)) continue; // filter out invalid type rows

        // --- target ---
        const rawTarget =
            raw.target !== undefined && raw.target !== null ? raw.target : "";
        const target = String(rawTarget).replace(CONTROL_CHAR_RE, "").trim();
        if (!target) continue; // filter out blank-target rows

        result.push({ label, actionType, target });
    }

    return result;
}
