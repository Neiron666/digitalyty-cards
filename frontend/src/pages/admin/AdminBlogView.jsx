import { useEffect, useRef, useState } from "react";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import FlashBanner from "../../components/ui/FlashBanner/FlashBanner";
import {
    listAdminBlogPosts,
    createAdminBlogPost,
    updateAdminBlogPost,
    publishAdminBlogPost,
    unpublishAdminBlogPost,
    deleteAdminBlogPost,
    uploadAdminBlogHeroImage,
} from "../../services/admin.service";
import styles from "./AdminBlogView.module.css";

/* ── Constants ────────────────────────────────────────────────── */

const MAX_SECTIONS = 20;

const EMPTY_SECTION = () => ({ heading: "", body: "" });

/* ── Helpers ──────────────────────────────────────────────────── */

function safeString(value) {
    if (value === null || value === undefined) return "";
    return String(value);
}

function slugFromTitle(title) {
    return String(title || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\u0590-\u05FF]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 100);
}

function mapBlogApiError(err) {
    const status = err?.response?.status;
    const apiMessage =
        typeof err?.response?.data?.message === "string"
            ? err.response.data.message.trim()
            : "";

    if (status === 401) return "נדרשת התחברות.";
    if (status === 403) return "אין הרשאות.";
    if (status === 404) return "הפוסט לא נמצא.";
    if (status === 409) return apiMessage || "סלאג כבר תפוס.";
    if (status === 422) return apiMessage || "שגיאת ולידציה.";

    return "אירעה שגיאה. נסה שוב.";
}

function formatDate(iso) {
    if (!iso) return "—";
    try {
        return new Date(iso).toLocaleString("he-IL", {
            dateStyle: "short",
            timeStyle: "short",
        });
    } catch {
        return String(iso);
    }
}

/* ── Component ────────────────────────────────────────────────── */

