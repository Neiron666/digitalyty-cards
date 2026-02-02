function stripTrailingSlash(url) {
    return String(url || "")
        .trim()
        .replace(/\/+$/, "");
}

export function getSiteUrl() {
    const raw =
        process.env.SITE_URL ||
        process.env.PUBLIC_ORIGIN ||
        process.env.PUBLIC_URL ||
        "";

    const normalized = stripTrailingSlash(raw);
    if (normalized) return normalized;

    // Safe fallback (production default domain). Prefer setting SITE_URL explicitly.
    return "https://digitalyty.co.il";
}
