import ColorPicker from "./ColorPicker";
import FontPicker from "./FontPicker";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    getTemplateById,
    normalizeTemplateId,
} from "../../../templates/templates.config";
import { uploadDesignAsset } from "../../../services/upload.service";
import CropModal from "../media/CropModal";
import { getCroppedBlob } from "../../../utils/imageCropper";
import Button from "../../ui/Button";
import styles from "./DesignEditor.module.css";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 2 * 1024 * 1024;

const COVER_ASPECT = 16 / 9;
const AVATAR_ASPECT = 1;

const COVER_OUTPUT = { width: 1600, height: 900 };
const AVATAR_OUTPUT = { width: 600, height: 600 };

function DesignEditor({ design, onChange, plan, cardId }) {
    const safeDesign = design || {};
    const template = getTemplateById(
        normalizeTemplateId(safeDesign?.templateId),
    );

    const [cropOpen, setCropOpen] = useState(false);
    const [cropKind, setCropKind] = useState(null);
    const [cropTitle, setCropTitle] = useState("");
    const [cropAspect, setCropAspect] = useState(1);
    const [cropShape, setCropShape] = useState("rect");
    const [cropImageUrl, setCropImageUrl] = useState("");
    const [pendingFile, setPendingFile] = useState(null);

    const objectUrlRef = useRef(null);
    const backgroundInputRef = useRef(null);
    const avatarInputRef = useRef(null);

    const hasBackgroundImage = useMemo(
        () => Boolean(safeDesign?.backgroundImage || safeDesign?.coverImage),
        [safeDesign?.backgroundImage, safeDesign?.coverImage],
    );

    const hasAvatarImage = useMemo(
        () => Boolean(safeDesign?.avatarImage || safeDesign?.logo),
        [safeDesign?.avatarImage, safeDesign?.logo],
    );

    const backgroundPreviewSrc =
        safeDesign?.backgroundImage || safeDesign?.coverImage || "";
    const avatarPreviewSrc = safeDesign?.avatarImage || safeDesign?.logo || "";

    useEffect(() => {
        return () => {
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
                objectUrlRef.current = null;
            }
        };
    }, []);

    function openCropFor(kind, file) {
        if (!file) return;

        if (!ALLOWED_MIME.has(file.type) || file.size > MAX_BYTES) {
            alert("אנא העלה/י JPG/PNG/WebP עד 2MB");
            return;
        }

        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
        }

        const url = URL.createObjectURL(file);
        objectUrlRef.current = url;

        setPendingFile(file);
        setCropKind(kind);

        if (kind === "background") {
            setCropTitle("חיתוך תמונת רקע (16:9)");
            setCropAspect(COVER_ASPECT);
            setCropShape("rect");
        } else {
            setCropTitle("חיתוך תמונת פרופיל (1:1)");
            setCropAspect(AVATAR_ASPECT);
            setCropShape("round");
        }

        setCropImageUrl(url);
        setCropOpen(true);
    }

    async function uploadCropped(kind, blob) {
        if (!cardId || !blob) return null;

        const safeKind = kind === "avatar" ? "avatar" : "background";
        const fileName = safeKind === "avatar" ? "avatar.jpg" : "cover.jpg";
        const croppedFile = new File([blob], fileName, { type: blob.type });

        const res = await uploadDesignAsset(cardId, croppedFile, safeKind);
        return res?.url || null;
    }

    async function handleApplyCrop(cropPixels) {
        if (!cropKind || !pendingFile || !cropImageUrl) return;
        if (!cardId) return;

        const output = cropKind === "avatar" ? AVATAR_OUTPUT : COVER_OUTPUT;

        let url;
        try {
            const blob = await getCroppedBlob({
                imageSrc: cropImageUrl,
                cropPixels,
                outputWidth: output.width,
                outputHeight: output.height,
            });
            url = await uploadCropped(cropKind, blob);
        } catch (err) {
            alert(
                err?.response?.data?.message || err?.message || "Upload error",
            );
            return;
        }

        if (!url) {
            alert("Upload error");
            return;
        }

        if (cropKind === "background") {
            onChange({
                ...safeDesign,
                backgroundImage: url,
                coverImage: url,
            });
        }

        if (cropKind === "avatar") {
            onChange({
                ...safeDesign,
                avatarImage: url,
                logo: url,
            });
        }

        setCropOpen(false);
        setPendingFile(null);
        setCropKind(null);
        setCropImageUrl("");
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
        }
    }

    function handleCancelCrop() {
        setCropOpen(false);
        setPendingFile(null);
        setCropKind(null);
        setCropImageUrl("");
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
        }
    }

    return (
        <aside className={styles.root}>
            {/* <h2>ראש הכרטיס</h2> */}

            {template?.supports?.backgroundImage && (
                <section className={styles.section}>
                    <h3>תמונת רקע</h3>
                    <div className={styles.coverSlot}>
                        {hasBackgroundImage ? (
                            <img
                                src={backgroundPreviewSrc}
                                alt="Background preview"
                                className={styles.coverSlotImage}
                            />
                        ) : (
                            <div className={styles.emptyState}>
                                העלה/י תמונה כדי לראות תצוגה מקדימה.
                            </div>
                        )}
                    </div>

                    <div className={styles.uploadRow}>
                        <Button
                            className={styles.uploadButton}
                            disabled={!cardId}
                            aria-label="העלאת תמונת רקע"
                            onClick={() => {
                                if (!cardId) return;
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
                            disabled={!cardId}
                            aria-disabled={!cardId}
                            onChange={(e) =>
                                openCropFor(
                                    "background",
                                    e.target.files?.[0] || null,
                                )
                            }
                        />
                    </div>

                    {!cardId ? (
                        <p className={styles.helper}>
                            שמור/י את הכרטיס כדי להעלות תמונות.
                        </p>
                    ) : null}

                    <label className={styles.label}>
                        <span className={styles.labelTitle}>שקיפות רקע</span>
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
                <section className={styles.section}>
                    <h3>תמונה עגולה (Avatar)</h3>
                    <div className={styles.avatarSlot}>
                        {hasAvatarImage ? (
                            <img
                                src={avatarPreviewSrc}
                                alt="Avatar preview"
                                className={styles.avatarSlotImage}
                            />
                        ) : (
                            <div className={styles.emptyState}>
                                העלה/י תמונה כדי לראות תצוגה מקדימה.
                            </div>
                        )}
                    </div>

                    <div className={styles.uploadRow}>
                        <Button
                            className={styles.uploadButton}
                            disabled={!cardId}
                            aria-label="העלאת תמונת פרופיל"
                            onClick={() => {
                                if (!cardId) return;
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
                            disabled={!cardId}
                            aria-disabled={!cardId}
                            onChange={(e) =>
                                openCropFor(
                                    "avatar",
                                    e.target.files?.[0] || null,
                                )
                            }
                        />
                    </div>
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

            <CropModal
                open={cropOpen}
                title={cropTitle}
                imageUrl={cropImageUrl}
                aspect={cropAspect}
                cropShape={cropShape}
                onCancel={handleCancelCrop}
                onApply={handleApplyCrop}
            />
        </aside>
    );
}

export default DesignEditor;
