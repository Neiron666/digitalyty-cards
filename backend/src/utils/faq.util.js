const FAQ_ITEMS_MAX = 5;

function toTrimmedString(value, { allowNull = true } = {}) {
    if (value === null || value === undefined) return allowNull ? null : "";
    if (typeof value !== "string") return allowNull ? null : "";
    const s = value.trim();
    if (!s) return allowNull ? null : "";
    return s;
}

function toTrimmedText(value) {
    if (value === null || value === undefined) return "";
    if (typeof value !== "string") return "";
    return value.trim();
}

/**
 * Tolerant FAQ normalizer for writes.
 * - Preserves shape: { title, lead, items: [{q,a}] }
 * - Trims strings.
 * - Keeps only complete pairs where BOTH q and a are non-empty after trim.
 * - Enforces max items (slice).
 * - Never throws (caller decides validation strategy).
 */
export function normalizeFaqForWrite(input) {
    if (input === null) return null;
    if (!input || typeof input !== "object" || Array.isArray(input))
        return null;

    const title = toTrimmedString(input.title, { allowNull: true });
    const lead = toTrimmedString(input.lead, { allowNull: true });

    const rawItems = Array.isArray(input.items) ? input.items : [];
    const items = rawItems
        .map((it) => {
            if (!it || typeof it !== "object" || Array.isArray(it)) return null;
            const q = toTrimmedText(it.q);
            const a = toTrimmedText(it.a);
            if (!q || !a) return null;
            return { q, a };
        })
        .filter(Boolean)
        .slice(0, FAQ_ITEMS_MAX);

    if (!title && !lead && items.length === 0) return null;

    return {
        title,
        lead,
        ...(items.length ? { items } : {}),
    };
}

export function getFaqItemsMax() {
    return FAQ_ITEMS_MAX;
}
