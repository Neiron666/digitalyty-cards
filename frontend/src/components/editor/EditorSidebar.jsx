import styles from "./EditorSidebar.module.css";

import {
    PANEL_TEMPLATES,
    PANEL_BUSINESS,
    PANEL_CONTACT,
    PANEL_CONTENT,
    PANEL_HEAD,
    PANEL_DESIGN,
    PANEL_GALLERY,
    PANEL_REVIEWS,
    PANEL_FAQ,
    PANEL_SEO,
    PANEL_SETTINGS,
    PANEL_ANALYTICS,
} from "./editorTabs";

const TABS = [
    { id: PANEL_TEMPLATES, label: "תבניות" },
    { id: PANEL_DESIGN, label: "עיצוב עצמי" },
    { id: PANEL_HEAD, label: "ראש הכרטיס" },
    { id: PANEL_BUSINESS, label: "פרטי העסק" },
    { id: PANEL_CONTACT, label: "פרטי קשר" },
    { id: PANEL_CONTENT, label: "תוכן" },
    { id: PANEL_GALLERY, label: "גלריה" },
    { id: PANEL_REVIEWS, label: "ביקורות" },
    { id: PANEL_FAQ, label: "שאלות ותשובות" },
    { id: PANEL_SEO, label: "SEO וסקריפטים" },
    { id: PANEL_SETTINGS, label: "הגדרות" },
    { id: PANEL_ANALYTICS, label: "Analytics" },
];

export default function EditorSidebar({
    activeTab,
    onChangeTab,
    canShowAnalyticsTab,
    publicUrl,
    publicPath,
    isPublished,
    activeOrgSlug,
    myOrgs,
    onContextChange,
    onLoadOrgs,
    showContextBar,
}) {
    const items = canShowAnalyticsTab
        ? TABS
        : TABS.filter((t) => t.id !== "analytics");

    return (
        <aside className={styles.sidebar}>
            {showContextBar ? (
                <div className={styles.contextBlock} dir="rtl">
                    <div className={styles.contextLabel}>כרטיס</div>
                    <select
                        className={styles.contextSelect}
                        value={activeOrgSlug || ""}
                        onFocus={onLoadOrgs}
                        onMouseDown={onLoadOrgs}
                        onChange={(e) => onContextChange(e.target.value)}
                        aria-label="הקשר כרטיס"
                    >
                        <option value="">אישי</option>
                        {(myOrgs || []).map((o) => (
                            <option
                                key={String(o?.id || o?.slug || "")}
                                value={String(o?.slug || "")}
                            >
                                {String(o?.name || o?.slug || "")}
                            </option>
                        ))}
                    </select>
                </div>
            ) : null}

            {publicUrl ? (
                <div className={styles.publicLink} dir="rtl">
                    <div className={styles.publicLinkTitle}>
                        {isPublished ? "קישור ציבורי" : "קישור עתידי"}
                    </div>
                    {isPublished ? (
                        <a
                            href={publicPath}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.publicLinkUrl}
                        >
                            {publicUrl}
                        </a>
                    ) : (
                        <span className={styles.publicLinkUrl}>
                            {publicUrl}
                        </span>
                    )}
                </div>
            ) : null}

            <div className={styles.title}>עריכת כרטיס</div>

            <nav className={styles.nav}>
                {items.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        className={`${styles.tab} ${
                            activeTab === tab.id ? styles.active : ""
                        }`}
                        onClick={() => onChangeTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </nav>
        </aside>
    );
}
