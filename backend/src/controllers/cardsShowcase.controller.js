/**
 * Cards showcase — public read controller.
 *
 * Single endpoint: GET /api/cards-showcase/active
 * Returns active items only, in public DTO format.
 * No auth required. Hard cap via SHOWCASE_MAX_ACTIVE_ITEMS.
 */

import CardShowcaseExample from "../models/CardShowcaseExample.model.js";
import { getPublicUrlForPath } from "../services/supabaseStorage.js";
import {
    SHOWCASE_MAX_ACTIVE_ITEMS,
    SHOWCASE_DEFAULT_CTA_LABEL,
} from "../config/cardsShowcase.js";
import { checkShowcaseItemReadiness } from "../utils/cardsShowcaseReadiness.util.js";

function pickPublicDTO(item) {
    return {
        id: String(item._id),
        imageUrl:
            getPublicUrlForPath({ path: item.imageStoragePath || "" }) || null,
        imageAlt: item.imageAlt || "",
        title: item.title || "",
        description: item.description || "",
        ctaLabel: item.ctaLabel || SHOWCASE_DEFAULT_CTA_LABEL,
        ctaUrl: item.ctaUrl || "",
        ctaTargetBlank: true,
        sortOrder: item.sortOrder ?? 0,
    };
}

export async function listActiveShowcaseItems(req, res) {
    try {
        const items = await CardShowcaseExample.find({ isActive: true })
            .sort({ sortOrder: 1, createdAt: 1 })
            .limit(SHOWCASE_MAX_ACTIVE_ITEMS)
            .lean();

        // Defense-in-depth: full readiness check before emitting publicly.
        // Skips any active item with corrupted or manually-edited fields
        // (empty title/description/imageAlt/imageStoragePath or invalid ctaUrl).
        // total reflects only returned safe items.
        const safeItems = items
            .filter((item) => checkShowcaseItemReadiness(item).ok)
            .map(pickPublicDTO);

        return res.json({
            page: 1,
            total: safeItems.length,
            items: safeItems,
        });
    } catch (err) {
        console.error("[cardsShowcase] listActiveShowcaseItems error:", err);
        return res.status(500).json({ message: "Server error" });
    }
}

// Public read: homepage-selected showcase items (curated subset).
// Eligibility invariant: isActive AND showOnHomepage AND readiness-valid.
// No cap by design — every eligible selected item is returned.
export async function listHomepageShowcaseItems(req, res) {
    try {
        const items = await CardShowcaseExample.find({
            isActive: true,
            showOnHomepage: true,
        })
            .sort({ sortOrder: 1, createdAt: 1 })
            .lean();

        // Defense-in-depth: same readiness gate as /active. showOnHomepage
        // must never resurrect an item that fails the public readiness contract.
        const safeItems = items
            .filter((item) => checkShowcaseItemReadiness(item).ok)
            .map(pickPublicDTO);

        return res.json({
            page: 1,
            total: safeItems.length,
            items: safeItems,
        });
    } catch (err) {
        console.error("[cardsShowcase] listHomepageShowcaseItems error:", err);
        return res.status(500).json({ message: "Server error" });
    }
}
