const ARRAY_CAPS = {
    gallery: 6,
    services: 8,
    reviews: 4,
};

function isLocalTemplateAssetUrl(value) {
    return typeof value === "string" && value.startsWith("/templates/");
}

function isAssetLikeFieldPath(fieldPath) {
    // Asset-like fields are restricted to local /public/templates/... assets only.
    // We intentionally do NOT restrict normal user/content links (cta.value, socials.url, website, etc.).
    if (!fieldPath) return false;
    if (fieldPath === "gallery") return true;

    // Future-proofing: if templates later seed these fields, keep them local-only.
    return /(avatar|cover|background).*image/i.test(fieldPath);
}

function isEmpty(value) {
    if (value === undefined || value === null) return true;
    if (typeof value === "string") return value.trim() === "";
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === "object") return Object.keys(value).length === 0;
    return false;
}

function get(obj, path) {
    return path
        .split(".")
        .reduce((acc, key) => (acc ? acc[key] : undefined), obj);
}

function set(obj, path, value) {
    const keys = path.split(".");
    let cursor = obj;
    for (let i = 0; i < keys.length - 1; i += 1) {
        const key = keys[i];
        if (typeof cursor[key] !== "object" || cursor[key] === null) {
            cursor[key] = {};
        }
        cursor = cursor[key];
    }
    cursor[keys[keys.length - 1]] = value;
}

function normalizeAssets(value) {
    if (typeof value === "string")
        return isLocalTemplateAssetUrl(value) ? value : undefined;
    if (Array.isArray(value)) {
        const onlyStrings = value.every((item) => typeof item === "string");
        if (!onlyStrings) return undefined;
        return value
            .filter((item) => isLocalTemplateAssetUrl(item))
            .slice(0, ARRAY_CAPS.gallery);
    }
    return undefined;
}

function normalizeGalleryItems(value) {
    if (!Array.isArray(value)) return undefined;

    const items = value
        .filter((item) => item && typeof item === "object")
        .map((item) => {
            const url = item.url;
            if (!isLocalTemplateAssetUrl(url)) return null;
            return {
                ...item,
                url,
            };
        })
        .filter(Boolean)
        .slice(0, ARRAY_CAPS.gallery);

    return items;
}

export function seedTemplateContent(card = {}, template) {
    if (!template) return card;

    const next = JSON.parse(JSON.stringify(card || {}));

    for (const path of template.seededFields || []) {
        const sampleValue = get(template.sampleData || {}, path);
        if (sampleValue === undefined) continue;

        const currentValue = get(next, path);
        if (!isEmpty(currentValue)) continue;

        const isAssetLike = isAssetLikeFieldPath(path);

        // Special-case: gallery is an array of objects like { title, url }.
        if (path === "gallery") {
            if (Array.isArray(sampleValue)) {
                const isStringArray = sampleValue.every(
                    (item) => typeof item === "string"
                );
                if (isStringArray) {
                    const assets = normalizeAssets(sampleValue);
                    if (assets) set(next, path, assets);
                    continue;
                }
            }

            const normalizedGallery = normalizeGalleryItems(sampleValue);
            if (normalizedGallery) set(next, path, normalizedGallery);
            continue;
        }

        const cap = ARRAY_CAPS[path];
        if (Array.isArray(sampleValue)) {
            const capped = cap ? sampleValue.slice(0, cap) : sampleValue;

            // Asset-only rule applies ONLY to arrays of strings (string[]) for asset-like fields.
            // Arrays of objects (e.g., socials) must be seeded as-is.
            const containsObject = capped.some(
                (v) => v !== null && typeof v === "object"
            );
            if (containsObject || !isAssetLike) {
                set(next, path, capped);
                continue;
            }

            const assets = normalizeAssets(capped);
            if (assets) set(next, path, assets);
            continue;
        }

        if (typeof sampleValue === "string" && isAssetLike) {
            const asset = normalizeAssets(sampleValue);
            if (asset) set(next, path, asset);
            continue;
        }

        set(next, path, sampleValue);
    }

    return next;
}
