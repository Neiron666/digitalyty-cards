/**
 * LEGACY / DEAD UI (Cardigo)
 * Этот компонент сейчас НЕ используется в реальном editor UI.
 *
 * Active path (current): EditorPanel(tab="head") → DesignPanel → DesignEditor
 * Real file to edit: frontend/src/components/editor/design/DesignEditor.jsx
 *
 * Причина: исторический дубль панели “ראש הכרטיס”. Не подключать обратно без отдельного решения/миграции.
 * Политика проекта: один источник правды для UI, без параллельных реализаций.
 */
// NOTE: Any UI work for header/background/avatar MUST be done in DesignEditor, not here.
import { useRef } from "react";
import Panel from "./Panel";
import styles from "./HeaderPanel.module.css";
import { uploadDesignAsset } from "../../../services/upload.service";
import Button from "../../ui/Button";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 2 * 1024 * 1024;

function HeaderPanel({ card, design, onChange, editingDisabled }) {
    const safeDesign = design || {};
    const cardId = card?._id || card?.id;
    const uploadDisabled = !cardId || editingDisabled;

    const backgroundInputRef = useRef(null);
    const avatarInputRef = useRef(null);

    async function handleUpload(kind, file) {
        if (uploadDisabled || !file) return;
        if (!ALLOWED_MIME.has(file.type) || file.size > MAX_BYTES) {
            alert("אנא העלה/י JPG/PNG/WebP עד 2MB");
            return;
        }
        let url;
        try {
            const res = await uploadDesignAsset(cardId, file, kind);
            url = res?.url;
        } catch (err) {
            alert(err?.response?.data?.message || "Upload error");
            return;
        }
        if (!url) {
            alert("Upload error");
            return;
        }
        if (kind === "background") {
            onChange({
                ...safeDesign,
                backgroundImage: url,
                coverImage: url,
            });
        }
        if (kind === "avatar") {
            onChange({
                ...safeDesign,
                avatarImage: url,
                logo: url,
            });
        }
    }

    return (
        <Panel title="ראש הכרטיס">
            <div className={styles.headerPanel}>
                {/* Background upload & preview */}
                <section>
                    <h3>תמונת רקע</h3>
                    <div className={styles.coverSlot}>
                        {safeDesign?.backgroundImage ||
                        safeDesign?.coverImage ? (
                            <img
                                src={
                                    safeDesign?.backgroundImage ||
                                    safeDesign?.coverImage
                                }
                                alt="Background preview"
                                className={styles.coverImage}
                            />
                        ) : (
                            <div className={styles.emptyState}>
                                לא הועלתה תמונת רקע
                            </div>
                        )}
                    </div>

                    <div className={styles.uploadRow}>
                        <Button
                            variant="secondary"
                            size="small"
                            className={styles.uploadButton}
                            disabled={uploadDisabled}
                            onClick={() => {
                                if (uploadDisabled) return;
                                backgroundInputRef.current?.click();
                            }}
                        >
                            העלאת תמונה
                        </Button>
                        <input
                            ref={backgroundInputRef}
                            className={styles.hiddenFileInput}
                            type="file"
                            accept="image/*"
                            disabled={uploadDisabled}
                            aria-disabled={uploadDisabled}
                            aria-label="העלאת תמונת רקע"
                            onChange={(e) =>
                                handleUpload("background", e.target.files?.[0])
                            }
                        />
                    </div>
                    {!cardId && (
                        <p className={styles.disabledText}>
                            שמור/י את הכרטיס כדי להעלות תמונות.
                        </p>
                    )}
                    <label className={styles.label}>
                        Overlay
                        <input
                            type="range"
                            min={0}
                            max={70}
                            value={Number(safeDesign?.backgroundOverlay ?? 40)}
                            onChange={(e) =>
                                onChange({
                                    ...safeDesign,
                                    backgroundOverlay: Number(e.target.value),
                                })
                            }
                        />
                    </label>
                </section>

                {/* Avatar upload & preview */}
                <section>
                    <h3>תמונה עגולה (Avatar)</h3>
                    <div className={styles.avatarSlot}>
                        {safeDesign?.avatarImage || safeDesign?.logo ? (
                            <img
                                src={
                                    safeDesign?.avatarImage || safeDesign?.logo
                                }
                                alt="Avatar preview"
                                className={styles.avatarImage}
                            />
                        ) : (
                            <div className={styles.emptyState}>
                                לא הועלתה תמונת פרופיל
                            </div>
                        )}
                    </div>

                    <div className={styles.uploadRow}>
                        <Button
                            variant="secondary"
                            size="small"
                            className={styles.uploadButton}
                            disabled={uploadDisabled}
                            onClick={() => {
                                if (uploadDisabled) return;
                                avatarInputRef.current?.click();
                            }}
                        >
                            העלאת תמונה
                        </Button>
                        <input
                            ref={avatarInputRef}
                            className={styles.hiddenFileInput}
                            type="file"
                            accept="image/*"
                            disabled={uploadDisabled}
                            aria-disabled={uploadDisabled}
                            aria-label="העלאת תמונת פרופיל"
                            onChange={(e) =>
                                handleUpload("avatar", e.target.files?.[0])
                            }
                        />
                    </div>
                </section>
            </div>
        </Panel>
    );
}

export default HeaderPanel;
