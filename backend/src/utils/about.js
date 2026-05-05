import { ABOUT_PARAGRAPHS_MAX, ABOUT_PARAGRAPH_ITEM_MAX } from "../config/about.js";

export function normalizeAboutParagraphs(
    input,
    { max = ABOUT_PARAGRAPHS_MAX } = {},
) {
    const limit =
        Number.isFinite(max) && max > 0
            ? Math.floor(max)
            : ABOUT_PARAGRAPHS_MAX;

    let raw = [];

    if (Array.isArray(input)) {
        raw = input;
    } else if (typeof input === "string") {
        // Split by blank lines into paragraphs.
        raw = input.split(/\n\s*\n/);
    } else if (input === null || input === undefined) {
        raw = [];
    } else {
        // Unknown types are ignored (tolerant writer).
        raw = [];
    }

    const paragraphs = raw
        .map((v) => (typeof v === "string" ? v.trim() : ""))
        .filter(Boolean)
        .map((p) => (p.length > ABOUT_PARAGRAPH_ITEM_MAX ? p.slice(0, ABOUT_PARAGRAPH_ITEM_MAX) : p))
        .slice(0, limit);

    return paragraphs;
}
