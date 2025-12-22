export function galleryItemToUrl(item) {
    if (!item) return null;
    if (typeof item === "string") return item;
    if (typeof item === "object" && typeof item.url === "string") {
        const url = item.url.trim();
        return url || null;
    }
    return null;
}
