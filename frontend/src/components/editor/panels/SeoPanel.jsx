import { useMemo, useState } from "react";
import Panel from "./Panel";
import formStyles from "../../ui/Form.module.css";
import styles from "./SeoPanel.module.css";

function isValidAbsoluteHttpUrl(value) {
    const v = typeof value === "string" ? value.trim() : "";
    if (!v) return false;
    try {
        const u = new URL(v);
        return u.protocol === "http:" || u.protocol === "https:";
    } catch {
        return false;
    }
}

function getUrlHost(value) {
    const v = typeof value === "string" ? value.trim() : "";
    if (!v) return "";
    try {
        const u = new URL(v);
        return String(u.host || "");
    } catch {
        return "";
    }
}

function getPublicOrigin() {
    const envOrigin = String(import.meta.env.VITE_PUBLIC_ORIGIN || "").trim();
    if (envOrigin) return envOrigin.replace(/\/$/, "");
    try {
        if (typeof window !== "undefined" && window.location?.origin) {
            return String(window.location.origin).trim().replace(/\/$/, "");
        }
    } catch {
        // ignore
    }
    return "";
}

function normalizePathLeadingSlash(value) {
    const raw = typeof value === "string" ? value.trim() : "";
    if (!raw) return "";
    if (raw.startsWith("/")) return raw;
    return `/${raw}`;
}

