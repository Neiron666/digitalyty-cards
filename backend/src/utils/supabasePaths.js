export function collectSupabasePathsFromCard(card) {
    const paths = new Set();

    // Gallery: backward compatible (string URLs won't have paths)
    const gallery = card?.gallery;
    if (Array.isArray(gallery)) {
        for (const item of gallery) {
            if (
                item &&
                typeof item === "object" &&
                typeof item.path === "string"
            ) {
                const p = item.path.trim();
                if (p) paths.add(p);
            }
        }
    }

    // Upload records (design assets etc)
    const uploads = card?.uploads;
    if (Array.isArray(uploads)) {
        for (const item of uploads) {
            if (
                item &&
                typeof item === "object" &&
                typeof item.path === "string"
            ) {
                const p = item.path.trim();
                if (p) paths.add(p);
            }
        }
    }

    // Optional design path fields
    const design = card?.design || {};
    for (const key of [
        "backgroundImagePath",
        "coverImagePath",
        "avatarImagePath",
        "logoPath",
    ]) {
        const val = design?.[key];
        if (typeof val === "string" && val.trim()) paths.add(val.trim());
    }

    return Array.from(paths);
}

export function normalizeSupabasePaths(rawPaths) {
    const out = new Set();

    if (!Array.isArray(rawPaths)) return [];

    for (const p of rawPaths) {
        if (typeof p !== "string") continue;
        const trimmed = p.trim();
        if (!trimmed) continue;

        // Safety: only allow deleting objects uploaded by this app.
        if (!trimmed.startsWith("cards/")) continue;

        out.add(trimmed);
    }

    return Array.from(out);
}
