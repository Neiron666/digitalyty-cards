import https from "https";

function normalizeEmail(value) {
    if (typeof value !== "string") return "";
    return value.trim().toLowerCase();
}

function getMailjetConfig() {
    const apiKey =
        typeof process.env.MAILJET_API_KEY === "string"
            ? process.env.MAILJET_API_KEY.trim()
            : "";
    const apiSecret =
        typeof process.env.MAILJET_API_SECRET === "string"
            ? process.env.MAILJET_API_SECRET.trim()
            : "";
    const fromEmail =
        typeof process.env.MAILJET_FROM_EMAIL === "string"
            ? process.env.MAILJET_FROM_EMAIL.trim()
            : "";

    const fromName =
        typeof process.env.MAILJET_FROM_NAME === "string"
            ? process.env.MAILJET_FROM_NAME.trim()
            : "";

    const enabled = Boolean(apiKey && apiSecret && fromEmail);

    const inviteSubjectRaw =
        typeof process.env.MAILJET_INVITE_SUBJECT === "string"
            ? process.env.MAILJET_INVITE_SUBJECT.trim()
            : "";

    const inviteTextPrefixRaw =
        typeof process.env.MAILJET_INVITE_TEXT_PREFIX === "string"
            ? process.env.MAILJET_INVITE_TEXT_PREFIX.trim()
            : "";

    const resetSubjectRaw =
        typeof process.env.MAILJET_RESET_SUBJECT === "string"
            ? process.env.MAILJET_RESET_SUBJECT.trim()
            : "";

    const resetTextPrefixRaw =
        typeof process.env.MAILJET_RESET_TEXT_PREFIX === "string"
            ? process.env.MAILJET_RESET_TEXT_PREFIX.trim()
            : "";

    const signupSubjectRaw =
        typeof process.env.MAILJET_SIGNUP_SUBJECT === "string"
            ? process.env.MAILJET_SIGNUP_SUBJECT.trim()
            : "";

    const signupTextPrefixRaw =
        typeof process.env.MAILJET_SIGNUP_TEXT_PREFIX === "string"
            ? process.env.MAILJET_SIGNUP_TEXT_PREFIX.trim()
            : "";

    const verifySubjectRaw =
        typeof process.env.MAILJET_VERIFY_SUBJECT === "string"
            ? process.env.MAILJET_VERIFY_SUBJECT.trim()
            : "";

    const verifyTextPrefixRaw =
        typeof process.env.MAILJET_VERIFY_TEXT_PREFIX === "string"
            ? process.env.MAILJET_VERIFY_TEXT_PREFIX.trim()
            : "";

    return {
        enabled,
        apiKey,
        apiSecret,
        fromEmail,
        fromName: fromName || "Cardigo",
        inviteSubject:
            inviteSubjectRaw || "You’re invited to join an organization",
        inviteTextPrefix:
            inviteTextPrefixRaw ||
            "You have been invited to join an organization.",
        resetSubject: resetSubjectRaw || "איפוס סיסמה",
        resetTextPrefix:
            resetTextPrefixRaw ||
            "קיבלנו בקשה לאיפוס סיסמה. אם לא ביקשתם זאת, אפשר להתעלם מההודעה הזו.",

        signupSubject: signupSubjectRaw || "Complete your signup",
        signupTextPrefix:
            signupTextPrefixRaw ||
            "Open the link to complete your signup. If you already have an account, use Login / Forgot password.",

        verifySubject: verifySubjectRaw || "אימות כתובת האימייל",
        verifyTextPrefix:
            verifyTextPrefixRaw ||
            "כדי להשלים את ההרשמה, נא לאמת את כתובת האימייל על ידי לחיצה על הקישור.",

        trialReminderSubject:
            (typeof process.env.MAILJET_TRIAL_REMINDER_SUBJECT === "string"
                ? process.env.MAILJET_TRIAL_REMINDER_SUBJECT.trim()
                : "") || "הטריאל הפרימיום שלך מסתיים בקרוב",
        trialReminderTextPrefix:
            (typeof process.env.MAILJET_TRIAL_REMINDER_TEXT_PREFIX === "string"
                ? process.env.MAILJET_TRIAL_REMINDER_TEXT_PREFIX.trim()
                : "") ||
            "תזכורת: תקופת הניסיון הפרימיום שלך ב-Cardigo עומדת להסתיים.",
        // Logo URL: prefer contour-specific, fall back to shared brand logo.
        // Empty string = no logo → email renders branded text heading instead.
        trialReminderLogoUrl:
            (typeof process.env.MAILJET_TRIAL_REMINDER_LOGO_URL === "string"
                ? process.env.MAILJET_TRIAL_REMINDER_LOGO_URL.trim()
                : "") ||
            (typeof process.env.MAILJET_BRAND_LOGO_URL === "string"
                ? process.env.MAILJET_BRAND_LOGO_URL.trim()
                : ""),
        deletionWarningSubject:
            (typeof process.env.MAILJET_DELETION_WARNING_SUBJECT === "string"
                ? process.env.MAILJET_DELETION_WARNING_SUBJECT.trim()
                : "") || "הודעה מוקדמת: חשבון Cardigo שלא נעשה בו שימוש",
        deletionWarningTextPrefix:
            (typeof process.env.MAILJET_DELETION_WARNING_TEXT_PREFIX ===
            "string"
                ? process.env.MAILJET_DELETION_WARNING_TEXT_PREFIX.trim()
                : "") ||
            "הודעה זו נשלחת אליך כהודעה מוקדמת לפי מדיניות הפרטיות ותנאי השימוש של Cardigo.",
        renewalFailedSubject:
            (typeof process.env.MAILJET_RENEWAL_FAILED_SUBJECT === "string"
                ? process.env.MAILJET_RENEWAL_FAILED_SUBJECT.trim()
                : "") || "חיוב החידוש של Cardigo Premium נכשל",
        renewalFailedTextPrefix:
            (typeof process.env.MAILJET_RENEWAL_FAILED_TEXT_PREFIX === "string"
                ? process.env.MAILJET_RENEWAL_FAILED_TEXT_PREFIX.trim()
                : "") ||
            "חיוב חידוש הפרימיום נכשל. הגישה שלך נשמרת עד סיום תקופת התשלום הנוכחית.",
    };
}

