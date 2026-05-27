/**
 * cardOgHtml.service.js — Phase 2B2 Option A backend deterministic HTML service.
 *
 * Pure module that turns the Phase 2B1 public projections
 * (toCardPublicSeoDTO + toCardPublicRenderDTO from
 * backend/src/utils/cardPublicProjection.util.js) into a deterministic,
 * escape-safe, style-free HTML document for crawlers/social/og consumers.
 *
 * Route wiring into /og/card and /og/c is intentionally OUT OF SCOPE in this
 * phase; this file must have zero production importers until Phase 2B3.
 *
 * Hard purity invariants enforced by code review + sanity scan:
 *   - no DB, no env, no network, no filesystem
 *   - no Express req/res, no React, no Vite, no browser APIs
 *   - no Date / Date.now / Math.random / process / eval / Function / dynamic import
 *   - no input mutation; consumers may pass Object.freeze'd projections
 */

/* ── constants ─────────────────────────────────────────────────── */

const ALLOWED_HREF_SCHEMES = Object.freeze(["https:", "tel:", "mailto:"]);
const LANG_RE = /^[a-z]{2}(-[A-Z]{2})?$/;
const DEFAULT_LANG = "he";
const DEFAULT_DIR = "rtl";
const DEFAULT_ROBOTS = "index, follow";
const FALLBACK_H1 = "כרטיס ביקור דיגיטלי";

const DAY_ORDER = Object.freeze([
    "sun",
    "mon",
    "tue",
    "wed",
    "thu",
    "fri",
    "sat",
]);
const DAY_HEBREW = Object.freeze({
    sun: "ראשון",
    mon: "שני",
    tue: "שלישי",
    wed: "רביעי",
    thu: "חמישי",
    fri: "שישי",
    sat: "שבת",
});

const SOCIAL_KEY_ORDER = Object.freeze([
    "instagram",
    "facebook",
    "tiktok",
    "youtube",
    "linkedin",
]);

/* ── pure helpers ──────────────────────────────────────────────── */

