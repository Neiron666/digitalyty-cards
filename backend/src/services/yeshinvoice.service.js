/**
 * YeshInvoice service adapter — pure HTTP client, no DB writes.
 *
 * This module only wraps the YeshInvoice API. Persistence (Receipt writes)
 * is the caller's responsibility. All exported functions return a bounded
 * normalized result object and never throw to the caller.
 *
 * Auth scheme: Authorization: JSON.stringify({ secret, userkey })
 * (literal JSON string, NOT "Bearer" or "Basic")
 *
 * Env vars consumed (all required when YESH_INVOICE_ENABLED=true):
 *   YESH_INVOICE_SECRET   — YeshInvoice API secret
 *   YESH_INVOICE_USERKEY  — YeshInvoice API userkey
 *   YESH_INVOICE_API_BASE — optional override, defaults to https://api.yeshinvoice.co.il
 */

import crypto from "crypto";

// ── Constants ────────────────────────────────────────────────────────────────

const DOCUMENT_TYPE_RECEIPT = 6; // קבלה — VAT-exempt (עוסק פטור)
const CURRENCY_ILS = 2;
const LANG_HE = 359;
const VAT_TYPE_EXEMPT = 4; // ללא מע"מ

// ── Helpers ──────────────────────────────────────────────────────────────────

function getApiBase() {
    return (
        process.env.YESH_INVOICE_API_BASE ?? "https://api.yeshinvoice.co.il"
    ).replace(/\/$/, "");
}

function buildAuthHeader() {
    return JSON.stringify({
        secret: process.env.YESH_INVOICE_SECRET,
        userkey: process.env.YESH_INVOICE_USERKEY,
    });
}

/**
 * Derives a deterministic 20-char DocumentUniqueKey from providerTxnId.
 * Used for idempotency on the YeshInvoice side.
 *
 * @param {string|number} providerTxnId — Tranzila internal transaction ID
 * @returns {string} 20-char hex prefix of SHA-256
 */
export function buildYeshInvoiceDocumentUniqueKey(providerTxnId) {
    return crypto
        .createHash("sha256")
        .update(String(providerTxnId))
        .digest("hex")
        .slice(0, 20);
}

