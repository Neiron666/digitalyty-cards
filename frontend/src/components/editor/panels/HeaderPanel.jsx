import Panel from "./Panel";
import styles from "./HeaderPanel.module.css";
import { uploadDesignAsset } from "../../../services/upload.service";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 2 * 1024 * 1024;

function HeaderPanel({ card, design, onChange, editingDisabled }) {
    const safeDesign = design || {};
    const cardId = card?._id || card?.id;
    const uploadDisabled = !cardId || editingDisabled;

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
                    {(safeDesign?.backgroundImage ||
                        safeDesign?.coverImage) && (
                        <img
                            src={
                                safeDesign?.backgroundImage ||
                                safeDesign?.coverImage
                            }
                            alt="Background preview"
                            className={styles.preview}
                        />
                    )}
                    <label className={styles.label}>
                        העלאת תמונה
                        <input
                            type="file"
                            accept="image/*"
                            disabled={uploadDisabled}
                            aria-disabled={uploadDisabled}
                            onChange={(e) =>
                                handleUpload("background", e.target.files?.[0])
                            }
                        />
                    </label>
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
                    {(safeDesign?.avatarImage || safeDesign?.logo) && (
                        <img
                            src={safeDesign?.avatarImage || safeDesign?.logo}
                            alt="Avatar preview"
                            className={styles.avatarPreview}
                        />
                    )}
                    <label className={styles.label}>
                        העלאת תמונה
                        <input
                            type="file"
                            accept="image/*"
                            disabled={uploadDisabled}
                            aria-disabled={uploadDisabled}
                            onChange={(e) =>
                                handleUpload("avatar", e.target.files?.[0])
                            }
                        />
                    </label>
                </section>
            </div>
        </Panel>
    );
}

export default HeaderPanel;
