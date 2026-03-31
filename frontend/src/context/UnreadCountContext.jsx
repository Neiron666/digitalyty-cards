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
    const { isAuthenticated } = useAuth();
    // leadsUnread: count of unread leads (readAt=null)
    // bookingsPending: count of actionable pending bookings
    // unreadCount (exposed): sum used by Header badge
    const [leadsUnread, setLeadsUnread] = useState(0);
    const [bookingsPending, setBookingsPending] = useState(0);
    const inflightRef = useRef(false);
    const pendingRefetchRef = useRef(false);
    const timerRef = useRef(null);

    const fetchCount = useCallback(async () => {
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
            if (pendingRefetchRef.current) {
                pendingRefetchRef.current = false;
                fetchCount();
            }
        }
    }, []);

    // Start / stop polling based on auth + visibility.
    useEffect(() => {
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
                if (document.visibilityState === "visible") {
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
            if (document.visibilityState === "visible") {
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
    }, [isAuthenticated, fetchCount]);

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
