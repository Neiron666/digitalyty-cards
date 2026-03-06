/**
 * Gold premium crown SVG icon.
 * Usage: <CrownIcon className={styles.crown} />
 */
export default function CrownIcon({ className, title }) {
    const isDecorative = !title;

    return (
        <svg
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 4.50 24 24"
            fill="currentColor"
            focusable="false"
            aria-hidden={isDecorative ? "true" : undefined}
            role={title ? "img" : undefined}
        >
            {title ? <title>{title}</title> : null}

            {/* Crown body */}
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M4.35 9.18a.85.85 0 0 1 1.22-.32l3.73 2.26 2.02-4.02a.85.85 0 0 1 1.52 0l2.02 4.02 3.73-2.26a.85.85 0 0 1 1.27.88l-1.12 7.62a1.2 1.2 0 0 1-1.19 1.03H6.66a1.2 1.2 0 0 1-1.19-1.03L4.35 9.18ZM6.7 20.25c-.55 0-1 .45-1 1s.45 1 1 1h10.6c.55 0 1-.45 1-1s-.45-1-1-1H6.7Z"
            />

            {/* Jewels */}
            <circle cx="7.2" cy="9.2" r="1.05" />
            <circle cx="12" cy="7.2" r="1.15" />
            <circle cx="16.8" cy="9.2" r="1.05" />
        </svg>
    );
}
