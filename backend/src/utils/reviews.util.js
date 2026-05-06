import {
    REVIEWS_MAX,
    REVIEWS_TEXT_MAX,
    REVIEWS_NAME_MAX,
    REVIEWS_ROLE_MAX,
    REVIEWS_RATING_MIN,
    REVIEWS_RATING_MAX,
} from "../config/reviews.js";

export function normalizeReviews(input) {
    const arr = Array.isArray(input) ? input : [];

    const out = [];
    for (const item of arr) {
        if (typeof item === "string") {
            const text = item.trim().slice(0, REVIEWS_TEXT_MAX);
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

        const text = String(rawText || "")
            .trim()
            .slice(0, REVIEWS_TEXT_MAX);
        if (!text) continue;

        const name =
            typeof item.name === "string"
                ? item.name.trim().slice(0, REVIEWS_NAME_MAX)
                : typeof item.author === "string"
                  ? item.author.trim().slice(0, REVIEWS_NAME_MAX)
                  : "";

        const role =
            typeof item.role === "string"
                ? item.role.trim().slice(0, REVIEWS_ROLE_MAX)
                : "";

        const ratingRaw =
            typeof item.rating === "number" || typeof item.rating === "string"
                ? Number(item.rating)
                : null;
        const rating =
            typeof ratingRaw === "number" && Number.isFinite(ratingRaw)
                ? Math.min(
                      REVIEWS_RATING_MAX,
                      Math.max(REVIEWS_RATING_MIN, Math.round(ratingRaw)),
                  )
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
