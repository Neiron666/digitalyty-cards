/**
 * Inline SVG icons for EditorSidebar tabs + copy button.
 * All use currentColor so they inherit the parent CSS color.
 */

function svgProps(className, title) {
    const decorative = !title;
    return {
        className,
        xmlns: "http://www.w3.org/2000/svg",
        width: "24",
        height: "24",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        focusable: "false",
        "aria-hidden": decorative ? "true" : undefined,
        role: title ? "img" : undefined,
    };
}

export function TemplatesIcon({ className, title }) {
    return (
        <svg {...svgProps(className, title)}>
            {title ? <title>{title}</title> : null}
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M19 3h-4a2 2 0 0 0 -2 2v12a4 4 0 0 0 8 0v-12a2 2 0 0 0 -2 -2" />
            <path d="M13 7.35l-2 -2a2 2 0 0 0 -2.828 0l-2.828 2.828a2 2 0 0 0 0 2.828l9 9" />
            <path d="M7.3 13h-2.3a2 2 0 0 0 -2 2v4a2 2 0 0 0 2 2h12" />
            <path d="M17 17l0 .01" />
        </svg>
    );
}

export function SelfDesignIcon({ className, title }) {
    return (
        <svg {...svgProps(className, title)}>
            {title ? <title>{title}</title> : null}
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M12 21a9 9 0 0 1 0 -18c4.97 0 9 3.582 9 8c0 1.06 -.474 2.078 -1.318 2.828c-.844 .75 -1.989 1.172 -3.182 1.172h-2.5a2 2 0 0 0 -1 3.75a1.3 1.3 0 0 1 -1 2.25" />
            <path d="M7.5 10.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
            <path d="M11.5 7.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
            <path d="M15.5 10.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
        </svg>
    );
}

export function HeadIcon({ className, title }) {
    return (
        <svg {...svgProps(className, title)}>
            {title ? <title>{title}</title> : null}
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M8 19h-3a2 2 0 0 1 -2 -2v-10a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v11a1 1 0 0 1 -1 1" />
            <path d="M12 14a2 2 0 1 0 4.001 -.001a2 2 0 0 0 -4.001 .001" />
            <path d="M17 19a2 2 0 0 0 -2 -2h-2a2 2 0 0 0 -2 2" />
        </svg>
    );
}

export function BusinessIcon({ className, title }) {
    return (
        <svg {...svgProps(className, title)}>
            {title ? <title>{title}</title> : null}
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M9 10a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
            <path d="M6 21v-1a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v1" />
            <path d="M3 5a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-14" />
        </svg>
    );
}

export function ContactIcon({ className, title }) {
    const decorative = !title;
    return (
        <svg
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="-24 -24 660 660"
            fill="currentColor"
            focusable="false"
            aria-hidden={decorative ? "true" : undefined}
            role={title ? "img" : undefined}
        >
            {title ? <title>{title}</title> : null}
            <path d="M164.9 24.6c-7.7-18.6-28-28.5-47.4-23.2l-88 24C12.1 30.2 0 46 0 64C0 311.4 200.6 512 448 512c18 0 33.8-12.1 38.6-29.5l24-88c5.3-19.4-4.6-39.7-23.2-47.4l-96-40c-16.3-6.8-35.2-2.1-46.3 11.6L304.7 368C234.3 334.7 177.3 277.7 144 207.3L193.3 167c13.7-11.2 18.4-30 11.6-46.3l-40-96z" />
        </svg>
    );
}

export function ContentIcon({ className, title }) {
    return (
        <svg {...svgProps(className, title)}>
            {title ? <title>{title}</title> : null}
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M14 3v4a1 1 0 0 0 1 1h4" />
            <path d="M12 21h-5a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v3.5" />
            <path d="M9 9h1" />
            <path d="M9 13h6" />
            <path d="M9 17h3" />
            <path d="M19 22.5a4.75 4.75 0 0 1 3.5 -3.5a4.75 4.75 0 0 1 -3.5 -3.5a4.75 4.75 0 0 1 -3.5 3.5a4.75 4.75 0 0 1 3.5 3.5" />
        </svg>
    );
}

