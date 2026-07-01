const ARTICLE_INQUIRY_ENDPOINT = "/api/site-inquiries/article";

/**
 * Submit an article page inquiry to the backend.
 * Uses raw fetch — not the axios api client.
 * Never throws for normal request failures; returns { ok: false, code, message } instead.
 *
 * @param {{ name: string, phone: string, email: string, sourcePath: string, sourceTitle: string, consent: boolean, hp: string }} payload
 * @returns {Promise<{ ok: true } | { ok: false, code: string, message: string }>}
 */
export async function submitArticleInquiry({
    name,
    phone,
    email,
    sourcePath,
    sourceTitle,
    consent,
    hp,
}) {
    try {
        const res = await fetch(ARTICLE_INQUIRY_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Requested-With": "XMLHttpRequest",
            },
            credentials: "include",
            body: JSON.stringify({
                name,
                phone,
                email,
                sourcePath,
                sourceTitle,
                consent,
                hp,
            }),
        });

        let body = {};
        try {
            body = await res.json();
        } catch {
            // Non-JSON response body — fall through to error path below.
        }

        if (res.ok && body.ok === true) {
            return { ok: true };
        }

        return {
            ok: false,
            code: body.code || "REQUEST_FAILED",
            message:
                body.message ||
                "שגיאה בשליחת הפנייה. אפשר לנסות שוב או לפנות אלינו בוואטסאפ.",
        };
    } catch {
        return {
            ok: false,
            code: "NETWORK_ERROR",
            message:
                "שגיאה בשליחת הפנייה. אפשר לנסות שוב או לפנות אלינו בוואטסאפ.",
        };
    }
}
