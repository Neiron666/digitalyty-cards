// Admin marketing campaign controller — preview only (stateless).
//
// READ-ONLY: no DB writes, no Mailjet, no send, no unsubscribe token minting.
// Renders a safe HTML + text preview from structured admin input and returns it.
// requireAdmin + CSRF are inherited from the /api/admin mount + global csrfGuard.

import {
    renderMarketingEmailPreview,
    MarketingInputError,
} from "../services/marketingEmailRenderer.js";

/**
 * POST /api/admin/marketing/campaigns/preview
 * Body: { subject, previewText?, topImageUrl?, heading?, bodyText, ctaLabel?, ctaUrl? }
 * Returns: { ok: true, html, text, warnings }
 * No side effects.
 */
export async function previewMarketingCampaign(req, res) {
    try {
        const { html, text, warnings } = renderMarketingEmailPreview(
            req.body || {},
        );
        return res.json({ ok: true, html, text, warnings });
    } catch (err) {
        if (err instanceof MarketingInputError) {
            return res.status(400).json({ ok: false, message: err.message });
        }
        // Never leak internal stack traces.
        console.error(
            "[adminMarketingCampaign] preview failed",
            err?.message || err,
        );
        return res
            .status(400)
            .json({ ok: false, message: "Invalid preview request" });
    }
}
