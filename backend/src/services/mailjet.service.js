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
                toEmail: toEmailNormalized,
            });
        }

        return { ok };
    } catch (err) {
        console.error("[mailjet] invite send error", {
            orgId: String(orgId || ""),
            inviteId: String(inviteId || ""),
            toEmail: toEmailNormalized,
            error: err?.message || err,
        });
        return { ok: false };
    }
}