function httpsRequestJson({
    hostname,
    path,
    method,
    headers,
    body,
    timeoutMs,
}) {
    return new Promise((resolve, reject) => {
        const req = https.request(
            {
                hostname,
                path,
                method,
                headers,
            },
            (res) => {
                const chunks = [];
                res.on("data", (d) => chunks.push(d));
                res.on("end", () => {
                    const raw = Buffer.concat(chunks).toString("utf8");
                    resolve({
                        statusCode: res.statusCode || 0,
                        bodyText: raw,
                    });
                });
            },
        );

        req.on("error", reject);
        if (timeoutMs) {
            req.setTimeout(timeoutMs, () => {
                req.destroy(new Error("Mailjet request timeout"));
            });
        }

        if (body) req.write(body);
        req.end();
    });
}

export async function sendOrgInviteEmailMailjetBestEffort({
    toEmail,
    inviteLink,
    orgId,
    inviteId,
}) {
    const cfg = getMailjetConfig();
    const toEmailNormalized = normalizeEmail(toEmail);

    if (!cfg.enabled) {
        return { ok: true, skipped: true, reason: "MAILJET_NOT_CONFIGURED" };
    }

    if (!toEmailNormalized || !inviteLink) {
        return { ok: false, skipped: true, reason: "INVALID_INPUT" };
    }

    const auth = Buffer.from(`${cfg.apiKey}:${cfg.apiSecret}`).toString(
        "base64",
    );

    const subject = cfg.inviteSubject;
    const prefix = cfg.inviteTextPrefix;
    const text = `${prefix}\n\nOpen the link to accept:\n${inviteLink}\n`;

    const payload = {
        Messages: [
            {
                From: {
                    Email: cfg.fromEmail,
                    Name: cfg.fromName,
                },
                To: [{ Email: toEmailNormalized }],
                Subject: subject,
                TextPart: text,
            },
        ],
    };

    const body = JSON.stringify(payload);

    try {
        const res = await httpsRequestJson({
            hostname: "api.mailjet.com",
            path: "/v3.1/send",
            method: "POST",
            timeoutMs: 10_000,
            headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(body),
            },
            body,
        });

        const ok = res.statusCode >= 200 && res.statusCode < 300;
        if (!ok) {
            console.error("[mailjet] invite send failed", {
                statusCode: res.statusCode,
                orgId: String(orgId || ""),
                inviteId: String(inviteId || ""),
            });
        }

        return { ok };
    } catch (err) {
        console.error("[mailjet] invite send error", {
            orgId: String(orgId || ""),
            inviteId: String(inviteId || ""),
            error: err?.message || err,
        });
        return { ok: false };
    }
}

export async function sendPasswordResetEmailMailjetBestEffort({
    toEmail,
    resetLink,
    userId,
    resetId,
}) {
    const cfg = getMailjetConfig();
    const toEmailNormalized = normalizeEmail(toEmail);

    if (!cfg.enabled) {
        return { ok: true, skipped: true, reason: "MAILJET_NOT_CONFIGURED" };
    }

    if (!toEmailNormalized || !resetLink) {
        return { ok: false, skipped: true, reason: "INVALID_INPUT" };
    }

    const auth = Buffer.from(`${cfg.apiKey}:${cfg.apiSecret}`).toString(
        "base64",
    );

    const subject = cfg.resetSubject;
    const prefix = cfg.resetTextPrefix;
    const text = `${prefix}\n\nכדי לאפס את הסיסמה, פתחו את הקישור:\n${resetLink}\n`;

    const payload = {
        Messages: [
            {
                From: {
                    Email: cfg.fromEmail,
                    Name: cfg.fromName,
                },
                To: [{ Email: toEmailNormalized }],
                Subject: subject,
                TextPart: text,
            },
        ],
    };

    const body = JSON.stringify(payload);

    try {
        const res = await httpsRequestJson({
            hostname: "api.mailjet.com",
            path: "/v3.1/send",
            method: "POST",
            timeoutMs: 10_000,
            headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(body),
            },
            body,
        });

        const ok = res.statusCode >= 200 && res.statusCode < 300;
        if (!ok) {
            console.error("[mailjet] reset send failed", {
                statusCode: res.statusCode,
                userId: String(userId || ""),
                resetId: String(resetId || ""),
            });
        }

        return { ok };
    } catch (err) {
        console.error("[mailjet] reset send error", {
            userId: String(userId || ""),
            resetId: String(resetId || ""),
            error: err?.message || err,
        });
        return { ok: false };
    }
}

