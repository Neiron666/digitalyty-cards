import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./Editor.module.css";
import EditorSidebar from "./EditorSidebar";
import EditorPanel from "./EditorPanel";
import EditorPreview from "./EditorPreview";
import EditorSaveBar from "./EditorSaveBar";

import {
    EDITOR_CARD_TABS,
    PANEL_TEMPLATES,
    PANEL_ANALYTICS,
} from "./editorTabs";

const cx = (...classes) => classes.filter(Boolean).join(" ");

export default function Editor({
    card,
    onFieldChange,
    editingDisabled,
    onDeleteCard,
    onDeleteDesignAsset,
    deleteDesignAssetBusyKind,
    isDeleting,
    onRequestNavigate,
    onUpgrade,
    onPublish,
    onUnpublish,
    onUpdateSlug,
    previewHeader,
    previewFooter,
    canShowAnalyticsTab,
    commitDraft,
    dirtyPaths,
    saveState,
    saveErrorText,
    // Mobile: compact context bar in topbar
    activeOrgSlug,
    myOrgs,
    onContextChange,
    onLoadOrgs,
    showContextBar,
    // Mobile: public link in sidebar drawer
    publicUrl,
    publicPath,
    isPublished,
}) {
    const navigate = useNavigate();
    const { tab } = useParams(); // route: /edit/card/:tab

    const MOBILE_MEDIA = "(max-width: 900px)";

    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window === "undefined" || !window.matchMedia) return false;
        return Boolean(window.matchMedia(MOBILE_MEDIA).matches);
    });
    const [mobileView, setMobileView] = useState("edit"); // "edit" | "preview"
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [toastOpen, setToastOpen] = useState(false);

    const toastTimerRef = useRef(null);
    const lastToastAtRef = useRef(0);

    const closeDrawer = () => setDrawerOpen(false);

    const dismissToast = () => {
        setToastOpen(false);
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
            toastTimerRef.current = null;
        }
    };

    const showToast = () => {
        if (!isMobile) return;
        if (toastOpen) return;

        const now = Date.now();
        const cooldownMs = 15_000;
        if (now - lastToastAtRef.current < cooldownMs) return;

        lastToastAtRef.current = now;
        setToastOpen(true);

        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => {
            toastTimerRef.current = null;
            setToastOpen(false);
        }, 3000);
    };

    useEffect(() => {
        return () => {
            if (toastTimerRef.current) {
                clearTimeout(toastTimerRef.current);
                toastTimerRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (typeof window === "undefined" || !window.matchMedia) return;

        const mq = window.matchMedia(MOBILE_MEDIA);
        const update = () => setIsMobile(Boolean(mq.matches));
        update();

        if (typeof mq.addEventListener === "function") {
            mq.addEventListener("change", update);
            return () => mq.removeEventListener("change", update);
        }

        mq.addListener(update);
        return () => mq.removeListener(update);
    }, []);

    useEffect(() => {
        if (!drawerOpen) return;

        const onKeyDown = (e) => {
            if (e.key === "Escape") closeDrawer();
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [drawerOpen]);

    useEffect(() => {
        if (typeof document === "undefined") return;

        const lockClass = styles.scrollLock;
        const root = document.documentElement;
        const body = document.body;
        const shouldLock = Boolean(isMobile && drawerOpen);

        if (shouldLock) {
            root.classList.add(lockClass);
            body.classList.add(lockClass);
        } else {
            root.classList.remove(lockClass);
            body.classList.remove(lockClass);
        }

        return () => {
            root.classList.remove(lockClass);
            body.classList.remove(lockClass);
        };
    }, [drawerOpen, isMobile]);

    const allowedTabs = useMemo(
        () =>
            new Set(
                EDITOR_CARD_TABS.filter(
                    (t) => canShowAnalyticsTab || t !== PANEL_ANALYTICS,
                ),
            ),
        [canShowAnalyticsTab],
    );

    const activeTab = allowedTabs.has(tab) ? tab : PANEL_TEMPLATES;

    const dirtyCount =
        dirtyPaths && typeof dirtyPaths.size === "number" ? dirtyPaths.size : 0;

    const showPanel = !isMobile || mobileView === "edit";
    const showPreview = !isMobile || mobileView === "preview";

    function handleChangeTab(nextTab) {
        if (!nextTab || !allowedTabs.has(nextTab)) return;

        if (isMobile) setMobileView("edit");
        closeDrawer();
        dismissToast();

        const to = `/edit/card/${nextTab}`;
        if (typeof onRequestNavigate === "function") {
            onRequestNavigate(to);
            return;
        }
        navigate(to);
    }

    useEffect(() => {
        if (!isMobile) return;
        if (mobileView !== "edit") return;
        if (drawerOpen) return;
        if (saveState !== "dirty") return;
        if (!dirtyCount) return;

        showToast();
    }, [dirtyCount, saveState, isMobile, mobileView, drawerOpen]);

    useEffect(() => {
        if (!isMobile) return;

        if (mobileView === "preview") {
            dismissToast();
            return;
        }

        if (!dirtyCount || saveState !== "dirty") {
            dismissToast();
        }
    }, [dirtyCount, saveState, isMobile, mobileView]);

    return (
        <div className={styles.editor}>
            <div className={styles.topbar} dir="rtl">
                <button
                    type="button"
                    className={styles.sectionsTrigger}
                    aria-label={
                        drawerOpen ? "סגירת תפריט עריכה" : "פתיחת תפריט עריכה"
                    }
                    aria-expanded={drawerOpen}
                    aria-controls="editor-sections-drawer"
                    onClick={() => {
                        dismissToast();
                        setDrawerOpen((v) => !v);
                    }}
                >
                    <span className={styles.sectionsIcon} aria-hidden="true">
                        <span className={styles.sectionsDot} />
                        <span className={styles.sectionsDot} />
                        <span className={styles.sectionsDot} />
                        <span className={styles.sectionsDot} />
                    </span>
                    {!showContextBar ? (
                        <span className={styles.sectionsLabel}>
                            תפריט עריכה
                        </span>
                    ) : null}
                </button>

                {isMobile && showContextBar ? (
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
                ) : null}

                <div
                    className={styles.segmented}
                    role="tablist"
                    aria-label="תצוגה"
                >
                    <button
                        type="button"
                        className={cx(
                            styles.segment,
                            mobileView === "edit" && styles.segmentActive,
                        )}
                        role="tab"
                        aria-selected={mobileView === "edit"}
                        onClick={() => {
                            closeDrawer();
                            setMobileView("edit");
                            dismissToast();
                        }}
                    >
                        עריכה
                    </button>
                    <button
                        type="button"
                        className={cx(
                            styles.segment,
                            mobileView === "preview" && styles.segmentActive,
                        )}
                        role="tab"
                        aria-selected={mobileView === "preview"}
                        onClick={() => {
                            closeDrawer();
                            setMobileView("preview");
                            dismissToast();
                        }}
                    >
                        תצוגה
                    </button>
                </div>
            </div>

            <div
                className={cx(
                    styles.drawerOverlay,
                    drawerOpen && styles.drawerOverlayOpen,
                )}
                aria-hidden={!drawerOpen}
                onClick={() => {
                    closeDrawer();
                    dismissToast();
                }}
            />

            <div
                className={cx(
                    styles.sidebarSlot,
                    drawerOpen && styles.drawerOpen,
                )}
                id="editor-sections-drawer"
                aria-hidden={isMobile && !drawerOpen}
            >
                <EditorSidebar
                    activeTab={activeTab}
                    onChangeTab={handleChangeTab}
                    canShowAnalyticsTab={Boolean(canShowAnalyticsTab)}
                    publicUrl={publicUrl}
                    publicPath={publicPath}
                    isPublished={isPublished}
                    activeOrgSlug={activeOrgSlug}
                    myOrgs={myOrgs}
                    onContextChange={onContextChange}
                    onLoadOrgs={onLoadOrgs}
                    showContextBar={showContextBar}
                />
            </div>

            {showPanel ? (
                <main className={styles.panel}>
                    <EditorPanel
                        tab={activeTab}
                        card={card}
                        onFieldChange={onFieldChange}
                        editingDisabled={editingDisabled}
                        onDeleteCard={onDeleteCard}
                        onDeleteDesignAsset={onDeleteDesignAsset}
                        deleteDesignAssetBusyKind={deleteDesignAssetBusyKind}
                        isDeleting={isDeleting}
                        onUpgrade={onUpgrade}
                        onPublish={onPublish}
                        onUnpublish={onUnpublish}
                        onUpdateSlug={onUpdateSlug}
                    />
                    <EditorSaveBar
                        dirtyCount={dirtyCount}
                        saveState={saveState}
                        saveErrorText={saveErrorText}
                        onSave={commitDraft}
                        disabled={Boolean(editingDisabled) || !commitDraft}
                    />
                </main>
            ) : null}

            {showPreview ? (
                <EditorPreview
                    className={styles.preview}
                    card={card}
                    header={previewHeader}
                    footer={previewFooter}
                />
            ) : null}

            {toastOpen && isMobile && mobileView === "edit" && showPanel ? (
                <div
                    className={styles.toast}
                    role="status"
                    aria-live="polite"
                    dir="rtl"
                >
                    <div className={styles.toastText}>עודכן בתצוגה</div>
                    <button
                        type="button"
                        className={styles.toastAction}
                        onClick={() => {
                            setMobileView("preview");
                            dismissToast();
                        }}
                    >
                        צפה
                    </button>
                </div>
            ) : null}
        </div>
    );
}
