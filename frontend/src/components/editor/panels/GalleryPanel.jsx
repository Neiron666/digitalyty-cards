import { useEffect, useMemo, useRef, useState } from "react";
import {
    uploadDesignAsset,
    uploadGalleryImage,
} from "../../../services/upload.service";
import Panel from "./Panel";
import Button from "../../ui/Button";
import { galleryItemToUrl } from "../../../utils/gallery";
import CropModal from "../media/CropModal";
import { getCroppedBlob } from "../../../utils/imageCropper";
import styles from "./GalleryPanel.module.css";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 2 * 1024 * 1024;

export default function GalleryPanel({
    gallery = [],
    cardId,
    galleryLimit,
    onChange,
}) {
    const limit =
        typeof galleryLimit === "number" && Number.isFinite(galleryLimit)
            ? galleryLimit
            : 12;
    const reachedLimit = gallery.length >= limit;

    const latestGalleryRef = useRef(gallery);
    useEffect(() => {
        latestGalleryRef.current = gallery;
    }, [gallery]);

    const objectUrlRef = useRef(null);
    const [cropOpen, setCropOpen] = useState(false);
    const [cropImageUrl, setCropImageUrl] = useState(null);
    const [cropTarget, setCropTarget] = useState(null);
    const [isApplying, setIsApplying] = useState(false);

    const cropTitle = useMemo(() => "בחר/י חיתוך לתמונה הממוזערת", []);

    function cleanupObjectUrl() {
        if (objectUrlRef.current) {
            try {
                URL.revokeObjectURL(objectUrlRef.current);
            } catch {}
            objectUrlRef.current = null;
        }
    }

    function closeCrop() {
        if (isApplying) return;
        setCropOpen(false);
        setCropImageUrl(null);
        setCropTarget(null);
        setIsApplying(false);
        cleanupObjectUrl();
    }

    function handleCancelCrop() {
        if (isApplying) return;

        if (!cropTarget) {
            closeCrop();
            return;
        }

        const currentGallery = latestGalleryRef.current;
        const idx = findTargetIndex(currentGallery, cropTarget);
        if (idx !== -1) {
            onChange(currentGallery.filter((_, i) => i !== idx));
        }

        closeCrop();
    }

    function findTargetIndex(currentGallery, target) {
        if (!Array.isArray(currentGallery) || !target) return -1;

        const targetPath =
            typeof target.path === "string" ? target.path.trim() : "";
        const targetUrl =
            typeof target.url === "string" ? target.url.trim() : "";
        const targetCreatedAt =
            typeof target.createdAt === "string" ? target.createdAt.trim() : "";

        if (targetPath) {
            const idx = currentGallery.findIndex((item) => {
                if (!item || typeof item !== "object") return false;
                const p = typeof item.path === "string" ? item.path.trim() : "";
                return p && p === targetPath;
            });
            if (idx !== -1) return idx;
        }

        if (targetUrl) {
            const matches = [];
            currentGallery.forEach((item, idx) => {
                if (typeof item === "string") {
                    if (item.trim() === targetUrl) matches.push(idx);
                    return;
                }
                if (!item || typeof item !== "object") return;
                const u = typeof item.url === "string" ? item.url.trim() : "";
                if (u && u === targetUrl) matches.push(idx);
            });

            if (matches.length === 1) return matches[0];

            if (matches.length > 1 && targetCreatedAt) {
                const byCreatedAt = matches.find((idx) => {
                    const item = currentGallery[idx];
                    if (!item || typeof item !== "object") return false;
                    const ca =
                        typeof item.createdAt === "string"
                            ? item.createdAt.trim()
                            : "";
                    return ca && ca === targetCreatedAt;
                });
                if (typeof byCreatedAt === "number") return byCreatedAt;
            }

            if (matches.length > 1) {
                console.warn("[gallery-thumb] duplicate url matches", {
                    cardId,
                    targetUrl,
                    matches: matches.length,
                });
                return matches[0];
            }
        }

        return -1;
    }

    async function handleUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        e.target.value = "";

        if (!ALLOWED_MIME.has(file.type) || file.size > MAX_BYTES) {
            alert("אנא העלה/י JPG/PNG/WebP עד 2MB");
            return;
        }

        cleanupObjectUrl();
        objectUrlRef.current = URL.createObjectURL(file);

        try {
            const res = await uploadGalleryImage(cardId, file);
            const createdAt = new Date().toISOString();
            const item = res?.path
                ? {
                      url: res.url,
                      path: res.path,
                      createdAt,
                  }
                : res.url;

            // Prefer storing object items when backend returns path.
            onChange([...gallery, item]);

            setCropTarget({
                path: res?.path || null,
                url: res?.url || null,
                createdAt,
            });
            setCropImageUrl(objectUrlRef.current);
            setCropOpen(true);
        } catch (err) {
            cleanupObjectUrl();
            if (err.response?.data?.code === "GALLERY_LIMIT_REACHED") {
                alert(err?.response?.data?.message || "Gallery limit reached");
            } else {
                alert(err?.response?.data?.message || "Upload error");
            }
        }
    }

    async function handleApplyCrop(cropPixels) {
        if (isApplying) return;
        if (!cardId || !cropTarget || !cropImageUrl) return;

        const currentGallery = latestGalleryRef.current;
        const idx = findTargetIndex(currentGallery, cropTarget);
        if (idx === -1) {
            closeCrop();
            return;
        }

        setIsApplying(true);
        try {
            const blob = await getCroppedBlob({
                imageSrc: cropImageUrl,
                cropPixels,
                outputWidth: 600,
                outputHeight: 600,
                mimeType: "image/jpeg",
                quality: 0.9,
            });

            const thumbFile = new File([blob], "gallery-thumb.jpg", {
                type: blob.type || "image/jpeg",
            });

            const uploaded = await uploadDesignAsset(
                cardId,
                thumbFile,
                "galleryThumb",
            );

            const galleryAfterUpload = latestGalleryRef.current;
            const nextIdx = findTargetIndex(galleryAfterUpload, cropTarget);
            if (nextIdx === -1) {
                closeCrop();
                return;
            }

            const nextGallery = [...galleryAfterUpload];
            const prev = nextGallery[nextIdx];

            if (typeof prev === "string") {
                nextGallery[nextIdx] = {
                    url: cropTarget.url || prev.trim(),
                    path: cropTarget.path || null,
                    createdAt: cropTarget.createdAt || new Date().toISOString(),
                    thumbUrl: uploaded.url,
                    thumbPath: uploaded.path,
                };
            } else if (prev && typeof prev === "object") {
                nextGallery[nextIdx] = {
                    ...prev,
                    thumbUrl: uploaded.url,
                    thumbPath: uploaded.path,
                };
            }

            onChange(nextGallery);
            closeCrop();
        } catch (err) {
            alert(
                err?.response?.data?.message || err?.message || "Crop failed",
            );
            setIsApplying(false);
        }
    }

    function removeImage(index) {
        if (cropOpen || isApplying) return;
        onChange(gallery.filter((_, i) => i !== index));
    }

    function isSafeEditorPreviewUrl(raw) {
        if (typeof raw !== "string") return false;
        const url = raw.trim();
        if (!url) return false;
        if (/^https?:\/\//i.test(url)) return true;
        if (url.startsWith("/uploads/")) return true;
        if (url.startsWith("uploads/")) return true;
        return false;
    }

    return (
        <Panel title="גלריה">
            <CropModal
                open={cropOpen}
                title={cropTitle}
                imageUrl={cropImageUrl}
                aspect={1}
                cropShape="rect"
                onCancel={handleCancelCrop}
                onApply={handleApplyCrop}
            />

            <ul className={styles.list}>
                {(() => {
                    const seenKeys = new Set();

                    return gallery.map((item, index) => {
                        const url = galleryItemToUrl(item);
                        if (!url) return null;

                        const baseKey =
                            item &&
                            typeof item === "object" &&
                            typeof item.path === "string" &&
                            item.path.trim()
                                ? item.path.trim()
                                : url
                                  ? url
                                  : `gallery-row-${index}`;

                        const createdAtKey =
                            item &&
                            typeof item === "object" &&
                            typeof item.createdAt === "string"
                                ? item.createdAt.trim()
                                : "";

                        const key = seenKeys.has(baseKey)
                            ? `${baseKey}|${createdAtKey || index}`
                            : baseKey;
                        seenKeys.add(baseKey);
                        const thumbUrlRaw =
                            item && typeof item === "object"
                                ? typeof item.thumbUrl === "string"
                                    ? item.thumbUrl
                                    : typeof item.thumbPath === "string"
                                      ? item.thumbPath
                                      : null
                                : null;

                        const safeThumbTrimmed =
                            typeof thumbUrlRaw === "string"
                                ? thumbUrlRaw.trim()
                                : "";
                        const previewSrc = isSafeEditorPreviewUrl(thumbUrlRaw)
                            ? safeThumbTrimmed.startsWith("uploads/")
                                ? `/${safeThumbTrimmed}`
                                : safeThumbTrimmed
                            : url;

                        return (
                            <li key={key} className={styles.row}>
                                <img
                                    src={previewSrc}
                                    alt=""
                                    className={styles.thumb}
                                />
                                <Button
                                    variant="secondary"
                                    size="small"
                                    onClick={() => removeImage(index)}
                                    disabled={cropOpen || isApplying}
                                >
                                    הסר
                                </Button>
                            </li>
                        );
                    });
                })()}
            </ul>

            <input
                type="file"
                accept="image/*"
                onChange={handleUpload}
                disabled={!cardId || reachedLimit || cropOpen || isApplying}
            />

            <p className={styles.hint}>מוגבל ל־{limit} תמונות</p>
        </Panel>
    );
}