export async function sendSignupLinkEmailMailjetBestEffort({
    toEmail,
    signupLink,
    emailNormalized,
    tokenId,
}) {
    const cfg = getMailjetConfig();
    const toEmailNormalized = normalizeEmail(toEmail);

    if (!cfg.enabled) {
        return { ok: true, skipped: true, reason: "MAILJET_NOT_CONFIGURED" };
    }

    if (!toEmailNormalized || !signupLink) {
        return { ok: false, skipped: true, reason: "INVALID_INPUT" };
    }

    const auth = Buffer.from(`${cfg.apiKey}:${cfg.apiSecret}`).toString(
        "base64",
    );

    const subject = cfg.signupSubject;
    const prefix = cfg.signupTextPrefix;
    const text = `${prefix}\n\nOpen the link:\n${signupLink}\n`;

    const payload = {
        Messages: [
            {
                From: {
                    Email: cfg.fromEmail,
                    Name: cfg.fromName,
                },
                To: [{ Email: toEmailNormalized }],
                Subject: subject,
                TextPart: text,
            },
        ],
    };

    const body = JSON.stringify(payload);

    try {
        const res = await httpsRequestJson({
            hostname: "api.mailjet.com",
            path: "/v3.1/send",
            method: "POST",
            timeoutMs: 10_000,
            headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(body),
            },
            body,
        });

        const ok = res.statusCode >= 200 && res.statusCode < 300;
        if (!ok) {
            console.error("[mailjet] signup send failed", {
                statusCode: res.statusCode,
                tokenId: String(tokenId || ""),
            });
        }

        return { ok };
    } catch (err) {
        console.error("[mailjet] signup send error", {
            tokenId: String(tokenId || ""),
            error: err?.message || err,
        });
        return { ok: false };
    }
}

export async function sendVerificationEmailMailjetBestEffort({
    toEmail,
    verifyLink,
    userId,
    tokenId,
}) {
    const cfg = getMailjetConfig();
    const toEmailNormalized = normalizeEmail(toEmail);

    if (!cfg.enabled) {
        return { ok: true, skipped: true, reason: "MAILJET_NOT_CONFIGURED" };
    }

    if (!toEmailNormalized || !verifyLink) {
        return { ok: false, skipped: true, reason: "INVALID_INPUT" };
    }

    const auth = Buffer.from(`${cfg.apiKey}:${cfg.apiSecret}`).toString(
        "base64",
    );

    const subject = cfg.verifySubject;
    const prefix = cfg.verifyTextPrefix;
    const text = `${prefix}\n\nלאימות האימייל, פתחו את הקישור:\n${verifyLink}\n`;

    const payload = {
        Messages: [
            {
                From: {
                    Email: cfg.fromEmail,
                    Name: cfg.fromName,
                },
                To: [{ Email: toEmailNormalized }],
                Subject: subject,
                TextPart: text,
            },
        ],
    };

    const body = JSON.stringify(payload);

    try {
        const res = await httpsRequestJson({
            hostname: "api.mailjet.com",
            path: "/v3.1/send",
            method: "POST",
            timeoutMs: 10_000,
            headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(body),
            },
            body,
        });

        const ok = res.statusCode >= 200 && res.statusCode < 300;
        if (!ok) {
            console.error("[mailjet] verify send failed", {
                statusCode: res.statusCode,
                userId: String(userId || ""),
                tokenId: String(tokenId || ""),
            });
        }

        return { ok };
    } catch (err) {
        console.error("[mailjet] verify send error", {
            userId: String(userId || ""),
            tokenId: String(tokenId || ""),
            error: err?.message || err,
        });
        return { ok: false };
    }
}

