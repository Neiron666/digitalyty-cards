/**
 * Pure server-side builder for schema.org FAQPage JSON-LD on public cards.
 *
 * Phase 2A — backend foundation for deterministic initial SEO head. The
 * output is consumed by the public SEO DTO (toCardPublicSeoDTO) and
 * serialized by cardOgHtml.service.js into <script type="application/ld+json">.
 *
 * Contract:
 *   - Input must be already-public, already-narrowed FAQ items shaped as
 *     [{ question, answer }, ...] (the output of narrowFaqItem in
 *     cardPublicProjection.util.js). This module does NOT accept raw DB
 *     documents and does NOT reach into private fields.
 *   - canonicalUrl must be the backend self-public URL string used by the
 *     public SEO DTO. User-editable seo.canonicalUrl is never the source.
 *
 * Purity:
 *   - No DB calls, no network, no env reads, no Date.now, no I/O.
 *   - Input is never mutated.
 */

import { getFaqItemsMax } from "./faq.util.js";

function stripHtml(s) {
    return String(s).replace(/<\/?[^>]+>/g, "");
}

function collapseWs(s) {
    return String(s).replace(/\s+/g, " ").trim();
}

function safeText(value) {
    if (typeof value !== "string") return "";
    return collapseWs(stripHtml(value));
}

function isAbsoluteHttpsUrl(u) {
    if (typeof u !== "string" || !u) return false;
    try {
        const parsed = new URL(u);
        return parsed.protocol === "https:";
    } catch {
        return false;
    }
}

/**
 * Build a schema.org FAQPage object from already-public FAQ items.
 *
 * @param {Array<{question:string, answer:string}>} faqItems
 * @param {string} canonicalUrl - absolute https public URL of the card page.
 * @returns {object|null} FAQPage JSON-LD object, or null if not emittable.
 */
export function buildCardFaqJsonLd(faqItems, canonicalUrl) {
    if (!Array.isArray(faqItems) || faqItems.length === 0) return null;
    if (!isAbsoluteHttpsUrl(canonicalUrl)) return null;

    const max = getFaqItemsMax();
    const mainEntity = [];
    for (const item of faqItems) {
        if (!item || typeof item !== "object" || Array.isArray(item)) continue;
        const q = safeText(item.question);
        const a = safeText(item.answer);
        if (!q || !a) continue;
        mainEntity.push({
            "@type": "Question",
            name: q,
            acceptedAnswer: { "@type": "Answer", text: a },
        });
        if (mainEntity.length >= max) break;
    }
    if (mainEntity.length === 0) return null;

    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "@id": `${canonicalUrl}#faq`,
        url: canonicalUrl,
        inLanguage: "he",
        isPartOf: { "@id": canonicalUrl },
        mainEntity,
    };
}

export function getCardFaqJsonLdId(canonicalUrl) {
    if (!isAbsoluteHttpsUrl(canonicalUrl)) return null;
    return `${canonicalUrl}#faq`;
}
