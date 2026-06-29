import { useEffect, useRef, useState } from "react";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import FlashBanner from "../../components/ui/FlashBanner/FlashBanner";
import {
    listAdminCardsShowcaseItems,
    getAdminCardsShowcaseItemById,
    createAdminCardsShowcaseItem,
    updateAdminCardsShowcaseItem,
    activateAdminCardsShowcaseItem,
    deactivateAdminCardsShowcaseItem,
    deleteAdminCardsShowcaseItem,
    uploadAdminCardsShowcaseImage,
    removeAdminCardsShowcaseImage,
} from "../../services/admin.service";
import styles from "./AdminCardsShowcaseView.module.css";

function safeString(value) {
    if (value == null) return "";
    return String(value);
}

function mapShowcaseApiError(err) {
    const status = err?.response?.status;
    const code = err?.response?.data?.code;
    if (status === 401 || code === "UNAUTHORIZED") return "נדרשת התחברות.";
    if (status === 403 || code === "FORBIDDEN") return "אין הרשאות לפעולה זו.";
    if (status === 404 || code === "NOT_FOUND") return "הפריט לא נמצא.";
    if (status === 409 || code === "CONFLICT") return "קונפליקט — נסה שוב.";
    if (status === 413) return "הקובץ גדול מדי.";
    if (status === 422 || code === "ACTIVE_ITEM_INVARIANT_VIOLATION")
        return (
            err?.response?.data?.reason ||
            "לא ניתן לשמור — יש למלא את כל שדות החובה לפני הפעלה."
        );
    return "אירעה שגיאה. נסה שוב.";
}

/* ── Component ──────────────────────────────────────────────────── */