// ---------------------------------------------------------------------------
// Trial reminder email — multipart (TextPart + HTMLPart).
// Sends a branded pre-expiry reminder with a CTA to /pricing.
// Logo is sourced from env (MAILJET_TRIAL_REMINDER_LOGO_URL or
// MAILJET_BRAND_LOGO_URL). If neither is set the HTML heading renders as
// plain text — no broken image tags.
// ---------------------------------------------------------------------------
export async function sendTrialReminderEmailMailjetBestEffort({
    toEmail,
    trialEndsAt,
    firstName = null,
    pricingUrl,
    unsubscribeUrl = "",
    userId,
}) {
    const cfg = getMailjetConfig();
    const toEmailNormalized = normalizeEmail(toEmail);

    if (!cfg.enabled) {
        return { ok: true, skipped: true, reason: "MAILJET_NOT_CONFIGURED" };
    }

    if (!toEmailNormalized || !pricingUrl) {
        return { ok: false, skipped: true, reason: "INVALID_INPUT" };
    }

    const auth = Buffer.from(`${cfg.apiKey}:${cfg.apiSecret}`).toString(
        "base64",
    );

    // --- Text part -----------------------------------------------------------
    const subject = cfg.trialReminderSubject;
    const prefix = cfg.trialReminderTextPrefix;
    const trimmedFirstName =
        typeof firstName === "string" ? firstName.trim() : "";
    const greeting = trimmedFirstName ? `שלום, ${trimmedFirstName},` : "שלום,";

    // --- HTML output safety --------------------------------------------------
    // Escape user-controlled firstName before inserting into HTMLPart.
    // TextPart uses the unescaped greeting (plain text, no risk).
    const escapeHtmlAttr = (str) =>
        str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    const greetingHtml = trimmedFirstName
        ? `שלום, ${escapeHtmlAttr(trimmedFirstName)},`
        : "שלום,";
    const text = [
        greeting,
        "",
        prefix,
        "",
        "כדי לשמור על הגישה לכל תכונות הפרימיום, שדרגו את התוכנית שלכם:",
        pricingUrl,
        "",
        "צוות Cardigo",
        ...(unsubscribeUrl
            ? ["", "---", "לביטול הרשמה לקבלת עדכונים:", unsubscribeUrl]
            : []),
    ].join("\n");

    // --- HTML part -----------------------------------------------------------
    // Inline CSS only (email-client compatibility).
    // Logo block is conditionally rendered — no broken img if no URL.
    const logoBlock = cfg.trialReminderLogoUrl
        ? `<img src="${cfg.trialReminderLogoUrl}" alt="Cardigo" width="120" height="auto" style="display:block;margin:0 auto 24px auto;border:0;" />`
        : `<p style="margin:0 0 24px 0;font-size:20px;font-weight:bold;color:#1a1a1a;text-align:center;">Cardigo</p>`;

    const htmlPart = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,sans-serif;direction:rtl;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background-color:#ffffff;border-radius:8px;padding:40px 32px;">
          <tr><td style="text-align:center;padding-bottom:8px;">
            ${logoBlock}
          </td></tr>
          <tr><td style="padding-bottom:16px;">
            <p style="margin:0;font-size:16px;font-weight:bold;color:#1a1a1a;text-align:right;">${greetingHtml}</p>
          </td></tr>
          <tr><td style="padding-bottom:16px;">
            <h1 style="margin:0;font-size:22px;font-weight:bold;color:#1a1a1a;text-align:center;">${subject}</h1>
          </td></tr>
          <tr><td style="padding-bottom:24px;">
            <p style="margin:0;font-size:15px;line-height:1.6;color:#444444;text-align:center;">
              ${prefix}
            </p>
          </td></tr>
          <tr><td style="padding-bottom:24px;">
            <p style="margin:0;font-size:15px;line-height:1.6;color:#444444;text-align:center;">
              כדי לשמור על הגישה לכל תכונות הפרימיום, שדרגו את התוכנית שלכם עכשיו.
            </p>
          </td></tr>
          <tr><td style="text-align:center;padding-bottom:24px;">
            <a href="${pricingUrl}" style="display:inline-block;padding:14px 32px;background-color:#6c47ff;color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none;border-radius:6px;">עברו לפרימיום</a>
          </td></tr>
          <tr><td style="border-top:1px solid #e5e7eb;padding-top:16px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#aaaaaa;">צוות Cardigo</p>
          </td></tr>
          ${
              unsubscribeUrl
                  ? `<tr><td style="padding-top:12px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#bbbbbb;">לביטול הרשמה לקבלת עדכונים: <a href="${unsubscribeUrl}" style="color:#aaaaaa;">לחצו כאן לביטול הרשמה</a></p>
          </td></tr>`
                  : ""
          }
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const payload = {
        Messages: [
            {
                From: {
                    Email: cfg.fromEmail,
                    Name: cfg.fromName,
                },
                To: [{ Email: toEmailNormalized }],
                Subject: subject,
                TextPart: text,
                HTMLPart: htmlPart,
            },
        ],
    };

    const body = JSON.stringify(payload);

    try {
        const res = await httpsRequestJson({
            hostname: "api.mailjet.com",
            path: "/v3.1/send",
            method: "POST",
            timeoutMs: 10_000,
            headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(body),
            },
            body,
        });

        const ok = res.statusCode >= 200 && res.statusCode < 300;
        if (!ok) {
            console.error("[mailjet] trial-reminder send failed", {
                statusCode: res.statusCode,
                userId: String(userId || ""),
            });
        }

        return { ok };
    } catch (err) {
        console.error("[mailjet] trial-reminder send error", {
            userId: String(userId || ""),
            error: err?.message || err,
        });
        return { ok: false };
    }
}

