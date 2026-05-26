import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { renderToString } from "react-dom/server";
import { useNavigate, Link, NavLink, useLocation, Outlet, useParams, useSearchParams, Navigate, createStaticHandler, createStaticRouter, StaticRouterProvider } from "react-router-dom";
import { H as Helmet, a as HelmetProvider } from "./assets/vendor-epyEJgau.js";
import { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback, useSyncExternalStore, Component, lazy, Suspense } from "react";
import axios from "axios";
import "react-fast-compare";
import "invariant";
import "shallowequal";
function normalizeApiBaseUrl(raw) {
  const v = String(raw).trim();
  if (!v) return "/api";
  const noTrailing = v.replace(/\/+$/, "");
  if (noTrailing.endsWith("/api")) return noTrailing;
  return `${noTrailing}/api`;
}
const api = axios.create({
  baseURL: normalizeApiBaseUrl(
    "http://localhost:5000/api"
  ),
  withCredentials: true
});
api.defaults.headers.common.Accept = "application/json";
api.defaults.headers.common["X-Requested-With"] = "XMLHttpRequest";
const ANON_STORAGE_KEY = "digitalyty_anon_id";
function safeGetLocalStorage() {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage || null;
  } catch {
    return null;
  }
}
function uuidV4() {
  try {
    const c = typeof crypto !== "undefined" ? crypto : null;
    if (c && typeof c.randomUUID === "function") return c.randomUUID();
  } catch {
  }
  let bytes;
  try {
    const c = typeof crypto !== "undefined" ? crypto : null;
    if (c && typeof c.getRandomValues === "function") {
      bytes = new Uint8Array(16);
      c.getRandomValues(bytes);
    }
  } catch {
  }
  if (!bytes) {
    bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i += 1)
      bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = bytes[6] & 15 | 64;
  bytes[8] = bytes[8] & 63 | 128;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    ""
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
    12,
    16
  )}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function getAnonymousId() {
  const ls = safeGetLocalStorage();
  if (!ls) return null;
  try {
    const v = ls.getItem(ANON_STORAGE_KEY);
    return v && String(v).trim() ? String(v) : null;
  } catch {
    return null;
  }
}
function ensureAnonymousId() {
  const ls = safeGetLocalStorage();
  if (!ls) return null;
  const existing = getAnonymousId();
  if (existing) return existing;
  const id = uuidV4();
  try {
    ls.setItem(ANON_STORAGE_KEY, id);
    return id;
  } catch {
    return null;
  }
}
function clearAnonymousId() {
  const ls = safeGetLocalStorage();
  if (!ls) return;
  try {
    ls.removeItem(ANON_STORAGE_KEY);
  } catch {
  }
}
api.interceptors.request.use((config) => {
  if (config?.data instanceof FormData) {
    config.headers = config.headers || {};
    delete config.headers["Content-Type"];
    delete config.headers["content-type"];
  }
  const headers = config.headers = config.headers || {};
  const authHeader = headers.Authorization || headers.authorization || api.defaults.headers.common.Authorization || api.defaults.headers.common.authorization;
  const existingAnon = getAnonymousId();
  const anonId = existingAnon || (!authHeader ? ensureAnonymousId() : null);
  if (anonId) headers["x-anonymous-id"] = anonId;
  return config;
});
const register = (email, firstName, password, consent, marketingConsent = false) => api.post("/auth/register", {
  email,
  firstName,
  password,
  consent,
  marketingConsent
});
const login = (email, password) => api.post("/auth/login", { email, password });
async function getMe(config = {}) {
  const res = await api.get("/auth/me", {
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache"
    },
    params: { _ts: Date.now() },
    signal: config.signal,
    timeout: config.timeout
  });
  return res.data;
}
const forgotPassword = (email) => api.post("/auth/forgot", { email });
const resetPassword = (token, password) => api.post("/auth/reset", { token, password });
const requestSignupLink = (email) => api.post("/auth/signup-link", { email });
const consumeSignupToken = (token, firstName, password, consent, marketingConsent = false) => api.post("/auth/signup-consume", {
  token,
  firstName,
  password,
  consent,
  marketingConsent
});
const verifyEmail = (token) => api.post("/auth/verify-email", { token });
const resendVerification = () => api.post("/auth/resend-verification");
const logout = () => api.post("/auth/logout");
const AuthContext = createContext(null);
const AUTH_BOOTSTRAP_TIMEOUT_MS = 2500;
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const isAuthenticated = Boolean(user);
  async function loadMeSafely() {
    try {
      const me = await getMe();
      setUser({
        email: me?.email,
        role: me?.role,
        isVerified: Boolean(me?.isVerified)
      });
    } catch (err) {
      const status2 = err?.response?.status;
      if (status2 === 401) {
        setUser(null);
        return;
      }
      setUser(null);
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let finished = false;
    let timer = null;
    timer = setTimeout(() => {
      if (!active || finished) return;
      finished = true;
      controller.abort();
      setUser(null);
      setLoading(false);
    }, AUTH_BOOTSTRAP_TIMEOUT_MS);
    (async function bootstrap() {
      try {
        const me = await getMe({
          signal: controller.signal,
          timeout: AUTH_BOOTSTRAP_TIMEOUT_MS
        });
        if (!active || finished) return;
        finished = true;
        clearTimeout(timer);
        if (me) {
          setUser({
            email: me.email,
            role: me.role,
            isVerified: Boolean(me.isVerified)
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      } catch {
        if (!active || finished) return;
        finished = true;
        clearTimeout(timer);
        setUser(null);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
      clearTimeout(timer);
      if (!finished) {
        controller.abort();
      }
    };
  }, []);
  async function login$1(email, password) {
    await login(email, password);
    await loadMeSafely();
  }
  async function register$1(email, password, consent) {
    const res = await register(email, password, consent);
    return res;
  }
  async function logout$1() {
    try {
      await logout();
    } catch {
    }
    setUser(null);
  }
  const value = useMemo(
    () => ({ user, isAuthenticated, loading, login: login$1, register: register$1, logout: logout$1 }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, isAuthenticated, loading]
  );
  return /* @__PURE__ */ jsx(AuthContext.Provider, { value, children });
}
function useAuth() {
  return useContext(AuthContext);
}
async function createLead(data) {
  const res = await api.post("/leads", data);
  return res.data;
}
async function getMyLeads({ cursor, limit, unreadOnly, view } = {}) {
  const params = {};
  if (cursor) params.cursor = cursor;
  if (limit) params.limit = limit;
  if (unreadOnly) params.unreadOnly = "1";
  if (view) params.view = view;
  const res = await api.get("/leads/mine", { params });
  return res.data;
}
async function getUnreadCount() {
  const res = await api.get("/leads/unread-count");
  return res.data.unreadCount;
}
async function markLeadRead(id) {
  const res = await api.patch(`/leads/${id}/read`);
  return res.data;
}
async function updateLeadFlags(id, flags) {
  const res = await api.patch(`/leads/${id}/flags`, flags);
  return res.data;
}
async function hardDeleteLead(id) {
  const res = await api.delete(`/leads/${id}`);
  return res.data;
}
async function getPublicAvailability(cardId, { days } = {}) {
  const params = { cardId: String(cardId || "").trim() };
  if (Number.isFinite(days)) params.days = days;
  const res = await api.get("/bookings/availability", { params });
  return res.data;
}
async function createPublicBooking(data) {
  const res = await api.post("/bookings", data);
  return res.data;
}
async function getPendingBookingCount() {
  const res = await api.get("/bookings/mine/pending-count");
  return res.data.pendingCount;
}
async function getMyBookings(cardId, { limit } = {}) {
  const id = String("").trim();
  const params = {};
  if (id) params.cardId = id;
  if (Number.isFinite(Number(limit))) params.limit = Number(limit);
  const res = await api.get("/bookings/mine", { params });
  return res.data;
}
async function approveMyBooking(id) {
  const bookingId = String(id || "").trim();
  if (!bookingId) throw new Error("Missing booking id");
  const res = await api.post(`/bookings/${bookingId}/approve`);
  return res.data;
}
async function cancelMyBooking(id) {
  const bookingId = String(id || "").trim();
  if (!bookingId) throw new Error("Missing booking id");
  const res = await api.post(`/bookings/${bookingId}/cancel`);
  return res.data;
}
const POLL_INTERVAL_MS = 6e4;
const UnreadCountContext = createContext(null);
function UnreadCountProvider({ children }) {
  const { isAuthenticated } = useAuth();
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
        getPendingBookingCount()
      ]);
      if (leads.status === "fulfilled") {
        setLeadsUnread(
          typeof leads.value === "number" ? leads.value : 0
        );
      }
      if (bookings.status === "fulfilled") {
        setBookingsPending(
          typeof bookings.value === "number" ? bookings.value : 0
        );
      }
    } catch {
    } finally {
      inflightRef.current = false;
      if (pendingRefetchRef.current) {
        pendingRefetchRef.current = false;
        fetchCount();
      }
    }
  }, []);
  useEffect(() => {
    if (!isAuthenticated) {
      setLeadsUnread(0);
      setBookingsPending(0);
      return;
    }
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
        onVisibilityChange
      );
    };
  }, [isAuthenticated, fetchCount]);
  const adjustUnreadCount = useCallback(
    (delta) => setLeadsUnread(
      (prev) => Math.max(0, (typeof prev === "number" ? prev : 0) + delta)
    ),
    []
  );
  const unreadCount = leadsUnread + bookingsPending;
  const value = useMemo(
    () => ({ unreadCount, refresh: fetchCount, adjustUnreadCount }),
    [unreadCount, fetchCount, adjustUnreadCount]
  );
  return /* @__PURE__ */ jsx(UnreadCountContext.Provider, { value, children });
}
function useUnreadCount() {
  const ctx = useContext(UnreadCountContext);
  if (!ctx) {
    throw new Error(
      "useUnreadCount must be used inside <UnreadCountProvider>"
    );
  }
  return ctx;
}
const CONSENT_KEY = "cardigo_cookie_consent_v1";
function pushConsentToDataLayer(state) {
  try {
    if (typeof window === "undefined" || !Array.isArray(window.dataLayer))
      return;
    window.dataLayer.push({
      event: "cardigo_consent_update",
      cardigo_consent_version: state.version,
      cardigo_consent_acknowledged: state.acknowledged,
      cardigo_consent_optional_tracking: state.optionalTrackingAllowed
    });
  } catch {
  }
}
function safeParse(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.version === 1) {
      return parsed;
    }
  } catch {
  }
  return null;
}
function getConsentState() {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    return safeParse(raw);
  } catch {
    return null;
  }
}
function acceptConsent() {
  return saveConsent(true);
}
function saveConsent(optionalTrackingAllowed) {
  const state = {
    version: 1,
    acknowledged: true,
    optionalTrackingAllowed: Boolean(optionalTrackingAllowed),
    ts: Date.now()
  };
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(state));
  } catch {
  }
  pushConsentToDataLayer(state);
  return state;
}
function hasAcceptedConsent() {
  const s = getConsentState();
  return Boolean(s && s.acknowledged);
}
const CARD_CONSENT_KEY = "cardigo_card_consent_v1";
function getCardConsentState() {
  try {
    const raw = localStorage.getItem(CARD_CONSENT_KEY);
    if (!raw) return null;
    return safeParse(raw);
  } catch {
    return null;
  }
}
function saveCardConsent(ownerTrackingAllowed) {
  const state = {
    version: 1,
    acknowledged: true,
    ownerTrackingAllowed: Boolean(ownerTrackingAllowed),
    ts: Date.now()
  };
  try {
    localStorage.setItem(CARD_CONSENT_KEY, JSON.stringify(state));
  } catch {
  }
  return state;
}
function hasAcceptedCardConsent() {
  const s = getCardConsentState();
  return Boolean(s && s.acknowledged);
}
const btn = "_btn_qwq5a_1";
const button$1 = "_button_qwq5a_3";
const fullWidth = "_fullWidth_qwq5a_87";
const primary = "_primary_qwq5a_97";
const secondary = "_secondary_qwq5a_151";
const danger = "_danger_qwq5a_175";
const ghost = "_ghost_qwq5a_201";
const label$1 = "_label_qwq5a_221";
const small = "_small_qwq5a_241";
const medium = "_medium_qwq5a_251";
const large = "_large_qwq5a_261";
const styles$j = {
  btn,
  button: button$1,
  fullWidth,
  primary,
  secondary,
  danger,
  ghost,
  label: label$1,
  small,
  medium,
  large
};
function Button({
  as: Component2 = "button",
  children,
  variant = "primary",
  size = "medium",
  fullWidth: fullWidth2 = false,
  loading = false,
  className = "",
  type = "button",
  disabled = false,
  ...props
}) {
  const isNativeButton = Component2 === "button";
  const classes = [
    styles$j.btn,
    styles$j[variant],
    styles$j[size],
    fullWidth2 ? styles$j.fullWidth : "",
    className
  ].filter(Boolean).join(" ");
  const isDisabled = disabled || loading;
  const content = /* @__PURE__ */ jsx("span", { className: styles$j.label, children: loading ? "טוען..." : children });
  if (isNativeButton) {
    return /* @__PURE__ */ jsx(
      "button",
      {
        className: classes,
        type,
        disabled: isDisabled,
        ...props,
        children: content
      }
    );
  }
  return /* @__PURE__ */ jsx(Component2, { className: classes, "aria-disabled": isDisabled, ...props, children: content });
}
let cachedUserId = null;
let cachedPromise = null;
let cachedValue = null;
function normalizeUserId(userId) {
  if (typeof userId !== "string") return null;
  const t = userId.trim();
  return t ? t : null;
}
function lowerTrim(v) {
  return String(v ?? "").trim().toLowerCase();
}
function extractOrgs(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.orgs)) return data.orgs;
  return [];
}
function getHttpStatus(err) {
  return err?.response?.status ?? null;
}
function isCanceled(err) {
  return err?.code === "ERR_CANCELED" || err?.name === "CanceledError" || err?.name === "AbortError" || err?.message === "canceled";
}
function isStableAuthDeny(status2) {
  return status2 === 401 || status2 === 403;
}
function isTransient(status2) {
  if (!status2) return true;
  if (status2 === 429) return true;
  return status2 >= 500 && status2 <= 599;
}
function computeHasOrgAdmin(orgs) {
  return (orgs || []).some((o) => {
    const role = lowerTrim(o?.myRole);
    const status2 = lowerTrim(o?.myStatus);
    const roleOk = role === "admin";
    const statusOk = !status2 || status2 === "active";
    return roleOk && statusOk;
  });
}
async function getHasOrgAdmin({ userId, signal } = {}) {
  const nextUserId = normalizeUserId(userId);
  if (!nextUserId) {
    cachedUserId = null;
    cachedPromise = null;
    cachedValue = null;
    return false;
  }
  if (cachedUserId !== nextUserId) {
    cachedUserId = nextUserId;
    cachedPromise = null;
    cachedValue = null;
  }
  if (typeof cachedValue === "boolean") return cachedValue;
  if (cachedPromise) return cachedPromise;
  cachedPromise = api.get("/orgs/mine", { signal }).then((res) => {
    const orgs = extractOrgs(res?.data);
    const allowed = computeHasOrgAdmin(orgs);
    cachedValue = allowed;
    return allowed;
  }).catch((err) => {
    const status2 = getHttpStatus(err);
    if (isCanceled(err)) {
      if (cachedUserId === nextUserId) {
        cachedValue = null;
        cachedPromise = null;
      }
      return false;
    }
    if (isStableAuthDeny(status2)) {
      cachedValue = false;
      return false;
    }
    if (isTransient(status2)) {
      cachedValue = null;
      return false;
    }
    cachedValue = null;
    return false;
  }).finally(() => {
    cachedPromise = null;
  });
  return cachedPromise;
}
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(",");
function useFocusTrap(containerRef, isEnabled) {
  useEffect(() => {
    if (!isEnabled) return;
    const container = containerRef.current;
    if (!container) return;
    const onKeyDown = (e) => {
      if (e.key !== "Tab") return;
      const focusable = Array.from(
        container.querySelectorAll(FOCUSABLE_SELECTOR)
      );
      if (focusable.length < 2) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [containerRef, isEnabled]);
}
function svgProps$1(className, title2) {
  const decorative = !title2;
  return {
    className,
    xmlns: "http://www.w3.org/2000/svg",
    width: "24",
    height: "24",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    focusable: "false",
    "aria-hidden": decorative ? "true" : void 0,
    role: title2 ? "img" : void 0
  };
}
function TemplatesIcon({ className, title: title2 }) {
  return /* @__PURE__ */ jsxs("svg", { ...svgProps$1(className, title2), children: [
    title2 ? /* @__PURE__ */ jsx("title", { children: title2 }) : null,
    /* @__PURE__ */ jsx("path", { stroke: "none", d: "M0 0h24v24H0z", fill: "none" }),
    /* @__PURE__ */ jsx("path", { d: "M19 3h-4a2 2 0 0 0 -2 2v12a4 4 0 0 0 8 0v-12a2 2 0 0 0 -2 -2" }),
    /* @__PURE__ */ jsx("path", { d: "M13 7.35l-2 -2a2 2 0 0 0 -2.828 0l-2.828 2.828a2 2 0 0 0 0 2.828l9 9" }),
    /* @__PURE__ */ jsx("path", { d: "M7.3 13h-2.3a2 2 0 0 0 -2 2v4a2 2 0 0 0 2 2h12" }),
    /* @__PURE__ */ jsx("path", { d: "M17 17l0 .01" })
  ] });
}
function SelfDesignIcon({ className, title: title2 }) {
  return /* @__PURE__ */ jsxs("svg", { ...svgProps$1(className, title2), children: [
    title2 ? /* @__PURE__ */ jsx("title", { children: title2 }) : null,
    /* @__PURE__ */ jsx("path", { stroke: "none", d: "M0 0h24v24H0z", fill: "none" }),
    /* @__PURE__ */ jsx("path", { d: "M12 21a9 9 0 0 1 0 -18c4.97 0 9 3.582 9 8c0 1.06 -.474 2.078 -1.318 2.828c-.844 .75 -1.989 1.172 -3.182 1.172h-2.5a2 2 0 0 0 -1 3.75a1.3 1.3 0 0 1 -1 2.25" }),
    /* @__PURE__ */ jsx("path", { d: "M7.5 10.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" }),
    /* @__PURE__ */ jsx("path", { d: "M11.5 7.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" }),
    /* @__PURE__ */ jsx("path", { d: "M15.5 10.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" })
  ] });
}
function HeadIcon({ className, title: title2 }) {
  return /* @__PURE__ */ jsxs("svg", { ...svgProps$1(className, title2), children: [
    title2 ? /* @__PURE__ */ jsx("title", { children: title2 }) : null,
    /* @__PURE__ */ jsx("path", { stroke: "none", d: "M0 0h24v24H0z", fill: "none" }),
    /* @__PURE__ */ jsx("path", { d: "M8 19h-3a2 2 0 0 1 -2 -2v-10a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v11a1 1 0 0 1 -1 1" }),
    /* @__PURE__ */ jsx("path", { d: "M12 14a2 2 0 1 0 4.001 -.001a2 2 0 0 0 -4.001 .001" }),
    /* @__PURE__ */ jsx("path", { d: "M17 19a2 2 0 0 0 -2 -2h-2a2 2 0 0 0 -2 2" })
  ] });
}
function BusinessIcon({ className, title: title2 }) {
  return /* @__PURE__ */ jsxs("svg", { ...svgProps$1(className, title2), children: [
    title2 ? /* @__PURE__ */ jsx("title", { children: title2 }) : null,
    /* @__PURE__ */ jsx("path", { stroke: "none", d: "M0 0h24v24H0z", fill: "none" }),
    /* @__PURE__ */ jsx("path", { d: "M9 10a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" }),
    /* @__PURE__ */ jsx("path", { d: "M6 21v-1a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v1" }),
    /* @__PURE__ */ jsx("path", { d: "M3 5a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-14" })
  ] });
}
function ContactIcon({ className, title: title2 }) {
  const decorative = !title2;
  return /* @__PURE__ */ jsxs(
    "svg",
    {
      className,
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "-24 -24 660 660",
      fill: "currentColor",
      focusable: "false",
      "aria-hidden": decorative ? "true" : void 0,
      role: title2 ? "img" : void 0,
      children: [
        title2 ? /* @__PURE__ */ jsx("title", { children: title2 }) : null,
        /* @__PURE__ */ jsx("path", { d: "M164.9 24.6c-7.7-18.6-28-28.5-47.4-23.2l-88 24C12.1 30.2 0 46 0 64C0 311.4 200.6 512 448 512c18 0 33.8-12.1 38.6-29.5l24-88c5.3-19.4-4.6-39.7-23.2-47.4l-96-40c-16.3-6.8-35.2-2.1-46.3 11.6L304.7 368C234.3 334.7 177.3 277.7 144 207.3L193.3 167c13.7-11.2 18.4-30 11.6-46.3l-40-96z" })
      ]
    }
  );
}
function ContentIcon({ className, title: title2 }) {
  return /* @__PURE__ */ jsxs("svg", { ...svgProps$1(className, title2), children: [
    title2 ? /* @__PURE__ */ jsx("title", { children: title2 }) : null,
    /* @__PURE__ */ jsx("path", { stroke: "none", d: "M0 0h24v24H0z", fill: "none" }),
    /* @__PURE__ */ jsx("path", { d: "M14 3v4a1 1 0 0 0 1 1h4" }),
    /* @__PURE__ */ jsx("path", { d: "M12 21h-5a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v3.5" }),
    /* @__PURE__ */ jsx("path", { d: "M9 9h1" }),
    /* @__PURE__ */ jsx("path", { d: "M9 13h6" }),
    /* @__PURE__ */ jsx("path", { d: "M9 17h3" }),
    /* @__PURE__ */ jsx("path", { d: "M19 22.5a4.75 4.75 0 0 1 3.5 -3.5a4.75 4.75 0 0 1 -3.5 -3.5a4.75 4.75 0 0 1 -3.5 3.5a4.75 4.75 0 0 1 3.5 3.5" })
  ] });
}
function GalleryIcon({ className, title: title2 }) {
  return /* @__PURE__ */ jsxs("svg", { ...svgProps$1(className, title2), children: [
    title2 ? /* @__PURE__ */ jsx("title", { children: title2 }) : null,
    /* @__PURE__ */ jsx("rect", { x: "3", y: "4", width: "18", height: "16", rx: "3" }),
    /* @__PURE__ */ jsx("circle", { cx: "9", cy: "10", r: "1.4" }),
    /* @__PURE__ */ jsx("path", { d: "M21 16l-5.2-5.2a1 1 0 0 0-1.4 0L8 17" }),
    /* @__PURE__ */ jsx("path", { d: "M8 17l-2.2-2.2a1 1 0 0 0-1.4 0L3 16" })
  ] });
}
function BookingIcon({ className, title: title2 }) {
  return /* @__PURE__ */ jsxs("svg", { ...svgProps$1(className, title2), children: [
    title2 ? /* @__PURE__ */ jsx("title", { children: title2 }) : null,
    /* @__PURE__ */ jsx("path", { stroke: "none", d: "M0 0h24v24H0z", fill: "none" }),
    /* @__PURE__ */ jsx("path", { d: "M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2" }),
    /* @__PURE__ */ jsx("rect", { x: "9", y: "3", width: "6", height: "4", rx: "2" }),
    /* @__PURE__ */ jsx("path", { d: "M9 12h6" }),
    /* @__PURE__ */ jsx("path", { d: "M9 16h6" })
  ] });
}
function WorkHoursIcon({ className, title: title2 }) {
  return /* @__PURE__ */ jsxs("svg", { ...svgProps$1(className, title2), children: [
    title2 ? /* @__PURE__ */ jsx("title", { children: title2 }) : null,
    /* @__PURE__ */ jsx("path", { stroke: "none", d: "M0 0h24v24H0z", fill: "none" }),
    /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "9" }),
    /* @__PURE__ */ jsx("path", { d: "M12 7v5l3 3" })
  ] });
}
function ReviewsIcon({ className, title: title2 }) {
  return /* @__PURE__ */ jsxs("svg", { ...svgProps$1(className, title2), children: [
    title2 ? /* @__PURE__ */ jsx("title", { children: title2 }) : null,
    /* @__PURE__ */ jsx("path", { stroke: "none", d: "M0 0h24v24H0z", fill: "none" }),
    /* @__PURE__ */ jsx("path", { d: "M17 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" }),
    /* @__PURE__ */ jsx("path", { d: "M22 22a2 2 0 0 0 -2 -2h-2a2 2 0 0 0 -2 2" }),
    /* @__PURE__ */ jsx("path", { d: "M12.454 19.97a9.9 9.9 0 0 1 -4.754 -.97l-4.7 1l1.3 -3.9c-2.324 -3.437 -1.426 -7.872 2.1 -10.374c3.526 -2.501 8.59 -2.296 11.845 .48c1.667 1.423 2.596 3.294 2.747 5.216" })
  ] });
}
function FaqIcon({ className, title: title2 }) {
  return /* @__PURE__ */ jsxs("svg", { ...svgProps$1(className, title2), children: [
    title2 ? /* @__PURE__ */ jsx("title", { children: title2 }) : null,
    /* @__PURE__ */ jsx("path", { stroke: "none", d: "M0 0h24v24H0z", fill: "none" }),
    /* @__PURE__ */ jsx("path", { d: "M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" }),
    /* @__PURE__ */ jsx("path", { d: "M6 21v-2a4 4 0 0 1 4 -4h3.5" }),
    /* @__PURE__ */ jsx("path", { d: "M19 22v.01" }),
    /* @__PURE__ */ jsx("path", { d: "M19 19a2.003 2.003 0 0 0 .914 -3.782a1.98 1.98 0 0 0 -2.414 .483" })
  ] });
}
function ServicesIcon({ className, title: title2 }) {
  return /* @__PURE__ */ jsxs("svg", { ...svgProps$1(className, title2), children: [
    title2 ? /* @__PURE__ */ jsx("title", { children: title2 }) : null,
    /* @__PURE__ */ jsx("path", { stroke: "none", d: "M0 0h24v24H0z", fill: "none" }),
    /* @__PURE__ */ jsx("rect", { x: "3", y: "7", width: "18", height: "13", rx: "2" }),
    /* @__PURE__ */ jsx("path", { d: "M8 7v-2a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v2" }),
    /* @__PURE__ */ jsx("path", { d: "M3 13h18" })
  ] });
}
function SeoIcon({ className, title: title2 }) {
  return /* @__PURE__ */ jsxs("svg", { ...svgProps$1(className, title2), children: [
    title2 ? /* @__PURE__ */ jsx("title", { children: title2 }) : null,
    /* @__PURE__ */ jsx("path", { stroke: "none", d: "M0 0h24v24H0z", fill: "none" }),
    /* @__PURE__ */ jsx("path", { d: "M21 12a9 9 0 1 0 -9 9" }),
    /* @__PURE__ */ jsx("path", { d: "M3.6 9h16.8" }),
    /* @__PURE__ */ jsx("path", { d: "M3.6 15h7.9" }),
    /* @__PURE__ */ jsx("path", { d: "M11.5 3a17 17 0 0 0 0 18" }),
    /* @__PURE__ */ jsx("path", { d: "M12.5 3a16.984 16.984 0 0 1 2.574 8.62" }),
    /* @__PURE__ */ jsx("path", { d: "M15 18a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" }),
    /* @__PURE__ */ jsx("path", { d: "M20.2 20.2l1.8 1.8" })
  ] });
}
function SettingsIcon({ className, title: title2 }) {
  return /* @__PURE__ */ jsxs("svg", { ...svgProps$1(className, title2), children: [
    title2 ? /* @__PURE__ */ jsx("title", { children: title2 }) : null,
    /* @__PURE__ */ jsx("path", { stroke: "none", d: "M0 0h24v24H0z", fill: "none" }),
    /* @__PURE__ */ jsx("path", { d: "M4 8h4v4h-4l0 -4" }),
    /* @__PURE__ */ jsx("path", { d: "M6 4l0 4" }),
    /* @__PURE__ */ jsx("path", { d: "M6 12l0 8" }),
    /* @__PURE__ */ jsx("path", { d: "M10 14h4v4h-4l0 -4" }),
    /* @__PURE__ */ jsx("path", { d: "M12 4l0 10" }),
    /* @__PURE__ */ jsx("path", { d: "M12 18l0 2" }),
    /* @__PURE__ */ jsx("path", { d: "M16 5h4v4h-4l0 -4" }),
    /* @__PURE__ */ jsx("path", { d: "M18 4l0 1" }),
    /* @__PURE__ */ jsx("path", { d: "M18 9l0 11" })
  ] });
}
function AnalyticsIcon({ className, title: title2 }) {
  return /* @__PURE__ */ jsxs("svg", { ...svgProps$1(className, title2), children: [
    title2 ? /* @__PURE__ */ jsx("title", { children: title2 }) : null,
    /* @__PURE__ */ jsx("path", { stroke: "none", d: "M0 0h24v24H0z", fill: "none" }),
    /* @__PURE__ */ jsx("path", { d: "M3 5a1 1 0 0 1 1 -1h16a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1l0 -10" }),
    /* @__PURE__ */ jsx("path", { d: "M7 20l10 0" }),
    /* @__PURE__ */ jsx("path", { d: "M9 16l0 4" }),
    /* @__PURE__ */ jsx("path", { d: "M15 16l0 4" }),
    /* @__PURE__ */ jsx("path", { d: "M8 12l3 -3l2 2l3 -3" })
  ] });
}
function CopyIcon({ className, title: title2 }) {
  return /* @__PURE__ */ jsxs("svg", { ...svgProps$1(className, title2), children: [
    title2 ? /* @__PURE__ */ jsx("title", { children: title2 }) : null,
    /* @__PURE__ */ jsx("path", { stroke: "none", d: "M0 0h24v24H0z", fill: "none" }),
    /* @__PURE__ */ jsx("path", { d: "M7 9.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667l0 -8.666" }),
    /* @__PURE__ */ jsx("path", { d: "M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1" })
  ] });
}
function HelpIcon({ className, title: title2 }) {
  return /* @__PURE__ */ jsxs("svg", { ...svgProps$1(className, title2), children: [
    title2 ? /* @__PURE__ */ jsx("title", { children: title2 }) : null,
    /* @__PURE__ */ jsx("path", { stroke: "none", d: "M0 0h24v24H0z", fill: "none" }),
    /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "9" }),
    /* @__PURE__ */ jsx("path", { d: "M10 9.5a2 2 0 1 1 4 0c0 1 -2 1.5 -2 2.5" }),
    /* @__PURE__ */ jsx("path", { d: "M12 16v.01" })
  ] });
}
const scrollLock = "_scrollLock_n3wgj_1";
const header = "_header_n3wgj_9";
const inner$1 = "_inner_n3wgj_27";
const logo = "_logo_n3wgj_45";
const logoImage = "_logoImage_n3wgj_63";
const nav = "_nav_n3wgj_77";
const navLink = "_navLink_n3wgj_95";
const navLinkActive = "_navLinkActive_n3wgj_127";
const authButtons = "_authButtons_n3wgj_153";
const actions$1 = "_actions_n3wgj_163";
const authBlock = "_authBlock_n3wgj_177";
const inboxLink = "_inboxLink_n3wgj_193";
const inboxIcon = "_inboxIcon_n3wgj_235";
const badge = "_badge_n3wgj_245";
const mobileBadge = "_mobileBadge_n3wgj_283";
const userEmail = "_userEmail_n3wgj_315";
const burger = "_burger_n3wgj_341";
const burgerLine = "_burgerLine_n3wgj_369";
const burgerOpen = "_burgerOpen_n3wgj_391";
const overlay$1 = "_overlay_n3wgj_415";
const overlayOpen = "_overlayOpen_n3wgj_437";
const drawer = "_drawer_n3wgj_447";
const drawerOpen = "_drawerOpen_n3wgj_491";
const drawerHeader = "_drawerHeader_n3wgj_499";
const drawerTitle = "_drawerTitle_n3wgj_515";
const drawerLogoImg = "_drawerLogoImg_n3wgj_527";
const drawerTitleText = "_drawerTitleText_n3wgj_541";
const drawerClose = "_drawerClose_n3wgj_555";
const drawerNav = "_drawerNav_n3wgj_575";
const drawerBtnIcon = "_drawerBtnIcon_n3wgj_633";
const drawerActions = "_drawerActions_n3wgj_645";
const styles$i = {
  scrollLock,
  header,
  inner: inner$1,
  logo,
  logoImage,
  nav,
  navLink,
  navLinkActive,
  authButtons,
  actions: actions$1,
  authBlock,
  inboxLink,
  inboxIcon,
  badge,
  mobileBadge,
  userEmail,
  burger,
  burgerLine,
  burgerOpen,
  overlay: overlay$1,
  overlayOpen,
  drawer,
  drawerOpen,
  drawerHeader,
  drawerTitle,
  drawerLogoImg,
  drawerTitleText,
  drawerClose,
  drawerNav,
  drawerBtnIcon,
  drawerActions
};
function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hasOrgAdmin, setHasOrgAdmin] = useState(false);
  const scrollYRef = useRef(0);
  const burgerRef = useRef(null);
  const drawerRef = useRef(null);
  const navigate = useNavigate();
  const { isAuthenticated, user, logout: logout2 } = useAuth();
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
        signal: controller.signal
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
      { to: "/contact", label: "צור קשר" }
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
    if (drawerRef.current?.contains(document.activeElement)) {
      try {
        burgerRef.current?.focus({ preventScroll: true });
      } catch (_) {
        burgerRef.current?.focus();
      }
    }
    setMobileOpen(false);
  }, []);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const lockClass = styles$i.scrollLock;
    const root2 = document.documentElement;
    const body2 = document.body;
    if (mobileOpen) {
      scrollYRef.current = window.scrollY;
      root2.classList.add(lockClass);
      body2.classList.add(lockClass);
      body2.style.position = "fixed";
      body2.style.top = `-${scrollYRef.current}px`;
      body2.style.insetInline = "0";
    } else {
      root2.classList.remove(lockClass);
      body2.classList.remove(lockClass);
      body2.style.position = "";
      body2.style.top = "";
      body2.style.insetInline = "";
      window.scrollTo(0, scrollYRef.current);
    }
    return () => {
      root2.classList.remove(lockClass);
      body2.classList.remove(lockClass);
      body2.style.position = "";
      body2.style.top = "";
      body2.style.insetInline = "";
      window.scrollTo(0, scrollYRef.current);
    };
  }, [mobileOpen]);
  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") closeMobile();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen, closeMobile]);
  const handleLogout = () => {
    logout2();
    closeMobile();
    navigate("/", { replace: true });
  };
  const navLinkClass = ({ isActive }) => isActive ? `${styles$i.navLink} ${styles$i.navLinkActive}` : styles$i.navLink;
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("header", { className: styles$i.header, children: /* @__PURE__ */ jsxs("div", { className: styles$i.inner, children: [
      /* @__PURE__ */ jsx(
        Link,
        {
          to: "/",
          className: styles$i.logo,
          "aria-label": "כרטיס ביקור דיגיטלי - כרדיגו",
          children: /* @__PURE__ */ jsxs("picture", { children: [
            /* @__PURE__ */ jsx(
              "source",
              {
                type: "image/webp",
                srcSet: "/images/brand-logo/cardigo-logo.webp"
              }
            ),
            /* @__PURE__ */ jsx(
              "img",
              {
                src: "/images/brand-logo/cardigo-logo.png",
                alt: "כרטיס ביקור דיגיטלי - כרדיגו",
                className: styles$i.logoImage,
                loading: "eager",
                decoding: "async"
              }
            )
          ] })
        }
      ),
      /* @__PURE__ */ jsxs(
        "button",
        {
          ref: burgerRef,
          type: "button",
          className: mobileOpen ? `${styles$i.burger} ${styles$i.burgerOpen}` : styles$i.burger,
          "aria-label": mobileOpen ? "סגירת תפריט" : "פתיחת תפריט",
          "aria-expanded": mobileOpen,
          "aria-controls": "mobile-nav",
          onClick: () => setMobileOpen((v) => !v),
          children: [
            /* @__PURE__ */ jsx("span", { className: styles$i.burgerLine }),
            /* @__PURE__ */ jsx("span", { className: styles$i.burgerLine }),
            /* @__PURE__ */ jsx("span", { className: styles$i.burgerLine })
          ]
        }
      ),
      /* @__PURE__ */ jsx("nav", { className: styles$i.nav, children: navItems.map((item) => /* @__PURE__ */ jsx(
        NavLink,
        {
          to: item.to,
          end: item.end,
          className: navLinkClass,
          children: item.label
        },
        item.to
      )) }),
      /* @__PURE__ */ jsx("div", { className: styles$i.actions, children: !isAuth ? /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx(
          Button,
          {
            as: Link,
            to: "/login",
            variant: "secondary",
            size: "small",
            children: "התחברות"
          }
        ),
        /* @__PURE__ */ jsx(
          Button,
          {
            as: Link,
            to: "/edit",
            variant: "primary",
            size: "small",
            children: "צור כרטיס חינם"
          }
        )
      ] }) : /* @__PURE__ */ jsxs("div", { className: styles$i.authBlock, children: [
        /* @__PURE__ */ jsxs("div", { className: styles$i.authButtons, children: [
          /* @__PURE__ */ jsx(
            Button,
            {
              as: Link,
              to: "/edit",
              variant: "secondary",
              size: "small",
              children: "הכרטיס שלי"
            }
          ),
          /* @__PURE__ */ jsx(
            Button,
            {
              variant: "ghost",
              size: "small",
              onClick: handleLogout,
              children: "יציאה"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs(
          Link,
          {
            to: "/inbox",
            className: styles$i.inboxLink,
            "aria-label": "הודעות נכנסות",
            children: [
              /* @__PURE__ */ jsxs(
                "svg",
                {
                  className: styles$i.inboxIcon,
                  viewBox: "0 0 24 24",
                  fill: "none",
                  stroke: "currentColor",
                  strokeWidth: "2",
                  strokeLinecap: "round",
                  strokeLinejoin: "round",
                  "aria-hidden": "true",
                  children: [
                    /* @__PURE__ */ jsx("path", { d: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" }),
                    /* @__PURE__ */ jsx("polyline", { points: "22,6 12,13 2,6" })
                  ]
                }
              ),
              unreadCount > 0 && /* @__PURE__ */ jsx("span", { className: styles$i.badge, children: unreadCount > 99 ? "99+" : unreadCount })
            ]
          }
        ),
        user?.email && /* @__PURE__ */ jsx(
          "span",
          {
            className: styles$i.userEmail,
            title: user.email,
            children: user.email
          }
        )
      ] }) })
    ] }) }),
    /* @__PURE__ */ jsx(
      "div",
      {
        className: mobileOpen ? `${styles$i.overlay} ${styles$i.overlayOpen}` : styles$i.overlay,
        onClick: closeMobile,
        "aria-hidden": "true"
      }
    ),
    /* @__PURE__ */ jsxs(
      "aside",
      {
        ref: drawerRef,
        id: "mobile-nav",
        role: "dialog",
        "aria-modal": mobileOpen ? "true" : void 0,
        className: mobileOpen ? `${styles$i.drawer} ${styles$i.drawerOpen}` : styles$i.drawer,
        "aria-hidden": !mobileOpen,
        inert: !mobileOpen ? "" : void 0,
        onClick: (e) => e.stopPropagation(),
        children: [
          /* @__PURE__ */ jsxs("div", { className: styles$i.drawerHeader, children: [
            /* @__PURE__ */ jsxs("div", { className: styles$i.drawerTitle, children: [
              /* @__PURE__ */ jsxs("picture", { children: [
                /* @__PURE__ */ jsx(
                  "source",
                  {
                    type: "image/webp",
                    srcSet: "/images/brand-logo/cardigo-logo.webp"
                  }
                ),
                /* @__PURE__ */ jsx(
                  "img",
                  {
                    src: "/images/brand-logo/cardigo-logo.png",
                    alt: "כרדיגו",
                    className: styles$i.drawerLogoImg,
                    loading: "eager",
                    decoding: "async"
                  }
                )
              ] }),
              /* @__PURE__ */ jsx("span", { className: styles$i.drawerTitleText, children: "תפריט" })
            ] }),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                className: styles$i.drawerClose,
                "aria-label": "סגירת תפריט",
                onClick: closeMobile,
                children: "✕"
              }
            )
          ] }),
          /* @__PURE__ */ jsx("nav", { className: styles$i.drawerNav, children: navItems.map((item) => /* @__PURE__ */ jsx(
            NavLink,
            {
              to: item.to,
              end: item.end,
              className: navLinkClass,
              onClick: closeMobile,
              children: item.label
            },
            item.to
          )) }),
          /* @__PURE__ */ jsx("div", { className: styles$i.drawerActions, children: !isAuth ? /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx(
              Button,
              {
                as: Link,
                to: "/login",
                variant: "secondary",
                fullWidth: true,
                onClick: closeMobile,
                children: "התחברות"
              }
            ),
            /* @__PURE__ */ jsx(
              Button,
              {
                as: Link,
                to: "/edit",
                variant: "primary",
                fullWidth: true,
                onClick: closeMobile,
                children: "צור כרטיס חינם"
              }
            )
          ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
            user?.email ? /* @__PURE__ */ jsx(
              "span",
              {
                className: styles$i.userEmail,
                title: user.email,
                children: user.email
              }
            ) : null,
            /* @__PURE__ */ jsxs(
              Button,
              {
                as: Link,
                to: "/inbox",
                variant: "secondary",
                fullWidth: true,
                onClick: closeMobile,
                children: [
                  /* @__PURE__ */ jsxs(
                    "svg",
                    {
                      className: styles$i.drawerBtnIcon,
                      viewBox: "0 0 24 24",
                      fill: "none",
                      stroke: "currentColor",
                      strokeWidth: "2",
                      strokeLinecap: "round",
                      strokeLinejoin: "round",
                      "aria-hidden": "true",
                      children: [
                        /* @__PURE__ */ jsx("path", { d: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" }),
                        /* @__PURE__ */ jsx("polyline", { points: "22,6 12,13 2,6" })
                      ]
                    }
                  ),
                  "הודעות נכנסות",
                  unreadCount > 0 && /* @__PURE__ */ jsx("span", { className: styles$i.mobileBadge, children: unreadCount > 99 ? "99+" : unreadCount })
                ]
              }
            ),
            /* @__PURE__ */ jsxs(
              Button,
              {
                as: Link,
                to: "/edit",
                variant: "secondary",
                fullWidth: true,
                onClick: closeMobile,
                children: [
                  /* @__PURE__ */ jsx(HeadIcon, { className: styles$i.drawerBtnIcon }),
                  "הכרטיס שלי"
                ]
              }
            ),
            /* @__PURE__ */ jsx(
              Button,
              {
                variant: "ghost",
                fullWidth: true,
                onClick: handleLogout,
                children: "יציאה"
              }
            )
          ] }) })
        ]
      }
    )
  ] });
}
const footer = "_footer_6cv9e_1";
const inner = "_inner_6cv9e_13";
const col = "_col_6cv9e_33";
const brand = "_brand_6cv9e_57";
const brandLogoImage = "_brandLogoImage_6cv9e_79";
const title$1 = "_title_6cv9e_93";
const link$1 = "_link_6cv9e_103";
const linkButton = "_linkButton_6cv9e_119";
const text$1 = "_text_6cv9e_161";
const bottom = "_bottom_6cv9e_173";
const styles$h = {
  footer,
  inner,
  col,
  brand,
  brandLogoImage,
  title: title$1,
  link: link$1,
  linkButton,
  text: text$1,
  bottom
};
function checkStandalone() {
  if (typeof window === "undefined") return false;
  if (typeof navigator !== "undefined" && navigator.standalone === true) {
    return true;
  }
  if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) {
    return true;
  }
  return false;
}
let _deferredPrompt = null;
let _canPrompt = false;
let _isInstalled = checkStandalone();
let _snapshot = Object.freeze({
  canPrompt: _canPrompt,
  isInstalled: _isInstalled
});
const _listeners = /* @__PURE__ */ new Set();
function _emit() {
  _snapshot = Object.freeze({
    canPrompt: _canPrompt,
    isInstalled: _isInstalled
  });
  for (const fn of _listeners) fn();
}
function _syncInstalled() {
  const real = checkStandalone();
  if (real !== _isInstalled) {
    _isInstalled = real;
    _emit();
  }
}
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    _deferredPrompt = e;
    _canPrompt = true;
    _isInstalled = false;
    _emit();
  });
  window.addEventListener("appinstalled", () => {
    _deferredPrompt = null;
    _canPrompt = false;
    _isInstalled = true;
    _emit();
  });
  const mql = window.matchMedia?.("(display-mode: standalone)");
  mql?.addEventListener?.("change", (e) => {
    _isInstalled = e.matches;
    _emit();
  });
  window.addEventListener("pageshow", _syncInstalled);
  document.addEventListener("visibilitychange", _syncInstalled);
  window.addEventListener("focus", _syncInstalled);
}
const _SERVER_SNAPSHOT = Object.freeze({
  canPrompt: false,
  isInstalled: false
});
function subscribe(callback) {
  _listeners.add(callback);
  return () => _listeners.delete(callback);
}
function getSnapshot() {
  return _snapshot;
}
function getServerSnapshot() {
  return _SERVER_SNAPSHOT;
}
async function triggerPrompt() {
  const prompt = _deferredPrompt;
  if (!prompt) return;
  prompt.prompt();
  await prompt.userChoice;
  _deferredPrompt = null;
  _canPrompt = false;
  _emit();
}
function useInstallPrompt() {
  const { canPrompt, isInstalled } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );
  const [platform] = useState(() => {
    if (typeof navigator === "undefined") {
      return { isIOS: false, isSafari: false, isInAppBrowser: false };
    }
    const ua = navigator.userAgent || "";
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !/** @type {any} */
    window.MSStream;
    const isSafari = isIOS && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
    const isInAppBrowser = /FBAN|FBAV|Instagram|Line\/|Twitter|Snapchat|LinkedIn/i.test(ua);
    return { isIOS, isSafari, isInAppBrowser };
  });
  const showIOSGuide = platform.isIOS && platform.isSafari && !isInstalled && !canPrompt;
  return {
    canPrompt,
    triggerPrompt,
    isInstalled,
    isIOS: platform.isIOS,
    isSafari: platform.isSafari,
    isInAppBrowser: platform.isInAppBrowser,
    showIOSGuide
  };
}
const wrap = "_wrap_zts44_1";
const installBtn = "_installBtn_zts44_25";
const helpText = "_helpText_zts44_77";
const helpHighlight = "_helpHighlight_zts44_95";
const styles$g = {
  wrap,
  installBtn,
  helpText,
  helpHighlight
};
function InstallCta() {
  const {
    canPrompt,
    triggerPrompt: triggerPrompt2,
    isInstalled,
    isIOS,
    isSafari,
    isInAppBrowser,
    showIOSGuide
  } = useInstallPrompt();
  const [highlighted, setHighlighted] = useState(false);
  let helpText2;
  if (isInstalled) {
    helpText2 = "✓ Cardigo מותקן במכשיר שלכם";
  } else if (canPrompt) {
    helpText2 = null;
  } else if (showIOSGuide) {
    helpText2 = "להתקנה: לחצו על שיתוף ▸ הוסף למסך הבית";
  } else if (isInAppBrowser || isIOS && !isSafari) {
    helpText2 = "פתחו ב־Safari להתקנה כאפליקציה";
  } else {
    helpText2 = "כפתור ההתקנה מיועד למכשירי אנדרואיד בלבד. אם חלון ההתקנה לא נפתח, אפשר להתקין דרך תפריט הדפדפן.";
  }
  function handleClick() {
    if (canPrompt) {
      triggerPrompt2();
      return;
    }
    setHighlighted((v) => !v);
  }
  const helpClass = highlighted && helpText2 ? `${styles$g.helpText} ${styles$g.helpHighlight}` : styles$g.helpText;
  return /* @__PURE__ */ jsxs("div", { className: styles$g.wrap, children: [
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        className: styles$g.installBtn,
        onClick: handleClick,
        children: "התקינו את Cardigo"
      }
    ),
    helpText2 && /* @__PURE__ */ jsx("p", { className: helpClass, children: helpText2 })
  ] });
}
function Footer({ onOpenPrivacyPrefs }) {
  return /* @__PURE__ */ jsxs("footer", { className: styles$h.footer, id: "contact", children: [
    /* @__PURE__ */ jsxs("div", { className: styles$h.inner, children: [
      /* @__PURE__ */ jsxs("div", { className: styles$h.col, children: [
        /* @__PURE__ */ jsx(
          Link,
          {
            to: "/",
            className: styles$h.brand,
            "aria-label": "כרטיס ביקור דיגיטלי - כרדיגו",
            children: /* @__PURE__ */ jsxs("picture", { children: [
              /* @__PURE__ */ jsx(
                "source",
                {
                  type: "image/webp",
                  srcSet: "/images/brand-logo/cardigo-logo.webp"
                }
              ),
              /* @__PURE__ */ jsx(
                "img",
                {
                  src: "/images/brand-logo/cardigo-logo.png",
                  alt: "כרטיס ביקור דיגיטלי - כרדיגו",
                  className: styles$h.brandLogoImage,
                  loading: "lazy",
                  decoding: "async"
                }
              )
            ] })
          }
        ),
        /* @__PURE__ */ jsx("div", { className: styles$h.text, children: "כרטיסי ביקור דיגיטליים לעסקים - יצירה, התאמה אישית ושיתוף בלחיצה." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$h.col, children: [
        /* @__PURE__ */ jsx("div", { className: styles$h.title, children: "קישורים" }),
        /* @__PURE__ */ jsx(Link, { to: "/#features", className: styles$h.link, children: "תכונות" }),
        /* @__PURE__ */ jsx(Link, { to: "/cards", className: styles$h.link, children: "דוגמאות" }),
        /* @__PURE__ */ jsx(Link, { to: "/#how", className: styles$h.link, children: "איך זה עובד" }),
        /* @__PURE__ */ jsx(Link, { to: "/#faq", className: styles$h.link, children: "שאלות נפוצות" }),
        /* @__PURE__ */ jsx(Link, { to: "/pricing", className: styles$h.link, children: "מחירים" }),
        /* @__PURE__ */ jsx(Link, { to: "/guides", className: styles$h.link, children: "מדריכים" }),
        /* @__PURE__ */ jsx(Link, { to: "/blog", className: styles$h.link, children: "בלוג" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$h.col, children: [
        /* @__PURE__ */ jsx("div", { className: styles$h.title, children: "חשבון" }),
        /* @__PURE__ */ jsx(Link, { to: "/login", className: styles$h.link, children: "התחברות" }),
        /* @__PURE__ */ jsx(Link, { to: "/register", className: styles$h.link, children: "יצירת חשבון" }),
        /* @__PURE__ */ jsx(Link, { to: "/edit", className: styles$h.link, children: "עורך כרטיס" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$h.col, children: [
        /* @__PURE__ */ jsx("div", { className: styles$h.title, children: "מידע" }),
        /* @__PURE__ */ jsx(Link, { to: "/privacy", className: styles$h.link, children: "מדיניות פרטיות" }),
        /* @__PURE__ */ jsx(Link, { to: "/terms", className: styles$h.link, children: "תנאי שימוש" }),
        /* @__PURE__ */ jsx(Link, { to: "/accessibility-statement", className: styles$h.link, children: "הצהרת נגישות" }),
        /* @__PURE__ */ jsx(Link, { to: "/payment-policy", className: styles$h.link, children: "תנאי תשלום, חידוש, ביטול והחזרים" }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            className: styles$h.linkButton,
            onClick: onOpenPrivacyPrefs,
            children: "העדפות פרטיות"
          }
        ),
        /* @__PURE__ */ jsx("div", { className: styles$h.text, children: "אימייל: support@cardigo.co.il" })
      ] })
    ] }),
    /* @__PURE__ */ jsx(InstallCta, {}),
    /* @__PURE__ */ jsxs("div", { className: styles$h.bottom, children: [
      "© ",
      (/* @__PURE__ */ new Date()).getFullYear(),
      " Cardigo. כל הזכויות שמורות."
    ] })
  ] });
}
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (pathname.startsWith("/edit")) return;
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: "auto" });
        return;
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, hash]);
  return null;
}
const overlay = "_overlay_1cbxm_1";
const banner = "_banner_1cbxm_23";
const text = "_text_1cbxm_65";
const link = "_link_1cbxm_81";
const accept = "_accept_1cbxm_113";
const actions = "_actions_1cbxm_175";
const prefsToggle = "_prefsToggle_1cbxm_189";
const prefsView = "_prefsView_1cbxm_237";
const prefRow = "_prefRow_1cbxm_251";
const prefLabel = "_prefLabel_1cbxm_265";
const prefAlways = "_prefAlways_1cbxm_277";
const checkbox = "_checkbox_1cbxm_289";
const prefsActions = "_prefsActions_1cbxm_305";
const save = "_save_1cbxm_317";
const back = "_back_1cbxm_379";
const styles$f = {
  overlay,
  banner,
  text,
  link,
  accept,
  actions,
  prefsToggle,
  prefsView,
  prefRow,
  prefLabel,
  prefAlways,
  checkbox,
  prefsActions,
  save,
  back
};
function CookieConsentBanner({ reopenPrefs }) {
  const [visible, setVisible] = useState(false);
  const [view, setView] = useState("notice");
  const [optionalTracking, setOptionalTracking] = useState(true);
  useEffect(() => {
    if (!hasAcceptedConsent()) setVisible(true);
  }, []);
  useEffect(() => {
    if (!reopenPrefs) return;
    setOptionalTracking(getConsentState()?.optionalTrackingAllowed ?? true);
    setView("prefs");
    setVisible(true);
  }, [reopenPrefs]);
  if (!visible) return null;
  function handleAccept() {
    acceptConsent();
    setVisible(false);
  }
  function handleSavePrefs() {
    saveConsent(optionalTracking);
    setVisible(false);
  }
  return /* @__PURE__ */ jsx(
    "aside",
    {
      className: styles$f.overlay,
      role: "region",
      "aria-label": "הודעת פרטיות ועוגיות",
      children: /* @__PURE__ */ jsx("div", { className: styles$f.banner, children: view === "notice" ? /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("p", { className: styles$f.text, children: [
          "האתר משתמש בקובצי Cookie 🍪 למדידה ושיפור החוויה.",
          " ",
          /* @__PURE__ */ jsx(Link, { to: "/privacy", className: styles$f.link, children: "למדיניות הפרטיות" }),
          " ",
          "ו",
          " ",
          /* @__PURE__ */ jsx(Link, { to: "/terms", className: styles$f.link, children: "תנאי השימוש" }),
          "."
        ] }),
        /* @__PURE__ */ jsxs("div", { className: styles$f.actions, children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: styles$f.accept,
              onClick: handleAccept,
              children: "הבנתי"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: styles$f.prefsToggle,
              onClick: () => setView("prefs"),
              children: "ניהול העדפות"
            }
          )
        ] })
      ] }) : /* @__PURE__ */ jsxs("div", { className: styles$f.prefsView, children: [
        /* @__PURE__ */ jsxs("div", { className: styles$f.prefRow, children: [
          /* @__PURE__ */ jsx("span", { className: styles$f.prefLabel, children: "עוגיות הכרחיות" }),
          /* @__PURE__ */ jsx("span", { className: styles$f.prefAlways, children: "תמיד פעיל" })
        ] }),
        /* @__PURE__ */ jsxs("label", { className: styles$f.prefRow, children: [
          /* @__PURE__ */ jsx("span", { className: styles$f.prefLabel, children: "כלי מדידה ושיווק של צדדים שלישיים" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "checkbox",
              className: styles$f.checkbox,
              checked: optionalTracking,
              onChange: (e) => setOptionalTracking(e.target.checked)
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: styles$f.prefsActions, children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: styles$f.save,
              onClick: handleSavePrefs,
              children: "שמירה"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: styles$f.back,
              onClick: () => setView("notice"),
              children: "חזרה"
            }
          )
        ] })
      ] }) })
    }
  );
}
const skipLink = "_skipLink_yas7b_9";
const styles$e = {
  skipLink
};
const AD_MEASUREMENT_PATHS = [
  "/",
  "/cards",
  "/pricing",
  "/contact",
  "/blog",
  "/guides"
];
function isApprovedAdPath(pathname) {
  return AD_MEASUREMENT_PATHS.some(
    (p2) => pathname === p2 || p2 !== "/" && pathname.startsWith(p2 + "/")
  );
}
function Layout() {
  const [reopenPrefs, setReopenPrefs] = useState(0);
  const handleOpenPrivacyPrefs = useCallback(
    () => setReopenPrefs((n) => n + 1),
    []
  );
  const location = useLocation();
  useEffect(() => {
    if (!isApprovedAdPath(location.pathname)) return;
    const state = getConsentState();
    if (state) pushConsentToDataLayer(state);
  }, [location.pathname]);
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("a", { href: "#main-content", className: styles$e.skipLink, children: "דלג לתוכן הראשי" }),
    /* @__PURE__ */ jsx(ScrollToTop, {}),
    /* @__PURE__ */ jsx(Header, {}),
    /* @__PURE__ */ jsx("div", { id: "main-content", tabIndex: -1, children: /* @__PURE__ */ jsx(Outlet, {}) }),
    /* @__PURE__ */ jsx(Footer, { onOpenPrivacyPrefs: handleOpenPrivacyPrefs }),
    /* @__PURE__ */ jsx(CookieConsentBanner, { reopenPrefs })
  ] });
}
const root$3 = "_root_1v1kt_1";
const title = "_title_1v1kt_23";
const subtitle = "_subtitle_1v1kt_35";
const button = "_button_1v1kt_49";
const styles$d = {
  root: root$3,
  title,
  subtitle,
  button
};
const RELOAD_GUARD_KEY = "digitalyty_chunk_reload_once";
function isChunkLoadError(err) {
  const msg = String(err?.message || "").toLowerCase();
  if (msg.includes("chunkloaderror")) return true;
  if (msg.includes("loading chunk")) return true;
  if (msg.includes("failed to fetch dynamically imported module"))
    return true;
  if (msg.includes("importing a module script failed")) return true;
  return false;
}
function canAttemptReload() {
  try {
    return typeof window !== "undefined" && window.sessionStorage?.getItem(RELOAD_GUARD_KEY) !== "1";
  } catch {
    return false;
  }
}
function markReloadAttempted() {
  try {
    window.sessionStorage?.setItem(RELOAD_GUARD_KEY, "1");
  } catch {
  }
}
class ChunkErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, reloaded: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error2) {
    try {
      if (!isChunkLoadError(error2)) return;
      if (!canAttemptReload()) return;
      markReloadAttempted();
      this.setState({ reloaded: true });
      window.location.reload();
    } catch {
    }
  }
  render() {
    if (!this.state.hasError) return this.props.children;
    const label2 = typeof this.props.label === "string" && this.props.label.trim() ? this.props.label.trim() : "אירעה שגיאה בטעינת הדף";
    return /* @__PURE__ */ jsxs("div", { className: styles$d.root, dir: "rtl", role: "alert", children: [
      /* @__PURE__ */ jsx("div", { className: styles$d.title, children: label2 }),
      /* @__PURE__ */ jsx("div", { className: styles$d.subtitle, children: "נסה לרענן את הדף. אם זה קורה אחרי עדכון גרסה, ייתכן שהדפדפן שמר קאש ישן." }),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: styles$d.button,
          onClick: () => window.location.reload(),
          children: "רענן"
        }
      )
    ] });
  }
}
const root$2 = "_root_18vtn_1";
const label = "_label_18vtn_23";
const spinner = "_spinner_18vtn_33";
const styles$c = {
  root: root$2,
  label,
  spinner
};
function RouteFallback({ label: label2 = "טוען…" } = {}) {
  return /* @__PURE__ */ jsxs("div", { className: styles$c.root, dir: "rtl", role: "status", "aria-live": "polite", children: [
    /* @__PURE__ */ jsx("div", { className: styles$c.spinner, "aria-hidden": "true" }),
    /* @__PURE__ */ jsx("div", { className: styles$c.label, children: label2 })
  ] });
}
const EXACT_PLACEHOLDERS = /* @__PURE__ */ new Set(["GTM-XXXXXXX", "G-XXXXXXX"]);
const BLOCKED_GTM_IDS = /* @__PURE__ */ new Set(["GTM-W6Q8DP6R"]);
const BLOCKED_PIXEL_IDS = /* @__PURE__ */ new Set(["1901625820558020"]);
function toTrimmedString(value) {
  if (value === null || value === void 0) return "";
  return String(value).trim();
}
function containsAngleBrackets(value) {
  return /[<>]/.test(value);
}
function normalizeRobots(value) {
  const raw = toTrimmedString(value);
  if (!raw) return "";
  if (containsAngleBrackets(raw)) return "";
  return raw;
}
function normalizeVerificationToken(value) {
  const raw = toTrimmedString(value);
  if (!raw) return "";
  if (containsAngleBrackets(raw)) return "";
  return raw;
}
function normalizeGtmId(value) {
  const raw = toTrimmedString(value);
  if (!raw) return "";
  if (EXACT_PLACEHOLDERS.has(raw)) return "";
  const normalized = raw.toUpperCase();
  if (!/^GTM-[A-Z0-9]+$/.test(normalized)) return "";
  if (BLOCKED_GTM_IDS.has(normalized)) return "";
  return normalized;
}
function normalizeGaMeasurementId(value) {
  const raw = toTrimmedString(value);
  if (!raw) return "";
  if (EXACT_PLACEHOLDERS.has(raw)) return "";
  const normalized = raw.toUpperCase();
  if (!/^G-[A-Z0-9]+$/.test(normalized)) return "";
  return normalized;
}
function normalizeMetaPixelId(value) {
  const raw = toTrimmedString(value);
  if (!raw) return "";
  if (!/^[0-9]{5,20}$/.test(raw)) return "";
  if (BLOCKED_PIXEL_IDS.has(raw)) return "";
  return raw;
}
function buildGtmSnippet(gtmId) {
  return `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`;
}
function buildGtagInitSnippet(gaMeasurementId) {
  return `window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', '${gaMeasurementId}');`;
}
function buildMetaPixelSnippet(metaPixelId) {
  return `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaPixelId}');fbq('track','PageView');`;
}
function safeJsonParse(value) {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null) return null;
    if (typeof parsed !== "object" && !Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}
function normalizeJsonLdItems(jsonLd, jsonLdItems) {
  const items = [];
  const existing = safeJsonParse(jsonLd);
  if (existing) items.push(existing);
  const extra = Array.isArray(jsonLdItems) ? jsonLdItems : [];
  for (const item of extra) {
    if (!item) continue;
    items.push(item);
  }
  return items;
}
function SeoHelmet({
  title: title2,
  description,
  robots,
  googleSiteVerification,
  facebookDomainVerification,
  canonicalUrl: canonicalUrl2,
  url,
  image,
  ogType = "website",
  jsonLd,
  jsonLdItems,
  gtmId,
  gaMeasurementId,
  metaPixelId,
  articlePublishedTime,
  articleModifiedTime,
  articleAuthor,
  imageAlt
}) {
  const scripts = normalizeJsonLdItems(jsonLd, jsonLdItems);
  const robotsNormalized = normalizeRobots(robots);
  const googleSiteVerificationNormalized = normalizeVerificationToken(
    googleSiteVerification
  );
  const facebookDomainVerificationNormalized = normalizeVerificationToken(
    facebookDomainVerification
  );
  const gtmIdNormalized = normalizeGtmId(gtmId);
  const gaMeasurementIdNormalized = normalizeGaMeasurementId(gaMeasurementId);
  const metaPixelIdNormalized = normalizeMetaPixelId(metaPixelId);
  const trackingMode = gtmIdNormalized ? "gtm" : gaMeasurementIdNormalized ? "ga" : metaPixelIdNormalized ? "pixel" : "none";
  return /* @__PURE__ */ jsxs(Helmet, { children: [
    title2 ? /* @__PURE__ */ jsx("title", { children: title2 }) : null,
    description ? /* @__PURE__ */ jsx("meta", { name: "description", content: description }) : null,
    canonicalUrl2 ? /* @__PURE__ */ jsx("link", { rel: "canonical", href: canonicalUrl2 }) : null,
    robotsNormalized ? /* @__PURE__ */ jsx("meta", { name: "robots", content: robotsNormalized }) : null,
    googleSiteVerificationNormalized ? /* @__PURE__ */ jsx(
      "meta",
      {
        name: "google-site-verification",
        content: googleSiteVerificationNormalized
      }
    ) : null,
    facebookDomainVerificationNormalized ? /* @__PURE__ */ jsx(
      "meta",
      {
        name: "facebook-domain-verification",
        content: facebookDomainVerificationNormalized
      }
    ) : null,
    /* @__PURE__ */ jsx("meta", { property: "og:locale", content: "he_IL" }),
    /* @__PURE__ */ jsx("meta", { property: "og:site_name", content: "Cardigo" }),
    /* @__PURE__ */ jsx("meta", { property: "og:type", content: ogType }),
    title2 ? /* @__PURE__ */ jsx("meta", { property: "og:title", content: title2 }) : null,
    description ? /* @__PURE__ */ jsx("meta", { property: "og:description", content: description }) : null,
    image ? /* @__PURE__ */ jsx("meta", { property: "og:image", content: image }) : null,
    image && imageAlt ? /* @__PURE__ */ jsx("meta", { property: "og:image:alt", content: imageAlt }) : null,
    url ? /* @__PURE__ */ jsx("meta", { property: "og:url", content: url }) : null,
    articlePublishedTime ? /* @__PURE__ */ jsx(
      "meta",
      {
        property: "article:published_time",
        content: articlePublishedTime
      }
    ) : null,
    articleModifiedTime ? /* @__PURE__ */ jsx(
      "meta",
      {
        property: "article:modified_time",
        content: articleModifiedTime
      }
    ) : null,
    articleAuthor ? /* @__PURE__ */ jsx("meta", { property: "article:author", content: articleAuthor }) : null,
    /* @__PURE__ */ jsx(
      "meta",
      {
        name: "twitter:card",
        content: image ? "summary_large_image" : "summary"
      }
    ),
    title2 ? /* @__PURE__ */ jsx("meta", { name: "twitter:title", content: title2 }) : null,
    description ? /* @__PURE__ */ jsx("meta", { name: "twitter:description", content: description }) : null,
    image ? /* @__PURE__ */ jsx("meta", { name: "twitter:image", content: image }) : null,
    image && imageAlt ? /* @__PURE__ */ jsx("meta", { name: "twitter:image:alt", content: imageAlt }) : null,
    trackingMode === "gtm" ? /* @__PURE__ */ jsx("script", { children: buildGtmSnippet(gtmIdNormalized) }, "gtm-inline") : null,
    trackingMode === "ga" ? /* @__PURE__ */ jsx(
      "script",
      {
        async: true,
        src: `https://www.googletagmanager.com/gtag/js?id=${gaMeasurementIdNormalized}`
      },
      "gtag-src"
    ) : null,
    trackingMode === "ga" ? /* @__PURE__ */ jsx("script", { children: buildGtagInitSnippet(gaMeasurementIdNormalized) }, "gtag-inline") : null,
    trackingMode === "pixel" ? /* @__PURE__ */ jsx("script", { children: buildMetaPixelSnippet(metaPixelIdNormalized) }, "pixel-inline") : null,
    scripts.map((obj, index) => /* @__PURE__ */ jsx(
      "script",
      {
        type: "application/ld+json",
        children: JSON.stringify(obj).replace(/<\/script>/gi, "<\\/script>")
      },
      `jsonld-${index}`
    ))
  ] });
}
const DEFAULT_OG_IMAGE_PATH = "/images/og/cardigo-home-og-1200x630.jpg?v=20260519";
const SITE_ACTIONS = Object.freeze({
  home_hero_primary_register: "home_hero_primary_register",
  home_hero_secondary_examples: "home_hero_secondary_examples",
  home_templates_cta: "home_templates_cta",
  home_templates_see_all: "home_templates_see_all",
  home_bottom_cta: "home_bottom_cta",
  pricing_trial_start: "pricing_trial_start",
  pricing_premium_upgrade: "pricing_premium_upgrade",
  pricing_monthly_start: "pricing_monthly_start",
  pricing_annual_start: "pricing_annual_start",
  cards_hero_cta: "cards_hero_cta",
  cards_templates_cta: "cards_templates_cta",
  cards_bottom_cta: "cards_bottom_cta",
  cards_showcase_card_cta: "cards_showcase_card_cta",
  cards_showcase_view_all_cta: "cards_showcase_view_all_cta",
  blog_article_click: "blog_article_click",
  guide_article_click: "guide_article_click",
  contact_email_click: "contact_email_click",
  contact_form_submit: "contact_form_submit",
  contact_whatsapp_click: "contact_whatsapp_click"
});
const VALUES = Object.freeze(Object.values(SITE_ACTIONS));
new Set(VALUES);
const STORAGE_KEY_DEVICE = "digitalyty_deviceId";
const STORAGE_KEY_VISIT = "digitalyty_visitId";
const STORAGE_KEY_VISIT_ACTIVITY = "digitalyty_visitActivity";
const SESSION_TIMEOUT_MS = 30 * 60 * 1e3;
let _fallbackDeviceId = null;
let _fallbackVisitId = null;
let _fallbackVisitActivity = 0;
function generateUuid() {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
  }
  const bytes = new Uint8Array(16);
  try {
    crypto.getRandomValues(bytes);
  } catch {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = bytes[6] & 15 | 64;
  bytes[8] = bytes[8] & 63 | 128;
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function lsGet(key) {
  try {
    return typeof window !== "undefined" ? window.localStorage?.getItem(key) ?? null : null;
  } catch {
    return null;
  }
}
function lsSet(key, value) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage?.setItem(key, String(value));
    }
  } catch {
  }
}
function getOrCreateDeviceId() {
  const stored = lsGet(STORAGE_KEY_DEVICE);
  if (stored) return stored;
  const id = generateUuid();
  lsSet(STORAGE_KEY_DEVICE, id);
  if (lsGet(STORAGE_KEY_DEVICE) === id) return id;
  if (!_fallbackDeviceId) _fallbackDeviceId = id;
  return _fallbackDeviceId;
}
function getOrCreateVisitId() {
  const now = Date.now();
  const storedId = lsGet(STORAGE_KEY_VISIT);
  const storedActivity = Number(lsGet(STORAGE_KEY_VISIT_ACTIVITY)) || 0;
  const isTimedOut = !storedActivity || now - storedActivity > SESSION_TIMEOUT_MS;
  if (storedId && !isTimedOut) {
    lsSet(STORAGE_KEY_VISIT_ACTIVITY, String(now));
    return storedId;
  }
  const newId = generateUuid();
  lsSet(STORAGE_KEY_VISIT, newId);
  lsSet(STORAGE_KEY_VISIT_ACTIVITY, String(now));
  if (lsGet(STORAGE_KEY_VISIT) === newId) return newId;
  const fallbackTimedOut = !_fallbackVisitActivity || now - _fallbackVisitActivity > SESSION_TIMEOUT_MS;
  if (!_fallbackVisitId || fallbackTimedOut) {
    _fallbackVisitId = newId;
  }
  _fallbackVisitActivity = now;
  return _fallbackVisitId;
}
const STORAGE_KEY_UTM = "digitalyty_utm";
function getUtm() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    const source = params.get("utm_source") || "";
    const campaign = params.get("utm_campaign") || "";
    const medium2 = params.get("utm_medium") || "";
    const utm = {
      source: source || void 0,
      campaign: campaign || void 0,
      medium: medium2 || void 0
    };
    const hasAny = Boolean(utm.source || utm.campaign || utm.medium);
    if (hasAny) {
      sessionStorage.setItem(STORAGE_KEY_UTM, JSON.stringify(utm));
      return utm;
    }
    const cached = sessionStorage.getItem(STORAGE_KEY_UTM);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === "object") return parsed;
      } catch {
      }
    }
    return {};
  } catch {
    return {};
  }
}
const OPT_OUT_KEY = "siteAnalyticsOptOut";
const DEDUPE_WINDOW_MS = 2500;
let lastSent = { key: "", ts: 0 };
const EXCLUDED_PREFIXES = Object.freeze([
  "/admin",
  "/api",
  "/assets/",
  "/.netlify/",
  "/edit"
]);
const EXCLUDED_EXACT = /* @__PURE__ */ new Set([
  "/login",
  "/register",
  "/editor",
  "/dashboard",
  "/account",
  "/billing",
  "/settings",
  "/robots.txt",
  "/service-worker.js"
]);
function isExcludedPagePath(pagePath) {
  const p2 = String(pagePath || "");
  if (!p2 || !p2.startsWith("/")) return true;
  if (EXCLUDED_EXACT.has(p2)) return true;
  if (p2.startsWith("/sitemap")) return true;
  if (p2.startsWith("/manifest")) return true;
  if (p2.startsWith("/favicon")) return true;
  if (p2 === "/assets") return true;
  for (const prefix of EXCLUDED_PREFIXES) {
    if (p2 === prefix) return true;
    if (p2.startsWith(prefix)) return true;
  }
  return false;
}
function shouldTrackSitePagePath(pagePath) {
  const p2 = String(pagePath || "");
  if (!p2) return false;
  if (p2 === "/card" || p2.startsWith("/card/")) return false;
  if (p2 === "/c" || p2.startsWith("/c/")) return false;
  if (isExcludedPagePath(p2)) return false;
  return true;
}
function isOptedOut() {
  try {
    return typeof window !== "undefined" && window.localStorage?.getItem(OPT_OUT_KEY) === "1";
  } catch {
    return false;
  }
}
function send(payload, { preferFetch = false } = {}) {
  try {
    const body2 = JSON.stringify(payload);
    const url = "/api/site-analytics/track";
    if (!preferFetch) {
      if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
        const blob = new Blob([body2], { type: "application/json" });
        const ok = navigator.sendBeacon(url, blob);
        if (ok) return;
      }
    }
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body2,
      keepalive: true
    }).catch(() => {
    });
  } catch {
  }
}
function pushToDataLayer(eventName, pagePath) {
  try {
    if (typeof window === "undefined") return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "cardigo_event",
      event_name: eventName,
      page_path: pagePath
    });
  } catch {
  }
}
function trackRegistrationComplete() {
  try {
    if (typeof window === "undefined") return;
    let consentOptionalTracking = null;
    try {
      const raw = window.localStorage?.getItem(
        "cardigo_cookie_consent_v1"
      );
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && parsed.version === 1) {
          consentOptionalTracking = Boolean(
            parsed.optionalTrackingAllowed
          );
        }
      }
    } catch {
    }
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "cardigo_event",
      event_name: "registration_complete",
      cardigo_consent_optional_tracking: consentOptionalTracking
    });
  } catch {
  }
}
function trackSitePageView({ siteKey = "main" } = {}) {
  try {
    if (isOptedOut()) return;
    const pagePath = window.location?.pathname || "";
    if (!shouldTrackSitePagePath(pagePath)) return;
    const now = Date.now();
    const key = `view::${pagePath}`;
    if (lastSent.key === key && now - lastSent.ts < DEDUPE_WINDOW_MS)
      return;
    lastSent = { key, ts: now };
    send({
      event: "view",
      siteKey,
      pagePath,
      utm: getUtm(),
      ref: document.referrer || "",
      deviceId: getOrCreateDeviceId(),
      visitId: getOrCreateVisitId()
    });
  } catch {
  }
}
function trackSiteClick({
  action,
  siteKey = "main",
  pagePath: providedPagePath
} = {}) {
  try {
    if (isOptedOut()) return;
    const pagePath = typeof providedPagePath === "string" && providedPagePath ? providedPagePath : window.location?.pathname || "";
    if (!shouldTrackSitePagePath(pagePath)) return;
    const a = String(action || "").trim();
    if (!a) return;
    try {
      if (false) ;
    } catch {
    }
    const now = Date.now();
    const key = `click::${pagePath}::${a}`;
    if (lastSent.key === key && now - lastSent.ts < DEDUPE_WINDOW_MS)
      return;
    lastSent = { key, ts: now };
    send(
      {
        event: "click",
        action: a,
        siteKey,
        pagePath,
        utm: getUtm(),
        ref: document.referrer || "",
        deviceId: getOrCreateDeviceId(),
        visitId: getOrCreateVisitId()
      },
      { preferFetch: true }
    );
    pushToDataLayer(a, pagePath);
  } catch {
  }
}
const scrollZoomSoft = "_scrollZoomSoft_11tss_27";
const scrollDriftInline = "_scrollDriftInline_11tss_93";
const scroll = {
  scrollZoomSoft,
  scrollDriftInline
};
const REDUCED = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function useScrollProgress({
  threshold = 0,
  rootMargin = "0px 0px 0px 0px"
} = {}) {
  const nodeRef = useRef(null);
  const isVisibleRef = useRef(false);
  const rafRef = useRef(0);
  const lastValueRef = useRef(-1);
  useEffect(() => {
    if (REDUCED) return;
    function computeProgress() {
      const el = nodeRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const raw = (vh - rect.top) / (vh + rect.height);
      const clamped = Math.min(1, Math.max(0, raw));
      const rounded = Math.round(clamped * 1e3) / 1e3;
      if (rounded !== lastValueRef.current) {
        lastValueRef.current = rounded;
        el.style.setProperty("--scroll-progress", rounded);
      }
    }
    function onScroll() {
      if (!isVisibleRef.current) return;
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        computeProgress();
      });
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          isVisibleRef.current = entry.isIntersecting;
          if (entry.isIntersecting) computeProgress();
        }
      },
      { threshold, rootMargin }
    );
    if (nodeRef.current) io.observe(nodeRef.current);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [threshold, rootMargin]);
  const ref = useCallback((el) => {
    nodeRef.current = el;
  }, []);
  return { ref };
}
const sectionLight = "_sectionLight_1o7os_19";
const sectionDark = "_sectionDark_1o7os_79";
const sectionWrap = "_sectionWrap_1o7os_93";
const illustrationOnlyTxt = "_illustrationOnlyTxt_1o7os_123";
const goldHilight = "_goldHilight_1o7os_135";
const goldUnderline = "_goldUnderline_1o7os_167";
const boldTxt = "_boldTxt_1o7os_177";
const h2Gold = "_h2Gold_1o7os_189";
const h2White = "_h2White_1o7os_247";
const sectionLead = "_sectionLead_1o7os_265";
const sectionLeadLight = "_sectionLeadLight_1o7os_281";
const highlight = "_highlight_1o7os_301";
const faq = "_faq_1o7os_353";
const qa = "_qa_1o7os_371";
const answer = "_answer_1o7os_455";
const pub = {
  sectionLight,
  sectionDark,
  sectionWrap,
  illustrationOnlyTxt,
  goldHilight,
  goldUnderline,
  boldTxt,
  h2Gold,
  h2White,
  sectionLead,
  sectionLeadLight,
  highlight,
  faq,
  qa,
  answer
};
function CrownIcon({ className, title: title2 }) {
  const isDecorative = !title2;
  return /* @__PURE__ */ jsxs(
    "svg",
    {
      className,
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 4.50 24 24",
      fill: "currentColor",
      focusable: "false",
      "aria-hidden": isDecorative ? "true" : void 0,
      role: title2 ? "img" : void 0,
      children: [
        title2 ? /* @__PURE__ */ jsx("title", { children: title2 }) : null,
        /* @__PURE__ */ jsx(
          "path",
          {
            fillRule: "evenodd",
            clipRule: "evenodd",
            d: "M4.35 9.18a.85.85 0 0 1 1.22-.32l3.73 2.26 2.02-4.02a.85.85 0 0 1 1.52 0l2.02 4.02 3.73-2.26a.85.85 0 0 1 1.27.88l-1.12 7.62a1.2 1.2 0 0 1-1.19 1.03H6.66a1.2 1.2 0 0 1-1.19-1.03L4.35 9.18ZM6.7 20.25c-.55 0-1 .45-1 1s.45 1 1 1h10.6c.55 0 1-.45 1-1s-.45-1-1-1H6.7Z"
          }
        ),
        /* @__PURE__ */ jsx("circle", { cx: "7.2", cy: "9.2", r: "1.05" }),
        /* @__PURE__ */ jsx("circle", { cx: "12", cy: "7.2", r: "1.15" }),
        /* @__PURE__ */ jsx("circle", { cx: "16.8", cy: "9.2", r: "1.05" })
      ]
    }
  );
}
const page$4 = "_page_8h001_1";
const strongerZoom = "_strongerZoom_8h001_9";
const dashboardZoom = "_dashboardZoom_8h001_17";
const hero = "_hero_8h001_25";
const heroInner = "_heroInner_8h001_43";
const heroText = "_heroText_8h001_85";
const heroLogoLink = "_heroLogoLink_8h001_133";
const heroLogoImage = "_heroLogoImage_8h001_157";
const kicker$1 = "_kicker_8h001_171";
const h1$9 = "_h1_8h001_203";
const h1Accent$4 = "_h1Accent_8h001_255";
const p = "_p_8h001_1";
const heroActions$3 = "_heroActions_8h001_337";
const heroCta$3 = "_heroCta_8h001_359";
const heroTrialNote$2 = "_heroTrialNote_8h001_407";
const heroTrialCrown$2 = "_heroTrialCrown_8h001_431";
const heroCards = "_heroCards_8h001_477";
const heroCardImg = "_heroCardImg_8h001_537";
const levitate = "_levitate_8h001_1";
const badges = "_badges_8h001_661";
const heroMock = "_heroMock_8h001_749";
const mockCard = "_mockCard_8h001_759";
const mockTop = "_mockTop_8h001_781";
const mockLine = "_mockLine_8h001_795";
const mockBtns = "_mockBtns_8h001_811";
const mockBtn = "_mockBtn_8h001_811";
const mockGrid = "_mockGrid_8h001_841";
const mockTile = "_mockTile_8h001_855";
const analyticsLeadBrand = "_analyticsLeadBrand_8h001_897";
const analyticsLeadPunch = "_analyticsLeadPunch_8h001_909";
const presenceLead = "_presenceLead_8h001_933";
const presenceLeadBrand = "_presenceLeadBrand_8h001_953";
const presenceLeadPunch = "_presenceLeadPunch_8h001_965";
const presenceFeatures = "_presenceFeatures_8h001_995";
const presenceMore = "_presenceMore_8h001_1011";
const presenceChip = "_presenceChip_8h001_1029";
const presenceIcon = "_presenceIcon_8h001_1073";
const presenceMedia = "_presenceMedia_8h001_1095";
const phoneStage = "_phoneStage_8h001_1111";
const phoneImage = "_phoneImage_8h001_1167";
const proofCard = "_proofCard_8h001_1191";
const proofCardTitle = "_proofCardTitle_8h001_1207";
const proofCardImage = "_proofCardImage_8h001_1231";
const proofTopStart = "_proofTopStart_8h001_1253";
const proofCenter = "_proofCenter_8h001_1265";
const proofBottomStart = "_proofBottomStart_8h001_1279";
const proofTopEnd = "_proofTopEnd_8h001_1291";
const proofBottomEnd = "_proofBottomEnd_8h001_1303";
const conversionRow = "_conversionRow_8h001_1319";
const conversionCard = "_conversionCard_8h001_1335";
const conversionMedia = "_conversionMedia_8h001_1433";
const conversionImg = "_conversionImg_8h001_1445";
const conversionIcon = "_conversionIcon_8h001_1461";
const conversionHeader = "_conversionHeader_8h001_1477";
const conversionTitle = "_conversionTitle_8h001_1497";
const conversionText = "_conversionText_8h001_1511";
const analyticsSection = "_analyticsSection_8h001_1533";
const analyticsDashImg = "_analyticsDashImg_8h001_1541";
const analyticsInsights = "_analyticsInsights_8h001_1575";
const insightBullet = "_insightBullet_8h001_1593";
const insightMedia = "_insightMedia_8h001_1675";
const insightImg = "_insightImg_8h001_1687";
const insightBody = "_insightBody_8h001_1701";
const insightIcon = "_insightIcon_8h001_1717";
const insightTitle = "_insightTitle_8h001_1733";
const insightText = "_insightText_8h001_1747";
const analyticsCaveat = "_analyticsCaveat_8h001_1759";
const shareChecklist = "_shareChecklist_8h001_1775";
const shareCheckItem = "_shareCheckItem_8h001_1795";
const shareCheckText = "_shareCheckText_8h001_1827";
const shareCheckBold = "_shareCheckBold_8h001_1839";
const shareCheckDesc = "_shareCheckDesc_8h001_1853";
const shareRow = "_shareRow_8h001_1865";
const shareCard = "_shareCard_8h001_1881";
const shareMedia = "_shareMedia_8h001_1983";
const shareImg = "_shareImg_8h001_1995";
const shareBody = "_shareBody_8h001_2009";
const shareIcon = "_shareIcon_8h001_2027";
const shareTitle = "_shareTitle_8h001_2043";
const shareText = "_shareText_8h001_2057";
const editChecklist = "_editChecklist_8h001_2073";
const editCheckItem = "_editCheckItem_8h001_2099";
const editCheckText = "_editCheckText_8h001_2131";
const editCheckBold = "_editCheckBold_8h001_2143";
const editCheckDesc = "_editCheckDesc_8h001_2157";
const editorDashImg = "_editorDashImg_8h001_2169";
const controlItems = "_controlItems_8h001_2197";
const controlItem = "_controlItem_8h001_2197";
const controlMedia = "_controlMedia_8h001_2295";
const controlImg = "_controlImg_8h001_2307";
const controlBody = "_controlBody_8h001_2321";
const controlItemIcon = "_controlItemIcon_8h001_2339";
const controlItemTitle = "_controlItemTitle_8h001_2355";
const controlItemDesc = "_controlItemDesc_8h001_2369";
const templatesShowcase = "_templatesShowcase_8h001_2385";
const templateCard = "_templateCard_8h001_2405";
const templateCardImg = "_templateCardImg_8h001_2429";
const templateCardName = "_templateCardName_8h001_2445";
const center = "_center_8h001_2459";
const templatesSeeAll = "_templatesSeeAll_8h001_2471";
const caveatLink = "_caveatLink_8h001_2497";
const steps = "_steps_8h001_2521";
const step = "_step_8h001_2521";
const stepWide = "_stepWide_8h001_2629";
const stepMedia = "_stepMedia_8h001_2637";
const stepImg = "_stepImg_8h001_2645";
const stepBody = "_stepBody_8h001_2659";
const stepNum = "_stepNum_8h001_2675";
const stepTitle = "_stepTitle_8h001_2721";
const stepText = "_stepText_8h001_2739";
const ctaSection = "_ctaSection_8h001_2763";
const ctaInner = "_ctaInner_8h001_2771";
const ctaTitle = "_ctaTitle_8h001_2809";
const ctaText$1 = "_ctaText_8h001_2821";
const ctaImg$1 = "_ctaImg_8h001_2835";
const ctaBtn = "_ctaBtn_8h001_2853";
const heroShine = "_heroShine_8h001_1";
const ctaGlow = "_ctaGlow_8h001_1";
const styles$b = {
  page: page$4,
  strongerZoom,
  dashboardZoom,
  hero,
  heroInner,
  heroText,
  heroLogoLink,
  heroLogoImage,
  kicker: kicker$1,
  h1: h1$9,
  h1Accent: h1Accent$4,
  p,
  heroActions: heroActions$3,
  heroCta: heroCta$3,
  heroTrialNote: heroTrialNote$2,
  heroTrialCrown: heroTrialCrown$2,
  heroCards,
  heroCardImg,
  levitate,
  badges,
  heroMock,
  mockCard,
  mockTop,
  mockLine,
  mockBtns,
  mockBtn,
  mockGrid,
  mockTile,
  analyticsLeadBrand,
  analyticsLeadPunch,
  presenceLead,
  presenceLeadBrand,
  presenceLeadPunch,
  presenceFeatures,
  presenceMore,
  presenceChip,
  presenceIcon,
  presenceMedia,
  phoneStage,
  phoneImage,
  proofCard,
  proofCardTitle,
  proofCardImage,
  proofTopStart,
  proofCenter,
  proofBottomStart,
  proofTopEnd,
  proofBottomEnd,
  conversionRow,
  conversionCard,
  conversionMedia,
  conversionImg,
  conversionIcon,
  conversionHeader,
  conversionTitle,
  conversionText,
  analyticsSection,
  analyticsDashImg,
  analyticsInsights,
  insightBullet,
  insightMedia,
  insightImg,
  insightBody,
  insightIcon,
  insightTitle,
  insightText,
  analyticsCaveat,
  shareChecklist,
  shareCheckItem,
  shareCheckText,
  shareCheckBold,
  shareCheckDesc,
  shareRow,
  shareCard,
  shareMedia,
  shareImg,
  shareBody,
  shareIcon,
  shareTitle,
  shareText,
  editChecklist,
  editCheckItem,
  editCheckText,
  editCheckBold,
  editCheckDesc,
  editorDashImg,
  controlItems,
  controlItem,
  controlMedia,
  controlImg,
  controlBody,
  controlItemIcon,
  controlItemTitle,
  controlItemDesc,
  templatesShowcase,
  templateCard,
  templateCardImg,
  templateCardName,
  center,
  templatesSeeAll,
  caveatLink,
  steps,
  step,
  stepWide,
  stepMedia,
  stepImg,
  stepBody,
  stepNum,
  stepTitle,
  stepText,
  ctaSection,
  ctaInner,
  ctaTitle,
  ctaText: ctaText$1,
  ctaImg: ctaImg$1,
  ctaBtn,
  heroShine,
  ctaGlow
};
function svgProps(className, title2) {
  const decorative = !title2;
  return {
    className,
    xmlns: "http://www.w3.org/2000/svg",
    width: "24",
    height: "24",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    focusable: "false",
    "aria-hidden": decorative ? "true" : void 0,
    role: title2 ? "img" : void 0
  };
}
function PhoneIcon({ className, title: title2 }) {
  return /* @__PURE__ */ jsxs("svg", { ...svgProps(className, title2), children: [
    title2 ? /* @__PURE__ */ jsx("title", { children: title2 }) : null,
    /* @__PURE__ */ jsx("path", { d: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" })
  ] });
}
function ChatIcon({ className, title: title2 }) {
  return /* @__PURE__ */ jsxs("svg", { ...svgProps(className, title2), children: [
    title2 ? /* @__PURE__ */ jsx("title", { children: title2 }) : null,
    /* @__PURE__ */ jsx("path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" })
  ] });
}
function LocationIcon({ className, title: title2 }) {
  return /* @__PURE__ */ jsxs("svg", { ...svgProps(className, title2), children: [
    title2 ? /* @__PURE__ */ jsx("title", { children: title2 }) : null,
    /* @__PURE__ */ jsx("path", { d: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" }),
    /* @__PURE__ */ jsx("circle", { cx: "12", cy: "10", r: "3" })
  ] });
}
function VideoIcon({ className, title: title2 }) {
  return /* @__PURE__ */ jsxs("svg", { ...svgProps(className, title2), children: [
    title2 ? /* @__PURE__ */ jsx("title", { children: title2 }) : null,
    /* @__PURE__ */ jsx("rect", { x: "2", y: "4", width: "20", height: "16", rx: "2" }),
    /* @__PURE__ */ jsx(
      "polygon",
      {
        points: "10,8 16,12 10,16",
        fill: "currentColor",
        stroke: "none"
      }
    )
  ] });
}
function StarIcon({ className, title: title2 }) {
  return /* @__PURE__ */ jsxs("svg", { ...svgProps(className, title2), children: [
    title2 ? /* @__PURE__ */ jsx("title", { children: title2 }) : null,
    /* @__PURE__ */ jsx(
      "polygon",
      {
        points: "12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26",
        fill: "currentColor",
        stroke: "none"
      }
    )
  ] });
}
function QuestionIcon({ className, title: title2 }) {
  return /* @__PURE__ */ jsxs("svg", { ...svgProps(className, title2), children: [
    title2 ? /* @__PURE__ */ jsx("title", { children: title2 }) : null,
    /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "10" }),
    /* @__PURE__ */ jsx("path", { d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" }),
    /* @__PURE__ */ jsx("line", { x1: "12", y1: "17", x2: "12.01", y2: "17" })
  ] });
}
function LinkIcon({ className, title: title2 }) {
  return /* @__PURE__ */ jsxs("svg", { ...svgProps(className, title2), children: [
    title2 ? /* @__PURE__ */ jsx("title", { children: title2 }) : null,
    /* @__PURE__ */ jsx("path", { d: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" }),
    /* @__PURE__ */ jsx("path", { d: "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" })
  ] });
}
function QrCodeIcon({ className, title: title2 }) {
  return /* @__PURE__ */ jsxs("svg", { ...svgProps(className, title2), children: [
    title2 ? /* @__PURE__ */ jsx("title", { children: title2 }) : null,
    /* @__PURE__ */ jsx("rect", { x: "2", y: "2", width: "8", height: "8", rx: "1" }),
    /* @__PURE__ */ jsx("rect", { x: "14", y: "2", width: "8", height: "8", rx: "1" }),
    /* @__PURE__ */ jsx("rect", { x: "2", y: "14", width: "8", height: "8", rx: "1" }),
    /* @__PURE__ */ jsx("rect", { x: "15", y: "15", width: "3", height: "3" }),
    /* @__PURE__ */ jsx("path", { d: "M21 15v.01" }),
    /* @__PURE__ */ jsx("path", { d: "M21 21v.01" }),
    /* @__PURE__ */ jsx("path", { d: "M15 21v.01" })
  ] });
}
function PencilIcon({ className, title: title2 }) {
  return /* @__PURE__ */ jsxs("svg", { ...svgProps(className, title2), children: [
    title2 ? /* @__PURE__ */ jsx("title", { children: title2 }) : null,
    /* @__PURE__ */ jsx("path", { d: "M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" })
  ] });
}
function MobileIcon({ className, title: title2 }) {
  return /* @__PURE__ */ jsxs("svg", { ...svgProps(className, title2), children: [
    title2 ? /* @__PURE__ */ jsx("title", { children: title2 }) : null,
    /* @__PURE__ */ jsx("rect", { x: "5", y: "2", width: "14", height: "20", rx: "2", ry: "2" }),
    /* @__PURE__ */ jsx("line", { x1: "12", y1: "18", x2: "12.01", y2: "18" })
  ] });
}
function LockIcon({ className, title: title2 }) {
  return /* @__PURE__ */ jsxs("svg", { ...svgProps(className, title2), children: [
    title2 ? /* @__PURE__ */ jsx("title", { children: title2 }) : null,
    /* @__PURE__ */ jsx("rect", { x: "3", y: "11", width: "18", height: "11", rx: "2", ry: "2" }),
    /* @__PURE__ */ jsx("path", { d: "M7 11V7a5 5 0 0 1 10 0v4" })
  ] });
}
function ClickIcon({ className, title: title2 }) {
  return /* @__PURE__ */ jsxs("svg", { ...svgProps(className, title2), children: [
    title2 ? /* @__PURE__ */ jsx("title", { children: title2 }) : null,
    /* @__PURE__ */ jsx("path", { d: "M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" }),
    /* @__PURE__ */ jsx("path", { d: "M13 13l6 6" })
  ] });
}
const SECTION_2_IMG = "/images/home-page/main-sections/Section-2";
const CONVERSION_ITEMS = [
  {
    Icon: PhoneIcon,
    title: "חיוג ישיר",
    text: "הלקוח לוחץ ומתחיל שיחה מיידית - בדרך הכי קצרה אליכם",
    src: `${SECTION_2_IMG}/phone-call.webp`,
    alt: "חיוג ישיר מכרטיס ביקור דיגיטלי"
  },
  {
    Icon: ChatIcon,
    title: "וואטסאפ מיידי",
    text: "פתיחת שיחה מיידית בוואטסאפ עם הודעה מוכנה מראש",
    src: `${SECTION_2_IMG}/watsapp.webp`,
    alt: "שליחת וואטסאפ מכרטיס ביקור דיגיטלי"
  },
  {
    Icon: ContentIcon,
    title: "טופס פניות",
    text: "לקוחות משאירים פרטים - ואתם חוזרים בזמן שנוח לכם",
    src: `${SECTION_2_IMG}/lead.webp`,
    alt: "טופס פניות בכרטיס ביקור דיגיטלי"
  },
  {
    Icon: LocationIcon,
    title: "ניווט ישיר ",
    text: "  מסלול לעסק בלחיצה אחת - בלי לשאול איך מגיעים",
    src: `${SECTION_2_IMG}/waze.webp`,
    alt: "ניווט ישיר מכרטיס ביקור דיגיטלי"
  }
];
const SECTION_3_IMG = "/images/home-page/main-sections/Section-3";
const ANALYTICS_INSIGHTS = [
  {
    Icon: SeoIcon,
    title: "מקורות הגעה",
    text: "זהו את הפלטפורמות שמביאות הכי הרבה תנועה לכרטיס.",
    src: `${SECTION_3_IMG}/digital_business_card-marketing-distribution-channels.webp`,
    alt: "מקורות הגעה לכרטיס ביקור דיגיטלי"
  },
  {
    Icon: AnalyticsIcon,
    title: "ביצועי קמפיינים",
    text: "השוו תוצאות בין קמפיינים וגלו איפה כדאי להשקיע.",
    src: `${SECTION_3_IMG}/digital_business_card-marketing-campaign-performance.webp`,
    alt: "ביצועי קמפיינים בכרטיס ביקור דיגיטלי"
  },
  {
    Icon: ClickIcon,
    title: "פעולות גולשים",
    text: "דעו אילו פעולות הלקוחות מבצעים ומאיזה מקור.",
    src: `${SECTION_3_IMG}/digital_business_card-customer-click-behavior.webp`,
    alt: "התנהגות לקוחות בכרטיס ביקור דיגיטלי"
  },
  {
    Icon: LinkIcon,
    title: "ערוצי הפצה",
    text: "מדדו ביצועים לפי ערוץ וקישור - ותכוונו את השיווק.",
    src: `${SECTION_3_IMG}/digital_business_card-campaign-performance-robot.webp`,
    alt: "ערוצי הפצה בכרטיס ביקור דיגיטלי"
  }
];
const SECTION_4_IMG = "/images/home-page/main-sections/Section-4";
const SHARE_CHANNELS = [
  {
    Icon: LinkIcon,
    title: "קישור ישיר",
    text: "הכרטיס שלכם מוכן לשיתוף בכל מקום - מאימייל וחתימה דיגיטלית ועד ביו ברשתות וקישורים באתר.",
    src: `${SECTION_4_IMG}/digital_business_card-direct-link-online-sharing.webp`,
    alt: "שיתוף כרטיס ביקור דיגיטלי בקישור ישיר"
  },
  {
    Icon: QrCodeIcon,
    title: "QR Code",
    text: "הפכו כל שילוט, אריזה, פלייר או דלפק לנקודת מעבר ישירה אל הכרטיס הדיגיטלי שלכם.",
    src: `${SECTION_4_IMG}/digital_business_card-qr-code-scan-from-coffee-cup.webp`,
    alt: "סריקת QR לכרטיס ביקור דיגיטלי"
  },
  {
    Icon: ChatIcon,
    title: "WhatsApp",
    text: "שלחו את הכרטיס בוואטסאפ כלינק מסודר עם תצוגה מקדימה, כך שקל לשתף אותו גם בשיחה אישית וגם כהמלצה הלאה.",
    src: `${SECTION_4_IMG}/digital_business_card-whatsapp-business-card-sharing.webp`,
    alt: "שיתוף כרטיס ביקור דיגיטלי בוואטסאפ"
  },
  {
    Icon: SeoIcon,
    title: "קישורי קמפיין",
    text: "צרו קישורים ייעודיים לכל קמפיין, מודעה או פלטפורמה - כדי להפיץ נכון יותר ולזהות אילו ערוצים מביאים תנועה טובה יותר.",
    src: `${SECTION_4_IMG}/digital_business_card-marketing-campaign-tracking-links.webp`,
    alt: "קישורי קמפיין לכרטיס ביקור דיגיטלי"
  }
];
const PRESENCE_FEATURES = [
  { Icon: BookingIcon, label: "קביעת פגישות" },
  { Icon: GalleryIcon, label: "גלריית עבודות" },
  { Icon: WorkHoursIcon, label: "שעות פעילות" },
  { Icon: VideoIcon, label: "סרטון YouTube" },
  { Icon: StarIcon, label: "המלצות לקוחות" },
  { Icon: QuestionIcon, label: "שאלות נפוצות" },
  { Icon: ContentIcon, label: "טופס פניות" },
  { Icon: AnalyticsIcon, label: "אנליטיקה" },
  { Icon: SeoIcon, label: "יכול להופיע בגוגל" }
];
const SECTION_1_IMG = "/images/home-page/main-sections/Section-1";
const PRESENCE_PROOF_CARDS = [
  {
    title: "המלצות",
    src: `${SECTION_1_IMG}/review-cardigo-digital-bussines-card.webp`,
    alt: "המלצות לקוחות בכרטיס ביקור דיגיטלי",
    posClass: "proofTopStart"
  },
  {
    title: "קביעת פגישות",
    src: `${SECTION_1_IMG}/booking-cardigo-digital-bussines-card.webp`,
    alt: "קביעת פגישות בכרטיס ביקור דיגיטלי",
    posClass: "proofCenter"
  },
  {
    title: "כפתורי פעולה",
    src: `${SECTION_1_IMG}/social-buttons-cardigo-digital-bussines-card.webp`,
    alt: "כפתורי שיתוף ופעולה בכרטיס ביקור דיגיטלי",
    posClass: "proofBottomStart"
  },
  {
    title: "טופס לידים",
    src: `${SECTION_1_IMG}/lead-cardigo-digital-bussines-card.webp`,
    alt: "טופס יצירת קשר בכרטיס ביקור דיגיטלי",
    posClass: "proofTopEnd"
  },
  {
    title: "גלרית תמונות",
    src: `${SECTION_1_IMG}/gallery-cardigo-digital-bussines-card.webp`,
    alt: "גלרית תמונות בכרטיס ביקור דיגיטלי",
    posClass: "proofBottomEnd"
  }
];
function ProofCard({ title: title2, src, alt, posClass }) {
  const { ref } = useScrollProgress();
  return /* @__PURE__ */ jsx("div", { className: `${styles$b.proofCard} ${styles$b[posClass]}`, children: /* @__PURE__ */ jsx("div", { className: scroll.scrollDriftInline, ref, children: /* @__PURE__ */ jsx(
    "img",
    {
      className: styles$b.proofCardImage,
      src,
      alt,
      width: 200,
      height: 160,
      loading: "lazy",
      decoding: "async"
    }
  ) }) });
}
const SECTION_5_IMG = "/images/home-page/main-sections/Section-5";
const CONTROL_FEATURES = [
  {
    Icon: SelfDesignIcon,
    title: "החלפת עיצוב מיידית",
    text: "בחרו מ-25 תבניות מקצועיות והחליפו בלחיצה - התוכן נשמר.",
    src: `${SECTION_5_IMG}/cardigo-digital-business-card-design-templates.webp`,
    alt: "החלפת עיצוב כרטיס ביקור דיגיטלי"
  },
  {
    Icon: PencilIcon,
    title: "עריכת תוכן חופשית",
    text: "טקסטים, תמונות, קישורים, שאלות נפוצות - הכל מתעדכן מיד.",
    src: `${SECTION_5_IMG}/cardigo-digital-business-card-content-editor.webp`,
    alt: "עריכת תוכן בכרטיס ביקור דיגיטלי"
  },
  {
    Icon: MobileIcon,
    title: "מכל מכשיר",
    text: "ניתן לערוך גם מהנייד. עדכון מהיר מכל מכשיר.",
    src: `${SECTION_5_IMG}/cardigo-edit-digital-business-card-from-any-device.webp`,
    alt: "עריכת כרטיס ביקור דיגיטלי מכל מכשיר"
  },
  {
    Icon: LockIcon,
    title: "פרסום בשליטתכם",
    text: "פרסמו והסתירו את הכרטיס בכל רגע - אתם מחליטים מתי.",
    src: `${SECTION_5_IMG}/cardigo-publish-digital-business-card-control.webp`,
    alt: "שליטה בפרסום כרטיס ביקור דיגיטלי"
  }
];
const TEMPLATE_COVERS = "/images/home-page/main-sections/Section-6";
const TEMPLATE_SKINS = [
  {
    name: "Lakmi",
    src: `${TEMPLATE_COVERS}/כרטיס ביקור דיגיטלי לאדריכלית חוץ ונוף  כרדיגו.webp`
  },
  {
    name: "Laguna Afarsek",
    src: `${TEMPLATE_COVERS}/כרטיס ביקור דיגיטלי ליועצת חדשנות דיגיטלית ו-AI  כרדיגו.webp`
  },
  {
    name: "Iris Layla",
    src: `${TEMPLATE_COVERS}/כרטיס ביקור דיגיטלי למפיקת אירועי בוטיק  כרדיגו.webp`
  },
  {
    name: "Tehom Turkiz",
    src: `${TEMPLATE_COVERS}/כרטיס ביקור דיגיטלי ליועץ הון פרטי  כרדיגו.webp`
  },
  {
    name: "Bronze Sachlav",
    src: `${TEMPLATE_COVERS}/כרטיס ביקור דיגיטלי לרופאת שיניים אסתטית  כרדיגו.webp`
  },
  {
    name: "Zahav Laguna",
    src: `${TEMPLATE_COVERS}/כרטיס ביקור דיגיטלי קליניקה לאסטטיקה  כרדיגו.webp`
  }
];
const STEPS_IMG = "/images/home-page/main-sections/Section-7";
const STEPS = [
  {
    num: "1",
    title: "בוחרים עיצוב",
    text: "נרשמים בחינם ובוחרים תבנית שמתאימה לעסק.",
    src: `${STEPS_IMG}/cardigo-digital-business-card-template-selection.png.webp`,
    alt: "בחירת תבנית לכרטיס ביקור דיגיטלי"
  },
  {
    num: "2",
    title: "מוסיפים תוכן",
    text: "ממלאים פרטי קשר, תמונות, טקסט וקישורים.",
    src: `${STEPS_IMG}/cardigo-digital-business-card-content-editing.webp`,
    alt: "עריכת תוכן בכרטיס ביקור דיגיטלי"
  },
  {
    num: "3",
    title: "משתפים ומודדים",
    text: "מפיצים בקישור, QR או וואטסאפ – ועוקבים אחרי התוצאות.",
    src: `${STEPS_IMG}/cardigo-digital-business-card-sharing-and-analytics.png.webp`,
    alt: "שיתוף כרטיס ביקור דיגיטלי ומעקב אנליטיקס"
  }
];
const ORIGIN$2 = "https://cardigo.co.il";
const HOME_FAQ = [
  {
    q: "כמה זמן לוקח ליצור כרטיס ביקור דיגיטלי?",
    a: "בדרך כלל כמה דקות. בוחרים תבנית, מוסיפים פרטים ומתחילים לשתף את כרטיס הביקור הדיגיטלי שלכם."
  },
  {
    q: "צריך ידע טכני כדי לנהל את כרטיס הביקור הדיגיטלי?",
    a: "לא. העורך של Cardigo בנוי כך שתוכלו לעדכן טקסטים, תמונות, קישורים ופרטי קשר בעצמכם — בלי מפתח ובלי ידע טכני."
  },
  {
    q: "אפשר לעדכן פרטים אחרי שפרסמתי?",
    a: "כן. אתם יכולים לשנות כל פרט בכרטיס הביקור הדיגיטלי בכל רגע — טלפון, תמונות, עיצוב וטקסטים — והעדכון מופיע בקישור הקיים."
  },
  {
    q: "יש תכנית חינמית?",
    a: "כן. אפשר ליצור כרטיס ביקור דיגיטלי בחינם ולהתחיל להשתמש בו מיד. כשתצטרכו יכולות מתקדמות יותר, אפשר לשדרג למסלול פרימיום."
  },
  {
    q: "אפשר להחליף תבנית בלי לאבד תוכן?",
    a: "כן. כל התוכן שלכם נשמר, ורק העיצוב משתנה. כך אפשר לנסות כמה סגנונות עד שמוצאים את התבנית שמתאימה לעסק."
  },
  {
    q: "איך רואים מאיפה מגיעות הצפיות והפניות?",
    a: "במסלול הפרימיום תוכלו לראות מאילו מקורות מגיעה התנועה, על מה לוחצים, ואילו קישורים או פלטפורמות מביאים יותר תגובות. במסלול החינמי מוצגת תצוגה לדוגמה."
  },
  {
    q: "האם כרטיס הביקור הדיגיטלי יכול להופיע בגוגל?",
    a: "כן, הכרטיס הוא עמוד אינטרנט עם כתובת ייחודית, כך שהוא יכול להופיע בתוצאות חיפוש. אנחנו דואגים למבנה נכון שעוזר לגוגל להבין את העמוד, אבל כמו בכל אתר — ההופעה בתוצאות תלויה גם בגוגל עצמו."
  },
  {
    q: "איך משתפים את כרטיס הביקור הדיגיטלי?",
    a: "אפשר לשתף את הכרטיס בקישור ישיר, ב-QR, בוואטסאפ, ובקישורים ייעודיים לקמפיינים — כך שקל להפיץ אותו בכל מקום שבו הלקוחות כבר פוגשים אתכם."
  },
  {
    q: "מה ההבדל בין כרטיס ביקור דיגיטלי לאתר אינטרנט?",
    a: "כרטיס ביקור דיגיטלי של Cardigo הוא עמוד עסקי ממוקד שמוכן תוך דקות, קל לעדכון, ונוח מאוד לשיתוף. הוא לא מחליף אתר מלא, אבל כן נותן לעסק נוכחות מקצועית ומהירה באינטרנט."
  },
  {
    q: "אפשר להוסיף תמונות, סרטון והמלצות לכרטיס?",
    a: "כן. בכרטיס הביקור הדיגיטלי של Cardigo אפשר להציג תמונות, סרטון, המלצות ותוכן נוסף שיעזור לעסק להיראות מקצועי ואמין יותר."
  },
  {
    q: "אפשר לקבל פניות ישירות מתוך הכרטיס?",
    a: "כן. אפשר להוסיף לכרטיס הדיגיטלי דרכי יצירת קשר כמו טלפון, וואטסאפ, קישורים וטופס פנייה — כדי שללקוחות יהיה קל לפנות אליכם."
  },
  {
    q: "יש לכל כרטיס קישור אישי משלו?",
    a: "כן. לכל כרטיס ביקור דיגיטלי יש קישור ייחודי שאפשר לשלוח, לשתף, להוסיף לביו, לחתימה במייל או לכל מקום אחר שבו העסק שלכם מופיע."
  },
  {
    q: "אפשר להשתמש ב-QR כדי להפנות לכרטיס?",
    a: "כן. אפשר להוריד קוד QR ולהשתמש בו על כרטיסים מודפסים, שלטים, אריזות, דלפקים ואירועים — כדי להעביר אנשים ישר לכרטיס הדיגיטלי."
  },
  {
    q: "אפשר לנהל את הכרטיס גם מהטלפון?",
    a: "כן. אפשר לערוך ולעדכן את כרטיס הביקור הדיגיטלי גם מהטלפון, כך שקל לבצע שינויים מהירים גם כשאתם לא מול מחשב."
  },
  {
    q: "כרטיס ביקור דיגיטלי מתאים גם לעסק קטן או לעצמאי?",
    a: "בהחלט. Cardigo מתאים לעצמאים, לעסקים קטנים ולנותני שירות שרוצים עמוד עסקי מקצועי, נוח לשיתוף וקל לניהול — בלי להסתבך עם אתר מלא."
  }
];
function buildHomeFaqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${ORIGIN$2}/#faq`,
    url: `${ORIGIN$2}/`,
    inLanguage: "he",
    mainEntity: HOME_FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a
      }
    }))
  };
}
function buildHomeWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${ORIGIN$2}/#website`,
    name: "Cardigo",
    url: `${ORIGIN$2}/`,
    inLanguage: "he"
  };
}
function buildHomeOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${ORIGIN$2}/#organization`,
    name: "Cardigo",
    url: `${ORIGIN$2}/`,
    logo: `${ORIGIN$2}/images/brand-logo/cardigo-logo.png`
  };
}
const HERO_CARDS = [
  {
    src: "/images/home-page/hero/כרטיס ביקור דיגיטלי לאדריכלית חוץ ונוף  כרדיגו.webp",
    alt: "כרטיס ביקור דיגיטלי לאדריכלית"
  },
  {
    src: "/images/home-page/hero/כרטיס ביקור דיגיטלי ליועצת חדשנות דיגיטלית ו-AI  כרדיגו.webp",
    alt: "כרטיס ביקור דיגיטלי ליועצת חדשנות"
  },
  {
    src: "/images/home-page/hero/כרטיס ביקור דיגיטלי למפיקת אירועי בוטיק  כרדיגו.webp",
    alt: "כרטיס ביקור דיגיטלי למפיקת אירועים"
  },
  {
    src: "/images/home-page/hero/כרטיס ביקור דיגיטלי ליועץ הון פרטי  כרדיגו.webp",
    alt: "כרטיס ביקור דיגיטלי ליועץ הון"
  },
  {
    src: "/images/home-page/hero/כרטיס ביקור דיגיטלי לרופאת שיניים אסתטית  כרדיגו.webp",
    alt: "כרטיס ביקור דיגיטלי לרופאת שיניים"
  }
];
function Home() {
  useEffect(() => {
    trackSitePageView();
  }, []);
  const stageZoom = useScrollProgress();
  const dashZoom = useScrollProgress();
  const editorZoom = useScrollProgress();
  const insightScroll = useScrollProgress();
  const controlScroll = useScrollProgress();
  const conversionScroll = useScrollProgress();
  const shareScroll = useScrollProgress();
  const stepsScroll = useScrollProgress();
  const homeWebSiteJsonLd = buildHomeWebSiteJsonLd();
  const homeOrganizationJsonLd = buildHomeOrganizationJsonLd();
  const homeFaqJsonLd = buildHomeFaqJsonLd();
  return /* @__PURE__ */ jsxs("main", { className: styles$b.page, "data-page": "site", children: [
    /* @__PURE__ */ jsx(
      SeoHelmet,
      {
        title: "כרטיס ביקור דיגיטלי לעסק | Cardigo",
        description: "כרטיס ביקור דיגיטלי לעסק של Cardigo מאפשר ליצור עמוד עסקי מקצועי, לשתף ב-QR, בוואטסאפ ובקישורים ייעודיים, ולעדכן הכול בקלות - עם תבניות, אנליטיקה וכלי שיתוף לעסק שלכם.",
        canonicalUrl: `${ORIGIN$2}/`,
        url: `${ORIGIN$2}/`,
        image: `${ORIGIN$2}${DEFAULT_OG_IMAGE_PATH}`,
        imageAlt: "Cardigo – כרטיס ביקור דיגיטלי לעסק",
        jsonLdItems: [
          homeWebSiteJsonLd,
          homeOrganizationJsonLd,
          homeFaqJsonLd
        ]
      }
    ),
    /* @__PURE__ */ jsx("section", { className: styles$b.hero, children: /* @__PURE__ */ jsxs("div", { className: styles$b.heroInner, children: [
      /* @__PURE__ */ jsxs("div", { className: styles$b.heroText, children: [
        /* @__PURE__ */ jsx(
          Link,
          {
            to: "/",
            className: styles$b.heroLogoLink,
            "aria-label": "כרטיס ביקור דיגיטלי - כרדיגו",
            children: /* @__PURE__ */ jsxs("picture", { children: [
              /* @__PURE__ */ jsx(
                "source",
                {
                  type: "image/webp",
                  srcSet: "/images/brand-logo/cardigo-logo.webp"
                }
              ),
              /* @__PURE__ */ jsx(
                "img",
                {
                  src: "/images/brand-logo/cardigo-logo.png",
                  alt: "כרטיס ביקור דיגיטלי - כרדיגו",
                  className: styles$b.heroLogoImage,
                  loading: "eager",
                  decoding: "async"
                }
              )
            ] })
          }
        ),
        /* @__PURE__ */ jsxs("h1", { className: styles$b.h1, children: [
          "כרטיס ביקור דיגיטלי",
          /* @__PURE__ */ jsx(
            "span",
            {
              className: `${styles$b.h1Accent} ${pub.goldUnderline}`,
              children: "לעסק שמביא תוצאות"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: styles$b.heroCards, "aria-hidden": "true", children: HERO_CARDS.map((card2, i) => /* @__PURE__ */ jsx(
        "img",
        {
          src: encodeURI(card2.src),
          alt: "",
          className: styles$b.heroCardImg,
          width: 280,
          height: 560,
          loading: i === 2 ? "eager" : "lazy",
          decoding: "async"
        },
        i
      )) }),
      /* @__PURE__ */ jsxs("div", { className: styles$b.heroActions, children: [
        /* @__PURE__ */ jsx(
          Button,
          {
            as: Link,
            to: "/edit",
            variant: "primary",
            className: `${styles$b.heroCta}  `,
            onClick: () => trackSiteClick({
              action: SITE_ACTIONS.home_hero_primary_register,
              pagePath: "/"
            }),
            children: "צרו כרטיס דיגיטלי בחינם"
          }
        ),
        /* @__PURE__ */ jsxs("span", { className: styles$b.heroTrialNote, children: [
          "כולל 10 ימי פרימיום למשתמשים חדשים",
          /* @__PURE__ */ jsx(CrownIcon, { className: styles$b.heroTrialCrown })
        ] }),
        /* @__PURE__ */ jsxs("p", { className: pub.illustrationOnlyTxt, children: [
          " ",
          "הדוגמאות בעמוד זה מוצגות להמחשה"
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx("section", { className: pub.sectionLight, children: /* @__PURE__ */ jsxs("div", { className: pub.sectionWrap, children: [
      /* @__PURE__ */ jsxs("h2", { className: pub.h2Gold, children: [
        "יותר מכרטיס ביקור דיגיטלי לעסק",
        /* @__PURE__ */ jsx("span", { children: " העמוד העסקי שלכם שמוכן לשיתוף" })
      ] }),
      /* @__PURE__ */ jsxs("p", { className: styles$b.presenceLead, children: [
        "כרטיס ביקור דיגיטלי של",
        " ",
        /* @__PURE__ */ jsx("strong", { className: styles$b.presenceLeadBrand, children: "Cardigo" }),
        " ",
        "זה לא רק פרטי קשר. זהו עמוד עסקי קומפקטי עם",
        " ",
        /* @__PURE__ */ jsxs("span", { className: `${pub.goldUnderline} ${pub.boldTxt}`, children: [
          " ",
          "אפשרות קביעת פגישות"
        ] }),
        ", גלריה, וידאו, המלצות, שאלות נפוצות, טופס פנייה ועוד... -",
        " ",
        /* @__PURE__ */ jsx("em", { className: styles$b.presenceLeadPunch, children: "הכל בקישור אחד שנראה מקצועי ונוח לשיתוף." })
      ] }),
      /* @__PURE__ */ jsx("div", { className: styles$b.presenceMedia, children: /* @__PURE__ */ jsxs(
        "div",
        {
          className: `${styles$b.phoneStage} ${scroll.scrollZoomSoft} ${styles$b.strongerZoom}`,
          "aria-hidden": "true",
          ref: stageZoom.ref,
          children: [
            /* @__PURE__ */ jsx(
              "img",
              {
                className: styles$b.phoneImage,
                src: encodeURI(
                  `${SECTION_1_IMG}/יותר-מכרטיס-ביקור-טלפון עצמו.webp`
                ),
                alt: "כרטיס ביקור דיגיטלי בנייד",
                width: 340,
                height: 600,
                loading: "lazy",
                decoding: "async"
              }
            ),
            PRESENCE_PROOF_CARDS.map((card2) => /* @__PURE__ */ jsx(ProofCard, { ...card2 }, card2.posClass))
          ]
        }
      ) }),
      /* @__PURE__ */ jsx("div", { className: styles$b.presenceFeatures, children: PRESENCE_FEATURES.map((f, i) => /* @__PURE__ */ jsxs("div", { className: styles$b.presenceChip, children: [
        /* @__PURE__ */ jsx(f.Icon, { className: styles$b.presenceIcon }),
        /* @__PURE__ */ jsx("span", { children: f.label })
      ] }, i)) }),
      /* @__PURE__ */ jsx("p", { className: styles$b.presenceMore, children: "ועוד הרבה כלים נוספים…" }),
      /* @__PURE__ */ jsxs("div", { className: pub.highlight, children: [
        " ",
        "כרטיס ביקור דיגיטלי של",
        " ",
        /* @__PURE__ */ jsxs("span", { className: styles$b.presenceLeadBrand, children: [
          " ",
          "כרדיגו"
        ] }),
        " ",
        "- זה נוכחות עסקית מלאה שעובדת 24/7"
      ] })
    ] }) }),
    /* @__PURE__ */ jsx("section", { className: pub.sectionDark, id: "features", children: /* @__PURE__ */ jsxs("div", { className: pub.sectionWrap, children: [
      /* @__PURE__ */ jsxs("h2", { className: pub.h2White, children: [
        "מכל צפייה לפנייה -",
        " ",
        /* @__PURE__ */ jsx(
          "span",
          {
            className: `${pub.goldHilight} ${pub.goldUnderline}`,
            children: "בקליק אחד"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs(
        "p",
        {
          className: `${pub.sectionLeadLight} ${pub.goldUnderline}`,
          children: [
            "כל כפתור בכרטיס מקרב הזדמנות ליצירת קשר",
            /* @__PURE__ */ jsxs("span", { className: `${pub.goldHilight} ${pub.boldTxt}`, children: [
              " ",
              "אמיתית."
            ] }),
            " "
          ]
        }
      ),
      /* @__PURE__ */ jsx(
        "div",
        {
          className: styles$b.conversionRow,
          ref: conversionScroll.ref,
          children: CONVERSION_ITEMS.map((item, i) => /* @__PURE__ */ jsxs("div", { className: styles$b.conversionCard, children: [
            /* @__PURE__ */ jsx("div", { className: styles$b.conversionMedia, children: /* @__PURE__ */ jsx(
              "img",
              {
                className: styles$b.conversionImg,
                src: item.src,
                alt: item.alt,
                width: 400,
                height: 400,
                loading: "lazy",
                decoding: "async"
              }
            ) }),
            /* @__PURE__ */ jsxs("div", { className: styles$b.conversionHeader, children: [
              /* @__PURE__ */ jsx(
                item.Icon,
                {
                  className: styles$b.conversionIcon
                }
              ),
              /* @__PURE__ */ jsx("h3", { className: styles$b.conversionTitle, children: item.title }),
              /* @__PURE__ */ jsx("p", { className: styles$b.conversionText, children: item.text })
            ] })
          ] }, i))
        }
      )
    ] }) }),
    /* @__PURE__ */ jsx(
      "section",
      {
        className: `${pub.sectionLight} ${styles$b.analyticsSection}`,
        children: /* @__PURE__ */ jsxs("div", { className: pub.sectionWrap, children: [
          /* @__PURE__ */ jsx("h2", { className: pub.h2Gold, children: "תדעו מה באמת מביא תוצאות" }),
          /* @__PURE__ */ jsxs("p", { className: pub.sectionLead, children: [
            " ",
            /* @__PURE__ */ jsx("strong", { className: styles$b.analyticsLeadBrand, children: "Cardigo -" }),
            " ",
            "זאת",
            " ",
            /* @__PURE__ */ jsxs("em", { className: styles$b.analyticsLeadPunch, children: [
              "פלטפורמה חכמה עם אנליטיקה",
              " "
            ] }),
            "ומעקב."
          ] }),
          /* @__PURE__ */ jsx(
            "img",
            {
              className: `${styles$b.analyticsDashImg} ${scroll.scrollZoomSoft} ${styles$b.dashboardZoom}`,
              ref: dashZoom.ref,
              src: `${SECTION_3_IMG}/digital_business_card-analytics-dashboard-cardigo-platform.jpg`,
              alt: "דשבורד אנליטיקה לכרטיס ביקור דיגיטלי - Cardigo",
              width: 800,
              height: 600,
              loading: "lazy"
            }
          ),
          /* @__PURE__ */ jsx(
            "div",
            {
              className: styles$b.analyticsInsights,
              ref: insightScroll.ref,
              children: ANALYTICS_INSIGHTS.map((item, i) => /* @__PURE__ */ jsxs("div", { className: styles$b.insightBullet, children: [
                /* @__PURE__ */ jsx("div", { className: styles$b.insightMedia, children: /* @__PURE__ */ jsx(
                  "img",
                  {
                    className: styles$b.insightImg,
                    src: item.src,
                    alt: item.alt,
                    width: 400,
                    height: 400,
                    loading: "lazy",
                    decoding: "async"
                  }
                ) }),
                /* @__PURE__ */ jsxs("div", { className: styles$b.insightBody, children: [
                  /* @__PURE__ */ jsx(item.Icon, { className: styles$b.insightIcon }),
                  /* @__PURE__ */ jsx("div", { className: styles$b.insightTitle, children: item.title }),
                  /* @__PURE__ */ jsx("div", { className: styles$b.insightText, children: item.text })
                ] })
              ] }, i))
            }
          ),
          /* @__PURE__ */ jsxs("p", { className: pub.highlight, children: [
            "כל צפייה, כל לחיצה, כל מקור הגעה - הופך את הנתונים לתובנות שנותנות לכם",
            " ",
            /* @__PURE__ */ jsx("em", { className: styles$b.analyticsLeadPunch, children: "שליטה אמיתית על התוצאות." })
          ] }),
          /* @__PURE__ */ jsxs("p", { className: styles$b.analyticsCaveat, children: [
            "* ניתוח נתונים מלא זמין ב",
            /* @__PURE__ */ jsx(Link, { to: "/pricing", className: styles$b.caveatLink, children: "מסלול פרימיום" }),
            ". במסלול חינמי ניתן לצפות בתצוגה לדוגמה."
          ] })
        ] })
      }
    ),
    /* @__PURE__ */ jsx("section", { className: pub.sectionDark, children: /* @__PURE__ */ jsxs("div", { className: pub.sectionWrap, children: [
      /* @__PURE__ */ jsxs("h2", { className: pub.h2White, children: [
        " ",
        "שתפו בכל מקום",
        " ",
        /* @__PURE__ */ jsx(
          "span",
          {
            className: `${pub.h2Gold} ${pub.goldUnderline} ${styles$b.strongerUnderline}`,
            children: "בקלות"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("ul", { className: styles$b.shareChecklist, children: [
        /* @__PURE__ */ jsx("li", { className: styles$b.shareCheckItem, children: /* @__PURE__ */ jsxs("div", { className: styles$b.shareCheckText, children: [
          /* @__PURE__ */ jsx("span", { className: styles$b.shareCheckBold, children: "משתלב בכל ערוץ" }),
          /* @__PURE__ */ jsx("span", { className: styles$b.shareCheckDesc, children: "אימייל, וואטסאפ, QR וקישורי קמפיין" })
        ] }) }),
        /* @__PURE__ */ jsx("li", { className: styles$b.shareCheckItem, children: /* @__PURE__ */ jsxs("div", { className: styles$b.shareCheckText, children: [
          /* @__PURE__ */ jsx("span", { className: styles$b.shareCheckBold, children: "לא נשאר רק בקישור" }),
          /* @__PURE__ */ jsx("span", { className: styles$b.shareCheckDesc, children: "הכרטיס חי בכל מקום שבו העסק שלכם כבר נמצא" })
        ] }) }),
        /* @__PURE__ */ jsx("li", { className: styles$b.shareCheckItem, children: /* @__PURE__ */ jsxs("div", { className: styles$b.shareCheckText, children: [
          /* @__PURE__ */ jsx("span", { className: styles$b.shareCheckBold, children: "הפצה חכמה יותר" }),
          /* @__PURE__ */ jsx("span", { className: styles$b.shareCheckDesc, children: "כל שיתוף הוא הזדמנות להגיע ללקוחות חדשים" })
        ] }) })
      ] }),
      /* @__PURE__ */ jsx("div", { className: styles$b.shareRow, ref: shareScroll.ref, children: SHARE_CHANNELS.map((ch, i) => /* @__PURE__ */ jsxs("div", { className: styles$b.shareCard, children: [
        /* @__PURE__ */ jsx("div", { className: styles$b.shareMedia, children: /* @__PURE__ */ jsx(
          "img",
          {
            className: styles$b.shareImg,
            src: ch.src,
            alt: ch.alt,
            width: 400,
            height: 400,
            loading: "lazy",
            decoding: "async"
          }
        ) }),
        /* @__PURE__ */ jsxs("div", { className: styles$b.shareBody, children: [
          /* @__PURE__ */ jsx(ch.Icon, { className: styles$b.shareIcon }),
          /* @__PURE__ */ jsx("h3", { className: styles$b.shareTitle, children: ch.title }),
          /* @__PURE__ */ jsx("p", { className: styles$b.shareText, children: ch.text })
        ] })
      ] }, i)) })
    ] }) }),
    /* @__PURE__ */ jsx("section", { className: pub.sectionLight, children: /* @__PURE__ */ jsxs("div", { className: pub.sectionWrap, children: [
      /* @__PURE__ */ jsx("h2", { className: pub.h2Gold, children: "תעדכנו בעצמכם - 24/7" }),
      /* @__PURE__ */ jsxs("ul", { className: styles$b.editChecklist, children: [
        /* @__PURE__ */ jsx("li", { className: styles$b.editCheckItem, children: /* @__PURE__ */ jsxs("div", { className: styles$b.editCheckText, children: [
          /* @__PURE__ */ jsx("span", { className: styles$b.editCheckBold, children: "עדכון תוכן עצמאי" }),
          /* @__PURE__ */ jsx("span", { className: styles$b.editCheckDesc, children: "שנו מספר טלפון, תמונות, טקסטים וקישורים - הכל מתעדכן ברגע" })
        ] }) }),
        /* @__PURE__ */ jsx("li", { className: styles$b.editCheckItem, children: /* @__PURE__ */ jsxs("div", { className: styles$b.editCheckText, children: [
          /* @__PURE__ */ jsx("span", { className: styles$b.editCheckBold, children: "החלפת עיצוב בלחיצה" }),
          /* @__PURE__ */ jsx("span", { className: styles$b.editCheckDesc, children: "בחרו תבנית חדשה בכל רגע - התוכן נשמר" })
        ] }) }),
        /* @__PURE__ */ jsx("li", { className: styles$b.editCheckItem, children: /* @__PURE__ */ jsxs("div", { className: styles$b.editCheckText, children: [
          /* @__PURE__ */ jsx("span", { className: styles$b.editCheckBold, children: "מכל מכשיר, בלי לחכות" }),
          /* @__PURE__ */ jsx("span", { className: styles$b.editCheckDesc, children: "האזור האישי עובד גם מהנייד - בלי צורך במפתח" })
        ] }) }),
        /* @__PURE__ */ jsx("li", { className: styles$b.editCheckItem, children: /* @__PURE__ */ jsxs("div", { className: styles$b.editCheckText, children: [
          /* @__PURE__ */ jsx("span", { className: styles$b.editCheckBold, children: "תמיכה מלאה" }),
          /* @__PURE__ */ jsx("span", { className: styles$b.editCheckDesc, children: "לא מסתדרים? יש שאלה? צריכים עזרה עם הכרטיס? אנחנו כאן בשבילכם, עם תמיכה אישית וזמינה." })
        ] }) })
      ] }),
      /* @__PURE__ */ jsx("br", {}),
      /* @__PURE__ */ jsx(
        "img",
        {
          className: `${styles$b.editorDashImg} ${scroll.scrollZoomSoft} ${styles$b.dashboardZoom}`,
          ref: editorZoom.ref,
          src: "/images/home-page/main-sections/Section-5/cardigo-digital-business-card-editor-dashboard.jpg",
          alt: "עורך כרטיס ביקור דיגיטלי - Cardigo",
          width: 800,
          height: 600,
          loading: "lazy",
          decoding: "async"
        }
      ),
      /* @__PURE__ */ jsx(
        "div",
        {
          className: styles$b.controlItems,
          ref: controlScroll.ref,
          children: CONTROL_FEATURES.map((item, i) => /* @__PURE__ */ jsxs("div", { className: styles$b.controlItem, children: [
            /* @__PURE__ */ jsx("div", { className: styles$b.controlMedia, children: /* @__PURE__ */ jsx(
              "img",
              {
                className: styles$b.controlImg,
                src: item.src,
                alt: item.alt,
                width: 400,
                height: 400,
                loading: "lazy",
                decoding: "async"
              }
            ) }),
            /* @__PURE__ */ jsxs("div", { className: styles$b.controlBody, children: [
              /* @__PURE__ */ jsx(
                item.Icon,
                {
                  className: styles$b.controlItemIcon
                }
              ),
              /* @__PURE__ */ jsx("div", { className: styles$b.controlItemTitle, children: item.title }),
              /* @__PURE__ */ jsx("div", { className: styles$b.controlItemDesc, children: item.text })
            ] })
          ] }, i))
        }
      ),
      /* @__PURE__ */ jsx("p", { className: pub.highlight, children: "שנו מספר טלפון, החליפו עיצוב, עדכנו תמונות - הכל דרך האזור האישי , מכל מכשיר, בלי לחכות לאף אחד." })
    ] }) }),
    /* @__PURE__ */ jsx("section", { className: pub.sectionDark, id: "templates", children: /* @__PURE__ */ jsxs("div", { className: pub.sectionWrap, children: [
      /* @__PURE__ */ jsxs("h2", { className: pub.h2White, children: [
        "בחרו עיצוב שמתאים",
        " ",
        /* @__PURE__ */ jsx("span", { className: `${pub.h2Gold} ${pub.goldUnderline}`, children: "לעסק שלכם" })
      ] }),
      /* @__PURE__ */ jsx("p", { className: pub.sectionLeadLight, children: "יש לכם מבחר תבניות מוכנות, שנראות טוב מההתחלה ועובדות מצוין גם בטלפון. פשוט בוחרים סגנון שמרגיש נכון לעסק שלכם." }),
      /* @__PURE__ */ jsx(
        "p",
        {
          className: `${pub.sectionLeadLight} ${pub.goldHilight} ${pub.boldTxt}`,
          children: "הנה כמה מהתבניות לדוגמא…"
        }
      ),
      /* @__PURE__ */ jsx("div", { className: styles$b.templatesShowcase, children: TEMPLATE_SKINS.map((skin, i) => /* @__PURE__ */ jsxs("div", { className: styles$b.templateCard, children: [
        /* @__PURE__ */ jsx(
          "img",
          {
            className: styles$b.templateCardImg,
            src: skin.src,
            alt: `תבנית ${skin.name}`,
            loading: "lazy",
            width: "300",
            height: "520"
          }
        ),
        /* @__PURE__ */ jsx("div", { className: styles$b.templateCardName })
      ] }, i)) }),
      /* @__PURE__ */ jsx("div", { className: styles$b.center, children: /* @__PURE__ */ jsx(
        Button,
        {
          as: Link,
          to: "edit/card/templates",
          variant: "secondary",
          onClick: () => trackSiteClick({
            action: SITE_ACTIONS.home_templates_cta,
            pagePath: "/"
          }),
          children: "בחרו תבנית והתחילו חינם"
        }
      ) }),
      /* @__PURE__ */ jsx("div", { className: styles$b.center, children: /* @__PURE__ */ jsx(
        Link,
        {
          to: "/cards",
          className: styles$b.templatesSeeAll,
          onClick: () => trackSiteClick({
            action: SITE_ACTIONS.home_templates_see_all,
            pagePath: "/"
          }),
          children: "גלו עוד דוגמאות ויכולות של הכרטיסים"
        }
      ) })
    ] }) }),
    /* @__PURE__ */ jsx("section", { className: pub.sectionLight, id: "how", children: /* @__PURE__ */ jsxs("div", { className: pub.sectionWrap, children: [
      /* @__PURE__ */ jsx("h2", { className: pub.h2Gold, children: "שלושה צעדים - וזה עובד" }),
      /* @__PURE__ */ jsx("div", { className: styles$b.steps, ref: stepsScroll.ref, children: STEPS.map((s) => /* @__PURE__ */ jsxs(
        "div",
        {
          className: `${styles$b.step} ${s.num === "3" ? styles$b.stepWide : ""}`,
          children: [
            /* @__PURE__ */ jsx("div", { className: styles$b.stepMedia, children: /* @__PURE__ */ jsx(
              "img",
              {
                className: styles$b.stepImg,
                src: s.src,
                alt: s.alt,
                loading: "lazy",
                width: "600",
                height: "400"
              }
            ) }),
            /* @__PURE__ */ jsxs("div", { className: styles$b.stepBody, children: [
              /* @__PURE__ */ jsx("div", { className: styles$b.stepNum, children: s.num }),
              /* @__PURE__ */ jsx("div", { className: styles$b.stepTitle, children: s.title }),
              /* @__PURE__ */ jsx("div", { className: styles$b.stepText, children: s.text })
            ] })
          ]
        },
        s.num
      )) })
    ] }) }),
    /* @__PURE__ */ jsx("section", { className: styles$b.ctaSection, children: /* @__PURE__ */ jsx("div", { className: pub.sectionWrap, children: /* @__PURE__ */ jsxs("div", { className: styles$b.ctaInner, children: [
      /* @__PURE__ */ jsxs("h2", { className: styles$b.ctaTitle, children: [
        " ",
        "צרו כרטיס דיגיטלי בחינם",
        " ",
        /* @__PURE__ */ jsxs(
          "span",
          {
            className: `${pub.goldHilight} ${pub.goldUnderline}`,
            children: [
              "שמביא יותר לקוחות!",
              " "
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("p", { className: styles$b.ctaText, children: [
        "יוצרים, משתפים ומעדכנים בקלות - עם",
        " ",
        /* @__PURE__ */ jsx(
          "span",
          {
            className: `${pub.goldHilight} ${pub.goldUnderline} ${pub.boldTxt}`,
            children: "Cardigo"
          }
        ),
        "."
      ] }),
      /* @__PURE__ */ jsx(
        "img",
        {
          className: styles$b.ctaImg,
          src: "/images/home-page/main-sections/Section-8/cardigo-digital-business-card-israel-brand-illustration.webp",
          alt: "כרטיס ביקור דיגיטלי לעסקים - Cardigo",
          width: 800,
          height: 450,
          loading: "lazy",
          decoding: "async"
        }
      ),
      /* @__PURE__ */ jsx(
        Button,
        {
          as: Link,
          to: "/edit/card/templates",
          variant: "primary",
          className: styles$b.ctaBtn,
          onClick: () => trackSiteClick({
            action: SITE_ACTIONS.home_bottom_cta,
            pagePath: "/"
          }),
          children: "צרו כרטיס דיגיטלי בחינם"
        }
      )
    ] }) }) }),
    /* @__PURE__ */ jsx("section", { className: pub.sectionDark, id: "faq", children: /* @__PURE__ */ jsxs("div", { className: pub.sectionWrap, children: [
      /* @__PURE__ */ jsx("h2", { className: pub.h2Gold, children: "שאלות נפוצות" }),
      /* @__PURE__ */ jsx("div", { className: pub.faq, children: HOME_FAQ.map((item, i) => /* @__PURE__ */ jsxs("details", { className: pub.qa, children: [
        /* @__PURE__ */ jsx("summary", { children: item.q }),
        /* @__PURE__ */ jsx("div", { className: pub.answer, children: item.a })
      ] }, i)) })
    ] }) })
  ] });
}
const CARDIGO_SITE_ORIGIN = "https://cardigo.co.il";
const CARDIGO_OG_IMAGE_URL = `${CARDIGO_SITE_ORIGIN}${DEFAULT_OG_IMAGE_PATH}`;
const MARKETING_META = Object.freeze({
  cards: Object.freeze({
    path: "/cards/",
    title: "דוגמאות לכרטיסי ביקור דיגיטליים | Cardigo",
    description: "דוגמאות ויזואליות לכרטיסי ביקור דיגיטליים בסגנונות שונים - ראו איך Cardigo מציג עסקים, קישורים ודרכי יצירת קשר לפני שיוצרים כרטיס משלכם.",
    imageAlt: "Cardigo – דוגמאות לכרטיסי ביקור דיגיטליים"
  }),
  pricing: Object.freeze({
    path: "/pricing/",
    title: "מחירים לכרטיס ביקור דיגיטלי | Cardigo",
    description: "המחירים של Cardigo לכרטיס ביקור דיגיטלי מקצועי: מסלול חינמי לתמיד, 10 ימי פרימיום לכל משתמש חדש, מסלול חודשי גמיש ומסלול שנתי משתלם לעסקים שרוצים נוכחות דיגיטלית מקצועית.",
    imageAlt: "Cardigo – מחירים לכרטיס ביקור דיגיטלי"
  }),
  contact: Object.freeze({
    path: "/contact/",
    title: "צור קשר | Cardigo",
    description: "צרו קשר עם Cardigo לשאלות על כרטיס ביקור דיגיטלי לעסקים - מחירים, התאמה ודרכי התחלה.",
    imageAlt: "Cardigo – צור קשר"
  }),
  blog: Object.freeze({
    path: "/blog/",
    title: "בלוג | Cardigo",
    description: "מאמרים, מדריכים ותובנות בנושא כרטיסי ביקור דיגיטליים, נוכחות עסקית, SEO ותקשורת חכמה עם לקוחות.",
    imageAlt: "Cardigo – בלוג"
  }),
  guides: Object.freeze({
    path: "/guides/",
    title: "מדריכים | Cardigo",
    description: "מדריכים מעשיים, צעד אחרי צעד, על כרטיסי ביקור דיגיטליים, עיצוב כרטיס, SEO, נוכחות עסקית ושימוש בכלים הדיגיטליים של Cardigo.",
    imageAlt: "Cardigo – מדריכים"
  })
});
function getMarketingMeta(key) {
  return MARKETING_META[key] || null;
}
function buildMarketingUrl(path) {
  return `${CARDIGO_SITE_ORIGIN}${path}`;
}
const heroWrap$8 = "_heroWrap_1ydlx_19";
const heroCopy$4 = "_heroCopy_1ydlx_31";
const h1$8 = "_h1_1ydlx_71";
const h1Accent$3 = "_h1Accent_1ydlx_125";
const heroImg$2 = "_heroImg_1ydlx_171";
const heroActions$2 = "_heroActions_1ydlx_203";
const heroCta$2 = "_heroCta_1ydlx_221";
const heroSecondary$2 = "_heroSecondary_1ydlx_251";
const trustLine$1 = "_trustLine_1ydlx_265";
const valueBridgeRail = "_valueBridgeRail_1ydlx_323";
const valueBridgeCards = "_valueBridgeCards_1ydlx_333";
const valueBridgeCard = "_valueBridgeCard_1ydlx_333";
const valueBridgeMedia = "_valueBridgeMedia_1ydlx_413";
const valueBridgeImg = "_valueBridgeImg_1ydlx_423";
const valueBridgeBody = "_valueBridgeBody_1ydlx_437";
const valueBridgeTitle = "_valueBridgeTitle_1ydlx_451";
const valueBridgeText = "_valueBridgeText_1ydlx_465";
const sectionFormWrap = "_sectionFormWrap_1ydlx_545";
const contactRow = "_contactRow_1ydlx_559";
const contactFormCol = "_contactFormCol_1ydlx_579";
const contactForm = "_contactForm_1ydlx_579";
const honeypot = "_honeypot_1ydlx_599";
const fieldLabel = "_fieldLabel_1ydlx_621";
const fieldInput = "_fieldInput_1ydlx_639";
const fieldTextarea = "_fieldTextarea_1ydlx_681";
const consentLabel = "_consentLabel_1ydlx_691";
const consentCheck = "_consentCheck_1ydlx_711";
const consentText = "_consentText_1ydlx_723";
const submitBtn = "_submitBtn_1ydlx_733";
const successBox = "_successBox_1ydlx_745";
const successIcon = "_successIcon_1ydlx_769";
const successTitle = "_successTitle_1ydlx_781";
const successText = "_successText_1ydlx_795";
const successCta = "_successCta_1ydlx_809";
const contactInfoCol = "_contactInfoCol_1ydlx_821";
const infoHeading = "_infoHeading_1ydlx_843";
const infoList = "_infoList_1ydlx_857";
const infoItem = "_infoItem_1ydlx_875";
const infoIcon = "_infoIcon_1ydlx_889";
const infoIconPhone = "_infoIconPhone_1ydlx_917";
const infoIconWhatsapp = "_infoIconWhatsapp_1ydlx_927";
const infoIconMail = "_infoIconMail_1ydlx_937";
const infoIconFacebook = "_infoIconFacebook_1ydlx_947";
const infoLink = "_infoLink_1ydlx_957";
const infoCtaGroup = "_infoCtaGroup_1ydlx_977";
const infoCta = "_infoCta_1ydlx_977";
const ctaIconPhone = "_ctaIconPhone_1ydlx_1005";
const ctaIconWhatsapp = "_ctaIconWhatsapp_1ydlx_1007";
const qaLight = "_qaLight_1ydlx_1113";
const answerLight = "_answerLight_1ydlx_1141";
const brandLink = "_brandLink_1ydlx_1153";
const closingActions = "_closingActions_1ydlx_1181";
const styles$a = {
  heroWrap: heroWrap$8,
  heroCopy: heroCopy$4,
  h1: h1$8,
  h1Accent: h1Accent$3,
  heroImg: heroImg$2,
  heroActions: heroActions$2,
  heroCta: heroCta$2,
  heroSecondary: heroSecondary$2,
  trustLine: trustLine$1,
  valueBridgeRail,
  valueBridgeCards,
  valueBridgeCard,
  valueBridgeMedia,
  valueBridgeImg,
  valueBridgeBody,
  valueBridgeTitle,
  valueBridgeText,
  sectionFormWrap,
  contactRow,
  contactFormCol,
  contactForm,
  honeypot,
  fieldLabel,
  fieldInput,
  fieldTextarea,
  consentLabel,
  consentCheck,
  consentText,
  submitBtn,
  successBox,
  successIcon,
  successTitle,
  successText,
  successCta,
  contactInfoCol,
  infoHeading,
  infoList,
  infoItem,
  infoIcon,
  infoIconPhone,
  infoIconWhatsapp,
  infoIconMail,
  infoIconFacebook,
  infoLink,
  infoCtaGroup,
  infoCta,
  ctaIconPhone,
  ctaIconWhatsapp,
  qaLight,
  answerLight,
  brandLink,
  closingActions
};
const EMAIL = "support@cardigo.co.il";
const PHONE_DISPLAY = "054-581-1900";
const PHONE_TEL = "tel:+972545811900";
const WHATSAPP_URL = "https://wa.me/972545811900";
const FACEBOOK_URL = "https://www.facebook.com/cardigo.cards";
const SUBJECT_OPTIONS = [
  "שאלה לפני התחלה",
  "מחירים ומסלולים",
  "התאמה לעסק או לצוות",
  "אחר"
];
const INITIAL_FORM = {
  fullName: "",
  phone: "",
  email: "",
  subject: "",
  message: "",
  consent: false
};
const CONTACT_FAQ = [
  {
    q: "איך אפשר ליצור קשר עם Cardigo?",
    a: "אפשר לפנות אלינו דרך הטופס בדף זה, בטלפון, ב-WhatsApp או במייל. כל הדרכים מפורטות למעלה."
  },
  {
    q: "האם אפשר לפנות גם לגבי מחירים ומסלולים?",
    a: "בוודאי. אם יש שאלה שלא מופיעה בדף המחירים, נשמח לפרט ולעזור לבחור את המסלול המתאים."
  },
  {
    q: "למי Cardigo יכול להתאים?",
    a: "Cardigo מתאים לבעלי עסקים, נותני שירות, פרילנסרים וצוותים שרוצים כרטיס ביקור דיגיטלי מקצועי ונגיש."
  },
  {
    q: "מה צריך להכין לפני שפונים?",
    a: "שום דבר מיוחד. אם יש לכם שאלה ספציפית או פרטים על העסק - מצוין, אבל אפשר גם סתם לשאול."
  }
];
function buildContactFaqJsonLd(canonicalBase) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${canonicalBase}#faq`,
    url: canonicalBase,
    inLanguage: "he",
    mainEntity: CONTACT_FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a
      }
    }))
  };
}
const meta$4 = getMarketingMeta("contact");
const canonicalUrl$2 = buildMarketingUrl(meta$4.path);
function Contact() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const contactFaqJsonLd = buildContactFaqJsonLd(canonicalUrl$2);
  useEffect(() => {
    trackSitePageView();
  }, []);
  const updateField = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch("/", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          "form-name": "contact",
          fullName: form.fullName,
          phone: form.phone,
          email: form.email,
          subject: form.subject,
          message: form.message,
          consent: form.consent ? "yes" : "no"
        }).toString()
      });
      setSent(true);
      trackSiteClick({
        action: SITE_ACTIONS.contact_form_submit,
        pagePath: "/contact"
      });
    } catch {
    } finally {
      setSubmitting(false);
    }
  };
  return /* @__PURE__ */ jsxs("main", { "data-page": "site", children: [
    /* @__PURE__ */ jsx(
      SeoHelmet,
      {
        title: meta$4.title,
        description: meta$4.description,
        canonicalUrl: canonicalUrl$2,
        url: canonicalUrl$2,
        image: CARDIGO_OG_IMAGE_URL,
        imageAlt: meta$4.imageAlt,
        jsonLdItems: [contactFaqJsonLd]
      }
    ),
    /* @__PURE__ */ jsx("section", { className: pub.sectionDark, children: /* @__PURE__ */ jsxs("div", { className: `${pub.sectionWrap} ${styles$a.heroWrap}`, children: [
      /* @__PURE__ */ jsxs("div", { className: styles$a.heroCopy, children: [
        /* @__PURE__ */ jsxs("h1", { className: styles$a.h1, children: [
          "דברו איתנו",
          /* @__PURE__ */ jsx(
            "span",
            {
              className: `${styles$a.h1Accent} ${pub.goldUnderline}`,
              children: "נשמח לענות על כל שאלה"
            }
          )
        ] }),
        /* @__PURE__ */ jsx(
          "img",
          {
            className: styles$a.heroImg,
            src: "/images/contact/hero/contact-cardigo-digital-bussines-card.webp",
            alt: "צור קשר עם Cardigo - כרטיס ביקור דיגיטלי לעסקים",
            width: "600",
            height: "400",
            loading: "eager",
            decoding: "async"
          }
        ),
        /* @__PURE__ */ jsx("p", { className: pub.sectionLeadLight, children: "רוצים לדעת מה מתאים לעסק שלכם, לשאול על מחירים או לברר פרטים לפני ההתחלה? כתבו לנו." }),
        /* @__PURE__ */ jsxs("div", { className: styles$a.heroActions, children: [
          /* @__PURE__ */ jsx(
            Button,
            {
              as: "a",
              href: `mailto:${EMAIL}`,
              variant: "primary",
              className: styles$a.heroCta,
              onClick: () => trackSiteClick({
                action: SITE_ACTIONS.contact_email_click,
                pagePath: "/contact"
              }),
              children: "שלחו לנו מייל"
            }
          ),
          /* @__PURE__ */ jsx(
            Button,
            {
              as: Link,
              to: "/pricing",
              variant: "secondary",
              className: styles$a.heroSecondary,
              children: "לראות מסלולים ומחירים"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsx("p", { className: styles$a.trustLine, children: EMAIL })
    ] }) }),
    /* @__PURE__ */ jsx("section", { className: pub.sectionLight, children: /* @__PURE__ */ jsxs("div", { className: `${pub.sectionWrap}`, children: [
      /* @__PURE__ */ jsx("h2", { className: pub.h2Gold, children: "אנחנו כאן לכל שאלה" }),
      /* @__PURE__ */ jsx("p", { className: pub.sectionLead, children: "לפני שמתחילים, טבעי שיש שאלות. הנה כמה נושאים שבהם נשמח לעזור." }),
      /* @__PURE__ */ jsx("div", { className: styles$a.valueBridgeRail, children: /* @__PURE__ */ jsxs("div", { className: styles$a.valueBridgeCards, children: [
        /* @__PURE__ */ jsxs("article", { className: styles$a.valueBridgeCard, children: [
          /* @__PURE__ */ jsx("div", { className: styles$a.valueBridgeMedia, children: /* @__PURE__ */ jsx(
            "img",
            {
              className: styles$a.valueBridgeImg,
              src: "/images/contact/value-bridge/כרטיס-ביקור-דיגיטלי-כרדיגו-שאלות-לפני-ההתחלה.webp",
              alt: "שאלות לפני ההתחלה - כרטיס ביקור דיגיטלי Cardigo",
              width: "400",
              height: "267",
              loading: "lazy",
              decoding: "async"
            }
          ) }),
          /* @__PURE__ */ jsxs("div", { className: styles$a.valueBridgeBody, children: [
            /* @__PURE__ */ jsx("h3", { className: styles$a.valueBridgeTitle, children: "שאלות לפני ההתחלה" }),
            /* @__PURE__ */ jsxs("p", { className: styles$a.valueBridgeText, children: [
              "רוצים להבין איך",
              " ",
              /* @__PURE__ */ jsx(
                Link,
                {
                  to: "/",
                  className: styles$a.brandLink,
                  children: "Cardigo"
                }
              ),
              " ",
              "עובד, מה כלול בכרטיס ומה צריך כדי להתחיל? כתבו לנו ונסביר."
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("article", { className: styles$a.valueBridgeCard, children: [
          /* @__PURE__ */ jsx("div", { className: styles$a.valueBridgeMedia, children: /* @__PURE__ */ jsx(
            "img",
            {
              className: styles$a.valueBridgeImg,
              src: "/images/contact/value-bridge/כרטיס-ביקור-דיגיטלי-כרדיגו-מחירים-ומסלולים.webp",
              alt: "מחירים ומסלולים - כרטיס ביקור דיגיטלי Cardigo",
              width: "400",
              height: "267",
              loading: "lazy",
              decoding: "async"
            }
          ) }),
          /* @__PURE__ */ jsxs("div", { className: styles$a.valueBridgeBody, children: [
            /* @__PURE__ */ jsx("h3", { className: styles$a.valueBridgeTitle, children: "מחירים ומסלולים" }),
            /* @__PURE__ */ jsx("p", { className: styles$a.valueBridgeText, children: "לא בטוחים איזה מסלול מתאים? נשמח לפרט על ההבדלים בין המסלולים ולענות על כל שאלה." })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("article", { className: styles$a.valueBridgeCard, children: [
          /* @__PURE__ */ jsx("div", { className: styles$a.valueBridgeMedia, children: /* @__PURE__ */ jsx(
            "img",
            {
              className: styles$a.valueBridgeImg,
              src: "/images/contact/value-bridge/כרטיס-ביקור-דיגיטלי-כרדיגו-התאמה-לעסק-או-לצוות.webp",
              alt: "התאמה לעסק או לצוות - כרטיס ביקור דיגיטלי Cardigo",
              width: "400",
              height: "267",
              loading: "lazy",
              decoding: "async"
            }
          ) }),
          /* @__PURE__ */ jsxs("div", { className: styles$a.valueBridgeBody, children: [
            /* @__PURE__ */ jsx("h3", { className: styles$a.valueBridgeTitle, children: "התאמה לעסק או לצוות" }),
            /* @__PURE__ */ jsx("p", { className: styles$a.valueBridgeText, children: "מחפשים פתרון לכמה אנשי צוות או לארגון? פנו אלינו ונבדוק ביחד מה מתאים." })
          ] })
        ] })
      ] }) })
    ] }) }),
    /* @__PURE__ */ jsx("section", { className: pub.sectionDark, children: /* @__PURE__ */ jsxs("div", { className: `${pub.sectionWrap} ${styles$a.sectionFormWrap}`, children: [
      /* @__PURE__ */ jsx("h2", { className: pub.h2White, children: "נשמח לשמוע מכם" }),
      /* @__PURE__ */ jsx("p", { className: pub.sectionLeadLight, children: "מלאו את הטופס ונחזור אליכם בהקדם, או פנו אלינו ישירות בכל דרך שנוחה לכם." }),
      /* @__PURE__ */ jsxs("div", { className: styles$a.contactRow, children: [
        /* @__PURE__ */ jsx("div", { className: styles$a.contactFormCol, children: sent ? /* @__PURE__ */ jsxs("div", { className: styles$a.successBox, children: [
          /* @__PURE__ */ jsx("span", { className: styles$a.successIcon, children: "✓" }),
          /* @__PURE__ */ jsx("h3", { className: styles$a.successTitle, children: "הפנייה נשלחה בהצלחה" }),
          /* @__PURE__ */ jsx("p", { className: styles$a.successText, children: "קיבלנו את ההודעה שלכם ונחזור אליכם בהקדם האפשרי." }),
          /* @__PURE__ */ jsx(
            Button,
            {
              as: Link,
              to: "/",
              variant: "secondary",
              className: styles$a.successCta,
              children: "חזרה לדף הבית"
            }
          )
        ] }) : /* @__PURE__ */ jsxs(
          "form",
          {
            name: "contact",
            method: "POST",
            "data-netlify": "true",
            "netlify-honeypot": "bot-field",
            onSubmit: handleSubmit,
            className: styles$a.contactForm,
            children: [
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "hidden",
                  name: "form-name",
                  value: "contact"
                }
              ),
              /* @__PURE__ */ jsx(
                "div",
                {
                  className: styles$a.honeypot,
                  "aria-hidden": "true",
                  children: /* @__PURE__ */ jsx(
                    "input",
                    {
                      name: "bot-field",
                      tabIndex: -1,
                      autoComplete: "off"
                    }
                  )
                }
              ),
              /* @__PURE__ */ jsxs("label", { className: styles$a.fieldLabel, children: [
                "שם מלא *",
                /* @__PURE__ */ jsx(
                  "input",
                  {
                    className: styles$a.fieldInput,
                    type: "text",
                    name: "fullName",
                    value: form.fullName,
                    onChange: updateField,
                    required: true,
                    autoComplete: "name"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs("label", { className: styles$a.fieldLabel, children: [
                "טלפון *",
                /* @__PURE__ */ jsx(
                  "input",
                  {
                    className: styles$a.fieldInput,
                    type: "tel",
                    name: "phone",
                    value: form.phone,
                    onChange: updateField,
                    required: true,
                    placeholder: "054-581-1900",
                    autoComplete: "tel"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs("label", { className: styles$a.fieldLabel, children: [
                "אימייל",
                /* @__PURE__ */ jsx(
                  "input",
                  {
                    className: styles$a.fieldInput,
                    type: "email",
                    name: "email",
                    value: form.email,
                    onChange: updateField,
                    autoComplete: "email"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs("label", { className: styles$a.fieldLabel, children: [
                "נושא הפנייה",
                /* @__PURE__ */ jsxs(
                  "select",
                  {
                    className: styles$a.fieldInput,
                    name: "subject",
                    value: form.subject,
                    onChange: updateField,
                    children: [
                      /* @__PURE__ */ jsx("option", { value: "", children: "בחרו נושא…" }),
                      SUBJECT_OPTIONS.map((opt) => /* @__PURE__ */ jsx("option", { value: opt, children: opt }, opt))
                    ]
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs("label", { className: styles$a.fieldLabel, children: [
                "הודעה",
                /* @__PURE__ */ jsx(
                  "textarea",
                  {
                    className: `${styles$a.fieldInput} ${styles$a.fieldTextarea}`,
                    name: "message",
                    value: form.message,
                    onChange: updateField,
                    rows: 4
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs("label", { className: styles$a.consentLabel, children: [
                /* @__PURE__ */ jsx(
                  "input",
                  {
                    type: "checkbox",
                    name: "consent",
                    checked: form.consent,
                    onChange: updateField,
                    required: true,
                    className: styles$a.consentCheck
                  }
                ),
                /* @__PURE__ */ jsxs("span", { className: styles$a.consentText, children: [
                  "אני מסכים/ה ל",
                  /* @__PURE__ */ jsx(Link, { to: "/terms", children: "תנאי השימוש" }),
                  " ",
                  "ו",
                  /* @__PURE__ */ jsx(Link, { to: "/privacy", children: "מדיניות הפרטיות" })
                ] })
              ] }),
              /* @__PURE__ */ jsx(
                Button,
                {
                  as: "button",
                  type: "submit",
                  variant: "primary",
                  className: styles$a.submitBtn,
                  disabled: submitting,
                  loading: submitting,
                  children: submitting ? "שולח…" : "שליחה"
                }
              )
            ]
          }
        ) }),
        /* @__PURE__ */ jsxs("div", { className: styles$a.contactInfoCol, children: [
          /* @__PURE__ */ jsx("h3", { className: styles$a.infoHeading, children: "דרכים נוספות ליצירת קשר" }),
          /* @__PURE__ */ jsxs("ul", { className: styles$a.infoList, children: [
            /* @__PURE__ */ jsxs("li", { className: styles$a.infoItem, children: [
              /* @__PURE__ */ jsx(
                "span",
                {
                  className: `${styles$a.infoIcon} ${styles$a.infoIconPhone}`,
                  "aria-hidden": "true"
                }
              ),
              /* @__PURE__ */ jsx(
                "a",
                {
                  href: PHONE_TEL,
                  className: styles$a.infoLink,
                  children: PHONE_DISPLAY
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("li", { className: styles$a.infoItem, children: [
              /* @__PURE__ */ jsx(
                "span",
                {
                  className: `${styles$a.infoIcon} ${styles$a.infoIconWhatsapp}`,
                  "aria-hidden": "true"
                }
              ),
              /* @__PURE__ */ jsx(
                "a",
                {
                  href: WHATSAPP_URL,
                  target: "_blank",
                  rel: "noopener noreferrer",
                  className: styles$a.infoLink,
                  onClick: () => trackSiteClick({
                    action: SITE_ACTIONS.contact_whatsapp_click,
                    pagePath: "/contact"
                  }),
                  children: "WhatsApp"
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("li", { className: styles$a.infoItem, children: [
              /* @__PURE__ */ jsx(
                "span",
                {
                  className: `${styles$a.infoIcon} ${styles$a.infoIconMail}`,
                  "aria-hidden": "true"
                }
              ),
              /* @__PURE__ */ jsx(
                "a",
                {
                  href: `mailto:${EMAIL}`,
                  className: styles$a.infoLink,
                  onClick: () => trackSiteClick({
                    action: SITE_ACTIONS.contact_email_click,
                    pagePath: "/contact"
                  }),
                  children: EMAIL
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("li", { className: styles$a.infoItem, children: [
              /* @__PURE__ */ jsx(
                "span",
                {
                  className: `${styles$a.infoIcon} ${styles$a.infoIconFacebook}`,
                  "aria-hidden": "true"
                }
              ),
              /* @__PURE__ */ jsx(
                "a",
                {
                  href: FACEBOOK_URL,
                  target: "_blank",
                  rel: "noopener noreferrer",
                  className: styles$a.infoLink,
                  children: "Facebook"
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: styles$a.infoCtaGroup, children: [
            /* @__PURE__ */ jsxs(
              Button,
              {
                as: "a",
                href: PHONE_TEL,
                variant: "primary",
                className: styles$a.infoCta,
                children: [
                  /* @__PURE__ */ jsx(
                    "span",
                    {
                      className: styles$a.ctaIconPhone,
                      "aria-hidden": "true"
                    }
                  ),
                  "חייגו אלינו"
                ]
              }
            ),
            /* @__PURE__ */ jsxs(
              Button,
              {
                as: "a",
                href: WHATSAPP_URL,
                target: "_blank",
                rel: "noopener noreferrer",
                variant: "secondary",
                className: styles$a.infoCta,
                onClick: () => trackSiteClick({
                  action: SITE_ACTIONS.contact_whatsapp_click,
                  pagePath: "/contact"
                }),
                children: [
                  /* @__PURE__ */ jsx(
                    "span",
                    {
                      className: styles$a.ctaIconWhatsapp,
                      "aria-hidden": "true"
                    }
                  ),
                  "שלחו הודעה ב-WhatsApp"
                ]
              }
            )
          ] })
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx("section", { className: pub.sectionLight, children: /* @__PURE__ */ jsxs("div", { className: pub.sectionWrap, children: [
      /* @__PURE__ */ jsx("h2", { className: pub.h2Gold, children: "שאלות נפוצות" }),
      /* @__PURE__ */ jsx("p", { className: pub.sectionLead, children: "לפני שפונים - הנה כמה תשובות לשאלות שעולות הכי הרבה." }),
      /* @__PURE__ */ jsx("div", { className: pub.faq, children: CONTACT_FAQ.map((item, i) => /* @__PURE__ */ jsxs(
        "details",
        {
          className: `${pub.qa} ${styles$a.qaLight}`,
          children: [
            /* @__PURE__ */ jsx("summary", { children: item.q }),
            /* @__PURE__ */ jsx(
              "div",
              {
                className: `${pub.answer} ${styles$a.answerLight}`,
                children: item.a
              }
            )
          ]
        },
        i
      )) })
    ] }) }),
    /* @__PURE__ */ jsx("section", { className: pub.sectionDark, children: /* @__PURE__ */ jsxs("div", { className: pub.sectionWrap, children: [
      /* @__PURE__ */ jsx("h2", { className: pub.h2White, children: "אפשר להמשיך מכאן" }),
      /* @__PURE__ */ jsx("p", { className: pub.sectionLeadLight, children: "יש שאלה? כתבו לנו. רוצים לראות מה כלול? עברו לדף המסלולים." }),
      /* @__PURE__ */ jsxs("div", { className: styles$a.closingActions, children: [
        /* @__PURE__ */ jsx(
          Button,
          {
            as: "a",
            href: `mailto:${EMAIL}`,
            variant: "primary",
            onClick: () => trackSiteClick({
              action: SITE_ACTIONS.contact_email_click,
              pagePath: "/contact"
            }),
            children: "שלחו לנו מייל"
          }
        ),
        /* @__PURE__ */ jsx(Button, { as: Link, to: "/pricing", variant: "secondary", children: "מסלולים ומחירים" })
      ] })
    ] }) })
  ] });
}
const EMPTY = Object.freeze({});
const InitialListingDataContext = createContext(EMPTY);
function InitialListingDataProvider({ value, children }) {
  const safeValue = value && typeof value === "object" && !Array.isArray(value) ? value : EMPTY;
  return /* @__PURE__ */ jsx(InitialListingDataContext.Provider, { value: safeValue, children });
}
function useInitialListingData(key) {
  const ctx = useContext(InitialListingDataContext) || EMPTY;
  if (typeof key !== "string" || key.length === 0) return null;
  const v = ctx[key];
  return v === void 0 ? null : v;
}
const heroWrap$7 = "_heroWrap_thvgg_21";
const heroCopy$3 = "_heroCopy_thvgg_29";
const h1$7 = "_h1_thvgg_69";
const h1Accent$2 = "_h1Accent_thvgg_123";
const heroImg$1 = "_heroImg_thvgg_165";
const listingWrap$1 = "_listingWrap_thvgg_197";
const grid$1 = "_grid_thvgg_211";
const card$1 = "_card_thvgg_227";
const cardImage$1 = "_cardImage_thvgg_265";
const cardBody$1 = "_cardBody_thvgg_279";
const cardDate$1 = "_cardDate_thvgg_293";
const cardTitle$1 = "_cardTitle_thvgg_305";
const cardExcerpt$1 = "_cardExcerpt_thvgg_349";
const cardCta$1 = "_cardCta_thvgg_373";
const status$1 = "_status_thvgg_419";
const statusError$1 = "_statusError_thvgg_433";
const pagination$1 = "_pagination_thvgg_455";
const pageBtn$1 = "_pageBtn_thvgg_471";
const pageInfo$1 = "_pageInfo_thvgg_509";
const seeExamples$1 = "_seeExamples_thvgg_521";
const styles$9 = {
  heroWrap: heroWrap$7,
  heroCopy: heroCopy$3,
  h1: h1$7,
  h1Accent: h1Accent$2,
  heroImg: heroImg$1,
  listingWrap: listingWrap$1,
  grid: grid$1,
  card: card$1,
  cardImage: cardImage$1,
  cardBody: cardBody$1,
  cardDate: cardDate$1,
  cardTitle: cardTitle$1,
  cardExcerpt: cardExcerpt$1,
  cardCta: cardCta$1,
  status: status$1,
  statusError: statusError$1,
  pagination: pagination$1,
  pageBtn: pageBtn$1,
  pageInfo: pageInfo$1,
  seeExamples: seeExamples$1
};
const CONTENT_DISPLAY_POLICY = Object.freeze({
  showPublishedDates: false
});
const ORIGIN$1 = "https://cardigo.co.il";
const PAGE_LIMIT$1 = 12;
const BLOG_COVER_FALLBACK = `${ORIGIN$1}/images/blog/fallback/blog-cardigo-bussines-img-fallback.webp`;
const BLOG_FAQ = [
  {
    q: "מה אפשר למצוא בבלוג של Cardigo?",
    a: "בבלוג של Cardigo תמצאו מאמרים, מדריכים ותובנות מעשיות על כרטיסי ביקור דיגיטליים, נראות עסקית, SEO, יצירת קשר עם לקוחות, לידים, מיתוג דיגיטלי ושימוש נכון בכלים שהעסק צריך כדי להיראות מקצועי יותר אונליין."
  },
  {
    q: "למי התוכן בבלוג מתאים?",
    a: "התוכן מתאים לבעלי עסקים, עצמאיים, נותני שירות, אנשי מכירות, יועצים, אנשי מקצוע וחברות שרוצים להבין איך לשפר נוכחות דיגיטלית, להציג את העסק בצורה חכמה יותר ולתקשר טוב יותר עם לקוחות."
  },
  {
    q: "האם הבלוג מתאים גם לעסקים קטנים או בתחילת הדרך?",
    a: "כן. חלק גדול מהתוכן בבלוג נכתב בדיוק עבור עסקים קטנים, עצמאיים ועסקים שנמצאים בתחילת הדרך, ורוצים לקבל החלטות טובות יותר בלי להסתבך עם פתרונות טכניים מיותרים."
  },
  {
    q: "למה כרטיס ביקור דיגיטלי חשוב גם מבחינת נוכחות בגוגל?",
    a: "כרטיס ביקור דיגיטלי יכול לעזור לעסק להיראות מקצועי יותר, לרכז מידע חשוב במקום אחד, לחזק אמון ולתמוך בנראות הדיגיטלית של העסק. כשעושים זאת נכון, הוא יכול לתרום גם להצגת פרטי העסק, קישורים, תוכן ואלמנטים שמחזקים את הנוכחות אונליין."
  },
  {
    q: "האם צריך ידע טכני כדי להבין וליישם את מה שמופיע בבלוג?",
    a: "לא. הבלוג נכתב בשפה ברורה ומעשית, כדי שגם מי שאין לו רקע טכני יוכל להבין את הרעיונות, ליישם צעדים חשובים ולקבל החלטות טובות יותר לגבי הנוכחות הדיגיטלית של העסק."
  },
  {
    q: "איך לבחור מאיזה מאמר להתחיל?",
    a: "הדרך הטובה ביותר היא להתחיל מהנושא שהכי רלוונטי לעסק שלכם כרגע - נראות דיגיטלית, יצירת קשר עם לקוחות, SEO, כרטיס ביקור דיגיטלי או שיפור הצגת השירותים. משם אפשר להמשיך לתכנים משלימים לפי הצורך."
  },
  {
    q: "האם הבלוג עוסק רק בכרטיסי ביקור דיגיטליים?",
    a: "לא. כרטיס ביקור דיגיטלי הוא מרכז חשוב, אבל הבלוג עוסק גם בתמונה הרחבה יותר: נוכחות עסקית, אמון, חוויית לקוח, קידום אורגני, תקשורת עסקית, תוכן, מיתוג והדרך שבה עסק מציג את עצמו בעולם הדיגיטלי."
  },
  {
    q: "איפה מתחילים אם עדיין אין לי כרטיס ביקור דיגיטלי?",
    a: "אם עדיין אין לכם כרטיס ביקור דיגיטלי, אפשר להתחיל קודם מלקרוא את המאמרים הרלוונטיים בבלוג, להבין מה חשוב באמת לעסק, ורק אחר כך לבנות כרטיס שמציג אתכם בצורה מקצועית, ברורה ונכונה יותר."
  }
];
const BLOG_ROOT_URL = buildMarketingUrl(getMarketingMeta("blog").path);
function buildBlogFaqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${BLOG_ROOT_URL}#faq`,
    url: BLOG_ROOT_URL,
    inLanguage: "he",
    mainEntity: BLOG_FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a
      }
    }))
  };
}
const blogFaqJsonLd = buildBlogFaqJsonLd();
const meta$3 = getMarketingMeta("blog");
function formatDate$1(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("he-IL", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  } catch {
    return "";
  }
}
function Blog() {
  const { pageNum } = useParams();
  const navigate = useNavigate();
  const parsed = pageNum != null ? Number(pageNum) : 1;
  const page2 = Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 0;
  useEffect(() => {
    if (pageNum != null && page2 <= 1) {
      navigate("/blog/", { replace: true });
    }
  }, [pageNum, page2, navigate]);
  const effectivePage = page2 >= 1 ? page2 : 1;
  const initialSeed = useInitialListingData("blog");
  const hasSeed = initialSeed && Array.isArray(initialSeed.items) && effectivePage === 1;
  const [posts, setPosts] = useState(
    () => hasSeed ? initialSeed.items : []
  );
  const [total, setTotal] = useState(
    () => hasSeed ? initialSeed.total || 0 : 0
  );
  const [loading, setLoading] = useState(() => hasSeed ? false : true);
  const [error2, setError] = useState(null);
  const skipFirstFetchRef = useRef(hasSeed);
  useEffect(() => {
    trackSitePageView();
  }, []);
  useEffect(() => {
    if (skipFirstFetchRef.current) {
      skipFirstFetchRef.current = false;
      return;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/blog?page=${effectivePage}&limit=${PAGE_LIMIT$1}`
        );
        if (!res.ok) throw new Error("שגיאה בטעינת הבלוג");
        const data = await res.json();
        if (!cancelled) {
          setPosts(data.items || []);
          setTotal(data.total || 0);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "שגיאה בטעינת הבלוג");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [effectivePage]);
  const totalPages = Math.ceil(total / PAGE_LIMIT$1);
  useEffect(() => {
    if (loading || totalPages === 0) return;
    if (effectivePage > totalPages) {
      navigate(totalPages <= 1 ? "/blog/" : `/blog/page/${totalPages}`, {
        replace: true
      });
    }
  }, [loading, effectivePage, totalPages, navigate]);
  const canonicalUrl2 = effectivePage <= 1 ? BLOG_ROOT_URL : `${ORIGIN$1}/blog/page/${effectivePage}`;
  return /* @__PURE__ */ jsxs("main", { "data-page": "site", children: [
    /* @__PURE__ */ jsx(
      SeoHelmet,
      {
        title: meta$3.title,
        description: meta$3.description,
        canonicalUrl: canonicalUrl2,
        url: canonicalUrl2,
        image: CARDIGO_OG_IMAGE_URL,
        imageAlt: meta$3.imageAlt,
        jsonLdItems: effectivePage <= 1 ? [blogFaqJsonLd] : []
      }
    ),
    /* @__PURE__ */ jsx("section", { className: pub.sectionDark, children: /* @__PURE__ */ jsx("div", { className: `${pub.sectionWrap} ${styles$9.heroWrap}`, children: /* @__PURE__ */ jsxs("div", { className: styles$9.heroCopy, children: [
      /* @__PURE__ */ jsxs("h1", { className: styles$9.h1, children: [
        "הבלוג של Cardigo",
        /* @__PURE__ */ jsx(
          "span",
          {
            className: `${styles$9.h1Accent} ${pub.goldUnderline}`,
            children: "כרטיס ביקור דיגיטלי שעובד נכון"
          }
        )
      ] }),
      /* @__PURE__ */ jsx(
        "img",
        {
          className: styles$9.heroImg,
          src: "/images/blog/hero/blog-cardigo-digital-bussines-card.webp",
          alt: "כרטיס ביקור דיגיטלי של Cardigo - דוגמה חיה לכרטיס עסקי מעוצב",
          width: "600",
          height: "400",
          loading: "eager"
        }
      ),
      /* @__PURE__ */ jsx("p", { className: pub.sectionLeadLight, children: "מאמרים, מדריכים ותובנות פרקטיות על כרטיסי ביקור דיגיטליים, נוכחות עסקית, לידים, SEO ותקשורת עסקית חכמה לעסקים בישראל." })
    ] }) }) }),
    /* @__PURE__ */ jsx("section", { className: pub.sectionLight, children: /* @__PURE__ */ jsxs("div", { className: `${pub.sectionWrap} ${styles$9.listingWrap}`, children: [
      /* @__PURE__ */ jsx("h2", { className: pub.h2Gold, children: "מאמרים אחרונים" }),
      /* @__PURE__ */ jsx("p", { className: pub.sectionLead, children: "כאן תמצאו תוכן מעשי שיעזור לכם להבין איך להציג את העסק טוב יותר, לחזק נוכחות דיגיטלית, לשפר תקשורת עם לקוחות ולהפיק יותר ערך מכרטיס ביקור דיגיטלי." }),
      loading && posts.length === 0 && /* @__PURE__ */ jsx("p", { className: styles$9.status, children: "טוען…" }),
      error2 && /* @__PURE__ */ jsx("p", { className: styles$9.statusError, children: error2 }),
      !loading && !error2 && posts.length === 0 && /* @__PURE__ */ jsx("p", { className: styles$9.status, children: "אין מאמרים עדיין." }),
      posts.length > 0 && /* @__PURE__ */ jsx("div", { className: styles$9.grid, children: posts.map((post) => /* @__PURE__ */ jsxs("article", { className: styles$9.card, children: [
        /* @__PURE__ */ jsx(
          "img",
          {
            className: styles$9.cardImage,
            src: post.heroImageUrl || BLOG_COVER_FALLBACK,
            alt: post.heroImageAlt || post.title || "",
            loading: "lazy"
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: styles$9.cardBody, children: [
          CONTENT_DISPLAY_POLICY.showPublishedDates && post.publishedAt && /* @__PURE__ */ jsx(
            "time",
            {
              className: styles$9.cardDate,
              dateTime: post.publishedAt,
              children: formatDate$1(
                post.publishedAt
              )
            }
          ),
          /* @__PURE__ */ jsx("h3", { className: styles$9.cardTitle, children: /* @__PURE__ */ jsx(Link, { to: `/blog/${post.slug}`, children: post.title }) }),
          post.excerpt && /* @__PURE__ */ jsx("p", { className: styles$9.cardExcerpt, children: post.excerpt }),
          /* @__PURE__ */ jsx(
            Link,
            {
              to: `/blog/${post.slug}`,
              className: styles$9.cardCta,
              onClick: () => trackSiteClick({
                action: SITE_ACTIONS.blog_article_click,
                pagePath: "/blog"
              }),
              children: "קרא עוד"
            }
          )
        ] })
      ] }, post.id)) }),
      totalPages > 1 && /* @__PURE__ */ jsxs(
        "nav",
        {
          className: styles$9.pagination,
          "aria-label": "ניווט עמודים",
          children: [
            effectivePage > 1 && /* @__PURE__ */ jsx(
              Link,
              {
                className: styles$9.pageBtn,
                to: effectivePage === 2 ? "/blog/" : `/blog/page/${effectivePage - 1}`,
                children: "הקודם"
              }
            ),
            /* @__PURE__ */ jsxs("span", { className: styles$9.pageInfo, children: [
              effectivePage,
              " / ",
              totalPages
            ] }),
            effectivePage < totalPages && /* @__PURE__ */ jsx(
              Link,
              {
                className: styles$9.pageBtn,
                to: `/blog/page/${effectivePage + 1}`,
                children: "הבא"
              }
            )
          ]
        }
      )
    ] }) }),
    /* @__PURE__ */ jsx("p", { className: styles$9.seeExamples, children: /* @__PURE__ */ jsx(Link, { to: "/cards", children: "ראו דוגמאות לכרטיסי ביקור דיגיטליים" }) }),
    /* @__PURE__ */ jsx("section", { className: pub.sectionDark, id: "faq", children: /* @__PURE__ */ jsxs("div", { className: pub.sectionWrap, children: [
      /* @__PURE__ */ jsx("h2", { className: pub.h2Gold, children: "שאלות נפוצות על הבלוג של Cardigo" }),
      /* @__PURE__ */ jsx("div", { className: pub.faq, children: BLOG_FAQ.map((item, i) => /* @__PURE__ */ jsxs("details", { className: pub.qa, children: [
        /* @__PURE__ */ jsx("summary", { children: item.q }),
        /* @__PURE__ */ jsx("div", { className: pub.answer, children: item.a })
      ] }, i)) })
    ] }) })
  ] });
}
const root$1 = "_root_36v69_1";
const body = "_body_36v69_35";
const close = "_close_36v69_45";
const success = "_success_36v69_101";
const error = "_error_36v69_109";
const info = "_info_36v69_117";
const styles$8 = {
  root: root$1,
  body,
  close,
  success,
  error,
  info
};
const cx = (...classes) => classes.filter(Boolean).join(" ");
function FlashBanner({
  type = "info",
  message,
  autoHideMs = 4500,
  onDismiss
}) {
  const [open, setOpen] = useState(Boolean(message));
  useEffect(() => {
    setOpen(Boolean(message));
  }, [message]);
  const role = type === "error" ? "alert" : "status";
  const className = useMemo(() => {
    return cx(
      styles$8.root,
      type === "success" ? styles$8.success : type === "error" ? styles$8.error : styles$8.info
    );
  }, [type]);
  useEffect(() => {
    if (!open) return;
    if (!autoHideMs) return;
    const timer = setTimeout(() => {
      setOpen(false);
      onDismiss?.();
    }, autoHideMs);
    return () => clearTimeout(timer);
  }, [open, autoHideMs, onDismiss]);
  if (!open || !message) return null;
  return /* @__PURE__ */ jsxs("div", { className, role, "aria-live": "polite", dir: "rtl", children: [
    /* @__PURE__ */ jsx("div", { className: styles$8.body, children: message }),
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        className: styles$8.close,
        onClick: () => {
          setOpen(false);
          onDismiss?.();
        },
        "aria-label": "סגירה",
        children: "×"
      }
    )
  ] });
}
const paymentBanner = "_paymentBanner_nsx4p_19";
const heroWrap$6 = "_heroWrap_nsx4p_41";
const heroCopy$2 = "_heroCopy_nsx4p_53";
const h1$6 = "_h1_nsx4p_67";
const h1Accent$1 = "_h1Accent_nsx4p_121";
const heroActions$1 = "_heroActions_nsx4p_167";
const heroCta$1 = "_heroCta_nsx4p_185";
const heroSecondary$1 = "_heroSecondary_nsx4p_215";
const heroTrialNote$1 = "_heroTrialNote_nsx4p_223";
const heroTrialCrown$1 = "_heroTrialCrown_nsx4p_247";
const heroStage = "_heroStage_nsx4p_261";
const stageImg = "_stageImg_nsx4p_279";
const trustLine = "_trustLine_nsx4p_295";
const plansRow = "_plansRow_nsx4p_317";
const planCard = "_planCard_nsx4p_363";
const planCardFeatured = "_planCardFeatured_nsx4p_433";
const planBadge = "_planBadge_nsx4p_459";
const planTitle = "_planTitle_nsx4p_479";
const planPrice = "_planPrice_nsx4p_491";
const planPriceOnly = "_planPriceOnly_nsx4p_505";
const planCadence = "_planCadence_nsx4p_523";
const planNote = "_planNote_nsx4p_533";
const planCta = "_planCta_nsx4p_549";
const planCtaFeatured = "_planCtaFeatured_nsx4p_559";
const accordionStack = "_accordionStack_nsx4p_589";
const accordionBlock = "_accordionBlock_nsx4p_605";
const accordionTitle = "_accordionTitle_nsx4p_627";
const accordionList = "_accordionList_nsx4p_709";
const accordionItem = "_accordionItem_nsx4p_727";
const accordionItemNegative = "_accordionItemNegative_nsx4p_759";
const accordionBlockHighlight = "_accordionBlockHighlight_nsx4p_777";
const accordionBody = "_accordionBody_nsx4p_793";
const plansLegalNote = "_plansLegalNote_nsx4p_809";
const plansLegalNoteLink = "_plansLegalNoteLink_nsx4p_831";
const b2bBlock = "_b2bBlock_nsx4p_845";
const b2bHeader = "_b2bHeader_nsx4p_899";
const b2bBody = "_b2bBody_nsx4p_911";
const b2bFooter = "_b2bFooter_nsx4p_923";
const b2bKicker = "_b2bKicker_nsx4p_935";
const b2bHeadline = "_b2bHeadline_nsx4p_949";
const b2bLead = "_b2bLead_nsx4p_965";
const b2bList = "_b2bList_nsx4p_979";
const b2bItem = "_b2bItem_nsx4p_1001";
const b2bCta = "_b2bCta_nsx4p_1033";
const b2bSupport = "_b2bSupport_nsx4p_1053";
const annualStage = "_annualStage_nsx4p_1071";
const annualImg = "_annualImg_nsx4p_1089";
const annualCopy = "_annualCopy_nsx4p_1101";
const annualParagraph = "_annualParagraph_nsx4p_1117";
const annualLink = "_annualLink_nsx4p_1131";
const annualCta = "_annualCta_nsx4p_1155";
const ctaStage = "_ctaStage_nsx4p_1183";
const ctaImg = "_ctaImg_nsx4p_1201";
const ctaCopy$1 = "_ctaCopy_nsx4p_1213";
const ctaIntro = "_ctaIntro_nsx4p_1229";
const ctaLink = "_ctaLink_nsx4p_1243";
const ctaList = "_ctaList_nsx4p_1267";
const ctaItem = "_ctaItem_nsx4p_1285";
const ctaButton = "_ctaButton_nsx4p_1317";
const faqLink = "_faqLink_nsx4p_1345";
const styles$7 = {
  paymentBanner,
  heroWrap: heroWrap$6,
  heroCopy: heroCopy$2,
  h1: h1$6,
  h1Accent: h1Accent$1,
  heroActions: heroActions$1,
  heroCta: heroCta$1,
  heroSecondary: heroSecondary$1,
  heroTrialNote: heroTrialNote$1,
  heroTrialCrown: heroTrialCrown$1,
  heroStage,
  stageImg,
  trustLine,
  plansRow,
  planCard,
  planCardFeatured,
  planBadge,
  planTitle,
  planPrice,
  planPriceOnly,
  planCadence,
  planNote,
  planCta,
  planCtaFeatured,
  accordionStack,
  accordionBlock,
  accordionTitle,
  accordionList,
  accordionItem,
  accordionItemNegative,
  accordionBlockHighlight,
  accordionBody,
  plansLegalNote,
  plansLegalNoteLink,
  b2bBlock,
  b2bHeader,
  b2bBody,
  b2bFooter,
  b2bKicker,
  b2bHeadline,
  b2bLead,
  b2bList,
  b2bItem,
  b2bCta,
  b2bSupport,
  annualStage,
  annualImg,
  annualCopy,
  annualParagraph,
  annualLink,
  annualCta,
  ctaStage,
  ctaImg,
  ctaCopy: ctaCopy$1,
  ctaIntro,
  ctaLink,
  ctaList,
  ctaItem,
  ctaButton,
  faqLink
};
const PRICING_FAQ = [
  {
    q: "מה כולל המסלול החינמי של Cardigo?",
    a: /* @__PURE__ */ jsxs(Fragment, { children: [
      "המסלול החינמי של",
      " ",
      /* @__PURE__ */ jsx(Link, { to: "/", className: styles$7.faqLink, children: "Cardigo" }),
      " ",
      "כולל כרטיס ביקור דיגיטלי מקצועי, שיתוף בוואטסאפ וברשתות, קוד QR ושמירת איש קשר - בחינם ולתמיד. בנוסף, כל משתמש חדש מקבל 10 ימי פרימיום כדי להכיר את כל היכולות המתקדמות."
    ] })
  },
  {
    q: "מה ההבדל בין המסלול החודשי למסלול השנתי?",
    a: "המסלול החודשי מתאים לעסקים שרוצים גמישות מלאה בלי להתחייב לשנה, בעוד שהמסלול השנתי מתאים לעסקים שמחפשים יציבות, רצף וחיסכון לעומת תשלום חודשי מצטבר."
  },
  {
    q: "למי מתאים המסלול השנתי של כרטיס ביקור דיגיטלי?",
    a: "המסלול השנתי מתאים לעסק שרואה בכרטיס הדיגיטלי חלק קבוע מהנוכחות שלו מול לקוחות, ורוצה ליהנות גם מחיסכון וגם מראש שקט לאורך זמן."
  },
  {
    q: "האם אפשר להתחיל ב־Cardigo בלי ידע טכני?",
    a: "כן. Cardigo בנויה כך שגם עסקים בלי רקע טכני יוכלו להקים, לערוך ולשתף כרטיס ביקור דיגיטלי בצורה פשוטה וברורה."
  },
  {
    q: "איך Cardigo עוזרת לעסק להיראות מקצועי יותר?",
    a: /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx(Link, { to: "/", className: styles$7.faqLink, children: "Cardigo" }),
      " ",
      "עוזרת לעסק להציג פרטי קשר, תוכן, עיצוב ושיתוף במקום אחד, בצורה מסודרת ונוחה לנייד. כך הלקוח רואה עסק ברור, נגיש ומקצועי יותר."
    ] })
  },
  {
    q: "האם Cardigo מתאימה גם לעסקים קטנים ולעצמאים?",
    a: "כן. Cardigo מתאימה לעצמאים, לבעלי מקצוע ולעסקים קטנים שרוצים דרך פשוטה להיראות טוב יותר אונליין, לשתף את העסק בקלות ולרכז את כל המידע החשוב במקום אחד."
  },
  {
    q: "מה העסק מקבל מעבר לכרטיס ביקור דיגיטלי בסיסי?",
    a: "מעבר למראה מקצועי, Cardigo נותנת לעסק דרך נוחה לשתף, לעדכן, לאסוף פניות ולעקוב אחרי פעילות - בהתאם למסלול שנבחר. לכן היא לא רק כרטיס, אלא גם כלי עבודה עסקי."
  },
  {
    q: "האם אפשר לשנות מסלול בהמשך?",
    a: "כן. אפשר להתחיל בצורה שמתאימה לעסק עכשיו, ובהמשך לעבור למסלול אחר לפי הצורך, קצב העבודה והשלב שבו העסק נמצא."
  },
  {
    q: "האם Cardigo מתאימה גם לחברות וארגונים?",
    a: /* @__PURE__ */ jsxs(Fragment, { children: [
      "כן. לחברות וארגונים",
      " ",
      /* @__PURE__ */ jsx(Link, { to: "/", className: styles$7.faqLink, children: "Cardigo" }),
      " ",
      "מציעה פתרון מסודר יותר, עם אפשרות לחשוב במונחים של צוות, ניהול מרכזי וכתובת ארגונית תחת המותג. אם מדובר בארגון, עדיף לדבר איתנו כדי להתאים פתרון נכון."
    ] })
  },
  {
    q: "איך לבחור את המסלול הנכון לעסק שלי?",
    a: "אם אתם רוצים להתחיל בלי עלות - המסלול החינמי פתוח לתמיד. אם חשוב לכם לעבוד בגמישות - המסלול החודשי יתאים לכם. אם אתם מחפשים רצף וחיסכון - המסלול השנתי הוא הבחירה הנכונה. ואם מדובר בצוות או חברה, כדאי לפנות אלינו לפתרון ארגוני."
  }
];
const FREE_ACCORDIONS = [
  {
    title: "מה כלול במסלול",
    items: [
      "כרטיס ביקור דיגיטלי מקצועי",
      "עריכה עצמית פשוטה",
      "עיצוב עצמי פשוט",
      "תבניות מעוצבות להתחלה מהירה",
      "שיתוף בוואטסאפ וברשתות (חלקי)",
      "קוד QR מוכן לשיתוף",
      "שמירת איש קשר בלחיצה",
      "סקשן שאלות נפוצות",
      "סקשן אודות העסק (חלקי)",
      "סקשן משובים"
    ]
  },
  {
    title: "מה לא כלול במסלול",
    tone: "negative",
    items: [
      "הופעת כרטיס בתוצאות גוגל",
      "גלריית תמונות מורחבת",
      "סרטון YouTube בכרטיס",
      "טופס לידים ואיסוף פניות",
      "מעקב פעילות ואנליטיקה",
      "SEO ונוכחות דיגיטלית מתקדמת",
      "כתובת אישית ועיצוב מתקדם",
      "הזמנת תורים (booking)",
      "שירותים",
      "שעות פעילות של העסק",
      "יצירת תוכן עם AI"
    ]
  },
  {
    title: "למי זה מתאים",
    items: [
      "לעסק שרוצה נוכחות דיגיטלית בלי עלות",
      "לכל מי שרוצה כרטיס מקצועי לשיתוף מיידי",
      "למי שרוצה להתחיל בקטן ולשדרג כשמתאים"
    ]
  }
];
const MONTHLY_ACCORDIONS = [
  {
    title: "פיצ׳רים בסיסיים",
    items: [
      "כרטיס ביקור דיגיטלי מקצועי",
      "עריכה עצמית פשוטה",
      "עיצוב עצמי פשוט",
      "תבניות מעוצבות להתחלה מהירה",
      "שיתוף בוואטסאפ וברשתות",
      "קוד QR מוכן לשיתוף",
      "שמירת איש קשר בלחיצה",
      "סקשן שאלות נפוצות",
      "סקשן אודות העסק",
      "סקשן משובים"
    ]
  },
  {
    title: "פיצ׳רי פרימיום",
    items: [
      "הופעת כרטיס בתוצאות גוגל",
      "גלריית תמונות מורחבת",
      "סרטון YouTube בכרטיס",
      "טופס לידים ואיסוף פניות",
      "מעקב פעילות ואנליטיקה",
      "SEO ונוכחות דיגיטלית מתקדמת",
      "כתובת אישית ועיצוב מתקדם",
      "הזמנת תורים (booking)",
      "שירותים",
      "שעות פעילות של העסק",
      "יצירת תוכן עם AI"
    ]
  },
  {
    title: "למי זה מתאים",
    items: [
      "לעסק שרוצה גמישות מלאה",
      "מסלול מתחדש אוטומטית - ניתן לבטל לפני החיוב הבא",
      "מתאים לעבודה שוטפת בלי התחייבות לשנה"
    ]
  },
  {
    title: "איך עובד החיוב",
    tone: "highlight",
    body: "חיוב חודשי מתחדש אוטומטית עד לביטול. ניתן לבטל לפני מועד החיוב הבא, והביטול ייכנס לתוקף בסוף התקופה שכבר שולמה."
  }
];
const ANNUAL_ACCORDIONS = [
  {
    title: "פיצ׳רים בסיסיים",
    items: [
      "כרטיס ביקור דיגיטלי מקצועי",
      "עריכה עצמית פשוטה",
      "עיצוב עצמי פשוט",
      "תבניות מעוצבות להתחלה מהירה",
      "שיתוף בוואטסאפ וברשתות",
      "קוד QR מוכן לשיתוף",
      "שמירת איש קשר בלחיצה",
      "סקשן שאלות נפוצות",
      "סקשן אודות העסק",
      "סקשן משובים"
    ]
  },
  {
    title: "פיצ׳רי פרימיום",
    items: [
      "הופעת כרטיס בתוצאות גוגל",
      "גלריית תמונות מורחבת",
      "סרטון YouTube בכרטיס",
      "טופס לידים ואיסוף פניות",
      "מעקב פעילות ואנליטיקה",
      "SEO ונוכחות דיגיטלית מתקדמת",
      "כתובת אישית ועיצוב מתקדם",
      "הזמנת תורים (booking)",
      "שירותים",
      "שעות פעילות של העסק",
      "יצירת תוכן עם AI"
    ]
  },
  {
    title: "יתרונות המסלול השנתי",
    items: [
      "חיסכון של ₪49 בשנה",
      "יציבות לעסק לאורך שנה",
      "שקט בלי חידוש חודשי מתמשך"
    ]
  },
  {
    title: "איך עובד החיוב",
    tone: "highlight",
    body: "תשלום שנתי מראש עבור 12 חודשים. חידוש שנתי אוטומטי יתבצע רק אם תופעל בחירה מפורשת מראש. תישלח תזכורת 14 ימים לפני חידוש שנתי אוטומטי."
  }
];
function GroupedAccordions({ groups }) {
  return /* @__PURE__ */ jsx("div", { className: styles$7.accordionStack, children: groups.map((g) => /* @__PURE__ */ jsxs(
    "details",
    {
      className: g.tone === "highlight" ? `${styles$7.accordionBlock} ${styles$7.accordionBlockHighlight}` : styles$7.accordionBlock,
      children: [
        /* @__PURE__ */ jsx("summary", { className: styles$7.accordionTitle, children: g.title }),
        g.body && /* @__PURE__ */ jsx("p", { className: styles$7.accordionBody, children: g.body }),
        g.items && /* @__PURE__ */ jsx("ul", { className: styles$7.accordionList, children: g.items.map((item) => /* @__PURE__ */ jsx(
          "li",
          {
            className: g.tone === "negative" ? `${styles$7.accordionItem} ${styles$7.accordionItemNegative}` : styles$7.accordionItem,
            children: item
          },
          item
        )) })
      ]
    },
    g.title
  )) });
}
const PAYMENT_FLASH = {
  success: {
    type: "success",
    message: "התשלום התקבל בהצלחה. החשבון יתעדכן תוך כמה דקות. אם לא השתנה - רעננו את הדף."
  },
  fail: {
    type: "error",
    message: "התשלום לא הושלם. אפשר לנסות שוב."
  }
};
function buildPricingFaqJsonLd(canonicalBase) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${canonicalBase}#faq`,
    url: canonicalBase,
    inLanguage: "he",
    mainEntity: PRICING_FAQ.filter(
      (item) => typeof item.a === "string"
    ).map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a
      }
    }))
  };
}
const meta$2 = getMarketingMeta("pricing");
const canonicalUrl$1 = buildMarketingUrl(meta$2.path);
const pricingFaqJsonLd = buildPricingFaqJsonLd(canonicalUrl$1);
function Pricing() {
  const [searchParams, setSearchParams] = useSearchParams();
  const payment = searchParams.get("payment");
  const flash = PAYMENT_FLASH[payment] || null;
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [payBusy, setPayBusy] = useState(false);
  useEffect(() => {
    trackSitePageView();
  }, []);
  async function handlePricingCta(plan) {
    if (!isAuthenticated) {
      navigate("/register");
      return;
    }
    navigate(`/payment/checkout?plan=${encodeURIComponent(plan)}`);
  }
  function dismissBanner() {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("payment");
        return next;
      },
      { replace: true }
    );
  }
  return /* @__PURE__ */ jsxs("main", { "data-page": "site", children: [
    /* @__PURE__ */ jsx(
      SeoHelmet,
      {
        title: meta$2.title,
        description: meta$2.description,
        canonicalUrl: canonicalUrl$1,
        url: canonicalUrl$1,
        image: CARDIGO_OG_IMAGE_URL,
        imageAlt: meta$2.imageAlt,
        jsonLdItems: [pricingFaqJsonLd]
      }
    ),
    flash && /* @__PURE__ */ jsx("div", { className: styles$7.paymentBanner, children: /* @__PURE__ */ jsx(
      FlashBanner,
      {
        type: flash.type,
        message: flash.message,
        autoHideMs: 0,
        onDismiss: dismissBanner
      }
    ) }),
    /* @__PURE__ */ jsx("section", { className: pub.sectionDark, children: /* @__PURE__ */ jsxs("div", { className: `${pub.sectionWrap} ${styles$7.heroWrap}`, children: [
      /* @__PURE__ */ jsxs("div", { className: styles$7.heroCopy, children: [
        /* @__PURE__ */ jsxs("h1", { className: styles$7.h1, children: [
          "בחרו את הדרך הנכונה",
          /* @__PURE__ */ jsx(
            "span",
            {
              className: `${styles$7.h1Accent} ${pub.goldUnderline}`,
              children: "להתחיל עם Cardigo"
            }
          )
        ] }),
        /* @__PURE__ */ jsx("p", { className: pub.sectionLeadLight, children: "הכרטיס הדיגיטלי שמציג את העסק שלכם בצורה מקצועית, מדויקת ומעוצבת - בכל מכשיר, בכל רגע, עם כל מה שצריך בעמוד אחד." }),
        /* @__PURE__ */ jsx("div", { className: styles$7.heroStage, children: /* @__PURE__ */ jsx(
          "img",
          {
            src: "/images/Pricing/Cardigo-bussines-digital-card-bussiness-growth.webp",
            alt: "כרטיס ביקור דיגיטלי לעסקים - Cardigo",
            className: styles$7.stageImg,
            width: 960,
            height: 540,
            loading: "eager",
            decoding: "async"
          }
        ) }),
        /* @__PURE__ */ jsxs("div", { className: styles$7.heroActions, children: [
          /* @__PURE__ */ jsx(
            Button,
            {
              as: Link,
              to: "/register",
              variant: "primary",
              className: styles$7.heroCta,
              onClick: () => trackSiteClick({
                action: SITE_ACTIONS.pricing_trial_start,
                pagePath: "/pricing"
              }),
              children: "להתחיל בחינם"
            }
          ),
          /* @__PURE__ */ jsx(
            Button,
            {
              as: "a",
              href: "#plans",
              variant: "secondary",
              className: styles$7.heroSecondary,
              children: "לראות את המסלולים"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxs("span", { className: styles$7.heroTrialNote, children: [
        "כולל 10 ימי פרימיום למשתמשים חדשים",
        /* @__PURE__ */ jsx(CrownIcon, { className: styles$7.heroTrialCrown })
      ] }),
      /* @__PURE__ */ jsx("p", { className: styles$7.trustLine, children: "לעסק שרוצה להיראות מקצועי כבר מהיום הראשון." })
    ] }) }),
    /* @__PURE__ */ jsx("section", { id: "plans", className: pub.sectionLight, children: /* @__PURE__ */ jsxs("div", { className: pub.sectionWrap, children: [
      /* @__PURE__ */ jsx("h2", { className: pub.h2Gold, children: "בחרו את המסלול שמתאים לעסק שלכם" }),
      /* @__PURE__ */ jsx("p", { className: pub.sectionLead, children: "מסלול חינמי לתמיד, מסלול חודשי גמיש או מסלול שנתי משתלם - לעסק שרוצה יציבות ונוכחות מקצועית לאורך זמן." }),
      /* @__PURE__ */ jsxs("div", { className: styles$7.plansRow, children: [
        /* @__PURE__ */ jsxs("div", { className: styles$7.planCard, children: [
          /* @__PURE__ */ jsx("span", { className: styles$7.planTitle, children: "חינם" }),
          /* @__PURE__ */ jsx("span", { className: styles$7.planPrice, children: "₪0" }),
          /* @__PURE__ */ jsx("span", { className: styles$7.planBadge, children: "10 ימי פרימיום עלינו למשתמשים חדשים" }),
          /* @__PURE__ */ jsx("span", { className: styles$7.planCadence, children: "לתמיד" }),
          /* @__PURE__ */ jsx("p", { className: styles$7.planNote, children: "כרטיס ביקור דיגיטלי מקצועי - פעיל, ניתן לשיתוף ובחינם לתמיד." }),
          /* @__PURE__ */ jsx(GroupedAccordions, { groups: FREE_ACCORDIONS }),
          /* @__PURE__ */ jsx(
            Button,
            {
              as: Link,
              to: "/register",
              variant: "secondary",
              className: styles$7.planCta,
              onClick: () => trackSiteClick({
                action: SITE_ACTIONS.pricing_trial_start,
                pagePath: "/pricing"
              }),
              children: "להתחיל עכשיו"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: styles$7.planCard, children: [
          /* @__PURE__ */ jsx(
            "span",
            {
              className: `${styles$7.planTitle} ${pub.goldHilight}`,
              children: "פרימיום חודשי"
            }
          ),
          /* @__PURE__ */ jsxs("span", { className: styles$7.planPrice, children: [
            /* @__PURE__ */ jsx("span", { className: styles$7.planPriceOnly, children: "רק-" }),
            "₪29"
          ] }),
          /* @__PURE__ */ jsx("span", { className: styles$7.planCadence, children: "לחודש" }),
          /* @__PURE__ */ jsx("p", { className: styles$7.planNote, children: "כל יכולות הפרימיום בתשלום חודשי גמיש - בלי התחייבות שנתית." }),
          /* @__PURE__ */ jsx(GroupedAccordions, { groups: MONTHLY_ACCORDIONS }),
          /* @__PURE__ */ jsx(
            Button,
            {
              variant: "secondary",
              className: styles$7.planCta,
              disabled: payBusy,
              onClick: () => {
                trackSiteClick({
                  action: SITE_ACTIONS.pricing_monthly_start,
                  pagePath: "/pricing"
                });
                handlePricingCta("monthly");
              },
              children: "לבחור במסלול חודשי"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs(
          "div",
          {
            className: `${styles$7.planCard} ${styles$7.planCardFeatured}`,
            children: [
              /* @__PURE__ */ jsx(
                "span",
                {
                  className: `${styles$7.planTitle} ${pub.goldHilight}`,
                  children: "פרימיום שנתי"
                }
              ),
              /* @__PURE__ */ jsxs("span", { className: styles$7.planPrice, children: [
                /* @__PURE__ */ jsx("span", { className: styles$7.planPriceOnly, children: "רק-" }),
                "₪299"
              ] }),
              /* @__PURE__ */ jsx("span", { className: styles$7.planBadge, children: "המשתלם ביותר" }),
              /* @__PURE__ */ jsx("span", { className: styles$7.planCadence, children: "לשנה" }),
              /* @__PURE__ */ jsxs("p", { className: styles$7.planNote, children: [
                "המסלול המשתלם: פרימיום מלא לשנה שלמה -",
                " ",
                /* @__PURE__ */ jsx("span", { className: pub.goldHilight, children: "חיסכון של ₪49." })
              ] }),
              /* @__PURE__ */ jsx(GroupedAccordions, { groups: ANNUAL_ACCORDIONS }),
              /* @__PURE__ */ jsx(
                Button,
                {
                  variant: "primary",
                  className: styles$7.planCtaFeatured,
                  disabled: payBusy,
                  onClick: () => {
                    trackSiteClick({
                      action: SITE_ACTIONS.pricing_annual_start,
                      pagePath: "/pricing"
                    });
                    handlePricingCta("yearly");
                  },
                  children: "לבחור במסלול שנתי"
                }
              )
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("p", { className: styles$7.plansLegalNote, children: [
        "השירותים בתשלום מיועדים לשימוש עסקי או מסחרי בלבד. לא יינתנו החזרים כספיים, למעט אם הדין החל מחייב אחרת.",
        " ",
        /* @__PURE__ */ jsx(
          Link,
          {
            to: "/payment-policy",
            className: styles$7.plansLegalNoteLink,
            children: "תנאי תשלום, חידוש, ביטול והחזרים"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$7.b2bBlock, children: [
        /* @__PURE__ */ jsxs("div", { className: styles$7.b2bHeader, children: [
          /* @__PURE__ */ jsx("span", { className: styles$7.b2bKicker, children: "לחברות וארגונים" }),
          /* @__PURE__ */ jsx("h3", { className: styles$7.b2bHeadline, children: "פתרון מרוכז לצוותים, חברות וארגונים" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: styles$7.b2bBody, children: [
          /* @__PURE__ */ jsx("p", { className: styles$7.b2bLead, children: "כרטיס דיגיטלי לכל עובד, ניהול גישה לצוות וכתובת ארגונית תחת המותג שלכם - עם תהליך חיבור מסודר שמתאים לארגון." }),
          /* @__PURE__ */ jsxs("ul", { className: styles$7.b2bList, children: [
            /* @__PURE__ */ jsx("li", { className: styles$7.b2bItem, children: "כרטיס לכל עובד תחת המותג שלכם" }),
            /* @__PURE__ */ jsx("li", { className: styles$7.b2bItem, children: "הזמנת עובדים וניהול גישה" }),
            /* @__PURE__ */ jsx("li", { className: styles$7.b2bItem, children: "ניהול מרכזי של הצוות" }),
            /* @__PURE__ */ jsx("li", { className: styles$7.b2bItem, children: "כתובת ארגונית לכל כרטיס" }),
            /* @__PURE__ */ jsx("li", { className: styles$7.b2bItem, children: "חיוב מרוכז לארגון" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: styles$7.b2bFooter, children: [
          /* @__PURE__ */ jsx(
            Button,
            {
              as: Link,
              to: "/contact",
              variant: "secondary",
              className: styles$7.b2bCta,
              onClick: () => trackSiteClick({
                action: SITE_ACTIONS.contact_email_click,
                pagePath: "/pricing"
              }),
              children: "לקבלת הצעה לארגון"
            }
          ),
          /* @__PURE__ */ jsx("p", { className: styles$7.b2bSupport, children: "נחזור אליכם עם פתרון שמתאים לגודל הצוות ולצרכים של הארגון." })
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx("section", { className: pub.sectionDark, children: /* @__PURE__ */ jsxs("div", { className: pub.sectionWrap, children: [
      /* @__PURE__ */ jsx("h2", { className: pub.h2White, children: "למה עסקים בוחרים במסלול השנתי" }),
      /* @__PURE__ */ jsx("div", { className: styles$7.annualStage, children: /* @__PURE__ */ jsx(
        "img",
        {
          src: "/images/Pricing/anual-section/כרטיס ביקור דיגיטלי שנתי.webp",
          alt: "כרטיס ביקור דיגיטלי במסלול שנתי לעסקים של Cardigo",
          className: styles$7.annualImg,
          width: 960,
          height: 540,
          loading: "lazy",
          decoding: "async"
        }
      ) }),
      /* @__PURE__ */ jsxs("div", { className: styles$7.annualCopy, children: [
        /* @__PURE__ */ jsxs("p", { className: styles$7.annualParagraph, children: [
          "עסקים שבוחרים ב־",
          /* @__PURE__ */ jsx(Link, { to: "/", className: styles$7.annualLink, children: "Cardigo" }),
          " ",
          "לטווח ארוך לא מחפשים רק כרטיס ביקור דיגיטלי יפה, אלא פתרון יציב שממשיך לעבוד בשביל העסק גם לאורך זמן. כאשר הכרטיס הוא חלק מהנוכחות הדיגיטלית, מהשיתוף עם לקוחות ומהדרך שבה העסק נראה אונליין - מסלול שנתי הופך לבחירה חכמה יותר."
        ] }),
        /* @__PURE__ */ jsx("p", { className: styles$7.annualParagraph, children: "המסלול השנתי מתאים לעסקים שרוצים פחות התעסקות, יותר רצף וחיסכון אמיתי לעומת תשלום חודשי מצטבר. במקום לחשוב כל חודש מחדש, אפשר לבחור פעם אחת ולהמשיך קדימה עם נוכחות מקצועית, מסודרת ויציבה." })
      ] }),
      /* @__PURE__ */ jsx(
        Button,
        {
          as: Link,
          to: "/register",
          variant: "primary",
          className: styles$7.annualCta,
          onClick: () => trackSiteClick({
            action: SITE_ACTIONS.pricing_trial_start,
            pagePath: "/pricing"
          }),
          children: "להתחיל בחינם"
        }
      )
    ] }) }),
    /* @__PURE__ */ jsx("section", { className: pub.sectionLight, children: /* @__PURE__ */ jsxs("div", { className: pub.sectionWrap, children: [
      /* @__PURE__ */ jsx("h2", { className: pub.h2Gold, children: "מה העסק שלכם מקבל עם Cardigo" }),
      /* @__PURE__ */ jsx("div", { className: styles$7.ctaStage, children: /* @__PURE__ */ jsx(
        "img",
        {
          src: "/images/Pricing/cta-section/כרטיס ביקור דיגיטלי כרדיגו.webp",
          alt: "כרטיס ביקור דיגיטלי של Cardigo לעסק",
          className: styles$7.ctaImg,
          width: 960,
          height: 540,
          loading: "lazy",
          decoding: "async"
        }
      ) }),
      /* @__PURE__ */ jsxs("div", { className: styles$7.ctaCopy, children: [
        /* @__PURE__ */ jsxs("p", { className: styles$7.ctaIntro, children: [
          "עם",
          " ",
          /* @__PURE__ */ jsx(Link, { to: "/", className: styles$7.ctaLink, children: "Cardigo" }),
          " ",
          "העסק שלכם מקבל נוכחות דיגיטלית מסודרת, דרך פשוטה לשיתוף עם לקוחות וכלי עבודה שעוזרים להיראות מקצועי כבר מהיום הראשון."
        ] }),
        /* @__PURE__ */ jsxs("ul", { className: styles$7.ctaList, children: [
          /* @__PURE__ */ jsx("li", { className: styles$7.ctaItem, children: "כרטיס ביקור דיגיטלי שנראה מקצועי ועובד היטב בנייד" }),
          /* @__PURE__ */ jsx("li", { className: styles$7.ctaItem, children: "שיתוף מהיר עם לקוחות בוואטסאפ, בלינק וב־QR" }),
          /* @__PURE__ */ jsx("li", { className: styles$7.ctaItem, children: "שליטה פשוטה בתוכן, בעיצוב ובנראות של העסק" }),
          /* @__PURE__ */ jsx("li", { className: styles$7.ctaItem, children: "כלים שעוזרים לבנות אמון, לאסוף פניות ולעקוב אחרי פעילות" }),
          /* @__PURE__ */ jsx("li", { className: styles$7.ctaItem, children: "פתרון שיכול להתחיל בקטן ולגדול יחד עם העסק" })
        ] })
      ] }),
      /* @__PURE__ */ jsx(
        Button,
        {
          as: Link,
          to: "/register",
          variant: "primary",
          className: styles$7.ctaButton,
          onClick: () => trackSiteClick({
            action: SITE_ACTIONS.pricing_trial_start,
            pagePath: "/pricing"
          }),
          children: "להתחיל בחינם"
        }
      )
    ] }) }),
    /* @__PURE__ */ jsx("section", { className: pub.sectionDark, id: "faq", children: /* @__PURE__ */ jsxs("div", { className: pub.sectionWrap, children: [
      /* @__PURE__ */ jsx("h2", { className: pub.h2White, children: "שאלות נפוצות על מחירים ועל בחירת מסלול ב־Cardigo" }),
      /* @__PURE__ */ jsx("p", { className: pub.sectionLeadLight, children: "אם אתם מתלבטים בין מסלול חינמי, מסלול חודשי, מסלול שנתי או פתרון לחברה - הנה התשובות לשאלות שעולות הכי הרבה לפני שמתחילים." }),
      /* @__PURE__ */ jsx("div", { className: pub.faq, children: PRICING_FAQ.map((item, i) => /* @__PURE__ */ jsxs("details", { className: pub.qa, children: [
        /* @__PURE__ */ jsx("summary", { children: item.q }),
        /* @__PURE__ */ jsx("div", { className: pub.answer, children: item.a })
      ] }, i)) })
    ] }) })
  ] });
}
const heroWrap$5 = "_heroWrap_1xndu_21";
const heroCopy$1 = "_heroCopy_1xndu_29";
const h1$5 = "_h1_1xndu_69";
const h1Accent = "_h1Accent_1xndu_123";
const heroImg = "_heroImg_1xndu_165";
const listingWrap = "_listingWrap_1xndu_197";
const grid = "_grid_1xndu_211";
const card = "_card_1xndu_227";
const cardImage = "_cardImage_1xndu_265";
const cardBody = "_cardBody_1xndu_279";
const cardDate = "_cardDate_1xndu_293";
const cardTitle = "_cardTitle_1xndu_305";
const cardExcerpt = "_cardExcerpt_1xndu_349";
const cardCta = "_cardCta_1xndu_373";
const status = "_status_1xndu_413";
const statusError = "_statusError_1xndu_427";
const pagination = "_pagination_1xndu_443";
const pageBtn = "_pageBtn_1xndu_459";
const pageInfo = "_pageInfo_1xndu_497";
const seeExamples = "_seeExamples_1xndu_509";
const styles$6 = {
  heroWrap: heroWrap$5,
  heroCopy: heroCopy$1,
  h1: h1$5,
  h1Accent,
  heroImg,
  listingWrap,
  grid,
  card,
  cardImage,
  cardBody,
  cardDate,
  cardTitle,
  cardExcerpt,
  cardCta,
  status,
  statusError,
  pagination,
  pageBtn,
  pageInfo,
  seeExamples
};
const ORIGIN = "https://cardigo.co.il";
const PAGE_LIMIT = 12;
const GUIDE_COVER_FALLBACK = `${ORIGIN}/images/guides/fallback/hero-cardigo-bussines-img-fallback.webp`;
const GUIDES_FAQ = [
  {
    q: "מה אפשר למצוא במדריכים של Cardigo?",
    a: "במדריכים של Cardigo תמצאו הדרכות מעשיות, צעד אחרי צעד, על כרטיסי ביקור דיגיטליים, עיצוב כרטיס, SEO, נוכחות עסקית, שיתוף עם לקוחות ושימוש מיטבי בכלים הדיגיטליים של Cardigo."
  },
  {
    q: "למי המדריכים מתאימים?",
    a: "המדריכים מתאימים לבעלי עסקים, עצמאיים, נותני שירות, אנשי מכירות, מנהלים וכל מי שרוצה ללמוד איך להפיק את המקסימום מכרטיס ביקור דיגיטלי ומנוכחות עסקית אונליין."
  },
  {
    q: "האם המדריכים מתאימים גם למי שרק מתחיל?",
    a: "כן. המדריכים נכתבו בשפה ברורה ומעשית, כך שגם מי שמתחיל מאפס יוכל לעקוב אחרי ההוראות וליישם אותן מיד."
  },
  {
    q: "מה ההבדל בין המדריכים לבלוג?",
    a: "הבלוג עוסק בתובנות, רעיונות ומגמות. המדריכים מתמקדים בהדרכה מעשית - שלב אחרי שלב - עם דוגמאות ופעולות קונקרטיות שאפשר ליישם מיד."
  },
  {
    q: "האם צריך ידע טכני כדי לעקוב אחרי המדריכים?",
    a: "לא. כל מדריך נכתב בצורה פשוטה וברורה, ללא צורך ברקע טכני קודם."
  },
  {
    q: "איך לבחור מאיזה מדריך להתחיל?",
    a: "בחרו את הנושא שהכי קרוב לצורך שלכם כרגע - בניית כרטיס, עיצוב, שיתוף, SEO, או ניהול נוכחות עסקית - ועקבו אחרי ההוראות צעד אחרי צעד."
  }
];
const GUIDES_ROOT_URL = buildMarketingUrl(getMarketingMeta("guides").path);
function buildGuidesFaqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${GUIDES_ROOT_URL}#faq`,
    url: GUIDES_ROOT_URL,
    inLanguage: "he",
    mainEntity: GUIDES_FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a
      }
    }))
  };
}
const guidesFaqJsonLd = buildGuidesFaqJsonLd();
const meta$1 = getMarketingMeta("guides");
function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("he-IL", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  } catch {
    return "";
  }
}
function Guides() {
  const { pageNum } = useParams();
  const navigate = useNavigate();
  const parsed = pageNum != null ? Number(pageNum) : 1;
  const page2 = Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 0;
  useEffect(() => {
    if (pageNum != null && page2 <= 1) {
      navigate("/guides/", { replace: true });
    }
  }, [pageNum, page2, navigate]);
  const effectivePage = page2 >= 1 ? page2 : 1;
  const initialSeed = useInitialListingData("guides");
  const hasSeed = initialSeed && Array.isArray(initialSeed.items) && effectivePage === 1;
  const [posts, setPosts] = useState(
    () => hasSeed ? initialSeed.items : []
  );
  const [total, setTotal] = useState(
    () => hasSeed ? initialSeed.total || 0 : 0
  );
  const [loading, setLoading] = useState(() => hasSeed ? false : true);
  const [error2, setError] = useState(null);
  const skipFirstFetchRef = useRef(hasSeed);
  useEffect(() => {
    trackSitePageView();
  }, []);
  useEffect(() => {
    if (skipFirstFetchRef.current) {
      skipFirstFetchRef.current = false;
      return;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/guides?page=${effectivePage}&limit=${PAGE_LIMIT}`
        );
        if (!res.ok) throw new Error("שגיאה בטעינת המדריכים");
        const data = await res.json();
        if (!cancelled) {
          setPosts(data.items || []);
          setTotal(data.total || 0);
        }
      } catch (err) {
        if (!cancelled)
          setError(err.message || "שגיאה בטעינת המדריכים");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [effectivePage]);
  const totalPages = Math.ceil(total / PAGE_LIMIT);
  useEffect(() => {
    if (loading || totalPages === 0) return;
    if (effectivePage > totalPages) {
      navigate(
        totalPages <= 1 ? "/guides/" : `/guides/page/${totalPages}`,
        { replace: true }
      );
    }
  }, [loading, effectivePage, totalPages, navigate]);
  const canonicalUrl2 = effectivePage <= 1 ? GUIDES_ROOT_URL : `${ORIGIN}/guides/page/${effectivePage}`;
  return /* @__PURE__ */ jsxs("main", { "data-page": "site", children: [
    /* @__PURE__ */ jsx(
      SeoHelmet,
      {
        title: meta$1.title,
        description: meta$1.description,
        canonicalUrl: canonicalUrl2,
        url: canonicalUrl2,
        image: CARDIGO_OG_IMAGE_URL,
        imageAlt: meta$1.imageAlt,
        jsonLdItems: effectivePage <= 1 ? [guidesFaqJsonLd] : []
      }
    ),
    /* @__PURE__ */ jsx("section", { className: pub.sectionDark, children: /* @__PURE__ */ jsx("div", { className: `${pub.sectionWrap} ${styles$6.heroWrap}`, children: /* @__PURE__ */ jsxs("div", { className: styles$6.heroCopy, children: [
      /* @__PURE__ */ jsxs("h1", { className: styles$6.h1, children: [
        "המדריכים של Cardigo",
        /* @__PURE__ */ jsx(
          "span",
          {
            className: `${styles$6.h1Accent} ${pub.goldUnderline}`,
            children: "הדרכות מעשיות לכרטיס ביקור דיגיטלי"
          }
        )
      ] }),
      /* @__PURE__ */ jsx(
        "img",
        {
          className: styles$6.heroImg,
          src: "/images/guides/hero/hero-cardigo-digital-bussines-card.webp",
          alt: "מדריכים של Cardigo - הדרכות מעשיות לכרטיס ביקור דיגיטלי",
          width: "600",
          height: "400",
          loading: "eager"
        }
      ),
      /* @__PURE__ */ jsx("p", { className: pub.sectionLeadLight, children: "מדריכים מעשיים, צעד אחרי צעד, שיעזרו לכם לבנות, לעצב ולשתף כרטיס ביקור דיגיטלי שעובד נכון - החל מהגדרות בסיסיות ועד טיפים מתקדמים." })
    ] }) }) }),
    /* @__PURE__ */ jsx("section", { className: pub.sectionLight, children: /* @__PURE__ */ jsxs("div", { className: `${pub.sectionWrap} ${styles$6.listingWrap}`, children: [
      /* @__PURE__ */ jsx("h2", { className: pub.h2Gold, children: "מדריכים אחרונים" }),
      /* @__PURE__ */ jsx("p", { className: pub.sectionLead, children: "כאן תמצאו הדרכות מעשיות שיעזרו לכם ליצור כרטיס ביקור דיגיטלי מקצועי, לנהל את הנוכחות העסקית שלכם, ולשפר את הדרך שבה לקוחות מוצאים ומכירים אתכם." }),
      loading && posts.length === 0 && /* @__PURE__ */ jsx("p", { className: styles$6.status, children: "טוען…" }),
      error2 && /* @__PURE__ */ jsx("p", { className: styles$6.statusError, children: error2 }),
      !loading && !error2 && posts.length === 0 && /* @__PURE__ */ jsx("p", { className: styles$6.status, children: "אין מדריכים עדיין." }),
      posts.length > 0 && /* @__PURE__ */ jsx("div", { className: styles$6.grid, children: posts.map((post) => /* @__PURE__ */ jsxs("article", { className: styles$6.card, children: [
        /* @__PURE__ */ jsx(
          "img",
          {
            className: styles$6.cardImage,
            src: post.heroImageUrl || GUIDE_COVER_FALLBACK,
            alt: post.heroImageAlt || post.title || "",
            loading: "lazy"
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: styles$6.cardBody, children: [
          CONTENT_DISPLAY_POLICY.showPublishedDates && post.publishedAt && /* @__PURE__ */ jsx(
            "time",
            {
              className: styles$6.cardDate,
              dateTime: post.publishedAt,
              children: formatDate(
                post.publishedAt
              )
            }
          ),
          /* @__PURE__ */ jsx("h3", { className: styles$6.cardTitle, children: /* @__PURE__ */ jsx(Link, { to: `/guides/${post.slug}`, children: post.title }) }),
          post.excerpt && /* @__PURE__ */ jsx("p", { className: styles$6.cardExcerpt, children: post.excerpt }),
          /* @__PURE__ */ jsx(
            Link,
            {
              to: `/guides/${post.slug}`,
              className: styles$6.cardCta,
              onClick: () => trackSiteClick({
                action: SITE_ACTIONS.guide_article_click,
                pagePath: "/guides"
              }),
              children: "קרא עוד"
            }
          )
        ] })
      ] }, post.id)) }),
      totalPages > 1 && /* @__PURE__ */ jsxs(
        "nav",
        {
          className: styles$6.pagination,
          "aria-label": "ניווט עמודים",
          children: [
            effectivePage > 1 && /* @__PURE__ */ jsx(
              Link,
              {
                className: styles$6.pageBtn,
                to: effectivePage === 2 ? "/guides/" : `/guides/page/${effectivePage - 1}`,
                children: "הקודם"
              }
            ),
            /* @__PURE__ */ jsxs("span", { className: styles$6.pageInfo, children: [
              effectivePage,
              " / ",
              totalPages
            ] }),
            effectivePage < totalPages && /* @__PURE__ */ jsx(
              Link,
              {
                className: styles$6.pageBtn,
                to: `/guides/page/${effectivePage + 1}`,
                children: "הבא"
              }
            )
          ]
        }
      )
    ] }) }),
    /* @__PURE__ */ jsx("p", { className: styles$6.seeExamples, children: /* @__PURE__ */ jsx(Link, { to: "/cards", children: "ראו דוגמאות לכרטיסי ביקור דיגיטליים" }) }),
    /* @__PURE__ */ jsx("section", { className: pub.sectionDark, id: "faq", children: /* @__PURE__ */ jsxs("div", { className: pub.sectionWrap, children: [
      /* @__PURE__ */ jsx("h2", { className: pub.h2Gold, children: "שאלות נפוצות על המדריכים של Cardigo" }),
      /* @__PURE__ */ jsx("div", { className: pub.faq, children: GUIDES_FAQ.map((item, i) => /* @__PURE__ */ jsxs("details", { className: pub.qa, children: [
        /* @__PURE__ */ jsx("summary", { children: item.q }),
        /* @__PURE__ */ jsx("div", { className: pub.answer, children: item.a })
      ] }, i)) })
    ] }) })
  ] });
}
const heroWrap$4 = "_heroWrap_6dxxf_19";
const heroCopy = "_heroCopy_6dxxf_31";
const h1$4 = "_h1_6dxxf_71";
const heroActions = "_heroActions_6dxxf_129";
const heroCta = "_heroCta_6dxxf_147";
const heroTrialNote = "_heroTrialNote_6dxxf_175";
const heroTrialCrown = "_heroTrialCrown_6dxxf_199";
const heroVisual = "_heroVisual_6dxxf_213";
const previewCard = "_previewCard_6dxxf_231";
const previewMain = "_previewMain_6dxxf_249";
const previewImg = "_previewImg_6dxxf_257";
const previewSide = "_previewSide_6dxxf_271";
const previewNiche = "_previewNiche_6dxxf_325";
const heroNote = "_heroNote_6dxxf_341";
const featured = "_featured_6dxxf_357";
const featuredDevices = "_featuredDevices_6dxxf_373";
const featuredDesktop = "_featuredDesktop_6dxxf_393";
const featuredDesktopImg = "_featuredDesktopImg_6dxxf_403";
const featuredPhone = "_featuredPhone_6dxxf_419";
const featuredPhoneImg = "_featuredPhoneImg_6dxxf_433";
const featuredCopy = "_featuredCopy_6dxxf_449";
const featuredLabel = "_featuredLabel_6dxxf_465";
const featuredTitle = "_featuredTitle_6dxxf_479";
const featuredBullets = "_featuredBullets_6dxxf_493";
const featuredCta = "_featuredCta_6dxxf_529";
const showcaseRail = "_showcaseRail_6dxxf_541";
const showcaseGrid = "_showcaseGrid_6dxxf_585";
const showcaseCard = "_showcaseCard_6dxxf_623";
const showcaseImg = "_showcaseImg_6dxxf_643";
const showcaseNiche = "_showcaseNiche_6dxxf_659";
const showcaseDesc = "_showcaseDesc_6dxxf_679";
const showcaseLink = "_showcaseLink_6dxxf_705";
const showcaseBottom = "_showcaseBottom_6dxxf_741";
const ctaLayout = "_ctaLayout_6dxxf_759";
const ctaCopy = "_ctaCopy_6dxxf_775";
const ctaHeading = "_ctaHeading_6dxxf_793";
const ctaText = "_ctaText_6dxxf_805";
const ctaActions = "_ctaActions_6dxxf_821";
const ctaPrimary = "_ctaPrimary_6dxxf_839";
const ctaVisual = "_ctaVisual_6dxxf_869";
const ctaImage = "_ctaImage_6dxxf_879";
const heroSecondary = "_heroSecondary_6dxxf_969";
const featuresRail = "_featuresRail_6dxxf_1097";
const featuresGrid = "_featuresGrid_6dxxf_1107";
const featureCard = "_featureCard_6dxxf_1145";
const featureImg = "_featureImg_6dxxf_1173";
const featureTitle = "_featureTitle_6dxxf_1191";
const featureText = "_featureText_6dxxf_1205";
const styles$5 = {
  heroWrap: heroWrap$4,
  heroCopy,
  h1: h1$4,
  heroActions,
  heroCta,
  heroTrialNote,
  heroTrialCrown,
  heroVisual,
  previewCard,
  previewMain,
  previewImg,
  previewSide,
  previewNiche,
  heroNote,
  featured,
  featuredDevices,
  featuredDesktop,
  featuredDesktopImg,
  featuredPhone,
  featuredPhoneImg,
  featuredCopy,
  featuredLabel,
  featuredTitle,
  featuredBullets,
  featuredCta,
  showcaseRail,
  showcaseGrid,
  showcaseCard,
  showcaseImg,
  showcaseNiche,
  showcaseDesc,
  showcaseLink,
  showcaseBottom,
  ctaLayout,
  ctaCopy,
  ctaHeading,
  ctaText,
  ctaActions,
  ctaPrimary,
  ctaVisual,
  ctaImage,
  heroSecondary,
  featuresRail,
  featuresGrid,
  featureCard,
  featureImg,
  featureTitle,
  featureText
};
const SAMPLE_IMG = "/images/sample-card-page";
const SECTION6_IMG = "/images/home-page/main-sections/Section-6";
const FEATURES_IMG = "/images/sample-card-page/cards-features";
const CARD_FEATURES = [
  {
    src: `${FEATURES_IMG}/contact-actions.webp`,
    alt: "לחצני יצירת קשר בכרטיס ביקור דיגיטלי - Cardigo",
    title: "לחצני יצירת קשר",
    text: "חיוג, וואטסאפ, ניווט ורשתות חברתיות - הלקוח בוחר איך לפנות."
  },
  {
    src: `${FEATURES_IMG}/lead-form-preview.webp`,
    alt: "טופס לידים בכרטיס ביקור דיגיטלי - Cardigo",
    title: "טופס לידים",
    text: "לקוחות משאירים פרטים - ואתם חוזרים בזמן שנוח לכם."
  },
  {
    src: `${FEATURES_IMG}/gallery-preview.webp`,
    alt: "גלריית תמונות בכרטיס ביקור דיגיטלי - Cardigo",
    title: "גלריית תמונות",
    text: "הציגו עבודות, פרויקטים ותמונות מקצועיות בצורה ויזואלית."
  },
  {
    src: `${FEATURES_IMG}/booking-preview.webp`,
    alt: "תיאום תורים בכרטיס ביקור דיגיטלי - Cardigo",
    title: "תיאום תורים",
    text: "לקוחות יכולים לקבוע תורים ישירות מהכרטיס - חוסך זמן ומייעל את התהליך."
  },
  {
    src: `${FEATURES_IMG}/reviews-preview.webp`,
    alt: "המלצות לקוחות בכרטיס ביקור דיגיטלי - Cardigo",
    title: "המלצות לקוחות",
    text: "חוות דעת אמיתיות שמחזקות אמון ומעודדות פנייה."
  },
  {
    src: `${FEATURES_IMG}/analytics-preview.webp`,
    alt: "אנליטיקה ונתונים בכרטיס ביקור דיגיטלי - Cardigo",
    title: "אנליטיקה ונתונים",
    text: "צפיות, לחיצות ומקורות תנועה - כדי שתדעו מה באמת עובד."
  }
];
const FEATURED = {
  desktop: {
    src: `${SAMPLE_IMG}/Cardigo-bussines-digital-card-desktop-view.webp`,
    alt: "כרטיס ביקור דיגיטלי בתצוגת מחשב - Cardigo"
  },
  phone: {
    src: `${SAMPLE_IMG}/Cardigo-bussines-digital-card-mobile-view.webp`,
    alt: "כרטיס ביקור דיגיטלי בתצוגת נייד - Cardigo"
  }
};
const SHOWCASE_CARDS = [
  {
    src: `${SECTION6_IMG}/כרטיס ביקור דיגיטלי ליועץ הון פרטי  כרדיגו.webp`,
    alt: "דוגמה לכרטיס ביקור דיגיטלי - ייעוץ פיננסי",
    niche: "פיננסים",
    desc: "נוכחות עסקית מקצועית עם קישורים, פרטי קשר ויצירת אמון - בקליק אחד."
  },
  {
    src: `${SECTION6_IMG}/כרטיס ביקור דיגיטלי לאדריכלית חוץ ונוף  כרדיגו.webp`,
    alt: "דוגמה לכרטיס ביקור דיגיטלי - אדריכלות",
    niche: "אדריכלות",
    desc: "הצגת פרויקטים, גלריה ודרכי יצירת קשר בצורה ויזואלית ומרשימה."
  },
  {
    src: `${SECTION6_IMG}/כרטיס ביקור דיגיטלי לרופאת שיניים אסתטית  כרדיגו.webp`,
    alt: "דוגמה לכרטיס ביקור דיגיטלי - רפואת שיניים",
    niche: "רפואה",
    desc: "כרטיס שמחבר בין מטופלים לקליניקה - ניווט, שעות פעילות ותיאום תור."
  },
  {
    src: `${SECTION6_IMG}/כרטיס ביקור דיגיטלי ליועצת חדשנות דיגיטלית ו-AI  כרדיגו.webp`,
    alt: "דוגמה לכרטיס ביקור דיגיטלי - חדשנות ו-AI",
    niche: "טכנולוגיה",
    desc: "כרטיס שמציג מומחיות, קישור לפודקאסט, אתר ורשתות חברתיות."
  },
  {
    src: `${SECTION6_IMG}/כרטיס ביקור דיגיטלי למפיקת אירועי בוטיק  כרדיגו.webp`,
    alt: "דוגמה לכרטיס ביקור דיגיטלי - הפקת אירועים",
    niche: "אירועים",
    desc: "גלריית אירועים, סרטונים, המלצות ולחצן וואטסאפ ישיר ללקוחות."
  },
  {
    src: `${SECTION6_IMG}/כרטיס ביקור דיגיטלי קליניקה לאסטטיקה  כרדיגו.webp`,
    alt: "דוגמה לכרטיס ביקור דיגיטלי - קליניקה אסתטית",
    niche: "בריאות ויופי",
    desc: "כרטיס שמקרין מקצועיות ואמינות - עם טופס לידים, גלריה ופרטי קשר."
  }
];
const HERO_PREVIEWS = [
  {
    src: "/images/home-page/main-sections/Section-6/כרטיס ביקור דיגיטלי ליועץ הון פרטי  כרדיגו.webp",
    alt: "דוגמה לכרטיס ביקור דיגיטלי - ייעוץ פיננסי",
    niche: "פיננסים"
  },
  {
    src: "/images/home-page/main-sections/Section-6/כרטיס ביקור דיגיטלי לאדריכלית חוץ ונוף  כרדיגו.webp",
    alt: "דוגמה לכרטיס ביקור דיגיטלי - אדריכלות",
    niche: "אדריכלות"
  },
  {
    src: "/images/home-page/main-sections/Section-6/כרטיס ביקור דיגיטלי לרופאת שיניים אסתטית  כרדיגו.webp",
    alt: "דוגמה לכרטיס ביקור דיגיטלי - רפואת שיניים",
    niche: "רפואה"
  }
];
const CARDS_FAQ = [
  {
    q: "הדוגמאות בעמוד הזה הן של לקוחות אמיתיים?",
    a: "הדוגמאות בעמוד נועדו להמחשה בלבד, כדי להראות איך כרטיס ביקור דיגיטלי יכול להיראות בתחומים שונים."
  },
  {
    q: "אפשר ליצור כרטיס בסגנון דומה לעסק שלי?",
    a: "כן. אפשר לבחור תבנית, להתאים טקסטים, כפתורים, תמונות ותוכן כך שהכרטיס יתאים לעסק שלכם."
  },
  {
    q: "הכרטיס נראה טוב גם בנייד וגם על מסכים גדולים?",
    a: "כן. הכרטיסים מותאמים לצפייה נוחה בנייד, ונראים מקצועיים גם כאשר פותחים אותם על מסך גדול יותר."
  },
  {
    q: "אפשר לבחור תבנית מתוך הדוגמאות שמוצגות כאן?",
    a: "הדוגמאות מציגות סגנונות אפשריים. כשנכנסים לעורך אפשר לבחור תבנית מתוך מגוון עיצובים ולהתאים אותה לצרכים שלכם."
  },
  {
    q: "האם העיצוב של הכרטיס קבוע או שאפשר לשנות אותו?",
    a: "אפשר לשנות צבעים, גופנים, תמונות ומבנה. התבנית היא נקודת התחלה - התוצאה הסופית תלויה בתוכן ובסגנון שתבחרו."
  },
  {
    q: "מה קורה אחרי שלוחצים על ׳צרו כרטיס׳?",
    a: "מגיעים לעורך שבו בוחרים תבנית, מוסיפים תוכן ומפרסמים את הכרטיס. אין צורך בידע טכני."
  },
  {
    q: "הכרטיסים בדוגמאות מתאימים גם לתחום שלי?",
    a: "הדוגמאות מייצגות תחומים שונים, אבל כל כרטיס ניתן להתאמה. גם אם התחום שלכם לא מופיע כאן - אפשר ליצור כרטיס מותאם."
  },
  {
    q: "אפשר להוסיף לכרטיס תוכן שלא מופיע בדוגמאות?",
    a: "כן. הדוגמאות מציגות חלק מהאפשרויות. בעורך אפשר להוסיף סקציות נוספות כמו גלריה, טופס לידים, המלצות, שאלות ותשובות ועוד."
  },
  {
    q: "האם אפשר לראות איך הכרטיס ייראה לפני שמפרסמים?",
    a: "כן. בתוך העורך יש תצוגה מקדימה שמראה בזמן אמת איך הכרטיס ייראה למי שיקבל את הקישור."
  },
  {
    q: "איך הדוגמאות בעמוד הזה שונות מכרטיס אמיתי?",
    a: "מבחינת מבנה ועיצוב - הן זהות. ההבדל היחיד הוא שהתוכן כאן להמחשה, ובכרטיס אמיתי תוסיפו את הפרטים שלכם."
  }
];
function buildCardsFaqJsonLd(canonicalBase) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${canonicalBase}#faq`,
    url: canonicalBase,
    inLanguage: "he",
    mainEntity: CARDS_FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a
      }
    }))
  };
}
const meta = getMarketingMeta("cards");
const canonicalUrl = buildMarketingUrl(meta.path);
const cardsFaqJsonLd = buildCardsFaqJsonLd(canonicalUrl);
function Cards() {
  useEffect(() => {
    trackSitePageView();
  }, []);
  return /* @__PURE__ */ jsxs("main", { "data-page": "site", children: [
    /* @__PURE__ */ jsx(
      SeoHelmet,
      {
        title: meta.title,
        description: meta.description,
        canonicalUrl,
        url: canonicalUrl,
        image: CARDIGO_OG_IMAGE_URL,
        imageAlt: meta.imageAlt,
        jsonLdItems: [cardsFaqJsonLd]
      }
    ),
    /* @__PURE__ */ jsx("section", { className: pub.sectionDark, children: /* @__PURE__ */ jsxs("div", { className: `${pub.sectionWrap} ${styles$5.heroWrap}`, children: [
      /* @__PURE__ */ jsxs("div", { className: styles$5.heroCopy, children: [
        /* @__PURE__ */ jsxs("h1", { className: styles$5.h1, children: [
          " ",
          "דוגמאות לכרטיסי ביקור דיגיטליים",
          " ",
          /* @__PURE__ */ jsxs(
            "span",
            {
              className: `${pub.goldHilight} ${pub.goldUnderline}`,
              children: [
                " ",
                "לעסקים"
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxs(
          "p",
          {
            className: `${pub.goldHilight} ${pub.sectionLeadLight}`,
            children: [
              "כך יכול להיראות כרטיס שמייצג את העסק שלך -",
              " ",
              /* @__PURE__ */ jsx("span", { className: pub.goldUnderline, children: "ומביא תוצאות" }),
              "."
            ]
          }
        ),
        /* @__PURE__ */ jsx("div", { className: styles$5.heroVisual, "aria-hidden": "true", children: HERO_PREVIEWS.map((p2, i) => /* @__PURE__ */ jsxs(
          "figure",
          {
            className: `${styles$5.previewCard} ${i === 1 ? styles$5.previewMain : styles$5.previewSide}`,
            children: [
              /* @__PURE__ */ jsx(
                "img",
                {
                  src: encodeURI(p2.src),
                  alt: "",
                  className: styles$5.previewImg,
                  width: 280,
                  height: 560,
                  loading: i === 1 ? "eager" : "lazy",
                  decoding: "async"
                }
              ),
              /* @__PURE__ */ jsx("figcaption", { className: styles$5.previewNiche, children: p2.niche })
            ]
          },
          i
        )) }),
        /* @__PURE__ */ jsxs("div", { className: styles$5.heroActions, children: [
          /* @__PURE__ */ jsx(
            Button,
            {
              as: Link,
              to: "/edit",
              variant: "primary",
              className: styles$5.heroCta,
              onClick: () => trackSiteClick({
                action: SITE_ACTIONS.cards_hero_cta,
                pagePath: "/cards"
              }),
              children: "צרו כרטיס דיגיטלי בחינם"
            }
          ),
          /* @__PURE__ */ jsx(
            Button,
            {
              as: Link,
              to: "/pricing",
              variant: "secondary",
              className: styles$5.heroSecondary,
              children: "מסלולים ומחירים"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxs("span", { className: styles$5.heroTrialNote, children: [
        "כולל 10 ימי פרימיום למשתמשים חדשים",
        /* @__PURE__ */ jsx(CrownIcon, { className: styles$5.heroTrialCrown })
      ] }),
      /* @__PURE__ */ jsx("p", { className: styles$5.heroNote, children: "הדוגמאות בעמוד זה מיועדות להמחשה" })
    ] }) }),
    /* @__PURE__ */ jsx("section", { className: pub.sectionLight, children: /* @__PURE__ */ jsxs("div", { className: pub.sectionWrap, children: [
      /* @__PURE__ */ jsx("h2", { className: pub.h2Gold, children: "כרטיסי ביקור דיגיטליים למגוון תחומים" }),
      /* @__PURE__ */ jsx("p", { className: pub.sectionLead, children: "כל עסק, כל מקצוע - כרטיס שנראה מקצועי ומותאם בדיוק לתחום שלכם. הנה כמה דוגמאות ויזואליות שממחישות איך זה נראה בפועל." }),
      /* @__PURE__ */ jsxs("div", { className: styles$5.featured, children: [
        /* @__PURE__ */ jsxs("div", { className: styles$5.featuredDevices, children: [
          /* @__PURE__ */ jsx("div", { className: styles$5.featuredDesktop, children: /* @__PURE__ */ jsx(
            "img",
            {
              src: FEATURED.desktop.src,
              alt: FEATURED.desktop.alt,
              className: styles$5.featuredDesktopImg,
              width: 720,
              height: 450,
              loading: "lazy",
              decoding: "async"
            }
          ) }),
          /* @__PURE__ */ jsx("div", { className: styles$5.featuredPhone, children: /* @__PURE__ */ jsx(
            "img",
            {
              src: FEATURED.phone.src,
              alt: FEATURED.phone.alt,
              className: styles$5.featuredPhoneImg,
              width: 280,
              height: 560,
              loading: "lazy",
              decoding: "async"
            }
          ) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: styles$5.featuredCopy, children: [
          /* @__PURE__ */ jsx("span", { className: styles$5.featuredLabel, children: "נוכחות דיגיטלית מקצועית" }),
          /* @__PURE__ */ jsx("h3", { className: styles$5.featuredTitle, children: "נראה מדהים בכל מסך - פלאפון, מחשב או טאבלט" }),
          /* @__PURE__ */ jsxs("ul", { className: styles$5.featuredBullets, children: [
            /* @__PURE__ */ jsx("li", { children: "הצגת העסק בעיצוב מקצועי עם מידע עדכני" }),
            /* @__PURE__ */ jsx("li", { children: "קישורים, לחצני יצירת קשר ורשתות חברתיות במקום אחד" }),
            /* @__PURE__ */ jsx("li", { children: "שיתוף בוואטסאפ, QR, SMS או אימייל - בקליק אחד" })
          ] }),
          /* @__PURE__ */ jsx(
            Button,
            {
              as: Link,
              to: "/edit/card/templates",
              variant: "secondary",
              className: styles$5.featuredCta,
              onClick: () => trackSiteClick({
                action: SITE_ACTIONS.cards_templates_cta,
                pagePath: "/cards"
              }),
              children: "בחרו תבנית והתחילו"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: styles$5.showcaseRail, children: /* @__PURE__ */ jsx("div", { className: styles$5.showcaseGrid, children: SHOWCASE_CARDS.map((card2, i) => /* @__PURE__ */ jsxs(
        "article",
        {
          className: styles$5.showcaseCard,
          children: [
            /* @__PURE__ */ jsx(
              "img",
              {
                src: encodeURI(card2.src),
                alt: card2.alt,
                className: styles$5.showcaseImg,
                width: 280,
                height: 560,
                loading: "lazy",
                decoding: "async"
              }
            ),
            /* @__PURE__ */ jsx("span", { className: styles$5.showcaseNiche, children: card2.niche }),
            /* @__PURE__ */ jsx("p", { className: styles$5.showcaseDesc, children: card2.desc }),
            /* @__PURE__ */ jsx(
              Link,
              {
                to: "/edit/card/templates",
                className: styles$5.showcaseLink,
                onClick: () => trackSiteClick({
                  action: SITE_ACTIONS.cards_showcase_card_cta,
                  pagePath: "/cards"
                }),
                children: "התחילו ליצור כרטיס ←"
              }
            )
          ]
        },
        i
      )) }) }),
      /* @__PURE__ */ jsx("div", { className: styles$5.showcaseBottom, children: /* @__PURE__ */ jsx(
        Button,
        {
          as: Link,
          to: "/edit/card/templates",
          variant: "secondary",
          onClick: () => trackSiteClick({
            action: SITE_ACTIONS.cards_showcase_view_all_cta,
            pagePath: "/cards"
          }),
          children: "ראו את כל התבניות"
        }
      ) })
    ] }) }),
    /* @__PURE__ */ jsx("section", { className: pub.sectionDark, children: /* @__PURE__ */ jsxs("div", { className: pub.sectionWrap, children: [
      /* @__PURE__ */ jsxs("h2", { className: pub.h2White, children: [
        "חלק קטן מהתכונות של הכרטיס הביקור הדיגיטלי",
        " "
      ] }),
      /* @__PURE__ */ jsxs("p", { className: pub.sectionLeadLight, children: [
        /* @__PURE__ */ jsx(
          "span",
          {
            className: `${pub.goldHilight} ${pub.goldUnderline}`,
            children: "מה שנראה לעין הוא רק חלק מהתמונה"
          }
        ),
        " ",
        "- מאחורי כל כרטיס ביקור דיגיטלי של",
        " ",
        /* @__PURE__ */ jsx(
          Link,
          {
            to: "/",
            className: `${pub.goldHilight} ${pub.goldUnderline}`,
            children: "Cardigo"
          }
        ),
        " ",
        "פועלת מערכת חכמה שעוזרת לעסק להיראות מקצועי, לאסוף לידים ולהתחזק גם מאחורי הקלעים בגוגל."
      ] }),
      /* @__PURE__ */ jsx("div", { className: styles$5.featuresRail, children: /* @__PURE__ */ jsx("div", { className: styles$5.featuresGrid, children: CARD_FEATURES.map((f, i) => /* @__PURE__ */ jsxs("article", { className: styles$5.featureCard, children: [
        /* @__PURE__ */ jsx(
          "img",
          {
            src: f.src,
            alt: f.alt,
            className: styles$5.featureImg,
            loading: "lazy",
            decoding: "async"
          }
        ),
        /* @__PURE__ */ jsx("h3", { className: styles$5.featureTitle, children: f.title }),
        /* @__PURE__ */ jsx("p", { className: styles$5.featureText, children: f.text })
      ] }, i)) }) })
    ] }) }),
    /* @__PURE__ */ jsx("section", { className: pub.sectionLight, children: /* @__PURE__ */ jsx("div", { className: pub.sectionWrap, children: /* @__PURE__ */ jsxs("div", { className: styles$5.ctaLayout, children: [
      /* @__PURE__ */ jsxs("h2", { className: `${styles$5.ctaHeading}`, children: [
        "הפכו את כרטיס הביקור שלכם",
        " ",
        /* @__PURE__ */ jsx("span", { className: pub.h2Gold, children: "למכונת לידים! " })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$5.ctaCopy, children: [
        " ",
        /* @__PURE__ */ jsx("p", { className: styles$5.ctaText, children: "תוך כמה דקות תוכלו לבחור תבנית, להוסיף תוכן ולשתף כרטיס שנראה מקצועי בכל מסך." }),
        /* @__PURE__ */ jsxs("div", { className: styles$5.ctaActions, children: [
          /* @__PURE__ */ jsx(
            Button,
            {
              as: Link,
              to: "/edit",
              variant: "primary",
              className: styles$5.ctaPrimary,
              onClick: () => trackSiteClick({
                action: SITE_ACTIONS.cards_bottom_cta,
                pagePath: "/cards"
              }),
              children: "צרו כרטיס דיגיטלי בחינם"
            }
          ),
          /* @__PURE__ */ jsx(
            Button,
            {
              as: Link,
              to: "/pricing",
              variant: "secondary",
              children: "מסלולים ומחירים"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: styles$5.ctaVisual, children: /* @__PURE__ */ jsx(
        "img",
        {
          src: "/images/sample-card-page/cards-cta/cards-cta.webp",
          alt: "כרטיס ביקור דיגיטלי לעסקים - Cardigo",
          className: styles$5.ctaImage,
          width: 800,
          height: 450,
          loading: "lazy",
          decoding: "async"
        }
      ) })
    ] }) }) }),
    /* @__PURE__ */ jsx("section", { className: pub.sectionDark, id: "faq", children: /* @__PURE__ */ jsxs("div", { className: pub.sectionWrap, children: [
      /* @__PURE__ */ jsx("h2", { className: pub.h2Gold, children: "שאלות נפוצות על כרטיסי ביקור דיגיטליים" }),
      /* @__PURE__ */ jsx("p", { className: pub.sectionLeadLight, children: "תשובות לשאלות שעולות בדרך כלל הקשורות לכרטיסי ביקור דיגיטליים, תכונות, התאמה אישית ויתרונות." }),
      /* @__PURE__ */ jsx("div", { className: pub.faq, children: CARDS_FAQ.map((item, i) => /* @__PURE__ */ jsxs("details", { className: pub.qa, children: [
        /* @__PURE__ */ jsx("summary", { children: item.q }),
        /* @__PURE__ */ jsx("div", { className: pub.answer, children: item.a })
      ] }, i)) })
    ] }) })
  ] });
}
const page$3 = "_page_1fcxw_15";
const heroWrap$3 = "_heroWrap_1fcxw_27";
const h1$3 = "_h1_1fcxw_63";
const legalWrap$3 = "_legalWrap_1fcxw_83";
const legalBlock$3 = "_legalBlock_1fcxw_103";
const styles$4 = {
  page: page$3,
  heroWrap: heroWrap$3,
  h1: h1$3,
  legalWrap: legalWrap$3,
  legalBlock: legalBlock$3
};
function Privacy() {
  return /* @__PURE__ */ jsxs("main", { "data-page": "site", className: styles$4.page, children: [
    /* @__PURE__ */ jsx(
      SeoHelmet,
      {
        title: "מדיניות פרטיות | Cardigo",
        description: "מדיניות הפרטיות של Cardigo - מה מידע אנו אוספים, כיצד משתמשים בו, מי עשוי לקבלו, אבטחת מידע, זכויותיכם וכיצד ניתן ליצור קשר.",
        canonicalUrl: "https://cardigo.co.il/privacy",
        url: "https://cardigo.co.il/privacy"
      }
    ),
    /* @__PURE__ */ jsx("section", { className: pub.sectionDark, children: /* @__PURE__ */ jsxs("div", { className: `${pub.sectionWrap} ${styles$4.heroWrap}`, children: [
      /* @__PURE__ */ jsx("h1", { className: styles$4.h1, children: "מדיניות פרטיות" }),
      /* @__PURE__ */ jsx("p", { className: pub.sectionLeadLight, children: "אנו מכבדים את פרטיות המשתמשים, הלקוחות, המבקרים ובעלי הכרטיסים הדיגיטליים, ופועלים לשמור על מידע אישי בהתאם להוראות הדין החל בישראל." })
    ] }) }),
    /* @__PURE__ */ jsx("section", { className: pub.sectionLight, children: /* @__PURE__ */ jsxs("div", { className: styles$4.legalWrap, children: [
      /* @__PURE__ */ jsxs("div", { className: styles$4.legalBlock, children: [
        /* @__PURE__ */ jsx("p", { children: "מדיניות פרטיות זו נועדה להסביר איזה מידע אנו עשויים לאסוף, כיצד אנו משתמשים בו, באילו נסיבות הוא עשוי להימסר לצדדים שלישיים, מהן זכויותיכם, וכיצד ניתן ליצור עמנו קשר בענייני פרטיות." }),
        /* @__PURE__ */ jsx("p", { children: "השימוש באתר, בשירות, בממשקי הניהול, בעמודי הכרטיסים הדיגיטליים, בטפסים, במנגנוני יצירת קשר, בכלי התוכן ובשירותים הנלווים של Cardigo כפוף למדיניות זו." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$4.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "1. כללי" }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "1.1." }),
          " אינכם חייבים לפי חוק למסור לנו מידע אישי. עם זאת, ללא מסירת פרטים מסוימים ייתכן שלא נוכל לאפשר הרשמה, כניסה לחשבון, יצירה או פרסום של כרטיס דיגיטלי, קבלת פניות, שימוש בפיצ׳רים מסוימים, תמיכה, או אספקת שירותים מסוימים."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "1.2." }),
          " מדיניות זו חלה על השימוש בשירות באמצעות כל מכשיר קצה, לרבות מחשב, טלפון נייד, טאבלט או כל אמצעי תקשורת אחר."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "1.3." }),
          " השימוש בשירות מעיד כי קראתם מדיניות זו וכי אתם מסכימים לעיבוד המידע האישי שלכם כמתואר בה, בכפוף לדין החל."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "1.4." }),
          " בכל מקום במדיניות זו שבו נעשה שימוש בלשון זכר או נקבה - הכוונה היא לכל המגדרים."
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$4.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "2. איזה מידע אנו עשויים לאסוף" }),
        /* @__PURE__ */ jsx("p", { children: "אנו עשויים לאסוף, לקבל, לשמור ולעבד את סוגי המידע הבאים, בהתאם לאופן השימוש שלכם בשירות:" }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "2.1. פרטי חשבון והרשמה" }),
          /* @__PURE__ */ jsx("br", {}),
          "בעת יצירת חשבון אנו אוספים שם פרטי (שדה חובה), כתובת דוא״ל וסיסמה הנשמרת באופן מאובטח ולא כסיסמה גלויה. שם פרטי משמש לניהול החשבון ולהתאמה אישית של תקשורת שירות רלוונטית. ניתן לעדכן את השם הפרטי בהגדרות החשבון בכל עת."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "2.2. מידע על הסכמות ואישורים" }),
          /* @__PURE__ */ jsx("br", {}),
          "אנו עשויים לשמור מידע בנוגע לאישור תנאי השימוש, מדיניות הפרטיות, הרשאות, הסכמות, בחירות משתמש והעדפות, לרבות תיעוד מועד האישור, גרסת המסמך שאושרה ונתונים טכניים ו/או מערכתיים הדרושים לתיעוד ההסכמה ולהגנה על השירות."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "2.3. מידע ותוכן של כרטיסים דיגיטליים" }),
          /* @__PURE__ */ jsx("br", {}),
          "כאשר אתם יוצרים, עורכים, שומרים או מפרסמים כרטיס דיגיטלי או דף עסק, אנו עשויים לאסוף מידע כגון פרטים עסקיים, פרטי קשר, כתובות, שעות פעילות, שירותים, קישורים, תוכן טקסטואלי, שאלות נפוצות, בקשות פגישה, תכנים שיווקיים, מידע עסקי נוסף וכל תוכן אחר שתבחרו להזין."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "2.4. תמונות, קבצים ותכני מדיה" }),
          /* @__PURE__ */ jsx("br", {}),
          "המשתמש רשאי להעלות תמונות, קבצים ותכני מדיה. מידע זה עשוי להישמר ולעבור עיבוד לצורך הצגה, פרסום, אופטימיזציה, התאמת פורמטים, שיפור ביצועים, גיבוי, שחזור ותפעול השירות."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "2.5. טיוטות, שימוש חלקי ושימוש לפני הרשמה" }),
          /* @__PURE__ */ jsx("br", {}),
          "בנסיבות מסוימות, השירות עשוי לאפשר שימוש חלקי, זמני או אנונימי לפני פתיחת חשבון מלא. מידע המוזן במסגרת זו עשוי להישמר באופן זמני לצורך המשך עבודה, אבטחה, מניעת ניצול לרעה ותפעול תקין של השירות, ויכול להימחק אוטומטית לאחר תקופת חוסר פעילות, לפי מדיניות התפעול של השירות."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "2.6. מידע על שימוש, מכשיר ודפדפן" }),
          /* @__PURE__ */ jsx("br", {}),
          "אנו עשויים לאסוף מידע טכני ומידע שימוש, כגון כתובת IP, סוג דפדפן, מערכת הפעלה, סוג מכשיר, זמני גישה, עמודים שנצפו, פעולות שבוצעו, מקורות הפניה, נתוני שגיאה, נתוני אבטחה, מזהים טכניים, נתוני ביצועים ומידע סטטיסטי על אופן השימוש בשירות."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "2.7. פניות, טפסים, לידים ובקשות יצירת קשר" }),
          /* @__PURE__ */ jsx("br", {}),
          "כאשר אתם משאירים פרטים בטופס יצירת קשר, טופס ליד, טופס בכרטיס דיגיטלי, בקשת הצעת מחיר, בקשת שיחה, פנייה עסקית, הודעה לבעל כרטיס או בקשת פגישה - אנו עשויים לקבל ולעבד פרטים כגון שם, טלפון, כתובת דוא״ל, תוכן הפנייה, פרטי העסק או הכרטיס שאליו הופנתה הפנייה, ותיעוד של מועד ואופן ההגשה."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "2.8. פגישות ובקשות booking" }),
          /* @__PURE__ */ jsx("br", {}),
          "אם וככל שהשירות כולל מנגנון בקשות פגישה או תיאום, אנו עשויים לאסוף ולעבד את הפרטים הנדרשים לניהול הבקשה, לרבות פרטי קשר, פרטי הפנייה, מועד מבוקש, תיעוד סטטוס הבקשה, והיסטוריית הטיפול בבקשה."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "2.9. שימוש בכלי AI" }),
          /* @__PURE__ */ jsx("br", {}),
          "אם תבחרו להשתמש בפיצ׳רים מבוססי AI, אנו עשויים לעבד את התוכן, ההקשר העסקי, הטקסטים והבקשות שתזינו, לצורך יצירה, ניסוח, שיפור, השלמה או הצעת תוכן, בהתאם לפיצ׳ר שבו נעשה שימוש."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "2.10. מידע שמתקבל מצדדים שלישיים" }),
          /* @__PURE__ */ jsx("br", {}),
          "אנו עשויים לקבל מידע גם מצדדים שלישיים, כגון שירותי אימות, שירותי אבטחה, ספקי תשתית, ספקי אנליטיקה, גורמים עסקיים, מערכות אינטגרציה, או מבעלי כרטיסים ועסקים שמשתמשים בשירות, ככל שהדבר נדרש לתפעול השירות, למתן תמיכה, לשיפורו או לעמידה בדרישות הדין."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "2.11. נתוני פרופיל חיוב וקבלה" }),
          /* @__PURE__ */ jsx("br", {}),
          "ככל שתבחרו להשתמש בפיצ׳רים הקשורים לתשלום ולהנפקת קבלות, אנו עשויים לאסוף ולעבד נתוני פרופיל חיוב וקבלה אופציונליים, לרבות: סוג נמען; שם לקבלה; שם עסק או שם לחשבונית, אם סופק; שם מלא או שם איש קשר, אם סופק; כתובת דוא״ל חלופית לשליחת קבלה, אם סופקה; מספר זיהוי לצורכי קבלה — ת.ז. / ח.פ. / מספר עוסק / מספר מזהה, לפי סוג הנמען, אם סופק; כתובת, עיר, מיקוד ומדינה, אם סופקו. שדות אלה הם אופציונליים אלא אם נדרשים לצורך הנפקת מסמך תשלום. הנתונים משמשים להנפקת קבלות ומסמכי תשלום. מספר הזיהוי הוא מידע רגיש ויש להזינו רק כאשר הדבר נדרש לצורכי קבלה או מסמך מס; הוא מועבר לספק הנפקת הקבלות אך ורק בעת הנפקת המסמך."
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$4.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "3. מאגרי מידע" }),
        /* @__PURE__ */ jsx("p", { children: "המידע האישי שייאסף בקשר עם השימוש בשירות עשוי להישמר במאגרי מידע המנוהלים על ידינו ו/או עבורנו, וייעשה בו שימוש בהתאם למדיניות זו ולהוראות הדין." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$4.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "4. לאילו מטרות אנו משתמשים במידע" }),
        /* @__PURE__ */ jsx("p", { children: "אנו עשויים להשתמש במידע, לפי העניין, למטרות הבאות:" }),
        /* @__PURE__ */ jsx("p", { children: "לאפשר הרשמה, כניסה, אימות זהות, שחזור גישה, אבטחת חשבון וניהול החשבון." }),
        /* @__PURE__ */ jsx("p", { children: "להפעיל, לנהל, לתחזק, לשפר ולפתח את השירות." }),
        /* @__PURE__ */ jsx("p", { children: "ליצור, לערוך, לשמור, לפרסם ולהציג כרטיסים דיגיטליים, דפי עסק ותכנים ציבוריים." }),
        /* @__PURE__ */ jsx("p", { children: "לנהל טפסים, פניות, לידים, בקשות יצירת קשר, בקשות פגישה ואינטראקציות בין מבקרים לבין בעלי כרטיסים או עסקים." }),
        /* @__PURE__ */ jsx("p", { children: "לאפשר לבעלי כרטיסים ולעסקים לצפות בפניות, לידים, בקשות פגישה ונתונים רלוונטיים הקשורים לשירותים שהם מציעים." }),
        /* @__PURE__ */ jsx("p", { children: "לשלוח הודעות תפעוליות, הודעות שירות, אימותים, שחזורי סיסמה, התראות אבטחה, עדכונים מהותיים ותמיכה." }),
        /* @__PURE__ */ jsx("p", { children: "לבצע ניתוחים סטטיסטיים, אנליטיים ותפעוליים, לשפר ביצועים, לזהות תקלות, לנטר עומסים, לאבטח את המערכות ולמנוע הונאה או שימוש אסור." }),
        /* @__PURE__ */ jsx("p", { children: "להפעיל כלי AI ופיצ׳רים משלימים, אם בחרתם להשתמש בהם." }),
        /* @__PURE__ */ jsx("p", { children: "לנהל חיובים, זכאויות, מנויים, הרשאות, פיצ׳רים בתשלום ושכבות שירות; להנפיק קבלות, אישורי תשלום ומסמכי חיוב; ולהעביר לספק הנפקת הקבלות את פרטי הנמען הנדרשים לצורך הנפקת המסמך, ככל שרלוונטי." }),
        /* @__PURE__ */ jsx("p", { children: "לעמוד בדרישות דין, להגן על זכויותינו, לאכוף את תנאי השימוש ולנהל מחלוקות, בירורים או הליכים משפטיים." }),
        /* @__PURE__ */ jsx("p", { children: "לשלוח דיוור שיווקי או פרסומי, בכפוף לדין ובהתאם להסכמה במקום שבו היא נדרשת." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$4.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "5. פרסום ונגישות ציבורית" }),
        /* @__PURE__ */ jsx("p", { children: "כאשר משתמש בוחר לפרסם כרטיס דיגיטלי או תוכן ציבורי אחר, המידע שבחר לפרסם עשוי להיות נגיש לציבור באינטרנט, למבקרים, למנועי חיפוש, ללקוחות פוטנציאליים ולצדדים שלישיים." }),
        /* @__PURE__ */ jsx("p", { children: "נגישות לסורקי מנועי חיפוש אינה מהווה התחייבות להופעה בתוצאות חיפוש. כרטיסים במסלול חינמי או בתקופת ניסיון עשויים להיות ציבוריים וניתנים לשיתוף, אך אינם מיועדים לאינדוקס במנועי חיפוש. הופעה בגוגל או במנועי חיפוש אחרים זמינה רק לכרטיסים זכאים לפי מסלול השירות, כגון מנוי פרימיום בתשלום או מסלול ארגוני פעיל, וכפופה גם לשיקולי מנוע החיפוש עצמו." }),
        /* @__PURE__ */ jsx("p", { children: "לפיכך, האחריות לבחירת התכנים שמפורסמים בפומבי חלה על המשתמש. אין לפרסם מידע שאינכם מעוניינים שיהיה נגיש לציבור, מידע של צדדים שלישיים ללא הרשאה, או תוכן המפר דין או זכויות של אחרים." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$4.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "6. טפסים, לידים, פניות ובקשות פגישה" }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "6.1." }),
          " השירות עשוי לכלול טפסים שונים, לרבות טפסים בעמודי כרטיסים דיגיטליים, דפי עסק, עמודי יצירת קשר, טפסי ליד, וטפסי בקשת פגישה."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "6.2." }),
          " כאשר מבקר ממלא טופס או מגיש פנייה באמצעות השירות, המידע עשוי להיקלט במערכותינו לצורך תפעול, תיעוד, אבטחה, שיפור השירות, ניהול פניות, ניטור, תמיכה או הצגת המידע בממשק ניהול, וכן להימסר לבעל הכרטיס, לבעל העסק או למי שפועל מטעמו, כדי שיוכל להשיב לפנייה, לנהל קשר עם הלקוח או לטפל בבקשה."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "6.3." }),
          " לאחר שהמידע הועבר לבעל הכרטיס, לבעל העסק או לגורם מטעמו, השימוש שייעשה בו על ידם כפוף גם לאחריותם ולמדיניות הפרטיות או הנהלים שלהם, ככל שישנם."
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$4.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "7. דיוור ישיר, מסרים שיווקיים ופרסומיים" }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "7.1." }),
          " אנו עשויים לשלוח לכם הודעות תפעוליות ושירותיות הדרושות להפעלת החשבון והשירות, כגון הודעות אימות, שחזור גישה, התראות אבטחה, עדכונים תפעוליים והודעות מערכת."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "7.2." }),
          " אם וככל שנרצה לשלוח לכם הודעות שיווקיות, מסחריות או פרסומיות, נעשה זאת בהתאם להוראות הדין החל. במקרים שבהם הדין מחייב קבלת הסכמה מראש, נבקש אותה בנפרד ובאופן מתאים."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "7.3." }),
          " בכל עת תוכלו לבקש להפסיק לקבל דיוור שיווקי, להסיר את עצמכם מרשימות דיוור או לעדכן את העדפות הדיוור שלכם, בהתאם לאמצעי ההסרה שיוצגו או באמצעות פנייה אלינו."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "7.4." }),
          " אם הסכמתם לקבל עדכונים ותזכורות הקשורים לחשבונכם, אנו עשויים לשלוח הודעות שירות רלוונטיות, כגון תזכורת לפני תום תקופת ניסיון. הודעות אלה עשויות לכלול פנייה אישית לפי שמכם הפרטי. שליחתן כפופה להסכמה שנתתם, וניתן לבטלה בכל עת בהתאם לאמצעי ההסרה המוצגים בהודעה או באמצעות פנייה אלינו."
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$4.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "8. Cookies, כלים אנליטיים, תגיות מעקב ופיקסלים" }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "8.1." }),
          " אנו עשויים להשתמש ב־Cookies, אחסון מקומי, תגיות, פיקסלים, SDKs, קבצי מדידה וטכנולוגיות דומות לצורך תפעול שוטף ותקין של האתר והשירות, שמירת העדפות, אבטחה, זיהוי הונאה, מדידה, אנליטיקה, ביצועים, סטטיסטיקה, הבנת אופן השימוש בשירות, ומדידת אפקטיביות של קמפיינים, פרסום ורימרקטינג, ככל שהם מופעלים."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "8.2." }),
          " כלים אלה עשויים לאסוף מידע כגון עמודים שנצפו, משך שהייה, אירועים, הקלקות, נתיבי ניווט, מקורות הגעה, פעולות שבוצעו באתר, מזהי דפדפן או מכשיר, והאם בוצעה אינטראקציה עם תוכן, כפתורים, טפסים או מודעות."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "8.3." }),
          " ככל שנעשה שימוש בכלי מדידה, אנליטיקה, תגיות פרסום או פיקסלים של רשתות פרסום ו/או רשתות חברתיות, הם עשויים לאפשר לנו להבין טוב יותר כיצד משתמשים בשירות, למדוד המרות, לשפר קמפיינים, ולהציג תכנים או פרסומות רלוונטיים יותר, בכפוף לדין החל."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "8.4." }),
          " חלק מה־Cookies והטכנולוגיות הדומות עשויים להיות מופעלים על ידינו, וחלקם על ידי ספקי שירות חיצוניים או פלטפורמות שיווק, מדידה ופרסום הפועלים מטעמנו."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "8.5." }),
          " ברוב הדפדפנים ניתן לחסום, להגביל או למחוק Cookies. עם זאת, חסימה כזו עלולה לגרום לכך שחלק מהשירותים, התכונות או יכולות הזיהוי לא יעבדו באופן מלא."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "8.6." }),
          " האתר מאפשר לכם לנהל את העדפות השימוש בכלי מדידה, שיווק ופרסום של צדדים שלישיים, באמצעות אפשרויות ההגדרה המוצגות באתר. לצד זאת, אנו עשויים להפעיל כלים פנימיים לצורך תפעול, אבטחה, מדידה, אנליטיקה ושיפור השירות, אשר מהווים חלק מהאופן שבו אנו מפעילים ומפתחים את השירות."
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$4.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "9. מסירת מידע לצדדים שלישיים" }),
        /* @__PURE__ */ jsx("p", { children: "איננו מוכרים מידע אישי לצדדים שלישיים למטרותיהם העצמאיות." }),
        /* @__PURE__ */ jsx("p", { children: "עם זאת, אנו עשויים למסור מידע לצדדים שלישיים במקרים הבאים:" }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "9.1. ספקי שירות חיצוניים" }),
          /* @__PURE__ */ jsx("br", {}),
          "אנו עשויים להיעזר בספקי שירות חיצוניים בקטגוריות כגון: אחסון, תשתיות ושרתים; אחסון מדיה וקבצים; דוא״ל, הודעות מערכת ותקשורת; אבטחת מידע, ניטור וזיהוי תקלות; אנליטיקה, מדידה וביצועים; כלי AI; תשלומים, חיובים, הנהלת שירות או שירותי תמיכה; ייעוץ מקצועי, תפעול, בקרה או שירותים משלימים. ספקים אלה יקבלו גישה רק למידע הנדרש לצורך מתן השירות עבורנו, ובהתאם להסכמים, להוראות הדין ולדרישות האבטחה החלות."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          "בין ספקי השירות החיצוניים שאנו עושים בהם שימוש, נציין בפרט:",
          " ",
          /* @__PURE__ */ jsx("strong", { children: "ספק סליקה ועיבוד תשלומים חיצוני" }),
          " — לעיבוד תשלומים ועמוד תשלום מאובטח. Cardigo אינה שומרת מספרי כרטיסים מלאים או קוד CVV.",
          " ",
          /* @__PURE__ */ jsx("strong", { children: "ספק חיצוני להנפקת קבלות ומסמכי תשלום" }),
          " ",
          "— להנפקת קבלות, מסמכי תשלום ולמשלוח הקבלה בדוא״ל. ספק זה מקבל את פרטי הנמען הנדרשים להנפקת המסמך בלבד: שם, כתובת דוא״ל, קוד מדינה, ובאופן אופציונלי שם עסק / שם לחשבונית, מספר זיהוי, כתובת, עיר ומיקוד. ספק זה אינו מקבל מספרי כרטיסים מלאים או קוד CVV מ-Cardigo."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "9.2. בעלי כרטיסים, עסקים או גורמים מטעמם" }),
          /* @__PURE__ */ jsx("br", {}),
          "כאשר מבקר שולח טופס, ליד, בקשת יצירת קשר, פנייה או בקשת פגישה הקשורה לכרטיס דיגיטלי, דף עסק או שירות של לקוח או עסק, המידע עשוי להימסר לבעל הכרטיס, לבעל העסק או למי שפועל מטעמו."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "9.3. מידע סטטיסטי, מצרפי או לא מזהה" }),
          /* @__PURE__ */ jsx("br", {}),
          "אנו עשויים להשתמש במידע סטטיסטי, מצרפי או שעבר עיבוד כך שאינו מזהה את המשתמש באופן אישי, לצורך שיפור השירות, מחקר, תכנון עסקי, מדידה, דיווח פנימי או עבודה מול ספקים ושותפים, ובלבד שמידע כזה לא יזהה אתכם באופן אישי."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "9.4. דרישות חוק והגנה על זכויות" }),
          /* @__PURE__ */ jsx("br", {}),
          "נמסור מידע אם נהיה מחויבים לכך לפי דין, צו שיפוטי, הליך משפטי, דרישה של רשות מוסמכת, או אם נידרש לכך לצורך הגנה על זכויותינו, זכויות משתמשים אחרים, בטיחות הציבור, אבטחת השירות או מניעת עבירה."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "9.5. שינוי מבני" }),
          /* @__PURE__ */ jsx("br", {}),
          "במקרה של מיזוג, רכישה, מכירת פעילות, ארגון מחדש, מימון, המחאת זכויות או העברת פעילות, מידע עשוי לעבור לגורם הרוכש או הממשיך, ובלבד שהוא ימשיך לכבד את עקרונות ההגנה על הפרטיות לפי הדין החל."
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$4.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "10. העברת מידע מחוץ לישראל" }),
        /* @__PURE__ */ jsx("p", { children: "אנו עשויים להשתמש בתשתיות, ספקים, מערכות או שירותים הפועלים גם מחוץ לישראל. לכן, מידע אישי עשוי להיות מועבר, מאוחסן או מעובד מחוץ לישראל, בכפוף להוראות הדין החל ולמנגנונים שנועדו לאפשר רמת הגנה נאותה למידע. הדין הישראלי כולל גם כללים ייעודיים לגבי העברת מידע ממאגרי מידע מחוץ לישראל." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$4.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "11. אבטחת מידע" }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "11.1." }),
          " אנו מיישמים אמצעים ארגוניים, טכנולוגיים ותפעוליים סבירים ומקובלים, שנועדו להגן על מידע אישי מפני גישה בלתי מורשית, שימוש אסור, שינוי, חשיפה, אובדן או השמדה, בהתאם לאופי השירות, סוגי המידע והוראות הדין החל."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "11.2." }),
          " לצד זאת, חשוב לדעת כי אף מערכת ממוחשבת, אתר אינטרנט, שירות מקוון, מאגר מידע או אמצעי העברה אלקטרוני אינם חסינים באופן מוחלט. לכן, על אף מאמצינו לצמצם סיכונים ולהגן על המידע, אין באפשרותנו להבטיח הגנה מלאה ומוחלטת מפני כל חדירה, תקלה, שיבוש, גישה בלתי מורשית או אירוע אבטחת מידע."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "11.3." }),
          " המשתמש מסכים כי מפעיל האתר לא יישא בשום אחריות לחשיפת המידע בכל מקרה של פריצה למערכות האתר או לשרתיו, המשתמש מוותר על כל דרישה, תביעה או טענה נגד מפעיל האתר בשל כך."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "11.4." }),
          " במקרה של חשש לאירוע אבטחת מידע, נפעל בהתאם לנסיבות המקרה, לשיקול דעתנו ולהוראות הדין החל."
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$4.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "12. שמירת מידע" }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "12.1." }),
          " אנו שומרים מידע כל עוד הדבר נדרש לצורך המטרות שלשמן נאסף, לצורך תפעול השירות, אבטחה, גיבוי, רציפות עסקית, תמיכה, טיפול במחלוקות, אכיפה, עמידה בדרישות דין והגנה על זכויותינו."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "12.2." }),
          " מבלי לגרוע מן האמור: מידע חשבון נשמר בדרך כלל כל עוד החשבון פעיל, ולמשך תקופה סבירה לאחר מכן לפי צורך תפעולי, אבטחתי או משפטי; מידע על כרטיסים דיגיטליים, תכנים ומדיה נשמר כל עוד הוא מנוהל במסגרת השירות, ובהתאם לפעולות המשתמש; פניות, לידים, בקשות יצירת קשר ובקשות פגישה עשויים להישמר לצורך תיעוד, טיפול, מעקב, הצגה לבעלי הכרטיסים, אבטחה, מניעת ניצול לרעה ושיפור השירות; מידע זמני, טיוטות, לוגים, גיבויים ורשומות אבטחה עשויים להישמר גם לאחר מחיקה או סגירת חשבון, לפרקי זמן מוגבלים לפי צורך תפעולי, אבטחתי, חוזי או משפטי."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "12.3." }),
          " חשבון שנרשם לשירות אך לא אומת (כלומר, כתובת הדוא״ל לא אושרה על ידי המשתמש) ואשר לא נוצר בו כרטיס דיגיטלי ולא הושלמה בו הגדרת שימוש - עשוי להיות מוסר אוטומטית, לרבות המידע הקשור אליו, לאחר כ-30 יום ממועד ההרשמה, בהתאם למדיניות התפעול של השירות."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "12.4." }),
          " חשבון שאומת (כלומר, כתובת הדוא״ל אושרה) אך לא נוצר בו כרטיס דיגיטלי, ושלא נעשה בו שימוש פעיל במשך כ-90 יום — עשוי להיות מוסר, לרבות המידע הקשור אליו, בהתאם למדיניות התפעול של השירות. לפני הסרה כאמור, עשויה להישלח הודעה מוקדמת בדוא״ל כ-14 יום לפני מועד ההסרה המתוכנן. המשתמש יכול למנוע את ההסרה על ידי כניסה לשירות או חידוש השימוש בו."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "12.5." }),
          " נתוני פרופיל חיוב וקבלה (ראו סעיף 2.11) נשמרים בחשבון כל עוד החשבון פעיל, עד לעדכונם או הסרתם על ידי המשתמש, ובכפוף לצרכים חשבונאיים ומשפטיים."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "12.6." }),
          " בעת יצירת הזמנת תשלום (checkout), עשויה להישמר עותק של פרופיל החיוב הקיים בחשבון בעת יצירת ההזמנה. עותק טכני זה מוחק אוטומטית לאחר כ-14 ימים ממועד יצירתו, בהתאם למדיניות המחיקה הטכנית."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "12.7." }),
          " קבלות ומסמכי תשלום שהונפקו נשמרים בהתאם לדין החל ולדרישות מס/חשבונאות. קבלה שהונפקה משקפת את פרטי הנמען כפי שנקבעו בעת ההנפקה ואינה משתנה רטרואקטיבית עם עדכון פרופיל החיוב בחשבון. רשומת הביקורת הפנימית של הקבלה שומרת את מספר הזיהוי בגרסה מוסתרת (4 ספרות אחרונות בלבד) ובגרסת hash קריפטוגרפית בלבד — הערך הגולמי המלא אינו נשמר ברשומת הקבלה."
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$4.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "13. זכויותיכם" }),
        /* @__PURE__ */ jsx("p", { children: "בהתאם לדין החל, ובפרט לפי חוק הגנת הפרטיות, עשויות לעמוד לכם זכויות לעיין במידע אישי הנוגע לכם, לבקש לתקן מידע שאינו נכון, שלם, ברור או מעודכן, וכן לבקש מחיקה או טיפול אחר במידע, הכל בכפוף לתנאי הדין ולנסיבות העניין." }),
        /* @__PURE__ */ jsx("p", { children: "לבירורים, לעיון, לעדכון, לתיקון, למחיקה, להסרה מדיוור או למימוש זכויות אחרות - ניתן לפנות אלינו בפרטי הקשר המופיעים בסוף מדיניות זו." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$4.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "14. אחריות המשתמש לתוכן, פרטים של אחרים והרשאות" }),
        /* @__PURE__ */ jsx("p", { children: "המשתמש אחראי לכך שכל מידע, תמונה, מסמך, טקסט, קובץ, מספר טלפון, כתובת דוא״ל, קישור, תוכן עסקי או תוכן אחר שהוא מעלה, מזין, שומר או מפרסם במסגרת השירות - נמסר והועלה כדין, וכי הוא מחזיק בכל הזכויות, ההרשאות וההסכמות הנדרשות לשם כך." }),
        /* @__PURE__ */ jsx("p", { children: "אין להעלות או לפרסם מידע של אדם אחר ללא הרשאה מתאימה, ואין לעשות שימוש בשירות באופן הפוגע בפרטיות, בזכויות, בבטיחות או בדין." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$4.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "15. קישורים ושירותים של צדדים שלישיים" }),
        /* @__PURE__ */ jsx("p", { children: "השירות עשוי לכלול קישורים, הפניות, הטמעות, אינטגרציות או חיבורים לשירותים, אתרים, אפליקציות או מערכות של צדדים שלישיים. השימוש בהם כפוף למדיניות הפרטיות, לתנאי השימוש ולנהלים של אותם צדדים שלישיים, ואיננו אחראים למדיניות הפרטיות או לתוכן של שירותים חיצוניים שאינם בשליטתנו." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$4.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "16. שינויים במדיניות" }),
        /* @__PURE__ */ jsx("p", { children: "אנו רשאים לעדכן מדיניות פרטיות זו מעת לעת. הנוסח המחייב יהיה הנוסח המעודכן כפי שיפורסם באתר במועד הפרסום. במקרה של שינוי מהותי, ננסה לפרסם הודעה בולטת וסבירה, בהתאם לאופי השינוי ולהוראות הדין." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$4.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "17. יצירת קשר" }),
        /* @__PURE__ */ jsx("p", { children: "לשאלות, בקשות או פניות בנוגע למדיניות פרטיות זו או לטיפול במידע אישי, ניתן לפנות אלינו:" }),
        /* @__PURE__ */ jsxs("p", { children: [
          "דוא״ל:",
          " ",
          /* @__PURE__ */ jsx("a", { href: "mailto:support@cardigo.co.il", children: "support@cardigo.co.il" })
        ] }),
        /* @__PURE__ */ jsx("p", { children: "תאריך עדכון אחרון: 25.04.2026" })
      ] })
    ] }) })
  ] });
}
const page$2 = "_page_1u90g_15";
const heroWrap$2 = "_heroWrap_1u90g_27";
const h1$2 = "_h1_1u90g_35";
const legalWrap$2 = "_legalWrap_1u90g_55";
const legalBlock$2 = "_legalBlock_1u90g_75";
const styles$3 = {
  page: page$2,
  heroWrap: heroWrap$2,
  h1: h1$2,
  legalWrap: legalWrap$2,
  legalBlock: legalBlock$2
};
function Terms() {
  return /* @__PURE__ */ jsxs("main", { "data-page": "site", className: styles$3.page, children: [
    /* @__PURE__ */ jsx(
      SeoHelmet,
      {
        title: "תנאי שימוש | Cardigo",
        description: "תנאי השימוש של Cardigo - גישה לשירות, שימוש מותר, תכנים ופרסום, מסלולים ותשלומים, קניין רוחני, הגבלת אחריות, שיפוי, פרטיות ויצירת קשר.",
        canonicalUrl: "https://cardigo.co.il/terms",
        url: "https://cardigo.co.il/terms"
      }
    ),
    /* @__PURE__ */ jsx("section", { className: pub.sectionDark, children: /* @__PURE__ */ jsxs("div", { className: `${pub.sectionWrap} ${styles$3.heroWrap}`, children: [
      /* @__PURE__ */ jsx("h1", { className: styles$3.h1, children: "תנאי שימוש" }),
      /* @__PURE__ */ jsx("p", { className: pub.sectionLeadLight, children: "ברוכים הבאים ל־Cardigo. אנא קראו תנאים אלה בעיון לפני השימוש בשירות." })
    ] }) }),
    /* @__PURE__ */ jsx("section", { className: pub.sectionLight, children: /* @__PURE__ */ jsxs("div", { className: styles$3.legalWrap, children: [
      /* @__PURE__ */ jsxs("div", { className: styles$3.legalBlock, children: [
        /* @__PURE__ */ jsx("p", { children: "תנאי שימוש אלה מסדירים את הגישה לאתר, לשירות, לעמודי הכרטיסים הדיגיטליים, לממשקי הניהול, לפיצ׳רים הנלווים ולכל שירות או תוכן המופעלים במסגרת Cardigo." }),
        /* @__PURE__ */ jsx("p", { children: "השימוש באתר ובשירות, לרבות גלישה, הרשמה, יצירת כרטיס, עריכת תוכן, פרסום כרטיס, השארת פרטים, שימוש בפיצ׳רים בתשלום או שימוש בכלי AI, מהווה אישור לכך שקראתם תנאים אלה, הבנתם אותם ואתם מסכימים להם." }),
        /* @__PURE__ */ jsx("p", { children: "אם אינכם מסכימים לתנאים אלה, כולם או חלקם, עליכם להימנע משימוש באתר ובשירות." }),
        /* @__PURE__ */ jsx("p", { children: "לנוחות הקריאה בלבד, נוסח זה מנוסח בלשון זכר, אך הוא מתייחס לכל המגדרים." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$3.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "1. כללי" }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "1.1." }),
          " Cardigo היא פלטפורמה ליצירה, עריכה, פרסום וניהול של כרטיסי ביקור דיגיטליים, עמודי עסק ותכנים עסקיים נלווים."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "1.2." }),
          " תנאים אלה חלים על כל שימוש בשירות, באמצעות כל מכשיר, דפדפן, מערכת, ממשק, רשת או אמצעי תקשורת."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "1.3." }),
          " תנאים אלה חלים בנוסף לכל מדיניות, מסמך, מסלול, מסך רכישה, הנחיה או הוראה אחרת שיוצגו במסגרת השירות, לרבות מדיניות הפרטיות, ובמקרה של סתירה – יפורשו באופן משלים ככל שניתן."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "1.4." }),
          " מפעיל האתר רשאי לעדכן תנאים אלה מעת לעת. הנוסח המחייב הוא הנוסח המעודכן כפי שיפורסם באתר במועד הפרסום."
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$3.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "2. מהו השירות" }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "2.1." }),
          " השירות מאפשר, בין היתר, יצירה, עריכה, ניהול, פרסום והפצה של כרטיסי ביקור דיגיטליים ודפי עסק."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "2.2." }),
          " השירות עשוי לכלול גם פיצ׳רים משלימים, כגון טפסי יצירת קשר, איסוף לידים, שכבות SEO, מדידה ואנליטיקה, תכנים מבוססי AI, פיצ׳רים ארגוניים, שירותים בתשלום, הרשאות מורחבות, ופיצ׳רים הקשורים לבקשות פגישה או booking, ככל שהם זמינים במוצר."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "2.3." }),
          " מפעיל האתר רשאי להוסיף, לשנות, להסיר, להשעות, להגביל או לעדכן חלקים מן השירות, תכנים, פיצ׳רים, מסכים, מסלולים, ממשקים או יכולות, באופן מלא או חלקי, מעת לעת ולפי שיקול דעתו."
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$3.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "3. כשירות לשימוש ופתיחת חשבון" }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "3.1." }),
          " השימוש בשירות מיועד למשתמשים הכשירים לבצע פעולות משפטיות מחייבות."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "3.2." }),
          " אם אתם קטינים או אינכם מוסמכים לבצע פעולות משפטיות מחייבות ללא אישור, השימוש בשירות מותר רק בכפוף לקבלת אישור מתאים מן האחראי עליכם."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "3.3." }),
          " בעת פתיחת חשבון או מסירת פרטים, אתם מתחייבים למסור מידע נכון, מדויק, שלם ומעודכן."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "3.4." }),
          " חל איסור לעשות שימוש בפרטים של אדם אחר ללא הרשאה, להתחזות לאחר, לפתוח חשבון בשם גורם אחר ללא אישור, או למסור מידע מטעה."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "3.5." }),
          " אתם אחראים לשמירה על פרטי הגישה שלכם ועל כל פעולה שתבוצע באמצעות החשבון שלכם, כל עוד לא הודעתם לנו ללא דיחוי סביר על שימוש בלתי מורשה או חשש לפגיעה באבטחת החשבון."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "3.6." }),
          " השירותים בתשלום של Cardigo מיועדים לשימוש עסקי או מסחרי בלבד, ואינם מיועדים לשימוש אישי, ביתי או משפחתי."
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$3.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "4. שימוש מותר ואסור" }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "4.1." }),
          " המשתמש מתחייב לעשות שימוש חוקי, סביר והוגן בשירות."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "4.2." }),
          " מבלי לגרוע מן האמור, נאסר על המשתמש:"
        ] }),
        /* @__PURE__ */ jsx("p", { children: "- להעלות, לפרסם, לשמור או להפיץ תוכן בלתי חוקי, מטעה, פוגעני, מאיים, משמיץ, מטריד, גזעני, מיני, פוגעני או כזה המפר זכויות של אחרים;" }),
        /* @__PURE__ */ jsx("p", { children: "- לפגוע בפרטיות, בשם הטוב, בזכויות יוצרים, בסימני מסחר או בכל זכות אחרת של צד שלישי;" }),
        /* @__PURE__ */ jsx("p", { children: "- להחדיר קוד זדוני, קבצים מזיקים, סקריפטים, בוטים, נסיונות scraping, crawling, harvesting או שימוש אוטומטי בלתי מורשה;" }),
        /* @__PURE__ */ jsx("p", { children: "- לנסות לעקוף מנגנוני אבטחה, הרשאות, rate limits, הגנות מערכת, gates או חסימות;" }),
        /* @__PURE__ */ jsx("p", { children: "- להשתמש בשירות לצורך ספאם, התחזות, הונאה, פישינג, הטעיה, קמפיינים אסורים או פעילות המנוגדת לדין;" }),
        /* @__PURE__ */ jsx("p", { children: "- להעתיק, לשכפל, לבצע reverse engineering, לעבד, לפרק, לשבש או להתערב בפעולת השירות, למעט במידה המותרת במפורש לפי דין;" }),
        /* @__PURE__ */ jsx("p", { children: "- לעשות שימוש בשירות באופן העלול לפגוע בפעילותו, בביצועיו, בזמינותו, באמינותו או בחוויית המשתמש של אחרים." }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "4.3." }),
          " מפעיל האתר רשאי, אך אינו חייב, לנטר, לבדוק, להסיר, להגביל, להשעות או לחסום תוכן, חשבון, גישה, פעולה או שימוש אשר לדעתו מפרים תנאים אלה, יוצרים סיכון משפטי, אבטחתי, תפעולי או עסקי, או עלולים לפגוע בשירות, במשתמשים או בצדדים שלישיים."
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$3.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "5. תוכן משתמשים ופרסום פומבי" }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "5.1." }),
          " המשתמש רשאי להעלות, להזין, לשמור, לערוך ולפרסם במסגרת השירות טקסטים, תמונות, לוגואים, קבצים, פרטי קשר, קישורים, שעות פעילות, שירותים, שאלות ותשובות, תוכן שיווקי, תוכן עסקי ומידע נוסף."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "5.2." }),
          " האחריות המלאה והבלעדית לכל תוכן שהמשתמש מעלה, שומר או מפרסם חלה על המשתמש בלבד."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "5.3." }),
          " המשתמש מצהיר ומתחייב כי הוא בעל הזכויות, ההרשאות וההסכמות הנדרשות ביחס לכל תוכן שהוא מעלה; התוכן חוקי, מדויק ואינו מטעה באופן מהותי; התוכן אינו מפר זכויות של צדדים שלישיים ואינו פוגע בפרטיותם; וקיימת לו הזכות לפרסם כל פרט, תמונה, שם, סימן, יצירה או חומר אחר שהועלו על ידו."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "5.4." }),
          " כאשר המשתמש בוחר לפרסם כרטיס דיגיטלי או תוכן ציבורי אחר, הוא מאשר כי התוכן עשוי להיות נגיש לציבור, למבקרים, ללקוחות פוטנציאליים, למנועי חיפוש, לשירותי שיתוף ולצדדים שלישיים."
        ] }),
        /* @__PURE__ */ jsx("p", { children: "נגישות לסורקי מנועי חיפוש אינה מהווה התחייבות להופעה בתוצאות חיפוש. כרטיסים במסלול חינמי או בתקופת ניסיון עשויים להיות ציבוריים וניתנים לשיתוף, אך אינם מיועדים לאינדוקס במנועי חיפוש. הופעה בגוגל או במנועי חיפוש אחרים זמינה רק לכרטיסים זכאים לפי מסלול השירות, כגון מנוי פרימיום בתשלום או מסלול ארגוני פעיל, וכפופה גם לשיקולי מנוע החיפוש עצמו." }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "5.5." }),
          " מפעיל האתר רשאי להסיר, להסתיר, להגביל, לבטל פרסום או לשנות זמינות של תוכן, כרטיס או עמוד, אם מצא כי הם מפרים תנאים אלה, הדין, זכויות של אחרים, או יוצרים סיכון לשירות או לצדדים שלישיים."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "5.6." }),
          " המשתמש מעניק למפעיל האתר הרשאה לא בלעדית, עולמית, ללא תמלוגים ובתקופת השימוש הנדרשת, להשתמש בתוכן שהעלה לצורך תפעול השירות, אחסון, גיבוי, עיבוד טכני, התאמת פורמטים, הצגה, פרסום, הפצה, אופטימיזציה, אבטחה, תמיכה ושיפור השירות."
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$3.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "6. לידים, טפסים, יצירת קשר ובקשות פגישה" }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "6.1." }),
          " השירות עשוי לכלול טפסים, לידים, בקשות יצירת קשר, הודעות, בקשות שיחה, בקשות פגישה ופיצ׳רים דומים."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "6.2." }),
          " כאשר מבקר משאיר פרטים או יוצר קשר באמצעות כרטיס דיגיטלי, עמוד עסק או ממשק אחר בשירות, המידע עשוי להיקלט במערכות השירות ו/או להיות מועבר לבעל הכרטיס, לבעל העסק או למי שפועל מטעמו."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "6.3." }),
          " לאחר שהמידע נמסר לבעל הכרטיס, לבעל העסק או לגורם מטעמו, האחריות לשימוש שייעשה בו על ידם כפופה גם להם ולנהלים או למדיניות שלהם, ככל שישנם."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "6.4." }),
          " ככל שהשירות כולל מנגנוני booking או בקשות פגישה, מפעיל האתר אינו אחראי לקיום הפגישה בפועל, לזמינות השירות של בעל הכרטיס, לאיכות השירות שיינתן, או לכל התקשרות שתתבצע בין המשתמשים לבין בעלי הכרטיסים או העסקים."
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$3.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "7. מסלולים, שירותים בתשלום וחיובים" }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "7.1." }),
          " השירות עשוי לכלול מסלולים חינמיים, מסלולים בתשלום, פיצ׳רים פרימיום, פיצ׳רים ארגוניים, תוספות, הרחבות או זכאויות משתנות."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "7.2." }),
          " תכולת המסלולים, הפיצ׳רים הכלולים בהם, תנאי ההצטרפות, תקופות החיוב, המחירים, ההטבות, ההגבלות ותנאי השימוש בכל מסלול יהיו כפי שיופיעו באתר, בממשק, בדף הרכישה או במסגרת ההצטרפות בפועל."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "7.3." }),
          " מפעיל האתר רשאי לעדכן מעת לעת מסלולים, תכולות, מחירים, תנאי חיוב, זכאויות או פיצ׳רים, בכפוף לדין החל ולכל התחייבות מפורשת שניתנה לגבי תקופה מסוימת שכבר שולמה."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "7.4." }),
          " אי תשלום, כשל בגבייה, ביטול אמצעי תשלום, chargeback, שימוש אסור או הפרת תנאים אלה עשויים להביא להגבלת גישה, השעיה, הורדת כרטיסים מפרסום, חסימת פיצ׳רים, ביטול זכאויות או הפסקת שירות."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "7.5." }),
          " חלק מפעולות התמיכה, החיוב, השינוי, הביטול או ניהול המנוי עשויות להתבצע באמצעות שירות הלקוחות או בתהליך שאינו self-service מלא, בהתאם למצב המוצר, המסלול והמערכות הפעילות באותה עת."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "7.6." }),
          " אלא אם צוין אחרת במפורש, תשלום עבור השירות אינו מקנה למשתמש בעלות בקוד, במערכת, בדומיין של השירות, בתשתיות, בפלטפורמה או בזכויות הקניין הרוחני של מפעיל האתר."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "7.7." }),
          " תנאי התשלום, החידוש, הביטול וההחזרים המפורטים על פי מסלול מצויים במסמך נפרד:",
          " ",
          /* @__PURE__ */ jsx(Link, { to: "/payment-policy", children: "תנאי תשלום, חידוש, ביטול והחזרים" })
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "7.8." }),
          " מסלול חודשי מתחדש אוטומטית בסיום כל תקופת חיוב, אלא אם בוטל לפני מועד החיוב הבא."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "7.9." }),
          " מסלול שנתי מחוייב מראש עבור 12 חודשים. חידוש שנתי אוטומטי יתבצע רק אם המשתמש בחר בכך באופן מפורש מראש; תישלח תזכורת 14 ימים לפני חידוש שנתי אוטומטי."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "7.10." }),
          " כשל בגבייה עשוי להביא להשבתת פיצ׳רי פרימיום או הורדת הכרטיס מן הפרסום הציבורי."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "7.11." }),
          " ככלל, לא יינתנו החזרים כספיים עבור שירותים, מסלולים או תקופות חיוב ששולמו, למעט אם הדין החל מחייב אחרת."
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$3.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "8. הפסקת שירות, ביטול, השעיה והסרה" }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "8.1." }),
          " המשתמש רשאי להפסיק את השימוש בשירות בכל עת."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "8.2." }),
          " הפסקת שימוש, סיום מסלול, אי תשלום, השעיה, סגירת חשבון, הפרת תנאים או הפסקת שירות עשויים להביא להסרת הכרטיס מן הפרסום הציבורי, להגבלת גישה, להפסקת זמינות של פיצ׳רים, ולמניעת שימוש עתידי בשירות או בחלקים ממנו."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "8.3." }),
          " מפעיל האתר רשאי להשעות, להגביל, לחסום או להפסיק גישה לשירות, לחשבון, לכרטיס, לעמוד עסק או לפיצ׳ר מסוים, באופן זמני או קבוע, בין היתר אם:"
        ] }),
        /* @__PURE__ */ jsx("p", { children: "- המשתמש הפר תנאים אלה;" }),
        /* @__PURE__ */ jsx("p", { children: "- קיים חשש לפעילות אסורה, מטעה, מזיקה או בלתי חוקית;" }),
        /* @__PURE__ */ jsx("p", { children: "- לא הוסדר תשלום במועד;" }),
        /* @__PURE__ */ jsx("p", { children: "- קיימת דרישת חוק, צו, חקירה או סיכון משפטי;" }),
        /* @__PURE__ */ jsx("p", { children: "- נדרש טיפול תפעולי, אבטחתי, תחזוקתי או מוצרי." }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "8.4." }),
          " אלא אם נקבע אחרת במפורש לפי הדין או במסלול הספציפי, לא תהיה למשתמש טענה בגין עצם הסרת הכרטיס מן הפרסום או הפסקת שירות שנעשו בהתאם לתנאים אלה."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "8.5." }),
          " חשבון שנרשם לשירות אך לא אומת ואשר לא נוצר בו כרטיס דיגיטלי ולא הושלמה בו הגדרת שימוש, עשוי להיות מוסר אוטומטית לאחר כ-30 יום ממועד ההרשמה, בהתאם למדיניות התפעול של השירות. הסרה כאמור חלה על חשבון שלא הופעל בפועל ואינה מהווה הפסקת שירות בתשלום."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "8.6." }),
          " חשבון מאומת שלא נוצר בו כרטיס דיגיטלי ושלא נעשה בו שימוש פעיל במשך כ-90 יום, עשוי להיות מוסר בהתאם למדיניות התפעול של השירות. בטרם הסרה כאמור, עשויה להישלח הודעת דוא״ל מוקדמת כ-14 ימים לפני מועד ההסרה המתוכנן. המשתמש רשאי למנוע את ההסרה על ידי כניסה לשירות או חידוש השימוש בו לפני חלוף המועד. הסרה כאמור אינה מהווה הפסקת שירות בתשלום."
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$3.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "9. זמינות השירות, תחזוקה ושינויים" }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "9.1." }),
          " השירות ניתן במתכונת As Is ו־As Available."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "9.2." }),
          " מפעיל האתר אינו מתחייב כי השירות יפעל ללא הפרעות, ללא תקלות, ללא שגיאות, ללא עיכובים, ללא השבתות, ללא כשלים או ללא תלות בגורמי צד שלישי."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "9.3." }),
          " מפעיל האתר רשאי לבצע תחזוקה, עדכונים, שדרוגים, שינויים, תיקונים, החלפות, שיפורים או השבתות זמניות, עם או בלי הודעה מראש, לפי העניין."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "9.4." }),
          " מפעיל האתר אינו מתחייב כי כל פיצ׳ר, יכולת, אינטגרציה, מסך, עיצוב, תהליך, מסלול או פונקציה יישארו זהים לאורך זמן."
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$3.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "10. שירותי צד שלישי וקישורים" }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "10.1." }),
          " השירות עשוי לכלול שימוש, הטמעה, קישור, חיבור או הסתמכות על שירותים, אתרים, תשתיות, כלים, ספקים או מערכות של צדדים שלישיים."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "10.2." }),
          " מפעיל האתר אינו אחראי לזמינותם, תקינותם, מדיניותם, אבטחתם, ביצועיהם, תוכנם או תוצאות השימוש בשירותי צד שלישי, אלא במידה שחובה כזו חלה עליו לפי דין שאינו ניתן להתניה."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "10.3." }),
          " כל התקשרות בין המשתמש לבין צד שלישי, לרבות ספק, בעל כרטיס, עסק, מפרסם, לקוח, פלטפורמה, רשת חברתית או ספק שירות חיצוני, נעשית באחריות המשתמש והצד השלישי הרלוונטי."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "10.4." }),
          " העובדה ששירות, קישור, חיבור או אינטגרציה מופיעים בשירות אינה מהווה המלצה, אחריות, מצג או התחייבות מצד מפעיל האתר."
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$3.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "11. פיצ׳רים מבוססי AI" }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "11.1." }),
          " השירות עשוי לכלול פיצ׳רים מבוססי AI ליצירה, ניסוח, שיפור, השלמה או הצעת תוכן."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "11.2." }),
          " תוצרים הנוצרים או מוצעים באמצעות AI ניתנים לצורכי סיוע בלבד, ואינם מהווים ייעוץ מקצועי, משפטי, שיווקי, עסקי או אחר."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "11.3." }),
          " מפעיל האתר אינו מתחייב כי תוצרי AI יהיו מדויקים, מלאים, מעודכנים, חוקיים, נקיים משגיאות, מתאימים לצורכי המשתמש או חפים מהפרת זכויות של צדדים שלישיים."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "11.4." }),
          " המשתמש אחראי לבדוק, לערוך, לאשר ולוודא בעצמו כל תוכן שנוצר או הוצע באמצעות AI לפני שמירה, שימוש או פרסום."
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$3.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "12. קניין רוחני" }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "12.1." }),
          " כל זכויות הקניין הרוחני באתר, בשירות, במערכת, בעיצוב, בממשקים, בקוד, במבנה, במאגרים, בלוגואים, במיתוג, בתכנים השייכים למפעיל האתר ובכל רכיב אחר של השירות, שייכות למפעיל האתר ו/או לצדדים שלישיים שהרשו לו להשתמש בהם."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "12.2." }),
          " למעט הזכות המוגבלת להשתמש בשירות בהתאם לתנאים אלה, לא מוקנית למשתמש כל זכות בקניין הרוחני של מפעיל האתר."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "12.3." }),
          " אין להעתיק, לשכפל, להפיץ, להציג בפומבי, לשנות, לעבד, לפרק, לבצע reverse engineering, למכור, להשכיר, להעמיד לרשות הציבור או לעשות שימוש מסחרי אחר כלשהו בשירות או בכל חלק ממנו, ללא אישור מראש ובכתב ממפעיל האתר, אלא אם הדבר מותר במפורש לפי דין."
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$3.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "13. פרטיות והגנת מידע" }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "13.1." }),
          " השימוש בשירות כפוף גם למדיניות הפרטיות של Cardigo, כפי שתתעדכן מעת לעת."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "13.2." }),
          " מפעיל האתר פועל לשמירה על מידע אישי בהתאם למדיניות הפרטיות ולהוראות הדין החל, אולם אין בתנאים אלה כדי לגרוע מזכות כלשהי של מפעיל האתר לעשות שימוש במידע בהתאם למדיניות הפרטיות, לתפעול השירות, לאבטחתו, לשיפורו ולעמידה בדרישות הדין."
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$3.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "14. הגבלת אחריות" }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "14.1." }),
          " השימוש בשירות נעשה באחריות המשתמש בלבד."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "14.2." }),
          " מבלי לגרוע מהאמור בתנאים אלה, ובמידה המרבית המותרת לפי דין, מפעיל האתר, עובדיו, מנהליו, בעלי מניותיו, נציגיו, ספקיו ומי מטעמו לא יהיו אחראים לכל נזק עקיף, תוצאתי, מיוחד או incidental, לרבות אובדן רווחים, אובדן הכנסות, אובדן מוניטין, אובדן מידע, אובדן הזדמנות עסקית, הפסד לקוחות, הפרעה עסקית או כל נזק כלכלי אחר, הנובע משימוש בשירות או מחוסר יכולת להשתמש בו."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "14.3." }),
          " מבלי לגרוע מהאמור, מפעיל האתר אינו אחראי, בין היתר, ל:"
        ] }),
        /* @__PURE__ */ jsx("p", { children: "- תוכן שהועלה או פורסם על ידי משתמשים;" }),
        /* @__PURE__ */ jsx("p", { children: "- הסתמכות על תוכן, פרטים, קישורים או תוצרים בשירות;" }),
        /* @__PURE__ */ jsx("p", { children: "- מעשים, מחדלים, שירותים או התחייבויות של בעלי כרטיסים, עסקים, לקוחות, ספקים או צדדים שלישיים;" }),
        /* @__PURE__ */ jsx("p", { children: "- השלכות של פרסום פומבי של תוכן או פרטי קשר על ידי המשתמש;" }),
        /* @__PURE__ */ jsx("p", { children: "- זמינות, תקינות או תוצאות של שירותי צד שלישי;" }),
        /* @__PURE__ */ jsx("p", { children: "- שיבושים, השבתות, תקלות, כשלי תקשורת, מתקפות, חדירות, עומסים, כוח עליון או אירועים שאינם בשליטתו הסבירה." }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "14.4." }),
          " ככל שייקבע אחרת לפי דין שלא ניתן להתניה, אחריותו המצטברת המקסימלית של מפעיל האתר כלפי המשתמש, בקשר עם השירות או תנאים אלה, לא תעלה על הסכום ששילם המשתמש בפועל למפעיל האתר עבור השירות ב־12 החודשים שקדמו לאירוע שבגינו נטענה האחריות."
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$3.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "15. שיפוי" }),
        /* @__PURE__ */ jsx("p", { children: "המשתמש מתחייב לשפות ולפצות את מפעיל האתר, עובדיו, מנהליו, בעלי מניותיו, נציגיו ומי מטעמו, מיד עם דרישה ראשונה, בגין כל נזק, הפסד, אובדן, תשלום, הוצאה, עלות, חיוב, קנס, דרישה, תביעה או הוצאה משפטית סבירה, לרבות שכר טרחת עורכי דין, שייגרמו עקב:" }),
        /* @__PURE__ */ jsx("p", { children: "- הפרת תנאים אלה;" }),
        /* @__PURE__ */ jsx("p", { children: "- שימוש אסור או בלתי חוקי בשירות;" }),
        /* @__PURE__ */ jsx("p", { children: "- תוכן שהמשתמש העלה, שמר, פרסם או מסר;" }),
        /* @__PURE__ */ jsx("p", { children: "- הפרת זכויות של צד שלישי;" }),
        /* @__PURE__ */ jsx("p", { children: "- מסירת מידע שגוי, מטעה או בלתי מורשה;" }),
        /* @__PURE__ */ jsx("p", { children: "- כל מעשה או מחדל של המשתמש בקשר עם השירות." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$3.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "16. הדין החל וסמכות שיפוט" }),
        /* @__PURE__ */ jsx("p", { children: "על תנאים אלה ועל השימוש בשירות יחולו דיני מדינת ישראל בלבד." }),
        /* @__PURE__ */ jsx("p", { children: "סמכות השיפוט הבלעדית בכל מחלוקת הנוגעת לתנאים אלה או לשירות תהיה לבתי המשפט המוסמכים בישראל." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$3.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "17. יצירת קשר ופרטי המפעיל" }),
        /* @__PURE__ */ jsx("p", { children: "מפעיל השירות: דיגיטליטי, ע.פ." }),
        /* @__PURE__ */ jsx("p", { children: "עיר: מגדל העמק" }),
        /* @__PURE__ */ jsxs("p", { children: [
          "דוא״ל לפניות:",
          " ",
          /* @__PURE__ */ jsx("a", { href: "mailto:support@cardigo.co.il", children: "support@cardigo.co.il" })
        ] }),
        /* @__PURE__ */ jsx("p", { children: "טלפון: 0545811900" }),
        /* @__PURE__ */ jsxs("p", { children: [
          "למסמך תנאי תשלום, חידוש, ביטול והחזרים ראו גם:",
          " ",
          /* @__PURE__ */ jsx(Link, { to: "/payment-policy", children: "תנאי תשלום, חידוש, ביטול והחזרים" })
        ] }),
        /* @__PURE__ */ jsx("p", { children: "תאריך עדכון אחרון: 15.04.2026" })
      ] })
    ] }) })
  ] });
}
const page$1 = "_page_1edsv_15";
const heroWrap$1 = "_heroWrap_1edsv_27";
const h1$1 = "_h1_1edsv_35";
const legalWrap$1 = "_legalWrap_1edsv_55";
const legalBlock$1 = "_legalBlock_1edsv_75";
const styles$2 = {
  page: page$1,
  heroWrap: heroWrap$1,
  h1: h1$1,
  legalWrap: legalWrap$1,
  legalBlock: legalBlock$1
};
function Accessibility() {
  return /* @__PURE__ */ jsxs("main", { "data-page": "site", className: styles$2.page, children: [
    /* @__PURE__ */ jsx(
      SeoHelmet,
      {
        title: "הצהרת נגישות | Cardigo",
        description: "הצהרת הנגישות של Cardigo - מחויבותנו לנגישות דיגיטלית, ההתאמות שבוצעו באתר, מצב הנגישות הנוכחי ואופן הפנייה אלינו בנושא.",
        canonicalUrl: "https://cardigo.co.il/accessibility-statement",
        url: "https://cardigo.co.il/accessibility-statement"
      }
    ),
    /* @__PURE__ */ jsx("section", { className: pub.sectionDark, children: /* @__PURE__ */ jsxs("div", { className: `${pub.sectionWrap} ${styles$2.heroWrap}`, children: [
      /* @__PURE__ */ jsx("h1", { className: styles$2.h1, children: "הצהרת נגישות" }),
      /* @__PURE__ */ jsx("p", { className: pub.sectionLeadLight, children: "ב־Cardigo אנו רואים חשיבות רבה בהנגשת האתר והשירותים הדיגיטליים שלנו לכלל המשתמשים, ופועלים באופן שוטף לשיפור חוויית השימוש, הנגישות, הבהירות והזמינות של האתר." })
    ] }) }),
    /* @__PURE__ */ jsx("section", { className: pub.sectionLight, children: /* @__PURE__ */ jsxs("div", { className: styles$2.legalWrap, children: [
      /* @__PURE__ */ jsxs("div", { className: styles$2.legalBlock, children: [
        /* @__PURE__ */ jsx("p", { children: "ב־Cardigo אנו רואים חשיבות רבה בהנגשת האתר והשירותים הדיגיטליים שלנו לכלל המשתמשים, ובכלל זה לאנשים עם מוגבלות. אנו פועלים באופן שוטף לשיפור חוויית השימוש, הנגישות, הבהירות והזמינות של האתר, מתוך תפיסה של שירות שוויוני, מכבד ונגיש ככל האפשר." }),
        /* @__PURE__ */ jsx("p", { children: "הצהרה זו נועדה לספק מידע על מצב נגישות האתר, על ההתאמות שבוצעו בו, ועל הדרך לפנות אלינו במקרה של קושי, תקלה או צורך בהתאמת נגישות." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$2.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "כללי" }),
        /* @__PURE__ */ jsx("p", { children: "האתר של Cardigo הוא אתר בעברית, הפועל במבנה RTL, ומספק מידע ושירותים דיגיטליים לציבור, לרבות עמודי מידע, דפי תוכן, טפסים, כרטיסים דיגיטליים, עמודי יצירת קשר ופיצ׳רים אינטראקטיביים נוספים." }),
        /* @__PURE__ */ jsx("p", { children: "אנו פועלים לקדם את נגישות האתר בהתאם להוראות הדין החל בישראל, ובשים לב לעקרונות תקן ישראלי 5568, המבוסס על הנחיות WCAG 2.0." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$2.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "התאמות נגישות שנעשו באתר" }),
        /* @__PURE__ */ jsx("p", { children: "בבדיקות ובפיתוח האתר יושמו, בין היתר, ההתאמות והעקרונות הבאים:" }),
        /* @__PURE__ */ jsx("p", { children: "- מבנה עמודים היררכי וברור, הכולל שימוש ברכיבי HTML סמנטיים כגון כותרת עליונה, אזור תוכן ראשי, ניווט וכותרת תחתונה;" }),
        /* @__PURE__ */ jsx("p", { children: "- שמירה על היררכיית כותרות ברורה בעמודים הציבוריים;" }),
        /* @__PURE__ */ jsx("p", { children: "- התאמה לשפה העברית ולכיוון כתיבה מימין לשמאל (RTL);" }),
        /* @__PURE__ */ jsx("p", { children: "- שימוש בכותרות עמוד ותיאורים ברורים בעמודים הציבוריים;" }),
        /* @__PURE__ */ jsx("p", { children: "- הוספת טקסט חלופי לתמונות סטטיות מרכזיות, וסימון תמונות דקורטיביות לפי הצורך;" }),
        /* @__PURE__ */ jsx("p", { children: "- שימוש בתוויות (labels) עבור שדות בטפסים מרכזיים, ובפרט בטופס יצירת הקשר;" }),
        /* @__PURE__ */ jsx("p", { children: "- תמיכה בניווט מקלדת בחלקים אינטראקטיביים מרכזיים באתר;" }),
        /* @__PURE__ */ jsx("p", { children: "- שימוש במאפייני ARIA באזורים אינטראקטיביים מסוימים, כגון תפריטים, מודלים, אקורדיונים ורכיבי סטטוס;" }),
        /* @__PURE__ */ jsx("p", { children: "- תמיכה בהעדפת מערכת של הפחתת תנועה (prefers-reduced-motion), כך שאנימציות מסוימות מצטמצמות או מנוטרלות בהתאם להעדפת המשתמש;" }),
        /* @__PURE__ */ jsx("p", { children: "- הצגת הודעות סטטוס ושגיאה באופן שתומך גם בטכנולוגיות מסייעות, בחלקים רלוונטיים באתר." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$2.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "מחויבות להנגשה" }),
        /* @__PURE__ */ jsx("p", { children: "Cardigo פועלת באופן שוטף לקידום נגישות האתר ולשיפור חוויית השימוש בו, מתוך מטרה לאפשר שירות נוח, ברור ונגיש ככל האפשר לכלל המשתמשים." }),
        /* @__PURE__ */ jsx("p", { children: "אנו ממשיכים לבחון, לעדכן ולשפר את רכיבי האתר והתכנים המופיעים בו מעת לעת, בהתאם לצורך, להתפתחויות הטכנולוגיות ולהוראות הדין החלות." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$2.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "תחולת ההצהרה" }),
        /* @__PURE__ */ jsx("p", { children: "הצהרה זו מתייחסת בעיקר לעמודים הציבוריים המרכזיים של האתר ולשכבות הציבוריות של השירות." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$2.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "פנייה בנושא נגישות" }),
        /* @__PURE__ */ jsx("p", { children: "אם נתקלתם בבעיה, קושי, תקלה או צורך בנושא נגישות באתר, נשמח שתפנו אלינו כדי שנוכל לבדוק ולטפל בכך." }),
        /* @__PURE__ */ jsx("p", { children: "מומלץ לצרף בפנייה, ככל האפשר, את הפרטים הבאים:" }),
        /* @__PURE__ */ jsx("p", { children: "- תיאור הבעיה;" }),
        /* @__PURE__ */ jsx("p", { children: "- הפעולה שניסיתם לבצע;" }),
        /* @__PURE__ */ jsx("p", { children: "- כתובת העמוד שבו נתקלתם בקושי;" }),
        /* @__PURE__ */ jsx("p", { children: "- סוג הדפדפן וגרסתו;" }),
        /* @__PURE__ */ jsx("p", { children: "- סוג המכשיר או מערכת ההפעלה;" }),
        /* @__PURE__ */ jsx("p", { children: "- האם נעשה שימוש בטכנולוגיה מסייעת כלשהי." }),
        /* @__PURE__ */ jsxs("p", { children: [
          "ניתן לפנות אלינו בדוא״ל:",
          " ",
          /* @__PURE__ */ jsx("a", { href: "mailto:support@cardigo.co.il", children: "support@cardigo.co.il" })
        ] }),
        /* @__PURE__ */ jsx("p", { children: "אנו נעשה מאמץ לטפל בפניות בנושא נגישות באופן ענייני, מקצועי ובזמן סביר." }),
        /* @__PURE__ */ jsx("p", { children: "תאריך עדכון אחרון: 14.04.2026" })
      ] })
    ] }) })
  ] });
}
const page = "_page_iwmbe_15";
const heroWrap = "_heroWrap_iwmbe_27";
const kicker = "_kicker_iwmbe_35";
const h1 = "_h1_iwmbe_63";
const legalWrap = "_legalWrap_iwmbe_83";
const legalBlock = "_legalBlock_iwmbe_103";
const relatedLinks = "_relatedLinks_iwmbe_151";
const relatedLink = "_relatedLink_iwmbe_151";
const styles$1 = {
  page,
  heroWrap,
  kicker,
  h1,
  legalWrap,
  legalBlock,
  relatedLinks,
  relatedLink
};
function PaymentPolicy() {
  return /* @__PURE__ */ jsxs("main", { "data-page": "site", className: styles$1.page, children: [
    /* @__PURE__ */ jsx(
      SeoHelmet,
      {
        title: "תנאי תשלום, חידוש, ביטול והחזרים | Cardigo",
        description: "תנאי התשלום, החידוש, הביטול וההחזרים של שירותי Cardigo - מסלולים בתשלום, חידוש אוטומטי, ביטול, החזרים, כשל גבייה ופרטי המפעיל.",
        canonicalUrl: "https://cardigo.co.il/payment-policy",
        url: "https://cardigo.co.il/payment-policy"
      }
    ),
    /* @__PURE__ */ jsx("section", { className: pub.sectionDark, children: /* @__PURE__ */ jsxs("div", { className: `${pub.sectionWrap} ${styles$1.heroWrap}`, children: [
      /* @__PURE__ */ jsx("span", { className: styles$1.kicker, children: "מדיניות תשלום" }),
      /* @__PURE__ */ jsx("h1", { className: styles$1.h1, children: "תנאי תשלום, חידוש, ביטול והחזרים" }),
      /* @__PURE__ */ jsx("p", { className: pub.sectionLeadLight, children: "מסמך זה מסדיר את תנאי התשלום, החידוש, הביטול וההחזרים של השירותים בתשלום ב־Cardigo, ומשלים את תנאי השימוש הכלליים של האתר." })
    ] }) }),
    /* @__PURE__ */ jsx("section", { className: pub.sectionLight, children: /* @__PURE__ */ jsxs("div", { className: styles$1.legalWrap, children: [
      /* @__PURE__ */ jsxs("div", { className: styles$1.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "1. תחולת המסמך" }),
        /* @__PURE__ */ jsx("p", { children: "מסמך זה חל על כל מסלול בתשלום, מנוי, מסלול פרימיום, תשלום תקופתי, תשלום שנתי, שדרוג או שירות בתשלום המוצעים במסגרת Cardigo." }),
        /* @__PURE__ */ jsx("p", { children: "מסמך זה חל יחד עם תנאי השימוש, מדיניות הפרטיות, דף התמחור ותהליך הרכישה בפועל." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$1.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "2. אופי השירות" }),
        /* @__PURE__ */ jsx("p", { children: "השירותים בתשלום של Cardigo מיועדים לשימוש עסקי או מסחרי בלבד." }),
        /* @__PURE__ */ jsx("p", { children: "השירות אינו מיועד לשימוש אישי, ביתי או משפחתי." }),
        /* @__PURE__ */ jsx("p", { children: "כל משתמש הרוכש שירות בתשלום מצהיר כי הרכישה והשימוש בשירות נעשים לצורך עסקי או מסחרי בלבד." }),
        /* @__PURE__ */ jsx("p", { children: "אם יתברר כי השירות נרכש או נוצל בניגוד להצהרה זו, מפעיל האתר יהיה רשאי להגביל, להשעות או להפסיק את השירות, בהתאם לתנאי השימוש ולדין החל." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$1.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "3. מסלולים ותשלום" }),
        /* @__PURE__ */ jsx("p", { children: "Cardigo עשויה להציע מסלולים חינמיים ומסלולים בתשלום, לרבות מסלול חודשי ומסלול שנתי." }),
        /* @__PURE__ */ jsx("p", { children: "המחירים, תנאי ההצטרפות, רכיבי המסלול והפיצ׳רים הכלולים בו יהיו כפי שיופיעו בדף התמחור, בתהליך הרכישה או במסגרת ההצטרפות בפועל." }),
        /* @__PURE__ */ jsx("p", { children: "מסלול שנתי מחויב מראש עבור תקופה שנתית מלאה." }),
        /* @__PURE__ */ jsx("p", { children: "מסלול חודשי מחויב לפי מחזור חיוב חודשי." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$1.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "4. חידוש אוטומטי" }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "מסלול חודשי:" }),
          " מתחדש באופן אוטומטי בסיום כל תקופת חיוב, אלא אם בוטל לפני מועד החיוב הבא."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "מסלול שנתי:" }),
          " מתחדש באופן אוטומטי בסיום כל תקופת חיוב שנתית, אלא אם בוטל לפני מועד החיוב הבא."
        ] }),
        /* @__PURE__ */ jsx("p", { children: "המשתמש רשאי לבטל את החידוש האוטומטי לפני מועד החיוב הבא." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$1.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "5. ביטול" }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "מסלול חודשי:" }),
          " ביטול מפסיק חיובים עתידיים בלבד. הביטול נכנס לתוקף בסוף תקופת החיוב החודשית שכבר שולמה. לא יינתן החזר עבור החודש הנוכחי שכבר שולם, למעט אם הדין החל מחייב אחרת."
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsx("strong", { children: "מסלול שנתי:" }),
          " ביטול במהלך תקופת השירות השנתית מפסיק את החידוש העתידי בלבד. השירות יישאר פעיל עד לסיום התקופה השנתית שכבר שולמה. לא יינתן החזר עבור התקופה השנתית שכבר שולמה, למעט אם הדין החל מחייב אחרת."
        ] }),
        /* @__PURE__ */ jsx("p", { children: 'ביטול חידוש אוטומטי מתבצע באופן עצמאי דרך אזור ההגדרות האישיות בממשק המשתמש (לשונית "חשבון"). הביטול מפסיק חיובים עתידיים בלבד; הגישה ל-Premium נשארת פעילה עד תום התקופה ששולמה.' }),
        /* @__PURE__ */ jsxs("p", { children: [
          "לשאלות בנושא החזרים או שינוי אמצעי תשלום, יש לפנות לתמיכה:",
          " ",
          /* @__PURE__ */ jsx("a", { href: "mailto:support@cardigo.co.il", children: "support@cardigo.co.il" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$1.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "6. החזרים" }),
        /* @__PURE__ */ jsx("p", { children: "ככלל, לא יינתנו החזרים כספיים עבור שירותים, מסלולים או תקופות חיוב ששולמו." }),
        /* @__PURE__ */ jsx("p", { children: "לא יינתן החזר מלא, חלקי או יחסי עבור חודש פעיל או עבור תקופה שנתית פעילה שכבר שולמה." }),
        /* @__PURE__ */ jsx("p", { children: "חריג לכך יחול רק אם הדין החל מחייב אחרת, או אם מפעיל האתר יחליט אחרת, לפי שיקול דעתו, במקרה חריג שבו השירות לא סופק בפועל מסיבה התלויה במפעיל האתר." }),
        /* @__PURE__ */ jsx("p", { children: "כל החזר חריג שיינתן, אם יינתן, לא יהווה תקדים למקרים אחרים." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$1.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "7. כשל גבייה ו־chargeback" }),
        /* @__PURE__ */ jsx("p", { children: "אם חיוב נכשל, אמצעי התשלום בוטל, פג תוקפו, נדחה או לא אושר, המשתמש עשוי לקבל הודעה על כך. גישת הפרימיום תישאר פעילה עד תום התקופה ששולמה; אם הבעיה לא תוסדר עד מועד פקיעת המנוי, הגישה לפיצ׳רי הפרימיום עשויה להסתיים עם סיום אותה תקופה." }),
        /* @__PURE__ */ jsx("p", { children: "במקרה של chargeback, מחלוקת תשלום, שימוש אסור או חשש להונאה, מפעיל האתר רשאי להשעות את השירות, להגביל את החשבון, להסיר את הכרטיס מן הפרסום הציבורי או למנוע חידוש עתידי, והכל בכפוף לתנאי השימוש ולדין החל." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$1.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "8. השלכות סיום מסלול" }),
        /* @__PURE__ */ jsx("p", { children: "סיום תקופת שירות, אי חידוש, ביטול, כשל גבייה, השעיה או הפסקת שירות עשויים להביא להסרת הכרטיס מן הפרסום הציבורי, להשבתת פיצ׳רים בתשלום ולהגבלת הגישה לשירותים מסוימים." }),
        /* @__PURE__ */ jsx("p", { children: "המשתמש אחראי לכל שימוש עסקי או מסחרי שהוא עושה בשירות, לרבות ההשלכות של הפסקת פרסום הכרטיס או הפסקת זמינות של פיצ׳רים בתשלום." }),
        /* @__PURE__ */ jsx("p", { children: "בכפוף לדין החל ולהוראות הגבלת האחריות שבתנאי השימוש, מפעיל האתר לא יישא באחריות לנזק עקיף, תוצאתי, עסקי או מסחרי הנובע מהפסקת שירות, סיום מסלול, אי חידוש או השבתת פיצ׳רים." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$1.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "9. מסמכי תשלום וקבלות" }),
        /* @__PURE__ */ jsx("p", { children: "לאחר ביצוע תשלום, יישלח למשתמש אישור תשלום ו/או קבלה, בהתאם לדין החל ולמעמד המס של מפעיל האתר." }),
        /* @__PURE__ */ jsx("p", { children: "כיום, מפעיל האתר פועל כעוסק פטור; לפיכך, מסמך התשלום הנוכחי הוא קבלה ואינו חשבונית מס." }),
        /* @__PURE__ */ jsx("p", { children: "הקבלה מונפקת על פי פרופיל החיוב שהוגדר בחשבון או בתהליך הרכישה בעת ביצוע החיוב. אם לא הוגדר פרופיל חיוב, עשוי להיעשות שימוש בפרטים בסיסיים של החשבון כגון שם פרטי וכתובת דוא״ל." }),
        /* @__PURE__ */ jsx("p", { children: "חיובים חוזרים (מסלול חודשי או שנתי) משתמשים בפרופיל החיוב הזמין בחשבון בעת כל חיוב. עדכון פרופיל החיוב לאחר הנפקת קבלה אינו משנה קבלות שכבר הונפקו." }),
        /* @__PURE__ */ jsxs("p", { children: [
          "עיבוד כרטיסי אשראי מתבצע על ידי ספק סליקה ועיבוד תשלומים חיצוני. הנפקת קבלות ומסמכי תשלום מתבצעת על ידי ספק חיצוני להנפקת קבלות ומסמכי תשלום. פרטים נוספים אודות שיתוף נתונים עם ספקי צד שלישי אלה מפורטים ב",
          /* @__PURE__ */ jsx(Link, { to: "/privacy", children: "מדיניות הפרטיות" }),
          "."
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$1.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "10. פרטי המפעיל ויצירת קשר" }),
        /* @__PURE__ */ jsx("p", { children: "מפעיל השירות: דיגיטליטי, ע.פ." }),
        /* @__PURE__ */ jsx("p", { children: "עיר: מגדל העמק" }),
        /* @__PURE__ */ jsxs("p", { children: [
          "דוא״ל לפניות בנושא חיוב ותשלומים:",
          " ",
          /* @__PURE__ */ jsx("a", { href: "mailto:support@cardigo.co.il", children: "support@cardigo.co.il" })
        ] }),
        /* @__PURE__ */ jsx("p", { children: "טלפון: 0545811900" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$1.legalBlock, children: [
        /* @__PURE__ */ jsx("h2", { children: "11. מסמכים קשורים" }),
        /* @__PURE__ */ jsxs("div", { className: styles$1.relatedLinks, children: [
          /* @__PURE__ */ jsx(Link, { to: "/terms", className: styles$1.relatedLink, children: "תנאי שימוש" }),
          /* @__PURE__ */ jsx(Link, { to: "/privacy", className: styles$1.relatedLink, children: "מדיניות פרטיות" }),
          /* @__PURE__ */ jsx(Link, { to: "/pricing", className: styles$1.relatedLink, children: "דף התמחור" })
        ] }),
        /* @__PURE__ */ jsx("p", { children: "תאריך עדכון אחרון: 25.04.2026" })
      ] })
    ] }) })
  ] });
}
const root = "_root_15rz2_1";
const backLink = "_backLink_15rz2_11";
const styles = {
  root,
  backLink
};
function NotFound() {
  return /* @__PURE__ */ jsxs("main", { className: styles.root, children: [
    /* @__PURE__ */ jsx(
      SeoHelmet,
      {
        robots: "noindex, nofollow",
        title: "404 – עמוד לא נמצא | Cardigo"
      }
    ),
    /* @__PURE__ */ jsx("h1", { children: "404" }),
    /* @__PURE__ */ jsx("p", { children: "העמוד שחיפשת לא נמצא" }),
    /* @__PURE__ */ jsx(Link, { to: "/", className: styles.backLink, children: "חזרה לדף הבית" })
  ] });
}
const Login = lazy(() => import("./assets/Login-DChB9fSQ.js"));
const Register = lazy(() => import("./assets/Register-3R5zr4Q3.js"));
const InviteAccept = lazy(() => import("./assets/InviteAccept-sB3ZWcrJ.js"));
const ForgotPassword = lazy(() => import("./assets/ForgotPassword-BX3mzTjn.js"));
const ResetPassword = lazy(() => import("./assets/ResetPassword-CcNTD0qC.js"));
const SignupLinkRequest = lazy(() => import("./assets/SignupLinkRequest-CuV1b6DL.js"));
const SignupConsume = lazy(() => import("./assets/SignupConsume-Ddi7LjmO.js"));
const VerifyEmail = lazy(() => import("./assets/VerifyEmail-BdTNw4a4.js"));
const Unsubscribe = lazy(() => import("./assets/Unsubscribe-cH0SJ-jv.js"));
const Dashboard = lazy(() => import("./assets/Dashboard-CA_zW0ja.js"));
const EditCard = lazy(() => import("./assets/EditCard-8APoVsVU.js"));
const Admin = lazy(() => import("./assets/Admin-FSagd0ZH.js"));
const OrgInvites = lazy(() => import("./assets/OrgInvites-CPq8wF76.js"));
const Inbox = lazy(() => import("./assets/Inbox-BwtOR49t.js"));
const BlogPost = lazy(() => import("./assets/BlogPost-41GtYZeW.js"));
const GuidePost = lazy(() => import("./assets/GuidePost-BvCyvAiZ.js"));
const PublicCard = lazy(() => import("./assets/PublicCard-BUh62Dw0.js"));
const PreviewCard = lazy(() => import("./assets/PreviewCard-BEyGqjlW.js"));
const CheckoutPage = lazy(() => import("./assets/CheckoutPage-v9B4yP1E.js"));
const IframeReturnPage = lazy(
  () => import("./assets/IframeReturnPage-CYK0Rehj.js")
);
function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return /* @__PURE__ */ jsx(RouteFallback, { label: "טוען…" });
  if (!isAuthenticated) return /* @__PURE__ */ jsx(Navigate, { to: "/login", replace: true });
  return children;
}
function AdminRouteGate() {
  const { user, loading } = useAuth();
  if (loading) {
    return /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx(SeoHelmet, { robots: "noindex, nofollow" }),
      /* @__PURE__ */ jsx(RouteFallback, { label: "טוען…" })
    ] });
  }
  if (user?.role !== "admin") {
    return /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx(SeoHelmet, { robots: "noindex, nofollow" }),
      /* @__PURE__ */ jsx(NotFound, {})
    ] });
  }
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(SeoHelmet, { robots: "noindex, nofollow" }),
    /* @__PURE__ */ jsx(ChunkErrorBoundary, { label: "שגיאה בטעינת הדף", children: /* @__PURE__ */ jsx(Suspense, { fallback: /* @__PURE__ */ jsx(RouteFallback, { label: "הדף נטען…" }), children: /* @__PURE__ */ jsx(Admin, {}) }) })
  ] });
}
const routes = [
  {
    path: "/",
    element: /* @__PURE__ */ jsx(Layout, {}),
    children: [
      { index: true, element: /* @__PURE__ */ jsx(Home, {}) },
      // marketing pages
      { path: "contact", element: /* @__PURE__ */ jsx(Contact, {}) },
      { path: "blog", element: /* @__PURE__ */ jsx(Blog, {}) },
      { path: "blog/page/:pageNum", element: /* @__PURE__ */ jsx(Blog, {}) },
      {
        path: "blog/:slug",
        element: /* @__PURE__ */ jsx(ChunkErrorBoundary, { label: "שגיאת טעינה במאמר", children: /* @__PURE__ */ jsx(
          Suspense,
          {
            fallback: /* @__PURE__ */ jsx(RouteFallback, { label: "טוען מאמר…" }),
            children: /* @__PURE__ */ jsx(BlogPost, {})
          }
        ) })
      },
      { path: "pricing", element: /* @__PURE__ */ jsx(Pricing, {}) },
      { path: "guides", element: /* @__PURE__ */ jsx(Guides, {}) },
      { path: "guides/page/:pageNum", element: /* @__PURE__ */ jsx(Guides, {}) },
      {
        path: "guides/:slug",
        element: /* @__PURE__ */ jsx(ChunkErrorBoundary, { label: "שגיאת טעינה במדריך", children: /* @__PURE__ */ jsx(
          Suspense,
          {
            fallback: /* @__PURE__ */ jsx(RouteFallback, { label: "טוען מדריך…" }),
            children: /* @__PURE__ */ jsx(GuidePost, {})
          }
        ) })
      },
      { path: "cards", element: /* @__PURE__ */ jsx(Cards, {}) },
      // legal
      { path: "privacy", element: /* @__PURE__ */ jsx(Privacy, {}) },
      { path: "terms", element: /* @__PURE__ */ jsx(Terms, {}) },
      { path: "accessibility-statement", element: /* @__PURE__ */ jsx(Accessibility, {}) },
      { path: "payment-policy", element: /* @__PURE__ */ jsx(PaymentPolicy, {}) },
      // auth
      {
        path: "login",
        element: /* @__PURE__ */ jsx(ChunkErrorBoundary, { label: "שגיאת טעינה בכניסה", children: /* @__PURE__ */ jsx(Suspense, { fallback: /* @__PURE__ */ jsx(RouteFallback, { label: "טוען…" }), children: /* @__PURE__ */ jsx(Login, {}) }) })
      },
      {
        path: "register",
        element: /* @__PURE__ */ jsx(ChunkErrorBoundary, { label: "שגיאת טעינה בהרשמה", children: /* @__PURE__ */ jsx(Suspense, { fallback: /* @__PURE__ */ jsx(RouteFallback, { label: "טוען…" }), children: /* @__PURE__ */ jsx(Register, {}) }) })
      },
      {
        path: "invite",
        element: /* @__PURE__ */ jsx(ChunkErrorBoundary, { label: "שגיאת טעינה בהזמנה", children: /* @__PURE__ */ jsx(Suspense, { fallback: /* @__PURE__ */ jsx(RouteFallback, { label: "טוען…" }), children: /* @__PURE__ */ jsx(InviteAccept, {}) }) })
      },
      {
        path: "forgot-password",
        element: /* @__PURE__ */ jsx(ChunkErrorBoundary, { label: "שגיאת טעינה", children: /* @__PURE__ */ jsx(Suspense, { fallback: /* @__PURE__ */ jsx(RouteFallback, { label: "טוען…" }), children: /* @__PURE__ */ jsx(ForgotPassword, {}) }) })
      },
      {
        path: "reset-password",
        element: /* @__PURE__ */ jsx(ChunkErrorBoundary, { label: "שגיאת טעינה", children: /* @__PURE__ */ jsx(Suspense, { fallback: /* @__PURE__ */ jsx(RouteFallback, { label: "טוען…" }), children: /* @__PURE__ */ jsx(ResetPassword, {}) }) })
      },
      {
        path: "signup-link",
        element: /* @__PURE__ */ jsx(ChunkErrorBoundary, { label: "שגיאת טעינה", children: /* @__PURE__ */ jsx(Suspense, { fallback: /* @__PURE__ */ jsx(RouteFallback, { label: "טוען…" }), children: /* @__PURE__ */ jsx(SignupLinkRequest, {}) }) })
      },
      {
        path: "signup",
        element: /* @__PURE__ */ jsx(ChunkErrorBoundary, { label: "שגיאת טעינה", children: /* @__PURE__ */ jsx(Suspense, { fallback: /* @__PURE__ */ jsx(RouteFallback, { label: "טוען…" }), children: /* @__PURE__ */ jsx(SignupConsume, {}) }) })
      },
      {
        path: "verify-email",
        element: /* @__PURE__ */ jsx(ChunkErrorBoundary, { label: "שגיאת טעינה", children: /* @__PURE__ */ jsx(Suspense, { fallback: /* @__PURE__ */ jsx(RouteFallback, { label: "טוען…" }), children: /* @__PURE__ */ jsx(VerifyEmail, {}) }) })
      },
      {
        path: "unsubscribe",
        element: /* @__PURE__ */ jsx(ChunkErrorBoundary, { label: "שגיאת טעינה", children: /* @__PURE__ */ jsx(Suspense, { fallback: /* @__PURE__ */ jsx(RouteFallback, { label: "טוען…" }), children: /* @__PURE__ */ jsx(Unsubscribe, {}) }) })
      },
      // product
      {
        path: "dashboard",
        element: /* @__PURE__ */ jsx(ChunkErrorBoundary, { label: "שגיאת טעינה בלוח הבקרה", children: /* @__PURE__ */ jsx(
          Suspense,
          {
            fallback: /* @__PURE__ */ jsx(RouteFallback, { label: "טוען לוח בקרה…" }),
            children: /* @__PURE__ */ jsx(Dashboard, {})
          }
        ) })
      },
      {
        path: "inbox",
        element: /* @__PURE__ */ jsx(RequireAuth, { children: /* @__PURE__ */ jsx(ChunkErrorBoundary, { label: "שגיאת טעינה בהודעות", children: /* @__PURE__ */ jsx(
          Suspense,
          {
            fallback: /* @__PURE__ */ jsx(RouteFallback, { label: "טוען הודעות…" }),
            children: /* @__PURE__ */ jsx(Inbox, {})
          }
        ) }) })
      },
      {
        path: "org/invites",
        element: /* @__PURE__ */ jsx(ChunkErrorBoundary, { label: "שגיאת טעינה בהזמנות הארגון", children: /* @__PURE__ */ jsx(
          Suspense,
          {
            fallback: /* @__PURE__ */ jsx(RouteFallback, { label: "טוען הזמנות…" }),
            children: /* @__PURE__ */ jsx(OrgInvites, {})
          }
        ) })
      },
      {
        path: "edit/:section?/:tab?",
        element: /* @__PURE__ */ jsx(ChunkErrorBoundary, { label: "שגיאה בטעינת הדף", children: /* @__PURE__ */ jsx(
          Suspense,
          {
            fallback: /* @__PURE__ */ jsx(RouteFallback, { label: "הדף נטען…" }),
            children: /* @__PURE__ */ jsx(EditCard, {})
          }
        ) })
      },
      // admin (not linked in UI)
      {
        path: "admin",
        element: /* @__PURE__ */ jsx(AdminRouteGate, {})
      },
      // fallback
      { path: "*", element: /* @__PURE__ */ jsx(NotFound, {}) }
    ]
  },
  {
    // Standalone public card page (no marketing Header/Footer)
    path: "/card/:slug",
    element: /* @__PURE__ */ jsx(ChunkErrorBoundary, { label: "שגיאת טעינה בכרטיס", children: /* @__PURE__ */ jsx(Suspense, { fallback: /* @__PURE__ */ jsx(RouteFallback, { label: "טוען כרטיס…" }), children: /* @__PURE__ */ jsx(PublicCard, {}) }) })
  },
  {
    // Standalone company card page (no marketing Header/Footer)
    path: "/c/:orgSlug/:slug",
    element: /* @__PURE__ */ jsx(ChunkErrorBoundary, { label: "שגיאת טעינה בכרטיס", children: /* @__PURE__ */ jsx(Suspense, { fallback: /* @__PURE__ */ jsx(RouteFallback, { label: "טוען כרטיס…" }), children: /* @__PURE__ */ jsx(PublicCard, {}) }) })
  },
  {
    // Standalone preview personal card page (no marketing Header/Footer)
    path: "/preview/card/:slug",
    element: /* @__PURE__ */ jsx(ChunkErrorBoundary, { label: "שגיאת טעינה בכרטיס", children: /* @__PURE__ */ jsx(Suspense, { fallback: /* @__PURE__ */ jsx(RouteFallback, { label: "טוען כרטיס…" }), children: /* @__PURE__ */ jsx(PreviewCard, {}) }) })
  },
  {
    // Standalone preview company card page (no marketing Header/Footer)
    path: "/preview/c/:orgSlug/:slug",
    element: /* @__PURE__ */ jsx(ChunkErrorBoundary, { label: "שגיאת טעינה בכרטיס", children: /* @__PURE__ */ jsx(Suspense, { fallback: /* @__PURE__ */ jsx(RouteFallback, { label: "טוען כרטיס…" }), children: /* @__PURE__ */ jsx(PreviewCard, {}) }) })
  },
  {
    // Standalone checkout page (no marketing Header/Footer)
    path: "/payment/checkout",
    element: /* @__PURE__ */ jsx(ChunkErrorBoundary, { label: "שגיאת טעינה בדף התשלום", children: /* @__PURE__ */ jsx(Suspense, { fallback: /* @__PURE__ */ jsx(RouteFallback, { label: "טוען דף תשלום…" }), children: /* @__PURE__ */ jsx(CheckoutPage, {}) }) })
  },
  {
    // Standalone iframe return relay page (no marketing Header/Footer)
    path: "/payment/iframe-return",
    element: /* @__PURE__ */ jsx(ChunkErrorBoundary, { label: "שגיאת טעינה", children: /* @__PURE__ */ jsx(Suspense, { fallback: /* @__PURE__ */ jsx(RouteFallback, { label: "טוען…" }), children: /* @__PURE__ */ jsx(IframeReturnPage, {}) }) })
  }
];
async function renderForRoute(url, options = {}) {
  if (typeof url !== "string" || !url.startsWith("/")) {
    throw new TypeError(
      `renderForRoute: url must be a string starting with "/", got: ${JSON.stringify(url)}`
    );
  }
  const handler = createStaticHandler(routes);
  const request = new Request("https://cardigo.co.il" + url);
  const context = await handler.query(request);
  if (context instanceof Response) {
    throw context;
  }
  const router = createStaticRouter(routes, context);
  const helmetContext = {};
  const initialListingData = options && typeof options === "object" && options.initialListingData ? options.initialListingData : {};
  const html = renderToString(
    /* @__PURE__ */ jsx(HelmetProvider, { context: helmetContext, children: /* @__PURE__ */ jsx(AuthProvider, { children: /* @__PURE__ */ jsx(UnreadCountProvider, { children: /* @__PURE__ */ jsx(InitialListingDataProvider, { value: initialListingData, children: /* @__PURE__ */ jsx(StaticRouterProvider, { router, context }) }) }) }) })
  );
  return { html, helmetContext };
}
export {
  getPublicAvailability as $,
  AnalyticsIcon as A,
  Button as B,
  CopyIcon as C,
  markLeadRead as D,
  updateLeadFlags as E,
  FlashBanner as F,
  GalleryIcon as G,
  HelpIcon as H,
  hardDeleteLead as I,
  getMyBookings as J,
  approveMyBooking as K,
  cancelMyBooking as L,
  trackSitePageView as M,
  CONTENT_DISPLAY_POLICY as N,
  hasAcceptedCardConsent as O,
  saveCardConsent as P,
  getCardConsentState as Q,
  ReviewsIcon as R,
  SeoHelmet as S,
  TemplatesIcon as T,
  DEFAULT_OG_IMAGE_PATH as U,
  normalizeGtmId as V,
  WorkHoursIcon as W,
  normalizeGaMeasurementId as X,
  normalizeMetaPixelId as Y,
  getUtm as Z,
  useInstallPrompt as _,
  api as a,
  createPublicBooking as a0,
  createLead as a1,
  resetPassword as b,
  requestSignupLink as c,
  consumeSignupToken as d,
  resendVerification as e,
  forgotPassword as f,
  CrownIcon as g,
  SettingsIcon as h,
  SeoIcon as i,
  FaqIcon as j,
  ServicesIcon as k,
  ContentIcon as l,
  ContactIcon as m,
  BusinessIcon as n,
  HeadIcon as o,
  SelfDesignIcon as p,
  useFocusTrap as q,
  register as r,
  renderForRoute,
  getAnonymousId as s,
  trackRegistrationComplete as t,
  useAuth as u,
  verifyEmail as v,
  clearAnonymousId as w,
  getHasOrgAdmin as x,
  useUnreadCount as y,
  getMyLeads as z
};
