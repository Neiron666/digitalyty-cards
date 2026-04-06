import { useState, useRef, useCallback } from "react";
import styles from "./EditorSidebar.module.css";
import CrownIcon from "../icons/CrownIcon";
import {
    TemplatesIcon,
    SelfDesignIcon,
    HeadIcon,
    BusinessIcon,
    ContactIcon,
    ContentIcon,
    ServicesIcon,
    WorkHoursIcon,
    GalleryIcon,
    ReviewsIcon,
    FaqIcon,
    SeoIcon,
    SettingsIcon,
    AnalyticsIcon,
    CopyIcon,
} from "../icons/EditorTabIcons";

import {
    PANEL_TEMPLATES,
    PANEL_BUSINESS,
    PANEL_CONTACT,
    PANEL_CONTENT,
    PANEL_SERVICES,
    PANEL_BUSINESS_HOURS,
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
    { id: PANEL_SERVICES, label: "שירותים" },
    { id: PANEL_BUSINESS_HOURS, label: "שעות פעילות" },
    { id: PANEL_GALLERY, label: "גלריה" },
    { id: PANEL_REVIEWS, label: "ביקורות" },
    { id: PANEL_FAQ, label: "שאלות ותשובות" },
    { id: PANEL_SEO, label: "SEO וסקריפטים" },
    { id: PANEL_SETTINGS, label: "הגדרות" },
    { id: PANEL_ANALYTICS, label: "אנליטיקה" },
];

const TAB_ICON = {
    [PANEL_TEMPLATES]: TemplatesIcon,
    [PANEL_DESIGN]: SelfDesignIcon,
    [PANEL_HEAD]: HeadIcon,
    [PANEL_BUSINESS]: BusinessIcon,
    [PANEL_CONTACT]: ContactIcon,
    [PANEL_CONTENT]: ContentIcon,
    [PANEL_SERVICES]: ServicesIcon,
    [PANEL_BUSINESS_HOURS]: WorkHoursIcon,
    [PANEL_GALLERY]: GalleryIcon,
    [PANEL_REVIEWS]: ReviewsIcon,
    [PANEL_FAQ]: FaqIcon,
    [PANEL_SEO]: SeoIcon,
    [PANEL_SETTINGS]: SettingsIcon,
    [PANEL_ANALYTICS]: AnalyticsIcon,
};

function isPremiumTab(tabId, entitlements) {
    if (!entitlements) return false;
    if (tabId === "gallery") return entitlements.canUseGallery === false;
    if (tabId === "seo") return entitlements.canEditSeo === false;
    if (tabId === "settings") {
        return (
            entitlements.canPublish === false ||
            entitlements.canChangeSlug === false
        );
    }
    if (tabId === "analytics") {
        return entitlements.canUseAnalyticsPremium !== true;
    }
    if (tabId === PANEL_SERVICES) return !entitlements.canUseServices;
    if (tabId === PANEL_BUSINESS_HOURS)
        return !entitlements.canUseBusinessHours;
    return false;
}

/** Tabs that should be completely hidden (not just crown-badged) on free. */
function isHiddenTab(/* tabId, entitlements */) {
    return false;
}