// ---------------------------------------------------------------------------
// B2 deletion warning email — transactional.
// Sent to verified / no-card / inactive users as advance notice before possible
// account removal. This is a transactional notification, NOT a marketing email.
// Must NOT be gated on emailMarketingConsent.
// Must NOT use isMarketingOptOut or any unsubscribe logic.
// ---------------------------------------------------------------------------
export async function sendDeletionWarningEmailMailjetBestEffort({
    toEmail,
    loginUrl,
    graceUntil,
    firstName = null,
    userId,
}) {
    const cfg = getMailjetConfig();
    const toEmailNormalized = normalizeEmail(toEmail);

    if (!cfg.enabled) {
        return { ok: true, skipped: true, reason: "MAILJET_NOT_CONFIGURED" };
    }

    if (
        !toEmailNormalized ||
        !loginUrl ||
        !(graceUntil instanceof Date) ||
        isNaN(graceUntil.getTime())
    ) {
        return { ok: false, skipped: true, reason: "INVALID_INPUT" };
    }

    const auth = Buffer.from(`${cfg.apiKey}:${cfg.apiSecret}`).toString(
        "base64",
    );

    const subject = cfg.deletionWarningSubject;
    const prefix = cfg.deletionWarningTextPrefix;

    let formattedGrace;
    try {
        formattedGrace = graceUntil.toLocaleDateString("he-IL", {
            timeZone: "Asia/Jerusalem",
            day: "numeric",
            month: "long",
            year: "numeric",
        });
    } catch {
        formattedGrace = graceUntil.toISOString().slice(0, 10);
    }

    const trimmedFirstName =
        typeof firstName === "string" ? firstName.trim() : "";
    const greeting = trimmedFirstName ? `שלום, ${trimmedFirstName},` : "שלום,";

    const escapeHtml = (str) =>
        str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");

    const greetingHtml = trimmedFirstName
        ? `שלום, ${escapeHtml(trimmedFirstName)},`
        : "שלום,";

    // --- Text part -----------------------------------------------------------
    const text = [
        greeting,
        "",
        prefix,
        "",
        "חשבונך ב-Cardigo אומת אך לא נעשה בו שימוש פעיל.",
        "בהתאם למדיניות הפרטיות ותנאי השירות, חשבונות כאלה עשויים להיות מוסרים לאחר תקופת אי-שימוש.",
        "",
        `כדי למנוע את ההסרה, יש להיכנס לחשבון לפני ${formattedGrace}:`,
        loginUrl,
        "",
        "אם כבר התחברת לאחרונה, אפשר להתעלם מהודעה זו.",
        "",
        "הודעה זו נשלחת מסיבות תפעוליות.",
        "צוות Cardigo",
    ].join("\n");

    // --- HTML part -----------------------------------------------------------
    const htmlPart = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,sans-serif;direction:rtl;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background-color:#ffffff;border-radius:8px;padding:40px 32px;">
          <tr><td style="padding-bottom:16px;">
            <p style="margin:0;font-size:16px;font-weight:bold;color:#1a1a1a;text-align:right;">${greetingHtml}</p>
          </td></tr>
          <tr><td style="padding-bottom:16px;">
            <h1 style="margin:0;font-size:20px;font-weight:bold;color:#1a1a1a;text-align:center;">${escapeHtml(subject)}</h1>
          </td></tr>
          <tr><td style="padding-bottom:16px;">
            <p style="margin:0;font-size:14px;line-height:1.6;color:#444444;text-align:center;">${escapeHtml(prefix)}</p>
          </td></tr>
          <tr><td style="padding-bottom:16px;">
            <p style="margin:0;font-size:14px;line-height:1.6;color:#444444;text-align:center;">
              חשבונך ב-Cardigo אומת אך לא נעשה בו שימוש פעיל.<br />בהתאם למדיניות הפרטיות ותנאי השירות, חשבונות כאלה עשויים להיות מוסרים לאחר תקופת אי-שימוש.
            </p>
          </td></tr>
          <tr><td style="padding-bottom:24px;">
            <p style="margin:0;font-size:14px;line-height:1.6;color:#444444;text-align:center;">
              כדי למנוע את ההסרה, יש להיכנס לחשבון לפני <strong>${escapeHtml(formattedGrace)}</strong>.
            </p>
          </td></tr>
          <tr><td style="text-align:center;padding-bottom:24px;">
            <a href="${loginUrl}" style="display:inline-block;padding:14px 32px;background-color:#6c47ff;color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none;border-radius:6px;">כניסה לחשבון</a>
          </td></tr>
          <tr><td style="padding-bottom:16px;">
            <p style="margin:0;font-size:13px;line-height:1.6;color:#666666;text-align:center;">
              אם כבר התחברת לאחרונה, אפשר להתעלם מהודעה זו.
            </p>
          </td></tr>
          <tr><td style="border-top:1px solid #e5e7eb;padding-top:16px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#aaaaaa;">הודעה זו נשלחת מסיבות תפעוליות. צוות Cardigo</p>
          </td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const payload = {
        Messages: [
            {
                From: {
                    Email: cfg.fromEmail,
                    Name: cfg.fromName,
                },
                To: [{ Email: toEmailNormalized }],
                Subject: subject,
                TextPart: text,
                HTMLPart: htmlPart,
            },
        ],
    };

    const body = JSON.stringify(payload);

    try {
        const res = await httpsRequestJson({
            hostname: "api.mailjet.com",
            path: "/v3.1/send",
            method: "POST",
            timeoutMs: 10_000,
            headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(body),
            },
            body,
        });

        const ok = res.statusCode >= 200 && res.statusCode < 300;
        if (!ok) {
            console.error("[mailjet] deletion-warning send failed", {
                statusCode: res.statusCode,
                userId: String(userId || ""),
            });
        }

        return { ok };
    } catch (err) {
        console.error("[mailjet] deletion-warning send error", {
            userId: String(userId || ""),
            error: err?.message || err,
        });
        return { ok: false };
    }
}

