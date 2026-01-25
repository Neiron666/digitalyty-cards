import { getTemplateById, normalizeTemplateId } from "./templates.config";
import CardLayout from "./layout/CardLayout";
import SkinBase from "./skins/_base/SkinBase.module.css";
import SharedPalettes from "./skins/_palettes/Palettes.module.css";
import CustomSkin from "./skins/custom/CustomSkin.module.css";
import BeautySkin from "./skins/beauty/BeautySkin.module.css";
import RoismanA11ySkin from "./skins/roismanA11y/RoismanA11ySkin.module.css";
import LakmiSkin from "./skins/lakmi/LakmiSkin.module.css";
import galitSkin from "./skins/galit/GalitSkin.module.css";

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
    };

    const skinKey = template?.skinKey;
    const skin = skinModules[skinKey] || SkinBase;

    // Fixed skins must be token-only CSS modules; layout stays shared (CardLayout).

    const extraThemeClass = Array.isArray(template?.customPalettes)
        ? getCustomPaletteClassFromRegistry(
              template,
              card?.design?.customPaletteKey,
              skin,
          )
        : undefined;

    return (
        <CardLayout
            card={card}
            supports={supports}
            skin={skin}
            extraThemeClass={extraThemeClass}
            mode={mode}
            onUpgrade={onUpgrade}
        />
    );
}

export function getTemplateSupports(card) {
    return getTemplateById(card?.design?.templateId)?.supports;
}