function computeTrialDaysLeft(billingUntil) {
    if (!billingUntil) return null;
    const endMs = new Date(billingUntil).getTime();
    if (!Number.isFinite(endMs)) return null;
    const diff = endMs - Date.now();
    if (diff <= 0) return 0;
    return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

export default function EditorSidebar({
    activeTab,
    onChangeTab,
    entitlements,
    isPremium,
    billingSource,
    billingUntil,
    publicUrl,
    publicPath,
    isPublished,
    activeOrgSlug,
    myOrgs,
    onContextChange,
    onLoadOrgs,
    showContextBar,
}) {
    const isTrial = billingSource === "trial-premium";
    const trialDaysLeft = isTrial ? computeTrialDaysLeft(billingUntil) : null;
    const [copied, setCopied] = useState(false);
    const copiedTimer = useRef(null);

    const canCopy = isPublished && Boolean(publicUrl);

    const handleCopy = useCallback(async () => {
        if (!canCopy) return;
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(publicUrl);
            } else {
                const ta = document.createElement("textarea");
                ta.value = publicUrl;
                ta.setAttribute("readonly", "");
                ta.setAttribute("style", "position:fixed;left:-9999px");
                document.body.appendChild(ta);
                ta.select();
                document.execCommand("copy");
                document.body.removeChild(ta);
            }
            setCopied(true);
            if (copiedTimer.current) clearTimeout(copiedTimer.current);
            copiedTimer.current = setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    }, [canCopy, publicUrl]);

    return (
        <aside className={styles.sidebar}>
            {showContextBar ? (
                <div className={styles.contextBlock} dir="rtl">
                    <div className={styles.contextLabel}>כרטיס</div>
                    <div className={styles.selectShell}>
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
                        {myOrgs && myOrgs.length > 0 ? (
                            <span
                                className={styles.contextCaret}
                                aria-hidden="true"
                            >
                                ▾
                            </span>
                        ) : null}
                    </div>
                </div>
            ) : null}

            {publicUrl ? (
                <div className={styles.publicLink} dir="rtl">
                    <div className={styles.publicLinkTitle}>
                        {isPublished ? "קישור ציבורי" : "קישור עתידי"}
                    </div>
                    <div className={styles.publicLinkRow}>
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
                    <button
                        type="button"
                        className={styles.copyBtn}
                        onClick={handleCopy}
                        disabled={!canCopy}
                        aria-label="העתק קישור"
                        title={
                            !canCopy
                                ? "אפשר להעתיק קישור רק אחרי פרסום הכרטיס"
                                : undefined
                        }
                    >
                        <CopyIcon className={styles.copyIcon} />
                        {copied ? "הועתק!" : "העתק קישור"}
                    </button>
                    {!canCopy && (
                        <div className={styles.copyHint}>
                            אפשר להעתיק קישור רק אחרי פרסום הכרטיס.
                        </div>
                    )}
                </div>
            ) : (
                <div className={styles.publicLink} dir="rtl">
                    <div className={styles.publicLinkTitle}>קישור ציבורי</div>
                    <div className={styles.copyHint}>
                        הקישור יופיע אחרי פרסום הכרטיס.
                    </div>
                </div>
            )}

            <div
                className={`${styles.planBadge} ${isPremium ? styles.planBadgePremium : styles.planBadgeFree}`}
                dir="rtl"
            >
                {isPremium ? (
                    <>
                        <CrownIcon className={styles.planCrown} />
                        <span className={styles.planLabel}>מסלול:</span>
                        <span className={styles.planValue}>
                            {isTrial ? "פרמיום ניסיון" : "פרמיום"}
                        </span>
                    </>
                ) : (
                    <>
                        <span className={styles.planLabel}>מסלול:</span>
                        <span className={styles.planValue}>חינם</span>
                    </>
                )}
            </div>

            {isTrial && trialDaysLeft != null && (
                <div className={styles.trialCard} dir="rtl">
                    <div className={styles.trialCountdown}>
                        {trialDaysLeft > 1
                            ? `נותרו עוד ${trialDaysLeft} ימים לניסיון פרמיום`
                            : trialDaysLeft === 1
                              ? "נותר עוד יום לניסיון פרמיום"
                              : "נותר פחות מיום לניסיון פרמיום"}
                    </div>
                    <a href="/pricing" className={styles.trialCta}>
                        עבור למסלולים
                    </a>
                </div>
            )}

            <div className={styles.title}>עריכת כרטיס</div>

            <nav className={styles.nav}>
                {TABS.filter((tab) => !isHiddenTab(tab.id, entitlements)).map(
                    (tab) => {
                        const premium = isPremiumTab(tab.id, entitlements);
                        const TabIcon = TAB_ICON[tab.id];
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                className={`${styles.tab} ${
                                    activeTab === tab.id ? styles.active : ""
                                }`}
                                onClick={() => onChangeTab(tab.id)}
                            >
                                <span className={styles.tabLabel}>
                                    {TabIcon && (
                                        <TabIcon className={styles.tabIcon} />
                                    )}
                                    {tab.label}
                                    {premium ? (
                                        <CrownIcon
                                            className={styles.crown}
                                            title="רק לפרימיום"
                                        />
                                    ) : null}
                                </span>
                            </button>
                        );
                    },
                )}
            </nav>
        </aside>
    );
}
