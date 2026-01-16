import styles from "./EditorSaveBar.module.css";

export default function EditorSaveBar({
    dirtyCount,
    saveState,
    saveErrorText,
    onSave,
    disabled,
}) {
    const isSaving = saveState === "saving";
    const isDirty = saveState === "dirty";
    const isSaved = saveState === "saved";
    const isError = saveState === "error";

    const saveDisabled = Boolean(disabled) || isSaving || !dirtyCount;

    return (
        <div className={styles.bar} dir="rtl">
            <button
                type="button"
                className={styles.saveButton}
                onClick={() => onSave?.()}
                disabled={saveDisabled}
            >
                {isSaving ? "שומר…" : "שמור שינויים"}
            </button>

            <div
                className={`${styles.status} ${
                    isDirty
                        ? styles.statusDirty
                        : isError
                        ? styles.statusError
                        : isSaved
                        ? styles.statusSaved
                        : styles.statusIdle
                }`}
                role={isError ? "alert" : "status"}
                aria-live="polite"
            >
                {isDirty ? "יש שינויים שלא נשמרו" : null}
                {isSaving ? "שומר…" : null}
                {isSaved ? "נשמר" : null}
                {isError ? (
                    <span className={styles.errorText}>
                        שגיאה בשמירה{saveErrorText ? `: ${saveErrorText}` : ""}
                    </span>
                ) : null}
            </div>
        </div>
    );
}
