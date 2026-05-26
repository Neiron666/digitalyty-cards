import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { u as useAuth, x as getHasOrgAdmin, S as SeoHelmet, F as FlashBanner, B as Button, a as api } from "../entry-server.js";
import "react-dom/server";
import "./vendor-epyEJgau.js";
import "react-fast-compare";
import "invariant";
import "shallowequal";
import "axios";
const main = "_main_1qhms_1";
const container = "_container_1qhms_9";
const title = "_title_1qhms_25";
const flash = "_flash_1qhms_33";
const section = "_section_1qhms_43";
const sectionTitle = "_sectionTitle_1qhms_55";
const hint = "_hint_1qhms_63";
const orgSingle = "_orgSingle_1qhms_71";
const orgPicker = "_orgPicker_1qhms_87";
const orgLabel = "_orgLabel_1qhms_101";
const orgValue = "_orgValue_1qhms_109";
const select = "_select_1qhms_117";
const form = "_form_1qhms_129";
const field = "_field_1qhms_145";
const fieldLabel = "_fieldLabel_1qhms_161";
const input = "_input_1qhms_169";
const inviteLinkWrap = "_inviteLinkWrap_1qhms_181";
const inviteLinkLabel = "_inviteLinkLabel_1qhms_193";
const inviteLinkValue = "_inviteLinkValue_1qhms_201";
const list = "_list_1qhms_219";
const listHeader = "_listHeader_1qhms_231";
const listTitle = "_listTitle_1qhms_249";
const listMeta = "_listMeta_1qhms_257";
const table = "_table_1qhms_265";
const rowHead = "_rowHead_1qhms_277";
const row = "_row_1qhms_277";
const cellEmail = "_cellEmail_1qhms_303";
const cellStatus = "_cellStatus_1qhms_311";
const cellActions = "_cellActions_1qhms_319";
const styles = {
  main,
  container,
  title,
  flash,
  section,
  sectionTitle,
  hint,
  orgSingle,
  orgPicker,
  orgLabel,
  orgValue,
  select,
  form,
  field,
  fieldLabel,
  input,
  inviteLinkWrap,
  inviteLinkLabel,
  inviteLinkValue,
  list,
  listHeader,
  listTitle,
  listMeta,
  table,
  rowHead,
  row,
  cellEmail,
  cellStatus,
  cellActions
};
function normalizeEmail(value) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}
function classifyError(err) {
  const status = err?.response?.status;
  const code = err?.response?.data?.code;
  const apiMessage = typeof err?.response?.data?.message === "string" ? err.response.data.message.trim() : "";
  if (status === 401) {
    return { type: "error", message: "צריך להתחבר" };
  }
  if (status === 403 || status === 404) {
    return {
      type: "error",
      message: "אין גישה או שהמשאב לא זמין"
    };
  }
  if (status === 400) {
    if (code === "INVALID_EMAIL") {
      return { type: "error", message: "אימייל לא תקין" };
    }
    return { type: "error", message: "בקשה לא תקינה" };
  }
  if (status === 409 && code === "SEAT_LIMIT_REACHED") {
    return {
      type: "error",
      message: apiMessage || "הגעת למגבלת המושבים / Seat limit reached"
    };
  }
  if (status && status >= 500) {
    return { type: "error", message: "שגיאת שרת" };
  }
  return { type: "error", message: "שגיאה" };
}
function OrgInvites() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [gateState, setGateState] = useState(
    isAuthenticated ? "checking" : "unauth"
  );
  const [gateAllowed, setGateAllowed] = useState(false);
  const [flash2, setFlash] = useState(null);
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
    if (!isAuthenticated) {
      setGateAllowed(false);
      setGateState("unauth");
      return;
    }
    const controller = new AbortController();
    let alive = true;
    setGateAllowed(false);
    setGateState("checking");
    (async () => {
      const ok = await getHasOrgAdmin({
        userId: user?.email,
        signal: controller.signal
      });
      if (!alive || !mountedRef.current) return;
      if (!ok) {
        setGateState("denied");
        navigate("/edit", { replace: true });
        return;
      }
      setGateAllowed(true);
      setGateState("allowed");
    })();
    return () => {
      alive = false;
      controller.abort();
    };
  }, [navigate, isAuthenticated, user?.email]);
  useEffect(() => {
    let stopped = false;
    const loadOrgs = async () => {
      if (!isAuthenticated) {
        setOrgsState("unauth");
        setOrgs([]);
        setSelectedOrgId("");
        return;
      }
      if (!gateAllowed) {
        return;
      }
      setOrgsState("loading");
      try {
        const res = await api.get("/orgs/mine");
        const list2 = Array.isArray(res?.data) ? res.data : [];
        if (stopped || !mountedRef.current) return;
        setOrgs(list2);
        setOrgsState("loaded");
        if (list2.length === 1) {
          setSelectedOrgId(String(list2[0]?.id || ""));
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
  }, [gateAllowed, isAuthenticated]);
  const selectedOrg = useMemo(() => {
    const id = String(selectedOrgId || "");
    if (!id) return null;
    return (orgs || []).find((o) => String(o?.id || "") === id) || null;
  }, [orgs, selectedOrgId]);
  const seatLimitRaw = selectedOrg?.seatLimit;
  const hasSeatLimit = seatLimitRaw !== null && seatLimitRaw !== void 0 && Number.isFinite(Number(seatLimitRaw));
  const seatLimit = hasSeatLimit ? Number(seatLimitRaw) : null;
  const usedSeats = Number(selectedOrg?.usedSeats ?? 0);
  const remainingSeats = hasSeatLimit ? Math.max(0, seatLimit - usedSeats) : null;
  const breakdown = selectedOrg?.usedSeatsBreakdown;
  const breakdownActive = Number(breakdown?.activeMemberships ?? 0);
  const breakdownPending = Number(breakdown?.pendingInvites ?? 0);
  const hasBreakdown = Boolean(
    breakdown && (breakdown.activeMemberships !== void 0 || breakdown.pendingInvites !== void 0)
  );
  useEffect(() => {
    let stopped = false;
    const loadInvites = async () => {
      setInviteLink("");
      if (!isAuthenticated) return;
      if (!gateAllowed) return;
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
        const total = Number.isFinite(Number(data?.total)) ? Number(data.total) : items.length;
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
  }, [gateAllowed, isAuthenticated, selectedOrgId]);
  const handleCreateInvite = async (e) => {
    e?.preventDefault?.();
    if (!isAuthenticated) {
      setFlash({ type: "error", message: "צריך להתחבר" });
      return;
    }
    if (!gateAllowed) {
      setFlash({ type: "error", message: "אין גישה או שהמשאב לא זמין" });
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
        email: normalized
      });
      const nextInviteLink = typeof res?.data?.inviteLink === "string" ? res.data.inviteLink : "";
      if (mountedRef.current) {
        setInviteLink(nextInviteLink);
        setEmail("");
        setFlash({ type: "success", message: "הזמנה נוצרה" });
      }
      try {
        if (mountedRef.current) {
          const listRes = await api.get(
            `/orgs/${selectedOrgId}/invites`
          );
          const data = listRes?.data;
          const items = Array.isArray(data?.items) ? data.items : [];
          const total = Number.isFinite(Number(data?.total)) ? Number(data.total) : items.length;
          setInvites(items);
          setInvitesTotal(total);
          setInvitesState("loaded");
        }
      } catch {
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
    if (!isAuthenticated) {
      setFlash({ type: "error", message: "צריך להתחבר" });
      return;
    }
    if (!gateAllowed) {
      setFlash({ type: "error", message: "אין גישה או שהמשאב לא זמין" });
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
      const total = Number.isFinite(Number(data?.total)) ? Number(data.total) : items.length;
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
      return /* @__PURE__ */ jsx("div", { className: styles.hint, children: "צריך להתחבר כדי לנהל הזמנות" });
    }
    if (orgsState === "loading") {
      return /* @__PURE__ */ jsx("div", { className: styles.hint, children: "טוען ארגונים…" });
    }
    if (orgsState === "error") {
      return /* @__PURE__ */ jsx("div", { className: styles.hint, children: "לא הצלחנו לטעון ארגונים" });
    }
    if (!orgs || orgs.length === 0) {
      return /* @__PURE__ */ jsx("div", { className: styles.hint, children: "אין ארגונים זמינים" });
    }
    if (orgs.length === 1) {
      const o = orgs[0];
      return /* @__PURE__ */ jsxs("div", { className: styles.orgSingle, children: [
        /* @__PURE__ */ jsx("span", { className: styles.orgLabel, children: "ארגון:" }),
        /* @__PURE__ */ jsx("span", { className: styles.orgValue, children: String(o?.name || o?.slug || "") })
      ] });
    }
    return /* @__PURE__ */ jsxs("label", { className: styles.orgPicker, children: [
      /* @__PURE__ */ jsx("span", { className: styles.orgLabel, children: "ארגון" }),
      /* @__PURE__ */ jsxs(
        "select",
        {
          className: styles.select,
          value: selectedOrgId,
          onChange: (e) => setSelectedOrgId(e.target.value),
          "aria-label": "Organization",
          children: [
            /* @__PURE__ */ jsx("option", { value: "", children: "בחר…" }),
            (orgs || []).map((o) => /* @__PURE__ */ jsx(
              "option",
              {
                value: String(o?.id || ""),
                children: String(o?.name || o?.slug || "")
              },
              String(o?.id || "")
            ))
          ]
        }
      )
    ] });
  };
  const renderInvites = () => {
    if (!selectedOrgId) {
      return /* @__PURE__ */ jsx("div", { className: styles.hint, children: "בחר ארגון כדי לראות הזמנות" });
    }
    if (invitesState === "loading") {
      return /* @__PURE__ */ jsx("div", { className: styles.hint, children: "טוען הזמנות…" });
    }
    if (invitesState === "error") {
      return /* @__PURE__ */ jsx("div", { className: styles.hint, children: "לא הצלחנו לטעון הזמנות" });
    }
    return /* @__PURE__ */ jsxs("div", { className: styles.list, children: [
      /* @__PURE__ */ jsxs("div", { className: styles.listHeader, children: [
        /* @__PURE__ */ jsx("div", { className: styles.listTitle, children: "הזמנות" }),
        /* @__PURE__ */ jsxs("div", { className: styles.listMeta, children: [
          "סה״כ: ",
          invitesTotal
        ] })
      ] }),
      invites && invites.length ? /* @__PURE__ */ jsxs(
        "div",
        {
          className: styles.table,
          role: "table",
          "aria-label": "Invites",
          children: [
            /* @__PURE__ */ jsxs("div", { className: styles.rowHead, role: "row", children: [
              /* @__PURE__ */ jsx(
                "div",
                {
                  className: styles.cellEmail,
                  role: "columnheader",
                  children: "אימייל"
                }
              ),
              /* @__PURE__ */ jsx(
                "div",
                {
                  className: styles.cellStatus,
                  role: "columnheader",
                  children: "סטטוס"
                }
              ),
              /* @__PURE__ */ jsx(
                "div",
                {
                  className: styles.cellActions,
                  role: "columnheader",
                  children: "פעולה"
                }
              )
            ] }),
            invites.map((i) => {
              const id = String(i?.id || "");
              const isRevoked = Boolean(i?.revokedAt);
              const isUsed = Boolean(i?.usedAt);
              const isActive = !isRevoked && !isUsed;
              const statusText = isRevoked ? "בוטלה" : isUsed ? "נוצלה" : "פעילה";
              return /* @__PURE__ */ jsxs("div", { className: styles.row, role: "row", children: [
                /* @__PURE__ */ jsx(
                  "div",
                  {
                    className: styles.cellEmail,
                    role: "cell",
                    children: String(i?.email || "")
                  }
                ),
                /* @__PURE__ */ jsx(
                  "div",
                  {
                    className: styles.cellStatus,
                    role: "cell",
                    children: statusText
                  }
                ),
                /* @__PURE__ */ jsx(
                  "div",
                  {
                    className: styles.cellActions,
                    role: "cell",
                    children: /* @__PURE__ */ jsx(
                      Button,
                      {
                        variant: "secondary",
                        size: "small",
                        disabled: !isActive,
                        loading: revokeBusyId === id,
                        onClick: () => handleRevoke(id),
                        children: "בטל"
                      }
                    )
                  }
                )
              ] }, id);
            })
          ]
        }
      ) : /* @__PURE__ */ jsx("div", { className: styles.hint, children: "אין הזמנות" })
    ] });
  };
  if (isAuthenticated && gateState === "checking") {
    return /* @__PURE__ */ jsxs("main", { className: styles.main, dir: "rtl", children: [
      /* @__PURE__ */ jsx(SeoHelmet, { robots: "noindex, nofollow" }),
      /* @__PURE__ */ jsxs("div", { className: styles.container, children: [
        /* @__PURE__ */ jsx("h1", { className: styles.title, children: "הזמנות לארגון" }),
        /* @__PURE__ */ jsx("div", { className: styles.hint, children: "טוען…" })
      ] })
    ] });
  }
  return /* @__PURE__ */ jsxs("main", { className: styles.main, dir: "rtl", children: [
    /* @__PURE__ */ jsx(SeoHelmet, { robots: "noindex, nofollow" }),
    /* @__PURE__ */ jsxs("div", { className: styles.container, children: [
      /* @__PURE__ */ jsx("h1", { className: styles.title, children: "הזמנות לארגון" }),
      flash2 ? /* @__PURE__ */ jsx("div", { className: styles.flash, children: /* @__PURE__ */ jsx(
        FlashBanner,
        {
          type: flash2.type,
          message: flash2.message,
          onDismiss: () => setFlash(null)
        }
      ) }) : null,
      /* @__PURE__ */ jsxs("section", { className: styles.section, children: [
        /* @__PURE__ */ jsx("h2", { className: styles.sectionTitle, children: "ארגון" }),
        renderOrgPicker(),
        selectedOrg ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs("div", { className: styles.hint, children: [
            "Seats: ",
            usedSeats,
            "/",
            hasSeatLimit ? seatLimit : "∞",
            hasSeatLimit ? ` (left: ${remainingSeats})` : ""
          ] }),
          !hasSeatLimit ? /* @__PURE__ */ jsx("div", { className: styles.hint, children: "Seat limit not set" }) : null,
          hasBreakdown ? /* @__PURE__ */ jsxs("div", { className: styles.hint, children: [
            "Breakdown: ",
            breakdownActive,
            " active +",
            " ",
            breakdownPending,
            " pending"
          ] }) : null
        ] }) : null,
        selectedOrg?.myRole && selectedOrg.myRole !== "admin" ? /* @__PURE__ */ jsxs("div", { className: styles.hint, children: [
          "הרשאות: ",
          String(selectedOrg.myRole)
        ] }) : null
      ] }),
      /* @__PURE__ */ jsxs("section", { className: styles.section, children: [
        /* @__PURE__ */ jsx("h2", { className: styles.sectionTitle, children: "יצירת הזמנה" }),
        /* @__PURE__ */ jsxs("form", { className: styles.form, onSubmit: handleCreateInvite, children: [
          /* @__PURE__ */ jsxs("label", { className: styles.field, children: [
            /* @__PURE__ */ jsx("span", { className: styles.fieldLabel, children: "אימייל" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                className: styles.input,
                value: email,
                onChange: (e) => setEmail(e.target.value),
                placeholder: "name@example.com",
                inputMode: "email",
                autoComplete: "email"
              }
            )
          ] }),
          /* @__PURE__ */ jsx(
            Button,
            {
              type: "submit",
              variant: "primary",
              loading: createBusy,
              disabled: !selectedOrgId,
              children: "צור הזמנה"
            }
          )
        ] }),
        inviteLink ? /* @__PURE__ */ jsxs("div", { className: styles.inviteLinkWrap, children: [
          /* @__PURE__ */ jsx("div", { className: styles.inviteLinkLabel, children: "קישור הזמנה" }),
          /* @__PURE__ */ jsx("div", { className: styles.inviteLinkValue, dir: "ltr", children: inviteLink })
        ] }) : null
      ] }),
      /* @__PURE__ */ jsx("section", { className: styles.section, children: renderInvites() })
    ] })
  ] });
}
export {
  OrgInvites as default
};