// Format a Date as yyyy-MM-dd HH:mm for YeshInvoice document datetime fields (DateCreated, MaxDate).
function toYIDateTime(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${d} ${hh}:${mm}`;
}

// Format a Date as yyyy-MM-dd for YeshInvoice payment date fields (DueDate).
function toYIDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

// Strip HTML/XML-looking tags from a string before sending to YeshInvoice free-text fields.
// Applied only at document-build time — does not mutate stored user data.
// null/undefined → "". Tags stripped. Whitespace collapsed to single space. Result trimmed.
function stripHtmlForYeshInvoiceText(value) {
    if (typeof value !== "string") return value ?? "";
    return value
        .replace(/<[^>]*>/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Builds the frozen request body for document creation / preview.
 * Business rules (non-negotiable):
 *   DocumentType = 6  (קבלה, VAT-exempt)
 *   vatPercentage = 0
 *   items[].vatType  = 4  (ללא מע"מ)
 *   SendEmail = false, SendSMS = false at creation time
 *   Sharing is a separate step via shareReceiptYeshInvoice
 *   Customer.ID = -1 (no stored YeshInvoice customer)
 *   payments[].TypeID = 3 (credit card)
 *
 * @param {object} params
 * @param {string} params.documentUniqueKey       — 20-char unique key
 * @param {object} params.customer                — structured customer object
 * @param {string} params.customer.name           — display name on the receipt
 * @param {string} params.customer.email          — customer email
 * @param {string} [params.customer.countryCode]  — ISO country code (default "IL")
 * @param {string} [params.customer.nameInvoice]  — name on invoice (optional)
 * @param {string} [params.customer.fullName]     — full legal name (optional)
 * @param {string} [params.customer.numberId]     — ID number (optional)
 * @param {string} [params.customer.address]      — address (optional)
 * @param {string} [params.customer.city]         — city (optional)
 * @param {string} [params.customer.zipCode]      — zip code (optional)
 * @param {number} params.amountAgorot            — total in agorot (integer)
 * @param {string} params.description             — line item name (e.g. "מנוי Cardigo - חודשי")
 * @returns {object}
 */
function buildReceiptBody({
    documentUniqueKey,
    customer,
    amountAgorot,
    description,
}) {
    const amountILS = amountAgorot / 100;
    const today = new Date();
    const dateTimeStr = toYIDateTime(today);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 30);
    const maxDateTimeStr = toYIDateTime(maxDate);
    const dueDateStr = toYIDate(today);

    const yiCustomer = {
        ID: -1,
        Name:
            stripHtmlForYeshInvoiceText(customer.name) || customer.email || "",
        EmailAddress: customer.email || "",
        CountryCode: customer.countryCode || "IL",
    };
    if (customer.nameInvoice)
        yiCustomer.NameInvoice = stripHtmlForYeshInvoiceText(
            customer.nameInvoice,
        );
    if (customer.fullName)
        yiCustomer.FullName = stripHtmlForYeshInvoiceText(customer.fullName);
    if (customer.numberId) yiCustomer.NumberID = customer.numberId;
    if (customer.address)
        yiCustomer.Address = stripHtmlForYeshInvoiceText(customer.address);
    if (customer.city)
        yiCustomer.City = stripHtmlForYeshInvoiceText(customer.city);
    if (customer.zipCode) yiCustomer.ZipCode = customer.zipCode;

    return {
        DocumentType: DOCUMENT_TYPE_RECEIPT,
        DocumentUniqueKey: documentUniqueKey,
        CurrencyID: CURRENCY_ILS,
        LangID: LANG_HE,
        vatPercentage: 0,
        SendEmail: false,
        SendSMS: false,
        ExchangeRate: 1,
        roundPrice: 0,
        RoundPriceAuto: false,
        DateCreated: dateTimeStr,
        MaxDate: maxDateTimeStr,
        statusID: 1,
        isDraft: false,
        Customer: yiCustomer,
        items: [
            {
                Name: description,
                Quantity: 1,
                Price: amountILS,
                vatType: VAT_TYPE_EXEMPT,
                SkuID: -1,
            },
        ],
        payments: [
            {
                Price: amountILS,
                TypeID: 3,
                NumberofPayments: 1,
                DueDate: dueDateStr,
                CardType: -1,
                TransactionType: -1,
            },
        ],
    };
}

// ── Internal HTTP caller ─────────────────────────────────────────────────────

async function yiPost(path, body, timeoutMs) {
    const url = `${getApiBase()}${path}`;
    const res = await fetch(url, {
        method: "POST",
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
            "Content-Type": "application/json",
            Authorization: buildAuthHeader(),
        },
        body: JSON.stringify(body),
    });

    let raw = null;
    try {
        raw = await res.json();
    } catch {
        // Non-JSON body (e.g. HTML error page) — preserve status/ok, raw stays null.
    }
    return { status: res.status, ok: res.ok, raw };
}

// ── Exported functions ───────────────────────────────────────────────────────

/**
 * Preview a receipt document via YeshInvoice createDocumentPreview.
 * Used for smoke-testing / preflight validation without committing a document.
 *
 * @param {object} params                   — same shape as buildReceiptBody params
 * @param {string} params.documentUniqueKey — 20-char unique key
 * @param {object} params.customer          — structured customer object (see buildReceiptBody)
 * @param {number} params.amountAgorot      — total in agorot
 * @param {string} params.description       — line item name
 * @returns {{ ok: boolean, raw: object, error?: string }}
 */
export async function previewReceiptYeshInvoice(params) {
    try {
        const body = buildReceiptBody(params);
        const {
            ok: httpOk,
            status: httpStatus,
            raw,
        } = await yiPost("/api/v1.1/createDocumentPreview", body, 15_000);

        // Normalize: HTTP non-2xx OR API-level Success:false → ok:false
        // API returns { Success: bool, ErrorMessage: string, ReturnValue: ... }
        const ok = httpOk && raw?.Success !== false;
        return { ok, httpStatus, raw };
    } catch (err) {
        return {
            ok: false,
            httpStatus: null,
            raw: null,
            error: String(err?.message ?? err),
        };
    }
}

/**
 * Create a receipt document via YeshInvoice createDocument.
 *
 * Returns a normalized result. The caller is responsible for persisting
 * the result to the Receipt collection.
 *
 * @param {object} params                   — same shape as buildReceiptBody params
 * @param {string} params.documentUniqueKey — 20-char unique key
 * @param {object} params.customer          — structured customer object (see buildReceiptBody)
 * @param {number} params.amountAgorot      — total in agorot
 * @param {string} params.description       — line item name
 * @returns {{ ok: boolean, providerDocId: number|null, providerDocNumber: number|null, pdfUrl: string|null, documentUrl: string|null, raw: object|null, error?: string }}
 */
export async function createReceiptYeshInvoice(params) {
    try {
        const body = buildReceiptBody(params);
        const { ok, raw } = await yiPost(
            "/api/v1.1/createDocument",
            body,
            15_000,
        );

        if (!ok || !raw?.Success) {
            return {
                ok: false,
                providerDocId: null,
                providerDocNumber: null,
                pdfUrl: null,
                documentUrl: null,
                raw,
                error: raw?.ErrorMessage ?? `HTTP ok=${ok}`,
            };
        }

        return {
            ok: true,
            providerDocId: raw.ReturnValue?.id ?? null,
            providerDocNumber: raw.ReturnValue?.docNumber ?? null,
            pdfUrl: raw.ReturnValue?.pdfurl ?? null,
            documentUrl: raw.ReturnValue?.url ?? null,
            raw,
        };
    } catch (err) {
        return {
            ok: false,
            providerDocId: null,
            providerDocNumber: null,
            pdfUrl: null,
            documentUrl: null,
            raw: null,
            error: String(err?.message ?? err),
        };
    }
}

/**
 * Share a receipt document via YeshInvoice shareDocument (email only).
 * Must be called AFTER createReceiptYeshInvoice returns ok=true.
 *
 * @param {object} params
 * @param {number} params.providerDocId — numeric doc ID returned by createDocument
 * @param {string} params.customerEmail — recipient
 * @returns {{ ok: boolean, raw: object|null, error?: string }}
 */
export async function shareReceiptYeshInvoice({
    providerDocId,
    customerEmail,
}) {
    try {
        const body = {
            id: providerDocId,
            SendEmail: true,
            SendSMS: false,
            email: customerEmail,
        };

        const { ok, raw } = await yiPost("/api/v1/shareDocument", body, 10_000);

        if (!ok || !raw?.Success) {
            return {
                ok: false,
                raw,
                error: raw?.ErrorMessage ?? `HTTP ok=${ok}`,
            };
        }

        return { ok: true, raw };
    } catch (err) {
        return { ok: false, raw: null, error: String(err?.message ?? err) };
    }
}
