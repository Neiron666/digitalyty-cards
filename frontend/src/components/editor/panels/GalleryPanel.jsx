import { uploadGalleryImage } from "../../../services/upload.service";
import Paywall from "../../common/Paywall";
import Panel from "./Panel";
import Button from "../../ui/Button";
import { galleryItemToUrl } from "../../../utils/gallery";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 2 * 1024 * 1024;

export default function GalleryPanel({
    gallery = [],
    cardId,
    plan,
    onChange,
    onUpgrade,
}) {
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
                res?.path ? { url: res.url, path: res.path, createdAt: new Date().toISOString() } : res.url,
            ]);
        } catch (err) {
            if (err.response?.data?.code === "GALLERY_LIMIT_REACHED") {
                onUpgrade?.();
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
            <ul className="gallery-list">
                {gallery.map((item, index) => {
                    const url = galleryItemToUrl(item);
                    if (!url) return null;

                    return (
                        <li
                            key={index}
                            style={{
                                display: "flex",
                                gap: 8,
                                alignItems: "center",
                            }}
                        >
                            <img
                                src={url}
                                alt=""
                                style={{
                                    width: 64,
                                    height: 64,
                                    objectFit: "cover",
                                    borderRadius: 8,
                                }}
                            />
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

            <input type="file" accept="image/*" onChange={handleUpload} />

            {plan === "free" && (
                <p className="hint">חבילת חינם מוגבלת ל־5 תמונות</p>
            )}

            {plan === "free" && gallery.length >= 5 && (
                <Paywall text="הגעת למגבלת תמונות" onUpgrade={onUpgrade} />
            )}
        </Panel>
    );
}
