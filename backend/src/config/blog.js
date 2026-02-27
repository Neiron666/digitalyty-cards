// Blog subsystem — SSoT caps & limits.
// All length checks reference these constants (model validators + controller normalization).

export const BLOG_TITLE_MAX = 200;
export const BLOG_EXCERPT_MAX = 500;
export const BLOG_SECTION_HEADING_MAX = 200;
export const BLOG_SECTION_BODY_MAX = 5000;
export const BLOG_SECTIONS_MAX = 20;
export const BLOG_SEO_TITLE_MAX = 120;
export const BLOG_SEO_DESC_MAX = 300;
export const BLOG_HERO_ALT_MAX = 200;
export const BLOG_SLUG_MAX = 100;

// Author (optional)
export const BLOG_AUTHOR_NAME_MAX = 100;
export const BLOG_AUTHOR_BIO_MAX = 300;
export const BLOG_AUTHOR_IMAGE_ALT_MAX = 200;

/** Slugs that must never be used as blog post slugs. */
export const BLOG_RESERVED_SLUGS = new Set([
    "admin",
    "blog",
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

/** Server-side constant reason for blog admin audit actions. */
export const BLOG_ADMIN_AUDIT_REASON = "blog-admin";
