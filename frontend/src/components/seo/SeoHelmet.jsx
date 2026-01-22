import { Helmet } from "react-helmet-async";

function safeJsonParse(value) {
    if (typeof value !== "string") return null;
    const raw = value.trim();
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        if (parsed === null) return null;
        if (typeof parsed !== "object" && !Array.isArray(parsed)) return null;
        return parsed;
    } catch {
        return null;
    }
}

function normalizeJsonLdItems(jsonLd, jsonLdItems) {
    const items = [];

    const existing = safeJsonParse(jsonLd);
    if (existing) items.push(existing);

    const extra = Array.isArray(jsonLdItems) ? jsonLdItems : [];
    for (const item of extra) {
        if (!item) continue;
        items.push(item);
    }

    return items;
}

export default function SeoHelmet({
    title,
    description,
    canonicalUrl,
    url,
    image,
    jsonLd,
    jsonLdItems,
}) {
    const scripts = normalizeJsonLdItems(jsonLd, jsonLdItems);

    return (
        <Helmet>
            {title ? <title>{title}</title> : null}
            {description ? (
                <meta name="description" content={description} />
            ) : null}

            {canonicalUrl ? <link rel="canonical" href={canonicalUrl} /> : null}

            {/* OpenGraph */}
            <meta property="og:type" content="website" />
            {title ? <meta property="og:title" content={title} /> : null}
            {description ? (
                <meta property="og:description" content={description} />
            ) : null}
            {image ? <meta property="og:image" content={image} /> : null}
            {url ? <meta property="og:url" content={url} /> : null}

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            {title ? <meta name="twitter:title" content={title} /> : null}
            {description ? (
                <meta name="twitter:description" content={description} />
            ) : null}
            {image ? <meta name="twitter:image" content={image} /> : null}

            {scripts.map((obj, index) => (
                <script
                    // eslint-disable-next-line react/no-array-index-key
                    key={`jsonld-${index}`}
                    type="application/ld+json"
                >
                    {JSON.stringify(obj)}
                </script>
            ))}
        </Helmet>
    );
}