export default function SeoPanel({
    seo,
    publicPath,
    slug,
    displayName,
    disabled,
    onChange,
}) {
    const value = seo || {};
    const [jsonLdTemplateType, setJsonLdTemplateType] =
        useState("LocalBusiness");

    const computedPublicUrl = useMemo(() => {
        const origin = getPublicOrigin();
        const path =
            (typeof publicPath === "string" && publicPath.trim()
                ? normalizePathLeadingSlash(publicPath)
                : slug
                  ? `/card/${String(slug).trim()}`
                  : "") || "";

        if (!origin || !path) return "";
        return `${origin}${path}`;
    }, [publicPath, slug]);

    const canonicalTrimmed =
        typeof value.canonicalUrl === "string" ? value.canonicalUrl.trim() : "";
    const computedHost = getUrlHost(computedPublicUrl);
    const canonicalHost = getUrlHost(canonicalTrimmed);
    const canonicalExampleCom = /example\.com/i.test(canonicalTrimmed);
    const canonicalHostMismatch =
        Boolean(canonicalHost) &&
        Boolean(computedHost) &&
        canonicalHost !== computedHost;

    const jsonLdStatus = useMemo(() => {
        const raw = typeof value.jsonLd === "string" ? value.jsonLd.trim() : "";
        if (!raw) {
            return { hasValue: false, valid: true, root: null };
        }
        try {
            const parsed = JSON.parse(raw);
            const valid =
                parsed !== null &&
                (typeof parsed === "object" || Array.isArray(parsed));
            const root =
                parsed && typeof parsed === "object" && !Array.isArray(parsed)
                    ? parsed
                    : null;
            return { hasValue: true, valid, root };
        } catch {
            return { hasValue: true, valid: false, root: null };
        }
    }, [value.jsonLd]);

    function update(key, nextValue) {
        onChange?.({ [key]: nextValue });
    }

    function handleUseAsCanonical() {
        if (!computedPublicUrl) return;
        update("canonicalUrl", computedPublicUrl);
    }

    function resolveJsonLdBaseUrl() {
        if (isValidAbsoluteHttpUrl(canonicalTrimmed)) return canonicalTrimmed;
        return computedPublicUrl;
    }

    function resolveJsonLdName() {
        if (typeof displayName === "string" && displayName.trim()) {
            return displayName.trim();
        }
        if (typeof value.title === "string" && value.title.trim()) {
            return value.title.trim();
        }
        return "";
    }

    function handleInsertJsonLdTemplate() {
        const baseUrl = resolveJsonLdBaseUrl();
        const name = resolveJsonLdName();

        const obj = {
            "@context": "https://schema.org",
            "@type": jsonLdTemplateType,
            ...(name ? { name } : {}),
            ...(baseUrl ? { url: baseUrl, "@id": baseUrl } : {}),
        };

        update("jsonLd", JSON.stringify(obj, null, 2));
    }

    function handleSyncJsonLdFromCanonical() {
        if (!jsonLdStatus?.valid || !jsonLdStatus?.root) return;

        const baseUrl = resolveJsonLdBaseUrl();
        if (!baseUrl) return;

        const next = { ...jsonLdStatus.root };
        next.url = baseUrl;
        next["@id"] = baseUrl;
        update("jsonLd", JSON.stringify(next, null, 2));
    }

    return (
        <Panel title="SEO וסקריפטים">
            <div className={styles.stack}>
                <div className={styles.row}>
                    <div className={styles.fieldFull}>
                        <div className={styles.helperBlock}>
                            <div className={styles.helperHeader}>
                                <div className={styles.helperTitle}>
                                    Public URL (SSoT)
                                </div>
                                <button
                                    type="button"
                                    className={styles.helperButton}
                                    onClick={handleUseAsCanonical}
                                    disabled={disabled || !computedPublicUrl}
                                >
                                    Use as canonical
                                </button>
                            </div>
                            <div className={styles.helperValue}>
                                {computedPublicUrl || ""}
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.row}>
                    <label className={styles.field}>
                        <span className={styles.labelText}>Title</span>
                        <input
                            className={formStyles.input}
                            type="text"
                            value={value.title || ""}
                            onChange={(e) => update("title", e.target.value)}
                            disabled={disabled}
                        />
                    </label>

                    <label className={styles.field}>
                        <span className={styles.labelText}>Description</span>
                        <textarea
                            className={formStyles.textarea}
                            rows={3}
                            value={value.description || ""}
                            onChange={(e) =>
                                update("description", e.target.value)
                            }
                            disabled={disabled}
                        />
                    </label>
                </div>

                <div className={styles.row}>
                    <label className={styles.field}>
                        <span className={styles.labelText}>Canonical URL</span>
                        <input
                            className={formStyles.input}
                            type="url"
                            value={value.canonicalUrl || ""}
                            onChange={(e) =>
                                update("canonicalUrl", e.target.value)
                            }
                            disabled={disabled}
                            placeholder={
                                computedPublicUrl
                                    ? `לדוגמה: ${computedPublicUrl}`
                                    : "לדוגמה: https://…"
                            }
                        />

                        {!canonicalTrimmed ? (
                            <div className={styles.hintText}>
                                ברירת מחדל: ייעשה שימוש ב-Public URL (SSoT)
                            </div>
                        ) : null}
                        {canonicalExampleCom ? (
                            <div className={styles.warningText}>
                                נראה שזה example.com — לרוב זו כתובת דמו.
                            </div>
                        ) : null}
                        {canonicalHostMismatch ? (
                            <div className={styles.warningText}>
                                שים לב: הדומיין של ה-Canonical שונה מהדומיין של
                                ה-Public URL (SSoT).
                            </div>
                        ) : null}
                    </label>

                    <label className={styles.field}>
                        <span className={styles.labelText}>Robots</span>
                        <input
                            className={formStyles.input}
                            type="text"
                            value={value.robots || ""}
                            onChange={(e) => update("robots", e.target.value)}
                            disabled={disabled}
                            placeholder="index, follow"
                        />
                    </label>
                </div>

                <div className={styles.row}>
                    <label className={styles.field}>
                        <span className={styles.labelText}>
                            Google Site Verification
                        </span>
                        <input
                            className={formStyles.input}
                            type="text"
                            value={value.googleSiteVerification || ""}
                            onChange={(e) =>
                                update("googleSiteVerification", e.target.value)
                            }
                            disabled={disabled}
                        />
                    </label>

                    <label className={styles.field}>
                        <span className={styles.labelText}>
                            Facebook Domain Verification
                        </span>
                        <input
                            className={formStyles.input}
                            type="text"
                            value={value.facebookDomainVerification || ""}
                            onChange={(e) =>
                                update(
                                    "facebookDomainVerification",
                                    e.target.value,
                                )
                            }
                            disabled={disabled}
                        />
                    </label>
                </div>

                <div className={styles.row}>
                    <label className={styles.field}>
                        <span className={styles.labelText}>GTM ID</span>
                        <input
                            className={formStyles.input}
                            type="text"
                            value={value.gtmId || ""}
                            onChange={(e) => update("gtmId", e.target.value)}
                            disabled={disabled}
                            placeholder="GTM-XXXXXXX"
                        />
                    </label>

                    <label className={styles.field}>
                        <span className={styles.labelText}>
                            GA Measurement ID
                        </span>
                        <input
                            className={formStyles.input}
                            type="text"
                            value={value.gaMeasurementId || ""}
                            onChange={(e) =>
                                update("gaMeasurementId", e.target.value)
                            }
                            disabled={disabled}
                            placeholder="G-XXXXXXX"
                        />
                    </label>

                    <label className={styles.field}>
                        <span className={styles.labelText}>Meta Pixel ID</span>
                        <input
                            className={formStyles.input}
                            type="text"
                            value={value.metaPixelId || ""}
                            onChange={(e) =>
                                update("metaPixelId", e.target.value)
                            }
                            disabled={disabled}
                        />
                    </label>
                </div>

                <div className={styles.row}>
                    <label className={styles.fieldFull}>
                        <span className={styles.labelText}>JSON-LD (JSON)</span>

                        <div className={styles.jsonLdHelperRow}>
                            <div className={styles.selectWrap}>
                                <select
                                    className={`${formStyles.input} ${styles.jsonLdSelect}`}
                                    value={jsonLdTemplateType}
                                    onChange={(e) =>
                                        setJsonLdTemplateType(e.target.value)
                                    }
                                    disabled={disabled}
                                    aria-label="JSON-LD template type"
                                >
                                    <option value="Person">Person</option>
                                    <option value="LocalBusiness">
                                        LocalBusiness
                                    </option>
                                    <option value="Organization">
                                        Organization
                                    </option>
                                </select>
                            </div>

                            <div className={styles.jsonLdActions}>
                                <button
                                    type="button"
                                    className={styles.helperButton}
                                    onClick={handleInsertJsonLdTemplate}
                                    disabled={disabled}
                                >
                                    Insert template
                                </button>
                                <button
                                    type="button"
                                    className={styles.helperButton}
                                    onClick={handleSyncJsonLdFromCanonical}
                                    disabled={
                                        disabled ||
                                        !jsonLdStatus?.valid ||
                                        !jsonLdStatus?.root ||
                                        !resolveJsonLdBaseUrl()
                                    }
                                >
                                    Sync url/@id from canonical
                                </button>
                            </div>
                        </div>

                        {jsonLdStatus?.hasValue ? (
                            <div
                                className={
                                    jsonLdStatus.valid
                                        ? styles.jsonOkText
                                        : styles.jsonBadText
                                }
                            >
                                {jsonLdStatus.valid
                                    ? "JSON תקין"
                                    : "JSON לא תקין"}
                            </div>
                        ) : null}

                        <textarea
                            className={formStyles.textarea}
                            rows={6}
                            value={value.jsonLd || ""}
                            onChange={(e) => update("jsonLd", e.target.value)}
                            disabled={disabled}
                            placeholder='{"@context":"https://schema.org","@type":"LocalBusiness"}'
                        />
                    </label>
                </div>

                <div className={styles.microCopy}>
                    שיתוף ברשתות משתמש בדף /og/ לתצוגת מקדימה. הדפדפן מפנה את
                    /og/ לכתובת הציבורית.
                </div>
            </div>
        </Panel>
    );
}
