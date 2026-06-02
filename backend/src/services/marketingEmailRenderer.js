// Pure, server-side marketing email renderer (preview-capable, future SSoT).
//
// No DB, no Mailjet, no token minting, no network. Produces { html, text,
// warnings } from structured admin input. The same core (renderMarketingEmailCore)
// is intended to back preview AND, in a later contour, test-send/real-send — so
// preview can never diverge from what is actually sent.
//
// SECURITY: markdown-lite follows a strict escape-first ordering. Plain text and
// link display text are HTML-escaped; hrefs are validated by the backend URL
// policy and attribute-escaped independently; only then are the allowed tags
// (p, strong, a, br) emitted. Raw HTML in the input is rendered as escaped text.

import { escapeHtml, escapeHtmlAttr } from "../utils/escapeHtml.util.js";
import {
    validateMarketingLinkUrl,
    validateMarketingImageUrl,
} from "../utils/marketingUrlPolicy.util.js";

// ── Validation limits ─────────────────────────────────────────────
const LIMITS = {
    subjectMax: 200,
    previewTextMax: 200,
    headingMax: 150,
    bodyTextMax: 5000,
    ctaLabelMax: 60,
};

// Preview-only placeholder. Preview never mints a real unsubscribe token.
const UNSUBSCRIBE_PLACEHOLDER_HE = "קישור ביטול הרשמה יופיע כאן בשליחה אמיתית";

class MarketingInputError extends Error {
    constructor(message) {
        super(message);
        this.name = "MarketingInputError";
        this.isValidationError = true;
    }
}

export { MarketingInputError };

function asString(value) {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value;
    // Reject non-string scalars defensively rather than coercing objects.
    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }
    return "";
}

/**
 * Normalize + validate structured input. Throws MarketingInputError on any
 * violation (caller maps to HTTP 400). Returns a clean, trimmed object.
 */
export function normalizeMarketingEmailInput(input) {
    const src = input && typeof input === "object" ? input : {};

    const subject = asString(src.subject).trim();
    const previewText = asString(src.previewText).trim();
    const topImageUrl = asString(src.topImageUrl).trim();
    const heading = asString(src.heading).trim();
    const bodyText = asString(src.bodyText).replace(/\r\n/g, "\n");
    const ctaLabel = asString(src.ctaLabel).trim();
    const ctaUrl = asString(src.ctaUrl).trim();

    if (!subject) throw new MarketingInputError("subject is required");
    if (subject.length > LIMITS.subjectMax) {
        throw new MarketingInputError("subject exceeds max length");
    }
    if (previewText.length > LIMITS.previewTextMax) {
        throw new MarketingInputError("previewText exceeds max length");
    }
    if (heading.length > LIMITS.headingMax) {
        throw new MarketingInputError("heading exceeds max length");
    }

    const bodyTrimmed = bodyText.trim();
    if (!bodyTrimmed) throw new MarketingInputError("bodyText is required");
    if (bodyText.length > LIMITS.bodyTextMax) {
        throw new MarketingInputError("bodyText exceeds max length");
    }

    if (ctaLabel.length > LIMITS.ctaLabelMax) {
        throw new MarketingInputError("ctaLabel exceeds max length");
    }

    // CTA label/url must be both present or both absent.
    if (ctaLabel && !ctaUrl) {
        throw new MarketingInputError(
            "ctaUrl is required when ctaLabel is set",
        );
    }
    if (ctaUrl && !ctaLabel) {
        throw new MarketingInputError(
            "ctaLabel is required when ctaUrl is set",
        );
    }

    return {
        subject,
        previewText,
        topImageUrl,
        heading,
        bodyText,
        ctaLabel,
        ctaUrl,
    };
}

// ── Markdown-lite inline rendering ────────────────────────────────
// Token detection only; validation/escaping happen per-segment below.
const MD_LINK_RE = /\[([^\[\]]+)\]\(([^()\s]+)\)/g;
const BOLD_RE = /\*\*([^*]+)\*\*/g;

/**
 * Render a plain-text segment to HTML: escape everything, then promote
 * **bold** to <strong>. The bold inner text is escaped before wrapping.
 * Unbalanced ** is left as escaped literal text.
 */
function renderBoldEscaped(text) {
    let out = "";
    let cursor = 0;
    let match;
    BOLD_RE.lastIndex = 0;
    while ((match = BOLD_RE.exec(text)) !== null) {
        const [full, inner] = match;
        const idx = match.index;
        if (idx > cursor) out += escapeHtml(text.slice(cursor, idx));
        out += `<strong>${escapeHtml(inner)}</strong>`;
        cursor = idx + full.length;
    }
    if (cursor < text.length) out += escapeHtml(text.slice(cursor));
    return out;
}

