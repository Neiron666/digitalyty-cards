import api from "./api";

export function toAbsoluteUrl(url) {
    if (!url) return url;
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith("/uploads/")) {
        let base = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");
        if (
            typeof window !== "undefined" &&
            window.location?.protocol === "https:" &&
            base.startsWith("http://")
        ) {
            base = base.replace(/^http:\/\//i, "https://");
        }
        return `${base}${url}`;
    }
    return url;
}

export async function uploadGalleryImage(cardId, file) {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("cardId", cardId);

    const res = await api.post("/uploads/image", formData);

    return { ...res.data, url: toAbsoluteUrl(res.data?.url) };
}

export async function uploadDesignAsset(cardId, file, kind) {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("cardId", cardId);
    if (kind) formData.append("kind", kind);

    const res = await api.post("/uploads/asset", formData);
    return { ...res.data, url: toAbsoluteUrl(res.data?.url) };
}
