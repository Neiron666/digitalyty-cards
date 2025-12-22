import { useNavigate, useParams } from "react-router-dom";
import styles from "./Editor.module.css";
import EditorSidebar from "./EditorSidebar";
import EditorPanel from "./EditorPanel";
import EditorPreview from "./EditorPreview";

export default function Editor({
    card,
    onFieldChange,
    editingDisabled,
    onDeleteCard,
    onUpgrade,
    onPublish,
    onUnpublish,
    previewHeader,
    previewFooter,
}) {
    const navigate = useNavigate();
    const { tab } = useParams(); // route: /edit/card/:tab

    const allowedTabs = new Set([
        "templates",
        "business",
        "contact",
        "content",
        "design",
        "gallery",
        "reviews",
        "seo",
        "settings",
    ]);

    const activeTab = allowedTabs.has(tab) ? tab : "business";

    function handleChangeTab(nextTab) {
        if (!nextTab || !allowedTabs.has(nextTab)) return;
        navigate(`/edit/card/${nextTab}`);
    }

    return (
        <div className={styles.editor}>
            <EditorSidebar
                activeTab={activeTab}
                onChangeTab={handleChangeTab}
            />

            <main className={styles.panel}>
                <EditorPanel
                    tab={activeTab}
                    card={card}
                    onFieldChange={onFieldChange}
                    editingDisabled={editingDisabled}
                    onDeleteCard={onDeleteCard}
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
