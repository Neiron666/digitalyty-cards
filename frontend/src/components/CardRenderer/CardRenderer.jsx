import { getTemplateById, normalizeTemplateId } from "../templates/templates.config";

function isBlankString(value) {
    return typeof value !== "string" || value.trim().length === 0;
}

function isEmptyValue(value) {
    if (value === null || value === undefined) return true;
    if (typeof value === "string") return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === "object") return Object.keys(value).length === 0;
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

function mergeDesignDefaultsPreservingAssets(prevDesign = {}, defaults = {}) {
    const preserved = {
        backgroundImage: prevDesign.backgroundImage,
        coverImage: prevDesign.coverImage,
        avatarImage: prevDesign.avatarImage,
        logo: prevDesign.logo,
    };

    return {
        ...prevDesign,
        ...defaults,
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
            (prevSeedValue !== undefined && isEqual(currentValue, prevSeedValue));

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

function getBackgroundStyle(design) {
    const mode = design?.backgroundMode === "pattern" ? "pattern" : "photo";
    const backgroundImageUrl = design?.backgroundImage;

    const base = {
        backgroundPosition: "center",
        backgroundColor: design?.colors?.background,
    };

    if (!backgroundImageUrl) return base;

    if (mode === "photo") {
        return {
            ...base,
            backgroundImage: `url("${backgroundImageUrl}")`,
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
        };
    }

    // pattern
    return {
        ...base,
        backgroundImage: `url("${backgroundImageUrl}")`,
        backgroundRepeat: "repeat",
        backgroundSize: "auto",
    };
}

export default function CardRenderer(props) {
    const design = props?.card?.design || props?.design || {};

    return (
        <div
            style={{
                ...getBackgroundStyle(design),
            }}
        >
            {/* ...existing code... */}
        </div>
    );
}