function isPlainObject(v) {
    return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

function nonEmptyString(v) {
    return typeof v === "string" && v.trim().length > 0;
}

function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function escapeAttr(value) {
    return escapeHtml(value);
}

function isHttpsUrl(value) {
    if (!nonEmptyString(value)) return false;
    try {
        return new URL(value.trim()).protocol === "https:";
    } catch {
        return false;
    }
}

function safeHref(value) {
    if (!nonEmptyString(value)) return "";
    const trimmed = value.trim();
    try {
        const u = new URL(trimmed);
        return ALLOWED_HREF_SCHEMES.includes(u.protocol) ? trimmed : "";
    } catch {
        return "";
    }
}

function safeImgSrc(value) {
    return isHttpsUrl(value) ? value.trim() : "";
}

function safePositiveInt(n) {
    return Number.isInteger(n) && n > 0 ? n : null;
}

function validateLang(lang) {
    return typeof lang === "string" && LANG_RE.test(lang) ? lang : DEFAULT_LANG;
}

function validateDir(dir) {
    return dir === "rtl" || dir === "ltr" ? dir : DEFAULT_DIR;
}

/* ── JSON-LD ───────────────────────────────────────────────────── */

function serializeJsonLd(items) {
    if (!Array.isArray(items)) return [];
    const out = [];
    for (const item of items) {
        if (!isPlainObject(item)) continue;
        let payload;
        try {
            payload = JSON.stringify(item);
        } catch {
            continue;
        }
        if (typeof payload !== "string") continue;
        // Script-context hardening:
        //   - case-insensitive </script  → <\/script
        //   - <!--                       → <\!--
        //   - U+2028 / U+2029            → \u2028 / \u2029  (JS line terminators)
        const escaped = payload
            .replace(/<\/script/gi, "<\\/script")
            .replace(/<!--/g, "<\\!--")
            .replace(/\u2028/g, "\\u2028")
            .replace(/\u2029/g, "\\u2029");
        out.push(escaped);
    }
    return out;
}

/* ── input validation ─────────────────────────────────────────── */

function assertSeo(seo) {
    if (!isPlainObject(seo)) {
        throw new TypeError("cardOgHtml: seo must be a plain object");
    }
    if (!isHttpsUrl(seo.canonicalUrl)) {
        throw new TypeError(
            "cardOgHtml: seo.canonicalUrl must be an absolute https URL",
        );
    }
    if (!isHttpsUrl(seo.ogUrl)) {
        throw new TypeError(
            "cardOgHtml: seo.ogUrl must be an absolute https URL",
        );
    }
}

function assertRender(render) {
    if (!isPlainObject(render)) {
        throw new TypeError("cardOgHtml: render must be a plain object");
    }
}

/* ── derivations ───────────────────────────────────────────────── */

function pickRobots(seo) {
    const r = seo.robotsResolved;
    return nonEmptyString(r) ? r.trim() : DEFAULT_ROBOTS;
}

function pickH1(render, seo) {
    if (nonEmptyString(render.displayName)) return render.displayName.trim();
    if (nonEmptyString(seo.title)) return seo.title.trim();
    return FALLBACK_H1;
}

function pickTitle(seo, h1) {
    return nonEmptyString(seo.title) ? seo.title.trim() : h1;
}

function pickDescription(seo) {
    return nonEmptyString(seo.description) ? seo.description.trim() : "";
}

/* ── HEAD ──────────────────────────────────────────────────────── */

function renderHead(seo, h1) {
    const title = pickTitle(seo, h1);
    const description = pickDescription(seo);
    const robots = pickRobots(seo);
    const ogImage = safeImgSrc(seo.ogImage);
    const twitterCard = nonEmptyString(seo.twitterCard)
        ? seo.twitterCard.trim()
        : "summary_large_image";
    const ogType = nonEmptyString(seo.ogType) ? seo.ogType.trim() : "website";

    const lines = [];
    lines.push("<head>");
    lines.push('<meta charset="utf-8">');
    lines.push(
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
    );
    lines.push("<title>" + escapeHtml(title) + "</title>");
    lines.push(
        '<meta name="description" content="' + escapeAttr(description) + '">',
    );
    lines.push('<meta name="robots" content="' + escapeAttr(robots) + '">');
    lines.push(
        '<link rel="canonical" href="' + escapeAttr(seo.canonicalUrl) + '">',
    );
    lines.push(
        '<meta property="og:title" content="' + escapeAttr(title) + '">',
    );
    lines.push(
        '<meta property="og:description" content="' +
            escapeAttr(description) +
            '">',
    );
    lines.push(
        '<meta property="og:url" content="' + escapeAttr(seo.ogUrl) + '">',
    );
    lines.push(
        '<meta property="og:type" content="' + escapeAttr(ogType) + '">',
    );
    if (ogImage) {
        lines.push(
            '<meta property="og:image" content="' + escapeAttr(ogImage) + '">',
        );
        if (nonEmptyString(seo.ogImageAlt)) {
            lines.push(
                '<meta property="og:image:alt" content="' +
                    escapeAttr(seo.ogImageAlt.trim()) +
                    '">',
            );
        }
    }
    lines.push(
        '<meta name="twitter:card" content="' + escapeAttr(twitterCard) + '">',
    );
    lines.push(
        '<meta name="twitter:title" content="' + escapeAttr(title) + '">',
    );
    lines.push(
        '<meta name="twitter:description" content="' +
            escapeAttr(description) +
            '">',
    );
    if (ogImage) {
        lines.push(
            '<meta name="twitter:image" content="' + escapeAttr(ogImage) + '">',
        );
    }
    for (const payload of serializeJsonLd(seo.jsonLdItems)) {
        lines.push(
            '<script type="application/ld+json">' + payload + "</script>",
        );
    }
    lines.push("</head>");
    return lines.join("\n");
}

/* ── BODY sections ─────────────────────────────────────────────── */

function renderAbout(render) {
    const text = nonEmptyString(render.aboutText)
        ? render.aboutText.trim()
        : "";
    const paragraphs = Array.isArray(render.aboutParagraphs)
        ? render.aboutParagraphs.filter((p) => nonEmptyString(p))
        : [];
    const ps = paragraphs.length
        ? paragraphs
        : text
          ? text.split(/\n{2,}/).filter((p) => p.trim())
          : [];
    if (!ps.length) return "";
    const rendered = ps.map((p) => "<p>" + escapeHtml(p) + "</p>").join("\n");
    return "<section><h2>אודות</h2>\n" + rendered + "\n</section>";
}

function renderContactLinks(render) {
    const c = isPlainObject(render.contactLinks) ? render.contactLinks : {};
    const items = [];
    if (nonEmptyString(c.phone)) {
        const safe = safeHref("tel:" + c.phone.trim());
        if (safe) {
            items.push(
                '<li><a href="' +
                    escapeAttr(safe) +
                    '">' +
                    escapeHtml(c.phone.trim()) +
                    "</a></li>",
            );
        }
    }
    if (nonEmptyString(c.whatsapp)) {
        const safe = safeHref(c.whatsapp.trim());
        if (safe && safe.startsWith("https:")) {
            items.push(
                '<li><a href="' + escapeAttr(safe) + '">WhatsApp</a></li>',
            );
        }
    }
    if (nonEmptyString(c.email)) {
        const safe = safeHref("mailto:" + c.email.trim());
        if (safe) {
            items.push(
                '<li><a href="' +
                    escapeAttr(safe) +
                    '">' +
                    escapeHtml(c.email.trim()) +
                    "</a></li>",
            );
        }
    }
    if (nonEmptyString(c.website)) {
        const safe = safeHref(c.website.trim());
        if (safe && safe.startsWith("https:")) {
            items.push(
                '<li><a href="' +
                    escapeAttr(safe) +
                    '">' +
                    escapeHtml(safe) +
                    "</a></li>",
            );
        }
    }
    if (!items.length) return "";
    return (
        "<section><h2>צור קשר</h2>\n<ul>\n" +
        items.join("\n") +
        "\n</ul>\n</section>"
    );
}

function renderServices(render) {
    if (!Array.isArray(render.services) || !render.services.length) return "";
    const items = [];
    for (const s of render.services) {
        if (!isPlainObject(s)) continue;
        const title = nonEmptyString(s.title) ? s.title.trim() : "";
        if (!title) continue;
        const desc = nonEmptyString(s.description) ? s.description.trim() : "";
        const parts = ["<h3>" + escapeHtml(title) + "</h3>"];
        if (desc) parts.push("<p>" + escapeHtml(desc) + "</p>");
        items.push("<article>" + parts.join("\n") + "</article>");
    }
    if (!items.length) return "";
    return "<section><h2>שירותים</h2>\n" + items.join("\n") + "\n</section>";
}

function renderFaq(render) {
    if (!Array.isArray(render.faqItems) || !render.faqItems.length) return "";
    const items = [];
    for (const f of render.faqItems) {
        if (!isPlainObject(f)) continue;
        const q = nonEmptyString(f.question) ? f.question.trim() : "";
        const a = nonEmptyString(f.answer) ? f.answer.trim() : "";
        if (!q || !a) continue;
        items.push(
            "<dt>" + escapeHtml(q) + "</dt>\n<dd>" + escapeHtml(a) + "</dd>",
        );
    }
    if (!items.length) return "";
    return (
        "<section><h2>שאלות נפוצות</h2>\n<dl>\n" +
        items.join("\n") +
        "\n</dl>\n</section>"
    );
}

function renderBusinessHours(render) {
    const bh = render.businessHours;
    if (!isPlainObject(bh) || bh.enabled !== true) return "";
    const week = isPlainObject(bh.week) ? bh.week : {};
    const rows = [];
    for (const day of DAY_ORDER) {
        const d = week[day];
        if (!isPlainObject(d) || d.open !== true) continue;
        const intervals = Array.isArray(d.intervals) ? d.intervals : [];
        const safe = [];
        for (const iv of intervals) {
            if (!isPlainObject(iv)) continue;
            if (!nonEmptyString(iv.start) || !nonEmptyString(iv.end)) continue;
            safe.push(
                escapeHtml(iv.start.trim()) + "–" + escapeHtml(iv.end.trim()),
            );
        }
        if (!safe.length) continue;
        rows.push(
            "<tr><th>" +
                escapeHtml(DAY_HEBREW[day]) +
                "</th><td>" +
                safe.join(", ") +
                "</td></tr>",
        );
    }
    if (!rows.length) return "";
    return (
        "<section><h2>שעות פעילות</h2>\n<table>\n" +
        rows.join("\n") +
        "\n</table>\n</section>"
    );
}

function renderGallery(render) {
    if (!Array.isArray(render.gallery) || !render.gallery.length) return "";
    const items = [];
    for (const g of render.gallery) {
        if (!isPlainObject(g)) continue;
        const src = safeImgSrc(g.url);
        if (!src) continue;
        const alt = typeof g.alt === "string" ? g.alt : "";
        const parts = [
            '<img src="' + escapeAttr(src) + '" alt="' + escapeAttr(alt) + '"',
        ];
        const w = safePositiveInt(g.width);
        const h = safePositiveInt(g.height);
        if (w !== null) parts.push('width="' + w + '"');
        if (h !== null) parts.push('height="' + h + '"');
        items.push(parts.join(" ") + ">");
    }
    if (!items.length) return "";
    return "<section><h2>גלריה</h2>\n" + items.join("\n") + "\n</section>";
}

function renderSocialLinks(render) {
    const s = isPlainObject(render.socialLinks) ? render.socialLinks : {};
    const items = [];
    for (const key of SOCIAL_KEY_ORDER) {
        const v = s[key];
        if (!nonEmptyString(v)) continue;
        const safe = safeHref(v.trim());
        if (!safe || !safe.startsWith("https:")) continue;
        items.push(
            '<li><a href="' +
                escapeAttr(safe) +
                '">' +
                escapeHtml(key) +
                "</a></li>",
        );
    }
    if (!items.length) return "";
    return (
        "<section><h2>רשתות חברתיות</h2>\n<ul>\n" +
        items.join("\n") +
        "\n</ul>\n</section>"
    );
}

function renderBody(seo, render, h1) {
    const lines = [];
    lines.push("<body>");
    lines.push("<main>");
    lines.push("<article>");
    lines.push("<h1>" + escapeHtml(h1) + "</h1>");
    if (nonEmptyString(render.subtitle)) {
        lines.push("<p>" + escapeHtml(render.subtitle.trim()) + "</p>");
    }
    if (nonEmptyString(render.slogan)) {
        lines.push("<p>" + escapeHtml(render.slogan.trim()) + "</p>");
    }
    const sections = [
        renderAbout(render),
        renderContactLinks(render),
        renderServices(render),
        renderFaq(render),
        renderBusinessHours(render),
        renderGallery(render),
        renderSocialLinks(render),
    ];
    for (const section of sections) {
        if (section) lines.push(section);
    }
    lines.push(
        '<a href="' +
            escapeAttr(seo.canonicalUrl) +
            '">' +
            escapeHtml(seo.canonicalUrl) +
            "</a>",
    );
    lines.push("</article>");
    lines.push("</main>");
    lines.push("</body>");
    return lines.join("\n");
}

/* ── public export ─────────────────────────────────────────────── */

export function renderCardOgHtml(input) {
    const arg = isPlainObject(input) ? input : {};
    const { seo, render, lang, dir } = arg;
    assertSeo(seo);
    assertRender(render);
    const safeLang = validateLang(lang);
    const safeDir = validateDir(dir);
    const h1 = pickH1(render, seo);
    const head = renderHead(seo, h1);
    const body = renderBody(seo, render, h1);
    return (
        "<!doctype html>\n" +
        '<html lang="' +
        escapeAttr(safeLang) +
        '" dir="' +
        escapeAttr(safeDir) +
        '">\n' +
        head +
        "\n" +
        body +
        "\n</html>"
    );
}
