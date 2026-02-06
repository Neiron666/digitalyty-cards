import { useEffect, useMemo, useRef, useState } from "react";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import FlashBanner from "../../components/ui/FlashBanner/FlashBanner";
import {
    addAdminOrgMember,
    createAdminOrgInvite,
    createAdminOrganization,
    deleteAdminOrgMember,
    getAdminOrganizationById,
    listAdminOrgMembers,
    listAdminOrganizations,
    patchAdminOrgMember,
    patchAdminOrganization,
} from "../../services/admin.service";
import styles from "./AdminOrganizationsView.module.css";

function safeString(value) {
    if (value === null || value === undefined) return "";
    return String(value);
}

function clampInt(value, { min, max, fallback }) {
    const n = Number.parseInt(String(value), 10);
    if (!Number.isFinite(n)) return fallback;
    if (n < min) return min;
    if (n > max) return max;
    return n;
}

function mapAdminApiError(err) {
    const status = err?.response?.status;
    const code = err?.response?.data?.code;

    if (status === 409 && code === "ORG_SLUG_TAKEN") return "הסלאג כבר תפוס.";
    if (status === 409 && code === "MEMBER_EXISTS")
        return "החבר כבר קיים בארגון.";
    if (status === 404 && code === "USER_NOT_FOUND") return "המשתמש לא נמצא.";
    if (status === 400 && code === "INVALID_SLUG") return "סלאג לא תקין.";
    if (status === 400 && code === "RESERVED_SLUG")
        return "הסלאג שמור ואסור לשימוש.";
    if (status === 400 && code === "SLUG_IMMUTABLE")
        return "אי אפשר לשנות סלאג לאחר יצירה.";
    if (status === 400 && code === "INVALID_NAME") return "שם לא תקין.";
    if (status === 400 && code === "INVALID_EMAIL") return "אימייל לא תקין.";
    if (status === 400 && code === "INVALID_USER_ID") return "UserId לא תקין.";
    if (status === 400 && code === "INVALID_ROLE") return "Role לא תקין.";
    if (status === 400 && code === "INVALID_STATUS") return "Status לא תקין.";
    if (status === 400 && (code === "EMPTY_PATCH" || code === "INVALID_PATCH"))
        return "אין מה לעדכן.";

    if (status === 401) return "נדרשת התחברות.";
    if (status === 403) return "אין הרשאות.";

    return "אירעה שגיאה. נסה שוב.";
}

function OrgRow({ org, onSelect, onToggleActive, busy }) {
    const isActive = Boolean(org?.isActive);
    return (
        <tr className={styles.row}>
            <td className={styles.cellMono}>{org?.slug}</td>
            <td className={styles.cell}>{org?.name}</td>
            <td className={styles.cell}>{isActive ? "כן" : "לא"}</td>
            <td className={styles.cellActions}>
                <Button
                    onClick={() => onSelect(org)}
                    disabled={busy}
                    variant="secondary"
                >
                    פרטים
                </Button>
                <Button
                    onClick={() => onToggleActive(org)}
                    disabled={busy}
                    variant={isActive ? "danger" : "primary"}
                >
                    {isActive ? "כבה" : "הפעל"}
                </Button>
            </td>
        </tr>
    );
}