/**
 * Render one paragraph's inline content. Pass 1 extracts markdown links from
 * the RAW text; link display text and surrounding text go through
 * renderBoldEscaped; hrefs are validated then attribute-escaped. Invalid links
 * degrade to escaped literal text. No raw HTML can survive this path.
 */
function renderInline(rawParagraph, warnings) {
    let html = "";
    let cursor = 0;
    let match;
    MD_LINK_RE.lastIndex = 0;
    while ((match = MD_LINK_RE.exec(rawParagraph)) !== null) {
        const [full, displayText, rawUrl] = match;
        const idx = match.index;

        if (idx > cursor) {
            html += renderBoldEscaped(rawParagraph.slice(cursor, idx));
        }

        const result = validateMarketingLinkUrl(rawUrl);
        if (result.ok) {
            const safeHref = escapeHtmlAttr(result.href);
            const safeText = renderBoldEscaped(displayText);
            html += `<a href="${safeHref}" style="color:#6c47ff;text-decoration:underline;">${safeText}</a>`;
        } else {
            // Degrade entire token to escaped plain text.
            warnings.push(`rejected link (${result.reason})`);
            html += renderBoldEscaped(full);
        }
        cursor = idx + full.length;
    }
    if (cursor < rawParagraph.length) {
        html += renderBoldEscaped(rawParagraph.slice(cursor));
    }
    return html;
}

/** Split body into paragraphs by blank lines; single newline → <br>. */
function splitParagraphs(bodyText) {
    return bodyText
        .split(/\n\s*\n/)
        .map((p) => p.replace(/[ \t]+$/gm, "").trim())
        .filter((p) => p.length > 0);
}

function renderBodyHtml(bodyText, warnings) {
    const paragraphs = splitParagraphs(bodyText);
    return paragraphs
        .map((p) => {
            const withBreaks = p
                .split("\n")
                .map((line) => renderInline(line, warnings))
                .join("<br />");
            return `<tr><td style="padding-bottom:16px;"><p style="margin:0;font-size:15px;line-height:1.6;color:#444444;text-align:right;">${withBreaks}</p></td></tr>`;
        })
        .join("\n");
}

// ── Plain-text fallback (no HTML tags) ────────────────────────────
function stripMarkdownLinksToText(line) {
    // [text](url) → "text (url)" when url passes policy, else just "text".
    return line.replace(MD_LINK_RE, (full, displayText, rawUrl) => {
        const result = validateMarketingLinkUrl(rawUrl);
        return result.ok ? `${displayText} (${result.href})` : displayText;
    });
}

function renderBodyText(bodyText) {
    const paragraphs = splitParagraphs(bodyText);
    return paragraphs
        .map((p) =>
            p
                .split("\n")
                .map((line) =>
                    stripMarkdownLinksToText(line).replace(/\*\*/g, ""),
                )
                .join("\n"),
        )
        .join("\n\n");
}

/**
 * Shared core renderer (future SSoT for preview + test-send + real-send).
 * @param {object} input  Raw structured input (will be normalized).
 * @param {object} options { unsubscribeUrl?: string, mode?: "preview"|"send" }
 * @returns {{ html: string, text: string, warnings: string[] }}
 */
