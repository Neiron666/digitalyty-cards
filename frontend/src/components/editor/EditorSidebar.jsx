import styles from "./EditorSidebar.module.css";

const TABS = [
    { id: "templates", label: "תבניות" },
    { id: "business", label: "פרטי העסק" },
    { id: "contact", label: "פרטי קשר" },
    { id: "content", label: "תוכן" },
    { id: "design", label: "עיצוב" },
    { id: "gallery", label: "גלריה" },
    { id: "reviews", label: "ביקורות" },
    { id: "seo", label: "SEO וסקריפטים" },
    { id: "settings", label: "הגדרות" },
    { id: "analytics", label: "Analytics" },
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
