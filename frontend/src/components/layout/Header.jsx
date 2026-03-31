import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import Button from "../ui/Button";
import { useAuth } from "../../context/AuthContext";
import { getHasOrgAdmin } from "../../services/orgAdminGate";
import useUnreadCount from "../../hooks/useUnreadCount";
import useFocusTrap from "../../hooks/useFocusTrap";
import styles from "./Header.module.css";

export default function Header() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [hasOrgAdmin, setHasOrgAdmin] = useState(false);
    const scrollYRef = useRef(0);
    const burgerRef = useRef(null);
    const drawerRef = useRef(null);
    const navigate = useNavigate();
    const { isAuthenticated, user, logout } = useAuth();
    const isAuth = isAuthenticated;
    const { unreadCount } = useUnreadCount();

    useFocusTrap(drawerRef, mobileOpen);

    useEffect(() => {
        if (!isAuthenticated) {
            setHasOrgAdmin(false);
            return;
        }

        const controller = new AbortController();
        let alive = true;

        (async () => {
            const ok = await getHasOrgAdmin({
                userId: user?.email,
                signal: controller.signal,
            });
            if (!alive) return;
            setHasOrgAdmin(Boolean(ok));
        })();

        return () => {
            alive = false;
        };
    }, [isAuthenticated, user?.email]);

    const navItems = useMemo(() => {
        const items = [
            { to: "/", end: true, label: "כרטיס ביקור דיגיטלי" },
            { to: "/cards", label: "דוגמאות" },
            { to: "/pricing", label: "מחירים" },
            { to: "/guides", label: "מדריכים" },
            { to: "/blog", label: "בלוג" },
            { to: "/contact", label: "צור קשר" },
        ];

        if (isAuth) {
            items.unshift({ to: "/edit", label: "הכרטיס שלי" });
        }

        if (isAuth && user?.role === "admin") {
            items.unshift({ to: "/admin", label: "Admin" });
        }

        if (isAuth && hasOrgAdmin) {
            items.unshift({ to: "/org/invites", label: "Org Admin" });
        }

        return items;
    }, [hasOrgAdmin, isAuth, user?.role]);

    const closeMobile = useCallback(() => {
        setMobileOpen(false);
    }, []);

    // Restore focus to burger button when drawer closes.
    useEffect(() => {
        if (!mobileOpen) {
            burgerRef.current?.focus?.();
        }
    }, [mobileOpen]);

    // Lock body scroll when mobile drawer is open (iOS-safe body-pinning).
    useEffect(() => {
        if (typeof document === "undefined") return;

        const lockClass = styles.scrollLock;
        const root = document.documentElement;
        const body = document.body;

        if (mobileOpen) {
            scrollYRef.current = window.scrollY;
            root.classList.add(lockClass);
            body.classList.add(lockClass);
            body.style.position = "fixed";
            body.style.top = `-${scrollYRef.current}px`;
            body.style.insetInline = "0";
        } else {
            root.classList.remove(lockClass);
            body.classList.remove(lockClass);
            body.style.position = "";
            body.style.top = "";
            body.style.insetInline = "";
            window.scrollTo(0, scrollYRef.current);
        }

        return () => {
            root.classList.remove(lockClass);
            body.classList.remove(lockClass);
            body.style.position = "";
            body.style.top = "";
            body.style.insetInline = "";
            window.scrollTo(0, scrollYRef.current);
        };
    }, [mobileOpen]);

    // Close drawer on Escape key.
    useEffect(() => {
        if (!mobileOpen) return;

        const onKeyDown = (e) => {
            if (e.key === "Escape") closeMobile();
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [mobileOpen, closeMobile]);

    const handleLogout = () => {
        logout();
        closeMobile();
        navigate("/", { replace: true });
    };

    const navLinkClass = ({ isActive }) =>
        isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink;

    return (
        <>
            <header className={styles.header}>
                <div className={styles.inner}>
                    {/* Logo */}
                    <Link
                        to="/"
                        className={styles.logo}
                        aria-label="כרטיס ביקור דיגיטלי - כרדיגו"
                    >
                        <picture>
                            <source
                                type="image/webp"
                                srcSet="/images/brand-logo/cardigo-logo.webp"
                            />
                            <img
                                src="/images/brand-logo/cardigo-logo.png"
                                alt="כרטיס ביקור דיגיטלי - כרדיגו"
                                className={styles.logoImage}
                                loading="eager"
                                decoding="async"
                            />
                        </picture>
                    </Link>

                    {/* Mobile menu toggle */}
                    <button
                        ref={burgerRef}
                        type="button"
                        className={
                            mobileOpen
                                ? `${styles.burger} ${styles.burgerOpen}`
                                : styles.burger
                        }
                        aria-label={mobileOpen ? "סגירת תפריט" : "פתיחת תפריט"}
                        aria-expanded={mobileOpen}
                        aria-controls="mobile-nav"
                        onClick={() => setMobileOpen((v) => !v)}
                    >
                        <span className={styles.burgerLine} />
                        <span className={styles.burgerLine} />
                        <span className={styles.burgerLine} />
                    </button>

                    {/* Navigation */}
                    <nav className={styles.nav}>
                        {navItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.end}
                                className={navLinkClass}
                            >
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>

                    {/* Actions */}
                    <div className={styles.actions}>
                        {!isAuth ? (
                            <>
                                <Button
                                    as={Link}
                                    to="/login"
                                    variant="secondary"
                                    size="small"
                                >
                                    התחברות
                                </Button>
                                <Button
                                    as={Link}
                                    to="/edit"
                                    variant="primary"
                                    size="small"
                                >
                                    צור כרטיס חינם
                                </Button>
                            </>
                        ) : (
                            <div className={styles.authBlock}>
                                <div className={styles.authButtons}>
                                    <Button
                                        as={Link}
                                        to="/edit"
                                        variant="secondary"
                                        size="small"
                                    >
                                        הכרטיס שלי
                                    </Button>

                                    <Button
                                        variant="ghost"
                                        size="small"
                                        onClick={handleLogout}
                                    >
                                        יציאה
                                    </Button>
                                </div>

                                <Link
                                    to="/inbox"
                                    className={styles.inboxLink}
                                    aria-label="הודעות נכנסות"
                                >
                                    <svg
                                        className={styles.inboxIcon}
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                    >
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                        <polyline points="22,6 12,13 2,6" />
                                    </svg>
                                    {unreadCount > 0 && (
                                        <span className={styles.badge}>
                                            {unreadCount > 99
                                                ? "99+"
                                                : unreadCount}
                                        </span>
                                    )}
                                </Link>

                                {user?.email && (
                                    <span
                                        className={styles.userEmail}
                                        title={user.email}
                                    >
                                        {user.email}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Mobile drawer */}
            <div
                className={
                    mobileOpen
                        ? `${styles.overlay} ${styles.overlayOpen}`
                        : styles.overlay
                }
                onClick={closeMobile}
                aria-hidden="true"
            />
            <aside
                ref={drawerRef}
                id="mobile-nav"
                role="dialog"
                aria-modal={mobileOpen ? "true" : undefined}
                className={
                    mobileOpen
                        ? `${styles.drawer} ${styles.drawerOpen}`
                        : styles.drawer
                }
                aria-hidden={!mobileOpen}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={styles.drawerHeader}>
                    <div className={styles.drawerTitle}>
                        <picture>
                            <source
                                type="image/webp"
                                srcSet="/images/brand-logo/cardigo-logo.webp"
                            />
                            <img
                                src="/images/brand-logo/cardigo-logo.png"
                                alt="כרדיגו"
                                className={styles.drawerLogoImg}
                                loading="eager"
                                decoding="async"
                            />
                        </picture>
                        <span className={styles.drawerTitleText}>תפריט</span>
                    </div>
                    <button
                        type="button"
                        className={styles.drawerClose}
                        aria-label="סגירת תפריט"
                        onClick={closeMobile}
                    >
                        ✕
                    </button>
                </div>

                <nav className={styles.drawerNav}>
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={navLinkClass}
                            onClick={closeMobile}
                        >
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className={styles.drawerActions}>
                    {!isAuth ? (
                        <>
                            <Button
                                as={Link}
                                to="/login"
                                variant="secondary"
                                fullWidth
                                onClick={closeMobile}
                            >
                                התחברות
                            </Button>
                            <Button
                                as={Link}
                                to="/edit"
                                variant="primary"
                                fullWidth
                                onClick={closeMobile}
                            >
                                צור כרטיס חינם
                            </Button>
                        </>
                    ) : (
                        <>
                            {user?.email ? (
                                <span
                                    className={styles.userEmail}
                                    title={user.email}
                                >
                                    {user.email}
                                </span>
                            ) : null}
                            <Button
                                as={Link}
                                to="/inbox"
                                variant="secondary"
                                fullWidth
                                onClick={closeMobile}
                            >
                                הודעות נכנסות
                                {unreadCount > 0 && (
                                    <span className={styles.mobileBadge}>
                                        {unreadCount > 99 ? "99+" : unreadCount}
                                    </span>
                                )}
                            </Button>
                            <Button
                                as={Link}
                                to="/edit"
                                variant="secondary"
                                fullWidth
                                onClick={closeMobile}
                            >
                                הכרטיס שלי
                            </Button>
                            <Button
                                variant="ghost"
                                fullWidth
                                onClick={handleLogout}
                            >
                                יציאה
                            </Button>
                        </>
                    )}
                </div>
            </aside>
        </>
    );
}
