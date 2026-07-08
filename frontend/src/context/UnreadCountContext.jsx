import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { useAuth } from "./AuthContext";
import { getUnreadCount } from "../services/leads.service";
import { getPendingBookingCount } from "../services/bookings.service";

const POLL_INTERVAL_MS = 60_000; // 60 s

const UnreadCountContext = createContext(null);

export function UnreadCountProvider({ children }) {
    const { isAuthenticated, loading } = useAuth();

    // Keep latest auth state available inside fetchCount without stale closure risk.
    const authStateRef = useRef({ isAuthenticated, loading });
    authStateRef.current = { isAuthenticated, loading };

    // leadsUnread: count of unread leads (readAt=null)
    // bookingsPending: count of actionable pending bookings
    // unreadCount (exposed): sum used by Header badge
    const [leadsUnread, setLeadsUnread] = useState(0);
    const [bookingsPending, setBookingsPending] = useState(0);
    const inflightRef = useRef(false);
    const pendingRefetchRef = useRef(false);
    const timerRef = useRef(null);

    // [AUTH-SUSPEND] Set to true when either count endpoint returns 401, indicating
    // the backend session has expired while React still shows isAuthenticated=true.
    // Polling stops immediately and only resumes when auth state changes.
    const suspendedRef = useRef(false);

    const fetchCount = useCallback(async () => {
        const authState = authStateRef.current;

        // [AUTH-SUSPEND] fetchCount itself must be safe because it is also exposed
        // as refresh and can be called from pendingRefetch/finally.
        if (
            authState.loading ||
            !authState.isAuthenticated ||
            suspendedRef.current
        ) {
            pendingRefetchRef.current = false;

            if (!authState.isAuthenticated || suspendedRef.current) {
                setLeadsUnread(0);
                setBookingsPending(0);
            }

            return;
        }

        if (inflightRef.current) {
            pendingRefetchRef.current = true;
            return;
        }

        inflightRef.current = true;

        try {
            const [leads, bookings] = await Promise.allSettled([
                getUnreadCount(),
                getPendingBookingCount(),
            ]);

            // [AUTH-SUSPEND] If either endpoint returned 401, the session has expired
            // server-side while React's isAuthenticated is still true. Stop polling
            // immediately and zero out counts. Do not log — 401 here is expected and
            // not an application error. Suspend clears when auth state next changes.
            const is401 = (result) =>
                result.status === "rejected" &&
                result.reason?.response?.status === 401;

            if (is401(leads) || is401(bookings)) {
                suspendedRef.current = true;
                pendingRefetchRef.current = false;

                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }

                setLeadsUnread(0);
                setBookingsPending(0);
                return;
            }

            if (leads.status === "fulfilled") {
                setLeadsUnread(
                    typeof leads.value === "number" ? leads.value : 0,
                );
            }

            if (bookings.status === "fulfilled") {
                setBookingsPending(
                    typeof bookings.value === "number" ? bookings.value : 0,
                );
            }
        } catch {
            // best-effort, silent
        } finally {
            inflightRef.current = false;

            const latestAuthState = authStateRef.current;
            const shouldRefetch =
                pendingRefetchRef.current &&
                !suspendedRef.current &&
                !latestAuthState.loading &&
                latestAuthState.isAuthenticated;

            pendingRefetchRef.current = false;

            if (shouldRefetch) {
                fetchCount();
            }
        }
    }, []);

    // Start / stop polling based on auth + visibility.
    useEffect(() => {
        // [AUTH-SUSPEND] Reset suspend on every auth state change so polling
        // resumes cleanly after a real login or page reload.
        suspendedRef.current = false;
        pendingRefetchRef.current = false;

        // Do not fetch or start the interval while auth bootstrap is in progress.
        if (loading) return;

        if (!isAuthenticated) {
            setLeadsUnread(0);
            setBookingsPending(0);
            return;
        }

        // Initial fetch.
        fetchCount();

        function startInterval() {
            stopInterval();

            timerRef.current = setInterval(() => {
                if (
                    document.visibilityState === "visible" &&
                    !suspendedRef.current
                ) {
                    fetchCount();
                }
            }, POLL_INTERVAL_MS);
        }

        function stopInterval() {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }

        function onVisibilityChange() {
            if (
                document.visibilityState === "visible" &&
                !suspendedRef.current
            ) {
                fetchCount();
                startInterval();
            } else {
                stopInterval();
            }
        }

        startInterval();
        document.addEventListener("visibilitychange", onVisibilityChange);

        return () => {
            stopInterval();
            document.removeEventListener(
                "visibilitychange",
                onVisibilityChange,
            );
        };
    }, [isAuthenticated, loading, fetchCount]);

    // Adjust leads-only unread count optimistically (mark-read, delete).
    // Booking count is always server-driven; no client-side delta for bookings.
    const adjustUnreadCount = useCallback(
        (delta) =>
            setLeadsUnread((prev) =>
                Math.max(0, (typeof prev === "number" ? prev : 0) + delta),
            ),
        [],
    );

    // Summed badge value: leads unread + actionable pending bookings.
    const unreadCount = leadsUnread + bookingsPending;

    const value = useMemo(
        () => ({ unreadCount, refresh: fetchCount, adjustUnreadCount }),
        [unreadCount, fetchCount, adjustUnreadCount],
    );

    return (
        <UnreadCountContext.Provider value={value}>
            {children}
        </UnreadCountContext.Provider>
    );
}

export function useUnreadCount() {
    const ctx = useContext(UnreadCountContext);

    if (!ctx) {
        throw new Error(
            "useUnreadCount must be used inside <UnreadCountProvider>",
        );
    }

    return ctx;
}