// ---------------------------------------------------------------------------
// [5.10a.3.2] Failed renewal email — transactional billing notification.
// Sent best-effort when a genuine recurring STO charge is rejected by provider
// (path 5.A, Response !== "000"). Must never block webhook ACK.
// Primary CTA: self-serve renew via /pricing. Support is secondary only.
// ---------------------------------------------------------------------------
export async function sendRenewalFailedEmailMailjetBestEffort({
    toEmail,
    firstName = null,
    expiresAt = null,
    pricingUrl,
    userId,
}) {
    const cfg = getMailjetConfig();
    const toEmailNormalized = normalizeEmail(toEmail);

    if (!cfg.enabled) {
        return { ok: true, skipped: true, reason: "MAILJET_NOT_CONFIGURED" };
    }

    if (!toEmailNormalized || !pricingUrl) {
        return { ok: false, skipped: true, reason: "INVALID_INPUT" };
    }

    const auth = Buffer.from(`${cfg.apiKey}:${cfg.apiSecret}`).toString(
        "base64",
    );

    const subject = cfg.renewalFailedSubject;
    const prefix = cfg.renewalFailedTextPrefix;

    // --- expiresAt formatting ------------------------------------------------
    // null → omit the date line entirely from both TextPart and HTMLPart.
    let formattedExpiry = null;
    if (expiresAt instanceof Date && !isNaN(expiresAt.getTime())) {
        try {
            formattedExpiry = expiresAt.toLocaleDateString("he-IL", {
                timeZone: "Asia/Jerusalem",
                day: "numeric",
                month: "long",
                year: "numeric",
            });
        } catch {
            formattedExpiry = expiresAt.toISOString().slice(0, 10);
        }
    }

    // --- HTML output safety --------------------------------------------------
    // Escape user-controlled firstName and subject before inserting into HTMLPart.
    // pricingUrl is server-built from getSiteUrl() — not user-supplied, not escaped.
    const escapeHtml = (str) =>
        str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");

    const trimmedFirstName =
        typeof firstName === "string" ? firstName.trim() : "";
    const greeting = trimmedFirstName ? `שלום, ${trimmedFirstName},` : "שלום,";
    const greetingHtml = trimmedFirstName
        ? `שלום, ${escapeHtml(trimmedFirstName)},`
        : "שלום,";

    // --- Text part -----------------------------------------------------------
    const expiryTextLine = formattedExpiry
        ? `גישת Premium שלך פעילה עד ${formattedExpiry}.`
        : null;

    const text = [
        greeting,
        "",
        prefix,
        ...(expiryTextLine ? ["", expiryTextLine] : []),
        "",
        "לחידוש Premium, פתחו את הקישור:",
        pricingUrl,
        "",
        "לשאלות, פנו לתמיכה: support@cardigo.co.il",
        "",
        "צוות Cardigo",
    ].join("\n");

    // --- HTML part -----------------------------------------------------------
    const expiryHtmlBlock = formattedExpiry
        ? `<tr><td style="padding-bottom:16px;">
            <p style="margin:0;font-size:15px;line-height:1.6;color:#444444;text-align:center;">
              גישת Premium שלך פעילה עד <strong>${escapeHtml(formattedExpiry)}</strong>.
            </p>
          </td></tr>`
        : "";

    const htmlPart = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,sans-serif;direction:rtl;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background-color:#ffffff;border-radius:8px;padding:40px 32px;">
          <tr><td style="padding-bottom:16px;">
            <p style="margin:0;font-size:16px;font-weight:bold;color:#1a1a1a;text-align:right;">${greetingHtml}</p>
          </td></tr>
          <tr><td style="padding-bottom:16px;">
            <h1 style="margin:0;font-size:22px;font-weight:bold;color:#1a1a1a;text-align:center;">${escapeHtml(subject)}</h1>
          </td></tr>
          <tr><td style="padding-bottom:16px;">
            <p style="margin:0;font-size:15px;line-height:1.6;color:#444444;text-align:center;">
              ${escapeHtml(prefix)}
            </p>
          </td></tr>
          ${expiryHtmlBlock}
          <tr><td style="text-align:center;padding-bottom:24px;">
            <a href="${pricingUrl}" style="display:inline-block;padding:14px 32px;background-color:#6c47ff;color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none;border-radius:6px;">חדש פרימיום עכשיו</a>
          </td></tr>
          <tr><td style="padding-bottom:16px;">
            <p style="margin:0;font-size:13px;line-height:1.6;color:#666666;text-align:center;">
              לשאלות, פנו לתמיכה:
              <a href="mailto:support@cardigo.co.il" style="color:#6c47ff;text-decoration:none;">support@cardigo.co.il</a>
            </p>
          </td></tr>
          <tr><td style="border-top:1px solid #e5e7eb;padding-top:16px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#aaaaaa;">צוות Cardigo</p>
          </td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const payload = {
        Messages: [
            {
                From: {
                    Email: cfg.fromEmail,
                    Name: cfg.fromName,
                },
                To: [{ Email: toEmailNormalized }],
                Subject: subject,
                TextPart: text,
                HTMLPart: htmlPart,
            },
        ],
    };

    const body = JSON.stringify(payload);

    try {
        const res = await httpsRequestJson({
            hostname: "api.mailjet.com",
            path: "/v3.1/send",
            method: "POST",
            timeoutMs: 10_000,
            headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(body),
            },
            body,
        });

        const ok = res.statusCode >= 200 && res.statusCode < 300;
        if (!ok) {
            console.error("[mailjet] renewal-failed send failed", {
                statusCode: res.statusCode,
                userId: String(userId || ""),
            });
        }

        return { ok };
    } catch (err) {
        console.error("[mailjet] renewal-failed send error", {
            userId: String(userId || ""),
            error: err?.message || err,
        });
        return { ok: false };
    }
}

