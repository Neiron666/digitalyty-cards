import { toAbsoluteUrl } from "../services/upload.service";

export function galleryItemToOriginalUrl(item) {
    if (!item) return null;

    // Old shape: direct url string.
    if (typeof item === "string") {
        const url = item.trim();
        return url ? toAbsoluteUrl(url) : null;
    }

    if (typeof item !== "object") return null;

    // Preferred shape: { url }
    if (typeof item.url === "string") {
        const url = item.url.trim();
        return url ? toAbsoluteUrl(url) : null;
    }

    // Fallback shape: { path }
    // Only resolve when the path is unambiguously a public /uploads path.
    if (typeof item.path === "string") {
        const raw = item.path.trim();
        if (!raw) return null;

        // Full URLs are safe.
        if (/^https?:\/\//i.test(raw)) return raw;

        // Accept /uploads/... or uploads/... and normalize to /uploads/...
        if (raw.startsWith("/uploads/")) return toAbsoluteUrl(raw);
        if (raw.startsWith("uploads/")) return toAbsoluteUrl(`/${raw}`);

        // Supabase storage paths like cards/... are not resolvable client-side.
        if (raw.startsWith("cards/")) return null;
    }

    return null;
}

export function galleryItemToThumbUrl(item) {
    if (!item || typeof item !== "object")
        return galleryItemToOriginalUrl(item);

    if (typeof item.thumbUrl === "string") {
        const url = item.thumbUrl.trim();
        return url ? toAbsoluteUrl(url) : galleryItemToOriginalUrl(item);
    }

    if (typeof item.thumbPath === "string") {
        const raw = item.thumbPath.trim();
        if (!raw) return galleryItemToOriginalUrl(item);

        // Full URLs are safe.
        if (/^https?:\/\//i.test(raw)) return raw;

        // Accept /uploads/... or uploads/... and normalize to /uploads/...
        if (raw.startsWith("/uploads/")) return toAbsoluteUrl(raw);
        if (raw.startsWith("uploads/")) return toAbsoluteUrl(`/${raw}`);

        // Supabase storage paths like cards/... are not resolvable client-side.
        if (raw.startsWith("cards/")) return null;
    }

    return galleryItemToOriginalUrl(item);
}

export function galleryItemToUrl(item) {
    return galleryItemToOriginalUrl(item);
}
