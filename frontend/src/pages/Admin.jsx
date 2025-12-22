import { useEffect, useMemo, useState } from "react";
import Page from "../components/page/Page";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";
import {
    adminDeactivateCard,
    adminExtendTrial,
    adminOverridePlan,
    adminReactivateCard,
    getAdminCardById,
    getAdminStats,
    listAdminCards,
    listAdminUsers,
} from "../services/admin.service";
import styles from "./Admin.module.css";

function isAccessDenied(err) {
    const status = err?.response?.status;
    return status === 401 || status === 403;
}

function formatDate(value) {
    if (!value) return "";
    try {
        return new Date(value).toLocaleString();
    } catch {
        return "";
    }
}

export default function Admin() {
    const { token } = useAuth();

    const [loading, setLoading] = useState(false);
    const [accessDenied, setAccessDenied] = useState(false);
    const [error, setError] = useState("");

    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [cards, setCards] = useState([]);

    const [selectedCardId, setSelectedCardId] = useState("");
    const [selectedCard, setSelectedCard] = useState(null);

    const [reason, setReason] = useState("");
    const [trialDays, setTrialDays] = useState("7");
    const [overridePlan, setOverridePlan] = useState("monthly");
    const [overrideUntil, setOverrideUntil] = useState("");

    const selectedCardOwner = useMemo(() => {
        if (!selectedCard) return "";
        if (selectedCard?.user) return "user";
        if (selectedCard?.anonymousId) return "anonymous";
        return "";
    }, [selectedCard]);

    async function loadAll() {
        setLoading(true);
        setError("");
        setAccessDenied(false);
        try {
            const [s, u, c] = await Promise.all([
                getAdminStats(),
                listAdminUsers(),
                listAdminCards(),
            ]);
            setStats(s.data);
            setUsers(u.data?.items || []);
            setCards(c.data?.items || []);
        } catch (err) {
            if (isAccessDenied(err)) {
                setAccessDenied(true);
            } else {
                setError(err?.response?.data?.message || "Failed to load admin data");
            }
        } finally {
            setLoading(false);
        }
    }

    async function loadCard(id) {
        setSelectedCardId(id);
        setSelectedCard(null);
        setError("");
        try {
            const res = await getAdminCardById(id);
            setSelectedCard(res.data);
        } catch (err) {
            if (isAccessDenied(err)) {
                setAccessDenied(true);
            } else {
                setError(err?.response?.data?.message || "Failed to load card");
            }
        }
    }

    function requireReason() {
        const r = String(reason || "").trim();
        if (!r) {
            setError("Reason is required");
            return null;
        }
        return r;
    }

    async function runAction(fn) {
        const r = requireReason();
        if (!r) return;

        setLoading(true);
        setError("");
        try {
            const card = await fn(r);
            setSelectedCard(card);
            await loadAll();
        } catch (err) {
            if (isAccessDenied(err)) {
                setAccessDenied(true);
            } else {
                setError(err?.response?.data?.message || "Action failed");
            }
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (!token) return;
        loadAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    if (!token) {
        return (
            <Page
                title="Admin"
                subtitle="Login is required to access admin panel."
            >
                <div className={styles.card}>
                    <p className={styles.muted}>Please login as an admin user.</p>
                </div>
            </Page>
        );
    }

    if (accessDenied) {
        return (
            <Page title="Admin" subtitle="Access denied">
                <div className={styles.card}>
                    <p className={styles.muted}>
                        Your user does not have admin permissions.
                    </p>
                </div>
            </Page>
        );
    }

    return (
        <Page title="Admin" subtitle="Secure admin cabinet">
            <div className={styles.grid}>
                <div className={styles.card}>
                    <h2>Stats</h2>
                    <p className={styles.muted}>
                        {stats
                            ? `Users: ${stats.users} · Cards: ${stats.cardsTotal} · Anonymous cards: ${stats.cardsAnonymous} · User cards: ${stats.cardsUserOwned} · Published: ${stats.publishedCards} · Active: ${stats.activeCards}`
                            : "No stats"}
                    </p>
                    <div style={{ marginTop: 12 }}>
                        <Button onClick={loadAll} loading={loading}>
                            Refresh
                        </Button>
                    </div>
                    {error && (
                        <p style={{ marginTop: 12, color: "var(--gold)" }}>
                            {error}
                        </p>
                    )}
                </div>

                <div className={styles.card}>
                    <h2>Selected card</h2>
                    {!selectedCard && (
                        <p className={styles.muted}>Select a card from the list.</p>
                    )}
                    {selectedCard && (
                        <div className={styles.actions}>
                            <div className={styles.muted}>
                                <div>Id: {selectedCard._id}</div>
                                <div>Slug: {selectedCard.slug || ""}</div>
                                <div>Status: {selectedCard.status || ""}</div>
                                <div>Active: {String(!!selectedCard.isActive)}</div>
                                <div>Owner: {selectedCardOwner}</div>
                                <div>
                                    Trial ends: {formatDate(selectedCard.trialEndsAt)}
                                </div>
                            </div>

                            <Input
                                label="Reason"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Required for any admin action"
                                required
                            />

                            <div className={styles.actionRow}>
                                {selectedCard.isActive ? (
                                    <Button
                                        variant="secondary"
                                        disabled={loading}
                                        onClick={() =>
                                            runAction(async (r) => {
                                                const res = await adminDeactivateCard(
                                                    selectedCard._id,
                                                    r
                                                );
                                                return res.data;
                                            })
                                        }
                                    >
                                        Deactivate card
                                    </Button>
                                ) : (
                                    <Button
                                        variant="secondary"
                                        disabled={loading}
                                        onClick={() =>
                                            runAction(async (r) => {
                                                const res = await adminReactivateCard(
                                                    selectedCard._id,
                                                    r
                                                );
                                                return res.data;
                                            })
                                        }
                                    >
                                        Reactivate card
                                    </Button>
                                )}
                            </div>

                            <div className={styles.actionRow}>
                                <div className={styles.inline}>
                                    <Input
                                        label="Extend trial (days)"
                                        type="number"
                                        value={trialDays}
                                        onChange={(e) => setTrialDays(e.target.value)}
                                        placeholder="1..14"
                                    />
                                    <Button
                                        variant="secondary"
                                        disabled={loading}
                                        onClick={() =>
                                            runAction(async (r) => {
                                                const days = Number.parseInt(
                                                    String(trialDays),
                                                    10
                                                );
                                                const res = await adminExtendTrial(
                                                    selectedCard._id,
                                                    { days, reason: r }
                                                );
                                                return res.data;
                                            })
                                        }
                                    >
                                        Extend
                                    </Button>
                                </div>
                            </div>

                            <div className={styles.actionRow}>
                                <div className={styles.inline}>
                                    <Input
                                        label="Override plan"
                                        value={overridePlan}
                                        onChange={(e) =>
                                            setOverridePlan(e.target.value)
                                        }
                                        placeholder="free | monthly | yearly"
                                    />
                                    <Input
                                        label="Override until"
                                        type="date"
                                        value={overrideUntil}
                                        onChange={(e) =>
                                            setOverrideUntil(e.target.value)
                                        }
                                        placeholder="YYYY-MM-DD"
                                    />
                                </div>
                                <Button
                                    variant="secondary"
                                    disabled={loading}
                                    onClick={() =>
                                        runAction(async (r) => {
                                            const until = overrideUntil
                                                ? new Date(
                                                      `${overrideUntil}T00:00:00.000Z`
                                                  ).toISOString()
                                                : "";
                                            const res = await adminOverridePlan(
                                                selectedCard._id,
                                                {
                                                    plan: String(
                                                        overridePlan || ""
                                                    ).trim(),
                                                    until,
                                                    reason: r,
                                                }
                                            );
                                            return res.data;
                                        })
                                    }
                                >
                                    Override
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                <div className={styles.card}>
                    <h2>Users</h2>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u) => (
                                <tr key={u._id}>
                                    <td>{u.email}</td>
                                    <td>{u.role}</td>
                                    <td>{formatDate(u.createdAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className={styles.card}>
                    <h2>Cards</h2>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Slug</th>
                                <th>Status</th>
                                <th>Active</th>
                                <th>Updated</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cards.map((c) => (
                                <tr key={c._id}>
                                    <td>
                                        <button
                                            className={styles.rowBtn}
                                            onClick={() => loadCard(c._id)}
                                            type="button"
                                            disabled={loading}
                                            title={c._id}
                                        >
                                            {c.slug || "(no slug)"}
                                        </button>
                                    </td>
                                    <td>{c.status}</td>
                                    <td>{String(!!c.isActive)}</td>
                                    <td>{formatDate(c.updatedAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {selectedCardId && !selectedCard && (
                        <p className={styles.muted} style={{ marginTop: 10 }}>
                            Loading card…
                        </p>
                    )}
                </div>
            </div>
        </Page>
    );
}