export default function AdminBlogView() {
    /* ── Flash ──────────────────────────────────── */
    const [flash, setFlash] = useState(null);
    const flashTimerRef = useRef(null);

    function showFlash(type, text) {
        if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
        setFlash({ type, text });
        flashTimerRef.current = setTimeout(() => setFlash(null), 3500);
    }

    /* ── List state ─────────────────────────────── */
    const [posts, setPosts] = useState([]);
    const [postsTotal, setPostsTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit] = useState(25);
    const [searchQ, setSearchQ] = useState("");
    const [listLoading, setListLoading] = useState(false);

    /* ── Selected post state ────────────────────── */
    const [selectedId, setSelectedId] = useState(null);
    const [selectedBusy, setSelectedBusy] = useState(false);

    // Form fields
    const [fTitle, setFTitle] = useState("");
    const [fSlug, setFSlug] = useState("");
    const [fSlugTouched, setFSlugTouched] = useState(false);
    const [fExcerpt, setFExcerpt] = useState("");
    const [fSections, setFSections] = useState([]);
    const [fSeoTitle, setFSeoTitle] = useState("");
    const [fSeoDesc, setFSeoDesc] = useState("");
    const [fShowAuthor, setFShowAuthor] = useState(false);
    const [fHeroUrl, setFHeroUrl] = useState(null);
    const [fHeroAlt, setFHeroAlt] = useState("");
    const [fStatus, setFStatus] = useState("draft");
    const [fPublishedAt, setFPublishedAt] = useState(null);
    const [fCreatedAt, setFCreatedAt] = useState(null);
    const [fUpdatedAt, setFUpdatedAt] = useState(null);

    // Hero file
    const heroFileRef = useRef(null);

    /* ── Fetch list ─────────────────────────────── */

    async function fetchList() {
        setListLoading(true);
        try {
            const params = { page, limit };
            if (searchQ.trim()) params.q = searchQ.trim();
            const res = await listAdminBlogPosts(params);
            const d = res.data;
            setPosts(d.items || []);
            setPostsTotal(d.total || 0);
        } catch (err) {
            showFlash("error", mapBlogApiError(err));
        } finally {
            setListLoading(false);
        }
    }

    useEffect(() => {
        fetchList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    /* ── Select / deselect ──────────────────────── */

    function populateForm(post) {
        setFTitle(safeString(post.title));
        setFSlug(safeString(post.slug));
        setFSlugTouched(true); // existing post — slug is manual
        setFExcerpt(safeString(post.excerpt));
        setFSections(
            (post.sections || []).map((s) => ({
                heading: safeString(s.heading),
                body: safeString(s.body),
            })),
        );
        setFSeoTitle(safeString(post.seo?.title));
        setFSeoDesc(safeString(post.seo?.description));
        setFShowAuthor(Boolean(post.authorName));
        setFHeroUrl(post.heroImageUrl || null);
        setFHeroAlt(safeString(post.heroImageAlt));
        setFStatus(post.status || "draft");
        setFPublishedAt(post.publishedAt || null);
        setFCreatedAt(post.createdAt || null);
        setFUpdatedAt(post.updatedAt || null);
    }

    function resetForm() {
        setSelectedId(null);
        setFTitle("");
        setFSlug("");
        setFSlugTouched(false);
        setFExcerpt("");
        setFSections([]);
        setFSeoTitle("");
        setFSeoDesc("");
        setFShowAuthor(false);
        setFHeroUrl(null);
        setFHeroAlt("");
        setFStatus("draft");
        setFPublishedAt(null);
        setFCreatedAt(null);
        setFUpdatedAt(null);
        if (heroFileRef.current) heroFileRef.current.value = "";
    }

    function handleSelectPost(post) {
        setSelectedId(post.id);
        populateForm(post);
    }

    /* ── Title → slug auto-gen ──────────────────── */

    function handleTitleChange(e) {
        const v = e.target.value;
        setFTitle(v);
        if (!fSlugTouched) {
            setFSlug(slugFromTitle(v));
        }
    }

    /* ── Sections ───────────────────────────────── */

    function handleSectionField(idx, field, value) {
        setFSections((prev) => {
            const next = [...prev];
            next[idx] = { ...next[idx], [field]: value };
            return next;
        });
    }

    function addSection() {
        if (fSections.length >= MAX_SECTIONS) {
            showFlash("error", `לא ניתן להוסיף יותר מ-${MAX_SECTIONS} קטעים.`);
            return;
        }
        setFSections((prev) => [...prev, EMPTY_SECTION()]);
    }

    function removeSection(idx) {
        setFSections((prev) => prev.filter((_, i) => i !== idx));
    }

    function moveSection(idx, dir) {
        setFSections((prev) => {
            const next = [...prev];
            const target = idx + dir;
            if (target < 0 || target >= next.length) return prev;
            [next[idx], next[target]] = [next[target], next[idx]];
            return next;
        });
    }

    /* ── Create ─────────────────────────────────── */

    async function handleCreate() {
        if (!fTitle.trim() || !fExcerpt.trim()) {
            showFlash("error", "כותרת ותקציר הם שדות חובה.");
            return;
        }
        setSelectedBusy(true);
        try {
            const body = {
                title: fTitle.trim(),
                slug: fSlug.trim(),
                excerpt: fExcerpt.trim(),
                sections: fSections,
                seo: { title: fSeoTitle.trim(), description: fSeoDesc.trim() },
                authorName: fShowAuthor ? "ולנטין" : "",
            };
            const res = await createAdminBlogPost(body);
            const post = res.data;
            showFlash("success", "הפוסט נוצר.");
            setSelectedId(post.id);
            populateForm(post);
            await fetchList();
        } catch (err) {
            showFlash("error", mapBlogApiError(err));
        } finally {
            setSelectedBusy(false);
        }
    }

    /* ── Update ─────────────────────────────────── */

    async function handleUpdate() {
        if (!selectedId) return;
        if (!fTitle.trim() || !fExcerpt.trim()) {
            showFlash("error", "כותרת ותקציר הם שדות חובה.");
            return;
        }
        setSelectedBusy(true);
        try {
            const body = {
                title: fTitle.trim(),
                slug: fSlug.trim(),
                excerpt: fExcerpt.trim(),
                sections: fSections,
                seo: { title: fSeoTitle.trim(), description: fSeoDesc.trim() },
                authorName: fShowAuthor ? "ולנטין" : "",
            };
            const res = await updateAdminBlogPost(selectedId, body);
            populateForm(res.data);
            showFlash("success", "הפוסט עודכן.");
            await fetchList();
        } catch (err) {
            showFlash("error", mapBlogApiError(err));
        } finally {
            setSelectedBusy(false);
        }
    }

    /* ── Publish / Unpublish ────────────────────── */

    async function handlePublish() {
        if (!selectedId) return;
        setSelectedBusy(true);
        try {
            const res = await publishAdminBlogPost(selectedId);
            populateForm(res.data);
            showFlash("success", "הפוסט פורסם.");
            await fetchList();
        } catch (err) {
            showFlash("error", mapBlogApiError(err));
        } finally {
            setSelectedBusy(false);
        }
    }

    async function handleUnpublish() {
        if (!selectedId) return;
        setSelectedBusy(true);
        try {
            const res = await unpublishAdminBlogPost(selectedId);
            populateForm(res.data);
            showFlash("success", "הפוסט הוסר מפרסום.");
            await fetchList();
        } catch (err) {
            showFlash("error", mapBlogApiError(err));
        } finally {
            setSelectedBusy(false);
        }
    }

    /* ── Delete ─────────────────────────────────── */

    async function handleDelete() {
        if (!selectedId) return;
        if (!window.confirm("למחוק את הפוסט? פעולה זו בלתי הפיכה.")) return;
        setSelectedBusy(true);
        try {
            await deleteAdminBlogPost(selectedId);
            showFlash("success", "הפוסט נמחק.");
            resetForm();
            await fetchList();
        } catch (err) {
            showFlash("error", mapBlogApiError(err));
        } finally {
            setSelectedBusy(false);
        }
    }

    /* ── Hero upload ────────────────────────────── */

    async function handleHeroUpload() {
        if (!selectedId) {
            showFlash("error", "יש לשמור את הפוסט לפני העלאת תמונה.");
            return;
        }
        const file = heroFileRef.current?.files?.[0];
        if (!file) {
            showFlash("error", "יש לבחור קובץ תמונה.");
            return;
        }
        if (!fHeroAlt.trim()) {
            showFlash("error", "טקסט חלופי (alt) הוא שדה חובה.");
            return;
        }
        setSelectedBusy(true);
        try {
            const res = await uploadAdminBlogHeroImage(
                selectedId,
                file,
                fHeroAlt.trim(),
            );
            setFHeroUrl(res.data.heroImageUrl || null);
            showFlash("success", "התמונה הועלתה.");
            if (heroFileRef.current) heroFileRef.current.value = "";
        } catch (err) {
            showFlash("error", mapBlogApiError(err));
        } finally {
            setSelectedBusy(false);
        }
    }

    /* ── Search submit ──────────────────────────── */

    function handleSearch(e) {
        e.preventDefault();
        setPage(1);
        fetchList();
    }

    /* ── Computed ────────────────────────────────── */

    const totalPages = Math.max(1, Math.ceil(postsTotal / limit));
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

            <div className={styles.topRow}>
                <h2 className={styles.h2}>ניהול בלוג</h2>
                <Button
                    onClick={() => {
                        resetForm();
                    }}
                    disabled={selectedBusy}
                >
                    צור פוסט חדש
                </Button>
            </div>

            <div className={styles.grid}>
                {/* ── Left panel: post list ──────────── */}
                <div className={styles.panel}>
                    <h3 className={styles.h3}>פוסטים</h3>

                    <form className={styles.searchRow} onSubmit={handleSearch}>
                        <Input
                            placeholder="חיפוש לפי כותרת / סלאג"
                            value={searchQ}
                            onChange={(e) => setSearchQ(e.target.value)}
                        />
                        <Button type="submit" disabled={listLoading}>
                            חפש
                        </Button>
                    </form>

                    {listLoading && <p className={styles.muted}>טוען…</p>}

                    {!listLoading && posts.length === 0 && (
                        <p className={styles.muted}>אין פוסטים.</p>
                    )}

                    <ul className={styles.postList}>
                        {posts.map((p) => (
                            <li
                                key={p.id}
                                className={`${styles.postItem} ${
                                    selectedId === p.id
                                        ? styles.postItemActive
                                        : ""
                                }`}
                            >
                                <button
                                    type="button"
                                    className={styles.postBtn}
                                    onClick={() => handleSelectPost(p)}
                                    disabled={selectedBusy}
                                >
                                    {p.heroImageUrl && (
                                        <img
                                            className={styles.postThumb}
                                            src={p.heroImageUrl}
                                            alt=""
                                        />
                                    )}
                                    <span className={styles.postInfo}>
                                        <span className={styles.postTitle}>
                                            {p.title}
                                        </span>
                                        {p.excerpt && (
                                            <span
                                                className={styles.postExcerpt}
                                            >
                                                {p.excerpt}
                                            </span>
                                        )}
                                        {p.publishedAt && (
                                            <span className={styles.postDate}>
                                                {formatDate(p.publishedAt)}
                                            </span>
                                        )}
                                    </span>
                                    <span
                                        className={`${styles.badge} ${
                                            p.status === "published"
                                                ? styles.badgePublished
                                                : styles.badgeDraft
                                        }`}
                                    >
                                        {p.status === "published"
                                            ? "פורסם"
                                            : "טיוטה"}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>

                    {/* Pager */}
                    {postsTotal > limit && (
                        <div className={styles.pager}>
                            <Button
                                variant="secondary"
                                onClick={() =>
                                    setPage((p) => Math.max(1, p - 1))
                                }
                                disabled={page <= 1 || listLoading}
                            >
                                הקודם
                            </Button>
                            <span className={styles.pagerMeta}>
                                {page} / {totalPages}
                            </span>
                            <Button
                                variant="secondary"
                                onClick={() =>
                                    setPage((p) => Math.min(totalPages, p + 1))
                                }
                                disabled={page >= totalPages || listLoading}
                            >
                                הבא
                            </Button>
                        </div>
                    )}
                </div>

                {/* ── Right panel: editor ────────────── */}
                <div className={styles.panel}>
                    <h3 className={styles.h3}>
                        {isEditing ? "עריכת פוסט" : "פוסט חדש"}
                    </h3>

                    {/* Content fields */}
                    <div className={styles.form}>
                        <Input
                            label="כותרת"
                            required
                            value={fTitle}
                            onChange={handleTitleChange}
                            placeholder="כותרת הפוסט"
                            disabled={selectedBusy}
                        />
                        <Input
                            label="סלאג"
                            value={fSlug}
                            onChange={(e) => {
                                setFSlugTouched(true);
                                setFSlug(e.target.value);
                            }}
                            placeholder="ייווצר אוטומטית מהכותרת"
                            meta={
                                isEditing
                                    ? "שינוי סלאג ישבור קישורים קיימים"
                                    : "ייווצר בצד השרת"
                            }
                            disabled={selectedBusy}
                        />
                        <label className={styles.fieldLabel}>
                            תקציר *
                            <textarea
                                className={styles.textarea}
                                rows={3}
                                value={fExcerpt}
                                onChange={(e) => setFExcerpt(e.target.value)}
                                placeholder="תקציר קצר (עד 500 תווים)"
                                required
                                disabled={selectedBusy}
                            />
                        </label>
                    </div>

                    {/* Hero image */}
                    <div className={styles.sectionBlock}>
                        <h4 className={styles.h4}>תמונה ראשית</h4>
                        {fHeroUrl && (
                            <div className={styles.heroPreview}>
                                <img
                                    className={styles.heroImg}
                                    src={fHeroUrl}
                                    alt={fHeroAlt || "hero"}
                                />
                            </div>
                        )}
                        <div className={styles.heroFields}>
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                ref={heroFileRef}
                                className={styles.fileInput}
                                disabled={selectedBusy}
                            />
                            <Input
                                label="טקסט חלופי (alt)"
                                required
                                value={fHeroAlt}
                                onChange={(e) => setFHeroAlt(e.target.value)}
                                placeholder="תיאור התמונה"
                                disabled={selectedBusy}
                            />
                            <Button
                                onClick={handleHeroUpload}
                                disabled={selectedBusy || !selectedId}
                                variant="secondary"
                            >
                                העלה תמונה
                            </Button>
                        </div>
                    </div>

                    {/* Sections builder */}
                    <div className={styles.sectionBlock}>
                        <h4 className={styles.h4}>
                            קטעי תוכן ({fSections.length}/{MAX_SECTIONS})
                        </h4>
                        {fSections.map((sec, idx) => (
                            <div key={idx} className={styles.sectionCard}>
                                <div className={styles.sectionCardHeader}>
                                    <span className={styles.sectionIdx}>
                                        #{idx + 1}
                                    </span>
                                    <div className={styles.sectionActions}>
                                        <button
                                            type="button"
                                            className={styles.iconBtn}
                                            onClick={() => moveSection(idx, -1)}
                                            disabled={idx === 0 || selectedBusy}
                                            aria-label="הזז למעלה"
                                        >
                                            ▲
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.iconBtn}
                                            onClick={() => moveSection(idx, 1)}
                                            disabled={
                                                idx === fSections.length - 1 ||
                                                selectedBusy
                                            }
                                            aria-label="הזז למטה"
                                        >
                                            ▼
                                        </button>
                                        <button
                                            type="button"
                                            className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                                            onClick={() => removeSection(idx)}
                                            disabled={selectedBusy}
                                            aria-label="מחק קטע"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                                <Input
                                    label="כותרת קטע"
                                    value={sec.heading}
                                    onChange={(e) =>
                                        handleSectionField(
                                            idx,
                                            "heading",
                                            e.target.value,
                                        )
                                    }
                                    disabled={selectedBusy}
                                />
                                <label className={styles.fieldLabel}>
                                    תוכן
                                    <textarea
                                        className={styles.textarea}
                                        rows={5}
                                        value={sec.body}
                                        onChange={(e) =>
                                            handleSectionField(
                                                idx,
                                                "body",
                                                e.target.value,
                                            )
                                        }
                                        disabled={selectedBusy}
                                    />
                                </label>
                            </div>
                        ))}
                        <Button
                            variant="secondary"
                            onClick={addSection}
                            disabled={
                                selectedBusy || fSections.length >= MAX_SECTIONS
                            }
                        >
                            הוסף קטע
                        </Button>
                    </div>

                    {/* SEO block */}
                    <div className={styles.sectionBlock}>
                        <h4 className={styles.h4}>SEO</h4>
                        <div className={styles.form}>
                            <Input
                                label="SEO כותרת"
                                value={fSeoTitle}
                                onChange={(e) => setFSeoTitle(e.target.value)}
                                placeholder="ברירת מחדל: כותרת הפוסט"
                                disabled={selectedBusy}
                            />
                            <Input
                                label="SEO תיאור"
                                value={fSeoDesc}
                                onChange={(e) => setFSeoDesc(e.target.value)}
                                placeholder="ברירת מחדל: התקציר"
                                disabled={selectedBusy}
                            />
                        </div>
                    </div>

                    {/* Author toggle */}
                    <div className={styles.sectionBlock}>
                        <h4 className={styles.h4}>מחבר</h4>
                        <label className={styles.toggleRow}>
                            <input
                                type="checkbox"
                                checked={fShowAuthor}
                                onChange={(e) =>
                                    setFShowAuthor(e.target.checked)
                                }
                                disabled={selectedBusy}
                            />
                            הצג כרטיס מחבר
                        </label>
                    </div>

                    {/* Timestamps */}
                    {isEditing && (
                        <div className={styles.timestampsRow}>
                            <span className={styles.tsItem}>
                                נוצר: {formatDate(fCreatedAt)}
                            </span>
                            <span className={styles.tsItem}>
                                עודכן: {formatDate(fUpdatedAt)}
                            </span>
                            {fPublishedAt && (
                                <span className={styles.tsItem}>
                                    פורסם: {formatDate(fPublishedAt)}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className={styles.actionRow}>
                        {isEditing ? (
                            <>
                                <Button
                                    onClick={handleUpdate}
                                    disabled={selectedBusy}
                                >
                                    שמור שינויים
                                </Button>
                                {fStatus === "draft" ? (
                                    <Button
                                        onClick={handlePublish}
                                        disabled={selectedBusy}
                                        variant="secondary"
                                    >
                                        פרסם
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleUnpublish}
                                        disabled={selectedBusy}
                                        variant="secondary"
                                    >
                                        בטל פרסום
                                    </Button>
                                )}
                                <Button
                                    onClick={handleDelete}
                                    disabled={selectedBusy}
                                    variant="danger"
                                >
                                    מחק
                                </Button>
                            </>
                        ) : (
                            <Button
                                onClick={handleCreate}
                                disabled={selectedBusy}
                            >
                                צור פוסט
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
