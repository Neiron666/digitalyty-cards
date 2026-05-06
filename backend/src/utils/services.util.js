import {
    SERVICES_TITLE_MAX,
    SERVICES_ITEMS_MAX,
    SERVICES_ITEM_MAX,
} from "../config/services.js";

function isPlainObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype
    );
}

/**
 * Tolerant services normalizer for writes.
 * - undefined → undefined  (not-touched semantics)
 * - null      → null        (explicit clear)
 * - non-plain-object → null
 * - title: trim → slice to SERVICES_TITLE_MAX → empty → null
 * - items: map/trim/slice-per-item/filter-empty → slice count to SERVICES_ITEMS_MAX
 * - empty title + empty items → null (field clear)
 * Never throws. Never mutates input.
 */
export function normalizeServicesForWrite(input) {
    if (input === undefined) return undefined;
    if (input === null) return null;
    if (!isPlainObject(input)) return null;

    let title = null;
    if (typeof input.title === "string") {
        const t = input.title.trim().slice(0, SERVICES_TITLE_MAX);
        title = t || null;
    }

    const rawItems = Array.isArray(input.items) ? input.items : [];
    const items = rawItems
        .map((it) => {
            if (typeof it !== "string") return null;
            const s = it.trim().slice(0, SERVICES_ITEM_MAX);
            return s || null;
        })
        .filter(Boolean)
        .slice(0, SERVICES_ITEMS_MAX);

    if (title === null && items.length === 0) return null;

    return { title, items };
}
