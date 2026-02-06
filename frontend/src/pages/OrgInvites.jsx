import { useEffect, useMemo, useRef, useState } from "react";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import FlashBanner from "../components/ui/FlashBanner/FlashBanner";
import Button from "../components/ui/Button";
import styles from "./OrgInvites.module.css";

function normalizeEmail(value) {
    if (typeof value !== "string") return "";
    return value.trim().toLowerCase();
}

function classifyError(err) {
    const status = err?.response?.status;
    const code = err?.response?.data?.code;

    if (status === 401) {
        return { type: "error", message: "צריך להתחבר" };
    }

    if (status === 403 || status === 404) {
        return {
            type: "error",
            message: "אין גישה או שהמשאב לא זמין",
        };
    }

    if (status === 400) {
        if (code === "INVALID_EMAIL") {
            return { type: "error", message: "אימייל לא תקין" };
        }
        return { type: "error", message: "בקשה לא תקינה" };
    }

    if (status && status >= 500) {
        return { type: "error", message: "שגיאת שרת" };
    }

    return { type: "error", message: "שגיאה" };
}

export default function OrgInvites() {
    const { token } = useAuth();

    const [flash, setFlash] = useState(null);

    const [orgsState, setOrgsState] = useState("loading");
    const [orgs, setOrgs] = useState([]);
    const [selectedOrgId, setSelectedOrgId] = useState("");

    const [invitesState, setInvitesState] = useState("idle");
    const [invites, setInvites] = useState([]);
    const [invitesTotal, setInvitesTotal] = useState(0);

    const [email, setEmail] = useState("");
    const [createBusy, setCreateBusy] = useState(false);
    const [inviteLink, setInviteLink] = useState("");

    const [revokeBusyId, setRevokeBusyId] = useState("");

    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        let stopped = false;

        const loadOrgs = async () => {
            if (!token) {
                setOrgsState("unauth");
                setOrgs([]);
                setSelectedOrgId("");
                return;
            }

            setOrgsState("loading");
            try {
                const res = await api.get("/orgs/mine");
                const list = Array.isArray(res?.data) ? res.data : [];
                if (stopped || !mountedRef.current) return;

                setOrgs(list);
                setOrgsState("loaded");

                if (list.length === 1) {
                    setSelectedOrgId(String(list[0]?.id || ""));
                }
            } catch (err) {
                if (stopped || !mountedRef.current) return;
                setOrgsState("error");
                setFlash(classifyError(err));
            }
        };

        loadOrgs();

        return () => {
            stopped = true;
        };
    }, [token]);

    const selectedOrg = useMemo(() => {
        const id = String(selectedOrgId || "");
        if (!id) return null;
        return (orgs || []).find((o) => String(o?.id || "") === id) || null;
    }, [orgs, selectedOrgId]);

    useEffect(() => {
        let stopped = false;

        const loadInvites = async () => {
            setInviteLink("");
            if (!token) return;
            if (!selectedOrgId) {
                setInvites([]);
                setInvitesTotal(0);
                setInvitesState("idle");
                return;
            }

            setInvitesState("loading");
            try {
                const res = await api.get(`/orgs/${selectedOrgId}/invites`);
                if (stopped || !mountedRef.current) return;

                const data = res?.data;
                const items = Array.isArray(data?.items) ? data.items : [];
                const total = Number.isFinite(Number(data?.total))
                    ? Number(data.total)
                    : items.length;

                setInvites(items);
                setInvitesTotal(total);
                setInvitesState("loaded");
            } catch (err) {
                if (stopped || !mountedRef.current) return;
                setInvitesState("error");
                setInvites([]);
                setInvitesTotal(0);
                setFlash(classifyError(err));
            }
        };

        loadInvites();

        return () => {
            stopped = true;
        };
    }, [token, selectedOrgId]);

    const handleCreateInvite = async (e) => {
        e?.preventDefault?.();
        if (!token) {
            setFlash({ type: "error", message: "צריך להתחבר" });
            return;
        }

        const normalized = normalizeEmail(email);
        if (!normalized) {
            setFlash({ type: "error", message: "אימייל לא תקין" });
            return;
        }
        if (!selectedOrgId) {
            setFlash({ type: "error", message: "בחר ארגון" });
            return;
        }

        setCreateBusy(true);
        setInviteLink("");
        try {
            const res = await api.post(`/orgs/${selectedOrgId}/invites`, {
                email: normalized,
            });

            const nextInviteLink =
                typeof res?.data?.inviteLink === "string"
                    ? res.data.inviteLink
                    : "";

            if (mountedRef.current) {
                setInviteLink(nextInviteLink);
                setEmail("");
                setFlash({ type: "success", message: "הזמנה נוצרה" });
            }

            try {
                if (mountedRef.current) {
                    const listRes = await api.get(
                        `/orgs/${selectedOrgId}/invites`,
                    );
                    const data = listRes?.data;
                    const items = Array.isArray(data?.items) ? data.items : [];
                    const total = Number.isFinite(Number(data?.total))
                        ? Number(data.total)
                        : items.length;
                    setInvites(items);
                    setInvitesTotal(total);
                    setInvitesState("loaded");
                }
            } catch {
                // Best-effort refetch; keep success flash.
            }
        } catch (err) {
            if (mountedRef.current) {
                setFlash(classifyError(err));
            }
        } finally {
            if (mountedRef.current) {
                setCreateBusy(false);
            }
        }
    };

    const handleRevoke = async (inviteId) => {
        const id = String(inviteId || "");
        if (!id) return;
        if (!token) {
            setFlash({ type: "error", message: "צריך להתחבר" });
            return;
        }
        if (!selectedOrgId) return;
        if (revokeBusyId) return;

        setRevokeBusyId(id);
        try {
            await api.post(`/orgs/${selectedOrgId}/invites/${id}/revoke`, {});

            if (mountedRef.current) {
                setFlash({ type: "success", message: "ההזמנה בוטלה" });
            }

            const res = await api.get(`/orgs/${selectedOrgId}/invites`);
            if (!mountedRef.current) return;
            const data = res?.data;
            const items = Array.isArray(data?.items) ? data.items : [];
            const total = Number.isFinite(Number(data?.total))
                ? Number(data.total)
                : items.length;
            setInvites(items);
            setInvitesTotal(total);
            setInvitesState("loaded");
        } catch (err) {
            if (mountedRef.current) {
                setFlash(classifyError(err));
            }
        } finally {
            if (mountedRef.current) {
                setRevokeBusyId("");
            }
        }
    };

    const renderOrgPicker = () => {
        if (orgsState === "unauth") {
            return (
                <div className={styles.hint}>צריך להתחבר כדי לנהל הזמנות</div>
            );
        }

        if (orgsState === "loading") {
            return <div className={styles.hint}>טוען ארגונים…</div>;
        }

        if (orgsState === "error") {
            return <div className={styles.hint}>לא הצלחנו לטעון ארגונים</div>;
        }

        if (!orgs || orgs.length === 0) {
            return <div className={styles.hint}>אין ארגונים זמינים</div>;
        }

        if (orgs.length === 1) {
            const o = orgs[0];
            return (
                <div className={styles.orgSingle}>
                    <span className={styles.orgLabel}>ארגון:</span>
                    <span className={styles.orgValue}>
                        {String(o?.name || o?.slug || "")}
                    </span>
                </div>
            );
        }

        return (
            <label className={styles.orgPicker}>
                <span className={styles.orgLabel}>ארגון</span>
                <select
                    className={styles.select}
                    value={selectedOrgId}
                    onChange={(e) => setSelectedOrgId(e.target.value)}
                    aria-label="Organization"
                >
                    <option value="">בחר…</option>
                    {(orgs || []).map((o) => (
                        <option
                            key={String(o?.id || "")}
                            value={String(o?.id || "")}
                        >
                            {String(o?.name || o?.slug || "")}
                        </option>
                    ))}
                </select>
            </label>
        );
    };

    const renderInvites = () => {
        if (!selectedOrgId) {
            return (
                <div className={styles.hint}>בחר ארגון כדי לראות הזמנות</div>
            );
        }

        if (invitesState === "loading") {
            return <div className={styles.hint}>טוען הזמנות…</div>;
        }

        if (invitesState === "error") {
            return <div className={styles.hint}>לא הצלחנו לטעון הזמנות</div>;
        }

        return (
            <div className={styles.list}>
                <div className={styles.listHeader}>
                    <div className={styles.listTitle}>הזמנות</div>
                    <div className={styles.listMeta}>סה״כ: {invitesTotal}</div>
                </div>

                {invites && invites.length ? (
                    <div
                        className={styles.table}
                        role="table"
                        aria-label="Invites"
                    >
                        <div className={styles.rowHead} role="row">
                            <div
                                className={styles.cellEmail}
                                role="columnheader"
                            >
                                אימייל
                            </div>
                            <div
                                className={styles.cellStatus}
                                role="columnheader"
                            >
                                סטטוס
                            </div>
                            <div
                                className={styles.cellActions}
                                role="columnheader"
                            >
                                פעולה
                            </div>
                        </div>

                        {invites.map((i) => {
                            const id = String(i?.id || "");
                            const isRevoked = Boolean(i?.revokedAt);
                            const isUsed = Boolean(i?.usedAt);
                            const isActive = !isRevoked && !isUsed;
                            const statusText = isRevoked
                                ? "בוטלה"
                                : isUsed
                                  ? "נוצלה"
                                  : "פעילה";

                            return (
                                <div key={id} className={styles.row} role="row">
                                    <div
                                        className={styles.cellEmail}
                                        role="cell"
                                    >
                                        {String(i?.email || "")}
                                    </div>
                                    <div
                                        className={styles.cellStatus}
                                        role="cell"
                                    >
                                        {statusText}
                                    </div>
                                    <div
                                        className={styles.cellActions}
                                        role="cell"
                                    >
                                        <Button
                                            variant="secondary"
                                            size="small"
                                            disabled={!isActive}
                                            loading={revokeBusyId === id}
                                            onClick={() => handleRevoke(id)}
                                        >
                                            בטל
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className={styles.hint}>אין הזמנות</div>
                )}
            </div>
        );
    };

    return (
        <main className={styles.main} dir="rtl">
            <div className={styles.container}>
                <h1 className={styles.title}>הזמנות לארגון</h1>

                {flash ? (
                    <div className={styles.flash}>
                        <FlashBanner
                            type={flash.type}
                            message={flash.message}
                            onDismiss={() => setFlash(null)}
                        />
                    </div>
                ) : null}

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>ארגון</h2>
                    {renderOrgPicker()}
                    {selectedOrg?.myRole && selectedOrg.myRole !== "admin" ? (
                        <div className={styles.hint}>
                            הרשאות: {String(selectedOrg.myRole)}
                        </div>
                    ) : null}
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>יצירת הזמנה</h2>
                    <form className={styles.form} onSubmit={handleCreateInvite}>
                        <label className={styles.field}>
                            <span className={styles.fieldLabel}>אימייל</span>
                            <input
                                className={styles.input}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@example.com"
                                inputMode="email"
                                autoComplete="email"
                            />
                        </label>

                        <Button
                            type="submit"
                            variant="primary"
                            loading={createBusy}
                            disabled={!selectedOrgId}
                        >
                            צור הזמנה
                        </Button>
                    </form>

                    {inviteLink ? (
                        <div className={styles.inviteLinkWrap}>
                            <div className={styles.inviteLinkLabel}>
                                קישור הזמנה
                            </div>
                            <div className={styles.inviteLinkValue} dir="ltr">
                                {inviteLink}
                            </div>
                        </div>
                    ) : null}
                </section>

                <section className={styles.section}>{renderInvites()}</section>
            </div>
        </main>
    );
}
