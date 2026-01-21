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

export default function Editor({
    card,
    onFieldChange,
    editingDisabled,
    onDeleteCard,
    isDeleting,
    onUpgrade,
    onPublish,
    onUnpublish,
    previewHeader,
    previewFooter,
    canShowAnalyticsTab,
    commitDraft,
    dirtyPaths,
    saveState,
    saveErrorText,
}) {
    const navigate = useNavigate();
    const { tab } = useParams(); // route: /edit/card/:tab

    const allowedTabs = new Set(
        EDITOR_CARD_TABS.filter(
            (t) => canShowAnalyticsTab || t !== PANEL_ANALYTICS,
        ),
    );

    const activeTab = allowedTabs.has(tab) ? tab : PANEL_TEMPLATES;

    const dirtyCount =
        dirtyPaths && typeof dirtyPaths.size === "number" ? dirtyPaths.size : 0;

    function handleChangeTab(nextTab) {
        if (!nextTab || !allowedTabs.has(nextTab)) return;
        navigate(`/edit/card/${nextTab}`);
    }

    return (
        <div className={styles.editor}>
            <EditorSidebar
                activeTab={activeTab}
                onChangeTab={handleChangeTab}
                canShowAnalyticsTab={Boolean(canShowAnalyticsTab)}
            />

            <main className={styles.panel}>
                <EditorSaveBar
                    dirtyCount={dirtyCount}
                    saveState={saveState}
                    saveErrorText={saveErrorText}
                    onSave={commitDraft}
                    disabled={Boolean(editingDisabled) || !commitDraft}
                />
                <EditorPanel
                    tab={activeTab}
                    card={card}
                    onFieldChange={onFieldChange}
                    editingDisabled={editingDisabled}
                    onDeleteCard={onDeleteCard}
                    isDeleting={isDeleting}
                    onUpgrade={onUpgrade}
                    onPublish={onPublish}
                    onUnpublish={onUnpublish}
                />
            </main>

            <EditorPreview
                className={styles.preview}
                card={card}
                header={previewHeader}
                footer={previewFooter}
            />
        </div>
    );
}
