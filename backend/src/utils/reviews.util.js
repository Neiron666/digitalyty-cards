import { REVIEWS_MAX } from "../config/reviews.js";

export function normalizeReviews(input) {
    const arr = Array.isArray(input) ? input : [];

    const out = [];
    for (const item of arr) {
        if (typeof item === "string") {
            const text = item.trim();
            if (text) out.push({ text });
            continue;
        }

        if (!item || typeof item !== "object") continue;

        const rawText =
            typeof item.text === "string"
                ? item.text
                : typeof item.value === "string"
                  ? item.value
                  : "";

        const text = String(rawText || "").trim();
        if (!text) continue;

        const name =
            typeof item.name === "string"
                ? item.name.trim()
                : typeof item.author === "string"
                  ? item.author.trim()
                  : "";

        const role = typeof item.role === "string" ? item.role.trim() : "";

        const ratingRaw =
            typeof item.rating === "number" || typeof item.rating === "string"
                ? Number(item.rating)
                : null;
        const rating =
            typeof ratingRaw === "number" && Number.isFinite(ratingRaw)
                ? ratingRaw
                : null;

        const date = item.date ? new Date(item.date) : null;
        const dateIso =
            date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;

        const normalized = {
            text,
            ...(name ? { name } : null),
            ...(role ? { role } : null),
            ...(rating !== null ? { rating } : null),
            ...(dateIso ? { date: dateIso } : null),
        };

        out.push(normalized);
    }

    return out.slice(0, REVIEWS_MAX);
}
