import { uploadGalleryImage } from "../../../services/upload.service";
import Paywall from "../../common/Paywall";
import Panel from "./Panel";
import Button from "../../ui/Button";
import { galleryItemToUrl } from "../../../utils/gallery";
import styles from "./GalleryPanel.module.css";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 2 * 1024 * 1024;

export default function GalleryPanel({
    gallery = [],
    cardId,
    plan,
    galleryLimit,
    onChange,
    onUpgrade,
}) {
    const limit =
        typeof galleryLimit === "number" && Number.isFinite(galleryLimit)
            ? galleryLimit
            : 5;
    const reachedLimit = gallery.length >= limit;

    async function handleUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!ALLOWED_MIME.has(file.type) || file.size > MAX_BYTES) {
            alert("אנא העלה/י JPG/PNG/WebP עד 2MB");
            return;
        }

        try {
            const res = await uploadGalleryImage(cardId, file);
            // Prefer storing object items when backend returns path.
            onChange([
                ...gallery,
                res?.path
                    ? {
                          url: res.url,
                          path: res.path,
                          createdAt: new Date().toISOString(),
                      }
                    : res.url,
            ]);
        } catch (err) {
            if (err.response?.data?.code === "GALLERY_LIMIT_REACHED") {
                if (plan === "free") {
                    onUpgrade?.();
                } else {
                    alert(
                        err?.response?.data?.message || "Gallery limit reached"
                    );
                }
            } else {
                alert(err?.response?.data?.message || "Upload error");
            }
        }
    }

    function removeImage(index) {
        onChange(gallery.filter((_, i) => i !== index));
    }

    return (
        <Panel title="גלריה">
            <ul className={styles.list}>
                {gallery.map((item, index) => {
                    const url = galleryItemToUrl(item);
                    if (!url) return null;

                    return (
                        <li key={index} className={styles.row}>
                            <img src={url} alt="" className={styles.thumb} />
                            <Button
                                variant="secondary"
                                size="small"
                                onClick={() => removeImage(index)}
                            >
                                הסר
                            </Button>
                        </li>
                    );
                })}
            </ul>

            <input
                type="file"
                accept="image/*"
                onChange={handleUpload}
                disabled={!cardId || reachedLimit}
            />

            <p className={styles.hint}>מוגבל ל־{limit} תמונות</p>

            {plan === "free" && reachedLimit && (
                <Paywall text="הגעת למגבלת תמונות" onUpgrade={onUpgrade} />
            )}
        </Panel>
    );
}
