/**
 * Cards showcase — shared item readiness predicate.
 *
 * SSoT for all activation and public-readiness checks.
 * Used by both admin (activation gate, PATCH/upload invariants) and public
 * (defense-in-depth filter) controllers.
 *
 * No circular imports: depends only on cardsShowcaseUrlPolicy.util.js.
 */

import { validateShowcaseCtaUrl } from "./cardsShowcaseUrlPolicy.util.js";

/**
 * Check whether a showcase item meets all requirements to be active / visible publicly.
 *
 * Accepts either a Mongoose document or a plain object.
 *
 * @param {{ imageStoragePath?: string, imageAlt?: string, title?: string, description?: string, ctaUrl?: string }} item
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function checkShowcaseItemReadiness(item) {
    const obj = typeof item.toObject === "function" ? item.toObject() : item;
    if (!obj.imageStoragePath) {
        return { ok: false, reason: "Image is required to activate" };
    }
    if (!obj.imageAlt) {
        return { ok: false, reason: "imageAlt is required to activate" };
    }
    if (!obj.title) {
        return { ok: false, reason: "title is required to activate" };
    }
    if (!obj.description) {
        return { ok: false, reason: "description is required to activate" };
    }
    if (!obj.ctaUrl) {
        return { ok: false, reason: "ctaUrl is required to activate" };
    }
    const urlResult = validateShowcaseCtaUrl(obj.ctaUrl);
    if (!urlResult.ok) {
        return {
            ok: false,
            reason: `ctaUrl is invalid (${urlResult.reason}) — use format /card/{slug} or /c/{orgSlug}/{slug}`,
        };
    }
    return { ok: true };
}