// ---------------------------------------------------------------------------
// Marketing test-send (admin-only, one email to admin_self).
// Additive: does not alter any existing sender above.
// ---------------------------------------------------------------------------

/**
 * Lightweight enabled probe so callers can short-circuit BEFORE minting an
 * unsubscribe token. Mirrors getMailjetConfig().enabled without exposing
 * secrets.
 * @returns {boolean}
 */
export function isMailjetEnabled() {
    return getMailjetConfig().enabled;
}

/**
 * Best-effort marketing test-send. Sends exactly one email with the same
 * Messages[] shape used by the transactional senders. No List-Unsubscribe
 * header and no SandboxMode in this slice.
 *
 * @param {{ toEmail: string, subject: string, htmlPart: string, textPart: string }} args
 * @returns {Promise<{ ok: boolean, skipped?: boolean, reason?: string }>}
 */
export async function sendMarketingTestEmailBestEffort({
    toEmail,
    subject,
    htmlPart,
    textPart,
}) {
    const cfg = getMailjetConfig();
    const toEmailNormalized = normalizeEmail(toEmail);

    if (!cfg.enabled) {
        return { ok: true, skipped: true, reason: "MAILJET_NOT_CONFIGURED" };
    }

    if (
        !toEmailNormalized ||
        typeof subject !== "string" ||
        !subject ||
        typeof htmlPart !== "string" ||
        !htmlPart ||
        typeof textPart !== "string" ||
        !textPart
    ) {
        return { ok: false, skipped: true, reason: "INVALID_INPUT" };
    }

    const auth = Buffer.from(`${cfg.apiKey}:${cfg.apiSecret}`).toString(
        "base64",
    );

    const payload = {
        Messages: [
            {
                From: {
                    Email: cfg.fromEmail,
                    Name: cfg.fromName,
                },
                To: [{ Email: toEmailNormalized }],
                Subject: subject,
                TextPart: textPart,
                HTMLPart: htmlPart,
            },
        ],
    };

    const body = JSON.stringify(payload);

    try {
        const res = await httpsRequestJson({
            hostname: "api.mailjet.com",
            path: "/v3.1/send",
            method: "POST",
            timeoutMs: 10_000,
            headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(body),
            },
            body,
        });

        const ok = res.statusCode >= 200 && res.statusCode < 300;
        if (!ok) {
            console.error("[mailjet] marketing test-send failed", {
                statusCode: res.statusCode,
            });
        }

        return { ok };
    } catch (err) {
        console.error("[mailjet] marketing test-send error", {
            error: err?.message || err,
        });
        return { ok: false };
    }
}

