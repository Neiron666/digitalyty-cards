// Guide subsystem - SSoT caps & limits.
// All length checks reference these constants (model validators + controller normalization).

export const GUIDE_TITLE_MAX = 200;
export const GUIDE_EXCERPT_MAX = 500;
export const GUIDE_SECTION_HEADING_MAX = 200;
export const GUIDE_SECTION_BODY_MAX = 5000;
export const GUIDE_SECTIONS_MAX = 20;
export const GUIDE_SEO_TITLE_MAX = 120;
export const GUIDE_SEO_DESC_MAX = 300;
export const GUIDE_HERO_ALT_MAX = 200;
export const GUIDE_SECTION_IMAGE_ALT_MAX = 200;
export const GUIDE_SLUG_MAX = 100;

/** Max number of historical slug aliases preserved per guide post. */
export const GUIDE_PREVIOUS_SLUGS_MAX = 10;

// Author (optional)
export const GUIDE_AUTHOR_NAME_MAX = 100;
export const GUIDE_AUTHOR_BIO_MAX = 300;
export const GUIDE_AUTHOR_IMAGE_ALT_MAX = 200;

/** Slugs that must never be used as guide post slugs. */
export const GUIDE_RESERVED_SLUGS = new Set([
    "admin",
    "guides",
    "new",
    "edit",
    "draft",
    "sitemap",
    "feed",
    "rss",
    "api",
    "login",
    "register",
    "dashboard",
    "preview",
    "search",
    "tag",
    "tags",
    "category",
    "categories",
    "archive",
    "page",
]);

/** Server-side constant reason for guide admin audit actions. */
export const GUIDE_ADMIN_AUDIT_REASON = "guide-admin";
