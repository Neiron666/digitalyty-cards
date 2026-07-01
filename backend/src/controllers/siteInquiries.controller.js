import crypto from "crypto";
import { sanitizeArticleInquiryInput } from "../utils/leadSanitize.js";
import { sendArticleInquiryEmailMailjet } from "../services/mailjet.service.js";

// ---------------------------------------------------------------------------
// submitArticleInquiry
//
// Handles POST /api/site-inquiries/article — the article detail contact form.
// No DB writes. Mailjet is awaited. Failure returns 502 (not fake success).
//
// Processing order (per Phase 1C architecture lock):
//   A. Generate non-PII correlation ID.
//   B. Honeypot check (before sanitizer, so bots never see validation detail).
//   C. Sanitize + validate input.
//   D. Consent check.
//   E. Send Mailjet (awaited).
//   F. Respond based on Mailjet result.
// ---------------------------------------------------------------------------
export async function submitArticleInquiry(req, res) {
    // A. Generate a 6-char hex correlation ID for operational logging only.
    //    This ID is safe to log — it carries no PII.
    const inquiryId = crypto.randomBytes(3).toString("hex");

    // Track sourcePath for error logging (safe, non-PII).
    let safeSourcePath = null;

    try {
        // B. Honeypot — before full sanitization.
        //    Any truthy hp value means bot. Fake-succeed silently.
        //    No email sent, no PII logged.
        const rawHp =
            req.body && typeof req.body === "object"
                ? String(req.body.hp ?? "").trim()
                : "";
        if (rawHp) {
            return res.status(200).json({ ok: true });
        }

        // C. Sanitize + validate input.
        const result = sanitizeArticleInquiryInput(req.body);

        if (!result.ok) {
            return res.status(400).json({
                ok: false,
                code: "VALIDATION_ERROR",
                message: "פרטים חסרים או לא תקינים.",
            });
        }

        const { name, phone, email, sourcePath, sourceTitle, consent } =
            result.value;

        // Store sourcePath for safe use in error log only (no PII).
        safeSourcePath = sourcePath;

        // D. Consent check (after honeypot, after sanitization).
        if (consent !== true) {
            return res.status(400).json({
                ok: false,
                code: "CONSENT_REQUIRED",
                message: "חובה לאשר את מדיניות הפרטיות ותנאי השימוש.",
            });
        }

        // E. Send Mailjet — awaited, not fire-and-forget.
        //    If this fails, the client receives a 502 so the user knows
        //    to use the WhatsApp fallback. No silent data loss.
        const mjResult = await sendArticleInquiryEmailMailjet({
            inquiryId,
            name,
            phone,
            email,
            sourcePath,
            sourceTitle,
        });

        // F. Mailjet success.
        if (mjResult.ok) {
            return res.status(200).json({ ok: true });
        }

        // G. Mailjet failure — log sanitized operational info, NO PII.
        //    name / phone / email / sourceTitle are NOT logged.
        console.error("[site-inquiry] mailjet send failed", {
            inquiryId,
            sourcePath: safeSourcePath,
            statusCode: mjResult.statusCode,
            error: mjResult.error,
        });

        return res.status(502).json({
            ok: false,
            code: "EMAIL_DELIVERY_FAILED",
            message:
                "לא הצלחנו לשלוח את הפנייה. ניתן לפנות אלינו ישירות בוואטסאפ.",
        });
    } catch (err) {
        // H. Unexpected server error — log without PII.
        console.error("[site-inquiry] unexpected failure", {
            inquiryId,
            sourcePath: safeSourcePath,
            error: err?.message || String(err),
        });

        return res.status(500).json({
            ok: false,
            code: "SERVER_ERROR",
            message: "שגיאה בשליחת הפנייה. נסו שוב מאוחר יותר.",
        });
    }
}
