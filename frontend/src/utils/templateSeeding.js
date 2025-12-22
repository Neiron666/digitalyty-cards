import {
    getTemplateById,
    normalizeTemplateId,
} from "../templates/templates.config";

function isPlainObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        Object.prototype.toString.call(value) === "[object Object]"
    );
}

function isBlankString(value) {
    return typeof value !== "string" || value.trim().length === 0;
}

function isEmptyValue(value) {
    if (value === null || value === undefined) return true;
    if (typeof value === "string") return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === "object") return Object.keys(value).length === 0; // rollback
    return false;
}

function isEqual(a, b) {
    if (a === b) return true;
    try {
        return JSON.stringify(a) === JSON.stringify(b);
    } catch {
        return false;
    }
}

function getByPath(obj, path) {
    if (!obj || !path) return undefined;
    const parts = String(path).split(".");
    let cur = obj;
    for (const part of parts) {
        if (cur === null || cur === undefined) return undefined;
        cur = cur[part];
    }
    return cur;
}

function setByPath(obj, path, value) {
    const parts = String(path).split(".");
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i += 1) {
        const part = parts[i];
        if (!cur[part] || typeof cur[part] !== "object") {
            cur[part] = {};
        }
        cur = cur[part];
    }
    cur[parts[parts.length - 1]] = value;
}

/**
 * Merge defaults into an existing object WITHOUT overwriting non-empty existing values.
 * - Objects: deep-merge
 * - Arrays/primitives: only use default when existing is empty
 */
function mergeDefaultsPreservingUser(prev = {}, defaults = {}) {
    if (!isPlainObject(prev) || !isPlainObject(defaults)) {
        return isEmptyValue(prev) ? defaults : prev;
    }

    const out = { ...prev };
    for (const key of Object.keys(defaults)) {
        const prevVal = prev[key];
        const defVal = defaults[key];

        if (isPlainObject(defVal) && isPlainObject(prevVal)) {
            out[key] = mergeDefaultsPreservingUser(prevVal, defVal);
            continue;
        }

        // Only fill if user value is empty/missing
        out[key] = isEmptyValue(prevVal) ? defVal : prevVal;
    }
    return out;
}

function mergeDesignDefaultsPreservingAssets(prevDesign = {}, defaults = {}) {
    const preserved = {
        backgroundImage: prevDesign.backgroundImage,
        coverImage: prevDesign.coverImage,
        avatarImage: prevDesign.avatarImage,
        logo: prevDesign.logo,
    };

    // Apply template defaults ONLY where user doesn't already have a value
    const merged = mergeDefaultsPreservingUser(prevDesign, defaults);

    return {
        ...merged,
        ...preserved,
    };
}

export function computeNextCardForTemplateSwitch(card, rawTemplateId) {
    const templateId = normalizeTemplateId(rawTemplateId);
    const template = getTemplateById(templateId);

    const prevFlags = card?.flags || {};
    const prevSeededMap = prevFlags?.seededMap || {};
    const isTemplateSeeded = prevFlags?.isTemplateSeeded === true;

    const next = {
        ...card,
        flags: {
            isTemplateSeeded: Boolean(isTemplateSeeded),
            seededMap: { ...prevSeededMap },
        },
        design: {
            ...(card?.design || {}),
        },
    };

    const nextDesign = mergeDesignDefaultsPreservingAssets(
        next.design,
        template?.designDefaults || {}
    );
    nextDesign.templateId = template?.id || templateId;
    next.design = nextDesign;

    // If user already started editing (seeded flag is false), only switch visuals.
    if (!isTemplateSeeded) {
        next.flags.isTemplateSeeded = false;
        next.flags.seededMap = {};
        return next;
    }

    const seededFields = Array.isArray(template?.seededFields)
        ? template.seededFields
        : [];
    const sampleData = template?.sampleData || {};

    const newSeededMap = {};

    for (const path of seededFields) {
        const currentValue = getByPath(next, path);
        const prevSeedValue = prevSeededMap[path];

        const eligible =
            isEmptyValue(currentValue) ||
            (prevSeedValue !== undefined &&
                isEqual(currentValue, prevSeedValue));

        if (!eligible) continue;

        const seededValue = getByPath(sampleData, path);
        if (seededValue === undefined) continue;

        // Avoid seeding blank strings (helps keep state clean)
        if (typeof seededValue === "string" && isBlankString(seededValue)) {
            continue;
        }

        setByPath(next, path, seededValue);
        newSeededMap[path] = seededValue;
    }

    next.flags.isTemplateSeeded = Object.keys(newSeededMap).length > 0;
    next.flags.seededMap = newSeededMap;

    return next;
}
