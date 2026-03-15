/**
 * Homepage-specific SVG icons.
 * All use currentColor so they inherit the parent CSS color.
 * Pattern matches EditorTabIcons.jsx conventions.
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

export function PhoneIcon({ className, title }) {
    return (
        <svg {...svgProps(className, title)}>
            {title ? <title>{title}</title> : null}
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
    );
}

export function ChatIcon({ className, title }) {
    return (
        <svg {...svgProps(className, title)}>
            {title ? <title>{title}</title> : null}
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
    );
}

export function LocationIcon({ className, title }) {
    return (
        <svg {...svgProps(className, title)}>
            {title ? <title>{title}</title> : null}
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
        </svg>
    );
}

export function VideoIcon({ className, title }) {
    return (
        <svg {...svgProps(className, title)}>
            {title ? <title>{title}</title> : null}
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <polygon
                points="10,8 16,12 10,16"
                fill="currentColor"
                stroke="none"
            />
        </svg>
    );
}

export function StarIcon({ className, title }) {
    return (
        <svg {...svgProps(className, title)}>
            {title ? <title>{title}</title> : null}
            <polygon
                points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
                fill="currentColor"
                stroke="none"
            />
        </svg>
    );
}

export function QuestionIcon({ className, title }) {
    return (
        <svg {...svgProps(className, title)}>
            {title ? <title>{title}</title> : null}
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    );
}

export function LinkIcon({ className, title }) {
    return (
        <svg {...svgProps(className, title)}>
            {title ? <title>{title}</title> : null}
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
    );
}

export function QrCodeIcon({ className, title }) {
    return (
        <svg {...svgProps(className, title)}>
            {title ? <title>{title}</title> : null}
            <rect x="2" y="2" width="8" height="8" rx="1" />
            <rect x="14" y="2" width="8" height="8" rx="1" />
            <rect x="2" y="14" width="8" height="8" rx="1" />
            <rect x="15" y="15" width="3" height="3" />
            <path d="M21 15v.01" />
            <path d="M21 21v.01" />
            <path d="M15 21v.01" />
        </svg>
    );
}

export function PencilIcon({ className, title }) {
    return (
        <svg {...svgProps(className, title)}>
            {title ? <title>{title}</title> : null}
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" />
        </svg>
    );
}

export function MobileIcon({ className, title }) {
    return (
        <svg {...svgProps(className, title)}>
            {title ? <title>{title}</title> : null}
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
            <line x1="12" y1="18" x2="12.01" y2="18" />
        </svg>
    );
}

export function LockIcon({ className, title }) {
    return (
        <svg {...svgProps(className, title)}>
            {title ? <title>{title}</title> : null}
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
    );
}

export function ClickIcon({ className, title }) {
    return (
        <svg {...svgProps(className, title)}>
            {title ? <title>{title}</title> : null}
            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
            <path d="M13 13l6 6" />
        </svg>
    );
}
