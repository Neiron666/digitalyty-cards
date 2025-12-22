import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Editor from "../components/editor/Editor";
import TrialBanner from "../components/editor/TrialBanner";
import { createCard, deleteCard, updateCard } from "../services/cards.service";
import api, { getAnonymousId } from "../services/api";
import { useAuth } from "../context/AuthContext";
import styles from "./EditCard.module.css";

const AUTOSAVE_DEBOUNCE_MS = 600;

function EditCard() {
    const navigate = useNavigate();
    const { section, tab } = useParams();
    const { token } = useAuth();

    useEffect(() => {
        // Legacy section routes are redirected into the card editor tabs.
        if (section === "galleries") {
            navigate("/edit/card/gallery", { replace: true });
            return;
        }
        if (section === "seo") {
            navigate("/edit/card/seo", { replace: true });
            return;
        }
        if (section === "leads") {
            navigate("/edit/card/business", { replace: true });
            return;
        }

        const validSections = new Set(["card"]);
        const validCardTabs = new Set([
            "templates",
            "business",
            "contact",
            "content",
            "design",
            "gallery",
            "reviews",
            "settings",
            "seo",
        ]);

        if (!section || !validSections.has(section)) {
            navigate("/edit/card/business", { replace: true });
            return;
        }

        if (section === "card") {
            if (!tab || !validCardTabs.has(tab)) {
                navigate("/edit/card/business", { replace: true });
                return;
            }
        } else {
            if (tab) {
                navigate(`/edit/${section}`, { replace: true });
                return;
            }
        }
    }, [section, tab, navigate]);

    const emptyCard = {
        status: "draft",
        plan: "free",
        slug: "",
        // Keep trial fields in state shape (server may fill them; anonymous trial may expire).
        trialStartedAt: null,
        trialEndsAt: null,
        business: {},
        contact: {},
        content: {},
        gallery: [],
        reviews: [],
        design: {
            templateId: null,
            backgroundImage: null,
            backgroundOverlay: 40,
            avatarImage: null,
            accentColor: "#d4af37",
            primaryColor: "#0b5cff",
            backgroundColor: "#ffffff",
            buttonTextColor: "#ffffff",
            font: "Heebo, sans-serif",
        },
        flags: {
            isTemplateSeeded: false,
            seededMap: {},
        },
    };

    const [card, setCard] = useState(emptyCard);
    const [trialLocked, setTrialLocked] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    // NEW: keep latest card for async autosave callbacks
    const cardRef = useRef(card);
    useEffect(() => {
        cardRef.current = card;
    }, [card]);

    const nowMs = Date.now();
    const trialEndsMs = card?.trialEndsAt
        ? new Date(card.trialEndsAt).getTime()
        : null;
    const isTrialExpired = Boolean(trialEndsMs && trialEndsMs < nowMs);

    const isPaid = Boolean(
        card?.billing?.status === "active" &&
            (!card?.billing?.paidUntil ||
                new Date(card.billing.paidUntil).getTime() > nowMs)
    );
    const editingDisabled = trialLocked || isTrialExpired;

    const showTrialBanner =
        card &&
        !isPaid &&
        (card.trialStartedAt || card.trialEndsAt || editingDisabled);

    const initCard = useCallback(async (isMounted = () => true) => {
        try {
            const res = await api.get("/cards/mine");
            if (!isMounted()) return;

            const mine = res?.data;

            // If no card (or malformed), create a persisted draft card server-side.
            if (!mine || !mine._id) {
                const created = await api.post("/cards", {});
                if (!isMounted()) return;
                setCard(created.data);
                return;
            }

            setCard(mine);
        } catch (err) {
            // IMPORTANT: log here (err exists), not above
            console.error(
                "initCard error",
                err?.response?.status,
                err?.response?.data || err
            );

            // Do not redirect to /login here; anonymous flow must stay on /edit
        }
    }, []);

    useEffect(() => {
        let isMounted = true;
        initCard(() => isMounted);

        return () => {
            isMounted = false;
        };
    }, [initCard, reloadKey]);

    // keep saveTimerRef + isSavingRef (used by autosave)
    const saveTimerRef = useRef(null);
    const isSavingRef = useRef(false);

    // NEW: accumulate pending section patches to avoid double-save / stale closures
    const pendingPatchRef = useRef({});

    async function handleSave() {
        if (editingDisabled) return;

        try {
            let saved;

            if (card._id) {
                saved = await updateCard(card._id, card);
            } else {
                saved = await createCard(card);
            }

            setCard(saved.data);
            alert("כרטיס נשמר בהצלחה");
        } catch (err) {
            const status = err?.response?.status;
            const code = err?.response?.data?.code;
            if (status === 410 && code === "TRIAL_DELETED") {
                alert("תקופת הניסיון הסתיימה והכרטיס נמחק. נוצר כרטיס חדש.");
                setTrialLocked(false);
                setCard(emptyCard);
                initializedRef.current = false;
                lastSavedRef.current = "";

                // cleanup (optional but correct)
                pendingPatchRef.current = {};
                if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

                setReloadKey((k) => k + 1);
                return;
            }

            if (
                err?.response?.status === 403 &&
                err?.response?.data?.code === "TRIAL_EXPIRED"
            ) {
                setTrialLocked(true);
                return;
            }
            if (err?.response?.status === 401) {
                window.location.href = "/login";
                return;
            }
            alert(err.response?.data?.message || "שגיאה בשמירה");
        }
    }

    async function handleDelete() {
        if (!card?._id) return;

        const confirmed = window.confirm(
            "האם אתה בטוח שברצונך למחוק כרטיס זה?"
        );
        if (!confirmed) return;

        try {
            await deleteCard(card._id);
            // Reset state and re-init. Do not redirect to login (anonymous delete).
            setTrialLocked(false);
            setCard(emptyCard);
            initializedRef.current = false;
            lastSavedRef.current = "";
            pendingPatchRef.current = {};
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
            setReloadKey((k) => k + 1);
        } catch (err) {
            const status = err?.response?.status;

            if (status === 403) {
                alert("אין הרשאה למחוק כרטיס זה");
                return;
            }

            if (status === 404) {
                // Treat as already deleted.
                setTrialLocked(false);
                setCard(emptyCard);
                initializedRef.current = false;
                lastSavedRef.current = "";
                pendingPatchRef.current = {};
                if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
                setReloadKey((k) => k + 1);
                return;
            }

            if (status === 401) {
                // Only redirect if there is truly no session context.
                const token =
                    typeof window !== "undefined"
                        ? window.localStorage?.getItem("token")
                        : null;
                const anon = getAnonymousId();
                if (!token && !anon) {
                    window.location.href = "/login";
                    return;
                }
                // If we do have anon/jwt, 401 is unexpected after backend fix.
            }

            alert(err.response?.data?.message || "שגיאה במחיקה");
        }
    }

    // Step 1: immutable nested updater (core) (kept for dot-path fallback)
    function setIn(obj, path, value) {
        const keys = Array.isArray(path) ? path : String(path).split(".");
        if (keys.length === 0) return obj;

        // shallow clone root
        const next = Array.isArray(obj) ? obj.slice() : { ...(obj || {}) };

        let currNext = next;
        let currPrev = obj || {};

        for (let i = 0; i < keys.length - 1; i += 1) {
            const k = keys[i];
            const prevChild = currPrev?.[k];

            const child = Array.isArray(prevChild)
                ? prevChild.slice()
                : prevChild && typeof prevChild === "object"
                ? { ...prevChild }
                : {};

            currNext[k] = child;

            currNext = child;
            currPrev = prevChild || {};
        }

        currNext[keys[keys.length - 1]] = value;
        return next;
    }

    function mergeSection(prev, section, patch) {
        return {
            ...prev,
            [section]: {
                ...(prev?.[section] || {}),
                ...(patch || {}),
            },
        };
    }

    function buildNestedPatch(keys, value) {
        // keys excludes the top section, e.g. ["name"] or ["social", "instagram"]
        if (!keys.length) return value;
        const root = {};
        let curr = root;
        for (let i = 0; i < keys.length - 1; i += 1) {
            curr[keys[i]] = {};
            curr = curr[keys[i]];
        }
        curr[keys[keys.length - 1]] = value;
        return root;
    }

    const flushPendingAutosave = useCallback(async () => {
        // avoid saving when trial locked/expired
        if (trialLocked) return;

        const cardId = cardRef.current?._id;
        if (!cardId) {
            // ensure editor has a persisted card
            await initCard();
            return;
        }

        const patchObj = pendingPatchRef.current;
        if (!patchObj || Object.keys(patchObj).length === 0) return;

        // clear now; if new edits come during request they'll re-populate
        pendingPatchRef.current = {};

        if (isSavingRef.current) {
            // if a save is in-flight, re-queue and bail; completion will trigger another flush
            pendingPatchRef.current = {
                ...patchObj,
                ...pendingPatchRef.current,
            };
            return;
        }

        isSavingRef.current = true;
        try {
            const saved = await api.patch(`/cards/${cardId}`, patchObj);
            setCard(saved.data);
        } catch (err) {
            const status = err?.response?.status;
            const code = err?.response?.data?.code;

            if (status === 410 && code === "TRIAL_DELETED") {
                alert("תקופת הניסיון הסתיימה והכרטיס נמחק. נוצר כרטיס חדש.");
                setTrialLocked(false);
                setCard(emptyCard);

                pendingPatchRef.current = {};
                if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

                setReloadKey((k) => k + 1);
                return;
            }

            if (status === 403 && code === "TRIAL_EXPIRED") {
                setTrialLocked(true); // disables edits + shows banner (existing logic)
                return;
            }

            // keep silent for anonymous flow; no /login redirect here
            console.error("autosave error", status, err?.response?.data || err);

            // re-queue the patch so it can retry after next edit
            pendingPatchRef.current = {
                ...patchObj,
                ...pendingPatchRef.current,
            };
        } finally {
            isSavingRef.current = false;

            // if edits accumulated during save, flush them quickly
            if (
                pendingPatchRef.current &&
                Object.keys(pendingPatchRef.current).length
            ) {
                setTimeout(() => {
                    flushPendingAutosave();
                }, 0);
            }
        }
    }, [emptyCard, initCard, trialLocked]);

    // Optimistic UI + debounced section PATCH autosave
    const onFieldChange = useCallback(
        (sectionOrPath, patchOrValue) => {
            if (editingDisabled) return;

            const key = String(sectionOrPath || "");
            if (!key) return;

            // preferred: onFieldChange("business", { name: "..." })
            const isSectionMerge =
                !key.includes(".") &&
                patchOrValue &&
                typeof patchOrValue === "object" &&
                !Array.isArray(patchOrValue);

            if (isSectionMerge) {
                setCard((prev) =>
                    prev ? mergeSection(prev, key, patchOrValue) : prev
                );

                pendingPatchRef.current = {
                    ...(pendingPatchRef.current || {}),
                    [key]: {
                        ...(pendingPatchRef.current?.[key] || {}),
                        ...(patchOrValue || {}),
                    },
                };
            } else {
                // fallback: onFieldChange("business.name", "ACME")
                setCard((prev) =>
                    prev ? setIn(prev, key, patchOrValue) : prev
                );

                const parts = key.split(".");
                const top = parts[0];
                const rest = parts.slice(1);
                if (!top || rest.length === 0) return;

                const nested = buildNestedPatch(rest, patchOrValue);

                pendingPatchRef.current = {
                    ...(pendingPatchRef.current || {}),
                    [top]: {
                        ...(pendingPatchRef.current?.[top] || {}),
                        ...(nested || {}),
                    },
                };
            }

            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
            saveTimerRef.current = setTimeout(() => {
                flushPendingAutosave();
            }, AUTOSAVE_DEBOUNCE_MS);
        },
        [editingDisabled, flushPendingAutosave]
    );

    const handlePublish = useCallback(async () => {
        if (!card?._id) return;

        try {
            const res = await api.patch(`/cards/${card._id}`, {
                status: "published",
            });
            setCard(res.data);

            if (res?.data?.status !== "published") {
                alert("כדי לפרסם צריך למלא שם עסק ולבחור תבנית");
            }
        } catch (err) {
            const status = err?.response?.status;
            const code = err?.response?.data?.code;
            const message = err?.response?.data?.message;

            if (status === 403 && code === "PUBLISH_REQUIRES_AUTH") {
                alert("כדי לפרסם צריך להירשם/להתחבר");
                return;
            }

            alert(message || "שגיאה בפרסום");
        }
    }, [card?._id]);

    const handleUnpublish = useCallback(async () => {
        if (!card?._id) return;

        try {
            const res = await api.patch(`/cards/${card._id}`, {
                status: "draft",
            });
            setCard(res.data);
        } catch (err) {
            const message = err?.response?.data?.message;
            alert(message || "שגיאה");
        }
    }, [card?._id]);

    return (
        <div
            className={styles.editCard}
            style={{ display: "flex", gap: 16, alignItems: "flex-start" }}
        >
            <main style={{ flex: "1 1 auto", minWidth: 0 }}>
                {showTrialBanner && (
                    <TrialBanner
                        trialStartedAt={card?.trialStartedAt}
                        trialEndsAt={card?.trialEndsAt}
                        isExpired={isTrialExpired}
                        onRegister={() => {
                            window.location.href = "/pricing";
                        }}
                    />
                )}
                {card?.slug ? (
                    <div
                        style={{
                            marginBottom: 12,
                            padding: 12,
                            borderRadius: 12,
                            background: "rgba(0,0,0,0.04)",
                        }}
                    >
                        <div
                            style={{ fontWeight: 700, marginBottom: 6 }}
                            dir="rtl"
                        >
                            {token && card?.status === "published" && card?.user
                                ? "קישור ציבורי"
                                : "קישור עתידי"}
                        </div>
                        {token && card?.status === "published" && card?.user ? (
                            <a
                                href={`/card/${card.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ wordBreak: "break-word" }}
                            >
                                {window.location.origin}/card/{card.slug}
                            </a>
                        ) : (
                            <div style={{ wordBreak: "break-word" }}>
                                {window.location.origin}/card/{card.slug}
                            </div>
                        )}
                    </div>
                ) : null}

                {section === "card" ? (
                    <Editor
                        card={card}
                        onFieldChange={onFieldChange}
                        editingDisabled={editingDisabled}
                        onDeleteCard={handleDelete}
                        onPublish={handlePublish}
                        onUnpublish={handleUnpublish}
                        // onUpgrade / onSelectTemplate intentionally omitted for now
                        // previewHeader / previewFooter intentionally omitted for now
                    />
                ) : (
                    <div style={{ padding: 16 }}>Coming soon</div>
                )}
            </main>
        </div>
    );
}

export default EditCard;
