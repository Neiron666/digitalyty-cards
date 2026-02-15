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
    { id: PANEL_DESIGN, label: "עיצוב אישי" },
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
}) {
    const items = canShowAnalyticsTab
        ? TABS
        : TABS.filter((t) => t.id !== "analytics");

    return (
        <aside className={styles.sidebar}>
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
