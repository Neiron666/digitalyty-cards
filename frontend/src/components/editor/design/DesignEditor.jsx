import ColorPicker from "./ColorPicker";
import FontPicker from "./FontPicker";
import {
    getTemplateById,
    normalizeTemplateId,
} from "../../../templates/templates.config";
import { uploadDesignAsset } from "../../../services/upload.service";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 2 * 1024 * 1024;

function DesignEditor({ design, onChange, plan, cardId }) {
    const safeDesign = design || {};
    const template = getTemplateById(
        normalizeTemplateId(safeDesign?.templateId)
    );

    async function handleUpload(kind, file) {
        if (!cardId || !file) return;

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
        <aside>
            <h2>עיצוב הכרטיס</h2>

            {template?.supports?.backgroundImage && (
                <section>
                    <h3>תמונת רקע</h3>
                    {safeDesign?.backgroundImage || safeDesign?.coverImage ? (
                        <img
                            src={
                                safeDesign?.backgroundImage ||
                                safeDesign?.coverImage
                            }
                            alt="Background preview"
                            style={{
                                width: "100%",
                                borderRadius: "var(--radius-md)",
                                border: "1px solid var(--border)",
                                display: "block",
                                marginBottom: 8,
                            }}
                        />
                    ) : null}
                    <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontWeight: 800 }}>העלאת תמונה</span>
                        <input
                            type="file"
                            accept="image/*"
                            disabled={!cardId}
                            aria-disabled={!cardId}
                            onChange={(e) =>
                                handleUpload("background", e.target.files?.[0])
                            }
                        />
                    </label>

                    {!cardId ? (
                        <p
                            style={{
                                margin: "6px 0 0",
                                color: "var(--text-muted)",
                            }}
                        >
                            שמור/י את הכרטיס כדי להעלות תמונות.
                        </p>
                    ) : null}

                    <label style={{ display: "grid", gap: 6, marginTop: 10 }}>
                        <span style={{ fontWeight: 800 }}>Overlay</span>
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
            )}

            {template?.supports?.avatar && (
                <section>
                    <h3>תמונה עגולה (Avatar)</h3>
                    {safeDesign?.avatarImage || safeDesign?.logo ? (
                        <img
                            src={safeDesign?.avatarImage || safeDesign?.logo}
                            alt="Avatar preview"
                            style={{
                                width: 96,
                                height: 96,
                                borderRadius: 999,
                                border: "1px solid var(--border)",
                                display: "block",
                                objectFit: "cover",
                                marginBottom: 8,
                            }}
                        />
                    ) : null}
                    <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontWeight: 800 }}>העלאת תמונה</span>
                        <input
                            type="file"
                            accept="image/*"
                            disabled={!cardId}
                            aria-disabled={!cardId}
                            onChange={(e) =>
                                handleUpload("avatar", e.target.files?.[0])
                            }
                        />
                    </label>
                </section>
            )}

            <ColorPicker
                label="צבע ראשי"
                value={safeDesign.primaryColor}
                onChange={(primaryColor) =>
                    onChange({ ...safeDesign, primaryColor })
                }
                disabled={plan === "free"}
            />

            <FontPicker
                value={safeDesign.font}
                onChange={(font) => onChange({ ...safeDesign, font })}
                disabled={plan === "free"}
            />
        </aside>
    );
}

export default DesignEditor;
