import React from "react";
import { trackClick } from "../../services/analytics.client";

function getSocialStyle(design) {
    const s = design?.socialStyle;
    return s === "pillsWide" || s === "icons" || s === "iconsDense"
        ? s
        : "pills";
}

function socialButtonStyle(style) {
    const base = {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        textDecoration: "none",
        border: "1px solid rgba(255,255,255,0.14)",
        borderRadius: 999,
        padding: "10px 12px",
        lineHeight: 1,
        fontWeight: 600,
    };

    if (style === "pillsWide")
        return { ...base, padding: "12px 16px", width: "100%" };

    if (style === "icons")
        return { ...base, width: 44, height: 44, padding: 0, borderRadius: 14 };

    if (style === "iconsDense")
        return { ...base, width: 38, height: 38, padding: 0, borderRadius: 12 };

    return base; // pills
}

function shouldHideLabel(style) {
    return style === "icons" || style === "iconsDense";
}

export default function SocialButtons({ links = [], design = {}, slug }) {
    const style = getSocialStyle(design);

    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns:
                    style === "pillsWide"
                        ? "1fr"
                        : "repeat(auto-fit, minmax(44px, max-content))",
                gap: 10,
            }}
        >
            {links.map((l) => (
                <a
                    key={`${l.platform}-${l.url}`}
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    style={socialButtonStyle(style)}
                    aria-label={l.platform}
                    title={l.platform}
                    onClick={() =>
                        trackClick(
                            slug,
                            String(l.platform || "other").toLowerCase()
                        )
                    }
                >
                    {/* If you already render platform icons, keep that; otherwise this text fallback is safe */}
                    <span style={{ fontSize: 12, opacity: 0.9 }}>
                        {String(l.platform || "")
                            .slice(0, 2)
                            .toUpperCase()}
                    </span>
                    {!shouldHideLabel(style) && (
                        <span style={{ fontSize: 14 }}>
                            {l.label || l.platform}
                        </span>
                    )}
                </a>
            ))}
        </div>
    );
}
