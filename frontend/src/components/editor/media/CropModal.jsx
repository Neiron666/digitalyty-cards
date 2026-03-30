import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import styles from "./CropModal.module.css";
import useFocusTrap from "../../../hooks/useFocusTrap";

export default function CropModal({
    open,
    title,
    imageUrl,
    aspect,
    cropShape,
    onCancel,
    onApply,
}) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const dialogRef = useRef(null);
    const cancelButtonRef = useRef(null);

    useFocusTrap(dialogRef, Boolean(open));

    // Focus the cancel button on open.
    useEffect(() => {
        if (!open) return;
        const t = window.setTimeout(() => {
            cancelButtonRef.current?.focus?.();
        }, 0);
        return () => window.clearTimeout(t);
    }, [open]);

    // Close on Escape.
    useEffect(() => {
        if (!open) return;
        const onKeyDown = (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                onCancel?.();
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, onCancel]);

    const safeAspect = useMemo(() => {
        const v = Number(aspect);
        return Number.isFinite(v) && v > 0 ? v : 1;
    }, [aspect]);

    const safeCropShape = cropShape === "round" ? "round" : "rect";

    const handleCropComplete = useCallback((_, pixels) => {
        setCroppedAreaPixels(pixels);
    }, []);

    const handleApply = useCallback(() => {
        if (!croppedAreaPixels) return;
        onApply?.(croppedAreaPixels);
    }, [croppedAreaPixels, onApply]);

    if (!open) return null;

    return (
        <div
            ref={dialogRef}
            className={styles.backdrop}
            role="dialog"
            aria-modal="true"
            aria-label={title || "Crop image"}
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onCancel?.();
            }}
        >
            <div className={styles.modal} dir="rtl">
                <div className={styles.header}>
                    <h3 className={styles.title}>{title || "Crop"}</h3>
                    <button
                        ref={cancelButtonRef}
                        type="button"
                        className={styles.button}
                        onClick={onCancel}
                    >
                        סגור
                    </button>
                </div>

                <div className={styles.body}>
                    <Cropper
                        image={imageUrl}
                        crop={crop}
                        zoom={zoom}
                        aspect={safeAspect}
                        cropShape={safeCropShape}
                        showGrid={safeCropShape !== "round"}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={handleCropComplete}
                    />
                </div>

                <div className={styles.controls}>
                    <div className={styles.zoomRow}>
                        <div className={styles.zoomLabel}>זום</div>
                        <input
                            className={styles.zoomInput}
                            type="range"
                            min={1}
                            max={3}
                            step={0.02}
                            value={zoom}
                            onChange={(e) => setZoom(Number(e.target.value))}
                        />
                    </div>

                    <div className={styles.actions}>
                        <button
                            type="button"
                            className={styles.button}
                            onClick={onCancel}
                        >
                            ביטול
                        </button>
                        <button
                            type="button"
                            className={`${styles.button} ${styles.buttonPrimary}`}
                            onClick={handleApply}
                            disabled={!croppedAreaPixels}
                        >
                            החל
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
