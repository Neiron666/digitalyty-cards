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

    // Safe fallback (canonical production domain). Prefer setting SITE_URL explicitly.
    // NOTE: do not leak legacy domains on public SEO surfaces when env is misconfigured.
    try {
        // eslint-disable-next-line no-console
        console.warn(
            "[siteUrl] SITE_URL/PUBLIC_ORIGIN/PUBLIC_URL not set; using canonical fallback",
        );
    } catch {
        // ignore
    }
    return "https://cardigo.co.il";
}