export function renderMarketingEmailCore(input, options = {}) {
    const data = normalizeMarketingEmailInput(input);
    const warnings = [];
    const mode = options.mode === "send" ? "send" : "preview";

    // Unsubscribe: preview uses a placeholder (no real token, ever).
    const isPreview = mode === "preview";
    const unsubscribeUrlRaw =
        typeof options.unsubscribeUrl === "string"
            ? options.unsubscribeUrl
            : "";

    // Top image (optional). Reject silently with a warning if it fails policy.
    let imageHtml = "";
    if (data.topImageUrl) {
        const imgResult = validateMarketingImageUrl(data.topImageUrl);
        if (imgResult.ok) {
            const safeSrc = escapeHtmlAttr(imgResult.href);
            imageHtml = `<tr><td style="text-align:center;padding-bottom:24px;"><img src="${safeSrc}" alt="" width="auto" height="auto" style="display:block;margin:0 auto;max-width:100%;border:0;" /></td></tr>`;
        } else {
            warnings.push(`rejected topImageUrl (${imgResult.reason})`);
        }
    }

    const headingHtml = data.heading
        ? `<tr><td style="padding-bottom:16px;"><h1 style="margin:0;font-size:22px;font-weight:bold;color:#1a1a1a;text-align:center;">${escapeHtml(
              data.heading,
          )}</h1></td></tr>`
        : "";

    const bodyHtml = renderBodyHtml(data.bodyText, warnings);

    let ctaHtml = "";
    if (data.ctaLabel && data.ctaUrl) {
        const ctaResult = validateMarketingLinkUrl(data.ctaUrl);
        if (ctaResult.ok) {
            const safeHref = escapeHtmlAttr(ctaResult.href);
            const safeLabel = escapeHtml(data.ctaLabel);
            ctaHtml = `<tr><td style="text-align:center;padding:8px 0 24px 0;"><a href="${safeHref}" style="display:inline-block;padding:14px 32px;background-color:#6c47ff;color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none;border-radius:6px;">${safeLabel}</a></td></tr>`;
        } else {
            warnings.push(`rejected ctaUrl (${ctaResult.reason})`);
        }
    }

    // Hidden preheader (previewText) — visually hidden, used by inbox preview.
    const preheaderHtml = data.previewText
        ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">${escapeHtml(
              data.previewText,
          )}</div>`
        : "";

    // Unsubscribe footer.
    let footerUnsubHtml;
    if (isPreview || !unsubscribeUrlRaw) {
        footerUnsubHtml = `<p style="margin:8px 0 0 0;font-size:11px;color:#bbbbbb;">${escapeHtml(
            UNSUBSCRIBE_PLACEHOLDER_HE,
        )}</p>`;
    } else {
        const unsubResult = validateMarketingLinkUrl(unsubscribeUrlRaw);
        if (unsubResult.ok) {
            const safeHref = escapeHtmlAttr(unsubResult.href);
            footerUnsubHtml = `<p style="margin:8px 0 0 0;font-size:11px;color:#bbbbbb;">לביטול הרשמה לקבלת עדכונים: <a href="${safeHref}" style="color:#aaaaaa;">לחצו כאן לביטול הרשמה</a></p>`;
        } else {
            warnings.push(`rejected unsubscribeUrl (${unsubResult.reason})`);
            footerUnsubHtml = `<p style="margin:8px 0 0 0;font-size:11px;color:#bbbbbb;">${escapeHtml(
                UNSUBSCRIBE_PLACEHOLDER_HE,
            )}</p>`;
        }
    }

    const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,sans-serif;direction:rtl;">
  ${preheaderHtml}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background-color:#ffffff;border-radius:8px;padding:40px 32px;">
          <tr><td style="text-align:center;padding-bottom:8px;">
            <p style="margin:0 0 24px 0;font-size:20px;font-weight:bold;color:#1a1a1a;text-align:center;">Cardigo</p>
          </td></tr>
          ${imageHtml}
          ${headingHtml}
          ${bodyHtml}
          ${ctaHtml}
          <tr><td style="border-top:1px solid #e5e7eb;padding-top:16px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#aaaaaa;">צוות Cardigo</p>
            ${footerUnsubHtml}
          </td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // ── Plain-text fallback ──
    const textLines = [];
    if (data.heading) {
        textLines.push(data.heading, "");
    }
    textLines.push(renderBodyText(data.bodyText));
    if (data.ctaLabel && data.ctaUrl) {
        const ctaResult = validateMarketingLinkUrl(data.ctaUrl);
        if (ctaResult.ok) {
            textLines.push("", `${data.ctaLabel}: ${ctaResult.href}`);
        }
    }
    textLines.push("", "צוות Cardigo");
    if (isPreview || !unsubscribeUrlRaw) {
        textLines.push("", "---", UNSUBSCRIBE_PLACEHOLDER_HE);
    } else {
        const unsubResult = validateMarketingLinkUrl(unsubscribeUrlRaw);
        textLines.push(
            "",
            "---",
            "לביטול הרשמה לקבלת עדכונים:",
            unsubResult.ok ? unsubResult.href : UNSUBSCRIBE_PLACEHOLDER_HE,
        );
    }

    return { html, text: textLines.join("\n"), warnings };
}

/**
 * Preview wrapper. Always preview mode → placeholder unsubscribe, no token.
 * @param {object} input
 * @returns {{ html: string, text: string, warnings: string[] }}
 */
export function renderMarketingEmailPreview(input) {
    return renderMarketingEmailCore(input, { mode: "preview" });
}
