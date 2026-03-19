import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { ABOUT_PARAGRAPHS_MAX } from "../config/about.js";

// --- Config ----------------------------------------------------------------

const ALLOWED_MODELS = new Set(["gemini-2.5-flash-lite", "gemini-2.5-flash"]);
const DEFAULT_MODEL = "gemini-2.5-flash-lite";
const REQUEST_TIMEOUT_MS = 15_000;
const ABOUT_TITLE_MAX_LENGTH = 120;
const ABOUT_PARAGRAPH_MAX_LENGTH = 2000;

function resolveModel() {
    const raw = String(process.env.GEMINI_MODEL ?? "").trim();
    return ALLOWED_MODELS.has(raw) ? raw : DEFAULT_MODEL;
}

// --- Lazy singleton client --------------------------------------------------

let _genAI = null;

function getClient() {
    if (_genAI) return _genAI;

    const apiKey = String(process.env.GEMINI_API_KEY ?? "").trim();
    if (!apiKey) {
        throw Object.assign(new Error("GEMINI_API_KEY is not configured"), {
            code: "AI_UNAVAILABLE",
        });
    }

    _genAI = new GoogleGenerativeAI(apiKey);
    return _genAI;
}

// --- Structured output schema -----------------------------------------------

const aboutResponseSchema = {
    type: SchemaType.OBJECT,
    properties: {
        aboutTitle: {
            type: SchemaType.STRING,
            description:
                "A short, compelling title for the About section of a digital business card. Plain text only.",
        },
        aboutParagraphs: {
            type: SchemaType.ARRAY,
            description:
                "Up to 3 paragraphs of plain text describing the business or professional. No markdown, no HTML.",
            items: { type: SchemaType.STRING },
        },
    },
    required: ["aboutTitle", "aboutParagraphs"],
};

// --- System instruction -----------------------------------------------------

const SYSTEM_INSTRUCTION = `You are a professional Hebrew-first copywriter specializing in digital business cards.

TASK: Generate the "About" section for a digital business card.

RULES — follow strictly:
- Write in the requested language (default: Hebrew).
- Output ONLY plain text. No markdown, no HTML, no bullet points, no lists, no formatting.
- aboutTitle: one short, compelling headline (max ${ABOUT_TITLE_MAX_LENGTH} chars).
- aboutParagraphs: 1 to ${ABOUT_PARAGRAPHS_MAX} concise paragraphs.
- Each paragraph should be a flowing sentence or two, not a header or list.
- Be concise, professional, and business-appropriate.
- Do NOT exaggerate, invent credentials, or make unverifiable claims.
- Do NOT include contact details, phone numbers, or URLs.
- If existing content is provided for improvement, preserve factual accuracy while improving style and clarity.
- If information is minimal, write a brief but professional placeholder text.`;

// --- Prompt builder ---------------------------------------------------------

function buildUserPrompt({
    businessName,
    category,
    slogan,
    language,
    mode,
    existingAbout,
}) {
    const lang = language === "en" ? "English" : "Hebrew";
    const parts = [`Language: ${lang}`];

    if (businessName) parts.push(`Business name: ${businessName}`);
    if (category) parts.push(`Category/field: ${category}`);
    if (slogan) parts.push(`Slogan: ${slogan}`);

    if (mode === "improve" && existingAbout) {
        parts.push("");
        parts.push("EXISTING ABOUT TEXT TO IMPROVE:");
        if (existingAbout.title) parts.push(`Title: ${existingAbout.title}`);
        if (
            Array.isArray(existingAbout.paragraphs) &&
            existingAbout.paragraphs.length
        ) {
            parts.push(`Text:\n${existingAbout.paragraphs.join("\n\n")}`);
        }
        parts.push("");
        parts.push(
            "Rewrite the above to be more compelling and professional. Keep the same factual content.",
        );
    } else {
        parts.push("");
        parts.push(
            "Create a new About section from scratch based on the business information above.",
        );
    }

    return parts.join("\n");
}

// --- Normalize output -------------------------------------------------------

function normalizeAboutSuggestion(raw) {
    if (!raw || typeof raw !== "object") return null;

    let title = typeof raw.aboutTitle === "string" ? raw.aboutTitle.trim() : "";
    if (title.length > ABOUT_TITLE_MAX_LENGTH) {
        title = title.slice(0, ABOUT_TITLE_MAX_LENGTH);
    }

    const rawParagraphs = Array.isArray(raw.aboutParagraphs)
        ? raw.aboutParagraphs
        : [];
    const paragraphs = rawParagraphs
        .map((p) => (typeof p === "string" ? p.trim() : ""))
        .filter(Boolean)
        .slice(0, ABOUT_PARAGRAPHS_MAX)
        .map((p) =>
            p.length > ABOUT_PARAGRAPH_MAX_LENGTH
                ? p.slice(0, ABOUT_PARAGRAPH_MAX_LENGTH)
                : p,
        );

    if (!title && paragraphs.length === 0) return null;

    return { aboutTitle: title, aboutParagraphs: paragraphs };
}

// --- Public API -------------------------------------------------------------

/**
 * Generate an About section suggestion via Gemini.
 *
 * @param {object} params
 * @param {string} [params.businessName]
 * @param {string} [params.category]
 * @param {string} [params.slogan]
 * @param {"he"|"en"} [params.language="he"]
 * @param {"create"|"improve"} [params.mode="create"]
 * @param {{ title?: string, paragraphs?: string[] }} [params.existingAbout]
 * @returns {Promise<{ aboutTitle: string, aboutParagraphs: string[] }>}
 */
export async function generateAboutSuggestion({
    businessName,
    category,
    slogan,
    language = "he",
    mode = "create",
    existingAbout,
} = {}) {
    const client = getClient();
    const modelName = resolveModel();

    const model = client.getGenerativeModel({
        model: modelName,
        systemInstruction: SYSTEM_INSTRUCTION,
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: aboutResponseSchema,
            temperature: 0.7,
            maxOutputTokens: 1024,
        },
    });

    const prompt = buildUserPrompt({
        businessName,
        category,
        slogan,
        language,
        mode,
        existingAbout,
    });

    // Hard timeout via AbortController.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let result;
    try {
        result = await model.generateContent(
            { contents: [{ role: "user", parts: [{ text: prompt }] }] },
            { signal: controller.signal },
        );
    } catch (err) {
        if (err?.name === "AbortError" || err?.code === "ABORT_ERR") {
            throw Object.assign(new Error("Gemini request timed out"), {
                code: "AI_UNAVAILABLE",
            });
        }
        throw Object.assign(
            new Error(`Gemini API error: ${err?.message || "unknown"}`),
            { code: "AI_UNAVAILABLE" },
        );
    } finally {
        clearTimeout(timer);
    }

    const text = result?.response?.text?.();
    if (!text) {
        throw Object.assign(new Error("Empty response from Gemini"), {
            code: "INVALID_SUGGESTION",
        });
    }

    let parsed;
    try {
        parsed = JSON.parse(text);
    } catch {
        throw Object.assign(new Error("Gemini returned invalid JSON"), {
            code: "INVALID_SUGGESTION",
        });
    }

    const suggestion = normalizeAboutSuggestion(parsed);
    if (!suggestion) {
        throw Object.assign(new Error("Gemini returned unusable suggestion"), {
            code: "INVALID_SUGGESTION",
        });
    }

    return suggestion;
}