export function GalleryIcon({ className, title }) {
    return (
        <svg {...svgProps(className, title)}>
            {title ? <title>{title}</title> : null}
            <rect x="3" y="4" width="18" height="16" rx="3" />
            <circle cx="9" cy="10" r="1.4" />
            <path d="M21 16l-5.2-5.2a1 1 0 0 0-1.4 0L8 17" />
            <path d="M8 17l-2.2-2.2a1 1 0 0 0-1.4 0L3 16" />
        </svg>
    );
}
export function BookingIcon({ className, title }) {
    return (
        <svg {...svgProps(className, title)}>
            {title ? <title>{title}</title> : null}
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="2" />
            <path d="M9 12h6" />
            <path d="M9 16h6" />
        </svg>
    );
}

export function WorkHoursIcon({ className, title }) {
    return (
        <svg {...svgProps(className, title)}>
            {title ? <title>{title}</title> : null}
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 3" />
        </svg>
    );
}

export function ReviewsIcon({ className, title }) {
    return (
        <svg {...svgProps(className, title)}>
            {title ? <title>{title}</title> : null}
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M17 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
            <path d="M22 22a2 2 0 0 0 -2 -2h-2a2 2 0 0 0 -2 2" />
            <path d="M12.454 19.97a9.9 9.9 0 0 1 -4.754 -.97l-4.7 1l1.3 -3.9c-2.324 -3.437 -1.426 -7.872 2.1 -10.374c3.526 -2.501 8.59 -2.296 11.845 .48c1.667 1.423 2.596 3.294 2.747 5.216" />
        </svg>
    );
}

export function FaqIcon({ className, title }) {
    return (
        <svg {...svgProps(className, title)}>
            {title ? <title>{title}</title> : null}
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" />
            <path d="M6 21v-2a4 4 0 0 1 4 -4h3.5" />
            <path d="M19 22v.01" />
            <path d="M19 19a2.003 2.003 0 0 0 .914 -3.782a1.98 1.98 0 0 0 -2.414 .483" />
        </svg>
    );
}

export function SeoIcon({ className, title }) {
    return (
        <svg {...svgProps(className, title)}>
            {title ? <title>{title}</title> : null}
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M21 12a9 9 0 1 0 -9 9" />
            <path d="M3.6 9h16.8" />
            <path d="M3.6 15h7.9" />
            <path d="M11.5 3a17 17 0 0 0 0 18" />
            <path d="M12.5 3a16.984 16.984 0 0 1 2.574 8.62" />
            <path d="M15 18a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
            <path d="M20.2 20.2l1.8 1.8" />
        </svg>
    );
}

export function SettingsIcon({ className, title }) {
    return (
        <svg {...svgProps(className, title)}>
            {title ? <title>{title}</title> : null}
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M4 8h4v4h-4l0 -4" />
            <path d="M6 4l0 4" />
            <path d="M6 12l0 8" />
            <path d="M10 14h4v4h-4l0 -4" />
            <path d="M12 4l0 10" />
            <path d="M12 18l0 2" />
            <path d="M16 5h4v4h-4l0 -4" />
            <path d="M18 4l0 1" />
            <path d="M18 9l0 11" />
        </svg>
    );
}

export function AnalyticsIcon({ className, title }) {
    return (
        <svg {...svgProps(className, title)}>
            {title ? <title>{title}</title> : null}
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M3 5a1 1 0 0 1 1 -1h16a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1l0 -10" />
            <path d="M7 20l10 0" />
            <path d="M9 16l0 4" />
            <path d="M15 16l0 4" />
            <path d="M8 12l3 -3l2 2l3 -3" />
        </svg>
    );
}

export function CopyIcon({ className, title }) {
    return (
        <svg {...svgProps(className, title)}>
            {title ? <title>{title}</title> : null}
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M7 9.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667l0 -8.666" />
            <path d="M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1" />
        </svg>
    );
}