export default function AdminCardsShowcaseView() {
    /* ── Flash ──────────────────────────────────── */
    const [flash, setFlash] = useState(null);
    const flashTimerRef = useRef(null);

    function showFlash(type, text) {
        if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
        setFlash({ type, text });
        flashTimerRef.current = setTimeout(() => setFlash(null), 3500);
    }

    /* ── List state ─────────────────────────────── */
    const [items, setItems] = useState([]);
    const [itemsTotal, setItemsTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit] = useState(25);
    const [searchQ, setSearchQ] = useState("");
    const [listLoading, setListLoading] = useState(false);

    /* ── Selected item state ────────────────────── */
    const [selectedId, setSelectedId] = useState(null);
    const [selectedBusy, setSelectedBusy] = useState(false);

    // Form fields
    const [fInternalName, setFInternalName] = useState("");
    const [fTitle, setFTitle] = useState("");
    const [fDescription, setFDescription] = useState("");
    const [fImageAlt, setFImageAlt] = useState("");
    const [fCtaUrl, setFCtaUrl] = useState("");
    const [fCtaLabel, setFCtaLabel] = useState("");
    const [fSortOrder, setFSortOrder] = useState("0");
    const [fImageUrl, setFImageUrl] = useState(null);
    const [fIsActive, setFIsActive] = useState(false);
    const [fCreatedAt, setFCreatedAt] = useState(null);
    const [fUpdatedAt, setFUpdatedAt] = useState(null);

    // Image file input ref
    const imageFileRef = useRef(null);

    // Race guard: ignore stale fetch-on-select responses
    const selectRequestRef = useRef(0);

    /* ── Fetch list ─────────────────────────────── */

    async function fetchList() {
        setListLoading(true);
        try {
            const params = { page, limit };
            if (searchQ.trim()) params.q = searchQ.trim();
            const res = await listAdminCardsShowcaseItems(params);
            setItems(res.data?.items || []);
            setItemsTotal(res.data?.total || 0);
        } catch (err) {
            showFlash("error", mapShowcaseApiError(err));
        } finally {
            setListLoading(false);
        }
    }

    useEffect(() => {
        fetchList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    /* ── Search submit ──────────────────────────── */

    function handleSearch(e) {
        e.preventDefault();
        setPage(1);
        fetchList();
    }

    /* ── Select / deselect ──────────────────────── */

    function populateForm(item) {
        setFInternalName(safeString(item.internalName));
        setFTitle(safeString(item.title));
        setFDescription(safeString(item.description));
        setFImageAlt(safeString(item.imageAlt));
        setFCtaUrl(safeString(item.ctaUrl));
        setFCtaLabel(safeString(item.ctaLabel));
        setFSortOrder(String(item.sortOrder ?? 0));
        setFImageUrl(item.imageUrl || null);
        setFIsActive(Boolean(item.isActive));
        setFCreatedAt(item.createdAt || null);
        setFUpdatedAt(item.updatedAt || null);
    }

    function resetForm() {
        setSelectedId(null);
        setFInternalName("");
        setFTitle("");
        setFDescription("");
        setFImageAlt("");
        setFCtaUrl("");
        setFCtaLabel("");
        setFSortOrder("0");
        setFImageUrl(null);
        setFIsActive(false);
        setFCreatedAt(null);
        setFUpdatedAt(null);
        if (imageFileRef.current) imageFileRef.current.value = "";
    }

    function handleSelectItem(item) {
        const requestId = ++selectRequestRef.current;
        setSelectedId(item.id);
        setSelectedBusy(true);

        getAdminCardsShowcaseItemById(item.id)
            .then((res) => {
                if (selectRequestRef.current !== requestId) return;
                populateForm(res.data);
            })
            .catch((err) => {
                if (selectRequestRef.current !== requestId) return;
                showFlash("error", mapShowcaseApiError(err));
            })
            .finally(() => {
                if (selectRequestRef.current !== requestId) return;
                setSelectedBusy(false);
            });
    }

    /* ── Create ─────────────────────────────────── */

    async function handleCreate() {
        if (!fInternalName.trim()) {
            showFlash("error", "שם פנימי הוא שדה חובה.");
            return;
        }
        setSelectedBusy(true);
        try {
            const body = {
                internalName: fInternalName.trim(),
                title: fTitle.trim(),
                description: fDescription.trim(),
                imageAlt: fImageAlt.trim(),
                ctaUrl: fCtaUrl.trim(),
                ctaLabel: fCtaLabel.trim(),
                sortOrder: Number(fSortOrder) || 0,
            };
            const res = await createAdminCardsShowcaseItem(body);
            const item = res.data;
            showFlash("success", "הפריט נוצר.");
            setSelectedId(item.id);
            populateForm(item);
            await fetchList();
        } catch (err) {
            showFlash("error", mapShowcaseApiError(err));
        } finally {
            setSelectedBusy(false);
        }
    }

    /* ── Update ─────────────────────────────────── */

    async function handleUpdate() {
        if (!selectedId) return;
        if (!fInternalName.trim()) {
            showFlash("error", "שם פנימי הוא שדה חובה.");
            return;
        }
        setSelectedBusy(true);
        try {
            const body = {
                internalName: fInternalName.trim(),
                title: fTitle.trim(),
                description: fDescription.trim(),
                imageAlt: fImageAlt.trim(),
                ctaUrl: fCtaUrl.trim(),
                ctaLabel: fCtaLabel.trim(),
                sortOrder: Number(fSortOrder) || 0,
            };
            const res = await updateAdminCardsShowcaseItem(selectedId, body);
            populateForm(res.data);
            showFlash("success", "הפריט עודכן.");
            await fetchList();
        } catch (err) {
            showFlash("error", mapShowcaseApiError(err));
        } finally {
            setSelectedBusy(false);
        }
    }

    /* ── Activate / Deactivate ──────────────────── */

    async function handleActivate() {
        if (!selectedId) return;
        setSelectedBusy(true);
        try {
            const res = await activateAdminCardsShowcaseItem(selectedId);
            populateForm(res.data);
            showFlash("success", "הפריט הופעל.");
            await fetchList();
        } catch (err) {
            showFlash("error", mapShowcaseApiError(err));
        } finally {
            setSelectedBusy(false);
        }
    }

    async function handleDeactivate() {
        if (!selectedId) return;
        setSelectedBusy(true);
        try {
            const res = await deactivateAdminCardsShowcaseItem(selectedId);
            populateForm(res.data);
            showFlash("success", "הפריט הושבת.");
            await fetchList();
        } catch (err) {
            showFlash("error", mapShowcaseApiError(err));
        } finally {
            setSelectedBusy(false);
        }
    }

    /* ── Delete ─────────────────────────────────── */

    async function handleDelete() {
        if (!selectedId) return;
        if (!window.confirm("למחוק את הפריט לצמיתות? פעולה זו בלתי הפיכה."))
            return;
        setSelectedBusy(true);
        try {
            await deleteAdminCardsShowcaseItem(selectedId);
            showFlash("success", "הפריט נמחק.");
            resetForm();
            await fetchList();
        } catch (err) {
            showFlash("error", mapShowcaseApiError(err));
        } finally {
            setSelectedBusy(false);
        }
    }

    /* ── Image upload ───────────────────────────── */

    async function handleImageUpload() {
        if (!selectedId) {
            showFlash("error", "יש לשמור את הפריט לפני העלאת תמונה.");
            return;
        }
        const file = imageFileRef.current?.files?.[0];
        if (!file) {
            showFlash("error", "יש לבחור קובץ תמונה.");
            return;
        }
        if (!fImageAlt.trim()) {
            showFlash("error", "טקסט חלופי (alt) הוא שדה חובה לפני העלאה.");
            return;
        }
        setSelectedBusy(true);
        try {
            const res = await uploadAdminCardsShowcaseImage(
                selectedId,
                file,
                fImageAlt.trim(),
            );
            setFImageUrl(res.data.imageUrl || null);
            showFlash("success", "התמונה הועלתה.");
            if (imageFileRef.current) imageFileRef.current.value = "";
            await fetchList();
        } catch (err) {
            showFlash("error", mapShowcaseApiError(err));
        } finally {
            setSelectedBusy(false);
        }
    }

    /* ── Remove image ───────────────────────────── */

    async function handleRemoveImage() {
        if (!selectedId || !fImageUrl) return;
        if (
            !window.confirm(
                "למחוק את התמונה מהפריט? ניתן יהיה להעלות תמונה חדשה לאחר מכן.",
            )
        )
            return;
        setSelectedBusy(true);
        try {
            const res = await removeAdminCardsShowcaseImage(selectedId);
            populateForm(res.data);
            showFlash("success", "התמונה נמחקה.");
            await fetchList();
        } catch (err) {
            const code = err?.response?.data?.code;
            if (code === "IMAGE_REMOVE_REQUIRES_DEACTIVATION") {
                showFlash("error", "יש להשבית את הפריט לפני מחיקת התמונה.");
            } else {
                showFlash("error", mapShowcaseApiError(err));
            }
        } finally {
            setSelectedBusy(false);
        }
    }

    /* ── Computed ────────────────────────────────── */

    const isEditing = Boolean(selectedId);

    /* ── Render ──────────────────────────────────── */

    return (
        <div className={styles.wrap}>
            {flash && (
                <FlashBanner
                    type={flash.type}
                    message={flash.text}
                    autoHideMs={3500}
                    onDismiss={() => setFlash(null)}
                />
            )}

            <p className={styles.notice}>
                שינויים בדוגמאות יופיעו בעמוד /cards/ רק לאחר פריסה מחדש של
                האתר.
            </p>

            <div className={styles.topRow}>
                <h2 className={styles.h2}>ניהול דוגמאות כרטיסים</h2>
                <Button
                    onClick={() => {
                        resetForm();
                    }}
                    disabled={selectedBusy}
                >
                    צור פריט חדש
                </Button>
            </div>

            <div className={styles.grid}>
                {/* ── Left panel: item list ──────────── */}
                <div className={styles.panel}>
                    <h3 className={styles.h3}>פריטים</h3>

                    <form className={styles.searchRow} onSubmit={handleSearch}>
                        <Input
                            placeholder="חיפוש לפי שם, כותרת או קישור..."
                            value={searchQ}
                            onChange={(e) => setSearchQ(e.target.value)}
                        />
                        <Button type="submit" disabled={listLoading}>
                            חפש
                        </Button>
                    </form>

                    {listLoading && <p className={styles.muted}>טוען…</p>}

                    {!listLoading && items.length === 0 && (
                        <p className={styles.muted}>
                            {searchQ.trim()
                                ? "לא נמצאו דוגמאות מתאימות"
                                : "אין פריטים."}
                        </p>
                    )}

                    <ul className={styles.itemList}>
                        {items.map((item) => (
                            <li
                                key={item.id}
                                className={`${styles.itemRow} ${
                                    selectedId === item.id
                                        ? styles.itemRowActive
                                        : ""
                                }`}
                            >
                                <button
                                    type="button"
                                    className={styles.itemBtn}
                                    onClick={() => handleSelectItem(item)}
                                    disabled={selectedBusy}
                                >
                                    {item.imageUrl && (
                                        <img
                                            className={styles.itemThumb}
                                            src={item.imageUrl}
                                            alt=""
                                        />
                                    )}
                                    <span className={styles.itemInfo}>
                                        <span className={styles.itemTitle}>
                                            {item.title ||
                                                item.internalName ||
                                                "(ללא שם)"}
                                        </span>
                                        {item.internalName && (
                                            <span
                                                className={styles.itemInternal}
                                            >
                                                {item.internalName}
                                            </span>
                                        )}
                                    </span>
                                    <span
                                        className={`${styles.badge} ${
                                            item.isActive
                                                ? styles.badgeActive
                                                : styles.badgeInactive
                                        }`}
                                    >
                                        {item.isActive ? "פעיל" : "לא פעיל"}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* ── Right panel: edit / create form ── */}
                <div className={styles.panel}>
                    <h3 className={styles.h3}>
                        {isEditing ? "עריכת פריט" : "פריט חדש"}
                    </h3>

                    {isEditing && (
                        <p className={styles.muted}>
                            {fIsActive ? "סטטוס: פעיל" : "סטטוס: לא פעיל"}
                            {fCreatedAt
                                ? ` · נוצר: ${new Date(fCreatedAt).toLocaleString()}`
                                : ""}
                            {fUpdatedAt
                                ? ` · עודכן: ${new Date(fUpdatedAt).toLocaleString()}`
                                : ""}
                        </p>
                    )}

                    <div className={styles.form}>
                        {/* Internal name */}
                        <label className={styles.fieldLabel}>
                            שם פנימי (לשימוש מנהל בלבד)
                            <Input
                                value={fInternalName}
                                onChange={(e) =>
                                    setFInternalName(e.target.value)
                                }
                                placeholder="לדוגמה: כרטיס-עסקי-ולנטין"
                                disabled={selectedBusy}
                            />
                        </label>

                        {/* Title */}
                        <label className={styles.fieldLabel}>
                            כותרת / תחום
                            <Input
                                value={fTitle}
                                onChange={(e) => setFTitle(e.target.value)}
                                placeholder="לדוגמה: יזמות ועסקים"
                                disabled={selectedBusy}
                            />
                            <span className={styles.fieldHint}>
                                נדרש להפעלה
                            </span>
                        </label>

                        {/* Description */}
                        <label className={styles.fieldLabel}>
                            תיאור קצר
                            <textarea
                                className={styles.textarea}
                                value={fDescription}
                                onChange={(e) =>
                                    setFDescription(e.target.value)
                                }
                                rows={3}
                                placeholder="תיאור של 1-2 משפטים"
                                disabled={selectedBusy}
                            />
                            <span className={styles.fieldHint}>
                                נדרש להפעלה
                            </span>
                        </label>

                        {/* Image alt */}
                        <label className={styles.fieldLabel}>
                            טקסט חלופי לתמונה (alt)
                            <Input
                                value={fImageAlt}
                                onChange={(e) => setFImageAlt(e.target.value)}
                                placeholder="תיאור התמונה לנגישות"
                                disabled={selectedBusy}
                            />
                            <span className={styles.fieldHint}>
                                נדרש להפעלה ולהעלאת תמונה
                            </span>
                        </label>

                        {/* CTA URL */}
                        <label className={styles.fieldLabel}>
                            קישור לכרטיס
                            <Input
                                value={fCtaUrl}
                                onChange={(e) => setFCtaUrl(e.target.value)}
                                placeholder="/card/slug או /c/org-slug/slug"
                                disabled={selectedBusy}
                            />
                            <span className={styles.fieldHint}>
                                מותר רק /card/... או /c/.../... · נדרש להפעלה
                            </span>
                        </label>

                        {/* CTA label */}
                        <label className={styles.fieldLabel}>
                            טקסט כפתור
                            <Input
                                value={fCtaLabel}
                                onChange={(e) => setFCtaLabel(e.target.value)}
                                placeholder='ברירת מחדל: "צפו בכרטיס ←"'
                                disabled={selectedBusy}
                            />
                        </label>

                        {/* Sort order */}
                        <label className={styles.fieldLabel}>
                            סדר תצוגה (0–999)
                            <Input
                                type="number"
                                value={fSortOrder}
                                onChange={(e) => setFSortOrder(e.target.value)}
                                min="0"
                                max="999"
                                disabled={selectedBusy}
                            />
                        </label>

                        {/* Image section — always visible */}
                        <div className={styles.imageSection}>
                            <h4 className={styles.imageSectionHeading}>
                                תמונת הדוגמה
                            </h4>
                            {isEditing ? (
                                <div>
                                    {fImageUrl ? (
                                        <div className={styles.imgPreview}>
                                            <p className={styles.fieldHint}>
                                                תצוגה מקדימה
                                            </p>
                                            <img
                                                className={styles.previewImg}
                                                src={fImageUrl}
                                                alt={fImageAlt || "תמונת כרטיס"}
                                            />
                                            <Button
                                                variant="danger"
                                                onClick={handleRemoveImage}
                                                disabled={selectedBusy}
                                            >
                                                מחיקת תמונה
                                            </Button>
                                        </div>
                                    ) : (
                                        <p className={styles.uploadHint}>
                                            יש להעלות תמונה לפני הפעלת הפריט.
                                        </p>
                                    )}
                                    <div className={styles.uploadFields}>
                                        <label className={styles.fieldLabel}>
                                            בחירת קובץ תמונה
                                            <input
                                                type="file"
                                                accept="image/*"
                                                ref={imageFileRef}
                                                className={styles.fileInput}
                                                disabled={selectedBusy}
                                            />
                                        </label>
                                        <Button
                                            onClick={handleImageUpload}
                                            disabled={selectedBusy}
                                        >
                                            העלאת תמונה
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <p className={styles.uploadHint}>
                                    לאחר יצירת הפריט ניתן יהיה להעלות תמונה
                                    לדוגמה.
                                </p>
                            )}
                        </div>

                        {/* Save / Create */}
                        <div className={styles.actionRow}>
                            {isEditing ? (
                                <Button
                                    onClick={handleUpdate}
                                    disabled={selectedBusy}
                                >
                                    שמור שינויים
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleCreate}
                                    disabled={selectedBusy}
                                >
                                    צור פריט
                                </Button>
                            )}
                        </div>

                        {/* Activate / Deactivate */}
                        {isEditing && (
                            <div className={styles.actionRow}>
                                <p className={styles.activationHint}>
                                    להפעלה נדרשים תמונה, alt, כותרת, תיאור
                                    וקישור תקין.
                                </p>
                                {fIsActive ? (
                                    <Button
                                        variant="secondary"
                                        onClick={handleDeactivate}
                                        disabled={selectedBusy}
                                    >
                                        השבת פריט
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleActivate}
                                        disabled={selectedBusy}
                                    >
                                        הפעל פריט
                                    </Button>
                                )}
                            </div>
                        )}

                        {/* Delete */}
                        {isEditing && (
                            <div className={styles.actionRow}>
                                <Button
                                    variant="danger"
                                    onClick={handleDelete}
                                    disabled={selectedBusy}
                                >
                                    מחק פריט לצמיתות
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
