import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { getTemplateById, normalizeTemplateId } from "./templates.config";
import CardLayout from "./layout/CardLayout";
import SkinBase from "./skins/_base/SkinBase.module.css";
import SharedPalettes from "./skins/_palettes/Palettes.module.css";
import CustomSkin from "./skins/custom/CustomSkin.module.css";
import BeautySkin from "./skins/beauty/BeautySkin.module.css";
import RoismanA11ySkin from "./skins/roismanA11y/RoismanA11ySkin.module.css";
import LakmiSkin from "./skins/lakmi/LakmiSkin.module.css";
import galitSkin from "./skins/galit/GalitSkin.module.css";
import SelfThemeSkin from "./skins/self/SelfThemeSkin.module.css";

function normalizeHexColor(value) {
    if (typeof value !== "string") return null;
    const raw = value.trim().toLowerCase();
    if (!raw) return null;
    if (/^#[0-9a-f]{6}$/.test(raw)) return raw;
    if (/^#[0-9a-f]{3}$/.test(raw)) {
        return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`;
    }
    return null;
}

function hexToRgbTriplet(hex) {
    const h = normalizeHexColor(hex);
    if (!h) return null;
    const v = h.replace("#", "");
    const r = parseInt(v.slice(0, 2), 16);
    const g = parseInt(v.slice(2, 4), 16);
    const b = parseInt(v.slice(4, 6), 16);
    return `${r}, ${g}, ${b}`;
}

function toPascalCaseKey(key) {
    return String(key || "")
        .trim()
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean)
        .map((p) => p[0].toUpperCase() + p.slice(1))
        .join("");
}

function paletteKeyToCssModuleClassName(key) {
    return `palette${toPascalCaseKey(key)}`;
}

function getCustomPaletteClassFromRegistry(template, key, skinModule) {
    const allowed = Array.isArray(template?.customPalettes)
        ? template.customPalettes
        : [];

    const normalized = String(key || "")
        .trim()
        .toLowerCase();

    const defaultKeyRaw = String(template?.defaultPaletteKey || "")
        .trim()
        .toLowerCase();

    const defaultKey =
        (defaultKeyRaw && allowed.includes(defaultKeyRaw) && defaultKeyRaw) ||
        allowed[0] ||
        "";

    const finalKey = allowed.includes(normalized) ? normalized : defaultKey;
    const className = paletteKeyToCssModuleClassName(finalKey);
    const defaultClassName = paletteKeyToCssModuleClassName(defaultKey);

    return (
        skinModule?.[className] ||
        SharedPalettes?.[className] ||
        skinModule?.[defaultClassName] ||
        SharedPalettes?.[defaultClassName] ||
        undefined
    );
}

export default function TemplateRenderer({ card, onUpgrade, mode }) {
    const templateId = normalizeTemplateId(card?.design?.templateId);
    const template = getTemplateById(templateId);
    const supports = template?.supports || {};

    const skinModules = {
        base: SkinBase,
        custom: CustomSkin,
        beauty: BeautySkin,
        roismanA11y: RoismanA11ySkin,
        lakmi: LakmiSkin,
        galit: galitSkin,
        self: SelfThemeSkin,
    };

    const skinKey = template?.skinKey;
    const skin = skinModules[skinKey] || SkinBase;

    // SSoT gating: self theme applies only to templates that declare it in registry.
    // Editor mode uses a blob stylesheet (no backend fetch, no _id required).
    // Public mode uses same-origin endpoint (requires _id).
    const isCustomV1 = template?.selfThemeV1 === true;
    const hasSelfTheme = Boolean(card?.design?.selfThemeV1);

    const selfThemeEditorActive =
        mode === "editor" && isCustomV1 && hasSelfTheme;

    const selfThemePublicActive =
        mode !== "editor" && isCustomV1 && hasSelfTheme && Boolean(card?._id);

    const selfThemeScopeActive = selfThemeEditorActive || selfThemePublicActive;

    const selfThemeVersion =
        Number(card?.design?.selfThemeV1?.version) > 0
            ? Number(card.design.selfThemeV1.version)
            : 1;

    const selfThemeCssText = useMemo(() => {
        if (!selfThemeEditorActive) return null;

        const st =
            card?.design && typeof card.design === "object"
                ? card.design.selfThemeV1
                : null;
        if (!st || typeof st !== "object") return null;

        const bg = normalizeHexColor(st.bg);
        const text = normalizeHexColor(st.text);
        const primary = normalizeHexColor(st.primary);
        const secondary = normalizeHexColor(st.secondary);
        const onPrimary = normalizeHexColor(st.onPrimary);

        const cssLines = [];
        cssLines.push(
            `[data-cardigo-scope="card"][data-template-id="${templateId}"][data-self-theme="1"] {`,
        );

        if (bg) {
            cssLines.push(`  --c-sections-all-backgronds: ${bg};`);
            const rgb = hexToRgbTriplet(bg);
            if (rgb) cssLines.push(`  --rgb-sections-all-backgronds: ${rgb};`);
            cssLines.push(`  --bg-card: ${bg};`);
            cssLines.push(`  --card-bg: var(--bg-card);`);
        }

        if (text) {
            cssLines.push(`  --c-neutral-text: ${text};`);
            const rgb = hexToRgbTriplet(text);
            if (rgb) cssLines.push(`  --rgb-neutral-text: ${rgb};`);
            cssLines.push(`  --text-main: var(--c-neutral-text);`);
        }

        if (primary) {
            cssLines.push(`  --c-brand-primary: ${primary};`);
            const rgb = hexToRgbTriplet(primary);
            if (rgb) cssLines.push(`  --rgb-brand-primary: ${rgb};`);
        }

        if (secondary) {
            cssLines.push(`  --c-brand-secondary: ${secondary};`);
            const rgb = hexToRgbTriplet(secondary);
            if (rgb) cssLines.push(`  --rgb-brand-secondary: ${rgb};`);
        }

        if (onPrimary) {
            cssLines.push(`  --c-on-primary: ${onPrimary};`);
        }

        cssLines.push("}");
        return cssLines.join("\n") + "\n";
    }, [
        selfThemeEditorActive,
        templateId,
        card?.design?.selfThemeV1?.bg,
        card?.design?.selfThemeV1?.text,
        card?.design?.selfThemeV1?.primary,
        card?.design?.selfThemeV1?.secondary,
        card?.design?.selfThemeV1?.onPrimary,
    ]);

    const [selfThemeBlobUrl, setSelfThemeBlobUrl] = useState(null);
    useEffect(() => {
        if (!selfThemeCssText) {
            setSelfThemeBlobUrl(null);
            return;
        }

        const url = URL.createObjectURL(
            new Blob([selfThemeCssText], { type: "text/css" }),
        );
        setSelfThemeBlobUrl(url);

        return () => {
            URL.revokeObjectURL(url);
        };
    }, [selfThemeCssText]);

    // Fixed skins must be token-only CSS modules; layout stays shared (CardLayout).

    const extraThemeClass = Array.isArray(template?.customPalettes)
        ? getCustomPaletteClassFromRegistry(
              template,
              card?.design?.customPaletteKey,
              skin,
          )
        : undefined;

    return (
        <>
            {selfThemeScopeActive ? (
                <Helmet>
                    {selfThemeEditorActive ? (
                        selfThemeBlobUrl ? (
                            <link
                                key={selfThemeBlobUrl}
                                rel="stylesheet"
                                href={selfThemeBlobUrl}
                            />
                        ) : null
                    ) : selfThemePublicActive ? (
                        <link
                            rel="stylesheet"
                            href={`/api/cards/${card._id}/self-theme.css?v=${selfThemeVersion}`}
                        />
                    ) : null}
                </Helmet>
            ) : null}

            <CardLayout
                card={card}
                supports={supports}
                skin={skin}
                extraThemeClass={extraThemeClass}
                mode={mode}
                onUpgrade={onUpgrade}
                templateId={templateId}
                selfThemeActive={selfThemeScopeActive}
            />
        </>
    );
}

export function getTemplateSupports(card) {
    return getTemplateById(card?.design?.templateId)?.supports;
}
