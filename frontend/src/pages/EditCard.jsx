import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useBlocker, useNavigate, useParams } from "react-router-dom";
import Editor from "../components/editor/Editor";
import ConfirmUnsavedChangesModal from "../components/editor/ConfirmUnsavedChangesModal";
import TrialBanner from "../components/editor/TrialBanner";
import { EDITOR_CARD_TABS } from "../components/editor/editorTabs";
import { deleteCard } from "../services/cards.service";
import api, { getAnonymousId } from "../services/api";
import { useAuth } from "../context/AuthContext";
import styles from "./EditCard.module.css";

const REFETCH_THROTTLE_MS = 15_000;

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
        const validCardTabs = new Set(EDITOR_CARD_TABS);

        if (!section || !validSections.has(section)) {
            navigate("/edit/card/templates", { replace: true });
            return;
        }

        if (section === "card") {
            if (!tab || !validCardTabs.has(tab)) {
                navigate("/edit/card/templates", { replace: true });
                return;
            }
        } else {
            if (tab) {
                navigate(`/edit/${section}`, { replace: true });
                return;
            }
        }
    }, [section, tab, navigate]);

    function normalizeReviewsForEditor(input) {
        if (!Array.isArray(input)) return [];
        return input
            .map((r) => {
                if (typeof r === "string") return r;
                if (r && typeof r === "object" && typeof r.text === "string")
                    return r.text;
                return "";
            })
            .map((s) => String(s || "").trim())
            .filter(Boolean);
    }

    function normalizeFaqForSave(input) {
        if (input === null) return null;
        if (!input || typeof input !== "object" || Array.isArray(input)) {
            return null;
        }

        const title =
            typeof input.title === "string" && input.title.trim()
                ? input.title.trim()
                : null;
        const lead =
            typeof input.lead === "string" && input.lead.trim()
                ? input.lead.trim()
                : null;

        const rawItems = Array.isArray(input.items) ? input.items : [];
        const items = rawItems
            .map((it) => {
                if (!it || typeof it !== "object" || Array.isArray(it)) {
                    return null;
                }
                const q = typeof it.q === "string" ? String(it.q).trim() : "";
                const a = typeof it.a === "string" ? String(it.a).trim() : "";
                if (!q || !a) return null;
                return { q, a };
            })
            .filter(Boolean)
            .slice(0, 10);

        if (!title && !lead && items.length === 0) return null;

        return {
            title,
            lead,
            ...(items.length ? { items } : {}),
        };
    }

    function normalizeCardForEditor(dto) {
        if (!dto || typeof dto !== "object") return dto;
        return {
            ...dto,
            // Phase 1: editor ReviewsPanel is still string[]; keep state compatible.
            reviews: normalizeReviewsForEditor(dto.reviews),
        };
    }

    const emptyCard = {
        status: "draft",
        slug: "",
        business: {},
        contact: {},
        content: {},
        gallery: [],
        reviews: [],
        design: {
            templateId: null,
        },
        flags: {
            isTemplateSeeded: false,
            seededMap: {},
        },
    };

    // Phase 2: draft-first editing.
    // `draftCard` is the SSoT for editor UI (panels + preview).
    const [draftCard, setDraftCard] = useState(emptyCard);

    const [dirtyPaths, setDirtyPaths] = useState(() => new Set());
    const [saveState, setSaveState] = useState("idle");
    const [saveErrorText, setSaveErrorText] = useState(null);
    const [isInitializing, setIsInitializing] = useState(true);
    const [reloadKey, setReloadKey] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    const [isUnsavedModalOpen, setIsUnsavedModalOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);
    const pendingBlockerRef = useRef(null);
    const [unsavedActionBusy, setUnsavedActionBusy] = useState(false);

    const isDeletingRef = useRef(isDeleting);
    useEffect(() => {
        isDeletingRef.current = isDeleting;
    }, [isDeleting]);

    const [deleteNotice, setDeleteNotice] = useState(null);
    const deleteNoticeTimerRef = useRef(null);

    const clearDeleteNoticeTimer = useCallback(() => {
        if (deleteNoticeTimerRef.current) {
            clearTimeout(deleteNoticeTimerRef.current);
            deleteNoticeTimerRef.current = null;
        }
    }, []);

    const showDeleteNotice = useCallback(
        (notice) => {
            clearDeleteNoticeTimer();
            setDeleteNotice(notice);
            deleteNoticeTimerRef.current = setTimeout(() => {
                setDeleteNotice(null);
                deleteNoticeTimerRef.current = null;
            }, 3000);
        },
        [clearDeleteNoticeTimer],
    );

    useEffect(() => {
        return () => {
            clearDeleteNoticeTimer();
        };
    }, [clearDeleteNoticeTimer]);

    const lastRefetchAtRef = useRef(0);

    // Keep latest draft snapshot for sync decisions (e.g., upload ops PATCH conditions).
    const draftCardRef = useRef(draftCard);
    useEffect(() => {
        draftCardRef.current = draftCard;
    }, [draftCard]);

    // Keep latest dirtyPaths snapshot for save-status timers.
    const dirtyPathsRef = useRef(dirtyPaths);
    useEffect(() => {
        dirtyPathsRef.current = dirtyPaths;
    }, [dirtyPaths]);

    const closeUnsavedModal = useCallback(() => {
        setIsUnsavedModalOpen(false);
        setPendingAction(null);
        setUnsavedActionBusy(false);
    }, []);

    const requestNavigate = useCallback(
        (to) => {
            const nextTo = String(to || "");
            if (!nextTo) return;

            const hasDirty =
                dirtyPathsRef.current && dirtyPathsRef.current.size > 0;
            if (!hasDirty) {
                navigate(nextTo);
                return;
            }

            pendingBlockerRef.current = null;
            setPendingAction({ kind: "tab", to: nextTo });
            setIsUnsavedModalOpen(true);
        },
        [navigate],
    );

    // Step 1A: Browser refresh/close guard.
    useEffect(() => {
        const onBeforeUnload = (event) => {
            if (isDeletingRef.current) return;
            const hasDirty =
                dirtyPathsRef.current && dirtyPathsRef.current.size > 0;
            if (!hasDirty) return;

            // Required for Chrome/Edge to show the native confirm.
            event.preventDefault();
            event.returnValue = "";
            return "";
        };

        window.addEventListener("beforeunload", onBeforeUnload);
        return () => {
            window.removeEventListener("beforeunload", onBeforeUnload);
        };
    }, []);

    // Step 1B: In-app navigation guard (React Router data router).
    // WHY: we only guard leaving the editor zone to avoid breaking internal editor UX
    // (tab switching and other /edit/* transitions).
    const blocker = useBlocker(({ currentLocation, nextLocation }) => {
        if (isDeletingRef.current) return false;
        const hasDirty =
            dirtyPathsRef.current && dirtyPathsRef.current.size > 0;
        if (!hasDirty) return false;

        const nextPath = nextLocation?.pathname || "";

        // Scope rule: block only when the next route is outside /edit/*.
        if (nextPath.startsWith("/edit")) return false;
        return true;
    });

    useEffect(() => {
        if (blocker?.state !== "blocked") return;

        // Replace native confirm with the editor's unsaved-changes modal.
        // IMPORTANT: store blocker in a ref (do not put blocker in state).
        pendingBlockerRef.current = blocker;
        setPendingAction({ kind: "leave" });
        setIsUnsavedModalOpen(true);
    }, [blocker]);

    const saveStateTimerRef = useRef(null);
    const clearSaveStateTimer = useCallback(() => {
        if (saveStateTimerRef.current) {
            clearTimeout(saveStateTimerRef.current);
            saveStateTimerRef.current = null;
        }
    }, []);

    useEffect(() => {
        return () => {
            clearSaveStateTimer();
        };
    }, [clearSaveStateTimer]);

    // Phase 3: after a successful save, show "saved" briefly then return to idle.
    useEffect(() => {
        if (saveState !== "saved") {
            clearSaveStateTimer();
            return;
        }

        clearSaveStateTimer();
        saveStateTimerRef.current = setTimeout(() => {
            setSaveState((prev) => {
                if (prev !== "saved") return prev;
                const hasDirty =
                    dirtyPathsRef.current && dirtyPathsRef.current.size > 0;
                return hasDirty ? "dirty" : "idle";
            });
        }, 2500);
    }, [saveState, clearSaveStateTimer]);

    const isPaid = Boolean(draftCard?.effectiveBilling?.isPaid);
    const isEntitled = Boolean(draftCard?.effectiveBilling?.isEntitled);
    const editingDisabled = draftCard?.entitlements?.canEdit === false;
    const isTrialExpired =
        draftCard?.entitlements?.lockedReason === "TRIAL_EXPIRED";
    const showTrialBanner =
        !isPaid &&
        !(!isEntitled && !isTrialExpired) &&
        (draftCard?.effectiveBilling?.source === "trial" ||
            Boolean(draftCard?.trialStartedAt || draftCard?.trialEndsAt) ||
            editingDisabled);

    const createCardInFlightRef = useRef(null);

    function isCreateInFlightError(err) {
        const status = err?.response?.status;
        const code = err?.response?.data?.code;
        return status === 503 && code === "CARD_CREATE_IN_FLIGHT";
    }

    function jitterDelayMs(baseMs) {
        const b = Number(baseMs) || 0;
        if (b <= 0) return 0;
        // +/- 30% jitter
        const jitter = 0.7 + Math.random() * 0.6;
        return Math.max(0, Math.round(b * jitter));
    }

    async function sleepMs(ms) {
        const t = Number(ms) || 0;
        if (t <= 0) return;
        return new Promise((resolve) => setTimeout(resolve, t));
    }

    async function fetchMineOnce() {
        const res = await api.get("/cards/mine");
        return res?.data || null;
    }

    async function createCardWithRetry() {
        // Single-flight: ensure we never run parallel POST /cards in this session.
        if (createCardInFlightRef.current) return createCardInFlightRef.current;

        const promise = (async () => {
            // 1) If card already exists, do nothing.
            const mine0 = await fetchMineOnce();
            if (mine0 && mine0._id) return mine0;

            // 2) Try creating.
            try {
                const created = await api.post("/cards", {});
                const createdData = created?.data || null;
                if (createdData && createdData._id) return createdData;

                // Safety fallback: if response is malformed, re-fetch mine.
                const mineAfter = await fetchMineOnce();
                if (mineAfter && mineAfter._id) return mineAfter;
                throw new Error("Create card returned invalid response");
            } catch (err) {
                if (!isCreateInFlightError(err)) throw err;

                // 3) Backend says "in flight". Retry via GET /cards/mine with backoff + jitter.
                const delays = [100, 200, 400, 800];
                for (const d of delays) {
                    await sleepMs(jitterDelayMs(d));
                    const mine = await fetchMineOnce();
                    if (mine && mine._id) return mine;
                }

                // Last attempt (no extra delay)
                const mineLast = await fetchMineOnce();
                if (mineLast && mineLast._id) return mineLast;

                const retryErr = new Error(
                    "Card creation in progress. Please retry.",
                );
                retryErr.code = "CARD_CREATE_IN_FLIGHT";
                throw retryErr;
            }
        })();

        createCardInFlightRef.current = promise;
        promise.finally(() => {
            if (createCardInFlightRef.current === promise) {
                createCardInFlightRef.current = null;
            }
        });

        return promise;
    }

    const initCard = useCallback(
        async (isMounted = () => true) => {
            try {
                const res = await api.get("/cards/mine");
                if (!isMounted()) return;

                // P0: never overwrite local draft while user has unsaved edits.
                // (Auto refetch on focus/visibility can look like "blur cleared my input".)
                const hasDirty =
                    dirtyPathsRef.current && dirtyPathsRef.current.size > 0;
                if (hasDirty && draftCardRef.current?._id) {
                    setIsInitializing(false);
                    return;
                }

                const mine = res?.data;

                // If no card (or malformed), create a persisted draft card server-side.
                if (!mine || !mine._id) {
                    const createdData = await createCardWithRetry();
                    if (!isMounted()) return;
                    const normalized = normalizeCardForEditor(createdData);
                    setDraftCard(normalized);
                    setDirtyPaths(new Set());
                    setSaveState("idle");
                    setSaveErrorText(null);
                    setIsInitializing(false);
                    return;
                }

                const normalized = normalizeCardForEditor(mine);
                setDraftCard(normalized);
                setDirtyPaths(new Set());
                setSaveState("idle");
                setSaveErrorText(null);
                setIsInitializing(false);
            } catch (err) {
                const status = err?.response?.status;
                // IMPORTANT: log here (err exists), not above
                console.error(
                    "initCard error",
                    status,
                    err?.response?.data || err,
                );

                // If card creation is in-flight (race), retry via the shared retry helper.
                if (isCreateInFlightError(err)) {
                    try {
                        const createdData = await createCardWithRetry();
                        if (!isMounted()) return;
                        const normalized = normalizeCardForEditor(createdData);
                        setDraftCard(normalized);
                        setDirtyPaths(new Set());
                        setSaveState("idle");
                        setSaveErrorText(null);
                        setIsInitializing(false);
                        return;
                    } catch (retryErr) {
                        console.error(
                            "initCard retry after in-flight failed",
                            retryErr?.message || retryErr,
                        );
                    }
                }

                // 404 can mean "no card" OR "card was deleted and editor is stale".
                // If we previously had a card id in this session, treat 404 as deleted and exit.
                if (status === 404) {
                    const hadCardId = Boolean(draftCardRef.current?._id);
                    if (hadCardId) {
                        navigate("/dashboard", {
                            replace: true,
                            state: {
                                flash: {
                                    type: "info",
                                    message: "הכרטיס כבר נמחק",
                                },
                            },
                        });
                        return;
                    }

                    try {
                        const createdData = await createCardWithRetry();
                        if (!isMounted()) return;
                        const normalized = normalizeCardForEditor(createdData);
                        setDraftCard(normalized);
                        setDirtyPaths(new Set());
                        setSaveState("idle");
                        setSaveErrorText(null);
                        setIsInitializing(false);
                        return;
                    } catch (createErr) {
                        console.error(
                            "initCard create fallback failed",
                            createErr?.response?.status,
                            createErr?.response?.data || createErr,
                        );
                    }
                }

                // Do not redirect to /login here; anonymous flow must stay on /edit
                setIsInitializing(false);
            }
        },
        [navigate],
    );

    const discardUnsavedAndRehydrate = useCallback(async () => {
        // 1) Clear dirty first (initCard refuses to overwrite when dirty).
        const cleared = new Set();
        setDirtyPaths(cleared);
        dirtyPathsRef.current = cleared;
        setSaveState("idle");
        setSaveErrorText(null);

        // 2) Rehydrate from server using the existing init path.
        setReloadKey((k) => k + 1);
    }, []);

    const refetchMineThrottled = useCallback(
        async (isMounted = () => true) => {
            // P0: skip auto refetch while deleting or while user has unsaved edits.
            if (isDeletingRef.current) return;
            const hasDirty =
                dirtyPathsRef.current && dirtyPathsRef.current.size > 0;
            if (hasDirty) return;

            const nowMs = Date.now();
            if (nowMs - lastRefetchAtRef.current < REFETCH_THROTTLE_MS) return;
            lastRefetchAtRef.current = nowMs;

            await initCard(isMounted);
        },
        [initCard],
    );

    useEffect(() => {
        let isMounted = true;
        initCard(() => isMounted);

        return () => {
            isMounted = false;
        };
    }, [initCard, reloadKey]);

    useEffect(() => {
        if (!editingDisabled) return;

        let stopped = false;
        const tick = async () => {
            if (stopped) return;
            try {
                await refetchMineThrottled(() => !stopped);
            } catch {
                // silent
            }
        };

        const interval = setInterval(tick, REFETCH_THROTTLE_MS);

        // Keep legacy behavior for anonymous locked sessions: refresh on focus.
        // Logged-in users are handled by the global focus/visibility refetch below.
        const onFocus = () => tick();
        if (!token) window.addEventListener("focus", onFocus);

        return () => {
            stopped = true;
            clearInterval(interval);
            if (!token) window.removeEventListener("focus", onFocus);
        };
    }, [editingDisabled, refetchMineThrottled, token]);

    useEffect(() => {
        if (!token) return;

        let stopped = false;
        const tick = async () => {
            if (stopped) return;
            try {
                await refetchMineThrottled(() => !stopped);
            } catch {
                // silent
            }
        };

        const onFocus = () => tick();
        const onVisibilityChange = () => {
            if (document.visibilityState === "visible") tick();
        };

        window.addEventListener("focus", onFocus);
        document.addEventListener("visibilitychange", onVisibilityChange);

        return () => {
            stopped = true;
            window.removeEventListener("focus", onFocus);
            document.removeEventListener(
                "visibilitychange",
                onVisibilityChange,
            );
        };
    }, [token, refetchMineThrottled]);

    // Phase 2: no autosave while typing.

    async function handleDelete() {
        if (isDeletingRef.current) return;
        if (!draftCard?._id) return;

        const confirmed = window.confirm(
            "האם אתה בטוח שברצונך למחוק כרטיס זה?",
        );
        if (!confirmed) return;

        try {
            setIsDeleting(true);
            const result = await deleteCard(draftCard._id);
            const ok =
                result?.status === 204 ||
                result?.data?.success === true ||
                result?.data?.ok === true;
            if (!ok) {
                showDeleteNotice({
                    type: "error",
                    text: "שגיאה במחיקה",
                });
                setIsDeleting(false);
                return;
            }

            // Ensure in-app navigation guard does not block the redirect.
            setDirtyPaths(new Set());

            // Success: leave EditCard (do not trigger initial-loading UI here).
            navigate("/dashboard", {
                replace: true,
                state: {
                    flash: {
                        type: "success",
                        message: "הכרטיס נמחק בהצלחה",
                    },
                },
            });
        } catch (err) {
            const status = err?.response?.status;

            if (status === 403) {
                showDeleteNotice({
                    type: "error",
                    text: "אין הרשאה למחוק כרטיס זה",
                });
                setIsDeleting(false);
                return;
            }

            if (status === 404) {
                // Treat as already deleted.
                setIsDeleting(false);
                navigate("/dashboard", {
                    replace: true,
                    state: {
                        flash: {
                            type: "info",
                            message: "הכרטיס כבר נמחק",
                        },
                    },
                });
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

            const fallback = "שגיאה במחיקה";
            const serverMessage = err?.response?.data?.message;
            const message =
                typeof serverMessage === "string" && serverMessage.trim()
                    ? serverMessage
                    : fallback;
            showDeleteNotice({ type: "error", text: message });
            setIsDeleting(false);
            return;
        }

        // Do NOT reset draftCard/isInitializing here. Deletion is not an "initial load".
        // (Navigation will be handled in the next step of the delete UX rework.)
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

    function isPlainObject(value) {
        return (
            value !== null && typeof value === "object" && !Array.isArray(value)
        );
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

    function buildMinimalSectionPayload(draft, dirty, sectionName) {
        if (!draft || typeof draft !== "object") return null;
        if (!(dirty instanceof Set) || dirty.size === 0) return null;
        if (typeof sectionName !== "string" || !sectionName) return null;

        const section =
            draft[sectionName] && typeof draft[sectionName] === "object"
                ? draft[sectionName]
                : null;
        if (!section) return null;

        const prefix = `${sectionName}.`;
        const nestedPatch = {};

        function getValueByKeys(obj, keys) {
            let curr = obj;
            for (const k of keys) {
                if (!curr || typeof curr !== "object") return undefined;
                curr = curr[k];
            }
            return curr;
        }

        function setValueByKeys(target, keys, value) {
            if (!keys.length) return;
            let curr = target;
            for (let i = 0; i < keys.length - 1; i += 1) {
                const k = keys[i];
                if (
                    !curr[k] ||
                    typeof curr[k] !== "object" ||
                    Array.isArray(curr[k])
                ) {
                    curr[k] = {};
                }
                curr = curr[k];
            }
            curr[keys[keys.length - 1]] = value;
        }

        for (const path of dirty) {
            const p = String(path || "");
            if (!p.startsWith(prefix)) continue;

            const leaf = p.slice(prefix.length);
            if (!leaf) continue;

            const keys = leaf.split(".").filter(Boolean);
            if (!keys.length) continue;

            const value = getValueByKeys(section, keys);
            if (value === undefined) continue;

            setValueByKeys(nestedPatch, keys, value);
        }

        // Bridge-invariant for tolerant writer/reader:
        // if either about field is dirty, always send both.
        const aboutParagraphsPath = `${sectionName}.aboutParagraphs`;
        const aboutTextPath = `${sectionName}.aboutText`;
        if (dirty.has(aboutParagraphsPath) || dirty.has(aboutTextPath)) {
            const aboutParagraphs = Array.isArray(section.aboutParagraphs)
                ? section.aboutParagraphs
                : [];
            const aboutText =
                typeof section.aboutText === "string" ? section.aboutText : "";

            nestedPatch.aboutParagraphs = aboutParagraphs;
            nestedPatch.aboutText = aboutText;
        }

        return Object.keys(nestedPatch).length ? nestedPatch : null;
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

    const commitDraft = useCallback(async () => {
        const cardId = draftCard?._id;
        if (!cardId) return false;

        if (!dirtyPaths || dirtyPaths.size === 0) return false;

        // Minimal-risk payload builder:
        // send full dirty sections from draftCard (keeps backend shape stable).
        const dirtySections = new Set();
        for (const path of dirtyPaths) {
            const section = String(path || "").split(".")[0];
            if (section) dirtySections.add(section);
        }

        const payload = {};
        for (const section of dirtySections) {
            if (
                Object.prototype.hasOwnProperty.call(draftCard || {}, section)
            ) {
                if (section === "content") {
                    const minimal = buildMinimalSectionPayload(
                        draftCard,
                        dirtyPaths,
                        "content",
                    );
                    if (minimal) payload.content = minimal;
                    continue;
                }

                if (section === "faq") {
                    payload.faq = normalizeFaqForSave(draftCard?.faq);
                    continue;
                }

                payload[section] = draftCard?.[section];
            }
        }

        if (Object.keys(payload).length === 0) return false;

        setSaveState("saving");
        setSaveErrorText(null);

        try {
            const res = await api.patch(`/cards/${cardId}`, payload);
            const normalized = normalizeCardForEditor(res.data);
            setDraftCard(normalized);
            setDirtyPaths(new Set());
            setSaveState("saved");
            return true;
        } catch (err) {
            const message =
                err?.response?.data?.message || err?.message || "שגיאה בשמירה";
            setSaveState("error");
            setSaveErrorText(String(message));
            return false;
        }
    }, [dirtyPaths, draftCard]);

    const proceedPendingNavigation = useCallback(() => {
        if (pendingAction?.kind === "tab" && pendingAction.to) {
            navigate(pendingAction.to);
            return;
        }
        if (pendingAction?.kind === "leave") {
            const b = pendingBlockerRef.current;
            pendingBlockerRef.current = null;
            b?.proceed?.();
            return;
        }
    }, [navigate, pendingAction]);

    const handleUnsavedStay = useCallback(() => {
        // If we are in a blocked leave state, we must reset the blocker.
        const b = pendingBlockerRef.current;
        pendingBlockerRef.current = null;
        b?.reset?.();
        closeUnsavedModal();
    }, [closeUnsavedModal]);

    const handleUnsavedDiscard = useCallback(async () => {
        if (unsavedActionBusy) return;
        setUnsavedActionBusy(true);
        try {
            await discardUnsavedAndRehydrate();
            closeUnsavedModal();
            proceedPendingNavigation();
        } finally {
            setUnsavedActionBusy(false);
        }
    }, [
        closeUnsavedModal,
        discardUnsavedAndRehydrate,
        proceedPendingNavigation,
        unsavedActionBusy,
    ]);

    const handleUnsavedSave = useCallback(async () => {
        if (unsavedActionBusy) return;
        setUnsavedActionBusy(true);
        try {
            const ok = await commitDraft();
            if (!ok) {
                // Keep user in editor; rely on existing save error UI.
                closeUnsavedModal();
                return;
            }

            closeUnsavedModal();
            proceedPendingNavigation();
        } finally {
            setUnsavedActionBusy(false);
        }
    }, [
        closeUnsavedModal,
        commitDraft,
        proceedPendingNavigation,
        unsavedActionBusy,
    ]);

    // Ops-only persistence (uploads). This must NOT be used for typing.
    // IMPORTANT: ops PATCH must NOT overwrite the full draftCard with the server response,
    // because there may be unrelated dirty typing changes in draftCard.
    // Instead, merge only the saved section/keys into the existing draft.
    const opsPatchCard = useCallback(async (payload, clearPrefixes = []) => {
        const cardId = draftCardRef.current?._id;
        if (!cardId) return;
        if (!payload || typeof payload !== "object") return;

        try {
            const res = await api.patch(`/cards/${cardId}`, payload);
            const normalized = normalizeCardForEditor(res.data);

            setDraftCard((prev) => {
                const prevDraft = prev || {};
                const server =
                    normalized && typeof normalized === "object"
                        ? normalized
                        : null;
                const nextDraft = { ...prevDraft };

                for (const topKey of Object.keys(payload)) {
                    const patchValue = payload[topKey];
                    const serverValue = server ? server[topKey] : undefined;

                    // Merge object patches (design/contact/content/etc.) by keys, not wholesale.
                    if (
                        patchValue &&
                        typeof patchValue === "object" &&
                        !Array.isArray(patchValue)
                    ) {
                        const prevObj =
                            prevDraft[topKey] &&
                            typeof prevDraft[topKey] === "object" &&
                            !Array.isArray(prevDraft[topKey])
                                ? prevDraft[topKey]
                                : {};

                        const nextObj = { ...prevObj };
                        for (const subKey of Object.keys(patchValue)) {
                            if (
                                serverValue &&
                                typeof serverValue === "object" &&
                                Object.prototype.hasOwnProperty.call(
                                    serverValue,
                                    subKey,
                                )
                            ) {
                                nextObj[subKey] = serverValue[subKey];
                            } else {
                                nextObj[subKey] = patchValue[subKey];
                            }
                        }

                        nextDraft[topKey] = nextObj;
                        continue;
                    }

                    // Arrays/primitives: replace the whole key, preferring server value if present.
                    if (serverValue !== undefined) {
                        nextDraft[topKey] = serverValue;
                    } else {
                        nextDraft[topKey] = patchValue;
                    }
                }

                return nextDraft;
            });

            if (Array.isArray(clearPrefixes) && clearPrefixes.length) {
                setDirtyPaths((prev) => {
                    const next = new Set(prev);

                    const touchedSections = new Set();
                    for (const prefix of clearPrefixes) {
                        const pfx = String(prefix || "");
                        if (!pfx) continue;
                        touchedSections.add(pfx.split(".")[0]);

                        for (const existing of Array.from(next)) {
                            if (
                                existing === pfx ||
                                existing.startsWith(`${pfx}.`)
                            ) {
                                next.delete(existing);
                            }
                        }
                    }

                    // If a section marker (e.g. "design") exists, only drop it when there are
                    // no remaining dirty keys inside that section.
                    for (const section of touchedSections) {
                        if (!section) continue;

                        if (!next.has(section)) continue;

                        let hasOther = false;
                        for (const existing of next) {
                            if (existing.startsWith(`${section}.`)) {
                                hasOther = true;
                                break;
                            }
                        }
                        if (!hasOther) next.delete(section);
                    }

                    // Keep saveState coherent for future UI (Phase 3)
                    if (next.size === 0) {
                        setSaveState("saved");
                        setSaveErrorText(null);
                    } else {
                        setSaveState("dirty");
                    }

                    return next;
                });
            }
        } catch (err) {
            // Ops failures should not silently reset dirty state.
            const message =
                err?.response?.data?.message || err?.message || "שגיאה בשמירה";
            setSaveState("error");
            setSaveErrorText(String(message));
        }
    }, []);

    // Phase 2: draft-only updates. No debounce, no network.
    const onFieldChange = useCallback(
        (sectionOrPath, patchOrValue) => {
            if (editingDisabled) return;

            const key = String(sectionOrPath || "");
            if (!key) return;

            if (key.includes(".")) {
                setDraftCard((prev) =>
                    prev ? setIn(prev, key, patchOrValue) : prev,
                );
                setDirtyPaths((prev) => {
                    const next = new Set(prev);
                    next.add(key);
                    return next;
                });
            } else {
                if (isPlainObject(patchOrValue)) {
                    setDraftCard((prev) =>
                        prev ? mergeSection(prev, key, patchOrValue) : prev,
                    );
                    setDirtyPaths((prev) => {
                        const next = new Set(prev);
                        next.add(key);

                        // Only mark keys that actually changed (prevents dirty explosion
                        // when panels pass whole objects like design).
                        const prevSection =
                            (draftCardRef.current &&
                                draftCardRef.current[key]) ||
                            {};
                        for (const fieldKey of Object.keys(
                            patchOrValue || {},
                        )) {
                            if (
                                prevSection?.[fieldKey] !==
                                patchOrValue[fieldKey]
                            ) {
                                next.add(`${key}.${fieldKey}`);
                            }
                        }
                        return next;
                    });

                    // Upload ops: persist immediately for specific asset fields.
                    if (key === "design") {
                        const prevDesign = draftCardRef.current?.design || {};
                        const nextDesign = patchOrValue || {};

                        const bg = nextDesign.backgroundImage;
                        if (bg && bg !== prevDesign.backgroundImage) {
                            opsPatchCard({ design: { backgroundImage: bg } }, [
                                "design.backgroundImage",
                            ]);
                        }

                        const av = nextDesign.avatarImage;
                        if (av && av !== prevDesign.avatarImage) {
                            opsPatchCard({ design: { avatarImage: av } }, [
                                "design.avatarImage",
                            ]);
                        }
                    }
                } else {
                    setDraftCard((prev) =>
                        prev ? { ...(prev || {}), [key]: patchOrValue } : prev,
                    );
                    setDirtyPaths((prev) => {
                        const next = new Set(prev);
                        next.add(key);
                        return next;
                    });

                    // Upload ops: gallery should persist immediately.
                    if (key === "gallery") {
                        opsPatchCard({ gallery: patchOrValue }, ["gallery"]);
                    }
                }
            }

            setSaveState("dirty");
            setSaveErrorText(null);
        },
        [editingDisabled],
    );

    const handlePublish = useCallback(async () => {
        if (!draftCard?._id) return;

        try {
            const res = await api.patch(`/cards/${draftCard._id}`, {
                status: "published",
            });
            const normalized = normalizeCardForEditor(res.data);
            setDraftCard(normalized);

            if (res?.data?.publishError === "MISSING_FIELDS") {
                alert("כדי לפרסם צריך למלא שם עסק ולבחור תבנית");
            } else if (res?.data?.status !== "published") {
                console.warn("[card:publish] declined", {
                    status: res?.data?.status,
                    publishError: res?.data?.publishError,
                });
                alert("Publish failed");
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
    }, [draftCard?._id]);

    const handleUnpublish = useCallback(async () => {
        if (!draftCard?._id) return;

        try {
            const res = await api.patch(`/cards/${draftCard._id}`, {
                status: "draft",
            });
            const normalized = normalizeCardForEditor(res.data);
            setDraftCard(normalized);
        } catch (err) {
            const message = err?.response?.data?.message;
            alert(message || "שגיאה");
        }
    }, [draftCard?._id]);

    if (isInitializing || !draftCard?._id) {
        return <div className={styles.editCard}>טוען...</div>;
    }

    const anonId = getAnonymousId();
    const shouldShowAnonCta = !token && Boolean(anonId);

    return (
        <div className={styles.editCard}>
            <ConfirmUnsavedChangesModal
                open={isUnsavedModalOpen}
                title="השינויים לא נשמרו"
                body="ביצעת שינויים שלא נשמרו בכרטיס. מה תרצה לעשות?"
                primaryLabel="שמור והמשך"
                secondaryLabel="המשך בלי לשמור"
                tertiaryLabel="חזור לעריכה"
                onPrimary={handleUnsavedSave}
                onSecondary={handleUnsavedDiscard}
                onTertiary={handleUnsavedStay}
                busy={unsavedActionBusy}
            />
            {deleteNotice ? (
                <div
                    className={`${styles.notice} ${
                        deleteNotice.type === "success"
                            ? styles.noticeSuccess
                            : styles.noticeError
                    }`}
                    role={deleteNotice.type === "error" ? "alert" : "status"}
                    aria-live="polite"
                    dir="rtl"
                >
                    <span className={styles.noticeText}>
                        {deleteNotice.text}
                    </span>
                    <button
                        type="button"
                        className={styles.noticeClose}
                        onClick={() => {
                            clearDeleteNoticeTimer();
                            setDeleteNotice(null);
                        }}
                        aria-label="סגירה"
                    >
                        ×
                    </button>
                </div>
            ) : null}
            <main className={styles.main}>
                {shouldShowAnonCta ? (
                    <section className={styles.anonCta} dir="rtl" role="note">
                        <div className={styles.anonCtaText}>
                            כדי לשמור את הכרטיס ולגבות את התמונות, מומלץ להירשם
                            או להתחבר.
                        </div>
                        <div className={styles.anonCtaActions}>
                            <Link
                                to="/register"
                                className={styles.anonCtaPrimary}
                            >
                                יצירת חשבון
                            </Link>
                            <Link
                                to="/login"
                                className={styles.anonCtaSecondary}
                            >
                                התחברות
                            </Link>
                        </div>
                    </section>
                ) : null}
                {showTrialBanner && (
                    <TrialBanner
                        trialStartedAt={draftCard?.trialStartedAt}
                        trialEndsAt={draftCard?.trialEndsAt}
                        isExpired={isTrialExpired}
                        onRegister={() => {
                            window.location.href = "/pricing";
                        }}
                    />
                )}
                {draftCard?.slug ? (
                    <div className={styles.publicLinkBox}>
                        <div className={styles.publicLinkTitle} dir="rtl">
                            {token && draftCard?.status === "published"
                                ? "קישור ציבורי"
                                : "קישור עתידי"}
                        </div>
                        {token && draftCard?.status === "published" ? (
                            <a
                                href={`/card/${draftCard.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                className={styles.breakWord}
                            >
                                {window.location.origin}/card/{draftCard.slug}
                            </a>
                        ) : (
                            <div className={styles.breakWord}>
                                {window.location.origin}/card/{draftCard.slug}
                            </div>
                        )}
                    </div>
                ) : null}

                {section === "card" ? (
                    <Editor
                        card={draftCard}
                        onFieldChange={onFieldChange}
                        editingDisabled={editingDisabled}
                        onDeleteCard={handleDelete}
                        isDeleting={isDeleting}
                        onRequestNavigate={requestNavigate}
                        onPublish={handlePublish}
                        onUnpublish={handleUnpublish}
                        // Phase 2: draft-first save infrastructure (wired for Phase 3 UI)
                        commitDraft={commitDraft}
                        dirtyPaths={dirtyPaths}
                        saveState={saveState}
                        saveErrorText={saveErrorText}
                        canShowAnalyticsTab={
                            Boolean(token) &&
                            Boolean(draftCard?.entitlements?.canViewAnalytics)
                        }
                        // onUpgrade / onSelectTemplate intentionally omitted for now
                        // previewHeader / previewFooter intentionally omitted for now
                    />
                ) : (
                    <div className={styles.comingSoon}>Coming soon</div>
                )}
            </main>
        </div>
    );
}

export default EditCard;
