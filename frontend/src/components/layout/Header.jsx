import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import Button from "../ui/Button";
import { useAuth } from "../../context/AuthContext";
import { getHasOrgAdmin } from "../../services/orgAdminGate";
import styles from "./Header.module.css";

export default function Header() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [hasOrgAdmin, setHasOrgAdmin] = useState(false);
    const navigate = useNavigate();
    const { token, user, logout } = useAuth();
    const isAuth = Boolean(token);

    useEffect(() => {
        if (!token) {
            setHasOrgAdmin(false);
            return;
        }

        const controller = new AbortController();
        let alive = true;

        (async () => {
            const ok = await getHasOrgAdmin({
                token,
                signal: controller.signal,
            });
            if (!alive) return;
            setHasOrgAdmin(Boolean(ok));
        })();

        return () => {
            alive = false;
        };
    }, [token]);

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

    const closeMobile = () => setMobileOpen(false);

    const handleLogout = () => {
        logout();
        closeMobile();
        navigate("/", { replace: true });
    };

    const navLinkClass = ({ isActive }) =>
        isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink;

    return (
        <header className={styles.header}>
            <div className={styles.inner}>
                {/* Logo */}
                <Link to="/" className={styles.logo}>
                    Cardigo
                </Link>

                {/* Mobile menu toggle */}
                <button
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

            {/* Mobile drawer */}
            {mobileOpen && (
                <div className={styles.overlay} onClick={closeMobile} />
            )}
            <aside
                id="mobile-nav"
                className={
                    mobileOpen
                        ? `${styles.drawer} ${styles.drawerOpen}`
                        : styles.drawer
                }
                aria-hidden={!mobileOpen}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={styles.drawerHeader}>
                    <div className={styles.drawerTitle}>תפריט</div>
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
        </header>
    );
}