// ---------------------------------------------------------------------------
// Marketing campaign per-recipient send (v1 — one recipient per call).
//
// SAFETY:
//   - Exactly one recipient in Messages[]. No batch.
//   - CustomID (Mailjet deduplication within provider window) = recipientRowId.
//   - List-Unsubscribe / List-Unsubscribe-Post headers for RFC 2369 compliance.
//   - Never logs toEmail, subject, html, text, unsubscribeUrl, or raw
//     provider response body.
//   - Returns a safe shape only: providerMessageId (safe label), providerStatus
//     (coarse label), providerErrorSafe (bounded string, never raw body).
//   - If Mailjet not configured: { ok:false, reason:"MAILJET_NOT_CONFIGURED",
//     providerStatus:"skipped" } — no throw.
// ---------------------------------------------------------------------------

/**
 * Send exactly one marketing campaign email to one recipient.
 *
 * @param {{
 *   toEmail: string,
 *   subject: string,
 *   htmlPart: string,
 *   textPart: string,
 *   customId: string,
 *   unsubscribeUrl: string,
 * }} args
 * @returns {Promise<
 *   | { ok: true, providerMessageId: string|null, providerStatus: "accepted" }
 *   | { ok: false, reason: string, providerStatus: string, providerErrorSafe: string }
 * >}
 */
export async function sendMarketingCampaignEmailBestEffort({
    toEmail,
    subject,
    htmlPart,
    textPart,
    customId,
    unsubscribeUrl,
}) {
    const cfg = getMailjetConfig();
    const toEmailNormalized = normalizeEmail(toEmail);

    if (!cfg.enabled) {
        return {
            ok: false,
            reason: "MAILJET_NOT_CONFIGURED",
            providerStatus: "skipped",
            providerErrorSafe: "MAILJET_NOT_CONFIGURED",
        };
    }

    if (
        !toEmailNormalized ||
        typeof subject !== "string" ||
        !subject.trim() ||
        typeof htmlPart !== "string" ||
        !htmlPart ||
        typeof textPart !== "string" ||
        !textPart
    ) {
        return {
            ok: false,
            reason: "INVALID_INPUT",
            providerStatus: "skipped",
            providerErrorSafe: "INVALID_INPUT",
        };
    }

    const auth = Buffer.from(`${cfg.apiKey}:${cfg.apiSecret}`).toString(
        "base64",
    );

    // List-Unsubscribe headers for RFC 2369 / RFC 8058 compliance.
    // Required for bulk/marketing emails to avoid spam classification.
    const headers = {};
    if (typeof unsubscribeUrl === "string" && unsubscribeUrl) {
        headers["List-Unsubscribe"] = `<${unsubscribeUrl}>`;
        headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
    }

    // One recipient only — no batch. CustomID for Mailjet deduplication.
    const message = {
        From: { Email: cfg.fromEmail, Name: cfg.fromName },
        To: [{ Email: toEmailNormalized }],
        Subject: subject,
        TextPart: textPart,
        HTMLPart: htmlPart,
    };
    if (typeof customId === "string" && customId) {
        message.CustomID = customId;
    }
    if (Object.keys(headers).length > 0) {
        message.Headers = headers;
    }

    const payload = { Messages: [message] };
    const body = JSON.stringify(payload);

    try {
        const res = await httpsRequestJson({
            hostname: "api.mailjet.com",
            path: "/v3.1/send",
            method: "POST",
            timeoutMs: 15_000,
            headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(body),
            },
            body,
        });

        const ok = res.statusCode >= 200 && res.statusCode < 300;

        // Safe parse: extract providerMessageId only.
        // Do NOT log or persist the raw response body.
        let providerMessageId = null;
        try {
            const parsed = JSON.parse(res.bodyText);
            const msgId = parsed?.Messages?.[0]?.To?.[0]?.MessageID;
            if (msgId !== undefined && msgId !== null) {
                providerMessageId = String(msgId).slice(0, 200);
            }
        } catch {
            // Unparseable response — leave providerMessageId null.
        }

        if (ok) {
            return { ok: true, providerMessageId, providerStatus: "accepted" };
        }

        // Failure path: extract a safe bounded error label from the response.
        // Never expose or persist the raw provider body.
        let providerErrorSafe = "REJECTED";
        try {
            const parsed = JSON.parse(res.bodyText);
            const errMsg =
                parsed?.ErrorMessage ||
                parsed?.Messages?.[0]?.Errors?.[0]?.ErrorMessage;
            if (typeof errMsg === "string" && errMsg.trim()) {
                providerErrorSafe = errMsg.trim().slice(0, 200);
            }
        } catch {
            // Unparseable — use default label.
        }

        // Log only safe identifiers — never email, body, or token.
        console.error("[mailjet] campaign send failed", {
            statusCode: res.statusCode,
            customId: String(customId || ""),
        });
        return {
            ok: false,
            reason: "PROVIDER_REJECTED",
            providerStatus: "rejected",
            providerErrorSafe,
        };
    } catch (err) {
        // Log only safe identifiers.
        console.error("[mailjet] campaign send error", {
            customId: String(customId || ""),
            error: err?.message || err,
        });
        return {
            ok: false,
            reason: "PROVIDER_ERROR",
            providerStatus: "error",
            providerErrorSafe: "PROVIDER_CALL_FAILED",
        };
    }
}
