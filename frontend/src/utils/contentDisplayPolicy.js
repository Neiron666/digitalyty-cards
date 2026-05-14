/**
 * Frontend content display policy SSoT.
 *
 * Dependency-free pure ESM data module. No React, no DOM, no side effects.
 * Safe to import from pages, components, or hooks.
 *
 * showPublishedDates — controls visible publication date rendering in Blog/Guides
 *   list cards and detail page headers. Set to true to restore visible dates.
 *
 * SEO metadata (JSON-LD datePublished/dateModified) and SeoHelmet
 * articlePublishedTime/articleModifiedTime are independent of this flag and
 * must remain active at all times. Do not use this flag to gate SEO metadata.
 */
export const CONTENT_DISPLAY_POLICY = Object.freeze({
    showPublishedDates: false,
});