export default function AdminOrganizationsView() {
    const [flash, setFlash] = useState(null);

    const [q, setQ] = useState("");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(25);

    const [orgs, setOrgs] = useState([]);
    const [orgsTotal, setOrgsTotal] = useState(0);
    const [orgsLoading, setOrgsLoading] = useState(false);

    const [createName, setCreateName] = useState("");
    const [createSlug, setCreateSlug] = useState("");
    const [createNote, setCreateNote] = useState("");
    const [createBusy, setCreateBusy] = useState(false);

    const [selectedOrgId, setSelectedOrgId] = useState(null);
    const [selectedOrg, setSelectedOrg] = useState(null);
    const [selectedBusy, setSelectedBusy] = useState(false);

    const [members, setMembers] = useState([]);
    const [membersTotal, setMembersTotal] = useState(0);
    const [membersPage, setMembersPage] = useState(1);
    const [membersLimit, setMembersLimit] = useState(25);
    const [membersLoading, setMembersLoading] = useState(false);

    const [addUserId, setAddUserId] = useState("");
    const [addEmail, setAddEmail] = useState("");
    const [addRole, setAddRole] = useState("member");
    const [addBusy, setAddBusy] = useState(false);

    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("member");
    const [inviteBusy, setInviteBusy] = useState(false);
    const [inviteLink, setInviteLink] = useState("");

    const [memberBusyId, setMemberBusyId] = useState(null);

    const flashTimerRef = useRef(null);

    function showFlash(type, text) {
        if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
        setFlash({ type, text });
        flashTimerRef.current = setTimeout(() => setFlash(null), 3500);
    }

    const safeLimit = useMemo(() => {
        return clampInt(limit, { min: 1, max: 100, fallback: 25 });
    }, [limit]);

    async function loadOrgs() {
        setOrgsLoading(true);
        try {
            const res = await listAdminOrganizations({
                q: q.trim() || undefined,
                page,
                limit: safeLimit,
            });
            const data = res?.data || {};
            setOrgs(Array.isArray(data.items) ? data.items : []);
            setOrgsTotal(Number(data.total) || 0);
        } catch (err) {
            showFlash("error", mapAdminApiError(err));
        } finally {
            setOrgsLoading(false);
        }
    }

    async function loadSelectedOrgAndMembers(nextOrgId) {
        const orgId = String(nextOrgId || "");
        if (!orgId) return;

        setSelectedBusy(true);
        setMembersLoading(true);
        try {
            const [orgRes, membersRes] = await Promise.all([
                getAdminOrganizationById(orgId),
                listAdminOrgMembers(orgId, {
                    page: membersPage,
                    limit: membersLimit,
                }),
            ]);

            setSelectedOrgId(orgId);
            setSelectedOrg(orgRes?.data || null);

            const m = membersRes?.data || {};
            setMembers(Array.isArray(m.items) ? m.items : []);
            setMembersTotal(Number(m.total) || 0);
        } catch (err) {
            showFlash("error", mapAdminApiError(err));
        } finally {
            setSelectedBusy(false);
            setMembersLoading(false);
        }
    }

    useEffect(() => {
        loadOrgs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, safeLimit]);

    useEffect(() => {
        if (!selectedOrgId) return;
        loadSelectedOrgAndMembers(selectedOrgId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedOrgId, membersPage, membersLimit]);

    useEffect(() => {
        setInviteEmail("");
        setInviteRole("member");
        setInviteLink("");
    }, [selectedOrgId]);

    async function handleSearchSubmit(e) {
        e.preventDefault();
        setPage(1);
        await loadOrgs();
    }

    async function handleCreateOrg(e) {
        e.preventDefault();
        setCreateBusy(true);
        try {
            const res = await createAdminOrganization({
                name: createName,
                slug: createSlug,
                note: createNote,
            });
            const created = res?.data || null;
            showFlash("success", "הארגון נוצר.");
            setCreateName("");
            setCreateSlug("");
            setCreateNote("");
            setPage(1);
            await loadOrgs();
            if (created?.id) {
                setSelectedOrgId(String(created.id));
            }
        } catch (err) {
            showFlash("error", mapAdminApiError(err));
        } finally {
            setCreateBusy(false);
        }
    }

    async function handleToggleActive(org) {
        const id = org?.id;
        if (!id) return;
        setSelectedBusy(true);
        try {
            await patchAdminOrganization(id, { isActive: !org.isActive });
            await loadOrgs();
            if (selectedOrgId === String(id)) {
                await loadSelectedOrgAndMembers(id);
            }
        } catch (err) {
            showFlash("error", mapAdminApiError(err));
        } finally {
            setSelectedBusy(false);
        }
    }

    async function handleSelectOrg(org) {
        const id = org?.id;
        if (!id) return;
        setMembersPage(1);
        setMembersLimit(25);
        await loadSelectedOrgAndMembers(id);
    }

    async function handleUpdateOrgNote() {
        if (!selectedOrgId) return;
        setSelectedBusy(true);
        try {
            const res = await patchAdminOrganization(selectedOrgId, {
                note: safeString(selectedOrg?.note),
            });
            setSelectedOrg(res?.data || null);
            showFlash("success", "עודכן.");
            await loadOrgs();
        } catch (err) {
            showFlash("error", mapAdminApiError(err));
        } finally {
            setSelectedBusy(false);
        }
    }

    async function handleAddMember(e) {
        e.preventDefault();
        if (!selectedOrgId) return;

        setAddBusy(true);
        try {
            await addAdminOrgMember(selectedOrgId, {
                userId: addUserId.trim() || undefined,
                email: addEmail.trim() || undefined,
                role: addRole,
            });
            showFlash("success", "החבר נוסף.");
            setAddUserId("");
            setAddEmail("");
            setAddRole("member");
            await loadSelectedOrgAndMembers(selectedOrgId);
        } catch (err) {
            showFlash("error", mapAdminApiError(err));
        } finally {
            setAddBusy(false);
        }
    }

    async function handleMemberRoleChange(member, nextRole) {
        if (!selectedOrgId || !member?.id) return;
        setMemberBusyId(member.id);
        try {
            await patchAdminOrgMember(selectedOrgId, member.id, {
                role: nextRole,
            });
            await loadSelectedOrgAndMembers(selectedOrgId);
        } catch (err) {
            showFlash("error", mapAdminApiError(err));
        } finally {
            setMemberBusyId(null);
        }
    }

    async function handleMemberStatusToggle(member) {
        if (!selectedOrgId || !member?.id) return;
        setMemberBusyId(member.id);
        try {
            const next = member.status === "inactive" ? "active" : "inactive";
            await patchAdminOrgMember(selectedOrgId, member.id, {
                status: next,
            });
            await loadSelectedOrgAndMembers(selectedOrgId);
        } catch (err) {
            showFlash("error", mapAdminApiError(err));
        } finally {
            setMemberBusyId(null);
        }
    }

    async function handleMemberDelete(member) {
        if (!selectedOrgId || !member?.id) return;
        setMemberBusyId(member.id);
        try {
            await deleteAdminOrgMember(selectedOrgId, member.id);
            showFlash("success", "החבר הוסר.");
            await loadSelectedOrgAndMembers(selectedOrgId);
        } catch (err) {
            showFlash("error", mapAdminApiError(err));
        } finally {
            setMemberBusyId(null);
        }
    }

    async function handleCreateInvite(e) {
        e.preventDefault();
        if (!selectedOrgId) return;

        setInviteBusy(true);
        setInviteLink("");
        try {
            const res = await createAdminOrgInvite(selectedOrgId, {
                email: inviteEmail.trim(),
                role: inviteRole,
            });

            const link = String(res?.data?.inviteLink || "").trim();
            if (link) {
                setInviteLink(link);
                showFlash("success", "ההזמנה נוצרה.");
            } else {
                showFlash("error", "אירעה שגיאה. נסה שוב.");
            }
        } catch (err) {
            showFlash("error", mapAdminApiError(err));
        } finally {
            setInviteBusy(false);
        }
    }

    return (
        <div className={styles.wrap} dir="rtl">
            {flash ? (
                <FlashBanner
                    type={flash.type}
                    message={flash.text}
                    onClose={() => setFlash(null)}
                />
            ) : null}

            <div className={styles.grid}>
                <section className={styles.panel}>
                    <h2 className={styles.h2}>ארגונים</h2>

                    <form
                        className={styles.searchRow}
                        onSubmit={handleSearchSubmit}
                    >
                        <Input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="חפש לפי שם או סלאג"
                        />
                        <Button type="submit" disabled={orgsLoading}>
                            חפש
                        </Button>
                    </form>

                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>סלאג</th>
                                    <th>שם</th>
                                    <th>פעיל</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {orgs.map((org) => (
                                    <OrgRow
                                        key={org.id}
                                        org={org}
                                        onSelect={handleSelectOrg}
                                        onToggleActive={handleToggleActive}
                                        busy={orgsLoading || selectedBusy}
                                    />
                                ))}
                                {!orgs.length && !orgsLoading ? (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className={styles.empty}
                                        >
                                            אין ארגונים
                                        </td>
                                    </tr>
                                ) : null}
                            </tbody>
                        </table>
                    </div>

                    <div className={styles.pager}>
                        <div className={styles.pagerMeta}>
                            סה"כ: {orgsTotal}
                        </div>
                        <div className={styles.pagerControls}>
                            <Button
                                variant="secondary"
                                onClick={() =>
                                    setPage((p) => Math.max(1, p - 1))
                                }
                                disabled={orgsLoading || page <= 1}
                            >
                                הקודם
                            </Button>
                            <div className={styles.pagerPage}>עמוד {page}</div>
                            <Button
                                variant="secondary"
                                onClick={() => setPage((p) => p + 1)}
                                disabled={
                                    orgsLoading || orgs.length < safeLimit
                                }
                            >
                                הבא
                            </Button>
                        </div>
                        <div className={styles.pagerLimit}>
                            <label className={styles.limitLabel}>Limit</label>
                            <Input
                                value={String(limit)}
                                onChange={(e) => setLimit(e.target.value)}
                                inputMode="numeric"
                            />
                        </div>
                    </div>

                    <h3 className={styles.h3}>צור ארגון</h3>
                    <form className={styles.form} onSubmit={handleCreateOrg}>
                        <label className={styles.label}>שם</label>
                        <Input
                            value={createName}
                            onChange={(e) => setCreateName(e.target.value)}
                            placeholder="שם החברה"
                        />
                        <label className={styles.label}>סלאג</label>
                        <Input
                            value={createSlug}
                            onChange={(e) => setCreateSlug(e.target.value)}
                            placeholder="example-company"
                        />
                        <label className={styles.label}>הערה (אופציונלי)</label>
                        <Input
                            value={createNote}
                            onChange={(e) => setCreateNote(e.target.value)}
                            placeholder="note"
                        />
                        <Button type="submit" disabled={createBusy}>
                            צור
                        </Button>
                    </form>
                </section>

                <section className={styles.panel}>
                    <h2 className={styles.h2}>פרטי ארגון</h2>

                    {!selectedOrg ? (
                        <div className={styles.empty}>
                            בחר ארגון כדי לנהל חברים
                        </div>
                    ) : (
                        <>
                            <div className={styles.detailsGrid}>
                                <div className={styles.detailItem}>
                                    <div className={styles.detailLabel}>
                                        סלאג
                                    </div>
                                    <div className={styles.detailValueMono}>
                                        {selectedOrg.slug}
                                    </div>
                                </div>
                                <div className={styles.detailItem}>
                                    <div className={styles.detailLabel}>שם</div>
                                    <div className={styles.detailValue}>
                                        {selectedOrg.name}
                                    </div>
                                </div>
                                <div className={styles.detailItem}>
                                    <div className={styles.detailLabel}>
                                        פעיל
                                    </div>
                                    <div className={styles.detailValue}>
                                        {selectedOrg.isActive ? "כן" : "לא"}
                                    </div>
                                </div>
                            </div>

                            <div className={styles.noteBlock}>
                                <label className={styles.label}>הערה</label>
                                <Input
                                    value={safeString(selectedOrg.note)}
                                    onChange={(e) =>
                                        setSelectedOrg((prev) =>
                                            prev
                                                ? {
                                                      ...prev,
                                                      note: e.target.value,
                                                  }
                                                : prev,
                                        )
                                    }
                                    placeholder="internal note"
                                />
                                <Button
                                    onClick={handleUpdateOrgNote}
                                    disabled={selectedBusy}
                                    variant="secondary"
                                >
                                    שמור
                                </Button>
                            </div>

                            <h3 className={styles.h3}>חברים</h3>

                            <form
                                className={styles.memberForm}
                                onSubmit={handleAddMember}
                            >
                                <div className={styles.memberFormRow}>
                                    <div className={styles.memberCol}>
                                        <label className={styles.label}>
                                            UserId
                                        </label>
                                        <Input
                                            value={addUserId}
                                            onChange={(e) =>
                                                setAddUserId(e.target.value)
                                            }
                                            placeholder="ObjectId"
                                        />
                                    </div>
                                    <div className={styles.memberCol}>
                                        <label className={styles.label}>
                                            או Email
                                        </label>
                                        <Input
                                            value={addEmail}
                                            onChange={(e) =>
                                                setAddEmail(e.target.value)
                                            }
                                            placeholder="user@example.com"
                                        />
                                    </div>
                                </div>

                                <div className={styles.memberFormRow}>
                                    <div className={styles.memberCol}>
                                        <label className={styles.label}>
                                            Role
                                        </label>
                                        <select
                                            className={styles.select}
                                            value={addRole}
                                            onChange={(e) =>
                                                setAddRole(e.target.value)
                                            }
                                        >
                                            <option value="member">
                                                member
                                            </option>
                                            <option value="admin">admin</option>
                                        </select>
                                    </div>
                                    <div className={styles.memberColActions}>
                                        <Button
                                            type="submit"
                                            disabled={addBusy}
                                        >
                                            הוסף
                                        </Button>
                                    </div>
                                </div>
                            </form>

                            <h3 className={styles.h3}>הזמנות</h3>

                            <form
                                className={styles.memberForm}
                                onSubmit={handleCreateInvite}
                            >
                                <div className={styles.memberFormRow}>
                                    <div className={styles.memberCol}>
                                        <label className={styles.label}>
                                            Email
                                        </label>
                                        <Input
                                            value={inviteEmail}
                                            onChange={(e) =>
                                                setInviteEmail(e.target.value)
                                            }
                                            placeholder="user@example.com"
                                            required
                                        />
                                    </div>
                                    <div className={styles.memberCol}>
                                        <label className={styles.label}>
                                            Role
                                        </label>
                                        <select
                                            className={styles.select}
                                            value={inviteRole}
                                            onChange={(e) =>
                                                setInviteRole(e.target.value)
                                            }
                                        >
                                            <option value="member">
                                                member
                                            </option>
                                            <option value="admin">admin</option>
                                        </select>
                                    </div>
                                </div>

                                <div className={styles.memberFormRow}>
                                    <div className={styles.memberColActions}>
                                        <Button
                                            type="submit"
                                            disabled={
                                                inviteBusy ||
                                                !String(
                                                    inviteEmail || "",
                                                ).trim()
                                            }
                                        >
                                            Create invite
                                        </Button>
                                    </div>
                                </div>

                                {inviteLink ? (
                                    <div className={styles.memberCol}>
                                        <label className={styles.label}>
                                            Invite link
                                        </label>
                                        <div
                                            className={styles.detailValueMono}
                                            dir="ltr"
                                        >
                                            {inviteLink}
                                        </div>
                                    </div>
                                ) : null}
                            </form>

                            <div className={styles.tableWrap}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>Email</th>
                                            <th>Role</th>
                                            <th>Status</th>
                                            <th />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {members.map((m) => {
                                            const busy = memberBusyId === m.id;
                                            return (
                                                <tr
                                                    key={m.id}
                                                    className={styles.row}
                                                >
                                                    <td
                                                        className={
                                                            styles.cellMono
                                                        }
                                                    >
                                                        {m.email}
                                                    </td>
                                                    <td className={styles.cell}>
                                                        <select
                                                            className={
                                                                styles.selectInline
                                                            }
                                                            value={m.role}
                                                            onChange={(e) =>
                                                                handleMemberRoleChange(
                                                                    m,
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            disabled={busy}
                                                        >
                                                            <option value="member">
                                                                member
                                                            </option>
                                                            <option value="admin">
                                                                admin
                                                            </option>
                                                        </select>
                                                    </td>
                                                    <td className={styles.cell}>
                                                        <Button
                                                            variant="secondary"
                                                            onClick={() =>
                                                                handleMemberStatusToggle(
                                                                    m,
                                                                )
                                                            }
                                                            disabled={busy}
                                                        >
                                                            {m.status}
                                                        </Button>
                                                    </td>
                                                    <td
                                                        className={
                                                            styles.cellActions
                                                        }
                                                    >
                                                        <Button
                                                            variant="danger"
                                                            onClick={() =>
                                                                handleMemberDelete(
                                                                    m,
                                                                )
                                                            }
                                                            disabled={busy}
                                                        >
                                                            הסר
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })}

                                        {!members.length && !membersLoading ? (
                                            <tr>
                                                <td
                                                    colSpan={4}
                                                    className={styles.empty}
                                                >
                                                    אין חברים
                                                </td>
                                            </tr>
                                        ) : null}
                                    </tbody>
                                </table>
                            </div>

                            <div className={styles.pager}>
                                <div className={styles.pagerMeta}>
                                    סה"כ: {membersTotal}
                                </div>
                                <div className={styles.pagerControls}>
                                    <Button
                                        variant="secondary"
                                        onClick={() =>
                                            setMembersPage((p) =>
                                                Math.max(1, p - 1),
                                            )
                                        }
                                        disabled={
                                            membersLoading || membersPage <= 1
                                        }
                                    >
                                        הקודם
                                    </Button>
                                    <div className={styles.pagerPage}>
                                        עמוד {membersPage}
                                    </div>
                                    <Button
                                        variant="secondary"
                                        onClick={() =>
                                            setMembersPage((p) => p + 1)
                                        }
                                        disabled={
                                            membersLoading ||
                                            members.length <
                                                Number(membersLimit)
                                        }
                                    >
                                        הבא
                                    </Button>
                                </div>
                                <div className={styles.pagerLimit}>
                                    <label className={styles.limitLabel}>
                                        Limit
                                    </label>
                                    <Input
                                        value={String(membersLimit)}
                                        onChange={(e) =>
                                            setMembersLimit(
                                                clampInt(e.target.value, {
                                                    min: 1,
                                                    max: 100,
                                                    fallback: 25,
                                                }),
                                            )
                                        }
                                        inputMode="numeric"
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </section>
            </div>
        </div>
    );
}
